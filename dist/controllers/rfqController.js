"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllRFQs = exports.respondToRFQ = exports.getSupplierRFQs = exports.getCustomerRFQs = exports.submitRFQ = void 0;
const RFQ_1 = __importDefault(require("../models/RFQ"));
const whatsappService_1 = require("../utils/whatsappService");
// Customer: Submit RFQ
const submitRFQ = async (req, res) => {
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
        const rfqs = await Promise.all(items.map(item => {
            const rfq = new RFQ_1.default({
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
        }));
        // Send WhatsApp notification
        try {
            const whatsappNotification = await (0, whatsappService_1.notifyRFQViaWhatsApp)({
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
        }
        catch (whatsappError) {
            console.error('⚠️  WhatsApp notification error (non-blocking):', whatsappError);
            // Continue - don't fail RFQ submission due to WhatsApp error
        }
        res.status(201).json({
            success: true,
            message: `RFQ submitted successfully for ${rfqs.length} product(s). We will contact you soon via WhatsApp.`,
            data: rfqs,
        });
    }
    catch (error) {
        console.error('❌ RFQ submission error:', error.message, error);
        res.status(500).json({
            success: false,
            message: 'Failed to submit RFQ: ' + error.message,
        });
    }
};
exports.submitRFQ = submitRFQ;
// Customer: Get RFQs by email
const getCustomerRFQs = async (req, res) => {
    try {
        const { email } = req.query;
        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Email is required',
            });
        }
        const rfqs = await RFQ_1.default.find({ email })
            .populate('assignedSupplier', 'companyName phone email')
            .sort({ createdAt: -1 });
        res.json({
            success: true,
            data: rfqs,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch RFQs',
        });
    }
};
exports.getCustomerRFQs = getCustomerRFQs;
// Supplier: Get assigned RFQs
const getSupplierRFQs = async (req, res) => {
    try {
        const supplierId = req.supplier._id;
        const rfqs = await RFQ_1.default.find({ assignedSupplier: supplierId })
            .sort({ createdAt: -1 });
        res.json({
            success: true,
            data: rfqs,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch RFQs',
        });
    }
};
exports.getSupplierRFQs = getSupplierRFQs;
// Supplier: Respond to RFQ
const respondToRFQ = async (req, res) => {
    try {
        const { id } = req.params;
        const supplierId = req.supplier._id;
        const { quotedPrice, notes } = req.body;
        const rfq = await RFQ_1.default.findOne({ _id: id, assignedSupplier: supplierId });
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
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to submit quote',
        });
    }
};
exports.respondToRFQ = respondToRFQ;
// Admin: Get all RFQs
const getAllRFQs = async (req, res) => {
    try {
        const rfqs = await RFQ_1.default.find()
            .populate('assignedSupplier', 'companyName phone email')
            .sort({ createdAt: -1 });
        res.json({
            success: true,
            count: rfqs.length,
            data: rfqs,
        });
    }
    catch (error) {
        console.error('❌ Error fetching RFQs:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch RFQs',
        });
    }
};
exports.getAllRFQs = getAllRFQs;
