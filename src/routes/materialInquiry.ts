import express from 'express';
import * as materialInquiryController from '../controllers/materialInquiryController';
import { adminAuth } from '../middleware/auth';

const router = express.Router();

// Public routes
router.post('/', materialInquiryController.submitMaterialInquiry);
router.get('/customer', materialInquiryController.getCustomerInquiries);
router.get('/admin/all', materialInquiryController.getAllMaterialInquiries); // No auth for development

// Admin routes (protected)
router.get('/admin/statistics', adminAuth, materialInquiryController.getInquiryStatistics);
router.get('/admin/:id', adminAuth, materialInquiryController.getMaterialInquiryById);
router.patch('/admin/:id/status', adminAuth, materialInquiryController.updateInquiryStatus);
router.patch('/admin/:id/assign', adminAuth, materialInquiryController.assignInquiry);
router.post('/admin/:id/quote', adminAuth, materialInquiryController.addSupplierQuote);
router.patch('/admin/:id/quote/:quoteId', adminAuth, materialInquiryController.updateQuoteStatus);
router.delete('/admin/:id', adminAuth, materialInquiryController.deleteMaterialInquiry);
router.post('/admin/bulk-update', adminAuth, materialInquiryController.bulkUpdateInquiries);

export default router;
