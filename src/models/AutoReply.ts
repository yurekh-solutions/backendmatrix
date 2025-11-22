import mongoose, { Document, Schema } from 'mongoose';

export interface IAutoReply extends Document {
  supplierId: mongoose.Types.ObjectId;
  messageType: string;
  responseText: string;
  triggerKeywords: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const autoReplySchema = new Schema<IAutoReply>({
  supplierId: {
    type: Schema.Types.ObjectId,
    ref: 'Supplier',
    required: true
  },
  messageType: {
    type: String,
    required: true,
    enum: ['general-inquiry', 'price-quote', 'product-availability', 'custom']
  },
  responseText: {
    type: String,
    required: true
  },
  triggerKeywords: [{
    type: String
  }],
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for faster queries
autoReplySchema.index({ supplierId: 1, isActive: 1 });

export default mongoose.model<IAutoReply>('AutoReply', autoReplySchema);