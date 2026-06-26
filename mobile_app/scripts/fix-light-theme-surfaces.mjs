#!/usr/bin/env node
/**
 * Migrate dark-theme surface/border tokens to Neobank light theme.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

const SKIP_FILES = new Set([
  'AnimatedGlobeBackground.tsx',
  'authGlobeHtml.ts',
  'SplashOrbScene.tsx',
  'CourseVideoPlayer.tsx',
  'trading-view.tsx',
  'news-article.tsx',
  'NeoCardsCarousel.tsx',
  'PrimaryButton.tsx',
  'GradientButton.tsx',
  'SegmentedAuthToggle.tsx',
]);

const SKIP_LINE = [
  /videoWrap|videoThumb|webview|webWrap|loadingOverlay/,
  /ActivityIndicator/,
  /#fff|#FFFFFF/i,
  /stopColor/,
  /btnText|ctaText|tabTextActive/,
];

const REPLACEMENTS = [
  [/borderBottomColor:\s*'rgba\(255,255,255,0\.0[4-9]\)'/g, 'borderBottomColor: colors.border'],
  [/borderBottomColor:\s*'rgba\(255,255,255,0\.1[0-9]?\)'/g, 'borderBottomColor: colors.border'],
  [/borderTopColor:\s*'rgba\(255,255,255,0\.0[4-9]\)'/g, 'borderTopColor: colors.border'],
  [/borderTopColor:\s*'rgba\(255,255,255,0\.1[0-9]?\)'/g, 'borderTopColor: colors.border'],
  [/borderColor:\s*'rgba\(255,255,255,0\.0[4-9]\)'/g, 'borderColor: colors.border'],
  [/borderColor:\s*'rgba\(255,255,255,0\.1[0-9]?\)'/g, 'borderColor: colors.border'],
  [/borderRightColor:\s*'rgba\(255,255,255,0\.0[4-9]\)'/g, 'borderRightColor: colors.border'],
  [/borderRightColor:\s*'rgba\(255,255,255,0\.1[0-9]?\)'/g, 'borderRightColor: colors.border'],
  [/backgroundColor:\s*'rgba\(255,255,255,0\.0[4-6]\)'/g, 'backgroundColor: colors.surfaceHover'],
  [/backgroundColor:\s*'rgba\(255,255,255,0\.0[7-9]\)'/g, 'backgroundColor: colors.surface'],
  [/backgroundColor:\s*'rgba\(255,255,255,0\.1[0-5]\)'/g, 'backgroundColor: colors.surfaceHover'],
  [/backgroundColor:\s*'#141f38'/g, 'backgroundColor: colors.surfaceHover'],
  [/backgroundColor:\s*'#0c1428'/g, 'backgroundColor: colors.surfaceHover'],
  [/backgroundColor:\s*'#040818'/g, 'backgroundColor: colors.background'],
  [/backgroundColor:\s*'#02040A'/g, 'backgroundColor: colors.background'],
  [/backgroundColor:\s*'#00050A'/g, 'backgroundColor: colors.background'],
  [/backgroundColor:\s*'#060b18'/g, 'backgroundColor: colors.background'],
  [/backgroundColor:\s*'#010A18'/g, 'backgroundColor: colors.background'],
  [/color:\s*'rgba\(148,\s*163,\s*184[^']+'/g, 'color: colors.textMuted'],
  [/color=\{[^}]*'rgba\(255,255,255,0\.4[0-9]\)'[^}]*\}/g, 'color={colors.textMuted}'],
  [/color=\{[^}]*'rgba\(255,255,255,0\.2[0-9]\)'[^}]*\}/g, 'color={colors.textDim}'],
  [/color=['"]rgba\(255,255,255,0\.4[0-9]\)['"]/g, 'color={colors.textMuted}'],
  [/color=['"]rgba\(255,255,255,0\.7[0-9]\)['"]/g, 'color={colors.textSecondary}'],
  [/color=['"]rgba\(255,255,255,0\.3[0-9]\)['"]/g, 'color={colors.textDim}'],
  [/colors=\{\['rgba\(0,96,230[^']+',\s*'rgba\(255,255,255,0\.03\)'\]\}/g, "colors={[colors.lime, colors.surface]}"],
  [/colors=\{\['rgba\(0,96,230[^']+',\s*'rgba\(255,255,255,0\.0[0-9]\)'\]\}/g, "colors={['rgba(212,255,88,0.45)', colors.surface]}"],
];

function importPath(file) {
  const rel = path.relative(path.dirname(file), path.join(root, 'constants/theme.ts'));
  return rel.startsWith('.') ? rel.replace(/\\/g, '/') : `./${rel}`;
}

function ensureColorsImport(content, file) {
  if (!content.includes('colors.')) return content;
  if (/from ['"].*constants\/theme['"]/.test(content)) return content;
  const imp = `import { colors } from '${importPath(file)}';`;
  const m = content.match(/^import .+;\n/m);
  if (m) {
    const idx = content.indexOf(m[0]) + m[0].length;
    return content.slice(0, idx) + imp + '\n' + content.slice(idx);
  }
  return imp + '\n' + content;
}

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory() && ent.name !== 'node_modules' && ent.name !== 'scripts') walk(p, out);
    else if (ent.isFile() && /\.tsx?$/.test(ent.name)) out.push(p);
  }
  return out;
}

let changed = 0;
const dirs = ['app', 'components', 'constants'].map((d) => path.join(root, d));
for (const file of dirs.flatMap((d) => (fs.existsSync(d) ? walk(d) : []))) {
  if (SKIP_FILES.has(path.basename(file))) continue;
  let content = fs.readFileSync(file, 'utf8');
  const original = content;
  const newLines = content.split('\n').map((line) => {
    if (SKIP_LINE.some((re) => re.test(line))) return line;
    let l = line;
    for (const [re, rep] of REPLACEMENTS) l = l.replace(re, rep);
    return l;
  });
  content = newLines.join('\n');
  content = ensureColorsImport(content, file);
  if (content !== original) {
    fs.writeFileSync(file, content);
    changed++;
    console.log('updated', path.relative(root, file));
  }
}
console.log(`Done. ${changed} files updated.`);
