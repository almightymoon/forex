#!/usr/bin/env node
/**
 * Migrate legacy lime/black/blue hardcoded accents → brand purple/blue tokens.
 * Skips user-facing color picker presets (appBackground, appCardStyle).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SKIP = new Set([
  'node_modules',
  'scripts/migrate-brand-colors.mjs',
  'utils/appBackground.ts',
  'utils/appCardStyle.ts',
  'components/settings/CardMaterialColorPicker.tsx',
  'components/settings/BackgroundColorPickerModal.tsx',
  'app/(app)/settings.tsx',
]);

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const rel = path.relative(root, p);
    if (SKIP.has(rel) || rel.includes('node_modules')) continue;
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (/\.(tsx|ts)$/.test(name)) out.push(p);
  }
  return out;
}

function migrate(content, file) {
  let next = content;
  const isTheme = file.endsWith('constants/theme.ts');

  if (!isTheme) {
    next = next.replace(/\bcolors\.limeDark\b/g, 'colors.brandPurpleDeep');
    next = next.replace(/\bcolors\.lime\b/g, 'colors.brandPurple');

    // Hardcoded blues → brandBlue in style factories that receive colors
    if (next.includes('createStyles(colors') || next.includes('createStyles( colors') || next.includes('AppColors')) {
      next = next.replace(/'#3AADFF'/g, 'colors.brandBlue');
      next = next.replace(/"#3AADFF"/g, 'colors.brandBlue');
      next = next.replace(/'#036FFC'/g, 'colors.brandBlueDeep');
      next = next.replace(/"#036FFC"/g, 'colors.brandBlueDeep');
      next = next.replace(/'#0253BD'/g, 'colors.brandBlueDeep');
      next = next.replace(/"#0253BD"/g, 'colors.brandBlueDeep');
      next = next.replace(/'#A78BFA'/g, 'colors.brandPurple');
      next = next.replace(/"#A78BFA"/g, 'colors.brandPurple');
    }

    // JSX inline icon colors (common pattern)
    next = next.replace(/color="#3AADFF"/g, 'color={colors.brandBlue}');
    next = next.replace(/color='#3AADFF'/g, 'color={colors.brandBlue}');
    next = next.replace(/color="#A78BFA"/g, 'color={colors.brandPurple}');
    next = next.replace(/color='#A78BFA'/g, 'color={colors.brandPurple}');

    // Lime gradients in arrays
    next = next.replace(/\['#D4FF58', '#B8E63C'\]/g, '[colors.brandPurple, colors.brandPurpleDeep]');
    next = next.replace(/\["#D4FF58", "#B8E63C"\]/g, '[colors.brandPurple, colors.brandPurpleDeep]');
    next = next.replace(/isDark \? \['#D4FF58', '#B8E63C'\]/g, "[colors.brandPurple, colors.brandPurpleDeep]");
  }

  return next;
}

let changed = 0;
for (const file of walk(root)) {
  const rel = path.relative(root, file);
  const before = fs.readFileSync(file, 'utf8');
  const after = migrate(before, rel);
  if (after !== before) {
    fs.writeFileSync(file, after);
    changed++;
    console.log('updated', rel);
  }
}
console.log(`Done. ${changed} files updated.`);
