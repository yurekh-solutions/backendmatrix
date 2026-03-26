import express from 'express';
import MaterialInquiry from '../models/MaterialInquiry';
import RFQ from '../models/RFQ';
import { protect } from '../middleware/auth';

const router = express.Router();

/**
 * GET /api/buyer/inquiries
 * Returns all Material Inquiries + RFQs for the logged-in buyer (by email from JWT).
 * Auth: buyer JWT (protect middleware)
 */
router.get('/inquiries', protect, async (req: any, res) => {
  try {
    const email = req.user?.email?.toLowerCase().trim();
    if (!email) {
      return res.status(400).json({ success: false, message: 'User email not found' });
    }

    // Fetch all MIs and RFQs by this buyer's email in parallel
    const [miDocs, rfqDocs] = await Promise.all([
      MaterialInquiry.find({ email }).sort({ createdAt: -1 }).lean(),
      RFQ.find({ email }).sort({ createdAt: -1 }).lean(),
    ]);

    // Shape MIs
    const materialInquiries = miDocs.map((mi: any) => {
      const firstMat = mi.materials?.[0] || {};
      return {
        _id: mi._id,
        inquiryNumber: mi.inquiryNumber,
        type: 'MI',
        productName: firstMat.materialName || 'Material Inquiry',
        category: firstMat.category || 'General',
        quantity: firstMat.quantity || 0,
        unit: firstMat.unit || 'units',
        deliveryLocation: mi.deliveryLocation || '',
        status: mi.status || 'new',
        chatThreadId: mi.inquiryNumber,
        createdAt: mi.createdAt,
        supplierQuotes: mi.supplierQuotes || [],
      };
    });

    // Shape RFQs
    const rfqInquiries = rfqDocs.map((rfq: any) => ({
      _id: rfq._id,
      inquiryNumber: rfq.inquiryNumber,
      type: 'RFQ',
      productName: rfq.productName || rfq.productCategory || 'RFQ',
      category: rfq.productCategory || 'General',
      quantity: rfq.quantity || 0,
      unit: rfq.unit || 'MT',
      deliveryLocation: rfq.deliveryLocation || '',
      status: rfq.status === 'pending' ? 'new' : rfq.status,
      chatThreadId: rfq.inquiryNumber,
      createdAt: rfq.createdAt,
      supplierQuotes: rfq.supplierResponse?.quotedPrice ? [{
        quotedPrice: rfq.supplierResponse.quotedPrice,
        notes: rfq.supplierResponse.notes,
        status: rfq.status,
      }] : [],
    }));

    // Merge and sort by date
    const all = [...materialInquiries, ...rfqInquiries]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return res.json({
      success: true,
      email,
      count: all.length,
      inquiries: all,
    });
  } catch (error: any) {
    console.error('❌ buyer/inquiries error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to fetch inquiries' });
  }
});

export default router;
