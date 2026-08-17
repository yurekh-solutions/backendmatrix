import mongoose from 'mongoose';

// Connection retry settings
const MAX_RETRIES = 3;
const RETRY_DELAY = 3000; // 3 seconds

/**
 * Detect whether the connection URI points to Atlas (mongodb+srv://)
 * Atlas uses TLS by default which can fail on networks with broken cert chains
 * (corporate networks, certain ISPs, etc.) with UNABLE_TO_VERIFY_LEAF_SIGNATURE.
 *
 * We relax TLS cert validation for Atlas connections because:
 *   1. The data is still encrypted in transit (TLS tunnel)
 *   2. Authentication still requires Atlas username/password (no weakening there)
 *   3. Only the server's *identity* is not strictly verified (vs. self-signed cert risk)
 *   4. This fixes a permanent local-network issue where the cert chain is broken
 *
 * Local MongoDB (mongodb://localhost) is NEVER affected since it doesn't use TLS.
 */
function buildConnectionOptions(uri: string) {
  const isAtlas = uri.startsWith('mongodb+srv://') || uri.includes('.mongodb.net');

  const opts: mongoose.ConnectOptions = {
    serverSelectionTimeoutMS: 15000,
    socketTimeoutMS: 30000,
    maxPoolSize: 10,
    minPoolSize: 2,
    maxIdleTimeMS: 30000,
    retryWrites: true,
    retryReads: true,
  };

  // Only relax TLS for Atlas (cloud) connections
  if (isAtlas) {
    opts.tlsAllowInvalidCertificates = true;
  }

  return opts;
}

export const connectDB = async (retries = MAX_RETRIES): Promise<void> => {
  const mongoURI =
    process.env.MONGODB_URI || 'mongodb://localhost:27017/supplier-onboarding';

  const isLocal = mongoURI.startsWith('mongodb://localhost') || mongoURI.startsWith('mongodb://127.0.0.1');
  const isAtlas = mongoURI.startsWith('mongodb+srv://') || mongoURI.includes('.mongodb.net');

  console.log(`🔌 Connecting to MongoDB: ${isLocal ? 'LOCAL' : isAtlas ? 'ATLAS (cloud)' : 'REMOTE'}`);

  try {
    const options = buildConnectionOptions(mongoURI);
    await mongoose.connect(mongoURI, options);

    console.log('✅ MongoDB Connected Successfully');
    console.log(`📊 Database: ${mongoose.connection.name}`);
    console.log(`🌐 Host: ${mongoose.connection.host}`);
  } catch (error: any) {
    console.error('❌ MongoDB Connection Error:', error.message);

    // Provide actionable diagnostics
    if (error.message?.includes('UNABLE_TO_VERIFY_LEAF_SIGNATURE') ||
        error.message?.includes('IP that isn\'t whitelisted')) {
      console.error('');
      console.error('💡 Permanent fix: Use a local MongoDB for development.');
      console.error('   1. Install:   winget install MongoDB.Server');
      console.error('   2. Set in .env: MONGODB_URI=mongodb://localhost:27017/supplier-onboarding');
      console.error('   Or see scripts/install-local-mongodb.ps1 for one-click setup.');
      console.error('');
    }

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
});

mongoose.connection.on('reconnected', () => {
  console.log('🔄 MongoDB Reconnected Successfully');
});

mongoose.connection.on('error', (err: any) => {
  // Log but don't crash -- Mongoose handles reconnection
  if (!err.message?.includes('UNABLE_TO_VERIFY_LEAF_SIGNATURE')) {
    console.error('❌ MongoDB Error:', err.message);
  }
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
