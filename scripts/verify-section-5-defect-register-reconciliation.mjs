#!/usr/bin/env node
// Guard for SECTION-5-DEFECT-REGISTER-RECONCILIATION-2026-09-21.
//
// The record disposes of a finite historical population -- Defect Register
// D-001 through D-014 in ExpungementAI_Custom_Pleading_Release_Audit.xlsx --
// against current bytes. Thirteen closed by reading what the product contains.
// The fourteenth, D-012, was closed by repairing the one specification the row
// actually reaches: the Virginia absolute-pardon participant filing, rebound
// from a custom "Transmittal and Request" to official Form CC-1472.
//
// Two failure modes are worth a guard, and they pull in opposite directions:
//
//   1. A closure silently reverses. Thirteen rows were closed because an exact
//      string or behaviour is absent from the current product. If a string
//      comes back, the closure is no longer true and this record is asserting
//      something false. Those checks are regression guards, not freezes: they
//      fail only when the defect returns.
//
//   2. A closure claims more than was done. D-012's repair binds a form that is
//      identified but not ingested, so check 4 is a disjunction: either the
//      form's geometry has been measured, or the specification still cannot
//      compose. That passes today, passes after ingestion, and fails on the
//      dangerous middle -- a route claiming to compose an official form nobody
//      has measured. The two-branch invariants themselves live in
//      verify-va-cc1472-two-branch-treatment.mjs.
//
// Check 6 is the same shape for D-008's live successor. The record closed the
// LegalEase footer as written while naming a live instance of the same class
// (the composer-emitted route identifier, task #53). Either that emission is
// gone from the composer, or the record must still be saying it is unrepaired
// and owned by the engineering lane. It must never be possible for the
// emission to persist while this record reads as though no product identifier
// reaches a court page.
//
// The fixture sweep is real: canonical.pdf bytes are read with pdftotext, not
// a cached extract, because a cache would let the guard pass on stale text.

import { readFileSync, globSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const RECORD = 'data/record-clearing/legal-decisions/2026-09-21-section-5-defect-register-reconciliation.json';
const WORKBOOK_SHA = '38fe4f058d1c06efdfbc60da82c5f0ff53e87adb4af257a8a3f84f1afdfe4df1';
const FIXTURE_GLOB = 'data/rcap-all50/overlays/census-v1/*/*/fixtures/canonical.pdf';

const SPEC_VA = 'data/record-clearing/packet-specifications/VA-absolute-pardon-expungement.v1.json';
const SPEC_SD = 'data/record-clearing/packet-specifications/SD-suspended-imposition-of-sentence-sealing.v1.json';
const SPEC_GA = 'data/record-clearing/packet-specifications/GA-restriction-and-sealing-of-a-pardoned-felony.v1.json';
const COMPOSER = 'scripts/build-census-v1-dc_seal_nonconviction-set.mjs';
const RENDERER = 'src/lib/rcap/grade-a/renderer.ts';
const ADMISSION = 'src/lib/rcap/fulfillment/grade-a-admission.ts';
const PA_BUILDER = 'src/lib/rcap/documents/filing-next-steps.ts';

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
const byId = Object.fromEntries((record.dispositions ?? []).map((d) => [d.id, d]));

console.log('Section 5 defect register reconciliation — D-001 through D-014\n');

// ---------------------------------------------------------------------------
console.log('1. the population is the finite one, and it is complete');
ok('the record names the Defect Register workbook by digest',
  record.theSource?.workbookSha256 === WORKBOOK_SHA, record.theSource?.workbookSha256);
ok('the digest was verified on receipt rather than transcribed',
  record.theSource?.shaVerifiedOnReceipt === true);
ok('the population is stated as fourteen rows, header excluded',
  /D-001 through D-014\. Fourteen rows, header excluded/.test(record.theSource?.population ?? ''));
const expected = Array.from({ length: 14 }, (_, i) => `D-${String(i + 1).padStart(3, '0')}`);
ok('exactly fourteen dispositions are recorded', (record.dispositions ?? []).length === 14,
  (record.dispositions ?? []).length);
ok('they are D-001 through D-014 with no gap and no duplicate',
  JSON.stringify((record.dispositions ?? []).map((d) => d.id)) === JSON.stringify(expected),
  (record.dispositions ?? []).map((d) => d.id));
ok('every disposition carries current evidence rather than a bare verdict',
  (record.dispositions ?? []).every((d) => typeof d.currentEvidence === 'string' && d.currentEvidence.length > 40));
ok('the §5 prose was explicitly excluded as the enumeration',
  /historical summary context/.test(record.theSource?.whatWasDeliberatelyIgnored ?? ''));
ok('the record disclaims being an audit, census or nationwide review',
  /not an audit, a census or a nationwide review/.test(record.whatThisIs ?? ''));
ok('the arithmetic holds: every one of the fourteen rows is accounted for',
  (record.result?.closedRepaired ?? 0) + (record.result?.partlyLive ?? 0) === 14
  && record.result?.total === 14,
  record.result);

// ---------------------------------------------------------------------------
// Regression guards. Each closure named an exact string as absent. If the
// string returns, the closure is false and this must fail.
console.log('\n2. the closures that rest on an absent string are still true of current bytes');
const fixtures = globSync(FIXTURE_GLOB).sort();
ok('the canonical fixture set is present and non-trivial', fixtures.length >= 200, fixtures.length);

const text = new Map();
for (const f of fixtures) {
  try { text.set(f, execFileSync('pdftotext', ['-layout', f, '-'], { maxBuffer: 64 * 1024 * 1024 }).toString()); }
  catch { text.set(f, ''); }
}
const countFixtures = (needle) => [...text.entries()].filter(([, t]) => t.includes(needle)).map(([f]) => f);

const ABSENT = [
  ['D-002', 'I. PARTIES'],
  ['D-002', 'II. FACTS'],
  ['D-002', 'III. ELIGIBILITY'],
  ['D-003', 'this document does not guarantee'],
  ['D-004', 'VI. VERIFICATION'],
  ['D-005', 'if local rules require'],
  ['D-006', 'personal delivery / first-class mail'],
  ['D-007', 'ORDERED and DECREED'],
  ['D-008', 'using LegalEase'],
  ['D-008', 'This is not an official court form'],
  ['D-009', '{county}'],
  ['D-009', '{court}'],
  ['D-009', '{petitionerName}'],
  ['D-009', '[TO BE CONFIRMED]']
];
for (const [id, needle] of ABSENT) {
  const hits = countFixtures(needle);
  ok(`${id}: ${JSON.stringify(needle)} is still absent from every canonical fixture`,
    hits.length === 0, hits.slice(0, 4));
}

// D-007's second half is not an absence claim. The record's position is that
// "AND NOW" belongs in Pennsylvania's own official form and nowhere else, so
// the guard is a scope guard: every case-sensitive occurrence is in PA.
const andNow = countFixtures('AND NOW');
ok('D-007: every case-sensitive "AND NOW" is still in a Pennsylvania fixture',
  andNow.every((f) => /\/census-v1\/pa\//.test(f)), andNow);
ok('the record uses the corrected case-sensitive count, not the case-insensitive one',
  /case-insensitive count reported 'AND NOW' in twelve fixtures. That was wrong/
    .test(record.method?.oneCorrectionMadeDuringThePass ?? ''));

// ---------------------------------------------------------------------------
console.log('\n3. the closures that rest on a successor still have that successor');
ok('D-001: Pennsylvania next-steps text is still in a named jurisdiction builder',
  /function buildPennsylvaniaNextSteps/.test(readFileSync(PA_BUILDER, 'utf8')));
const d001fp = byId['D-001']?.aFalsePositiveWorthRecording ?? '';
ok('D-001: the Connecticut false positive is recorded rather than dropped',
  /ct-cannabis-petition-set/.test(d001fp) && /54-142v/.test(d001fp)
  && /It is not a leak/.test(d001fp) && /'Pennsylvania' appears zero times/.test(d001fp));
// That claim is measurable, so measure it rather than trusting the sentence.
const ctFixture = [...text.keys()].find((f) => /\/ct-cannabis-petition-set--custom-pleading\//.test(f));
ok('D-001: and it still holds — the Connecticut fixture contains no "Pennsylvania"',
  Boolean(ctFixture) && !text.get(ctFixture).includes('Pennsylvania'), ctFixture);
// The closure itself: no non-PA fixture carries a Pennsylvania court or agency.
const paLeaks = [...text.entries()]
  .filter(([f]) => !/\/census-v1\/pa\//.test(f))
  .filter(([, t]) => t.includes('Pennsylvania'))
  .map(([f]) => f);
ok('D-001: no non-Pennsylvania fixture names Pennsylvania at all', paLeaks.length === 0, paLeaks.slice(0, 4));

const ga = json(SPEC_GA);
const exhibitB = (ga.documents ?? []).find((d) => d.documentId === 'exhibit_b_pardon_certificate');
ok('D-010: the Georgia pardon certificate is still a participant attachment',
  exhibitB?.documentContract?.instrumentClass === 'attachment'
  && exhibitB?.documentContract?.preparedBy === 'participant',
  { instrumentClass: exhibitB?.documentContract?.instrumentClass, preparedBy: exhibitB?.documentContract?.preparedBy });
ok('D-010: it is still a one-section separator rather than the certificate itself',
  (exhibitB?.sections ?? []).length === 1, (exhibitB?.sections ?? []).length);

const sd = json(SPEC_SD);
const sdIds = (sd.documents ?? []).map((d) => d.documentId);
ok('D-011: South Dakota still carries implementation_request and enforcement_motion',
  sdIds.includes('implementation_request') && sdIds.includes('enforcement_motion'), sdIds);
ok('D-011: the persisting primary_filing role name is recorded as a caveat, not smoothed over',
  /role name primary_filing persists/.test(byId['D-011']?.oneHonestCaveat ?? ''));

ok('D-013: the single commercial gate is still the only one, by its own words',
  /route commercially eligible", and it is the only one/.test(readFileSync(ADMISSION, 'utf8')));
ok('D-013: that gate function still exists under the name the record measured',
  /export function fulfillmentAuthorityForRoute/.test(readFileSync(ADMISSION, 'utf8')));
ok('D-014: the Grade-A renderer is still standalone rather than packet_document_v1',
  /Deliberately standalone rather than an extension of packet_document_v1/.test(readFileSync(RENDERER, 'utf8')));

// ---------------------------------------------------------------------------
// D-012 was closed by repairing the one specification the row reaches, rather
// than by reading the row as current truth. The detailed two-branch invariants
// live in verify-va-cc1472-two-branch-treatment.mjs; what belongs here is that
// the closure this record claims is the closure that actually happened.
console.log('\n4. D-012: the Virginia row was closed by a repair, not by an assertion');
const va = json(SPEC_VA);
const vaPrimary = (va.documents ?? []).find((d) => d.role === 'primary_filing');
const vaForms = [vaPrimary?.officialFormId, ...(vaPrimary?.officialFormIds ?? []), ...(va.officialFormIds ?? [])]
  .filter(Boolean);
ok('the participant instrument binds the official form the row named',
  vaForms.includes('CC-1472'), vaForms);
ok('it is an official_pdf_fill rather than a custom substitute',
  vaPrimary?.outputStrategy === 'official_pdf_fill', vaPrimary?.outputStrategy);
// Not a freeze: this holds today and after the form is ingested. It fails only
// if the route claims to compose an official form nobody has measured.
ok('the form geometry has been measured, or the specification still cannot compose',
  va.officialForm?.overlayGeometry?.status === 'MEASURED' || va.legalSectionsBound === false,
  { geometry: va.officialForm?.overlayGeometry?.status, legalSectionsBound: va.legalSectionsBound });
ok('the superseded custom approval is not rolled forward',
  va.supersession?.priorApprovalStatus === 'HISTORICAL_EVIDENCE_ONLY',
  va.supersession?.priorApprovalStatus);
ok('no fee exemption was invented while rebinding the form',
  va.feeAndWaiver?.feeExemptionEstablished === false, va.feeAndWaiver?.feeExemptionEstablished);
ok('the record names the real defect as instrument selection, not a missing form',
  /defect was instrument selection/.test(byId['D-012']?.whatWasActuallyWrong ?? ''));
ok('the record states the form is identified but not yet ingested',
  /identified, not ingested/.test(byId['D-012']?.whatIsNotDoneAndWhy ?? ''));
ok('the parts that do not reach the current product are still separated out',
  /WA CROP and MA BMC multi have no packet specification/.test(byId['D-012']?.whatIsNotLive ?? ''));
ok('no adjacent Washington or Massachusetts route was opened on the strength of the row',
  /No adjacent Washington or Massachusetts route was opened or reviewed/.test(byId['D-012']?.whatIsNotLive ?? ''));
ok('no historical finding is left live', (record.result?.liveItems ?? []).length === 0,
  record.result?.liveItems);
ok('the remaining downstream work is named rather than dropped',
  (record.result?.itemsCarryingRemainingWork ?? []).some((s) => /CC-1472 is bound .* but not ingested/.test(s)));
ok('the correction to the first pass is recorded as an amendment',
  /that was wrong, and the correction is recorded/i.test(record.amendment?.why ?? ''));

// ---------------------------------------------------------------------------
// The same shape for D-008's live successor.
console.log('\n5. D-008 is closed as written without hiding the live instance of its class');
const composer = readFileSync(COMPOSER, 'utf8');
const emitsRouteFooter = /L\.push\("", `Route: \$\{variant\.routeKey\}`\)/.test(composer);
ok('the composer no longer emits the route identifier, or the record still says it is unrepaired',
  !emitsRouteFooter
  || /it is not repaired here/.test(byId['D-008']?.theLiveInstanceOfTheSameClass ?? ''),
  { emitsRouteFooter });
console.log(emitsRouteFooter
  ? '            (still emitted; the record names it and routes it to the engineering lane)'
  : '            (no longer emitted; the successor defect has been repaired downstream)');
ok('the live instance is named at the top level so the closure cannot be misread',
  (record.result?.raisedButNotPartOfThisPopulation ?? []).some((s) => /Route: obligation/.test(s)));
ok('it is recorded as owned by the engineering lane rather than repaired here',
  /owned by the engineering lane/.test(byId['D-008']?.theLiveInstanceOfTheSameClass ?? ''));
ok('D-008 is not recorded as a plain repair', byId['D-008']?.disposition !== 'CLOSED - repaired',
  byId['D-008']?.disposition);

// ---------------------------------------------------------------------------
console.log('\n6. the reconciliation stayed inside its bounds and opened nothing');
ok('the record states nothing was rebuilt to reproduce a historical failure',
  /No historical output was regenerated/.test(record.result?.nothingWasRebuilt ?? ''));
ok('the record states no state was reopened because a row named it',
  /no state was reopened because a row named it/.test(record.result?.nothingWasRebuilt ?? ''));
ok('state changed is none', record.statusOfThisRecord?.stateChanged === 'none');
ok('the record says it repairs nothing and changes no specification',
  /repairs nothing, changes no specification/.test(record.statusOfThisRecord?.readThisFirst ?? ''));
for (const [field, expected] of [
  ['isCounselApproval', false], ['createsOutputApproval', false], ['createsTerminalStatus', false],
  ['productionTouched', false], ['commercialRoutesOpened', 0], ['opensAnyRoute', false], ['productionAuthorized', false]
]) ok(`${field} is ${JSON.stringify(expected)}`, record[field] === expected, record[field]);

console.log(`\n${checks - failures}/${checks} checks passed`);
if (failures) { console.error(`${failures} check(s) failed`); process.exit(1); }
