import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { config } from './config';

import authRoutes from './routes/auth';
import proposalRoutes from './routes/proposals';
import workflowRoutes from './routes/workflows';
import financialRoutes from './routes/financial';
import change4mRoutes from './routes/changes4m';
import vendorRoutes from './routes/vendors';
import poRoutes from './routes/purchaseOrders';
import deliveryRoutes from './routes/deliveryInstallation';
import assetRoutes from './routes/assets';
import postAuditRoutes from './routes/postAudits';
import capexRoutes from './routes/capexDashboard';
import performanceRoutes from './routes/staffPerformance';
import notificationRoutes from './routes/notifications';
import documentRoutes from './routes/documents';
import auditLogRoutes from './routes/auditLogs';
import searchRoutes from './routes/search';

export const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static uploads serving
app.use('/uploads', express.static(config.uploadDir));

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/proposals', proposalRoutes);
app.use('/api/workflows', workflowRoutes);
app.use('/api/financial', financialRoutes);
app.use('/api/changes4m', change4mRoutes);
app.use('/api/changes-4m', change4mRoutes);
app.use('/api/vendors', vendorRoutes);
app.use('/api/purchase-orders', poRoutes);
app.use('/api/deliveries', deliveryRoutes);
app.use('/api/assets', assetRoutes);
app.use('/api/post-audits', postAuditRoutes);
app.use('/api/capex', capexRoutes);
app.use('/api/staff-performance', performanceRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/audit-logs', auditLogRoutes);
app.use('/api/search', searchRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    platform: 'ChangeFlow Enterprise',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// Serve client SPA build in production
const clientDistPath = path.resolve(__dirname, '../../client/dist');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
      return next();
    }
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

// Centralized error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled API Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
  });
});
