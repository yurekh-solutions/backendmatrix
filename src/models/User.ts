import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  password?: string;
  googleId?: string;
  phone?: string;
  company?: string;
  profileImage?: string;
  businessImage?: string;
  role: 'buyer' | 'guest';
  authProvider?: 'local' | 'google';
  passwordResetToken?: string;
  passwordResetTokenExpiry?: Date;
  cart: {
    productId: mongoose.Types.ObjectId;
    quantity: number;
    addedAt: Date;
  }[];
  rfqHistory: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: false,
      select: false,
    },
    googleId: {
      type: String,
      sparse: true,
      unique: true,
    },
    authProvider: {
      type: String,
      enum: ['local', 'google'],
      default: 'local',
    },
    phone: {
      type: String,
      trim: true,
    },
    company: {
      type: String,
      trim: true,
    },
    profileImage: {
      type: String, // Cloudinary URL
    },
    businessImage: {
      type: String, // Cloudinary URL
    },
    role: {
      type: String,
      enum: ['buyer', 'guest'],
      default: 'buyer',
    },
    cart: [
      {
        productId: {
          type: Schema.Types.ObjectId,
          ref: 'Product',
        },
        quantity: {
          type: Number,
          default: 1,
        },
        addedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    rfqHistory: [
      {
        type: Schema.Types.ObjectId,
        ref: 'RFQ',
      },
    ],
    passwordResetToken: {
      type: String,
      select: false,
    },
    passwordResetTokenExpiry: {
      type: Date,
      select: false,
    },
  },
  { timestamps: true }
);

export default mongoose.model<IUser>('User', UserSchema);
