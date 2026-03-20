import { Request, Response } from 'express';
import Order from '../models/Order';
import RFQ from '../models/RFQ';
import MaterialInquiry from '../models/MaterialInquiry';
import Inventory from '../models/Inventory';
import { AuthRequest } from '../middleware/auth';

// Convert RFQ to Order
export const convertRFQToOrder = async (req: AuthRequest, res: Response) => {
  try {
    const { rfqId, supplierId, quotedPrice } = req.body;

    if (!rfqId || !supplierId || !quotedPrice) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: rfqId, supplierId, quotedPrice',
      });
    }

    // Get RFQ
    const rfq = await RFQ.findById(rfqId);
    if (!rfq) {
      return res.status(404).json({
        success: false,
        message: 'RFQ not found',
      });
    }

    if (rfq.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'RFQ already converted to order',
      });
    }

    // Create Order
    const order = new Order({
      rfqId: rfq._id,
      customerId: rfq.userId,
      customerName: rfq.customerName,
      customerEmail: rfq.email,
      customerPhone: rfq.phone,
      supplierId,
      productName: rfq.productName,
      quantity: rfq.quantity,
      unit: rfq.unit,
      totalAmount: quotedPrice,
      currency: 'INR',
      status: 'pending',
      deliveryAddress: rfq.deliveryLocation,
      expectedDeliveryDate: rfq.expectedDeliveryDate,
      paymentStatus: 'pending',
    });

    await order.save();

    // Update RFQ status
    rfq.status = 'completed';
    rfq.supplierResponse = {
      supplierId,
      quotedPrice,
      quotedDate: new Date(),
    };
    await rfq.save();

    // Reserve inventory (if product exists in inventory)
    try {
      const inventory = await Inventory.findOne({ supplierId });
      
      if (inventory) {
        const previousQty = inventory.stock.currentQuantity;
        
        // Deduct from current quantity and add to reserved
        inventory.stock.currentQuantity -= rfq.quantity;
        inventory.stock.reservedQuantity += rfq.quantity;
        
        // Add movement record
        inventory.movements.push({
          type: 'sale',
          quantity: rfq.quantity,
          previousQuantity: previousQty,
          newQuantity: inventory.stock.currentQuantity,
          reason: 'Order created from RFQ',
          referenceId: order._id.toString(),
          timestamp: new Date(),
        } as any);
        
        // Update analytics
        if (inventory.analytics) {
          inventory.analytics.totalSold += rfq.quantity;
        }
        
        inventory.lastSaleDate = new Date();
        
        await inventory.save();
        
        console.log(`✅ Inventory updated: ${rfq.quantity} ${rfq.unit} reserved`);
      } else {
        console.log('⚠️  No inventory record found for this supplier');
      }
    } catch (inventoryError: any) {
      console.log('⚠️  Inventory update failed:', inventoryError.message);
      // Don't fail the order creation if inventory update fails
    }

    // TODO: Send WhatsApp notifications
    // await sendOrderConfirmationToCustomer(order);
    // await sendOrderNotificationToSupplier(order);

    res.status(201).json({
      success: true,
      message: 'RFQ converted to order successfully',
      data: order,
    });
  } catch (error: any) {
    console.error('❌ Error converting RFQ to order:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to convert RFQ to order: ' + error.message,
    });
  }
};

// Convert MaterialInquiry to Order
export const convertMaterialInquiryToOrder = async (req: AuthRequest, res: Response) => {
  try {
    const { inquiryId, acceptedQuoteId } = req.body;

    if (!inquiryId || !acceptedQuoteId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: inquiryId, acceptedQuoteId',
      });
    }

    // Get MaterialInquiry
    const inquiry = await MaterialInquiry.findById(inquiryId);
    if (!inquiry) {
      return res.status(404).json({
        success: false,
        message: 'Material inquiry not found',
      });
    }

    if (inquiry.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Inquiry already converted to order',
      });
    }

    // Find accepted quote
    const acceptedQuote = inquiry.supplierQuotes?.find(
      (q: any) => q._id.toString() === acceptedQuoteId
    );

    if (!acceptedQuote) {
      return res.status(404).json({
        success: false,
        message: 'Quote not found',
      });
    }

    // Create Order
    const order = new Order({
      rfqId: inquiry._id,
      customerName: inquiry.customerName,
      customerEmail: inquiry.email,
      customerPhone: inquiry.phone,
      supplierId: acceptedQuote.supplierId,
      productName: inquiry.materials.map((m: any) => m.materialName).join(', '),
      quantity: inquiry.materials.reduce((sum: number, m: any) => sum + m.quantity, 0),
      unit: 'MT',
      totalAmount: acceptedQuote.quotedPrice,
      currency: 'INR',
      status: 'pending',
      deliveryAddress: inquiry.deliveryLocation + (inquiry.deliveryAddress ? `, ${inquiry.deliveryAddress}` : ''),
      paymentStatus: 'pending',
    });

    await order.save();

    // Update MaterialInquiry status
    inquiry.status = 'completed';
    
    // Update quote statuses
    if (inquiry.supplierQuotes) {
      inquiry.supplierQuotes.forEach((q: any) => {
        if (q._id.toString() === acceptedQuoteId) {
          q.status = 'accepted';
        } else if (q.status === 'pending') {
          q.status = 'rejected';
        }
      });
    }

    await inquiry.save();

    res.status(201).json({
      success: true,
      message: 'Material inquiry converted to order successfully',
      data: order,
    });
  } catch (error: any) {
    console.error('❌ Error converting material inquiry to order:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to convert material inquiry to order: ' + error.message,
    });
  }
};

// Get customer orders by email
export const getCustomerOrders = async (req: Request, res: Response) => {
  try {
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required',
      });
    }

    const orders = await Order.find({ customerEmail: email })
      .populate('supplierId', 'companyName phone email')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: orders.length,
      data: orders,
    });
  } catch (error: any) {
    console.error('❌ Error fetching customer orders:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch orders',
    });
  }
};

// Get order by ID (for tracking)
export const getOrderById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const order = await Order.findById(id)
      .populate('supplierId', 'companyName phone email')
      .populate('rfqId');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    // Build timeline
    const timeline = [
      {
        status: 'Order Placed',
        timestamp: order.createdAt,
        description: 'Your order has been received',
      },
    ];

    if (order.status === 'confirmed' || order.status === 'processing' || order.status === 'shipped' || order.status === 'delivered') {
      timeline.push({
        status: 'Confirmed',
        timestamp: order.updatedAt,
        description: 'Order confirmed by supplier',
      });
    }

    if (order.status === 'processing' || order.status === 'shipped' || order.status === 'delivered') {
      timeline.push({
        status: 'Processing',
        timestamp: order.updatedAt,
        description: 'Order is being prepared',
      });
    }

    if (order.status === 'shipped' || order.status === 'delivered') {
      timeline.push({
        status: 'Shipped',
        timestamp: order.updatedAt,
        description: `Tracking: ${order.trackingNumber || 'N/A'}`,
      });
    }

    if (order.status === 'delivered') {
      timeline.push({
        status: 'Delivered',
        timestamp: order.actualDeliveryDate || order.updatedAt,
        description: 'Order delivered successfully',
      });
    }

    res.json({
      success: true,
      data: {
        order,
        timeline,
      },
    });
  } catch (error: any) {
    console.error('❌ Error fetching order:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch order',
    });
  }
};

// Get supplier orders
export const getSupplierOrders = async (req: Request, res: Response) => {
  try {
    const { supplierId } = req.params;

    const orders = await Order.find({ supplierId })
      .populate('rfqId')
      .sort({ createdAt: -1 });

    const stats = {
      total: orders.length,
      pending: orders.filter((o) => o.status === 'pending').length,
      confirmed: orders.filter((o) => o.status === 'confirmed').length,
      processing: orders.filter((o) => o.status === 'processing').length,
      shipped: orders.filter((o) => o.status === 'shipped').length,
      delivered: orders.filter((o) => o.status === 'delivered').length,
    };

    res.json({
      success: true,
      count: orders.length,
      stats,
      data: orders,
    });
  } catch (error: any) {
    console.error('❌ Error fetching supplier orders:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch orders',
    });
  }
};

// Update order status (for suppliers)
export const updateOrderStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status, trackingNumber, notes } = req.body;

    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    // Update order
    order.status = status;
    if (trackingNumber) order.trackingNumber = trackingNumber;
    if (notes) order.adminNotes = notes;

    if (status === 'delivered') {
      order.actualDeliveryDate = new Date();
      order.paymentStatus = 'paid'; // Assume COD paid on delivery
      
      // Unreserve inventory - move from reserved to sold
      try {
        const inventory = await Inventory.findOne({ supplierId: order.supplierId });
        
        if (inventory) {
          // Reduce reserved quantity
          inventory.stock.reservedQuantity -= order.quantity;
          
          // Add delivered movement
          inventory.movements.push({
            type: 'sale',
            quantity: order.quantity,
            previousQuantity: inventory.stock.currentQuantity,
            newQuantity: inventory.stock.currentQuantity,
            reason: 'Order delivered',
            referenceId: order._id.toString(),
            timestamp: new Date(),
          } as any);
          
          await inventory.save();
          console.log(`✅ Inventory unreserved: ${order.quantity} units delivered`);
        }
      } catch (inventoryError: any) {
        console.log('⚠️  Inventory unreserve failed:', inventoryError.message);
      }
    }

    if (status === 'cancelled') {
      // Return quantity to available stock
      try {
        const inventory = await Inventory.findOne({ supplierId: order.supplierId });
        
        if (inventory) {
          // Return reserved quantity back to current
          inventory.stock.currentQuantity += order.quantity;
          inventory.stock.reservedQuantity -= order.quantity;
          
          // Add cancelled movement
          inventory.movements.push({
            type: 'return',
            quantity: order.quantity,
            previousQuantity: inventory.stock.currentQuantity - order.quantity,
            newQuantity: inventory.stock.currentQuantity,
            reason: 'Order cancelled',
            referenceId: order._id.toString(),
            timestamp: new Date(),
          } as any);
          
          await inventory.save();
          console.log(`✅ Inventory restored: ${order.quantity} units returned`);
        }
      } catch (inventoryError: any) {
        console.log('⚠️  Inventory restore failed:', inventoryError.message);
      }
    }

    await order.save();

    // TODO: Send WhatsApp notification to customer
    // await sendOrderStatusUpdate(order);

    res.json({
      success: true,
      message: 'Order status updated successfully',
      data: order,
    });
  } catch (error: any) {
    console.error('❌ Error updating order status:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to update order status',
    });
  }
};

// Get all orders (admin)
export const getAllOrders = async (req: Request, res: Response) => {
  try {
    const { status, limit = 100 } = req.query;

    let query: any = {};
    if (status) query.status = status;

    const orders = await Order.find(query)
      .populate('supplierId', 'companyName phone email')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit as string));

    const stats = {
      total: await Order.countDocuments(),
      pending: await Order.countDocuments({ status: 'pending' }),
      confirmed: await Order.countDocuments({ status: 'confirmed' }),
      processing: await Order.countDocuments({ status: 'processing' }),
      shipped: await Order.countDocuments({ status: 'shipped' }),
      delivered: await Order.countDocuments({ status: 'delivered' }),
      cancelled: await Order.countDocuments({ status: 'cancelled' }),
    };

    res.json({
      success: true,
      count: orders.length,
      stats,
      data: orders,
    });
  } catch (error: any) {
    console.error('❌ Error fetching all orders:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch orders',
    });
  }
};
