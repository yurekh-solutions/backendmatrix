import express from 'express';
import {
  getPendingSuppliers,
  getAllSuppliers,
  getSupplierById,
  approveSupplier,
  rejectSupplier,
  getStatistics,
  getAllProducts,
  approveProduct,
  rejectProduct
} from '../controllers/adminController';
import { authenticateAdmin } from '../middleware/auth';

const router = express.Router();

// All routes require admin authentication
router.use(authenticateAdmin);

router.get('/suppliers/pending', getPendingSuppliers);
router.get('/suppliers', getAllSuppliers);
router.get('/suppliers/:id', getSupplierById);
router.put('/suppliers/:id/approve', approveSupplier);
router.put('/suppliers/:id/reject', rejectSupplier);
router.get('/statistics', getStatistics);

// Product routes
router.get('/products', getAllProducts);
router.put('/products/:id/approve', approveProduct);
router.put('/products/:id/reject', rejectProduct);

export default router;
