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

const app: Application = express();
const PORT = process.env.PORT || 5000;

// Middleware
// CORS configuration with file upload support
// Force redeploy to apply CORS changes
app.use(cors({
  origin: true, // Allow all origins temporarily for debugging
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
  res.header('Access-Control-Allow-Origin', 'https://supplierportal-mu.vercel.app');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, X-API-Key');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.sendStatus(200);
});

app.use('/api/auth', authRoutes);
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

// Proxy endpoint for Cloudinary images (helps with localhost image loading)
app.get('/api/image-proxy', async (req: Request, res: Response) => {
  try {
    const imageUrl = req.query.url as string;
    
    console.log(`\n📋 Image Proxy Request:`);
    console.log(`   URL: ${imageUrl?.substring(0, 80)}...`);
    
    if (!imageUrl) {
      console.log(`   ❌ No image URL provided`);
      return res.status(400).json({ error: 'No image URL provided' });
    }
    
    // Only allow Cloudinary URLs for security
    if (!imageUrl.includes('cloudinary.com') && !imageUrl.includes('res.cloudinary')) {
      console.log(`   ❌ Not a Cloudinary URL`);
      return res.status(403).json({ error: 'Only Cloudinary URLs are allowed' });
    }
    
    console.log(`   ✅ Cloudinary URL detected, proxying...`);
    const response = await fetch(imageUrl);
    
    if (!response.ok) {
      console.log(`   ❌ Fetch failed: ${response.status}`);
      return res.status(response.status).json({ error: 'Failed to fetch image' });
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const contentType = response.headers.get('content-type');
    
    console.log(`   ✅ Success: ${buffer.length} bytes (${contentType})`);
    
    res.setHeader('Content-Type', contentType || 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.send(buffer);
  } catch (error: any) {
    console.error(`❌ Image proxy error: ${error.message}`);
    res.status(500).json({ error: 'Failed to proxy image' });
  }
});

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

