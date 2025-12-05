import express from 'express';
import * as whatsappController from '../controllers/whatsappWebhookController';

const router = express.Router();

// WhatsApp Webhook Verification (GET)
router.get('/webhook', whatsappController.verifyWebhook);

// WhatsApp Webhook - Receive Messages (POST)
router.post('/webhook', whatsappController.receiveWhatsAppMessage);

// Manual entry: Create inquiry from WhatsApp message
router.post('/create-inquiry', whatsappController.createInquiryFromWhatsApp);

export default router;
