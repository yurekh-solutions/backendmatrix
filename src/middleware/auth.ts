import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import Admin from '../models/Admin';
import Supplier from '../models/Supplier';

interface AuthRequest extends Request {
  user?: any;
  admin?: any;
  supplier?: any;
}

export { AuthRequest };

export const authenticateAdmin = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    const decoded = verifyToken(token);
    
    if (!decoded || decoded.type !== 'admin') {
      return res.status(401).json({ message: 'Invalid admin token' });
    }
    
    const admin = await Admin.findById(decoded.id).select('-password');
    
    if (!admin || !admin.isActive) {
      return res.status(401).json({ message: 'Admin account not found or inactive' });
    }
    
    req.admin = admin;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Authentication failed' });
  }
};

export const authenticateSupplier = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    console.log('Auth attempt - Token received:', token ? 'Yes' : 'No');
    
    if (!token) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    
    const decoded = verifyToken(token);
    console.log('Token decoded:', decoded);
    
    if (!decoded || decoded.type !== 'supplier') {
      console.log('Token validation failed:', { decoded, type: decoded?.type });
      return res.status(401).json({ success: false, message: 'Invalid supplier token' });
    }
    
    const supplier = await Supplier.findById(decoded.id).select('-password');
    console.log('Supplier found:', supplier ? supplier.email : 'Not found', 'isActive:', supplier?.isActive, 'status:', supplier?.status);
    
    if (!supplier) {
      console.log('Supplier not found with ID:', decoded.id);
      return res.status(401).json({ success: false, message: 'Supplier account not found' });
    }
    
    if (!supplier.isActive) {
      console.log('Supplier inactive:', supplier.email);
      return res.status(401).json({ success: false, message: 'Supplier account is inactive' });
    }
    
    // Allow approved suppliers to access all features
    // Pending suppliers can add products but need admin approval
    if (supplier.status === 'rejected') {
      console.log('Supplier rejected:', supplier.email);
      return res.status(403).json({ success: false, message: 'Supplier account has been rejected' });
    }
    
    console.log('✅ Supplier authenticated successfully:', supplier.email);
    req.supplier = supplier;
    next();
  } catch (error) {
    console.error('Supplier auth error:', error);
    res.status(401).json({ success: false, message: 'Authentication failed' });
  }
};

// Export aliases
export const adminAuth = authenticateAdmin;
export const supplierAuth = authenticateSupplier;
