#!/usr/bin/env node
// il-seal-2yr-set.
//
// WHAT LANE FIX03 REPAIRED HERE, AND WHY. The independent read
// data/rcap-grade-a/packet-factory-24h/vf13/rows.json (lane VF13, at 9285d8019)
// failed this family's delivered bytes on KNOWN_PREFILLS and ROUTE_OPTIONS. Each
// repair below names the finding it answers. Nothing here is a patch to the
// delivered output: every change is in the builder, the route table or the
// fixture literal, and the packet is rebuilt from the official sources.
//
//   ROUTE_OPTIONS -- SECTION-15-ELECTS-A-GROUND-THIS-ROUTE-DOES-NOT-CARRY.
//   The old selectedCheckbox() ticked "15 - Asking to Seal" as well as 17.
//   Section 15 is the Second Chance Probation / First Time Weapon Offense
//   ground, "for which there is no waiting period". This route is the two-year
//   route -- 20 ILCS 2630/5.2(c)(2)(C), (C-5), (D), (E) and (c)(3)(B) -- and
//   Section 15 is in none of it. Worse, 15 and 17 were ticked about the SAME
//   single case: 15 swears it was a completed Second Chance Probation and 17
//   swears it was a misdemeanor conviction, on a Request verified under
//   735 ILCS 5/1-109. "Check all of the boxes that apply" permits several ticks
//   across several cases; it does not permit mutually exclusive ticks on one.
//   Section 15 is no longer elected. ELECTIONS below is exhaustive: a checkbox
//   named there is written, and a checkbox not named there is never written.
//
//   KNOWN_PREFILLS -- CHARGE-CELL-CARRIES-AN-INSTRUCTION. The fixture's own
//   charge value was the sentence "Charge exactly as shown on the court
//   disposition" -- a direction to the participant standing where the charge
//   goes, on a page signed under 735 ILCS 5/1-109. The same string was already
//   adjudicated and replaced on il-exp-pardon-set (that builder's third
//   KNOWN_PREFILLS finding). It is source-authored, so it is fixed in FIXTURES:
//   both fixtures now carry a charge that is a charge, and one consistent with
//   the misdemeanor conviction Section 17 elects.
//
//   KNOWN_PREFILLS -- OUTCOME-CELL-IS-NOT-A-PRINTED-ABBREVIATION. The Outcome
//   cell read "Dismissed". Request page 4 prints "Use the shortened version of
//   the outcome from the Outcome Abbreviations for Sealing section below", and
//   that legend offers only MC, FC, CE and QP. "Dismissed" is none of them, and
//   a dismissal is a non-conviction -- the expungement path, not this one -- so
//   it also contradicted Section 17 on the very next page. The outcome is no
//   longer a fixture literal at all: ROUTE_OUTCOME derives it from the route
//   (MC, Misdemeanor Conviction) and the write row carries the legend it is
//   read from, so no fixture can restate it inconsistently.
//
//   KNOWN_PREFILLS -- ORDER-P2-ITEM-3-REFUSED-AS-A-SIGNATURE. protectedField()
//   refused every field on EXP-AD Order Granting page 2 under refusalClass
//   signature_or_date_participant_completion, "Signature, judge, clerk, or
//   post-filing field". That swept in item 3 -- "Enter the name and contact
//   information of the person who should receive the signed Order" -- whose
//   Name, Address, Email and Telephone are none of those things. The printed
//   STOP box on that page reads "Do not check the boxes below", scoping it to
//   the two IT IS ORDERED checkboxes, not to item 3; and this packet already
//   prints all four values on Request page 6 and on the fee-waiver application.
//   The blanket page rule is replaced by ORDER_COURT_OWNED, a named list of what
//   the Order actually reserves for the judge, following the repair already made
//   at scripts/build-census-v1-il-exp-pardon-set.mjs lines 40-48 and 296-326.
//   "3 - Attorney Number" stays blank: this fixture is self-represented.
//
//   Also repaired, not counted by VF13 against this family. The proposed Order's
//   unused arrest/case-number slots fell through to REQUIRED_BEFORE_FILING, so
//   the generated "Required before filing" list told the participant to complete
//   them -- including every expungement slot, on a route with no expungement
//   limb. They are unused optional row slots and are disclosed as such now.
//
// SECTION 12 AND SECTION 1. Item 12 is answered Yes, as before, but through
// selectCheckboxState() rather than PDFCheckBox.check(): check() can only ever
// reach the FIRST widget's on state, which on item 12 is /Yes, so "No" was
// unreachable in code even though the field offers /Yes at x=81.0 and /No at
// x=162.0. This route needs Yes, but the helper must be able to reach either
// widget, and its expunge-only siblings need No. Item 1 stays blank: Request
// page 1 says "If you are only requesting to seal criminal records, do not fill
// out this section", which is an instruction to leave the section blank, not to
// answer it No. That asymmetry is the form's own.
//
// NOT REPAIRED HERE, AND WHY. VF13 also recorded that every Illinois
// official_pdf_fill fixture ships an invalid cross-reference table (canonical
// declares /Size 954 while its 14 xref subsections cover 808 objects). That is
// the Illinois writer's defect, it reproduces on families outside this lane's
// grant, and it belongs to that writer's owner. This lane does not take it on.
// THE CROSS-REFERENCE DEFECT IS NOW REPAIRED HERE. The paragraph above recorded
// it as another owner's to take on; this lane holds the grant and has taken it.
// See "WHAT FIX07 REPAIRED HERE" below.
//
// WHAT FIX07 REPAIRED HERE.
//
//   ARTIFACTS. Repaired, and repaired at the shared cause rather than here.
//   VF01/VF02/VF03 measured 146 dangling indirect references per fixture on this
//   build path: pdf-lib's form.flatten() deletes the widget annotation objects
//   and leaves their references in each page's /Annots, and buildPacket's
//   copyPages then reserves an object number for each unresolvable reference and
//   never emits an object at it. That is one fault with two faces -- the trailer
//   declared /Size 954 over a cross-reference table covering 808 object numbers
//   in 14 subsections, and 954 - 808 is exactly the dangling count, because each
//   dangling reference consumes exactly one reserved-and-never-written number.
//   The prune now runs on each component document immediately after flatten,
//   BEFORE copyPages, from the single shared implementation at
//   scripts/lib/pdf-prune-dangling-annots.mjs. Link annotations resolve and are
//   kept, 21 before and 21 after. The verifiers also proposed emitting an xref
//   covering 0..Size-1 with free entries; that was evaluated and NOT adopted,
//   because pruning before the copy makes it unnecessary rather than redundant:
//   pdf-lib then emits a single full-coverage subsection on its own, measured at
//   /Size 808 over 808 covered. Hand-writing an xref downstream of pdf-lib's
//   writer would have masked the cause instead of removing it.
//
//   REQUIRED_BEFORE_FILING -- THE ELECTION COLUMN THE FORM DOES NOT HAVE. The
//   guide told the participant to "make the per-case expunge or seal election in
//   the Case List's per-case election column, which is where the record places it
//   -- not on the Request". The record does place it there: registry
//   packetSet.requiredBeforeFiling line 6 reads "Expunge-versus-seal selection
//   for each case -- Case List, per-case election column." The official form does
//   not. This lane re-enumerated the blank ATJ 2902.1 Case List from the bound
//   bytes (sha256 b72d30d274b061e0671933b8bd65abf7d2c37a6f1dd4ebfbf3968bc55b9bed0c)
//   rather than accepting the earlier count: 78 AcroForm fields on one page -- 1
//   dropdown ("1 - County"), 76 text fields (five caption fields, "7 - Case
//   Number", and arrest1 through arrest70) and 1 check box ("Page 1 - More
//   Arrests or Case Numbers"). There is no election field of any kind. The
//   sentence therefore sent the filer to a column that does not exist and away
//   from where this packet actually made the election. The record's own line is
//   still printed verbatim above, because the record is quoted, not edited. What
//   the builder says in its own voice now states the divergence and points at the
//   Request, and a self-test assertion refuses the old sentence if it returns.
//
//   The registry line itself is NOT changed here, and neither is IL.memo.json.
//   Correcting a controlling legal record is the record owner's act, not a repair
//   lane's. The divergence is reported for that owner: the same line 6 reaches
//   il-seal-2yr, il-exp-qualprob and il-seal-3yr, and it places an election on a
//   column the official ATJ 2902.1 does not have.
//
// WHAT LANE FIX06 REPAIRED HERE, AND WHY.
//
//   ROUTE_OPTIONS -- FOUR-PRINTED-TWO-YEAR-GROUNDS, ONE-DELIVERED. The
//   independent read data/rcap-grade-a/packet-factory-24h/vf03/rows-vf03-20260909d.json
//   (lane VF03, at b8a2495f4) failed the delivered bytes with requiredOptionsMissing
//   3. The registry track declares FIVE dispositions --
//   supervision_successfully_completed, qualified_probation,
//   conditional_discharge_completed_without_revocation,
//   probation_completed_without_revocation and misdemeanor_conviction -- and
//   Request page 5 prints all four two-year grounds that state them: Section 16
//   (supervision), Section 17 (misdemeanor conviction), Section 18 (qualified
//   probation) and Section 19.a (unrevoked conditional discharge or probation).
//   The builder ticked Section 17 unconditionally and refused the other three
//   with "A participant election or financial fact not determined by this packet
//   route". That sentence is untrue of this route: those three ARE its own other
//   declared grounds. The guide named neither them nor the choice. A participant
//   on four of the five declared dispositions therefore received a Request
//   stating a ground that is not theirs, verified under 735 ILCS 5/1-109, with
//   nothing telling them which box states theirs.
//
//   The repair does NOT tick more boxes. Which ground is true of a person is
//   theirs to elect, not this packet's to guess, so the elected ground becomes a
//   FIXTURE fact carried like every other fixture fact -- the same shape the
//   sibling il-seal-3yr-set already proves for its two Section 19 limbs. Exactly
//   one two-year ground is ticked per packet; the other three are refused with a
//   route-specific reason that names them as this route's alternatives and
//   carries isAlternativeToElectedGround: true; and the guide gained a section
//   that prints all four printed grounds, says which one this packet ticked and
//   on what fact, maps each of the five declared dispositions onto the printed
//   ground that states it, and tells the participant how to swap.
//
//   The two delivered fixtures exercise two different grounds, so the builder is
//   shown expressing more than the one it used to hardcode: the canonical
//   fixture elects Section 17 and the boundary fixture elects Section 16.
//
//   Section 19.a is carried here and NOT in the sibling, and 19.b and 19.c are
//   carried in the sibling and NOT here. 19.a is the two-year limb; 19.b and
//   19.c are the three-year limbs. Both builders now refuse the other route's
//   limbs by name rather than with the boilerplate.
//
//   THE OUTCOME CELL FOLLOWS THE ELECTED GROUND, AND ONE GROUND HAS NO PRINTED
//   ABBREVIATION. ROUTE_OUTCOME used to be a single route constant, MC, sound
//   only while Section 17 was the only ground the packet could state. It is now
//   derived from the elected ground, so the sealing-table Outcome cell and the
//   Section election cannot disagree. Request page 4 prints "Outcome
//   Abbreviations for Sealing" as exactly four codes -- MC Misdemeanor
//   Conviction, FC Felony Conviction, CE Certificate of Eligibility for Sealing
//   from PRB, QP Qualified Probation Successfully Completed -- and instructs the
//   filer to "Use the shortened version of the outcome from the Outcome
//   Abbreviations for Sealing section below". Section 17 is MC, Section 18 is QP,
//   and Section 19.a sits under the Section 19 stem "I received a felony
//   conviction for an offense subject to sealing", which is FC. Section 16,
//   successfully completed supervision, has NO code in that legend. "S
//   Supervision Successfully Completed" is printed on page 2, in the Outcome
//   Abbreviations for EXPUNGEMENT legend, and the sealing table does not send the
//   filer there. So on a Section 16 packet the Outcome cell is REFUSED, as a
//   required-before-filing blank naming the gap in the form's own legend, and it
//   is disclosed to the participant. No abbreviation is invented. The boundary
//   fixture elects Section 16 precisely so that the refusing path is the one a
//   delivered artifact exercises rather than dead code.
//
//   The divergence is reported for the record owner and NOT repaired here: the
//   printed sealing legend has no abbreviation for a successfully completed
//   supervision, while the registry track declares supervision_successfully_completed
//   as one of this route's five dispositions and its own requiredBeforeFiling
//   line asks the participant to confirm an outcome of "supervision".
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { makeCorpusEntryResolver } from "./lib/corpus-index-paths.mjs";
import { countDanglingAnnots, pruneDanglingAnnots } from "./lib/pdf-prune-dangling-annots.mjs";
import { IL_SEALING_UNPAID_FINANCIAL_OBLIGATION_NOTE, assertRegistryStillDirectsTheUnpaidFinancialObligationNote } from "./lib/il-sealing-unpaid-financial-obligation.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT_REL = "data/rcap-all50/overlays/census-v1/il/il-seal-2yr-set--official-pdf-fill";
const OUT = path.join(ROOT, OUT_REL);
const FAMILY_ID = "il-seal-2yr-set";

// FIX13, REQUIRED_BEFORE_FILING. This builder never read the record it is meant to
// print, and this family was the barest of the five: the whole "Required before
// filing" section was one sentence plus a list of form field names, and it named no
// RECORD at all. The Illinois State Police statewide criminal history transcript --
// a fingerprint-based Access and Review document with weeks of lead time, which
// data/record-clearing/legal-design-intake/IL.memo.json marks requiredBeforeFiling
// for this track -- appeared nowhere as a document to obtain; "Illinois State
// Police" occurred once, as a party the clerk serves. The one sentence that could
// have carried the obligation, "Attach certified dispositions and other
// route-specific evidence identified above", pointed at an "above" where nothing
// was identified. None of the ten packetSet.requiredBeforeFiling lines reached the
// file, so the petitioner was never told to sign and verify the Request the packet
// deliberately leaves blank, never told a wet signature is expected, and never told
// the filing fee or the Rule 298 waiver.
//
// The record's own words are read at build time, exactly as
// build-census-v1-il-exp-nonconv-set.mjs reads them, so the guide cannot drift from
// the record it claims to quote: change the registry and the guide changes.
const REGISTRY_PATH = "data/record-clearing/legal-design-track-registry.json";
const TRACK_ID = "il-seal-2yr";

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
  // FIX161, FEE_AND_WAIVER. The guide carries this track's unpaid-fines
  // packetInstruction in participant language. If the record stops directing it,
  // refuse rather than print a money statement the record no longer holds.
  assertRegistryStillDirectsTheUnpaidFinancialObligationNote(track, TRACK_ID);
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
 * The four printed two-year sealing grounds, and the five declared dispositions
 * each of them states.
 *
 * Request page 5 prints "In Sections 15 - 24, check all of the boxes that
 * apply", and four of those sections are this route's two-year grounds. Which
 * one is true of a person is a fact about their certified record, so the elected
 * ground is a FIXTURE fact, and every ground this route carries is named here
 * whether the fixture elects it or not. A ground absent from this table is a
 * ground no participant on this route can be told about.
 *
 * `outcome` is the code the form's own "Outcome Abbreviations for Sealing"
 * legend prints for that ground. Section 16 has none: see the ROUTE_OPTIONS note
 * in the header. A null there refuses the Outcome cell; it never invents a code.
 */
const OUTCOME_LEGEND = "Outcome Abbreviations for Sealing, EXP-AD Request page 4";
const TWO_YEAR_GROUNDS = {
  "16 -": {
    section: "Section 16",
    printed: "16. I successfully completed my supervision and 2 years have passed since the end of my last sentence.",
    inWords: "a successfully completed sentence of supervision, with two years passed since the end of the last sentence",
    dispositions: ["supervision_successfully_completed"],
    authority: "20 ILCS 2630/5.2(c)(2)(C)",
    outcome: null,
    outcomeNote: "The printed Outcome Abbreviations for Sealing legend on Request page 4 offers exactly MC, FC, CE and QP and prints no abbreviation for a successfully completed supervision. \"S - Supervision Successfully Completed\" appears only in the Outcome Abbreviations for EXPUNGEMENT legend on page 2, and the sealing table does not send the filer to that legend."
  },
  "17 - I received a misdemeanor conviction or ordinance violation for an offense subject to sealing and 2 years have passed since the end of my last sentence": {
    section: "Section 17",
    printed: "17. I received a misdemeanor conviction or ordinance violation for an offense subject to sealing and 2 years have passed since the end of my last sentence.",
    inWords: "a misdemeanor conviction or ordinance violation for an offense subject to sealing, with two years passed since the end of the last sentence",
    dispositions: ["misdemeanor_conviction"],
    authority: "20 ILCS 2630/5.2(c)(2)(C)",
    outcome: { code: "MC", meaning: "Misdemeanor Conviction" }
  },
  "18 - I successfully completed a sentence under Section 10 of the Cannabis Control Act": {
    section: "Section 18",
    printed: "18. I successfully completed a sentence under Section 10 of the Cannabis Control Act, Section 410 of the Illinois Controlled Substances Act, Section 70 of the Methamphetamine Control and Community Protection Act, or Offender Initiative Program (under Section 5-6-3.3 of the Unified Code of Corrections) and 2 years have passed since the end of my last sentence.",
    inWords: "a successfully completed sentence of qualified probation -- Cannabis Control Act Section 10, Controlled Substances Act Section 410, Methamphetamine Control and Community Protection Act Section 70, or the Offender Initiative Program -- with two years passed since the end of the last sentence",
    dispositions: ["qualified_probation"],
    authority: "20 ILCS 2630/5.2(c)(2)(C-5)",
    outcome: { code: "QP", meaning: "Qualified Probation Successfully Completed" }
  },
  "19a - I completed a sentence of conditional discharge or probation, the sentence was not revoked, AND 2 years have passed since end of last sentence": {
    section: "Section 19.a",
    printed: "19. I received a felony conviction for an offense subject to sealing AND at least one of these is true: a. I completed a sentence of conditional discharge or probation, the sentence was not revoked, AND 2 years have passed since the end of my last sentence.",
    inWords: "a completed sentence of conditional discharge or probation that was not revoked, with two years passed since the end of the last sentence",
    dispositions: ["conditional_discharge_completed_without_revocation", "probation_completed_without_revocation"],
    authority: "20 ILCS 2630/5.2(c)(2)(D), (E)",
    // Section 19 has no box of its own: ticking a lettered limb is how its stem
    // is asserted, and the stem is "I received a felony conviction for an
    // offense subject to sealing". That is why the Outcome for 19.a is FC.
    stem: "19. I received a felony conviction for an offense subject to sealing AND at least one of these is true",
    outcome: { code: "FC", meaning: "Felony Conviction" }
  }
};

/*
 * The three-year limbs, which belong to il-seal-3yr-set and never to this route.
 *
 * They are named here so that they are refused BY NAME rather than with the
 * boilerplate reason. The sibling family does the same for 19.a, which is this
 * route's.
 */
const THREE_YEAR_LIMBS = {
  "19b - My sentence of conditional discharge or probation was revoked AND 3 years have passed since the end of my last sentence": "a revoked sentence of conditional discharge or probation, with three years passed",
  "19c - I completed an Illinois prison or jail sentence AND 3 years have passed since the end of my last sentence": "a completed Illinois prison or jail sentence, with three years passed"
};

/** The elected ground's Outcome, or null where the printed legend has no code. */
function outcomeFor(fixture) {
  const ground = TWO_YEAR_GROUNDS[fixture.sealingGround];
  assert.ok(ground, `the fixture must state one printed two-year ground: ${fixture.sealingGround}`);
  if (!ground.outcome) return null;
  return { ...ground.outcome, printedLegend: OUTCOME_LEGEND, derivedFrom: "elected two-year ground", consistentWith: ground.printed };
}

/*
 * The route's own elections, exhaustively.
 *
 * A checkbox named here is written to the named widget state; a checkbox not
 * named here is never written. Section 15 was removed from this table: see the
 * ROUTE_OPTIONS note in the header. Section 17 was removed from it too, and for
 * the opposite reason: it is not route-determined at all. It is one of four
 * printed grounds, and which one applies is the participant's fact.
 */
const ELECTIONS = {
  "12 - Seal Records": { state: "Yes", why: "item 12: this route asks the court to seal" }
};

/**
 * This route's elections for one fixture.
 *
 * Item 12 is route-determined: this route asks the court to seal. The two-year
 * ground is not. Exactly one is elected, it comes from the fixture, and the
 * other three printed two-year grounds are named on the row as the participant's
 * alternatives.
 */
function electionsFor(fixture) {
  const ground = fixture.sealingGround;
  const printed = TWO_YEAR_GROUNDS[ground];
  assert.ok(printed, `the fixture must state one printed two-year ground: ${ground}`);
  const alternatives = Object.keys(TWO_YEAR_GROUNDS).filter((name) => name !== ground);
  return {
    ...ELECTIONS,
    [ground]: {
      state: "Yes",
      routeDetermined: false,
      factId: "matter.sealing_ground",
      why: `${printed.section}: this fixture's certified record shows ${printed.inWords}, ${printed.authority}. The two-year bucket is this route's; which of its four printed grounds applies is the participant's fact, not the route's.`,
      alternatives
    }
  };
}

// The charge is a charge, not a direction to the participant, and it is a
// misdemeanor: this route seals misdemeanor convictions and ordinance
// violations, and the Outcome cell above says MC.

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
  canonical: { full: "Jordan Avery Reyes", other: "None", county: "Cook", dob: "06/14/1988", race: "Hispanic", gender: "Nonbinary", caseNumber: "2021-CF-004217", arrestAgency: "Chicago Police Department", charge: "Retail theft, Class A misdemeanor", arrestDate: "03/12/2021", sealingGround: "17 - I received a misdemeanor conviction or ordinance violation for an offense subject to sealing and 2 years have passed since the end of my last sentence", phone: "312-555-0142", email: "jordan.reyes@example.org", street: "412 West Madison Street, Chicago, IL 60606" },
  boundary: { full: "Alexandria Catherine Montgomery-Washington", other: "Alexandria Catherine Washington-Montgomery", county: "Sangamon", dob: "12/31/1979", race: "Black or African American", gender: "Female", caseNumber: "2024-CF-000001-99", arrestAgency: "Springfield Police Department Records Division", charge: "Retail theft of property not exceeding three hundred dollars, Class A misdemeanor, with an extended statutory description that materially exceeds one line", arrestDate: "11/29/2023", sealingGround: "16 -", phone: "217-555-0199", email: "alexandria.montgomery.washington@example.org", street: "1188 Martin Luther King Jr. Drive, Apartment 1407, Springfield, IL 62703" }
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

const clerkCaseNumber = (name) => /^\d+ - Case Number$/i.test(name);
function requestTableRow(name) {
  const match = name.match(/(?:Arrest or Case Number|Arresting Agency|List all charges for each case number|Date of Arrest|Outcome(?: - For example RV S or P)?|4 - Outcome) - (\d+)$/i);
  return match ? Number(match[1]) : null;
}

/** The slot number of a proposed-Order case cell, on either half, or null. */
function orderCaseSlot(name) {
  const match = name.match(/^arrest\/case number(?: - Sealing)? (\d+)$/i);
  return match ? Number(match[1]) : null;
}
const ACTIVE_ORDER_CELL = "arrest/case number - Sealing 1";

/** The one active sealing-table Outcome cell, row 1 of Request page 4. */
const isActiveOutcomeCell = (documentId, name, page) =>
  documentId === "EXP-AD Request" && page === 4 && /(?:outcome.*|4 - outcome) - 1$/i.test(name);

function knownValue(documentId, name, page, fixture) {
  const key = name.toLowerCase();
  if (documentId === "EXP-AD Request" && page === 4 && /arrest or case number - 1$/i.test(name)) return [fixture.caseNumber, "matter.case_number"];
  if (documentId === "EXP-AD Request" && page === 4 && /arresting agency - 1$/i.test(name)) return [fixture.arrestAgency, "matter.arresting_agency"];
  if (documentId === "EXP-AD Request" && page === 4 && /list all charges.* - 1$/i.test(name)) return [fixture.charge, "matter.charge"];
  if (documentId === "EXP-AD Request" && page === 4 && /date of arrest - 1$/i.test(name)) return [fixture.arrestDate, "matter.arrest_date"];
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

/**
 * Why a field must stay blank, or null where nothing requires it to.
 *
 * Returns the role, the refusal class and the reason together, because a court
 * field and a participant signature are different facts about the form and a
 * reader downstream acts on the difference.
 */
function protectedField(documentId, name) {
  if (clerkCaseNumber(name)) return { role: "court", refusalClass: "court_prosecutor_clerk_or_agency_owned", reason: "The form reserves this case number for the Circuit Clerk" };
  if (documentId === "EXP-AD Order Granting" && ORDER_COURT_OWNED.has(name)) return { role: "court", refusalClass: "court_prosecutor_clerk_or_agency_owned", reason: "The proposed Order reserves this for the judge: page 2 says \"Do not check the boxes below. The judge will check the correct boxes.\"" };
  if (/signature|judge|entered date/.test(name.toLowerCase())) return { role: "protected", refusalClass: "signature_or_date_participant_completion", reason: "Signature or signature date; the participant signs, and a date written before signing would be false" };
  return null;
}
const attorneyField = (name) => /lawyer|attorney|law firm|client name/.test(name.toLowerCase());

/**
 * Select one widget state of a checkbox field.
 *
 * PDFCheckBox.check() sets the value to the FIRST widget's on state, which on
 * item 12 is /Yes, and PDFAcroCheckBox.setValue refuses any state but that one.
 * Answering "No" therefore cannot go through check() at all. The field value and
 * each widget's appearance state are set directly instead; flatten() then
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
function participantSelfControl(documentId, name) {
  return (documentId === "EXP-AD Request" && name === "P6 - Completing this form myself checkbox2")
    || (documentId === "FW-CIV-APPLICATION" && name === "Last - Completing this form myself checkbox");
}
/*
 * A slot this fixture's single record does not use, and why it is blank.
 *
 * "inactive" is the branch this route does not run at all -- the whole
 * expungement table on Request page 2, and every expungement slot on the
 * proposed Order -- and it stays wholly blank because this route has no
 * expungement limb. "unused" is a row of the ACTIVE table beyond the one record
 * this fixture carries. Neither is a required blank, and neither belongs in the
 * "Required before filing" list, which is where they used to land.
 */
function optionalUnusedSlot(documentId, name, page) {
  if (documentId === "EXP-AD Request" && page === 2) return requestTableRow(name) === null ? null : "inactive";
  if (documentId === "EXP-AD Request" && page === 4) return (requestTableRow(name) ?? 0) > 1 ? "unused" : null;
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
    return /Sealing/i.test(name) ? "unused" : "inactive";
  }
  return null;
}
const UNUSED_SLOT_REASON = {
  inactive: "Optional participant-authored additional-record slot on the branch this route does not run; the platform does not invent it. This route asks the court to seal and carries no expungement limb, so the Request's expungement table and the proposed Order's expungement half stay wholly blank. Not owed before filing.",
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
/*
 * The ink the DELIVERED bytes actually carry, read from them.
 *
 * DEFECTS_NO_COUNTER_CAN_SEE, "a-published-zero-where-a-measurement-existed":
 * this file used to publish addedGlyphsReadFromOutputBytes as the literal 0 and
 * flattenedWidgetAppearancesReadFromOutputBytes as the finalizer's own write
 * count. Neither had ever been read from the output. A zero that was never
 * measured is indistinguishable, downstream, from a zero that was, and the
 * completeness contract's invisibleWrites check reads both fields.
 *
 * flatten() turns every widget -- written and blank alike -- into a Form
 * XObject drawn on the page, and a BLANK widget's appearance stream still
 * carries a font selection and an empty show-text operand. So an appearance is
 * counted only when it draws at least one non-whitespace glyph, which is what
 * "a write with no ink is not a write" is asking about.
 */
function readFlattenedAppearanceInk(document) {
  const SHOW_TEXT = /\((?:\\[\s\S]|[^\\()])*\)|<([0-9A-Fa-f\s]*)>/g;
  let appearances = 0;
  let glyphs = 0;
  for (const page of document.getPages()) {
    const xobjects = page.node.Resources()?.lookupMaybe(PDFName.of("XObject"), PDFDict);
    if (!xobjects) continue;
    for (const [, ref] of xobjects.entries()) {
      const stream = document.context.lookup(ref);
      if (!stream?.dict) continue;
      if (String(stream.dict.get(PDFName.of("Subtype"))) !== "/Form") continue;
      let body = "";
      try { body = Buffer.from(decodePDFRawStream(stream).decode()).toString("latin1"); } catch { continue; }
      if (!/(?:^|\s)T[jJ](?=\s|$)/.test(body)) continue;
      let drawn = 0;
      for (const operand of body.match(SHOW_TEXT) ?? []) {
        const text = operand.startsWith("<")
          ? operand.slice(1, -1).replace(/\s/g, "")
          : operand.slice(1, -1).replace(/\\(?:[0-7]{1,3}|[\s\S])/g, "x");
        drawn += text.replace(/\s/g, "").length / (operand.startsWith("<") ? 2 : 1);
      }
      if (drawn <= 0) continue;
      appearances += 1;
      glyphs += Math.round(drawn);
    }
  }
  return { appearances, glyphs };
}

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
  // FIX06, ROUTE_OPTIONS. The elected two-year ground and its Outcome are
  // resolved once per document, from the fixture, so the ticked box and the
  // sealing-table Outcome cell cannot disagree.
  const elections = electionsFor(fixture);
  const elected = TWO_YEAR_GROUNDS[fixture.sealingGround];
  const outcome = outcomeFor(fixture);
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
      const election = source.documentId === "EXP-AD Request" ? elections[name] : undefined;
      const guard = protectedField(source.documentId, name);
      if (election) {
        selectCheckboxState(field, election.state);
        writes.push({ ...base, effectiveLabel: name, factId: election.factId ?? "route.selection", drawnText: election.state, isSelectionControl: true, routeDetermined: election.routeDetermined !== false, routeReason: election.why, ...(election.alternatives ? { participantAlternatives: election.alternatives } : {}) });
      } else if (participantSelfControl(source.documentId, name)) {
        field.check();
        writes.push({ ...base, effectiveLabel: name, factId: "participant.self_represented", isSelectionControl: true, routeDetermined: true });
      } else if (guard) {
        refusals.push({ ...base, effectiveLabel: `Court or later-completion control: ${name}`, reason: guard.reason, refusalClass: guard.refusalClass, role: guard.role });
      } else if (source.documentId === "EXP-AD Request" && TWO_YEAR_GROUNDS[name]) {
        // FIX06, ROUTE_OPTIONS. One of this route's OWN other two-year grounds.
        // The boilerplate reason said such a ground belonged to no route at all.
        const alternative = TWO_YEAR_GROUNDS[name];
        const outcomeConsequence = alternative.outcome
          ? `If you tick it, the sealing-table Outcome for that case becomes ${alternative.outcome.code} -- ${alternative.outcome.meaning} -- from the printed ${OUTCOME_LEGEND}.`
          : `If you tick it, leave the sealing-table Outcome for that case for a lawyer or the clerk: ${alternative.outcomeNote}`;
        refusals.push({ ...base, effectiveLabel: `Participant choice: ${name}`,
          reason: `${alternative.section} is another of this route's own printed two-year grounds, ${alternative.authority}, and it states the registry disposition${alternative.dispositions.length > 1 ? "s" : ""} ${alternative.dispositions.join(" and ")}. This packet elects ${elected.section} instead, from the fixture's certified record. If your certified record instead shows ${alternative.inWords}, tick this box and untick the one this packet ticked. Do not tick both. ${outcomeConsequence}`,
          refusalClass: "participant_sworn_narrative_or_legal_election", isSelectionControl: true, routeDetermined: false,
          isAlternativeToElectedGround: true, alternativeSection: alternative.section, alternativeDispositions: alternative.dispositions });
      } else if (source.documentId === "EXP-AD Request" && THREE_YEAR_LIMBS[name]) {
        refusals.push({ ...base, effectiveLabel: `Participant choice: ${name}`,
          reason: `That is a THREE-year limb of Section 19 -- ${THREE_YEAR_LIMBS[name]} -- and it belongs to the three-year sealing route, not to this two-year one. It is never elected here. This route's Section 19 limb is 19.a, the unrevoked one.`,
          refusalClass: "participant_sworn_narrative_or_legal_election", isSelectionControl: true, routeDetermined: false });
      } else refusals.push({ ...base, effectiveLabel: `Participant choice: ${name}`, reason: "A participant election or financial fact not determined by this packet route", refusalClass: "participant_sworn_narrative_or_legal_election", isSelectionControl: true, routeDetermined: false });
      continue;
    }
    if (!(field instanceof PDFTextField)) continue;
    const guard = protectedField(source.documentId, name);
    if (guard) {
      refusals.push({ ...base, effectiveLabel: `Court or later-completion field: ${name}`, reason: guard.reason, refusalClass: guard.refusalClass, role: guard.role });
      continue;
    }
    // FIX06, ROUTE_OPTIONS. The Outcome follows the elected ground. Where the
    // printed sealing legend has no code for that ground -- Section 16,
    // successfully completed supervision -- the cell is refused and carried to
    // the participant. No abbreviation is invented.
    if (isActiveOutcomeCell(source.documentId, name, page)) {
      if (outcome) {
        writes.push({ ...base, effectiveLabel: name, factId: "matter.outcome", outcomeDerivedFrom: outcome.derivedFrom, outcomeMeaning: outcome.meaning, printedLegend: outcome.printedLegend, ...setComplete(field, outcome.code, font) });
      } else {
        refusals.push({ ...base, effectiveLabel: `Enter the Outcome for this case on ${source.documentId} page ${page}`,
          reason: `This packet elects ${elected.section} -- ${elected.inWords} -- and the form's printed ${OUTCOME_LEGEND} has no abbreviation for it. ${elected.outcomeNote} No abbreviation is invented here. Ask the circuit clerk in your county what to enter in the Outcome cell for a successfully completed supervision, or ask a lawyer, before you file.`,
          completenessDisposition: "REQUIRED_BEFORE_FILING", requiredBeforeFiling: true, factAvailable: false, routeDetermined: false, role: "participant",
          noPrintedAbbreviationForElectedGround: true, electedGroundSection: elected.section });
      }
      continue;
    }
    const known = knownValue(source.documentId, name, page, fixture);
    const unusedSlot = optionalUnusedSlot(source.documentId, name, page);
    if (known) writes.push({ ...base, effectiveLabel: name, factId: known[1], ...setComplete(field, known[0], font) });
    else if (unusedSlot) refusals.push({ ...base, effectiveLabel: `Unused additional-record slot: ${name}`, reason: UNUSED_SLOT_REASON[unusedSlot], unusedSlotKind: unusedSlot, completenessDisposition: "OPTIONAL_PARTICIPANT_CONTENT", factAvailable: false, routeDetermined: false, role: "participant" });
    else if (attorneyField(name)) refusals.push({ ...base, effectiveLabel: `Attorney field: ${name}`, reason: "Attorney-only; the fixture is self-represented", role: "attorney" });
    else refusals.push({ ...base, effectiveLabel: `Complete ${name} on ${source.documentId} page ${page}`, reason: "The platform does not hold this participant, case, or financial fact; supply it before filing", completenessDisposition: "REQUIRED_BEFORE_FILING", requiredBeforeFiling: true, factAvailable: false, routeDetermined: false, role: "participant" });
  }
  form.updateFieldAppearances(font);
  form.flatten({ updateFieldAppearances: false });
  // VF01/VF02/VF03, ARTIFACTS. flatten() deletes the widget annotation objects
  // and leaves their references in each page's /Annots. Prune them HERE, on the
  // component document, because buildPacket's copyPages is what turns a surviving
  // dangling reference into a reserved-and-never-written object number and so into
  // the /Size-over-xref mismatch Poppler refuses to open. Link annotations resolve
  // and are kept. The shared implementation is scripts/lib/pdf-prune-dangling-annots.mjs.
  const danglingAnnotsPruned = pruneDanglingAnnots(document);
  document.setTitle(`${source.documentId} - ${fixtureName}`);
  document.setAuthor("LegalEase packet factory");
  document.setCreator("LegalEase deterministic official-form builder");
  document.setProducer("pdf-lib 1.17.1");
  document.setCreationDate(FIXED_DATE);
  document.setModificationDate(FIXED_DATE);
  return { document, writes, refusals, emptyOffAppearances, danglingAnnotsPruned };
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
  // Second prune, on the merged packet, so a reference introduced by the copy
  // itself cannot reach the delivered bytes. On a correctly pruned component set
  // this removes nothing; it is a guard, not the repair.
  pruneDanglingAnnots(packet);
  const bytes = Buffer.from(await packet.save({ useObjectStreams: false, addDefaultPage: false, objectsPerTick: Infinity }));
  const reopened = await PDFDocument.load(bytes);
  // The check is on the bytes that ship, not on the intention. This was 146 per
  // fixture before the repair, and every one of them was also an object number
  // the trailer's /Size declared and the cross-reference table did not cover.
  assert.equal(countDanglingAnnots(reopened), 0,
    "the delivered packet must carry no unresolvable /Annots reference");
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
  const delivered = readFlattenedAppearanceInk(reopened);
  // "a write with no ink is not a write", read from the saved bytes rather than
  // asserted by the finalizer that made them.
  const finalizerWrites = filled.reduce((total, item) => total + item.writes.length, 0);
  assert.equal(delivered.appearances, finalizerWrites,
    `every declared write must draw at least one glyph in the delivered bytes: ${delivered.appearances} inked appearances for ${finalizerWrites} writes`);
  return { bytes, pageCount: 13, emptyOffAppearances, inkWithoutGlyphs: strayInk, delivered, writes: filled.flatMap((item) => item.writes), refusals: filled.flatMap((item) => item.refusals) };
}

async function build() {
  const track = controllingRecord();
  const sources = resolveSources();
  const worklist = JSON.parse(fs.readFileSync(path.join(ROOT, "data/rcap-grade-a/route-obligation-census-candidate/packet-family-build-worklist.json"), "utf8"));
  const family = worklist.packetFamilies.find((entry) => entry.worklistGroupId === FAMILY_ID);
  assert.ok(family, `family absent from worklist: ${FAMILY_ID}`);
  const packets = {};
  for (const [fixtureName, fixture] of Object.entries(FIXTURES)) packets[fixtureName] = await buildPacket(sources, fixtureName, fixture);
  // FIX06, ROUTE_OPTIONS. Both delivered fixtures, not only the canonical one
  // the reports are written from. Each states exactly one printed two-year
  // ground, and the two fixtures state DIFFERENT ones, so a builder that could
  // only ever emit the hardcoded Section 17 fails here rather than shipping.
  const electedPerFixture = Object.entries(packets).map(([fixtureName, packet]) => {
    const ticked = packet.writes.filter((row) => TWO_YEAR_GROUNDS[row.fieldName]).map((row) => row.fieldName);
    assert.equal(ticked.length, 1, `${fixtureName}: exactly one printed two-year ground must be ticked, got ${ticked.length}`);
    assert.equal(ticked[0], FIXTURES[fixtureName].sealingGround, `${fixtureName}: the ticked ground must be the fixture's`);
    const refusedGrounds = packet.refusals.filter((row) => TWO_YEAR_GROUNDS[row.fieldName]);
    assert.equal(refusedGrounds.length, 3, `${fixtureName}: the three unelected two-year grounds must each carry a refusal row`);
    for (const row of refusedGrounds) assert.equal(row.isAlternativeToElectedGround, true, `${fixtureName}: ${row.fieldName} must be disclosed as an alternative`);
    const outcomeWrites = packet.writes.filter((row) => row.factId === "matter.outcome");
    const expected = TWO_YEAR_GROUNDS[ticked[0]].outcome;
    assert.equal(outcomeWrites.length, expected ? 1 : 0, `${fixtureName}: the Outcome cell must follow the elected ground`);
    if (expected) assert.equal(outcomeWrites[0].drawnText, expected.code, `${fixtureName}: the Outcome cell must carry ${expected.code}`);
    else assert.ok(packet.refusals.some((row) => row.noPrintedAbbreviationForElectedGround === true && row.requiredBeforeFiling === true),
      `${fixtureName}: a ground with no printed abbreviation must refuse the Outcome cell and carry it to the participant`);
    return ticked[0];
  });
  assert.equal(new Set(electedPerFixture).size, Object.keys(packets).length,
    "the delivered fixtures must exercise different printed grounds, so the builder is shown expressing more than one");
  fs.mkdirSync(path.join(OUT, "fixtures"), { recursive: true });
  fs.mkdirSync(path.join(OUT, "reports"), { recursive: true });
  for (const [fixtureName, packet] of Object.entries(packets)) fs.writeFileSync(path.join(OUT, "fixtures", `${fixtureName}.pdf`), packet.bytes);
  // FIX06, ROUTE_OPTIONS. The summary names the ground THIS packet elected, the
  // fact it came from, and the fact that three more printed grounds are this
  // route's too. It used to name Section 17 as though it were the route.
  const electedGround = TWO_YEAR_GROUNDS[FIXTURES.canonical.sealingGround];
  const canonicalOutcome = outcomeFor(FIXTURES.canonical);
  const otherGrounds = Object.keys(TWO_YEAR_GROUNDS).filter((name) => name !== FIXTURES.canonical.sealingGround).map((name) => TWO_YEAR_GROUNDS[name]);
  const routeSummary = `Sealing after the printed two-year period, 20 ILCS 2630/5.2(c)(2)(C), (C-5), (D), (E) and (c)(3)(B). The Request answers item 12 Yes and states one of the four printed two-year grounds. This packet elects ${electedGround.section} -- ${electedGround.inWords} -- and records the outcome as ${canonicalOutcome ? `${canonicalOutcome.code}, the printed sealing abbreviation for ${canonicalOutcome.meaning}` : "a blank, because the printed sealing legend carries no abbreviation for that ground"}. Which of the four applies is your fact, not the route's: ${otherGrounds.map((ground) => `${ground.section} states ${ground.inWords}`).join("; ")}. Tick the one your certified record supports and untick the one this packet ticked. It does not elect Section 15: that is the Second Chance Probation and First Time Weapon Offense ground, which has no waiting period and is not this route. It never elects Section 19.b or 19.c: those are the three-year limbs and a different route.`;
  writeJson(path.join(OUT, "production-field-map.json"), { schemaVersion: "rcap-production-field-map/v2", familyId: FAMILY_ID, implementationStrategy: "official_pdf_fill", routeKeys: family.routes.map((route) => route.routeKey), routeSummary, writes: packets.canonical.writes.map(({ drawnText, fontSize, ...row }) => row), refusals: packets.canonical.refusals });
  writeJson(path.join(OUT, "source-receipt.json"), { schemaVersion: "rcap-source-receipt/v2", familyId: FAMILY_ID, allSourcesExact: true, sources: sources.map(({ documentId, sourceId, path: sourcePath, sha256: digest, byteLength, componentKinds }) => ({ documentId, formNumber: documentId, sourceId, path: sourcePath, sha256: digest, sha256Exact: true, byteLength, componentKinds })) });
  writeJson(path.join(OUT, "reports/actual-writes.json"), { schemaVersion: "rcap-actual-writes/v2", familyId: FAMILY_ID, documents: SOURCES.map((source) => ({ documentId: source.documentId, actualWrites: packets.canonical.writes.filter((row) => row.documentId === source.documentId) })), artifacts: Object.entries(packets).map(([fixture, packet]) => ({ fixture, valuesReportedByFinalizer: packet.writes.length, addedGlyphsReadFromOutputBytes: packet.delivered.glyphs, flattenedShowTextGlyphsReadFromOutputBytes: packet.delivered.glyphs, flattenedWidgetAppearancesReadFromOutputBytes: packet.delivered.appearances, nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: null, minimumFontSize: Math.min(...packet.writes.filter((row) => row.fontSize).map((row) => row.fontSize)), refusedFieldsWithInk: [] })) });
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
  // FIX06, ROUTE_OPTIONS. The guide never named three of this route's four
  // printed grounds, so a participant on four of the track's five declared
  // dispositions had nothing telling them which box states theirs. This section
  // is generated from the same TWO_YEAR_GROUNDS table the builder elects from,
  // so it cannot drift from what the packet ticked.
  const groundLines = Object.entries(TWO_YEAR_GROUNDS).map(([name, ground]) => {
    const ticked = name === FIXTURES.canonical.sealingGround;
    const outcomeLine = ground.outcome
      ? `Outcome code ${ground.outcome.code} (${ground.outcome.meaning}).`
      : `No Outcome code: ${ground.outcomeNote}`;
    return `- **${ground.section}${ticked ? " -- this is the box this packet ticked" : ""}.** "${ground.printed}" This is the printed ground for ${ground.inWords}, ${ground.authority}. ${outcomeLine}`;
  }).join("\n");
  const groundSection = `## The two-year ground this packet ticked, and the three it did not\n\nThis route is the two-year sealing bucket, and the Request prints four two-year grounds. Only one of them is yours. This packet ticks ${electedGround.section}, because that is what this packet's record of your case shows: ${electedGround.inWords}. It leaves the other three blank. It does not guess between them, and no box is ticked that your certified record does not support.\n\nRead all four before you sign:\n\n${groundLines}\n\nIf your certified disposition and your Illinois State Police transcript show one of the other three, tick that box and untick ${electedGround.section}. Do not tick two of them for the same case: the form says "check all of the boxes that apply", which lets several boxes apply across several cases, but one case has one outcome. If you change the box, change the Outcome cell in the sealing table on the page before it to match, using the codes listed above. Where a ground has no code printed in that legend, this packet leaves the Outcome cell for that case blank rather than invent an abbreviation, lists the blank among the items it leaves for you, and tells you to ask the circuit clerk or a lawyer what belongs there.\n\nSection 19 has no box of its own. Its stem reads "I received a felony conviction for an offense subject to sealing AND at least one of these is true", and ticking a lettered limb is how that statement is made -- so ticking 19.a says your conviction was a felony. Do not tick 19.b or 19.c: those are the three-year limbs and belong to a different route. Do not tick Section 15: that is the Second Chance Probation and First Time Weapon Offense ground, which has no waiting period and is not this route either.\n\nYou verify this Request under 735 ILCS 5/1-109, where a statement you know to be false is perjury.\n`;
  fs.writeFileSync(path.join(OUT, "participant-instructions.md"), `# Illinois sealing packet - ${FAMILY_ID}\n\n## Route selected\n\n${routeSummary}\n\n${groundSection}\n## Required before filing\n\nThe controlling record requires each of these before this packet is filed. They are printed here in the record's own words.\n\n${beforeFiling}\n\nThe first of those is the one to start now. The ISP statewide transcript is a fingerprint-based Access and Review record: you attend an Illinois law enforcement or correctional facility or a licensed fingerprint vendor in person, and it takes time to come back. Compare it against every certified disposition and resolve every mismatch before filing. The record's per-case expunge-versus-seal line above places that election in a Case List per-case election column. The official Case List this packet ships carries no such column: its 78 form fields are the county, five caption fields, one clerk-assigned case number, one \"More Arrests or Case Numbers\" box and seventy unlabelled arrest or case cells, and not one of them is an election field. This packet therefore made the per-case expunge-or-seal election where the official forms do carry it, on the Request: item 12 is answered Yes to sealing, and ${electedGround.section} states the two-year ground -- one of the four printed two-year grounds, named in full in the section above. Check that election against your certified disposition and your Illinois State Police transcript before you sign, and if it is wrong correct it on the Request, not on the Case List.\n\n### The Request is not signed for you\n\n${signature} The packet leaves the Request's verification block deliberately blank, and nothing else in this packet signs it. Sign and date that block yourself, in ink, after every item below is complete and you have checked it against your certified disposition and your Illinois State Police transcript. You verify this Request under 735 ILCS 5/1-109, where a statement you know to be false is perjury. A Request filed without your signature and verification is not a completed filing.\n\n### Every item this packet leaves for you\n\nComplete every applicable case, outcome, financial, and participant item listed below. Do not sign until the packet is complete.\n\nThis packet is delivered flattened, because AOIC requires a flattened PDF for e-filing. A flattened PDF has no fillable fields: the file you received carries none, which the build checks on every packet it produces, so it cannot be typed into. Print it, and complete every item below, and every box in the section after it, by hand in ink.\n\n${requiredList}\n\n### The boxes only you can tick\n\nThe list above is every blank this packet leaves for you to write in. It is not every decision it leaves you. The official forms also carry check boxes, and this packet ticks only the ones its route determines.\n\nThis packet writes nothing on the Application for Waiver of Court Fees except the caption and your name and contact details. It makes none of that form's financial statements, so every check box on it is yours. The dollar amounts listed above say nothing without the box beside them, and a form carrying amounts next to unticked boxes is not a completed application:\n\n${feeWaiverElections}${registryCarveOut}\n\nDo not tick any box on the Request that your certified record does not support. You verify the Request under 735 ILCS 5/1-109, where a statement you know to be false is perjury.\n\nAttach the Illinois State Police statewide criminal history transcript, the certified disposition for each case, and any other route-specific evidence named in the record above.\n\n## What it costs, and the waiver\n\n${track.rules.fees}\n\n${track.rules.feeWaiver}\n\n${IL_SEALING_UNPAID_FINANCIAL_OBLIGATION_NOTE}\n\n## Who serves, and how\n\n${track.rules.service}\n\n${track.rules.notice}\n\nYou serve nobody. File a separate flattened packet with the circuit clerk in each county where an arrest occurred or a charge was brought. In Cook County, file in the district matching the case. If an objection results in a hearing, add the hearing date when the clerk or court supplies it and follow that notice. Do not complete court-owned service or order fields.\n\n## Where this is filed\n\n${track.rules.filing}\n\nThe filing destination is the ${track.destination.name}. ${track.destination.detail}\n\n## Stop and get help\n\nStop automated assistance and get a lawyer if any of these is true. They are the controlling record's own words.\n\n${stopConditions}\n\nTwo of those this packet cannot help with at all: an Illinois court cannot reach a federal or out-of-state record, and a denied petition needs a lawyer rather than another packet.\n`);
  fs.writeFileSync(path.join(OUT, "filing-instructions.md"), `# Filing instructions - ${FAMILY_ID}\n\n${track.rules.filing}\n\nThe destination is the ${track.destination.name}. ${track.destination.detail}\n\n**Fees.** ${track.rules.fees}\n\n**Waiver.** ${track.rules.feeWaiver}\n\n**Service.** ${track.rules.service}\n\nThe judge or clerk completes the proposed order, the clerk-assigned case numbers, and the later-completion fields.\n`);
  writeJson(path.join(OUT, "reports/build-summary.json"), { familyId: FAMILY_ID, result: "BUILT_RASTER_PENDING", counters: NOT_MEASURED_BY_THIS_BUILDER, countersNote: "A builder does not measure its own output. Every one of the nine is null here because this file measures none of them: they are the completeness verifier's and an independent lane's to count from the delivered bytes. They used to be written as eight zeros and one null, which reported a clean measurement that had never been taken.", artifacts: artifacts.map(({ file, ...artifact }) => artifact), selfVerified: false });
  console.log(`${FAMILY_ID}: BUILT_RASTER_PENDING; canonical=${artifacts[0].sha256} boundary=${artifacts[1].sha256}`);
}

function selfTest() {
  const report = JSON.parse(fs.readFileSync(path.join(OUT, "reports/actual-writes.json"), "utf8"));
  const writes = report.documents.flatMap((document) => document.actualWrites);
  const requestWrites = writes.filter((row) => row.documentId === "EXP-AD Request");
  assert.equal(requestWrites.filter((row) => /List all charges/.test(row.fieldName) && row.factId === "matter.case_number").length, 0, "charge cells must never receive the case number");
  assert.equal(requestWrites.filter((row) => row.page === 2 && /(?:Arrest or case number|Arresting agency|List all charges|Date of arrest|Outcome)/i.test(row.fieldName)).length, 0, "the inactive expungement table must remain wholly blank");
  assert.equal(requestWrites.filter((row) => row.page === 4 && / - (?:[2-9]|10)$/.test(row.fieldName)).length, 0, "unused sealing rows must remain wholly blank");
  assert.equal(requestWrites.filter((row) => row.page === 4 && /List all charges.* - 1$/i.test(row.fieldName) && row.factId === "matter.charge").length, 1, "the complete active row must carry the held charge");
  assert.equal(writes.filter((row) => row.documentId === "EXP-AD Case List" && /^arrest[2-5]$/.test(row.fieldName)).length, 0, "unused Case List slots must remain blank");
  assert.equal(writes.filter((row) => row.drawnText?.includes("…")).length, 0, "held values must not be ellipsized");

  // VF13, CHARGE-CELL-CARRIES-AN-INSTRUCTION. No cell may carry a direction to
  // the participant where a fact belongs, on a form signed under 735 ILCS 5/1-109.
  for (const row of writes) {
    assert.ok(!/^(?:Complete |Charge )?(?:the )?charge exactly as (?:shown|printed)/i.test(String(row.drawnText ?? "")), `a direction to the participant reached ${row.fieldId}: ${row.drawnText}`);
  }
  // VF13, OUTCOME-CELL-IS-NOT-A-PRINTED-ABBREVIATION, kept; FIX06 widened it.
  // The Outcome follows the elected ground and must always be one of the four
  // codes the sealing legend actually prints. A ground the legend has no code
  // for produces a refusal, never an invented abbreviation.
  const PRINTED_SEALING_CODES = ["MC", "FC", "CE", "QP"];
  const outcomes = writes.filter((row) => row.factId === "matter.outcome");
  const canonicalGround = TWO_YEAR_GROUNDS[FIXTURES.canonical.sealingGround];
  assert.equal(outcomes.length, canonicalGround.outcome ? 1 : 0, "the Outcome cell is written exactly when the elected ground has a printed code");
  if (canonicalGround.outcome) {
    assert.ok(PRINTED_SEALING_CODES.includes(outcomes[0].drawnText), `the Outcome cell must carry a printed sealing abbreviation: ${outcomes[0].drawnText}`);
    assert.equal(outcomes[0].drawnText, canonicalGround.outcome.code, "the Outcome cell must match the elected ground");
    assert.equal(outcomes[0].outcomeDerivedFrom, "elected two-year ground", "the Outcome must be derived from the elected ground, not from a fixture literal");
  }
  for (const [name, ground] of Object.entries(TWO_YEAR_GROUNDS)) {
    if (ground.outcome) assert.ok(PRINTED_SEALING_CODES.includes(ground.outcome.code), `no ground may carry an outcome code the form does not print: ${name}`);
  }
  assert.equal(TWO_YEAR_GROUNDS["16 -"].outcome, null, "supervision has no abbreviation in the printed Outcome Abbreviations for Sealing legend and none may be invented");
  assert.equal(writes.filter((row) => /dismiss|acquit/i.test(String(row.drawnText ?? ""))).length, 0, "no non-conviction outcome may appear on a conviction-sealing packet");

  const fieldMap = JSON.parse(fs.readFileSync(path.join(OUT, "production-field-map.json"), "utf8"));
  // VF13, SECTION-15-ELECTS-A-GROUND-THIS-ROUTE-DOES-NOT-CARRY.
  const selected = writes.filter((row) => row.isSelectionControl).map((row) => row.fieldName);
  assert.ok(selected.includes("12 - Seal Records"), "item 12 must be answered");
  assert.equal(writes.find((row) => row.fieldName === "12 - Seal Records").drawnText, "Yes", "this route asks the court to seal, so item 12 is Yes");
  // FIX06, ROUTE_OPTIONS. Exactly one of the four printed two-year grounds is
  // ticked, it is a participant fact rather than a route constant, and the other
  // three are disclosed as this route's alternatives rather than refused with a
  // reason that says they belong to no route.
  const grounds = selected.filter((name) => TWO_YEAR_GROUNDS[name]);
  assert.equal(grounds.length, 1, `exactly one printed two-year ground must be elected, got ${grounds.length}`);
  const groundRow = writes.find((row) => row.fieldName === grounds[0]);
  assert.equal(groundRow.factId, "matter.sealing_ground", "the two-year ground is a participant fact, recorded as one");
  assert.equal(groundRow.routeDetermined, false, "which of the four printed two-year grounds applies is not settled by the route");
  assert.equal(groundRow.participantAlternatives.length, 3, "the write must name this route's other three printed grounds as the participant's alternatives");
  for (const alternativeName of groundRow.participantAlternatives) {
    const row = fieldMap.refusals.find((entry) => entry.fieldName === alternativeName);
    assert.ok(row && row.isAlternativeToElectedGround === true, `an unelected two-year ground must be disclosed as the participant's alternative: ${alternativeName}`);
    assert.notEqual(row.reason, "A participant election or financial fact not determined by this packet route",
      `this route's own ground must not be refused as belonging to no route: ${alternativeName}`);
    assert.ok(TWO_YEAR_GROUNDS[alternativeName].dispositions.every((disposition) => row.reason.includes(disposition)),
      `the refusal must name the registry disposition the ground states: ${alternativeName}`);
  }
  // Every disposition the registry track declares reaches exactly one printed
  // ground. A disposition no printed ground states cannot be elected by anyone.
  const declaredDispositions = controllingRecord().dispositions;
  const coveredDispositions = Object.values(TWO_YEAR_GROUNDS).flatMap((ground) => ground.dispositions);
  for (const disposition of declaredDispositions) {
    assert.equal(coveredDispositions.filter((entry) => entry === disposition).length, 1,
      `each declared disposition must map to exactly one printed two-year ground: ${disposition}`);
  }
  assert.equal(coveredDispositions.length, declaredDispositions.length, "no printed ground may claim a disposition the registry track does not declare");
  for (const limb of Object.keys(THREE_YEAR_LIMBS)) {
    assert.ok(!selected.includes(limb), `a three-year limb is never elected on the two-year route: ${limb}`);
    const row = fieldMap.refusals.find((entry) => entry.fieldName === limb);
    assert.ok(row && /THREE-year limb/.test(row.reason), `the three-year limbs must be refused by name, not with the boilerplate: ${limb}`);
  }
  assert.ok(!selected.includes("15 - Asking to Seal"), "Section 15 is the no-waiting-period Second Chance/FTWOP ground and is not this route's");
  assert.ok(!selected.includes("Page 1 - Request to Expunge Records"), "Request page 1 tells a seal-only filer not to fill out that section");
  // VF13, ORDER-P2-ITEM-3-REFUSED-AS-A-SIGNATURE.
  for (const [field, factId] of [["3 - Name", "participant.full_legal_name"], ["3 - Address", "participant.street_address"], ["3 - Telephone", "participant.phone"], ["3 - Email", "participant.email"]]) {
    const row = writes.find((entry) => entry.documentId === "EXP-AD Order Granting" && entry.fieldName === field);
    assert.ok(row && row.factId === factId, `Order page 2 item 3 must carry the held ${factId}: ${field}`);
  }
  assert.equal(fieldMap.refusals.filter((row) => row.documentId === "EXP-AD Order Granting" && /^3 - (?:Name|Address|Telephone|Email)$/.test(row.fieldName)).length, 0, "no item-3 contact field may be refused as a signature");
  assert.ok(fieldMap.refusals.some((row) => row.fieldName === "3 - Attorney Number" && row.role === "attorney"), "the attorney number stays blank on a self-represented packet");
  for (const judgeField of ["Page 2 - Expungement is Granted", "Page 2 - Sealing is Granted", "Judge's Name", "Entered Date"]) {
    const row = fieldMap.refusals.find((entry) => entry.documentId === "EXP-AD Order Granting" && entry.fieldName === judgeField);
    assert.ok(row && row.role === "court", `the Order must still reserve ${judgeField} for the judge`);
  }
  assert.equal(fieldMap.refusals.filter((row) => /^arrest\/case number/i.test(row.fieldName) && row.requiredBeforeFiling).length, 0, "unused proposed-Order case slots are not owed before filing");

  const instructions = fs.readFileSync(path.join(OUT, "participant-instructions.md"), "utf8");
  const electedGroundSection = TWO_YEAR_GROUNDS[FIXTURES.canonical.sealingGround].section;
  // FIX13. These used to match a hand-written paraphrase of the service model. The
  // guide now prints the record's own service and notice sentences, so the same
  // obligation is checked against the record rather than against a restatement.
  const track = controllingRecord();
  for (const phrase of ["Illinois State Police", "arresting agency", "chief legal officer", "You serve nobody"]) assert.ok(instructions.includes(phrase), `service guidance must include: ${phrase}`);
  for (const [label, sentence] of [["fees", track.rules.fees], ["feeWaiver", track.rules.feeWaiver],
    ["service", track.rules.service], ["notice", track.rules.notice], ["filing", track.rules.filing],
    ["participantSignature", track.rules.participantSignature]]) {
    assert.ok(instructions.includes(sentence), `participant-instructions.md must carry the record's ${label} sentence`);
  }
  // FIX13, REQUIRED_BEFORE_FILING. Every line of the controlling record reaches the
  // participant document verbatim, so a registry edit the guide does not carry fails
  // the build rather than shipping a guide that quotes a record it has drifted from.
  for (const line of track.packetSet.requiredBeforeFiling) {
    assert.ok(instructions.includes(line), `participant-instructions.md must carry the required-before-filing step: ${line.slice(0, 60)}`);
  }
  assert.ok(/Obtain Illinois State Police statewide criminal history transcript/.test(instructions),
    "the ISP statewide transcript must be named as a document to obtain, not only as a party that is served");
  assert.ok(instructions.includes("Sign and date that block yourself, in ink"),
    "the guide must tell the petitioner to sign the verification block the packet leaves blank");
  for (const phrase of ["item 12 Yes", "Section 17", "does not elect Section 15"]) assert.ok(instructions.includes(phrase), `the guide must disclose the route's elections: ${phrase}`);
  // FIX06, ROUTE_OPTIONS. Every printed two-year ground reaches the guide in the
  // form's own words, with the registry disposition it states and the Outcome
  // code it carries, and the guide says how to swap. A ground the guide does not
  // name is a ground a participant cannot find.
  for (const [name, ground] of Object.entries(TWO_YEAR_GROUNDS)) {
    assert.ok(instructions.includes(ground.printed), `the guide must print the two-year ground in the form's own words: ${name}`);
    assert.ok(instructions.includes(`**${ground.section}`), `the guide must name the printed section: ${ground.section}`);
    assert.ok(instructions.includes(ground.inWords), `the guide must say in plain words what record the ground states: ${ground.section}`);
    // The registry's machine vocabulary belongs in the field map, which is a
    // record, and not in a document a participant reads.
    for (const disposition of ground.dispositions) {
      assert.ok(!instructions.includes(disposition), `the guide must not print the registry's machine disposition token: ${disposition}`);
    }
    if (ground.outcome) assert.ok(instructions.includes(`Outcome code ${ground.outcome.code}`), `the guide must give the ground's printed Outcome code: ${ground.section}`);
  }
  for (const phrase of [
    "## The two-year ground this packet ticked, and the three it did not",
    "It leaves the other three blank. It does not guess between them",
    `tick that box and untick ${electedGroundSection}`,
    "Do not tick 19.b or 19.c",
    "ticking 19.a says your conviction was a felony",
    "leaves the Outcome cell for that case blank rather than invent an abbreviation",
    "735 ILCS 5/1-109",
  ]) assert.ok(instructions.includes(phrase), `the guide must disclose the two-year ground election: ${phrase}`);
  assert.ok(!/Section 17 states the two-year misdemeanor-conviction ground/.test(instructions),
    "the guide must not present Section 17 as though it were the route's only ground");
  // VF01/VF02, REQUIRED_BEFORE_FILING -- THE ELECTION COLUMN THE FORM DOES NOT
  // HAVE. These assertions replace one that pinned the false sentence in place.
  // The record's own line 6 is still printed verbatim above, because the record is
  // quoted and not edited; what the builder says in its own voice must now state
  // the divergence and point at the Request, and must never again send the filer
  // to a Case List column that does not exist.
  assert.ok(!instructions.includes("Case List's per-case election column"),
    "the guide must not direct the filer to a Case List election column: the official ATJ 2902.1 has no such field");
  for (const phrase of [
    "The official Case List this packet ships carries no such column",
    "not one of them is an election field",
    "correct it on the Request, not on the Case List",
  ]) assert.ok(instructions.includes(phrase), `the guide must state the Case List election-column divergence: ${phrase}`);
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
  console.log("il-seal-2yr-set self-test passed");
}

if (process.argv.includes("--self-test")) selfTest();
else await build();
