import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Category from './models/Category';

dotenv.config();

const defaultCategories = [
  {
    name: 'Mild Steel',
    slug: 'mild-steel',
    icon: '🔩',
    isCustom: false,
    status: 'approved',
    isActive: true,
    subcategories: [
      { name: 'Round Bars', slug: 'round-bars', isCustom: false, status: 'approved', isActive: true },
      { name: 'Plates', slug: 'plates', isCustom: false, status: 'approved', isActive: true },
      { name: 'Channels', slug: 'channels', isCustom: false, status: 'approved', isActive: true },
      { name: 'Angles', slug: 'angles', isCustom: false, status: 'approved', isActive: true },
      { name: 'Beams', slug: 'beams', isCustom: false, status: 'approved', isActive: true },
      { name: 'Pipes', slug: 'pipes', isCustom: false, status: 'approved', isActive: true },
      { name: 'Tubes', slug: 'tubes', isCustom: false, status: 'approved', isActive: true },
      { name: 'TMT Bars', slug: 'tmt-bars', isCustom: false, status: 'approved', isActive: true },
      { name: 'Wire Rods', slug: 'wire-rods', isCustom: false, status: 'approved', isActive: true },
      { name: 'Sheets', slug: 'sheets', isCustom: false, status: 'approved', isActive: true },
    ],
  },
  {
    name: 'Stainless Steel',
    slug: 'stainless-steel',
    icon: '⚙️',
    isCustom: false,
    status: 'approved',
    isActive: true,
    subcategories: [
      { name: 'SS 304', slug: 'ss-304', isCustom: false, status: 'approved', isActive: true },
      { name: 'SS 316', slug: 'ss-316', isCustom: false, status: 'approved', isActive: true },
      { name: 'Pipes', slug: 'pipes', isCustom: false, status: 'approved', isActive: true },
      { name: 'Sheets', slug: 'sheets', isCustom: false, status: 'approved', isActive: true },
      { name: 'Coils', slug: 'coils', isCustom: false, status: 'approved', isActive: true },
      { name: 'Plates', slug: 'plates', isCustom: false, status: 'approved', isActive: true },
      { name: 'Round Bars', slug: 'round-bars', isCustom: false, status: 'approved', isActive: true },
      { name: 'Fittings', slug: 'fittings', isCustom: false, status: 'approved', isActive: true },
    ],
  },
  {
    name: 'Construction Materials',
    slug: 'construction',
    icon: '🏗️',
    isCustom: false,
    status: 'approved',
    isActive: true,
    subcategories: [
      { name: 'Cement', slug: 'cement', isCustom: false, status: 'approved', isActive: true },
      { name: 'Sand', slug: 'sand', isCustom: false, status: 'approved', isActive: true },
      { name: 'Aggregates', slug: 'aggregates', isCustom: false, status: 'approved', isActive: true },
      { name: 'Bricks', slug: 'bricks', isCustom: false, status: 'approved', isActive: true },
      { name: 'Blocks', slug: 'blocks', isCustom: false, status: 'approved', isActive: true },
      { name: 'Ready Mix Concrete', slug: 'ready-mix-concrete', isCustom: false, status: 'approved', isActive: true },
      { name: 'Plywood', slug: 'plywood', isCustom: false, status: 'approved', isActive: true },
      { name: 'Waterproofing', slug: 'waterproofing', isCustom: false, status: 'approved', isActive: true },
      { name: 'Paints', slug: 'paints', isCustom: false, status: 'approved', isActive: true },
      { name: 'Tiles', slug: 'tiles', isCustom: false, status: 'approved', isActive: true },
    ],
  },
  {
    name: 'Electrical Materials',
    slug: 'electrical',
    icon: '⚡',
    isCustom: false,
    status: 'approved',
    isActive: true,
    subcategories: [
      { name: 'Cables & Wires', slug: 'cables-wires', isCustom: false, status: 'approved', isActive: true },
      { name: 'Switches & Sockets', slug: 'switches-sockets', isCustom: false, status: 'approved', isActive: true },
      { name: 'Conduits', slug: 'conduits', isCustom: false, status: 'approved', isActive: true },
      { name: 'LED Lights', slug: 'led-lights', isCustom: false, status: 'approved', isActive: true },
      { name: 'MCB & RCCB', slug: 'mcb-rccb', isCustom: false, status: 'approved', isActive: true },
      { name: 'Distribution Boards', slug: 'distribution-boards', isCustom: false, status: 'approved', isActive: true },
    ],
  },
];

const seedCategories = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/supplier-onboarding');
    console.log('✅ Connected to MongoDB');

    // Clear existing categories
    await Category.deleteMany({});
    console.log('🗑️  Cleared existing categories');

    // Insert default categories
    await Category.insertMany(defaultCategories);
    console.log('✅ Default categories seeded successfully');

    console.log('\n📊 Seeded Categories:');
    defaultCategories.forEach((cat) => {
      console.log(`   ${cat.icon} ${cat.name} (${cat.subcategories.length} subcategories)`);
    });

    await mongoose.disconnect();
    console.log('\n✅ Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding categories:', error);
    process.exit(1);
  }
};

seedCategories();
