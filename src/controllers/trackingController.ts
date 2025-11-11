import { Response } from 'express';
import Product from '../models/Product';
import RFQ from '../models/RFQ';
import Order from '../models/Order';
import Supplier from '../models/Supplier';
import { AuthRequest } from '../middleware/auth';

// Admin: Get all tracking statistics
export const getTrackingStatistics = async (req: AuthRequest, res: Response) => {
  try {
    const [
      totalProducts,
      pendingProducts,
      activeProducts,
      totalRFQs,
      pendingRFQs,
      totalOrders,
      pendingOrders,
      totalSuppliers,
      pendingSuppliers,
      approvedSuppliers,
    ] = await Promise.all([
      Product.countDocuments(),
      Product.countDocuments({ status: 'pending' }),
      Product.countDocuments({ status: 'active' }),
      RFQ.countDocuments(),
      RFQ.countDocuments({ status: 'pending' }),
      Order.countDocuments(),
      Order.countDocuments({ status: 'pending' }),
      Supplier.countDocuments(),
      Supplier.countDocuments({ status: 'pending' }),
      Supplier.countDocuments({ status: 'approved' }),
    ]);

    res.json({
      success: true,
      data: {
        products: {
          total: totalProducts,
          pending: pendingProducts,
          active: activeProducts,
        },
        rfqs: {
          total: totalRFQs,
          pending: pendingRFQs,
        },
        orders: {
          total: totalOrders,
          pending: pendingOrders,
        },
        suppliers: {
          total: totalSuppliers,
          pending: pendingSuppliers,
          approved: approvedSuppliers,
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics',
    });
  }
};

// Admin: Get all products
export const getAllProductsAdmin = async (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.query;
    const query = status ? { status } : {};

    const products = await Product.find(query)
      .populate('supplierId', 'companyName email phone')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: products,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch products',
    });
  }
};

// Admin: Approve/Reject product
export const updateProductStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status, rejectionReason } = req.body;

    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    product.status = status;
    await product.save();

    res.json({
      success: true,
      message: `Product ${status} successfully`,
      data: product,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update product status',
    });
  }
};

// Admin: Get all RFQs
export const getAllRFQsAdmin = async (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.query;
    const query = status ? { status } : {};

    const rfqs = await RFQ.find(query)
      .populate('assignedSupplier', 'companyName phone email')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: rfqs,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch RFQs',
    });
  }
};

// Admin: Assign RFQ to supplier
export const assignRFQToSupplier = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { supplierId } = req.body;

    const rfq = await RFQ.findById(id);

    if (!rfq) {
      return res.status(404).json({
        success: false,
        message: 'RFQ not found',
      });
    }

    rfq.assignedSupplier = supplierId;
    await rfq.save();

    // TODO: Send WhatsApp notification to supplier

    res.json({
      success: true,
      message: 'RFQ assigned to supplier successfully',
      data: rfq,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to assign RFQ',
    });
  }
};

// Admin: Get all orders
export const getAllOrdersAdmin = async (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.query;
    const query = status ? { status } : {};

    const orders = await Order.find(query)
      .populate('supplierId', 'companyName phone email')
      .populate('rfqId')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: orders,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch orders',
    });
  }
};

// Admin: Update order status
export const updateOrderStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status, trackingNumber, adminNotes } = req.body;

    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    if (status) order.status = status;
    if (trackingNumber) order.trackingNumber = trackingNumber;
    if (adminNotes) order.adminNotes = adminNotes;

    if (status === 'delivered') {
      order.actualDeliveryDate = new Date();
    }

    await order.save();

    res.json({
      success: true,
      message: 'Order updated successfully',
      data: order,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update order',
    });
  }
};
