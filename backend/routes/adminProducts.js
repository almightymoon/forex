const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const Product = require('../models/Product');
const { uploadImage } = require('../config/cloudinary');

const router = express.Router();

const useCloudinary = !!(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);

const productImagesDir = path.join(__dirname, '..', 'uploads', 'products');
if (!fs.existsSync(productImagesDir)) {
  fs.mkdirSync(productImagesDir, { recursive: true });
}

const productImageUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, productImagesDir),
    filename: (_req, file, cb) => {
      const safeName = (file.originalname || 'image').replace(/\s+/g, '-').toLowerCase();
      cb(null, `product-${Date.now()}-${safeName}`);
    }
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowed.includes(file.mimetype)) return cb(null, true);
    cb(new Error('Only JPEG, PNG, GIF, or WebP images are allowed.'));
  }
});

// @route   GET /api/admin/products
// @desc    List all products
// @access  Private (Admin)
router.get('/', async (req, res) => {
  try {
    const { status, category, search, limit = 50, skip = 0 } = req.query;
    const query = {};
    if (status) query.status = status;
    if (category) query.category = category;
    if (search) {
      query.$or = [
        { name: new RegExp(search, 'i') },
        { productId: new RegExp(search, 'i') },
        { shortDescription: new RegExp(search, 'i') },
        { tags: new RegExp(search, 'i') }
      ];
    }

    const [products, total] = await Promise.all([
      Product.find(query).sort({ updatedAt: -1 }).skip(Number(skip)).limit(Math.min(Number(limit), 100)).lean(),
      Product.countDocuments(query)
    ]);

    res.json({ products, total });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// @route   GET /api/admin/products/:id
// @desc    Get single product
// @access  Private (Admin)
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).lean();
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(product);
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

// @route   POST /api/admin/products/upload
// @desc    Upload product image (primary or gallery)
// @access  Private (Admin)
router.post('/upload', productImageUpload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    let url = `/uploads/products/${req.file.filename}`;

    if (useCloudinary) {
      try {
        const result = await uploadImage(req.file.path, 'forex/products');
        url = result.url;
        try { fs.unlinkSync(req.file.path); } catch (_) {}
      } catch (cloudErr) {
        console.error('Cloudinary upload error:', cloudErr.message);
      }
    }

    res.json({
      message: 'Image uploaded successfully',
      url,
      filename: req.file.filename
    });
  } catch (error) {
    console.error('Product image upload error:', error);
    res.status(500).json({ error: error.message || 'Failed to upload image' });
  }
});

// @route   POST /api/admin/products
// @desc    Create product
// @access  Private (Admin)
router.post('/', async (req, res) => {
  try {
    const {
      productId,
      name,
      status = 'draft',
      shortDescription,
      longDescription,
      outcomePromise,
      category,
      tags,
      primaryImage,
      galleryImages,
      requirements,
      currentVersion = 'v1.0',
      seoTitle,
      seoMetaDescription,
      stripeProductId,
      price,
      deliveryUrl
    } = req.body;

    if (!productId || !name) {
      return res.status(400).json({ error: 'Product ID and name are required' });
    }

    const existing = await Product.findOne({ productId: productId.toLowerCase().trim() });
    if (existing) {
      return res.status(400).json({ error: 'A product with this Product ID already exists' });
    }

    const product = await Product.create({
      productId: productId.toLowerCase().trim(),
      name: name.trim(),
      status: ['draft', 'published', 'archived'].includes(status) ? status : 'draft',
      shortDescription: shortDescription?.trim() || '',
      longDescription: longDescription?.trim() || '',
      outcomePromise: outcomePromise?.trim() || '',
      category: category?.trim() || '',
      tags: Array.isArray(tags) ? tags.map(t => String(t).trim()).filter(Boolean) : [],
      primaryImage: primaryImage?.trim() || '',
      galleryImages: Array.isArray(galleryImages) ? galleryImages.filter(Boolean).map(u => String(u).trim()) : [],
      requirements: requirements?.trim() || '',
      currentVersion: currentVersion?.trim() || 'v1.0',
      seoTitle: seoTitle?.trim() || '',
      seoMetaDescription: seoMetaDescription?.trim() || '',
      stripeProductId: stripeProductId?.trim() || '',
      price: typeof price === 'number' ? price : parseFloat(price) || 0,
      deliveryUrl: deliveryUrl?.trim() || ''
    });

    res.status(201).json(product);
  } catch (error) {
    console.error('Create product error:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ error: 'Validation failed', details: error.message });
    }
    res.status(500).json({ error: 'Failed to create product' });
  }
});

// @route   PUT /api/admin/products/:id
// @desc    Update product
// @access  Private (Admin)
router.put('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const {
      name,
      status,
      shortDescription,
      longDescription,
      outcomePromise,
      category,
      tags,
      primaryImage,
      galleryImages,
      requirements,
      currentVersion,
      seoTitle,
      seoMetaDescription,
      stripeProductId,
      price,
      deliveryUrl
    } = req.body;
    if (name !== undefined) product.name = name.trim();
    if (status !== undefined && ['draft', 'published', 'archived'].includes(status)) product.status = status;
    if (shortDescription !== undefined) product.shortDescription = shortDescription?.trim() || '';
    if (longDescription !== undefined) product.longDescription = longDescription?.trim() || '';
    if (outcomePromise !== undefined) product.outcomePromise = outcomePromise?.trim() || '';
    if (category !== undefined) product.category = category?.trim() || '';
    if (tags !== undefined) product.tags = Array.isArray(tags) ? tags.map(t => String(t).trim()).filter(Boolean) : product.tags;
    if (primaryImage !== undefined) product.primaryImage = primaryImage?.trim() || '';
    if (galleryImages !== undefined) product.galleryImages = Array.isArray(galleryImages) ? galleryImages.filter(Boolean).map(u => String(u).trim()) : product.galleryImages;
    if (requirements !== undefined) product.requirements = requirements?.trim() || '';
    if (currentVersion !== undefined) product.currentVersion = currentVersion?.trim() || 'v1.0';
    if (seoTitle !== undefined) product.seoTitle = seoTitle?.trim() || '';
    if (seoMetaDescription !== undefined) product.seoMetaDescription = seoMetaDescription?.trim() || '';
    if (stripeProductId !== undefined) product.stripeProductId = stripeProductId?.trim() || '';
    if (price !== undefined) product.price = typeof price === 'number' ? price : parseFloat(price) || 0;
    if (deliveryUrl !== undefined) product.deliveryUrl = deliveryUrl?.trim() || '';

    await product.save();
    res.json(product);
  } catch (error) {
    console.error('Update product error:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ error: 'Validation failed', details: error.message });
    }
    res.status(500).json({ error: 'Failed to update product' });
  }
});

// @route   DELETE /api/admin/products/:id
// @desc    Delete product
// @access  Private (Admin)
router.delete('/:id', async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

module.exports = router;
