import mongoose, { Document, Schema } from 'mongoose';

export interface ISupplier extends Document {
  // Basic Information
  companyName: string;
  email: string;
  phone: string;
  contactPerson: string;
  businessType: 'business' | 'individual';
  logo?: string; // Company logo URL (stored in Cloudinary)
  
  // Address
  address: {
    street: string;
    city: string;
    state: string;
    pincode: string;
    country: string;
  };
  
  // Documents
  documents: {
    gst?: {
      fileUrl: string;
      fileName: string;
      uploadedAt: Date;
    };
    cin?: {
      fileUrl: string;
      fileName: string;
      uploadedAt: Date;
    };
    pan: {
      fileUrl: string;
      fileName: string;
      uploadedAt: Date;
    };
    bankProof?: {
      fileUrl: string;
      fileName: string;
      uploadedAt: Date;
    };
    businessLicense?: {
      fileUrl: string;
      fileName: string;
      uploadedAt: Date;
    };
    aadhaar?: {
      fileUrl: string;
      fileName: string;
      uploadedAt: Date;
    };
  };
  
  // Business Details
  businessDescription: string;
  productsOffered: string[];
  yearsInBusiness: number;
  
  // Automation Suite Settings
  automationSettings?: {
    autoReplyEnabled: boolean;
    leadScoringEnabled: boolean;
    orderAutomationEnabled: boolean;
    inventoryTrackingEnabled: boolean;
    priceOptimizerEnabled: boolean;
  };
  
  // Status & Review
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  reviewedBy?: mongoose.Types.ObjectId;
  reviewedAt?: Date;
  
  // Supplier Credentials (created after approval)
  password?: string;
  isActive: boolean;
  
  // Password Reset
  passwordResetToken?: string;
  passwordResetTokenExpiry?: Date;
  
  // Timestamps
  submittedAt: Date;
  lastModified: Date;
}

const supplierSchema = new Schema<ISupplier>({
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
  logo: {
    type: String
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
  automationSettings: {
    autoReplyEnabled: { type: Boolean, default: false },
    leadScoringEnabled: { type: Boolean, default: false },
    orderAutomationEnabled: { type: Boolean, default: false },
    inventoryTrackingEnabled: { type: Boolean, default: false },
    priceOptimizerEnabled: { type: Boolean, default: false }
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
    type: Schema.Types.ObjectId,
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
  passwordResetToken: {
    type: String,
    sparse: true
  },
  passwordResetTokenExpiry: {
    type: Date
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

export default mongoose.model<ISupplier>('Supplier', supplierSchema);
