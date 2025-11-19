import express, { Request, Response } from 'express';
import { enrichProductWithAI, generateProductEmbedding, findSimilarProducts, scoreLeadQuality } from '../services/aiProductEnrichment';
import { authenticateSupplier } from '../middleware/auth';
import Product from '../models/Product';

interface AuthRequest extends Request {
  supplier?: any;
}

const router = express.Router();

// Enrich product with AI analysis
router.post('/enrich-product/:productId', authenticateSupplier, async (req: AuthRequest, res: Response) => {
  try {
    const { productId } = req.params;
    const supplierId = req.supplier?._id;

    const product = await Product.findById(productId);
    
    if (!product || product.supplierId.toString() !== supplierId.toString()) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const enrichmentData = await enrichProductWithAI({
      name: product.name,
      description: product.description,
      category: product.category,
      specifications: product.specifications,
    });

    if (!enrichmentData) {
      return res.status(500).json({ success: false, message: 'Failed to enrich product' });
    }

    // Generate embedding for semantic search
    const embedding = await generateProductEmbedding(
      `${product.name} ${product.description} ${product.category}`
    );

    // Save enrichment data to product
    (product as any).enrichment = {
      qualityScore: enrichmentData.qualityScore,
      keywords: enrichmentData.keywords,
      marketAppeal: enrichmentData.marketAppeal,
      targetBuyers: enrichmentData.targetBuyers,
      competitiveAdvantage: enrichmentData.competitiveAdvantage,
      pricingRecommendation: enrichmentData.pricingRecommendation,
      improvementSuggestions: enrichmentData.improvementSuggestions,
      embedding: embedding,
      enrichedAt: new Date(),
    };

    await product.save();

    res.json({
      success: true,
      message: 'Product enriched successfully',
      enrichment: enrichmentData,
    });
  } catch (error: any) {
    console.error('Error enriching product:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to enrich product',
      error: error.message,
    });
  }
});

// Get product recommendations (cross-sell, up-sell)
router.get('/product-recommendations/:productId', authenticateSupplier, async (req: AuthRequest, res: Response) => {
  try {
    const { productId } = req.params;
    const supplierId = req.supplier?._id;

    const product = await Product.findById(productId);
    
    if (!product || product.supplierId.toString() !== supplierId.toString()) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const enrichment = (product as any).enrichment;
    
    if (!enrichment) {
      return res.json({
        success: true,
        recommendations: {
          crossSell: [],
          upSell: [],
        },
        message: 'Product not enriched yet',
      });
    }

    res.json({
      success: true,
      recommendations: {
        crossSell: enrichment.crossSellProducts,
        upSell: enrichment.upSellProducts,
      },
      qualityScore: enrichment.qualityScore,
      improvements: enrichment.improvementSuggestions,
    });
  } catch (error: any) {
    console.error('Error fetching recommendations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch recommendations',
      error: error.message,
    });
  }
});

// Semantic search for similar products
router.post('/similar-products', authenticateSupplier, async (req: AuthRequest, res: Response) => {
  try {
    const { productId } = req.body;
    const supplierId = req.supplier?._id;

    const targetProduct = await Product.findById(productId);
    
    if (!targetProduct || targetProduct.supplierId.toString() !== supplierId.toString()) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const enrichment = (targetProduct as any).enrichment;
    
    if (!enrichment?.embedding) {
      return res.json({
        success: true,
        similarProducts: [],
        message: 'Product not enriched with embeddings yet',
      });
    }

    // Get other products from supplier
    const otherProducts = await Product.find({
      supplierId,
      _id: { $ne: productId },
    });

    const productsWithEmbeddings = otherProducts
      .filter((p: any) => p.enrichment?.embedding)
      .map((p: any) => ({
        _id: p._id,
        name: p.name,
        category: p.category,
        embedding: p.enrichment.embedding,
      }));

    if (productsWithEmbeddings.length === 0) {
      return res.json({
        success: true,
        similarProducts: [],
        message: 'No similar products found',
      });
    }

    const similar = await findSimilarProducts(enrichment.embedding, productsWithEmbeddings);

    res.json({
      success: true,
      similarProducts: similar,
      message: `Found ${similar.length} similar products`,
    });
  } catch (error: any) {
    console.error('Error finding similar products:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to find similar products',
      error: error.message,
    });
  }
});

// Score lead quality
router.post('/score-lead', async (req: Request, res: Response) => {
  try {
    const { searchKeywords, viewedProducts, timeOnPlatform, inquiriesCount } = req.body;

    const leadScore = await scoreLeadQuality({
      searchKeywords,
      viewedProducts,
      timeOnPlatform,
      inquiriesCount,
    });

    res.json({
      success: true,
      leadScore,
    });
  } catch (error: any) {
    console.error('Error scoring lead:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to score lead',
      error: error.message,
    });
  }
});

export default router;
