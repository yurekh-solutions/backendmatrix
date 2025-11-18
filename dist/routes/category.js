"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const categoryController_1 = require("../controllers/categoryController");
const auth_1 = require("../middleware/auth");
const auth_2 = require("../middleware/auth");
const router = express_1.default.Router();
// Public routes
router.get('/public', categoryController_1.getCategories);
// Supplier routes (protected)
router.post('/request', auth_1.supplierAuth, categoryController_1.requestCategory);
router.post('/request-subcategory', auth_1.supplierAuth, categoryController_1.requestSubcategory);
// Admin routes (protected)
router.get('/admin/all', auth_2.authenticateAdmin, categoryController_1.getAllCategoriesAdmin);
router.post('/admin/add', auth_2.authenticateAdmin, categoryController_1.addDefaultCategory);
router.put('/admin/:id/approve', auth_2.authenticateAdmin, categoryController_1.approveCategory);
router.put('/admin/:id/reject', auth_2.authenticateAdmin, categoryController_1.rejectCategory);
router.put('/admin/:categoryId/subcategory/:subcategoryId/approve', auth_2.authenticateAdmin, categoryController_1.approveSubcategory);
router.put('/admin/:categoryId/subcategory/:subcategoryId/reject', auth_2.authenticateAdmin, categoryController_1.rejectSubcategory);
exports.default = router;
