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

function getFunctionBody(src, start) {
  let depth = 0;
  for (let i = start; i < src.length; i++) {
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
  const factories = [...src.matchAll(/function create(\w+)Styles\(colors: AppColors\)/g)];
  if (!factories.length) return false;

  const varNames = factories.map((m) => {
    const name = m[1];
    if (name === 'Styles') return 'styles';
    if (name === 'Detail') return 'detail';
    if (name === 'Modal') return 'modal';
    if (name === 'Stat') return 'statStyles';
    if (name === 'Row') return 'rowStyles';
    if (name === 'Storage') return 'storageStyles';
    if (name === 'Tr') return 'trStyles';
    if (name === 'Step') return 'stepStyles';
    if (name === 'Html') return 'htmlStyles';
    if (name === 'Lesson') return 'lessonStyles';
    if (name === 'Chart') return 'chartStyles';
    if (name === 'Aurora') return 'auroraStyles';
    if (name === 'Light') return 'lightStyles';
    return name.charAt(0).toLowerCase() + name.slice(1) + 'Styles';
  });

  let changed = false;
  const fnRegex = /(export default function|export function|function)\s+(\w+)\s*\([^)]*\)\s*\{/g;
  let match;

  while ((match = fnRegex.exec(src)) !== null) {
    const name = match[2];
    if (name.startsWith('create')) continue;
    const bodyStart = match.index + match[0].length;
    const body = getFunctionBody(src, match.index + match[0].length - 1);
    if (!body) continue;
    const inner = body.slice(1, -1);
    if (inner.includes('useTheme()')) continue;

    const needed = varNames.filter((v) => new RegExp(`\\b${v}\\.`).test(inner));
    if (!needed.length && !/\bcolors\./.test(inner) && !/\bstyles\./.test(inner)) continue;

    let injection = '';
    if ((/\bcolors\./.test(inner) || /\bstyles\./.test(inner)) && !needed.includes('styles')) {
      injection += '  const { colors } = useTheme();\n';
      if (/\bstyles\./.test(inner)) {
        injection += '  const styles = useMemo(() => createStyles(colors), [colors]);\n';
      }
    } else if (needed.length) {
      injection += '  const { colors } = useTheme();\n';
    }

    for (const v of needed) {
      const factory = factories[varNames.indexOf(v)];
      const factoryName = `create${factory[1]}Styles`;
      injection += `  const ${v} = useMemo(() => ${factoryName}(colors), [colors]);\n`;
    }

    if (!injection) continue;
    src = src.slice(0, bodyStart) + injection + src.slice(bodyStart);
    changed = true;
    fnRegex.lastIndex = bodyStart + injection.length;
  }

  if (changed) {
    fs.writeFileSync(filePath, src);
    console.log(path.relative(root, filePath));
  }
  return changed;
}

let n = 0;
for (const f of [...walk(path.join(root, 'app')), ...walk(path.join(root, 'components'))]) {
  if (fixFile(f)) n++;
}
console.log(`style vars: ${n}`);
