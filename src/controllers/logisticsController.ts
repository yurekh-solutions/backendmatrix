import { Request, Response } from 'express';
import Logistics from '../models/Logistics';
import Order from '../models/Order';

// Create shipment
export const createShipment = async (req: any, res: Response) => {
  try {
    const {
      orderId,
      carrier,
      serviceType,
      shippingAddress,
      packageDetails,
      shippingCharges,
      specialInstructions
    } = req.body;

    const supplierId = req.supplier.id;

    // Verify order exists
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Generate tracking number
    const trackingNumber = `TRACK${Date.now()}${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    const logistics = new Logistics({
      orderId,
      supplierId,
      trackingNumber,
      carrier,
      serviceType,
      shippingAddress,
      packageDetails,
      shippingCharges,
      specialInstructions,
      status: 'pending',
      timeline: [{
        status: 'pending',
        description: 'Shipment created, awaiting pickup',
        timestamp: new Date()
      }]
    });

    await logistics.save();

    res.status(201).json({
      success: true,
      message: 'Shipment created successfully',
      data: logistics
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to create shipment',
      error: error.message
    });
  }
};

// Get all shipments for supplier
export const getSupplierShipments = async (req: any, res: Response) => {
  try {
    const supplierId = req.supplier.id;
    const { status, startDate, endDate } = req.query;

    const filter: any = { supplierId };

    if (status) filter.status = status;
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate as string);
      if (endDate) filter.createdAt.$lte = new Date(endDate as string);
    }

    const shipments = await Logistics.find(filter)
      .populate('orderId', 'orderNumber customerName productName')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: shipments
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch shipments',
      error: error.message
    });
  }
};

// Track shipment
export const trackShipment = async (req: Request, res: Response) => {
  try {
    const { trackingNumber } = req.params;

    const shipment = await Logistics.findOne({ trackingNumber })
      .populate('orderId', 'orderNumber customerName productName quantity')
      .populate('supplierId', 'companyName phone email');

    if (!shipment) {
      return res.status(404).json({
        success: false,
        message: 'Shipment not found'
      });
    }

    res.json({
      success: true,
      data: shipment
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to track shipment',
      error: error.message
    });
  }
};

// Update shipment status
export const updateShipmentStatus = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const { status, location, description } = req.body;
    const supplierId = req.supplier.id;

    const shipment = await Logistics.findOne({ _id: id, supplierId });

    if (!shipment) {
      return res.status(404).json({
        success: false,
        message: 'Shipment not found'
      });
    }

    shipment.status = status;
    shipment.timeline.push({
      status,
      location,
      description,
      timestamp: new Date()
    });

    if (status === 'delivered') {
      shipment.actualDeliveryDate = new Date();
    }

    await shipment.save();

    res.json({
      success: true,
      message: 'Shipment status updated successfully',
      data: shipment
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to update shipment status',
      error: error.message
    });
  }
};

// Get logistics analytics
export const getLogisticsAnalytics = async (req: any, res: Response) => {
  try {
    const supplierId = req.supplier.id;
    const { period = '30' } = req.query;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(period as string));

    const shipments = await Logistics.find({
      supplierId,
      createdAt: { $gte: startDate }
    });

    const analytics = {
      totalShipments: shipments.length,
      inTransit: shipments.filter(s => s.status === 'in_transit').length,
      delivered: shipments.filter(s => s.status === 'delivered').length,
      failed: shipments.filter(s => s.status === 'failed').length,
      onTimeDelivery: 0,
      averageDeliveryTime: 0,
      totalShippingRevenue: shipments.reduce((sum, s) => sum + s.shippingCharges.totalCharges, 0)
    };

    // Calculate on-time delivery rate
    const deliveredShipments = shipments.filter(s => 
      s.status === 'delivered' && s.estimatedDeliveryDate && s.actualDeliveryDate
    );

    if (deliveredShipments.length > 0) {
      const onTime = deliveredShipments.filter(s => 
        s.actualDeliveryDate! <= s.estimatedDeliveryDate!
      ).length;
      analytics.onTimeDelivery = Math.round((onTime / deliveredShipments.length) * 100);
    }

    res.json({
      success: true,
      data: analytics
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch logistics analytics',
      error: error.message
    });
  }
};
