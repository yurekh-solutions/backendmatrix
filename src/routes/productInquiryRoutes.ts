import express from 'express';
import {
  createProductInquiry,
  getAllProductInquiries,
  updateProductInquiryStatus,
  deleteProductInquiry,
  updateProductInquiry,
} from '../controllers/productInquiryController';
import { authenticateAdmin } from '../middleware/auth';

const router = express.Router();

// Public route - submit product inquiry
router.post('/', createProductInquiry);

// Admin routes
router.get('/admin/all', getAllProductInquiries);
router.patch('/:id/status', updateProductInquiryStatus);
router.patch('/:id', updateProductInquiry);
router.delete('/:id', deleteProductInquiry);

export default router;
