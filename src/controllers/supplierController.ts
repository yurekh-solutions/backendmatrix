 import { Request, Response } from 'express';
import Supplier from '../models/Supplier';
import Lead from '../models/Lead';
import MaterialInquiry from '../models/MaterialInquiry';
import RFQ from '../models/RFQ';
import InquiryMessage from '../models/InquiryMessage';
import path from 'path';
import bcrypt from 'bcryptjs';
import cloudinary from '../config/cloudinary';
import { generateWhatsAppWebURL } from '../utils/whatsappService';

// RitzYard admin WhatsApp number for all notifications
const RITZYARD_ADMIN_PHONE = process.env.RITZYARD_ADMIN_PHONE || '919136242706';

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

    // Get supplier's approved categories
    const supplier = await Supplier.findById(supplierId).select('productsOffered status');
    const supplierCategories: string[] = (supplier?.productsOffered || []).map((p: string) => p.toLowerCase());

    // 1. Lead-based inquiries (directly assigned)
    const leads = await Lead.find({ supplierId })
      .sort({ createdAt: -1 })
      .limit(200);

    const leadInquiries = leads.map((inquiry: any) => {
      // Use inquiryRef if present (set by routing service), else use _id as thread key
      const chatThreadId = inquiry.inquiryRef || inquiry._id.toString();
      return {
        _id: inquiry._id,
        sourceType: 'lead',
        chatThreadId,
        productId: inquiry.productId || 'N/A',
        productName: inquiry.productName || inquiry.company || 'Product Inquiry',
        buyerName: inquiry.name || 'Buyer',
        buyerEmail: '(Protected by RitzYard)',
        buyerPhone: 'Contact via RitzYard Portal',
        buyerCompany: inquiry.company || 'Individual',
        quantity: inquiry.quantity || 0,
        unit: inquiry.unit || 'units',
        budget: inquiry.budget || `₹${(inquiry.potential || 0).toLocaleString()}`,
        description: inquiry.message || inquiry.description || `Inquiry for ${inquiry.company || 'product'}`,
        status: inquiry.status === 'new' ? 'new' : inquiry.status === 'contacted' ? 'responded' : inquiry.status === 'qualified' ? 'quoted' : 'converted',
        score: inquiry.score || 50,
        tags: inquiry.tags || [],
        createdAt: inquiry.createdAt,
        updatedAt: inquiry.updatedAt
      };
    });

    // 2. Material Inquiries matching supplier categories (only if supplier is approved)
    let materialInquiries: any[] = [];
    let rfqInquiries: any[] = [];

    if (supplier?.status === 'approved' && supplierCategories.length > 0) {
      // Build regex patterns to match categories loosely
      const categoryPatterns = supplierCategories.map((c: string) => new RegExp(c.replace(/[-/]/g, '.'), 'i'));

      const miDocs = await MaterialInquiry.find({
        'materials.category': { $in: categoryPatterns }
      }).sort({ createdAt: -1 }).limit(100);

      materialInquiries = miDocs.map((mi: any) => {
        const firstMat = mi.materials[0] || {};
        const allMats = mi.materials.map((m: any) => `${m.materialName} (${m.quantity} ${m.unit})`).join(', ');
        return {
          _id: `mi_${mi._id}`,
          sourceType: 'material_inquiry',
          chatThreadId: mi.inquiryNumber,
          inquiryNumber: mi.inquiryNumber,
          productId: mi._id.toString(),
          productName: firstMat.materialName || 'Material Inquiry',
          buyerName: mi.customerName || 'Buyer',
          buyerEmail: '(Protected by RitzYard)',
          buyerPhone: 'Contact via RitzYard Portal',
          buyerCompany: mi.companyName || 'Individual',
          quantity: firstMat.quantity || 0,
          unit: firstMat.unit || 'MT',
          budget: mi.totalEstimatedValue ? `₹${mi.totalEstimatedValue.toLocaleString()}` : 'Open to quotes',
          description: `Materials needed: ${allMats}. Delivery: ${mi.deliveryLocation}.${mi.additionalRequirements ? ' ' + mi.additionalRequirements : ''}`,
          status: mi.status === 'new' ? 'new' : mi.status === 'quoted' ? 'quoted' : mi.status === 'accepted' ? 'converted' : 'new',
          score: 70,
          tags: mi.materials.map((m: any) => m.category).filter((v: string, i: number, a: string[]) => a.indexOf(v) === i),
          createdAt: mi.createdAt,
          updatedAt: mi.updatedAt
        };
      });

      // 3. RFQ matching supplier categories
      const rfqDocs = await RFQ.find({
        productCategory: { $in: categoryPatterns }
      }).sort({ createdAt: -1 }).limit(100);

      rfqInquiries = rfqDocs.map((rfq: any) => ({
        _id: `rfq_${rfq._id}`,
        sourceType: 'rfq',
        chatThreadId: rfq.inquiryNumber,
        inquiryNumber: rfq.inquiryNumber,
        productId: rfq._id.toString(),
        productName: rfq.productName || rfq.productCategory || 'RFQ',
        buyerName: rfq.customerName || 'Buyer',
        buyerEmail: '(Protected by RitzYard)',
        buyerPhone: 'Contact via RitzYard Portal',
        buyerCompany: rfq.company || 'Individual',
        quantity: rfq.quantity || 0,
        unit: rfq.unit || 'MT',
        budget: 'Open to quotes',
        description: `RFQ for ${rfq.productName} (${rfq.productCategory}). Qty: ${rfq.quantity} ${rfq.unit}. Location: ${rfq.deliveryLocation}.${rfq.specifications ? ' Specs: ' + rfq.specifications : ''}`,
        status: rfq.status === 'pending' ? 'new' : rfq.status === 'quoted' ? 'quoted' : rfq.status === 'accepted' ? 'converted' : 'responded',
        score: 65,
        tags: [rfq.productCategory].filter(Boolean),
        createdAt: rfq.createdAt,
        updatedAt: rfq.updatedAt
      }));
    }

    // Merge all, deduplicate by _id, sort newest first
    const allInquiries = [...leadInquiries, ...materialInquiries, ...rfqInquiries]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Attach unread message counts per thread
    const threadIds = allInquiries
      .map((i: any) => i.chatThreadId)
      .filter(Boolean);

    const unreadCounts: Record<string, number> = {};
    if (threadIds.length > 0) {
      const unreadAgg = await InquiryMessage.aggregate([
        {
          $match: {
            inquiryId: { $in: threadIds },
            senderRole: 'buyer',
            readBy: { $ne: supplierId.toString() },
          },
        },
        { $group: { _id: '$inquiryId', count: { $sum: 1 } } },
      ]);
      for (const row of unreadAgg) {
        unreadCounts[row._id] = row.count;
      }
    }

    const allWithUnread = allInquiries.map((i: any) => ({
      ...i,
      unreadMessages: unreadCounts[i.chatThreadId] || 0,
    }));

    // Calculate stats
    const stats = {
      total: allWithUnread.length,
      new: allWithUnread.filter((i: any) => i.status === 'new').length,
      responded: allWithUnread.filter((i: any) => i.status === 'responded').length,
      qualified: allWithUnread.filter((i: any) => i.status === 'quoted').length,
      converted: allWithUnread.filter((i: any) => i.status === 'converted').length,
    };

    console.log(`✅ Found ${leadInquiries.length} leads + ${materialInquiries.length} MIs + ${rfqInquiries.length} RFQs = ${allWithUnread.length} total`);

    res.json({
      success: true,
      inquiries: allWithUnread,
      count: allWithUnread.length,
      stats
    });
  } catch (error: any) {
    console.error('❌ Error fetching inquiries:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch inquiries'
    });
  }
};

// Get unread/new inquiry count for notification badge
export const getUnreadInquiryCount = async (req: any, res: Response) => {
  try {
    const supplierId = req.supplier?._id;
    
    if (!supplierId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    const unreadCount = await Lead.countDocuments({ 
      supplierId, 
      status: 'new' 
    });

    res.json({
      success: true,
      unreadCount
    });
  } catch (error: any) {
    console.error('❌ Error fetching unread count:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch unread count'
    });
  }
};

// Respond to an inquiry (update lead status and add note)
export const respondToInquiry = async (req: any, res: Response) => {
  try {
    const supplierId = req.supplier?._id;
    const { inquiryId } = req.params;
    const { message, quotedPrice, status } = req.body;
    
    if (!supplierId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    const lead = await Lead.findOne({ _id: inquiryId, supplierId });
    
    if (!lead) {
      return res.status(404).json({
        success: false,
        message: 'Inquiry not found'
      });
    }

    // Update lead status
    lead.status = status || 'contacted';
    
    // Store quoted price and message on the lead
    if (quotedPrice) {
      (lead as any).quotedPrice = parseFloat(quotedPrice);
      (lead as any).quoteStatus = 'pending_admin';
    }
    if (message) {
      (lead as any).quoteMessage = message;
      lead.tags = [...(lead.tags || []), `Quote: ${message.substring(0, 50)}`];
    }
    
    await lead.save();

    // Get supplier info for notification
    const supplier = await Supplier.findById(supplierId).select('companyName');
    const supplierName = supplier?.companyName || 'Supplier';

    // Notify RitzYard admin via WhatsApp (fire and forget)
    try {
      const adminMsg = `🏭 *QUOTE RECEIVED - RitzYard Marketplace*\n\n` +
        `📋 Inquiry Lead: ${lead._id}\n` +
        `🏢 Supplier: ${supplierName}\n` +
        `📦 Product: ${(lead as any).productName || 'Product Inquiry'}\n` +
        (quotedPrice ? `💰 Quoted Price: ₹${parseFloat(quotedPrice).toLocaleString()}\n` : '') +
        (message ? `💬 Message: ${message.substring(0, 100)}\n` : '') +
        `\n👉 Login to Admin Panel to review and approve this quote.`;
      const waUrl = generateWhatsAppWebURL(RITZYARD_ADMIN_PHONE, adminMsg);
      console.log('📲 Admin WhatsApp notification URL:', waUrl.substring(0, 80) + '...');
    } catch (notifyErr) {
      console.warn('WhatsApp notify failed (non-blocking):', notifyErr);
    }

    console.log(`✅ Inquiry ${inquiryId} updated by supplier ${supplierId}`);

    res.json({
      success: true,
      message: 'Response recorded successfully',
      data: {
        inquiryId,
        status: lead.status,
        quotedPrice
      }
    });
  } catch (error: any) {
    console.error('❌ Error responding to inquiry:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to respond to inquiry'
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