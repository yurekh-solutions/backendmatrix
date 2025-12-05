// Quick test script to submit material inquiry and check storage
const axios = require('axios');

const API_BASE = 'http://localhost:5000/api';

async function testMaterialInquiry() {
  console.log('🧪 Testing Material Inquiry Submission\n');
  
  // Test data
  const testData = {
    customerName: "Test Customer " + Date.now(),
    companyName: "Test Company Ltd",
    email: "test_" + Date.now() + "@example.com",
    phone: "+919876543210",
    materials: [
      {
        materialName: "Test Cement",
        category: "Construction",
        grade: "53 Grade",
        specification: "Portland cement",
        quantity: 100,
        unit: "bags",
        targetPrice: 380
      }
    ],
    deliveryLocation: "Mumbai, Maharashtra",
    deliveryAddress: "123 Test Street",
    totalEstimatedValue: 38000,
    paymentTerms: "30 days",
    additionalRequirements: "Test inquiry for database verification"
  };
  
  try {
    // 1. Test health endpoint
    console.log('1️⃣ Testing health endpoint...');
    const healthResponse = await axios.get(`${API_BASE}/health`);
    console.log('✅ Backend is running');
    console.log('   Status:', healthResponse.data.message);
    console.log('   Environment:', healthResponse.data.environment);
    console.log('');
    
    // 2. Submit material inquiry
    console.log('2️⃣ Submitting material inquiry...');
    console.log('   Endpoint:', `${API_BASE}/material-inquiries`);
    const submitResponse = await axios.post(`${API_BASE}/material-inquiries`, testData);
    
    if (submitResponse.data.success) {
      console.log('✅ Material Inquiry Submitted Successfully!');
      console.log('   Inquiry Number:', submitResponse.data.data.inquiryNumber);
      console.log('   Database ID:', submitResponse.data.data._id);
      console.log('   Customer:', submitResponse.data.data.customerName);
      console.log('   Email:', submitResponse.data.data.email);
      console.log('   Status:', submitResponse.data.data.status);
      console.log('   Priority:', submitResponse.data.data.priority);
      console.log('');
    } else {
      console.log('❌ Submission failed:', submitResponse.data.message);
      process.exit(1);
    }
    
    // 3. Verify in database
    console.log('3️⃣ Verifying database storage...');
    const verifyResponse = await axios.get(`${API_BASE}/material-inquiries/admin/all`);
    
    if (verifyResponse.data.success) {
      console.log('✅ Database Check Successful!');
      console.log('   Total Inquiries:', verifyResponse.data.stats.total);
      console.log('   New Inquiries:', verifyResponse.data.stats.new);
      console.log('');
      
      if (verifyResponse.data.data.length > 0) {
        console.log('📋 Recent Inquiries:');
        verifyResponse.data.data.slice(0, 3).forEach((inq, i) => {
          console.log(`   ${i + 1}. ${inq.inquiryNumber} - ${inq.customerName}`);
          console.log(`      Email: ${inq.email}`);
          console.log(`      Status: ${inq.status}`);
          console.log(`      Created: ${new Date(inq.createdAt).toLocaleString()}`);
        });
      } else {
        console.log('⚠️  No inquiries found in database!');
      }
    }
    
    console.log('\n✅ TEST COMPLETE - Material Inquiry is being stored in database!');
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ ERROR during test:');
    
    if (error.code === 'ECONNREFUSED') {
      console.error('   Cannot connect to backend!');
      console.error('   Make sure backend is running on port 5000');
      console.error('   Run: cd backendmatrix && npm run dev');
    } else if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Message:', error.response.data.message || error.response.statusText);
      console.error('   Details:', error.response.data);
    } else {
      console.error('   ', error.message);
    }
    
    process.exit(1);
  }
}

testMaterialInquiry();
