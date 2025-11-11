"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateOrderStatus = exports.getAllOrdersAdmin = exports.assignRFQToSupplier = exports.getAllRFQsAdmin = exports.updateProductStatus = exports.getAllProductsAdmin = exports.getTrackingStatistics = void 0;
const Product_1 = __importDefault(require("../models/Product"));
const RFQ_1 = __importDefault(require("../models/RFQ"));
const Order_1 = __importDefault(require("../models/Order"));
const Supplier_1 = __importDefault(require("../models/Supplier"));
// Admin: Get all tracking statistics
const getTrackingStatistics = async (req, res) => {
    try {
        const [totalProducts, pendingProducts, activeProducts, totalRFQs, pendingRFQs, totalOrders, pendingOrders, totalSuppliers, pendingSuppliers, approvedSuppliers,] = await Promise.all([
            Product_1.default.countDocuments(),
            Product_1.default.countDocuments({ status: 'pending' }),
            Product_1.default.countDocuments({ status: 'active' }),
            RFQ_1.default.countDocuments(),
            RFQ_1.default.countDocuments({ status: 'pending' }),
            Order_1.default.countDocuments(),
            Order_1.default.countDocuments({ status: 'pending' }),
            Supplier_1.default.countDocuments(),
            Supplier_1.default.countDocuments({ status: 'pending' }),
            Supplier_1.default.countDocuments({ status: 'approved' }),
        ]);
        res.json({
            success: true,
            data: {
                products: {
                    total: totalProducts,
                    pending: pendingProducts,
                    active: activeProducts,
                },
                rfqs: {
                    total: totalRFQs,
                    pending: pendingRFQs,
                },
                orders: {
                    total: totalOrders,
                    pending: pendingOrders,
                },
                suppliers: {
                    total: totalSuppliers,
                    pending: pendingSuppliers,
                    approved: approvedSuppliers,
                },
            },
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch statistics',
        });
    }
};
exports.getTrackingStatistics = getTrackingStatistics;
// Admin: Get all products
const getAllProductsAdmin = async (req, res) => {
    try {
        const { status } = req.query;
        const query = status ? { status } : {};
        const products = await Product_1.default.find(query)
            .populate('supplierId', 'companyName email phone')
            .sort({ createdAt: -1 });
        res.json({
            success: true,
            data: products,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch products',
        });
    }
};
exports.getAllProductsAdmin = getAllProductsAdmin;
// Admin: Approve/Reject product
const updateProductStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, rejectionReason } = req.body;
        const product = await Product_1.default.findById(id);
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found',
            });
        }
        product.status = status;
        await product.save();
        res.json({
            success: true,
            message: `Product ${status} successfully`,
            data: product,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to update product status',
        });
    }
};
exports.updateProductStatus = updateProductStatus;
// Admin: Get all RFQs
const getAllRFQsAdmin = async (req, res) => {
    try {
        const { status } = req.query;
        const query = status ? { status } : {};
        const rfqs = await RFQ_1.default.find(query)
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
exports.getAllRFQsAdmin = getAllRFQsAdmin;
// Admin: Assign RFQ to supplier
const assignRFQToSupplier = async (req, res) => {
    try {
        const { id } = req.params;
        const { supplierId } = req.body;
        const rfq = await RFQ_1.default.findById(id);
        if (!rfq) {
            return res.status(404).json({
                success: false,
                message: 'RFQ not found',
            });
        }
        rfq.assignedSupplier = supplierId;
        await rfq.save();
        // TODO: Send WhatsApp notification to supplier
        res.json({
            success: true,
            message: 'RFQ assigned to supplier successfully',
            data: rfq,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to assign RFQ',
        });
    }
};
exports.assignRFQToSupplier = assignRFQToSupplier;
// Admin: Get all orders
const getAllOrdersAdmin = async (req, res) => {
    try {
        const { status } = req.query;
        const query = status ? { status } : {};
        const orders = await Order_1.default.find(query)
            .populate('supplierId', 'companyName phone email')
            .populate('rfqId')
            .sort({ createdAt: -1 });
        res.json({
            success: true,
            data: orders,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch orders',
        });
    }
};
exports.getAllOrdersAdmin = getAllOrdersAdmin;
// Admin: Update order status
const updateOrderStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, trackingNumber, adminNotes } = req.body;
        const order = await Order_1.default.findById(id);
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found',
            });
        }
        if (status)
            order.status = status;
        if (trackingNumber)
            order.trackingNumber = trackingNumber;
        if (adminNotes)
            order.adminNotes = adminNotes;
        if (status === 'delivered') {
            order.actualDeliveryDate = new Date();
        }
        await order.save();
        res.json({
            success: true,
            message: 'Order updated successfully',
            data: order,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to update order',
        });
    }
};
exports.updateOrderStatus = updateOrderStatus;
