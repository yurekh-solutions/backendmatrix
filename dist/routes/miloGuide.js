"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const Product_1 = __importDefault(require("../models/Product"));
const Supplier_1 = __importDefault(require("../models/Supplier"));
const RFQ_1 = __importDefault(require("../models/RFQ"));
const Category_1 = __importDefault(require("../models/Category"));
const router = express_1.default.Router();
// ==================== MILO GUIDE TOOL ====================
// Get comprehensive guide for buyers
router.get('/guide/buyer', async (req, res) => {
    try {
        // Get hot/popular products
        const rfqs = await RFQ_1.default.find().select('productCategory').limit(300);
        const productDemand = {};
        rfqs.forEach(rfq => {
            const cat = rfq.productCategory || 'Other';
            productDemand[cat] = (productDemand[cat] || 0) + 1;
        });
        const hotProducts = Object.entries(productDemand)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([category, count]) => ({
            category,
            inquiries: count,
            popularity: count > 30 ? 'Very High' : count > 20 ? 'High' : 'Medium'
        }));
        // Get all categories
        const categories = await Category_1.default.find({}).select('name slug icon').limit(20);
        // Get top suppliers
        const topSuppliers = await Supplier_1.default.find({ status: 'approved' })
            .select('companyName email phone businessType yearsInBusiness productsOffered')
            .limit(10);
        // Get sample products from each category
        const sampleProducts = await Product_1.default.find({ status: 'active' })
            .populate('supplierId', 'companyName email phone')
            .select('name category price stock specifications')
            .limit(30);
        const buyerGuide = {
            title: "🛒 Buyer's Complete Guide",
            sections: {
                gettingStarted: {
                    title: "1️⃣ Getting Started",
                    steps: [
                        {
                            step: "Browse Products",
                            description: "Explore our catalog of construction materials",
                            action: "View Products Dashboard",
                            details: `We have ${sampleProducts.length}+ products from ${topSuppliers.length}+ verified suppliers`,
                            substeps: [
                                "Visit the 'Products' page from homepage",
                                "Browse through all available categories",
                                "Read product descriptions and specifications",
                                "Check supplier details and ratings",
                                "Compare prices between similar products",
                                "Look for certifications (BIS, ISO)",
                                "Check stock availability status"
                            ]
                        },
                        {
                            step: "Search & Filter",
                            description: "Find exactly what you need by category, price, or supplier",
                            action: "Use Smart Search",
                            details: "Filter by budget, location, delivery time, and supplier rating",
                            substeps: [
                                "Enter product name in search box",
                                "Select category from dropdown",
                                "Set price range (min-max budget)",
                                "Filter by location/delivery zones",
                                "Sort results by price/rating/newest",
                                "View detailed product information",
                                "Add to comparison or wishlist"
                            ]
                        },
                        {
                            step: "Create RFQ",
                            description: "Submit a Request for Quotation to get competitive quotes",
                            action: "Start RFQ",
                            details: "Get quotes from multiple suppliers in your category in just 2 hours",
                            substeps: [
                                "Click 'Create RFQ' button in navigation",
                                "Select product category needed",
                                "Enter exact quantity required",
                                "Specify delivery location (city/address)",
                                "Set delivery timeline preference",
                                "Add quality specifications/certifications",
                                "Enter budget range (helps suppliers filter)",
                                "Add any special requirements",
                                "Submit RFQ and track status",
                                "Receive quotes from suppliers (within 2 hours)"
                            ]
                        },
                        {
                            step: "Compare & Negotiate",
                            description: "Review multiple quotes and get the best deal",
                            substeps: [
                                "Compare quotes side-by-side on RFQ page",
                                "Check price, delivery time, and terms",
                                "Review supplier ratings and reviews",
                                "Use WhatsApp to ask clarification questions",
                                "Negotiate for bulk discounts",
                                "Discuss payment terms (net 7/15/30)",
                                "Verify delivery guarantees",
                                "Ask about quality certifications",
                                "Select best offer and confirm"
                            ]
                        },
                        {
                            step: "Place Order",
                            description: "Confirm order and complete payment",
                            substeps: [
                                "Review final order details",
                                "Confirm delivery address",
                                "Choose payment method (CC/Debit/UPI/NEFT)",
                                "Complete payment securely",
                                "Get order confirmation email",
                                "Receive tracking information",
                                "Monitor delivery progress in dashboard",
                                "Inspect goods upon delivery",
                                "Leave feedback/review for supplier"
                            ]
                        }
                    ]
                },
                advancedBuyingStrategies: {
                    title: "🎯 Advanced Buying Strategies",
                    strategies: [
                        {
                            strategy: "Bulk Ordering for Maximum Savings",
                            description: "Order larger quantities to unlock significant discounts",
                            howTo: [
                                "Calculate 3-6 month material requirements",
                                "Group similar orders together for volume",
                                "Contact suppliers directly about bulk pricing",
                                "Negotiate 10-20% discounts for large orders",
                                "Arrange staggered delivery if needed",
                                "Save 15-30% compared to small orders"
                            ],
                            expectedSavings: "₹50,000 - ₹500,000 annually",
                            bestFor: "Regular construction projects"
                        },
                        {
                            strategy: "Seasonal Buying Optimization",
                            description: "Buy during low-demand seasons for better prices",
                            tactics: [
                                "Buy cement in monsoon season (lower demand)",
                                "Buy steel before construction season peaks",
                                "Plan 2-3 months ahead of requirements",
                                "Monitor market trends and price cycles",
                                "Arrange storage facilities",
                                "Save 8-12% compared to peak season pricing"
                            ],
                            timing: "Monsoon & off-season = 8-12% savings"
                        },
                        {
                            strategy: "Supplier Relationship Building",
                            description: "Build long-term partnerships for better pricing",
                            steps: [
                                "Place regular orders from same supplier",
                                "Maintain excellent payment history",
                                "Communicate delivery schedules in advance",
                                "Request preferred customer pricing",
                                "Negotiate annual framework agreements",
                                "Get priority service during peak seasons"
                            ],
                            benefit: "10-15% better pricing + priority service"
                        },
                        {
                            strategy: "Quality Assurance Before Purchase",
                            description: "Verify product quality and certifications",
                            checklist: [
                                "Check for BIS (Bureau of Indian Standards) certification",
                                "Verify ISO certifications relevant to product",
                                "Request test reports and quality documentation",
                                "Ask for sample before placing bulk order",
                                "Verify GST registration of supplier",
                                "Check previous customer reviews and ratings",
                                "Visit supplier facility if possible (optional)",
                                "Get quality guarantee in writing"
                            ],
                            importance: "Critical for long-term project success"
                        }
                    ]
                },
                categorySpecificGuides: {
                    title: "📦 Category-Specific Buying Guides",
                    categories: [
                        {
                            category: "Cement",
                            types: [
                                { type: "OPC 43 Grade", price: "₹340-420/bag", uses: "General construction" },
                                { type: "OPC 53 Grade", price: "₹370-450/bag", uses: "Stronger structures" },
                                { type: "PPC", price: "₹320-400/bag", uses: "Wet areas, durability" }
                            ],
                            buyingTips: [
                                "Buy from 2-3 month old stock (better strength development)",
                                "Always check manufacturing date on bag",
                                "Store in dry place away from moisture",
                                "Use within 3 months of purchase",
                                "Bulk discount available: ₹10-30/bag for 1000+ bags",
                                "Verify GST certifications from supplier"
                            ],
                            topSuppliers: "UltraTech, ACC, Ambuja, JK Cement, Binani",
                            expectedPrice: "₹380/bag (average market rate)"
                        },
                        {
                            category: "Steel/TMT Bars",
                            types: [
                                { grade: "Fe 415", price: "₹50-56/kg", use: "Standard construction" },
                                { grade: "Fe 500", price: "₹51-57/kg", use: "High-strength structures" },
                                { grade: "Fe 550", price: "₹53-59/kg", use: "Heavy-duty applications" }
                            ],
                            buyingTips: [
                                "Common sizes: 8mm, 10mm, 12mm bars",
                                "Always verify Shear test reports",
                                "Check Bend test compliance (no cracking)",
                                "Weight verification is important",
                                "Bulk discount: ₹2-5/kg for 5+ tons",
                                "Request mill certificates with each batch"
                            ],
                            topSuppliers: "Tata Tiscon, JSW Neosteel, SAIL, Vizag Steel, Essar",
                            expectedPrice: "₹54/kg (average market rate)"
                        },
                        {
                            category: "Bricks & Blocks",
                            types: [
                                { type: "Red Clay Bricks", price: "₹6-9/piece", specs: "Standard size" },
                                { type: "Fly Ash Bricks", price: "₹3.5-5.5/piece", specs: "Eco-friendly" },
                                { type: "AAC Blocks", price: "₹45-70/block", specs: "Lightweight" }
                            ],
                            buyingTips: [
                                "Minimum order quantity: 5,000 pieces",
                                "Check clay quality and consistency",
                                "Verify crushing strength test results",
                                "Ensure uniform color and size",
                                "Free delivery usually available",
                                "Ask about return policy for damaged bricks"
                            ],
                            topSuppliers: "Local brick manufacturers, AAC block companies",
                            expectedPrice: "₹7/piece (average for clay bricks)"
                        }
                    ]
                },
                hotProducts: {
                    title: "🔥 Hot & Popular Products",
                    trending: hotProducts,
                    description: "These categories have the highest buyer demand right now",
                    tip: "Buying trending products? You'll get better pricing due to high competition among suppliers!"
                },
                rfqGuide: {
                    title: "📋 How to Create an RFQ",
                    steps: [
                        {
                            step: "Select Product",
                            description: "Choose the product category you need",
                            example: "e.g., Cement, Steel, TMT Bars"
                        },
                        {
                            step: "Enter Details",
                            description: "Specify quantity, delivery location, timeline",
                            example: "Qty: 1000 bags, Delivery: Mumbai, Timeline: 7 days"
                        },
                        {
                            step: "Add Specifications",
                            description: "Include quality requirements, certifications needed",
                            example: "OPC 43 Grade, GST Verified, ISO Certified"
                        },
                        {
                            step: "Submit RFQ",
                            description: "Submit to get quotes from suppliers",
                            result: "Receive multiple quotes within 2 hours"
                        }
                    ],
                    benefits: [
                        "✅ Get quotes from multiple suppliers instantly",
                        "✅ Compare prices and delivery options",
                        "✅ Negotiate with best offers",
                        "✅ 98% on-time delivery guaranteed"
                    ]
                },
                categories: {
                    title: "📦 Product Categories",
                    list: categories.slice(0, 10).map(cat => ({
                        name: cat.name,
                        description: cat.slug,
                        topSuppliers: `${topSuppliers.filter(s => s.productsOffered.some(p => p.toLowerCase().includes(cat.name.toLowerCase()))).length}+ suppliers`
                    }))
                },
                supplierInfo: {
                    title: "🏢 Top Verified Suppliers",
                    count: topSuppliers.length,
                    suppliers: topSuppliers.map(s => ({
                        name: s.companyName,
                        email: s.email,
                        phone: s.phone,
                        experience: `${s.yearsInBusiness} years`,
                        specialties: s.productsOffered.slice(0, 3),
                        badge: "✅ Verified"
                    }))
                },
                pricing: {
                    title: "💰 Pricing & Deals",
                    tips: [
                        "Bulk Orders: 5-15% discount for large quantities",
                        "On-Time Delivery: 100% guaranteed or money back",
                        "Price Match: We'll match any verified competitor price",
                        "Payment Terms: 7/15/30 day payment options available"
                    ]
                },
                delivery: {
                    title: "🚚 Delivery & Logistics",
                    info: [
                        "Standard Delivery: 3-7 business days across India",
                        "Express Delivery: 24-48 hours in metro cities",
                        "Free Delivery: Orders above ₹50,000",
                        "Real-Time Tracking: Track your shipment live",
                        "Insurance: All orders covered by insurance"
                    ]
                },
                whatsapp: {
                    title: "📱 WhatsApp Support",
                    info: "Chat directly with suppliers via WhatsApp integrated in the platform",
                    benefits: [
                        "Quick responses from suppliers",
                        "Share specifications easily",
                        "Negotiate pricing directly",
                        "Get real-time delivery updates"
                    ]
                },
                payment: {
                    title: "💳 Payment & Security",
                    info: [
                        "Secure Payment Gateway",
                        "Multiple Payment Methods (Credit Card, Debit, UPI, NEFT)",
                        "Buyer Protection Policy",
                        "Invoice & Delivery Proof",
                        "Easy Returns & Refunds"
                    ]
                }
            }
        };
        res.json({
            success: true,
            data: buyerGuide
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch buyer guide',
            error: error.message
        });
    }
});
// Get comprehensive guide for suppliers
router.get('/guide/supplier', async (req, res) => {
    try {
        // Get categories with demand
        const rfqs = await RFQ_1.default.find().select('productCategory').limit(300);
        const categoryDemand = {};
        rfqs.forEach(rfq => {
            const cat = rfq.productCategory || 'Other';
            categoryDemand[cat] = (categoryDemand[cat] || 0) + 1;
        });
        const demandingCategories = Object.entries(categoryDemand)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([category, count]) => ({
            category,
            buyerDemand: count,
            opportunity: count > 30 ? '🟢 High' : count > 20 ? '🟡 Medium' : '🔵 Low'
        }));
        // Get all suppliers to show stats
        const totalSuppliers = await Supplier_1.default.countDocuments({ status: 'approved' });
        const recentSuppliers = await Supplier_1.default.find({ status: 'approved' })
            .select('companyName productsOffered')
            .limit(5);
        // Get recent RFQs
        const recentRFQs = await RFQ_1.default.find()
            .select('productCategory quantity status createdAt')
            .sort({ createdAt: -1 })
            .limit(10);
        const supplierGuide = {
            title: "🏭 Supplier's Complete Guide",
            sections: {
                gettingStarted: {
                    title: "1️⃣ Getting Started as Supplier",
                    steps: [
                        {
                            step: "Complete Onboarding",
                            description: "Register your business with required documents",
                            substeps: [
                                "Go to 'Become a Supplier' page",
                                "Enter company basic information",
                                "Upload PAN certificate",
                                "Upload GST registration (if applicable)",
                                "Provide business address proof",
                                "Enter banking details",
                                "Submit for verification",
                                "Verification completed in 24-48 hours"
                            ],
                            documents: [
                                "Business Registration (PAN/GST)",
                                "Bank Account Details",
                                "Business Proof",
                                "Owner ID Proof"
                            ],
                            time: "24-48 hours approval"
                        },
                        {
                            step: "Set Up Profile",
                            description: "Create professional supplier profile",
                            substeps: [
                                "Upload company logo (200x200 px)",
                                "Write company description (max 500 chars)",
                                "List years in business",
                                "Add company contact information",
                                "Specify product categories offered",
                                "Add certifications held (ISO, BIS, etc.)",
                                "Set service coverage area",
                                "Enable profile for visibility"
                            ],
                            tip: "Complete profile = 3x more inquiries!"
                        },
                        {
                            step: "List Products",
                            description: "Add your products with complete details",
                            substeps: [
                                "Click 'Add Product' button",
                                "Fill product name and description",
                                "Select category and subcategory",
                                "Add detailed specifications",
                                "Upload high-quality product images (min 3)",
                                "Add certifications/test reports",
                                "Set pricing and MOQ (Minimum Order Quantity)",
                                "Set stock quantity",
                                "Publish product",
                                "Monitor inquiries"
                            ],
                            includes: [
                                "Product name and category",
                                "Pricing and MOQ",
                                "Specifications and certifications",
                                "Images and documents"
                            ]
                        },
                        {
                            step: "Manage Inventory",
                            description: "Keep stock levels updated in real-time",
                            substeps: [
                                "Go to Inventory dashboard",
                                "View all products and stock",
                                "Update quantities manually",
                                "Or use bulk import feature",
                                "Set low stock alerts",
                                "Enable/disable products as needed",
                                "Track inventory by category",
                                "Export inventory reports"
                            ],
                            features: ["Real-time stock tracking", "Low stock alerts", "Bulk updates"]
                        },
                        {
                            step: "Respond to RFQs",
                            description: "Quote on buyer requests and win orders",
                            substeps: [
                                "Receive RFQ notification",
                                "Review buyer requirements",
                                "Check if you can fulfill",
                                "Prepare competitive quote",
                                "Include all charges and terms",
                                "Submit quote before deadline",
                                "Use WhatsApp to discuss if needed",
                                "Wait for buyer decision",
                                "Win order and arrange delivery"
                            ],
                            time: "Respond within 2 hours for best results"
                        }
                    ]
                },
                advancedSupplierStrategies: {
                    title: "🎯 Advanced Supplier Strategies",
                    strategies: [
                        {
                            strategy: "Win More RFQs - Quick Response Technique",
                            description: "Respond faster than competitors to win more deals",
                            steps: [
                                "Enable push notifications for RFQs",
                                "Set phone alert for new inquiries",
                                "Respond within 30 minutes (beats 95% competitors)",
                                "Include personalized message",
                                "Ask clarifying questions",
                                "Offer flexible terms to stand out",
                                "Follow up if no response in 2 hours"
                            ],
                            expectedResult: "30-50% higher conversion rate"
                        },
                        {
                            strategy: "Premium Pricing Strategy - Quality Over Volume",
                            description: "Position as premium supplier and win better margins",
                            tactics: [
                                "Highlight all certifications",
                                "Showcase quality test reports",
                                "Display customer testimonials",
                                "Offer premium delivery options",
                                "Provide quality guarantees",
                                "Price 5-10% premium justified by quality",
                                "Target buyers who value quality"
                            ],
                            benefit: "20-30% higher margins"
                        },
                        {
                            strategy: "Volume Growth - Aggressive Pricing",
                            description: "Build volume and market share quickly",
                            tactics: [
                                "Price 5-10% competitive vs market",
                                "Offer bulk quantity discounts",
                                "Provide flexible payment terms",
                                "Quick delivery (24-48 hours)",
                                "Free sample delivery",
                                "Target high-volume categories",
                                "Build repeat customer base"
                            ],
                            benefit: "2-3x volume increase"
                        },
                        {
                            strategy: "Category Domination - Niche Focus",
                            description: "Become the go-to supplier in specific categories",
                            steps: [
                                "Choose 1-2 categories to dominate",
                                "List 30+ products in those categories",
                                "Price most competitively",
                                "Maintain highest stock levels",
                                "Fastest delivery time",
                                "Build reputation scores",
                                "Become category #1 supplier"
                            ],
                            benefit: "80%+ of category inquiries"
                        },
                        {
                            strategy: "Loyalty Program - Repeat Customers",
                            description: "Turn one-time buyers into regular customers",
                            tactics: [
                                "Track repeat customers",
                                "Offer loyalty discounts (5-10%)",
                                "Priority customer support",
                                "Early notification of new products",
                                "Special pricing for regular orders",
                                "Free shipping on repeat orders",
                                "Build long-term relationships"
                            ],
                            benefit: "50% of revenue from repeat buyers"
                        }
                    ]
                },
                onboarding: {
                    title: "📝 Onboarding Checklist",
                    checklist: [
                        {
                            item: "✅ Business Documents",
                            details: [
                                "PAN Certificate",
                                "GST Registration (if registered)",
                                "Business Address Proof",
                                "CIN/UDYAM (if applicable)"
                            ]
                        },
                        {
                            item: "✅ Banking Details",
                            details: [
                                "Bank Account Number",
                                "IFSC Code",
                                "Account Holder Name",
                                "Cancelled Cheque"
                            ]
                        },
                        {
                            item: "✅ Company Details",
                            details: [
                                "Company Name",
                                "Business Description",
                                "Years in Business",
                                "Contact Person",
                                "Phone & Email"
                            ]
                        },
                        {
                            item: "✅ Product Categories",
                            details: [
                                "Select categories you offer",
                                "List product specialties",
                                "Define delivery zones",
                                "Set standard pricing"
                            ]
                        }
                    ],
                    approval: "Your account will be verified within 24-48 hours"
                },
                hotCategories: {
                    title: "🔥 Hot & In-Demand Categories",
                    demandingNow: demandingCategories,
                    insight: "These categories have the most buyer demand. If you offer these, you'll get more RFQs!",
                    strategy: [
                        "Focus on high-demand categories for maximum inquiries",
                        "Offer competitive pricing in trending categories",
                        "Maintain high stock levels for popular items",
                        "Respond quickly to win deals in competition"
                    ]
                },
                productListing: {
                    title: "📦 How to List Products Effectively",
                    completionTip: "Complete product listings get 5x more inquiries!",
                    steps: [
                        {
                            step: "1. Choose Category Strategically",
                            description: "Select the most relevant category for visibility",
                            substeps: [
                                "Browse all available categories",
                                "Choose primary category for product",
                                "Select specific subcategory",
                                "Check hot categories dashboard (high demand categories)",
                                "If product fits multiple categories, list in highest demand",
                                "Use keywords from category name in product title"
                            ],
                            tips: [
                                "Select most relevant category",
                                "Use specific subcategories",
                                "Check current hot/trending categories"
                            ]
                        },
                        {
                            step: "2. Complete Product Details",
                            description: "Write compelling product information",
                            substeps: [
                                "Enter clear, searchable product name (include grade/type)",
                                "Write 200-300 word detailed description",
                                "Highlight key features and benefits",
                                "List all technical specifications",
                                "Mention material, grade, size, weight",
                                "List all applicable certifications (ISO, BIS, etc.)",
                                "Add delivery time and zones",
                                "Mention warranty/guarantee if applicable"
                            ],
                            example: "Instead of 'Cement', write 'OPC 43 Grade Cement - Premium Quality, BIS Certified'",
                            fields: [
                                "Product Name (clear and searchable)",
                                "Description (highlight key features)",
                                "Specifications (material, grade, size)",
                                "Certifications (ISO, BIS, etc.)"
                            ]
                        },
                        {
                            step: "3. Set Competitive Pricing",
                            description: "Price your products strategically",
                            substeps: [
                                "Research competitor pricing",
                                "Set unit price (per piece/bag/kg)",
                                "Define MOQ - Minimum Order Quantity",
                                "Create tiered bulk pricing (10+ units, 50+ units, 100+ units)",
                                "Add delivery charges if applicable",
                                "Factor in GST/taxes in pricing",
                                "Consider bulk discounts (8-12% for large orders)",
                                "Enable customers to negotiate",
                                "Monitor and adjust pricing monthly"
                            ],
                            tips: [
                                "Competitive pricing = more inquiries",
                                "MOQ (Minimum Order Quantity) affects volume",
                                "Bulk pricing tiers increase average order value",
                                "Transparent pricing = higher conversion"
                            ],
                            example: "Unit: ₹350, MOQ: 100 units, Bulk (500+): ₹340, Bulk (1000+): ₹330"
                        },
                        {
                            step: "4. Upload High-Quality Images",
                            description: "Professional images significantly increase inquiries",
                            substeps: [
                                "Take at least 5 high-quality product images",
                                "Image 1: Product overview/front view",
                                "Image 2: Packaging and quantity format",
                                "Image 3: Size comparison (with reference object)",
                                "Image 4: Quality/certifications/labels",
                                "Image 5: Product in use/application",
                                "Use bright, natural lighting",
                                "Show packaging, labels, and certifications clearly",
                                "Upload images in 2-3 MB size",
                                "Images should be 800x800 px or larger"
                            ],
                            tips: [
                                "High-quality product images (min 3-5 photos)",
                                "Upload certificate images for credibility",
                                "Show package/bulk format clearly",
                                "Professional photos = 3x more inquiries"
                            ],
                            benefit: "Products with 5+ images get 80% more inquiries"
                        },
                        {
                            step: "5. Stock Management",
                            description: "Keep real-time inventory updated",
                            substeps: [
                                "Enter current available stock quantity",
                                "Update stock after every order",
                                "Or use bulk import/CSV upload feature",
                                "Set automatic low-stock alerts",
                                "Enable/disable products when out of stock",
                                "Track inventory by category",
                                "Monitor sales velocity",
                                "Plan replenishment based on sales trends",
                                "Export inventory reports monthly"
                            ],
                            features: [
                                "Set current stock quantity",
                                "Update stock regularly for accuracy",
                                "Enable/disable products as needed"
                            ]
                        }
                    ],
                    bestPractices: [
                        "✅ Use keywords in product names (e.g., 'OPC 43' not just 'Cement')",
                        "✅ Write detailed descriptions with specifications",
                        "✅ Add ALL certifications and test reports",
                        "✅ Use clear, bright, professional images (min 5)",
                        "✅ Keep prices competitive and regularly updated",
                        "✅ Maintain 99%+ stock accuracy",
                        "✅ Update inventory daily",
                        "✅ Respond to inquiries within 2 hours"
                    ]
                },
                rfqResponse: {
                    title: "📋 Responding to RFQs - Win More Orders",
                    quickWinTip: "Respond within 2 hours to WIN 45% more RFQs!",
                    process: [
                        {
                            stage: "1. Receive RFQ Notification",
                            description: "Get instant notification when buyer submits RFQ",
                            action: "View RFQ in Your Dashboard",
                            substeps: [
                                "Enable RFQ push notifications",
                                "Check dashboard for new RFQs",
                                "Read buyer requirements carefully",
                                "Review quantity, specifications, location",
                                "Check delivery timeline",
                                "Note buyer budget if mentioned"
                            ]
                        },
                        {
                            stage: "2. Review & Qualify Request",
                            description: "Analyze if you can fulfill the order",
                            substeps: [
                                "Check if you have required products in catalog",
                                "Verify current stock levels",
                                "Confirm specifications match your product",
                                "Check if quantity fits your MOQ",
                                "Verify you can deliver to that location",
                                "Confirm delivery timeline is achievable",
                                "Check if pricing is profitable"
                            ],
                            action: "Verify if you can fulfill"
                        },
                        {
                            stage: "3. Prepare Competitive Quote",
                            description: "Calculate cost and create compelling quote",
                            substeps: [
                                "Get cost from your supplier/inventory",
                                "Add profit margin (15-25% typical)",
                                "Calculate total for buyer's exact quantity",
                                "Add delivery charges (research to be competitive)",
                                "Calculate GST/taxes",
                                "Create tiered pricing if bulk order",
                                "Add payment terms (7/15/30 days)",
                                "Include delivery timeline (e.g., 3-5 days)",
                                "Prepare detailed quote breakdown"
                            ],
                            details: [
                                "Unit price",
                                "Total quantity cost",
                                "Delivery charges",
                                "GST/Taxes",
                                "Final quote",
                                "Payment terms"
                            ],
                            formula: "(Unit Cost × Quantity) + Delivery + GST = Final Quote"
                        },
                        {
                            stage: "4. Submit Quote Quickly",
                            description: "Send competitive quote to buyer ASAP",
                            substeps: [
                                "Submit quote before deadline",
                                "Include personalized message",
                                "Highlight certifications/quality",
                                "Mention fast delivery capability",
                                "Offer flexibility on terms",
                                "Include contact details for clarification",
                                "Provide company info for credibility"
                            ],
                            tip: "Quick responses (within 2 hours) win more deals!",
                            winningTip: "Be in TOP 3 responses to maximize win rate"
                        },
                        {
                            stage: "5. Negotiate & Close",
                            description: "Communicate with buyer and finalize deal",
                            substeps: [
                                "Wait for buyer feedback",
                                "Answer all clarification questions",
                                "Use WhatsApp for direct communication",
                                "Be ready to adjust price slightly",
                                "Offer flexibility on delivery dates",
                                "Discuss payment terms",
                                "Provide quality assurances",
                                "Send revised quote if needed",
                                "Confirm final details"
                            ],
                            tactics: [
                                "Be responsive and professional",
                                "Answer questions honestly",
                                "Offer solutions, not just quotes",
                                "Build trust with transparent communication"
                            ],
                            action: "Close the deal"
                        },
                        {
                            stage: "6. Confirm & Fulfill Order",
                            description: "Once order confirmed, start fulfillment",
                            substeps: [
                                "Get order confirmation from buyer",
                                "Create invoice with all details",
                                "Collect payment (if required upfront)",
                                "Verify payment received",
                                "Pick and pack order",
                                "Generate shipping label",
                                "Update tracking information",
                                "Send delivery confirmation to buyer",
                                "Follow up for feedback after delivery"
                            ],
                            next: "Manage order in dashboard"
                        }
                    ],
                    winningTips: [
                        "🌟 Respond within 2 hours (beats 95% of competitors)",
                        "🌟 Offer competitive pricing (research market rates)",
                        "🌟 Provide clear specifications and details",
                        "🌟 Offer flexible payment terms (7/15/30 days)",
                        "🌟 Guarantee on-time delivery",
                        "🌟 Provide quality certifications/documentation",
                        "🌟 Personalize your message",
                        "🌟 Be professional and responsive"
                    ],
                    conversionTips: [
                        "45% more conversions with 2-hour response time",
                        "Quote in top 3 responses = 3x higher win rate",
                        "Competitive pricing = 30% better conversion",
                        "Complete product info = 25% better conversion",
                        "Fast delivery offer = 15% better conversion"
                    ]
                },
                leadGeneration: {
                    title: "📈 Lead Generation & Sales",
                    strategies: [
                        {
                            strategy: "Respond to RFQs Quickly",
                            benefit: "45% more conversions with 2-hour response",
                            action: "Enable push notifications for RFQs"
                        },
                        {
                            strategy: "Maintain High Stock",
                            benefit: "More visibility, more inquiries",
                            action: "Update inventory daily"
                        },
                        {
                            strategy: "Competitive Pricing",
                            benefit: "Attract price-conscious buyers",
                            action: "Monitor competitor pricing"
                        },
                        {
                            strategy: "Quality Certifications",
                            benefit: "Build trust and credibility",
                            action: "Upload all certifications"
                        },
                        {
                            strategy: "WhatsApp Engagement",
                            benefit: "Direct relationship with buyers",
                            action: "Enable WhatsApp notifications"
                        }
                    ],
                    analytics: "Track your conversion rate in the Analytics Dashboard"
                },
                whatsapp: {
                    title: "📱 WhatsApp Integration",
                    features: [
                        "Direct WhatsApp messages from buyers",
                        "Send product specifications easily",
                        "Share images and documents",
                        "Real-time order updates",
                        "Automatic delivery tracking links"
                    ],
                    howToSetup: [
                        "1. Add WhatsApp number in supplier profile",
                        "2. Verify phone number",
                        "3. Enable WhatsApp notifications",
                        "4. Start receiving buyer messages"
                    ]
                },
                orders: {
                    title: "🎁 Order Management",
                    process: [
                        "Receive Order → Prepare Shipment → Ship Order → Track Delivery → Get Feedback",
                        "",
                        "Tools: Dashboard tracks all orders, Status updates, Invoice generation"
                    ]
                },
                automation: {
                    title: "⚙️ Automation Tools",
                    features: [
                        {
                            name: "Auto-Reply",
                            description: "Automatic responses to common questions",
                            benefit: "Never miss a buyer inquiry"
                        },
                        {
                            name: "Bulk Listing",
                            description: "Upload multiple products at once",
                            benefit: "Save time, manage inventory faster"
                        },
                        {
                            name: "Price Updates",
                            description: "Update prices in bulk across products",
                            benefit: "Keep competitive pricing updated"
                        },
                        {
                            name: "Scheduled Replies",
                            description: "Auto-respond during off-hours",
                            benefit: "24/7 customer engagement"
                        }
                    ]
                },
                payment: {
                    title: "💳 Payment & Settlements",
                    info: [
                        "Receive payments directly to your bank account",
                        "Multiple payment options for buyers",
                        "Instant settlement (within 24 hours)",
                        "Transparent fee structure",
                        "Payment tracking dashboard"
                    ]
                },
                support: {
                    title: "🆘 Support & Resources",
                    resources: [
                        "24/7 Supplier Support",
                        "Email & Chat Support",
                        "Video Tutorials",
                        "Product Listing Guide",
                        "Pricing Strategy Guide",
                        "Best Practices Document"
                    ]
                }
            }
        };
        res.json({
            success: true,
            data: supplierGuide
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch supplier guide',
            error: error.message
        });
    }
});
// Get product-specific guide
router.get('/guide/product/:category', async (req, res) => {
    try {
        const { category } = req.params;
        // Get products in category
        const products = await Product_1.default.find({ category, status: 'active' })
            .populate('supplierId', 'companyName email phone businessType yearsInBusiness')
            .select('name price stock specifications images')
            .limit(20);
        // Get RFQs for this category
        const rfqs = await RFQ_1.default.find({ productCategory: category })
            .select('quantity status createdAt')
            .limit(30);
        // Get suppliers offering this category
        const suppliers = await Supplier_1.default.find({
            status: 'approved',
            productsOffered: { $regex: category, $options: 'i' }
        })
            .select('companyName email phone businessType yearsInBusiness productsOffered')
            .limit(10);
        const demandLevel = rfqs.length > 30 ? 'Very High' : rfqs.length > 20 ? 'High' : 'Medium';
        const avgPrice = products.length > 0
            ? Math.round(products.reduce((sum, p) => sum + (p.price?.amount || 0), 0) / products.length)
            : 0;
        const productGuide = {
            title: `📦 ${category} - Complete Guide`,
            category: category,
            marketAnalysis: {
                demandLevel: demandLevel,
                buyerInquiries: rfqs.length,
                availableSuppliers: suppliers.length,
                availableProducts: products.length,
                priceRange: {
                    min: products.length > 0 ? Math.min(...products.map(p => p.price?.amount || 0)) : 0,
                    max: products.length > 0 ? Math.max(...products.map(p => p.price?.amount || 0)) : 0,
                    average: avgPrice
                }
            },
            buyerTips: [
                `This is a ${demandLevel} demand category with ${rfqs.length} recent buyer inquiries`,
                `Average price in market: ₹${avgPrice}`,
                `${suppliers.length} verified suppliers available`,
                `Compare quotes from multiple suppliers to get best price`,
                `Check supplier ratings and certifications before ordering`,
                `Negotiate bulk discounts for large orders`
            ],
            supplierTips: [
                `High demand (${rfqs.length} inquiries) means good sales potential!`,
                `Price competitively - average market rate is ₹${avgPrice}`,
                `Respond quickly to RFQs in this category`,
                `Get quality certifications to stand out`,
                `Maintain good stock levels to capture more orders`,
                `Build strong buyer relationships through WhatsApp`
            ],
            topSuppliers: suppliers.slice(0, 5).map(s => ({
                name: s.companyName,
                email: s.email,
                phone: s.phone,
                experience: `${s.yearsInBusiness} years`,
                productsInCategory: s.productsOffered.filter(p => p.toLowerCase().includes(category.toLowerCase()))
            })),
            sampleProducts: products.slice(0, 5).map(p => ({
                name: p.name,
                supplier: typeof p.supplierId === 'object' ? p.supplierId.companyName : 'Unknown',
                price: p.price?.amount,
                moq: p.stock?.minimumOrder,
                inStock: p.stock?.available,
                specs: p.specifications
            }))
        };
        res.json({
            success: true,
            data: productGuide
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch product guide',
            error: error.message
        });
    }
});
// Get RFQ guide
router.get('/guide/rfq', async (req, res) => {
    try {
        const rfqGuide = {
            title: "📋 RFQ (Request for Quotation) Complete Guide",
            whatIsRFQ: "Request for Quotation is the fastest way to get competitive quotes from multiple suppliers at once",
            sections: {
                forBuyers: {
                    title: "For Buyers: How to Create Winning RFQs",
                    steps: [
                        {
                            step: 1,
                            title: "Access RFQ Section",
                            description: "Go to Dashboard → Create New RFQ",
                            details: "Takes 5 minutes to complete"
                        },
                        {
                            step: 2,
                            title: "Select Product Category",
                            description: "Choose what material you need",
                            examples: "Cement, Steel, TMT Bars, Bricks, Sand, etc.",
                            tip: "Be specific - this helps suppliers quote accurately"
                        },
                        {
                            step: 3,
                            title: "Enter Quantity & Details",
                            description: "Specify how much you need and when",
                            fields: [
                                "Quantity (in units/bags/tons)",
                                "Desired delivery date",
                                "Delivery location",
                                "Special requirements/specifications"
                            ]
                        },
                        {
                            step: 4,
                            title: "Add Specifications",
                            description: "Quality, grade, certifications needed",
                            example: "OPC 43 Grade, ISO Certified, GST Verified",
                            benefit: "Clearer specs = better quotes"
                        },
                        {
                            step: 5,
                            title: "Set Budget (Optional)",
                            description: "Let suppliers know your budget range",
                            benefit: "Get quotes within your price range"
                        },
                        {
                            step: 6,
                            title: "Submit RFQ",
                            description: "Send to suppliers for quoting",
                            result: "Get 3-5 quotes within 2 hours"
                        }
                    ],
                    benefits: [
                        "✅ Compare prices from multiple suppliers",
                        "✅ Save time - suppliers come to you",
                        "✅ Get competitive pricing",
                        "✅ Transparent pricing with all costs",
                        "✅ Negotiate directly with suppliers",
                        "✅ Build long-term relationships"
                    ],
                    bestPractices: [
                        "Be specific about quantity and delivery date",
                        "Include all quality requirements",
                        "Set realistic budget expectations",
                        "Respond to supplier questions promptly",
                        "Negotiate payment terms",
                        "Ask about bulk discounts"
                    ]
                },
                forSuppliers: {
                    title: "For Suppliers: How to Win RFQs",
                    process: [
                        {
                            title: "Get RFQ Notification",
                            description: "Receive alert when buyer creates RFQ matching your category",
                            action: "Check dashboard immediately"
                        },
                        {
                            title: "Review RFQ Details",
                            description: "Check quantity, location, timeline, specs",
                            evaluate: "Can you fulfill this order?"
                        },
                        {
                            title: "Prepare Competitive Quote",
                            description: "Calculate accurate pricing with delivery",
                            include: [
                                "Unit price",
                                "Total cost",
                                "Delivery charges",
                                "Taxes/GST",
                                "Payment terms",
                                "Delivery timeline"
                            ]
                        },
                        {
                            title: "Submit Quote Quickly",
                            description: "Fast responses win more deals",
                            timing: "Submit within 2 hours for best chance",
                            tip: "Suppliers responding within 2 hours win 45% more deals"
                        },
                        {
                            title: "Engage with Buyer",
                            description: "Use WhatsApp or chat to discuss",
                            discuss: [
                                "Custom requirements",
                                "Bulk discounts",
                                "Payment options",
                                "Delivery flexibility"
                            ]
                        },
                        {
                            title: "Win the Deal",
                            description: "Close with buyer and start fulfillment",
                            next: "Process order and ship"
                        }
                    ],
                    winningStrategies: [
                        "🎯 Speed: Respond within 2 hours",
                        "🎯 Price: Be competitive but profitable",
                        "🎯 Details: Include all information",
                        "🎯 Quality: Highlight certifications",
                        "🎯 Terms: Offer flexible payment",
                        "🎯 Service: Promise reliable delivery"
                    ]
                }
            },
            whatsappIntegration: {
                title: "💬 WhatsApp Integration in RFQ",
                features: [
                    "Direct WhatsApp chat with buyer after quoting",
                    "Share specifications and images easily",
                    "Quick negotiations without delays",
                    "Payment confirmations via WhatsApp",
                    "Delivery updates and tracking"
                ]
            }
        };
        res.json({
            success: true,
            data: rfqGuide
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch RFQ guide',
            error: error.message
        });
    }
});
// Get automation guide
router.get('/guide/automation', async (req, res) => {
    try {
        const automationGuide = {
            title: "⚙️ Business Automation Suite Guide",
            description: "Use Milo's automation tools to grow your business 10x faster",
            sections: {
                autoReply: {
                    title: "💬 Auto-Reply System",
                    description: "Automatically respond to buyer inquiries",
                    features: [
                        {
                            feature: "Instant Responses",
                            benefit: "Reply to buyers even when you're offline",
                            how: "Set up templates for common questions"
                        },
                        {
                            feature: "Multiple Templates",
                            benefit: "Different responses for different inquiry types",
                            types: [
                                "General Inquiry",
                                "Price Quote Request",
                                "Product Availability",
                                "Delivery Questions",
                                "Bulk Order Inquiry"
                            ]
                        },
                        {
                            feature: "Customizable Messages",
                            benefit: "Personalize responses for your business",
                            example: "Hi {buyer}, thank you for interest in {product}..."
                        }
                    ],
                    setup: [
                        "1. Go to Automation → Auto-Reply",
                        "2. Create templates for common questions",
                        "3. Enable auto-reply mode",
                        "4. Monitor and refine responses"
                    ],
                    benefit: "Respond 100x faster than manual, never miss a lead!"
                },
                leadScoring: {
                    title: "🎯 Lead Scoring System",
                    description: "Identify high-quality leads automatically",
                    features: [
                        {
                            metric: "Buyer Profile Score",
                            description: "Quality assessment of buyer",
                            factors: ["Years in business", "Order history", "Payment reliability"]
                        },
                        {
                            metric: "Order Potential",
                            description: "Likelihood of large order",
                            factors: ["Budget mentioned", "Bulk quantity", "Regular buyer"]
                        },
                        {
                            metric: "Urgency Score",
                            description: "How soon buyer needs product",
                            factors: ["Delivery timeline", "Quick inquiry", "Rush indicators"]
                        }
                    ],
                    benefit: "Focus on high-value leads, close more deals!"
                },
                orderAutomation: {
                    title: "🎁 Order Automation",
                    description: "Automate order processing and fulfillment",
                    features: [
                        {
                            feature: "Instant Order Confirmation",
                            description: "Auto-send confirmation when buyer orders",
                            includes: "Order details, invoice, delivery timeline"
                        },
                        {
                            feature: "Delivery Tracking",
                            description: "Auto-send tracking updates to buyer",
                            updates: "Shipment confirmed → In transit → Out for delivery → Delivered"
                        },
                        {
                            feature: "Invoice Generation",
                            description: "Automatic invoice creation and sending",
                            formats: "PDF, Email, WhatsApp, Print"
                        },
                        {
                            feature: "Payment Reminders",
                            description: "Auto-remind for pending payments",
                            schedule: "On due date, 2 days before, 1 day after"
                        }
                    ]
                },
                bulkOperations: {
                    title: "📦 Bulk Operations",
                    features: [
                        {
                            operation: "Bulk Product Upload",
                            description: "Upload multiple products at once",
                            benefit: "Save hours compared to manual entry",
                            format: "CSV, Excel"
                        },
                        {
                            operation: "Bulk Price Update",
                            description: "Update prices across multiple products",
                            benefit: "Keep competitive pricing without manual updates"
                        },
                        {
                            operation: "Bulk Stock Update",
                            description: "Update inventory for multiple products",
                            benefit: "Real-time stock management"
                        },
                        {
                            operation: "Bulk RFQ Response",
                            description: "Quote on multiple RFQs quickly",
                            benefit: "Close more deals in less time"
                        }
                    ]
                }
            }
        };
        res.json({
            success: true,
            data: automationGuide
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch automation guide',
            error: error.message
        });
    }
});
// Get WhatsApp guide
router.get('/guide/whatsapp', async (req, res) => {
    try {
        const whatsappGuide = {
            title: "📱 WhatsApp Integration Guide",
            description: "Use WhatsApp to connect directly with buyers/suppliers",
            sections: {
                setup: {
                    title: "🔧 Setting Up WhatsApp",
                    steps: [
                        {
                            step: 1,
                            title: "Add WhatsApp Number",
                            description: "Go to Profile → Add WhatsApp",
                            requirement: "Your active WhatsApp business number"
                        },
                        {
                            step: 2,
                            title: "Verify Number",
                            description: "Confirm OTP sent to WhatsApp",
                            time: "Takes 2 minutes"
                        },
                        {
                            step: 3,
                            title: "Enable Notifications",
                            description: "Allow WhatsApp notifications",
                            benefit: "Never miss a message"
                        },
                        {
                            step: 4,
                            title: "Share Profile Link",
                            description: "Share WhatsApp link with buyers/suppliers",
                            location: "On your product listing, RFQ response, profile"
                        }
                    ]
                },
                buyerGuide: {
                    title: "For Buyers",
                    usage: [
                        "Send RFQ details directly to suppliers",
                        "Negotiate pricing on WhatsApp",
                        "Ask questions about products",
                        "Get real-time delivery updates",
                        "Share payment proof"
                    ],
                    benefits: [
                        "✅ Quick communication with suppliers",
                        "✅ Secure messaging",
                        "✅ Share images and documents easily",
                        "✅ Get instant responses",
                        "✅ Build business relationships"
                    ]
                },
                supplierGuide: {
                    title: "For Suppliers",
                    usage: [
                        "Receive direct messages from buyers",
                        "Share product specifications",
                        "Send invoice and payment details",
                        "Provide delivery tracking",
                        "Offer exclusive deals"
                    ],
                    benefits: [
                        "✅ Direct buyer relationships",
                        "✅ Faster deal closure",
                        "✅ Better customer service",
                        "✅ More repeat orders",
                        "✅ Build brand loyalty"
                    ]
                },
                bestPractices: {
                    title: "Best Practices",
                    tips: [
                        {
                            tip: "Respond Quickly",
                            description: "Reply within 2 hours for best results",
                            impact: "45% higher conversion rates"
                        },
                        {
                            tip: "Be Professional",
                            description: "Use clear, concise messages",
                            example: "Hello [Name], Regarding your inquiry about [Product]..."
                        },
                        {
                            tip: "Use Templates",
                            description: "Create message templates for common queries",
                            benefit: "Save time, maintain quality"
                        },
                        {
                            tip: "Share Information",
                            description: "Send product specs, pricing, delivery info easily",
                            formats: "Text, images, documents"
                        },
                        {
                            tip: "Confirm Orders",
                            description: "Send order confirmation with all details",
                            includes: "Product, quantity, price, delivery date"
                        },
                        {
                            tip: "Provide Updates",
                            description: "Keep buyer informed about order status",
                            updates: ["Order confirmed", "Packed", "Shipped", "Delivered"]
                        }
                    ]
                }
            }
        };
        res.json({
            success: true,
            data: whatsappGuide
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch WhatsApp guide',
            error: error.message
        });
    }
});
// Get directions/navigation guide
router.get('/guide/navigation', async (req, res) => {
    try {
        const navigationGuide = {
            title: "🗺️ Platform Navigation Guide",
            description: "Learn how to navigate the RitzYard platform",
            sections: {
                mainMenu: {
                    title: "📍 Main Navigation",
                    forBuyers: {
                        title: "Buyer Dashboard",
                        menu: [
                            {
                                section: "Home",
                                description: "Dashboard overview with quick stats",
                                features: ["Active RFQs", "Received Quotes", "Recent Orders"]
                            },
                            {
                                section: "Browse Products",
                                description: "Browse all products by category",
                                features: ["Search", "Filter by price/supplier", "View details"]
                            },
                            {
                                section: "Create RFQ",
                                description: "Submit new Request for Quotation",
                                features: ["Multi-category RFQ", "Bulk orders", "Special requests"]
                            },
                            {
                                section: "My RFQs",
                                description: "Track all your RFQs",
                                features: ["View status", "See quotes", "Receive notifications"]
                            },
                            {
                                section: "Quotes Received",
                                description: "Compare quotes from suppliers",
                                features: ["Price comparison", "Download quotes", "Share with team"]
                            },
                            {
                                section: "Orders",
                                description: "Track your orders",
                                features: ["Order status", "Tracking", "Invoice download"]
                            },
                            {
                                section: "Sellers",
                                description: "Find and follow suppliers",
                                features: ["Supplier profiles", "Reviews", "Direct messaging"]
                            },
                            {
                                section: "Support",
                                description: "Get help anytime",
                                features: ["Chat support", "FAQs", "Contact"]
                            }
                        ]
                    },
                    forSuppliers: {
                        title: "Supplier Dashboard",
                        menu: [
                            {
                                section: "Dashboard",
                                description: "Your business overview",
                                stats: ["Active Products", "RFQs Received", "Orders", "Revenue"]
                            },
                            {
                                section: "Products",
                                description: "Manage your product catalog",
                                actions: ["Add product", "Edit", "Delete", "Update stock", "Bulk upload"]
                            },
                            {
                                section: "RFQs",
                                description: "See buyer requests",
                                actions: ["View RFQ details", "Submit quote", "Track response"]
                            },
                            {
                                section: "Orders",
                                description: "Manage your orders",
                                actions: ["View orders", "Update status", "Send tracking", "Mark delivered"]
                            },
                            {
                                section: "Automation",
                                description: "Use automation tools",
                                features: ["Auto-reply", "Lead scoring", "Order automation", "Bulk operations"]
                            },
                            {
                                section: "Analytics",
                                description: "Track performance",
                                metrics: ["Views", "Clicks", "Conversion rate", "Revenue"]
                            },
                            {
                                section: "Account",
                                description: "Manage your account",
                                settings: ["Profile", "Bank details", "WhatsApp", "Notifications"]
                            },
                            {
                                section: "Support",
                                description: "Get help",
                                resources: ["Chat support", "Guides", "Video tutorials"]
                            }
                        ]
                    }
                },
                quickLinks: {
                    title: "⚡ Quick Links",
                    links: [
                        { name: "Create RFQ", url: "/dashboard/rfq/create", time: "5 min" },
                        { name: "View Products", url: "/products", time: "Instant" },
                        { name: "My Account", url: "/account", time: "1 min" },
                        { name: "Support Chat", url: "/support", time: "Instant" },
                        { name: "Search Suppliers", url: "/suppliers", time: "Instant" }
                    ]
                },
                keyPages: {
                    title: "📄 Key Pages Explained",
                    pages: [
                        {
                            page: "Dashboard",
                            what: "Your personalized home page",
                            shows: ["Quick stats", "Recent activity", "Pending actions"]
                        },
                        {
                            page: "Product Listing",
                            what: "All available products",
                            features: ["Search", "Filter", "Compare", "View supplier info"]
                        },
                        {
                            page: "RFQ Management",
                            what: "Create and track RFQs",
                            actions: ["Create", "View", "Respond", "Negotiate"]
                        },
                        {
                            page: "Orders",
                            what: "Track all orders",
                            info: ["Status", "Tracking", "Invoice", "Feedback"]
                        },
                        {
                            page: "Analytics",
                            what: "Track performance metrics",
                            metrics: ["Sales", "Conversion", "Popular products", "Growth"]
                        }
                    ]
                }
            }
        };
        res.json({
            success: true,
            data: navigationGuide
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch navigation guide',
            error: error.message
        });
    }
});
// Get complete platform guide
router.get('/guide/complete', async (req, res) => {
    try {
        // Fetch all guides at once
        const allGuides = {
            title: "🚀 Complete RitzYard Platform Guide",
            description: "Everything you need to know to succeed on RitzYard",
            lastUpdated: new Date(),
            guides: [
                { id: "buyer", title: "📦 Buyer's Guide", path: "/guide/buyer" },
                { id: "supplier", title: "🏭 Supplier's Guide", path: "/guide/supplier" },
                { id: "rfq", title: "📋 RFQ Guide", path: "/guide/rfq" },
                { id: "automation", title: "⚙️ Automation Guide", path: "/guide/automation" },
                { id: "whatsapp", title: "📱 WhatsApp Guide", path: "/guide/whatsapp" },
                { id: "navigation", title: "🗺️ Navigation Guide", path: "/guide/navigation" },
                { id: "product-{category}", title: "📦 Product Guides (by category)", path: "/guide/product/:category" }
            ],
            quickStart: [
                {
                    forBuyers: [
                        "1. Sign up or login",
                        "2. Browse products or create RFQ",
                        "3. Review quotes from suppliers",
                        "4. Negotiate and place order",
                        "5. Track delivery"
                    ]
                },
                {
                    forSuppliers: [
                        "1. Register and complete onboarding",
                        "2. Upload your products",
                        "3. Receive RFQ notifications",
                        "4. Submit competitive quotes",
                        "5. Close deals and grow business"
                    ]
                }
            ]
        };
        res.json({
            success: true,
            data: allGuides
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch complete guide',
            error: error.message
        });
    }
});
exports.default = router;
