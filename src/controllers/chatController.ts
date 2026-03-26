import { Request, Response } from 'express';
import InquiryMessage from '../models/InquiryMessage';
import MaterialInquiry from '../models/MaterialInquiry';
import RFQ from '../models/RFQ';
import Lead from '../models/Lead';
import Supplier from '../models/Supplier';
import crypto from 'crypto';

const CHAT_SECRET = process.env.CHAT_SECRET || 'ritzyard-chat-secret-2025';

/**
 * Generate a buyer access token (HMAC) for a given inquiryId + email combo.
 * Used so buyers can access their chat thread without login.
 */
export const generateBuyerToken = (inquiryId: string, email: string): string => {
  return crypto
    .createHmac('sha256', CHAT_SECRET)
    .update(`${inquiryId}:${email.toLowerCase()}`)
    .digest('hex')
    .slice(0, 32);
};

/**
 * Verify buyer token
 */
const verifyBuyerToken = (inquiryId: string, email: string, token: string): boolean => {
  const expected = generateBuyerToken(inquiryId, email);
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(token));
};

/**
 * Resolve who is calling this endpoint.
 * Returns { role, id } or null if unauthorized.
 */
const resolveCallerFromReq = (req: any): { role: 'supplier' | 'buyer'; id: string } | null => {
  // Supplier JWT auth (attached by supplierAuth middleware via req.supplier)
  if (req.supplier?._id) {
    return { role: 'supplier', id: req.supplier._id.toString() };
  }

  // Buyer token-based auth (query params: email + token)
  const { email, token } = req.query as Record<string, string>;
  const { inquiryId } = req.params;
  if (email && token && inquiryId) {
    try {
      if (verifyBuyerToken(inquiryId, email, token)) {
        return { role: 'buyer', id: 'BUYER' };
      }
    } catch {
      return null;
    }
  }

  return null;
};

/**
 * GET /api/chat/:inquiryId
 * Get all messages in a thread.
 * Auth: supplier JWT OR buyer (email + token query params)
 */
export const getMessages = async (req: any, res: Response) => {
  try {
    const caller = resolveCallerFromReq(req);
    if (!caller) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { inquiryId } = req.params;

    const messages = await InquiryMessage.find({ inquiryId })
      .sort({ createdAt: 1 })
      .lean();

    // Mask identities — buyer sees supplier as "RitzYard Verified Supplier"
    // Supplier sees buyer as "Buyer (Protected)"
    const masked = messages.map((msg) => ({
      _id: msg._id,
      inquiryId: msg.inquiryId,
      senderRole: msg.senderRole,
      senderLabel:
        msg.senderRole === 'ritzyard'
          ? 'RitzYard'
          : msg.senderRole === 'supplier'
          ? caller.role === 'buyer'
            ? 'RitzYard Verified Supplier'
            : 'You'
          : caller.role === 'supplier'
          ? 'Buyer (Protected)'
          : 'You',
      message: msg.message,
      isRead: msg.isRead,
      isMine:
        (caller.role === 'supplier' && msg.senderRole === 'supplier' && msg.senderId === caller.id) ||
        (caller.role === 'buyer' && msg.senderRole === 'buyer'),
      createdAt: msg.createdAt,
    }));

    return res.json({ success: true, messages: masked, count: masked.length });
  } catch (error: any) {
    console.error('❌ chatController.getMessages error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to fetch messages' });
  }
};

/**
 * POST /api/chat/:inquiryId
 * Send a message in a thread.
 * Body: { message, inquiryType? }
 * Auth: supplier JWT OR buyer (email + token query params)
 */
export const sendMessage = async (req: any, res: Response) => {
  try {
    const caller = resolveCallerFromReq(req);
    if (!caller) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { inquiryId } = req.params;
    const { message, inquiryType } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: 'Message cannot be empty' });
    }

    if (message.trim().length > 2000) {
      return res.status(400).json({ success: false, message: 'Message too long (max 2000 chars)' });
    }

    // Determine inquiry type if not provided
    let resolvedType: 'MI' | 'RFQ' | 'LEAD' = inquiryType || 'LEAD';
    if (!inquiryType) {
      if (inquiryId.startsWith('MI')) resolvedType = 'MI';
      else if (inquiryId.startsWith('RFQ')) resolvedType = 'RFQ';
    }

    const newMsg = await InquiryMessage.create({
      inquiryId,
      inquiryType: resolvedType,
      senderId: caller.id,
      senderRole: caller.role,
      message: message.trim(),
      isRead: false,
      readBy: [caller.id],
    });

    return res.status(201).json({ success: true, message: newMsg });
  } catch (error: any) {
    console.error('❌ chatController.sendMessage error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to send message' });
  }
};

/**
 * PATCH /api/chat/:inquiryId/read
 * Mark all messages in a thread as read for the caller.
 * Auth: supplier JWT OR buyer (email + token query params)
 */
export const markAsRead = async (req: any, res: Response) => {
  try {
    const caller = resolveCallerFromReq(req);
    if (!caller) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { inquiryId } = req.params;

    // Mark all messages not sent by this caller as read
    await InquiryMessage.updateMany(
      {
        inquiryId,
        senderId: { $ne: caller.id },
        readBy: { $ne: caller.id },
      },
      {
        $addToSet: { readBy: caller.id },
        $set: { isRead: true },
      }
    );

    return res.json({ success: true, message: 'Marked as read' });
  } catch (error: any) {
    console.error('❌ chatController.markAsRead error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to mark as read' });
  }
};

/**
 * GET /api/chat/:inquiryId/token
 * Generate a buyer access token for a specific inquiry.
 * Public endpoint — buyer provides their email + inquiryNumber to get a token.
 * Body: { email }
 */
export const getBuyerToken = async (req: Request, res: Response) => {
  try {
    const { inquiryId } = req.params;
    const { email } = req.body as { email: string };

    if (!email || !email.trim()) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Verify this email actually owns this inquiry
    let verified = false;

    // Check MaterialInquiry
    if (inquiryId.startsWith('MI')) {
      const mi = await MaterialInquiry.findOne({ inquiryNumber: inquiryId, email: normalizedEmail });
      if (mi) verified = true;
    }

    // Check RFQ
    if (!verified && inquiryId.startsWith('RFQ')) {
      const rfq = await RFQ.findOne({
        $or: [{ inquiryNumber: inquiryId }],
        email: normalizedEmail,
      });
      if (rfq) verified = true;
    }

    // Check Lead (by _id)
    if (!verified) {
      const lead = await Lead.findOne({ _id: inquiryId, email: normalizedEmail }).catch(() => null);
      if (lead) verified = true;
    }

    if (!verified) {
      return res.status(403).json({
        success: false,
        message: 'No inquiry found with this email and inquiry ID',
      });
    }

    const token = generateBuyerToken(inquiryId, normalizedEmail);

    return res.json({
      success: true,
      token,
      inquiryId,
      chatUrl: `/chat/${inquiryId}?email=${encodeURIComponent(normalizedEmail)}&token=${token}`,
    });
  } catch (error: any) {
    console.error('❌ chatController.getBuyerToken error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to generate token' });
  }
};
