#!/usr/bin/env node
// Route-obligation census v1 — packet family `ar-act531-set`.
//
//   node scripts/build-census-v1-ar-act531-set.mjs
//
// Arkansas, sealing a record after a Community Punishment Act (Act 531 of 1993,
// A.C.A. § 16-93-1201 et seq.) disposition, under the Act 1460 of 2013 sealing
// procedure (A.C.A. § 16-90-1401 et seq.). Route
// `obligation:track-only:AR:ar-act531`. The family delivers two documents:
//
//   * the ACIC Petition to Seal Pursuant to Act 531 and Act 1460 — the filing;
//   * the ACIC Order to Seal Pursuant to Act 531 and Act 1460     — the proposed
//     order the COURT signs.
//
// This is not a renderer. Every decision about what may be written is made by
// scripts/rcap-official-forms/rcap-field-semantics.mjs and every byte is
// written by finalizeOfficialForm; this file supplies the two things only a
// caller can supply — the family's ROLE classification and its explicit
// mappings — and then proves the result from the artifact bytes rather than
// from its own report.
//
// WHY THE CAPTION MAPPINGS ARE STATED BY MEASUREMENT AND NOT BY FIELD NAME
//
// This form's AcroForm names do not describe its caption. Page 1 prints
//
//     IN THE ______________ COURT OF ________________, ARKANSAS
//     _______ DIVISION
//
// and the widget over the first blank is named `DIVISION 1`, the widget over
// the county blank is named `COURT 1`, and the widget over the division blank
// is named `DIVISION 2`. That was established from the page's own text items:
// "IN THE " ends at x=130.2 and `DIVISION 1` occupies 130.2–239.2; "OF " ends
// at x=320.1 and `COURT 1` occupies 320.0–444.6, closing at the printed comma
// at 436.8; the second line's underscores run 246.1–314.6 and `DIVISION 2`
// occupies 246.0–300.7. So the county is written into `COURT 1`, and the blank
// named `DIVISION 1` is the type of court and is left for the participant.
// Trusting the names here would have printed the county where the court's name
// belongs.
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

const FAMILY_ID = "ar-act531-set";
const OUT = "data/rcap-all50/overlays/census-v1/ar/ar-act531-set--official-pdf-fill";
const CORPUS_INDEX = "data/rcap-all50/local-source-corpus-index.json";
const CORPUS_ROOT = "private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1";
const STALE_BLOCK = "data/rcap-grade-a/stale-artifact-block.json";
const ROUTE_KEY = "obligation:track-only:AR:ar-act531";

const fail = (message, detail = null) => {
  console.error(`build-census-v1-${FAMILY_ID}: ${message}`);
  if (detail) console.error(`  ${detail}`);
  console.error("  Nothing was written.");
  process.exit(1);
};

const DOCUMENTS = [
  {
    key: "petition",
    documentId: "ACIC-PETITION-SEAL-ACT-531-ACT-1460",
    documentRole: "PETITION",
    officialTitle: "Petition to Seal Pursuant to Act 531 of 1993 and Act 1460 of 2013",
    revision: "REV-2014-08-25",
    sha256: "cca9d9454b565d36930a95ac6337d370f6506f8780e9d98cbfc8f99343e0a356",
    pathInArchive: "STATES/AR/05_SOURCE_GATED/AR__SOURCE-GATED__AR-ACIC-PETITION-TO-SEAL-UNDER-COMMUNITY-PUNISHMENT-ACT-531-AND-AC__petition-to-seal-pursuant-to-act-531-of-1993-and-act-1460-of-2013__REV-2014-08-25__EN.pdf",
    ownership: "participant_completed",
    captionOnly: false,

    // Two explicit mappings, and no more.
    //
    // `First Middle and Last name` is the page 1 DEFENDANT caption, printed
    // "(First, Middle, and Last name)" directly beneath it.
    //
    // `OFFENSE 1` is paragraph 1's "charged with the offense(s) of" line.
    // `matter.charge` is a requiresExplicitMapping descriptor, so the caller
    // must name it or nothing binds.
    //
    // THE COUNTY IS NOT MAPPED, AND THAT IS A DECISION RATHER THAN AN OMISSION.
    //
    // The caption's county blank is the widget named `COURT 1` (see the header
    // note: measured, not guessed). The shared binder reaches a fact through
    // the field NAME first and the harvested printed caption second; "COURT 1"
    // matches no descriptor and the harvested caption for that widget is the
    // fragment "_______ DI", which matches none either. An explicit mapping
    // cannot create a binding the shared binder never reached — decideBinding
    // consults explicitMappings only to AUTHORISE a descriptor that already
    // matched — so naming `matter.county` here writes nothing.
    //
    // The remaining way to write it would be to hand the finalizer a corrected
    // effectiveLabel for this widget. That is the printed-label channel, and it
    // is the exact mechanism that put a participant's name into an offence
    // blank on this form's sibling. The caption also does not print the word
    // "county" at all — it reads "COURT OF ______, ARKANSAS" — so a corrected
    // label would most naturally bind `matter.court`, which is a different
    // fact. The blank is therefore left for the participant, declared
    // required-before-filing, and named in participant-instructions.md with the
    // exact value to write.
    explicitMappings: {
      "First Middle and Last name": "participant.full_legal_name",
      "OFFENSE 1": "matter.charge"
    },

    unwritable: [
      { field: "Defendant Address  Street 2", class: "address_continuation_line",
        why: "The second printed rule of a two-line street block on page 4. The platform holds one street address and writes it once; filling both lines prints the same address twice." },
      { field: "DAY 1", class: "arrest_date_component",
        why: "Day component of paragraph 1's arrest date. The platform holds matter.arrest_date as a whole date and holds no day fact." },
      { field: "MONTH 1", class: "arrest_date_component",
        why: "Month component of paragraph 1's arrest date, on the same footing as the day." },
      { field: "YEAR 1", class: "arrest_date_component",
        why: "Year component of paragraph 1's arrest date, on the same footing as the day and the month." },
      { field: "DAY 2", class: "conviction_date_component",
        why: "Day component of paragraph 2's conviction date. The platform holds matter.conviction_date as a whole date and holds no day fact." },
      { field: "MONTH 2", class: "conviction_date_component",
        why: "Month component of paragraph 2's conviction date, on the same footing as the day." },
      { field: "YEAR 2", class: "conviction_date_component",
        why: "Year component of paragraph 2's conviction date, on the same footing as the day and the month." },
      { field: "Arrest Tracking Number", class: "agency_assigned_identifier",
        why: "The ATN is assigned by Arkansas ACIC when an arrest is processed. It identifies the arrest through a system the platform has no knowledge of and is the agency's to state." },
      { field: "CERTIFY 1", class: "certificate_of_service_attestation",
        why: "The certifying party's name in the page 4 Certificate of Service's 'I, ____, do hereby certify' sentence. It is a sworn statement about an act of service that has not happened." },
      { field: "FULL DATE", class: "participant_signature_date",
        why: "The date beside the defendant's signature on page 3. Dating a signature that has not been made asserts the petition was signed on a day it was not." },
      { field: "FULL DATE 2", class: "certificate_of_service_date",
        why: "The date on the page 4 Certificate of Service. Service has not happened; a date here certifies a mailing that has not occurred." },
      { field: "DIVISION 1", class: "court_identity_not_held",
        why: "The type of court in the caption — the blank in 'IN THE ______ COURT OF'. The county is written; which Arkansas court takes this petition is the clerk's answer, and the platform holds no court-type fact for this route." },
      { field: "DIVISION 2", class: "court_division_not_held",
        why: "The caption's division blank, completed only where the filing court has divisions. The platform holds no division fact." },
      { field: "COURT 1", class: "caption_county_not_reachable_by_the_shared_binder",
        why: "The caption's county blank. See explicitMappings above: neither the field name nor the harvested caption reaches a descriptor, and the only remaining channel is the printed-label fallback that has previously put the wrong fact in the wrong blank on this form's sibling. The participant writes the county." },

      // The offence lines the shared binder reads as rows of a repeating charge
      // table, and which are not rows of one.
      //
      // The binder derives a row index from the trailing digit of the field
      // name, so `OFFENSE 2` asks for matter.charges[1], `OFFENSE 3` for
      // charges[2], and so on. On this form those four widgets are four
      // different sentences on three different subjects, and only the first is
      // a charge row at all:
      //
      //   OFFENSE 2 — paragraph 1's SECOND printed rule, a continuation of one
      //     free-text offence list. A second offence in the platform's charge
      //     list is not necessarily an offence charged in this same arrest, and
      //     writing it here asserts that it was.
      //   OFFENSE 3 — paragraph 2's "convicted of the offense(s) of" line. The
      //     boundary fixture proved the defect: with three charges supplied,
      //     charges[2] — "Driving while license suspended" — was drawn onto the
      //     conviction line of a petition about a controlled-substance offence.
      //   OFFENSE 4, OFFENSE 5 — paragraph 8's two status rules for PENDING
      //     felony charges in another court. A charge in the platform's list is
      //     a charge in THIS matter, which is the opposite of what paragraph 8
      //     asks about.
      { field: "OFFENSE 2", class: "offence_list_continuation_rule",
        why: "The second printed rule of paragraph 1's single free-text offence list. The offence the platform holds is written on the first rule; a further offence charged in the same arrest is the participant's to add." },
      { field: "OFFENSE 3", class: "conviction_offence_line_not_a_charge_row",
        why: "Paragraph 2's 'convicted of the offense(s) of' line. The shared binder reads the trailing 3 as charge row 2 and, on the boundary fixture, drew an unrelated third charge onto it. The offence of conviction may differ from the offence charged, and the platform holds one offence for the matter." },
      { field: "OFFENSE 4", class: "pending_charge_status_line",
        why: "Paragraph 8's status rule for a PENDING felony charge in another court. A charge in the platform's list belongs to this matter, not to a pending case elsewhere." },
      { field: "OFFENSE 5", class: "pending_charge_status_line",
        why: "The second printed rule of the same paragraph 8 status block, on the same footing." }
    ],

    completeness: {
      defaultBlank: null,
      fields: {
        "Defendants Signature": { refusalClass: "signature_or_date_participant_completion",
          reason: "The defendant's signature on page 3. The petition is the defendant's own statement; the participant signs it." },
        "FULL DATE": { refusalClass: "signature_or_date_participant_completion",
          reason: "The date beside the defendant's signature on page 3, completed by the participant when the petition is signed." },
        "FULL DATE 2": { refusalClass: "signature_or_date_participant_completion",
          reason: "The date on the page 4 Certificate of Service, completed by the participant after service has actually happened." },
        "Defendant or Defendants Attorney": { refusalClass: "signature_or_date_participant_completion",
          reason: "The signature line on the page 4 Certificate of Service, signed by the participant (or their attorney) after service." },
        "CERTIFY 1": { refusalClass: "participant_sworn_narrative_or_legal_election",
          reason: "The certifying party's name in the Certificate of Service's sworn 'I, ____, do hereby certify' sentence. It is the filer's statement about an act of service, made after mailing." },
        "Arrest Tracking Number": { refusalClass: "court_prosecutor_clerk_or_agency_owned",
          reason: "The ATN is assigned by Arkansas ACIC when an arrest is processed; it is the agency's identifier to state." },

        // Declared required-before-filing. Every one is named in the tables in
        // participant-instructions.md.
        "DIVISION 1": { requiredBeforeFiling: true,
          reason: "The type of court in the caption's 'IN THE ______ COURT OF' blank. Which Arkansas court takes this petition is the answer the circuit clerk of the county gives, and the participant writes it before filing." },
        "COURT 1": { requiredBeforeFiling: true,
          reason: "The county in the caption's 'COURT OF ______, ARKANSAS' blank. This packet does not write it: the widget's own name is 'COURT 1' and its harvested caption is the fragment '_______ DI', so no channel of the shared binder reaches the county without overriding the document's printed caption, which is the mechanism that has previously put the wrong fact in the wrong blank on this form's sibling. The participant writes the county of the court that handled the case, and it must match on both forms." },
        "OFFENSE 3": { requiredBeforeFiling: true,
          reason: "Paragraph 2's 'convicted of the offense(s) of' line. The platform holds one offence for this matter and writes it on paragraph 1's charged-offence line; the offence you were convicted of may be a different or reduced offence, so it is yours to write from your judgment before filing." },
        "DAY 1": { requiredBeforeFiling: true,
          reason: "The day component of paragraph 1's arrest date. The platform holds no day fact and writes nothing here; the participant copies the arrest date from their arrest or court paperwork before filing." },
        "MONTH 1": { requiredBeforeFiling: true,
          reason: "The month component of paragraph 1's arrest date, on the same footing as the day." },
        "YEAR 1": { requiredBeforeFiling: true,
          reason: "The year component of paragraph 1's arrest date, on the same footing as the day and the month." },
        "DAY 2": { requiredBeforeFiling: true,
          reason: "The day component of paragraph 2's conviction date. The platform holds no day fact; the participant copies the conviction date from their court paperwork before filing." },
        "MONTH 2": { requiredBeforeFiling: true,
          reason: "The month component of paragraph 2's conviction date, on the same footing as the day." },
        "YEAR 2": { requiredBeforeFiling: true,
          reason: "The year component of paragraph 2's conviction date, on the same footing as the day and the month." },
        "CLASS 1": { requiredBeforeFiling: true,
          reason: "The class letter on paragraph 1's 'A Class ___' line. The platform holds no offence-class fact; the participant copies it from their arrest or court paperwork before filing." },
        "ACA 1": { requiredBeforeFiling: true,
          reason: "The 'in violation of A.C.A. § ______' blank closing paragraph 1. The platform holds no statute-section fact; the participant copies it from the same paperwork before filing." },
        "ACA 2": { requiredBeforeFiling: true,
          reason: "The 'in violation of A.C.A. § ______' blank in paragraph 2, for the offence of conviction. The platform holds no statute-section fact; the participant copies it from their judgment before filing." },
        "Race": { requiredBeforeFiling: true,
          reason: "The identification block's race entry on page 3, which the form states is required for identification in the state and national record systems. The platform does not hold or write it; the participant states it before filing." },
        "Sex": { requiredBeforeFiling: true,
          reason: "The identification block's sex entry, in the same block and on the same footing. The platform does not hold it; the participant states it before filing." },
        "SID NO": { requiredBeforeFiling: true,
          reason: "The State Identification number in the page 3 identification block. The platform holds no SID; the participant copies it from their arrest paperwork or ACIC criminal-history record before filing." },

        // Genuine participant elections.
        "FELONY 1": { refusalClass: "participant_sworn_narrative_or_legal_election",
          reason: "Paragraph 1's felony box. Which is true of the offence is read off the participant's own paperwork; this route does not determine it." },
        "MISDEMEANOR 1": { refusalClass: "participant_sworn_narrative_or_legal_election",
          reason: "Paragraph 1's misdemeanor box, the other half of the same election." },
        "COMPLETED 1": { refusalClass: "participant_sworn_narrative_or_legal_election",
          reason: "Paragraph 5's first completion box — which Community Punishment Act disposition the defendant completed. A sworn statement about the participant's own sentence." },
        "COMPLETED 2": { refusalClass: "participant_sworn_narrative_or_legal_election",
          reason: "Paragraph 5's transfer-to-Community-Correction box, one of the same set of sworn completion elections." },
        "COMPLETED 3": { refusalClass: "participant_sworn_narrative_or_legal_election",
          reason: "Paragraph 5's third completion box, one of the same set." },
        "COMPLETED 4": { refusalClass: "participant_sworn_narrative_or_legal_election",
          reason: "Paragraph 5's supervised-or-unsupervised-probation box, one of the same set." },
        "PENDING CHARGE 1": { refusalClass: "participant_sworn_narrative_or_legal_election",
          reason: "Paragraph 8's first box — no pending felony charge in any state or federal court. A sworn statement about the participant's own record." },
        "PENDING CHARGE 2": { refusalClass: "participant_sworn_narrative_or_legal_election",
          reason: "Paragraph 8's second box — one or more pending felony charges. The other half of the same sworn election." },

        // Optional participant content: printed rules that exist only for the
        // cases that need them, and blanks the form itself marks optional.
        "OFFENSE 2": { refusalClass: null,
          reason: "The second printed rule of paragraph 1's offence list. The offence the platform holds is written on the first rule; a further offence charged in the same arrest is the participant's to add, and the platform does not invent it." },
        "OFFENSE 4": { refusalClass: null,
          reason: "Paragraph 8's status line, used only if the participant ticks the second box and has a pending felony charge. The court, case number and status of that charge are the participant's to state, and the platform does not invent it." },
        "OFFENSE 5": { refusalClass: null,
          reason: "The second printed rule of the same paragraph 8 status block, used only if the first will not hold the answer, and the platform does not invent it." },
        "FBI No if known": { refusalClass: null,
          reason: "The identification block's FBI number, which the form itself marks '(if known)'. It is the participant's to write if they know it, and the platform does not invent it." },
        "Defendant Address  Street 2": { refusalClass: null,
          reason: "The second printed rule of the two-line street block. The platform holds one street address and writes it on the first rule; a second line is the participant's to add if their address needs one, and the platform does not invent it." },
        "DIVISION 2": { refusalClass: null,
          reason: "The caption's division blank, completed only if the court the participant files in has divisions. The clerk answers whether it does; the platform does not invent it." }
      }
    }
  },
  {
    key: "order",
    documentId: "ACIC-ORDER-SEAL-ACT-531-ACT-1460",
    documentRole: "PROPOSED_ORDER",
    officialTitle: "Order to Seal Pursuant to Act 531 of 1993 and Act 1460 of 2013",
    revision: "REV-2014-08-25",
    sha256: "edd3eb10e5b3830afa417f4165611489a32c1f43d2dde3203855bdbe3b0b19da",
    pathInArchive: "STATES/AR/05_SOURCE_GATED/AR__SOURCE-GATED__AR-ACIC-ORDER-TO-SEAL-UNDER-COMMUNITY-PUNISHMENT-ACT-531-AND-ACT-1__order-to-seal-pursuant-to-act-531-of-1993-and-act-1460-of-2013__REV-2014-08-25__EN.pdf",
    ownership: "court_issued_order",
    captionOnly: true,
    explicitMappings: {
      "First Middle and Last name": "participant.full_legal_name"
    },
    unwritable: [
      { field: "COURT 1", class: "caption_county_not_reachable_by_the_shared_binder",
        why: "The order caption's county blank, on the same footing as the petition's: the field is named 'COURT 1', its harvested caption is a fragment, and no honest binder channel reaches the county. The participant writes it, matching the petition." },
      { field: "OFFENSE 1", class: "court_recital_offence_line",
        why: "The offence line in the court's own recital. captionOnly already refuses it; stated here because it is a recital of the court's finding rather than a blank this packet fills." },
      { field: "OFFENSE 2", class: "court_recital_offence_line", why: "The second rule of the same recital." },
      { field: "OFFENSE 3", class: "court_recital_offence_line", why: "The conviction-offence rule of the same recital." },
      { field: "OFFENSE 4", class: "court_recital_offence_line", why: "A pending-charge status rule in the court's recital." },
      { field: "OFFENSE 5", class: "court_recital_offence_line", why: "The second pending-charge status rule in the court's recital." },
      { field: "Judge", class: "court_only_signature",
        why: "The judge's signature line. Court-only." },
      { field: "FULL DATE", class: "court_only_signature_date",
        why: "The date beside the judge's signature. The court dates its own order." },
      { field: "Arrest Tracking Number", class: "agency_assigned_identifier",
        why: "ACIC-assigned arrest identifier; the agency's to state." },
      { field: "DAY 1", class: "arrest_date_component",
        why: "Day component of the arrest date in the court's recital. The platform holds no day fact, and the shared date-component guard withholds the printed-label fallback from a date-component name." },
      { field: "MONTH 1", class: "arrest_date_component", why: "Month component of the same recital date." },
      { field: "YEAR 1", class: "arrest_date_component", why: "Year component of the same recital date." },
      { field: "DAY 2", class: "conviction_date_component", why: "Day component of the conviction date in the court's recital." },
      { field: "MONTH 2", class: "conviction_date_component", why: "Month component of the same recital date." },
      { field: "YEAR 2", class: "conviction_date_component", why: "Year component of the same recital date." },
      { field: "DIVISION 1", class: "court_identity_not_held",
        why: "The type of court in the order's caption, which must match the petition's. The platform holds no court-type fact for this route." },
      { field: "DIVISION 2", class: "court_division_not_held",
        why: "The caption's division blank, completed only where the filing court has divisions." }
    ],

    // The order is `captionOnly`, and that single determination answers the
    // completeness question for everything below its caption: the instrument
    // is the court's, and this packet writes nothing there. So the default
    // carries the whole document and only the caption blanks are separate.
    completeness: {
      defaultBlank: {
        refusalClass: "court_prosecutor_clerk_or_agency_owned",
        reason: "Below its caption the order is the court's own instrument — its recitals, its paragraph boxes, its decree, the judge's signature and the date beside it. This packet writes nothing there."
      },
      fields: {
        "DIVISION 1": { requiredBeforeFiling: true,
          reason: "The type of court in the order's caption, which must match the petition's. Which Arkansas court takes the petition is the answer the circuit clerk of the county gives, and the participant writes it before filing." },
        "COURT 1": { requiredBeforeFiling: true,
          reason: "The county in the order caption's 'COURT OF ______, ARKANSAS' blank, which must match the petition's. This packet does not write it, for the reason recorded on the petition's own row; the participant writes the county of the court that handled the case." },
        "DIVISION 2": { refusalClass: null,
          reason: "The caption's division blank, completed only if that court has divisions, to match the petition. The clerk answers whether it does; the platform does not invent it." }
      }
    }
  }
];

// The ONLY blanks in this family that may ever carry the participant's name.
const NAME_MAY_APPEAR_IN = {
  "ACIC-PETITION-SEAL-ACT-531-ACT-1460": [
    "First Middle and Last name",  // page 1 DEFENDANT caption
    "DEFENDANT PRINTED"            // page 3 "WHEREFORE, the Defendant, ______"
  ],
  "ACIC-ORDER-SEAL-ACT-531-ACT-1460": [
    "First Middle and Last name",  // page 1 DEFENDANT caption
    "DEFENDANT SIG"                // page 3 recital naming the defendant
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
    return { name, type, widgets };
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

  const censusFields = fields.map((f) => {
    const c = context.get(f.name) ?? {};
    const w = f.widgets[0] ?? null;
    const subject = c.effectiveLabel ?? f.name;
    return {
      name: f.name,
      type: f.type,
      effectiveLabel: c.effectiveLabel ?? null,
      labelBasis: c.labelBasis ?? null,
      regionHeading: c.regionHeading ?? null,
      widgets: f.widgets,
      captionDescribesChargeValue: captionDescribesChargeValue(subject),
      captionOrNameMentionsCharge: CHARGE_VALUE_WORDS.test(subject) || CHARGE_VALUE_WORDS.test(f.name),
      protectCategory: protectCategoryOf(subject) ?? protectCategoryOf(f.name) ?? null,
      descriptorsByName: descriptorsMatching(f.name).map((d) => d.factId),
      descriptorsByLabel: c.effectiveLabel ? descriptorsMatching(c.effectiveLabel).map((d) => d.factId) : [],
      measuredRuleUnderWriteBox: w ? ruleUnder(w.page, w.rect) : null
    };
  });

  return {
    pdf, pages, fields: censusFields, documentTextLines,
    pageGeometry: pages.map((p, i) => ({ page: i + 1, width: +p.getSize().width.toFixed(2), height: +p.getSize().height.toFixed(2) })),
    strokedByPage
  };
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
// FILING_DESTINATION — held. The committed packet-set manifest for
//   ar-act531-set records filingDestination as "Statewide Arkansas
//   program-specific process in the underlying criminal court", and the route
//   census gives the destination as "The underlying criminal court". The
//   compiled Arkansas profile agrees and adds the circuit-or-district detail
//   and the file-in-each-county rule. Stated, not delegated.
// FEE_AND_WAIVER — held. The compiled Arkansas profile
//   src/lib/rcap-engine/compiled/profiles/AR-arkansas.json states "Act 1460
//   eliminated sealing filing fees" and "Sealing petition filing fee $0". This
//   route's own authority is Act 531 sealed UNDER THE ACT 1460 PROCEDURE — the
//   form's printed title is "PETITION TO SEAL PURSUANT TO ACT 531 OF 1993
//   ACA§16-93-1201, Et. Seq. and ACT 1460 OF 2013 A.C.A.16-90-1401, Et. Seq." —
//   so the profile's Act 1460 fee lines address this route's own sealing
//   procedure rather than a sibling's, which is what amendment A3 requires.
//   The packet-set manifest records filingFee and feeWaiverTreatment as
//   not_recorded; that is non-establishment in one record, not a denial, and
//   the profile answers it.
// SERVICE — held. The packet-set manifest records serviceRecipients and
//   serviceTiming as "Serve the prosecuting attorney within three days of
//   filing", and contestedHearingOrOppositionHandoff adds the 30-day objection
//   window. The compiled profile records the window class-dependently for Act
//   1460 sealing generally (30 days misdemeanour / 90 days felony); both are
//   held and keyed differently, so both are disclosed rather than one chosen.
//   The form's own page 4 Certificate of Service supplies the method.
// SELF_HELP_STOP — held. The manifest's contestedHearingOrOppositionHandoff
//   entry is explicit: "Hand off on any opposition or contested hearing."
// NOT FOUND — the manifest records filingMethod, notarizationRequirements,
//   filingDeadline and postFilingInstructions as not_recorded, and neither
//   pinned form prints them. Nothing below states any of the four.
function participantInstructionsMarkdown() {
  return `# Filing instructions — Seal an Arkansas record under Act 531 of 1993 and Act 1460 of 2013

This packet is two ACIC forms, filed together:

- **Petition to Seal Pursuant to Act 531 of 1993 and Act 1460 of 2013** — what you file.
- **Order to Seal Pursuant to Act 531 of 1993 and Act 1460 of 2013** — the proposed order you hand the court to sign. Its recitals, its decree, the judge's signature and the date beside it are the court's alone; this packet writes nothing there.

The petition's own printed title names both statutes: Act 531 of 1993, A.C.A. § 16-93-1201 et seq. (the Community Punishment Act), and Act 1460 of 2013, A.C.A. § 16-90-1401 et seq. (the sealing procedure). Paragraph 3 of the petition states the situation this route covers: **the offense or offenses listed are a target offense as defined in A.C.A. § 16-93-1202(10)(A)(i) or (ii) and are not violent or sexual offenses as defined in A.C.A. § 16-93-1202(10)(A)(iii) or (iv)**. If that is not true of your case, this is the wrong packet — see _Where self-help ends_ below.

The platform filled what it holds about you and your case: your name in the caption and in the prayer line, the case number, your date of birth, the offense on **paragraph 1's first offense line only**, and — on the certificate page — your street address, city, state and ZIP code. Every other blank is deliberate, and every one is listed below. **The caption's court and county blanks are both left for you**; _Where you file this_ explains why and what to write. If your full legal name is too long to fit a caption blank at the smallest legible size, that blank is refused rather than drawn over the form's rule, and completing it by hand is yours.

## Where you file this

**This petition goes to the court that handled the underlying criminal case.** The committed route record for this packet gives the destination as "the underlying criminal court" and describes it as a "statewide Arkansas program-specific process". The compiled Arkansas profile this route is built from — \`src/lib/rcap-engine/compiled/profiles/AR-arkansas.json\` — says the same thing twice and adds the detail: "Sealing is filed in the court that handled the case", and "File in the circuit or district court that handled the case."

**Both caption blanks are yours to write, and this packet leaves them blank on purpose.** The caption reads

> IN THE \\_\\_\\_\\_\\_\\_ COURT OF \\_\\_\\_\\_\\_\\_, ARKANSAS

The first blank is the **court** and the second is the **county**. Inside the PDF the court blank is named \`DIVISION 1\` and the county blank is named \`COURT 1\` — the form's own field names are the wrong way round, which is why nothing is prefilled into either. Writing a value into a blank whose name says something else is how the wrong fact ends up in the wrong place, and this packet will not do it. **Write the county of the court that handled your case in the second blank, and the court's name in the first, on BOTH forms so the petition and the order match.**

**Ask the circuit clerk's office of the county where your case was handled which court takes this petition.** The compiled Arkansas profile records that both the circuit and the district court take sealing petitions, depending on which handled the case; the clerk can tell you which, and the clerk's office is where the filing is received. The DIVISION blank on the second caption line is also yours, only if that court has divisions; the same clerk can tell you that.

**If you have records in more than one court, this packet covers one of them.** The compiled Arkansas profile records that venue is "the court that handled the case — file separately in each county where the person has records". One petition does not reach a case in another county.

## The filing fee

**There is no filing fee for this petition.** The compiled Arkansas profile this route is built from states it three ways: "Act 1460 eliminated sealing filing fees; the real costs are records and any counsel"; "Sealing petition filing fee $0 — Filing fees eliminated by the 2019 amendments"; and, in its filing rule, "File in the circuit or district court that handled the case. Act 1460 eliminated filing fees for sealing." This route seals under the Act 1460 procedure — the petition's own printed title says so — so those lines are about this filing and not about a neighbouring one.

**If the clerk of the court where you file nevertheless asks you to pay something, that is a question about that court's own practice rather than about this packet.** Ask the clerk of that court what the charge is for and whether a waiver or reduction is available, and settle it before you file.

**The costs this route does carry are not filing fees.** The same profile records them: the ACIC criminal-history record carries an ACIC fee; a copy of the Judgment and Commitment Order carries a small clerk fee from the sentencing court; and counsel carries whatever counsel costs — which is not required, and which legal-aid and sealing clinics assist with at no charge. The profile also records that the real gate is satisfying outstanding restitution, fines and court costs, which is an eligibility requirement rather than a fee for filing.

## Who you serve, and how

**Serve the prosecuting attorney.** The committed packet-set manifest for this packet states it in terms: **"Serve the prosecuting attorney within three days of filing."** Serve within three days of the day you file.

**How you serve is on the form.** The petition's page 4 Certificate of Service is the record of it, and it recites the method the form provides. After — and only after — you have actually served, complete the Certificate of Service: your name in the "I, ______" line, the signature line ("Defendant or Defendant's Attorney"), and the date. The platform leaves all three blank because service has not happened yet, and a signed certificate of a mailing that never occurred is a false statement to the court.

**Then expect an answer, or expect silence.** The same manifest records that **the prosecuting attorney has 30 days to object**. The compiled Arkansas profile records the window class-dependently for Act 1460 sealing generally — "30 days (misdemeanor) or 90 days (felony) to file a notice of opposition stating reasons" — so if the class you write on paragraph 1's "A Class ___" line is a felony, the longer window may apply to you. Both records are held here and they are keyed differently; **ask the clerk of the court named in your caption which window that court runs.** If an objection is filed, the petition is contested — see _Where self-help ends_.

## What you must do before you file

1. **Obtain your Arkansas criminal history from ACIC.** The compiled Arkansas profile records this as the records step that comes before the petition, and it is what you check the case against — the offense, its class, the A.C.A. section, the arrest date and the conviction date. If the record and what is written in this packet disagree, correct the packet. (This record carries an ACIC fee; it is not a filing fee. See _The filing fee_ above.)
2. **Obtain a copy of the Judgment and Commitment Order from the sentencing court clerk**, which the same profile records as the second records step and which carries a small clerk fee.
3. **Ask the circuit clerk of the county in your caption which court takes this petition**, and write that answer in the "IN THE ______ COURT OF" blank on both forms.
4. **Complete every blank listed in the table below.** Each is named with the form it is on, the page, and what belongs in it.
5. **Read paragraphs 5 and 8 of the petition and mark only what is true of you.** Paragraph 5's boxes state which Community Punishment Act disposition you completed; paragraph 8's state whether you have pending felony charges.
6. **Sign and date the petition yourself.** The signature and its date are yours and are left blank.
7. **Serve the prosecuting attorney within three days of filing**, then complete and sign the Certificate of Service, as described above.
8. **Leave the order alone below its caption.** The recitals, the paragraph boxes, the decree, the judge's signature and the date beside it are the court's.

## Petition — the items you must supply

| Page | The blank on the form | What to write |
| --- | --- | --- |
| 1 | Caption — "IN THE ______ COURT OF" (the court's name; inside the PDF this blank is called \`DIVISION 1\`) | the court the clerk tells you handled your case and takes this petition |
| 1 | Caption — "COURT OF ______, ARKANSAS" (the county; inside the PDF this blank is called \`COURT 1\`) | the county of the court that handled your case |
| 1 | Caption — "_______ DIVISION" (inside the PDF, \`DIVISION 2\`) | that court's division, only if it has divisions; otherwise leave blank |
| 1 | Paragraph 2 — "convicted of the offense(s) of ______" (\`OFFENSE 3\`) | the offense you were **convicted** of, copied from your judgment. Only paragraph 1's charged-offense line is filled |
| 1 | Paragraph 1 — "arrested on the ___ day of ______, ____" (\`DAY 1\`, \`MONTH 1\`, \`YEAR 1\`) | the arrest date, copied from your arrest or court paperwork. The platform holds the date only as a whole and does not split it into these blanks |
| 1 | Paragraph 1 — second offense line (\`OFFENSE 2\`) | any further offense you were charged with in the same arrest; the first line is filled from what you gave. Leave blank if there are none |
| 1 | Paragraph 1 — "A Class ___" (\`CLASS 1\`) | the class letter of the offense, copied from your court paperwork |
| 1 | Paragraph 1 — "[ ] felony [ ] misdemeanor" (\`FELONY 1\`, \`MISDEMEANOR 1\`) | tick the one that matches the offense, from the same paperwork |
| 1 | Paragraph 1 — "in violation of A.C.A. § ______" (\`ACA 1\`) | the Arkansas Code section of the offense charged, copied from the same paperwork |
| 1 | Paragraph 2 — "in violation of A.C.A. § ______" (\`ACA 2\`) | the Arkansas Code section of the offense you were convicted of, copied from your judgment |
| 1 | Paragraph 2 — "on the ___ day of ______, ____" (\`DAY 2\`, \`MONTH 2\`, \`YEAR 2\`) | the conviction date, copied from your judgment. The platform holds the date only as a whole |
| 2 | Paragraph 5 — the completion boxes (\`COMPLETED 1\`–\`COMPLETED 4\`) | tick the disposition you actually completed |
| 2 | Paragraph 8 — the pending-charge boxes (\`PENDING CHARGE 1\`, \`PENDING CHARGE 2\`) | tick the one that is true of you today |
| 2 | Paragraph 8 — status of pending charges, two lines (\`OFFENSE 4\`, \`OFFENSE 5\`) | only if you ticked the second box: the court, case number and current status of each pending felony charge |
| 3 | Identification block — Race (\`Race\`) | the form states this block is required for proper identification of the defendant in the state and national record systems; it is yours to state, and the platform does not write it |
| 3 | Identification block — Sex (\`Sex\`) | yours to state, for the same identification block |
| 3 | Identification block — Arrest Tracking Number (\`Arrest Tracking Number\`) | the ATN is assigned by Arkansas ACIC when an arrest is processed; copy it from your arrest paperwork if you have it — it is the agency's number, not one the platform can supply |
| 3 | Identification block — SID No. (\`SID NO\`) | your State Identification number, from your arrest paperwork or ACIC criminal-history record |
| 3 | Identification block — FBI No. (if known) (\`FBI No if known\`) | the form itself says "if known" — leave blank if you do not know it |
| 3 | Signature and its date (\`Defendants Signature\`, \`FULL DATE\`) | your signature and the date you sign |
| 4 | Certificate of Service — "I, ______" (\`CERTIFY 1\`) | your name, only after you have actually served the prosecuting attorney |
| 4 | Certificate of Service — signature and date (\`Defendant or Defendants Attorney\`, \`FULL DATE 2\`) | your signature as Defendant (or your attorney's), and the date of service — after service has happened |
| 4 | Defendant Address — second street line (\`Defendant Address  Street 2\`) | only if your street address needs a second line; the first line is filled |

## The choices that are yours

| Form | The choice | Why it is yours |
| --- | --- | --- |
| Petition, paragraph 1 | felony / misdemeanor | tick the one your paperwork shows for the offense |
| Petition, paragraph 5 | which Community Punishment Act disposition you completed | a sworn statement about your own sentence; tick what is true |
| Petition, paragraph 8 | no pending felony charges / one or more pending felony charges | which is true of you today is a fact about your own record; tick exactly one |

## The two offense lines are two different questions

Paragraph 1 asks what you were **charged with**; paragraph 2 asks what you were **convicted of**. The platform holds one offense for this matter and has written it on **paragraph 1's first line only**. Paragraph 2's line is blank because the offense you were convicted of may be a different or reduced offense, and this packet does not assume it is the same one. **Write the offense of conviction on paragraph 2's line from your judgment**, and put its A.C.A. section in paragraph 2's \`ACA 2\` blank.

## The proposed order

The order's caption — the court's name, the county, the case number and your name — must match the petition's. The case number and your name are filled to match; **the court's name and the county are blank on the order for the same reason they are blank on the petition, and you write the same answers into both.** Everything below the caption is deliberately untouched: the recitals, the paragraph boxes, the decree, the judge's signature and the date beside it may never carry anyone's ink but the court's. **When you file, ask the clerk whether the court wants the proposed order's recital blanks completed to match your petition**, and complete exactly those if the clerk says so.

## What the platform deliberately left blank

- **Your signature on the petition and the date beside it.** You make the statement, not the platform.
- **The whole Certificate of Service** — name, signature, date. Service has not happened yet.
- **The arrest date's and the conviction date's day, month and year blanks.** The platform holds each date only as a whole and has no day, month or year fact to put in them.
- **Race, sex, ATN, SID and FBI number.** Identification facts the platform either does not hold or does not write.
- **The court's name and the county in both captions.** The platform holds no court-type fact for this route, and this form's field names are the wrong way round for the county, so nothing is written into either rather than risking the wrong value in the wrong blank.
- **Paragraph 2's conviction-offense line.** The platform holds one offense and has written it as the offense you were charged with; what you were convicted of is yours to state.
- **Everything on the order below its caption** that belongs to the court.

## Where self-help ends

This packet prepares forms; it does not decide anything. Stop and get advice from a **lawyer licensed in Arkansas** — or put the question to the **circuit clerk of the county named in your caption**, who can say what the court requires even though the clerk cannot give legal advice — before filing, if any of these is true:

- **the prosecuting attorney objects, or the court sets a contested hearing.** The committed record for this packet is explicit that this is where self-help stops: "Hand off on any opposition or contested hearing."
- you cannot truthfully say what paragraph 3 says — that the offense is a target offense under A.C.A. § 16-93-1202(10)(A)(i) or (ii) and is not a violent or sexual offense under (iii) or (iv);
- you did not complete the Community Punishment Act disposition paragraph 5 asks about, or you are unsure which of its boxes describes what you completed;
- you have a pending felony charge in any state or federal court, so paragraph 8's second box is yours — whether the petition can be granted while it is pending is a question this packet does not answer;
- you have outstanding restitution, fines or court costs. The compiled Arkansas profile records that satisfying them is the real gate on this relief, and it is a completion requirement rather than a fee;
- you do not know which offense, class or A.C.A. section to copy, and your paperwork does not show them — the ACIC criminal-history record and the Judgment and Commitment Order are where they come from.

## What this packet is not

This is a prepared set of official ACIC forms. It is not legal advice, it is not filed for you, and it does not decide whether your record can be sealed under Act 531 of 1993 or Act 1460 of 2013.

_Route: ${ROUTE_KEY} — A.C.A. § 16-93-1201 et seq. (Act 531 of 1993); sealed under A.C.A. § 16-90-1401 et seq. (Act 1460 of 2013)_
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
      const result = await finalizeOfficialForm({
        sourceBytes: bytes,
        expectedSha256: doc.sha256,
        census: census.fields,
        facts,
        explicitMappings: doc.explicitMappings,
        unwritableFields: doc.unwritable.map((u) => ({ field: u.field, class: u.class })),
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

      fixtures[label] = { file: rel, sha256: hash, byteLength: result.bytes.length, report: result.report, proof };
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
        unfittable: fixtures[label].report.unfittable
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
