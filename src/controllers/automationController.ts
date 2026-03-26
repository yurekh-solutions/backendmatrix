import { Request, Response } from 'express';
import AutoReply from '../models/AutoReply';
import Lead from '../models/Lead';
import OrderAutomation from '../models/OrderAutomation';
import Analytics from '../models/Analytics';
import Product from '../models/Product';
import MaterialInquiry from '../models/MaterialInquiry';
import RFQ from '../models/RFQ';
import Order from '../models/Order';
import Supplier from '../models/Supplier';
import { Types } from 'mongoose';

// Auto Reply Controllers
export const getAutoReplies = async (req: any, res: Response) => {
  try {
    const supplierId = req.supplier?.id || req.admin?.supplierId;
    if (!supplierId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    const autoReplies = await AutoReply.find({ supplierId });
    
    res.json({
      success: true,
      data: autoReplies
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch auto replies'
    });
  }
};

export const createAutoReply = async (req: any, res: Response) => {
  try {
    const supplierId = req.supplier?.id || req.admin?.supplierId;
    if (!supplierId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    const { messageType, responseText, triggerKeywords } = req.body;

    const autoReply = new AutoReply({
      supplierId,
      messageType,
      responseText,
      triggerKeywords: triggerKeywords || []
    });

    await autoReply.save();

    // Log analytics
    await Analytics.create({
      supplierId,
      metricType: 'auto-reply',
      value: 1,
      metadata: { action: 'created', messageType }
    });

    res.status(201).json({
      success: true,
      data: autoReply
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create auto reply'
    });
  }
};

export const updateAutoReply = async (req: any, res: Response) => {
  try {
    const supplierId = req.supplier?.id || req.admin?.supplierId;
    if (!supplierId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    const { id } = req.params;
    const { messageType, responseText, triggerKeywords, isActive } = req.body;

    const autoReply = await AutoReply.findOneAndUpdate(
      { _id: id, supplierId },
      { messageType, responseText, triggerKeywords, isActive },
      { new: true }
    );

    if (!autoReply) {
      return res.status(404).json({
        success: false,
        message: 'Auto reply not found'
      });
    }

    res.json({
      success: true,
      data: autoReply
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update auto reply'
    });
  }
};

export const deleteAutoReply = async (req: any, res: Response) => {
  try {
    const supplierId = req.supplier?.id || req.admin?.supplierId;
    if (!supplierId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    const { id } = req.params;

    const autoReply = await AutoReply.findOneAndDelete({ _id: id, supplierId });

    if (!autoReply) {
      return res.status(404).json({
        success: false,
        message: 'Auto reply not found'
      });
    }

    res.json({
      success: true,
      message: 'Auto reply deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete auto reply'
    });
  }
};

// Lead Controllers
export const getLeads = async (req: any, res: Response) => {
  try {
    const supplierId = req.supplier?.id || req.admin?.supplierId;
    if (!supplierId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { status, scoreMin, scoreMax } = req.query;
    const filter: any = { supplierId };

    if (status) filter.status = status;
    if (scoreMin || scoreMax) {
      filter.score = {};
      if (scoreMin) filter.score.$gte = parseInt(scoreMin);
      if (scoreMax) filter.score.$lte = parseInt(scoreMax);
    }

    // 1. Direct leads assigned to this supplier
    const directLeads = await Lead.find(filter).sort({ score: -1, createdAt: -1 });

    // 2. If supplier is approved, also pull MI + RFQ by category
    const supplier = await Supplier.findById(supplierId).select('productsOffered status');
    const mergedLeads: any[] = [...directLeads];

    if (supplier?.status === 'approved' && (supplier.productsOffered || []).length > 0) {
      const supplierCategories: string[] = (supplier.productsOffered || []).map((p: string) => p.toLowerCase());
      const categoryPatterns = supplierCategories.map((c: string) => new RegExp(c.replace(/[-/]/g, '.'), 'i'));

      // Material Inquiries matching category
      const miDocs = await MaterialInquiry.find({
        'materials.category': { $in: categoryPatterns }
      }).sort({ createdAt: -1 }).limit(100);

      for (const mi of miDocs) {
        const firstMat = (mi as any).materials?.[0];
        const budgetRaw = (mi as any).estimatedBudget || (mi as any).budget || 0;
        const budget = typeof budgetRaw === 'string'
          ? parseFloat(budgetRaw.replace(/[^0-9.]/g, '')) || 0
          : (budgetRaw || 0);
        const score = budget > 500000 ? 88 : budget > 100000 ? 72 : budget > 50000 ? 60 : 45;
        mergedLeads.push({
          _id: mi._id,
          company: (mi as any).companyName || 'Unknown Buyer',
          email: '(Protected by RitzYard)',
          phone: undefined,
          score,
          potential: budget,
          status: 'new',
          productInterest: firstMat?.name || firstMat?.category || 'Material Inquiry',
          inquiryCount: (mi as any).materials?.length || 1,
          sourceType: 'material_inquiry',
          inquiryNumber: (mi as any).inquiryNumber,
          createdAt: (mi as any).createdAt,
        });
      }

      // RFQs matching product category
      const rfqDocs = await RFQ.find({
        productCategory: { $in: categoryPatterns }
      }).sort({ createdAt: -1 }).limit(100);

      for (const rfq of rfqDocs) {
        const qty = (rfq as any).quantity || 0;
        const baseVal = qty * 1000;
        const score = baseVal > 500000 ? 85 : baseVal > 100000 ? 70 : 50;
        mergedLeads.push({
          _id: rfq._id,
          company: (rfq as any).companyName || 'Unknown Buyer',
          email: '(Protected by RitzYard)',
          phone: undefined,
          score,
          potential: baseVal,
          status: 'new',
          productInterest: (rfq as any).productName || (rfq as any).productCategory || 'RFQ',
          inquiryCount: 1,
          sourceType: 'rfq',
          inquiryNumber: (rfq as any).inquiryNumber,
          createdAt: (rfq as any).createdAt,
        });
      }
    }

    // Sort merged by score desc then date desc
    mergedLeads.sort((a, b) => (b.score - a.score) || (new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));

    res.json({
      success: true,
      leads: mergedLeads,
      data: mergedLeads,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch leads' });
  }
};

export const assignLead = async (req: any, res: Response) => {
  try {
    const supplierId = req.supplier?.id || req.admin?.supplierId;
    if (!supplierId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    const { id } = req.params;
    const { assignedTo } = req.body;

    const lead = await Lead.findOneAndUpdate(
      { _id: id, supplierId },
      { assignedTo, status: 'contacted' },
      { new: true }
    );

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: 'Lead not found'
      });
    }

    res.json({
      success: true,
      data: lead
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to assign lead'
    });
  }
};

// Order Automation Controllers
export const getOrders = async (req: any, res: Response) => {
  try {
    const supplierId = req.supplier?.id || req.admin?.supplierId;
    if (!supplierId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { status } = req.query;
    const filter: any = { supplierId };
    if (status) filter.status = status;

    // 1. OrderAutomation collection (legacy/automation-specific)
    const automationOrders = await OrderAutomation.find(filter).sort({ createdAt: -1 });

    // 2. Real Order model (admin-created orders linked to this supplier)
    const realOrderFilter: any = { supplierId };
    if (status) realOrderFilter.status = status;
    const realOrders = await Order.find(realOrderFilter).sort({ createdAt: -1 });

    // Normalize real orders to match the Order interface on the frontend
    const normalizedReal = realOrders.map((o: any) => ({
      _id: o._id,
      orderNumber: o._id.toString().slice(-6).toUpperCase(),
      customerName: o.customerName,
      buyerName: o.customerName,
      productName: o.productName,
      totalAmount: o.totalAmount,
      amount: o.totalAmount,
      status: o.status,
      paymentStatus: o.paymentStatus,
      quantity: o.quantity,
      unit: o.unit,
      createdAt: o.createdAt,
      source: 'order',
    }));

    // Merge and sort newest first, deduplicate by _id string
    const seen = new Set<string>();
    const merged: any[] = [];
    for (const o of [...automationOrders, ...normalizedReal]) {
      const key = o._id.toString();
      if (!seen.has(key)) {
        seen.add(key);
        merged.push(o);
      }
    }
    merged.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.json({
      success: true,
      orders: merged,
      data: merged,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch orders' });
  }
};

export const autoProcessOrder = async (req: any, res: Response) => {
  try {
    const supplierId = req.supplier?.id || req.admin?.supplierId;
    if (!supplierId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    const { id } = req.params;

    const order = await OrderAutomation.findOne({ _id: id, supplierId });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Simulate order processing steps
    const steps: {
      step: string;
      status: 'pending' | 'completed' | 'failed';
      timestamp: Date;
      details?: string;
    }[] = [
      { step: 'order-confirmation', status: 'completed', timestamp: new Date() },
      { step: 'invoice-generation', status: 'completed', timestamp: new Date(Date.now() + 1000) },
      { step: 'payment-processing', status: 'completed', timestamp: new Date(Date.now() + 2000) }
    ];

    order.automationSteps = steps;
    order.status = 'processing';
    await order.save();

    // Log analytics
    await Analytics.create({
      supplierId,
      metricType: 'order',
      value: 1,
      metadata: { action: 'auto-processed', orderId: order._id }
    });

    res.json({
      success: true,
      data: order
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to process order'
    });
  }
};

// Analytics Controllers
export const getPerformanceAnalytics = async (req: any, res: Response) => {
  try {
    const supplierId = req.supplier?.id || req.admin?.supplierId;
    if (!supplierId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    const { period = '30d' } = req.query;
    let days = 30;
    
    switch (period) {
      case '7d': days = 7; break;
      case '30d': days = 30; break;
      case '90d': days = 90; break;
      case '1y': days = 365; break;
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get analytics data
    const analyticsData = await Analytics.find({
      supplierId,
      timestamp: { $gte: startDate }
    }).sort({ timestamp: 1 });

    // Calculate metrics
    const responseTime = 2.3; // Mock value
    const conversionRate = 8.3; // Mock value
    const totalInquiries = analyticsData.filter(a => a.metricType === 'inquiry').length;
    const automationEfficiency = Math.min(100, Math.round((analyticsData.filter(a => a.metricType === 'auto-reply').length / Math.max(1, totalInquiries)) * 100));

    // Get supplier products for additional metrics
    const products = await Product.find({ supplierId });
    const supplierCount = 1; // This supplier
    const productCount = products.length;
    const ordersProcessed = analyticsData.filter(a => a.metricType === 'order').length;
    const emailsSent = analyticsData.filter(a => a.metricType === 'auto-reply').length;

    res.json({
      success: true,
      data: {
        responseTime,
        conversionRate,
        totalInquiries,
        automationEfficiency,
        supplierCount,
        productCount,
        ordersProcessed,
        emailsSent,
        trendData: analyticsData
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch analytics'
    });
  }
};

export const getAutomationStats = async (req: any, res: Response) => {
  try {
    const isAdmin = !!req.admin;
    const supplierId = req.supplier?.id || req.admin?.supplierId;

    // If called by admin panel (no supplierId), return global counts across all suppliers
    let autoReplyCount: number;
    let leadCount: number;
    let orderCount: number;
    let activeAutoReplies: number;
    let qualifiedLeads: number;
    let processedOrders: number;
    let realOrderCount: number;
    let productCount: number;
    let inventoryCount: number;

    if (isAdmin && !supplierId) {
      // Global admin: aggregate across all
      autoReplyCount = await AutoReply.countDocuments({});
      leadCount = await Lead.countDocuments({});
      orderCount = await OrderAutomation.countDocuments({});
      activeAutoReplies = await AutoReply.countDocuments({ isActive: true });
      qualifiedLeads = await Lead.countDocuments({ status: 'qualified' });
      processedOrders = await OrderAutomation.countDocuments({ status: { $in: ['shipped', 'delivered'] } });
      realOrderCount = await Order.countDocuments({});
      productCount = await Product.countDocuments({});
      inventoryCount = await Product.countDocuments({ stock: { $gt: 0 } });
    } else if (supplierId) {
      autoReplyCount = await AutoReply.countDocuments({ supplierId });
      leadCount = await Lead.countDocuments({ supplierId });
      orderCount = await OrderAutomation.countDocuments({ supplierId });
      activeAutoReplies = await AutoReply.countDocuments({ supplierId, isActive: true });
      qualifiedLeads = await Lead.countDocuments({ supplierId, status: 'qualified' });
      processedOrders = await OrderAutomation.countDocuments({ supplierId, status: { $in: ['shipped', 'delivered'] } });
      realOrderCount = await Order.countDocuments({ supplierId });
      productCount = await Product.countDocuments({ supplierId });
      inventoryCount = await Product.countDocuments({ supplierId, stock: { $gt: 0 } });
    } else {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const totalOrders = orderCount + realOrderCount;

    res.json({
      success: true,
      data: {
        // flat keys for frontend (BusinessAutomationSuite)
        autoReplies: autoReplyCount,
        leadScores: leadCount,
        ordersProcessed: totalOrders,
        emailsSent: activeAutoReplies,
        responseTime: autoReplyCount > 0 ? '<1hr' : '--',
        conversionRate: leadCount > 0 ? `${Math.round((qualifiedLeads / leadCount) * 100)}%` : '0%',
        // detailed nested
        totalAutoReplies: autoReplyCount,
        totalLeads: leadCount,
        totalOrders: totalOrders,
        productCount,
        inventoryCount,
        stats: {
          autoReplies: { total: autoReplyCount, active: activeAutoReplies },
          leads: { total: leadCount, qualified: qualifiedLeads },
          orders: { total: totalOrders, processed: processedOrders },
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch automation stats'
    });
  }
};

// Admin: Smart Inventory stats
export const getAdminInventoryStats = async (req: any, res: Response) => {
  try {
    const totalProducts = await Product.countDocuments({});
    const inStock = await Product.countDocuments({ stock: { $gt: 0 } });
    const lowStock = await Product.countDocuments({ stock: { $gt: 0, $lte: 10 } });
    const outOfStock = await Product.countDocuments({ stock: 0 });
    const approvedProducts = await Product.countDocuments({ status: 'approved' });

    res.json({
      success: true,
      data: {
        totalProducts,
        inStock,
        lowStock,
        outOfStock,
        approvedProducts,
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch inventory stats' });
  }
};

// Admin: Price Optimizer stats
export const getAdminPricingStats = async (req: any, res: Response) => {
  try {
    const totalProducts = await Product.countDocuments({});
    const pricedProducts = await Product.countDocuments({ price: { $gt: 0 } });
    const suppliersWithProducts = await Product.distinct('supplierId');

    res.json({
      success: true,
      data: {
        totalProducts,
        pricedProducts,
        suppliersCount: suppliersWithProducts.length,
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch pricing stats' });
  }
};

// Admin: System Health
export const getSystemHealth = async (req: any, res: Response) => {
  try {
    const totalOrders = await Order.countDocuments({});
    const pendingOrders = await Order.countDocuments({ status: 'pending' });
    const totalLeads = await Lead.countDocuments({});
    const totalAutoReplies = await AutoReply.countDocuments({});
    const activeAutoReplies = await AutoReply.countDocuments({ isActive: true });
    const totalSuppliers = await Supplier.countDocuments({});
    const approvedSuppliers = await Supplier.countDocuments({ status: 'approved' });

    res.json({
      success: true,
      data: {
        totalOrders,
        pendingOrders,
        totalLeads,
        totalAutoReplies,
        activeAutoReplies,
        totalSuppliers,
        approvedSuppliers,
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch system health' });
  }
};

// Tool usage tracking
export const recordToolClick = async (req: any, res: Response) => {
  try {
    const supplierId = req.supplier?._id || req.admin?._id;
    console.log('🚀 recordToolClick - supplierId:', supplierId);
    if (!supplierId) {
      console.log('❌ recordToolClick - No supplierId found');
      return res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    const { toolName, toolType, description } = req.body;
    console.log('📋 Recording tool click:', { toolName, toolType, description });

    // Log analytics
    await Analytics.create({
      supplierId,
      metricType: 'tool-usage',
      value: 1,
      metadata: { toolName, toolType, description }
    });

    console.log('✅ Tool usage recorded successfully');
    res.json({
      success: true,
      message: 'Tool usage recorded'
    });
  } catch (error: any) {
    console.error('❌ recordToolClick error:', error.message, error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to record tool usage',
      error: error.message
    });
  }
};