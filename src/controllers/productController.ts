import { Request, Response } from 'express';
import Product from '../models/Product';
import { AuthRequest } from '../middleware/auth';

// Supplier: Add new product
export const addProduct = async (req: AuthRequest, res: Response) => {
  try {
    const supplierId = req.supplier._id;
    const productData = {
      ...req.body,
      supplierId,
      status: 'pending', // Admin approval required
    };

    const product = new Product(productData);
    await product.save();

    res.status(201).json({
      success: true,
      message: 'Product added successfully. Awaiting admin approval.',
      data: product,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to add product',
    });
  }
};

// Supplier: Get their products
export const getSupplierProducts = async (req: AuthRequest, res: Response) => {
  try {
    const supplierId = req.supplier._id;
    const products = await Product.find({ supplierId }).sort({ createdAt: -1 });

    res.json({
      success: true,
      data: products,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch products',
    });
  }
};

// Supplier: Update product
export const updateProduct = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const supplierId = req.supplier._id;

    const product = await Product.findOne({ _id: id, supplierId });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    Object.assign(product, req.body);
    product.status = 'pending'; // Re-approval needed after edit
    await product.save();

    res.json({
      success: true,
      message: 'Product updated successfully',
      data: product,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update product',
    });
  }
};

// Supplier: Delete product
export const deleteProduct = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const supplierId = req.supplier._id;

    const product = await Product.findOneAndDelete({ _id: id, supplierId });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    res.json({
      success: true,
      message: 'Product deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete product',
    });
  }
};

// Public: Get all active products
export const getAllProducts = async (req: any, res: Response) => {
  try {
    const { category, search } = req.query;
    const query: Record<string, unknown> = { status: 'active' };

    if (category) {
      query.category = category;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const products = await Product.find(query)
      .populate('supplierId', 'companyName email phone')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: products,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch products',
    });
  }
};

// Public: Get product by ID
export const getProductById = async (req: any, res: Response) => {
  try {
    const { id } = req.params;

    const product = await Product.findOne({ _id: id, status: 'active' })
      .populate('supplierId', 'companyName email phone');

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    res.json({
      success: true,
      data: product,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch product',
    });
  }
};
