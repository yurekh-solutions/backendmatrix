"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.upload = exports.uploadProductImage = void 0;
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const cloudinary_1 = require("./cloudinary");
// Ensure upload directory exists (for documents)
const uploadDir = path_1.default.join(__dirname, '../../uploads');
if (!fs_1.default.existsSync(uploadDir)) {
    fs_1.default.mkdirSync(uploadDir, { recursive: true });
}
// Configure local storage (for documents like PDFs)
const localStorage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path_1.default.extname(file.originalname);
        const name = path_1.default.basename(file.originalname, ext);
        cb(null, `${name}-${uniqueSuffix}${ext}`);
    }
});
// File filter for images (used with Cloudinary)
const imageFilter = (req, file, cb) => {
    const allowedExtensions = /jpg|jpeg|png|webp|gif/;
    const extname = allowedExtensions.test(path_1.default.extname(file.originalname).toLowerCase());
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
    }
    else {
        cb(new Error(`Invalid image type. Only JPG, PNG, WEBP, GIF files are allowed. Received: ${file.mimetype}`));
    }
};
// File filter for documents - Accept PDFs and images
const documentFilter = (req, file, cb) => {
    // Allowed file extensions
    const allowedExtensions = /pdf|jpg|jpeg|png|doc|docx/;
    const extname = allowedExtensions.test(path_1.default.extname(file.originalname).toLowerCase());
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
    }
    else {
        cb(new Error(`Invalid file type. Only PDF, JPG, PNG, DOC, DOCX files are allowed. Received: ${file.mimetype}`));
    }
};
// Multer instance for product images (uses Cloudinary)
exports.uploadProductImage = (0, multer_1.default)({
    storage: cloudinary_1.cloudinaryStorage,
    fileFilter: imageFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    }
});
// Multer instance for documents (uses local storage)
exports.upload = (0, multer_1.default)({
    storage: localStorage,
    fileFilter: documentFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    }
});
