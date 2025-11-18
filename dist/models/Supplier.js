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
const supplierSchema = new mongoose_1.Schema({
    companyName: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    phone: {
        type: String,
        required: true
    },
    contactPerson: {
        type: String,
        required: true
    },
    businessType: {
        type: String,
        enum: ['business', 'individual'],
        required: true
    },
    address: {
        street: { type: String, required: true },
        city: { type: String, required: true },
        state: { type: String, required: true },
        pincode: { type: String, required: true },
        country: { type: String, default: 'India' }
    },
    documents: {
        gst: {
            fileUrl: String,
            fileName: String,
            uploadedAt: Date
        },
        cin: {
            fileUrl: String,
            fileName: String,
            uploadedAt: Date
        },
        pan: {
            fileUrl: { type: String, required: true },
            fileName: { type: String, required: true },
            uploadedAt: { type: Date, default: Date.now }
        },
        bankProof: {
            fileUrl: String,
            fileName: String,
            uploadedAt: Date
        },
        businessLicense: {
            fileUrl: String,
            fileName: String,
            uploadedAt: Date
        },
        aadhaar: {
            fileUrl: String,
            fileName: String,
            uploadedAt: Date
        }
    },
    businessDescription: {
        type: String,
        required: true
    },
    productsOffered: [{
            type: String
        }],
    yearsInBusiness: {
        type: Number,
        required: true,
        min: 0
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    rejectionReason: {
        type: String
    },
    reviewedBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Admin'
    },
    reviewedAt: {
        type: Date
    },
    password: {
        type: String
    },
    isActive: {
        type: Boolean,
        default: true
    },
    submittedAt: {
        type: Date,
        default: Date.now
    },
    lastModified: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});
// Index for faster queries
// Note: email index is automatically created by unique: true
supplierSchema.index({ status: 1 });
exports.default = mongoose_1.default.model('Supplier', supplierSchema);
