const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { authenticateToken, requireTeacher } = require('../middleware/auth');
const { uploadImage, uploadVideo, uploadDocument } = require('../config/cloudinary');

const router = express.Router();

const useCloudinary = !!(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);

// Ensure upload directory exists
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'course-content');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const safeName = file.originalname.replace(/\s+/g, '-').toLowerCase();
    cb(null, `${timestamp}-${safeName}`);
  }
});

const allowedMimeTypes = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'video/mp4',
  'video/quicktime',
  'video/x-msvideo',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation'
];

const upload = multer({
  storage,
  limits: {
    fileSize: 25 * 1024 * 1024 // 25MB
  },
  fileFilter: (req, file, cb) => {
    if (!allowedMimeTypes.includes(file.mimetype)) {
      return cb(new Error('Invalid file type. Please upload images, videos, or documents only.'));
    }
    cb(null, true);
  }
});

const IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const VIDEO_MIMES = ['video/mp4', 'video/quicktime', 'video/x-msvideo'];

router.post('/', authenticateToken, requireTeacher, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'No file uploaded',
        message: 'Please provide a file to upload.'
      });
    }

    let url = `/uploads/course-content/${req.file.filename}`;

    if (useCloudinary) {
      try {
        const mimetype = req.file.mimetype;
        const filePath = req.file.path;

        if (IMAGE_MIMES.includes(mimetype)) {
          const result = await uploadImage(filePath, 'forex/course-content');
          url = result.url;
        } else if (VIDEO_MIMES.includes(mimetype)) {
          const result = await uploadVideo(filePath, 'forex/course-content/videos');
          url = result.url;
        } else {
          const result = await uploadDocument(filePath, 'forex/course-content/documents');
          url = result.url;
        }

        try { fs.unlinkSync(filePath); } catch (_) {}
      } catch (cloudErr) {
        console.error('Cloudinary upload error (using local file):', cloudErr.message);
      }
    }

    res.json({
      message: 'File uploaded successfully',
      url,
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size
    });
  } catch (error) {
    console.error('File upload error:', error);

    let message = 'Failed to upload file';
    if (error.message) {
      message = error.message;
    }

    res.status(500).json({
      error: 'Upload failed',
      message
    });
  }
});

module.exports = router;






