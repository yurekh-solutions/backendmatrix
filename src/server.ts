import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { connectDB } from './config/database';
import { createDefaultAdmin } from './controllers/authController';

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

// Load environment variables
dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 5000;

// Middleware
// CORS configuration with file upload support
app.use(cors({
  origin: [
    'http://localhost:8080',
    'http://localhost:8081', 
    'http://localhost:3002',
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175',
    'https://backendmatrix.onrender.com',
    'https://admin-panel-ritzyard.vercel.app',
    'https://supplierportal.vercel.app',
    'https://supplierportal-yurekh-solutions.vercel.app'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
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
app.use('/api/auth', authRoutes);
app.use('/api/supplier', supplierRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/products', productRoutes);
app.use('/api/rfqs', rfqRoutes);
app.use('/api/tracking', trackingRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/automation', automationRoutes);

// Health check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Supplier Onboarding API is running',
    timestamp: new Date().toISOString()
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

