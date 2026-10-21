#!/usr/bin/env node
/**
 * Oregon set-aside packets for the two NON-CONVICTION routes.
 *
 *   node scripts/build-census-v1-rcap-or-official-pdf-fill.mjs [--check] [--no-raster]
 *
 * One family, two official sources, two routes on ONE court form:
 *
 *   OR-OJD-ADULT-SET-ASIDE-PACKET  motion_and_declaration   ORS 137.225
 *   OR-OSP-SET-ASIDE-CCH           criminal_history_request Oregon State Police
 *   (composed)                     filing_instructions
 *
 * TWO ROUTES, TWO OPTIONS, ONE PAGE
 *
 * Page 4 of the court's motion offers three options and prints "check one
 * option only". The two routes this family carries are the two the packet
 * family is keyed to, and each one IS an option on that page:
 *
 *   or_arrest_no_charges   ORS 137.225(1)(c)  Option 3 -- cited or arrested,
 *                                             and there was no court case
 *   or_dismissed_charge    ORS 137.225(1)(d)  Option 2 -- there was a court
 *                                             case and no conviction is being
 *                                             set aside, only dismissed or
 *                                             acquitted charges
 *
 * So the option is a route determination and the packet marks it. Everything
 * belonging to the other two options is refused with the named route condition
 * that puts it outside the route, rather than left unclassified.
 *
 * NOTHING HERE AUTHORS A COORDINATE
 *
 * The binary carries no AcroForm: its blanks are printed rules and its option
 * boxes are stroked paths. Every coordinate is read out of measurements this
 * repository already holds against this exact binary --
 *
 *   data/rcap-all50/overlays/lane-c-candidates/oregon/
 *     or-ojd-adult-set-aside-packet-motion-and-declaration/overlay-profile.json
 *     ...                                                 /field-census.json
 *   data/rcap-all50/candidate-evidence/oregon/or-option-selection-geometry.json
 *
 * -- and each of those records the SHA-256 it was measured against. The build
 * refuses if the binary it is about to draw on is not that one.
 *
 * WHAT THIS FAMILY DOES NOT DELIVER, AND SAYS SO
 *
 * The packet-set manifest assigns a `proposed_order` component on both routes
 * to this same OR-OJD-ADULT-SET-ASIDE-PACKET binary. That binary contains a
 * Motion, a Declaration of Eligibility and a Certificate of Mailing, and no
 * proposed order; the Oregon corpus holds no order form at all. Nothing here
 * drafts an order for a judge to sign out of an assignment label. The gap is
 * recorded in build-findings.json and raised as a counsel question.
 *
 * Rasterization goes through scripts/raster/pdf-page-raster.mjs. Never Poppler.
 */
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

import { finalizeFlatOverlay, finalizeOfficialForm } from "./rcap-official-forms/rcap-official-form-finalize.mjs";
import { stampDeterministic } from "./rcap-official-forms/rcap-deterministic-pdf-date.mjs";
import { classifyField, classifyBlank, rowKeyOf, PASS_COUNTERS, BLANK_DISPOSITIONS } from "./rcap-packet-completeness/completeness-contract.mjs";

const thisFile = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(thisFile), "..");
process.chdir(ROOT);
const require = createRequire(import.meta.url);
const { PDFDocument, StandardFonts, rgb } = require("pdf-lib");

const FAMILY_ID = "rcap-or-official-pdf-fill";
const OUT_REL = "data/rcap-all50/overlays/census-v1/or/rcap-or-official-pdf-fill--official-pdf-fill";
const CORPUS_INDEX = "data/rcap-all50/local-source-corpus-index.json";
const LANE_C = "data/rcap-all50/overlays/lane-c-candidates/oregon/or-ojd-adult-set-aside-packet-motion-and-declaration";
const OSP_LANE_C = "data/rcap-all50/overlays/lane-c-candidates/oregon/or-osp-set-aside-criminal-history-request-and-instructions";
const GEOMETRY = "data/rcap-all50/candidate-evidence/oregon/or-option-selection-geometry.json";
const MOTION = "OR-OJD-ADULT-SET-ASIDE-PACKET";
const OSP = "OR-OSP-SET-ASIDE-CCH";
const FIXED_DATE = "2026-01-01T00:00:00.000Z";
const COMPONENTS = ["motion_and_declaration", "filing_instructions"];
const AGENCY_COMPONENT = "criminal_history_request";

const OSP_UNWRITABLE_FIELDS = [
  "AREA CODE", "PHONE NUMBER", "ALIAS NAME1", "ALIAS NAME2", "ALIAS NAME3",
  "6", "2", "7", "3", "8", "4", "9", "5", "10", "YES",
  "Fingerprint Card Form",
  "Fee for set aside of CONVICTION Include check or money order in the amount of 3300 payable"
];

const OSP_NO_BASIS = "both included Oregon routes are nonconviction routes; the OSP request asks whether the motion includes a conviction and the answer is no";

const ROUTE_HANDOFFS = Object.freeze({
  or_arrest_no_charges: {
    preflight: [
      "Before using this packet, obtain the Oregon State Police LEDS criminal history or equivalent record check and use it to confirm the record and disposition.",
      "Before filing, have the prosecutor's declination and its date from the prosecutor's office or the circuit court file; the 60-day clock runs from that declination, not from the arrest.",
      "Before filing, answer whether the matter was a DUII diversion dismissal, a traffic-violation citation, a pending charge or contempt proceeding, or a matter in more than one Oregon county."
    ],
    manualFacts: [
      { field: "manual.prosecutor_declination_evidence", label: "Evidence of the prosecutor's declination and its date", what: "the document or docket entry showing that the prosecutor elected not to proceed and the date of that election" },
      { field: "manual.pending_charge_or_contempt", label: "Pending charge or contempt status", what: "whether any criminal charge or covered contempt proceeding is pending while this motion is before the court" },
      { field: "manual.multiple_oregon_counties", label: "Other Oregon counties", what: "whether you have matters in more than one Oregon county, because each county requires its own filing" },
      { field: "manual.duii_diversion", label: "DUII diversion dismissal status", what: "whether this was a DUII charge dismissed after completion of a diversion agreement" },
      { field: "manual.traffic_violation", label: "Traffic-violation citation status", what: "whether the citation was for a traffic violation" }
    ],
    stops: [
      "The prosecutor's declination or its date cannot be established.",
      "The matter was a DUII charge dismissed after successful completion of a diversion agreement.",
      "The matter was a traffic-violation citation dismissal.",
      "A criminal charge or covered contempt proceeding is pending while the motion is before the court.",
      "The prosecuting attorney objects and a hearing is required.",
      "The participant has matters in multiple Oregon counties, requiring separate filings.",
      "The request concerns federal or out-of-state records.",
      "The participant's goal is restoration of firearm rights; an Oregon set-aside does not restore them.",
      "The participant has an immigration concern."
    ]
  },
  or_dismissed_charge: {
    preflight: [
      "Before using this packet, obtain the Oregon State Police LEDS criminal history or equivalent record check and use it to confirm the record and disposition.",
      "Before filing, have the circuit-court docket, judgment or order showing the dismissal or acquittal and its date.",
      "Before filing, answer whether the matter was a DUII diversion dismissal, a traffic-violation citation, a pending charge or contempt proceeding, or a matter in more than one Oregon county."
    ],
    manualFacts: [
      { field: "manual.dismissal_disposition_evidence", label: "Circuit-court disposition and date", what: "the docket, judgment or order showing how the case ended and when" },
      { field: "manual.pending_charge_or_contempt", label: "Pending charge or contempt status", what: "whether any criminal charge or covered contempt proceeding is pending while this motion is before the court" },
      { field: "manual.multiple_oregon_counties", label: "Other Oregon counties", what: "whether you have matters in more than one Oregon county, because each county requires its own filing" },
      { field: "manual.duii_diversion", label: "DUII diversion dismissal status", what: "whether this was a DUII matter resolved through a diversion agreement" }
    ],
    stops: [
      "The dismissal or acquittal disposition and its date cannot be established from the court record.",
      "The matter was a DUII charge dismissed after successful completion of a diversion agreement.",
      "The matter was a traffic-violation citation dismissal.",
      "A criminal charge or covered contempt proceeding is pending while the motion is before the court.",
      "The prosecuting attorney objects and a hearing is required.",
      "The participant has matters in multiple Oregon counties, requiring separate filings.",
      "The request concerns federal or out-of-state records.",
      "The participant's goal is restoration of firearm rights; an Oregon set-aside does not restore them.",
      "The participant has an immigration concern."
    ]
  }
});

const SIGNATURE = "signature_or_date_participant_completion";
const ELECTION_CLASS = "participant_sworn_narrative_or_legal_election";

const sha256 = (b) => crypto.createHash("sha256").update(b).digest("hex");
const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));

/* ------------------------------------------------------------------ *
 * The two routes.
 * ------------------------------------------------------------------ */
const ROUTES = Object.freeze({
  or_arrest_no_charges: {
    routeKey: "obligation:track-only:OR:or_arrest_no_charges",
    slug: "arrest-no-charges",
    option: "Option 3",
    optionCaption: "Option 3: I was cited or arrested and there was no court case. I am moving to set aside the citation or arrest records.",
    statute: "ORS 137.225(1)(c)",
    legalName: "Motion to Set Aside the Record of an Arrest, Citation or Charge Where No Accusatory Instrument Was Filed (ORS 137.225(1)(c))",
    whyThisOption: "this packet is built for ORS 137.225(1)(c), a citation or arrest where no accusatory instrument was filed and there is therefore no court case, and Option 3 is the branch the form prints for exactly that",
    writesCaseNumber: false,
    listsCitationOffences: true,
    documentSuffix: "or_arrest_no_charges"
  },
  or_dismissed_charge: {
    routeKey: "obligation:track-only:OR:or_dismissed_charge",
    slug: "dismissed-charge",
    option: "Option 2",
    optionCaption: "Option 2: There was a court case, and I am not moving to set aside any convictions. I am moving to set aside all eligible dismissed or acquitted charges only.",
    statute: "ORS 137.225(1)(d)",
    legalName: "Motion to Set Aside the Record of a Dismissed Charge (ORS 137.225(1)(d))",
    whyThisOption: "this packet is built for ORS 137.225(1)(d), a dismissal in a case that reached the court, and Option 2 is the branch the form prints for a court case in which no conviction is being set aside",
    writesCaseNumber: true,
    listsCitationOffences: false,
    documentSuffix: "or_dismissed_charge"
  }
});

const FIXTURES = {
  or_arrest_no_charges: {
    canonical: {
      "participant.full_legal_name": "Jordan Avery Reyes",
      "participant.date_of_birth": "1991-04-17",
      "participant.street_address": "42 Maple Street",
      "participant.city_state_zip": "Portland, OR 97205",
      "participant.email": "jordan.reyes@example.org",
      "matter.county": "Multnomah"
    },
    boundary: {
      "participant.full_legal_name": "Maria-Alejandra O'Shaughnessy-Whitfield",
      "participant.date_of_birth": "1968-12-31",
      "participant.street_address": "1188 Upper Notch Crossing Road, Apt 14B",
      "participant.city_state_zip": "Grants Pass, Oregon 97526-2214",
      "participant.email": "maria.alejandra.oshaughnessy@longmailexample.org",
      "matter.county": "Josephine"
    }
  },
  or_dismissed_charge: {
    canonical: {
      "participant.full_legal_name": "Jordan Avery Reyes",
      "participant.date_of_birth": "1991-04-17",
      "participant.street_address": "42 Maple Street",
      "participant.city_state_zip": "Portland, OR 97205",
      "participant.email": "jordan.reyes@example.org",
      "matter.county": "Multnomah",
      "matter.case_number": "21CR04170"
    },
    boundary: {
      "participant.full_legal_name": "Maria-Alejandra O'Shaughnessy-Whitfield",
      "participant.date_of_birth": "1968-12-31",
      "participant.street_address": "1188 Upper Notch Crossing Road, Apt 14B",
      "participant.city_state_zip": "Grants Pass, Oregon 97526-2214",
      "participant.email": "maria.alejandra.oshaughnessy@longmailexample.org",
      "matter.county": "Josephine",
      "matter.case_number": "24CR0012760"
    }
  }
};

/* ------------------------------------------------------------------ *
 * Every measured slot on pages 4 and 5, and what it IS on each route.
 *
 * Pages 1 to 3 of this binary are the Oregon Judicial Department's printed
 * instruction sheet, and every rule the measurement found on them is a
 * typographic underline in prose. A slot with no entry here stops the build.
 * ------------------------------------------------------------------ */
const WRITE = (fact, label) => () => ({ policy: "write", fact, label });
const SUPPLY = (what, label) => () => ({ policy: "supply", what, label });
const OPTIONAL = (what, label) => () => ({ policy: "optional", what, label });
const PROTECT = (label) => () => ({ policy: "protect", refusalClass: SIGNATURE, label });
const NOT_A_BLANK = (what, label) => () => ({ policy: "not_a_blank", what, label });

const OFFROUTE_CHARGE_TABLE = (route) => ({
  policy: "offroute",
  label: "Name of Charges and Count # in the Option 1 charge table",
  routeCondition: `the charge table is printed inside Option 1, the conviction branch, under the election "Not all the charges on this case are eligible. I am moving to set aside only the following charges"; this packet is filed on ${route.option} and sets aside no conviction`
});
const OFFROUTE_ADDITIONAL_CHARGES = (route) => ({
  policy: "offroute",
  label: "I have additional charges to provide, and they are attached on a separate page",
  routeCondition: `the additional-charges line closes the Option 1 charge table; this packet is filed on ${route.option} and never lists convictions to be set aside`
});

const CITATION_OFFENCE_LINE = (n) => (route) => (route.listsCitationOffences
  ? { policy: "supply", label: `Name of Citation/Arrest Offenses (line ${n})`,
      what: `the ${n === 1 ? "first" : n === 2 ? "second" : n === 3 ? "third" : n === 4 ? "fourth" : n === 5 ? "fifth" : n === 6 ? "sixth" : n === 7 ? "seventh" : "eighth"} citation or arrest offence you are asking the court to set aside, worded as it appears on the citation, the booking record or the Oregon State Police criminal history you requested` }
  : { policy: "offroute", label: `Name of Citation/Arrest Offenses (line ${n})`,
      routeCondition: `these lines belong to Option 3, a citation or arrest with no court case; this packet is filed on ${route.option}, which is a charge that reached the court` });

const CITATION_OFFENCE_BORDER = (n) => (route) => (route.listsCitationOffences
  ? { policy: "not_a_blank", label: `Printed border line near citation/arrest offenses (line ${n})`,
      what: "a printed border line in the court's Option 3 offense area, not a fifth-or-later offense blank" }
  : { policy: "offroute", label: `Printed border line near citation/arrest offenses (line ${n})`,
      routeCondition: `this printed border belongs to the Option 3 citation/arrest branch, while this packet is filed on ${route.option}` });

const ADDITIONAL_OFFENSES = (route) => (route.listsCitationOffences
  ? { policy: "optional", label: "Additional citation/arrest offenses attached on a separate page",
      what: "an additional citation or arrest offense only if the five printed offense rows are not enough; attach the extra page and tick the printed additional-offenses box by hand" }
  : { policy: "offroute", label: "Additional citation/arrest offenses attached on a separate page",
      routeCondition: `this additional-offenses box belongs to Option 3, while this packet is filed on ${route.option}` });

const MOTION_POLICY = {
  "p4.r693.7.x305.rule": WRITE("matter.county", "FOR THE COUNTY OF"),
  "p4.r666.5.x395.rule": (route) => (route.writesCaseNumber
    ? { policy: "write", fact: "matter.case_number", label: "Case No:" }
    : { policy: "offroute", label: "Case No:",
        routeCondition: "the form prints \"(leave blank if no court case)\" beside this line, and this route is a citation or arrest where no accusatory instrument was ever filed, so no case number exists to write" }),
  "p4.r611.9.x72.rule": WRITE("participant.full_legal_name", "Defendant"),
  "p4.r585.6.x102.rule": WRITE("participant.date_of_birth", "DOB:"),
  "p4.r564.1.x146.rule": OPTIONAL("your Oregon SID number, if you know it -- it appears on Oregon State Police correspondence and on your criminal history", "SID# if known"),
  "p4.r537.8.x277.rule": SUPPLY("the law enforcement agency that cited or arrested you, for example \"Salem Police Dept.\" or \"Coos County Sheriff\"", "Citing/arresting law enforcement agency"),
  "p4.r512.2.x134.rule": SUPPLY("your arrest date, or if there was no arrest the date of the citation, booking or incident", "Arrest Date"),
  "p4.r479.0.x264.rule": OPTIONAL("your fingerprint number (FPN #), if you know it -- the Oregon State Police assign it when a fingerprint card is processed", "Fingerprint number (FPN #) if known"),
  "p4.r393.1.x72.rule": NOT_A_BLANK("a typographic rule under the Option 1 heading", "printed rule under the Option 1 heading"),
  "p4.r185.9.x72.rule": NOT_A_BLANK("a typographic rule under the Option 2 heading", "printed rule under the Option 2 heading"),
  "p4.r151.6.x72.rule": NOT_A_BLANK("a typographic rule under the Option 3 heading", "printed rule under the Option 3 heading"),
  "p5.r523.6.x145.rule": NOT_A_BLANK("a typographic rule inside a printed declaration sentence", "printed rule inside the Option 1 declaration text"),
  "p5.r378.2.x72.rule": PROTECT("Date of the declaration signature"),
  "p5.r378.2.x288.rule": PROTECT("Signature on the declaration"),
  "p5.r340.8.x72.rule": WRITE("participant.email", "Email"),
  "p5.r340.8.x288.rule": WRITE("participant.full_legal_name", "Name (typed or printed)"),
  "p5.r303.2.x72.rule": WRITE("participant.street_address", "Address"),
  "p5.r229.8.x186.rule": PROTECT("Date of mailing on the certificate of mailing"),
  "p5.r211.1.x432.rule": SUPPLY("the mailing address of the prosecuting office for the county where the charges were or could have been filed -- the Oregon Judicial Department instruction pages in this packet say where to look it up", "Prosecuting office mailing address on the certificate of mailing"),
  "p5.r192.4.x72.rule": OPTIONAL("the rest of that prosecuting attorney's address, if the recipient's address needs a second line", "Second line of the prosecuting attorney's address"),
  "p5.r154.8.x72.rule": PROTECT("Date beside the defendant's signature on the certificate of mailing"),
  "p5.r154.8.x288.rule": PROTECT("Defendant (signature) on the certificate of mailing"),
  "p5.r115.6.x288.rule": WRITE("participant.full_legal_name", "Defendant Name printed on the certificate of mailing")
};
/* The Option 1 charge table is outside both routes in this family. */
for (const y of ["295.2", "282.1", "269.2", "256.2", "243.1", "230.2"]) {
  MOTION_POLICY[`p4.r${y}.x144.rule`] = OFFROUTE_CHARGE_TABLE;
  MOTION_POLICY[`p4.r${y}.x477.rule`] = OFFROUTE_CHARGE_TABLE;
}
MOTION_POLICY["p4.r217.2.x144.rule"] = OFFROUTE_ADDITIONAL_CHARGES;
MOTION_POLICY["p4.r217.2.x477.rule"] = OFFROUTE_ADDITIONAL_CHARGES;
/* The court prints five physical Option 3 offense rows: three on page 4 and two on page 5. */
["p4.r128.4.x126.rule", "p4.r115.4.x126.rule", "p4.r101.4.x126.rule", "p5.r719.5.x126.rule", "p5.r705.6.x126.rule"]
  .forEach((key, i) => { MOTION_POLICY[key] = CITATION_OFFENCE_LINE(i + 1); });
/* These measured rectangles are border/presentation lines, not additional offense cells. */
["p4.r87.5.x126.rule", "p4.r73.4.x126.rule"]
  .forEach((key, i) => { MOTION_POLICY[key] = CITATION_OFFENCE_BORDER(i + 4); });
MOTION_POLICY["p5.r691.6.x126.rule"] = ADDITIONAL_OFFENSES;

/* The address rule carries three printed captions on one measured line. */
const ADDRESS_SPLIT = [
  { key: "p5.r303.2.x72.rule#citystatezip", fact: "participant.city_state_zip", label: "City, State, ZIP", policy: "write" },
  { key: "p5.r303.2.x72.rule#phone", label: "Phone", policy: "supply", factId: "participant.phone",
    what: "your phone number, written by hand in the Phone column at the right end of the address line -- the court's printed column is 34 points wide and no phone number fits it at the minimum readable machine font, so this packet leaves that column to your pen" }
];

const DECLARATION_LABELS = [
  "I have waited the required period under law to file this Motion",
  "I believe I am legally eligible for a set aside",
  "I have filed fingerprints with the Oregon State Police",
  "I will serve a copy of this Motion on the prosecuting attorney",
  "I am not currently charged with a crime or contempt of court related to abuse or a person crime",
  "I have paid the Oregon State Police background check fee",
  "I have fully complied and performed all terms of the sentence of the court"
];

/* ---- source binding ------------------------------------------------------ */
function resolveSources() {
  const index = readJson(CORPUS_INDEX);
  const rows = index.entries ?? [];
  const resolved = []; const failures = [];
  const root = process.env.MASTER_LIBRARY_SOURCE_DIR;
  if (!root || !fs.existsSync(root)) {
    return { resolved: [], failures: [{ sourceIdentity: "corpus", why: "the Master Library is not mounted; MASTER_LIBRARY_SOURCE_DIR names no directory" }] };
  }
  for (const formNumber of [MOTION, OSP]) {
    const entry = rows.find((e) => String(e.path ?? "").startsWith("STATES/OR/") && String(e.path ?? "").includes(`__${formNumber}__`));
    if (!entry) { failures.push({ sourceIdentity: `official-form:${formNumber}`, why: "no entry for this form number in the committed corpus index" }); continue; }
    const abs = path.resolve(root, entry.path);
    if (!fs.existsSync(abs)) { failures.push({ sourceIdentity: `official-form:${formNumber}`, why: `the indexed path does not exist on disk: ${entry.path}` }); continue; }
    const bytes = fs.readFileSync(abs);
    const digest = sha256(bytes);
    if (entry.sha256 !== digest) { failures.push({ sourceIdentity: `official-form:${formNumber}`, why: `SHA-256 drift: the committed index says ${entry.sha256}, the corpus binary hashes ${digest}` }); continue; }
    resolved.push({ formNumber, sourceId: `official-form:${formNumber}`, pathInArchive: entry.path,
      revision: /__REV-([0-9A-Za-z-]+)__/.exec(entry.path)?.[1] ?? null, sha256: digest, byteLength: bytes.length, bytes });
  }
  return { resolved, failures };
}

function loadMeasurements(motionSha, ospSha) {
  const profile = readJson(`${LANE_C}/overlay-profile.json`);
  const census = readJson(`${LANE_C}/field-census.json`);
  const geometry = readJson(GEOMETRY);
  const ospCensus = readJson(`${OSP_LANE_C}/field-census.json`);
  const ospMap = readJson(`${OSP_LANE_C}/production-field-map.json`);
  const mismatched = [
    ["overlay-profile.json", profile.sha256],
    ["field-census.json", census.sha256],
    [path.basename(GEOMETRY), geometry.source?.sha256 ?? null]
  ].filter(([, sha]) => sha && sha !== motionSha);
  if (ospCensus.sha256 && ospCensus.sha256 !== ospSha) mismatched.push(["OSP field-census.json", ospCensus.sha256]);
  if (ospMap.sha256 && ospMap.sha256 !== ospSha) mismatched.push(["OSP production-field-map.json", ospMap.sha256]);
  return { profile, census, geometry, ospCensus, ospMap, mismatched };
}

/* ---- the completeness surface, per route --------------------------------- */
function motionRows(census, geometry, route, documentId) {
  const rows = []; const unmapped = [];
  for (const f of census.fields ?? []) {
    const rect = f.widgets?.[0]?.rect ?? null;
    if (f.page <= 3) {
      rows.push({ key: f.name, page: f.page, rect, document: documentId,
        label: "printed rule on the OJD instruction sheet", caption: f.effectiveLabel ?? null,
        policy: "not_a_blank",
        what: "a typographic rule in the instruction sheet's own prose; pages 1 to 3 of this binary are the Oregon Judicial Department's printed instructions and carry no blank anybody fills" });
      continue;
    }
    const make = MOTION_POLICY[f.name];
    if (!make) { unmapped.push({ key: f.name, page: f.page, rect, caption: f.effectiveLabel ?? null }); continue; }
    const entry = make(route);
    rows.push({ key: f.name, page: f.page, rect, document: documentId,
      label: entry.label, caption: f.effectiveLabel ?? null,
      policy: entry.policy, fact: entry.fact ?? null, refusalClass: entry.refusalClass ?? null,
      what: entry.what ?? null, routeCondition: entry.routeCondition ?? null });
    if (f.name === "p5.r303.2.x72.rule") {
      for (const extra of ADDRESS_SPLIT) {
        rows.push({ key: extra.key, page: f.page, rect, document: documentId,
          label: extra.label, caption: f.effectiveLabel ?? null,
          policy: extra.policy, fact: extra.fact ?? extra.factId ?? null, what: extra.what ?? null });
      }
    }
  }
  for (const o of geometry.options ?? []) {
    if (!o.boxIsMeasured || !o.box) continue;
    const selected = o.option === route.option;
    rows.push({
      key: `option:${o.option}`, page: o.page, box: o.box, document: documentId,
      label: selected ? route.optionCaption : `${o.option} on the eligibility statement`,
      caption: o.option, isSelectionControl: true,
      policy: selected ? "select" : "offroute",
      why: selected ? route.whyThisOption : null,
      routeCondition: selected ? null
        : `the form prints "check one option only" and this packet is filed on ${route.option}; ${o.option} is a different branch of ORS 137.225 and marking it would state a route this packet was not built for`
    });
  }
  (geometry.declarationBoxes ?? []).forEach((b, i) => {
    const optionOneOnly = i >= 4;
    rows.push({
      key: `declaration:${i + 1}`, page: b.page, box: b.box, document: documentId,
      label: DECLARATION_LABELS[i] ?? `declaration box ${i + 1}`,
      caption: DECLARATION_LABELS[i] ?? null, isSelectionControl: true,
      policy: optionOneOnly ? "offroute" : "election",
      routeCondition: optionOneOnly
        ? `the form prints "If you selected Option 1 above, all of the following must also be true" above these three boxes; this packet is filed on ${route.option} and selects no conviction to set aside`
        : null
    });
  });
  return { rows, unmapped };
}

/* ---- render the motion --------------------------------------------------- */
async function renderMotion(source, profile, census, geometry, route, facts) {
  const wanted = new Set(["FOR THE COUNTY OF", "Defendant", "DOB:", "Name (typed or printed)", "Email", "Address", "City, State, ZIP", "Defendant Name printed on the certificate of mailing"]);
  if (route.writesCaseNumber) wanted.add("Case No:");
  const anchors = (profile.anchors ?? []).filter((a) => wanted.has(a.label));
  if (!anchors.some((a) => a.label === "Defendant Name printed on the certificate of mailing")) {
    const measured = (census.fields ?? []).find((f) => f.name === "p5.r115.6.x288.rule");
    assert.ok(measured?.widgets?.[0]?.rect, "the certificate printed-name rule must have an exact census rectangle");
    anchors.push({
      label: "Defendant Name printed on the certificate of mailing", page: measured.page,
      writeBox: measured.widgets[0].rect, fontSize: measured.baselineFontSize ?? 11,
      slot: measured.name, subRegion: null, factId: "participant.full_legal_name"
    });
  }
  assert.equal(anchors.length, wanted.size, `an anchor this route writes is missing from the overlay profile: ${JSON.stringify([...wanted])}`);
  const selections = (geometry.options ?? [])
    .filter((o) => o.boxIsMeasured && o.box && o.option === route.option)
    .map((o) => ({ label: o.option, page: o.page, box: o.box, measured: true, inset: o.markPlan?.inset ?? 2 }));
  assert.equal(selections.length, 1, "exactly one measured option box must be marked");
  const { bytes, report } = await finalizeFlatOverlay({
    sourceBytes: source.bytes, expectedSha256: source.sha256,
    anchors, selections, protectedRules: profile.protectedRules ?? [],
    explicitMappings: Object.fromEntries(anchors.filter((a) => a.factId).map((a) => [a.label, a.factId])),
    facts, documentTextLines: [],
    title: "Motion to Set Aside and Seal, and Declaration of Eligibility"
  });
  return { bytes, report, selections, anchors };
}

/* ---- render the separate OSP agency handoff ------------------------------ */
async function renderOsp(source, census, route, facts) {
  const ospFacts = {
    ...facts,
    // The source asks for one mailing line. The two held address facts are
    // joined explicitly for that one source field; no address component is
    // guessed or substituted.
    "participant.city_state_zip": `${facts["participant.street_address"]}, ${facts["participant.city_state_zip"]}`,
    // The OSP form asks for the court in which the set-aside is sought. The
    // fixture holds the county; this exact court label is the source's own
    // printed example pattern, derived from that held county and never from a
    // guessed docket or court number.
    "matter.court": `Circuit Court for ${facts["matter.county"]} County`
  };
  const ospFields = (census.fields ?? []).map((field) => field.name === "1"
    ? { ...field, effectiveLabel: "Circuit or municipal court name" }
    : field);
  const { bytes, report } = await finalizeOfficialForm({
    sourceBytes: source.bytes, expectedSha256: source.sha256,
    census: ospFields, facts: ospFacts,
    explicitMappings: {
      NAME: "participant.full_legal_name",
      "DATE OF BIRTH": "participant.date_of_birth",
      "Street, City, State, Zip code": "participant.city_state_zip",
      "1": "matter.court"
    },
    unwritableFields: OSP_UNWRITABLE_FIELDS,
    printedDateOrderByField: { "DATE OF BIRTH": "month_day_year" },
    selectionsFromHeldFacts: {
      NO: { checked: true, basis: OSP_NO_BASIS }
    },
    title: "Oregon State Police Set-Aside Criminal History Request"
  });
  const expectedRefusals = new Set(OSP_UNWRITABLE_FIELDS);
  const unexpectedRefusals = (report.refused ?? []).filter((r) => !expectedRefusals.has(r.field));
  assert.deepEqual(unexpectedRefusals, [], `OSP had an unexpected refusal: ${JSON.stringify(unexpectedRefusals)}`);
  assert.equal((report.refused ?? []).some((r) => r.field === "NAME"), false, "OSP NAME must be written");
  assert.equal((report.refused ?? []).some((r) => r.field === "DATE OF BIRTH"), false, "OSP DATE OF BIRTH must be written");
  assert.equal((report.refused ?? []).some((r) => r.field === "Street, City, State, Zip code"), false, "OSP mailing address must be written from held address facts");
  assert.equal((report.refused ?? []).some((r) => r.field === "1"), false, "OSP court row 1 must be written from the held county");
  assert.equal((report.written ?? []).some((r) => r.field === "1" && r.factId === "matter.court"), true, "OSP court row 1 must carry the derived circuit-court label");
  assert.equal((report.selectionsMarked ?? []).some((r) => r.field === "NO"), true, "OSP NO route choice must be marked");
  assert.equal((report.selectionsMarked ?? []).some((r) => r.field === "YES"), false, "OSP YES route choice must remain unmarked");
  return { bytes, report, facts: ospFacts };
}

/* ---- the composed filing instructions ------------------------------------ */
function composedBody(route, facts) {
  const L = [];
  L.push("FILING INSTRUCTIONS", "");
  L.push(`Movant: ${facts["participant.full_legal_name"]}`);
  if (route.writesCaseNumber) L.push(`Case No.: ${facts["matter.case_number"]}`);
  else L.push("Case No.: none - this route is a citation or arrest with no court case, and the form says to leave the Case No. line blank");
  L.push(`County: ${facts["matter.county"]}`);
  L.push(`Route: ${route.legalName}`, "");
  L.push("WHERE THIS GOES", "");
  L.push(`File the Motion and Declaration in the CIRCUIT COURT of the State of Oregon for ${facts["matter.county"]} County - the county in which you were arrested, cited or charged. The caption on the motion is already filled in with that county.`, "");
  L.push("THE ORDER OF THE STEPS MATTERS", "");
  L.push("The Oregon Judicial Department's own instruction pages are the first three pages of this packet, and they set the order. In short:", "");
  L.push("1. Handle the Oregon State Police request and fingerprint card as a separate agency handoff. Follow the current county or jurisdiction instructions for when that handoff is sent; enclosing the request here is not proof that fingerprints have been filed.");
  L.push("2. Complete the Motion and Declaration. Every item this packet's participant instructions list is yours to fill in.");
  L.push("3. Make two copies: one for your records, one for the District Attorney.");
  L.push("4. Mail a copy to the prosecuting attorney in the county where charges were or could have been filed, or where the arrest happened.");
  L.push("5. Complete the certificate of mailing at the bottom of the motion - at the time you mail it, not before.");
  L.push("6. File the court forms in the circuit court.", "");
  L.push("WHAT THIS PACKET ANSWERED FOR YOU", "");
  L.push(`Page 4 of the motion says to check ONE option only. This packet is built for ${route.statute}, so ${route.option} is marked and the other two are left unmarked. Read the marked option against your own record before you file; if it is not true of your case, this is the wrong packet.`, "");
  if (route.writesCaseNumber) {
    L.push("Option 2 covers a case that reached the court and ended without a conviction you are asking to set aside. If any charge on this case ended in a conviction and you want that set aside too, this is not the packet for it.", "");
  } else {
    L.push("Option 3 covers a citation or arrest where no accusatory instrument was ever filed. The Case No. line is deliberately blank: the form itself prints \"leave blank if no court case\" beside it. If a case was in fact filed against you, this is not the packet for it.", "");
  }
  L.push("WHAT THIS PACKET DID NOT ANSWER", "");
  L.push("The declaration boxes on page 5 are your sworn statements about your own case, and nothing marks them for you. Read each one and tick the ones that are true.", "");
  L.push("The statement that you have filed fingerprints with the Oregon State Police remains yours to make. The included agency request does not answer that sworn statement for you.", "");
  L.push(`The last three declaration boxes are printed under "If you selected Option 1 above". This packet is filed on ${route.option}, so they are left unmarked as a branch this route does not use.`, "");
  L.push("The motion says \"No Filing Fee\" on its own face. The included Oregon State Police fee line is for requests to set aside convictions, while these two routes concern no conviction. Any separate fingerprint-provider charge is a participant and agency matter; this packet does not invent an amount.", "");
  L.push("BEFORE YOU FILE", "");
  const handoff = ROUTE_HANDOFFS[route.documentSuffix === "or_arrest_no_charges" ? "or_arrest_no_charges" : "or_dismissed_charge"];
  for (const item of handoff.preflight) L.push(`- ${item}`);
  L.push("STOP AND ASK FOR HELP", "");
  L.push("Stop before filing if any of these conditions applies:");
  for (const item of handoff.stops) L.push(`- ${item}`);
  L.push("");
  L.push("NO PROPOSED ORDER IS ENCLOSED", "");
  L.push("The court filing packet contains the Motion, the Declaration of Eligibility and the Certificate of Mailing. The Oregon State Police request is a separate agency handoff file, governed by the current county or jurisdiction instructions. Neither file contains a proposed order; the court's own packet does not include one and none is drafted here because the order is the court's act, not this packet's.", "");
  L.push("WHAT THIS PACKET IS NOT", "");
  L.push("This is a prepared set of official Oregon forms. It is not legal advice, it is not filed for you, and it does not decide whether the court will set aside your record. The instruction pages say the same thing in the court's own words: court staff are not allowed to give legal advice.", "");
  return L.join("\n");
}

const sanitize = (t) => t.replaceAll(" ", " ").replaceAll("‑", "-").replaceAll("–", "-")
  .replaceAll("—", "-").replaceAll("−", "-").replaceAll("’", "'").replaceAll("‘", "'")
  .replaceAll("“", '"').replaceAll("”", '"').replaceAll("§", "Sec. ").replaceAll("…", "...");

async function renderComposedPdf(fullText, title) {
  const pdf = await PDFDocument.create();
  pdf.setTitle(title); pdf.setProducer("RCAP census-v1 artifact-only renderer"); pdf.setCreator("RCAP evidence build");
  const fixed = new Date(FIXED_DATE); pdf.setCreationDate(fixed); pdf.setModificationDate(fixed);
  const font = await pdf.embedFont(StandardFonts.TimesRoman);
  const size = 11, lh = 14.5, W = 612, H = 792, margin = 72, maxW = W - 2 * margin;
  let page = pdf.addPage([W, H]); let y = H - margin;
  const draw = (line) => { if (y < margin) { page = pdf.addPage([W, H]); y = H - margin; } if (line) page.drawText(line, { x: margin, y, size, font, color: rgb(0, 0, 0) }); y -= lh; };
  const splitToken = (tok) => { const out = []; let c = ""; for (const ch of tok) { if (c && font.widthOfTextAtSize(`${c}${ch}`, size) > maxW) { out.push(c); c = ch; } else c += ch; } if (c) out.push(c); return out; };
  const wrap = (line) => {
    if (!line) return [""];
    const words = line.split(/\s+/).flatMap((w) => font.widthOfTextAtSize(w, size) > maxW ? splitToken(w) : [w]);
    const out = []; let c = "";
    for (const w of words) { const cand = c ? `${c} ${w}` : w; if (font.widthOfTextAtSize(cand, size) <= maxW) c = cand; else { if (c) out.push(c); c = w; } }
    if (c) out.push(c); return out;
  };
  for (const raw of sanitize(fullText).split("\n")) for (const row of wrap(raw)) draw(row);
  return Buffer.from(await pdf.save({ useObjectStreams: false, updateMetadata: false }));
}

/* ---- field maps ---------------------------------------------------------- */
const NOT_A_FILING_FACT = (what) => `${what}; it is never a filing fact`;

function motionFieldMap(documentId, rows, report, route) {
  const written = new Set((report.written ?? []).map((w) => w.anchor ?? w.label));
  const canonicalWrites = []; const canonicalRefusals = []; const selectionControls = [];
  for (const r of rows) {
    const base = {
      field: r.key, page: r.page, rect: r.rect ?? null, box: r.box ?? null,
      rectBasis: "measured off this exact binary and recorded in the lane-C overlay profile, field census and option geometry",
      printedLabel: r.caption, printedLine: r.caption, regionHeading: r.label,
      sectionHeading: null, effectiveLabel: r.label, document: documentId
    };
    if (r.policy === "write") {
      if (written.has(r.label)) { canonicalWrites.push({ ...base, factId: r.fact, kind: "flat_slot" }); continue; }
      const refusal = (report.refused ?? []).find((x) => (x.anchor ?? x.label) === r.label) ?? null;
      canonicalRefusals.push({ ...base,
        reason: refusal ? `the overlay refused this measured anchor: ${refusal.reason}` : "the overlay did not draw this measured anchor and reported no reason",
        category: null, completenessClass: null, class: null,
        requiredBeforeFiling: false, routeDetermined: false, factId: r.fact, overlayRefusal: refusal,
        why: "a fact the platform holds and the measured anchor could not carry" });
      continue;
    }
    if (r.policy === "select") {
      selectionControls.push({ ...base, selectionId: r.key, kind: "selection_control", type: "checkbox",
        widgets: [{ page: r.page, box: r.box }], disposition: "selected_by_route",
        reason: r.why, routeDetermined: true, requiredBeforeFiling: false, why: r.why });
      continue;
    }
    if (r.isSelectionControl) {
      const offroute = r.policy === "offroute";
      selectionControls.push({ ...base, selectionId: r.key, kind: "selection_control", type: "checkbox",
        widgets: [{ page: r.page, box: r.box }], disposition: "explicit_refusal",
        reason: offroute
          ? `this branch of the form is never populated with participant data on this route: ${r.routeCondition}`
          : "a sworn assertion the route does not determine; only the participant may make it",
        category: offroute ? null : ELECTION_CLASS,
        completenessClass: offroute ? null : ELECTION_CLASS,
        completenessDisposition: offroute ? "NOT_APPLICABLE_ON_THIS_ROUTE" : "PARTICIPANT_ELECTION_GENUINE",
        class: offroute ? null : ELECTION_CLASS,
        routeConditionThatMakesItInapplicable: offroute ? r.routeCondition : null,
        requiredBeforeFiling: false, routeDetermined: false,
        why: offroute ? r.routeCondition : "only the participant may swear to this" });
      continue;
    }
    if (r.policy === "protect") {
      canonicalRefusals.push({ ...base, reason: "signature or date field; never prefilled by this build",
        category: r.refusalClass, completenessClass: r.refusalClass, class: r.refusalClass,
        requiredBeforeFiling: false,
        why: "a signature, a signature date, or a certificate of mailing that has not happened yet" });
      continue;
    }
    if (r.policy === "not_a_blank") {
      canonicalRefusals.push({ ...base, reason: NOT_A_FILING_FACT(r.what),
        category: null, completenessClass: null, class: null,
        requiredBeforeFiling: false, routeDetermined: false, why: r.what });
      continue;
    }
    if (r.policy === "optional") {
      canonicalRefusals.push({ ...base,
        reason: "optional participant-authored content; the platform does not invent it",
        category: null, completenessClass: null, class: null,
        completenessDisposition: "OPTIONAL_PARTICIPANT_CONTENT", requiredBeforeFiling: false,
        routeDetermined: false, factId: r.fact ?? null,
        why: r.what, participantMustSupply: r.what });
      continue;
    }
    if (r.policy === "offroute") {
      canonicalRefusals.push({ ...base,
        reason: `this branch of the form is never populated with participant data on this route: ${r.routeCondition}`,
        category: null, completenessClass: null, class: null,
        completenessDisposition: "NOT_APPLICABLE_ON_THIS_ROUTE",
        routeConditionThatMakesItInapplicable: r.routeCondition,
        requiredBeforeFiling: false, routeDetermined: false, factId: null, why: r.routeCondition });
      continue;
    }
    canonicalRefusals.push({ ...base,
      reason: `the participant supplies this before filing: ${r.what}`,
      category: null, completenessClass: null, class: null,
      completenessDisposition: "REQUIRED_BEFORE_FILING", requiredBeforeFiling: true, routeDetermined: false,
      identity: `${documentId} slot ${r.key}`, factId: r.fact ?? null,
      why: `the platform holds no value for this and the participant supplies it before filing: ${r.what}`,
      participantMustSupply: r.what });
  }
  return {
    formNumber: documentId,
    documentPolicy: { mode: "participant", captionOnly: false, documentAcceptsFill: true, routeKey: route.routeKey, structural: "flat_overlay" },
    structuralClass: "flat_overlay",
    officialFormId: MOTION,
    explicitMappings: Object.fromEntries(rows.filter((r) => r.policy === "write").map((r) => [r.label, r.fact])),
    roleRefusals: [], selectionControls, canonicalWrites, canonicalRefusals,
    boundaryWrites: canonicalWrites, boundaryRefusals: canonicalRefusals
  };
}

function ospFieldMap(census, report, route, ospFacts) {
  const byName = new Map((census.fields ?? []).map((f) => [f.name, f]));
  const written = new Map((report.written ?? []).map((w) => [w.field, w]));
  const base = (field, label) => ({
    field: field.name, page: field.page ?? field.widgets?.[0]?.page ?? null, rect: field.widgets?.[0]?.rect ?? null, box: null,
    rectBasis: "the current OSP field census measured against the exact held source binary",
    printedLabel: field.effectiveLabel ?? label, printedLine: field.effectiveLabel ?? label,
    regionHeading: label, sectionHeading: null, effectiveLabel: label, document: OSP
  });
  const writeDefs = [
    ["NAME", "participant.full_legal_name", "OSP request name"],
    ["DATE OF BIRTH", "participant.date_of_birth", "OSP request date of birth"],
    ["Street, City, State, Zip code", "participant.city_state_zip", "OSP mailing address"],
    ["1", "matter.court", "Circuit or municipal court in which you are seeking a set aside (court 1)"],
  ];
  const canonicalWrites = [];
  for (const [fieldName, factId, label] of writeDefs) {
    const field = byName.get(fieldName);
    assert.ok(field, `OSP census is missing writable field ${fieldName}`);
    const proof = written.get(fieldName);
    assert.ok(proof, `OSP finalizer did not report writable field ${fieldName}`);
    canonicalWrites.push({ ...base(field, label), factId, kind: "acroform_text", derivedFromFacts: fieldName === "1"
      ? ["matter.county"]
      : fieldName === "Street, City, State, Zip code"
        ? ["participant.street_address", "participant.city_state_zip"]
        : [factId], printedValue: proof.printedValue ?? String(ospFacts[factId]) });
  }
  const canonicalRefusals = [];
  const required = [
    ["AREA CODE", "Area code for the Oregon State Police request", "the area code for the phone number you will use on the OSP request"],
    ["PHONE NUMBER", "Phone number for the Oregon State Police request", "the phone number OSP can use to reach you about this request"]
  ];
  for (const [fieldName, label, what] of required) {
    const field = byName.get(fieldName);
    canonicalRefusals.push({ ...base(field, label), reason: `the participant supplies this before filing: ${what}`,
      category: null, completenessClass: null, class: null,
      completenessDisposition: "REQUIRED_BEFORE_FILING", requiredBeforeFiling: true, routeDetermined: false,
      identity: `${OSP} field ${fieldName}`, factId: null, why: what, participantMustSupply: what });
  }
  const optionalFields = [
    ["ALIAS NAME1", "Other name used at the time of arrest (first alias line)", "an alias or other name only if it applies to you; leave it blank when none applies"],
    ["ALIAS NAME2", "Other name used at the time of arrest (second alias line)", "an additional alias only if it applies to you"],
    ["ALIAS NAME3", "Other name used at the time of arrest (third alias line)", "an additional alias only if it applies to you"],
    ["6", "Additional circuit or municipal court (court 6)", "another Oregon circuit or municipal court only if the motion covers it"],
    ["2", "Additional circuit or municipal court (court 2)", "another Oregon circuit or municipal court only if the motion covers it"],
    ["7", "Additional circuit or municipal court (court 7)", "another Oregon circuit or municipal court only if the motion covers it"],
    ["3", "Additional circuit or municipal court (court 3)", "another Oregon circuit or municipal court only if the motion covers it"],
    ["8", "Additional circuit or municipal court (court 8)", "another Oregon circuit or municipal court only if the motion covers it"],
    ["4", "Additional circuit or municipal court (court 4)", "another Oregon circuit or municipal court only if the motion covers it"],
    ["9", "Additional circuit or municipal court (court 9)", "another Oregon circuit or municipal court only if the motion covers it"],
    ["5", "Additional circuit or municipal court (court 5)", "another Oregon circuit or municipal court only if the motion covers it"],
    ["10", "Additional circuit or municipal court (court 10)", "another Oregon circuit or municipal court only if the motion covers it"]
  ];
  for (const [fieldName, label, what] of optionalFields) {
    const field = byName.get(fieldName);
    canonicalRefusals.push({ ...base(field, label), reason: "optional participant-authored content; the platform does not invent it",
      category: null, completenessClass: null, class: null,
      completenessDisposition: "OPTIONAL_PARTICIPANT_CONTENT", requiredBeforeFiling: false, routeDetermined: false,
      identity: `${OSP} field ${fieldName}`, factId: null, why: what, participantMustSupply: what });
  }
  const selectionControls = [];
  const selectionBase = (fieldName, label) => base(byName.get(fieldName), label);
  const no = selectionBase("NO", "Does the motion to set aside include a conviction? NO");
  const noProof = (report.selectionsMarked ?? []).find((s) => s.field === "NO");
  assert.ok(noProof, "OSP NO selection must be reported");
  selectionControls.push({ ...no, selectionId: "NO", kind: "selection_control", type: "checkbox",
    widgets: [{ page: no.page, box: no.rect }], disposition: "selected_by_route", reason: OSP_NO_BASIS,
    routeDetermined: true, requiredBeforeFiling: false, why: OSP_NO_BASIS, selectedBasis: noProof.basis });
  const yes = selectionBase("YES", "Does the motion to set aside include a conviction? YES");
  selectionControls.push({ ...yes, selectionId: "YES", kind: "selection_control", type: "checkbox",
    widgets: [{ page: yes.page, box: yes.rect }], disposition: "explicit_refusal",
    reason: "this route is a nonconviction route and the OSP NO control is marked",
    completenessClass: null,
    completenessDisposition: "NOT_APPLICABLE_ON_THIS_ROUTE", routeConditionThatMakesItInapplicable: OSP_NO_BASIS,
    requiredBeforeFiling: false, routeDetermined: false, why: OSP_NO_BASIS });
  const fingerprint = selectionBase("Fingerprint Card Form", "Fingerprint Card Form");
  selectionControls.push({ ...fingerprint, selectionId: "Fingerprint Card Form", kind: "selection_control", type: "checkbox",
    widgets: [{ page: fingerprint.page, box: fingerprint.rect }], disposition: "explicit_refusal",
    reason: "only the participant can confirm that a fingerprint card is actually enclosed and complete",
    category: ELECTION_CLASS, completenessClass: ELECTION_CLASS, class: ELECTION_CLASS,
    completenessDisposition: "PARTICIPANT_ELECTION_GENUINE", requiredBeforeFiling: false, routeDetermined: false,
    why: "only the participant can confirm that a fingerprint card is actually enclosed and complete" });
  const fee = selectionBase("Fee for set aside of CONVICTION Include check or money order in the amount of 3300 payable",
    "Fee for set aside of a CONVICTION");
  selectionControls.push({ ...fee, selectionId: fee.field, kind: "selection_control", type: "checkbox",
    widgets: [{ page: fee.page, box: fee.rect }], disposition: "explicit_refusal",
    reason: "this fee checkbox applies to an OSP request for a conviction, while both included routes concern no conviction",
    completenessClass: null,
    completenessDisposition: "NOT_APPLICABLE_ON_THIS_ROUTE",
    routeConditionThatMakesItInapplicable: "the OSP source labels this fee for set aside of CONVICTION, and this packet marks NO for conviction on the nonconviction route",
    requiredBeforeFiling: false, routeDetermined: false,
    why: "the OSP source labels this fee for set aside of CONVICTION, and this packet marks NO for conviction on the nonconviction route" });
  return {
    formNumber: OSP,
    officialFormId: OSP,
    documentPolicy: { mode: "participant", captionOnly: false, documentAcceptsFill: true, routeKey: route.routeKey,
      sequence: "separate agency handoff; follow the current county or jurisdiction instructions" },
    structuralClass: "supporting_process_document", documentRole: "SEPARATE_AGENCY_HANDOFF",
    explicitMappings: Object.fromEntries(writeDefs.map(([name, fact]) => [name, fact])), roleRefusals: [], selectionControls,
    canonicalWrites, canonicalRefusals, boundaryWrites: canonicalWrites, boundaryRefusals: canonicalRefusals
  };
}

function manualIntakeMap(routeId, route) {
  const handoff = ROUTE_HANDOFFS[routeId];
  // These handback rows are printed in the route's filing-instructions
  // component. Keep their map identity on that rendered component so the
  // completeness reader can verify the required handoff is actually delivered.
  const document = `filing_instructions:${route.documentSuffix}`;
  const canonicalRefusals = handoff.manualFacts.map((item) => ({
    field: item.field, page: null, rect: null, box: null,
    rectBasis: "participant handoff item; no official PDF coordinate is authored",
    printedLabel: item.label, printedLine: item.label, effectiveLabel: item.label,
    regionHeading: `Before filing for ${route.legalName}`, sectionHeading: null, document,
    reason: `the participant supplies this before filing: ${item.what}`,
    category: null, completenessClass: null, class: null,
    completenessDisposition: "REQUIRED_BEFORE_FILING", requiredBeforeFiling: true,
    routeDetermined: false, identity: `${document} ${item.field}`, factId: null,
    why: item.what, participantMustSupply: item.what
  }));
  return {
    formNumber: document,
    documentPolicy: { mode: "participant", captionOnly: false, documentAcceptsFill: false, routeKey: route.routeKey },
    structuralClass: "manual_intake", documentRole: "PARTICIPANT_HANDOFF",
    explicitMappings: {}, roleRefusals: [], selectionControls: [],
    canonicalWrites: [], canonicalRefusals, boundaryWrites: [], boundaryRefusals: canonicalRefusals
  };
}

function flatActualWrites(report, anchorsList, facts) {
  const anchors = new Map((anchorsList ?? []).map((a) => [a.label, a]));
  const writes = (report.written ?? []).map((w) => {
    const anchor = anchors.get(w.anchor ?? w.label);
    const expected = w.factId ? facts[w.factId] : null;
    return {
      component: "motion_and_declaration", field: w.anchor ?? w.label ?? null,
      anchor: w.anchor ?? w.label ?? null, factId: w.factId ?? anchor?.factId ?? null,
      page: anchor?.page ?? null, rect: anchor?.writeBox ?? null,
      drawnText: expected == null ? null : String(expected), expected: expected == null ? null : String(expected),
      // The builder does not reopen the saved PDF.  The separate saved-byte
      // preflight owns visibility/glyph measurements for the published file.
      visibleInArtifactBytes: null, everyWidgetVisibleInArtifactBytes: null,
      visibilityMeasurement: "deferred_to_saved_byte_preflight"
    };
  });
  for (const s of report.selections ?? []) writes.push({
    component: "motion_and_declaration", field: s.control ?? null, anchor: null,
    factId: null, page: s.page ?? null, rect: s.box ?? null,
    drawnText: "route selection marked", expected: "route selection marked",
    // The builder does not reopen the saved PDF.  The separate saved-byte
    // preflight owns visibility/glyph measurements for the published file.
    visibleInArtifactBytes: null, everyWidgetVisibleInArtifactBytes: null,
    visibilityMeasurement: "deferred_to_saved_byte_preflight"
  });
  return writes;
}

function ospActualWrites(report, census, facts) {
  const fields = new Map((census.fields ?? []).map((f) => [f.name, f]));
  const writes = (report.written ?? []).map((w) => {
    const field = fields.get(w.field);
    const raw = w.printedValue ?? (w.factId ? facts[w.factId] : null)
      ?? (w.kind === "selection_settled_from_held_facts" ? "selection marked" : null);
    return {
      component: "criminal_history_request", field: w.field ?? null, anchor: w.field ?? null,
      factId: w.factId ?? null, page: field?.page ?? field?.widgets?.[0]?.page ?? null, rect: field?.widgets?.[0]?.rect ?? null,
      drawnText: raw == null ? null : String(raw), expected: raw == null ? null : String(raw),
      // The builder does not reopen the saved PDF.  The separate saved-byte
      // preflight owns visibility/glyph measurements for the published file.
      visibleInArtifactBytes: null, everyWidgetVisibleInArtifactBytes: null,
      visibilityMeasurement: "deferred_to_saved_byte_preflight"
    };
  });
  for (const s of report.selectionsMarked ?? []) {
    const field = fields.get(s.field);
    writes.push({
      component: "criminal_history_request", field: s.field, anchor: s.field, factId: null,
      page: field?.page ?? field?.widgets?.[0]?.page ?? null, rect: field?.widgets?.[0]?.rect ?? null,
      drawnText: "selection marked", expected: "selection marked",
      selectionBasis: s.basis,
      visibleInArtifactBytes: null, everyWidgetVisibleInArtifactBytes: null,
      visibilityMeasurement: "deferred_to_saved_byte_preflight"
    });
  }
  return writes;
}

function composedMap(route, documentId) {
  const base = (fid, label) => ({
    field: `${documentId}.${fid}`, page: 1, printedLabel: label, printedLine: label,
    effectiveLabel: label, regionHeading: label, sectionHeading: null, document: documentId,
    rectBasis: "composed_document_authored_by_this_build"
  });
  const writes = [
    { ...base("movant_name", "Movant named on this page"), factId: "participant.full_legal_name", kind: "composed_text" },
    { ...base("county", "County printed on this page"), factId: "matter.county", kind: "composed_text" },
    { ...base("route", "Route and statute printed on this page"), factId: null, kind: "composed_text" }
  ];
  if (route.writesCaseNumber) writes.push({ ...base("case_number", "Case No. printed on this page"), factId: "matter.case_number", kind: "composed_text" });
  return {
    formNumber: documentId,
    documentPolicy: { mode: "participant", captionOnly: false, documentAcceptsFill: true, routeKey: route.routeKey },
    structuralClass: "composed_document",
    explicitMappings: {}, roleRefusals: [], selectionControls: [],
    canonicalWrites: writes, canonicalRefusals: [], boundaryWrites: writes, boundaryRefusals: []
  };
}

/* ---- the builder's own counters (not a verdict) --------------------------- */
function builderCounters(maps, artifacts, instructions) {
  const counters = Object.fromEntries(PASS_COUNTERS.map((c) => [c, 0]));
  const findings = [];
  const note = (counter, detail) => { counters[counter] += 1; findings.push({ counter, ...detail }); };
  const writes = []; const blanks = [];
  for (const m of maps) {
    const id = m.formNumber;
    for (const w of m.canonicalWrites ?? []) writes.push({ ...w, document: id, name: w.field, label: w.effectiveLabel ?? w.field, isSelectionControl: false });
    for (const r of m.canonicalRefusals ?? []) blanks.push({ ...r, document: id, name: r.field, label: r.effectiveLabel ?? r.field, refusalClass: r.completenessClass ?? null, isSelectionControl: false });
    for (const c of m.selectionControls ?? []) {
      if (String(c.disposition ?? "").toLowerCase().startsWith("select")) writes.push({ ...c, document: id, name: c.selectionId, label: c.effectiveLabel ?? c.field, isSelectionControl: false });
      else blanks.push({ ...c, document: id, name: c.selectionId, label: `${c.effectiveLabel ?? c.field} (selection)`, refusalClass: c.category ?? null, isSelectionControl: true });
    }
  }
  const norm = (x) => String(x ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const availableFacts = new Set(writes.map((w) => w.factId).filter(Boolean));
  const writtenInDocument = new Map();
  for (const w of writes) {
    const doc = String(w.document ?? "");
    if (!writtenInDocument.has(doc)) writtenInDocument.set(doc, new Set());
    for (const key of [norm(w.label), norm(w.name)]) if (key.length >= 4) writtenInDocument.get(doc).add(key);
  }
  for (const w of writes) if (classifyField(w.label, false).requirement === "PROTECTED") note("protectedWrites", { field: w.field, label: w.label });
  const ledger = [];
  for (const blank of blanks) {
    const here = writtenInDocument.get(String(blank.document ?? "")) ?? new Set();
    const declared = {
      sourcePresentation: null,
      disposition: blank.completenessDisposition ?? null,
      ...(Object.hasOwn(blank, "requiredBeforeFiling") ? { requiredBeforeFiling: blank.requiredBeforeFiling === true } : {}),
      routeDetermined: blank.routeDetermined === true,
      factAvailable: (blank.factId ? availableFacts.has(String(blank.factId)) : false) || here.has(norm(blank.label)) || here.has(norm(blank.name)),
      routeConditionThatMakesItInapplicable: blank.routeConditionThatMakesItInapplicable ?? null,
      determinedByTheCaseNotTheRoute: false, whyTheRouteCannotDetermineIt: null,
      factId: blank.factId ?? null, identity: blank.identity ?? blank.field
    };
    const verdict = classifyBlank(blank, blank.reason, blank.refusalClass ?? null, declared);
    ledger.push({ ...blank, ...verdict });
    if (BLANK_DISPOSITIONS[verdict.disposition].allowed) continue;
    if (verdict.disposition === "KNOWN_FACT_NOT_WRITTEN") note("knownRequiredFieldsMissing", { field: blank.field, label: blank.label, basis: verdict.basis });
    else if (verdict.disposition === "ROUTE_OPTION_NOT_SELECTED") note("requiredOptionsMissing", { field: blank.field, label: blank.label, basis: verdict.basis });
    else note("unclassifiedBlanks", { field: blank.field, label: blank.label, basis: verdict.basis });
  }
  for (const b of ledger.filter((x) => x.disposition === "REQUIRED_BEFORE_FILING")) {
    const needles = [b.label, b.field, b.identity].map((x) => String(x ?? "").trim()).filter((x) => x.length >= 3);
    if (needles.some((n) => instructions.toLowerCase().includes(n.toLowerCase().slice(0, 60)))) continue;
    note("requiredFactsNotCollected", { field: b.field, label: b.label });
  }
  const rowsByKey = new Map();
  for (const f of [...writes.map((w) => ({ ...w, written: true })), ...blanks.map((b) => ({ ...b, written: false }))]) {
    const key = rowKeyOf(f);
    if (!key) continue;
    if (!rowsByKey.has(key)) rowsByKey.set(key, []);
    rowsByKey.get(key).push(f);
  }
  for (const [key, cells] of rowsByKey) {
    if (!cells.some((c) => c.written)) continue;
    const missing = cells.filter((c) => !c.written && classifyField(c.label, c.isSelectionControl === true).requirement === "REQUIRED_KNOWN");
    if (missing.length > 0) note("incompleteRows", { row: key, missingCells: missing.map((m) => m.label) });
  }
  for (const a of artifacts) {
    const hasVisibilityRead = Number.isFinite(a.addedGlyphsReadFromOutputBytes)
      || Number.isFinite(a.flattenedWidgetAppearancesReadFromOutputBytes);
    if (hasVisibilityRead) {
      const visible = (a.addedGlyphsReadFromOutputBytes ?? 0) + (a.flattenedWidgetAppearancesReadFromOutputBytes ?? 0);
      if ((a.valuesReportedByFinalizer ?? 0) > 0 && visible === 0) note("invisibleWrites", { fixture: a.fixture });
    }
    if (Number.isFinite(a.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes)
      && a.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes > 0) note("visualDefects", { fixture: a.fixture });
  }
  return { counters, findings, ledger, terminalFields: writes.length + blanks.length, written: writes.length, blank: blanks.length };
}

function instructionsMarkdown(routes, resolved, ledgers) {
  const L = [];
  L.push("# Before you sign or file this packet", "");
  L.push("This packet is built on the Oregon Judicial Department's own adult set-aside");
  L.push("motion and declaration, and on the Oregon State Police criminal history request");
  L.push("that goes with it. It is a prepared draft. It is not legal advice, it is not");
  L.push("signed, and it has not been filed.", "");
  L.push("## The two routes in this family", "");
  for (const r of Object.values(routes)) {
    L.push(`- **${r.legalName}** - this packet marks ${r.option} on page 4 of the motion, because ${r.whyThisOption}.`);
  }
  L.push("");
  L.push("Read the marked option against your own record before you file. Page 4 says to");
  L.push("check one option only, and a packet built on the wrong option is the wrong packet.", "");
  L.push("## Oregon State Police request: a separate agency handoff", "");
  L.push("The Oregon State Police request is included as a separate agency handoff. The current county or jurisdiction instructions control when you send it; enclosing it in this packet is not proof that fingerprints have been filed or that the agency has completed its check.");
  L.push("The packet prefilled the OSP request's NAME, DATE OF BIRTH in MM/DD/YYYY order, mailing address, and first circuit-or-municipal-court line from held participant and matter facts. Supply the AREA CODE and PHONE NUMBER before sending the request.");
  L.push("Add an alias only when it applies to you. Add another circuit or municipal court only when the motion covers another court or county. Leave those unused lines blank when they do not apply.");
  L.push("The OSP request's NO answer to whether the motion includes a conviction is marked for these nonconviction routes. The YES box is left unmarked. The Fingerprint Card Form box remains yours to mark only when the card is actually enclosed and complete.");
  L.push("The OSP fee checkbox is for a set aside of a CONVICTION. These routes concern no conviction, so the checkbox is left unmarked. Any separate fingerprint-provider charge is a participant and provider matter; this packet does not invent an amount.", "");
  L.push("## Motion and certificate", "");
  L.push("The packet fills held identity, county, case number where this route has a court case, contact, and certificate-of-mailing printed-name facts. It leaves your declaration and mailing dates, signatures, prosecutor address, and other participant-supplied filing facts for you.");
  L.push("The court prints five physical citation or arrest offense rows on the Option 3 branch: three on page 4 and two on page 5. Supply the actual offenses from your record. If five rows are not enough, attach a continuation page and tick the printed additional-offenses box by hand; the packet does not invent extra offenses.", "");
  for (const [routeId, ledger] of Object.entries(ledgers)) {
    const route = routes[routeId];
    L.push(`## ${route.legalName}`, "");
    const rbf = ledger.filter((x) => x.disposition === "REQUIRED_BEFORE_FILING");
    L.push("### What you must supply before filing", "");
    for (const r of rbf) L.push(`- **${r.label}** - ${r.participantMustSupply}.`);
    L.push("");
    const handoff = ROUTE_HANDOFFS[routeId];
    L.push("### Route preflight", "");
    for (const item of handoff.preflight) L.push(`- ${item}`);
    L.push("");
    L.push("### Stop and ask for help", "");
    L.push("Stop before filing if any of these conditions applies:");
    for (const item of handoff.stops) L.push(`- ${item}`);
    L.push("");
    const elections = ledger.filter((x) => x.disposition === "PARTICIPANT_ELECTION_GENUINE");
    L.push("### What only you can answer", "");
    L.push("These are your sworn statements about your own case. Nothing here marks them.");
    L.push("Read each one and tick the ones that are true of you:", "");
    for (const e of elections) L.push(`- ${e.printedLabel ?? e.label}`);
    L.push("");
    const offroute = ledger.filter((x) => x.disposition === "NOT_APPLICABLE_ON_THIS_ROUTE" && x.isSelectionControl);
    if (offroute.length) {
      L.push("### What is left unmarked because this route does not use it", "");
      for (const o of offroute) L.push(`- ${o.printedLabel ?? o.label}`);
      L.push("");
    }
  }
  L.push("## What is deliberately left blank on every fixture", "");
  L.push("Your signature and the date beside it are blank on the declaration and on the");
  L.push("certificate of mailing, and so is your printed name on the certificate. A");
  L.push("certificate saying a copy was mailed on a date when it had not been mailed would");
  L.push("be false. Complete the certificate at the time you actually mail the copy.", "");
  L.push("The Phone column at the right of the address line is left to your pen. The");
  L.push("court's printed column is 34 points wide and no phone number fits it at the");
  L.push("smallest readable machine font, so this packet does not try.", "");
  L.push("## There is no proposed order in this packet", "");
  L.push("The court filing packet contains the Motion, the Declaration of Eligibility and");
  L.push("the Certificate of Mailing. The Oregon State Police criminal history request is a");
  L.push("separate agency handoff file, governed by the current county or jurisdiction");
  L.push("instructions. Neither file contains a proposed order. The court's own packet does");
  L.push("not include one, the Oregon corpus holds none, and nothing here drafts an order");
  L.push("for a judge to sign.", "");
  return L.join("\n");
}

/* ---- build --------------------------------------------------------------- */
export async function run(argv = process.argv.slice(2)) {
  const checkOnly = argv.includes("--check");
  const skipRaster = argv.includes("--no-raster");
  const { resolved, failures } = resolveSources();
  if (failures.length > 0) {
    return { familyId: FAMILY_ID, status: "STOPPED", stopClass: "BLOCKED_SOURCE",
      failedSourceIdentities: failures, overlayDirectoryTouched: false };
  }
  const motion = resolved.find((r) => r.formNumber === MOTION);
  const osp = resolved.find((r) => r.formNumber === OSP);
  assert.ok(motion && osp, "both Oregon sources must resolve before anything is rendered");

  const { profile, census, geometry, ospCensus, ospMap, mismatched } = loadMeasurements(motion.sha256, osp.sha256);
  if (mismatched.length > 0) {
    return { familyId: FAMILY_ID, status: "STOPPED", stopClass: "BLOCKED_SOURCE",
      failedSourceIdentities: mismatched.map(([file, sha]) => ({ sourceIdentity: `measurement:${file}`,
        why: `measured against ${sha}, and the binary this build would draw on hashes ${motion.sha256}` })),
      overlayDirectoryTouched: false };
  }

  const rowsByRoute = {}; const unmappedAll = [];
  for (const [routeId, route] of Object.entries(ROUTES)) {
    const documentId = `${MOTION}:${route.documentSuffix}`;
    const { rows, unmapped } = motionRows(census, geometry, route, documentId);
    rowsByRoute[routeId] = { rows, documentId, route };
    unmappedAll.push(...unmapped.map((u) => ({ ...u, routeId })));
  }
  assert.equal(unmappedAll.length, 0, `${unmappedAll.length} measured slot(s) carry no policy: ${JSON.stringify(unmappedAll.slice(0, 6), null, 2)}`);

  if (checkOnly) {
    return { familyId: FAMILY_ID, status: "CHECK_ONLY",
      sources: resolved.map((r) => ({ formNumber: r.formNumber, sha256: r.sha256 })),
      routes: Object.fromEntries(Object.entries(rowsByRoute).map(([k, v]) => [k, {
        slots: v.rows.length,
        by: v.rows.reduce((a, r) => { a[r.policy] = (a[r.policy] ?? 0) + 1; return a; }, {})
      }])) };
  }

  const maps = []; const artifacts = []; const writeProofs = [];
  const ledgersByRoute = {};
  for (const [routeId, { rows, documentId, route }] of Object.entries(rowsByRoute)) {
    for (const fixtureName of ["canonical", "boundary"]) {
      const facts = FIXTURES[routeId][fixtureName];
      const { bytes: motionBytes, report, selections, anchors: motionAnchors } = await renderMotion(motion, profile, census, geometry, route, facts);
      assert.equal((report.selectionsRefused ?? []).length, 0, `a route selection was refused: ${JSON.stringify(report.selectionsRefused)}`);
      assert.equal((report.selections ?? []).length, selections.length, "every route selection this packet claims must have been marked on the paper");
      assert.equal((report.refused ?? []).length, 0, `an anchor this route writes was refused: ${JSON.stringify(report.refused)}`);
      const { bytes: ospBytes, report: ospReport, facts: ospFacts } = await renderOsp(osp, ospCensus, route, facts);
      assert.deepEqual((ospReport.refused ?? []).filter((r) => !OSP_UNWRITABLE_FIELDS.includes(r.field)), [],
        `an OSP field this packet writes was refused: ${JSON.stringify(ospReport.refused)}`);

      const packet = stampDeterministic(await PDFDocument.create());
      const agencyPacket = stampDeterministic(await PDFDocument.create());
      const pageManifest = []; const agencyPageManifest = []; const documents = [];
      const m = await PDFDocument.load(motionBytes, { ignoreEncryption: true });
      for (const [i, p] of (await packet.copyPages(m, m.getPageIndices())).entries()) {
        packet.addPage(p);
        pageManifest.push({ packetPage: packet.getPageCount(), component: "motion_and_declaration", documentId, sourcePage: i + 1, sourceSha256: motion.sha256 });
      }
      documents.push("motion_and_declaration", documentId, MOTION);
      const o = await PDFDocument.load(ospBytes, { ignoreEncryption: true });
      for (const [i, p] of (await agencyPacket.copyPages(o, o.getPageIndices())).entries()) {
        // The OSP request is preserved byte-for-byte as a separate agency
        // handoff. It is not part of the court filing packet.
        agencyPacket.addPage(p);
        agencyPageManifest.push({ packetPage: agencyPacket.getPageCount(), component: AGENCY_COMPONENT, documentId: OSP,
          deliveryRole: "separate_agency_handoff", sequencePolicy: "current county or jurisdiction instructions",
          sourcePage: i + 1, sourceSha256: osp.sha256 });
      }
      const instructionsDocId = `filing_instructions:${route.documentSuffix}`;
      const instrBytes = await renderComposedPdf(composedBody(route, facts), "Filing Instructions");
      const ins = await PDFDocument.load(instrBytes, { ignoreEncryption: true });
      for (const [i, p] of (await packet.copyPages(ins, ins.getPageIndices())).entries()) {
        packet.addPage(p);
        pageManifest.push({ packetPage: packet.getPageCount(), component: "filing_instructions", documentId: instructionsDocId, sourcePage: i + 1, sourceSha256: null });
      }
      documents.push("filing_instructions", instructionsDocId);

      if (fixtureName === "canonical") {
        maps.push(motionFieldMap(documentId, rows, report, route));
        // The same separate-agency source is carried by both routes. Its
        // source-field obligations are identical because both routes mark OSP
        // conviction = NO, so one canonical map is shared by both route ledgers.
        if (routeId === Object.keys(ROUTES)[0]) maps.push(ospFieldMap(ospCensus, ospReport, route, ospFacts));
        maps.push(composedMap(route, instructionsDocId));
        maps.push(manualIntakeMap(routeId, route));
      }

      const packetBytes = Buffer.from(await packet.save({ useObjectStreams: false, updateMetadata: false }));
      const agencyBytes = Buffer.from(await agencyPacket.save({ useObjectStreams: false, updateMetadata: false }));
      const fixtureId = `${fixtureName}--${route.slug}`;
      const file = `${OUT_REL}/fixtures/${fixtureId}.pdf`;
      const agencyFile = `${OUT_REL}/fixtures/${fixtureId}--criminal-history-request.pdf`;
      const motionFile = `${OUT_REL}/fixtures/${fixtureId}--motion-and-declaration.pdf`;
      fs.mkdirSync(path.join(ROOT, OUT_REL, "fixtures"), { recursive: true });
      fs.writeFileSync(path.join(ROOT, file), packetBytes);
      fs.writeFileSync(path.join(ROOT, agencyFile), agencyBytes);
      fs.writeFileSync(path.join(ROOT, motionFile), motionBytes);

      const actualWrites = [...flatActualWrites(report, motionAnchors, facts), ...ospActualWrites(ospReport, ospCensus, ospFacts)];
      writeProofs.push({
        fixture: fixtureId, routeId, routeKey: route.routeKey, formNumber: documentId,
        sourceSha256: motion.sha256, supportingSourceSha256: osp.sha256,
        agencyFile, agencySha256: sha256(agencyBytes), agencyByteLength: agencyBytes.length, agencyPageCount: agencyPacket.getPageCount(),
        proofMethod: "motion values and route marks are drawn at the measured flat anchors; OSP values and the NO selection are written through the exact source-field census and flattened into the separate agency handoff. The finalizer reports every write, and this build refuses any claimed write or selection that is refused.",
        valuesReportedByFinalizer: actualWrites.length,
        // These are deliberately unmeasured here.  The saved-byte preflight
        // reopens each published court and agency PDF and owns these claims.
        flattenedWidgetAppearancesReadFromOutputBytes: null,
        addedGlyphsReadFromOutputBytes: null,
        nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: null,
        routeSelectionMarks: (report.selections ?? []).map((s) => ({ control: s.control, page: s.page, box: s.box, mark: s.mark, drewANewBox: s.drewANewBox, redrewTheCourtsBox: s.redrewTheCourtsBox })),
        ospSelectionMarks: ospReport.selectionsMarked ?? [],
        anchorsRefused: [...(report.refused ?? []), ...(ospReport.refused ?? [])],
        unfittable: [...(report.unfittable ?? []), ...(ospReport.unfittable ?? [])], actualWrites
      });

      artifacts.push({
        fixture: fixtureId, routeId, routeKey: route.routeKey, option: route.option,
        file, motionFile, sha256: sha256(packetBytes), motionSha256: sha256(motionBytes),
        byteLength: packetBytes.length, pageCount: packet.getPageCount(),
        pageManifest, documents, components: COMPONENTS,
        agencyHandoff: {
          component: AGENCY_COMPONENT, documentId: OSP, deliveryRole: "separate_agency_handoff",
          sequencePolicy: "current county or jurisdiction instructions", file: agencyFile,
          sha256: sha256(agencyBytes), byteLength: agencyBytes.length, pageCount: agencyPacket.getPageCount(),
          pageManifest: agencyPageManifest, documents: [AGENCY_COMPONENT, OSP], components: [AGENCY_COMPONENT]
        }
      });
    }
  }

  const artifactCounters = writeProofs.map((p) => ({
    fixture: p.fixture, valuesReportedByFinalizer: p.valuesReportedByFinalizer,
    addedGlyphsReadFromOutputBytes: p.addedGlyphsReadFromOutputBytes,
    flattenedWidgetAppearancesReadFromOutputBytes: p.flattenedWidgetAppearancesReadFromOutputBytes,
    nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: p.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes,
    refusedFieldsWithInk: null
  }));
  const preliminary = builderCounters(maps, artifactCounters, "");
  for (const [routeId, { documentId }] of Object.entries(rowsByRoute)) {
    ledgersByRoute[routeId] = preliminary.ledger.filter((b) => b.document === documentId
      || b.document === `filing_instructions:${ROUTES[routeId].documentSuffix}`
      || b.document === `manual_intake:${ROUTES[routeId].documentSuffix}`);
  }
  const ospDocuments = new Set([OSP]);
  for (const routeId of Object.keys(ROUTES)) {
    ledgersByRoute[routeId] = [...ledgersByRoute[routeId], ...preliminary.ledger.filter((b) => ospDocuments.has(b.document))];
  }
  const instructions = instructionsMarkdown(ROUTES, resolved, ledgersByRoute);
  const audit = builderCounters(maps, artifactCounters, instructions);
  const allZero = PASS_COUNTERS.every((c) => audit.counters[c] === 0);
  if (!allZero) {
    fs.rmSync(path.join(ROOT, OUT_REL), { recursive: true, force: true });
    return { familyId: FAMILY_ID, status: "STOPPED", stopClass: "COMPLETENESS_COUNTER_NOT_ZERO",
      nonZeroCounters: PASS_COUNTERS.filter((c) => audit.counters[c] > 0),
      counters: audit.counters, findings: audit.findings.slice(0, 12), overlayDirectoryTouched: false };
  }

  const W = (rel, text) => {
    const f = path.join(ROOT, OUT_REL, rel);
    fs.mkdirSync(path.dirname(f), { recursive: true });
    fs.writeFileSync(f, text);
  };
  const J = (rel, value) => W(rel, `${JSON.stringify(value, null, 2)}\n`);
  const measurementProvenance = {
    overlayProfile: { file: `${LANE_C}/overlay-profile.json`, sha256MeasuredAgainst: profile.sha256, anchors: (profile.anchors ?? []).length },
    fieldCensus: { file: `${LANE_C}/field-census.json`, sha256MeasuredAgainst: census.sha256, slots: (census.fields ?? []).length },
    optionGeometry: { file: GEOMETRY, sha256MeasuredAgainst: geometry.source?.sha256 ?? null,
      options: (geometry.options ?? []).filter((o) => o.boxIsMeasured).length, declarationBoxes: (geometry.declarationBoxes ?? []).length },
    binaryDrawnOn: motion.sha256,
    ospFieldCensus: { file: `${OSP_LANE_C}/field-census.json`, sha256MeasuredAgainst: ospCensus.sha256, slots: (ospCensus.fields ?? []).length },
    ospProductionFieldMap: { file: `${OSP_LANE_C}/production-field-map.json`, sha256MeasuredAgainst: ospMap.sha256,
      bindings: (ospMap.bindings ?? []).length, unwritableFields: (ospMap.unwritableFields ?? []).length },
    supportingBinaryDrawnOn: osp.sha256
  };
  const routeSelections = maps.flatMap((m) => (m.selectionControls ?? []).filter((c) => c.disposition === "selected_by_route")
    .map((c) => ({ document: m.formNumber, field: c.field, page: c.page, printedLabel: c.effectiveLabel, why: c.why })));
  const rbf = audit.ledger.filter((b) => b.disposition === "REQUIRED_BEFORE_FILING")
    .map((b) => ({ document: b.document, field: b.field, label: b.label, participantMustSupply: b.participantMustSupply }));

  J("production-field-map.json", {
    schemaVersion: "rcap-production-field-map/v2", familyId: FAMILY_ID, worklistGroupId: FAMILY_ID,
    jurisdiction: "OR", implementationStrategy: "official_pdf_fill",
    routeKeys: Object.values(ROUTES).map((r) => r.routeKey),
    componentSet: COMPONENTS,
    separateAgencyComponents: [{ component: AGENCY_COMPONENT, officialFormId: OSP, deliveryRole: "separate_agency_handoff",
      sequencePolicy: "current county or jurisdiction instructions; no universal pre-filing order is asserted" }],
    deliveryTopology: { courtPacketComponents: COMPONENTS, separateAgencyHandoffComponents: [AGENCY_COMPONENT],
      sequencePolicy: "current county or jurisdiction instructions; no universal pre-filing order is asserted" },
    perRouteDocumentIdentity: "The motion is one binary that both routes draw on, and each route makes a DIFFERENT election on it. The two are carried as separate document identities so a slot this route writes and the other route refuses can never be read as one contradictory row. The OSP request is a separate agency handoff artifact, not a court-filing component.",
    captionBasis: "this document has no AcroForm. Every coordinate in this map -- anchor, option box and declaration box -- was measured against this exact binary and is recorded in the lane-C overlay profile, field census and option geometry named in measurementProvenance. Nothing here is authored, and the build refuses if any of those three was measured against different bytes.",
    measurementProvenance,
    dispositionVocabulary: [SIGNATURE, ELECTION_CLASS],
    routeSelectionsMade: routeSelections,
    requiredBeforeFilingCount: rbf.length, requiredBeforeFiling: rbf,
    maps, generationAllowed: false, runtimeSelectable: false, commercialRoutesOpened: 0
  });
  J("source-receipt.json", {
    schemaVersion: "rcap-family-source-receipt/v1", familyId: FAMILY_ID, worklistGroupId: FAMILY_ID,
    jurisdiction: "OR", implementationStrategy: "official_pdf_fill", custodyClass: "SOURCE_ALREADY_HELD",
    acquisitionCommissioned: false, corpusRootFromEnvironment: "MASTER_LIBRARY_SOURCE_DIR",
    bindingMethod: "committed corpus-index path + index SHA-256 + on-disk SHA-256 + byte length, re-read at build time",
    allSourcesExact: true,
    documents: resolved.map((r) => ({ sourceIds: [r.sourceId], formNumber: r.formNumber, documentId: r.formNumber,
      revision: r.revision, pathInArchive: r.pathInArchive, sha256: r.sha256, byteLength: r.byteLength })),
    measurementProvenance,
    composedComponentsAuthoredByThisBuild: ["filing_instructions"],
    commercialRoutesOpened: 0
  });
  J("reports/rendered-artifacts.json", {
    schemaVersion: "rcap-rendered-artifacts/v1", familyId: FAMILY_ID, renderedFresh: true,
    componentSet: COMPONENTS, separateAgencyComponents: [AGENCY_COMPONENT],
    deliveryTopology: {
      courtPacket: COMPONENTS,
      separateAgencyHandoff: AGENCY_COMPONENT,
      sequencePolicy: "current county or jurisdiction instructions; no universal pre-filing order is asserted"
    }, artifacts,
    packets: artifacts.map((a) => ({ fixture: a.fixture, file: a.file, sha256: a.sha256, byteLength: a.byteLength,
      pageCount: a.pageCount, documents: a.documents, pageManifest: a.pageManifest, agencyHandoff: a.agencyHandoff })),
    rasterEngine: skipRaster ? null : "scripts/raster/pdf-page-raster.mjs (Chromium, calibrated)",
    rasterState: "BUILT_RASTER_PENDING"
  });
  J("reports/actual-writes.json", {
    schemaVersion: "rcap-actual-writes-byte-proof/v1", familyId: FAMILY_ID, derivedFromArtifactBytes: false,
    visibilityMeasurement: "deferred_to_saved_byte_preflight",
    documents: writeProofs, artifacts: artifactCounters
  });
  J("reports/builder-completeness-counters.json", {
    schemaVersion: "rcap-builder-completeness-counters/v1", familyId: FAMILY_ID,
    thisIsNotAVerdict: "A builder verdict is not a verdict. These counters are the builder contract's own obligation, computed with scripts/rcap-packet-completeness/completeness-contract.mjs. An independent verification lane that did not build this packet decides whether it passes.",
    counters: audit.counters, allNineZero: allZero,
    totals: { terminalFields: audit.terminalFields, written: audit.written, blank: audit.blank },
    blanksByDisposition: audit.ledger.reduce((acc, b) => { acc[b.disposition] = (acc[b.disposition] ?? 0) + 1; return acc; }, {}),
    findings: audit.findings
  });
  J("reports/blanks-left-for-the-participant.json", {
    schemaVersion: "rcap-blank-ledger/v1", familyId: FAMILY_ID,
    blanks: audit.ledger.map((b) => ({ document: b.document, field: b.field, page: b.page, label: b.label,
      disposition: b.disposition, basis: b.basis, participantMustSupply: b.participantMustSupply ?? null }))
  });
  W("participant-instructions.md", instructions);
  W("filing-instructions.md", `# Filing instructions\n\nThe filing instructions are composed per route and bound into every packet as its\nlast component, so the copy a participant receives always carries the steps for\nthe route that packet was built on. The text of both is reproduced here.\n\n${Object.values(ROUTES).map((r) => `## ${r.legalName}\n\n\`\`\`\n${composedBody(r, FIXTURES[Object.keys(ROUTES).find((k) => ROUTES[k] === r)].canonical)}\n\`\`\`\n`).join("\n")}`);
  J("build-status.json", {
    schemaVersion: "rcap-family-build-status/v1", familyId: FAMILY_ID,
    buildStatus: "state_built", reviewStatus: "qa_review_pending",
    builtBy: "scripts/build-census-v1-rcap-or-official-pdf-fill.mjs",
    rasterEngine: skipRaster ? null : "chromium_calibrated", popplerUsed: false,
    rasterState: "BUILT_RASTER_PENDING",
    packetsSelfVerified: 0, commercialRoutesOpened: 0, productionTouched: false,
    grantsNothing: "A rendered packet is review evidence. It authorizes no fulfillment and opens no commercial route."
  });
  J("build-findings.json", {
    schemaVersion: "rcap-family-build-findings/v1", familyId: FAMILY_ID,
    findings: [
      { finding: "This family carries two routes on one court form, and each route IS an option the form prints.", consequence: "or_arrest_no_charges marks Option 3 and or_dismissed_charge marks Option 2, both as route determinations. Each route's packet is rendered separately with its own canonical and boundary fixture, and the two motions are carried as separate document identities so one route's write is never read against the other route's refusal." },
      { finding: "The form prints \"(leave blank if no court case)\" beside the Case No. line.", consequence: "On or_arrest_no_charges the case-number slot is refused with that printed instruction as its named route condition, and no case number is carried in that route's fixtures at all. On or_dismissed_charge the case number is written." },
      { finding: "The packet-set manifest assigns a required proposed_order component on BOTH routes to OR-OJD-ADULT-SET-ASIDE-PACKET.", consequence: "The court artifact contains the Motion, Declaration of Eligibility and Certificate of Mailing, and no proposed order; the Oregon corpus holds no Oregon order form at all. The OSP request is delivered as a separate agency handoff artifact under the current county or jurisdiction sequence policy. No order is drafted here -- an order is the court's act -- and the court packet, agency handoff, participant instructions and composed filing instructions all say in terms that the packet contains no proposed order. This is raised as a counsel question rather than filled by this build." },
      { finding: "The option geometry measurement reports 14 checkbox-shaped boxes on the form and records coordinates for 10: three options and seven declaration statements.", consequence: "The four it does not record are Option 1's two sub-elections and the two \"additional page\" boxes. Option 1's sub-elections are off-route on both of this family's routes. The two additional-page boxes are not marked, because no committed measurement gives their coordinates and this build authors no coordinate; the participant instructions tell the reader to tick the additional-page box by hand if they attach one." },
      { finding: "The last three declaration boxes are printed under \"If you selected Option 1 above, all of the following must also be true\".", consequence: "On both of this family's routes they are refused with that printed sentence as the named route condition, rather than being carried as elections the participant is expected to make." },
      { finding: "The Phone column on the page-5 contact line is the court's own 34 points.", consequence: "No phone number fits it at the minimum readable machine font. The phone is carried as a disclosed required-before-filing item the participant writes by hand and the anchor is never offered to the renderer, so it is not attempted and refused on every run." },
      { finding: "Pages 1 to 3 of the binary are the court's printed instruction sheet.", consequence: "Every rule the measurement found on them is a typographic underline in prose and is classified as never a filing fact, rather than being left unclassified or read as a blank." }
    ]
  });
  J("approval-request.json", {
    schemaVersion: "rcap-family-approval-request/v1", familyId: FAMILY_ID,
    requested: "visual review and counsel review", buildStatus: "state_built",
    status: "BUILT_RASTER_PENDING", implementationStrategy: "official_pdf_fill",
    routeKeys: Object.values(ROUTES).map((r) => r.routeKey),
    components: COMPONENTS,
    artifacts: artifacts.map((a) => ({ fixture: a.fixture, routeKey: a.routeKey, option: a.option, file: a.file, sha256: a.sha256, byteLength: a.byteLength, pageCount: a.pageCount,
      agencyHandoff: a.agencyHandoff })),
    counselQuestionsRaised: [
      "The packet-set manifest names a required proposed_order component on both routes and assigns it to the same OJD binary, which contains no order. Confirm whether a proposed order is owed on these two routes and, if so, from what held source, because this build drafts none.",
      "Option 3 is marked for ORS 137.225(1)(c) and Option 2 for ORS 137.225(1)(d). Confirm those pairings, and in particular that a dismissal described in ORS 137.225(1)(c) does not belong on Option 2.",
      "The first four declaration boxes are carried as participant elections on both routes and the last three are refused as Option 1 only. Confirm that declaration box 3, \"I have filed fingerprints with the Oregon State Police\", is genuinely the participant's own assertion rather than something the packet should be marking once the Oregon State Police request is enclosed."
    ],
    independentVerificationStatus: "PENDING",
    approvedForLive: false, live: false,
    packetsSelfVerified: 0, commercialRoutesOpened: 0, productionTouched: false
  });

  return {
    familyId: FAMILY_ID, status: "COMPLETED", directory: OUT_REL, structuralClass: "flat_overlay",
    officialForms: resolved.map((r) => ({ formNumber: r.formNumber, sha256: r.sha256 })),
    components: COMPONENTS, routeKeys: Object.values(ROUTES).map((r) => r.routeKey),
    terminalFields: audit.terminalFields, written: audit.written, blank: audit.blank,
    counters: audit.counters, nineCountersZero: allZero,
    requiredBeforeFiling: rbf.length, routeSelectionsMade: routeSelections.length,
    rasterState: "BUILT_RASTER_PENDING",
    artifactHashes: artifacts.map((a) => ({ fixture: a.fixture, routeKey: a.routeKey, sha256: a.sha256, motionSha256: a.motionSha256, pages: a.pageCount,
      agencyHandoff: { file: a.agencyHandoff.file, sha256: a.agencyHandoff.sha256, pages: a.agencyHandoff.pageCount } })),
    packetsSelfVerified: 0, commercialRoutesOpened: 0, productionTouched: false
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(thisFile)) {
  run().then((r) => console.log(JSON.stringify(r, null, 2))).catch((e) => { console.error(e); process.exit(1); });
}
