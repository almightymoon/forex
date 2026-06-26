#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const HOOK = `  const { colors } = useTheme();\n  const styles = useMemo(() => createStyles(colors), [colors]);\n`;

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory() && !['node_modules', 'scripts'].includes(ent.name)) walk(p, out);
    else if (ent.isFile() && /\.tsx$/.test(ent.name)) out.push(p);
  }
  return out;
}

function getFunctionBody(src, start) {
  let depth = 0;
  let i = start;
  for (; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') {
      depth--;
      if (depth === 0) return src.slice(start, i + 1);
    }
  }
  return '';
}

function fixFile(filePath) {
  let src = fs.readFileSync(filePath, 'utf8');
  if (!src.includes('function createStyles')) return false;
  if (!src.includes('useTheme')) return false;

  const fnRegex = /(export default function|export function|function)\s+(\w+)\s*\([^)]*\)\s*\{/g;
  let match;
  const injections = [];

  while ((match = fnRegex.exec(src)) !== null) {
    const name = match[2];
    if (name === 'createStyles') continue;
    const bodyStart = match.index + match[0].length;
    const body = getFunctionBody(src, match.index + match[0].length - 1);
    if (!body) continue;
    const inner = body.slice(1, -1);
    if (!/\bcolors\./.test(inner) && !/\bstyles\./.test(inner)) continue;
    if (inner.includes('useTheme()')) continue;
    injections.push(bodyStart);
  }

  if (!injections.length) return false;
  injections.sort((a, b) => b - a);
  for (const pos of injections) {
    src = src.slice(0, pos) + HOOK + src.slice(pos);
  }
  fs.writeFileSync(filePath, src);
  console.log(path.relative(root, filePath), injections.length);
  return true;
}

let n = 0;
for (const f of [...walk(path.join(root, 'app')), ...walk(path.join(root, 'components'))]) {
  if (fixFile(f)) n++;
}
console.log(`inline fix: ${n}`);
