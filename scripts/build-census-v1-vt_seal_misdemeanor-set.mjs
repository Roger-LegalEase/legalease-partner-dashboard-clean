#!/usr/bin/env node
/**
 * The Vermont sealing packet family builder.
 *
 * Five census-v1 families -- vt_seal_18_to_21, vt_seal_dui, vt_seal_felony,
 * vt_seal_misdemeanor and vt_seal_pardon -- file the SAME three official
 * Vermont forms and differ only in the statutory route they are filed under.
 * So there is one builder and four sibling entry points that import
 * runFamilyById from it: one shared host, one writer.
 *
 *   node scripts/build-census-v1-vt_seal_misdemeanor-set.mjs [--check]
 *
 * Two things about these forms shaped the implementation.
 *
 * First, the widgets are named "1", "22", "34a". The names carry no meaning at
 * all, and captureWidgetContext returns null for most of them because the
 * blanks are inline in prose rather than beside a label. A caption therefore
 * cannot be inferred from the field name or from a generic label search; it has
 * to be READ OFF THE PAGE at the widget's own coordinates. FORM_FIELDS below
 * records, for every widget, the printed caption that sits at its coordinates
 * and where that caption is on the page, so the mapping can be checked against
 * the form rather than believed.
 *
 * Second, the fee-waiver application is a financial affidavit. The platform
 * holds a participant's identity and contact details and their docket number;
 * it does not hold their rent, their fuel bill or the market value of their
 * car. Those blanks are REQUIRED_BEFORE_FILING and are disclosed to the
 * participant by name -- which is what the completeness contract requires and
 * what the build discipline calls collecting the fact rather than declaring the
 * family blocked. A missing financial figure is not a legal question and this
 * family raises none.
 *
 * Rasterization uses scripts/raster/pdf-page-raster.mjs (Chromium, calibrated),
 * not Poppler: this environment's builders may not shell out to pdftoppm.
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
import { classifyField } from "./rcap-packet-completeness/completeness-contract.mjs";

const thisFile = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(thisFile), "..");
process.chdir(ROOT);
const require = createRequire(import.meta.url);
const { PDFDocument } = require("pdf-lib");

const CORPUS_INDEX = "data/rcap-all50/local-source-corpus-index.json";
const TRACK_REGISTRY = "data/record-clearing/legal-design-track-registry.json";

/*
 * The committed track registry entry for a family that has opted into reading
 * it. Returns null for every family that has not, so no unflagged family's
 * bytes move.
 *
 * FIX04. vt_seal_pardon-set failed COMPONENT_SET, REQUIRED_BEFORE_FILING and
 * SELF_HELP_STOP on one independent read (VF06, FABLE-VA7, base cd48fc14e),
 * and the reader's own finding is that one undelivered component explains all
 * three: the registry's packetSet declares a REQUIRED process_guidance
 * component, role filing_and_expectation_instructions, whose job is to carry
 * the filing expectations, the waiting periods and the stop conditions. Three
 * of four components were delivered and that one was neither delivered nor
 * declared. It is delivered here as participant-instructions.md -- which is
 * what a process_guidance component is -- and the guidance it was supposed to
 * carry is now in it.
 */
function registryTrack(config) {
  if (!config?.registryGuidanceTrackId) return null;
  const registry = JSON.parse(fs.readFileSync(path.join(ROOT, TRACK_REGISTRY), "utf8"));
  const track = (registry.tracks ?? []).find((t) => t.trackId === config.registryGuidanceTrackId);
  assert.ok(track, `${config.registryGuidanceTrackId}: no committed track registry entry`);
  assert.ok((track.selfHelpStopConditions ?? []).length,
    `${config.registryGuidanceTrackId}: the registry holds no self-help stop condition`);
  assert.ok((track.waitingPeriods ?? []).length,
    `${config.registryGuidanceTrackId}: the registry holds no waiting period`);
  assert.ok((track.exclusions ?? []).length,
    `${config.registryGuidanceTrackId}: the registry holds no exclusion`);
  assert.ok((track.packetSet?.components ?? []).length,
    `${config.registryGuidanceTrackId}: the registry declares no packet-set component`);
  return track;
}
const OVERLAY_ROOT = "data/rcap-all50/overlays/census-v1/vt";
const FIXED_DATE = "2026-01-01";

/*
 * Where the Master Library is mounted, as an ABSOLUTE path.
 *
 * MASTER_LIBRARY_SOURCE_DIR is exported absolute by the packet-build preflight,
 * and this used to return it unresolved to callers that then did
 * `path.join(ROOT, root, rel)`. Joining an absolute path onto ROOT produces
 * ROOT + the absolute path, which exists nowhere, so every source "did not bind
 * by exact SHA-256" and the whole family reported BLOCKED_SOURCE with three
 * files that were sitting right there. Resolving here makes both spellings --
 * the absolute export and the relative default -- land on the same directory.
 */
function corpusRoot() {
  const configured = process.env.MASTER_LIBRARY_SOURCE_DIR
    ?? "private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1";
  const resolved = path.resolve(ROOT, configured);
  assert.ok(fs.existsSync(resolved), `the Master Library is not mounted at ${resolved}`);
  return resolved;
}

/* ------------------------------------------------------------------ *
 * The three official forms, and every widget's measured caption.
 *
 * `caption` is the text printed at the widget's own coordinates, read from
 * the form's content stream. `captionAt` records where it was read, so the
 * claim is checkable: run --captions to re-read them from the PDF and the
 * build refuses if any caption is no longer on the page it says it is.
 *
 * `policy` is one of:
 *   write   -- the platform holds this fact and the library binds it
 *   protect -- a signature, a date of signature, or a court/prosecutor field
 *   election-- a genuine participant election on a checkbox
 *   supply  -- the participant must supply it before filing; disclosed by name
 * ------------------------------------------------------------------ */
const SUPPLY = (what) => ({ policy: "supply", what });
const WRITE = (fact) => ({ policy: "write", fact });
const PROTECT = (why) => ({ policy: "protect", refusalClass: why });
const ELECTION = () => ({ policy: "election" });

const SIGNATURE = "signature_or_date_participant_completion";
const COURT_OWNED = "court_prosecutor_clerk_or_agency_owned";

const FORM_FIELDS = {
  "200-00130": {
    title: "Petition to Seal Criminal History",
    pages: 2,
    fields: {
      Unit: { page: 1, caption: "Unit", label: "Unit (Superior Court unit)", captionAt: { page: 1, y: 711 }, ...SUPPLY("the Superior Court unit (county) where the case was decided") },
      "Docket Number": { page: 1, caption: "Unit Case No.", label: "Case No. (docket number)", captionAt: { page: 1, y: 711 }, ...WRITE("matter.case_number") },
      Defendant: { page: 1, caption: "In RE:", label: "In RE: Defendant", captionAt: { page: 1, y: 678 }, ...WRITE("participant.full_legal_name") },
      DOB: { page: 1, caption: "DOB", captionAt: { page: 1, y: 678 }, ...WRITE("participant.date_of_birth") },
      1: { page: 1, caption: "Description of Offense", captionAt: { page: 1, y: 549 }, row: 1, ...SUPPLY("the description of the first offence you are asking the court to seal") },
      2: { page: 1, caption: "Year", captionAt: { page: 1, y: 549 }, row: 1, ...SUPPLY("the year of the first offence") },
      3: { page: 1, caption: "Docket Number (If Any)", captionAt: { page: 1, y: 549 }, row: 1, ...SUPPLY("the docket number of the first offence, if it has one") },
      4: { page: 1, caption: "Description of Offense", captionAt: { page: 1, y: 549 }, row: 2, ...SUPPLY("the description of a second offence from the same incident, if there is one") },
      5: { page: 1, caption: "Year", captionAt: { page: 1, y: 549 }, row: 2, ...SUPPLY("the year of the second offence") },
      6: { page: 1, caption: "Docket Number (If Any)", captionAt: { page: 1, y: 549 }, row: 2, ...SUPPLY("the docket number of the second offence") },
      7: { page: 1, caption: "Description of Offense", captionAt: { page: 1, y: 549 }, row: 3, ...SUPPLY("the description of a third offence from the same incident, if there is one") },
      8: { page: 1, caption: "Year", captionAt: { page: 1, y: 549 }, row: 3, ...SUPPLY("the year of the third offence") },
      9: { page: 1, caption: "Docket Number (If Any)", captionAt: { page: 1, y: 549 }, row: 3, ...SUPPLY("the docket number of the third offence") },
      10: { page: 1, caption: "I was convicted of the offenses.", captionAt: { page: 1, y: 446 }, ...ELECTION() },
      11: { page: 1, caption: "a. Date of conviction:", captionAt: { page: 1, y: 417 }, ...SUPPLY("the date you were convicted, from your docket sheet or judgment order") },
      12: { page: 1, caption: "b. I completed all of the conditions of my probation:", captionAt: { page: 1, y: 402 }, ...ELECTION() },
      13: { page: 1, caption: "Yes – Date of Completion:", captionAt: { page: 1, y: 386 }, ...SUPPLY("the date you completed probation, if you were on probation") },
      14: { page: 1, caption: "No", captionAt: { page: 1, y: 371 }, ...ELECTION() },
      15: { page: 1, caption: "Yes", label: "c. Any restitution ordered by the Court has been paid: Yes", captionAt: { page: 1, y: 341 }, ...ELECTION() },
      16: { page: 1, caption: "No", label: "c. Any restitution ordered by the Court has been paid: No", captionAt: { page: 1, y: 326 }, ...ELECTION() },
      17: { page: 1, caption: "Restitution was not ordered", captionAt: { page: 1, y: 310 }, ...ELECTION() },
      18: { page: 1, caption: "I was not convicted for the offenses listed above.", captionAt: { page: 1, y: 295 }, ...ELECTION() },
      19: { page: 1, caption: "I was cited or arrested, by (name of arresting law enforcement agency or department)", captionAt: { page: 1, y: 250 }, ...ELECTION() },
      "19a": { page: 1, caption: "name of arresting law enforcement agency or department", captionAt: { page: 1, y: 250 }, ...SUPPLY("the name of the law enforcement agency that cited or arrested you, if no charge was filed") },
      20: { page: 1, caption: "A charge was filed, but the Court did not find probable cause.", captionAt: { page: 1, y: 220 }, ...ELECTION() },
      21: { page: 1, caption: "A charge was filed and later dismissed by the Court.", captionAt: { page: 1, y: 204 }, ...ELECTION() },
      22: { page: 1, caption: "Offense Date of Offense Date of Charge Date of Conviction", label: "Offense (new charges since)", captionAt: { page: 1, y: 160 }, row: 4, ...SUPPLY("any new offence since the offence in question 1 — leave blank if there are none") },
      23: { page: 1, caption: "Offense Date of Offense Date of Charge Date of Conviction", label: "Date of Offense (new charges since)", captionAt: { page: 1, y: 160 }, row: 4, ...SUPPLY("the date of that new offence") },
      24: { page: 1, caption: "Offense Date of Offense Date of Charge Date of Conviction", label: "Date of Charge (new charges since)", captionAt: { page: 1, y: 160 }, row: 4, ...SUPPLY("the date that new charge was brought") },
      25: { page: 1, caption: "Offense Date of Offense Date of Charge Date of Conviction", label: "Date of Conviction (new charges since)", captionAt: { page: 1, y: 160 }, row: 4, ...SUPPLY("the date of conviction on that new charge, if there was one") },
      26: { page: 1, caption: "Offense Date of Offense Date of Charge Date of Conviction", label: "Offense (new charges since)", captionAt: { page: 1, y: 160 }, row: 5, ...SUPPLY("a second new offence, if there is one") },
      27: { page: 1, caption: "Offense Date of Offense Date of Charge Date of Conviction", label: "Date of Offense (new charges since)", captionAt: { page: 1, y: 160 }, row: 5, ...SUPPLY("the date of that second new offence") },
      28: { page: 1, caption: "Offense Date of Offense Date of Charge Date of Conviction", label: "Date of Charge (new charges since)", captionAt: { page: 1, y: 160 }, row: 5, ...SUPPLY("the date that second new charge was brought") },
      29: { page: 1, caption: "Offense Date of Offense Date of Charge Date of Conviction", label: "Date of Conviction (new charges since)", captionAt: { page: 1, y: 160 }, row: 5, ...SUPPLY("the date of conviction on that second new charge") },
      30: { page: 1, caption: "Offense Date of Offense Date of Charge Date of Conviction", label: "Offense (new charges since)", captionAt: { page: 1, y: 160 }, row: 6, ...SUPPLY("a third new offence, if there is one") },
      31: { page: 1, caption: "Offense Date of Offense Date of Charge Date of Conviction", label: "Date of Offense (new charges since)", captionAt: { page: 1, y: 160 }, row: 6, ...SUPPLY("the date of that third new offence") },
      32: { page: 1, caption: "Offense Date of Offense Date of Charge Date of Conviction", label: "Date of Charge (new charges since)", captionAt: { page: 1, y: 160 }, row: 6, ...SUPPLY("the date that third new charge was brought") },
      33: { page: 1, caption: "Offense Date of Offense Date of Charge Date of Conviction", label: "Date of Conviction (new charges since)", captionAt: { page: 1, y: 160 }, row: 6, ...SUPPLY("the date of conviction on that third new charge") },
      36: { page: 2, caption: "4. I believe that sealing of my criminal history is in the interests of justice because:", captionAt: { page: 2, y: 745 }, ...SUPPLY("your own statement of why sealing is in the interests of justice — this is yours to write and the platform never writes it for you") },
      "26@2": { field: "26", page: 2, caption: "State Agency Address", label: "State Agency (other state entities to notify)", captionAt: { page: 2, y: 583 }, row: 7, ...SUPPLY("the name of any other state agency the court should notify, if you know of one") },
      "27@2": { field: "27", page: 2, caption: "State Agency Address", label: "Address (other state entities to notify)", captionAt: { page: 2, y: 583 }, row: 7, ...SUPPLY("that agency's address") },
      "30@2": { field: "30", page: 2, caption: "State Agency Address", label: "State Agency (other state entities to notify)", captionAt: { page: 2, y: 583 }, row: 8, ...SUPPLY("a second agency the court should notify, if there is one") },
      "31@2": { field: "31", page: 2, caption: "State Agency Address", label: "Address (other state entities to notify)", captionAt: { page: 2, y: 583 }, row: 8, ...SUPPLY("that second agency's address") },
      "36a": { page: 2, caption: "YES", label: "I consent to receive documents from the other parties at the email provided below: YES", captionAt: { page: 2, y: 462 }, ...ELECTION() },
      "36b": { page: 2, caption: "NO", label: "I consent to receive documents from the other parties at the email provided below: NO", captionAt: { page: 2, y: 462 }, ...ELECTION() },
      37: { page: 2, caption: "Date of Signature", captionAt: { page: 2, y: 404 }, ...PROTECT(SIGNATURE) },
      "37a": { page: 2, caption: "Signature of Defendant", captionAt: { page: 2, y: 367 }, ...PROTECT(SIGNATURE) },
      38: { page: 2, caption: "Printed Name of Defendant", captionAt: { page: 2, y: 326 }, ...WRITE("participant.full_legal_name") },
      39: { page: 2, caption: "Address", captionAt: { page: 2, y: 286 }, ...WRITE("participant.street_address") },
      40: { page: 2, caption: "City, State, Zip", captionAt: { page: 2, y: 246 }, ...WRITE("participant.city_state_zip") },
      41: { page: 2, caption: "Phone", captionAt: { page: 2, y: 206 }, ...WRITE("participant.phone") },
      42: { page: 2, caption: "Email Address", captionAt: { page: 2, y: 163 }, ...WRITE("participant.email") }
    }
  },
  "200-00132": {
    title: "Stipulation to Seal Criminal History Record + Order",
    pages: 2,
    fields: {
      Unit: { page: 1, caption: "Unit", label: "Unit (Superior Court unit)", captionAt: { page: 1, y: 728 }, ...SUPPLY("the Superior Court unit (county) where the case was decided") },
      "Docket Number": { page: 1, caption: "Unit Case No.", label: "Case No. (docket number)", captionAt: { page: 1, y: 728 }, ...WRITE("matter.case_number") },
      Defendant: { page: 1, caption: "In RE:", label: "In RE: Defendant", captionAt: { page: 1, y: 695 }, ...WRITE("participant.full_legal_name") },
      DOB: { page: 1, caption: "DOB:", captionAt: { page: 1, y: 695 }, ...WRITE("participant.date_of_birth") },
      22: { page: 1, caption: "Description of Offense", captionAt: { page: 1, y: 580 }, row: 1, ...SUPPLY("the description of the first offence, exactly as on the petition") },
      23: { page: 1, caption: "Date of Offense", captionAt: { page: 1, y: 580 }, row: 1, ...SUPPLY("the date of the first offence") },
      24: { page: 1, caption: "Incident Number", captionAt: { page: 1, y: 580 }, row: 1, ...SUPPLY("the incident number for the first offence, if the record shows one") },
      25: { page: 1, caption: "Docket Number (if any)", captionAt: { page: 1, y: 580 }, row: 1, ...SUPPLY("the docket number of the first offence, if it has one") },
      26: { page: 1, caption: "Description of Offense", captionAt: { page: 1, y: 580 }, row: 2, ...SUPPLY("the description of a second offence from the same incident, if there is one") },
      27: { page: 1, caption: "Date of Offense", captionAt: { page: 1, y: 580 }, row: 2, ...SUPPLY("the date of the second offence") },
      28: { page: 1, caption: "Incident Number", captionAt: { page: 1, y: 580 }, row: 2, ...SUPPLY("the incident number for the second offence") },
      29: { page: 1, caption: "Docket Number (if any)", captionAt: { page: 1, y: 580 }, row: 2, ...SUPPLY("the docket number of the second offence") },
      30: { page: 1, caption: "Description of Offense", captionAt: { page: 1, y: 580 }, row: 3, ...SUPPLY("the description of a third offence from the same incident, if there is one") },
      31: { page: 1, caption: "Date of Offense", captionAt: { page: 1, y: 580 }, row: 3, ...SUPPLY("the date of the third offence") },
      32: { page: 1, caption: "Incident Number", captionAt: { page: 1, y: 580 }, row: 3, ...SUPPLY("the incident number for the third offence") },
      33: { page: 1, caption: "Docket Number (if any)", captionAt: { page: 1, y: 580 }, row: 3, ...SUPPLY("the docket number of the third offence") },
      34: { page: 1, caption: "State Agency Address", label: "State Agency (other state entities to notify)", captionAt: { page: 1, y: 374 }, row: 7, ...SUPPLY("the name of any other state agency the court should notify, if you know of one") },
      "34a": { page: 1, caption: "State Agency Address", label: "Address (other state entities to notify)", captionAt: { page: 1, y: 374 }, row: 7, ...SUPPLY("that agency's address") },
      35: { page: 1, caption: "State Agency Address", label: "State Agency (other state entities to notify)", captionAt: { page: 1, y: 374 }, row: 8, ...SUPPLY("a second agency the court should notify, if there is one") },
      36: { page: 1, caption: "State Agency Address", label: "Address (other state entities to notify)", captionAt: { page: 1, y: 374 }, row: 8, ...SUPPLY("that second agency's address") },
      "check box 1": { page: 1, caption: "YES", label: "I consent to receive documents from the other parties at the email provided below: YES", captionAt: { page: 1, y: 254 }, ...ELECTION() },
      "chec box 2": { page: 1, caption: "NO", label: "I consent to receive documents from the other parties at the email provided below: NO", captionAt: { page: 1, y: 254 }, ...ELECTION() },
      "34b": { page: 1, caption: "Date: Signature", label: "Defendant: Date of Signature", captionAt: { page: 1, y: 210 }, ...PROTECT(SIGNATURE) },
      "34c": { page: 1, caption: "Date: Signature", label: "Defendant: Signature", captionAt: { page: 1, y: 210 }, ...PROTECT(SIGNATURE) },
      "34d": { page: 1, caption: "Printed Name", captionAt: { page: 1, y: 181 }, ...WRITE("participant.full_legal_name") },
      "34e": { page: 1, caption: "Mailing Address", captionAt: { page: 1, y: 152 }, ...WRITE("participant.street_address") },
      "34f": { page: 1, caption: "Mailing Address", label: "Mailing Address — City, State, Zip", captionAt: { page: 1, y: 152 }, ...WRITE("participant.city_state_zip") },
      "34g": { page: 1, caption: "Mailing Address", label: "Mailing Address (third line)", captionAt: { page: 1, y: 152 }, ...SUPPLY("a third mailing-address line, only if your address needs one") },
      "34h": { page: 1, caption: "Phone Number", captionAt: { page: 1, y: 152 }, ...WRITE("participant.phone") },
      "34i": { page: 1, caption: "Email Address", captionAt: { page: 1, y: 123 }, ...WRITE("participant.email") },
      "34j": { page: 1, caption: "Date: Signature", label: "State’s Attorney: Date of Signature", captionAt: { page: 1, y: 65 }, ...PROTECT(COURT_OWNED) },
      "34k": { page: 1, caption: "Date: Signature", label: "State’s Attorney: Signature", captionAt: { page: 1, y: 65 }, ...PROTECT(COURT_OWNED) },
      "34l": { page: 1, caption: "Printed Name", label: "State’s Attorney: Printed Name", captionAt: { page: 1, y: 36 }, ...PROTECT(COURT_OWNED) }
    }
  },
  "600-00228": {
    title: "Application to Waive Filing Fees and Service Costs",
    pages: 2,
    fields: {
      Division: { page: 1, caption: "SUPERIOR COURT DIVISION", captionAt: { page: 1, y: 732 }, ...SUPPLY("the Superior Court division your case is in") },
      Unit: { page: 1, caption: "Unit", label: "Unit (Superior Court unit)", captionAt: { page: 1, y: 712 }, ...SUPPLY("the Superior Court unit (county) where the case was decided") },
      "Docket Number": { page: 1, caption: "Unit Case No.", label: "Case No. (docket number)", captionAt: { page: 1, y: 712 }, ...WRITE("matter.case_number") },
      "Case Name": { page: 1, caption: "Case Name", captionAt: { page: 1, y: 651 }, ...WRITE("participant.full_legal_name") },
      3: { page: 1, caption: "Name: (First & Last)", captionAt: { page: 1, y: 609 }, ...WRITE("participant.full_legal_name") },
      2: { page: 1, caption: "Street Address:", captionAt: { page: 1, y: 591 }, ...WRITE("participant.street_address") },
      4: { page: 1, caption: "City/State/Zip:", captionAt: { page: 1, y: 572 }, ...WRITE("participant.city_state_zip") },
      5: { page: 1, caption: "Mailing Address: (if different from street address)", captionAt: { page: 1, y: 554 }, ...SUPPLY("a mailing address, only if it is different from your street address") },
      "5a": { page: 1, caption: "Email Address:", captionAt: { page: 1, y: 535 }, ...WRITE("participant.email") },
      6: { page: 1, caption: "Home / Cell Phone:", captionAt: { page: 1, y: 517 }, ...WRITE("participant.phone") },
      7: { page: 1, caption: "Work Phone:", captionAt: { page: 1, y: 517 }, ...SUPPLY("your work phone number, if you have one") },
      8: { page: 1, caption: "Total Number Living in Household (spouse, partner & dependents)", captionAt: { page: 1, y: 483 }, ...SUPPLY("how many people live in your household, counting a spouse or partner and any dependants") },
      15: { page: 1, caption: "Are you employed?", label: "Are you employed? Yes", captionAt: { page: 1, y: 439 }, ...ELECTION() },
      16: { page: 1, caption: "Are you employed?", label: "Are you employed? No", captionAt: { page: 1, y: 439 }, ...ELECTION() },
      17: { page: 1, caption: "Employer Name", captionAt: { page: 1, y: 426 }, row: 10, ...SUPPLY("your employer's name, if you are employed") },
      18: { page: 1, caption: "Employer Address", captionAt: { page: 1, y: 426 }, row: 10, ...SUPPLY("your employer's address") },
      19: { page: 1, caption: "Employer Name", captionAt: { page: 1, y: 426 }, row: 11, ...SUPPLY("a second employer's name, if you have one") },
      20: { page: 1, caption: "Employer Address", captionAt: { page: 1, y: 426 }, row: 11, ...SUPPLY("that second employer's address") },
      21: { page: 1, caption: "income sensitive criteria?", label: "Do you receive any government benefit based on need: Yes", captionAt: { page: 1, y: 337 }, ...ELECTION() },
      22: { page: 1, caption: "income sensitive criteria?", label: "Do you receive any government benefit based on need: No", captionAt: { page: 1, y: 337 }, ...ELECTION() },
      23: { page: 1, caption: "Type of Assistance:", captionAt: { page: 1, y: 322 }, ...SUPPLY("the type of public assistance you receive, if you receive any") },
      24: { page: 1, caption: "Monthly Amount $", captionAt: { page: 1, y: 322 }, ...SUPPLY("the monthly amount of that public assistance") },
      27: { page: 1, caption: "Gross Income from Wages", captionAt: { page: 1, y: 200 }, ...SUPPLY("your gross monthly income from wages") },
      29: { page: 1, caption: "Compensation", label: "Unemployment Compensation", captionAt: { page: 1, y: 188 }, ...SUPPLY("your monthly unemployment compensation, if any") },
      31: { page: 1, caption: "Child Support", label: "Child Support (income received)", captionAt: { page: 1, y: 175 }, ...SUPPLY("child support you receive each month, if any") },
      33: { page: 1, caption: "Other Income", captionAt: { page: 1, y: 163 }, ...SUPPLY("any other monthly income") },
      35: { page: 1, caption: "Self-Employment/Business Income", label: "Self-Employment/Business Income (other than wages)", captionAt: { page: 1, y: 115 }, ...SUPPLY("your monthly self-employment or business income, if any") },
      MonthlyTotal: { page: 1, caption: "Total Monthly Income", captionAt: { page: 1, y: 90 }, ...SUPPLY("your total monthly income") },
      41: { page: 1, caption: "Total Income in the past 12 months", captionAt: { page: 1, y: 78 }, ...SUPPLY("your total income over the past twelve months") },
      45: { page: 1, caption: "Rent or Mortgage Payment", captionAt: { page: 1, y: 200 }, ...SUPPLY("your monthly rent or mortgage payment") },
      46: { page: 1, caption: "Electric Service", captionAt: { page: 1, y: 188 }, ...SUPPLY("your monthly electricity bill") },
      47: { page: 1, caption: "Phone", label: "Phone (monthly expense)", captionAt: { page: 1, y: 175 }, ...SUPPLY("your monthly phone bill") },
      48: { page: 1, caption: "Fuel (heat and/or gas)", captionAt: { page: 1, y: 163 }, ...SUPPLY("your monthly fuel, heating or gas cost") },
      49: { page: 1, caption: "Food", captionAt: { page: 1, y: 151 }, ...SUPPLY("your monthly food cost") },
      50: { page: 1, caption: "Clothing", label: "the unlabelled expense line printed left of Clothing", captionAt: { page: 1, y: 139 }, ...SUPPLY("the household expense on this line of the form") },
      51: { page: 1, caption: "Clothing", captionAt: { page: 1, y: 139 }, ...SUPPLY("your monthly clothing cost") },
      52: { page: 1, caption: "Medical", captionAt: { page: 1, y: 127 }, ...SUPPLY("your monthly medical cost") },
      53: { page: 1, caption: "Child Support", label: "Child Support (monthly expense)", captionAt: { page: 1, y: 115 }, ...SUPPLY("child support you pay each month, if any") },
      54: { page: 1, caption: "Auto Loan Payment", captionAt: { page: 1, y: 102 }, ...SUPPLY("your monthly car loan payment, if any") },
      55: { page: 1, caption: "Property Taxes", captionAt: { page: 1, y: 90 }, ...SUPPLY("your monthly property tax, if you pay it") },
      56: { page: 1, caption: "Insurance (health, auto, etc.)", captionAt: { page: 1, y: 78 }, ...SUPPLY("your monthly insurance cost") },
      57: { page: 1, caption: "Other Expenses", captionAt: { page: 1, y: 65 }, ...SUPPLY("any other monthly expense") },
      72: { page: 2, caption: "I have additional assets:", label: "I have additional assets: Yes", captionAt: { page: 2, y: 734 }, ...ELECTION() },
      73: { page: 2, caption: "I have additional assets:", label: "I have additional assets: No", captionAt: { page: 2, y: 734 }, ...ELECTION() },
      74: { page: 2, caption: "Vehicles Make, Model Yea,r air MFarket Value Amount Oewd Net Value", label: "Vehicles Make, Model", captionAt: { page: 2, y: 707 }, row: 12, ...SUPPLY("the make and model of a vehicle you own, if you own one") },
      75: { page: 2, caption: "Vehicles Make, Model Yea,r air MFarket Value Amount Oewd Net Value", label: "Vehicle Year / Fair Market Value", captionAt: { page: 2, y: 707 }, row: 12, ...SUPPLY("that vehicle's year and fair market value") },
      76: { page: 2, caption: "Vehicles Make, Model Yea,r air MFarket Value Amount Oewd Net Value", label: "Vehicle Amount Owed", captionAt: { page: 2, y: 707 }, row: 12, ...SUPPLY("how much you still owe on that vehicle") },
      77: { page: 2, caption: "Vehicles Make, Model Yea,r air MFarket Value Amount Oewd Net Value", label: "Vehicle Net Value", captionAt: { page: 2, y: 707 }, row: 12, ...SUPPLY("that vehicle's net value") },
      78: { page: 2, caption: "Vehicles Make, Model Yea,r air MFarket Value Amount Oewd Net Value", label: "Vehicles Make, Model", captionAt: { page: 2, y: 707 }, row: 13, ...SUPPLY("a second vehicle's make and model, if you own one") },
      79: { page: 2, caption: "Vehicles Make, Model Yea,r air MFarket Value Amount Oewd Net Value", label: "Vehicle Year / Fair Market Value", captionAt: { page: 2, y: 707 }, row: 13, ...SUPPLY("that second vehicle's year and fair market value") },
      80: { page: 2, caption: "Vehicles Make, Model Yea,r air MFarket Value Amount Oewd Net Value", label: "Vehicle Amount Owed", captionAt: { page: 2, y: 707 }, row: 13, ...SUPPLY("how much you still owe on that second vehicle") },
      81: { page: 2, caption: "Vehicles Make, Model Yea,r air MFarket Value Amount Oewd Net Value", label: "Vehicle Net Value", captionAt: { page: 2, y: 707 }, row: 13, ...SUPPLY("that second vehicle's net value") },
      82: { page: 2, caption: "Vehicles Make, Model Yea,r air MFarket Value Amount Oewd Net Value", label: "Vehicles Make, Model", captionAt: { page: 2, y: 707 }, row: 14, ...SUPPLY("a third vehicle's make and model, if you own one") },
      83: { page: 2, caption: "Vehicles Make, Model Yea,r air MFarket Value Amount Oewd Net Value", label: "Vehicle Year / Fair Market Value", captionAt: { page: 2, y: 707 }, row: 14, ...SUPPLY("that third vehicle's year and fair market value") },
      84: { page: 2, caption: "Vehicles Make, Model Yea,r air MFarket Value Amount Oewd Net Value", label: "Vehicle Amount Owed", captionAt: { page: 2, y: 707 }, row: 14, ...SUPPLY("how much you still owe on that third vehicle") },
      85: { page: 2, caption: "Vehicles Make, Model Yea,r air MFarket Value Amount Oewd Net Value", label: "Vehicle Net Value", captionAt: { page: 2, y: 707 }, row: 14, ...SUPPLY("that third vehicle's net value") },
      86: { page: 2, caption: "Vehicles Make, Model Yea,r air MFarket Value Amount Oewd Net Value", label: "Vehicles Make, Model", captionAt: { page: 2, y: 707 }, row: 15, ...SUPPLY("a fourth vehicle's make and model, if you own one") },
      87: { page: 2, caption: "Vehicles Make, Model Yea,r air MFarket Value Amount Oewd Net Value", label: "Vehicle Year / Fair Market Value", captionAt: { page: 2, y: 707 }, row: 15, ...SUPPLY("that fourth vehicle's year and fair market value") },
      88: { page: 2, caption: "Vehicles Make, Model Yea,r air MFarket Value Amount Oewd Net Value", label: "Vehicle Amount Owed", captionAt: { page: 2, y: 707 }, row: 15, ...SUPPLY("how much you still owe on that fourth vehicle") },
      89: { page: 2, caption: "Vehicles Make, Model Yea,r air MFarket Value Amount Oewd Net Value", label: "Vehicle Net Value", captionAt: { page: 2, y: 707 }, row: 15, ...SUPPLY("that fourth vehicle's net value") },
      90: { page: 2, caption: "Real Property Description FMV Mortgage Net Value", label: "Real Property Description", captionAt: { page: 2, y: 605 }, row: 16, ...SUPPLY("a description of real property you own, if you own any") },
      91: { page: 2, caption: "Real Property Description FMV Mortgage Net Value", label: "Real Property FMV", captionAt: { page: 2, y: 605 }, row: 16, ...SUPPLY("that property's fair market value") },
      92: { page: 2, caption: "Real Property Description FMV Mortgage Net Value", label: "Real Property Mortgage", captionAt: { page: 2, y: 605 }, row: 16, ...SUPPLY("the mortgage on that property") },
      93: { page: 2, caption: "Real Property Description FMV Mortgage Net Value", label: "Real Property Net Value", captionAt: { page: 2, y: 605 }, row: 16, ...SUPPLY("that property's net value") },
      94: { page: 2, caption: "Real Property Description FMV Mortgage Net Value", label: "Real Property Description", captionAt: { page: 2, y: 605 }, row: 17, ...SUPPLY("a second property's description, if you own one") },
      95: { page: 2, caption: "Real Property Description FMV Mortgage Net Value", label: "Real Property FMV", captionAt: { page: 2, y: 605 }, row: 17, ...SUPPLY("that second property's fair market value") },
      96: { page: 2, caption: "Real Property Description FMV Mortgage Net Value", label: "Real Property Mortgage", captionAt: { page: 2, y: 605 }, row: 17, ...SUPPLY("the mortgage on that second property") },
      97: { page: 2, caption: "Real Property Description FMV Mortgage Net Value", label: "Real Property Net Value", captionAt: { page: 2, y: 605 }, row: 17, ...SUPPLY("that second property's net value") },
      98: { page: 2, caption: "Cash on Hand", captionAt: { page: 2, y: 536 }, ...SUPPLY("how much cash you have on hand") },
      99: { page: 2, caption: "Checking Account", captionAt: { page: 2, y: 522 }, ...SUPPLY("the balance of your checking account") },
      100: { page: 2, caption: "Savings Accounts", captionAt: { page: 2, y: 508 }, ...SUPPLY("the balance of your savings accounts") },
      101: { page: 2, caption: "Total Cash Assets", captionAt: { page: 2, y: 494 }, ...SUPPLY("your total cash assets") },
      102: { page: 2, caption: "Other Assets Description FMV Use additional sheets as necessary", label: "Other Assets Description", captionAt: { page: 2, y: 466 }, row: 18, ...SUPPLY("a description of any other asset — tools, equipment, stocks and so on") },
      103: { page: 2, caption: "Other Assets Description FMV Use additional sheets as necessary", label: "Other Assets FMV", captionAt: { page: 2, y: 466 }, row: 18, ...SUPPLY("that asset's fair market value") },
      104: { page: 2, caption: "Other Assets Description FMV Use additional sheets as necessary", label: "Other Assets Description", captionAt: { page: 2, y: 466 }, row: 19, ...SUPPLY("a second other asset, if you have one") },
      105: { page: 2, caption: "Other Assets Description FMV Use additional sheets as necessary", label: "Other Assets FMV", captionAt: { page: 2, y: 466 }, row: 19, ...SUPPLY("that second asset's fair market value") },
      113: { page: 2, caption: "These are additional reasons why I cannot afford the fees:", captionAt: { page: 2, y: 363 }, ...SUPPLY("anything else you want the court to know about why you cannot afford the fees — this is yours to write") },
      115: { page: 2, caption: "Date", captionAt: { page: 2, y: 140 }, ...PROTECT(SIGNATURE) },
      116: { page: 2, caption: "Applicant Signature", captionAt: { page: 2, y: 113 }, ...PROTECT(SIGNATURE) },
      117: { page: 2, caption: "Printed Name", captionAt: { page: 2, y: 72 }, ...WRITE("participant.full_legal_name") }
    }
  }
};

/*
 * The publication the filing instructions quote for the fee and for service.
 *
 * It is NOT a packet component -- it is never rendered into the artifact and it
 * is not in ROUTE_DOCUMENTS. It is the authority behind two sentences, and it
 * is re-hashed against the committed corpus index on every build so a superseded
 * revision refuses the build rather than shipping a stale fee a participant
 * would pay.
 */
const VT_FILING_INSTRUCTIONS = Object.freeze({
  formNumber: "200-00130A",
  title: "Filing a Petition to Expunge or Seal a Criminal Record",
  revision: "07/2025",
  issuer: "Vermont Judiciary",
  pathInArchive: "STATES/VT/03_INSTRUCTIONS/VT__INSTRUCTIONS__200-00130A__filing-a-petition-to-expunge-or-seal-a-criminal-record__REV-UNKNOWN__EN.pdf",
  supports: ["filing-fee-and-waiver-route", "service-recipient-and-method"]
});

/*
 * The fee-waiver application, by the identity the record names.
 *
 * The Vermont Judiciary's dedicated fee-waiver page and the actual two-page
 * PDF both identify 600-00228, Application to Waive Filing Fees & Service
 * Costs, revision 04/2026. The criminal-record webpage's explanatory prose
 * still prints 600-00229 for the same document; the 2026-09-06 owner-relayed
 * research directs the packet to use the actual form identity and not the
 * inconsistent prose number, and vt-600-00228-source-identity-resolution
 * records the same finding. The digest is the one the family's own
 * source-receipt binds, and the fee-bearing route checks the delivered
 * component against it before naming the form to a participant.
 */
const WAIVER_FORM = Object.freeze({
  formNumber: "600-00228",
  printedRevision: "04/2026",
  pinnedSha256: "263d4e196cbca1bfba14ec730368fcc897dd2bb667d6a43ade7f612d42541654",
  notCarried: "600-00229, the number the Judiciary's criminal-record narrative prints for this same document"
});

/* The corpus path spells a revision YYYY-MM; a form prints it MM/YYYY. */
function printedRevision(fromPath) {
  const m = /^([0-9]{4})-([0-9]{2})$/.exec(String(fromPath ?? ""));
  return m ? `${m[2]}/${m[1]}` : null;
}

function resolveFilingInstructions() {
  const index = JSON.parse(fs.readFileSync(path.join(ROOT, CORPUS_INDEX), "utf8"));
  const raw = index.entries ?? index.files ?? index;
  const entries = Array.isArray(raw) ? raw : Object.values(raw);
  const entry = entries.find((e) => (e.path ?? e.relativePath) === VT_FILING_INSTRUCTIONS.pathInArchive);
  assert.ok(entry, `${VT_FILING_INSTRUCTIONS.formNumber}: not in the committed corpus index`);
  const bytes = fs.readFileSync(path.join(corpusRoot(), VT_FILING_INSTRUCTIONS.pathInArchive));
  const digest = crypto.createHash("sha256").update(bytes).digest("hex");
  const indexed = String(entry.sha256 ?? entry.sha ?? "");
  assert.equal(digest, indexed,
    `${VT_FILING_INSTRUCTIONS.formNumber}: SHA-256 drift; the index records ${indexed} and the held bytes hash to ${digest}`);
  return { ...VT_FILING_INSTRUCTIONS, sha256: digest, byteLength: bytes.length,
    verifiedBy: "re-hashed on this build against the committed corpus index" };
}

/* The five families. Same three documents; different statutory route. */
const ROUTE_DOCUMENTS = ["200-00130", "200-00132", "600-00228"];
export const FAMILY_CONFIGS = Object.freeze({
  "vt_seal_misdemeanor-set": {
    jurisdiction: "VT", routeKey: "obligation:track-pathway:VT:vt_seal_misdemeanor:adult-misdemeanor-conviction-sealing",
    routeSelectionId: "vt-seal-misdemeanor-200-00130-complete-set",
    routeName: "sealing an adult misdemeanour conviction under 13 V.S.A. § 7602",
    convicted: true, documents: ROUTE_DOCUMENTS,
    /*
     * FIX75. The one word, now that this family's repair is claimed.
     *
     * VF05 measured this family's participant-instructions.md against its own
     * committed registry track and found 0 of its declared selfHelpStopConditions
     * carried: zero occurrences of "lawyer", "legal aid", "self-help",
     * "immigration", "victim" or "pending", and the one passage that reached a
     * stop condition told the participant to attend the contested hearing alone.
     * The sibling vt_seal_pardon-set, built by this same host from this same
     * registry field, carried all ten of its own. Setting the track id here
     * makes this family read ITS OWN track: its own stop conditions, its own
     * waiting periods and its own exclusions, quoted rather than restated, in
     * the shape the pardon family already delivers.
     */
    registryGuidanceTrackId: "vt_seal_misdemeanor"
  },
  "vt_seal_felony-set": {
    jurisdiction: "VT", routeKey: "obligation:track-pathway:VT:vt_seal_felony:adult-felony-conviction-sealing",
    routeSelectionId: "vt-seal-felony-200-00130-complete-set",
    routeName: "sealing an adult felony conviction under 13 V.S.A. § 7602",
    convicted: true, documents: ROUTE_DOCUMENTS,
    /*
     * FIX75. The one word, now that this family's repair is claimed.
     *
     * VF05 measured this family's participant-instructions.md against its own
     * committed registry track and found 0 of its declared selfHelpStopConditions
     * carried: zero occurrences of "lawyer", "legal aid", "self-help",
     * "immigration", "victim" or "pending", and the one passage that reached a
     * stop condition told the participant to attend the contested hearing alone.
     * The sibling vt_seal_pardon-set, built by this same host from this same
     * registry field, carried all ten of its own. Setting the track id here
     * makes this family read ITS OWN track: its own stop conditions, its own
     * waiting periods and its own exclusions, quoted rather than restated, in
     * the shape the pardon family already delivers.
     */
    registryGuidanceTrackId: "vt_seal_felony"
  },
  "vt_seal_dui-set": {
    jurisdiction: "VT", routeKey: "obligation:track-pathway:VT:vt_seal_dui:dui-sealing",
    routeSelectionId: "vt-seal-dui-200-00130-complete-set",
    routeName: "sealing a DUI conviction under 13 V.S.A. § 7602",
    convicted: true, documents: ROUTE_DOCUMENTS,
    /*
     * FIX75. The one word, now that this family's repair is claimed.
     *
     * VF05 measured this family's participant-instructions.md against its own
     * committed registry track and found 0 of its declared selfHelpStopConditions
     * carried: zero occurrences of "lawyer", "legal aid", "self-help",
     * "immigration", "victim" or "pending", and the one passage that reached a
     * stop condition told the participant to attend the contested hearing alone.
     * The sibling vt_seal_pardon-set, built by this same host from this same
     * registry field, carried all ten of its own. Setting the track id here
     * makes this family read ITS OWN track: its own stop conditions, its own
     * waiting periods and its own exclusions, quoted rather than restated, in
     * the shape the pardon family already delivers.
     */
    registryGuidanceTrackId: "vt_seal_dui"
  },
  "vt_seal_18_to_21-set": {
    jurisdiction: "VT", routeKey: "obligation:track-pathway:VT:vt_seal_18_to_21:young-adult-sealing-for-offenses-committed-at-ages-18-21",
    routeSelectionId: "vt-seal-18-to-21-200-00130-complete-set",
    routeName: "sealing an offence committed between the ages of 18 and 21 under 13 V.S.A. § 7602",
    convicted: true, documents: ROUTE_DOCUMENTS,
    /*
     * FIX75. The one word, now that this family's repair is claimed.
     *
     * VF05 measured this family's participant-instructions.md against its own
     * committed registry track and found 0 of its declared selfHelpStopConditions
     * carried: zero occurrences of "lawyer", "legal aid", "self-help",
     * "immigration", "victim" or "pending", and the one passage that reached a
     * stop condition told the participant to attend the contested hearing alone.
     * The sibling vt_seal_pardon-set, built by this same host from this same
     * registry field, carried all ten of its own. Setting the track id here
     * makes this family read ITS OWN track: its own stop conditions, its own
     * waiting periods and its own exclusions, quoted rather than restated, in
     * the shape the pardon family already delivers.
     */
    registryGuidanceTrackId: "vt_seal_18_to_21"
  },
  "vt_seal_pardon-set": {
    jurisdiction: "VT", routeKey: "obligation:track-only:VT:vt_seal_pardon",
    routeSelectionId: "vt-seal-pardon-200-00130-complete-set",
    routeName: "sealing a pardoned conviction under 13 V.S.A. § 7602",
    convicted: true, documents: ROUTE_DOCUMENTS,
    /*
     * FIX04. Set on THIS FAMILY ONLY. The four sibling Vermont families on this
     * host each have their own registry track with their own waiting periods,
     * exclusions and stop conditions, and reading them here unconditionally
     * would rewrite four families this lane holds no grant on. The mechanism is
     * general and each needs the one word once its repair is claimed.
     */
    registryGuidanceTrackId: "vt_seal_pardon"
  }
});

/* ---- fixtures ------------------------------------------------------------ *
 * Two participants. The canonical one is unremarkable. The boundary one has a
 * long hyphenated name, an apostrophe, a long street and a long email, because
 * a value that fits the box is not evidence that every value does.
 * Neither carries a signature, a signature date, or any court-owned value. */
const FIXTURES = {
  canonical: {
    "participant.full_legal_name": "Jordan Avery Reyes",
    "participant.date_of_birth": "1991-04-17",
    "participant.street_address": "42 Maple Street",
    "participant.city_state_zip": "Burlington, VT 05401",
    "participant.phone": "802-555-0142",
    "participant.email": "jordan.reyes@example.org",
    "matter.case_number": "123-4-21 Cncr"
  },
  boundary: {
    "participant.full_legal_name": "Maria-Alejandra O’Shaughnessy-Whitfield",
    "participant.date_of_birth": "1968-12-31",
    "participant.street_address": "1188 Upper Notch Crossing Road, Apartment 14B",
    "participant.city_state_zip": "South Burlington, Vermont 05403-2214",
    "participant.phone": "(802) 555-0199 ext. 4417",
    "participant.email": "maria.alejandra.oshaughnessy.whitfield@longmailexample.org",
    "matter.case_number": "1276-11-24 Frcr"
  }
};

/* ---- source binding ------------------------------------------------------ */
function resolveSources(familyId) {
  const config = FAMILY_CONFIGS[familyId];
  assert.ok(config, `unknown family ${familyId}`);
  const index = JSON.parse(fs.readFileSync(path.join(ROOT, CORPUS_INDEX), "utf8"));
  const entries = index.entries ?? index.files ?? index;
  const root = corpusRoot();
  const resolved = [];
  const failures = [];
  for (const formNumber of config.documents) {
    const entry = (Array.isArray(entries) ? entries : Object.values(entries))
      .find((e) => String(e.path ?? e.relativePath ?? "").includes(`__${formNumber}__`) && String(e.path ?? e.relativePath ?? "").startsWith("STATES/VT/"));
    if (!entry) { failures.push({ formNumber, why: "no entry for this form number in the committed corpus index" }); continue; }
    const rel = entry.path ?? entry.relativePath;
    const abs = path.join(root, rel);
    if (!fs.existsSync(abs)) { failures.push({ formNumber, why: `the indexed path does not exist on disk: ${rel}` }); continue; }
    const bytes = fs.readFileSync(abs);
    const sha256 = crypto.createHash("sha256").update(bytes).digest("hex");
    const indexed = String(entry.sha256 ?? entry.sha ?? "");
    if (indexed && indexed !== sha256) { failures.push({ formNumber, why: `SHA-256 drift: index says ${indexed}, disk holds ${sha256}` }); continue; }
    resolved.push({
      formNumber, sourceId: `official-form:${formNumber}`, pathInArchive: rel,
      revision: /__REV-([0-9-]+)__/.exec(rel)?.[1] ?? null,
      sha256, byteLength: bytes.length, bytes
    });
  }
  return { resolved, failures };
}

/* ---- census, from the measured dictionary and the form's own widgets ------ */
async function censusOf(source, corrections = null) {
  const spec = FORM_FIELDS[source.formNumber];
  const doc = await PDFDocument.load(source.bytes, { ignoreEncryption: true });
  const pages = doc.getPages();
  const pageText = pages.map((p, i) => ({
    page: i + 1,
    // FIX130. `x` is kept: the row-number locator has to know whether a printed
    // "N." sits to the LEFT of a table's widgets or is prose somewhere else on
    // the same line. Dropping it made every such test read false.
    lines: groupIntoLines(extractTextItems(p)).map((l) => ({ y: Math.round(l.y), x: l.x, text: l.text }))
  }));
  const rows = [];
  const unmapped = [];
  const seen = new Set();
  for (const field of doc.getForm().getFields()) {
    const name = field.getName();
    const widgets = field.acroField.getWidgets();
    for (const w of widgets) {
      const r = w.getRectangle();
      const ref = w.P();
      let pageIndex = pages.findIndex((p) => p.ref === ref);
      if (pageIndex < 0) pageIndex = 0;
      const page = pageIndex + 1;
      // A field name may repeat on two pages and mean two different things, so
      // the dictionary key carries the page where it does.
      const key = seen.has(name) || spec.fields[`${name}@${page}`] ? `${name}@${page}` : name;
      const dictionaryEntry = spec.fields[key] ?? spec.fields[name];
      if (!dictionaryEntry) { unmapped.push({ field: name, page, rect: r }); continue; }
      /*
       * FIX130. A measured correction replaces the dictionary's caption for
       * this widget only where one is declared, and only for a family that has
       * opted in. `corrections` is null for every family that has not, so no
       * unflagged family's bytes move.
       */
      const correction = corrections?.[key] ?? corrections?.[name] ?? null;
      /*
       * A correction that names a new printed caption and no label of its own
       * DROPS the dictionary's label. Merging over it left two blanks wearing
       * their neighbour's name -- field 50 as "the unlabelled expense line
       * printed left of Clothing" when the words printed beside it are
       * "Clothing", and field 53 as "Child Support (monthly expense)" when they
       * are "Auto Loan Payment" -- which is the very defect being repaired.
       */
      const entry = correction
        ? { ...dictionaryEntry, ...(correction.caption && !correction.label ? { label: undefined } : {}), ...correction }
        : dictionaryEntry;
      seen.add(name);
      rows.push({
        name, key, type: field.constructor.name.replace("PDF", "").toLowerCase().replace("textfield", "text").replace("checkbox", "checkbox").replace("dropdown", "dropdown"),
        page,
        rect: { x: Number(r.x.toFixed(2)), y: Number(r.y.toFixed(2)), width: Number(r.width.toFixed(2)), height: Number(r.height.toFixed(2)) },
        rectBasis: "acroform_widget_rect_read_first_hand_from_pinned_binary",
        caption: entry.caption,
        captionAt: entry.captionAt,
        captionUnextractable: entry.captionUnextractable ?? null,
        captionInRowBand: entry.captionInRowBand === true,
        captionCorrected: correction ? true : false,
        effectiveLabel: entry.label ?? entry.caption,
        regionHeading: entry.label ?? entry.caption,
        sectionHeading: null,
        row: entry.row ?? null,
        policy: entry.policy,
        fact: entry.fact ?? null,
        refusalClass: entry.refusalClass ?? null,
        what: entry.what ?? null,
        isSelectionControl: field.constructor.name === "PDFCheckBox",
        multiline: typeof field.isMultiline === "function" ? field.isMultiline() : false,
        maxLength: typeof field.getMaxLength === "function" ? (field.getMaxLength() ?? null) : null
      });
    }
  }
  // Every measured caption must still be printed where the dictionary says.
  const captionDrift = [];
  const captionOffItsRow = [];
  for (const r of rows) {
    /*
     * FIX130. A caption the source encodes through a broken cmap cannot be
     * matched against the content stream at all, so the drift check would fail
     * it for a reason that has nothing to do with drift. It is exempted HERE,
     * by an explicit recorded reason on the field, and nowhere else.
     */
    if (r.captionUnextractable) continue;
    /*
     * FIX130. Where a correction says the caption is printed on the widget's
     * OWN row, that is asserted against the pinned bytes: a printed line whose
     * baseline falls inside this widget's rectangle must carry the caption.
     * This is the check that catches a caption sitting one row off its blank,
     * which the captionAt check alone cannot see -- a caption is still printed
     * at its neighbour's coordinates.
     */
    if (r.captionInRowBand) {
      const flatRow = (x) => String(x).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
      const inBand = (pageText.find((p) => p.page === r.page)?.lines ?? [])
        .filter((l) => l.y >= r.rect.y && l.y <= r.rect.y + r.rect.height);
      if (!inBand.some((l) => flatRow(l.text).includes(flatRow(r.caption)))) {
        captionOffItsRow.push({ field: r.name, page: r.page, rect: r.rect, caption: r.caption, linesInThatBand: inBand.map((l) => l.text).slice(0, 2) });
      }
    }
    const at = r.captionAt;
    const lines = pageText.find((p) => p.page === at.page)?.lines ?? [];
    const near = lines.filter((l) => Math.abs(l.y - at.y) <= 2);
    /* The whole caption, normalized, must be a substring of a line printed at
     * that coordinate. A word-any test passed vacuously on short captions and
     * on captions whose only long word appeared somewhere else on the line. */
    const flat = (x) => String(x).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    const needle = flat(r.caption);
    const found = needle.length > 0 && near.some((l) => flat(l.text).includes(needle));
    if (!found) captionDrift.push({ field: r.name, page: at.page, y: at.y, caption: r.caption, linesThere: near.map((l) => l.text).slice(0, 2) });
  }
  return { rows, unmapped, captionDrift, captionOffItsRow, pageText };
}

/*
 * FIX130. The families this host builds whose 600-00228 selection controls keep
 * the court's own blank-state paint. Opt-in, by family, and deliberately not a
 * property of the host.
 *
 * WHAT WAS MEASURED, on this family's own delivered bytes rather than on a
 * prediction. Each delivered fixture carries six stroke-only flattened widget
 * appearances, all on 600-00228, and VF90 recorded that none of them matches a
 * pinned-source /AP /N stream byte for byte. That label is sound as a byte
 * comparison and says nothing about CAUSE, so the cause was established here:
 *
 *   delivered  /FlatWidget-7888911063   "0.5 0.5 13.4 13.4 re s"
 *   source     600-00228 field 16 /N/Off
 *              "1 g / 0 0 14.4 14.4 re / f / 0.5 0.5 13.4 13.4 re / s"
 *
 * Six of six are the source's own appearance with its leading opaque background
 * fill removed, and nothing is left over. The ink is the COURT'S, not ours, so
 * the remedy is to restore it rather than to delete it -- deleting it is what
 * erased a rule the form draws elsewhere in this cohort.
 *
 * WHY THE MISSING FILL IS A DEFECT AND NOT A TIDY-UP. 600-00228 prints its check
 * boxes as text, not as art: page 1 draws `/C2_1 1 Tf <0706> Tj` at 11.04pt on
 * the "Are you employed?" line, a ballot-box glyph, and the widget sits over it.
 * The white fill is what makes the widget's appearance REPLACE that printed
 * glyph instead of doubling it. Stripped, the printed box is revealed AND the
 * appearance's own box is stamped: two frames at every one of the six boxes. A
 * 600 dpi directional difference against the pinned source measures it at every
 * one of them -- +1144 dark pixels in a 132x132 crop at field 15, 0 removed --
 * and the crop shows a second outline standing inside the court's clean box.
 *
 * preserveUnwrittenSelectionBackgrounds is the committed, opt-in remedy for
 * exactly this symptom, taken by FIX01 on co_petition_seal_arrest-set for the
 * same measured cause. It preserves ONLY source-authored paint, only in an
 * unwritten check box or radio widget, and only where the source ships the
 * appearance itself. No mark is added, no box is ticked, /MK /BG is still
 * removed, and the shared module is not modified.
 *
 * WHY THIS IS A SET AND NOT A CONSTANT. This host builds five families and the
 * remedy is opted into one family at a time, so a family nobody has measured
 * cannot have its bytes moved by someone else's rebuild.
 *
 * FIX130c, 2026-09-10, vt_seal_misdemeanor-set. The cause was re-measured on
 * THIS family's own delivered canonical bytes rather than inherited from the
 * three above: a 600 dpi directional difference of packet page 5 against pinned
 * 600-00228 page 1, both rendered with annotations, reads +1083 dark pixels at
 * field 15, +947 at 16, +1178 at 21 and +1536 at 22, and packet page 6 against
 * page 2 reads +1083 at field 72 and +1083 at 73 -- six of six, zero removed at
 * every one, which is the doubled frame this remedy exists for. The same crops
 * on the already-repaired vt_seal_felony-set read 0 added and 0 removed.
 */
const PRESERVE_SOURCE_SELECTION_PAINT = new Set([
  "vt_seal_18_to_21-set",
  "vt_seal_felony-set",
  "vt_seal_misdemeanor-set",
  "vt_seal_pardon-set"
]);

/*
 * FIX130. Disclosure labels that are the words the form actually prints.
 *
 * WHAT WAS WRONG. Every one of the 112 requiredBeforeFiling disclosureLabel
 * values this host emitted was the printed caption WITH THE ACROFORM FIELD NAME
 * APPENDED -- "Description of Offense 1", "Description of Offense 4",
 * "Description of Offense 7", "Year 2", "Docket Number (If Any) 3" -- while the
 * participant page twice told the reader that column is "the words printed
 * beside the blank". It is not, and the appended numbers are worse than noise:
 * 200-00130 prints its question-1 charge table with rows numbered 1., 2. and 3.,
 * so a participant handed "Description of Offense 7" and matching by number has
 * no row 7 to find and fills the wrong line. Worse still, 200-00130 fields 26,
 * 27, 30 and 31 each carry TWO widgets in two unrelated tables -- the question-3
 * new-charge table on page 1 and the question-5 state-agency table on page 2 --
 * so one identifier named two different blanks.
 *
 * WHAT REPLACES IT. The printed caption, plus a locator resolved BY GEOMETRY
 * against the source page and never by AcroForm index:
 *
 *   - where the form prints a row number beside the row, that printed number
 *     ("... - row 1 as printed on the form"), found by looking for a line whose
 *     whole text is "N." at the row's own y and to the left of its widgets;
 *   - where the form prints no row numbers, the row's ordinal position down the
 *     table ("... - first row (the form prints no row numbers here)"), which is
 *     something the participant can see on the page.
 *
 * Every finished label is asserted UNIQUE within its form and page, so no two
 * blanks can share an identifier again.
 *
 * WHY THIS IS AN OPT-IN SET AND NOT A PROPERTY OF THE HOST. This host builds
 * five families, and the composition is opted into one family at a time so that
 * a family whose own bound forms nobody has re-read cannot have its labels
 * rewritten by someone else's rebuild.
 *
 * FIX130c, 2026-09-10, vt_seal_misdemeanor-set. Added only after the captions
 * were re-derived from geometry against the forms THIS family binds, rather
 * than assumed from the three above. Its source-receipt binds 200-00130 at
 * ff914f49..., 200-00132 at 088116244572..., 600-00228 at 263d4e19... -- the
 * same three digests the repaired families bind, re-hashed here from the master
 * library before the derivation was run, so the printed geometry is the same
 * geometry and not a similarly named revision. Every 600-00228 caption in
 * MEASURED_CAPTION_CORRECTIONS was then re-resolved independently: each widget
 * rect was matched to the printed "$___" run whose baseline falls inside it and
 * overlaps it in x, and the caption read from the printed items on that run's
 * baseline band lying inside that run's own COLUMN, the column taken from the
 * two printed column headings by x-position ("Your Current Monthly Income" at
 * x=41.64, "Your monthly household expenses" at x=320.40) and never from
 * extraction order, which interleaves the two columns line by line. The
 * re-derivation reproduces the committed corrections exactly and adds none.
 */
const PRINTED_CAPTION_DISCLOSURE_LABELS = new Set([
  "vt_seal_18_to_21-set",
  "vt_seal_felony-set",
  "vt_seal_misdemeanor-set",
  "vt_seal_pardon-set"
]);

/*
 * FIX130. Captions this dictionary had on the wrong blank, re-read from the
 * pinned bytes.
 *
 * Removing the appended field name is not a repair on its own if the caption
 * underneath it names a different blank, so every 600-00228 caption was
 * re-derived from the source: each widget rect was matched against the printed
 * "$______" run whose baseline falls inside it, which is the form's own marker
 * for that row's blank. The expenses column of page 1 came out SHIFTED BY ONE
 * ROW from field 50 down: the box beside the printed word "Clothing" was
 * disclosed as an unlabelled line, the box beside "Medical" as Clothing, and so
 * on down to the box beside "Total Expenses", which was disclosed as "Other
 * Expenses". Thirteen printed expense rows, thirteen widgets, eight of them
 * named after their neighbour -- on a financial affidavit signed under penalty
 * of perjury.
 *
 * Two more, from the same re-read:
 *   - field 35 is the blank on the italic line under "Other Income", not the
 *     Self-Employment/Business Income line 24 points above it. That italic run
 *     is encoded through a broken cmap and extracts as mojibake, so its caption
 *     cannot be matched against the content stream; it is marked
 *     captionUnextractable and read off the rendered page instead, and the
 *     label says which line it is rather than pretending to quote it.
 *   - the Vehicles table heading extracts interleaved ("Vehicles Make, Model
 *     Yea,r air MFarket Value Amount Oewd Net Value") and had been split as
 *     "Make, Model" and "Year / Fair Market Value". Read by x-position the
 *     printed columns are "Make, Model, Year" and "Fair Market Value (FMV)".
 *
 * NOT CORRECTED, and named rather than moved: MonthlyTotal and 41. The bottom
 * of the income column is typographically broken in the source -- four label
 * lines and two "$______" runs, each run printed midway between two labels, 5.4
 * and 5.3 points below the label above it and 6.6 and 6.8 above the label
 * below. Nearest-baseline and the widget's own name "MonthlyTotal" both agree
 * with what the dictionary already says, so both are left exactly as committed.
 * "Total Income in the past 12 months" may have no blank at all on this form.
 *
 * SCOPED, like the label composition above, to the families that have opted in.
 * vt_exp_decriminalized-set carries the same shift in its own separate policy
 * table, where 600-00228 discloses nothing to a participant because that route
 * does not file it.
 *
 * FIX130c, 2026-09-10. Re-derived against the pinned 600-00228 (263d4e19...)
 * before vt_seal_misdemeanor-set was opted in, by widget geometry alone. Every
 * entry above is reproduced: 50 Clothing, 51 Medical, 52 Child Support, 53 Auto
 * Loan Payment, 54 Property Taxes, 55 Insurance (health, auto, etc.), 56 Other
 * Expenses, 57 Total Expenses -- and above them 45 Rent or Mortgage Payment, 46
 * Electric Service, 47 Phone, 48 Fuel (heat and/or gas), 49 Food, which the
 * dictionary already had right. Field 35 is confirmed to pair with the LEFT
 * column blank at baseline y=137.80, whose caption band is the italic
 * SSDI/Disability line, and not with the Self-Employment/Business Income line
 * above it. The Vehicles headings are confirmed by x-position.
 *
 * MonthlyTotal and 41 are left exactly as committed, and the ambiguity is now
 * measured rather than asserted. Two geometric rules disagree there and only
 * there. By the widget's own vertical band, the printed label at MonthlyTotal's
 * height is "(other than wages)" (baseline 103.642, inside its band
 * 92.56..106.56) and at 41's height is "Total Monthly Income" (91.192, inside
 * 79.91..93.91) -- one row above what the dictionary says. By the blank inside
 * the widget, the run at 95.640 is 4.448pt above "Total Monthly Income" and
 * 8.002pt below "(other than wages)", and the run at 83.400 is 4.448pt above
 * "Total Income in the past 12 months" and 7.792pt below "Total Monthly Income"
 * -- which is what the dictionary says, and what the widget's own name
 * MonthlyTotal says. Two of three signals agree with the committed pairing and
 * the third does not, so nothing is moved and the disagreement is recorded.
 * NOTE, against the record above this line: the earlier reading of "5.4 and 5.3
 * points below the label above it and 6.6 and 6.8 above the label below" was
 * taken from groupIntoLines' line y, which sits about 1.0-1.4pt under the
 * items' own baselines and reverses which gap is which. The item baselines give
 * 8.002/4.448 and 7.792/4.448. The conclusion is unchanged; the numbers are not.
 */
const MEASURED_CAPTION_CORRECTIONS = {
  "600-00228": {
    35: {
      captionUnextractable: "the italic run under Other Income is encoded through a broken cmap and extracts as mojibake, so no caption text can be matched against the content stream at this widget's coordinates",
      label: "the italic line under Other Income: including Social Security Disability Income (“SSDI”), Disability Insurance & Social Security retirement benefits",
      what: "any Social Security Disability Income (SSDI), Disability Insurance or Social Security retirement benefits you receive each month"
    },
    50: { caption: "Clothing", captionAt: { page: 1, y: 139 }, captionInRowBand: true, what: "your monthly clothing cost" },
    51: { caption: "Medical", captionAt: { page: 1, y: 127 }, captionInRowBand: true, what: "your monthly medical cost" },
    52: { caption: "Child Support", label: "Child Support (monthly expense)", captionAt: { page: 1, y: 115 }, captionInRowBand: true, what: "child support you pay each month, if any" },
    53: { caption: "Auto Loan Payment", captionAt: { page: 1, y: 102 }, captionInRowBand: true, what: "your monthly car loan payment, if any" },
    54: { caption: "Property Taxes", captionAt: { page: 1, y: 90 }, captionInRowBand: true, what: "your monthly property tax, if you pay it" },
    55: { caption: "Insurance (health, auto, etc.)", captionAt: { page: 1, y: 78 }, captionInRowBand: true, what: "your monthly insurance cost" },
    56: { caption: "Other Expenses", captionAt: { page: 1, y: 65 }, captionInRowBand: true, what: "any other monthly expense" },
    57: { caption: "Total Expenses", captionAt: { page: 1, y: 53 }, captionInRowBand: true, what: "the total of your monthly expenses" },
    74: { label: "Vehicles Make, Model, Year", what: "the make, model and year of a vehicle you own, if you own one" },
    75: { label: "Vehicles Fair Market Value (FMV)", what: "that vehicle's fair market value" },
    78: { label: "Vehicles Make, Model, Year", what: "a second vehicle's make, model and year, if you own one" },
    79: { label: "Vehicles Fair Market Value (FMV)", what: "that second vehicle's fair market value" },
    82: { label: "Vehicles Make, Model, Year", what: "a third vehicle's make, model and year, if you own one" },
    83: { label: "Vehicles Fair Market Value (FMV)", what: "that third vehicle's fair market value" },
    86: { label: "Vehicles Make, Model, Year", what: "a fourth vehicle's make, model and year, if you own one" },
    87: { label: "Vehicles Fair Market Value (FMV)", what: "that fourth vehicle's fair market value" }
  }
};

/*
 * FIX130. The row locator, resolved by geometry against the printed page.
 *
 * A table on these forms is a set of widgets that share one printed heading, so
 * a table is keyed by the coordinate that heading was read at. Inside it the
 * ROWS are read off the widgets' own rectangles -- distinct y bands, top of the
 * page first -- and never off the AcroForm field name, which on these forms is
 * a bare ordinal that agrees with the printed row number nowhere.
 *
 * If the form prints a row number beside every band -- a line whose whole text
 * is "N.", at that band's own height, to the left of the band's leftmost widget
 * -- those printed numbers are used and the label says they are printed. That
 * is true of exactly one table in this packet: the question-1 charge table on
 * 200-00130, which prints 1., 2. and 3. Everywhere else the form prints no row
 * numbers, and the locator is the row's position down the table, which the
 * participant can see, with the label saying the form prints no numbers there.
 */
const ORDINALS = ["first", "second", "third", "fourth", "fifth", "sixth", "seventh", "eighth"];

/*
 * FIX130. The row locator, resolved by geometry against the printed page.
 *
 * A locator is attached only where one is NEEDED: where the same printed words
 * appear beside more than one blank on one page of one form. Those blanks are
 * ordered by their own rectangles, top of the page first -- never by the
 * AcroForm field name, which on these forms is a bare ordinal that agrees with
 * the printed row number nowhere.
 *
 * If the form prints a row number beside every one of them -- a line whose
 * whole text is "N.", at that blank's own height, to the LEFT of it -- those
 * printed numbers are used and the label says they are printed. That is true of
 * exactly one table in this packet: the question-1 charge table on 200-00130,
 * which prints 1., 2. and 3. Everywhere else the form prints no row numbers and
 * the locator is the blank's position down the page, which the participant can
 * see, with the label saying the form prints no numbers there.
 */
function rowLocatorsFor(census) {
  const byLabel = new Map();
  for (const r of census.rows) {
    const key = `p${r.page}|${r.effectiveLabel}`;
    byLabel.set(key, [...(byLabel.get(key) ?? []), r]);
  }
  const locator = new Map(); // `${name}@${page}` -> locator string
  for (const group of byLabel.values()) {
    if (group.length < 2) continue;
    const ordered = [...group].sort((a, b) => b.rect.y - a.rect.y);
    const lines = (census.pageText.find((p) => p.page === ordered[0].page)?.lines ?? []);
    const printed = ordered.map((r) => {
      const hit = lines.find((l) => /^\d+\.$/.test(String(l.text).trim())
        && l.y >= r.rect.y - 2 && l.y <= r.rect.y + 8
        && typeof l.x === "number" && l.x < r.rect.x - 4);
      return hit ? Number(String(hit.text).trim().replace(".", "")) : null;
    });
    const everyOneNumbered = printed.every((n) => n !== null)
      && printed.every((n, i) => i === 0 || n > printed[i - 1]);
    ordered.forEach((r, i) => {
      locator.set(`${r.name}@${r.page}`, everyOneNumbered
        ? `row ${printed[i]} as printed on the form`
        : `${ORDINALS[i] ?? `row ${i + 1}`} row (the form prints no row numbers here)`);
    });
  }
  return locator;
}

/*
 * FIX130. The disclosure label a participant reads: the words the form prints
 * beside that blank, and where two blanks carry the same words, which row --
 * never the AcroForm field name.
 */
function disclosureLabelsFor(censuses) {
  const labels = new Map(); // `${form}|${name}|${page}` -> label
  const seen = new Map();
  for (const { source, census } of censuses) {
    const locator = rowLocatorsFor(census);
    for (const r of census.rows) {
      const where = locator.get(`${r.name}@${r.page}`);
      const label = where ? `${r.effectiveLabel} — ${where}` : r.effectiveLabel;
      labels.set(`${source.formNumber}|${r.name}|${r.page}`, label);
      const uniquenessKey = `${source.formNumber}|p${r.page}|${label}`;
      seen.set(uniquenessKey, [...(seen.get(uniquenessKey) ?? []), r.name]);
    }
  }
  /*
   * Two blanks on one page of one form may not carry the same identifier. This
   * is the failure the appended field name was papering over -- and papering
   * over badly, since 200-00130 fields 26, 27, 30 and 31 each name two blanks.
   */
  const collisions = [...seen.entries()].filter(([, names]) => names.length > 1)
    .map(([key, names]) => ({ key, widgets: names }));
  assert.equal(collisions.length, 0,
    `two blanks on one page would be disclosed under the same label: ${JSON.stringify(collisions.slice(0, 4))}`);
  return labels;
}

/* ---- render one document -------------------------------------------------- */
async function renderDocument(source, census, fixtureName, familyId) {
  const facts = FIXTURES[fixtureName];
  const writable = census.rows.filter((r) => r.policy === "write");
  const explicitMappings = Object.fromEntries(writable.map((r) => [r.name, r.fact]));
  const unwritableFields = census.rows.filter((r) => r.policy !== "write").map((r) => ({ field: r.name }));
  const { bytes, report } = await finalizeOfficialForm({
    sourceBytes: source.bytes,
    expectedSha256: source.sha256,
    census: census.rows.map((r) => ({
      name: r.name, type: r.type, effectiveLabel: r.effectiveLabel, regionHeading: r.regionHeading,
      // The fitter needs the widget's own rectangle. Without it every value is
      // refused as unfittable and the packet renders empty while reporting
      // success -- which is exactly what the first run of this builder did.
      widgets: [{ page: r.page, rect: r.rect }],
      multiline: r.multiline === true,
      maxLength: r.maxLength ?? null
    })),
    facts,
    explicitMappings,
    unwritableFields,
    documentTextLines: census.pageText.flatMap((p) => p.lines.map((l) => l.text)),
    title: FORM_FIELDS[source.formNumber].title,
    /*
     * Try the declared minimum font size before refusing a value.
     *
     * VF11 and VF12 read the boundary artifact's bytes and found one mapped
     * known prefill missing: participant.email at 200-00132 field 34i, whose
     * flattened appearance is present and empty while the canonical fixture
     * carries the address. The cause is in the shared fitter, not here: its
     * ladder starts at 10.96 on this 12.96pt-high widget and steps by 0.5, so
     * the last rung is 6.46 and the declared minimum of 6.0 is never tried. The
     * boundary email needs 165.6pt at 6.0 in a 170.7pt box -- it fits, with five
     * points to spare, and was refused anyway.
     *
     * The write is the repair. The email is a held fact, mapped in both fixtures
     * and written on 200-00130 and 600-00228 in the same artifact; carrying it
     * to the participant as something to supply would be reclassifying a fact
     * the platform holds, which is the opposite of the fix.
     */
    evaluateDeclaredMinimumSize: true,
    /*
     * FIX75. The fitted size is written onto the WIDGET as well as the field.
     *
     * VF05 read the delivered boundary bytes and found one defect visible on a
     * delivered page: 200-00132 field 34d, packet page 3, the DEFENDANT's
     * "Printed Name" in the stipulation's signature block. Its flattened
     * appearance draws the whole of "Maria-Alejandra O’Shaughnessy-Whitfield"
     * at /Helvetica 11 -- 203.88pt of text -- inside its own clip path, which
     * stops at 173.743pt. The last eight characters never reach the paper, and
     * nothing sees it: pdftotext returns the whole string because the Tj
     * operator carries it, actual-writes.json correctly reports no glyph
     * outside a measured write box because the clip removed them, and all nine
     * counters are zero.
     *
     * The cause is the one alignWidgetFontSizeToFit exists for, and it is
     * measurable in the pinned source. applyFitToTextField sets the size on the
     * FIELD's /DA, and pdf-lib's text appearance provider prefers the WIDGET's
     * /DA size where the widget has one of its own. On 200-00132 exactly one
     * written field is affected. 34e, 34f and 34h each carry
     * `/Calibri 11 Tf 0 g`, but their widget annotation IS the field
     * dictionary -- the ordinary merged single-widget shape -- so writing the
     * field's size writes the widget's and the fit reaches the paper. 34i
     * carries a separate widget with no /DA of its own, so it follows the field
     * too, which is why its boundary email drew at the 6pt the fitter measured.
     * 34d is the one field on this form whose widget is a SEPARATE dictionary
     * carrying its own `/Calibri 11 Tf 0 g`: the field was set to the fit and
     * the widget kept 11, so the appearance drew 11. The fit for the boundary
     * name is 8.96pt -- four rungs down from the 10.96 this 12.96pt-high box
     * starts at, on a ladder whose floor is MIN_READABLE_FONT_SIZE 6 -- and the
     * report said "shrunk" while the bytes drew 11. A report true about the fit
     * and false about the ink is the worst shape a report can take, which is
     * the finalizer's own reasoning for the flag.
     *
     * The alignment rewrites only the size token inside each widget's existing
     * /DA and leaves its font resource and colour operators alone, so a value
     * whose fit is already its widget's declared size is a no-op. No size is
     * hand-set here: every size is the one the shared fitter measured against
     * that widget's own rectangle, so the canonical name is not made smaller
     * than it needs to be. fitTextPerWidget is NOT the repair for this: every
     * field this host declares carries exactly one widget, so per-widget
     * fitting measures the identical rectangle and changes nothing.
     *
     * Opt-in at this one call site, for the five families this host builds. No
     * other family's bytes move because these five pass it.
     */
    alignWidgetFontSizeToFit: true,
    /* FIX58. The same shared-flattening defect FIX50 measured on the sibling
     * vt_seal_nonconviction-set, and the same repair, taken here for the five
     * families this host builds. 200-00130 ships 12 check-box widgets and
     * 200-00132 ships 2, and every one of them is at /AS /Off with /Yes as the
     * only state in /AP /N. sanitizeAndFlatten calls updateFieldAppearances()
     * before flatten(), pdf-lib regenerates an appearance for exactly that
     * condition, and its default provider paints a stroked square -- so all 14
     * unticked boxes were delivered inside a border the court's paper does not
     * print and no conforming viewer paints (ISO 32000-1 12.5.5). VF08 measured
     * 28 such widget readings per family across the two fixtures and proved by a
     * zero-write baseline over the pinned bytes that the ink is the sanitizer's,
     * not this family's.
     *
     * Opting in supplies the missing /Off state as an EMPTY appearance, so
     * nothing is synthesized and nothing is flattened there. 600-00228 ships its
     * own /Off appearance for all six of its boxes and this does not reach them:
     * they are the court's own and stay, which is what RI-OFF-APPEARANCE
     * settles. No write, no mark and no text is touched. */
    suppressSynthesizedAppearances: true,
    /* FIX67. 600-00228 field 15 ships an appearance whose /BBox is [0 0 18 18]
     * against a /Rect of 14.4 x 14.4. ISO 32000-1 12.5.5 requires the
     * transformed BBox to be fitted to the /Rect -- here a scale of 0.8 -- and
     * pdf-lib's flatten() emits a translation only, so the fit never happens
     * and a 17pt stroked square is stamped where the Judiciary's form draws a
     * 13.6pt one, 672 dark pixels at 300 dpi outside the widget's own /Rect in
     * both fixtures (VF02's sweep, VF04's re-read). FIX61 put the repair in the
     * shared flattening step as an opt-in and proved it on the sibling
     * vt_seal_nonconviction-set; this takes it here, at the one call site the
     * five families this host builds all share. Widgets already within
     * tolerance are untouched. This is the shared step's defect, not Vermont's;
     * the option is default-off and no other family's bytes move because these
     * five pass it. */
    fitAppearancesToRect: true,
    /*
     * FIX130. See PRESERVE_SOURCE_SELECTION_PAINT above for what was measured
     * and why. Gated per family so the two families this lane does not hold
     * rebuild byte-identically.
     */
    preserveUnwrittenSelectionBackgrounds: PRESERVE_SOURCE_SELECTION_PAINT.has(familyId)
  });
  if (process.env.VT_DEBUG_RENDER) {
    console.log(`-- ${source.formNumber} ${fixtureName}: written=${report.written.length} refused=${report.refused.length}`);
    const byReason = new Map();
    for (const r of report.refused) byReason.set(r.reason, [...(byReason.get(r.reason) ?? []), r.field]);
    for (const [reason, fields] of byReason) console.log(`   ${reason}: ${fields.slice(0, 8).join(", ")}${fields.length > 8 ? ` (+${fields.length - 8})` : ""}`);
  }
  return { bytes, report };
}

/* ---- byte proof: what actually landed on the paper ------------------------ */
async function byteProof(source, census, artifactBytes, report, fixtureName) {
  const tmp = path.join(ROOT, ".vt-byte-proof.pdf");
  fs.writeFileSync(tmp, artifactBytes);
  let widgets = [];
  try { widgets = await flattenedWidgets(tmp); } finally { fs.unlinkSync(tmp); }
  const written = new Map(report.written.map((w) => [w.field, w]));
  const actualWrites = [];
  for (const r of census.rows) {
    const w = written.get(r.name);
    if (!w) continue;
    const drawn = drawnAt(widgets, { page: r.page, rect: r.rect });
    actualWrites.push({
      field: r.name, factId: w.factId ?? r.fact, page: r.page, rect: r.rect,
      printedCaption: r.caption,
      drawnText: drawn.map((d) => d.text).filter(Boolean),
      expected: FIXTURES[fixtureName][r.fact] ?? null
    });
  }
  /*
   * Every fact the map says to write and the finalizer did not.
   *
   * This is the part VF11 and VF12 had to reconstruct from the bytes because the
   * family did not report it. The finalizer refused the boundary email and said
   * so in ITS report, but nothing carried that refusal into the family's own
   * record, so reports/actual-writes.json showed eight values for a document
   * carrying seven and the loss was invisible to every reader downstream.
   *
   * A write the map promised and the artifact does not carry is now stated here
   * by name, with the finalizer's reason. An empty list is the claim that
   * nothing was lost; a non-empty one is the defect, visible without opening a
   * PDF.
   */
  const refusedByField = new Map((report.refused ?? []).map((r) => [r.field, r]));
  const unfittableByField = new Map((report.unfittable ?? []).map((r) => [r.field, r]));
  const mappedWritesNotInTheBytes = [];
  for (const r of census.rows) {
    if (r.policy !== "write") continue;
    if (written.has(r.name)) continue;
    const refusal = refusedByField.get(r.name) ?? null;
    const unfittable = unfittableByField.get(r.name) ?? null;
    mappedWritesNotInTheBytes.push({
      field: r.name, factId: r.fact, page: r.page, rect: r.rect,
      printedCaption: r.caption,
      value: FIXTURES[fixtureName][r.fact] ?? null,
      reason: refusal?.reason ?? "the finalizer reported no value for this field and gave no reason",
      category: refusal?.category ?? null,
      requiredWidthAtMin: unfittable?.requiredWidthAtMin ?? null,
      requiredHeightAtMin: unfittable?.requiredHeightAtMin ?? null
    });
  }

  /*
   * FIX130. This number was the literal 0.
   *
   * The write proof published `nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: 0`
   * as a constant, for every fixture of every family this host builds, without
   * reading a glyph. A published zero where no measurement was made is a defect
   * class this factory has already recorded, and it is worse than a missing
   * field: a reader cannot tell it apart from a measured zero. The two sibling
   * Vermont hosts, vt_exp_decriminalized-set and vt_seal_nonconviction-set,
   * already measure it the way it is measured here.
   *
   * It reads the flattened appearances back out of the produced bytes and counts
   * the non-whitespace glyphs of every one that does not sit at a rectangle this
   * document's census measured. It is a measurement of the OUTPUT, not of the
   * intent, and it is free to come back non-zero.
   */
  const measured = census.rows.map((r) => ({ page: r.page, rect: r.rect }));
  let outside = 0;
  for (const w of widgets) {
    const at = measured.some((m) => m.page === w.page
      && Math.abs(w.x - m.rect.x) <= 2 && Math.abs(w.y - m.rect.y) <= 2);
    if (!at) outside += String(w.text ?? "").replace(/\s+/g, "").length;
  }

  const appearances = widgets.length;
  return { actualWrites, appearances, mappedWritesNotInTheBytes, outside };
}

/* ---- the one exported entry point ---------------------------------------- */
export async function runFamilyById(familyId, argv = process.argv.slice(2)) {
  const config = FAMILY_CONFIGS[familyId];
  assert.ok(config, `unknown family ${familyId}`);
  const checkOnly = argv.includes("--check");
  // Rasterizing twelve pages through two Chromium renders each is minutes of
  // wall clock. --no-raster leaves it out so the fill can be iterated on; a
  // build that skips it says so in its own status rather than claiming rasters.
  const skipRaster = argv.includes("--no-raster");
  const { resolved, failures } = resolveSources(familyId);

  // The ONLY terminal blocker this builder recognises: a source that does not
  // bind by exact SHA-256. Everything else below is the assigned build work.
  if (failures.length > 0) {
    return {
      familyId, status: "BLOCKED_SOURCE",
      failedSourceIdentities: failures,
      why: "a source did not bind by exact SHA-256, so nothing may be rendered from it"
    };
  }

  // The authority behind the fee and service sentences, re-hashed before either
  // is written. A drifted revision refuses the build.
  const filingInstructions = resolveFilingInstructions();

  const outDir = `${OVERLAY_ROOT}/${familyId.replace(/_/g, "-")}--official-pdf-fill`;
  const censuses = [];
  const printedCaptionLabels = PRINTED_CAPTION_DISCLOSURE_LABELS.has(familyId);
  for (const source of resolved) {
    const corrections = printedCaptionLabels ? (MEASURED_CAPTION_CORRECTIONS[source.formNumber] ?? null) : null;
    censuses.push({ source, census: await censusOf(source, corrections) });
  }

  const drift = censuses.flatMap((c) => c.census.captionDrift);
  if (process.env.VT_DUMP_DRIFT) { for (const d of drift) console.log(`${d.field}\tp${d.page} y=${d.y}\tCAPTION=${JSON.stringify(d.caption)}\tTHERE=${JSON.stringify(d.linesThere)}`); process.exit(0); }
  assert.equal(drift.length, 0, `a measured caption is no longer printed where the field map says: ${JSON.stringify(drift.slice(0, 3))}`);
  const offRow = censuses.flatMap((c) => c.census.captionOffItsRow.map((o) => ({ form: c.source.formNumber, ...o })));
  assert.equal(offRow.length, 0, `a caption this build discloses is not printed on its own widget's row: ${JSON.stringify(offRow.slice(0, 3))}`);
  const unmapped = censuses.flatMap((c) => c.census.unmapped.map((u) => ({ form: c.source.formNumber, ...u })));
  assert.equal(unmapped.length, 0, `${unmapped.length} widget(s) carry no measured caption: ${JSON.stringify(unmapped.slice(0, 5))}`);

  if (checkOnly) {
    return {
      familyId, status: "CHECK_ONLY",
      documents: censuses.map((c) => ({ formNumber: c.source.formNumber, fields: c.census.rows.length })),
      writes: censuses.reduce((n, c) => n + c.census.rows.filter((r) => r.policy === "write").length, 0),
      supply: censuses.reduce((n, c) => n + c.census.rows.filter((r) => r.policy === "supply").length, 0)
    };
  }

  fs.mkdirSync(path.join(ROOT, outDir, "fixtures"), { recursive: true });
  fs.mkdirSync(path.join(ROOT, outDir, "reports"), { recursive: true });
  fs.mkdirSync(path.join(ROOT, outDir, "raster"), { recursive: true });

  const maps = [];
  const artifacts = [];
  const writeProofs = [];
  const rasterPages = [];

  for (const fixtureName of ["canonical", "boundary"]) {
    const packet = await PDFDocument.create();
    stampDeterministic(packet);
    const pageManifest = [];
    for (const { source, census } of censuses) {
      const { bytes, report } = await renderDocument(source, census, fixtureName, familyId);
      const proof = await byteProof(source, census, bytes, report, fixtureName);
      writeProofs.push({
        fixture: fixtureName, formNumber: source.formNumber, sourceSha256: source.sha256,
        proofMethod: "flattened widget appearances read back at every measured /Rect of the finalized bytes",
        valuesReportedByFinalizer: report.written.length,
        flattenedWidgetAppearancesReadFromOutputBytes: proof.appearances,
        addedGlyphsReadFromOutputBytes: proof.actualWrites.reduce((n, w) => n + w.drawnText.join("").length, 0),
        nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: proof.outside,
        mappedWritesNotInTheBytes: proof.mappedWritesNotInTheBytes,
        actualWrites: proof.actualWrites
      });

      /*
       * A mapped write that never reached the paper is a build failure, not a
       * note. The previous build shipped one and reported success, so the
       * assertion is here rather than in a reader: the family refuses to write
       * artifacts it knows are missing a fact its own map promised.
       */
      assert.equal(proof.mappedWritesNotInTheBytes.length, 0,
        `${source.formNumber} ${fixtureName}: the map promises writes the artifact does not carry: ${JSON.stringify(proof.mappedWritesNotInTheBytes)}`);

      const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
      const copied = await packet.copyPages(doc, doc.getPageIndices());
      for (const [i, p] of copied.entries()) {
        packet.addPage(p);
        pageManifest.push({ packetPage: packet.getPageCount(), formNumber: source.formNumber, sourcePage: i + 1, sourceSha256: source.sha256 });
      }

      if (fixtureName === "canonical") {
        maps.push(fieldMapFor(source, census, report, config));
      }
    }
    const packetBytes = await packet.save({ useObjectStreams: false, updateMetadata: false });
    const file = `${outDir}/fixtures/${fixtureName}.pdf`;
    fs.writeFileSync(path.join(ROOT, file), packetBytes);
    artifacts.push({
      fixture: fixtureName, file,
      sha256: crypto.createHash("sha256").update(packetBytes).digest("hex"),
      byteLength: packetBytes.length, pageCount: packet.getPageCount(), pageManifest,
      documents: censuses.map((c) => c.source.formNumber)
    });

    // Page rasters, through the repository's calibrated Chromium implementation.
    const rasterDir = `${outDir}/raster/${fixtureName}`;
    fs.mkdirSync(path.join(ROOT, rasterDir), { recursive: true });
    for (let i = 0; skipRaster ? false : i < packet.getPageCount(); i += 1) {
      // `keep` is the STAGE DIRECTORY the renderer writes into, not a file.
      const stage = path.join(ROOT, rasterDir, `page-${String(i + 1).padStart(2, "0")}`);
      const render = await rasterizePageCalibrated({ file: path.join(ROOT, file), pageIndex: i, keep: stage });
      // The calibration copy and the two intermediate PDFs are working files;
      // only the render of the page as the court published it is evidence.
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
        engine: "chromium_calibrated_scripts_lib_pdf_page_raster",
        sha256: crypto.createHash("sha256").update(fs.readFileSync(png)).digest("hex")
      });
    }
  }

  const disclosureLabels = printedCaptionLabels ? disclosureLabelsFor(censuses) : null;
  writeArtifacts({ familyId, config, outDir, resolved, maps, artifacts, writeProofs, rasterPages, filingInstructions, disclosureLabels });
  return {
    familyId, status: "COMPLETED", directory: outDir,
    documents: resolved.map((r) => r.formNumber),
    writes: maps.reduce((n, m) => n + m.canonicalWrites.length, 0),
    requiredBeforeFiling: maps.reduce((n, m) => n + m.canonicalRefusals.filter((r) => r.requiredBeforeFiling).length, 0),
    rasterPages: rasterPages.length
  };
}

function fieldMapFor(source, census, report, config) {
  const writtenNames = new Set(report.written.map((w) => w.field));
  const canonicalWrites = [];
  const canonicalRefusals = [];
  const selectionControls = [];
  for (const r of census.rows) {
    const base = {
      field: r.name, page: r.page, rect: r.rect, rectBasis: r.rectBasis,
      printedLabel: r.caption, printedLine: r.caption,
      regionHeading: r.effectiveLabel, sectionHeading: null,
      effectiveLabel: r.effectiveLabel, captionReadAt: r.captionAt
    };
    if (r.policy === "write" && writtenNames.has(r.name)) {
      canonicalWrites.push({ ...base, factId: r.fact, kind: r.type, document: source.formNumber });
      continue;
    }
    if (r.isSelectionControl) {
      selectionControls.push({
        ...base, selectionId: r.name, kind: "selection_control", type: "checkbox",
        widgets: [{ page: r.page, rect: r.rect, rectBasis: r.rectBasis }],
        disposition: "explicit_refusal",
        reason: r.policy === "protect"
          ? "signature or date field; never prefilled by this build"
          : "a sworn assertion or legal election the route does not determine; only the participant may make it",
        category: r.policy === "protect" ? r.refusalClass : "participant_sworn_narrative_or_legal_election",
        completenessClass: r.policy === "protect" ? r.refusalClass : "participant_sworn_narrative_or_legal_election",
        class: r.policy === "protect" ? r.refusalClass : "participant_sworn_narrative_or_legal_election",
        requiredBeforeFiling: false, why: "only the participant may make this election"
      });
      continue;
    }
    if (r.policy === "protect") {
      canonicalRefusals.push({
        ...base, reason: "signature or date field; never prefilled by this build",
        category: r.refusalClass, completenessClass: r.refusalClass, class: r.refusalClass,
        requiredBeforeFiling: false, why: "the participant signs and dates this themselves at filing time"
      });
      continue;
    }
    // Everything else: a fact the filing needs and the platform does not hold.
    canonicalRefusals.push({
      ...base,
      reason: `the participant supplies this before filing: ${r.what}`,
      category: null, completenessClass: null, class: null,
      disposition: "REQUIRED_BEFORE_FILING",
      requiredBeforeFiling: true,
      identity: `${source.formNumber} field ${r.name}`,
      factId: null,
      routeDetermined: false,
      why: `the platform holds no value for this and the participant supplies it before filing: ${r.what}`,
      participantMustSupply: r.what
    });
  }
  return {
    formNumber: source.formNumber,
    documentPolicy: { mode: "participant", captionOnly: false, documentAcceptsFill: true, routeKey: config.routeKey },
    structuralClass: "acroform",
    explicitMappings: Object.fromEntries(census.rows.filter((r) => r.policy === "write").map((r) => [r.name, r.fact])),
    roleRefusals: [],
    selectionControls,
    canonicalWrites,
    canonicalRefusals,
    boundaryWrites: canonicalWrites,
    boundaryRefusals: canonicalRefusals
  };
}

function writeArtifacts({ familyId, config, outDir, resolved, maps, artifacts, writeProofs, rasterPages, filingInstructions, disclosureLabels = null }) {
  /*
   * FIX130. `${r.regionHeading} ${r.field}` -- the printed caption with the
   * AcroForm field name stuck on the end -- is what the participant page then
   * described as "the words printed beside the blank". Where this family has
   * opted in, the label is the printed caption plus a row locator resolved from
   * the source page's own geometry; where it has not, the committed composition
   * is left exactly as it was so that family's bytes do not move.
   */
  const labelOf = (formNumber, r) => (disclosureLabels
    ? (disclosureLabels.get(`${formNumber}|${r.field}|${r.page}`) ?? r.regionHeading)
    : `${r.regionHeading} ${r.field}`);
  /*
   * FIX130. Reading order. The committed list came out in AcroForm field-tree
   * order, so a page-2 blank sat between two page-1 blanks and a participant
   * working down it jumped back and forth across the form. Where this family
   * has opted in the items are ordered as the pages are read -- page, then down
   * the page, then across it -- from the widgets' own rectangles.
   */
  const inReadingOrder = (items) => {
    /*
     * The cells of one printed row do not share an exact y on these forms --
     * they differ by up to 1.6pt -- so ordering on the raw y interleaves the
     * columns of a row. Rows are clustered first, with the same 4pt tolerance
     * the row locator uses, and only then read left to right.
     */
    const bands = [];
    for (const r of [...items].sort((a, b) => a.page - b.page || b.rect.y - a.rect.y)) {
      const band = bands.find((b) => b.page === r.page && Math.abs(b.y - r.rect.y) <= 4);
      if (band) band.rows.push(r);
      else bands.push({ page: r.page, y: r.rect.y, rows: [r] });
    }
    return bands.flatMap((b) => [...b.rows].sort((x, y) => x.rect.x - y.rect.x));
  };
  const rbf = maps.flatMap((m) => (disclosureLabels
    ? inReadingOrder(m.canonicalRefusals.filter((r) => r.requiredBeforeFiling))
    : m.canonicalRefusals.filter((r) => r.requiredBeforeFiling))
    .map((r) => ({ document: m.formNumber, field: r.field, page: r.page, printedContext: r.printedLabel, disclosureLabel: labelOf(m.formNumber, r), identity: r.identity, why: r.why, participantMustSupply: r.participantMustSupply })));

  fs.writeFileSync(path.join(ROOT, outDir, "production-field-map.json"), `${JSON.stringify({
    schemaVersion: "rcap-official-form-field-map/v1-census-v1",
    familyId, routeKeys: [config.routeKey], routeSelectionId: config.routeSelectionId,
    captionBasis: "every printed caption in this map was read from the official form's own content stream at the widget's coordinates; captionReadAt records where, and the build refuses if a caption is no longer there",
    dispositionVocabulary: [SIGNATURE, COURT_OWNED, "participant_sworn_narrative_or_legal_election"],
    requiredBeforeFilingCount: rbf.length,
    requiredBeforeFiling: rbf,
    maps, generationAllowed: false, runtimeSelectable: false, commercialRoutesOpened: 0
  }, null, 2)}\n`);

  fs.writeFileSync(path.join(ROOT, outDir, "source-receipt.json"), `${JSON.stringify({
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
    commercialRoutesOpened: 0
  }, null, 2)}\n`);

  const guidanceTrack = registryTrack(config);
  /*
   * What the registry declares this packet set is made of, and how each part is
   * delivered. A component whose outputStrategy is process_guidance is not a
   * page of the assembled PDF and never was; it is the participant page, and
   * saying so is the difference between a component that is missing and one
   * that was delivered on a channel the record did not name.
   */
  const componentSet = guidanceTrack
    ? (guidanceTrack.packetSet.components ?? []).map((component) => ({
      componentId: component.componentId, role: component.role,
      requirement: component.requirement, order: component.order,
      outputStrategy: component.outputStrategy,
      officialFormId: component.officialFormId ?? null,
      delivered: true,
      deliveredAs: component.outputStrategy === "process_guidance"
        ? `${outDir}/participant-instructions.md`
        : `packet pages carrying ${component.officialFormId}`
    }))
    : null;
  if (componentSet) {
    for (const component of componentSet) {
      if (component.outputStrategy === "process_guidance") continue;
      assert.ok(resolved.some((r) => r.formNumber === component.officialFormId),
        `${component.componentId}: declared by the registry and not delivered`);
    }
  }

  fs.writeFileSync(path.join(ROOT, outDir, "reports/rendered-artifacts.json"), `${JSON.stringify({
    schemaVersion: "rcap-rendered-artifacts/v1", familyId, renderedFresh: true,
    ...(componentSet ? { componentSet } : {}),
    artifacts,
    packets: artifacts.map((a) => ({ fixture: a.fixture, documents: a.documents })),
    rasterEngine: "scripts/raster/pdf-page-raster.mjs (Chromium, calibrated)",
    rasterPages
  }, null, 2)}\n`);

  fs.writeFileSync(path.join(ROOT, outDir, "reports/actual-writes.json"), `${JSON.stringify({
    schemaVersion: "rcap-actual-writes-byte-proof/v1", familyId,
    derivedFromArtifactBytes: true,
    documents: writeProofs,
    artifacts: writeProofs.map((p) => ({
      fixture: p.fixture, formNumber: p.formNumber,
      valuesReportedByFinalizer: p.valuesReportedByFinalizer,
      addedGlyphsReadFromOutputBytes: p.addedGlyphsReadFromOutputBytes,
      flattenedWidgetAppearancesReadFromOutputBytes: p.flattenedWidgetAppearancesReadFromOutputBytes,
      nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: p.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes
    }))
  }, null, 2)}\n`);

  fs.writeFileSync(path.join(ROOT, outDir, "build-status.json"), `${JSON.stringify({
    schemaVersion: "rcap-family-build-status/v1", familyId,
    buildStatus: "state_built", reviewStatus: "qa_review_pending",
    builtBy: "scripts/build-census-v1-vt_seal_misdemeanor-set.mjs",
    rasterEngine: "chromium_calibrated", popplerUsed: false,
    commercialRoutesOpened: 0, productionTouched: false,
    grantsNothing: "A rendered packet is review evidence. It authorizes no fulfillment and opens no commercial route."
  }, null, 2)}\n`);

  fs.writeFileSync(path.join(ROOT, outDir, "build-findings.json"), `${JSON.stringify({
    schemaVersion: "rcap-family-build-findings/v1", familyId,
    findings: [
      {
        finding: "The three Vermont forms name their widgets with bare ordinals, so no caption can be inferred from a field name.",
        consequence: "Every caption in the field map was read off the page at the widget's coordinates and is re-checked on every build."
      },
      {
        finding: "600-00228 is a financial affidavit and the platform holds none of its figures.",
        consequence: `${rbf.length} blanks across the packet are required-before-filing and every one is named in participant-instructions.md.`
      },
      {
        finding: "200-00132 requires the State's Attorney's signature before the court will act on it.",
        consequence: "Those three fields are refused as court/prosecutor-owned and the instructions tell the participant the stipulation route needs the prosecutor's agreement."
      },
      ...(disclosureLabels ? [
        {
          finding: "Every requiredBeforeFiling label this family disclosed was the printed caption with the AcroForm field name appended, while the participant page twice said the column was the words the form prints. The appended numbers do not correspond to anything printed: 200-00130's question-1 charge table prints rows 1., 2. and 3., and the labels read 1, 4 and 7. Fields 26, 27, 30 and 31 each carry two widgets in two unrelated tables, so one identifier named two different blanks.",
          consequence: "The label is now the printed caption alone, plus a locator resolved from the source page's geometry where the same words are printed beside more than one blank: the printed row number where the form prints one, otherwise the row's position down the page. Every finished label is asserted unique within its form and page, and the two sentences describing the column now say what it is."
        },
        {
          finding: "Re-reading 600-00228 against the printed \"$______\" run inside each widget's own rectangle found the page-1 expenses column disclosed one row off from field 50 down: the blank beside the printed word Clothing was named as an unlabelled line, the blank beside Medical as Clothing, and so on to the blank beside Total Expenses, which was named Other Expenses. Field 35 was named Self-Employment/Business Income and is the blank on the italic line under Other Income, 24 points above it. The Vehicles heading extracts interleaved and had been split as \"Make, Model\" and \"Year / Fair Market Value\"; read by x-position the printed columns are \"Make, Model, Year\" and \"Fair Market Value (FMV)\".",
          consequence: "Seventeen captions on that form are corrected and each corrected caption is now asserted against the pinned bytes to be printed on its own widget's row, which is the check the captionAt test cannot make. MonthlyTotal and 41 are NOT moved: the bottom of the income column is typographically broken in the source and both nearest-baseline and the widget's own name agree with what was already recorded."
        }
      ] : [])
    ]
  }, null, 2)}\n`);

  fs.writeFileSync(path.join(ROOT, outDir, "participant-instructions.md"), instructionsMarkdown(familyId, config, resolved, rbf, filingInstructions, disclosureLabels !== null));

  fs.writeFileSync(path.join(ROOT, outDir, "approval-request.json"), `${JSON.stringify({
    schemaVersion: "rcap-family-approval-request/v1", familyId,
    requested: "visual review and counsel review", buildStatus: "state_built",
    approvedForLive: false, live: false, commercialRoutesOpened: 0
  }, null, 2)}\n`);
}

function instructionsMarkdown(familyId, config, resolved, rbf, filingInstructions, printedCaptionLabels = false) {
  const track = registryTrack(config);
  const byDoc = new Map();
  for (const item of rbf) byDoc.set(item.document, [...(byDoc.get(item.document) ?? []), item]);
  const out = [];
  out.push(`# Filing instructions — ${config.routeName}`, "");
  out.push("This packet is prepared for **" + config.routeName + "**.", "");
  /*
   * FIX130. This sentence and the numbered one below both describe the middle
   * column of the tables at the end of this page. They were true of neither
   * column the build actually printed, so where the labels are now the printed
   * words plus a row locator, the sentences say that, and where they are not,
   * they are left as committed.
   */
  out.push(printedCaptionLabels
    ? "The platform filled in what it knows about you: your name, your date of birth, your address, your phone, your email and your docket number. Everything else on these forms is yours to complete, and this page lists every one of them by the words the form prints beside the blank — and, where the same words are printed beside more than one blank, by which row of that table is meant."
    : "The platform filled in what it knows about you: your name, your date of birth, your address, your phone, your email and your docket number. Everything else on these forms is yours to complete, and this page lists every one of them by the words printed beside the blank.", "");
  /*
   * Where the packet goes.
   *
   * VF01 and VF02 failed filingDestination and VF03 passed it, on
   * byte-identical text -- the instructions carried the Superior Court unit
   * only as a blank to fill and never told the participant what to do with it.
   * Two readings of the same sentence is a missing standard, and the way to
   * satisfy both is to state the destination as a DIRECTION rather than as a
   * question. Nothing here is acquired: both forms print the court on their own
   * caption, which is why this is a repair and not a source obligation.
   */
  out.push("## Where you file this", "");
  out.push("File the completed packet with the **Vermont Superior Court, Criminal Division**, in the unit where your case was decided.", "");
  out.push("Both the petition (200-00130) and the stipulation (200-00132) print `SUPERIOR COURT CRIMINAL DIVISION` across the top of page 1, and the `Unit` box beside it is where that unit goes. If you do not know which unit decided your case, the docket number on your paperwork identifies it, and the clerk of any Superior Court unit can tell you from the docket number.", "");
  /*
   * The filing fee and the service rule.
   *
   * Both were open source obligations -- vt_seal_*::filing-fee-and-waiver-route
   * and ::service-recipient-and-method -- and VF11 and VF12 were right that a
   * packet lane may not infer either. It does not have to. The Vermont Judiciary
   * publishes both in its own filing instructions, form 200-00130A, "Filing a
   * Petition to Expunge or Seal a Criminal Record" (07/2025), which is held in
   * this repository and is re-hashed against the committed corpus index on
   * every build. The quotations below are read from that publication's bytes.
   *
   * The fee sentence states the rule the judiciary states. It does NOT decide
   * whether the participant's own conviction falls under it: that is a fact
   * about their docket, and the clerk reads it off the docket.
   */
  /*
   * Whether the fee applies is a property of the ROUTE, and of no other fact.
   * It is true on exactly one of the five families -- the one whose relief is
   * the sealing of a 23 V.S.A. Sec. 1201(a) conviction, which is the conviction
   * the Judiciary's quoted rule charges $90 to seal. It is never read off the
   * participant's age, and the four other families take the else branch below
   * and print exactly the bytes they printed before.
   */
  const feeApplies = config.registryGuidanceTrackId === "vt_seal_dui";
  const waiver = resolved.find((r) => r.formNumber === WAIVER_FORM.formNumber);
  const waiverRevision = waiver ? printedRevision(waiver.revision) : null;
  if (feeApplies) {
    /* The record names the waiver by the identity of a specific document, so
     * the packet may only name it if the bytes it delivers ARE that document.
     * Both are checked against the delivered component here rather than
     * asserted from the receipt, and either failing stops this family. */
    assert.ok(waiver, `${WAIVER_FORM.formNumber}: the fee-bearing route names the waiver but the component is not in this packet`);
    assert.equal(waiver.sha256, WAIVER_FORM.pinnedSha256,
      `${WAIVER_FORM.formNumber}: this route names the waiver by revision ${WAIVER_FORM.printedRevision} and the record pins `
      + `sha256 ${WAIVER_FORM.pinnedSha256}; the delivered component hashes to ${waiver.sha256}, so the packet would name a `
      + "document it does not deliver");
    assert.equal(waiverRevision, WAIVER_FORM.printedRevision,
      `${WAIVER_FORM.formNumber}: the delivered component is revision ${waiverRevision} and the record names `
      + `${WAIVER_FORM.printedRevision}`);
  }
  out.push("## What it costs, and how to ask for a waiver", "");
  out.push(`The Vermont Judiciary's own filing instructions (form ${VT_FILING_INSTRUCTIONS.formNumber}, *${VT_FILING_INSTRUCTIONS.title}*, ${VT_FILING_INSTRUCTIONS.revision}) state the fee rule:`, "");
  out.push("> There are no fees to file a petition to seal or expunge except for a $90 filing fee to seal convictions of violations of 23 V.S.A. Sec. 1201(a). If you are unable to pay this fee, you may complete and file an Application to Waive Filing fees.", "");
  if (feeApplies) {
    /*
     * FIX107, FEE_AND_WAIVER, and on this route only.
     *
     * The sentence this replaces was the conditional one -- "filing this
     * petition is free unless you are sealing a conviction under 23 V.S.A.
     * Sec. 1201(a)" -- and it sent the participant to the clerk to find out
     * whether their own case was the exception. On THIS route it is not an
     * exception to check: the route IS the sealing of a 23 V.S.A. Sec. 1201(a)
     * conviction, which is what the quoted rule above charges $90 for, so the
     * packet states the fee instead of asking the participant to discover it.
     *
     * The record is the owner-relayed research of 2026-09-06:
     * data/record-clearing/legal-decisions/2026-09-06-owner-relayed-research-four-holds.json,
     * carrying docs/rcap/grade-a/research/2026-09-06-packet-blocker-research-handoff.md
     * (sha256 8a5996fcf36a4e776aae643dac0444455ab8be9f712ec53f13c21c72842f75ad),
     * and the track registry's vt_seal_dui.rules.researchParticipantText.fee
     * holds the exact participant sentences printed below. It is research
     * relayed by the owner, not counsel approval.
     *
     * Two things the record is explicit about and this text obeys. The fee is
     * keyed to the RELIEF ROUTE and the offence, never to how old the
     * participant is today: the Judiciary's 25-or-older gloss has no anchor in
     * the current Sec. 7602 text, so no age condition is asserted here and the
     * separate under-25 route keeps its own no-fee treatment on its own family.
     * And the waiver is named by the identity of the actual form -- 600-00228,
     * revision 04/2026, the two-page application the Judiciary's own fee-waiver
     * page serves -- not by the 600-00229 the criminal-record webpage's prose
     * still prints, which is inconsistent prose about the same document and is
     * not carried.
     */
    out.push("So: **the filing fee for this DUI-sealing petition is $90.** 23 V.S.A. § 1201(a) is Vermont's driving-under-the-influence offence, and sealing a conviction of it is exactly what this packet asks the court to do, so the exception the rule above states is this route rather than something to check against your docket. **If you cannot afford the fee, file an Application to Waive Filing Fees and Service Costs with your petition. The judge decides whether to waive the fee; submitting the application does not mean it has been granted.**", "");
    out.push(`**That waiver is a form already in this packet.** ${waiver.formNumber}, the *${FORM_FIELDS[waiver.formNumber].title}*, revision ${waiverRevision}, is the "Application to Waive Filing fees" those instructions name; it is the application the Judiciary's own fee-waiver page serves. It is included here and filled with what the platform knows about you; the financial figures it asks for are listed below and are yours to supply. **It is not notarised.** It carries its own declaration and you sign under that declaration - there is no notary block on it and none is needed.`, "");
  } else {
    out.push("So: **filing this petition is free unless you are sealing a conviction under 23 V.S.A. § 1201(a), in which case the fee is $90.** That section is Vermont's driving-under-the-influence offence. Whether your own conviction is one is a fact about your docket rather than about this packet, and the clerk of the unit above will tell you from the docket number.", "");
    out.push("**The waiver is a form already in this packet.** 600-00228, the *Application to Waive Filing Fees and Service Costs*, is the \"Application to Waive Filing fees\" those instructions name. It is included here and filled with what the platform knows about you; the financial figures it asks for are listed below and are yours to supply.", "");
  }
  out.push("## Who must receive a copy, and how", "");
  out.push("**You do not serve the petition yourself. The court does.** The same judiciary instructions state:", "");
  out.push("> Once you file your petition, the court will provide a copy to the prosecutor who brough the criminal case. If your petition is already stipulated (or agreed to) by the prosecutor then the court will skip this step.", "");
  out.push("So the recipient is **the prosecutor who brought the criminal case**, and the method is **the court providing them a copy once you have filed**. The prosecutor is then entitled to file a response. If they agree with your request your petition may be granted without a hearing; if they oppose it the court will schedule one, and you must attend any hearing scheduled in your case, because failing to attend could result in your petition being dismissed.", "");
  out.push("The State\u2019s Attorney\u2019s signature on the stipulation (200-00132) is not service and does not substitute for it. It is the prosecutor agreeing to the sealing in advance, which is what lets the court skip the step above.", "");
  if (track) {
    /*
     * FIX04. The sentence above ends "...if they oppose it the court will
     * schedule one, and you must attend any hearing scheduled in your case".
     * The committed track registry records "The prosecutor opposes the
     * petition, or the court schedules a hearing" as a point where self-help
     * ENDS, so on the one stop condition this packet reached, it was telling
     * the participant to walk into it alone. The hearing date is real and is
     * not talked away; what is added is that this is the point to get help.
     */
    out.push("**A scheduled hearing is where this packet's self-help ends.** The committed track registry records the prosecutor opposing the petition, or the court scheduling a hearing, as the point to get a lawyer or a legal-aid office rather than to press on alone. The hearing date stands either way, so start looking for help the day you learn of one.", "");
  }
  out.push("## What you must do before you file", "");
  out.push(printedCaptionLabels
    ? "1. **Fill in every item listed below.** Each one names the form, the page and the printed words next to the blank, and where those same words are printed next to more than one blank it says which row of the table is meant."
    : "1. **Fill in every item listed below.** Each one names the form, the page and the printed words next to the blank.");
  out.push("2. **Sign and date each form yourself.** The platform never signs for you and never dates a signature. Blank signature and date lines are deliberate.");
  out.push("3. **Get the State's Attorney to sign the stipulation (200-00132).** The court cannot act on a stipulation the prosecutor has not agreed to. If the State's Attorney will not sign, file the petition (200-00130) on its own and ask the court to set a hearing.");
  /* FIX107. Step 4 read "only if there is a fee AND you cannot pay it", with
   * "for most routes there is no fee to waive" behind it. On the one route
   * where the fee is not conditional, that told the participant to go and find
   * out something the packet already knows, and pointed them away from the
   * waiver as probably unnecessary. It now reads for the route it is on. The
   * other four families keep their sentence unchanged. */
  if (feeApplies) {
    out.push(`4. **There IS a fee on this route: $90. File the fee waiver (${WAIVER_FORM.formNumber}) if you cannot pay it.** Read *What it costs* above first. The waiver does not remove the fee by itself - the judge decides - so file it together with the petition rather than waiting, and be ready to pay if it is refused. If you receive public assistance you may stop after Section 1 of ${WAIVER_FORM.formNumber} and go straight to the signature block. You sign it under its own declaration; it is not notarised.`);
  } else {
    out.push("4. **File the fee waiver (600-00228) only if there is a fee AND you cannot pay it.** Read *What it costs* above first: for most routes there is no fee to waive, and filing a waiver you do not need is wasted effort rather than a safeguard. If the fee does apply to you and you cannot pay it, complete 600-00228 - and if you receive public assistance you may stop after Section 1 and go straight to the signature block.");
  }
  out.push("");
  if (track) {
    /*
     * FIX04, REQUIRED_BEFORE_FILING. The four steps above are all about
     * completing and signing paper. The committed track registry holds, for
     * THIS track, four waiting periods and four exclusions keyed to 13 V.S.A.
     * §§ 7601, 7602, 7604 and 7605 -- this route's own sections, so A3's
     * read-across guard is satisfied -- and the packet carried none of them. A
     * participant with unpaid restitution on an unrelated conviction, a pending
     * charge, a conditional pardon, or six years since completing their
     * sentence was walked through three forms and sent to the counter. Printed
     * verbatim: these are conditions on relief, and a paraphrase of a condition
     * is this build's sentence rather than the repository's.
     */
    out.push("## What has to be true before this petition can succeed", "");
    out.push("Completing the forms is not the same as qualifying. The committed track registry holds these conditions for this route, in its own words. Check each one against your own case before you file:", "");
    for (const period of track.waitingPeriods) {
      out.push(`- **${String(period.condition).replace(/\s*$/, "")}.** ${String(period.duration).replace(/\s*$/, "")}`);
    }
    out.push("");
    out.push("And these are the exclusions the registry records for this route. If one of them describes your case, this petition is not the route:", "");
    for (const exclusion of track.exclusions) out.push(`- ${String(exclusion).replace(/\s*$/, "")}`);
    out.push("");
    /*
     * FIX75. This sentence is ABOUT THE PARDON TRACK'S first exclusion -- a
     * conditional pardon under § 7601(4)(B)(iv) -- and the other four tracks’
     * first exclusions are different things entirely (a listed crime, a felony
     * off the § 7601(4)(B) list, a commercial licence, a mixed record).
     * Printing it for them would assert of their exclusion list something the
     * registry does not say about it, so it stays where it belongs. The pardon
     * family's own text is unchanged.
     */
    if (config.registryGuidanceTrackId === "vt_seal_pardon") {
      out.push("The first exclusion is this family's own: this packet is built for a pardoned conviction, and § 7601(4)(B)(iv) reaches an **unconditional** pardon only. If your pardon carried conditions, it does not open this route.", "");
    }
  }
  out.push("## The items you must supply", "");
  for (const [doc, items] of byDoc) {
    const title = FORM_FIELDS[doc]?.title ?? doc;
    out.push(`### ${doc} — ${title}`, "");
    out.push("| Page | The blank on the form | What to write |", "| --- | --- | --- |");
    for (const i of items) out.push(`| ${i.page} | ${i.disclosureLabel} | ${i.participantMustSupply} |`);
    out.push("");
  }
  out.push("## Things the platform deliberately left blank", "");
  out.push("- **Your signature and the date you sign.** A signature is yours alone, and a date written before you sign would be false.");
  out.push("- **The State's Attorney's signature, date and printed name.** Those belong to the prosecutor.");
  out.push("- **The court's order on page 2 of the stipulation.** The judge completes it.");
  out.push("- **Every checkbox.** Each one is a statement about your own record or a choice only you can make. Read them and tick the ones that are true for you.");
  out.push("");
  if (track) {
    /*
     * FIX04, SELF_HELP_STOP. Ten conditions held for this track, none carried,
     * and no stop section of any kind -- the closing "What this packet is not"
     * is a disclaimer about the packet, which is a different thing from a
     * statement about the participant's own case. Printed verbatim, and before
     * the disclaimer rather than inside it.
     */
    out.push("## When to stop and get a lawyer", "");
    out.push("The committed track registry records these as the points where self-help ends on this route, in its own words. If any of them describes your case, stop here and take it to a lawyer or a legal-aid office rather than filing:", "");
    for (const condition of track.selfHelpStopConditions) out.push(`- ${String(condition).replace(/\s*$/, "")}`);
    out.push("");
    /*
     * FIX75. Same reason as the exclusion note above: this describes the
     * PARDON track's tenth stop condition, which is the only one of the five
     * that records an unresolved clock. The other four tracks end on their own
     * conditions and this sentence would be false of them.
     */
    if (config.registryGuidanceTrackId === "vt_seal_pardon") {
      out.push("The last of these is an open question rather than a rule, and the registry says so: for a pardoned **misdemeanour**, whether the three-year or the seven-year clock applies is something the statute does not resolve. This packet does not resolve it either, and you should not read the seven-year figure above as a settled answer for a misdemeanour.", "");
    }
  }

  out.push("## What this packet is not", "");
  out.push("This is a prepared set of official Vermont forms. It is not legal advice, it is not filed for you, and it does not decide whether the court will grant sealing.");
  out.push("");
  out.push("## Where the fee and service directions come from", "");
  out.push(`Both are quoted from **${filingInstructions.formNumber}**, *${filingInstructions.title}* (${filingInstructions.revision}), published by the ${filingInstructions.issuer} and held in this repository; SHA-256 \`${filingInstructions.sha256}\`, ${filingInstructions.verifiedBy}. Nothing about the fee or about service is inferred here.`);
  out.push("");
  out.push(`_Route: ${config.routeKey}_`);
  return `${out.join("\n")}\n`;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(thisFile)) {
  const familyId = process.argv.find((a) => a.startsWith("vt_")) ?? "vt_seal_misdemeanor-set";
  runFamilyById(familyId).then((r) => { console.log(JSON.stringify(r, null, 2)); })
    .catch((e) => { console.error(e); process.exit(1); });
}
