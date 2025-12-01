import { Request, Response } from 'express';
import Product from '../models/Product';
import Category from '../models/Category';
import { AuthRequest } from '../middleware/auth';

/**
 * Sanitize image URLs by removing filesystem paths
 * Converts paths like /opt/render/project/src/uploads/image.jpg to /uploads/image.jpg
 */
const sanitizeImagePath = (imagePath: string): string => {
  if (!imagePath) return '';
  
  // If it's already a full URL, return as-is
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }
  
  // Remove filesystem path prefix if present
  // Match patterns like /opt/render/project/src/ or similar paths
  if (imagePath.includes('/uploads/')) {
    // Extract just the /uploads/... part
    const uploadsIndex = imagePath.indexOf('/uploads/');
    return imagePath.substring(uploadsIndex);
  }
  
  return imagePath;
};

// Supplier: Add new product
export const addProduct = async (req: AuthRequest, res: Response) => {
  try {
    const supplierId = req.supplier._id;
    const { 
      name, 
      category, 
      subcategory, 
      customCategory, 
      customSubcategory, 
      description,
      // Additional fields from frontend
      features,
      pricing,
      moq,
      leadTime,
      materialStandard,
      packaging,
      testingCertificate,
      brands,
      grades,
      delivery,
      quality,
      availability
    } = req.body;

    // Validate required fields
    if (!name || !category || !description) {
      return res.status(400).json({
        success: false,
        message: 'Name, category, and description are required',
      });
    }

    // Handle image upload from Cloudinary
    let imageUrl = '';
    if (req.file) {
      try {
        console.log('📸 Image file received:', {
          fieldname: (req.file as any).fieldname,
          originalname: (req.file as any).originalname,
          mimetype: (req.file as any).mimetype,
          size: (req.file as any).size,
          path: (req.file as any).path,
          filename: (req.file as any).filename,
          secure_url: (req.file as any).secure_url, // Cloudinary secure URL
          cloudinary: (req.file as any).cloudinary,
        });
        // Cloudinary returns URLs in different possible locations
        // Try multiple sources to ensure we get the URL
        imageUrl = (req.file as any).path || 
                   (req.file as any).secure_url || 
                   (req.file as any).url || '';
        
        // If still no URL but we have filename, construct it
        if (!imageUrl && (req.file as any).filename) {
          const apiUrl = process.env.API_URL || 'http://localhost:5000';
          imageUrl = `${apiUrl}/uploads/${(req.file as any).filename}`;
        }
        
        // Log the final URL
        console.log('✅ Final image URL:', imageUrl);
        
        // If we still don't have a URL, log error but continue
        if (!imageUrl) {
          console.warn('⚠️  Warning: Image uploaded but URL could not be extracted');
        }
      } catch (error) {
        console.warn('Image upload processing failed, continuing without image:', error);
        // Don't fail the entire product submission if image upload fails
        imageUrl = '';
      }
    } else {
      console.warn('⚠️ No image file received in request');
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

    // Parse JSON fields if they're strings
    let parsedFeatures = [];
    let parsedBrands = [];
    let parsedGrades = [];
    
    try {
      parsedFeatures = typeof features === 'string' ? JSON.parse(features) : (features || []);
    } catch (e) {
      parsedFeatures = [];
    }
    
    try {
      parsedBrands = typeof brands === 'string' ? JSON.parse(brands) : (brands || []);
    } catch (e) {
      parsedBrands = [];
    }
    
    try {
      parsedGrades = typeof grades === 'string' ? JSON.parse(grades) : (grades || []);
    } catch (e) {
      parsedGrades = [];
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
      features: parsedFeatures,
      applications: parsedFeatures, // Use features as applications too
      specifications: {
        materialStandard: materialStandard || '',
        packaging: packaging || '',
        testingCertificate: testingCertificate || '',
        brand: parsedBrands,
        grades: parsedGrades,
        delivery: delivery || '',
        quality: quality || '',
        availability: availability || '',
      },
      price: pricing ? {
        amount: parseFloat(pricing) || 0,
        currency: 'INR',
        unit: 'unit',
      } : {
        amount: 0,
        currency: 'INR',
        unit: 'unit',
      },
      stock: {
        available: true,
        quantity: moq ? parseInt(moq) : 0,
        minimumOrder: moq ? parseInt(moq) : 0,
        reserved: 0,
        lastUpdated: new Date(),
      },
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

    // No need to modify Cloudinary URLs - they're already absolute
    // Only convert old relative paths if they exist
    const apiUrl = process.env.API_URL || 'http://localhost:5000';
    const productsWithFullImageUrls = products.map(product => {
      const productObj = product.toObject();
      
      // Ensure image field exists (even if empty)
      if (!productObj.image) {
        productObj.image = ''; // Set empty string instead of undefined
      } else if (!productObj.image.startsWith('http')) {
        // If it's a relative path (old upload), make it absolute
        productObj.image = `${apiUrl}${productObj.image}`;
      }
      // Cloudinary URLs already start with https:// so they pass through unchanged
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
      
      // Ensure image field exists (even if empty)
      if (!productObj.image) {
        productObj.image = ''; // Set empty string instead of undefined
      } else {
        // First sanitize the image path (remove filesystem paths)
        const cleanPath = sanitizeImagePath(productObj.image);
        // Then ensure it's absolute
        if (!cleanPath.startsWith('http')) {
          productObj.image = `${apiUrl}${cleanPath.startsWith('/') ? '' : '/'}${cleanPath}`;
        } else {
          productObj.image = cleanPath;
        }
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
    
    // Ensure image field exists (even if empty)
    if (!productObj.image) {
      productObj.image = ''; // Set empty string instead of undefined
    } else {
      // First sanitize the image path (remove filesystem paths)
      const cleanPath = sanitizeImagePath(productObj.image);
      // Then ensure it's absolute
      if (!cleanPath.startsWith('http')) {
        const apiUrl = process.env.API_URL || 'http://localhost:5000';
        productObj.image = `${apiUrl}${cleanPath.startsWith('/') ? '' : '/'}${cleanPath}`;
      } else {
        productObj.image = cleanPath;
      }
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
