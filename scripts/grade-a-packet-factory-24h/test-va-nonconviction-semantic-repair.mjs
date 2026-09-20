#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import {
  VA_BASIS_POLICY,
  assertVaBasisPreparation,
  evaluateVaNonconvictionBasis,
  vaBasisInputStatus,
} from '../rcap-packet-recovery/va-nonconviction-basis.mjs';
import {
  composedBody,
  participantInstructions,
  runFamily,
} from '../build-census-v1-va_exp_nonconviction-set.mjs';

const familyDir = 'data/rcap-all50/overlays/census-v1/va/va-exp-nonconviction-set--official-pdf-fill';
let assertions = 0;
const check = (condition, message) => { assertions += 1; assert.ok(condition, message); };
const equal = (actual, expected, message) => { assertions += 1; assert.equal(actual, expected, message); };

const agreement = {
  disposition: 'reduced',
  deferredStatute: '19.2-298.02',
  targetIsOriginalReducedCharge: true,
  subsectionDAgreement: 'established',
  agreementEvidence: 'Final disposition order, page 2, separate all-party expungement agreement',
  admittedFactsOrFinding: true,
  prosecutionResponse: 'none',
};
const asOf = { asOf: '2026-09-12' };

const accepted = evaluateVaNonconvictionBasis(agreement, asOf);
equal(accepted.status, 'SUBSECTION_D_EXCEPTION_CONTINUE', 'the qualifying original reduced charge reaches the existing subsection D continuation gate');
equal(accepted.basis, 'otherwise_dismissed', 'the form basis is otherwise dismissed without relabeling the reduced-charge conviction');
equal(accepted.eligibilityDetermined, false, 'the evaluator does not decide eligibility');
equal(accepted.automaticallySelectsBox, false, 'the evaluator does not select the participant basis box');
equal(accepted.grantsFilingOrCommercialAuthority, false, 'the evaluator grants no filing or commercial authority');

for (const [name, record, expected] of [
  ['reduced with absent statute', { disposition: 'reduced', admittedFactsOrFinding: false }, 'RECORD_REVIEW_REQUIRED'],
  ['reduced with null statute', { disposition: 'reduced', deferredStatute: null, admittedFactsOrFinding: false }, 'RECORD_REVIEW_REQUIRED'],
  ['reduced missing statute and false original target', { disposition: 'reduced', targetIsOriginalReducedCharge: false, admittedFactsOrFinding: false }, 'RECORD_REVIEW_REQUIRED'],
  ['reduced missing statute and alternative conviction target', { disposition: 'reduced', targetIsAlternativeConviction: true, admittedFactsOrFinding: false }, 'RECORD_REVIEW_REQUIRED'],
  ['reduced missing statute and unknown admission screen', { disposition: 'reduced' }, 'RECORD_REVIEW_REQUIRED'],
  ['missing target identity', { ...agreement, targetIsOriginalReducedCharge: undefined }, 'RECORD_REVIEW_REQUIRED'],
  ['explicit alternative-conviction target', { ...agreement, targetIsAlternativeConviction: true }, 'RECORD_REVIEW_REQUIRED'],
  ['missing agreement', { ...agreement, subsectionDAgreement: 'absent' }, 'RECORD_REVIEW_REQUIRED'],
  ['missing agreement evidence', { ...agreement, agreementEvidence: ' ' }, 'RECORD_REVIEW_REQUIRED'],
  ['later no-objection only', { ...agreement, subsectionDAgreement: 'unknown', prosecutionResponse: 'no_objection' }, 'RECORD_REVIEW_REQUIRED'],
  ['other statute', { ...agreement, deferredStatute: '18.2-251' }, 'OTHER_ROUTE_REVIEW'],
  ['opposition', { ...agreement, prosecutionResponse: 'objection' }, 'SELF_HELP_STOP'],
  ['future version', { ...agreement, basisVersion: '2026-12-01' }, 'FUTURE_LAW_NOT_ENABLED'],
]) equal(evaluateVaNonconvictionBasis(record, asOf).status, expected, name);

for (const record of [
  { disposition: 'reduced', admittedFactsOrFinding: false },
  { disposition: 'reduced', deferredStatute: null, targetIsAlternativeConviction: true, admittedFactsOrFinding: false },
]) assert.throws(() => assertVaBasisPreparation({ [VA_BASIS_POLICY.factKey]: record }, asOf),
  /VA_BASIS_STOP:RECORD_REVIEW_REQUIRED/);

const ordinaryDismissalStatus = vaBasisInputStatus({ disposition: 'dismissed', admittedFactsOrFinding: false });
const ordinaryStatute = ordinaryDismissalStatus.find((entry) => entry.fact === 'deferredStatute');
check(ordinaryStatute?.required === false && ordinaryStatute.status === 'CONDITIONAL_NOT_TRIGGERED',
  'ordinary nondeferred dismissal does not ask the participant to invent a deferred statute');

const missingStatus = vaBasisInputStatus({ disposition: 'reduced', deferredStatute: '19.2-298.02' });
for (const fact of ['targetIsOriginalReducedCharge', 'subsectionDAgreement', 'agreementEvidence']) {
  const row = missingStatus.find((entry) => entry.fact === fact);
  check(row?.required === true && row.status === 'MISSING', `${fact} is explicitly required and missing on the reduction branch`);
}
const suppliedStatus = vaBasisInputStatus(agreement);
for (const fact of ['disposition', 'deferredStatute', 'targetIsOriginalReducedCharge', 'subsectionDAgreement', 'agreementEvidence']) {
  equal(suppliedStatus.find((entry) => entry.fact === fact)?.status, 'PROVIDED', `${fact} is recorded as provided`);
}

const decision = JSON.parse(fs.readFileSync('data/rcap-grade-a/legal-decisions/LEGAL_BLOCKED_RESOLUTION_2026-09-11.json'))
  .decisions.find((row) => row.decisionId === VA_BASIS_POLICY.bindingDecisionId);
equal(decision?.disposition, 'LEGAL_CLEAR', 'the exact governed binding decision remains LEGAL_CLEAR');
check(decision?.familyIds.includes('va_exp_nonconviction-set'), 'the decision binds only the assigned family here');
check(/original charge.*reduced|dismissal\/reduction/i.test(decision?.bindingProductRule), 'the decision expressly includes the reduced-original-charge branch');
check(/Do not infer agreement/i.test(decision?.bindingProductRule), 'the decision preserves the no-inference gate');

const participantFacts = { 'participant.full_legal_name': 'Jordan Avery Reyes', 'participant.date_of_birth': '1991-04-17' };
for (const component of ['commonwealth_service_and_stipulation_request', 'ccre_forwarding_request', 'records_checklist', 'filing_instructions']) {
  const text = composedBody(component, participantFacts);
  check(!text.includes('obligation:track-only'), `${component} omits the internal route key`);
  check(!text.includes('committed track registry'), `${component} omits registry implementation language`);
}
const records = composedBody('records_checklist', participantFacts);
check(records.includes('original charge was reduced'), 'records checklist collects the reduced-original-charge relationship');
check(records.includes('does not ask to expunge a separate conviction'), 'records checklist protects the separate reduced-charge conviction');
check(records.includes('separate all-party agreement'), 'records checklist collects the separate agreement and evidence');

const guide = participantInstructions([], [], []);
for (const internal of ['obligation:track-only', 'shared field semantics', 'build findings', 'data/record-clearing/', 'committed track registry']) {
  check(!guide.includes(internal), `participant guide omits internal copy: ${internal}`);
}
check(guide.includes('original charge that was reduced'), 'participant guide explains the reduced-original-charge route');
check(guide.includes('Do not use this petition to ask for expungement of a separate conviction'), 'participant guide protects the separate conviction');
check(guide.includes('separate all-party agreement'), 'participant guide explains the agreement evidence gate');
for (const internal of ['ccre_forwarding_request', 'commonwealth_service_and_stipulation_request', 'filing_instructions', 'records_checklist']) {
  check(!guide.includes(`### ${internal}`), `participant heading omits internal component id ${internal}`);
}

const checkOnly = await runFamily(['--check', '--no-raster']);
equal(checkOnly.status, 'CHECK_ONLY', 'builder source and decision bindings pass before rendering');

if (!process.argv.includes('--unit')) {
  const actualGuide = fs.readFileSync(`${familyDir}/participant-instructions.md`, 'utf8');
  check(actualGuide.includes('original charge that was reduced'), 'saved participant guide includes the new branch');
  check(!actualGuide.includes('obligation:track-only'), 'saved participant guide omits the route key');
  for (const fixture of ['canonical', 'boundary']) {
    const pdfText = execFileSync('pdftotext', ['-layout', `${familyDir}/fixtures/${fixture}.pdf`, '-'], { encoding: 'utf8' });
    check(pdfText.includes('original charge that was reduced'), `${fixture} packet includes the new branch`);
    check(!pdfText.includes('obligation:track-only'), `${fixture} packet omits the route key`);
    const writes = JSON.parse(fs.readFileSync(`${familyDir}/reports/actual-writes.json`)).artifacts.find((row) => row.fixture === fixture);
    equal(writes.refusedFieldsWithInk.length, 0, `${fixture} has no protected/refused field ink`);
    equal(writes.strayRouteSelectionStrokes, 0, `${fixture} has no selection strokes outside measured boxes`);
  }
}

console.log(JSON.stringify({ result: 'PASS', familyId: 'va_exp_nonconviction-set', assertions, negativeControls: 15, sourceAndActorProtectionsPreserved: true }));
