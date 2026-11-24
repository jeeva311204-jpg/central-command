import { MongoMemoryServer, MongoMemoryReplSet } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { connectDB, disconnectDB } from '../db';

let mongodInstance: MongoMemoryServer | MongoMemoryReplSet | null = null;

export async function setupTestDB() {
  if (mongoose.connection.readyState === 1 && mongodInstance) {
    return mongodInstance;
  }

  try {
    // Try starting a single-node replica set for ACID transaction support
    const replSet = await MongoMemoryReplSet.create({
      replSet: { count: 1, storageEngine: 'wiredTiger' },
    });
    await replSet.waitUntilRunning();
    const uri = replSet.getUri();
    await connectDB(uri);
    mongodInstance = replSet;
    return replSet;
  } catch (err) {
    console.warn('⚠️ Could not start replica set; starting standalone memory server:', err);
    const standalone = await MongoMemoryServer.create();
    const uri = standalone.getUri();
    await connectDB(uri);
    mongodInstance = standalone;
    return standalone;
  }
}

export async function teardownTestDB() {
  await disconnectDB();
  if (mongodInstance) {
    await mongodInstance.stop();
    mongodInstance = null;
  }
}

export async function clearTestDB() {
  if (mongoose.connection.readyState === 1) {
    const collections = mongoose.connection.collections;
    for (const key of Object.keys(collections)) {
      await collections[key].deleteMany({});
    }
  }
}
