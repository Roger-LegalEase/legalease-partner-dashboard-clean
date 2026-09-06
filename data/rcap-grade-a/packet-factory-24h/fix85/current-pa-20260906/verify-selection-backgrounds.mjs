// Focused exact-source regression; writes only its explicit temporary output directory.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { sanitizeAndFlatten, scanBytesForActiveContent } from '../../../../../scripts/rcap-official-forms/rcap-active-content.mjs';
const require = createRequire(import.meta.url);
const { PDFDocument, PDFName, PDFDict } = require('pdf-lib');
const sharp = require('sharp');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../..');
const sourceRoot = process.env.MASTER_LIBRARY_SOURCE_DIR;
assert.ok(sourceRoot, 'exact source tree must be supplied');
const out = process.env.FIX85_BACKGROUND_TEST_OUTPUT || fs.mkdtempSync(path.join(os.tmpdir(), 'fix85-source-background-'));
fs.mkdirSync(out, { recursive: true });
const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const reports = [];
const raster = (file, prefix) => {
  const command = ['pdftoppm', '-r', '300', '-png', file, prefix];
  const p = spawnSync(command[0], command.slice(1), { encoding: 'utf8' });
  assert.equal(p.status, 0, p.stderr);
  return { command, exitCode: p.status, stderr: p.stderr, image: `${prefix}-1.png` };
};
const raw = async file => sharp(file).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const changedPixels = (a, b, box) => {
  assert.equal(a.info.width, b.info.width); assert.equal(a.info.height, b.info.height);
  let n = 0;
  for (let y = box.top; y < box.top + box.height; y++) for (let x = box.left; x < box.left + box.width; x++) {
    const i = (y * a.info.width + x) * a.info.channels;
    if (Math.max(...Array.from({ length: a.info.channels }, (_, k) => Math.abs(a.data[i + k] - b.data[i + k]))) > 24) n++;
  }
  return n;
};
for (const rule of ['490', '790']) {
  const dir = `data/rcap-all50/overlays/census-v1/pa/pa-${rule}-nonconviction-set--official-pdf-fill`;
  const receipt = JSON.parse(fs.readFileSync(path.join(ROOT, dir, 'source-receipt.json')));
  const bound = receipt.documents.find(d => d.documentId === `PA-RCRIM-P-${rule}-PETITION`);
  const input = fs.readFileSync(path.join(sourceRoot, bound.pathInArchive));
  assert.equal(digest(input), bound.sha256); assert.equal(input.length, bound.byteLength);
  const variants = {};
  for (const variant of ['default', 'disabled', 'enabled', 'written-disabled', 'written-enabled']) {
    const pdf = await PDFDocument.load(input, { ignoreEncryption: true, updateMetadata: false });
    const form = pdf.getForm(); const field = form.getCheckBox('Check Box1');
    const sourceWidgets = field.acroField.getWidgets();
    if (variant.startsWith('written')) field.check();
    // A copy-only script probes the action sanitizer while preserving the actual pinned input.
    pdf.addJavaScript('regression-action', 'app.alert("must be removed");');
    const writtenFields = new Set(variant.startsWith('written') ? ['Check Box1'] : []);
    const options = { writtenFields, suppressSynthesizedAppearances: true };
    if (variant !== 'default') options.preserveUnwrittenSelectionBackgrounds = variant.endsWith('enabled');
    const { clean, report } = await sanitizeAndFlatten(pdf, options);
    clean.setCreationDate(new Date('2026-08-30T00:00:00.000Z'));
    clean.setModificationDate(new Date('2026-08-30T00:00:00.000Z'));
    const bytes = Buffer.from(await clean.save({ useObjectStreams: false, updateFieldAppearances: false }));
    assert.deepEqual(scanBytesForActiveContent(bytes).hits, [], `${rule}/${variant}: active content survived`);
    assert.equal(clean.getForm().getFields().length, 0, 'flattened regression retains fields');
    for (const w of sourceWidgets) {
      const mk = w.dict.lookup(PDFName.of('MK'));
      assert.ok(!(mk instanceof PDFDict) || mk.get(PDFName.of('BG')) === undefined, 'MK/BG must still be removed');
    }
    const file = path.join(out, `${rule}-${variant}.pdf`); fs.writeFileSync(file, bytes);
    variants[variant] = { sha256: digest(bytes), report, file };
  }
  assert.equal(variants.default.sha256, variants.disabled.sha256, 'omitted and disabled option must be byte-identical');
  assert.equal(variants['written-disabled'].sha256, variants['written-enabled'].sha256, 'written selection behavior must be byte-identical');
  assert.ok(variants.enabled.report.widgetContributions.sourceSelectionBackgroundsPreserved.includes('Check Box1'));
  assert.ok(!variants['written-enabled'].report.widgetContributions.sourceSelectionBackgroundsPreserved?.includes('Check Box1'));
  const sourceFile = path.join(out, `${rule}-source.pdf`); fs.writeFileSync(sourceFile, input);
  const images = {};
  for (const [name, file] of [['source', sourceFile], ['enabled', variants.enabled.file], ['disabled', variants.disabled.file]]) {
    const r = raster(file, path.join(out, `${rule}-${name}`)); images[name] = { ...r, pixels: await raw(r.image) };
  }
  const original = await PDFDocument.load(input, { ignoreEncryption: true, updateMetadata: false });
  const widgets = original.getForm().getCheckBox('Check Box1').acroField.getWidgets();
  const comparisons = [];
  for (let i = 0; i < widgets.length; i++) {
    const r = widgets[i].getRectangle(), s = 300 / 72;
    const box = { left: Math.floor((r.x - 1) * s), top: Math.floor((792 - r.y - r.height - 1) * s), width: Math.ceil((r.width + 2) * s), height: Math.ceil((r.height + 2) * s) };
    const enabledDelta = changedPixels(images.source.pixels, images.enabled.pixels, box);
    const disabledDelta = changedPixels(images.source.pixels, images.disabled.pixels, box);
    assert.equal(enabledDelta, 0, `${rule}/widget${i}: opt-in must reproduce exact source pixels`);
    assert.ok(disabledDelta > 0, `${rule}/widget${i}: disabled control must expose the original defect`);
    comparisons.push({ widget: i, box, enabledDelta, disabledDelta });
  }
  reports.push({ rule, sourceSha256: digest(input), sourceBytes: input.length, variants: Object.fromEntries(Object.entries(variants).map(([k, v]) => [k, { sha256: v.sha256, report: v.report }])), comparisons, rasters: Object.fromEntries(Object.entries(images).map(([k, { pixels, ...r }]) => [k, r])) });
}
const host = fs.readFileSync(path.join(ROOT, 'scripts/build-census-v1-nj_arrest_no_conviction-set.mjs'), 'utf8');
const enabledSites = [...host.matchAll(/preserveUnwrittenSelectionBackgrounds: true/g)];
assert.equal(enabledSites.length, 2, 'only the two assigned PA petitions may opt in');
for (const [i, rule] of ['490', '790'].entries()) {
  const start = host.indexOf(`  "pa_${rule}_nonconviction-set": {`);
  const end = host.indexOf('\n  "', start + 4);
  assert.ok(enabledSites[i].index > start && enabledSites[i].index < end, 'opt-in escaped assigned family block');
}
fs.writeFileSync(path.join(out, 'result.json'), JSON.stringify({ result: 'PASS', reports, enabledFamilySites: ['pa_490_nonconviction-set', 'pa_790_nonconviction-set'], routesOpened: 0 }, null, 2) + '\n');
console.log(`PASS: exact source selection pixels, default/disabled byte identity, written-control identity, active-content removal, MK/BG removal; ${out}`);
