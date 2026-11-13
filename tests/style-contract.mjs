import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const srcDir = new URL('src/', root);

async function cssFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const url = new URL(`${entry.name}${entry.isDirectory() ? '/' : ''}`, dir);
    if (entry.isDirectory()) files.push(...await cssFiles(url));
    else if (entry.name.endsWith('.css')) files.push(url);
  }
  return files;
}

// Phase 5 contract: tokens own every literal color; breakpoints are the agreed five.
const allowedBreakpoints = new Set(['480', '640', '900', '1024', '1440', '1023', '639', '901']);
const colorPattern = /#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(/;
const files = await cssFiles(srcDir);
for (const file of files) {
  const path = new URL(file).pathname;
  if (path.endsWith('/styles/tokens.css')) continue;
  const css = await readFile(file, 'utf8');
  const color = css.match(colorPattern);
  assert.equal(color, null, `${path} has a color literal (${color}); move it into tokens.css`);
  for (const media of css.matchAll(/@media[^{}]+/g)) {
    for (const match of media[0].matchAll(/(?:max|min)-width:\s*(\d+)px/g)) {
      assert.ok(allowedBreakpoints.has(match[1]), `${path} uses breakpoint ${match[1]}px`);
    }
  }
}

console.log('Style token and breakpoint checks passed.');
