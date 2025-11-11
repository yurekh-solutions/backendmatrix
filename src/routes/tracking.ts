import express from 'express';
import * as trackingController from '../controllers/trackingController';
import { adminAuth } from '../middleware/auth';

const router = express.Router();

// All routes require admin authentication
router.use(adminAuth);

// Statistics
router.get('/statistics', trackingController.getTrackingStatistics);

// Products management
router.get('/products', trackingController.getAllProductsAdmin);
router.put('/products/:id/status', trackingController.updateProductStatus);

// RFQs management
router.get('/rfqs', trackingController.getAllRFQsAdmin);
router.put('/rfqs/:id/assign', trackingController.assignRFQToSupplier);

// Orders management
router.get('/orders', trackingController.getAllOrdersAdmin);
router.put('/orders/:id/status', trackingController.updateOrderStatus);

export default router;
