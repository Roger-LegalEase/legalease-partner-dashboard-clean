#!/usr/bin/env node
// Verifier for ND-19-03-1-23-9-VEHICLE-AND-TWO-YEAR-CONDITION-2026-09-21.
//
// What this protects, and what it deliberately does NOT protect.
//
// It protects the determination: that the route is current, that its vehicle is
// a composed pleading resting on a quoted official statement, that nothing in
// this repository has quietly picked an anchor for the subsection's two-year
// period, and that the route cannot sell while that period is unexecuted.
//
// It does NOT freeze the present defect. The ND 12-60.1 verifier had to be
// narrowed because it required every field currently classified as divergent to
// stay divergent forever, which turns a historical observation into a launch
// obligation. So the cross-statute contamination is asserted as a DISJUNCTION:
// either the pathway's waiting-rule pool has been scoped to its own statute, or
// the route is not payment-allowed. That passes today (the route does not sell),
// passes after the repair (the pool is scoped), and fails only in the state
// nobody wants — a contaminated pool on a selling route.

import { readFileSync } from 'node:fs';
import { readdirSync } from 'node:fs';

const PATHWAY_ID = 'first-offense-possession-sealing';
const PATHWAY_KEY = 'ND:first-offense-possession-sealing';
const TRACK_ID = 'nd-marijuana-first-offense-seal';
const RECORD = 'data/record-clearing/legal-decisions/2026-09-21-nd-19-03-1-23-9-vehicle-and-two-year-condition.json';
const DUI_RECORD = 'data/record-clearing/legal-decisions/2026-09-21-nd-dui-sealing-vehicle-determination.json';
const PROFILE = 'src/lib/rcap-engine/compiled/profiles/ND-north-dakota.json';
const REGISTRY = 'data/record-clearing/factory-v2-route-registry.json';
const HOLDS = 'data/rcap-grade-a/maintenance/route-holds.json';
const MEMO = 'data/record-clearing/legal-design-intake/ND.memo.json';
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
const profile = json(PROFILE);
const registry = json(REGISTRY);
const holds = json(HOLDS);
const memo = json(MEMO);
const witnesses = json(WITNESSES);

const rows = Array.isArray(registry) ? registry : (registry.routes ?? Object.values(registry).find(Array.isArray) ?? []);
const row = rows.find((r) => r?.pathwayKey === PATHWAY_KEY);
const pathway = (profile.pathways ?? []).find((p) => p.id === PATHWAY_ID);
const track = (memo.tracks ?? []).find((t) => t.trackId === TRACK_ID);
const witness = (witnesses.witnesses ?? []).find((w) => w?.pathwayKey === PATHWAY_KEY);

console.log('ND § 19-03.1-23(9) — vehicle determination and two-year condition\n');

// ---------------------------------------------------------------------------
console.log('1. the route this record is about is still current');
ok('the factory-v2 registry still carries the route', Boolean(row));
ok('the registry row still resolves through factory v2', row?.factoryV2Resolves === true, row?.factoryV2Resolves);
ok('the registry row still names this memo track', (row?.registryTrackIds ?? []).includes(TRACK_ID), row?.registryTrackIds);
ok('no maintenance hold names this route', !JSON.stringify(holds).includes(PATHWAY_ID));
ok('the compiled North Dakota profile still carries the pathway', Boolean(pathway));
ok('the memo track is still in force (no effectiveTo)', track?.effectiveDates?.effectiveTo === null, track?.effectiveDates?.effectiveTo);
ok('the record states it checked currency before determining anything', record.supersessionCheckedFirst?.routeIsCurrent === true);

// ---------------------------------------------------------------------------
console.log('\n2. the route is not absorbed by its two North Dakota neighbours');
ok('the record names the ch. 12-55.1 summary pardon as a separate route',
  Boolean(record.supersessionCheckedFirst?.notSupersededBy?.['ND:marijuana-specific-summary-pardon-or-sealing-relief']));
ok('the record names ch. 12-60.1 general sealing as a separate route',
  Boolean(record.supersessionCheckedFirst?.notSupersededBy?.['ND:general-conviction-sealing-under-n-d-c-c-chapter-12-60-1']));
ok('the compiled profile still carries all three as distinct pathways',
  ['first-offense-possession-sealing',
   'marijuana-specific-summary-pardon-or-sealing-relief',
   'general-conviction-sealing-under-n-d-c-c-chapter-12-60-1']
    .every((id) => (profile.pathways ?? []).some((p) => p.id === id)));

// ---------------------------------------------------------------------------
console.log('\n3. the vehicle determination rests on a source this repository holds');
ok('the determination is a composed pleading', record.vehicleDetermination?.vehicle === 'custom_pleading', record.vehicleDetermination?.vehicle);
ok('the memo agrees the output strategy is a composed pleading', track?.outputStrategy === 'custom_pleading', track?.outputStrategy);
ok('the registry row binds no official form for this route', (row?.officialFormIds ?? []).length === 0, row?.officialFormIds);
const dui = json(DUI_RECORD);
ok('the quoted Self Help Center source is the one the DUI record bound',
  record.vehicleDetermination?.sourceThisRestsOn?.sha256 === dui.sourceRead?.sha256,
  record.vehicleDetermination?.sourceThisRestsOn?.sha256);
ok('the quoted no-forms statement is present verbatim in that bound record',
  JSON.stringify(dui).includes(record.vehicleDetermination.sourceThisRestsOn.quote));
ok('the quoted draft-your-own statement is present verbatim in that bound record',
  JSON.stringify(dui).includes(record.vehicleDetermination.sourceThisRestsOn.andAlso));
ok('the determination states its own scope limit rather than asserting a statewide negative',
  /does not establish that no prescribed form exists anywhere/i.test(record.vehicleDetermination?.whatThisDoesNotClaim ?? ''));
ok('the determination yields to a local court form if one is later found',
  /yields to it/i.test(record.vehicleDetermination?.whatThisDoesNotClaim ?? ''));

// ---------------------------------------------------------------------------
console.log('\n4. the two-year anchor is not silently answered anywhere');
ok('the memo still records the anchor as an open question',
  (track?.unresolvedQuestions ?? []).some((q) => /two-year period has no anchor/i.test(q.question ?? '')));
ok('the memo still classifies it as requiring counsel',
  (track?.unresolvedQuestions ?? []).some((q) => q.provenance?.classificationBasis === 'counsel_confirmation_required'));
ok('this record declines to pick an anchor', record.theTwoYearCondition?.notResolvedHere !== undefined
  && /does not pick an anchor/i.test(record.theTwoYearCondition.notResolvedHere));
// No record in the legal-decisions corpus may assert an anchor for this period.
const ANCHOR_CLAIM = /two[- ]year period (runs|is measured|is anchored)|anchor (is|=) (the )?(judgment|further violation)/i;
const decisionsDir = 'data/record-clearing/legal-decisions';
const claimants = readdirSync(decisionsDir)
  .filter((f) => f.endsWith('.json'))
  .filter((f) => {
    const text = readFileSync(`${decisionsDir}/${f}`, 'utf8');
    return text.includes('19-03.1-23(9)') && ANCHOR_CLAIM.test(text);
  });
ok('no legal-decision record asserts an anchor for the subsection\'s two-year period', claimants.length === 0, claimants);

// ---------------------------------------------------------------------------
// These two payment assertions are state assertions about THIS RECORD's own
// claim, not a freeze of the defect. The record says in terms that the route
// remains non-selling. If the route is legitimately opened later -- counsel
// answers the anchor, the pool is scoped, a Grade-A fulfillment record is
// created -- then this record's status statement has stopped describing
// reality, and the correct repair is to supersede the record, not to delete
// the check that noticed.
console.log('\n5. the unexecuted condition produces a refusal, not an answer');
ok('the public-witness ledger still carries this route', Boolean(witness));
ok('the evaluator does not allow payment on this route', witness?.terminalEvaluation?.paymentAllowed === false,
  witness?.terminalEvaluation?.paymentAllowed);
ok('the registry row agrees payment is not allowed at the evaluator',
  row?.separateGates?.paymentAllowedAtTheEvaluator === false, row?.separateGates?.paymentAllowedAtTheEvaluator);
ok('the record reports the measured terminal result rather than asserting one',
  record.theTwoYearCondition?.measurement?.terminalResultCode === witness?.terminalEvaluation?.resultCode,
  [record.theTwoYearCondition?.measurement?.terminalResultCode, witness?.terminalEvaluation?.resultCode]);
ok('the record reports the measured reason codes',
  JSON.stringify(record.theTwoYearCondition?.measurement?.terminalReasonCodes)
    === JSON.stringify(witness?.terminalEvaluation?.reasonCodes),
  [record.theTwoYearCondition?.measurement?.terminalReasonCodes, witness?.terminalEvaluation?.reasonCodes]);

// ---------------------------------------------------------------------------
// The live invariant. Not "the pool must stay contaminated" — that would freeze
// the defect. Either the pool is scoped to this statute, or the route does not
// sell. Only the dangerous combination fails.
console.log('\n6. a foreign statute\'s waiting period cannot reach a selling route');
const DURATION = /\b(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s*(day|days|month|months|year|years|yr|yrs)\b/gi;
const WORDS = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };
const normalize = (m) => {
  const [, value, unit] = /^(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s*(\w+)$/i.exec(m.trim()) ?? [];
  if (!value) return null;
  const n = /^\d+$/.test(value) ? Number(value) : WORDS[value.toLowerCase()];
  const u = /^day/i.test(unit) ? 'days' : /^month/i.test(unit) ? 'months' : 'years';
  return `${n} ${u}`;
};
const poolDurations = new Set();
for (const rule of pathway?.waitingRules ?? []) {
  for (const m of String(rule).match(DURATION) ?? []) {
    const d = normalize(m);
    if (d) poolDurations.add(d);
  }
}
const OWN_PERIOD = '2 years';
const foreign = [...poolDurations].filter((d) => d !== OWN_PERIOD).sort();
const poolIsScoped = foreign.length === 0;
const routeSells = witness?.terminalEvaluation?.paymentAllowed === true
  || row?.separateGates?.paymentAllowedAtTheEvaluator === true;
ok('the pathway\'s waiting-rule pool is scoped to its own statute, or the route does not sell',
  poolIsScoped || !routeSells,
  { foreignDurations: foreign, routeSells });
console.log(poolIsScoped
  ? '            (the pool is scoped; the hazard this record named is closed)'
  : `            (the pool still carries ${foreign.length} foreign duration(s): ${foreign.join(', ')}; the route does not sell, so the hazard is contained, not closed)`);
ok('the record names each foreign duration currently in the pool, so a repairer is warned',
  foreign.every((d) => {
    const n = d.split(' ')[0];
    return (record.theHazardThisRecordExistsToName?.foreignDurationsInThisRoutesOwnPool ?? [])
      .some((e) => new RegExp(`\\b${n}\\b`).test(e.duration));
  }),
  foreign);
ok('the record states the repair order rather than leaving it to inference',
  /scope the pathway's rule set to its own statute/i.test(record.theHazardThisRecordExistsToName?.whatMustNotHappen ?? ''));

// ---------------------------------------------------------------------------
console.log('\n7. the record opens nothing');
for (const [field, expected] of [
  ['isCounselApproval', false], ['createsOutputApproval', false], ['createsTerminalStatus', false],
  ['productionTouched', false], ['commercialRoutesOpened', 0], ['opensAnyRoute', false], ['productionAuthorized', false]
]) ok(`${field} is ${JSON.stringify(expected)}`, record[field] === expected, record[field]);
ok('the record states the route remains incomplete and non-selling',
  /remains INCOMPLETE and remains non-selling/.test(record.statusOfThisRecord?.readThisFirst ?? ''));
ok('the record does not claim the Grade-A blocker is closed', record.statusOfThisRecord?.gradeABlockerClosed === 'NO');
ok('the record does not claim the source is bound into Grade-A authority',
  record.statusOfThisRecord?.sourceBoundIntoGradeAAuthority === 'NO');

console.log(`\n${checks - failures}/${checks} checks passed`);
if (failures) { console.error(`${failures} check(s) failed`); process.exit(1); }
