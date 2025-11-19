import express, { Router } from 'express';
import { authenticateSupplier } from '../middleware/auth';
import { generateAutoReply } from '../controllers/aiAutoReplyController';

const router: Router = express.Router();

// Apply authentication middleware
router.use(authenticateSupplier);

// Generate AI auto-reply
router.post('/generate-auto-reply', generateAutoReply);

export default router;
