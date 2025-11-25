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
