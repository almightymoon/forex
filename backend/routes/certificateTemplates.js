const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const CertificateTemplate = require('../models/CertificateTemplate');
const { authenticateToken } = require('../middleware/auth');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'public/uploads/certificate-templates';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|svg|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
});

// Get all templates (public and user's private ones)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const query = {
      $or: [
        { isPublic: true },
        { createdBy: req.user._id }
      ],
      isActive: true
    };

    if (req.query.category) {
      query.category = req.query.category;
    }

    if (req.query.search) {
      query.$or = [
        { name: { $regex: req.query.search, $options: 'i' } },
        { description: { $regex: req.query.search, $options: 'i' } },
        { tags: { $in: [new RegExp(req.query.search, 'i')] } }
      ];
    }

    const templates = await CertificateTemplate.find(query)
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      templates: templates
    });
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch templates'
    });
  }
});

// Get a specific template
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const template = await CertificateTemplate.findById(req.params.id)
      .populate('createdBy', 'name email');

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }

    // Check if user has access to this template
    if (!template.isPublic && template.createdBy._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.json({
      success: true,
      template: template
    });
  } catch (error) {
    console.error('Error fetching template:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch template'
    });
  }
});

// Create a new template
router.post('/', authenticateToken, upload.single('backgroundImage'), async (req, res) => {
  try {
    const {
      name,
      description,
      category,
      backgroundColor,
      elements,
      dimensions,
      tags
    } = req.body;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Background image is required'
      });
    }

    const backgroundImageUrl = `/uploads/certificate-templates/${req.file.filename}`;

    const template = new CertificateTemplate({
      name,
      description,
      category,
      backgroundImage: backgroundImageUrl,
      backgroundColor,
      elements: JSON.parse(elements || '[]'),
      dimensions: JSON.parse(dimensions || '{}'),
      tags: JSON.parse(tags || '[]'),
      createdBy: req.user._id
    });

    await template.save();

    res.status(201).json({
      success: true,
      message: 'Template created successfully',
      template: template
    });
  } catch (error) {
    console.error('Error creating template:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create template'
    });
  }
});

// Update a template
router.put('/:id', authenticateToken, upload.single('backgroundImage'), async (req, res) => {
  try {
    const template = await CertificateTemplate.findById(req.params.id);

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }

    // Check ownership
    if (template.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const updateData = { ...req.body };

    // Handle background image update
    if (req.file) {
      // Delete old image if it exists
      if (template.backgroundImage) {
        const oldImagePath = path.join('public', template.backgroundImage);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
      updateData.backgroundImage = `/uploads/certificate-templates/${req.file.filename}`;
    }

    // Parse JSON fields
    if (updateData.elements) {
      updateData.elements = JSON.parse(updateData.elements);
    }
    if (updateData.dimensions) {
      updateData.dimensions = JSON.parse(updateData.dimensions);
    }
    if (updateData.tags) {
      updateData.tags = JSON.parse(updateData.tags);
    }

    const updatedTemplate = await CertificateTemplate.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'Template updated successfully',
      template: updatedTemplate
    });
  } catch (error) {
    console.error('Error updating template:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update template'
    });
  }
});

// Delete a template
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const template = await CertificateTemplate.findById(req.params.id);

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }

    // Check ownership
    if (template.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Delete background image
    if (template.backgroundImage) {
      const imagePath = path.join('public', template.backgroundImage);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    await CertificateTemplate.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Template deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting template:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete template'
    });
  }
});

// Duplicate a template
router.post('/:id/duplicate', authenticateToken, async (req, res) => {
  try {
    const originalTemplate = await CertificateTemplate.findById(req.params.id);

    if (!originalTemplate) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }

    // Check if user has access to duplicate this template
    if (!originalTemplate.isPublic && originalTemplate.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Create a copy of the background image
    let newBackgroundImage = originalTemplate.backgroundImage;
    if (originalTemplate.backgroundImage) {
      const oldImagePath = path.join('public', originalTemplate.backgroundImage);
      if (fs.existsSync(oldImagePath)) {
        const ext = path.extname(originalTemplate.backgroundImage);
        const newFilename = `backgroundImage-${Date.now()}-${Math.round(Math.random() * 1E9)}${ext}`;
        const newImagePath = path.join('public/uploads/certificate-templates', newFilename);
        
        fs.copyFileSync(oldImagePath, newImagePath);
        newBackgroundImage = `/uploads/certificate-templates/${newFilename}`;
      }
    }

    const duplicatedTemplate = new CertificateTemplate({
      ...originalTemplate.toObject(),
      _id: undefined,
      name: `${originalTemplate.name} (Copy)`,
      backgroundImage: newBackgroundImage,
      createdBy: req.user._id,
      isPublic: false,
      usageCount: 0
    });

    await duplicatedTemplate.save();

    res.status(201).json({
      success: true,
      message: 'Template duplicated successfully',
      template: duplicatedTemplate
    });
  } catch (error) {
    console.error('Error duplicating template:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to duplicate template'
    });
  }
});

// Get template categories
router.get('/categories/list', async (req, res) => {
  try {
    const categories = await CertificateTemplate.distinct('category');
    res.json({
      success: true,
      categories: categories
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch categories'
    });
  }
});

// Get popular templates
router.get('/popular/list', async (req, res) => {
  try {
    const popularTemplates = await CertificateTemplate.find({
      isPublic: true,
      isActive: true
    })
    .sort({ usageCount: -1 })
    .limit(10)
    .populate('createdBy', 'name');

    res.json({
      success: true,
      templates: popularTemplates
    });
  } catch (error) {
    console.error('Error fetching popular templates:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch popular templates'
    });
  }
});

module.exports = router;
