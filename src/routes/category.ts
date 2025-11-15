import express from 'express';
import {
  getCategories,
  requestCategory,
  requestSubcategory,
  getAllCategoriesAdmin,
  approveCategory,
  rejectCategory,
  approveSubcategory,
  rejectSubcategory,
  addDefaultCategory,
} from '../controllers/categoryController';
import { supplierAuth } from '../middleware/auth';
import { authenticateAdmin } from '../middleware/auth';

const router = express.Router();

// Public routes
router.get('/public', getCategories);

// Supplier routes (protected)
router.post('/request', supplierAuth, requestCategory);
router.post('/request-subcategory', supplierAuth, requestSubcategory);

// Admin routes (protected)
router.get('/admin/all', authenticateAdmin, getAllCategoriesAdmin);
router.post('/admin/add', authenticateAdmin, addDefaultCategory);
router.put('/admin/:id/approve', authenticateAdmin, approveCategory);
router.put('/admin/:id/reject', authenticateAdmin, rejectCategory);
router.put('/admin/:categoryId/subcategory/:subcategoryId/approve', authenticateAdmin, approveSubcategory);
router.put('/admin/:categoryId/subcategory/:subcategoryId/reject', authenticateAdmin, rejectSubcategory);

export default router;
