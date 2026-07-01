#!/usr/bin/env node
/** Clean up mistaken hook injections in non-component helpers. */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const HOOK_BLOCK =
  /  const \{ colors \} = useTheme\(\);\n  const styles = useMemo\(\(\) => createStyles\(colors\), \[colors\]\);\n/g;

const UTILITY_NAMES = new Set([
  'formatTime',
  'formatRelative',
  'accentForType',
  'pseudoChange',
  'getFloatingTabBarInset',
  'formatPairLabel',
  'formatPips',
  'splitPair',
  'computeRiskReward',
  'sectionLabel',
  'groupArticles',
  'greetingForNow',
]);

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory() && !['node_modules', 'scripts'].includes(ent.name)) walk(p, out);
    else if (ent.isFile() && /\.tsx$/.test(ent.name)) out.push(p);
  }
  return out;
}

function fixFile(filePath) {
  let src = fs.readFileSync(filePath, 'utf8');
  const original = src;

  src = src.replace(/\)\s*\{\s*const \{ colors \} = useTheme\(\);/g, ') {\n  const { colors } = useTheme();');

  for (const name of UTILITY_NAMES) {
    const re = new RegExp(
      `(function ${name}\\([^)]*\\)\\s*\\{)\\s*const \\{ colors \\} = useTheme\\(\\);\\s*const styles = useMemo\\(\\(\\) => createStyles\\(colors\\), \\[colors\\]\\);\\s*`,
      'g',
    );
    src = src.replace(re, '$1\n  ');
  }

  // Module-level const using colors — import lightColors fallback
  if (src.includes('function createStyles') && /^(const|let) \w+.*colors\./m.test(src)) {
    if (!src.includes('lightColors')) {
      src = src.replace(
        /import type \{ AppColors \} from ([^;]+);/,
        "import { lightColors, type AppColors } from $1;",
      );
    }
  }

  if (src !== original) {
    fs.writeFileSync(filePath, src);
    return true;
  }
  return false;
}

let n = 0;
for (const f of [...walk(path.join(root, 'app')), ...walk(path.join(root, 'components'))]) {
  if (fixFile(f)) {
    n++;
    console.log(path.relative(root, f));
  }
}
console.log(`cleaned: ${n}`);
