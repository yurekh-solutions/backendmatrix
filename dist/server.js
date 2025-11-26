"use strict";
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
const ai_1 = __importDefault(require("./routes/ai"));
const automation_1 = __importDefault(require("./routes/automation"));
const adminAutomation_1 = __importDefault(require("./routes/adminAutomation"));
const milo_1 = __importDefault(require("./routes/milo"));
// Load environment variables
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
// Middleware
// CORS configuration with file upload support
// Force redeploy to apply CORS changes
app.use((0, cors_1.default)({
    origin: true, // Allow all origins temporarily for debugging
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'X-API-Key'],
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
// Explicitly handle preflight requests for all routes
app.options('*', (req, res) => {
    res.header('Access-Control-Allow-Origin', 'https://supplierportal-mu.vercel.app');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, X-API-Key');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.sendStatus(200);
});
app.use('/api/auth', auth_1.default);
app.use('/api/supplier', supplier_1.default);
app.use('/api/admin/automation', adminAutomation_1.default);
app.use('/api/admin', admin_1.default);
app.use('/api/products', product_1.default);
app.use('/api/rfqs', rfq_1.default);
app.use('/api/tracking', tracking_1.default);
app.use('/api/categories', category_1.default);
app.use('/api/ai', ai_1.default);
app.use('/api/automation', automation_1.default);
app.use('/api/milo', milo_1.default);
// Health check
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'Supplier Onboarding API is running',
        timestamp: new Date().toISOString()
    });
});
// 404 handler
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
