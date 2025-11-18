"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.addDefaultCategory = exports.rejectSubcategory = exports.approveSubcategory = exports.rejectCategory = exports.approveCategory = exports.getAllCategoriesAdmin = exports.requestSubcategory = exports.requestCategory = exports.getCategories = void 0;
const Category_1 = __importDefault(require("../models/Category"));
// Get all approved categories (Public + Supplier)
const getCategories = async (req, res) => {
    try {
        const categories = await Category_1.default.find({
            status: 'approved',
            isActive: true
        }).select('name slug icon subcategories').sort({ name: 1 });
        // Filter approved subcategories
        const filteredCategories = categories.map(cat => {
            const categoryObj = cat.toObject();
            categoryObj.subcategories = categoryObj.subcategories.filter((sub) => sub.status === 'approved' && sub.isActive);
            return categoryObj;
        });
        res.json({
            success: true,
            data: filteredCategories,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch categories',
        });
    }
};
exports.getCategories = getCategories;
// Supplier: Request new category
const requestCategory = async (req, res) => {
    try {
        const { name, icon } = req.body;
        const supplierId = req.supplier._id;
        const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        // Check if category already exists
        const existing = await Category_1.default.findOne({ slug });
        if (existing) {
            return res.status(400).json({
                success: false,
                message: 'Category already exists or pending approval',
            });
        }
        const category = new Category_1.default({
            name,
            slug,
            icon: icon || '📦',
            isCustom: true,
            requestedBy: supplierId,
            status: 'pending',
        });
        await category.save();
        res.status(201).json({
            success: true,
            message: 'Category request submitted for admin approval',
            data: category,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to request category',
        });
    }
};
exports.requestCategory = requestCategory;
// Supplier: Request new subcategory
const requestSubcategory = async (req, res) => {
    try {
        const { categoryId, name } = req.body;
        const supplierId = req.supplier._id;
        const category = await Category_1.default.findById(categoryId);
        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'Category not found',
            });
        }
        const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        // Check if subcategory already exists
        const existing = category.subcategories.find((sub) => sub.slug === slug);
        if (existing) {
            return res.status(400).json({
                success: false,
                message: 'Subcategory already exists',
            });
        }
        category.subcategories.push({
            name,
            slug,
            isCustom: true,
            requestedBy: supplierId,
            status: 'pending',
            isActive: false, // Will be activated after approval
        });
        await category.save();
        res.status(201).json({
            success: true,
            message: 'Subcategory request submitted for admin approval',
            data: category,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to request subcategory',
        });
    }
};
exports.requestSubcategory = requestSubcategory;
// Admin: Get all categories (including pending)
const getAllCategoriesAdmin = async (req, res) => {
    try {
        const categories = await Category_1.default.find()
            .populate('requestedBy', 'companyName email')
            .populate('approvedBy', 'username')
            .sort({ createdAt: -1 });
        res.json({
            success: true,
            data: categories,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch categories',
        });
    }
};
exports.getAllCategoriesAdmin = getAllCategoriesAdmin;
// Admin: Approve category
const approveCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const adminId = req.admin._id;
        const category = await Category_1.default.findById(id);
        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'Category not found',
            });
        }
        category.status = 'approved';
        category.isActive = true;
        category.approvedBy = adminId;
        await category.save();
        res.json({
            success: true,
            message: 'Category approved successfully',
            data: category,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to approve category',
        });
    }
};
exports.approveCategory = approveCategory;
// Admin: Reject category
const rejectCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const category = await Category_1.default.findById(id);
        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'Category not found',
            });
        }
        category.status = 'rejected';
        await category.save();
        res.json({
            success: true,
            message: 'Category rejected',
            data: category,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to reject category',
        });
    }
};
exports.rejectCategory = rejectCategory;
// Admin: Approve subcategory
const approveSubcategory = async (req, res) => {
    try {
        const { categoryId, subcategoryId } = req.params;
        const adminId = req.admin._id;
        const category = await Category_1.default.findById(categoryId);
        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'Category not found',
            });
        }
        const subcategory = category.subcategories.find((sub) => sub._id?.toString() === subcategoryId);
        if (!subcategory) {
            return res.status(404).json({
                success: false,
                message: 'Subcategory not found',
            });
        }
        subcategory.status = 'approved';
        subcategory.isActive = true;
        subcategory.approvedBy = adminId;
        await category.save();
        res.json({
            success: true,
            message: 'Subcategory approved successfully',
            data: category,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to approve subcategory',
        });
    }
};
exports.approveSubcategory = approveSubcategory;
// Admin: Reject subcategory
const rejectSubcategory = async (req, res) => {
    try {
        const { categoryId, subcategoryId } = req.params;
        const category = await Category_1.default.findById(categoryId);
        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'Category not found',
            });
        }
        const subcategory = category.subcategories.find((sub) => sub._id?.toString() === subcategoryId);
        if (!subcategory) {
            return res.status(404).json({
                success: false,
                message: 'Subcategory not found',
            });
        }
        subcategory.status = 'rejected';
        await category.save();
        res.json({
            success: true,
            message: 'Subcategory rejected',
            data: category,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to reject subcategory',
        });
    }
};
exports.rejectSubcategory = rejectSubcategory;
// Admin: Add default category
const addDefaultCategory = async (req, res) => {
    try {
        const { name, icon, subcategories } = req.body;
        const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        const category = new Category_1.default({
            name,
            slug,
            icon: icon || '📦',
            isCustom: false,
            status: 'approved',
            isActive: true,
            approvedBy: req.admin._id,
            subcategories: subcategories?.map((sub) => ({
                name: sub,
                slug: sub.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
                isCustom: false,
                status: 'approved',
                isActive: true,
            })) || [],
        });
        await category.save();
        res.status(201).json({
            success: true,
            message: 'Category added successfully',
            data: category,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to add category',
        });
    }
};
exports.addDefaultCategory = addDefaultCategory;
