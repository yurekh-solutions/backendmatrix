"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProductById = exports.getAllProducts = exports.deleteProduct = exports.updateProduct = exports.getSupplierProducts = exports.addProduct = void 0;
const Product_1 = __importDefault(require("../models/Product"));
const Category_1 = __importDefault(require("../models/Category"));
/**
 * Sanitize image URLs by removing filesystem paths
 * Converts paths like /opt/render/project/src/uploads/image.jpg to /uploads/image.jpg
 */
const sanitizeImagePath = (imagePath) => {
    if (!imagePath)
        return '';
    // If it's already a full URL, return as-is
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
        return imagePath;
    }
    // Remove filesystem path prefix if present
    // Match patterns like /opt/render/project/src/ or similar paths
    if (imagePath.includes('/uploads/')) {
        // Extract just the /uploads/... part
        const uploadsIndex = imagePath.indexOf('/uploads/');
        return imagePath.substring(uploadsIndex);
    }
    return imagePath;
};
// Supplier: Add new product
const addProduct = async (req, res) => {
    try {
        const supplierId = req.supplier._id;
        const { name, category, subcategory, customCategory, customSubcategory, description, 
        // Additional fields from frontend
        features, pricing, moq, leadTime, materialStandard, packaging, testingCertificate, brands, grades, delivery, quality, availability } = req.body;
        // Validate required fields
        if (!name || !category || !description) {
            return res.status(400).json({
                success: false,
                message: 'Name, category, and description are required',
            });
        }
        // Handle image upload from Cloudinary
        let imageUrl = '';
        if (req.file) {
            try {
                // Cloudinary returns the secure URL in req.file.path
                imageUrl = req.file.path || '';
                console.log('✅ Image uploaded to Cloudinary:', imageUrl);
                // Fallback: construct URL from filename if path not available
                if (!imageUrl && req.file.filename) {
                    const apiUrl = process.env.API_URL || 'http://localhost:5000';
                    imageUrl = `${apiUrl}/uploads/${req.file.filename}`;
                    console.log('⚠️  Using fallback image URL:', imageUrl);
                }
            }
            catch (error) {
                console.warn('Image upload failed, continuing without image:', error);
                // Don't fail the entire product submission if image upload fails
                imageUrl = '';
            }
        }
        else {
            console.log('⚠️  No image file provided in request');
        }
        // Handle custom category request
        if (customCategory) {
            const slug = customCategory.toLowerCase().replace(/[^a-z0-9]+/g, '-');
            const existingCategory = await Category_1.default.findOne({ slug });
            if (!existingCategory) {
                // Create new category request
                await Category_1.default.create({
                    name: customCategory,
                    slug,
                    isCustom: true,
                    requestedBy: supplierId,
                    status: 'pending',
                    isActive: false,
                });
            }
        }
        // Handle custom subcategory request
        if (customSubcategory && category) {
            const categoryDoc = await Category_1.default.findOne({ slug: category });
            if (categoryDoc) {
                const subSlug = customSubcategory.toLowerCase().replace(/[^a-z0-9]+/g, '-');
                const existingSub = categoryDoc.subcategories.find((sub) => sub.slug === subSlug);
                if (!existingSub) {
                    categoryDoc.subcategories.push({
                        name: customSubcategory,
                        slug: subSlug,
                        isCustom: true,
                        requestedBy: supplierId,
                        status: 'pending',
                        isActive: false,
                    });
                    await categoryDoc.save();
                }
            }
        }
        // Parse JSON fields if they're strings
        let parsedFeatures = [];
        let parsedBrands = [];
        let parsedGrades = [];
        try {
            parsedFeatures = typeof features === 'string' ? JSON.parse(features) : (features || []);
        }
        catch (e) {
            parsedFeatures = [];
        }
        try {
            parsedBrands = typeof brands === 'string' ? JSON.parse(brands) : (brands || []);
        }
        catch (e) {
            parsedBrands = [];
        }
        try {
            parsedGrades = typeof grades === 'string' ? JSON.parse(grades) : (grades || []);
        }
        catch (e) {
            parsedGrades = [];
        }
        const productData = {
            supplierId,
            name,
            category,
            subcategory,
            customCategory,
            customSubcategory,
            description,
            image: imageUrl,
            features: parsedFeatures,
            applications: parsedFeatures, // Use features as applications too
            specifications: {
                materialStandard: materialStandard || '',
                packaging: packaging || '',
                testingCertificate: testingCertificate || '',
                brand: parsedBrands,
                grades: parsedGrades,
                delivery: delivery || '',
                quality: quality || '',
                availability: availability || '',
            },
            price: pricing ? {
                amount: parseFloat(pricing) || 0,
                currency: 'INR',
                unit: 'unit',
            } : {
                amount: 0,
                currency: 'INR',
                unit: 'unit',
            },
            stock: {
                available: true,
                quantity: moq ? parseInt(moq) : 0,
                minimumOrder: moq ? parseInt(moq) : 0,
                reserved: 0,
                lastUpdated: new Date(),
            },
            status: 'pending', // Admin approval required
        };
        const product = new Product_1.default(productData);
        await product.save();
        res.status(201).json({
            success: true,
            message: 'Product added successfully. Awaiting admin approval.',
            data: product,
        });
    }
    catch (error) {
        console.error('Add product error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to add product',
        });
    }
};
exports.addProduct = addProduct;
// Supplier: Get their products
const getSupplierProducts = async (req, res) => {
    try {
        const supplierId = req.supplier._id;
        const products = await Product_1.default.find({ supplierId }).sort({ createdAt: -1 });
        // Get localhost API URL for local image serving
        const apiUrl = 'http://localhost:5000';
        const productsWithFullImageUrls = products.map(product => {
            const productObj = product.toObject();
            if (productObj.image) {
                // First sanitize the image path (remove filesystem paths)
                const cleanPath = sanitizeImagePath(productObj.image);
                // Then ensure it's absolute
                if (!cleanPath.startsWith('http')) {
                    // For local paths, use localhost
                    productObj.image = `${apiUrl}${cleanPath.startsWith('/') ? '' : '/'}${cleanPath}`;
                }
                else {
                    // Cloudinary URLs already start with https:// so they pass through unchanged
                    productObj.image = cleanPath;
                }
            }
            else {
                // Log empty images for debugging
                console.log(`Product "${productObj.name}" has no image`);
            }
            return productObj;
        });
        res.json({
            success: true,
            data: productsWithFullImageUrls,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch products',
        });
    }
};
exports.getSupplierProducts = getSupplierProducts;
// Supplier: Update product
const updateProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const supplierId = req.supplier._id;
        const product = await Product_1.default.findOne({ _id: id, supplierId });
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found',
            });
        }
        Object.assign(product, req.body);
        product.status = 'pending'; // Re-approval needed after edit
        await product.save();
        res.json({
            success: true,
            message: 'Product updated successfully',
            data: product,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to update product',
        });
    }
};
exports.updateProduct = updateProduct;
// Supplier: Delete product
const deleteProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const supplierId = req.supplier._id;
        const product = await Product_1.default.findOneAndDelete({ _id: id, supplierId });
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found',
            });
        }
        res.json({
            success: true,
            message: 'Product deleted successfully',
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to delete product',
        });
    }
};
exports.deleteProduct = deleteProduct;
// Public: Get all active products
const getAllProducts = async (req, res) => {
    try {
        const { category, search } = req.query;
        const query = { status: 'active' };
        if (category) {
            query.category = category;
        }
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
            ];
        }
        const products = await Product_1.default.find(query)
            .populate('supplierId', 'companyName email phone')
            .sort({ createdAt: -1 });
        // Convert relative image paths to absolute URLs
        const apiUrl = process.env.API_URL || 'http://localhost:5000';
        const productsWithFullImageUrls = products.map(product => {
            const productObj = product.toObject();
            if (productObj.image) {
                // First sanitize the image path (remove filesystem paths)
                const cleanPath = sanitizeImagePath(productObj.image);
                // Then ensure it's absolute
                if (!cleanPath.startsWith('http')) {
                    productObj.image = `${apiUrl}${cleanPath.startsWith('/') ? '' : '/'}${cleanPath}`;
                }
                else {
                    productObj.image = cleanPath;
                }
            }
            return productObj;
        });
        res.json({
            success: true,
            data: productsWithFullImageUrls,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch products',
        });
    }
};
exports.getAllProducts = getAllProducts;
// Public: Get product by ID
const getProductById = async (req, res) => {
    try {
        const { id } = req.params;
        const product = await Product_1.default.findOne({ _id: id, status: 'active' })
            .populate('supplierId', 'companyName email phone');
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found',
            });
        }
        // Convert relative image path to absolute URL
        const productObj = product.toObject();
        if (productObj.image) {
            // First sanitize the image path (remove filesystem paths)
            const cleanPath = sanitizeImagePath(productObj.image);
            // Then ensure it's absolute
            if (!cleanPath.startsWith('http')) {
                const apiUrl = process.env.API_URL || 'http://localhost:5000';
                productObj.image = `${apiUrl}${cleanPath.startsWith('/') ? '' : '/'}${cleanPath}`;
            }
            else {
                productObj.image = cleanPath;
            }
        }
        res.json({
            success: true,
            data: productObj,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch product',
        });
    }
};
exports.getProductById = getProductById;
