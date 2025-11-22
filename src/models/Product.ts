import mongoose, { Document, Schema } from 'mongoose';

export interface IProduct extends Document {
  supplierId: mongoose.Types.ObjectId;
  name: string;
  category: string;
  subcategory?: string;
  customCategory?: string;
  customSubcategory?: string;
  description: string;
  image?: string;
  applications?: string[];
  features?: string[];
  specifications?: {
    materialStandard?: string;
    packaging?: string;
    testingCertificate?: string;
    brand?: string[];
    grades?: string[];
    delivery?: string;
    quality?: string;
    availability?: string;
    [key: string]: string | string[] | undefined;
  };
  price?: {
    amount: number;
    currency: string;
    unit: string;
  };
  images?: string[];
  stock?: {
    available: boolean;
    quantity?: number;
    minimumOrder?: number;
    reserved?: number; // Reserved for orders
    lastUpdated?: Date;
  };
  status: 'active' | 'inactive' | 'pending' | 'rejected';
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema = new Schema<IProduct>(
  {
    supplierId: {
      type: Schema.Types.ObjectId,
      ref: 'Supplier',
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
    },
    subcategory: {
      type: String,
    },
    customCategory: {
      type: String,
    },
    customSubcategory: {
      type: String,
    },
    description: {
      type: String,
      required: true,
    },
    image: {
      type: String,
    },
    applications: [String],
    features: [String],
    specifications: {
      materialStandard: String,
      packaging: String,
      testingCertificate: String,
      brand: [String],
      grades: [String],
      delivery: String,
      quality: String,
      availability: String,
    },
    price: {
      amount: { type: Number, default: 0 },
      currency: { type: String, default: 'INR' },
      unit: { type: String, default: 'unit' },
    },
    images: [String],
    stock: {
      available: { type: Boolean, default: true },
      quantity: Number,
      minimumOrder: Number,
      reserved: { type: Number, default: 0 },
      lastUpdated: { type: Date, default: Date.now }
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'pending', 'rejected'],
      default: 'pending',
    },
    rejectionReason: {
      type: String,
    },
  },
  { timestamps: true }
);

export default mongoose.model<IProduct>('Product', ProductSchema);
