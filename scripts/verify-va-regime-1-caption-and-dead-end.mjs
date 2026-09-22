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
// THIS SCRIPT IS EXPECTED TO FAIL TODAY, on check 3, because the defect it
// describes is open. That is the control working, not a broken test. It is
// deliberately NOT wired into the npm test chain while it is red: adding it
// would block unrelated work, and weakening it to green would be the thing the
// plan forbids — a suite that is green because its checks stopped asking. Add
// it to the chain when check 3 passes, which happens when either a Grade-A
// fulfillment record honestly binds the route or the participant-facing claim
// stops offering it for purchase.

import { readFileSync } from 'node:fs';

const ROUTE_KEY = 'VA:regime-1-expungement-available-now';
const PATHWAY_ID = 'regime-1-expungement-available-now';
const RECORD = 'data/record-clearing/legal-decisions/2026-09-21-va-regime-1-caption-and-advertised-dead-end.json';
const SPEC = 'data/record-clearing/packet-specifications/VA-absolute-pardon-expungement.v1.json';
const CONTRACT = 'data/record-clearing/legal-decisions/2026-09-20-caption-treatment-contract.json';
const REGISTRY = 'data/record-clearing/factory-v2-route-registry.json';
const AUTHORITY = 'data/rcap-grade-a/fulfillment-authority-registry.json';
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
const primary = (spec.documents ?? []).find((d) => d.role === 'primary_filing');
const witness = (witnesses.witnesses ?? []).find((w) => w?.pathwayKey === ROUTE_KEY);
const hasFulfillmentRecord = readFileSync(AUTHORITY, 'utf8').includes(PATHWAY_ID);

console.log('VA regime-1 — the caption refusal, and the advertised dead end\n');

console.log('1. the route and its primary filing are still what this record read');
ok('the route is still registered', Boolean(row));
ok('the specification still carries a primary_filing', Boolean(primary));
// Brought forward on 2026-09-22. This read "still a custom pleading with no
// official form", which was true when the dead end was found and stopped being
// true when D-012 bound CC-1472. The product moved; the check had not. What the
// finding actually needs is that the primary filing is court-facing and cannot
// compose today, whichever instrument it now names -- so it is stated that way.
ok('its primary filing still cannot compose, whether as a custom pleading or an unmapped official form',
  primary?.outputStrategy === 'custom_pleading'
    ? (row?.officialFormIds ?? []).length === 0
    : primary?.outputStrategy === 'official_pdf_fill' && spec.legalSectionsBound === false,
  { strategy: primary?.outputStrategy, forms: row?.officialFormIds, legalSectionsBound: spec.legalSectionsBound });
ok('it is still court-facing (recipient court, participant filing)',
  primary?.documentContract?.recipient === 'court'
  && primary?.documentContract?.instrumentClass === 'participant_filing',
  primary?.documentContract?.recipient);
// Also brought forward. The original point was that nothing upstream held the
// route, so the evaluator was the only thing offering it. D-012 added an
// upstream gate, and that does not weaken the finding -- it sharpens it: the
// evaluator now offers checkout on a route its own specification refuses to
// compose. Either reading is recorded, and the dead end below is what fails.
ok('the upstream state is recorded, whether the specification holds the route or not',
  typeof spec.legalSectionsBound === 'boolean', spec.legalSectionsBound);
console.log(spec.legalSectionsBound === false
  ? '            (the specification now refuses to compose, and the evaluator still offers checkout)'
  : '            (nothing upstream holds it, so the evaluator is the only thing offering it)');

console.log('\n2. the caption cannot be written while the case is unestablished');
const caseMode = primary?.documentContract?.caseMode;
const caption = primary?.documentContract?.captionTreatment ?? null;
const caseResolved = caseMode !== 'unresolved';
ok('caseMode is resolved from source, or no caption is asserted',
  caseResolved || caption === null || caption === 'unresolved',
  { caseMode, captionTreatment: caption });
console.log(caseResolved
  ? '            (the case is established; a caption may now be recorded from that same source)'
  : '            (the case is still unestablished, so the refusal is correct)');
if (!caseResolved) {
  ok('the specification still records WHY the case is unestablished',
    /does not say which case this is filed into/i.test(
      String(primary?.documentContract?.unresolvedReasons?.caseMode ?? '')));
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
const advertisedPurchasable = witness?.terminalEvaluation?.paymentAllowed === true;
ok('a Grade-A fulfillment record binds the route, or it is not presented as purchasable',
  hasFulfillmentRecord || !advertisedPurchasable,
  { hasFulfillmentRecord, evaluatorPaymentAllowed: witness?.terminalEvaluation?.paymentAllowed,
    resultCode: witness?.terminalEvaluation?.resultCode });
console.log(hasFulfillmentRecord
  ? '            (a record now binds the route; the two layers agree)'
  : '            (no record binds it; the evaluator must not offer it for purchase)');
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
