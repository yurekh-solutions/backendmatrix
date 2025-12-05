const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/supplier-onboarding';

console.log('🔍 Checking Material Inquiry Storage...\n');
console.log('MongoDB URI:', MONGODB_URI);

mongoose.connect(MONGODB_URI)
  .then(async () => {
    console.log('✅ MongoDB Connected\n');
    
    // Check materialinquiries collection
    const MaterialInquiry = mongoose.model('MaterialInquiry', new mongoose.Schema({}, {strict: false}), 'materialinquiries');
    
    const count = await MaterialInquiry.countDocuments();
    console.log('📊 Total Material Inquiries in Database:', count);
    
    if (count > 0) {
      const docs = await MaterialInquiry.find().limit(5).sort({ createdAt: -1 });
      console.log('\n📋 Recent Material Inquiries:\n');
      
      docs.forEach((doc, i) => {
        console.log(`${i + 1}. Inquiry Number: ${doc.inquiryNumber || 'N/A'}`);
        console.log(`   Customer: ${doc.customerName}`);
        console.log(`   Email: ${doc.email}`);
        console.log(`   Status: ${doc.status}`);
        console.log(`   Created: ${doc.createdAt}`);
        console.log(`   Database ID: ${doc._id}`);
        console.log('');
      });
    } else {
      console.log('\n⚠️  NO MATERIAL INQUIRIES FOUND IN DATABASE!');
      console.log('\nPossible reasons:');
      console.log('1. No inquiries have been submitted yet');
      console.log('2. Wrong database connection');
      console.log('3. Collection name mismatch');
    }
    
    // Check all collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('\n📁 All Collections in Database:');
    collections.forEach(col => {
      console.log(`   - ${col.name}`);
    });
    
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ MongoDB Connection Error:', err.message);
    process.exit(1);
  });
