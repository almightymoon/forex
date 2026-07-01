const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const LibraryItem = require('../models/LibraryItem');
const { uploadImage, uploadDocument } = require('../config/cloudinary');
const { sanitizeAllowedPackages } = require('../utils/coursePayload');

const router = express.Router();

const useCloudinary = !!(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);

const libraryDir = path.join(__dirname, '..', 'uploads', 'library');
if (!fs.existsSync(libraryDir)) {
  fs.mkdirSync(libraryDir, { recursive: true });
}

const coverUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, libraryDir),
    filename: (_req, file, cb) => {
      const safeName = (file.originalname || 'cover').replace(/\s+/g, '-').toLowerCase();
      cb(null, `library-cover-${Date.now()}-${safeName}`);
    }
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowed.includes(file.mimetype)) return cb(null, true);
    cb(new Error('Only JPEG, PNG, GIF, or WebP images are allowed.'));
  }
});

const fileUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, libraryDir),
    filename: (_req, file, cb) => {
      const safeName = (file.originalname || 'file').replace(/\s+/g, '-').toLowerCase();
      cb(null, `library-file-${Date.now()}-${safeName}`);
    }
  }),
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain'
    ];
    if (allowed.includes(file.mimetype)) return cb(null, true);
    cb(new Error('Only PDF, Word, PowerPoint, Excel, or text files are allowed.'));
  }
});

async function persistUpload(req, folder, uploader) {
  let url = `/uploads/library/${req.file.filename}`;
  if (useCloudinary) {
    try {
      const result = await uploader(req.file.path, folder);
      url = result.url;
      try { fs.unlinkSync(req.file.path); } catch (_) {}
    } catch (cloudErr) {
      console.error('Cloudinary upload error:', cloudErr.message);
    }
  }
  return url;
}

// @route   GET /api/admin/library
router.get('/', async (req, res) => {
  try {
    const { status, category, search, type, limit = 50, skip = 0 } = req.query;
    const query = {};
    if (status) query.status = status;
    if (category) query.category = category;
    if (type) query.resourceType = type;
    if (search) {
      query.$or = [
        { title: new RegExp(search, 'i') },
        { itemId: new RegExp(search, 'i') },
        { description: new RegExp(search, 'i') },
        { tags: new RegExp(search, 'i') }
      ];
    }

    const [items, total] = await Promise.all([
      LibraryItem.find(query).sort({ sortOrder: 1, updatedAt: -1 }).skip(Number(skip)).limit(Math.min(Number(limit), 100)).lean(),
      LibraryItem.countDocuments(query)
    ]);

    res.json({ items, total });
  } catch (error) {
    console.error('Get library items error:', error);
    res.status(500).json({ error: 'Failed to fetch library items' });
  }
});

// @route   GET /api/admin/library/:id
router.get('/:id', async (req, res) => {
  try {
    const item = await LibraryItem.findById(req.params.id).lean();
    if (!item) return res.status(404).json({ error: 'Library item not found' });
    res.json(item);
  } catch (error) {
    console.error('Get library item error:', error);
    res.status(500).json({ error: 'Failed to fetch library item' });
  }
});

// @route   POST /api/admin/library/upload-cover
router.post('/upload-cover', coverUpload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const url = await persistUpload(req, 'forex/library/covers', uploadImage);
    res.json({ message: 'Cover uploaded', url, filename: req.file.filename });
  } catch (error) {
    console.error('Library cover upload error:', error);
    res.status(500).json({ error: error.message || 'Failed to upload cover' });
  }
});

// @route   POST /api/admin/library/upload-file
router.post('/upload-file', fileUpload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const url = await persistUpload(req, 'forex/library/documents', uploadDocument);
    res.json({ message: 'File uploaded', url, filename: req.file.filename });
  } catch (error) {
    console.error('Library file upload error:', error);
    res.status(500).json({ error: error.message || 'Failed to upload file' });
  }
});

// @route   POST /api/admin/library
router.post('/', async (req, res) => {
  try {
    const {
      itemId,
      title,
      status = 'draft',
      description,
      resourceType = 'link',
      externalUrl,
      fileUrl,
      coverImage,
      category,
      tags,
      allowedPackages,
      author,
      sortOrder = 0,
      seoTitle,
      seoMetaDescription
    } = req.body;

    if (!itemId || !title) {
      return res.status(400).json({ error: 'Item ID and title are required' });
    }

    const slug = String(itemId).toLowerCase().trim();
    const existing = await LibraryItem.findOne({ itemId: slug });
    if (existing) {
      return res.status(400).json({ error: 'A library item with this ID already exists' });
    }

    const item = await LibraryItem.create({
      itemId: slug,
      title: String(title).trim(),
      status: ['draft', 'published', 'archived'].includes(status) ? status : 'draft',
      description: description?.trim() || '',
      resourceType: ['link', 'google_sheet', 'pdf', 'document', 'book', 'video'].includes(resourceType) ? resourceType : 'link',
      externalUrl: externalUrl?.trim() || '',
      fileUrl: fileUrl?.trim() || '',
      coverImage: coverImage?.trim() || '',
      category: category?.trim() || '',
      tags: Array.isArray(tags) ? tags.map((t) => String(t).trim()).filter(Boolean) : [],
      allowedPackages: sanitizeAllowedPackages(allowedPackages),
      author: author?.trim() || '',
      sortOrder: Number(sortOrder) || 0,
      seoTitle: seoTitle?.trim() || '',
      seoMetaDescription: seoMetaDescription?.trim() || ''
    });

    res.status(201).json(item);
  } catch (error) {
    console.error('Create library item error:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ error: 'Validation failed', details: error.message });
    }
    res.status(500).json({ error: 'Failed to create library item' });
  }
});

// @route   PUT /api/admin/library/:id
router.put('/:id', async (req, res) => {
  try {
    const item = await LibraryItem.findById(req.params.id);
    if (!item) return res.status(404).json({ error: 'Library item not found' });

    const body = req.body;
    if (body.title !== undefined) item.title = String(body.title).trim();
    if (body.status !== undefined && ['draft', 'published', 'archived'].includes(body.status)) item.status = body.status;
    if (body.description !== undefined) item.description = body.description?.trim() || '';
    if (body.resourceType !== undefined && ['link', 'google_sheet', 'pdf', 'document', 'book', 'video'].includes(body.resourceType)) {
      item.resourceType = body.resourceType;
    }
    if (body.externalUrl !== undefined) item.externalUrl = body.externalUrl?.trim() || '';
    if (body.fileUrl !== undefined) item.fileUrl = body.fileUrl?.trim() || '';
    if (body.coverImage !== undefined) item.coverImage = body.coverImage?.trim() || '';
    if (body.category !== undefined) item.category = body.category?.trim() || '';
    if (body.tags !== undefined) item.tags = Array.isArray(body.tags) ? body.tags.map((t) => String(t).trim()).filter(Boolean) : item.tags;
    if (body.allowedPackages !== undefined) item.allowedPackages = sanitizeAllowedPackages(body.allowedPackages);
    if (body.author !== undefined) item.author = body.author?.trim() || '';
    if (body.sortOrder !== undefined) item.sortOrder = Number(body.sortOrder) || 0;
    if (body.seoTitle !== undefined) item.seoTitle = body.seoTitle?.trim() || '';
    if (body.seoMetaDescription !== undefined) item.seoMetaDescription = body.seoMetaDescription?.trim() || '';

    await item.save();
    res.json(item);
  } catch (error) {
    console.error('Update library item error:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ error: 'Validation failed', details: error.message });
    }
    res.status(500).json({ error: 'Failed to update library item' });
  }
});

// @route   DELETE /api/admin/library/:id
router.delete('/:id', async (req, res) => {
  try {
    const item = await LibraryItem.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ error: 'Library item not found' });
    res.json({ message: 'Library item deleted successfully' });
  } catch (error) {
    console.error('Delete library item error:', error);
    res.status(500).json({ error: 'Failed to delete library item' });
  }
});

module.exports = router;
