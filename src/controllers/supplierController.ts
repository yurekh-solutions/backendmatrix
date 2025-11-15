import { Request, Response } from 'express';
import Supplier from '../models/Supplier';
import path from 'path';

export const submitOnboarding = async (req: Request, res: Response) => {
  try {
    console.log('📥 Received onboarding submission');
    console.log('📋 Request body:', req.body);
    console.log('📎 Files received:', Object.keys(req.files || {}));
    
    const {
      companyName,
      email,
      phone,
      contactPerson,
      businessType,
      address,
      businessDescription,
      productsOffered,
      yearsInBusiness
    } = req.body;
    
    // Validate required fields
    if (!companyName || !email || !phone || !contactPerson) {
      console.error('❌ Missing required fields');
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: companyName, email, phone, contactPerson'
      });
    }
    
    // Check if supplier already exists
    const existingSupplier = await Supplier.findOne({ email });
    if (existingSupplier && existingSupplier.status === 'approved') {
      console.log('⚠️ Supplier already exists and approved:', email);
      return res.status(400).json({
        success: false,
        message: 'A supplier with this email is already registered and approved'
      });
    }
    
    // Process uploaded files
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    const documents: any = {};
    
    if (files) {
      // PAN is required
      if (files.pan && files.pan[0]) {
        documents.pan = {
          fileUrl: `/uploads/${files.pan[0].filename}`,
          fileName: files.pan[0].originalname,
          uploadedAt: new Date()
        };
      } else {
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
      } else if (businessType === 'individual') {
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
      supplier = await Supplier.findByIdAndUpdate(
        existingSupplier._id,
        {
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
        },
        { new: true }
      );
    } else {
      // Create new supplier
      console.log('✨ Creating new supplier application:', email);
      supplier = await Supplier.create({
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
  } catch (error: any) {
    console.error('❌ Onboarding error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to submit application'
    });
  }
};

export const checkApplicationStatus = async (req: Request, res: Response) => {
  try {
    const { email } = req.query;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }
    
    const supplier = await Supplier.findOne({ email }).select('-password');
    
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
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
