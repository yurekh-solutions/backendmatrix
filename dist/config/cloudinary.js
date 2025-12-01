"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cloudinaryStorage = void 0;
const cloudinary_1 = require("cloudinary");
const multer_storage_cloudinary_1 = require("multer-storage-cloudinary");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
// Configure Cloudinary
cloudinary_1.v2.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});
// Ensure upload directory exists for fallback
const uploadDir = path_1.default.join(__dirname, '../../uploads');
if (!fs_1.default.existsSync(uploadDir)) {
    fs_1.default.mkdirSync(uploadDir, { recursive: true });
}
// Check if Cloudinary is properly configured
const isCloudinaryConfigured = process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_CLOUD_NAME !== 'your_cloud_name_here' &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_KEY !== 'your_api_key_here';
if (isCloudinaryConfigured) {
    console.log('✅ Cloudinary configured - Using cloud storage for product images');
}
else {
    console.warn('⚠️  Cloudinary not configured - Using local storage for uploads');
}
let cloudinaryStorage;
if (isCloudinaryConfigured) {
    // Use Cloudinary if configured
    exports.cloudinaryStorage = cloudinaryStorage = new multer_storage_cloudinary_1.CloudinaryStorage({
        cloudinary: cloudinary_1.v2,
        params: {
            folder: 'supplier-products',
            allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
            transformation: [{ width: 1200, height: 900, crop: 'limit', quality: 'auto' }],
            public_id: (req, file) => {
                const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
                const filename = file.originalname.replace(/\.[^\/\.]+$/, '').replace(/[^a-z0-9]/gi, '_').toLowerCase();
                return `${filename}-${uniqueSuffix}`;
            },
        },
    });
}
else {
    // Fallback to local storage if Cloudinary not configured
    const localStorage = multer_1.default.diskStorage({
        destination: (req, file, cb) => {
            cb(null, uploadDir);
        },
        filename: (req, file, cb) => {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
            const ext = path_1.default.extname(file.originalname);
            const name = path_1.default.basename(file.originalname, ext);
            cb(null, `${name}-${uniqueSuffix}${ext}`);
        },
    });
    exports.cloudinaryStorage = cloudinaryStorage = localStorage;
    console.warn('⚠️  Cloudinary not configured. Using local storage for uploads.');
}
exports.default = cloudinary_1.v2;
