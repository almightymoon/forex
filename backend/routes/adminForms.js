const express = require('express');
const { body, validationResult } = require('express-validator');
const SurveyForm = require('../models/SurveyForm');
const FormResponse = require('../models/FormResponse');

const router = express.Router();
const FIELD_TYPES = SurveyForm.FIELD_TYPES;

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

async function uniqueSlug(base, excludeId) {
  let slug = slugify(base) || `form-${Date.now()}`;
  let n = 0;
  while (true) {
    const candidate = n === 0 ? slug : `${slug}-${n}`;
    const query = { slug: candidate };
    if (excludeId) query._id = { $ne: excludeId };
    const exists = await SurveyForm.exists(query);
    if (!exists) return candidate;
    n += 1;
  }
}

function sanitizeFields(fields) {
  if (!Array.isArray(fields)) return [];
  return fields
    .filter((field) => field && typeof field === 'object')
    .map((field, index) => {
      const type = FIELD_TYPES.includes(field.type) ? field.type : 'short_text';
      const needsOptions = ['dropdown', 'multiple_choice', 'checkboxes'].includes(type);
      const options = needsOptions
        ? (Array.isArray(field.options) ? field.options : [])
            .map((opt) => String(opt || '').trim())
            .filter(Boolean)
            .slice(0, 50)
        : [];

      return {
        id: String(field.id || `field_${Date.now()}_${index}`).slice(0, 80),
        type,
        label: String(field.label || `Question ${index + 1}`).trim().slice(0, 200),
        description: String(field.description || '').trim().slice(0, 500),
        placeholder: String(field.placeholder || '').trim().slice(0, 200),
        required: Boolean(field.required),
        options,
      };
    });
}

function csvEscape(value) {
  const str = value == null ? '' : Array.isArray(value) ? value.join('; ') : String(value);
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

router.get('/', async (_req, res) => {
  try {
    const forms = await SurveyForm.find({})
      .select('title description slug status fields collectEmail collectName allowMultiple responseCount createdAt updatedAt')
      .sort({ updatedAt: -1 })
      .lean();
    res.json({ forms });
  } catch (error) {
    console.error('List forms error:', error);
    res.status(500).json({ error: 'Failed to list forms', message: error.message });
  }
});

router.post(
  '/',
  [body('title').trim().notEmpty().withMessage('Title is required')],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: 'Validation failed', details: errors.array() });
      }

      const slug = await uniqueSlug(req.body.slug || req.body.title);
      const form = await SurveyForm.create({
        title: req.body.title,
        description: req.body.description || '',
        slug,
        status: req.body.status === 'published' ? 'published' : 'draft',
        fields: sanitizeFields(req.body.fields),
        collectEmail: req.body.collectEmail !== false,
        collectName: req.body.collectName !== false,
        allowMultiple: req.body.allowMultiple !== false,
        confirmationMessage: req.body.confirmationMessage,
        createdBy: req.user?._id,
      });

      res.status(201).json({ success: true, form });
    } catch (error) {
      console.error('Create form error:', error);
      res.status(500).json({ error: 'Failed to create form', message: error.message });
    }
  }
);

router.get('/:id', async (req, res) => {
  try {
    const form = await SurveyForm.findById(req.params.id);
    if (!form) return res.status(404).json({ error: 'Form not found' });
    res.json({ form });
  } catch (error) {
    console.error('Get form error:', error);
    res.status(500).json({ error: 'Failed to load form', message: error.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const form = await SurveyForm.findById(req.params.id);
    if (!form) return res.status(404).json({ error: 'Form not found' });

    if (req.body.title !== undefined) form.title = req.body.title;
    if (req.body.description !== undefined) form.description = req.body.description;
    if (req.body.status && ['draft', 'published', 'closed'].includes(req.body.status)) {
      form.status = req.body.status;
    }
    if (req.body.fields !== undefined) form.fields = sanitizeFields(req.body.fields);
    if (req.body.collectEmail !== undefined) form.collectEmail = Boolean(req.body.collectEmail);
    if (req.body.collectName !== undefined) form.collectName = Boolean(req.body.collectName);
    if (req.body.allowMultiple !== undefined) form.allowMultiple = Boolean(req.body.allowMultiple);
    if (req.body.confirmationMessage !== undefined) form.confirmationMessage = req.body.confirmationMessage;
    if (req.body.slug) {
      form.slug = await uniqueSlug(req.body.slug, form._id);
    }

    await form.save();
    res.json({ success: true, form });
  } catch (error) {
    console.error('Update form error:', error);
    res.status(500).json({ error: 'Failed to update form', message: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const form = await SurveyForm.findByIdAndDelete(req.params.id);
    if (!form) return res.status(404).json({ error: 'Form not found' });
    await FormResponse.deleteMany({ form: form._id });
    res.json({ success: true, message: 'Form and responses deleted' });
  } catch (error) {
    console.error('Delete form error:', error);
    res.status(500).json({ error: 'Failed to delete form', message: error.message });
  }
});

router.get('/:id/responses', async (req, res) => {
  try {
    const form = await SurveyForm.findById(req.params.id).lean();
    if (!form) return res.status(404).json({ error: 'Form not found' });

    const limit = Math.min(Number(req.query.limit) || 500, 2000);
    const skip = Math.max(Number(req.query.skip) || 0, 0);
    const search = String(req.query.search || '').trim();

    const query = { form: form._id };
    if (search) {
      const rx = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      query.$or = [
        { respondentEmail: rx },
        { respondentName: rx },
        { 'answers.value': rx },
      ];
    }

    const [responses, total] = await Promise.all([
      FormResponse.find(query).sort({ submittedAt: -1 }).skip(skip).limit(limit).lean(),
      FormResponse.countDocuments(query),
    ]);

    res.json({ form, responses, total });
  } catch (error) {
    console.error('List form responses error:', error);
    res.status(500).json({ error: 'Failed to load responses', message: error.message });
  }
});

router.delete('/:id/responses/:responseId', async (req, res) => {
  try {
    const deleted = await FormResponse.findOneAndDelete({
      _id: req.params.responseId,
      form: req.params.id,
    });
    if (!deleted) return res.status(404).json({ error: 'Response not found' });
    await SurveyForm.findByIdAndUpdate(req.params.id, { $inc: { responseCount: -1 } });
    res.json({ success: true, message: 'Response deleted' });
  } catch (error) {
    console.error('Delete form response error:', error);
    res.status(500).json({ error: 'Failed to delete response', message: error.message });
  }
});

router.get('/:id/export', async (req, res) => {
  try {
    const form = await SurveyForm.findById(req.params.id).lean();
    if (!form) return res.status(404).json({ error: 'Form not found' });

    const responses = await FormResponse.find({ form: form._id }).sort({ submittedAt: 1 }).lean();
    const headers = ['Submitted at'];
    if (form.collectName) headers.push('Name');
    if (form.collectEmail) headers.push('Email');
    form.fields.forEach((field) => headers.push(field.label));

    const rows = [headers.map(csvEscape).join(',')];
    responses.forEach((response) => {
      const byField = {};
      (response.answers || []).forEach((answer) => {
        byField[answer.fieldId] = answer.value;
      });
      const cells = [response.submittedAt ? new Date(response.submittedAt).toISOString() : ''];
      if (form.collectName) cells.push(response.respondentName || '');
      if (form.collectEmail) cells.push(response.respondentEmail || '');
      form.fields.forEach((field) => cells.push(byField[field.id] ?? ''));
      rows.push(cells.map(csvEscape).join(','));
    });

    const filename = `${form.slug || 'form'}-responses.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(rows.join('\n'));
  } catch (error) {
    console.error('Export form responses error:', error);
    res.status(500).json({ error: 'Failed to export responses', message: error.message });
  }
});

module.exports = router;
