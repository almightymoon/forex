#!/usr/bin/env node
/**
 * Neobank theme pass for menu-linked stack screens.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

const FILES = [
  'app/(app)/faq.tsx',
  'app/(app)/support.tsx',
  'app/(app)/about.tsx',
  'app/(app)/terms.tsx',
  'app/(app)/notifications.tsx',
  'app/(app)/subscription.tsx',
  'app/(app)/progress.tsx',
  'app/(app)/assignments.tsx',
  'app/(app)/certificates.tsx',
  'app/(app)/certificate-assignments.tsx',
  'app/(app)/referrals.tsx',
  'app/(app)/rank-rewards.tsx',
  'app/(app)/withdrawals.tsx',
  'app/(app)/mt5.tsx',
  'app/(app)/news.tsx',
  'app/(app)/live-sessions.tsx',
  'app/(app)/monthly-fee.tsx',
  'app/(app)/profile.tsx',
  'app/(app)/settings.tsx',
  'components/menu/MenuProfileCard.tsx',
  'components/menu/MenuRow.tsx',
  'components/menu/MenuQuickGrid.tsx',
];

const REPS = [
  [/name="arrow-back" size=\{20\} color="#fff"/g, 'name="arrow-back" size={20} color={colors.text}'],
  [/name="arrow-back" size=\{22\} color="#fff"/g, 'name="arrow-back" size={22} color={colors.text}'],
  [/tintColor="#3AADFF"/g, 'tintColor={colors.black}'],
  [/<ActivityIndicator color="#3AADFF"/g, '<ActivityIndicator color={colors.black}'],
  [/<ActivityIndicator size="small" color="#3AADFF"/g, '<ActivityIndicator size="small" color={colors.black}'],
  [/pillActive: \{ borderColor: '#3AADFF', backgroundColor: 'rgba\(58,173,255,0\.12\)' \}/g,
    "pillActive: { borderColor: colors.black, backgroundColor: 'rgba(212,255,88,0.4)' }"],
  [/pillTextActive: \{ color: '#3AADFF' \}/g, 'pillTextActive: { color: colors.text, fontWeight: \'700\' }'],
  [/chipActive: \{ backgroundColor: 'rgba\(0,96,230,0\.[^']+'\), borderColor: '#3AADFF' \}/g,
    "chipActive: { backgroundColor: 'rgba(212,255,88,0.4)', borderColor: colors.black }"],
  [/chipTextActive: \{ color: '#3AADFF'[^}]*\}/g, "chipTextActive: { color: colors.text, fontWeight: '800' }"],
  [/filterChipTextActive: \{ color: '#3AADFF' \}/g, "filterChipTextActive: { color: colors.text, fontWeight: '700' }"],
  [/backgroundColor: 'rgba\(0,96,230,0\.15\)'/g, "backgroundColor: 'rgba(212,255,88,0.35)'"],
  [/backgroundColor: 'rgba\(0,96,230,0\.2\)'/g, "backgroundColor: 'rgba(212,255,88,0.35)'"],
  [/backgroundColor: 'rgba\(0,96,230,0\.12\)'/g, "backgroundColor: 'rgba(212,255,88,0.28)'"],
  [/backgroundColor: 'rgba\(0,96,230,0\.1\)'/g, "backgroundColor: 'rgba(212,255,88,0.25)'"],
  [/backgroundColor: 'rgba\(0,96,230,0\.3\)'/g, "backgroundColor: colors.black"],
  [/borderColor: 'rgba\(58,173,255,0\.35\)'/g, 'borderColor: colors.border'],
  [/borderColor: 'rgba\(58,173,255,0\.3\)'/g, 'borderColor: colors.border'],
  [/borderColor: 'rgba\(58,173,255,0\.4\)'/g, 'borderColor: colors.black'],
  [/borderColor: 'rgba\(58,173,255,0\.18\)'/g, 'borderColor: colors.border'],
  [/borderColor: 'rgba\(58,173,255,0\.15\)'/g, 'borderColor: colors.border'],
  [/borderColor: 'rgba\(58,173,255,0\.2\)'/g, 'borderColor: colors.border'],
  [/borderColor: 'rgba\(58,173,255,0\.28\)'/g, 'borderColor: colors.border'],
  [/borderColor: 'rgba\(58,173,255,0\.5\)'/g, 'borderColor: colors.border'],
  [/color: '#3AADFF'/g, 'color: colors.text'],
  [/color="#3AADFF"/g, 'color={colors.text}'],
  [/statNum: \{ fontSize: 22, fontWeight: '900', color: colors\.text \}/g, "statNum: { fontSize: 22, fontWeight: '900', color: colors.black }"],
];

let n = 0;
for (const rel of FILES) {
  const f = path.join(root, rel);
  if (!fs.existsSync(f)) continue;
  let c = fs.readFileSync(f, 'utf8');
  const o = c;
  for (const [re, rep] of REPS) c = c.replace(re, rep);
  if (c !== o) {
    fs.writeFileSync(f, c);
    n++;
    console.log(rel);
  }
}
console.log(`menu-theme: ${n} files`);
