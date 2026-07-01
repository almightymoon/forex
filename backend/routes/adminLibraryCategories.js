const express = require('express');
const LibraryItem = require('../models/LibraryItem');
const LibraryCategory = require('../models/LibraryCategory');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const categories = await LibraryCategory.find()
      .sort({ sortOrder: 1, name: 1 })
      .lean();

    const usage = await LibraryItem.aggregate([
      { $match: { category: { $exists: true, $ne: '' } } },
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ]);
    const countByName = new Map(usage.map((row) => [row._id, row.count]));

    res.json({
      categories: categories.map((cat) => ({
        ...cat,
        itemCount: countByName.get(cat.name) || 0
      }))
    });
  } catch (error) {
    console.error('Get library categories error:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, description = '', sortOrder = 0, isActive = true } = req.body;
    const trimmedName = String(name || '').trim();
    if (!trimmedName) return res.status(400).json({ error: 'Category name is required' });

    const slug = LibraryCategory.slugifyName(trimmedName);
    if (!slug) return res.status(400).json({ error: 'Category name must contain valid characters' });

    const existing = await LibraryCategory.findOne({ $or: [{ name: trimmedName }, { slug }] });
    if (existing) return res.status(400).json({ error: 'A category with this name already exists' });

    const category = await LibraryCategory.create({
      name: trimmedName,
      slug,
      description: String(description || '').trim(),
      sortOrder: Number(sortOrder) || 0,
      isActive: isActive !== false
    });

    res.status(201).json(category);
  } catch (error) {
    console.error('Create library category error:', error);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const category = await LibraryCategory.findById(req.params.id);
    if (!category) return res.status(404).json({ error: 'Category not found' });

    const previousName = category.name;
    const { name, description, sortOrder, isActive } = req.body;

    if (name !== undefined) {
      const trimmedName = String(name).trim();
      if (!trimmedName) return res.status(400).json({ error: 'Category name is required' });
      const slug = LibraryCategory.slugifyName(trimmedName);
      const duplicate = await LibraryCategory.findOne({
        _id: { $ne: category._id },
        $or: [{ name: trimmedName }, { slug }]
      });
      if (duplicate) return res.status(400).json({ error: 'A category with this name already exists' });
      category.name = trimmedName;
      category.slug = slug;
    }

    if (description !== undefined) category.description = String(description || '').trim();
    if (sortOrder !== undefined) category.sortOrder = Number(sortOrder) || 0;
    if (isActive !== undefined) category.isActive = Boolean(isActive);

    await category.save();

    if (previousName !== category.name) {
      await LibraryItem.updateMany({ category: previousName }, { $set: { category: category.name } });
    }

    res.json(category);
  } catch (error) {
    console.error('Update library category error:', error);
    res.status(500).json({ error: 'Failed to update category' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const category = await LibraryCategory.findById(req.params.id);
    if (!category) return res.status(404).json({ error: 'Category not found' });

    const itemCount = await LibraryItem.countDocuments({ category: category.name });
    if (itemCount > 0) {
      return res.status(400).json({
        error: `Cannot delete category used by ${itemCount} item(s). Reassign items first.`
      });
    }

    await category.deleteOne();
    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Delete library category error:', error);
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

module.exports = router;
