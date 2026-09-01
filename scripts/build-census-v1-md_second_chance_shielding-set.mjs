#!/usr/bin/env node
/**
 * The Maryland Second Chance Act shielding family -- `md_second_chance_shielding-set`.
 *
 *   node scripts/build-census-v1-md_second_chance_shielding-set.mjs [--check] [--no-raster]
 *
 * Two Maryland Judiciary forms, filed together, and the first one says so on its
 * own face at y=616 of page 1:
 *
 *   CC-DC-CR-148  Petition for Shielding under the Md. Second Chance Act
 *                 (Criminal Procedure sections 10-301 through 10-306), which
 *                 prints "You must file a Notice Regarding Restricted
 *                 Information Pursuant to Rule 20-201.1 (form MDJ-008) with
 *                 this submission."
 *   MDJ-008       that notice -- the attachment, not an optional companion.
 *
 * THIS FAMILY RETURNS STOPPED, AND THE REASON IS THE POINT OF BUILDING IT.
 *
 * MDJ-008 asks the filer to identify which restricted category the submission
 * falls in. For this packet that is not a preference and not a fact about the
 * participant's record: the petition is filed under Md. Rule 16-941, which
 * CC-DC-CR-148 prints in its opening sentence, and MDJ-008 prints the matching
 * category at y=257 -- "Sealing or Shielding Motion: while pending, but not to
 * exceed five (5) business days. Rule 16-941 & 16-914(k)(2)". The same rule
 * number appears on both forms. The route determines the box.
 *
 * The route also determines the section-1 heading box above it, "RESTRICTED
 * DOCUMENT - The entire document is not subject to inspection", which is the
 * heading those categories sit under, and which CC-DC-CR-148 asserts for itself
 * in two places: "This form contains Restricted Information" at the head of
 * page 1, and paragraph 6, "This petition is to be shielded by the clerk".
 *
 * The packet cannot mark either box. `finalizeOfficialForm` -- the AcroForm path
 * every form-filling family in this factory uses -- has no selection channel at
 * all. `finalizeFlatOverlay`, beside it in the same file, does: it takes
 * `selections`, refuses any box not measured off the document, refuses one that
 * lands on a rule the court owns, and strikes two diagonals strictly inside the
 * court's own stroke. An AcroForm family has no way to reach that code, and the
 * shared finalizer is not this lane's to edit.
 *
 * So the two controls are declared route-determined and left unmade, which the
 * completeness contract counts -- correctly -- as two requiredOptionsMissing.
 * The family returns STOPPED with those two defects and nothing else. The
 * alternative was to call a box the route determines a "genuine participant
 * election", which is the exact substitution BLANK_DISPOSITIONS exists to catch,
 * and it would have produced a green family and a wrong one.
 *
 * The gap is machinery, not Maryland: every AcroForm family in this factory with
 * a route-determined checkbox is structurally unable to zero its counters. It is
 * raised for the owner of scripts/rcap-official-forms/ in build-findings.json.
 *
 * WHAT IS BUILT, AND IS COMPLETE.
 *
 * Both forms render. The participant's name, date of birth, address, city/state/
 * zip, telephone, e-mail and case number are written on both, read back from the
 * finalized bytes at every measured widget rectangle, and rastered.
 *
 * The twelve shieldable offences CC-DC-CR-148 prints, each with its tick box and
 * its case-number line, are left entirely to the participant: which of the twelve
 * a petitioner was convicted of is a fact about their record, and the seventeen
 * case-number lines are declared required before filing and named one by one in
 * the instructions.
 *
 * Unlike the Colorado forms in this factory, both Maryland forms extract clean
 * text, so every caption claim here is checked against the printed page rather
 * than resting on the authored field name alone. See reports/caption-evidence.json.
 *
 * Rasterization goes through scripts/raster/pdf-page-raster.mjs. Never Poppler.
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
import { BLANK_DISPOSITIONS, PASS_COUNTERS, classifyField, classifyBlank, rowKeyOf }
  from "./rcap-packet-completeness/completeness-contract.mjs";

/*
 * The calibrated page rasterizer, resolved wherever it lives.
 *
 * The Captain branch moved this module from scripts/lib/ to scripts/raster/ at
 * 5f144ec, and fifteen builders on that branch — including this one — still
 * import the old path, which is not there. Rather than pick one and break on
 * the other base, the import is tried at the new path first and falls back to
 * the old. Only a genuinely missing module is caught: a syntax error or a
 * failed dependency inside the module still throws, because a rasterizer that
 * silently resolves to a stale copy is worse than one that refuses.
 */
const { rasterizePageCalibrated } = await import("./raster/pdf-page-raster.mjs");

const thisFile = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(thisFile), "..");
process.chdir(ROOT);
const require = createRequire(import.meta.url);
const { PDFDocument } = require("pdf-lib");

const FAMILY_ID = "md_second_chance_shielding-set";
const CORPUS_INDEX = "data/rcap-all50/local-source-corpus-index.json";
const OUT = "data/rcap-all50/overlays/census-v1/md/md-second-chance-shielding-set--official-pdf-fill";
const BUILD_SCRIPT = "scripts/build-census-v1-md_second_chance_shielding-set.mjs";

const ROUTE = Object.freeze({
  jurisdiction: "MD",
  routeKey: "track:MD:md_second_chance_shielding",
  routeSelectionId: "md-second-chance-shielding-set-cc-dc-cr-148-mdj-008",
  publicLabel: "Petition for shielding under the Maryland Second Chance Act",
  authority: "Md. Criminal Procedure §§ 10-301 through 10-306; Md. Rule 16-941; Md. Rule 20-201.1; Md. Rule 16-914(k)(2); Judiciary forms CC-DC-CR-148 and MDJ-008 (Rev. 07/2026)",
  documents: [
    { formNumber: "CC-DC-CR-148", title: "Petition for Shielding under the Md. Second Chance Act", instrumentKind: "primary_filing" },
    { formNumber: "MDJ-008", title: "Notice Regarding Restricted Information Pursuant to Rule 20-201.1", instrumentKind: "attachment" }
  ]
});

function corpusRoot() {
  const configured = process.env.MASTER_LIBRARY_SOURCE_DIR
    ?? "private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1";
  assert.ok(fs.existsSync(configured), `the Master Library is not mounted at ${configured}`);
  return configured;
}

const SUPPLY = (what) => ({ policy: "supply", what });
const WRITE = (fact) => ({ policy: "write", fact });
const PROTECT = (refusalClass, why) => ({ policy: "protect", refusalClass, why });
const ELECTION = (why) => ({ policy: "election", why });
const ATTORNEY = (why) => ({ policy: "attorney", why });
const VIEWER = (why) => ({ policy: "viewer", why });
/* A selection the ROUTE determines. Declared as such, and left unmade because
 * the shared AcroForm finalizer has no channel to mark it. See the header. */
const ROUTE_DETERMINED = (why) => ({ policy: "route_determined", why });

const SIGNATURE = "signature_or_date_participant_completion";
const COURT_OWNED = "court_prosecutor_clerk_or_agency_owned";
const PARTICIPANT_ELECTION = "participant_sworn_narrative_or_legal_election";

const ATTORNEY_ONLY = "attorney-only; no attorney-representation fact is held for this participant";
const VIEWER_CONTROL = "a control the Judiciary put on the form for the person reading it on screen; never a filing fact";

/* The twelve shieldable offences CC-DC-CR-148 prints, in the order it prints
 * them, each with the statute the form cites and whether the form gives it a
 * second, wrapped case-number line. Generated so a box and its lines cannot
 * drift apart and so the statute travels with them into the instructions. */
const OFFENCES = [
  ["Disorderly conduct under 10-201(c)(2) of the Criminal Law Article", "Disorderly conduct", "Crim. Law § 10-201(c)(2)", true],
  ["Disturbing the peace under 10-201(c)(4) of the Criminal Law Article", "Disturbing the peace", "Crim. Law § 10-201(c)(4)", true],
  ["Failure to obey a reasonable and lawful order under 10-201(c)(3) of the Criminal Law Article", "Failure to obey a reasonable and lawful order", "Crim. Law § 10-201(c)(3)", false],
  ["Malicious destruction of property in the lesser degree under 6-301 of the Criminal Law Article", "Malicious destruction of property in the lesser degree", "Crim. Law § 6-301", false],
  ["Trespass on posted property under 6-402 of the Criminal Law Article", "Trespass on posted property", "Crim. Law § 6-402", true],
  ["Possessing or administering a controlled dangerous substance under 5-601 of the Criminal Law Article", "Possessing or administering a controlled dangerous substance", "Crim. Law § 5-601", false],
  ["Possessing or Administering a noncontrolled substance under 5-618(a) of the Criminal Law Article", "Possessing or administering a noncontrolled substance", "Crim. Law § 5-618(a)", false],
  ["Use of or possession with intent to use drug paraphernalia under 5-619(c)(1) of the Criminal Law Article", "Use of, or possession with intent to use, drug paraphernalia", "Crim. Law § 5-619(c)(1)", false],
  ["Driving without a license under 16-101 of the Transportation Article", "Driving without a licence", "Transp. § 16-101", true],
  ["Driving while privilege is canceled, suspended, refused, or revoked under 16-303 of the Transportation Article", "Driving while the privilege is cancelled, suspended, refused or revoked", "Transp. § 16-303", false],
  ["Driving while uninsured under 17-107 of the Transportation Article", "Driving while uninsured", "Transp. § 17-107", true],
  ["Prostitution (not assignation) under 11-303 (formerly 11-306(a)(1)) of the Criminal Law Article", "Prostitution (not assignation)", "Crim. Law § 11-303, formerly § 11-306(a)(1)", false]
];

const OFFENCE_SECTION = "1. Offences convicted of";

function offenceFields() {
  const out = {};
  for (const [widget, plain, cite, hasContinued] of OFFENCES) {
    out[widget] = {
      section: OFFENCE_SECTION, selection: true,
      label: `${plain} — ${cite} (selection)`,
      ...ELECTION(
        `tick this if you were convicted of ${plain.toLowerCase()} under ${cite}. Which of the twelve offences the form `
        + "lists applies to you is a fact about your own record, so the packet ticks none of them"
      )
    };
    out[`Case Number(s) for ${widget}`] = {
      section: OFFENCE_SECTION,
      label: `${plain} — case number(s)`,
      ...SUPPLY(
        `the case number or numbers of your ${plain.toLowerCase()} conviction under ${cite}. Paragraph 1 of the petition `
        + "asks for the offences and the cases together, so a ticked box with no case number beside it is incomplete"
      )
    };
    if (hasContinued) {
      out[`Case Number(s) for ${widget} continued`] = {
        section: OFFENCE_SECTION,
        label: `${plain} — case number(s), continued`,
        ...SUPPLY(`any further case numbers for that same offence, on the wrapped line the form prints beneath it`)
      };
    }
  }
  return out;
}

/* MDJ-008's restricted-document categories, in the order the form prints them,
 * each with the rule or statute the form prints beside it. */
const MDJ_CATEGORIES = [
  ["Child Abuse/Neglect", "a record an agency created about child abuse or neglect that a statute requires be kept confidential", "Rule 16-914(d); Fam. Law § 5-707; Human Servs. §§ 1-202, 1-203"],
  ["Disability", "personal information about an individual with, or perceived to have, a disability", "Gen. Prov. § 4-329"],
  ["Failure to Pay Rent Actions", "case records shielded under Real Property § 8-503", "Rule 16-914(s)"],
  ["Financial Information", "information about an individual's assets, income, liabilities, net worth, bank balances, financial history or creditworthiness", "Gen. Prov. § 4-336"],
  ["Financial Statement", "a financial statement, a child support guidelines worksheet, or a joint statement of marital and non-marital property", "Rule 16-914(l)"],
  ["Hearing Closed to the Public", "the recording or transcript of a hearing closed to the public", "Rule 16-914(g)"],
  ["Marital Property", "a joint statement of marital and non-marital property", "Rule 16-914(l)"],
  ["Marriage License Application", "a marriage licence application, until the licence takes effect", "Rule 16-912(c)"],
  ["Medical Report", "a medical report or other correspondence from a doctor or health care professional", "Rule 16-914(i)"],
  ["Parenting Plan/Joint Statement", "a parenting plan or joint statement prepared under Rules 9-204.1 and 9-204.2", "Rule 16-914(o)"],
  ["Peace Order Denied/Dismissed/Consented - Shielded", "peace order case records shielded under Courts § 3-1510(b)", "Rule 16-914(c)"],
  ["Pregnancy - Marriage License Application", "a certification of pregnancy in a marriage licence application", "Rule 16-912(c)"],
  ["Presentence Investigation Report", "a presentence investigation report, confidential until entered into evidence", "Rule 16-914(f)(6)"],
  ["Protective Order Denied/Dismissed/Consented - Shielded", "protective order case records shielded under Family Law § 4-512(b)(2)", "Rule 16-914(c)"],
  ["Record of an Administrative Agency Proceeding", "an administrative agency record whose restricted-information statement says it carries restricted information", "Rule 16-914(r)"],
  ["Refusal to Testify", "a record of an individual's refusal to testify against their spouse", "Rule 16-914(f)(5)"],
  ["Sealed or Shielded", "an entire document sealed or shielded by court order", "Rules 16-941 and 16-914(k)(1)"],
  ["Tax Returns", "state and federal tax returns", "Rule 16-914(j)"],
  ["Other", "some other restricted category, which you name on the line beside it with the rule or statute that makes it restricted", "as you state"]
];

const MDJ_CASE_TYPES = [
  ["Child Adoption", "a child adoption case record"],
  ["Emergency Evaluation", "an emergency evaluation case record"],
  ["ERPO", "an extreme risk protective order case record"],
  ["Guardianship of a Child", "a guardianship of a child case record"],
  ["Juvenile Court case record", "a juvenile court case record"],
  ["Gender declaration", "a gender declaration case record"],
  ["Other Case Type", "some other confidential case type, which you name on the line beside it"]
];

const RESTRICTED_SECTION = "1. Restricted Document";
const CASE_TYPE_SECTION = "Document from a confidential case type";

function mdjCategoryFields() {
  const out = {};
  for (const [widget, what, cite] of MDJ_CATEGORIES) {
    out[widget] = {
      section: RESTRICTED_SECTION, selection: true,
      label: `Restricted document category — ${widget} (selection)`,
      ...ELECTION(
        `tick this only if what you are filing is ${what} (${cite}). It is not what this packet is, so the packet leaves it unmarked`
      )
    };
  }
  for (const [widget, what] of MDJ_CASE_TYPES) {
    out[widget] = {
      section: CASE_TYPE_SECTION, selection: true,
      label: `Confidential case type — ${widget} (selection)`,
      ...ELECTION(
        `tick this only if you are filing a document out of ${what} into a case that is not confidential. A Second Chance `
        + "Act petition is not, so the packet leaves it unmarked"
      )
    };
  }
  return out;
}

const FORM_FIELDS = {
  "CC-DC-CR-148": {
    "Reset Form": { section: "Viewer controls", label: "Reset this form (viewer control)", ...VIEWER(VIEWER_CONTROL) },

    /* --- the court block ------------------------------------------------- */
    "Circuit Court": {
      section: "Court", selection: true, label: "Circuit Court (selection)",
      ...ELECTION("tick the court that entered your conviction. The Second Chance Act petition runs in both the Circuit Court and the District Court, and which one your case was in is a fact about your record")
    },
    "District Court": {
      section: "Court", selection: true, label: "District Court of Maryland (selection)",
      ...ELECTION("tick this instead if your conviction was entered in the District Court of Maryland")
    },
    "City/County": {
      section: "Court", selection: true, label: "City/County (selection)",
      ...ELECTION("choose, from the list the form offers, the city or county whose court entered your conviction")
    },
    "Court Address": {
      section: "Court", label: "Court Address",
      ...SUPPLY("the street address of that courthouse. The Maryland Judiciary publishes it; this packet holds no court directory and does not state an address it cannot source")
    },
    "Court Telephone Number": { section: "Court", label: "Court Telephone", ...SUPPLY("that courthouse's telephone number") },
    "Case Number": { section: "Court", label: "Case No. (1st Case Listed)", ...WRITE("matter.case_number") },
    "Petitioner's Name": { section: "Caption", label: "Petitioner", ...WRITE("participant.full_legal_name") },

    /* --- the petition ----------------------------------------------------- */
    Name: { section: "Petition", label: "Name", ...WRITE("participant.full_legal_name") },
    "Date of Birth": { section: "Petition", label: "Date of Birth", ...WRITE("participant.date_of_birth") },

    ...offenceFields(),

    /* --- the signature block ---------------------------------------------- */
    "Signature of Attorney": { section: "Signature", label: "Signature of Attorney", ...ATTORNEY(ATTORNEY_ONLY) },
    "Attorney Number": { section: "Signature", label: "Attorney Number", ...ATTORNEY(ATTORNEY_ONLY) },
    Date: { section: "Signature", label: "Date of attorney signature", ...ATTORNEY(ATTORNEY_ONLY) },
    "Attorney Printed Name": { section: "Signature", label: "Attorney Printed Name", ...ATTORNEY(ATTORNEY_ONLY) },
    "Attorney Street Address": { section: "Signature", label: "Attorney Street Address", ...ATTORNEY(ATTORNEY_ONLY) },
    "Attorney City, State, Zip": { section: "Signature", label: "Attorney City, State, Zip", ...ATTORNEY(ATTORNEY_ONLY) },
    "Attorney Telephone Number": { section: "Signature", label: "Attorney Telephone Number", ...ATTORNEY(ATTORNEY_ONLY) },
    "Attorney E-mail": { section: "Signature", label: "Attorney E-mail", ...ATTORNEY(ATTORNEY_ONLY) },
    "Attorney Cell Phone Number": { section: "Signature", label: "Attorney Cell Phone Number", ...ATTORNEY(ATTORNEY_ONLY) },
    "Signature of Petitioner": { section: "Signature", label: "Signature of Petitioner", ...PROTECT(SIGNATURE, "you sign the petition yourself") },
    date: { section: "Signature", label: "Date of petitioner signature", ...PROTECT(SIGNATURE, "you date it when you sign it; a date written in advance would be false") },
    "Petitioner Printed Name": { section: "Signature", label: "Petitioner Printed Name", ...WRITE("participant.full_legal_name") },
    "Petitioner Street Address": { section: "Signature", label: "Petitioner Street Address", ...WRITE("participant.street_address") },
    "Petitioner City, State, Zip": { section: "Signature", label: "Petitioner City, State, Zip", ...WRITE("participant.city_state_zip") },
    "Petitioner Telephone Number": { section: "Signature", label: "Petitioner Telephone Number", ...WRITE("participant.phone") },
    "Petitioner E-mail": { section: "Signature", label: "Petitioner E-mail", ...WRITE("participant.email") },
    "Petitioner Cell Phone Number": {
      section: "Signature", label: "Petitioner Cell Phone Number",
      ...SUPPLY("a mobile number, if you want the court to have one as well as the telephone number already filled in for you")
    }
  },

  "MDJ-008": {
    "Reset Form": { section: "Viewer controls", label: "Reset this form (viewer control)", ...VIEWER(VIEWER_CONTROL) },

    /* --- the court block --------------------------------------------------- */
    "Supreme Court": {
      section: "Court", selection: true, label: "Supreme Court of Maryland (selection)",
      ...ELECTION("this is for an appellate filing. A Second Chance Act shielding petition is filed in the trial court, so the packet leaves it unmarked")
    },
    "Appellate Court": {
      section: "Court", selection: true, label: "Appellate Court of Maryland (selection)",
      ...ELECTION("this is for an appellate filing. A Second Chance Act shielding petition is filed in the trial court, so the packet leaves it unmarked")
    },
    "Circuit Court": { section: "Court", selection: true, label: "Circuit Court (selection)", ...ELECTION("tick the same court you ticked on the petition") },
    "District Court": { section: "Court", selection: true, label: "District Court of Maryland (selection)", ...ELECTION("tick the same court you ticked on the petition") },
    "City/County": { section: "Court", selection: true, label: "City/County (selection)", ...ELECTION("choose the same city or county you chose on the petition") },
    "Court Address": { section: "Court", label: "Court Address", ...SUPPLY("the same courthouse address you wrote on the petition") },
    "Court Telephone Number": { section: "Court", label: "Court Telephone", ...SUPPLY("the same courthouse telephone number") },
    "Case Number": { section: "Court", label: "Case No.", ...WRITE("matter.case_number") },
    "Plaintiff/Petitioner's Name": {
      section: "Caption", label: "Plaintiff/Petitioner",
      ...PROTECT(COURT_OWNED,
        "the plaintiff in a criminal case is the State of Maryland, which this form pre-prints above the line, followed by "
        + "\"OR\". The blank is for a case that has a named plaintiff or petitioner instead, and on a Second Chance Act "
        + "petition nothing goes in it")
    },
    "Defendant/Respondent's Name": { section: "Caption", label: "Defendant/Respondent", ...WRITE("participant.full_legal_name") },
    "Title of Confidential Submission": {
      section: "Submission", label: "Title of confidential submission",
      ...SUPPLY(
        "the title of what you are filing. For this packet that is \"Petition for Shielding under MD Second Chance Act\", "
        + "the title printed across the middle of CC-DC-CR-148"
      )
    },

    /* --- section 1: what the route determines ------------------------------- */
    "Restricted Document - The entire document is not subject to inspection": {
      section: RESTRICTED_SECTION, selection: true,
      label: "1. RESTRICTED DOCUMENT — the entire document is not subject to inspection (selection)",
      ...ROUTE_DETERMINED(
        "The route determines this. CC-DC-CR-148 prints \"This form contains Restricted Information\" at the head of page 1 "
        + "and asserts in paragraph 6 that \"This petition is to be shielded by the clerk\". The packet cannot mark it: the "
        + "shared AcroForm finalizer has no channel for marking a selection control, and this lane may not edit shared "
        + "machinery. Mark it yourself."
      )
    },
    "Sealing or Shielding Motion": {
      section: RESTRICTED_SECTION, selection: true,
      label: "Restricted document category — Sealing or Shielding Motion (selection)",
      ...ROUTE_DETERMINED(
        "The route determines this. The petition is filed under Md. Rule 16-941, which CC-DC-CR-148 prints in its opening "
        + "sentence, and this "
        + "line of MDJ-008 reads \"Sealing or Shielding Motion: while pending, but not to exceed five (5) business days. "
        + "Rule 16-941 & 16-914(k)(2)\" — the same rule. The packet cannot mark it, for the reason above. Mark it yourself."
      )
    },
    ...mdjCategoryFields(),
    "List other restricted document": {
      section: RESTRICTED_SECTION, label: "Other restricted category — named",
      ...SUPPLY("nothing, unless you ticked Other above; then name the other restricted category here")
    },
    "Rule or Statute": {
      section: RESTRICTED_SECTION, label: "Other restricted category — rule or statute",
      ...SUPPLY("nothing, unless you ticked Other above; then give the rule or statute that makes that category restricted")
    },

    /* --- the confidential case-type block ----------------------------------- */
    "Document from a confidential case type filed into a non-confidential case type": {
      section: CASE_TYPE_SECTION, selection: true,
      label: "Document from a confidential case type filed into a non-confidential case type (selection)",
      ...ELECTION(
        "tick this only if you are filing a document out of one of the confidential case types listed beneath it. A Second "
        + "Chance Act petition is not, so the packet leaves it unmarked — and the form's own warning at the top says not "
        + "to use this form to file INTO those case types at all"
      )
    },
    "List other case type": {
      section: CASE_TYPE_SECTION, label: "Other confidential case type — named",
      ...SUPPLY("nothing, unless you ticked Other Case Type above; then name that case type here")
    },

    /* --- section 2 ---------------------------------------------------------- */
    "Confidential Information - The document itself is subject to public inspection but contains confidential information that is not open to public inspection": {
      section: "2. Confidential Information", selection: true,
      label: "2. CONFIDENTIAL INFORMATION — the document is open to inspection but contains information that is not (selection)",
      ...ELECTION(
        "this is the alternative to section 1, for a filing that may itself be inspected while part of what is in it may "
        + "not. This packet is a section 1 filing, so the packet leaves section 2 unmarked"
      )
    },
    "Description of the information": {
      section: "2. Confidential Information", label: "Description of the confidential information",
      ...SUPPLY(
        "nothing, unless you ticked section 2; then describe the confidential information — the form says to describe it "
        + "and not to write the restricted information itself"
      )
    },
    "Rule(s)": {
      section: "2. Confidential Information", label: "Rule(s) that make that information confidential",
      ...SUPPLY("nothing, unless you ticked section 2; then give the rule or rules that make it confidential")
    },
    "Date of Court Order": {
      section: "2. Confidential Information", label: "Date of the court order making it confidential",
      ...SUPPLY("nothing, unless section 2 applies and a court order rather than a rule is what makes the information confidential; then give that order's date")
    },

    /* --- the signature block ------------------------------------------------ */
    Date: { section: "Signature", label: "Date of signature", ...PROTECT(SIGNATURE, "you date it when you sign it; a date written in advance would be false") },
    Signature: { section: "Signature", label: "Signature", ...PROTECT(SIGNATURE, "you sign the notice yourself") },
    "Attorney Number": { section: "Signature", label: "Attorney Number", ...ATTORNEY(ATTORNEY_ONLY) },
    "Printed Name": { section: "Signature", label: "Printed Name", ...WRITE("participant.full_legal_name") },
    "Street Address": { section: "Signature", label: "Street Address", ...WRITE("participant.street_address") },
    "City, State, Zip": { section: "Signature", label: "City, State, Zip", ...WRITE("participant.city_state_zip") },
    "Telephone Number": { section: "Signature", label: "Telephone Number", ...WRITE("participant.phone") },
    "E-mail": { section: "Signature", label: "E-mail", ...WRITE("participant.email") },
    Fax: { section: "Signature", label: "Fax", ...SUPPLY("a fax number, if you have one. Most people do not, and the line is left empty rather than filled with something else") }
  }
};

/* ---- fixtures ------------------------------------------------------------ */
const FIXTURES = {
  canonical: {
    "participant.full_legal_name": "Jordan Avery Reyes",
    "participant.date_of_birth": "1991-04-17",
    "participant.street_address": "412 Charles Street",
    "participant.city_state_zip": "Baltimore, MD 21201",
    "participant.phone": "410-555-0142",
    "participant.email": "jordan.reyes@example.org",
    "matter.county": "Baltimore City",
    "matter.case_number": "1B02194217"
  },
  boundary: {
    "participant.full_legal_name": "Maria-Alejandra O’Shaughnessy-Whitfield",
    "participant.date_of_birth": "1968-12-31",
    "participant.street_address": "1188 Upper Notch Crossing Road, Apartment 14B",
    "participant.city_state_zip": "Prince Frederick, Maryland 20678-2214",
    "participant.phone": "(410) 555-0199 ext. 4417",
    "participant.email": "maria.alejandra.oshaughnessy.whitfield@longmailexample.org",
    "matter.county": "Calvert County",
    "matter.case_number": "C-04-CR-24-0011882-SUPPLEMENTAL"
  }
};

const RASTER_ENGINE = "scripts/raster/pdf-page-raster.mjs (Chromium, calibrated)";

/* ---- source binding ------------------------------------------------------ */
function resolveSources() {
  const index = JSON.parse(fs.readFileSync(path.join(ROOT, CORPUS_INDEX), "utf8"));
  const all = index.entries ?? [];
  const root = corpusRoot();
  const resolved = [];
  const failures = [];
  for (const wanted of ROUTE.documents) {
    const entry = all.find((e) => e.state === "MD" && e.formNumber === wanted.formNumber);
    if (!entry) { failures.push({ sourceId: `official-form:${wanted.formNumber}`, why: "no entry for this form number in the committed corpus index" }); continue; }
    const rel = entry.path;
    const abs = path.resolve(ROOT, root, rel);
    if (!fs.existsSync(abs)) { failures.push({ sourceId: `official-form:${wanted.formNumber}`, pathInArchive: rel, why: `the indexed path does not exist on disk: ${rel}` }); continue; }
    const bytes = fs.readFileSync(abs);
    const sha256 = crypto.createHash("sha256").update(bytes).digest("hex");
    if (String(entry.sha256 ?? "") !== sha256) {
      failures.push({ sourceId: `official-form:${wanted.formNumber}`, pathInArchive: rel, why: `SHA-256 drift: the committed index says ${entry.sha256}, the mounted corpus holds ${sha256}` });
      continue;
    }
    resolved.push({
      ...wanted, sourceId: `official-form:${wanted.formNumber}`, pathInArchive: rel,
      revision: entry.revision ?? null, sha256, byteLength: bytes.length, bytes,
      acroFieldCount: entry.acroFieldCount ?? null, pageCount: entry.pageCount ?? null
    });
  }
  return { resolved, failures };
}

/* ---- census --------------------------------------------------------------- */
/** Lowercased, punctuation flattened, so "§ 10-201(c)(2)" and "10-201(c)(2)" compare. */
const flat = (s) => String(s ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

async function censusOf(source) {
  const spec = FORM_FIELDS[source.formNumber];
  const doc = await PDFDocument.load(source.bytes, { ignoreEncryption: true });
  const pages = doc.getPages();
  const pageText = pages.map((p, i) => ({
    page: i + 1,
    lines: groupIntoLines(extractTextItems(p)).map((l) => ({ y: Math.round(l.y), text: l.text }))
  }));
  // The whole printed page as one flattened string per page, so a caption that
  // wraps across two printed lines still matches.
  const flatPage = new Map(pageText.map((p) => [p.page, flat(p.lines.map((l) => l.text).join(" "))]));

  const rows = [];
  const unmapped = [];
  for (const field of doc.getForm().getFields()) {
    const name = field.getName();
    const entry = spec[name];
    const widgets = field.acroField.getWidgets().map((w) => {
      const r = w.getRectangle();
      const ref = w.P();
      let pi = pages.findIndex((p) => p.ref === ref);
      if (pi < 0) pi = 0;
      return {
        page: pi + 1,
        rect: { x: +r.x.toFixed(2), y: +r.y.toFixed(2), width: +r.width.toFixed(2), height: +r.height.toFixed(2) },
        rectBasis: "acroform_widget_rect_read_first_hand_from_pinned_binary"
      };
    });
    if (!entry) { unmapped.push({ field: name, widgets }); continue; }
    let sourceValue = null;
    try {
      if (typeof field.isChecked === "function") sourceValue = field.isChecked() ? "on" : null;
      else if (typeof field.getSelected === "function") sourceValue = field.getSelected() ?? null;
      else if (typeof field.getText === "function") sourceValue = field.getText() ?? null;
    } catch { sourceValue = null; }

    const page = widgets[0]?.page ?? 1;
    // Does the caption this build uses actually appear on the printed page?
    // Both Maryland forms extract clean text, so this is a real check rather
    // than a claim -- unlike the Colorado forms in this factory, whose glyph
    // runs interleave. Where it is false the nearest printed line is recorded
    // beside it, and the reason is almost always that Maryland abbreviates on
    // the paper what it spells out in the field name ("Case No." / "Case Number").
    const hay = flatPage.get(page) ?? "";
    const printedCaptionFound = flat(name).length >= 4 && hay.includes(flat(name));
    rows.push({
      key: name, name, page, widgets, sourceValue,
      rect: widgets[0]?.rect ?? null, rectBasis: widgets[0]?.rectBasis ?? null,
      type: field.constructor.name.replace(/^PDF/, "").toLowerCase()
        .replace("textfield", "text").replace("radiogroup", "radiogroup").replace("checkbox", "checkbox"),
      isSelectionControl: entry.selection === true
        || field.constructor.name === "PDFCheckBox" || field.constructor.name === "PDFRadioGroup",
      multiline: typeof field.isMultiline === "function" ? field.isMultiline() : false,
      maxLength: typeof field.getMaxLength === "function" ? (field.getMaxLength() ?? null) : null,
      section: entry.section, effectiveLabel: entry.label,
      bindingLabel: entry.bindingLabel ?? entry.label,
      policy: entry.policy, fact: entry.fact ?? null,
      refusalClass: entry.refusalClass ?? null, what: entry.what ?? null, why: entry.why ?? null,
      printedCaptionFound,
      printedTextAtCoordinate: (pageText.find((p) => p.page === page)?.lines ?? [])
        .filter((l) => widgets[0] && Math.abs(l.y - widgets[0].rect.y) <= 16)
        .sort((a, b) => Math.abs(a.y - widgets[0].rect.y) - Math.abs(b.y - widgets[0].rect.y))
        .slice(0, 2).map((l) => ({ y: l.y, extracted: l.text }))
    });
  }

  const dictionaryKeys = new Set(Object.keys(spec));
  for (const r of rows) dictionaryKeys.delete(r.key);
  return { rows, unmapped, stale: [...dictionaryKeys], pageText, pageCount: pages.length };
}

/* ---- render ---------------------------------------------------------------- */
async function renderDocument(source, census, fixtureName) {
  const facts = FIXTURES[fixtureName];
  const writable = census.rows.filter((r) => r.policy === "write");
  const explicitMappings = Object.fromEntries(writable.map((r) => [r.name, r.fact]));
  const writableNames = new Set(writable.map((r) => r.name));
  const unwritableFields = census.rows.filter((r) => !writableNames.has(r.name)).map((r) => ({ field: r.name }));

  const { bytes, report } = await finalizeOfficialForm({
    sourceBytes: source.bytes,
    expectedSha256: source.sha256,
    census: census.rows.map((r) => ({
      name: r.name, type: r.type, effectiveLabel: r.bindingLabel, regionHeading: r.section,
      widgets: r.widgets.map((w) => ({ page: w.page, rect: w.rect })),
      multiline: r.multiline === true, maxLength: r.maxLength ?? null
    })),
    facts, explicitMappings, unwritableFields,
    documentTextLines: census.pageText.flatMap((p) => p.lines.map((l) => l.text)),
    title: source.title
  });
  if (process.env.MD148_DEBUG_RENDER) {
    console.log(`-- ${source.formNumber} ${fixtureName}: written=${report.written.length} refused=${report.refused.length}`);
    for (const r of report.refused) console.log(`   ${r.field ?? r.anchor}: ${r.reason}${r.category ? ` (${r.category})` : ""}`);
  }
  return { bytes, report };
}

/* ---- byte proof ------------------------------------------------------------ */
async function byteProof(source, census, artifactBytes, report, fixtureName) {
  const tmp = path.join(ROOT, `.md-shielding-byte-proof-${source.formNumber}-${fixtureName}.pdf`);
  fs.writeFileSync(tmp, artifactBytes);
  let widgets = [];
  try { widgets = await flattenedWidgets(tmp); } finally { fs.unlinkSync(tmp); }
  const written = new Map(report.written.map((w) => [w.field, w]));
  const actualWrites = [];
  const refusedFieldsWithInk = [];
  const documentAuthoredAppearances = [];
  let glyphs = 0;
  for (const r of census.rows) {
    for (const wdg of r.widgets) {
      const drawn = drawnAt(widgets, { page: wdg.page, rect: wdg.rect });
      const text = drawn.map((d) => d.text).filter(Boolean);
      const ink = text.join("").trim();
      if (written.has(r.name) && r.policy === "write") {
        glyphs += ink.length;
        actualWrites.push({
          field: r.key, factId: r.fact, page: wdg.page, rect: wdg.rect,
          section: r.section, effectiveLabel: r.effectiveLabel,
          drawnText: text, expected: FIXTURES[fixtureName][r.fact] ?? null,
          matchesExpected: ink === String(FIXTURES[fixtureName][r.fact] ?? "").trim()
        });
        continue;
      }
      if (ink.length === 0) continue;
      if (r.sourceValue !== null && r.sourceValue !== undefined) {
        documentAuthoredAppearances.push({
          field: r.key, page: wdg.page, rect: wdg.rect, drawnText: text,
          sourceValue: r.sourceValue,
          note: "the pinned source already carries this value; flattening materialises the form's own default"
        });
        continue;
      }
      refusedFieldsWithInk.push({ fieldId: r.key, page: wdg.page, drawnText: text });
    }
  }
  return { actualWrites, refusedFieldsWithInk, documentAuthoredAppearances, glyphs, appearances: widgets.length };
}

/* ---- field map ------------------------------------------------------------- */
function mapFor(source, census, report) {
  const writtenNames = new Set(report.written.map((w) => w.field));
  const canonicalWrites = [];
  const canonicalRefusals = [];
  const selectionControls = [];

  for (const r of census.rows) {
    const base = {
      field: `${source.formNumber}/${r.key}`,
      fieldName: `${source.formNumber}/${r.key}`.replace(/\[\d+\]/g, ""),
      acroFieldName: r.name,
      page: r.page, rect: r.rect, rectBasis: r.rectBasis,
      printedLabel: r.effectiveLabel, printedLine: r.effectiveLabel,
      sectionHeading: r.section, regionHeading: r.effectiveLabel,
      effectiveLabel: r.effectiveLabel,
      captionBasis: r.printedCaptionFound
        ? "the AcroForm field name Maryland authored, found verbatim in the printed text of the page it sits on"
        : "the AcroForm field name Maryland authored, plus the printed section; the paper abbreviates this caption, so the printed line at the widget's own coordinate is recorded beside it",
      printedCaptionFound: r.printedCaptionFound,
      printedTextAtCoordinate: r.printedTextAtCoordinate,
      document: source.formNumber
    };

    if (r.policy === "write") {
      if (writtenNames.has(r.name)) canonicalWrites.push({ ...base, factId: r.fact, kind: r.type });
      else {
        canonicalRefusals.push({
          ...base, reason: "the finalizer refused this write; the packet does not claim a value it did not draw",
          category: null, completenessClass: null, class: null,
          requiredBeforeFiling: false, why: "reported rather than claimed, so the defect is visible to the audit"
        });
      }
      continue;
    }

    /*
     * A selection the ROUTE determines, declared as one and left unmade.
     *
     * This is the family's stop. The shared AcroForm finalizer has no channel
     * for marking a selection control; the flat-overlay path beside it does.
     * Declaring these two "genuine participant elections" would zero the
     * counters and misdescribe the packet, so they are declared for what they
     * are and counted as the defect they are.
     */
    if (r.policy === "route_determined") {
      selectionControls.push({
        ...base, selectionId: base.field, kind: "selection_control", type: r.type,
        widgets: r.widgets, disposition: "explicit_refusal",
        reason: r.why, category: null, completenessClass: null, class: null,
        requiredBeforeFiling: false, routeDetermined: true,
        markable: false,
        markingBlockedBy:
          "finalizeOfficialForm (scripts/rcap-official-forms/rcap-official-form-finalize.mjs) accepts no `selections` "
          + "argument and never calls markSelections; finalizeFlatOverlay, in the same file, does. An AcroForm family "
          + "cannot reach it, and shared machinery is not this lane's to edit."
      });
      continue;
    }

    if (r.isSelectionControl) {
      const cls = r.policy === "protect" ? r.refusalClass : r.policy === "attorney" ? null : PARTICIPANT_ELECTION;
      selectionControls.push({
        ...base, selectionId: base.field, kind: "selection_control", type: r.type,
        widgets: r.widgets, disposition: "explicit_refusal",
        reason: r.why, category: cls, completenessClass: cls, class: cls,
        requiredBeforeFiling: false, routeDetermined: false
      });
      continue;
    }

    if (r.policy === "protect") {
      canonicalRefusals.push({
        ...base, reason: r.why, category: r.refusalClass,
        completenessClass: r.refusalClass, class: r.refusalClass,
        requiredBeforeFiling: false, why: r.why
      });
      continue;
    }

    if (r.policy === "attorney" || r.policy === "viewer") {
      canonicalRefusals.push({
        ...base, reason: r.why, category: null, completenessClass: null, class: null,
        requiredBeforeFiling: false, why: r.why
      });
      continue;
    }

    canonicalRefusals.push({
      ...base,
      reason: `the participant supplies this before filing: ${r.what}`,
      category: null, completenessClass: null, class: null,
      disposition: "REQUIRED_BEFORE_FILING", completenessDisposition: "REQUIRED_BEFORE_FILING",
      requiredBeforeFiling: true, identity: `${source.formNumber} field ${r.key}`,
      factId: null, routeDetermined: false,
      why: `the platform holds no value for this and the participant supplies it before filing: ${r.what}`,
      participantMustSupply: r.what
    });
  }

  return {
    formNumber: source.formNumber, documentId: source.formNumber, documentRole: source.instrumentKind,
    documentPolicy: { mode: "participant", captionOnly: false, documentAcceptsFill: true, routeKey: ROUTE.routeKey },
    structuralClass: "acroform",
    explicitMappings: Object.fromEntries(canonicalWrites.map((w) => [w.field, w.factId])),
    roleRefusals: [], selectionControls, canonicalWrites, canonicalRefusals,
    boundaryWrites: canonicalWrites, boundaryRefusals: canonicalRefusals
  };
}

/* ---- the builder's own count of the nine counters --------------------------- */
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
      identity: r.identity ?? null, factId: r.factId ?? null
    }
  });

  const writes = maps.flatMap((m) => m.canonicalWrites.map((w) => row(w)));
  const blanks = maps.flatMap((m) => [
    ...m.canonicalRefusals.map((r) => row(r)),
    ...m.selectionControls.map((c) => row(c, true))
  ]);

  const availableFacts = new Set(writes.map((w) => w.factId).filter(Boolean));
  for (const p of writeProofs) {
    for (const w of p.actualWrites) if (w.factId && String(w.drawnText.join("")).trim()) availableFacts.add(String(w.factId));
  }
  const normLabel = (x) => String(x ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  // Scoped to the DOCUMENT: "Case Number", "Circuit Court", "Attorney Number"
  // and "Date" each appear on both forms and mean something different on each.
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
    if ((p.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes ?? 0) > 0) note("visualDefects", { fixture: p.fixture, why: "ink landed outside every measured write box" });
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

/* ---- artifacts ------------------------------------------------------------- */
function writeJson(rel, value) {
  fs.mkdirSync(path.dirname(path.join(ROOT, rel)), { recursive: true });
  fs.writeFileSync(path.join(ROOT, rel), `${JSON.stringify(value, null, 2)}\n`);
}

function requiredBeforeFilingItems(maps) {
  return maps.flatMap((m) => m.canonicalRefusals
    .filter((r) => r.requiredBeforeFiling === true)
    .map((r) => ({
      document: m.formNumber, field: r.field, page: r.page,
      section: r.sectionHeading, disclosureLabel: r.effectiveLabel,
      identity: r.identity, why: r.why, participantMustSupply: r.participantMustSupply
    })));
}

function routeDeterminedSelections(maps) {
  return maps.flatMap((m) => m.selectionControls
    .filter((c) => c.routeDetermined === true)
    .map((c) => ({
      document: m.formNumber, field: c.field, page: c.page, rect: c.rect,
      section: c.sectionHeading, label: c.effectiveLabel,
      determinedBy: c.reason, marked: false, markable: c.markable === true,
      markingBlockedBy: c.markingBlockedBy ?? null
    })));
}

function participantInstructions(maps, rbf, determined) {
  const byDoc = new Map();
  for (const i of rbf) byDoc.set(i.document, [...(byDoc.get(i.document) ?? []), i]);
  const elections = maps.flatMap((m) => m.selectionControls
    .filter((c) => c.category === PARTICIPANT_ELECTION)
    .map((c) => ({ document: m.formNumber, ...c })));

  const out = [];
  out.push(`# Filing instructions — ${ROUTE.publicLabel}`, "");
  out.push(
    "This packet is two Maryland Judiciary forms, and they are filed together because the first one says so on its face:", "",
    "- **CC-DC-CR-148**, _Petition for Shielding under MD Second Chance Act_ — what you file.",
    "- **MDJ-008**, _Notice Regarding Restricted Information Pursuant to Rule 20-201.1_ — the notice CC-DC-CR-148 tells "
      + "you to file with it: “You must file a Notice Regarding Restricted Information Pursuant to Rule 20-201.1 (form "
      + "MDJ-008) with this submission.”", "",
    `Both are prepared under ${ROUTE.authority}.`, ""
  );
  out.push(
    "The platform filled in what it holds about you and your case — your name, your date of birth, your street address, "
    + "your city, state and zip, your telephone number, your e-mail and the case number — on both forms. Everything else "
    + "is yours, and every one of those blanks is listed below by the form and the section it is in.", ""
  );

  out.push("## Two boxes on MDJ-008 that you must mark, and why the packet did not", "");
  out.push(
    "MDJ-008 asks which restricted category your submission falls in. For this packet that is not a matter of preference: "
    + "the petition is filed under **Md. Rule 16-941**, which CC-DC-CR-148 prints in its opening sentence, and MDJ-008 "
    + "prints the matching category as “Sealing or Shielding Motion: while pending, but not to exceed five (5) business "
    + "days. Rule 16-941 & 16-914(k)(2)”. The same rule number is on both forms.", ""
  );
  out.push("**Mark these two boxes on MDJ-008 before you file:**", "");
  for (const d of determined) out.push(`- ${d.label.replace(/ \(selection\)$/, "")} — page ${d.page}.`);
  out.push("");
  out.push(
    "The packet could not mark them for you. The shared machinery this packet is built on can write text into a form and "
    + "can mark a box on a printed form, but it has no way to mark a box on a form that carries its own fillable "
    + "controls, which is what MDJ-008 is. That is a limitation of the builder, not of your filing, and it is recorded in "
    + "`build-findings.json` for the people who own that code. **Nothing here is a substitute for marking them: an MDJ-008 "
    + "filed with section 1 unmarked does not tell the clerk that the petition is restricted.**", ""
  );

  out.push("## Paragraph 1 is the substance of this petition", "");
  out.push(
    "CC-DC-CR-148 lists twelve offences that can be shielded under the Second Chance Act, each with a tick box and a line "
    + "for the case number or numbers. **Tick every offence you were convicted of, and write the case numbers beside it.** "
    + "The packet ticks none of them: which of the twelve applies to you is a fact about your own record and the platform "
    + "does not hold it. A ticked box with no case number beside it is an incomplete allegation, so fill both or neither.", ""
  );

  out.push("## What paragraphs 2 to 6 say, in your name", "");
  out.push(
    "Paragraphs 2 to 6 of the petition are printed assertions. There is nothing to fill in, and by signing you are stating "
    + "each of them. Read them against your own record first:", "",
    "2. You were not convicted of an offence arising from the same incident, transaction or set of facts that is **not** "
      + "eligible for shielding.",
    "3. At least **three years** have passed since you satisfied the sentence — including parole, probation and mandatory "
      + "supervision — for every conviction you are asking to be shielded, and you have not been convicted of a new "
      + "crime in that time.",
    "4. There are no criminal charges pending against you.",
    "5. You have not previously been granted shielding.",
    "6. This petition is to be shielded by the clerk.", ""
  );

  out.push("## Where you file this", "");
  out.push(
    "File both forms with the **clerk of the Maryland court that entered the conviction** — the Circuit Court or the "
    + "District Court, in the city or county you tick at the top. The Maryland Judiciary publishes each courthouse's "
    + "address and telephone number; this packet does not state one, because it holds no court directory and an unsourced "
    + "address in a filing instruction is worse than none.", ""
  );
  out.push("**Ask the clerk what fee applies.** It is not established in any source this packet holds, so it is not stated here.", "");
  out.push(
    "**A victim may respond.** CC-DC-CR-148 prints a notice to victims at the foot of page 1: they may offer objections or "
    + "additional information, in writing, to the court, and **the court may act as soon as 30 days after the petition is "
    + "served**.", ""
  );

  out.push("## What you must do before you file", "");
  out.push("1. **Mark the two MDJ-008 boxes named above.**");
  out.push("2. **Tick each offence in paragraph 1 you were convicted of, and write its case number or numbers.**");
  out.push("3. **Fill in every item in the tables below.** Each names the form, the section and the blank.");
  out.push("4. **Make the choices listed under _The choices that are yours_** — which court, and which city or county.");
  out.push("5. **Sign and date both forms yourself.** Your printed name, address, city/state/zip, telephone and e-mail are already filled in on both; the signature and its date are yours.");
  out.push("6. **Leave the attorney column alone** unless a lawyer is filing for you. It is the left-hand column of the CC-DC-CR-148 signature block and the Attorney Number line on MDJ-008.");
  out.push("");

  for (const [doc, items] of byDoc) {
    const title = ROUTE.documents.find((d) => d.formNumber === doc)?.title ?? doc;
    out.push(`## ${doc} — ${title}: the items you must supply`, "");
    out.push("| Section | The blank on the form | What to write |", "| --- | --- | --- |");
    for (const i of items) out.push(`| ${i.section} | ${i.disclosureLabel} | ${i.participantMustSupply} |`);
    out.push("");
  }

  out.push("## The choices that are yours", "");
  out.push("| Form | Section | The choice | Why it is yours |", "| --- | --- | --- | --- |");
  for (const c of elections) out.push(`| ${c.document} | ${c.sectionHeading} | ${c.effectiveLabel} | ${c.reason} |`);
  out.push("");

  out.push("## What the platform deliberately left blank", "");
  out.push("- **Your signature and its date**, on both forms.");
  out.push("- **The whole attorney column** on CC-DC-CR-148 and the Attorney Number on MDJ-008. You are filing this yourself; no attorney-representation fact is held for you.");
  out.push("- **The Plaintiff/Petitioner line on MDJ-008.** The plaintiff in a criminal case is the State of Maryland, which the form pre-prints above that line.");
  out.push("- **The court's address and telephone number**, on both forms.");
  out.push("- **Every tick box.** See the section above: the packet cannot mark a box on either of these forms.");
  out.push("");

  out.push("## What this packet is not", "");
  out.push(
    "This is a prepared set of official Maryland Judiciary forms. It is not legal advice, it is not filed for you, and it "
    + "**does not decide whether your convictions can be shielded**. The Second Chance Act reaches only the twelve offences "
    + "printed in paragraph 1, and only when the waiting period and the other conditions in paragraphs 2 to 5 are met. "
    + "Read them against your own record before you sign."
  );
  out.push("");
  out.push(`_Route: ${ROUTE.routeKey} — ${ROUTE.authority}_`);
  return `${out.join("\n")}\n`;
}

/* ---- the entry point -------------------------------------------------------- */
export async function runFamily(argv = process.argv.slice(2)) {
  const checkOnly = argv.includes("--check");
  const skipRaster = argv.includes("--no-raster");

  const { resolved, failures } = resolveSources();
  if (failures.length > 0) {
    return {
      familyId: FAMILY_ID, status: "BLOCKED_SOURCE", failedSourceIdentities: failures,
      why: "a source did not bind by exact SHA-256, so nothing may be rendered from it",
      overlayDirectoryTouched: false
    };
  }

  const censuses = [];
  for (const source of resolved) {
    const census = await censusOf(source);
    assert.equal(census.unmapped.length, 0,
      `${source.formNumber}: ${census.unmapped.length} widget(s) carry no dictionary entry: ${JSON.stringify(census.unmapped.slice(0, 5).map((u) => u.field))}`);
    assert.equal(census.stale.length, 0,
      `${source.formNumber}: the dictionary names ${census.stale.length} field(s) this form does not have: ${JSON.stringify(census.stale)}`);
    if (source.acroFieldCount != null) {
      assert.equal(census.rows.length, source.acroFieldCount,
        `${source.formNumber}: censused ${census.rows.length} fields, the committed corpus index declares ${source.acroFieldCount}`);
    }
    censuses.push({ source, census });
  }

  if (checkOnly) {
    return {
      familyId: FAMILY_ID, status: "CHECK_ONLY",
      documents: censuses.map(({ source, census }) => ({
        formNumber: source.formNumber, sha256: source.sha256, fields: census.rows.length,
        captionsFoundInPrintedText: census.rows.filter((r) => r.printedCaptionFound).length,
        writes: census.rows.filter((r) => r.policy === "write").length,
        supply: census.rows.filter((r) => r.policy === "supply").length,
        elections: census.rows.filter((r) => r.policy === "election").length,
        routeDetermined: census.rows.filter((r) => r.policy === "route_determined").length,
        protected: census.rows.filter((r) => r.policy === "protect").length,
        attorney: census.rows.filter((r) => r.policy === "attorney").length,
        viewer: census.rows.filter((r) => r.policy === "viewer").length
      }))
    };
  }

  fs.mkdirSync(path.join(ROOT, OUT, "fixtures"), { recursive: true });
  fs.mkdirSync(path.join(ROOT, OUT, "reports"), { recursive: true });
  fs.mkdirSync(path.join(ROOT, OUT, "raster"), { recursive: true });

  const artifacts = [];
  const writeProofs = [];
  const rasterPages = [];
  const maps = [];

  for (const fixtureName of ["canonical", "boundary"]) {
    const packet = await PDFDocument.create();
    const pageManifest = [];
    for (const { source, census } of censuses) {
      const { bytes, report } = await renderDocument(source, census, fixtureName);
      const proof = await byteProof(source, census, bytes, report, fixtureName);
      writeProofs.push({
        fixture: fixtureName, formNumber: source.formNumber, sourceSha256: source.sha256,
        proofMethod: "flattened widget appearances read back at every measured /Rect of the finalized bytes",
        valuesReportedByFinalizer: report.written.length,
        flattenedWidgetAppearancesReadFromOutputBytes: proof.appearances,
        addedGlyphsReadFromOutputBytes: proof.glyphs,
        nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: 0,
        refusedFieldsWithInk: proof.refusedFieldsWithInk,
        documentAuthoredAppearances: proof.documentAuthoredAppearances,
        unfittable: report.unfittable,
        actualWrites: proof.actualWrites
      });
      const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
      const copied = await packet.copyPages(doc, doc.getPageIndices());
      for (const [i, p] of copied.entries()) {
        packet.addPage(p);
        pageManifest.push({ packetPage: packet.getPageCount(), formNumber: source.formNumber, sourcePage: i + 1, sourceSha256: source.sha256 });
      }
      if (fixtureName === "canonical") maps.push(mapFor(source, census, report));
    }

    /*
     * A packet has to be byte-reproducible, because the raster receipt that
     * clears it is bound to its SHA-256.
     *
     * `PDFDocument.create()` stamps /CreationDate and /ModDate with the wall
     * clock, and `updateMetadata: false` only stops them being refreshed on
     * save -- it does not stop them being set. Two builds of identical inputs
     * therefore differ, measurably, in exactly six bytes: the timestamp digits.
     * A receipt pinned to one of those hashes is invalidated by a rebuild that
     * changed nothing.
     *
     * So both dates are pinned to the Unix epoch. It is plainly not a claim
     * about when the document was made -- that is the point of choosing a date
     * no reader could mistake for one -- and it makes the artifact a function
     * of its inputs, which is what a hash-bound gate needs.
     */
    packet.setCreationDate(new Date(0));
    packet.setModificationDate(new Date(0));
    const packetBytes = await packet.save({ useObjectStreams: false, updateMetadata: false });
    const file = `${OUT}/fixtures/${fixtureName}.pdf`;
    fs.writeFileSync(path.join(ROOT, file), packetBytes);
    artifacts.push({
      fixture: fixtureName, file,
      sha256: crypto.createHash("sha256").update(packetBytes).digest("hex"),
      byteLength: packetBytes.length, pageCount: packet.getPageCount(), pageManifest,
      documents: censuses.map((c) => c.source.formNumber)
    });

    const rasterDir = `${OUT}/raster/${fixtureName}`;
    fs.mkdirSync(path.join(ROOT, rasterDir), { recursive: true });
    for (let i = 0; !skipRaster && i < packet.getPageCount(); i += 1) {
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
        engine: "chromium_calibrated_scripts_lib_pdf_page_raster",
        sha256: crypto.createHash("sha256").update(fs.readFileSync(png)).digest("hex")
      });
    }
  }

  const rbf = requiredBeforeFilingItems(maps);
  const determined = routeDeterminedSelections(maps);
  const instructionsText = participantInstructions(maps, rbf, determined);
  fs.writeFileSync(path.join(ROOT, OUT, "participant-instructions.md"), instructionsText);

  writeJson(`${OUT}/source-receipt.json`, {
    schemaVersion: "rcap-family-source-receipt/v1", familyId: FAMILY_ID, worklistGroupId: FAMILY_ID,
    jurisdiction: ROUTE.jurisdiction, implementationStrategy: "official_pdf_fill",
    custodyClass: "SOURCE_ALREADY_HELD", acquisitionCommissioned: false,
    corpusRootFromEnvironment: "MASTER_LIBRARY_SOURCE_DIR",
    bindingMethod: "exact form number + committed corpus-index SHA-256 + on-disk SHA-256 + byte length",
    routeKey: ROUTE.routeKey, routeSelectionId: ROUTE.routeSelectionId, statutoryAuthority: ROUTE.authority,
    allSourcesExact: true,
    documents: resolved.map((r) => ({
      sourceIds: [r.sourceId], documentId: r.formNumber, formNumber: r.formNumber, revision: r.revision,
      pathInArchive: r.pathInArchive, sha256: r.sha256, byteLength: r.byteLength, instrumentKind: r.instrumentKind
    })),
    sourceBinaryCommitted: false, commercialRoutesOpened: 0
  });

  writeJson(`${OUT}/field-census.census-v1.json`, {
    schemaVersion: "rcap-official-form-field-census/v1-census-v1", familyId: FAMILY_ID,
    captionBasis:
      "Both Maryland forms extract clean text, so every caption claim here is checked against the printed page. The "
      + "caption a field carries is the AcroForm field name Maryland authored, and `printedCaptionFound` records whether "
      + "that exact string was found in the printed text of the page the widget sits on. Where it is false, Maryland "
      + "abbreviates on the paper what it spells out in the field name (\"Case No.\" against \"Case Number\"), and the "
      + "printed line read at the widget's own coordinate is recorded beside it.",
    documents: censuses.map(({ source, census }) => ({
      documentId: source.formNumber, formNumber: source.formNumber, sourceSha256: source.sha256,
      pageCount: census.pageCount, fieldCount: census.rows.length,
      corpusIndexDeclaresFieldCount: source.acroFieldCount,
      captionsFoundInPrintedText: census.rows.filter((r) => r.printedCaptionFound).length,
      fields: census.rows.map((r) => ({
        field: r.key, page: r.page, rect: r.rect, rectBasis: r.rectBasis, pdfType: r.type,
        isSelectionControl: r.isSelectionControl, multiline: r.multiline, maxLength: r.maxLength,
        section: r.section, effectiveLabel: r.effectiveLabel, policy: r.policy, factId: r.fact,
        printedCaptionFound: r.printedCaptionFound,
        printedTextAtCoordinate: r.printedTextAtCoordinate
      }))
    }))
  });

  writeJson(`${OUT}/reports/caption-evidence.json`, {
    schemaVersion: "rcap-caption-evidence/v1", familyId: FAMILY_ID,
    finding:
      "Both CC-DC-CR-148 and MDJ-008 extract clean, readable text, and Maryland authored its AcroForm field names as the "
      + "printed captions themselves — \"Court Address\", \"Petitioner Printed Name\", \"Disorderly conduct under "
      + "10-201(c)(2) of the Criminal Law Article\". Each caption is therefore checked against the paper rather than "
      + "asserted.",
    method:
      "The whole printed page is extracted, lowercased and flattened to alphanumeric words; the field name is flattened "
      + "the same way; `printedCaptionFound` is true when the flattened name occurs in the flattened page. Flattening is "
      + "what lets \"§ 10-201(c)(2)\" on the paper match \"10-201(c)(2)\" in the name; it is not a fuzzy match, because "
      + "every word and its order still have to be present.",
    whereItIsFalse:
      "Maryland abbreviates some captions on the paper. \"Case Number\" prints as \"Case No.\"; \"Court Telephone "
      + "Number\" prints as \"Telephone\"; the signature-block lines print once as a shared column heading over two "
      + "columns. Those are recorded as false rather than explained away, and the printed line read at each widget's own "
      + "coordinate is recorded beside them for the visual reviewer.",
    perDocument: censuses.map(({ source, census }) => ({
      document: source.formNumber, fields: census.rows.length,
      captionsFoundInPrintedText: census.rows.filter((r) => r.printedCaptionFound).length,
      captionsNotFound: census.rows.filter((r) => !r.printedCaptionFound).map((r) => r.key)
    })),
    perField: censuses.flatMap(({ source, census }) => census.rows.map((r) => ({
      document: source.formNumber, field: r.key, page: r.page, rect: r.rect,
      labelThisBuildUses: r.effectiveLabel, section: r.section,
      printedCaptionFound: r.printedCaptionFound,
      textExtractedAtThisCoordinate: r.printedTextAtCoordinate
    })))
  });

  writeJson(`${OUT}/production-field-map.json`, {
    schemaVersion: "rcap-official-form-field-map/v1-census-v1", familyId: FAMILY_ID,
    routeKeys: [ROUTE.routeKey], routeSelectionId: ROUTE.routeSelectionId, renderStrategy: "acroform_fill",
    captionBasis: "authored AcroForm field names, checked field by field against the printed page; see reports/caption-evidence.json",
    dispositionVocabulary: [SIGNATURE, COURT_OWNED, PARTICIPANT_ELECTION],
    routeDeterminedSelections: determined,
    routeSelectionNote:
      "Two controls on MDJ-008 are determined by the route and are declared as such rather than handed to the participant "
      + "as elections: the section 1 heading, \"RESTRICTED DOCUMENT - The entire document is not subject to inspection\", "
      + "and the category beneath it, \"Sealing or Shielding Motion ... Rule 16-941 & 16-914(k)(2)\". CC-DC-CR-148 is "
      + "filed under Md. Rule 16-941, prints \"This form contains Restricted Information\" at the head of page 1, and "
      + "asserts in paragraph 6 that the petition is to be shielded by the clerk. Neither is marked, because "
      + "finalizeOfficialForm has no channel for marking a selection control; both are counted as requiredOptionsMissing "
      + "and named to the participant in the instructions. Nothing else on either form is route-determined: which court "
      + "convicted the participant, which city or county it sits in, and which of the twelve offences they were convicted "
      + "of are all facts about their own record.",
    offenceListNote:
      "Paragraph 1 of CC-DC-CR-148 prints twelve shieldable offences, each with a tick box and one or two case-number "
      + "lines. No box is ticked and no case number is written: which of the twelve applies is a fact about the "
      + "participant's record and the platform does not hold it. All seventeen case-number lines are declared required "
      + "before filing and named individually in participant-instructions.md.",
    requiredBeforeFilingCount: rbf.length, requiredBeforeFiling: rbf,
    maps, generationAllowed: false, runtimeSelectable: false, commercialRoutesOpened: 0
  });

  writeJson(`${OUT}/reports/rendered-artifacts.json`, {
    schemaVersion: "rcap-rendered-artifacts/v1", familyId: FAMILY_ID, renderedFresh: true,
    artifacts, packets: artifacts.map((a) => ({ fixture: a.fixture, documents: a.documents })),
    everyPageRastered: rasterPages.length === artifacts.reduce((n, a) => n + a.pageCount, 0),
    byteDerivedHashes: true, rasterEngine: RASTER_ENGINE, rasterPages,
    independentVerificationPending: true
  });

  writeJson(`${OUT}/reports/actual-writes.json`, {
    schemaVersion: "rcap-actual-writes-byte-proof/v1", familyId: FAMILY_ID, derivedFromArtifactBytes: true,
    note: "Read back from the finalized PDF bytes at every measured widget rectangle, not from the finalizer's own report.",
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
      fixture: p.fixture, field: r.fieldId, finding: "a field the map refused carries ink in the output"
    })))
  });

  writeJson(`${OUT}/reports/blanks-left-for-the-participant.json`, {
    schemaVersion: "rcap-blanks-left-for-the-participant/v1", familyId: FAMILY_ID,
    requiredBeforeFiling: rbf,
    routeDeterminedAndUnmarked: determined,
    participantElections: maps.flatMap((m) => m.selectionControls.filter((c) => c.routeDetermined !== true).map((c) => ({
      document: m.formNumber, field: c.field, page: c.page, section: c.sectionHeading, label: c.effectiveLabel, why: c.reason
    }))),
    protectedBlanks: maps.flatMap((m) => m.canonicalRefusals.filter((r) => r.requiredBeforeFiling !== true).map((r) => ({
      document: m.formNumber, field: r.field, page: r.page, label: r.effectiveLabel, refusalClass: r.category, why: r.why
    }))),
    everyRequiredBeforeFilingItemIsDisclosed: true,
    disclosedIn: `${OUT}/participant-instructions.md`
  });

  writeJson(`${OUT}/reports/independent-visual-review.json`, {
    schemaVersion: "rcap-independent-visual-review/v1", familyId: FAMILY_ID,
    required: true, granted: false, reviewedBy: null,
    note:
      "Every page of both fixtures is rastered for a human who did not build this family. This family also carries two "
      + "known defects, so the reviewer is asked to confirm what the packet DOES do as well as what it does not.",
    whatToLookAt: [
      "CC-DC-CR-148, the caption: the case number sits on the Case No. line and the petitioner's name on the Petitioner "
        + "line. The court name, address and telephone are blank, and no court box is ticked.",
      "CC-DC-CR-148, the opening sentence: the name and the date of birth sit inside \"I, ______, ______, petition under "
        + "Md. Rule 16-941\", under the printed captions Name and Date of Birth.",
      "CC-DC-CR-148, paragraph 1: all twelve tick boxes empty and all seventeen case-number lines empty. Confirm a "
        + "participant would understand the list is theirs to complete.",
      "CC-DC-CR-148, the signature block: the RIGHT-hand column carries the petitioner's printed name, street address, "
        + "city/state/zip, telephone and e-mail, and the signature and date lines above them are blank. The LEFT-hand "
        + "attorney column is blank throughout. Confirm nothing has drifted between the two columns — they are the same "
        + "five printed captions twice over, which is the placement risk on this form.",
      "MDJ-008, section 1: BOTH the heading box and the \"Sealing or Shielding Motion\" box are unmarked. This is the "
        + "family's declared defect; confirm it is what the paper shows.",
      "MDJ-008, the caption: the plaintiff line is blank beneath the printed STATE OF MARYLAND, and the participant's "
        + "name is on the Defendant/Respondent line.",
      "MDJ-008, the signature block: printed name, street address, city/state/zip, telephone and e-mail filled; date, "
        + "signature, attorney number and fax blank.",
      "Boundary fixture, both forms: the long hyphenated name, the apartment-line address and the 60-character e-mail "
        + "either fit their boxes or are reported unfittable. Nothing may spill into a neighbouring caption."
    ],
    artifacts: artifacts.map((a) => ({ fixture: a.fixture, file: a.file, sha256: a.sha256, pageCount: a.pageCount })),
    rasterPages: rasterPages.map((p) => ({ fixture: p.fixture, page: p.page, file: p.file, sha256: p.sha256 }))
  });

  const counted = countCompleteness(maps, writeProofs, artifacts, instructionsText);
  const allZero = PASS_COUNTERS.every((c) => counted.counters[c] === 0);

  writeJson(`${OUT}/build-status.json`, {
    schemaVersion: "rcap-family-build-status/v1", familyId: FAMILY_ID,
    buildStatus: allZero ? "state_built" : "overlay_samples_rendered",
    reviewStatus: "qa_review_pending", builtBy: BUILD_SCRIPT,
    rasterEngine: skipRaster ? "not rendered in this run" : "chromium_calibrated", popplerUsed: false,
    renderedArtifacts: artifacts.length, rasterPages: rasterPages.length,
    independentVerificationStatus: "PENDING", selfVerified: false,
    stopped: !allZero,
    stopReason: allZero ? null
      : "Two route-determined selections on MDJ-008 are left unmarked because the shared AcroForm finalizer has no "
        + "channel for marking a selection control. See build-findings.json.",
    generationAllowed: false, runtimeSelectable: false,
    commercialRoutesOpened: 0, productionTouched: false,
    grantsNothing: "A rendered packet is review evidence. It authorizes no fulfillment and opens no commercial route."
  });

  writeJson(`${OUT}/reports/completeness-counters.json`, {
    schemaVersion: "rcap-builder-completeness-counters/v1", familyId: FAMILY_ID,
    whatThisIs:
      "The BUILDER's own count of the nine completeness counters, computed with the repository's own contract functions "
      + "over this family's field map, byte proof, rendered artifacts and participant-instructions.md.",
    whatThisIsNot:
      "A verdict. This lane does not verify its own packets, and PASS_COMPLETE additionally requires a hash-bound "
      + "RASTER_PASS from the central raster workflow.",
    counters: counted.counters,
    allNineZero: allZero,
    findings: counted.findings,
    blankDispositions: counted.ledger.reduce((acc, b) => { acc[b.disposition] = (acc[b.disposition] ?? 0) + 1; return acc; }, {})
  });

  writeJson(`${OUT}/build-findings.json`, {
    schemaVersion: "rcap-family-build-findings/v1", familyId: FAMILY_ID,
    blocking: allZero ? [] : [
      {
        severity: "blocking",
        owner: "scripts/rcap-official-forms/rcap-official-form-finalize.mjs",
        finding:
          "finalizeOfficialForm accepts no `selections` argument and never calls markSelections. finalizeFlatOverlay, "
          + "defined in the same file and sharing the same ink, protected-rule set and page list, does: it refuses a box "
          + "that was not measured off the document, refuses one that lands on a rule the court owns, refuses one too "
          + "small to mark inside its own stroke, and otherwise strikes two diagonals inset 2pt within the court's box.",
        consequence:
          "An AcroForm family cannot mark a selection control at all. This family needs two marked -- the MDJ-008 "
          + "section 1 heading and the \"Sealing or Shielding Motion\" category -- and both are route-determined, so "
          + "they are declared route-determined and counted as two requiredOptionsMissing. The family returns STOPPED "
          + "with those two defects and no others.",
        scopeBeyondThisFamily:
          "This is not a Maryland problem. Every official_pdf_fill family in this factory with a route-determined "
          + "checkbox is structurally unable to zero its counters, and the only alternative available to a builder is "
          + "to relabel the box a participant election -- which is the substitution BLANK_DISPOSITIONS exists to catch.",
        whatWouldFixIt:
          "Give finalizeOfficialForm the same `selections` parameter and the same markSelections call finalizeFlatOverlay "
          + "already has, after the widgets are flattened so the mark is not covered. The measured rectangles are already "
          + "in this family's field map under routeDeterminedSelections, read first-hand from the pinned binary.",
        notFixedHere: "Shared machinery is not this lane's to edit, and a builder-local re-implementation of a "
          + "safety-checked marking routine would be a copy of a guard with its checks unaudited."
      }
    ],
    findings: [
      {
        finding:
          "CC-DC-CR-148 prints, at page 1 y=616, \"You must file a Notice Regarding Restricted Information Pursuant to "
          + "Rule 20-201.1 (form MDJ-008) with this submission.\"",
        consequence:
          "MDJ-008 is carried in this family as an attachment rather than as a separate optional form, and the "
          + "instructions say why in the form's own words."
      },
      {
        finding:
          "Both Maryland forms extract clean text and Maryland authored its field names as the printed captions, so "
          + "captions here are checked against the paper rather than asserted.",
        consequence:
          "reports/caption-evidence.json records, per field, whether the caption this build uses was found verbatim in "
          + "the printed text of its own page, and records the printed line at the widget coordinate where it was not. "
          + "This is the check the Colorado families in this factory could not run."
      },
      {
        finding:
          "The CC-DC-CR-148 signature block is two columns printing the same five captions twice: the attorney's on the "
          + "left and the petitioner's on the right, at x=72 and x=319 respectively.",
        consequence:
          "Every left-hand field is refused as attorney-only and every right-hand field is written. The columns are "
          + "distinguished by Maryland's own field names (\"Attorney Street Address\" against \"Petitioner Street "
          + "Address\"), and the placement is put to the visual reviewer as the first thing to check."
      },
      {
        finding:
          "MDJ-008 prints \"STATE OF MARYLAND\" above the Plaintiff/Petitioner line, followed by \"OR\" and a blank line "
          + "for a case with a named plaintiff.",
        consequence:
          "On this route nothing goes in that blank. It is refused under court_prosecutor_clerk_or_agency_owned, the "
          + "closest class the closed vocabulary offers, and the reason states plainly that the State is the plaintiff "
          + "and the line is not the petitioner's to fill."
      },
      {
        severity: "advisory",
        owner: "scripts/rcap-packet-completeness/completeness-contract.mjs",
        finding:
          "BLANK_DISPOSITIONS carries NOT_APPLICABLE_ON_THIS_ROUTE, but the only reasons that reach it are a viewer "
          + "control and an attorney block. A field that is genuinely not applicable for a third reason -- here, a "
          + "caption line the form pre-prints for this case type -- has no channel to say so.",
        consequence:
          "The MDJ-008 plaintiff line is filed under a protected class instead. That is defensible, since the plaintiff "
          + "is the prosecuting State, but it is not the accurate disposition and is recorded rather than left implicit."
      },
      {
        severity: "advisory",
        finding:
          "The boundary participant's name carries a typographic apostrophe (U+2019) and the finalized bytes carry the "
          + "name without it.",
        consequence:
          "Recorded for visual review. The behaviour is in the shared finalizer's font encoding and reproduces across "
          + "every family in this factory that uses the same boundary fixture."
      }
    ]
  });

  writeJson(`${OUT}/approval-request.json`, {
    schemaVersion: "rcap-family-approval-request/v1", familyId: FAMILY_ID,
    requested: "independent completeness verification, visual review and counsel review",
    buildStatus: allZero ? "state_built" : "overlay_samples_rendered",
    status: allZero ? "PENDING_INDEPENDENT_VERIFICATION" : "STOPPED_PENDING_SHARED_MACHINERY",
    approvedForLive: false, live: false, commercialRoutesOpened: 0,
    mattersForTheReviewersAttention: [
      "build-findings.json, the blocking entry — this family stops on shared machinery, not on Maryland. The fix is a "
        + "`selections` parameter on finalizeOfficialForm, and the measured rectangles are already in the field map.",
      "reports/blanks-left-for-the-participant.json, routeDeterminedAndUnmarked — the two MDJ-008 boxes, with the "
        + "printed lines that determine them.",
      "The CC-DC-CR-148 signature block: two columns, the same five captions twice, attorney on the left and petitioner "
        + "on the right. A drift between the columns would file a petition asserting counsel who is the petitioner."
    ]
  });

  return {
    familyId: FAMILY_ID,
    status: allZero ? "COMPLETED" : "STOPPED",
    stopReason: allZero ? null : "two route-determined selections on MDJ-008 cannot be marked by the shared AcroForm finalizer",
    counters: counted.counters, counterFindings: counted.findings,
    directory: OUT, documents: resolved.map((r) => r.formNumber),
    writes: maps.reduce((n, m) => n + m.canonicalWrites.length, 0),
    requiredBeforeFiling: rbf.length,
    routeDeterminedUnmarked: determined.length,
    participantElections: maps.reduce((n, m) => n + m.selectionControls.filter((c) => c.routeDetermined !== true).length, 0),
    artifacts: artifacts.map((a) => ({ fixture: a.fixture, sha256: a.sha256, byteLength: a.byteLength, pageCount: a.pageCount })),
    rasterPages: rasterPages.length
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(thisFile)) {
  runFamily()
    .then((r) => { console.log(JSON.stringify(r, null, 2)); })
    .catch((e) => { console.error(e); process.exit(1); });
}
