const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticateToken } = require('../middleware/auth');
const TeacherCertificate = require('../models/TeacherCertificate');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads/teacher-certificates';
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
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, JPEG, and PNG files are allowed.'));
    }
  }
});

// @route   GET /api/teacher/certificates
// @desc    Get teacher's certificates
// @access  Private (Teacher only)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const certificates = await TeacherCertificate.find({ teacherId: req.user.id })
      .sort({ uploadedAt: -1 });

    res.json({
      success: true,
      certificates
    });
  } catch (error) {
    console.error('Error fetching teacher certificates:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch certificates'
    });
  }
});

// @route   POST /api/teacher/certificates/upload
// @desc    Upload teacher certificate
// @access  Private (Teacher only)
router.post('/upload', authenticateToken, upload.single('certificate'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const { name, description, issuer, issueDate, expiryDate } = req.body;

    if (!name || !issuer || !issueDate) {
      return res.status(400).json({
        success: false,
        message: 'Name, issuer, and issue date are required'
      });
    }

    const certificate = new TeacherCertificate({
      teacherId: req.user.id,
      name,
      description: description || '',
      issuer,
      issueDate: new Date(issueDate),
      expiryDate: expiryDate ? new Date(expiryDate) : null,
      certificateUrl: `/uploads/teacher-certificates/${req.file.filename}`,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      status: 'pending'
    });

    await certificate.save();

    res.json({
      success: true,
      message: 'Certificate uploaded successfully',
      certificate
    });
  } catch (error) {
    console.error('Error uploading certificate:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload certificate'
    });
  }
});

// @route   GET /api/teacher/certificates/:id/download
// @desc    Download teacher certificate
// @access  Private (Teacher only)
router.get('/:id/download', authenticateToken, async (req, res) => {
  try {
    const certificate = await TeacherCertificate.findOne({
      _id: req.params.id,
      teacherId: req.user.id
    });

    if (!certificate) {
      return res.status(404).json({
        success: false,
        message: 'Certificate not found'
      });
    }

    const filePath = path.join(__dirname, '..', certificate.certificateUrl);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'Certificate file not found'
      });
    }

    res.download(filePath, certificate.fileName);
  } catch (error) {
    console.error('Error downloading certificate:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to download certificate'
    });
  }
});

// @route   DELETE /api/teacher/certificates/:id
// @desc    Delete teacher certificate
// @access  Private (Teacher only)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const certificate = await TeacherCertificate.findOne({
      _id: req.params.id,
      teacherId: req.user.id
    });

    if (!certificate) {
      return res.status(404).json({
        success: false,
        message: 'Certificate not found'
      });
    }

    // Delete the file from filesystem
    const filePath = path.join(__dirname, '..', certificate.certificateUrl);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Delete from database
    await TeacherCertificate.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Certificate deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting certificate:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete certificate'
    });
  }
});

// @route   PUT /api/teacher/certificates/:id
// @desc    Update teacher certificate
// @access  Private (Teacher only)
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { name, description, issuer, issueDate, expiryDate } = req.body;

    if (!name || !issuer || !issueDate) {
      return res.status(400).json({
        success: false,
        message: 'Name, issuer, and issue date are required'
      });
    }

    const certificate = await TeacherCertificate.findOneAndUpdate(
      { 
        _id: req.params.id,
        teacherId: req.user.id 
      },
      {
        name,
        description: description || '',
        issuer,
        issueDate: new Date(issueDate),
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        updatedAt: new Date()
      },
      { new: true }
    );

    if (!certificate) {
      return res.status(404).json({
        success: false,
        message: 'Certificate not found'
      });
    }

    res.json({
      success: true,
      message: 'Certificate updated successfully',
      certificate
    });
  } catch (error) {
    console.error('Error updating certificate:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update certificate'
    });
  }
});

// @route   PUT /api/teacher/certificates/:id/status
// @desc    Update certificate status (Admin only)
// @access  Private (Admin only)
router.put('/:id/status', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    const { status } = req.body;
    
    if (!['verified', 'pending', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    const certificate = await TeacherCertificate.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!certificate) {
      return res.status(404).json({
        success: false,
        message: 'Certificate not found'
      });
    }

    res.json({
      success: true,
      message: 'Certificate status updated',
      certificate
    });
  } catch (error) {
    console.error('Error updating certificate status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update certificate status'
    });
  }
});

module.exports = router;
