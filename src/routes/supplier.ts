import express from 'express';
import { submitOnboarding, checkApplicationStatus, getSupplierInquiries } from '../controllers/supplierController';
import { upload } from '../config/multer';
import { supplierAuth } from '../middleware/auth';

const router = express.Router();

// Public routes
router.post(
  '/submit',
  upload.fields([
    { name: 'logo', maxCount: 1 },
    { name: 'gst', maxCount: 1 },
    { name: 'cin', maxCount: 1 },
    { name: 'pan', maxCount: 1 },
    { name: 'bankProof', maxCount: 1 },
    { name: 'businessLicense', maxCount: 1 },
    { name: 'aadhaar', maxCount: 1 }
  ]),
  submitOnboarding
);

router.get('/check-status', checkApplicationStatus);

// Protected route - get supplier's inquiries
router.get('/inquiries', supplierAuth, getSupplierInquiries);

export default router;
