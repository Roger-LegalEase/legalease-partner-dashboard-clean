#!/usr/bin/env node
// Exact-source regression for the existing appearance-disposition and nested-
// detach options. This adds no renderer option or application caller.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { sanitizeAndFlatten, scanBytesForActiveContent } from '../rcap-official-forms/rcap-active-content.mjs';
import { APPEARANCE_DISPOSITION as D } from '../rcap-official-forms/rcap-appearance-semantics.mjs';
const require = createRequire(import.meta.url);
const { PDFDocument, PDFName, PDFDict } = require('pdf-lib');
const sharp = require('sharp');
const sourcePath = process.env.NE_PRINTED_BUTTON_SOURCE;
assert.ok(sourcePath, 'NE_PRINTED_BUTTON_SOURCE must name the exact pinned DC1:15 original');
const source = fs.readFileSync(sourcePath);
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');
assert.equal(source.length, 8485306);
assert.equal(sha(source), '43675986d4b740ebb26c0b6778655e25f5d1bd6145a439154b00350c6072cd5b');
const out = process.env.NE_PRINTED_BUTTON_TEST_OUTPUT ?? '/tmp/fix91-button-shared-existing';
fs.mkdirSync(out, { recursive: true });
const fieldName = 'Button63.0', reports = {};
let sourceRect, nonprintingRect;
async function variant(name, { preserve = false, nested = false } = {}) {
  const doc = await PDFDocument.load(source, { updateMetadata: false });
  const form = doc.getForm(), field = form.getField(fieldName), widgets = field.acroField.getWidgets();
  sourceRect = widgets[0].getRectangle();
  nonprintingRect = form.getField('Button4').acroField.getWidgets()[0].getRectangle();
  const streams = widgets.map((w) => w.dict.lookup(PDFName.of('AP')).lookup(PDFName.of('N')));
  const streamHashes = streams.map((s) => sha(s.contents));
  const { clean, report } = await sanitizeAndFlatten(doc, {
    appearanceDispositions: new Map([[fieldName, preserve ? D.PRESERVE_SOURCE_APPEARANCE : D.SUPPRESS_CONTROL_APPEARANCE]]),
    detachNestedControlFields: nested,
  });
  if (preserve) {
    assert.ok(report.widgetContributions.sourceAppearancesPreserved.includes(fieldName));
    assert.deepEqual(streams.map((s) => sha(s.contents)), streamHashes);
    for (const w of widgets) {
      const mk = w.dict.lookup(PDFName.of('MK'));
      assert.ok(!(mk instanceof PDFDict) || !mk.has(PDFName.of('BG')));
    }
  }
  assert.ok(report.widgetContributions.commandControlsDropped.includes('Button4'));
  for (const hidden of ['Button63.1', 'Button63.2', 'Button63.3']) {
    assert.ok(report.widgetContributions.fieldsWithNonDisplayedWidgets.includes(hidden));
  }
  assert.equal(clean.getForm().getFields().length, 0);
  clean.setCreationDate(new Date('2026-09-06T00:00:00Z'));
  clean.setModificationDate(new Date('2026-09-06T00:00:00Z'));
  const bytes = Buffer.from(await clean.save({ useObjectStreams: false, updateFieldAppearances: false }));
  assert.deepEqual(scanBytesForActiveContent(bytes).hits, []);
  assert.ok(report.fieldActionsStripped.length > 0);
  const file = path.join(out, name + '.pdf');
  fs.writeFileSync(file, bytes);
  reports[name] = { sha256: sha(bytes), byteLength: bytes.length, sourceAppearanceSha256: streamHashes,
    fieldActionsStripped: report.fieldActionsStripped.length, activeContentClean: true,
    sourceButtonPreserved: preserve, nestedDetachment: nested,
    nonprintingControlsDropped: report.widgetContributions.commandControlsDropped,
    hiddenWidgetsDropped: report.widgetContributions.fieldsWithNonDisplayedWidgets, file };
  return bytes;
}
const preserved = await variant('preserved', { preserve: true, nested: true });
assert.deepEqual(preserved, await variant('preserved-repeat', { preserve: true, nested: true }));
await variant('suppressed-shallow');
await variant('suppressed-deep', { nested: true });
fs.writeFileSync(path.join(out, 'source.pdf'), source);
const rasters = [];
for (const name of ['source', 'preserved', 'suppressed-shallow', 'suppressed-deep']) {
  const cmd = ['-r', '300', '-png', '-f', '1', '-singlefile', path.join(out, name + '.pdf'), path.join(out, name)];
  const p = spawnSync('pdftoppm', cmd, { encoding: 'utf8' });
  rasters.push({ command: ['pdftoppm', ...cmd], exitCode: p.status, stderr: p.stderr });
  assert.equal(p.status, 0); assert.equal(p.stderr, '');
}
const scale = 300 / 72;
function boxFor(r, padding = 1) {
  return { left: Math.floor((r.x - padding) * scale), top: Math.floor((792 - r.y - r.height - padding) * scale),
    width: Math.ceil((r.width + padding * 2) * scale), height: Math.ceil((r.height + padding * 2) * scale) };
}
const box = boxFor(sourceRect);
async function crop(name, rectangle = box) {
  return sharp(path.join(out, name + '.png')).extract(rectangle).removeAlpha().raw().toBuffer();
}
const sourcePixels = await crop('source');
async function delta(name) {
  const b = await crop(name); assert.equal(b.length, sourcePixels.length);
  let pixels = 0;
  for (let i = 0; i < b.length; i += 3) {
    if (Math.max(...[0, 1, 2].map((k) => Math.abs(b[i + k] - sourcePixels[i + k]))) > 24) pixels++;
  }
  return pixels;
}
const preservedDelta = await delta('preserved'), shallowDelta = await delta('suppressed-shallow'), deepDelta = await delta('suppressed-deep');
assert.equal(preservedDelta, 0, 'existing explicit preservation must retain exact printed source pixels');
assert.ok(shallowDelta > 0, 'the original suppression/shallow-detach path must reproduce the visual defect');
assert.ok(deepDelta > 0, 'deep detachment alone must still remove the printed source button');
const nonprintingBox = boxFor(nonprintingRect, 0), nonprintingPixels = await crop('preserved', nonprintingBox);
let nonprintingInk = 0;
for (let i = 0; i < nonprintingPixels.length; i += 3) if (Math.min(...nonprintingPixels.subarray(i, i + 3)) < 240) nonprintingInk++;
assert.equal(nonprintingInk, 0, 'the nonprinting Button4 must leave no paint');
for (const name of ['source', 'preserved', 'suppressed-shallow', 'suppressed-deep']) {
  await sharp(path.join(out, name + '.png')).extract(box).png().toFile(path.join(out, name + '-crop.png'));
}
const result = { result: 'PASS', source: { path: sourcePath, sha256: sha(source), byteLength: source.length },
  fieldName, sourceRect, testedExistingOptions: { appearanceDispositions: [[fieldName, D.PRESERVE_SOURCE_APPEARANCE]], detachNestedControlFields: true },
  newRuntimeCodeRequired: false, reports, rasters, comparison: { box, preservedDelta, shallowDelta, deepDelta, nonprintingBox, nonprintingInk },
  routesOpened: 0, productionTouched: 'NO' };
fs.writeFileSync(path.join(out, 'result.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ result: result.result, comparison: result.comparison }));
