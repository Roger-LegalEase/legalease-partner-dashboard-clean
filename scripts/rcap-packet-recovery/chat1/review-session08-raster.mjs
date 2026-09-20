#!/usr/bin/env node
// Independent inventory-edge controls; scratch belongs only to this review.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { conditionalPacketDocuments } from '../../grade-a-packet-factory-24h/conditional-raster-documents.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const outDir = path.join(root, 'data/rcap-grade-a/chat-parallel-2026-09-07/chat1-integration/session08');
const out = path.join(outDir, 'independent-ky-native-raster.json');
const sourcePath = 'scripts/grade-a-packet-factory-24h/conditional-raster-documents.mjs';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const bytes = fs.readFileSync(path.join(root, 'data/rcap-all50/overlays/census-v1/ky/ky-nonconviction-expungement-set--official-pdf-fill/fixtures/canonical.pdf'));
const scratch = fs.mkdtempSync(path.join(outDir, 'independent-ky-raster-scratch-'));
const fixtures = path.join(scratch, 'fixtures');
const selectable = path.join(fixtures, 'selectable');
fs.mkdirSync(selectable, { recursive: true });
const file = path.join(selectable, 'sample.pdf');
fs.writeFileSync(file, bytes);
const entry = { fixture: 'selectable/sample', file: path.relative(root, file), sha256: hash(bytes), byteLength: bytes.length, pageCount: 6 };
const report = { pdfs: [entry] };
const invoke = r => conditionalPacketDocuments({ report: r, fixtures, root });
const checks = [];
function check(name, fn) {
  try { fn(); checks.push({ name, passed: true }); }
  catch (e) { checks.push({ name, passed: false, error: e.message }); }
}
try {
  check('An independently elected native fixture needs no invented paired boundary', () => assert.equal(invoke(report).length, 1));
  check('An unlisted lowercase whole PDF is refused', () => assert.throws(() => invoke({ pdfs: [] })));
  const nested = path.join(selectable, 'nested'); fs.mkdirSync(nested); fs.writeFileSync(path.join(nested, 'extra.pdf'), bytes);
  check('An unlisted nested whole PDF is refused', () => assert.throws(() => invoke(report)));
  fs.unlinkSync(path.join(nested, 'extra.pdf')); fs.rmdirSync(nested);
  fs.renameSync(file, path.join(selectable, 'sample.PDF'));
  check('An unlisted uppercase-extension whole PDF is refused', () => assert.throws(() => invoke({ pdfs: [] })));
  fs.renameSync(path.join(selectable, 'sample.PDF'), file);
  fs.renameSync(file, path.join(scratch, 'held.pdf')); fs.symlinkSync(path.join(scratch, 'held.pdf'), file);
  check('A declared symlink cannot borrow matching PDF bytes', () => assert.throws(() => invoke(report)));
  fs.unlinkSync(file); fs.renameSync(path.join(scratch, 'held.pdf'), file);
  check('Traversal syntax refuses even when it resolves to the same fixture', () => {
    const altered = structuredClone(report); altered.pdfs[0].file = path.relative(root, selectable) + '/../selectable/sample.pdf';
    assert.throws(() => invoke(altered));
  });
  check('The restored independent fixture remains admissible after refusal controls', () => assert.equal(invoke(report).length, 1));
} finally {
  assert(scratch.startsWith(outDir + path.sep + 'independent-ky-raster-scratch-'));
  fs.rmSync(scratch, { recursive: true });
}
const result = { schemaVersion: 'rcap-independent-native-raster-engineering/v1', recordedAt: new Date().toISOString(), reviewer: 'release_scope independent engineering sub-agent',
  verdict: checks.every(c => c.passed) ? 'PASS_BOUNDED_ENGINEERING_DELTA' : 'FAIL', checks, passed: checks.filter(c => c.passed).length, failed: checks.filter(c => !c.passed).length,
  sourcePath, sourceSha256: hash(fs.readFileSync(path.join(root, sourcePath))), packetRebuilds: 0, freshRasterReview: false, retainedFilesMutated: false,
  scope: 'Selectable-output inventory and path/refusal behavior only. Actual page-count parsing remains owned by documentSet; unchanged PR238 page evidence is reused.', productionTouched: false };
fs.writeFileSync(out, JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ verdict: result.verdict, passed: result.passed, failed: result.failed, failures: checks.filter(c => !c.passed), output: path.relative(root, out) }));
if (result.failed) process.exitCode = 1;
