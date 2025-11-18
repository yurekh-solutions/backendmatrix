"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProductById = exports.getAllProducts = exports.deleteProduct = exports.updateProduct = exports.getSupplierProducts = exports.addProduct = void 0;
const Product_1 = __importDefault(require("../models/Product"));
const Category_1 = __importDefault(require("../models/Category"));
// Supplier: Add new product
const addProduct = async (req, res) => {
    try {
        const supplierId = req.supplier._id;
        const { name, category, subcategory, customCategory, customSubcategory, description } = req.body;
        // Handle image upload
        let imageUrl = '';
        if (req.file) {
            imageUrl = `/uploads/${req.file.filename}`;
        }
        // Handle custom category request
        if (customCategory) {
            const slug = customCategory.toLowerCase().replace(/[^a-z0-9]+/g, '-');
            const existingCategory = await Category_1.default.findOne({ slug });
            if (!existingCategory) {
                // Create new category request
                await Category_1.default.create({
                    name: customCategory,
                    slug,
                    isCustom: true,
                    requestedBy: supplierId,
                    status: 'pending',
                    isActive: false,
                });
            }
        }
        // Handle custom subcategory request
        if (customSubcategory && category) {
            const categoryDoc = await Category_1.default.findOne({ slug: category });
            if (categoryDoc) {
                const subSlug = customSubcategory.toLowerCase().replace(/[^a-z0-9]+/g, '-');
                const existingSub = categoryDoc.subcategories.find((sub) => sub.slug === subSlug);
                if (!existingSub) {
                    categoryDoc.subcategories.push({
                        name: customSubcategory,
                        slug: subSlug,
                        isCustom: true,
                        requestedBy: supplierId,
                        status: 'pending',
                        isActive: false,
                    });
                    await categoryDoc.save();
                }
            }
        }
        const productData = {
            supplierId,
            name,
            category,
            subcategory,
            customCategory,
            customSubcategory,
            description,
            image: imageUrl,
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
        console.error('Add product error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to add product',
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
