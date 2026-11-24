# ==========================================
# ChangeFlow Enterprise - Multi-Stage Dockerfile
# ==========================================

# Stage 1: Build Frontend (Vite + React + Tailwind)
FROM node:20-alpine AS client-builder
WORKDIR /app/client
COPY client/package*.json ./
RUN npm install
COPY client/ ./
RUN npm run build

# Stage 2: Build Backend (TypeScript + Prisma) & Pre-Seed Database
FROM node:20-alpine AS server-builder
WORKDIR /app/server
COPY server/package*.json ./
COPY server/prisma ./prisma/
RUN npm install
RUN npx prisma generate
RUN npx prisma db push
RUN npx tsx prisma/seed.ts
COPY server/ ./
RUN npm run build

# Stage 3: Production Runner
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

# Install production dependencies for server
COPY server/package*.json ./server/
COPY server/prisma ./server/prisma/
RUN cd server && npm install --omit=dev && npx prisma generate

# Copy built server, client artifacts, and seeded database
COPY --from=server-builder /app/server/dist ./server/dist
COPY --from=client-builder /app/client/dist ./client/dist
COPY --from=server-builder /app/server/prisma/dev.db ./server/prisma/dev.db

# Create storage directories
RUN mkdir -p /app/uploads /app/server/prisma

# Expose API and Web application port
EXPOSE 5000

# Start server
CMD ["node", "server/dist/index.js"]
