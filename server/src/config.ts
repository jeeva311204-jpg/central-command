import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

if (process.env.NODE_ENV === 'production' && (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'default-secret-change-in-production')) {
  throw new Error('FATAL: JWT_SECRET environment variable must be securely set in production!');
}

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  jwtSecret: process.env.JWT_SECRET || 'changeflow-enterprise-super-secure-jwt-secret-key-2026',
  mongodbUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/changeflow',
  uploadDir: path.resolve(__dirname, '../../uploads'),
  nodeEnv: process.env.NODE_ENV || 'development',
  smtpHost: process.env.SMTP_HOST,
  smtpPort: parseInt(process.env.SMTP_PORT || '587', 10),
  smtpUser: process.env.SMTP_USER,
  smtpPass: process.env.SMTP_PASS,
  smtpFrom: process.env.SMTP_FROM || 'no-reply@changeflow.enterprise',
};
