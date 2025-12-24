import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables FIRST before any other imports
const dotenvResult = dotenv.config({ path: path.join(__dirname, '../.env') });
if (dotenvResult.error) {
  console.warn('⚠️  .env file not found, using system environment variables');
}

// NOW import modules that depend on env variables
import { connectDB } from './config/database';
import { createDefaultAdmin } from './controllers/authController';
import cloudinary from './config/cloudinary'; // Initialize Cloudinary with env vars

// Routes
import authRoutes from './routes/auth';
import supplierRoutes from './routes/supplier';
import adminRoutes from './routes/admin';
import productRoutes from './routes/product';
import rfqRoutes from './routes/rfq';
import trackingRoutes from './routes/tracking';
import categoryRoutes from './routes/category';
import aiRoutes from './routes/ai';
import automationRoutes from './routes/automation';
import adminAutomationRoutes from './routes/adminAutomation';
import miloGuideRoutes from './routes/miloGuide';
import materialInquiryRoutes from './routes/materialInquiry';
import whatsappWebhookRoutes from './routes/whatsappWebhook';
import userRoutes from './routes/user';

const app: Application = express();
const PORT = process.env.PORT || 5000;

// Middleware
// CORS configuration with proper origin whitelist
const allowedOrigins = [
  'https://supplierportal-mu.vercel.app',      // Supplier Portal - Production
  'https://admin-panel-ritzyard.vercel.app',   // Admin Panel - Production
  'https://yurekhmatrix.vercel.app',           // yurekhmatrix - Production
  'https://ritzyard.com',                       // Main domain
  'https://www.ritzyard.com',                   // Main domain with www
];

// Add all localhost/127.0.0.1 variations for development (ports 3000-9000)
const devPorts = [3000, 3002, 3003, 5173, 5174, 5175, 8000, 8001, 8080, 8081, 8082, 8083, 9000];
devPorts.forEach(port => {
  allowedOrigins.push(`http://localhost:${port}`);
  allowedOrigins.push(`http://127.0.0.1:${port}`);
});

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl requests, etc)
    if (!origin) return callback(null, true);
    
    // Check for exact match
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
      return;
    }
    
    // Allow all vercel.app deployments by domain pattern
    if (origin.endsWith('.vercel.app')) {
      console.log(`✅ CORS allowed Vercel deployment: ${origin}`);
      callback(null, true);
      return;
    }
    
    // Allow ritzyard.com and variations
    if (origin.includes('ritzyard.com')) {
      console.log(`✅ CORS allowed RitzYard domain: ${origin}`);
      callback(null, true);
      return;
    }
    
    console.warn(`⚠️  CORS blocked request from origin: ${origin}`);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'X-API-Key'],
  exposedHeaders: ['Content-Disposition', 'Content-Type']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files statically with proper MIME types
app.use('/uploads', express.static(path.join(__dirname, '../uploads'), {
  setHeaders: (res, filePath) => {
    // Set proper Content-Type based on file extension
    const ext = path.extname(filePath).toLowerCase();
    if (ext === '.pdf') {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'inline'); // Display in browser instead of download
    } else if (ext === '.jpg' || ext === '.jpeg') {
      res.setHeader('Content-Type', 'image/jpeg');
    } else if (ext === '.png') {
      res.setHeader('Content-Type', 'image/png');
    } else if (ext === '.doc') {
      res.setHeader('Content-Type', 'application/msword');
    } else if (ext === '.docx') {
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    }
  }
}));

// Routes
// Explicitly handle preflight requests for all routes
app.options('*', (req, res) => {
  const origin = req.headers.origin || '';
  if (allowedOrigins.includes(origin) || !origin) {
    res.header('Access-Control-Allow-Origin', origin || 'http://localhost:5173');
  }
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, X-API-Key');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.sendStatus(200);
});

app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/supplier', supplierRoutes);
app.use('/api/admin/automation', adminAutomationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/products', productRoutes);
app.use('/api/rfqs', rfqRoutes);
app.use('/api/tracking', trackingRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/automation', automationRoutes);
app.use('/api/milo/guide', miloGuideRoutes);
app.use('/api/material-inquiries', materialInquiryRoutes);
app.use('/api/whatsapp', whatsappWebhookRoutes);

// Health check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Supplier Onboarding API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    apiUrl: process.env.API_URL || 'not-configured'
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Error handler
app.use((err: any, req: Request, res: Response, next: any) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error'
  });
});

// Start server
const startServer = async () => {
  try {
    // Connect to database
    await connectDB();
    
    // Create default admin
    await createDefaultAdmin();
    
    app.listen(PORT, () => {
      console.log(`
╔════════════════════════════════════════════╗
║   🚀 Supplier Onboarding API Server       ║
║   Port: ${PORT}                            ║
║   Environment: ${process.env.NODE_ENV || 'development'}              ║
║   Database: Connected                      ║
╚════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export default app;

