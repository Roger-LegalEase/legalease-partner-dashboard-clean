#!/usr/bin/env node
// Guard for VA-REGIME-1-CAPTION-AND-ADVERTISED-DEAD-END-2026-09-21.
//
// Two findings, two different invariant shapes.
//
// The caption finding is a disjunction, so the real repair is not blocked:
// either caseMode has been resolved from source (and a caption may then be
// recorded from the same source), or no caption is asserted. It fails only on
// a caption written while the specification still says no source establishes
// which case the instrument belongs to.
//
// The dead-end finding is a live product invariant: a route the server-side
// commercial authority fails closed must not be presented to a participant as
// purchasable. It passes when either side is repaired -- a fulfillment record
// written honestly, or the participant-facing claim made truthful -- and fails
// while the two layers disagree. It is deliberately NOT satisfied by hiding the
// route, which Mission Lock Rule 4 forbids and which check 4 detects.
//
// The historical witness remains evidence of the original defect. Current
// acceptance must execute the public API and render its availability fields:
// legal eligibility alone is no longer a claim that a packet can be bought.
// False availability and false rendered purchase copy remain failing controls.

import { readFileSync } from 'node:fs';
import { register } from 'node:module';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
register('./lib/ts-esm-loader.mjs', import.meta.url);
const { POST } = await import('../src/app/api/expungement-ai/evaluate/route.ts');
const { packetFulfillmentAuthority } = await import('../src/lib/expungement-ai/packet-fulfillment-authority.ts');
const { getCurrentFulfillmentRecord } = await import('../src/lib/rcap/fulfillment/grade-a-registry.ts');
const { ScreeningResult } = await import('../src/components/expungement-ai/screening/ScreeningResult.tsx');

const VA_V3_REGISTER = '3f8998b2fdba92b77c6804934c949bb367bf4c945ca2826d6b119da0e81cdf0b';
const VA_OLD_REGISTER = '4ffc56d4cc8dfa9b882f64ad51f49be815704fe20009ee7425b429418b54ead2'; // immutable predecessor ancestry
const VA_SOURCE = '85ac8ea0f2dc40d890fa2b37921a1b24956ed4aecb1555109a0bb5a65793c656';
const VA_URL = 'https://www.fairfaxcounty.gov/circuit/sites/circuit/files/assets/documents/pdf/expungement-order.pdf';
// Portable metadata tuple only; private PDF bytes were independently checked in custody.
// CI has no dependency on the ignored private source path and performs no network acquisition.
const sourceSuccessor = s => s.procedureAdoption?.registerSha256 === VA_V3_REGISTER
  && s.procedureAdoption?.supersededRegisterSha256 === VA_OLD_REGISTER
  && s.procedureAdoption?.currentInstrument?.officialFormId === 'CC-1474'
  && s.procedureAdoption.currentInstrument.revision === '07/26'
  && s.procedureAdoption.currentInstrument.sourceUrl === VA_URL
  && s.procedureAdoption.currentInstrument.sha256 === VA_SOURCE
  && s.procedureAdoption.currentInstrument.custodyReceipt === 'data/rcap-grade-a/source-custody/court-source-handoff-20261013/va-cc1474-current-source-20261016.json';
const ROUTE_KEY = 'VA:regime-1-expungement-available-now';
const PATHWAY_ID = 'regime-1-expungement-available-now';
const RECORD = 'data/record-clearing/legal-decisions/2026-09-21-va-regime-1-caption-and-advertised-dead-end.json';
const SPEC = 'data/record-clearing/packet-specifications/VA-absolute-pardon-expungement.v1.json';
const CONTRACT = 'data/record-clearing/legal-decisions/2026-09-20-caption-treatment-contract.json';
const REGISTRY = 'data/record-clearing/factory-v2-route-registry.json';
const WITNESSES = 'data/rcap-ledger/public-witness-answer-sets.json';

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
const contract = json(CONTRACT);
const registry = json(REGISTRY);
const witnesses = json(WITNESSES);
const rows = Array.isArray(registry) ? registry : (registry.routes ?? Object.values(registry).find(Array.isArray) ?? []);
const row = rows.find((r) => r?.pathwayKey === ROUTE_KEY);
const primary = (spec.documents ?? []).find((d) => d.role === 'implementation_instrument');
const historicalPrimary = spec.historicalSupersededSpecification?.record?.documents?.find(d => d.role === 'primary_filing');
const witness = (witnesses.witnesses ?? []).find((w) => w?.pathwayKey === ROUTE_KEY);
const hasFulfillmentRecord = Boolean(getCurrentFulfillmentRecord(ROUTE_KEY));

console.log('VA regime-1 — the caption refusal, and the advertised dead end\n');

console.log('1. the historical petition is preserved; adopted VA-01 does not establish a current participant petition');
ok('the route is still registered', Boolean(row));
ok('the previously recorded primary filing remains historical evidence', Boolean(historicalPrimary));
const currentProcedureUnbound = candidate => candidate.procedureAdoption?.decisionId === 'VA-01'
  && candidate.procedureAdoption?.disposition === 'MODIFY'
  && candidate.procedureAdoption?.evidenceKind === 'owner_relayed_counsel_adoption'
  && sourceSuccessor(candidate)
  && candidate.procedureAdoption?.participantPetitionEstablished === false
  && candidate.procedureAdoption?.documentAcceptance === 'NOT_VERIFIED'
  && candidate.legalSectionsBound === false
  && candidate.documents?.length > 0
  && candidate.documents.every(d => d.role !== 'primary_filing'
    && d.outputStrategy === 'process_guidance' && !d.officialFormId);
ok('the adopted current procedure selects no unestablished petition or substitute form', currentProcedureUnbound(spec));
for (const mutate of [s=>{s.procedureAdoption.currentInstrument.sha256='0'.repeat(64);},s=>{s.procedureAdoption.registerSha256=VA_OLD_REGISTER;},s=>{s.procedureAdoption.currentInstrument.revision='11/15';}]) {const bad=structuredClone(spec);mutate(bad);ok('wrong source/version or older register cannot select current successor',!currentProcedureUnbound(bad));}
ok('the identified order has source-established court actors without active population', Boolean(primary)
  && primary.documentContract?.instrumentClass === 'court_generated'
  && primary.documentContract?.preparedBy === 'court'
  && primary.documentContract?.signer === 'judge'
  && primary.documentContract?.recipient === 'unresolved'
  && primary.officialFormId === null && primary.outputStrategy === 'process_guidance');
for (const change of [
  s => { s.documents[0].role = 'primary_filing'; },
  s => { s.documents[0].officialFormId = 'CC-1473'; },
  s => { s.procedureAdoption.documentAcceptance = 'VERIFIED'; }
]) {
  const mutated = structuredClone(spec); change(mutated);
  ok('unsupported current petition, substitute or approval mutation is refused', !currentProcedureUnbound(mutated));
}
// Also brought forward. The original point was that nothing upstream held the
// route, so the evaluator was the only thing offering it. D-012 added an
// upstream gate, and that does not weaken the finding -- it sharpens it: the
// evaluator now offers checkout on a route its own specification refuses to
// compose. Either reading is recorded, and the dead end below is what fails.
ok('the upstream state is recorded, whether the specification holds the route or not',
  typeof spec.legalSectionsBound === 'boolean', spec.legalSectionsBound);
console.log(spec.legalSectionsBound === false
  ? '            (the specification refuses to compose; current public availability is checked below)'
  : '            (current public availability is checked against fulfillment authority below)');

console.log('\n2. the caption cannot be written while the case is unestablished');
const caseMode = primary?.documentContract?.caseMode;
const caption = primary?.documentContract?.captionTreatment ?? null;
const caseResolved = typeof caseMode === 'string' && caseMode !== 'unresolved';
ok('caseMode is resolved from source, or no caption is asserted',
  caseResolved || caption === null || caption === 'unresolved'
    || (caption === 'official_form_controls' && sourceSuccessor(spec) && spec.legalSectionsBound === false
      && primary?.officialFormId === null && primary?.outputStrategy === 'process_guidance'),
  { caseMode, captionTreatment: caption });
console.log(caseResolved
  ? '            (the case is established; a caption may now be recorded from that same source)'
  : '            (the case is still unestablished, so the refusal is correct)');
if (!caseResolved) {
  ok('the actual receiving case stays unreconciled despite source-defined caption structure',
    /actual receiving-court\/case identifiers/.test(String(primary?.documentContract?.unresolvedReasons?.caseMode ?? ''))
      && spec.legalSectionsBound === false && primary?.officialFormId === null);
}
ok('the contract still forbids inferring a caption from presentation',
  /Nothing is inferred from presentation/.test(contract.theContract?.derivedOnlyWhereASourceFieldStatesIt ?? ''));
ok('no captioned companion exists that could make this a supporting page',
  (spec.documents ?? []).filter((d) => d.role !== 'primary_filing'
    && d.outputStrategy !== 'process_guidance').length === 0,
  (spec.documents ?? []).map((d) => `${d.role}:${d.outputStrategy}`));

// ---------------------------------------------------------------------------
// The live product invariant.
console.log('\n3. a route the commercial authority fails closed is not advertised as purchasable');
ok('the original witness and its measurement remain available', Boolean(witness?.finalAnswers && witness?.terminalEvaluation));
const requestBody = { jurisdiction: 'VA', profileVersion: witness.profileVersion,
  matterId: 'synthetic-va-current-availability', answers: witness.finalAnswers };
const response = await POST(new Request('http://127.0.0.1/api/expungement-ai/evaluate', {
  method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(requestBody)
}));
ok('the real public evaluation handler accepts the retained answers', response.status === 200, response.status);
const current = await response.json();
ok('the current result retains the supported Virginia route', current.pathwayId === PATHWAY_ID, current.pathwayId);
const consumer = packetFulfillmentAuthority('VA', PATHWAY_ID, 'checkout creation', { trackId: current.selectedTrackId ?? null });
const sponsored = packetFulfillmentAuthority('VA', PATHWAY_ID, 'sponsored entitlement', { trackId: current.selectedTrackId ?? null });
ok('consumer availability equals current authority, not record presence or the historical eligibility bit', current.consumerPacketAvailable === consumer.allowed);
ok('sponsored availability equals current channel authority', current.sponsoredPacketAvailable === sponsored.allowed);
const render = (evaluation, hasScreeningSession) => renderToStaticMarkup(React.createElement(ScreeningResult, {
  evaluation, stateName: 'Virginia', questionPromptById: {}, onEditAnswers() {}, onPacketAction() {}, hasScreeningSession
}));
const truthfulUnavailable = html => html.includes('A packet is not available for this route yet')
  && !/\$50|You may be able to prepare an expungement packet|Verify the packet facts before payment/.test(html);
for (const partner of [false, true]) {
  const allowed = partner ? sponsored.allowed : consumer.allowed;
  if (!allowed) {
    ok(`${partner ? 'partner' : 'DTC'} card states packet unavailability without a purchase claim`, truthfulUnavailable(render(current, partner)));
    ok(`${partner ? 'partner' : 'DTC'} false-availability mutation is rejected`, !truthfulUnavailable(render({ ...current,
      consumerPacketAvailable: true, sponsoredPacketAvailable: true, paymentAllowed: true }, partner)));
  }
}
const forged = await POST(new Request('http://127.0.0.1/api/expungement-ai/evaluate', {
  method: 'POST', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ ...requestBody, consumerPacketAvailable: !consumer.allowed, sponsoredPacketAvailable: !sponsored.allowed })
}));
const forgedResult = await forged.json();
ok('client availability assertions cannot change server authority', forged.status === 200
  && forgedResult.consumerPacketAvailable === consumer.allowed && forgedResult.sponsoredPacketAvailable === sponsored.allowed);
console.log(`            historical eligibility signal=${witness.terminalEvaluation.paymentAllowed}; current consumer=${consumer.allowed}; current sponsored=${sponsored.allowed}; fulfillment record present=${hasFulfillmentRecord}`);
// Provenance of the claim, NOT a live equality. Pinning the record's stored
// measurement to today's value would make this verifier fail the moment the
// defect is repaired, which is the same freeze mistake as requiring a
// divergence to persist. What must hold is that the record named both layers
// and cited the authority it read, so the finding can be audited later.
const layers = record.part2_theActualDefect?.measured ?? [];
ok('the record names the screening evaluator as one of the two disagreeing layers',
  layers.some((l) => /screening evaluator/i.test(l.layer ?? '')));
ok('the record names the server-side commercial authority as the other',
  layers.some((l) => /commercial authority/i.test(l.layer ?? '')
    && /grade-a-admission\.ts/.test(l.source ?? '')));
ok('the record cites the fail-closed disposition it read',
  layers.some((l) => l.disposition === 'UNKNOWN_FAIL_CLOSED'));
ok('the record contrasts two routes that do have records, so this reads as a route-specific absence',
  Object.values(record.part2_theActualDefect?.contrastMeasuredAtTheSameTime ?? {})
    .filter((v) => v === 'COMPLETE_PACKET_PROVEN').length >= 2);

console.log('\n4. the dead end was not closed by hiding the route');
ok('the route is still offered rather than removed from the registry', Boolean(row));
ok('it was not converted to guidance-only or made noncommercial',
  row?.separateGates?.closureCategory === 'paid_packet_intended',
  row?.separateGates?.closureCategory);
ok('the record refuses suppression as the repair',
  /Suppressing VA regime-1 from screening to remove the dead end would be exactly that, and is refused/
    .test(record.whatMustNotBeDoneAboutIt?.rule4 ?? ''));
ok('the record also refuses writing a fulfillment record to force agreement',
  /Writing a Grade-A fulfillment record to make the layers agree would be worse/
    .test(record.whatMustNotBeDoneAboutIt?.andNotThisEither ?? ''));

console.log('\n5. the record changed nothing');
ok('no caption treatment was recorded', record.part1_theCaptionRefusalIsCorrect?.captionTreatmentsRecordedByThisRecord === 0);
ok('no fulfillment record was written', record.statusOfThisRecord?.fulfillmentRecordWritten === 'NO');
ok('state changed is none', record.statusOfThisRecord?.stateChanged === 'none');
for (const [field, expected] of [
  ['isCounselApproval', false], ['createsOutputApproval', false], ['createsTerminalStatus', false],
  ['productionTouched', false], ['commercialRoutesOpened', 0], ['opensAnyRoute', false], ['productionAuthorized', false]
]) ok(`${field} is ${JSON.stringify(expected)}`, record[field] === expected, record[field]);

console.log(`\n${checks - failures}/${checks} checks passed`);
if (failures) { console.error(`${failures} check(s) failed`); process.exit(1); }
