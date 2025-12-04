import { Request, Response } from 'express';
import MaterialInquiry from '../models/MaterialInquiry';
import { AuthRequest } from '../middleware/auth';
import Supplier from '../models/Supplier';
import { notifyMaterialInquiryViaWhatsApp } from '../utils/whatsappService';

// Public: Submit a new material inquiry (bulk order)
export const submitMaterialInquiry = async (req: Request, res: Response) => {
  try {
    const {
      customerName,
      companyName,
      email,
      phone,
      materials,
      deliveryLocation,
      deliveryAddress,
      totalEstimatedValue,
      paymentTerms,
      additionalRequirements,
    } = req.body;

    // Validate required fields
    if (!customerName || !email || !phone || !materials || materials.length === 0 || !deliveryLocation) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: customerName, email, phone, materials, deliveryLocation',
      });
    }

    // Process and validate materials - ADD DEFAULTS FOR OPTIONAL FIELDS
    const processedMaterials = materials.map((material: any) => ({
      materialName: material.materialName?.trim() || '',
      category: material.category?.trim() || 'General', // DEFAULT IF MISSING
      grade: material.grade?.trim(),
      specification: material.specification?.trim(),
      quantity: Number(material.quantity) || 0,
      unit: material.unit?.trim() || 'MT',
      targetPrice: material.targetPrice ? Number(material.targetPrice) : undefined,
    }));

    // Validate processed materials
    if (processedMaterials.some(m => !m.materialName || m.quantity <= 0)) {
      return res.status(400).json({
        success: false,
        message: 'Each material must have a name and quantity greater than 0',
      });
    }

    // Create new material inquiry with cleaned data
    const inquiry = new MaterialInquiry({
      customerName: customerName.trim(),
      companyName: companyName?.trim(),
      email: email.toLowerCase().trim(),
      phone: phone.trim(),
      materials: processedMaterials,
      deliveryLocation: deliveryLocation.trim(),
      deliveryAddress: deliveryAddress?.trim(),
      totalEstimatedValue: totalEstimatedValue ? Number(totalEstimatedValue) : undefined,
      paymentTerms: paymentTerms?.trim(),
      additionalRequirements: additionalRequirements?.trim(),
      status: 'new',
      priority: (totalEstimatedValue && Number(totalEstimatedValue) > 1000000) ? 'high' : 'medium',
    });

    // SAVE WITH ERROR HANDLING
    let savedInquiry;
    try {
      savedInquiry = await inquiry.save();
    } catch (saveError: any) {
      console.error('\n' + '='.repeat(60));
      console.error('❌ FAILED TO SAVE MATERIAL INQUIRY');
      console.error('='.repeat(60));
      console.error('Error Message:', saveError.message);
      if (saveError.errors) {
        Object.keys(saveError.errors).forEach(field => {
          console.error(`  Field "${field}":`, saveError.errors[field].message);
        });
      }
      console.error('='.repeat(60) + '\n');
      throw saveError;
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ MATERIAL INQUIRY SUCCESSFULLY SAVED!');
    console.log('='.repeat(60));
    console.log('📋 Inquiry #:', savedInquiry.inquiryNumber);
    console.log('👤 Customer:', savedInquiry.customerName);
    console.log('📧 Email:', savedInquiry.email);
    console.log('📍 Location:', savedInquiry.deliveryLocation);
    console.log('📦 Materials:', savedInquiry.materials.length);
    console.log('🆔 Database ID:', savedInquiry._id);
    console.log('='.repeat(60) + '\n');

    // Send WhatsApp notification (completely non-blocking - fire and forget)
    // This should NEVER block the database save
    (async () => {
      try {
        console.log('\n🚀 Sending WhatsApp notification in background...');
        const whatsappNotification = await notifyMaterialInquiryViaWhatsApp({
          inquiryNumber: savedInquiry.inquiryNumber!,
          customerName,
          companyName,
          email,
          phone,
          materials: processedMaterials,
          deliveryLocation,
          totalEstimatedValue: totalEstimatedValue ? Number(totalEstimatedValue) : undefined,
          additionalRequirements,
        });
        console.log('✅ WhatsApp notification sent successfully');
        console.log('📲 WhatsApp URL:', whatsappNotification.whatsappUrl);
        console.log('Recommendation: Copy URL above and open in browser to send message\n');
      } catch (whatsappError: any) {
        console.error('⚠️  WhatsApp notification error (background task, non-blocking):', whatsappError.message);
        console.log('Note: Inquiry was saved successfully despite WhatsApp error\n');
      }
    })(); // FIRE AND FORGET - don't await

    res.status(201).json({
      success: true,
      message: `Material inquiry submitted successfully. Inquiry Number: ${savedInquiry.inquiryNumber}`,
      data: savedInquiry.toObject(),
    });
  } catch (error: any) {
    console.error('\n' + '='.repeat(60));
    console.error('❌ MATERIAL INQUIRY SUBMISSION ERROR');
    console.error('='.repeat(60));
    console.error('Error Message:', error.message);
    console.error('Error Code:', error.code);
    if (error.errors) {
      console.error('Validation Errors:', error.errors);
    }
    console.error('Stack:', error.stack?.split('\n').slice(0, 3).join('\n'));
    console.error('='.repeat(60) + '\n');
    
    res.status(500).json({
      success: false,
      message: 'Failed to submit material inquiry: ' + error.message,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// Public: Get inquiries by customer email
export const getCustomerInquiries = async (req: Request, res: Response) => {
  try {
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required',
      });
    }

    const inquiries = await MaterialInquiry.find({ email })
      .populate('assignedTo', 'username email')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: inquiries.length,
      data: inquiries,
    });
  } catch (error: any) {
    console.error('❌ Error fetching customer inquiries:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch inquiries',
    });
  }
};

// Admin: Get all material inquiries with filters
export const getAllMaterialInquiries = async (req: Request, res: Response) => {
  try {
    const { status, priority, search, limit = 100 } = req.query;
    
    let query: any = {};

    if (status) {
      query.status = status;
    }

    if (priority) {
      query.priority = priority;
    }

    if (search) {
      query.$or = [
        { inquiryNumber: { $regex: search, $options: 'i' } },
        { customerName: { $regex: search, $options: 'i' } },
        { companyName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }

    const inquiries = await MaterialInquiry.find(query)
      .populate('assignedTo', 'username email')
      .populate('supplierQuotes.supplierId', 'companyName email phone')
      .sort({ priority: 1, createdAt: -1 })
      .limit(parseInt(limit as string));

    // Get statistics
    const stats = {
      total: await MaterialInquiry.countDocuments(),
      new: await MaterialInquiry.countDocuments({ status: 'new' }),
      under_review: await MaterialInquiry.countDocuments({ status: 'under_review' }),
      quoted: await MaterialInquiry.countDocuments({ status: 'quoted' }),
      negotiating: await MaterialInquiry.countDocuments({ status: 'negotiating' }),
      accepted: await MaterialInquiry.countDocuments({ status: 'accepted' }),
      completed: await MaterialInquiry.countDocuments({ status: 'completed' }),
      urgent: await MaterialInquiry.countDocuments({ priority: 'urgent' }),
      high: await MaterialInquiry.countDocuments({ priority: 'high' }),
    };

    res.json({
      success: true,
      count: inquiries.length,
      stats,
      data: inquiries,
    });
  } catch (error: any) {
    console.error('❌ Error fetching material inquiries:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch material inquiries',
    });
  }
};

// Admin: Get single inquiry by ID
export const getMaterialInquiryById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const inquiry = await MaterialInquiry.findById(id)
      .populate('assignedTo', 'username email')
      .populate('supplierQuotes.supplierId', 'companyName email phone');

    if (!inquiry) {
      return res.status(404).json({
        success: false,
        message: 'Material inquiry not found',
      });
    }

    res.json({
      success: true,
      data: inquiry,
    });
  } catch (error: any) {
    console.error('❌ Error fetching inquiry:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch inquiry',
    });
  }
};

// Admin: Update inquiry status
export const updateInquiryStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status, adminNotes, internalNotes, priority } = req.body;

    const inquiry = await MaterialInquiry.findById(id);

    if (!inquiry) {
      return res.status(404).json({
        success: false,
        message: 'Material inquiry not found',
      });
    }

    if (status) inquiry.status = status;
    if (adminNotes !== undefined) inquiry.adminNotes = adminNotes;
    if (internalNotes !== undefined) inquiry.internalNotes = internalNotes;
    if (priority) inquiry.priority = priority;

    await inquiry.save();

    res.json({
      success: true,
      message: 'Inquiry updated successfully',
      data: inquiry,
    });
  } catch (error: any) {
    console.error('❌ Error updating inquiry:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to update inquiry',
    });
  }
};

// Admin: Assign inquiry to admin
export const assignInquiry = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { assignedTo } = req.body;

    const inquiry = await MaterialInquiry.findById(id);

    if (!inquiry) {
      return res.status(404).json({
        success: false,
        message: 'Material inquiry not found',
      });
    }

    inquiry.assignedTo = assignedTo;
    inquiry.status = 'under_review';
    await inquiry.save();

    res.json({
      success: true,
      message: 'Inquiry assigned successfully',
      data: inquiry,
    });
  } catch (error: any) {
    console.error('❌ Error assigning inquiry:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to assign inquiry',
    });
  }
};

// Admin: Add supplier quote to inquiry
export const addSupplierQuote = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { supplierId, supplierName, quotedPrice, validUntil, notes } = req.body;

    if (!supplierId || !supplierName || !quotedPrice) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: supplierId, supplierName, quotedPrice',
      });
    }

    const inquiry = await MaterialInquiry.findById(id);

    if (!inquiry) {
      return res.status(404).json({
        success: false,
        message: 'Material inquiry not found',
      });
    }

    // Initialize supplierQuotes array if it doesn't exist
    if (!inquiry.supplierQuotes) {
      inquiry.supplierQuotes = [];
    }

    // Add new quote
    inquiry.supplierQuotes.push({
      supplierId,
      supplierName,
      quotedPrice,
      quotedDate: new Date(),
      validUntil: validUntil ? new Date(validUntil) : undefined,
      notes,
      status: 'pending',
    });

    inquiry.status = 'quoted';
    await inquiry.save();

    res.json({
      success: true,
      message: 'Supplier quote added successfully',
      data: inquiry,
    });
  } catch (error: any) {
    console.error('❌ Error adding supplier quote:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to add supplier quote',
    });
  }
};

// Admin: Update supplier quote status
export const updateQuoteStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { id, quoteId } = req.params;
    const { status } = req.body;

    const inquiry = await MaterialInquiry.findById(id);

    if (!inquiry) {
      return res.status(404).json({
        success: false,
        message: 'Material inquiry not found',
      });
    }

    const quote = inquiry.supplierQuotes?.find(
      (q: any) => q._id.toString() === quoteId
    );

    if (!quote) {
      return res.status(404).json({
        success: false,
        message: 'Quote not found',
      });
    }

    quote.status = status;

    if (status === 'accepted') {
      inquiry.status = 'accepted';
      // Set all other quotes as rejected
      inquiry.supplierQuotes?.forEach((q: any) => {
        if (q._id.toString() !== quoteId && q.status === 'pending') {
          q.status = 'rejected';
        }
      });
    }

    await inquiry.save();

    res.json({
      success: true,
      message: 'Quote status updated successfully',
      data: inquiry,
    });
  } catch (error: any) {
    console.error('❌ Error updating quote status:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to update quote status',
    });
  }
};

// Admin: Delete inquiry
export const deleteMaterialInquiry = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const inquiry = await MaterialInquiry.findByIdAndDelete(id);

    if (!inquiry) {
      return res.status(404).json({
        success: false,
        message: 'Material inquiry not found',
      });
    }

    res.json({
      success: true,
      message: 'Material inquiry deleted successfully',
    });
  } catch (error: any) {
    console.error('❌ Error deleting inquiry:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to delete inquiry',
    });
  }
};

// Admin: Bulk update inquiries
export const bulkUpdateInquiries = async (req: AuthRequest, res: Response) => {
  try {
    const { inquiryIds, updates } = req.body;

    if (!inquiryIds || !Array.isArray(inquiryIds) || inquiryIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid inquiry IDs',
      });
    }

    const result = await MaterialInquiry.updateMany(
      { _id: { $in: inquiryIds } },
      { $set: updates }
    );

    res.json({
      success: true,
      message: `${result.modifiedCount} inquiries updated successfully`,
      data: result,
    });
  } catch (error: any) {
    console.error('❌ Error bulk updating inquiries:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to bulk update inquiries',
    });
  }
};

// Get inquiry statistics
export const getInquiryStatistics = async (req: Request, res: Response) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const stats = {
      total: await MaterialInquiry.countDocuments(),
      today: await MaterialInquiry.countDocuments({ createdAt: { $gte: today } }),
      thisMonth: await MaterialInquiry.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
      byStatus: {
        new: await MaterialInquiry.countDocuments({ status: 'new' }),
        under_review: await MaterialInquiry.countDocuments({ status: 'under_review' }),
        quoted: await MaterialInquiry.countDocuments({ status: 'quoted' }),
        negotiating: await MaterialInquiry.countDocuments({ status: 'negotiating' }),
        accepted: await MaterialInquiry.countDocuments({ status: 'accepted' }),
        rejected: await MaterialInquiry.countDocuments({ status: 'rejected' }),
        completed: await MaterialInquiry.countDocuments({ status: 'completed' }),
        cancelled: await MaterialInquiry.countDocuments({ status: 'cancelled' }),
      },
      byPriority: {
        low: await MaterialInquiry.countDocuments({ priority: 'low' }),
        medium: await MaterialInquiry.countDocuments({ priority: 'medium' }),
        high: await MaterialInquiry.countDocuments({ priority: 'high' }),
        urgent: await MaterialInquiry.countDocuments({ priority: 'urgent' }),
      },
    };

    res.json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    console.error('❌ Error fetching statistics:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics',
    });
  }
};
