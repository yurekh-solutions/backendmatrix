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
  return Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit code
};

export const forgotSupplierPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    
    console.log(`🔐 Forgot password request for email: ${email}`);
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }
    
    const supplier = await Supplier.findOne({ email });
    
    if (!supplier) {
      console.log(`⚠️ Email not found: ${email}`);
      // Don't reveal if email exists or not for security
      return res.json({
        success: true,
        message: 'If an account with this email exists, you will receive a password reset code'
      });
    }
    
    // Check if supplier is approved
    if (supplier.status !== 'approved') {
      return res.status(403).json({
        success: false,
        message: `Your account is ${supplier.status}. Only approved suppliers can reset their password.`
      });
    }
    
    // Generate reset code
    const resetCode = generateResetCode();
    const resetCodeExpiry = Date.now() + 15 * 60 * 1000; // 15 minutes
    
    // Store reset code in supplier document
    (supplier as any).resetPasswordCode = resetCode;
    (supplier as any).resetPasswordExpiry = resetCodeExpiry;
    await supplier.save();
    
    console.log(`✅ Reset code generated for ${email}: ${resetCode}`);
    
    // Send email with reset code
    const emailSubject = '🔐 Password Reset Code - RitzYard';
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">🔐 RitzYard</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0 0;">Password Recovery</p>
        </div>
        
        <div style="padding: 40px; background: #f9f9f9; border-radius: 0 0 8px 8px;">
          <h2 style="color: #333; margin-top: 0;">Reset Your Password</h2>
          
          <p style="color: #666; line-height: 1.6;">
            We received a request to reset your password. Use the code below to proceed with resetting your password.
          </p>
          
          <p style="color: #e74c3c; font-weight: bold; font-size: 14px;">
            ⏱️ This code will expire in 15 minutes
          </p>
          
          <div style="background: white; padding: 30px; text-align: center; border-radius: 8px; margin: 30px 0; border: 2px solid #667eea;">
            <p style="color: #999; margin: 0 0 10px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Your Reset Code</p>
            <h3 style="color: #667eea; font-size: 48px; letter-spacing: 8px; margin: 15px 0; font-weight: bold; font-family: 'Courier New', monospace;">${resetCode}</h3>
            <p style="color: #999; margin: 10px 0 0 0; font-size: 12px;">Copy this code and paste it in the password reset form</p>
          </div>
          
          <div style="background: #e8f4f8; border-left: 4px solid #3498db; padding: 15px; border-radius: 4px; margin: 20px 0;">
            <p style="color: #2c3e50; margin: 0; font-size: 14px;">
              <strong>📋 How to use this code:</strong>
            </p>
            <ol style="color: #2c3e50; line-height: 1.8; margin: 10px 0 0 0; padding-left: 20px;">
              <li>Go to the RitzYard Supplier login page</li>
              <li>Click on "Forgot your password?"</li>
              <li>Enter your email: <strong>${email}</strong></li>
              <li>Paste the code: <strong style="font-family: 'Courier New', monospace;">${resetCode}</strong></li>
              <li>Create your new password</li>
              <li>Login with your new password</li>
            </ol>
          </div>
          
          <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; border-radius: 4px; margin: 20px 0;">
            <p style="color: #856404; margin: 0; font-size: 13px;">
              <strong>⚠️ Security Notice:</strong> If you didn't request this password reset, please ignore this email. Your account is secure.
            </p>
          </div>
          
          <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
          
          <p style="color: #999; font-size: 12px; text-align: center; margin: 0;">
            © 2024 RitzYard. All rights reserved. | <a href="https://ritzyard.com" style="color: #667eea; text-decoration: none;">Visit Website</a>
          </p>
        </div>
      </div>
    `;
    
    // Send the email
    try {
      const emailSent = await sendEmail(email, emailSubject, emailHtml);
      
      if (emailSent) {
        console.log(`📧 Password reset email sent successfully to ${email}`);
        return res.json({
          success: true,
          message: 'Password reset code sent to your email. Please check your email for the code.',
          testCode: resetCode // For development/testing only - remove in production
        });
      } else {
        console.warn(`⚠️ Email delivery failed for ${email}, but code was generated`);
        // Email failed, but code is stored
        return res.json({
          success: true,
          message: 'Password reset code was generated. If email failed, use this code: ' + resetCode,
          testCode: resetCode // For testing
        });
      }
    } catch (emailError: any) {
      console.error(`❌ Email error for ${email}:`, emailError.message);
      // Even if email fails, the code is stored in DB
      return res.json({
        success: true,
        message: 'Reset code generated. Email service may be temporarily unavailable. Please try again or use the test code.',
        testCode: resetCode // For testing only
      });
    }
  } catch (error: any) {
    console.error('❌ Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to process password reset request'
    });
  }
};

export const verifyResetToken = async (req: Request, res: Response) => {
  try {
    const { email, token } = req.body;
    
    console.log(`🔍 Verifying reset token for email: ${email}`);
    
    if (!email || !token) {
      return res.status(400).json({
        success: false,
        message: 'Email and verification code are required'
      });
    }
    
    const supplier = await Supplier.findOne({ email });
    
    if (!supplier) {
      console.warn(`❌ Supplier not found: ${email}`);
      return res.status(404).json({
        success: false,
        message: 'Supplier not found'
      });
    }
    
    // Check if reset code exists and is not expired
    if (!(supplier as any).resetPasswordCode || !(supplier as any).resetPasswordExpiry) {
      console.warn(`⚠️ No reset code found for ${email}`);
      return res.status(400).json({
        success: false,
        message: 'No reset code found. Please request a new one'
      });
    }
    
    const now = Date.now();
    const expiry = (supplier as any).resetPasswordExpiry;
    
    if (now > expiry) {
      console.log(`⚠️ Reset code expired for ${email}`);
      (supplier as any).resetPasswordCode = undefined;
      (supplier as any).resetPasswordExpiry = undefined;
      await supplier.save();
      return res.status(400).json({
        success: false,
        message: 'Reset code has expired. Please request a new one'
      });
    }
    
    if ((supplier as any).resetPasswordCode !== token.toString()) {
      console.warn(`❌ Invalid reset code for ${email}. Expected: ${(supplier as any).resetPasswordCode}, Got: ${token}`);
      return res.status(400).json({
        success: false,
        message: 'Invalid verification code. Please check and try again'
      });
    }
    
    console.log(`✅ Reset token verified successfully for ${email}`);
    res.json({
      success: true,
      message: 'Verification code is valid. You can now reset your password'
    });
  } catch (error: any) {
    console.error('❌ Verify reset token error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error verifying reset code'
    });
  }
};

export const resetSupplierPassword = async (req: Request, res: Response) => {
  try {
    const { email, token, newPassword } = req.body;
    
    console.log(`🔑 Resetting password for email: ${email}`);
    
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
      console.warn(`❌ Supplier not found for password reset: ${email}`);
      return res.status(404).json({
        success: false,
        message: 'Supplier not found'
      });
    }
    
    // Verify reset code
    if ((supplier as any).resetPasswordCode !== token.toString()) {
      console.warn(`❌ Invalid reset token for ${email}`);
      return res.status(400).json({
        success: false,
        message: 'Invalid verification code. Please request a new reset code'
      });
    }
    
    if (!(supplier as any).resetPasswordExpiry || Date.now() > (supplier as any).resetPasswordExpiry) {
      console.warn(`❌ Reset token expired for ${email}`);
      (supplier as any).resetPasswordCode = undefined;
      (supplier as any).resetPasswordExpiry = undefined;
      await supplier.save();
      return res.status(400).json({
        success: false,
        message: 'Reset code has expired. Please request a new one'
      });
    }
    
    // Hash new password
    try {
      const salt = await bcrypt.genSalt(10);
      supplier.password = await bcrypt.hash(newPassword, salt);
      (supplier as any).resetPasswordCode = undefined;
      (supplier as any).resetPasswordExpiry = undefined;
      await supplier.save();
      
      console.log(`✅ Password reset successfully for ${email}`);
      
      res.json({
        success: true,
        message: 'Password reset successfully! You can now login with your new password'
      });
    } catch (hashError: any) {
      console.error(`❌ Password hashing failed: ${hashError.message}`);
      return res.status(500).json({
        success: false,
        message: 'Error resetting password. Please try again'
      });
    }
  } catch (error: any) {
    console.error('❌ Reset password error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error resetting password'
    });
  }
};
