import { Request, Response } from 'express';
import MaterialInquiry from '../models/MaterialInquiry';
import RFQ from '../models/RFQ';

/**
 * WhatsApp Webhook Controller
 * Receives incoming WhatsApp messages and automatically creates inquiries
 */

// Webhook verification (for WhatsApp Business API)
export const verifyWebhook = (req: Request, res: Response) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'matrixyuvraj_whatsapp_token_2025';

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('✅ WhatsApp Webhook Verified!');
    res.status(200).send(challenge);
  } else {
    console.error('❌ WhatsApp Webhook Verification Failed!');
    res.sendStatus(403);
  }
};

// Receive incoming WhatsApp messages
export const receiveWhatsAppMessage = async (req: Request, res: Response) => {
  try {
    console.log('📱 Received WhatsApp Webhook:', JSON.stringify(req.body, null, 2));

    const body = req.body;

    // WhatsApp sends array of entries
    if (body.object === 'whatsapp_business_account') {
      const entries = body.entry;

      for (const entry of entries) {
        const changes = entry.changes;

        for (const change of changes) {
          const value = change.value;

          // Check if there are messages
          if (value.messages && value.messages.length > 0) {
            const message = value.messages[0];
            const from = message.from; // Customer phone number
            const messageBody = message.text?.body || '';
            const timestamp = message.timestamp;

            console.log(`\n📩 New WhatsApp Message`);
            console.log(`From: ${from}`);
            console.log(`Message: ${messageBody}`);
            console.log(`Time: ${new Date(parseInt(timestamp) * 1000).toLocaleString()}`);

            // Parse the message and create inquiry
            await parseAndCreateInquiry(from, messageBody, timestamp);
          }
        }
      }
    }

    res.sendStatus(200);
  } catch (error: any) {
    console.error('❌ Error processing WhatsApp webhook:', error.message);
    res.sendStatus(500);
  }
};

// Parse WhatsApp message and create inquiry
async function parseAndCreateInquiry(phoneNumber: string, messageText: string, timestamp: string) {
  try {
    // Check if message contains quotation request keywords
    const quotationKeywords = ['quotation', 'quote', 'price', 'inquiry', 'material', 'need', 'cement', 'steel', 'brick'];
    const containsQuotationRequest = quotationKeywords.some(keyword => 
      messageText.toLowerCase().includes(keyword)
    );

    if (!containsQuotationRequest) {
      console.log('⚠️  Message does not appear to be a quotation request. Skipping.');
      return;
    }

    // Extract information from message
    const parsedData = parseWhatsAppMessage(messageText);

    // Create Material Inquiry
    const inquiry = new MaterialInquiry({
      customerName: parsedData.customerName || 'WhatsApp Customer',
      companyName: parsedData.companyName,
      email: parsedData.email || `whatsapp_${phoneNumber.replace('+', '')}@customer.temp`,
      phone: phoneNumber,
      materials: parsedData.materials.length > 0 ? parsedData.materials : [
        {
          materialName: parsedData.productName || 'Material from WhatsApp',
          category: 'General',
          quantity: parsedData.quantity || 1,
          unit: parsedData.unit || 'units',
          specification: messageText.substring(0, 500), // Store original message
        }
      ],
      deliveryLocation: parsedData.location || 'To be confirmed',
      totalEstimatedValue: parsedData.estimatedValue,
      additionalRequirements: `Source: WhatsApp Message\nOriginal Message: ${messageText}`,
      status: 'new',
      priority: 'medium',
    });

    const savedInquiry = await inquiry.save();

    console.log('✅ Material Inquiry created from WhatsApp!');
    console.log(`📋 Inquiry Number: ${savedInquiry.inquiryNumber}`);
    console.log(`🆔 Database ID: ${savedInquiry._id}`);
    console.log(`👤 Customer Phone: ${phoneNumber}`);
    
  } catch (error: any) {
    console.error('❌ Error creating inquiry from WhatsApp:', error.message);
  }
}

// Parse WhatsApp message to extract structured data
function parseWhatsAppMessage(message: string): any {
  const lines = message.split('\n');
  
  const data: any = {
    customerName: null,
    companyName: null,
    email: null,
    phone: null,
    productName: null,
    materials: [],
    quantity: null,
    unit: 'units',
    location: null,
    estimatedValue: null,
  };

  // Extract common patterns
  for (const line of lines) {
    const lowerLine = line.toLowerCase();

    // Customer Name
    if (lowerLine.includes('name:') || lowerLine.includes('customer:')) {
      data.customerName = line.split(':')[1]?.trim();
    }

    // Company
    if (lowerLine.includes('company:') || lowerLine.includes('firm:')) {
      data.companyName = line.split(':')[1]?.trim();
    }

    // Email
    if (lowerLine.includes('email:')) {
      data.email = line.split(':')[1]?.trim();
    }

    // Phone
    if (lowerLine.includes('phone:') || lowerLine.includes('mobile:')) {
      data.phone = line.split(':')[1]?.trim();
    }

    // Product/Material
    if (lowerLine.includes('product:') || lowerLine.includes('material:')) {
      data.productName = line.split(':')[1]?.trim();
    }

    // Quantity
    if (lowerLine.includes('quantity:') || lowerLine.includes('qty:')) {
      const qtyText = line.split(':')[1]?.trim();
      const qtyMatch = qtyText?.match(/(\d+\.?\d*)\s*(\w+)?/);
      if (qtyMatch) {
        data.quantity = parseFloat(qtyMatch[1]);
        data.unit = qtyMatch[2] || 'units';
      }
    }

    // Location
    if (lowerLine.includes('location:') || lowerLine.includes('delivery:')) {
      data.location = line.split(':')[1]?.trim();
    }
  }

  // If product name found, create material entry
  if (data.productName) {
    data.materials.push({
      materialName: data.productName,
      category: 'General',
      quantity: data.quantity || 1,
      unit: data.unit || 'units',
    });
  }

  return data;
}

// Manual quotation entry from admin (if WhatsApp message is forwarded)
export const createInquiryFromWhatsApp = async (req: Request, res: Response) => {
  try {
    const {
      phoneNumber,
      message,
      customerName,
      productName,
      quantity,
      unit,
    } = req.body;

    if (!phoneNumber || !message) {
      return res.status(400).json({
        success: false,
        message: 'Phone number and message are required',
      });
    }

    const inquiry = new MaterialInquiry({
      customerName: customerName || 'WhatsApp Customer',
      email: `whatsapp_${phoneNumber.replace(/[^0-9]/g, '')}@customer.temp`,
      phone: phoneNumber,
      materials: [
        {
          materialName: productName || 'Material from WhatsApp',
          category: 'General',
          quantity: quantity || 1,
          unit: unit || 'units',
          specification: message,
        }
      ],
      deliveryLocation: 'To be confirmed',
      additionalRequirements: `Source: WhatsApp Message\nOriginal: ${message}`,
      status: 'new',
      priority: 'medium',
    });

    const savedInquiry = await inquiry.save();

    res.status(201).json({
      success: true,
      message: 'Inquiry created from WhatsApp message',
      data: savedInquiry,
    });
  } catch (error: any) {
    console.error('❌ Error creating inquiry from WhatsApp:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to create inquiry',
    });
  }
};
