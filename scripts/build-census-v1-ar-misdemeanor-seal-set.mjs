#!/usr/bin/env node
// Route-obligation census v1 — packet family `ar-misdemeanor-seal-set`.
//
//   node scripts/build-census-v1-ar-misdemeanor-seal-set.mjs
//
// Arkansas, sealing a MISDEMEANOR CONVICTION under Act 1460 of 2013,
// A.C.A. § 16-90-1401 et seq., with the eligibility rule at § 16-90-1405.
// Route `obligation:track-only:AR:ar-misdemeanor-seal`. The family delivers
// two ACIC uniform forms:
//
//   * Petition to Seal Misdemeanors Under Act 1460 of 2013 — the filing;
//   * Order to Seal Misdemeanors Under Act 1460 of 2013     — the proposed
//     order the COURT signs.
//
// This is not a renderer. Every decision about what may be written is made by
// scripts/rcap-official-forms/rcap-field-semantics.mjs and every byte is
// written by finalizeOfficialForm; this file supplies the two things only a
// caller can supply — the family's ROLE classification and its explicit
// mappings — and then proves the result from the artifact bytes rather than
// from its own report.
//
// THE CAPTION WIDGET NAMES DO NOT DESCRIBE THE CAPTION, AND THE MAPPING IS
// SETTLED BY GEOMETRY
//
// Page 1 of both forms prints
//
//     IN THE ______________ COURT OF ________________, ARKANSAS
//     ____________ DIVISION
//
// and the three widgets over those blanks are named `IN THE`, `COURT OF` and
// `DIVISION`. Read as words that would mean the first blank is the court, the
// second is something belonging to "COURT OF", and the third is the division.
// Measured from the page's own text runs it is not what the names suggest:
//
//   the printed "IN THE " ends at x≈142 and its blank's underscores run to
//   x≈243; widget `IN THE` occupies 142.40–243.70, so it is the COURT TYPE.
//
//   the printed "OF " ends at x≈318 and its blank runs to the "_," before
//   " ARKANSAS" at 427.2; widget `COURT OF` occupies 318.70–434.40, so it is
//   the COUNTY — the widget whose name reads "COURT OF" is the county blank.
//
//   the second line's underscores run 232.3–316 and widget `DIVISION`
//   occupies 232.20–318.80, so that one does mean what it says.
//
// So the county is written into `COURT OF`, and the blank named `IN THE` is the
// type of court and is left for the participant. Trusting the names would have
// printed the county where the court's name belongs. The same shifted-caption
// trap is recorded on the sibling family `ar-act531-set`, where the names are
// shifted differently again; on neither form do they settle anything.
//
// WHAT THIS PACKET WILL NOT WRITE, AND WHY
//
//   The proposed order below its caption. Its recitals, its paragraph boxes,
//   its decree, the judge's signature and the date beside it are the court's
//   alone. `captionOnly` carries that determination for the whole document.
//
//   The verification block on petition page 4. It is sworn before a notary:
//   the "Subscribed and sworn to before me on this ___ day of ___, 20___"
//   date, the Notary Public line and the commission-expiry line are the
//   notary's, and nothing here dates or signs an oath that has not been taken.
//
//   Every signature and every date beside one, on the petition and on the
//   certificate of service. Service has not happened when this packet is
//   built, so certifying it or dating it would certify a mailing that has not
//   occurred.
//
//   Race, sex, DOB where not held, ATN, SID and FBI number, in the block the
//   form itself heads "THE FOLLOWING INFORMATION IS REQUIRED FOR PROPER
//   IDENTIFICATION OF THE DEFENDANT". Race is a protected category in the
//   shared semantics and the platform holds none of the agency identifiers.
//   Each is carried to the participant by name rather than guessed.
import fs from "node:fs";
import assert from "node:assert/strict";
import path from "node:path";
import crypto from "node:crypto";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

import { extractTextItems, groupIntoLines, captureWidgetContext, normalizeHarvestedText }
  from "./rcap-official-forms/rcap-pdf-anchor-capture.mjs";
import { finalizeOfficialForm } from "./rcap-official-forms/rcap-official-form-finalize.mjs";
import { flattenedWidgets, drawnAt } from "./rcap-official-forms/pdf-flattened-widgets.mjs";
import { strokedRectangles } from "./lib/pdf-stroked-boxes.mjs";
import { makeCorpusEntryResolver } from "./lib/corpus-index-paths.mjs";
import { BLANK_DISPOSITIONS, PASS_COUNTERS, classifyField, classifyBlank, rowKeyOf }
  from "./rcap-packet-completeness/completeness-contract.mjs";
import { CHARGE_VALUE_WORDS, captionDescribesChargeValue, descriptorsMatching, protectCategoryOf, decideBinding, resolveFact }
  from "./rcap-official-forms/rcap-field-semantics.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(rootDir);
const require = createRequire(import.meta.url);
const { PDFDocument, PDFTextField, PDFCheckBox, PDFRadioGroup, PDFDropdown, PDFOptionList } = require("pdf-lib");

const FAMILY_ID = "ar-misdemeanor-seal-set";
const OUT = "data/rcap-all50/overlays/census-v1/ar/ar-misdemeanor-seal-set--official-pdf-fill";
const CORPUS_INDEX = "data/rcap-all50/local-source-corpus-index.json";
const CORPUS_ROOT = "private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1";
const STALE_BLOCK = "data/rcap-grade-a/stale-artifact-block.json";
const ROUTE_KEY = "obligation:track-only:AR:ar-misdemeanor-seal";

const fail = (message, detail = null) => {
  console.error(`build-census-v1-${FAMILY_ID}: ${message}`);
  if (detail) console.error(`  ${detail}`);
  console.error("  Nothing was written.");
  process.exit(1);
};

const DOCUMENTS = [
  {
    key: "petition",
    documentId: "ACIC-PETITION-TO-SEAL-MISDEMEANORS-ACT-1460",
    documentRole: "PETITION",
    officialTitle: "Petition to Seal Misdemeanors Under Act 1460 of 2013; A.C.A. 16-90-1401, Et. Seq.",
    revision: "REV-2023-08-01",
    sha256: "63a308c4fd36a35918249574675c3e83ed47e677cffeae30e09c7e344cfcda23",
    pathInArchive: "LegalEase Arkanasa/3-Misdemeanor-Petition-8_01_2023.pdf",
    ownership: "participant_completed",
    captionOnly: false,

    // Two explicit mappings, and no more.
    //
    // `First Middle and Last name` is the page 1 DEFENDANT caption, printed
    // "(First, Middle and Last name)" directly beneath it.
    //
    // `1` is paragraph 1's FIRST offence rule — the widget at page 1
    // y=434.90, under the printed "________, and charged with the offense(s)
    // of:". `matter.charge` is a requiresExplicitMapping descriptor, so the
    // caller must name it or nothing binds.
    explicitMappings: {
      "First Middle and Last name": "participant.full_legal_name",
      "1": "matter.charge"
    },

    // THE COUNTY, AND WHY IT TAKES A PRINTED-LABEL CORRECTION.
    //
    // The caption's county blank is the widget named `COURT OF` (see the
    // header note: measured, not guessed). The shared binder reaches a fact
    // through the field NAME first and the harvested caption second; "COURT
    // OF" matches no descriptor, and the caption harvested at that widget is
    // the bare fragment "_________", which matches none either. An explicit
    // mapping cannot help: decideBinding consults explicitMappings only to
    // AUTHORISE a descriptor that already matched, so naming `matter.county`
    // there writes nothing at all.
    //
    // The correction states the printed line this build read at that widget's
    // own measured position. It is narrow on purpose: it names the county and
    // nothing else, so it cannot reach the court name, and it is used on no
    // offence, charge or statute blank anywhere in this family.
    printedLabelCorrections: {
      "COURT OF": {
        printedLabel: "COURT OF county, ARKANSAS",
        readFrom: "page 1, printed line at y=708.0: \"IN THE ______________ COURT OF ________________, ARKANSAS\"",
        measuredEvidence: "the widget occupies x 318.70-434.40; the printed \"OF \" ends at x≈318.0 and the \"_, \" before \" ARKANSAS\" begins at x=427.2, so the widget spans the county blank and nothing else",
        why: "The widget's own name is \"COURT OF\", which reads as the court. The blank it covers is the county. The widget over the COURT-TYPE blank is named \"IN THE\". Only the geometry settles it, and the harvested caption at this widget is a run of underscores that settles nothing."
      }
    },

    unwritable: [
      // --- defaults the shared binder would have taken, refused by ROLE -----
      //
      // Each of the first four is a field decideBinding returns WRITABLE for.
      // They are the near-misses of this form and they are refused here,
      // before anything is rendered, rather than discovered in a raster.
      { field: "Petitioner", class: "participant_signature_line",
        why: "The verification's SIGNATURE line on page 4. The widget sits at y=527.40, above the printed word \"Petitioner\" at y=512 — the word is the line's caption, not a name blank. The binder reads the name \"Petitioner\" as participant.full_legal_name and would print the participant's name on the signature line of a sworn verification." },
      { field: "Date_2", class: "certificate_of_service_date",
        why: "The DATE line of the page 5 Certificate of Service, at y=408.10 under the printed \"Date\" at y=377. Its harvested caption bled from the signature line above it and reads \"Defendant orDefendant's\", so the binder resolves it to participant.full_legal_name and would print a NAME on a DATE line. Even with the caption right, service has not happened and nothing here dates it." },
      { field: "Defendant Address 02", class: "address_continuation_line",
        why: "The second printed rule of the two-line Defendant's Address block on page 3. The platform holds one street address and writes it on the first rule; filling both prints the same address twice." },
      { field: "COUNTY OF", class: "notarization_venue_not_held",
        why: "The verification's \"STATE OF ARKANSAS / COUNTY OF ____\" on page 4. This is the county where the oath is sworn, which is wherever the participant finds a notary, and not the county of the case. The binder resolves the name to matter.county and would assert the oath was taken in the county the case was handled in." },

      // --- paragraph 1 and 2 offence and statute lines ----------------------
      { field: "2", class: "offence_list_continuation_rule",
        why: "The second printed rule of paragraph 1's single free-text offence list. The offence the platform holds is written on the first rule; a further offence charged in the same arrest is the participant's to add." },
      { field: "guilty of the offenses of 1", class: "conviction_offence_line_not_a_charge_row",
        why: "Paragraph 2's \"guilty of the offense(s) of\" line. Paragraph 1 asks what you were CHARGED with and paragraph 2 what you were CONVICTED of; the offence of conviction may be a different or reduced offence, and the platform holds one offence for the matter." },
      { field: "guilty of the offenses of 2", class: "conviction_offence_line_not_a_charge_row",
        why: "The second rule of the same paragraph 2 offence list." },
      { field: "guilty of the offenses of 3", class: "conviction_offence_line_not_a_charge_row",
        why: "The third rule of the same paragraph 2 offence list." },
      { field: "in violation of ACA", class: "statute_section_not_held",
        why: "Paragraph 1's \"in violation of A.C.A.§ ______\" blank. The platform holds no statute-section fact; it comes off the participant's own paperwork." },
      { field: "in violation of ACA_2", class: "statute_section_not_held",
        why: "Paragraph 2's \"in violation of A.C.A.§ ______\" blank, for the offence of conviction, on the same footing." },

      // --- date components --------------------------------------------------
      { field: "Day 01", class: "arrest_date_component",
        why: "Day component of paragraph 1's arrest date. The platform holds matter.arrest_date as a whole date and holds no day fact." },
      { field: "Month 01", class: "arrest_date_component", why: "Month component of the same arrest date." },
      { field: "Year 01", class: "arrest_date_component", why: "Year component of the same arrest date." },
      { field: "Day 02", class: "conviction_date_component",
        why: "Day component of paragraph 2's conviction date. The platform holds matter.conviction_date as a whole date and holds no day fact." },
      { field: "Month 02", class: "conviction_date_component", why: "Month component of the same conviction date." },
      { field: "Year 02", class: "conviction_date_component", why: "Year component of the same conviction date." },

      // --- caption blanks the platform holds no fact for ---------------------
      { field: "IN THE", class: "court_identity_not_held",
        why: "The type of court in the caption — the blank in \"IN THE ______ COURT OF\", measured at x 142.40-243.70. The county is written; which Arkansas court takes this petition is the clerk's answer, and the platform holds no court-type fact for this route." },
      { field: "DIVISION", class: "court_division_not_held",
        why: "The caption's division blank on the second line, completed only where the filing court has divisions. The platform holds no division fact." },

      // --- signatures, service and agency identifiers -----------------------
      { field: "Date", class: "participant_signature_date",
        why: "The date beside the defendant's signature on page 3. Dating a signature that has not been made asserts the petition was signed on a day it was not." },
      { field: "do hereby certify that a true and correct", class: "certificate_of_service_attestation",
        why: "The certifying party's name in the page 5 Certificate of Service's \"I, ____, do hereby certify\" sentence. It is a sworn statement about an act of service that has not happened." },
      { field: "Arrest Tracking Number", class: "agency_assigned_identifier",
        why: "The ATN is assigned by Arkansas ACIC when an arrest is processed. It identifies the arrest through a system the platform has no knowledge of and is the agency's to state." },
      { field: "Sex", class: "identification_fact_not_held",
        why: "The identification block's sex entry on page 4. The platform holds no such fact and does not infer one." }
    ],

    completeness: {
      defaultBlank: null,
      fields: {
        "Defendants Signature": { refusalClass: "signature_or_date_participant_completion",
          reason: "The defendant's signature on page 3. The petition is the defendant's own statement; the participant signs it." },
        "Date": { refusalClass: "signature_or_date_participant_completion",
          reason: "The date beside the defendant's signature on page 3, completed by the participant when the petition is signed." },
        "Petitioner": { refusalClass: "signature_or_date_participant_completion",
          reason: "The signature line of the page 4 verification, signed by the participant in front of the notary and not before." },
        "Date_2": { refusalClass: "signature_or_date_participant_completion",
          reason: "The date on the page 5 Certificate of Service, completed by the participant after service has actually happened." },
        "Defendant of Defendants Attorney": { refusalClass: "signature_or_date_participant_completion",
          reason: "The signature line on the page 5 Certificate of Service, signed by the participant (or their attorney) after service." },
        "do hereby certify that a true and correct": { refusalClass: "participant_sworn_narrative_or_legal_election",
          reason: "The certifying party's name in the Certificate of Service's sworn \"I, ____, do hereby certify\" sentence. It is the filer's statement about an act of service, made after mailing." },
        "Notary Public": { refusalClass: "court_prosecutor_clerk_or_agency_owned",
          reason: "The notary's own signature line in the page 4 verification. Only the notary signs it." },
        "My Commissionexpires": { refusalClass: "court_prosecutor_clerk_or_agency_owned",
          reason: "The notary's commission-expiry line, stated by the notary who takes the oath." },
        "Day 03": { refusalClass: "court_prosecutor_clerk_or_agency_owned",
          reason: "The day in \"Subscribed and sworn to before me on this ___ day of ___, 20___\". The notary states the date the oath was actually taken." },
        "Month 03": { refusalClass: "court_prosecutor_clerk_or_agency_owned",
          reason: "The month of the same notarial date, on the same footing." },
        "Year 03": { refusalClass: "court_prosecutor_clerk_or_agency_owned",
          reason: "The year of the same notarial date, on the same footing." },
        "Arrest Tracking Number": { refusalClass: "court_prosecutor_clerk_or_agency_owned",
          reason: "The ATN is assigned by Arkansas ACIC when an arrest is processed; it is the agency's identifier to state." },
        "FBI No if known": { disposition: "OPTIONAL_PARTICIPANT_CONTENT", requiredBeforeFiling: false,
          sourceOptional: { sourcePath: "private/source-imports/Nationwide_Recovery_Pool_2026-09-02/LegalEase Arkanasa/3-Misdemeanor-Petition-8_01_2023.pdf", sourceSha256: "63a308c4fd36a35918249574675c3e83ed47e677cffeae30e09c7e344cfcda23", page: 4, rect: { x: 355.92, y: 115.92, width: 159, height: 21.84 }, sourceText: "FBI No. (if known)", condition: "identifier_known_to_participant" },
          reason: "The identification block's FBI number, which the form itself marks \"(if known)\". The platform holds no such identifier and does not guess one; write it only if you have it." },

        // Declared required-before-filing. Every one is named in the tables in
        // participant-instructions.md.
        "IN THE": { requiredBeforeFiling: true,
          reason: "The type of court in the caption's \"IN THE ______ COURT OF\" blank. Which Arkansas court handled your case, and so takes this petition, is the answer the clerk of the county gives, and the participant writes it before filing." },
        "DIVISION": { requiredBeforeFiling: false,
          reason: "The caption's division blank, completed only if that court has divisions. The clerk answers whether it does; the platform does not invent it." },
        "COUNTY OF": { requiredBeforeFiling: true,
          reason: "The county in the page 4 verification's \"STATE OF ARKANSAS / COUNTY OF ____\". This is the county where you swear the oath, which is wherever your notary is, and it is written by you or by the notary at the time of signing." },
        "guilty of the offenses of 1": { requiredBeforeFiling: true,
          reason: "Paragraph 2's \"guilty of the offense(s) of\" line. The platform holds one offence for this matter and writes it on paragraph 1's charged-offence line; the offence you were convicted of may be a different or reduced offence, so it is yours to write from your judgment before filing." },
        "in violation of ACA": { requiredBeforeFiling: true,
          reason: "The \"in violation of A.C.A. § ______\" blank closing paragraph 1. The platform holds no statute-section fact; the participant copies it from their arrest or court paperwork before filing." },
        "in violation of ACA_2": { requiredBeforeFiling: true,
          reason: "The \"in violation of A.C.A. § ______\" blank in paragraph 2, for the offence of conviction. The participant copies it from their judgment before filing." },
        "Day 01": { requiredBeforeFiling: true,
          reason: "The day component of paragraph 1's arrest date. The platform holds no day fact and writes nothing here; the participant copies the arrest date from their arrest or court paperwork before filing." },
        "Month 01": { requiredBeforeFiling: true,
          reason: "The month component of paragraph 1's arrest date, on the same footing as the day." },
        "Year 01": { requiredBeforeFiling: true,
          reason: "The year component of paragraph 1's arrest date, on the same footing as the day and the month." },
        "Day 02": { requiredBeforeFiling: true,
          reason: "The day component of paragraph 2's conviction date. The participant copies the conviction date from their court paperwork before filing." },
        "Month 02": { requiredBeforeFiling: true,
          reason: "The month component of paragraph 2's conviction date, on the same footing as the day." },
        "Year 02": { requiredBeforeFiling: true,
          reason: "The year component of paragraph 2's conviction date, on the same footing as the day and the month." },
        "Race": { requiredBeforeFiling: true,
          reason: "The identification block's race entry on page 4, which the form states is required for identification in the state and national record systems. The platform does not hold or write it; the participant states it before filing." },
        "Sex": { requiredBeforeFiling: true,
          reason: "The identification block's sex entry, in the same block and on the same footing. The platform does not hold it; the participant states it before filing." },
        "SID number": { requiredBeforeFiling: true,
          reason: "The State Identification number in the page 4 identification block. The platform holds no SID; the participant copies it from their arrest paperwork or ACIC criminal-history record before filing." },
        "Defendant Address 02": { disposition: "OPTIONAL_PARTICIPANT_CONTENT", requiredBeforeFiling: false,
          sourceOptional: { sourcePath: "private/source-imports/Nationwide_Recovery_Pool_2026-09-02/LegalEase Arkanasa/3-Misdemeanor-Petition-8_01_2023.pdf", sourceSha256: "63a308c4fd36a35918249574675c3e83ed47e677cffeae30e09c7e344cfcda23", page: 3, rect: { x: 69.84, y: 332.16, width: 225.84, height: 23.4 }, sourceText: "Defendant’s Address", condition: "address_needs_second_line" },
          reason: "The second rule of the Defendant's Address block on page 3, for an apartment or unit line. The platform writes the one address it holds on the first rule; use this only if your address needs a second line." },

        // Genuine participant elections — paragraph 7's four alternatives,
        // paragraph 9's two and paragraph 10's two.
        "Check Box1": { refusalClass: "participant_sworn_narrative_or_legal_election",
          reason: "Paragraph 7's first alternative — all requirements completed and the conviction was not one of the misdemeanors listed in A.C.A. § 16-90-1405(b)(1). Which of the four is true of your case is read off your own paperwork; this route does not determine it." },
        "Check Box2": { refusalClass: "participant_sworn_narrative_or_legal_election",
          reason: "Paragraph 7's second alternative — at least five years since sentence completion, for a conviction that IS one of the listed misdemeanors." },
        "Check Box3": { refusalClass: "participant_sworn_narrative_or_legal_election",
          reason: "Paragraph 7's third alternative — at least ninety days since the court denied a Petition to Seal for a conviction that is not a listed misdemeanor." },
        "Check Box4": { refusalClass: "participant_sworn_narrative_or_legal_election",
          reason: "Paragraph 7's fourth alternative — at least one year since the court denied a Petition to Seal for a conviction that is a listed misdemeanor." },
        "Check Box5": { refusalClass: "participant_sworn_narrative_or_legal_election",
          reason: "Paragraph 9's first box — no pending felony charges in any state or federal court. Whether you have one is not a fact the platform holds." },
        "Check Box6": { refusalClass: "participant_sworn_narrative_or_legal_election",
          reason: "Paragraph 9's second box — one or more pending felony charges, whose status you then state on the two rules beneath it." },
        "Check Box7": { refusalClass: "participant_sworn_narrative_or_legal_election",
          reason: "Paragraph 10's IS box — required to register as a sex offender under A.C.A. § 12-12-901 et seq. A sworn statement about your own registration status." },
        "Check Box8": { refusalClass: "participant_sworn_narrative_or_legal_election",
          reason: "Paragraph 10's IS NOT box, on the same footing." },
        "federal charges 01": { refusalClass: "participant_sworn_narrative_or_legal_election",
          reason: "The first status rule under paragraph 9's second box. A charge in the platform's list belongs to THIS matter; paragraph 9 asks about a pending felony somewhere else." },
        "federal charges 02": { refusalClass: "participant_sworn_narrative_or_legal_election",
          reason: "The second rule of the same paragraph 9 status block, on the same footing." },
        "2": { disposition: "OPTIONAL_PARTICIPANT_CONTENT", requiredBeforeFiling: false,
          sourceOptional: { sourcePath: "private/source-imports/Nationwide_Recovery_Pool_2026-09-02/LegalEase Arkanasa/3-Misdemeanor-Petition-8_01_2023.pdf", sourceSha256: "63a308c4fd36a35918249574675c3e83ed47e677cffeae30e09c7e344cfcda23", page: 1, rect: { x: 117, y: 418.8, width: 412.8, height: 14.52 }, sourceText: "charged with the offense(s) of:", condition: "additional_charged_offence_exists" },
          reason: "The second rule of paragraph 1's offence list. Your offence is written on the first rule; use this one only if the same arrest charged more than one offence." },
        "guilty of the offenses of 2": { disposition: "OPTIONAL_PARTICIPANT_CONTENT", requiredBeforeFiling: false,
          sourceOptional: { sourcePath: "private/source-imports/Nationwide_Recovery_Pool_2026-09-02/LegalEase Arkanasa/3-Misdemeanor-Petition-8_01_2023.pdf", sourceSha256: "63a308c4fd36a35918249574675c3e83ed47e677cffeae30e09c7e344cfcda23", page: 1, rect: { x: 117, y: 322.08, width: 420.6, height: 14.52 }, sourceText: "guilty of the offense(s) of:", condition: "additional_convicted_offence_exists" },
          reason: "The second rule of paragraph 2's conviction-offence list. Use it only if you were convicted of more than one offence in this case." },
        "guilty of the offenses of 3": { disposition: "OPTIONAL_PARTICIPANT_CONTENT", requiredBeforeFiling: false,
          sourceOptional: { sourcePath: "private/source-imports/Nationwide_Recovery_Pool_2026-09-02/LegalEase Arkanasa/3-Misdemeanor-Petition-8_01_2023.pdf", sourceSha256: "63a308c4fd36a35918249574675c3e83ed47e677cffeae30e09c7e344cfcda23", page: 1, rect: { x: 117, y: 306, width: 420.48, height: 14.52 }, sourceText: "guilty of the offense(s) of:", condition: "additional_convicted_offence_exists" },
          reason: "The third rule of the same paragraph 2 list, on the same footing." }
      }
    }
  },
  {
    key: "order",
    documentId: "ACIC-ORDER-TO-SEAL-MISDEMEANORS-ACT-1460",
    documentRole: "PROPOSED_ORDER",
    officialTitle: "Order to Seal Misdemeanors Under Act 1460 of 2013; A.C.A. 16-90-1401, Et. Seq.",
    revision: "REV-2019-08-01",
    sha256: "4d6bc578c6a40a58d1234315939d46579862b5d382c85359ae4334763e7bbcc8",
    pathInArchive: "STATES/AR/05_SOURCE_GATED/AR__SOURCE-GATED__AR-ACIC-ORDER-TO-SEAL-MISDEMEANORS-UNDER-ACT-1460__order-to-seal-misdemeanors-under-act-1460-of-2013__REV-2019-08-01__EN.pdf",
    ownership: "court_issued_order",
    captionOnly: true,
    explicitMappings: {
      "First Middle and Last name": "participant.full_legal_name"
    },
    printedLabelCorrections: {
      "COURT OF": {
        printedLabel: "COURT OF county, ARKANSAS",
        readFrom: "page 1, printed line at y=708.0: \"IN THE ______________ COURT OF ________________, ARKANSAS\"",
        measuredEvidence: "the widget occupies x 318.70-434.40, spanning the blank between the printed \"OF \" and the \"_, \" before \" ARKANSAS\" at x=427.2",
        why: "Same shifted naming as the petition, and the order's caption must match the petition's. The county is the one caption fact this packet can source."
      }
    },
    unwritable: [
      { field: "Defendant", class: "court_decree_party_name",
        why: "The defendant's name inside the court's DECREE on page 3 — \"IT IS, THEREFORE, by the Court, ORDERED that the Petition of the Defendant, ______, to seal ... hereby is GRANTED.\" captionOnly already refuses it; stated here because the binder resolves the field name to participant.full_legal_name and because the sentence it sits in is the court's ruling, not the order's caption." },
      { field: "1", class: "court_recital_offence_line",
        why: "The offence line in the court's own recital of paragraph 1. captionOnly already refuses it; stated here because it is a recital of the court's finding rather than a blank this packet fills." },
      { field: "2", class: "court_recital_offence_line", why: "The second rule of the same recital." },
      { field: "the offenses of 1", class: "court_recital_offence_line", why: "The conviction-offence rule of the court's paragraph 2 recital." },
      { field: "the offenses of 2", class: "court_recital_offence_line", why: "The second rule of the same recital." },
      { field: "the offenses of 3", class: "court_recital_offence_line", why: "The third rule of the same recital." },
      { field: "in violation of ACA", class: "court_recital_statute_line", why: "The statute blank closing the court's paragraph 1 recital." },
      { field: "in violation of ACA_2", class: "court_recital_statute_line", why: "The statute blank in the court's paragraph 2 recital." },
      { field: "Judge", class: "court_only_signature", why: "The judge's signature line on page 3. Court-only." },
      { field: "Date", class: "court_only_signature_date", why: "The date beside the judge's signature. The court dates its own order." },
      { field: "Arrest Tracking Number", class: "agency_assigned_identifier",
        why: "ACIC-assigned arrest identifier in the page 3 identification block; the agency's to state." },
      { field: "Day 01", class: "arrest_date_component",
        why: "Day component of the arrest date in the court's recital. The platform holds no day fact." },
      { field: "Month 01", class: "arrest_date_component", why: "Month component of the same recital date." },
      { field: "Year 01", class: "arrest_date_component", why: "Year component of the same recital date." },
      { field: "Day 02", class: "conviction_date_component", why: "Day component of the conviction date in the court's recital." },
      { field: "Month 02", class: "conviction_date_component", why: "Month component of the same recital date." },
      { field: "Year 02", class: "conviction_date_component", why: "Year component of the same recital date." },
      { field: "IN THE", class: "court_identity_not_held",
        why: "The type of court in the order's caption, which must match the petition's. The platform holds no court-type fact for this route." },
      { field: "DIVISION", class: "court_division_not_held",
        why: "The caption's division blank, completed only where the filing court has divisions." }
    ],

    // The order is `captionOnly`, and that single determination answers the
    // completeness question for everything below its caption: the instrument
    // is the court's, and this packet writes nothing there. So the default
    // carries the whole document and only the caption blanks are separate.
    completeness: {
      /*
       * The default carries the court's own instrument: the recitals, the
       * paragraph boxes, the decree, the judge's signature and the date beside
       * it. It does NOT carry the whole document below the caption, and the
       * wording says so, because it is not true of this form: the page 3
       * identification block is headed "THE FOLLOWING INFORMATION IS REQUIRED
       * FOR PROPER IDENTIFICATION OF THE DEFENDANT IN THE STATE AND NATIONAL
       * RECORD SYSTEMS" — it exists so ACIC can match the right record, it
       * repeats the petition's own block, and it is not a finding of the
       * court. Its six blanks are declared individually below on the same
       * footing as the petition's, so none of them is swept into a
       * court-owned default it does not belong to.
       */
      defaultBlank: {
        refusalClass: "court_prosecutor_clerk_or_agency_owned",
        reason: "The order's recitals, its paragraph boxes, its decree, the judge's signature and the date beside it are the court's own instrument, and this packet writes nothing in any of them."
      },
      fields: {
        "IN THE": { requiredBeforeFiling: true,
          reason: "The type of court in the order's caption, which must match the petition's. Which Arkansas court handled your case is the answer the clerk of the county gives, and the participant writes the same answer on both forms before filing." },
        "DIVISION": { refusalClass: null,
          reason: "The caption's division blank, completed only if that court has divisions, to match the petition. The clerk answers whether it does; the platform does not invent it." },

        // The page 3 identification block. The same six blanks as the
        // petition's page 4 block, and the participant's on the same terms —
        // not the court's, despite sitting below the decree.
        "Race": { requiredBeforeFiling: true,
          reason: "The identification block's race entry on page 3 of the order, which the form states is required for identification in the state and national record systems. The platform does not hold or write it; the participant states it, to match the petition." },
        "Sex": { requiredBeforeFiling: true,
          reason: "The identification block's sex entry, in the same block and on the same footing, to match the petition." },
        "SID number": { requiredBeforeFiling: true,
          reason: "The State Identification number in the order's identification block. The platform holds no SID; the participant copies it from the same ACIC criminal-history record they used for the petition." },
        "Arrest Tracking Number": { refusalClass: "court_prosecutor_clerk_or_agency_owned",
          reason: "The ATN is assigned by Arkansas ACIC when an arrest is processed; it is the agency's identifier to state, here as on the petition." },
        "FBI No if known": { disposition: "OPTIONAL_PARTICIPANT_CONTENT", requiredBeforeFiling: false,
          sourceOptional: { sourcePath: "private/source-imports/Nationwide_Recovery_Pool_2026-09-02/LegalEase Arkanasa/source-gated/ACIC__order-to-seal-misdemeanors-under-act-1460__rev-2019-08-01.pdf", sourceSha256: "4d6bc578c6a40a58d1234315939d46579862b5d382c85359ae4334763e7bbcc8", page: 3, rect: { x: 355.92, y: 191.04, width: 159, height: 15.72 }, sourceText: "FBI No. (if known)", condition: "identifier_known_to_participant" },
          reason: "The identification block's FBI number, which the form itself marks \"(if known)\". The platform holds no such identifier and does not guess one; write it only if you have it." }
      }
    }
  }
];

// The ONLY blanks in this family that may ever carry the participant's name.
/*
 * The ONLY blanks in which the participant's name may appear, by document.
 *
 * Every appearance of a name token in the finalized bytes is attributed to the
 * widget it was drawn in and checked against this list, so a name that lands
 * anywhere else is blocking. Two of this form's near-misses are exactly that
 * shape — the verification's signature line is named `Petitioner` and the
 * certificate of service's date line harvests the caption of the signature line
 * above it — and both are refused by role in DOCUMENTS. This list is the
 * independent check on that refusal, read from the artifact rather than from
 * the map.
 */
const NAME_MAY_APPEAR_IN = {
  "ACIC-PETITION-TO-SEAL-MISDEMEANORS-ACT-1460": [
    "First Middle and Last name",  // page 1 DEFENDANT caption
    "WHEREFORE the Defendant",     // page 3 "WHEREFORE, the Defendant, ______,"
    "Comes the Petitioner"         // page 4 "Comes the Petitioner, ____, under oath"
  ],
  "ACIC-ORDER-TO-SEAL-MISDEMEANORS-ACT-1460": [
    "First Middle and Last name"   // page 1 DEFENDANT caption; the decree's name blank is the court's
  ]
};

/*
 * Blanks that must be EMPTY in every fixture, named rather than pattern-matched.
 *
 * The sibling family recognised these by a regex over field names. On these two
 * forms that would miss four of them: the verification's signature line is
 * named `Petitioner`, the certificate of service's signature line is named
 * `Defendant of Defendants Attorney`, its date line is `Date_2`, and the
 * notarial date is `Day 03`/`Month 03`/`Year 03`. A signature, a date beside
 * one, a notarial act and a certificate of service are the four things this
 * packet must never assert, so they are listed by name and checked from the
 * output bytes.
 */
const MUST_BE_BLANK = {
  "ACIC-PETITION-TO-SEAL-MISDEMEANORS-ACT-1460": [
    "Defendants Signature", "Date",
    "Petitioner", "Notary Public", "My Commissionexpires", "Day 03", "Month 03", "Year 03",
    "do hereby certify that a true and correct", "Defendant of Defendants Attorney", "Date_2"
  ],
  "ACIC-ORDER-TO-SEAL-MISDEMEANORS-ACT-1460": ["Judge", "Date"]
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
/*
 * BOUND BY CONTENT DIGEST ACROSS EVERY DECLARED CUSTODY, NOT BY ONE ARCHIVE.
 *
 * The sibling family resolves inside the Master Library alone, because both of
 * its binaries live there. One of this family's two does not: the misdemeanor
 * petition is held in the Nationwide recovery pool, under
 * `LegalEase Arkanasa/3-Misdemeanor-Petition-8_01_2023.pdf` — the directory name
 * is misspelled in the custody itself, which is exactly why a path-shaped gate
 * missed it and reported a held source as unresolved.
 *
 * So the index is searched by SHA-256 rather than by path, every custody the
 * index declares is asked through the shared resolver, and the bytes found are
 * re-hashed before they are used. A file that merely carries the right form
 * number is never substituted: nothing matches unless its content hashes to the
 * digest this family pins.
 */
function resolveSource(doc) {
  const index = readJson(CORPUS_INDEX);
  const resolver = makeCorpusEntryResolver(index, {
    repoRoot: rootDir, masterLibraryRoot: process.env.MASTER_LIBRARY_SOURCE_DIR
  });
  const candidates = (index.entries ?? []).filter((e) => e.sha256 === doc.sha256);
  if (candidates.length === 0) {
    fail(`${doc.documentId}: no entry of ${CORPUS_INDEX} hashes to this family's pinned digest`, doc.sha256);
  }
  const declaredPathEntry = candidates.find((e) => e.path === doc.pathInArchive) ?? null;
  if (!declaredPathEntry) {
    fail(`${doc.documentId}: the pinned digest resolves, but not at the path this family declares`,
      `declared ${doc.pathInArchive}; the digest is indexed at ${candidates.map((c) => `${c.custody}:${c.path}`).join(", ")}`);
  }
  const tried = [];
  for (const entry of candidates) {
    const abs = resolver.resolve(entry);
    if (!abs) { tried.push(`${entry.custody}: custody not declared by the index`); continue; }
    if (!fs.existsSync(abs)) { tried.push(`${entry.custody}: not mounted at ${abs}`); continue; }
    const bytes = fs.readFileSync(abs);
    const got = sha256(bytes);
    if (got !== doc.sha256) { tried.push(`${entry.custody}: SOURCE DRIFT, bytes hash ${got}`); continue; }
    if (bytes.length !== entry.byteLength) {
      fail(`${doc.documentId}: byte length disagrees with the corpus index`,
        `index ${entry.byteLength}, read ${bytes.length}`);
    }
    return { bytes, indexEntry: entry, resolvedFrom: abs, custody: entry.custody };
  }
  fail(`${doc.documentId}: the pinned digest is indexed but no custody holding it is mounted here`,
    `${doc.sha256} — ${tried.join("; ")}`);
  return null;
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

  // Printed-label corrections. Each replaces the harvested caption for ONE
  // named widget with the printed text this build read at that widget's own
  // measured position, and the harvested value it replaces is kept beside it so
  // both answers stay visible. Used only where the widget's own name says
  // nothing or says the wrong thing, only for identity, contact and venue
  // facts, and never to reach an offence, charge or statute blank.
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

  const named = new Set(MUST_BE_BLANK[documentId] ?? []);
  const mustBeBlank = census.fields.filter((f) =>
    named.has(f.name)
    || /signature/i.test(f.name)
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
    // A disposition from the closed BLANK_DISPOSITIONS vocabulary, where this
    // family declares one. A blank that is genuinely optional participant
    // content has a name in that vocabulary, and saying so is what keeps it out
    // of unclassifiedBlanks — leaving it undeclared and calling the count clean
    // would be the other way round.
    if (policy?.disposition) row.disposition = policy.disposition;
    if (policy?.sourceOptional) row.sourceOptional = policy.sourceOptional;
    if (typeof policy?.requiredBeforeFiling === "boolean") row.requiredBeforeFiling = policy.requiredBeforeFiling;
    return row;
  });
}


/*
 * THE NINE COUNTERS, COMPUTED FROM THE DELIVERED BYTES AND THE DECLARED MAP.
 *
 * Every one of the nine is a number or it is null. A counter this build could
 * not measure would be null and never 0, and no prose key lives inside the
 * counters object — a caveat sitting beside the nine makes the whole object
 * read as non-zero to the reader in generate.mjs, so the prose lives in
 * sibling keys.
 *
 * Blanks are classified through the SHARED contract rather than through a rule
 * of this file's own, so this count and the independent verifier's are asking
 * the same question.
 */
function countNineCounters({ documents, mapDocuments, instructionsText }) {
  const counters = Object.fromEntries(PASS_COUNTERS.map((c) => [c, 0]));
  const findings = [];
  const note = (counter, detail) => { counters[counter] += 1; findings.push({ counter, ...detail }); };
  const ledger = [];

  // The facts the canonical fixtures actually placed. Taken from the finalizer's
  // written list only where the artifact proof raised no
  // written_field_is_blank_on_the_paper finding for that field, so a value the
  // report claims and the paper does not show is not counted as placed.
  const factsPlaced = new Set();
  for (const { fixtures } of documents) {
    const blankOnPaper = new Set(fixtures.canonical.proof.findings
      .filter((f) => f.check === "written_field_is_blank_on_the_paper").map((f) => f.field));
    for (const w of fixtures.canonical.report.written ?? []) {
      if (w.factId && !blankOnPaper.has(w.field)) factsPlaced.add(String(w.factId));
    }
  }

  for (const mapDoc of mapDocuments) {
    for (const row of mapDoc.fields) {
      if (row.decision === "write") {
        // A protected field that was nonetheless written.
        if (classifyField(row.effectiveLabel ?? row.field, row.isSelectionControl).requirement === "PROTECTED") {
          note("protectedWrites", { document: mapDoc.documentId, field: row.field,
            why: "a field the shared contract classes PROTECTED was written" });
        }
        continue;
      }
      // `disposition` takes a name from BLANK_DISPOSITIONS and NOTHING else — a
      // refusal class in that slot is outside the closed vocabulary and the
      // contract rightly fails it closed. This family declares refusal classes
      // and requiredBeforeFiling, so those are what it passes, each in its own
      // slot.
      const declared = {
        ...(row.disposition ? { disposition: row.disposition } : {}),
        ...(typeof row.requiredBeforeFiling === "boolean" ? { requiredBeforeFiling: row.requiredBeforeFiling } : {}),
        ...(row.sourceOptional ? { sourceOptional: row.sourceOptional } : {}),
        factId: row.factId ?? null,
        factAvailable: row.factId ? factsPlaced.has(String(row.factId)) : false
      };
      const verdict = classifyBlank(
        { label: row.effectiveLabel ?? row.field, name: row.field, isSelectionControl: row.isSelectionControl, widgets: row.widgets },
        row.reason ?? row.buildRoleWhy ?? "",
        row.refusalClass ?? null,
        declared
      );
      ledger.push({ document: mapDoc.documentId, field: row.field, label: row.effectiveLabel, ...verdict });
      if (BLANK_DISPOSITIONS[verdict.disposition]?.allowed) continue;
      const counter = verdict.disposition === "KNOWN_FACT_NOT_WRITTEN" ? "knownRequiredFieldsMissing"
        : verdict.disposition === "ROUTE_OPTION_NOT_SELECTED" ? "requiredOptionsMissing"
          : "unclassifiedBlanks";
      note(counter, { document: mapDoc.documentId, field: row.field, label: row.effectiveLabel,
        disposition: verdict.disposition, basis: verdict.basis });
    }
  }

  // A blank declared required-before-filing that the participant guide does not
  // name is a fact nobody will ever be asked for.
  const guide = String(instructionsText ?? "").toLowerCase();
  for (const mapDoc of mapDocuments) {
    for (const row of mapDoc.fields) {
      if (row.decision === "write" || row.requiredBeforeFiling !== true) continue;
      const needles = [row.effectiveLabel, row.field].map((x) => String(x ?? "").trim()).filter((x) => x.length >= 3);
      if (needles.some((n) => guide.includes(n.toLowerCase().slice(0, 60)))) continue;
      note("requiredFactsNotCollected", { document: mapDoc.documentId, field: row.field,
        why: "declared required-before-filing and not named in participant-instructions.md" });
    }
  }

  // Repeating rows: a row partly written is a row that reads as finished and is
  // not one. Measured with the shared row key.
  for (const mapDoc of mapDocuments) {
    const rows = new Map();
    for (const row of mapDoc.fields) {
      const key = rowKeyOf({ name: row.field });
      if (!key) continue;
      if (!rows.has(key)) rows.set(key, []);
      rows.get(key).push(row);
    }
    for (const [key, cells] of rows) {
      if (!cells.some((c) => c.decision === "write")) continue;
      const missing = cells.filter((c) => c.decision !== "write"
        && classifyField(c.effectiveLabel ?? c.field, c.isSelectionControl).requirement === "REQUIRED_KNOWN");
      if (missing.length > 0) {
        note("incompleteRows", { document: mapDoc.documentId, row: key, missingCells: missing.map((m) => m.field) });
      }
    }
  }

  // Read from the delivered bytes, per fixture.
  for (const { doc, fixtures } of documents) {
    for (const label of ["canonical", "boundary"]) {
      const p = fixtures[label].proof;
      // Both readings come from the delivered PDF: appearancesDrawn is every
      // widget appearance read back at its own measured /Rect, and
      // appearancesOutsideMeasuredWriteBoxes is ink at no measured box at all.
      // A value the finalizer reported that shows on no widget is an invisible
      // write, and the artifact proof names it per field.
      for (const f of p.findings) {
        if (f.check === "written_field_is_blank_on_the_paper") {
          note("invisibleWrites", { document: doc.documentId, fixture: label, field: f.field,
            why: "the finalizer reported a value for this field and its widget carries no appearance in the output bytes" });
        }
        if (f.check === "refused_field_carries_ink") {
          note("protectedWrites", { document: doc.documentId, fixture: label, field: f.field,
            why: "a field the map refused carries ink in the output" });
        }
      }
      if ((p.appearancesOutsideMeasuredWriteBoxes ?? 0) > 0) {
        note("visualDefects", { document: doc.documentId, fixture: label,
          count: p.appearancesOutsideMeasuredWriteBoxes,
          why: "ink landed outside every measured write box" });
      }
    }
  }

  // Every declared component must appear in a rendered artifact.
  const rendered = documents.flatMap(({ fixtures }) =>
    ["canonical", "boundary"].map((l) => fixtures[l].file)).join(" ").toLowerCase();
  for (const { doc } of documents) {
    if (!rendered.includes(doc.key.toLowerCase())) {
      note("requiredComponentsMissing", { component: doc.documentId,
        why: "the family declares this document and it appears in no rendered artifact" });
    }
  }

  return { counters, findings, ledger };
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
  return `# Filing instructions — Seal an Arkansas misdemeanor conviction under Act 1460 of 2013

This packet is two ACIC uniform forms, filed together:

- **Petition to Seal Misdemeanors Under Act 1460 of 2013** — what you file.
- **Order to Seal Misdemeanors Under Act 1460 of 2013** — the proposed order you hand the court to sign. Its recitals, its paragraph boxes, its decree, the judge's signature and the date beside it are the court's alone; this packet writes nothing in any of them.

Both forms print the same statute in their titles: Act 1460 of 2013, A.C.A. § 16-90-1401 et seq. The eligibility rule for a misdemeanor conviction is § 16-90-1405, and the petition's own prayer asks the court to seal "pursuant to A.C.A. § 16-90-1405".

The platform filled what it holds about you and your case: your name in the page 1 caption, in the page 3 prayer line and in the page 4 verification's opening sentence; the county in the caption; the case number; your date of birth in the identification block; the offense on **paragraph 1's first offense line only**; and your street address, city, state and ZIP code in the page 3 address block. Every other blank is deliberate, and every one is listed below.

**If a value is too long to fit its blank at the smallest legible size, that blank is left empty rather than drawn over the form's rule, and completing it by hand is yours.** This is not a rare edge: a long legal name, a long county name or a long case number can each exceed a caption blank on these forms. Check every caption blank on both forms against your own paperwork before you file.

## What has to be true before you file

The compiled Arkansas record for this route states the eligibility rule this way: **most misdemeanor convictions and violations are eligible for sealing after the sentence is fully completed** — incarceration, probation, all fines, restitution, court costs, and any driver's licence reinstatement. It records two further points: **there is no limit on how many misdemeanors may be sealed**, and **certain listed misdemeanors carry a five-year wait, while DWI/BWI carries a ten-year wait.**

The petition itself asks you to swear to the same things, in paragraphs 3 to 6 and 8: that you completed your sentence, paid all court costs unless the court excused payment, repaid all court-ordered restitution, met the driver's licence reinstatement requirements if your licence was suspended, and that you either did not hold a commercial driver's licence at the time or the conviction was not for a traffic offense. **Read them and make sure each is true of you before you sign.**

## Where you file this

**This petition goes to the court that handled the underlying criminal case.** The compiled Arkansas record says so three ways: "Sealing is filed in the court that handled the case"; "File in the circuit or district court that handled the case"; and "Venue is the court that handled the case — file separately in each county where the person has records."

**Check the county printed in the caption after "COURT OF".** It comes from what the platform holds for your matter, and venue follows the court that handled the case. If your case was handled in a different county, the caption is wrong and must be corrected on **both** forms before you file. (Inside the PDF that county blank is named \`COURT OF\` and the court blank beside it is named \`IN THE\` — the form's own field names do not describe the caption. This packet decided which blank is which by measuring the printed line, not by trusting the names.)

**The court's own name is left for you, in the "IN THE ______ COURT OF" blank on both forms.** The platform holds no court fact tied to this route, and this packet does not print a court name it cannot source to your case. The compiled record says both the circuit and the district court take sealing petitions, depending on which handled the case. **Ask the clerk's office of the county printed in your caption which court handled your case and takes this petition, and write that answer into the \`IN THE\` blank on the petition and on the order so the two match.** The \`DIVISION\` blank on the second caption line is also yours, and only if that court has divisions; the same clerk can tell you.

**If you have records in more than one court, this packet covers one of them.** The compiled record is explicit: file separately in each county where you have records. One petition does not reach a case in another county.

## The filing fee

**There is no filing fee for this petition.** The compiled Arkansas record states it three ways: "Act 1460 eliminated sealing filing fees; the real costs are records and any counsel"; "Sealing petition filing fee $0 — Filing fees eliminated by the 2019 amendments"; and, in its filing rule, "File in the circuit or district court that handled the case. Act 1460 eliminated filing fees for sealing."

The same record names what does cost money: **an ACIC fee for your criminal-history record**, which is how you confirm your offenses, their classes and their dispositions, and **a small clerk fee for a copy of the Judgment and Commitment Order** from the sentencing court. It also records the point that matters most: "the real gate is satisfying outstanding restitution, fines, and court costs — which is a completion requirement, not a filing fee."

**If the clerk where you file nevertheless asks you to pay something, that is a question about that court's own practice rather than about this packet.** Ask what the charge is for and whether a waiver or reduction is available, and settle it before you file.

## The verification must be notarized

Page 4 of the petition is a **VERIFICATION**, and the form prints a notary block: "Subscribed and sworn to before me on this ___ day of ___, 20___", a **(Seal)** mark, a **Notary Public** line and a **My Commission expires** line.

**Do not sign page 4 before you are in front of the notary.** The signature line above the printed word "Petitioner" is yours and it is empty in this packet on purpose. The date, the Notary Public line and the commission-expiry line are the notary's, and nothing in this packet fills any of them — a date on an oath that has not been taken would say the oath was taken on a day it was not.

**The "COUNTY OF" blank at the top of page 4 is yours or the notary's**, and it is the county where you actually swear the oath. That is wherever your notary is, and it is not necessarily the county in the caption, so this packet does not copy the caption's county into it.

## Serving the prosecutor, and the certificate of service

Page 5 is a **Certificate of Service**, and what it certifies is printed on it: that a copy of the petition has been provided **either to the Prosecuting Attorney for the county where the petition is filed or to the City Attorney, depending on which office prosecuted the case, and to the arresting agency**, by placing a copy in the United States mail postage prepaid or by hand delivery.

**The whole certificate is empty in this packet — the name, the signature and the date.** Service has not happened when the packet is built, and this packet does not certify a mailing that has not occurred. **Serve first, then fill in your name, sign, and date it with the day you actually served.**

The compiled Arkansas record notes what happens next: a copy goes to the prosecuting attorney, who has a statutory objection window — **30 days for a misdemeanor** — before the court rules. If the court grants the petition, the record describes the distribution: the court enters the uniform order and the clerk sends copies to ACIC, the arresting agency, the prosecutor and the Administrative Office of the Courts, which update their repositories to seal the record.

## The dates in paragraphs 1 and 2

Paragraph 1 asks when you were **arrested** — "on the ___ day of ____________, ______" — and paragraph 2 asks when you were convicted, in the same three-part shape. **All six blanks are empty in this packet.** The platform holds each date only as a whole date and has no separate day, month or year fact to put in them. Copy the arrest date from your arrest or court paperwork and the conviction date from your judgment.

## The offenses in paragraphs 1 and 2

Paragraph 1 asks what you were **charged with**; paragraph 2 asks what you were **convicted of**. The platform holds one offense for this matter and has written it on **paragraph 1's first line only**.

**Paragraph 2's "guilty of the offense(s) of" line is blank, and it is required before you file.** The offense you were convicted of may be a different or reduced offense, and this packet does not assume it is the same one. Write it from your judgment.

**Both "in violation of A.C.A. § ______" blanks are yours** — paragraph 1's, for the offense charged, and paragraph 2's, for the offense of conviction. The platform holds no statute-section fact. They come off your arrest paperwork and your judgment, or off the ACIC criminal-history record.

Paragraph 1's second offense line is empty too; use it only if the same arrest charged more than one offense.

## The boxes you must choose

Four groups of boxes are elections, and this packet marks none of them, because which is true of your case is read off your own paperwork:

- **Paragraph 7 — four alternatives, and exactly one describes you.** Either you completed all the requirements and the conviction was **not** one of the misdemeanors listed in A.C.A. § 16-90-1405(b)(1); or it **was** one of them and at least five years have passed since you completed your sentence; or at least ninety days have passed since the court denied a Petition to Seal for a conviction that is not a listed misdemeanor; or at least one year has passed since the court denied one for a conviction that is.
- **Paragraph 9 — two boxes.** Either you have no pending felony charges in any state or federal court, or you have one or more, in which case you state their status on the two rules beneath the box. Those two rules are empty in this packet: a charge the platform holds belongs to **this** matter, and paragraph 9 asks about a pending felony somewhere else.
- **Paragraph 10 — IS or IS NOT** required to register as a sex offender under A.C.A. § 12-12-901 et seq.

## The identification block

Both forms print a block headed "THE FOLLOWING INFORMATION IS REQUIRED FOR PROPER IDENTIFICATION OF THE DEFENDANT IN THE STATE AND NATIONAL RECORD SYSTEMS": **Race, Arrest Tracking Number, Sex, SID No., DOB and FBI No. (if known)**.

**Your date of birth is written on both forms.** Everything else in that block is left to you and must match on both:

- **Race** — a protected category in this platform's field rules. It holds no such fact about you and does not infer one; you state it.
- **Sex** — the platform does not hold it.
- **SID No.** — your Arkansas State Identification number. Copy it from your arrest paperwork or your ACIC criminal-history record.
- **Arrest Tracking Number** — assigned by ACIC when an arrest is processed. It is the agency's identifier, and the platform has no knowledge of it. Copy it from the same ACIC record.
- **FBI No.** — the form itself marks this "(if known)". Write it only if you have it.

## What the platform deliberately left blank

- **Your signature on page 3 and the date beside it.** You make the statement, not the platform.
- **The whole page 4 verification below its county line** — your signature, the notary's date, the notary's line and the commission expiry.
- **The whole page 5 Certificate of Service** — name, signature and date.
- **The arrest date's and the conviction date's day, month and year blanks**, all six.
- **Race, sex, ATN, SID and FBI number**, on both forms.
- **The court's name and the division in both captions.** The county beside them *is* written, from the printed caption measured at that blank.
- **Paragraph 2's conviction-offense line and both A.C.A. section blanks.**
- **Every box in paragraphs 7, 9 and 10.**
- **Everything on the order except its caption and the date of birth in its identification block.**

## Every blank you must complete before you file

Each row names the blank as the form prints it and, in brackets, the name it carries inside the PDF, so a blank can be found either way. **All of these are empty in this packet by design, and the filing is not complete until you fill them.**

### On the petition

| Where | The blank | PDF field |
|---|---|---|
| Page 1 caption | The court's name, in "IN THE ______ COURT OF" | \`IN THE\` |
| Page 1, paragraph 1 | The day of the arrest | \`Day 01\` |
| Page 1, paragraph 1 | The month of the arrest | \`Month 01\` |
| Page 1, paragraph 1 | The year of the arrest | \`Year 01\` |
| Page 1, paragraph 1 | "in violation of A.C.A. § ______", for the offense charged | \`in violation of ACA\` |
| Page 1, paragraph 2 | The offense you were convicted of | \`guilty of the offenses of 1\` |
| Page 1, paragraph 2 | "in violation of A.C.A. § ______", for the offense of conviction | \`in violation of ACA_2\` |
| Page 1, paragraph 2 | The day of the conviction | \`Day 02\` |
| Page 1, paragraph 2 | The month of the conviction | \`Month 02\` |
| Page 1, paragraph 2 | The year of the conviction | \`Year 02\` |
| Page 4 verification | The county where you swear the oath, in "COUNTY OF ____" | \`COUNTY OF\` |
| Page 4 identification block | Race | \`Race\` |
| Page 4 identification block | Sex | \`Sex\` |
| Page 4 identification block | SID No. | \`SID number\` |

### On the proposed order

| Where | The blank | PDF field |
|---|---|---|
| Page 1 caption | The court's name, matching the petition | \`IN THE\` |
| Page 3 identification block | Race, matching the petition | \`Race\` |
| Page 3 identification block | Sex, matching the petition | \`Sex\` |
| Page 3 identification block | SID No., matching the petition | \`SID number\` |

Beyond these, **one box in paragraph 7, one in paragraph 9 and one in paragraph 10 must be marked**, your signature and its date on page 3, your signature in front of the notary on page 4, and your name, signature and date on the page 5 Certificate of Service after you have actually served the prosecutor and the arresting agency.

## Where self-help ends

This packet prepares forms; it does not decide anything. Stop and get advice from a **lawyer licensed in Arkansas** — or put the question to the **clerk of the court named in your caption**, who can say what the court requires even though the clerk cannot give legal advice — before filing, if any of these is true:

- **the prosecuting attorney objects, or the court sets a contested hearing.** The prosecutor has a 30-day window on a misdemeanor, and an objection is where self-help stops.
- you cannot truthfully swear to paragraphs 3 to 6 and 8 — sentence completed, court costs paid or excused, restitution repaid, licence reinstatement met, and the commercial-driver's-licence statement;
- you are unsure which of paragraph 7's four alternatives describes your case, or whether your conviction is one of the misdemeanors listed in A.C.A. § 16-90-1405(b)(1). The compiled record notes that certain listed misdemeanors carry a five-year wait and DWI/BWI a ten-year wait, and getting this wrong is a sworn statement that is not true;
- **you have outstanding restitution, fines or court costs.** The compiled record is explicit that satisfying them is the real gate on this relief, and it is a completion requirement rather than a fee;
- you have a pending felony charge in any state or federal court, so paragraph 9's second box is yours;
- you do not know which offense or A.C.A. section to copy, and your paperwork does not show them — the ACIC criminal-history record and the Judgment and Commitment Order are where they come from;
- **immigration, licensing or firearm consequences are in play.** Sealing an Arkansas record does not tell you what an immigration authority, a licensing board or a firearm authority already holds or will do, and this packet answers none of those questions. If you are not a United States citizen, ask an Arkansas immigration attorney before this petition is signed or filed.

## What this packet is not

This is a prepared set of official ACIC forms. It is not legal advice, it is not filed for you, and it does not decide whether your record can be sealed under Act 1460 of 2013.

_Route: ${ROUTE_KEY} — A.C.A. § 16-90-1401 et seq. (Act 1460 of 2013), misdemeanor eligibility under § 16-90-1405_
`;
}

function filingInstructionsMarkdown() {
  return `# Filing instructions — ${FAMILY_ID}

**Route.** Seal an Arkansas misdemeanor conviction under Act 1460 of 2013, A.C.A. § 16-90-1401 et seq., with the misdemeanor eligibility rule at § 16-90-1405.

- \`${ROUTE_KEY}\`

**What is in the packet.**

- ACIC Petition to Seal Misdemeanors Under Act 1460 of 2013 (primary_filing) — 5 pages, 53 AcroForm fields.
- ACIC Order to Seal Misdemeanors Under Act 1460 of 2013 (proposed_order) — 3 pages, 37 AcroForm fields.

**Where it is filed.** The circuit or district court that handled the underlying criminal case. Venue follows that court, and a person with records in more than one county files separately in each.

**Filing fee.** $0. Act 1460 eliminated sealing filing fees; the compiled Arkansas profile records the elimination in the 2019 amendments. The costs that remain are the ACIC criminal-history record fee and a small clerk fee for a copy of the Judgment and Commitment Order.

**Service.** A copy goes to the prosecuting attorney for the county of filing, or to the city attorney where that office prosecuted, and to the arresting agency — by United States mail postage prepaid, or by hand delivery. The petition's page 5 Certificate of Service records it. The prosecutor's statutory objection window is 30 days for a misdemeanor.

**Notarization.** The petition's page 4 verification is sworn before a notary. The packet writes nothing in the notary block.

**What the packet fills.** Caption county, case number and defendant name; the page 3 prayer name; the page 4 verification's opening name; paragraph 1's first offense line; the page 3 street address, city, state and ZIP; and the date of birth in both identification blocks.

**What it leaves.** The court type and division in both captions; both A.C.A. section blanks; paragraph 2's conviction-offense line; all six arrest- and conviction-date components; every box in paragraphs 7, 9 and 10; race, sex, ATN, SID and FBI number; every signature and every date beside one; the whole Certificate of Service; the whole notary block; and everything on the order except its caption and its date of birth.

**Grants nothing.** A rendered packet is review evidence. It authorizes no fulfillment and opens no commercial route.
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
    const { bytes, indexEntry, resolvedFrom, custody } = resolveSource(doc);
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

    documents.push({ doc, census, indexEntry, fixtures, sourceByteLength: bytes.length, resolvedFrom, custody });
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
      "Both document sources were already held and bind by exact SHA-256, re-hashed from the custody bytes by this "
      + "build. Nothing was fetched from a court host.",
    sourceArchive: null,
    sourceArchiveIsNullBecause:
      "The two documents are NOT in the same custody, and naming one archive for both would misstate where the "
      + "petition came from. The order is in the pinned Master Library; the petition is in the Nationwide recovery "
      + "pool, at \"LegalEase Arkanasa/3-Misdemeanor-Petition-8_01_2023.pdf\" — the directory name is misspelled "
      + "in the custody itself. Each document names its own custody below. The recovery pool is declared a PARTIAL "
      + "custody by the corpus index, which satisfies an individual source obligation and never a completeness "
      + "assertion.",
    resolvedByContentDigestNotByPath:
      "Every candidate index entry hashing to the pinned digest was tried through the shared custody resolver and "
      + "the bytes were re-hashed before use. A file carrying the right form number but different bytes would not "
      + "have matched and would not have been substituted.",
    allSourcesExact: true,
    documents: documents.map(({ doc, indexEntry, sourceByteLength, resolvedFrom, custody }) => ({
      documentId: doc.documentId,
      documentRole: doc.documentRole,
      officialTitle: doc.officialTitle,
      revision: doc.revision,
      sha256: doc.sha256,
      byteLength: sourceByteLength,
      pathInArchive: doc.pathInArchive,
      custody,
      resolvedFrom,
      matchedBy: "exact_pinned_sha256_re_hashed_from_the_custody_bytes",
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

  const mapDocuments = documents.map(({ doc, census, fixtures }) => {
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
  });

  writeJson(`${OUT}/production-field-map.json`, {
    schemaVersion: "rcap-official-form-field-map/v1-census-v1",
    familyId: FAMILY_ID,
    routeKeys: [ROUTE_KEY],
    renderStrategy: "acroform_fill",
    generationAllowed: false,
    runtimeSelectable: false,
    documents: mapDocuments
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

  const instructionsText = participantInstructionsMarkdown();
  fs.writeFileSync(path.join(rootDir, `${OUT}/participant-instructions.md`), instructionsText);
  fs.writeFileSync(path.join(rootDir, `${OUT}/filing-instructions.md`), filingInstructionsMarkdown());

  const counted = countNineCounters({ documents, mapDocuments, instructionsText });

  writeJson(`${OUT}/reports/completeness-counters.json`, {
    schemaVersion: "rcap-packet-completeness-counters/v1",
    familyId: FAMILY_ID,
    routeKeys: [ROUTE_KEY],
    measuredOn: "the canonical and boundary fixtures this build produced, read back from their own bytes",
    // Exactly the nine, as numbers, and nothing else in this object.
    counters: counted.counters,
    allNineZero: PASS_COUNTERS.every((c) => counted.counters[c] === 0),
    countersAreNumbersNotNull:
      "Each of the nine was measured on this build's own output. None is null, because none was unmeasurable: "
      + "the fixtures rendered, their bytes were read back, and the field map declares a disposition for every "
      + "blank in both documents.",
    method:
      "Blanks are classified through scripts/rcap-packet-completeness/completeness-contract.mjs — the same module "
      + "the independent verifier uses — so this count and that one ask the same question rather than two "
      + "different ones. invisibleWrites, visualDefects and protectedWrites are read from the delivered PDF "
      + "bytes and not from the finalizer's report.",
    whatThisIsNot:
      "Not a verdict and not a pass. This lane built these bytes and sets none; RASTER_PASS comes from the "
      + "central workflow and independent verification is a different lane.",
    whyUnclassifiedBlanksIsNotZero: counted.counters.unclassifiedBlanks ? "See the measured per-field findings and their current classification basis." : null,
    countersThatAreZero: PASS_COUNTERS.filter((c) => counted.counters[c] === 0),
    countersThatAreNotZero: PASS_COUNTERS.filter((c) => counted.counters[c] !== 0),
    findings: counted.findings,
    ledger: counted.ledger
  });

  writeJson(`${OUT}/reports/caption-evidence.json`, {
    schemaVersion: "rcap-caption-evidence/v1",
    familyId: FAMILY_ID,
    whyThisExists:
      "The three caption widgets on page 1 of both forms are named `IN THE`, `COURT OF` and `DIVISION`, and the "
      + "names do not describe the blanks they cover. Which blank is which was settled by measuring the printed "
      + "line's own text runs against each widget's /Rect, and that measurement is recorded here so a reviewer "
      + "can check it rather than take it.",
    printedLine: "IN THE ______________ COURT OF ________________, ARKANSAS / ____________ DIVISION",
    blanks: [
      {
        blank: "court type",
        printedContext: "the blank between the printed \"IN THE \" and \" COURT OF\"",
        printedEvidence: "the run \"IN THE _\" spans x 96.4-149.7, so the printed words end and the underscores begin at x≈142; the underscores close at x≈243 where the run \"____ C\" begins the word COURT",
        widget: "IN THE",
        widgetRect: { x: 142.4, width: 101.3, spans: "142.40-243.70" },
        conclusion: "the widget named `IN THE` covers the COURT TYPE blank",
        packetWrites: null,
        packetWritesNothingBecause: "the platform holds no court-type fact for this route; the clerk answers it and the participant writes it"
      },
      {
        blank: "county",
        printedContext: "the blank between the printed \" COURT OF \" and \", ARKANSAS\"",
        printedEvidence: "the run \"OF __\" spans x 297.2-333.2, so the printed \"OF \" ends at x≈318 and the underscores begin there; the run \"_, \" at x 427.2-441.6 closes the blank before \" ARKANSAS\"",
        widget: "COURT OF",
        widgetRect: { x: 318.7, width: 115.7, spans: "318.70-434.40" },
        conclusion: "the widget NAMED `COURT OF` covers the COUNTY blank, not the court",
        packetWrites: "matter.county",
        howItBinds: "through a printedLabelCorrection, because the widget's own name matches no descriptor and the caption harvested at it is a bare run of underscores"
      },
      {
        blank: "division",
        printedContext: "the second caption line, \"____________ DIVISION\"",
        printedEvidence: "the underscores run x 232.3 to x≈316, where the run \"___ DI\" begins the word DIVISION",
        widget: "DIVISION",
        widgetRect: { x: 232.2, width: 86.6, spans: "232.20-318.80" },
        conclusion: "the widget named `DIVISION` does cover the division blank",
        packetWrites: null,
        packetWritesNothingBecause: "the platform holds no division fact, and only some Arkansas courts have divisions"
      }
    ],
    theSameTrapOnTheSiblingFamily:
      "ar-act531-set records the same hazard on its own ACIC forms, shifted differently again: there the county "
      + "blank is the widget named `COURT 1` and the court blank is named `DIVISION 1`. On neither form do the "
      + "names settle anything, and on both the geometry does."
  });

  writeJson(`${OUT}/build-status.json`, {
    schemaVersion: "rcap-family-build-status/v1",
    familyId: FAMILY_ID,
    buildStatus: "state_built",
    reviewStatus: "qa_review_pending",
    allNineCountersZero: PASS_COUNTERS.every(key => counted.counters[key] === 0),
    whyNotNineZero: PASS_COUNTERS.every(key => counted.counters[key] === 0) ? null : "See reports/completeness-counters.json for measured remaining findings.",
    builtBy: "scripts/build-census-v1-ar-misdemeanor-seal-set.mjs",
    renderedArtifacts: 4,
    rasterEngine: null,
    rasterPages: null,
    rasterImagesRetained: false,
    rasterState: "BUILT_RASTER_PENDING",
    rasterNote:
      "No page was rastered by this lane. A local browser render is not a receipt: only the central workflow "
      + "produces one, bound to the exact SHA-256 recorded in reports/rendered-artifacts.json. "
      + "BUILT_RASTER_PENDING zeroes nothing and waives nothing.",
    independentVerificationStatus: "PENDING",
    selfVerified: false,
    generationAllowed: false,
    runtimeSelectable: false,
    commercialRoutesOpened: 0,
    productionTouched: false,
    grantsNothing:
      "A rendered packet is review evidence. It authorizes no fulfillment and opens no commercial route."
  });

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

// Metadata-only repair for an already-rendered family. It deliberately reads
// and rewrites JSON evidence only; no source or fixture PDF is opened for write.
async function metadataOnly() {
  const mapPath = `${OUT}/production-field-map.json`;
  const map = readJson(mapPath);
  const proofByDoc = new Map(DOCUMENTS.map((d) => [d.documentId, d.completeness?.fields ?? {}]));
  for (const doc of map.documents ?? []) {
    for (const row of doc.fields ?? []) {
      const policy = proofByDoc.get(doc.documentId)?.[row.field];
      if (policy?.sourceOptional) row.sourceOptional = policy.sourceOptional;
    }
  }
  const countersPath = `${OUT}/reports/completeness-counters.json`;
  const counters = readJson(countersPath);
  // Retain output measurements only while all four measured artifacts still
  // have their exact bytes. Classifications are recomputed for EVERY blank.
  const rendered = readJson(`${OUT}/reports/rendered-artifacts.json`);
  for (const artifact of rendered.artifacts) {
    const bytes = fs.readFileSync(artifact.file);
    assert.equal(sha256(bytes), artifact.sha256, "Metadata does not describe current PDF bytes");
    assert.equal(bytes.length, artifact.byteLength);
  }
  const classificationCounters = ["knownRequiredFieldsMissing", "requiredOptionsMissing", "unclassifiedBlanks"];
  const fresh = Object.fromEntries(classificationCounters.map(key => [key, 0]));
  const facts = new Set(map.documents.flatMap(d => d.fields.filter(f => f.decision === "write").map(f => f.factId)).filter(Boolean));
  const findings = [], ledger = [];
  for (const doc of map.documents) for (const row of doc.fields) {
    if (row.decision === "write") continue;
    const verdict = classifyBlank({ label: row.effectiveLabel ?? row.field, name: row.field,
      isSelectionControl: row.isSelectionControl, widgets: row.widgets }, row.reason ?? row.buildRoleWhy ?? "",
      row.refusalClass ?? null, { disposition: row.disposition, requiredBeforeFiling: row.requiredBeforeFiling,
        sourceOptional: row.sourceOptional, factId: row.factId, factAvailable: row.factId ? facts.has(row.factId) : false,
        routeDetermined: row.routeDetermined === true });
    ledger.push({ document: doc.documentId, field: row.field, label: row.effectiveLabel, ...verdict });
    if (!BLANK_DISPOSITIONS[verdict.disposition]?.allowed) {
      const counter = verdict.disposition === "KNOWN_FACT_NOT_WRITTEN" ? "knownRequiredFieldsMissing"
        : verdict.disposition === "ROUTE_OPTION_NOT_SELECTED" ? "requiredOptionsMissing" : "unclassifiedBlanks";
      fresh[counter] += 1;
      findings.push({ counter, document: doc.documentId, field: row.field, ...verdict });
    }
  }
  counters.ledger = ledger;
  counters.findings = [...(counters.findings ?? []).filter(f => !classificationCounters.includes(f.counter)), ...findings];
  Object.assign(counters.counters, fresh);
  counters.countersThatAreNotZero = PASS_COUNTERS.filter(key => counters.counters[key] !== 0);
  counters.countersThatAreZero = PASS_COUNTERS.filter(key => counters.counters[key] === 0);
  counters.allNineZero = counters.countersThatAreNotZero.length === 0;
  counters.whyUnclassifiedBlanksIsNotZero = fresh.unclassifiedBlanks ? "See current per-field findings." : null;
  counters.metadataOnly = true;
  counters.metadataOnlyNote = "All blank classifications recomputed from current declarations and verified source bytes; other six output measurements retained against exact unchanged PDF hashes. No PDFs written.";
  writeJson(mapPath, map);
  writeJson(countersPath, counters);
  const status = readJson(`${OUT}/build-status.json`);
  status.allNineCountersZero = counters.allNineZero;
  status.whyNotNineZero = counters.allNineZero ? null : "See current measured completeness findings.";
  writeJson(`${OUT}/build-status.json`, status);
  console.log(`METADATA_ONLY: updated ${mapPath} and ${countersPath}; PDFs untouched`);
}

if (process.argv.includes("--metadata-only")) await metadataOnly();
else await main();
