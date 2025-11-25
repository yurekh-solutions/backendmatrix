"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.notifyRFQViaWhatsApp = exports.generateWhatsAppWebURL = exports.sendWhatsAppViaAPI = exports.sendRFQToWhatsApp = void 0;
const axios_1 = __importDefault(require("axios"));
/**
 * Sends RFQ notification via WhatsApp
 * Using WhatsApp Web URL (client-side approach)
 */
const sendRFQToWhatsApp = (data) => {
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
exports.sendRFQToWhatsApp = sendRFQToWhatsApp;
/**
 * Sends WhatsApp message via Twilio (if configured)
 * Alternative method for server-side WhatsApp integration
 */
const sendWhatsAppViaAPI = async (phoneNumber, message) => {
    try {
        // Using WhatsApp Business API via Twilio
        const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
        const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
        const twilioPhoneNumber = process.env.TWILIO_WHATSAPP_NUMBER;
        if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
            console.warn('⚠️  WhatsApp API credentials not configured. Skipping API send.');
            return;
        }
        const url = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;
        await axios_1.default.post(url, {
            From: `whatsapp:${twilioPhoneNumber}`,
            To: `whatsapp:${phoneNumber}`,
            Body: message,
        }, {
            auth: {
                username: twilioAccountSid,
                password: twilioAuthToken,
            },
        });
        console.log('✅ WhatsApp message sent successfully');
    }
    catch (error) {
        console.error('❌ Error sending WhatsApp message:', error);
        // Don't throw error - RFQ should still be saved even if WhatsApp fails
    }
};
exports.sendWhatsAppViaAPI = sendWhatsAppViaAPI;
/**
 * Generates WhatsApp Web URL for opening chat with pre-filled message
 */
const generateWhatsAppWebURL = (phoneNumber, message) => {
    const encodedMessage = encodeURIComponent(message);
    return `https://wa.me/${phoneNumber}?text=${encodedMessage}`;
};
exports.generateWhatsAppWebURL = generateWhatsAppWebURL;
/**
 * Sends RFQ notification - combines DB storage + WhatsApp
 */
const notifyRFQViaWhatsApp = async (rfqData, recipientPhoneNumber = '919136242706') => {
    try {
        const message = (0, exports.sendRFQToWhatsApp)(rfqData);
        // Try to send via API (Twilio)
        await (0, exports.sendWhatsAppViaAPI)(recipientPhoneNumber, message);
        // Also generate web URL as fallback
        const whatsappUrl = (0, exports.generateWhatsAppWebURL)(recipientPhoneNumber, message);
        console.log('✅ RFQ notification prepared for WhatsApp');
        return {
            success: true,
            whatsappUrl,
        };
    }
    catch (error) {
        console.error('❌ Error notifying RFQ via WhatsApp:', error);
        throw error;
    }
};
exports.notifyRFQViaWhatsApp = notifyRFQViaWhatsApp;
