#!/usr/bin/env node
/**
 * One-off migration: replace dark-theme white text with light-theme tokens.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

const SKIP_FILES = new Set([
  'PrimaryButton.tsx',
  'GradientButton.tsx',
  'ErrorBoundary.tsx',
  'SegmentedAuthToggle.tsx',
  'NeoCardsCarousel.tsx',
  'SplashOrbScene.tsx',
  'appCardStyle.ts',
  'appBackground.ts',
]);

const SKIP_LINE = [
  /btnText/,
  /ctaText/,
  /tabTextActive/,
  /portalText/,
  /cardTitleLight/,
  /cardMetaLight/,
  /cardTypeLight/,
  /detailsTextLight/,
  /progressHintLight/,
  /sideText/,
  /welcomeIconText/,
  /editSaveText/,
  /serverLogoText/,
  /ActivityIndicator color=["']#fff/i,
  /ActivityIndicator color=["']#FFFFFF/i,
  /color=["']#fff["']/i, // inline on dark buttons in JSX - risky
];

const REPLACEMENTS = [
  [/color:\s*'rgba\(255,255,255,0\.8[0-9]\)'/g, "color: colors.textSilver"],
  [/color:\s*'rgba\(255,255,255,0\.7[0-9]\)'/g, "color: colors.textSilver"],
  [/color:\s*'rgba\(255,255,255,0\.6[0-9]\)'/g, "color: colors.textSecondary"],
  [/color:\s*'rgba\(255,255,255,0\.5[0-9]\)'/g, "color: colors.textSecondary"],
  [/color:\s*'rgba\(255,255,255,0\.4[0-9]\)'/g, "color: colors.textMuted"],
  [/color:\s*'rgba\(255,255,255,0\.3[0-9]\)'/g, "color: colors.textDim"],
  [/color:\s*'rgba\(255,255,255,0\.2[0-9]\)'/g, "color: colors.textDim"],
  [/color:\s*"rgba\(255,255,255,0\.8[0-9]\)"/g, 'color: colors.textSilver'],
  [/color:\s*"rgba\(255,255,255,0\.7[0-9]\)"/g, 'color: colors.textSilver'],
  [/color:\s*"rgba\(255,255,255,0\.6[0-9]\)"/g, 'color: colors.textSecondary'],
  [/color:\s*"rgba\(255,255,255,0\.5[0-9]\)"/g, 'color: colors.textSecondary'],
  [/color:\s*"rgba\(255,255,255,0\.4[0-9]\)"/g, 'color: colors.textMuted'],
  [/color:\s*"rgba\(255,255,255,0\.3[0-9]\)"/g, 'color: colors.textDim'],
  [/color:\s*"rgba\(255,255,255,0\.2[0-9]\)"/g, 'color: colors.textDim'],
  [/color=\{?['"]rgba\(255,255,255,0\.[0-9]+\)['"]\}?/g, 'color={colors.textMuted}'],
  [/color:\s*'#F1F5F9'/g, 'color: colors.text'],
  [/color:\s*'#fff'/g, 'color: colors.text'],
  [/color:\s*'#FFFFFF'/g, 'color: colors.text'],
  [/placeholderTextColor=['"]rgba\(255,255,255,[^'"]+['"]/g, 'placeholderTextColor={colors.textDim}'],
  [/placeholderTextColor:\s*'rgba\(255,255,255,[^']+'/g, 'placeholderTextColor: colors.textDim'],
];

function importPath(file) {
  const rel = path.relative(path.dirname(file), path.join(root, 'constants/theme.ts'));
  return rel.startsWith('.') ? rel : `./${rel}`;
}

function ensureColorsImport(content, file) {
  if (!content.includes('colors.')) return content;
  if (/from ['"].*constants\/theme['"]/.test(content)) return content;
  const imp = `import { colors } from '${importPath(file).replace(/\\/g, '/')}';`;
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
for (const file of walk(path.join(root, 'app')).concat(walk(path.join(root, 'components')))) {
  if (SKIP_FILES.has(path.basename(file))) continue;
  let content = fs.readFileSync(file, 'utf8');
  const original = content;
  const lines = content.split('\n');
  const newLines = lines.map((line) => {
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
