const RankRewardRule = require('../models/RankRewardRule');
const RankRewardUnlock = require('../models/RankRewardUnlock');
const Notification = require('../models/Notification');
const notificationService = require('./notificationService');
const User = require('../models/User');
const Payment = require('../models/Payment');

async function notifyUserUnlocked(userId, payload) {
  const title = payload?.title || 'Rank reward unlocked';
  const message = payload?.message || 'You have unlocked a new reward.';

  // In-app notification (always)
  try {
    await Notification.createNotification({
      userId,
      type: 'system',
      title,
      message,
      data: payload?.data || {},
      link: '/dashboard'
    });
  } catch (e) {
    // best-effort
  }

  // Email/SMS/Push (best-effort, uses default template if no specific template)
  try {
    const dashboardUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard/rank-rewards`;
    await notificationService.sendNotificationToUser(userId, 'rank_reward_unlocked', {
      title,
      message,
      ruleName: payload?.data?.ruleName,
      thresholdBalance: payload?.data?.thresholdBalance,
      directBusinessVolumeUsdAtUnlock: payload?.data?.directBusinessVolumeUsdAtUnlock,
      dashboardUrl
    });
  } catch (e) {
    // best-effort
  }
}

async function notifyAdminsUnlocked(data) {
  try {
    await notificationService.sendAdminNotification('system_alert', {
      title: 'Rank reward unlocked',
      message: `${data.userEmail || 'A user'} unlocked "${data.ruleName}" at $${Number(
        data.directBusinessVolumeUsdAtUnlock || 0
      ).toFixed(2)} direct-referral package volume.`
    });
  } catch (e) {
    // best-effort
  }
}

async function getDirectReferralBusinessVolumeUsd(userId) {
  const u = await User.findById(userId).select('referralCode').lean();
  const code = String(u?.referralCode || '').trim();
  if (!code) return 0;

  const directIds = await User.find({ parentReferralCode: code }).select('_id').lean();
  if (!directIds || directIds.length === 0) return 0;

  const ids = directIds.map((d) => d._id);

  const agg = await Payment.aggregate([
    { $match: { user: { $in: ids }, status: 'completed', type: 'package' } },
    {
      $group: {
        _id: null,
        total: { $sum: { $ifNull: ['$finalAmount', '$amount'] } }
      }
    }
  ]);

  return Number(agg?.[0]?.total || 0);
}

async function evaluateRankRewardsForUser({ userId, directBusinessVolumeUsd, userEmail }) {
  if (!userId) return { created: 0 };
  const vol = Number(directBusinessVolumeUsd);
  if (!Number.isFinite(vol) || vol < 0) return { created: 0 };

  const rules = await RankRewardRule.find({ isActive: true })
    .sort({ thresholdBalance: 1, sortOrder: 1, createdAt: 1 })
    .lean();

  if (!rules || rules.length === 0) return { created: 0 };

  const eligible = rules.filter((r) => Number(r.thresholdBalance) <= vol);
  if (eligible.length === 0) return { created: 0 };

  const existing = await RankRewardUnlock.find({
    user: userId,
    rule: { $in: eligible.map((r) => r._id) }
  })
    .select('rule')
    .lean();

  const existingRuleIds = new Set((existing || []).map((x) => String(x.rule)));

  let created = 0;
  for (const r of eligible) {
    if (existingRuleIds.has(String(r._id))) continue;
    const unlock = await RankRewardUnlock.create({
      user: userId,
      rule: r._id,
      thresholdBalance: Number(r.thresholdBalance) || 0,
      balanceAtUnlock: vol,
      status: 'unlocked'
    });
    created += 1;

    await notifyUserUnlocked(userId, {
      title: 'Rank reward unlocked',
      message: `Congratulations! You unlocked "${r.name}" (direct referral package volume threshold $${Number(
        r.thresholdBalance
      ).toFixed(2)}). Admin will deliver your reward soon.`,
      data: {
        rankRewardUnlockId: String(unlock._id),
        ruleId: String(r._id),
        ruleName: r.name,
        thresholdBalance: Number(r.thresholdBalance),
        directBusinessVolumeUsdAtUnlock: vol
      }
    });

    await notifyAdminsUnlocked({
      userId,
      userEmail,
      ruleName: r.name,
      directBusinessVolumeUsdAtUnlock: vol
    });
  }

  return { created };
}

module.exports = {
  evaluateRankRewardsForUser,
  getDirectReferralBusinessVolumeUsd
};

