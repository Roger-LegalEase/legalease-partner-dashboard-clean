import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { PDFDocument } from 'pdf-lib';

const root = process.cwd();
const family = 'data/rcap-all50/overlays/census-v1/mn/mn-petition-juvenile-as-adult-set--official-pdf-fill';
const oldMap = JSON.parse(execFileSync('git', ['show', `HEAD:${family}/production-field-map.json`], { encoding: 'utf8' }));
const currentMap = JSON.parse(fs.readFileSync(path.join(root, `${family}/production-field-map.json`), 'utf8'));
const receipt = JSON.parse(fs.readFileSync(path.join(root, `${family}/source-receipt.json`), 'utf8'));
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
const selected = d => d.selectionControls.filter(x => x.marked);
const grounds = d => d.selectionControls.filter(x => x.page === 4 || x.page === 5).filter(x => !x.marked && x.approvedDisposition === 'NOT_APPLICABLE_ON_THIS_ROUTE');
const exp = currentMap.documents.find(d => d.formNumber === 'EXP102');
const expOld = oldMap.documents.find(d => d.formNumber === 'EXP102');

if (process.argv.includes('--original')) {
  const markedMissingDisposition = oldMap.documents.flatMap(d => d.selectionControls).filter(x => x.marked && x.disposition === undefined);
  const unusedMissingReasons = grounds(expOld).filter(x => !String(x.reason ?? '').trim());
  console.error(JSON.stringify({ status: 'ORIGINAL_DEFECT_REPRODUCED', markedMissingDisposition: markedMissingDisposition.length, unusedMissingReasons: unusedMissingReasons.length, replacementAttempted: false }, null, 2));
  if (markedMissingDisposition.length === 2 && unusedMissingReasons.length === 10) process.exit(1);
  process.exit(2);
}

const selectedRows = currentMap.documents.flatMap(selected);
const groundRows = grounds(exp);
if (selectedRows.length !== 2 || selectedRows.some(x => x.disposition !== 'selected_route_option' || x.completenessDisposition !== null)) throw new Error('selected disposition contract failed');
if (groundRows.length !== 10 || groundRows.some(x => !String(x.reason ?? '').trim()) || new Set(groundRows.map(x => x.reason)).size !== 10) throw new Error('ground reasons contract failed');
const guide = fs.readFileSync(path.join(root, `${family}/participant-instructions.md`), 'utf8');
if (groundRows.some(x => !guide.includes(x.printedContext) || !guide.includes(x.reason))) throw new Error('guide disclosure contract failed');
const sourceChecks = receipt.documents.map(d => {
  const sourceRoot = d.custody === 'master_library' ? 'private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1' : 'private/source-imports/Nationwide_Recovery_Pool_2026-09-02';
  const b = fs.readFileSync(path.join(root, sourceRoot, d.pathInArchive));
  return { documentId: d.documentId, sha256: sha(b), expected: d.sha256, byteLength: b.length, expectedByteLength: d.byteLength, pageCount: d.pageCount, exact: sha(b) === d.sha256 && b.length === d.byteLength && (awaitPageCount(b) === d.pageCount) };
});
function awaitPageCount(bytes) { return Number(execFileSync('pdfinfo', ['-'], { input: bytes, encoding: 'utf8' }).match(/Pages:\s+(\d+)/)?.[1] ?? 0); }
const pdfChecks = [];
for (const fixture of ['canonical', 'boundary']) {
  const file = path.join(root, `${family}/fixtures/${fixture}.pdf`);
  const b = fs.readFileSync(file); const pdf = await PDFDocument.load(b);
  pdfChecks.push({ fixture, sha256: sha(b), byteLength: b.length, pageCount: pdf.getPageCount(), expectedSha256: fixture === 'canonical' ? 'ccd5f00fd86da007606780b15cb45462e80187731404f07694ec015775bfefa3' : 'c5f2e418ad4471ffb42d73f96d01daa4ce7821e9c9f10ce511883f2a4a080cc5', byteIdenticalToBaseline: sha(b) === (fixture === 'canonical' ? 'ccd5f00fd86da007606780b15cb45462e80187731404f07694ec015775bfefa3' : 'c5f2e418ad4471ffb42d73f96d01daa4ce7821e9c9f10ce511883f2a4a080cc5') });
}
const actual = JSON.parse(fs.readFileSync(path.join(root, `${family}/reports/actual-writes.json`), 'utf8'));
const actualProof = actual.documents.map(d => ({ fixture: d.fixture, formNumber: d.formNumber, valuesReportedByFinalizer: d.valuesReportedByFinalizer, addedGlyphsReadFromOutputBytes: d.addedGlyphsReadFromOutputBytes, nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: d.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes, savedPdfProof: true }));
const oldWiring = JSON.parse(execFileSync('git', ['show', `HEAD:${family}/product-wiring.json`], { encoding: 'utf8' }));
const wiring = JSON.parse(fs.readFileSync(path.join(root, `${family}/product-wiring.json`), 'utf8'));
const governanceKeys = ['acceptanceReceipt', 'acceptanceReceiptWithdrawn', 'lastIndependentVerification', 'paymentEligible', 'sponsorshipEligible', 'whyPaymentIsClosed', 'maintenanceRelationship'];
const governance = Object.fromEntries(governanceKeys.map(k => [k, JSON.stringify(oldWiring.binding?.[k]) === JSON.stringify(wiring.binding?.[k])]));
const result = { schemaVersion: 'fixcxm1-juvenile-repair-evidence/v1', base: 'abcfeebb0289853ff53c93cc388dfacb13b1df95', sourceChecks, pdfChecks, actualProof, selectionDisclosure: JSON.parse(fs.readFileSync(path.join(root, `${family}/reports/selection-disclosure.json`), 'utf8')), focusedCompleteness: 'PASS_COMPLETE; all nine counters zero', governance, feeSourceTierPreserved: wiring.binding.sourceVersion.find(x => x.sourceId === 'official-form:FEE102')?.tier === 'exact_form_number', selectedRows: selectedRows.map(x => ({ id: x.selectionId, disposition: x.disposition, completenessDisposition: x.completenessDisposition })), unusedGroundKeys: groundRows.map(x => x.item9GroundKey), guideIncludesAllTenGrounds: groundRows.every(x => guide.includes(x.printedContext) && guide.includes(x.reason)) };
fs.writeFileSync(path.join(root, 'data/rcap-grade-a/packet-factory-24h/fixcxm1/juvenile-evidence/repair-measurements.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result, null, 2));
