function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function applyVariables(input, variables = {}) {
  if (input == null) return '';
  let output = String(input);
  Object.keys(variables).forEach((key) => {
    const value = variables[key] == null ? '' : String(variables[key]);
    output = output.replace(new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g'), value);
  });
  return output;
}

function stripHtml(html) {
  return String(html || '')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Clean pasted email HTML (ChatGPT fences, escaped tags) before send/preview.
 */
function normalizeEmailHtml(input) {
  let html = String(input || '').trim();
  if (!html) return '';

  // Quill often wraps paste as paragraphs — flatten obvious fence markers first
  html = html
    .replace(/<\/p>\s*<p[^>]*>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?p[^>]*>/gi, '\n');

  // Remove surrounding markdown code fences: ```html ... ```
  const fenced = html.match(/```(?:html|htm)?\s*\r?\n?([\s\S]*?)\r?\n?```/i);
  if (fenced && (/<!DOCTYPE/i.test(fenced[1]) || /<html[\s>]/i.test(fenced[1]) || /<body[\s>]/i.test(fenced[1]))) {
    html = fenced[1].trim();
  } else if (/^```(?:html|htm)?\b/i.test(html)) {
    html = html.replace(/^```(?:html|htm)?\s*\r?\n?/i, '').replace(/\r?\n?```\s*$/i, '').trim();
  }

  // Drop leftover fence lines
  html = html.replace(/^```(?:html|htm)?\s*$/gim, '').trim();

  // Quill / paste sometimes stores a full document as escaped text
  if (/&lt;(!DOCTYPE|html|body)\b/i.test(html)) {
    html = html
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&#x27;/gi, "'")
      .replace(/&amp;/g, '&');
  }

  // If we still have a full document buried in noise, extract it
  const docMatch = html.match(/<!DOCTYPE[\s\S]*<\/html>/i) || html.match(/<html[\s\S]*<\/html>/i);
  if (docMatch) {
    html = docMatch[0].trim();
  }

  return html.trim();
}

function wrapHtmlEmail(html, subject) {
  const trimmed = normalizeEmailHtml(html);
  if (!trimmed) return '';
  if (/^<!DOCTYPE/i.test(trimmed) || /^<html[\s>]/i.test(trimmed)) {
    return trimmed;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(subject || 'Forex Navigators')}</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:640px;margin:24px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 8px 24px rgba(0,0,0,0.08);">
    <div style="background:#111827;padding:20px 24px;text-align:center;">
      <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:600;">Forex Navigators</h1>
    </div>
    <div style="padding:28px 24px;color:#111827;line-height:1.65;font-size:16px;">
      ${trimmed}
    </div>
    <div style="padding:16px 24px;background:#f9fafb;color:#6b7280;font-size:12px;text-align:center;">
      This email was sent by Forex Navigators. If you were not expecting it, you can ignore this message.
    </div>
  </div>
</body>
</html>`;
}

function getPublicAppUrl() {
  return String(process.env.FRONTEND_URL || process.env.PUBLIC_APP_URL || 'https://thefxnavigators.com').replace(/\/$/, '');
}

function getTrustpilotAfsBcc(settings) {
  return String(settings?.trustpilotAfsBccEmail || process.env.TRUSTPILOT_AFS_BCC_EMAIL || '')
    .trim()
    .toLowerCase();
}

/**
 * Trustpilot AFS structured-data snippet (must stay in an HTML comment).
 * @see https://help.trustpilot.com/s/article/How-to-use-Automatic-Feedback-Service-AFS
 */
function appendTrustpilotAfsSnippet(html, { recipientName, recipientEmail, referenceId } = {}) {
  const payload = {
    recipientName: String(recipientName || '').trim() || 'Member',
    recipientEmail: String(recipientEmail || '').trim().toLowerCase(),
    referenceId: String(referenceId || '').trim()
  };
  if (!payload.recipientEmail) return String(html || '');
  const snippet = `<!-- <script type="application/json+trustpilot">${JSON.stringify(payload)}</script> -->`;
  const source = String(html || '');
  if (/json\+trustpilot/i.test(source)) return source;
  if (/<\/body>/i.test(source)) {
    return source.replace(/<\/body>/i, `${snippet}\n</body>`);
  }
  return `${source}\n${snippet}`;
}

function normalizeButtonLabel(value) {
  return String(value || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&#160;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function labelsMatch(a, b) {
  const left = normalizeButtonLabel(a);
  const right = normalizeButtonLabel(b);
  if (!left || !right) return false;
  if (left === right) return true;
  const compact = (s) => s.replace(/[^a-z0-9]+/g, '');
  return compact(left) === compact(right);
}

function shouldSkipTrackedLink(href, inner) {
  const blob = `${href || ''} ${normalizeButtonLabel(inner)}`.toLowerCase();
  return /unsubscribe|mailto:|tel:|sms:|privacy|preferences|manage\s+subscription|view\s+in\s+browser|opt[\s-]?out/.test(
    blob
  );
}

function looksLikeCtaAnchor(fullTag, inner) {
  const styleMatch = /style\s*=\s*(["'])([\s\S]*?)\1/i.exec(fullTag);
  const style = (styleMatch?.[2] || '').toLowerCase();
  if (/display\s*:\s*inline-block|padding\s*:|background(-color)?\s*:|border-radius\s*:|border\s*:/.test(style)) {
    return true;
  }
  const text = normalizeButtonLabel(inner);
  if (
    /reserve|confirm|decline|spot|join|register|rsvp|book|claim|\byes\b|\bno\b|accept|respond|click here|get started|sign up|save my|claim my/.test(
      text
    )
  ) {
    return true;
  }
  const raw = String(inner)
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return raw.length >= 4 && raw.length <= 48 && raw === raw.toUpperCase() && /[A-Z]/.test(raw);
}

function replaceAnchorHref(full, beforeHref, quote, hrefValue, afterHref, inner, nextUrl) {
  if (quote) {
    return `<a${beforeHref}href=${quote}${nextUrl}${quote}${afterHref}>${inner}</a>`;
  }
  return `<a${beforeHref}href="${nextUrl}"${afterHref}>${inner}</a>`;
}

/**
 * Point existing HTML <a> buttons at tracked URLs.
 * Supports:
 * - href="{{button_<id>}}" / href="{{track}}"
 * - visible text matching a button label
 * - with a single tracked button: CTA-looking links in the email HTML
 */
function rewireHtmlButtons(html, buttons, urlsById = {}) {
  let output = String(html || '');
  let rewired = 0;
  const list = Array.isArray(buttons) ? buttons.filter((b) => b && b.id && urlsById[b.id]) : [];
  const primaryUrl = list.length ? urlsById[list[0].id] : null;

  Object.keys(urlsById).forEach((id) => {
    const before = output;
    output = applyVariables(output, { [`button_${id}`]: urlsById[id] });
    if (output !== before) rewired += 1;
  });
  if (primaryUrl) {
    const before = output;
    output = applyVariables(output, { track: primaryUrl, trackUrl: primaryUrl });
    if (output !== before) rewired += 1;
  }

  const anchorRe =
    /<a\b([^>]*?)href\s*=\s*(?:(["'])([\s\S]*?)\2|([^\s>]+))([^>]*)>([\s\S]*?)<\/a>/gi;

  output = output.replace(anchorRe, (full, beforeHref, quote, quotedHref, bareHref, afterHref, inner) => {
    const currentHref = quotedHref != null ? quotedHref : bareHref || '';
    if (shouldSkipTrackedLink(currentHref, inner)) return full;
    if (/\/e\/r\//i.test(currentHref)) return full;

    const matched = list.find((button) => labelsMatch(inner, button.label));
    if (matched) {
      rewired += 1;
      return replaceAnchorHref(full, beforeHref, quote, currentHref, afterHref, inner, urlsById[matched.id]);
    }

    if (list.length === 1 && primaryUrl && looksLikeCtaAnchor(full, inner)) {
      rewired += 1;
      return replaceAnchorHref(full, beforeHref, quote, currentHref, afterHref, inner, primaryUrl);
    }

    return full;
  });

  return { html: output, rewired };
}

function buttonMarkup(buttons, urlsById) {
  if (!Array.isArray(buttons) || buttons.length === 0) return '';
  const cells = buttons
    .map((button) => {
      const href = urlsById[button.id] || '#';
      const color = button.color || '#dc2626';
      return `<td style="padding:6px;">
        <a href="${escapeHtml(href)}" target="_blank" style="display:inline-block;background:${escapeHtml(color)};color:#ffffff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">
          ${escapeHtml(button.label || 'Respond')}
        </a>
      </td>`;
    })
    .join('');
  return `<div style="text-align:center;margin:28px 0 8px;">
    <table role="presentation" cellspacing="0" cellpadding="0" align="center"><tr>${cells}</tr></table>
  </div>`;
}

function injectActionButtons(html, markup, urlsById = {}, buttons = []) {
  const original = String(html || '');
  const { html: wired, rewired } = rewireHtmlButtons(original, buttons, urlsById);
  let output = wired;

  if (!markup) return output;
  if (/\{\{\s*actionButtons\s*\}\}/.test(output)) {
    return output.replace(/\{\{\s*actionButtons\s*\}\}/g, markup);
  }
  // HTML already has tracked buttons — don't append extras
  if (rewired > 0) {
    return output;
  }
  if (/<\/body>/i.test(output)) {
    return output.replace(/<\/body>/i, `${markup}</body>`);
  }
  return `${output}${markup}`;
}

module.exports = {
  escapeHtml,
  applyVariables,
  stripHtml,
  normalizeEmailHtml,
  wrapHtmlEmail,
  getPublicAppUrl,
  getTrustpilotAfsBcc,
  appendTrustpilotAfsSnippet,
  buttonMarkup,
  injectActionButtons,
  rewireHtmlButtons,
  labelsMatch,
};
