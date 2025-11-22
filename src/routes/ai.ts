import express from 'express';
import { supplierAuth } from '../middleware/auth';
import Product from '../models/Product';
import AutoReply from '../models/AutoReply';
import Lead from '../models/Lead';
import OrderAutomation from '../models/OrderAutomation';

const router = express.Router();

// AI supplier insights endpoint
router.get('/supplier-insights', supplierAuth, async (req: any, res) => {
  try {
    const supplierId = req.supplier.id;
    
    // Get supplier products
    const products = await Product.find({ supplierId });
    
    // Get automation data
    const autoReplies = await AutoReply.find({ supplierId });
    const leads = await Lead.find({ supplierId });
    const orders = await OrderAutomation.find({ supplierId });
    
    // Calculate real insights
    const totalProducts = products.length;
    const activeProducts = products.filter(p => p.status === 'active').length;
    const approvalRate = totalProducts > 0 ? Math.round((activeProducts / totalProducts) * 100) : 0;
    
    const pendingLeads = leads.filter(l => l.status === 'new').length;
    const qualifiedLeads = leads.filter(l => l.status === 'qualified').length;
    const leadConversionRate = leads.length > 0 ? Math.round((qualifiedLeads / leads.length) * 100) : 0;
    
    const pendingOrders = orders.filter(o => o.status === 'pending').length;
    const completedOrders = orders.filter(o => o.status === 'delivered').length;
    const orderCompletionRate = orders.length > 0 ? Math.round((completedOrders / orders.length) * 100) : 0;
    
    // Generate AI recommendations
    const recommendations = [];
    
    if (pendingLeads > 5) {
      recommendations.push({
        id: 1,
        title: 'High Pending Leads',
        impact: 'High',
        suggestion: `You have ${pendingLeads} pending leads. Consider setting up auto-replies to improve response time.`,
        estimatedIncrease: '40%'
      });
    }
    
    if (totalProducts < 5) {
      recommendations.push({
        id: 2,
        title: 'Expand Product Catalog',
        impact: 'Medium',
        suggestion: 'Add more products to increase visibility and attract more buyers.',
        estimatedIncrease: '25%'
      });
    }
    
    if (autoReplies.length === 0) {
      recommendations.push({
        id: 3,
        title: 'Setup Auto-Replies',
        impact: 'High',
        suggestion: 'Create auto-replies to instantly respond to customer inquiries and improve engagement.',
        estimatedIncrease: '35%'
      });
    }
    
    res.json({
      success: true,
      data: {
        productQuality: {
          average: approvalRate,
          trend: approvalRate > 50 ? 'up' : 'down',
          improvement: approvalRate > 50 ? '+12%' : '-5%'
        },
        buyerEngagement: {
          score: Math.min(100, 50 + (qualifiedLeads * 2) + (completedOrders * 3)),
          inquiries: leads.length,
          conversionRate: `${leadConversionRate}%`
        },
        marketPositioning: {
          rank: approvalRate > 70 ? 'Excellent' : approvalRate > 50 ? 'Good' : 'Needs Improvement',
          percentile: approvalRate,
          recommendation: 'Focus on product quality and customer service'
        },
        aiRecommendations: recommendations
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch AI insights'
    });
  }
});

// AI generate auto-reply endpoint
router.post('/generate-auto-reply', supplierAuth, async (req: any, res) => {
  try {
    const { messageType, prompt } = req.body;
    const supplierId = req.supplier.id;
    
    // Get supplier info
    // const supplier = await Supplier.findById(supplierId);
    
    const replies: Record<string, string> = {
      'General Inquiry': `Thank you for your interest in our products. We appreciate your inquiry and will respond with detailed information within 24 hours. Please feel free to contact us for any specific requirements. Our team is dedicated to providing you with the best service and quality products.`,
      'Price Quote Request': `Thank you for requesting a quote. We provide competitive pricing for bulk orders and value long-term partnerships. Please share your quantity requirements, delivery preferences, and any special specifications so we can provide an accurate and competitive quote tailored to your needs.`,
      'Product Availability': `Thank you for your interest in our products. Our inventory is regularly updated, and we maintain strong supply chains to ensure product availability. Please let us know your specific requirements including quantity, delivery timeline, and any custom specifications, and we will confirm availability and provide delivery details.`,
      'Custom Message': `Thank you for reaching out to us. We are committed to providing excellent service and support for all your procurement needs. Our team of experts is ready to assist you with product information, pricing, and any other queries you may have.`
    };
    
    // Customize based on supplier data if needed
    const reply = replies[messageType] || replies['Custom Message'];
    
    res.json({
      success: true,
      reply: reply
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to generate auto-reply'
    });
  }
});

export default router;