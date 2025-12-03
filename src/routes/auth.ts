import express from 'express';
import { adminLogin, supplierLogin, setupSupplierPassword, forgotSupplierPassword, verifyResetToken, resetSupplierPassword } from '../controllers/authController';

const router = express.Router();

router.post('/admin/login', adminLogin);
router.post('/supplier/login', supplierLogin);
router.post('/supplier/setup-password', setupSupplierPassword);
router.post('/supplier/forgot-password', forgotSupplierPassword);
router.post('/supplier/verify-reset-token', verifyResetToken);
router.post('/supplier/reset-password', resetSupplierPassword);

export default router;
