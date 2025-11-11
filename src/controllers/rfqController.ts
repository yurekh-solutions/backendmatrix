import { Request, Response } from 'express';
import RFQ from '../models/RFQ';
import { AuthRequest } from '../middleware/auth';

// Customer: Submit RFQ
export const submitRFQ = async (req: Request, res: Response) => {
  try {
    const rfq = new RFQ(req.body);
    await rfq.save();

    res.status(201).json({
      success: true,
      message: 'RFQ submitted successfully. We will contact you soon.',
      data: rfq,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to submit RFQ',
    });
  }
};

// Customer: Get RFQs by email
export const getCustomerRFQs = async (req: Request, res: Response) => {
  try {
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required',
      });
    }

    const rfqs = await RFQ.find({ email })
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

// Supplier: Get assigned RFQs
export const getSupplierRFQs = async (req: AuthRequest, res: Response) => {
  try {
    const supplierId = req.supplier._id;

    const rfqs = await RFQ.find({ assignedSupplier: supplierId })
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

// Supplier: Respond to RFQ
export const respondToRFQ = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const supplierId = req.supplier._id;
    const { quotedPrice, notes } = req.body;

    const rfq = await RFQ.findOne({ _id: id, assignedSupplier: supplierId });

    if (!rfq) {
      return res.status(404).json({
        success: false,
        message: 'RFQ not found',
      });
    }

    rfq.supplierResponse = {
      supplierId,
      quotedPrice,
      quotedDate: new Date(),
      notes,
    };
    rfq.status = 'quoted';
    await rfq.save();

    res.json({
      success: true,
      message: 'Quote submitted successfully',
      data: rfq,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to submit quote',
    });
  }
};
