"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkApplicationStatus = exports.submitOnboarding = void 0;
const Supplier_1 = __importDefault(require("../models/Supplier"));
const submitOnboarding = async (req, res) => {
    try {
        const { companyName, email, phone, contactPerson, businessType, address, businessDescription, productsOffered, yearsInBusiness } = req.body;
        // Check if supplier already exists
        const existingSupplier = await Supplier_1.default.findOne({ email });
        if (existingSupplier && existingSupplier.status === 'approved') {
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
        res.status(201).json({
            success: true,
            message: 'Supplier onboarding application submitted successfully',
            data: supplier
        });
    }
    catch (error) {
        console.error('Onboarding error:', error);
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
