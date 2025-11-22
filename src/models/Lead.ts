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
  assignedTo?: mongoose.Types.ObjectId; // Admin or Sales person
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
  }
}, {
  timestamps: true
});

// Index for faster queries
leadSchema.index({ supplierId: 1, status: 1 });
leadSchema.index({ score: -1 }); // High score leads first

export default mongoose.model<ILead>('Lead', leadSchema);