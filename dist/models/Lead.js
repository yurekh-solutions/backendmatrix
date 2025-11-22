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
const leadSchema = new mongoose_1.Schema({
    supplierId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Supplier',
        required: true
    },
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    phone: String,
    company: String,
    message: {
        type: String,
        required: true
    },
    source: {
        type: String,
        required: true,
        enum: ['website', 'referral', 'social-media', 'email', 'other']
    },
    score: {
        type: Number,
        min: 0,
        max: 100
    },
    status: {
        type: String,
        enum: ['new', 'contacted', 'qualified', 'unqualified', 'converted'],
        default: 'new'
    },
    tags: [{
            type: String
        }],
    assignedTo: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Admin'
    }
}, {
    timestamps: true
});
// Index for faster queries
leadSchema.index({ supplierId: 1, status: 1 });
leadSchema.index({ score: -1 }); // High score leads first
exports.default = mongoose_1.default.model('Lead', leadSchema);
