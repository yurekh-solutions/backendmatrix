import express from 'express';
import {
  submitAccountDeletionRequest,
  submitDataDeletionRequest,
  getDeletionRequests,
  getDeletionRequestById,
  updateDeletionRequestStatus,
  processAccountDeletion,
} from '../controllers/privacyController';
import { authenticateAdmin } from '../middleware/auth';

const router = express.Router();

// Public routes - for users to submit deletion requests
router.post('/delete-account', submitAccountDeletionRequest);
router.post('/delete-data', submitDataDeletionRequest);

// Admin routes - require authentication
router.get('/deletion-requests', authenticateAdmin, getDeletionRequests);
router.get('/deletion-requests/:id', authenticateAdmin, getDeletionRequestById);
router.patch('/deletion-requests/:id/status', authenticateAdmin, updateDeletionRequestStatus);
router.post('/deletion-requests/:id/process', authenticateAdmin, processAccountDeletion);

export default router;
