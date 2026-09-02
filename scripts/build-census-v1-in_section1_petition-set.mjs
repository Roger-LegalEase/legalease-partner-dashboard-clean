#!/usr/bin/env node
// Route-obligation census v1 — packet family `in_section1_petition-set`.
//
//   node scripts/build-census-v1-in_section1_petition-set.mjs
//
// Indiana, expunging the records of a case that did not end in a conviction —
// an arrest, a criminal charge or a juvenile delinquency allegation — under
// I.C. § 35-38-9-1. TWO routes:
// `obligation:track-pathway:IN:in_section1_petition:non-conviction-arrest-or-criminal-charge-expungement`
// and
// `obligation:track-pathway:IN:in_section1_petition:juvenile-allegation-expungement`.
// One bound binary carrying five documents: the Coalition for Court Access's
// Section 1 non-conviction expungement bundle.
//
// It binds the same five source ids, at the same path and the same SHA-256, as
// in_arrest_no_charges-set. The two families are two packet sets over one
// published bundle; what differs is the route, the eligibility the participant
// must satisfy and therefore the instructions, not the document.
//
// This is not a renderer. Every decision about what may be written is made by
// scripts/rcap-official-forms/rcap-field-semantics.mjs and every byte is
// written by finalizeOfficialForm; this file supplies the family's ROLE
// classification, its explicit mappings and its printed-label corrections, and
// then proves the result from the artifact bytes rather than from its report.
//
// THIS PACKET IS INCOMPLETE, AND THE SOURCE SAYS SO ITSELF. READ THIS FIRST.
//
// Three of the bundle's fifteen pages are placeholders. Page 5, inside the
// petition, prints "Take out this page and insert your non-conviction Facts
// pages (from the Non Conviction Insert Forms)". Pages 10 and 11, inside the
// proposed order, print the same instruction for the Findings pages and the
// Exhibit pages. Those insert forms are a separate Coalition for Court Access
// product; no source bound to this family supplies them, and no record in this
// repository holds them.
//
// The consequence is not cosmetic. Without the Facts pages the petition alleges
// nothing about the arrest it asks to have expunged. Without the Findings pages
// the proposed order gives the court nothing to find. Without the Exhibit pages
// there is no Exhibit A, and the order's own paragraph 1(a) says Exhibit A
// carries "all information necessary to identify particular agency records that
// are to be expunged pursuant to this Order" as I.C. § 35-38-9-1(g) requires.
//
// This family is therefore built with an OPEN COMPONENT FINDING. The nine
// completeness counters measure the blanks on the pages that ARE here; they
// cannot see a page that is not. The gap is recorded three ways so it cannot be
// missed: in `missingCompanionForms` on the field map, in
// reports/missing-companion-forms.json, and in the first section of
// participant-instructions.md, which tells the participant not to file without
// them and names where they are published — www.indianalegalhelp.org, printed
// in the footer of every page of this bundle.
//
// HOW LITTLE OF THIS BUNDLE IS FILLABLE AT ALL
//
// Of fifteen pages, only the two-page Appearance carries form boxes for the
// participant's own details. The petition's caption, its "Comes now the
// Petitioner ______" line and its paragraph 1 full-name blank carry no widgets;
// nor does the proposed order's caption; nor do the Confidential Information
// Form's cause-number and name lines. So this build writes five values, all on
// the Appearance, and the participant instructions say plainly that the caption
// must be copied by hand onto every other document.
//
// FIVE BLANKS THE SHARED BINDER WOULD HAVE FILLED WRONG
//
//   * `PetDLorStateID#` (page 3) binds `participant.state`: the canonical
//     fixture would have printed "XX" as a driver licence number.
//   * `PetitionerAliases` (page 9) binds `participant.full_legal_name` into the
//     proposed order's finding that the petitioner "has used the following
//     other names or aliases" — asserting they have used their own name as an
//     alias.
//   * `RelatedCriminalCauseNumbers` (page 9) binds `matter.case_number` under a
//     caption heading asking for the cause numbers of OTHER, related cases.
//   * `AppellateCauseNumbers` (page 12) binds `matter.case_number` too, into a
//     blank asking for appellate cause numbers issued by a different court.
//   * `County`, `County1` through `County6` bind `matter.county` into the
//     proposed order's directive to a county sheriff's department and into six
//     certificate-of-service blanks naming a county prosecutor — none of which
//     this packet may complete before service has happened.
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


const FAMILY_ID = "in_section1_petition-set";
const OUT = "data/rcap-all50/overlays/census-v1/in/in-section1-petition-set--official-pdf-fill";
const ROUTE_KEYS = [
  "obligation:track-pathway:IN:in_section1_petition:non-conviction-arrest-or-criminal-charge-expungement",
  "obligation:track-pathway:IN:in_section1_petition:juvenile-allegation-expungement"
];
const ROUTE_KEY = ROUTE_KEYS[0];
const ROUTE_LABEL = "Clearing a case that did not end in a conviction";
const ROUTE_STATUTES = "I.C. § 35-38-9-1(d), (a), (e), (f) and (k)";
const ROUTE_ELIGIBILITY = `This packet covers **a case that did not end in a conviction** — an arrest, a criminal charge, or a juvenile delinquency allegation. The proposed order at the back records the scope in its own words: relief "for an arrest, criminal charge, or juvenile delinquency allegation that did not result in a conviction". Paragraph 3 of the petition swears that no charges are currently pending against you and that you are not in a pretrial diversion programme. The committed record for this packet sets the waiting period as **one year** from the arrest, charge or allegation, whichever is later — or, where a conviction was vacated, after the opinion vacating it becomes final — and records one exception: earlier filing is permitted **on the written agreement of the prosecuting attorney**.`

const CORPUS_INDEX = "data/rcap-all50/local-source-corpus-index.json";
const CORPUS_ROOT = "private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1";
const STALE_BLOCK = "data/rcap-grade-a/stale-artifact-block.json";

const fail = (message, detail = null) => {
  console.error(`build-census-v1-${FAMILY_ID}: ${message}`);
  if (detail) console.error(`  ${detail}`);
  console.error("  Nothing was written.");
  process.exit(1);
};

/** A group of blanks that share one reason, stated once and applied by name. */
const group = (fields, refusalClass, reason) =>
  Object.fromEntries(fields.map((f) => [f, { refusalClass, reason }]));
const requiredGroup = (entries) =>
  Object.fromEntries(entries.map(([f, reason]) => [f, { requiredBeforeFiling: true, reason }]));

// Every certificate-of-service widget in the bundle, by name. There are four
// certificates — one on the appearance form (page 2) and one each on the
// petition (page 6), Form ACR (page 7) and, on the appearance form, a second
// e-filing limb. All of them are completed AFTER service, by the person who
// served, and all of them ask for the county prosecutor's address, which this
// platform does not hold.
const CERTIFICATE_OF_SERVICE_FIELDS = [
  "Check Box6", "Check Box7", "Date1", "Date2", "County1", "County2", "ProsecutorAddress1",
  "Check Box11", "Check Box12", "Date3", "Date4", "County3", "County4", "ProsecutorAddress2",
  "Check Box13", "Check Box14", "Date5", "Date6", "County5", "County6", "ProsecutorAddress3"
];

// Everything below the proposed order's caption: its findings, its decree, its
// distribution directions and its proof of notice.
const PROPOSED_ORDER_FIELDS = [
  "RelatedCriminalCauseNumbers", "PetitionerAliases", "PetDOB",
  "County", "LEA1", "LEA2", "LEA3", "AppellateCauseNumbers", "Check Box8", "Check Box31",
  "Prosecutor", "ProsecutorMailingAddress", "MailAddressSheriff",
  "Check Box32", "CountyClerkAddress", "List-MailingAddresses_LEA", "Check Box33", "Check Box34"
];

// The related-cases table on the appearance form: six caption/cause-number
// pairs, for OTHER cases connected to this one.
const RELATED_CASE_FIELDS = [
  "Caption1", "Caption2", "Caption3", "Caption4", "Caption5", "Caption6",
  "CauseNumber1", "CauseNumber2", "CauseNumber3", "CauseNumber4", "CauseNumber5", "CauseNumber6"
];

const DOCUMENTS = [
  {
    key: "packet",
    documentId: "IN-CCA-SECTION1-NONCONVICTION-PETITION-AND-ORDER-BUNDLE",
    documentRole: "PETITION_ORDER_AND_ATTACHMENTS",
    officialTitle: "Coalition for Court Access — Section 1 non-conviction expungement petition, proposed order and attachments",
    revision: "SOURCE-2021",
    sha256: "b04f2941c91f903e8b8a1718ff4f9bd9120f3744c97354fd810c296f89d041c5",
    pathInArchive: "STATES/IN/02_PACKET_FORMS/IN__FORM__CCA-SECTION1-PETITION-ORDER__coalition-for-court-access-section-1-non-conviction-expungement-petition-and-order-bundle__SOURCE-2021__EN.pdf",
    ownership: "participant_completed",
    captionOnly: false,
    boundSourceIds: [
      "official-form:CCA-GF-0120-3016",
      "official-form:CCA Section 1 non-conviction expungement petition",
      "official-form:CCA-XP-0120-7002 Form ACR",
      "official-form:Confidential Information Form",
      "official-form:CCA Section 1 expungement order"
    ],
    parts: [
      { pages: "1-2", formNumber: "CCA-GF-0120-3016", what: "Appearance by Unrepresented Person in Expungement Matter", isAFiling: true },
      { pages: "3-6", formNumber: "CCA-XP-0120-7000", what: "Verified Petition for Expungement and Sealing under I.C. § 35-38-9-1", isAFiling: true },
      { pages: "7", formNumber: "CCA-XP-0120-7002", what: "Form ACR — Notice of Exclusion of Confidential Information from Public Access", isAFiling: true },
      { pages: "8", formNumber: "CCA Confidential Information Form", what: "Confidential Information Form (not a public record)", isAFiling: true },
      { pages: "9-15", formNumber: "CCA-XP-0120-7006", what: "Findings and Order granting the petition — the proposed order", isAFiling: true }
    ],

    printedLabelCorrections: {
      "PetDLorStateID#": {
        printedLabel: "Petitioner's driver license or state identification number",
        readFrom: "page 3, printed paragraph 2 at y=268-284: \"Petitioner's date of birth is ______; Petitioner's Social Security Number is XXX-XX-______; and Petitioner's driver license or state identification number is ______\"",
        measuredEvidence: "the widget occupies x 478.10-571.80 at y=268.20, the last blank on that line; the SSN-last-four widget sits to its left at x 98.40-169.10 on the same line",
        why: "The widget's own name ends in a hash and the shared binder matched participant.state on it, so the canonical fixture would have printed \"XX\" as a driver licence number. The correction names the blank; the role refusal below keeps it empty."
      },
      "PetitionerAliases": {
        printedLabel: "other names or aliases the Petitioner has used, in the proposed order's findings",
        readFrom: "page 9, the proposed order's finding 1: \"Petitioner's full name is ______, and Petitioner has used the following other names or aliases:\" followed by two rules",
        measuredEvidence: "the widget occupies x 72.00-570.00 at y=163.30 and is 32.3 points tall, spanning both alias rules",
        why: "The widget's name matched the shared binder's full-name descriptor, so the participant's own legal name would have been printed as an alias they have used. Refused by role."
      },
      "PetDOB": {
        printedLabel: "Petitioner's date of birth, in the proposed order's findings",
        readFrom: "page 9, the proposed order's finding 2: \"Petitioner's date of birth is ______; Petitioner's Social Security Number is ______; and Petitioner's driver's license number is ______.\"",
        measuredEvidence: "the widget occupies x 210.20-352.00 at y=141.10",
        why: "Named so the field map distinguishes the ORDER's finding from the PETITION's own paragraph 2, which carries different widgets on page 3."
      },
      "RelatedCriminalCauseNumbers": {
        printedLabel: "Related Criminal Cause Numbers, in the proposed order's caption",
        readFrom: "page 9, the caption block printed at y=630.2: \"Related Criminal Cause Numbers\" over four rules at y=616.4, 602.6, 588.8 and 575.0",
        measuredEvidence: "the widget occupies x 358.40-568.40 at y=569.20 and is 62.3 points tall, spanning all four rules",
        why: "Its name matched matter.case_number, so this matter's own cause number would have been printed under a heading asking for the cause numbers of OTHER, related criminal cases."
      },
      "AppellateCauseNumbers": {
        printedLabel: "appellate cause or case numbers, in the proposed order",
        readFrom: "page 12, the proposed order's directive: \"As to court records stored under the following appellate cause/case numbers:\" followed by two rules",
        measuredEvidence: "the widget occupies x 30.30-569.70 at y=245.30 and is 37.1 points tall, spanning both rules",
        why: "Its name matched matter.case_number, so a trial-court cause number would have been printed as an appellate one. An appellate cause number is a different number issued by a different court, and the platform holds none."
      },
      "PetFullSSN": {
        printedLabel: "Petitioner's full Social Security Number, on the Confidential Information Form",
        readFrom: "page 8, printed line: \"PETITIONER'S FULL SOCIAL SECURITY NUMBER: ______\"",
        measuredEvidence: "the widget occupies x 353.20-542.60 at y=591.40, to the right of that printed caption",
        why: "Named so the field map says which of the bundle's two Social Security blanks this is: the Confidential Information Form asks for the whole number, the petition's paragraph 2 asks for the last four digits only."
      },
      "PetSSN-Last4": {
        printedLabel: "last four digits of the Petitioner's Social Security Number, in the petition",
        readFrom: "page 3, printed paragraph 2: \"Petitioner's Social Security Number is XXX-XX-______\"",
        measuredEvidence: "the widget occupies x 98.40-169.10 at y=268.20, immediately after the printed \"XXX-XX-\"",
        why: "Named for the same reason as the Confidential Information Form's blank above."
      },
      "Address": {
        printedLabel: "Petitioner's current address, on the Appearance",
        readFrom: "page 1 of the Appearance by Unrepresented Person: \"2. My current address is:\"",
        measuredEvidence: "the widget occupies x 180.00-396.10 at y=430.30 and is 59 points tall — a multi-line box beneath that caption; the Email, Phone and Fax boxes sit below it",
        why: "Its harvested caption is \"Email address\", the caption of a line BELOW it, so the field map would have described the wrong blank. The binding is unchanged: the field's own name reaches the participant's street address."
      },
      "Fax": {
        printedLabel: "fax number, on the Appearance",
        readFrom: "page 1 of the Appearance: the printed \"Fax:\" line under \"Phone:\"",
        measuredEvidence: "the widget occupies x 180.00-396.10 at y=360.60, the lowest of the three contact boxes",
        why: "Named so the row says what it is; its harvested caption is the sentence about the Attorney General confidential address printed below it. The word \"Petitioner\" is deliberately NOT in the corrected label: a first attempt read \"Petitioner\'s fax number\", the shared binder matched its full-name descriptor on that word, and the participant\'s name was drawn into the fax box. The name-placement allowlist caught it and failed the build."
      },
      "DD-cap-CourtType": {
        printedLabel: "the type of court, in the Appearance caption",
        readFrom: "page 1 of the Appearance, printed caption: \"IN THE __________________ _________________ COURT\"",
        measuredEvidence: "the dropdown occupies x 404.10-509.10 at y=708.00, the second of the two caption blanks",
        why: "Named so the row says what it is. It is a dropdown rather than a text field, and the shared binder never writes a non-text widget."
      }
    },

    explicitMappings: {},

    unwritable: [
      { field: "PetDLorStateID#", class: "government_identifier",
        why: "The petitioner's driver licence or state identification number, in the petition's paragraph 2. The shared binder matched participant.state on the widget's name and would have printed \"XX\" as a licence number. The platform holds no licence number." },
      { field: "PetitionerAliases", class: "alias_list_not_held",
        why: "The proposed order's finding that the petitioner \"has used the following other names or aliases\". The shared binder would have written the participant's own legal name there, which asserts they have used it as an alias, and the platform holds no alias fact." },
      { field: "RelatedCriminalCauseNumbers", class: "other_matters_not_held",
        why: "The RELATED criminal cause numbers in the proposed order's caption — the cause numbers of other cases. The shared binder would have written this matter's own cause number under that heading." },
      { field: "AppellateCauseNumbers", class: "other_matters_not_held",
        why: "Appellate cause or case numbers in the proposed order. A different number issued by a different court; the shared binder would have written this matter's trial-court cause number there." },
      { field: "County", class: "court_ordered_agency_directive",
        why: "The county sheriff's department named in the proposed order's directive to remove criminal history information. It is the court's own order to an agency, and the shared binder would have written matter.county into it." },
      { field: "County1", class: "certificate_of_service_block", why: "The prosecutor's county in a certificate of service. Service has not happened, and the shared binder writes matter.county into it." },
      { field: "County2", class: "certificate_of_service_block", why: "The same, on the e-filing limb of the same certificate." },
      { field: "County3", class: "certificate_of_service_block", why: "The same, on the petition's certificate of service." },
      { field: "County4", class: "certificate_of_service_block", why: "The same, on the e-filing limb of the petition's certificate." },
      { field: "County5", class: "certificate_of_service_block", why: "The same, on Form ACR's certificate of service." },
      { field: "County6", class: "certificate_of_service_block", why: "The same, on the e-filing limb of Form ACR's certificate." },
      { field: "Fax", class: "fax_number_not_held",
        why: "The Appearance's fax line. The platform holds no fax number, and the corrected printed label must avoid the word \"Petitioner\" because the shared binder matches its full-name descriptor on it — a first attempt drew the participant\'s name into the fax box." },
      { field: "PetDOB", class: "proposed_order_finding",
        why: "The date of birth in the PROPOSED ORDER\'s finding 2. The order below its caption is the court\'s instrument and this packet writes nothing in it; the shared binder wrote participant.date_of_birth into the court\'s own finding." },
      ...["CauseNumber1", "CauseNumber2", "CauseNumber3", "CauseNumber4", "CauseNumber5", "CauseNumber6"].map((field) => ({
        field,
        class: "related_case_table_cell",
        why: "A cause-number cell of the Appearance\'s RELATED CASES table, which asks for the case numbers of OTHER cases connected to this one. The shared binder writes this matter\'s own cause number into row 1, so the participant would file an Appearance stating that this case is related to itself."
      }))
    ],

    completeness: {
      defaultBlank: null,
      fields: {
        ...requiredGroup([
          ["PetSSN-Last4", "The last four digits of the petitioner's Social Security Number, in the petition's paragraph 2. The platform holds no Social Security Number; the participant writes them before filing."],
          ["PetFullSSN", "The petitioner's FULL Social Security Number, on the Confidential Information Form. The platform holds no Social Security Number. This form is filed as a confidential document — the form's own words are \"ATTENTION CLERK: FOR SELF REPRESENTED LITIGANTS TREAT THIS FORM AS IF IT IS PRINTED ON GREEN PAPER. IF THIS DOCUMENT IS E-FILED, FILE THIS AS A CONFIDENTIAL DOCUMENT\" — and the number goes on it and nowhere else."],
          ["PetDLorStateID#", "The petitioner's driver licence or state identification number, in the petition's paragraph 2. The platform holds no licence or state-ID number; the participant writes it before filing."],
          ["DD-cap-CourtType", "The type of court in the Appearance's caption — the second blank in \"IN THE ______ ______ COURT\". The platform holds no court fact for this route, and the blank is a dropdown the shared binder never writes. The participant selects the court the case is filed in."],
          ["Fax", "The petitioner's fax number on the Appearance. The platform holds no fax number. Leave it blank if you have none."]
        ]),

        ...group(RELATED_CASE_FIELDS, null,
          "One cell of the Appearance's related-cases table, which asks for the caption and case number of OTHER cases related to this one. The platform holds this matter and does not know what else is related to it; the participant lists them if there are any, and the platform does not invent it."),

        ...group(CERTIFICATE_OF_SERVICE_FIELDS, "signature_or_date_participant_completion",
          "Part of a certificate of service. The bundle carries four of them — on the Appearance, on the petition and on Form ACR — and each certifies a date, a method and a county prosecutor's address. Service has not happened when this packet is produced, the platform holds no prosecutor's address, and a certificate completed before service certifies a delivery that did not occur."),

        ...group(PROPOSED_ORDER_FIELDS, "court_prosecutor_clerk_or_agency_owned",
          "Part of the proposed order below its caption: its findings about the petitioner, its decree, its directions to the Indiana State Police, the county sheriff, the prosecutor, the clerk and the listed law-enforcement agencies, and its proof of notice. The order is the court's instrument and this packet writes nothing in it."),

        "AdditionalInformation": { refusalClass: null,
          reason: "The Appearance's \"Additional information as required by local rule\" box. What a particular Indiana court requires by local rule is not a fact the platform holds, and the platform does not invent it." },

        "Check Box1": { refusalClass: "participant_sworn_narrative_or_legal_election",
          reason: "The Appearance's \"I will accept service at the above email address\" box. Whether to accept service by email is the participant's own choice." },
        "Check Box2": { refusalClass: "participant_sworn_narrative_or_legal_election",
          reason: "The Appearance's \"Attorney General confidential address\" box, available only to a participant who has used that address in a related case. The platform holds nothing about it." },
        "Check Box3": { refusalClass: "participant_sworn_narrative_or_legal_election",
          reason: "The Appearance's \"There are related cases: Yes\" box. Whether other cases are related to this one is the participant's own statement." },
        "Check Box4": { refusalClass: "participant_sworn_narrative_or_legal_election",
          reason: "The Appearance's \"There are related cases: No\" box, the other half of the same election." },
        "Check Box9": { refusalClass: "participant_sworn_narrative_or_legal_election",
          reason: "One of the two election boxes in the petition's WHEREFORE clause, choosing which orders under I.C. § 35-38-9-1(f) the petitioner asks the court to make. Which relief to request is the participant's own request." },
        "Check Box10": { refusalClass: "participant_sworn_narrative_or_legal_election",
          reason: "The other election box in the same WHEREFORE clause, on the same footing." }
      }
    },

    // Not a refusal and not a blank: a document this packet does not contain and
    // no bound source supplies. Recorded here because the bound source itself
    // demands it, in three places, in its own words.
    missingCompanionForms: [
      {
        namedBy: "the bound source's own printed pages",
        printedInstruction: "Take out this page and insert your non-conviction Facts pages (from the Non Conviction Insert Forms)",
        where: "page 5 of the bundle, inside the Verified Petition, between paragraph 3 and the WHEREFORE clause",
        whatIsMissing: "CCA Non Conviction Insert Forms — Facts pages",
        consequence: "The petition as delivered has no factual allegations about the arrest, charge or allegation being expunged. It cannot be filed as it stands."
      },
      {
        namedBy: "the bound source's own printed pages",
        printedInstruction: "Take out this page and insert your non-conviction Findings pages (from the Non Conviction Insert Forms)",
        where: "page 10 of the bundle, inside the proposed order, after finding 3",
        whatIsMissing: "CCA Non Conviction Insert Forms — Findings pages",
        consequence: "The proposed order has no findings for the court to adopt."
      },
      {
        namedBy: "the bound source's own printed pages",
        printedInstruction: "Take out this page and insert your non-conviction Exhibit pages (from the Non Conviction Insert Forms)",
        where: "page 11 of the bundle, inside the proposed order",
        whatIsMissing: "CCA Non Conviction Insert Forms — Exhibit pages",
        consequence: "Exhibit A, which the order's own paragraph 1(a) says carries \"all information necessary to identify particular agency records that are to be expunged pursuant to this Order\" as I.C. § 35-38-9-1(g) requires, is absent."
      }
    ],
    whereTheParticipantGetsThem: {
      printedOnEveryPageOfTheBundle: "www.indianalegalhelp.org",
      approvedBy: "the Coalition for Court Access",
      why: "Every page of this bundle carries that address in its own footer, beside \"Approved by the Coalition for Court Access\", so the participant is sent to the body that publishes the missing insert forms rather than to a search."
    }
  }
];

// The ONLY blanks in this family that may ever carry the participant's name.
const NAME_MAY_APPEAR_IN = {
  "IN-CCA-SECTION1-NONCONVICTION-PETITION-AND-ORDER-BUNDLE": [
    "cap-PetitionerFullName",  // the Appearance's caption
    "Email"                    // the petitioner's email, which contains their surname
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
// FILING_DESTINATION — held. The committed packet-set manifest records
//   filingDestination as "A circuit or superior court in the county where the
//   charges or allegation were filed, or where the arrest occurred if none were
//   filed", with the detail "Circuit or superior court in the county of filing
//   or arrest". Stated.
// FEE_AND_WAIVER — held, as an amount. The manifest's filingFee entry reads
//   "None." and "Section 1 petitions carry no filing fee"; feeWaiverTreatment
//   reads "Not applicable. There is no fee." Both are keyed to I.C. § 35-38-9-1
//   Section 1 petitions, which is this route, so amendment A3 is satisfied.
// SERVICE — held, and the two halves disagree in an important way, so both are
//   stated. The manifest records serviceRecipients as "The court serves the
//   prosecuting attorney" — the statutory position, I.C. § 35-38-9-1(f) — AND
//   "The CCA appearance form nonetheless carries a certificate of service to the
//   county prosecutor; follow the form." Its filing-destination detail repeats
//   the first: "The court serves a copy of the petition on the prosecuting
//   attorney under § 35-38-9-1(f)." The bundle carries FOUR certificates of
//   service, all naming the county prosecutor, which is why the record's second
//   sentence exists. Both are given below and the clerk is named for which
//   applies.
// SELF_HELP_STOP — held. The manifest records uncontestedHearingTreatment as
//   "The court sets a hearing", and its waiting-period entries carry the one-year
//   rule and the early-filing exception by written agreement of the prosecuting
//   attorney. Its contestedHearingOrOppositionHandoff is not_recorded for this
//   route, so no opposition rule is stated below; the stop is drawn instead from
//   what the bundle's own missing components make impossible, from the hearing,
//   and from the named authority.
// NOT FOUND — filingMethod, notarizationRequirements, filingDeadline,
//   serviceMethod, serviceTiming and postFilingInstructions are all not_recorded
//   in the manifest and the bundle prints none of them. Nothing below states any
//   of them.
function participantInstructionsMarkdown() {
  return `# Filing instructions — ${ROUTE_LABEL} (Indiana, I.C. § 35-38-9-1)

This packet is one PDF published by the Coalition for Court Access and approved for use in Indiana courts. It contains five documents:

| Pages | Form | What it is |
| --- | --- | --- |
| 1–2 | CCA-GF-0120-3016 | **Appearance by Unrepresented Person in Expungement Matter** |
| 3–6 | CCA-XP-0120-7000 | **Verified Petition** for expungement and sealing under I.C. § 35-38-9-1 |
| 7 | CCA-XP-0120-7002 | **Form ACR** — Notice of Exclusion of Confidential Information from Public Access |
| 8 | — | **Confidential Information Form** (not a public record) |
| 9–15 | CCA-XP-0120-7006 | **Findings and Order** granting the petition — the proposed order |

${ROUTE_ELIGIBILITY}

## Read this first: three pages of this packet are missing, and the packet says so itself

**This bundle is not a complete filing on its own, and it tells you so in its own words, three times.** Where the petition's factual allegations should be, page 5 prints:

> Take out this page and insert your non-conviction **Facts** pages (from the Non Conviction Insert Forms)

and inside the proposed order, pages 10 and 11 print:

> Take out this page and insert your non-conviction **Findings** pages (from the Non Conviction Insert Forms)
>
> Take out this page and insert your non-conviction **Exhibit** pages (from the Non Conviction Insert Forms)

**Those insert forms are not in this packet and LegalEase does not hold them.** Without the Facts pages the petition alleges nothing about the arrest, charge or allegation you want expunged. Without the Findings pages the proposed order gives the judge nothing to find. Without the Exhibit pages there is no Exhibit A — and the order's own paragraph 1(a) says Exhibit A is where "all information necessary to identify particular agency records that are to be expunged pursuant to this Order" goes, as I.C. § 35-38-9-1(g) requires.

**Get the Non Conviction Insert Forms from the body that publishes this packet.** Every page of this bundle carries the same footer: "Approved by the Coalition for Court Access — **www.indianalegalhelp.org**". That is where the insert forms are published, and it is printed on the paper in your hand.

**Do not file this packet without them.**

## What this packet filled in, and what it did not

**Almost all of this bundle is meant to be completed by hand, and this packet does not pretend otherwise.** Of its fifteen pages, only the Appearance on pages 1–2 carries form boxes for the participant's own details. The petition's caption, its "Comes now the Petitioner ______" line and its paragraph 1 full-name blank carry **no form boxes at all**; nor does the proposed order's caption; nor does the Confidential Information Form's cause number or name.

So this packet filled in, on the **Appearance** only: the county and your name in the caption, your current address, your email address and your phone number. **Everything else on all fifteen pages is yours to write**, and the tables below list what this packet deliberately left blank where a form box does exist.

**Copy the caption across every document.** The Appearance's caption is the model: the county, the court, the cause number and your name as Petitioner. The petition, Form ACR, the Confidential Information Form and the proposed order all carry the same caption and none of them has boxes for it.

## Where you file it

**File in a circuit or superior court in the county where the charges or allegation were filed — or, if no charges were ever filed, in the county where the arrest happened.** That is what the committed route record for this packet says, in those words.

**The county is already written in the Appearance's caption**, from what the platform holds for your matter. Check it against where the charges were filed, or where the arrest happened, and correct it before you file.

**Which court, and which type of court, is left for you.** The Appearance's caption has a dropdown for the court type and this packet does not choose it. **Ask the clerk's office of the county in the caption which court holds your case**, and select that.

## What it costs

**There is no filing fee.** The committed route record for this packet states it twice: the filing fee is "None.", and "Section 1 petitions carry no filing fee." On waiver it records "Not applicable. There is no fee."

Because there is no fee, there is nothing to apply to have waived. **If the clerk asks you to pay something to file this petition, ask that clerk what the charge is for** before you pay it.

## Who you serve, and how

**The statute says the court serves the prosecutor. The forms carry certificates of service anyway. Do both — that is, follow the forms.**

The committed route record for this packet states the statutory position: "The court serves the prosecuting attorney", under I.C. § 35-38-9-1(f). And then it states the practical one, in the same record: "The CCA appearance form nonetheless carries a certificate of service to the county prosecutor; **follow the form**."

**The bundle carries four certificates of service** — one on the Appearance, one on the petition, one on Form ACR, and an e-filing limb on each. Each offers two ways to certify: **by first-class U.S. mail, postage prepaid, or hand delivery** to the county prosecutor at an address you write in; **or** service **via the Indiana E-filing System**.

**This packet leaves every certificate of service completely blank**, including the county and the prosecutor's address. Service has not happened when the packet is produced, LegalEase does not hold the prosecutor's address, and a certificate signed before service certifies a delivery that did not occur. **Complete them after you have actually served, and not before.**

**No held record and no printed line states a deadline for service on this route.** **Ask the clerk of the court where you file** whether that court expects you to serve the prosecutor yourself and by when, and get the county prosecutor's mailing address from that clerk's office or from the prosecutor's own office.

## What you must do before you file

1. **Get the Non Conviction Insert Forms** — Facts, Findings and Exhibit pages — from **www.indianalegalhelp.org**, and put them in place of the three pages that tell you to. Nothing else in this list matters until this is done.
2. **Copy the caption onto every document**: the county, the court, the cause number and your name.
3. **Write your Social Security number where the packet asks for it, twice and differently.** The petition's paragraph 2 asks for the **last four digits only**, after the printed "XXX-XX-". The **Confidential Information Form** on page 8 asks for the **whole number** — and that form is the reason Form ACR exists. Its own printed words are "ATTENTION CLERK: FOR SELF REPRESENTED LITIGANTS TREAT THIS FORM AS IF IT IS PRINTED ON GREEN PAPER. IF THIS DOCUMENT IS E-FILED, FILE THIS AS A CONFIDENTIAL DOCUMENT." Put the full number nowhere else.
4. **Write your driver licence or state identification number** in the petition's paragraph 2.
5. **List any other names or aliases you have used**, in the petition's paragraph 1.
6. **Answer the Appearance's related-cases question**, and list any related captions and case numbers.
7. **Sign what you are asked to sign**: the Appearance, the petition's AFFIRMATION — "I affirm under penalties for perjury that the foregoing representations and statements are true and accurate" — and Form ACR. Every signature line in this bundle is left blank.
8. **Leave the proposed order alone below its caption.** Its findings, its decree, its directions to the Indiana State Police, the county sheriff and the other agencies, and its proof of notice are the court's.
9. **Serve the prosecutor and complete the certificates of service — after service, not before.**

## The items you must supply, where the form has a box for them

| Page | The blank on the form | What to write |
| --- | --- | --- |
| 1 | Appearance caption — the court type (a dropdown; inside the PDF, \`DD-cap-CourtType\`) | the court your case is in — ask the clerk of the county in the caption |
| 1 | Appearance — "Fax:" (\`Fax\`) | your fax number, or leave blank if you have none |
| 1 | Appearance — "I will accept service at the above email address" (\`Check Box1\`) | tick it if you want to be served by email |
| 1 | Appearance — "Attorney General confidential address" (\`Check Box2\`) | tick it only if you have used that address in a related case |
| 1 | Appearance — "There are related cases: Yes / No" (\`Check Box3\`, \`Check Box4\`) | tick the one that is true |
| 1–2 | Appearance — the related-cases table, six Caption and Case No. pairs | the caption and case number of each related case, if there are any |
| 2 | Appearance — "Additional information as required by local rule" (\`AdditionalInformation\`) | whatever the local rule of your court requires. Ask the clerk |
| 2 | Appearance — the certificate of service, both limbs | the date, the county, the prosecutor's address — **after you have served** |
| 3 | Petition ¶2 — "XXX-XX-______" (\`PetSSN-Last4\`) | the last four digits of your Social Security number |
| 3 | Petition ¶2 — driver licence or state ID number (\`PetDLorStateID#\`) | your driver licence or state identification number |
| 5 | Petition WHEREFORE — the two election boxes (\`Check Box9\`, \`Check Box10\`) | tick the relief you are asking the court to order |
| 6 | Petition — the certificate of service, both limbs | as on page 2, **after you have served** |
| 7 | Form ACR — the certificate of service, both limbs | as above, **after you have served** |
| 8 | Confidential Information Form — full Social Security Number (\`PetFullSSN\`) | your whole Social Security number. This form is filed as a confidential document |

## What the platform deliberately left blank

- **Every signature in the bundle, and every date beside one.** You make the statements; the petition's AFFIRMATION is made under penalties for perjury.
- **Every certificate of service, in full.** Four of them. Service has not happened, and the platform does not hold the county prosecutor's address.
- **Your Social Security number, in both places**, and your driver licence number. The platform holds neither.
- **Your aliases.** The shared field binder would have written your own legal name into the "other names or aliases" blank in the proposed order's findings, which asserts you have used your own name as an alias. It is refused for that reason.
- **The related criminal cause numbers and the appellate cause numbers** in the proposed order. Both would have received *this* matter's cause number, and both ask for other cases' numbers.
- **The whole of the proposed order below its caption**, which belongs to the court.

## Where self-help ends

This packet prepares official forms; it does not decide anything. Stop and get advice from a **lawyer licensed in Indiana**, or from the resources at **www.indianalegalhelp.org** — or put a procedural question to the **clerk of the court in the county in your caption**, who can say what the court requires even though the clerk cannot give legal advice — before filing, if any of these is true:

- **you cannot obtain the Non Conviction Insert Forms**, or you are not sure which of them your case needs. Without them this is not a filing, and no part of this packet supplies them;
- **there will be a hearing and you are not ready for one.** The committed record for this packet records that "The court sets a hearing" on this route;
- charges are currently pending against you, or you are participating in a pretrial diversion programme. Paragraph 3 of the petition swears that neither is true;
- **less than a year has passed.** The committed record records the waiting period as one year from the arrest, charge or allegation, whichever is later — and records one exception: early filing is permitted on the **written agreement of the prosecuting attorney**. Obtaining that agreement is not something this packet does;
- your case ended in a conviction. This packet is for an arrest, criminal charge or juvenile delinquency allegation that did **not** result in a conviction, and the proposed order says so on its face;
- you want appellate records sealed. The petition and the order both have a place for appellate cause numbers and this packet writes neither, because an appellate cause number is issued by a different court and the platform holds none.

## What this packet is not

This is a prepared copy of the Coalition for Court Access's own approved bundle, missing three sets of insert pages that the bundle itself directs you to add. It is not legal advice, it is not filed for you, and it does not decide whether your records can be expunged under I.C. § 35-38-9-1.

_Route${ROUTE_KEYS.length > 1 ? "s" : ""}: ${ROUTE_KEYS.join(" · ")} — ${ROUTE_STATUTES}_
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
        title: `IN ${doc.documentId}`
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
    jurisdiction: "IN",
    routeKeys: ROUTE_KEYS,
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
      boundSourceIds: doc.boundSourceIds ?? [],
      boundSourceIdsNote:
        "The route census binds five source ids to this ONE binary, all at the same path and the same SHA-256: "
        + "the Appearance, the Verified Petition, Form ACR, the Confidential Information Form and the proposed "
        + "Order are five documents inside a single published PDF. They are recorded here rather than as five "
        + "documents because the packet delivers one file.",
      parts: doc.parts ?? [],
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
    routeKeys: ROUTE_KEYS,
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
        missingCompanionForms: doc.missingCompanionForms ?? [],
        whereTheParticipantGetsThem: doc.whereTheParticipantGetsThem ?? null,
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

  writeJson(`${OUT}/reports/missing-companion-forms.json`, {
    schemaVersion: "rcap-missing-companion-forms/v1",
    familyId: FAMILY_ID,
    question: "Does the bound source name a document it requires and that no bound source supplies?",
    answer: "YES. Three sets of insert pages, named by the bound source on three of its own pages.",
    whyThisIsNotAComeleteneessCounter:
      "The nine packet-completeness counters measure the blanks on the pages that ARE in the bound binary. They "
      + "cannot see a page that is absent, so all nine can be zero while the packet is unfilable. This record "
      + "exists so that fact is stated rather than inferred.",
    consequenceForThisFamily:
      "COMPONENT_SET is an OPEN FINDING for this family. The packet is built, deterministic and internally "
      + "complete, and it is not a filing until the insert forms are added.",
    whatWouldCloseIt:
      "A source lane acquiring the Coalition for Court Access Non Conviction Insert Forms and binding them to "
      + "this family, after which the Facts, Findings and Exhibit pages become part of the rendered packet.",
    missing: DOCUMENTS.flatMap((d) => (d.missingCompanionForms ?? []).map((m) => ({ documentId: d.documentId, ...m }))),
    whereTheParticipantGetsThem: DOCUMENTS[0].whereTheParticipantGetsThem ?? null,
    disclosedToTheParticipant:
      "participant-instructions.md opens with this, before anything else, and tells the participant not to file "
      + "without them."
  });

  fs.writeFileSync(path.join(rootDir, `${OUT}/participant-instructions.md`), participantInstructionsMarkdown());

  writeJson(`${OUT}/approval-request.json`, {
    schemaVersion: "rcap-output-approval-request/v1",
    familyId: FAMILY_ID,
    routeKeys: ROUTE_KEYS,
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
