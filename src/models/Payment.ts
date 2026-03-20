import mongoose, { Document, Schema } from 'mongoose';

export interface IPayment extends Document {
  orderId: mongoose.Types.ObjectId;
  supplierId: mongoose.Types.ObjectId;
  buyerId?: mongoose.Types.ObjectId;
  
  // Payment Details
  amount: {
    subtotal: number;
    tax: number;
    shippingCharges: number;
    discount: number;
    total: number;
    currency: string;
  };
  
  // Payment Method
  paymentMethod: 'credit_card' | 'debit_card' | 'upi' | 'net_banking' | 'bank_transfer' | 'cod' | 'wallet' | 'credit_terms';
  
  // Payment Status
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded' | 'partially_refunded';
  
  // Transaction Details
  transactionId?: string;
  paymentGateway?: string;
  gatewayResponse?: any;
  
  // Settlement Information
  settlementStatus: 'pending' | 'processing' | 'settled' | 'failed';
  settlementDate?: Date;
  settlementAmount?: number;
  commissionRate?: number;
  commissionAmount?: number;
  netAmount?: number;
  
  // Refund Information
  refundAmount?: number;
  refundReason?: string;
  refundDate?: Date;
  refundTransactionId?: string;
  
  // Payment Timeline
  initiatedAt?: Date;
  completedAt?: Date;
  
  // Metadata
  metadata?: any;
  notes?: string;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema = new Schema<IPayment>({
  orderId: {
    type: Schema.Types.ObjectId,
    ref: 'Order',
    required: true,
    index: true
  },
  supplierId: {
    type: Schema.Types.ObjectId,
    ref: 'Supplier',
    required: true,
    index: true
  },
  buyerId: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  amount: {
    subtotal: { type: Number, required: true },
    tax: { type: Number, default: 0 },
    shippingCharges: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    total: { type: Number, required: true },
    currency: { type: String, default: 'INR' }
  },
  paymentMethod: {
    type: String,
    enum: ['credit_card', 'debit_card', 'upi', 'net_banking', 'bank_transfer', 'cod', 'wallet', 'credit_terms'],
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'refunded', 'partially_refunded'],
    default: 'pending',
    index: true
  },
  transactionId: String,
  paymentGateway: String,
  gatewayResponse: Schema.Types.Mixed,
  settlementStatus: {
    type: String,
    enum: ['pending', 'processing', 'settled', 'failed'],
    default: 'pending'
  },
  settlementDate: Date,
  settlementAmount: Number,
  commissionRate: { type: Number, default: 0 },
  commissionAmount: { type: Number, default: 0 },
  netAmount: Number,
  refundAmount: Number,
  refundReason: String,
  refundDate: Date,
  refundTransactionId: String,
  initiatedAt: Date,
  completedAt: Date,
  metadata: Schema.Types.Mixed,
  notes: String
}, {
  timestamps: true
});

// Indexes for better query performance
PaymentSchema.index({ status: 1, createdAt: -1 });
PaymentSchema.index({ supplierId: 1, status: 1 });
PaymentSchema.index({ transactionId: 1 });

export default mongoose.model<IPayment>('Payment', PaymentSchema);
