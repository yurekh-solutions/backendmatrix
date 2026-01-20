import express from 'express';
import {
  getUserProfile,
  updateUserProfile,
  uploadProfilePicture,
  getUserCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
} from '../controllers/userController';
import { protect } from '../middleware/auth';
import { uploadImages } from '../config/multer';

const router = express.Router();

// Profile routes - using uploadImages for Cloudinary storage
router.get('/profile', protect, getUserProfile);
router.put('/profile', protect, uploadImages.any(), updateUserProfile);
router.post('/profile-picture', protect, uploadImages.any(), uploadProfilePicture);

// Cart routes
router.get('/cart', protect, getUserCart);
router.post('/cart/add', protect, addToCart);
router.put('/cart/update', protect, updateCartItem);
router.delete('/cart/remove/:productId', protect, removeFromCart);
router.delete('/cart/clear', protect, clearCart);

export default router;
