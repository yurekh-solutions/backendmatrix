"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProductById = exports.getAllProducts = exports.deleteProduct = exports.updateProduct = exports.getSupplierProducts = exports.addProduct = void 0;
const Product_1 = __importDefault(require("../models/Product"));
// Supplier: Add new product
const addProduct = async (req, res) => {
    try {
        const supplierId = req.supplier._id;
        const productData = {
            ...req.body,
            supplierId,
            status: 'pending', // Admin approval required
        };
        const product = new Product_1.default(productData);
        await product.save();
        res.status(201).json({
            success: true,
            message: 'Product added successfully. Awaiting admin approval.',
            data: product,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to add product',
        });
    }
};
exports.addProduct = addProduct;
// Supplier: Get their products
const getSupplierProducts = async (req, res) => {
    try {
        const supplierId = req.supplier._id;
        const products = await Product_1.default.find({ supplierId }).sort({ createdAt: -1 });
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
exports.getSupplierProducts = getSupplierProducts;
// Supplier: Update product
const updateProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const supplierId = req.supplier._id;
        const product = await Product_1.default.findOne({ _id: id, supplierId });
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found',
            });
        }
        Object.assign(product, req.body);
        product.status = 'pending'; // Re-approval needed after edit
        await product.save();
        res.json({
            success: true,
            message: 'Product updated successfully',
            data: product,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to update product',
        });
    }
};
exports.updateProduct = updateProduct;
// Supplier: Delete product
const deleteProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const supplierId = req.supplier._id;
        const product = await Product_1.default.findOneAndDelete({ _id: id, supplierId });
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found',
            });
        }
        res.json({
            success: true,
            message: 'Product deleted successfully',
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to delete product',
        });
    }
};
exports.deleteProduct = deleteProduct;
// Public: Get all active products
const getAllProducts = async (req, res) => {
    try {
        const { category, search } = req.query;
        const query = { status: 'active' };
        if (category) {
            query.category = category;
        }
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
            ];
        }
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
exports.getAllProducts = getAllProducts;
// Public: Get product by ID
const getProductById = async (req, res) => {
    try {
        const { id } = req.params;
        const product = await Product_1.default.findOne({ _id: id, status: 'active' })
            .populate('supplierId', 'companyName email phone');
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found',
            });
        }
        res.json({
            success: true,
            data: product,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch product',
        });
    }
};
exports.getProductById = getProductById;
