const express = require('express');
const rateLimit = require('express-rate-limit');
const SurveyForm = require('../models/SurveyForm');
const FormResponse = require('../models/FormResponse');

const router = express.Router();
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const submitLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many submissions. Please try again later.' },
});

function publicForm(form) {
  return {
    title: form.title,
    description: form.description,
    slug: form.slug,
    status: form.status,
    fields: form.fields,
    collectEmail: form.collectEmail,
    collectName: form.collectName,
    confirmationMessage: form.confirmationMessage,
  };
}

function normalizeAnswer(field, raw) {
  if (raw == null) return '';
  if (field.type === 'checkboxes') {
    const list = Array.isArray(raw) ? raw : String(raw).split(',').map((v) => v.trim()).filter(Boolean);
    const allowed = new Set(field.options || []);
    return list.filter((v) => allowed.has(v));
  }
  if (field.type === 'dropdown' || field.type === 'multiple_choice' || field.type === 'yes_no') {
    const value = String(raw).trim();
    if (field.type === 'yes_no') return value === 'Yes' || value === 'No' ? value : '';
    return (field.options || []).includes(value) ? value : '';
  }
  if (field.type === 'number') {
    if (raw === '') return '';
    const num = Number(raw);
    return Number.isFinite(num) ? num : '';
  }
  return String(raw).trim().slice(0, field.type === 'long_text' ? 5000 : 500);
}

router.get('/:slug', async (req, res) => {
  try {
    const form = await SurveyForm.findOne({ slug: String(req.params.slug).toLowerCase() }).lean();
    if (!form || form.status === 'draft') {
      return res.status(404).json({ error: 'Form not found' });
    }
    res.json({ form: publicForm(form) });
  } catch (error) {
    console.error('Public form fetch error:', error);
    res.status(500).json({ error: 'Failed to load form' });
  }
});

router.post('/:slug/submit', submitLimiter, async (req, res) => {
  try {
    const form = await SurveyForm.findOne({ slug: String(req.params.slug).toLowerCase() });
    if (!form || form.status === 'draft') {
      return res.status(404).json({ error: 'Form not found' });
    }
    if (form.status === 'closed') {
      return res.status(400).json({ error: 'This form is no longer accepting responses' });
    }

    const respondentName = form.collectName ? String(req.body.respondentName || '').trim().slice(0, 120) : '';
    const respondentEmail = form.collectEmail
      ? String(req.body.respondentEmail || '').trim().toLowerCase().slice(0, 200)
      : '';

    if (form.collectName && !respondentName) {
      return res.status(400).json({ error: 'Name is required' });
    }
    if (form.collectEmail) {
      if (!EMAIL_RE.test(respondentEmail)) {
        return res.status(400).json({ error: 'A valid email is required' });
      }
      if (!form.allowMultiple) {
        const existing = await FormResponse.exists({ form: form._id, respondentEmail });
        if (existing) {
          return res.status(400).json({ error: 'You have already submitted this form' });
        }
      }
    }

    const incoming = req.body.answers && typeof req.body.answers === 'object' ? req.body.answers : {};
    const answers = [];

    for (const field of form.fields) {
      const value = normalizeAnswer(field, incoming[field.id]);
      const empty = Array.isArray(value) ? value.length === 0 : value === '' || value == null;
      if (field.required && empty) {
        return res.status(400).json({ error: `${field.label} is required` });
      }
      if (field.type === 'email' && value && !EMAIL_RE.test(String(value))) {
        return res.status(400).json({ error: `${field.label} must be a valid email` });
      }
      answers.push({ fieldId: field.id, label: field.label, value });
    }

    const ipAddress = (req.headers['x-forwarded-for'] || req.ip || '').toString().split(',')[0].trim();

    await FormResponse.create({
      form: form._id,
      answers,
      respondentEmail,
      respondentName,
      ipAddress,
      submittedAt: new Date(),
    });
    await SurveyForm.findByIdAndUpdate(form._id, { $inc: { responseCount: 1 } });

    res.json({
      success: true,
      message: form.confirmationMessage || 'Thanks for your response.',
    });
  } catch (error) {
    console.error('Public form submit error:', error);
    res.status(500).json({ error: 'Failed to submit form' });
  }
});

module.exports = router;
