"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.supplierAuth = exports.adminAuth = exports.authenticateSupplier = exports.authenticateAdmin = void 0;
const jwt_1 = require("../utils/jwt");
const Admin_1 = __importDefault(require("../models/Admin"));
const Supplier_1 = __importDefault(require("../models/Supplier"));
const authenticateAdmin = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ message: 'Authentication required' });
        }
        const decoded = (0, jwt_1.verifyToken)(token);
        if (!decoded || decoded.type !== 'admin') {
            return res.status(401).json({ message: 'Invalid admin token' });
        }
        const admin = await Admin_1.default.findById(decoded.id).select('-password');
        if (!admin || !admin.isActive) {
            return res.status(401).json({ message: 'Admin account not found or inactive' });
        }
        req.admin = admin;
        next();
    }
    catch (error) {
        res.status(401).json({ message: 'Authentication failed' });
    }
};
exports.authenticateAdmin = authenticateAdmin;
const authenticateSupplier = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        console.log('Auth attempt - Token received:', token ? 'Yes' : 'No');
        if (!token) {
            return res.status(401).json({ success: false, message: 'Authentication required' });
        }
        const decoded = (0, jwt_1.verifyToken)(token);
        console.log('Token decoded:', decoded);
        if (!decoded || decoded.type !== 'supplier') {
            console.log('Token validation failed:', { decoded, type: decoded?.type });
            return res.status(401).json({ success: false, message: 'Invalid supplier token' });
        }
        const supplier = await Supplier_1.default.findById(decoded.id).select('-password');
        console.log('Supplier found:', supplier ? supplier.email : 'Not found', 'isActive:', supplier?.isActive, 'status:', supplier?.status);
        if (!supplier) {
            console.log('Supplier not found with ID:', decoded.id);
            return res.status(401).json({ success: false, message: 'Supplier account not found' });
        }
        if (!supplier.isActive) {
            console.log('Supplier inactive:', supplier.email);
            return res.status(401).json({ success: false, message: 'Supplier account is inactive' });
        }
        // Allow approved suppliers to access all features
        // Pending suppliers can add products but need admin approval
        if (supplier.status === 'rejected') {
            console.log('Supplier rejected:', supplier.email);
            return res.status(403).json({ success: false, message: 'Supplier account has been rejected' });
        }
        console.log('✅ Supplier authenticated successfully:', supplier.email);
        req.supplier = supplier;
        next();
    }
    catch (error) {
        console.error('Supplier auth error:', error);
        res.status(401).json({ success: false, message: 'Authentication failed' });
    }
};
exports.authenticateSupplier = authenticateSupplier;
// Export aliases
exports.adminAuth = exports.authenticateAdmin;
exports.supplierAuth = exports.authenticateSupplier;
