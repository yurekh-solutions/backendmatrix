import express from 'express';
import { adminLogin, supplierLogin, setupSupplierPassword } from '../controllers/authController';

const router = express.Router();

router.post('/admin/login', adminLogin);
router.post('/supplier/login', supplierLogin);
router.post('/supplier/setup-password', setupSupplierPassword);

export default router;
