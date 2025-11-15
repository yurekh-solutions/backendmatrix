import mongoose, { Document, Schema } from 'mongoose';

export interface ICategory extends Document {
  name: string;
  slug: string;
  icon?: string;
  isActive: boolean;
  isCustom: boolean;
  requestedBy?: mongoose.Types.ObjectId;
  approvedBy?: mongoose.Types.ObjectId;
  status: 'pending' | 'approved' | 'rejected';
  subcategories: ISubcategory[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ISubcategory {
  _id?: mongoose.Types.ObjectId;
  name: string;
  slug: string;
  isActive: boolean;
  isCustom: boolean;
  requestedBy?: mongoose.Types.ObjectId;
  approvedBy?: mongoose.Types.ObjectId;
  status: 'pending' | 'approved' | 'rejected';
}

const SubcategorySchema = new Schema<ISubcategory>({
  name: { type: String, required: true },
  slug: { type: String, required: true },
  isActive: { type: Boolean, default: true },
  isCustom: { type: Boolean, default: false },
  requestedBy: { type: Schema.Types.ObjectId, ref: 'Supplier' },
  approvedBy: { type: Schema.Types.ObjectId, ref: 'Admin' },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'approved'
  }
});

const CategorySchema = new Schema<ICategory>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    icon: {
      type: String,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isCustom: {
      type: Boolean,
      default: false,
    },
    requestedBy: {
      type: Schema.Types.ObjectId,
      ref: 'Supplier',
    },
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'Admin',
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'approved',
    },
    subcategories: [SubcategorySchema],
  },
  { timestamps: true }
);

export default mongoose.model<ICategory>('Category', CategorySchema);
