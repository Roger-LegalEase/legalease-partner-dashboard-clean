#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SPEC as baseSpec, FIXTURES as baseFixtures } from './build-census-v1-ks-21-6614-conviction-set.mjs';
import { createKansasBuilder } from './rcap-official-forms/kansas-statutory-builder.mjs';
import { applyKansasSharedPolicy } from './rcap-official-forms/kansas-shared-policy.mjs';

const trackId = 'ks-21-6614-specialty-court';
const familyId = `${trackId}-set`;
const registryPath = 'data/record-clearing/legal-design-track-registry.json';
const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
function findTrack(value) {
  if (!value || typeof value !== 'object') return null;
  if (value.trackId === trackId) return value;
  for (const child of Object.values(value)) { const found = findTrack(child); if (found) return found; }
  return null;
}
const track = findTrack(registry);
assert.ok(track?.packetSet?.components.length);
export const SPEC = structuredClone(baseSpec);
export const FIXTURES = structuredClone(baseFixtures);
export const ROUTE_FACTS = { disposition: 'conviction', specialtyCourt: true };
Object.assign(SPEC, {
  familyId, worklistGroupId: familyId, trackId,
  buildScript: `scripts/build-census-v1-${familyId}.mjs`,
  outDir: `data/rcap-all50/overlays/census-v1/ks/${familyId}--official-pdf-fill`,
  routeKey: `obligation:track-pathway:KS:${trackId}:specialty-court-accelerated`,
  routeSlug: trackId, routeLabel: 'Kansas specialty-court completion expungement - K.S.A. 21-6614(a)(3)',
  legalName: track.legalName, routeName: track.publicName, statutes: track.authority,
  records: [{ recordId: `legal-design-track-registry:${trackId}`, path: registryPath,
    role: 'Existing specialty-court component, filing and participant-treatment authority',
    mustContain: [track.legalName, track.mechanism, ...Object.values(track.rules)] }],
  instructionsIntro: [track.mechanism, 'Confirm that your programme was established under K.S.A. 20-173. Ordinary diversion is a different route.'],
  obligationTable: Object.entries(track.rules),
  documentsToObtain: track.participantFilingRequirements.map(x => [x.name, `${x.obtainedFrom}. ${x.howToObtain}`]),
  stopConditions: track.selfHelpStopConditions,
  routeElectionDisclosure: [
    'The opening conviction box and item 8 Option B identify this specialty-court route. Option A and all its waiting-period and coercion controls remain blank.',
    'The two-year felony-conviction lookback does not apply to this route. No pending or instituted felony proceeding may contradict the Option B statement.',
    'The optional fee-waiver request is offered unsigned. Complete it only if you choose to request a waiver. The packet makes no financial-hardship assertion for you.'
  ],
  steps: [
    'Obtain the programme completion record from the coordinator or court, and confirm the programme qualifies under K.S.A. 20-173.',
    'Complete the listed missing case facts and check the petition against your records. Leave Option A and its waiting-period boxes blank.',
    'Read the hearing-preparation guidance. Sign and date the petition yourself only when its statements are accurate.',
    'If requesting a fee waiver, complete the optional request with your own facts, choose the amount requested, then sign and date it yourself.',
    track.rules.filing, track.rules.fees, track.rules.service,
    'Confirm the copy count with the clerk. Obtain hearing details after filing. Leave the service certificate for the clerk.',
    'Bring the proposed orders to the hearing. Complete only the identified factual blanks; leave findings, court elections, ruling and judicial signature blank.',
    'If relief is granted, confirm with the clerk that the signed order and KBI cover sheet are sent to the KBI.'
  ],
  deliberatelyBlank: [
    'Participant signature and date; all court, prosecutor and clerk fields; hearing details before the court supplies them.',
    'Option A and all waiting-period controls, which do not apply to this specialty-court petition.',
    'All fee-waiver choices, financial account, signature and date, which only the participant supplies.'
  ],
  buildFindings: [], counselQuestions: [],
  reviewersAttention: ['Measure conviction and Option B marks, blank Option A controls, protected orders and clerk certificate, and the unsigned optional fee-waiver request.'],
  routeSelectionsMade: [{ ...baseSpec.routeSelectionsMade[0],
    because: 'K.S.A. 21-6614(a)(3) requests expungement of the conviction after specialty-court completion.' }, {
    document: 'KSJC-PETITION-EXPUNGEMENT-CONVICTION-OR-DIVERSION-08-2022', field: 'Check Box8',
    selected: 'Option B', printedContext: 'Option B, specialty court programme',
    because: 'Held programme completion and the selected K.S.A. 21-6614(a)(3) route.'
  }],
  routeSelectionNote: 'Conviction and Option B only. Court findings and participant fee-waiver choices are unselected.'
});
SPEC.guidance = {
  title: 'Preparing for your specialty-court expungement hearing',
  intro: [track.mechanism],
  findings: [
    'Programme completion replaces the ordinary waiting period. Bring your programme completion record. No felony proceeding may be presently pending or being instituted; the two-year felony-conviction lookback does not apply.',
    ...baseSpec.guidance.findings.slice(1)
  ],
  quoted: Object.entries(track.rules), whatThisIsNot: baseSpec.guidance.whatThisIsNot
};
const pet = 'KSJC-PETITION-EXPUNGEMENT-CONVICTION-OR-DIVERSION-08-2022';
for (const policy of Object.values(SPEC.policy)) {
  for (const key of ['why','reason','basis','routeCondition']) {
    if (typeof policy[key] === 'string') policy[key] = policy[key].replaceAll('21-6614(a)(1)', '21-6614(a)(3)');
  }
}
SPEC.notTold = SPEC.notTold.filter(text => !text.startsWith('Which waiting period'));
for (const name of ['Check Box3','Check Box4','Check Box5','Check Box6','Check Box7']) {
  SPEC.policy[`${pet}:${name}`] = { kind: 'notApplicable', selectionControl: true,
    reason: 'Option A belongs to the ordinary waiting-period route. This specialty-court packet states Option B.',
    routeCondition: 'K.S.A. 21-6614(a)(3) specialty-court completion uses Option B rather than Option A and imposes no ordinary waiting period.' };
}
SPEC.policy[`${pet}:Check Box8`] = { kind: 'select', basis: 'The held specialty-court completion fact selects Option B under K.S.A. 21-6614(a)(3); pending felony proceedings are checked before rendering.' };
for (const facts of Object.values(FIXTURES)) {
  delete facts['answers.felony_in_past_two_years'];
  facts['answers.specialty_court_completion'] = true;
  facts['answers.specialty_court_under_20_173'] = true;
  facts['answers.pending_felony_proceeding'] = false;
}
SPEC.documents = track.packetSet.components.map(component => {
  const old = baseSpec.documents.find(d => component.officialFormId ? d.officialFormId === component.officialFormId : d.role === component.role);
  if (old) return { ...old, componentId: component.componentId,
    ...(!component.officialFormId ? { documentId: 'KS-SPECIALTY-COURT-HEARING-PREPARATION' } : {}) };
  assert.equal(component.role, 'fee_waiver');
  return { componentId: component.componentId, documentId: 'KS-SPECIALTY-COURT-OPTIONAL-FEE-WAIVER',
    officialFormId: null, role: 'fee_waiver', participantName: 'Optional request to waive docket fee',
    whoCompletesIt: 'Participant chooses whether to file it, supplies their own facts and request, and signs. The judge decides.',
    compose: facts => [
      `IN THE ${facts['matter.court']} JUDICIAL DISTRICT`,
      `DISTRICT COURT OF ${facts['matter.county'].toUpperCase()} COUNTY, KANSAS`,
      'STATE OF KANSAS', `v. ${facts['participant.full_legal_name']}`, `Case No. ${facts['matter.case_number']}`,
      '', 'OPTIONAL REQUEST TO WAIVE DOCKET FEE', 'K.S.A. 21-6614(a)(3)', '',
      'Complete and file this request only if you choose to ask the court to waive all or part of the specialty-court expungement docket fee. The court decides whether to grant the request.', '',
      'I request waiver of (select and complete one):', '[ ] All of the docket fee.  [ ] Part of the docket fee: $____________', '',
      'My own facts supporting this request (complete before filing):',
      '________________________________________________________________',
      '________________________________________________________________',
      '________________________________________________________________', '',
      'Signature: _____________________________  Date: _________________',
      `Printed name: ${facts['participant.full_legal_name']}`,
      `Address: ${facts['participant.street_address']}`, facts['participant.city_state_zip'],
      `Telephone: ${facts['participant.phone']}`, `Email: ${facts['participant.email']}`
    ].join('\n') };
});
const hearingGuide = SPEC.documents.find(document => document.documentId === 'KS-SPECIALTY-COURT-HEARING-PREPARATION');
assert.ok(hearingGuide, 'specialty-court hearing-preparation component must exist');
hearingGuide.composedPdfLayout = {
  // The guide wraps to exactly 46 rows. The shared 14.5pt leading fits 45,
  // orphaning only "the court will decide." on a second guidance page. This
  // 0.1pt leading adjustment keeps the complete final paragraph together at
  // the unchanged 11pt font and 72pt margins. Other Kansas families retain
  // the shared default, and the separately composed fee request is unchanged.
  lineHeight: 14.4
};
applyKansasSharedPolicy(SPEC, FIXTURES);
const finalDischargeField = SPEC.policy[`${pet}:undefined_5`];
assert.equal(finalDischargeField.kind, 'requiredBeforeFiling', 'specialty item 7 remains a participant-supplied source fact');
Object.assign(finalDischargeField, {
  reason: 'the participant supplies this before filing: the date of final discharge, from the record you screened with, or from the clerk of the convicting district court',
  supply: 'the LATEST of: the date you satisfied the sentence, or the date you were discharged from probation, a community correctional services programme, parole, postrelease supervision, conditional release or a suspended sentence'
});
const build = createKansasBuilder(SPEC, FIXTURES, ROUTE_FACTS);
export async function runFamily(argv = process.argv.slice(2)) {
  for (const facts of Object.values(FIXTURES)) {
    assert.equal(facts['answers.specialty_court_under_20_173'], true);
    assert.equal(facts['answers.pending_felony_proceeding'], false);
  }
  return build(argv);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  runFamily().then(result => { console.log(JSON.stringify(result,null,2)); if (!['COMPLETED','CHECK_ONLY'].includes(result.status)) process.exitCode=2; })
    .catch(error => { console.error(error); process.exitCode=1; });
}
