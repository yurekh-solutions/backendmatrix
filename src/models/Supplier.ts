import mongoose, { Document, Schema } from 'mongoose';

export interface ISupplier extends Document {
  // Basic Information
  companyName: string;
  email: string;
  phone: string;
  contactPerson: string;
  businessType: 'business' | 'individual';
  
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
  
  // Status & Review
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  reviewedBy?: mongoose.Types.ObjectId;
  reviewedAt?: Date;
  
  // Supplier Credentials (created after approval)
  password?: string;
  isActive: boolean;
  
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
supplierSchema.index({ email: 1 });
supplierSchema.index({ status: 1 });

export default mongoose.model<ISupplier>('Supplier', supplierSchema);
