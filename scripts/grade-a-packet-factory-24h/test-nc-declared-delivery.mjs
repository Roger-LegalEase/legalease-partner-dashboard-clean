import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { bindDeclaredNcDelivery, selectDeclaredNcFixture, NC_FAMILY } from './nc-declared-delivery.mjs';
import { NC_BRANCH_FIXTURES } from '../rcap-packet-recovery/nc-146-indigency.mjs';
import { acceptedRasterFor, candidateRowsByFamily } from './acceptance-identity.mjs';
const read = p => JSON.parse(fs.readFileSync(p, 'utf8'));
const hashFile = p => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const family = read('data/rcap-grade-a/packet-factory-24h/MASTER_QUEUE.json').families.find(f => f.familyId === NC_FAMILY);
const evaluation = acceptedRasterFor(process.cwd(), candidateRowsByFamily(read('data/rcap-grade-a/packet-factory-24h/RASTER_QUEUE.json')).get(NC_FAMILY), {requireReceiptDeclaredCoverage: true});
assert.equal(evaluation.proven, true, JSON.stringify(evaluation.reasons));
assert.equal(evaluation.documents.length, 10);
const original = {record: read(`${family.directory}/product-wiring.json`), family, report: read(`${family.directory}/reports/rendered-artifacts.json`), raster: evaluation.row};
const before = JSON.stringify(original);
const apply = x => bindDeclaredNcDelivery(x.record, x.family, {...x, hashFile: x.hashFile ?? hashFile});
const out = apply(structuredClone(original));
assert.equal(out.binding.acceptanceReceipt.documentsMeasured, 10);
assert.equal(out.binding.acceptanceReceipt.pagesMeasured, 60);
assert.equal(out.proposedRepresentation.components.length, 4);
assert.equal(out.proposedRepresentation.diagnosticArtifacts.length, 2);
assert.ok(out.proposedRepresentation.components.every(d => d.requirement === 'conditional'));
assert.ok(out.proposedRepresentation.diagnosticArtifacts.every(d => !d.deliverable));
assert.equal(out.binding.filingPermitted, false);
let positive = 0, refused = 0;
for (const fixture of ['canonical', 'boundary']) for (const [branch, selection] of Object.entries(NC_BRANCH_FIXTURES)) {
  const d = selectDeclaredNcFixture(out, selection, fixture);
  assert.equal(d.branch, branch); assert.equal(d.sha256, hashFile(d.file));
  assert.equal(d.legalReviewRequired, branch !== 'no_fee');
  assert.equal(d.grantsDeliveryAuthority, false); positive++;
}
const twice = structuredClone(original); twice.record = out; assert.deepEqual(apply(twice), out); positive++;
const noRaster = structuredClone(original); noRaster.raster = null; assert.equal(apply(noRaster).binding.acceptanceReceipt, null); positive++;
const unrelated = structuredClone(original); unrelated.family.familyId = 'unrelated'; assert.equal(apply(unrelated), unrelated.record); positive++;
const bad = [
  ['wrong family', x => x.record.family = 'other'],
  ['wrong route', x => x.family.routeKeys.push('other')],
  ['installed binding', x => x.record.status = 'INSTALLED_RUNTIME'],
  ['authority granted', x => x.record.authorityCreated = 'yes'],
  ['generation enabled', x => x.record.currentState.generationAllowed = true],
  ['checkout enabled', x => x.record.binding.paymentEligible = true],
  ['sponsorship enabled', x => x.record.binding.sponsorshipEligible = true],
  ['wrong report family', x => x.report.familyId = 'other'],
  ['wrong component inventory', x => x.report.componentSet.pop()],
  ['missing branch', x => x.report.pdfs.splice(1, 1)],
  ['duplicate fixture', x => x.report.pdfs[1].fixture = x.report.pdfs[0].fixture],
  ['wrong fixture path', x => x.report.pdfs[1].file = '../other.pdf'],
  ['stale branch hash', x => x.report.pdfs[1].sha256 = '0'.repeat(64)],
  ['changed actual bytes', x => x.hashFile = () => '0'.repeat(64)],
  ['wrong component sequence', x => x.report.pdfs[1].components.reverse()],
  ['missing manifest page', x => x.report.pdfs[1].pageManifest.pop()],
  ['wrong page count', x => x.report.pdfs[1].pageCount = 8],
  ['unknown fee status', x => x.report.pdfs[1].selection.feeStatus = 'unknown'],
  ['synthetic not marked', x => x.report.pdfs[1].syntheticFixture = false],
  ['partial raster', x => x.raster.rasterReceipt.coversTheWholeFamily = false],
  ['old two-PDF raster', x => x.raster.rasterReceipt.documentsMeasured = 2],
  ['old sixteen-page raster', x => x.raster.rasterReceipt.pagesMeasured = 16],
  ['omitted raster branch', x => x.raster.rasterReceipt.documentsCovered.pop()],
  ['stale raster branch', x => x.raster.documents[1].sha256 = '0'.repeat(64)],
  ['wrong raster pages', x => x.raster.documents[1].pageCount++],
  ['raster failure', x => x.raster.rasterReceipt.verdict = 'FAIL'],
  ['wrong raster family', x => x.raster.familyId = 'other'],
  ['raster uncovered', x => x.raster.rasterReceipt.documentsNotCovered.push('branch.pdf')],
];
for (const [label, mutate] of bad) {const x = structuredClone(original); mutate(x); assert.throws(() => apply(x), label); refused++;}
for (const selection of [null, {}, {feeStatus:'unknown',requestIndigency:false,supplementalRequested:false}, {feeStatus:'no_fee',requestIndigency:true,supplementalRequested:false}, {feeStatus:'fee_due',requestIndigency:false,supplementalRequested:true}, {feeStatus:'fee_due',requestIndigency:true,supplementalRequested:true}]) {
  assert.throws(() => selectDeclaredNcFixture(out, selection, 'canonical')); refused++;
}
assert.throws(() => selectDeclaredNcFixture(out, NC_BRANCH_FIXTURES.no_fee, 'diagnostic')); refused++;
assert.equal(JSON.stringify(original), before);
console.log(JSON.stringify({familyId: NC_FAMILY, positiveCases: positive, rejectionControls: refused, currentWholePdfsRehashed: evaluation.documents.length, pagesBoundToAdmittedReceipt:60, inputRecordsUnchanged:true, packetRebuilds:0, approvalIssued:false},null,2));
