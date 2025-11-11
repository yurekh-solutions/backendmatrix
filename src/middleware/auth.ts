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
    
    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    const decoded = verifyToken(token);
    
    if (!decoded || decoded.type !== 'supplier') {
      return res.status(401).json({ message: 'Invalid supplier token' });
    }
    
    const supplier = await Supplier.findById(decoded.id).select('-password');
    
    if (!supplier || !supplier.isActive) {
      return res.status(401).json({ message: 'Supplier account not found or inactive' });
    }
    
    if (supplier.status !== 'approved') {
      return res.status(403).json({ message: 'Supplier account not approved' });
    }
    
    req.supplier = supplier;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Authentication failed' });
  }
};

// Export aliases
export const adminAuth = authenticateAdmin;
export const supplierAuth = authenticateSupplier;
