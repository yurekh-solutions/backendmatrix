import { Request, Response } from 'express';
import Admin from '../models/Admin';
import Supplier from '../models/Supplier';
import bcrypt from 'bcryptjs';
import { generateToken } from '../utils/jwt';
import crypto from 'crypto';

export const adminLogin = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }
    
    const admin = await Admin.findOne({ email }).select('+password');
    
    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }
    
    const isPasswordMatch = await admin.comparePassword(password);
    
    if (!isPasswordMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }
    
    if (!admin.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated'
      });
    }
    
    const token = generateToken(String(admin._id), 'admin');
    
    res.json({
      success: true,
      token,
      user: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const supplierLogin = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }
    
    const supplier = await Supplier.findOne({ email }).select('+password');
    
    if (!supplier) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }
    
    if (supplier.status !== 'approved') {
      return res.status(403).json({
        success: false,
        message: `Your application is ${supplier.status}. Please wait for admin approval.`,
        status: supplier.status,
        rejectionReason: supplier.rejectionReason
      });
    }
    
    if (!supplier.password) {
      return res.status(400).json({
        success: false,
        message: 'Please set up your password first'
      });
    }
    
    const isPasswordMatch = await bcrypt.compare(password, supplier.password);
    
    if (!isPasswordMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }
    
    const token = generateToken(String(supplier._id), 'supplier');
    
    res.json({
      success: true,
      token,
      user: {
        id: supplier._id,
        companyName: supplier.companyName,
        email: supplier.email,
        status: supplier.status
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const setupSupplierPassword = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }
    
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }
    
    const supplier = await Supplier.findOne({ email });
    
    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: 'Supplier not found'
      });
    }
    
    if (supplier.status !== 'approved') {
      return res.status(403).json({
        success: false,
        message: 'Only approved suppliers can set up passwords'
      });
    }
    
    const salt = await bcrypt.genSalt(10);
    supplier.password = await bcrypt.hash(password, salt);
    await supplier.save();
    
    const token = generateToken(String(supplier._id), 'supplier');
    
    res.json({
      success: true,
      message: 'Password set up successfully',
      token,
      user: {
        id: supplier._id,
        companyName: supplier.companyName,
        email: supplier.email
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const createDefaultAdmin = async () => {
  try {
    const adminExists = await Admin.findOne({ email: process.env.ADMIN_EMAIL });
    
    if (!adminExists) {
      await Admin.create({
        name: 'System Admin',
        email: process.env.ADMIN_EMAIL || 'admin@matrixyuvraj.com',
        password: process.env.ADMIN_PASSWORD || 'Admin@123',
        role: 'super_admin'
      });
      console.log('✅ Default admin account created');
    }
  } catch (error) {
    console.error('Error creating default admin:', error);
  }
};

// Generate a simple numeric code for password reset
const generateResetCode = () => {
  return Math.random().toString().substring(2, 8);
};

export const forgotSupplierPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }
    
    const supplier = await Supplier.findOne({ email });
    
    if (!supplier) {
      // Don't reveal if email exists or not for security
      return res.json({
        success: true,
        message: 'If an account with this email exists, you will receive a password reset code'
      });
    }
    
    // Generate reset code
    const resetCode = generateResetCode();
    const resetCodeExpiry = Date.now() + 10 * 60 * 1000; // 10 minutes
    
    // Store reset code in supplier document
    (supplier as any).resetPasswordCode = resetCode;
    (supplier as any).resetPasswordExpiry = resetCodeExpiry;
    await supplier.save();
    
    // In production, send email here
    // For now, we'll log it
    console.log(`🔐 Password reset code for ${email}: ${resetCode}`);
    
    // Simulate sending email (in production, use nodemailer or similar)
    // await sendPasswordResetEmail(email, resetCode);
    
    res.json({
      success: true,
      message: 'Password reset code sent to your email. Use code: ' + resetCode, // Remove in production
      // In production, don't return the code
      code: resetCode // For testing only
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const verifyResetToken = async (req: Request, res: Response) => {
  try {
    const { email, token } = req.body;
    
    if (!email || !token) {
      return res.status(400).json({
        success: false,
        message: 'Email and verification code are required'
      });
    }
    
    const supplier = await Supplier.findOne({ email });
    
    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: 'Supplier not found'
      });
    }
    
    // Check if reset code exists and is not expired
    if (!(supplier as any).resetPasswordCode || !(supplier as any).resetPasswordExpiry) {
      return res.status(400).json({
        success: false,
        message: 'No reset code found. Please request a new one'
      });
    }
    
    if (Date.now() > (supplier as any).resetPasswordExpiry) {
      (supplier as any).resetPasswordCode = undefined;
      (supplier as any).resetPasswordExpiry = undefined;
      await supplier.save();
      return res.status(400).json({
        success: false,
        message: 'Reset code has expired. Please request a new one'
      });
    }
    
    if ((supplier as any).resetPasswordCode !== token) {
      return res.status(400).json({
        success: false,
        message: 'Invalid verification code'
      });
    }
    
    res.json({
      success: true,
      message: 'Verification code is valid'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const resetSupplierPassword = async (req: Request, res: Response) => {
  try {
    const { email, token, newPassword } = req.body;
    
    if (!email || !token || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Email, verification code, and new password are required'
      });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }
    
    const supplier = await Supplier.findOne({ email });
    
    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: 'Supplier not found'
      });
    }
    
    // Verify reset code
    if ((supplier as any).resetPasswordCode !== token) {
      return res.status(400).json({
        success: false,
        message: 'Invalid verification code'
      });
    }
    
    if (!(supplier as any).resetPasswordExpiry || Date.now() > (supplier as any).resetPasswordExpiry) {
      (supplier as any).resetPasswordCode = undefined;
      (supplier as any).resetPasswordExpiry = undefined;
      await supplier.save();
      return res.status(400).json({
        success: false,
        message: 'Reset code has expired. Please request a new one'
      });
    }
    
    // Hash new password
    const salt = await bcrypt.genSalt(10);
    supplier.password = await bcrypt.hash(newPassword, salt);
    (supplier as any).resetPasswordCode = undefined;
    (supplier as any).resetPasswordExpiry = undefined;
    await supplier.save();
    
    res.json({
      success: true,
      message: 'Password reset successfully'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
}
