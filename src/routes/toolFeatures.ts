import express from 'express';
import {
  createAutoReplyTemplate,
  scoreLead,
  automateOrder,
  updateInventory,
  optimizePrice,
  getBusinessAnalytics,
  getToolFeatures
} from '../controllers/toolFeaturesController';
import { authenticateSupplier } from '../middleware/auth';

const router = express.Router();

// Tool Features - Supplier Routes
router.use(authenticateSupplier);

// 1. Auto Reply Manager
router.post('/auto-reply/create-template', createAutoReplyTemplate);

// 2. Lead Scoring
router.post('/lead-scoring/score', scoreLead);

// 3. Order Automation
router.post('/order-automation/process', automateOrder);

// 4. Smart Inventory
router.put('/smart-inventory/update', updateInventory);

// 5. Price Optimizer
router.post('/price-optimizer/analyze', optimizePrice);

// 6. Analytics Hub
router.get('/analytics-hub/business', getBusinessAnalytics);

// Get all tool features and status
router.get('/features', getToolFeatures);

export default router;
