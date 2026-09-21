#!/usr/bin/env node
// Guard for KS-MUNICIPAL-CAPTION-REFUSALS-ARE-CORRECT-2026-09-21.
//
// The determination is that the Kansas municipal caption refusals are correct
// because the specifications say a packet may not be composed from them while
// legalSectionsBound is false. So the invariant to protect is NOT "these stay
// unresolved forever" -- that would freeze the defect, the mistake the ND
// 12-60.1 verifier had to be narrowed for. It is a disjunction:
//
//   for each Kansas court-facing component, EITHER its specification has bound
//   its legal sections (the gate cleared, so a caption may now be recorded from
//   the per-court authority), OR its caption treatment is still unresolved.
//
// That passes today, passes after the local filing configuration lands and a
// caption is recorded from authority, and fails exactly in the state nobody
// wants: a caption asserted while the specification still says the facts cannot
// be stated -- which is the manufactured caption the contract forbids.

import { readFileSync } from 'node:fs';

const RECORD = 'data/record-clearing/legal-decisions/2026-09-21-ks-municipal-caption-refusals-are-correct.json';
const CONTRACT = 'data/record-clearing/legal-decisions/2026-09-20-caption-treatment-contract.json';
const REGISTRY = 'data/record-clearing/factory-v2-route-registry.json';
const SPECS = {
  'KS:municipal-arrest-record-expungement-under-12-4516a':
    'data/record-clearing/packet-specifications/KS-municipal-arrest-record-expungement-under-12-4516a.v1.json',
  'KS:municipal-conviction-or-diversion-expungement-under-12-4516':
    'data/record-clearing/packet-specifications/KS-municipal-conviction-or-diversion-expungement-under-12-4516.v1.json'
};

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
const contract = json(CONTRACT);
const registry = json(REGISTRY);
const rows = Array.isArray(registry) ? registry : (registry.routes ?? Object.values(registry).find(Array.isArray) ?? []);

console.log('Kansas municipal caption refusals — the refusal is the correct answer\n');

// ---------------------------------------------------------------------------
console.log('1. the caption contract still says what this determination rests on');
const values = contract.theContract?.values ?? {};
ok('unresolved still means a court-facing component refuses',
  /refuses/i.test(values.unresolved ?? ''), values.unresolved);
ok('a custom pleading still derives to unresolved rather than to a caption',
  /custom_pleading yields unresolved/.test(contract.theContract?.derivedOnlyWhereASourceFieldStatesIt ?? ''));
ok('nothing is inferred from presentation',
  /Nothing is inferred from presentation/.test(contract.theContract?.derivedOnlyWhereASourceFieldStatesIt ?? ''));
ok('the contract still forbids manufacturing a caption or relabelling a filing as guidance',
  /manufacture a caption, or relabel a court-facing filing as guidance/.test(contract.finding ?? ''));

// ---------------------------------------------------------------------------
console.log('\n2. neither Kansas route has an official form that could supply a caption');
for (const [routeKey] of Object.entries(SPECS)) {
  const row = rows.find((r) => r?.pathwayKey === routeKey);
  ok(`${routeKey} is still a registered route`, Boolean(row));
  ok(`${routeKey} binds no official form`, (row?.officialFormIds ?? []).length === 0, row?.officialFormIds);
}

// ---------------------------------------------------------------------------
// The live invariant. Not a freeze.
console.log('\n3. a caption is not asserted while the specification says the facts cannot be stated');
for (const [routeKey, specPath] of Object.entries(SPECS)) {
  const spec = json(specPath);
  const bound = spec.legalSectionsBound === true;
  const courtFacing = (spec.documents ?? []).filter(
    (d) => d.outputStrategy !== 'process_guidance'
  );
  const asserted = courtFacing.filter((d) => {
    const t = d.documentContract?.captionTreatment ?? d.captionTreatment ?? null;
    return t !== null && t !== 'unresolved';
  });
  ok(`${routeKey}: legal sections bound, or no caption asserted on a court-facing component`,
    bound || asserted.length === 0,
    { legalSectionsBound: spec.legalSectionsBound, assertedCount: asserted.length });
  console.log(bound
    ? '            (the gate cleared; a caption may now be recorded from the per-court authority)'
    : '            (the gate still holds; the refusal is correct and is the contract\'s third answer)');

  // While the gate holds, the specification must keep saying so rather than
  // quietly dropping the sentence this determination quotes.
  if (!bound) {
    ok(`${routeKey}: still states a packet may not be composed from it`,
      /may not be composed from this specification/i.test(String(spec.whyIncomplete ?? '')));
    ok(`${routeKey}: still names the per-court local filing configuration as the reason`,
      /court by court|local_filing_configuration/i.test(String(spec.whyIncomplete ?? '')));
    ok(`${routeKey}: its filing destination is still unbound`,
      (spec.unboundLegalSections ?? []).includes('filingDestination'), spec.unboundLegalSections);
  }
}

// ---------------------------------------------------------------------------
console.log('\n4. the determination reduced no scope');
for (const [routeKey] of Object.entries(SPECS)) {
  const row = rows.find((r) => r?.pathwayKey === routeKey);
  ok(`${routeKey} was not disabled, hidden or converted to guidance-only`,
    row?.separateGates?.closureCategory === 'paid_packet_intended',
    row?.separateGates?.closureCategory);
  ok(`${routeKey} was already non-selling and still is`,
    row?.separateGates?.paymentAllowedAtTheEvaluator === false,
    row?.separateGates?.paymentAllowedAtTheEvaluator);
}
ok('the record states it changed no state', record.statusOfThisRecord?.stateChanged === 'none');
ok('the record recorded no caption treatment', record.statusOfThisRecord?.captionTreatmentsRecorded === 0);

// ---------------------------------------------------------------------------
console.log('\n5. the record opens nothing');
for (const [field, expected] of [
  ['isCounselApproval', false], ['createsOutputApproval', false], ['createsTerminalStatus', false],
  ['productionTouched', false], ['commercialRoutesOpened', 0], ['opensAnyRoute', false], ['productionAuthorized', false]
]) ok(`${field} is ${JSON.stringify(expected)}`, record[field] === expected, record[field]);
ok('the record says both routes remain incomplete and non-selling',
  /remain incomplete and non-selling/.test(record.statusOfThisRecord?.readThisFirst ?? ''));

console.log(`\n${checks - failures}/${checks} checks passed`);
if (failures) { console.error(`${failures} check(s) failed`); process.exit(1); }
