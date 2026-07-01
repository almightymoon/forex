const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AppCampaign = require('../models/AppCampaign');
const { getUserPackagePrice, isPrivilegedCourseViewer } = require('./coursePackageAccess');

async function optionalUserFromRequest(req) {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return null;
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
    const user = await User.findById(decoded.userId).select('-password').lean();
    return user || null;
  } catch {
    return null;
  }
}

function packageOpenToAll(allowedPackages) {
  return (
    allowedPackages == null ||
    (Array.isArray(allowedPackages) && allowedPackages.length === 0)
  );
}

function matchesAudience(campaign, user, userPackagePrice) {
  const audience = campaign.audience || 'authenticated';

  if (audience === 'all') {
    // still apply package filter below
  } else if (audience === 'guest') {
    if (user) return false;
  } else if (audience === 'authenticated') {
    if (!user) return false;
  } else if (audience === 'student') {
    if (!user || user.role !== 'student') return false;
  } else if (audience === 'teacher') {
    if (!user || !['teacher', 'instructor'].includes(user.role)) return false;
  } else if (audience === 'admin') {
    if (!user || !['admin', 'developer'].includes(user.role)) return false;
  }

  if (!packageOpenToAll(campaign.allowedPackages)) {
    if (!user) return false;
    if (isPrivilegedCourseViewer(user.role)) return true;
    if (userPackagePrice == null) return false;
    if (!campaign.allowedPackages.includes(userPackagePrice)) return false;
  }

  return true;
}

function toPublicCampaign(campaign) {
  return {
    campaignId: campaign.campaignId,
    version: campaign.version,
    title: campaign.title,
    body: campaign.body,
    badge: campaign.badge || '',
    imageUrl: campaign.imageUrl || '',
    cta: {
      label: campaign.cta?.label || 'Learn more',
      action: campaign.cta?.action || 'dismiss_only',
      url: campaign.cta?.url || '',
      route: campaign.cta?.route || '',
    },
    showDismissButton: campaign.showDismissButton !== false,
    dismissMode: campaign.dismissMode || 'campaign',
    frequency: campaign.frequency || 'once_per_session',
  };
}

async function resolveActiveCampaign({ platform, user, userPackagePrice }) {
  const now = new Date();
  const plat = platform === 'web' ? 'web' : 'mobile';

  const candidates = await AppCampaign.find({
    status: 'published',
    startAt: { $lte: now },
    endAt: { $gte: now },
    platforms: plat,
  })
    .sort({ priority: -1, publishedAt: -1, updatedAt: -1 })
    .lean();

  for (const campaign of candidates) {
    if (matchesAudience(campaign, user, userPackagePrice)) {
      return toPublicCampaign(campaign);
    }
  }

  return null;
}

async function getCampaignContext(req) {
  const user = await optionalUserFromRequest(req);
  let userPackagePrice = null;
  if (user && !isPrivilegedCourseViewer(user.role)) {
    const pkg = await getUserPackagePrice(user);
    userPackagePrice = pkg.userPackagePrice;
  }
  return { user, userPackagePrice };
}

module.exports = {
  optionalUserFromRequest,
  matchesAudience,
  toPublicCampaign,
  resolveActiveCampaign,
  getCampaignContext,
};
