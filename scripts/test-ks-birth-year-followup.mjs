#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';

const families = ['conviction', 'diversion', 'prostitution-coercion', 'specialty-court'];
const modules = await Promise.all(families.map(name => import(`./build-census-v1-ks-21-6614-${name}-set.mjs`)));
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
let assertions = 0;
const equal = (actual, expected, message) => { assertions += 1; assert.equal(actual, expected, message); };
const ok = (value, message) => { assertions += 1; assert.ok(value, message); };

const grantId = 'KSJC-ORDER-FOR-EXPUNGEMENT-CONVICTION-OR-DIVERSION-08-2022';
const denialId = 'KSJC-ORDER-DENYING-EXPUNGEMENT-12-2016';
const birthFields = [
  [grantId, 'Year of Birth'],
  [denialId, 'Sex born in']
];

for (const mod of modules) {
  const { SPEC, FIXTURES } = mod;
  const familyId = SPEC.familyId;
  const out = SPEC.outDir;
  const map = read(`${out}/production-field-map.json`);
  const writes = read(`${out}/reports/actual-writes.json`);
  const blanks = read(`${out}/reports/blanks-left-for-the-participant.json`);
  const guide = fs.readFileSync(`${out}/participant-instructions.md`, 'utf8');

  equal(FIXTURES.canonical['participant.birth_year'], '1988', `${familyId}: canonical year is derived from held DOB`);
  equal(FIXTURES.boundary['participant.birth_year'], '1979', `${familyId}: boundary year is derived from held DOB`);
  ok(!guide.includes('Only the caption is filled here'), `${familyId}: current component guidance no longer falsely says only captions are filled`);
  ok(guide.includes('neutral petitioner identity recitals'), `${familyId}: component guidance identifies the governed neutral identity writes`);

  for (const fixture of ['canonical', 'boundary']) {
    const expected = fixture === 'canonical' ? '1988' : '1979';
    for (const [documentId, field] of birthFields) {
      const documentMap = map.maps.find(row => row.documentId === documentId);
      const mapped = documentMap[`${fixture}Writes`].find(row => row.field === field);
      ok(mapped, `${familyId}/${fixture}/${documentId}/${field}: mapped as a write`);
      equal(mapped.factId, 'participant.birth_year', `${familyId}/${fixture}/${documentId}/${field}: binds the derived fact`);
      equal(mapped.decision, 'write', `${familyId}/${fixture}/${documentId}/${field}: neutral identity is not treated as a court choice`);
      const proofDocument = writes.documents.find(row => row.fixture === fixture && row.documentId === documentId);
      const actual = proofDocument.actualWrites.find(row => row.field === field);
      ok(actual, `${familyId}/${fixture}/${documentId}/${field}: saved-byte proof exists`);
      equal(actual.expected, expected, `${familyId}/${fixture}/${documentId}/${field}: expected transformed value is exact`);
      equal(actual.drawnText, expected, `${familyId}/${fixture}/${documentId}/${field}: exact year is read at the source widget`);
      equal(actual.foundInOutputBytes, true, `${familyId}/${fixture}/${documentId}/${field}: byte-derived write is present`);
      ok(!blanks.requiredBeforeFiling.some(row => row.document === documentId && row.field === field), `${familyId}/${fixture}/${documentId}/${field}: false participant handback is removed`);
    }
  }

  for (const documentId of [grantId, denialId]) {
    const documentMap = map.maps.find(row => row.documentId === documentId);
    for (const fixture of ['canonical', 'boundary']) {
      const courtRows = documentMap[`${fixture}Refusals`].filter(row =>
        /judge|court (finds|orders|grants|denies)|judicial/i.test(`${row.effectiveLabel ?? ''} ${row.why ?? ''}`)
      );
      ok(courtRows.length > 0, `${familyId}/${fixture}/${documentId}: court-owned findings and controls remain classified`);
      ok(courtRows.every(row => row.decision === 'refuse'), `${familyId}/${fixture}/${documentId}: court-owned findings and controls remain blank`);
    }
  }
}

const coercion = modules[2].SPEC;
const coercionBlanks = read(`${coercion.outDir}/reports/blanks-left-for-the-participant.json`).requiredBeforeFiling;
const coercionCases = [
  ['KSJC-PETITION-EXPUNGEMENT-CONVICTION-OR-DIVERSION-08-2022', 'undefined_4', /conviction.*OR.*diversion/i, /convicted.*OR.*diversion/i],
  ['KSJC-PETITION-EXPUNGEMENT-CONVICTION-OR-DIVERSION-08-2022', 'undefined_5', /fulfilling the diversion agreement/i, /fulfilled the terms of the diversion agreement/i],
  [grantId, 'undefined_6', /conviction.*OR.*diversion/i, /convicting court or diverting authority/i],
  [denialId, '6  The convicting court or diverting authority was', /conviction.*OR.*diversion/i, /convicting court or diverting authority/i]
];
for (const [document, field, reason, supply] of coercionCases) {
  const row = coercionBlanks.find(candidate => candidate.document === document && candidate.field === field);
  ok(row, `coercion ${document}/${field}: exact required-before-filing row remains disclosed`);
  ok(reason.test(row.why), `coercion ${document}/${field}: both conviction and diversion branches are explained`);
  ok(supply.test(row.participantMustSupply), `coercion ${document}/${field}: participant handback covers the exact alternate branch`);
}

const specialtyItem7 = modules[3].SPEC.policy['KSJC-PETITION-EXPUNGEMENT-CONVICTION-OR-DIVERSION-08-2022:undefined_5'];
equal(specialtyItem7.kind, 'requiredBeforeFiling', 'specialty item 7 remains a required source-form fact');
ok(specialtyItem7.supply.includes('date you satisfied the sentence'), 'specialty item 7 retains the sentence-completion alternative');
ok(specialtyItem7.supply.includes('date you were discharged'), 'specialty item 7 retains the supervision-discharge alternative');
ok(!/waiting period|arrest date|conviction date/i.test(`${specialtyItem7.reason} ${specialtyItem7.supply}`), 'specialty item 7 does not import the ordinary route waiting clock');

const frozen = read('data/rcap-grade-a/packet-factory-24h/vf67/rows-vf67-kansas-current-three-20260912.json');
equal(frozen.verifiedAtBase, 'b55d13e28dc33af73ac0a8d5b63fe5ed1f46935f', 'negative control remains pinned to the old packet commit');
equal(frozen.rows.length, 3, 'negative control preserves all three independently failed families');
for (const row of frozen.rows) {
  equal(row.proofObligations.KNOWN_PREFILLS.result, 'FAIL', `${row.familyId}: historical missing-write FAIL remains preserved`);
  ok(row.proofObligations.KNOWN_PREFILLS.finding.includes('four required neutral order birth-year occurrences are blank'), `${row.familyId}: old defect is exact`);
  equal(row.proofObligations.REQUIRED_BEFORE_FILING.result, 'FAIL', `${row.familyId}: historical false-handback FAIL remains preserved`);
}

console.log(`Kansas birth-year and coercion handback repair PASS (${assertions} assertions across four families)`);
