import express from 'express';
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
  getAutomationStats,
  recordToolClick
} from '../controllers/automationController';
import { supplierAuth, adminAuth } from '../middleware/auth';

const router = express.Router();

// Auto Reply Routes
router.get('/auto-replies', supplierAuth, getAutoReplies);
router.post('/auto-replies', supplierAuth, createAutoReply);
router.put('/auto-replies/:id', supplierAuth, updateAutoReply);
router.delete('/auto-replies/:id', supplierAuth, deleteAutoReply);

// Lead Routes
router.get('/leads', supplierAuth, getLeads);
router.post('/leads/:id/assign', supplierAuth, assignLead);

// Order Automation Routes
router.get('/orders', supplierAuth, getOrders);
router.post('/orders/:id/auto-process', supplierAuth, autoProcessOrder);

// Analytics Routes
router.get('/analytics/performance', supplierAuth, getPerformanceAnalytics);
router.get('/analytics/stats', supplierAuth, getAutomationStats);

// Tool Usage Tracking
router.post('/tools/record-click', supplierAuth, recordToolClick);

export default router;