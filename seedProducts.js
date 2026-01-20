require('dotenv').config();
const mongoose = require('mongoose');

// Define Product schema (simplified version)
const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { type: String, required: true },
  description: { type: String, required: true },
  image: { type: String },
  status: { type: String, default: 'active' },
  specifications: {
    materialStandard: String,
    packaging: String,
    testingCertificate: String,
    brand: [String],
    grades: [String],
    delivery: String,
    quality: String,
    availability: String
  },
  applications: [String],
  features: [String],
  supplierId: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const Product = mongoose.model('Product', productSchema);

// Sample products data structure (you'll need all 107 products)
const sampleProducts = [
  {
    name: "TMT Bars Fe 500D",
    category: "mild-steel",
    description: "High-strength Thermo-Mechanically Treated reinforcement bars conforming to IS 1786 Fe 500D grade.",
    image: "https://images.unsplash.com/photo-1565008576549-57569a49371d?w=800",
    applications: ["High-Rise Buildings", "Bridge Construction", "Industrial Structures"],
    features: ["Fe 500D Grade", "Earthquake Resistant", "Superior Ductility"],
    specifications: {
      materialStandard: "IS 1786 Fe 500D",
      packaging: "Bundle / Loose",
      brand: ["JSW Steel", "Tata Steel", "SAIL"],
      grades: ["Fe 500D", "Fe 550D"],
      quality: "ISI Certified",
      availability: "In Stock"
    },
    status: "active"
  },
  // Add more products here...
];

async function seedProducts() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // First, check existing products
    const existingCount = await Product.countDocuments();
    console.log(`📊 Existing products in database: ${existingCount}`);

    if (existingCount >= 100) {
      console.log('⚠️  Database already has enough products. Skipping seed.');
      console.log('💡 To reseed, first delete products from MongoDB Atlas or set all to active:');
      console.log('   db.products.updateMany({}, {$set: {status: "active"}})');
      return;
    }

    console.log('🌱 Seeding products...');
    
    // Insert sample products
    const result = await Product.insertMany(sampleProducts);
    console.log(`✅ Successfully seeded ${result.length} products`);

    // Count active products
    const activeCount = await Product.countDocuments({ status: 'active' });
    console.log(`✅ Total active products: ${activeCount}`);

  } catch (error) {
    console.error('❌ Error seeding products:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  }
}

// Alternative: Set all existing products to active
async function setAllProductsActive() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    console.log('🔄 Updating all products to active status...');
    const result = await Product.updateMany({}, { $set: { status: 'active' } });
    
    console.log(`✅ Updated ${result.modifiedCount} products to active status`);
    
    const activeCount = await Product.countDocuments({ status: 'active' });
    console.log(`✅ Total active products: ${activeCount}`);

  } catch (error) {
    console.error('❌ Error updating products:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  }
}

// Run the script
const command = process.argv[2];

if (command === 'activate') {
  console.log('🎯 Running: Set all products to active\n');
  setAllProductsActive();
} else {
  console.log('🎯 Running: Seed new products\n');
  seedProducts();
}
