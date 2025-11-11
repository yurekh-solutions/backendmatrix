import mongoose, { Document, Schema } from 'mongoose';

export interface IOrder extends Document {
  rfqId: mongoose.Types.ObjectId;
  customerId?: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  supplierId: mongoose.Types.ObjectId;
  productName: string;
  quantity: number;
  unit: string;
  totalAmount: number;
  currency: string;
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  deliveryAddress: string;
  expectedDeliveryDate?: Date;
  actualDeliveryDate?: Date;
  paymentStatus: 'pending' | 'partial' | 'paid' | 'refunded';
  trackingNumber?: string;
  adminNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const OrderSchema = new Schema<IOrder>(
  {
    rfqId: {
      type: Schema.Types.ObjectId,
      ref: 'RFQ',
      required: true,
    },
    customerId: String,
    customerName: {
      type: String,
      required: true,
    },
    customerEmail: {
      type: String,
      required: true,
    },
    customerPhone: {
      type: String,
      required: true,
    },
    supplierId: {
      type: Schema.Types.ObjectId,
      ref: 'Supplier',
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
    totalAmount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: 'INR',
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'],
      default: 'pending',
    },
    deliveryAddress: {
      type: String,
      required: true,
    },
    expectedDeliveryDate: Date,
    actualDeliveryDate: Date,
    paymentStatus: {
      type: String,
      enum: ['pending', 'partial', 'paid', 'refunded'],
      default: 'pending',
    },
    trackingNumber: String,
    adminNotes: String,
  },
  { timestamps: true }
);

export default mongoose.model<IOrder>('Order', OrderSchema);
