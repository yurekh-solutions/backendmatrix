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
    
    // Collect missing fields for detailed error message
    const missingFields: string[] = [];
    
    // Validate required fields
    if (!companyName) missingFields.push('companyName');
    if (!email) missingFields.push('email');
    if (!phone) missingFields.push('phone');
    if (!contactPerson) missingFields.push('contactPerson');
    if (!password) missingFields.push('password');
    if (!businessDescription) missingFields.push('businessDescription');
    if (!productsOffered) missingFields.push('productsOffered');
    if (!yearsInBusiness) missingFields.push('yearsInBusiness');
    
    // Validate address field
    if (!address) {
      missingFields.push('address');
    } else {
      try {
        const parsedAddress = JSON.parse(address);
        if (!parsedAddress.street) missingFields.push('address.street');
        if (!parsedAddress.city) missingFields.push('address.city');
        if (!parsedAddress.state) missingFields.push('address.state');
        if (!parsedAddress.pincode) missingFields.push('address.pincode');
      } catch (e) {
        missingFields.push('address (invalid JSON)');
      }
    }
    
    if (missingFields.length > 0) {
      console.error('❌ Missing required fields:', missingFields);
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(', ')}`,
        missingFields
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
      
      // Optional documents - accept for all business types
      if (files.gst && files.gst[0]) {
        documents.gst = {
          fileUrl: `/uploads/${files.gst[0].filename}`,
          fileName: files.gst[0].originalname,
          uploadedAt: new Date()
        };
      }
      
      if (files.aadhaar && files.aadhaar[0]) {
        documents.aadhaar = {
          fileUrl: `/uploads/${files.aadhaar[0].filename}`,
          fileName: files.aadhaar[0].originalname,
          uploadedAt: new Date()
        };
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

// Update Supplier Profile
export const updateSupplierProfile = async (req: Request, res: Response) => {
  try {
    const supplierId = (req as any).user?.id;
    
    if (!supplierId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    console.log('📥 Updating supplier profile:', supplierId);
    console.log('📋 Request body:', req.body);

    const {
      companyName,
      phone,
      address,
      city,
      state,
      gstNumber,
      website,
      description
    } = req.body;

    // Build update object
    const updateData: any = {};
    if (companyName) updateData.companyName = companyName;
    if (phone) updateData.phone = phone;
    if (gstNumber) updateData.gstNumber = gstNumber;
    if (website) updateData.website = website;
    if (description) updateData.businessDescription = description;

    // Handle address
    if (address || city || state) {
      const supplier = await Supplier.findById(supplierId);
      const currentAddress = (supplier?.address || {}) as any;
      updateData.address = {
        ...currentAddress,
        street: address || currentAddress.street || '',
        city: city || currentAddress.city || '',
        state: state || currentAddress.state || ''
      };
    }

    // Handle logo upload
    if (req.file) {
      try {
        console.log('📸 Uploading new logo to Cloudinary...');
        const result = await cloudinary.uploader.upload(req.file.path, {
          folder: 'supplier-logos',
          transformation: [
            { width: 200, height: 200, crop: 'fill', gravity: 'center' },
            { quality: 'auto' }
          ]
        });
        updateData.logo = result.secure_url;
        console.log('✅ Logo uploaded:', result.secure_url);
      } catch (err) {
        console.error('❌ Error uploading logo:', err);
      }
    }

    // Update supplier
    const updatedSupplier = await Supplier.findByIdAndUpdate(
      supplierId,
      { $set: updateData },
      { new: true }
    );

    if (!updatedSupplier) {
      return res.status(404).json({
        success: false,
        message: 'Supplier not found'
      });
    }

    console.log('✅ Supplier profile updated:', updatedSupplier._id);

    res.json({
      success: true,
      message: 'Profile updated successfully',
      supplier: {
        id: updatedSupplier._id,
        companyName: updatedSupplier.companyName,
        email: updatedSupplier.email,
        phone: updatedSupplier.phone,
        logo: updatedSupplier.logo,
        address: updatedSupplier.address,
        gstNumber: (updatedSupplier as any).gstNumber,
        website: (updatedSupplier as any).website,
        businessDescription: updatedSupplier.businessDescription
      }
    });
  } catch (error: any) {
    console.error('❌ Error updating profile:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile'
    });
  }
};