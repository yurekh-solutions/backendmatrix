"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAnalytics = exports.rateChat = exports.getTrainingContent = exports.getChatHistory = exports.getRecommendations = exports.sendMessage = exports.getOrCreateChat = void 0;
const MiloChat_1 = __importDefault(require("../models/MiloChat"));
const Product_1 = __importDefault(require("../models/Product"));
// Intent detection patterns
const intentPatterns = {
    product_search: /find|search|looking for|show me|what|product/i,
    supplier_matching: /supplier|vendor|manufacturer|who can/i,
    training: /how to|train|learn|guide|tutorial|help me/i,
    growth_tips: /grow|scale|improve|business|increase|maximize/i,
    pricing: /price|cost|budget|expensive|cheap|discount/i,
    negotiation: /discount|offer|deal|negotiate|lower|reduce/i,
};
const detectIntent = (message) => {
    for (const [intent, pattern] of Object.entries(intentPatterns)) {
        if (pattern.test(message)) {
            return intent;
        }
    }
    return 'general_inquiry';
};
// Milo AI Response Generator
const generateMiloResponse = async (userMessage, context, userType) => {
    const intent = detectIntent(userMessage);
    let response = '';
    let metadata = { intent };
    switch (intent) {
        case 'product_search':
            response = `I can help you find the perfect products! What category are you interested in? We offer:
      ✓ Construction Materials
      ✓ Mild Steel Products
      ✓ Electronics & Components
      ✓ Raw Materials
      
      Tell me more about your requirements!`;
            break;
        case 'supplier_matching':
            response = `Great! I can connect you with verified suppliers. To find the best match:
      📍 What's your location?
      📦 What products do you need?
      💰 What's your budget range?
      🏢 What's your business type?
      
      This helps me recommend the perfect suppliers for you.`;
            break;
        case 'training':
            response = `I'm here to help you succeed! I offer:
      
      📚 **For Buyers:**
      - How to source quality materials
      - Negotiation tactics
      - Supplier evaluation guide
      - Price benchmarking
      
      📚 **For Suppliers:**
      - Product listing optimization
      - Customer engagement strategies
      - Pricing strategies
      - Growth hacks
      
      What would you like to learn?`;
            break;
        case 'growth_tips':
            if (userType === 'supplier') {
                response = `🚀 **Supplier Growth Strategy:**
        
        1️⃣ **Optimize Your Profile** - Complete all details, add certifications
        2️⃣ **Competitive Pricing** - Use our price benchmarking tool
        3️⃣ **Quality Listings** - Add high-quality images and descriptions
        4️⃣ **Customer Reviews** - Build credibility with positive feedback
        5️⃣ **Active Communication** - Respond quickly to inquiries (within 2 hours)
        6️⃣ **Volume Discounts** - Offer bulk pricing to attract big buyers
        
        Which area would you like to focus on?`;
            }
            else {
                response = `💡 **Buyer Growth Tips:**
        
        1️⃣ **Build Supplier Network** - Diversify your supplier base
        2️⃣ **Negotiate Better** - Know market prices before negotiating
        3️⃣ **Use Analytics** - Track spending and ROI
        4️⃣ **Quality Control** - Inspect samples before bulk orders
        5️⃣ **Long-term Contracts** - Get better rates with commitment
        6️⃣ **Automate Ordering** - Set up recurring purchases
        
        What interests you most?`;
            }
            break;
        case 'pricing':
            response = `📊 **Pricing Information:**
      
      I can help you with:
      ✓ Market price trends
      ✓ Competitive benchmarking
      ✓ Volume discount structures
      ✓ Negotiation strategies
      ✓ Price history analysis
      
      What product category interests you?`;
            break;
        default:
            response = `Hi! I'm Milo, your AI procurement assistant. I can help you with:
      
      🔍 Finding products & suppliers
      💼 Business growth strategies
      💰 Pricing & negotiation
      📚 Training & guidance
      
      What can I assist you with today?`;
    }
    return { response, metadata };
};
// Get or create chat session
const getOrCreateChat = async (req, res) => {
    try {
        const { userId, supplierId, userName, userType = 'buyer' } = req.body;
        let chat = await MiloChat_1.default.findOne({
            $or: [
                { userId, userType },
                { supplierId, userType },
            ],
        }).sort({ createdAt: -1 });
        if (!chat) {
            chat = new MiloChat_1.default({
                userId,
                supplierId,
                userName,
                userType,
                context: {
                    currentPhase: 'onboarding',
                },
            });
            // Add initial greeting
            const { response, metadata } = await generateMiloResponse('Hello', chat.context, userType);
            chat.messages.push({
                sender: 'milo',
                message: response,
                timestamp: new Date(),
                metadata,
            });
            await chat.save();
        }
        res.json({ success: true, chat });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error getting chat: ' + error.message,
        });
    }
};
exports.getOrCreateChat = getOrCreateChat;
// Send message to Milo
const sendMessage = async (req, res) => {
    try {
        const { chatId, message, userId, userType } = req.body;
        const chat = await MiloChat_1.default.findById(chatId);
        if (!chat) {
            return res.status(404).json({ success: false, message: 'Chat not found' });
        }
        // Add user message
        chat.messages.push({
            sender: 'user',
            message,
            timestamp: new Date(),
            intent: detectIntent(message),
        });
        // Generate Milo response
        const { response, metadata } = await generateMiloResponse(message, chat.context, userType);
        chat.messages.push({
            sender: 'milo',
            message: response,
            timestamp: new Date(),
            metadata,
        });
        // Update phase based on intent
        const intent = detectIntent(message);
        if (intent === 'product_search' || intent === 'supplier_matching') {
            chat.context.currentPhase = 'searching';
        }
        else if (intent === 'training') {
            chat.context.currentPhase = 'learning';
        }
        else if (intent === 'growth_tips') {
            chat.context.currentPhase = 'growing';
        }
        await chat.save();
        res.json({
            success: true,
            message: response,
            metadata,
            chat,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error sending message: ' + error.message,
        });
    }
};
exports.sendMessage = sendMessage;
// Get AI product recommendations
const getRecommendations = async (req, res) => {
    try {
        const { chatId, category, budget, userType } = req.body;
        const chat = await MiloChat_1.default.findById(chatId);
        if (!chat) {
            return res.status(404).json({ success: false, message: 'Chat not found' });
        }
        // Get recommended products
        const query = {};
        if (category)
            query.category = category;
        const products = await Product_1.default.find(query)
            .limit(10)
            .sort({ createdAt: -1 });
        // Score products based on recommendations
        const recommendations = products.map((product, index) => ({
            productId: product._id,
            name: product.name,
            description: product.description,
            price: product.price?.amount || 0,
            category: product.category,
            rating: 4.5, // Default rating
            reviews: 0,
            relevanceScore: (10 - index) * 10, // Higher score for top results
            reason: `Popular product in ${product.category} category`,
        }));
        // Store recommendations in chat context
        chat.context.recommendedProducts = products.map((p) => p._id.toString());
        chat.recommendations = recommendations.map((r) => ({
            type: 'product',
            title: r.name,
            description: r.description,
            relevanceScore: r.relevanceScore,
        }));
        await chat.save();
        res.json({
            success: true,
            recommendations,
            count: recommendations.length,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error getting recommendations: ' + error.message,
        });
    }
};
exports.getRecommendations = getRecommendations;
// Get chat history
const getChatHistory = async (req, res) => {
    try {
        const { userId, supplierId, userType = 'buyer' } = req.query;
        const query = { userType };
        if (userId)
            query.userId = userId;
        if (supplierId)
            query.supplierId = supplierId;
        const chats = await MiloChat_1.default.find(query)
            .sort({ createdAt: -1 })
            .limit(50);
        res.json({
            success: true,
            chats,
            count: chats.length,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching chat history: ' + error.message,
        });
    }
};
exports.getChatHistory = getChatHistory;
// Generate training content for supplier
const getTrainingContent = async (req, res) => {
    try {
        const { topic, userType } = req.body;
        const trainingContent = {
            supplier_optimization: {
                title: '📊 Optimize Your Supplier Profile',
                sections: [
                    {
                        title: 'Complete Your Profile',
                        tips: [
                            'Add company logo and banner',
                            'Write compelling company description',
                            'List all certifications (ISO, GMP, etc.)',
                            'Add verified phone & email',
                        ],
                    },
                    {
                        title: 'Product Listing Best Practices',
                        tips: [
                            'Use high-quality product images (min 1000x1000px)',
                            'Write detailed product descriptions (100+ words)',
                            'Add technical specifications',
                            'Include pricing tiers for bulk orders',
                        ],
                    },
                    {
                        title: 'Build Credibility',
                        tips: [
                            'Request customer reviews regularly',
                            'Respond to inquiries within 2 hours',
                            'Provide sample products for quality assurance',
                            'Share certifications and test reports',
                        ],
                    },
                ],
                estimatedTime: '4 weeks to see results',
                expectedGrowth: '30-50% increase in inquiries',
            },
            buyer_sourcing: {
                title: '🎯 Master the Art of Sourcing',
                sections: [
                    {
                        title: 'Research Suppliers',
                        tips: [
                            'Check company registration & certifications',
                            'Review customer feedback & ratings',
                            'Compare pricing across 3-5 suppliers',
                            'Verify production capacity',
                        ],
                    },
                    {
                        title: 'Negotiation Tactics',
                        tips: [
                            'Know market price before negotiating',
                            'Start with bulk orders for discounts',
                            'Lock in prices with long-term contracts',
                            'Use competitive quotes as leverage',
                        ],
                    },
                ],
                estimatedTime: '2 weeks',
                expectedGrowth: '20-30% cost savings',
            },
        };
        const content = trainingContent[topic] || trainingContent.supplier_optimization;
        res.json({
            success: true,
            content,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching training content: ' + error.message,
        });
    }
};
exports.getTrainingContent = getTrainingContent;
// Rate chat usefulness
const rateChat = async (req, res) => {
    try {
        const { chatId, helpful, feedback } = req.body;
        const chat = await MiloChat_1.default.findByIdAndUpdate(chatId, {
            helpful,
            summary: feedback,
        }, { new: true });
        res.json({ success: true, chat });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error rating chat: ' + error.message,
        });
    }
};
exports.rateChat = rateChat;
// Get AI analytics & insights
const getAnalytics = async (req, res) => {
    try {
        const { userId, supplierId, userType } = req.query;
        const query = {};
        if (userId)
            query.userId = userId;
        if (supplierId)
            query.supplierId = supplierId;
        if (userType)
            query.userType = userType;
        const chats = await MiloChat_1.default.find(query);
        const totalChats = chats.length;
        const helpfulChats = chats.filter((c) => c.helpful === true).length;
        const helpfulnessRate = totalChats > 0 ? (helpfulChats / totalChats) * 100 : 0;
        // Most discussed topics
        const topicCounts = {};
        chats.forEach((chat) => {
            chat.messages.forEach((msg) => {
                if (msg.intent) {
                    topicCounts[msg.intent] = (topicCounts[msg.intent] || 0) + 1;
                }
            });
        });
        const topTopics = Object.entries(topicCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([topic, count]) => ({ topic, count }));
        res.json({
            success: true,
            analytics: {
                totalChats,
                helpfulChats,
                helpfulnessRate: helpfulnessRate.toFixed(2) + '%',
                topTopics,
                avgMessagesPerChat: (chats.reduce((sum, c) => sum + c.messages.length, 0) / totalChats).toFixed(1),
            },
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching analytics: ' + error.message,
        });
    }
};
exports.getAnalytics = getAnalytics;
