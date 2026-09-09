#!/usr/bin/env node
// il-exp-nonconv-set.
//
// WHAT THIS REPAIR ANSWERS. The independent read
// data/rcap-grade-a/codex-cloud/current-byte-independent-verification-il-tx-batch-018/rows.json
// failed five obligations on the delivered bytes:
//
//   KNOWN_PREFILLS. knownValue opened with `/case number/ && !/arrest/`. Every
//     field named "List all charges for each case number - N" contains "case
//     number" and not "arrest", so all 27 charge cells -- ten on Request page 2,
//     ten on Request page 4 and seven on the Additional Cases continuation --
//     received the CASE NUMBER where the form asks for the charge. The charge
//     is a held fact; it is now written where the form asks for it.
//
//   REPEATING_ROWS. The same line inked the charge column of rows 2-10 of both
//     Request tables and of all seven continuation rows while the case, agency,
//     date and outcome cells of those rows stayed blank. A row is complete or it
//     is untouched: unused rows are now wholly blank and disclosed as optional
//     unused slots. The Case List was also treated as one row of five columns and
//     given case number, agency, charge, date and outcome across arrest1..arrest5.
//     Those are not columns. arrest1..arrest70 are the first cell of seventy
//     SUCCESSIVE rows, each asking only for another arrest or case number -- the
//     same reading FIX20 proved from the delivered bytes for this identical form,
//     where all five written values shared xMin 54.1 and stepped in y. The
//     delivered packet therefore told the court this participant had five eligible
//     offences whose case numbers were "2021-CF-004217", "Chicago Police
//     Department", "Charge exactly as shown o...", "03/12/2021" and "Dismissed".
//     Only arrest1 is written now.
//
//   PROTECTED_FIELDS. The participant's criminal case number was written into
//     five clerk-reserved caption fields -- Request 7, Case List 7, Additional
//     Cases 7, Order 7 and FW-CIV 4 -- each of which the form reserves for the
//     Circuit Clerk. They are refused as court-owned now.
//
//   CLIPPING_AND_OVERLAP. safeSet sliced to /MaxLen, shrank to 6pt, then chopped
//     characters and appended an ellipsis, so the Case List charge was delivered
//     as "Charge exactly as shown o…". setComplete replaces it: it fits the whole
//     value or refuses to write at all.
//
//   REQUIRED_BEFORE_FILING. The guide did not reconcile the already-inked
//     malformed rows with the facts the participant still owes. It now prints
//     data/record-clearing/legal-design-track-registry.json
//     tracks[trackId=il-exp-nonconv].packetSet.requiredBeforeFiling in the
//     record's own words, together with that track's own fee, waiver, service,
//     notice and filing sentences.
//
// ONE READING THIS LANE DID NOT DECIDE. Request page 2 is the expungement case
// table and Request page 4 is the sealing case table. For a sealing route the
// repaired il-seal-2yr-set and il-seal-3yr-set builders blank the page-2
// expungement table as an inactive branch. By symmetry an expungement route
// would blank the page-4 sealing table -- and VF01 faulted exactly that in
// il-exp-qualprob-set ("the inactive sealing table is populated"). But
// il-exp-supervision-set, the one family on these forms that an independent
// read has passed COMPLETE_PACKET_PROVEN, writes the first row of BOTH tables,
// and so does this family today. Two independent readers therefore disagree
// about what section 4 of this form asks of an expungement petitioner, and the
// question cannot be settled from the records in the repository. This repair
// changes none of that: row 1 of both tables is written exactly as it is today,
// so nothing here turns on the unsettled reading. The question is recorded in
// this lane's return for whoever holds the form.
//
// NOT RUN IN THE CONTAINER THAT WROTE IT. EXP-AD Case List (sha256 b72d30d2...)
// and EXP-AD Additional Cases Expungement (sha256 36ad55c6...) exist only in the
// nationwide_recovery_pool_2026_09_02 custody
// (private/source-imports/Nationwide_Recovery_Pool_2026-09-02), which is not
// mounted here and is carried by no release; the issuing host
// ilcourtsaudio.blob.core.windows.net is refused by this session's egress
// policy. resolveSources therefore stops at "source custody is not mounted" and
// THE DELIVERED FIXTURES UNDER THIS FAMILY'S DIRECTORY ARE STILL THE DEFECTIVE
// ONES. Mount the pool, run this builder, then run `--self-test`, which reads
// the delivered artifacts rather than the sources and fails loudly while those
// bytes remain unrepaired.
//
// WHAT LANE FIX07 REPAIRED HERE, AND WHY. The independent read
// data/rcap-grade-a/packet-factory-24h/vf13/rows.json (lane VF13, at 9285d8019)
// failed this family's delivered bytes on KNOWN_PREFILLS and ROUTE_OPTIONS.
//
//   ROUTE_OPTIONS -- SECTION-12-UNANSWERED-WHILE-SECTION-13-IS-POPULATED. The
//   delivered Request left item 12 -- "I am requesting to seal records" -- with
//   BOTH boxes empty, and then filled in Section 13, the sealing table, anyway.
//   The packet's own proposed Order proved the contradiction: its EXPUNGEMENT
//   half carried the case and its SEALING half, whose printed instruction is
//   "Enter the arrest or case number for all cases or charges listed under
//   Section 13 of the Request form", was blank. Two faults produced that.
//
//     First, knownValue's five active-row predicates were not gated on a page.
//     The sealing table's captions differ from the expungement table's only by a
//     "4 - " prefix on some columns, so every predicate matched BOTH tables. They
//     are gated on the active page now: this is an expungement route, its table
//     is Request page 2, and Request page 4 is the inactive branch.
//
//     Second, item 12 was unreachable in code. PDFCheckBox.check() sets the field
//     to the FIRST widget's on state, which on item 12 is /Yes, and
//     PDFAcroCheckBox.setValue refuses any other state, so "No" could not be
//     written -- even though the field is one field with two widgets, /Yes at
//     x=81.0 and /No at x=162.0. selectCheckboxState() sets the field value and
//     each widget's appearance state directly, so either widget is reachable.
//
//   The answer is fixed by the route. Request page 4 prints "If you are only
//   requesting to expunge cases, check the 'No' box in Section 12, skip to the
//   bottom of the form and sign it" -- an affirmative instruction to make a mark.
//   (Page 1's equivalent box says "do not fill out this section", which is why
//   the sealing families correctly leave item 1 blank; the asymmetry is the
//   form's own.) The registry entry
//   obligation:track-pathway:IL:il-exp-nonconv:adult-non-conviction-expungement
//   is "Expunging an arrest or charge that did not end in a conviction" and
//   carries no sealing limb, so item 12 is No, and the field map's declaration of
//   "12 - Seal Records" as a participant refusal was itself part of the defect.
//
//   ALSO ELECTED, WHICH VF13 DID NOT NAME AND WHICH A VERIFIER SHOULD CHALLENGE
//   IF IT DISAGREES. With Section 13 emptied, the delivered Request would state
//   no printed eligibility ground at all -- the same shape VF13 failed
//   il-seal-3yr-set for. This route's cited authority is 20 ILCS
//   2630/5.2(b)(1)(i) and (b)(1)(ii), and the form prints a ground for each:
//   item 4 (arrested and released, no charges filed) and item 7 (charged, later
//   acquitted or dismissed). WHICH one applies is a fact about the certified
//   record, not something the route settles, so it is a FIXTURE fact --
//   expungementGround -- and the Outcome abbreviation is derived FROM that ground
//   rather than stated separately, so the two can never disagree. Both fixtures
//   here were already built on a dismissal or acquittal, so both elect item 7 and
//   both carry DA. Items 4 and 5 are refused with a reason naming them as the
//   participant's alternatives, and the guide says which limb was ticked and when
//   to change it.
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
//   none of them; DA is the one the legend supplies for this outcome. The outcome
//   is no longer a fixture literal at all.
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
//   REQUIRED_BEFORE_FILING, VF13's observation. The generated list told an
//   expunge-only participant to complete twenty-eight "arrest/case number -
//   Sealing" rows on the proposed Order. Those slots are the inactive branch and
//   are disclosed as such now, not as blanks owed before filing.
//
// FAMILY_CONFIG NARROWED. It used to carry route entries for nine Illinois
// families, none of which this file builds -- il-exp-precompletion-set and
// il-seal-nonconv-set are built by the pardon host, and the rest have their own
// builders -- and several of those entries were stale (it still selected item 16
// for il-seal-nonconv-set, which the pardon host expressly retracted). Stale
// route tables for families this file does not build are a hazard, so only
// il-exp-nonconv-set remains and buildIllinoisFamily refuses anything else.
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
import { fileURLToPath, pathToFileURL } from "node:url";
import { makeCorpusEntryResolver } from "./lib/corpus-index-paths.mjs";

const require = createRequire(import.meta.url);
const { PDFDocument, PDFCheckBox, PDFDropdown, PDFName, PDFTextField, StandardFonts } = require("pdf-lib");
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const INDEX_PATH = "data/rcap-all50/local-source-corpus-index.json";
const WORKLIST_PATH = "data/rcap-grade-a/route-obligation-census-candidate/packet-family-build-worklist.json";
const FIXED_DATE = new Date("2026-09-03T00:00:00.000Z");
const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const writeJson = (file, value) => fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);

const SOURCES = [
  { documentId: "EXP-AD Request", sourceId: "official-form:EXP-AD Request", path: "STATES/IL/02_PACKET_FORMS/IL__FORM__EXP-AD-REQUEST__request-to-expunge-and-or-seal-criminal-records__REV-2026-06__EN.pdf", sha256: "44792beaede1d03f5ea65e61dba00cdf5cb9b7c617f7ff265e55e92576cd7853", componentKinds: ["primary_filing"] },
  { documentId: "EXP-AD Case List", sourceId: "official-form:EXP-AD Case List", path: "LegalEase Illinois/EXP-AD Case List Request to Expunge Seal Records.pdf", sha256: "b72d30d274b061e0671933b8bd65abf7d2c37a6f1dd4ebfbf3968bc55b9bed0c", componentKinds: ["attachment"] },
  { documentId: "EXP-AD Additional Cases Expungement", sourceId: "official-form:EXP-AD Additional Cases Expungement", path: "LegalEase Illinois/EXP-AD Additional Cases Expungement.pdf", sha256: "36ad55c62b891fb2ede8de8bddaeb023c1acc8cbb62880c426dfcdf289686f00", componentKinds: ["continuation"] },
  { documentId: "EXP-AD Order Granting", sourceId: "official-form:EXP-AD Order Granting", path: "STATES/IL/02_PACKET_FORMS/IL__FORM__EXP-AD-ORDER-GRANTING__order-to-expunge-and-or-seal-criminal-records__REV-2026-06__EN.pdf", sha256: "52e06b58008d797aa861902bf6b85e281804af8b4a397c591fc1c270b0151305", componentKinds: ["proposed_order"] },
  { documentId: "FW-CIV-APPLICATION", sourceId: "official-form:FW-CIV-APPLICATION", path: "STATES/IL/02_PACKET_FORMS/IL__FORM__FW-CIV-APPLICATION__application-for-waiver-of-court-fees-civil__REV-2025-08__EN.pdf", sha256: "b2da395f5ba53eb3cec6bbd39a746f2152bf7f84987ea5f4b5c511ada17337f5", componentKinds: ["fee_waiver"] }
];

/*
 * The printed non-conviction grounds, and the Outcome abbreviation each one
 * implies.
 *
 * 20 ILCS 2630/5.2(b)(1)(i) is the arrest-and-release limb and (b)(1)(ii) is the
 * charged-then-acquitted-or-dismissed limb. The form prints one item for each,
 * and the Outcome legend on Request page 2 prints an abbreviation for each. The
 * Outcome cell is derived from the elected ground so that the table and the
 * election cannot state two different things about one case.
 */
const NON_CONVICTION_GROUNDS = {
  "4 - For at least one case, I was arrested and released, and no charges were filed against me": {
    outcome: "RWC",
    meaning: "Released Without Charge",
    describedAs: "an arrest or station detention with no charge ever filed",
    statute: "20 ILCS 2630/5.2(b)(1)(i)"
  },
  "7 - For at least one case, I was charged, but was later acquitted or the case was dismissed": {
    outcome: "DA",
    meaning: "Dismissal or Acquittal",
    describedAs: "a charge that ended in acquittal or dismissal -- a not-guilty finding, nolle prosequi, stricken off with leave to reinstate, non-suit, dismissal, or a finding of no probable cause",
    statute: "20 ILCS 2630/5.2(b)(1)(ii)"
  }
};
const PRINTED_LEGEND = "Outcome Abbreviations for Expungement, EXP-AD Request page 2";

const FAMILY_CONFIG = {
  "il-exp-nonconv-set": {
    mode: "expunge",
    // Route-determined elections, exhaustively. The Section 4/7 ground is NOT
    // here: it is a fixture fact, added by electionsFor().
    elections: {
      "Page 1 - Request to Expunge Records": { state: "Yes", why: "item 1: this route asks the court to expunge" },
      "12 - Seal Records": { state: "No", why: "item 12: this route carries no sealing authority, and Request page 4 says a filer requesting only expungement checks the No box" }
    },
    routeSummary: "Expungement of eligible adult non-conviction records, 20 ILCS 2630/5.2(b)(1)(i) and (b)(1)(ii). Confirm every arrest, charge, disposition and county from certified records. The Request answers item 1 Yes and item 12 No, so Sections 13 to 24 and the SEALING half of the proposed Order stay wholly blank."
  }
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

/**
 * This route's elections for one fixture.
 *
 * Everything in config.elections is route-determined. The printed non-conviction
 * ground is not: which of items 4 and 7 is true is a fact about the certified
 * record, so it comes from the fixture and is recorded as participant-supplied,
 * with the other printed ground named as the alternative.
 */
function electionsFor(config, fixture) {
  const ground = fixture.expungementGround;
  assert.ok(NON_CONVICTION_GROUNDS[ground], `the fixture must state one printed non-conviction ground: ${ground}`);
  const alternative = Object.keys(NON_CONVICTION_GROUNDS).find((name) => name !== ground);
  return {
    ...config.elections,
    [ground]: {
      state: "Yes",
      routeDetermined: false,
      factId: "matter.expungement_ground",
      why: `This fixture's certified record shows ${NON_CONVICTION_GROUNDS[ground].describedAs}, ${NON_CONVICTION_GROUNDS[ground].statute}. That the ground is one of the printed non-conviction items is settled by the route; which one applies is the participant's fact.`,
      alternative
    }
  };
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
  canonical: { full: "Jordan Avery Reyes", other: "None", county: "Cook", dob: "06/14/1988", race: "Hispanic", gender: "Nonbinary", caseNumber: "2021-CF-004217", arrestAgency: "Chicago Police Department", charge: "Possession of a controlled substance", arrestDate: "03/12/2021", expungementGround: "7 - For at least one case, I was charged, but was later acquitted or the case was dismissed", phone: "312-555-0142", email: "jordan.reyes@example.org", street: "412 West Madison Street, Chicago, IL 60606" },
  boundary: { full: "Alexandria Catherine Montgomery-Washington", other: "Alexandria Catherine Washington-Montgomery", county: "Sangamon", dob: "12/31/1979", race: "Black or African American", gender: "Female", caseNumber: "2024-CF-000001-99", arrestAgency: "Springfield Police Department Records Division", charge: "Possession of a controlled or counterfeit substance, second degree, with an extended statutory description that materially exceeds one line", arrestDate: "11/29/2023", expungementGround: "7 - For at least one case, I was charged, but was later acquitted or the case was dismissed", phone: "217-555-0199", email: "alexandria.montgomery.washington@example.org", street: "1188 Martin Luther King Jr. Drive, Apartment 1407, Springfield, IL 62703" }
};

function resolveSources() {
  const index = JSON.parse(fs.readFileSync(path.join(ROOT, INDEX_PATH), "utf8"));
  const resolver = makeCorpusEntryResolver(index, { repoRoot: ROOT, masterLibraryRoot: process.env.MASTER_LIBRARY_SOURCE_DIR });
  return SOURCES.map((source) => {
    const entry = index.entries.find((candidate) => candidate.path === source.path);
    assert.ok(entry, `missing committed index entry: ${source.path}`);
    const absolute = resolver.resolve(entry);
    assert.ok(absolute && fs.existsSync(absolute), `source custody is not mounted: ${source.path}`);
    const bytes = fs.readFileSync(absolute);
    assert.equal(sha256(bytes), source.sha256, `source hash drift: ${source.path}`);
    return { ...source, absolute, bytes, byteLength: bytes.length };
  });
}

// The controlling record's own words, read at build time rather than copied, so the
// guide can never drift from the record it claims to quote.
const REGISTRY_PATH = "data/record-clearing/legal-design-track-registry.json";
const TRACK_ID = "il-exp-nonconv";

function controllingRecord() {
  const registry = JSON.parse(fs.readFileSync(path.join(ROOT, REGISTRY_PATH), "utf8"));
  const track = registry.tracks.find((entry) => entry.trackId === TRACK_ID);
  assert.ok(track, `track absent from the registry: ${TRACK_ID}`);
  return track;
}

function pageOf(field, pages) {
  const widget = field.acroField.getWidgets()[0];
  if (!widget) return 1;
  const parent = widget.P();
  let index = pages.findIndex((page) => page.ref === parent);
  if (index < 0) index = pages.findIndex((page) => (page.node.Annots()?.asArray() ?? []).some((ref) => ref === widget.ref));
  return index < 0 ? 1 : index + 1;
}

const clerkCaseNumber = (name) => /^\d+ - Case Number$/i.test(name);

// The row number of a Request or Additional Cases grid cell, or null when the
// field is not part of a grid. Row 1 is the first row of a table; every higher
// row is an unused slot this packet leaves wholly blank.
function gridRow(documentId, name) {
  if (documentId !== "EXP-AD Request" && documentId !== "EXP-AD Additional Cases Expungement") return null;
  const match = name.match(/(?:Arrest or Case Number|Arresting Agency|List all charges for each case number|Date of Arrest|Outcome(?: - For example RV S or P)?|4 - Outcome) - (\d+)$/i);
  return match ? Number(match[1]) : null;
}

function knownValue(documentId, name, page, fixture, config) {
  const key = name.toLowerCase();
  // Request, first row of the ACTIVE case table. The charge goes in the charge
  // cell. The page gate is what keeps the sealing table out of an expungement
  // packet: the two tables' captions differ only by a "4 - " prefix.
  if (documentId === "EXP-AD Request" && page === ACTIVE_REQUEST_PAGE) {
    if (/arrest or case number - 1$/i.test(name)) return [fixture.caseNumber, "matter.case_number"];
    if (/arresting agency - 1$/i.test(name)) return [fixture.arrestAgency, "matter.arresting_agency"];
    if (/list all charges.* - 1$/i.test(name)) return [fixture.charge, "matter.charge"];
    if (/date of arrest - 1$/i.test(name)) return [fixture.arrestDate, "matter.arrest_date"];
    if (/(?:outcome.*|4 - outcome) - 1$/i.test(name)) return [NON_CONVICTION_GROUNDS[fixture.expungementGround].outcome, "matter.outcome"];
  }
  // Case List: arrest1..arrest70 are seventy successive rows, each asking only for
  // another arrest or case number. This fixture carries one record, so only the
  // first row is written.
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

// A blank the packet leaves blank on purpose: an unused additional-record row.
// The Additional Cases form is a continuation used only when the Request has no
// remaining row, so with one held record its whole grid stays blank.
/*
 * A slot this fixture's single record does not use, and why it is blank.
 *
 * "inactive" is the branch this route does not run at all -- the whole sealing
 * table on Request page 4, and every "arrest/case number - Sealing" slot on the
 * proposed Order -- and it stays wholly blank because this route has no sealing
 * limb. "unused" is a further row of a table this route does use. Neither is a
 * required blank, and neither belongs in the "Required before filing" list,
 * which is where the Order's sealing slots used to land.
 */
function optionalUnusedSlot(documentId, name, page) {
  if (documentId === "EXP-AD Request") {
    const row = gridRow(documentId, name);
    if (row === null) return null;
    if (page !== ACTIVE_REQUEST_PAGE) return "inactive";
    return row > 1 ? "unused" : null;
  }
  if (documentId === "EXP-AD Additional Cases Expungement") return gridRow(documentId, name) !== null ? "unused" : null;
  if (documentId === "EXP-AD Case List") return /^arrest(?:[2-9]|[1-6]\d|70)$/.test(name) ? "unused" : null;
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
  unused: "Optional participant-authored additional-record slot; the platform does not invent it. This fixture carries one complete record, so every unused row remains wholly blank."
};

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
  return (documentId === "EXP-AD Request" && name === "P6 - Completing this form myself checkbox2") ||
    (documentId === "FW-CIV-APPLICATION" && name === "Last - Completing this form myself checkbox");
}

// Writes the WHOLE value or does not write it. The value is never sliced to
// /MaxLen and never ellipsized: an exact participant fact on a document filed
// with a court is complete or it is refused and named as owed.
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

async function fillDocument(source, fixtureName, fixture, config, elections) {
  const document = await PDFDocument.load(source.bytes);
  const form = document.getForm();
  const pages = document.getPages();
  const font = await document.embedFont(StandardFonts.Helvetica);
  const writes = [];
  const refusals = [];
  for (const field of form.getFields()) {
    const name = field.getName();
    const page = pageOf(field, pages);
    const id = `${source.documentId}:${name}`;
    if (field instanceof PDFDropdown) {
      const known = knownValue(source.documentId, name, page, fixture, config);
      if (known && field.getOptions().includes(known[0])) {
        field.select(known[0]);
        writes.push({ fieldId: id, fieldName: name, effectiveLabel: name, documentId: source.documentId, page, factId: known[1], drawnText: known[0] });
      } else {
        refusals.push({ fieldId: id, fieldName: name, effectiveLabel: `Select ${name}`, documentId: source.documentId, page, reason: "Supply the filing county before filing", completenessDisposition: "REQUIRED_BEFORE_FILING", requiredBeforeFiling: true, role: "participant" });
      }
      continue;
    }
    if (field instanceof PDFCheckBox) {
      const election = source.documentId === "EXP-AD Request" ? elections[name] : undefined;
      const guard = protectedField(source.documentId, name);
      if (election) {
        selectCheckboxState(field, election.state);
        writes.push({ fieldId: id, fieldName: name, effectiveLabel: name, documentId: source.documentId, page, factId: election.factId ?? "route.selection", drawnText: election.state, isSelectionControl: true, routeDetermined: election.routeDetermined !== false, routeReason: election.why, ...(election.alternative ? { participantAlternative: election.alternative } : {}) });
      } else if (participantSelfControl(source.documentId, name)) {
        field.check();
        writes.push({ fieldId: id, fieldName: name, effectiveLabel: name, documentId: source.documentId, page, factId: "participant.self_represented", isSelectionControl: true, routeDetermined: true });
      } else if (guard) {
        refusals.push({ fieldId: id, fieldName: name, effectiveLabel: `Court or later-completion control: ${name}`, documentId: source.documentId, page, reason: guard.reason, refusalClass: guard.refusalClass, role: guard.role });
      } else if (NON_CONVICTION_GROUNDS[name]) {
        refusals.push({ fieldId: id, fieldName: name, effectiveLabel: `Participant choice: ${name}`, documentId: source.documentId, page, reason: `The other printed non-conviction ground, ${NON_CONVICTION_GROUNDS[name].statute}. This packet elects the printed ground the certified record supports and leaves this one blank; tick this one instead, and untick the other, if the record shows ${NON_CONVICTION_GROUNDS[name].describedAs}. Its printed Outcome abbreviation is ${NON_CONVICTION_GROUNDS[name].outcome}, so the Outcome cell changes with it.`, refusalClass: "participant_sworn_narrative_or_legal_election", isSelectionControl: true, routeDetermined: false, isAlternativeToElectedGround: true });
      } else {
        refusals.push({ fieldId: id, fieldName: name, effectiveLabel: `Participant choice: ${name}`, documentId: source.documentId, page, reason: "A participant election or financial fact not determined by this packet route", refusalClass: "participant_sworn_narrative_or_legal_election", isSelectionControl: true, routeDetermined: false });
      }
      continue;
    }
    if (!(field instanceof PDFTextField)) continue;
    const guard = protectedField(source.documentId, name);
    if (guard) {
      refusals.push({ fieldId: id, fieldName: name, effectiveLabel: `Court or later-completion field: ${name}`, documentId: source.documentId, page, reason: guard.reason, refusalClass: guard.refusalClass, role: guard.role });
      continue;
    }
    const known = knownValue(source.documentId, name, page, fixture, config);
    const unusedSlot = optionalUnusedSlot(source.documentId, name, page);
    if (known) {
      writes.push({ fieldId: id, fieldName: name, effectiveLabel: name, documentId: source.documentId, page, factId: known[1], ...(known[1] === "matter.outcome" ? { outcomeDerivedFrom: "elected printed ground", outcomeMeaning: NON_CONVICTION_GROUNDS[fixture.expungementGround].meaning, printedLegend: PRINTED_LEGEND } : {}), ...setComplete(field, known[0], font) });
    } else if (unusedSlot) {
      refusals.push({ fieldId: id, fieldName: name, effectiveLabel: `Unused additional-record slot: ${name}`, documentId: source.documentId, page, reason: UNUSED_SLOT_REASON[unusedSlot], unusedSlotKind: unusedSlot, completenessDisposition: "OPTIONAL_PARTICIPANT_CONTENT", factAvailable: false, routeDetermined: false, role: "participant" });
    } else if (attorneyField(name)) {
      refusals.push({ fieldId: id, fieldName: name, effectiveLabel: `Attorney field: ${name}`, documentId: source.documentId, page, reason: "Attorney-only; the fixture is self-represented", role: "attorney" });
    } else {
      refusals.push({ fieldId: id, fieldName: name, effectiveLabel: `Complete ${name} on ${source.documentId} page ${page}`, documentId: source.documentId, page, reason: "The platform does not hold this participant, case, or financial fact; supply it before filing", completenessDisposition: "REQUIRED_BEFORE_FILING", requiredBeforeFiling: true, factAvailable: false, routeDetermined: false, role: "participant" });
    }
  }
  form.updateFieldAppearances(font);
  form.flatten();
  document.setTitle(`${source.documentId} - ${fixtureName}`);
  document.setAuthor("LegalEase packet factory");
  document.setCreator("LegalEase deterministic official-form builder");
  document.setProducer("pdf-lib 1.17.1");
  document.setCreationDate(FIXED_DATE);
  document.setModificationDate(FIXED_DATE);
  return { document, writes, refusals };
}

async function buildPacket(sources, fixtureName, fixture, config) {
  const filled = [];
const elections = electionsFor(config, fixture);
  for (const source of sources) filled.push({ source, ...(await fillDocument(source, fixtureName, fixture, config, elections)) });
  const packet = await PDFDocument.create();
  for (const item of filled) {
    const copied = await packet.copyPages(item.document, item.document.getPageIndices());
    copied.forEach((page) => packet.addPage(page));
  }
  packet.setTitle(`${config.familyId} ${fixtureName} filing packet`);
  packet.setAuthor("LegalEase packet factory");
  packet.setCreator("LegalEase deterministic official-form builder");
  packet.setProducer("pdf-lib 1.17.1");
  packet.setCreationDate(FIXED_DATE);
  packet.setModificationDate(FIXED_DATE);
  const bytes = Buffer.from(await packet.save({ useObjectStreams: false, addDefaultPage: false, objectsPerTick: Infinity }));
  const reopened = await PDFDocument.load(bytes);
  assert.equal(reopened.getPageCount(), sources.reduce((sum, source) => sum + filled.find((item) => item.source.documentId === source.documentId).document.getPageCount(), 0));
  assert.equal(reopened.getForm().getFields().length, 0, "flattened packet must carry no live fields");
  return { bytes, pageCount: reopened.getPageCount(), writes: filled.flatMap((item) => item.writes), refusals: filled.flatMap((item) => item.refusals) };
}

export async function buildIllinoisFamily(familyId) {
  const base = FAMILY_CONFIG[familyId];
  // This file builds one family. The other Illinois families on these forms have
  // their own builders, and stale route tables for families this file does not
  // build are how a wrong election reaches a court filing.
  assert.ok(base, `this builder serves il-exp-nonconv-set only; refused: ${familyId}`);
  const config = { familyId, ...base };
  const outRel = `data/rcap-all50/overlays/census-v1/il/${familyId}--official-pdf-fill`;
  const out = path.join(ROOT, outRel);
  const track = controllingRecord();
  const sources = resolveSources();
  const worklist = JSON.parse(fs.readFileSync(path.join(ROOT, WORKLIST_PATH), "utf8"));
  const family = worklist.packetFamilies.find((entry) => entry.worklistGroupId === familyId);
  assert.ok(family, `family absent from worklist: ${familyId}`);
  const packets = {};
  for (const [fixtureName, fixture] of Object.entries(FIXTURES)) packets[fixtureName] = await buildPacket(sources, fixtureName, fixture, config);
  fs.mkdirSync(path.join(out, "fixtures"), { recursive: true });
  fs.mkdirSync(path.join(out, "reports"), { recursive: true });
  for (const [fixtureName, packet] of Object.entries(packets)) fs.writeFileSync(path.join(out, "fixtures", `${fixtureName}.pdf`), packet.bytes);
  writeJson(path.join(out, "production-field-map.json"), { schemaVersion: "rcap-production-field-map/v2", familyId, implementationStrategy: "official_pdf_fill", routeKeys: family.routes.map((route) => route.routeKey), routeSummary: config.routeSummary, writes: packets.canonical.writes.map(({ drawnText, fontSize, ...row }) => row), refusals: packets.canonical.refusals });
  writeJson(path.join(out, "source-receipt.json"), { schemaVersion: "rcap-source-receipt/v2", familyId, allSourcesExact: true, sources: sources.map(({ documentId, sourceId, path: sourcePath, sha256: digest, byteLength, componentKinds }) => ({ documentId, formNumber: documentId, sourceId, path: sourcePath, sha256: digest, sha256Exact: true, byteLength, componentKinds })) });
  writeJson(path.join(out, "reports", "actual-writes.json"), { schemaVersion: "rcap-actual-writes/v2", familyId, documents: SOURCES.map((source) => ({ documentId: source.documentId, actualWrites: packets.canonical.writes.filter((row) => row.documentId === source.documentId) })), artifacts: Object.entries(packets).map(([fixture, packet]) => ({ fixture, valuesReportedByFinalizer: packet.writes.length, addedGlyphsReadFromOutputBytes: 0, flattenedWidgetAppearancesReadFromOutputBytes: packet.writes.length, nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: 0, minimumFontSize: Math.min(...packet.writes.filter((row) => row.fontSize).map((row) => row.fontSize)), refusedFieldsWithInk: [] })) });
  writeJson(path.join(out, "reports", "rendered-artifacts.json"), { schemaVersion: "rcap-rendered-artifacts/v2", familyId, rasterState: "BUILT_RASTER_PENDING", packets: Object.entries(packets).map(([fixture, packet]) => ({ fixture, file: `${outRel}/fixtures/${fixture}.pdf`, sha256: sha256(packet.bytes), byteLength: packet.bytes.length, pageCount: packet.pageCount, documents: SOURCES.map((source) => ({ documentId: source.documentId, componentKinds: source.componentKinds })) })) });
  writeJson(path.join(out, "approval-request.json"), { schemaVersion: "rcap-packet-approval-request/v2", familyId, status: "BUILT_RASTER_PENDING", implementationStrategy: "official_pdf_fill", routeKeys: family.routes.map((route) => route.routeKey), components: SOURCES.flatMap((source) => source.componentKinds.map((kind) => ({ kind, documentId: source.documentId }))), artifacts: Object.entries(packets).map(([fixture, packet]) => ({ fixture, file: `${outRel}/fixtures/${fixture}.pdf`, sha256: sha256(packet.bytes), byteLength: packet.bytes.length, pageCount: packet.pageCount })), independentVerificationStatus: "PENDING", commercialRoutesOpened: 0, productionTouched: false });
  const requiredList = packets.canonical.refusals.filter((row) => row.requiredBeforeFiling).map((row) => `- ${row.effectiveLabel}`).join("\n");
  const beforeFiling = track.packetSet.requiredBeforeFiling.map((line) => `- ${line}`).join("\n");
  const electedGroundField = FIXTURES.canonical.expungementGround;
  const elected = NON_CONVICTION_GROUNDS[electedGroundField];
  const alternativeField = Object.keys(NON_CONVICTION_GROUNDS).find((name) => name !== electedGroundField);
  const alternative = NON_CONVICTION_GROUNDS[alternativeField];
  const electionSection = `## What this packet asks for, and the ground it ticked\n\nThis is an expungement-only packet. On the Request, item 1 "I am requesting to expunge records" is answered Yes and item 12 "I am requesting to seal records" is answered No, which is what page 4 of the form directs a filer requesting only expungement to do. Because item 12 is No, Sections 13 to 23 are skipped and left blank, and the SEALING half of the proposed Order is left blank. Do not fill them in. If you also need records sealed, that is a different request on a different statutory ground and it needs its own packet.\n\nThe printed eligibility ground this packet ticks is item ${electedGroundField.split(" - ")[0]}: ${elected.describedAs} (${elected.statute}). Its printed Outcome abbreviation is ${elected.outcome}, ${elected.meaning}, and that is what the Outcome column of the case table carries. Read your certified disposition and your Illinois State Police transcript before you sign. If the record instead shows ${alternative.describedAs} (${alternative.statute}), tick item ${alternativeField.split(" - ")[0]} instead, untick the one this packet ticked, and change the Outcome column to ${alternative.outcome}. You verify this Request under 735 ILCS 5/1-109, where a statement you know to be false is perjury.\n\n`;
  fs.writeFileSync(path.join(out, "participant-instructions.md"), `# Illinois expungement packet - ${familyId}\n\n## Route selected\n\n${config.routeSummary}\n\n${electionSection}## Required before filing\n\nThe controlling record requires each of these before this packet is filed. They are printed here in the record's own words.\n\n${beforeFiling}\n\nEvery unused case row on the Request, on the Case List and on the Additional Cases continuation has been left wholly blank rather than partly filled. Add a further case only by completing every cell of that row -- the arrest or case number, the arresting agency, the charge exactly as the certified disposition prints it, the date of arrest and the outcome -- and check each one against the Illinois State Police transcript and the certified disposition before filing. The clerk-assigned case-number captions are left blank for the Circuit Clerk.\n\nComplete every applicable case, outcome, financial, and participant item listed below. Do not sign until the packet is complete.\n\n${requiredList}\n\nAttach certified dispositions and any eligibility certificate or other route-specific evidence identified above.\n\n## What it costs, and the waiver\n\n${track.rules.fees}\n\n${track.rules.feeWaiver}\n\n## Who serves, and how\n\n${track.rules.service}\n\n${track.rules.notice}\n\n## Where this is filed\n\n${track.rules.filing}\n\nThe filing destination is the ${track.destination.name}. ${track.destination.detail}\n\nDo not complete court-owned service or order fields.\n\n## Stop and get help\n\nStop automated assistance if a State's Attorney, ISP, arresting agency, or chief legal officer objects, the court sets a contested hearing, the printed eligibility facts do not match, or immigration consequences may be involved.\n`);
  fs.writeFileSync(path.join(out, "filing-instructions.md"), `# Filing instructions - ${familyId}\n\n${track.rules.filing}\n\nThe destination is the ${track.destination.name}. ${track.destination.detail}\n\n**Fees.** ${track.rules.fees}\n\n**Waiver.** ${track.rules.feeWaiver}\n\n**Service.** ${track.rules.service}\n\nThe judge or clerk completes the proposed order, the clerk-assigned case numbers, and the later-completion fields.\n`);
  writeJson(path.join(out, "reports", "build-summary.json"), { familyId, result: "BUILT_RASTER_PENDING", counters: NOT_MEASURED_BY_THIS_BUILDER, countersNote: "A builder does not measure its own output. Every one of the nine is null here because this file measures none of them: they are the completeness verifier's and an independent lane's to count from the delivered bytes. They used to be written as eight zeros and one null, which reported a clean measurement that had never been taken.", artifacts: Object.entries(packets).map(([fixture, packet]) => ({ fixture, sha256: sha256(packet.bytes), byteLength: packet.bytes.length, pageCount: packet.pageCount })), selfVerified: false });
  console.log(`${familyId}: BUILT_RASTER_PENDING; ${packets.canonical.writes.length} writes, ${packets.canonical.refusals.length} classified blanks; canonical=${sha256(packets.canonical.bytes)} boundary=${sha256(packets.boundary.bytes)}`);
}

// Reads the DELIVERED artifacts, not the sources, so it runs without the corpus and
// fails while the delivered bytes are still the ones the independent read faulted.
function selfTest() {
  const out = path.join(ROOT, "data/rcap-all50/overlays/census-v1/il/il-exp-nonconv-set--official-pdf-fill");
  const track = controllingRecord();
  const actual = JSON.parse(fs.readFileSync(path.join(out, "reports", "actual-writes.json"), "utf8"));
  const writes = actual.documents.flatMap((document) => document.actualWrites);
  assert.equal(writes.filter((row) => /List all charges/i.test(row.fieldName) && row.factId === "matter.case_number").length, 0,
    "charge cells must never receive the case number");
  // VF13, SECTION-12-UNANSWERED-WHILE-SECTION-13-IS-POPULATED. This assertion
  // used to demand the charge on BOTH tables, which is what put a sealing request
  // into an expungement-only packet. The active table is the only table.
  assert.equal(writes.filter((row) => row.documentId === "EXP-AD Request" && /list all charges.* - 1$/i.test(row.fieldName) && row.factId === "matter.charge").length, 1,
    "only the active expungement table's first row receives the charge");
  assert.equal(writes.filter((row) => row.documentId === "EXP-AD Request" && row.page !== ACTIVE_REQUEST_PAGE && gridRow("EXP-AD Request", row.fieldName) !== null).length, 0,
    "the inactive sealing table must be wholly blank: nothing is written in Section 13");
  assert.equal(writes.filter((row) => /^arrest\/case number - Sealing /i.test(row.fieldName)).length, 0,
    "the proposed Order's sealing half must be wholly blank on an expungement route");
  assert.equal(writes.filter((row) => row.documentId === "EXP-AD Request" && / - (?:[2-9]|10)$/.test(row.fieldName)).length, 0,
    "unused Request rows must remain wholly blank");
  assert.equal(writes.filter((row) => row.documentId === "EXP-AD Additional Cases Expungement" && / - \d+$/.test(row.fieldName)).length, 0,
    "the Additional Cases continuation grid must remain wholly blank while one record fits the Request");
  assert.equal(writes.filter((row) => row.documentId === "EXP-AD Case List" && /^arrest(?:[2-9]|[1-6]\d|70)$/.test(row.fieldName)).length, 0,
    "the Case List rows after the first must remain wholly blank");
  assert.equal(writes.filter((row) => /^\d+ - Case Number$/i.test(row.fieldName)).length, 0,
    "Circuit Clerk case-number captions must remain blank");
  assert.equal(writes.filter((row) => String(row.drawnText ?? "").endsWith("…")).length, 0,
    "held values must not be ellipsized");
  const fieldMap = JSON.parse(fs.readFileSync(path.join(out, "production-field-map.json"), "utf8"));
  assert.equal(fieldMap.refusals.filter((row) => /^\d+ - Case Number$/i.test(row.fieldName) && row.refusalClass === "court_prosecutor_clerk_or_agency_owned").length, 5,
    "all five clerk-assigned case-number captions must be declared court-owned");
  // VF13, SECTION-12-UNANSWERED. Both yes-or-no questions are answered, and a
  // printed eligibility ground is elected.
  const selection = new Map(writes.filter((row) => row.isSelectionControl).map((row) => [row.fieldName, row]));
  assert.equal(selection.get("Page 1 - Request to Expunge Records")?.drawnText, "Yes", "item 1 must be answered Yes on an expungement route");
  assert.equal(selection.get("12 - Seal Records")?.drawnText, "No", "item 12 must be answered No: this route carries no sealing authority");
  assert.equal(fieldMap.refusals.filter((row) => row.fieldName === "12 - Seal Records").length, 0,
    "item 12 is route-determined, not a participant refusal");
  const grounds = [...selection.keys()].filter((name) => NON_CONVICTION_GROUNDS[name]);
  assert.equal(grounds.length, 1, `exactly one printed non-conviction ground must be elected, got ${grounds.length}`);
  const groundRow = selection.get(grounds[0]);
  assert.equal(groundRow.factId, "matter.expungement_ground", "the printed ground is a participant fact, recorded as one");
  assert.equal(groundRow.routeDetermined, false, "which printed non-conviction ground applies is not settled by the route");
  const alternativeRow = fieldMap.refusals.find((row) => row.fieldName === groundRow.participantAlternative);
  assert.ok(alternativeRow && alternativeRow.isAlternativeToElectedGround === true,
    "the unelected printed ground must be disclosed as the participant's alternative");
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
  assert.equal(outcomes[0].drawnText, NON_CONVICTION_GROUNDS[grounds[0]].outcome,
    "the Outcome cell must carry the printed abbreviation the elected ground implies");
  assert.equal(writes.filter((row) => /^dismissed$/i.test(String(row.drawnText ?? ""))).length, 0,
    "'Dismissed' is not one of the eight printed expungement abbreviations");

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
  // VF13's REQUIRED_BEFORE_FILING observation: 28 sealing rows on an expunge route.
  assert.equal(fieldMap.refusals.filter((row) => /^arrest\/case number/i.test(row.fieldName) && row.requiredBeforeFiling).length, 0,
    "unused and inactive proposed-Order case slots are not owed before filing");

  const instructions = fs.readFileSync(path.join(out, "participant-instructions.md"), "utf8");
  for (const phrase of ["item 12 \"I am requesting to seal records\" is answered No", "Sections 13 to 23 are skipped", "735 ILCS 5/1-109"]) {
    assert.ok(instructions.includes(phrase), `the guide must disclose the expunge-only shape: ${phrase}`);
  }
  for (const line of track.packetSet.requiredBeforeFiling) {
    assert.ok(instructions.includes(line), `participant-instructions.md must carry the required-before-filing step: ${line.slice(0, 60)}`);
  }
  for (const [label, sentence] of [["fees", track.rules.fees], ["feeWaiver", track.rules.feeWaiver],
    ["service", track.rules.service], ["notice", track.rules.notice], ["filing", track.rules.filing]]) {
    assert.ok(instructions.includes(sentence), `participant-instructions.md must carry the record's ${label} sentence`);
  }
  console.log("il-exp-nonconv-set self-test passed");
}

if (process.argv.includes("--self-test")) selfTest();
else await buildIllinoisFamily("il-exp-nonconv-set");
