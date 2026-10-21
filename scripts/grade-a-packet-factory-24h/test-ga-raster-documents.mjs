import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PDFDocument } from 'pdf-lib';
import { conditionalPacketDocuments } from './conditional-raster-documents.mjs';
import { OUT } from '../rcap-packet-recovery/chat5/ga-pre2013.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const fixtures = path.join(root, OUT, 'fixtures');
const original = JSON.parse(fs.readFileSync(path.join(root, OUT, 'reports/rendered-artifacts.json')));
const call = report => conditionalPacketDocuments({ report, fixtures, root });
const selected = call(original);
assert.equal(selected.length, 15);
assert.equal(selected.filter(d => d.selectionKind === 'diagnostic').length, 3);
assert.equal(selected.filter(d => d.selectionKind === 'conditional_packet_example').length, 12);
assert(selected.every(d => d.filingReady === false && d.requiredBeforeFiling.includes('participant.ssn')));
assert(selected.find(d => d.name === 'missing-participant-facts.pdf').requiredBeforeFiling.includes('case.arrestingAgency'));
let pages = 0;
for (const d of selected) {
  const pdf = await PDFDocument.load(fs.readFileSync(path.join(fixtures, d.name)));
  assert.equal(pdf.getPageCount(), d.declaredPageCount);
  pages += pdf.getPageCount();
}
assert.equal(pages, 108);
const mutations = [
  r => r.artifacts.pop(),
  r => { r.artifacts = r.artifacts.slice(0, 2); r.packets = structuredClone(r.artifacts); },
  r => { r.artifacts.push(r.artifacts[0]); r.packets = structuredClone(r.artifacts); },
  r => { r.artifacts[2].path = 'fixtures/canonical.pdf'; r.packets = structuredClone(r.artifacts); },
  r => { r.artifacts[2].sha256 = '0'.repeat(64); r.packets = structuredClone(r.artifacts); },
  r => { r.artifacts[2].byteLength++; r.packets = structuredClone(r.artifacts); },
  r => { r.artifacts[2].fixture = '../escape'; r.packets = structuredClone(r.artifacts); },
  r => { r.artifacts[2].pageCount = null; r.packets = structuredClone(r.artifacts); },
];
for (const mutate of mutations) { const changed = structuredClone(original); mutate(changed); assert.throws(() => call(changed)); }
console.log(JSON.stringify({ documents: selected.length, pages, diagnosticDocuments: 3,
  conditionalExamples: 12, filingReady: false, negativeControlsCaught: mutations.length }));
