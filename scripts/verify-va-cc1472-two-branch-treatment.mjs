#!/usr/bin/env node
// Guard for the D-012 repair: Va. Code 19.2-392.2(I) has two branches and the
// product must keep them apart.
//
//   Branch A  the court's duty on receiving the pardon copy under 2.2-402.
//             No participant filing. This existed and is preserved.
//   Branch B  the participant-initiated petition, governed by official Form
//             CC-1472. This replaced a custom "Transmittal and Request".
//
// The failure modes worth a guard pull in opposite directions, so the checks
// are written to survive the remaining work rather than freeze today's state:
//
//   * Branch A must not quietly become "you must file a petition". That is the
//     error the historical register would have caused if D-012 had been read as
//     "add a form" rather than "select the right instrument".
//   * Branch B must not drift back to a custom document, and must not acquire a
//     fee representation no source supports. The previous specification said no
//     fee is stated in subsection (I); an early reading of the CC-1472
//     instructions said there is no filing fee. Neither is recorded, because the
//     form's own checklist says to file with all applicable fees and costs.
//   * The clerk's elements 14 to 16 must never carry participant-authored data.
//
// Check 3 is the one that must not be a freeze: CC-1472 is identified but not
// ingested, so the component refuses today. The check is a disjunction — either
// the form's geometry has been measured, or the component still refuses — which
// passes now, passes after ingestion, and fails only on a component that claims
// to compose an official form nobody has measured.
//
// Mutations are applied to in-memory copies and run through the repository's
// own refusal machinery, never against edited files on disk.

import { readFileSync } from 'node:fs';
import { register } from 'node:module';
register('./lib/ts-esm-loader.mjs', import.meta.url);
const { specificationDocumentRefusals, documentContractFor } =
  await import('../src/lib/rcap/grade-a/document-contract.ts');

const SPEC = 'data/record-clearing/packet-specifications/VA-absolute-pardon-expungement.v1.json';
const MANIFEST = 'data/record-clearing/legal-design-packet-set-manifests.json';
const RECORD = 'data/record-clearing/legal-decisions/2026-09-21-section-5-defect-register-reconciliation.json';

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
const manifest = json(MANIFEST).packetSets.find((s) => s.packetSetId === 'va_exp_absolute_pardon-set');
const primary = (spec.documents ?? []).find((d) => d.role === 'primary_filing');
const actions = manifest?.participantActionRequired ?? [];
const action = (kind, needle) => actions.find(
  (a) => a.kind === kind && (needle === undefined || a.description.includes(needle)));
const allText = JSON.stringify(spec) + JSON.stringify(manifest);

console.log('Virginia absolute pardon — two branches, one official form\n');

// ---------------------------------------------------------------------------
console.log('1. branch A survives: the court duty needs no participant petition');
ok('the specification still models a court-automatic branch',
  spec.branchModel?.branchA?.participantFilingRequired === false,
  spec.branchModel?.branchA?.participantFilingRequired);
ok('its trigger is still the court receiving the pardon copy under 2.2-402',
  /2\.2-402/.test(spec.branchModel?.branchA?.trigger ?? ''), spec.branchModel?.branchA?.trigger);
ok('the rule is still that the court shall enter the order',
  /court shall enter an order/i.test(spec.branchModel?.branchA?.rule ?? ''));
ok('relief is still not modelled as mandatory only on a motion',
  spec.statutoryAuthority?.reliefIsMandatoryOnMotion === false);
ok('the petition is expressly not a prerequisite to branch A',
  (spec.statutoryAuthority?.doNotImport ?? []).some((s) => /not make the branch B petition a prerequisite/i.test(s)));
ok('the participant is told to check whether a filing is needed at all',
  (spec.participantChecklist ?? []).some(
    (c) => /court must enter the expungement order without a petition/i.test(c.text ?? '')));
ok('a court that has the pardon and has not acted is a stop-and-get-help, not a filing instruction',
  (spec.hearingAndObjectionStops ?? []).some(
    (s) => /rather than assuming a petition is required/i.test(s.whatItMeans ?? '')));

// ---------------------------------------------------------------------------
console.log('\n2. branch B is the official form, not a custom substitute');
ok('the participant instrument is an official_pdf_fill', primary?.outputStrategy === 'official_pdf_fill',
  primary?.outputStrategy);
ok('it binds CC-1472 by id', primary?.officialFormId === 'CC-1472', primary?.officialFormId);
ok('the packet-set manifest binds the same form on the same component',
  manifest?.components?.[0]?.officialFormId === 'CC-1472'
  && manifest?.components?.[0]?.outputStrategy === 'official_pdf_fill',
  manifest?.components?.[0]);
ok('the manifest records the official source URL',
  /vacourts\.gov\/static\/forms\/circuit\/cc1472\.pdf/.test(manifest?.components?.[0]?.officialSourceUrl ?? ''));
ok('no authored sections were written into the official-form component',
  (primary?.sections ?? []).length === 0, (primary?.sections ?? []).length);
ok('form applicability is the derived official_form_required, not a hand-edit',
  documentContractFor(primary).formApplicability === 'official_form_required',
  documentContractFor(primary).formApplicability);
ok('the superseded custom instrument is recorded rather than deleted',
  spec.supersession?.priorApprovalStatus === 'HISTORICAL_EVIDENCE_ONLY',
  spec.supersession?.priorApprovalStatus);
ok('the old approval is explicitly not rolled forward',
  /not rolled forward|is not rolled forward/i.test(spec.supersession?.priorApprovalScope ?? ''));
ok('regenerating a custom equivalent of CC-1472 is forbidden in writing',
  /Do not regenerate a custom equivalent of CC-1472/.test(spec.supersession?.doNotDo ?? ''));
ok('the census-v1 fixtures are marked superseded rather than presented as the form',
  spec.artifactBinding?.artifactStatus === 'SUPERSEDED_FOR_THE_PARTICIPANT_BRANCH',
  spec.artifactBinding?.artifactStatus);

// ---------------------------------------------------------------------------
// The live invariant. Not a freeze: ingesting the form satisfies it.
console.log('\n3. the form is not claimed to compose before it has been measured');
const geometryMeasured = spec.officialForm?.overlayGeometry?.status === 'MEASURED';
const refusals = specificationDocumentRefusals(spec);
const primaryRefuses = refusals.some((r) => r.startsWith(`${primary.documentId}:`));
ok('the form geometry has been measured, or the component still refuses',
  geometryMeasured || primaryRefuses, { geometryStatus: spec.officialForm?.overlayGeometry?.status, primaryRefuses });
console.log(geometryMeasured
  ? '            (measured; the component may compose from the official form)'
  : '            (unmeasured; the refusal is the correct answer while CC-1472 is unbound)');
ok('a packet may not be composed while the form is unbound',
  geometryMeasured || spec.legalSectionsBound === false, spec.legalSectionsBound);
ok('the reason names the unmeasured form rather than a generic gap',
  geometryMeasured || /CC-1472 has not been ingested here/.test(spec.whyIncomplete ?? ''));
ok('coordinates were not authored, and the record says why',
  geometryMeasured || /inventing the one thing that map is forbidden to invent/
    .test(spec.officialForm?.overlayGeometry?.why ?? ''));

// ---------------------------------------------------------------------------
console.log('\n4. clerk-only elements carry no participant-authored content');
const clerk = spec.officialForm?.elementInventory?.clerkPrepared ?? [];
ok('elements 14, 15 and 16 are recorded as clerk-prepared',
  JSON.stringify(clerk.map((e) => e.element)) === '[14,15,16]', clerk.map((e) => e.element));
ok('the clerk-field rule forbids prepopulating participant data',
  /never prepopulate participant-controlled data/i
    .test(spec.officialForm?.elementInventory?.clerkFieldRule ?? ''));
ok('those elements are owned by the court in fieldOwnership',
  (spec.fieldOwnership?.courtOwnedFields ?? []).length === 3
  && (spec.fieldOwnership?.courtOwnedFields ?? []).every((f) => /element_1[456]/.test(f)),
  spec.fieldOwnership?.courtOwnedFields);
const participantOwned = [
  ...(spec.fieldOwnership?.participantOwnedFacts ?? []),
  ...(spec.fieldOwnership?.participantAtSigningFields ?? []),
  ...(spec.fieldOwnership?.participantAtServiceFields ?? [])
];
ok('no clerk element appears on any participant-owned list',
  !participantOwned.some((f) => /element_1[456]/.test(f)), participantOwned.filter((f) => /element_1[456]/.test(f)));
ok('a hearing set at element 14 is a stop, not something the product fills in',
  (spec.hearingAndObjectionStops ?? []).some((s) => /element 14/.test(s.situation ?? '')));

console.log('\n   the case number is a clerk-completable blank, not a synthesised value');
const element1 = (spec.officialForm?.elementInventory?.participantPrepared ?? []).find((e) => e.element === 1);
ok('element 1 may remain blank', element1?.mayRemainBlank === true, element1);
ok('the record says never to synthesise one', /Never synthesise one/i.test(element1?.note ?? ''));
ok('no case-number fact was invented to satisfy the form',
  !(spec.requiredFacts ?? []).some((f) => /case_number|cause_number|docket_number/.test(f.factId)),
  (spec.requiredFacts ?? []).map((f) => f.factId).filter((id) => /case|docket/.test(id)));
ok('case mode is therefore honestly unresolved rather than assumed',
  documentContractFor(primary).caseMode === 'unresolved', documentContractFor(primary).caseMode);

// ---------------------------------------------------------------------------
console.log('\n5. service and attachment requirements survive generation');
ok('the derived contract says the participant serves',
  documentContractFor(primary).serviceTreatment === 'participant_serves',
  documentContractFor(primary).serviceTreatment);
ok('the served party is the Commonwealth\'s Attorney of the county or city of filing',
  /Commonwealth's Attorney/.test(spec.serviceAndNotice?.servedParty ?? ''), spec.serviceAndNotice?.servedParty);
ok('service is required rather than disclaimed', spec.serviceAndNotice?.serviceRequired === true);
ok('the manifest service action is what the derivation reads',
  /Commonwealth's Attorney/.test(action('serve_party')?.description ?? ''));
ok('subsection (D) notice is still not imported in its place',
  (spec.statutoryAuthority?.doNotImport ?? []).some((s) => /subsection \(D\)/.test(s)));
const att = Object.fromEntries((spec.attachments ?? []).map((a) => [a.attachmentId, a]));
ok('the absolute-pardon order is a required attachment',
  att['absolute-pardon-order']?.requirement === 'required', att['absolute-pardon-order']?.requirement);
ok('CC-1416 is conditional on the clerk requiring it, not unconditional',
  att['cc-1416-civil-cover-sheet']?.requirement === 'conditional'
  && /clerk of the filing court requires it/.test(att['cc-1416-civil-cover-sheet']?.condition ?? ''),
  att['cc-1416-civil-cover-sheet']?.requirement);
ok('the conditional attachment may neither be forced nor dropped silently',
  /Do not include it unconditionally and do not omit it silently/
    .test(att['cc-1416-civil-cover-sheet']?.doNotDo ?? ''));
ok('the filing action still names both the attachment and the conditional cover sheet',
  /absolute pardon attached/.test(action('file')?.description ?? '')
  && /CC-1416 civil cover sheet if that clerk requires one/.test(action('file')?.description ?? ''));

// ---------------------------------------------------------------------------
console.log('\n6. no unsupported fee representation');
ok('no fee exemption is established', spec.feeAndWaiver?.feeExemptionEstablished === false,
  spec.feeAndWaiver?.feeExemptionEstablished);
ok('no fee amount is identified', spec.feeAndWaiver?.feeIdentified === false);
ok('the statement directs the participant to the clerk',
  /set by the clerk of the filing court/.test(spec.feeAndWaiver?.statement ?? ''));
ok('the absence of a stated fee is expressly not an exemption',
  /absence of a stated fee in the subsection is not an exemption/.test(spec.feeAndWaiver?.doNotDo ?? ''));
ok('the manifest fee action says applicable fees and costs',
  /all applicable fees and costs/.test(action('pay_fee')?.description ?? ''));
const NO_FEE_CLAIMS = [
  /no filing fee/i, /there is no fee/i, /fee: ?\$?0\b/i, /\$0\.00/, /fee waived/i, /free to file/i
];
for (const pattern of NO_FEE_CLAIMS) {
  ok(`nothing in the specification or manifest asserts ${pattern}`,
    !pattern.test(allText), (allText.match(pattern) ?? [])[0]);
}
ok('the old "no fee is stated in subsection (I)" framing is gone',
  !/no fee is stated/i.test(allText));

// ---------------------------------------------------------------------------
console.log('\n7. the reconciliation record matches what was actually done');
const d012 = (json(RECORD).dispositions ?? []).find((d) => d.id === 'D-012');
ok('D-012 is no longer recorded as blocked on a missing source',
  !/blocked on/i.test(d012?.disposition ?? ''), d012?.disposition);
ok('the record admits the source was in the workbook all along',
  /Sources tab names/.test(d012?.theSourceTheRowReliedOn ?? ''));
ok('the record names the real defect as instrument selection',
  /defect was instrument selection/.test(d012?.whatWasActuallyWrong ?? ''));
ok('the record states the form is identified but not ingested',
  /identified, not ingested/.test(d012?.whatIsNotDoneAndWhy ?? ''));
ok('the record states the approval is not rolled forward',
  /is not rolled forward/.test(d012?.theApprovalConsequence ?? ''));
ok('the amendment is recorded rather than the original quietly rewritten',
  /that was wrong, and the correction is recorded/i.test(json(RECORD).amendment?.why ?? ''));

// ---------------------------------------------------------------------------
// Mutations. Each is the dangerous state this repair exists to prevent, applied
// to a deep copy and run through the same code as above.
console.log('\n8. mutations — each dangerous state is actually caught');
const mutations = [
  ['branch A turned into a mandatory petition', (s) => { s.branchModel.branchA.participantFilingRequired = true; },
    (s) => s.branchModel?.branchA?.participantFilingRequired === false],
  ['branch B reverted to a custom document', (s) => {
    s.documents[0].outputStrategy = 'custom_pleading'; delete s.documents[0].officialFormId;
  }, (s) => s.documents[0].outputStrategy === 'official_pdf_fill'
      && documentContractFor(s.documents[0]).formApplicability === 'official_form_required'],
  ['the form claimed to compose while unmeasured', (s) => { s.legalSectionsBound = true; },
    (s) => s.officialForm?.overlayGeometry?.status === 'MEASURED'
      || specificationDocumentRefusals(s).some((r) => r.startsWith('primary_filing:'))
      && s.legalSectionsBound === false],
  ['a clerk element moved onto a participant list', (s) => {
    s.fieldOwnership.participantAtSigningFields.push('primary_filing.cc1472_element_14_hearing_date_and_time');
  }, (s) => ![...(s.fieldOwnership?.participantOwnedFacts ?? []),
    ...(s.fieldOwnership?.participantAtSigningFields ?? []),
    ...(s.fieldOwnership?.participantAtServiceFields ?? [])].some((f) => /element_1[456]/.test(f))],
  ['a case number invented to resolve the case mode', (s) => {
    s.requiredFacts.push({ factId: 'case_number', use: 'CC-1472 element 1', ownership: 'participant' });
  }, (s) => !(s.requiredFacts ?? []).some((f) => /case_number/.test(f.factId))],
  ['CC-1416 made unconditional', (s) => {
    s.attachments.find((a) => a.attachmentId === 'cc-1416-civil-cover-sheet').requirement = 'required';
  }, (s) => s.attachments.find((a) => a.attachmentId === 'cc-1416-civil-cover-sheet')?.requirement === 'conditional'],
  ['service on the Commonwealth\'s Attorney dropped', (s) => { s.serviceAndNotice.serviceRequired = false; },
    (s) => s.serviceAndNotice?.serviceRequired === true],
  ['a no-filing-fee claim reintroduced', (s) => {
    s.feeAndWaiver.statement = 'There is no filing fee for this petition.';
  }, (s) => !NO_FEE_CLAIMS.some((p) => p.test(JSON.stringify(s)))],
  ['a fee exemption asserted without a source', (s) => { s.feeAndWaiver.feeExemptionEstablished = true; },
    (s) => s.feeAndWaiver?.feeExemptionEstablished === false],
  ['the superseded approval rolled forward', (s) => { s.supersession.priorApprovalStatus = 'CURRENT'; },
    (s) => s.supersession?.priorApprovalStatus === 'HISTORICAL_EVIDENCE_ONLY']
];
for (const [label, mutate, invariant] of mutations) {
  const copy = structuredClone(spec);
  ok(`the unmutated specification satisfies "${label}"`, invariant(spec) === true);
  mutate(copy);
  ok(`mutation caught: ${label}`, invariant(copy) !== true);
}

console.log(`\n${checks - failures}/${checks} checks passed`);
if (failures) { console.error(`${failures} check(s) failed`); process.exit(1); }
