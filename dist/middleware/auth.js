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
        if (!token) {
            return res.status(401).json({ message: 'Authentication required' });
        }
        const decoded = (0, jwt_1.verifyToken)(token);
        if (!decoded || decoded.type !== 'supplier') {
            return res.status(401).json({ message: 'Invalid supplier token' });
        }
        const supplier = await Supplier_1.default.findById(decoded.id).select('-password');
        if (!supplier || !supplier.isActive) {
            return res.status(401).json({ message: 'Supplier account not found or inactive' });
        }
        if (supplier.status !== 'approved') {
            return res.status(403).json({ message: 'Supplier account not approved' });
        }
        req.supplier = supplier;
        next();
    }
    catch (error) {
        res.status(401).json({ message: 'Authentication failed' });
    }
};
exports.authenticateSupplier = authenticateSupplier;
// Export aliases
exports.adminAuth = exports.authenticateAdmin;
exports.supplierAuth = exports.authenticateSupplier;
