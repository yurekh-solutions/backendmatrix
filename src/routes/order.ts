import express from 'express';
import {
  convertRFQToOrder,
  convertMaterialInquiryToOrder,
  getCustomerOrders,
  getOrderById,
  getSupplierOrders,
  updateOrderStatus,
  getAllOrders,
} from '../controllers/orderController';
import { authenticateAdmin, authenticateSupplier } from '../middleware/auth';

const router = express.Router();

// Public routes (no auth required for customer order tracking)
router.get('/customer', getCustomerOrders); // Get orders by email
router.get('/:id', getOrderById); // Get single order for tracking

// Admin routes
router.post('/rfq/convert', authenticateAdmin, convertRFQToOrder);
router.post('/inquiry/convert', authenticateAdmin, convertMaterialInquiryToOrder);
router.get('/admin/all', authenticateAdmin, getAllOrders);

// Supplier routes
router.get('/supplier/:supplierId', authenticateSupplier, getSupplierOrders);
router.put('/:id/status', authenticateSupplier, updateOrderStatus);

export default router;
