import { Request, Response } from 'express';
import Admin from '../models/Admin';
import Supplier from '../models/Supplier';
import bcrypt from 'bcryptjs';
import { generateToken } from '../utils/jwt';
import crypto from 'crypto';
import { sendEmail } from '../config/email';

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
    
    // Send email with reset code
    const emailSubject = 'Password Reset Code - RitzYard';
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">RitzYard</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0 0;">Password Recovery</p>
        </div>
        
        <div style="padding: 40px; background: #f9f9f9; border-radius: 0 0 8px 8px;">
          <h2 style="color: #333; margin-top: 0;">Reset Your Password</h2>
          
          <p style="color: #666; line-height: 1.6;">
            We received a request to reset your password. Use the code below to proceed with resetting your password. This code will expire in 10 minutes.
          </p>
          
          <div style="background: white; padding: 30px; text-align: center; border-radius: 8px; margin: 30px 0;">
            <p style="color: #999; margin: 0 0 10px 0; font-size: 14px;">Your Reset Code</p>
            <h3 style="color: #667eea; font-size: 32px; letter-spacing: 3px; margin: 10px 0; font-weight: bold;">${resetCode}</h3>
            <p style="color: #999; margin: 10px 0 0 0; font-size: 12px;">Valid for 10 minutes</p>
          </div>
          
          <p style="color: #666; line-height: 1.6;">
            <strong>How to use this code:</strong>
          </p>
          <ol style="color: #666; line-height: 1.8;">
            <li>Go to the Forgot Password page on your account login</li>
            <li>Enter your email address</li>
            <li>Paste the reset code: <strong>${resetCode}</strong></li>
            <li>Create your new password</li>
          </ol>
          
          <p style="color: #666; line-height: 1.6;">
            If you didn't request a password reset, you can safely ignore this email. Your account security is important to us.
          </p>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          
          <p style="color: #999; font-size: 12px; text-align: center; margin: 0;">
            © 2024 RitzYard. All rights reserved.
          </p>
        </div>
      </div>
    `;
    
    // Send the email
    const emailSent = await sendEmail(email, emailSubject, emailHtml);
    
    if (!emailSent) {
      console.warn(`⚠️ Failed to send email to ${email}, but code was generated`);
      // Still return success but with a note
      return res.json({
        success: true,
        message: 'Password reset code generated. Use code: ' + resetCode, // For testing
        code: resetCode // For testing only
      });
    }
    
    res.json({
      success: true,
      message: 'Password reset code sent to your email',
      code: resetCode // Remove in production
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
