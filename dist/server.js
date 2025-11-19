"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const database_1 = require("./config/database");
const authController_1 = require("./controllers/authController");
// Routes
const auth_1 = __importDefault(require("./routes/auth"));
const supplier_1 = __importDefault(require("./routes/supplier"));
const admin_1 = __importDefault(require("./routes/admin"));
const product_1 = __importDefault(require("./routes/product"));
const rfq_1 = __importDefault(require("./routes/rfq"));
const tracking_1 = __importDefault(require("./routes/tracking"));
const category_1 = __importDefault(require("./routes/category"));
const aiInsights_1 = __importDefault(require("./routes/aiInsights"));
const productEnrichment_1 = __importDefault(require("./routes/productEnrichment"));
const toolUsage_1 = __importDefault(require("./routes/toolUsage"));
const toolFeatures_1 = __importDefault(require("./routes/toolFeatures"));
const autoReply_1 = __importDefault(require("./routes/autoReply"));
const aiAutoReply_1 = __importDefault(require("./routes/aiAutoReply"));
// Load environment variables
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
// Middleware
// CORS configuration with file upload support
app.use((0, cors_1.default)({
    origin: [
        'http://localhost:8080',
        'http://localhost:8081',
        'http://localhost:3002',
        'http://localhost:5173',
        'http://localhost:5174',
        'http://localhost:5175',
        'https://backendmatrix.onrender.com',
        'https://admin-panel-ritzyard.vercel.app',
        'https://supplierportal.vercel.app',
        'https://supplierportal-mu.vercel.app',
        'https://supplierportal-yurekh-solutions.vercel.app'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    exposedHeaders: ['Content-Disposition', 'Content-Type']
}));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// Serve uploaded files statically with proper MIME types
app.use('/uploads', express_1.default.static(path_1.default.join(__dirname, '../uploads'), {
    setHeaders: (res, filePath) => {
        // Set proper Content-Type based on file extension
        const ext = path_1.default.extname(filePath).toLowerCase();
        if (ext === '.pdf') {
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', 'inline'); // Display in browser instead of download
        }
        else if (ext === '.jpg' || ext === '.jpeg') {
            res.setHeader('Content-Type', 'image/jpeg');
        }
        else if (ext === '.png') {
            res.setHeader('Content-Type', 'image/png');
        }
        else if (ext === '.doc') {
            res.setHeader('Content-Type', 'application/msword');
        }
        else if (ext === '.docx') {
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        }
    }
}));
// Routes
app.use('/api/auth', auth_1.default);
app.use('/api/supplier', supplier_1.default);
app.use('/api/admin', admin_1.default);
app.use('/api/products', product_1.default);
app.use('/api/rfqs', rfq_1.default);
app.use('/api/tracking', tracking_1.default);
app.use('/api/categories', category_1.default);
app.use('/api/ai', aiInsights_1.default);
app.use('/api/enrich', productEnrichment_1.default);
app.use('/api/tools', toolUsage_1.default);
app.use('/api/tool-features', toolFeatures_1.default);
app.use('/api/auto-replies', autoReply_1.default);
app.use('/api/ai', aiAutoReply_1.default);
// Health check
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'Supplier Onboarding API is running',
        timestamp: new Date().toISOString()
    });
});
// Test email endpoint (for debugging)
app.post('/api/test-email', async (req, res) => {
    try {
        const { email = 'test@example.com' } = req.body;
        const { sendEmail } = await Promise.resolve().then(() => __importStar(require('./config/email')));
        const testHtml = `
      <h2>Test Email from RitzYard</h2>
      <p>This is a test email to verify the email system is working correctly.</p>
      <p>If you received this, email notifications are configured properly!</p>
      <p>Timestamp: ${new Date().toISOString()}</p>
    `;
        const result = await sendEmail(email, 'RitzYard Test Email', testHtml);
        res.json({
            success: result,
            message: result ? 'Test email sent successfully' : 'Failed to send test email - check logs and .env configuration',
            emailCredentialsConfigured: !!(process.env.EMAIL_USER && process.env.EMAIL_PASSWORD)
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
            emailCredentialsConfigured: !!(process.env.EMAIL_USER && process.env.EMAIL_PASSWORD)
        });
    }
});
// ... existing code ...
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found'
    });
});
// Error handler
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal server error'
    });
});
// Start server
const startServer = async () => {
    try {
        // Connect to database
        await (0, database_1.connectDB)();
        // Create default admin
        await (0, authController_1.createDefaultAdmin)();
        app.listen(PORT, () => {
            console.log(`
╔════════════════════════════════════════════╗
║   🚀 Supplier Onboarding API Server       ║
║   Port: ${PORT}                            ║
║   Environment: ${process.env.NODE_ENV || 'development'}              ║
║   Database: Connected                      ║
╚════════════════════════════════════════════╝
      `);
        });
    }
    catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};
startServer();
exports.default = app;
