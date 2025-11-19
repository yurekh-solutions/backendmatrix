"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateToolMetrics = exports.getSupplierActivityLog = exports.getToolAnalytics = exports.getAllToolUsage = exports.getSupplierTools = exports.enableTool = exports.recordToolClick = void 0;
const ToolUsage_1 = __importDefault(require("../models/ToolUsage"));
const recordToolClick = async (req, res) => {
    try {
        const { toolName, toolType, description } = req.body;
        const supplierId = req.supplier?._id;
        const supplierName = req.supplier?.companyName || 'Unknown';
        if (!supplierId || !toolName || !toolType) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: supplierId, toolName, toolType'
            });
        }
        // Check if tool usage already exists for this supplier and tool
        let toolUsage = await ToolUsage_1.default.findOne({
            supplierId,
            toolType
        });
        if (toolUsage) {
            // Update existing record
            toolUsage.usageCount += 1;
            toolUsage.lastUsedAt = new Date();
            toolUsage.status = 'active';
        }
        else {
            // Create new record
            toolUsage = new ToolUsage_1.default({
                supplierId,
                supplierName,
                toolName,
                toolType,
                description: description || `Supplier clicked ${toolName}`,
                status: 'clicked',
                usageCount: 1,
                lastUsedAt: new Date()
            });
        }
        await toolUsage.save();
        res.status(200).json({
            success: true,
            message: `${toolName} usage recorded`,
            data: toolUsage
        });
    }
    catch (error) {
        console.error('Error recording tool click:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to record tool usage'
        });
    }
};
exports.recordToolClick = recordToolClick;
const enableTool = async (req, res) => {
    try {
        const { toolType } = req.body;
        const supplierId = req.supplier?._id;
        if (!toolType) {
            return res.status(400).json({
                success: false,
                message: 'toolType is required'
            });
        }
        let toolUsage = await ToolUsage_1.default.findOne({
            supplierId,
            toolType
        });
        if (!toolUsage) {
            return res.status(404).json({
                success: false,
                message: 'Tool usage record not found'
            });
        }
        toolUsage.status = 'enabled';
        toolUsage.lastUsedAt = new Date();
        await toolUsage.save();
        res.status(200).json({
            success: true,
            message: `${toolType} enabled successfully`,
            data: toolUsage
        });
    }
    catch (error) {
        console.error('Error enabling tool:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to enable tool'
        });
    }
};
exports.enableTool = enableTool;
const getSupplierTools = async (req, res) => {
    try {
        const supplierId = req.supplier?._id;
        const tools = await ToolUsage_1.default.find({ supplierId })
            .sort({ createdAt: -1 });
        res.status(200).json({
            success: true,
            data: tools
        });
    }
    catch (error) {
        console.error('Error fetching supplier tools:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to fetch tools'
        });
    }
};
exports.getSupplierTools = getSupplierTools;
// Admin endpoints
const getAllToolUsage = async (req, res) => {
    try {
        const { toolType, status, page = 1, limit = 20 } = req.query;
        const skip = (Number(page) - 1) * Number(limit);
        const filter = {};
        if (toolType)
            filter.toolType = toolType;
        if (status)
            filter.status = status;
        const totalTools = await ToolUsage_1.default.countDocuments(filter);
        const tools = await ToolUsage_1.default.find(filter)
            .sort({ lastUsedAt: -1 })
            .skip(skip)
            .limit(Number(limit))
            .populate('supplierId', 'companyName email');
        res.status(200).json({
            success: true,
            data: tools,
            pagination: {
                total: totalTools,
                page: Number(page),
                limit: Number(limit),
                pages: Math.ceil(totalTools / Number(limit))
            }
        });
    }
    catch (error) {
        console.error('Error fetching tool usage:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to fetch tool usage'
        });
    }
};
exports.getAllToolUsage = getAllToolUsage;
const getToolAnalytics = async (req, res) => {
    try {
        const toolStats = await ToolUsage_1.default.aggregate([
            {
                $group: {
                    _id: '$toolType',
                    totalClicks: { $sum: '$usageCount' },
                    uniqueSuppliers: { $addToSet: '$supplierId' },
                    activeCount: {
                        $sum: {
                            $cond: [{ $eq: ['$status', 'active'] }, 1, 0]
                        }
                    },
                    enabledCount: {
                        $sum: {
                            $cond: [{ $eq: ['$status', 'enabled'] }, 1, 0]
                        }
                    }
                }
            },
            {
                $sort: { totalClicks: -1 }
            }
        ]);
        const totalToolUsage = await ToolUsage_1.default.countDocuments();
        const activeSuppliers = await ToolUsage_1.default.distinct('supplierId');
        res.status(200).json({
            success: true,
            data: {
                toolStats: toolStats.map(stat => ({
                    ...stat,
                    uniqueSuppliers: stat.uniqueSuppliers.length
                })),
                summary: {
                    totalToolClicks: totalToolUsage,
                    uniqueSuppliers: activeSuppliers.length,
                    tools: toolStats.length
                }
            }
        });
    }
    catch (error) {
        console.error('Error fetching analytics:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to fetch analytics'
        });
    }
};
exports.getToolAnalytics = getToolAnalytics;
const getSupplierActivityLog = async (req, res) => {
    try {
        const { supplierId } = req.params;
        const { page = 1, limit = 20 } = req.query;
        const skip = (Number(page) - 1) * Number(limit);
        const totalActivity = await ToolUsage_1.default.countDocuments({ supplierId });
        const activity = await ToolUsage_1.default.find({ supplierId })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit));
        res.status(200).json({
            success: true,
            data: activity,
            pagination: {
                total: totalActivity,
                page: Number(page),
                limit: Number(limit),
                pages: Math.ceil(totalActivity / Number(limit))
            }
        });
    }
    catch (error) {
        console.error('Error fetching supplier activity:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to fetch activity'
        });
    }
};
exports.getSupplierActivityLog = getSupplierActivityLog;
const updateToolMetrics = async (req, res) => {
    try {
        const { toolUsageId } = req.params;
        const { metrics } = req.body;
        const toolUsage = await ToolUsage_1.default.findByIdAndUpdate(toolUsageId, { metrics, lastUsedAt: new Date() }, { new: true });
        if (!toolUsage) {
            return res.status(404).json({
                success: false,
                message: 'Tool usage record not found'
            });
        }
        res.status(200).json({
            success: true,
            message: 'Metrics updated',
            data: toolUsage
        });
    }
    catch (error) {
        console.error('Error updating metrics:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to update metrics'
        });
    }
};
exports.updateToolMetrics = updateToolMetrics;
