import { Request, Response } from 'express';
import DeletionRequest from '../models/DeletionRequest';
import User from '../models/User';
import Supplier from '../models/Supplier';

/**
 * Submit account deletion request
 */
export const submitAccountDeletionRequest = async (req: Request, res: Response) => {
  try {
    const { email, name, phoneNumber, reason, userType } = req.body;

    // Validation
    if (!email || !name || !userType) {
      return res.status(400).json({
        success: false,
        message: 'Email, name, and user type are required',
      });
    }

    if (!['buyer', 'supplier'].includes(userType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user type. Must be "buyer" or "supplier"',
      });
    }

    // Check if user exists
    let userExists = false;
    if (userType === 'buyer') {
      const user = await User.findOne({ email: email.toLowerCase() });
      userExists = !!user;
    } else if (userType === 'supplier') {
      const supplier = await Supplier.findOne({ email: email.toLowerCase() });
      userExists = !!supplier;
    }

    // Capture request metadata
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];

    // Create deletion request
    const deletionRequest = new DeletionRequest({
      requestType: 'account',
      userType,
      email: email.toLowerCase(),
      name,
      phoneNumber,
      reason,
      ipAddress: typeof ipAddress === 'string' ? ipAddress : ipAddress?.[0],
      userAgent,
    });

    await deletionRequest.save();

    return res.status(200).json({
      success: true,
      message: userExists
        ? 'Your account deletion request has been submitted successfully. We will process it within 30 days and send you a confirmation email.'
        : 'Your deletion request has been submitted. If an account exists with this email, it will be processed within 30 days.',
      requestId: deletionRequest._id,
    });
  } catch (error) {
    console.error('Error submitting account deletion request:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to submit deletion request. Please try again later.',
    });
  }
};

/**
 * Submit data deletion request (without account deletion)
 */
export const submitDataDeletionRequest = async (req: Request, res: Response) => {
  try {
    const { email, name, phoneNumber, reason, dataTypes, userType } = req.body;

    // Validation
    if (!email || !name || !userType) {
      return res.status(400).json({
        success: false,
        message: 'Email, name, and user type are required',
      });
    }

    if (!['buyer', 'supplier'].includes(userType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user type. Must be "buyer" or "supplier"',
      });
    }

    // Capture request metadata
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];

    // Create deletion request
    const deletionRequest = new DeletionRequest({
      requestType: 'data',
      userType,
      email: email.toLowerCase(),
      name,
      phoneNumber,
      reason,
      dataTypes: dataTypes || [],
      ipAddress: typeof ipAddress === 'string' ? ipAddress : ipAddress?.[0],
      userAgent,
    });

    await deletionRequest.save();

    return res.status(200).json({
      success: true,
      message: 'Your data deletion request has been submitted successfully. We will process it within 30 days and send you a confirmation email.',
      requestId: deletionRequest._id,
    });
  } catch (error) {
    console.error('Error submitting data deletion request:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to submit deletion request. Please try again later.',
    });
  }
};

/**
 * Get all deletion requests (Admin only)
 */
export const getDeletionRequests = async (req: Request, res: Response) => {
  try {
    const { status, requestType, page = 1, limit = 20 } = req.query;

    const filter: any = {};
    if (status) filter.status = status;
    if (requestType) filter.requestType = requestType;

    const skip = (Number(page) - 1) * Number(limit);

    const [requests, total] = await Promise.all([
      DeletionRequest.find(filter)
        .sort({ submittedAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate('processedBy', 'name email'),
      DeletionRequest.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: requests,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error('Error fetching deletion requests:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch deletion requests',
    });
  }
};

/**
 * Get single deletion request by ID (Admin only)
 */
export const getDeletionRequestById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const request = await DeletionRequest.findById(id).populate('processedBy', 'name email');

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Deletion request not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: request,
    });
  } catch (error) {
    console.error('Error fetching deletion request:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch deletion request',
    });
  }
};

/**
 * Update deletion request status (Admin only)
 */
export const updateDeletionRequestStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, adminNotes } = req.body;
    const adminId = (req as any).user?.userId; // From auth middleware

    if (!status || !['pending', 'in-progress', 'completed', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status',
      });
    }

    const request = await DeletionRequest.findById(id);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Deletion request not found',
      });
    }

    request.status = status;
    if (adminNotes) request.adminNotes = adminNotes;
    if (status === 'completed' || status === 'rejected') {
      request.processedAt = new Date();
      request.processedBy = adminId;
    }

    await request.save();

    return res.status(200).json({
      success: true,
      message: 'Deletion request updated successfully',
      data: request,
    });
  } catch (error) {
    console.error('Error updating deletion request:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update deletion request',
    });
  }
};

/**
 * Process account deletion (Admin only - actual deletion)
 */
export const processAccountDeletion = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const adminId = (req as any).user?.userId;

    const request = await DeletionRequest.findById(id);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Deletion request not found',
      });
    }

    if (request.requestType !== 'account') {
      return res.status(400).json({
        success: false,
        message: 'This is not an account deletion request',
      });
    }

    // Delete the actual user/supplier account
    let deleted = false;
    if (request.userType === 'buyer') {
      const result = await User.findOneAndDelete({ email: request.email });
      deleted = !!result;
    } else if (request.userType === 'supplier') {
      const result = await Supplier.findOneAndDelete({ email: request.email });
      deleted = !!result;
    }

    // Update request status
    request.status = 'completed';
    request.processedAt = new Date();
    request.processedBy = adminId;
    request.adminNotes = deleted
      ? `Account deleted successfully on ${new Date().toISOString()}`
      : 'Account not found or already deleted';

    await request.save();

    return res.status(200).json({
      success: true,
      message: deleted ? 'Account deleted successfully' : 'Account not found',
      accountDeleted: deleted,
    });
  } catch (error) {
    console.error('Error processing account deletion:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to process account deletion',
    });
  }
};

