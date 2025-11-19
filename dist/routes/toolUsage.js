"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const toolUsageController_1 = require("../controllers/toolUsageController");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// Supplier routes
router.post('/record-click', auth_1.authenticateSupplier, toolUsageController_1.recordToolClick);
router.post('/enable', auth_1.authenticateSupplier, toolUsageController_1.enableTool);
router.get('/my-tools', auth_1.authenticateSupplier, toolUsageController_1.getSupplierTools);
// Admin routes
router.get('/admin/all', auth_1.authenticateAdmin, toolUsageController_1.getAllToolUsage);
router.get('/admin/analytics', auth_1.authenticateAdmin, toolUsageController_1.getToolAnalytics);
router.get('/admin/supplier-activity/:supplierId', auth_1.authenticateAdmin, toolUsageController_1.getSupplierActivityLog);
router.put('/admin/metrics/:toolUsageId', auth_1.authenticateAdmin, toolUsageController_1.updateToolMetrics);
exports.default = router;
