import assert from 'node:assert/strict';
import fs from 'node:fs';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { reconcileRiRefusals } from './ri-nonconviction-report.mjs';
const dir = 'data/rcap-all50/overlays/census-v1/ri/ri-nonconviction-sealing-set--official-pdf-fill';
const report = JSON.parse(fs.readFileSync(`${dir}/reports/actual-writes.json`));
const map = JSON.parse(fs.readFileSync(`${dir}/production-field-map.json`));
const font = await (await PDFDocument.create()).embedFont(StandardFonts.Helvetica);
assert.deepEqual(reconcileRiRefusals(structuredClone(report), map, font), []);
const before = structuredClone(report);
for (const artifact of before.artifacts) for (const row of artifact.refused) {
  if (row.rawFinalizerDiagnostic) Object.assign(row, row.rawFinalizerDiagnostic);
}
assert.equal(reconcileRiRefusals(before, map, font).length, 7);
const falseOwnership = structuredClone(map);
falseOwnership.documents[0].fields.find(r => r.field === '1 Counts 1').refusalClass = 'court_prosecutor_clerk_or_agency_owned';
assert.throws(() => reconcileRiRefusals(structuredClone(report), falseOwnership, font));
const falseFit = structuredClone(report);
falseFit.artifacts.find(a => a.fixture === 'boundary').heldButNotPrinted.find(r => r.field === 'Case Number_2').valueHeld = '123';
assert.throws(() => reconcileRiRefusals(falseFit, map, font), /width refusal is not reproduced/);
const contradictoryWrite = structuredClone(report);
contradictoryWrite.artifacts[0].written.push({field: '1 Counts 1'});
assert.throws(() => reconcileRiRefusals(contradictoryWrite, map, font), /contradicts an actual write/);
console.log('RI report reconciliation: historical seven contradictions repaired; idempotent; false ownership, false width and conflicting ink rejected.');
