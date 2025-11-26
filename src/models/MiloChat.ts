import mongoose, { Schema, Document } from 'mongoose';

export interface IMiloChat extends Document {
  userId?: string;
  supplierId?: string;
  userName: string;
  userType: 'buyer' | 'supplier' | 'admin';
  messages: Array<{
    sender: 'user' | 'milo';
    message: string;
    timestamp: Date;
    intent?: string; // product_search, supplier_matching, training, growth_tips, pricing, etc.
    metadata?: Record<string, any>;
  }>;
  context: {
    currentPhase: 'onboarding' | 'searching' | 'negotiating' | 'learning' | 'growing';
    products?: string[]; // Product IDs discussed
    suppliers?: string[]; // Supplier IDs discussed
    recommendedProducts?: string[];
    userProfile?: {
      businessType?: string;
      interests?: string[];
      budget?: number;
      location?: string;
    };
  };
  summary: string; // AI-generated session summary
  recommendations: Array<{
    type: 'product' | 'supplier' | 'training' | 'growth_tip';
    title: string;
    description: string;
    actionUrl?: string;
    relevanceScore: number;
  }>;
  sessionDuration: number; // in seconds
  helpful: boolean | null;
  createdAt: Date;
  updatedAt: Date;
}

const MiloChatSchema = new Schema<IMiloChat>(
  {
    userId: String,
    supplierId: String,
    userName: {
      type: String,
      required: true,
    },
    userType: {
      type: String,
      enum: ['buyer', 'supplier', 'admin'],
      default: 'buyer',
    },
    messages: [
      {
        sender: {
          type: String,
          enum: ['user', 'milo'],
          required: true,
        },
        message: String,
        timestamp: {
          type: Date,
          default: Date.now,
        },
        intent: String,
        metadata: Schema.Types.Mixed,
      },
    ],
    context: {
      currentPhase: {
        type: String,
        enum: ['onboarding', 'searching', 'negotiating', 'learning', 'growing'],
        default: 'onboarding',
      },
      products: [String],
      suppliers: [String],
      recommendedProducts: [String],
      userProfile: {
        businessType: String,
        interests: [String],
        budget: Number,
        location: String,
      },
    },
    summary: String,
    recommendations: [
      {
        type: {
          type: String,
          enum: ['product', 'supplier', 'training', 'growth_tip'],
        },
        title: String,
        description: String,
        actionUrl: String,
        relevanceScore: Number,
      },
    ],
    sessionDuration: {
      type: Number,
      default: 0,
    },
    helpful: {
      type: Boolean,
      default: null,
    },
  },
  { timestamps: true }
);

MiloChatSchema.index({ userId: 1, createdAt: -1 });
MiloChatSchema.index({ supplierId: 1, createdAt: -1 });
MiloChatSchema.index({ userType: 1 });

export default mongoose.model<IMiloChat>('MiloChat', MiloChatSchema);
