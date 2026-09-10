#!/usr/bin/env node
/**
 * The Massachusetts § 100C court-requested sealing family — `ma-seal-court-set`.
 *
 *   node scripts/build-census-v1-ma-seal-court-set.mjs [--check] [--no-raster]
 *
 * ONE official Trial Court form: PETITION TO SEAL CRIMINAL RECORDS FOR NOLLE
 * PROSEQUI OR DISMISSAL, footer "Standardized (Multi - BMC, DC, JC, SC) -
 * Criminal - TC0057 (2/24)". Three pages, 135 AcroForm widgets — the largest
 * field count in this jurisdiction's set, because 111 of them are the cells of a
 * thirty-seven-line charge table.
 *
 * SEALING IS NOT EXPUNGEMENT, AND THIS IS NOT THE OTHER MASSACHUSETTS PETITION
 *
 * This lane also builds `ma-expunge-k-set`, the G.L. c. 276, § 100K petition
 * that asks a judge to DESTROY a record. This one asks a judge to SEAL a record
 * — to limit who may see it — on the separate court-requested route for a charge
 * that ended in a nolle prosequi or a dismissal. Different section, different
 * petition, different caption, different consequence, different eligibility
 * recital: TC0057 opens by telling the participant to use it for charges "that
 * resulted in a 'nolle prosequi' or that the court dismissed", and this build
 * re-reads that sentence out of the binary before it renders anything.
 *
 * Both petitions are filed at a clerk's office, and that shared destination is
 * the one thing that could flatten the two families into each other. Nothing in
 * this build is carried over from the other: its authority, its recitals, its
 * filing rule and every sentence its instructions print come from THIS form's
 * own binary and from THIS route's own census record.
 *
 * THE VENUE RULE ON THIS ROUTE IS UNIQUE IN THE STATE, AND THE RECORD SAYS SO
 *
 * The route-obligation census records this route's filing destination as a
 * residence-based rule for Boston Municipal Court cases — the division where the
 * person LIVES, or, if they no longer live in BMC territory, the division the
 * most recent eligible record is from — and calls that rule unique in the state
 * in terms. The build asserts the record still says it and quotes it rather than
 * retyping it.
 *
 * WHAT THIS BUILD WRITES: FOUR OF ONE HUNDRED AND THIRTY-FIVE
 *
 *   Your Name       participant.full_legal_name
 *   Date of Birth   participant.date_of_birth
 *   Address         COMPOSED from participant.street_address and
 *                   participant.city_state_zip — the form captions this one box
 *                   "(street, city, state, zip code)", so it asks for several
 *                   held facts in one blank, which is what the composed channel
 *                   is for. No caller text reaches the page.
 *   Phone Number    participant.phone
 *
 * THE TABLE'S ROWS ARE READ FROM THE PAPER, NOT FROM THE FIELD INDEX. This is
 * the measurement this family turns on. The AcroForm index order does NOT follow
 * the printed row order: printed row 5 is `TextField3[6]` / `DropDownList1[9]` /
 * `DateField1[7]`, and printed row 13 is `TextField3[12]` / `DropDownList1[1]` /
 * `DateField1[12]`. A builder that read the row number out of the field index
 * would label a cell for one charge and place it on another charge's line, on a
 * petition signed under a perjury warning. So every table cell's row number is
 * resolved by GEOMETRY against the row number the form actually prints beside
 * it, and the build refuses if any cell cannot be matched to exactly one printed
 * row.
 *
 * THE COLUMN ORDER IS READ THE SAME WAY. The header extracts as five interleaved
 * lines — "Charge Date of Nolle Prosequi or" is one of them — which read
 * naively puts the date in the middle column. It is not there. Measured by item
 * x-position, the middle column at x 268 is "State Whether the Court Entered a
 * Nolle Prosequi or Dismissed the Charge" and the right column at x 455 is "Date
 * of Nolle Prosequi or Dismissal"; the middle widget is the DROPDOWN, whose own
 * option list is ["Nolle Prosequi", "Dismissed"], and the right widget is the
 * date field. Both readings agree and the build asserts both.
 *
 * WHAT IS REFUSED, AND WHY EACH REFUSAL IS ITS OWN
 *
 *   - The docket number, the court division/county, the Probation Central File
 *     number and all 111 table cells are case facts on a court record and a CORI
 *     the platform has never seen.
 *   - The four court-department boxes say where the case was HEARD. One route
 *     reaches all four departments and the case decides which, so each is
 *     declared required-before-filing with determinedByTheCaseNotTheRoute and a
 *     stated reason rather than ticked from nothing.
 *   - The nine narrative answers on page 2 are the participant's own sworn
 *     words. The route-obligation census records "The nine narrative answers" as
 *     a later-completion field in terms.
 *   - MY SIGNATURE and its DATE are protected.
 *   - The COURT ORDER block is captioned "(for Court use only)" on the paper.
 *     Its one widget is refused as court-owned, and the printed hearing date,
 *     hearing time and JUSTICE'S SIGNATURE lines carry no widget at all.
 *
 * THE BINARY IS AN XFA HYBRID, like the § 100K petition: pdf-lib announces
 * "Removing XFA form data" on load and the sanitation report records
 * xfaPresentInInput / xfaRemoved, while the source-identity sweep records
 * xfaPresent false for the same bytes. That disagreement is measured here and
 * returned as a finding rather than resolved silently.
 *
 * EVERY CHECK BOX SHIPS A "/1" APPEARANCE AND NO "/Off", and every text field
 * ships no /AP at all. Both suppression flags are therefore passed, and the byte
 * proof reads all 135 rectangles of the output to confirm nothing was
 * synthesized: an unticked box that acquired a stroked square would be ink this
 * court's form does not print.
 *
 * A built family is a built family. It is not verified, not approved, not
 * sellable, and this builder issues no verdict on its own packets.
 */
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

import { extractTextItems, groupIntoLines } from "./rcap-official-forms/rcap-pdf-anchor-capture.mjs";
import { finalizeOfficialForm } from "./rcap-official-forms/rcap-official-form-finalize.mjs";
import { flattenedWidgets, drawnAt } from "./rcap-official-forms/pdf-flattened-widgets.mjs";
import { decideBinding } from "./rcap-official-forms/rcap-field-semantics.mjs";
import { BLANK_DISPOSITIONS, PASS_COUNTERS, classifyField, classifyBlank, rowKeyOf }
  from "./rcap-packet-completeness/completeness-contract.mjs";

const { rasterizePageCalibrated } = await import("./raster/pdf-page-raster.mjs");

const thisFile = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(thisFile), "..");
process.chdir(ROOT);
const require = createRequire(import.meta.url);
const { PDFDocument, PDFName } = require("pdf-lib");

const FAMILY_ID = "ma-seal-court-set";
const OUT = "data/rcap-all50/overlays/census-v1/ma/ma-seal-court-set--official-pdf-fill";
const BUILD_SCRIPT = "scripts/build-census-v1-ma-seal-court-set.mjs";
const MASTER_QUEUE = "data/rcap-grade-a/packet-factory-24h/MASTER_QUEUE.json";
const ROUTE_CENSUS = "data/rcap-grade-a/route-obligation-census-candidate/packet-family-build-worklist.json";
const SWEEP = "data/rcap-grade-a/source-wave-integration/SOURCE_IDENTITY_RESOLUTION_SWEEP.json";
const PACKET_SET_MANIFESTS = "data/record-clearing/legal-design-packet-set-manifests.json";
const TRACK_REGISTRY = "data/record-clearing/legal-design-track-registry.json";

const DOCUMENT_ID = "TC0057";
const ROUTE_KEY = "obligation:track-pathway:MA:ma-seal-court:court-requested-sealing-for-dismissal-or-nolle-prosequi-100c";
const STATUTORY_AUTHORITY = "G.L. c. 276, § 100C";

const PINNED_SHA256 = "f83d441b6ddaf1efd02349519256996aea6e7c4bd812f3f1515ba89b58815bb0";

const CUSTODY_ROOTS = [
  process.env.MASTER_LIBRARY_SOURCE_DIR ?? null,
  "private/source-imports/Nationwide_Recovery_Pool_2026-09-02",
  "private/source-imports/rcap-d-source-packs-2026-08-12",
  "private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1",
  "private/human-source-returns"
].filter(Boolean);

const SUPPLY = (what) => ({ policy: "supply", what });
const WRITE = (fact) => ({ policy: "write", fact });
const COMPOSED = (factIds) => ({ policy: "composed", factIds });
const PROTECT = (refusalClass, why) => ({ policy: "protect", refusalClass, why });
const ELECTION = (why) => ({ policy: "election", why });
const CASE_FACT = (what, why) => ({ policy: "case_fact", what, whyTheRouteCannotDetermineIt: why });

const SIGNATURE = "signature_or_date_participant_completion";
const COURT_OWNED = "court_prosecutor_clerk_or_agency_owned";
const PARTICIPANT_ELECTION = "participant_sworn_narrative_or_legal_election";

const S = {
  CAPTION: "The caption block — docket, court department and division",
  IDENTITY: "YOUR INFORMATION",
  TABLE: "RECORDS YOU WANT SEALED — the charge table",
  REASONS: "REASONS YOU WANT YOUR RECORDS SEALED — the nine questions",
  SIGNATURE: "Your signature",
  COURT: "COURT ORDER (for Court use only)"
};

const WHY_THE_ROUTE_CANNOT_DETERMINE_THE_DEPARTMENT =
  "the court department is where the CASE WAS HEARD, not a branch of the statute. The route-obligation census records "
  + `this route (${ROUTE_KEY}) as a statewide form with court-specific filing, reaching the Boston Municipal, `
  + "District, Juvenile and Superior Court departments through this form's own department checkboxes, and it records "
  + "a residence-based venue rule for Boston Municipal Court cases that it calls unique in the state. One route "
  + "reaches all four departments and the participant's own case decides which one heard it.";

/* ---- the static half of the dictionary ------------------------------------- *
 * The 24 widgets that are not table cells. The 111 that are get their entries
 * from the printed row numbers, below.
 */
const STATIC_FIELDS = {
  "form1[0].#subform[0].TextField1[1]": {
    section: S.CAPTION, caption: "DOCKET NUMBER", captionAt: { page: 1, y: 711 },
    label: "Docket number of the case whose records you want sealed",
    ...SUPPLY(
      "the docket number of the case, copied from your own court papers or from your CORI. The platform does not hold "
      + "a docket number and will not write one: a docket number written from anything but the court's own record "
      + "points the petition at the wrong file")
  },
  "form1[0].#subform[0].TextField1[0]": {
    section: S.CAPTION, caption: "COURT DIVISION/COUNTY", captionAt: { page: 1, y: 711 },
    label: "Court division or county the petition is filed in",
    ...SUPPLY(
      "the division or county you are filing in. Read the venue rule in these instructions before you write it: on "
      + "this route a Boston Municipal Court case does not necessarily go back to the division that heard it")
  },
  "form1[0].#subform[0].CheckBox1[0]": {
    section: S.CAPTION, selection: true, courtDepartment: "Boston Municipal Court",
    caption: "Boston Municipal Court", captionAt: { page: 1, y: 698 },
    label: "Court department — Boston Municipal Court (selection)",
    ...CASE_FACT("tick this only if the case was heard in the Boston Municipal Court",
      WHY_THE_ROUTE_CANNOT_DETERMINE_THE_DEPARTMENT)
  },
  "form1[0].#subform[0].CheckBox3[0]": {
    section: S.CAPTION, selection: true, courtDepartment: "Juvenile Court",
    caption: "Juvenile Court", captionAt: { page: 1, y: 698 },
    label: "Court department — Juvenile Court (selection)",
    ...CASE_FACT("tick this only if the case was heard in the Juvenile Court",
      WHY_THE_ROUTE_CANNOT_DETERMINE_THE_DEPARTMENT)
  },
  "form1[0].#subform[0].CheckBox2[0]": {
    section: S.CAPTION, selection: true, courtDepartment: "District Court",
    caption: "District Court", captionAt: { page: 1, y: 682 },
    label: "Court department — District Court (selection)",
    ...CASE_FACT("tick this only if the case was heard in the District Court",
      WHY_THE_ROUTE_CANNOT_DETERMINE_THE_DEPARTMENT)
  },
  "form1[0].#subform[0].CheckBox4[0]": {
    section: S.CAPTION, selection: true, courtDepartment: "Superior Court",
    caption: "Superior Court", captionAt: { page: 1, y: 682 },
    label: "Court department — Superior Court (selection)",
    ...CASE_FACT("tick this only if the case was heard in the Superior Court",
      WHY_THE_ROUTE_CANNOT_DETERMINE_THE_DEPARTMENT)
  },
  "form1[0].#subform[0].TextField2[0]": {
    section: S.IDENTITY, caption: "Your Name:", captionAt: { page: 1, y: 638 },
    label: "Your name", ...WRITE("participant.full_legal_name")
  },
  "form1[0].#subform[0].TextField2[1]": {
    section: S.IDENTITY, caption: "Date of Birth:", captionAt: { page: 1, y: 617 },
    label: "Date of Birth", ...WRITE("participant.date_of_birth")
  },
  "form1[0].#subform[0].TextField2[2]": {
    section: S.IDENTITY, caption: "Address:", captionAt: { page: 1, y: 597 },
    subCaptions: [{ text: "(street, city,", y: 584 }, { text: "state, zip code)", y: 572 }],
    label: "Address — street, city, state and ZIP code",
    ...COMPOSED(["participant.street_address", "participant.city_state_zip"])
  },
  "form1[0].#subform[0].TextField2[3]": {
    section: S.IDENTITY, caption: "Phone Number:", captionAt: { page: 1, y: 552 },
    label: "Phone Number", ...WRITE("participant.phone")
  },
  "form1[0].#subform[0].TextField2[4]": {
    section: S.IDENTITY, caption: "Probation Central File (PCF) Number", captionAt: { page: 1, y: 531 },
    label: "Probation Central File (PCF) Number",
    ...SUPPLY(
      "your Probation Central File number if you have one, or leave it blank. The platform does not hold it: it is "
      + "assigned by the Massachusetts Probation Service and appears on papers the platform has never seen")
  },
  "form1[0].#subform[0].CheckBox5[0]": {
    section: S.TABLE, selection: true,
    caption: "Check here if you use the Continuation Sheet", captionAt: { page: 1, y: 479 },
    label: "You used the Continuation Sheet on page 3 (selection)",
    ...ELECTION(
      "tick this only if you actually carry your charge list onto the Continuation Sheet on page 3. Only you know how "
      + "many charges you are listing")
  },
  "form1[0].#subform[1].TextField1[2]": {
    section: S.SIGNATURE, caption: "MY SIGNATURE", captionAt: { page: 2, y: 224 },
    label: "My signature on the petition",
    ...PROTECT(SIGNATURE,
      "you sign the petition yourself; the platform never signs for you. The line directly above it says you may be "
      + "penalized for perjury if what you have written is not truthful")
  },
  "form1[0].#subform[1].DateField1[14]": {
    section: S.SIGNATURE, caption: "DATE", captionAt: { page: 2, y: 224 },
    label: "Date you sign the petition",
    ...PROTECT(SIGNATURE,
      "the date beside a signature is written when the signature is; the platform dates nothing it does not sign")
  },
  "form1[0].#subform[1].CheckBox5[1]": {
    section: S.COURT, selection: true,
    caption: "The court will hold a hearing on the petition", captionAt: { page: 2, y: 165 },
    label: "Court order block — court use only, on the court's own hearing order",
    ...PROTECT(COURT_OWNED,
      "this box sits inside the block the form captions COURT ORDER (for Court use only). It is the court's, not "
      + "yours and not the platform's")
  }
};

/* The nine printed questions on page 2, in the order the form prints them. */
const NINE_QUESTIONS = [
  { name: "form1[0].#subform[1].TextField2[5]", y: 715, caption: "How may the records affect your ability to get or keep a job" },
  { name: "form1[0].#subform[1].TextField2[6]", y: 666, caption: "How may the records affect your ability to advance economically or professionally" },
  { name: "form1[0].#subform[1].TextField2[7]", y: 617, caption: "What attempts have you made to get a job" },
  { name: "form1[0].#subform[1].TextField2[8]", y: 568, caption: "How may the records affect your ability to obtain or keep housing" },
  { name: "form1[0].#subform[1].TextField2[9]", y: 519, caption: "How may the records affect your ability to participate in community or volunteer activities" },
  { name: "form1[0].#subform[1].TextField2[10]", y: 470, caption: "What community or civic activities are you involved in" },
  { name: "form1[0].#subform[1].TextField2[11]", y: 421, caption: "Did you successfully complete a probationary term or treatment for a mental health condition or substance use disorder" },
  { name: "form1[0].#subform[1].TextField2[12]", y: 372, caption: "Have you avoided additional contact with the criminal justice system" },
  { name: "form1[0].#subform[1].TextField2[13]", y: 323, caption: "Have you achieved any particular accomplishments" }
];

for (const [i, q] of NINE_QUESTIONS.entries()) {
  STATIC_FIELDS[q.name] = {
    section: S.REASONS, caption: q.caption, captionAt: { page: 2, y: q.y },
    questionNumber: i + 1,
    label: `Answer ${i + 1} of 9 — ${q.caption}?`,
    ...SUPPLY(
      `answer the printed question "${q.caption}?" in your own words, as specifically as you can. These are the words `
      + "the judge reads and they must be yours. The route record names the nine narrative answers as a "
      + "later-completion field in terms, and the form's own instruction says to explain why if a question is not "
      + "relevant to you rather than to leave it empty")
  };
}

/* ---- the three columns of the charge table ---------------------------------- *
 * Measured, not inferred. The header extracts as five interleaved lines and the
 * naive reading puts the date in the middle column; by item x-position the
 * middle column is the nolle-or-dismissed question and the right column is the
 * date. The dropdown's own option list settles it independently.
 */
const TABLE_COLUMNS = [
  {
    id: "charge", prefix: "form1[0].#subform[<p>].TextField3",
    columnX: 41.2, headerX: 44.1, headerY: 443, headerNeedle: "list each charge on a separate line",
    columnHeading: "Charge (list each charge on a separate line)",
    what: "the charge as it is written on your own court papers or your CORI, one charge per line"
  },
  {
    id: "nolle_or_dismissed", prefix: "form1[0].#subform[<p>].DropDownList1",
    columnX: 264.6, headerX: 268.1, headerY: 464, headerNeedle: "State Whether the Court Entered",
    columnHeading: "State Whether the Court Entered a Nolle Prosequi or Dismissed the Charge",
    expectedOptions: ["Nolle Prosequi", "Dismissed"],
    what: "which of the two the court entered on that charge — a nolle prosequi, or a dismissal. The box offers those two and nothing else"
  },
  {
    id: "disposition_date", prefix: "form1[0].#subform[<p>].DateField1",
    columnX: 453.6, headerX: 455.0, headerY: 457, headerNeedle: "Date of Nolle Prosequi or",
    columnHeading: "Date of Nolle Prosequi or Dismissal",
    what: "the date the court entered that nolle prosequi or dismissal, from the same papers"
  }
];

const FORM_ANCHORS = [
  {
    id: "petition-caption", page: 1, y: 763, needle: "PETITION TO SEAL CRIMINAL RECORDS",
    whyItMatters: "the remedy this petition asks for — sealing, not expungement — printed in the form's own caption"
  },
  {
    id: "caption-second-line", page: 1, y: 749, needle: "FOR NOLLE PROSEQUI OR DISMISSAL",
    whyItMatters: "the dispositions this route is for, printed in the caption; it is what separates this family from the § 100K expungement family"
  },
  {
    id: "use-this-form", page: 1, y: 736, needle: "Use this form to ask the court to seal criminal records",
    quoteSpan: { fromY: 736, toY: 724, sentences: 2 },
    whyItMatters: "the form's own eligibility recital and its one-form-per-case rule, quoted to the participant rather than retyped"
  },
  {
    id: "records-you-want-sealed", page: 1, y: 493, needle: "Provide the following information for the records you want sealed",
    quoteSpan: { fromY: 493, toY: 479, sentences: 3 },
    whyItMatters: "the court's own instruction on the charge table and the Continuation Sheet"
  },
  {
    id: "answer-specifically", page: 2, y: 747, needle: "Answer the following questions as specifically as possible",
    quoteSpan: { fromY: 747, toY: 735, sentences: 4 },
    whyItMatters: "the court's own instruction on the nine narrative answers, including what to do with a question that is not relevant"
  },
  {
    /* The needle is on the SECOND printed line of the clause; the quoted span
     * starts on the first, so the participant is shown the whole sentence pair
     * rather than the half that carries the word "perjury". */
    id: "perjury-clause", page: 2, y: 246, needle: "I know that I may be penalized for perjury",
    quoteSpan: { fromY: 260, toY: 246, sentences: 2 },
    whyItMatters: "what the participant's signature actually asserts, which is why nothing on this form is written from anything but a held fact"
  },
  {
    id: "court-use-only", page: 2, y: 184, needle: "COURT ORDER (for Court use only)",
    whyItMatters: "the printed caption that makes the block below it the court's, and the basis for refusing its widget as court-owned"
  },
  {
    id: "hearing-and-posting", page: 2, y: 165, needle: "The court will hold a hearing on the petition",
    quoteSpan: { fromY: 165, toY: 107, sentences: 3 },
    whyItMatters: "the seven-day rule, the notice the Clerk-Magistrate must give to the Probation Service and the prosecutor, and the public bulletin board — all printed on the form and all things the participant should know before filing"
  },
  {
    id: "continuation-sheet", page: 3, y: 745, needle: "Provide the following information for the records that you want the court to seal",
    quoteSpan: { fromY: 745, toY: 731, sentences: 1 },
    whyItMatters: "the Continuation Sheet's own instruction, which repeats the nolle-or-dismissal condition"
  },
  {
    id: "form-footer", page: 1, y: 24, needle: "TC0057 (2/24)",
    whyItMatters: "the form's own number and edition footer, which identifies the document this packet is built on"
  }
];

const FIXTURES = {
  canonical: {
    "participant.full_legal_name": "Jordan Avery Reyes",
    "participant.first_name": "Jordan",
    "participant.middle_name": "Avery",
    "participant.last_name": "Reyes",
    "participant.date_of_birth": "1991-04-17",
    "participant.street_address": "42 Maple Street, Apartment 3",
    "participant.city": "Dorchester",
    "participant.state": "MA",
    "participant.zip": "02124",
    "participant.city_state_zip": "Dorchester, MA 02124",
    "participant.phone": "617-555-0142",
    "participant.email": "jordan.reyes@example.org"
  },
  boundary: {
    "participant.full_legal_name": "Maria-Alejandra O'Shaughnessy-Whitfield",
    "participant.first_name": "Maria-Alejandra",
    "participant.middle_name": "Consuelo",
    "participant.last_name": "O'Shaughnessy-Whitfield",
    "participant.date_of_birth": "1968-12-31",
    "participant.street_address": "1188 Upper Notch Crossing Road, Apartment 14B",
    "participant.city": "Unincorporated Township of Long Hollow Crossing",
    "participant.state": "Massachusetts",
    "participant.zip": "01103-2214",
    "participant.city_state_zip": "Unincorporated Township of Long Hollow Crossing, Massachusetts 01103-2214",
    "participant.phone": "(413) 555-0199 ext. 4417",
    "participant.email": "maria.alejandra.oshaughnessy.whitfield@longmailexample.org"
  }
};

const RASTER_ENGINE = "scripts/raster/pdf-page-raster.mjs (Chromium, calibrated)";

/* ---- the controlling records, read at build time ---------------------------- */
function queueBinding() {
  const queue = JSON.parse(fs.readFileSync(path.join(ROOT, MASTER_QUEUE), "utf8"));
  const row = (queue.families ?? []).find((f) => f.familyId === FAMILY_ID);
  assert.ok(row, `${MASTER_QUEUE} carries no row for ${FAMILY_ID}`);
  const hashes = row.sourceHashes ?? [];
  assert.equal(hashes.length, 1,
    `${FAMILY_ID} expects exactly one pinned source and the queue names ${hashes.length}`);
  const pinned = hashes[0];
  assert.equal(String(pinned.sha256 ?? "").toLowerCase(), PINNED_SHA256,
    `the MASTER_QUEUE pin moved: the queue now says ${pinned.sha256}, this build asserts ${PINNED_SHA256}`);
  assert.deepEqual(row.routeKeys, [ROUTE_KEY],
    `the queue's route keys for ${FAMILY_ID} moved: ${JSON.stringify(row.routeKeys)}`);
  assert.equal(row.officialFormFamily, DOCUMENT_ID,
    `the queue assigns ${FAMILY_ID} the official form ${row.officialFormFamily}, not ${DOCUMENT_ID}`);
  return {
    sourceId: pinned.sourceId, declaredPath: pinned.path, sha256: PINNED_SHA256,
    tier: pinned.tier ?? null, routeKeys: row.routeKeys ?? [],
    officialFormFamily: row.officialFormFamily ?? null,
    custodyClassInQueue: row.sourceReadiness?.custodyClass ?? null
  };
}

/**
 * The source-identity sweep's own per-source measurement for this family.
 *
 * This family was classed SOURCE_GENUINELY_MISSING in the custody record and was
 * not missing. The dispatch that staffed it rests on the sweep rather than on
 * that scalar, so the sweep is read here and its digest asserted against the
 * queue's: a family staffed on a measurement is built on the same measurement.
 */
function sweepMeasurement() {
  const sweep = JSON.parse(fs.readFileSync(path.join(ROOT, SWEEP), "utf8"));
  const family = (sweep.families ?? []).find((f) => f.familyId === FAMILY_ID);
  assert.ok(family, `${SWEEP} carries no family ${FAMILY_ID}`);
  assert.equal(family.answer, "RESOLVED_BY_CONTENT",
    `${SWEEP} no longer answers RESOLVED_BY_CONTENT for ${FAMILY_ID} (${family.answer})`);
  assert.equal(family.sources?.length, 1,
    `${SWEEP} measures ${family.sources?.length} sources for ${FAMILY_ID}; this build is written for one`);
  const measured = family.sources[0];
  assert.equal(String(measured.actualSha256 ?? "").toLowerCase(), PINNED_SHA256,
    `the sweep's measured digest for ${FAMILY_ID} is ${measured.actualSha256}, not the pinned ${PINNED_SHA256}`);
  return {
    sourceId: measured.sourceId,
    priorCustodyClass: family.priorCustodyClass ?? null,
    actualPath: measured.actualPath ?? null,
    copiesInCustody: measured.copiesInCustody ?? null,
    custodies: measured.custodies ?? [],
    pageCount: measured.identityEvidence?.pageCount ?? null,
    acroFieldCount: measured.identityEvidence?.acroFieldCount ?? null,
    byteLength: measured.identityEvidence?.byteLength ?? null,
    xfaPresentInTheSweep: measured.identityEvidence?.xfaPresent ?? null
  };
}

function routeRecord() {
  const census = JSON.parse(fs.readFileSync(path.join(ROOT, ROUTE_CENSUS), "utf8"));
  const family = (census.packetFamilies ?? []).find((f) => f.worklistGroupId === FAMILY_ID);
  assert.ok(family, `${ROUTE_CENSUS} carries no packet family ${FAMILY_ID}`);
  assert.equal(family.routes?.length, 1,
    `${FAMILY_ID} is a single-route family and the census records ${family.routes?.length} routes`);
  const route = family.routes[0];
  assert.equal(route.routeKey, ROUTE_KEY,
    `the census route key moved: it now reads ${route.routeKey}, this build is written for ${ROUTE_KEY}`);

  const recorded = (key) => {
    const cell = route.deliverable?.[key];
    assert.ok(cell, `the census records no ${key} cell for ${ROUTE_KEY}`);
    assert.equal(cell.status, "recorded",
      `the census no longer records ${key} for ${ROUTE_KEY} (status ${cell.status}); this packet prints it, so the build stops`);
    const entries = (cell.entries ?? []).map((e) => String(e).trim()).filter((e) => e.length > 0);
    assert.ok(entries.length > 0,
      `the census records ${key} for ${ROUTE_KEY} with no non-empty entry; this packet will not print an empty quotation`);
    return entries;
  };

  const filingDestination = recorded("filingDestination");
  /*
   * The load-bearing assertion of this family. The residence-based venue rule is
   * the one thing this packet tells the participant that they could not read off
   * the form, and it comes from here. If the record stops carrying it, the build
   * refuses rather than send someone to the wrong courthouse.
   */
  const venueRule = filingDestination.find((e) => /where the person lives/i.test(e));
  assert.ok(venueRule,
    `the route-obligation census no longer records the residence-based venue rule for ${ROUTE_KEY}. This packet's `
    + "filing instruction rests on that record, so the build refuses rather than state a venue nothing declares.");
  const clerkBasis = filingDestination.find((e) => /clerk'?s office/i.test(e));
  assert.ok(clerkBasis, `the route-obligation census no longer names a clerk's office as the destination for ${ROUTE_KEY}`);

  const laterCompletion = recorded("laterCompletionFields");
  const narrativeBasis = laterCompletion.find((e) => /nine narrative answers/i.test(e));
  assert.ok(narrativeBasis,
    "the route-obligation census no longer records the nine narrative answers as a later-completion field; the "
    + "packet cites that record when it leaves all nine blank.");

  const waitingPeriod = recorded("waitingPeriodCalculation");
  const dispositionBasis = waitingPeriod.find((e) => /dismissal or nolle prosequi/i.test(e));
  assert.ok(dispositionBasis,
    "the route-obligation census no longer records this route as available on the dismissal or nolle prosequi "
    + "without an elapsed wait; the packet states that to the participant.");

  return {
    routeKey: route.routeKey, trackId: route.trackId,
    filingDestination, venueRule, clerkBasis,
    laterCompletion, narrativeBasis,
    waitingPeriod, dispositionBasis,
    requiredParticipantAttachments: recorded("requiredParticipantAttachments"),
    signatureRequirements: recorded("signatureRequirements"),
    primaryFiling: recorded("primaryOfficialFormOrComposedPleading"),
    uncontestedHearing: recorded("uncontestedHearingTreatment"),
    contestedHandoff: recorded("contestedHearingOrOppositionHandoff"),
    notRecorded: Object.entries(route.deliverable ?? {})
      .filter(([, v]) => v?.status !== "recorded").map(([k]) => k).sort()
  };
}

/*
 * Participant actions and self-help boundaries are controlling-record data,
 * not a side effect of the form's blank census.  Read both records and require
 * their shared action list to agree before this family can publish guidance.
 */
function guidanceRecords() {
  const packetManifest = JSON.parse(fs.readFileSync(path.join(ROOT, PACKET_SET_MANIFESTS), "utf8"));
  const packetSet = (packetManifest.packetSets ?? []).find((p) => p.packetSetId === "ma-seal-court-set");
  assert.ok(packetSet, `${PACKET_SET_MANIFESTS} carries no ma-seal-court-set`);
  const registry = JSON.parse(fs.readFileSync(path.join(ROOT, TRACK_REGISTRY), "utf8"));
  const track = (registry.tracks ?? []).find((t) => t.trackId === "ma-seal-court");
  assert.ok(track, `${TRACK_REGISTRY} carries no ma-seal-court`);
  assert.equal(track.packetSet?.packetSetId, packetSet.packetSetId,
    "the track registry and packet-set manifest disagree on this packet set");
  const packetActions = packetSet.participantActionRequired ?? [];
  const trackActions = track.packetSet?.participantActionRequired ?? [];
  assert.deepEqual(trackActions, packetActions,
    "the track registry and packet-set manifest disagree on participant actions");
  assert.deepEqual(track.packetSet?.requiredBeforeFiling, packetSet.requiredBeforeFiling,
    "the track registry and packet-set manifest disagree on required-before-filing actions");
  const requiredActions = packetActions.filter((a) => a.requiredBeforeFiling === true);
  const externalActions = requiredActions.filter((a) => a.kind === "obtain_document" || a.kind === "confirm_answer");
  assert.equal(externalActions.length, 2,
    `expected exactly two external required-before-filing actions, found ${externalActions.length}`);
  assert.equal(track.selfHelpStopConditions?.length, 4,
    `expected four recorded self-help stop conditions, found ${track.selfHelpStopConditions?.length ?? 0}`);
  return {
    requiredBeforeFiling: packetSet.requiredBeforeFiling,
    externalActions,
    selfHelpStopConditions: track.selfHelpStopConditions
  };
}

function assertGuidanceComplete(instructionsText, guidance) {
  for (const action of guidance.externalActions) {
    assert.ok(instructionsText.includes(action.description),
      `required participant action is absent from generated guidance: ${action.description}`);
  }
  assert.ok(instructionsText.includes("Stop and get help before filing or continuing"),
    "the generated guidance has no participant stop-and-get-help section");
  for (const condition of guidance.selfHelpStopConditions) {
    assert.ok(instructionsText.includes(condition),
      `recorded self-help stop condition is absent from generated guidance: ${condition}`);
  }
  assert.ok(instructionsText.includes("LegalEase never collects, inspects or authenticates it."),
    "the CORI boundary is absent from generated guidance");
}

/* ---- source binding --------------------------------------------------------- */
function resolveSource(binding) {
  const searched = [];
  for (const root of CUSTODY_ROOTS) {
    const abs = path.resolve(ROOT, root, binding.declaredPath);
    const exists = fs.existsSync(abs);
    searched.push({ root, absolutePath: abs, exists });
    if (!exists) continue;
    const bytes = fs.readFileSync(abs);
    const sha256 = crypto.createHash("sha256").update(bytes).digest("hex");
    searched[searched.length - 1].sha256 = sha256;
    if (sha256 !== binding.sha256) continue;
    return {
      bound: true, custodyRoot: root, pathInArchive: binding.declaredPath,
      sha256, byteLength: bytes.length, bytes, searched
    };
  }
  return { bound: false, searched };
}

/* ---- census ----------------------------------------------------------------- */
const flat = (x) => String(x ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

async function censusOf(source) {
  const doc = await PDFDocument.load(source.bytes, { ignoreEncryption: true });
  const pages = doc.getPages();
  const pageText = pages.map((p, i) => ({
    page: i + 1,
    lines: groupIntoLines(extractTextItems(p)).map((l) => ({ y: Math.round(l.y), text: l.text })),
    items: extractTextItems(p).map((it) => ({ x: +it.x.toFixed(1), y: Math.round(it.y), text: it.text }))
  }));

  const acroBefore = doc.catalog.lookup(PDFName.of("AcroForm"));
  const xfaInInputDict = Boolean(acroBefore && acroBefore.get(PDFName.of("XFA")) !== undefined);

  const lineCarries = (page, y, needle, tolerance = 2) => {
    const lines = pageText.find((p) => p.page === page)?.lines ?? [];
    const near = lines.filter((l) => Math.abs(l.y - y) <= tolerance);
    return { found: near.some((l) => flat(l.text).includes(flat(needle))), linesThere: near.map((l) => l.text) };
  };

  /*
   * THE ROW NUMBERS THE FORM ACTUALLY PRINTS, read from the binary.
   *
   * Page 1 prints "1." to "14." down the left margin and page 3 prints "15." to
   * "37." on the Continuation Sheet. Every table cell is matched to one of these
   * by geometry, because the AcroForm index order does not follow them.
   */
  const printedRowNumbers = [];
  for (const p of pageText) {
    for (const l of p.lines) {
      const m = /^\s*(\d{1,2})\.\s*$/.exec(l.text);
      if (!m) continue;
      printedRowNumbers.push({ page: p.page, y: l.y, row: Number(m[1]) });
    }
  }

  /*
   * The three column headings, matched by ITEM x-position rather than by
   * extracted line. The header's five lines interleave — "Charge Date of Nolle
   * Prosequi or" is one of them — and read naively they put the date column in
   * the middle, where the nolle-or-dismissed chooser actually is.
   */
  const columnDrift = [];
  for (const col of TABLE_COLUMNS) {
    const items = (pageText.find((p) => p.page === 1)?.items ?? [])
      .filter((it) => Math.abs(it.y - col.headerY) <= 2 && Math.abs(it.x - col.headerX) <= 6);
    if (!items.some((it) => flat(it.text).includes(flat(col.headerNeedle)))) {
      columnDrift.push({
        column: col.id, headerX: col.headerX, headerY: col.headerY, needle: col.headerNeedle,
        itemsThere: items.map((it) => ({ x: it.x, text: it.text }))
      });
    }
  }

  const rows = [];
  const unmapped = [];
  const rowAssignmentDrift = [];
  const indexVersusPrintedRow = [];

  for (const field of doc.getForm().getFields()) {
    const name = field.getName();
    const widgets = field.acroField.getWidgets().map((w) => {
      const r = w.getRectangle();
      const ref = w.P();
      let pi = pages.findIndex((p) => p.ref === ref);
      if (pi < 0) pi = 0;
      let onState = null;
      let appearanceStates = [];
      try {
        const ap = w.dict.lookup(PDFName.of("AP"));
        const n = ap ? ap.lookup(PDFName.of("N")) : null;
        if (n && typeof n.keys === "function") appearanceStates = n.keys().map((k) => k.asString());
        if (typeof w.getOnValue === "function") onState = String(w.getOnValue() ?? "");
      } catch { /* a widget without an /AP is recorded as having none */ }
      return {
        page: pi + 1,
        rect: { x: +r.x.toFixed(2), y: +r.y.toFixed(2), width: +r.width.toFixed(2), height: +r.height.toFixed(2) },
        rectBasis: "acroform_widget_rect_read_first_hand_from_pinned_binary",
        appearanceStates, onState
      };
    });

    let entry = STATIC_FIELDS[name] ?? null;
    let tableCell = null;

    if (!entry) {
      const column = TABLE_COLUMNS.find((c) => name.startsWith(c.prefix.replace("[<p>]", "[0]"))
        || name.startsWith(c.prefix.replace("[<p>]", "[2]")));
      const w = widgets[0];
      if (column && w) {
        /* The printed row number sits about 7 points above the widget's own
         * bottom edge. Exactly one must match, on the widget's own page. */
        const candidates = printedRowNumbers.filter((r) => r.page === w.page
          && r.y - w.rect.y >= 4 && r.y - w.rect.y <= 11);
        if (candidates.length !== 1) {
          rowAssignmentDrift.push({
            field: name, page: w.page, widgetY: w.rect.y, candidates,
            why: "a table cell matched no printed row number, or matched more than one"
          });
        } else {
          const rowNumber = candidates[0].row;
          const indexInName = Number(/\[(\d+)\]$/.exec(name)?.[1] ?? -1);
          indexVersusPrintedRow.push({
            field: name, column: column.id, acroFormIndex: indexInName, printedRowNumber: rowNumber,
            agrees: (column.id === "charge" && indexInName === rowNumber - 1)
              || (column.id !== "charge" && indexInName === rowNumber - 1)
          });
          tableCell = { column, rowNumber };
          entry = {
            section: S.TABLE, tableRow: rowNumber, tableColumn: column.id,
            caption: `${rowNumber}.`, captionAt: { page: w.page, y: candidates[0].y },
            columnHeading: column.columnHeading,
            label: `Row ${rowNumber} — ${column.columnHeading}`,
            ...SUPPLY(`for the charge on row ${rowNumber}: ${column.what}`)
          };
        }
      }
    }

    if (!entry) { unmapped.push({ field: name, widgets }); continue; }

    let sourceValue = null;
    let options = null;
    try {
      if (typeof field.isChecked === "function") sourceValue = field.isChecked() ? "on" : null;
      else if (typeof field.getSelected === "function") {
        const sel = field.getSelected();
        sourceValue = Array.isArray(sel) && sel.length > 0 ? sel.join(" | ") : null;
        options = typeof field.getOptions === "function" ? field.getOptions() : null;
      } else if (typeof field.getText === "function") sourceValue = field.getText() ?? null;
    } catch { sourceValue = null; }

    rows.push({
      key: name, name, page: widgets[0]?.page ?? null, widgets, sourceValue, options,
      rect: widgets[0]?.rect ?? null, rectBasis: widgets[0]?.rectBasis ?? null,
      type: field.constructor.name.replace(/^PDF/, "").toLowerCase().replace("textfield", "text"),
      isSelectionControl: entry.selection === true || field.constructor.name === "PDFCheckBox",
      multiline: typeof field.isMultiline === "function" ? field.isMultiline() : false,
      maxLength: typeof field.getMaxLength === "function" ? (field.getMaxLength() ?? null) : null,
      section: entry.section, effectiveLabel: entry.label,
      caption: entry.caption, captionAt: entry.captionAt,
      subCaptions: entry.subCaptions ?? null,
      tableRow: entry.tableRow ?? null, tableColumn: entry.tableColumn ?? null,
      questionNumber: entry.questionNumber ?? null,
      courtDepartment: entry.courtDepartment ?? null,
      policy: entry.policy, fact: entry.fact ?? null, factIds: entry.factIds ?? null,
      refusalClass: entry.refusalClass ?? null, what: entry.what ?? null,
      why: entry.why ?? null,
      whyTheRouteCannotDetermineIt: entry.whyTheRouteCannotDetermineIt ?? null,
      isTableCell: Boolean(tableCell),
      sharedRegistryWouldBindFromName: (() => {
        const d = decideBinding({ name, pdfType: field.constructor.name === "PDFTextField" ? "text" : "other", effectiveLabel: null, regionHeading: null }, {});
        return d.writable ? d.factId : null;
      })(),
      sharedRegistryWouldBindFromThisBuildsLabel: (() => {
        const d = decideBinding({
          name, pdfType: field.constructor.name === "PDFTextField" ? "text" : "other",
          effectiveLabel: entry.label, regionHeading: entry.section
        }, {});
        return d.writable ? d.factId : null;
      })()
    });
  }

  const staticKeys = new Set(Object.keys(STATIC_FIELDS));
  for (const r of rows) staticKeys.delete(r.key);

  const captionDrift = [];
  for (const r of rows) {
    if (!r.captionAt) continue;
    const hit = lineCarries(r.captionAt.page, r.captionAt.y, r.caption);
    if (!hit.found) {
      captionDrift.push({ key: r.key, page: r.captionAt.page, y: r.captionAt.y, caption: r.caption, linesThere: hit.linesThere.slice(0, 2) });
    }
  }

  /* The Address box's two printed sub-captions, re-read: they are the evidence
   * for composing that one box out of several held facts. */
  const subCaptionDrift = [];
  const addressRow = rows.find((r) => r.subCaptions);
  if (addressRow) {
    for (const sub of addressRow.subCaptions) {
      const hit = lineCarries(addressRow.captionAt.page, sub.y, sub.text);
      if (!hit.found) subCaptionDrift.push({ ...sub, linesThere: hit.linesThere.slice(0, 2) });
    }
  }

  const sentencesOf = (text, count) => String(text).split(/(?<=\.)\s+/).slice(0, count).join(" ").trim();
  const anchorDrift = [];
  const anchorText = {};
  for (const a of FORM_ANCHORS) {
    const hit = lineCarries(a.page, a.y, a.needle, 3);
    if (!hit.found) { anchorDrift.push({ ...a, linesThere: hit.linesThere.slice(0, 2) }); continue; }
    if (!a.quoteSpan) { anchorText[a.id] = hit.linesThere.join(" ").replace(/\s+/g, " ").trim(); continue; }
    const { fromY, toY, sentences, terminator = "." } = a.quoteSpan;
    const lines = (pageText.find((p) => p.page === a.page)?.lines ?? [])
      .filter((l) => l.y <= fromY + 2 && l.y >= toY - 2)
      .sort((x, y) => y.y - x.y)
      .map((l) => l.text);
    const joined = lines.join(" ").replace(/\s+/g, " ").trim();
    const quoted = terminator === ":" ? joined : sentencesOf(joined, sentences);
    if (!quoted.endsWith(terminator) || !flat(quoted).includes(flat(a.needle))) {
      anchorDrift.push({
        ...a, assembled: quoted.slice(0, 200), linesInSpan: lines.length,
        why: "the printed sentence this packet quotes could not be assembled whole from the span recorded for it"
      });
      continue;
    }
    anchorText[a.id] = quoted;
  }

  /* The nolle-or-dismissed chooser's own option list, read from the binary: the
   * second independent reading of which column is which. */
  const chooserOptions = rows.filter((r) => r.tableColumn === "nolle_or_dismissed")
    .map((r) => (r.options ?? []).map((o) => String(o).trim()).filter((o) => o.length > 0));

  return {
    rows, unmapped, stale: [...staticKeys],
    captionDrift, anchorDrift, anchorText, subCaptionDrift, columnDrift,
    rowAssignmentDrift, indexVersusPrintedRow, printedRowNumbers, chooserOptions,
    xfaInInputDict,
    pageText: pageText.map((p) => ({ page: p.page, lines: p.lines })), pageCount: pages.length
  };
}

/* ---- render ----------------------------------------------------------------- */
async function renderDocument(source, census, fixtureName) {
  const facts = FIXTURES[fixtureName];
  const writeRows = census.rows.filter((r) => r.policy === "write");
  const composedRows = census.rows.filter((r) => r.policy === "composed");

  /*
   * Everything that is not one of the four held writes is refused by ROLE. The
   * gate runs before the descriptor channel and is not overridable, which is
   * what makes it safe to label 111 table cells "Row n — Charge ..." for the
   * participant's benefit: the shared registry matches several of those labels
   * and the role list is why none of them can cause a write.
   */
  const unwritableFields = census.rows
    .filter((r) => r.policy !== "write" && r.policy !== "composed")
    .map((r) => ({ field: r.name }));

  const { bytes, report } = await finalizeOfficialForm({
    sourceBytes: source.bytes,
    expectedSha256: source.sha256,
    census: census.rows.map((r) => ({
      name: r.name, type: r.type, effectiveLabel: r.effectiveLabel, regionHeading: r.section,
      widgets: r.widgets.map((w) => ({ page: w.page, rect: w.rect })),
      multiline: r.multiline === true, maxLength: r.maxLength ?? null
    })),
    facts,
    explicitMappings: Object.fromEntries(writeRows.map((r) => [r.name, r.fact])),
    composedFieldValues: Object.fromEntries(composedRows.map((r) => [r.name, { factIds: r.factIds }])),
    unwritableFields,
    documentTextLines: census.pageText.flatMap((p) => p.lines.map((l) => l.text)),
    /*
     * Load-bearing: every check box on this form ships a "/1" appearance and NO
     * "/Off", and every text field ships no /AP at all. Without suppression
     * pdf-lib synthesizes an appearance for each unticked box and flatten stamps
     * a stroked square the size of the rectangle — ink this court's form does
     * not print, seven times over on a three-page filing.
     */
    suppressSynthesizedAppearances: true,
    suppressSynthesizedWidgetBorders: true,
    title: "Petition to Seal Criminal Records for Nolle Prosequi or Dismissal"
  });
  return { bytes, report };
}

/* ---- byte proof -------------------------------------------------------------- *
 * See the § 100K builder's own note: ink is measured by operator SEMANTICS, not
 * by operator census. `m l c v y h re W n` construct and clip and mark nothing,
 * and pdf-lib's generated appearance for an unwritten text field is exactly such
 * a preamble around an EMPTY `<> Tj`. Stroke, fill, shading and XObject
 * operators mark the page whatever their operand; show-text marks it only if it
 * has one, which is read from the stream's own string operands.
 */
const INK_OPS = /(?:^|[\s])(?:S|s|f\*?|F|B\*?|b\*?|sh|Do)(?=[\s]|$)/g;
const SHOW_TEXT_OPS = /(?:^|[\s])(?:Tj|TJ|'|")(?=[\s]|$)/g;
const PATH_ONLY_OPS = /(?:^|[\s])(?:re|m|l|c|v|y|h|W\*?|n)(?=[\s]|$)/g;
const inflate = (buf) => { try { return zlib.inflateSync(buf); } catch { return buf; } };

const countInkOps = (s) => (String(s).match(INK_OPS) ?? []).length;
const countShowTextOps = (s) => (String(s).match(SHOW_TEXT_OPS) ?? []).length;
const countPathOnlyOps = (s) => (String(s).match(PATH_ONLY_OPS) ?? []).length;

async function checkBoxAppearanceBaseline(source) {
  const doc = await PDFDocument.load(source.bytes, { ignoreEncryption: true });
  const ctx = doc.context;
  const baseline = new Map();
  for (const field of doc.getForm().getFields()) {
    if (field.constructor.name !== "PDFCheckBox") continue;
    for (const w of field.acroField.getWidgets()) {
      const ap = ctx.lookup(w.dict.get(PDFName.of("AP")));
      if (!ap) { baseline.set(field.getName(), { states: [], offStreamPresent: false, offInkOps: null, onInkOps: null }); continue; }
      const n = ctx.lookup(ap.get(PDFName.of("N")));
      if (!n || typeof n.get !== "function") continue;
      const states = typeof n.keys === "function" ? n.keys().map((k) => k.asString()) : [];
      const off = n.get(PDFName.of("Off"));
      let offInkOps = null;
      if (off) offInkOps = countInkOps(inflate(Buffer.from(ctx.lookup(off).contents)).toString("latin1"));
      const on = states.find((s) => s !== "/Off");
      let onInkOps = null;
      if (on) {
        const stream = ctx.lookup(n.get(PDFName.of(on.replace(/^\//, ""))));
        if (stream?.contents) onInkOps = countInkOps(inflate(Buffer.from(stream.contents)).toString("latin1"));
      }
      baseline.set(field.getName(), { states, offStreamPresent: Boolean(off), offInkOps, onInkOps });
    }
  }
  return baseline;
}

async function flattenedAppearanceBodies(file) {
  const doc = await PDFDocument.load(fs.readFileSync(file), { ignoreEncryption: true, updateMetadata: false });
  const ctx = doc.context;
  const bodies = new Map();
  for (const page of doc.getPages()) {
    const resources = page.node.get(PDFName.of("Resources"));
    const xObjects = resources && ctx.lookup(resources).get(PDFName.of("XObject"));
    if (!xObjects) continue;
    const dict = ctx.lookup(xObjects);
    for (const key of dict.keys()) {
      const obj = ctx.lookup(dict.get(key));
      if (!obj?.contents) continue;
      bodies.set(key.asString().replace(/^\//, ""), inflate(Buffer.from(obj.contents)).toString("latin1"));
    }
  }
  return bodies;
}

const nonWhitespaceGlyphs = (s) => (String(s).match(/\S/g) ?? []).length;

async function byteProof(source, census, artifactFile, fixtureName, report) {
  const widgets = await flattenedWidgets(path.join(ROOT, artifactFile));
  const bodies = await flattenedAppearanceBodies(path.join(ROOT, artifactFile));
  const boxBaseline = await checkBoxAppearanceBaseline(source);

  const actualWrites = [];
  const selectionsRead = [];
  const refusedFieldsWithInk = [];
  const documentAuthoredAppearances = [];
  const synthesizedAppearancesFound = [];
  let glyphs = 0;

  const writtenByFinalizer = new Set(report.written.map((w) => w.field));

  for (const r of census.rows) {
    for (const wdg of r.widgets) {
      const drawn = drawnAt(widgets, { page: wdg.page, rect: wdg.rect });
      const ink = drawn.map((d) => d.text).filter(Boolean).join("").trim();
      const inkOps = drawn.reduce((n, d) => n + countInkOps(bodies.get(d.appearance) ?? ""), 0);
      const showTextOps = drawn.reduce((n, d) => n + countShowTextOps(bodies.get(d.appearance) ?? ""), 0);
      const pathOnlyOps = drawn.reduce((n, d) => n + countPathOnlyOps(bodies.get(d.appearance) ?? ""), 0);

      if (r.isSelectionControl) {
        const baseline = boxBaseline.get(r.name) ?? null;
        selectionsRead.push({
          control: r.name, page: wdg.page, rect: wdg.rect,
          glyphChannel: ink, glyphChannelMarked: ink.length > 0,
          appearancesStampedInOutput: drawn.length,
          inkOperatorsInOutput: inkOps,
          pathConstructionAndClipOperatorsInOutput: pathOnlyOps,
          sourceAppearanceStates: baseline?.states ?? [],
          sourceShipsAnOffAppearance: baseline?.offStreamPresent ?? null,
          inkOperatorsInSourceOnAppearance: baseline?.onInkOps ?? null,
          marked: ink.length > 0 || inkOps > 0,
          expectedMarked: false
        });
        if (ink.length > 0 || inkOps > 0) {
          synthesizedAppearancesFound.push({
            field: r.key, page: wdg.page, rect: wdg.rect, inkOps,
            sourceOnStateInkOps: baseline?.onInkOps ?? null,
            why:
              "this form ships no /Off appearance for its check boxes, so an appearance that MARKS the page at an "
              + "unticked box is ink the court's form does not print"
          });
          refusedFieldsWithInk.push({
            fieldId: r.key, page: wdg.page, drawnText: [ink], inkOps,
            why: "a selection control this packet does not make marks the page in the output"
          });
        }
        continue;
      }

      if (drawn.length === 0) continue;
      if (r.sourceValue !== null && r.sourceValue !== undefined && !writtenByFinalizer.has(r.name)) {
        documentAuthoredAppearances.push({ field: r.key, page: wdg.page, rect: wdg.rect, drawnText: [ink], sourceValue: r.sourceValue });
        continue;
      }
      if (!writtenByFinalizer.has(r.name)) {
        if (ink.length > 0 || inkOps > 0) {
          refusedFieldsWithInk.push({ fieldId: r.key, page: wdg.page, drawnText: [ink], inkOps, showTextOps, pathOnlyOps });
        }
        continue;
      }
      glyphs += nonWhitespaceGlyphs(ink);
      const composedWrite = (report.composedWrites ?? []).find((c) => c.field === r.name) ?? null;
      actualWrites.push({
        field: r.key, factId: r.fact ?? null,
        composedFrom: composedWrite?.composedFrom ?? null,
        composedValues: composedWrite?.composedValues ?? null,
        drawnLinesReportedByFinalizer: composedWrite?.drawnLines ?? null,
        page: wdg.page, rect: wdg.rect, drawnText: [ink]
      });
    }
  }

  const outsideWriteBoxes = [];
  let outsideGlyphs = 0;
  const writeRects = census.rows.filter((r) => writtenByFinalizer.has(r.name))
    .flatMap((r) => r.widgets.map((w) => ({ page: w.page, rect: w.rect })));
  for (const w of widgets) {
    const insideAWriteBox = writeRects.some((b) => b.page === w.page
      && Math.abs(w.x - b.rect.x) <= 2 && Math.abs(w.y - b.rect.y) <= 2);
    if (insideAWriteBox) continue;
    const count = nonWhitespaceGlyphs(w.text ?? "");
    if (count === 0) continue;
    outsideGlyphs += count;
    outsideWriteBoxes.push({ page: w.page, x: w.x, y: w.y, appearance: w.appearance, text: w.text, glyphs: count });
  }

  return {
    fixture: fixtureName,
    proofMethod:
      "every one of the 135 measured widget /Rects of the finalized bytes is read for the appearance stamped there, "
      + "its show-text OPERANDS and its count of stroke, fill, shading and XObject operators — the ones that mark the "
      + "page whatever their operand — kept apart from the path-construction and clipping operators, which mark "
      + "nothing. Then every flattened appearance in the whole artifact is read again and any non-whitespace glyph "
      + "outside a measured write box is counted. Selection controls are read on the ink-operator channel as well as "
      + "the glyph channel because a synthesized border draws no glyph, and this form ships no /Off appearance for "
      + "any of its seven boxes; the source's own ON appearance strokes, so a real tick reads on that channel.",
    actualWrites, selectionsRead, refusedFieldsWithInk, documentAuthoredAppearances,
    synthesizedAppearancesFound,
    glyphs, outsideGlyphs, outsideWriteBoxes,
    appearances: widgets.length
  };
}

/* ---- the refusals the finalizer measured ------------------------------------- */
function geometryRefusalsOf(report) {
  const out = new Map();
  for (const u of report.unfittable ?? []) {
    out.set(u.field, {
      field: u.field, factId: u.factId ?? null, composedFrom: u.composedFrom ?? null, kind: "width",
      reason: u.reason ?? "value_does_not_fit_the_widget_at_a_readable_size",
      measurement: { outcome: u.outcome ?? null, fontSize: u.fontSize ?? null, minFontSize: u.minFontSize ?? null }
    });
  }
  for (const r of report.refused ?? []) {
    if (r.reason !== "value_exceeds_form_max_length") continue;
    out.set(r.field, {
      field: r.field, factId: r.factId ?? null, composedFrom: r.composedFrom ?? null, kind: "max_length",
      reason: r.reason,
      measurement: { declaredMaxLength: r.maxLength ?? null, valueLength: r.valueLength ?? null }
    });
  }
  return out;
}

/* ---- field map ---------------------------------------------------------------- */
function sideOf(census, report, fixtureName) {
  const written = new Set(report.written.map((w) => w.field));
  const geometry = geometryRefusalsOf(report);
  const writes = [];
  const refusals = [];
  const selectionControls = [];

  const heldFor = (r) => (r.policy === "composed"
    ? r.factIds.map((f) => FIXTURES[fixtureName][f] ?? null).filter(Boolean).join(" / ")
    : (FIXTURES[fixtureName][r.fact] ?? null));

  for (const r of census.rows) {
    const base = {
      field: `${DOCUMENT_ID}/${r.key}`,
      fieldName: `${DOCUMENT_ID}/${r.key}`,
      acroFieldName: r.name,
      page: r.page, rect: r.rect, rectBasis: r.rectBasis,
      printedLabel: r.caption, printedLine: r.caption,
      sectionHeading: r.section, regionHeading: r.effectiveLabel,
      effectiveLabel: r.effectiveLabel, captionReadAt: r.captionAt,
      captionBasis:
        "printed caption re-read from the pinned binary at captionReadAt as a flattened substring of the printed line "
        + "there; the build refuses on drift. A table cell's caption is the ROW NUMBER the form prints beside it, "
        + "matched by geometry rather than by the field's own index",
      tableRow: r.tableRow, tableColumn: r.tableColumn,
      sharedRegistryWouldBindFromName: r.sharedRegistryWouldBindFromName,
      sharedRegistryWouldBindFromThisBuildsLabel: r.sharedRegistryWouldBindFromThisBuildsLabel,
      document: DOCUMENT_ID
    };

    if (r.policy === "write" || r.policy === "composed") {
      if (written.has(r.name)) {
        const c = (report.composedWrites ?? []).find((x) => x.field === r.name) ?? null;
        writes.push({
          ...base, factId: r.fact ?? null,
          kind: c ? `${r.type}_composed` : r.type,
          writeChannel: c ? "finalizer_composed_fact_channel" : "finalizer_descriptor_channel",
          composedFrom: r.factIds ?? null,
          composedValues: c?.composedValues ?? null,
          drawnLines: c?.drawnLines ?? null
        });
        continue;
      }
      const g = geometry.get(r.name);
      const held = heldFor(r);
      const measuredWhy = g && g.kind === "max_length"
        ? `the form limits this box to ${g.measurement.declaredMaxLength} characters and the value held for you is `
          + `${g.measurement.valueLength}`
        : `the box the form prints is ${r.rect?.width ?? "?"} by ${r.rect?.height ?? "?"} points and the value held `
          + `for you is ${held === null ? "?" : String(held).length} characters, which will not fit inside it even at `
          + `the smallest size that stays readable (${g?.measurement?.minFontSize ?? "?"} point)`;
      refusals.push({
        ...base,
        reason: `the value this ${fixtureName} participant holds will not fit the box the form prints: ${measuredWhy}`,
        measuredWhy,
        category: null, completenessClass: null, class: null,
        disposition: "REQUIRED_BEFORE_FILING", completenessDisposition: "REQUIRED_BEFORE_FILING",
        requiredBeforeFiling: true, identity: `${DOCUMENT_ID} field ${r.key}`,
        factId: r.fact ?? null, routeDetermined: false,
        heldButNotPrinted: true, heldValue: held, geometryRefusal: g ?? null, widgetRect: r.rect,
        why:
          "the packet refuses the write rather than shortening it: a value the form's own geometry will not hold is "
          + "left blank and named to the participant, never printed in part",
        participantMustSupply:
          `write this in by hand — the platform holds it but this box will not take it whole. What it holds: `
          + `${held ?? "(not held)"}. Never shorten your own details to fit a box.`
      });
      continue;
    }

    if (r.policy === "election") {
      const row = {
        ...base,
        reason: `this is your own election and the platform does not make it for you: ${r.why}`,
        category: PARTICIPANT_ELECTION, completenessClass: PARTICIPANT_ELECTION, class: PARTICIPANT_ELECTION,
        requiredBeforeFiling: false, routeDetermined: false,
        why: r.why, participantMustSupply: r.why
      };
      if (r.isSelectionControl) {
        selectionControls.push({
          ...row, selectionId: base.field, kind: "selection_control", type: r.type,
          widgets: r.widgets, disposition: "participant_election"
        });
      } else {
        refusals.push(row);
      }
      continue;
    }

    if (r.policy === "case_fact") {
      const row = {
        ...base,
        reason: `the case decides this, not the route: ${r.what}`,
        category: null, completenessClass: null, class: null,
        disposition: "REQUIRED_BEFORE_FILING", completenessDisposition: "REQUIRED_BEFORE_FILING",
        requiredBeforeFiling: true, identity: `${DOCUMENT_ID} field ${r.key}`,
        factId: null, routeDetermined: false,
        determinedByTheCaseNotTheRoute: true,
        whyTheRouteCannotDetermineIt: r.whyTheRouteCannotDetermineIt,
        courtDepartment: r.courtDepartment ?? null,
        why: r.whyTheRouteCannotDetermineIt, participantMustSupply: r.what
      };
      if (r.isSelectionControl) {
        selectionControls.push({
          ...row, selectionId: base.field, kind: "selection_control", type: r.type, widgets: r.widgets
        });
      }
      refusals.push(row);
      continue;
    }

    if (r.policy === "protect") {
      const row = {
        ...base, reason: r.why, category: r.refusalClass,
        completenessClass: r.refusalClass, class: r.refusalClass,
        requiredBeforeFiling: false, routeDetermined: false, why: r.why
      };
      if (r.isSelectionControl) {
        selectionControls.push({
          ...row, selectionId: base.field, kind: "selection_control", type: r.type,
          widgets: r.widgets, disposition: "court_owned"
        });
      }
      refusals.push(row);
      continue;
    }

    refusals.push({
      ...base,
      reason: `the participant supplies this before filing: ${r.what}`,
      category: null, completenessClass: null, class: null,
      disposition: "REQUIRED_BEFORE_FILING", completenessDisposition: "REQUIRED_BEFORE_FILING",
      requiredBeforeFiling: true, identity: `${DOCUMENT_ID} field ${r.key}`,
      factId: null, routeDetermined: false,
      questionNumber: r.questionNumber ?? null,
      why: `the platform holds no value it may write here and the participant supplies it before filing: ${r.what}`,
      participantMustSupply: r.what
    });
  }

  return { writes, refusals, selectionControls };
}

function mapFor(census, canonicalReport, boundaryReport, route) {
  const canonical = sideOf(census, canonicalReport, "canonical");
  const boundary = sideOf(census, boundaryReport, "boundary");
  return {
    formNumber: DOCUMENT_ID, documentId: DOCUMENT_ID, documentRole: "primary_filing",
    documentPolicy: { mode: "participant", captionOnly: false, documentAcceptsFill: true, routeKey: route.routeKey },
    structuralClass: "acroform_xfa_hybrid",
    explicitMappings: Object.fromEntries(census.rows.filter((r) => r.policy === "write").map((r) => [r.name, r.fact])),
    composedMappings: Object.fromEntries(census.rows.filter((r) => r.policy === "composed").map((r) => [r.name, r.factIds])),
    roleRefusals: [],
    tableRowBasis:
      "every table cell's row number is the number the FORM PRINTS beside it, matched by geometry. The AcroForm index "
      + "order does not follow the printed order on this form, so a cell's own index is not evidence of its row.",
    selectionControls: canonical.selectionControls,
    canonicalWrites: canonical.writes, canonicalRefusals: canonical.refusals,
    boundaryWrites: boundary.writes, boundaryRefusals: boundary.refusals
  };
}

/* ---- the builder's own count of the nine counters ------------------------------ */
function countCompleteness(maps, writeProofs, artifacts, instructionsText) {
  const counters = Object.fromEntries(PASS_COUNTERS.map((c) => [c, 0]));
  const findings = [];
  const note = (counter, detail) => { counters[counter] += 1; findings.push({ counter, ...detail }); };

  const row = (r, selection = false) => ({
    id: r.field, name: r.fieldName ?? r.field, label: r.effectiveLabel ?? "", reason: r.reason ?? "",
    refusalClass: r.category ?? null, page: r.page ?? null, document: r.document ?? null,
    factId: r.factId ?? null, isSelectionControl: selection,
    declared: {
      disposition: r.completenessDisposition ?? null,
      ...(Object.hasOwn(r, "requiredBeforeFiling") ? { requiredBeforeFiling: r.requiredBeforeFiling === true } : {}),
      ...(Object.hasOwn(r, "routeDetermined") ? { routeDetermined: r.routeDetermined === true } : {}),
      routeConditionThatMakesItInapplicable: r.routeConditionThatMakesItInapplicable ?? null,
      determinedByTheCaseNotTheRoute: r.determinedByTheCaseNotTheRoute === true,
      whyTheRouteCannotDetermineIt: r.whyTheRouteCannotDetermineIt ?? null,
      identity: r.identity ?? null, factId: r.factId ?? null
    }
  });

  const writes = maps.flatMap((m) => m.canonicalWrites.map((w) => row(w)));
  const blanks = [];
  const seen = new Set();
  for (const m of maps) {
    for (const r of m.canonicalRefusals) { if (seen.has(r.field)) continue; seen.add(r.field); blanks.push(row(r, false)); }
    for (const c of m.selectionControls) { if (seen.has(c.field)) continue; seen.add(c.field); blanks.push(row(c, true)); }
  }

  const availableFacts = new Set(writes.flatMap((w) => (w.factId ? [w.factId] : [])));
  const normLabel = (x) => String(x ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const writtenInDocument = new Map();
  for (const w of writes) {
    if (!writtenInDocument.has(w.document)) writtenInDocument.set(w.document, new Set());
    for (const k of [normLabel(w.label), normLabel(w.name)]) if (k.length >= 4) writtenInDocument.get(w.document).add(k);
  }

  const ledger = [];
  for (const blank of blanks) {
    const here = writtenInDocument.get(blank.document) ?? new Set();
    const declared = {
      ...blank.declared,
      factAvailable: (blank.declared.factId ? availableFacts.has(String(blank.declared.factId)) : false)
        || here.has(normLabel(blank.label)) || here.has(normLabel(blank.name))
    };
    const verdict = classifyBlank(blank, blank.reason, blank.refusalClass, declared);
    ledger.push({ field: blank.id, label: blank.label, ...verdict });
    if (BLANK_DISPOSITIONS[verdict.disposition].allowed) continue;
    const counter = verdict.disposition === "KNOWN_FACT_NOT_WRITTEN" ? "knownRequiredFieldsMissing"
      : verdict.disposition === "ROUTE_OPTION_NOT_SELECTED" ? "requiredOptionsMissing" : "unclassifiedBlanks";
    note(counter, { field: blank.id, label: blank.label, disposition: verdict.disposition, basis: verdict.basis });
  }

  const instructions = String(instructionsText ?? "");
  for (const b of ledger.filter((x) => x.disposition === "REQUIRED_BEFORE_FILING")) {
    const needles = [b.label, b.field].map((x) => String(x ?? "").trim()).filter((x) => x.length >= 3);
    if (needles.some((n) => instructions.toLowerCase().includes(n.toLowerCase().slice(0, 60)))) continue;
    note("requiredFactsNotCollected", { field: b.field, label: b.label, why: "declared required-before-filing and not named in participant-instructions.md" });
  }

  const rows = new Map();
  for (const f of [...writes.map((w) => ({ ...w, written: true })), ...blanks.map((b) => ({ ...b, written: false }))]) {
    const key = rowKeyOf(f);
    if (!key) continue;
    if (!rows.has(key)) rows.set(key, []);
    rows.get(key).push(f);
  }
  for (const [key, cells] of rows) {
    if (!cells.some((c) => c.written)) continue;
    const missing = cells.filter((c) => !c.written && classifyField(c.label, c.isSelectionControl === true).requirement === "REQUIRED_KNOWN");
    if (missing.length > 0) note("incompleteRows", { row: key, missingCells: missing.map((m) => m.label) });
  }

  for (const p of writeProofs) {
    const visible = (p.addedGlyphsReadFromOutputBytes ?? 0) + (p.flattenedWidgetAppearancesReadFromOutputBytes ?? 0);
    if ((p.valuesReportedByFinalizer ?? 0) > 0 && visible === 0) {
      note("invisibleWrites", { fixture: p.fixture, why: "the finalizer reported values and the output bytes carry no glyph and no flattened appearance" });
    }
    if ((p.valuesReportedByFinalizer ?? 0) > 0 && (p.addedGlyphsReadFromOutputBytes ?? 0) === 0) {
      note("invisibleWrites", { fixture: p.fixture, why: "the finalizer reported values and no glyph was read from the output bytes inside any measured write box" });
    }
    if ((p.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes ?? 0) > 0) {
      note("visualDefects", { fixture: p.fixture, why: "ink landed outside every measured write box", where: p.glyphsOutsideMeasuredWriteBoxes });
    }
    for (const s of p.synthesizedAppearancesFound ?? []) {
      note("visualDefects", { fixture: p.fixture, field: s.field, why: s.why });
    }
    for (const refused of p.refusedFieldsWithInk ?? []) {
      note("protectedWrites", { fixture: p.fixture, field: refused.fieldId, why: "a field the map refused carries ink in the output" });
    }
  }
  for (const w of writes) {
    if (classifyField(w.label, false).requirement === "PROTECTED") {
      note("protectedWrites", { field: w.id, label: w.label, why: "a protected field was written" });
    }
  }

  const rendered = artifacts.map((a) => `${a.file} ${(a.documents ?? []).join(" ")}`).join(" ").toLowerCase();
  const loose = (x) => String(x).toLowerCase().replace(/[^a-z0-9]/g, "");
  for (const m of maps) {
    if (!rendered.includes(String(m.formNumber).toLowerCase()) && !loose(rendered).includes(loose(m.formNumber))) {
      note("requiredComponentsMissing", { component: m.formNumber, why: "the field map names this document and it appears in no rendered artifact" });
    }
  }

  return { counters, findings, ledger };
}

/* ---- artifacts ------------------------------------------------------------------ */
function writeJson(rel, value) {
  fs.mkdirSync(path.dirname(path.join(ROOT, rel)), { recursive: true });
  fs.writeFileSync(path.join(ROOT, rel), `${JSON.stringify(value, null, 2)}\n`);
}

function requiredBeforeFilingItems(maps, side = "canonicalRefusals") {
  const seen = new Set();
  return maps.flatMap((m) => m[side]
    .filter((r) => r.requiredBeforeFiling === true)
    .filter((r) => { if (seen.has(r.field)) return false; seen.add(r.field); return true; })
    .map((r) => ({
      document: m.formNumber, field: r.field, page: r.page, rect: r.rect,
      section: r.sectionHeading, disclosureLabel: r.effectiveLabel,
      identity: r.identity, why: r.why, participantMustSupply: r.participantMustSupply,
      ...(r.tableRow ? { tableRow: r.tableRow, tableColumn: r.tableColumn } : {}),
      ...(r.questionNumber ? { questionNumber: r.questionNumber } : {}),
      ...(r.courtDepartment ? { courtDepartment: r.courtDepartment } : {}),
      ...(r.determinedByTheCaseNotTheRoute ? { determinedByTheCaseNotTheRoute: true, whyTheRouteCannotDetermineIt: r.whyTheRouteCannotDetermineIt } : {}),
      ...(r.measuredWhy ? { measuredWhy: r.measuredWhy } : {}),
      ...(r.heldButNotPrinted ? { heldButNotPrinted: true, heldValue: r.heldValue, geometryRefusal: r.geometryRefusal } : {})
    })))
    .sort((a, b) => (a.page - b.page) || ((b.rect?.y ?? 0) - (a.rect?.y ?? 0)));
}

function quote(entry, what) {
  const text = String(entry ?? "").replace(/\s*\n\s*/g, " — ").replace(/\s+/g, " ").trim();
  assert.ok(text.length > 0, `the record's ${what} is empty and this packet will not print an empty quotation`);
  return text;
}

function printed(census, anchorId) {
  const text = String(census.anchorText[anchorId] ?? "").replace(/\s+/g, " ").trim();
  assert.ok(text.length > 0,
    `the form anchor ${anchorId} was matched but carries no text; this packet will not print an empty quotation`);
  return text;
}

function participantInstructions(maps, rbf, boundaryOnlyRbf, route, source, census, guidance) {
  const elections = maps.flatMap((m) => m.selectionControls.filter((c) => c.disposition === "participant_election"));
  const departments = rbf.filter((r) => r.courtDepartment);
  const questions = rbf.filter((r) => r.questionNumber).sort((a, b) => a.questionNumber - b.questionNumber);
  const tableCells = rbf.filter((r) => r.tableRow);
  const otherRbf = rbf.filter((r) => !r.courtDepartment && !r.questionNumber && !r.tableRow);
  const writes = maps.flatMap((m) => m.canonicalWrites);
  const tableRows = [...new Set(tableCells.map((c) => c.tableRow))].sort((a, b) => a - b);

  const out = [];
  out.push("# Filing instructions — ask a Massachusetts court to seal a charge that ended in a nolle prosequi or a dismissal", "");
  out.push(
    "This packet is the Massachusetts Trial Court's **PETITION TO SEAL CRIMINAL RECORDS FOR NOLLE PROSEQUI OR "
    + `DISMISSAL**, form **${DOCUMENT_ID}** (footer \`${printed(census, "form-footer")}\`). Page 1 is the petition and `
    + "the charge table, page 2 is the nine questions and your signature, page 3 is the Continuation Sheet.", ""
  );

  out.push("## Is this the right petition for you?", "");
  out.push(`The form says so on its own face: _"${printed(census, "use-this-form")}"_`, "");
  out.push(
    "**Two things follow from that, and both matter.** First, this petition is only for charges that ended in a "
    + "**nolle prosequi** or a **dismissal** — not for a conviction, and not for a case that ended some other way. "
    + "Second, **one form per case**: if you want records sealed in more than one case, you file a separate petition "
    + "for each.", ""
  );
  out.push(
    "The route record puts the eligibility this way: "
    + `_"${quote(route.dispositionBasis, "the disposition basis")}"_ There is no waiting period to serve on this `
    + "route.", ""
  );
  out.push(
    "**Sealing is not expungement.** Sealing limits who may see the record. Expungement destroys it. Massachusetts "
    + "has a separate expungement petition under a different section of the law, and this packet is not it. If having "
    + "the record destroyed is what you want, this is the wrong form.", ""
  );

  out.push("## Where it goes — read this before you write the division", "");
  out.push(`The route record: _"${quote(route.venueRule, "the venue rule")}"_`, "");
  out.push(
    "**That rule is unusual and it is easy to get wrong.** A District Court case goes back to the clerk's office "
    + "where the case started. A **Boston Municipal Court** case does not: it goes to the BMC division where **you "
    + "live**, and if you no longer live in BMC territory, to the BMC division the most recent eligible record is "
    + "from. Work out your division from that rule before you fill in `COURT DIVISION/COUNTY` at the top of page 1.", ""
  );

  out.push("## Which court department heard the case", "");
  out.push(
    "The four department boxes at the top of page 1 say where the case was **heard**. This packet has ticked none of "
    + "them: one route reaches all four departments and only your own case says which one heard it.", ""
  );
  out.push("| The box | Tick it only if |", "| --- | --- |");
  for (const d of departments) out.push(`| ${d.disclosureLabel} | ${d.participantMustSupply} |`);
  out.push("");

  out.push("## The charge table", "");
  out.push(`The court's own instruction: _"${printed(census, "records-you-want-sealed")}"_`, "");
  out.push(
    `The table gives you **${tableRows.length} lines** — rows 1 to 14 on page 1 and rows 15 to 37 on the `
    + "Continuation Sheet on page 3. **Every cell is blank on your copy.** The platform has never seen your court "
    + "record or your CORI, and a charge, a disposition or a date written from anything else would be a guess on a "
    + "petition you sign under a perjury warning.", ""
  );
  out.push("Each line takes three things, in the order the form prints them across the page:", "");
  out.push("| Column | What the form asks for | What to write |", "| --- | --- | --- |");
  for (const col of TABLE_COLUMNS) {
    out.push(`| ${col.columnHeading.split("(")[0].trim()} | ${col.columnHeading} | ${col.what} |`);
  }
  out.push("");
  out.push(
    "The middle column is a **drop-down with exactly two choices**, read from the form itself: "
    + `${(census.chooserOptions[0] ?? []).map((o) => `**${o}**`).join(" and ")}. Pick the one the court actually `
    + "entered on that charge.", ""
  );
  out.push(
    `If you run out of lines on page 1, carry on at row 15 on the Continuation Sheet **and tick the box that says so** `
    + "on page 1.", ""
  );

  out.push("## The nine questions on page 2", "");
  out.push(`The court's own instruction: _"${printed(census, "answer-specifically")}"_`, "");
  out.push(
    "**All nine are blank on your copy.** They are your own account of how the record affects your life, and the "
    + "route record names them a later-completion field in terms: "
    + `_"${quote(route.narrativeBasis, "the nine narrative answers")}"_ The judge reads what you write here.`, ""
  );
  out.push("| # | The question the form prints |", "| --- | --- |");
  for (const q of questions) out.push(`| ${q.questionNumber} | ${q.disclosureLabel.replace(/^Answer \d+ of 9 — /, "")} |`);
  out.push("");
  out.push(
    "Note the court's instruction above: if one of them is not relevant to you, **explain why** rather than leave it "
    + "empty.", ""
  );

  out.push("## What to bring with it", "");
  out.push(
    `The route record names one required attachment: _"${quote(route.requiredParticipantAttachments[0], "required attachments")}"_ `
    + "The form's own instruction on page 2 adds that you should attach any documents that support your petition.", ""
  );

  out.push("## Your CORI and docket check before filing", "");
  out.push(
    "The packet does not contain your criminal-record information. Before you sign or file, obtain your own CORI "
    + "from DCJIS and use it to check the docket number and the other case details you supplied. LegalEase does not "
    + "collect, inspect or authenticate your CORI.", ""
  );
  for (const action of guidance.externalActions) out.push(`- ${action.description}`);
  out.push(
    "If your court papers and your CORI disagree, stop and correct the packet from the records you hold before you "
    + "sign it. LegalEase does not decide which record is correct.", ""
  );

  out.push("## What happens after you file", "");
  out.push(`Printed on page 2, inside the court's own block: _"${printed(census, "hearing-and-posting")}"_`, "");
  out.push(
    "So: **there will be a hearing**, no sooner than seven days after you file. The Clerk-Magistrate notifies the "
    + "Probation Service and the prosecutor, the prosecutor should notify any victim, and **a copy of your petition "
    + "is posted on a public bulletin board until the hearing**. The route record's own words: "
    + `_"${quote(route.uncontestedHearing[0], "hearing treatment")}"_`, ""
  );
  out.push(`If it is opposed: _"${quote(route.contestedHandoff[0], "contested handoff")}"_`, "");

  out.push("## Stop and get help before filing or continuing", "");
  out.push(
    "This packet cannot decide whether waiting, another sealing process, or advice about a hearing is better for you. "
    + "Stop before filing or continuing and ask a Massachusetts lawyer or legal-aid advocate for help if any recorded "
    + "condition below applies. These are stop points for help, not an eligibility decision and not a direction to wait:", ""
  );
  out.push(`- **The prosecutor opposes.** Stop and get help before responding or proceeding.`);
  out.push(`- **A hearing is set and the participant must attend.** Stop and get help before the hearing.`);
  out.push(`- **The case is nearly old enough for the ministerial route, where waiting may be better advice.** Stop and ask for advice about that route before filing.`);
  out.push(`- **The disposition may be one of the three automatic-sealing dispositions rather than a dismissal.** Stop and ask for advice before using this petition.`);
  out.push("");

  out.push("## Fees and service — what this packet does NOT tell you", "");
  out.push(
    "- **Filing fee:** the route record records none for this route and the form prints none, so **no amount is "
    + "stated here**. Ask the clerk's office you are filing in. An unsourced figure in a filing instruction is worse "
    + "than none."
  );
  out.push(
    "- **Anyone you must serve yourself, and by when:** the route record records no service recipient, method or "
    + "timing for this route. What the form itself prints is that the **Clerk-Magistrate** gives the notices, not "
    + "you. Nothing further is stated here."
  );
  out.push("");

  out.push("## What you must do, in order", "");
  out.push("1. **Check this is the right petition** — a nolle prosequi or a dismissal, one form per case.");
  out.push("2. **Work out your division from the venue rule above**, and write it with the docket number at the top of page 1.");
  out.push("3. **Tick the one court department that heard the case.**");
  out.push("4. **Fill in every line of the charge table** for the records you want sealed, using the Continuation Sheet if you need it.");
  out.push("5. **Answer all nine questions on page 2** in your own words.");
  out.push("6. **Attach your disposition record** and any documents that support the petition.");
  out.push(`7. **Sign and date it.** The route record: _"${quote(route.signatureRequirements[0], "signature requirements")}"_ `
    + "Directly above the signature line the form says you may be penalized for perjury if what you have written is "
    + "not truthful, so read it through before you sign.");
  out.push("8. **File it**, and **write nothing in the COURT ORDER block at the foot of page 2** — the form captions it for court use only.");
  out.push("9. **Go to the hearing.**");
  out.push("");

  out.push("## What this packet already filled in", "");
  out.push("| Page | The blank on the form | What it says |", "| --- | --- | --- |");
  for (const w of writes) out.push(`| ${w.page} | ${w.effectiveLabel} | from the details you gave the platform |`);
  out.push("");
  out.push("**Check every one of them against your own papers before you sign.** You are signing the petition, not the platform.", "");

  out.push("## The blanks you must complete", "");
  out.push("| Page | The blank on the form | What to write |", "| --- | --- | --- |");
  for (const i of otherRbf) out.push(`| ${i.page} | ${i.disclosureLabel} | ${i.participantMustSupply} |`);
  for (const i of departments) out.push(`| ${i.page} | ${i.disclosureLabel} | ${i.participantMustSupply} |`);
  for (const i of questions) out.push(`| ${i.page} | ${i.disclosureLabel} | ${i.participantMustSupply} |`);
  out.push("");

  /*
   * EVERY CELL OF THE TABLE, NAMED.
   *
   * The section above explains the three columns once, which is how the form
   * presents them and how a person reads them. It is not a disclosure of the
   * 111 blanks: the completeness contract requires a required-before-filing
   * item to be NAMED to the participant, and "the three columns, repeated"
   * names none of them. A pointer to a JSON report is not a disclosure either —
   * the participant does not read the build's reports.
   *
   * So the full list is printed here, one line per numbered row, carrying all
   * three of that row's blanks by name. Thirty-seven lines rather than a
   * hundred and eleven, because the form's own unit is the row.
   */
  out.push(`## Every blank in the charge table, in full — ${tableCells.length} of them`, "");
  out.push(
    `The form gives you ${tableRows.length} numbered lines and each one takes three entries. Fill in a line for every `
    + "charge you want sealed and leave the rest of the lines empty. What goes in each of the three is set out in the "
    + "table above.", ""
  );
  out.push("| Line | The three blanks on that line |", "| --- | --- |");
  for (const n of tableRows) {
    const cells = tableCells.filter((c) => c.tableRow === n)
      .sort((a, b) => TABLE_COLUMNS.findIndex((x) => x.id === a.tableColumn) - TABLE_COLUMNS.findIndex((x) => x.id === b.tableColumn));
    out.push(`| ${n} (page ${cells[0]?.page ?? "?"}) | ${cells.map((c) => c.disclosureLabel).join(" · ")} |`);
  }
  out.push("");

  if (boundaryOnlyRbf.length > 0) {
    out.push("## Blanks the form itself is too small for", "");
    out.push(
      "On some records a detail the platform holds is longer than the box the form prints for it. The packet leaves "
      + "that box **blank rather than shortening what you told us** — a shortened address on a sworn petition reads "
      + "as a complete one. If any of these is blank on your copy, write it in by hand:", ""
    );
    out.push("| Page | The blank on the form | Why it is blank |", "| --- | --- | --- |");
    for (const i of boundaryOnlyRbf) out.push(`| ${i.page} | ${i.disclosureLabel} | ${i.measuredWhy ?? i.why} |`);
    out.push("");
  }

  out.push("## Boxes that are yours to tick, and nobody else's", "");
  out.push("| The box | Why the packet left it to you |", "| --- | --- |");
  for (const c of elections) out.push(`| ${c.effectiveLabel} | ${c.why} |`);
  out.push("");

  out.push("## What this packet is not", "");
  out.push(
    "This is a prepared copy of an official Massachusetts Trial Court form. It is not legal advice, it is not filed "
    + "for you, and it does not decide whether your records will be sealed. A judge decides that, at the hearing."
  );
  out.push("");
  out.push(`_Route: ${route.routeKey} · ${STATUTORY_AUTHORITY} · form ${DOCUMENT_ID}, source SHA-256 ${source.sha256} · `
    + `${census.rows.length} widgets read from the pinned binary_`);
  return `${out.join("\n")}\n`;
}

/* ---- the entry point --------------------------------------------------------------- */
export async function runFamily(argv = process.argv.slice(2)) {
  const checkOnly = argv.includes("--check");
  const skipRaster = argv.includes("--no-raster");

  const binding = queueBinding();
  const sweep = sweepMeasurement();
  const source = resolveSource(binding);
  if (!source.bound) {
    return {
      familyId: FAMILY_ID, status: "STOPPED", stopReason: "BLOCKED_SOURCE",
      failedSourceIdentities: [{
        sourceId: binding.sourceId, declaredPath: binding.declaredPath, declaredSha256: binding.sha256,
        sweepMeasuredPath: sweep.actualPath, mountsSearched: source.searched
      }],
      why: "the source did not bind by exact SHA-256 in any mounted custody root, so nothing may be rendered from it",
      counters: null, overlayDirectoryTouched: false
    };
  }

  const route = routeRecord();
  const census = await censusOf({ ...source, ...binding });

  assert.equal(census.unmapped.length, 0,
    `${census.unmapped.length} widget(s) carry no dictionary entry: ${JSON.stringify(census.unmapped.map((u) => u.field))}`);
  assert.equal(census.stale.length, 0,
    `the dictionary names ${census.stale.length} field(s) this form does not have: ${JSON.stringify(census.stale)}`);
  assert.equal(census.captionDrift.length, 0,
    `a recorded caption is no longer printed where the dictionary says: ${JSON.stringify(census.captionDrift, null, 2)}`);
  assert.equal(census.anchorDrift.length, 0,
    `a form-level sentence this family reasons from is no longer printed: ${JSON.stringify(census.anchorDrift, null, 2)}`);
  assert.equal(census.subCaptionDrift.length, 0,
    `the Address box's printed sub-captions moved, and they are the evidence for composing it: ${JSON.stringify(census.subCaptionDrift, null, 2)}`);
  assert.equal(census.columnDrift.length, 0,
    `a charge-table column heading is no longer printed above the column this build assigns it: ${JSON.stringify(census.columnDrift, null, 2)}`);
  assert.equal(census.rowAssignmentDrift.length, 0,
    `a charge-table cell could not be matched to exactly one printed row number: ${JSON.stringify(census.rowAssignmentDrift, null, 2)}`);
  assert.equal(census.rows.length, sweep.acroFieldCount,
    `the sweep measured ${sweep.acroFieldCount} AcroForm fields and this build reads ${census.rows.length}`);
  assert.equal(census.pageCount, sweep.pageCount,
    `the sweep measured ${sweep.pageCount} pages and this build reads ${census.pageCount}`);

  /* Every table row the form prints is covered by exactly three cells, one per
   * column: a row with two would be a cell this build silently dropped. */
  const cellsByRow = new Map();
  for (const r of census.rows.filter((x) => x.tableRow)) {
    if (!cellsByRow.has(r.tableRow)) cellsByRow.set(r.tableRow, new Set());
    cellsByRow.get(r.tableRow).add(r.tableColumn);
  }
  for (const [rowNumber, columns] of cellsByRow) {
    assert.equal(columns.size, 3,
      `printed table row ${rowNumber} resolved ${columns.size} of the three columns: ${JSON.stringify([...columns])}`);
  }
  assert.equal(cellsByRow.size, 37,
    `this form prints thirty-seven numbered charge rows and this build resolved ${cellsByRow.size}`);

  /* The chooser's own option list, the second independent reading of which
   * column is the nolle-or-dismissed question. */
  for (const options of census.chooserOptions) {
    for (const expected of TABLE_COLUMNS.find((c) => c.id === "nolle_or_dismissed").expectedOptions) {
      assert.ok(options.includes(expected),
        `a charge-table chooser no longer offers "${expected}" (offers ${JSON.stringify(options)}); the column `
        + "identification rests on that list as well as on the printed heading");
    }
  }

  const writeRows = census.rows.filter((r) => r.policy === "write" || r.policy === "composed");
  assert.equal(writeRows.length, 4, `this build writes exactly four boxes and the dictionary declares ${writeRows.length}`);

  if (checkOnly) {
    return {
      familyId: FAMILY_ID, status: "CHECK_ONLY",
      sourceSha256: source.sha256, custodyRoot: source.custodyRoot,
      fields: census.rows.length, pages: census.pageCount,
      xfaInInputDict: census.xfaInInputDict, sweepSaysXfaPresent: sweep.xfaPresentInTheSweep,
      priorCustodyClassInTheSweep: sweep.priorCustodyClass,
      writes: census.rows.filter((r) => r.policy === "write").length,
      composedWrites: census.rows.filter((r) => r.policy === "composed").length,
      tableCells: census.rows.filter((r) => r.tableRow).length,
      tableRowsResolved: cellsByRow.size,
      acroFormIndexDisagreesWithPrintedRow: census.indexVersusPrintedRow.filter((x) => !x.agrees).length,
      supply: census.rows.filter((r) => r.policy === "supply").length,
      caseFacts: census.rows.filter((r) => r.policy === "case_fact").length,
      elections: census.rows.filter((r) => r.policy === "election").length,
      protected: census.rows.filter((r) => r.policy === "protect").length
    };
  }

  fs.mkdirSync(path.join(ROOT, OUT, "fixtures"), { recursive: true });
  fs.mkdirSync(path.join(ROOT, OUT, "reports"), { recursive: true });

  /* Render both fixtures in memory first.  Guidance is checked from the
   * controlling records before either final PDF or report is replaced. */
  const reports = {};
  const pendingRenders = [];
  const guidance = guidanceRecords();
  for (const fixtureName of ["canonical", "boundary"]) {
    const { bytes, report } = await renderDocument({ ...source, ...binding }, census, fixtureName);
    reports[fixtureName] = report;
    pendingRenders.push({ fixtureName, bytes, report });
  }
  const preflightMaps = [mapFor(census, reports.canonical, reports.boundary, route)];
  const preflightRbf = requiredBeforeFilingItems(preflightMaps, "canonicalRefusals");
  const preflightBoundaryRbf = requiredBeforeFilingItems(preflightMaps, "boundaryRefusals");
  const preflightCanonicalFields = new Set(preflightRbf.map((r) => r.field));
  const preflightBoundaryOnlyRbf = preflightBoundaryRbf.filter((r) => !preflightCanonicalFields.has(r.field));
  const instructionsText = participantInstructions(
    preflightMaps, preflightRbf, preflightBoundaryOnlyRbf, route, source, census, guidance
  );
  assertGuidanceComplete(instructionsText, guidance);

  const artifacts = [];
  const writeProofs = [];
  const rasterPages = [];
  let sanitationSample = null;

  for (const { fixtureName, bytes, report } of pendingRenders) {
    sanitationSample = report.sanitation ?? sanitationSample;

    const file = `${OUT}/fixtures/${fixtureName}.pdf`;
    fs.writeFileSync(path.join(ROOT, file), bytes);

    const proof = await byteProof({ ...source, ...binding }, census, file, fixtureName, report);
    writeProofs.push({
      fixture: fixtureName, formNumber: DOCUMENT_ID, sourceSha256: source.sha256,
      proofMethod: proof.proofMethod,
      valuesReportedByFinalizer: report.written.length,
      flattenedWidgetAppearancesReadFromOutputBytes: proof.appearances,
      addedGlyphsReadFromOutputBytes: proof.glyphs,
      nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: proof.outsideGlyphs,
      glyphsOutsideMeasuredWriteBoxes: proof.outsideWriteBoxes,
      synthesizedAppearancesFound: proof.synthesizedAppearancesFound,
      refusedFieldsWithInk: proof.refusedFieldsWithInk,
      documentAuthoredAppearances: proof.documentAuthoredAppearances,
      selectionsRead: proof.selectionsRead,
      geometryRefusals: [...geometryRefusalsOf(report).values()],
      unfittable: report.unfittable,
      composedWrites: report.composedWrites ?? [],
      actualWrites: proof.actualWrites
    });

    const packetDoc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
    artifacts.push({
      fixture: fixtureName, file,
      sha256: crypto.createHash("sha256").update(bytes).digest("hex"),
      byteLength: bytes.length, pageCount: packetDoc.getPageCount(),
      pageManifest: packetDoc.getPageIndices().map((i) => ({
        packetPage: i + 1, component: "primary_filing", documentId: DOCUMENT_ID,
        sourcePage: i + 1, sourceSha256: source.sha256
      })),
      documents: ["primary_filing", DOCUMENT_ID]
    });

    if (!skipRaster) {
      const rasterDir = `${OUT}/raster/${fixtureName}`;
      fs.mkdirSync(path.join(ROOT, rasterDir), { recursive: true });
      for (let i = 0; i < packetDoc.getPageCount(); i += 1) {
        const stage = path.join(ROOT, rasterDir, `page-${String(i + 1).padStart(2, "0")}`);
        const render = await rasterizePageCalibrated({ file: path.join(ROOT, file), pageIndex: i, keep: stage });
        for (const scrap of ["page.pdf", "page-calibration.pdf", "page-calibration.png"]) {
          const f = path.join(stage, scrap);
          if (fs.existsSync(f)) fs.unlinkSync(f);
        }
        const png = path.join(stage, "page.png");
        rasterPages.push({
          fixture: fixtureName, page: i + 1,
          file: `${rasterDir}/page-${String(i + 1).padStart(2, "0")}/page.png`,
          pageWidthPt: render.pageWidth, pageHeightPt: render.pageHeight,
          pixelsPerPoint: Number(render.pxPerPt.toFixed(4)),
          calibrationResidualPx: render.calibrationResidualPx,
          paperBounds: render.paper,
          engine: "chromium_calibrated_scripts_raster_pdf_page_raster",
          sha256: crypto.createHash("sha256").update(fs.readFileSync(png)).digest("hex")
        });
      }
    }
  }

  const maps = [mapFor(census, reports.canonical, reports.boundary, route)];
  const rbf = requiredBeforeFilingItems(maps, "canonicalRefusals");
  const boundaryRbf = requiredBeforeFilingItems(maps, "boundaryRefusals");
  const canonicalFields = new Set(rbf.map((r) => r.field));
  const boundaryOnlyRbf = boundaryRbf.filter((r) => !canonicalFields.has(r.field));

  fs.writeFileSync(path.join(ROOT, OUT, "participant-instructions.md"), instructionsText);

  writeJson(`${OUT}/source-receipt.json`, {
    schemaVersion: "rcap-family-source-receipt/v1", familyId: FAMILY_ID, worklistGroupId: FAMILY_ID,
    jurisdiction: "MA", implementationStrategy: "official_pdf_fill",
    custodyClass: "SOURCE_ALREADY_HELD", acquisitionCommissioned: false,
    networkAcquisitionsMade: 0,
    bindingMethod:
      "the MASTER_QUEUE row's own declared path and SHA-256, read at build time, matched byte-for-byte against the "
      + "first mounted custody root that holds it. Two further independent statements of the same identity must "
      + "agree before anything renders: a digest asserted in the builder itself, and the per-source measurement in "
      + "SOURCE_IDENTITY_RESOLUTION_SWEEP.json.",
    routeKey: route.routeKey,
    statutoryAuthority: `${STATUTORY_AUTHORITY} — court-requested sealing of a charge that ended in a nolle prosequi or a dismissal`,
    remedy: "sealing (who may see the record is limited), not expungement",
    distinctFrom: {
      familyId: "ma-expunge-k-set",
      why:
        "that family is G.L. c. 276, § 100K EXPUNGEMENT, on a different Trial Court petition, which asks a judge to "
        + "destroy the record on one of eight enumerated grounds. This family is court-requested SEALING on a "
        + "disposition of nolle prosequi or dismissal. The two share a state and a kind of filing office and nothing "
        + "else; no recital, authority or filing rule is carried between them."
    },
    allSourcesExact: true,
    custodyRootsSearched: source.searched.map((s) => ({ root: s.root, exists: s.exists, sha256: s.sha256 ?? null })),
    custodyRootUsed: source.custodyRoot,
    documents: [{
      sourceIds: [binding.sourceId], documentId: DOCUMENT_ID, formNumber: DOCUMENT_ID,
      officialFormFamily: binding.officialFormFamily,
      pathInArchive: binding.declaredPath, sha256: source.sha256, byteLength: source.byteLength,
      instrumentKind: "primary_filing", pageCount: census.pageCount, acroFieldCount: census.rows.length,
      editionFooterPrintedOnTheForm: census.anchorText["form-footer"] ?? null
    }],
    sweepMeasurement: {
      sourceId: sweep.sourceId, priorCustodyClass: sweep.priorCustodyClass,
      actualPath: sweep.actualPath, copiesInCustody: sweep.copiesInCustody, custodies: sweep.custodies,
      pageCount: sweep.pageCount, acroFieldCount: sweep.acroFieldCount, byteLength: sweep.byteLength,
      agreesWithThisBuild: sweep.acroFieldCount === census.rows.length && sweep.pageCount === census.pageCount
    },
    custodyRecordDisagreement: {
      finding:
        "SOURCE_READY_BUILDABILITY.json and the MASTER_QUEUE row both classify this family custodyClass "
        + `${JSON.stringify(binding.custodyClassInQueue)} — SOURCE_GENUINELY_MISSING — with documentSourcesResolved 0, `
        + "while the declared path holds the declared digest exactly.",
      basis:
        "The same buildability row carries kind 'held_pdf', firstBytes '%PDF-' and resolvedBy 'declared_path' for "
        + "this very source, and the MASTER_QUEUE row reads sourceStatus SOURCE_BOUND_BY_HELD_BYTES and sourceBound "
        + "true beside the scalar that says it is missing. The row contradicts itself. This build looked: the bytes "
        + "bind, in a mounted custody root, at the digest three records name.",
      consequence:
        "recorded for whoever owns the custody scalar. GENUINELY_MISSING is the strongest thing that record can say "
        + "about a source and it was said about a file that was in custody the whole time."
    },
    sanitationObserved: sanitationSample ? {
      xfaPresentInInput: sanitationSample.xfaPresentInInput ?? null,
      xfaRemoved: sanitationSample.xfaRemoved ?? null,
      synthesizedAppearancesSuppressed: sanitationSample.synthesizedAppearancesSuppressed ?? null,
      synthesizedWidgetBordersSuppressed: sanitationSample.synthesizedWidgetBordersSuppressed ?? null
    } : null,
    sourceBinaryCommitted: false, commercialRoutesOpened: 0,
    whatThisReceiptDoesNotEstablish: [
      "that TC0057 (2/24) is the current published edition — no freshness review has been done here",
      "that any output is approved for participant delivery",
      "that any record is eligible for sealing under G.L. c. 276, § 100C"
    ]
  });

  writeJson(`${OUT}/field-census.census-v1.json`, {
    schemaVersion: "rcap-official-form-field-census/v1-census-v1", familyId: FAMILY_ID,
    captionBasis:
      "Every caption was re-read from the pinned binary at its recorded coordinate before anything rendered. A TABLE "
      + "CELL's caption is the row number the form prints beside it, matched by geometry: the AcroForm index order "
      + "does not follow the printed row order on this form.",
    tableRowBasis: {
      method:
        "each table cell's row number is the printed number whose baseline sits 4 to 11 points above the widget's own "
        + "bottom edge, on the widget's own page; exactly one must match or the build refuses",
      printedRowNumbersRead: census.printedRowNumbers.length,
      rowsResolved: cellsByRow.size,
      acroFormIndexVersusPrintedRow: census.indexVersusPrintedRow,
      cellsWhereTheIndexDisagreesWithThePrintedRow: census.indexVersusPrintedRow.filter((x) => !x.agrees)
    },
    columnBasis: {
      method:
        "each column heading was matched by ITEM x-position rather than by extracted line, because the header's five "
        + "lines interleave and read naively they put the date column in the middle",
      columns: TABLE_COLUMNS.map((c) => ({
        id: c.id, widgetX: c.columnX, headingX: c.headerX, headingY: c.headerY, heading: c.columnHeading
      })),
      chooserOptionsReadFromTheBinary: census.chooserOptions[0] ?? null,
      secondIndependentReading:
        "the middle column's widget is the chooser and its own option list is Nolle Prosequi / Dismissed, which is "
        + "the question the middle heading asks; the right column's widget is the date field under the date heading"
    },
    formLevelAnchors: FORM_ANCHORS.map((a) => ({ ...a, textReadFromTheBinary: census.anchorText[a.id] ?? null })),
    documents: [{
      documentId: DOCUMENT_ID, formNumber: DOCUMENT_ID, sourceSha256: source.sha256,
      pageCount: census.pageCount, fieldCount: census.rows.length,
      xfaPresentInTheAcroFormDictionary: census.xfaInInputDict,
      fields: census.rows.map((r) => ({
        field: r.key, page: r.page, rect: r.rect, rectBasis: r.rectBasis, pdfType: r.type,
        isSelectionControl: r.isSelectionControl, multiline: r.multiline, maxLength: r.maxLength,
        appearanceStates: r.widgets[0]?.appearanceStates ?? [],
        chooserOptions: r.options ?? null,
        section: r.section, effectiveLabel: r.effectiveLabel,
        printedCaption: r.caption, captionReadAt: r.captionAt,
        printedSubCaptions: r.subCaptions,
        tableRow: r.tableRow, tableColumn: r.tableColumn, questionNumber: r.questionNumber,
        policy: r.policy, factId: r.fact, composedFrom: r.factIds,
        sourceShippedValue: r.sourceValue,
        sharedRegistryWouldBindFromName: r.sharedRegistryWouldBindFromName,
        sharedRegistryWouldBindFromThisBuildsLabel: r.sharedRegistryWouldBindFromThisBuildsLabel
      }))
    }]
  });

  writeJson(`${OUT}/production-field-map.json`, {
    schemaVersion: "rcap-official-form-field-map/v1-census-v1", familyId: FAMILY_ID,
    routeKeys: [route.routeKey], renderStrategy: "acroform_fill",
    jurisdiction: "MA",
    statutoryAuthority: `${STATUTORY_AUTHORITY} — court-requested sealing on a nolle prosequi or dismissal`,
    remedy: "sealing (who may see the record is limited), not expungement",
    officialForm: DOCUMENT_ID, assignedOfficialForm: binding.officialFormFamily,
    officialFormMatchesAssignment: true,
    captionBasis: "printed captions re-read from the pinned binary at recorded coordinates; see field-census.census-v1.json",
    dispositionVocabulary: [SIGNATURE, COURT_OWNED, PARTICIPANT_ELECTION],
    routeDeterminedSelections: [],
    routeSelectionNote:
      "This form carries no route fork: it serves one statutory route and prints it in its own caption. The four "
      + "court-department boxes are not a fork either — they say where the case was HEARD, which one route reaches "
      + "all four of — so each is declared REQUIRED_BEFORE_FILING with determinedByTheCaseNotTheRoute and a stated "
      + "reason, which is the completeness contract's own auditable exception.",
    venueRule: {
      quotedFromTheRouteRecord: route.venueRule,
      whyItIsCalledOut:
        "the record calls this residence-based rule unique in the state. On this route a Boston Municipal Court case "
        + "is filed in the BMC division where the participant LIVES, not the division that heard it, and the "
        + "participant instructions state that before the COURT DIVISION/COUNTY blank is reached."
    },
    requiredBeforeFilingCount: rbf.length, requiredBeforeFiling: rbf,
    boundaryOnlyRequiredBeforeFiling: boundaryOnlyRbf,
    maps, generationAllowed: false, runtimeSelectable: false, commercialRoutesOpened: 0
  });

  writeJson(`${OUT}/reports/rendered-artifacts.json`, {
    schemaVersion: "rcap-rendered-artifacts/v1", familyId: FAMILY_ID, renderedFresh: true,
    componentSet: ["primary_filing"],
    componentSetBasis:
      `the route-obligation census records this route's deliverable as ${JSON.stringify(route.primaryFiling)}, and the `
      + "packet-set manifest declares one component, ma-seal-court-primary-filing-1. The Continuation Sheet is page 3 "
      + "of that same form, not a separate component.",
    artifacts, packets: artifacts.map((a) => ({ fixture: a.fixture, documents: a.documents })),
    everyPageRastered: rasterPages.length === artifacts.reduce((n, a) => n + a.pageCount, 0),
    byteDerivedHashes: true,
    rasterEngine: skipRaster ? null : RASTER_ENGINE, rasterSkipped: skipRaster, rasterPages,
    fixturesAreByteIdentical: artifacts.length === 2 && artifacts[0].sha256 === artifacts[1].sha256,
    independentVerificationPending: true
  });

  writeJson(`${OUT}/reports/actual-writes.json`, {
    schemaVersion: "rcap-actual-writes-byte-proof/v1", familyId: FAMILY_ID, derivedFromArtifactBytes: true,
    note:
      "Read back from the finalized PDF bytes at all 135 measured widget rectangles, not from the finalizer's own "
      + "report, and then over the whole artifact for ink outside those rectangles. Stroke, fill, shading and XObject "
      + "operators are counted apart from path-construction and clipping operators and from show-text, because the "
      + "first mark the page whatever their operand and the other two do not: every text field here ships no /AP, "
      + "and each generated appearance is a construction-and-clip preamble around an empty '<> Tj'.",
    documents: writeProofs,
    artifacts: writeProofs.map((p) => ({
      fixture: p.fixture, formNumber: p.formNumber,
      valuesReportedByFinalizer: p.valuesReportedByFinalizer,
      addedGlyphsReadFromOutputBytes: p.addedGlyphsReadFromOutputBytes,
      flattenedWidgetAppearancesReadFromOutputBytes: p.flattenedWidgetAppearancesReadFromOutputBytes,
      nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: p.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes,
      refusedFieldsWithInk: p.refusedFieldsWithInk,
      synthesizedAppearancesFound: p.synthesizedAppearancesFound,
      selections: p.selectionsRead.filter((s) => s.marked).map((s) => ({ control: s.control, page: s.page })),
      written: p.actualWrites.map((w) => ({ field: w.field, factId: w.factId, composedFrom: w.composedFrom }))
    })),
    blockingFindings: writeProofs.flatMap((p) => p.refusedFieldsWithInk.map((r) => ({
      fixture: p.fixture, field: r.fieldId, finding: "a field the map refused carries ink in the output"
    })))
  });

  writeJson(`${OUT}/reports/blanks-left-for-the-participant.json`, {
    schemaVersion: "rcap-blanks-left-for-the-participant/v1", familyId: FAMILY_ID,
    requiredBeforeFiling: rbf,
    requiredBeforeFilingByGroup: {
      captionAndIdentity: rbf.filter((r) => !r.tableRow && !r.questionNumber && !r.courtDepartment).length,
      courtDepartmentBoxes: rbf.filter((r) => r.courtDepartment).length,
      chargeTableCells: rbf.filter((r) => r.tableRow).length,
      nineNarrativeAnswers: rbf.filter((r) => r.questionNumber).length
    },
    boundaryOnlyRequiredBeforeFiling: boundaryOnlyRbf,
    requiredParticipantActions: guidance.requiredBeforeFiling,
    externalRequiredBeforeFilingActions: guidance.externalActions.map((a) => ({
      kind: a.kind, description: a.description, obtainedFrom: a.obtainedFrom ?? null,
      requiredBeforeFiling: a.requiredBeforeFiling
    })),
    selfHelpStopConditions: guidance.selfHelpStopConditions,
    guidanceDisclosureChecks: {
      requiredExternalActionsInParticipantInstructions: guidance.externalActions.every((a) => instructionsText.includes(a.description)),
      everySelfHelpStopConditionInParticipantInstructions: guidance.selfHelpStopConditions.every((c) => instructionsText.includes(c)),
      stopAndGetHelpSectionPresent: instructionsText.includes("Stop and get help before filing or continuing")
    },
    notApplicableOnThisRoute: [],
    notApplicableNote:
      "This form has no branch this route does not use, so nothing is declared not-applicable-on-this-route. The four "
      + "department boxes are determined by the CASE and are declared required-before-filing with that reason stated.",
    participantElections: maps.flatMap((m) => m.selectionControls
      .filter((c) => c.disposition === "participant_election")
      .map((c) => ({ document: m.formNumber, field: c.field, page: c.page, label: c.effectiveLabel, why: c.why }))),
    protectedBlanks: maps.flatMap((m) => m.canonicalRefusals
      .filter((r) => r.requiredBeforeFiling !== true && r.category)
      .map((r) => ({ document: m.formNumber, field: r.field, page: r.page, label: r.effectiveLabel, refusalClass: r.category, why: r.why }))),
    everyRequiredBeforeFilingItemIsDisclosed: true,
    disclosedIn: `${OUT}/participant-instructions.md`,
    disclosureNote:
      "The charge table's cells are disclosed to the participant as three columns repeated over the form's own "
      + "numbered rows, which is how the form presents them, rather than as 111 separate table lines. Every cell is "
      + "listed individually in requiredBeforeFiling above."
  });

  writeJson(`${OUT}/reports/independent-visual-review.json`, {
    schemaVersion: "rcap-independent-visual-review/v1", familyId: FAMILY_ID,
    required: true, granted: false, reviewedBy: null,
    whatToLookAt: [
      "Page 1, YOUR INFORMATION: Your Name, Date of Birth, Address and Phone Number carry values; the Address block sits on its own lines inside the box and does not run over the rule beneath it.",
      "Page 1: DOCKET NUMBER, COURT DIVISION/COUNTY and the Probation Central File number are blank.",
      "NOT ONE of the seven check boxes carries a mark, and none has acquired a square, border or outline the blank form does not print. This form ships no /Off appearance, so a synthesized border is the defect to look for.",
      "Page 1: all 42 cells of the charge table (rows 1 to 14) are empty, and no drop-down shows a selected option or a prompt.",
      "Page 2: all nine narrative boxes are empty, and MY SIGNATURE and its DATE are blank.",
      "Page 2: nothing at all appears inside the block captioned COURT ORDER (for Court use only), including the hearing date and time and the JUSTICE'S SIGNATURE line — none of which carries a widget on this form.",
      "Page 3: all 69 cells of the Continuation Sheet (rows 15 to 37) are empty.",
      "The row numbers 1 to 14 on page 1 and 15 to 37 on page 3 are the form's own printed numbers and are unchanged."
    ],
    artifacts: artifacts.map((a) => ({ fixture: a.fixture, file: a.file, sha256: a.sha256, pageCount: a.pageCount })),
    rasterPages: rasterPages.map((p) => ({ fixture: p.fixture, page: p.page, file: p.file, sha256: p.sha256 }))
  });

  writeJson(`${OUT}/build-status.json`, {
    schemaVersion: "rcap-family-build-status/v1", familyId: FAMILY_ID,
    buildStatus: "state_built", reviewStatus: "qa_review_pending", builtBy: BUILD_SCRIPT,
    rasterEngine: skipRaster ? "not rendered in this run" : "chromium_calibrated", popplerUsed: false,
    renderedArtifacts: artifacts.length, rasterPages: rasterPages.length,
    rasterState: skipRaster ? "BUILT_RASTER_PENDING" : "RASTER_LOCAL_PENDING_CENTRAL",
    independentVerificationStatus: "PENDING", selfVerified: false,
    generationAllowed: false, runtimeSelectable: false,
    commercialRoutesOpened: 0, productionTouched: false,
    grantsNothing: "A rendered packet is review evidence. It authorizes no fulfillment and opens no commercial route."
  });

  const counted = countCompleteness(maps, writeProofs, artifacts, instructionsText);
  writeJson(`${OUT}/reports/completeness-counters.json`, {
    schemaVersion: "rcap-builder-completeness-counters/v1", familyId: FAMILY_ID,
    whatThisIs:
      "The BUILDER's own count of the nine completeness counters, computed with the repository's own contract "
      + "functions over this family's field map, byte proof, rendered artifacts and participant-instructions.md.",
    whatThisIsNot:
      "A verdict. This lane does not verify its own packets, and PASS_COMPLETE additionally requires a hash-bound "
      + "RASTER_PASS from the central raster workflow.",
    counters: counted.counters,
    allNineZero: PASS_COUNTERS.every((c) => counted.counters[c] === 0),
    findings: counted.findings,
    blankDispositions: counted.ledger.reduce((acc, b) => { acc[b.disposition] = (acc[b.disposition] ?? 0) + 1; return acc; }, {})
  });

  writeJson(`${OUT}/build-findings.json`, {
    schemaVersion: "rcap-family-build-findings/v1", familyId: FAMILY_ID, blocking: [],
    findings: [
      {
        severity: "blocking_if_unfixed_elsewhere",
        finding:
          "THE ACROFORM INDEX ORDER DOES NOT FOLLOW THE PRINTED ROW ORDER OF THE CHARGE TABLE. Measured over all "
          + `111 cells: ${census.indexVersusPrintedRow.filter((x) => !x.agrees).length} of them carry an index that `
          + "disagrees with the row number the form prints beside them. Printed row 5 is TextField3[6] / "
          + "DropDownList1[9] / DateField1[7]; printed row 13 is TextField3[12] / DropDownList1[1] / DateField1[12].",
        consequence:
          "A builder that read a row number out of a field index would label a cell for one charge and place it on "
          + "another charge's line, on a petition signed under a perjury warning — and every field counter would "
          + "read clean, because the cell count and the label count would both be right. This build resolves every "
          + "cell's row by GEOMETRY against the printed number and refuses if any cell matches none or more than "
          + "one. Returned as a factory-level finding: any other family whose form carries a numbered table needs "
          + "the same check, and an index-derived row number is not evidence."
      },
      {
        finding:
          "THE CHARGE TABLE'S COLUMN ORDER CANNOT BE READ OFF THE EXTRACTED LINES. The five header lines interleave "
          + "— 'Charge Date of Nolle Prosequi or' is one extracted line — and read naively they put the date in the "
          + "middle column. By item x-position the middle heading at x 268 is 'State Whether the Court Entered a "
          + "Nolle Prosequi or Dismissed the Charge' and the right heading at x 455 is 'Date of Nolle Prosequi or "
          + "Dismissal'.",
        consequence:
          "Two independent readings agree and both are asserted at build time: the heading item positions, and the "
          + `middle widget's own option list, read from the binary as ${JSON.stringify(census.chooserOptions[0] ?? null)}. `
          + "Had the naive reading been used, the participant would have been told to write a date in the box that "
          + "asks which disposition the court entered."
      },
      {
        severity: "blocking_if_unfixed_elsewhere",
        finding:
          "SOURCE_READY_BUILDABILITY.json and the MASTER_QUEUE row classify this family custodyClass "
          + `${JSON.stringify(binding.custodyClassInQueue)} with documentSourcesResolved 0, in the same rows that read `
          + "sourceStatus SOURCE_BOUND_BY_HELD_BYTES, sourceBound true, kind 'held_pdf', firstBytes '%PDF-' and "
          + "resolvedBy 'declared_path' for this very source.",
        consequence:
          "SOURCE_GENUINELY_MISSING is the strongest thing that record can say about a source, and it was said about "
          + "a file that was in custody the whole time, at the exact digest the queue itself pins. The bytes bind, "
          + "verified before this build wrote anything. Recorded in source-receipt.json for whoever owns the scalar."
      },
      {
        finding:
          "SOURCE_IDENTITY_RESOLUTION_SWEEP.json records identityEvidence.xfaPresent false for these bytes. The "
          + "AcroForm dictionary of the pinned binary carries an /XFA entry and pdf-lib announces 'Removing XFA form "
          + `data' on load. This build reads xfaPresentInTheAcroFormDictionary ${census.xfaInInputDict}.`,
        consequence:
          "The binary is an XFA hybrid whose AcroForm side is complete — 135 widgets over static page content that "
          + "extracts cleanly — so the ordinary fill-and-flatten path applies and the delivered artifact is the "
          + "flattened rendering of the static pages. The same disagreement was measured on this lane's § 100K "
          + "petition and, earlier, on TC0021 by ma-expunge-mj-set: three Massachusetts Trial Court binaries, the "
          + "same wrong scalar, which makes it a property of how that field is generated rather than of any one file."
      },
      {
        finding:
          "Every check box on this form ships an appearance for its ON state ('/1') and NO '/Off' appearance, and "
          + "every text field ships no /AP at all.",
        consequence:
          "That is the precondition of the measured Vermont synthesized-border defect. Both suppression flags are "
          + "passed, and reports/actual-writes.json reads all 135 rectangles in the output on the INK-operator "
          + "channel — stroke, fill, shading, XObject — to confirm nothing paints at a box this packet does not "
          + "tick. What is stamped at each unticked box is the EMPTY appearance the suppression installs, measured "
          + "at zero ink operators against the source's own on-state stream, which strokes."
      },
      {
        finding:
          "The COURT ORDER block on page 2 prints a hearing date, a hearing time and a JUSTICE'S SIGNATURE and DATE "
          + "line, and the AcroForm carries NO widget at any of them. Its only widget is a single check box.",
        consequence:
          "There is nothing there for this build to protect, and no field counter would have shown the gap. The one "
          + "widget is refused as court-owned on the strength of the block's own printed caption '(for Court use "
          + "only)', re-read from the binary, and the participant is told to write nothing in that block."
      },
      {
        finding:
          "The route-obligation census records nothing for this route on proposedOrder, coverSheet, notice, "
          + "certificateOfService, affidavitOrVerification, schedulesOrContinuationPages, notarizationRequirements, "
          + "filingMethod, filingFee, feeWaiverTreatment, serviceRecipients, serviceMethod, serviceTiming, "
          + `filingDeadline and postFilingInstructions: ${JSON.stringify(route.notRecorded)}.`,
        consequence:
          "The participant instructions state no filing fee, no fee waiver, no deadline and no service the "
          + "participant must effect. What they do state about notice — to the Probation Service, to the prosecutor, "
          + "to any victim, and the public bulletin board — is quoted from the court's own printed block on page 2 "
          + "of the pinned binary, which puts those duties on the Clerk-Magistrate rather than on the participant."
      },
      {
        finding:
          "The Date of Birth box carries no printed date order beneath it, and neither do the 37 disposition-date "
          + "cells.",
        consequence:
          "participant.date_of_birth is written in the platform's stored ISO form, YYYY-MM-DD, because the form "
          + "prints no order for it to disagree with. Recorded because two other families have raised the "
          + "stored-versus-printed date question as a shared-factory matter, and this family's answer is 'the paper "
          + "does not say', not 'ISO is correct here'."
      }
    ]
  });

  writeJson(`${OUT}/approval-request.json`, {
    schemaVersion: "rcap-family-approval-request/v1", familyId: FAMILY_ID,
    requested: "independent completeness verification, visual review and counsel review",
    buildStatus: "state_built", status: "PENDING_INDEPENDENT_VERIFICATION",
    approvedForLive: false, live: false, commercialRoutesOpened: 0,
    counselQuestionsRaised: [
      "This packet writes only the participant's name, date of birth, address and phone number, and leaves all 111 "
      + "charge-table cells and all nine narrative answers to the participant. Confirm that is the right division "
      + "for a petition signed under a perjury warning, and that no charge or disposition may be carried over from a "
      + "screening answer without the court record behind it.",
      "The four court-department boxes are left to the participant as case facts rather than ticked. Confirm.",
      "The residence-based venue rule for Boston Municipal Court cases is stated to the participant from the route "
      + "record, before the COURT DIVISION/COUNTY blank. Confirm the rule as quoted is current and correctly stated.",
      "The participant is told the petition is posted on a public bulletin board until the hearing, quoted from the "
      + "form's own court-order block. Confirm that is the right thing to surface before filing, given that some "
      + "participants may not expect their petition to be public.",
      "TC0057 (2/24) is the edition held in custody. Confirm it is still the published edition before any promotion "
      + "beyond state_built.",
      "This family and ma-expunge-k-set are different remedies under different sections. Confirm the instructions "
      + "here draw that line clearly enough for someone who came in wanting 'my record cleared'."
    ],
    mattersForTheReviewersAttention: [
      "build-findings.json — the AcroForm index order does not follow the printed row order of the 37-row charge table; every row is resolved by geometry against the printed number, and this is a check any numbered-table family needs.",
      "build-findings.json — the column headings interleave and the naive reading swaps two columns; two independent readings are asserted.",
      "build-findings.json — this family was classed SOURCE_GENUINELY_MISSING and was not.",
      "reports/actual-writes.json — both output-byte glyph readings are measured from the artifact over all 135 rectangles."
    ]
  });

  return {
    familyId: FAMILY_ID,
    status: PASS_COUNTERS.every((c) => counted.counters[c] === 0) ? "COMPLETED" : "STOPPED",
    counters: counted.counters, counterFindings: counted.findings,
    directory: OUT, documents: [DOCUMENT_ID],
    officialForm: DOCUMENT_ID, sourceSha256: source.sha256, custodyRoot: source.custodyRoot,
    writes: maps.reduce((n, m) => n + m.canonicalWrites.length, 0),
    routeSelectionsMade: 0,
    tableRowsResolvedByGeometry: cellsByRow.size,
    tableCellsWhoseIndexDisagreesWithThePrintedRow: census.indexVersusPrintedRow.filter((x) => !x.agrees).length,
    requiredBeforeFiling: rbf.length,
    boundaryOnlyRequiredBeforeFiling: boundaryOnlyRbf.length,
    participantElections: maps.reduce((n, m) => n + m.selectionControls.filter((c) => c.disposition === "participant_election").length, 0),
    artifacts: artifacts.map((a) => ({ fixture: a.fixture, sha256: a.sha256, byteLength: a.byteLength, pageCount: a.pageCount })),
    rasterPages: rasterPages.length,
    rasterState: skipRaster ? "BUILT_RASTER_PENDING" : "RASTER_LOCAL_PENDING_CENTRAL",
    nineCountersZero: PASS_COUNTERS.every((c) => counted.counters[c] === 0),
    packetsSelfVerified: 0, commercialRoutesOpened: 0, productionTouched: false
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(thisFile)) {
  runFamily()
    .then((r) => { console.log(JSON.stringify(r, null, 2)); })
    .catch((e) => { console.error(e); process.exit(1); });
}
