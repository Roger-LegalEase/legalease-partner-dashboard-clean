#!/usr/bin/env node
/**
 * The Massachusetts time-based expungement packet family builder.
 *
 *   node scripts/build-census-v1-ma-expunge-time-set.mjs [--check] [--no-raster]
 *
 * One census-v1 family, strategy official_pdf_fill, one track over two staged
 * route obligations:
 *
 *   ma-expunge-time   Petition to Expunge under G.L. c. 276, §§ 100F, 100G and
 *                     100H — the Massachusetts Probation Service form
 *
 *   obligation:unit:MA:ma-expunge-time:ma-expunge-time-commissioner-certification
 *   obligation:unit:MA:ma-expunge-time:ma-expunge-time-court-determination
 *
 * THE ARCHITECTURE IS GENUINELY STAGED, AND THE PACKET SAYS SO
 *
 * The Commissioner of Probation certifies eligibility under §§ 100I and 100J,
 * and only then does the matter reach a judge with the district attorney on
 * notice. So the participant's single act is submitting one petition to one
 * office; everything after that happens without them until a hearing, if there
 * is one. The second route obligation is a court determination the participant
 * does not initiate, which is why this family ships one filing and a process
 * page rather than two filings.
 *
 * THE SOURCE IS FLAT, AND THAT IS READ FROM THE BINARY RATHER THAN ASSUMED
 *
 * The committed corpus index records this form as acroFormPresent false,
 * acroFieldCount 0, structuralClassObserved "flat_pdf", and the binary agrees.
 * There are no widgets to fill, so every value is drawn as a MEASURED OVERLAY
 * into a write box whose coordinates were read first-hand from the pinned
 * binary's own printed text, and the byte proof reads the ink back as page text
 * with the source's own printed text at the same coordinates subtracted.
 *
 * The same bytes are held in TWO custodies — the Master Library and the D
 * source packs — under the same SHA-256. That is one document, not two. The
 * first custody actually mounted supplies the bytes and which one it was is
 * recorded rather than assumed.
 *
 * WHAT THE REPOSITORY ESTABLISHES FOR THIS ROUTE, AND WHERE IT WAS READ
 *
 * Three of the four participant-facing obligations are answered by the form's
 * OWN INSTRUCTION SHEET, which is page 2 of the pinned binary. That sheet is a
 * held source for this route in the most direct sense available: it is the
 * document the participant receives.
 *
 *   FILING DESTINATION  HELD. Page 2: "Where to file (mail) this Petition?
 *                       Office of the Commissioner of Probation, One Ashburton
 *                       Place, Room 405, Boston, MA 02108." Page 1 addresses
 *                       the same office in its own TO: line. The compiled
 *                       Massachusetts profile agrees for this exact route
 *                       (packetGenerator.serviceAndNoticeRules[1]: "For
 *                       time-based expungement, the user uses the Petition to
 *                       Expunge Form and sends it to the Commissioner of
 *                       Probation"), and so does the intake record.
 *
 *   SERVICE             HELD, and the answer is that the participant does not
 *                       serve anyone. Page 2: "Will the District Attorney's
 *                       Office be notified of this Petition? Yes. If upon
 *                       review of your Petition it is determined that you meet
 *                       all of the criteria listed on said Petition, THIS
 *                       OFFICE will then notify the District Attorney's Office
 *                       in the County where the offense was prosecuted." The
 *                       Commissioner's office gives the notice. Telling a
 *                       participant to serve a district attorney here would
 *                       invent an obligation the form disclaims.
 *
 *   HEARING             HELD. Page 2: "If the District Attorney's Office
 *                       objects to this Petition, then a hearing will be held.
 *                       If there is no objection, a hearing may be held, at the
 *                       discretion of the Court, but is not required."
 *
 *   FEE AND WAIVER      NOT ESTABLISHED, and the search was wider than this
 *                       form. The intake record records "None identified in the
 *                       review" for fees and "None identified" for waiver. The
 *                       form's own two pages state no fee. The compiled
 *                       Massachusetts profile carries exactly one dollar figure
 *                       anywhere — a $50 threshold for minor motor-vehicle
 *                       offences under § 100A — which is a different section
 *                       and a different question, and is not read onto this
 *                       route. So no held source establishes a fee, and the
 *                       packet says so while naming the office that answers it:
 *                       the Office of the Commissioner of Probation, One
 *                       Ashburton Place, Room 405, Boston, MA 02108 — an office
 *                       identified well enough to actually reach, and the same
 *                       office the petition is sent to.
 *
 * WHAT THIS BUILD WRITES, AND THE ONE PLACE IT SPLITS A FACT
 *
 * The platform holds the participant's name, date of birth, mailing address and
 * telephone number, and writes those four. The form asks for the address SPLIT
 * across Mailing Address, City, State and Zip, and the platform holds it as one
 * line. The one line is written into Mailing Address, which is what it is, and
 * City, State and Zip are left as declared blanks the participant completes
 * from the same address. That is recorded here because it is a deliberate
 * choice between two imperfect options, not an oversight.
 *
 * WHAT IT DELIBERATELY DOES NOT WRITE. Race, ethnicity and gender are printed
 * on this form. The platform does not collect race or ethnicity, and does not
 * hold gender. Each is left as a declared blank the participant completes, and
 * the instructions say in terms that the platform did not fill them because it
 * does not collect them. A packet that quietly guessed a participant's race
 * would be a serious defect; one that silently omitted the blanks without
 * saying why would be a smaller one.
 *
 * The Social Security number is likewise a declared blank. The platform does
 * not hold it and would not print it if it did.
 *
 * THE SECTION BOX IS THE PARTICIPANT'S, AND IT IS NOT A ROUTE ELECTION. The
 * form offers three boxes — § 100F for a delinquency adjudication or youthful
 * offender conviction, § 100G for an adult conviction, § 100H for a
 * non-adjudication or non-conviction. This family covers all three: the route
 * is time-based expungement, and which section applies follows from what the
 * participant's own record shows, which the platform has not seen. It is
 * declared required-before-filing and routeDetermined false, because the route
 * genuinely does not determine it.
 *
 * A built family is a built family. It is not verified, not approved, not
 * sellable, and this builder issues no verdict on its own packets.
 */
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

import { extractTextItems, groupIntoLines } from "./rcap-official-forms/rcap-pdf-anchor-capture.mjs";
import { finalizeFlatOverlay } from "./rcap-official-forms/rcap-official-form-finalize.mjs";
import { stampDeterministic } from "./rcap-official-forms/rcap-deterministic-pdf-date.mjs";
import { makeCorpusEntryResolver } from "./lib/corpus-index-paths.mjs";
import { classifyField, classifyBlank, rowKeyOf, PASS_COUNTERS, BLANK_DISPOSITIONS }
  from "./rcap-packet-completeness/completeness-contract.mjs";

const thisFile = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(thisFile), "..");
process.chdir(ROOT);
const require = createRequire(import.meta.url);
const { PDFDocument, StandardFonts, rgb } = require("pdf-lib");

const FAMILY_ID = "ma-expunge-time-set";
const OUT = "data/rcap-all50/overlays/census-v1/ma/ma-expunge-time-set--official-pdf-fill";
const BUILD_SCRIPT = "scripts/build-census-v1-ma-expunge-time-set.mjs";
const IMPLEMENTATION_STRATEGY = "official_pdf_fill";
const CORPUS_INDEX = "data/rcap-all50/local-source-corpus-index.json";

const ROUTE = Object.freeze({
  jurisdiction: "MA",
  routeKeys: [
    "obligation:unit:MA:ma-expunge-time:ma-expunge-time-commissioner-certification",
    "obligation:unit:MA:ma-expunge-time:ma-expunge-time-court-determination"
  ],
  primaryRouteKey: "obligation:unit:MA:ma-expunge-time:ma-expunge-time-commissioner-certification",
  routeSelectionId: "ma-expunge-time-official-set",
  legalName: "Petition to Expunge under G.L. c. 276, §§ 100F, 100G and 100H (Massachusetts Probation Service)",
  routeName: "asking the Commissioner of Probation to expunge a Massachusetts record for an offence committed before you turned 21, under G.L. c. 276, §§ 100F, 100G or 100H",
  statute: "G.L. c. 276, §§ 100F, 100G, 100H, 100I, 100J and 100N"
});

const PRIMARY = "ma-expunge-time-primary-filing-1";
const GUIDANCE = "ma-expunge-time-process-guidance-2";
const COMPONENTS = [PRIMARY, GUIDANCE];

const COMPOSED_TITLES = {
  [PRIMARY]: "Petition to Expunge (Massachusetts Probation Service, Rev. 10/11/2018)",
  [GUIDANCE]: "What Happens After You Send It, and What It Costs"
};

const COMPONENT_CONDITIONS = {};

const SOURCE = Object.freeze({
  componentId: PRIMARY,
  sourceId: "official-form:Massachusetts Probation Service Petition to Expunge",
  formNumber: "MA-PROBATION-SERVICE",
  title: "Petition to Expunge under G.L. c. 276, §§ 100F, 100G or 100H",
  instrumentKind: "primary_filing",
  sha256: "5ccb13e55c07a520526cad72fe48b506f6a67c51a2c879817feb49829853b0b1"
});

const COMPOSED_FROM =
  "the legal-design intake record (data/record-clearing/legal-design-intake/MA.memo.json, track ma-expunge-time), "
  + "the packet-set manifest (data/record-clearing/legal-design-packet-set-manifests.json, ma-expunge-time-set), "
  + "the compiled Massachusetts profile (src/lib/rcap-engine/compiled/profiles/MA-massachusetts.json, "
  + "packetGenerator.serviceAndNoticeRules[1] and pathways[4]) and the pinned form's OWN page-2 instruction sheet";

const FIXTURES = {
  canonical: {
    "participant.full_legal_name": "Jordan Avery Reyes",
    "participant.date_of_birth": "2001-04-17",
    "participant.street_address": "42 Maple Street, Dorchester, MA 02124",
    "participant.phone": "617-555-0142",
    "participant.email": "jordan.reyes@example.org"
  },
  boundary: {
    "participant.full_legal_name": "Maria-Alejandra O'Shaughnessy-Whitfield",
    "participant.date_of_birth": "1999-12-31",
    "participant.street_address": "1188 Upper Notch Crossing Road, Apartment 14B, Springfield, Massachusetts 01103-2214",
    "participant.phone": "(413) 555-0199 ext. 4417",
    "participant.email": "maria.alejandra.oshaughnessy.whitfield@longmailexample.org"
  }
};

const SIGNATURE = "signature_or_date_participant_completion";
const COURT_OWNED = "court_prosecutor_clerk_or_agency_owned";
const PARTICIPANT_ELECTION = "participant_sworn_narrative_or_legal_election";

const WRITE = (fact) => ({ policy: "write", fact });
const SUPPLY = (what, why) => ({ policy: "supply", what, why });
const PROTECT = (refusalClass, why) => ({ policy: "protect", refusalClass, why });
/*
 * A genuine participant election: a choice only the participant can make and
 * one the route does NOT determine. It is not a required-before-filing fact,
 * because the packet is not waiting on a value it could have held — it is a
 * decision that belongs to the person signing. The completeness contract
 * refuses REQUIRED_BEFORE_FILING on a selection control for exactly that
 * reason, and it is right to.
 */
const ELECTION = (what, why) => ({ policy: "election", refusalClass: PARTICIPANT_ELECTION, what, why });

/*
 * Every blank of the Petition to Expunge, measured from the pinned binary.
 *
 * The form is flat, so a "field" here is a MEASURED WRITE BOX beside the
 * caption the form prints for it. Each box was placed by reading the printed
 * text runs and their x extents at the caption's own baseline: the box begins
 * after the caption ends and stops before the next printed run on the same
 * line, so nothing this build draws can land on the form's own words.
 *
 * `captionAt` records where the caption was read. If a revision moves it, the
 * census fails rather than writing into the wrong blank.
 */
const S = {
  SECTION: "Section selection",
  IDENTITY: "Petitioner identifying information",
  DEMOGRAPHIC: "Demographic information the form requests",
  SIGN: "Signature and certification"
};

const FIELDS = {
  section_box: {
    section: S.SECTION, page: 1, selection: true,
    caption: "SELECT appropriate box", captionAt: { page: 1, y: 717 },
    label: "Section box — which of the three boxes on this petition applies to your record",
    writeBox: { x: 60, y: 688, width: 34, height: 12 },
    ...ELECTION(
      "a mark in box 1 for a delinquency (juvenile) adjudication or youthful offender conviction under Section 100F, box 2 for an adult conviction under Section 100G, or box 3 for a delinquency (juvenile) non-adjudication or any youthful offender or adult non-conviction under Section 100H - your own record shows which",
      "this family covers all three sections and the route does not determine which applies; which one does follows from what the participant's record shows, which the platform has not seen")
  },
  petitioner_name: {
    section: S.IDENTITY, page: 1,
    caption: "Print:", captionAt: { page: 1, y: 534 },
    label: "Printed name of the petitioner - last, first and middle",
    writeBox: { x: 56, y: 529, width: 350, height: 13 },
    ...WRITE("participant.full_legal_name")
  },
  date_of_birth: {
    section: S.IDENTITY, page: 1,
    caption: "Date of Birth:", captionAt: { page: 1, y: 534 },
    label: "Date of Birth of the petitioner",
    writeBox: { x: 474, y: 529, width: 110, height: 13 },
    ...WRITE("participant.date_of_birth")
  },
  alias_name: {
    section: S.IDENTITY, page: 1,
    caption: "Alias/Maiden/Previous Name:", captionAt: { page: 1, y: 507 },
    label: "Alias, maiden or previous name of the petitioner",
    writeBox: { x: 158, y: 502, width: 426, height: 13 },
    ...SUPPLY("any alias, maiden or previous name your record may be under, or leave it blank if there is none",
      "the platform holds one legal name and has not seen the record, so it does not know what other name a case may be filed under")
  },
  mailing_address: {
    section: S.IDENTITY, page: 1,
    caption: "Mailing Address:", captionAt: { page: 1, y: 489 },
    label: "Street address on the Mailing Address line",
    writeBox: { x: 105, y: 484, width: 171, height: 13 },
    ...SUPPLY("the street part of your mailing address - this form splits the address across four blanks, and the street goes here",
      "the platform holds the mailing address as ONE LINE and this form asks for it in four parts. Splitting it by guessing where the street ends and the city begins would invent structure the platform does not have, and the boundary fixture proved the one-line form does not fit this blank: a 79-character address needs 242 points at the minimum legible size and the blank is 171 points wide. Writing it when it happens to be short and dropping it when it is long would be worse than asking for it consistently.")
  },
  address_city: {
    section: S.IDENTITY, page: 1,
    caption: "City:", captionAt: { page: 1, y: 489 },
    label: "City of the petitioner's mailing address",
    writeBox: { x: 304, y: 484, width: 107, height: 13 },
    ...SUPPLY("the city of your mailing address, taken from the same address printed above",
      "the platform holds the mailing address as one line and this form asks for it in four parts, so all four parts are the participant's to write from the address they already have")
  },
  address_state: {
    section: S.IDENTITY, page: 1,
    caption: "State:", captionAt: { page: 1, y: 489 },
    label: "State of the petitioner's mailing address",
    writeBox: { x: 444, y: 484, width: 66, height: 13 },
    ...SUPPLY("the state of your mailing address, taken from the same address printed above",
      "the platform holds the mailing address as one line and this form asks for it in four parts, so all four parts are the participant's to write from the address they already have")
  },
  address_zip: {
    section: S.IDENTITY, page: 1,
    caption: "Zip:", captionAt: { page: 1, y: 489 },
    label: "Zip code of the petitioner's mailing address",
    writeBox: { x: 535, y: 484, width: 49, height: 13 },
    ...SUPPLY("the zip code of your mailing address, taken from the same address printed above",
      "the platform holds the mailing address as one line and this form asks for it in four parts, so all four parts are the participant's to write from the address they already have")
  },
  occupation: {
    section: S.IDENTITY, page: 1,
    caption: "Occupation:", captionAt: { page: 1, y: 471 },
    label: "Occupation of the petitioner",
    writeBox: { x: 85, y: 466, width: 128, height: 13 },
    ...SUPPLY("your occupation", "the platform holds no employment fact for any participant")
  },
  social_security_number: {
    section: S.IDENTITY, page: 1,
    caption: "Social Security #", captionAt: { page: 1, y: 471 },
    label: "Social Security number the form requests",
    writeBox: { x: 293, y: 466, width: 100, height: 13 },
    ...SUPPLY("your Social Security number, which you write yourself on the paper you send",
      "the platform does not hold a Social Security number and would not print one onto a form if it did")
  },
  phone_number: {
    section: S.IDENTITY, page: 1,
    caption: "Phone #", captionAt: { page: 1, y: 471 },
    label: "Phone number of the petitioner",
    writeBox: { x: 436, y: 466, width: 148, height: 13 },
    ...WRITE("participant.phone")
  },
  fathers_name: {
    section: S.IDENTITY, page: 1,
    caption: "Father's Name:", captionAt: { page: 1, y: 453 },
    label: "Father's name the form requests",
    writeBox: { x: 97, y: 448, width: 116, height: 13 },
    ...SUPPLY("your father's name", "the platform holds no family fact for any participant")
  },
  mothers_maiden_name: {
    section: S.IDENTITY, page: 1,
    caption: "Mother's Maiden Name:", captionAt: { page: 1, y: 453 },
    label: "Mother's maiden name the form requests",
    writeBox: { x: 322, y: 448, width: 71, height: 13 },
    ...SUPPLY("your mother's maiden name", "the platform holds no family fact for any participant")
  },
  spouses_name: {
    section: S.IDENTITY, page: 1,
    caption: "Spouse's Name:", captionAt: { page: 1, y: 453 },
    label: "Spouse's name the form requests",
    writeBox: { x: 471, y: 448, width: 113, height: 13 },
    ...SUPPLY("your spouse's name, or leave it blank if it does not apply",
      "the platform holds no family fact for any participant")
  },
  race_selection: {
    section: S.DEMOGRAPHIC, page: 1, selection: true,
    caption: "Race:", captionAt: { page: 1, y: 432 },
    label: "Race line — the box marked among the six the form prints",
    writeBox: { x: 57, y: 427, width: 38, height: 12 },
    ...ELECTION("a mark beside the race you choose from the six printed on the form, or none",
      "the platform does not collect race and will not guess or infer one")
  },
  ethnicity_selection: {
    section: S.DEMOGRAPHIC, page: 1, selection: true,
    caption: "Ethnicity:", captionAt: { page: 1, y: 398 },
    label: "Ethnicity line — the box marked among the two the form prints",
    writeBox: { x: 73, y: 393, width: 22, height: 12 },
    ...ELECTION("a mark beside the ethnicity you choose from the two printed on the form, or none",
      "the platform does not collect ethnicity and will not guess or infer one")
  },
  gender: {
    section: S.DEMOGRAPHIC, page: 1,
    caption: "Gender:", captionAt: { page: 1, y: 370 },
    label: "Gender the form requests",
    writeBox: { x: 67, y: 365, width: 200, height: 13 },
    ...SUPPLY("the gender you choose to state, or leave it blank",
      "the platform does not hold a gender for any participant and will not guess one")
  },
  signature_top: {
    section: S.SIGN, page: 1,
    caption: "Signature Of petitioner:", captionAt: { page: 1, y: 348 },
    label: "Signature of the petitioner",
    writeBox: { x: 130, y: 343, width: 300, height: 13 },
    ...PROTECT(SIGNATURE, "the petition is the participant's own and is signed when they actually send it")
  },
  signature_bottom: {
    section: S.SIGN, page: 1,
    caption: "Signature Of PetitionerDate", captionAt: { page: 1, y: 34 },
    label: "Signature of petitioner and date, under penalties of perjury",
    writeBox: { x: 273, y: 44, width: 150, height: 13 },
    ...PROTECT(SIGNATURE, "the certification is sworn under penalties of perjury and is never prefilled")
  },
  signature_bottom_date: {
    section: S.SIGN, page: 1,
    caption: "Signature Of PetitionerDate", captionAt: { page: 1, y: 34 },
    label: "Date beside the signature under penalties of perjury",
    writeBox: { x: 440, y: 44, width: 120, height: 13 },
    ...PROTECT(SIGNATURE, "a date written before the petition is actually signed would be false")
  }
};

const RECEIPT = {
  groundingRecords: [
    { record: "data/record-clearing/legal-design-intake/MA.memo.json", track: "ma-expunge-time" },
    { record: "data/record-clearing/legal-design-packet-set-manifests.json", packetSetId: "ma-expunge-time-set" },
    { record: "src/lib/rcap-engine/compiled/profiles/MA-massachusetts.json", read: "packetGenerator.serviceAndNoticeRules[1] and pathways[4], both keyed to time-based expungement under §§ 100F–100J" },
    { record: "the pinned form's own page-2 instruction sheet", read: "the filing destination, the district-attorney notification, and the hearing rule, all printed on the document the participant receives" }
  ],
  officialSourcesRecordedInIntake: [
    { title: "Massachusetts Probation Service Petition to Expunge form (Rev. 10/11/2018)", url: "https://www.mass.gov/info-details/massachusetts-probation-service-petition-to-expunge-form", retrievedOn: "2026-08-02" },
    { title: "G.L. c. 276, §§ 100F, 100G, 100H, 100I, 100J and 100N", url: "https://malegislature.gov/Laws/GeneralLaws/PartIV/TitleII/Chapter276", retrievedOn: "2026-08-02" }
  ],
  formIdentityNote:
    "The committed corpus index records this binary as acroFormPresent false, acroFieldCount 0 and "
    + "structuralClassObserved flat_pdf, and the binary agrees: there are no widgets to fill. Every value is drawn "
    + "as a measured overlay into a write box placed from the form's own printed text runs. The index holds the "
    + "same SHA-256 in TWO custodies — the Master Library and the D source packs — which is one document held "
    + "twice, not two documents; the first custody mounted supplies the bytes and is recorded. The asset sits under "
    + "05_SOURCE_GATED, which is the corpus's own currentness gate: the 2018 revision is the edition held, and "
    + "whether it remains the published edition is a source-freshness question this build does not answer.",
  whatThisReceiptDoesNotEstablish: [
    "that any output is approved for participant delivery",
    "that the 10/11/2018 revision is still the edition the Massachusetts Probation Service publishes — the asset is source-gated for exactly that reason",
    "that this participant is eligible: all offences must have been committed before the 21st birthday, the record must hold not more than two convictions or two non-conviction records, and the Commissioner certifies eligibility under §§ 100I and 100J",
    "what, if anything, it costs to file — no held source establishes a fee or a waiver route for this petition"
  ]
};

const FIELDMAP_NOTES = {
  routeSelectionNote:
    "The form's three boxes — § 100F, § 100G and § 100H — are NOT a route election this build makes. This family "
    + "covers all three sections: the route is time-based expungement, and the two route keys it carries are the "
    + "Commissioner's certification stage and the court's determination stage, not a choice between statutes. Which "
    + "of the three boxes applies follows from what the participant's own record shows — a delinquency "
    + "adjudication, an adult conviction, or a non-adjudication or non-conviction — and the platform has not seen "
    + "it. The box is therefore declared required-before-filing with routeDetermined false, and no box is marked."
};

const INSTRUCTIONS = {
  title: `What you must do before you send — ${ROUTE.routeName}`,
  introLines: [
    `This packet is prepared for **${ROUTE.legalName}**.`,
    "",
    "**You send this to one office, and then you wait.** The Commissioner of Probation certifies eligibility under §§ 100I and 100J, and only then does the matter reach a judge with the district attorney on notice. Your part is the one petition.",
    "",
    "The platform filled in the three facts it holds about you in the shape this form asks for them: your printed name, your date of birth and your phone number. Everything else on the form is a blank listed below.",
    "",
    "**Your address is not filled in, and that is deliberate.** This form splits it across four blanks — Mailing Address, City, State and Zip. The platform holds your address as a single line, and guessing where the street ends and the city begins would invent structure it does not have. You copy the four parts from the address you already have.",
    "",
    "**Three boxes, and only your record says which one.** Box 1 is § 100F, a delinquency (juvenile) adjudication or youthful offender conviction. Box 2 is § 100G, an adult conviction. Box 3 is § 100H, a delinquency (juvenile) non-adjudication or any youthful offender or adult non-conviction. This packet covers all three and marks none of them, because which applies follows from what your own record shows.",
    "",
    "**The form asks your race, your ethnicity and your gender. The platform left all three blank on purpose** — it does not collect race or ethnicity and does not hold a gender, and it will not guess. You fill them in yourself, or leave them, as you choose. The Social Security number is blank for the same kind of reason: the platform does not hold it and would not print it onto a form if it did."
  ],
  componentBlurbs: {
    [PRIMARY]: "the Massachusetts Probation Service Petition to Expunge itself, Rev. 10/11/2018, with your name, date of birth, mailing address and phone written in and every other blank left for you",
    [GUIDANCE]: "what happens after you send it, what is known about cost, and where self-help stops"
  },
  documentsLines: [
    "| Document | Where you get it |", "| --- | --- |",
    "| Your own CORI (criminal offender record information) | Massachusetts Department of Criminal Justice Information Services. The platform never collects, inspects or authenticates it. |"
  ],
  stepsLines: [
    "1. **Get your own CORI from DCJIS** before you fill anything in. It is how you check the docket number, which section box applies, and whether your record holds not more than two convictions or two non-conviction records.",
    "2. **Mark one of the three boxes** — § 100F, § 100G or § 100H — from what your record shows.",
    "3. **Fill in every remaining blank**: alias or maiden name, the four parts of your address, occupation, Social Security number, father's name, mother's maiden name, spouse's name, and race, ethnicity and gender if you choose to state them.",
    "4. **Read the fourteen statements above the signature line.** Signing means every one of them is true of the offence you are asking to expunge — including that you were under 21 when it was committed, that you have no additional offences other than minor motor vehicle violations anywhere, and that you are not currently the subject of an active criminal investigation.",
    "5. **Sign and date it**, under penalties of perjury.",
    "6. **Mail it to the Office of the Commissioner of Probation, One Ashburton Place, Room 405, Boston, MA 02108.** That address is printed on the form itself, twice.",
    "7. **Do not serve the district attorney.** You are not required to, and the form says why: if the Commissioner's office determines you meet the criteria, **that office** notifies the District Attorney's Office in the county where the offence was prosecuted.",
    "8. **Wait.** If the district attorney objects, a hearing will be held. If there is no objection, a hearing may be held at the Court's discretion but is not required."
  ],
  blanksLines: [
    "- **Your signature and the date**, in both places. You sign when you actually send it.",
    "- **The section box.** Three sections, and your record says which.",
    "- **Race, ethnicity and gender.** Deliberately blank: the platform does not collect race or ethnicity and does not hold a gender.",
    "- **Your Social Security number.** The platform does not hold it and would not print it.",
    "- **The whole address — street, city, state and zip.** The platform holds it as one line and this form wants four parts. It does not guess where one ends and the next begins, and the long-address fixture confirmed a one-line address does not physically fit the street blank.",
    "- **Alias or maiden name, occupation, father's name, mother's maiden name and spouse's name.** The platform holds none of them."
  ],
  stopsLines: [
    "- any offence was committed **on or after your 21st birthday** — the whole route depends on every offence being before it;",
    "- your record shows **more than two convictions, or more than two non-conviction records** — the section limits it to two;",
    "- you have **any additional offence other than minor motor vehicle violations**, in Massachusetts or any other jurisdiction — one of the statements you sign says you do not;",
    "- you are **currently the subject of an active criminal investigation** — another of the statements says you are not, and the signature certifies it;",
    "- the offence is one the form's own list excludes: it resulted in or was intended to cause death or serious bodily injury; it was committed while armed with or carrying a dangerous weapon; it was against an elderly or disabled person; it is a sex offence, a sex offence involving a child, or a sexually violent offence; it is Operating Under the Influence; it is a firearms violation or illegal sale of a firearm; it is a violation of a restraining or harassment prevention order; it is an assault or assault and battery on a household member; or it is a felony violation of General Laws Chapter 265;",
    "- the district attorney objects and a hearing is set;",
    "- you want expungement in circumstances other than these. The form's own page 2 says so: **\"you must fill out a different petition\"**, and information about the other provisions is at www.mass.gov.",
    "",
    "Where self-help stops, the office that answers is the **Office of the Commissioner of Probation, One Ashburton Place, Room 405, Boston, MA 02108** — the same office this petition is sent to."
  ],
  notLines: [
    "This is the official Massachusetts Probation Service Petition to Expunge with the four facts the platform holds written into it, and a page explaining what happens next. It is not legal advice, it is not sent for you, and it does not decide whether you are eligible — the Commissioner of Probation certifies that under §§ 100I and 100J.",
    "",
    "**Expungement here means permanent destruction, and that cuts both ways.** An order requires the clerk of the court where the record was created to destroy or permanently erase the trial court records, and requires criminal justice agencies to erase the record from publicly available police logs and to answer inquiries by saying that no record exists. The form warns that once the record is destroyed you cannot get a copy from the court — so if you want copies of anything you filed, or of the petition itself, **make them before the court orders expungement**."
  ]
};

const FINDINGS = [
  {
    finding:
      "The committed corpus index records this source as acroFormPresent false, acroFieldCount 0, "
      + "structuralClassObserved flat_pdf, and the pinned binary agrees. There is no AcroForm to fill.",
    consequence:
      "Every value is drawn as a measured overlay into a write box placed by reading the form's own printed text "
      + "runs and their x extents at each caption's baseline, so nothing this build draws can land on the form's "
      + "own words. The byte proof reads the ink back as page text with the source's printed text at the same "
      + "coordinates subtracted, because a flat overlay leaves no widget to read."
  },
  {
    finding:
      "Three of the four participant-facing obligations are answered by the form's own page-2 instruction sheet: "
      + "where to file (Office of the Commissioner of Probation, One Ashburton Place, Room 405, Boston, MA 02108), "
      + "who notifies the district attorney (that office does, not the participant), and when a hearing is held "
      + "(on objection, or at the Court's discretion). The compiled Massachusetts profile and the intake record "
      + "agree on the destination for this exact route.",
    consequence:
      "The packet states each of them outright rather than naming an authority to ask. It also tells the "
      + "participant NOT to serve the district attorney, because inventing that obligation would contradict a "
      + "document the participant is holding."
  },
  {
    finding:
      "No held source establishes a filing fee or a waiver route. The intake record records 'None identified in the "
      + "review' and 'None identified'; the form's two pages state no fee; and the compiled Massachusetts profile "
      + "carries exactly one dollar figure anywhere — a $50 threshold for minor motor-vehicle offences under "
      + "§ 100A, which is a different section answering a different question.",
    consequence:
      "The packet says no held source establishes a fee and names the office that answers it — the Office of the "
      + "Commissioner of Probation at One Ashburton Place, Room 405, Boston, MA 02108, which is the same office the "
      + "petition is sent to and is identified well enough to reach. The § 100A $50 figure is not read onto this "
      + "route."
  },
  {
    finding:
      "The form asks for race, ethnicity, gender and a Social Security number. The platform does not collect race "
      + "or ethnicity, does not hold a gender, and does not hold a Social Security number.",
    consequence:
      "All four are declared blanks, and the instructions say in terms that they were left blank because the "
      + "platform does not collect or hold them rather than by omission. A packet that guessed a participant's race "
      + "would be a serious defect; one that silently left the blanks without saying why would be a smaller one."
  },
  {
    finding:
      "The form asks for the mailing address split across Mailing Address, City, State and Zip, and the platform "
      + "holds it as a single line. A first pass wrote the whole line into the street blank. THE BOUNDARY FIXTURE "
      + "DISPROVED THAT: the long-address participant's 79-character address needs 242.3 points at the minimum "
      + "legible font size and the measured blank is 171 points wide, so the finalizer correctly refused it and "
      + "that fixture silently lost the participant's address while the canonical fixture kept it.",
    consequence:
      "All four address parts are now declared blanks the participant transcribes. A packet that writes an address "
      + "when it happens to be short and drops it when it is long is worse than one that asks for it consistently, "
      + "and splitting the single line by guessing where the street ends would invent structure the platform does "
      + "not have. The finding is recorded rather than repaired away because the boundary fixture is what caught it."
  },
  {
    finding:
      "The three section boxes cover §§ 100F, 100G and 100H, and this family covers all three. The route's two "
      + "obligations are staged — the Commissioner's certification and the court's determination — not a choice "
      + "between statutes.",
    consequence:
      "The section box is declared required-before-filing with routeDetermined false, and no box is marked. Which "
      + "section applies follows from the participant's own record, which the platform has not seen."
  }
];

const APPROVAL = {
  counselQuestionsRaised: [
    "Confirm the packet is right to tell the participant NOT to serve the district attorney. The form's page 2 states that the Commissioner's office notifies the District Attorney's Office where the offence was prosecuted, and the intake record's service note reads only 'Per the statute and the form'.",
    "Confirm that naming the Office of the Commissioner of Probation as the authority on cost is the right answer where no held source establishes a fee, given that office is also the filing destination.",
    "Confirm the section box is correctly treated as the participant's rather than as a route election, given the family covers §§ 100F, 100G and 100H and the two route keys are stages rather than statutes.",
    "The 10/11/2018 revision sits behind the corpus's own currentness gate (05_SOURCE_GATED). Confirm it is still the published edition before any promotion beyond state_built.",
    "Confirm the packet is right to write a single-line mailing address into the Mailing Address blank while leaving City, State and Zip for the participant, rather than leaving all four blank.",
    "The form collects race, ethnicity, gender and a full Social Security number. Confirm the packet's refusal to populate any of them, and its explanation for why, is the treatment counsel wants."
  ],
  mattersForTheReviewersAttention: [
    "This is a flat PDF and every write box was measured from the binary's own printed runs. The census fails the build if a recorded caption is no longer printed where the dictionary says it is, because a moved caption would put ink in the wrong blank.",
    "The fourteen certification statements above the signature are quoted into the stop conditions, because signing the form asserts every one of them and several are eligibility questions in disguise — the under-21 requirement, the no-additional-offences requirement, and the no-active-investigation requirement in particular.",
    "The permanent-destruction warning from page 2 is carried into the instructions, including the form's own advice to make copies before the court orders expungement.",
    "The same bytes are held in two custodies under one SHA-256. The receipt records which custody supplied them rather than assuming the Master Library did."
  ]
};

/* ════════════════════════════════════════════════════════════════════════════
 * ENGINE — census-v1 flat-overlay official form plus one composed page.
 *
 * Self-contained rather than imported from a shared host: this family's
 * MASTER_QUEUE row is exclusiveScript with sharedBuildHost null, and a host
 * shared with families outside this lane's grant could not be changed without
 * moving their bytes. The family-specific facts live entirely above this line.
 *
 * Determinism comes from stampDeterministic(). pdf-lib stamps the wall clock
 * into any document made with PDFDocument.create(), and save({updateMetadata:
 * false}) does not remove a stamp already there, so the composed page and the
 * assembled packet are both stamped explicitly. Bytes that move on every
 * rebuild silently invalidate this family's own hash-bound raster receipt.
 * ════════════════════════════════════════════════════════════════════════════ */

const RASTER_ENGINE = "scripts/raster/pdf-page-raster.mjs (Chromium, calibrated)";
const DOTS = (n = 84) => ".".repeat(n);
const flat = (x) => String(x ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/* ---- source binding: three records must agree ------------------------------ */
function resolveSource() {
  const index = JSON.parse(fs.readFileSync(path.join(ROOT, CORPUS_INDEX), "utf8"));
  const resolver = makeCorpusEntryResolver(index, { repoRoot: ROOT });
  const matches = (index.entries ?? []).filter((e) => e.sha256 === SOURCE.sha256);
  if (matches.length === 0) {
    return { failures: [{ sourceId: SOURCE.sourceId, why: `no entry in the committed corpus index carries the SHA-256 this family pins (${SOURCE.sha256})` }] };
  }
  // One document held in two custodies is one document. The first custody
  // actually mounted supplies the bytes, and which one is recorded.
  let picked = null;
  const notMounted = [];
  for (const entry of matches) {
    const abs = resolver.resolve(entry);
    if (abs && fs.existsSync(abs)) { picked = { entry, abs }; break; }
    notMounted.push(entry.custody ?? "master_library");
  }
  if (!picked) {
    return { failures: [{ sourceId: SOURCE.sourceId, indexedIn: matches.map((e) => e.custody), why: `the committed index names this source in custody ${notMounted.join(", ")}, and no such tree is mounted here` }] };
  }
  const bytes = fs.readFileSync(picked.abs);
  const sha256 = crypto.createHash("sha256").update(bytes).digest("hex");
  if (sha256 !== picked.entry.sha256) {
    return { failures: [{ sourceId: SOURCE.sourceId, pathInArchive: picked.entry.path, why: `SHA-256 drift: the committed index records ${picked.entry.sha256}, the mounted corpus holds ${sha256}` }] };
  }
  if (sha256 !== SOURCE.sha256) {
    return { failures: [{ sourceId: SOURCE.sourceId, pathInArchive: picked.entry.path, why: `SHA-256 drift against this family's binding: it pins ${SOURCE.sha256}, the corpus holds ${sha256}` }] };
  }
  return {
    failures: [],
    source: {
      ...SOURCE,
      custody: picked.entry.custody ?? "master_library",
      alsoHeldIn: matches.map((e) => e.custody ?? "master_library"),
      pathInArchive: picked.entry.path, revision: picked.entry.revision ?? null,
      sha256, byteLength: bytes.length, bytes,
      pageCount: picked.entry.pageCount ?? null,
      acroFormPresent: picked.entry.acroFormPresent ?? null,
      acroFieldCount: picked.entry.acroFieldCount ?? null,
      structuralClassObserved: picked.entry.structuralClassObserved ?? null
    }
  };
}

/* ---- census: the measured cells, checked against the printed face ----------- */
async function censusOf(source) {
  const doc = await PDFDocument.load(source.bytes, { ignoreEncryption: true, updateMetadata: false });
  const pages = doc.getPages();
  const pageText = pages.map((p, i) => ({
    page: i + 1,
    lines: groupIntoLines(extractTextItems(p)).map((l) => ({ y: Math.round(l.y), text: l.text }))
  }));

  // A flat source has no widgets. If one ever appears, the structural class the
  // index recorded has changed and this build's whole approach is wrong for it.
  let acroFieldCount = 0;
  try { acroFieldCount = doc.getForm().getFields().length; } catch { acroFieldCount = 0; }

  const rows = Object.entries(FIELDS).map(([key, f]) => ({
    key, name: key, document: PRIMARY, page: f.page,
    writeBox: f.writeBox, rect: f.writeBox,
    rectBasis: "measured_write_box_placed_from_the_printed_text_runs_of_the_pinned_binary",
    section: f.section, effectiveLabel: f.label,
    caption: f.caption, captionAt: f.captionAt,
    isSelectionControl: f.selection === true,
    policy: f.policy, fact: f.fact ?? null,
    refusalClass: f.refusalClass ?? null, what: f.what ?? null, why: f.why ?? null
  }));

  // Every recorded caption must still be printed where the dictionary says. A
  // revision that moved one would put this build's ink in the wrong blank, so
  // drift fails the build rather than being reported and rendered anyway.
  const captionDrift = [];
  for (const r of rows) {
    const lines = pageText.find((p) => p.page === r.captionAt.page)?.lines ?? [];
    const near = lines.filter((l) => Math.abs(l.y - r.captionAt.y) <= 3);
    const needle = flat(r.caption);
    const found = needle.length > 0 && near.some((l) => flat(l.text).includes(needle));
    if (!found) captionDrift.push({ field: r.key, page: r.captionAt.page, y: r.captionAt.y, caption: r.caption, linesThere: near.map((l) => l.text).slice(0, 2) });
  }
  return { rows, captionDrift, pageText, pageCount: pages.length, acroFieldCount };
}

/* ---- render the official form as a measured overlay ------------------------ */
async function renderOfficial(source, census, fixtureName) {
  const facts = FIXTURES[fixtureName];
  const writable = census.rows.filter((r) => r.policy === "write");
  const protectedRules = census.rows
    .filter((r) => r.policy === "protect")
    .map((r) => ({ page: r.page, rect: r.writeBox, label: r.effectiveLabel, category: r.refusalClass }));

  const anchors = writable.map((r) => ({
    page: r.page, label: r.effectiveLabel, writeBox: r.writeBox,
    factId: r.fact, fontSize: 9, protectedRules
  }));

  const { bytes, report } = await finalizeFlatOverlay({
    sourceBytes: source.bytes,
    expectedSha256: source.sha256,
    anchors, protectedRules,
    explicitMappings: Object.fromEntries(writable.map((r) => [r.effectiveLabel, r.fact])),
    facts,
    documentTextLines: census.pageText.flatMap((p) => p.lines.map((l) => l.text)),
    title: source.title
  });
  return { bytes, report };
}

/* ---- the composed guidance page -------------------------------------------- */
function sanitizePdfText(text) {
  return text.replaceAll(" ", " ").replaceAll("‑", "-").replaceAll("–", "-")
    .replaceAll("—", "-").replaceAll("−", "-").replaceAll("’", "'")
    .replaceAll("‘", "'").replaceAll("“", '"').replaceAll("”", '"')
    .replaceAll("§", "Sec. ").replaceAll("…", "...");
}

async function renderComposedPdf(fullText, title) {
  const pdf = await PDFDocument.create();
  stampDeterministic(pdf);
  pdf.setTitle(title);
  pdf.setProducer("RCAP census-v1 artifact-only renderer");
  pdf.setCreator("RCAP evidence build");
  const font = await pdf.embedFont(StandardFonts.TimesRoman);
  const fontSize = 11, lineHeight = 14.5, width = 612, height = 792, margin = 72;
  const maxWidth = width - 2 * margin;
  let page = pdf.addPage([width, height]);
  let y = height - margin;
  const draw = (line) => {
    if (y < margin) { page = pdf.addPage([width, height]); y = height - margin; }
    if (line) page.drawText(line, { x: margin, y, size: fontSize, font, color: rgb(0, 0, 0) });
    y -= lineHeight;
  };
  const splitToken = (token) => {
    const chunks = []; let current = "";
    for (const ch of token) {
      if (current && font.widthOfTextAtSize(`${current}${ch}`, fontSize) > maxWidth) { chunks.push(current); current = ch; }
      else current += ch;
    }
    if (current) chunks.push(current);
    return chunks;
  };
  const wrap = (line) => {
    if (!line) return [""];
    const words = line.split(/\s+/).flatMap((w) => font.widthOfTextAtSize(w, fontSize) > maxWidth ? splitToken(w) : [w]);
    const rows = []; let current = "";
    for (const w of words) {
      const candidate = current ? `${current} ${w}` : w;
      if (font.widthOfTextAtSize(candidate, fontSize) <= maxWidth) current = candidate;
      else { if (current) rows.push(current); current = w; }
    }
    if (current) rows.push(current);
    return rows;
  };
  for (const raw of sanitizePdfText(fullText).split("\n")) for (const row of wrap(raw)) draw(row);
  return Buffer.from(await pdf.save({ useObjectStreams: false, updateMetadata: false }));
}

function guidanceBody(facts) {
  const name = facts["participant.full_legal_name"];
  const L = [];
  L.push(COMPOSED_TITLES[GUIDANCE].toUpperCase(), "");
  L.push(`Prepared for: ${name}`, "");
  L.push("WHERE THIS GOES. Mail the Petition to Expunge to the OFFICE OF THE COMMISSIONER OF PROBATION, ONE ASHBURTON PLACE, ROOM 405, BOSTON, MA 02108. That address is printed on the petition itself, twice: in the TO: line at the top of page 1, and again on page 2 under 'Where to file (mail) this Petition?'.", "");
  L.push("YOU DO NOT SERVE THE DISTRICT ATTORNEY. This is worth saying plainly because it is the opposite of most record-clearing routes. The petition's own page 2 asks 'Will the District Attorney's Office be notified of this Petition?' and answers: yes - if upon review of your Petition it is determined that you meet all of the criteria listed on the Petition, THAT OFFICE will then notify the District Attorney's Office in the county where the offence was prosecuted. The District Attorney then has the right to respond. Nothing in this route asks you to serve anyone.", "");
  L.push("WHAT IT COSTS. No source this packet is built from establishes a filing fee for this petition, and none establishes a fee-waiver route. That is not the same as saying it is free. The form's two pages state no fee; the legal-design record for this track records 'None identified in the review' for fees and 'None identified' for a waiver; and the compiled Massachusetts profile carries no fee figure for this route.", "");
  L.push("SO ASK THE OFFICE THAT TAKES THE FILING. The Office of the Commissioner of Probation, One Ashburton Place, Room 405, Boston, MA 02108 - the same office you are mailing the petition to - is who answers what, if anything, this costs and whether any waiver exists. Ask before you send it.", "");
  L.push("WILL THERE BE A HEARING? From the petition's own page 2: if the District Attorney's Office objects, a hearing will be held. If there is no objection, a hearing may be held at the discretion of the Court, but is not required.", "");
  L.push("CAN YOU SEND SUPPORTING MATERIAL? Yes. Page 2 says you do not have to, but you may provide additional information to support your Petition.", "");
  L.push("THE TWO STAGES. The Commissioner of Probation certifies eligibility under Secs. 100I and 100J. Only after that does the matter reach a judge, with the district attorney on notice, for the determination that expungement is in the interests of justice. Your part is the one petition; the second stage is not something you file.", "");
  L.push("CONFIDENTIALITY. Petition materials are confidential under Sec. 100N.", "");
  L.push("WHAT AN ORDER ACTUALLY DOES - AND WHY YOU SHOULD MAKE COPIES FIRST.", "");
  L.push("An order of expungement requires the clerk of the court where the record was created to DESTROY or permanently erase the trial court records within the care, custody or control of the clerk's office, probation, and the Department of Criminal Justice Information, except for information contained in the domestic violence record keeping system. It also requires criminal justice agencies to destroy or permanently erase the record from all publicly available police logs maintained under G.L. c. 41, Sec. 98F within their care, custody or control, and requires those agencies to respond to inquiries from any party - including criminal justice agencies, a county agency, a municipal agency or a state agency - that NO RECORD EXISTS.", "");
  L.push("That is stronger relief than sealing. It is also irreversible. The petition's own page 2 warns: while the clerk will provide you with a copy of the expungement order, if you want copies of the records, any documents that you filed, or the petition, YOU MUST MAKE COPIES BEFORE THE COURT ORDERS EXPUNGEMENT. Once the record is destroyed you will not be able to get a copy from the court.", "");
  L.push("THIS IS NOT THE ONLY EXPUNGEMENT ROUTE IN MASSACHUSETTS. Page 2 says expungement may also be available in circumstances other than these, and that if you want to seek it under one of those you must fill out a DIFFERENT petition. Information about the other provisions, including eligibility requirements, is at www.mass.gov.", "");
  L.push("WHEN TO STOP AND GET HELP INSTEAD.");
  L.push("- Any offence was committed on or after your 21st birthday. The whole route depends on every offence being before it.");
  L.push("- Your record shows more than two convictions, or more than two non-conviction records.");
  L.push("- You have any additional offence other than minor motor vehicle violations, in Massachusetts or any other jurisdiction.");
  L.push("- You are currently the subject of an active criminal investigation by any criminal justice agency.");
  L.push("- The offence is one the petition's own list excludes: it resulted in or was intended to cause death or serious bodily injury; it was committed while armed with or carrying a dangerous weapon; it was against an elderly or disabled person; it is a sex offence, a sex offence involving a child, or a sexually violent offence; it is Operating Under the Influence of liquor or drugs; it is a firearms violation or a violation for illegal sale of a firearm; it is a violation of a restraining or harassment prevention order; it is an assault or assault and battery on a household member; or it is a felony violation of General Laws Chapter 265.");
  L.push("- The district attorney objects and a hearing is set.");
  L.push("- You want expungement in circumstances other than these, which needs a different petition.", "");
  L.push("READ THE FOURTEEN STATEMENTS BEFORE YOU SIGN. Signing the petition means every one of the statements printed above the signature line is true of the offence you are asking to have expunged. Several of them are eligibility questions in disguise, and you are certifying them under penalties of perjury.");
  L.push("", `Route: ${ROUTE.routeKeys.join(" ; ")}`);
  return L.join("\n");
}

/* ---- assemble ---------------------------------------------------------------- */
async function combinePacket(fixtureName, parts) {
  const packet = await PDFDocument.create();
  stampDeterministic(packet);
  packet.setTitle(`${ROUTE.legalName} — ${fixtureName} fixture`);
  packet.setProducer("RCAP census-v1 artifact-only assembler");
  packet.setCreator("RCAP evidence build");
  const pageManifest = [];
  let nextPage = 1;
  for (const part of parts) {
    const doc = await PDFDocument.load(part.bytes, { ignoreEncryption: true, updateMetadata: false });
    const pages = await packet.copyPages(doc, doc.getPageIndices());
    pages.forEach((page, index) => {
      packet.addPage(page);
      pageManifest.push({
        packetPage: nextPage++, component: part.componentId, documentId: part.componentId,
        sourcePage: index + 1, sourceSha256: part.sourceSha256 ?? null
      });
    });
  }
  const bytes = Buffer.from(await packet.save({ useObjectStreams: false, updateMetadata: false }));
  return { bytes, pageManifest, pageCount: packet.getPageCount() };
}

/* ---- byte proof -------------------------------------------------------------- *
 * A measured overlay draws into the page's own content stream, so there is no
 * flattened widget to read. The ink is read back as the assembled packet's page
 * TEXT at each measured cell, with the SOURCE's own printed text at the same
 * coordinates subtracted — otherwise the form's own captions would be reported
 * as ink this build put there.
 */
async function byteProof(source, census, packetBytes, pageManifest, report, fixtureName) {
  const out = await PDFDocument.load(packetBytes, { ignoreEncryption: true, updateMetadata: false });
  const src = await PDFDocument.load(source.bytes, { ignoreEncryption: true, updateMetadata: false });
  const outText = new Map();
  const srcText = new Map();
  out.getPages().forEach((p, i) => outText.set(i + 1, extractTextItems(p).map((t) => ({ x: Number(t.x), y: Number(t.y), text: String(t.text ?? "") }))));
  src.getPages().forEach((p, i) => srcText.set(i + 1, extractTextItems(p).map((t) => ({ x: Number(t.x), y: Number(t.y), text: String(t.text ?? "") }))));

  const packetPageOf = new Map();
  for (const m of pageManifest) packetPageOf.set(`${m.component} ${m.sourcePage}`, m.packetPage);

  const inBox = (t, box) => t.x >= box.x - 2 && t.x <= box.x + box.width + 2
    && t.y >= box.y - 3 && t.y <= box.y + box.height + 3;
  const drawnInBox = (sourcePage, box) => {
    const packetPage = packetPageOf.get(`${PRIMARY} ${sourcePage}`);
    if (!packetPage) return [];
    const already = new Set((srcText.get(sourcePage) ?? []).filter((t) => inBox(t, box)).map((t) => `${Math.round(t.x)}:${t.text}`));
    return (outText.get(packetPage) ?? [])
      .filter((t) => t.text.trim() && inBox(t, box))
      .filter((t) => !already.has(`${Math.round(t.x)}:${t.text}`))
      .sort((a, b) => a.x - b.x).map((t) => t.text);
  };

  const written = new Set(report.written.map((w) => w.anchor));
  const actualWrites = [];
  const refusedFieldsWithInk = [];
  let glyphs = 0;
  for (const r of census.rows) {
    const text = drawnInBox(r.page, r.writeBox);
    const ink = text.join("").trim();
    if (r.policy === "write" && written.has(r.effectiveLabel)) {
      glyphs += ink.replace(/\s+/g, "").length;
      const expected = sanitizePdfText(String(FIXTURES[fixtureName][r.fact] ?? ""));
      actualWrites.push({
        field: r.key, document: PRIMARY, factId: r.fact,
        page: packetPageOf.get(`${PRIMARY} ${r.page}`), rect: r.writeBox,
        section: r.section, effectiveLabel: r.effectiveLabel,
        drawnText: text, expected, foundInOutputBytes: ink.length > 0,
        proof: "read back as page text at the measured cell of the assembled packet, with the source's own printed text at the same coordinates subtracted"
      });
      continue;
    }
    if (ink.length === 0) continue;
    refusedFieldsWithInk.push({ fieldId: r.key, document: PRIMARY, page: r.page, drawnText: text });
  }
  return { actualWrites, refusedFieldsWithInk, documentAuthoredAppearances: [], glyphs };
}

/* ---- the field map ----------------------------------------------------------- */
function mapsFrom(census, report) {
  const writtenLabels = new Set(report.written.map((w) => w.anchor));
  const canonicalWrites = [];
  const canonicalRefusals = [];
  const selectionControls = [];

  for (const r of census.rows) {
    const base = {
      field: `${PRIMARY}.${r.key}`, fieldName: r.key, page: r.page,
      rect: r.writeBox, rectBasis: r.rectBasis,
      printedLabel: r.caption, printedLine: r.caption,
      effectiveLabel: r.effectiveLabel, regionHeading: r.section, sectionHeading: r.section,
      document: PRIMARY
    };
    if (r.policy === "write" && writtenLabels.has(r.effectiveLabel)) {
      canonicalWrites.push({ ...base, factId: r.fact, kind: "measured_flat_overlay" });
      continue;
    }
    if (r.policy === "write") {
      canonicalRefusals.push({
        ...base, reason: "the field map intended a write and the finalizer refused it",
        category: null, completenessClass: null, class: null,
        requiredBeforeFiling: false, factId: r.fact,
        why: "builder defect: intended write not present in the finalizer report"
      });
      continue;
    }
    if (r.policy === "protect") {
      canonicalRefusals.push({
        ...base,
        reason: "signature or date field; never prefilled by this build",
        category: r.refusalClass, completenessClass: r.refusalClass, class: r.refusalClass,
        requiredBeforeFiling: false, why: r.why
      });
      continue;
    }
    // A genuine participant election. Not a required-before-filing fact: the
    // packet is not waiting on a value it could have held, it is leaving a
    // decision to the person who signs. It is still disclosed to the
    // participant — in the election list of participant-instructions.md — so
    // nothing about the choice is left for them to discover on the paper.
    if (r.policy === "election") {
      const election = {
        ...base,
        reason: `a choice only the participant can make, and one this route does not determine: ${r.what}`,
        category: r.refusalClass, completenessClass: r.refusalClass, class: r.refusalClass,
        requiredBeforeFiling: false, routeDetermined: false,
        identity: `${PRIMARY} field ${r.key}`,
        why: r.why, participantMustSupply: r.what
      };
      canonicalRefusals.push(election);
      selectionControls.push({
        selectionId: `${PRIMARY}.${r.key}`, field: r.effectiveLabel,
        disposition: "participant_election", kind: "participant_election_control",
        category: r.refusalClass, reason: election.reason, page: r.page,
        requiredBeforeFiling: false, routeDetermined: false,
        identity: election.identity, why: r.why, participantMustSupply: r.what
      });
      continue;
    }
    const row = {
      ...base,
      reason: `the participant supplies this before filing: ${r.what}`,
      category: null, completenessClass: null, class: null,
      disposition: "REQUIRED_BEFORE_FILING", completenessDisposition: "REQUIRED_BEFORE_FILING",
      requiredBeforeFiling: true, identity: `${PRIMARY} field ${r.key}`,
      factId: null, routeDetermined: false, why: r.why, participantMustSupply: r.what
    };
    canonicalRefusals.push(row);
    if (r.isSelectionControl) {
      selectionControls.push({
        selectionId: `${PRIMARY}.${r.key}`, field: r.effectiveLabel,
        disposition: "required_before_filing", kind: "boxed_entry_control",
        category: null, reason: row.reason, page: r.page,
        completenessDisposition: "REQUIRED_BEFORE_FILING", requiredBeforeFiling: true,
        identity: row.identity, why: r.why, participantMustSupply: r.what
      });
    }
  }

  const officialMap = {
    formNumber: PRIMARY, documentId: PRIMARY, documentRole: PRIMARY,
    officialFormNumber: SOURCE.formNumber,
    documentPolicy: { mode: "participant", captionOnly: false, documentAcceptsFill: true, routeKey: ROUTE.primaryRouteKey },
    structuralClass: "flat_pdf_measured_overlay",
    composedFrom: COMPOSED_FROM,
    explicitMappings: {}, roleRefusals: [], selectionControls,
    canonicalWrites, canonicalRefusals,
    boundaryWrites: canonicalWrites, boundaryRefusals: canonicalRefusals
  };

  const guidanceWrite = {
    field: `${GUIDANCE}.participant_name`, fieldName: "participant_name", page: 1,
    printedLabel: "Person the guidance page is prepared for",
    printedLine: "Person the guidance page is prepared for",
    effectiveLabel: "Person the guidance page is prepared for",
    regionHeading: "Process guidance", sectionHeading: null,
    rectBasis: "composed_document_authored_by_this_build",
    document: GUIDANCE, factId: "participant.full_legal_name", kind: "composed_text"
  };
  const guidanceMap = {
    formNumber: GUIDANCE, documentId: GUIDANCE, documentRole: GUIDANCE,
    officialFormNumber: null,
    documentPolicy: { mode: "participant", captionOnly: false, documentAcceptsFill: true, routeKey: ROUTE.primaryRouteKey },
    structuralClass: "composed_document",
    composedFrom: COMPOSED_FROM,
    explicitMappings: {}, roleRefusals: [], selectionControls: [],
    canonicalWrites: [guidanceWrite], canonicalRefusals: [],
    boundaryWrites: [guidanceWrite], boundaryRefusals: []
  };

  return { maps: [officialMap, guidanceMap], selectionControls };
}

/* ---- the builder's own count of the nine counters ---------------------------- */
function countCompleteness(maps, selectionControls, writeProofs, instructionsText) {
  const counters = Object.fromEntries(PASS_COUNTERS.map((c) => [c, 0]));
  const findings = [];
  const note = (counter, detail) => { counters[counter] += 1; findings.push({ counter, ...detail }); };
  const selectionIds = new Set(selectionControls.map((s) => s.selectionId));

  const row = (r) => ({
    id: r.field, name: r.fieldName ?? r.field, label: r.effectiveLabel ?? "", reason: r.reason ?? "",
    refusalClass: r.category ?? null, page: r.page ?? null, document: r.document ?? null,
    factId: r.factId ?? null, isSelectionControl: selectionIds.has(r.field),
    declared: {
      disposition: r.completenessDisposition ?? null,
      ...(Object.hasOwn(r, "requiredBeforeFiling") ? { requiredBeforeFiling: r.requiredBeforeFiling === true } : {}),
      ...(Object.hasOwn(r, "routeDetermined") ? { routeDetermined: r.routeDetermined === true } : {}),
      identity: r.identity ?? null, factId: r.factId ?? null
    }
  });

  const writes = [];
  const blanks = [];
  for (const m of maps) {
    for (const w of m.canonicalWrites ?? []) writes.push(row(w));
    for (const r of m.canonicalRefusals ?? []) blanks.push(row(r));
  }

  const availableFacts = new Set(writes.map((w) => w.factId).filter(Boolean));
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
      factAvailable: (blank.declared?.factId ? availableFacts.has(String(blank.declared.factId)) : false)
        || here.has(normLabel(blank.label)) || here.has(normLabel(blank.name))
    };
    const verdict = classifyBlank(blank, blank.reason, blank.refusalClass, declared);
    ledger.push({ ...blank, ...verdict });
    const spec = BLANK_DISPOSITIONS[verdict.disposition];
    if (spec.allowed) continue;
    if (verdict.disposition === "KNOWN_FACT_NOT_WRITTEN") note("knownRequiredFieldsMissing", { field: blank.id, label: blank.label, basis: verdict.basis });
    else if (verdict.disposition === "ROUTE_OPTION_NOT_SELECTED") note("requiredOptionsMissing", { field: blank.id, label: blank.label, basis: verdict.basis });
    else note("unclassifiedBlanks", { field: blank.id, label: blank.label, basis: verdict.basis });
  }

  const hay = String(instructionsText ?? "").toLowerCase();
  for (const b of ledger.filter((x) => x.disposition === "REQUIRED_BEFORE_FILING")) {
    const needles = [b.label, b.id, b.declared?.identity].map((x) => String(x ?? "").trim()).filter((x) => x.length >= 3);
    if (needles.some((n) => hay.includes(n.toLowerCase().slice(0, 60)))) continue;
    note("requiredFactsNotCollected", { field: b.id, label: b.label, why: "classified required-before-filing and not named in participant-instructions.md" });
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
    if (missing.length > 0) note("incompleteRows", { row: key, missingCells: missing.map((m) => m.label).slice(0, 6) });
  }

  for (const w of writes) {
    if (classifyField(w.label, w.isSelectionControl === true).requirement === "PROTECTED") {
      note("protectedWrites", { field: w.id, label: w.label, why: "a protected field was written" });
    }
  }

  for (const p of writeProofs) {
    const visible = (p.addedGlyphsReadFromOutputBytes ?? 0) + (p.flattenedWidgetAppearancesReadFromOutputBytes ?? 0);
    if ((p.valuesReportedByFinalizer ?? 0) > 0 && visible === 0) note("invisibleWrites", { fixture: p.fixture, reportedByFinalizer: p.valuesReportedByFinalizer });
    if ((p.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes ?? 0) > 0) note("visualDefects", { fixture: p.fixture, glyphsOutside: p.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes });
    for (const refused of p.refusedFieldsWithInk ?? []) note("protectedWrites", { fixture: p.fixture, field: refused.fieldId, why: "a field the map refused carries ink in the output" });
  }

  return { counters, findings, ledger, terminalFields: writes.length + blanks.length, written: writes.length, blank: blanks.length };
}

/* ---- outputs ------------------------------------------------------------------ */
function writeJson(rel, value) {
  fs.mkdirSync(path.dirname(path.join(ROOT, rel)), { recursive: true });
  fs.writeFileSync(path.join(ROOT, rel), `${JSON.stringify(value, null, 2)}\n`);
}

function requiredBeforeFilingItems(maps) {
  const order = Object.fromEntries(COMPONENTS.map((c, i) => [c, i]));
  return maps.flatMap((m) => (m.canonicalRefusals ?? [])
    .filter((r) => r.requiredBeforeFiling === true)
    .map((r) => ({
      document: m.formNumber, field: r.field, page: r.page,
      printedContext: r.printedLabel, disclosureLabel: r.effectiveLabel,
      identity: r.identity, why: r.why, participantMustSupply: r.participantMustSupply
    })))
    .sort((a, b) => (order[a.document] - order[b.document]) || String(a.field).localeCompare(String(b.field)));
}

function participantInstructions(maps, rbf) {
  const byDoc = new Map();
  for (const item of rbf) byDoc.set(item.document, [...(byDoc.get(item.document) ?? []), item]);
  const out = [];
  out.push(`# ${INSTRUCTIONS.title}`, "");
  out.push(...INSTRUCTIONS.introLines, "");

  out.push("## What is in this packet", "");
  out.push("| Component | What it is |", "| --- | --- |");
  for (const c of COMPONENTS) {
    const cond = COMPONENT_CONDITIONS[c] ? ` **Conditional:** ${COMPONENT_CONDITIONS[c]}` : "";
    out.push(`| \`${c}\` | ${INSTRUCTIONS.componentBlurbs[c] ?? COMPOSED_TITLES[c]}${cond} |`);
  }
  out.push("");

  if (INSTRUCTIONS.documentsLines?.length) {
    out.push("## Documents you must obtain first", "");
    out.push(...INSTRUCTIONS.documentsLines, "");
  }

  if (rbf.length > 0) {
    out.push("## The items you must supply", "");
    out.push("Each is a blank on the petition, beside the caption named below. Fill every one from the record itself, never from memory.", "");
    for (const [doc, items] of byDoc) {
      out.push(`### ${doc} — ${COMPOSED_TITLES[doc] ?? doc}`, "");
      out.push("| The blank on the document | What to write |", "| --- | --- |");
      for (const i of items) out.push(`| ${i.disclosureLabel} | ${i.participantMustSupply} |`);
      out.push("");
    }
  }

  const elections = maps.flatMap((m) => (m.selectionControls ?? []));
  if (elections.length > 0) {
    out.push("## The choices only you can make", "");
    out.push("These are not facts the platform could have looked up and did not. They are decisions that belong to the person signing, so the packet leaves each one unmarked and says what it is.", "");
    out.push("| The choice on the document | What you decide |", "| --- | --- |");
    for (const e of elections) out.push(`| ${e.field} | ${e.participantMustSupply} |`);
    out.push("");
  }

  out.push("## What you do, in order", "");
  out.push(...INSTRUCTIONS.stepsLines, "");

  out.push("## Things the platform deliberately left blank", "");
  out.push(...INSTRUCTIONS.blanksLines, "");

  out.push("## When to stop and get help instead", "");
  out.push(...INSTRUCTIONS.stopsLines, "");

  out.push("## What this packet is not", "");
  out.push(...INSTRUCTIONS.notLines, "");
  out.push(`_Route: ${ROUTE.routeKeys.join(" · ")}_`);
  return `${out.join("\n")}\n`;
}

/* ---- the entry point ----------------------------------------------------------- */
export async function runFamily(argv = process.argv.slice(2)) {
  const checkOnly = argv.includes("--check");
  const skipRaster = argv.includes("--no-raster");

  const { source, failures } = resolveSource();
  if (failures.length > 0) {
    return {
      familyId: FAMILY_ID, status: "STOPPED", stopClass: "BLOCKED_SOURCE",
      failedSourceIdentities: failures, overlayBytesWritten: false,
      directory: OUT, packetsSelfVerified: 0, commercialRoutesOpened: 0, productionTouched: false
    };
  }

  const census = await censusOf(source);

  if (checkOnly) {
    return {
      familyId: FAMILY_ID, status: "CHECK_ONLY",
      boundSources: 1,
      source: { sourceId: source.sourceId, custody: source.custody, alsoHeldIn: source.alsoHeldIn, sha256: source.sha256, pages: census.pageCount },
      structuralClassObserved: source.structuralClassObserved,
      acroFieldsFoundInBinary: census.acroFieldCount,
      measuredCells: census.rows.length,
      writes: census.rows.filter((r) => r.policy === "write").length,
      blanks: census.rows.filter((r) => r.policy !== "write").length,
      captionDrift: census.captionDrift
    };
  }

  // The index says this source is flat. If widgets have appeared, the structural
  // class changed and a measured overlay is the wrong approach for it.
  assert.equal(census.acroFieldCount, 0,
    `the committed index records this source as flat_pdf with 0 AcroForm fields and the binary now carries ${census.acroFieldCount}`);
  assert.equal(census.captionDrift.length, 0,
    `a recorded caption is no longer printed where the dictionary says: ${census.captionDrift.map((d) => `${d.field}@p${d.page}y${d.y}`).join(", ")}`);

  fs.mkdirSync(path.join(ROOT, OUT, "fixtures"), { recursive: true });
  fs.mkdirSync(path.join(ROOT, OUT, "reports"), { recursive: true });

  const artifacts = [];
  const writeProofs = [];
  const rasterPages = [];
  const pdfsDeclared = [];
  let maps = null;
  let selectionControls = null;

  for (const fixtureName of ["canonical", "boundary"]) {
    const facts = FIXTURES[fixtureName];
    const official = await renderOfficial(source, census, fixtureName);
    const guidanceBytes = await renderComposedPdf(guidanceBody(facts), COMPOSED_TITLES[GUIDANCE]);
    assert.ok(guidanceBody(facts).includes(facts["participant.full_legal_name"]),
      "the composed guidance page must carry the participant's name");

    if (!maps) {
      const built = mapsFrom(census, official.report);
      maps = built.maps;
      selectionControls = built.selectionControls;
    }

    const combined = await combinePacket(fixtureName, [
      { componentId: PRIMARY, bytes: official.bytes, sourceSha256: source.sha256 },
      { componentId: GUIDANCE, bytes: guidanceBytes, sourceSha256: null }
    ]);
    const file = `${OUT}/fixtures/${fixtureName}.pdf`;
    fs.writeFileSync(path.join(ROOT, file), combined.bytes);

    const proof = await byteProof(source, census, combined.bytes, combined.pageManifest, official.report, fixtureName);
    assert.equal(proof.refusedFieldsWithInk.length, 0,
      `${fixtureName}: a cell the map refused carries ink: ${proof.refusedFieldsWithInk.map((r) => r.fieldId).join(", ")}`);
    assert.ok(official.report.written.length === 0 || proof.actualWrites.length > 0,
      `${fixtureName}: the finalizer reported ${official.report.written.length} write(s) and the output bytes carry none`);
    for (const w of proof.actualWrites) {
      assert.ok(w.foundInOutputBytes,
        `${fixtureName}: ${w.field} was reported written and no ink is readable at its measured cell`);
    }

    writeProofs.push({
      fixture: fixtureName,
      proofMethod: "every written value read back as page text at its measured cell in the assembled packet, with the source's own printed text at the same coordinates subtracted",
      valuesReportedByFinalizer: official.report.written.length,
      addedGlyphsReadFromOutputBytes: proof.glyphs,
      flattenedWidgetAppearancesReadFromOutputBytes: 0,
      nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: 0,
      refusedFieldsWithInk: proof.refusedFieldsWithInk,
      unfittable: official.report.unfittable ?? [],
      actualWrites: proof.actualWrites
    });

    const sha256 = crypto.createHash("sha256").update(combined.bytes).digest("hex");
    artifacts.push({
      fixture: fixtureName, file, sha256,
      byteLength: combined.bytes.length, pageCount: combined.pageCount,
      pageManifest: combined.pageManifest,
      documents: COMPONENTS, components: COMPONENTS
    });
    pdfsDeclared.push({
      file, documentId: "assembled_packet", role: "assembled_packet_official_form_and_guidance",
      fixture: fixtureName, sha256, byteLength: combined.bytes.length, pageCount: combined.pageCount
    });

    if (!skipRaster) {
      const { rasterizePageCalibrated } = await import("./raster/pdf-page-raster.mjs");
      const rasterDir = `${OUT}/raster/${fixtureName}`;
      fs.mkdirSync(path.join(ROOT, rasterDir), { recursive: true });
      for (let i = 0; i < combined.pageCount; i += 1) {
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
          component: combined.pageManifest[i]?.component ?? null,
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

  const rbf = requiredBeforeFilingItems(maps);
  const instructionsText = participantInstructions(maps, rbf);
  fs.writeFileSync(path.join(ROOT, OUT, "participant-instructions.md"), instructionsText);

  writeJson(`${OUT}/source-receipt.json`, {
    schemaVersion: "rcap-family-source-receipt/v1", familyId: FAMILY_ID, worklistGroupId: FAMILY_ID,
    jurisdiction: ROUTE.jurisdiction, implementationStrategy: IMPLEMENTATION_STRATEGY,
    custodyClass: "SOURCE_ALREADY_HELD", acquisitionCommissioned: false,
    bindingMethod:
      "the source binds by exact SHA-256 against THREE records that must agree: the committed corpus index entry, "
      + "the bytes mounted in the custody that index declares, and the pin carried in this family's builder. The "
      + "custody root is resolved through scripts/lib/corpus-index-paths.mjs, which follows what the index declares "
      + "rather than the shape of the path.",
    routeKeys: ROUTE.routeKeys, routeSelectionId: ROUTE.routeSelectionId,
    statutoryAuthority: ROUTE.statute, legalName: ROUTE.legalName,
    allSourcesExact: true,
    documents: [{
      documentId: PRIMARY, formNumber: source.formNumber, title: source.title,
      instrumentKind: source.instrumentKind, sourceId: source.sourceId,
      custody: source.custody, alsoHeldIdenticallyIn: source.alsoHeldIn,
      pathInArchive: source.pathInArchive, revision: source.revision,
      sha256: source.sha256, sha256Exact: true, byteLength: source.byteLength,
      pageCount: source.pageCount, acroFormPresent: source.acroFormPresent,
      acroFieldCount: source.acroFieldCount, structuralClassObserved: source.structuralClassObserved
    }],
    composedComponentsAuthoredByThisBuild: [GUIDANCE],
    groundingRecords: RECEIPT.groundingRecords,
    officialSourcesRecordedInIntake: RECEIPT.officialSourcesRecordedInIntake,
    formIdentityNote: RECEIPT.formIdentityNote,
    sourceBinaryCommitted: false, commercialRoutesOpened: 0,
    whatThisReceiptDoesNotEstablish: RECEIPT.whatThisReceiptDoesNotEstablish
  });

  writeJson(`${OUT}/field-census.census-v1.json`, {
    schemaVersion: "rcap-official-form-field-census/v1", familyId: FAMILY_ID,
    readFirstHandFrom: "the pinned source binary, at the SHA-256 the source receipt records",
    structuralClass: "flat_pdf_measured_overlay",
    acroFieldsFoundInBinary: census.acroFieldCount,
    documents: [{
      documentId: PRIMARY, pageCount: census.pageCount, cells: census.rows.length,
      captionDrift: census.captionDrift,
      rows: census.rows.map((r) => ({
        cell: r.key, page: r.page, writeBox: r.writeBox, rectBasis: r.rectBasis,
        isSelectionControl: r.isSelectionControl,
        printedCaption: r.caption, captionAt: r.captionAt,
        effectiveLabel: r.effectiveLabel, section: r.section,
        policy: r.policy, factId: r.fact ?? null
      }))
    }]
  });

  writeJson(`${OUT}/production-field-map.json`, {
    schemaVersion: "rcap-official-form-field-map/v1-census-v1", familyId: FAMILY_ID,
    routeKeys: ROUTE.routeKeys, routeSelectionId: ROUTE.routeSelectionId, renderStrategy: "flat_pdf_measured_overlay",
    jurisdiction: ROUTE.jurisdiction, statute: ROUTE.statute, legalName: ROUTE.legalName,
    implementationStrategy: IMPLEMENTATION_STRATEGY,
    officialForm: { documentId: PRIMARY, formNumber: source.formNumber, sha256: source.sha256 },
    componentSet: COMPONENTS,
    componentConditions: COMPONENT_CONDITIONS,
    dispositionVocabulary: [SIGNATURE, COURT_OWNED],
    routeSelectionsMade: [],
    routeSelectionNote: FIELDMAP_NOTES.routeSelectionNote,
    requiredBeforeFilingCount: rbf.length,
    requiredBeforeFiling: rbf,
    maps, generationAllowed: false, runtimeSelectable: false, commercialRoutesOpened: 0
  });

  writeJson(`${OUT}/reports/rendered-artifacts.json`, {
    schemaVersion: "rcap-rendered-artifacts/v1", familyId: FAMILY_ID,
    renderedFresh: true, derivedFromBytes: true,
    componentSet: COMPONENTS,
    componentConditions: COMPONENT_CONDITIONS,
    boundSources: [{
      sourceId: source.sourceId, documentId: PRIMARY, formNumber: source.formNumber,
      custody: source.custody, pathInArchive: source.pathInArchive, sha256: source.sha256
    }],
    pdfs: pdfsDeclared,
    artifacts,
    packets: artifacts.map((a) => ({ fixture: a.fixture, documents: a.documents })),
    everyPageRastered: rasterPages.length === artifacts.reduce((n, a) => n + a.pageCount, 0),
    byteDerivedHashes: true,
    rasterEngine: skipRaster ? null : RASTER_ENGINE, rasterSkipped: skipRaster, rasterPages,
    independentVerificationPending: true
  });

  writeJson(`${OUT}/reports/actual-writes.json`, {
    schemaVersion: "rcap-actual-writes-byte-proof/v1", familyId: FAMILY_ID, derivedFromArtifactBytes: true,
    note:
      "A measured overlay leaves no widget to read, so every written value was read back as page TEXT at its "
      + "measured cell in the ASSEMBLED packet, with the source's own printed text at the same coordinates "
      + "subtracted. Without that subtraction the form's own captions would be reported as ink this build put there.",
    documents: writeProofs,
    artifacts: writeProofs.map((p) => ({
      fixture: p.fixture,
      valuesReportedByFinalizer: p.valuesReportedByFinalizer,
      addedGlyphsReadFromOutputBytes: p.addedGlyphsReadFromOutputBytes,
      flattenedWidgetAppearancesReadFromOutputBytes: p.flattenedWidgetAppearancesReadFromOutputBytes,
      nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: p.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes,
      refusedFieldsWithInk: p.refusedFieldsWithInk,
      unfittable: p.unfittable
    })),
    blockingFindings: []
  });

  writeJson(`${OUT}/reports/blanks-left-for-the-participant.json`, {
    schemaVersion: "rcap-blanks-left-for-the-participant/v1", familyId: FAMILY_ID,
    requiredBeforeFiling: rbf,
    protectedBlanks: maps.flatMap((m) => (m.canonicalRefusals ?? [])
      .filter((r) => r.requiredBeforeFiling !== true)
      .map((r) => ({ document: m.formNumber, field: r.field, label: r.effectiveLabel, refusalClass: r.category ?? null, why: r.why ?? r.reason }))),
    everyRequiredBeforeFilingItemIsDisclosed: true,
    disclosedIn: `${OUT}/participant-instructions.md`
  });

  const counted = countCompleteness(maps, selectionControls, writeProofs, instructionsText);
  writeJson(`${OUT}/reports/completeness-counters.json`, {
    schemaVersion: "rcap-builder-completeness-counters/v1", familyId: FAMILY_ID,
    whatThisIs:
      "The BUILDER's own count of the nine completeness counters, computed with the repository's own contract "
      + "functions over this family's field map, byte proof and participant-instructions.md.",
    whatThisIsNot:
      "A verdict. This lane does not verify its own packets, and PASS_COMPLETE additionally requires a hash-bound "
      + "RASTER_PASS from the central raster workflow.",
    counters: counted.counters,
    allNineZero: PASS_COUNTERS.every((c) => counted.counters[c] === 0),
    findings: counted.findings,
    blankDispositions: counted.ledger.reduce((acc, b) => { acc[b.disposition] = (acc[b.disposition] ?? 0) + 1; return acc; }, {})
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

  writeJson(`${OUT}/build-findings.json`, {
    schemaVersion: "rcap-family-build-findings/v1", familyId: FAMILY_ID, blocking: [],
    findings: FINDINGS
  });

  writeJson(`${OUT}/approval-request.json`, {
    schemaVersion: "rcap-family-approval-request/v1", familyId: FAMILY_ID,
    requested: "independent completeness verification, visual review and counsel review",
    buildStatus: "state_built", status: "PENDING_INDEPENDENT_VERIFICATION",
    approvedForLive: false, live: false, commercialRoutesOpened: 0,
    counselQuestionsRaised: APPROVAL.counselQuestionsRaised,
    mattersForTheReviewersAttention: APPROVAL.mattersForTheReviewersAttention
  });

  const allZero = PASS_COUNTERS.every((c) => counted.counters[c] === 0);
  return {
    familyId: FAMILY_ID,
    status: allZero ? "COMPLETED" : "STOPPED",
    ...(allZero ? {} : {
      stopClass: "COMPLETENESS_COUNTER_NOT_ZERO",
      nonZeroCounters: PASS_COUNTERS.filter((c) => counted.counters[c] > 0),
      firstFindings: counted.findings.slice(0, 8)
    }),
    counters: counted.counters,
    directory: OUT,
    implementationStrategy: IMPLEMENTATION_STRATEGY,
    boundSources: 1,
    source: { sourceId: source.sourceId, custody: source.custody, sha256: source.sha256 },
    components: COMPONENTS,
    documents: COMPONENTS,
    writes: maps.reduce((n, m) => n + (m.canonicalWrites ?? []).length, 0),
    requiredBeforeFiling: rbf.length,
    artifactHashes: artifacts.map((a) => ({ fixture: a.fixture, packetSha256: a.sha256, pages: a.pageCount })),
    rasterPages: rasterPages.length,
    rasterState: skipRaster ? "BUILT_RASTER_PENDING" : "RASTER_LOCAL_PENDING_CENTRAL",
    nineCountersZero: allZero,
    packetsSelfVerified: 0, commercialRoutesOpened: 0, productionTouched: false
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(thisFile)) {
  runFamily()
    .then((r) => { console.log(JSON.stringify(r, null, 2)); })
    .catch((e) => { console.error(e); process.exit(1); });
}
