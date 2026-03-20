import { Request, Response } from 'express';
import Inventory from '../models/Inventory';
import Product from '../models/Product';

// Create or Update Inventory
export const upsertInventory = async (req: any, res: Response) => {
  try {
    const {
      productId,
      stock,
      location,
      pricing,
      sku,
      barcode
    } = req.body;

    const supplierId = req.supplier.id;

    // Verify product exists and belongs to supplier
    const product = await Product.findOne({ _id: productId, supplierId });
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Check if inventory already exists
    let inventory = await Inventory.findOne({ productId, supplierId });

    if (inventory) {
      // Update existing inventory
      const previousQuantity = inventory.stock.currentQuantity;
      
      inventory.stock = { ...inventory.stock, ...stock };
      if (location) inventory.location = location;
      if (pricing) inventory.pricing = { ...inventory.pricing, ...pricing };
      if (sku) inventory.sku = sku;
      if (barcode) inventory.barcode = barcode;

      // Record movement
      inventory.movements.push({
        type: 'adjustment',
        quantity: stock.currentQuantity - previousQuantity,
        previousQuantity,
        newQuantity: stock.currentQuantity,
        reason: 'Manual adjustment',
        timestamp: new Date()
      });

      await inventory.save();

      res.json({
        success: true,
        message: 'Inventory updated successfully',
        data: inventory
      });
    } else {
      // Create new inventory
      inventory = new Inventory({
        productId,
        supplierId,
        stock: {
          currentQuantity: stock.currentQuantity || 0,
          reservedQuantity: 0,
          availableQuantity: stock.currentQuantity || 0,
          unit: stock.unit || 'units',
          minimumStockLevel: stock.minimumStockLevel || 10,
          maximumStockLevel: stock.maximumStockLevel,
          reorderPoint: stock.reorderPoint || 20,
          reorderQuantity: stock.reorderQuantity || 50
        },
        location,
        pricing: {
          costPrice: pricing.costPrice,
          sellingPrice: pricing.sellingPrice,
          mrp: pricing.mrp,
          discount: pricing.discount || 0,
          taxRate: pricing.taxRate || 18,
          currency: pricing.currency || 'INR'
        },
        sku,
        barcode,
        movements: [{
          type: 'purchase',
          quantity: stock.currentQuantity || 0,
          previousQuantity: 0,
          newQuantity: stock.currentQuantity || 0,
          reason: 'Initial stock',
          timestamp: new Date()
        }]
      });

      await inventory.save();

      res.status(201).json({
        success: true,
        message: 'Inventory created successfully',
        data: inventory
      });
    }
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to manage inventory',
      error: error.message
    });
  }
};

// Get all inventory for supplier
export const getSupplierInventory = async (req: any, res: Response) => {
  try {
    const supplierId = req.supplier.id;
    const { status, lowStock, outOfStock } = req.query;

    const filter: any = { supplierId };

    if (status) filter.status = status;
    if (lowStock === 'true') filter['alerts.lowStockAlert'] = true;
    if (outOfStock === 'true') filter['alerts.outOfStockAlert'] = true;

    const inventory = await Inventory.find(filter)
      .populate('productId', 'name category description image')
      .sort({ 'stock.availableQuantity': 1 });

    res.json({
      success: true,
      data: inventory
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch inventory',
      error: error.message
    });
  }
};

// Get single inventory item
export const getInventoryById = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const supplierId = req.supplier.id;

    const inventory = await Inventory.findOne({ _id: id, supplierId })
      .populate('productId', 'name category description image');

    if (!inventory) {
      return res.status(404).json({
        success: false,
        message: 'Inventory not found'
      });
    }

    res.json({
      success: true,
      data: inventory
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch inventory',
      error: error.message
    });
  }
};

// Update stock quantity
export const updateStock = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const { quantity, type, reason, referenceId } = req.body;
    const supplierId = req.supplier.id;

    const inventory = await Inventory.findOne({ _id: id, supplierId });

    if (!inventory) {
      return res.status(404).json({
        success: false,
        message: 'Inventory not found'
      });
    }

    const previousQuantity = inventory.stock.currentQuantity;
    let newQuantity = previousQuantity;

    // Update quantity based on type
    switch (type) {
      case 'purchase':
        newQuantity = previousQuantity + quantity;
        inventory.lastPurchaseDate = new Date();
        if (inventory.analytics) inventory.analytics.totalPurchased += quantity;
        break;
      case 'sale':
        newQuantity = previousQuantity - quantity;
        inventory.lastSaleDate = new Date();
        if (inventory.analytics) inventory.analytics.totalSold += quantity;
        break;
      case 'return':
        newQuantity = previousQuantity + quantity;
        if (inventory.analytics) inventory.analytics.totalReturned += quantity;
        break;
      case 'damaged':
        newQuantity = previousQuantity - quantity;
        if (inventory.analytics) inventory.analytics.totalDamaged += quantity;
        break;
      case 'adjustment':
        newQuantity = quantity;
        break;
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid stock movement type'
        });
    }

    inventory.stock.currentQuantity = newQuantity;

    // Record movement
    inventory.movements.push({
      type,
      quantity: type === 'sale' || type === 'damaged' ? -quantity : quantity,
      previousQuantity,
      newQuantity,
      reason,
      referenceId,
      timestamp: new Date()
    });

    await inventory.save();

    res.json({
      success: true,
      message: 'Stock updated successfully',
      data: inventory
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to update stock',
      error: error.message
    });
  }
};

// Get low stock alerts
export const getLowStockAlerts = async (req: any, res: Response) => {
  try {
    const supplierId = req.supplier.id;

    const lowStock = await Inventory.find({
      supplierId,
      'alerts.lowStockAlert': true,
      status: 'active'
    }).populate('productId', 'name category');

    const outOfStock = await Inventory.find({
      supplierId,
      'alerts.outOfStockAlert': true
    }).populate('productId', 'name category');

    res.json({
      success: true,
      data: {
        lowStock,
        outOfStock,
        totalAlerts: lowStock.length + outOfStock.length
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch stock alerts',
      error: error.message
    });
  }
};

// Get inventory analytics
export const getInventoryAnalytics = async (req: any, res: Response) => {
  try {
    const supplierId = req.supplier.id;

    const inventory = await Inventory.find({ supplierId, status: 'active' })
      .populate('productId', 'name category');

    const analytics = {
      totalProducts: inventory.length,
      totalStockValue: inventory.reduce((sum, inv) => 
        sum + (inv.stock.currentQuantity * inv.pricing.costPrice), 0
      ),
      lowStockItems: inventory.filter(inv => inv.alerts.lowStockAlert).length,
      outOfStockItems: inventory.filter(inv => inv.alerts.outOfStockAlert).length,
      totalSales: inventory.reduce((sum, inv) => 
        sum + (inv.analytics?.totalSold || 0), 0
      ),
      totalPurchases: inventory.reduce((sum, inv) => 
        sum + (inv.analytics?.totalPurchased || 0), 0
      ),
      topSellingProducts: inventory
        .sort((a, b) => (b.analytics?.totalSold || 0) - (a.analytics?.totalSold || 0))
        .slice(0, 10)
        .map(inv => ({
          product: inv.productId,
          soldQuantity: inv.analytics?.totalSold || 0,
          revenue: (inv.analytics?.totalSold || 0) * inv.pricing.sellingPrice
        }))
    };

    res.json({
      success: true,
      data: analytics
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch inventory analytics',
      error: error.message
    });
  }
};

// Bulk import inventory
export const bulkImportInventory = async (req: any, res: Response) => {
  try {
    const { items } = req.body;
    const supplierId = req.supplier.id;

    const results = {
      success: 0,
      failed: 0,
      errors: [] as any[]
    };

    for (const item of items) {
      try {
        const product = await Product.findOne({ 
          _id: item.productId, 
          supplierId 
        });

        if (!product) {
          results.failed++;
          results.errors.push({
            productId: item.productId,
            error: 'Product not found'
          });
          continue;
        }

        let inventory = await Inventory.findOne({ 
          productId: item.productId, 
          supplierId 
        });

        if (inventory) {
          inventory.stock.currentQuantity = item.quantity;
          if (item.price) inventory.pricing.sellingPrice = item.price;
        } else {
          inventory = new Inventory({
            productId: item.productId,
            supplierId,
            stock: {
              currentQuantity: item.quantity,
              reservedQuantity: 0,
              availableQuantity: item.quantity,
              unit: item.unit || 'units',
              minimumStockLevel: item.minimumStockLevel || 10,
              reorderPoint: item.reorderPoint || 20,
              reorderQuantity: item.reorderQuantity || 50
            },
            pricing: {
              costPrice: item.costPrice || 0,
              sellingPrice: item.price || 0,
              taxRate: 18,
              currency: 'INR'
            },
            movements: [{
              type: 'purchase',
              quantity: item.quantity,
              previousQuantity: 0,
              newQuantity: item.quantity,
              reason: 'Bulk import',
              timestamp: new Date()
            }]
          });
        }

        await inventory.save();
        results.success++;
      } catch (error: any) {
        results.failed++;
        results.errors.push({
          productId: item.productId,
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      message: 'Bulk import completed',
      data: results
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to bulk import inventory',
      error: error.message
    });
  }
};
