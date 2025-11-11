"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const supplierController_1 = require("../controllers/supplierController");
const multer_1 = require("../config/multer");
const router = express_1.default.Router();
// Public routes
router.post('/submit', multer_1.upload.fields([
    { name: 'gst', maxCount: 1 },
    { name: 'cin', maxCount: 1 },
    { name: 'pan', maxCount: 1 },
    { name: 'bankProof', maxCount: 1 },
    { name: 'businessLicense', maxCount: 1 },
    { name: 'aadhaar', maxCount: 1 }
]), supplierController_1.submitOnboarding);
router.get('/check-status', supplierController_1.checkApplicationStatus);
exports.default = router;
