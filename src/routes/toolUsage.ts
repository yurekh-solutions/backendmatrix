import express from 'express';
import {
  recordToolClick,
  enableTool,
  getSupplierTools,
  getAllToolUsage,
  getToolAnalytics,
  getSupplierActivityLog,
  updateToolMetrics
} from '../controllers/toolUsageController';
import { authenticateSupplier, authenticateAdmin } from '../middleware/auth';

const router = express.Router();

// Supplier routes
router.post('/record-click', authenticateSupplier, recordToolClick);
router.post('/enable', authenticateSupplier, enableTool);
router.get('/my-tools', authenticateSupplier, getSupplierTools);

// Admin routes
router.get('/admin/all', authenticateAdmin, getAllToolUsage);
router.get('/admin/analytics', authenticateAdmin, getToolAnalytics);
router.get('/admin/supplier-activity/:supplierId', authenticateAdmin, getSupplierActivityLog);
router.put('/admin/metrics/:toolUsageId', authenticateAdmin, updateToolMetrics);

export default router;
