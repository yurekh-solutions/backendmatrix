#!/usr/bin/env node

/**
 * Script to check and reset the default admin account
 * Run this if you're having login issues with the admin portal
 * 
 * Usage: node checkAndResetAdmin.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://MaterialMatrix:Sonia2706@cluster0.nghmt5w.mongodb.net/supplier-onboarding?retryWrites=true&w=majority&appName=Cluster0';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@matrixyuvraj.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin@123';

console.log('\n╔════════════════════════════════════════════╗');
console.log('║      Admin Account Check & Reset Tool     ║');
console.log('╚════════════════════════════════════════════╝\n');

// Define Admin Schema
const adminSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, select: false },
  role: { type: String, enum: ['admin', 'super_admin'], default: 'admin' },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

adminSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

adminSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

const Admin = mongoose.model('Admin', adminSchema);

async function checkAndResetAdmin() {
  try {
    console.log('📡 Connecting to MongoDB...\n');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    console.log(`🔍 Checking for admin account: ${ADMIN_EMAIL}\n`);
    
    let admin = await Admin.findOne({ email: ADMIN_EMAIL }).select('+password');

    if (admin) {
      console.log('✅ Admin account found!');
      console.log(`   Name: ${admin.name}`);
      console.log(`   Email: ${admin.email}`);
      console.log(`   Role: ${admin.role}`);
      console.log(`   Active: ${admin.isActive}`);
      console.log(`   Created: ${admin.createdAt.toLocaleString()}\n`);

      // Try to verify the password
      const isPasswordMatch = await admin.comparePassword(ADMIN_PASSWORD);
      console.log(`🔐 Password verification: ${isPasswordMatch ? '✅ CORRECT' : '❌ INCORRECT'}\n`);

      if (!isPasswordMatch) {
        console.log('⚠️  Password does not match. Resetting to default password...\n');
        admin.password = ADMIN_PASSWORD;
        await admin.save();
        console.log('✅ Password reset successfully\n');
      }
    } else {
      console.log('❌ Admin account NOT found. Creating new account...\n');
      
      admin = new Admin({
        name: 'System Admin',
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        role: 'super_admin',
        isActive: true
      });

      await admin.save();
      console.log('✅ Admin account created successfully!\n');
    }

    console.log('\n╔════════════════════════════════════════════╗');
    console.log('║         Admin Account Details             ║');
    console.log('╚════════════════════════════════════════════╝\n');
    console.log(`📧 Email: ${ADMIN_EMAIL}`);
    console.log(`🔐 Password: ${ADMIN_PASSWORD}`);
    console.log(`👤 Role: super_admin`);
    console.log(`✅ Status: Active\n`);
    console.log('You can now log in to the admin panel with these credentials.\n');

    await mongoose.connection.close();
    console.log('✅ Database connection closed\n');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

checkAndResetAdmin();
