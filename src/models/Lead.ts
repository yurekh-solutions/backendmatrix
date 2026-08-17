import mongoose, { Document, Schema } from 'mongoose';

export interface ILead extends Document {
  supplierId: mongoose.Types.ObjectId;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  message: string;
  source: string;
  score?: number;
  status: 'new' | 'contacted' | 'qualified' | 'unqualified' | 'converted';
  tags: string[];
  assignedTo?: mongoose.Types.ObjectId;
  quotedPrice?: number;
  quoteMessage?: string;
  quoteStatus?: 'pending_admin' | 'approved' | 'rejected';
  inquiryRef?: string; // inquiry number for tracking
  // Step 1+2 additions: notification + delivery tracking (no SMTP, in-app + wa.me only)
  whatsappUrl?: string; // pre-filled wa.me link for this supplier
  viewedAt?: Date; // when supplier first opened the lead
  quoteSubmittedAt?: Date; // when supplier submitted quote
  matchKeywords?: string[]; // keywords that matched (for transparency)
  notifiedAt?: Date; // when lead was queued for notification
  createdAt: Date;
  updatedAt: Date;
}

const leadSchema = new Schema<ILead>({
  supplierId: {
    type: Schema.Types.ObjectId,
    ref: 'Supplier',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  phone: String,
  company: String,
  message: {
    type: String,
    required: true
  },
  source: {
    type: String,
    required: true,
    enum: ['website', 'referral', 'social-media', 'email', 'other']
  },
  score: {
    type: Number,
    min: 0,
    max: 100
  },
  status: {
    type: String,
    enum: ['new', 'contacted', 'qualified', 'unqualified', 'converted'],
    default: 'new'
  },
  tags: [{
    type: String
  }],
  assignedTo: {
    type: Schema.Types.ObjectId,
    ref: 'Admin'
  },
  quotedPrice: {
    type: Number
  },
  quoteMessage: {
    type: String
  },
  quoteStatus: {
    type: String,
    enum: ['pending_admin', 'approved', 'rejected'],
    default: undefined
  },
  inquiryRef: {
    type: String
  },
  // Step 1+2 additions: in-app + wa.me delivery (no SMTP)
  whatsappUrl: {
    type: String
  },
  viewedAt: {
    type: Date
  },
  quoteSubmittedAt: {
    type: Date
  },
  matchKeywords: [{
    type: String
  }],
  notifiedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Index for faster queries
leadSchema.index({ supplierId: 1, status: 1 });
leadSchema.index({ score: -1 }); // High score leads first
leadSchema.index({ notifiedAt: -1 }); // Recently notified leads

export default mongoose.model<ILead>('Lead', leadSchema);