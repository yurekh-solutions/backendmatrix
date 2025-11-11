import mongoose, { Document, Schema } from 'mongoose';

export interface IProduct extends Document {
  supplierId: mongoose.Types.ObjectId;
  name: string;
  category: string;
  description: string;
  image: string;
  applications: string[];
  features: string[];
  specifications: {
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
  price: {
    amount: number;
    currency: string;
    unit: string;
  };
  images: string[];
  stock: {
    available: boolean;
    quantity?: number;
    minimumOrder?: number;
  };
  status: 'active' | 'inactive' | 'pending' | 'rejected';
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
    description: {
      type: String,
      required: true,
    },
    image: {
      type: String,
      required: true,
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
      amount: { type: Number, required: true },
      currency: { type: String, default: 'INR' },
      unit: { type: String, required: true },
    },
    images: [String],
    stock: {
      available: { type: Boolean, default: true },
      quantity: Number,
      minimumOrder: Number,
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'pending', 'rejected'],
      default: 'pending',
    },
  },
  { timestamps: true }
);

export default mongoose.model<IProduct>('Product', ProductSchema);
