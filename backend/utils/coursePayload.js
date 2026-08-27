const { sanitizeCourseHtml } = require('./sanitizeHtml');

const VALID_CATEGORIES = ['forex', 'crypto', 'stocks', 'commodities', 'options', 'futures', 'general'];
const VALID_LEVELS = ['beginner', 'intermediate', 'advanced'];
const VALID_STATUSES = ['draft', 'review', 'published', 'archived'];
const VALID_CURRENCIES = ['USD', 'PKR', 'EUR'];
function normalizeCategory(category) {
  if (!category || typeof category !== 'string') return 'general';
  const normalized = category.trim().toLowerCase();
  return VALID_CATEGORIES.includes(normalized) ? normalized : 'general';
}

function sanitizeContentBlocks(content) {
  if (!Array.isArray(content)) return [];

  const sanitized = content
    .map((block, index) => {
      if (!block || typeof block !== 'object') return null;

      const order = Math.max(1, Number(block.order) || index + 1);
      let type = block.type === 'file' ? 'text' : block.type;
      if (!['video', 'text', 'ppt', 'quiz', 'assignment', 'image'].includes(type)) {
        type = 'text';
      }

      const base = {
        title: String(block.title || `Lesson ${order}`).trim().slice(0, 100),
        description: String(block.description || '').trim().slice(0, 5000),
        type,
        order,
        isPreview: Boolean(block.isPreview),
        duration: Math.max(0, Number(block.duration) || 0),
        views: Math.max(0, Number(block.views) || 0),
      };

      if (type === 'text') {
        const textContent = sanitizeCourseHtml(String(block.textContent || block.content || '').trim());
        if (!textContent) return null;
        return { ...base, textContent };
      }

      if (type === 'video') {
        const videoUrl = String(block.videoUrl || block.content || '').trim();
        if (!videoUrl) return null;
        return { ...base, videoUrl };
      }

      if (type === 'image') {
        const imageUrl = String(block.imageUrl || block.content || '').trim();
        if (!imageUrl) return null;
        return { ...base, imageUrl };
      }

      if (type === 'ppt') {
        const pptUrl = String(block.pptUrl || block.content || '').trim();
        if (!pptUrl) return null;
        return {
          ...base,
          pptUrl,
          pptSlides: Math.max(0, Number(block.pptSlides) || 0),
        };
      }

      return null;
    })
    .filter(Boolean);

  return sanitized.map((block, index) => ({ ...block, order: index + 1 }));
}

function sanitizeAllowedPackages(value) {
  if (value === null || value === undefined) return null;
  if (!Array.isArray(value)) return null;
  const filtered = [
    ...new Set(
      value
        .map((price) => Number(price))
        .filter((price) => Number.isFinite(price) && price >= 0)
    ),
  ];
  return filtered.length > 0 ? filtered : null;
}

function resolvePublishState(body = {}) {
  const wantsPublish = body.status === 'published' || body.isPublished === true;
  if (wantsPublish) {
    return { status: 'published', isPublished: true };
  }
  const status = VALID_STATUSES.includes(body.status) ? body.status : 'draft';
  return { status, isPublished: status === 'published' };
}

/**
 * Normalize teacher course create/update payloads to match the Course schema.
 */
function sanitizeCoursePayload(body = {}, options = {}) {
  const publishState = resolvePublishState(body);

  const payload = {
    title: String(body.title || '').trim(),
    description: String(body.description || '').trim(),
    price: Math.max(0, Number(body.price) || 0),
    currency: VALID_CURRENCIES.includes(body.currency) ? body.currency : 'USD',
    thumbnail: String(body.thumbnail || '').trim(),
    category: normalizeCategory(body.category),
    level: VALID_LEVELS.includes(body.level) ? body.level : 'beginner',
    content: sanitizeContentBlocks(body.content),
    requirements: Array.isArray(body.requirements)
      ? body.requirements.map((item) => String(item).trim()).filter(Boolean)
      : [],
    learningOutcomes: Array.isArray(body.learningOutcomes)
      ? body.learningOutcomes.map((item) => String(item).trim()).filter(Boolean)
      : [],
    allowedPackages: sanitizeAllowedPackages(body.allowedPackages),
    status: publishState.status,
    isPublished: publishState.isPublished,
  };

  if (Array.isArray(body.tags)) {
    payload.tags = body.tags.map((tag) => String(tag).trim()).filter(Boolean);
  }

  if (options.teacherId) {
    payload.teacher = options.teacherId;
  }

  return payload;
}

function formatValidationError(error) {
  if (!error || error.name !== 'ValidationError' || !error.errors) {
    return error?.message || 'Failed to save course';
  }
  return Object.values(error.errors)
    .map((entry) => entry.message)
    .join('; ');
}

module.exports = {
  VALID_CATEGORIES,
  sanitizeContentBlocks,
  sanitizeCoursePayload,
  sanitizeAllowedPackages,
  formatValidationError,
  normalizeCategory,
};
