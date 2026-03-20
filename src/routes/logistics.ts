import express from 'express';
import {
  createShipment,
  getSupplierShipments,
  trackShipment,
  updateShipmentStatus,
  getLogisticsAnalytics
} from '../controllers/logisticsController';
import { authenticateSupplier } from '../middleware/auth';

const router = express.Router();

// Public route for tracking
router.get('/track/:trackingNumber', trackShipment);

// All other routes require supplier authentication
router.use(authenticateSupplier);

// Create shipment
router.post('/', createShipment);

// Get all shipments for supplier
router.get('/', getSupplierShipments);

// Get logistics analytics
router.get('/analytics', getLogisticsAnalytics);

// Update shipment status
router.patch('/:id/status', updateShipmentStatus);

export default router;
