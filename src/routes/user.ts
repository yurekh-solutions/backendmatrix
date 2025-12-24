import express from 'express';
import {
  getUserProfile,
  updateUserProfile,
  getUserCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
} from '../controllers/userController';
import { protect } from '../middleware/auth';
import { upload } from '../config/multer';

const router = express.Router();

// Profile routes
router.get('/profile', protect, getUserProfile);
router.put('/profile', protect, upload.single('profileImage'), updateUserProfile);

// Cart routes
router.get('/cart', protect, getUserCart);
router.post('/cart/add', protect, addToCart);
router.put('/cart/update', protect, updateCartItem);
router.delete('/cart/remove/:productId', protect, removeFromCart);
router.delete('/cart/clear', protect, clearCart);

export default router;
