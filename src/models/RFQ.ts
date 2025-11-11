import mongoose, { Document, Schema } from 'mongoose';

export interface IRFQ extends Document {
  userId?: string;
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
  },
  { timestamps: true }
);

export default mongoose.model<IRFQ>('RFQ', RFQSchema);
