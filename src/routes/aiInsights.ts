import express, { Request, Response } from 'express';
import { generateSupplierInsights, generateProductRecommendations } from '../services/aiInsights';
import { authenticateSupplier } from '../middleware/auth';
import Product from '../models/Product';

interface AuthRequest extends Request {
  supplier?: any;
}

const router = express.Router();

// Get AI insights for supplier
router.get('/supplier-insights', authenticateSupplier, async (req: AuthRequest, res: Response) => {
  try {
    const supplierId = req.supplier?._id;
    const companyName = req.supplier?.companyName;
    
    if (!supplierId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    // Fetch supplier products
    const products = await Product.find({ supplierId });
    
    if (!products || products.length === 0) {
      return res.status(200).json({
        success: true,
        insights: null,
        message: 'Not enough data to generate insights. Add more products.',
      });
    }

    // Calculate analytics
    const totalProducts = products.length;
    const activeProducts = products.filter((p: any) => p.status === 'active').length;
    const pendingProducts = products.filter((p: any) => p.status === 'pending').length;
    const rejectedProducts = products.filter((p: any) => p.status === 'rejected').length;
    const successRate = totalProducts > 0 ? Math.round((activeProducts / totalProducts) * 100) : 0;

    // Count by category
    const categories = products.reduce((acc: Record<string, number>, product: any) => {
      const category = product.category || 'Uncategorized';
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {});

    // Get top category
    const sortedEntries = Object.entries(categories).sort((a, b) => (b[1] as number) - (a[1] as number));
    const topCategory = sortedEntries[0]?.[0] || 'General';

    // Prepare data for AI analysis
    const supplierData = {
      supplierId: supplierId.toString(),
      companyName: companyName || 'Business',
      totalProducts,
      activeProducts,
      pendingProducts,
      rejectedProducts,
      successRate,
      categories,
      memberSince: new Date().getFullYear().toString(),
      businessType: 'B2B Supplier',
    };

    // Generate AI insights
    const insights = await generateSupplierInsights(supplierData);
    
    // Generate product recommendations
    const recommendations = await generateProductRecommendations(supplierData, topCategory);

    res.json({
      success: true,
      insights,
      recommendations,
      analytics: {
        totalProducts,
        activeProducts,
        pendingProducts,
        rejectedProducts,
        successRate,
        topCategory,
      },
    });
  } catch (error: any) {
    console.error('Error fetching AI insights:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate insights',
      error: error.message,
    });
  }
});

export default router;
