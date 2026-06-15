#!/usr/bin/env node
/**
 * Generates static favicon assets in public/ from brand-icon.svg.
 * Run: node scripts/generate-favicons.mjs
 */

import { mkdir, readFile, writeFile } from 'fs/promises';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';
import pngToIco from 'png-to-ico';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const PUBLIC_DIR = join(ROOT, 'public');
const SVG_PATH = join(PUBLIC_DIR, 'brand-icon.svg');

const SIZES = [16, 32, 48, 180, 192, 512];

async function main() {
  const svg = await readFile(SVG_PATH);

  for (const size of SIZES) {
    const out =
      size === 180
        ? join(PUBLIC_DIR, 'apple-touch-icon.png')
        : size === 192
          ? join(PUBLIC_DIR, 'icon-192.png')
          : size === 512
            ? join(PUBLIC_DIR, 'icon-512.png')
            : join(PUBLIC_DIR, `favicon-${size}x${size}.png`);

    await sharp(svg).resize(size, size).png().toFile(out);
    console.log(`Wrote ${out}`);
  }

  const icon48 = await readFile(join(PUBLIC_DIR, 'favicon-48x48.png'));
  const icon32 = await readFile(join(PUBLIC_DIR, 'favicon-32x32.png'));
  const icon16 = await readFile(join(PUBLIC_DIR, 'favicon-16x16.png'));
  const ico = await pngToIco([icon16, icon32, icon48]);
  await writeFile(join(PUBLIC_DIR, 'favicon.ico'), ico);
  console.log(`Wrote ${join(PUBLIC_DIR, 'favicon.ico')}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
