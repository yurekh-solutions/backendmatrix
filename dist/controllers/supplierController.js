"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSupplierInquiries = exports.checkApplicationStatus = exports.submitOnboarding = void 0;
const Supplier_1 = __importDefault(require("../models/Supplier"));
const Lead_1 = __importDefault(require("../models/Lead"));
const submitOnboarding = async (req, res) => {
    try {
        console.log('📥 Received onboarding submission');
        console.log('📋 Request body:', req.body);
        console.log('📎 Files received:', Object.keys(req.files || {}));
        const { companyName, email, phone, contactPerson, businessType, address, businessDescription, productsOffered, yearsInBusiness } = req.body;
        // Validate required fields
        if (!companyName || !email || !phone || !contactPerson) {
            console.error('❌ Missing required fields');
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: companyName, email, phone, contactPerson'
            });
        }
        // Check if supplier already exists
        const existingSupplier = await Supplier_1.default.findOne({ email });
        if (existingSupplier && existingSupplier.status === 'approved') {
            console.log('⚠️ Supplier already exists and approved:', email);
            return res.status(400).json({
                success: false,
                message: 'A supplier with this email is already registered and approved'
            });
        }
        // Process uploaded files
        const files = req.files;
        const documents = {};
        if (files) {
            // PAN is required
            if (files.pan && files.pan[0]) {
                documents.pan = {
                    fileUrl: `/uploads/${files.pan[0].filename}`,
                    fileName: files.pan[0].originalname,
                    uploadedAt: new Date()
                };
            }
            else {
                return res.status(400).json({
                    success: false,
                    message: 'PAN document is required'
                });
            }
            // Optional documents based on business type
            if (businessType === 'business') {
                if (files.gst && files.gst[0]) {
                    documents.gst = {
                        fileUrl: `/uploads/${files.gst[0].filename}`,
                        fileName: files.gst[0].originalname,
                        uploadedAt: new Date()
                    };
                }
                if (files.cin && files.cin[0]) {
                    documents.cin = {
                        fileUrl: `/uploads/${files.cin[0].filename}`,
                        fileName: files.cin[0].originalname,
                        uploadedAt: new Date()
                    };
                }
                if (files.businessLicense && files.businessLicense[0]) {
                    documents.businessLicense = {
                        fileUrl: `/uploads/${files.businessLicense[0].filename}`,
                        fileName: files.businessLicense[0].originalname,
                        uploadedAt: new Date()
                    };
                }
            }
            else if (businessType === 'individual') {
                if (files.aadhaar && files.aadhaar[0]) {
                    documents.aadhaar = {
                        fileUrl: `/uploads/${files.aadhaar[0].filename}`,
                        fileName: files.aadhaar[0].originalname,
                        uploadedAt: new Date()
                    };
                }
            }
            if (files.bankProof && files.bankProof[0]) {
                documents.bankProof = {
                    fileUrl: `/uploads/${files.bankProof[0].filename}`,
                    fileName: files.bankProof[0].originalname,
                    uploadedAt: new Date()
                };
            }
        }
        // Create or update supplier
        let supplier;
        if (existingSupplier) {
            // Update existing (for reapplication)
            console.log('🔄 Updating existing supplier application:', email);
            supplier = await Supplier_1.default.findByIdAndUpdate(existingSupplier._id, {
                companyName,
                phone,
                contactPerson,
                businessType,
                address: JSON.parse(address),
                documents,
                businessDescription,
                productsOffered: JSON.parse(productsOffered),
                yearsInBusiness: Number(yearsInBusiness),
                status: 'pending',
                rejectionReason: undefined,
                submittedAt: new Date(),
                lastModified: new Date()
            }, { new: true });
        }
        else {
            // Create new supplier
            console.log('✨ Creating new supplier application:', email);
            supplier = await Supplier_1.default.create({
                companyName,
                email,
                phone,
                contactPerson,
                businessType,
                address: JSON.parse(address),
                documents,
                businessDescription,
                productsOffered: JSON.parse(productsOffered),
                yearsInBusiness: Number(yearsInBusiness),
                status: 'pending'
            });
        }
        console.log('✅ Supplier application submitted successfully:', supplier._id);
        res.status(201).json({
            success: true,
            message: 'Supplier onboarding application submitted successfully',
            data: supplier
        });
    }
    catch (error) {
        console.error('❌ Onboarding error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to submit application'
        });
    }
};
exports.submitOnboarding = submitOnboarding;
const checkApplicationStatus = async (req, res) => {
    try {
        const { email } = req.query;
        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Email is required'
            });
        }
        const supplier = await Supplier_1.default.findOne({ email }).select('-password');
        if (!supplier) {
            return res.json({
                success: true,
                exists: false,
                message: 'No application found with this email'
            });
        }
        res.json({
            success: true,
            exists: true,
            data: {
                status: supplier.status,
                email: supplier.email,
                companyName: supplier.companyName,
                submittedAt: supplier.submittedAt,
                rejectionReason: supplier.rejectionReason,
                reviewedAt: supplier.reviewedAt
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
exports.checkApplicationStatus = checkApplicationStatus;
// Get all inquiries (leads) for a supplier
const getSupplierInquiries = async (req, res) => {
    try {
        const supplierId = req.supplier?._id;
        if (!supplierId) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized'
            });
        }
        console.log('🚀 Fetching inquiries for supplier:', supplierId);
        // Fetch all leads for this supplier
        const inquiries = await Lead_1.default.find({ supplierId })
            .sort({ createdAt: -1 })
            .limit(500);
        // Transform leads to inquiry format
        const formattedInquiries = inquiries.map((inquiry) => ({
            _id: inquiry._id,
            productId: inquiry.productId || 'N/A',
            productName: inquiry.productName || inquiry.company || 'Product Inquiry',
            buyerName: inquiry.name || 'Buyer',
            buyerEmail: inquiry.email || 'N/A',
            quantity: inquiry.quantity || 0,
            unit: inquiry.unit || 'units',
            budget: inquiry.budget || `₹${(inquiry.potential || 0).toLocaleString()}`,
            description: inquiry.description || `Inquiry for ${inquiry.company || 'product'}`,
            status: inquiry.status === 'new' ? 'new' : inquiry.status === 'contacted' ? 'responded' : inquiry.status === 'qualified' ? 'quoted' : 'converted',
            createdAt: inquiry.createdAt,
            updatedAt: inquiry.updatedAt
        }));
        console.log(`✅ Found ${formattedInquiries.length} inquiries`);
        res.json({
            success: true,
            inquiries: formattedInquiries,
            count: formattedInquiries.length
        });
    }
    catch (error) {
        console.error('❌ Error fetching inquiries:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch inquiries'
        });
    }
};
exports.getSupplierInquiries = getSupplierInquiries;
