#!/usr/bin/env node
/**
 * Converts module-level StyleSheet.create({ ... colors ... }) to useTheme + createStyles.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SKIP = new Set([
  'theme.ts',
  'onboardingTheme.ts',
  'authTheme.ts',
  'neoHomeTheme.ts',
  'ThemeContext.tsx',
  'useThemedStyles.ts',
  'screenStyles.ts',
  'glassScreenStyles.ts',
  'exploreStyles.ts',
  'appCardStyle.ts',
  'appBackground.ts',
]);

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory() && !['node_modules', 'scripts', '.expo'].includes(ent.name)) walk(p, out);
    else if (ent.isFile() && /\.tsx$/.test(ent.name)) out.push(p);
  }
  return out;
}

function themeImportPath(filePath) {
  const rel = path.relative(path.dirname(filePath), path.join(root, 'constants/theme'));
  return rel.startsWith('.') ? rel : `./${rel}`;
}

function contextImportPath(filePath) {
  const rel = path.relative(path.dirname(filePath), path.join(root, 'contexts/ThemeContext'));
  return rel.startsWith('.') ? rel : `./${rel}`;
}

function transformFile(filePath) {
  if (SKIP.has(path.basename(filePath))) return false;
  let src = fs.readFileSync(filePath, 'utf8');
  if (!src.includes('constants/theme')) return false;
  if (src.includes('useTheme(') && src.includes('createStyles')) return false;
  if (!src.match(/const\s+styles\s*=\s*StyleSheet\.create/)) return false;

  const themePath = themeImportPath(filePath);
  const ctxPath = contextImportPath(filePath);

  src = src.replace(
    /import\s*\{([^}]*)\}\s*from\s*['"][^'"]*constants\/theme['"];?/,
    (match, imports) => {
      const parts = imports.split(',').map((s) => s.trim()).filter(Boolean);
      const withoutColors = parts.filter((p) => !p.startsWith('colors'));
      const typeImport = withoutColors.length
        ? `import { ${withoutColors.join(', ')} } from '${themePath}';\nimport type { AppColors } from '${themePath}';`
        : `import type { AppColors } from '${themePath}';`;
      return typeImport;
    },
  );

  if (!src.includes('useMemo')) {
    if (src.includes("from 'react'")) {
      src = src.replace(/import\s*\{([^}]*)\}\s*from\s*'react';/, (m, imps) => {
        const set = new Set(imps.split(',').map((s) => s.trim()).filter(Boolean));
        set.add('useMemo');
        return `import { ${[...set].join(', ')} } from 'react';`;
      });
    } else {
      src = `import { useMemo } from 'react';\n${src}`;
    }
  }

  if (!src.includes('useTheme')) {
    src = src.replace(
      /(import type \{ AppColors \}[^\n]+\n)/,
      `$1import { useTheme } from '${ctxPath}';\n`,
    );
  }

  src = src.replace(
    /const\s+styles\s*=\s*StyleSheet\.create\(\s*\{([\s\S]*?)\}\s*\);\s*$/m,
    'function createStyles(colors: AppColors) {\n  return StyleSheet.create({$1});\n}\n',
  );

  if (src.includes('export default function')) {
    src = src.replace(
      /export default function (\w+)\([^)]*\)\s*\{/,
      (m) => `${m}\n  const { colors } = useTheme();\n  const styles = useMemo(() => createStyles(colors), [colors]);`,
    );
  }

  fs.writeFileSync(filePath, src);
  return true;
}

let n = 0;
for (const f of [...walk(path.join(root, 'app')), ...walk(path.join(root, 'components'))]) {
  if (transformFile(f)) {
    n++;
    console.log(path.relative(root, f));
  }
}
console.log(`themed: ${n} files`);
