import mongoose, { Document, Schema } from 'mongoose';

export interface IMaterialInquiry extends Document {
  inquiryNumber: string;
  customerName: string;
  companyName?: string;
  email: string;
  phone: string;
  materials: Array<{
    materialName: string;
    category: string;
    grade?: string;
    specification?: string;
    quantity: number;
    unit: string;
    targetPrice?: number;
    requiredByDate?: Date;
  }>;
  deliveryLocation: string;
  deliveryAddress?: string;
  totalEstimatedValue?: number;
  paymentTerms?: string;
  additionalRequirements?: string;
  attachments?: string[];
  status: 'new' | 'under_review' | 'quoted' | 'negotiating' | 'accepted' | 'rejected' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignedTo?: mongoose.Types.ObjectId;
  supplierQuotes?: Array<{
    supplierId: mongoose.Types.ObjectId;
    supplierName: string;
    quotedPrice: number;
    quotedDate: Date;
    validUntil?: Date;
    notes?: string;
    status: 'pending' | 'accepted' | 'rejected';
  }>;
  adminNotes?: string;
  internalNotes?: string;
  createdAt: Date;
  updatedAt: Date;
  lastActivityDate?: Date;
}

const MaterialInquirySchema = new Schema<IMaterialInquiry>(
  {
    inquiryNumber: {
      type: String,
      unique: true,
      required: false, // Auto-generated in pre-save hook
    },
    customerName: {
      type: String,
      required: true,
    },
    companyName: String,
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
    },
    materials: [
      {
        materialName: {
          type: String,
          required: true,
        },
        category: {
          type: String,
          required: true,
        },
        grade: String,
        specification: String,
        quantity: {
          type: Number,
          required: true,
        },
        unit: {
          type: String,
          required: true,
          default: 'MT',
        },
        targetPrice: Number,
        requiredByDate: Date,
      },
    ],
    deliveryLocation: {
      type: String,
      required: true,
    },
    deliveryAddress: String,
    totalEstimatedValue: Number,
    paymentTerms: String,
    additionalRequirements: String,
    attachments: [String],
    status: {
      type: String,
      enum: ['new', 'under_review', 'quoted', 'negotiating', 'accepted', 'rejected', 'completed', 'cancelled'],
      default: 'new',
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
    },
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: 'Admin',
    },
    supplierQuotes: [
      {
        supplierId: {
          type: Schema.Types.ObjectId,
          ref: 'Supplier',
          required: true,
        },
        supplierName: {
          type: String,
          required: true,
        },
        quotedPrice: {
          type: Number,
          required: true,
        },
        quotedDate: {
          type: Date,
          default: Date.now,
        },
        validUntil: Date,
        notes: String,
        status: {
          type: String,
          enum: ['pending', 'accepted', 'rejected'],
          default: 'pending',
        },
      },
    ],
    adminNotes: String,
    internalNotes: String,
    lastActivityDate: {
      type: Date,
      default: Date.now,
    },
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Generate inquiry number automatically
MaterialInquirySchema.pre('save', async function (next) {
  if (this.isNew && !this.inquiryNumber) {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const count = await mongoose.model('MaterialInquiry').countDocuments();
    this.inquiryNumber = `MI${year}${month}${(count + 1).toString().padStart(5, '0')}`;
  }
  next();
});

// Update lastActivityDate on any update
MaterialInquirySchema.pre('save', function (next) {
  this.lastActivityDate = new Date();
  next();
});

// Indexes for better query performance
MaterialInquirySchema.index({ status: 1, createdAt: -1 });
MaterialInquirySchema.index({ email: 1 });
MaterialInquirySchema.index({ inquiryNumber: 1 });
MaterialInquirySchema.index({ priority: 1, status: 1 });

export default mongoose.model<IMaterialInquiry>('MaterialInquiry', MaterialInquirySchema);
