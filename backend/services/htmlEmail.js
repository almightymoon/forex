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

function wrapHtmlEmail(html, subject) {
  const trimmed = String(html || '').trim();
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

module.exports = {
  escapeHtml,
  applyVariables,
  stripHtml,
  wrapHtmlEmail,
};
