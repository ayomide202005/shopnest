import mongoose from 'mongoose';
import { env } from './env.js';

const explainDbError = (error) => {
  const message = error?.message ?? '';
  if (/Invalid scheme|Invalid connection string|Invalid URL/i.test(message)) {
    return 'MONGODB_URI is not a valid MongoDB connection string. It must start with mongodb:// or mongodb+srv://';
  }
  if (/auth/i.test(message)) {
    return 'Authentication failed. Check the username and password in MONGODB_URI (special characters in the password must be URL-encoded).';
  }
  if (/ENOTFOUND|querySrv|getaddrinfo/i.test(message)) {
    return 'The database host could not be found. Check the host name in MONGODB_URI and your internet connection.';
  }
  if (/ServerSelection/i.test(error?.name ?? '')) {
    return 'Could not reach the MongoDB server. Make sure your IP is allowed under Network Access in Atlas and that MONGODB_URI is correct.';
  }
  return 'Check MONGODB_URI in backend/.env and that the database server is reachable.';
};

mongoose.connection.on('disconnected', () => console.warn('MongoDB disconnected.'));
mongoose.connection.on('reconnected', () => console.log('MongoDB reconnected.'));
mongoose.connection.on('error', (error) => console.error('MongoDB error:', error.message));

export const connectDB = async () => {
  try {
    await mongoose.connect(env.mongoUri, { serverSelectionTimeoutMS: 10_000 });
    console.log(`MongoDB connected (database: ${mongoose.connection.name})`);
  } catch (error) {
    console.error(`\nMongoDB connection failed: ${error.message}`);
    console.error(`${explainDbError(error)}\n`);
    throw error;
  }
};

export const disconnectDB = async () => {
  try {
    await mongoose.connection.close();
  } catch (error) {
    console.error('Error while closing the MongoDB connection:', error.message);
  }
};