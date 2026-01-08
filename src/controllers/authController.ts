import { Request, Response } from 'express';
import Admin from '../models/Admin';
import Supplier from '../models/Supplier';
import User from '../models/User';
import bcrypt from 'bcryptjs';
import { generateToken } from '../utils/jwt';
import { sendEmail } from '../config/email';
import crypto from 'crypto';

export const adminLogin = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    
    console.log('🔐 Admin login attempt for email:', email);
    
    if (!email || !password) {
      console.log('❌ Missing email or password');
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }
    
    const admin = await Admin.findOne({ email }).select('+password');
    
    if (!admin) {
      console.log('❌ Admin not found for email:', email);
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }
    
    console.log('🔍 Admin found, verifying password...');
    const isPasswordMatch = await admin.comparePassword(password);
    
    if (!isPasswordMatch) {
      console.log('❌ Password mismatch for admin:', email);
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }
    
    if (!admin.isActive) {
      console.log('❌ Account inactive for admin:', email);
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated'
      });
    }
    
    console.log('✅ Admin authenticated successfully:', email);
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
    console.error('❌ Error in admin login:', error.message);
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
        status: supplier.status,
        logo: supplier.logo
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
        email: supplier.email,
        logo: supplier.logo
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
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@matrixyuvraj.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123';
    
    console.log('🔍 Checking for default admin account:', adminEmail);
    const adminExists = await Admin.findOne({ email: adminEmail });
    
    if (adminExists) {
      console.log('✅ Default admin account already exists:', adminEmail);
      return;
    }
    
    console.log('📝 Creating default admin account...');
    const newAdmin = await Admin.create({
      name: 'System Admin',
      email: adminEmail,
      password: adminPassword,
      role: 'super_admin'
    });
    console.log('✅ Default admin account created successfully');
    console.log('   Email:', adminEmail);
    console.log('   Role: super_admin');
    console.log('   ID:', newAdmin._id);
  } catch (error: any) {
    console.error('❌ Error creating default admin:', error.message);
    if (error.code === 11000) {
      console.log('⚠️  Admin account already exists in database');
    }
  }
};

// Request password reset
export const requestPasswordReset = async (req: Request, res: Response) => {
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
      // Don't reveal if email exists for security
      return res.status(200).json({
        success: true,
        message: 'If an account exists with this email, a reset link has been sent'
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    const resetTokenExpiry = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hour

    // Save token to database
    supplier.passwordResetToken = resetTokenHash;
    supplier.passwordResetTokenExpiry = resetTokenExpiry;
    await supplier.save();

    // Create reset link
    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;

    // Send email
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0;">RitzYard Supplier Portal</h1>
        </div>
        <div style="background: #f5f5f5; padding: 30px;">
          <h2 style="color: #333;">Password Reset Request</h2>
          <p style="color: #666; line-height: 1.6;">Hello ${supplier.contactPerson},</p>
          <p style="color: #666; line-height: 1.6;">We received a request to reset your password. Click the button below to reset it.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
              Reset Password
            </a>
          </div>
          <p style="color: #999; font-size: 12px;">Or copy this link: <br><code>${resetLink}</code></p>
          <p style="color: #999; font-size: 12px; margin-top: 20px;">This link will expire in 1 hour.</p>
          <p style="color: #999; font-size: 12px;">If you didn't request a password reset, please ignore this email.</p>
        </div>
        <div style="background: #333; color: #fff; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; font-size: 12px;">
          <p style="margin: 0;">© 2025 RitzYard. All rights reserved.</p>
        </div>
      </div>
    `;

    const emailSent = await sendEmail(
      email,
      'Password Reset Request - RitzYard Supplier Portal',
      emailHtml
    );

    if (emailSent) {
      return res.status(200).json({
        success: true,
        message: 'If an account exists with this email, a reset link has been sent'
      });
    } else {
      // Clear token if email fails
      supplier.passwordResetToken = undefined;
      supplier.passwordResetTokenExpiry = undefined;
      await supplier.save();
      
      console.error('❌ SMTP Configuration Issue:');
      console.error('Please configure SMTP settings in .env file:');
      console.error('SMTP_HOST=smtp.gmail.com');
      console.error('SMTP_PORT=587');
      console.error('SMTP_USER=your-email@gmail.com');
      console.error('SMTP_PASS=your-app-password');
      console.error('Get app password from: https://myaccount.google.com/apppasswords');
      
      return res.status(500).json({
        success: false,
        message: 'Email service is not configured. Please contact administrator.'
      });
    }
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Reset password with token
export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { email, token, password, confirmPassword } = req.body;

    if (!email || !token || !password || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    // Hash token to compare
    const resetTokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const supplier = await Supplier.findOne({
      email,
      passwordResetToken: resetTokenHash,
      passwordResetTokenExpiry: { $gt: new Date() }
    });

    if (!supplier) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update password and clear reset token
    supplier.password = hashedPassword;
    supplier.passwordResetToken = undefined;
    supplier.passwordResetTokenExpiry = undefined;
    await supplier.save();

    // Send confirmation email
    const confirmationHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0;">RitzYard Supplier Portal</h1>
        </div>
        <div style="background: #f5f5f5; padding: 30px;">
          <h2 style="color: #333;">Password Changed Successfully ✓</h2>
          <p style="color: #666; line-height: 1.6;">Hello ${supplier.contactPerson},</p>
          <p style="color: #666; line-height: 1.6;">Your password has been successfully reset. You can now log in with your new password.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL}/login" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
              Login to Dashboard
            </a>
          </div>
          <p style="color: #999; font-size: 12px; margin-top: 20px;">If you didn't reset your password, please contact support immediately.</p>
        </div>
        <div style="background: #333; color: #fff; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; font-size: 12px;">
          <p style="margin: 0;">© 2025 RitzYard. All rights reserved.</p>
        </div>
      </div>
    `;

    await sendEmail(
      email,
      'Password Reset Successful - RitzYard Supplier Portal',
      confirmationHtml
    );

    return res.status(200).json({
      success: true,
      message: 'Password reset successfully. You can now log in.'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// User (Buyer) Signup
export const userSignup = async (req: Request, res: Response) => {
  try {
    const { name, email, password, phone } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new user
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      phone,
      role: 'buyer',
    });

    const token = generateToken(String(user._id), 'buyer');

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// User (Buyer) Login
export const userLogin = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const isPasswordMatch = await bcrypt.compare(password, user.password);

    if (!isPasswordMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const token = generateToken(String(user._id), 'buyer');

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        profileImage: user.profileImage,
        role: user.role,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
