"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDefaultAdmin = exports.setupSupplierPassword = exports.supplierLogin = exports.adminLogin = void 0;
const Admin_1 = __importDefault(require("../models/Admin"));
const Supplier_1 = __importDefault(require("../models/Supplier"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jwt_1 = require("../utils/jwt");
const adminLogin = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Please provide email and password'
            });
        }
        const admin = await Admin_1.default.findOne({ email }).select('+password');
        if (!admin) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }
        const isPasswordMatch = await admin.comparePassword(password);
        if (!isPasswordMatch) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }
        if (!admin.isActive) {
            return res.status(403).json({
                success: false,
                message: 'Your account has been deactivated'
            });
        }
        const token = (0, jwt_1.generateToken)(String(admin._id), 'admin');
        res.json({
            success: true,
            token,
            user: {
                id: admin._id,
                name: admin.name,
                email: admin.email,
                role: admin.role
            }
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
exports.adminLogin = adminLogin;
const supplierLogin = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Please provide email and password'
            });
        }
        const supplier = await Supplier_1.default.findOne({ email }).select('+password');
        if (!supplier) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }
        if (supplier.status !== 'approved') {
            return res.status(403).json({
                success: false,
                message: `Your application is ${supplier.status}. Please wait for admin approval.`,
                status: supplier.status,
                rejectionReason: supplier.rejectionReason
            });
        }
        if (!supplier.password) {
            return res.status(400).json({
                success: false,
                message: 'Please set up your password first'
            });
        }
        const isPasswordMatch = await bcryptjs_1.default.compare(password, supplier.password);
        if (!isPasswordMatch) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }
        const token = (0, jwt_1.generateToken)(String(supplier._id), 'supplier');
        res.json({
            success: true,
            token,
            user: {
                id: supplier._id,
                companyName: supplier.companyName,
                email: supplier.email,
                status: supplier.status
            }
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
exports.supplierLogin = supplierLogin;
const setupSupplierPassword = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and password are required'
            });
        }
        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 6 characters long'
            });
        }
        const supplier = await Supplier_1.default.findOne({ email });
        if (!supplier) {
            return res.status(404).json({
                success: false,
                message: 'Supplier not found'
            });
        }
        if (supplier.status !== 'approved') {
            return res.status(403).json({
                success: false,
                message: 'Only approved suppliers can set up passwords'
            });
        }
        const salt = await bcryptjs_1.default.genSalt(10);
        supplier.password = await bcryptjs_1.default.hash(password, salt);
        await supplier.save();
        const token = (0, jwt_1.generateToken)(String(supplier._id), 'supplier');
        res.json({
            success: true,
            message: 'Password set up successfully',
            token,
            user: {
                id: supplier._id,
                companyName: supplier.companyName,
                email: supplier.email
            }
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
exports.setupSupplierPassword = setupSupplierPassword;
const createDefaultAdmin = async () => {
    try {
        const adminExists = await Admin_1.default.findOne({ email: process.env.ADMIN_EMAIL });
        if (!adminExists) {
            await Admin_1.default.create({
                name: 'System Admin',
                email: process.env.ADMIN_EMAIL || 'admin@matrixyuvraj.com',
                password: process.env.ADMIN_PASSWORD || 'Admin@123',
                role: 'super_admin'
            });
            console.log('✅ Default admin account created');
        }
    }
    catch (error) {
        console.error('Error creating default admin:', error);
    }
};
exports.createDefaultAdmin = createDefaultAdmin;
