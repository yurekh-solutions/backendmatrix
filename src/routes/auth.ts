import express from 'express';
import { adminLogin, supplierLogin, setupSupplierPassword, requestPasswordReset, resetPassword, userSignup, userLogin, userGoogleAuth, requestUserPasswordReset, resetUserPassword } from '../controllers/authController';
import { updateUserProfile } from '../controllers/userController';
import { protect } from '../middleware/auth';

import { uploadImages } from '../config/multer';

const router = express.Router();

router.post('/admin/login', adminLogin);
router.post('/supplier/login', supplierLogin);
router.post('/supplier/setup-password', setupSupplierPassword);
router.post('/supplier/forgot-password', requestPasswordReset);
router.post('/supplier/reset-password', resetPassword);

// User (Buyer) Auth Routes
router.post('/user/signup', uploadImages.fields([{ name: 'profileImage', maxCount: 1 }, { name: 'businessImage', maxCount: 1 }]), userSignup);
router.post('/user/login', userLogin);
router.post('/user/google', userGoogleAuth);
router.post('/user/forgot-password', requestUserPasswordReset);
router.post('/user/reset-password', resetUserPassword);

// Alias for frontend AuthContext.updateUser which calls PATCH /auth/user/profile
router.patch('/user/profile', protect, updateUserProfile);
router.put('/user/profile', protect, updateUserProfile);

export default router;
