import express from 'express';
import {
  createPayment,
  getSupplierPayments,
  updatePaymentStatus,
  processRefund,
  getPaymentAnalytics
} from '../controllers/paymentController';
import { authenticateSupplier } from '../middleware/auth';

const router = express.Router();

// All routes require supplier authentication
router.use(authenticateSupplier);

// Create payment
router.post('/', createPayment);

// Get all payments for supplier
router.get('/', getSupplierPayments);

// Get payment analytics
router.get('/analytics', getPaymentAnalytics);

// Update payment status
router.patch('/:id/status', updatePaymentStatus);

// Process refund
router.post('/:id/refund', processRefund);

export default router;
