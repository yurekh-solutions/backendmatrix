#!/usr/bin/env node

/**
 * Complete Admin Login Debug Tool
 * Tests both local and production backends
 * Run: node debugAdminLogin.js
 */

const http = require('http');
const https = require('https');
require('dotenv').config();

const ADMIN_EMAIL = 'admin@matrixyuvraj.com';
const ADMIN_PASSWORD = 'Admin@123';

console.log('\n╔════════════════════════════════════════════╗');
console.log('║    Complete Admin Login Debug Tool        ║');
console.log('╚════════════════════════════════════════════╝\n');

function makeRequest(url, method, headers, body) {
  return new Promise((resolve, reject) => {
    const isHttps = url.startsWith('https');
    const client = isHttps ? https : http;
    const options = new URL(url);
    options.method = method;
    options.headers = headers;
    options.timeout = 10000;

    const req = client.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            statusText: res.statusMessage,
            headers: res.headers,
            body: data ? JSON.parse(data) : null,
            rawBody: data
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            statusText: res.statusMessage,
            headers: res.headers,
            body: null,
            rawBody: data
          });
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.abort();
      reject(new Error('Request timeout'));
    });

    if (body) req.write(body);
    req.end();
  });
}

async function testBackend(name, baseUrl) {
  console.log(`\n\n🔍 Testing: ${name}`);
  console.log('═'.repeat(50));
  
  try {
    // Test health endpoint
    console.log(`\n📡 Testing health endpoint...`);
    const healthRes = await makeRequest(`${baseUrl}/health`, 'GET', {
      'Content-Type': 'application/json'
    });
    
    console.log(`   Status: ${healthRes.status} ${healthRes.statusText}`);
    if (healthRes.body) {
      console.log(`   Message: ${healthRes.body.message}`);
      console.log(`   Env: ${healthRes.body.environment}`);
    } else {
      console.log(`   ❌ No response body`);
    }

    // Test login endpoint
    console.log(`\n🔐 Testing admin login...`);
    const loginBody = JSON.stringify({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD
    });

    const loginRes = await makeRequest(`${baseUrl}/auth/admin/login`, 'POST', {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }, loginBody);

    console.log(`   Status: ${loginRes.status} ${loginRes.statusText}`);
    
    if (loginRes.status === 200) {
      console.log(`   ✅ LOGIN SUCCESSFUL`);
      if (loginRes.body && loginRes.body.token) {
        const token = loginRes.body.token;
        console.log(`   Token: ${token.substring(0, 20)}...${token.substring(token.length - 20)}`);
        console.log(`   User: ${loginRes.body.user?.email}`);
        console.log(`   Role: ${loginRes.body.user?.role}`);
      }
    } else if (loginRes.status === 401) {
      console.log(`   ❌ UNAUTHORIZED (401)`);
      if (loginRes.body) {
        console.log(`   Message: ${loginRes.body.message}`);
      }
    } else {
      console.log(`   ⚠️  Unexpected status`);
      if (loginRes.body) {
        console.log(`   Response:`, JSON.stringify(loginRes.body, null, 2));
      }
    }

    // Check CORS headers
    console.log(`\n🔗 Checking CORS headers...`);
    console.log(`   Access-Control-Allow-Origin: ${loginRes.headers['access-control-allow-origin'] || 'NOT SET'}`);
    console.log(`   Access-Control-Allow-Methods: ${loginRes.headers['access-control-allow-methods'] || 'NOT SET'}`);
    console.log(`   Access-Control-Allow-Credentials: ${loginRes.headers['access-control-allow-credentials'] || 'NOT SET'}`);

  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    if (error.code === 'ECONNREFUSED') {
      console.log(`   💡 Hint: Backend is not running or port is wrong`);
    } else if (error.code === 'ENOTFOUND') {
      console.log(`   💡 Hint: Domain name doesn't resolve`);
    }
  }
}

async function main() {
  // Test localhost
  await testBackend('Local Backend', 'http://localhost:5000/api');
  
  // Test production (Render)
  await testBackend('Production (Render)', 'https://backendmatrix.onrender.com/api');

  console.log('\n\n╔════════════════════════════════════════════╗');
  console.log('║           Summary & Recommendations        ║');
  console.log('╚════════════════════════════════════════════╝\n');

  console.log('If local works but Render doesn\'t:');
  console.log('  1. Go to Render Dashboard: https://dashboard.render.com');
  console.log('  2. Find "backendmatrix" service');
  console.log('  3. Click "Manual Deploy" → "Deploy latest commit"');
  console.log('  4. Wait 5-10 minutes for deployment');
  console.log('  5. Come back here and run this script again\n');

  console.log('If both fail:');
  console.log('  1. Check MongoDB connection in .env');
  console.log('  2. Verify ADMIN_EMAIL and ADMIN_PASSWORD in .env');
  console.log('  3. Run: node checkAndResetAdmin.js\n');
}

main().catch(console.error);
