import express from 'express';
import {
  getPendingSuppliers,
  getAllSuppliers,
  getSupplierById,
  approveSupplier,
  rejectSupplier,
  getStatistics,
  getAllProducts,
  approveProduct,
  rejectProduct
} from '../controllers/adminController';
import {
  getAutoReplies,
  createAutoReply,
  updateAutoReply,
  deleteAutoReply,
  getLeads,
  assignLead,
  getOrders,
  autoProcessOrder,
  getPerformanceAnalytics,
  getAutomationStats
} from '../controllers/automationController';
import { getAllRFQs } from '../controllers/rfqController';
import { authenticateAdmin } from '../middleware/auth';

const router = express.Router();

// All routes require admin authentication
router.use(authenticateAdmin);

router.get('/suppliers/pending', getPendingSuppliers);
router.get('/suppliers', getAllSuppliers);
router.get('/suppliers/:id', getSupplierById);
router.put('/suppliers/:id/approve', approveSupplier);
router.put('/suppliers/:id/reject', rejectSupplier);
router.get('/statistics', getStatistics);

// Product routes
router.get('/products', getAllProducts);
router.put('/products/:id/approve', approveProduct);
router.put('/products/:id/reject', rejectProduct);

// Automation routes
router.get('/automation/stats', getAutomationStats);
router.get('/automation/auto-replies', getAutoReplies);
router.post('/automation/auto-replies', createAutoReply);
router.put('/automation/auto-replies/:id', updateAutoReply);
router.delete('/automation/auto-replies/:id', deleteAutoReply);

router.get('/automation/leads', getLeads);
router.post('/automation/leads/:id/assign', assignLead);

router.get('/automation/orders', getOrders);
router.post('/automation/orders/:id/auto-process', autoProcessOrder);

router.get('/automation/metrics', getPerformanceAnalytics);

// RFQ routes
router.get('/rfqs', getAllRFQs);

export default router;
