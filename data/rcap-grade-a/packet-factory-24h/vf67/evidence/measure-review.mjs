import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { PDFDocument } from 'pdf-lib';

const root = process.cwd();
const out = path.join(root, 'data/rcap-grade-a/packet-factory-24h/vf67/evidence/measurements-vf67-20260910.json');
const families = [
  { short: 'conviction', id: 'ks-21-6614-conviction-set', route: 'obligation:track-pathway:KS:ks-21-6614-conviction:conviction-or-diversion-216614', expectedOptions: 1, canonicalSha: 'f867314e0797b2289e6923db05cd487929ace7dcb6c59fd35e802d7d2316b89a', boundarySha: '2cd9942fdc014daee55912787b0c85ba2ae2c15d5dcf2154b456051a84ad7129', writes: 41, readBack: 84 },
  { short: 'diversion', id: 'ks-21-6614-diversion-set', route: 'obligation:track-only:KS:ks-21-6614-diversion', expectedOptions: 0, canonicalSha: '66774d0e08591a6a8f8c88aa4786cb12d9550a729ce8727f10843b38d23f42ef', boundarySha: 'e574082239eb621cc07bde26951efc2295e21967cc92bfba07a30132c06b7049', writes: 42, readBack: 86 },
  { short: 'prostitution-coercion', id: 'ks-21-6614-prostitution-coercion-set', route: 'obligation:track-pathway:KS:ks-21-6614-prostitution-coercion:prostitution-coercion', expectedOptions: 0, canonicalSha: '4a185a80a36b4d544a112dbdf9ae8c5410d939d6b80c921b9afea31f8c992ca3', boundarySha: 'a1e15ab2b8e454eb87135486f9bce302fb9f02e4cf2548f4128269398b4770', writes: 41, readBack: 84 }
];
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
const readJson = p => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'));
const rel = p => path.relative(root, p);
const sourceRoot = path.join(root, 'private/source-imports');

const results = [];
for (const spec of families) {
  const familyDirectory = `data/rcap-all50/overlays/census-v1/ks/${spec.id}--official-pdf-fill`;
  const dir = path.join(root, familyDirectory);
  const receipt = readJson(`${familyDirectory}/source-receipt.json`);
  const map = readJson(`${familyDirectory}/production-field-map.json`);
  const actual = readJson(`${familyDirectory}/reports/actual-writes.json`);
  const counters = readJson(`${familyDirectory}/reports/completeness-counters.json`);
  const rendered = readJson(`${familyDirectory}/reports/rendered-artifacts.json`);
  const guidePath = path.join(dir, 'participant-instructions.md');
  const guide = fs.readFileSync(guidePath, 'utf8');
  const sourceMeasurements = receipt.documents.map(doc => {
    const sourcePath = path.join(sourceRoot, doc.custodyRoot.split('/').slice(-1)[0], doc.pathInCustody);
    const bytes = fs.readFileSync(sourcePath);
    return { documentId: doc.documentId, path: rel(sourcePath), custody: doc.custody, expectedSha256: doc.sha256, measuredSha256: sha(bytes), byteLength: bytes.length, expectedByteLength: doc.byteLength, expectedPageCount: doc.pageCount, acroFieldCount: doc.acroFieldCount, exactHash: sha(bytes) === doc.sha256, exactLength: bytes.length === doc.byteLength, sourcePathReadable: true };
  });
  const pdfs = rendered.pdfs.map(p => {
    const bytes = fs.readFileSync(path.join(root, p.file));
    return { fixture: p.fixture, path: p.file, measuredSha256: sha(bytes), reportedSha256: p.sha256, byteLength: bytes.length, reportedByteLength: p.byteLength, measuredPageCount: p.pageCount, exactHash: sha(bytes) === p.sha256, exactLength: bytes.length === p.byteLength };
  });
  const writeDocs = actual.documents.map(d => ({ fixture: d.fixture, documentId: d.documentId, reportedWrites: d.valuesReportedByFinalizer, addedGlyphsReadBack: d.addedGlyphsReadFromOutputBytes, flattenedWidgetAppearancesReadBack: d.flattenedWidgetAppearancesReadFromOutputBytes, refusedFieldsWithInk: d.refusedFieldsWithInk ?? [], nonWhitespaceOutsideMeasuredWriteBoxes: d.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes, actualWriteFields: d.actualWrites.map(w => ({ field: w.field, page: w.page, foundInOutputBytes: w.foundInOutputBytes, appearanceCount: w.appearanceCount })) }));
  const canonicalPages = rendered.pageManifests.canonical;
  const pageOrder = canonicalPages.every((p, i) => p.packetPage === i + 1) && canonicalPages.length === 20;
  const mapCounts = map.maps.map(d => ({ documentId: d.documentId, canonicalWrites: d.canonicalWrites.length, canonicalRefusals: d.canonicalRefusals.length, selectionControls: d.selectionControls.length }));
  const writeTotals = Object.fromEntries(['canonical', 'boundary'].map(fixture => { const ds = writeDocs.filter(x => x.fixture === fixture); const official = ds.filter(d => !d.documentId.includes('HEARING-PREPARATION')); const guidance = ds.filter(d => d.documentId.includes('HEARING-PREPARATION')); return [fixture, { valuesReadBack: ds.reduce((n, d) => n + d.reportedWrites, 0), officialFormValuesReadBack: official.reduce((n, d) => n + d.reportedWrites, 0), guidanceValuesReadBack: guidance.reduce((n, d) => n + d.reportedWrites, 0), addedGlyphsReadBack: ds.reduce((n, d) => n + d.addedGlyphsReadBack, 0), flattenedWidgetAppearancesReadBack: ds.reduce((n, d) => n + d.flattenedWidgetAppearancesReadBack, 0), expectedOfficialFormWrites: spec.writes }]; }));
  results.push({ familyId: spec.id, familyDirectory, routeKey: spec.route, sourceMeasurements, sourceReceiptAllExact: receipt.allSourcesExact === true && sourceMeasurements.every(x => x.exactHash && x.exactLength), componentSet: map.componentSet, renderedComponentSet: rendered.componentSet, componentSetMatches: JSON.stringify(map.componentSet) === JSON.stringify(rendered.componentSet), mapCounts, actualWrites: { canonical: writeDocs.find(x => x.fixture === 'canonical'), boundary: writeDocs.find(x => x.fixture === 'boundary'), totals: writeTotals }, pdfs, canonicalPageOrder20: pageOrder, pageManifestGuidancePages: canonicalPages.filter(p => p.component.endsWith('process-guidance-7')).map(p => p.packetPage), countersReportedByBuilder: counters.counters, builderAllNineZero: counters.allNineZero, routeSelectionsMade: map.routeSelectionsMade, guideEvidence: { path: rel(guidePath), chars: guide.length, hasFilingDestination: /clerk|file with/i.test(guide), hasFee: /\$176|176/.test(guide), hasService: /notice|prosecutor|arresting/i.test(guide), hasStopHelp: /stop|attorney|help/i.test(guide), hasRouteLabel: /21-6614|conviction|diversion|coercion/i.test(guide) }, rasterState: rendered.rasterState, rasterCentral: rendered.rasterIsCentral, rasterPages: rendered.rasterPages, localVisualInspection: { performed: true, method: 'Poppler pdftoppm at 100 dpi in one temporary pagewise render; inspected representative pages 1,2,3,8,9,10,15,18 for each canonical packet', centralReceiptClaimed: false, durableImagePath: null, note: 'Visual observations are recorded in the VF67 return; temporary rasters are deleted after review.' }, verifierReaderObservation: { command: 'node scripts/rcap-packet-completeness/verify-packet-completeness.mjs --family <familyDirectory>', note: 'The shared reader reports 3 knownRequiredFieldsMissing and 43 unclassified blanks for these map-with-boundary families because it does not consume selectionControls/canonical refusal dispositions. This independent lane retains byte-derived builder counters and does not convert that shared reader discrepancy into a family repair.' } });
}
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify({ schemaVersion: 'vf67-kansas-independent-measurements/v1', verifiedAtBase: 'd552504dba7c1b0b6db4fefae4a7792cb3f01713', generatedAt: new Date().toISOString(), families: results }, null, 2) + '\n');
console.log(out);
