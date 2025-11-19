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
const toolUsageSchema = new mongoose_1.Schema({
    supplierId: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: 'Supplier',
        required: true,
        index: true
    },
    supplierName: {
        type: String,
        required: true,
        index: true
    },
    toolName: {
        type: String,
        required: true,
        enum: [
            'auto-reply',
            'lead-scoring',
            'order-automation',
            'smart-inventory',
            'price-optimizer',
            'analytics-hub'
        ]
    },
    toolType: {
        type: String,
        required: true,
        enum: [
            'auto-reply',
            'lead-scoring',
            'order-automation',
            'smart-inventory',
            'price-optimizer',
            'analytics-hub'
        ]
    },
    description: {
        type: String,
        default: ''
    },
    status: {
        type: String,
        enum: ['clicked', 'enabled', 'active'],
        default: 'clicked'
    },
    usageCount: {
        type: Number,
        default: 1
    },
    metrics: {
        responseTime: { type: Number, default: null },
        successRate: { type: Number, default: null },
        conversionRate: { type: Number, default: null },
        revenueImpact: { type: Number, default: null }
    },
    lastUsedAt: {
        type: Date,
        default: new Date()
    }
}, { timestamps: true });
// Index for analytics
toolUsageSchema.index({ toolType: 1, createdAt: -1 });
toolUsageSchema.index({ supplierId: 1, createdAt: -1 });
exports.default = mongoose_1.default.model('ToolUsage', toolUsageSchema);
