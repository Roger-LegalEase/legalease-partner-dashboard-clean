#!/usr/bin/env node
// Guard for CT-54-142A-F-2-FILING-VEHICLE-UNRESOLVED-2026-09-21.
//
// The determination is negative on one point and open on another: JD-CR-202 is
// not the § 54-142a(f)(2) vehicle, and no source read here establishes what is.
// A guard for a negative finding has to protect against two opposite moves.
//
//   Check 2 is the one that must not be a freeze. The vehicle question SHOULD
//   be resolvable later, so the invariant is a disjunction: either the (f)(2)
//   branch now names a vehicle AND something other than this record establishes
//   it, or the branch is still recorded unavailable. It fails on the dangerous
//   middle -- a vehicle asserted while the branch's own record still says the
//   form is unresolved.
//
//   Check 3 protects the negative finding itself, and it does so against the
//   retained form's actual bytes rather than against a sentence about them. If
//   JD-CR-202 is ever reissued without the Clean Slate limitation, or with a
//   field for the petitioner's age at the offence, the reasoning here changes
//   and this must stop passing silently.
//
// Check 5 records the routing defect without demanding a fix: rule-08 is on a
// selling route and editing it is a route change this lane did not make. The
// invariant is that the unqualified rule cannot quietly become the only
// statement of the JD-CR-202 condition -- its qualified sibling must survive.

import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';

const RECORD = 'data/record-clearing/legal-decisions/2026-09-21-ct-54-142a-f-2-filing-vehicle-unresolved.json';
const PROFILE = 'src/lib/rcap-engine/compiled/profiles/CT-connecticut.json';
const ADOPTION = 'data/rcap-grade-a/legal-decisions/BATCH_ADOPTION_PACKAGE_2026-09-02.json';
const SPEC = 'data/record-clearing/packet-specifications/'
  + 'CT-petitioned-clean-slate-erasure-for-eligible-pre-2000-convictions-jd-cr-202.v1.json';
const FORM = '/home/user/legalease-partner-dashboard-clean/private/source-imports/'
  + 'Expungement_AI_RCAP_Master_Library_Edition_1/STATES/CT/02_PACKET_FORMS/'
  + 'CT__FORM__JD-CR-202__petition-for-clean-slate-erasure-convictions-before-1-1-2000__REV-2023-11__EN.pdf';
const FORM_SHA = 'b5a917c2cd07727172a50534a4884a63e8ae08704b631c62a199c3454623062c';
const PETITION_UNIT = 'obligation:unit:CT:ct-under18-misdemeanor:ct-under18-misdemeanor-branch-petition';
const AUTOMATIC_UNIT = 'obligation:unit:CT:ct-under18-misdemeanor:ct-under18-misdemeanor-branch-automatic';

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
const profileText = JSON.stringify(profile);
const adoptionText = JSON.stringify(json(ADOPTION));
const units = [];
(function walk(node) {
  if (Array.isArray(node)) { node.forEach(walk); return; }
  if (node && typeof node === 'object') {
    if (typeof node.obligationRouteKey === 'string'
      && node.obligationRouteKey.includes('ct-under18-misdemeanor')) units.push(node);
    Object.values(node).forEach(walk);
  }
}(json(ADOPTION)));
const petition = units.find((u) => u.obligationRouteKey === PETITION_UNIT);
const automatic = units.find((u) => u.obligationRouteKey === AUTOMATIC_UNIT);

console.log('Connecticut § 54-142a(f)(2) — the filing vehicle\n');

// ---------------------------------------------------------------------------
console.log('1. the two branches of subsection (f) are still modelled separately');
ok('the automatic branch unit still exists', Boolean(automatic));
ok('the petition branch unit still exists', Boolean(petition));
ok('they are distinct obligation units', automatic?.obligationRouteKey !== petition?.obligationRouteKey);
ok('the record states the automatic strategy does not carry over',
  /automatic branch's settled strategy does not carry over/.test(record.part1_theStatutoryBranch?.subsectionFHasTwoBranches ?? ''));
ok('the record keeps the branches uncollapsed',
  /remain separate/.test(record.whatThisRecordDoesNotDo?.noBranchCollapsed ?? ''));

// ---------------------------------------------------------------------------
// The live invariant. Not a freeze: establishing a vehicle satisfies it.
console.log('\n2. no vehicle is asserted for (f)(2) while its own record says none is established');
const disposition = String(petition?.currentServiceDisposition ?? '');
const stillUnavailable = disposition.startsWith('unit_unavailable');
const claimsAVehicle = !stillUnavailable
  || Boolean(petition?.runtimeRouteId) || Boolean(petition?.runtimePathwayId);
ok('the petition branch is still recorded unavailable, or it no longer claims the form is unresolved',
  stillUnavailable || !/form or accepted custom pleading is unresolved/.test(disposition),
  { disposition: disposition.slice(0, 90), runtimeRouteId: petition?.runtimeRouteId });
console.log(stillUnavailable
  ? '            (still unavailable; the vehicle question is open and the branch is blocked)'
  : '            (no longer unavailable; a vehicle may now be recorded from its source)');
ok('the branch is wired to no runtime route while unavailable',
  !stillUnavailable || (petition?.runtimeRouteId === null && petition?.runtimePathwayId === null),
  { runtimeRouteId: petition?.runtimeRouteId, runtimePathwayId: petition?.runtimePathwayId });
ok('the record answers the vehicle question UNRESOLVED rather than guessing',
  record.answer?.vehicle === 'UNRESOLVED', record.answer?.vehicle);
ok('and answers the JD-CR-202 question NO rather than deferring both',
  record.answer?.jdCr202Applicable === 'NO', record.answer?.jdCr202Applicable);
ok('no custom pleading was fabricated',
  /No custom petition was drafted or authorised/.test(record.whatThisRecordDoesNotDo?.noCustomPleadingFabricated ?? ''));
ok('all four candidate answers were tested and none established',
  (record.part4_whatWasSearchedForAndNotFound?.theFourPossibleAnswers ?? []).length === 4
  && (record.part4_whatWasSearchedForAndNotFound?.theFourPossibleAnswers ?? [])
    .every((a) => /NOT established/.test(a)));

// ---------------------------------------------------------------------------
// The negative finding rests on the form's own bytes, so check the bytes.
console.log('\n3. the form still says what this determination read it saying');
ok('the retained JD-CR-202 binary is still present', existsSync(FORM));
const actualSha = existsSync(FORM) ? createHash('sha256').update(readFileSync(FORM)).digest('hex') : null;
ok('its digest still matches the one this record cites', actualSha === FORM_SHA, actualSha);
ok('the record cites that digest', record.part2_whatTheFormItselfSays?.sha256 === FORM_SHA);
let formText = '';
try { formText = execFileSync('pdftotext', ['-layout', FORM, '-'], { maxBuffer: 32 * 1024 * 1024 }).toString(); }
catch { formText = ''; }
ok('the form text is readable', formText.length > 500, formText.length);
ok('its limiting instruction still restricts it to Clean Slate eligibility',
  /Only use this form[\s\S]{0,200}eligible for erasure under Clean Slate/.test(formText));
ok('it still requires the seven-year misdemeanour waiting period (f)(2) does not impose',
  /not been convicted of any other crimes within 7 years/.test(formText));
ok('it still requires sentence completion (f)(2) does not impose',
  /completed serving the sentence of imprisonment/.test(formText));
ok('it still requires no pending state criminal charges (f)(2) does not impose',
  /do not have any pending state criminal charge/i.test(formText));
ok('it still carries an excluded-offence list (f)(2) does not impose',
  /blocked from erasure/i.test(formText));
ok('it still cites the Clean Slate authority rather than subsection (f)',
  /C\.G\.S\. § 54-142a: P\.A\. 23-134 § 1/.test(formText) && !/54-142a\(f\)/.test(formText));
// The defining element of (f)(2) has nowhere to go on this form. If a revision
// ever adds it, the reasoning here has to be revisited rather than assumed.
ok('it still has no field for the petitioner\'s age at the offence',
  !/under (eighteen|18)/i.test(formText) && !/age at (the time of )?(the )?offen[cs]e/i.test(formText));
ok('the record lists the added requirements it found',
  (record.part3_theLegalDistinctionTested?.addedRequirements ?? []).length === 4);
ok('the record explains why a sworn overstatement is the real harm',
  /put a petitioner under oath to conditions the statute does not require/
    .test(record.part3_theLegalDistinctionTested?.whyThisMattersMoreThanFit ?? ''));

// ---------------------------------------------------------------------------
console.log('\n4. the Clean Slate implementation is correctly scoped and was not disturbed');
for (const needle of ['under eighteen', 'under 18', 'before January 1, 2000', '54-142a(f)']) {
  ok(`the compiled profile still contains no ${JSON.stringify(needle)}`, !profileText.includes(needle));
}
ok('the packet specification is still labelled as the Clean Slate petition',
  existsSync(SPEC) && /Clean Slate/.test(json(SPEC).pathwayLabel ?? ''),
  existsSync(SPEC) ? json(SPEC).pathwayLabel : 'missing');
ok('the record states the profile and specification are correctly scoped',
  /Both are correctly scoped/.test(record.part5_theCurrentImplementation?.theConflictIsNotWhereItWasExpected ?? ''));
ok('no adjacent Connecticut route was reviewed',
  /Cannabis erasure, ordinary post-2000 Clean Slate, pardon routes and unrelated under-eighteen relief were not reviewed/
    .test(record.whatThisRecordDoesNotDo?.noAdjacentCtRouteReviewed ?? ''));

// ---------------------------------------------------------------------------
// The routing finding. Recorded, not repaired: rule-08 sits on a selling route.
console.log('\n5. the unqualified pre-2000 routing rule cannot become the only statement of the rule');
const rules = profile.orderedDecisionRules ?? [];
const rule08 = rules.find((r) => String(r.id).startsWith('rule-08-'));
const qualifiedSiblings = rules.filter((r) => {
  const text = String(r.when?.sourceConditionText ?? '');
  return /JD-CR-202/.test(text) && /Clean Slate|7 \/ 10|eligible/i.test(text);
});
ok('rule-08 is still present and still names JD-CR-202',
  /JD-CR-202/.test(String(rule08?.when?.sourceConditionText ?? '')), rule08?.id);
const rule08Unqualified = !/Clean Slate|eligible/i.test(String(rule08?.when?.sourceConditionText ?? ''));
ok('rule-08 has acquired the Clean Slate qualifier, or a qualified sibling still states the real rule',
  !rule08Unqualified || qualifiedSiblings.length > 0,
  { rule08Unqualified, qualifiedSiblings: qualifiedSiblings.map((r) => r.id) });
console.log(rule08Unqualified
  ? '            (still unqualified; the qualified siblings are what keep the real rule stated)'
  : '            (qualified; the conflation route through this rule is closed)');
ok('the record names the rule and quotes its condition',
  /rule-08-for-convictions-entered-before-1-1-2000-the-person-file/
    .test(record.part5_theCurrentImplementation?.whatIsActuallyWrong ?? ''));
ok('the record does not overstate: the live effect is recorded as unproven',
  /Whether rule-08 actually causes such a participant to land on the JD-CR-202 route/
    .test(record.part5_theCurrentImplementation?.whatWasNotProven ?? ''));
ok('the record notes the route sells, which is why it is recorded',
  /paymentAllowed true/.test(record.part5_theCurrentImplementation?.exposure ?? ''));
ok('the rule was measured rather than edited',
  /rule-08 was measured, not edited/.test(record.whatThisRecordDoesNotDo?.noRouteChanged ?? ''));

// ---------------------------------------------------------------------------
console.log('\n6. the record opens nothing and admits what it could not read');
ok('the blocked sources are named rather than glossed',
  /jud\.ct\.gov, cga\.ct\.gov, law\.justia\.com/.test(record.part4_whatWasSearchedForAndNotFound?.whatCouldNotBeRead ?? ''));
ok('the record separates what that does and does not change',
  /It does not change the negative finding about JD-CR-202/
    .test(record.part4_whatWasSearchedForAndNotFound?.whyThatMattersToTheAnswer ?? ''));
ok('the remaining review names both open items',
  /an authoritative Connecticut Judicial Branch source/.test(record.remainingReview ?? '')
  && /evaluator run/.test(record.remainingReview ?? ''));
ok('state changed is none', record.statusOfThisRecord?.stateChanged === 'none');
for (const [field, expected] of [
  ['isCounselApproval', false], ['createsOutputApproval', false], ['createsTerminalStatus', false],
  ['productionTouched', false], ['commercialRoutesOpened', 0], ['opensAnyRoute', false], ['productionAuthorized', false]
]) ok(`${field} is ${JSON.stringify(expected)}`, record[field] === expected, record[field]);
ok('the adoption package still carries both units unchanged',
  adoptionText.includes(PETITION_UNIT) && adoptionText.includes(AUTOMATIC_UNIT));

console.log(`\n${checks - failures}/${checks} checks passed`);
if (failures) { console.error(`${failures} check(s) failed`); process.exit(1); }
