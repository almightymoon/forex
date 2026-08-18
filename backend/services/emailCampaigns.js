const crypto = require('crypto');
const EmailCampaign = require('../models/EmailCampaign');
const EmailCampaignRecipient = require('../models/EmailCampaignRecipient');
const EmailButtonClick = require('../models/EmailButtonClick');
const {
  applyVariables,
  wrapHtmlEmail,
  buttonMarkup,
  injectActionButtons,
  getPublicAppUrl,
} = require('./htmlEmail');

function newToken() {
  return crypto.randomBytes(24).toString('hex');
}

function sanitizeButtons(buttons) {
  if (!Array.isArray(buttons)) return [];
  const seen = new Set();
  return buttons
    .filter((button) => button && String(button.label || '').trim())
    .slice(0, 6)
    .map((button, index) => {
      let id = String(button.id || `btn_${index + 1}`).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40) || `btn_${index + 1}`;
      if (seen.has(id)) id = `${id}_${index + 1}`;
      seen.add(id);
      return {
        id,
        label: String(button.label).trim().slice(0, 80),
        color: /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(String(button.color || ''))
          ? String(button.color)
          : index === 0
            ? '#dc2626'
            : '#4b5563',
      };
    });
}

function buttonUrls(token, buttons) {
  const base = getPublicAppUrl();
  const urls = {};
  (buttons || []).forEach((button) => {
    urls[button.id] = `${base}/e/r/${token}?b=${encodeURIComponent(button.id)}`;
  });
  return urls;
}

function renderTrackedHtml({ html, subject, vars, token, buttons }) {
  const urls = buttonUrls(token, buttons);
  const withVars = applyVariables(html, vars);
  const markup = buttonMarkup(buttons, urls);
  const withButtons = injectActionButtons(withVars, markup, urls);
  return wrapHtmlEmail(withButtons, subject);
}

async function createCampaignAndRecipients({
  subject,
  html,
  buttons,
  recipients,
  createdBy,
  isTest = false,
  confirmationMessage,
}) {
  const safeButtons = sanitizeButtons(buttons);
  const campaign = await EmailCampaign.create({
    name: subject,
    subject,
    html,
    buttons: safeButtons,
    confirmationMessage,
    isTest,
    recipientCount: recipients.length,
    createdBy,
    sentAt: new Date(),
  });

  const docs = recipients.map((recipient) => {
    const firstName = recipient.user?.firstName || '';
    const lastName = recipient.user?.lastName || '';
    return {
      campaign: campaign._id,
      token: newToken(),
      email: String(recipient.email || '').toLowerCase().trim(),
      name: `${firstName} ${lastName}`.trim(),
      user: recipient.user?._id || undefined,
    };
  });

  const created = await EmailCampaignRecipient.insertMany(docs, { ordered: false });
  const byEmail = new Map(created.map((row) => [String(row.email).toLowerCase(), row]));
  return { campaign, recipientsByEmail: byEmail };
}

function publicCampaignView(campaign) {
  return {
    subject: campaign.subject,
    confirmationMessage: campaign.confirmationMessage || 'Thanks, your response has been recorded.',
    buttons: (campaign.buttons || []).map((button) => ({
      id: button.id,
      label: button.label,
      color: button.color,
    })),
  };
}

async function recordClick({ token, buttonId, ipAddress, userAgent }) {
  const recipient = await EmailCampaignRecipient.findOne({ token: String(token || '').trim() });
  if (!recipient) {
    return { status: 404, error: 'This link is invalid or has expired' };
  }

  const campaign = await EmailCampaign.findById(recipient.campaign);
  if (!campaign) {
    return { status: 404, error: 'This email campaign is no longer available' };
  }

  const requestedId = String(buttonId || '').trim();
  const button = (campaign.buttons || []).find((item) => item.id === requestedId);
  if (!button) {
    return {
      status: 400,
      error: 'Choose a response',
      campaign: publicCampaignView(campaign),
    };
  }

  try {
    await EmailButtonClick.create({
      campaign: campaign._id,
      recipient: recipient._id,
      buttonId: button.id,
      buttonLabel: button.label,
      email: recipient.email,
      name: recipient.name,
      ipAddress: String(ipAddress || '').slice(0, 80),
      userAgent: String(userAgent || '').slice(0, 400),
      clickedAt: new Date(),
    });
    await EmailCampaign.updateOne({ _id: campaign._id }, { $inc: { responseCount: 1 } });
  } catch (error) {
    if (error?.code !== 11000) throw error;
    await EmailButtonClick.updateOne(
      { campaign: campaign._id, email: recipient.email },
      {
        $set: {
          recipient: recipient._id,
          buttonId: button.id,
          buttonLabel: button.label,
          name: recipient.name,
          ipAddress: String(ipAddress || '').slice(0, 80),
          userAgent: String(userAgent || '').slice(0, 400),
          clickedAt: new Date(),
        },
      }
    );
  }

  return {
    status: 200,
    campaign: publicCampaignView(campaign),
    button: { id: button.id, label: button.label },
    confirmationMessage: campaign.confirmationMessage || 'Thanks, your response has been recorded.',
  };
}

async function loadPublicAction(token) {
  const recipient = await EmailCampaignRecipient.findOne({ token: String(token || '').trim() });
  if (!recipient) {
    return { status: 404, error: 'This link is invalid or has expired' };
  }
  const campaign = await EmailCampaign.findById(recipient.campaign).lean();
  if (!campaign) {
    return { status: 404, error: 'This email campaign is no longer available' };
  }
  const existing = await EmailButtonClick.findOne({ campaign: campaign._id, email: recipient.email }).lean();
  return {
    status: 200,
    campaign: publicCampaignView(campaign),
    existing: existing
      ? { buttonId: existing.buttonId, buttonLabel: existing.buttonLabel, clickedAt: existing.clickedAt }
      : null,
  };
}

module.exports = {
  newToken,
  sanitizeButtons,
  buttonUrls,
  renderTrackedHtml,
  createCampaignAndRecipients,
  recordClick,
  loadPublicAction,
  EmailCampaign,
  EmailCampaignRecipient,
  EmailButtonClick,
};
