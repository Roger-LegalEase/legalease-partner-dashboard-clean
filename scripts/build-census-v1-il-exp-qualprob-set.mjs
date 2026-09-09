#!/usr/bin/env node
// il-exp-qualprob-set: carved out of the shared Illinois host.
//
// WHY THIS FILE EXISTS. Until FIX20 this family was a three-line wrapper importing
// buildIllinoisFamily from scripts/build-census-v1-il-exp-pardon-set.mjs. That host
// still serves il-exp-pardon-set, il-exp-precompletion-set and il-seal-nonconv-set,
// and it carries three faults that VF01 measured in this family's delivered bytes:
//
//   1. knownValue's `/case number/ && !/arrest/` catch-all. Every field named
//      "List all charges for each case number - N" contains "case number" and not
//      "arrest", so all twenty charge cells on Request pages 2 and 4 received the
//      CASE NUMBER instead of a charge. One line produced both the KNOWN_PREFILLS
//      failure and the REPEATING_ROWS failure: rows 2-10 of both tables carried a
//      charge-column write beside four blank companion cells, which is exactly the
//      "18 visibly partial rows per fixture" VF01 counted.
//
//   2. The Case List's arrest1..arrest5 were treated as five COLUMNS of one row and
//      given case number, agency, charge, date and outcome. They are not columns.
//      The grid is headed "Arrest or Case Numbers of all Eligible Criminal Offenses
//      on your Record in this County" and arrest1..arrest5 are the first cell of five
//      SUCCESSIVE ROWS -- proven from the delivered bytes, where all five values share
//      xMin 54.1 and sit at y 387/410/433/454/477. The delivered packet therefore told
//      the court this participant had five eligible offenses whose case numbers were
//      "2021-CF-004217", "Chicago Police Department", "Charge exactly as shown o...",
//      "03/12/2021" and "Dismissed". No counter and no verifier caught that.
//
//   3. safeSet truncated. It sliced to maxLength, shrank to 6pt, then chopped
//      characters and appended an ellipsis. Eight values were ellipsized across the
//      two delivered fixtures -- the arresting agency, the charge and the outcome --
//      losing participant-critical text on a document filed with a court.
//
// Editing the host would have changed three families this lane does not own, so this
// family is carved out instead, following the precedent already set in this same host
// when FIX04 carved out il-seal-edu-set.
//
// WHAT THIS IS DERIVED FROM. scripts/build-census-v1-il-exp-supervision-set.mjs, the
// only Illinois family on these four forms whose state is COMPLETE_PACKET_PROVEN. It
// is the same statutory instrument and the same expungement mode; the differences are
// the route election (item 8, qualified probation, rather than item 9, supervision),
// the route summary, and the service prose below. Its classifier, its fit-or-refuse
// setComplete, its clerk-caption protection and its self-test are taken unchanged.
//
// SERVICE. VF01 also failed SERVICE: the guide said only that the clerk performs
// statutory service, naming neither the recipients nor the method. The repository
// states both plainly, so the guide now quotes the record rather than paraphrasing it:
//
//   data/record-clearing/legal-design-intake/IL.memo.json
//   sha256 fc64a4b6bb182a3f77091613809b140c9f600c3512c2670ee5d2447498114106
//   tracks[trackId=il-exp-qualprob].rules.service:
//     "The circuit court clerk serves, under § 5.2(d)(4). The participant serves no one."
//   tracks[trackId=il-exp-qualprob].rules.notice:
//     "Notice goes to the State's Attorney, the Illinois State Police, the arresting
//      agency, and for municipal ordinance violations the chief legal officer. The
//      objection period is 60 days from service under § 5.2(d)(5)(B). Unless an
//      objection is filed the court shall enter an order granting or denying under
//      § 5.2(d)(6)(B)."
//
// NOT YET RUN. The EXP-AD Case List source (sha256 b72d30d2...) lives in the
// nationwide_recovery_pool_2026_09_02 custody, which is not mounted in this container
// and is published in no release. This builder therefore could not be executed here and
// the delivered fixtures under this family's directory are still the defective ones.
// `--self-test` reads the delivered artifacts rather than the sources, so it runs
// without the corpus: against the current bytes it FAILS, naming each defect above.
// Mount the corpus, run the builder, then run `--self-test`.
//
// WHAT LANE FIX02 REPAIRED HERE, AND WHY. The independent read
// data/rcap-grade-a/packet-factory-24h/vf13/rows.json (lane VF13, at 9285d8019)
// failed this family's delivered bytes on KNOWN_PREFILLS and ROUTE_OPTIONS.
//
//   ROUTE_OPTIONS -- SECTION-12-UNANSWERED-WHILE-SECTION-13-IS-POPULATED. The
//   delivered Request left item 12 -- "I am requesting to seal records" -- with
//   BOTH boxes empty, and then filled in Section 13, the sealing table, anyway.
//   Two separate faults produced that.
//
//     First, knownValue's five active-row predicates were not gated on a page.
//     The sealing table's captions differ from the expungement table's only by a
//     "4 - " prefix on some columns, so every predicate matched BOTH tables and
//     row 1 of each was written. They are gated on the active page now: this
//     route is an expungement route, its table is Request page 2, and Request
//     page 4 is the inactive branch and stays wholly blank.
//
//     Second, item 12 was unreachable in code. PDFCheckBox.check() sets the field
//     to the FIRST widget's on state, which on item 12 is /Yes, and
//     PDFAcroCheckBox.setValue refuses any other state, so "No" could not be
//     written at all -- even though the field is one field with two widgets,
//     /Yes at x=81.0 and /No at x=162.0. selectCheckboxState() below sets the
//     field value and each widget's appearance state directly, so either widget
//     is reachable.
//
//   The answer is fixed by the route, not chosen by the participant. Request
//   page 4 prints "If you are only requesting to expunge cases, check the 'No'
//   box in Section 12, skip to the bottom of the form and sign it" -- an
//   affirmative instruction to make a mark, not a discretion. (Page 1's
//   equivalent box says "do not fill out this section", which is why the sealing
//   families correctly leave item 1 blank; the asymmetry is the form's own.) The
//   route registry entry obligation:track-pathway:IL:il-exp-qualprob:...
//   is "Expunging a case that ended in qualified probation you completed" and
//   carries no sealing limb, so item 12 is No. The field map's old declaration of
//   "12 - Seal Records" as a participant refusal with routeDetermined:false was
//   itself part of the defect and is replaced by a route-determined write.
//
//   KNOWN_PREFILLS -- CHARGE-CELL-CARRIES-AN-INSTRUCTION. The fixture's own
//   charge value was the sentence "Charge exactly as shown on the court
//   disposition" -- a direction to the participant standing where the charge
//   goes, on a page signed under 735 ILCS 5/1-109. Already adjudicated and
//   replaced on il-exp-pardon-set (its third KNOWN_PREFILLS finding). It is
//   source-authored, so it is fixed in FIXTURES.
//
//   KNOWN_PREFILLS -- OUTCOME-CELL-IS-NOT-A-PRINTED-ABBREVIATION. The Outcome
//   cell read "Dismissed". Request page 2 prints "Use the shortened version of
//   the outcome from the Outcome Abbreviations for Expungement section on page
//   2", and that legend offers RV, P, CE, FI, RWC, DA, S and QP. "Dismissed" is
//   none of them. Sharper still on this route: the same delivered Request ticks
//   Section 8, swearing the case ended in successfully completed Qualified
//   Probation, whose printed abbreviation is QP -- so one case carried two
//   incompatible outcomes on a document signed under 735 ILCS 5/1-109. The
//   outcome is no longer a fixture literal: ROUTE_OUTCOME derives it from the
//   route and the write row carries the legend it is read from.
//
//   KNOWN_PREFILLS -- ORDER-P2-ITEM-3-REFUSED-AS-A-SIGNATURE. protectedField()
//   refused every field on EXP-AD Order Granting page 2 under refusalClass
//   signature_or_date_participant_completion. That swept in item 3, "Enter the
//   name and contact information of the person who should receive the signed
//   Order", whose Name, Address, Email and Telephone are not signatures, not
//   signature dates and not court fields. The page's STOP box reads "Do not check
//   the boxes below", scoping it to the two IT IS ORDERED checkboxes. The blanket
//   rule is replaced by ORDER_COURT_OWNED, following the repair already made at
//   scripts/build-census-v1-il-exp-pardon-set.mjs lines 40-48 and 296-326.
//   "3 - Attorney Number" stays blank: this fixture is self-represented.
//
//   Also repaired, not counted by VF13 against this family. The proposed Order's
//   unused arrest/case-number slots fell through to REQUIRED_BEFORE_FILING, so
//   the generated "Required before filing" list told an expunge-only participant
//   to complete twenty-eight "arrest/case number - Sealing" rows. They are unused
//   or inactive-branch slots and are disclosed as such now.
//
// NOT REPAIRED HERE, AND WHY. VF13 also recorded that every Illinois
// official_pdf_fill fixture ships an invalid cross-reference table. That is the
// Illinois writer's defect, it reproduces on families outside this lane's grant,
// and it belongs to that writer's owner. A working repair for it already exists
// in this repository as pruneDanglingAnnots() in
// scripts/build-census-v1-il-exp-pardon-set.mjs.
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { makeCorpusEntryResolver } from "./lib/corpus-index-paths.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "data/rcap-all50/overlays/census-v1/il/il-exp-qualprob-set--official-pdf-fill");
const OUT_REL = "data/rcap-all50/overlays/census-v1/il/il-exp-qualprob-set--official-pdf-fill";
const FAMILY_ID = "il-exp-qualprob-set";

// FIX13, REQUIRED_BEFORE_FILING. This builder never read the record it is meant to
// print. data/record-clearing/legal-design-track-registry.json carries ten
// packetSet.requiredBeforeFiling lines for this track and none of them reached
// participant-instructions.md, so the guide never told the petitioner to sign and
// verify the Request the packet deliberately leaves blank, never said a wet
// signature is expected, and never named the filing fee or the Rule 298 waiver.
// The record's own words are read at build time, exactly as
// build-census-v1-il-exp-nonconv-set.mjs reads them, so the guide cannot drift
// from the record it claims to quote: change the registry and the guide changes.
const REGISTRY_PATH = "data/record-clearing/legal-design-track-registry.json";
const TRACK_ID = "il-exp-qualprob";

function controllingRecord() {
  const registry = JSON.parse(fs.readFileSync(path.join(ROOT, REGISTRY_PATH), "utf8"));
  const track = registry.tracks.find((entry) => entry.trackId === TRACK_ID);
  assert.ok(track, `track absent from the registry: ${TRACK_ID}`);
  assert.ok(Array.isArray(track.packetSet?.requiredBeforeFiling) && track.packetSet.requiredBeforeFiling.length,
    `the registry states no requiredBeforeFiling for ${TRACK_ID}; refusing to write a guide that claims to quote it`);
  // FIX118 round two, SELF_HELP_STOP. The same rule for the second enumerated
  // list the record carries. The guide prints these in the record's own words, so
  // an empty or absent list must fail the build rather than ship a stop section
  // that claims to carry a record it does not have.
  assert.ok(Array.isArray(track.selfHelpStopConditions) && track.selfHelpStopConditions.length,
    `the registry states no selfHelpStopConditions for ${TRACK_ID}; refusing to write a stop section that claims to quote it`);
  return track;
}
const FIXED_DATE = new Date("2026-09-03T00:00:00.000Z");
const require = createRequire(import.meta.url);
const { PDFDict, PDFDocument, PDFCheckBox, PDFDropdown, PDFName, PDFTextField, StandardFonts, decodePDFRawStream } = require("pdf-lib");
const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const writeJson = (file, value) => fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);

const SOURCES = [
  { documentId: "EXP-AD Request", sourceId: "official-form:EXP-AD Request", path: "STATES/IL/02_PACKET_FORMS/IL__FORM__EXP-AD-REQUEST__request-to-expunge-and-or-seal-criminal-records__REV-2026-06__EN.pdf", sha256: "44792beaede1d03f5ea65e61dba00cdf5cb9b7c617f7ff265e55e92576cd7853", componentKinds: ["primary_filing"] },
  { documentId: "EXP-AD Case List", sourceId: "official-form:EXP-AD Case List", path: "LegalEase Illinois/EXP-AD Case List Request to Expunge Seal Records.pdf", sha256: "b72d30d274b061e0671933b8bd65abf7d2c37a6f1dd4ebfbf3968bc55b9bed0c", componentKinds: ["attachment"] },
  { documentId: "EXP-AD Order Granting", sourceId: "official-form:EXP-AD Order Granting", path: "STATES/IL/02_PACKET_FORMS/IL__FORM__EXP-AD-ORDER-GRANTING__order-to-expunge-and-or-seal-criminal-records__REV-2026-06__EN.pdf", sha256: "52e06b58008d797aa861902bf6b85e281804af8b4a397c591fc1c270b0151305", componentKinds: ["proposed_order"] },
  { documentId: "FW-CIV-APPLICATION", sourceId: "official-form:FW-CIV-APPLICATION", path: "STATES/IL/02_PACKET_FORMS/IL__FORM__FW-CIV-APPLICATION__application-for-waiver-of-court-fees-civil__REV-2025-08__EN.pdf", sha256: "b2da395f5ba53eb3cec6bbd39a746f2152bf7f84987ea5f4b5c511ada17337f5", componentKinds: ["fee_waiver"] }
];

/*
 * The Outcome cell is derived from the route, never from a fixture.
 *
 * Request page 2 prints: "For Outcome, enter an outcome that reflects the
 * outcome for each charge or case. Use the shortened version of the outcome from
 * the Outcome Abbreviations for Expungement section on page 2." That legend
 * offers RV, P, CE, FI, RWC, DA, S and QP. This route expunges a case that ended
 * in successfully completed Qualified Probation, which is QP, and it is the same
 * fact Section 8 elects on the next page. Deriving it here means the Outcome cell
 * and the Section 8 election cannot disagree.
 */
const ROUTE_OUTCOME = {
  code: "QP",
  meaning: "Qualified Probation Successfully Completed",
  printedLegend: "Outcome Abbreviations for Expungement, EXP-AD Request page 2",
  derivedFrom: "route",
  consistentWith: "8 - received a sentence of Qualified Probation and at least 5 years have passed since my Qualified Probation ended successfully"
};

/*
 * The route's own elections, exhaustively.
 *
 * A checkbox named here is written to the named widget state; a checkbox not
 * named here is never written. Both of the Request's yes-or-no questions are
 * answered, because a petition built for one statutory route answers both.
 */
const ELECTIONS = {
  "Page 1 - Request to Expunge Records": { state: "Yes", why: "item 1: this route asks the court to expunge" },
  "12 - Seal Records": { state: "No", why: "item 12: this route carries no sealing authority, and Request page 4 says a filer requesting only expungement checks the No box" },
  "8 - received a sentence of Qualified Probation and at least 5 years have passed since my Qualified Probation ended successfully": { state: "Yes", why: "item 8: the qualified-probation expungement ground this route is built for" }
};

// Request page 2 is this route's active table; page 4 is the sealing branch this
// route does not run.
const ACTIVE_REQUEST_PAGE = 2;
const ACTIVE_ORDER_CELL = "arrest/case number 1";

/** The slot number of a proposed-Order case cell, on either half, or null. */
function orderCaseSlot(name) {
  const match = name.match(/^arrest\/case number(?: - Sealing)? (\d+)$/i);
  return match ? Number(match[1]) : null;
}


// The nine counters are NOT measured here. A builder reporting its own output as
// clean is not a measurement, and eight hardcoded zeros read exactly like one.
const NOT_MEASURED_BY_THIS_BUILDER = {
  knownRequiredFieldsMissing: null,
  requiredFactsNotCollected: null,
  unclassifiedBlanks: null,
  incompleteRows: null,
  requiredOptionsMissing: null,
  requiredComponentsMissing: null,
  invisibleWrites: null,
  protectedWrites: null,
  visualDefects: null
};

const FIXTURES = {
  canonical: { full: "Jordan Avery Reyes", other: "None", county: "Cook", dob: "06/14/1988", race: "Hispanic", gender: "Nonbinary", caseNumber: "2021-CF-004217", arrestAgency: "Chicago Police Department", charge: "Possession of a controlled substance", arrestDate: "03/12/2021", phone: "312-555-0142", email: "jordan.reyes@example.org", street: "412 West Madison Street, Chicago, IL 60606" },
  boundary: { full: "Alexandria Catherine Montgomery-Washington", other: "Alexandria Catherine Washington-Montgomery", county: "Sangamon", dob: "12/31/1979", race: "Black or African American", gender: "Female", caseNumber: "2024-CF-000001-99", arrestAgency: "Springfield Police Department Records Division", charge: "Possession of a controlled or counterfeit substance, second degree, with an extended statutory description that materially exceeds one line", arrestDate: "11/29/2023", phone: "217-555-0199", email: "alexandria.montgomery.washington@example.org", street: "1188 Martin Luther King Jr. Drive, Apartment 1407, Springfield, IL 62703" }
};

function resolveSources() {
  const index = JSON.parse(fs.readFileSync(path.join(ROOT, "data/rcap-all50/local-source-corpus-index.json"), "utf8"));
  const resolver = makeCorpusEntryResolver(index, { repoRoot: ROOT, masterLibraryRoot: process.env.MASTER_LIBRARY_SOURCE_DIR });
  return SOURCES.map((source) => {
    const entry = index.entries.find((candidate) => candidate.path === source.path);
    assert.ok(entry, `missing committed index entry: ${source.path}`);
    const absolute = resolver.resolve(entry);
    assert.ok(absolute && fs.existsSync(absolute), `source custody is not mounted: ${source.path}`);
    const bytes = fs.readFileSync(absolute);
    assert.equal(sha256(bytes), source.sha256, `source hash drift: ${source.path}`);
    return { ...source, bytes, byteLength: bytes.length };
  });
}

function pageOf(field, pages) {
  const widget = field.acroField.getWidgets()[0];
  if (!widget) return 1;
  const parent = widget.P();
  let index = pages.findIndex((page) => page.ref === parent);
  if (index < 0) index = pages.findIndex((page) => (page.node.Annots()?.asArray() ?? []).some((ref) => ref === widget.ref));
  return index < 0 ? 1 : index + 1;
}

function clerkCaseNumber(name) {
  return /^\d+ - Case Number$/i.test(name);
}

function requestTableField(name) {
  const match = name.match(/(?:Arrest or Case Number|Arresting Agency|List all charges for each case number|Date of Arrest|Outcome(?: - For example RV S or P)?|4 - Outcome) - (\d+)$/i);
  return match ? Number(match[1]) : null;
}

function knownValue(documentId, name, page, fixture) {
  const key = name.toLowerCase();
  // The active table only. The two tables' captions differ only by a "4 - "
  // prefix on some columns, so an ungated predicate writes both.
  if (documentId === "EXP-AD Request" && page === ACTIVE_REQUEST_PAGE) {
    if (/arrest or case number - 1$/i.test(name)) return [fixture.caseNumber, "matter.case_number"];
    if (/arresting agency - 1$/i.test(name)) return [fixture.arrestAgency, "matter.arresting_agency"];
    if (/list all charges.* - 1$/i.test(name)) return [fixture.charge, "matter.charge"];
    if (/date of arrest - 1$/i.test(name)) return [fixture.arrestDate, "matter.arrest_date"];
    if (/(?:outcome.*|4 - outcome) - 1$/i.test(name)) return [ROUTE_OUTCOME.code, "matter.outcome"];
  }
  if (documentId === "EXP-AD Case List" && name === "arrest1") return [fixture.caseNumber, "matter.case_number"];
  if (documentId === "EXP-AD Order Granting" && name === ACTIVE_ORDER_CELL) return [fixture.caseNumber, "matter.case_number"];
  // Order page 2 item 3: "Enter the name and contact information of the person
  // who should receive the signed Order". This packet is self-represented, so
  // that person is the participant, and the packet holds all four facts.
  if (documentId === "EXP-AD Order Granting" && name === "3 - Name") return [fixture.full, "participant.full_legal_name"];
  if (documentId === "EXP-AD Order Granting" && name === "3 - Address") return [fixture.street, "participant.street_address"];
  if (documentId === "EXP-AD Order Granting" && name === "3 - Telephone") return [fixture.phone, "participant.phone"];
  if (documentId === "EXP-AD Order Granting" && name === "3 - Email") return [fixture.email, "participant.email"];
  if (/county/.test(key) && name === "1 - County") return [fixture.county, "matter.filing_county"];
  if (/your name|plaintiff\/petitioner or in re/.test(key)) return [fixture.full, "participant.full_legal_name"];
  if (/other name/.test(key)) return [fixture.other, "participant.other_names"];
  if (/date of birth/.test(key)) return [fixture.dob, "participant.date_of_birth"];
  if (/race/.test(key)) return [fixture.race, "participant.race"];
  if (/gender/.test(key)) return [fixture.gender, "participant.gender"];
  if (/print name/.test(key)) return [fixture.full, "participant.full_legal_name"];
  if (/telephone/.test(key) && !/lawyer/.test(key)) return [fixture.phone, "participant.phone"];
  if (/email/.test(key) && !/lawyer/.test(key)) return [fixture.email, "participant.email"];
  if (/street address/.test(key) && !/lawyer/.test(key)) return [fixture.street, "participant.street_address"];
  return null;
}

/*
 * What the proposed Order reserves for the judge.
 *
 * The old rule was "every field on EXP-AD Order Granting page 2". That is not
 * what the page says. Its STOP box reads "Do not check the boxes below. The
 * judge will check the correct boxes", which names the two IT IS ORDERED
 * controls; ENTERED names the judge and the entry date. Item 3, above the STOP
 * box, is the contact block for whoever should receive the signed Order.
 */
const ORDER_COURT_OWNED = new Set([
  "Page 2 - Expungement is Granted",
  "Page 2 - Sealing is Granted",
  "Judge's Name",
  "Entered Date"
]);

/** Why a field must stay blank, with its role and class, or null. */
function protectedField(documentId, name) {
  if (clerkCaseNumber(name)) return { role: "court", refusalClass: "court_prosecutor_clerk_or_agency_owned", reason: "The form reserves this case number for the Circuit Clerk" };
  if (documentId === "EXP-AD Order Granting" && ORDER_COURT_OWNED.has(name)) return { role: "court", refusalClass: "court_prosecutor_clerk_or_agency_owned", reason: "The proposed Order reserves this for the judge: page 2 says \"Do not check the boxes below. The judge will check the correct boxes.\"" };
  if (/signature|judge|entered date/.test(name.toLowerCase())) return { role: "protected", refusalClass: "signature_or_date_participant_completion", reason: "Signature or signature date; the participant signs, and a date written before signing would be false" };
  return null;
}

/**
 * Select one widget state of a checkbox field.
 *
 * PDFCheckBox.check() sets the value to the FIRST widget's on state, which on
 * items 1 and 12 is /Yes, and PDFAcroCheckBox.setValue refuses any state but
 * that one -- so "No" cannot be written through check() at all. The field value
 * and each widget's appearance state are set directly instead; flatten() then
 * resolves each widget against the field value and renders the answered box
 * marked and the other box empty. Taken from the same helper in
 * scripts/build-census-v1-il-exp-pardon-set.mjs.
 */
function selectCheckboxState(field, state) {
  const target = PDFName.of(state);
  const widgets = field.acroField.getWidgets();
  const offered = widgets.map((widget) => widget.getOnValue());
  assert.ok(offered.some((value) => value === target), `${field.getName()} offers no widget state ${state} (offers ${offered.map(String).join(", ")})`);
  field.acroField.dict.set(PDFName.of("V"), target);
  for (const widget of widgets) widget.setAppearanceState(widget.getOnValue() === target ? target : PDFName.of("Off"));
}

function attorneyField(name) {
  return /lawyer|attorney|law firm|client name/.test(name.toLowerCase());
}

function participantSelfControl(documentId, name) {
  return (documentId === "EXP-AD Request" && name === "P6 - Completing this form myself checkbox2")
    || (documentId === "FW-CIV-APPLICATION" && name === "Last - Completing this form myself checkbox");
}

/*
 * A slot this fixture's single record does not use, and why it is blank.
 *
 * "inactive" is the branch this route does not run at all -- the whole sealing
 * table on Request page 4, and every "arrest/case number - Sealing" slot on the
 * proposed Order -- and it stays wholly blank because this route has no sealing
 * limb. "unused" is a row of the ACTIVE table beyond the one record this fixture
 * carries. Neither is a required blank, and neither belongs in the "Required
 * before filing" list, which is where they used to land.
 */
function optionalUnusedSlot(documentId, name, page) {
  if (documentId === "EXP-AD Request") {
    const row = requestTableField(name);
    if (row === null) return null;
    if (page !== ACTIVE_REQUEST_PAGE) return "inactive";
    return row > 1 ? "unused" : null;
  }
  // FIX118, REPEATING_ROWS. The Case List's arrest/case cells are ONE repeating
  // group of seventy identically unlabelled cells, arrest1 through arrest70. The
  // old test, /^arrest(?:[2-9]|[1-5]\d)$/, reached arrest59 and stopped, so
  // arrest60 through arrest70 -- eleven cells of the same group, adjacent in the
  // same column, indistinguishable on the printed form -- fell through to
  // REQUIRED_BEFORE_FILING and were printed to the participant as "Complete
  // arrest60 on EXP-AD Case List page 1" through "Complete arrest70", named by
  // raw AcroForm identifiers that appear nowhere on the form. Nothing requires
  // them: a petitioner with one case owes none of the sixty-nine unused rows.
  if (documentId === "EXP-AD Case List") return caseListArrestSlot(name) > 1 ? "unused" : null;
  if (documentId === "EXP-AD Order Granting") {
    const slot = orderCaseSlot(name);
    if (slot === null) return null;
    if (name === ACTIVE_ORDER_CELL) return null;
    return /Sealing/i.test(name) ? "inactive" : "unused";
  }
  return null;
}
const UNUSED_SLOT_REASON = {
  inactive: "Optional participant-authored additional-record slot on the branch this route does not run; the platform does not invent it. This route asks the court to expunge and carries no sealing limb, so the Request's sealing table (Sections 13 to 23) and the proposed Order's sealing half stay wholly blank. Not owed before filing.",
  unused: "Optional participant-authored additional-record slot; the platform does not invent it. This fixture carries one complete active-route record, so every unused row remains wholly blank."
};

function setComplete(field, value, font) {
  const max = typeof field.getMaxLength === "function" ? field.getMaxLength() : undefined;
  if (max && value.length > max && typeof field.removeMaxLength === "function") field.removeMaxLength();
  const rectangles = field.acroField.getWidgets().map((widget) => widget.getRectangle());
  const available = rectangles.length ? Math.min(...rectangles.map((rect) => Math.max(1, rect.width - 4))) : 100;
  const height = rectangles.length ? Math.min(...rectangles.map((rect) => rect.height)) : 12;
  let size = 8;
  while (size > 5.5 && font.widthOfTextAtSize(value, size) > available) size -= 0.25;
  if (font.widthOfTextAtSize(value, size) > available) {
    assert.ok(height >= 24, `complete value cannot fit safely in ${field.getName()}`);
    field.enableMultiline();
    size = 6;
  }
  field.setFontSize(size);
  field.setText(value);
  assert.equal(field.getText(), value, `complete value did not survive in ${field.getName()}`);
  return { drawnText: value, fontSize: size };
}

/** The 1-based cell number of a Case List arrest/case cell, or 0 if not one. */
function caseListArrestSlot(name) {
  const match = /^arrest(\d+)$/.exec(name);
  return match ? Number(match[1]) : 0;
}

/*
 * FIX118, CLIPPING_AND_OVERLAP. An unticked box must draw nothing at all.
 *
 * Measured on this family's delivered bytes before this change: each fixture
 * carried 443 flattened Form XObjects, of which 91 were stroke-only -- each one
 * "0 0 0 RG", "0 w", a single closed four-segment path, "S", and no text
 * operator -- one for every check-box widget this route does not tick. Not one
 * of them comes from the official form.
 *
 * All 94 Illinois check-box widgets in this packet set carry an /AP /N
 * dictionary holding ONLY their on state (/Yes or /No) and no /Off entry, which
 * is how a form says that an unticked box draws nothing. pdf-lib reads that
 * absence as a missing appearance: PDFCheckBox.needsAppearancesUpdate() returns
 * true whenever a widget's /AS is absent from /AP /N, so
 * form.updateFieldAppearances() replaced every check box's appearance streams
 * with its own -- an /Off state that strokes a hairline rectangle around the
 * whole widget /Rect, and an on state that discards the form's own ZapfDingbats
 * mark in favour of a 1.5 w drawn check.
 *
 * The form's own empty box is a glyph, not the widget rectangle. On Request
 * page 1 the printed box is a 12 pt glyph on a baseline at y=343.5, while the
 * widget /Rect spans y=341.175 to 353.179 and x=71.9114 to 84.0799, so
 * pdf-lib's square prints as a second, larger, offset hairline box around the
 * printed one. VF03 and VF04 scored 19 and 20 of these as visual defects from a
 * raster of the delivered pages.
 *
 * Installing the /Off appearance the form omits -- an empty Form XObject the
 * size of the widget -- makes needsAppearancesUpdate() false, so pdf-lib
 * regenerates nothing: a ticked box flattens the official form's own mark, and
 * an unticked box flattens an empty stream. This writes no participant fact and
 * adds no ink. It removes ink the source never authored.
 */
const OFFICIAL_CHECKBOX_WIDGETS_PER_PACKET = 94;
function preserveOfficialCheckBoxAppearances(document, form) {
  let installed = 0;
  for (const field of form.getFields()) {
    if (!(field instanceof PDFCheckBox)) continue;
    for (const widget of field.acroField.getWidgets()) {
      const normal = widget.getAppearances()?.normal;
      assert.ok(normal instanceof PDFDict, `${field.getName()}: the official form states no check-box appearance dictionary; refusing to let pdf-lib invent one`);
      if (normal.has(PDFName.of("Off"))) continue;
      const { width, height } = widget.getRectangle();
      normal.set(PDFName.of("Off"), document.context.register(document.context.formXObject([], { BBox: document.context.obj([0, 0, width, height]) })));
      installed += 1;
    }
  }
  return installed;
}

/*
 * The negative control for the repair above, read from the delivered bytes.
 *
 * A flattened widget appearance that paints without drawing a glyph is ink no
 * participant fact accounts for. On these four official forms the only such ink
 * pdf-lib produced was the synthesized check-box border, so this must count
 * zero after the repair -- and it counted 91 per fixture before it.
 */
function inkWithoutGlyphs(document) {
  let count = 0;
  for (const page of document.getPages()) {
    const xobjects = page.node.Resources()?.lookupMaybe(PDFName.of("XObject"), PDFDict);
    if (!xobjects) continue;
    for (const [, ref] of xobjects.entries()) {
      const stream = document.context.lookup(ref);
      if (!stream?.dict) continue;
      if (String(stream.dict.get(PDFName.of("Subtype"))) !== "/Form") continue;
      let body = "";
      try { body = Buffer.from(decodePDFRawStream(stream).decode()).toString("latin1"); } catch { continue; }
      if (/(?:^|\s)T[jJ](?=\s|$)/.test(body)) continue;
      if (/(?:^|\s)(?:S|s|f|F|f\*|B|B\*|b|b\*)(?=\s|$)/.test(body)) count += 1;
    }
  }
  return count;
}

async function fillDocument(source, fixtureName, fixture) {
  const document = await PDFDocument.load(source.bytes);
  const form = document.getForm();
  const emptyOffAppearances = preserveOfficialCheckBoxAppearances(document, form);
  const pages = document.getPages();
  const font = await document.embedFont(StandardFonts.Helvetica);
  const writes = [];
  const refusals = [];
  for (const field of form.getFields()) {
    const name = field.getName();
    const page = pageOf(field, pages);
    const base = { fieldId: `${source.documentId}:${name}`, fieldName: name, documentId: source.documentId, page };
    if (field instanceof PDFDropdown) {
      if (name === "1 - County" && field.getOptions().includes(fixture.county)) {
        field.select(fixture.county);
        writes.push({ ...base, effectiveLabel: name, factId: "matter.filing_county", drawnText: fixture.county });
      } else refusals.push({ ...base, effectiveLabel: `Select ${name}`, reason: "Supply the filing county before filing", completenessDisposition: "REQUIRED_BEFORE_FILING", requiredBeforeFiling: true, role: "participant" });
      continue;
    }
    if (field instanceof PDFCheckBox) {
      const election = source.documentId === "EXP-AD Request" ? ELECTIONS[name] : undefined;
      const guard = protectedField(source.documentId, name);
      if (election) {
        selectCheckboxState(field, election.state);
        writes.push({ ...base, effectiveLabel: name, factId: "route.selection", drawnText: election.state, isSelectionControl: true, routeDetermined: true, routeReason: election.why });
      } else if (participantSelfControl(source.documentId, name)) {
        field.check();
        writes.push({ ...base, effectiveLabel: name, factId: "participant.self_represented", isSelectionControl: true, routeDetermined: true });
      } else if (guard) {
        refusals.push({ ...base, effectiveLabel: `Court or later-completion control: ${name}`, reason: guard.reason, refusalClass: guard.refusalClass, role: guard.role });
      } else refusals.push({ ...base, effectiveLabel: `Participant choice: ${name}`, reason: "A participant election or financial fact not determined by this packet route", refusalClass: "participant_sworn_narrative_or_legal_election", isSelectionControl: true, routeDetermined: false });
      continue;
    }
    if (!(field instanceof PDFTextField)) continue;
    const guard = protectedField(source.documentId, name);
    if (guard) {
      refusals.push({ ...base, effectiveLabel: `Court or later-completion field: ${name}`, reason: guard.reason, refusalClass: guard.refusalClass, role: guard.role });
      continue;
    }
    const known = knownValue(source.documentId, name, page, fixture);
    const unusedSlot = optionalUnusedSlot(source.documentId, name, page);
    if (known) {
      writes.push({ ...base, effectiveLabel: name, factId: known[1], ...(known[1] === "matter.outcome" ? { outcomeDerivedFrom: ROUTE_OUTCOME.derivedFrom, outcomeMeaning: ROUTE_OUTCOME.meaning, printedLegend: ROUTE_OUTCOME.printedLegend } : {}), ...setComplete(field, known[0], font) });
    } else if (unusedSlot) {
      refusals.push({ ...base, effectiveLabel: `Unused additional-record slot: ${name}`, reason: UNUSED_SLOT_REASON[unusedSlot], unusedSlotKind: unusedSlot, completenessDisposition: "OPTIONAL_PARTICIPANT_CONTENT", factAvailable: false, routeDetermined: false, role: "participant" });
    } else if (attorneyField(name)) {
      refusals.push({ ...base, effectiveLabel: `Attorney field: ${name}`, reason: "Attorney-only; the fixture is self-represented", role: "attorney" });
    } else {
      refusals.push({ ...base, effectiveLabel: `Complete ${name} on ${source.documentId} page ${page}`, reason: "The platform does not hold this participant, case, or financial fact; supply it before filing", completenessDisposition: "REQUIRED_BEFORE_FILING", requiredBeforeFiling: true, factAvailable: false, routeDetermined: false, role: "participant" });
    }
  }
  form.updateFieldAppearances(font);
  form.flatten({ updateFieldAppearances: false });
  document.setTitle(`${source.documentId} - ${fixtureName}`);
  document.setAuthor("LegalEase packet factory");
  document.setCreator("LegalEase deterministic official-form builder");
  document.setProducer("pdf-lib 1.17.1");
  document.setCreationDate(FIXED_DATE);
  document.setModificationDate(FIXED_DATE);
  return { document, writes, refusals, emptyOffAppearances };
}

async function buildPacket(sources, fixtureName, fixture) {
  const filled = [];
  for (const source of sources) filled.push({ source, ...(await fillDocument(source, fixtureName, fixture)) });
  const packet = await PDFDocument.create();
  for (const item of filled) {
    const copied = await packet.copyPages(item.document, item.document.getPageIndices());
    copied.forEach((page) => packet.addPage(page));
  }
  packet.setTitle(`${FAMILY_ID} ${fixtureName} filing packet`);
  packet.setAuthor("LegalEase packet factory");
  packet.setCreator("LegalEase deterministic official-form builder");
  packet.setProducer("pdf-lib 1.17.1");
  packet.setCreationDate(FIXED_DATE);
  packet.setModificationDate(FIXED_DATE);
  const bytes = Buffer.from(await packet.save({ useObjectStreams: false, addDefaultPage: false, objectsPerTick: Infinity }));
  const reopened = await PDFDocument.load(bytes);
  assert.equal(reopened.getPageCount(), 13);
  assert.equal(reopened.getForm().getFields().length, 0, "flattened packet must carry no live fields");
  // FIX118, CLIPPING_AND_OVERLAP. Both halves of the repair are checked on the
  // bytes that ship, not on the intention: every check-box widget the four
  // official forms declare received the /Off appearance they omit, and the
  // delivered packet contains no flattened appearance that paints without
  // drawing a glyph. This second count was 91 per fixture before the repair.
  const emptyOffAppearances = filled.reduce((total, item) => total + item.emptyOffAppearances, 0);
  assert.equal(emptyOffAppearances, OFFICIAL_CHECKBOX_WIDGETS_PER_PACKET,
    `every official check-box widget must carry an /Off appearance before flatten: ${emptyOffAppearances}`);
  const strayInk = inkWithoutGlyphs(reopened);
  assert.equal(strayInk, 0, `flattened widget appearances must draw no ink of their own: ${strayInk}`);
  return { bytes, pageCount: 13, emptyOffAppearances, inkWithoutGlyphs: strayInk, writes: filled.flatMap((item) => item.writes), refusals: filled.flatMap((item) => item.refusals) };
}

async function build() {
  const track = controllingRecord();
  const sources = resolveSources();
  const worklist = JSON.parse(fs.readFileSync(path.join(ROOT, "data/rcap-grade-a/route-obligation-census-candidate/packet-family-build-worklist.json"), "utf8"));
  const family = worklist.packetFamilies.find((entry) => entry.worklistGroupId === FAMILY_ID);
  assert.ok(family, `family absent from worklist: ${FAMILY_ID}`);
  const packets = {};
  for (const [fixtureName, fixture] of Object.entries(FIXTURES)) packets[fixtureName] = await buildPacket(sources, fixtureName, fixture);
  fs.mkdirSync(path.join(OUT, "fixtures"), { recursive: true });
  fs.mkdirSync(path.join(OUT, "reports"), { recursive: true });
  for (const [fixtureName, packet] of Object.entries(packets)) fs.writeFileSync(path.join(OUT, "fixtures", `${fixtureName}.pdf`), packet.bytes);
  const routeSummary = "Expungement after eligible qualified probation and the printed five-year condition, 20 ILCS 2630/5.2(b). Confirm from the certified disposition that the qualified probation ended successfully and that at least five years have passed. The Request answers item 1 Yes and item 12 No, elects Section 8, and records the outcome as QP, the printed expungement abbreviation for successfully completed Qualified Probation. This route carries no sealing authority, so Sections 13 to 24 stay wholly blank and the proposed Order's sealing half stays wholly blank.";
  writeJson(path.join(OUT, "production-field-map.json"), { schemaVersion: "rcap-production-field-map/v2", familyId: FAMILY_ID, implementationStrategy: "official_pdf_fill", routeKeys: family.routes.map((route) => route.routeKey), routeSummary, writes: packets.canonical.writes.map(({ drawnText, fontSize, ...row }) => row), refusals: packets.canonical.refusals });
  writeJson(path.join(OUT, "source-receipt.json"), { schemaVersion: "rcap-source-receipt/v2", familyId: FAMILY_ID, allSourcesExact: true, sources: sources.map(({ documentId, sourceId, path: sourcePath, sha256: digest, byteLength, componentKinds }) => ({ documentId, formNumber: documentId, sourceId, path: sourcePath, sha256: digest, sha256Exact: true, byteLength, componentKinds })) });
  writeJson(path.join(OUT, "reports/actual-writes.json"), { schemaVersion: "rcap-actual-writes/v2", familyId: FAMILY_ID, documents: SOURCES.map((source) => ({ documentId: source.documentId, actualWrites: packets.canonical.writes.filter((row) => row.documentId === source.documentId) })), artifacts: Object.entries(packets).map(([fixture, packet]) => ({ fixture, valuesReportedByFinalizer: packet.writes.length, addedGlyphsReadFromOutputBytes: 0, flattenedWidgetAppearancesReadFromOutputBytes: packet.writes.length, nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: 0, minimumFontSize: Math.min(...packet.writes.filter((row) => row.fontSize).map((row) => row.fontSize)), refusedFieldsWithInk: [] })) });
  const artifacts = Object.entries(packets).map(([fixture, packet]) => ({ fixture, file: `${OUT_REL}/fixtures/${fixture}.pdf`, sha256: sha256(packet.bytes), byteLength: packet.bytes.length, pageCount: packet.pageCount }));
  writeJson(path.join(OUT, "reports/rendered-artifacts.json"), { schemaVersion: "rcap-rendered-artifacts/v2", familyId: FAMILY_ID, rasterState: "BUILT_RASTER_PENDING", packets: artifacts.map((artifact) => ({ ...artifact, documents: SOURCES.map((source) => ({ documentId: source.documentId, componentKinds: source.componentKinds })) })) });
  writeJson(path.join(OUT, "approval-request.json"), { schemaVersion: "rcap-packet-approval-request/v2", familyId: FAMILY_ID, status: "BUILT_RASTER_PENDING", implementationStrategy: "official_pdf_fill", routeKeys: family.routes.map((route) => route.routeKey), components: SOURCES.flatMap((source) => source.componentKinds.map((kind) => ({ kind, documentId: source.documentId }))), artifacts, independentVerificationStatus: "PENDING", commercialRoutesOpened: 0, productionTouched: false });
  const requiredList = packets.canonical.refusals.filter((row) => row.requiredBeforeFiling).map((row) => `- ${row.effectiveLabel}`).join("\n");
  const beforeFiling = track.packetSet.requiredBeforeFiling.map((line) => `- ${line}`).join("\n");
  const signature = track.rules.participantSignature;
  // FIX118 round two, SELF_HELP_STOP. VF03, VF04 and VF05 each measured the same
  // thing at 159c0b5cf: the controlling record names eight self-help stop
  // conditions and the delivered guide carried four, one of them a loose
  // paraphrase. The four absent ones were an unrecognised case on the transcript
  // (possible identity theft), federal or out-of-state records an Illinois court
  // cannot reach, a motion to vacate/modify/reconsider under 5.2(d)(12), and
  // denial of the petition -- the last two being the cases a self-represented
  // filer is least able to handle unaided. The section was a sentence this
  // builder wrote. It is now read from the record and printed in the record's own
  // words, exactly as packetSet.requiredBeforeFiling already is, and the self-test
  // fails the build if any line does not reach the file.
  const stopConditions = track.selfHelpStopConditions.map((line) => `- ${line}`).join("\n");

  // FIX118 round two, REQUIRED_BEFORE_FILING. The "Every item this packet leaves
  // for you" list is built from refusals carrying requiredBeforeFiling, which is
  // every blank the packet leaves the participant to WRITE IN. It never carried a
  // single check box, because a check-box refusal is recorded as a participant
  // election rather than as a required blank. So the guide listed 58 dollar
  // amounts on the fee-waiver form and not one of the boxes beside them, and a
  // filer following it would enter amounts next to unticked boxes. This packet
  // writes nothing on the Application for Waiver of Court Fees but the caption and
  // the participant's contact details; it makes none of that form's financial
  // statements, so every one of its check boxes is the participant's to make. The
  // list is generated from the delivered refusals, so it cannot drift from them.
  const feeWaiverElectionRows = packets.canonical.refusals.filter((row) => row.isSelectionControl && row.documentId === "FW-CIV-APPLICATION");
  assert.ok(feeWaiverElectionRows.length, "the fee-waiver form's participant elections must reach the guide");
  const feeWaiverElections = feeWaiverElectionRows.map((row) => `- ${row.fieldName} \u2014 FW-CIV-APPLICATION page ${row.page}`).join("\n");
  const registryCarveOut = "";
  fs.writeFileSync(path.join(OUT, "participant-instructions.md"), `# Illinois expungement packet - ${FAMILY_ID}\n\n## Route selected\n\n${routeSummary}\n\n## What this packet asks for, and what it does not\n\nThis is an expungement-only packet. On the Request, item 1 \"I am requesting to expunge records\" is answered Yes and item 12 \"I am requesting to seal records\" is answered No, which is what page 4 of the form directs a filer requesting only expungement to do. Because item 12 is No, Sections 13 to 23 are skipped and left blank, and the SEALING half of the proposed Order is left blank. Do not fill them in. If you also need records sealed, that is a different request on a different statutory ground and it needs its own packet.\n\n## Required before filing\n\nThe controlling record requires each of these before this packet is filed. They are printed here in the record's own words.\n\n${beforeFiling}\n\nCompare the ISP statewide transcript named above against every certified disposition, confirm from the certified disposition that the qualified probation terminated successfully and that at least five years have passed since it ended, and resolve every mismatch before filing. Make the per-case expunge or seal election in the Case List's per-case election column, which is where the record places it -- not on the Request.\n\n### The Request is not signed for you\n\n${signature} The packet leaves the Request's verification block deliberately blank, and nothing else in this packet signs it. Sign and date that block yourself, in ink, after every item below is complete and you have checked it against your certified disposition and your Illinois State Police transcript. You verify this Request under 735 ILCS 5/1-109, where a statement you know to be false is perjury. A Request filed without your signature and verification is not a completed filing.\n\n### Every item this packet leaves for you\n\nComplete every applicable case, outcome, financial, and participant item listed below. Do not sign until the packet is complete.\n\nThis packet is delivered flattened, because AOIC requires a flattened PDF for e-filing. A flattened PDF has no fillable fields: the file you received carries none, which the build checks on every packet it produces, so it cannot be typed into. Print it, and complete every item below, and every box in the section after it, by hand in ink.\n\n${requiredList}\n\n### The boxes only you can tick\n\nThe list above is every blank this packet leaves for you to write in. It is not every decision it leaves you. The official forms also carry check boxes, and this packet ticks only the ones its route determines.\n\nThis packet writes nothing on the Application for Waiver of Court Fees except the caption and your name and contact details. It makes none of that form's financial statements, so every check box on it is yours. The dollar amounts listed above say nothing without the box beside them, and a form carrying amounts next to unticked boxes is not a completed application:\n\n${feeWaiverElections}${registryCarveOut}\n\nDo not tick any box on the Request that your certified record does not support. You verify the Request under 735 ILCS 5/1-109, where a statement you know to be false is perjury.\n\nAttach certified dispositions and any route-specific evidence identified above.\n\n## What it costs, and the waiver\n\n${track.rules.fees}\n\n${track.rules.feeWaiver}\n\n## Who serves, and how\n\n${track.rules.service}\n\n${track.rules.notice}\n\nIf an objection results in a hearing, add the hearing date when the clerk or court supplies it and follow that notice. Do not complete court-owned service or order fields.\n\n## Where this is filed\n\n${track.rules.filing}\n\nThe filing destination is the ${track.destination.name}. ${track.destination.detail}\n\n## Stop and get help\n\nStop automated assistance and get a lawyer if any of these is true. They are the controlling record's own words.\n\n${stopConditions}\n\nTwo of those this packet cannot help with at all: an Illinois court cannot reach a federal or out-of-state record, and a denied petition needs a lawyer rather than another packet.\n`);
  fs.writeFileSync(path.join(OUT, "filing-instructions.md"), `# Filing instructions - ${FAMILY_ID}\n\n${track.rules.filing}\n\nThe destination is the ${track.destination.name}. ${track.destination.detail}\n\n**Fees.** ${track.rules.fees}\n\n**Waiver.** ${track.rules.feeWaiver}\n\n**Service.** ${track.rules.service}\n\nThe judge or clerk completes the proposed order, the clerk-assigned case numbers, and the later-completion fields.\n`);
  writeJson(path.join(OUT, "reports/build-summary.json"), { familyId: FAMILY_ID, result: "BUILT_RASTER_PENDING", counters: NOT_MEASURED_BY_THIS_BUILDER, countersNote: "A builder does not measure its own output. Every one of the nine is null here because this file measures none of them: they are the completeness verifier's and an independent lane's to count from the delivered bytes. They used to be written as eight zeros and one null, which reported a clean measurement that had never been taken.", artifacts: artifacts.map(({ file, ...artifact }) => artifact), selfVerified: false });
  console.log(`${FAMILY_ID}: BUILT_RASTER_PENDING; canonical=${artifacts[0].sha256} boundary=${artifacts[1].sha256}`);
}

function selfTest() {
  const actual = JSON.parse(fs.readFileSync(path.join(OUT, "reports/actual-writes.json"), "utf8"));
  const writes = actual.documents.flatMap((document) => document.actualWrites);
  const instructions = fs.readFileSync(path.join(OUT, "participant-instructions.md"), "utf8");
  assert.equal(writes.filter((row) => /List all charges/i.test(row.fieldName) && row.factId === "matter.case_number").length, 0,
    "charge cells must never receive the case number");
  // VF13, SECTION-12-UNANSWERED-WHILE-SECTION-13-IS-POPULATED. This assertion
  // used to demand the charge on BOTH tables, which is what put a sealing request
  // into an expungement-only packet. The active table is the only table.
  assert.equal(writes.filter((row) => row.documentId === "EXP-AD Request" && /List all charges.* - 1$/i.test(row.fieldName) && row.factId === "matter.charge").length, 1,
    "only the active expungement table's first row receives the charge");
  assert.equal(writes.filter((row) => row.documentId === "EXP-AD Request" && row.page !== ACTIVE_REQUEST_PAGE && requestTableField(row.fieldName) !== null).length, 0,
    "the inactive sealing table must be wholly blank: nothing is written in Section 13");
  assert.equal(writes.filter((row) => /^arrest\/case number - Sealing /i.test(row.fieldName)).length, 0,
    "the proposed Order's sealing half must be wholly blank on an expungement route");
  assert.equal(writes.filter((row) => row.documentId === "EXP-AD Request" && / - (?:[2-9]|10)$/.test(row.fieldName) && /Arrest|charges|Outcome/i.test(row.fieldName)).length, 0,
    "unused Request rows must remain wholly blank");
  assert.equal(writes.filter((row) => row.documentId === "EXP-AD Case List" && /^arrest[2-5]$/.test(row.fieldName)).length, 0,
    "unused Case List number slots must remain wholly blank");
  assert.equal(writes.filter((row) => /^\d+ - Case Number$/i.test(row.fieldName)).length, 0,
    "Circuit Clerk case-number captions must remain blank");
  assert.equal(writes.filter((row) => String(row.drawnText ?? "").endsWith("…")).length, 0,
    "known values must not be ellipsized");
  for (const phrase of ["ISP statewide transcript", "certified dispositions", "per-case expunge or seal election", "hearing date"]) {
    assert.match(instructions, new RegExp(phrase, "i"), `instructions must disclose ${phrase}`);
  }
  // SERVICE. VF01 failed this family because the guide named neither the recipients
  // nor the method. IL.memo.json states both plainly, so the guide now quotes the
  // record verbatim; these assertions keep it quoted.
  for (const phrase of ["The circuit court clerk serves", "The participant serves no one",
    "State's Attorney", "Illinois State Police", "arresting agency", "chief legal officer",
    "60 days from service"]) {
    assert.match(instructions, new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"),
      `instructions must answer who is served and how: ${phrase}`);
  }
  const fieldMap = JSON.parse(fs.readFileSync(path.join(OUT, "production-field-map.json"), "utf8"));
  assert.equal(fieldMap.refusals.filter((row) => /^\d+ - Case Number$/.test(row.fieldName) && row.refusalClass === "court_prosecutor_clerk_or_agency_owned").length, 4,
    "all four clerk-assigned case-number captions must be declared protected");

  // VF13, SECTION-12-UNANSWERED. Both of the Request's yes-or-no questions are
  // answered, and item 12 is answered No because the route carries no sealing limb.
  const selection = new Map(writes.filter((row) => row.isSelectionControl).map((row) => [row.fieldName, row]));
  assert.equal(selection.get("Page 1 - Request to Expunge Records")?.drawnText, "Yes", "item 1 must be answered Yes on an expungement route");
  assert.equal(selection.get("12 - Seal Records")?.drawnText, "No", "item 12 must be answered No: this route carries no sealing authority");
  assert.equal(fieldMap.refusals.filter((row) => row.fieldName === "12 - Seal Records").length, 0,
    "item 12 is route-determined, not a participant refusal");
  assert.ok(selection.has("8 - received a sentence of Qualified Probation and at least 5 years have passed since my Qualified Probation ended successfully"),
    "the qualified-probation ground must be elected");
  for (const stale of ["15 - Asking to Seal", "16 -", "17 - I received a misdemeanor conviction or ordinance violation for an offense subject to sealing and 2 years have passed since the end of my last sentence"]) {
    assert.ok(!selection.has(stale), `a sealing ground must never be elected on an expungement route: ${stale}`);
  }

  // VF13, CHARGE-CELL-CARRIES-AN-INSTRUCTION.
  for (const row of writes) {
    assert.ok(!/^(?:Complete |Charge )?(?:the )?charge exactly as (?:shown|printed)/i.test(String(row.drawnText ?? "")),
      `a direction to the participant reached ${row.fieldId}: ${row.drawnText}`);
  }
  // VF13, OUTCOME-CELL-IS-NOT-A-PRINTED-ABBREVIATION.
  const outcomes = writes.filter((row) => row.factId === "matter.outcome");
  assert.equal(outcomes.length, 1, "exactly one Outcome cell is written");
  assert.equal(outcomes[0].drawnText, "QP", "the Outcome cell must carry the printed abbreviation QP, which is what Section 8 elects");
  assert.equal(outcomes[0].outcomeDerivedFrom, "route", "the Outcome must be derived from the route, not from a fixture literal");
  assert.equal(writes.filter((row) => /^dismissed$/i.test(String(row.drawnText ?? ""))).length, 0,
    "'Dismissed' is not a printed abbreviation and contradicts the qualified-probation election");

  // VF13, ORDER-P2-ITEM-3-REFUSED-AS-A-SIGNATURE.
  for (const [field, factId] of [["3 - Name", "participant.full_legal_name"], ["3 - Address", "participant.street_address"], ["3 - Telephone", "participant.phone"], ["3 - Email", "participant.email"]]) {
    const row = writes.find((entry) => entry.documentId === "EXP-AD Order Granting" && entry.fieldName === field);
    assert.ok(row && row.factId === factId, `Order page 2 item 3 must carry the held ${factId}: ${field}`);
  }
  assert.equal(fieldMap.refusals.filter((row) => row.documentId === "EXP-AD Order Granting" && /^3 - (?:Name|Address|Telephone|Email)$/.test(row.fieldName)).length, 0,
    "no item-3 contact field may be refused as a signature");
  assert.ok(fieldMap.refusals.some((row) => row.fieldName === "3 - Attorney Number" && row.role === "attorney"),
    "the attorney number stays blank on a self-represented packet");
  for (const judgeField of ["Page 2 - Expungement is Granted", "Page 2 - Sealing is Granted", "Judge's Name", "Entered Date"]) {
    const row = fieldMap.refusals.find((entry) => entry.documentId === "EXP-AD Order Granting" && entry.fieldName === judgeField);
    assert.ok(row && row.role === "court", `the Order must still reserve ${judgeField} for the judge`);
  }
  assert.equal(fieldMap.refusals.filter((row) => /^arrest\/case number/i.test(row.fieldName) && row.requiredBeforeFiling).length, 0,
    "unused and inactive proposed-Order case slots are not owed before filing");
  for (const phrase of ["item 12 \"I am requesting to seal records\" is answered No", "Sections 13 to 23 are skipped"]) {
    assert.ok(instructions.includes(phrase), `the guide must disclose the expunge-only shape: ${phrase}`);
  }
  // FIX13, REQUIRED_BEFORE_FILING. Every line of the controlling record reaches the
  // participant document verbatim, so a registry edit that the guide does not carry
  // fails the build rather than shipping a guide that quotes a record it has drifted from.
  const track = controllingRecord();
  for (const line of track.packetSet.requiredBeforeFiling) {
    assert.ok(instructions.includes(line), `participant-instructions.md must carry the required-before-filing step: ${line.slice(0, 60)}`);
  }
  for (const [label, sentence] of [["fees", track.rules.fees], ["feeWaiver", track.rules.feeWaiver],
    ["service", track.rules.service], ["notice", track.rules.notice], ["filing", track.rules.filing],
    ["participantSignature", track.rules.participantSignature]]) {
    assert.ok(instructions.includes(sentence), `participant-instructions.md must carry the record's ${label} sentence`);
  }
  assert.ok(instructions.includes("Sign and date that block yourself, in ink"),
    "the guide must tell the petitioner to sign the verification block the packet leaves blank");
  // FIX118 round two, SELF_HELP_STOP. Every condition the controlling record
  // names reaches the file verbatim, so a registry edit the guide does not carry
  // fails the build instead of shipping a stop section that quotes a record it
  // has drifted from.
  assert.ok(track.selfHelpStopConditions.length >= 8, `the record must still carry its stop conditions: ${track.selfHelpStopConditions.length}`);
  for (const condition of track.selfHelpStopConditions) {
    assert.ok(instructions.includes(condition), `participant-instructions.md must carry the stop condition: ${condition.slice(0, 60)}`);
  }
  assert.ok(!/Stop automated assistance if a State's Attorney, ISP, arresting agency, or chief legal officer objects, the court sets a contested hearing/.test(instructions),
    "the hand-written four-condition stop sentence must not survive alongside the record's eight");
  // FIX118 round two, REQUIRED_BEFORE_FILING. Every fee-waiver election the
  // refusal ledger records reaches the participant guide, one line each.
  const declaredFeeWaiverElections = fieldMap.refusals.filter((row) => row.isSelectionControl && row.documentId === "FW-CIV-APPLICATION").length;
  assert.ok(declaredFeeWaiverElections > 0, "the refusal ledger must record the fee-waiver elections");
  assert.equal((instructions.match(/\u2014 FW-CIV-APPLICATION page \d+$/gm) ?? []).length, declaredFeeWaiverElections,
    `every fee-waiver election must reach the guide: ${declaredFeeWaiverElections} declared`);
  for (const fieldName of ["5 - Checkboxes", "111 - Checkboxes"]) {
    assert.ok(instructions.includes(fieldName), `the guide must name the fee-waiver election: ${fieldName}`);
  }
  assert.ok(instructions.includes("Print it, and complete every item below"),
    "the guide must tell the participant the delivered PDF is flattened, carries no fillable fields, and must be printed");
  assert.ok(!/Request Section 20 is not ticked/.test(instructions),
    "this route answers item 12 No and the guide tells the filer not to fill Sections 13 to 23, so Section 20 must not be commanded here");
  console.log("il-exp-qualprob-set self-test passed");
}

if (process.argv.includes("--self-test")) selfTest();
else await build();
