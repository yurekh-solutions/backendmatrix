import express from 'express';
import * as productController from '../controllers/productController';
import { supplierAuth } from '../middleware/auth';
import { upload } from '../config/multer';

const router = express.Router();

// Public routes
router.get('/public', productController.getAllProducts);
router.get('/public/:id', productController.getProductById);

// Supplier routes (protected)
router.post('/', supplierAuth, upload.single('productImage'), productController.addProduct);
router.get('/my-products', supplierAuth, productController.getSupplierProducts);
router.put('/:id', supplierAuth, upload.single('productImage'), productController.updateProduct);
router.delete('/:id', supplierAuth, productController.deleteProduct);

export default router;
