import { Request, Response } from 'express';
import User from '../models/User';
import Supplier from '../models/Supplier';
// Note: uploadImages middleware handles Cloudinary upload automatically

// Get user profile
export const getUserProfile = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Determine if user is a supplier or buyer
    const isSupplier = !!(req as any).supplier;

    res.json({
      success: true,
      user: {
        id: user._id,
        name: isSupplier ? user.contactPerson : user.name,
        email: user.email,
        phone: user.phone,
        company: isSupplier ? user.companyName : user.company,
        profileImage: isSupplier ? user.logo : user.profileImage,
        businessImage: isSupplier ? user.logo : user.businessImage,
        role: isSupplier ? 'supplier' : user.role,
      },
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Update user profile
export const updateUserProfile = async (req: Request, res: Response) => {
  try {
    console.log('📥 Profile update request received');
    console.log('📥 Headers:', req.headers['content-type']);
    console.log('📥 Body:', req.body);
    console.log('📥 Files:', req.files ? 'Yes' : 'No', req.file ? 'Single file' : 'No single file');
    
    const user = (req as any).user;
    if (!user) {
      console.log('❌ User not found in request');
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    console.log('✅ User found:', user.email);

    const { name, phone, company } = req.body;
    
    // Handle files (any field name)
    const files = req.files as Express.Multer.File[];
    const file = req.file || (files && files.length > 0 ? files[0] : undefined);
    
    if (files) {
      console.log('📎 Files array received:', files.length, 'files');
      files.forEach((f, i) => {
        console.log(`  File ${i}:`, { fieldname: f.fieldname, originalname: f.originalname, path: (f as any).path, size: f.size });
      });
    }

    const isSupplier = !!(req as any).supplier;

    // Update basic fields
    if (name) {
      if (isSupplier) user.contactPerson = name;
      else user.name = name;
    }
    
    if (phone) user.phone = phone;
    
    if (company) {
      if (isSupplier) user.companyName = company;
      else user.company = company;
    }

    // Handle file upload - when using cloudinaryStorage, file.path contains the Cloudinary URL
    if (file) {
      console.log('📸 Processing file upload for profile update:', file.fieldname);
      console.log('📸 File details:', { path: (file as any).path, filename: (file as any).filename });
      
      // Determine if it's profileImage or businessImage based on fieldname
      const fieldname = file.fieldname || 'profileImage';
      
      // With cloudinaryStorage, the URL is already in file.path
      const imageUrl = (file as any).path || (file as any).secure_url || (file as any).url;
      
      if (!imageUrl) {
        console.error('❌ No image URL found in uploaded file');
        return res.status(500).json({ success: false, message: 'Image upload failed - no URL returned' });
      }
      
      console.log('✅ Image URL from Cloudinary:', imageUrl);
      
      if (isSupplier) {
        // Suppliers use 'logo' for both or we can add fields if needed
        user.logo = imageUrl;
      } else {
        if (fieldname === 'businessImage') {
          user.businessImage = imageUrl;
        } else {
          user.profileImage = imageUrl;
        }
      }
    }

    await user.save();

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        name: isSupplier ? user.contactPerson : user.name,
        email: user.email,
        phone: user.phone,
        company: isSupplier ? user.companyName : user.company,
        profileImage: isSupplier ? user.logo : user.profileImage,
        businessImage: isSupplier ? user.logo : user.businessImage,
        role: isSupplier ? 'supplier' : user.role,
      },
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Upload profile picture (dedicated endpoint)
export const uploadProfilePicture = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Handle files (any field name)
    const files = req.files as Express.Multer.File[];
    const file = req.file || (files && files.length > 0 ? files[0] : undefined);

    if (!file) {
      return res.status(400).json({ success: false, message: 'No image provided' });
    }

    const isSupplier = !!(req as any).supplier;

    // With cloudinaryStorage, file is already uploaded and URL is in file.path
    console.log('📸 Uploading profile picture...');
    console.log('📸 File details:', { path: (file as any).path, filename: (file as any).filename });
    
    const imageUrl = (file as any).path || (file as any).secure_url || (file as any).url;
    
    if (!imageUrl) {
      console.error('❌ No image URL found in uploaded file');
      return res.status(500).json({ success: false, message: 'Image upload failed - no URL returned' });
    }
    
    console.log('✅ Upload successful, URL:', imageUrl);

    if (isSupplier) {
      user.logo = imageUrl;
    } else {
      user.profileImage = imageUrl;
    }

    await user.save();

    res.json({
      success: true,
      message: 'Profile picture uploaded successfully',
      profilePicture: imageUrl,
      data: {
        id: user._id,
        name: isSupplier ? user.contactPerson : user.name,
        email: user.email,
        phone: user.phone,
        profileImage: imageUrl,
        role: isSupplier ? 'supplier' : user.role,
      },
    });
  } catch (error) {
    console.error('Upload profile picture error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get user cart
export const getUserCart = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const user = await User.findById(userId).populate('cart.productId');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({
      success: true,
      cart: user.cart,
    });
  } catch (error) {
    console.error('Get cart error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Add to cart
export const addToCart = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { productId, quantity = 1 } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Check if product already in cart
    const existingItem = user.cart.find(
      (item) => item.productId.toString() === productId
    );

    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      user.cart.push({
        productId,
        quantity,
        addedAt: new Date(),
      });
    }

    await user.save();

    res.json({
      success: true,
      message: 'Product added to cart',
      cart: user.cart,
    });
  } catch (error) {
    console.error('Add to cart error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Update cart item quantity
export const updateCartItem = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { productId, quantity } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const cartItem = user.cart.find(
      (item) => item.productId.toString() === productId
    );

    if (!cartItem) {
      return res.status(404).json({ success: false, message: 'Product not in cart' });
    }

    if (quantity <= 0) {
      user.cart = user.cart.filter(
        (item) => item.productId.toString() !== productId
      );
    } else {
      cartItem.quantity = quantity;
    }

    await user.save();

    res.json({
      success: true,
      message: 'Cart updated',
      cart: user.cart,
    });
  } catch (error) {
    console.error('Update cart error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Remove from cart
export const removeFromCart = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { productId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.cart = user.cart.filter(
      (item) => item.productId.toString() !== productId
    );

    await user.save();

    res.json({
      success: true,
      message: 'Product removed from cart',
      cart: user.cart,
    });
  } catch (error) {
    console.error('Remove from cart error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Clear cart
export const clearCart = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.cart = [];
    await user.save();

    res.json({
      success: true,
      message: 'Cart cleared',
    });
  } catch (error) {
    console.error('Clear cart error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
