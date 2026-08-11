import mongoose from 'mongoose';

// Connection retry settings
const MAX_RETRIES = 3;
const RETRY_DELAY = 3000; // 3 seconds

export const connectDB = async (retries = MAX_RETRIES): Promise<void> => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/supplier-onboarding';
    
    // Mongoose 8.x connection with proper options
    await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 15000, // 15 seconds timeout
      socketTimeoutMS: 30000, // 30 seconds socket timeout
      maxPoolSize: 10, // Maximum connection pool size
      minPoolSize: 2, // Minimum connection pool size
      maxIdleTimeMS: 30000, // Close idle connections after 30 seconds
      retryWrites: true, // Retry writes on network errors
      retryReads: true, // Retry reads on network errors
    });
    
    console.log('✅ MongoDB Connected Successfully');
    console.log(`📊 Database: ${mongoose.connection.name}`);
    console.log(`🌐 Host: ${mongoose.connection.host}`);
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error);
    
    if (retries > 0) {
      console.log(`⏳ Retrying connection... (${MAX_RETRIES - retries + 1}/${MAX_RETRIES})`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      return connectDB(retries - 1);
    } else {
      console.error('💥 Failed to connect to MongoDB after multiple attempts');
      process.exit(1);
    }
  }
};

// Connection event handlers
mongoose.connection.on('connected', () => {
  console.log('🔗 MongoDB connection established');
});

mongoose.connection.on('disconnected', () => {
  console.log('⚠️  MongoDB Disconnected - attempting to reconnect...');
  // Auto-reconnect is handled by Mongoose 8.x by default
});

mongoose.connection.on('reconnected', () => {
  console.log('🔄 MongoDB Reconnected Successfully');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB Error:', err);
  // Don't exit on error, let Mongoose handle reconnection
});

// Graceful shutdown
process.on('SIGINT', async () => {
  try {
    await mongoose.connection.close();
    console.log('👋 MongoDB connection closed through app termination');
    process.exit(0);
  } catch (err) {
    console.error('Error closing MongoDB connection:', err);
    process.exit(1);
  }
});
