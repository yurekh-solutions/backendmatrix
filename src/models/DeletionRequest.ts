import mongoose, { Document, Schema } from 'mongoose';

export interface IDeletionRequest extends Document {
  requestType: 'account' | 'data';
  userType: 'buyer' | 'supplier';
  email: string;
  name: string;
  phoneNumber?: string;
  reason?: string;
  dataTypes?: string[]; // For data deletion requests
  status: 'pending' | 'in-progress' | 'completed' | 'rejected';
  submittedAt: Date;
  processedAt?: Date;
  processedBy?: mongoose.Types.ObjectId;
  adminNotes?: string;
  ipAddress?: string;
  userAgent?: string;
}

const DeletionRequestSchema = new Schema<IDeletionRequest>(
  {
    requestType: {
      type: String,
      enum: ['account', 'data'],
      required: true,
    },
    userType: {
      type: String,
      enum: ['buyer', 'supplier'],
      required: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    phoneNumber: {
      type: String,
      trim: true,
    },
    reason: {
      type: String,
      maxlength: 1000,
    },
    dataTypes: [{
      type: String,
    }],
    status: {
      type: String,
      enum: ['pending', 'in-progress', 'completed', 'rejected'],
      default: 'pending',
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
    processedAt: {
      type: Date,
    },
    processedBy: {
      type: Schema.Types.ObjectId,
      ref: 'Admin',
    },
    adminNotes: {
      type: String,
      maxlength: 2000,
    },
    ipAddress: {
      type: String,
    },
    userAgent: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
DeletionRequestSchema.index({ email: 1, status: 1 });
DeletionRequestSchema.index({ submittedAt: -1 });

export default mongoose.model<IDeletionRequest>('DeletionRequest', DeletionRequestSchema);
