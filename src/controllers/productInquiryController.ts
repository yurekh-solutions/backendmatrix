import { Request, Response } from 'express';
import ProductInquiry from '../models/ProductInquiry';

// Create a new product inquiry
export const createProductInquiry = async (req: Request, res: Response): Promise<void> => {
  try {
    const { productName, customerName, phone, email, quantity, specifications } = req.body;

    console.log('📝 Creating product inquiry:', { productName, customerName, phone });

    // Validation
    if (!productName || !customerName || !phone) {
      res.status(400).json({
        success: false,
        message: 'Product name, customer name, and phone are required',
      });
      return;
    }

    // Create new product inquiry
    const inquiry = new ProductInquiry({
      productName,
      customerName,
      phone,
      email: email || undefined,
      quantity: quantity || undefined,
      specifications: specifications || undefined,
      status: 'new',
      priority: 'medium',
    });

    await inquiry.save();

    console.log('✅ Product inquiry created:', inquiry.inquiryNumber);

    res.status(201).json({
      success: true,
      message: 'Product inquiry submitted successfully',
      data: inquiry,
    });
  } catch (error: any) {
    console.error('❌ Error creating product inquiry:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to submit product inquiry',
      error: error.message,
    });
  }
};

// Get all product inquiries for admin
export const getAllProductInquiries = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('📊 Fetching all product inquiries');

    const inquiries = await ProductInquiry.find()
      .sort({ createdAt: -1 })
      .limit(1000);

    // Calculate statistics
    const stats = {
      total: inquiries.length,
      new: inquiries.filter((i) => i.status === 'new').length,
      contacted: inquiries.filter((i) => i.status === 'contacted').length,
      quoted: inquiries.filter((i) => i.status === 'quoted').length,
      converted: inquiries.filter((i) => i.status === 'converted').length,
      closed: inquiries.filter((i) => i.status === 'closed').length,
      urgent: inquiries.filter((i) => i.priority === 'urgent').length,
      high: inquiries.filter((i) => i.priority === 'high').length,
    };

    console.log(`✅ Found ${inquiries.length} product inquiries`);

    res.json({
      success: true,
      data: inquiries,
      stats,
      count: inquiries.length,
    });
  } catch (error: any) {
    console.error('❌ Error fetching product inquiries:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch product inquiries',
      error: error.message,
    });
  }
};

// Update product inquiry status
export const updateProductInquiryStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    console.log(`📝 Updating product inquiry ${id} status to:`, status);

    const inquiry = await ProductInquiry.findByIdAndUpdate(
      id,
      { status, lastActivityDate: new Date() },
      { new: true }
    );

    if (!inquiry) {
      res.status(404).json({
        success: false,
        message: 'Product inquiry not found',
      });
      return;
    }

    console.log('✅ Product inquiry status updated');

    res.json({
      success: true,
      message: 'Product inquiry status updated',
      data: inquiry,
    });
  } catch (error: any) {
    console.error('❌ Error updating product inquiry status:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to update product inquiry status',
      error: error.message,
    });
  }
};

// Delete product inquiry
export const deleteProductInquiry = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    console.log(`🗑️ Deleting product inquiry:`, id);

    const inquiry = await ProductInquiry.findByIdAndDelete(id);

    if (!inquiry) {
      res.status(404).json({
        success: false,
        message: 'Product inquiry not found',
      });
      return;
    }

    console.log('✅ Product inquiry deleted');

    res.json({
      success: true,
      message: 'Product inquiry deleted successfully',
    });
  } catch (error: any) {
    console.error('❌ Error deleting product inquiry:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to delete product inquiry',
      error: error.message,
    });
  }
};

// Update product inquiry details
export const updateProductInquiry = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updates = req.body;

    console.log(`📝 Updating product inquiry ${id}:`, updates);

    const inquiry = await ProductInquiry.findByIdAndUpdate(
      id,
      { ...updates, lastActivityDate: new Date() },
      { new: true, runValidators: true }
    );

    if (!inquiry) {
      res.status(404).json({
        success: false,
        message: 'Product inquiry not found',
      });
      return;
    }

    console.log('✅ Product inquiry updated');

    res.json({
      success: true,
      message: 'Product inquiry updated successfully',
      data: inquiry,
    });
  } catch (error: any) {
    console.error('❌ Error updating product inquiry:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to update product inquiry',
      error: error.message,
    });
  }
};
