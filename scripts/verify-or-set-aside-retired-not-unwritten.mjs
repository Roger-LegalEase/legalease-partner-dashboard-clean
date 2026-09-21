#!/usr/bin/env node
// Guard for OR-SET-ASIDE-WITHOUT-CONVICTION-IS-RETIRED-NOT-UNWRITTEN-2026-09-21.
//
// The determination is that four empty process_guidance components are empty
// because their specification is retired, not because guidance is missing. The
// guard therefore has to protect against the repair, not just the defect: the
// dangerous move is someone reading those empty components as a content gap and
// filling them, which is what this lane nearly did.
//
// So check 2 is a disjunction: either the specification is no longer retired
// (the owner reopened it, in which case authored sections are legitimate), or
// it is still retired AND still carries no authored sections. That passes
// today, passes if the retirement is ever lifted, and fails exactly on a
// retired specification someone has started writing into.
//
// Check 4 protects the thing that would have been wrong on the merits. The
// Oregon memo's or_acquittal track says the prosecuting attorney has 120 days
// to object. Counsel later bound the opposite for these routes: the 120-day
// window is the (1)(a) conviction track's rule. The check is that no (1)(c) or
// (1)(d) guidance states it as the ordinary rule. It is not a freeze on the
// sentence counsel wrote; it is a freeze on the contradiction.
//
// Check 5 is the live finding, and it is deliberately NOT a demand that the
// registry be changed: registering a route is a route change this record does
// not authorize. It is a disjunction that fails only if the retired row becomes
// sellable while still pointing at a retired specification.

import { readFileSync } from 'node:fs';

const RECORD = 'data/record-clearing/legal-decisions/2026-09-21-or-set-aside-without-conviction-is-retired-not-unwritten.json';
const RETIRED = 'data/record-clearing/packet-specifications/OR-set-aside-without-conviction.v1.json';
const SUCCESSOR = 'data/record-clearing/packet-specifications/OR-disposition-configurations.v1.json';
const MEMO = 'data/record-clearing/legal-design-intake/OR.memo.json';
const REGISTRY = 'data/record-clearing/factory-v2-route-registry.json';
const RETIRED_ROUTE = 'OR:set-aside-of-arrests-or-charges-without-conviction-under-ors-137-225-1-c';

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
const retired = json(RETIRED);
const successor = json(SUCCESSOR);
const memo = json(MEMO);
const registryRaw = json(REGISTRY);
const rows = Array.isArray(registryRaw)
  ? registryRaw
  : (registryRaw.routes ?? Object.values(registryRaw).find(Array.isArray) ?? []);

console.log('Oregon set-aside without conviction — retired, not unwritten\n');

// ---------------------------------------------------------------------------
// These are identity facts, not status facts. They stay true whether or not the
// retirement is ever lifted, so asserting them here does not freeze the
// retirement in place — that question belongs to check 2's disjunction alone.
// An earlier draft asserted historical_only here and would have failed the
// moment an owner legitimately reopened the route; the mutation pass caught it.
console.log('1. the supersession this record read is still on the record');
ok('the supersession is still recorded at all', Boolean(retired.supersededBy),
  retired.supersededBy === undefined ? 'absent' : undefined);
ok('it still names the successor specification',
  retired.supersededBy?.by === SUCCESSOR, retired.supersededBy?.by);
ok('it still names the three replacement configurations',
  JSON.stringify(retired.supersededBy?.configurations)
    === JSON.stringify(['or-never-charged-137-225-1-c', 'or-acquittal-137-225-1-d', 'or-ordinary-dismissal-137-225-1-d']),
  retired.supersededBy?.configurations);
ok('the owner\'s reason is still the overbroad-route reason',
  /found this route overbroad/.test(retired.supersededBy?.why ?? ''));
ok('it still says the six sections are bound on the replacement, not here',
  /bound on the three configurations that replaced this route/
    .test(retired.supersededBy?.theSixSectionsAreBoundOnTheReplacement ?? ''));

// ---------------------------------------------------------------------------
// The live invariant. Not a freeze: lifting the retirement satisfies it.
console.log('\n2. nobody is writing guidance into a retired specification');
const stillRetired = retired.supersededBy?.status === 'historical_only';
const authored = (retired.documents ?? []).filter((d) => (d.sections ?? []).length > 0);
ok('the specification has been un-retired, or it still carries no authored sections',
  !stillRetired || authored.length === 0,
  { stillRetired, authoredComponents: authored.map((d) => d.documentId) });
console.log(stillRetired
  ? '            (still retired; empty components are the correct state)'
  : '            (no longer retired; authored sections are legitimate again)');
ok('its four guidance components are still the ones this record measured',
  ['or_acquittal-fingerprint-step-3', 'or_acquittal-service-instructions-4',
    'or_acquittal-objection-and-hearing-instructions-6', 'or_acquittal-post-order-verification-7']
    .every((id) => (retired.documents ?? []).some((d) => d.documentId === id)));
ok('it still composes nothing', !stillRetired || retired.legalSectionsBound === false,
  retired.legalSectionsBound);
ok('the record states the emptiness is correct rather than a gap',
  /are not a content gap/.test(record.readThisFirst ?? ''));
ok('the scoping error is recorded as mine rather than smoothed over',
  /Mine\./.test(record.howThisWasScoped?.whoseError ?? ''));

// ---------------------------------------------------------------------------
console.log('\n3. the successor still carries what the retired route lacks');
const configs = successor.configurations ?? [];
ok('there are still three governed configurations', configs.length === 3, configs.length);
ok('every one still has its legal sections bound',
  configs.every((c) => c.legalSectionsBound === true && (c.unboundLegalSections ?? []).length === 0),
  configs.map((c) => [c.routeKey, c.legalSectionsBound, c.unboundLegalSections]));
for (const section of ['filingDestination', 'feeAndWaiver', 'serviceAndNotice',
  'copyRequirements', 'postFilingTimeline', 'hearingAndObjectionStops']) {
  ok(`every configuration still carries a bound ${section}`,
    configs.every((c) => typeof c.legalSections?.[section]?.statement === 'string'
      && c.legalSections[section].statement.length > 20),
    configs.map((c) => c.legalSections?.[section]?.statement?.slice(0, 30)));
}
ok('they were bound by counsel, not by a generator',
  configs.every((c) => /counsel/i.test(c.legalSections?.boundBy ?? '')),
  configs.map((c) => c.legalSections?.boundBy));
ok('the three configurations still carry distinct statutory authority',
  new Set(configs.map((c) => `${c.routeKey}|${c.statutoryAuthority}`)).size === 3,
  configs.map((c) => [c.routeKey, c.statutoryAuthority]));
ok('the route-design decision still opens nothing',
  successor.commerciallyEligible === 0 && successor.completePacketProven === 0
  && configs.every((c) => c.commercialStatus === 'closed'),
  { commerciallyEligible: successor.commerciallyEligible, completePacketProven: successor.completePacketProven });

// ---------------------------------------------------------------------------
// The contradiction guard. What the memo says is build input; what counsel
// bound governs. This must fail if the memo's rule is ever printed as the rule
// for these routes.
console.log('\n4. the 120-day objection diary is not stated as the rule for (1)(c) or (1)(d)');
const acquittalTrack = (memo.tracks ?? []).find((t) => t.trackId === 'or_acquittal');
const objectionNote = (acquittalTrack?.components ?? [])
  .find((c) => c.role === 'objection_and_hearing_instructions')?.notes ?? '';
ok('the memo note this record quotes is still there, so the contradiction is real',
  /120 days from the date the motion was filed to object/.test(objectionNote));
ok('counsel\'s binding still says the 120-day window is the (1)(a) track\'s rule',
  configs.every((c) => /not applied as the ordinary rule for a motion under paragraph \(1\)\(c\) or \(1\)\(d\)/
    .test(c.legalSections?.hearingAndObjectionStops?.statement ?? '')),
  configs.map((c) => c.legalSections?.hearingAndObjectionStops?.statement?.slice(0, 60)));
const guidanceText = JSON.stringify((retired.documents ?? []).map((d) => d.sections ?? []));
ok('no guidance authored on the retired route states the 120-day rule',
  !/120[ -]day|120 days/.test(guidanceText), guidanceText.slice(0, 120));
ok('the record explains why writing from the memo would have been wrong',
  /would have told a participant to wait out a 120-day objection diary/
    .test(record.part3_writingTheGuidanceWouldHaveBeenWrongTwice?.consequence ?? ''));
ok('the record states the general rule it learned',
  /counsel's binding governs/.test(record.part3_writingTheGuidanceWouldHaveBeenWrongTwice?.theLesson ?? ''));

// ---------------------------------------------------------------------------
// The live finding. Deliberately not a demand that the registry change.
console.log('\n5. the retired route is not sellable while it points at a retired specification');
const row = rows.find((r) => r?.pathwayKey === RETIRED_ROUTE);
ok('the registry still carries the retired route key', Boolean(row));
const successorKeys = configs.map((c) => c.routeKey);
const registered = successorKeys.filter((k) => rows.some((r) => r?.pathwayKey === k));
ok('every successor route is registered, or the retired row is still non-selling',
  registered.length === successorKeys.length || row?.separateGates?.paymentAllowedAtTheEvaluator === false,
  { registeredSuccessors: registered, paymentAllowed: row?.separateGates?.paymentAllowedAtTheEvaluator });
console.log(registered.length === successorKeys.length
  ? '            (successors registered; the retired row is no longer the only door)'
  : '            (successors unregistered; the retired row stays non-selling, which is correct)');
ok('the record names the wrong blocker id rather than silently accepting it',
  /packet_spec_incomplete reads as work outstanding on this specification/
    .test(record.part5_whatIsActuallyStillWrong?.whyThatMatters ?? ''));
ok('the record states there is no commercial exposure',
  /None commercially/.test(record.part5_whatIsActuallyStillWrong?.exposure ?? ''));
ok('the record refuses to make the route change itself',
  /is a route change and is not authorized by this record/
    .test(record.part5_whatIsActuallyStillWrong?.whatThisRecordDoesNotDo ?? ''));

// ---------------------------------------------------------------------------
console.log('\n6. no adjacent Oregon route was opened and nothing was authored');
const orRows = rows.filter((r) => String(r?.pathwayKey ?? '').startsWith('OR:'));
ok('the other Oregon rows are still there, untouched and distinct',
  orRows.some((r) => /marijuana-specific-set-aside/.test(r.pathwayKey))
  && orRows.some((r) => /set-aside-of-eligible-convictions/.test(r.pathwayKey)),
  orRows.map((r) => r.pathwayKey));
ok('the record says a shared state name is not a reason to open them',
  /That is not a reason to open the other two/.test(record.whatThisRecordDoesNotDo?.noAdjacentRouteOpened ?? ''));
ok('no section was authored anywhere', record.whatThisRecordDoesNotDo?.noGuidanceWritten
  === 'No section was authored on the retired specification or on any successor configuration.');
ok('no route was changed',
  /No route key, gate, blocker id or registry row was modified/
    .test(record.whatThisRecordDoesNotDo?.noRouteChanged ?? ''));
ok('state changed is none', record.statusOfThisRecord?.stateChanged === 'none');
for (const [field, expected] of [
  ['isCounselApproval', false], ['createsOutputApproval', false], ['createsTerminalStatus', false],
  ['productionTouched', false], ['commercialRoutesOpened', 0], ['opensAnyRoute', false], ['productionAuthorized', false]
]) ok(`${field} is ${JSON.stringify(expected)}`, record[field] === expected, record[field]);

console.log(`\n${checks - failures}/${checks} checks passed`);
if (failures) { console.error(`${failures} check(s) failed`); process.exit(1); }
