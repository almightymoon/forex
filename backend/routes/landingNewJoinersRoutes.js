const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const LandingNewJoiners = require('../models/LandingNewJoiners');
const { uploadImage } = require('../config/cloudinary');

const router = express.Router();

const useCloudinary = !!(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);

const uploadDir = path.join(__dirname, '..', 'uploads', 'landing-new-joiners');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDir),
    filename: (_req, file, cb) => {
      const timestamp = Date.now();
      const safe = (file.originalname || 'image')
        .replace(/\s+/g, '-')
        .replace(/[^a-zA-Z0-9._-]/g, '')
        .toLowerCase();
      cb(null, `${timestamp}-${safe}`);
    },
  }),
  limits: { fileSize: 12 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.mimetype);
    if (!ok) return cb(new Error('Invalid file type. Upload jpg/png/gif/webp only.'));
    cb(null, true);
  },
});

router.get('/', async (req, res) => {
  try {
    const doc = await LandingNewJoiners.getDoc();
    const o = doc.toObject();
    res.json({ success: true, data: o });
  } catch (error) {
    console.error('landingNewJoiners GET error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to load' });
  }
});

router.put('/', async (req, res) => {
  try {
    const doc = await LandingNewJoiners.upsertFromBody(req.body, req.user?._id);
    res.json({ success: true, data: doc.toObject() });
  } catch (error) {
    console.error('landingNewJoiners PUT error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to save' });
  }
});

router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    let url = `/uploads/landing-new-joiners/${req.file.filename}`;

    if (useCloudinary) {
      try {
        const result = await uploadImage(req.file.path, 'forex/landing-new-joiners');
        url = result.url;
        try {
          fs.unlinkSync(req.file.path);
        } catch (_) {}
      } catch (cloudErr) {
        console.error('Cloudinary upload error (landing new joiners):', cloudErr.message);
      }
    }

    res.json({ success: true, url });
  } catch (error) {
    console.error('landingNewJoiners upload error:', error);
    res.status(500).json({ success: false, error: error.message || 'Upload failed' });
  }
});

module.exports = router;
