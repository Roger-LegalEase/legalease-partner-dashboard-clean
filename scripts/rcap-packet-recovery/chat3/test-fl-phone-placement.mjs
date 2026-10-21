#!/usr/bin/env node
// Focused placement regression, not a full build or an independent approval.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const BUILDER = path.join(ROOT, 'scripts/build-census-v1-fl-early-juvenile-set.mjs');
const source = fs.readFileSync(BUILDER, 'utf8');
const fixtureMatch = source.match(/const FIXTURES = Object\.freeze\(([\s\S]*?)\);/);
const fitMatch = source.match(/function fitText\([\s\S]*?\n\}/);
const phoneCalls = [...source.matchAll(/fitText\((p[12]), font, facts\["participant\.phone"\],[^\n]+/g)];
assert.ok(fixtureMatch, 'Cannot locate actual builder fixtures');
assert.ok(fitMatch, 'Cannot locate actual builder drawing function');
assert.equal(phoneCalls.length, 2, 'Both official phone placements must remain present');
const FIXTURES = vm.runInNewContext(`(${fixtureMatch[1]})`);
// Helvetica AFM: digits 556/1000 em, hyphen 333/1000 em. No pair kerns occur
// in these two existing numeric fixtures. PDF-level measurements run separately.
const font = { widthOfTextAtSize(text, size) {
  assert.match(text, /^[0-9-]+$/, 'Unexpected fixture phone glyph');
  return [...text].reduce((width, c) => width + (c === '-' ? 333 : 556), 0) * size / 1000;
} };
function draw(call, phone) {
  const writes = [];
  const page = { drawText(text, options) { writes.push({ text, ...options }); } };
  vm.runInNewContext(`${fitMatch[0]}\n${call}`, {
    assert, sanitize: String, rgb: () => [0, 0, 0], font,
    facts: { 'participant.phone': phone }, p1: page, p2: page,
  });
  assert.equal(writes.length, 1);
  return writes[0];
}
function checkPageOne(write, expected) {
  assert.equal(write.text, expected, 'Known phone must not be truncated or changed');
  assert.equal(write.size, 8.5, 'Do not reduce the fixture phone font to evade overlap');
  assert.equal(write.y, 573, 'Do not move into the printed label or next address row');
  assert.ok(write.x >= 384.5, 'Phone crosses the printed closing parenthesis');
  assert.ok(write.x + font.widthOfTextAtSize(write.text, write.size) <= 453,
    'Phone crosses the right safe edge toward the SSN field');
}
let positives = 0, negatives = 0;
const pageOneCall = phoneCalls.find(m => m[1] === 'p1')[0];
const pageTwoCall = phoneCalls.find(m => m[1] === 'p2')[0];
const observations = [];
for (const [fixture, facts] of Object.entries(FIXTURES)) {
  const phone = facts['participant.phone'];
  const one = draw(pageOneCall, phone);
  checkPageOne(one, phone); positives++;
  const two = draw(pageTwoCall, phone);
  assert.equal(two.text, phone);
  assert.equal(two.x, 441); assert.equal(two.y, 670); assert.equal(two.size, 8.5);
  positives++;
  observations.push({ fixture, phone, x: one.x, y: one.y, fontSize: one.size,
    right: one.x + font.widthOfTextAtSize(phone, one.size),
    printedClosingParenthesisRight: 384.22, clearance: one.x - 384.22 });
  for (const mutate of [
    w => ({...w, x: 359}), // exact prior defect
    w => ({...w, x: 384.2}), // a nearly cleared but still colliding glyph
    w => ({...w, x: 420}), // move too far and cross the cell boundary
    w => ({...w, text: w.text.slice(0, -1)}),
    w => ({...w, size: 5}),
    w => ({...w, y: 584}),
  ]) {
    assert.throws(() => checkPageOne(mutate(one), phone)); negatives++;
  }
}
console.log(JSON.stringify({ suite: 'fl-phone-placement', positives, negatives,
  observations, fullDeterministicRebuild: false, independentApproval: false }, null, 2));
