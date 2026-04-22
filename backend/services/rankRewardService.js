const RankRewardRule = require('../models/RankRewardRule');
const RankRewardUnlock = require('../models/RankRewardUnlock');
const Notification = require('../models/Notification');
const notificationService = require('./notificationService');

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
    await notificationService.sendNotificationToUser(userId, 'system_alert', {
      title,
      message
    });
  } catch (e) {
    // best-effort
  }
}

async function notifyAdminsUnlocked(data) {
  try {
    await notificationService.sendAdminNotification('system_alert', {
      title: 'Rank reward unlocked',
      message: `${data.userEmail || 'A user'} unlocked "${data.ruleName}" at lifetime earned $${Number(
        data.lifetimeEarnedAtUnlock || 0
      ).toFixed(2)}.`
    });
  } catch (e) {
    // best-effort
  }
}

async function evaluateRankRewardsForUser({ userId, lifetimeEarned, userEmail }) {
  if (!userId) return { created: 0 };
  const earned = Number(lifetimeEarned);
  if (!Number.isFinite(earned) || earned <= 0) return { created: 0 };

  const rules = await RankRewardRule.find({ isActive: true })
    .sort({ thresholdBalance: 1, sortOrder: 1, createdAt: 1 })
    .lean();

  if (!rules || rules.length === 0) return { created: 0 };

  const eligible = rules.filter((r) => Number(r.thresholdBalance) <= earned);
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
      balanceAtUnlock: earned,
      status: 'unlocked'
    });
    created += 1;

    await notifyUserUnlocked(userId, {
      title: 'Rank reward unlocked',
      message: `Congratulations! You unlocked "${r.name}" (lifetime earned threshold $${Number(r.thresholdBalance).toFixed(
        2
      )}). Admin will deliver your reward soon.`,
      data: {
        rankRewardUnlockId: String(unlock._id),
        ruleId: String(r._id),
        ruleName: r.name,
        thresholdBalance: Number(r.thresholdBalance),
        lifetimeEarnedAtUnlock: earned
      }
    });

    await notifyAdminsUnlocked({
      userId,
      userEmail,
      ruleName: r.name,
      lifetimeEarnedAtUnlock: earned
    });
  }

  return { created };
}

module.exports = {
  evaluateRankRewardsForUser
};

