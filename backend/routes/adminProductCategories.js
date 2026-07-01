const express = require('express');
const Product = require('../models/Product');
const ProductCategory = require('../models/ProductCategory');

const router = express.Router();

// @route   GET /api/admin/product-categories
// @desc    List shop product categories
// @access  Private (Admin)
router.get('/', async (req, res) => {
  try {
    const categories = await ProductCategory.find()
      .sort({ sortOrder: 1, name: 1 })
      .lean();

    const usage = await Product.aggregate([
      { $match: { category: { $exists: true, $ne: '' } } },
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ]);
    const countByName = new Map(usage.map((row) => [row._id, row.count]));

    res.json({
      categories: categories.map((cat) => ({
        ...cat,
        productCount: countByName.get(cat.name) || 0
      }))
    });
  } catch (error) {
    console.error('Get product categories error:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// @route   POST /api/admin/product-categories
// @desc    Create a shop product category
// @access  Private (Admin)
router.post('/', async (req, res) => {
  try {
    const { name, description = '', sortOrder = 0, isActive = true } = req.body;
    const trimmedName = String(name || '').trim();

    if (!trimmedName) {
      return res.status(400).json({ error: 'Category name is required' });
    }

    const slug = ProductCategory.slugifyName(trimmedName);
    if (!slug) {
      return res.status(400).json({ error: 'Category name must contain valid characters' });
    }

    const existing = await ProductCategory.findOne({
      $or: [{ name: trimmedName }, { slug }]
    });
    if (existing) {
      return res.status(400).json({ error: 'A category with this name already exists' });
    }

    const category = await ProductCategory.create({
      name: trimmedName,
      slug,
      description: String(description || '').trim(),
      sortOrder: Number(sortOrder) || 0,
      isActive: isActive !== false
    });

    res.status(201).json(category);
  } catch (error) {
    console.error('Create product category error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ error: 'A category with this name already exists' });
    }
    res.status(500).json({ error: 'Failed to create category' });
  }
});

// @route   PUT /api/admin/product-categories/:id
// @desc    Update a shop product category
// @access  Private (Admin)
router.put('/:id', async (req, res) => {
  try {
    const category = await ProductCategory.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    const previousName = category.name;
    const { name, description, sortOrder, isActive } = req.body;

    if (name !== undefined) {
      const trimmedName = String(name).trim();
      if (!trimmedName) {
        return res.status(400).json({ error: 'Category name is required' });
      }
      const slug = ProductCategory.slugifyName(trimmedName);
      if (!slug) {
        return res.status(400).json({ error: 'Category name must contain valid characters' });
      }
      const duplicate = await ProductCategory.findOne({
        _id: { $ne: category._id },
        $or: [{ name: trimmedName }, { slug }]
      });
      if (duplicate) {
        return res.status(400).json({ error: 'A category with this name already exists' });
      }
      category.name = trimmedName;
      category.slug = slug;
    }

    if (description !== undefined) category.description = String(description || '').trim();
    if (sortOrder !== undefined) category.sortOrder = Number(sortOrder) || 0;
    if (isActive !== undefined) category.isActive = Boolean(isActive);

    await category.save();

    if (previousName !== category.name) {
      await Product.updateMany({ category: previousName }, { $set: { category: category.name } });
    }

    res.json(category);
  } catch (error) {
    console.error('Update product category error:', error);
    res.status(500).json({ error: 'Failed to update category' });
  }
});

// @route   DELETE /api/admin/product-categories/:id
// @desc    Delete a shop product category
// @access  Private (Admin)
router.delete('/:id', async (req, res) => {
  try {
    const category = await ProductCategory.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    const productCount = await Product.countDocuments({ category: category.name });
    if (productCount > 0) {
      return res.status(400).json({
        error: `Cannot delete category used by ${productCount} product(s). Reassign products first.`
      });
    }

    await category.deleteOne();
    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Delete product category error:', error);
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

module.exports = router;
