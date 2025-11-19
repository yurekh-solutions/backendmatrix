import mongoose, { Schema, Document } from 'mongoose';

export interface IToolUsage extends Document {
  supplierId: mongoose.Types.ObjectId;
  supplierName: string;
  toolName: string;
  toolType: 'auto-reply' | 'lead-scoring' | 'order-automation' | 'smart-inventory' | 'price-optimizer' | 'analytics-hub';
  description: string;
  status: 'clicked' | 'enabled' | 'active';
  usageCount: number;
  metrics?: {
    responseTime?: number;
    successRate?: number;
    conversionRate?: number;
    revenueImpact?: number;
  };
  lastUsedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const toolUsageSchema = new Schema<IToolUsage>(
  {
    supplierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supplier',
      required: true,
      index: true
    },
    supplierName: {
      type: String,
      required: true,
      index: true
    },
    toolName: {
      type: String,
      required: true,
      enum: [
        'auto-reply',
        'lead-scoring',
        'order-automation',
        'smart-inventory',
        'price-optimizer',
        'analytics-hub'
      ]
    },
    toolType: {
      type: String,
      required: true,
      enum: [
        'auto-reply',
        'lead-scoring',
        'order-automation',
        'smart-inventory',
        'price-optimizer',
        'analytics-hub'
      ]
    },
    description: {
      type: String,
      default: ''
    },
    status: {
      type: String,
      enum: ['clicked', 'enabled', 'active'],
      default: 'clicked'
    },
    usageCount: {
      type: Number,
      default: 1
    },
    metrics: {
      responseTime: { type: Number, default: null },
      successRate: { type: Number, default: null },
      conversionRate: { type: Number, default: null },
      revenueImpact: { type: Number, default: null }
    },
    lastUsedAt: {
      type: Date,
      default: new Date()
    }
  },
  { timestamps: true }
);

// Index for analytics
toolUsageSchema.index({ toolType: 1, createdAt: -1 });
toolUsageSchema.index({ supplierId: 1, createdAt: -1 });

export default mongoose.model<IToolUsage>('ToolUsage', toolUsageSchema);
