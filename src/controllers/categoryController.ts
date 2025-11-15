import { Request, Response } from 'express';
import Category from '../models/Category';
import { AuthRequest } from '../middleware/auth';

// Get all approved categories (Public + Supplier)
export const getCategories = async (req: Request, res: Response) => {
  try {
    const categories = await Category.find({ 
      status: 'approved',
      isActive: true 
    }).select('name slug icon subcategories').sort({ name: 1 });

    // Filter approved subcategories
    const filteredCategories = categories.map(cat => {
      const categoryObj = cat.toObject();
      categoryObj.subcategories = categoryObj.subcategories.filter(
        (sub: any) => sub.status === 'approved' && sub.isActive
      );
      return categoryObj;
    });

    res.json({
      success: true,
      data: filteredCategories,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch categories',
    });
  }
};

// Supplier: Request new category
export const requestCategory = async (req: AuthRequest, res: Response) => {
  try {
    const { name, icon } = req.body;
    const supplierId = req.supplier._id;

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    // Check if category already exists
    const existing = await Category.findOne({ slug });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Category already exists or pending approval',
      });
    }

    const category = new Category({
      name,
      slug,
      icon: icon || '📦',
      isCustom: true,
      requestedBy: supplierId,
      status: 'pending',
    });

    await category.save();

    res.status(201).json({
      success: true,
      message: 'Category request submitted for admin approval',
      data: category,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to request category',
    });
  }
};

// Supplier: Request new subcategory
export const requestSubcategory = async (req: AuthRequest, res: Response) => {
  try {
    const { categoryId, name } = req.body;
    const supplierId = req.supplier._id;

    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found',
      });
    }

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    // Check if subcategory already exists
    const existing = category.subcategories.find((sub: any) => sub.slug === slug);
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Subcategory already exists',
      });
    }

    category.subcategories.push({
      name,
      slug,
      isCustom: true,
      requestedBy: supplierId,
      status: 'pending',
      isActive: false, // Will be activated after approval
    } as any);

    await category.save();

    res.status(201).json({
      success: true,
      message: 'Subcategory request submitted for admin approval',
      data: category,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to request subcategory',
    });
  }
};

// Admin: Get all categories (including pending)
export const getAllCategoriesAdmin = async (req: Request, res: Response) => {
  try {
    const categories = await Category.find()
      .populate('requestedBy', 'companyName email')
      .populate('approvedBy', 'username')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: categories,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch categories',
    });
  }
};

// Admin: Approve category
export const approveCategory = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const adminId = req.admin._id;

    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found',
      });
    }

    category.status = 'approved';
    category.isActive = true;
    category.approvedBy = adminId;
    await category.save();

    res.json({
      success: true,
      message: 'Category approved successfully',
      data: category,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to approve category',
    });
  }
};

// Admin: Reject category
export const rejectCategory = async (req: any, res: Response) => {
  try {
    const { id } = req.params;

    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found',
      });
    }

    category.status = 'rejected';
    await category.save();

    res.json({
      success: true,
      message: 'Category rejected',
      data: category,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to reject category',
    });
  }
};

// Admin: Approve subcategory
export const approveSubcategory = async (req: any, res: Response) => {
  try {
    const { categoryId, subcategoryId } = req.params;
    const adminId = req.admin._id;

    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found',
      });
    }

    const subcategory = category.subcategories.find((sub: any) => sub._id?.toString() === subcategoryId);
    if (!subcategory) {
      return res.status(404).json({
        success: false,
        message: 'Subcategory not found',
      });
    }

    subcategory.status = 'approved';
    subcategory.isActive = true;
    subcategory.approvedBy = adminId;
    await category.save();

    res.json({
      success: true,
      message: 'Subcategory approved successfully',
      data: category,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to approve subcategory',
    });
  }
};

// Admin: Reject subcategory
export const rejectSubcategory = async (req: any, res: Response) => {
  try {
    const { categoryId, subcategoryId } = req.params;

    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found',
      });
    }

    const subcategory = category.subcategories.find((sub: any) => sub._id?.toString() === subcategoryId);
    if (!subcategory) {
      return res.status(404).json({
        success: false,
        message: 'Subcategory not found',
      });
    }

    subcategory.status = 'rejected';
    await category.save();

    res.json({
      success: true,
      message: 'Subcategory rejected',
      data: category,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to reject subcategory',
    });
  }
};

// Admin: Add default category
export const addDefaultCategory = async (req: any, res: Response) => {
  try {
    const { name, icon, subcategories } = req.body;
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    const category = new Category({
      name,
      slug,
      icon: icon || '📦',
      isCustom: false,
      status: 'approved',
      isActive: true,
      approvedBy: req.admin._id,
      subcategories: subcategories?.map((sub: string) => ({
        name: sub,
        slug: sub.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        isCustom: false,
        status: 'approved',
        isActive: true,
      })) || [],
    });

    await category.save();

    res.status(201).json({
      success: true,
      message: 'Category added successfully',
      data: category,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to add category',
    });
  }
};
