import { app } from './app';
import { config } from './config';
import { startScheduler, stopScheduler } from './services/scheduler';

const server = app.listen(config.port, () => {
  console.log(`🚀 ChangeFlow Enterprise Server running on http://localhost:${config.port}`);
  console.log(`📁 Uploads served from ${config.uploadDir}`);
  console.log(`🔒 Mode: ${config.nodeEnv}`);
  
  // Start automated background schedulers (SLA checks, escalations)
  startScheduler();
});

const gracefulShutdown = () => {
  stopScheduler();
  server.close(() => {
    console.log('ChangeFlow Server terminated gracefully.');
    process.exit(0);
  });
};

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);
