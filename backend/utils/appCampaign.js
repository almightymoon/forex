const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AppCampaign = require('../models/AppCampaign');
const notificationService = require('../services/notificationService');
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
    layout: campaign.layout || 'standard',
    showTitle: campaign.showTitle !== false,
    showBody: campaign.showBody !== false,
    showBadge: campaign.showBadge !== false,
    showCtaButton: campaign.showCtaButton !== false,
    showBorder: campaign.showBorder !== false,
    imageClickable: campaign.imageClickable === true,
    imageFit: campaign.imageFit || 'cover',
    imageHeight: campaign.imageHeight || 'medium',
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

function buildCampaignNotificationLink(campaign) {
  const action = campaign.cta?.action || 'dismiss_only';
  if (action === 'link' && campaign.cta?.url) return campaign.cta.url;
  if (action === 'route' && campaign.cta?.route) return campaign.cta.route;
  return null;
}

async function getCampaignNotificationRecipients(campaign) {
  const audience = campaign.audience || 'authenticated';
  if (audience === 'guest') return [];

  const query = {};
  if (audience === 'student') {
    query.role = 'student';
  } else if (audience === 'teacher') {
    query.role = { $in: ['teacher', 'instructor'] };
  } else if (audience === 'admin') {
    query.role = { $in: ['admin', 'developer'] };
  }

  const users = await User.find(query).select('_id role').lean();
  if (packageOpenToAll(campaign.allowedPackages)) {
    return users.map((u) => u._id);
  }

  const eligible = [];
  for (const user of users) {
    if (isPrivilegedCourseViewer(user.role)) {
      eligible.push(user._id);
      continue;
    }
    const fullUser = await User.findById(user._id).select('-password');
    if (!fullUser) continue;
    const pkg = await getUserPackagePrice(fullUser);
    if (pkg.userPackagePrice != null && campaign.allowedPackages.includes(pkg.userPackagePrice)) {
      eligible.push(user._id);
    }
  }
  return eligible;
}

async function notifyCampaignPublished(campaign) {
  const version = campaign.version || 1;
  if ((campaign.lastNotifiedVersion || 0) >= version) {
    return { skipped: true, reason: 'already_notified_for_version' };
  }

  const userIds = await getCampaignNotificationRecipients(campaign);
  if (!userIds.length) {
    return { skipped: true, reason: 'no_recipients', count: 0 };
  }

  const title = campaign.title || campaign.name || 'New promotion';
  const message = (campaign.body || '').trim() || title;
  const link = buildCampaignNotificationLink(campaign);

  let sent = 0;
  let failed = 0;
  const batchSize = 40;

  for (let i = 0; i < userIds.length; i += batchSize) {
    const batch = userIds.slice(i, i + batchSize);
    const results = await Promise.all(
      batch.map((userId) =>
        notificationService
          .createNotification({
            user: userId,
            type: 'system',
            title,
            message,
            link,
          })
          .then(() => ({ ok: true }))
          .catch((err) => {
            console.error('[Campaign] Notification failed for user', userId, err.message);
            return { ok: false };
          }),
      ),
    );
    sent += results.filter((r) => r.ok).length;
    failed += results.filter((r) => !r.ok).length;
  }

  await AppCampaign.updateOne(
    { _id: campaign._id },
    { $set: { lastNotifiedVersion: version } },
  );

  return { sent, failed, total: userIds.length };
}

module.exports = {
  optionalUserFromRequest,
  matchesAudience,
  toPublicCampaign,
  resolveActiveCampaign,
  getCampaignContext,
  notifyCampaignPublished,
};
