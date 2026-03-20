import { Request, Response } from 'express';
import Payment from '../models/Payment';
import Order from '../models/Order';
import Supplier from '../models/Supplier';

// Create Payment
export const createPayment = async (req: any, res: Response) => {
  try {
    const {
      orderId,
      amount,
      paymentMethod,
      metadata
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

    const payment = new Payment({
      orderId,
      supplierId,
      buyerId: order.customerId,
      amount: {
        subtotal: amount.subtotal,
        tax: amount.tax || 0,
        shippingCharges: amount.shippingCharges || 0,
        discount: amount.discount || 0,
        total: amount.total,
        currency: amount.currency || 'INR'
      },
      paymentMethod,
      status: paymentMethod === 'cod' ? 'pending' : 'processing',
      initiatedAt: new Date(),
      metadata
    });

    await payment.save();

    res.status(201).json({
      success: true,
      message: 'Payment initiated successfully',
      data: payment
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to create payment',
      error: error.message
    });
  }
};

// Get all payments for supplier
export const getSupplierPayments = async (req: any, res: Response) => {
  try {
    const supplierId = req.supplier.id;
    const { status, settlementStatus, startDate, endDate } = req.query;

    const filter: any = { supplierId };

    if (status) filter.status = status;
    if (settlementStatus) filter.settlementStatus = settlementStatus;
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate as string);
      if (endDate) filter.createdAt.$lte = new Date(endDate as string);
    }

    const payments = await Payment.find(filter)
      .populate('orderId', 'orderNumber items')
      .sort({ createdAt: -1 });

    // Calculate statistics
    const stats = {
      totalPayments: payments.length,
      totalAmount: payments.reduce((sum, p) => sum + p.amount.total, 0),
      pendingAmount: payments
        .filter(p => p.status === 'pending')
        .reduce((sum, p) => sum + p.amount.total, 0),
      completedAmount: payments
        .filter(p => p.status === 'completed')
        .reduce((sum, p) => sum + p.amount.total, 0),
      settlementPending: payments
        .filter(p => p.settlementStatus === 'pending')
        .reduce((sum, p) => sum + (p.netAmount || p.amount.total), 0)
    };

    res.json({
      success: true,
      data: payments,
      stats
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payments',
      error: error.message
    });
  }
};

// Update payment status
export const updatePaymentStatus = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const { status, transactionId, gatewayResponse } = req.body;
    const supplierId = req.supplier.id;

    const payment = await Payment.findOne({ _id: id, supplierId });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    payment.status = status;
    if (transactionId) payment.transactionId = transactionId;
    if (gatewayResponse) payment.gatewayResponse = gatewayResponse;

    if (status === 'completed') {
      payment.completedAt = new Date();
      
      // Calculate settlement amounts
      const commissionRate = payment.commissionRate || 2; // Default 2%
      const commissionAmount = (payment.amount.total * commissionRate) / 100;
      payment.commissionAmount = commissionAmount;
      payment.netAmount = payment.amount.total - commissionAmount;
    }

    await payment.save();

    res.json({
      success: true,
      message: 'Payment status updated successfully',
      data: payment
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to update payment status',
      error: error.message
    });
  }
};

// Process refund
export const processRefund = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const { refundAmount, refundReason } = req.body;
    const supplierId = req.supplier.id;

    const payment = await Payment.findOne({ _id: id, supplierId });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    if (payment.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Can only refund completed payments'
      });
    }

    payment.refundAmount = refundAmount;
    payment.refundReason = refundReason;
    payment.refundDate = new Date();
    payment.status = refundAmount === payment.amount.total ? 'refunded' : 'partially_refunded';

    await payment.save();

    res.json({
      success: true,
      message: 'Refund processed successfully',
      data: payment
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to process refund',
      error: error.message
    });
  }
};

// Get payment analytics
export const getPaymentAnalytics = async (req: any, res: Response) => {
  try {
    const supplierId = req.supplier.id;
    const { period = '30' } = req.query; // days

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(period as string));

    const payments = await Payment.find({
      supplierId,
      createdAt: { $gte: startDate }
    });

    const analytics = {
      totalRevenue: payments
        .filter(p => p.status === 'completed')
        .reduce((sum, p) => sum + p.amount.total, 0),
      totalCommission: payments
        .filter(p => p.status === 'completed')
        .reduce((sum, p) => sum + (p.commissionAmount || 0), 0),
      netEarnings: payments
        .filter(p => p.status === 'completed')
        .reduce((sum, p) => sum + (p.netAmount || p.amount.total), 0),
      pendingSettlements: payments
        .filter(p => p.settlementStatus === 'pending')
        .reduce((sum, p) => sum + (p.netAmount || p.amount.total), 0),
      paymentMethodBreakdown: {} as any,
      dailyRevenue: {} as any
    };

    // Payment method breakdown
    payments.forEach(p => {
      if (p.status === 'completed') {
        analytics.paymentMethodBreakdown[p.paymentMethod] = 
          (analytics.paymentMethodBreakdown[p.paymentMethod] || 0) + p.amount.total;
      }
    });

    res.json({
      success: true,
      data: analytics
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment analytics',
      error: error.message
    });
  }
};
