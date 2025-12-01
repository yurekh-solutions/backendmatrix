import express from 'express';
import * as productController from '../controllers/productController';
import { supplierAuth } from '../middleware/auth';
import { upload, uploadProductImage } from '../config/multer';

const router = express.Router();

// Public routes
router.get('/public', productController.getAllProducts);
router.get('/public/:id', productController.getProductById);

// Supplier routes (protected) - Use uploadProductImage for product images
router.post('/', supplierAuth, uploadProductImage.single('productImage'), productController.addProduct);
router.get('/my-products', supplierAuth, productController.getSupplierProducts);
router.put('/:id', supplierAuth, uploadProductImage.single('productImage'), productController.updateProduct);
router.delete('/:id', supplierAuth, productController.deleteProduct);

export default router;
