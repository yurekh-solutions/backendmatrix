import mongoose, { Document, Schema } from 'mongoose';

export interface IOrderAutomation extends Document {
  supplierId: mongoose.Types.ObjectId;
  orderId: string;
  customerName: string;
  customerEmail: string;
  products: {
    productId: mongoose.Types.ObjectId;
    name: string;
    quantity: number;
    price: number;
  }[];
  totalAmount: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  trackingId?: string;
  automationSteps: {
    step: string;
    status: 'pending' | 'completed' | 'failed';
    timestamp: Date;
    details?: string;
  }[];
  notifications: {
    type: 'email' | 'sms';
    sent: boolean;
    timestamp?: Date;
    recipient: string;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

const orderAutomationSchema = new Schema<IOrderAutomation>({
  supplierId: {
    type: Schema.Types.ObjectId,
    ref: 'Supplier',
    required: true
  },
  orderId: {
    type: String,
    required: true,
    unique: true
  },
  customerName: {
    type: String,
    required: true
  },
  customerEmail: {
    type: String,
    required: true
  },
  products: [{
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product'
    },
    name: String,
    quantity: Number,
    price: Number
  }],
  totalAmount: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'],
    default: 'pending'
  },
  trackingId: String,
  automationSteps: [{
    step: {
      type: String,
      enum: ['order-confirmation', 'invoice-generation', 'payment-processing', 'shipment', 'delivery']
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed'],
      default: 'pending'
    },
    timestamp: Date,
    details: String
  }],
  notifications: [{
    type: {
      type: String,
      enum: ['email', 'sms']
    },
    sent: {
      type: Boolean,
      default: false
    },
    timestamp: Date,
    recipient: String
  }]
}, {
  timestamps: true
});

// Index for faster queries
orderAutomationSchema.index({ supplierId: 1, status: 1 });
orderAutomationSchema.index({ orderId: 1 });

export default mongoose.model<IOrderAutomation>('OrderAutomation', orderAutomationSchema);