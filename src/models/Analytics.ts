import mongoose, { Document, Schema } from 'mongoose';

export interface IAnalytics extends Document {
  supplierId: mongoose.Types.ObjectId;
  metricType: string;
  value: number;
  category?: string;
  metadata?: Record<string, any>;
  timestamp: Date;
  createdAt: Date;
}

const analyticsSchema = new Schema<IAnalytics>({
  supplierId: {
    type: Schema.Types.ObjectId,
    ref: 'Supplier',
    required: true
  },
  metricType: {
    type: String,
    required: true,
    enum: [
      'product-view', 
      'inquiry', 
      'order', 
      'conversion', 
      'revenue',
      'auto-reply',
      'lead-score',
      'inventory-level'
    ]
  },
  value: {
    type: Number,
    required: true
  },
  category: String,
  metadata: Schema.Types.Mixed,
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for faster queries
analyticsSchema.index({ supplierId: 1, metricType: 1, timestamp: -1 });
analyticsSchema.index({ timestamp: -1 });

export default mongoose.model<IAnalytics>('Analytics', analyticsSchema);