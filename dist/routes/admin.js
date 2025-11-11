"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const adminController_1 = require("../controllers/adminController");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// All routes require admin authentication
router.use(auth_1.authenticateAdmin);
router.get('/suppliers/pending', adminController_1.getPendingSuppliers);
router.get('/suppliers', adminController_1.getAllSuppliers);
router.get('/suppliers/:id', adminController_1.getSupplierById);
router.put('/suppliers/:id/approve', adminController_1.approveSupplier);
router.put('/suppliers/:id/reject', adminController_1.rejectSupplier);
router.get('/statistics', adminController_1.getStatistics);
// Product routes
router.get('/products', adminController_1.getAllProducts);
router.put('/products/:id/approve', adminController_1.approveProduct);
router.put('/products/:id/reject', adminController_1.rejectProduct);
exports.default = router;
