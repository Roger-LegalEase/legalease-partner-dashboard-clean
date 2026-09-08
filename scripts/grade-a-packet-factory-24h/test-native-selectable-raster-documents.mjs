import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PDFDocument } from 'pdf-lib';
import { conditionalPacketDocuments } from './conditional-raster-documents.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const cases = [
  ['ky/ky-nonconviction-expungement-set', 13, 90],
  ['md/md-10105-favorable-set', 15, 60],
];
const measurements = [];
for (const [family, count, pages] of cases) {
  const directory = `data/rcap-all50/overlays/census-v1/${family}--official-pdf-fill`;
  const fixtures = path.join(root, directory, 'fixtures');
  const original = JSON.parse(fs.readFileSync(path.join(root, directory, 'reports/rendered-artifacts.json')));
  const call = report => conditionalPacketDocuments({ report, fixtures, root });
  const selected = call(original);
  assert.equal(selected.length, count - 2);
  const declaredNames = original.pdfs.map(d => `${d.fixture}.pdf`).sort();
  assert.deepEqual(['canonical.pdf', 'boundary.pdf', ...selected.map(d => d.name)].sort(), declaredNames);
  let actualPages = 0;
  for (const d of original.pdfs) {
    const pdf = await PDFDocument.load(fs.readFileSync(path.join(root, d.file)), { updateMetadata: false });
    assert.equal(pdf.getPageCount(), d.pageCount);
    actualPages += pdf.getPageCount();
  }
  assert.equal(actualPages, pages);
  const first = report => report.pdfs.find(d => d.fixture.startsWith('selectable/'));
  const mutations = [
    d => first(d).sha256 = '0'.repeat(64),
    d => first(d).byteLength++,
    d => first(d).pageCount = null,
    d => first(d).pageCount = -1,
    d => first(d).fixture = 'selectable/../escape',
    d => first(d).fixture = 'unknown',
    d => first(d).file = '/tmp/foreign.pdf',
    d => first(d).file = `${directory}/fixtures/canonical.pdf`,
    d => first(d).file = `${directory}/fixtures/selectable/missing.pdf`,
    d => first(d).baseFixture = 'unknown',
    d => d.pdfs.push(structuredClone(first(d))),
    d => d.pdfs = d.pdfs.filter(x => x !== first(d)),
    d => d.pdfs = d.pdfs.filter(x => !x.fixture.startsWith('selectable/')),
  ];
  for (const mutate of mutations) {
    const altered = structuredClone(original);
    mutate(altered);
    assert.throws(() => call(altered));
  }
  assert.deepEqual(call(original), selected);
  measurements.push({ family, completePdfs: count, completePages: actualPages,
    selectablePdfs: selected.length, refusalControls: mutations.length });
}
console.log(JSON.stringify({ status: 'PASS', measurements, packetRebuilds: 0,
  rasterExecuted: false, terminalPromotions: 0 }));
