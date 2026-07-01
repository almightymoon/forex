const express = require('express');
const Product = require('../models/Product');
const ProductCategory = require('../models/ProductCategory');
const Payment = require('../models/Payment');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

async function getActiveCategoryNames() {
  const [managed, fromProducts] = await Promise.all([
    ProductCategory.find({ isActive: true }).sort({ sortOrder: 1, name: 1 }).select('name').lean(),
    Product.distinct('category', { status: 'published', category: { $ne: '' } })
  ]);
  const names = new Set(managed.map((c) => c.name));
  fromProducts.filter(Boolean).forEach((n) => names.add(n));
  return [...names].sort((a, b) => a.localeCompare(b));
}

const publicProductFields = {
  productId: 1,
  name: 1,
  shortDescription: 1,
  longDescription: 1,
  outcomePromise: 1,
  category: 1,
  tags: 1,
  primaryImage: 1,
  galleryImages: 1,
  requirements: 1,
  currentVersion: 1,
  seoTitle: 1,
  seoMetaDescription: 1,
  price: 1,
  updatedAt: 1
};

// @route   GET /api/products
// @desc    List published products (public catalog)
// @access  Public
router.get('/', async (req, res) => {
  try {
    const { category, search, tag, limit = 50, skip = 0 } = req.query;
    const query = { status: 'published' };

    if (category) query.category = category;
    if (tag) query.tags = tag;
    if (search) {
      query.$or = [
        { name: new RegExp(search, 'i') },
        { productId: new RegExp(search, 'i') },
        { shortDescription: new RegExp(search, 'i') },
        { tags: new RegExp(search, 'i') }
      ];
    }

    const [products, total, categories] = await Promise.all([
      Product.find(query, publicProductFields)
        .sort({ updatedAt: -1 })
        .skip(Number(skip))
        .limit(Math.min(Number(limit), 100))
        .lean(),
      Product.countDocuments(query),
      getActiveCategoryNames()
    ]);

    res.json({ products, total, categories });
  } catch (error) {
    console.error('Get public products error:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// @route   GET /api/products/my/purchases
// @desc    List products the user has purchased (completed payments)
// @access  Private
router.get('/my/purchases', authenticateToken, async (req, res) => {
  try {
    const payments = await Payment.find({
      user: req.user._id,
      type: 'product',
      status: 'completed',
      $or: [
        { 'product.productId': { $exists: true, $ne: '' } },
        { 'productItems.0': { $exists: true } }
      ]
    })
      .sort({ confirmedAt: -1, createdAt: -1 })
      .lean();

    const productIds = new Set();
    for (const payment of payments) {
      if (payment.product?.productId) productIds.add(payment.product.productId);
      for (const item of payment.productItems || []) {
        if (item?.productId) productIds.add(item.productId);
      }
    }
    const products = await Product.find(
      { productId: { $in: [...productIds] } },
      { ...publicProductFields, deliveryUrl: 1 }
    ).lean();
    const productBySlug = new Map(products.map((p) => [p.productId, p]));

    const purchases = [];
    for (const payment of payments) {
      const lineItems = (payment.productItems && payment.productItems.length)
        ? payment.productItems
        : payment.product?.productId
          ? [{ productId: payment.product.productId, name: payment.product.name, price: payment.product.price, quantity: 1 }]
          : [];

      for (const item of lineItems) {
        const slug = item.productId;
        if (!slug) continue;
        const catalog = productBySlug.get(slug);
        purchases.push({
          paymentId: payment._id,
          purchasedAt: payment.confirmedAt || payment.updatedAt || payment.createdAt,
          amount: (item.price ?? 0) * (item.quantity || 1),
          quantity: item.quantity || 1,
          product: catalog
            ? {
                productId: catalog.productId,
                name: catalog.name,
                shortDescription: catalog.shortDescription,
                primaryImage: catalog.primaryImage,
                currentVersion: catalog.currentVersion,
                deliveryUrl: catalog.deliveryUrl || null
              }
            : {
                productId: slug,
                name: item.name || slug,
                shortDescription: '',
                primaryImage: '',
                currentVersion: '',
                deliveryUrl: null
              }
        });
      }
    }

    res.json({ purchases });
  } catch (error) {
    console.error('Get my product purchases error:', error);
    res.status(500).json({ error: 'Failed to fetch purchases' });
  }
});

// @route   GET /api/products/categories
// @desc    List active shop categories (public)
// @access  Public
router.get('/categories', async (_req, res) => {
  try {
    const categories = await ProductCategory.find({ isActive: true })
      .sort({ sortOrder: 1, name: 1 })
      .select('name slug description sortOrder')
      .lean();
    res.json({ categories });
  } catch (error) {
    console.error('Get public product categories error:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// @route   GET /api/products/:productId
// @desc    Get a published product by slug
// @access  Public
router.get('/:productId', async (req, res) => {
  try {
    const slug = String(req.params.productId || '').toLowerCase().trim();
    if (!slug || slug === 'my') {
      return res.status(404).json({ error: 'Product not found' });
    }

    const product = await Product.findOne(
      { productId: slug, status: 'published' },
      publicProductFields
    ).lean();

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json(product);
  } catch (error) {
    console.error('Get public product error:', error);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

module.exports = router;
