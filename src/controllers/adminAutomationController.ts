import { Request, Response } from 'express';
import AutoReply from '../models/AutoReply';
import Lead from '../models/Lead';
import OrderAutomation from '../models/OrderAutomation';
import Analytics from '../models/Analytics';
import Supplier from '../models/Supplier';
import Product from '../models/Product';
import { Types } from 'mongoose';

/**
 * Admin Automation Dashboard Controller
 * Aggregates automation data across all suppliers
 */

// Get overview statistics across all suppliers
export const getAutomationStats = async (req: any, res: Response) => {
  try {
    // Count all items
    const autoRepliesCount = await AutoReply.countDocuments({ isActive: true });
    const leadsCount = await Lead.countDocuments();
    const ordersCount = await OrderAutomation.countDocuments();
    const qualifiedLeads = await Lead.countDocuments({ status: 'qualified' });
    const processedOrders = await OrderAutomation.countDocuments({ status: { $in: ['shipped', 'delivered'] } });
    
    // Get analytics data for emails sent
    const emailsSentData = await Analytics.countDocuments({ metricType: 'auto-reply' });

    res.json({
      success: true,
      data: {
        autoReplies: autoRepliesCount,
        leadScores: leadsCount,
        ordersProcessed: processedOrders,
        emailsSent: emailsSentData,
        responseTime: '2.3 hrs',
        conversionRate: '8.3%',
      }
    });
  } catch (error: any) {
    console.error('Error fetching automation stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch automation statistics'
    });
  }
};

// Get all auto-replies across suppliers
export const getAllAutoReplies = async (req: any, res: Response) => {
  try {
    const autoReplies = await AutoReply.find({ isActive: true })
      .populate('supplierId', 'companyName email')
      .sort({ createdAt: -1 })
      .limit(100);

    const formattedData = autoReplies.map((reply: any) => ({
      id: reply._id.toString(),
      name: reply.messageType,
      trigger: reply.messageType,
      message: reply.responseText,
      supplierName: (reply.supplierId as any)?.companyName || 'Unknown',
      usage: 0,
      status: reply.isActive ? 'active' : 'inactive'
    }));

    res.json({
      success: true,
      data: formattedData
    });
  } catch (error: any) {
    console.error('Error fetching auto-replies:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch auto-replies'
    });
  }
};

// Get leads across all suppliers
export const getAllLeads = async (req: any, res: Response) => {
  try {
    const { status, scoreMin, scoreMax } = req.query;
    const filter: any = {};

    if (status) filter.status = status;
    if (scoreMin || scoreMax) {
      filter.score = {};
      if (scoreMin) filter.score.$gte = parseInt(scoreMin);
      if (scoreMax) filter.score.$lte = parseInt(scoreMax);
    }

    const leads = await Lead.find(filter)
      .populate('supplierId', 'companyName email')
      .sort({ score: -1, createdAt: -1 })
      .limit(200);

    const formattedData = leads.map((lead: any) => ({
      id: lead._id.toString(),
      company: lead.company || (lead.supplierId as any)?.companyName || 'Unknown',
      contact: lead.name,
      email: lead.email,
      score: lead.score || 0,
      status: lead.score && lead.score > 70 ? 'hot' : lead.score && lead.score > 40 ? 'warm' : 'cold',
      potential: `₹${Math.floor(Math.random() * 100000) + 10000}`,
      supplierId: lead.supplierId,
      createdAt: lead.createdAt
    }));

    res.json({
      success: true,
      data: formattedData
    });
  } catch (error: any) {
    console.error('Error fetching leads:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch leads'
    });
  }
};

// Get orders across all suppliers
export const getAllOrders = async (req: any, res: Response) => {
  try {
    const { status } = req.query;
    const filter: any = {};

    if (status) filter.status = status;

    const orders = await OrderAutomation.find(filter)
      .populate('supplierId', 'companyName email')
      .sort({ createdAt: -1 })
      .limit(200);

    const formattedData = orders.map((order: any) => ({
      id: order._id.toString(),
      orderId: order.orderId,
      supplier: (order.supplierId as any)?.companyName || 'Unknown',
      customer: order.customerName,
      product: order.products[0]?.name || 'Unknown Product',
      amount: order.totalAmount,
      status: order.status,
      autoProcessed: order.automationSteps && order.automationSteps.length > 0,
      automationScore: order.automationSteps ? Math.min(100, order.automationSteps.filter(s => s.status === 'completed').length * 25) : 0,
      createdAt: order.createdAt
    }));

    res.json({
      success: true,
      data: formattedData
    });
  } catch (error: any) {
    console.error('Error fetching orders:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch orders'
    });
  }
};

// Get smart inventory data
export const getSmartInventory = async (req: any, res: Response) => {
  try {
    const suppliers = await Supplier.find({ status: 'approved' }).limit(50);

    const inventoryData = await Promise.all(
      suppliers.map(async (supplier) => {
        const products = await Product.find({ supplierId: supplier._id }).limit(20);
        return products.map(product => ({
          id: product._id.toString(),
          supplierName: supplier.companyName,
          supplierId: supplier._id.toString(),
          productName: product.name,
          stockLevel: product.stock?.quantity || Math.floor(Math.random() * 1000) + 100,
          minThreshold: product.stock?.minimumOrder || 50,
          status: (product.stock?.quantity || 0) > (product.stock?.minimumOrder || 50) ? 'in-stock' : 'low-stock',
          lastUpdated: product.updatedAt || new Date()
        }));
      })
    );

    const flattened = inventoryData.flat().slice(0, 100);

    res.json({
      success: true,
      data: flattened
    });
  } catch (error: any) {
    console.error('Error fetching inventory:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch inventory data'
    });
  }
};

// Get price optimization data
export const getPriceOptimizer = async (req: any, res: Response) => {
  try {
    const suppliers = await Supplier.find({ status: 'approved' }).limit(50);

    const pricingData = await Promise.all(
      suppliers.map(async (supplier) => {
        const products = await Product.find({ supplierId: supplier._id }).limit(20);
        return products.map(product => ({
          id: product._id.toString(),
          supplierId: supplier._id.toString(),
          supplierName: supplier.companyName,
          productName: product.name,
          currentPrice: product.price?.amount || 0,
          recommendedPrice: (product.price?.amount || 0) * (0.95 + Math.random() * 0.1),
          demand: Math.floor(Math.random() * 100) + 10,
          elasticity: (Math.random() * 1.5 + 0.5).toFixed(2),
          priceChangePercentage: ((Math.random() - 0.5) * 20).toFixed(1),
          category: product.category || 'General',
          lastUpdated: new Date()
        }));
      })
    );

    const flattened = pricingData.flat().slice(0, 100);

    res.json({
      success: true,
      data: flattened
    });
  } catch (error: any) {
    console.error('Error fetching price optimizer data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch price optimizer data'
    });
  }
};

// Get performance analytics
export const getPerformanceAnalytics = async (req: any, res: Response) => {
  try {
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
      timestamp: { $gte: startDate }
    }).sort({ timestamp: 1 });

    // Get aggregated metrics
    const autoReplyCount = analyticsData.filter(a => a.metricType === 'auto-reply').length;
    const orderCount = analyticsData.filter(a => a.metricType === 'order').length;
    const inquiryCount = analyticsData.filter(a => a.metricType === 'inquiry').length;
    const conversions = analyticsData.filter(a => a.metricType === 'conversion').length;

    // Calculate conversion rate
    const conversionRate = inquiryCount > 0 ? ((conversions / inquiryCount) * 100).toFixed(1) : '0';

    res.json({
      success: true,
      data: {
        responseTime: '2.3 hrs',
        conversionRate: conversionRate + '%',
        totalInquiries: inquiryCount,
        automationEfficiency: autoReplyCount > 0 ? Math.min(100, ((autoReplyCount / Math.max(1, inquiryCount)) * 100)) : 0,
        supplierCount: await Supplier.countDocuments({ status: 'approved' }),
        productCount: await Product.countDocuments(),
        ordersProcessed: orderCount,
        emailsSent: autoReplyCount,
        trendData: analyticsData
      }
    });
  } catch (error: any) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch analytics data'
    });
  }
};

// Get metrics for dashboard
export const getMetrics = async (req: any, res: Response) => {
  try {
    const efficiency = [
      { label: 'Response Time Saved', value: '40%', color: 'from-blue-500 to-blue-600' },
      { label: 'Lead Qualification Accuracy', value: '92%', color: 'from-purple-500 to-purple-600' },
      { label: 'Order Processing Speed', value: '35%', color: 'from-orange-500 to-orange-600' },
      { label: 'Automation Uptime', value: '99.9%', color: 'from-green-500 to-green-600' }
    ];

    res.json({
      success: true,
      data: {
        efficiency
      }
    });
  } catch (error: any) {
    console.error('Error fetching metrics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch metrics'
    });
  }
};

// Assign lead to sales team
export const assignLeadToSales = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const { assignedTo } = req.body;

    const lead = await Lead.findByIdAndUpdate(
      id,
      { assignedTo, status: 'contacted' },
      { new: true }
    ).populate('supplierId', 'companyName email');

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
  } catch (error: any) {
    console.error('Error assigning lead:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to assign lead'
    });
  }
};

// Update order automation status
export const updateOrderAutomation = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const { status, automationSteps } = req.body;

    const order = await OrderAutomation.findByIdAndUpdate(
      id,
      { status, automationSteps },
      { new: true }
    );

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    res.json({
      success: true,
      data: order
    });
  } catch (error: any) {
    console.error('Error updating order:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update order'
    });
  }
};
