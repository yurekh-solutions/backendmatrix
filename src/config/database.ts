import mongoose from 'mongoose';

// Cache connection for Vercel serverless (reuse across invocations)
let isConnected = false;

export const connectDB = async (): Promise<void> => {
  // If already connected, reuse the connection
  if (isConnected && mongoose.connection.readyState === 1) {
    console.log('✅ Reusing existing MongoDB connection');
    return;
  }

  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/supplier-onboarding';

    await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 8000, // Vercel max ~10s, use 8s
      socketTimeoutMS: 8000,
      maxPoolSize: 5,
      minPoolSize: 1,
      maxIdleTimeMS: 10000,
      retryWrites: true,
      retryReads: true,
    });

    isConnected = true;
    console.log('✅ MongoDB Connected Successfully');
    console.log(`📊 Database: ${mongoose.connection.name}`);
  } catch (error) {
    isConnected = false;
    console.error('❌ MongoDB Connection Error:', error);
    throw error; // Let caller handle — no retry loop on Vercel
  }
};

// Connection event handlers
mongoose.connection.on('disconnected', () => {
  isConnected = false;
  console.log('⚠️  MongoDB Disconnected');
});

mongoose.connection.on('error', (err) => {
  isConnected = false;
  console.error('❌ MongoDB Error:', err);
});

// Graceful shutdown (only in non-serverless)
if (process.env.VERCEL !== '1') {
  process.on('SIGINT', async () => {
    try {
      await mongoose.connection.close();
      console.log('👋 MongoDB connection closed');
      process.exit(0);
    } catch (err) {
      process.exit(1);
    }
  });
}
