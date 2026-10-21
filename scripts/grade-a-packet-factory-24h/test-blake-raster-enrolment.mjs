import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { conditionalPacketDocuments } from './conditional-raster-documents.mjs';

const root = process.cwd();
const directory = path.join(root, 'data/rcap-all50/overlays/census-v1/wa/wa-blake-vacatur-and-lfo-refund-set--official-pdf-fill');
const fixtures = path.join(directory, 'fixtures');
const report = JSON.parse(fs.readFileSync(path.join(directory, 'reports/rendered-artifacts.json')));
const call = report => conditionalPacketDocuments({ report, fixtures, root });
const documents = call(report);
assert.deepEqual(documents.map(d => d.name), ['boundary.pdf', 'canonical.pdf', 'municipal-partial.pdf', 'superior-full.pdf']);
assert.equal(documents.reduce((n, d) => n + d.declaredPageCount, 0), 61);
const mutations = [
  r => r.packets.pop(),
  r => r.packets.push(structuredClone(r.packets[0])),
  r => r.packets[0].sha256 = '0'.repeat(64),
  r => r.packets[0].pageCount++,
  r => r.packets[0].file = '../other.pdf',
  r => r.packets[0].fixtureRole = 'unknown',
];
for (const mutate of mutations) {
  const candidate = structuredClone(report);
  mutate(candidate);
  assert.throws(() => call(candidate));
}
console.log(`Blake: four complete fixtures, 61 pages; ${mutations.length} invalid declarations refused.`);
