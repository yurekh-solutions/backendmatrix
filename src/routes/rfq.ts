import express from 'express';
import * as rfqController from '../controllers/rfqController';
import { supplierAuth } from '../middleware/auth';

const router = express.Router();

// Public routes
router.post('/', rfqController.submitRFQ);
router.get('/customer', rfqController.getCustomerRFQs);

// Supplier routes (protected)
router.get('/supplier/my-rfqs', supplierAuth, rfqController.getSupplierRFQs);
router.put('/supplier/:id/respond', supplierAuth, rfqController.respondToRFQ);

export default router;
