import express from 'express';
import {
  getOrCreateChat,
  sendMessage,
  getRecommendations,
  getChatHistory,
  getTrainingContent,
  rateChat,
  getAnalytics,
} from '../controllers/miloController';

const router = express.Router();

// Public routes (no auth required for initial chat)
router.post('/chat/start', getOrCreateChat);
router.post('/chat/message', sendMessage);
router.get('/chat/history', getChatHistory);

// Recommendations
router.post('/recommendations', getRecommendations);

// Training & Learning
router.post('/training', getTrainingContent);

// Feedback
router.post('/rate', rateChat);

// Analytics
router.get('/analytics', getAnalytics);

export default router;
