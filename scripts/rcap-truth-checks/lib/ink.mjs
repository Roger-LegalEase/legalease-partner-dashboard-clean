/**
 * Per-region ink measurement, read-only.
 *
 * Check D has to answer "is the value actually on the page", and text
 * extraction cannot answer it. A value drawn inside a Form XObject with a font
 * pdftotext cannot map is present and extracts as nothing — three baked values
 * on a Texas form were missed exactly that way. So the authority here is ink:
 * the page is rasterised and the widget rectangle is inspected for dark pixels.
 *
 * A form's own pre-printed content (rules, shading, a label that overlaps the
 * box) also puts ink inside the rectangle. To keep that from reading as a
 * participant value, the same rectangle is measured on the blank official
 * source and subtracted. What remains is ink the render added.
 *
 * Nothing is written except PGM scratch files under the caller's own directory.
 */

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

export const DPI = 150;
const SCALE = DPI / 72;
/** A pixel this dark counts as ink. Anti-aliasing sits well above it. */
const INK_LEVEL = 160;

/** Parse a binary P5 PGM into { width, height, data }. */
export function readPGM(file) {
  const buf = fs.readFileSync(file);
  let i = 0;
  const token = () => {
    while (i < buf.length) {
      if (buf[i] === 0x23) { while (i < buf.length && buf[i] !== 0x0a) i += 1; }
      else if (buf[i] === 0x20 || buf[i] === 0x0a || buf[i] === 0x0d || buf[i] === 0x09) i += 1;
      else break;
    }
    const s = i;
    while (i < buf.length && ![0x20, 0x0a, 0x0d, 0x09].includes(buf[i])) i += 1;
    return buf.toString('ascii', s, i);
  };
  const magic = token();
  if (magic !== 'P5') throw new Error(`not a P5 PGM: ${file}`);
  const width = Number(token());
  const height = Number(token());
  const maxval = Number(token());
  i += 1; // exactly one whitespace byte follows maxval
  if (maxval !== 255) throw new Error(`unsupported maxval ${maxval}`);
  return { width, height, data: buf.subarray(i, i + width * height) };
}

/**
 * Rasterise one page to grayscale. Cached per (pdf, page) for the process:
 * a 43-page kit is rendered once, not once per widget.
 */
export function renderPage(pdf, page, scratchDir, cache) {
  const key = `${pdf}#${page}`;
  if (cache.has(key)) return cache.get(key);
  const prefix = path.join(
    scratchDir,
    `pg-${Buffer.from(key).toString('base64url').slice(-40)}`,
  );
  let img = null;
  try {
    execFileSync(
      'pdftoppm',
      ['-r', String(DPI), '-f', String(page), '-l', String(page), '-gray', pdf, prefix],
      { stdio: ['ignore', 'ignore', 'ignore'], timeout: 120000 },
    );
    const dir = path.dirname(prefix);
    const base = path.basename(prefix);
    const hit = fs.readdirSync(dir).find((f) => f.startsWith(`${base}-`) && f.endsWith('.pgm'));
    if (hit) {
      img = readPGM(path.join(dir, hit));
      fs.unlinkSync(path.join(dir, hit));
    }
  } catch {
    img = null;
  }
  cache.set(key, img);
  return img;
}

/** PDF rect (origin bottom-left, points) -> pixel box (origin top-left). */
export function rectToBox(rect, pageHeightPts, img) {
  const x0 = Math.max(0, Math.floor(rect.x * SCALE));
  const x1 = Math.min(img.width, Math.ceil((rect.x + rect.width) * SCALE));
  const y0 = Math.max(0, Math.floor((pageHeightPts - rect.y - rect.height) * SCALE));
  const y1 = Math.min(img.height, Math.ceil((pageHeightPts - rect.y) * SCALE));
  return { x0, y0, x1, y1 };
}

/** Fraction of pixels in the rectangle that are ink. */
export function darkFraction(img, box) {
  const { x0, y0, x1, y1 } = box;
  if (x1 <= x0 || y1 <= y0) return null;
  let dark = 0;
  let total = 0;
  for (let y = y0; y < y1; y += 1) {
    const row = y * img.width;
    for (let x = x0; x < x1; x += 1) {
      total += 1;
      if (img.data[row + x] < INK_LEVEL) dark += 1;
    }
  }
  return total === 0 ? null : dark / total;
}

/** Page height in points, per page, from pdfinfo. */
export function pageHeights(pdf, cache) {
  if (cache.has(pdf)) return cache.get(pdf);
  let h = 792;
  try {
    const out = execFileSync('pdfinfo', [pdf], { encoding: 'utf8', timeout: 60000 });
    const m = /^Page size:\s+([\d.]+) x ([\d.]+)/m.exec(out);
    if (m) h = Number(m[2]);
  } catch { /* letter default */ }
  cache.set(pdf, h);
  return h;
}
