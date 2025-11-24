"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const adminAutomationController_1 = require("../controllers/adminAutomationController");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// Stats and Overview
router.get('/stats', auth_1.adminAuth, adminAutomationController_1.getAutomationStats);
router.get('/metrics', auth_1.adminAuth, adminAutomationController_1.getMetrics);
router.get('/performance', auth_1.adminAuth, adminAutomationController_1.getPerformanceAnalytics);
// Auto-Replies Management
router.get('/auto-replies', auth_1.adminAuth, adminAutomationController_1.getAllAutoReplies);
// Lead Management
router.get('/leads', auth_1.adminAuth, adminAutomationController_1.getAllLeads);
router.post('/leads/:id/assign', auth_1.adminAuth, adminAutomationController_1.assignLeadToSales);
// Order Management
router.get('/orders', auth_1.adminAuth, adminAutomationController_1.getAllOrders);
router.put('/orders/:id', auth_1.adminAuth, adminAutomationController_1.updateOrderAutomation);
// Inventory Management
router.get('/inventory', auth_1.adminAuth, adminAutomationController_1.getSmartInventory);
// Price Optimization
router.get('/pricing', auth_1.adminAuth, adminAutomationController_1.getPriceOptimizer);
exports.default = router;
