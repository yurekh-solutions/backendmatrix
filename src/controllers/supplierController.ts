 import { Request, Response } from 'express';
import Supplier from '../models/Supplier';
import Lead from '../models/Lead';
import path from 'path';
import bcrypt from 'bcryptjs';
import cloudinary from '../config/cloudinary';

export const submitOnboarding = async (req: Request, res: Response) => {
  try {
    console.log('📥 Received onboarding submission');
    console.log('📋 Request headers:', req.headers);
    console.log('📋 Request body:', req.body);
    console.log('📎 Files received:', Object.keys(req.files || {}));
    console.log('📏 Content-Length:', req.headers['content-length']);
    
    const {
      companyName,
      email,
      phone,
      contactPerson,
      businessType,
      password,
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

    // Validate password
    if (!password) {
      console.error('❌ Password is required');
      return res.status(400).json({
        success: false,
        message: 'Password is required'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
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
    let logoUrl: string | undefined = undefined;
    
    if (files) {
      // Handle logo upload to Cloudinary (optional)
      if (files.logo && files.logo[0]) {
        try {
          console.log('📸 Uploading logo to Cloudinary...');
          const result = await cloudinary.uploader.upload(files.logo[0].path, {
            folder: 'supplier-logos',
            transformation: [
              { width: 200, height: 200, crop: 'fill', gravity: 'center' },
              { quality: 'auto' }
            ]
          });
          logoUrl = result.secure_url;
          console.log('✅ Logo uploaded successfully:', logoUrl);
        } catch (err) {
          console.error('❌ Error uploading logo:', err);
          // Logo upload is optional, continue even if it fails
        }
      }
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
          password: hashedPassword,
          address: JSON.parse(address),
          documents,
          businessDescription,
          productsOffered: JSON.parse(productsOffered),
          yearsInBusiness: Number(yearsInBusiness),
          ...(logoUrl && { logo: logoUrl }), // Only update logo if provided
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
        password: hashedPassword,
        address: JSON.parse(address),
        documents,
        businessDescription,
        productsOffered: JSON.parse(productsOffered),
        yearsInBusiness: Number(yearsInBusiness),
        ...(logoUrl && { logo: logoUrl }), // Only include logo if provided
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

// Get all inquiries (leads) for a supplier
export const getSupplierInquiries = async (req: any, res: Response) => {
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
    const inquiries = await Lead.find({ supplierId })
      .sort({ createdAt: -1 })
      .limit(500);

    // Transform leads to inquiry format
    const formattedInquiries = inquiries.map((inquiry: any) => ({
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
  } catch (error: any) {
    console.error('❌ Error fetching inquiries:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch inquiries'
    });
  }
};