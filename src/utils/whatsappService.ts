import axios from 'axios';

interface RFQData {
  customerName: string;
  email: string;
  phone: string;
  company?: string;
  location?: string;
  items: Array<{
    productName: string;
    category: string;
    brand: string;
    grade: string;
    quantity: number;
  }>;
}

interface MaterialInquiryData {
  inquiryNumber: string;
  customerName: string;
  companyName?: string;
  email: string;
  phone: string;
  materials: Array<{
    materialName: string;
    category: string;
    grade?: string;
    specification?: string;
    quantity: number;
    unit: string;
    targetPrice?: number;
  }>;
  deliveryLocation: string;
  totalEstimatedValue?: number;
  additionalRequirements?: string;
}

/**
 * Sends RFQ notification via WhatsApp
 * Using WhatsApp Web URL (client-side approach)
 */
export const sendRFQToWhatsApp = (data: RFQData): string => {
  // Format WhatsApp message
  let message = '*New RFQ Submission*\n\n';
  
  message += '*CUSTOMER DETAILS*\n';
  message += `Name: ${data.customerName}\n`;
  message += `Email: ${data.email}\n`;
  message += `Phone: ${data.phone}\n`;
  message += `Company: ${data.company || 'Not specified'}\n`;
  message += `Delivery Location: ${data.location || 'Not specified'}\n\n`;
  
  message += '*MATERIAL REQUIREMENTS*\n';
  message += `Total Items: ${data.items.length}\n\n`;
  
  data.items.forEach((item, index) => {
    message += `*Item ${index + 1}*\n`;
    message += `Product: ${item.productName}\n`;
    message += `Category: ${item.category}\n`;
    message += `Brand: ${item.brand}\n`;
    message += `Grade: ${item.grade}\n`;
    message += `Quantity: ${item.quantity} MT\n\n`;
  });

  message += `*Time:* ${new Date().toLocaleString()}\n`;
  
  return message;
};

/**
 * Sends WhatsApp message via Twilio (if configured)
 * Alternative method for server-side WhatsApp integration
 */
export const sendWhatsAppViaAPI = async (
  phoneNumber: string,
  message: string
): Promise<void> => {
  try {
    // Using WhatsApp Business API via Twilio
    const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioPhoneNumber = process.env.TWILIO_WHATSAPP_NUMBER;

    if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
      console.warn(
        '⚠️  WhatsApp API credentials not configured. Skipping API send.'
      );
      return;
    }

    const url = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;

    await axios.post(
      url,
      {
        From: `whatsapp:${twilioPhoneNumber}`,
        To: `whatsapp:${phoneNumber}`,
        Body: message,
      },
      {
        auth: {
          username: twilioAccountSid,
          password: twilioAuthToken,
        },
      }
    );

    console.log('✅ WhatsApp message sent successfully');
  } catch (error) {
    console.error('❌ Error sending WhatsApp message:', error);
    // Don't throw error - RFQ should still be saved even if WhatsApp fails
  }
};

/**
 * Generates WhatsApp Web URL for opening chat with pre-filled message
 */
export const generateWhatsAppWebURL = (
  phoneNumber: string,
  message: string
): string => {
  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/${phoneNumber}?text=${encodedMessage}`;
};

/**
 * Sends RFQ notification - combines DB storage + WhatsApp
 */
export const notifyRFQViaWhatsApp = async (
  rfqData: RFQData,
  recipientPhoneNumber: string = '919136242706'
): Promise<{ success: boolean; whatsappUrl: string }> => {
  try {
    const message = sendRFQToWhatsApp(rfqData);

    // Try to send via API (Twilio)
    await sendWhatsAppViaAPI(recipientPhoneNumber, message);

    // Also generate web URL as fallback
    const whatsappUrl = generateWhatsAppWebURL(recipientPhoneNumber, message);

    console.log('✅ RFQ notification prepared for WhatsApp');

    return {
      success: true,
      whatsappUrl,
    };
  } catch (error) {
    console.error('❌ Error notifying RFQ via WhatsApp:', error);
    throw error;
  }
};

/**
 * Formats Material Inquiry message for WhatsApp
 */
export const sendMaterialInquiryToWhatsApp = (data: MaterialInquiryData): string => {
  // Format WhatsApp message with emoji
  let message = '📦 *MATERIAL INQUIRY REQUEST*\n\n';
  
  message += '*Customer Details:*\n';
  message += `👤 Name: ${data.customerName}\n`;
  if (data.companyName) {
    message += `🏢 Company: ${data.companyName}\n`;
  }
  message += `📧 Email: ${data.email}\n`;
  message += `📱 Phone: ${data.phone}\n`;
  message += `📍 Location: ${data.deliveryLocation}\n\n`;
  
  message += '*Material Requirements:*\n';
  
  data.materials.forEach((material, index) => {
    message += `\n📌 *Material ${index + 1}*\n`;
    message += `• Material: ${material.materialName}\n`;
    message += `• Category: ${material.category}\n`;
    if (material.grade) {
      message += `• Grade: ${material.grade}\n`;
    }
    message += `• Quantity: ${material.quantity} ${material.unit}\n`;
    if (material.targetPrice) {
      message += `• Target Price: ₹${material.targetPrice.toLocaleString()}\n`;
    }
  });
  
  if (data.additionalRequirements) {
    message += `\n*Additional Requirements:*\n${data.additionalRequirements}\n`;
  }
  
  if (data.totalEstimatedValue) {
    message += `\n💰 *Total Estimated Value:* ₹${data.totalEstimatedValue.toLocaleString()}\n`;
  }
  
  message += `\n📋 *Inquiry #:* ${data.inquiryNumber}\n`;
  message += `🕐 *Time:* ${new Date().toLocaleString()}\n\n`;
  message += '_Please provide quotation at your earliest convenience._';
  
  return message;
};

/**
 * Sends Material Inquiry notification via WhatsApp
 */
export const notifyMaterialInquiryViaWhatsApp = async (
  inquiryData: MaterialInquiryData,
  recipientPhoneNumber: string = '919136242706'
): Promise<{ success: boolean; whatsappUrl: string }> => {
  try {
    const message = sendMaterialInquiryToWhatsApp(inquiryData);

    console.log('📱 Preparing Material Inquiry WhatsApp notification...');
    console.log('Message preview:', message.substring(0, 100) + '...');

    // Try to send via API (Twilio)
    await sendWhatsAppViaAPI(recipientPhoneNumber, message);

    // Also generate web URL as fallback
    const whatsappUrl = generateWhatsAppWebURL(recipientPhoneNumber, message);

    console.log('✅ Material Inquiry notification prepared for WhatsApp');
    console.log('📲 WhatsApp URL:', whatsappUrl);

    return {
      success: true,
      whatsappUrl,
    };
  } catch (error) {
    console.error('❌ Error notifying Material Inquiry via WhatsApp:', error);
    // Don't throw - inquiry should still be saved
    return {
      success: false,
      whatsappUrl: '',
    };
  }
};
