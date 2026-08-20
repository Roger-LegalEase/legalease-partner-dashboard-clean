#!/usr/bin/env node
// Canaries for the field-semantics corrections, and the mutations that prove
// each one is actually load-bearing.
//
//   node scripts/verify-rcap-field-semantics-canaries.mjs
//
// Every canary is a field name taken from a real reviewed family, with the
// filed-document consequence the reviewer described. Each asserts what
// decideBinding must now answer.
//
// The mutation half is the part that matters. A canary suite can pass because
// the rule works or because the canary was never discriminating, and those
// look identical from the outside. So each correction is also removed from a
// copy of the rule set, and the suite requires the matching canary to go red
// when it is. A rule whose removal changes nothing was never doing anything.

import {
  decideBinding,
  protectCategoryOf,
  haystack,
  PROTECT_RULES,
  FACT_DESCRIPTORS
} from "./rcap-official-forms/rcap-field-semantics.mjs";

const text = (name, options) => decideBinding({ name, pdfType: "text" }, options ?? {});
/** A field decided with the words its form actually prints around it. */
const printed = (name, { label = null, trailing = null } = {}, options) =>
  decideBinding({ name, pdfType: "text", effectiveLabel: label, trailingLabel: trailing }, options ?? {});

/**
 * Each canary: the field as the form actually names it, what must happen, and
 * the filed-document consequence if it does not.
 */
const CANARIES = [
  {
    id: "SSN-KY-334",
    family: "KY:aoc-334-form-en",
    field: "Defendants ssn",
    expect: (r) => r.writable === false && r.category === "government_identifier",
    consequence: "the participant's full legal name printed in the Defendant's SSN box",
    guards: "government_identifier"
  },
  {
    id: "SSN-KY-496",
    family: "KY:aoc-496-form-en",
    field: "Def.VitalStats.SSN",
    expect: (r) => r.writable === false && r.category === "government_identifier",
    consequence: "a name in the SSN box of a court-issued expungement order",
    guards: "government_identifier"
  },
  {
    id: "JAILID-KY-496",
    family: "KY:aoc-496-form-en",
    field: "Def.Info.JailId",
    expect: (r) => r.writable === false && r.category === "government_identifier",
    consequence: "a name printed as a jail identifier",
    guards: "government_identifier"
  },
  {
    id: "CERTDATE-AK-800",
    family: "AK:tf-800-form-en",
    field: "certDate",
    expect: (r) => r.writable === false && r.category === "service_block",
    consequence: "\"I certify on 2026-08-12 at ______\" — a half-completed sworn certification of service",
    guards: "service_block"
  },
  {
    id: "CITY-KY-4962",
    family: "KY:aoc-496-2-form-en",
    field: "Def.Address.City",
    expect: (r) => r.writable === false || r.factId === "participant.city",
    consequence: "the street address printed in the City box, so it appears twice",
    guards: "street_address.refuseWhen"
  },
  {
    id: "BANK-NC-CV226",
    family: "NC:aoc-cv-226-support-en",
    field: "NameOfBank",
    expect: (r) => r.writable === false,
    consequence: "the applicant's name printed as their bank's name on a sworn affidavit of indigency",
    guards: "full_legal_name.refuseWhen"
  },
  {
    id: "BANKADDR-NC-CV226",
    family: "NC:aoc-cv-226-support-en",
    field: "BankStreetAddress",
    expect: (r) => r.writable === false,
    consequence: "the applicant's own street address printed as their bank's address",
    guards: "street_address.refuseWhen"
  },
  {
    id: "ATTY-NC-CR288",
    family: "NC:aoc-cr-288-form-en",
    field: "NameAtty",
    expect: (r) => r.writable === false && r.category === "attorney",
    consequence: "the petition asserting the petitioner is represented by counsel who is the petitioner",
    guards: "attorney"
  },
  {
    id: "DA-NC-CR296",
    family: "NC:aoc-cr-296-form-en",
    field: "DistrictAttorneyName",
    expect: (r) => r.writable === false && r.category === "prosecutor",
    consequence: "the petitioner's name on the District Attorney line",
    guards: "prosecutor"
  },
  {
    id: "EMAIL-NC-CR298",
    family: "NC:aoc-cr-298-form-en",
    field: "EmailAddressOfRecord",
    expect: (r) => r.writable === false || r.factId === "participant.email",
    consequence: "the participant's own email recorded as the district attorney's address of record",
    guards: "email ordering"
  },
  // The other direction. These must still bind: a correction that refuses
  // everything is not a correction, it is an outage, and VT 600-00228 already
  // shows what a form that refuses every applicant field looks like.
  {
    id: "STILL-BINDS-name",
    family: "control",
    field: "PetitionerPrintedName",
    expect: (r) => r.writable === true && r.factId === "participant.full_legal_name",
    consequence: "the petitioner's name would stop printing on every petition",
    guards: "no regression"
  },
  {
    id: "STILL-BINDS-street",
    family: "control",
    field: "PetitionerStreetAddress",
    expect: (r) => r.writable === true && r.factId === "participant.street_address",
    consequence: "the street address would stop printing",
    guards: "no regression"
  },
  {
    id: "STILL-BINDS-city",
    family: "control",
    field: "PetitionerCity",
    expect: (r) => r.writable === true && r.factId === "participant.city",
    consequence: "the city would stop printing",
    guards: "no regression"
  },
  {
    id: "STILL-BINDS-case",
    family: "control",
    field: "CaseNumber",
    expect: (r) => r.writable === true && r.factId === "matter.case_number",
    consequence: "the docket number would stop printing in the caption",
    guards: "no regression"
  },
  // --- wave C -------------------------------------------------------------
  {
    id: "STREET-NC-CV226",
    family: "NC:aoc-cv-226-support-en",
    field: "ApplicantStreetNumberAndStreetNameLine1",
    expect: (r) => r.writable === true && r.factId === "participant.street_address",
    consequence: "a sworn affidavit of indigency filed with no street address anywhere on it",
    guards: "street_address recognising a street written out"
  },
  {
    id: "STREET-LINE-2-NC-CV226",
    family: "NC:aoc-cv-226-support-en",
    field: "ApplicantStreetNumberAndStreetNameLine2",
    expect: (r) => r.writable === false && r.reason === "continuation_line_of_a_block_written_on_its_first_line",
    consequence: "the participant's street address printed twice, once on each line of the block",
    guards: "the continuation-line guard"
  },
  {
    id: "ALT-MAILING-NC-CV226",
    family: "NC:aoc-cv-226-support-en",
    field: "ApplicantFullPermanentMailingAddressCity",
    expect: (r) => r.writable === false && r.reason === "alternate_address_block_not_established_as_different",
    consequence: "a block the form conditions on being different than above, filled with the same city as above",
    guards: "the conditional second address block"
  },
  {
    id: "ALT-MAILING-BINDS-WHEN-STATED",
    family: "NC:aoc-cv-226-support-en",
    field: "ApplicantFullPermanentMailingAddressCity",
    options: { alternateAddressDiffers: true },
    expect: (r) => r.writable === true && r.factId === "participant.mailing_city",
    consequence: "an alternative mailing address the participant did state, left off the form",
    guards: "the conditional block still binding when its condition holds"
  },
  {
    id: "DLSTATE-NC-CR296",
    family: "NC:aoc-cr-296-form-en",
    field: "DLState",
    expect: (r) => r.writable === false && r.category === "government_identifier",
    consequence: "the participant's state of residence printed as the state that issued their licence",
    guards: "government_identifier covering the licence block"
  },
  {
    id: "FORM-NUMBER-NOT-A-ROW-VA-1201",
    family: "VA:cc-1201-form-en",
    field: "User.CaseNumber1201",
    expect: (r) => r.writable === true && r.factId === "matter.case_number",
    consequence: "a form number read as a charge-row index, binding row one of a charge table that was never asked for",
    guards: "rowIndexOf refusing to split a longer number"
  },
  {
    id: "ADULT-NAME-NE-6-12",
    family: "NE:cc-6-12-form-en",
    field: "Adult name",
    expect: (r) => r.writable === true && r.factId === "participant.full_legal_name",
    consequence: "a filed Motion whose caption carries no movant name, on a form whose two companions write it",
    guards: "full_legal_name recognising Nebraska's word for the movant"
  }
];

// Canaries that need the words the form prints, not just the field's name.
const PRINTED_CANARIES = [
  {
    id: "COURT-VS-COUNTY-VA-1201",
    family: "VA:cc-1201-form-en",
    field: "User.CourtName",
    printed: { label: "CITY OR COUNTY", trailing: "Circuit Court" },
    expect: (r) => r.writable === false && r.reason === "field_name_and_printed_caption_disagree",
    consequence: "a petition caption filed reading \"District Court ... Circuit Court\", the court's own name written into the slot for its locality"
  },
  {
    id: "ADDENDUM-COUNT-VA-1201",
    family: "VA:cc-1201-form-en",
    field: "User.CaseNumber1201",
    printed: { trailing: "addendums are attached to this petition and are incorporated" },
    expect: (r) => r.writable === false && r.reason === "printed_words_after_the_blank_describe_a_different_value",
    consequence: "a case number filed as the number of addendums attached to the petition"
  },
  {
    id: "COUNTY-TRAILING-NC-CV226",
    family: "NC:aoc-cv-226-support-en",
    field: "CountyName",
    printed: { label: "STATE OF NORTH CAROLINA", trailing: "County" },
    expect: (r) => r.writable === true && r.factId === "matter.county",
    consequence: "the county silenced on every NC AOC caption, because the heading above the blank is a state and the word County is printed after it"
  },
  {
    id: "ELECTION-CAPTION-VA-1473",
    family: "VA:cc-1473-form-en",
    field: "User.AddressOf",
    printed: { label: "ADDRESS OF [ ] PETITIONER [ ] ATTORNEY FOR PETITIONER" },
    expect: (r) => r.writable === true && r.factId === "participant.street_address",
    consequence: "the petitioner's own address refused off their own petition because the caption offers their attorney as the other option"
  },
  {
    id: "ELECTION-CAPTION-DOES-NOT-UNPROTECT-SIGNATURES",
    family: "VA:cc-1473-form-en",
    field: "User.SignatureLine",
    printed: { label: "SIGNATURE OF [ ] PETITIONER [ ] ATTORNEY FOR PETITIONER" },
    expect: (r) => r.writable === false && r.category === "signature",
    consequence: "an election caption used to unprotect a signature block, which is a kind of box rather than a party"
  },
  {
    id: "UNDECODABLE-CAPTION-DECIDES-NOTHING",
    family: "NC:aoc-cv-226-support-en",
    field: "ApplicantStreetNumberAndStreetNameLine1",
    printed: { label: "\u0000)\u0000X\u0000O\u0000O\u0000\u0003\u00003\u0000H\u0000U\u0000P\u0000D\u0000Q\u0000H\u0000Q\u0000W" },
    expect: (r) => r.writable === true && r.factId === "participant.street_address",
    consequence: "glyph ids read as words: a caption containing a dollar sign only because 'A' is glyph 0x24, and an address refused as money"
  }
];

const failures = [];
console.log("  canaries");
for (const canary of CANARIES) {
  const result = text(canary.field, canary.options);
  const passed = canary.expect(result);
  console.log(`    ${passed ? "ok  " : "FAIL"} ${canary.id.padEnd(20)} ${canary.field.padEnd(26)} → ${result.writable ? `writes ${result.factId}` : `refused ${result.reason}${result.category ? `/${result.category}` : ""}`}`);
  if (!passed) failures.push(`${canary.id} (${canary.family}): ${canary.consequence}`);
}

console.log("  canaries, with the words the form prints");
for (const canary of PRINTED_CANARIES) {
  const result = printed(canary.field, canary.printed);
  const passed = canary.expect(result);
  console.log(`    ${passed ? "ok  " : "FAIL"} ${canary.id.padEnd(44)} ${canary.field.padEnd(24)} → ${result.writable ? `writes ${result.factId}` : `refused ${result.reason}${result.category ? `/${result.category}` : ""}`}`);
  if (!passed) failures.push(`${canary.id} (${canary.family}): ${canary.consequence}`);
}

// ---------------------------------------------------------------------------
// Mutations. Each removes one correction and requires its canary to go red.
// ---------------------------------------------------------------------------

/** Re-run decideBinding's own logic against a rule set with one rule removed. */
function withoutProtectRule(category, name) {
  const hay = haystack(name);
  for (const [id, re] of PROTECT_RULES) {
    if (id === category) continue;
    if (re.test(hay)) return { writable: false, reason: "protected_category", category: id };
  }
  const matches = FACT_DESCRIPTORS.filter((d) => d.match.test(hay) && !(d.refuseWhen && d.refuseWhen.test(hay)));
  return matches.length ? { writable: true, factId: matches[0].factId } : { writable: false, reason: "no_allowlisted_fact_matches" };
}

/** The same, but dropping one descriptor's refuseWhen guard. */
function withoutRefuseWhen(factId, name) {
  const hay = haystack(name);
  for (const [id, re] of PROTECT_RULES) if (re.test(hay)) return { writable: false, reason: "protected_category", category: id };
  const matches = FACT_DESCRIPTORS.filter((d) => {
    if (d.factId === factId) return d.match.test(hay);
    return d.match.test(hay) && !(d.refuseWhen && d.refuseWhen.test(hay));
  });
  return matches.length ? { writable: true, factId: matches[0].factId } : { writable: false, reason: "no_allowlisted_fact_matches" };
}

const MUTATIONS = [
  { id: "drop government_identifier", field: "Def.VitalStats.SSN", run: (f) => withoutProtectRule("government_identifier", f), mustBecomeWritable: true },
  { id: "drop government_identifier", field: "Def.Info.JailId", run: (f) => withoutProtectRule("government_identifier", f), mustBecomeWritable: true },
  { id: "drop cert-date from service_block", field: "certDate", run: (f) => withoutProtectRule("service_block", f), mustBecomeWritable: true },
  { id: "drop street_address.refuseWhen", field: "Def.Address.City", run: (f) => withoutRefuseWhen("participant.street_address", f), mustBind: "participant.street_address" },
  { id: "drop full_legal_name.refuseWhen", field: "NameOfBank", run: (f) => withoutRefuseWhen("participant.full_legal_name", f), mustBind: "participant.full_legal_name" },
  { id: "drop attorney", field: "NameAtty", run: (f) => withoutProtectRule("attorney", f), mustBind: "participant.full_legal_name" },
  // A reachability probe rather than a family field. On NC AOC-CR-296's real
  // `DistrictAttorneyName` the prosecutor rule is not load-bearing at all —
  // the widened attorney rule catches it first — so dropping prosecutor there
  // changes nothing and proves nothing. That redundancy is fine; what still
  // needs proving is that the prosecutor rule is reachable by something, and
  // `solicitor` is a token only it carries.
  { id: "drop prosecutor", field: "SolicitorOfRecordName", run: (f) => withoutProtectRule("prosecutor", f), mustBind: "participant.full_legal_name" }
];

console.log("  mutations");
for (const mutation of MUTATIONS) {
  const mutated = mutation.run(mutation.field);
  const detected = mutation.mustBind
    ? mutated.writable === true && mutated.factId === mutation.mustBind
    : mutated.writable === true;
  console.log(`    ${detected ? "ok  " : "FAIL"} ${mutation.id.padEnd(34)} ${mutation.field.padEnd(22)} → ${mutated.writable ? `writes ${mutated.factId}` : `still refused ${mutated.reason}`}`);
  if (!detected) {
    failures.push(`mutation "${mutation.id}" on ${mutation.field} changed nothing — the rule it removes is not load-bearing, so the canary that covers it proves nothing`);
  }
}

// The rules have to be reachable at all: a protect rule that no name can match
// is dead weight that reads as protection.
for (const category of ["government_identifier", "service_block", "attorney", "prosecutor"]) {
  if (!PROTECT_RULES.some(([id]) => id === category)) failures.push(`PROTECT_RULES no longer carries ${category}`);
}
if (!protectCategoryOf("Defendants ssn")) failures.push("the SSN rule does not fire on a real field name");

if (failures.length) {
  console.error(`FAIL field-semantics canaries — ${failures.length} problem(s)`);
  for (const failure of failures) console.error(`  ${failure}`);
  process.exit(1);
}

console.log(
  `OK field-semantics canaries — ${CANARIES.length + PRINTED_CANARIES.length} canaries hold ` +
    `(${PRINTED_CANARIES.length} of them against the words their form prints), ` +
    `${MUTATIONS.length} mutations each turn their canary red, and the four controls still bind`
);
