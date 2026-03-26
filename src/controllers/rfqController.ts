import { Request, Response } from 'express';
import RFQ from '../models/RFQ';
import { AuthRequest } from '../middleware/auth';
import { notifyRFQViaWhatsApp, sendRFQToWhatsApp } from '../utils/whatsappService';
import { routeInquiryToSuppliers } from '../services/inquiryRoutingService';

// Customer: Submit RFQ
export const submitRFQ = async (req: Request, res: Response) => {
  try {
    const { customerName, company, location, email, phone, items, totalItems } = req.body;

    // Validate required fields
    if (!customerName || !email || !phone || !items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: customerName, email, phone, items'
      });
    }

    // Create RFQ for each item in the cart
    const rfqs = await Promise.all(
      items.map(item => {
        const rfq = new RFQ({
          customerName,
          email,
          phone,
          company,
          deliveryLocation: location,
          productCategory: item.category,
          productName: item.productName,
          quantity: item.quantity,
          unit: 'MT', // Default unit for metal/materials
          status: 'pending'
        });
        return rfq.save();
      })
    );

    // Send WhatsApp notification
    try {
      const whatsappNotification = await notifyRFQViaWhatsApp({
        customerName,
        email,
        phone,
        company: company || undefined,
        location: location || undefined,
        items: items.map(item => ({
          productName: item.productName,
          category: item.category,
          brand: item.brand || 'Standard',
          grade: item.grade || 'Standard',
          quantity: item.quantity,
        })),
      });
      console.log('✅ WhatsApp notification sent for RFQ');
    } catch (whatsappError) {
      console.error('⚠️  WhatsApp notification error (non-blocking):', whatsappError);
      // Continue - don't fail RFQ submission due to WhatsApp error
    }

    // Route RFQ to matching suppliers (fire and forget)
    (async () => {
      try {
        console.log('\n🚀 Routing RFQ to matching suppliers...');
        // Convert RFQ items to material format for routing
        const materials = items.map(item => ({
          materialName: item.productName,
          category: item.category || 'General',
          quantity: item.quantity || 1,
          unit: 'MT'
        }));

        const routingResult = await routeInquiryToSuppliers({
          inquiryId: rfqs[0]._id.toString(),
          inquiryNumber: rfqs[0].inquiryNumber,
          customerName,
          companyName: company,
          email,
          phone,
          materials,
          deliveryLocation: location || 'India',
          totalEstimatedValue: undefined,
        });
        console.log('✅ RFQ routing complete:', routingResult);
      } catch (routingError: any) {
        console.error('⚠️  RFQ routing error (background task, non-blocking):', routingError.message);
      }
    })(); // FIRE AND FORGET

    res.status(201).json({
      success: true,
      message: `RFQ submitted successfully for ${rfqs.length} product(s). We will contact you soon via WhatsApp.`,
      data: rfqs,
      rfqNumber: rfqs[0]?.inquiryNumber || null,
    });
  } catch (error: any) {
    console.error('❌ RFQ submission error:', error.message, error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit RFQ: ' + error.message,
    });
  }
};

// Customer: Get RFQs by email
export const getCustomerRFQs = async (req: Request, res: Response) => {
  try {
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required',
      });
    }

    const rfqs = await RFQ.find({ email })
      .populate('assignedSupplier', 'companyName phone email')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: rfqs,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch RFQs',
    });
  }
};

// Supplier: Get assigned RFQs
export const getSupplierRFQs = async (req: AuthRequest, res: Response) => {
  try {
    const supplierId = req.supplier._id;

    const rfqs = await RFQ.find({ assignedSupplier: supplierId })
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: rfqs,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch RFQs',
    });
  }
};

// Supplier: Respond to RFQ
export const respondToRFQ = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const supplierId = req.supplier._id;
    const { quotedPrice, notes } = req.body;

    const rfq = await RFQ.findOne({ _id: id, assignedSupplier: supplierId });

    if (!rfq) {
      return res.status(404).json({
        success: false,
        message: 'RFQ not found',
      });
    }

    rfq.supplierResponse = {
      supplierId,
      quotedPrice,
      quotedDate: new Date(),
      notes,
    };
    rfq.status = 'quoted';
    await rfq.save();

    res.json({
      success: true,
      message: 'Quote submitted successfully',
      data: rfq,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to submit quote',
    });
  }
};

// Admin: Get all RFQs
export const getAllRFQs = async (req: Request, res: Response) => {
  try {
    const rfqs = await RFQ.find()
      .populate('assignedSupplier', 'companyName phone email')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: rfqs.length,
      data: rfqs,
    });
  } catch (error: any) {
    console.error('❌ Error fetching RFQs:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch RFQs',
    });
  }
};

// Admin: Approve RFQ
export const approveRFQ = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const rfq = await RFQ.findById(id);

    if (!rfq) {
      return res.status(404).json({
        success: false,
        message: 'RFQ not found',
      });
    }

    if (rfq.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'RFQ is not in pending status',
      });
    }

    rfq.status = 'accepted';
    await rfq.save();

    // TODO: Send WhatsApp notification to customer

    res.json({
      success: true,
      message: 'RFQ approved successfully',
      data: rfq,
    });
  } catch (error: any) {
    console.error('❌ Error approving RFQ:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to approve RFQ',
    });
  }
};

// Admin: Reject RFQ
export const rejectRFQ = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const rfq = await RFQ.findById(id);

    if (!rfq) {
      return res.status(404).json({
        success: false,
        message: 'RFQ not found',
      });
    }

    if (rfq.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'RFQ is not in pending status',
      });
    }

    rfq.status = 'rejected';
    if (reason) {
      rfq.adminNotes = reason;
    }
    await rfq.save();

    // TODO: Send WhatsApp notification to customer

    res.json({
      success: true,
      message: 'RFQ rejected successfully',
      data: rfq,
    });
  } catch (error: any) {
    console.error('❌ Error rejecting RFQ:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to reject RFQ',
    });
  }
};

// Public: Track RFQ by email + inquiry number (buyer tracking)
export const trackRFQ = async (req: Request, res: Response) => {
  try {
    const { email, inquiryNumber } = req.query;

    if (!email || !inquiryNumber) {
      return res.status(400).json({
        success: false,
        message: 'Email and inquiry number are required',
      });
    }

    const rfq = await RFQ.findOne({
      email: (email as string).toLowerCase().trim(),
      inquiryNumber: inquiryNumber as string,
    }).populate('assignedSupplier', 'companyName');

    if (!rfq) {
      return res.status(404).json({
        success: false,
        message: 'Inquiry not found. Please check your email and inquiry number.',
      });
    }

    // Build safe supplier quote if exists
    const supplierQuotes = [];
    if (rfq.supplierResponse?.quotedPrice) {
      const supplierName = (rfq.assignedSupplier as any)?.companyName || 'RitzYard Verified Supplier';
      supplierQuotes.push({
        supplierName,
        quotedPrice: rfq.supplierResponse.quotedPrice,
        notes: rfq.supplierResponse.notes,
        quotedDate: rfq.supplierResponse.quotedDate,
        status: rfq.status,
      });
    }

    res.json({
      success: true,
      data: {
        inquiryNumber: rfq.inquiryNumber,
        customerName: rfq.customerName,
        status: rfq.status === 'pending' ? 'new' : rfq.status,
        priority: 'normal',
        materials: [{
          materialName: rfq.productName,
          category: rfq.productCategory,
          quantity: rfq.quantity,
          unit: rfq.unit,
        }],
        deliveryLocation: rfq.deliveryLocation,
        createdAt: rfq.createdAt,
        updatedAt: rfq.updatedAt,
        supplierQuotes,
        ritzYardWhatsApp: 'https://wa.me/919136242706?text=' + encodeURIComponent(`Hi RitzYard, I want to follow up on inquiry #${rfq.inquiryNumber}`),
      },
    });
  } catch (error: any) {
    console.error('❌ Error tracking RFQ:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch inquiry',
    });
  }
};

export const deleteRFQ = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const rfq = await RFQ.findByIdAndDelete(id);

    if (!rfq) {
      return res.status(404).json({
        success: false,
        message: 'RFQ not found',
      });
    }

    res.json({
      success: true,
      message: 'RFQ deleted successfully',
    });
  } catch (error: any) {
    console.error('❌ Error deleting RFQ:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to delete RFQ',
    });
  }
};