# ==========================================
# ChangeFlow Enterprise - Multi-Stage Dockerfile (MongoDB & Mongoose)
# ==========================================

# Stage 1: Build Frontend (Vite + React + Tailwind)
FROM node:20-alpine AS client-builder
WORKDIR /app/client
COPY client/package*.json ./
RUN npm install
COPY client/ ./
RUN npm run build

# Stage 2: Build Backend (TypeScript + Mongoose)
FROM node:20-alpine AS server-builder
WORKDIR /app/server
COPY server/package*.json ./
RUN npm install
COPY server/ ./
RUN npm run build

# Stage 3: Production Runner
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

# Install production dependencies for server
COPY server/package*.json ./server/
RUN cd server && npm install --omit=dev

# Copy built server and client artifacts
COPY --from=server-builder /app/server/dist ./server/dist
COPY --from=client-builder /app/client/dist ./client/dist

# Create storage directories
RUN mkdir -p /app/uploads

# Expose API and Web application port
EXPOSE 5000

# Start server
CMD ["node", "server/dist/index.js"]
