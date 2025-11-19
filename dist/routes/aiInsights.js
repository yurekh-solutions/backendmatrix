"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const aiInsights_1 = require("../services/aiInsights");
const auth_1 = require("../middleware/auth");
const Product_1 = __importDefault(require("../models/Product"));
const router = express_1.default.Router();
// Get AI insights for supplier
router.get('/supplier-insights', auth_1.authenticateSupplier, async (req, res) => {
    try {
        const supplierId = req.supplier?._id;
        const companyName = req.supplier?.companyName;
        if (!supplierId) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }
        // Fetch supplier products
        const products = await Product_1.default.find({ supplierId });
        if (!products || products.length === 0) {
            return res.status(200).json({
                success: true,
                insights: null,
                message: 'Not enough data to generate insights. Add more products.',
            });
        }
        // Calculate analytics
        const totalProducts = products.length;
        const activeProducts = products.filter((p) => p.status === 'active').length;
        const pendingProducts = products.filter((p) => p.status === 'pending').length;
        const rejectedProducts = products.filter((p) => p.status === 'rejected').length;
        const successRate = totalProducts > 0 ? Math.round((activeProducts / totalProducts) * 100) : 0;
        // Count by category
        const categories = products.reduce((acc, product) => {
            const category = product.category || 'Uncategorized';
            acc[category] = (acc[category] || 0) + 1;
            return acc;
        }, {});
        // Get top category
        const sortedEntries = Object.entries(categories).sort((a, b) => b[1] - a[1]);
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
        const insights = await (0, aiInsights_1.generateSupplierInsights)(supplierData);
        // Generate product recommendations
        const recommendations = await (0, aiInsights_1.generateProductRecommendations)(supplierData, topCategory);
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
    }
    catch (error) {
        console.error('Error fetching AI insights:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate insights',
            error: error.message,
        });
    }
});
exports.default = router;
