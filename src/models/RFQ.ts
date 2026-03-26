import mongoose, { Document, Schema } from 'mongoose';

export interface IRFQ extends Document {
  userId?: string;
  inquiryNumber?: string;
  customerName: string;
  email: string;
  phone: string;
  company?: string;
  productCategory: string;
  productName: string;
  quantity: number;
  unit: string;
  specifications?: string;
  deliveryLocation: string;
  expectedDeliveryDate?: Date;
  attachments?: string[];
  status: 'pending' | 'quoted' | 'accepted' | 'rejected' | 'completed';
  assignedSupplier?: mongoose.Types.ObjectId;
  supplierResponse?: {
    supplierId: mongoose.Types.ObjectId;
    quotedPrice: number;
    quotedDate: Date;
    notes?: string;
  };
  adminNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const RFQSchema = new Schema<IRFQ>(
  {
    userId: String,
    customerName: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      required: true,
    },
    company: String,
    productCategory: {
      type: String,
      required: true,
    },
    productName: {
      type: String,
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
    },
    unit: {
      type: String,
      required: true,
    },
    specifications: String,
    deliveryLocation: {
      type: String,
      required: true,
    },
    expectedDeliveryDate: Date,
    attachments: [String],
    status: {
      type: String,
      enum: ['pending', 'quoted', 'accepted', 'rejected', 'completed'],
      default: 'pending',
    },
    assignedSupplier: {
      type: Schema.Types.ObjectId,
      ref: 'Supplier',
    },
    supplierResponse: {
      supplierId: {
        type: Schema.Types.ObjectId,
        ref: 'Supplier',
      },
      quotedPrice: Number,
      quotedDate: Date,
      notes: String,
    },
    adminNotes: String,
    inquiryNumber: { type: String, unique: true, sparse: true },
  },
  { timestamps: true }
);

// Auto-generate inquiry number before saving
RFQSchema.pre('save', async function (next) {
  if (this.isNew && !this.inquiryNumber) {
    const now = new Date();
    const year  = now.getFullYear().toString().slice(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day   = now.getDate().toString().padStart(2, '0');
    // Use timestamp millis + random 3-digit suffix for uniqueness
    // even when multiple items are saved in parallel (Promise.all)
    const ts     = Date.now().toString().slice(-5);          // last 5 digits of ms timestamp
    const rand   = Math.floor(Math.random() * 900 + 100);    // 100-999 random
    this.inquiryNumber = `RFQ${year}${month}${day}${ts}${rand}`;
  }
  next();
});

export default mongoose.model<IRFQ>('RFQ', RFQSchema);
