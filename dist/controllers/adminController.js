"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.rejectProduct = exports.approveProduct = exports.getAllProducts = exports.getStatistics = exports.rejectSupplier = exports.approveSupplier = exports.getSupplierById = exports.getAllSuppliers = exports.getPendingSuppliers = void 0;
const Supplier_1 = __importDefault(require("../models/Supplier"));
const Product_1 = __importDefault(require("../models/Product"));
const email_1 = require("../config/email");
const emailTemplates_1 = require("../utils/emailTemplates");
const getPendingSuppliers = async (req, res) => {
    try {
        const suppliers = await Supplier_1.default.find({ status: 'pending' })
            .sort({ submittedAt: -1 })
            .select('-password');
        res.json({
            success: true,
            count: suppliers.length,
            data: suppliers
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getPendingSuppliers = getPendingSuppliers;
const getAllSuppliers = async (req, res) => {
    try {
        const { status, search, page = 1, limit = 10 } = req.query;
        const query = {};
        if (status)
            query.status = status;
        if (search) {
            query.$or = [
                { companyName: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }
        const suppliers = await Supplier_1.default.find(query)
            .sort({ submittedAt: -1 })
            .limit(Number(limit))
            .skip((Number(page) - 1) * Number(limit))
            .select('-password');
        const total = await Supplier_1.default.countDocuments(query);
        res.json({
            success: true,
            data: suppliers,
            pagination: {
                total,
                page: Number(page),
                pages: Math.ceil(total / Number(limit))
            }
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getAllSuppliers = getAllSuppliers;
const getSupplierById = async (req, res) => {
    try {
        const supplier = await Supplier_1.default.findById(req.params.id).select('-password');
        if (!supplier) {
            return res.status(404).json({ success: false, message: 'Supplier not found' });
        }
        res.json({ success: true, data: supplier });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getSupplierById = getSupplierById;
const approveSupplier = async (req, res) => {
    try {
        console.log('Approve request received for ID:', req.params.id);
        console.log('Admin from token:', req.admin);
        const supplier = await Supplier_1.default.findById(req.params.id);
        if (!supplier) {
            return res.status(404).json({ success: false, message: 'Supplier not found' });
        }
        if (supplier.status === 'approved') {
            return res.status(400).json({ success: false, message: 'Supplier already approved' });
        }
        supplier.status = 'approved';
        if (req.admin) {
            supplier.reviewedBy = req.admin._id || req.admin.id;
        }
        supplier.reviewedAt = new Date();
        supplier.rejectionReason = undefined;
        await supplier.save();
        // Send approval email
        try {
            const setupPasswordUrl = `${process.env.FRONTEND_URL || 'http://localhost:8081'}/supplier/login`;
            const emailHtml = (0, emailTemplates_1.approvalEmailTemplate)(supplier.companyName, setupPasswordUrl);
            await (0, email_1.sendEmail)(supplier.email, 'Supplier Application Approved - Setup Your Account', emailHtml);
        }
        catch (emailError) {
            console.error('Failed to send approval email:', emailError);
            // Don't fail the approval if email fails
        }
        res.json({
            success: true,
            message: 'Supplier approved successfully',
            data: supplier
        });
    }
    catch (error) {
        console.error('Error approving supplier:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.approveSupplier = approveSupplier;
const rejectSupplier = async (req, res) => {
    try {
        const { reason } = req.body;
        if (!reason || reason.trim() === '') {
            return res.status(400).json({ success: false, message: 'Rejection reason is required' });
        }
        const supplier = await Supplier_1.default.findById(req.params.id);
        if (!supplier) {
            return res.status(404).json({ success: false, message: 'Supplier not found' });
        }
        supplier.status = 'rejected';
        supplier.rejectionReason = reason;
        if (req.admin) {
            supplier.reviewedBy = req.admin._id || req.admin.id;
        }
        supplier.reviewedAt = new Date();
        await supplier.save();
        // Send rejection email
        try {
            const reapplyUrl = `${process.env.FRONTEND_URL || 'http://localhost:8081'}/supplier/onboarding`;
            const emailHtml = (0, emailTemplates_1.rejectionEmailTemplate)(supplier.companyName, reason, reapplyUrl);
            await (0, email_1.sendEmail)(supplier.email, 'Supplier Application Update', emailHtml);
        }
        catch (emailError) {
            console.error('Failed to send rejection email:', emailError);
            // Don't fail the rejection if email fails
        }
        res.json({
            success: true,
            message: 'Supplier rejected',
            data: supplier
        });
    }
    catch (error) {
        console.error('Error rejecting supplier:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.rejectSupplier = rejectSupplier;
const getStatistics = async (req, res) => {
    try {
        const [pending, approved, rejected, total] = await Promise.all([
            Supplier_1.default.countDocuments({ status: 'pending' }),
            Supplier_1.default.countDocuments({ status: 'approved' }),
            Supplier_1.default.countDocuments({ status: 'rejected' }),
            Supplier_1.default.countDocuments()
        ]);
        res.json({
            success: true,
            data: {
                pending,
                approved,
                rejected,
                total
            }
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getStatistics = getStatistics;
// ========== PRODUCT MANAGEMENT ==========
const getAllProducts = async (req, res) => {
    try {
        const { status, search, page = 1, limit = 50 } = req.query;
        const query = {};
        if (status && status !== 'all')
            query.status = status;
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { category: { $regex: search, $options: 'i' } }
            ];
        }
        const products = await Product_1.default.find(query)
            .populate('supplierId', 'companyName email')
            .sort({ createdAt: -1 })
            .limit(Number(limit))
            .skip((Number(page) - 1) * Number(limit));
        const total = await Product_1.default.countDocuments(query);
        res.json({
            success: true,
            data: products,
            pagination: {
                total,
                page: Number(page),
                pages: Math.ceil(total / Number(limit))
            }
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getAllProducts = getAllProducts;
const approveProduct = async (req, res) => {
    try {
        const product = await Product_1.default.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }
        product.status = 'active';
        await product.save();
        res.json({
            success: true,
            message: 'Product approved successfully',
            data: product
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.approveProduct = approveProduct;
const rejectProduct = async (req, res) => {
    try {
        const { reason } = req.body;
        const product = await Product_1.default.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }
        product.status = 'rejected';
        await product.save();
        res.json({
            success: true,
            message: 'Product rejected',
            data: product
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.rejectProduct = rejectProduct;
