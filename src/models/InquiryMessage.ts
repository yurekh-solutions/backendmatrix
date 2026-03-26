import mongoose, { Document, Schema } from 'mongoose';

export interface IInquiryMessage extends Document {
  inquiryId: string;          // shared thread key (MI inquiryNumber, RFQ inquiryNumber, or lead _id)
  inquiryType: 'MI' | 'RFQ' | 'LEAD';
  senderId: string;           // supplierId string OR 'BUYER'
  senderRole: 'supplier' | 'buyer' | 'ritzyard';
  message: string;
  isRead: boolean;
  readBy: string[];           // list of supplierIds or 'BUYER' who have read
  createdAt: Date;
  updatedAt: Date;
}

const InquiryMessageSchema = new Schema<IInquiryMessage>(
  {
    inquiryId: {
      type: String,
      required: true,
      index: true,
    },
    inquiryType: {
      type: String,
      enum: ['MI', 'RFQ', 'LEAD'],
      required: true,
    },
    senderId: {
      type: String,
      required: true,
    },
    senderRole: {
      type: String,
      enum: ['supplier', 'buyer', 'ritzyard'],
      required: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    readBy: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// Composite index for fast thread queries
InquiryMessageSchema.index({ inquiryId: 1, createdAt: 1 });

export default mongoose.model<IInquiryMessage>('InquiryMessage', InquiryMessageSchema);
