// CO F1 / MD A46: index current held publications without rewriting prior custody.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { PDFDocument, PDFName } from 'pdf-lib';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const INDEX = 'data/rcap-all50/local-source-corpus-index.json';
export const SOURCES = [
  ['CO', 'JDF-612', '2025-07-01', 'JDF612.pdf', 737628, '4a45070b9332e73ddbb3ec9cb8d326b707589856d3104b8ab7d9ab991d9d496b', 5, 64],
  ['CO', 'JDF-615', '2025-07-01', 'JDF615.pdf', 1054204, '184a33faf5d800a189f4c0fbd180912a02888d60e1100ca586064a8c753a0a26', 3, 21],
  ['MD', 'CC-DC-CR-072A', '10/01/2026', 'ccdccr072A.pdf', 218004, '04cb4661a198f7d4036a3cdf359d65db0f28b419fba7b18940322d67185b5e90', 1, 48],
  ['MD', 'CC-DC-CR-072D', '10/2025', 'ccdccr072d.pdf', 167894, '87465cb08d93f3469dc4fe7288360aaa650f21e2dee06ebd4f7f05a4998d2703', 1, 39],
].map(([state, formNumber, revision, fileName, byteLength, sha256, pageCount, acroFieldCount]) => ({
  state, formNumber, revision, fileName, byteLength, sha256, pageCount, acroFieldCount,
  custody: `${state.toLowerCase()}_official_20261021`,
  path: `private/source-imports/${state.toLowerCase()}-official-20261021/${fileName}`,
}));
export const hash = bytes => createHash('sha256').update(bytes).digest('hex');
export function verifySource(bytes, source) {
  assert.equal(bytes.length, source.byteLength, `${source.formNumber}: source length`);
  assert.equal(hash(bytes), source.sha256, `${source.formNumber}: source digest`);
}

export async function importSources(root = ROOT) {
  const indexPath = path.join(root, INDEX), before = fs.readFileSync(indexPath, 'utf8');
  const index = JSON.parse(before);
  for (const source of SOURCES) {
    // Storage owns the private copies. This importer only reads and verifies them.
    const bytes = fs.readFileSync(path.join(root, source.path));
    verifySource(bytes, source);
    const document = await PDFDocument.load(bytes, { updateMetadata: false });
    assert.equal(document.getPageCount(), source.pageCount);
    assert.equal(document.getForm().getFields().length, source.acroFieldCount);
    assert(!document.getForm().acroForm.dict.has(PDFName.of('XFA')));
    const entry = { ...source, custodyType: 'NEWLY_ACQUIRED_OFFICIAL_PUBLICATION',
      assetClass: 'FORM', language: 'EN', assetFormat: 'pdf', acroFormPresent: true,
      xfaPresent: false, structuralClassObserved: 'acroform', loadError: null };
    const existing = index.entries.filter(row => row.path === source.path || row.sha256 === source.sha256);
    if (existing.length) {
      assert.equal(existing.length, 1, `${source.formNumber}: unique current source`);
      assert.deepEqual(existing[0], entry, `${source.formNumber}: existing entry drift`);
      continue;
    }
    index.entries.push(entry);
    index.totals.binariesIndexed++;
    index.totals.pdfsIndexed++;
    index.totals.byAssetFormat.pdf++;
    index.totals.byStructure.acroform++;
    index.totals.byCustody[source.custody] = (index.totals.byCustody[source.custody] ?? 0) + 1;
    index.byState[source.state]++;
  }
  for (const state of ['CO', 'MD']) {
    const sources = SOURCES.filter(source => source.state === state), id = sources[0].custody;
    const custody = { id, root: path.dirname(sources[0].path), pathsRelativeTo: 'repositoryRoot',
      describes: `Current ${sources.map(source => source.formNumber).join(' / ')} publications; Storage retrieval provenance in SOURCES.tsv. Prior sources retained; no legal, visual, delivery or payment approval.`,
      custodyType: 'NEWLY_ACQUIRED_OFFICIAL_PUBLICATION', completeOperationalCorpus: false,
      binariesIndexed: 2, pdfsIndexed: 2 };
    const existing = index.custodies.filter(row => row.id === id);
    if (existing.length) { assert.equal(existing.length, 1); assert.deepEqual(existing[0], custody); }
    else index.custodies.push(custody);
    assert.equal(index.entries.filter(row => row.custody === id).length, 2);
    assert.equal(index.totals.byCustody[id], 2);
  }
  const after = JSON.stringify(index, null, 2) + '\n';
  assert.equal(fs.readFileSync(indexPath, 'utf8'), before, 'corpus index changed during intake');
  if (before !== after) {
    const temporary = `${indexPath}.co-md-${process.pid}.tmp`;
    fs.writeFileSync(temporary, after, { flag: 'wx' });
    fs.renameSync(temporary, indexPath);
  }
  return { changed: before !== after, sources: SOURCES, indexSha256: hash(after), byteLength: Buffer.byteLength(after) };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  assert.equal(process.argv.length, 2, 'usage: node scripts/rcap-corpus/import-co-md-current-sources.mjs');
  console.log(JSON.stringify(await importSources(), null, 2));
}
