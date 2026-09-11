import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { BLANK_DISPOSITIONS } from '../rcap-packet-completeness/completeness-contract.mjs';

const ROOT = path.resolve(new URL('../..', import.meta.url).pathname);
const AZ_ROOT = path.join(ROOT, 'data/rcap-all50/overlays/census-v1/az');
const FAMILIES = {
  arrest: 'az-record-sealing-arrest-no-charges-set--official-pdf-fill',
  dismissal: 'az-record-sealing-dismissal-not-guilty-set--official-pdf-fill',
};
const EXPECTED_PDF_HASHES = {
  [`${FAMILIES.arrest}/fixtures/boundary/order.pdf`]: '9b030ea1d81736c83e0a7684e5fa8998ac556c3fe435bd283d94d29e3a9fcb88',
  [`${FAMILIES.arrest}/fixtures/boundary/packet-assembly.pdf`]: '0a199685a887524883eee342819f3b339d5c5b64d283ac202c509d408b13ef6f',
  [`${FAMILIES.arrest}/fixtures/boundary/petition.pdf`]: '86a413597d060d97bb1cb6241fd6d05f012e7ef3b4ed26d83330cc5678573069',
  [`${FAMILIES.arrest}/fixtures/canonical/order.pdf`]: '152fe92b232a9a96a5be8aceaffd79d6f6f281887e91fdb27fd43227ad8264a0',
  [`${FAMILIES.arrest}/fixtures/canonical/packet-assembly.pdf`]: 'e9a10f6b4748a104579837d65700073c2d0b81f54ffde43f1e3de44191024bc8',
  [`${FAMILIES.arrest}/fixtures/canonical/petition.pdf`]: '0c0d3e2a3fc21194a90c487157cceaf7d96696a88db191e756728180bf5f9f2e',
  [`${FAMILIES.dismissal}/fixtures/boundary/order.pdf`]: '7b5bf85609f6bd9d86d40194eb92eb47c267f38c723021e5a5b269be27b38a71',
  [`${FAMILIES.dismissal}/fixtures/boundary/packet-assembly.pdf`]: 'bbb9aed7a73833af3552862e7e410767ecd468a5b6bf2235237c3610bcd2675d',
  [`${FAMILIES.dismissal}/fixtures/boundary/petition.pdf`]: 'fb768246be8a28e298b8d8eaf24c0e823439963165a00e0672e55f0c0d8f63b7',
  [`${FAMILIES.dismissal}/fixtures/canonical/order.pdf`]: 'e81d36c2553f4cc41cf61d43c425e73b0d0afe96bfaa3128ad6f2431e2258812',
  [`${FAMILIES.dismissal}/fixtures/canonical/packet-assembly.pdf`]: 'bdfbd09935c302041aeb746dc1fc6bae6bda34760fe162eda0c941ebd904a66c',
  [`${FAMILIES.dismissal}/fixtures/canonical/petition.pdf`]: '4d0bd271ed4f65b47cad3fdba11c784b7782ee166dc194b98fad081833987ab7',
};
const digest = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const readJson = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const mapEntries = map => map.maps.flatMap(document => document.canonicalRefusals.map(field => ({ ...field, documentRole: document.documentRole })));
const key = (role, field) => `${role}.${field}`;

for (const [relative, expected] of Object.entries(EXPECTED_PDF_HASHES)) {
  assert.equal(digest(path.join(AZ_ROOT, relative)), expected, `pre-build PDF drift: ${relative}`);
}

for (const script of [
  'scripts/build-census-v1-az_record_sealing_arrest_no_charges-set.mjs',
  'scripts/build-census-v1-az_record_sealing_dismissal_not_guilty-set.mjs',
]) execFileSync(process.execPath, [script], { cwd: ROOT, stdio: 'pipe' });

for (const [relative, expected] of Object.entries(EXPECTED_PDF_HASHES)) {
  assert.equal(digest(path.join(AZ_ROOT, relative)), expected, `real-entrypoint PDF drift: ${relative}`);
}

const arrestMap = readJson(path.join(AZ_ROOT, FAMILIES.arrest, 'production-field-map.json'));
const dismissalMap = readJson(path.join(AZ_ROOT, FAMILIES.dismissal, 'production-field-map.json'));
const arrestEntries = new Map(mapEntries(arrestMap).map(row => [key(row.documentRole, row.fieldName), row]));
const dismissalEntries = new Map(mapEntries(dismissalMap).map(row => [key(row.documentRole, row.fieldName), row]));
const arrestDefect = readJson(path.join(ROOT, 'data/rcap-grade-a/packet-factory-24h/vf68/az-arrest-final-evidence-20260911/required-before-filing-defect.json'));
const dismissalDefect = readJson(path.join(ROOT, 'data/rcap-grade-a/packet-factory-24h/vf69/az-dismissal-final-evidence-20260911/source-conditioned-requirement-defects.json'));

assert.equal(dismissalDefect.rows.length, 42, 'the independent dismissal defect table must remain the exact 42-row input');
for (const defect of dismissalDefect.rows) {
  const id = key(defect.documentRole, defect.fieldId);
  const row = dismissalEntries.get(id);
  assert.ok(row, `dismissal map missing defect-table field ${id}`);
  assert.equal(row.requiredBeforeFiling, false, `${id} remains unconditionally required`);
  assert.equal(row.sourceConditionClass, defect.defectCategory, `${id} lost its source-table condition class`);
  assert.ok(row.conditionalRequirement, `${id} lacks an explicit participant condition`);
  assert.doesNotMatch(row.effectiveLabel, /^(petition|order) field |^source field /, `${id} exposes an internal field identifier as its primary participant label`);
  assert.notEqual(row.completenessDisposition, 'REQUIRED_BEFORE_FILING', `${id} retains the rejected disposition`);
  assert.equal(BLANK_DISPOSITIONS[row.completenessDisposition]?.allowed, true, `${id} uses an unsupported completeness disposition`);
  assert.equal(row.disposition, row.completenessDisposition, `${id} disposition fields disagree`);
}

const arrestSeven = arrestDefect.generatedContradictoryEntries.map(row => row.fieldName);
assert.deepEqual(arrestSeven, ['Defendant', 'EnteredOn', 'EnteredOn1', 'Check Box10', 'Check Box11', 'Check Box12', 'Check Box13']);
for (const field of arrestSeven) {
  const row = arrestEntries.get(key('petition', field));
  assert.ok(row, `arrest map missing defect-table field ${field}`);
  assert.equal(row.requiredBeforeFiling, false, `${field} remains unconditionally required on arrest route`);
  assert.equal(row.completenessDisposition, 'NOT_APPLICABLE_ON_THIS_ROUTE', `${field} must carry the route-off disposition`);
  assert.ok(row.routeConditionThatMakesItInapplicable, `${field} lacks its explicit route condition`);
}

for (const defect of dismissalDefect.rows.filter(row => !['Plaintiff', 'EnteredOn1'].includes(row.fieldId))) {
  const id = key(defect.documentRole, defect.fieldId);
  const row = arrestEntries.get(id);
  assert.ok(row, `arrest map missing shared source-conditioned field ${id}`);
  assert.equal(row.requiredBeforeFiling, false, `${id} became unconditionally required on arrest route`);
  assert.ok(row.conditionalRequirement, `${id} lacks the shared source condition on arrest route`);
}
for (const field of ['Check Box4', 'Check Box5']) {
  assert.equal(arrestEntries.get(key('petition', field)).sourceConditionClass, 'OFF_ROUTE', `${field} lost the stronger no-charge route exclusion`);
}

for (const id of [
  'petition.Case', 'petition.CourtCaseNum', 'petition.EnteredOn',
  'petition.Check Box10', 'petition.Check Box11', 'petition.Check Box12', 'petition.Check Box13',
  'petition.Check Box14', 'petition.Check Box15', 'petition.Check Box17', 'petition.Check Box18',
  'petition.Date', 'order.Case',
]) assert.equal(dismissalEntries.get(id)?.requiredBeforeFiling, true, `dismissal true requirement lost: ${id}`);

const arrestInstructions = fs.readFileSync(path.join(AZ_ROOT, FAMILIES.arrest, 'participant-instructions.md'), 'utf8');
const dismissalInstructions = fs.readFileSync(path.join(AZ_ROOT, FAMILIES.dismissal, 'participant-instructions.md'), 'utf8');
assert.match(arrestInstructions, /expressly skips Section II/);
assert.match(arrestInstructions, /Leave EnteredOn, EnteredOn1, and Section II controls Check Box10 through Check Box13 blank/);
assert.match(dismissalInstructions, /Section II remains active/);
assert.match(dismissalInstructions, /Yes, No, or N\/A choice/);
assert.match(dismissalInstructions, /charged-case Case, CourtCaseNum, and order Case fields remain required/);
for (const row of dismissalEntries.values()) {
  if (!row.sourceConditionClass) continue;
  assert.ok(dismissalInstructions.includes(`**${row.effectiveLabel}**`), `instructions omit ${row.documentRole}.${row.fieldName}`);
  assert.ok(dismissalInstructions.includes(row.conditionalRequirement), `instructions omit condition for ${row.documentRole}.${row.fieldName}`);
}

console.log('AZ_SOURCE_CONDITIONED_REQUIRED_FIELDS_PASS 42 dismissal rows; 7 arrest defects; 12 PDFs byte-identical');
