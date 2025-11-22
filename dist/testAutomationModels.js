"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const database_1 = require("./config/database");
const AutoReply_1 = __importDefault(require("./models/AutoReply"));
const Lead_1 = __importDefault(require("./models/Lead"));
const OrderAutomation_1 = __importDefault(require("./models/OrderAutomation"));
const Analytics_1 = __importDefault(require("./models/Analytics"));
const testModels = async () => {
    try {
        // Connect to database
        await (0, database_1.connectDB)();
        // Create a test supplier ID (this would normally come from authentication)
        const testSupplierId = new mongoose_1.default.Types.ObjectId();
        // Test AutoReply model
        console.log('Testing AutoReply model...');
        const autoReply = new AutoReply_1.default({
            supplierId: testSupplierId,
            messageType: 'general-inquiry',
            responseText: 'Thank you for your interest in our products!',
            triggerKeywords: ['info', 'information', 'product'],
            isActive: true
        });
        await autoReply.save();
        console.log('✓ AutoReply created successfully');
        // Test Lead model
        console.log('Testing Lead model...');
        const lead = new Lead_1.default({
            supplierId: testSupplierId,
            name: 'John Doe',
            email: 'john@example.com',
            phone: '+1234567890',
            company: 'ABC Company',
            message: 'I am interested in your steel products',
            source: 'website',
            score: 75,
            status: 'new',
            tags: ['steel', 'construction']
        });
        await lead.save();
        console.log('✓ Lead created successfully');
        // Test OrderAutomation model
        console.log('Testing OrderAutomation model...');
        const order = new OrderAutomation_1.default({
            supplierId: testSupplierId,
            orderId: 'ORD-001',
            customerName: 'Jane Smith',
            customerEmail: 'jane@example.com',
            products: [
                {
                    name: 'MS Round Bars',
                    quantity: 100,
                    price: 5000
                }
            ],
            totalAmount: 5000,
            status: 'pending',
            automationSteps: [
                {
                    step: 'order-confirmation',
                    status: 'completed',
                    timestamp: new Date()
                }
            ],
            notifications: [
                {
                    type: 'email',
                    sent: true,
                    timestamp: new Date(),
                    recipient: 'jane@example.com'
                }
            ]
        });
        await order.save();
        console.log('✓ OrderAutomation created successfully');
        // Test Analytics model
        console.log('Testing Analytics model...');
        const analytics = new Analytics_1.default({
            supplierId: testSupplierId,
            metricType: 'auto-reply',
            value: 1,
            category: 'engagement',
            metadata: {
                action: 'created',
                messageType: 'general-inquiry'
            },
            timestamp: new Date()
        });
        await analytics.save();
        console.log('✓ Analytics created successfully');
        console.log('\n🎉 All models tested successfully!');
        console.log('✅ AutoReply, Lead, OrderAutomation, and Analytics models are working correctly with MongoDB');
        // Close connection
        await mongoose_1.default.connection.close();
    }
    catch (error) {
        console.error('❌ Error testing models:', error);
        await mongoose_1.default.connection.close();
        process.exit(1);
    }
};
testModels();
