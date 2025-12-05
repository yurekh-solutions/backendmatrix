import mongoose, { Document, Schema } from 'mongoose';

export interface IProductInquiry extends Document {
  inquiryNumber: string;
  productName: string;
  customerName: string;
  phone: string;
  email?: string;
  quantity?: string;
  specifications?: string;
  status: 'new' | 'contacted' | 'quoted' | 'converted' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignedTo?: mongoose.Types.ObjectId;
  adminNotes?: string;
  internalNotes?: string;
  createdAt: Date;
  updatedAt: Date;
  lastActivityDate?: Date;
}

const ProductInquirySchema = new Schema<IProductInquiry>(
  {
    inquiryNumber: {
      type: String,
      unique: true,
      required: false, // Auto-generated in pre-save hook
    },
    productName: {
      type: String,
      required: true,
    },
    customerName: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
    },
    quantity: {
      type: String,
    },
    specifications: {
      type: String,
    },
    status: {
      type: String,
      enum: ['new', 'contacted', 'quoted', 'converted', 'closed'],
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
ProductInquirySchema.pre('save', async function (next) {
  if (this.isNew && !this.inquiryNumber) {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const count = await mongoose.model('ProductInquiry').countDocuments();
    this.inquiryNumber = `PI${year}${month}${(count + 1).toString().padStart(5, '0')}`;
  }
  next();
});

// Update lastActivityDate on any update
ProductInquirySchema.pre('save', function (next) {
  this.lastActivityDate = new Date();
  next();
});

// Indexes for better query performance
ProductInquirySchema.index({ status: 1, createdAt: -1 });
ProductInquirySchema.index({ email: 1 });
ProductInquirySchema.index({ inquiryNumber: 1 });
ProductInquirySchema.index({ priority: 1, status: 1 });

export default mongoose.model<IProductInquiry>('ProductInquiry', ProductInquirySchema);
