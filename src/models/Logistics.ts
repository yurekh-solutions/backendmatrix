import mongoose, { Document, Schema } from 'mongoose';

export interface ILogistics extends Document {
  orderId: mongoose.Types.ObjectId;
  supplierId: mongoose.Types.ObjectId;
  
  // Shipment Details
  trackingNumber: string;
  carrier: string;
  serviceType: 'standard' | 'express' | 'same_day' | 'next_day' | 'cargo' | 'freight';
  
  // Shipping Address
  shippingAddress: {
    recipientName: string;
    phone: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    pincode: string;
    country: string;
    landmark?: string;
  };
  
  // Pickup Address
  pickupAddress?: {
    contactName: string;
    phone: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    pincode: string;
    country: string;
  };
  
  // Shipment Status
  status: 'pending' | 'pickup_scheduled' | 'in_transit' | 'out_for_delivery' | 'delivered' | 'failed' | 'returned' | 'cancelled';
  
  // Timeline
  timeline: Array<{
    status: string;
    location?: string;
    description: string;
    timestamp: Date;
  }>;
  
  // Delivery Information
  estimatedDeliveryDate?: Date;
  actualDeliveryDate?: Date;
  deliveryAttempts: number;
  deliveryProof?: {
    signatureName?: string;
    signatureImage?: string;
    photoProof?: string;
    otp?: string;
  };
  
  // Package Details
  packageDetails: {
    weight: number; // in kg
    dimensions?: {
      length: number;
      width: number;
      height: number;
      unit: string;
    };
    numberOfPackages: number;
    packageType?: string;
    fragile: boolean;
  };
  
  // Charges
  shippingCharges: {
    baseCharge: number;
    fuelSurcharge?: number;
    handlingCharges?: number;
    packagingCharges?: number;
    insuranceCharges?: number;
    totalCharges: number;
    currency: string;
  };
  
  // Insurance
  insurance?: {
    insured: boolean;
    coverage: number;
    policyNumber?: string;
  };
  
  // Return Information
  returnDetails?: {
    isReturn: boolean;
    returnReason?: string;
    returnRequestDate?: Date;
    returnApprovalDate?: Date;
  };
  
  // Metadata
  notes?: string;
  specialInstructions?: string;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

const LogisticsSchema = new Schema<ILogistics>({
  orderId: {
    type: Schema.Types.ObjectId,
    ref: 'Order',
    required: true,
    unique: true,
    index: true
  },
  supplierId: {
    type: Schema.Types.ObjectId,
    ref: 'Supplier',
    required: true,
    index: true
  },
  trackingNumber: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  carrier: {
    type: String,
    required: true
  },
  serviceType: {
    type: String,
    enum: ['standard', 'express', 'same_day', 'next_day', 'cargo', 'freight'],
    required: true
  },
  shippingAddress: {
    recipientName: { type: String, required: true },
    phone: { type: String, required: true },
    addressLine1: { type: String, required: true },
    addressLine2: String,
    city: { type: String, required: true },
    state: { type: String, required: true },
    pincode: { type: String, required: true },
    country: { type: String, default: 'India' },
    landmark: String
  },
  pickupAddress: {
    contactName: String,
    phone: String,
    addressLine1: String,
    addressLine2: String,
    city: String,
    state: String,
    pincode: String,
    country: { type: String, default: 'India' }
  },
  status: {
    type: String,
    enum: ['pending', 'pickup_scheduled', 'in_transit', 'out_for_delivery', 'delivered', 'failed', 'returned', 'cancelled'],
    default: 'pending',
    index: true
  },
  timeline: [{
    status: String,
    location: String,
    description: String,
    timestamp: { type: Date, default: Date.now }
  }],
  estimatedDeliveryDate: Date,
  actualDeliveryDate: Date,
  deliveryAttempts: { type: Number, default: 0 },
  deliveryProof: {
    signatureName: String,
    signatureImage: String,
    photoProof: String,
    otp: String
  },
  packageDetails: {
    weight: { type: Number, required: true },
    dimensions: {
      length: Number,
      width: Number,
      height: Number,
      unit: { type: String, default: 'cm' }
    },
    numberOfPackages: { type: Number, default: 1 },
    packageType: String,
    fragile: { type: Boolean, default: false }
  },
  shippingCharges: {
    baseCharge: { type: Number, required: true },
    fuelSurcharge: { type: Number, default: 0 },
    handlingCharges: { type: Number, default: 0 },
    packagingCharges: { type: Number, default: 0 },
    insuranceCharges: { type: Number, default: 0 },
    totalCharges: { type: Number, required: true },
    currency: { type: String, default: 'INR' }
  },
  insurance: {
    insured: { type: Boolean, default: false },
    coverage: Number,
    policyNumber: String
  },
  returnDetails: {
    isReturn: { type: Boolean, default: false },
    returnReason: String,
    returnRequestDate: Date,
    returnApprovalDate: Date
  },
  notes: String,
  specialInstructions: String
}, {
  timestamps: true
});

// Indexes for better query performance
LogisticsSchema.index({ status: 1, createdAt: -1 });
LogisticsSchema.index({ trackingNumber: 1 });
LogisticsSchema.index({ supplierId: 1, status: 1 });

export default mongoose.model<ILogistics>('Logistics', LogisticsSchema);
