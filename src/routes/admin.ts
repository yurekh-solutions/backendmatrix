import express from 'express';
import {
  getPendingSuppliers,
  getAllSuppliers,
  getSupplierById,
  approveSupplier,
  rejectSupplier,
  getStatistics,
  getAllProducts,
  approveProduct,
  rejectProduct
} from '../controllers/adminController';
import {
  getAutoReplies,
  createAutoReply,
  updateAutoReply,
  deleteAutoReply,
  getLeads,
  assignLead,
  getOrders,
  autoProcessOrder,
  getPerformanceAnalytics,
  getAutomationStats,
  getAdminInventoryStats,
  getAdminPricingStats,
  getSystemHealth,
} from '../controllers/automationController';
import { getAllRFQs, approveRFQ, rejectRFQ, deleteRFQ } from '../controllers/rfqController';
import { authenticateAdmin } from '../middleware/auth';
import Lead from '../models/Lead';
import { generateWhatsAppWebURL } from '../utils/whatsappService';

const RITZYARD_ADMIN_PHONE = process.env.RITZYARD_ADMIN_PHONE || '919136242706';

const router = express.Router();

// All routes require admin authentication
router.use(authenticateAdmin);

router.get('/suppliers/pending', getPendingSuppliers);
router.get('/suppliers', getAllSuppliers);
router.get('/suppliers/:id', getSupplierById);
router.put('/suppliers/:id/approve', approveSupplier);
router.put('/suppliers/:id/reject', rejectSupplier);
router.get('/statistics', getStatistics);

// Product routes
router.get('/products', getAllProducts);
router.put('/products/:id/approve', approveProduct);
router.put('/products/:id/reject', rejectProduct);

// Automation routes
router.get('/automation/stats', getAutomationStats);
router.get('/automation/auto-replies', getAutoReplies);
router.post('/automation/auto-replies', createAutoReply);
router.put('/automation/auto-replies/:id', updateAutoReply);
router.delete('/automation/auto-replies/:id', deleteAutoReply);

router.get('/automation/leads', getLeads);
router.post('/automation/leads/:id/assign', assignLead);

router.get('/automation/orders', getOrders);
router.post('/automation/orders/:id/auto-process', autoProcessOrder);

router.get('/automation/metrics', getPerformanceAnalytics);
router.get('/automation/inventory', getAdminInventoryStats);
router.get('/automation/pricing', getAdminPricingStats);
router.get('/automation/health', getSystemHealth);

// RFQ routes
router.get('/rfqs', getAllRFQs);
router.put('/rfqs/:id/approve', approveRFQ);
router.put('/rfqs/:id/reject', rejectRFQ);
router.delete('/rfqs/:id', deleteRFQ);

// Pending Quotes - admin reviews supplier quotes before buyer sees them
router.get('/leads', async (req: any, res: any) => {
  try {
    const { quoteStatus } = req.query;
    const query: any = {};
    if (quoteStatus) query.quoteStatus = quoteStatus;
    const leads = await Lead.find(query)
      .populate('supplierId', 'companyName email phone')
      .sort({ createdAt: -1 })
      .limit(200);
    const formatted = leads.map((l: any) => ({
      _id: l._id,
      name: l.name,
      email: l.email,
      company: l.company,
      message: l.message,
      score: l.score,
      status: l.status,
      quoteStatus: l.quoteStatus,
      quotedPrice: l.quotedPrice,
      quoteMessage: l.quoteMessage,
      inquiryRef: l.inquiryRef,
      supplierName: l.supplierId?.companyName || 'Unknown Supplier',
      supplierEmail: l.supplierId?.email,
      createdAt: l.createdAt,
      updatedAt: l.updatedAt,
    }));
    res.json({ success: true, leads: formatted, count: formatted.length });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/leads/:id/approve-quote', async (req: any, res: any) => {
  try {
    const lead = await Lead.findById(req.params.id).populate('supplierId', 'companyName');
    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });
    (lead as any).quoteStatus = 'approved';
    lead.status = 'qualified';
    await lead.save();
    // Log WhatsApp URL to notify buyer (admin will copy and send)
    const buyerMsg = `Hi ${lead.name}, your inquiry has received a quote from ${(lead as any).supplierId?.companyName || 'a verified supplier'} on RitzYard. Please check your inquiry status at ritzyard.com/track-inquiry`;
    const waUrl = generateWhatsAppWebURL(RITZYARD_ADMIN_PHONE, buyerMsg);
    console.log('\uD83D\uDCF2 Buyer notification URL (copy to WhatsApp):', waUrl.substring(0, 100));
    res.json({ success: true, message: 'Quote approved', whatsappUrl: waUrl });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/leads/:id/reject-quote', async (req: any, res: any) => {
  try {
    const lead = await Lead.findById(req.params.id);
    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });
    (lead as any).quoteStatus = 'rejected';
    await lead.save();
    res.json({ success: true, message: 'Quote rejected. Supplier will be asked to revise.' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
