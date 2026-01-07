import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { cloudinaryStorage } from './cloudinary';

// Ensure upload directory exists (for documents)
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure local storage (for documents like PDFs)
const localStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, `${name}-${uniqueSuffix}${ext}`);
  }
});

// File filter for images (used with Cloudinary)
const imageFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedExtensions = /jpg|jpeg|png|webp|gif/;
  const extname = allowedExtensions.test(path.extname(file.originalname).toLowerCase());
  
  const allowedMimeTypes = [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/webp',
    'image/gif'
  ];
  const mimetype = allowedMimeTypes.includes(file.mimetype);
  
  if (extname && mimetype) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid image type. Only JPG, PNG, WEBP, GIF files are allowed. Received: ${file.mimetype}`));
  }
};

// File filter for documents - Accept PDFs and images
const documentFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Allowed file extensions
  const allowedExtensions = /pdf|jpg|jpeg|png|doc|docx/;
  const extname = allowedExtensions.test(path.extname(file.originalname).toLowerCase());
  
  // Allowed MIME types - including all PDF variations
  const allowedMimeTypes = [
    'application/pdf',
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];
  const mimetype = allowedMimeTypes.includes(file.mimetype);
  
  if (extname && mimetype) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type. Only PDF, JPG, PNG, DOC, DOCX files are allowed. Received: ${file.mimetype}`));
  }
};

// Multer instance for images (uses Cloudinary) - For profile pictures, product images, etc.
export const uploadImages = multer({
  storage: cloudinaryStorage,
  fileFilter: imageFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Multer instance for product images (uses Cloudinary)
export const uploadProductImage = multer({
  storage: cloudinaryStorage,
  fileFilter: imageFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Multer instance for documents (uses local storage)
export const upload = multer({
  storage: localStorage,
  fileFilter: documentFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});
