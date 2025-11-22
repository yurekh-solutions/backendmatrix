import { Request, Response } from 'express';
import AutoReply from '../models/AutoReply';
import Lead from '../models/Lead';
import OrderAutomation from '../models/OrderAutomation';
import Analytics from '../models/Analytics';
import Product from '../models/Product';
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
      return res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    const { status, scoreMin, scoreMax } = req.query;
    const filter: any = { supplierId };

    if (status) filter.status = status;
    if (scoreMin || scoreMax) {
      filter.score = {};
      if (scoreMin) filter.score.$gte = parseInt(scoreMin);
      if (scoreMax) filter.score.$lte = parseInt(scoreMax);
    }

    const leads = await Lead.find(filter).sort({ score: -1, createdAt: -1 });
    
    res.json({
      success: true,
      data: leads
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch leads'
    });
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
      return res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    const { status } = req.query;
    const filter: any = { supplierId };

    if (status) filter.status = status;

    const orders = await OrderAutomation.find(filter).sort({ createdAt: -1 });
    
    res.json({
      success: true,
      data: orders
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch orders'
    });
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
    const supplierId = req.supplier?.id || req.admin?.supplierId;
    if (!supplierId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    // Get counts
    const autoReplyCount = await AutoReply.countDocuments({ supplierId });
    const leadCount = await Lead.countDocuments({ supplierId });
    const orderCount = await OrderAutomation.countDocuments({ supplierId });
    
    // Get active items
    const activeAutoReplies = await AutoReply.countDocuments({ supplierId, isActive: true });
    const qualifiedLeads = await Lead.countDocuments({ supplierId, status: 'qualified' });
    const processedOrders = await OrderAutomation.countDocuments({ supplierId, status: { $in: ['shipped', 'delivered'] } });

    res.json({
      success: true,
      data: {
        autoReplies: {
          total: autoReplyCount,
          active: activeAutoReplies
        },
        leads: {
          total: leadCount,
          qualified: qualifiedLeads
        },
        orders: {
          total: orderCount,
          processed: processedOrders
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

// Tool usage tracking
export const recordToolClick = async (req: any, res: Response) => {
  try {
    const supplierId = req.supplier?.id || req.admin?.supplierId;
    if (!supplierId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    const { toolName, toolType, description } = req.body;

    // Log analytics
    await Analytics.create({
      supplierId,
      metricType: 'tool-usage',
      value: 1,
      metadata: { toolName, toolType, description }
    });

    res.json({
      success: true,
      message: 'Tool usage recorded'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to record tool usage'
    });
  }
};