"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const autoReplyController_1 = require("../controllers/autoReplyController");
const router = express_1.default.Router();
// Apply authentication middleware
router.use(auth_1.authenticateSupplier);
// Create new auto-reply
router.post('/', autoReplyController_1.createAutoReply);
// Get all auto-replies for supplier
router.get('/', autoReplyController_1.getSupplierAutoReplies);
// Get auto-reply by type
router.get('/type/:messageType', autoReplyController_1.getAutoReplyByType);
// Update auto-reply
router.put('/:id', autoReplyController_1.updateAutoReply);
// Delete auto-reply
router.delete('/:id', autoReplyController_1.deleteAutoReply);
// Toggle auto-reply active status
router.patch('/:id/toggle', autoReplyController_1.toggleAutoReply);
exports.default = router;
