#!/usr/bin/env node
/**
 * The Virginia petition-based sealing packet family builder.
 *
 *   node scripts/build-census-v1-va_seal_petition_misdemeanor-set.mjs [--check] [--no-raster]
 *
 * Four census-v1 families share this host, one official-form family and one
 * implementation strategy. They do NOT share one official form, and that is the
 * finding this lane returns.
 *
 * PF01 assigned CC-1201 to all four. CC-1201 prints its own authority across the
 * top of page 1 -- "PETITION FOR SEALING PURSUANT TO VA. CODE § 19.2-392.12" --
 * and two of the four families are not filed under that section:
 *
 *   va_seal_petition_misdemeanor   Va. Code § 19.2-392.12        -> CC-1201
 *   va_seal_petition_felony        Va. Code § 19.2-392.12        -> CC-1201
 *   va_seal_enumerated_seven_year  Va. Code § 19.2-392.12:1(A)   -> CC-1203
 *   va_seal_ancillary_matter_only  Va. Code § 19.2-392.12:1(B)   -> CC-1203
 *
 * Nothing here is researched and nothing is guessed. The statute for each track
 * is read from this repository's own record -- data/rcap-ledger/track-pathway-
 * crosswalk.json, `legalName` and `mechanismAuthority` -- and the statute each
 * form serves is read from the form's own printed title in the pinned corpus
 * binary. The two agree, and they disagree with the assignment table.
 *
 * It is not a stylistic preference. CC-1201 page 1 requires a charge or
 * conviction to be sealed before its Section C will accept an ancillary matter,
 * so an ancillary-matter-only petition cannot be expressed on it at all; and the
 * nine enumerated statutes of § 19.2-392.12:1(A) are printed only on CC-1203.
 * Building those two families on CC-1201 would render an unfilable petition
 * while reporting a completed one, which is the exact failure the completeness
 * contract exists to catch. So each family is built on the form its own recorded
 * authority names, and the discrepancy is returned to the Captain as this lane's
 * principal finding rather than resolved silently in either direction.
 *
 * Both forms bind by exact SHA-256 against the committed corpus index.
 *
 * Three things about these forms shaped the implementation.
 *
 * First, CC-1201 gives several widgets ONE name and several positions --
 * `User.Court` is three boxes, `User.AncillaryMatterSeal` is four -- so a field
 * dictionary keyed by widget name cannot address them and a map keyed by name
 * would collide two different questions onto one row. Every row here is keyed by
 * name plus the measured coordinate where that widget actually sits.
 *
 * Second, four of CC-1201's widgets carry a REVERSED /Rect, with the upper
 * corner written first. pdf-lib reports that as a negative height, and the
 * unnormalized y lands the caption check a line and a half above the blank it
 * belongs to. Rectangles are normalized before anything is measured against them.
 *
 * Third, the widget NAMES lie about what the blanks are for. CC-1201's
 * `User.DateOfArrest` is the ancillary matter's arrest date and the charge's own
 * arrest date is `User.ChargeDateOfArrest`; `User.CityOrCounty` is the deciding
 * court's city, and the field-semantics name channel binds it to
 * participant.city. Every caption in this dictionary is therefore READ OFF THE
 * PAGE at the widget's own coordinates, `captionAt` records where, and the build
 * refuses if a caption is no longer printed there.
 *
 * Rasterization goes through scripts/raster/pdf-page-raster.mjs (Chromium,
 * calibrated). Never Poppler.
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
import { extractPageGeometry } from "./rcap-official-forms/rcap-pdf-anchor-capture.mjs";
import { finalizeOfficialForm, PARTICIPANT_INK, SELECTION_INSET, SELECTION_LINE_WIDTH } from "./rcap-official-forms/rcap-official-form-finalize.mjs";
import { flattenedWidgets, drawnAt } from "./rcap-official-forms/pdf-flattened-widgets.mjs";
import { rasterizePageCalibrated } from "./raster/pdf-page-raster.mjs";
import { classifyField, classifyBlank, rowKeyOf, PASS_COUNTERS, BLANK_DISPOSITIONS } from "./rcap-packet-completeness/completeness-contract.mjs";
import { stampDeterministic } from "./rcap-official-forms/rcap-deterministic-pdf-date.mjs";

const thisFile = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(thisFile), "..");
process.chdir(ROOT);
const require = createRequire(import.meta.url);
const { PDFDocument, StandardFonts, rgb } = require("pdf-lib");

const CORPUS_INDEX = "data/rcap-all50/local-source-corpus-index.json";
const ROUTE_CENSUS = "data/rcap-grade-a/route-obligation-census-candidate/route-obligation-candidate.json";
/*
 * The three committed legal-design records this host reads at build time, in
 * addition to the census. FIX73 reads them because a packet that refuses to
 * answer a question the repository has already answered is a defect in the
 * packet, not a caution: the fee position and the points where self-help ends
 * are held here, per track, and the participant never saw either.
 */
const TRACK_REGISTRY = "data/record-clearing/legal-design-track-registry.json";
const LEGAL_DESIGN_MEMO = "data/record-clearing/legal-design-intake/VA.memo.json";
const PACKET_SET_MANIFESTS = "data/record-clearing/legal-design-packet-set-manifests.json";
const OVERLAY_ROOT = "data/rcap-all50/overlays/census-v1/va";
const FIXED_DATE = "2026-01-01T00:00:00.000Z";

function corpusRoot() {
  const configured = process.env.MASTER_LIBRARY_SOURCE_DIR
    ?? "private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1";
  assert.ok(fs.existsSync(configured), `the Master Library is not mounted at ${configured}`);
  return configured;
}

/* ------------------------------------------------------------------ *
 * Field policy vocabulary.
 *
 *   WRITE     the platform holds this fact and the library binds it
 *   SUPPLY    the participant must supply it before filing; disclosed by name
 *   PROTECT   a signature, a signature date, or a court/clerk/prosecutor field
 *   ELECTION  a sworn assertion or a choice the route does not determine
 *   SELECT    an election THIS ROUTE determines; the build marks the box
 *   OFFROUTE  a branch of the form this route does not use
 *
 * SELECT and OFFROUTE are the two halves of "a packet built for one statutory
 * route states which route it is". A route fork left unmade is a defect; a
 * branch the route excludes is not a blank the participant was never asked for.
 * ------------------------------------------------------------------ */
const SIGNATURE = "signature_or_date_participant_completion";
const COURT_OWNED = "court_prosecutor_clerk_or_agency_owned";
const ELECTION_CLASS = "participant_sworn_narrative_or_legal_election";

const WRITE = (fact) => ({ policy: "write", fact });
const SUPPLY = (what) => ({ policy: "supply", what });
const PROTECT = (why) => ({ policy: "protect", refusalClass: why });
const ELECTION = () => ({ policy: "election" });
const SELECT = (why) => ({ policy: "select", routeReason: why });
const OFFROUTE = (why) => ({ policy: "offroute", routeReason: why });

/* Section tags. A family switches whole sections of CC-1203 off by naming them,
 * because § 19.2-392.12:1(A) and § 19.2-392.12:1(B) share one printed form and
 * each uses a different half of it. */
const S = {
  HEADER: "header", CHARGE: "charge_information", ANCILLARY: "ancillary_matter",
  A1: "section_a_part_1", A2: "section_a_part_2", B1: "section_b_first_ancillary",
  B2: "section_b_second_ancillary", ELIGIBILITY: "sealing_eligibility",
  ACK: "acknowledgments", SIGN: "signature_block", VIEWER: "viewer_control"
};

/* ------------------------------------------------------------------ *
 * CC-1201 -- PETITION FOR SEALING PURSUANT TO VA. CODE § 19.2-392.12
 *
 * `field` is the AcroForm widget name. The dictionary KEY is that name plus the
 * measured coordinate, because CC-1201 reuses one name across up to four boxes
 * that ask four different questions. `caption` is the text printed on the page
 * at `captionAt`; the build re-reads it from the binary and refuses on drift.
 * ------------------------------------------------------------------ */
const CC1201 = {
  title: "Petition for Sealing Pursuant to Va. Code § 19.2-392.12",
  pages: 4,
  statute: "Va. Code § 19.2-392.12",
  fields: {
    "ResetButton": { field: "ResetButton", page: 1, caption: null, captionAt: null, label: "Reset this form (viewer control)", section: S.VIEWER, ...OFFROUTE("a viewer control the reader clicks, never a filing fact") },

    /* --- caption and my information ------------------------------------- */
    "User.CaseNo": { field: "User.CaseNo", page: 1, caption: "Case Number", captionAt: { page: 1, y: 739 }, label: "Case Number of this petition (the circuit court clerk assigns it at filing)", section: S.HEADER, ...PROTECT(COURT_OWNED) },
    "User.CourtName": { field: "User.CourtName", page: 1, caption: "CITY OR COUNTY", captionAt: { page: 1, y: 641 }, label: "Circuit Court city or county where this petition is filed", section: S.HEADER, ...WRITE("matter.court") },
    "UserPetitionerName": { field: "UserPetitionerName", page: 1, caption: "NAME OF PETITIONER", captionAt: { page: 1, y: 608 }, label: "Name of Petitioner in the style of the case", section: S.HEADER, ...WRITE("participant.full_legal_name") },
    "User.FullName": { field: "User.FullName", page: 1, caption: "My full name is", captionAt: { page: 1, y: 483 }, label: "My full name is", section: S.HEADER, ...WRITE("participant.full_legal_name") },
    "User.DateOfBirth": { field: "User.DateOfBirth", page: 1, caption: "My date of birth is", captionAt: { page: 1, y: 466 }, label: "My date of birth is", section: S.HEADER, ...WRITE("participant.date_of_birth") },
    "User.Sex": { field: "User.Sex", page: 1, caption: "My sex is", captionAt: { page: 1, y: 466 }, label: "My sex is, as it appears on the court record", section: S.HEADER, ...SUPPLY("your sex as it appears on the court record for this charge") },
    "User.Race": { field: "User.Race", page: 1, caption: "My race is", captionAt: { page: 1, y: 466 }, label: "My race is, as it appears on the court record", section: S.HEADER, ...SUPPLY("your race as it appears on the court record for this charge") },
    "User.SSN": { field: "User.SSN", page: 1, caption: "My social security number is", captionAt: { page: 1, y: 448 }, label: "My social security number is", section: S.HEADER, ...SUPPLY("your Social Security number — the platform never stores it and never writes it for you") },

    /* --- B. information about the charge or conviction -------------------- */
    "User.SingleCharge": { field: "User.SingleCharge", page: 1, caption: "I am requesting to seal a single charge or conviction", captionAt: { page: 1, y: 399 }, label: "I am requesting to seal a single charge or conviction", section: S.CHARGE, ...ELECTION() },
    "User.MoreCharge": { field: "User.MoreCharge", page: 1, caption: "I am requesting to seal more than one charge or conviction", captionAt: { page: 1, y: 367 }, label: "I am requesting to seal more than one charge or conviction", section: S.CHARGE, ...ELECTION() },
    "User.ChargeDesc": { field: "User.ChargeDesc", page: 1, caption: "DESCRIPTION OF CHARGE OR CONVICTION", captionAt: { page: 1, y: 283 }, label: "Description of the charge or conviction to be sealed", section: S.CHARGE, ...SUPPLY("the specific charge or conviction you are asking the court to seal, worded exactly as it appears on your court record") },
    "User.ChargeMisdemeanor": { field: "User.ChargeMisdemeanor", page: 1, caption: "This charge is a", captionAt: { page: 1, y: 266 }, label: "This charge is a misdemeanor", section: S.CHARGE, ...ELECTION() },
    "User.ChargeFelony": { field: "User.ChargeFelony", page: 1, caption: "class 5 or 6 felony", captionAt: { page: 1, y: 266 }, label: "This charge is a class 5 or 6 felony", section: S.CHARGE, ...ELECTION() },
    "User.ChargeViolation": { field: "User.ChargeViolation", page: 1, caption: "a violation of § 18.2-95 or any other felony offense for which I was", captionAt: { page: 1, y: 253 }, label: "This charge is a violation of § 18.2-95 or another felony punished as larceny", section: S.CHARGE, ...ELECTION() },
    "User.Offense1": { field: "User.Offense1", page: 1, caption: "I was convicted of the offense.", captionAt: { page: 1, y: 208 }, label: "I was convicted of the offense", section: S.CHARGE, ...ELECTION() },
    "User.Offense2": { field: "User.Offense2", page: 1, caption: "I had the charge deferred and it was then dismissed.", captionAt: { page: 1, y: 181 }, label: "I had the charge deferred and it was then dismissed", section: S.CHARGE, ...ELECTION() },
    "User.ChargeCaseNumber": { field: "User.ChargeCaseNumber", page: 1, caption: "Case number for charge or conviction", captionAt: { page: 1, y: 161 }, label: "Case number of the matter to be sealed", section: S.CHARGE, ...WRITE("matter.case_number") },
    "User.DateOfDisp": { field: "User.DateOfDisp", page: 1, caption: "Date of final disposition or conviction", captionAt: { page: 1, y: 143 }, label: "Date of final disposition or conviction for the charge to be sealed", section: S.CHARGE, ...SUPPLY("the date of final disposition or conviction, taken from your court record") },
    "User.ChargeDateOfArrest": { field: "User.ChargeDateOfArrest", page: 1, caption: "Date of arrest", captionAt: { page: 1, y: 126 }, label: "Date of arrest for the charge to be sealed", section: S.CHARGE, ...SUPPLY("the date you were arrested on this charge") },
    "User.Agency": { field: "User.Agency", page: 1, caption: "Name of arresting agency", captionAt: { page: 1, y: 109 }, label: "Name of the arresting agency for the charge to be sealed", section: S.CHARGE, ...SUPPLY("the name of the police or sheriff's department that arrested you on this charge") },
    "User.DCN": { field: "User.DCN", page: 1, caption: "Document control number (DCN), if available", captionAt: { page: 1, y: 91 }, label: "Document control number (DCN) for the charge to be sealed, if available", section: S.CHARGE, ...SUPPLY("the document control number (DCN) printed on your arrest paperwork, if you have it") },
    "User.CB4": { field: "User.CB4", page: 1, caption: "Some or all of the above information is not reasonably available because", captionAt: { page: 1, y: 74 }, label: "Some or all of the charge information above is not reasonably available", section: S.CHARGE, ...ELECTION() },
    "User.Reasonably": { field: "User.Reasonably", page: 1, caption: "Some or all of the above information is not reasonably available because", captionAt: { page: 1, y: 74 }, label: "Why the charge information above is not reasonably available", section: S.CHARGE, ...SUPPLY("why some of the charge information above is not reasonably available — only if you ticked that box") },
    "User.FullNameOfArrest": { field: "User.FullNameOfArrest", page: 1, caption: "My full name at time of arrest", captionAt: { page: 1, y: 34 }, label: "My full name when I was arrested on this charge", section: S.CHARGE, ...SUPPLY("the full name you were arrested under, if it is not the name you go by now") },
    "User.CB5": { field: "User.CB5", page: 1, caption: "Same as above", captionAt: { page: 1, y: 34 }, label: "My name when I was arrested is the same as above", section: S.CHARGE, ...ELECTION() },

    /* --- court of final disposition, charging document -------------------- */
    "User.CityOrCounty": { field: "User.CityOrCounty", page: 2, caption: "Court of final disposition", captionAt: { page: 2, y: 732 }, label: "City or county of the court of final disposition for the charge", section: S.CHARGE, ...SUPPLY("the city or county of the court that decided this charge") },
    "User.Court@p2y703x124": { field: "User.Court", page: 2, at: { y: 702.6, x: 123.6 }, caption: "Circuit Court", captionAt: { page: 2, y: 705 }, label: "Court of final disposition is a Circuit Court", section: S.CHARGE, ...ELECTION() },
    "User.Court@p2y702x201": { field: "User.Court", page: 2, at: { y: 702.4, x: 201.2 }, caption: "General District Court", captionAt: { page: 2, y: 705 }, label: "Court of final disposition is a General District Court", section: S.CHARGE, ...ELECTION() },
    "User.Court@p2y703x313": { field: "User.Court", page: 2, at: { y: 702.6, x: 312.7 }, caption: "Juvenile & Domestic Relations District Court", captionAt: { page: 2, y: 705 }, label: "Court of final disposition is a Juvenile and Domestic Relations District Court", section: S.CHARGE, ...ELECTION() },
    "User.CB1": { field: "User.CB1", page: 2, caption: "attached.", captionAt: { page: 2, y: 678 }, label: "A copy of the warrant, summons or indictment is attached", section: S.CHARGE, ...ELECTION() },
    "User.CB2": { field: "User.CB2", page: 2, caption: "not reasonably available because", captionAt: { page: 2, y: 665 }, label: "The warrant, summons or indictment is not reasonably available", section: S.CHARGE, ...ELECTION() },
    "User.WarrantSummons": { field: "User.WarrantSummons", page: 2, caption: "not reasonably available because", captionAt: { page: 2, y: 665 }, label: "Why the warrant, summons or indictment is not reasonably available", section: S.CHARGE, ...SUPPLY("why the warrant, summons or indictment is not reasonably available — only if you ticked that box") },

    /* --- C. ancillary matters -------------------------------------------- */
    "User.RequestSeal@p2y602": { field: "User.RequestSeal", page: 2, at: { y: 602.4, x: 72.2 }, caption: "I am NOT requesting to seal an ancillary matter related to the charge or conviction listed on page 1.", captionAt: { page: 2, y: 605 }, label: "I am NOT requesting to seal an ancillary matter", section: S.ANCILLARY, ...ELECTION() },
    "User.RequestSeal@p2y553": { field: "User.RequestSeal", page: 2, at: { y: 553.0, x: 71.9 }, caption: "I am requesting to seal an ancillary matter related to the charge or conviction listed on page 1. List", captionAt: { page: 2, y: 556 }, label: "I am requesting to seal an ancillary matter", section: S.ANCILLARY, ...ELECTION() },
    "User.AncillaryMatterSeal@p2y468": { field: "User.AncillaryMatterSeal", page: 2, at: { y: 468.3, x: 108.3 }, caption: "a violation or alleged violation of the terms and conditions of a suspended sentence,", captionAt: { page: 2, y: 471 }, label: "The ancillary matter is a violation of a suspended sentence, probation or parole", section: S.ANCILLARY, ...ELECTION() },
    "User.AncillaryMatterSeal@p2y441": { field: "User.AncillaryMatterSeal", page: 2, at: { y: 440.8, x: 108.5 }, caption: "a violation or alleged violation of contempt of court;", captionAt: { page: 2, y: 443 }, label: "The ancillary matter is a violation of contempt of court", section: S.ANCILLARY, ...ELECTION() },
    "User.AncillaryMatterSeal@p2y427": { field: "User.AncillaryMatterSeal", page: 2, at: { y: 427.3, x: 108.4 }, caption: "a charge or conviction for failure to appear; OR", captionAt: { page: 2, y: 430 }, label: "The ancillary matter is a failure to appear", section: S.ANCILLARY, ...ELECTION() },
    "User.AncillaryMatterSeal@p2y413": { field: "User.AncillaryMatterSeal", page: 2, at: { y: 413.3, x: 108.5 }, caption: "an appeal from a bail, bond, or recognizance order.", captionAt: { page: 2, y: 416 }, label: "The ancillary matter is an appeal from a bail, bond or recognizance order", section: S.ANCILLARY, ...ELECTION() },
    "User.AncillaryCaseNumber": { field: "User.AncillaryCaseNumber", page: 2, caption: "Case number for ancillary matter listed above", captionAt: { page: 2, y: 399 }, label: "Case number for the ancillary matter", section: S.ANCILLARY, ...SUPPLY("the case number of the ancillary matter — only if you are also sealing one") },
    "User.AncillaryDateOfDisp": { field: "User.AncillaryDateOfDisp", page: 2, caption: "Date of final disposition for ancillary matter", captionAt: { page: 2, y: 381 }, label: "Date of final disposition for the ancillary matter", section: S.ANCILLARY, ...SUPPLY("the date of final disposition of the ancillary matter — only if you are also sealing one") },
    "User.DateOfArrest": { field: "User.DateOfArrest", page: 2, at: { y: 363.4, x: 326.1 }, caption: "Date of arrest for ancillary matter (if applicable)", captionAt: { page: 2, y: 364 }, label: "Date of arrest for the ancillary matter", section: S.ANCILLARY, ...SUPPLY("the date of arrest on the ancillary matter, if there was one") },
    "User.AncillaryAgency": { field: "User.AncillaryAgency", page: 2, caption: "Name of arresting agency for ancillary matter (if applicable)", captionAt: { page: 2, y: 346 }, label: "Name of the arresting agency for the ancillary matter", section: S.ANCILLARY, ...SUPPLY("the arresting agency on the ancillary matter, if there was one") },
    "User.AncillaryDCN": { field: "User.AncillaryDCN", page: 2, caption: "Document control number (DCN), if available (if applicable)", captionAt: { page: 2, y: 329 }, label: "Document control number (DCN) for the ancillary matter, if available", section: S.ANCILLARY, ...SUPPLY("the document control number (DCN) for the ancillary matter, if you have it") },
    "User.CB6": { field: "User.CB6", page: 2, caption: "Some or all of the above information is not reasonably available because", captionAt: { page: 2, y: 316 }, label: "Some or all of the ancillary matter information above is not reasonably available", section: S.ANCILLARY, ...ELECTION() },
    "User.AncillaryReasonably": { field: "User.AncillaryReasonably", page: 2, caption: "Some or all of the above information is not reasonably available because", captionAt: { page: 2, y: 316 }, label: "Why the ancillary matter information above is not reasonably available", section: S.ANCILLARY, ...SUPPLY("why some of the ancillary matter information above is not reasonably available — only if you ticked that box") },
    "User.AncillaryFullNameOfArrest": { field: "User.AncillaryFullNameOfArrest", page: 2, caption: "Full name at time of ancillary matter", captionAt: { page: 2, y: 278 }, label: "My full name when the ancillary matter arose", section: S.ANCILLARY, ...SUPPLY("the full name you used when the ancillary matter arose, if it is not the name you go by now") },
    "User.CB7": { field: "User.CB7", page: 2, caption: "Same as on page 1", captionAt: { page: 2, y: 278 }, label: "My name on the ancillary matter is the same as on page 1", section: S.ANCILLARY, ...ELECTION() },
    "User.AncillaryCityOrCounty": { field: "User.AncillaryCityOrCounty", page: 2, caption: "Court of final disposition for ancillary matter", captionAt: { page: 2, y: 261 }, label: "City or county of the court of final disposition for the ancillary matter", section: S.ANCILLARY, ...SUPPLY("the city or county of the court that decided the ancillary matter") },
    "User.AncillaryCourt@p2y231x124": { field: "User.AncillaryCourt", page: 2, at: { y: 230.7, x: 123.5 }, caption: "Circuit Court", captionAt: { page: 2, y: 233 }, label: "Ancillary matter court of final disposition is a Circuit Court", section: S.ANCILLARY, ...ELECTION() },
    "User.AncillaryCourt@p2y231x201": { field: "User.AncillaryCourt", page: 2, at: { y: 230.8, x: 200.9 }, caption: "General District Court", captionAt: { page: 2, y: 233 }, label: "Ancillary matter court of final disposition is a General District Court", section: S.ANCILLARY, ...ELECTION() },
    "User.AncillaryCourt@p2y231x312": { field: "User.AncillaryCourt", page: 2, at: { y: 230.7, x: 312.4 }, caption: "Juvenile & Domestic Relations District Court", captionAt: { page: 2, y: 233 }, label: "Ancillary matter court of final disposition is a Juvenile and Domestic Relations District Court", section: S.ANCILLARY, ...ELECTION() },
    "User.CB8": { field: "User.CB8", page: 2, caption: "attached", captionAt: { page: 2, y: 203 }, label: "A copy of the charging document for the ancillary matter is attached", section: S.ANCILLARY, ...ELECTION() },
    "User.CB9": { field: "User.CB9", page: 2, caption: "not reasonably available because", captionAt: { page: 2, y: 189 }, label: "The charging document for the ancillary matter is not reasonably available", section: S.ANCILLARY, ...ELECTION() },
    "User.AncillaryChargeDoc": { field: "User.AncillaryChargeDoc", page: 2, caption: "not reasonably available because", captionAt: { page: 2, y: 189 }, label: "Why the charging document for the ancillary matter is not reasonably available", section: S.ANCILLARY, ...SUPPLY("why the charging document for the ancillary matter is not reasonably available — only if you ticked that box") },

    /* --- D. sealing eligibility ------------------------------------------ */
    "User.CB10": { field: "User.CB10", page: 2, caption: "I have never been convicted of a Class 1 or 2 felony, or any other felony punishable by life in", captionAt: { page: 2, y: 106 }, label: "I have never been convicted of a Class 1 or 2 felony or a felony punishable by life in prison", section: S.ELIGIBILITY, ...ELECTION() },
    "User.CB11": { field: "User.CB11", page: 2, caption: "I have not been convicted of a Class 3 or 4 felony within the past 20 years.", captionAt: { page: 2, y: 79 }, label: "I have not been convicted of a Class 3 or 4 felony within the past 20 years", section: S.ELIGIBILITY, ...ELECTION() },
    "User.CB12": { field: "User.CB12", page: 2, caption: "I have not been convicted of any other felony within the past 10 years.", captionAt: { page: 2, y: 65 }, label: "I have not been convicted of any other felony within the past 10 years", section: S.ELIGIBILITY, ...ELECTION() },
    "User.DeferredCharge@p3y702": { field: "User.DeferredCharge", page: 3, at: { y: 701.9, x: 107.9 }, caption: "The deferred charge against me was dismissed. Date of dismissal:", captionAt: { page: 3, y: 705 }, label: "The deferred charge against me was dismissed", section: S.ELIGIBILITY, ...ELECTION() },
    "User.DateOfDismissal": { field: "User.DateOfDismissal", page: 3, caption: "Date of dismissal", captionAt: { page: 3, y: 705 }, label: "Date the deferred charge was dismissed", section: S.ELIGIBILITY, ...SUPPLY("the date the deferred charge was dismissed — only if that is how your case ended") },
    "User.DeferredCharge@p3y667": { field: "User.DeferredCharge", page: 3, at: { y: 667.2, x: 107.8 }, caption: "I was convicted and", captionAt: { page: 3, y: 670 }, label: "I was convicted", section: S.ELIGIBILITY, ...ELECTION() },
    "User.Sentenced@p3y650": { field: "User.Sentenced", page: 3, at: { y: 650.4, x: 130.5 }, caption: "I was not sentenced to any term of incarceration. Date of conviction:", captionAt: { page: 3, y: 653 }, label: "I was not sentenced to any term of incarceration", section: S.ELIGIBILITY, ...ELECTION() },
    "User.DateOfConviction": { field: "User.DateOfConviction", page: 3, caption: "Date of conviction", captionAt: { page: 3, y: 653 }, label: "Date of conviction", section: S.ELIGIBILITY, ...SUPPLY("the date you were convicted, from your judgment order or docket sheet") },
    "User.Sentenced@p3y616": { field: "User.Sentenced", page: 3, at: { y: 615.6, x: 130.4 }, caption: "I was sentenced to a term of incarceration. Date released from incarceration:", captionAt: { page: 3, y: 618 }, label: "I was sentenced to a term of incarceration", section: S.ELIGIBILITY, ...ELECTION() },
    "User.DateOfIncarceration": { field: "User.DateOfIncarceration", page: 3, caption: "Date released from incarceration", captionAt: { page: 3, y: 618 }, label: "Date released from incarceration", section: S.ELIGIBILITY, ...SUPPLY("the date you were released from incarceration — only if you were sentenced to a term of it") },
    "User.CB13": { field: "User.CB13", page: 3, caption: "After my conviction, I was later found in violation of my suspended sentence, probation,", captionAt: { page: 3, y: 585 }, label: "After my conviction I was later found in violation of a suspended sentence, probation or parole", section: S.ELIGIBILITY, ...ELECTION() },
    "User.IncarcerationSentenced@p3y552": { field: "User.IncarcerationSentenced", page: 3, at: { y: 551.5, x: 161.6 }, caption: "I was not sentenced to any term of incarceration.", captionAt: { page: 3, y: 554 }, label: "On that violation I was not sentenced to any term of incarceration", section: S.ELIGIBILITY, ...ELECTION() },
    "User.IncarcerationSentenced@p3y519": { field: "User.IncarcerationSentenced", page: 3, at: { y: 519.1, x: 161.8 }, caption: "I was sentenced to a term of incarceration. Date released from", captionAt: { page: 3, y: 522 }, label: "On that violation I was sentenced to a term of incarceration", section: S.ELIGIBILITY, ...ELECTION() },
    "User.DateOfIncarceration1": { field: "User.DateOfIncarceration1", page: 3, caption: "incarceration", captionAt: { page: 3, y: 507 }, label: "Date released from incarceration after the violation", section: S.ELIGIBILITY, ...SUPPLY("the date you were released from incarceration imposed for that violation") },
    "User.Alcohol@p3y458": { field: "User.Alcohol", page: 3, at: { y: 457.5, x: 108.0 }, caption: "The charge(s) or conviction(s) to be sealed did not involve the use or dependence on", captionAt: { page: 3, y: 460 }, label: "The charge did not involve alcohol, a narcotic drug or a self-administered intoxicant", section: S.ELIGIBILITY, ...ELECTION() },
    "User.Alcohol@p3y417": { field: "User.Alcohol", page: 3, at: { y: 416.6, x: 107.5 }, caption: "The charge(s) or conviction(s) to be sealed did involve the use or dependence on alcohol,", captionAt: { page: 3, y: 419 }, label: "The charge did involve alcohol or drugs and I have been rehabilitated", section: S.ELIGIBILITY, ...ELECTION() },
    "User.CB14": { field: "User.CB14", page: 3, caption: "I was not ordered to pay restitution for the charge(s) or conviction(s) to be sealed.", captionAt: { page: 3, y: 359 }, label: "I was not ordered to pay restitution", section: S.ELIGIBILITY, ...ELECTION() },
    "User.CB15": { field: "User.CB15", page: 3, caption: "I was ordered to pay restitution for the charge(s) or conviction(s) to be sealed, and I have", captionAt: { page: 3, y: 345 }, label: "I was ordered to pay restitution and have paid it in full", section: S.ELIGIBILITY, ...ELECTION() },
    "User.CB16": { field: "User.CB16", page: 3, caption: "I have not had a sealing petition previously granted under the petition process in Va. Code", captionAt: { page: 3, y: 284 }, label: "I have not had a sealing petition previously granted", section: S.ELIGIBILITY, ...ELECTION() },
    "User.CB17": { field: "User.CB17", page: 3, caption: "I have had a sealing petition previously granted under the petition process in Va. Code", captionAt: { page: 3, y: 257 }, label: "I have had a sealing petition previously granted", section: S.ELIGIBILITY, ...ELECTION() },
    "User.NumberOfPetitions@p3y241x395": { field: "User.NumberOfPetitions", page: 3, at: { y: 240.5, x: 394.8 }, caption: "Number of petitions previously granted", captionAt: { page: 3, y: 243 }, label: "Number of petitions previously granted is One", section: S.ELIGIBILITY, ...ELECTION() },
    "User.NumberOfPetitions@p3y240x437": { field: "User.NumberOfPetitions", page: 3, at: { y: 240.4, x: 436.6 }, caption: "Number of petitions previously granted", captionAt: { page: 3, y: 243 }, label: "Number of petitions previously granted is Two", section: S.ELIGIBILITY, ...ELECTION() },

    /* --- E. acknowledgments ---------------------------------------------- */
    "User.CB18": { field: "User.CB18", page: 3, caption: "I understand that I am required to provide a copy of this petition by delivery or by first-class", captionAt: { page: 3, y: 169 }, label: "I acknowledge I must provide a copy of this petition to the Commonwealth's Attorney", section: S.ACK, ...ELECTION() },
    "User.CB19": { field: "User.CB19", page: 3, caption: "I understand that after this petition is filed, I am required to request that the Central Criminal", captionAt: { page: 3, y: 120 }, label: "I acknowledge I must ask the CCRE to forward my criminal history record to the court", section: S.ACK, ...ELECTION() },
    "User.CB20": { field: "User.CB20", page: 3, caption: "I understand that my petition may be denied, with or without a hearing, if the charge(s),", captionAt: { page: 3, y: 58 }, label: "I acknowledge my petition may be denied if the charge is not eligible for sealing", section: S.ACK, ...ELECTION() },
    "User.CB21": { field: "User.CB21", page: 4, caption: "I understand that if my petition for sealing is granted, it will not restore my civil rights or", captionAt: { page: 4, y: 707 }, label: "I acknowledge sealing will not restore my civil rights or firearm rights", section: S.ACK, ...ELECTION() },
    "User.CB22": { field: "User.CB22", page: 4, caption: "I understand that if my petition for sealing is granted, I will still be required to pay any", captionAt: { page: 4, y: 673 }, label: "I acknowledge I must still pay outstanding fines, costs, forfeitures and penalties", section: S.ACK, ...ELECTION() },
    "User.CB23": { field: "User.CB23", page: 4, caption: "ADDENDUM. I am requesting to seal multiple charges, convictions or ancillary matters, and I have", captionAt: { page: 4, y: 610 }, label: "I am attaching a CC-1201(A) addendum", section: S.ACK, ...ELECTION() },
    "User.CaseNumber1201": { field: "User.CaseNumber1201", page: 4, caption: "addendums are attached to this petition and are incorporated herein", captionAt: { page: 4, y: 580 }, label: "How many CC-1201(A) addendum pages are attached", section: S.ACK, ...SUPPLY("how many CC-1201(A) addendum pages you are attaching — only if you ticked the ADDENDUM box") },

    /* --- signature block -------------------------------------------------- */
    "User.DateSigned2": { field: "User.DateSigned2", page: 4, caption: "DATE", captionAt: { page: 4, y: 461 }, label: "Date of signature", section: S.SIGN, ...PROTECT(SIGNATURE) },
    "User.SignaturePetitioner1": { field: "User.SignaturePetitioner1", page: 4, caption: "SIGNATURE OF", captionAt: { page: 4, y: 457 }, label: "The signature on this petition is the Petitioner's", section: S.SIGN, ...SELECT("this packet is prepared for the petitioner to file without counsel, so the petitioner signs it") },
    "User.SignatureAttorney1": { field: "User.SignatureAttorney1", page: 4, caption: "ATTORNEY FOR PETITIONER (VSB No.", captionAt: { page: 4, y: 448 }, label: "The signature on this petition is the attorney's", section: S.SIGN, ...OFFROUTE("attorney-only; no representation fact is held for this participant") },
    "User.VSBCaseNumber": { field: "User.VSBCaseNumber", page: 4, caption: "VSB No.", captionAt: { page: 4, y: 448 }, label: "VSB number of the attorney for the petitioner", section: S.SIGN, ...OFFROUTE("attorney-only; no representation fact is held for this participant") },
    "User.PrintedNameOfPetAtt": { field: "User.PrintedNameOfPetAtt", page: 4, caption: "PRINTED NAME OF", captionAt: { page: 4, y: 406 }, label: "Printed name of the petitioner", section: S.SIGN, ...WRITE("participant.full_legal_name") },
    "User.NamePetitioner": { field: "User.NamePetitioner", page: 4, caption: "PRINTED NAME OF", captionAt: { page: 4, y: 406 }, label: "The printed name given is the Petitioner's", section: S.SIGN, ...SELECT("the name printed in this block is the petitioner's, because this packet is filed without counsel") },
    "User.NameAttorney": { field: "User.NameAttorney", page: 4, caption: "ATTORNEY FOR PETITIONER", captionAt: { page: 4, y: 397 }, label: "The printed name given is the attorney's", section: S.SIGN, ...OFFROUTE("attorney-only; no representation fact is held for this participant") },
    "User.AddressOfPetAtt": { field: "User.AddressOfPetAtt", page: 4, caption: "ADDRESS OF", captionAt: { page: 4, y: 402 }, label: "Address of the petitioner", section: S.SIGN, ...WRITE("participant.street_address") },
    "User.AddressPetitioner": { field: "User.AddressPetitioner", page: 4, caption: "ADDRESS OF", captionAt: { page: 4, y: 402 }, label: "The address given is the Petitioner's", section: S.SIGN, ...SELECT("the address in this block is the petitioner's, because this packet is filed without counsel") },
    "User.AddressAttorney": { field: "User.AddressAttorney", page: 4, caption: "ATTORNEY FOR PETITIONER", captionAt: { page: 4, y: 393 }, label: "The address given is the attorney's", section: S.SIGN, ...OFFROUTE("attorney-only; no representation fact is held for this participant") },
    "User.HomePhoneOfPetAtt": { field: "User.HomePhoneOfPetAtt", page: 4, caption: "TELEPHONE NUMBER OF", captionAt: { page: 4, y: 342 }, label: "Telephone number of the petitioner", section: S.SIGN, ...WRITE("participant.phone") },
    "User.TelephonePetitioner": { field: "User.TelephonePetitioner", page: 4, caption: "TELEPHONE NUMBER OF", captionAt: { page: 4, y: 342 }, label: "The telephone number given is the Petitioner's", section: S.SIGN, ...SELECT("the telephone number in this block is the petitioner's, because this packet is filed without counsel") },
    "User.TelephoneAttorney": { field: "User.TelephoneAttorney", page: 4, caption: "ATTORNEY FOR PETITIONER", captionAt: { page: 4, y: 333 }, label: "The telephone number given is the attorney's", section: S.SIGN, ...OFFROUTE("attorney-only; no representation fact is held for this participant") },
    "User.CityOfPetAtt": { field: "User.CityOfPetAtt", page: 4, caption: "CITY, STATE, ZIP OF", captionAt: { page: 4, y: 342 }, label: "City, state and ZIP of the petitioner", section: S.SIGN, ...WRITE("participant.city") },
    "User.CityPetitioner": { field: "User.CityPetitioner", page: 4, caption: "CITY, STATE, ZIP OF", captionAt: { page: 4, y: 342 }, label: "The city, state and ZIP given is the Petitioner's", section: S.SIGN, ...SELECT("the city, state and ZIP in this block is the petitioner's, because this packet is filed without counsel") },
    "User.CityAttorney": { field: "User.CityAttorney", page: 4, caption: "ATTORNEY FOR PETITIONER", captionAt: { page: 4, y: 333 }, label: "The city, state and ZIP given is the attorney's", section: S.SIGN, ...OFFROUTE("attorney-only; no representation fact is held for this participant") },
    "User.EmailOfPetAtt": { field: "User.EmailOfPetAtt", page: 4, caption: "EMAIL ADDRESS OF", captionAt: { page: 4, y: 292 }, label: "Email address of the petitioner", section: S.SIGN, ...WRITE("participant.email") },
    "User.EmailPetitioner": { field: "User.EmailPetitioner", page: 4, caption: "EMAIL ADDRESS OF", captionAt: { page: 4, y: 292 }, label: "The email address given is the Petitioner's", section: S.SIGN, ...SELECT("the email address in this block is the petitioner's, because this packet is filed without counsel") },
    "User.EmailAttorney": { field: "User.EmailAttorney", page: 4, caption: "ATTORNEY FOR PETITIONER", captionAt: { page: 4, y: 283 }, label: "The email address given is the attorney's", section: S.SIGN, ...OFFROUTE("attorney-only; no representation fact is held for this participant") }
  }
};

/* ------------------------------------------------------------------ *
 * CC-1203 -- PETITION FOR SEALING PURSUANT TO VA. CODE § 19.2-392.12:1(A) AND/OR (B)
 *
 * One printed form, two statutory routes, and each route uses a different half
 * of it. Section A (pages 2-3) belongs to § 19.2-392.12:1(A); Section B
 * (pages 4-5) belongs to § 19.2-392.12:1(B). The acknowledgments and the
 * signature block are common to both. A family switches the half it does not
 * use off by section, and every widget in it is refused as a branch this route
 * does not take -- never left unclassified and never quietly blank.
 *
 * Every widget name on this form is unique, so the dictionary key is the name.
 * ------------------------------------------------------------------ */
const CC1203 = {
  title: "Petition for Sealing Pursuant to Va. Code § 19.2-392.12:1(A) and/or (B)",
  pages: 6,
  statute: "Va. Code § 19.2-392.12:1",
  fields: {
    "ResetButton": { field: "ResetButton", page: 1, caption: null, captionAt: null, label: "Reset this form (viewer control)", section: S.VIEWER, ...OFFROUTE("a viewer control the reader clicks, never a filing fact") },

    /* --- caption, route election and my information ----------------------- */
    "User.CaseNo": { field: "User.CaseNo", page: 1, caption: "Case Number", captionAt: { page: 1, y: 725 }, label: "Case Number of this petition (the circuit court clerk assigns it at filing)", section: S.HEADER, ...PROTECT(COURT_OWNED) },
    "User.CourtName": { field: "User.CourtName", page: 1, caption: "CITY OR COUNTY", captionAt: { page: 1, y: 607 }, label: "Circuit Court city or county where this petition is filed", section: S.HEADER, ...WRITE("matter.court") },
    "UserPetitionerName": { field: "UserPetitionerName", page: 1, caption: "NAME OF PETITIONER", captionAt: { page: 1, y: 574 }, label: "Name of Petitioner in the style of the case", section: S.HEADER, ...WRITE("participant.full_legal_name") },
    "User.AdditionCharge1": { field: "User.AdditionCharge1", page: 1, caption: "This petition is being filed pursuant to Va. Code § 19.2-392.12:1(A), because I was convicted of the", captionAt: { page: 1, y: 490 }, label: "This petition is filed under Va. Code § 19.2-392.12:1(A)", section: S.HEADER, ...ELECTION() },
    "User.AdditionCharge2": { field: "User.AdditionCharge2", page: 1, caption: "This petition is being filed pursuant to Va. Code § 19.2-392.12:1(B), because I had a charge or", captionAt: { page: 1, y: 394 }, label: "This petition is filed under Va. Code § 19.2-392.12:1(B)", section: S.HEADER, ...ELECTION() },
    "User.FullName": { field: "User.FullName", page: 1, caption: "My full name is", captionAt: { page: 1, y: 288 }, label: "My full name is", section: S.HEADER, ...WRITE("participant.full_legal_name") },
    "User.DateOfBirth": { field: "User.DateOfBirth", page: 1, caption: "My date of birth is", captionAt: { page: 1, y: 261 }, label: "My date of birth is", section: S.HEADER, ...WRITE("participant.date_of_birth") },
    "User.Sex": { field: "User.Sex", page: 1, caption: "My sex is", captionAt: { page: 1, y: 261 }, label: "My sex is, as it appears on the court record", section: S.HEADER, ...SUPPLY("your sex as it appears on the court record") },
    "User.Race": { field: "User.Race", page: 1, caption: "My race is", captionAt: { page: 1, y: 232 }, label: "My race is, as it appears on the court record", section: S.HEADER, ...SUPPLY("your race as it appears on the court record") },
    "User.SSN": { field: "User.SSN", page: 1, caption: "My social security number is", captionAt: { page: 1, y: 232 }, label: "My social security number is", section: S.HEADER, ...SUPPLY("your Social Security number — the platform never stores it and never writes it for you") },

    /* --- SECTION A, PART 1: § 19.2-392.12:1(A) ---------------------------- */
    "User.CB1": { field: "User.CB1", page: 2, caption: "I am requesting to seal a single charge or conviction", captionAt: { page: 2, y: 667 }, label: "I am requesting to seal a single charge or conviction", section: S.A1, ...ELECTION() },
    "User.CB2": { field: "User.CB2", page: 2, caption: "I am requesting to seal more than one charge or conviction", captionAt: { page: 2, y: 635 }, label: "I am requesting to seal more than one charge or conviction", section: S.A1, ...ELECTION() },
    "User.CB3": { field: "User.CB3", page: 2, caption: "was convicted", captionAt: { page: 2, y: 562 }, label: "I was convicted of the enumerated offense", section: S.A1, ...ELECTION() },
    "User.CB4": { field: "User.CB4", page: 2, caption: "had the charge deferred and then dismissed", captionAt: { page: 2, y: 562 }, label: "I had the enumerated charge deferred and then dismissed", section: S.A1, ...ELECTION() },
    "User.CB5": { field: "User.CB5", page: 2, caption: "§ 4.1-305, Purchasing or possessing alcoholic beverages", captionAt: { page: 2, y: 529 }, label: "The enumerated offense is § 4.1-305, purchasing or possessing alcoholic beverages", section: S.A1, ...ELECTION() },
    "User.CB6": { field: "User.CB6", page: 2, caption: "§ 18.2-96, Petit larceny (misdemeanor only)", captionAt: { page: 2, y: 515 }, label: "The enumerated offense is § 18.2-96, petit larceny", section: S.A1, ...ELECTION() },
    "User.CB7": { field: "User.CB7", page: 2, caption: "§ 18.2-103, Concealing or taking possession of merchandise (misdemeanor only)", captionAt: { page: 2, y: 501 }, label: "The enumerated offense is § 18.2-103, concealing or taking possession of merchandise", section: S.A1, ...ELECTION() },
    "User.CB8": { field: "User.CB8", page: 2, caption: "§ 18.2-119, Trespass", captionAt: { page: 2, y: 488 }, label: "The enumerated offense is § 18.2-119, trespass", section: S.A1, ...ELECTION() },
    "User.CB9": { field: "User.CB9", page: 2, caption: "§ 18.2-120, Instigating trespass by others", captionAt: { page: 2, y: 474 }, label: "The enumerated offense is § 18.2-120, instigating trespass by others", section: S.A1, ...ELECTION() },
    "User.CB10": { field: "User.CB10", page: 2, caption: "§ 18.2-134, Trespassing on posted property to hunt, fish or trap", captionAt: { page: 2, y: 460 }, label: "The enumerated offense is § 18.2-134, trespassing on posted property", section: S.A1, ...ELECTION() },
    "User.CB11": { field: "User.CB11", page: 2, caption: "§ 18.2-248.1, Sale, gift distribution or possession with intent to sell, give or distribute", captionAt: { page: 2, y: 447 }, label: "The enumerated offense is § 18.2-248.1, distribution of marijuana", section: S.A1, ...ELECTION() },
    "User.CB12": { field: "User.CB12", page: 2, caption: "§ 18.2-265.3(A), Sale or possession with intent to sell drug paraphernalia", captionAt: { page: 2, y: 420 }, label: "The enumerated offense is § 18.2-265.3(A), drug paraphernalia", section: S.A1, ...ELECTION() },
    "User.CB13": { field: "User.CB13", page: 2, caption: "§ 18.2-415, Disorderly conduct in public places", captionAt: { page: 2, y: 406 }, label: "The enumerated offense is § 18.2-415, disorderly conduct in public places", section: S.A1, ...ELECTION() },
    "User.ChargeCaseNumber": { field: "User.ChargeCaseNumber", page: 2, caption: "Case number for charge or conviction", captionAt: { page: 2, y: 382 }, label: "Case number of the matter to be sealed", section: S.A1, ...WRITE("matter.case_number") },
    "User.DateOfDisp": { field: "User.DateOfDisp", page: 2, caption: "Date of final disposition of charge or conviction", captionAt: { page: 2, y: 365 }, label: "Date of final disposition of the charge or conviction", section: S.A1, ...SUPPLY("the date of final disposition or conviction, taken from your court record") },
    "User.DateOfArrest": { field: "User.DateOfArrest", page: 2, caption: "Date of arrest", captionAt: { page: 2, y: 348 }, label: "Date of arrest for the charge to be sealed", section: S.A1, ...SUPPLY("the date you were arrested on this charge") },
    "User.Agency": { field: "User.Agency", page: 2, caption: "Name of arresting agency", captionAt: { page: 2, y: 330 }, label: "Name of the arresting agency for the charge to be sealed", section: S.A1, ...SUPPLY("the name of the police or sheriff's department that arrested you on this charge") },
    "User.DCN": { field: "User.DCN", page: 2, caption: "Document Control Number (DCN), if available", captionAt: { page: 2, y: 313 }, label: "Document control number (DCN) for the charge to be sealed, if available", section: S.A1, ...SUPPLY("the document control number (DCN) printed on your arrest paperwork, if you have it") },
    "User.CB14": { field: "User.CB14", page: 2, caption: "Some or all of the above information is not reasonably available because", captionAt: { page: 2, y: 295 }, label: "Some or all of the charge information above is not reasonably available", section: S.A1, ...ELECTION() },
    "User.Reasonably": { field: "User.Reasonably", page: 2, caption: "Some or all of the above information is not reasonably available because", captionAt: { page: 2, y: 295 }, label: "Why the charge information above is not reasonably available", section: S.A1, ...SUPPLY("why some of the charge information above is not reasonably available — only if you ticked that box") },
    "User.FullNameOfArrest": { field: "User.FullNameOfArrest", page: 2, caption: "Full name at time of arrest", captionAt: { page: 2, y: 255 }, label: "My full name when I was arrested on this charge", section: S.A1, ...SUPPLY("the full name you were arrested under, if it is not the name you go by now") },
    "User.CityOrCounty": { field: "User.CityOrCounty", page: 2, caption: "Court of final disposition", captionAt: { page: 2, y: 237 }, label: "City or county of the court of final disposition for the charge", section: S.A1, ...SUPPLY("the city or county of the court that decided this charge") },
    "User.CCourt": { field: "User.CCourt", page: 2, caption: "Circuit Court", captionAt: { page: 2, y: 207 }, label: "Court of final disposition is a Circuit Court", section: S.A1, ...ELECTION() },
    "User.GDCourt": { field: "User.GDCourt", page: 2, caption: "General District Court", captionAt: { page: 2, y: 207 }, label: "Court of final disposition is a General District Court", section: S.A1, ...ELECTION() },
    "User.JDCourt": { field: "User.JDCourt", page: 2, caption: "Juvenile & Domestic Relations District Court", captionAt: { page: 2, y: 207 }, label: "Court of final disposition is a Juvenile and Domestic Relations District Court", section: S.A1, ...ELECTION() },
    "User.CB15": { field: "User.CB15", page: 2, caption: "attached.", captionAt: { page: 2, y: 165 }, label: "A copy of the warrant, summons or indictment is attached", section: S.A1, ...ELECTION() },
    "User.CB16": { field: "User.CB16", page: 2, caption: "not reasonably available because", captionAt: { page: 2, y: 150 }, label: "The warrant, summons or indictment is not reasonably available", section: S.A1, ...ELECTION() },
    "User.WarrantSummons": { field: "User.WarrantSummons", page: 2, caption: "not reasonably available because", captionAt: { page: 2, y: 150 }, label: "Why the warrant, summons or indictment is not reasonably available", section: S.A1, ...SUPPLY("why the warrant, summons or indictment is not reasonably available — only if you ticked that box") },

    /* --- SECTION A, PART 2: ancillary matter on the (A) route ------------- */
    "User.CB17": { field: "User.CB17", page: 3, caption: "I am not requesting to seal any ancillary matters related to the charge or conviction to be sealed in", captionAt: { page: 3, y: 671 }, label: "I am NOT requesting to seal an ancillary matter on this route", section: S.A2, ...ELECTION() },
    "User.CB18": { field: "User.CB18", page: 3, caption: "I am requesting to seal an ancillary matter related to the charge or conviction to be sealed in Section", captionAt: { page: 3, y: 625 }, label: "I am requesting to seal an ancillary matter on this route", section: S.A2, ...ELECTION() },
    "User.CB19": { field: "User.CB19", page: 3, caption: "a violation or alleged violation of the terms and conditions of a suspended sentence,", captionAt: { page: 3, y: 529 }, label: "The ancillary matter is a violation of a suspended sentence, probation or parole", section: S.A2, ...ELECTION() },
    "User.CB20": { field: "User.CB20", page: 3, caption: "a violation or alleged violation of contempt of court;", captionAt: { page: 3, y: 502 }, label: "The ancillary matter is a violation of contempt of court", section: S.A2, ...ELECTION() },
    "User.CB21": { field: "User.CB21", page: 3, caption: "a charge or conviction for failure to appear; OR", captionAt: { page: 3, y: 488 }, label: "The ancillary matter is a failure to appear", section: S.A2, ...ELECTION() },
    "User.CB22": { field: "User.CB22", page: 3, caption: "an appeal from a bail, bond, or recognizance order.", captionAt: { page: 3, y: 475 }, label: "The ancillary matter is an appeal from a bail, bond or recognizance order", section: S.A2, ...ELECTION() },
    "User.AncillaryCaseNumber": { field: "User.AncillaryCaseNumber", page: 3, caption: "Case number for ancillary matter identified above", captionAt: { page: 3, y: 451 }, label: "Case number for the ancillary matter on this route", section: S.A2, ...SUPPLY("the case number of the ancillary matter — only if you are also sealing one") },
    "User.AncillaryDateOfDisp": { field: "User.AncillaryDateOfDisp", page: 3, caption: "Date of final disposition for ancillary matter", captionAt: { page: 3, y: 435 }, label: "Date of final disposition for the ancillary matter on this route", section: S.A2, ...SUPPLY("the date of final disposition of the ancillary matter — only if you are also sealing one") },
    "User.AncillaryDateOfArrest": { field: "User.AncillaryDateOfArrest", page: 3, caption: "Date of arrest for ancillary matter (if applicable)", captionAt: { page: 3, y: 419 }, label: "Date of arrest for the ancillary matter on this route", section: S.A2, ...SUPPLY("the date of arrest on the ancillary matter, if there was one") },
    "User.AncillaryAgency": { field: "User.AncillaryAgency", page: 3, caption: "Name of arresting agency for ancillary matter (if applicable)", captionAt: { page: 3, y: 403 }, label: "Name of the arresting agency for the ancillary matter on this route", section: S.A2, ...SUPPLY("the arresting agency on the ancillary matter, if there was one") },
    "User.AncillaryDCN": { field: "User.AncillaryDCN", page: 3, caption: "Document Control Number (DCN), if available (if applicable)", captionAt: { page: 3, y: 387 }, label: "Document control number (DCN) for the ancillary matter on this route", section: S.A2, ...SUPPLY("the document control number (DCN) for the ancillary matter, if you have it") },
    "User.CB23": { field: "User.CB23", page: 3, caption: "Some or all of the above information is not reasonably available because", captionAt: { page: 3, y: 371 }, label: "Some or all of the ancillary matter information above is not reasonably available", section: S.A2, ...ELECTION() },
    "User.AncillaryReasonably": { field: "User.AncillaryReasonably", page: 3, caption: "Some or all of the above information is not reasonably available because", captionAt: { page: 3, y: 371 }, label: "Why the ancillary matter information above is not reasonably available", section: S.A2, ...SUPPLY("why some of the ancillary matter information above is not reasonably available — only if you ticked that box") },
    "User.AncillaryFullNameOfArrest": { field: "User.AncillaryFullNameOfArrest", page: 3, caption: "Full name at time of ancillary matter", captionAt: { page: 3, y: 332 }, label: "My full name when the ancillary matter arose", section: S.A2, ...SUPPLY("the full name you used when the ancillary matter arose, if it is not the name you go by now") },
    "User.AncillaryCityOrCounty": { field: "User.AncillaryCityOrCounty", page: 3, caption: "Court of final disposition for ancillary matter", captionAt: { page: 3, y: 313 }, label: "City or county of the court of final disposition for the ancillary matter", section: S.A2, ...SUPPLY("the city or county of the court that decided the ancillary matter") },
    "User.AncillaryCCourt": { field: "User.AncillaryCCourt", page: 3, caption: "Circuit Court", captionAt: { page: 3, y: 290 }, label: "Ancillary matter court of final disposition is a Circuit Court", section: S.A2, ...ELECTION() },
    "User.AncillaryGDCourt": { field: "User.AncillaryGDCourt", page: 3, caption: "General District Court", captionAt: { page: 3, y: 290 }, label: "Ancillary matter court of final disposition is a General District Court", section: S.A2, ...ELECTION() },
    "User.AncillaryJDCourt": { field: "User.AncillaryJDCourt", page: 3, caption: "Juvenile & Domestic Relations District Court", captionAt: { page: 3, y: 290 }, label: "Ancillary matter court of final disposition is a Juvenile and Domestic Relations District Court", section: S.A2, ...ELECTION() },
    "User.CB24": { field: "User.CB24", page: 3, caption: "attached.", captionAt: { page: 3, y: 256 }, label: "A copy of the charging document for the ancillary matter is attached", section: S.A2, ...ELECTION() },
    "User.CB25": { field: "User.CB25", page: 3, caption: "not reasonably available because", captionAt: { page: 3, y: 242 }, label: "The charging document for the ancillary matter is not reasonably available", section: S.A2, ...ELECTION() },
    "User.AncillaryWarrantSummons": { field: "User.AncillaryWarrantSummons", page: 3, caption: "not reasonably available because", captionAt: { page: 3, y: 242 }, label: "Why the charging document for the ancillary matter is not reasonably available", section: S.A2, ...SUPPLY("why the charging document for the ancillary matter is not reasonably available — only if you ticked that box") },

    /* --- SECTION B: § 19.2-392.12:1(B), first ancillary matter ------------ */
    "User.CB26": { field: "User.CB26", page: 4, caption: "conviction(s) or offense(s) automatically sealed pursuant to §§ 19.2-392.7 or", captionAt: { page: 4, y: 647 }, label: "The sealed charge was automatically sealed under § 19.2-392.7 or § 19.2-392.11", section: S.B1, ...ELECTION() },
    "User.CB27": { field: "User.CB27", page: 4, caption: "an offense sealed pursuant to § 19.2-392.6:1 where a criminal or civil offense", captionAt: { page: 4, y: 615 }, label: "The sealed charge was sealed under § 19.2-392.6:1 as a former § 18.2-250.1 marijuana matter", section: S.B1, ...ELECTION() },
    "User.AncillaryCaseDesc": { field: "User.AncillaryCaseDesc", page: 4, caption: "CASE NUMBER (IF AVAILABLE) AND DESCRIPTION OF OFFENSE", captionAt: { page: 4, y: 495 }, label: "Case number and description of the offense that was already sealed", section: S.B1, ...SUPPLY("the case number, if you have it, and a description of the offence that was already sealed — the platform holds the ancillary matter's own case number but not the sealed offence's description") },
    "User.CB28": { field: "User.CB28", page: 4, caption: "a violation or alleged violation of the terms and conditions of a suspended sentence,", captionAt: { page: 4, y: 454 }, label: "The ancillary matter is a violation of a suspended sentence, probation or parole", section: S.B1, ...ELECTION() },
    "User.CB29": { field: "User.CB29", page: 4, caption: "a violation or alleged violation of contempt of court;", captionAt: { page: 4, y: 427 }, label: "The ancillary matter is a violation of contempt of court", section: S.B1, ...ELECTION() },
    "User.CB30": { field: "User.CB30", page: 4, caption: "a charge or conviction for failure to appear; OR", captionAt: { page: 4, y: 413 }, label: "The ancillary matter is a failure to appear", section: S.B1, ...ELECTION() },
    "User.CB31": { field: "User.CB31", page: 4, caption: "an appeal from a bail, bond, or recognizance order.", captionAt: { page: 4, y: 400 }, label: "The ancillary matter is an appeal from a bail, bond or recognizance order", section: S.B1, ...ELECTION() },
    "User.AncillaryCaseNumberA": { field: "User.AncillaryCaseNumberA", page: 4, caption: "Case number for ancillary matter identified above", captionAt: { page: 4, y: 380 }, label: "Case number for the ancillary matter to be sealed", section: S.B1, ...WRITE("matter.case_number") },
    "User.AncillaryDateOfDispA": { field: "User.AncillaryDateOfDispA", page: 4, caption: "Date of final disposition for ancillary matter", captionAt: { page: 4, y: 364 }, label: "Date of final disposition for the ancillary matter to be sealed", section: S.B1, ...SUPPLY("the date of final disposition of the ancillary matter, taken from your court record") },
    "User.AncillaryDateOfArrestA": { field: "User.AncillaryDateOfArrestA", page: 4, caption: "Date of arrest for ancillary matter (if applicable)", captionAt: { page: 4, y: 348 }, label: "Date of arrest for the ancillary matter to be sealed", section: S.B1, ...SUPPLY("the date of arrest on the ancillary matter, if there was one") },
    "User.AncillaryAgencyA": { field: "User.AncillaryAgencyA", page: 4, caption: "Name of arresting agency for ancillary matter (if applicable)", captionAt: { page: 4, y: 332 }, label: "Name of the arresting agency for the ancillary matter to be sealed", section: S.B1, ...SUPPLY("the arresting agency on the ancillary matter, if there was one") },
    "User.AncillaryDCNA": { field: "User.AncillaryDCNA", page: 4, caption: "Document Control Number (DCN), if available (if applicable)", captionAt: { page: 4, y: 316 }, label: "Document control number (DCN) for the ancillary matter to be sealed", section: S.B1, ...SUPPLY("the document control number (DCN) for the ancillary matter, if you have it") },
    "User.CB32": { field: "User.CB32", page: 4, caption: "Some or all of the above information is not reasonably available because", captionAt: { page: 4, y: 300 }, label: "Some or all of the ancillary matter information above is not reasonably available", section: S.B1, ...ELECTION() },
    "User.AncillaryReasonablyA": { field: "User.AncillaryReasonablyA", page: 4, caption: "Some or all of the above information is not reasonably available because", captionAt: { page: 4, y: 300 }, label: "Why the ancillary matter information above is not reasonably available", section: S.B1, ...SUPPLY("why some of the ancillary matter information above is not reasonably available — only if you ticked that box") },
    "User.AncillaryFullNameOfArrestA": { field: "User.AncillaryFullNameOfArrestA", page: 4, caption: "Full name at time of ancillary matter", captionAt: { page: 4, y: 261 }, label: "My full name when the ancillary matter arose", section: S.B1, ...SUPPLY("the full name you used when the ancillary matter arose, if it is not the name you go by now") },
    "User.AncillaryCityOrCountyA": { field: "User.AncillaryCityOrCountyA", page: 4, caption: "Court of final disposition for ancillary matter", captionAt: { page: 4, y: 241 }, label: "City or county of the court of final disposition for the ancillary matter", section: S.B1, ...SUPPLY("the city or county of the court that decided the ancillary matter") },
    "User.AncillaryCCourtA": { field: "User.AncillaryCCourtA", page: 4, caption: "Circuit Court", captionAt: { page: 4, y: 214 }, label: "Ancillary matter court of final disposition is a Circuit Court", section: S.B1, ...ELECTION() },
    "User.AncillaryGDCourtA": { field: "User.AncillaryGDCourtA", page: 4, caption: "General District Court", captionAt: { page: 4, y: 214 }, label: "Ancillary matter court of final disposition is a General District Court", section: S.B1, ...ELECTION() },
    "User.AncillaryJDCourtA": { field: "User.AncillaryJDCourtA", page: 4, caption: "Juvenile & Domestic Relations District Court", captionAt: { page: 4, y: 214 }, label: "Ancillary matter court of final disposition is a Juvenile and Domestic Relations District Court", section: S.B1, ...ELECTION() },
    "User.CB33": { field: "User.CB33", page: 4, caption: "attached.", captionAt: { page: 4, y: 180 }, label: "A copy of the charging document for the ancillary matter is attached", section: S.B1, ...ELECTION() },
    "User.CB34": { field: "User.CB34", page: 4, caption: "not reasonably available because", captionAt: { page: 4, y: 166 }, label: "The charging document for the ancillary matter is not reasonably available", section: S.B1, ...ELECTION() },
    "User.AncillaryWarrantSummonA": { field: "User.AncillaryWarrantSummonA", page: 4, caption: "not reasonably available because", captionAt: { page: 4, y: 166 }, label: "Why the charging document for the ancillary matter is not reasonably available", section: S.B1, ...SUPPLY("why the charging document for the ancillary matter is not reasonably available — only if you ticked that box") },
    "User.CB35": { field: "User.CB35", page: 4, caption: "I am requesting to seal more than one ancillary matter related to the offense or conviction that was", captionAt: { page: 4, y: 124 }, label: "I am requesting to seal more than one ancillary matter", section: S.B1, ...ELECTION() },

    /* --- SECTION B: second ancillary matter ------------------------------- */
    "User.AncillaryCaseDescB": { field: "User.AncillaryCaseDescB", page: 5, caption: "CASE NUMBER (IF AVAILABLE) AND DESCRIPTION OF OFFENSE", captionAt: { page: 5, y: 674 }, label: "Case number and description of the offense already sealed, for the second ancillary matter", section: S.B2, ...SUPPLY("the case number and description of the sealed offence the second ancillary matter relates to — only if you are sealing a second one") },
    "User.CB36": { field: "User.CB36", page: 5, caption: "a violation or alleged violation of the terms and conditions of a suspended sentence,", captionAt: { page: 5, y: 634 }, label: "The second ancillary matter is a violation of a suspended sentence, probation or parole", section: S.B2, ...ELECTION() },
    "User.CB37": { field: "User.CB37", page: 5, caption: "a violation or alleged violation of contempt of court;", captionAt: { page: 5, y: 607 }, label: "The second ancillary matter is a violation of contempt of court", section: S.B2, ...ELECTION() },
    "User.CB38": { field: "User.CB38", page: 5, caption: "a charge or conviction for failure to appear; OR", captionAt: { page: 5, y: 593 }, label: "The second ancillary matter is a failure to appear", section: S.B2, ...ELECTION() },
    "User.CB39": { field: "User.CB39", page: 5, caption: "an appeal from a bail, bond, or recognizance order.", captionAt: { page: 5, y: 580 }, label: "The second ancillary matter is an appeal from a bail, bond or recognizance order", section: S.B2, ...ELECTION() },
    "User.AncillaryCaseNumberB": { field: "User.AncillaryCaseNumberB", page: 5, caption: "Case number for ancillary matter identified above", captionAt: { page: 5, y: 562 }, label: "Case number for the second ancillary matter", section: S.B2, ...SUPPLY("the case number of the second ancillary matter — only if you are sealing a second one") },
    "User.AncillaryDateOfDispB": { field: "User.AncillaryDateOfDispB", page: 5, caption: "Date of final disposition for ancillary matter", captionAt: { page: 5, y: 546 }, label: "Date of final disposition for the second ancillary matter", section: S.B2, ...SUPPLY("the date of final disposition of the second ancillary matter") },
    "User.AncillaryDateOfArrestB": { field: "User.AncillaryDateOfArrestB", page: 5, caption: "Date of arrest for ancillary matter (if applicable)", captionAt: { page: 5, y: 530 }, label: "Date of arrest for the second ancillary matter", section: S.B2, ...SUPPLY("the date of arrest on the second ancillary matter, if there was one") },
    "User.AncillaryAgencyB": { field: "User.AncillaryAgencyB", page: 5, caption: "Name of arresting agency for ancillary matter (if applicable)", captionAt: { page: 5, y: 514 }, label: "Name of the arresting agency for the second ancillary matter", section: S.B2, ...SUPPLY("the arresting agency on the second ancillary matter, if there was one") },
    "User.AncillaryDCNB": { field: "User.AncillaryDCNB", page: 5, caption: "Document Control Number (DCN), if available (if applicable)", captionAt: { page: 5, y: 498 }, label: "Document control number (DCN) for the second ancillary matter", section: S.B2, ...SUPPLY("the document control number (DCN) for the second ancillary matter, if you have it") },
    "User.CB40": { field: "User.CB40", page: 5, caption: "Some or all of the above information is not reasonably available because", captionAt: { page: 5, y: 482 }, label: "Some or all of the second ancillary matter information above is not reasonably available", section: S.B2, ...ELECTION() },
    "User.AncillaryReasonablyB": { field: "User.AncillaryReasonablyB", page: 5, caption: "Some or all of the above information is not reasonably available because", captionAt: { page: 5, y: 482 }, label: "Why the second ancillary matter information above is not reasonably available", section: S.B2, ...SUPPLY("why some of the second ancillary matter information above is not reasonably available — only if you ticked that box") },
    "User.AncillaryFullNameOfArrestB": { field: "User.AncillaryFullNameOfArrestB", page: 5, caption: "Full name at time of ancillary matter", captionAt: { page: 5, y: 443 }, label: "My full name when the second ancillary matter arose", section: S.B2, ...SUPPLY("the full name you used when the second ancillary matter arose, if it is not the name you go by now") },
    "User.AncillaryCityOrCountyB": { field: "User.AncillaryCityOrCountyB", page: 5, caption: "Court of final disposition for ancillary matter", captionAt: { page: 5, y: 424 }, label: "City or county of the court of final disposition for the second ancillary matter", section: S.B2, ...SUPPLY("the city or county of the court that decided the second ancillary matter") },
    "User.AncillaryCCourtB": { field: "User.AncillaryCCourtB", page: 5, caption: "Circuit Court", captionAt: { page: 5, y: 392 }, label: "Second ancillary matter court of final disposition is a Circuit Court", section: S.B2, ...ELECTION() },
    "User.AncillaryGDCourtB": { field: "User.AncillaryGDCourtB", page: 5, caption: "General District Court", captionAt: { page: 5, y: 392 }, label: "Second ancillary matter court of final disposition is a General District Court", section: S.B2, ...ELECTION() },
    "User.AncillaryJDCourtB": { field: "User.AncillaryJDCourtB", page: 5, caption: "Juvenile & Domestic Relations District Court", captionAt: { page: 5, y: 392 }, label: "Second ancillary matter court of final disposition is a Juvenile and Domestic Relations District Court", section: S.B2, ...ELECTION() },
    "User.CB41": { field: "User.CB41", page: 5, caption: "attached.", captionAt: { page: 5, y: 358 }, label: "A copy of the charging document for the second ancillary matter is attached", section: S.B2, ...ELECTION() },
    "User.CB42": { field: "User.CB42", page: 5, caption: "not reasonably available because", captionAt: { page: 5, y: 345 }, label: "The charging document for the second ancillary matter is not reasonably available", section: S.B2, ...ELECTION() },
    "User.AncillaryWarrantSummonB": { field: "User.AncillaryWarrantSummonB", page: 5, caption: "not reasonably available because", captionAt: { page: 5, y: 345 }, label: "Why the charging document for the second ancillary matter is not reasonably available", section: S.B2, ...SUPPLY("why the charging document for the second ancillary matter is not reasonably available — only if you ticked that box") },

    /* --- acknowledgments, common to both routes --------------------------- */
    "User.CB43": { field: "User.CB43", page: 5, caption: "I understand that I am required to provide a copy of this petition by delivery or by first-class", captionAt: { page: 5, y: 226 }, label: "I acknowledge I must provide a copy of this petition to the Commonwealth's Attorney", section: S.ACK, ...ELECTION() },
    "User.CB44": { field: "User.CB44", page: 5, caption: "I understand that after this petition is filed, I am required to request that the Central Criminal", captionAt: { page: 5, y: 175 }, label: "I acknowledge I must ask the CCRE to forward my criminal history record to the court", section: S.ACK, ...ELECTION() },
    "User.CB45": { field: "User.CB45", page: 6, caption: "I understand that I cannot request to seal a charge, conviction or ancillary matter that was", captionAt: { page: 6, y: 724 }, label: "I acknowledge I cannot seal a matter finalized the same day as an ineligible one", section: S.ACK, ...ELECTION() },
    "User.CB46": { field: "User.CB46", page: 6, caption: "I understand that I can only request to seal multiple charges, convictions or ancillary matters", captionAt: { page: 6, y: 673 }, label: "I acknowledge multiple matters may share one petition only if all are eligible", section: S.ACK, ...ELECTION() },
    "User.CB47": { field: "User.CB47", page: 6, caption: "I understand that my petition may be denied, with or without a hearing, if the charge(s),", captionAt: { page: 6, y: 619 }, label: "I acknowledge my petition may be denied if the matter is not eligible for sealing", section: S.ACK, ...ELECTION() },
    "User.CB48": { field: "User.CB48", page: 6, caption: "I understand that if my petition for sealing is granted, it will not restore my civil rights or firearm", captionAt: { page: 6, y: 578 }, label: "I acknowledge sealing will not restore my civil rights or firearm rights", section: S.ACK, ...ELECTION() },
    "User.CB49": { field: "User.CB49", page: 6, caption: "I understand that if my petition for sealing is granted, I will still be required to pay any", captionAt: { page: 6, y: 537 }, label: "I acknowledge I must still pay outstanding fines, costs, restitution, forfeitures and penalties", section: S.ACK, ...ELECTION() },
    "User.CB50": { field: "User.CB50", page: 6, caption: "ADDENDUM. I am requesting to seal multiple charges, convictions or ancillary matters, and I have", captionAt: { page: 6, y: 486 }, label: "I am attaching a CC-1203(A) or CC-1203(B) addendum", section: S.ACK, ...ELECTION() },
    "User.VSBCC1203BNUMBER": { field: "User.VSBCC1203BNUMBER", page: 6, caption: "addendums are attached to this petition and are incorporated herein", captionAt: { page: 6, y: 442 }, label: "How many CC-1203(A) or CC-1203(B) addendum pages are attached", section: S.ACK, ...SUPPLY("how many addendum pages you are attaching — only if you ticked the ADDENDUM box") },

    /* --- signature block -------------------------------------------------- */
    "User.DateSigned2": { field: "User.DateSigned2", page: 6, caption: "DATE", captionAt: { page: 6, y: 363 }, label: "Date of signature", section: S.SIGN, ...PROTECT(SIGNATURE) },
    "User.SignaturePetitioner1": { field: "User.SignaturePetitioner1", page: 6, caption: "SIGNATURE OF", captionAt: { page: 6, y: 363 }, label: "The signature on this petition is the Petitioner's", section: S.SIGN, ...SELECT("this packet is prepared for the petitioner to file without counsel, so the petitioner signs it") },
    "User.SignatureAttorney1": { field: "User.SignatureAttorney1", page: 6, caption: "ATTORNEY FOR PETITIONER (VSB No.", captionAt: { page: 6, y: 354 }, label: "The signature on this petition is the attorney's", section: S.SIGN, ...OFFROUTE("attorney-only; no representation fact is held for this participant") },
    "User.VSBCaseNumber": { field: "User.VSBCaseNumber", page: 6, caption: "VSB No.", captionAt: { page: 6, y: 354 }, label: "VSB number of the attorney for the petitioner", section: S.SIGN, ...OFFROUTE("attorney-only; no representation fact is held for this participant") },
    "User.PrintedNameOfPetAtt": { field: "User.PrintedNameOfPetAtt", page: 6, caption: "PRINTED NAME OF", captionAt: { page: 6, y: 303 }, label: "Printed name of the petitioner", section: S.SIGN, ...WRITE("participant.full_legal_name") },
    "User.NamePetitioner": { field: "User.NamePetitioner", page: 6, caption: "PRINTED NAME OF", captionAt: { page: 6, y: 303 }, label: "The printed name given is the Petitioner's", section: S.SIGN, ...SELECT("the name printed in this block is the petitioner's, because this packet is filed without counsel") },
    "User.NameAttorney": { field: "User.NameAttorney", page: 6, caption: "ATTORNEY FOR PETITIONER", captionAt: { page: 6, y: 294 }, label: "The printed name given is the attorney's", section: S.SIGN, ...OFFROUTE("attorney-only; no representation fact is held for this participant") },
    "User.AddressOfPetAtt": { field: "User.AddressOfPetAtt", page: 6, caption: "ADDRESS OF", captionAt: { page: 6, y: 299 }, label: "Address of the petitioner", section: S.SIGN, ...WRITE("participant.street_address") },
    "User.AddressPetitioner": { field: "User.AddressPetitioner", page: 6, caption: "ADDRESS OF", captionAt: { page: 6, y: 299 }, label: "The address given is the Petitioner's", section: S.SIGN, ...SELECT("the address in this block is the petitioner's, because this packet is filed without counsel") },
    "User.AddressAttorney": { field: "User.AddressAttorney", page: 6, caption: "ATTORNEY FOR PETITIONER", captionAt: { page: 6, y: 289 }, label: "The address given is the attorney's", section: S.SIGN, ...OFFROUTE("attorney-only; no representation fact is held for this participant") },
    "User.HomePhoneOfPetAtt": { field: "User.HomePhoneOfPetAtt", page: 6, caption: "TELEPHONE NUMBER OF", captionAt: { page: 6, y: 230 }, label: "Telephone number of the petitioner", section: S.SIGN, ...WRITE("participant.phone") },
    "User.TelephonePetitioner": { field: "User.TelephonePetitioner", page: 6, caption: "TELEPHONE NUMBER OF", captionAt: { page: 6, y: 230 }, label: "The telephone number given is the Petitioner's", section: S.SIGN, ...SELECT("the telephone number in this block is the petitioner's, because this packet is filed without counsel") },
    "User.TelephoneAttorney": { field: "User.TelephoneAttorney", page: 6, caption: "ATTORNEY FOR PETITIONER", captionAt: { page: 6, y: 221 }, label: "The telephone number given is the attorney's", section: S.SIGN, ...OFFROUTE("attorney-only; no representation fact is held for this participant") },
    "User.CityOfPetAtt": { field: "User.CityOfPetAtt", page: 6, caption: "CITY, STATE, ZIP OF", captionAt: { page: 6, y: 225 }, label: "City, state and ZIP of the petitioner", section: S.SIGN, ...WRITE("participant.city") },
    "User.CityPetitioner": { field: "User.CityPetitioner", page: 6, caption: "CITY, STATE, ZIP OF", captionAt: { page: 6, y: 225 }, label: "The city, state and ZIP given is the Petitioner's", section: S.SIGN, ...SELECT("the city, state and ZIP in this block is the petitioner's, because this packet is filed without counsel") },
    "User.CityAttorney": { field: "User.CityAttorney", page: 6, caption: "ATTORNEY FOR PETITIONER", captionAt: { page: 6, y: 216 }, label: "The city, state and ZIP given is the attorney's", section: S.SIGN, ...OFFROUTE("attorney-only; no representation fact is held for this participant") },
    "User.EmailOfPetAtt": { field: "User.EmailOfPetAtt", page: 6, caption: "EMAIL ADDRESS OF", captionAt: { page: 6, y: 156 }, label: "Email address of the petitioner", section: S.SIGN, ...WRITE("participant.email") },
    "User.EmailPetitioner": { field: "User.EmailPetitioner", page: 6, caption: "EMAIL ADDRESS OF", captionAt: { page: 6, y: 156 }, label: "The email address given is the Petitioner's", section: S.SIGN, ...SELECT("the email address in this block is the petitioner's, because this packet is filed without counsel") },
    "User.EmailAttorney": { field: "User.EmailAttorney", page: 6, caption: "ATTORNEY FOR PETITIONER", captionAt: { page: 6, y: 147 }, label: "The email address given is the attorney's", section: S.SIGN, ...OFFROUTE("attorney-only; no representation fact is held for this participant") }
  }
};

const FORMS = { "CC-1201": CC1201, "CC-1203": CC1203 };

/* ------------------------------------------------------------------ *
 * The four families.
 *
 * `officialForm` is decided by the track's own recorded statutory authority in
 * data/rcap-ledger/track-pathway-crosswalk.json, read against the statute each
 * form prints on its own face. `assignedOfficialForm` records what PF01's
 * assignment table said, so the difference travels with the packet instead of
 * living only in a commit message.
 * ------------------------------------------------------------------ */
const COMPONENTS = [
  "primary_filing",
  "commonwealth_service_and_stipulation_request",
  "ccre_forwarding_request",
  "records_checklist",
  "filing_instructions"
];

/*
 * FIX01/RP-2 (lane FIX03), ROUTE_IDENTITY and FEE_AND_WAIVER, for
 * va_seal_petition_misdemeanor-set ONLY.
 *
 * This host builds four Virginia families. Exactly one of them -- the
 * misdemeanour family -- is in this lane's grant, so exactly one of them is
 * changed. `routeLabel` and `feePosture` are read with a fallback everywhere
 * they are used, so the other three families render byte-for-byte as they did.
 *
 * ROUTE_IDENTITY. This family printed
 * obligation:track-pathway:VA:va_seal_petition_misdemeanor:petition-based-sealing
 * on the participant page and carried it in production-field-map.json. That key
 * exists in no route record. The committed census names
 * obligation:track-only:VA:va_seal_petition_misdemeanor for packetSetId
 * va_seal_petition_misdemeanor-set, and product-wiring.json already agreed with
 * the census. Worse than unregistered, the printed key was CONFUSABLE: there is
 * a real Virginia census route ending :petition-based-sealing --
 * obligation:track-pathway:VA:va_seal_ancillary_matter_only:petition-based-sealing
 * -- and it is a different track.
 *
 * The owner's decision, applied here: the participant page prints a SHORT
 * HUMAN-READABLE LABEL and the canonical machine id lives in the manifests and
 * the wiring only. That is the shape Kansas already ships
 * ("Municipal conviction or diversion expungement - K.S.A. 12-4516"), and the
 * statute is cited without a section sign because sanitizePdfText writes
 * "Sec. " over one and the manifest and the page would then disagree.
 *
 * NOT DONE HERE, and deliberately: va_seal_petition_felony-set and
 * va_seal_enumerated_seven_year-set carry the same fabricated
 * :petition-based-sealing suffix against census keys that are likewise
 * track-only. They are not in this lane's grant and are left exactly as they
 * are, reported rather than swept. va_seal_ancillary_matter_only-set's key is
 * correct and needs nothing.
 *
 * FEE_AND_WAIVER. The packet told the participant the filing fee "is not
 * established by the petition" and to go and ask a clerk. Not established BY
 * THE PETITION is not the same as not established: the committed census
 * destination detail for this exact route states "File the petition with no
 * court fees or costs". A participant was being sent to a clerk's window to ask
 * about a fee the record this family is bound to says does not exist.
 * `feePosture` is read from that record at build time, bound by exact SHA-256
 * and re-asserted against the sentence it relies on, so the build stops rather
 * than printing a fee posture the record no longer supports.
 */
/*
 * SYNTHESIZED SELECTION APPEARANCES, per family.
 *
 * CC-1201 carries 63 check-box widgets and CC-1203 carries 76, and on both
 * forms every one of them sits at /AS /Off while /AP /N ships /1 alone. Under
 * ISO 32000-1 12.5.5 a viewer draws the stream named by /AS, so where there is
 * none it paints nothing and the court's own paper carries no square there.
 * sanitizeAndFlatten's form.updateFieldAppearances() call makes pdf-lib
 * synthesize one anyway and flatten() stamps it onto the delivered page.
 * FIX50 added an opt-in for exactly that, suppressSynthesizedAppearances, which
 * installs an EMPTY appearance for the missing state instead.
 *
 * It is set HERE, on the family, and not on the host, because that is how the
 * flag was introduced: FIX63 held three of this host's four families and set it
 * on those three, and FIX87 measured the fourth and set it there too. All four
 * now carry it. A family that does not carry the flag passes false and is
 * byte-unaffected, and that is why the mechanism stays per family.
 *
 * This host hands finalizeOfficialForm the PINNED SOURCE BYTES: there is no
 * intermediate sourceDoc.save() between reading the form and the finalizer, so
 * the square is born inside sanitizeAndFlatten where the opt-in reaches it.
 * That is the difference from the East host FIX57 measured, where pdf-lib's
 * default updateFieldAppearances on a pre-finalize save had already baked the
 * square in and the option installed nothing.
 */
export const FAMILY_CONFIGS = Object.freeze({
  "va_seal_petition_misdemeanor-set": {
    /*
     * FIX73 / VF02 PAGE_ORDER. The registry packet set orders the CCRE
     * forwarding request second and the Commonwealth's copy third; this host
     * emitted them the other way round. FIX73 held only this family, so only
     * this family opted in. FIX87 holds all four and measured the same
     * transposition in the other three, whose registry packet sets prescribe
     * the identical order, so all four now carry the flag. The opt-in stays
     * per family: a family that does not carry it is byte-unaffected.
     */
    registryComponentOrder: true,
    /*
     * FIX87 / VF04 CLIPPING_AND_OVERLAP. This family was outside FIX63's grant
     * and so was the only one of the four still handing pdf-lib the job of
     * synthesizing an appearance for the missing /Off state: 56 of 56 unmarked
     * selection widgets carried a stroked square the pinned CC-1201 does not
     * print, in both fixtures. See the note above FAMILY_CONFIGS; the three
     * siblings had already carried the flag and were the proof it works.
     */
    suppressSynthesizedAppearances: true,
    jurisdiction: "VA",
    routeKey: "obligation:track-only:VA:va_seal_petition_misdemeanor",
    routeLabel: "Misdemeanour conviction or deferred dismissal sealing - Va. Code 19.2-392.12",
    feeAnchor: "no court fees or costs",
    routeSelectionId: "va-seal-petition-misdemeanor-cc-1201-complete-set",
    legalName: "Petition to Seal a Misdemeanour Conviction or Deferred Dismissal, Va. Code § 19.2-392.12",
    routeName: "sealing a misdemeanour conviction or deferred dismissal under Va. Code § 19.2-392.12",
    statute: "Va. Code § 19.2-392.12",
    officialForm: "CC-1201",
    assignedOfficialForm: "CC-1201",
    formMatchesAssignment: true,
    offSections: [],
    routeSelect: {
      "User.ChargeMisdemeanor": "this packet is built for the misdemeanour route of § 19.2-392.12, so the offence level the petition states is a misdemeanour"
    },
    offRoute: {
      "User.ChargeFelony": "this packet is built for the misdemeanour route of § 19.2-392.12",
      "User.ChargeViolation": "this packet is built for the misdemeanour route of § 19.2-392.12"
    }
  },
  "va_seal_petition_felony-set": {
    /* FIX63: CC-1203/CC-1201 ship no /Off appearance; see the note above FAMILY_CONFIGS. */
    suppressSynthesizedAppearances: true,
    /* FIX87 / VF04 PAGE_ORDER: this family carried the transposition FIX73
     * repaired on the host and disclosed here; its own registry packet set
     * orders the CCRE forwarding request second and the Commonwealth's copy
     * third. See the note on va_seal_petition_misdemeanor-set above. */
    registryComponentOrder: true,
    jurisdiction: "VA",
    /*
     * FIX73 ROUTE_IDENTITY. This family printed, on four participant-facing
     * pages of each fixture,
     * obligation:track-pathway:VA:va_seal_petition_felony:petition-based-sealing,
     * a key that occurs zero times in the route obligation census, while its own
     * product-wiring.json binds obligation:track-only:VA:va_seal_petition_felony,
     * which the census carries exactly once for packetSetId
     * va_seal_petition_felony-set. The field map and the printed line now carry
     * the census key. No key is added to the census.
     */
    routeKey: "obligation:track-only:VA:va_seal_petition_felony",
    feeAnchor: "no court fees or costs",
    routeSelectionId: "va-seal-petition-felony-cc-1201-complete-set",
    legalName: "Petition to Seal a Class 5 or 6 Felony or an 18.2-95 Larceny Felony, Va. Code § 19.2-392.12",
    routeName: "sealing a Class 5 or 6 felony, or a felony punished as larceny under § 18.2-95, pursuant to Va. Code § 19.2-392.12",
    statute: "Va. Code § 19.2-392.12",
    officialForm: "CC-1201",
    assignedOfficialForm: "CC-1201",
    formMatchesAssignment: true,
    offSections: [],
    /*
     * The route determines that the offence is a FELONY and stops there. This
     * track covers two different felony provisions -- a Class 5 or 6 felony and
     * an § 18.2-95 larceny felony -- and which of them a participant's record
     * falls under is a fact about the record, not a property of the route. So
     * the misdemeanour box is refused as a branch this route does not use, and
     * the two felony boxes stay the participant's election. Selecting one here
     * would be guessing a legal answer, which this lane never does.
     */
    routeSelect: {},
    offRoute: {
      "User.ChargeMisdemeanor": "this packet is built for the felony route of § 19.2-392.12"
    }
  },
  "va_seal_enumerated_seven_year-set": {
    /* FIX63: CC-1203/CC-1201 ship no /Off appearance; see the note above FAMILY_CONFIGS. */
    suppressSynthesizedAppearances: true,
    /* FIX87 / VF04 PAGE_ORDER: this family carried the transposition FIX73
     * repaired on the host and disclosed here; its own registry packet set
     * orders the CCRE forwarding request second and the Commonwealth's copy
     * third. See the note on va_seal_petition_misdemeanor-set above. */
    registryComponentOrder: true,
    jurisdiction: "VA",
    /* FIX73 ROUTE_IDENTITY: the printed and mapped key is now the one the
     * census carries once for this packet set and the one product-wiring.json
     * already bound. The fabricated :petition-based-sealing suffix is gone. */
    routeKey: "obligation:track-only:VA:va_seal_enumerated_seven_year",
    feeAnchor: "no court fees or costs",
    routeSelectionId: "va-seal-enumerated-seven-year-cc-1203-complete-set",
    legalName: "Petition to Seal an Enumerated Offence After Seven Clean Years, Va. Code § 19.2-392.12:1(A)",
    routeName: "sealing one of the enumerated offences under Va. Code § 19.2-392.12:1(A)",
    statute: "Va. Code § 19.2-392.12:1(A)",
    officialForm: "CC-1203",
    assignedOfficialForm: "CC-1201",
    formMatchesAssignment: false,
    formFinding: "PF01 assigned CC-1201. CC-1201 prints 'PURSUANT TO VA. CODE § 19.2-392.12' on its own face and carries none of the nine enumerated statutes this route is filed under; CC-1203 Section A, Part 1 is that route's own section and prints all nine. The track's recorded authority in data/rcap-ledger/track-pathway-crosswalk.json is § 19.2-392.12:1(A).",
    offSections: [S.B1, S.B2],
    routeSelect: {
      "User.AdditionCharge1": "this packet is filed under Va. Code § 19.2-392.12:1(A), which is option I on this form"
    },
    offRoute: {
      "User.AdditionCharge2": "this packet is filed under § 19.2-392.12:1(A), not § 19.2-392.12:1(B)"
    }
  },
  "va_seal_ancillary_matter_only-set": {
    /* FIX63: CC-1203/CC-1201 ship no /Off appearance; see the note above FAMILY_CONFIGS. */
    suppressSynthesizedAppearances: true,
    /* FIX87 / VF04 PAGE_ORDER: this family carried the transposition FIX73
     * repaired on the host and disclosed here; its own registry packet set
     * orders the CCRE forwarding request second and the Commonwealth's copy
     * third. See the note on va_seal_petition_misdemeanor-set above. */
    registryComponentOrder: true,
    jurisdiction: "VA",
    /* This family's printed key is the key the census carries for it, and both
     * of its route records already agreed; FIX73 confirmed it and left it. */
    routeKey: "obligation:track-pathway:VA:va_seal_ancillary_matter_only:petition-based-sealing",
    feeAnchor: "no court fees or costs",
    routeSelectionId: "va-seal-ancillary-matter-only-cc-1203-complete-set",
    legalName: "Petition to Seal an Ancillary Matter Left Behind by Automatic Sealing, Va. Code § 19.2-392.12:1(B) and (J)",
    routeName: "sealing an ancillary matter left behind by automatic sealing, under Va. Code § 19.2-392.12:1(B)",
    statute: "Va. Code § 19.2-392.12:1(B)",
    officialForm: "CC-1203",
    assignedOfficialForm: "CC-1201",
    formMatchesAssignment: false,
    formFinding: "PF01 assigned CC-1201. CC-1201's Section C accepts an ancillary matter only as an addition to a charge or conviction listed on its page 1, so an ancillary-matter-only petition cannot be expressed on it at all; CC-1203 Section B is exactly this route and asks for the already-sealed offence rather than a charge to seal. The track's recorded authority in data/rcap-ledger/track-pathway-crosswalk.json is § 19.2-392.12:1(B) and (J).",
    offSections: [S.A1, S.A2],
    routeSelect: {
      "User.AdditionCharge2": "this packet is filed under Va. Code § 19.2-392.12:1(B), which is option II on this form"
    },
    offRoute: {
      "User.AdditionCharge1": "this packet is filed under § 19.2-392.12:1(B), not § 19.2-392.12:1(A)"
    }
  }
});

/* ---- fixtures ------------------------------------------------------------ *
 * Two participants. The canonical one is unremarkable. The boundary one carries
 * a long hyphenated name with an apostrophe, a long street, a long email and a
 * long city line, because a value that fits the box is not evidence that every
 * value does.
 *
 * Neither carries a signature, a signature date, a Social Security number, or
 * any court-owned or attorney-owned value. `participant.city` holds the whole
 * city, state and ZIP line because that is the box the form prints and
 * participant.city is the descriptor the shared field semantics binds this
 * widget to -- recorded in build-findings.json as a field-semantics fidelity
 * note rather than worked around here.
 */
const FIXTURES = {
  canonical: {
    "participant.full_legal_name": "Jordan Avery Reyes",
    "participant.date_of_birth": "1991-04-17",
    "participant.street_address": "42 Maple Street",
    "participant.city": "Richmond, VA 23219",
    "participant.phone": "804-555-0142",
    "participant.email": "jordan.reyes@example.org",
    "matter.case_number": "CR21000417-00",
    "matter.court": "Richmond City"
  },
  boundary: {
    "participant.full_legal_name": "Maria-Alejandra O'Shaughnessy-Whitfield",
    "participant.date_of_birth": "1968-12-31",
    "participant.street_address": "1188 Upper Notch Crossing Road, Apartment 14B",
    "participant.city": "Virginia Beach, Virginia 23456-2214",
    "participant.phone": "(757) 555-0199 ext. 4417",
    "matter.case_number": "CR24001276-01",
    "participant.email": "maria.alejandra.oshaughnessy.whitfield@longmailexample.org",
    "matter.court": "Virginia Beach"
  }
};

/* ---- source binding ------------------------------------------------------ */
function resolveSources(familyId) {
  const config = FAMILY_CONFIGS[familyId];
  assert.ok(config, `unknown family ${familyId}`);
  const index = JSON.parse(fs.readFileSync(path.join(ROOT, CORPUS_INDEX), "utf8"));
  const entries = index.entries ?? index.files ?? index;
  const rows = Array.isArray(entries) ? entries : Object.values(entries);
  const root = corpusRoot();
  const resolved = [];
  const failures = [];
  for (const formNumber of [config.officialForm]) {
    const entry = rows.find((e) => String(e.path ?? e.relativePath ?? "").includes(`__${formNumber}__`)
      && String(e.path ?? e.relativePath ?? "").startsWith("STATES/VA/"));
    if (!entry) { failures.push({ sourceIdentity: `official-form:${formNumber}`, why: "no entry for this form number in the committed corpus index" }); continue; }
    const rel = entry.path ?? entry.relativePath;
    const abs = path.resolve(ROOT, root, rel);
    if (!fs.existsSync(abs)) { failures.push({ sourceIdentity: `official-form:${formNumber}`, why: `the indexed path does not exist on disk: ${rel}` }); continue; }
    const bytes = fs.readFileSync(abs);
    const sha256 = crypto.createHash("sha256").update(bytes).digest("hex");
    const indexed = String(entry.sha256 ?? entry.sha ?? "");
    if (indexed && indexed !== sha256) { failures.push({ sourceIdentity: `official-form:${formNumber}`, why: `SHA-256 drift: the committed index says ${indexed}, the corpus binary hashes ${sha256}` }); continue; }
    resolved.push({
      formNumber, sourceId: `official-form:${formNumber}`, pathInArchive: rel,
      revision: /__REV-([0-9-]+)__/.exec(rel)?.[1] ?? null,
      sha256, byteLength: bytes.length, bytes
    });
  }
  return { resolved, failures };
}

/* ---- policy resolution, per family --------------------------------------- */
function entryPolicyFor(config, key, entry) {
  if (config.offRoute?.[key]) return { ...entry, ...OFFROUTE(config.offRoute[key]) };
  if (config.routeSelect?.[key]) return { ...entry, ...SELECT(config.routeSelect[key]) };
  if ((config.offSections ?? []).includes(entry.section)) {
    return { ...entry, ...OFFROUTE(`this petition is filed under ${config.statute}, and this section of the form belongs to the other statutory route the form serves`) };
  }
  return entry;
}

/* A PDF rectangle may be written with either corner first. Normalizing before
 * anything is measured against it is the difference between a caption check
 * that reads the line beside the blank and one that reads a line and a half
 * above it. */
function normalizeRect(r) {
  const x = Math.min(r.x, r.x + r.width);
  const y = Math.min(r.y, r.y + r.height);
  return {
    x: Number(x.toFixed(2)), y: Number(y.toFixed(2)),
    width: Number(Math.abs(r.width).toFixed(2)), height: Number(Math.abs(r.height).toFixed(2))
  };
}

/* ---- census, read from the pinned binary --------------------------------- */
async function censusOf(source, config) {
  const spec = FORMS[source.formNumber];
  assert.ok(spec, `no field dictionary for ${source.formNumber}`);
  const doc = await PDFDocument.load(source.bytes, { ignoreEncryption: true });
  const pages = doc.getPages();
  const pageText = pages.map((p, i) => ({
    page: i + 1,
    lines: groupIntoLines(extractTextItems(p)).map((l) => ({ y: Math.round(l.y), text: l.text }))
  }));

  // Index the dictionary by widget name so a name carrying several boxes can be
  // matched to the right one by coordinate rather than by order of appearance.
  const byName = new Map();
  for (const [key, entry] of Object.entries(spec.fields)) {
    if (!byName.has(entry.field)) byName.set(entry.field, []);
    byName.get(entry.field).push({ key, entry });
  }

  const rows = [];
  const unmapped = [];
  const usedKeys = new Set();
  for (const field of doc.getForm().getFields()) {
    const name = field.getName();
    const candidates = byName.get(name) ?? [];
    for (const w of field.acroField.getWidgets()) {
      const rect = normalizeRect(w.getRectangle());
      const raw = w.getRectangle();
      const ref = w.P();
      let pageIndex = pages.findIndex((p) => p.ref === ref);
      if (pageIndex < 0) pageIndex = 0;
      const page = pageIndex + 1;
      let chosen = null;
      if (candidates.length === 1 && candidates[0].entry.page === page) chosen = candidates[0];
      else {
        // Several boxes share this name. Match on the coordinate the dictionary
        // recorded, which is the only thing that distinguishes them.
        chosen = candidates.find((c) => c.entry.page === page && c.entry.at
          && Math.abs(Math.min(c.entry.at.y, c.entry.at.y) - raw.y) < 0.6
          && Math.abs(c.entry.at.x - raw.x) < 0.6)
          ?? candidates.find((c) => c.entry.page === page && c.entry.at
            && Math.abs(c.entry.at.y - rect.y) < 0.6 && Math.abs(c.entry.at.x - rect.x) < 0.6)
          ?? (candidates.length === 1 ? candidates[0] : null);
      }
      if (!chosen || usedKeys.has(chosen.key)) {
        unmapped.push({ field: name, page, rect, why: chosen ? "the dictionary key it matched was already used by another widget" : "no dictionary entry matches this widget's name and coordinate" });
        continue;
      }
      usedKeys.add(chosen.key);
      const entry = entryPolicyFor(config, chosen.key, chosen.entry);
      const pdfClass = field.constructor.name;
      rows.push({
        key: chosen.key, name, page, rect,
        type: pdfClass.replace("PDF", "").toLowerCase().replace("textfield", "text"),
        rectBasis: "acroform_widget_rect_read_first_hand_from_pinned_binary_and_normalized",
        caption: entry.caption, captionAt: entry.captionAt,
        effectiveLabel: entry.label, regionHeading: entry.label,
        section: entry.section,
        policy: entry.policy, fact: entry.fact ?? null,
        refusalClass: entry.refusalClass ?? null,
        what: entry.what ?? null, routeReason: entry.routeReason ?? null,
        isSelectionControl: pdfClass === "PDFCheckBox",
        multiline: typeof field.isMultiline === "function" ? field.isMultiline() : false,
        maxLength: typeof field.getMaxLength === "function" ? (field.getMaxLength() ?? null) : null
      });
    }
  }

  const missingKeys = Object.keys(spec.fields).filter((k) => !usedKeys.has(k));

  // Every measured caption must still be printed where the dictionary says.
  const flat = (x) => String(x).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const captionDrift = [];
  for (const r of rows) {
    if (!r.captionAt) continue;
    const lines = pageText.find((p) => p.page === r.captionAt.page)?.lines ?? [];
    const near = lines.filter((l) => Math.abs(l.y - r.captionAt.y) <= 2);
    const needle = flat(r.caption);
    const found = needle.length > 0 && near.some((l) => flat(l.text).includes(needle));
    if (!found) captionDrift.push({ key: r.key, page: r.captionAt.page, y: r.captionAt.y, caption: r.caption, linesThere: near.map((l) => l.text).slice(0, 2) });
  }
  return { rows, unmapped, missingKeys, captionDrift, pageText };
}

/* ---- render one official form -------------------------------------------- */
async function renderDocument(source, census, fixtureName, config) {
  const facts = FIXTURES[fixtureName];
  // The finalizer works by field NAME, so the census it receives carries one
  // entry per name. A name that hosts several boxes hosts only elections on
  // both of these forms, and the build refuses if that ever stops being true.
  const byName = new Map();
  for (const r of census.rows) {
    const existing = byName.get(r.name);
    if (!existing) { byName.set(r.name, r); continue; }
    assert.ok(!(existing.policy === "write" || r.policy === "write"),
      `widget name ${r.name} hosts several boxes and one of them is a write; a name-keyed fill cannot address them separately`);
  }
  const unique = [...byName.values()];
  const writable = unique.filter((r) => r.policy === "write");
  const explicitMappings = Object.fromEntries(writable.map((r) => [r.name, r.fact]));
  const unwritableFields = unique.filter((r) => r.policy !== "write").map((r) => ({ field: r.name }));
  const { bytes, report } = await finalizeOfficialForm({
    sourceBytes: source.bytes,
    expectedSha256: source.sha256,
    census: unique.map((r) => ({
      name: r.name, type: r.type, effectiveLabel: r.effectiveLabel, regionHeading: r.regionHeading,
      widgets: [{ page: r.page, rect: r.rect }],
      multiline: r.multiline === true, maxLength: r.maxLength ?? null
    })),
    facts, explicitMappings, unwritableFields,
    documentTextLines: census.pageText.flatMap((p) => p.lines.map((l) => l.text)),
    title: FORMS[source.formNumber].title,
    // Per FAMILY, never per host. See suppressSynthesizedAppearances on
    // FAMILY_CONFIGS: a family that does not set it is byte-unaffected, which
    // is what keeps va_seal_petition_misdemeanor-set -- not in this lane's
    // grant -- producing exactly the bytes it produces today.
    suppressSynthesizedAppearances: config.suppressSynthesizedAppearances === true
  });
  if (process.env.VA_DEBUG_RENDER) {
    console.log(`-- ${source.formNumber} ${fixtureName}: written=${report.written.length} refused=${report.refused.length}`);
    for (const w of report.written) console.log(`   wrote ${w.field} <- ${w.factId}`);
    const wanted = new Set(writable.map((r) => r.name));
    for (const r of report.refused) if (wanted.has(r.field)) console.log(`   REFUSED A WRITE ${r.field}: ${r.reason}`);
  }
  return { bytes, report, writable };
}

/* ---- the route's own elections, marked on the court's own boxes ----------- *
 *
 * finalizeOfficialForm fills text and flattens; it refuses a checkbox by type,
 * which is correct -- nothing should tick a box from a fact map. A route
 * election is a different claim: the packet is built for ONE statutory route and
 * the form asks which one, so the answer is a property of the packet rather than
 * of the participant, and leaving it for the participant is the defect the
 * completeness contract calls ROUTE_OPTION_NOT_SELECTED.
 *
 * The mark is two diagonals struck strictly inside the box the court already
 * printed, at the same inset and weight the shared selection marker uses. No box
 * is ever drawn, thickened or moved.
 */
async function markRouteSelections(flattenedBytes, selections) {
  if (selections.length === 0) return { bytes: flattenedBytes, marks: [] };
  const pdf = await PDFDocument.load(flattenedBytes, { ignoreEncryption: true, updateMetadata: false });
  const pages = pdf.getPages();
  const marks = [];
  for (const s of selections) {
    const page = pages[s.page - 1];
    assert.ok(page, `route selection ${s.key} names page ${s.page}, which is not in the document`);
    const { x, y, width, height } = s.rect;
    const inset = SELECTION_INSET;
    assert.ok(width > inset * 2 + 1 && height > inset * 2 + 1,
      `route selection ${s.key} is ${width}x${height}pt, too small to mark inside the court's own stroke`);
    const a = { x: x + inset, y: y + inset };
    const b = { x: x + width - inset, y: y + height - inset };
    page.drawLine({ start: a, end: b, thickness: SELECTION_LINE_WIDTH, color: PARTICIPANT_INK });
    page.drawLine({ start: { x: a.x, y: b.y }, end: { x: b.x, y: a.y }, thickness: SELECTION_LINE_WIDTH, color: PARTICIPANT_INK });
    marks.push({
      key: s.key, field: s.name, page: s.page, box: { x0: x, y0: y, x1: x + width, y1: y + height },
      inset, lineWidth: SELECTION_LINE_WIDTH, mark: "two_diagonal_strokes_inset",
      drewANewBox: false, redrewTheCourtsBox: false, routeReason: s.routeReason
    });
  }
  const bytes = await pdf.save({ useObjectStreams: false, updateMetadata: false });
  return { bytes: Buffer.from(bytes), marks };
}

/* Painted paths, so a claimed mark can be read back out of the bytes. */
async function paintedPaths(bytes) {
  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  return pdf.getPages().flatMap((page, index) => extractPageGeometry(page).paths
    .filter((row) => /^(S|s|f|F|f\*|B|B\*|b|b\*)$/.test(String(row.paintedBy ?? "")))
    .map((row) => ({
      page: index + 1, operator: row.operator, paintedBy: row.paintedBy,
      x: +row.x.toFixed(3), y: +row.y.toFixed(3),
      width: +row.width.toFixed(3), height: +row.height.toFixed(3)
    })));
}

async function addedPaintedPaths(beforeBytes, afterBytes) {
  const before = await paintedPaths(beforeBytes);
  const after = await paintedPaths(afterBytes);
  const key = (r) => [r.page, r.operator, r.paintedBy, r.x, r.y, r.width, r.height].join("|");
  const counts = new Map();
  for (const r of before) counts.set(key(r), (counts.get(key(r)) ?? 0) + 1);
  return after.filter((r) => {
    const remaining = counts.get(key(r)) ?? 0;
    if (remaining <= 0) return true;
    counts.set(key(r), remaining - 1);
    return false;
  });
}

function pathInsideBox(row, box) {
  const pad = 0.75;
  return row.x >= box.x0 - pad && row.x + Math.abs(row.width) <= box.x1 + pad
    && row.y >= box.y0 - pad && row.y + Math.abs(row.height) <= box.y1 + pad;
}

/* ---- byte proof: what actually landed on the paper ----------------------- */
async function byteProof(source, census, file, report, fixtureName, marks, preMarkBytes, postMarkBytes) {
  const widgets = await flattenedWidgets(file);
  const written = new Map(report.written.map((w) => [w.field, w]));
  const actualWrites = [];
  const matchedAppearances = new Set();
  for (const r of census.rows) {
    const w = written.get(r.name);
    if (!w || r.policy !== "write") continue;
    const drawn = drawnAt(widgets, { page: r.page, rect: r.rect });
    for (const d of drawn) matchedAppearances.add(`${d.page}|${d.x}|${d.y}|${d.appearance}`);
    actualWrites.push({
      field: r.key, widgetName: r.name, factId: w.factId ?? r.fact, page: r.page, rect: r.rect,
      printedCaption: r.caption, drawnText: drawn.map((d) => d.text).filter(Boolean),
      expected: FIXTURES[fixtureName][r.fact] ?? null
    });
  }
  // Ink that landed nowhere the map measured. Counted rather than asserted to be
  // zero, because a count nobody computed is not evidence of anything.
  const measured = census.rows.map((r) => ({ page: r.page, rect: r.rect }));
  let outside = 0;
  for (const w of widgets) {
    const at = measured.some((m) => m.page === w.page
      && Math.abs(w.x - m.rect.x) <= 2 && Math.abs(w.y - m.rect.y) <= 2);
    if (!at) outside += String(w.text ?? "").replace(/\s+/g, "").length;
  }
  // Every route mark must be readable in the bytes and must be inside its box.
  const added = marks.length > 0 ? await addedPaintedPaths(preMarkBytes, postMarkBytes) : [];
  const markProof = marks.map((m) => {
    const inside = added.filter((row) => row.page === m.page && pathInsideBox(row, m.box));
    return { ...m, paintedStrokesInsideTheBox: inside.length };
  });
  const strayMarkStrokes = added.filter((row) => !marks.some((m) => m.page === row.page && pathInsideBox(row, m.box))).length;
  return { actualWrites, appearances: widgets.length, outside, markProof, strayMarkStrokes };
}

/* ------------------------------------------------------------------ *
 * The four composed components.
 *
 * The route names five components and the official form is only one of them. A
 * component that is mapped and never rendered is a missing companion form, so
 * each of these is rendered into the same packet, listed in the field map by its
 * own component id, and named in the participant instructions.
 *
 * Nothing here states a fee, a deadline or a service method. The form's own
 * acknowledgments establish that a copy goes to the Commonwealth's Attorney and
 * that the CCRE must be asked to forward the record; they do not establish an
 * amount or a number of days, and this lane never writes an unsourced figure
 * into a filing instruction.
 * ------------------------------------------------------------------ */
const COMPOSED_TITLES = {
  commonwealth_service_and_stipulation_request: "Copy to the Attorney for the Commonwealth, and Request for the Commonwealth's Position",
  ccre_forwarding_request: "Request to the Central Criminal Records Exchange to Forward a Criminal History Record",
  records_checklist: "Records Checklist for this Petition",
  filing_instructions: "Filing Instructions"
};

function composedBody(componentId, config, facts, form, feePosture, stopConditions) {
  const name = facts["participant.full_legal_name"];
  const court = facts["matter.court"];
  const caseNo = facts["matter.case_number"];
  // The two acknowledgments these companion pages exist to discharge, named
  // separately because they are separate obligations: one is the copy that goes
  // to the Attorney for the Commonwealth, the other is the record the Central
  // Criminal Records Exchange forwards to the court after filing.
  const ackService = form.formNumber === "CC-1201"
    ? "Form CC-1201, Section E, acknowledgment 1"
    : "Form CC-1203, acknowledgment I";
  const ackRecord = form.formNumber === "CC-1201"
    ? "Form CC-1201, Section E, acknowledgment 2"
    : "Form CC-1203, acknowledgment II";
  const L = [];
  L.push(COMPOSED_TITLES[componentId].toUpperCase(), "");
  L.push(`Petitioner: ${name}`);
  L.push(`Case number of the matter to be sealed: ${caseNo}`);
  L.push(`Circuit Court: ${court}`);
  L.push(`Petition: ${form.formNumber} — ${FORMS[form.formNumber].title}`);
  L.push(`Statutory route: ${config.statute}`);
  L.push("");
  if (componentId === "commonwealth_service_and_stipulation_request") {
    L.push("To: the Attorney for the Commonwealth for the county or city named above.", "");
    L.push(`Enclosed is a copy of the petition for sealing filed by ${name} in the ${court} Circuit Court. ${ackService} says that the petitioner must provide a copy of the petition, by delivery or by first-class mail with postage prepaid, to the Attorney for the Commonwealth for the county or city where the petition is filed. This is that copy.`, "");
    L.push("The petitioner asks the Attorney for the Commonwealth to state, in writing and to the court, whether the Commonwealth objects to the sealing sought by the enclosed petition. A statement that the Commonwealth does not object is not required for the petition to proceed, and nothing in this request asks the Attorney for the Commonwealth to agree to anything.", "");
    L.push("The petitioner is not represented by counsel. Correspondence about this petition should go to the address printed on the petition's signature page.", "");
    L.push("MAILING ADDRESS OF THE ATTORNEY FOR THE COMMONWEALTH");
    L.push("(the petitioner writes it here before mailing)");
    L.push("");
    L.push("....................................................................................", "");
    L.push("DATE OF DELIVERY OR MAILING ......................................................");
    L.push("SIGNATURE OF PETITIONER ..........................................................", "");
    L.push("This page is not a certificate of mailing and does not say that anything has been mailed. It is completed and signed by the petitioner at the time the copy actually goes out.");
  } else if (componentId === "ccre_forwarding_request") {
    L.push("To: the Central Criminal Records Exchange, Virginia Department of State Police.", "");
    L.push(`${ackRecord} says that after the petition is filed the petitioner must request that the Central Criminal Records Exchange electronically forward a copy of the petitioner's Virginia and national criminal history record to the circuit court where the petition is filed. This page is that request.`, "");
    L.push(`Please forward the Virginia and national criminal history record of ${name} to the ${court} Circuit Court, for the sealing petition identified above.`, "");
    L.push("The form on which the Department of State Police accepts this request, the identification it requires, and any charge for it are not stated on this page, because they are not established by the petition itself. The Department of State Police publishes the current procedure; ask the circuit court clerk if you cannot find it.", "");
    L.push("PETITIONER'S DATE OF BIRTH .......................................................");
    L.push("(printed on the petition; copy it here so the record can be matched)", "");
    L.push("DATE OF THIS REQUEST .............................................................");
    L.push("SIGNATURE OF PETITIONER ..........................................................", "");
    L.push("File the petition first. This request is made after filing, not before.");
  } else if (componentId === "records_checklist") {
    L.push("The petition asks for facts that live on your own court and arrest records. Gather these before you fill it in, and keep them together with the packet.", "");
    L.push("[ ] The charge or conviction exactly as it is worded on your court record.");
    L.push("[ ] The case number of the matter to be sealed. (The platform has filled this in for you as printed above; check it against your record.)");
    L.push("[ ] The date of final disposition or conviction.");
    L.push("[ ] The date of arrest, and the name of the agency that arrested you.");
    L.push("[ ] The document control number (DCN), if your arrest paperwork shows one.");
    L.push("[ ] A copy of the warrant, summons or indictment — the petition asks whether it is attached.");
    L.push("[ ] Your sex and race as they appear on the court record, and your Social Security number.");
    L.push("[ ] If an ancillary matter is included: its case number, disposition date, arrest date, agency, DCN and charging document.");
    L.push("[ ] Your criminal history record from the Central Criminal Records Exchange, forwarded to the court after filing.", "");
    L.push("If a record cannot be found, the petition has a box for that: it asks you to say why the information is not reasonably available. Say what you tried. Do not guess a date.");
  } else {
    L.push(`This packet is prepared for ${config.routeName}.`, "");
    L.push("WHERE THIS GOES", "");
    L.push(`File the petition with the CIRCUIT COURT for ${court}. ${form.formNumber} prints the circuit court's city or county on its own first page, and the platform has filled it in as printed above. If your case was decided in a General District Court or a Juvenile and Domestic Relations District Court, the petition still goes to the CIRCUIT COURT for that city or county, and the petition asks separately which court decided the case.`, "");
    L.push("WHAT YOU DO, IN ORDER", "");
    L.push("1. Complete every item this packet's participant instructions list. Each one names the page and the words printed beside the blank.");
    L.push("2. Sign and date the petition yourself. The platform never signs for you and never dates a signature, so those lines are deliberately blank.");
    L.push("3. File the petition with the circuit court clerk.");
    L.push("4. Give or mail a copy to the Attorney for the Commonwealth, using the page in this packet headed for that purpose.");
    L.push("5. After filing, ask the Central Criminal Records Exchange to forward your Virginia and national criminal history record to that circuit court, using the page in this packet headed for that purpose.", "");
    if (feePosture) {
      L.push("WHAT THIS COSTS, AND WHY THERE IS NOTHING TO WAIVE", "");
      L.push(`Nothing, at the courthouse. The controlling legal-design record for this track and the committed packet-set manifest state the fee position for this petition in the same words: "${feePosture.feeStatement}"`, "");
      L.push(`Those two sections are ${feePosture.citedAs}. The route record this packet is built on says the same thing in its own words: "${feePosture.feeClause}."`, "");
      L.push(`On a waiver, the same two records say: "${feePosture.feeWaiverStatement}" So there is no filing fee for you to pay on this petition, and there is nothing for you to ask the court to waive. If a clerk asks you for a filing fee on this petition, that is worth questioning before you pay it. The charge the Central Criminal Records Exchange makes for your own copy of your own record is a separate cost and is not a court fee.`, "");
      L.push("ONE THING THIS PACKET DOES NOT TELL YOU", "");
    } else {
      L.push("TWO THINGS THIS PACKET DOES NOT TELL YOU", "");
      L.push("- The filing fee, and whether it can be waived. Ask the circuit court clerk. No amount is stated here because none is established by the petition, and an unsourced figure in a filing instruction is worse than no figure.");
    }
    L.push("- How long you have, and exactly how service must be made. The petition's own acknowledgment says a copy goes to the Attorney for the Commonwealth by delivery or by first-class mail with postage prepaid; it does not set a deadline, and neither does this page. Ask the clerk.", "");
    if (stopConditions) {
      L.push("WHEN TO STOP AND GET A LAWYER", "");
      L.push("The committed track registry records these as the points where self-help ends on this route, in its own words. If any of them describes your case, stop here and take it to a lawyer or a legal-aid office rather than filing:", "");
      for (const condition of stopConditions.conditions) L.push(`- ${condition}`);
      L.push("");
    }
    L.push("WHAT THIS PACKET IS NOT", "");
    L.push("This is a prepared set of official Virginia forms and companion pages. It is not legal advice, it is not filed for you, and it does not decide whether the court will grant sealing.");
  }
  L.push("", `Route: ${config.routeLabel ?? config.routeKey}`);
  return L.join("\n");
}

/* The composed instruction page's own geometry. Named because assertRouteLabel
 * measures the printed route line against the same column renderComposedPdf
 * draws into; two copies of 612 and 72 is how those two silently stop agreeing. */
const COMPOSED_FONT_SIZE = 11;
const COMPOSED_PAGE_WIDTH = 612;
const COMPOSED_MARGIN = 72;
const COMPOSED_TEXT_WIDTH = COMPOSED_PAGE_WIDTH - 2 * COMPOSED_MARGIN;

/*
 * The two identities, and the guard on the separation between them.
 *
 * routeKey is the machine id the census carries; it binds every manifest,
 * wiring and acceptance record and is never abbreviated in any of them.
 * routeLabel is what a person reads. A label that carried a machine key, or
 * that the page sanitizer would rewrite, or that was too wide for the composed
 * page's own text column, would defeat the point of having one -- so each of
 * those is refused here. Width is measured against that column rather than
 * against a character count, because a character count is a guess about a
 * proportional font.
 *
 * A family that declares no routeLabel keeps printing its routeKey, which is
 * what the other three families on this host do.
 */
async function assertRouteLabel(config) {
  const label = config.routeLabel;
  if (label === undefined) return;
  assert.ok(typeof label === "string" && label.trim().length > 0,
    `${config.routeKey}: declares an empty routeLabel, and the packet page prints the label`);
  assert.ok(!label.includes("obligation:"),
    `${config.routeKey}: routeLabel "${label}" carries a machine route key; the label is what a person reads`);
  assert.equal(label, sanitizePdfText(label),
    `${config.routeKey}: routeLabel would be rewritten by the page sanitizer, so the manifest and the page would disagree`);
  const probe = await PDFDocument.create();
  const font = await probe.embedFont(StandardFonts.TimesRoman);
  const width = font.widthOfTextAtSize(`Route: ${label}`, COMPOSED_FONT_SIZE);
  assert.ok(width <= COMPOSED_TEXT_WIDTH,
    `${config.routeKey}: the printed route line is ${width.toFixed(1)}pt wide against a ${COMPOSED_TEXT_WIDTH}pt column, so it would wrap`);
}

/*
 * What the committed record says about court fees on this route, read from the
 * record rather than written here from memory, and bound so that it cannot go
 * stale in silence. Returns null for a family that declares no feeAnchor --
 * that family's fee sentence is untouched.
 */
/* The clause of the destination detail that answers the fee question, and not
 * the rest of it. The detail also settles service and CCRE forwarding, and a
 * cost section that quoted all three would be quoting past its own question. */
function feeClauseOf(detail, anchor) {
  return detail.slice(0, detail.indexOf(anchor) + anchor.length).trim();
}

/* A committed record, read once, kept with the bytes it was read from. */
function readBoundRecord(rel) {
  const abs = path.join(ROOT, rel);
  assert.ok(fs.existsSync(abs), `the committed record ${rel} is not in this tree, and this packet prints from it`);
  const bytes = fs.readFileSync(abs);
  return {
    path: rel,
    sha256: crypto.createHash("sha256").update(bytes).digest("hex"),
    byteLength: bytes.length,
    json: JSON.parse(bytes.toString("utf8"))
  };
}

/** The track id behind a packet-set id: `va_seal_petition_felony-set` -> `va_seal_petition_felony`. */
const trackIdOf = (familyId) => familyId.replace(/-set$/, "");

function registryTrack(record, familyId) {
  const tracks = Array.isArray(record.json.tracks) ? record.json.tracks : Object.values(record.json.tracks ?? {});
  const track = tracks.find((t) => t.trackId === trackIdOf(familyId));
  assert.ok(track, `${familyId}: no track ${trackIdOf(familyId)} in ${record.path}`);
  return track;
}

function packetSetManifest(record, familyId) {
  const sets = record.json.packetSets ?? [];
  const set = sets.find((x) => x.packetSetId === familyId);
  assert.ok(set, `${familyId}: no packet set by that id in ${record.path}`);
  return set;
}

function boundFeePosture(config, familyId) {
  if (!config.feeAnchor) return null;
  const census = readBoundRecord(ROUTE_CENSUS);
  const route = (census.json.routes ?? []).find((r) => r.routeKey === config.routeKey);
  assert.ok(route, `${config.routeKey}: the committed census carries no route by this key`);
  const detail = route.destination?.detail;
  assert.ok(typeof detail === "string" && detail.includes(config.feeAnchor),
    `${config.routeKey}: the census destination detail no longer states "${config.feeAnchor}", so the packet may not print that posture`);

  /*
   * FIX73. The census settles that no court fee is charged; it does not carry
   * the AUTHORITY for that, and a fee statement with no citation is a claim the
   * participant cannot check. The controlling legal-design memo and the
   * committed packet-set manifest both carry the statement WITH its two
   * sections, in identical words, per track. Both are read and required to
   * agree: where two records that should say the same thing do not, this build
   * stops rather than choosing one of them.
   */
  const memo = readBoundRecord(LEGAL_DESIGN_MEMO);
  const manifests = readBoundRecord(PACKET_SET_MANIFESTS);
  const track = registryTrack(memo, familyId);
  const set = packetSetManifest(manifests, familyId);
  const actionOf = (kind) => {
    const found = (set.participantActionRequired ?? []).filter((a) => a.kind === kind);
    assert.equal(found.length, 1, `${familyId}: the packet-set manifest carries ${found.length} ${kind} actions, and the packet prints from exactly one`);
    return found[0].description;
  };
  const feeStatement = track.rules?.fees;
  const feeWaiverStatement = track.rules?.feeWaiver;
  assert.ok(typeof feeStatement === "string" && feeStatement.trim().length > 0,
    `${familyId}: the legal-design memo carries no rules.fees for this track`);
  assert.ok(typeof feeWaiverStatement === "string" && feeWaiverStatement.trim().length > 0,
    `${familyId}: the legal-design memo carries no rules.feeWaiver for this track`);
  assert.equal(feeStatement, actionOf("pay_fee"),
    `${familyId}: the memo's rules.fees and the manifest's pay_fee action disagree, and the packet may not choose between them`);
  assert.equal(feeWaiverStatement, actionOf("apply_fee_waiver"),
    `${familyId}: the memo's rules.feeWaiver and the manifest's apply_fee_waiver action disagree, and the packet may not choose between them`);

  // The two sections the statement rests on must be IN the statement the packet
  // prints, and no fee AMOUNT may be: the records carry neither a figure nor a
  // currency symbol, and this packet never writes one they do not carry.
  const citations = ["19.2-392.12(B)", "19.2-392.12:1(C)"];
  for (const cite of citations) {
    assert.ok(feeStatement.includes(cite),
      `${familyId}: the committed fee statement no longer cites ${cite}, so the packet may not cite it`);
  }
  for (const statement of [feeStatement, feeWaiverStatement]) {
    assert.ok(!/[$\u00a3\u20ac]|\bdollars?\b/i.test(statement),
      `${familyId}: a committed fee statement now carries a currency amount, and this packet prints no figure the records do not carry`);
  }

  return {
    path: census.path, sha256: census.sha256, byteLength: census.byteLength,
    routeKey: config.routeKey,
    anchorStatementVerified: config.feeAnchor,
    destinationName: route.destination?.name ?? null,
    destinationDetail: detail,
    feeClause: feeClauseOf(detail, config.feeAnchor),
    feeStatement,
    feeWaiverStatement,
    citations,
    citedAs: "Va. Code \u00a7 19.2-392.12(B) and \u00a7 19.2-392.12:1(C)",
    records: [
      { path: census.path, sha256: census.sha256, byteLength: census.byteLength, field: `routes[routeKey=${config.routeKey}].destination.detail`, role: "the committed route-obligation census: this route's canonical key and the destination detail the packet quotes" },
      { path: memo.path, sha256: memo.sha256, byteLength: memo.byteLength, field: `tracks[${trackIdOf(familyId)}].rules.fees and .rules.feeWaiver`, role: "the controlling legal-design memo: the fee statement the packet quotes, with its two sections" },
      { path: manifests.path, sha256: manifests.sha256, byteLength: manifests.byteLength, field: `packetSets[${familyId}].participantActionRequired pay_fee and apply_fee_waiver`, role: "the committed packet-set manifest: the same two statements, required here to agree word for word" }
    ]
  };
}

/*
 * Where self-help ends on this route, in the registry's own words.
 *
 * FIX73. Every one of these four tracks holds selfHelpStopConditions and not
 * one of them reached a participant: the packet stated where the PRODUCT's
 * responsibility ends, which is a different sentence. They are quoted, never
 * restated, never abridged and never softened -- so the count the registry
 * holds is asserted to be the count the packet prints, and the memo is required
 * to hold the identical list before either is printed.
 */
function boundStopConditions(familyId) {
  const registry = readBoundRecord(TRACK_REGISTRY);
  const memo = readBoundRecord(LEGAL_DESIGN_MEMO);
  const conditions = registryTrack(registry, familyId).selfHelpStopConditions ?? [];
  assert.ok(Array.isArray(conditions) && conditions.length > 0,
    `${familyId}: the committed track registry holds no selfHelpStopConditions, and this packet prints them from it`);
  assert.deepEqual(conditions, registryTrack(memo, familyId).selfHelpStopConditions ?? [],
    `${familyId}: the track registry and the legal-design memo hold different stop conditions, and the packet may not choose between them`);
  return {
    conditions,
    count: conditions.length,
    records: [
      { path: registry.path, sha256: registry.sha256, byteLength: registry.byteLength, field: `tracks[${trackIdOf(familyId)}].selfHelpStopConditions`, role: "the committed track registry: the authority for where self-help ends, quoted verbatim on the filing-instructions page and in participant-instructions.md" },
      { path: memo.path, sha256: memo.sha256, byteLength: memo.byteLength, field: `tracks[${trackIdOf(familyId)}].selfHelpStopConditions`, role: "the controlling legal-design memo: required here to hold the identical list" }
    ]
  };
}

/*
 * The component order this family's packet is assembled in.
 *
 * FIX73 / VF02. This host emitted its own COMPONENTS order for every family it
 * builds, which put the copy for the Attorney for the Commonwealth ahead of the
 * CCRE forwarding request. The authoritative packet set in the track registry
 * orders them the other way. A family opts in with `registryComponentOrder`, so
 * a family that does not carry the flag assembles exactly as it did and is
 * byte-unaffected; the opted-in family's order is read from the registry rather
 * than retyped here, and the two lists are required to hold the same members.
 */
function boundComponentOrder(familyId, config) {
  if (config.registryComponentOrder !== true) return { components: COMPONENTS, boundTo: null };
  const registry = readBoundRecord(TRACK_REGISTRY);
  const set = registryTrack(registry, familyId).packetSet;
  assert.ok(set && Array.isArray(set.components), `${familyId}: the track registry holds no packetSet components`);
  assert.equal(set.packetSetId, familyId, `${familyId}: the registry packet set is ${set.packetSetId}`);
  const ordered = [...set.components].sort((a, b) => a.order - b.order).map((c) => c.role);
  assert.deepEqual([...ordered].sort(), [...COMPONENTS].sort(),
    `${familyId}: the registry packet set and this host name different components: ${JSON.stringify(ordered)}`);
  assert.equal(ordered[0], "primary_filing", `${familyId}: the registry packet set does not open on the primary filing`);
  return {
    components: ordered,
    boundTo: {
      path: registry.path, sha256: registry.sha256, byteLength: registry.byteLength,
      field: `tracks[${trackIdOf(familyId)}].packetSet.components[].order`,
      role: "the authoritative packet set: the order the delivered pages are assembled in",
      order: ordered
    }
  };
}

function sanitizePdfText(text) {
  return text.replaceAll(" ", " ").replaceAll("‑", "-").replaceAll("–", "-")
    .replaceAll("—", "-").replaceAll("−", "-").replaceAll("’", "'")
    .replaceAll("‘", "'").replaceAll("“", '"').replaceAll("”", '"')
    .replaceAll("§", "Sec. ").replaceAll("…", "...");
}

async function renderComposedPdf(fullText, title) {
  const pdf = await PDFDocument.create();
  pdf.setTitle(title);
  pdf.setProducer("RCAP census-v1 artifact-only renderer");
  pdf.setCreator("RCAP evidence build");
  const fixed = new Date(FIXED_DATE);
  pdf.setCreationDate(fixed); pdf.setModificationDate(fixed);
  const font = await pdf.embedFont(StandardFonts.TimesRoman);
  const fontSize = COMPOSED_FONT_SIZE, lineHeight = 14.5, width = COMPOSED_PAGE_WIDTH, height = 792, margin = COMPOSED_MARGIN;
  const maxWidth = COMPOSED_TEXT_WIDTH;
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

/* The completion points each composed component carries, as map rows. */
function composedMap(componentId, config, form) {
  const base = (id, label) => ({
    field: `${componentId}.${id}`, page: 1, printedLabel: label, printedLine: label,
    effectiveLabel: label, regionHeading: label, sectionHeading: null,
    rectBasis: "composed_document_authored_by_this_build"
  });
  const writes = [
    { ...base("petitioner_name", "Petitioner named on this page"), factId: "participant.full_legal_name", kind: "composed_text", document: componentId },
    { ...base("case_number", "Case number of the matter to be sealed, printed on this page"), factId: "matter.case_number", kind: "composed_text", document: componentId },
    { ...base("court", "Circuit Court city or county printed on this page"), factId: "matter.court", kind: "composed_text", document: componentId }
  ];
  const refusals = [];
  if (componentId === "commonwealth_service_and_stipulation_request" || componentId === "ccre_forwarding_request") {
    refusals.push({
      ...base("signature", "Signature of the petitioner on this page"),
      reason: "signature or date field; never prefilled by this build",
      category: SIGNATURE, completenessClass: SIGNATURE, class: SIGNATURE,
      requiredBeforeFiling: false, why: "the petitioner signs this page themselves when the copy actually goes out"
    });
    refusals.push({
      ...base("signature_date", "Date of signature on this page"),
      reason: "signature or date field; never prefilled by this build",
      category: SIGNATURE, completenessClass: SIGNATURE, class: SIGNATURE,
      requiredBeforeFiling: false, why: "a date written before the page is signed and sent would be false"
    });
  }
  if (componentId === "commonwealth_service_and_stipulation_request") {
    refusals.push({
      ...base("commonwealth_attorney_address", "Mailing address of the Attorney for the Commonwealth"),
      reason: "the participant supplies this before filing: the mailing address of the Attorney for the Commonwealth for the county or city where the petition is filed",
      category: null, completenessClass: null, class: null,
      disposition: "REQUIRED_BEFORE_FILING", requiredBeforeFiling: true,
      identity: `${componentId} field commonwealth_attorney_address`, factId: null, routeDetermined: false,
      why: "the platform holds no address for the Attorney for the Commonwealth and the participant writes it before mailing",
      participantMustSupply: "the mailing address of the Attorney for the Commonwealth for the county or city where you file — the circuit court clerk can give it to you"
    });
  }
  if (componentId === "ccre_forwarding_request") {
    refusals.push({
      ...base("request_date", "Date of the request to the Central Criminal Records Exchange"),
      reason: "the participant supplies this before filing: the date the request to the Central Criminal Records Exchange is actually made",
      category: null, completenessClass: null, class: null,
      disposition: "REQUIRED_BEFORE_FILING", requiredBeforeFiling: true,
      identity: `${componentId} field request_date`, factId: null, routeDetermined: false,
      why: "the request is made after the petition is filed, so the date is not known when the packet is built",
      participantMustSupply: "the date you actually make the request to the Central Criminal Records Exchange, which is after the petition is filed"
    });
  }
  return {
    formNumber: componentId,
    documentPolicy: { mode: "participant", captionOnly: false, documentAcceptsFill: true, routeKey: config.routeKey },
    structuralClass: "composed_document",
    composedFrom: `${form.formNumber} acknowledgments and the route's own component list`,
    explicitMappings: {}, roleRefusals: [], selectionControls: [],
    canonicalWrites: writes, canonicalRefusals: refusals,
    boundaryWrites: writes, boundaryRefusals: refusals
  };
}

/* ---- the official form's field map --------------------------------------- */
const OFFROUTE_REASON = (why) => `${why}; this branch of the form is never populated with participant data on this route`;

function officialFieldMap(source, census, report, config, marks) {
  const written = new Set(report.written.map((w) => w.field));
  const markedKeys = new Set(marks.map((m) => m.key));
  const canonicalWrites = [];
  const canonicalRefusals = [];
  const selectionControls = [];
  for (const r of census.rows) {
    const base = {
      field: r.key, widgetName: r.name, page: r.page, rect: r.rect, rectBasis: r.rectBasis,
      printedLabel: r.caption, printedLine: r.caption,
      regionHeading: r.effectiveLabel, sectionHeading: r.section,
      effectiveLabel: r.effectiveLabel, captionReadAt: r.captionAt
    };
    if (r.policy === "write") {
      assert.ok(written.has(r.name), `${source.formNumber} ${r.key} is mapped as a write and the finalizer did not write it`);
      canonicalWrites.push({ ...base, factId: r.fact, kind: r.type, document: source.formNumber });
      continue;
    }
    if (r.policy === "select") {
      assert.ok(markedKeys.has(r.key), `${source.formNumber} ${r.key} is a route selection and no mark was drawn for it`);
      selectionControls.push({
        ...base, selectionId: r.key, kind: "selection_control", type: "checkbox",
        widgets: [{ page: r.page, rect: r.rect, rectBasis: r.rectBasis }],
        disposition: "selected_by_route",
        reason: r.routeReason, routeDetermined: true, requiredBeforeFiling: false,
        why: r.routeReason, document: source.formNumber
      });
      continue;
    }
    if (r.isSelectionControl) {
      const offroute = r.policy === "offroute";
      const protect = r.policy === "protect";
      const cls = protect ? r.refusalClass : (offroute ? null : ELECTION_CLASS);
      selectionControls.push({
        ...base, selectionId: r.key, kind: "selection_control", type: "checkbox",
        widgets: [{ page: r.page, rect: r.rect, rectBasis: r.rectBasis }],
        disposition: "explicit_refusal",
        reason: protect ? "signature or date field; never prefilled by this build"
          : offroute ? OFFROUTE_REASON(r.routeReason)
            : "a sworn assertion or legal election the route does not determine; only the participant may make it",
        category: cls, completenessClass: cls, class: cls,
        requiredBeforeFiling: false, routeDetermined: false,
        why: protect ? "the participant signs and dates this themselves at filing time"
          : offroute ? r.routeReason : "only the participant may make this election",
        document: source.formNumber
      });
      continue;
    }
    if (r.policy === "protect") {
      canonicalRefusals.push({
        ...base, reason: "signature or date field; never prefilled by this build",
        category: r.refusalClass, completenessClass: r.refusalClass, class: r.refusalClass,
        requiredBeforeFiling: false, document: source.formNumber,
        why: r.refusalClass === SIGNATURE
          ? "the participant signs and dates this themselves at filing time"
          : "the circuit court clerk owns this field and assigns it when the petition is filed"
      });
      continue;
    }
    if (r.policy === "offroute") {
      canonicalRefusals.push({
        ...base, reason: OFFROUTE_REASON(r.routeReason),
        category: null, completenessClass: null, class: null,
        requiredBeforeFiling: false, routeDetermined: false, document: source.formNumber,
        why: r.routeReason
      });
      continue;
    }
    canonicalRefusals.push({
      ...base,
      reason: `the participant supplies this before filing: ${r.what}`,
      category: null, completenessClass: null, class: null,
      disposition: "REQUIRED_BEFORE_FILING", requiredBeforeFiling: true,
      identity: `${source.formNumber} field ${r.key}`, factId: null, routeDetermined: false,
      document: source.formNumber,
      why: `the platform holds no value for this and the participant supplies it before filing: ${r.what}`,
      participantMustSupply: r.what
    });
  }
  return {
    formNumber: source.formNumber,
    documentPolicy: { mode: "participant", captionOnly: false, documentAcceptsFill: true, routeKey: config.routeKey },
    structuralClass: "acroform",
    explicitMappings: Object.fromEntries(census.rows.filter((r) => r.policy === "write").map((r) => [r.name, r.fact])),
    roleRefusals: [], selectionControls, canonicalWrites, canonicalRefusals,
    boundaryWrites: canonicalWrites, boundaryRefusals: canonicalRefusals
  };
}

/* ---- the builder's own nine counters -------------------------------------- *
 *
 * This is NOT a verdict and this lane issues none: an independent verification
 * lane that did not build these packets decides whether they pass. It is the
 * builder contract's own obligation -- "return all nine completeness counters
 * equal to zero, or return the family as STOPPED with the counter that is not"
 * -- computed with the shared contract's own exported classifiers rather than a
 * private reading of them, so the number a builder reports and the number a
 * verifier computes come from the same rules.
 *
 * The repository's focused completeness check enumerates only families listed
 * BUILT in data/rcap-grade-a/launch-control/C11_RETURN_REVIEW.json, which is a
 * record of an earlier wave and is not a path this lane may write. A family
 * built after that record therefore audits as zero families, which is a fact
 * about the enumerator rather than about the packet, and is reported as such.
 */
function builderCounters(map, actualWrites, instructionsText) {
  const counters = Object.fromEntries(PASS_COUNTERS.map((c) => [c, 0]));
  const findings = [];
  const note = (counter, detail) => { counters[counter] += 1; findings.push({ counter, ...detail }); };
  const writes = []; const blanks = [];
  for (const m of map.maps) {
    const id = m.formNumber;
    for (const w of m.canonicalWrites ?? []) writes.push({ ...w, document: id, name: w.field, label: w.effectiveLabel ?? w.field, isSelectionControl: false });
    for (const r of m.canonicalRefusals ?? []) blanks.push({ ...r, document: id, name: r.field, label: r.effectiveLabel ?? r.field, refusalClass: r.completenessClass ?? null, isSelectionControl: false });
    for (const c of m.selectionControls ?? []) {
      if (String(c.disposition ?? "").toLowerCase().startsWith("select")) {
        writes.push({ ...c, document: id, name: c.selectionId, label: c.field, isSelectionControl: false });
      } else {
        blanks.push({ ...c, document: id, name: c.field, label: `${c.field} (selection)`, refusalClass: c.completenessClass ?? null, isSelectionControl: true });
      }
    }
  }
  const normLabel = (x) => String(x ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const writtenInDocument = new Map();
  for (const w of writes) {
    const doc = String(w.document ?? "");
    if (!writtenInDocument.has(doc)) writtenInDocument.set(doc, new Set());
    for (const key of [normLabel(w.label), normLabel(w.name)]) if (key.length >= 4) writtenInDocument.get(doc).add(key);
  }
  const availableFacts = new Set(writes.map((w) => w.factId).filter(Boolean).map(String));
  const declaredRequired = [];
  for (const b of blanks) {
    const here = writtenInDocument.get(String(b.document ?? "")) ?? new Set();
    const declared = {
      // The shared reader takes a declared disposition from `completenessDisposition`
      // and nothing else. `disposition` on these rows is the map schema's own
      // write-or-blank switch, and reading it as a completeness declaration puts
      // `explicit_refusal` in front of a closed vocabulary that never contained it.
      disposition: b.completenessDisposition ?? null,
      ...(Object.hasOwn(b, "requiredBeforeFiling") ? { requiredBeforeFiling: b.requiredBeforeFiling === true } : {}),
      routeDetermined: b.routeDetermined === true,
      factId: b.factId ?? null,
      identity: b.field ?? b.blankId ?? null,
      factAvailable: (b.factId ? availableFacts.has(String(b.factId)) : false)
        || here.has(normLabel(b.label)) || here.has(normLabel(b.name))
    };
    const verdict = classifyBlank(b, b.reason, b.refusalClass, declared);
    const spec = BLANK_DISPOSITIONS[verdict.disposition];
    if (verdict.disposition === "REQUIRED_BEFORE_FILING") declaredRequired.push(b);
    if (spec.allowed) continue;
    if (verdict.disposition === "KNOWN_FACT_NOT_WRITTEN") note("knownRequiredFieldsMissing", { field: b.field, label: b.label, basis: verdict.basis });
    else if (verdict.disposition === "ROUTE_OPTION_NOT_SELECTED") note("requiredOptionsMissing", { field: b.field, label: b.label, basis: verdict.basis });
    else note("unclassifiedBlanks", { field: b.field, label: b.label, basis: verdict.basis });
  }
  const hay = String(instructionsText ?? "").toLowerCase();
  for (const b of declaredRequired) {
    const needles = [b.effectiveLabel, b.field, b.identity].map((x) => String(x ?? "").trim()).filter((x) => x.length >= 3);
    if (needles.some((n) => hay.includes(n.toLowerCase().slice(0, 60)))) continue;
    note("requiredFactsNotCollected", { field: b.field, label: b.label, why: "classified required-before-filing and not named in participant-instructions.md" });
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
      note("protectedWrites", { field: w.field, label: w.label, why: "a protected field was written" });
    }
  }
  for (const a of actualWrites.artifacts ?? []) {
    const reported = a.valuesReportedByFinalizer ?? null;
    const visible = (a.addedGlyphsReadFromOutputBytes ?? 0) + (a.flattenedWidgetAppearancesReadFromOutputBytes ?? 0);
    if (typeof reported === "number" && reported > 0 && visible === 0) {
      note("invisibleWrites", { fixture: a.fixture, reportedByFinalizer: reported });
    }
    if ((a.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes ?? 0) > 0) {
      note("visualDefects", { fixture: a.fixture, glyphsOutsideMeasuredBoxes: a.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes });
    }
  }
  return { counters, findings, terminalFields: writes.length + blanks.length, written: writes.length, blank: blanks.length };
}

/* ---- participant instructions -------------------------------------------- */
function requiredBeforeFilingItems(maps) {
  /*
   * Ordered as the participant reads the paper: page by page, and down each
   * page. The census walks the AcroForm's field order, which on CC-1201 puts
   * page 2's ancillary dates between two page 1 rows -- an instruction list in
   * that order asks somebody to work a form by jumping backwards, which is how
   * an item gets missed.
   */
  return maps.flatMap((m) => (m.canonicalRefusals ?? [])
    .filter((r) => r.requiredBeforeFiling === true)
    .map((r) => ({
      document: m.formNumber, field: r.field, page: r.page,
      y: r.rect?.y ?? null,
      printedContext: r.printedLabel, disclosureLabel: r.effectiveLabel,
      identity: r.identity, why: r.why, participantMustSupply: r.participantMustSupply
    })))
    .sort((a, b) => (a.page - b.page) || ((b.y ?? 0) - (a.y ?? 0)));
}

function instructionsMarkdown(familyId, config, resolved, rbf, routeSelections, feePosture, stopConditions, components) {
  const form = resolved[0];
  const byDoc = new Map();
  for (const item of rbf) byDoc.set(item.document, [...(byDoc.get(item.document) ?? []), item]);
  const out = [];
  out.push(`# What you must do before you file — ${config.routeName}`, "");
  out.push(`This packet is prepared for **${config.legalName}**.`, "");
  out.push(`The petition in it is **${form.formNumber}**, the Virginia circuit court form headed *${FORMS[form.formNumber].title}*. That is the form this route is filed on: the petition prints ${config.statute} on its own face, and it is the section this track is recorded under.`, "");
  if (config.formMatchesAssignment === false) {
    out.push(`> **A note for the reviewer, not for the participant.** The build assignment for this family named CC-1201. ${config.formFinding} The packet is built on ${form.formNumber} and the discrepancy is returned to the Captain rather than resolved silently.`, "");
  }
  out.push("The platform filled in what it holds about you: your name, your date of birth, your address, your telephone number, your email, the case number of the matter to be sealed and the circuit court it goes to. Everything else on the petition is yours, and this page lists every one of them by the words printed beside the blank.", "");

  out.push("## Where you file this", "");
  out.push(`File the completed packet with the **Circuit Court** for the city or county printed in the caption of the petition. ${form.formNumber} prints \`Circuit Court\` across the top of page 1 and the city-or-county line beside it is where that goes; the platform has filled it in.`, "");
  out.push("If your case was decided in a General District Court or in a Juvenile and Domestic Relations District Court, the petition still goes to the **Circuit Court** for that city or county. The petition asks separately which court decided the case, and that is a different question from where the petition is filed.", "");
  if (feePosture) {
    out.push("## What this costs, and why there is nothing to waive", "");
    out.push(`Nothing, at the courthouse. The controlling legal-design record for this track and the committed packet-set manifest state the fee position for this petition in the same words: *"${feePosture.feeStatement}"*`, "");
    out.push(`Those two sections are **${feePosture.citedAs}**. The route record this packet is built on says the same thing in its own words: *"${feePosture.feeClause}."*`, "");
    out.push(`On a waiver, the same two records say: *"${feePosture.feeWaiverStatement}"* So there is **no filing fee** for you to pay on this petition, and there is **nothing for you to ask the court to waive**. If a clerk asks you for a filing fee on this petition, that is worth questioning before you pay it. The charge the Central Criminal Records Exchange makes for your own copy of your own record is a separate cost and is not a court fee.`, "");
    out.push("One thing this packet does **not** tell you, because it is not established by the petition and an unsourced figure in a filing instruction is worse than none:", "");
  } else {
    out.push("Two things this packet does **not** tell you, because neither is established by the petition and an unsourced figure in a filing instruction is worse than none:", "");
    out.push("- **The filing fee, and whether it can be waived.** Ask the clerk of the circuit court above.");
  }
  out.push("- **How long you have, and exactly how the copy must be served.** The petition's own acknowledgment says a copy goes to the Attorney for the Commonwealth by delivery or by first-class mail with postage prepaid. It sets no deadline, and neither does this page. Ask the same clerk.", "");

  out.push("## What is in this packet", "");
  out.push(`| Component | What it is |`, `| --- | --- |`);
  // Listed in the order the packet is actually assembled in, so the table and
  // the paper agree for every family this host builds.
  const componentBlurb = {
    primary_filing: `${form.formNumber}, the petition itself`,
    commonwealth_service_and_stipulation_request: "the copy that goes to the Attorney for the Commonwealth, with a request that they state the Commonwealth's position",
    ccre_forwarding_request: "the request that the Central Criminal Records Exchange forward your criminal history record to the court, made after filing",
    records_checklist: "the records you need in front of you to complete the petition",
    filing_instructions: "where the packet goes and in what order"
  };
  for (const componentId of components) out.push(`| \`${componentId}\` | ${componentBlurb[componentId]} |`);
  out.push("");

  out.push("## What you must do", "");
  out.push("1. **Fill in every item listed below.** Each one names the document, the page and the printed words next to the blank.");
  const selectionCount = routeSelections.length;
  out.push(selectionCount === 0
    ? "2. **Read every checkbox and tick the ones that are true for you.** Each is a statement about your own record or a choice only you can make, and the platform ticks none of them for you on this route."
    : `2. **Read every checkbox and tick the ones that are true for you.** Each is a statement about your own record or a choice only you can make, and the platform ticks none of them for you except ${selectionCount === 1 ? "the one box" : `the ${selectionCount} boxes`} the statutory route decides — set out under *What the packet answered for you* below.`);
  out.push("3. **Sign and date the petition yourself.** The platform never signs and never dates a signature. Those lines are blank on purpose.");
  out.push("4. **File the petition, then give or mail a copy to the Attorney for the Commonwealth**, using the page in this packet headed for that purpose.");
  out.push("5. **After filing, ask the Central Criminal Records Exchange to forward your record to the court**, using the page in this packet headed for that purpose. The petition's own acknowledgment says this is your responsibility.");
  out.push("");

  out.push("## The items you must supply", "");
  for (const [doc, items] of byDoc) {
    const title = FORMS[doc]?.title ?? COMPOSED_TITLES[doc] ?? doc;
    out.push(`### ${doc} — ${title}`, "");
    out.push("| Page | The blank on the document | What to write |", "| --- | --- | --- |");
    for (const i of items) out.push(`| ${i.page} | ${i.disclosureLabel} | ${i.participantMustSupply} |`);
    out.push("");
  }

  out.push("## What the packet answered for you", "");
  out.push(`This packet is built for one statutory route — ${config.statute} — so it states which route it is rather than asking you:`, "");
  if (routeSelections.length === 0) {
    out.push("- Nothing on the face of this petition is decided by the route alone.", "");
  } else {
    for (const sel of routeSelections) {
      out.push(`- **Page ${sel.page}, ${sel.printedLabel}.** ${sel.why[0].toUpperCase()}${sel.why.slice(1)}.`);
    }
    out.push("");
  }
  if (Object.keys(config.routeSelect ?? {}).length === 0) {
    out.push(`Nothing about the **offence level** is decided for you. The route establishes that the offence is a felony under ${config.statute}; which felony provision your own record falls under is a fact about that record, so both felony boxes on page 1 are left for you to read and tick.`, "");
  }
  out.push("Check each marked box against your own record before you file. If any of them is wrong for you, this is the wrong packet and you should not file it.", "");

  out.push("## Things the platform deliberately left blank", "");
  out.push("- **Your signature and the date you sign.** A signature is yours alone, and a date written before you sign would be false.");
  out.push("- **The case number at the top of the petition.** The circuit court clerk assigns that when the petition is filed.");
  out.push("- **Every attorney box, and the VSB number.** This packet is prepared for you to file without a lawyer, so the petitioner boxes are marked and the attorney boxes are not.");
  out.push("- **Your Social Security number.** The platform does not store it and will not write it for you.");
  out.push("");

  if (stopConditions) {
    out.push("## When to stop and get a lawyer", "");
    out.push("The committed track registry records these as the points where self-help ends on this route, in its own words. If any of them describes your case, stop here and take it to a lawyer or a legal-aid office rather than filing:", "");
    for (const condition of stopConditions.conditions) out.push(`- ${condition}`);
    out.push("");
    out.push("This list is the registry's, quoted and not summarised. It is not shortened for length and no condition on it is softer than it reads.", "");
  }
  out.push("## What this packet is not", "");
  out.push("This is a prepared set of official Virginia forms and companion pages. It is not legal advice, it is not filed for you, and it does not decide whether the court will grant sealing.", "");
  out.push(`_Route: ${config.routeLabel ?? config.routeKey}_`);
  return `${out.join("\n")}\n`;
}

/* ---- artifacts ------------------------------------------------------------ */
function writeArtifacts(ctx) {
  const { familyId, config, outDir, resolved, maps, artifacts, writeProofs, rasterPages, rbf, instructions, audit,
    rasterSkipped, feePosture, stopConditions, components, componentOrderBinding } = ctx;
  const form = resolved[0];
  const W = (rel, body) => fs.writeFileSync(path.join(ROOT, outDir, rel), body);

  W("production-field-map.json", `${JSON.stringify({
    schemaVersion: "rcap-official-form-field-map/v1-census-v1",
    familyId, routeKeys: [config.routeKey], routeSelectionId: config.routeSelectionId,
    jurisdiction: config.jurisdiction, statute: config.statute, legalName: config.legalName,
    officialForm: form.formNumber,
    assignedOfficialForm: config.assignedOfficialForm,
    officialFormMatchesAssignment: config.formMatchesAssignment,
    ...(config.formFinding ? { officialFormFinding: config.formFinding } : {}),
    componentSet: components,
    captionBasis: "every printed caption in this map was read from the official form's own content stream at the widget's normalized coordinates; captionReadAt records where, and the build refuses if a caption is no longer there",
    dispositionVocabulary: [SIGNATURE, COURT_OWNED, ELECTION_CLASS],
    routeSelectionsMade: maps.flatMap((m) => (m.selectionControls ?? []).filter((c) => c.disposition === "selected_by_route").map((c) => ({ document: m.formNumber, field: c.field, page: c.page, printedLabel: c.printedLabel, why: c.why }))),
    requiredBeforeFilingCount: rbf.length,
    requiredBeforeFiling: rbf,
    maps, generationAllowed: false, runtimeSelectable: false, commercialRoutesOpened: 0
  }, null, 2)}\n`);

  W("source-receipt.json", `${JSON.stringify({
    schemaVersion: "rcap-family-source-receipt/v1",
    familyId, worklistGroupId: familyId, jurisdiction: config.jurisdiction,
    implementationStrategy: "official_pdf_fill", custodyClass: "SOURCE_ALREADY_HELD",
    acquisitionCommissioned: false, corpusRootFromEnvironment: "MASTER_LIBRARY_SOURCE_DIR",
    bindingMethod: "exact path + corpus-index SHA-256 + on-disk SHA-256 + byte length",
    routeSelectionId: config.routeSelectionId,
    allSourcesExact: true,
    documents: resolved.map((r) => ({
      sourceIds: [r.sourceId], formNumber: r.formNumber, revision: r.revision,
      pathInArchive: r.pathInArchive, sha256: r.sha256, byteLength: r.byteLength
    })),
    committedRecordsBound: [
      ...(feePosture ? feePosture.records.map((r) => ({ recordId: `fee-and-waiver:${r.path}`, ...r })) : []),
      ...stopConditions.records.map((r) => ({ recordId: `self-help-stop:${r.path}`, ...r })),
      ...(componentOrderBinding ? [{ recordId: `page-order:${componentOrderBinding.path}`, ...componentOrderBinding }] : [])
    ],
    ...(feePosture ? { feeAndWaiverAsDelivered: {
      routeKey: feePosture.routeKey,
      anchorStatementVerified: feePosture.anchorStatementVerified,
      destinationName: feePosture.destinationName,
      destinationDetail: feePosture.destinationDetail,
      feeStatement: feePosture.feeStatement,
      feeWaiverStatement: feePosture.feeWaiverStatement,
      citedAs: feePosture.citedAs
    } } : {}),
    selfHelpStopConditionsAsDelivered: stopConditions.conditions,
    composedComponentsAuthoredByThisBuild: components.filter((c) => c !== "primary_filing"),
    commercialRoutesOpened: 0
  }, null, 2)}\n`);

  W("reports/rendered-artifacts.json", `${JSON.stringify({
    schemaVersion: "rcap-rendered-artifacts/v1", familyId, renderedFresh: true,
    componentSet: components,
    artifacts,
    packets: artifacts.map((a) => ({ fixture: a.fixture, documents: a.documents })),
    rasterEngine: rasterSkipped ? null : "scripts/raster/pdf-page-raster.mjs (Chromium, calibrated)",
    rasterSkipped, rasterPages
  }, null, 2)}\n`);

  W("reports/actual-writes.json", `${JSON.stringify({
    schemaVersion: "rcap-actual-writes-byte-proof/v1", familyId,
    derivedFromArtifactBytes: true,
    documents: writeProofs,
    artifacts: writeProofs.map((p) => ({
      fixture: p.fixture, formNumber: p.formNumber,
      valuesReportedByFinalizer: p.valuesReportedByFinalizer,
      addedGlyphsReadFromOutputBytes: p.addedGlyphsReadFromOutputBytes,
      flattenedWidgetAppearancesReadFromOutputBytes: p.flattenedWidgetAppearancesReadFromOutputBytes,
      nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: p.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes,
      routeSelectionMarks: p.routeSelectionMarks,
      strayRouteSelectionStrokes: p.strayRouteSelectionStrokes
    }))
  }, null, 2)}\n`);

  W("reports/builder-completeness-counters.json", `${JSON.stringify({
    schemaVersion: "rcap-builder-completeness-counters/v1", familyId,
    thisIsNotAVerdict: "A builder verdict is not a verdict. These counters are the builder contract's own obligation, computed with scripts/rcap-packet-completeness/completeness-contract.mjs. An independent verification lane that did not build this packet decides whether it passes.",
    focusedCheckNote: "scripts/rcap-packet-completeness/verify-packet-completeness.mjs enumerates only families listed BUILT in data/rcap-grade-a/launch-control/C11_RETURN_REVIEW.json, an earlier wave's record that this lane may not write. A family built after that record audits as zero families there.",
    counters: audit.counters, allNineZero: PASS_COUNTERS.every((c) => audit.counters[c] === 0),
    totals: { terminalFields: audit.terminalFields, written: audit.written, blank: audit.blank },
    findings: audit.findings
  }, null, 2)}\n`);

  W("build-status.json", `${JSON.stringify({
    schemaVersion: "rcap-family-build-status/v1", familyId,
    buildStatus: "state_built", reviewStatus: "qa_review_pending",
    builtBy: "scripts/build-census-v1-va_seal_petition_misdemeanor-set.mjs",
    rasterEngine: rasterSkipped ? null : "chromium_calibrated", popplerUsed: false,
    rasterState: rasterSkipped ? "BUILT_RASTER_PENDING" : "rendered_locally_pending_central_acceptance",
    packetsSelfVerified: 0,
    commercialRoutesOpened: 0, productionTouched: false,
    grantsNothing: "A rendered packet is review evidence. It authorizes no fulfillment and opens no commercial route."
  }, null, 2)}\n`);

  const findings = [
    {
      finding: `The official form for this family is ${form.formNumber}, and the PF01 assignment table named ${config.assignedOfficialForm}.`,
      consequence: config.formMatchesAssignment
        ? "They agree for this family. The track's recorded authority and the form's own printed title both read Va. Code § 19.2-392.12."
        : `${config.formFinding} The family is built on ${form.formNumber} and this discrepancy is the lane's principal finding.`
    },
    {
      finding: "CC-1201 gives one widget name to as many as four different boxes, and four of its widgets carry a reversed /Rect.",
      consequence: "Every row in this map is keyed by widget name plus the measured coordinate, and every rectangle is normalized before a caption is checked against it."
    },
    {
      finding: "The widget names on both forms do not describe the blanks. `User.DateOfArrest` is the ancillary matter's arrest date on CC-1201, and `User.CityOrCounty` is the deciding court's city while the shared field semantics binds that name to participant.city.",
      consequence: "Every caption was read off the page at the widget's own coordinates, and every name-channel binding that would have written the wrong fact is refused by role."
    },
    {
      finding: "The petitioner's city, state and ZIP is one printed box, and the field-semantics descriptor the widget name binds to is participant.city.",
      consequence: "The fixture carries the whole city, state and ZIP line under participant.city. This is a field-semantics fidelity note, recorded rather than worked around: the value written matches the box the court printed."
    },
    {
      finding: `${rbf.length} blanks across this packet are facts the platform does not hold.`,
      consequence: "Every one is declared REQUIRED_BEFORE_FILING and named in participant-instructions.md by the words printed beside it."
    },
    {
      finding: "The finalizer refuses a checkbox by type, which is right for a fact map and wrong for a route election.",
      consequence: "Route elections are marked after flattening, with two diagonals struck inside the box the court already printed, and each mark is read back out of the output bytes as a painted path inside its own measured box."
    }
  ];
  W("build-findings.json", `${JSON.stringify({ schemaVersion: "rcap-family-build-findings/v1", familyId, findings }, null, 2)}\n`);

  W("participant-instructions.md", instructions);

  W("approval-request.json", `${JSON.stringify({
    schemaVersion: "rcap-family-approval-request/v1", familyId,
    requested: "visual review and counsel review", buildStatus: "state_built",
    counselQuestionsRaised: config.formMatchesAssignment ? [] : [
      `This family was assigned CC-1201 and is built on ${form.formNumber}. Confirm that ${config.statute} is filed on ${form.formNumber}.`
    ],
    approvedForLive: false, live: false, commercialRoutesOpened: 0
  }, null, 2)}\n`);
}

/* ---- the one exported entry point ---------------------------------------- */
export async function runFamilyById(familyId, argv = process.argv.slice(2)) {
  const config = FAMILY_CONFIGS[familyId];
  assert.ok(config, `unknown family ${familyId}`);
  await assertRouteLabel(config);
  const feePosture = boundFeePosture(config, familyId);
  const stopConditions = boundStopConditions(familyId);
  const { components, boundTo: componentOrderBinding } = boundComponentOrder(familyId, config);
  const checkOnly = argv.includes("--check");
  const skipRaster = argv.includes("--no-raster");
  const { resolved, failures } = resolveSources(familyId);

  // The only terminal blocker this builder recognises on its own: a source that
  // does not bind by exact SHA-256. A stopped family leaves its overlay
  // directory byte-for-byte unchanged, so nothing below this line runs.
  if (failures.length > 0) {
    return {
      familyId, status: "STOPPED", stopClass: "BLOCKED_SOURCE",
      failedSourceIdentities: failures,
      why: "a source did not bind by exact SHA-256, so nothing may be rendered from it",
      overlayDirectoryTouched: false
    };
  }

  const outDir = `${OVERLAY_ROOT}/${familyId.replace(/_/g, "-")}--official-pdf-fill`;
  const source = resolved[0];
  const census = await censusOf(source, config);

  if (process.env.VA_DUMP_DRIFT) {
    for (const d of census.captionDrift) console.log(`${d.key}\tp${d.page} y=${d.y}\tCAPTION=${JSON.stringify(d.caption)}\tTHERE=${JSON.stringify(d.linesThere)}`);
    for (const u of census.unmapped) console.log(`UNMAPPED ${u.field} p${u.page} ${JSON.stringify(u.rect)} :: ${u.why}`);
    for (const k of census.missingKeys) console.log(`DICTIONARY KEY MATCHED NO WIDGET: ${k}`);
    process.exit(0);
  }
  assert.equal(census.captionDrift.length, 0,
    `a measured caption is no longer printed where the field map says: ${JSON.stringify(census.captionDrift.slice(0, 3), null, 2)}`);
  assert.equal(census.unmapped.length, 0,
    `${census.unmapped.length} widget(s) carry no measured caption: ${JSON.stringify(census.unmapped.slice(0, 5), null, 2)}`);
  assert.equal(census.missingKeys.length, 0,
    `${census.missingKeys.length} dictionary key(s) match no widget on ${source.formNumber}: ${JSON.stringify(census.missingKeys.slice(0, 8))}`);

  if (checkOnly) {
    const by = (p) => census.rows.filter((r) => r.policy === p).length;
    return {
      familyId, status: "CHECK_ONLY", officialForm: source.formNumber, sha256: source.sha256,
      widgets: census.rows.length,
      write: by("write"), supply: by("supply"), protect: by("protect"),
      election: by("election"), select: by("select"), offroute: by("offroute")
    };
  }

  for (const sub of ["fixtures", "reports", "raster"]) fs.mkdirSync(path.join(ROOT, outDir, sub), { recursive: true });

  const maps = [];
  const artifacts = [];
  const writeProofs = [];
  const rasterPages = [];

  for (const fixtureName of ["canonical", "boundary"]) {
    const facts = FIXTURES[fixtureName];
    const { bytes: filled, report } = await renderDocument(source, census, fixtureName, config);
    const selections = census.rows.filter((r) => r.policy === "select")
      .map((r) => ({ key: r.key, name: r.name, page: r.page, rect: r.rect, routeReason: r.routeReason }));
    const { bytes: marked, marks } = await markRouteSelections(filled, selections);

    // The assembled container carries the same fixed date every component page
    // already carries. PDFDocument.create() stamps the wall clock into
    // /CreationDate and /ModDate, and save({ updateMetadata: false }) only
    // declines to REFRESH that stamp -- it does not remove it -- so the first
    // stamp survived into the saved bytes. Two consecutive builds of
    // va_seal_petition_misdemeanor-set from identical inputs produced different
    // canonical.pdf and boundary.pdf SHA-256 while all sixteen raster pages and
    // both per-form primary-filing artifacts came out byte-identical. A
    // RASTER_PASS is pinned to the packet hash, so a rebuild that changed
    // nothing discarded the visual verdict as though the packet had been
    // edited. This host assembles all four VA seal-petition families, so the
    // fix reaches every one of them on its next rebuild.
    const packet = stampDeterministic(await PDFDocument.create());
    const pageManifest = [];
    const documents = [];

    const primary = await PDFDocument.load(marked, { ignoreEncryption: true });
    for (const [i, p] of (await packet.copyPages(primary, primary.getPageIndices())).entries()) {
      packet.addPage(p);
      pageManifest.push({ packetPage: packet.getPageCount(), component: "primary_filing", documentId: source.formNumber, sourcePage: i + 1, sourceSha256: source.sha256 });
    }
    documents.push("primary_filing", source.formNumber);

    for (const componentId of components.filter((c) => c !== "primary_filing")) {
      const body = composedBody(componentId, config, facts, source, feePosture, stopConditions);
      const composedBytes = await renderComposedPdf(body, COMPOSED_TITLES[componentId]);
      const composed = await PDFDocument.load(composedBytes, { ignoreEncryption: true });
      for (const [i, p] of (await packet.copyPages(composed, composed.getPageIndices())).entries()) {
        packet.addPage(p);
        pageManifest.push({ packetPage: packet.getPageCount(), component: componentId, documentId: componentId, sourcePage: i + 1, sourceSha256: null });
      }
      documents.push(componentId);
      if (fixtureName === "canonical") maps.push(composedMap(componentId, config, source));
    }

    const packetBytes = Buffer.from(await packet.save({ useObjectStreams: false, updateMetadata: false }));
    const file = `${outDir}/fixtures/${fixtureName}.pdf`;
    fs.writeFileSync(path.join(ROOT, file), packetBytes);

    const primaryFile = `${outDir}/fixtures/${fixtureName}--${source.formNumber}-primary-filing.pdf`;
    fs.writeFileSync(path.join(ROOT, primaryFile), marked);
    const proof = await byteProof(source, census, path.join(ROOT, primaryFile), report, fixtureName, marks, filled, marked);
    for (const m of proof.markProof) {
      assert.ok(m.paintedStrokesInsideTheBox >= 2,
        `route selection ${m.key} claims a mark and the output bytes carry ${m.paintedStrokesInsideTheBox} painted stroke(s) inside its box`);
    }
    assert.equal(proof.strayMarkStrokes, 0, `${proof.strayMarkStrokes} route-selection stroke(s) landed outside every measured box`);

    writeProofs.push({
      fixture: fixtureName, formNumber: source.formNumber, sourceSha256: source.sha256,
      proofMethod: "flattened widget appearances read back at every measured /Rect of the finalized bytes, and route-selection marks read back as painted paths inside their own measured boxes",
      valuesReportedByFinalizer: report.written.length,
      flattenedWidgetAppearancesReadFromOutputBytes: proof.appearances,
      addedGlyphsReadFromOutputBytes: proof.actualWrites.reduce((n, w) => n + w.drawnText.join("").length, 0),
      nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: proof.outside,
      routeSelectionMarks: proof.markProof,
      strayRouteSelectionStrokes: proof.strayMarkStrokes,
      actualWrites: proof.actualWrites
    });

    if (fixtureName === "canonical") maps.unshift(officialFieldMap(source, census, report, config, marks));

    artifacts.push({
      fixture: fixtureName, file, primaryFilingFile: primaryFile,
      sha256: crypto.createHash("sha256").update(packetBytes).digest("hex"),
      primaryFilingSha256: crypto.createHash("sha256").update(marked).digest("hex"),
      byteLength: packetBytes.length, pageCount: packet.getPageCount(), pageManifest,
      documents, components
    });

    if (!skipRaster) {
      const rasterDir = `${outDir}/raster/${fixtureName}`;
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
          component: pageManifest[i]?.component ?? null,
          pageWidthPt: render.pageWidth, pageHeightPt: render.pageHeight,
          pixelsPerPoint: Number(render.pxPerPt.toFixed(4)),
          calibrationResidualPx: render.calibrationResidualPx,
          paperBounds: render.paper,
          engine: "chromium_calibrated_scripts_lib_pdf_page_raster",
          sha256: crypto.createHash("sha256").update(fs.readFileSync(png)).digest("hex")
        });
      }
    }
  }

  const mapDoc = { maps };
  const rbf = requiredBeforeFilingItems(maps);
  const routeSelections = (maps[0]?.selectionControls ?? [])
    .filter((c) => c.disposition === "selected_by_route")
    .map((c) => ({ field: c.field, page: c.page, printedLabel: c.effectiveLabel, why: c.why }))
    .sort((a, b) => (a.page - b.page) || a.printedLabel.localeCompare(b.printedLabel));
  const instructions = instructionsMarkdown(familyId, config, resolved, rbf, routeSelections, feePosture, stopConditions, components);
  const audit = builderCounters(mapDoc, {
    artifacts: writeProofs.map((p) => ({
      fixture: p.fixture,
      valuesReportedByFinalizer: p.valuesReportedByFinalizer,
      addedGlyphsReadFromOutputBytes: p.addedGlyphsReadFromOutputBytes,
      flattenedWidgetAppearancesReadFromOutputBytes: p.flattenedWidgetAppearancesReadFromOutputBytes,
      nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: p.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes
    }))
  }, instructions);

  writeArtifacts({
    familyId, config, outDir, resolved, maps, artifacts, writeProofs, rasterPages,
    rbf, instructions, audit, rasterSkipped: skipRaster, feePosture, stopConditions,
    components, componentOrderBinding
  });

  const allZero = PASS_COUNTERS.every((c) => audit.counters[c] === 0);
  return {
    familyId,
    status: allZero ? "COMPLETED" : "STOPPED",
    ...(allZero ? {} : {
      stopClass: "COMPLETENESS_COUNTER_NOT_ZERO",
      nonZeroCounters: PASS_COUNTERS.filter((c) => audit.counters[c] > 0),
      firstFindings: audit.findings.slice(0, 6)
    }),
    directory: outDir,
    officialForm: source.formNumber,
    officialFormAssigned: config.assignedOfficialForm,
    officialFormMatchesAssignment: config.formMatchesAssignment,
    sourceSha256: source.sha256,
    components,
    componentOrderBoundToRegistry: componentOrderBinding !== null,
    documents: [source.formNumber, ...components.filter((c) => c !== "primary_filing")],
    selfHelpStopConditionsCarried: stopConditions.count,
    terminalFields: audit.terminalFields,
    written: audit.written,
    requiredBeforeFiling: rbf.length,
    routeSelectionsMade: routeSelections.length,
    counters: audit.counters,
    nineCountersZero: allZero,
    rasterPages: rasterPages.length,
    rasterState: skipRaster ? "BUILT_RASTER_PENDING" : "RENDERED_LOCALLY_PENDING_CENTRAL_ACCEPTANCE",
    artifactHashes: artifacts.map((a) => ({ fixture: a.fixture, packetSha256: a.sha256, primaryFilingSha256: a.primaryFilingSha256, pages: a.pageCount })),
    packetsSelfVerified: 0,
    commercialRoutesOpened: 0,
    productionTouched: false
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(thisFile)) {
  const familyId = process.argv.find((a) => a.startsWith("va_")) ?? "va_seal_petition_misdemeanor-set";
  runFamilyById(familyId)
    .then((r) => { console.log(JSON.stringify(r, null, 2)); })
    .catch((e) => { console.error(e); process.exit(1); });
}
