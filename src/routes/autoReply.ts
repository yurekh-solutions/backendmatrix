import express, { Router } from 'express';
import { authenticateSupplier } from '../middleware/auth';
import {
  createAutoReply,
  getSupplierAutoReplies,
  getAutoReplyByType,
  updateAutoReply,
  deleteAutoReply,
  toggleAutoReply
} from '../controllers/autoReplyController';

const router: Router = express.Router();

// Apply authentication middleware
router.use(authenticateSupplier);

// Create new auto-reply
router.post('/', createAutoReply);

// Get all auto-replies for supplier
router.get('/', getSupplierAutoReplies);

// Get auto-reply by type
router.get('/type/:messageType', getAutoReplyByType);

// Update auto-reply
router.put('/:id', updateAutoReply);

// Delete auto-reply
router.delete('/:id', deleteAutoReply);

// Toggle auto-reply active status
router.patch('/:id/toggle', toggleAutoReply);

export default router;
