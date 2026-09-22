#!/usr/bin/env node
// Guard for ND:first-offense-possession-sealing — the route's eligibility is
// governed by N.D.C.C. § 19-03.1-23(9) and not by North Dakota's other sealing
// or pardon criteria.
//
// The finding this guards is mostly a PASS: the packet specification already
// fences the route, and route selection was measured correct. So the checks are
// written to catch the reversal rather than to freeze the present state.
//
//   Check 2 protects the fence itself. The specification's doNotImport says the
//   chapter 12-60.1 three- and five-year clean periods and the summary pardon's
//   five-year condition do not govern this route. If that text is ever softened,
//   the route loses the only place it is stated.
//
//   Check 4 runs the real evaluator over the eight required cases. It asserts
//   route identity and commercial state, not a result code, because a result
//   code legitimately moves as the profile gains questions.
//
//   Check 5 is the open defect, and it is a disjunction rather than a demand:
//   either this route's deciding-fact set no longer carries the other routes'
//   waiting rules, or the specification still says they must not be applied.
//   It fails only if the contamination survives while the fence is removed.

import { readFileSync } from 'node:fs';
import { register } from 'node:module';
register('./lib/ts-esm-loader.mjs', import.meta.url);
const { evaluateScreening } = await import('../src/lib/rcap-engine/evaluator.ts');
const { getProfileByJurisdiction } = await import('../src/lib/rcap-engine/profile-registry.ts');
const { routeDecidingFactIds } = await import('../src/lib/rcap-engine/route-fact-relevance.ts');

const SPEC = 'data/record-clearing/packet-specifications/ND-first-offense-possession-sealing.v1.json';
const RECORD = 'data/record-clearing/legal-decisions/2026-09-22-nd-first-offense-possession-rule-scope.json';
const PID = 'first-offense-possession-sealing';
const GENERAL = 'general-conviction-sealing-under-n-d-c-c-chapter-12-60-1';
const PARDON = 'marijuana-specific-summary-pardon-or-sealing-relief';

const json = (p) => JSON.parse(readFileSync(p, 'utf8'));
let checks = 0;
let failures = 0;
const ok = (label, condition, detail) => {
  checks += 1;
  if (condition) { console.log(`  ok        ${label}`); return; }
  failures += 1;
  console.log(`  FAILED    ${label}${detail === undefined ? '' : ` — observed ${JSON.stringify(detail)}`}`);
};

const spec = json(SPEC);
const record = json(RECORD);
const profile = getProfileByJurisdiction('ND');
const pathway = (id) => profile.pathways.find((p) => p.id === id);

console.log('ND first-offense possession sealing — scoped to § 19-03.1-23(9)\n');

// ---------------------------------------------------------------------------
console.log('1. the route identity and crosswalk are unchanged');
ok('the specification still binds the exact route', spec.routeKey === 'ND:first-offense-possession-sealing',
  spec.routeKey);
ok('the compiled pathway id is unchanged', spec.pathwayId === PID, spec.pathwayId);
ok('the registry counterpart track is unchanged', spec.trackId === 'nd-marijuana-first-offense-seal',
  spec.trackId);
ok('the compiled profile still carries the pathway', Boolean(pathway(PID)));
ok('the two routes it must not become are still separate pathways',
  Boolean(pathway(GENERAL)) && Boolean(pathway(PARDON)));

// ---------------------------------------------------------------------------
console.log('\n2. the statutory elements govern, and the imports are fenced off');
const authority = spec.statutoryAuthority ?? {};
ok('relief is still recorded as mandatory on motion, not discretionary',
  authority.reliefIsMandatoryOnMotion === true, authority.reliefIsMandatoryOnMotion);
const rule = String(authority.ruleStatement ?? '');
for (const [element, pattern] of [
  ['guilty plea or finding of guilt', /pleads guilty or is found guilty/],
  ['first offence', /first offense/],
  ['one ounce or less of marijuana', /one ounce or less of marijuana/],
  ['two grams or less of THC', /two grams or less of THC/],
  ['judgment entered', /judgment is entered/],
  ['on motion', /on motion/],
  ['the court must seal', /must seal the court record/],
  ['the two-year subsequent-conviction condition', /not subsequently convicted within two years/],
  ['sealed record may not be reopened', /may not be opened even by court order/]
]) ok(`the rule statement still carries ${element}`, pattern.test(rule));
const doNotImport = (authority.doNotImport ?? []).join(' ');
ok('chapter 12-60.1 clean periods are still fenced out',
  /three- and five-year clean periods/.test(doNotImport) && /do not govern this route/.test(doNotImport));
ok('the 12-60.1 burden and hearing floor are still fenced out',
  /clear-and-convincing burden/.test(doNotImport) && /forty-five-day hearing floor/.test(doNotImport));
ok('the summary pardon five-year condition is still fenced out',
  /five-year condition must never be applied here/.test(doNotImport));
ok('the summary pardon is still described as a separate remedy, not merged',
  /separate remedy administered by the Pardon Advisory Board/.test(doNotImport));
ok('the route still carries its own statutory facts',
  ['nd_charged_quantity', 'nd_first_offense_confirmation']
    .every((f) => (spec.requiredFacts ?? []).some((x) => x.factId === f)),
  (spec.requiredFacts ?? []).map((f) => f.factId).filter((f) => f.startsWith('nd_')));
ok('first offence is not recorded as a generic clean-record requirement',
  !(spec.requiredFacts ?? []).some((f) => /clean_record|no_prior_convictions/.test(f.factId)));

// ---------------------------------------------------------------------------
console.log('\n3. the two neighbouring routes were not altered or merged');
ok('the general sealing pathway still cites chapter 12-60.1',
  /12-60\.1/.test(pathway(GENERAL)?.id ?? '') || /12-60\.1/.test(pathway(GENERAL)?.label ?? ''));
ok('the summary pardon pathway is still its own pathway',
  pathway(PARDON)?.id === PARDON && pathway(PARDON)?.id !== PID);
ok('this route does not claim the pardon remedy',
  !/summary pardon/i.test(String(spec.statutoryAuthority?.primary ?? '')));
ok('the record states no neighbouring route was changed',
  /[Nn]o rule, question or binding on any other North Dakota route was changed/
    .test(record.whatThisRecordDoesNotDo?.noAdjacentRouteChanged ?? ''));

// ---------------------------------------------------------------------------
// The eight cases, run through the real evaluator.
console.log('\n4. the eight required cases, measured through the real evaluator');
const CTX = {
  first: 'First-offense possession sealing',
  general: 'General conviction sealing under N.D.C.C. chapter 12-60.1',
  pardon: 'Marijuana-specific summary-pardon or sealing relief'
};
const run = (ctx, caseOutcome, offenseLevel) => evaluateScreening({
  jurisdiction: 'ND',
  profileVersion: profile.profileVersion,
  answers: {
    ownership_scope: 'Yes',
    jurisdiction_scope: 'State or local',
    possible_pathway_context: ctx,
    case_outcome: caseOutcome,
    offense_level: offenseLevel
  }
});
const CASES = [
  ['1 qualifying first offence, marijuana', CTX.first, 'Misdemeanor conviction', 'Misdemeanor', PID],
  ['2 qualifying first offence, THC', CTX.first, 'Other conviction or adjudication', 'Misdemeanor', PID],
  ['3 amount above threshold', CTX.first, 'Felony conviction', 'Felony', PID],
  ['4 not a first offence', CTX.first, 'Misdemeanor conviction', 'Misdemeanor', PID],
  ['5 later ch. 19-03.1 conviction inside two years', CTX.first, 'Other conviction or adjudication', 'Misdemeanor', PID],
  ['6 no judgment of guilt', CTX.first, 'Dismissed, no-billed, nolle prosequi, or not prosecuted', 'Misdemeanor', PID],
  ['7 general chapter 12-60.1 case', CTX.general, 'Felony conviction', 'Felony', GENERAL],
  ['8 summary-pardon facts', CTX.pardon, 'Misdemeanor conviction', 'Misdemeanor', PARDON]
];
for (const [label, ctx, outcome, level, expected] of CASES) {
  let result = null;
  try { result = run(ctx, outcome, level); } catch (error) { result = { error: String(error.message) }; }
  ok(`${label}: resolves to its own route`, result?.pathwayId === expected,
    { pathwayId: result?.pathwayId, error: result?.error });
  ok(`${label}: nothing is sellable on it today`, result?.paymentAllowed === false, result?.paymentAllowed);
}
// Cases 3 to 6 turn on facts the profile cannot ask. That is the finding, not a pass.
const questionIds = new Set(profile.questions.map((q) => q.id));
for (const fact of ['nd_charged_quantity', 'nd_first_offense_confirmation']) {
  ok(`the screening profile still cannot ask ${fact}, which is why cases 3-6 cannot be distinguished`,
    !questionIds.has(fact));
}
ok('the record says so rather than claiming those cases pass',
  /cannot distinguish cases 3 to 6/.test(record.part3_whatTheEvaluatorActuallyDoes?.theHonestLimit ?? ''));

// ---------------------------------------------------------------------------
// The open defect. A disjunction, not a demand that the shared mechanic change.
console.log('\n5. other routes\' waiting rules are out of this route\'s deciding set, or the fence still stands');
const deciding = routeDecidingFactIds(profile, pathway(PID));
const asText = [...deciding].join(' || ');
const imported = [
  ['chapter 12-60.1 three-year misdemeanour wait', /no new conviction for at least 3 years/],
  ['chapter 12-60.1 five-year felony wait', /no new conviction for at least 5 years/],
  ['summary pardon five-year clean record', /no convictions in past five years/],
  ['DUI seven-year clean period', /within 7 years/],
  ['the forty-five-day hearing floor', /earlier than 45 days after the petition/]
].filter(([, pattern]) => pattern.test(asText)).map(([name]) => name);
ok('no other route\'s waiting rule reaches this route\'s deciding set, or the specification still forbids applying it',
  imported.length === 0 || /do not govern this route/.test(doNotImport),
  { imported });
console.log(imported.length === 0
  ? '            (deciding set is clean; the shared sweep has been scoped)'
  : `            (still imported: ${imported.length}; the specification fence is what keeps them out of the packet)`);
ok('the record measured the contamination rather than asserting it',
  /46 of 52/.test(record.part4_theOpenDefect?.measured ?? ''));
ok('the record routes the mechanic to the engineering lane',
  /shared engine mechanic/.test(record.part4_theOpenDefect?.whoOwnsIt ?? ''));
ok('the record does not claim a live mis-sale',
  /[Nn]othing is mis-sold today/.test(record.part4_theOpenDefect?.exposure ?? ''));

// ---------------------------------------------------------------------------
console.log('\n6. the record changed nothing and opened nothing');
ok('no compiled profile rule was edited',
  /No compiled rule, question or waiting rule was edited/.test(record.whatThisRecordDoesNotDo?.noRuleEdited ?? ''));
ok('no filing procedure was removed for want of a statutory mention',
  /procedural filing requirement/.test(record.whatThisRecordDoesNotDo?.noProcedureRemoved ?? ''));
ok('no official form or filing vehicle was invented',
  /no official form/i.test(record.whatThisRecordDoesNotDo?.noFormInvented ?? ''));
ok('state changed is none', record.statusOfThisRecord?.stateChanged === 'none');
for (const [field, expected] of [
  ['isCounselApproval', false], ['createsOutputApproval', false], ['createsTerminalStatus', false],
  ['productionTouched', false], ['commercialRoutesOpened', 0], ['opensAnyRoute', false], ['productionAuthorized', false]
]) ok(`${field} is ${JSON.stringify(expected)}`, record[field] === expected, record[field]);

console.log(`\n${checks - failures}/${checks} checks passed`);
if (failures) { console.error(`${failures} check(s) failed`); process.exit(1); }
