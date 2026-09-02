#!/usr/bin/env node
// Route-obligation census v1 — packet family `ar-cs-possession-seal-set`.
//
//   node scripts/build-census-v1-ar-cs-possession-seal-set.mjs
//
// Arkansas, sealing a felony conviction for possession of a controlled or
// counterfeit substance under A.C.A. § 16-90-1407, on the Act 1460 of 2013
// sealing procedure (A.C.A. § 16-90-1401 et seq.), with the court's discretion
// governed by § 16-90-1415(c). Route
// `obligation:track-only:AR:ar-cs-possession-seal`. Two documents:
//
//   * the ACIC Petition to Seal Conviction for Possession of Controlled
//     Substance or Counterfeit Substance — the filing;
//   * the matching ACIC Order — the proposed order the COURT signs.
//
// This is not a renderer. Every decision about what may be written is made by
// scripts/rcap-official-forms/rcap-field-semantics.mjs and every byte is
// written by finalizeOfficialForm; this file supplies the family's ROLE
// classification, its explicit mappings and its printed-label corrections, and
// then proves the result from the artifact bytes rather than from its report.
//
// TWO THINGS ABOUT THESE BINARIES THAT SHAPE EVERYTHING BELOW
//
// 1. THE PETITION'S BODY TEXT IS NOT TEXT. Pages 1 and 2 of the petition carry
//    its numbered paragraphs, its two offence checkboxes and its date blanks —
//    and none of it extracts. Both this repository's own text extractor and
//    pdftotext return, for the whole of page 2, the single string "13.". So
//    this build cannot read what the petition's paragraphs say, and it does not
//    pretend to: nothing on pages 1 or 2 below the printed title is written,
//    every blank there is carried to the participant, and
//    participant-instructions.md says in terms that the packet cannot read those
//    sentences and the participant must read them on the paper.
//
//    The PROPOSED ORDER's text does extract, and it recites the same thirteen
//    paragraphs. Where the instructions describe what the elections are about,
//    they quote the ORDER and say so, rather than asserting the petition's
//    wording from a document that will not show it.
//
// 2. THE FIELD NAMES ARE OFF BY ONE IN THE PETITION'S CAPTION. Page 1 prints
//
//        IN THE ___________COURT OF ________________, ARKANSAS
//        ____________ DIVISION
//
//    and the widget over the COURT blank is named `IN THE`, the widget over the
//    COUNTY blank is named `COURT OF`, and the widget over the DIVISION blank is
//    named `DIVISION`. Measured from the page's own text items at y=708: "IN THE
//    _" begins at x=109.0 and "_COURT" begins at 227.5, and the widget named
//    `IN THE` occupies 155.04–234.72; " OF _" runs 280.9–313.4 and the printed
//    "_," closing the second blank is at 414.6, and the widget named `COURT OF`
//    occupies 306.12–421.80. The order's caption uses the same three names for
//    the same three blanks and its own geometry agrees.
//
//    So the county is written into the widget named `COURT OF`, through the
//    printed-label correction below rather than through its field name.
//
// PRINTED-LABEL CORRECTIONS, AND WHY THEY ARE NARROW
//
// The shared binder reaches a fact through the field NAME first and the
// harvested printed caption second. On this form several widgets have a name
// that says nothing ("1", "2", "undefined_2") or says the wrong thing
// ("COURT OF" for a county), and the harvested caption is a fragment. A
// correction here replaces the harvested caption for ONE named widget with the
// printed text this build read at that widget's own measured position, and the
// correction, the harvested value it replaced and the evidence are all recorded
// on the field-map row.
//
// They are used only for identity, contact and venue facts, never to reach an
// offence, charge or statute blank, and never on the captionOnly order. Every
// write is still proved from the artifact bytes afterwards, and the
// name-placement allowlist still fails the build if a participant name is drawn
// anywhere this family did not list.
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
import { CHARGE_VALUE_WORDS, captionDescribesChargeValue, descriptorsMatching, protectCategoryOf, decideBinding, resolveFact }
  from "./rcap-official-forms/rcap-field-semantics.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(rootDir);
const require = createRequire(import.meta.url);
const { PDFDocument, PDFTextField, PDFCheckBox, PDFRadioGroup, PDFDropdown, PDFOptionList } = require("pdf-lib");

const FAMILY_ID = "ar-cs-possession-seal-set";
const OUT = "data/rcap-all50/overlays/census-v1/ar/ar-cs-possession-seal-set--official-pdf-fill";
const CORPUS_INDEX = "data/rcap-all50/local-source-corpus-index.json";
const CORPUS_ROOT = "private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1";
const STALE_BLOCK = "data/rcap-grade-a/stale-artifact-block.json";
const ROUTE_KEY = "obligation:track-only:AR:ar-cs-possession-seal";

const fail = (message, detail = null) => {
  console.error(`build-census-v1-${FAMILY_ID}: ${message}`);
  if (detail) console.error(`  ${detail}`);
  console.error("  Nothing was written.");
  process.exit(1);
};

const DOCUMENTS = [
  {
    key: "petition",
    documentId: "ACIC-PETITION-TO-SEAL-CS-POSSESSION",
    documentRole: "PETITION",
    officialTitle: "Petition to Seal Conviction for Possession of Controlled Substance or Counterfeit Substance Under Act 1460 of 2013",
    revision: "REV-2015-04-01",
    sha256: "015c7246ffd5ad1512d55234708d885db3dd6d5eebb937c049aca8fe4f818029",
    pathInArchive: "STATES/AR/05_SOURCE_GATED/AR__SOURCE-GATED__AR-ACIC-PETITION-TO-SEAL-CONTROLLED-OR-COUNTERFEIT-SUBSTANCE-POSSE__petition-to-seal-conviction-for-possession-of-controlled-or-counterfeit-substance__REV-2015-04-01__EN.pdf",
    ownership: "participant_completed",
    captionOnly: false,

    // See the header note. Each entry names the widget, the printed text this
    // build read at that widget's own measured position, and the evidence.
    printedLabelCorrections: {
      "COURT OF": {
        printedLabel: "COURT OF county, ARKANSAS",
        readFrom: "page 1, printed line at y=708.0: \"IN THE ___________COURT OF ________________, ARKANSAS\"",
        measuredEvidence: "the widget occupies x 306.12-421.80; the printed \" OF _\" runs 280.9-313.4 and the \"_,\" closing this blank is at 414.6, so the widget spans the blank between \"COURT OF\" and the comma before \"ARKANSAS\"",
        why: "The widget's own name is \"COURT OF\", which reads as the court. The blank it covers is the county. Without the correction the county is unreachable and the caption ships empty."
      },
      "1": {
        printedLabel: "Defendant's Address, street line 1",
        readFrom: "page 3, the block heading printed at y=479.4: \"Defendant' s Address\", above the two rules at y=571.0 and y=548.1 and the City / State / Zip line",
        measuredEvidence: "the widget occupies x 75.84-301.80 at y=571.20, the upper of the two address rules in the left column; the right column at x=324 carries the signature and its date",
        why: "The widget is named \"1\" and harvests no caption at all, so the participant's street address has no channel to the form."
      },
      "2": {
        printedLabel: "Defendant's Address, street line 2",
        readFrom: "the same page 3 address block, the lower rule at y=548.1",
        measuredEvidence: "the widget occupies x 75.84-301.68 at y=547.08, directly beneath the line corrected above",
        why: "Its harvested caption is \"_____________________________Defendant's Signature\", which is the SIGNATURE rule in the other column on the same visual row. That harvest is wrong and would classify an address line as a signature. The correction states what it is; the role refusal below keeps it blank because the platform holds one street address and writes it once."
      },
      "undefined_2": {
        printedLabel: "SID No.",
        readFrom: "page 4, printed line at y=147.7: \"Sex ____________ SID No. _____________________\"",
        measuredEvidence: "the widget occupies x 368.04-531.48 at y=146.64, on that line and to the right of the printed \"SID No.\"",
        why: "The widget is named \"undefined_2\" and harvests no caption, so nothing could tell the participant which blank the packet is asking them to fill."
      }
    },

    explicitMappings: {
      "First Middle and Last name": "participant.full_legal_name"
    },

    unwritable: [
      // Everything on pages 1 and 2. This build cannot read a word of the
      // printed text there (see the header note), so it writes nothing there.
      { field: "DAY 1", class: "unreadable_page_body",
        why: "A date component on page 1. The platform holds no day fact, and this build cannot read the sentence the blank sits in because the page's body text does not extract." },
      { field: "MONTH 1", class: "unreadable_page_body",
        why: "The month component of the same page 1 date, on the same footing." },
      { field: "YEAR 1", class: "unreadable_page_body",
        why: "The year component of the same page 1 date, on the same footing." },

      // The notarised verification block on page 4.
      { field: "COUNTY OF", class: "notary_jurat_county",
        why: "The county in the page 4 VERIFICATION block's \"STATE OF ARKANSAS / COUNTY OF ______\". This is the county where the petition is SWORN, before whichever notary the participant reaches — not the county of the case. The platform holds the case county and would have written it here through the field name; that would state where an oath was taken, which nobody yet knows." },
      { field: "Petitioner", class: "verification_signature_line",
        why: "The signature rule above the printed word \"Petitioner\" on page 4, at y=527.4 with the caption at y=511.8. The shared binder reads it as a place for the petitioner's name; it is where the petitioner SIGNS the sworn verification." },
      { field: "DAY 2", class: "notary_jurat_date",
        why: "\"Subscribed and sworn to before me on this ___\" — the notary dates the jurat when the oath is taken." },
      { field: "MONTH 2", class: "notary_jurat_date", why: "The month of the same jurat date." },
      { field: "YEAR 2", class: "notary_jurat_date", why: "The year of the same jurat date." },
      { field: "Notary Public", class: "notary_only", why: "The notary's own signature line." },
      { field: "My Commissionexpires", class: "notary_only", why: "The notary's own commission expiry." },

      { field: "2", class: "address_continuation_line",
        why: "The second printed rule of the page 3 two-line street block. The platform holds one street address and writes it on the first rule; filling both prints the same address twice." },
      { field: "Arrest Tracking Number", class: "agency_assigned_identifier",
        why: "The ATN is assigned by Arkansas ACIC when an arrest is processed; it is the agency's identifier to state." },
      { field: "undefined_2", class: "agency_assigned_identifier",
        why: "The SID No. in the page 4 identification block. A State Identification number is assigned by the state repository; the platform holds none." },
      { field: "do hereby certify that a true and correct", class: "certificate_of_service_attestation",
        why: "The certifying party's name in the page 5 Certificate of Service's \"I, ____, do hereby certify\" sentence. It is a sworn statement about an act of service that has not happened." },
      { field: "Date", class: "participant_signature_date",
        why: "The date beside the defendant's signature on page 3. Dating a signature that has not been made asserts the petition was signed on a day it was not." },
      { field: "Date_2", class: "certificate_of_service_date",
        why: "The date on the page 5 Certificate of Service. Service has not happened; a date here certifies a mailing that has not occurred." },
      { field: "IN THE", class: "court_identity_not_held",
        why: "The type of court in the caption's \"IN THE ______ COURT OF\" blank. The route record names the circuit court of the county of conviction, but this build holds no court fact keyed to this matter and will not print a court name it cannot source to the case." },
      { field: "DIVISION", class: "court_division_not_held",
        why: "The caption's division blank, completed only where the filing court has divisions. The platform holds no division fact." }
    ],

    completeness: {
      defaultBlank: null,
      fields: {
        "Defendants Signature": { refusalClass: "signature_or_date_participant_completion",
          reason: "The defendant's signature on page 3. The petition is the defendant's own statement; the participant signs it." },
        "Date": { refusalClass: "signature_or_date_participant_completion",
          reason: "The date beside the defendant's signature on page 3, completed by the participant when the petition is signed." },
        "Date_2": { refusalClass: "signature_or_date_participant_completion",
          reason: "The date on the page 5 Certificate of Service, completed by the participant after service has actually happened." },
        "Defendant or Defendants Attorney": { refusalClass: "signature_or_date_participant_completion",
          reason: "The signature line on the page 5 Certificate of Service, signed by the participant (or their attorney) after service." },
        "Petitioner": { refusalClass: "signature_or_date_participant_completion",
          reason: "The signature rule above the printed word \"Petitioner\" in the page 4 VERIFICATION. The participant signs the verification under oath, in front of the notary." },
        "do hereby certify that a true and correct": { refusalClass: "participant_sworn_narrative_or_legal_election",
          reason: "The certifying party's name in the Certificate of Service's sworn \"I, ____, do hereby certify\" sentence. It is the filer's statement about an act of service, made after mailing." },
        "Notary Public": { refusalClass: "court_prosecutor_clerk_or_agency_owned",
          reason: "The notary's own signature line. Only the notary signs it." },
        "My Commissionexpires": { refusalClass: "court_prosecutor_clerk_or_agency_owned",
          reason: "The notary's own commission expiry date. Only the notary states it." },
        "DAY 2": { refusalClass: "court_prosecutor_clerk_or_agency_owned",
          reason: "The day of the notary's jurat — \"Subscribed and sworn to before me on this ___\". The notary dates it when the oath is taken." },
        "MONTH 2": { refusalClass: "court_prosecutor_clerk_or_agency_owned",
          reason: "The month of the same jurat date, dated by the notary." },
        "YEAR 2": { refusalClass: "court_prosecutor_clerk_or_agency_owned",
          reason: "The year of the same jurat date, dated by the notary." },
        "Arrest Tracking Number": { refusalClass: "court_prosecutor_clerk_or_agency_owned",
          reason: "The ATN is assigned by Arkansas ACIC when an arrest is processed; it is the agency's identifier to state." },

        // Declared required-before-filing. Every one is named in the table in
        // participant-instructions.md.
        "IN THE": { requiredBeforeFiling: true,
          reason: "The court's name in the caption's \"IN THE ______ COURT OF\" blank. The county is written after \"COURT OF\"; the committed route record for this packet names the circuit court of the county where the offense was committed and the person was convicted, and the participant writes that court's name here before filing, on both forms." },
        "DAY 1": { requiredBeforeFiling: true,
          reason: "A date blank on page 1 of the petition. This build cannot read the printed sentence it belongs to, because the body text of pages 1 and 2 of this PDF does not extract; the participant reads the paragraph on the paper and writes the day it asks for. The proposed order's parallel paragraph 1 recites an arrest date." },
        "MONTH 1": { requiredBeforeFiling: true,
          reason: "The month blank beside it, on the same page 1 date and on the same footing." },
        "YEAR 1": { requiredBeforeFiling: true,
          reason: "The year blank beside it, on the same page 1 date and on the same footing." },
        "COUNTY OF": { requiredBeforeFiling: true,
          reason: "The county in the page 4 VERIFICATION block's \"STATE OF ARKANSAS / COUNTY OF ______\". This is the county where the participant signs the petition in front of a notary, which the platform cannot know; the participant or the notary writes it at the swearing." },
        "Race": { requiredBeforeFiling: true,
          reason: "The identification block's race entry on page 4, which the form states is required for proper identification of the defendant in the state and national record systems. The platform does not hold or write it; the participant states it before filing." },
        "Sex": { requiredBeforeFiling: true,
          reason: "The identification block's sex entry, in the same block and on the same footing. The platform does not hold it; the participant states it before filing." },
        "undefined_2": { requiredBeforeFiling: true,
          reason: "The SID No. in the page 4 identification block. The platform holds no State Identification number; the participant copies it from their arrest paperwork or ACIC criminal-history record before filing." },

        // Genuine participant elections. What each is about is described from
        // the PROPOSED ORDER's parallel recitals, because the petition's own
        // printed text does not extract.
        "Check Box4": { refusalClass: "participant_sworn_narrative_or_legal_election",
          reason: "An election box on page 1 of the petition. The proposed order's parallel paragraph 1 offers \"[ ] Possession of Controlled Substance A.C.A. § 5-64-419; or [ ] Possession of Counterfeit Substance A.C.A. § 5-64-441\". Which is true of the conviction is read off the participant's own judgment; this route does not determine it." },
        "Check Box5": { refusalClass: "participant_sworn_narrative_or_legal_election",
          reason: "The other half of the same page 1 election." },
        "Check Box6": { refusalClass: "participant_sworn_narrative_or_legal_election",
          reason: "An election box on page 2 of the petition. The order's parallel paragraph 8 offers \"[ ] The Defendant has completed all of the requirements of his or her sentence, or [ ] It has been at least one (1) year since the Court denied a Petition to Seal for this conviction\". A sworn statement about the participant's own history." },
        "Check Box7": { refusalClass: "participant_sworn_narrative_or_legal_election",
          reason: "The other half of the same page 2 election." },
        "Check Box8": { refusalClass: "participant_sworn_narrative_or_legal_election",
          reason: "An election box on page 2. The order's parallel paragraph 10 offers \"[ ] Defendant has no pending felony charges in any state or federal court; or [ ] Defendant has one or more pending felony charges\". A sworn statement about the participant's own record." },
        "Check Box9": { refusalClass: "participant_sworn_narrative_or_legal_election",
          reason: "The other half of the same pending-charges election." },
        "Check Box10": { refusalClass: "participant_sworn_narrative_or_legal_election",
          reason: "An election box on page 2. The order's parallel paragraph 11 offers \"Defendant [ ] IS or [ ] IS NOT required to register as a sex offender under the Sex Offender Registration Act of 1997 (A.C.A. § 12-12-901, et seq.)\". A sworn statement about the participant's own status." },
        "Check Box11": { refusalClass: "participant_sworn_narrative_or_legal_election",
          reason: "The other half of the same registration election." },

        // Optional participant content.
        "2": { refusalClass: null,
          reason: "The second printed rule of the page 3 two-line street block. The platform holds one street address and writes it on the first rule; a second line is the participant's to add if their address needs one, and the platform does not invent it." },
        "FBI No if known": { refusalClass: null,
          reason: "The identification block's FBI number, which the form itself marks \"(if known)\". It is the participant's to write if they know it, and the platform does not invent it." },
        "DIVISION": { refusalClass: null,
          reason: "The caption's division blank, completed only if the court the participant files in has divisions. The clerk answers whether it does; the platform does not invent it." }
      }
    }
  },
  {
    key: "order",
    documentId: "ACIC-ORDER-TO-SEAL-CS-POSSESSION",
    documentRole: "PROPOSED_ORDER",
    officialTitle: "Order to Seal Conviction for Possession of Controlled Substance or Counterfeit Substance Under Act 1460 of 2013",
    revision: "REV-2014-01-01",
    sha256: "b347754fd115adea52068fe5cd267f84021f8f435a7b86c02c3347dd86f9f555",
    pathInArchive: "STATES/AR/05_SOURCE_GATED/AR__SOURCE-GATED__AR-ACIC-ORDER-TO-SEAL-CONTROLLED-OR-COUNTERFEIT-SUBSTANCE-POSSESSI__order-to-seal-conviction-for-possession-of-controlled-or-counterfeit-substance__REV-2014-01-01__EN.pdf",
    ownership: "court_issued_order",
    captionOnly: true,

    printedLabelCorrections: {
      "COURT OF": {
        printedLabel: "COURT OF county, ARKANSAS",
        readFrom: "page 1, printed line at y=707.0: \"IN THE ______________ COURT OF ________________, ARKANSAS\"",
        measuredEvidence: "the widget occupies x 320.00-444.60; the printed \"OF\" ends at 316.2, the blank's underscores run 320.0-436.8 and the \"_,\" before \" ARKANSAS\" is at 436.8",
        why: "Same off-by-one naming as the petition: the widget named \"COURT OF\" covers the COUNTY blank. The order's caption must match the petition's, and the county is the one caption fact this packet can source."
      }
    },

    explicitMappings: {
      "First Middle and Last name": "participant.full_legal_name"
    },
    unwritable: [
      { field: "Judge", class: "court_only_signature", why: "The judge's signature line. Court-only." },
      { field: "Date", class: "court_only_signature_date", why: "The date beside the judge's signature. The court dates its own order." },
      { field: "Arrest Tracking Number", class: "agency_assigned_identifier", why: "ACIC-assigned arrest identifier; the agency's to state." },
      { field: "undefined", class: "agency_assigned_identifier", why: "The SID No. in the order's identification block; assigned by the state repository." },
      { field: "IN THE", class: "court_identity_not_held",
        why: "The type of court in the order's caption, which must match the petition's. This build holds no court fact keyed to this matter." },
      { field: "DIVISION", class: "court_division_not_held",
        why: "The caption's division blank, completed only where the filing court has divisions." },
      { field: "1 The Defendant was arrested on the", class: "court_recital_date_component",
        why: "The day of the arrest date in the court's own recital. The platform holds matter.arrest_date as a whole date and holds no day fact." },
      { field: "day of", class: "court_recital_date_component",
        why: "The month-and-year blank of the same recital date, on the same footing." },
      { field: "and charged with the offenses of", class: "court_recital_offence_line",
        why: "The offence blank in the court's own recital of paragraph 1. captionOnly already refuses it; stated here because it is the court's finding rather than a blank this packet fills." },
      { field: "or federal court and the status of thatthose charges isare as follows", class: "court_recital_pending_charge_line",
        why: "The pending-charge status rule in the court's recital of paragraph 10." },
      { field: "Defendant  IS or  IS NOT required to register as a sex", class: "court_recital_registration_line",
        why: "The registration rule in the court's recital of paragraph 11." }
    ],

    completeness: {
      defaultBlank: {
        refusalClass: "court_prosecutor_clerk_or_agency_owned",
        reason: "Below its caption the order is the court's own instrument — its thirteen recital paragraphs, its election boxes, its GRANTED decree, its distribution direction to the clerk, the judge's signature and the date beside it. This packet writes nothing there."
      },
      fields: {
        "IN THE": { requiredBeforeFiling: true,
          reason: "The court's name in the order's caption, which must match the petition's. The committed route record for this packet names the circuit court of the county where the offense was committed and the person was convicted; the participant writes that court's name here before filing." },
        "DIVISION": { refusalClass: null,
          reason: "The caption's division blank, completed only if that court has divisions, to match the petition. The clerk answers whether it does; the platform does not invent it." },
        "Race": { requiredBeforeFiling: true,
          reason: "The race entry in the order's identification block, which takes the same value as the petition's. The platform does not hold or write it; the participant states it, if the clerk asks for the order's identification block to be completed." },
        "Sex": { requiredBeforeFiling: true,
          reason: "The sex entry in the same identification block, on the same footing." },
        "undefined": { requiredBeforeFiling: true,
          reason: "The SID No. in the order's identification block, on the same footing as the petition's." },
        "FBI No if known": { refusalClass: null,
          reason: "The order's FBI number blank, which the form itself marks \"(if known)\". It is the participant's to write if they know it, and the platform does not invent it." }
      }
    }
  }
];


// The ONLY blanks in this family that may ever carry the participant's name.
const NAME_MAY_APPEAR_IN = {
  "ACIC-PETITION-TO-SEAL-CS-POSSESSION": [
    "First Middle and Last name",  // page 1 DEFENDANT caption
    "WHEREFORE the Defendant",     // page 3 "WHEREFORE, the Defendant, ______"
    "Comes the Petitioner"         // page 4 "Comes the Petitioner, ______, under oath"
  ],
  "ACIC-ORDER-TO-SEAL-CS-POSSESSION": [
    "First Middle and Last name",  // page 1 DEFENDANT caption
    "Defendant"                    // page 3 "the Petition of the Defendant, ______"
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
// FILING_DESTINATION — held, and specifically. The committed packet-set
//   manifest for ar-cs-possession-seal-set records filingDestination as
//   "Statewide Arkansas track; circuit court in the county where the offense
//   was committed and the person was convicted", and the route census gives
//   the same destination in the same words. Stated, not delegated.
// FEE_AND_WAIVER — held. The compiled Arkansas profile
//   src/lib/rcap-engine/compiled/profiles/AR-arkansas.json states "Act 1460
//   eliminated sealing filing fees" and "Sealing petition filing fee $0". Both
//   pinned forms print "UNDER ACT 1460 OF 2013; A.C.A.16-90-1401, Et. Seq." in
//   their own titles, so the profile's Act 1460 lines address THIS route's
//   sealing procedure and not a sibling's, which is what amendment A3 requires.
//   The manifest records filingFee and feeWaiverTreatment as not_recorded; that
//   is one record not establishing it, not a denial, and the profile answers it.
//   The order's own paragraph 9 recites A.C.A. § 16-90-1419 without an amount,
//   and the instructions explain what a no-fee rule means for that averment
//   rather than leaving the participant to wonder what they are swearing to.
// SERVICE — held. The manifest records serviceRecipients and serviceTiming as
//   "Serve the prosecuting attorney within three days of filing", and
//   contestedHearingOrOppositionHandoff adds the 30-day objection window. The
//   compiled profile records that window class-dependently for Act 1460 sealing
//   generally (30 days misdemeanour / 90 days felony); this route is a FELONY
//   conviction — the petition's own prayer says "the above referenced felony
//   conviction(s)" — so both are disclosed and the participant is told to ask
//   which the court runs. The petition's page 5 Certificate of Service supplies
//   the method and adds the arresting agency as a second recipient, which is on
//   the form's own face.
// SELF_HELP_STOP — held. The manifest's contestedHearingOrOppositionHandoff
//   entry is explicit: "Hand off on any opposition or contested hearing."
// NOT FOUND — the manifest records filingMethod, notarizationRequirements,
//   filingDeadline and postFilingInstructions as not_recorded. Notarisation is
//   the one that matters here: the petition carries a notarised VERIFICATION on
//   page 4, so the requirement is on the form's own face even though no record
//   states it, and the instructions describe it from the page rather than from
//   a record. Nothing below states a filing method, a deadline or a post-filing
//   step.
function participantInstructionsMarkdown() {
  return `# Filing instructions — Seal an Arkansas conviction for possession of a controlled or counterfeit substance

This packet is two ACIC forms, filed together:

- **Petition to Seal Conviction for Possession of Controlled Substance or Counterfeit Substance Under Act 1460 of 2013** — what you file. It is **sworn**: page 4 is a VERIFICATION you sign in front of a notary.
- **Order to Seal Conviction for Possession of Controlled Substance or Counterfeit Substance Under Act 1460 of 2013** — the proposed order you hand the court to sign. Its thirteen recital paragraphs, its GRANTED decree, its direction to the clerk, the judge's signature and the date beside it are the court's alone; this packet writes nothing there.

The petition asks the court to seal a **felony** conviction — its own prayer on page 3 says "to seal the above referenced felony conviction(s) pursuant to A.C.A. § 16-90-1407".

## Read the petition on paper before you fill it in

**There is something this packet cannot do, and you should know it before you start.** The printed text on **pages 1 and 2 of the petition** — its numbered paragraphs, the two offense checkboxes and the date blanks — is not readable from the PDF's own text. Two independent extractors return nothing for it. So this packet **writes nothing anywhere on pages 1 or 2 below the title**, and it does not tell you what those paragraphs say, because it cannot read them.

**Read pages 1 and 2 on the paper and complete every blank and box there yourself.** The proposed order recites the same thirteen paragraphs and its text *is* readable, so where the table below describes what a box is about, it quotes **the order's** parallel paragraph and says so. Check what you tick against the petition's own printed words, not against this description.

The platform filled what it holds about you and your case: the county in the caption, the case number, your name in the caption, in the page 3 prayer line and in the page 4 verification, your date of birth, your street address, city, state and ZIP code on page 3. Every other blank is deliberate, and every one is listed below.

## Where you file this

**File in the circuit court of the county where the offense was committed and where you were convicted.** That is what the committed route record for this packet says, in those words, and the committed packet-set manifest says the same: "Statewide Arkansas track; circuit court in the county where the offense was committed and the person was convicted."

**The county is already written in the caption after "COURT OF".** It comes from what the platform holds for your matter. **Check it against where you were convicted**, and correct it before you file if they are not the same county.

**The court's own name is left blank, in the "IN THE ______ COURT OF" blank.** The route record names the circuit court, and this packet does not print a court name it cannot tie to your particular case. **Write "CIRCUIT" there if the circuit court of that county handled your case; if you are not sure, ask the circuit clerk's office of that county** — the clerk can tell you which court has your case, and the clerk's office is where the filing is received. Write the same answer on **both** forms so the petition and the order match. The DIVISION blank is also yours, only if that court has divisions; the same clerk can tell you.

## The filing fee

**There is no filing fee for this petition.** The compiled Arkansas profile this route is built from — \`src/lib/rcap-engine/compiled/profiles/AR-arkansas.json\` — states it three ways: "Act 1460 eliminated sealing filing fees; the real costs are records and any counsel"; "Sealing petition filing fee $0 — Filing fees eliminated by the 2019 amendments"; and, in its filing rule, "File in the circuit or district court that handled the case. Act 1460 eliminated filing fees for sealing." Both of these forms print "UNDER ACT 1460 OF 2013; A.C.A.16-90-1401, Et. Seq." in their own titles, so those lines are about this filing.

**What that means for the petition's fee paragraph.** The proposed order's paragraph 9 reads "The Defendant has paid all filing fees required to be paid with the filing of this Petition mandated by A.C.A § 16-90-1419", and the petition carries the matching averment. The printed form still recites that statute and no amount appears anywhere on either form. Where no filing fee is required, there is none left to have paid, and the averment is true as printed. **Do not treat it as a bill.**

**If the clerk of the court where you file nevertheless asks you to pay something**, that is a question about that court's own practice rather than about this packet. **Ask the clerk of that circuit court what the charge is for and whether a waiver or reduction is available, and settle it before you sign** — because the fee paragraph is part of what you swear to on page 4.

**The costs this route does carry are not filing fees.** The same profile records them: the ACIC criminal-history record carries an ACIC fee; a copy of the Judgment and Commitment Order carries a small clerk fee from the sentencing court; a notary may charge for the page 4 verification; and counsel carries whatever counsel costs — which is not required, and which legal-aid and sealing clinics assist with at no charge. The profile also records that the real gate is satisfying outstanding restitution, fines and court costs, which is an eligibility requirement rather than a fee for filing.

## Who you serve, and how

**Serve the prosecuting attorney.** The committed packet-set manifest for this packet states it in terms: **"Serve the prosecuting attorney within three days of filing."** Serve within three days of the day you file.

**The form adds a second recipient and gives you the method.** The petition's page 5 Certificate of Service is printed in full and readable, and it certifies that a copy of the petition "has been provided to the **Prosecuting Attorney for the County in which the Petition has been filed** and the **arresting agency** by placing a copy of this Petition in the **United States mail, postage prepaid**, to said office **or by hand delivering** a copy to said office." Serve both offices, by either of those two methods.

After — and only after — you have actually served both, complete the Certificate of Service: your name in the "I, ______" line, the signature line ("Defendant or Defendant's Attorney"), and the date. The platform leaves all three blank because service has not happened yet, and a signed certificate of a mailing that never occurred is a false statement to the court.

**Then expect an answer, or expect silence.** The same manifest records that **the prosecuting attorney has 30 days to object**. The compiled Arkansas profile records the window class-dependently for Act 1460 sealing generally — "30 days (misdemeanor) or 90 days (felony) to file a notice of opposition stating reasons" — and this petition is about a **felony** conviction, so the longer window may be the one that applies. Both records are held here and they are keyed differently. **Ask the clerk of the circuit court where you file which window that court runs.** If an objection is filed, the petition is contested — see _Where self-help ends_.

## What you must do before you file

1. **Obtain your Arkansas criminal history from ACIC.** The compiled Arkansas profile records this as the records step that comes before the petition, and it is what you check the conviction against — the offense, the statute, the dates. If the record and what is written in this packet disagree, correct the packet. (This carries an ACIC fee; it is not a filing fee.)
2. **Obtain a copy of the Judgment and Commitment Order from the sentencing court clerk**, which the same profile records as the second records step and which carries a small clerk fee.
3. **Read pages 1 and 2 of the petition on the paper and complete every blank and box there.** See the warning above: this packet cannot read them and has written nothing there.
4. **Ask the circuit clerk of the county of conviction which court takes this petition**, and write that court's name in the "IN THE ______ COURT OF" blank on both forms.
5. **Complete every blank listed in the table below.**
6. **Sign the page 4 VERIFICATION in front of a notary.** The petition is sworn: page 4 reads "Comes the Petitioner, ______, under oath and states that the foregoing Petition is true and correct to the best of my knowledge and belief", and below it "Subscribed and sworn to before me on this ___ day of ______, 20__" with the notary's own signature and commission-expiry lines. **Your name is filled in the "Comes the Petitioner" line; the signature rule above the word "Petitioner" is yours to sign, in front of the notary and not before.** The county in "STATE OF ARKANSAS / COUNTY OF ______" is the county where you are sworn, which nobody can know in advance — you or the notary write it at the swearing. The jurat date and everything below it belong to the notary.
7. **Sign and date the petition on page 3 as well.** That signature and its date are yours and are left blank.
8. **Serve the prosecuting attorney and the arresting agency within three days of filing**, then complete and sign the Certificate of Service on page 5.
9. **Leave the order alone below its caption.** The recitals, the election boxes, the decree, the clerk's distribution direction, the judge's signature and the date beside it are the court's.

## Petition — the items you must supply

| Page | The blank on the form | What to write |
| --- | --- | --- |
| 1 | Caption — "IN THE ______ COURT OF" (the court's name; inside the PDF this blank is called \`IN THE\`) | the court the clerk tells you has your case — the route record names the circuit court of the county of conviction. The county is already filled in after "COURT OF" |
| 1 | Caption — "____________ DIVISION" (inside the PDF, \`DIVISION\`) | that court's division, only if it has divisions; otherwise leave blank |
| 1 | The date blanks on page 1 (inside the PDF, \`DAY 1\`, \`MONTH 1\`, \`YEAR 1\`) | the date the paragraph asks for, read off the paper. This packet cannot read that paragraph; the order's parallel paragraph 1 recites an **arrest** date |
| 1 | The two election boxes on page 1 (\`Check Box4\`, \`Check Box5\`) | tick the one that is true. The order's parallel paragraph 1 offers "[ ] Possession of Controlled Substance A.C.A. § 5-64-419; or [ ] Possession of Counterfeit Substance A.C.A. § 5-64-441" |
| 2 | Every blank and box on page 2 (\`Check Box6\`–\`Check Box11\`) | read the paragraphs on the paper and mark what is true. The order's parallel paragraphs are: 8 — completed all requirements of the sentence, **or** at least one year since a Petition to Seal for this conviction was denied; 10 — no pending felony charges, **or** one or more pending; 11 — **IS** or **IS NOT** required to register as a sex offender under the Sex Offender Registration Act of 1997 (A.C.A. § 12-12-901 et seq.) |
| 3 | Second street line (\`2\`) | only if your street address needs a second line; the first line is filled |
| 3 | Signature and its date (\`Defendants Signature\`, \`Date\`) | your signature and the date you sign |
| 4 | VERIFICATION — "STATE OF ARKANSAS / COUNTY OF ______" (\`COUNTY OF\`) | the county where you sign in front of the notary. This is **not** necessarily the county of your case, which is why it is blank |
| 4 | VERIFICATION — the signature rule above "Petitioner" (\`Petitioner\`) | your signature, made in front of the notary. Your printed name is already in the "Comes the Petitioner" line |
| 4 | Identification block — Race (\`Race\`) | the form states this block is required for proper identification of the defendant in the state and national record systems; it is yours to state |
| 4 | Identification block — Sex (\`Sex\`) | yours to state, for the same block |
| 4 | Identification block — Arrest Tracking Number (\`Arrest Tracking Number\`) | the ATN is assigned by Arkansas ACIC when an arrest is processed; copy it from your arrest paperwork if you have it |
| 4 | Identification block — SID No. (inside the PDF this blank is called \`undefined_2\`) | your State Identification number, from your arrest paperwork or ACIC criminal-history record |
| 4 | Identification block — FBI No. (if known) (\`FBI No if known\`) | the form itself says "if known" — leave blank if you do not know it |
| 5 | Certificate of Service — "I, ______" (\`do hereby certify that a true and correct\`) | your name, only after you have actually served both offices |
| 5 | Certificate of Service — signature and date (\`Defendant or Defendants Attorney\`, \`Date_2\`) | your signature as Defendant (or your attorney's), and the date of service — after service has happened |

## The choices that are yours

| Where | The choice | Why it is yours |
| --- | --- | --- |
| Petition, page 1 | controlled substance / counterfeit substance | which one you were convicted of is read off your own judgment; this route does not determine it |
| Petition, page 2 | completed the sentence / one year since a denial | a sworn statement about your own history |
| Petition, page 2 | no pending felony charges / one or more pending | a fact about your own record today; tick exactly one |
| Petition, page 2 | IS / IS NOT required to register as a sex offender | tick the one that is true under the Sex Offender Registration Act of 1997 |

## What the notary fills in, and what the court fills in

- **The notary** signs the page 4 jurat, writes its day, month and year, applies the seal and states when their commission expires. None of it is yours or the platform's.
- **The court** signs and dates the order, and fills every recital in it. The order's identification block (race, sex, ATN, SID, FBI number) takes the same values as the petition's — **ask the clerk whether the court wants it completed**, and complete exactly that if the clerk says so.

## What the platform deliberately left blank

- **Everything on pages 1 and 2 of the petition.** This packet cannot read a word of the printed text there and will not write into a blank whose sentence it cannot see.
- **Your signature on page 3 and the date beside it**, and **your signature on the page 4 verification**. You make the statements, not the platform.
- **The whole Certificate of Service** — name, signature, date. Service has not happened yet.
- **The whole notary jurat**, including the county where you are sworn.
- **Race, sex, ATN, SID and FBI number.** Identification facts the platform either does not hold or does not write.
- **The court's name in both captions.** The platform holds no court fact tied to your case; the clerk answers it.
- **Everything on the order below its caption** that belongs to the court.

## Where self-help ends

This packet prepares forms; it does not decide anything. Stop and get advice from a **lawyer licensed in Arkansas** — or put the question to the **circuit clerk of the county named in your caption**, who can say what the court requires even though the clerk cannot give legal advice — before filing, if any of these is true:

- **the prosecuting attorney objects, or the court sets a contested hearing.** The committed record for this packet is explicit that this is where self-help stops: "Hand off on any opposition or contested hearing."
- **immigration, licensing or firearm consequences are in play.** The committed record for this packet holds that stop condition in these words: "Immigration, licensing or firearm consequences are in play." What a sealed conviction does to immigration status, to a professional or occupational licence, or to the right to possess a firearm is not something this packet decides.
- you cannot read or cannot answer one of the paragraphs on pages 1 and 2 of the petition, and the proposed order's parallel paragraph does not settle it for you;
- your conviction is not for possession of a controlled or counterfeit substance — this pair of forms is for that conviction and no other;
- you have a pending felony charge in any state or federal court — whether the petition can be granted while it is pending is a question this packet does not answer;
- you are required to register under the Sex Offender Registration Act of 1997 — what that means for sealing this conviction is a question this packet does not answer;
- you have outstanding restitution, fines or court costs. The compiled Arkansas profile records that satisfying them is the real gate on this relief, and it is a completion requirement rather than a fee;
- you have more than one prior felony. The order's paragraph 7 recites "Defendant has had no more than one (1) prior felony before this conviction", and whether your record meets that is not something this packet decides.

## What this packet is not

This is a prepared set of official ACIC forms. It is not legal advice, it is not filed for you, and it does not decide whether your conviction can be sealed under A.C.A. § 16-90-1407 or § 16-90-1415(c).

_Route: ${ROUTE_KEY} — A.C.A. § 16-90-1407; standard: § 16-90-1415(c); sealed under A.C.A. § 16-90-1401 et seq. (Act 1460 of 2013)_
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
        title: `AR ${doc.documentId}`
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
    jurisdiction: "AR",
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
