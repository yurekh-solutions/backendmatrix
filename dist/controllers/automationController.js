"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.recordToolClick = exports.getAutomationStats = exports.getPerformanceAnalytics = exports.autoProcessOrder = exports.getOrders = exports.assignLead = exports.getLeads = exports.deleteAutoReply = exports.updateAutoReply = exports.createAutoReply = exports.getAutoReplies = void 0;
const AutoReply_1 = __importDefault(require("../models/AutoReply"));
const Lead_1 = __importDefault(require("../models/Lead"));
const OrderAutomation_1 = __importDefault(require("../models/OrderAutomation"));
const Analytics_1 = __importDefault(require("../models/Analytics"));
const Product_1 = __importDefault(require("../models/Product"));
// Auto Reply Controllers
const getAutoReplies = async (req, res) => {
    try {
        const supplierId = req.supplier?.id || req.admin?.supplierId;
        if (!supplierId) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized'
            });
        }
        const autoReplies = await AutoReply_1.default.find({ supplierId });
        res.json({
            success: true,
            data: autoReplies
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch auto replies'
        });
    }
};
exports.getAutoReplies = getAutoReplies;
const createAutoReply = async (req, res) => {
    try {
        const supplierId = req.supplier?.id || req.admin?.supplierId;
        if (!supplierId) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized'
            });
        }
        const { messageType, responseText, triggerKeywords } = req.body;
        const autoReply = new AutoReply_1.default({
            supplierId,
            messageType,
            responseText,
            triggerKeywords: triggerKeywords || []
        });
        await autoReply.save();
        // Log analytics
        await Analytics_1.default.create({
            supplierId,
            metricType: 'auto-reply',
            value: 1,
            metadata: { action: 'created', messageType }
        });
        res.status(201).json({
            success: true,
            data: autoReply
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to create auto reply'
        });
    }
};
exports.createAutoReply = createAutoReply;
const updateAutoReply = async (req, res) => {
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
        const autoReply = await AutoReply_1.default.findOneAndUpdate({ _id: id, supplierId }, { messageType, responseText, triggerKeywords, isActive }, { new: true });
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
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to update auto reply'
        });
    }
};
exports.updateAutoReply = updateAutoReply;
const deleteAutoReply = async (req, res) => {
    try {
        const supplierId = req.supplier?.id || req.admin?.supplierId;
        if (!supplierId) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized'
            });
        }
        const { id } = req.params;
        const autoReply = await AutoReply_1.default.findOneAndDelete({ _id: id, supplierId });
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
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to delete auto reply'
        });
    }
};
exports.deleteAutoReply = deleteAutoReply;
// Lead Controllers
const getLeads = async (req, res) => {
    try {
        const supplierId = req.supplier?.id || req.admin?.supplierId;
        if (!supplierId) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized'
            });
        }
        const { status, scoreMin, scoreMax } = req.query;
        const filter = { supplierId };
        if (status)
            filter.status = status;
        if (scoreMin || scoreMax) {
            filter.score = {};
            if (scoreMin)
                filter.score.$gte = parseInt(scoreMin);
            if (scoreMax)
                filter.score.$lte = parseInt(scoreMax);
        }
        const leads = await Lead_1.default.find(filter).sort({ score: -1, createdAt: -1 });
        res.json({
            success: true,
            data: leads
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch leads'
        });
    }
};
exports.getLeads = getLeads;
const assignLead = async (req, res) => {
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
        const lead = await Lead_1.default.findOneAndUpdate({ _id: id, supplierId }, { assignedTo, status: 'contacted' }, { new: true });
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
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to assign lead'
        });
    }
};
exports.assignLead = assignLead;
// Order Automation Controllers
const getOrders = async (req, res) => {
    try {
        const supplierId = req.supplier?.id || req.admin?.supplierId;
        if (!supplierId) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized'
            });
        }
        const { status } = req.query;
        const filter = { supplierId };
        if (status)
            filter.status = status;
        const orders = await OrderAutomation_1.default.find(filter).sort({ createdAt: -1 });
        res.json({
            success: true,
            data: orders
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch orders'
        });
    }
};
exports.getOrders = getOrders;
const autoProcessOrder = async (req, res) => {
    try {
        const supplierId = req.supplier?.id || req.admin?.supplierId;
        if (!supplierId) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized'
            });
        }
        const { id } = req.params;
        const order = await OrderAutomation_1.default.findOne({ _id: id, supplierId });
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }
        // Simulate order processing steps
        const steps = [
            { step: 'order-confirmation', status: 'completed', timestamp: new Date() },
            { step: 'invoice-generation', status: 'completed', timestamp: new Date(Date.now() + 1000) },
            { step: 'payment-processing', status: 'completed', timestamp: new Date(Date.now() + 2000) }
        ];
        order.automationSteps = steps;
        order.status = 'processing';
        await order.save();
        // Log analytics
        await Analytics_1.default.create({
            supplierId,
            metricType: 'order',
            value: 1,
            metadata: { action: 'auto-processed', orderId: order._id }
        });
        res.json({
            success: true,
            data: order
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to process order'
        });
    }
};
exports.autoProcessOrder = autoProcessOrder;
// Analytics Controllers
const getPerformanceAnalytics = async (req, res) => {
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
            case '7d':
                days = 7;
                break;
            case '30d':
                days = 30;
                break;
            case '90d':
                days = 90;
                break;
            case '1y':
                days = 365;
                break;
        }
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        // Get analytics data
        const analyticsData = await Analytics_1.default.find({
            supplierId,
            timestamp: { $gte: startDate }
        }).sort({ timestamp: 1 });
        // Calculate metrics
        const responseTime = 2.3; // Mock value
        const conversionRate = 8.3; // Mock value
        const totalInquiries = analyticsData.filter(a => a.metricType === 'inquiry').length;
        const automationEfficiency = Math.min(100, Math.round((analyticsData.filter(a => a.metricType === 'auto-reply').length / Math.max(1, totalInquiries)) * 100));
        // Get supplier products for additional metrics
        const products = await Product_1.default.find({ supplierId });
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
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch analytics'
        });
    }
};
exports.getPerformanceAnalytics = getPerformanceAnalytics;
const getAutomationStats = async (req, res) => {
    try {
        const supplierId = req.supplier?.id || req.admin?.supplierId;
        if (!supplierId) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized'
            });
        }
        // Get counts
        const autoReplyCount = await AutoReply_1.default.countDocuments({ supplierId });
        const leadCount = await Lead_1.default.countDocuments({ supplierId });
        const orderCount = await OrderAutomation_1.default.countDocuments({ supplierId });
        // Get active items
        const activeAutoReplies = await AutoReply_1.default.countDocuments({ supplierId, isActive: true });
        const qualifiedLeads = await Lead_1.default.countDocuments({ supplierId, status: 'qualified' });
        const processedOrders = await OrderAutomation_1.default.countDocuments({ supplierId, status: { $in: ['shipped', 'delivered'] } });
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
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch automation stats'
        });
    }
};
exports.getAutomationStats = getAutomationStats;
// Tool usage tracking
const recordToolClick = async (req, res) => {
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
        await Analytics_1.default.create({
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
    }
    catch (error) {
        console.error('❌ recordToolClick error:', error.message, error.stack);
        res.status(500).json({
            success: false,
            message: 'Failed to record tool usage',
            error: error.message
        });
    }
};
exports.recordToolClick = recordToolClick;
