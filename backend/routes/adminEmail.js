const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const EmailTemplate = require('../models/EmailTemplate');
const notificationService = require('../services/notificationService');
const { applyVariables, stripHtml, wrapHtmlEmail, normalizeEmailHtml } = require('../services/htmlEmail');
const {
  sanitizeButtons,
  renderTrackedHtml,
  createCampaignAndRecipients,
  EmailCampaign,
  EmailButtonClick,
} = require('../services/emailCampaigns');

const router = express.Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ROLE_MAP = {
  all: null,
  student: 'student',
  students: 'student',
  teacher: 'teacher',
  teachers: 'teacher',
  admin: 'admin',
  admins: 'admin',
};

function recipientVariables(user, extra = {}) {
  const firstName = user?.firstName || '';
  const lastName = user?.lastName || '';
  return {
    firstName,
    lastName,
    email: user?.email || extra.email || '',
    userName: `${firstName} ${lastName}`.trim() || extra.email || 'there',
    companyName: extra.companyName || 'Forex Navigators',
    ...(extra.variables || {}),
  };
}

function builtInTemplates() {
  const emailTemplates = require('../services/emailTemplates');
  return Object.entries(emailTemplates.templates || {}).map(([id, template]) => ({
    id,
    source: 'builtin',
    name: template.name,
    subject: template.subject || template.name,
    description: template.description || '',
    category: template.category || 'system',
    variables: template.variables || [],
    html: template.html || '',
    text: template.text || '',
  }));
}

router.get('/templates', async (_req, res) => {
  try {
    const custom = await EmailTemplate.find({}).sort({ updatedAt: -1 }).lean();
    res.json({
      success: true,
      builtin: builtInTemplates(),
      custom: custom.map((tpl) => ({ ...tpl, id: String(tpl._id), source: 'custom' })),
    });
  } catch (error) {
    console.error('List email templates error:', error);
    res.status(500).json({ error: 'Failed to list email templates', message: error.message });
  }
});

router.post(
  '/templates',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('subject').trim().notEmpty().withMessage('Subject is required'),
    body('html').notEmpty().withMessage('HTML is required'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: 'Validation failed', details: errors.array() });
      }

      const created = await EmailTemplate.create({
        name: req.body.name,
        subject: req.body.subject,
        description: req.body.description || '',
        html: req.body.html,
        text: req.body.text || stripHtml(req.body.html),
        category: req.body.category || 'custom',
        variables: Array.isArray(req.body.variables) ? req.body.variables : undefined,
        createdBy: req.user?._id,
      });

      res.status(201).json({ success: true, template: created });
    } catch (error) {
      console.error('Create email template error:', error);
      res.status(500).json({ error: 'Failed to save template', message: error.message });
    }
  }
);

router.put('/templates/:id', async (req, res) => {
  try {
    const template = await EmailTemplate.findById(req.params.id);
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    ['name', 'subject', 'description', 'html', 'text', 'category'].forEach((key) => {
      if (req.body[key] !== undefined) template[key] = req.body[key];
    });
    if (Array.isArray(req.body.variables)) template.variables = req.body.variables;
    if (template.html && !req.body.text) template.text = stripHtml(template.html);

    await template.save();
    res.json({ success: true, template });
  } catch (error) {
    console.error('Update email template error:', error);
    res.status(500).json({ error: 'Failed to update template', message: error.message });
  }
});

router.delete('/templates/:id', async (req, res) => {
  try {
    const deleted = await EmailTemplate.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Template not found' });
    }
    res.json({ success: true, message: 'Template deleted' });
  } catch (error) {
    console.error('Delete email template error:', error);
    res.status(500).json({ error: 'Failed to delete template', message: error.message });
  }
});

async function resolveRecipients({ audience, userIds, emails }) {
  const extraEmails = Array.isArray(emails)
    ? emails.map((e) => String(e).trim().toLowerCase()).filter((e) => EMAIL_RE.test(e))
    : [];

  if (audience === 'emails') {
    return extraEmails.map((email) => ({ email, user: null }));
  }

  const query = {
    isActive: { $ne: false },
    emailUnreachable: { $ne: true },
  };

  if (audience === 'custom') {
    if (!Array.isArray(userIds) || userIds.length === 0) {
      throw Object.assign(new Error('Select at least one user'), { status: 400 });
    }
    query._id = { $in: userIds };
  } else {
    const role = ROLE_MAP[audience || 'all'];
    if (audience && role === undefined) {
      throw Object.assign(new Error('Invalid audience'), { status: 400 });
    }
    if (role) query.role = role;
  }

  const users = await User.find(query).select('email firstName lastName role');
  const mapped = users
    .filter((u) => u.email && EMAIL_RE.test(u.email))
    .map((user) => ({ email: user.email, user }));

  const known = new Set(mapped.map((r) => r.email.toLowerCase()));
  extraEmails.forEach((email) => {
    if (!known.has(email)) {
      mapped.push({ email, user: null });
      known.add(email);
    }
  });

  return mapped;
}

router.post(
  '/send',
  [
    body('subject').trim().notEmpty().withMessage('Subject is required'),
    body('html').notEmpty().withMessage('HTML is required'),
    body('audience').optional().isString(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: 'Validation failed', details: errors.array() });
      }

      const { subject, text, audience = 'all', userIds, emails, variables, trackButtons, buttons, confirmationMessage } = req.body;
      const html = normalizeEmailHtml(req.body.html);
      const recipients = await resolveRecipients({ audience, userIds, emails });

      if (recipients.length === 0) {
        return res.status(400).json({
          error: 'No recipients',
          message: 'No matching users or valid email addresses were found',
        });
      }

      const safeButtons = trackButtons ? sanitizeButtons(buttons) : [];
      let campaign = null;
      let recipientsByEmail = new Map();
      if (safeButtons.length > 0) {
        const created = await createCampaignAndRecipients({
          subject,
          html,
          buttons: safeButtons,
          recipients,
          createdBy: req.user?._id,
          confirmationMessage,
        });
        campaign = created.campaign;
        recipientsByEmail = created.recipientsByEmail;
      }

      const results = [];
      for (const recipient of recipients) {
        const vars = recipientVariables(recipient.user, {
          email: recipient.email,
          variables: variables && typeof variables === 'object' ? variables : {},
        });
        const renderedSubject = applyVariables(subject, vars);
        const token = recipientsByEmail.get(String(recipient.email).toLowerCase())?.token;
        const renderedHtml =
          token && safeButtons.length
            ? renderTrackedHtml({ html, subject: renderedSubject, vars, token, buttons: safeButtons })
            : wrapHtmlEmail(applyVariables(html, vars), renderedSubject);
        const renderedText = applyVariables(text || stripHtml(html), vars);

        try {
          const success = await notificationService.sendEmail({
            to: recipient.email,
            subject: renderedSubject,
            html: renderedHtml,
            text: renderedText,
            userId: recipient.user?._id?.toString(),
            type: 'bulk',
          });
          results.push({ email: recipient.email, success, error: success ? null : 'Failed to send' });
        } catch (error) {
          results.push({ email: recipient.email, success: false, error: error.message });
        }
      }

      const successful = results.filter((r) => r.success).length;
      const failed = results.length - successful;

      res.json({
        success: true,
        message: `Emails sent: ${successful} successful, ${failed} failed`,
        total: results.length,
        successful,
        failed,
        campaignId: campaign?._id || null,
        results: results.slice(0, 25),
      });
    } catch (error) {
      console.error('Send HTML email error:', error);
      res.status(error.status || 500).json({
        error: 'Failed to send emails',
        message: error.message,
      });
    }
  }
);

router.post(
  '/test',
  [
    body('subject').trim().notEmpty().withMessage('Subject is required'),
    body('html').notEmpty().withMessage('HTML is required'),
    body('testEmail').optional().isEmail(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: 'Validation failed', details: errors.array() });
      }

      const to = (req.body.testEmail || req.user?.email || '').toLowerCase().trim();
      if (!EMAIL_RE.test(to)) {
        return res.status(400).json({ error: 'A valid test email is required' });
      }

      const vars = recipientVariables(req.user, { email: to, variables: req.body.variables });
      const subject = applyVariables(req.body.subject, vars);
      const sourceHtml = normalizeEmailHtml(req.body.html);
      const safeButtons = req.body.trackButtons ? sanitizeButtons(req.body.buttons) : [];
      let html;
      let created = null;
      if (safeButtons.length) {
        created = await createCampaignAndRecipients({
          subject,
          html: sourceHtml,
          buttons: safeButtons,
          recipients: [{ email: to, user: req.user }],
          createdBy: req.user?._id,
          isTest: true,
          confirmationMessage: req.body.confirmationMessage,
        });
        const token = created.recipientsByEmail.get(to)?.token;
        html = renderTrackedHtml({
          html: sourceHtml,
          subject,
          vars,
          token,
          buttons: safeButtons,
        });
      } else {
        html = wrapHtmlEmail(applyVariables(sourceHtml, vars), subject);
      }
      const text = applyVariables(req.body.text || stripHtml(sourceHtml), vars);

      const success = await notificationService.sendEmail({
        to,
        subject: `[TEST] ${subject}`,
        html,
        text,
        userId: req.user?._id?.toString(),
        type: 'bulk',
      });

      if (!success) {
        return res.status(500).json({ error: 'Failed to send test email' });
      }

      res.json({
        success: true,
        message: 'Test email sent',
        recipient: to,
        campaignId: created?.campaign?._id || null,
      });
    } catch (error) {
      console.error('Test HTML email error:', error);
      res.status(500).json({ error: 'Failed to send test email', message: error.message });
    }
  }
);

function csvEscape(value) {
  const str = value == null ? '' : String(value);
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

router.get('/campaigns', async (req, res) => {
  try {
    const includeTests = String(req.query.includeTests || '') === '1';
    const query = includeTests ? {} : { isTest: { $ne: true } };
    const campaigns = await EmailCampaign.find(query)
      .select('name subject buttons confirmationMessage isTest recipientCount responseCount sentAt createdAt')
      .sort({ sentAt: -1 })
      .limit(200)
      .lean();
    res.json({ campaigns });
  } catch (error) {
    console.error('List email campaigns error:', error);
    res.status(500).json({ error: 'Failed to list campaigns', message: error.message });
  }
});

router.get('/campaigns/:id', async (req, res) => {
  try {
    const campaign = await EmailCampaign.findById(req.params.id).lean();
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }
    res.json({ campaign });
  } catch (error) {
    console.error('Get email campaign error:', error);
    res.status(500).json({ error: 'Failed to load campaign', message: error.message });
  }
});

router.get('/campaigns/:id/clicks', async (req, res) => {
  try {
    const campaign = await EmailCampaign.findById(req.params.id).lean();
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    const q = String(req.query.q || '').trim();
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 100));
    const filter = { campaign: campaign._id };
    if (q) {
      filter.$or = [
        { email: new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') },
        { name: new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') },
        { buttonLabel: new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') },
      ];
    }

    const [clicks, total] = await Promise.all([
      EmailButtonClick.find(filter).sort({ clickedAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      EmailButtonClick.countDocuments(filter),
    ]);

    res.json({ campaign, clicks, total, page, limit });
  } catch (error) {
    console.error('List email campaign clicks error:', error);
    res.status(500).json({ error: 'Failed to load entries', message: error.message });
  }
});

router.get('/campaigns/:id/export', async (req, res) => {
  try {
    const campaign = await EmailCampaign.findById(req.params.id).lean();
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    const clicks = await EmailButtonClick.find({ campaign: campaign._id }).sort({ clickedAt: 1 }).lean();
    const headers = ['Timestamp', 'Name', 'Email', 'Response'];
    const rows = [headers.map(csvEscape).join(',')];
    clicks.forEach((click) => {
      rows.push(
        [
          click.clickedAt ? new Date(click.clickedAt).toISOString() : '',
          click.name || '',
          click.email || '',
          click.buttonLabel || click.buttonId || '',
        ].map(csvEscape).join(',')
      );
    });

    const filename = `${String(campaign.subject || 'campaign').replace(/[^a-z0-9]+/gi, '-').slice(0, 60)}-entries.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(rows.join('\n'));
  } catch (error) {
    console.error('Export email campaign clicks error:', error);
    res.status(500).json({ error: 'Failed to export entries', message: error.message });
  }
});

module.exports = router;
