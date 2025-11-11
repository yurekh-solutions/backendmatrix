import express from 'express';
import { submitOnboarding, checkApplicationStatus } from '../controllers/supplierController';
import { upload } from '../config/multer';

const router = express.Router();

// Public routes
router.post(
  '/submit',
  upload.fields([
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

export default router;
