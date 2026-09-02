#!/usr/bin/env node
/**
 * The Vermont decriminalized-conduct expungement packet family builder.
 *
 *   node scripts/build-census-v1-vt_exp_decriminalized-set.mjs [--check] [--no-raster]
 *
 * One family, three official Vermont forms, four components:
 *
 *   200-00129   petition                        Petition to Expunge Criminal History
 *   200-00132A  stipulation_and_proposed_order  Stipulation to Expunge + Order
 *   600-00228   fee_waiver_application          Application to Waive Filing Fees and Service Costs
 *   (composed)  filing_and_expectation_instructions
 *
 * WHERE THE CAPTIONS COME FROM, AND WHY IT IS DIFFERENT HERE
 *
 * The Virginia families in this worker's PF01 carry a hand-transcribed caption
 * per widget and a build that refuses if the caption is no longer printed where
 * the map says. That is two independent guards on one fact. This family carries
 * ONE: every caption is READ OUT OF THE BINARY at build time, at the widget's
 * own coordinates, and `captionReadAt` records the y it was read from.
 *
 * The trade is deliberate and it is not a weakening of the source gate. What a
 * transcribed caption adds is a second signal that the FORM changed; the
 * exact-SHA-256 source binding already fails the family closed on any change to
 * the form, down to a byte. What derivation adds is that the caption a
 * participant reads is the text actually printed beside their blank, rather than
 * a transcription of it -- and on these three forms, whose widgets are named
 * "13a", "34g" and "MonthlyTotal", a transcription is where the error would be.
 *
 * What is NOT derived, and could not be, is what each blank IS. Every widget
 * carries an explicit policy below. A field with no policy entry stops the
 * build rather than defaulting to anything.
 *
 * 200-00129 and 200-00132A are the expungement counterparts of the sealing
 * forms 200-00130 and 200-00132, which this repository already carries a
 * verified field map for. Their widget names are the same, so the policy
 * assignments are the same assignments, restated here against the expungement
 * binaries and their own coordinates rather than shared across a lane boundary.
 * 600-00228 is the same form in both packets and its policy is unchanged.
 *
 * Rasterization goes through scripts/raster/pdf-page-raster.mjs (Chromium,
 * calibrated). Never Poppler.
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
import { rasterizePageCalibrated } from "./raster/pdf-page-raster.mjs";
import { classifyField, classifyBlank, rowKeyOf, PASS_COUNTERS, BLANK_DISPOSITIONS } from "./rcap-packet-completeness/completeness-contract.mjs";
import { stampDeterministic } from "./rcap-official-forms/rcap-deterministic-pdf-date.mjs";

const thisFile = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(thisFile), "..");
process.chdir(ROOT);
const require = createRequire(import.meta.url);
const { PDFDocument, StandardFonts, rgb } = require("pdf-lib");

const CORPUS_INDEX = "data/rcap-all50/local-source-corpus-index.json";
const OVERLAY_ROOT = "data/rcap-all50/overlays/census-v1/vt";
const FIXED_DATE = "2026-01-01T00:00:00.000Z";

function corpusRoot() {
  const configured = process.env.MASTER_LIBRARY_SOURCE_DIR
    ?? "private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1";
  assert.ok(fs.existsSync(configured), `the Master Library is not mounted at ${configured}`);
  return configured;
}

const SIGNATURE = "signature_or_date_participant_completion";
const COURT_OWNED = "court_prosecutor_clerk_or_agency_owned";
const ELECTION_CLASS = "participant_sworn_narrative_or_legal_election";

const WRITE = (fact) => ({ policy: "write", fact });
const SUPPLY = (what) => ({ policy: "supply", what });
const PROTECT = (why) => ({ policy: "protect", refusalClass: why });
const ELECTION = () => ({ policy: "election" });

const COMPONENTS = ["petition", "stipulation_and_proposed_order", "fee_waiver_application", "filing_and_expectation_instructions"];
const DOCUMENT_OF_COMPONENT = {
  petition: "200-00129",
  stipulation_and_proposed_order: "200-00132A",
  fee_waiver_application: "600-00228",
  filing_and_expectation_instructions: "filing_and_expectation_instructions"
};

/* 200-00129 prints its signature block in a different order from 200-00130:
 * 42 is the street address, 39 the city/state/zip, 40 the phone and 41 the email.
 * The finalizer caught the mismatch as explicit_mapping_conflicts_with_field_name
 * rather than writing a phone number onto an address line. */
const POLICY_200_00129 = {
  "Unit": { ...SUPPLY("the Superior Court unit (county) where the case was decided"), label: "Unit (Superior Court unit)" },
  "Docket Number": { ...WRITE("matter.case_number"), label: "Case No. (docket number)" },
  "Defendant": { ...WRITE("participant.full_legal_name"), label: "In RE: Defendant" },
  "DOB": { ...WRITE("participant.date_of_birth"), label: "DOB" },
  "1": { ...SUPPLY("the description of the first offence you are asking the court to expunge"), label: "Description of Offense" },
  "2": { ...SUPPLY("the year of the first offence"), label: "Year" },
  "3": { ...SUPPLY("the docket number of the first offence, if it has one"), label: "Docket Number (If Any)" },
  "4": { ...SUPPLY("the description of a second offence from the same incident, if there is one"), label: "Description of Offense" },
  "5": { ...SUPPLY("the year of the second offence"), label: "Year" },
  "6": { ...SUPPLY("the docket number of the second offence"), label: "Docket Number (If Any)" },
  "7": { ...SUPPLY("the description of a third offence from the same incident, if there is one"), label: "Description of Offense" },
  "8": { ...SUPPLY("the year of the third offence"), label: "Year" },
  "9": { ...SUPPLY("the docket number of the third offence"), label: "Docket Number (If Any)" },
  "10": { ...ELECTION(), label: "I was convicted of the offenses." },
  "11": { ...SUPPLY("the date you were convicted, from your docket sheet or judgment order"), label: "a. Date of conviction:" },
  "12": { ...ELECTION(), label: "b. I completed all of the conditions of my probation:" },
  "13": { ...SUPPLY("the date you completed probation, if you were on probation"), label: "Yes – Date of Completion:" },
  "14": { ...ELECTION(), label: "No" },
  "15": { ...ELECTION(), label: "c. Any restitution ordered by the Court has been paid: Yes" },
  "16": { ...ELECTION(), label: "c. Any restitution ordered by the Court has been paid: No" },
  "17": { ...ELECTION(), label: "Restitution was not ordered" },
  "18": { ...ELECTION(), label: "I was not convicted for the offenses listed above." },
  "19": { ...ELECTION(), label: "I was cited or arrested, by (name of arresting law enforcement agency or department)" },
  "19a": { ...SUPPLY("the name of the law enforcement agency that cited or arrested you, if no charge was filed"), label: "name of arresting law enforcement agency or department" },
  "20": { ...ELECTION(), label: "A charge was filed, but the Court did not find probable cause." },
  "21": { ...ELECTION(), label: "A charge was filed and later dismissed by the Court." },
  "22": { ...SUPPLY("any new offence since the offence in question 1 — leave blank if there are none"), label: "Offense (new charges since)" },
  "23": { ...SUPPLY("the date of that new offence"), label: "Date of Offense (new charges since)" },
  "24": { ...SUPPLY("the date that new charge was brought"), label: "Date of Charge (new charges since)" },
  "25": { ...SUPPLY("the date of conviction on that new charge, if there was one"), label: "Date of Conviction (new charges since)" },
  "28": { ...SUPPLY("the date that second new charge was brought"), label: "Date of Charge (new charges since)" },
  "29": { ...SUPPLY("the date of conviction on that second new charge"), label: "Date of Conviction (new charges since)" },
  "32": { ...SUPPLY("the date that third new charge was brought"), label: "Date of Charge (new charges since)" },
  "33": { ...SUPPLY("the date of conviction on that third new charge"), label: "Date of Conviction (new charges since)" },
  "36": { ...SUPPLY("your own statement of why expungement is in the interests of justice — this is yours to write and the platform never writes it for you"), label: "4. I believe that expungement of my criminal history is in the interests of justice because:" },
  "36a": { ...ELECTION(), label: "I consent to receive documents from the other parties at the email provided below: YES" },
  "36b": { ...ELECTION(), label: "I consent to receive documents from the other parties at the email provided below: NO" },
  "37": { ...PROTECT(SIGNATURE), label: "Date of Signature" },
  "37a": { ...PROTECT(SIGNATURE), label: "Signature of Defendant" },
  "38": { ...WRITE("participant.full_legal_name"), label: "Printed Name of Defendant" },
  "39": { ...WRITE("participant.city_state_zip"), label: "City, State, Zip" },
  "40": { ...WRITE("participant.phone"), label: "Phone" },
  "41": { ...WRITE("participant.email"), label: "Email Address" },
  "42": { ...WRITE("participant.street_address"), label: "Address" },
};
/* The signature block of 200-00132A interleaves two columns: three mailing-address
 * lines on the left and the phone and email on the right, under labels that do not
 * line up with either. Nearest-printed-line is the wrong reader for those five, so
 * each carries an explicit label and the derived caption stays in printedLabel as
 * the record of what is actually printed nearest the box. */
const POLICY_200_00132A = {
  "Unit": { ...SUPPLY("the Superior Court unit (county) where the case was decided"), label: "Unit (Superior Court unit)" },
  "Docket Number": { ...WRITE("matter.case_number"), label: "Case No. (docket number)" },
  "Defendant": { ...WRITE("participant.full_legal_name"), label: "In RE: Defendant" },
  "DOB": { ...WRITE("participant.date_of_birth"), label: "DOB:" },
  "22": { ...SUPPLY("the description of the first offence, exactly as on the petition"), label: "Description of Offense" },
  "23": { ...SUPPLY("the date of the first offence"), label: "Date of Offense" },
  "24": { ...SUPPLY("the incident number for the first offence, if the record shows one"), label: "Incident Number" },
  "25": { ...SUPPLY("the docket number of the first offence, if it has one"), label: "Docket Number (if any)" },
  "26": { ...SUPPLY("the description of a second offence from the same incident, if there is one"), label: "Description of Offense" },
  "27": { ...SUPPLY("the date of the second offence"), label: "Date of Offense" },
  "28": { ...SUPPLY("the incident number for the second offence"), label: "Incident Number" },
  "29": { ...SUPPLY("the docket number of the second offence"), label: "Docket Number (if any)" },
  "30": { ...SUPPLY("the description of a third offence from the same incident, if there is one"), label: "Description of Offense" },
  "31": { ...SUPPLY("the date of the third offence"), label: "Date of Offense" },
  "32": { ...SUPPLY("the incident number for the third offence"), label: "Incident Number" },
  "33": { ...SUPPLY("the docket number of the third offence"), label: "Docket Number (if any)" },
  "34": { ...SUPPLY("the name of any other state agency the court should notify, if you know of one"), label: "State Agency (other state entities to notify)" },
  "34a": { ...SUPPLY("that agency's address"), label: "Address (other state entities to notify)" },
  "35": { ...SUPPLY("a second agency the court should notify, if there is one"), label: "State Agency (other state entities to notify)" },
  "36": { ...SUPPLY("that second agency's address"), label: "Address (other state entities to notify)" },
  "check box 1": { ...ELECTION(), label: "I consent to receive documents from the other parties at the email provided below: YES" },
  "chec box 2": { ...ELECTION(), label: "I consent to receive documents from the other parties at the email provided below: NO" },
  "34b": { ...PROTECT(SIGNATURE), label: "Defendant: Date of Signature" },
  "34c": { ...PROTECT(SIGNATURE), label: "Defendant: Signature" },
  "34d": { ...WRITE("participant.full_legal_name"), label: "Printed Name" },
  "34e": { ...WRITE("participant.street_address"), label: "Mailing Address" },
  "34f": { ...WRITE("participant.city_state_zip"), label: "Mailing Address - City, State, Zip" },
  "34g": { ...SUPPLY("a third mailing-address line, only if your address needs one"), label: "Mailing Address (third line)" },
  "34h": { ...WRITE("participant.phone"), label: "Phone Number" },
  "34i": { ...WRITE("participant.email"), label: "Email Address" },
  "34j": { ...PROTECT(COURT_OWNED), label: "State’s Attorney: Date of Signature" },
  "34k": { ...PROTECT(COURT_OWNED), label: "State’s Attorney: Signature" },
  "34l": { ...PROTECT(COURT_OWNED), label: "State’s Attorney: Printed Name" },
};
const POLICY_600_00228 = {
  "Division": { ...SUPPLY("the Superior Court division your case is in"), label: "SUPERIOR COURT DIVISION" },
  "Unit": { ...SUPPLY("the Superior Court unit (county) where the case was decided"), label: "Unit (Superior Court unit)" },
  "Docket Number": { ...WRITE("matter.case_number"), label: "Case No. (docket number)" },
  "Case Name": { ...WRITE("participant.full_legal_name"), label: "Case Name" },
  "3": { ...WRITE("participant.full_legal_name"), label: "Name: (First & Last)" },
  "2": { ...WRITE("participant.street_address"), label: "Street Address:" },
  "4": { ...WRITE("participant.city_state_zip"), label: "City/State/Zip:" },
  "5": { ...SUPPLY("a mailing address, only if it is different from your street address"), label: "Mailing Address: (if different from street address)" },
  "5a": { ...WRITE("participant.email"), label: "Email Address:" },
  "6": { ...WRITE("participant.phone"), label: "Home / Cell Phone:" },
  "7": { ...SUPPLY("your work phone number, if you have one"), label: "Work Phone:" },
  "8": { ...SUPPLY("how many people live in your household, counting a spouse or partner and any dependants"), label: "Total Number Living in Household (spouse, partner & dependents)" },
  "15": { ...ELECTION(), label: "Are you employed? Yes" },
  "16": { ...ELECTION(), label: "Are you employed? No" },
  "17": { ...SUPPLY("your employer's name, if you are employed"), label: "Employer Name" },
  "18": { ...SUPPLY("your employer's address"), label: "Employer Address" },
  "19": { ...SUPPLY("a second employer's name, if you have one"), label: "Employer Name" },
  "20": { ...SUPPLY("that second employer's address"), label: "Employer Address" },
  "21": { ...ELECTION(), label: "Do you receive any government benefit based on need: Yes" },
  "22": { ...ELECTION(), label: "Do you receive any government benefit based on need: No" },
  "23": { ...SUPPLY("the type of public assistance you receive, if you receive any"), label: "Type of Assistance:" },
  "24": { ...SUPPLY("the monthly amount of that public assistance"), label: "Monthly Amount $" },
  "27": { ...SUPPLY("your gross monthly income from wages"), label: "Gross Income from Wages" },
  "29": { ...SUPPLY("your monthly unemployment compensation, if any"), label: "Unemployment Compensation" },
  "31": { ...SUPPLY("child support you receive each month, if any"), label: "Child Support (income received)" },
  "33": { ...SUPPLY("any other monthly income"), label: "Other Income" },
  "35": { ...SUPPLY("your monthly self-employment or business income, if any"), label: "Self-Employment/Business Income (other than wages)" },
  "MonthlyTotal": { ...SUPPLY("your total monthly income"), label: "Total Monthly Income" },
  "41": { ...SUPPLY("your total income over the past twelve months"), label: "Total Income in the past 12 months" },
  "45": { ...SUPPLY("your monthly rent or mortgage payment"), label: "Rent or Mortgage Payment" },
  "46": { ...SUPPLY("your monthly electricity bill"), label: "Electric Service" },
  "47": { ...SUPPLY("your monthly phone bill"), label: "Phone (monthly expense)" },
  "48": { ...SUPPLY("your monthly fuel, heating or gas cost"), label: "Fuel (heat and/or gas)" },
  "49": { ...SUPPLY("your monthly food cost"), label: "Food" },
  "50": { ...SUPPLY("the household expense on this line of the form"), label: "the unlabelled expense line printed left of Clothing" },
  "51": { ...SUPPLY("your monthly clothing cost"), label: "Clothing" },
  "52": { ...SUPPLY("your monthly medical cost"), label: "Medical" },
  "53": { ...SUPPLY("child support you pay each month, if any"), label: "Child Support (monthly expense)" },
  "54": { ...SUPPLY("your monthly car loan payment, if any"), label: "Auto Loan Payment" },
  "55": { ...SUPPLY("your monthly property tax, if you pay it"), label: "Property Taxes" },
  "56": { ...SUPPLY("your monthly insurance cost"), label: "Insurance (health, auto, etc.)" },
  "57": { ...SUPPLY("any other monthly expense"), label: "Other Expenses" },
  "72": { ...ELECTION(), label: "I have additional assets: Yes" },
  "73": { ...ELECTION(), label: "I have additional assets: No" },
  "74": { ...SUPPLY("the make and model of a vehicle you own, if you own one"), label: "Vehicles Make, Model" },
  "75": { ...SUPPLY("that vehicle's year and fair market value"), label: "Vehicle Year / Fair Market Value" },
  "76": { ...SUPPLY("how much you still owe on that vehicle"), label: "Vehicle Amount Owed" },
  "77": { ...SUPPLY("that vehicle's net value"), label: "Vehicle Net Value" },
  "78": { ...SUPPLY("a second vehicle's make and model, if you own one"), label: "Vehicles Make, Model" },
  "79": { ...SUPPLY("that second vehicle's year and fair market value"), label: "Vehicle Year / Fair Market Value" },
  "80": { ...SUPPLY("how much you still owe on that second vehicle"), label: "Vehicle Amount Owed" },
  "81": { ...SUPPLY("that second vehicle's net value"), label: "Vehicle Net Value" },
  "82": { ...SUPPLY("a third vehicle's make and model, if you own one"), label: "Vehicles Make, Model" },
  "83": { ...SUPPLY("that third vehicle's year and fair market value"), label: "Vehicle Year / Fair Market Value" },
  "84": { ...SUPPLY("how much you still owe on that third vehicle"), label: "Vehicle Amount Owed" },
  "85": { ...SUPPLY("that third vehicle's net value"), label: "Vehicle Net Value" },
  "86": { ...SUPPLY("a fourth vehicle's make and model, if you own one"), label: "Vehicles Make, Model" },
  "87": { ...SUPPLY("that fourth vehicle's year and fair market value"), label: "Vehicle Year / Fair Market Value" },
  "88": { ...SUPPLY("how much you still owe on that fourth vehicle"), label: "Vehicle Amount Owed" },
  "89": { ...SUPPLY("that fourth vehicle's net value"), label: "Vehicle Net Value" },
  "90": { ...SUPPLY("a description of real property you own, if you own any"), label: "Real Property Description" },
  "91": { ...SUPPLY("that property's fair market value"), label: "Real Property FMV" },
  "92": { ...SUPPLY("the mortgage on that property"), label: "Real Property Mortgage" },
  "93": { ...SUPPLY("that property's net value"), label: "Real Property Net Value" },
  "94": { ...SUPPLY("a second property's description, if you own one"), label: "Real Property Description" },
  "95": { ...SUPPLY("that second property's fair market value"), label: "Real Property FMV" },
  "96": { ...SUPPLY("the mortgage on that second property"), label: "Real Property Mortgage" },
  "97": { ...SUPPLY("that second property's net value"), label: "Real Property Net Value" },
  "98": { ...SUPPLY("how much cash you have on hand"), label: "Cash on Hand" },
  "99": { ...SUPPLY("the balance of your checking account"), label: "Checking Account" },
  "100": { ...SUPPLY("the balance of your savings accounts"), label: "Savings Accounts" },
  "101": { ...SUPPLY("your total cash assets"), label: "Total Cash Assets" },
  "102": { ...SUPPLY("a description of any other asset — tools, equipment, stocks and so on"), label: "Other Assets Description" },
  "103": { ...SUPPLY("that asset's fair market value"), label: "Other Assets FMV" },
  "104": { ...SUPPLY("a second other asset, if you have one"), label: "Other Assets Description" },
  "105": { ...SUPPLY("that second asset's fair market value"), label: "Other Assets FMV" },
  "113": { ...SUPPLY("anything else you want the court to know about why you cannot afford the fees — this is yours to write"), label: "These are additional reasons why I cannot afford the fees:" },
  "115": { ...PROTECT(SIGNATURE), label: "Date" },
  "116": { ...PROTECT(SIGNATURE), label: "Applicant Signature" },
  "117": { ...WRITE("participant.full_legal_name"), label: "Printed Name" },
};

/* 200-00129 asks one question 200-00130 does not: whether the conduct is still
 * prohibited by law. That is the whole ground of this route, and it is the
 * participant's own assertion about their own offence, so both boxes are theirs. */
/* The four names that carry two boxes each on page 2 of 200-00129: a new-charge
 * row near the top, and a state-agency row two thirds of the way down. Addressed
 * by coordinate because the name alone cannot tell them apart. */
POLICY_200_00129["26@p2y686"] = { ...SUPPLY("a second new offence, if there is one"), label: "Offense (new charges since)" };
POLICY_200_00129["26@p2y431"] = { ...SUPPLY("the name of any other state agency the court should notify, if you know of one"), label: "State Agency (other state entities to notify)" };
POLICY_200_00129["27@p2y686"] = { ...SUPPLY("the date of that second new offence"), label: "Date of Offense (new charges since)" };
POLICY_200_00129["27@p2y431"] = { ...SUPPLY("that agency's address"), label: "Address (other state entities to notify)" };
POLICY_200_00129["30@p2y671"] = { ...SUPPLY("a third new offence, if there is one"), label: "Offense (new charges since)" };
POLICY_200_00129["30@p2y415"] = { ...SUPPLY("a second agency the court should notify, if there is one"), label: "State Agency (other state entities to notify)" };
POLICY_200_00129["31@p2y671"] = { ...SUPPLY("the date of that third new offence"), label: "Date of Offense (new charges since)" };
POLICY_200_00129["31@p2y416"] = { ...SUPPLY("that second agency's address"), label: "Address (other state entities to notify)" };

POLICY_200_00129["13a"] = { ...ELECTION(), label: "d. The offense or offenses are no longer prohibited by law: Yes" };
POLICY_200_00129["13b"] = { ...ELECTION(), label: "d. The offense or offenses are no longer prohibited by law: No" };

const FORMS = {
  "200-00129": { title: "Petition to Expunge Criminal History", component: "petition", policy: POLICY_200_00129 },
  "200-00132A": { title: "Stipulation to Expunge Criminal History Record + Order", component: "stipulation_and_proposed_order", policy: POLICY_200_00132A },
  "600-00228": { title: "Application to Waive Filing Fees and Service Costs", component: "fee_waiver_application", policy: POLICY_600_00228 }
};
const ORDER = ["200-00129", "200-00132A", "600-00228"];

/*
 * FIX01/RP-2, ROUTE_IDENTITY.
 *
 * This family printed "obligation:track-pathway:VT:vt_exp_decriminalized:
 * expungement-of-decriminalized-conduct" in the participant-instructions footer
 * and in production-field-map.json. That key exists in no route record: the
 * committed route-obligation census names
 * obligation:track-pathway:VT:vt_exp_decriminalized:adult-conviction-expungement-narrow-statutory-route
 * for this packet set, and product-wiring.json routeKey and routeKeys already
 * carry that one. The packet was built for a route the record names and
 * labelled for a route it does not.
 *
 * The owner's decision, applied here: the participant-facing page prints a
 * SHORT HUMAN-READABLE LABEL, and the canonical machine route id lives in the
 * manifests and the wiring only. So `routeKey` below is now the census key -
 * it reaches production-field-map.json routeKeys and every documentPolicy -
 * and `routeLabel` is what the composed instruction PDF and
 * participant-instructions.md print. A participant is not the reader of a route
 * key, and a route key printed for a participant was only ever a place for this
 * kind of error to hide.
 *
 * The label follows the shape Kansas already ships -- a short mechanism phrase,
 * a hyphen, the statute -- so a reader who meets a LegalEase route line on two
 * different packets reads the same kind of sentence twice. Kansas is
 * scripts/build-census-v1-rcap-ks-custom-pleading.mjs and its label is
 * "Municipal conviction or diversion expungement - K.S.A. 12-4516".
 *
 * The section sign is deliberately absent from the label. sanitizePdfText below
 * writes "Sec. " over it before the composed page is drawn, so a label carrying
 * one would print differently from the label the manifest declares;
 * assertRouteLabel refuses that rather than letting the two drift.
 *
 * This declares WHAT THE PACKET IS. It opens no route, sets no price and
 * touches no compiled runtime. It is this family alone: no other builder that
 * prints a route line is touched by it.
 */
export const FAMILY_CONFIGS = Object.freeze({
  "vt_exp_decriminalized-set": {
    jurisdiction: "VT",
    routeKey: "obligation:track-pathway:VT:vt_exp_decriminalized:adult-conviction-expungement-narrow-statutory-route",
    routeLabel: "Expungement of a conviction for conduct no longer a crime - 13 V.S.A. 7602",
    routeSelectionId: "vt-exp-decriminalized-200-00129-complete-set",
    legalName: "Petition to Expunge a Conviction for Conduct No Longer Prohibited by Law, 13 V.S.A. § 7602",
    routeName: "expunging a conviction for conduct that is no longer prohibited by law",
    statute: "13 V.S.A. § 7602",
    documents: ORDER
  }
});

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
    "participant.full_legal_name": "Maria-Alejandra O'Shaughnessy-Whitfield",
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
  const raw = index.entries ?? index.files ?? index;
  const rows = Array.isArray(raw) ? raw : Object.values(raw);
  const root = corpusRoot();
  const resolved = []; const failures = [];
  for (const formNumber of config.documents) {
    // The form-number token is delimited on both sides, so 200-00132A cannot
    // match the 200-00132 binary and 200-00129 cannot match 200-00129A.
    const entry = rows.find((e) => String(e.path ?? e.relativePath ?? "").includes(`__${formNumber}__`)
      && String(e.path ?? e.relativePath ?? "").startsWith("STATES/VT/"));
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
      revision: /__REV-([0-9A-Za-z-]+)__/.exec(rel)?.[1] ?? null,
      sha256, byteLength: bytes.length, bytes
    });
  }
  return { resolved, failures };
}

function normalizeRect(r) {
  const x = Math.min(r.x, r.x + r.width);
  const y = Math.min(r.y, r.y + r.height);
  return { x: Number(x.toFixed(2)), y: Number(y.toFixed(2)), width: Number(Math.abs(r.width).toFixed(2)), height: Number(Math.abs(r.height).toFixed(2)) };
}

/* ---- census, with the caption read off the page --------------------------- */
async function censusOf(source) {
  const spec = FORMS[source.formNumber];
  const doc = await PDFDocument.load(source.bytes, { ignoreEncryption: true });
  const pages = doc.getPages();
  const pageText = pages.map((p, i) => ({
    page: i + 1,
    lines: groupIntoLines(extractTextItems(p)).map((l) => ({ y: Math.round(l.y), text: String(l.text ?? "").trim() })).filter((l) => l.text)
  }));

  // How many boxes each name carries, so a name that carries one keeps its own
  // name as its key and a name that carries several is addressed by coordinate.
  const counts = new Map();
  for (const f of doc.getForm().getFields()) counts.set(f.getName(), f.acroField.getWidgets().length);

  const rows = []; const unmapped = []; const used = new Set();
  for (const field of doc.getForm().getFields()) {
    const name = field.getName();
    const pdfClass = field.constructor.name;
    for (const w of field.acroField.getWidgets()) {
      const rect = normalizeRect(w.getRectangle());
      const ref = w.P();
      let pi = pages.findIndex((p) => p.ref === ref); if (pi < 0) pi = 0;
      const page = pi + 1;
      const key = counts.get(name) > 1 ? `${name}@p${page}y${Math.round(rect.y)}` : name;
      /*
       * A name that carries several boxes is addressed ONLY by coordinate. The
       * base-name fallback is right for a name that carries one box and wrong
       * for one that carries several: on 200-00129 the names 26, 27, 30 and 31
       * are a new-charge row near the top of page 2 AND a state-agency row two
       * thirds of the way down it, and a fallback would have given the agency
       * rows the new-charge wording without anything failing.
       */
      const entry = counts.get(name) > 1 ? spec.policy[key] : (spec.policy[key] ?? spec.policy[name]);
      if (!entry) { unmapped.push({ key, field: name, page, rect, why: "no policy entry for this widget" }); continue; }
      used.add(spec.policy[key] ? key : name);
      /*
       * The caption: the printed line whose baseline is nearest this widget's
       * own, on this widget's own page. These forms label a blank above it, on
       * it, or under it depending on the block, so nearest-by-distance is the
       * only rule that reads all three the same way.
       */
      const lines = pageText.find((p) => p.page === page)?.lines ?? [];
      const nearest = [...lines].sort((a, b) => Math.abs(a.y - rect.y) - Math.abs(b.y - rect.y))[0] ?? null;
      rows.push({
        key, name, page, rect,
        type: pdfClass.replace("PDF", "").toLowerCase().replace("textfield", "text"),
        rectBasis: "acroform_widget_rect_read_first_hand_from_pinned_binary_and_normalized",
        caption: nearest?.text ?? null,
        captionAt: nearest ? { page, y: nearest.y, basis: "nearest printed line to this widget's own baseline, read from the pinned binary at build time" } : null,
        effectiveLabel: entry.label ?? nearest?.text ?? key,
        regionHeading: entry.label ?? nearest?.text ?? key,
        policy: entry.policy, fact: entry.fact ?? null,
        refusalClass: entry.refusalClass ?? null, what: entry.what ?? null,
        isSelectionControl: pdfClass === "PDFCheckBox",
        multiline: typeof field.isMultiline === "function" ? field.isMultiline() : false,
        maxLength: typeof field.getMaxLength === "function" ? (field.getMaxLength() ?? null) : null
      });
    }
  }
  const missingKeys = Object.keys(spec.policy).filter((k) => !used.has(k));
  const uncaptioned = rows.filter((r) => !r.caption).map((r) => ({ key: r.key, page: r.page }));
  return { rows, unmapped, missingKeys, uncaptioned, pageText };
}

/* ---- render one official form -------------------------------------------- */
async function renderDocument(source, census, fixtureName) {
  const facts = FIXTURES[fixtureName];
  const byName = new Map();
  for (const r of census.rows) {
    const existing = byName.get(r.name);
    if (!existing) { byName.set(r.name, r); continue; }
    assert.ok(!(existing.policy === "write" || r.policy === "write"),
      `widget name ${r.name} carries several boxes and one of them is a write; a name-keyed fill cannot address them separately`);
  }
  const unique = [...byName.values()];
  const writable = unique.filter((r) => r.policy === "write");
  const explicitMappings = Object.fromEntries(writable.map((r) => [r.name, r.fact]));
  const unwritableFields = unique.filter((r) => r.policy !== "write").map((r) => ({ field: r.name }));
  const { bytes, report } = await finalizeOfficialForm({
    sourceBytes: source.bytes, expectedSha256: source.sha256,
    census: unique.map((r) => ({
      name: r.name, type: r.type, effectiveLabel: r.effectiveLabel, regionHeading: r.regionHeading,
      widgets: [{ page: r.page, rect: r.rect }], multiline: r.multiline === true, maxLength: r.maxLength ?? null
    })),
    facts, explicitMappings, unwritableFields,
    documentTextLines: census.pageText.flatMap((p) => p.lines.map((l) => l.text)),
    title: FORMS[source.formNumber].title
  });
  if (process.env.VT_DEBUG_RENDER) {
    console.log(`-- ${source.formNumber} ${fixtureName}: written=${report.written.length} refused=${report.refused.length}`);
    const wanted = new Set(writable.map((r) => r.name));
    for (const r of report.refused) if (wanted.has(r.field)) console.log(`   REFUSED A WRITE ${r.field}: ${r.reason}`);
  }
  return { bytes, report };
}

async function byteProof(source, census, file, report, fixtureName) {
  const widgets = await flattenedWidgets(file);
  const written = new Map(report.written.map((w) => [w.field, w]));
  const actualWrites = [];
  for (const r of census.rows) {
    const w = written.get(r.name);
    if (!w || r.policy !== "write") continue;
    const drawn = drawnAt(widgets, { page: r.page, rect: r.rect });
    actualWrites.push({
      field: r.key, widgetName: r.name, factId: w.factId ?? r.fact, page: r.page, rect: r.rect,
      printedCaption: r.caption, drawnText: drawn.map((d) => d.text).filter(Boolean),
      expected: FIXTURES[fixtureName][r.fact] ?? null
    });
  }
  const measured = census.rows.map((r) => ({ page: r.page, rect: r.rect }));
  let outside = 0;
  for (const w of widgets) {
    const at = measured.some((m) => m.page === w.page && Math.abs(w.x - m.rect.x) <= 2 && Math.abs(w.y - m.rect.y) <= 2);
    if (!at) outside += String(w.text ?? "").replace(/\s+/g, "").length;
  }
  return { actualWrites, appearances: widgets.length, outside };
}

/* ---- the composed instructions component ---------------------------------- */
function composedBody(config, facts, resolved) {
  const L = [];
  L.push("FILING AND EXPECTATION INSTRUCTIONS", "");
  L.push(`Petitioner: ${facts["participant.full_legal_name"]}`);
  L.push(`Case No.: ${facts["matter.case_number"]}`);
  L.push(`Route: ${config.legalName}`, "");
  L.push("WHERE THIS GOES", "");
  L.push("File the completed packet with the VERMONT SUPERIOR COURT, CRIMINAL DIVISION, in the unit where your case was decided. Both the petition (200-00129) and the stipulation (200-00132A) print SUPERIOR COURT CRIMINAL DIVISION across the top of page 1, and the Unit box beside it is where that unit goes. If you do not know which unit decided your case, the docket number on your paperwork identifies it, and the clerk of any Superior Court unit can tell you from the docket number.", "");
  L.push("WHAT THIS PACKET CONTAINS", "");
  for (const r of resolved) L.push(`- ${r.formNumber}: ${FORMS[r.formNumber].title}`);
  L.push("- These instructions.", "");
  L.push("WHAT TO EXPECT", "");
  L.push("This route asks the court to expunge a conviction because the conduct is no longer prohibited by law. Question 2(d) of the petition is where you say so, and it is your assertion about your own offence: the platform does not tick it for you and does not decide whether it is true of your record.", "");
  L.push("The stipulation (200-00132A) is an agreement between you and the State's Attorney. The court cannot act on a stipulation the State's Attorney has not signed. If the State's Attorney will not sign, file the petition on its own and ask the court to set a hearing.", "");
  L.push("The fee waiver application (600-00228) is filed only if you cannot pay. It is a financial affidavit, and the platform holds none of its figures.", "");
  L.push("TWO THINGS THIS PACKET DOES NOT TELL YOU", "");
  L.push("- The filing fee, and whether it can be waived. Ask the clerk of the unit above what the fee is for a petition to expunge under 13 V.S.A. Sec. 7602 and whether the waiver in this packet applies. The form is included; the amount it waives is not stated here.");
  L.push("- Who must be served, and how. Ask the same clerk who must receive a copy and by what method. The State's Attorney's signature on the stipulation is not service and does not substitute for it.", "");
  L.push("WHAT THIS PACKET IS NOT", "");
  L.push("This is a prepared set of official Vermont forms. It is not legal advice, it is not filed for you, and it does not decide whether the court will grant expungement.", "");
  L.push(`Route: ${config.routeLabel}`);
  return L.join("\n");
}

function sanitizePdfText(t) {
  return t.replaceAll(" ", " ").replaceAll("‑", "-").replaceAll("–", "-").replaceAll("—", "-")
    .replaceAll("−", "-").replaceAll("’", "'").replaceAll("‘", "'").replaceAll("“", '"')
    .replaceAll("”", '"').replaceAll("§", "Sec. ").replaceAll("…", "...");
}

/* The composed instruction page's own geometry. Named because assertRouteLabel
 * measures the printed route line against the same column the renderer draws
 * into; two copies of 612 and 72 is how those two silently stop agreeing. */
const COMPOSED_FONT_SIZE = 11;
const COMPOSED_PAGE_WIDTH = 612;
const COMPOSED_MARGIN = 72;
const COMPOSED_TEXT_WIDTH = COMPOSED_PAGE_WIDTH - 2 * COMPOSED_MARGIN;

/*
 * The guard on the two identities.
 *
 * A label that carried a machine key, or that could not be read at a glance,
 * would defeat the point of having one; a label the page sanitizer rewrites
 * would make the manifest and the paper disagree; and a label that wrapped
 * would hand a participant the same broken line the key gave them. The width is
 * measured against the composed page's own font, size and text column rather
 * than against a character count, because a character count is a guess about a
 * proportional font.
 */
async function assertRouteLabel(config) {
  const label = config.routeLabel;
  assert.ok(typeof label === "string" && label.trim().length > 0,
    `${config.routeKey}: declares no human-readable routeLabel, and the packet page prints the label`);
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

async function renderComposedPdf(fullText, title) {
  const pdf = await PDFDocument.create();
  pdf.setTitle(title); pdf.setProducer("RCAP census-v1 artifact-only renderer"); pdf.setCreator("RCAP evidence build");
  const fixed = new Date(FIXED_DATE); pdf.setCreationDate(fixed); pdf.setModificationDate(fixed);
  const font = await pdf.embedFont(StandardFonts.TimesRoman);
  const size = COMPOSED_FONT_SIZE, lh = 14.5, W = COMPOSED_PAGE_WIDTH, H = 792, margin = COMPOSED_MARGIN, maxW = COMPOSED_TEXT_WIDTH;
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
  for (const raw of sanitizePdfText(fullText).split("\n")) for (const row of wrap(raw)) draw(row);
  return Buffer.from(await pdf.save({ useObjectStreams: false, updateMetadata: false }));
}

function composedMap(config) {
  const id = "filing_and_expectation_instructions";
  const base = (fid, label) => ({
    field: `${id}.${fid}`, page: 1, printedLabel: label, printedLine: label,
    effectiveLabel: label, regionHeading: label, sectionHeading: null,
    rectBasis: "composed_document_authored_by_this_build"
  });
  const writes = [
    { ...base("petitioner_name", "Petitioner named on this page"), factId: "participant.full_legal_name", kind: "composed_text", document: id },
    { ...base("case_number", "Case No. printed on this page"), factId: "matter.case_number", kind: "composed_text", document: id }
  ];
  return {
    formNumber: id,
    documentPolicy: { mode: "participant", captionOnly: false, documentAcceptsFill: true, routeKey: config.routeKey },
    structuralClass: "composed_document",
    explicitMappings: {}, roleRefusals: [], selectionControls: [],
    canonicalWrites: writes, canonicalRefusals: [],
    boundaryWrites: writes, boundaryRefusals: []
  };
}

/* ---- field map ------------------------------------------------------------ */
function officialFieldMap(source, census, report, config) {
  const written = new Set(report.written.map((w) => w.field));
  const canonicalWrites = []; const canonicalRefusals = []; const selectionControls = [];
  for (const r of census.rows) {
    const base = {
      field: r.key, widgetName: r.name, page: r.page, rect: r.rect, rectBasis: r.rectBasis,
      printedLabel: r.caption, printedLine: r.caption,
      regionHeading: r.effectiveLabel, sectionHeading: null,
      effectiveLabel: r.effectiveLabel, captionReadAt: r.captionAt
    };
    if (r.policy === "write") {
      assert.ok(written.has(r.name), `${source.formNumber} ${r.key} is mapped as a write and the finalizer did not write it`);
      canonicalWrites.push({ ...base, factId: r.fact, kind: r.type, document: source.formNumber });
      continue;
    }
    if (r.isSelectionControl) {
      const protect = r.policy === "protect";
      const cls = protect ? r.refusalClass : ELECTION_CLASS;
      selectionControls.push({
        ...base, selectionId: r.key, kind: "selection_control", type: "checkbox",
        widgets: [{ page: r.page, rect: r.rect, rectBasis: r.rectBasis }],
        disposition: "explicit_refusal",
        reason: protect ? "signature or date field; never prefilled by this build"
          : "a sworn assertion or legal election the route does not determine; only the participant may make it",
        category: cls, completenessClass: cls, class: cls,
        requiredBeforeFiling: false, routeDetermined: false, document: source.formNumber,
        why: protect ? "the participant signs and dates this themselves at filing time" : "only the participant may make this election"
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
          : "the court, the clerk or the State's Attorney owns this field"
      });
      continue;
    }
    canonicalRefusals.push({
      ...base, reason: `the participant supplies this before filing: ${r.what}`,
      category: null, completenessClass: null, class: null,
      disposition: "REQUIRED_BEFORE_FILING", requiredBeforeFiling: true, routeDetermined: false,
      identity: `${source.formNumber} field ${r.key}`, factId: null, document: source.formNumber,
      why: `the platform holds no value for this and the participant supplies it before filing: ${r.what}`,
      participantMustSupply: r.what
    });
  }
  return {
    formNumber: source.formNumber,
    documentPolicy: { mode: "participant", captionOnly: false, documentAcceptsFill: true, routeKey: config.routeKey },
    structuralClass: "acroform",
    component: FORMS[source.formNumber].component,
    explicitMappings: Object.fromEntries(census.rows.filter((r) => r.policy === "write").map((r) => [r.name, r.fact])),
    roleRefusals: [], selectionControls, canonicalWrites, canonicalRefusals,
    boundaryWrites: canonicalWrites, boundaryRefusals: canonicalRefusals
  };
}

function builderCounters(maps, actualWrites, instructionsText) {
  const counters = Object.fromEntries(PASS_COUNTERS.map((c) => [c, 0]));
  const findings = [];
  const note = (counter, detail) => { counters[counter] += 1; findings.push({ counter, ...detail }); };
  const writes = []; const blanks = [];
  for (const m of maps) {
    const id = m.formNumber;
    for (const w of m.canonicalWrites ?? []) writes.push({ ...w, document: id, name: w.field, label: w.effectiveLabel ?? w.field, isSelectionControl: false });
    for (const r of m.canonicalRefusals ?? []) blanks.push({ ...r, document: id, name: r.field, label: r.effectiveLabel ?? r.field, refusalClass: r.completenessClass ?? null, isSelectionControl: false });
    for (const c of m.selectionControls ?? []) {
      if (String(c.disposition ?? "").toLowerCase().startsWith("select")) writes.push({ ...c, document: id, name: c.selectionId, label: c.field, isSelectionControl: false });
      else blanks.push({ ...c, document: id, name: c.field, label: `${c.field} (selection)`, refusalClass: c.completenessClass ?? null, isSelectionControl: true });
    }
  }
  const normLabel = (x) => String(x ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const writtenInDocument = new Map();
  for (const w of writes) {
    const doc = String(w.document ?? "");
    if (!writtenInDocument.has(doc)) writtenInDocument.set(doc, new Set());
    for (const k of [normLabel(w.label), normLabel(w.name)]) if (k.length >= 4) writtenInDocument.get(doc).add(k);
  }
  const availableFacts = new Set(writes.map((w) => w.factId).filter(Boolean).map(String));
  const declaredRequired = [];
  for (const b of blanks) {
    const here = writtenInDocument.get(String(b.document ?? "")) ?? new Set();
    const declared = {
      disposition: b.completenessDisposition ?? null,
      ...(Object.hasOwn(b, "requiredBeforeFiling") ? { requiredBeforeFiling: b.requiredBeforeFiling === true } : {}),
      routeDetermined: b.routeDetermined === true,
      factId: b.factId ?? null, identity: b.field ?? null,
      factAvailable: (b.factId ? availableFacts.has(String(b.factId)) : false) || here.has(normLabel(b.label)) || here.has(normLabel(b.name))
    };
    const verdict = classifyBlank(b, b.reason, b.refusalClass, declared);
    if (verdict.disposition === "REQUIRED_BEFORE_FILING") declaredRequired.push(b);
    if (BLANK_DISPOSITIONS[verdict.disposition].allowed) continue;
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
    const key = rowKeyOf(f); if (!key) continue;
    if (!rows.has(key)) rows.set(key, []);
    rows.get(key).push(f);
  }
  for (const [key, cells] of rows) {
    if (!cells.some((c) => c.written)) continue;
    const missing = cells.filter((c) => !c.written && classifyField(c.label, c.isSelectionControl === true).requirement === "REQUIRED_KNOWN");
    if (missing.length > 0) note("incompleteRows", { row: key, missingCells: missing.map((m) => m.label).slice(0, 6) });
  }
  for (const w of writes) {
    if (classifyField(w.label, w.isSelectionControl === true).requirement === "PROTECTED") note("protectedWrites", { field: w.field, label: w.label, why: "a protected field was written" });
  }
  for (const a of actualWrites.artifacts ?? []) {
    const reported = a.valuesReportedByFinalizer ?? null;
    const visible = (a.addedGlyphsReadFromOutputBytes ?? 0) + (a.flattenedWidgetAppearancesReadFromOutputBytes ?? 0);
    if (typeof reported === "number" && reported > 0 && visible === 0) note("invisibleWrites", { fixture: a.fixture, reportedByFinalizer: reported });
    if ((a.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes ?? 0) > 0) note("visualDefects", { fixture: a.fixture, glyphsOutsideMeasuredBoxes: a.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes });
  }
  return { counters, findings, terminalFields: writes.length + blanks.length, written: writes.length, blank: blanks.length };
}

function requiredBeforeFilingItems(maps) {
  const order = Object.fromEntries(ORDER.map((f, i) => [f, i]));
  return maps.flatMap((m) => (m.canonicalRefusals ?? []).filter((r) => r.requiredBeforeFiling === true).map((r) => ({
    document: m.formNumber, field: r.field, page: r.page, y: r.rect?.y ?? null,
    printedContext: r.printedLabel, disclosureLabel: r.effectiveLabel,
    identity: r.identity, why: r.why, participantMustSupply: r.participantMustSupply
  })))
    .sort((a, b) => ((order[a.document] ?? 99) - (order[b.document] ?? 99)) || (a.page - b.page) || ((b.y ?? 0) - (a.y ?? 0)));
}

function instructionsMarkdown(config, resolved, rbf) {
  const byDoc = new Map();
  for (const i of rbf) byDoc.set(i.document, [...(byDoc.get(i.document) ?? []), i]);
  const out = [];
  out.push(`# What you must do before you file — ${config.routeName}`, "");
  out.push(`This packet is prepared for **${config.legalName}**.`, "");
  out.push("The platform filled in what it holds about you: your name, your date of birth, your address, your telephone number, your email and your docket number. Everything else on these forms is yours, and this page lists every one of them by the words printed beside the blank.", "");
  out.push("## Where you file this", "");
  out.push("File the completed packet with the **Vermont Superior Court, Criminal Division**, in the unit where your case was decided.", "");
  out.push("Both the petition (200-00129) and the stipulation (200-00132A) print `SUPERIOR COURT CRIMINAL DIVISION` across the top of page 1, and the `Unit` box beside it is where that unit goes. If you do not know which unit decided your case, the docket number on your paperwork identifies it, and the clerk of any Superior Court unit can tell you from the docket number.", "");
  out.push("Two things this packet does **not** tell you, because neither is established here and an unsourced figure in a filing instruction is worse than none:", "");
  out.push("- **The filing fee, and whether it can be waived.** Ask the clerk of the unit above. The waiver form is included; the amount it waives is not stated here.");
  out.push("- **Who must be served, and how.** Ask the same clerk. The State's Attorney's signature on the stipulation is not service and does not substitute for it.", "");
  out.push("## What is in this packet", "");
  out.push("| Component | Document |", "| --- | --- |");
  for (const r of resolved) out.push(`| \`${FORMS[r.formNumber].component}\` | **${r.formNumber}** — ${FORMS[r.formNumber].title} |`);
  out.push("| `filing_and_expectation_instructions` | the page that says where the packet goes and what to expect |", "");
  out.push("## What you must do", "");
  out.push("1. **Fill in every item listed below.** Each one names the form, the page and the printed words next to the blank.");
  out.push("2. **Answer question 2(d) on the petition yourself.** That question — whether the offence is no longer prohibited by law — is the whole ground of this route, and it is your assertion about your own record. The platform never ticks it for you.");
  out.push("3. **Sign and date each form yourself.** The platform never signs and never dates a signature. Blank signature and date lines are deliberate.");
  out.push("4. **Get the State's Attorney to sign the stipulation (200-00132A).** The court cannot act on a stipulation the prosecutor has not agreed to. If the State's Attorney will not sign, file the petition (200-00129) on its own and ask the court to set a hearing.");
  out.push("5. **File the fee waiver (600-00228) only if you cannot pay.**", "");
  out.push("## The items you must supply", "");
  for (const [doc, items] of byDoc) {
    out.push(`### ${doc} — ${FORMS[doc]?.title ?? doc}`, "");
    out.push("| Page | The blank on the form | What to write |", "| --- | --- | --- |");
    for (const i of items) out.push(`| ${i.page} | ${i.disclosureLabel} | ${i.participantMustSupply} |`);
    out.push("");
  }
  out.push("## Things the platform deliberately left blank", "");
  out.push("- **Your signature and the date you sign.** A signature is yours alone, and a date written before you sign would be false.");
  out.push("- **The State's Attorney's signature, date and printed name, and the court's order on the stipulation.** Those belong to the prosecutor and the judge.");
  out.push("- **Every checkbox.** Each one is a statement about your own record or a choice only you can make. Read them and tick the ones that are true for you.", "");
  out.push("## What this packet is not", "");
  out.push("This is a prepared set of official Vermont forms. It is not legal advice, it is not filed for you, and it does not decide whether the court will grant expungement.", "");
  out.push(`_Route: ${config.routeLabel}_`);
  return `${out.join("\n")}\n`;
}

/* ---- artifacts ------------------------------------------------------------ */
function writeArtifacts(ctx) {
  const { familyId, config, outDir, resolved, maps, artifacts, writeProofs, rasterPages, rbf, instructions, audit, rasterSkipped } = ctx;
  const W = (rel, body) => fs.writeFileSync(path.join(ROOT, outDir, rel), body);
  W("production-field-map.json", `${JSON.stringify({
    schemaVersion: "rcap-official-form-field-map/v1-census-v1",
    familyId, routeKeys: [config.routeKey], routeSelectionId: config.routeSelectionId,
    jurisdiction: config.jurisdiction, statute: config.statute, legalName: config.legalName,
    officialForms: resolved.map((r) => r.formNumber),
    componentSet: COMPONENTS, documentOfComponent: DOCUMENT_OF_COMPONENT,
    captionBasis: "every printed caption in this map was READ OUT OF THE PINNED BINARY at build time -- the printed line nearest the widget's own baseline on the widget's own page -- and captionReadAt records the y it was read from. The source gate is the exact SHA-256 binding, which fails the family closed on any change to the form.",
    dispositionVocabulary: [SIGNATURE, COURT_OWNED, ELECTION_CLASS],
    routeSelectionsMade: [],
    routeSelectionNote: "This route turns on question 2(d) of 200-00129 -- whether the offence is no longer prohibited by law -- and that is a sworn assertion about the participant's own record, not an election the route determines. It is left for the participant and disclosed in the instructions.",
    requiredBeforeFilingCount: rbf.length, requiredBeforeFiling: rbf,
    maps, generationAllowed: false, runtimeSelectable: false, commercialRoutesOpened: 0
  }, null, 2)}\n`);
  W("source-receipt.json", `${JSON.stringify({
    schemaVersion: "rcap-family-source-receipt/v1",
    familyId, worklistGroupId: familyId, jurisdiction: config.jurisdiction,
    implementationStrategy: "official_pdf_fill", custodyClass: "SOURCE_ALREADY_HELD",
    acquisitionCommissioned: false, corpusRootFromEnvironment: "MASTER_LIBRARY_SOURCE_DIR",
    bindingMethod: "exact path + corpus-index SHA-256 + on-disk SHA-256 + byte length",
    routeSelectionId: config.routeSelectionId, allSourcesExact: true,
    documents: resolved.map((r) => ({ sourceIds: [r.sourceId], formNumber: r.formNumber, revision: r.revision, pathInArchive: r.pathInArchive, sha256: r.sha256, byteLength: r.byteLength })),
    composedComponentsAuthoredByThisBuild: ["filing_and_expectation_instructions"],
    commercialRoutesOpened: 0
  }, null, 2)}\n`);
  W("reports/rendered-artifacts.json", `${JSON.stringify({
    schemaVersion: "rcap-rendered-artifacts/v1", familyId, renderedFresh: true,
    componentSet: COMPONENTS, artifacts,
    packets: artifacts.map((a) => ({ fixture: a.fixture, documents: a.documents })),
    rasterEngine: rasterSkipped ? null : "scripts/raster/pdf-page-raster.mjs (Chromium, calibrated)",
    rasterSkipped, rasterPages
  }, null, 2)}\n`);
  W("reports/actual-writes.json", `${JSON.stringify({
    schemaVersion: "rcap-actual-writes-byte-proof/v1", familyId, derivedFromArtifactBytes: true,
    documents: writeProofs,
    artifacts: writeProofs.map((p) => ({
      fixture: p.fixture, formNumber: p.formNumber,
      valuesReportedByFinalizer: p.valuesReportedByFinalizer,
      addedGlyphsReadFromOutputBytes: p.addedGlyphsReadFromOutputBytes,
      flattenedWidgetAppearancesReadFromOutputBytes: p.flattenedWidgetAppearancesReadFromOutputBytes,
      nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: p.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes
    }))
  }, null, 2)}\n`);
  W("reports/builder-completeness-counters.json", `${JSON.stringify({
    schemaVersion: "rcap-builder-completeness-counters/v1", familyId,
    thisIsNotAVerdict: "A builder verdict is not a verdict. These counters are the builder contract's own obligation, computed with scripts/rcap-packet-completeness/completeness-contract.mjs. An independent verification lane that did not build this packet decides whether it passes.",
    focusedCheckNote: "scripts/rcap-packet-completeness/verify-packet-completeness.mjs enumerates only families listed BUILT in data/rcap-grade-a/launch-control/C11_RETURN_REVIEW.json, an earlier wave's record that this lane may not write.",
    counters: audit.counters, allNineZero: PASS_COUNTERS.every((c) => audit.counters[c] === 0),
    totals: { terminalFields: audit.terminalFields, written: audit.written, blank: audit.blank },
    findings: audit.findings
  }, null, 2)}\n`);
  W("build-status.json", `${JSON.stringify({
    schemaVersion: "rcap-family-build-status/v1", familyId,
    buildStatus: "state_built", reviewStatus: "qa_review_pending",
    builtBy: "scripts/build-census-v1-vt_exp_decriminalized-set.mjs",
    rasterEngine: rasterSkipped ? null : "chromium_calibrated", popplerUsed: false,
    rasterState: rasterSkipped ? "BUILT_RASTER_PENDING" : "rendered_locally_pending_central_acceptance",
    packetsSelfVerified: 0, commercialRoutesOpened: 0, productionTouched: false,
    grantsNothing: "A rendered packet is review evidence. It authorizes no fulfillment and opens no commercial route."
  }, null, 2)}\n`);
  W("build-findings.json", `${JSON.stringify({
    schemaVersion: "rcap-family-build-findings/v1", familyId,
    findings: [
      { finding: "200-00129 and 200-00132A are the expungement counterparts of the sealing forms 200-00130 and 200-00132, and carry the same widget names.", consequence: "The policy assignments are the same assignments, restated against the expungement binaries and their own coordinates rather than shared across a lane boundary. 600-00228 is the same form in both packets and its policy is unchanged." },
      { finding: "Every caption in this map is read out of the pinned binary at build time rather than transcribed.", consequence: "The caption a participant reads is the text actually printed beside their blank. The guard against a changed form is the exact SHA-256 source binding, which fails the family closed on any byte." },
      { finding: "200-00129 asks one question 200-00130 does not: question 2(d), whether the conduct is no longer prohibited by law.", consequence: "That is the ground of this route and it is a sworn assertion about the participant's own offence, so both boxes are left for the participant and the instructions say so in terms. It is not treated as an election the route determines." },
      { finding: "600-00228 is a financial affidavit and the platform holds none of its figures.", consequence: `${rbf.length} blanks across the packet are required-before-filing and every one is named in participant-instructions.md.` }
    ]
  }, null, 2)}\n`);
  W("participant-instructions.md", instructions);
  W("approval-request.json", `${JSON.stringify({
    schemaVersion: "rcap-family-approval-request/v1", familyId,
    requested: "visual review and counsel review", buildStatus: "state_built",
    counselQuestionsRaised: [
      "Question 2(d) of 200-00129 is left for the participant on the reasoning that whether conduct is still prohibited is an assertion about their own offence. If counsel considers it route-determined for a decriminalized-conduct packet, it becomes a route selection and this family needs a repair."
    ],
    approvedForLive: false, live: false, commercialRoutesOpened: 0
  }, null, 2)}\n`);
}

/* ---- the one exported entry point ---------------------------------------- */
export async function runFamilyById(familyId, argv = process.argv.slice(2)) {
  const config = FAMILY_CONFIGS[familyId];
  assert.ok(config, `unknown family ${familyId}`);
  await assertRouteLabel(config);
  const checkOnly = argv.includes("--check");
  const skipRaster = argv.includes("--no-raster");
  const { resolved, failures } = resolveSources(familyId);
  if (failures.length > 0) {
    return { familyId, status: "STOPPED", stopClass: "BLOCKED_SOURCE", failedSourceIdentities: failures,
      why: "a source did not bind by exact SHA-256, so nothing may be rendered from it", overlayDirectoryTouched: false };
  }
  const outDir = `${OVERLAY_ROOT}/${familyId.replace(/_/g, "-")}--official-pdf-fill`;
  const censuses = [];
  for (const source of resolved) censuses.push({ source, census: await censusOf(source) });

  if (process.env.VT_DUMP_DRIFT) {
    for (const c of censuses) {
      for (const u of c.census.unmapped) console.log(`UNMAPPED ${c.source.formNumber} ${u.key} (${u.field}) p${u.page} y=${u.rect.y}`);
      for (const k of c.census.missingKeys) console.log(`POLICY KEY MATCHED NO WIDGET ${c.source.formNumber}: ${k}`);
      for (const u of c.census.uncaptioned) console.log(`NO CAPTION ${c.source.formNumber} ${u.key} p${u.page}`);
    }
    process.exit(0);
  }
  const unmapped = censuses.flatMap((c) => c.census.unmapped.map((u) => ({ form: c.source.formNumber, ...u })));
  const missing = censuses.flatMap((c) => c.census.missingKeys.map((k) => `${c.source.formNumber}:${k}`));
  const uncaptioned = censuses.flatMap((c) => c.census.uncaptioned.map((u) => `${c.source.formNumber}:${u.key}`));
  assert.equal(unmapped.length, 0, `${unmapped.length} widget(s) carry no policy: ${JSON.stringify(unmapped.slice(0, 6), null, 2)}`);
  assert.equal(missing.length, 0, `${missing.length} policy key(s) match no widget: ${JSON.stringify(missing.slice(0, 10))}`);
  assert.equal(uncaptioned.length, 0, `${uncaptioned.length} widget(s) have no printed line to read a caption from: ${JSON.stringify(uncaptioned)}`);

  if (checkOnly) {
    return {
      familyId, status: "CHECK_ONLY",
      documents: censuses.map((c) => {
        const by = (p) => c.census.rows.filter((r) => r.policy === p).length;
        return { formNumber: c.source.formNumber, sha256: c.source.sha256, widgets: c.census.rows.length, write: by("write"), supply: by("supply"), protect: by("protect"), election: by("election") };
      })
    };
  }

  for (const sub of ["fixtures", "reports", "raster"]) fs.mkdirSync(path.join(ROOT, outDir, sub), { recursive: true });
  const maps = []; const artifacts = []; const writeProofs = []; const rasterPages = [];

  for (const fixtureName of ["canonical", "boundary"]) {
    const facts = FIXTURES[fixtureName];
    // The assembled container carries the same fixed date every component page
    // already carries. PDFDocument.create() stamps the wall clock into
    // /CreationDate and /ModDate, and save({ updateMetadata: false }) only
    // declines to REFRESH that stamp -- it does not remove it -- so the first
    // stamp survived into the saved bytes. Two consecutive builds of this
    // family from identical inputs produced different canonical.pdf and
    // boundary.pdf SHA-256 while all sixteen raster pages and all six per-form
    // fixtures came out byte-identical. A RASTER_PASS is pinned to the packet
    // hash, so a rebuild that changed nothing discarded the visual verdict as
    // though the packet had been edited.
    const packet = stampDeterministic(await PDFDocument.create());
    const pageManifest = []; const documents = [];
    for (const { source, census } of censuses) {
      const { bytes, report } = await renderDocument(source, census, fixtureName);
      const single = `${outDir}/fixtures/${fixtureName}--${source.formNumber}.pdf`;
      fs.writeFileSync(path.join(ROOT, single), bytes);
      const proof = await byteProof(source, census, path.join(ROOT, single), report, fixtureName);
      writeProofs.push({
        fixture: fixtureName, formNumber: source.formNumber, sourceSha256: source.sha256,
        proofMethod: "flattened widget appearances read back at every measured /Rect of the finalized bytes",
        valuesReportedByFinalizer: report.written.length,
        flattenedWidgetAppearancesReadFromOutputBytes: proof.appearances,
        addedGlyphsReadFromOutputBytes: proof.actualWrites.reduce((n, w) => n + w.drawnText.join("").length, 0),
        nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: proof.outside,
        actualWrites: proof.actualWrites
      });
      const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
      for (const [i, p] of (await packet.copyPages(doc, doc.getPageIndices())).entries()) {
        packet.addPage(p);
        pageManifest.push({ packetPage: packet.getPageCount(), component: FORMS[source.formNumber].component, documentId: source.formNumber, sourcePage: i + 1, sourceSha256: source.sha256 });
      }
      documents.push(FORMS[source.formNumber].component, source.formNumber);
      if (fixtureName === "canonical") maps.push(officialFieldMap(source, census, report, config));
    }
    const instrBytes = await renderComposedPdf(composedBody(config, facts, resolved), "Filing and Expectation Instructions");
    const instrDoc = await PDFDocument.load(instrBytes, { ignoreEncryption: true });
    for (const [i, p] of (await packet.copyPages(instrDoc, instrDoc.getPageIndices())).entries()) {
      packet.addPage(p);
      pageManifest.push({ packetPage: packet.getPageCount(), component: "filing_and_expectation_instructions", documentId: "filing_and_expectation_instructions", sourcePage: i + 1, sourceSha256: null });
    }
    documents.push("filing_and_expectation_instructions");
    if (fixtureName === "canonical") maps.push(composedMap(config));

    const packetBytes = Buffer.from(await packet.save({ useObjectStreams: false, updateMetadata: false }));
    const file = `${outDir}/fixtures/${fixtureName}.pdf`;
    fs.writeFileSync(path.join(ROOT, file), packetBytes);
    artifacts.push({
      fixture: fixtureName, file,
      sha256: crypto.createHash("sha256").update(packetBytes).digest("hex"),
      byteLength: packetBytes.length, pageCount: packet.getPageCount(), pageManifest,
      documents, components: COMPONENTS
    });

    if (!skipRaster) {
      const rasterDir = `${outDir}/raster/${fixtureName}`;
      fs.mkdirSync(path.join(ROOT, rasterDir), { recursive: true });
      for (let i = 0; i < packet.getPageCount(); i += 1) {
        const stage = path.join(ROOT, rasterDir, `page-${String(i + 1).padStart(2, "0")}`);
        const render = await rasterizePageCalibrated({ file: path.join(ROOT, file), pageIndex: i, keep: stage });
        for (const scrap of ["page.pdf", "page-calibration.pdf", "page-calibration.png"]) {
          const f = path.join(stage, scrap); if (fs.existsSync(f)) fs.unlinkSync(f);
        }
        const png = path.join(stage, "page.png");
        rasterPages.push({
          fixture: fixtureName, page: i + 1,
          file: `${rasterDir}/page-${String(i + 1).padStart(2, "0")}/page.png`,
          component: pageManifest[i]?.component ?? null,
          pageWidthPt: render.pageWidth, pageHeightPt: render.pageHeight,
          pixelsPerPoint: Number(render.pxPerPt.toFixed(4)),
          calibrationResidualPx: render.calibrationResidualPx, paperBounds: render.paper,
          engine: "chromium_calibrated_scripts_lib_pdf_page_raster",
          sha256: crypto.createHash("sha256").update(fs.readFileSync(png)).digest("hex")
        });
      }
    }
  }

  const rbf = requiredBeforeFilingItems(maps);
  const instructions = instructionsMarkdown(config, resolved, rbf);
  const audit = builderCounters(maps, {
    artifacts: writeProofs.map((p) => ({
      fixture: p.fixture, valuesReportedByFinalizer: p.valuesReportedByFinalizer,
      addedGlyphsReadFromOutputBytes: p.addedGlyphsReadFromOutputBytes,
      flattenedWidgetAppearancesReadFromOutputBytes: p.flattenedWidgetAppearancesReadFromOutputBytes,
      nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: p.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes
    }))
  }, instructions);

  writeArtifacts({ familyId, config, outDir, resolved, maps, artifacts, writeProofs, rasterPages, rbf, instructions, audit, rasterSkipped: skipRaster });
  const allZero = PASS_COUNTERS.every((c) => audit.counters[c] === 0);
  return {
    familyId, status: allZero ? "COMPLETED" : "STOPPED",
    ...(allZero ? {} : { stopClass: "COMPLETENESS_COUNTER_NOT_ZERO", nonZeroCounters: PASS_COUNTERS.filter((c) => audit.counters[c] > 0), firstFindings: audit.findings.slice(0, 8) }),
    directory: outDir,
    officialForms: resolved.map((r) => ({ formNumber: r.formNumber, sha256: r.sha256 })),
    components: COMPONENTS,
    terminalFields: audit.terminalFields, written: audit.written,
    requiredBeforeFiling: rbf.length,
    counters: audit.counters, nineCountersZero: allZero,
    rasterPages: rasterPages.length,
    rasterState: skipRaster ? "BUILT_RASTER_PENDING" : "RENDERED_LOCALLY_PENDING_CENTRAL_ACCEPTANCE",
    artifactHashes: artifacts.map((a) => ({ fixture: a.fixture, packetSha256: a.sha256, pages: a.pageCount })),
    packetsSelfVerified: 0, commercialRoutesOpened: 0, productionTouched: false
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(thisFile)) {
  runFamilyById("vt_exp_decriminalized-set")
    .then((r) => { console.log(JSON.stringify(r, null, 2)); })
    .catch((e) => { console.error(e); process.exit(1); });
}
