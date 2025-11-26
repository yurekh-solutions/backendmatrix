"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const MiloChatSchema = new mongoose_1.Schema({
    userId: String,
    supplierId: String,
    userName: {
        type: String,
        required: true,
    },
    userType: {
        type: String,
        enum: ['buyer', 'supplier', 'admin'],
        default: 'buyer',
    },
    messages: [
        {
            sender: {
                type: String,
                enum: ['user', 'milo'],
                required: true,
            },
            message: String,
            timestamp: {
                type: Date,
                default: Date.now,
            },
            intent: String,
            metadata: mongoose_1.Schema.Types.Mixed,
        },
    ],
    context: {
        currentPhase: {
            type: String,
            enum: ['onboarding', 'searching', 'negotiating', 'learning', 'growing'],
            default: 'onboarding',
        },
        products: [String],
        suppliers: [String],
        recommendedProducts: [String],
        userProfile: {
            businessType: String,
            interests: [String],
            budget: Number,
            location: String,
        },
    },
    summary: String,
    recommendations: [
        {
            type: {
                type: String,
                enum: ['product', 'supplier', 'training', 'growth_tip'],
            },
            title: String,
            description: String,
            actionUrl: String,
            relevanceScore: Number,
        },
    ],
    sessionDuration: {
        type: Number,
        default: 0,
    },
    helpful: {
        type: Boolean,
        default: null,
    },
}, { timestamps: true });
MiloChatSchema.index({ userId: 1, createdAt: -1 });
MiloChatSchema.index({ supplierId: 1, createdAt: -1 });
MiloChatSchema.index({ userType: 1 });
exports.default = mongoose_1.default.model('MiloChat', MiloChatSchema);
