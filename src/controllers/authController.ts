// Workaround for Windows TLS issue with Google APIs.
// MUST be set BEFORE any https requests. The Windows `set X=0` in
// package.json dev scripts sometimes leaves a trailing space, so we
// normalise the value here.
const _tlsRaw = (process.env.NODE_TLS_REJECT_UNAUTHORIZED || '').trim();
if (_tlsRaw === '' || _tlsRaw === '0' || _tlsRaw.toLowerCase() === 'false') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}
console.log('🔧 [TLS] NODE_TLS_REJECT_UNAUTHORIZED =', JSON.stringify(process.env.NODE_TLS_REJECT_UNAUTHORIZED), '→ TLS verification', process.env.NODE_TLS_REJECT_UNAUTHORIZED === '0' ? 'DISABLED' : 'ENABLED');

import { Request, Response } from 'express';
import https from 'https';
import { URL } from 'url';
import Admin from '../models/Admin';
import Supplier from '../models/Supplier';
import User from '../models/User';
import bcrypt from 'bcryptjs';
import { generateToken } from '../utils/jwt';
import { sendEmail } from '../config/email';
import crypto from 'crypto';
import { uploadToCloudinary } from '../config/cloudinary';
import { OAuth2Client } from 'google-auth-library';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';

/**
 * Perform an HTTPS GET with a custom agent. Returns parsed JSON or throws.
 * Uses an agent with rejectUnauthorized=false as a fallback for the Windows
 * TLS issue that can affect the google-auth-library certificate fetch.
 */
const httpsGetJson = <T = any>(urlStr: string): Promise<T> => {
  return new Promise((resolve, reject) => {
    try {
      const url = new URL(urlStr);
      const agent = new https.Agent({
        rejectUnauthorized: (process.env.NODE_TLS_REJECT_UNAUTHORIZED || '').trim() !== '0',
        keepAlive: false,
      });
      const req = https.request(
        {
          hostname: url.hostname,
          path: url.pathname + url.search,
          method: 'GET',
          agent,
          headers: { Accept: 'application/json' },
        },
        (res) => {
          let data = '';
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => {
            try {
              if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                resolve(JSON.parse(data) as T);
              } else {
                reject(new Error(`HTTPS request failed: ${res.statusCode} ${data}`));
              }
            } catch (parseErr: any) {
              reject(new Error(`Failed to parse response: ${parseErr.message}`));
            }
          });
        }
      );
      req.on('error', (err) => reject(err));
      req.setTimeout(15000, () => {
        req.destroy(new Error('HTTPS request timeout'));
      });
      req.end();
    } catch (err: any) {
      reject(err);
    }
  });
};

/**
 * Verify a Google ID token (credential) sent by the frontend.
 *
 * Strategy: we use the public Google tokeninfo endpoint
 * (https://oauth2.googleapis.com/tokeninfo) instead of fetching certs and
 * verifying the JWT signature locally. This is the same endpoint that
 * Google's official libraries fall back to and it avoids the
 * "Failed to retrieve verification certificates" Windows TLS issue.
 *
 * Returns the decoded payload. Throws when the token is invalid, the
 * audience doesn't match our OAuth client, or the response is malformed.
 */
const verifyGoogleCredential = async (credential: string) => {
  if (!GOOGLE_CLIENT_ID) {
    throw new Error('Google sign-in is not configured on the server');
  }
  if (!credential || typeof credential !== 'string') {
    throw new Error('Invalid Google credential');
  }

  const url = `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`;
  let payload: any;
  try {
    payload = await httpsGetJson(url);
  } catch (networkErr: any) {
    // Fallback: try OAuth2Client.verifyIdToken (in case tokeninfo is blocked)
    try {
      const client = new OAuth2Client(GOOGLE_CLIENT_ID);
      const ticket = await client.verifyIdToken({
        idToken: credential,
        audience: GOOGLE_CLIENT_ID,
      });
      const inner = ticket.getPayload();
      if (!inner?.email) throw new Error('Google account has no email');
      return inner;
    } catch (innerErr: any) {
      throw new Error(
        `Google token verification failed: ${networkErr.message || networkErr}` +
          (innerErr?.message ? ` (fallback: ${innerErr.message})` : '')
      );
    }
  }

  // tokeninfo returns `aud` (audience), `email`, `sub` (google id), `name`, `picture`, etc.
  if (!payload || typeof payload !== 'object') {
    throw new Error('Invalid Google credential response');
  }
  if (payload.aud && payload.aud !== GOOGLE_CLIENT_ID) {
    throw new Error('Google token audience mismatch');
  }
  if (!payload.email) {
    throw new Error('Google account has no email');
  }
  if (payload.email_verified === 'false' || payload.email_verified === false) {
    throw new Error('Google email is not verified');
  }
  return payload as {
    sub: string;
    email: string;
    name?: string;
    picture?: string;
  };
};

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
        _id: supplier._id, // Mobile app expects _id
        id: supplier._id, // Web app might expect id
        companyName: supplier.companyName,
        email: supplier.email,
        phone: supplier.phone, // Include phone number
        contactPerson: supplier.contactPerson, // Mobile app expects contactPerson
        status: supplier.status,
        logo: supplier.logo,
        profileImage: supplier.logo, // For frontend compatibility
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
        _id: supplier._id, // Mobile app expects _id
        id: supplier._id, // Web app might expect id
        companyName: supplier.companyName,
        email: supplier.email,
        phone: supplier.phone, // Include phone number
        contactPerson: supplier.contactPerson, // Mobile app expects contactPerson
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

export const createDefaultAdmin = async () => {
  try {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@matrixyuvraj.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'Yuvraj@2706';
    
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
      const responsePayload: any = {
        success: true,
        message: 'If an account exists with this email, a reset link has been sent'
      };
      // Dev mode: return the reset link so the flow can be tested without real email
      if (process.env.DEV_RETURN_RESET_LINK === 'true') {
        responsePayload.devResetLink = resetLink;
        console.log('🔧 DEV MODE: Reset link =', resetLink);
      }
      return res.status(200).json(responsePayload);
    } else {
      // Dev mode: even if SMTP failed, return the link so the flow can be tested
      if (process.env.DEV_RETURN_RESET_LINK === 'true') {
        console.log('🔧 DEV MODE: SMTP failed, but returning reset link anyway =', resetLink);
        return res.status(200).json({
          success: true,
          message: 'If an account exists with this email, a reset link has been sent',
          devResetLink: resetLink,
          devNote: 'SMTP not configured; using dev mode to return the link directly.'
        });
      }
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
        message: 'Email service is not configured. Please contact administrator.',
        devHint: 'Set SMTP_PASS in .env OR set DEV_RETURN_RESET_LINK=true to bypass email and return the link in the response.'
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

// User (Buyer) Password Reset
export const requestUserPasswordReset = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    const user = await User.findOne({ email });

    if (!user) {
      // Don't reveal if email exists for security
      return res.status(200).json({
        success: true,
        message: 'If an account exists with this email, a reset link has been sent'
      });
    }

    // Block Google-only accounts from setting a local password via reset
    if (!user.password) {
      return res.status(200).json({
        success: true,
        message: 'If an account exists with this email, a reset link has been sent',
        devNote: 'This account uses Google sign-in and has no local password to reset. Please log in with Google.'
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    const resetTokenExpiry = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hour

    // Save token to database (need to select the hidden fields to update them)
    await User.updateOne(
      { _id: user._id },
      {
        $set: {
          passwordResetToken: resetTokenHash,
          passwordResetTokenExpiry: resetTokenExpiry,
        },
      }
    );

    // Create reset link — the buyer reset page lives at /reset-password
    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;

    // Send email
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #c15738 0%, #a8421f 100%); padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0;">RitzYard</h1>
        </div>
        <div style="background: #f5f5f5; padding: 30px;">
          <h2 style="color: #333;">Password Reset Request</h2>
          <p style="color: #666; line-height: 1.6;">Hello ${user.name},</p>
          <p style="color: #666; line-height: 1.6;">We received a request to reset your RitzYard password. Click the button below to choose a new one.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" style="background: linear-gradient(135deg, #c15738 0%, #a8421f 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
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
      'Password Reset Request - RitzYard',
      emailHtml
    );

    if (emailSent) {
      const responsePayload: any = {
        success: true,
        message: 'If an account exists with this email, a reset link has been sent'
      };
      // Dev mode: return the reset link so the flow can be tested without real email
      if (process.env.DEV_RETURN_RESET_LINK === 'true') {
        responsePayload.devResetLink = resetLink;
        console.log('🔧 DEV MODE (user): Reset link =', resetLink);
      }
      return res.status(200).json(responsePayload);
    } else {
      // Dev mode: even if SMTP failed, return the link so the flow can be tested
      if (process.env.DEV_RETURN_RESET_LINK === 'true') {
        console.log('🔧 DEV MODE (user): SMTP failed, but returning reset link anyway =', resetLink);
        return res.status(200).json({
          success: true,
          message: 'If an account exists with this email, a reset link has been sent',
          devResetLink: resetLink,
          devNote: 'SMTP not configured; using dev mode to return the link directly.'
        });
      }
      // Clear token if email fails
      await User.updateOne(
        { _id: user._id },
        {
          $unset: {
            passwordResetToken: 1,
            passwordResetTokenExpiry: 1,
          },
        }
      );

      console.error('❌ SMTP Configuration Issue:');
      console.error('Please configure SMTP settings in .env file:');
      console.error('SMTP_HOST=smtp.gmail.com');
      console.error('SMTP_PORT=587');
      console.error('SMTP_USER=your-email@gmail.com');
      console.error('SMTP_PASS=your-app-password');
      console.error('Get app password from: https://myaccount.google.com/apppasswords');

      return res.status(500).json({
        success: false,
        message: 'Email service is not configured. Please contact administrator.',
        devHint: 'Set SMTP_PASS in .env OR set DEV_RETURN_RESET_LINK=true to bypass email and return the link in the response.'
      });
    }
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Reset user password with token
export const resetUserPassword = async (req: Request, res: Response) => {
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

    const user = await User.findOne({
      email,
      passwordResetToken: resetTokenHash,
      passwordResetTokenExpiry: { $gt: new Date() }
    }).select('+password +passwordResetToken +passwordResetTokenExpiry');

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update password and clear reset token
    user.password = hashedPassword;
    user.passwordResetToken = undefined;
    user.passwordResetTokenExpiry = undefined;
    await user.save();

    // Send confirmation email
    const confirmationHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #c15738 0%, #a8421f 100%); padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0;">RitzYard</h1>
        </div>
        <div style="background: #f5f5f5; padding: 30px;">
          <h2 style="color: #333;">Password Changed Successfully ✓</h2>
          <p style="color: #666; line-height: 1.6;">Hello ${user.name},</p>
          <p style="color: #666; line-height: 1.6;">Your RitzYard password has been successfully reset. You can now log in with your new password.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL}/login" style="background: linear-gradient(135deg, #c15738 0%, #a8421f 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
              Login to RitzYard
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
      'Password Reset Successful - RitzYard',
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
    const { name, email, password, phone, company } = req.body;
    const file = req.file;

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

    let profileImage = '';
    let businessImage = '';

    // When using uploadImages middleware with cloudinaryStorage,
    // files are already uploaded to Cloudinary and URLs are in file.path
    if (req.files) {
      console.log('📸 Processing uploaded files for signup...');
      
      if (Array.isArray(req.files)) {
        const files = req.files as Express.Multer.File[];
        const profileFile = files.find(f => f.fieldname === 'profileImage');
        const businessFile = files.find(f => f.fieldname === 'businessImage');

        if (profileFile) {
          // With cloudinaryStorage, URL is already in file.path
          profileImage = (profileFile as any).path || (profileFile as any).secure_url || '';
          console.log('✅ Profile image URL:', profileImage);
        }
        if (businessFile) {
          businessImage = (businessFile as any).path || (businessFile as any).secure_url || '';
          console.log('✅ Business image URL:', businessImage);
        }
      } else {
        // req.files is an object (when using .fields())
        const files = req.files as { [fieldname: string]: Express.Multer.File[] };
        
        if (files['profileImage'] && files['profileImage'][0]) {
          const profileFile = files['profileImage'][0];
          profileImage = (profileFile as any).path || (profileFile as any).secure_url || '';
          console.log('✅ Profile image URL:', profileImage);
        }
        
        if (files['businessImage'] && files['businessImage'][0]) {
          const businessFile = files['businessImage'][0];
          businessImage = (businessFile as any).path || (businessFile as any).secure_url || '';
          console.log('✅ Business image URL:', businessImage);
        }
      }
    } else if (req.file) {
      // Fallback for single file
      profileImage = (req.file as any).path || (req.file as any).secure_url || '';
      console.log('✅ Single file profile image URL:', profileImage);
    }

    // Create new user
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      phone,
      company,
      profileImage,
      businessImage,
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
        company: user.company,
        profileImage: user.profileImage,
        businessImage: user.businessImage,
        role: user.role,
      },
    });
  } catch (error: any) {
    console.error('Signup error:', error);
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

    if (!user.password) {
      // Account was created via Google sign-in and has no local password.
      return res.status(400).json({
        success: false,
        message: 'This account uses Google sign-in. Please continue with Google.',
        authProvider: 'google',
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
        company: user.company,
        profileImage: user.profileImage,
        businessImage: user.businessImage,
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

// User (Buyer) Google Sign-in
// Verifies the Google ID token (credential) sent from the frontend, then:
//   - If a user with this email already exists, links the Google account and
//     signs them in (so historical RFQs / Material Inquiries auto-appear).
//   - Otherwise creates a new buyer account using the Google profile data.
export const userGoogleAuth = async (req: Request, res: Response) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({
        success: false,
        message: 'Google credential is required',
      });
    }

    let payload;
    try {
      payload = await verifyGoogleCredential(credential);
    } catch (verifyErr: any) {
      console.error('❌ Google token verification failed:', verifyErr.message);
      return res.status(401).json({
        success: false,
        message: verifyErr.message || 'Invalid Google credential',
      });
    }

    const email = String(payload.email).toLowerCase().trim();
    const googleId = String(payload.sub);
    const name = payload.name || email.split('@')[0];
    const profileImage = payload.picture || '';

    let user = await User.findOne({ email });

    if (user) {
      // Link Google to the existing account if not already linked.
      if (!user.googleId) {
        user.googleId = googleId;
      }
      if (!user.authProvider) {
        user.authProvider = user.googleId ? 'google' : 'local';
      }
      // If the existing account has no profile image, use the Google avatar.
      if (!user.profileImage && profileImage) {
        user.profileImage = profileImage;
      }
      // Backfill name if blank.
      if (!user.name && name) {
        user.name = name;
      }
      await user.save();
      console.log(`🔗 Linked Google account to existing user: ${email}`);
    } else {
      user = await User.create({
        name,
        email,
        googleId,
        authProvider: 'google',
        profileImage,
        role: 'buyer',
      });
      console.log(`🆕 Created new buyer via Google sign-in: ${email}`);
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
        company: user.company,
        profileImage: user.profileImage,
        businessImage: user.businessImage,
        role: user.role,
      },
    });
  } catch (error: any) {
    console.error('❌ Google auth error:', error.message);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
