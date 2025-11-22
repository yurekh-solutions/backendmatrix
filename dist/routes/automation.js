"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const automationController_1 = require("../controllers/automationController");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// Auto Reply Routes
router.get('/auto-replies', auth_1.supplierAuth, automationController_1.getAutoReplies);
router.post('/auto-replies', auth_1.supplierAuth, automationController_1.createAutoReply);
router.put('/auto-replies/:id', auth_1.supplierAuth, automationController_1.updateAutoReply);
router.delete('/auto-replies/:id', auth_1.supplierAuth, automationController_1.deleteAutoReply);
// Lead Routes
router.get('/leads', auth_1.supplierAuth, automationController_1.getLeads);
router.post('/leads/:id/assign', auth_1.supplierAuth, automationController_1.assignLead);
// Order Automation Routes
router.get('/orders', auth_1.supplierAuth, automationController_1.getOrders);
router.post('/orders/:id/auto-process', auth_1.supplierAuth, automationController_1.autoProcessOrder);
// Analytics Routes
router.get('/analytics/performance', auth_1.supplierAuth, automationController_1.getPerformanceAnalytics);
router.get('/analytics/stats', auth_1.supplierAuth, automationController_1.getAutomationStats);
// Tool Usage Tracking
router.post('/tools/record-click', auth_1.supplierAuth, automationController_1.recordToolClick);
exports.default = router;
