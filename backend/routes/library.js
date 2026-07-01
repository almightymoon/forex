const express = require('express');
const LibraryItem = require('../models/LibraryItem');
const LibraryCategory = require('../models/LibraryCategory');
const { authenticateToken } = require('../middleware/auth');
const {
  canAccessLibraryItem,
  toPublicLibraryItem,
  getUserPackagePrice,
  applyPackageFilterToQuery,
} = require('../utils/libraryAccess');

const router = express.Router();

const LMS_LIBRARY_ROLES = new Set(['student', 'teacher', 'instructor', 'admin', 'developer']);

function requireLmsLibraryAccess(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  if (!LMS_LIBRARY_ROLES.has(req.user.role)) {
    return res.status(403).json({ error: 'Library is available to students and teachers only' });
  }
  return next();
}

async function getActiveCategoryNames(extraQuery = {}) {
  const [managed, fromItems] = await Promise.all([
    LibraryCategory.find({ isActive: true }).sort({ sortOrder: 1, name: 1 }).select('name').lean(),
    LibraryItem.distinct('category', { status: 'published', category: { $ne: '' }, ...extraQuery })
  ]);
  const names = new Set(managed.map((c) => c.name));
  fromItems.filter(Boolean).forEach((n) => names.add(n));
  return [...names].sort((a, b) => a.localeCompare(b));
}

router.use(authenticateToken, requireLmsLibraryAccess);

// @route   GET /api/library
router.get('/', async (req, res) => {
  try {
    const { category, search, type, tag, limit = 50, skip = 0 } = req.query;
    const access = await getUserPackagePrice(req.user);
    const query = { status: 'published' };

    if (category) query.category = category;
    if (type) query.resourceType = type;
    if (tag) query.tags = tag;
    if (search) {
      query.$or = [
        { title: new RegExp(search, 'i') },
        { itemId: new RegExp(search, 'i') },
        { description: new RegExp(search, 'i') },
        { tags: new RegExp(search, 'i') }
      ];
    }

    applyPackageFilterToQuery(query, access);

    const categoryFilter = { status: 'published' };
    applyPackageFilterToQuery(categoryFilter, access);

    const [items, total, categories] = await Promise.all([
      LibraryItem.find(query)
        .sort({ sortOrder: 1, updatedAt: -1 })
        .skip(Number(skip))
        .limit(Math.min(Number(limit), 100))
        .lean(),
      LibraryItem.countDocuments(query),
      getActiveCategoryNames(categoryFilter)
    ]);

    const shaped = await Promise.all(
      items.map(async (item) => {
        const hasAccess = await canAccessLibraryItem(req.user, item);
        return toPublicLibraryItem(item, hasAccess);
      })
    );

    res.json({ items: shaped, total, categories });
  } catch (error) {
    console.error('Get library items error:', error);
    res.status(500).json({ error: 'Failed to fetch library items' });
  }
});

router.get('/categories', async (req, res) => {
  try {
    const access = await getUserPackagePrice(req.user);
    const categoryFilter = { status: 'published' };
    applyPackageFilterToQuery(categoryFilter, access);

    const categories = await LibraryCategory.find({ isActive: true })
      .sort({ sortOrder: 1, name: 1 })
      .select('name slug description sortOrder')
      .lean();
    res.json({ categories });
  } catch (error) {
    console.error('Get library categories error:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

router.get('/:itemId', async (req, res) => {
  try {
    const slug = String(req.params.itemId || '').toLowerCase().trim();
    if (!slug || slug === 'categories') {
      return res.status(404).json({ error: 'Library item not found' });
    }

    const access = await getUserPackagePrice(req.user);
    const query = { itemId: slug, status: 'published' };
    applyPackageFilterToQuery(query, access);

    const item = await LibraryItem.findOne(query).lean();
    if (!item) {
      return res.status(404).json({ error: 'Library item not found' });
    }

    const hasAccess = await canAccessLibraryItem(req.user, item);
    res.json(toPublicLibraryItem(item, hasAccess));
  } catch (error) {
    console.error('Get library item error:', error);
    res.status(500).json({ error: 'Failed to fetch library item' });
  }
});

module.exports = router;
