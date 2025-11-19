"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const toolFeaturesController_1 = require("../controllers/toolFeaturesController");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// Tool Features - Supplier Routes
router.use(auth_1.authenticateSupplier);
// 1. Auto Reply Manager
router.post('/auto-reply/create-template', toolFeaturesController_1.createAutoReplyTemplate);
// 2. Lead Scoring
router.post('/lead-scoring/score', toolFeaturesController_1.scoreLead);
// 3. Order Automation
router.post('/order-automation/process', toolFeaturesController_1.automateOrder);
// 4. Smart Inventory
router.put('/smart-inventory/update', toolFeaturesController_1.updateInventory);
// 5. Price Optimizer
router.post('/price-optimizer/analyze', toolFeaturesController_1.optimizePrice);
// 6. Analytics Hub
router.get('/analytics-hub/business', toolFeaturesController_1.getBusinessAnalytics);
// Get all tool features and status
router.get('/features', toolFeaturesController_1.getToolFeatures);
exports.default = router;
