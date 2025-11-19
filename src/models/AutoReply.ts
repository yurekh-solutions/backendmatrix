import mongoose, { Document, Schema } from 'mongoose';

export interface IAutoReply extends Document {
  supplierId: mongoose.Types.ObjectId;
  messageType: 'general-inquiry' | 'price-quote' | 'product-availability' | 'custom';
  responseText: string;
  triggerKeywords: string[];
  isActive: boolean;
  usageCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const AutoReplySchema = new Schema<IAutoReply>(
  {
    supplierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supplier',
      required: true,
      index: true
    },
    messageType: {
      type: String,
      enum: ['general-inquiry', 'price-quote', 'product-availability', 'custom'],
      required: true
    },
    responseText: {
      type: String,
      required: true,
      minlength: 10,
      maxlength: 1000
    },
    triggerKeywords: [{
      type: String,
      trim: true
    }],
    isActive: {
      type: Boolean,
      default: true
    },
    usageCount: {
      type: Number,
      default: 0
    }
  },
  { timestamps: true }
);

// Index for fast queries
AutoReplySchema.index({ supplierId: 1, messageType: 1 });
AutoReplySchema.index({ supplierId: 1, isActive: 1 });

const AutoReply = mongoose.model<IAutoReply>('AutoReply', AutoReplySchema);

export default AutoReply;
