import mongoose from 'mongoose';
import { connectDB } from './config/database';
import AutoReply from './models/AutoReply';
import Lead from './models/Lead';
import OrderAutomation from './models/OrderAutomation';
import Analytics from './models/Analytics';

const testModels = async () => {
  try {
    // Connect to database
    await connectDB();
    
    // Create a test supplier ID (this would normally come from authentication)
    const testSupplierId = new mongoose.Types.ObjectId();
    
    // Test AutoReply model
    console.log('Testing AutoReply model...');
    const autoReply = new AutoReply({
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
    const lead = new Lead({
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
    const order = new OrderAutomation({
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
    const analytics = new Analytics({
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
    await mongoose.connection.close();
  } catch (error) {
    console.error('❌ Error testing models:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
};

testModels();