const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const AppCampaign = require('../models/AppCampaign');
const { uploadImage } = require('../config/cloudinary');
const { sanitizeAllowedPackages } = require('../utils/coursePayload');
const { notifyCampaignPublished } = require('../utils/appCampaign');

const router = express.Router();

const useCloudinary = !!(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);

const campaignDir = path.join(__dirname, '..', 'uploads', 'campaigns');
if (!fs.existsSync(campaignDir)) {
  fs.mkdirSync(campaignDir, { recursive: true });
}

const imageUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, campaignDir),
    filename: (_req, file, cb) => {
      const safeName = (file.originalname || 'image').replace(/\s+/g, '-').toLowerCase();
      cb(null, `campaign-${Date.now()}-${safeName}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowed.includes(file.mimetype)) return cb(null, true);
    cb(new Error('Only JPEG, PNG, GIF, or WebP images are allowed.'));
  },
});

async function persistUpload(req) {
  let url = `/uploads/campaigns/${req.file.filename}`;
  if (useCloudinary) {
    try {
      const result = await uploadImage(req.file.path, 'forex/campaigns');
      url = result.url;
      try {
        fs.unlinkSync(req.file.path);
      } catch (_) {}
    } catch (cloudErr) {
      console.error('Campaign image upload error:', cloudErr.message);
    }
  }
  return url;
}

function parsePlatforms(value) {
  if (!value) return ['mobile', 'web'];
  const list = Array.isArray(value) ? value : String(value).split(',');
  const out = list.map((p) => String(p).trim().toLowerCase()).filter((p) => p === 'mobile' || p === 'web');
  return out.length ? out : ['mobile', 'web'];
}

function applyCampaignBody(campaign, body, { bumpVersion = false } = {}) {
  if (body.name !== undefined) campaign.name = String(body.name).trim();
  if (body.title !== undefined) campaign.title = String(body.title).trim();
  if (body.body !== undefined) campaign.body = String(body.body).trim();
  if (body.badge !== undefined) campaign.badge = String(body.badge).trim();
  if (body.imageUrl !== undefined) campaign.imageUrl = String(body.imageUrl).trim();
  if (body.showDismissButton !== undefined) campaign.showDismissButton = Boolean(body.showDismissButton);
  if (body.dismissMode !== undefined && ['session', 'day', 'campaign'].includes(body.dismissMode)) {
    campaign.dismissMode = body.dismissMode;
  }
  if (body.startAt !== undefined) campaign.startAt = new Date(body.startAt);
  if (body.endAt !== undefined) campaign.endAt = new Date(body.endAt);
  if (body.platforms !== undefined) campaign.platforms = parsePlatforms(body.platforms);
  if (body.audience !== undefined && ['all', 'guest', 'authenticated', 'student', 'teacher', 'admin'].includes(body.audience)) {
    campaign.audience = body.audience;
  }
  if (body.allowedPackages !== undefined) {
    campaign.allowedPackages = sanitizeAllowedPackages(body.allowedPackages);
  }
  if (body.frequency !== undefined && ['once_per_session', 'once_per_day', 'every_open'].includes(body.frequency)) {
    campaign.frequency = body.frequency;
  }
  if (body.priority !== undefined) campaign.priority = Number(body.priority) || 0;
  if (body.status !== undefined && ['draft', 'published', 'archived'].includes(body.status)) {
    campaign.status = body.status;
    if (body.status === 'published' && !campaign.publishedAt) {
      campaign.publishedAt = new Date();
    }
  }
  if (body.cta !== undefined && typeof body.cta === 'object') {
    campaign.cta = {
      label: String(body.cta.label || campaign.cta?.label || 'Learn more').trim(),
      action: ['link', 'route', 'dismiss_only'].includes(body.cta.action) ? body.cta.action : 'dismiss_only',
      url: String(body.cta.url || '').trim(),
      route: String(body.cta.route || '').trim(),
    };
  }
  if (bumpVersion) {
    campaign.version = (campaign.version || 1) + 1;
  }

  if (campaign.audience === 'all') {
    campaign.platforms = Array.from(new Set([...(campaign.platforms || []), 'mobile', 'web']));
  }
}

router.get('/', async (req, res) => {
  try {
    const { status, search, limit = 50, skip = 0 } = req.query;
    const query = {};
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { name: new RegExp(search, 'i') },
        { campaignId: new RegExp(search, 'i') },
        { title: new RegExp(search, 'i') },
      ];
    }
    const [items, total] = await Promise.all([
      AppCampaign.find(query)
        .sort({ priority: -1, updatedAt: -1 })
        .skip(Number(skip))
        .limit(Math.min(Number(limit), 100))
        .lean(),
      AppCampaign.countDocuments(query),
    ]);
    res.json({ items, total });
  } catch (error) {
    console.error('List campaigns error:', error);
    res.status(500).json({ error: 'Failed to fetch campaigns' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const item = await AppCampaign.findById(req.params.id).lean();
    if (!item) return res.status(404).json({ error: 'Campaign not found' });
    res.json(item);
  } catch (error) {
    console.error('Get campaign error:', error);
    res.status(500).json({ error: 'Failed to fetch campaign' });
  }
});

router.post('/upload-image', imageUpload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const url = await persistUpload(req);
    res.json({ message: 'Image uploaded', url });
  } catch (error) {
    console.error('Campaign image upload error:', error);
    res.status(500).json({ error: error.message || 'Failed to upload image' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { campaignId, name, title, startAt, endAt } = req.body;
    if (!campaignId || !name || !title || !startAt || !endAt) {
      return res.status(400).json({ error: 'campaignId, name, title, startAt, and endAt are required' });
    }
    const slug = String(campaignId).toLowerCase().trim();
    const existing = await AppCampaign.findOne({ campaignId: slug });
    if (existing) {
      return res.status(400).json({ error: 'A campaign with this ID already exists' });
    }

    const campaign = new AppCampaign({
      campaignId: slug,
      name: String(name).trim(),
      title: String(title).trim(),
      startAt: new Date(startAt),
      endAt: new Date(endAt),
      createdBy: req.user?._id,
    });
    applyCampaignBody(campaign, req.body);
    await campaign.save();
    res.status(201).json(campaign);
  } catch (error) {
    console.error('Create campaign error:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ error: 'Validation failed', details: error.message });
    }
    res.status(500).json({ error: 'Failed to create campaign' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const campaign = await AppCampaign.findById(req.params.id);
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

    const contentFields = ['title', 'body', 'badge', 'imageUrl', 'cta'];
    const contentChanged = contentFields.some((f) => req.body[f] !== undefined);
    applyCampaignBody(campaign, req.body, { bumpVersion: contentChanged && campaign.status === 'published' });
    await campaign.save();

    if (
      campaign.status === 'published' &&
      contentChanged &&
      (campaign.lastNotifiedVersion || 0) < (campaign.version || 1)
    ) {
      setImmediate(() => {
        notifyCampaignPublished(campaign.toObject()).catch((err) => {
          console.error('[Campaign] Update notification batch failed:', err.message);
        });
      });
    }

    res.json(campaign);
  } catch (error) {
    console.error('Update campaign error:', error);
    res.status(500).json({ error: 'Failed to update campaign' });
  }
});

router.post('/:id/publish', async (req, res) => {
  try {
    const campaign = await AppCampaign.findById(req.params.id);
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

    // "All" audience campaigns should reach both web and mobile surfaces.
    if (campaign.audience === 'all') {
      const platforms = new Set(campaign.platforms || []);
      platforms.add('mobile');
      platforms.add('web');
      campaign.platforms = Array.from(platforms);
    }

    campaign.status = 'published';
    campaign.publishedAt = campaign.publishedAt || new Date();
    await campaign.save();

    const shouldNotify = (campaign.lastNotifiedVersion || 0) < (campaign.version || 1);
    if (shouldNotify) {
      setImmediate(() => {
        notifyCampaignPublished(campaign.toObject()).catch((err) => {
          console.error('[Campaign] Publish notification batch failed:', err.message);
        });
      });
    }

    res.json(campaign);
  } catch (error) {
    console.error('Publish campaign error:', error);
    res.status(500).json({ error: 'Failed to publish campaign' });
  }
});

router.post('/:id/archive', async (req, res) => {
  try {
    const campaign = await AppCampaign.findById(req.params.id);
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
    campaign.status = 'archived';
    await campaign.save();
    res.json(campaign);
  } catch (error) {
    console.error('Archive campaign error:', error);
    res.status(500).json({ error: 'Failed to archive campaign' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const campaign = await AppCampaign.findByIdAndDelete(req.params.id);
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
    res.json({ message: 'Campaign deleted' });
  } catch (error) {
    console.error('Delete campaign error:', error);
    res.status(500).json({ error: 'Failed to delete campaign' });
  }
});

module.exports = router;
