import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { retainCa17RasterIdentity } from './ca17-raster-identity.mjs';
const base = 'data/rcap-grade-a/packet-factory-24h/';
const read = p => JSON.parse(fs.readFileSync(base + p));
const manifest = read('warp-20260912/ca17-offense-by-offense/raster-manifest.json').rows[0];
const receipt = read('raster-runs/34690713553/ca-17b-reduction-set.verdict.json');
const discovered = structuredClone(manifest);
discovered.documents = manifest.documents.map(d => ({ ...d,
  role: d.role.startsWith('canonical') ? 'canonical' : 'boundary', name: d.path.split('/fixtures/')[1] }));
discovered.coverage = { complete: true, rastered: discovered.documents.map(d => d.name) };
test('same six PDFs retain original identity and coverage names', () => {
  const row = retainCa17RasterIdentity(discovered, manifest, receipt);
  assert.equal(row.documentsDigest, receipt.documentsDigest);
  assert.deepEqual(row.documents.map(d => d.name), receipt.documentsRendered.map(d => d.document));
  assert.deepEqual(row.coverage.rastered, row.documents.map(d => d.name));
});
test('changed bytes, page count, fixture, missing or extra member invalidate reuse', () => {
  for (const mutate of [r => r.documents[0].sha256 = '0'.repeat(64),
    r => r.documents[0].pageCount++, r => r.documents[0].role = 'boundary',
    r => r.documents.pop(), r => r.documents.push({ ...r.documents[0], path: 'additional.pdf' })]) {
    const row = structuredClone(discovered); mutate(row);
    assert.equal(retainCa17RasterIdentity(row, manifest, receipt), row);
  }
});
test('unrelated family or failed original receipt cannot borrow acceptance', () => {
  const other = { ...discovered, familyId: 'another-family' };
  assert.equal(retainCa17RasterIdentity(other, manifest, receipt), other);
  assert.equal(retainCa17RasterIdentity(discovered, manifest, { ...receipt, verdict: 'RASTER_FAIL' }), discovered);
});
test('a corrupted original digest fails closed', () => {
  assert.throws(() => retainCa17RasterIdentity(discovered, manifest, { ...receipt, documentsDigest: '0'.repeat(64) }));
});
test('PA retains its exact original six-document order and refuses changed membership or run', () => {
  const original = read('warp-20260912/pa6308-current/raster-manifest.json').rows[0];
  const verdict = read('raster-runs/34692245137/pa_6308_underage-set.verdict.json');
  const current = structuredClone(original);
  current.documents = original.documents.map(d => ({ ...d,
    role: d.role.startsWith('canonical') ? 'canonical' : 'boundary' })).reverse();
  const retained = retainCa17RasterIdentity(current, original, verdict);
  assert.equal(retained.documentsDigest, verdict.documentsDigest);
  assert.deepEqual(retained.documents.map(d => d.path), original.documents.map(d => d.path));
  assert.equal(retainCa17RasterIdentity(current, original, { ...verdict, workflowRunId: '34691384078' }), current);
  for (const mutate of [r => r.documents[0].sha256 = '0'.repeat(64),
    r => r.documents[0].pageCount++, r => r.documents.pop()]) {
    const changed = structuredClone(current); mutate(changed);
    assert.equal(retainCa17RasterIdentity(changed, original, verdict), changed);
  }
});

test('OR preserves all eight court and separate-agency outputs only at exact current identities', () => {
  const original = read('fix112/or-current-raster-manifest-20260912.json').rows[0];
  const verdict = read('raster-runs/34707426827/rcap-or-official-pdf-fill.verdict.json');
  assert.equal(original.documents.length, 8);
  const current = structuredClone(original);
  current.documents.reverse();
  const retained = retainCa17RasterIdentity(current, original, verdict);
  assert.equal(retained.documentsDigest, verdict.documentsDigest);
  assert.deepEqual(retained.documents.map(d => d.path), original.documents.map(d => d.path));
  assert.equal(retainCa17RasterIdentity(current, original, { ...verdict, workflowRunId: '34407406641' }), current);
  for (const mutate of [r => r.documents.splice(1, 1),
    r => r.documents[0].sha256 = '0'.repeat(64), r => r.documents[0].pageCount++,
    r => r.documents.push({ ...r.documents[0], path: 'extra-agency.pdf' })]) {
    const changed = structuredClone(current); mutate(changed);
    assert.equal(retainCa17RasterIdentity(changed, original, verdict), changed);
  }
});
