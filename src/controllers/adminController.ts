import { Request, Response } from 'express';
import Supplier from '../models/Supplier';
import Product from '../models/Product';
import { sendEmail } from '../config/email';
import { approvalEmailTemplate, rejectionEmailTemplate } from '../utils/emailTemplates';

interface AuthRequest extends Request {
  admin?: any;
}

export const getPendingSuppliers = async (req: AuthRequest, res: Response) => {
  try {
    const suppliers = await Supplier.find({ status: 'pending' })
      .sort({ submittedAt: -1 })
      .select('-password');
    
    res.json({
      success: true,
      count: suppliers.length,
      data: suppliers
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getAllSuppliers = async (req: AuthRequest, res: Response) => {
  try {
    const { status, search, page = 1, limit = 10 } = req.query;
    
    const query: any = {};
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { companyName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    
    const suppliers = await Supplier.find(query)
      .sort({ submittedAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit))
      .select('-password');
    
    const total = await Supplier.countDocuments(query);
    
    res.json({
      success: true,
      data: suppliers,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getSupplierById = async (req: AuthRequest, res: Response) => {
  try {
    const supplier = await Supplier.findById(req.params.id).select('-password');
    
    if (!supplier) {
      return res.status(404).json({ success: false, message: 'Supplier not found' });
    }
    
    res.json({ success: true, data: supplier });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const approveSupplier = async (req: AuthRequest, res: Response) => {
  try {
    console.log('Approve request received for ID:', req.params.id);
    console.log('Admin from token:', req.admin);
    
    const supplier = await Supplier.findById(req.params.id);
    
    if (!supplier) {
      return res.status(404).json({ success: false, message: 'Supplier not found' });
    }
    
    if (supplier.status === 'approved') {
      return res.status(400).json({ success: false, message: 'Supplier already approved' });
    }
    
    supplier.status = 'approved';
    if (req.admin) {
      supplier.reviewedBy = req.admin._id || req.admin.id;
    }
    supplier.reviewedAt = new Date();
    supplier.rejectionReason = undefined;
    
    await supplier.save();
    
    // Send approval email
    try {
      const setupPasswordUrl = `${process.env.FRONTEND_URL || 'http://localhost:8081'}/supplier/login`;
      const emailHtml = approvalEmailTemplate(supplier.companyName, setupPasswordUrl);
      await sendEmail(supplier.email, 'Supplier Application Approved - Setup Your Account', emailHtml);
    } catch (emailError) {
      console.error('Failed to send approval email:', emailError);
      // Don't fail the approval if email fails
    }
    
    res.json({
      success: true,
      message: 'Supplier approved successfully',
      data: supplier
    });
  } catch (error: any) {
    console.error('Error approving supplier:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const rejectSupplier = async (req: AuthRequest, res: Response) => {
  try {
    const { reason } = req.body;
    
    if (!reason || reason.trim() === '') {
      return res.status(400).json({ success: false, message: 'Rejection reason is required' });
    }
    
    const supplier = await Supplier.findById(req.params.id);
    
    if (!supplier) {
      return res.status(404).json({ success: false, message: 'Supplier not found' });
    }
    
    supplier.status = 'rejected';
    supplier.rejectionReason = reason;
    if (req.admin) {
      supplier.reviewedBy = req.admin._id || req.admin.id;
    }
    supplier.reviewedAt = new Date();
    
    await supplier.save();
    
    // Send rejection email
    try {
      const reapplyUrl = `${process.env.FRONTEND_URL || 'http://localhost:8081'}/supplier/onboarding`;
      const emailHtml = rejectionEmailTemplate(supplier.companyName, reason, reapplyUrl);
      await sendEmail(supplier.email, 'Supplier Application Update', emailHtml);
    } catch (emailError) {
      console.error('Failed to send rejection email:', emailError);
      // Don't fail the rejection if email fails
    }
    
    res.json({
      success: true,
      message: 'Supplier rejected',
      data: supplier
    });
  } catch (error: any) {
    console.error('Error rejecting supplier:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getStatistics = async (req: AuthRequest, res: Response) => {
  try {
    const [pending, approved, rejected, total] = await Promise.all([
      Supplier.countDocuments({ status: 'pending' }),
      Supplier.countDocuments({ status: 'approved' }),
      Supplier.countDocuments({ status: 'rejected' }),
      Supplier.countDocuments()
    ]);
    
    res.json({
      success: true,
      data: {
        pending,
        approved,
        rejected,
        total
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ========== PRODUCT MANAGEMENT ==========

export const getAllProducts = async (req: AuthRequest, res: Response) => {
  try {
    const { status, search, page = 1, limit = 50 } = req.query;
    
    const query: any = {};
    if (status && status !== 'all') query.status = status;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } }
      ];
    }
    
    const products = await Product.find(query)
      .populate('supplierId', 'companyName email')
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));
    
    const total = await Product.countDocuments(query);
    
    res.json({
      success: true,
      data: products,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const approveProduct = async (req: AuthRequest, res: Response) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    
    product.status = 'active';
    await product.save();
    
    res.json({
      success: true,
      message: 'Product approved successfully',
      data: product
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const rejectProduct = async (req: AuthRequest, res: Response) => {
  try {
    const { reason } = req.body;
    
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    
    product.status = 'rejected';
    await product.save();
    
    res.json({
      success: true,
      message: 'Product rejected',
      data: product
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
