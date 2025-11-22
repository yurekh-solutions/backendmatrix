import { Request, Response } from 'express';
import Product from '../models/Product';
import Category from '../models/Category';
import { AuthRequest } from '../middleware/auth';

// Supplier: Add new product
export const addProduct = async (req: AuthRequest, res: Response) => {
  try {
    const supplierId = req.supplier._id;
    const { name, category, subcategory, customCategory, customSubcategory, description } = req.body;

    // Handle image upload
    let imageUrl = '';
    if (req.file) {
      const apiUrl = process.env.API_URL || 'http://localhost:5000';
      imageUrl = `${apiUrl}/uploads/${req.file.filename}`;
    }

    // Handle custom category request
    if (customCategory) {
      const slug = customCategory.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const existingCategory = await Category.findOne({ slug });
      
      if (!existingCategory) {
        // Create new category request
        await Category.create({
          name: customCategory,
          slug,
          isCustom: true,
          requestedBy: supplierId,
          status: 'pending',
          isActive: false,
        });
      }
    }

    // Handle custom subcategory request
    if (customSubcategory && category) {
      const categoryDoc = await Category.findOne({ slug: category });
      if (categoryDoc) {
        const subSlug = customSubcategory.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        const existingSub = categoryDoc.subcategories.find((sub: any) => sub.slug === subSlug);
        
        if (!existingSub) {
          categoryDoc.subcategories.push({
            name: customSubcategory,
            slug: subSlug,
            isCustom: true,
            requestedBy: supplierId,
            status: 'pending',
            isActive: false,
          } as any);
          await categoryDoc.save();
        }
      }
    }

    const productData = {
      supplierId,
      name,
      category,
      subcategory,
      customCategory,
      customSubcategory,
      description,
      image: imageUrl,
      status: 'pending', // Admin approval required
    };

    const product = new Product(productData);
    await product.save();

    res.status(201).json({
      success: true,
      message: 'Product added successfully. Awaiting admin approval.',
      data: product,
    });
  } catch (error: any) {
    console.error('Add product error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to add product',
    });
  }
};

// Supplier: Get their products
export const getSupplierProducts = async (req: AuthRequest, res: Response) => {
  try {
    const supplierId = req.supplier._id;
    const products = await Product.find({ supplierId }).sort({ createdAt: -1 });

    // Convert relative image paths to absolute URLs
    const apiUrl = process.env.API_URL || 'http://localhost:5000';
    const productsWithFullImageUrls = products.map(product => {
      const productObj = product.toObject();
      if (productObj.image && !productObj.image.startsWith('http')) {
        // If it's a relative path, make it absolute
        productObj.image = `${apiUrl}${productObj.image}`;
      }
      return productObj;
    });

    res.json({
      success: true,
      data: productsWithFullImageUrls,
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

    // Convert relative image paths to absolute URLs
    const apiUrl = process.env.API_URL || 'http://localhost:5000';
    const productsWithFullImageUrls = products.map(product => {
      const productObj = product.toObject();
      if (productObj.image && !productObj.image.startsWith('http')) {
        productObj.image = `${apiUrl}${productObj.image}`;
      }
      return productObj;
    });

    res.json({
      success: true,
      data: productsWithFullImageUrls,
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

    // Convert relative image path to absolute URL
    const productObj = product.toObject();
    if (productObj.image && !productObj.image.startsWith('http')) {
      const apiUrl = process.env.API_URL || 'http://localhost:5000';
      productObj.image = `${apiUrl}${productObj.image}`;
    }

    res.json({
      success: true,
      data: productObj,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch product',
    });
  }
};
