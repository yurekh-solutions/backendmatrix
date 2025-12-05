import express from 'express';
import { adminLogin, supplierLogin, setupSupplierPassword, requestPasswordReset, resetPassword } from '../controllers/authController';

const router = express.Router();

router.post('/admin/login', adminLogin);
router.post('/supplier/login', supplierLogin);
router.post('/supplier/setup-password', setupSupplierPassword);
router.post('/supplier/forgot-password', requestPasswordReset);
router.post('/supplier/reset-password', resetPassword);

export default router;
