"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const aiAutoReplyController_1 = require("../controllers/aiAutoReplyController");
const router = express_1.default.Router();
// Apply authentication middleware
router.use(auth_1.authenticateSupplier);
// Generate AI auto-reply
router.post('/generate-auto-reply', aiAutoReplyController_1.generateAutoReply);
exports.default = router;
