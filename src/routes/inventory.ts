import express from 'express';
import {
  upsertInventory,
  getSupplierInventory,
  getInventoryById,
  updateStock,
  getLowStockAlerts,
  getInventoryAnalytics,
  bulkImportInventory
} from '../controllers/inventoryController';
import { authenticateSupplier } from '../middleware/auth';

const router = express.Router();

// All routes require supplier authentication
router.use(authenticateSupplier);

// Create or update inventory
router.post('/', upsertInventory);

// Get all inventory for supplier
router.get('/', getSupplierInventory);

// Get low stock alerts
router.get('/alerts', getLowStockAlerts);

// Get inventory analytics
router.get('/analytics', getInventoryAnalytics);

// Bulk import inventory
router.post('/bulk-import', bulkImportInventory);

// Get single inventory item
router.get('/:id', getInventoryById);

// Update stock quantity
router.patch('/:id/stock', updateStock);

export default router;
