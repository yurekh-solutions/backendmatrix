"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const miloController_1 = require("../controllers/miloController");
const router = express_1.default.Router();
// Public routes (no auth required for initial chat)
router.post('/chat/start', miloController_1.getOrCreateChat);
router.post('/chat/message', miloController_1.sendMessage);
router.get('/chat/history', miloController_1.getChatHistory);
// Recommendations
router.post('/recommendations', miloController_1.getRecommendations);
// Training & Learning
router.post('/training', miloController_1.getTrainingContent);
// Feedback
router.post('/rate', miloController_1.rateChat);
// Analytics
router.get('/analytics', miloController_1.getAnalytics);
exports.default = router;
