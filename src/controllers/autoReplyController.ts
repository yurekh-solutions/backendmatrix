import { Response, Request } from 'express';
import AutoReply from '../models/AutoReply';

interface AuthRequest extends Request {
  supplier?: any;
  admin?: any;
}

export const createAutoReply = async (req: AuthRequest, res: Response) => {
  try {
    const { messageType, responseText, triggerKeywords } = req.body;
    const supplierId = req.supplier?._id;

    if (!supplierId) {
      return res.status(401).json({ success: false, message: 'Supplier not authenticated' });
    }

    if (!messageType || !responseText) {
      return res.status(400).json({ success: false, message: 'Message type and response text are required' });
    }

    if (responseText.length < 10 || responseText.length > 1000) {
      return res.status(400).json({ success: false, message: 'Response must be between 10 and 1000 characters' });
    }

    // Check if auto-reply for this type already exists
    const existing = await AutoReply.findOne({ supplierId, messageType });
    if (existing) {
      // Update existing
      existing.responseText = responseText;
      existing.triggerKeywords = triggerKeywords || [];
      existing.isActive = true;
      await existing.save();

      return res.json({
        success: true,
        message: 'Auto-reply updated successfully',
        data: existing
      });
    }

    // Create new
    const newAutoReply = new AutoReply({
      supplierId,
      messageType,
      responseText,
      triggerKeywords: triggerKeywords || [],
      isActive: true
    });

    await newAutoReply.save();

    res.status(201).json({
      success: true,
      message: 'Auto-reply created successfully',
      data: newAutoReply
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getSupplierAutoReplies = async (req: AuthRequest, res: Response) => {
  try {
    const supplierId = req.supplier?._id;

    if (!supplierId) {
      return res.status(401).json({ success: false, message: 'Supplier not authenticated' });
    }

    const autoReplies = await AutoReply.find({ supplierId })
      .select('messageType responseText triggerKeywords isActive usageCount createdAt')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: autoReplies,
      count: autoReplies.length
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getAutoReplyByType = async (req: AuthRequest, res: Response) => {
  try {
    const { messageType } = req.params;
    const supplierId = req.supplier?._id;

    if (!supplierId) {
      return res.status(401).json({ success: false, message: 'Supplier not authenticated' });
    }

    const autoReply = await AutoReply.findOne({ supplierId, messageType, isActive: true });

    if (!autoReply) {
      return res.status(404).json({ success: false, message: 'Auto-reply not found' });
    }

    // Increment usage count
    autoReply.usageCount += 1;
    await autoReply.save();

    res.json({
      success: true,
      data: autoReply
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateAutoReply = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { responseText, triggerKeywords, isActive } = req.body;
    const supplierId = req.supplier?._id;

    if (!supplierId) {
      return res.status(401).json({ success: false, message: 'Supplier not authenticated' });
    }

    const autoReply = await AutoReply.findOne({ _id: id, supplierId });

    if (!autoReply) {
      return res.status(404).json({ success: false, message: 'Auto-reply not found' });
    }

    if (responseText) {
      if (responseText.length < 10 || responseText.length > 1000) {
        return res.status(400).json({ success: false, message: 'Response must be between 10 and 1000 characters' });
      }
      autoReply.responseText = responseText;
    }

    if (triggerKeywords) {
      autoReply.triggerKeywords = triggerKeywords;
    }

    if (isActive !== undefined) {
      autoReply.isActive = isActive;
    }

    await autoReply.save();

    res.json({
      success: true,
      message: 'Auto-reply updated successfully',
      data: autoReply
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteAutoReply = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const supplierId = req.supplier?._id;

    if (!supplierId) {
      return res.status(401).json({ success: false, message: 'Supplier not authenticated' });
    }

    const autoReply = await AutoReply.findOneAndDelete({ _id: id, supplierId });

    if (!autoReply) {
      return res.status(404).json({ success: false, message: 'Auto-reply not found' });
    }

    res.json({
      success: true,
      message: 'Auto-reply deleted successfully'
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const toggleAutoReply = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const supplierId = req.supplier?._id;

    if (!supplierId) {
      return res.status(401).json({ success: false, message: 'Supplier not authenticated' });
    }

    const autoReply = await AutoReply.findOne({ _id: id, supplierId });

    if (!autoReply) {
      return res.status(404).json({ success: false, message: 'Auto-reply not found' });
    }

    autoReply.isActive = !autoReply.isActive;
    await autoReply.save();

    res.json({
      success: true,
      message: `Auto-reply ${autoReply.isActive ? 'enabled' : 'disabled'}`,
      data: autoReply
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
