#!/usr/bin/env node
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

function fixFile(filePath) {
  let src = fs.readFileSync(filePath, 'utf8');
  if (!src.includes('function createStyles')) return false;
  if (!/const \w+ = StyleSheet\.create/.test(src)) return false;

  const names = [];
  src = src.replace(/^const (\w+) = StyleSheet\.create\(\{/gm, (_, name) => {
    if (name === 'styles') return _;
    names.push(name);
    return `function create${name.charAt(0).toUpperCase()}${name.slice(1)}Styles(colors: AppColors) {\n  return StyleSheet.create({`;
  });

  if (!names.length) return false;

  // Close extra function braces: transform `});\n` after createX blocks - fragile
  // Instead: after each createX block's `});` add `}`

  for (const name of names) {
    const fn = `create${name.charAt(0).toUpperCase()}${name.slice(1)}Styles`;
    const re = new RegExp(`(function ${fn}\\(colors: AppColors\\) \\{[\\s\\S]*?\\n\\}\\);)(?!\\n\\})`, 'm');
    src = src.replace(re, '$1\n}');
  }

  // Inject useMemo for each extra style in default export if not present
  for (const name of names) {
    const fn = `create${name.charAt(0).toUpperCase()}${name.slice(1)}Styles`;
    if (src.includes(`create${name.charAt(0).toUpperCase()}${name.slice(1)}Styles(colors)`)) continue;
    src = src.replace(
      /(const styles = useMemo\(\(\) => createStyles\(colors\), \[colors\]\);)/,
      `$1\n  const ${name} = useMemo(() => ${fn}(colors), [colors]);`,
    );
  }

  fs.writeFileSync(filePath, src);
  console.log(path.relative(root, filePath), names.join(', '));
  return true;
}

let n = 0;
for (const f of [...walk(path.join(root, 'app')), ...walk(path.join(root, 'components'))]) {
  if (fixFile(f)) n++;
}
console.log(`extra sheets: ${n}`);
