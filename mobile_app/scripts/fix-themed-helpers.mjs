#!/usr/bin/env node
/** Inject useTheme + styles into helper components that use createStyles. */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory() && !['node_modules', 'scripts'].includes(ent.name)) walk(p, out);
    else if (ent.isFile() && /\.tsx$/.test(ent.name)) out.push(p);
  }
  return out;
}

const HOOK_BLOCK = `  const { colors } = useTheme();\n  const styles = useMemo(() => createStyles(colors), [colors]);\n`;

function fixFile(filePath) {
  let src = fs.readFileSync(filePath, 'utf8');
  if (!src.includes('function createStyles')) return false;
  if (!src.includes('useTheme')) return false;

  let changed = false;
  const fnRegex = /(export default function|export function|function)\s+(\w+)\s*\([^)]*\)\s*\{/g;
  let match;
  const injections = [];

  while ((match = fnRegex.exec(src)) !== null) {
    const name = match[2];
    if (name === 'createStyles') continue;

    const bodyStart = match.index + match[0].length;
    const nextChunk = src.slice(bodyStart, bodyStart + 800);
    if (!nextChunk.includes('styles.')) continue;
    if (nextChunk.includes('useTheme()')) continue;

    injections.push({ pos: bodyStart, name });
  }

  if (injections.length === 0) return false;

  // Apply from end to start to preserve positions
  injections.sort((a, b) => b.pos - a.pos);
  for (const { pos, name } of injections) {
    src = src.slice(0, pos) + HOOK_BLOCK + src.slice(pos);
    changed = true;
    console.log(`${path.relative(root, filePath)} → ${name}`);
  }

  if (changed) fs.writeFileSync(filePath, src);
  return changed;
}

let n = 0;
for (const f of [...walk(path.join(root, 'app')), ...walk(path.join(root, 'components'))]) {
  if (fixFile(f)) n++;
}
console.log(`fixed helpers: ${n} files`);
