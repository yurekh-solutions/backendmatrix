/**
 * Inquiry Routing Service
 * 
 * Automatically routes buyer inquiries to matching suppliers based on:
 * 1. Product category match
 * 2. Supplier's productsOffered array
 * 3. Products the supplier has listed
 * 
 * Creates Lead records for matched suppliers and sends notifications.
 */

import Supplier from '../models/Supplier';
import Product from '../models/Product';
import Lead from '../models/Lead';
import { generateWhatsAppWebURL } from '../utils/whatsappService';
import mongoose from 'mongoose';

interface MaterialItem {
  materialName: string;
  category: string;
  quantity: number;
  unit: string;
  targetPrice?: number;
}

interface InquiryData {
  inquiryId: string;
  inquiryNumber: string;
  customerName: string;
  companyName?: string;
  email: string;
  phone: string;
  materials: MaterialItem[];
  deliveryLocation: string;
  totalEstimatedValue?: number;
}

interface MatchedSupplier {
  supplierId: mongoose.Types.ObjectId;
  companyName: string;
  email: string;
  phone: string;
  matchScore: number;
  matchedCategories: string[];
}

/**
 * Find suppliers that match the inquiry based on categories
 */
export async function findMatchingSuppliers(materials: MaterialItem[]): Promise<MatchedSupplier[]> {
  // Extract unique categories from materials
  const categories = [...new Set(materials.map(m => m.category.toLowerCase()))];
  
  console.log('🔍 Finding suppliers for categories:', categories);

  // Find approved suppliers who offer these categories
  const matchingSuppliers: MatchedSupplier[] = [];

  // Strategy 1: Match by supplier's productsOffered array
  const suppliersByProducts = await Supplier.find({
    status: 'approved',
    isActive: true,
    productsOffered: { 
      $elemMatch: { 
        $regex: new RegExp(categories.join('|'), 'i') 
      } 
    }
  });

  for (const supplier of suppliersByProducts) {
    const matchedCats = supplier.productsOffered.filter(p => 
      categories.some(c => p.toLowerCase().includes(c))
    );
    
    matchingSuppliers.push({
      supplierId: supplier._id as mongoose.Types.ObjectId,
      companyName: supplier.companyName,
      email: supplier.email,
      phone: supplier.phone,
      matchScore: matchedCats.length * 10,
      matchedCategories: matchedCats
    });
  }

  // Strategy 2: Match by products the supplier has listed
  const productMatches = await Product.aggregate([
    {
      $match: {
        status: 'active',
        category: { $regex: new RegExp(categories.join('|'), 'i') }
      }
    },
    {
      $group: {
        _id: '$supplierId',
        matchedProducts: { $addToSet: '$category' },
        productCount: { $sum: 1 }
      }
    },
    {
      $lookup: {
        from: 'suppliers',
        localField: '_id',
        foreignField: '_id',
        as: 'supplier'
      }
    },
    { $unwind: '$supplier' },
    {
      $match: {
        'supplier.status': 'approved',
        'supplier.isActive': true
      }
    }
  ]);

  for (const match of productMatches) {
    const existing = matchingSuppliers.find(
      s => s.supplierId.toString() === match._id.toString()
    );

    if (existing) {
      // Boost score for suppliers with actual products
      existing.matchScore += match.productCount * 5;
      existing.matchedCategories = [
        ...new Set([...existing.matchedCategories, ...match.matchedProducts])
      ];
    } else {
      matchingSuppliers.push({
        supplierId: match._id,
        companyName: match.supplier.companyName,
        email: match.supplier.email,
        phone: match.supplier.phone,
        matchScore: match.productCount * 5,
        matchedCategories: match.matchedProducts
      });
    }
  }

  // Sort by match score (highest first)
  matchingSuppliers.sort((a, b) => b.matchScore - a.matchScore);

  console.log(`✅ Found ${matchingSuppliers.length} matching suppliers`);
  return matchingSuppliers;
}

/**
 * Create Lead records for matched suppliers
 */
export async function createLeadsForSuppliers(
  inquiry: InquiryData,
  matchedSuppliers: MatchedSupplier[]
): Promise<{ created: number; supplierIds: string[] }> {
  const createdLeads: string[] = [];

  for (const supplier of matchedSuppliers) {
    try {
      // Check if lead already exists for this inquiry + supplier combo
      const existingLead = await Lead.findOne({
        supplierId: supplier.supplierId,
        email: inquiry.email,
        message: { $regex: inquiry.inquiryNumber }
      });

      if (existingLead) {
        console.log(`⏭️  Lead already exists for ${supplier.companyName}`);
        continue;
      }

      // Calculate lead score based on inquiry value and match
      let score = 50; // Base score
      if (inquiry.totalEstimatedValue) {
        if (inquiry.totalEstimatedValue > 1000000) score = 90;
        else if (inquiry.totalEstimatedValue > 500000) score = 80;
        else if (inquiry.totalEstimatedValue > 100000) score = 70;
        else score = 60;
      }
      score = Math.min(score + supplier.matchScore, 100);

      // Create lead with detailed material info
      const materialsList = inquiry.materials
        .map(m => `${m.materialName} (${m.quantity} ${m.unit})`)
        .join(', ');

      const lead = new Lead({
        supplierId: supplier.supplierId,
        name: inquiry.customerName,
        email: inquiry.email,
        phone: inquiry.phone,
        company: inquiry.companyName || 'Individual',
        message: `[Inquiry #${inquiry.inquiryNumber}] Looking for: ${materialsList}. Delivery: ${inquiry.deliveryLocation}`,
        source: 'website',
        score,
        status: 'new',
        tags: [
          ...supplier.matchedCategories.slice(0, 3),
          inquiry.totalEstimatedValue && inquiry.totalEstimatedValue > 500000 ? 'high-value' : 'standard'
        ]
      });

      await lead.save();
      createdLeads.push(supplier.supplierId.toString());
      console.log(`✅ Created lead for ${supplier.companyName} (Score: ${score})`);

    } catch (error: any) {
      console.error(`❌ Failed to create lead for ${supplier.companyName}:`, error.message);
    }
  }

  return {
    created: createdLeads.length,
    supplierIds: createdLeads
  };
}

/**
 * Generate WhatsApp notification message for supplier
 */
function formatSupplierNotification(inquiry: InquiryData, matchedCategories: string[]): string {
  let message = `🔔 *NEW INQUIRY ALERT* - RitzYard Marketplace\n\n`;
  message += `📋 *Inquiry #:* ${inquiry.inquiryNumber}\n\n`;

  message += `*Buyer Details:*\n`;
  message += `👤 ${inquiry.customerName}\n`;
  if (inquiry.companyName) {
    message += `🏢 ${inquiry.companyName}\n`;
  }
  message += `📍 ${inquiry.deliveryLocation}\n`;
  message += `📧 ${inquiry.email}\n`;
  message += `📱 ${inquiry.phone}\n\n`;

  message += `*Materials Required:*\n`;
  inquiry.materials.forEach((m, i) => {
    message += `${i + 1}. ${m.materialName} - ${m.quantity} ${m.unit}\n`;
  });

  if (inquiry.totalEstimatedValue) {
    message += `\n💰 *Estimated Value:* ₹${inquiry.totalEstimatedValue.toLocaleString()}\n`;
  }

  message += `\n🎯 *Why you?* You supply: ${matchedCategories.join(', ')}\n\n`;
  message += `👉 *Login to Supplier Portal to respond with your quotation.*\n`;
  message += `_Fast response = Higher conversion rate!_`;

  return message;
}

/**
 * Send WhatsApp notifications to matched suppliers
 */
export async function notifySuppliers(
  inquiry: InquiryData,
  matchedSuppliers: MatchedSupplier[]
): Promise<{ notified: number; urls: Array<{ supplier: string; url: string }> }> {
  const notifications: Array<{ supplier: string; url: string }> = [];

  for (const supplier of matchedSuppliers.slice(0, 5)) { // Notify top 5 suppliers
    try {
      const message = formatSupplierNotification(inquiry, supplier.matchedCategories);
      
      // Format phone number (add 91 if needed)
      let phone = supplier.phone.replace(/\D/g, '');
      if (!phone.startsWith('91') && phone.length === 10) {
        phone = '91' + phone;
      }

      const whatsappUrl = generateWhatsAppWebURL(phone, message);
      
      notifications.push({
        supplier: supplier.companyName,
        url: whatsappUrl
      });

      console.log(`📲 WhatsApp URL generated for ${supplier.companyName}`);
      console.log(`   Phone: ${phone}`);
      console.log(`   URL: ${whatsappUrl.substring(0, 80)}...`);

    } catch (error: any) {
      console.error(`❌ Failed to notify ${supplier.companyName}:`, error.message);
    }
  }

  return {
    notified: notifications.length,
    urls: notifications
  };
}

/**
 * Main function: Route inquiry to suppliers
 * Call this after an inquiry is saved to database
 */
export async function routeInquiryToSuppliers(inquiry: InquiryData): Promise<{
  matchedSuppliers: number;
  leadsCreated: number;
  suppliersNotified: number;
  whatsappUrls: Array<{ supplier: string; url: string }>;
}> {
  console.log('\n' + '='.repeat(60));
  console.log('🚀 ROUTING INQUIRY TO SUPPLIERS');
  console.log('='.repeat(60));
  console.log('Inquiry #:', inquiry.inquiryNumber);
  console.log('Customer:', inquiry.customerName);
  console.log('Materials:', inquiry.materials.map(m => m.materialName).join(', '));
  console.log('='.repeat(60));

  // Step 1: Find matching suppliers
  const matchedSuppliers = await findMatchingSuppliers(inquiry.materials);
  
  if (matchedSuppliers.length === 0) {
    console.log('⚠️  No matching suppliers found');
    return {
      matchedSuppliers: 0,
      leadsCreated: 0,
      suppliersNotified: 0,
      whatsappUrls: []
    };
  }

  // Step 2: Create leads for matched suppliers
  const leadsResult = await createLeadsForSuppliers(inquiry, matchedSuppliers);

  // Step 3: Notify suppliers via WhatsApp
  const notifyResult = await notifySuppliers(inquiry, matchedSuppliers);

  console.log('\n' + '='.repeat(60));
  console.log('✅ INQUIRY ROUTING COMPLETE');
  console.log('='.repeat(60));
  console.log(`📊 Matched Suppliers: ${matchedSuppliers.length}`);
  console.log(`📝 Leads Created: ${leadsResult.created}`);
  console.log(`📲 WhatsApp URLs: ${notifyResult.notified}`);
  console.log('='.repeat(60) + '\n');

  return {
    matchedSuppliers: matchedSuppliers.length,
    leadsCreated: leadsResult.created,
    suppliersNotified: notifyResult.notified,
    whatsappUrls: notifyResult.urls
  };
}

export default {
  findMatchingSuppliers,
  createLeadsForSuppliers,
  notifySuppliers,
  routeInquiryToSuppliers
};
