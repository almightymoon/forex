import sanitizeHtmlLib from 'sanitize-html';

const ALLOWED_TAGS = [
  'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's',
  'ul', 'ol', 'li',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'blockquote', 'pre', 'code',
  'a', 'img', 'figure', 'figcaption', 'hr',
  'span', 'div', 'label', 'input',
  'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td',
  'colgroup', 'col',
  'sub', 'sup', 'mark',
  'iframe',
];

const STYLE_AND_CLASS = ['class', 'style'];

function isSafeHref(value: string) {
  const lower = String(value || '').trim().toLowerCase();
  if (!lower) return false;
  if (lower.startsWith('//')) return false;
  if (/^(javascript|vbscript|data|blob|file|about):/i.test(lower)) return false;
  if (/^(https?:|mailto:|tel:)/i.test(lower)) return true;
  if (lower.startsWith('/') || lower.startsWith('#') || lower.startsWith('?')) return true;
  if (!/^[a-z][a-z0-9+.-]*:/i.test(lower)) return true;
  return false;
}

function isSafeSrc(value: string) {
  const lower = String(value || '').trim().toLowerCase();
  if (!lower) return false;
  if (lower.startsWith('//')) return false;
  if (/^(javascript|vbscript|data|blob|file|about):/i.test(lower)) return false;
  if (/^https?:/i.test(lower)) return true;
  if (lower.startsWith('/')) return true;
  return false;
}

function isSafeStyle(value: string) {
  if (value == null || value === '') return false;
  const s = String(value);
  if (s.length > 800) return false;
  const lower = s.toLowerCase();
  if (
    /expression\s*\(|url\s*\(|@import|behavior\s*:|-moz-binding|javascript:|vbscript:|data:/i.test(
      lower
    )
  ) {
    return false;
  }
  return true;
}

const SANITIZE_OPTIONS: sanitizeHtmlLib.IOptions = {
  allowedTags: ALLOWED_TAGS,
  allowedAttributes: {
    a: ['href', 'name', 'target', 'rel', 'title'],
    img: ['src', 'alt', 'title', 'width', 'height', 'class', 'style', 'data-align', 'data-radius', 'data-object-fit'],
    iframe: ['src', 'width', 'height', 'allow', 'allowfullscreen', 'frameborder', 'title', 'referrerpolicy'],
    input: ['type', 'checked', 'disabled'],
    th: ['colspan', 'rowspan', 'class', 'style'],
    td: ['colspan', 'rowspan', 'class', 'style'],
    table: STYLE_AND_CLASS,
    thead: STYLE_AND_CLASS,
    tbody: STYLE_AND_CLASS,
    tfoot: STYLE_AND_CLASS,
    tr: STYLE_AND_CLASS,
    colgroup: STYLE_AND_CLASS,
    col: ['class', 'style', 'span', 'width'],
    span: STYLE_AND_CLASS,
    div: ['class', 'style', 'data-youtube-video'],
    p: STYLE_AND_CLASS,
    li: ['class', 'style', 'data-type', 'data-checked'],
    ul: ['class', 'style', 'data-type'],
    ol: ['class', 'style', 'data-type'],
    strong: STYLE_AND_CLASS,
    b: STYLE_AND_CLASS,
    em: STYLE_AND_CLASS,
    i: STYLE_AND_CLASS,
    u: STYLE_AND_CLASS,
    s: STYLE_AND_CLASS,
    mark: ['class', 'style', 'data-color'],
    '*': ['title'],
  },
  allowedSchemes: ['http', 'https', 'mailto', 'tel'],
  allowedSchemesByTag: {
    img: ['http', 'https'],
    a: ['http', 'https', 'mailto', 'tel'],
    iframe: ['https'],
  },
  allowedIframeHostnames: [
    'www.youtube.com',
    'youtube.com',
    'www.youtube-nocookie.com',
    'youtube-nocookie.com',
  ],
  allowProtocolRelative: false,
  allowedSchemesAppliedToAttributes: ['href', 'src'],
  transformTags: {
    a: (tagName, attribs) => {
      const href = attribs.href;
      if (!href || !isSafeHref(href)) {
        const { href: _drop, ...rest } = attribs;
        return { tagName, attribs: rest };
      }
      const next: Record<string, string> = { ...attribs, href };
      if (next.target === '_blank') {
        next.rel = 'noopener noreferrer';
      } else {
        delete next.target;
        delete next.rel;
      }
      return { tagName, attribs: next };
    },
    img: (tagName, attribs) => {
      const src = attribs.src;
      if (!src || !isSafeSrc(src)) {
        return { tagName: 'span', attribs: {} };
      }
      if (attribs.style && !isSafeStyle(attribs.style)) delete attribs.style;
      return { tagName, attribs: { ...attribs, src } };
    },
    input: (tagName, attribs) => {
      if (String(attribs.type || '').toLowerCase() !== 'checkbox') {
        return { tagName: 'span', attribs: {} };
      }
      return {
        tagName,
        attribs: {
          type: 'checkbox',
          disabled: 'disabled',
          ...(attribs.checked != null ? { checked: 'checked' } : {}),
        },
      };
    },
  },
  disallowedTagsMode: 'discard',
};

export function sanitizeCourseHtml(dirty: string | null | undefined): string {
  if (dirty == null || dirty === '') return '';
  return sanitizeHtmlLib(String(dirty), SANITIZE_OPTIONS);
}
