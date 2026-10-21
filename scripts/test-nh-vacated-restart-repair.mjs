import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { PDFDocument } from 'pdf-lib';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { flattenedWidgets, drawnAt } from './rcap-official-forms/pdf-flattened-widgets.mjs';

const dir = 'data/rcap-all50/overlays/census-v1/nh/nh-petition-vacated-set--official-pdf-fill';
const read = (p) => JSON.parse(fs.readFileSync(`${dir}/${p}`, 'utf8'));
const proof = read('reports/actual-writes.json');
const rendered = read('reports/rendered-artifacts.json');
const instructions = fs.readFileSync(`${dir}/participant-instructions.md`, 'utf8');
const hash = (b) => createHash('sha256').update(b).digest('hex');
assert.equal(proof.documents.length, 8);
assert.deepEqual(proof.blockingFindings, []);
assert.match(instructions, /NHJB-2886/);
assert.doesNotMatch(instructions, /NHJB-2311|sig\.\d|\.json|SHA-256|packet-set manifest|obligation:/);
assert.match(instructions, /any mailed request, complete Sections I and II and have Section II notarized/);
assert.match(instructions, /Section I alone is sufficient only when requesting your own record in person/);
assert.match(instructions, /statement is confidential/);
assert.match(instructions, /Charge ID is optional if unknown/);
assert.match(instructions, /Maiden name or alias is optional/);

let appearances = 0;
for (const artifact of rendered.artifacts) {
  const bytes = fs.readFileSync(artifact.file);
  assert.equal(hash(bytes), artifact.sha256);
  assert.equal(bytes.length, artifact.byteLength);
  const pdf = await PDFDocument.load(bytes);
  assert.equal(pdf.getPageCount(), artifact.pageCount);
  const widgets = await flattenedWidgets(artifact.file);
  for (const doc of proof.documents.filter((d) => d.fixture === artifact.fixture)) {
    for (const write of doc.actualWrites) {
      const packetPage = artifact.pageManifest.find((p) => p.formNumber === doc.formNumber && p.sourcePage === write.page)?.packetPage;
      assert.ok(packetPage);
      const raw = drawnAt(widgets, { page: packetPage, rect: write.rect }).map((w) => w.text).join('');
      const actual = new TextDecoder('windows-1252').decode(Buffer.from(raw, 'latin1')).trim();
      assert.equal(actual, write.expected, `${artifact.fixture}/${doc.formNumber}/${write.field}`);
      assert.ok(!['sig.8', 'sig.9', 'sig.2', 'sig.3', 'cbcert.1'].includes(write.field));
      appearances++;
    }
  }
  // A separate PDF engine must also decode the boundary apostrophe and DOB.
  const task = getDocument({ data: new Uint8Array(bytes), useSystemFonts: true });
  const decoded = await task.promise;
  const first = await (await decoded.getPage(1)).getTextContent();
  const text = first.items.map((i) => i.str).join(' ');
  assert.ok(text.includes(artifact.fixture === 'canonical' ? 'Jordan Avery Reyes' : 'Maria-Alejandra O’Shaughnessy-Whitfield'));
  assert.ok(text.includes(artifact.fixture === 'canonical' ? '04/17/1991' : '12/31/1968'));
  await task.destroy();
}
assert.equal(appearances, 76);
const counters = read('reports/completeness-counters.json');
assert.equal(counters.allNonvisualZero, true);
assert.equal(counters.counters.visualDefects, null);
console.log(`NH restart repair: PASS; ${appearances} known appearances decoded from saved packets; independent PDF text decoding passed. Visual acceptance pending.`);
