import express from 'express';
import { submitOnboarding, checkApplicationStatus, getSupplierInquiries, updateSupplierProfile, getUnreadInquiryCount, respondToInquiry } from '../controllers/supplierController';
import { upload } from '../config/multer';
import { uploadImages } from '../config/multer'; // For logo (Cloudinary)
import { supplierAuth } from '../middleware/auth';
import multer from 'multer';

// Custom multer configuration to handle both image (logo) and document uploads
const uploadMixed = multer({ dest: 'uploads/temp' }).fields([
  { name: 'logo', maxCount: 1 },
  { name: 'gst', maxCount: 1 },
  { name: 'cin', maxCount: 1 },
  { name: 'pan', maxCount: 1 },
  { name: 'bankProof', maxCount: 1 },
  { name: 'businessLicense', maxCount: 1 },
  { name: 'aadhaar', maxCount: 1 }
]);

const router = express.Router();

// Public routes
router.post(
  '/submit',
  uploadMixed,
  submitOnboarding
);

router.get('/check-status', checkApplicationStatus);

// Protected route - get supplier's inquiries
router.get('/inquiries', supplierAuth, getSupplierInquiries);

// Protected route - get unread inquiry count for notification badge
router.get('/inquiries/unread-count', supplierAuth, getUnreadInquiryCount);

// Protected route - respond to an inquiry
router.post('/inquiries/:inquiryId/respond', supplierAuth, respondToInquiry);

// Protected route - update supplier profile
router.put('/profile', supplierAuth, uploadImages.single('logo'), updateSupplierProfile);

export default router;
