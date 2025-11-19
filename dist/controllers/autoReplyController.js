"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.toggleAutoReply = exports.deleteAutoReply = exports.updateAutoReply = exports.getAutoReplyByType = exports.getSupplierAutoReplies = exports.createAutoReply = void 0;
const AutoReply_1 = __importDefault(require("../models/AutoReply"));
const createAutoReply = async (req, res) => {
    try {
        const { messageType, responseText, triggerKeywords } = req.body;
        const supplierId = req.supplier?._id;
        if (!supplierId) {
            return res.status(401).json({ success: false, message: 'Supplier not authenticated' });
        }
        if (!messageType || !responseText) {
            return res.status(400).json({ success: false, message: 'Message type and response text are required' });
        }
        if (responseText.length < 10 || responseText.length > 1000) {
            return res.status(400).json({ success: false, message: 'Response must be between 10 and 1000 characters' });
        }
        // Check if auto-reply for this type already exists
        const existing = await AutoReply_1.default.findOne({ supplierId, messageType });
        if (existing) {
            // Update existing
            existing.responseText = responseText;
            existing.triggerKeywords = triggerKeywords || [];
            existing.isActive = true;
            await existing.save();
            return res.json({
                success: true,
                message: 'Auto-reply updated successfully',
                data: existing
            });
        }
        // Create new
        const newAutoReply = new AutoReply_1.default({
            supplierId,
            messageType,
            responseText,
            triggerKeywords: triggerKeywords || [],
            isActive: true
        });
        await newAutoReply.save();
        res.status(201).json({
            success: true,
            message: 'Auto-reply created successfully',
            data: newAutoReply
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.createAutoReply = createAutoReply;
const getSupplierAutoReplies = async (req, res) => {
    try {
        const supplierId = req.supplier?._id;
        if (!supplierId) {
            return res.status(401).json({ success: false, message: 'Supplier not authenticated' });
        }
        const autoReplies = await AutoReply_1.default.find({ supplierId })
            .select('messageType responseText triggerKeywords isActive usageCount createdAt')
            .sort({ createdAt: -1 });
        res.json({
            success: true,
            data: autoReplies,
            count: autoReplies.length
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getSupplierAutoReplies = getSupplierAutoReplies;
const getAutoReplyByType = async (req, res) => {
    try {
        const { messageType } = req.params;
        const supplierId = req.supplier?._id;
        if (!supplierId) {
            return res.status(401).json({ success: false, message: 'Supplier not authenticated' });
        }
        const autoReply = await AutoReply_1.default.findOne({ supplierId, messageType, isActive: true });
        if (!autoReply) {
            return res.status(404).json({ success: false, message: 'Auto-reply not found' });
        }
        // Increment usage count
        autoReply.usageCount += 1;
        await autoReply.save();
        res.json({
            success: true,
            data: autoReply
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getAutoReplyByType = getAutoReplyByType;
const updateAutoReply = async (req, res) => {
    try {
        const { id } = req.params;
        const { responseText, triggerKeywords, isActive } = req.body;
        const supplierId = req.supplier?._id;
        if (!supplierId) {
            return res.status(401).json({ success: false, message: 'Supplier not authenticated' });
        }
        const autoReply = await AutoReply_1.default.findOne({ _id: id, supplierId });
        if (!autoReply) {
            return res.status(404).json({ success: false, message: 'Auto-reply not found' });
        }
        if (responseText) {
            if (responseText.length < 10 || responseText.length > 1000) {
                return res.status(400).json({ success: false, message: 'Response must be between 10 and 1000 characters' });
            }
            autoReply.responseText = responseText;
        }
        if (triggerKeywords) {
            autoReply.triggerKeywords = triggerKeywords;
        }
        if (isActive !== undefined) {
            autoReply.isActive = isActive;
        }
        await autoReply.save();
        res.json({
            success: true,
            message: 'Auto-reply updated successfully',
            data: autoReply
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.updateAutoReply = updateAutoReply;
const deleteAutoReply = async (req, res) => {
    try {
        const { id } = req.params;
        const supplierId = req.supplier?._id;
        if (!supplierId) {
            return res.status(401).json({ success: false, message: 'Supplier not authenticated' });
        }
        const autoReply = await AutoReply_1.default.findOneAndDelete({ _id: id, supplierId });
        if (!autoReply) {
            return res.status(404).json({ success: false, message: 'Auto-reply not found' });
        }
        res.json({
            success: true,
            message: 'Auto-reply deleted successfully'
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.deleteAutoReply = deleteAutoReply;
const toggleAutoReply = async (req, res) => {
    try {
        const { id } = req.params;
        const supplierId = req.supplier?._id;
        if (!supplierId) {
            return res.status(401).json({ success: false, message: 'Supplier not authenticated' });
        }
        const autoReply = await AutoReply_1.default.findOne({ _id: id, supplierId });
        if (!autoReply) {
            return res.status(404).json({ success: false, message: 'Auto-reply not found' });
        }
        autoReply.isActive = !autoReply.isActive;
        await autoReply.save();
        res.json({
            success: true,
            message: `Auto-reply ${autoReply.isActive ? 'enabled' : 'disabled'}`,
            data: autoReply
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.toggleAutoReply = toggleAutoReply;
