import { app } from './app';
import { config } from './config';
import { connectDB, disconnectDB } from './db';
import { startScheduler, stopScheduler } from './services/scheduler';

async function bootstrap() {
  try {
    await connectDB();
    console.log('✅ Connected to MongoDB database successfully.');

    const server = app.listen(config.port, () => {
      console.log(`🚀 ChangeFlow Enterprise Server running on http://localhost:${config.port}`);
      console.log(`📁 Uploads served from ${config.uploadDir}`);
      console.log(`🔒 Mode: ${config.nodeEnv}`);
      
      // Start automated background schedulers (SLA checks, escalations)
      startScheduler();
    });

    const gracefulShutdown = async () => {
      stopScheduler();
      await disconnectDB();
      server.close(() => {
        console.log('ChangeFlow Server terminated gracefully.');
        process.exit(0);
      });
    };

    process.on('SIGINT', gracefulShutdown);
    process.on('SIGTERM', gracefulShutdown);
  } catch (error) {
    console.error('❌ Failed to bootstrap application:', error);
    process.exit(1);
  }
}

bootstrap();
