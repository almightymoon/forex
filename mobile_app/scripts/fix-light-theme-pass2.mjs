#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SKIP = new Set(['NeoCardsCarousel.tsx', 'CourseVideoPlayer.tsx', 'SplashOrbScene.tsx', 'trading-view.tsx', 'news-article.tsx']);

const REPS = [
  [/backgroundColor:\s*'rgba\(255,255,255,0\.1\)'/g, 'backgroundColor: colors.surfaceHover'],
  [/backgroundColor:\s*'rgba\(255,255,255,0\.03\)'/g, 'backgroundColor: colors.surfaceHover'],
  [/backgroundColor:\s*'rgba\(255,255,255,0\.22\)'/g, 'backgroundColor: colors.surfaceHover'],
  [/backgroundColor:\s*'rgba\(255,255,255,0\.18\)'/g, 'backgroundColor: colors.surfaceHover'],
  [/backgroundColor:\s*'rgba\(255,255,255,0\.2\)'/g, 'backgroundColor: colors.surfaceHover'],
  [/borderColor:\s*'rgba\(255,255,255,0\.2\)'/g, 'borderColor: colors.border'],
  [/borderColor:\s*'rgba\(255,255,255,0\.3\)'/g, 'borderColor: colors.border'],
  [/bg:\s*'rgba\(255,255,255,0\.0[56]\)'/g, 'bg: colors.surfaceHover'],
  [/from ['"]\.\/theme\.ts['"]/g, "from './theme'"],
  [/from (['"])(\.\.\/)+constants\/theme\.ts\1/g, (m, q, pre) => `from ${q}${pre}constants/theme${q}`],
];

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory() && ent.name !== 'node_modules' && ent.name !== 'scripts') walk(p, out);
    else if (ent.isFile() && /\.tsx?$/.test(ent.name)) out.push(p);
  }
  return out;
}

let n = 0;
for (const f of ['app', 'components', 'constants'].flatMap((d) => walk(path.join(root, d)))) {
  if (SKIP.has(path.basename(f))) continue;
  let c = fs.readFileSync(f, 'utf8');
  const o = c;
  for (const [re, rep] of REPS) c = c.replace(re, rep);
  if (c !== o) {
    fs.writeFileSync(f, c);
    n++;
    console.log(path.relative(root, f));
  }
}
console.log(`pass-2: ${n} files`);
