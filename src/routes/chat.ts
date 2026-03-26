import express from 'express';
import { getMessages, sendMessage, markAsRead, getBuyerToken } from '../controllers/chatController';
import { supplierAuth } from '../middleware/auth';

const router = express.Router();

/**
 * Flexible auth middleware — tries supplierAuth first.
 * If no Authorization header, falls through to controller
 * which validates buyer token from query params instead.
 */
const flexibleAuth = (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    // Supplier JWT path
    return supplierAuth(req, res, next);
  }
  // Buyer token path — let controller handle it
  next();
};

// Buyer: get a chat access token (public endpoint, email verification)
router.post('/:inquiryId/token', getBuyerToken);

// Get all messages in thread
router.get('/:inquiryId', flexibleAuth, getMessages);

// Send a message
router.post('/:inquiryId', flexibleAuth, sendMessage);

// Mark messages as read
router.patch('/:inquiryId/read', flexibleAuth, markAsRead);

export default router;
