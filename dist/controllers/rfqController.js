"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.respondToRFQ = exports.getSupplierRFQs = exports.getCustomerRFQs = exports.submitRFQ = void 0;
const RFQ_1 = __importDefault(require("../models/RFQ"));
// Customer: Submit RFQ
const submitRFQ = async (req, res) => {
    try {
        const rfq = new RFQ_1.default(req.body);
        await rfq.save();
        res.status(201).json({
            success: true,
            message: 'RFQ submitted successfully. We will contact you soon.',
            data: rfq,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to submit RFQ',
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
