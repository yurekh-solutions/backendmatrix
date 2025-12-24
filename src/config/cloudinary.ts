import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Ensure upload directory exists for fallback
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Check if Cloudinary is properly configured
const isCloudinaryConfigured = 
  process.env.CLOUDINARY_CLOUD_NAME && 
  process.env.CLOUDINARY_CLOUD_NAME !== 'your_cloud_name_here' &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_KEY !== 'your_api_key_here';

if (isCloudinaryConfigured) {
  console.log('✅ Cloudinary configured - Using cloud storage for product images');
} else {
  console.warn('⚠️  Cloudinary not configured - Using local storage for uploads');
}

let cloudinaryStorage: any;

if (isCloudinaryConfigured) {
  // Use Cloudinary if configured
  cloudinaryStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
      folder: 'supplier-products',
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
      transformation: [{ width: 1200, height: 900, crop: 'limit', quality: 'auto' }],
      public_id: (req: any, file: any) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const filename = file.originalname.replace(/\.[^\/\.]+$/, '').replace(/[^a-z0-9]/gi, '_').toLowerCase();
        return `${filename}-${uniqueSuffix}`;
      },
    } as any,
  });
} else {
  // Fallback to local storage if Cloudinary not configured
  const localStorage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const ext = path.extname(file.originalname);
      const name = path.basename(file.originalname, ext);
      cb(null, `${name}-${uniqueSuffix}${ext}`);
    },
  });
  cloudinaryStorage = localStorage;
  console.warn('⚠️  Cloudinary not configured. Using local storage for uploads.');
}

// Helper function to upload file to Cloudinary
export const uploadToCloudinary = async (filePath: string, folder: string = 'uploads'): Promise<string> => {
  if (!isCloudinaryConfigured) {
    // Return local file path if Cloudinary not configured
    const apiUrl = process.env.API_URL || 'http://localhost:5000';
    const relativePath = filePath.replace(uploadDir, '').replace(/\\/g, '/');
    return `${apiUrl}/uploads${relativePath}`;
  }

  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder,
      resource_type: 'auto',
    });
    return result.secure_url;
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw new Error('Failed to upload file to Cloudinary');
  }
};

export { cloudinaryStorage };
export default cloudinary;
