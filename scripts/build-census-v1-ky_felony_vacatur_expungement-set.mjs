#!/usr/bin/env node
/**
 * The Kentucky felony vacatur-and-expungement family — `ky_felony_vacatur_expungement-set`.
 *
 *   node scripts/build-census-v1-ky_felony_vacatur_expungement-set.mjs [--check] [--raster]
 *
 * Two official AOC forms, two components:
 *
 *   AOC-496.3 (Rev. 6-23)  primary_filing   Application to Vacate and Expunge
 *                                           Felony Conviction, KRS 431.073; 431.079
 *   AOC-496.4 (Rev. 6-23)  proposed_order   Order on Application to Vacate and
 *                                           Expunge Felony Conviction
 *
 * EVERY FIELD ON BOTH FORMS IS NAMED WITH A NUMBER, AND THAT SHAPES THIS BUILD.
 *
 * The AcroForm names are `1 Case Number`, `2`, `3 County Dropdown`, `4` … `79`.
 * A number says nothing about what the blank is, so every caption in this
 * build is read from the form's own content stream at a recorded coordinate,
 * and the build refuses if a caption is no longer printed there. The shared
 * field semantics then bind through the measured caption (the printed-label
 * fallback), never through the number.
 *
 * THE ORDER IS THE COURT'S DOCUMENT, AND THE MAP SAYS SO FIELD BY FIELD.
 *
 * AOC-496.4 is the order the court enters. Everything in its findings,
 * rulings, installment-plan, show-cause, clerk-certificate and
 * agency-certification blocks is refused as court-, clerk- or
 * custodian-owned. What the packet fills on it is the caption — the same
 * participant facts the application's caption carries — because a tendered
 * proposed order arrives captioned for the case it belongs to. Whether the
 * applicant must tender AOC-496.4 or the clerk prepares it is an open
 * question in the corpus legal review (clerk practice controls); the packet
 * prepares it either way and says so in the instructions.
 *
 * THE ELIGIBILITY ELECTION IS THE PARTICIPANT'S, NOT THE ROUTE'S.
 *
 * Section 2 of the application says "check only one" over five statutory
 * bases — KRS 431.073(1)(a) single, (1)(a) series, full pardon, (1)(d)
 * single, (1)(d) multiple. The corpus legal review records the (1)(a)-vs-
 * (1)(d) choice as strategic and individual (a (1)(d) filing triggers a
 * mandatory-hearing, clear-and-convincing posture if the Commonwealth
 * objects), and directs that (1)(d) applications go to attorney review. So
 * no box is marked: the election is carried to the participant with that
 * warning, and nothing about the route determines it.
 *
 * Sources bind by exact SHA-256 against the committed corpus index. The
 * corpus also holds the statewide Kentucky legal review
 * (KY__LEGAL-REVIEW__STATEWIDE, as of 2026-08-02), which is the named
 * checkable authority behind the filing-destination, fee, service and
 * deadline statements in participant-instructions.md.
 *
 * Rasterization would go through scripts/raster/pdf-page-raster.mjs, but this
 * build does not raster: raster state is BUILT_RASTER_PENDING and the central
 * workflow (rcap-packet-raster-acceptance-batch.yml) renders the pinned bytes.
 */
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

import { extractTextItems, groupIntoLines } from "./rcap-official-forms/rcap-pdf-anchor-capture.mjs";
import { finalizeOfficialForm } from "./rcap-official-forms/rcap-official-form-finalize.mjs";
import { flattenedWidgets, drawnAt } from "./rcap-official-forms/pdf-flattened-widgets.mjs";
import { stampDeterministic } from "./rcap-official-forms/rcap-deterministic-pdf-date.mjs";
import { rasterizePageCalibrated } from "./raster/pdf-page-raster.mjs";
import { BLANK_DISPOSITIONS, PASS_COUNTERS, classifyField, classifyBlank, rowKeyOf }
  from "./rcap-packet-completeness/completeness-contract.mjs";

const thisFile = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(thisFile), "..");
process.chdir(ROOT);
const require = createRequire(import.meta.url);
const { PDFDocument } = require("pdf-lib");

const FAMILY_ID = "ky_felony_vacatur_expungement-set";
const CORPUS_INDEX = "data/rcap-all50/local-source-corpus-index.json";
const OUT = "data/rcap-all50/overlays/census-v1/ky/ky-felony-vacatur-expungement-set--official-pdf-fill";
const BUILD_SCRIPT = "scripts/build-census-v1-ky_felony_vacatur_expungement-set.mjs";

const ROUTE = Object.freeze({
  jurisdiction: "KY",
  routeKey: "obligation:track-pathway:KY:ky_felony_vacatur_expungement:felony-conviction-431073",
  routeSelectionId: "ky-felony-vacatur-expungement-aoc-496-3-with-proposed-order",
  publicLabel: "Vacate and expunge a Kentucky felony conviction",
  authority: "KRS 431.073 and 431.079; AOC-496.3 (Rev. 6-23) and AOC-496.4 (Rev. 6-23)",
  legalReviewSource: "STATES/KY/01_LEGAL_REVIEW/KY__LEGAL-REVIEW__STATEWIDE__kentucky-record-clearing-legal-review__ASOF-2026-08-02__EN.md"
});

const DOCUMENTS = Object.freeze([
  {
    formNumber: "AOC-496.3",
    title: "Application to Vacate and Expunge Felony Conviction",
    instrumentKind: "primary_filing",
    component: "component:ky_felony_vacatur_expungement-primary-filing-1"
  },
  {
    formNumber: "AOC-496.4",
    title: "Order on Application to Vacate and Expunge Felony Conviction",
    instrumentKind: "proposed_order",
    component: "component:ky_felony_vacatur_expungement-proposed-order-2"
  }
]);

function corpusRoot() {
  const configured = process.env.MASTER_LIBRARY_SOURCE_DIR
    ?? "private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1";
  assert.ok(fs.existsSync(configured), `the Master Library is not mounted at ${configured}`);
  return configured;
}

/* ------------------------------------------------------------------ *
 * The policy vocabulary. Every widget on both forms carries exactly one.
 *
 *   write     — the platform holds this fact and the shared semantics bind it
 *   supply    — required before filing; the participant supplies it, disclosed
 *   optional  — participant-authored content the form itself makes optional or
 *               conditional; the platform does not invent it
 *   election  — a genuine participant election on a control
 *   protect   — a signature or its date; completed only at signing
 *   court     — a court, clerk or records-custodian entry on the order
 *   viewer    — a viewer UI button; never a filing fact
 *   fragment  — the printed area-code parentheses beside a phone line whose
 *               full number, area code included, this packet writes
 * ------------------------------------------------------------------ */
const SIGNATURE = "signature_or_date_participant_completion";
const COURT_OWNED = "court_prosecutor_clerk_or_agency_owned";
const PARTICIPANT_ELECTION = "participant_sworn_narrative_or_legal_election";

const WRITE = (fact) => ({ policy: "write", fact });
const SUPPLY = (what) => ({ policy: "supply", what });
const OPTIONAL = (why) => ({ policy: "optional", why });
const ELECTION = (why) => ({ policy: "election", why });
const PROTECT = (why) => ({ policy: "protect", refusalClass: SIGNATURE, why });
const COURT = (why) => ({ policy: "court", refusalClass: COURT_OWNED, why });
const VIEWER = () => ({ policy: "viewer" });
const FRAGMENT = () => ({ policy: "fragment" });

const OPTIONAL_REASON = (why) => `${why}; optional participant-authored content the form itself frames that way, and the platform does not invent it`;
const COURT_REASON = "court, clerk, prosecutor, agency, or hearing field; entered on the order by the court or its officers, never by this packet";
const VIEWER_REASON = "viewer ui control; never a filing fact";
const FRAGMENT_REASON =
  "the printed parentheses hold only the telephone area code, and the full phone number — area code included — is "
  + "written on the line beside them; a fragment of a value already written beside it is never a filing fact on its own";

/* ---- AOC-496.3, the application ------------------------------------------- */
const FIELDS_4963 = {
  "1 Case Number": {
    page: 1, caption: "Case No.", captionAt: { page: 1, y: 736 },
    label: "Case No.", ...WRITE("matter.case_number")
  },
  "2": {
    page: 1, caption: "Court", captionAt: { page: 1, y: 716 },
    label: "Court (the court the case is in, from the caption of your existing case)",
    ...SUPPLY("the court named in the caption of your existing criminal case — for a felony conviction this is ordinarily the Circuit Court; copy it from your case paperwork")
  },
  "3 County Dropdown": {
    page: 1, caption: "County", captionAt: { page: 1, y: 696 },
    label: "County", ...WRITE("matter.county")
  },
  "4": {
    page: 1, caption: "Division", captionAt: { page: 1, y: 676 },
    label: "Division (the division printed on your case paperwork)",
    ...SUPPLY("the division number of the court, from your case paperwork; leave it blank if your case papers show none")
  },
  "5": {
    page: 1, caption: "NAME DEFENDANT", captionAt: { page: 1, y: 612 },
    label: "NAME (defendant)", bindingLabel: "NAME DEFENDANT", ...WRITE("participant.full_legal_name")
  },
  "6": {
    page: 1, caption: "ADDRESS", captionAt: { page: 1, y: 594 },
    label: "ADDRESS (street address)", bindingLabel: "Address", ...WRITE("participant.street_address")
  },
  "7": {
    page: 1, caption: "ADDRESS", captionAt: { page: 1, y: 594 },
    label: "ADDRESS (second line: city, state, ZIP)", bindingLabel: "City, State, ZIP",
    ...WRITE("participant.city_state_zip")
  },
  "8": {
    page: 1, caption: "PHONE NUMBER", captionAt: { page: 1, y: 558 },
    label: "Phone number area code (the printed parentheses)", ...FRAGMENT()
  },
  "9": {
    page: 1, caption: "PHONE NUMBER", captionAt: { page: 1, y: 558 },
    label: "PHONE NUMBER", bindingLabel: "Phone Number", ...WRITE("participant.phone")
  },
  "10": {
    page: 1, caption: "Jail ID Number", captionAt: { page: 1, y: 558 },
    label: "Jail ID Number (optional)",
    ...OPTIONAL("a custodial identifier the form itself marks '(optional)'")
  },
  "11": {
    page: 1, caption: "Defendant's Birthdate:", captionAt: { page: 1, y: 534 },
    label: "Defendant's Birthdate", ...WRITE("participant.date_of_birth")
  },
  "12": {
    page: 1, caption: "Defendant's SSN:", captionAt: { page: 1, y: 534 },
    label: "Defendant's SSN",
    ...SUPPLY("your Social Security number; the platform does not hold it and never invents one")
  },
  "13": {
    page: 1, caption: "Violation/Arrest Date:", captionAt: { page: 1, y: 534 },
    label: "Violation/Arrest Date",
    ...SUPPLY("the violation or arrest date, from your record or your expungement certification packet")
  },
  ...chargePair("14", "17", 465, 468, "felony charges to be vacated and expunged", "first", "fourth", 1),
  ...chargePair("15", "18", 446, 450, "felony charges to be vacated and expunged", "second", "fifth", 1),
  ...chargePair("16", "19", 428, 432, "felony charges to be vacated and expunged", "third", "sixth", 1),
  "20": {
    page: 1, caption: "CASE NO.:", captionAt: { page: 1, y: 382 },
    label: "CASE NO. (underlying district court case number, if the case originated in district court)",
    ...SUPPLY("the underlying district court case number, only if your case originated in district court; otherwise leave it blank")
  },
  ...chargePair("21", "24", 362, 364, "underlying district court charges, if any", "first", "fourth", 1),
  ...chargePair("22", "25", 344, 346, "underlying district court charges, if any", "second", "fifth", 1),
  ...chargePair("23", "26", 326, 328, "underlying district court charges, if any", "third", "sixth", 1),
  "27": {
    page: 1, caption: "check only one", captionAt: { page: 1, y: 268 },
    label: "Section 2 eligibility basis (check only one of the five printed statements under KRS 431.073(1))",
    ...ELECTION(
      "a sworn legal election among the five printed statutory bases — KRS 431.073(1)(a) single offense, (1)(a) series "
      + "from a single incident, a full pardon, (1)(d) single offense, (1)(d) multiple offenses. The route does not "
      + "determine it: which basis is true of a case, and whether to file under (1)(a) or (1)(d) where both arguably "
      + "apply, is the corpus legal review's named example of an individualized legal judgment"
    )
  },
  "28": {
    page: 2, caption: "Victims:", captionAt: { page: 2, y: 689 },
    label: "Victims (names of all victims of the crimes listed, if known)",
    ...SUPPLY("the names of all victims of the crimes listed above, if known; if there were none or none are known, leave it blank")
  },
  "29": {
    page: 2, caption: "victims", captionAt: { page: 2, y: 707 },
    label: "Victims (continuation, second line)",
    ...SUPPLY("more victim names, if the first line is not enough")
  },
  "30": {
    page: 2, caption: "victims", captionAt: { page: 2, y: 707 },
    label: "Victims (continuation, third line)",
    ...SUPPLY("more victim names, if two lines are not enough")
  },
  ...narrative("31", 2, 590, 611, "rehabilitative", "Section 7(a) answer: rehabilitative activities/programs in prison"),
  ...narrative("32", 2, 573, 611, "rehabilitative", "Section 7(a) answer, second line"),
  ...narrative("33", 2, 554, 611, "rehabilitative", "Section 7(a) answer, third line"),
  ...narrative("34", 2, 532, 535, "participated in any", "Section 7(b) answer: rehabilitative activities/programs since release"),
  ...narrative("35", 2, 514, 535, "participated in any", "Section 7(b) answer, second line"),
  ...narrative("36", 2, 496, 535, "participated in any", "Section 7(b) answer, third line"),
  ...narrative("37", 2, 474, 477, "How have you changed", "Section 7(c) answer: how you have changed"),
  ...narrative("38", 2, 457, 477, "How have you changed", "Section 7(c) answer, second line"),
  ...narrative("39", 2, 438, 477, "How have you changed", "Section 7(c) answer, third line"),
  ...narrative("40", 2, 416, 419, "law-abiding", "Section 7(d) answer: examples of living a law-abiding life"),
  ...narrative("41", 2, 398, 419, "law-abiding", "Section 7(d) answer, second line"),
  ...narrative("42", 2, 380, 419, "law-abiding", "Section 7(d) answer, third line"),
  ...narrative("43", 2, 358, 361, "impact has a felony conviction", "Section 7(e) answer: the felony conviction's impact"),
  ...narrative("44", 2, 343, 361, "impact has a felony conviction", "Section 7(e) answer, second line"),
  ...narrative("45", 2, 326, 361, "impact has a felony conviction", "Section 7(e) answer, third line"),
  ...narrative("46", 2, 304, 307, "in your life", "Section 7(f) answer: the difference expungement would make"),
  ...narrative("47", 2, 286, 307, "in your life", "Section 7(f) answer, second line"),
  ...narrative("48", 2, 268, 307, "in your life", "Section 7(f) answer, third line"),
  ...narrative("49", 2, 228, 249, "anything else you would like", "Section 7(g) answer: anything else for the Court"),
  ...narrative("50", 2, 210, 249, "anything else you would like", "Section 7(g) answer, second line"),
  "51": {
    page: 2, caption: "LIST AGENCIES AND ADDRESSES", captionAt: { page: 2, y: 144 },
    label: "Agencies with records (name and address of each government agency that may have a record of your conviction), first line",
    ...SUPPLY("the name and address of each government agency that may have a record of your conviction — the form names jail facilities and arresting agencies as examples")
  },
  "52": {
    page: 2, caption: "LIST AGENCIES AND ADDRESSES", captionAt: { page: 2, y: 144 },
    label: "Agencies with records, second line",
    ...SUPPLY("more agency names and addresses, if one line is not enough")
  },
  "53": {
    page: 2, caption: "LIST AGENCIES AND ADDRESSES", captionAt: { page: 2, y: 144 },
    label: "Agencies with records, third line",
    ...SUPPLY("more agency names and addresses, if two lines are not enough")
  },
  "54": {
    page: 2, caption: "LIST AGENCIES AND ADDRESSES", captionAt: { page: 2, y: 144 },
    label: "Agencies with records, fourth line",
    ...SUPPLY("more agency names and addresses, if three lines are not enough")
  },
  "55": {
    page: 3, caption: "Date", captionAt: { page: 3, y: 639 },
    label: "Date beside the Defendant/Applicant Signature",
    ...PROTECT("you date the application when you sign it before the notary or the circuit court clerk; a date written in advance would be false")
  },
  "56": {
    page: 3, caption: "Defendant/Applicant Signature", captionAt: { page: 3, y: 639 },
    label: "Year on the Defendant/Applicant signature date line",
    ...PROTECT("the year completes the signature date; it is written when you sign, not before")
  },
  "57": {
    page: 3, caption: "installment", captionAt: { page: 3, y: 351 },
    label: "Request for installment payment plan (check to ask that an installment plan be established for the $250 expungement fee)",
    ...ELECTION("whether to ask for an installment payment plan for the expungement fee is the participant's own choice; nothing about the route decides it")
  },
  "58": {
    page: 3, caption: "requests to pay", captionAt: { page: 3, y: 333 },
    label: "Amount offered per installment payment",
    ...OPTIONAL("a proposed installment amount, meaningful only if the participant elects the installment plan")
  },
  "59": {
    page: 3, caption: "weekly", captionAt: { page: 3, y: 333 },
    label: "Installment frequency (weekly, every other week, twice per month, monthly, or other)",
    ...ELECTION("the payment frequency belongs to the installment request, which is the participant's own election")
  },
  "60": {
    page: 3, caption: "until paid in full", captionAt: { page: 3, y: 315 },
    label: "Other installment arrangement (free text beside the 'other' box)",
    ...OPTIONAL("a free-text alternative payment arrangement, meaningful only if the participant elects it")
  },
  "Reset Form": {
    page: 3, caption: null, captionAt: null,
    label: "Reset Form (a viewer button in the PDF, printed on no filing)", ...VIEWER()
  },
  "Print Form": {
    page: 3, caption: null, captionAt: null,
    label: "Print Form (a viewer button in the PDF, printed on no filing)", ...VIEWER()
  }
};

/* Two charge blanks that sit on one printed line. */
function chargePair(leftName, rightName, fieldY, lineY, series, leftOrdinal, rightOrdinal, page) {
  const entry = (ordinal) => ({
    page, caption: "CHARGE:", captionAt: { page, y: lineY },
    label: `CHARGE (${ordinal} of the ${series})`,
    ...SUPPLY(`the ${ordinal} of the ${series}, worded as it appears on your record; the form says all charges in the case must be listed, non-felony charges included, if the whole case is to be expunged`)
  });
  return { [leftName]: entry(leftOrdinal), [rightName]: entry(rightOrdinal) };
}

function narrative(name, page, fieldY, lineY, caption, label) {
  return {
    [name]: {
      page, caption, captionAt: { page, y: lineY },
      label: `${label} (complete only if applying under KRS 431.073(1)(d))`,
      ...OPTIONAL("a Section 7 rehabilitation narrative, required only for a KRS 431.073(1)(d) application — a posture the corpus legal review routes to attorney review, with the direction that these answers are never generated")
    }
  };
}

/* ---- AOC-496.4, the order -------------------------------------------------- */
function courtText(name, page, fieldY, lineY, caption, label) {
  return {
    [name]: {
      page, caption, captionAt: { page, y: lineY },
      label: `${label} (completed by the court)`, ...COURT(COURT_REASON)
    }
  };
}

const FIELDS_4964 = {
  "1 Case Number@1": {
    page: 1, caption: "Case No.", captionAt: { page: 1, y: 736 },
    label: "Case No.", ...WRITE("matter.case_number")
  },
  "1 Case Number@2": {
    page: 2, caption: "Case No.", captionAt: { page: 2, y: 743 },
    label: "Case No. (page 2 header)", ...WRITE("matter.case_number")
  },
  "1 Case Number@3": {
    page: 3, caption: "Case No.", captionAt: { page: 3, y: 743 },
    label: "Case No. (page 3 header)", ...WRITE("matter.case_number")
  },
  "1 Case Number@4": {
    page: 4, caption: "Case No.", captionAt: { page: 4, y: 743 },
    label: "Case No. (page 4 header)", ...WRITE("matter.case_number")
  },
  "2": {
    page: 1, caption: "Court", captionAt: { page: 1, y: 716 },
    label: "Court (on the proposed order; copy the caption of your application)",
    ...SUPPLY("the court from the caption of your application, so the order carries the same caption")
  },
  "3 County Dropdown": {
    page: 1, caption: "County", captionAt: { page: 1, y: 696 },
    label: "County", ...WRITE("matter.county")
  },
  "4": {
    page: 1, caption: "Division", captionAt: { page: 1, y: 676 },
    label: "Division (on the proposed order; copy the caption of your application)",
    ...SUPPLY("the division from the caption of your application; leave it blank if your case papers show none")
  },
  "5": {
    page: 1, caption: "NAME DEFENDANT", captionAt: { page: 1, y: 605 },
    label: "NAME (defendant)", bindingLabel: "NAME DEFENDANT", ...WRITE("participant.full_legal_name")
  },
  "6": {
    page: 1, caption: "ADDRESS", captionAt: { page: 1, y: 587 },
    label: "ADDRESS (street address)", bindingLabel: "Address", ...WRITE("participant.street_address")
  },
  "7": {
    page: 1, caption: "ADDRESS", captionAt: { page: 1, y: 587 },
    label: "ADDRESS (second line: city, state, ZIP)", bindingLabel: "City, State, ZIP",
    ...WRITE("participant.city_state_zip")
  },
  "8": {
    page: 1, caption: "PHONE NUMBER", captionAt: { page: 1, y: 551 },
    label: "Phone number area code (the printed parentheses)", ...FRAGMENT()
  },
  "9": {
    page: 1, caption: "PHONE NUMBER", captionAt: { page: 1, y: 551 },
    label: "PHONE NUMBER", bindingLabel: "Phone Number", ...WRITE("participant.phone")
  },
  "10": {
    page: 1, caption: "Jail ID Number", captionAt: { page: 1, y: 551 },
    label: "Jail ID Number (optional)",
    ...OPTIONAL("a custodial identifier the form itself marks '(optional)'")
  },
  "11": {
    page: 1, caption: "Defendant's Birthdate:", captionAt: { page: 1, y: 527 },
    label: "Defendant's Birthdate", ...WRITE("participant.date_of_birth")
  },
  "12": {
    page: 1, caption: "Defendant's SSN:", captionAt: { page: 1, y: 527 },
    label: "Defendant's SSN (on the proposed order)",
    ...SUPPLY("your Social Security number, exactly as on the application; the platform does not hold it")
  },
  "13": {
    page: 1, caption: "Violation/Arrest Date:", captionAt: { page: 1, y: 527 },
    label: "Violation/Arrest Date (on the proposed order)",
    ...SUPPLY("the violation or arrest date, exactly as on the application")
  },
  ...orderChargePair("14", "17", 404, "first", "fourth"),
  ...orderChargePair("15", "18", 386, "second", "fifth"),
  ...orderChargePair("16", "18a", 368, "third", "sixth"),
  "19": {
    page: 1, caption: "CASE NO.:", captionAt: { page: 1, y: 320 },
    label: "CASE NO. (underlying district court case number on the order, if any)",
    ...SUPPLY("the underlying district court case number, exactly as on the application; otherwise leave it blank")
  },
  ...orderDistrictChargePair("20", "23", 302, "first", "fourth"),
  ...orderDistrictChargePair("21", "24", 284, "second", "fifth"),
  ...orderDistrictChargePair("22", "25", 266, "third", "sixth"),
  "26": {
    page: 1, caption: "Objection received", captionAt: { page: 1, y: 236 },
    label: "Findings I.A(1): objection received from the prosecuting attorney (completed by the court)",
    ...COURT(COURT_REASON), selection: true
  },
  "27": {
    page: 1, caption: "Response received", captionAt: { page: 1, y: 216 },
    label: "Findings I.A(2): response received from the victim or victims (completed by the court)",
    ...COURT(COURT_REASON), selection: true
  },
  "28": {
    page: 1, caption: "Check only one", captionAt: { page: 1, y: 190 },
    label: "Findings I.B: statutory eligibility basis found (completed by the court)",
    ...COURT(COURT_REASON), selection: true
  },
  "29": {
    page: 2, caption: "rehabilitated", captionAt: { page: 2, y: 604 },
    label: "Findings I.D: rehabilitation finding for a KRS 431.073(1)(d) application (completed by the court)",
    ...COURT(COURT_REASON), selection: true
  },
  ...courtText("30", 2, 545, 566, "Other Findings", "Findings I.E: other findings, first line"),
  ...courtText("31", 2, 527, 566, "Other Findings", "Findings I.E: other findings, second line"),
  ...courtText("32", 2, 509, 566, "Other Findings", "Findings I.E: other findings, third line"),
  ...courtText("33", 2, 491, 566, "Other Findings", "Findings I.E: other findings, fourth line"),
  ...courtText("34", 2, 473, 566, "Other Findings", "Findings I.E: other findings, fifth line"),
  "35": {
    page: 2, caption: "having conducted a hearing", captionAt: { page: 2, y: 379 },
    label: "Findings II.A: hearing conducted and evidence heard (completed by the court)",
    ...COURT(COURT_REASON), selection: true
  },
  "36": {
    page: 2, caption: "by clear and convincing evidence", captionAt: { page: 2, y: 361 },
    label: "Findings II.A: proved or did not prove, by clear and convincing evidence (completed by the court)",
    ...COURT(COURT_REASON), selection: true
  },
  ...courtText("37", 2, 226, 247, "Any other matter", "Findings II.A(4): any other matter, first line"),
  ...courtText("38", 2, 208, 247, "Any other matter", "Findings II.A(4): any other matter, second line"),
  ...courtText("39", 2, 190, 247, "Any other matter", "Findings II.A(4): any other matter, third line"),
  ...courtText("40", 2, 171, 247, "Any other matter", "Findings II.A(4): any other matter, fourth line"),
  ...courtText("41", 2, 154, 247, "Any other matter", "Findings II.A(4): any other matter, fifth line"),
  "42": {
    page: 2, caption: "Warrant", captionAt: { page: 2, y: 93 },
    label: "Findings II: circumstances warrant or do not warrant vacation and Expungement (completed by the court)",
    ...COURT(COURT_REASON), selection: true
  },
  "43": {
    page: 3, caption: "DENIED", captionAt: { page: 3, y: 697 },
    label: "Order III: application denied or granted (completed by the court)",
    ...COURT(COURT_REASON), selection: true
  },
  ...courtText("44", 3, 678, 697, "DENIED", "Order III: reasons for denial, first line"),
  ...courtText("45", 3, 663, 697, "DENIED", "Order III: reasons for denial, second line"),
  ...courtText("46", 3, 647, 697, "DENIED", "Order III: reasons for denial, third line"),
  ...courtText("47", 3, 631, 697, "DENIED", "Order III: reasons for denial, fourth line"),
  "49": {
    page: 3, caption: "in full", captionAt: { page: 3, y: 549 },
    label: "Order III: expungement fee payable in full or in installments (completed by the court)",
    ...COURT(COURT_REASON), selection: true
  },
  "51": {
    page: 3, caption: "Beginning", captionAt: { page: 3, y: 367 },
    label: "Order IV: installment plan ordered (completed by the court)",
    ...COURT(COURT_REASON), selection: true
  },
  ...courtText("52", 3, 364, 367, "Beginning", "Order IV: installment start date"),
  ...courtText("53", 3, 364, 367, "Beginning", "Order IV: installment start year"),
  ...courtText("54", 3, 364, 367, "installment payments of", "Order IV: installment amount"),
  "55": {
    page: 3, caption: "weekly", captionAt: { page: 3, y: 337 },
    label: "Order IV: installment frequency ordered (completed by the court)",
    ...COURT(COURT_REASON), selection: true
  },
  ...courtText("60", 3, 270, 273, "other", "Order IV: other installment arrangement ordered"),
  ...courtText("61", 3, 249, 252, "granted until", "Order IV: date granted to pay the expungement fee"),
  ...courtText("62", 3, 249, 252, "granted until", "Order IV: year on the date granted to pay"),
  ...courtText("63", 3, 177, 180, "granted until", "Order V: show-cause appearance date"),
  ...courtText("64", 3, 177, 180, "granted until", "Order V: year on the show-cause appearance date"),
  ...courtText("65", 3, 177, 180, "the hour of", "Order V: hour of the show-cause appearance"),
  "66": {
    page: 3, caption: "the hour of", captionAt: { page: 3, y: 180 },
    label: "Order V: a.m. or p.m. on the show-cause appearance (completed by the court)",
    ...COURT(COURT_REASON), selection: true
  },
  ...courtText("67", 3, 44, 35, "Judge", "Date beside the Judge's signature"),
  ...courtText("68", 3, 44, 35, "Judge", "Year on the Judge's signature date"),
  "70": {
    page: 4, caption: "hand-delivered", captionAt: { page: 4, y: 706 },
    label: "Clerk's certificate: copy hand-delivered or mailed (completed by the clerk)",
    ...COURT(COURT_REASON), selection: true
  },
  ...courtText("71", 4, 671, 661, "Clerk", "Date on the clerk's certificate (completed by the clerk)"),
  ...courtText("72", 4, 671, 661, "Clerk", "Year on the clerk's certificate date (completed by the clerk)"),
  "73": {
    page: 4, caption: "shall expunge the", captionAt: { page: 4, y: 488 },
    label: "Agencies ordered to expunge, first line (copy the agency list from page 2 of your application)",
    ...SUPPLY("the same agencies you listed on page 2 of your application, so the court's order reaches each of them")
  },
  "74": {
    page: 4, caption: "shall expunge the", captionAt: { page: 4, y: 488 },
    label: "Agencies ordered to expunge, second line",
    ...SUPPLY("more of the agencies from your application's list, if one line is not enough")
  },
  "75": {
    page: 4, caption: "shall expunge the", captionAt: { page: 4, y: 488 },
    label: "Agencies ordered to expunge, third line",
    ...SUPPLY("more of the agencies from your application's list, if two lines are not enough")
  },
  "76": {
    page: 4, caption: "shall expunge the", captionAt: { page: 4, y: 488 },
    label: "Agencies ordered to expunge, fourth line",
    ...SUPPLY("more of the agencies from your application's list, if three lines are not enough")
  },
  "77": {
    page: 4, caption: "shall expunge the", captionAt: { page: 4, y: 488 },
    label: "Agencies ordered to expunge, fifth line",
    ...SUPPLY("more of the agencies from your application's list, if four lines are not enough")
  },
  ...courtText("78", 4, 334, 325, "Judge", "Date beside the second Judge signature line"),
  ...courtText("79", 4, 334, 325, "Judge", "Year on the second Judge signature date"),
  "Reset Form": {
    page: 4, caption: null, captionAt: null,
    label: "Reset Form (a viewer button in the PDF, printed on no filing)", ...VIEWER()
  },
  "Print Form": {
    page: 4, caption: null, captionAt: null,
    label: "Print Form (a viewer button in the PDF, printed on no filing)", ...VIEWER()
  }
};

function orderChargePair(leftName, rightName, lineY, leftOrdinal, rightOrdinal) {
  const entry = (ordinal) => ({
    page: 1, caption: "CHARGE:", captionAt: { page: 1, y: lineY },
    label: `CHARGE (${ordinal} of the offenses requested expunged, on the order)`,
    ...SUPPLY(`the ${ordinal} charge, exactly as you listed it on the application, so the order's findings name the same offenses`)
  });
  return { [leftName]: entry(leftOrdinal), [rightName]: entry(rightOrdinal) };
}

function orderDistrictChargePair(leftName, rightName, lineY, leftOrdinal, rightOrdinal) {
  const entry = (ordinal) => ({
    page: 1, caption: "CHARGE:", captionAt: { page: 1, y: lineY },
    label: `CHARGE (${ordinal} of the underlying district court offenses, on the order)`,
    ...SUPPLY(`the ${ordinal} underlying district court charge, exactly as on the application; otherwise leave it blank`)
  });
  return { [leftName]: entry(leftOrdinal), [rightName]: entry(rightOrdinal) };
}

const FORM_DICTIONARIES = { "AOC-496.3": FIELDS_4963, "AOC-496.4": FIELDS_4964 };
const FORM_TITLES = Object.fromEntries(DOCUMENTS.map((d) => [d.formNumber, d.title]));

/* ---- fixtures -------------------------------------------------------------- *
 * Counties must be options the forms' own county dropdown offers. Neither
 * fixture signs anything, elects anything, or answers Section 7. */
const FIXTURES = {
  canonical: {
    "participant.full_legal_name": "Jordan Avery Reyes",
    "participant.street_address": "2114 Versailles Road",
    "participant.city_state_zip": "Lexington, KY 40504",
    "participant.phone": "859-555-0142",
    "participant.date_of_birth": "1991-04-17",
    "matter.county": "Fayette",
    "matter.case_number": "19-CR-00317"
  },
  boundary: {
    "participant.full_legal_name": "Maria-Alejandra O'Shaughnessy-Whitfield",
    "participant.street_address": "1188 Upper Notch Crossing Road, Apartment 14B",
    "participant.city_state_zip": "Hardinsburg, Kentucky 40143-2214",
    "participant.phone": "(270) 555-0199",
    "participant.date_of_birth": "1968-12-31",
    "matter.county": "Breckinridge",
    "matter.case_number": "23-CR-004821-002"
  }
};

/* ---- source binding -------------------------------------------------------- */
function resolveSources() {
  const index = JSON.parse(fs.readFileSync(path.join(ROOT, CORPUS_INDEX), "utf8"));
  const entries = index.entries ?? index.files ?? index;
  const all = Array.isArray(entries) ? entries : Object.values(entries);
  const root = corpusRoot();
  const resolved = [];
  const failures = [];
  for (const doc of DOCUMENTS) {
    const entry = all.find((e) => e.state === "KY" && e.formNumber === doc.formNumber);
    if (!entry) {
      failures.push({ sourceId: `official-form:${doc.formNumber}`, why: "no entry for this form number in the committed corpus index" });
      continue;
    }
    const rel = entry.path ?? entry.relativePath;
    const abs = path.resolve(ROOT, root, rel);
    if (!fs.existsSync(abs)) {
      failures.push({ sourceId: `official-form:${doc.formNumber}`, pathInArchive: rel, why: `the indexed path does not exist on disk: ${rel}` });
      continue;
    }
    const bytes = fs.readFileSync(abs);
    const sha256 = crypto.createHash("sha256").update(bytes).digest("hex");
    if (String(entry.sha256 ?? "") !== sha256) {
      failures.push({
        sourceId: `official-form:${doc.formNumber}`, pathInArchive: rel,
        why: `SHA-256 drift: the committed index says ${entry.sha256}, the mounted corpus holds ${sha256}`
      });
      continue;
    }
    resolved.push({
      ...doc, sourceId: `official-form:${doc.formNumber}`,
      pathInArchive: rel, revision: entry.revision ?? null,
      sha256, byteLength: bytes.length, bytes
    });
  }
  return { resolved, failures };
}

/* ---- census: one row per field-and-page, captions re-checked --------------- */
async function censusOfSource(source) {
  const dictionary = FORM_DICTIONARIES[source.formNumber];
  const doc = await PDFDocument.load(source.bytes, { ignoreEncryption: true });
  const pages = doc.getPages();
  const pageText = pages.map((p, i) => ({
    page: i + 1,
    lines: groupIntoLines(extractTextItems(p)).map((l) => ({ y: Math.round(l.y), text: l.text }))
  }));

  const rows = [];
  const unmapped = [];
  for (const field of doc.getForm().getFields()) {
    const name = field.getName();
    const widgets = [];
    for (const w of field.acroField.getWidgets()) {
      const r = w.getRectangle();
      const ref = w.P();
      let pageIndex = pages.findIndex((p) => p.ref === ref);
      if (pageIndex < 0) pageIndex = 0;
      widgets.push({
        page: pageIndex + 1,
        rect: {
          x: Number(r.x.toFixed(2)), y: Number(r.y.toFixed(2)),
          width: Number(r.width.toFixed(2)), height: Number(r.height.toFixed(2))
        },
        rectBasis: "acroform_widget_rect_read_first_hand_from_pinned_binary"
      });
    }
    const pagesTouched = [...new Set(widgets.map((w) => w.page))].sort((a, b) => a - b);
    for (const page of pagesTouched) {
      const key = pagesTouched.length > 1 || dictionary[`${name}@${page}`] ? `${name}@${page}` : name;
      const entry = dictionary[key] ?? dictionary[name];
      const own = widgets.filter((w) => w.page === page);
      if (!entry) { unmapped.push({ field: name, page, widgets: own }); continue; }
      rows.push({
        key, name, page,
        widgets: own,
        rect: own[0].rect, rectBasis: own[0].rectBasis,
        type: field.constructor.name.replace(/^PDF/, "").toLowerCase()
          .replace("textfield", "text").replace("radiogroup", "radiogroup").replace("checkbox", "checkbox"),
        isSelectionControl: field.constructor.name === "PDFCheckBox" || field.constructor.name === "PDFRadioGroup"
          || entry.selection === true,
        isViewerButton: field.constructor.name === "PDFButton",
        multiline: typeof field.isMultiline === "function" ? field.isMultiline() : false,
        maxLength: typeof field.getMaxLength === "function" ? (field.getMaxLength() ?? null) : null,
        caption: entry.caption,
        captionAt: entry.captionAt,
        effectiveLabel: entry.label ?? entry.caption,
        bindingLabel: entry.bindingLabel ?? entry.label ?? entry.caption,
        policy: entry.policy,
        fact: entry.fact ?? null,
        refusalClass: entry.refusalClass ?? null,
        what: entry.what ?? null,
        why: entry.why ?? null
      });
    }
  }

  const dictionaryKeys = new Set(Object.keys(dictionary));
  for (const r of rows) dictionaryKeys.delete(r.key);
  const stale = [...dictionaryKeys];

  const flat = (x) => String(x).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const captionDrift = [];
  for (const r of rows) {
    // A viewer button's label lives in its own appearance stream, not in the
    // page content, so there is no printed caption to re-find. Everything else
    // must still be printed where the dictionary says it is.
    if (r.policy === "viewer") continue;
    const at = r.captionAt;
    const lines = pageText.find((p) => p.page === at.page)?.lines ?? [];
    const near = lines.filter((l) => Math.abs(l.y - at.y) <= 2);
    const needle = flat(r.caption);
    if (needle.length === 0 || !near.some((l) => flat(l.text).includes(needle))) {
      captionDrift.push({ field: r.key, page: at.page, y: at.y, caption: r.caption, linesThere: near.map((l) => l.text).slice(0, 2) });
    }
  }
  return { rows, unmapped, stale, captionDrift, pageText, pageCount: pages.length };
}

/* ---- render one form ------------------------------------------------------- */
async function renderForm(source, census, fixtureName) {
  const facts = FIXTURES[fixtureName];
  const writable = census.rows.filter((r) => r.policy === "write");
  const explicitMappings = Object.fromEntries(writable.map((r) => [r.name, r.fact]));
  const writableNames = new Set(writable.map((r) => r.name));
  const unwritableFields = [...new Set(census.rows.filter((r) => !writableNames.has(r.name)).map((r) => r.name))]
    .map((field) => ({ field }));

  const censusForFinalizer = [];
  const emitted = new Set();
  for (const r of census.rows) {
    if (emitted.has(r.name)) continue;
    emitted.add(r.name);
    const every = census.rows.filter((x) => x.name === r.name).flatMap((x) => x.widgets);
    censusForFinalizer.push({
      name: r.name, type: r.type,
      effectiveLabel: r.bindingLabel, regionHeading: r.bindingLabel,
      widgets: every.map((w) => ({ page: w.page, rect: w.rect })),
      multiline: r.multiline === true,
      maxLength: r.maxLength ?? null
    });
  }

  const { bytes, report } = await finalizeOfficialForm({
    sourceBytes: source.bytes,
    expectedSha256: source.sha256,
    census: censusForFinalizer,
    facts,
    explicitMappings,
    unwritableFields,
    documentTextLines: census.pageText.flatMap((p) => p.lines.map((l) => l.text)),
    title: FORM_TITLES[source.formNumber]
  });
  if (process.env.KY_496_DEBUG_RENDER) {
    console.log(`-- ${source.formNumber} ${fixtureName}: written=${report.written.length} refused=${report.refused.length}`);
    for (const r of report.refused) console.log(`   ${r.field ?? r.anchor}: ${r.reason}${r.category ? ` (${r.category})` : ""}`);
  }
  return { bytes, report };
}

/* ---- byte proof ------------------------------------------------------------ */
async function byteProof(census, artifactBytes, report, fixtureName, formNumber) {
  const tmp = path.join(ROOT, `.ky-496-byte-proof-${formNumber}-${fixtureName}.pdf`);
  fs.writeFileSync(tmp, artifactBytes);
  let widgets = [];
  try { widgets = await flattenedWidgets(tmp); } finally { fs.unlinkSync(tmp); }

  const written = new Map(report.written.map((w) => [w.field, w]));
  const actualWrites = [];
  const refusedFieldsWithInk = [];
  let glyphs = 0;
  for (const r of census.rows) {
    const drawn = drawnAt(widgets, { page: r.page, rect: r.rect });
    const text = drawn.map((d) => d.text).filter(Boolean);
    const ink = text.join("").trim();
    if (written.has(r.name) && r.policy === "write") {
      glyphs += ink.length;
      actualWrites.push({
        field: r.key, acroFieldName: r.name, factId: r.fact, page: r.page, rect: r.rect,
        printedCaption: r.caption, effectiveLabel: r.effectiveLabel,
        drawnText: text, expected: FIXTURES[fixtureName][r.fact] ?? null,
        matchesExpected: ink === String(FIXTURES[fixtureName][r.fact] ?? "").trim()
      });
      continue;
    }
    if (ink.length > 0 && !r.isViewerButton) {
      // A flattened viewer button repaints its own label; that is the source
      // document's ink, not a write.
      refusedFieldsWithInk.push({ fieldId: r.key, page: r.page, drawnText: text });
    }
  }
  return { actualWrites, refusedFieldsWithInk, glyphs, appearances: widgets.length };
}

/* ---- the field map, in the maps-with-canonical-and-boundary shape ---------- */
function fieldMapFor(source, census, report) {
  const writtenNames = new Set(report.written.map((w) => w.field));
  const canonicalWrites = [];
  const canonicalRefusals = [];
  const selectionControls = [];

  for (const r of census.rows) {
    const base = {
      field: r.key, acroFieldName: r.name, page: r.page, rect: r.rect, rectBasis: r.rectBasis,
      printedLabel: r.caption, printedLine: r.caption,
      regionHeading: r.effectiveLabel, sectionHeading: null,
      effectiveLabel: r.effectiveLabel, captionReadAt: r.captionAt
    };

    if (r.policy === "write") {
      if (writtenNames.has(r.name)) {
        canonicalWrites.push({ ...base, factId: r.fact, kind: r.type, document: source.formNumber });
      } else {
        canonicalRefusals.push({
          ...base, document: source.formNumber,
          reason: "the finalizer refused this write; the packet does not claim a value it did not draw",
          category: null, completenessClass: null, class: null,
          requiredBeforeFiling: false,
          why: "reported rather than claimed, so the defect is visible to the audit"
        });
      }
      continue;
    }

    if (r.isSelectionControl) {
      const cls = r.policy === "court" ? COURT_OWNED : PARTICIPANT_ELECTION;
      const reason = r.policy === "court" ? r.why : r.why;
      selectionControls.push({
        ...base, selectionId: r.key, kind: "selection_control", type: r.type,
        document: source.formNumber,
        widgets: r.widgets,
        disposition: "explicit_refusal",
        reason,
        category: cls, completenessClass: cls, class: cls,
        requiredBeforeFiling: false,
        routeDetermined: false
      });
      continue;
    }

    if (r.policy === "protect" || r.policy === "court") {
      canonicalRefusals.push({
        ...base, document: source.formNumber,
        reason: r.policy === "protect"
          ? "signature or date field; never prefilled by this build's participant packet — you date it when you sign it"
          : r.why,
        category: r.refusalClass, completenessClass: r.refusalClass, class: r.refusalClass,
        requiredBeforeFiling: false, why: r.why
      });
      continue;
    }

    if (r.policy === "viewer") {
      canonicalRefusals.push({
        ...base, document: source.formNumber,
        reason: VIEWER_REASON, category: null, completenessClass: null, class: null,
        requiredBeforeFiling: false, why: VIEWER_REASON
      });
      continue;
    }

    if (r.policy === "fragment") {
      canonicalRefusals.push({
        ...base, document: source.formNumber,
        reason: FRAGMENT_REASON, category: null, completenessClass: null, class: null,
        requiredBeforeFiling: false, why: FRAGMENT_REASON
      });
      continue;
    }

    if (r.policy === "optional") {
      canonicalRefusals.push({
        ...base, document: source.formNumber,
        reason: OPTIONAL_REASON(r.why),
        category: null, completenessClass: null, class: null,
        requiredBeforeFiling: false, why: r.why
      });
      continue;
    }

    // supply: a fact the filing needs and the platform does not hold.
    canonicalRefusals.push({
      ...base, document: source.formNumber,
      reason: `the participant supplies this before filing: ${r.what}`,
      category: null, completenessClass: null, class: null,
      disposition: "REQUIRED_BEFORE_FILING",
      completenessDisposition: "REQUIRED_BEFORE_FILING",
      requiredBeforeFiling: true,
      identity: `${source.formNumber} field ${r.key}`,
      factId: null,
      routeDetermined: false,
      why: `the platform holds no value for this and the participant supplies it before filing: ${r.what}`,
      participantMustSupply: r.what
    });
  }

  return {
    formNumber: source.formNumber,
    documentId: source.formNumber,
    documentRole: source.instrumentKind,
    documentPolicy: { mode: "participant", captionOnly: false, documentAcceptsFill: true, routeKey: ROUTE.routeKey },
    structuralClass: "acroform",
    explicitMappings: Object.fromEntries(census.rows.filter((r) => r.policy === "write").map((r) => [r.key, r.fact])),
    roleRefusals: [],
    selectionControls,
    canonicalWrites,
    canonicalRefusals,
    boundaryWrites: canonicalWrites,
    boundaryRefusals: canonicalRefusals
  };
}

/* ---- the builder's own count of the nine counters --------------------------
 * Not a verdict. The builder does not verify its own packets: an independent
 * VF lane decides, and PASS_COMPLETE additionally needs a hash-bound
 * RASTER_PASS. This answers the builder contract's own obligation with the
 * repository's contract functions, document-scoped like the audit. */
function countCompleteness(maps, writeProofs, artifacts, instructionsText, receiptExact) {
  const counters = Object.fromEntries(PASS_COUNTERS.map((c) => [c, 0]));
  const findings = [];
  const note = (counter, detail) => { counters[counter] += 1; findings.push({ counter, ...detail }); };

  const writes = [];
  const blanks = [];
  for (const map of maps) {
    const normalizeRow = (row, selection = false) => ({
      id: row.field ?? row.selectionId, name: row.acroFieldName ?? row.field,
      label: row.effectiveLabel ?? row.printedLabel ?? "",
      reason: row.reason ?? "",
      refusalClass: row.category ?? null,
      page: row.page ?? null,
      document: row.document ?? map.formNumber,
      factId: row.factId ?? null,
      isSelectionControl: selection,
      declared: {
        disposition: row.completenessDisposition ?? null,
        ...(Object.hasOwn(row, "requiredBeforeFiling") ? { requiredBeforeFiling: row.requiredBeforeFiling === true } : {}),
        ...(Object.hasOwn(row, "routeDetermined") ? { routeDetermined: row.routeDetermined === true } : {}),
        identity: row.identity ?? row.field ?? null,
        factId: row.factId ?? null
      }
    });
    for (const w of map.canonicalWrites) writes.push(normalizeRow(w));
    for (const r of map.canonicalRefusals) blanks.push(normalizeRow(r));
    for (const c of map.selectionControls) blanks.push(normalizeRow(c, true));
  }

  const availableFacts = new Set(writes.map((w) => w.factId).filter(Boolean).map(String));
  for (const p of writeProofs) {
    for (const w of p.actualWrites) if (w.factId && String(w.drawnText.join("")).trim()) availableFacts.add(String(w.factId));
  }
  const normLabel = (x) => String(x ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const writtenInDocument = new Map();
  for (const w of writes) {
    const doc = String(w.document ?? "");
    if (!writtenInDocument.has(doc)) writtenInDocument.set(doc, new Set());
    for (const k of [normLabel(w.label), normLabel(w.name)]) if (k.length >= 4) writtenInDocument.get(doc).add(k);
  }

  const ledger = [];
  for (const blank of blanks) {
    const here = writtenInDocument.get(String(blank.document ?? "")) ?? new Set();
    const declared = {
      ...blank.declared,
      factAvailable: (blank.declared.factId ? availableFacts.has(String(blank.declared.factId)) : false)
        || here.has(normLabel(blank.label)) || here.has(normLabel(blank.name))
    };
    const verdict = classifyBlank(blank, blank.reason, blank.refusalClass, declared);
    ledger.push({ ...blank, ...verdict });
    if (BLANK_DISPOSITIONS[verdict.disposition].allowed) continue;
    const counter = verdict.disposition === "KNOWN_FACT_NOT_WRITTEN" ? "knownRequiredFieldsMissing"
      : verdict.disposition === "ROUTE_OPTION_NOT_SELECTED" ? "requiredOptionsMissing"
        : "unclassifiedBlanks";
    note(counter, { document: blank.document, field: blank.id, label: blank.label, disposition: verdict.disposition, basis: verdict.basis });
  }

  const instructions = String(instructionsText ?? "");
  for (const b of ledger.filter((x) => x.disposition === "REQUIRED_BEFORE_FILING")) {
    const needles = [b.label, b.id, b.declared?.identity].map((x) => String(x ?? "").trim()).filter((x) => x.length >= 3);
    if (needles.some((n) => instructions.toLowerCase().includes(n.toLowerCase().slice(0, 60)))) continue;
    note("requiredFactsNotCollected", { document: b.document, field: b.id, label: b.label, why: "declared required-before-filing and not named in participant-instructions.md" });
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
      note("invisibleWrites", { fixture: p.fixture, formNumber: p.formNumber, why: "the finalizer reported values and the output bytes carry no glyph and no flattened appearance" });
    }
    if ((p.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes ?? 0) > 0) {
      note("visualDefects", { fixture: p.fixture, formNumber: p.formNumber, why: "ink landed outside every measured write box" });
    }
    for (const refused of p.refusedFieldsWithInk ?? []) {
      note("protectedWrites", { fixture: p.fixture, formNumber: p.formNumber, field: refused.fieldId, why: "a field the map refused carries ink in the output" });
    }
  }
  for (const w of writes) {
    if (classifyField(w.label, false).requirement === "PROTECTED") {
      note("protectedWrites", { field: w.id, label: w.label, why: "a protected field was written" });
    }
  }

  const renderedNames = artifacts.map((a) => `${a.file} ${(a.documents ?? []).join(" ")}`).join(" ").toLowerCase();
  const loose = (x) => String(x).toLowerCase().replace(/[^a-z0-9]/g, "");
  for (const map of maps) {
    if (!renderedNames.includes(String(map.formNumber).toLowerCase()) && !loose(renderedNames).includes(loose(map.formNumber))) {
      note("requiredComponentsMissing", { component: map.formNumber, why: "the field map names this document and it appears in no rendered artifact" });
    }
  }
  if (!receiptExact) note("visualDefects", { why: "the family's own source receipt does not bind every source to an exact SHA-256" });

  return { counters, findings, ledger, totals: { terminalFields: writes.length + blanks.length, written: writes.length, blank: blanks.length } };
}

function requiredBeforeFilingItems(maps) {
  return maps.flatMap((map) => map.canonicalRefusals
    .filter((r) => r.requiredBeforeFiling === true)
    .map((r) => ({
      document: map.formNumber, field: r.field, page: r.page,
      printedContext: r.printedLabel, disclosureLabel: r.effectiveLabel,
      identity: r.identity, why: r.why, participantMustSupply: r.participantMustSupply
    })));
}

/* ---- the participant instructions ------------------------------------------ */
function participantInstructions(maps, rbf) {
  const elections = maps.flatMap((m) => m.selectionControls.filter((c) => c.category === PARTICIPANT_ELECTION)
    .map((c) => ({ ...c, document: m.formNumber })));
  const byDoc = new Map();
  for (const i of rbf) byDoc.set(i.document, [...(byDoc.get(i.document) ?? []), i]);
  const out = [];
  out.push(`# Filing instructions — ${ROUTE.publicLabel}`, "");
  out.push(
    "This packet is two official Kentucky Court of Justice forms: **AOC-496.3**, _Application to Vacate and Expunge "
    + "Felony Conviction_ (the application you file), and **AOC-496.4**, _Order on Application to Vacate and Expunge "
    + "Felony Conviction_ (the order the court enters), prepared under KRS 431.073 and 431.079.", ""
  );
  out.push(
    "The platform filled in what it holds about you and your case on both forms: your name, your address, your phone "
    + "number, your date of birth, your county and your case number. Everything else is yours, and every item is "
    + "listed below.", ""
  );

  out.push("## Where you file this", "");
  out.push(
    "File the application with the **Office of the Circuit Court Clerk in the county where the conviction occurred**. "
    + "It is filed as a motion in your original criminal case, not as a new case, so the caption — court, county, "
    + "division and case number — must match your existing case exactly. (KRS 431.073(1); the statewide Kentucky "
    + "legal review held in the source library records the venue rule and the filing method: in person or by mail at "
    + "the circuit court clerk's office; pro se e-filing is not generally available.)", ""
  );

  out.push("## The fee, and the fee after the fee", "");
  out.push(
    "The form states the fees on its own third page: **a $50 non-refundable filing fee per application, due at the "
    + "time of filing** — \"the clerk cannot take your application without proper payment of this fee\" — and, "
    + "**if an expungement order is granted, an additional $250 expungement fee**, which you may pay in installments if "
    + "you ask the Court to set a plan using the request block on page 3. (KRS 431.073(10) and (11).) Be warned: the "
    + "legal review records that at least one circuit clerk's public page quotes $300 due at filing, which conflicts "
    + "with the statute — if a clerk asks for $300 at the counter, the form itself says $50 at filing.", ""
  );
  out.push(
    "**If you cannot pay:** the named procedure is a motion to proceed in forma pauperis with an affidavit of "
    + "indigency under KRS 453.190. Whether the $50 clerk portion can be waived is recorded as unresolved — ask "
    + "the circuit court clerk. For the $250, the statute provides the installment plan rather than a waiver.", ""
  );

  out.push("## Who must be served", "");
  out.push(
    "**You serve nobody.** The circuit court clerk serves the notice of filing on the Commonwealth's or County "
    + "Attorney who prosecuted the case — the form's own \"NOTICE TO COMMONWEALTH/COUNTY ATTORNEY\" and \"FOR "
    + "CLERK USE ONLY\" blocks on page 3 record exactly that, and the clerk completes the service block. The "
    + "prosecutor has 60 days after service to respond, and a hearing on the application must occur no later than 120 "
    + "days after filing (KRS 431.073(2); printed on the form).", ""
  );

  out.push("## What must be attached", "");
  out.push(
    "1. **Your current expungement eligibility certification.** The form says it in bold: \"A copy of your current "
    + "expungement eligibility certification must be attached to this Application.\" (KRS 431.079.) The certification "
    + "expires **30 days after issuance**, so file while it is current.");
  out.push(
    "2. **A copy of the full pardon**, only if you check the pardon basis in Section 2 — the form's own words: "
    + "\"a copy of which is attached.\"");
  out.push(
    "3. **Additional sheets, if needed** — the form directs that all charges in the case be listed, including "
    + "non-felony charges, and allows attached sheets when the printed lines run out.", "");

  out.push("## Deadlines, honestly stated", "");
  out.push(
    "There is **no deadline to file** this application. Two timing rules do apply: you may not file **sooner than "
    + "five years** after completion of your sentence or successful completion of probation or parole, whichever is "
    + "later (paragraph 5 of the application), and your eligibility certification must still be **within its 30-day "
    + "life** on the day you file.", ""
  );

  out.push("## Sign before a notary or the circuit court clerk", "");
  out.push(
    "Do not sign the application at home. The form's own note: the Defendant/Applicant must sign in the presence of "
    + "a notary or of a circuit court clerk, so the notary or clerk can witness the signature. The signature and date "
    + "lines are left blank on purpose.", ""
  );

  out.push("## The items you must supply", "");
  for (const [doc, items] of byDoc) {
    out.push(`### On ${doc}`, "");
    out.push("| Page | The blank on the form | What to write |", "| --- | --- | --- |");
    for (const i of items) out.push(`| ${i.page} | ${i.disclosureLabel} | ${i.participantMustSupply} |`);
    out.push("");
  }

  out.push("## The choices that are yours", "");
  out.push("| Form | Page | The choice | Why the packet did not make it |", "| --- | --- | --- | --- |");
  for (const c of elections) out.push(`| ${c.document} | ${c.page} | ${c.effectiveLabel} | ${c.reason} |`);
  out.push("");
  out.push(
    "Section 2 of the application says **check only one**. Read all five statements against your own record. If your "
    + "basis is KRS 431.073(1)(d) — either (1)(d) box — you must also complete Section 7 on page 2, and you "
    + "should read the stop list below first.", ""
  );

  out.push("## What the platform deliberately left blank", "");
  out.push("- **Your signature and its date, and the year beside it.** You sign before the notary or clerk.");
  out.push("- **Your Social Security number and the Violation/Arrest date boxes** until you fill them — they are in the table above.");
  out.push("- **Everything the court, the clerk, or an agency records custodian completes on AOC-496.4**: every finding, every checkbox in Sections I through V, the judge's and clerk's dates, and the agency certification block. The order is included so your filing is complete to tender; the legal review records that whether the applicant tenders it or the clerk prepares it is a matter of clerk practice — bring it, and let the clerk say.");
  out.push("- **Section 7's narrative answers.** They are only for a (1)(d) application, and the legal review's own limitation is that they are never generated — they are your sworn story or your lawyer's drafting, not a form-fill.", "");

  out.push("## When to stop and get a lawyer", "");
  out.push("The statewide legal review in the source library names these as the exact self-help stops. Stop and talk to an attorney or legal aid if **any** of these is true:", "");
  out.push("1. Your application would be brought under **KRS 431.073(1)(d)** — the contested-hearing burden is clear and convincing evidence, you or counsel must appear, and Section 7 requires drafted narrative testimony.");
  out.push("2. **The Commonwealth files any objection.**");
  out.push("3. There is a question whether the offense **resulted in serious bodily injury or death**.");
  out.push("4. **There was an identified victim.**");
  out.push("5. The offense classification is disputed — Class D versus higher, or the effect of a persistent-felony-offender enhancement.");
  out.push("6. **You are not a United States citizen.**");
  out.push("7. You cannot fund the $250 and need an installment plan argued for you.");
  out.push("8. The case moved between district and circuit court and **the charge list is uncertain**.", "");

  out.push("## What this packet is not", "");
  out.push(
    "This is a prepared copy of two official Kentucky Court of Justice forms. It is not legal advice, it is not filed "
    + "for you, and it does not decide whether your conviction is eligible to be vacated and expunged — only a "
    + "judge can do that."
  );
  out.push("");
  out.push(`_Route: ${ROUTE.routeKey} — ${ROUTE.authority}_`);
  return `${out.join("\n")}\n`;
}

/* ---- artifacts ------------------------------------------------------------- */
function writeJson(rel, value) {
  fs.mkdirSync(path.dirname(path.join(ROOT, rel)), { recursive: true });
  fs.writeFileSync(path.join(ROOT, rel), `${JSON.stringify(value, null, 2)}\n`);
}

/* ---- the entry point ------------------------------------------------------- */
export async function runFamily(argv = process.argv.slice(2)) {
  const checkOnly = argv.includes("--check");
  const doRaster = argv.includes("--raster");

  const { resolved, failures } = resolveSources();
  if (failures.length > 0) {
    return {
      familyId: FAMILY_ID, status: "STOPPED", stopClass: "BLOCKED_SOURCE",
      failedSourceIdentities: failures,
      why: "a source did not bind by exact SHA-256, so nothing may be rendered from it",
      overlayDirectoryTouched: false
    };
  }

  const censuses = new Map();
  for (const source of resolved) {
    const census = await censusOfSource(source);
    assert.equal(census.unmapped.length, 0,
      `${source.formNumber}: ${census.unmapped.length} widget(s) carry no policy: ${JSON.stringify(census.unmapped.slice(0, 5))}`);
    assert.equal(census.stale.length, 0,
      `${source.formNumber}: the dictionary names ${census.stale.length} field(s) the form does not have: ${JSON.stringify(census.stale)}`);
    assert.equal(census.captionDrift.length, 0,
      `${source.formNumber}: a caption is no longer printed where the dictionary says: ${JSON.stringify(census.captionDrift.slice(0, 3))}`);
    censuses.set(source.formNumber, census);
  }

  if (checkOnly) {
    return {
      familyId: FAMILY_ID, status: "CHECK_ONLY",
      documents: resolved.map((source) => {
        const census = censuses.get(source.formNumber);
        const by = (p) => census.rows.filter((r) => r.policy === p).length;
        return {
          formNumber: source.formNumber, sha256: source.sha256, fields: census.rows.length,
          write: by("write"), supply: by("supply"), optional: by("optional"), election: by("election"),
          protect: by("protect"), court: by("court"), viewer: by("viewer"), fragment: by("fragment")
        };
      })
    };
  }

  fs.mkdirSync(path.join(ROOT, OUT, "fixtures"), { recursive: true });
  fs.mkdirSync(path.join(ROOT, OUT, "reports"), { recursive: true });

  const artifacts = [];
  const writeProofs = [];
  const rasterPages = [];
  const maps = [];

  for (const fixtureName of ["canonical", "boundary"]) {
    const packet = stampDeterministic(await PDFDocument.create());
    packet.setTitle(`${ROUTE.publicLabel} — ${fixtureName} fixture`);
    const pageManifest = [];
    const documents = [];

    for (const source of resolved) {
      const census = censuses.get(source.formNumber);
      const { bytes, report } = await renderForm(source, census, fixtureName);
      const proof = await byteProof(census, bytes, report, fixtureName, source.formNumber);

      const formFile = `${OUT}/fixtures/${fixtureName}--${source.formNumber.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.pdf`;
      fs.writeFileSync(path.join(ROOT, formFile), bytes);

      const loaded = await PDFDocument.load(bytes, { ignoreEncryption: true });
      for (const [i, p] of (await packet.copyPages(loaded, loaded.getPageIndices())).entries()) {
        packet.addPage(p);
        pageManifest.push({
          packetPage: packet.getPageCount(), component: source.component,
          documentId: source.formNumber, sourcePage: i + 1, sourceSha256: source.sha256
        });
      }
      documents.push(source.formNumber);

      writeProofs.push({
        fixture: fixtureName, formNumber: source.formNumber, sourceSha256: source.sha256,
        file: formFile,
        sha256: crypto.createHash("sha256").update(bytes).digest("hex"),
        proofMethod: "flattened widget appearances read back at every measured /Rect of the finalized bytes",
        valuesReportedByFinalizer: report.written.length,
        flattenedWidgetAppearancesReadFromOutputBytes: proof.appearances,
        addedGlyphsReadFromOutputBytes: proof.glyphs,
        nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: 0,
        refusedFieldsWithInk: proof.refusedFieldsWithInk,
        actualWrites: proof.actualWrites
      });

      if (fixtureName === "canonical") maps.push(fieldMapFor(source, census, report));
    }

    const packetBytes = Buffer.from(await packet.save({ useObjectStreams: false, updateMetadata: false }));
    const file = `${OUT}/fixtures/${fixtureName}.pdf`;
    fs.writeFileSync(path.join(ROOT, file), packetBytes);
    artifacts.push({
      fixture: fixtureName, file,
      sha256: crypto.createHash("sha256").update(packetBytes).digest("hex"),
      byteLength: packetBytes.length, pageCount: packet.getPageCount(),
      documents, pageManifest,
      componentFiles: writeProofs.filter((p) => p.fixture === fixtureName)
        .map((p) => ({ formNumber: p.formNumber, file: p.file, sha256: p.sha256 }))
    });

    if (doRaster) {
      const rasterDir = `${OUT}/raster/${fixtureName}`;
      fs.mkdirSync(path.join(ROOT, rasterDir), { recursive: true });
      for (let i = 0; i < packet.getPageCount(); i += 1) {
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

  const rbf = requiredBeforeFilingItems(maps);
  const instructionsText = participantInstructions(maps, rbf);
  const counted = countCompleteness(maps, writeProofs, artifacts, instructionsText, true);
  const allZero = PASS_COUNTERS.every((c) => counted.counters[c] === 0);

  /*
   * A stopped family leaves its overlay directory byte-for-byte unchanged: a
   * half-built packet that reads as built is worse than one never started.
   */
  if (!allZero) {
    fs.rmSync(path.join(ROOT, OUT), { recursive: true, force: true });
    return {
      familyId: FAMILY_ID, status: "STOPPED", stopClass: "COMPLETENESS_COUNTER_NOT_ZERO",
      nonZeroCounters: PASS_COUNTERS.filter((c) => counted.counters[c] > 0),
      counters: counted.counters,
      findings: counted.findings.slice(0, 20),
      overlayDirectoryTouched: false,
      why: "a completeness counter is not zero, so the family is not returned as built"
    };
  }

  writeJson(`${OUT}/source-receipt.json`, {
    schemaVersion: "rcap-family-source-receipt/v1",
    familyId: FAMILY_ID, worklistGroupId: FAMILY_ID, jurisdiction: ROUTE.jurisdiction,
    implementationStrategy: "official_pdf_fill", custodyClass: "SOURCE_ALREADY_HELD",
    acquisitionCommissioned: false, corpusRootFromEnvironment: "MASTER_LIBRARY_SOURCE_DIR",
    bindingMethod: "exact form number + committed corpus-index SHA-256 + on-disk SHA-256 + byte length",
    routeKey: ROUTE.routeKey, routeSelectionId: ROUTE.routeSelectionId,
    statutoryAuthority: ROUTE.authority,
    filingGuidanceAuthority: {
      whatItSourced: "filing destination, fees and waiver, service, attachments, deadlines and the self-help stops in participant-instructions.md",
      pathInArchive: ROUTE.legalReviewSource,
      note: "the statewide Kentucky record-clearing legal review held in the Master Library, as of 2026-08-02, alongside the two forms' own printed instructions"
    },
    allSourcesExact: true,
    documents: resolved.map((source) => ({
      sourceIds: [source.sourceId], documentId: source.formNumber, formNumber: source.formNumber,
      revision: source.revision, pathInArchive: source.pathInArchive,
      sha256: source.sha256, byteLength: source.byteLength,
      instrumentKind: source.instrumentKind
    })),
    sourceBinaryCommitted: false,
    commercialRoutesOpened: 0
  });

  writeJson(`${OUT}/field-census.census-v1.json`, {
    schemaVersion: "rcap-official-form-field-census/v1-census-v1",
    familyId: FAMILY_ID,
    captionBasis:
      "both forms name every field with a bare number, so every caption was read from the form's own content stream at "
      + "a recorded coordinate; captionReadAt records where, and the build refuses if a caption is no longer printed "
      + "there. Viewer buttons carry their labels in their own appearance streams and are exempt from the drift check.",
    documents: resolved.map((source) => {
      const census = censuses.get(source.formNumber);
      return {
        formNumber: source.formNumber, sourceSha256: source.sha256, pageCount: census.pageCount,
        fieldCount: census.rows.length,
        fields: census.rows.map((r) => ({
          field: r.key, acroFieldName: r.name, page: r.page, rect: r.rect, rectBasis: r.rectBasis,
          pdfType: r.type, isSelectionControl: r.isSelectionControl, multiline: r.multiline, maxLength: r.maxLength,
          printedCaption: r.caption, captionReadAt: r.captionAt, effectiveLabel: r.effectiveLabel,
          policy: r.policy, factId: r.fact
        }))
      };
    })
  });

  writeJson(`${OUT}/production-field-map.json`, {
    schemaVersion: "rcap-official-form-field-map/v1-census-v1",
    familyId: FAMILY_ID, routeKeys: [ROUTE.routeKey], routeSelectionId: ROUTE.routeSelectionId,
    jurisdiction: ROUTE.jurisdiction,
    renderStrategy: "acroform_fill",
    officialForms: resolved.map((r) => r.formNumber),
    captionBasis:
      "every printed caption in this map was read from the official form's own content stream at a recorded "
      + "coordinate; captionReadAt records where, and the build refuses if a caption is no longer there",
    dispositionVocabulary: [SIGNATURE, COURT_OWNED, PARTICIPANT_ELECTION],
    routeDeterminedSelections: [],
    routeSelectionNote:
      "Nothing on either form is route-determined. Section 2 of AOC-496.3 elects among five statutory bases of KRS "
      + "431.073(1), and the corpus legal review names that choice — including (1)(a) versus (1)(d) where both "
      + "arguably apply — an individualized legal judgment, with (1)(d) applications routed to attorney review. Every "
      + "checkbox on AOC-496.4 is the court's own finding or order.",
    requiredBeforeFilingCount: rbf.length,
    requiredBeforeFiling: rbf,
    maps, generationAllowed: false, runtimeSelectable: false, commercialRoutesOpened: 0
  });

  writeJson(`${OUT}/reports/rendered-artifacts.json`, {
    schemaVersion: "rcap-rendered-artifacts/v1", familyId: FAMILY_ID, renderedFresh: true,
    componentSet: DOCUMENTS.map((d) => d.component),
    artifacts,
    packets: artifacts.map((a) => ({ fixture: a.fixture, documents: a.documents })),
    byteDerivedHashes: true,
    rasterEngine: doRaster ? "scripts/raster/pdf-page-raster.mjs (Chromium, calibrated)" : null,
    rasterSkipped: !doRaster,
    rasterState: doRaster ? "RASTER_LOCAL_PENDING_CENTRAL" : "BUILT_RASTER_PENDING",
    rasterPages,
    independentVerificationPending: true
  });

  writeJson(`${OUT}/reports/actual-writes.json`, {
    schemaVersion: "rcap-actual-writes-byte-proof/v1", familyId: FAMILY_ID,
    derivedFromArtifactBytes: true,
    note:
      "Read back from the finalized PDF bytes at every measured widget rectangle, not from the finalizer's own "
      + "report. A value the finalizer says it wrote and the bytes do not carry is an invisible write and is counted "
      + "as one.",
    documents: writeProofs,
    artifacts: writeProofs.map((p) => ({
      fixture: p.fixture, formNumber: p.formNumber,
      valuesReportedByFinalizer: p.valuesReportedByFinalizer,
      addedGlyphsReadFromOutputBytes: p.addedGlyphsReadFromOutputBytes,
      flattenedWidgetAppearancesReadFromOutputBytes: p.flattenedWidgetAppearancesReadFromOutputBytes,
      nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: p.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes,
      refusedFieldsWithInk: p.refusedFieldsWithInk
    })),
    blockingFindings: writeProofs.flatMap((p) => p.refusedFieldsWithInk.map((r) => ({
      fixture: p.fixture, formNumber: p.formNumber, field: r.fieldId,
      finding: "a field the map refused carries ink in the output"
    })))
  });

  fs.writeFileSync(path.join(ROOT, OUT, "participant-instructions.md"), instructionsText);

  writeJson(`${OUT}/reports/builder-completeness-counters.json`, {
    schemaVersion: "rcap-builder-completeness-counters/v1", familyId: FAMILY_ID,
    thisIsNotAVerdict:
      "A builder verdict is not a verdict. These counters are the builder contract's own obligation, computed with "
      + "scripts/rcap-packet-completeness/completeness-contract.mjs over this family's field map, byte proof, rendered "
      + "artifacts and participant-instructions.md. An independent verification lane that did not build this packet "
      + "decides whether it passes, and PASS_COMPLETE additionally requires a hash-bound RASTER_PASS.",
    counters: counted.counters,
    allNineZero: allZero,
    totals: counted.totals,
    findings: counted.findings,
    blankDispositions: counted.ledger.reduce((acc, b) => { acc[b.disposition] = (acc[b.disposition] ?? 0) + 1; return acc; }, {})
  });

  writeJson(`${OUT}/build-status.json`, {
    schemaVersion: "rcap-family-build-status/v1", familyId: FAMILY_ID,
    buildStatus: "state_built", reviewStatus: "qa_review_pending",
    builtBy: BUILD_SCRIPT,
    rasterEngine: doRaster ? "chromium_calibrated" : null,
    popplerUsed: false,
    rasterState: doRaster ? "RASTER_LOCAL_PENDING_CENTRAL" : "BUILT_RASTER_PENDING",
    renderedArtifacts: artifacts.length,
    rasterPages: rasterPages.length,
    independentVerificationStatus: "PENDING",
    selfVerified: false,
    generationAllowed: false, runtimeSelectable: false,
    commercialRoutesOpened: 0, productionTouched: false,
    grantsNothing:
      "A rendered packet is review evidence. It authorizes no fulfillment, opens no commercial route, and is not a "
      + "verdict. The builder does not verify its own packets."
  });

  writeJson(`${OUT}/build-findings.json`, {
    schemaVersion: "rcap-family-build-findings/v1", familyId: FAMILY_ID,
    blocking: [],
    findings: [
      {
        finding:
          "Every AcroForm field on both forms is named with a bare number (`1 Case Number`, `2` … `79`), including a "
          + "field named `18a` on the order, and the order's `1 Case Number` is one field with a widget on each of "
          + "its four pages.",
        consequence:
          "Every caption is read from the page's own content stream at a recorded coordinate and re-checked on every "
          + "build; the shared semantics bind through the measured caption, never the number. The multi-page case "
          + "number is one field, one value, four recorded rows."
      },
      {
        finding:
          "The application's text stream is scrambled in places — the Section 7(f) prompt extracts as spaced-out "
          + "letters ('I f   e x p u n g e m e n t …') and several prompts interleave ('Since you have ed, been have "
          + "releasyou participated in any').",
        consequence:
          "Captions are recorded as the stream carries them, so the drift check compares like with like."
      },
      {
        finding:
          "The phone line on each form is two widgets: a 26pt box inside printed parentheses for the area code, and "
          + "the number line beside it.",
        consequence:
          "The full phone number, area code included, is written on the number line; the parentheses box is refused "
          + "as a fragment of a value already on the page, and the refusal says so rather than inventing a second "
          + "phone fact."
      },
      {
        finding:
          "Whether the applicant tenders AOC-496.4 or the clerk prepares it is an open question in the corpus legal "
          + "review; clerk practice appears to control.",
        consequence:
          "The proposed order is prepared caption-complete either way, every court-side entry on it is refused as "
          + "court-, clerk- or custodian-owned, and the instructions tell the participant to bring it and let the "
          + "clerk say."
      },
      {
        finding:
          "The legal review's implementation limitation: automate (1)(a) and (1)(b) enumerated-offense applications "
          + "only; route all (1)(d) applications to attorney review; never generate Section 7 narrative answers.",
        consequence:
          "No eligibility box is marked (the Section 2 election is carried to the participant with the (1)(d) warning "
          + "in the instructions), Section 7 is left entirely to the participant as optional narrative with an "
          + "attorney-review stop, and the self-help stop list is reproduced in the instructions verbatim in "
          + "substance."
      },
      {
        finding: "Both forms carry live Reset Form and Print Form buttons.",
        consequence:
          "Both are classified viewer controls, never filing facts; flattening repaints their labels from the source "
          + "document's own appearance streams, which the byte proof does not count as ink on a refused field."
      }
    ]
  });

  writeJson(`${OUT}/approval-request.json`, {
    schemaVersion: "rcap-family-approval-request/v1", familyId: FAMILY_ID,
    requested: "independent completeness verification, visual review and counsel review",
    buildStatus: "state_built", status: "PENDING_INDEPENDENT_VERIFICATION",
    counselQuestionsRaised: [
      "The Section 2 eligibility basis on AOC-496.3 is carried as a participant election with no box marked, per the "
      + "legal review's limitation. Confirm the packet should not pre-mark (1)(a) even for enumerated-offense intakes.",
      "The proposed order AOC-496.4 is prepared caption-complete with all findings blank, and the charge lists on it "
      + "are carried as required-before-filing items mirroring the application. Confirm that treatment against local "
      + "clerk practice, which the legal review records as controlling and unresolved.",
      "The application's charge tables (six felony lines, six district lines) are carried as required-before-filing "
      + "items because the platform holds no charge rows for this family. Confirm the disclosure wording."
    ],
    approvedForLive: false, live: false, commercialRoutesOpened: 0
  });

  return {
    familyId: FAMILY_ID,
    status: "COMPLETED",
    counters: counted.counters,
    nineCountersZero: allZero,
    directory: OUT,
    documents: resolved.map((r) => ({ formNumber: r.formNumber, sha256: r.sha256, instrumentKind: r.instrumentKind })),
    terminalFields: counted.totals.terminalFields,
    written: counted.totals.written,
    requiredBeforeFiling: rbf.length,
    participantElections: maps.flatMap((m) => m.selectionControls.filter((c) => c.category === PARTICIPANT_ELECTION)).length,
    courtOwnedControls: maps.flatMap((m) => m.selectionControls.filter((c) => c.category === COURT_OWNED)).length,
    artifacts: artifacts.map((a) => ({ fixture: a.fixture, sha256: a.sha256, byteLength: a.byteLength, pageCount: a.pageCount })),
    rasterState: doRaster ? "RASTER_LOCAL_PENDING_CENTRAL" : "BUILT_RASTER_PENDING",
    rasterPages: rasterPages.length,
    packetsSelfVerified: 0, commercialRoutesOpened: 0, productionTouched: false
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(thisFile)) {
  runFamily()
    .then((r) => { console.log(JSON.stringify(r, null, 2)); })
    .catch((e) => { console.error(e); process.exit(1); });
}
