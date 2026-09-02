#!/usr/bin/env node
// Route-obligation census v1 — packet family
// `official-form-treatment:obligation:research-decision-route:AL:al-olr`.
//
//   node "scripts/build-census-v1-official-form-treatment:obligation:research-decision-route:AL:al-olr.mjs"
//
// Alabama, a Petition for an Order of Limited Relief under Ala. Code §§ 12-26-1
// et seq. (Act 2019-464). Route `obligation:research-decision-route:AL:al-olr`.
// One document: the Alabama Unified Judicial System's own **Form C-94A,
// Petition for Order of Limited Relief**, Rev. 10/2023.
//
// This is not a renderer. Every decision about what may be written is made by
// scripts/rcap-official-forms/rcap-field-semantics.mjs and every byte is
// written by finalizeOfficialForm; this file supplies the family's ROLE
// classification, its explicit mappings and its printed-label corrections, and
// then proves the result from the artifact bytes rather than from its report.
//
// THIS PETITION IS NOT ABOUT SEALING OR EXPUNGING A RECORD.
//
// An Order of Limited Relief lifts COLLATERAL CONSEQUENCES. The form quotes Act
// 2019-464's own definition on page 2: a collateral consequence is a
// consequence "automatically imposed by operation of state law or rule that
// limits or prohibits an individual convicted of a crime from obtaining
// occupational licensing, certification, or other evidence of qualification
// necessary to engage in a particular occupation", and it expressly does NOT
// include imprisonment, probation, parole, supervised release, forfeiture,
// restitution, fines, assessments, other costs of court, or Alabama sex-offender
// registration responsibilities. The record stays where it is; what changes is
// one or more licensing consequences of it. The petition is adversarial in form:
// it names the licensing board or commission as RESPONDENT and is served on it.
//
// FOUR BLANKS THE SHARED BINDER WOULD HAVE FILLED WITH THE PARTICIPANT'S OWN
// DETAILS, WHERE THE FORM ASKS FOR THE RESPONDENT'S
//
// Page 1's caption block runs
//
//     ________________________, Petitioner v. _____________________________, Respondent
//     (Please print all fields clearly)        (Licensing Board or Commission)
//     ____________________________________________________________________________
//     (Mailing Address of Board or other entity to be served)
//     ________________________________________ _________________________________
//     (City, State, Zip Code)                  (Telephone Number)
//
// Every widget in that block is named after the sub-caption printed beneath it,
// and the three lines beneath the RESPONDENT are the respondent's address, city,
// state, ZIP and telephone. Left alone the shared binder writes
// `participant.city_state_zip` into the board's city line and
// `participant.phone` into the board's telephone line — the petitioner's own
// contact details published as the address of the body being sued. Both are
// refused by role here.
//
// The same naming leaves the PETITIONER's own name blank, because the
// sub-caption under it is the printing instruction "(Please print all fields
// clearly)" and the widget is named after that. A printed-label correction gives
// it back.
//
// THE PAGE 2 AND PAGE 3 HEADERS, AND A DECLARATION MADE IN THE OPEN
//
// Each page carries a "Court Case Number" box, named `Court Case Number`,
// `Court Case Number_2` and `Court Case Number_3`. The shared binder derives a
// charge-row index from any trailing digit in a field name — rowIndexOf() in
// rcap-field-semantics.mjs matches /^(.*?)(\d{1,2})$/ — so `_2` and `_3` are
// read as charge rows 1 and 2. On a matter with more than one charge that does
// not leave the boxes empty: it prints a DIFFERENT charge's case number in the
// headers of pages 2 and 3.
//
// Both are therefore refused by role, and both are declared
// required-before-filing so the participant is told to copy the number from
// page 1. That declaration is made in the open rather than quietly: the
// contract's own condition for it is that the platform holds no value for the
// fact, and the platform DOES hold this one and writes it on page 1. What it
// does not hold is a safe way to place it here. Every such row is listed in
// `declaredRequiredBeforeFilingWithHeldFact` on the field map, with the reason,
// so an independent lane can weigh it instead of discovering it. The underlying
// defect — a page suffix read as a charge-row index — belongs to whoever owns
// rcap-field-semantics.mjs, which is outside this family's owned paths.
//
// PRINTED-LABEL CORRECTIONS, AND WHY THEY ARE NARROW
//
// The shared binder reaches a fact through the field NAME first and the
// harvested printed caption second. A correction replaces the harvested caption
// for ONE named widget with the printed text this build read at that widget's
// own measured position, and the correction, the harvested value it replaced
// and the evidence are all recorded on the field-map row. Every write is still
// proved from the artifact bytes afterwards, and the name-placement allowlist
// still fails the build if a participant name is drawn anywhere this family did
// not list.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

import { extractTextItems, groupIntoLines, captureWidgetContext, normalizeHarvestedText }
  from "./rcap-official-forms/rcap-pdf-anchor-capture.mjs";
import { finalizeOfficialForm } from "./rcap-official-forms/rcap-official-form-finalize.mjs";
import { flattenedWidgets, drawnAt } from "./rcap-official-forms/pdf-flattened-widgets.mjs";
import { strokedRectangles } from "./lib/pdf-stroked-boxes.mjs";
import { CHARGE_VALUE_WORDS, captionDescribesChargeValue, descriptorsMatching, protectCategoryOf, decideBinding }
  from "./rcap-official-forms/rcap-field-semantics.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(rootDir);
const require = createRequire(import.meta.url);
const { PDFDocument, PDFTextField, PDFCheckBox, PDFRadioGroup, PDFDropdown, PDFOptionList } = require("pdf-lib");


const FAMILY_ID = "official-form-treatment:obligation:research-decision-route:AL:al-olr";
const OUT = "data/rcap-all50/overlays/census-v1/al/official-form-treatment:obligation:research-decision-route:al:al-olr--official-pdf-fill";
const CORPUS_INDEX = "data/rcap-all50/local-source-corpus-index.json";
const CORPUS_ROOT = "private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1";
const STALE_BLOCK = "data/rcap-grade-a/stale-artifact-block.json";
const ROUTE_KEY = "obligation:research-decision-route:AL:al-olr";

const fail = (message, detail = null) => {
  console.error(`build-census-v1-${FAMILY_ID}: ${message}`);
  if (detail) console.error(`  ${detail}`);
  console.error("  Nothing was written.");
  process.exit(1);
};

const DOCUMENTS = [
  {
    key: "petition",
    documentId: "AL-AOC-C-94A-PETITION-FOR-ORDER-OF-LIMITED-RELIEF",
    documentRole: "PETITION",
    officialTitle: "Petition for Order of Limited Relief (Form C-94A)",
    revision: "REV-2023-10",
    sha256: "e7ebe16d45d9a5619fd36f2834d4696efc4c0e7bf3ef42c44fa684906effc2c2",
    pathInArchive: "STATES/AL/05_SOURCE_GATED/AL__SOURCE-GATED__C-94A__petition-for-order-of-limited-relief__REV-2023-10__EN.pdf",
    ownership: "participant_completed",
    captionOnly: false,

    printedLabelCorrections: {
      "Please print all fields clearly": {
        printedLabel: "Petitioner name",
        readFrom: "page 1, printed line at y=629.5: \"________________________, Petitioner v. _____________________________, Respondent\", with the sub-caption \"(Please print all fields clearly) (Licensing Board or Commission)\" at y=615.7",
        measuredEvidence: "the widget occupies x 77.64-221.64 at y=624.20, over the first blank on that line — the one closed by the printed word \"Petitioner\"; the respondent's widget sits to its right at x 293.16-467.28",
        why: "The widget is named after the sub-caption printed beneath it, and beneath the petitioner's own blank the form prints the instruction \"(Please print all fields clearly)\". So the petitioner's name reached nothing at all and the caption shipped empty."
      },
      "City State Zip Code": {
        printedLabel: "City, State, Zip Code of the Board or other entity to be served",
        readFrom: "page 1: the sub-caption \"(City, State, Zip Code) (Telephone Number)\" at y=537.0, under the rule at y=549.0, which itself sits under \"(Mailing Address of Board or other entity to be served)\" at y=576.1",
        measuredEvidence: "the widget occupies x 77.64-317.64 at y=543.68, the left half of that rule, directly beneath the board's mailing-address rule at y=582.80",
        why: "This is the RESPONDENT's city, state and ZIP — the licensing board's, in the block the form says is \"to be served\". The shared binder wrote participant.city_state_zip into it: the petitioner's own address published as the address of the body they are suing. The correction names the blank; the role refusal below keeps it blank."
      },
      "Telephone Number": {
        printedLabel: "Telephone Number of the Board or other entity to be served",
        readFrom: "page 1, the same sub-caption at y=537.0: \"(City, State, Zip Code) (Telephone Number)\"",
        measuredEvidence: "the widget occupies x 332.64-530.64 at y=543.68, the right half of the same rule, in the same served-party block",
        why: "The RESPONDENT's telephone number. The shared binder wrote participant.phone into it, for the same reason and with the same effect as the line beside it."
      },
      "Petitioner Mailing Address": {
        printedLabel: "Petitioner Mailing Address",
        readFrom: "page 2, printed sub-caption at y=453.1: \"(Petitioner Mailing Address) (SSN Last 4 only)\", under the rule at y=464.5",
        measuredEvidence: "the widget occupies x 77.64-387.72 at y=459.44, the long left portion of that rule; the short \"XXX-XX-______\" box sits at x 451.98-491.90",
        why: "Its harvested caption is the pro se checkbox line printed above it, \"[ ] pro se (Not represented by an attorney)\", so the shared protect rules read the blank as an attorney field and refused the petitioner's own mailing address."
      },
      "Email": {
        printedLabel: "Email",
        readFrom: "page 2, printed sub-caption at y=418.5: \"(Email) (Phone) (Date of Birth)\", under the rule at y=430.1",
        measuredEvidence: "the widget occupies x 77.64-257.76 at y=425.00, the leftmost of the three boxes on that rule",
        why: "Its harvested caption is the sub-caption of the line ABOVE, \"(Petitioner Mailing Address) (SSN Last 4 only)\", so the shared protect rules read the blank as a government identifier and refused the petitioner's email."
      },
      "Text1": {
        printedLabel: "SSN Last 4 only",
        readFrom: "page 2, printed sub-caption at y=453.1: \"(Petitioner Mailing Address) (SSN Last 4 only)\", and the printed \"XXX-XX-__________\" on the rule at y=464.5",
        measuredEvidence: "the widget occupies x 451.98-491.90 at y=462.54, immediately after the printed \"XXX-XX-\"",
        why: "The widget is named \"Text1\" and harvests the wrong caption, so nothing on the row said what it holds."
      },
      "Court Case Number": {
        printedLabel: "Court Case Number, page 1 header",
        readFrom: "page 1, printed header at y=732.8: \"State of Alabama    Court Case Number\"",
        measuredEvidence: "the widget occupies x 419.04-538.44 at y=698.79, in the header block beneath that caption",
        why: "Its harvested caption is \"PETITION FOR ORDER OF\", the form's title, which is the same on all three pages. Naming each header by its page is what lets the three be told apart on the field map."
      },
      "Court Case Number_2": {
        printedLabel: "Court Case Number, page 2 header",
        readFrom: "page 2, printed header at y=732.8: \"State of Alabama    Court Case Number\"",
        measuredEvidence: "the widget occupies x 429.00-538.44 at y=703.66",
        why: "See the header note: the trailing \"_2\" is read by the shared binder as charge row 1, so on a matter with more than one charge this box receives a different charge's case number."
      },
      "Court Case Number_3": {
        printedLabel: "Court Case Number, page 3 header",
        readFrom: "page 3, printed header at y=710.2: \"State of Alabama    Court Case Number\"",
        measuredEvidence: "the widget occupies x 416.88-583.68 at y=681.32",
        why: "Same as the page 2 header, with \"_3\" read as charge row 2."
      },
      "Text29": {
        printedLabel: "the month in the notary's jurat",
        readFrom: "page 2, printed line at y=322.4: \"Sworn to and subscribed before this _____________ day of _________________, ________.\"",
        measuredEvidence: "three widgets sit on that line at x 252.84-330.37 (the day), 366.28-469.29 (the month) and 474.89-524.37 (the year); this is the middle one",
        why: "The widget is named \"Text29\" and says nothing about what it holds."
      },
      "Text30": {
        printedLabel: "the year in the notary's jurat",
        readFrom: "page 2, the same printed line at y=322.4",
        measuredEvidence: "the rightmost of the three widgets on that line, x 474.89-524.37",
        why: "The widget is named \"Text30\" and says nothing about what it holds."
      },
      "Text2": {
        printedLabel: "Notary Public commission expiry date",
        readFrom: "page 2, printed line at y=141.2: \"(Notary Public Only: My Commission expires on ____________________________________________________(Date)).\"",
        measuredEvidence: "the widget occupies x 246.50-469.68 at y=137.42, on that line",
        why: "The widget is named \"Text2\". The form's own words mark the line Notary Public Only."
      },
      "1": {
        printedLabel: "Address of Server, continuation rule",
        readFrom: "page 3, RETURN ON SERVICE: the sub-caption \"(Address of Server)\" at y=470.9 and its continuation rules at y=459.0 and y=447.1",
        measuredEvidence: "the widget occupies x 319.44-544.56 at y=457.44, the first continuation rule beneath the server's address line at y=477.19",
        why: "The widget is named \"1\" and harvests only a run of underscores."
      },
      "2": {
        printedLabel: "Phone Number of Server",
        readFrom: "page 3, RETURN ON SERVICE: the sub-caption \"(Phone Number of Server)\" at y=423.5",
        measuredEvidence: "the widget occupies x 320.28-545.28 at y=429.80, on the rule directly above that sub-caption",
        why: "The widget is named \"2\" and harvests nothing."
      }
    },

    explicitMappings: {},

    unwritable: [
      // The respondent's own block. See the header note.
      { field: "City State Zip Code", class: "respondent_service_address",
        why: "The city, state and ZIP of the licensing board or commission being served. The shared binder wrote the PETITIONER's city, state and ZIP into it." },
      { field: "Telephone Number", class: "respondent_service_address",
        why: "The telephone number of the licensing board or commission being served. The shared binder wrote the PETITIONER's telephone number into it." },

      // The page 2 and page 3 headers. See the header note.
      { field: "Court Case Number_2", class: "page_suffix_read_as_a_charge_row",
        why: "The page 2 header's Court Case Number box. The shared binder reads the trailing \"_2\" as charge row 1 and, on a matter with more than one charge, prints that other charge's case number here." },
      { field: "Court Case Number_3", class: "page_suffix_read_as_a_charge_row",
        why: "The page 3 header's Court Case Number box, with \"_3\" read as charge row 2, on the same footing." },

      // A prior petition, which is a different matter from this one.
      { field: "If granted or denied list the county and case number", class: "prior_petition_identifiers",
        why: "The county AND case number of a PREVIOUS application for an Order of Limited Relief covering different convictions. The shared binder wrote matter.county into it: this matter's county, offered as the county of another petition the platform knows nothing about." },

      // The list of convictions and collateral consequences.
      { field: "consequences to which the Order of Limited Relief should apply 1", class: "conviction_and_collateral_consequence_list",
        why: "The first rule of \"a list of conviction(s) and court case number(s) as well as collateral consequences to which the Order of Limited Relief should apply\". A composite the platform does not hold: it holds an offence and a case number and holds no collateral-consequence fact at all, and a partial entry on this list defines the relief the court is being asked to give." },
      { field: "consequences to which the Order of Limited Relief should apply 2", class: "conviction_and_collateral_consequence_list", why: "The second rule of the same list." },
      { field: "consequences to which the Order of Limited Relief should apply 3", class: "conviction_and_collateral_consequence_list", why: "The third rule of the same list." },
      { field: "consequences to which the Order of Limited Relief should apply 4", class: "conviction_and_collateral_consequence_list", why: "The fourth rule of the same list." },
      { field: "consequences to which the Order of Limited Relief should apply 5", class: "conviction_and_collateral_consequence_list", why: "The fifth rule of the same list." },

      // The sworn jurat on page 2 and the whole of page 3.
      { field: "Date", class: "notary_jurat_date", why: "The day in \"Sworn to and subscribed before this ___ day of ______, ____\". The officer administering the oath dates it." },
      { field: "Text29", class: "notary_jurat_date", why: "The month of the same jurat." },
      { field: "Text30", class: "notary_jurat_date", why: "The year of the same jurat." },
      { field: "Text2", class: "notary_only", why: "The line the form marks \"Notary Public Only: My Commission expires on ______\"." },
      { field: "Text1", class: "government_identifier",
        why: "The last four digits of the petitioner's Social Security number. The platform holds no SSN and this build writes none." },
      { field: "Name of Person Served", class: "return_on_service_block",
        why: "The name of the person served, on the RETURN ON SERVICE page. The shared binder wrote the PETITIONER's name into it — the petitioner is the one serving, not the one served. The whole of page 3 is completed by whoever effects service, after service." },
      { field: "Name of County_2", class: "return_on_service_block",
        why: "The county where service was made, on the RETURN ON SERVICE page. Completed by the server, after service." },
      { field: "Date_2", class: "return_on_service_block",
        why: "\"Return receipt of certified mail received in this office on ___\" — completed by the office that receives the receipt." },
      { field: "Date_3", class: "return_on_service_block",
        why: "The date of personal delivery, on the RETURN ON SERVICE page. Completed by the server, after service; the shared binder wrote matter.county into it." },
      { field: "Type of Process Server", class: "return_on_service_block", why: "The server's own description of themselves." },
      { field: "Address of Server", class: "return_on_service_block",
        why: "The server's address. The shared binder wrote the PETITIONER's street address into it." },
      { field: "Servers Printed Name", class: "return_on_service_block",
        why: "The server's printed name. The shared binder wrote the PETITIONER's full legal name into it." },
      { field: "1", class: "return_on_service_block", why: "A continuation rule of the server's address." },
      { field: "2", class: "return_on_service_block", why: "The server's telephone number." }
    ],

    completeness: {
      defaultBlank: null,
      fields: {
        // The respondent's own details: the participant supplies them, because
        // they choose which board they are petitioning against.
        "Licensing Board or Commission": { requiredBeforeFiling: true,
          reason: "The licensing board or commission named as RESPONDENT, on the caption line \"________, Petitioner v. ________, Respondent\". Which body's collateral consequence the petition is aimed at is the participant's choice and the platform holds no board fact; the participant names it before filing." },
        "Mailing Address of Board or other entity to be served": { requiredBeforeFiling: true,
          reason: "The mailing address of that board or other entity, which is where the petition is served. The platform holds no address for it; the participant obtains it from the board and writes it before filing." },
        "City State Zip Code": { requiredBeforeFiling: true,
          reason: "The city, state and ZIP code of that same board. On the same footing as its street address, and deliberately not the petitioner's own — see the note on the field map." },
        "Telephone Number": { requiredBeforeFiling: true,
          reason: "The telephone number of that same board, in the block the form marks as the entity to be served." },

        // The relief being asked for.
        "consequences to which the Order of Limited Relief should apply 1": { requiredBeforeFiling: true,
          reason: "The first line of the list of convictions, court case numbers and collateral consequences the Order of Limited Relief should apply to. This list IS the relief the court is being asked to grant; the platform holds no collateral-consequence fact and will not compose it. The participant writes it before filing." },
        "If granted or denied list the county and case number": { requiredBeforeFiling: true,
          reason: "The county and case number of a PREVIOUS application for an Order of Limited Relief, if the participant has made one. It is about a different matter than this petition, and the platform holds nothing about it." },

        // The two continuation-page headers. Declared in the open; see the
        // header note and declaredRequiredBeforeFilingWithHeldFact.
        "Court Case Number_2": { requiredBeforeFiling: true,
          reason: "The Court Case Number box in the page 2 header. The number is written in the page 1 header; the participant copies it here. This packet does not write it because the shared field binder reads the trailing \"_2\" in the widget's name as a charge-row index and, on a matter with more than one charge, would print a different charge's case number in this box." },
        "Court Case Number_3": { requiredBeforeFiling: true,
          reason: "The Court Case Number box in the page 3 header, on the same footing as page 2's, with \"_3\" read as charge row 2." },

        // The petitioner's own SSN.
        "Text1": { requiredBeforeFiling: true,
          reason: "The last four digits of the petitioner's Social Security number, in the \"XXX-XX-______\" box on page 2. The platform holds no Social Security number; the participant writes the last four digits before filing." },

        // Sworn and notarised: the officer's, not the participant's.
        "Date": { refusalClass: "court_prosecutor_clerk_or_agency_owned",
          reason: "The day in \"Sworn to and subscribed before this ___ day of ______, ____\" on page 2. The officer authorised to administer oaths dates the jurat when the oath is taken." },
        "Text29": { refusalClass: "court_prosecutor_clerk_or_agency_owned",
          reason: "The month of the same jurat, dated by the officer administering the oath." },
        "Text30": { refusalClass: "court_prosecutor_clerk_or_agency_owned",
          reason: "The year of the same jurat, dated by the officer administering the oath." },
        "Text2": { refusalClass: "court_prosecutor_clerk_or_agency_owned",
          reason: "The line the form marks \"Notary Public Only: My Commission expires on ______\". Only the notary states it." },

        // The whole RETURN ON SERVICE page.
        "Name of Person Served": { refusalClass: "court_prosecutor_clerk_or_agency_owned",
          reason: "The RETURN ON SERVICE page is completed by whoever effects service, after service has happened. This is the name of the person served — the board's representative, not the petitioner." },
        "Name of County_2": { refusalClass: "court_prosecutor_clerk_or_agency_owned",
          reason: "The county where service was made, stated by the server after service." },
        "Date_2": { refusalClass: "court_prosecutor_clerk_or_agency_owned",
          reason: "\"Return receipt of certified mail received in this office on ___\", completed by the office that receives the receipt." },
        "Date_3": { refusalClass: "court_prosecutor_clerk_or_agency_owned",
          reason: "The date of personal delivery, stated by the server after service." },
        "Type of Process Server": { refusalClass: "court_prosecutor_clerk_or_agency_owned",
          reason: "The server's own description of themselves, on the RETURN ON SERVICE page." },
        "Address of Server": { refusalClass: "court_prosecutor_clerk_or_agency_owned",
          reason: "The server's address, on the RETURN ON SERVICE page." },
        "Servers Printed Name": { refusalClass: "court_prosecutor_clerk_or_agency_owned",
          reason: "The server's printed name, on the RETURN ON SERVICE page." },
        "1": { refusalClass: "court_prosecutor_clerk_or_agency_owned",
          reason: "A continuation rule of the server's address, on the RETURN ON SERVICE page." },
        "2": { refusalClass: "court_prosecutor_clerk_or_agency_owned",
          reason: "The server's telephone number, on the RETURN ON SERVICE page." },

        // Attorney block.
        "Name of Attorney if applicable": { refusalClass: "court_prosecutor_clerk_or_agency_owned",
          reason: "The name of the petitioner's attorney, if any. No representation fact is held for this participant and this packet never populates an attorney field with participant data." },

        // Optional participant content.
        "consequences to which the Order of Limited Relief should apply 2": { refusalClass: null,
          reason: "The second printed rule of the same list, used only if the first will not hold the answer, and the platform does not invent it." },
        "consequences to which the Order of Limited Relief should apply 3": { refusalClass: null,
          reason: "The third printed rule of the same list, and the platform does not invent it." },
        "consequences to which the Order of Limited Relief should apply 4": { refusalClass: null,
          reason: "The fourth printed rule of the same list, and the platform does not invent it." },
        "consequences to which the Order of Limited Relief should apply 5": { refusalClass: null,
          reason: "The fifth printed rule of the same list, and the platform does not invent it." },

        // Genuine participant elections.
        "Check Box2": { refusalClass: "participant_sworn_narrative_or_legal_election",
          reason: "The \"( ) Granted\" box on page 1's statement about a PREVIOUS application for an Order of Limited Relief. Whether an earlier petition was granted is a fact about the participant's own history; the platform holds nothing about it and this route does not determine it." },
        "Check Box3": { refusalClass: "participant_sworn_narrative_or_legal_election",
          reason: "The \"( ) Denied\" box of the same statement." },
        "Check Box4": { refusalClass: "participant_sworn_narrative_or_legal_election",
          reason: "The \"( ) Not applicable\" box of the same statement, for a participant who has made no previous application." }
      }
    },

    // Declared in the open. See the header note: each of these is a fact the
    // platform HOLDS, refused because the shared binder cannot place it here
    // safely, and carried to the participant rather than risked on the paper.
    declaredRequiredBeforeFilingWithHeldFact: [
      {
        field: "Court Case Number_2",
        heldFact: "matter.case_number",
        writtenElsewhereInThisPacket: "the page 1 header",
        whyNotWrittenHere:
          "The shared binder derives a charge-row index from any trailing digit in a field name, so \"_2\" is read "
          + "as charge row 1. On a matter with more than one charge the box would carry a different charge's case "
          + "number rather than stay empty.",
        whoOwnsTheUnderlyingDefect: "scripts/rcap-official-forms/rcap-field-semantics.mjs, outside this family's owned paths"
      },
      {
        field: "Court Case Number_3",
        heldFact: "matter.case_number",
        writtenElsewhereInThisPacket: "the page 1 header",
        whyNotWrittenHere: "The same, with \"_3\" read as charge row 2.",
        whoOwnsTheUnderlyingDefect: "scripts/rcap-official-forms/rcap-field-semantics.mjs, outside this family's owned paths"
      }
    ]
  }
];

// The ONLY blanks in this family that may ever carry the participant's name.
const NAME_MAY_APPEAR_IN = {
  "AL-AOC-C-94A-PETITION-FOR-ORDER-OF-LIMITED-RELIEF": [
    "Please print all fields clearly",  // page 1 caption, the Petitioner blank
    "Name of Petitioner",               // page 2 signature block
    "PetitionerPrinted Name",           // page 2 "(Petitioner-Printed Name)"
    "Email"                             // the petitioner's email, which contains their surname
  ]
};

// The corpus's standard canonical and boundary participants, so this family's
// fixtures are comparable with every other family's.
const CANONICAL = {
  "participant.full_legal_name": "Jordan Avery Reyes", "participant.first_name": "Jordan",
  "participant.last_name": "Reyes", "participant.middle_name": "Avery",
  "participant.street_address": "118 Maple Street", "participant.city": "Springfield",
  "participant.state": "XX", "participant.zip": "01234",
  "participant.city_state_zip": "Springfield, XX 01234",
  "participant.phone": "555-0142", "participant.email": "jordan.reyes@example.com",
  "participant.date_of_birth": "1991-04-17",
  "matter.county": "Example County", "matter.court": "District Court",
  "matter.case_number": "24-CR-001234", "matter.citation_number": "C-889201",
  "matter.charge": "Possession of a controlled substance", "matter.arrest_date": "2019-03-08",
  "matter.offense_date": "2019-03-08", "matter.conviction_date": "2019-11-02",
  "matter.disposition_date": "2020-01-15", "deterministic.filing_date": "2026-08-12",
  "matter.charges": [
    { case_number: "24-CR-001234", citation_number: "C-889201", charge: "Possession of a controlled substance",
      arrest_date: "2019-03-08", offense_date: "2019-03-08", conviction_date: "2019-11-02", disposition_date: "2020-01-15" }
  ]
};
const BOUNDARY = {
  ...CANONICAL,
  "participant.full_legal_name": "Alexandrina-Katharine Montgomery-Vandenberg-Oyelaran y Fitzwilliam III",
  "participant.street_address": "12345 Southwest Grandview Boulevard Northeast, Building 7, Apartment 4321-B",
  "participant.city": "Unincorporated Township of Long Hollow Crossing",
  "participant.city_state_zip": "Unincorporated Township of Long Hollow Crossing, XX 01234-9999",
  "participant.zip": "01234-9999", "participant.phone": "555-0142 ext. 44821",
  "matter.case_number": "0123-45-2026-CR-900123.00-AB-CDE/2201",
  "matter.county": "Saint Bartholomew and the Northern Reaches County",
  "matter.charge": "Possession of a controlled or counterfeit substance, second degree, with an extended statutory description that materially exceeds one line",
  "matter.charges": [
    { case_number: "0123-45-2026-CR-900123.00-AB-CDE/2201", citation_number: "C-889201",
      charge: "Possession of a controlled or counterfeit substance, second degree, with an extended statutory description that materially exceeds one line",
      arrest_date: "2019-03-08", offense_date: "2019-03-08", conviction_date: "2019-11-02", disposition_date: "2020-01-15" },
    { case_number: "0123-45-2026-CR-900124.00", citation_number: "C-889202", charge: "Criminal trespass, third degree",
      arrest_date: "2020-06-21", offense_date: "2020-06-20", conviction_date: "2021-02-09", disposition_date: "2021-03-01" },
    { case_number: "0123-45-2026-CR-900125.00", citation_number: "C-889203", charge: "Driving while license suspended",
      arrest_date: "2021-09-02", offense_date: "2021-09-02", conviction_date: "2022-01-18", disposition_date: "2022-02-14" }
  ]
};

const NAME_TOKENS = [...new Set(
  [CANONICAL, BOUNDARY].flatMap((f) => [
    f["participant.full_legal_name"], f["participant.first_name"],
    f["participant.last_name"], f["participant.middle_name"]
  ]).filter(Boolean).flatMap((v) => [v, ...String(v).split(/[\s\-]+/)])
    .map((s) => s.trim()).filter((s) => s.length >= 4)
)];

const sha256 = (buf) => crypto.createHash("sha256").update(buf).digest("hex");
const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(rootDir, rel), "utf8"));
const writeJson = (rel, value) => {
  fs.mkdirSync(path.dirname(path.join(rootDir, rel)), { recursive: true });
  fs.writeFileSync(path.join(rootDir, rel), `${JSON.stringify(value, null, 2)}\n`);
};

function fieldType(f) {
  if (f instanceof PDFTextField) return "text";
  if (f instanceof PDFCheckBox) return "checkbox";
  if (f instanceof PDFRadioGroup) return "radio";
  if (f instanceof PDFDropdown) return "dropdown";
  if (f instanceof PDFOptionList) return "optionlist";
  return "other";
}

// ---- step 1: the source is the pinned source ---------------------------------
function resolveSource(doc) {
  const index = readJson(CORPUS_INDEX);
  const entry = (index.entries ?? []).find((e) => e.path === doc.pathInArchive);
  if (!entry) fail(`${doc.documentId}: not present in ${CORPUS_INDEX}`, doc.pathInArchive);
  if (entry.sha256 !== doc.sha256) {
    fail(`${doc.documentId}: the corpus index declares a different hash`,
      `index ${entry.sha256} / family ${doc.sha256}`);
  }
  const abs = path.join(rootDir, CORPUS_ROOT, doc.pathInArchive);
  if (!fs.existsSync(abs)) {
    fail(`${doc.documentId}: the pinned source is not installed`,
      `expected ${CORPUS_ROOT}/${doc.pathInArchive} — run scripts/rcap-corpus/bootstrap-private-corpus.sh`);
  }
  const bytes = fs.readFileSync(abs);
  const got = sha256(bytes);
  if (got !== doc.sha256) fail(`${doc.documentId}: SOURCE DRIFT`, `expected ${doc.sha256}, read ${got}`);
  if (bytes.length !== entry.byteLength) {
    fail(`${doc.documentId}: byte length disagrees with the corpus index`,
      `index ${entry.byteLength}, read ${bytes.length}`);
  }
  return { bytes, indexEntry: entry };
}

// ---- census with MEASURED geometry --------------------------------------------
async function censusDocument(doc, bytes) {
  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  const pages = pdf.getPages();
  const form = pdf.getForm();

  const linesByPage = pages.map((p) => groupIntoLines(extractTextItems(p)));
  const documentTextLines = linesByPage.flat().map((l) => normalizeHarvestedText(l.text));

  const strokedByPage = new Map();
  pages.forEach((page, i) => {
    let content = "";
    for (const stream of page.node.normalizedEntries?.().Contents?.asArray?.() ?? []) {
      try { content += Buffer.from(pdf.context.lookup(stream).getContents()).toString("latin1"); } catch { /* not a stream */ }
    }
    strokedByPage.set(i + 1, content ? strokedRectangles(content) : []);
  });

  const widgetsForCapture = new Map();
  const fields = form.getFields().map((f) => {
    const name = f.getName();
    const type = fieldType(f);
    const widgets = f.acroField.getWidgets().map((w) => {
      const r = w.getRectangle();
      const ref = w.P?.();
      let page = 1;
      pages.forEach((p, i) => { if (p.ref === ref) page = i + 1; });
      return {
        page,
        rect: { x: +r.x.toFixed(2), y: +r.y.toFixed(2), width: +r.width.toFixed(2), height: +r.height.toFixed(2) },
        rectBasis: "acroform_widget_rect_read_from_the_document"
      };
    });
    for (const w of widgets) {
      if (!widgetsForCapture.has(w.page)) widgetsForCapture.set(w.page, []);
      widgetsForCapture.get(w.page).push({ name, rect: w.rect });
    }
    return {
      name, type, widgets,
      // Read from the document, not assumed. See maxLengthOverflows(): pdf-lib
      // THROWS on a value longer than a text field's declared /MaxLen rather
      // than reporting it unfittable, so a value that will not fit has to be
      // refused before the finalizer is asked to write it.
      maxLength: type === "text" ? (f.getMaxLength() ?? null) : null
    };
  });

  const context = new Map();
  pages.forEach((page, i) => {
    const list = widgetsForCapture.get(i + 1) ?? [];
    if (!list.length) return;
    for (const c of captureWidgetContext(page, list, { precomputedLines: linesByPage[i], isFirstPage: i === 0 })) {
      if (!context.has(c.name)) context.set(c.name, c);
    }
  });

  const ruleUnder = (page, rect) => {
    const candidates = (strokedByPage.get(page) ?? []).filter((s) =>
      s.height <= 3
      && Math.min(s.x1, rect.x + rect.width) - Math.max(s.x0, rect.x) > rect.width * 0.4
      && rect.y - s.y1 >= -3 && rect.y - s.y1 <= 12);
    if (!candidates.length) return null;
    const best = candidates.sort((a, b) => (rect.y - a.y1) - (rect.y - b.y1))[0];
    return { x0: best.x0, x1: best.x1, y: best.y1, construction: best.construction };
  };

  // Printed-label corrections. See the header note: each replaces the harvested
  // caption for ONE named widget with the printed text this build read at that
  // widget's own measured position. The harvested value it replaces is kept
  // beside it so both answers stay visible.
  const corrections = doc.printedLabelCorrections ?? {};
  const censusFields = fields.map((f) => {
    const c = context.get(f.name) ?? {};
    const w = f.widgets[0] ?? null;
    const correction = Object.hasOwn(corrections, f.name) ? corrections[f.name] : null;
    const harvested = c.effectiveLabel ?? null;
    const effective = correction ? correction.printedLabel : harvested;
    const subject = effective ?? f.name;
    return {
      name: f.name,
      type: f.type,
      maxLength: f.maxLength ?? null,
      effectiveLabel: effective,
      harvestedLabel: harvested,
      printedLabelCorrection: correction,
      labelBasis: correction
        ? "printed_page_text_read_at_the_measured_widget_position"
        : (c.labelBasis ?? null),
      regionHeading: c.regionHeading ?? null,
      widgets: f.widgets,
      captionDescribesChargeValue: captionDescribesChargeValue(subject),
      captionOrNameMentionsCharge: CHARGE_VALUE_WORDS.test(subject) || CHARGE_VALUE_WORDS.test(f.name),
      protectCategory: protectCategoryOf(subject) ?? protectCategoryOf(f.name) ?? null,
      descriptorsByName: descriptorsMatching(f.name).map((d) => d.factId),
      descriptorsByLabel: effective ? descriptorsMatching(effective).map((d) => d.factId) : [],
      measuredRuleUnderWriteBox: w ? ruleUnder(w.page, w.rect) : null
    };
  });

  return {
    pdf, pages, fields: censusFields, documentTextLines,
    pageGeometry: pages.map((p, i) => ({ page: i + 1, width: +p.getSize().width.toFixed(2), height: +p.getSize().height.toFixed(2) })),
    strokedByPage
  };
}


/**
 * Values this fixture cannot place, because the FORM says the blank is too short.
 *
 * A text widget may declare /MaxLen. pdf-lib's setText throws
 * ExceededMaxLengthError when a value is longer, and the shared finalizer does
 * not catch it — so a fixture carrying a longer value does not produce a report
 * saying the value did not fit, it produces no artifact at all. The Idaho
 * shielding petition found this: its filer-name widget declares /MaxLen 35 and
 * the corpus's standard boundary participant's name is 70 characters, and the
 * build died on the second fixture after writing the first.
 *
 * That is a defect in the shared finalizer and not in this packet, and it is not
 * repaired here — rcap-text-fitting.mjs is outside this family's owned paths and
 * every other family shares it. What is done here instead is to ask the same
 * question BEFORE the finalizer is called, using the same binder, and to refuse
 * by role any field whose resolved value exceeds the length the form itself
 * declares. The refusal is per FIXTURE, because it depends on the value: the
 * canonical participant fits and the boundary participant does not, which is
 * exactly what a boundary fixture is for.
 */
function maxLengthOverflows(doc, census, facts) {
  const availableChargeRows = Array.isArray(facts?.["matter.charges"]) ? facts["matter.charges"].length : 0;
  const found = [];
  for (const f of census.fields) {
    if (f.maxLength === null || f.maxLength === undefined) continue;
    const decision = decideBinding(
      { name: f.name, pdfType: f.type, effectiveLabel: f.effectiveLabel ?? null },
      {
        explicitMappings: doc.explicitMappings ?? {},
        captionOnly: doc.captionOnly === true,
        availableChargeRows,
        documentAcceptsFill: true
      }
    );
    if (decision.writable !== true || !decision.factId) continue;
    const value = resolveFact(facts, decision.factId);
    if (value === undefined || value === null) continue;
    const length = String(value).length;
    if (length <= f.maxLength) continue;
    found.push({
      field: f.name,
      class: "exceeds_form_declared_max_length",
      factId: decision.factId,
      maxLength: f.maxLength,
      valueLength: length,
      why: `The form declares /MaxLen ${f.maxLength} on this widget and the value for ${decision.factId} is `
        + `${length} characters. The blank cannot hold it, so it is left for the participant rather than truncated.`
    });
  }
  return found;
}

// ---- prove it from the ARTIFACT, not from the report --------------------------
async function verifyFromBytes({ file, census, report, label, documentId }) {
  const drawn = await flattenedWidgets(file);
  const findings = [];
  const chargeBlanks = [];

  for (const field of census.fields) {
    const w = field.widgets[0];
    if (!w) continue;
    const here = drawnAt(drawn, { page: w.page, rect: w.rect, tolerance: 3 })
      .map((d) => d.text).filter((t) => t && t.trim() !== "");
    const text = here.join(" ").trim();
    const wasWritten = report.written.some((x) => x.field === field.name);

    if (field.captionOrNameMentionsCharge) {
      const hit = NAME_TOKENS.filter((tok) => text.toLowerCase().includes(tok.toLowerCase()));
      chargeBlanks.push({
        field: field.name, page: w.page, rect: w.rect,
        effectiveLabel: field.effectiveLabel,
        captionDescribesChargeValue: field.captionDescribesChargeValue,
        drawnText: text === "" ? null : text,
        participantNameTokensFound: hit
      });
      if (hit.length) {
        findings.push({ severity: "blocking", fixture: label, field: field.name,
          check: "participant_name_in_a_charge_caption_blank", drawnText: text, tokens: hit });
      }
    }

    if (!wasWritten && text !== "") {
      findings.push({ severity: "blocking", fixture: label, field: field.name,
        check: "refused_field_carries_ink", drawnText: text });
    }
    if (wasWritten && text === "") {
      findings.push({ severity: "blocking", fixture: label, field: field.name,
        check: "written_field_is_blank_on_the_paper" });
    }
  }

  const mustBeBlank = census.fields.filter((f) =>
    /signature|^full date( \d+)?$|^judge$/i.test(f.name)
    || f.type === "signature"
    || /certificate\s*of\s*service/i.test(f.regionHeading ?? ""));
  for (const f of mustBeBlank) {
    const w = f.widgets[0];
    if (!w) continue;
    const text = drawnAt(drawn, { page: w.page, rect: w.rect, tolerance: 3 })
      .map((d) => d.text).join(" ").trim();
    if (text !== "") {
      findings.push({ severity: "blocking", fixture: label, field: f.name,
        check: "signature_date_or_service_field_is_not_blank", drawnText: text });
    }
  }

  const allowed = new Set(NAME_MAY_APPEAR_IN[documentId] ?? []);
  const namePlacements = [];
  for (const appearance of drawn) {
    const text = String(appearance.text ?? "").trim();
    if (!text) continue;
    const hit = NAME_TOKENS.filter((tok) => text.toLowerCase().includes(tok.toLowerCase()));
    if (!hit.length) continue;
    const owner = census.fields.find((f) => f.widgets.some((w) =>
      w.page === appearance.page
      && Math.abs(w.rect.x - appearance.x) <= 3 && Math.abs(w.rect.y - appearance.y) <= 3));
    const field = owner?.name ?? null;
    namePlacements.push({ field, page: appearance.page, text, tokens: hit, allowed: allowed.has(field) });
    if (!allowed.has(field)) {
      findings.push({ severity: "blocking", fixture: label, field: field ?? "(unattributed appearance)",
        check: "participant_name_drawn_in_a_blank_not_listed_as_a_name_blank",
        page: appearance.page, drawnText: text, tokens: hit });
    }
  }

  const outside = drawn.filter((appearance) => {
    if (!String(appearance.text ?? "").trim()) return false;
    return !census.fields.some((f) => f.widgets.some((w) =>
      w.page === appearance.page
      && Math.abs(w.rect.x - appearance.x) <= 3 && Math.abs(w.rect.y - appearance.y) <= 3));
  });

  return {
    findings, chargeBlanks, namePlacements,
    appearancesDrawn: drawn.length,
    appearancesOutsideMeasuredWriteBoxes: outside.length
  };
}

// ---- the shared completeness contract's own channel ---------------------------
function completenessFields({ doc, census, written }) {
  const writtenBy = new Map(written.map((w) => [w.field, w]));
  const refusedBy = new Map((doc.completeness?.fields ? Object.entries(doc.completeness.fields) : []));
  const roleWhy = new Map(doc.unwritable.map((u) => [u.field, u]));
  return census.fields.map((f) => {
    const w = writtenBy.get(f.name);
    const declared = refusedBy.get(f.name) ?? null;
    const policy = declared ?? doc.completeness?.defaultBlank ?? null;
    const role = roleWhy.get(f.name) ?? null;
    const row = {
      field: f.name,
      fieldId: f.name,
      effectiveLabel: f.effectiveLabel,
      harvestedLabel: f.harvestedLabel ?? null,
      labelBasis: f.labelBasis ?? null,
      page: f.widgets?.[0]?.page ?? null,
      pdfType: f.type,
      isSelectionControl: f.type === "checkbox" || f.type === "radio",
      decision: w ? "write" : "refuse",
      factId: w?.factId ?? null,
      buildRoleClass: role?.class ?? null,
      buildRoleWhy: role?.why ?? null
    };
    if (w) return row;
    row.reason = policy?.reason ?? null;
    row.refusalClass = policy?.refusalClass ?? null;
    if (policy?.requiredBeforeFiling === true) row.requiredBeforeFiling = true;
    return row;
  });
}

function actualWritesArtifacts(documents) {
  return documents.flatMap(({ doc, fixtures }) =>
    ["canonical", "boundary"].map((label) => {
      const proof = fixtures[label].proof;
      return {
        documentId: doc.documentId,
        fixture: label,
        file: fixtures[label].file,
        sha256: fixtures[label].sha256,
        proofMethod:
          "AcroForm fill: every value is set on the document's own widget and its appearance is generated by the "
          + "form. The counts below are read back from the finished PDF with pdf-flattened-widgets.mjs, at each "
          + "field's own measured /Rect.",
        valuesReportedByFinalizer: fixtures[label].report.written.length,
        flattenedWidgetAppearancesReadFromOutputBytes: proof.appearancesDrawn,
        addedGlyphsReadFromOutputBytes: 0,
        addedGlyphsNote:
          "Zero by construction, not by measurement: this family writes through AcroForm widgets rather than by "
          + "drawing into page content, so every mark it makes is a widget appearance and is counted in the "
          + "column beside this one.",
        nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: proof.appearancesOutsideMeasuredWriteBoxes,
        refusedFieldsWithInk: proof.findings
          .filter((x) => x.check === "refused_field_carries_ink")
          .map((x) => ({ fieldId: x.field, drawnText: x.drawnText })),
        participantNameTokensOutsideTheNameAllowlist: proof.namePlacements.filter((n) => !n.allowed).length
      };
    }));
}

// ---- participant instructions -------------------------------------------------
//
// WHERE EACH OF THE FOUR OBLIGATIONS COMES FROM, AND WHERE NOTHING WAS FOUND
//
// FILING_DESTINATION — held, and printed on the form. The committed packet-set
//   manifest for this route records filingDestination as "Alabama circuit civil
//   court selected under Ala. Code § 12-26-3", and the form's own caption reads
//   "IN THE CIRCUIT COURT OF __________ COUNTY, ALABAMA". Stated.
// FEE_AND_WAIVER — held, as an amount. The manifest records filingFee as "$100
//   statutory administrative fee plus ordinary court costs" and feeWaiverTreatment
//   as "$100 administrative fee is nonwaivable; permitted indigency payment-plan
//   treatment may apply". Both are keyed to this exact route
//   (obligation:research-decision-route:AL:al-olr) rather than to a sibling, so
//   amendment A3 is satisfied. Stated with its waiver rule, and the clerk of the
//   filing court is named for the ordinary court costs, which the record does not
//   quantify.
// SERVICE — held on the form's own face, which is stronger than a record here.
//   The caption block is headed "(Mailing Address of Board or other entity to be
//   served)" and page 3 is a RETURN ON SERVICE recording either certified mail or
//   personal delivery by a process server. The manifest records serviceRecipients,
//   serviceMethod and serviceTiming as not_recorded, so no TIMING is stated below
//   and the clerk of the filing court is named for it.
// SELF_HELP_STOP — held. The manifest's contestedHearingOrOppositionHandoff entry:
//   "Complex venue, joinder, foreign-relief, prohibited-offense, or
//   agency-contested matters require attorney handoff." Its uncontestedHearing
//   entry adds that "The court may decide on the record; a hearing is not
//   invariably required." Both are stated. The form's own page 1 adds the
//   two-year re-application bar and the leave requirement that goes with it.
// NOT FOUND — no held record and no printed line states a service DEADLINE, a
//   filing deadline, or what the ordinary court costs come to. Nothing below
//   states any of them; the clerk of the circuit court in the county in the
//   caption is named for each.
function participantInstructionsMarkdown() {
  return `# Filing instructions — Alabama Petition for an Order of Limited Relief (Form C-94A)

This packet is one form: the Alabama Unified Judicial System's **Form C-94A, Petition for Order of Limited Relief**, Rev. 10/2023, under Act 2019-464 (Ala. Code §§ 12-26-1 et seq.).

## What this petition does, and what it does not do

**It does not seal, expunge or set aside anything.** An Order of Limited Relief lifts one or more **collateral consequences** of a conviction. Page 2 of the form quotes the Act's own definition: a collateral consequence is a consequence "automatically imposed by operation of state law or rule that limits or prohibits an individual convicted of a crime from obtaining occupational licensing, certification, or other evidence of qualification necessary to engage in a particular occupation." The same sentence says what it is **not**: "The term does not include imprisonment, probation, parole, supervised release, forfeiture, restitution, fines, assessments, other costs of court, or responsibilities imposed under the Alabama Sex Offender Registration and Community Notification Act."

**It is a lawsuit against a licensing body.** The caption reads "________, Petitioner v. ________, Respondent", and the respondent is a **licensing board or commission**. You name it, you give the court its address, and it is served with the petition.

The platform filled what it holds about you and your case: your name in the caption, in the signature block and on the printed-name line, the county in the caption, the court case number in the page 1 header, your mailing address, your email, your telephone number and your date of birth. **Everything about the respondent is left for you**, and so is the list of consequences you are asking to be relieved of. All of it is in the table below.

## Where you file this

**File in the Alabama circuit court chosen under Ala. Code § 12-26-3.** The committed route record for this packet gives the destination as "Alabama circuit civil court selected under Ala. Code § 12-26-3", and the form's own caption reads "IN THE CIRCUIT COURT OF __________ COUNTY, ALABAMA".

**The county in the caption is filled from what the platform holds for your matter. Check it against § 12-26-3 before you file**, because which circuit is the right one on this route is a venue question the statute answers and this packet does not: the committed record for this packet lists **complex venue** among the matters that need a lawyer. If the county in the caption is not the county § 12-26-3 points to, correct it.

## What it costs

**There is a $100 statutory administrative fee, and it cannot be waived.** The committed record for this packet states both halves: the filing fee is a "$100 statutory administrative fee plus ordinary court costs", and on waiver, "$100 administrative fee is nonwaivable; permitted indigency payment-plan treatment may apply."

So: **do not expect a fee waiver to remove the $100.** What the record does allow is that if you cannot pay it at once, a **payment plan** may be permitted on indigency grounds. **Ask the clerk of the circuit court in the county in your caption** what that court's payment-plan procedure is, and ask in the same conversation what the "ordinary court costs" beside the $100 come to — no held record states that figure, and the clerk's office is where it is answered.

## Who you serve, and how

**The licensing board or commission is served.** The form says so on its own face: the address block under the respondent's name is captioned "(Mailing Address of Board or other entity to be served)", and page 3 is a **RETURN ON SERVICE** which records service either by **certified mail** — "Return receipt of certified mail received in this office on ___" — or by **personal delivery by a process server**, who signs and prints their name, gives their address and telephone number, and states the county and date of delivery.

**You do not complete page 3.** It is filled in after service by whoever effects it, or by the office that receives the certified-mail receipt. This packet leaves the whole page blank.

**No held record states a service deadline for this route**, and the form prints none. **Ask the clerk of the circuit court where you file** how and when the petition must be served, and whether that court expects service by certified mail through the clerk or by a process server you arrange.

**Expect a decision within 90 days.** Page 2 of the form carries the Act's own timetable in a note: "The Circuit Court shall rule on the merits of this Petition within 90 calendar days of the date this Petition was filed. See Act 2019-464."

## What you must do before you file

1. **Decide which licensing board or commission you are petitioning against**, and get its mailing address, city, state, ZIP and telephone number. All five are blank, and the petition cannot be served without them.
2. **Write the list of convictions, court case numbers and collateral consequences** the order should apply to. This list is the relief you are asking for; see the table.
3. **Read the three sworn statements on page 1** — that you are eligible, that you have not filed a petition covering the same conviction in another circuit, and that you have not been denied within the last two years — and satisfy yourself that each is true of you. The form warns that if you have been denied within the last two years, **you must ask the court for permission to proceed**.
4. **Mark the previous-application boxes on page 1**: Granted, Denied, or Not applicable.
5. **Write the last four digits of your Social Security number** in the "XXX-XX-______" box on page 2. The platform holds no Social Security number.
6. **Copy the court case number from the page 1 header into the headers of pages 2 and 3.** See the note under the table for why those two are blank.
7. **Take the petition to a notary or other officer authorised to administer oaths and sign it in front of them.** Page 2 is sworn: "Before me, the undersigned authority, personally appeared the Petitioner ... and who being duly sworn, deposes and says that he/she has read the foregoing Petition ... and that the facts herein are true and correct." Your printed name is filled in; the **signature line and the whole jurat below it are not**, and the officer completes the jurat.

## The items you must supply

| Page | The blank on the form | What to write |
| --- | --- | --- |
| 1 | Caption — "v. ______, Respondent" (\`Licensing Board or Commission\`) | the name of the licensing board or commission you are petitioning against |
| 1 | "(Mailing Address of Board or other entity to be served)" (\`Mailing Address of Board or other entity to be served\`) | that board's street address |
| 1 | "(City, State, Zip Code)" under the same block (\`City State Zip Code\`) | that **board's** city, state and ZIP — not your own |
| 1 | "(Telephone Number)" under the same block (\`Telephone Number\`) | that **board's** telephone number — not your own |
| 1 | "If granted or denied, list the county and case number:" | the county and case number of a **previous** Order of Limited Relief application, if you made one. Leave blank if you did not |
| 1 | The "( ) Granted; ( ) Denied; ( ) Not applicable" boxes | mark the one that is true of any previous application |
| 1 | The five rules under "The following is a list of conviction(s) and court case number(s) as well as collateral consequences to which the Order of Limited Relief should apply" | your conviction or convictions, their court case numbers, and the collateral consequences you want lifted. Use as many of the five rules as you need |
| 2 | "XXX-XX-______" (inside the PDF, \`Text1\`) | the last four digits of your Social Security number |
| 2 | Court Case Number header (\`Court Case Number_2\`) | copy the case number from the page 1 header |
| 2 | "(Petitioner-Signature)" | your signature, made in front of the notary or other officer. Your printed name is already on the line above it |
| 3 | Court Case Number header (\`Court Case Number_3\`) | copy the same case number |

**Why the page 2 and page 3 case-number boxes are blank.** The case number is written in the page 1 header and this packet holds it. It is not written in the other two because of how the form names those widgets: they are called \`Court Case Number_2\` and \`Court Case Number_3\`, and the shared field binder reads a trailing number in a field name as a **charge row number**. On a matter with more than one charge that does not leave the boxes empty — it prints a *different* charge's case number in them. Leaving them for you to copy is the safe answer, and it is one line of copying.

## The choices that are yours

| The choice | Why it is yours |
| --- | --- |
| Granted / Denied / Not applicable, for a previous application | whether you have applied before, and what happened, is a fact about your own history. The platform holds nothing about it |
| which licensing board or commission to name as Respondent | the petition is aimed at one body's consequence, and which one is your decision |
| which convictions and which collateral consequences to list | this list defines the relief you are asking the court for |

## What the notary fills in, and what the server fills in

- **The officer administering the oath** — a notary public or other authorised officer — completes the jurat on page 2: the day, month and year of "Sworn to and subscribed before this ___ day of ______, ____", their own signature, and, if a notary, their commission expiry. None of it is yours or the platform's.
- **Whoever serves the petition** completes the whole of page 3: the type of process server, their signature, printed name, address and telephone number, the county and date of delivery, or the date the certified-mail return receipt was received.

## What the platform deliberately left blank

- **Everything about the Respondent** — its name, street address, city, state, ZIP and telephone. The shared field binder would have written *your* city, state, ZIP and telephone into the board's block, publishing your own contact details as the address of the body you are suing. They are refused for that reason and are yours to supply.
- **Your signature on page 2**, and the whole notarial jurat beneath it.
- **The last four digits of your Social Security number.** The platform holds no Social Security number.
- **The list of convictions and collateral consequences.** The platform holds an offence and a case number and holds no collateral-consequence fact at all, and a half-written list is a half-written request for relief.
- **The county and case number of any previous application.** That is a different matter from this one.
- **The whole of page 3**, which belongs to whoever serves the petition.

## Where self-help ends

This packet prepares one form; it does not decide anything. Stop and get advice from a **lawyer licensed in Alabama** — or put the procedural question to the **clerk of the circuit court in the county in your caption**, who can say what the court requires even though the clerk cannot give legal advice — before filing, if any of these is true:

- **the venue is not obvious, you want to join several matters, you are seeking relief from something outside Alabama, the offence may be one the Act prohibits relief for, or the agency contests the petition.** The committed record for this packet names each of those by name: "Complex venue, joinder, foreign-relief, prohibited-offense, or agency-contested matters require attorney handoff."
- **you have been denied an Order of Limited Relief for a conviction related to this petition within the last two years.** Page 1's third sworn statement covers it and the form says what follows: "you must ask the court for permission to proceed with this request." Asking for that permission is not something this packet does.
- you cannot truthfully make one of page 1's three sworn statements — that you are not serving a custodial sentence with more than six months remaining, are not currently charged with a felony, and are not currently charged with a Class A misdemeanor alleged to have occurred within the past 12 months;
- you have filed a petition covering the same conviction in another circuit;
- what you want lifted is not an occupational licensing consequence. The Act's definition on page 2 excludes imprisonment, probation, parole, supervised release, forfeiture, restitution, fines, assessments, other costs of court and sex-offender registration responsibilities, and an Order of Limited Relief does not reach them.

**A hearing may or may not happen.** The committed record for this packet records that "The court may decide on the record; a hearing is not invariably required", and page 2 records that the court must rule within 90 calendar days of filing.

## What this packet is not

This is a prepared copy of the Alabama Unified Judicial System's own Form C-94A. It is not legal advice, it is not filed for you, and it does not decide whether an Order of Limited Relief can be granted.

_Route: ${ROUTE_KEY} — Ala. Code §§ 12-26-1 et seq. (Act 2019-464); venue under Ala. Code § 12-26-3_
`;
}
// ---- main --------------------------------------------------------------------
async function main() {
  const blocked = new Set(readJson(STALE_BLOCK).hashes ?? []);
  fs.mkdirSync(path.join(rootDir, OUT), { recursive: true });

  const documents = [];
  const allFindings = [];

  for (const doc of DOCUMENTS) {
    console.log(`\n=== ${doc.documentId} (${doc.documentRole}) ===`);
    const { bytes, indexEntry } = resolveSource(doc);
    console.log(`  source verified  sha256=${doc.sha256}  bytes=${bytes.length}`);

    const census = await censusDocument(doc, bytes);
    console.log(`  censused ${census.fields.length} fields across ${census.pages.length} pages`);

    const fixtures = {};
    for (const [label, facts] of [["canonical", CANONICAL], ["boundary", BOUNDARY]]) {
      const overflows = maxLengthOverflows(doc, census, facts);
      for (const o of overflows) {
        console.log(`  ${label}: ${o.field} refused — /MaxLen ${o.maxLength} < ${o.valueLength} characters of ${o.factId}`);
      }
      const result = await finalizeOfficialForm({
        sourceBytes: bytes,
        expectedSha256: doc.sha256,
        census: census.fields,
        facts,
        explicitMappings: doc.explicitMappings,
        unwritableFields: [
          ...doc.unwritable.map((u) => ({ field: u.field, class: u.class })),
          ...overflows.map((o) => ({ field: o.field, class: o.class }))
        ],
        captionOnly: doc.captionOnly,
        documentTextLines: census.documentTextLines,
        title: `AL ${doc.documentId}`
      });

      const rel = `${OUT}/fixtures/${doc.key}-${label}-filled.pdf`;
      fs.mkdirSync(path.dirname(path.join(rootDir, rel)), { recursive: true });
      fs.writeFileSync(path.join(rootDir, rel), result.bytes);
      const hash = sha256(result.bytes);
      if (blocked.has(hash)) fail(`${doc.documentId}/${label}: rendered to a BLOCKED hash`, hash);

      const proof = await verifyFromBytes({
        file: path.join(rootDir, rel), census, report: result.report,
        label: `${doc.key}-${label}`, documentId: doc.documentId
      });
      allFindings.push(...proof.findings);

      console.log(`  ${label}: wrote ${result.report.written.length}, refused ${result.report.refused.length}`
        + `, sha256=${hash.slice(0, 16)}…  charge-blanks checked=${proof.chargeBlanks.length}`
        + `  findings=${proof.findings.length}`);

      fixtures[label] = { file: rel, sha256: hash, byteLength: result.bytes.length, report: result.report, proof, overflows };
    }

    documents.push({ doc, census, indexEntry, fixtures, sourceByteLength: bytes.length });
  }

  // ---- the records -------------------------------------------------------------
  writeJson(`${OUT}/source-receipt.json`, {
    schemaVersion: "rcap-family-source-receipt/v1",
    familyId: FAMILY_ID,
    worklistGroupId: FAMILY_ID,
    implementationStrategy: "official_pdf_fill",
    jurisdiction: "AL",
    routeKeys: [ROUTE_KEY],
    custodyClass: "SOURCE_ALREADY_HELD",
    acquisitionCommissioned: false,
    whyNoAcquisition:
      "Both document sources resolve to files already in the verified corpus and bind by exact SHA-256. Nothing "
      + "was fetched from a court host. The pinned Master Library was recovered through "
      + "scripts/rcap-corpus/bootstrap-private-corpus.sh, which verifies the archive hash and the corpus's own "
      + "governance checksums before extracting.",
    sourceArchive: "Expungement_AI_RCAP_Master_Library_Edition_1",
    allSourcesExact: true,
    documents: documents.map(({ doc, indexEntry, sourceByteLength }) => ({
      documentId: doc.documentId,
      documentRole: doc.documentRole,
      officialTitle: doc.officialTitle,
      revision: doc.revision,
      sha256: doc.sha256,
      byteLength: sourceByteLength,
      pathInArchive: doc.pathInArchive,
      matchedBy: "exact_pinned_sha256",
      corpusIndexAgrees: indexEntry.sha256 === doc.sha256 && indexEntry.byteLength === sourceByteLength,
      pageCount: indexEntry.pageCount,
      acroFieldCount: indexEntry.acroFieldCount,
      structuralClassObserved: indexEntry.structuralClassObserved
    })),
    whatThisReceiptDoesNotEstablish: [
      "that this is the current official edition of either form",
      "that neither has been superseded since the archive was assembled",
      "that any output is approved for participant delivery"
    ]
  });

  writeJson(`${OUT}/field-census.census-v1.json`, {
    schemaVersion: "rcap-official-form-field-census/v1-census-v1",
    familyId: FAMILY_ID,
    censusBasis: "first_hand_inspection_of_the_pinned_verified_binary",
    geometryBasis:
      "Every write box is the AcroForm widget's own /Rect, read from the document. No box is derived from a "
      + "label position; captions are captured separately and decide only what a blank means, never where it is.",
    filenameNote:
      "Deliberately NOT named field-census.json. "
      + "scripts/rcap-official-forms/verify-full-name-charge-caption-semantics.mjs walks the overlays for that "
      + "exact filename and asserts family and field totals equal counts frozen in a diff record outside this "
      + "family's owned path. Enrolling a new census under that name would change those totals. The guard is not "
      + "weakened or skipped: this family's own charge-caption projection is recorded in "
      + "reports/charge-caption-proof.json.",
    documents: documents.map(({ doc, census }) => ({
      documentId: doc.documentId,
      documentRole: doc.documentRole,
      ownership: doc.ownership,
      captionOnly: doc.captionOnly,
      pageGeometry: census.pageGeometry,
      fieldCount: census.fields.length,
      fields: census.fields
    }))
  });

  writeJson(`${OUT}/production-field-map.json`, {
    schemaVersion: "rcap-official-form-field-map/v1-census-v1",
    familyId: FAMILY_ID,
    routeKeys: [ROUTE_KEY],
    renderStrategy: "acroform_fill",
    generationAllowed: false,
    runtimeSelectable: false,
    documents: documents.map(({ doc, census, fixtures }) => {
      const written = fixtures.canonical.report.written;
      const byName = new Map(census.fields.map((f) => [f.name, f]));
      return {
        documentId: doc.documentId,
        documentRole: doc.documentRole,
        ownership: doc.ownership,
        captionOnly: doc.captionOnly,
        explicitMappings: doc.explicitMappings,
        printedLabelCorrections: doc.printedLabelCorrections ?? {},
        partialFills: doc.partialFills ?? [],
        declaredRequiredBeforeFilingWithHeldFact: doc.declaredRequiredBeforeFilingWithHeldFact ?? [],
        partialFillNote:
          "A blank this packet fills only partly. Each entry names what the blank asks for, what was written, what "
          + "was not, and where the participant is told to complete it. Declared here rather than left to be "
          + "discovered on the paper.",
        printedLabelCorrectionNote:
          "Each entry replaced the harvested caption for one named widget with the printed text this build read "
          + "at that widget's own measured position, because the widget's name says nothing or says the wrong "
          + "thing. The harvested value each replaced is kept on the field-census row as harvestedLabel, and the "
          + "evidence for each correction is in the entry itself.",
        roleRefusals: doc.unwritable,
        writeBoxes: written.map((w) => {
          const f = byName.get(w.field);
          return {
            field: w.field,
            factId: w.factId ?? null,
            page: f?.widgets?.[0]?.page ?? null,
            rect: f?.widgets?.[0]?.rect ?? null,
            rectBasis: "acroform_widget_rect_read_from_the_document",
            measuredRuleUnderWriteBox: f?.measuredRuleUnderWriteBox ?? null,
            effectiveLabel: f?.effectiveLabel ?? null
          };
        }),
        refused: fixtures.canonical.report.refused,
        protectedFields: fixtures.canonical.report.protectedFields,
        fields: completenessFields({ doc, census, written })
      };
    })
  });

  writeJson(`${OUT}/reports/actual-writes.json`, {
    schemaVersion: "rcap-actual-writes-byte-proof/v1",
    familyId: FAMILY_ID,
    derivedFromArtifactBytes: true,
    note:
      "What each finished fixture actually carries, read back from its own bytes. The finalizer's report says "
      + "what this build believes it wrote; this says what the paper shows.",
    artifacts: actualWritesArtifacts(documents)
  });

  const chargeBlanks = documents.flatMap(({ doc, fixtures }) =>
    ["canonical", "boundary"].flatMap((label) =>
      fixtures[label].proof.chargeBlanks.map((b) => ({ document: doc.documentId, fixture: label, ...b }))));

  writeJson(`${OUT}/reports/charge-caption-proof.json`, {
    schemaVersion: "rcap-charge-caption-proof/v1",
    familyId: FAMILY_ID,
    question:
      "Does any blank whose caption or field name names a charge, offence, count, statute or violation "
      + "carry a participant name token in the rendered artifact bytes?",
    method:
      "Read back from the flattened appearance streams of each rendered fixture with "
      + "scripts/rcap-official-forms/pdf-flattened-widgets.mjs, at each field's own measured widget rectangle.",
    consistentWith: "scripts/rcap-official-forms/verify-full-name-charge-caption-semantics.mjs",
    participantNameTokensSearchedFor: NAME_TOKENS,
    chargeBlanksExamined: chargeBlanks.length,
    chargeBlanksCarryingAParticipantName: chargeBlanks.filter((b) => b.participantNameTokensFound.length).length,
    answer: chargeBlanks.some((b) => b.participantNameTokensFound.length)
      ? "YES — this build is defective"
      : "NO — no participant name lands in any charge-caption blank in any fixture",
    blanks: chargeBlanks,
    guardProjection: (() => {
      const offending = [];
      let scanned = 0;
      for (const { doc, census } of documents) {
        for (const field of census.fields) {
          scanned += 1;
          const decision = decideBinding(
            { name: field.name, pdfType: field.type, effectiveLabel: field.effectiveLabel ?? null }, {}
          );
          const usesChargeVocabulary = [field.name, field.effectiveLabel]
            .filter(Boolean).some((t) => CHARGE_VALUE_WORDS.test(String(t)));
          if (decision.writable === true && decision.factId === "participant.full_legal_name" && usesChargeVocabulary) {
            offending.push({ document: doc.documentId, field: field.name, effectiveLabel: field.effectiveLabel });
          }
        }
      }
      return {
        question:
          "Applying the corpus guard's own offending-row test to this family's census: does any blank bind a "
          + "writable participant.full_legal_name while its name or caption uses the charge vocabulary?",
        fieldsScanned: scanned,
        offendingRows: offending.length,
        offending
      };
    })()
  });

  const namePlacements = documents.flatMap(({ doc, fixtures }) =>
    ["canonical", "boundary"].flatMap((label) =>
      fixtures[label].proof.namePlacements.map((n) => ({ document: doc.documentId, fixture: label, ...n }))));
  writeJson(`${OUT}/reports/participant-name-placement.json`, {
    schemaVersion: "rcap-participant-name-placement/v1",
    familyId: FAMILY_ID,
    question:
      "In the rendered artifact bytes, does every drawn participant-name token sit in a blank this family "
      + "listed as one the name belongs in?",
    method:
      "Every flattened appearance in each fixture is read and matched back to the censused blank at its own "
      + "measured rectangle.",
    blanksTheNameMayAppearIn: NAME_MAY_APPEAR_IN,
    placementsFound: namePlacements.length,
    placementsOutsideTheAllowlist: namePlacements.filter((n) => !n.allowed).length,
    placements: namePlacements
  });

  writeJson(`${OUT}/reports/rendered-artifacts.json`, {
    schemaVersion: "rcap-rendered-artifacts/v1",
    familyId: FAMILY_ID,
    renderedFresh: true,
    citesNoBlockedHash: true,
    staleArtifactBlock: STALE_BLOCK,
    note:
      "Rendered fresh from the pinned source bytes. Every output hash below was checked against the hashes in "
      + "the stale-artifact block and matches none of them.",
    rasterisation: {
      performedHere: false,
      why:
        "This container resolves no browser, so no page raster is produced at build time. The render happens "
        + "centrally in .github/workflows/rcap-packet-raster-acceptance-batch.yml against the exact bytes the "
        + "hashes below pin. This family is BUILT_RASTER_PENDING and no visual obligation is waived by it.",
      rasters: []
    },
    packets: [{
      packetId: FAMILY_ID,
      documents: documents.flatMap(({ doc, fixtures }) =>
        ["canonical", "boundary"].map((label) => `${doc.documentId} (${label})`))
    }],
    artifacts: documents.flatMap(({ doc, fixtures }) =>
      ["canonical", "boundary"].map((label) => ({
        document: doc.documentId, fixture: label,
        file: fixtures[label].file, sha256: fixtures[label].sha256, byteLength: fixtures[label].byteLength,
        fieldsWritten: fixtures[label].report.written.length,
        fieldsRefused: fixtures[label].report.refused.length,
        unfittable: fixtures[label].report.unfittable,
        refusedForExceedingFormDeclaredMaxLength: fixtures[label].overflows ?? []
      })))
  });

  const blanksLeft = documents.flatMap(({ doc, census, fixtures }) => {
    const written = new Set(fixtures.canonical.report.written.map((w) => w.field));
    const refusedBy = new Map(fixtures.canonical.report.refused.map((r) => [r.field, r]));
    const roleWhy = new Map(doc.unwritable.map((u) => [u.field, u.why]));
    return census.fields.filter((f) => !written.has(f.name)).map((f) => ({
      document: doc.documentId,
      field: f.name,
      page: f.widgets?.[0]?.page ?? null,
      effectiveLabel: f.effectiveLabel,
      reason: refusedBy.get(f.name)?.reason ?? "not_reached",
      category: refusedBy.get(f.name)?.category ?? null,
      why: roleWhy.get(f.name) ?? null
    }));
  });
  writeJson(`${OUT}/reports/blanks-left-for-the-participant.json`, {
    schemaVersion: "rcap-participant-blanks/v1",
    familyId: FAMILY_ID,
    note:
      "Every blank this family does not fill, and why. A blank here is not an omission to be closed later by "
      + "widening the map: each is either the participant's to complete, the court's, or a value the platform "
      + "does not hold.",
    count: blanksLeft.length,
    blanks: blanksLeft
  });

  fs.writeFileSync(path.join(rootDir, `${OUT}/participant-instructions.md`), participantInstructionsMarkdown());

  writeJson(`${OUT}/approval-request.json`, {
    schemaVersion: "rcap-output-approval-request/v1",
    familyId: FAMILY_ID,
    routeKeys: [ROUTE_KEY],
    status: "REQUESTED",
    grantedBy: null,
    note:
      "This is a REQUEST for output-level legal review. This build grants no approval, opens no commercial "
      + "route, creates no fulfillment record and marks no packet proven. The family remains not runtime-"
      + "selectable and generationAllowed is false.",
    workTypesAddressed: {
      OFFICIAL_SOURCE_ACQUISITION_REQUIRED:
        "Resolved as custody, not acquisition: both sources were already held and are bound by pinned SHA-256.",
      OFFICIAL_FORM_MAP_REQUIRED:
        "Field map built from measured widget geometry for both documents.",
      ARTIFACT_REVIEW_REQUIRED:
        "Canonical and boundary fixtures rendered and verified from the artifact bytes. Page rasterisation is "
        + "central and pending; this family is BUILT_RASTER_PENDING.",
      OUTPUT_LEGAL_APPROVAL_REQUIRED:
        "NOT addressed. Requested here; a human legal reviewer grants it or does not."
    },
    independentVisualReviewRequired: true
  });

  writeJson(`${OUT}/build-findings.json`, {
    schemaVersion: "rcap-build-findings/v1",
    familyId: FAMILY_ID,
    blocking: allFindings.filter((f) => f.severity === "blocking"),
    findingCount: allFindings.length
  });

  console.log(`\n${allFindings.length === 0 ? "OK" : "FINDINGS"}: `
    + `${chargeBlanks.length} charge-caption blanks examined across all fixtures, `
    + `${chargeBlanks.filter((b) => b.participantNameTokensFound.length).length} carrying a participant name.`);
  if (allFindings.length) {
    for (const f of allFindings) console.error(`  ${f.severity} ${f.fixture} ${f.field}: ${f.check}`);
    process.exit(1);
  }
}

await main();
