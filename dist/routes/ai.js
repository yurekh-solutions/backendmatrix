"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const Product_1 = __importDefault(require("../models/Product"));
const AutoReply_1 = __importDefault(require("../models/AutoReply"));
const Lead_1 = __importDefault(require("../models/Lead"));
const OrderAutomation_1 = __importDefault(require("../models/OrderAutomation"));
const Supplier_1 = __importDefault(require("../models/Supplier"));
const RFQ_1 = __importDefault(require("../models/RFQ"));
const router = express_1.default.Router();
// ==================== MILO AI TRAINING DATA ====================
// Get comprehensive training data for Milo AI
router.get('/milo/training-data', async (req, res) => {
    try {
        // Fetch all products with supplier info
        const products = await Product_1.default.find({ status: 'active' }).populate('supplierId', 'companyName email phone businessType').limit(500);
        // Fetch all suppliers
        const suppliers = await Supplier_1.default.find({ status: 'approved' }).select('companyName email phone address businessDescription productsOffered yearsInBusiness');
        // Get market trending products (by inquiry count)
        const rfqs = await RFQ_1.default.find().select('productCategory quantity supplierResponse').limit(200);
        // Calculate hot/demanded products
        const productDemand = {};
        rfqs.forEach(rfq => {
            const category = rfq.productCategory || 'Other';
            productDemand[category] = (productDemand[category] || 0) + 1;
        });
        const hotProducts = Object.entries(productDemand)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 10)
            .map(([category, demand]) => ({ category, demandCount: demand }));
        // Aggregate supplier expertise
        const supplierExpertise = {};
        suppliers.forEach(supplier => {
            const key = supplier._id.toString();
            supplierExpertise[key] = supplier.productsOffered || [];
        });
        // Product categories with average pricing
        const categoryStats = {};
        products.forEach(product => {
            const cat = product.category || 'Other';
            if (!categoryStats[cat]) {
                categoryStats[cat] = {
                    category: cat,
                    avgPrice: 0,
                    count: 0,
                    suppliers: new Set(),
                    demandCount: productDemand[cat] || 0
                };
            }
            categoryStats[cat].count += 1;
            categoryStats[cat].avgPrice += product.price?.amount || 0;
            categoryStats[cat].suppliers.add(product.supplierId._id.toString());
        });
        // Calculate averages
        Object.keys(categoryStats).forEach(cat => {
            categoryStats[cat].avgPrice = Math.round(categoryStats[cat].avgPrice / categoryStats[cat].count);
            categoryStats[cat].supplierCount = categoryStats[cat].suppliers.size;
            delete categoryStats[cat].suppliers;
        });
        res.json({
            success: true,
            data: {
                trainingData: {
                    totalProducts: products.length,
                    totalSuppliers: suppliers.length,
                    totalRFQsAnalyzed: rfqs.length,
                    hotProducts: hotProducts,
                    categoryStats: Object.values(categoryStats),
                    marketInsights: {
                        mostDemandedCategory: hotProducts[0]?.category || 'Cement',
                        suppliersCount: suppliers.length,
                        activeProductsCount: products.length,
                        avgSuppliersPerCategory: Math.round(suppliers.length / Object.keys(categoryStats).length)
                    }
                },
                products: products.slice(0, 100).map(p => ({
                    id: p._id,
                    name: p.name,
                    category: p.category,
                    supplier: typeof p.supplierId === 'object' && p.supplierId !== null ? p.supplierId.companyName : 'Unknown',
                    price: p.price?.amount,
                    inStock: p.stock?.available
                })),
                suppliers: suppliers.map(s => ({
                    id: s._id,
                    name: s.companyName,
                    email: s.email,
                    phone: s.phone,
                    businessType: s.businessType,
                    yearsInBusiness: s.yearsInBusiness,
                    specialties: s.productsOffered
                })),
                hotDemandedProducts: hotProducts
            }
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch training data',
            error: error.message
        });
    }
});
// Get product intelligence for Milo
router.get('/milo/product-intelligence', async (req, res) => {
    try {
        const { category, searchTerm } = req.query;
        let query = { status: 'active' };
        if (category)
            query.category = { $regex: category, $options: 'i' };
        const products = await Product_1.default.find(query)
            .populate('supplierId', 'companyName email phone')
            .select('name category description price stock specifications')
            .limit(50);
        // Get related RFQs to understand demand
        let rfqQuery = {};
        if (category)
            rfqQuery.productCategory = { $regex: category, $options: 'i' };
        const relatedRFQs = await RFQ_1.default.find(rfqQuery).select('productCategory quantity supplierResponse status').limit(30);
        // Calculate intelligence
        const demandLevel = relatedRFQs.length > 20 ? 'High' : relatedRFQs.length > 10 ? 'Medium' : 'Low';
        const avgBudget = relatedRFQs.length > 0
            ? Math.round(relatedRFQs.filter((r) => r.supplierResponse?.quotedPrice).reduce((sum, r) => sum + (r.supplierResponse?.quotedPrice || 0), 0) / relatedRFQs.length)
            : 0;
        res.json({
            success: true,
            data: {
                categoryIntelligence: {
                    category: category || 'All Categories',
                    productCount: products.length,
                    supplierCount: new Set(products.map(p => p.supplierId._id.toString())).size,
                    demandLevel: demandLevel,
                    avgBudget: avgBudget,
                    totalRFQsInCategory: relatedRFQs.length,
                    priceRange: products.length > 0 ? {
                        min: Math.min(...products.map(p => p.price?.amount || 0)),
                        max: Math.max(...products.map(p => p.price?.amount || 0)),
                        avg: Math.round(products.reduce((sum, p) => sum + (p.price?.amount || 0), 0) / products.length)
                    } : null
                },
                products: products.slice(0, 20),
                relatedRFQs: relatedRFQs.slice(0, 10)
            }
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch product intelligence',
            error: error.message
        });
    }
});
// Get supplier matching for buyer inquiries
router.get('/milo/find-suppliers', async (req, res) => {
    try {
        const { productCategory, budget, quantity } = req.query;
        // Find relevant suppliers
        const suppliers = await Supplier_1.default.find({
            status: 'approved',
            productsOffered: { $regex: productCategory || '', $options: 'i' }
        }).limit(20);
        // Find products in this category
        const products = await Product_1.default.find({
            status: 'active',
            category: { $regex: productCategory || '', $options: 'i' }
        }).populate('supplierId', 'companyName email phone businessType yearsInBusiness');
        // Filter by budget if provided
        let filteredProducts = products;
        if (budget) {
            const maxBudget = parseInt(budget);
            filteredProducts = products.filter(p => (p.price?.amount || 0) <= maxBudget);
        }
        // Score suppliers based on product availability and price competitiveness
        const supplierScores = suppliers.map(supplier => {
            const supplierProducts = filteredProducts.filter(p => p.supplierId._id.toString() === supplier._id.toString());
            const avgPrice = supplierProducts.length > 0
                ? Math.round(supplierProducts.reduce((sum, p) => sum + (p.price?.amount || 0), 0) / supplierProducts.length)
                : 0;
            return {
                id: supplier._id,
                name: supplier.companyName,
                email: supplier.email,
                phone: supplier.phone,
                businessType: supplier.businessType,
                yearsInBusiness: supplier.yearsInBusiness,
                matchScore: supplierProducts.length > 0 ? Math.min(100, 60 + (supplierProducts.length * 5)) : 0,
                productCount: supplierProducts.length,
                avgPrice: avgPrice,
                specialties: supplier.productsOffered
            };
        });
        // Sort by match score
        supplierScores.sort((a, b) => b.matchScore - a.matchScore);
        res.json({
            success: true,
            data: {
                query: {
                    productCategory: productCategory || 'Any',
                    budget: budget || 'Any',
                    quantity: quantity || 'Any'
                },
                matchedSuppliers: supplierScores.slice(0, 15),
                topSupplier: supplierScores[0] || null,
                totalMatches: supplierScores.filter(s => s.matchScore > 0).length
            }
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to find suppliers',
            error: error.message
        });
    }
});
// Get market trends and hot products
router.get('/milo/market-trends', async (req, res) => {
    try {
        const rfqs = await RFQ_1.default.find({}).select('productCategory quantity supplierResponse status createdAt').limit(500);
        // Analyze trends
        const trends = {};
        const pricePoints = {};
        rfqs.forEach(rfq => {
            const category = rfq.productCategory || 'Other';
            if (!trends[category]) {
                trends[category] = {
                    category,
                    inquiries: 0,
                    avgQuantity: 0,
                    avgBudget: 0,
                    recentInquiries: 0
                };
                pricePoints[category] = [];
            }
            trends[category].inquiries += 1;
            trends[category].avgQuantity += rfq.quantity || 0;
            const rfqPrice = rfq.supplierResponse?.quotedPrice || 0;
            trends[category].avgBudget += rfqPrice;
            // Count recent inquiries (last 7 days)
            const daysSince = Math.floor((Date.now() - new Date(rfq.createdAt).getTime()) / (1000 * 60 * 60 * 24));
            if (daysSince <= 7)
                trends[category].recentInquiries += 1;
            if (rfqPrice)
                pricePoints[category].push(rfqPrice);
        });
        // Calculate averages
        Object.keys(trends).forEach(cat => {
            trends[cat].avgQuantity = Math.round(trends[cat].avgQuantity / trends[cat].inquiries);
            trends[cat].avgBudget = Math.round(trends[cat].avgBudget / trends[cat].inquiries);
            trends[cat].demandTrend = trends[cat].recentInquiries > trends[cat].inquiries / 5 ? 'Rising' : 'Stable';
        });
        const trendArray = Object.values(trends)
            .sort((a, b) => b.inquiries - a.inquiries)
            .slice(0, 20);
        res.json({
            success: true,
            data: {
                topDemandedProducts: trendArray.slice(0, 5),
                allTrends: trendArray,
                insights: {
                    mostHotProduct: trendArray[0]?.category || 'Cement',
                    trendingNow: trendArray.filter((t) => t.demandTrend === 'Rising').slice(0, 5),
                    totalCategoriesTracked: trendArray.length
                }
            }
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch market trends',
            error: error.message
        });
    }
});
// ==================== MILO AI CONVERSATION TRAINING ====================
// Train Milo on conversation patterns and buyer/supplier needs
router.post('/milo/train-conversation', async (req, res) => {
    try {
        const { userMessage, userType, category, budget, quantity } = req.body;
        // Analyze user query type
        const queryType = analyzeQueryType(userMessage, userType);
        // Get relevant context based on query
        let relevantData = {};
        if (queryType.includes('price') || queryType.includes('supplier')) {
            // Get supplier matching
            const suppliers = await Supplier_1.default.find({
                status: 'approved',
                productsOffered: { $regex: category || '', $options: 'i' }
            }).limit(10);
            const products = await Product_1.default.find({
                status: 'active',
                category: { $regex: category || '', $options: 'i' }
            }).populate('supplierId', 'companyName email phone');
            relevantData.suppliers = suppliers;
            relevantData.products = products;
        }
        if (queryType.includes('demand') || queryType.includes('trend')) {
            // Get market trends
            const rfqs = await RFQ_1.default.find({
                productCategory: { $regex: category || '', $options: 'i' }
            }).select('quantity supplierResponse createdAt').limit(50);
            relevantData.demandTrend = rfqs.length > 0 ? 'High' : 'Moderate';
            relevantData.recentInquiries = rfqs.length;
        }
        res.json({
            success: true,
            data: {
                message: userMessage,
                queryType: queryType,
                userType: userType,
                relevantContext: relevantData,
                suggestedResponse: generateMiloResponse(queryType, userType, relevantData)
            }
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to train conversation',
            error: error.message
        });
    }
});
// Helper function to analyze query type
function analyzeQueryType(message, userType) {
    const lowerMsg = message.toLowerCase();
    const types = [];
    if (lowerMsg.includes('price') || lowerMsg.includes('cost') || lowerMsg.includes('quote'))
        types.push('price');
    if (lowerMsg.includes('supplier') || lowerMsg.includes('vendor'))
        types.push('supplier');
    if (lowerMsg.includes('demand') || lowerMsg.includes('popular'))
        types.push('demand');
    if (lowerMsg.includes('trend') || lowerMsg.includes('market'))
        types.push('trend');
    if (lowerMsg.includes('rfq') || lowerMsg.includes('request'))
        types.push('rfq');
    if (lowerMsg.includes('delivery') || lowerMsg.includes('shipping'))
        types.push('delivery');
    if (lowerMsg.includes('quantity') || lowerMsg.includes('bulk'))
        types.push('quantity');
    // Default if no specific type found
    if (types.length === 0)
        types.push('general');
    return types;
}
// Helper function to generate context-aware response
function generateMiloResponse(queryTypes, userType, context) {
    let response = '';
    if (queryTypes.includes('price') && context.products) {
        response += `Found ${context.products.length} products in this category. `;
        if (context.products.length > 0) {
            const avgPrice = Math.round(context.products.reduce((sum, p) => sum + (p.price?.amount || 0), 0) / context.products.length);
            response += `Average price: ₹${avgPrice}. `;
        }
    }
    if (queryTypes.includes('supplier') && context.suppliers) {
        response += `I found ${context.suppliers.length} verified suppliers. `;
    }
    if (queryTypes.includes('demand')) {
        response += `Demand level: ${context.demandTrend}. Recent inquiries: ${context.recentInquiries}. `;
    }
    if (response === '') {
        response = userType === 'buyer'
            ? 'I can help you find suppliers, get pricing, and create RFQs for any construction material. What are you looking for?'
            : 'I can help you list products, manage inquiries, and grow your supplier business. What would you like to do?';
    }
    return response;
}
// AI supplier insights endpoint
router.get('/supplier-insights', auth_1.supplierAuth, async (req, res) => {
    try {
        const supplierId = req.supplier.id;
        // Get supplier products
        const products = await Product_1.default.find({ supplierId });
        // Get automation data
        const autoReplies = await AutoReply_1.default.find({ supplierId });
        const leads = await Lead_1.default.find({ supplierId });
        const orders = await OrderAutomation_1.default.find({ supplierId });
        // Calculate real insights
        const totalProducts = products.length;
        const activeProducts = products.filter(p => p.status === 'active').length;
        const approvalRate = totalProducts > 0 ? Math.round((activeProducts / totalProducts) * 100) : 0;
        const pendingLeads = leads.filter(l => l.status === 'new').length;
        const qualifiedLeads = leads.filter(l => l.status === 'qualified').length;
        const leadConversionRate = leads.length > 0 ? Math.round((qualifiedLeads / leads.length) * 100) : 0;
        const pendingOrders = orders.filter(o => o.status === 'pending').length;
        const completedOrders = orders.filter(o => o.status === 'delivered').length;
        const orderCompletionRate = orders.length > 0 ? Math.round((completedOrders / orders.length) * 100) : 0;
        // Generate AI recommendations
        const recommendations = [];
        if (pendingLeads > 5) {
            recommendations.push({
                id: 1,
                title: 'High Pending Leads',
                impact: 'High',
                suggestion: `You have ${pendingLeads} pending leads. Consider setting up auto-replies to improve response time.`,
                estimatedIncrease: '40%'
            });
        }
        if (totalProducts < 5) {
            recommendations.push({
                id: 2,
                title: 'Expand Product Catalog',
                impact: 'Medium',
                suggestion: 'Add more products to increase visibility and attract more buyers.',
                estimatedIncrease: '25%'
            });
        }
        if (autoReplies.length === 0) {
            recommendations.push({
                id: 3,
                title: 'Setup Auto-Replies',
                impact: 'High',
                suggestion: 'Create auto-replies to instantly respond to customer inquiries and improve engagement.',
                estimatedIncrease: '35%'
            });
        }
        res.json({
            success: true,
            data: {
                productQuality: {
                    average: approvalRate,
                    trend: approvalRate > 50 ? 'up' : 'down',
                    improvement: approvalRate > 50 ? '+12%' : '-5%'
                },
                buyerEngagement: {
                    score: Math.min(100, 50 + (qualifiedLeads * 2) + (completedOrders * 3)),
                    inquiries: leads.length,
                    conversionRate: `${leadConversionRate}%`
                },
                marketPositioning: {
                    rank: approvalRate > 70 ? 'Excellent' : approvalRate > 50 ? 'Good' : 'Needs Improvement',
                    percentile: approvalRate,
                    recommendation: 'Focus on product quality and customer service'
                },
                aiRecommendations: recommendations
            }
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch AI insights'
        });
    }
});
// AI generate auto-reply endpoint
router.post('/generate-auto-reply', auth_1.supplierAuth, async (req, res) => {
    try {
        const { messageType, prompt } = req.body;
        const supplierId = req.supplier.id;
        // Get supplier info
        // const supplier = await Supplier.findById(supplierId);
        const replies = {
            'General Inquiry': `Thank you for your interest in our products. We appreciate your inquiry and will respond with detailed information within 24 hours. Please feel free to contact us for any specific requirements. Our team is dedicated to providing you with the best service and quality products.`,
            'Price Quote Request': `Thank you for requesting a quote. We provide competitive pricing for bulk orders and value long-term partnerships. Please share your quantity requirements, delivery preferences, and any special specifications so we can provide an accurate and competitive quote tailored to your needs.`,
            'Product Availability': `Thank you for your interest in our products. Our inventory is regularly updated, and we maintain strong supply chains to ensure product availability. Please let us know your specific requirements including quantity, delivery timeline, and any custom specifications, and we will confirm availability and provide delivery details.`,
            'Custom Message': `Thank you for reaching out to us. We are committed to providing excellent service and support for all your procurement needs. Our team of experts is ready to assist you with product information, pricing, and any other queries you may have.`
        };
        // Customize based on supplier data if needed
        const reply = replies[messageType] || replies['Custom Message'];
        res.json({
            success: true,
            reply: reply
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to generate auto-reply'
        });
    }
});
exports.default = router;
