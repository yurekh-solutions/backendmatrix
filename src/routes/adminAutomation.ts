import express from 'express';
import {
  getAutomationStats,
  getAllAutoReplies,
  getAllLeads,
  getAllOrders,
  getSmartInventory,
  getPriceOptimizer,
  getPerformanceAnalytics,
  getMetrics,
  assignLeadToSales,
  updateOrderAutomation
} from '../controllers/adminAutomationController';
import { adminAuth } from '../middleware/auth';

const router = express.Router();

// Stats and Overview
router.get('/stats', adminAuth, getAutomationStats);
router.get('/metrics', adminAuth, getMetrics);
router.get('/performance', adminAuth, getPerformanceAnalytics);

// Auto-Replies Management
router.get('/auto-replies', adminAuth, getAllAutoReplies);

// Lead Management
router.get('/leads', adminAuth, getAllLeads);
router.post('/leads/:id/assign', adminAuth, assignLeadToSales);

// Order Management
router.get('/orders', adminAuth, getAllOrders);
router.put('/orders/:id', adminAuth, updateOrderAutomation);

// Inventory Management
router.get('/inventory', adminAuth, getSmartInventory);

// Price Optimization
router.get('/pricing', adminAuth, getPriceOptimizer);

export default router;
