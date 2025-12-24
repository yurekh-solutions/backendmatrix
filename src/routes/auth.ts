import express from 'express';
import { adminLogin, supplierLogin, setupSupplierPassword, requestPasswordReset, resetPassword, userSignup, userLogin } from '../controllers/authController';

const router = express.Router();

router.post('/admin/login', adminLogin);
router.post('/supplier/login', supplierLogin);
router.post('/supplier/setup-password', setupSupplierPassword);
router.post('/supplier/forgot-password', requestPasswordReset);
router.post('/supplier/reset-password', resetPassword);

// User (Buyer) Auth Routes
router.post('/user/signup', userSignup);
router.post('/user/login', userLogin);

export default router;
