#!/usr/bin/env node
// Guard for DC-MISATTRIBUTED-ARREST-UNTRANSCRIBED-COMPONENT-2026-09-21.
//
// The determination is that this family's approved text lives in adopted,
// digest-current artifact bytes and was never transcribed into its
// specification, and that recording a caption treatment before the sections
// exist would swap a truthful refusal for a derivation-defect refusal.
//
// So the invariants are written to survive the repair rather than freeze the
// gap. Check 3 is a disjunction: either the component has been transcribed (it
// holds sections) or no caption treatment is asserted on it. That passes today,
// passes after the transcription lands with its caption, and fails exactly on a
// caption recorded against an empty specification.
//
// Check 4 protects the thing that is easy to destroy while fixing the footer:
// the adopted digest the owner approved by exact value.

import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';

const RECORD = 'data/record-clearing/legal-decisions/2026-09-21-dc-misattributed-arrest-untranscribed-component.json';
const SPEC = 'data/record-clearing/packet-specifications/DC-correct-misattributed-arrest.v1.json';
const COHORT = 'data/rcap-grade-a/FIRST_ROUTE_COHORT.json';
const ARTIFACT = 'data/rcap-all50/overlays/census-v1/dc/dc-correct-misattributed-arrest-set--custom-pleading/fixtures/canonical.pdf';
const PINNED_SHA = 'd4e4125cb51ec2248468dc093da2d40f66ae1dafc380ed7c2d6f84ec8fc4ce7f';

const json = (p) => JSON.parse(readFileSync(p, 'utf8'));
let checks = 0;
let failures = 0;
const ok = (label, condition, detail) => {
  checks += 1;
  if (condition) { console.log(`  ok        ${label}`); return; }
  failures += 1;
  console.log(`  FAILED    ${label}${detail === undefined ? '' : ` — observed ${JSON.stringify(detail)}`}`);
};

const record = json(RECORD);
const spec = json(SPEC);
const cohortRow = (json(COHORT).allRows ?? []).find((r) => r?.familyId === 'dc_correct_misattributed_arrest-set');
const primary = (spec.documents ?? []).find((d) => d.role === 'primary_filing');

console.log('DC misattributed arrest — the caption is established, the text is not transcribed\n');

console.log('1. the family is still the one this record read');
ok('the specification still carries a primary_filing', Boolean(primary));
ok('it is still a custom pleading addressed to the court',
  primary?.outputStrategy === 'custom_pleading' && primary?.documentContract?.recipient === 'court');
ok('its case identity is still resolved, so the VA reasoning does not apply here',
  primary?.documentContract?.caseMode === 'existing_case', primary?.documentContract?.caseMode);
ok('the first-route-cohort row still exists', Boolean(cohortRow));
ok('seven of its eight conditions still pass',
  Object.values(cohortRow?.checks ?? {}).filter((v) => v === true).length === 7,
  cohortRow?.checks);
ok('the one unmet condition is still the post-approval audit',
  JSON.stringify(cohortRow?.unmetConditions) === JSON.stringify(['noSubstantiveLegalChangeSinceThatApproval']),
  cohortRow?.unmetConditions);

console.log('\n2. the authority the caption was read from is still current');
ok('the adopted artifact is still present', existsSync(ARTIFACT));
const actual = existsSync(ARTIFACT)
  ? createHash('sha256').update(readFileSync(ARTIFACT)).digest('hex')
  : null;
ok('its digest still equals the value the owner adopted', actual === PINNED_SHA, actual);
ok('the record cites that same digest', record.part1_theCaptionIsEstablished?.artifact?.sha256 === PINNED_SHA);
ok('the cohort row still pins it as current',
  (cohortRow?.legalApproval?.shippingArtifactDigestPins ?? [])
    .some((p) => p.sha256 === PINNED_SHA && p.sha256Now === PINNED_SHA && p.current === true));
ok('the owner approval is still recorded as current',
  cohortRow?.legalApproval?.approvalCurrent === true
  && cohortRow?.legalApproval?.legalDecisionRecordId === 'OWN-ADOPT-2026-09-02-BATCH-53');

// ---------------------------------------------------------------------------
// The live invariant. Not a freeze: transcribing the component satisfies it.
console.log('\n3. a caption is not asserted against a specification that carries no sections');
const sections = (primary?.sections ?? []).length;
const caption = primary?.documentContract?.captionTreatment ?? null;
const transcribed = sections > 0;
ok('the component has been transcribed, or no caption treatment is asserted',
  transcribed || caption === null || caption === 'unresolved',
  { sections, captionTreatment: caption });
console.log(transcribed
  ? '            (transcribed; a recorded caption now has a block to satisfy it)'
  : '            (not transcribed; an unresolved refusal is the truthful state)');
ok('the record declines to write the caption for exactly this reason',
  /would replace a truthful unresolved refusal with a derivation-defect refusal/
    .test(record.whatThisRecordDoesNotDo?.noCaptionWritten ?? ''));
ok('the record still states the treatment the adopted bytes establish',
  record.part1_theCaptionIsEstablished?.treatment === 'full_independent_caption');

console.log('\n4. the shared footer is not repaired by breaking this family');
ok('the record measured the footer beyond this family rather than assuming',
  /73 of 280/.test(record.part4_aSharedDefectFoundWhileReading?.itIsNotThisFamilysData?.measured ?? ''));
ok('the record routes it to the engineering lane rather than rebuilding family data',
  /shared renderer or composer defect/i
    .test(record.part4_aSharedDefectFoundWhileReading?.itIsNotThisFamilysData?.consequence ?? ''));
ok('the record warns that regenerating this artifact would break the adopted digest',
  /break the digest the owner adopted by exact value/
    .test(record.part4_aSharedDefectFoundWhileReading?.doNotRegenerateToFixIt ?? ''));

console.log('\n5. no authority was created and no route changed');
ok('no fulfillment authority was created', record.statusOfThisRecord?.fulfillmentAuthorityCreated === 'NO');
ok('the post-approval condition is still unmet, so none may be',
  cohortRow?.checks?.noSubstantiveLegalChangeSinceThatApproval === false);
ok('state changed is none', record.statusOfThisRecord?.stateChanged === 'none');
for (const [field, expected] of [
  ['isCounselApproval', false], ['createsOutputApproval', false], ['createsTerminalStatus', false],
  ['productionTouched', false], ['commercialRoutesOpened', 0], ['opensAnyRoute', false], ['productionAuthorized', false]
]) ok(`${field} is ${JSON.stringify(expected)}`, record[field] === expected, record[field]);

console.log(`\n${checks - failures}/${checks} checks passed`);
if (failures) { console.error(`${failures} check(s) failed`); process.exit(1); }
