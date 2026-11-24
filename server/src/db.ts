import mongoose from 'mongoose';
import { config } from './config';

/**
 * Connect to MongoDB database (supports standalone & replica set)
 */
export async function connectDB(uri?: string): Promise<typeof mongoose> {
  const connectionUri = uri || config.mongodbUri;
  
  if (mongoose.connection.readyState === 1) {
    return mongoose;
  }

  try {
    const conn = await mongoose.connect(connectionUri, {
      autoIndex: true,
      serverSelectionTimeoutMS: 10000,
    });
    console.log(`🍃 Connected to MongoDB at: ${connectionUri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@')}`);
    return conn;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    throw error;
  }
}

/**
 * Disconnect from MongoDB
 */
export async function disconnectDB(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    console.log('🍃 Disconnected from MongoDB');
  }
}

/**
 * Helper to execute operations within a multi-document ACID transaction.
 * In environments without replica sets (e.g. basic local standalone),
 * it gracefully falls back to non-transactional execution.
 */
export async function withTransaction<T>(
  callback: (session?: mongoose.ClientSession) => Promise<T>
): Promise<T> {
  // Check if server supports transactions (replica set mode)
  let session: mongoose.ClientSession | null = null;
  try {
    session = await mongoose.startSession();
  } catch (err) {
    // Standalone instances without replica sets cannot start sessions with transactions
    return await callback();
  }

  try {
    let result: T;
    await session.withTransaction(async () => {
      result = await callback(session!);
    });
    return result!;
  } catch (error) {
    // If transaction is not supported by deployment (e.g. standalone without replica set),
    // fallback gracefully to executing without session so local dev is never blocked
    if ((error as any)?.message?.includes('replica set') || (error as any)?.codeName === 'TransactionNumbers') {
      console.warn('⚠️ MongoDB replica set not active; executing without transaction session.');
      return await callback();
    }
    throw error;
  } finally {
    await session.endSession();
  }
}

export { mongoose };
