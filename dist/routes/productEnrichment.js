"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const aiProductEnrichment_1 = require("../services/aiProductEnrichment");
const auth_1 = require("../middleware/auth");
const Product_1 = __importDefault(require("../models/Product"));
const router = express_1.default.Router();
// Enrich product with AI analysis
router.post('/enrich-product/:productId', auth_1.authenticateSupplier, async (req, res) => {
    try {
        const { productId } = req.params;
        const supplierId = req.supplier?._id;
        const product = await Product_1.default.findById(productId);
        if (!product || product.supplierId.toString() !== supplierId.toString()) {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }
        const enrichmentData = await (0, aiProductEnrichment_1.enrichProductWithAI)({
            name: product.name,
            description: product.description,
            category: product.category,
            specifications: product.specifications,
        });
        if (!enrichmentData) {
            return res.status(500).json({ success: false, message: 'Failed to enrich product' });
        }
        // Generate embedding for semantic search
        const embedding = await (0, aiProductEnrichment_1.generateProductEmbedding)(`${product.name} ${product.description} ${product.category}`);
        // Save enrichment data to product
        product.enrichment = {
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
    }
    catch (error) {
        console.error('Error enriching product:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to enrich product',
            error: error.message,
        });
    }
});
// Get product recommendations (cross-sell, up-sell)
router.get('/product-recommendations/:productId', auth_1.authenticateSupplier, async (req, res) => {
    try {
        const { productId } = req.params;
        const supplierId = req.supplier?._id;
        const product = await Product_1.default.findById(productId);
        if (!product || product.supplierId.toString() !== supplierId.toString()) {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }
        const enrichment = product.enrichment;
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
    }
    catch (error) {
        console.error('Error fetching recommendations:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch recommendations',
            error: error.message,
        });
    }
});
// Semantic search for similar products
router.post('/similar-products', auth_1.authenticateSupplier, async (req, res) => {
    try {
        const { productId } = req.body;
        const supplierId = req.supplier?._id;
        const targetProduct = await Product_1.default.findById(productId);
        if (!targetProduct || targetProduct.supplierId.toString() !== supplierId.toString()) {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }
        const enrichment = targetProduct.enrichment;
        if (!enrichment?.embedding) {
            return res.json({
                success: true,
                similarProducts: [],
                message: 'Product not enriched with embeddings yet',
            });
        }
        // Get other products from supplier
        const otherProducts = await Product_1.default.find({
            supplierId,
            _id: { $ne: productId },
        });
        const productsWithEmbeddings = otherProducts
            .filter((p) => p.enrichment?.embedding)
            .map((p) => ({
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
        const similar = await (0, aiProductEnrichment_1.findSimilarProducts)(enrichment.embedding, productsWithEmbeddings);
        res.json({
            success: true,
            similarProducts: similar,
            message: `Found ${similar.length} similar products`,
        });
    }
    catch (error) {
        console.error('Error finding similar products:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to find similar products',
            error: error.message,
        });
    }
});
// Score lead quality
router.post('/score-lead', async (req, res) => {
    try {
        const { searchKeywords, viewedProducts, timeOnPlatform, inquiriesCount } = req.body;
        const leadScore = await (0, aiProductEnrichment_1.scoreLeadQuality)({
            searchKeywords,
            viewedProducts,
            timeOnPlatform,
            inquiriesCount,
        });
        res.json({
            success: true,
            leadScore,
        });
    }
    catch (error) {
        console.error('Error scoring lead:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to score lead',
            error: error.message,
        });
    }
});
exports.default = router;
