import mongoose, { Document, Schema } from 'mongoose';

export interface IInventory extends Document {
  productId: mongoose.Types.ObjectId;
  supplierId: mongoose.Types.ObjectId;
  
  // Stock Information
  stock: {
    currentQuantity: number;
    reservedQuantity: number;
    availableQuantity: number;
    unit: string;
    minimumStockLevel: number;
    maximumStockLevel?: number;
    reorderPoint: number;
    reorderQuantity: number;
  };
  
  // Location Details
  location?: {
    warehouse: string;
    rack?: string;
    bin?: string;
    aisle?: string;
  };
  
  // Pricing
  pricing: {
    costPrice: number;
    sellingPrice: number;
    mrp?: number;
    discount?: number;
    taxRate: number;
    currency: string;
  };
  
  // Stock Movements
  movements: Array<{
    type: 'purchase' | 'sale' | 'return' | 'damaged' | 'adjustment' | 'transfer';
    quantity: number;
    previousQuantity: number;
    newQuantity: number;
    reason?: string;
    referenceId?: string; // Order ID, Transfer ID, etc.
    timestamp: Date;
    performedBy?: string;
  }>;
  
  // Alerts
  alerts: {
    lowStockAlert: boolean;
    outOfStockAlert: boolean;
    expiryAlert: boolean;
    lastAlertSent?: Date;
  };
  
  // Batch Information (for products with batches)
  batches?: Array<{
    batchNumber: string;
    quantity: number;
    manufacturingDate?: Date;
    expiryDate?: Date;
    supplierBatchId?: string;
  }>;
  
  // SKU and Identifiers
  sku?: string;
  barcode?: string;
  
  // Status
  status: 'active' | 'inactive' | 'discontinued' | 'out_of_stock';
  
  // Last Stock Update
  lastStockUpdate: Date;
  lastPurchaseDate?: Date;
  lastSaleDate?: Date;
  
  // Analytics
  analytics?: {
    totalPurchased: number;
    totalSold: number;
    totalReturned: number;
    totalDamaged: number;
    averageMonthlySales: number;
    turnoverRate?: number;
  };
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

const InventorySchema = new Schema<IInventory>({
  productId: {
    type: Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
    index: true
  },
  supplierId: {
    type: Schema.Types.ObjectId,
    ref: 'Supplier',
    required: true,
    index: true
  },
  stock: {
    currentQuantity: { type: Number, required: true, default: 0 },
    reservedQuantity: { type: Number, default: 0 },
    availableQuantity: { type: Number, required: true, default: 0 },
    unit: { type: String, required: true, default: 'units' },
    minimumStockLevel: { type: Number, default: 10 },
    maximumStockLevel: Number,
    reorderPoint: { type: Number, default: 20 },
    reorderQuantity: { type: Number, default: 50 }
  },
  location: {
    warehouse: String,
    rack: String,
    bin: String,
    aisle: String
  },
  pricing: {
    costPrice: { type: Number, required: true },
    sellingPrice: { type: Number, required: true },
    mrp: Number,
    discount: { type: Number, default: 0 },
    taxRate: { type: Number, default: 18 },
    currency: { type: String, default: 'INR' }
  },
  movements: [{
    type: {
      type: String,
      enum: ['purchase', 'sale', 'return', 'damaged', 'adjustment', 'transfer'],
      required: true
    },
    quantity: { type: Number, required: true },
    previousQuantity: { type: Number, required: true },
    newQuantity: { type: Number, required: true },
    reason: String,
    referenceId: String,
    timestamp: { type: Date, default: Date.now },
    performedBy: String
  }],
  alerts: {
    lowStockAlert: { type: Boolean, default: false },
    outOfStockAlert: { type: Boolean, default: false },
    expiryAlert: { type: Boolean, default: false },
    lastAlertSent: Date
  },
  batches: [{
    batchNumber: { type: String, required: true },
    quantity: { type: Number, required: true },
    manufacturingDate: Date,
    expiryDate: Date,
    supplierBatchId: String
  }],
  sku: {
    type: String,
    index: true
  },
  barcode: String,
  status: {
    type: String,
    enum: ['active', 'inactive', 'discontinued', 'out_of_stock'],
    default: 'active',
    index: true
  },
  lastStockUpdate: { type: Date, default: Date.now },
  lastPurchaseDate: Date,
  lastSaleDate: Date,
  analytics: {
    totalPurchased: { type: Number, default: 0 },
    totalSold: { type: Number, default: 0 },
    totalReturned: { type: Number, default: 0 },
    totalDamaged: { type: Number, default: 0 },
    averageMonthlySales: { type: Number, default: 0 },
    turnoverRate: Number
  }
}, {
  timestamps: true
});

// Compound index for supplier + product
InventorySchema.index({ supplierId: 1, productId: 1 }, { unique: true });
InventorySchema.index({ status: 1, supplierId: 1 });
InventorySchema.index({ 'stock.availableQuantity': 1 });
InventorySchema.index({ sku: 1 });

// Pre-save middleware to calculate available quantity
InventorySchema.pre('save', function(next) {
  this.stock.availableQuantity = this.stock.currentQuantity - this.stock.reservedQuantity;
  
  // Update alert flags
  if (this.stock.availableQuantity <= 0) {
    this.alerts.outOfStockAlert = true;
    this.status = 'out_of_stock';
  } else if (this.stock.availableQuantity <= this.stock.minimumStockLevel) {
    this.alerts.lowStockAlert = true;
  } else {
    this.alerts.lowStockAlert = false;
    this.alerts.outOfStockAlert = false;
    if (this.status === 'out_of_stock') {
      this.status = 'active';
    }
  }
  
  this.lastStockUpdate = new Date();
  next();
});

export default mongoose.model<IInventory>('Inventory', InventorySchema);
