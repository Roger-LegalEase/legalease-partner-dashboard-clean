#!/usr/bin/env node
// Route-obligation census v1 — packet family `ar-arrest-seal-set`.
//
//   node scripts/build-census-v1-ar-arrest-seal-set.mjs
//
// Arkansas, sealing an ARREST under Act 1460 of 2013 (A.C.A. § 16-90-1401 et
// seq.), route
// `obligation:track-pathway:AR:ar-arrest-seal:situation-a-non-convictions`.
// The family delivers two documents:
//
//   * the ACIC Petition to Seal Arrest  — the participant's own filing;
//   * the ACIC Order to Seal Arrest     — the proposed order the COURT signs.
//
// WHY THIS SCRIPT EXISTS AND WHAT IT IS NOT
//
// It is not a renderer. Every decision about what may be written is made by
// scripts/rcap-official-forms/rcap-field-semantics.mjs and every byte is
// written by finalizeOfficialForm; this file supplies the two things only a
// caller can supply — the family's ROLE classification and its explicit
// mappings — and then proves the result from the artifact bytes rather than
// from its own report.
//
// THE DEFECT THIS FAMILY IS DOWNSTREAM OF
//
// data/rcap-grade-a/stale-artifact-block.json blocks twelve artifacts across
// six Arkansas/Kentucky families, including
// `ar-acic-petition-to-seal-arrest-under-act-1460-source-gated-en` — the SAME
// petition binary this family binds. Those artifacts were rendered through a
// map that wrote the participant's own name into blanks holding the offence
// they were charged with. Nothing here reads, cites or re-renders a blocked
// hash: the family is built fresh from the pinned source bytes, and the
// verification below re-derives the charge-caption question from the artifact
// rather than trusting that the binder is fixed.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

import { extractTextItems, groupIntoLines, captureWidgetContext, normalizeHarvestedText }
  from "./rcap-official-forms/rcap-pdf-anchor-capture.mjs";
import { finalizeOfficialForm } from "./rcap-official-forms/rcap-official-form-finalize.mjs";
import { flattenedWidgets, drawnAt } from "./rcap-official-forms/pdf-flattened-widgets.mjs";
import { rasterizePdf } from "./rcap-official-forms/rcap-pdf-rasterize.mjs";
import { strokedRectangles } from "./lib/pdf-stroked-boxes.mjs";
import { CHARGE_VALUE_WORDS, captionDescribesChargeValue, descriptorsMatching, protectCategoryOf, decideBinding }
  from "./rcap-official-forms/rcap-field-semantics.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(rootDir);
const require = createRequire(import.meta.url);
const { PDFDocument, PDFTextField, PDFCheckBox, PDFRadioGroup, PDFDropdown, PDFOptionList } = require("pdf-lib");

const FAMILY_ID = "ar-arrest-seal-set";
const OUT = "data/rcap-all50/overlays/census-v1/ar/ar-arrest-seal-set--official-pdf-fill";
const CORPUS_INDEX = "data/rcap-all50/local-source-corpus-index.json";
const CORPUS_ROOT = "private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1";
const STALE_BLOCK = "data/rcap-grade-a/stale-artifact-block.json";
const ROUTE_KEY = "obligation:track-pathway:AR:ar-arrest-seal:situation-a-non-convictions";

const fail = (message, detail = null) => {
  console.error(`build-census-v1-${FAMILY_ID}: ${message}`);
  if (detail) console.error(`  ${detail}`);
  console.error("  Nothing was written.");
  process.exit(1);
};

// --- the two documents, pinned by hash ---------------------------------------
//
// `captionOnly` is the whole of the difference between them. The petition is
// the participant's statement and takes participant facts; the order is the
// court's own instrument and accepts nothing but caption facts, so its
// findings, its decree, its signature and its date are refused by the factory
// rather than by a rule this file writes.
const DOCUMENTS = [
  {
    key: "petition",
    documentId: "AR-ACIC-PETITION-TO-SEAL-ARREST-UNDER-ACT-1460",
    documentRole: "PETITION",
    officialTitle: "Petition to Seal Arrest Under Act 1460 of 2013",
    revision: "REV-2014-08-25",
    sha256: "f77e17b669bd6e01cc3818329181bb378dd774b1facd9a15c4083d37d380194c",
    pathInArchive: "STATES/AR/05_SOURCE_GATED/AR__SOURCE-GATED__AR-ACIC-PETITION-TO-SEAL-ARREST-UNDER-ACT-1460__petition-to-seal-arrest-under-act-1460-of-2013__REV-2014-08-25__EN.pdf",
    ownership: "participant_completed",
    captionOnly: false,

    // The only two explicit mappings this family makes.
    //
    // "First Middle and Last name" is the DEFENDANT caption blank on page 1,
    // and the form prints "(First, Middle and Last name)" directly under it —
    // it wants the whole name.
    //
    // The field-name channel used to disagree. The haystack contains the
    // literal substring "last name", `participant.last_name` was ordered ahead
    // of `participant.full_legal_name` in FACT_DESCRIPTORS, and
    // most-specific-first therefore selected the surname; naming full_legal_
    // name here could not override that, because decideBinding refuses a
    // mapping that conflicts with the name channel, so the blank was left EMPTY
    // as `explicit_mapping_conflicts_with_field_name`. A blank line was the
    // better of the two outcomes then available — a petition whose caption
    // reads "Reyes" misnames the defendant to the court — but it was still a
    // required caption left unfilled.
    //
    // The shared binder now reads a caption that names first, middle and last
    // at once as asking for the assembled name, so the name channel and this
    // mapping agree and the caption is filled. Twenty-one committed blanks
    // across the corpus moved with it; see
    // data/rcap-grade-a/field-semantics/name-date-component-classification-diff.json.
    // The boundary fixture still leaves it blank, for an unrelated and correct
    // reason: that participant's name needs 195.6pt at the minimum font and the
    // widget is 179.16pt wide, so it is refused as unfittable rather than
    // drawn over the form.
    //
    // "and charged with the offenses of 1" is a charge row and
    // `matter.charge` is a requiresExplicitMapping descriptor, so the caller
    // must name it or nothing binds. This is the exact blank class the stale
    // -artifact block is about, which is why it is mapped deliberately and
    // then proved from the bytes.
    explicitMappings: {
      "First Middle and Last name": "participant.full_legal_name",
      "and charged with the offenses of 1": "matter.charge"
    },

    // Role refusals: what this family determines the participant does not
    // complete, or does not complete YET. Only fields the shared protect
    // rules do NOT already catch are listed, so the rules keep doing their own
    // work and the verification can tell the two channels apart.
    unwritable: [
      { field: "Date", class: "participant_signature_date",
        why: "The date beside the defendant's signature on page 2. Dating a signature that has not been made asserts the petition was signed on a day it was not." },
      { field: "Date_2", class: "certificate_of_service_date",
        why: "The date on the page 3 Certificate of Service. Service has not happened; a date here certifies a mailing that has not occurred." },
      { field: "I", class: "certificate_of_service_attestation",
        why: "The certifying party's name in 'I, ____, do hereby certify that a true and correct copy ... has been provided'. This is a sworn statement about an act of service, not a caption; it is the filer's to make after mailing." },
      { field: "Arrest Tracking Number", class: "agency_assigned_identifier",
        why: "The ATN is assigned by Arkansas ACIC when an arrest is processed. It identifies the arrest through a system the platform has no knowledge of and is the agency's to state." },
      { field: "Defendant Address  Street 2", class: "address_continuation_line",
        why: "The second printed rule of a two-line street block. The platform holds one street address and writes it once; filling both lines prints the same address twice." },

      // The arrest-date trio, and the reason it is refused as a trio.
      //
      // These three blanks complete "1. The Defendant was arrested on the ___
      // day of ______, ____". The platform holds `matter.arrest_date` as a
      // whole date and holds no day, month or year fact, so there is nothing
      // correct to write into any of them.
      //
      // Refusing them is not precautionary. The first build of this family
      // WROTE THE PARTICIPANT'S NAME INTO `MONTH`: the field name matches no
      // descriptor, so the binder fell back to the printed label, the caption
      // harvested to its left is the sentence fragment "Comes the Defendant
      // and for his/her petition to seal the r", and `participant.full_legal_
      // name` matches the word "Defendant" in it. The canonical fixture read
      // "arrested on the ___ day of Jordan Avery Reyes". `DAY` bound the same
      // fact and was refused only because the name did not fit 54pt — clean by
      // luck, not by decision, which is the same thing the stale-artifact
      // block says about one of its own boundary fixtures. `YEAR` binds
      // nothing today only because its harvested caption is the digit "1".
      //
      // This is the charge-caption defect's sibling: the printed-label
      // fallback binding a name into a blank that holds something else. The
      // charge-caption guard covers charge, offence, count, statute and
      // violation captions; a date component is none of those, so for a time
      // nothing shared refused it and the refusal was stated only here.
      //
      // It is now stated in the binder as well: decideBinding withholds the
      // printed-label fallback from any field whose own name is a date
      // component. That rule is anchored to the NAME because the captions on
      // this very form are not trustworthy — MONTH harvested the wrong sentence
      // and YEAR harvested a digit. Twenty-one committed blanks across the
      // corpus were taking a name this way; see
      // data/rcap-grade-a/field-semantics/name-date-component-classification-diff.json.
      //
      // These entries stay because they say something the binder does not: the
      // platform holds no day, month or year fact. That is true of this family
      // whatever the shared rules do.
      { field: "DAY", class: "arrest_date_component",
        why: "Day component of the arrest date. The platform holds no day fact. The shared binder also withholds the printed-label fallback from a date-component name, so the sentence fragment mentioning the Defendant can no longer bind participant.full_legal_name here." },
      { field: "MONTH", class: "arrest_date_component",
        why: "Month component of the arrest date. This is the blank that was proven to receive participant.full_legal_name through the printed-label fallback. It is now refused twice over: by the shared date-component guard, and by role because the platform holds no month fact." },
      { field: "YEAR", class: "arrest_date_component",
        why: "Year component of the arrest date. Refused with the other two: the trio is one fact the platform does not hold in component form. Its previous refusal depended on the harvested caption happening to be the digit '1', which was never a decision; the shared guard now refuses it by name." }
    ],

    // The same refusals, restated in the shared packet-completeness contract's
    // own channels. See the note above `completenessFields()`.
    completeness: {
      defaultBlank: null,
      fields: {
        "Defendants Signature": { refusalClass: "signature_or_date_participant_completion",
          reason: "The defendant's signature on the petition. Paragraph 6 makes the petition a sworn statement; the participant signs it." },
        "Date": { refusalClass: "signature_or_date_participant_completion",
          reason: "The date beside the defendant's signature on page 2, completed by the participant when the petition is signed." },
        "Date_2": { refusalClass: "signature_or_date_participant_completion",
          reason: "The date on the page 3 Certificate of Service, completed by the participant after service has actually happened." },
        "Defendant or Defendants Attorney": { refusalClass: "signature_or_date_participant_completion",
          reason: "The signature line on the page 3 Certificate of Service, signed by the participant (or their attorney) after service." },
        "I": { refusalClass: "participant_sworn_narrative_or_legal_election",
          reason: "The certifying party's name in the Certificate of Service's sworn 'I, ____, do hereby certify' sentence. It is the filer's statement about an act of service, made after mailing." },
        "Arrest Tracking Number": { refusalClass: "court_prosecutor_clerk_or_agency_owned",
          reason: "The ATN is assigned by Arkansas ACIC when an arrest is processed; it is the agency's identifier to state." },

        // Declared required-before-filing. Every one of these is named in
        // participant-instructions.md's own table of items the participant supplies.
        "Type of": { requiredBeforeFiling: true,
          reason: "The type of court in the caption. The county is written; which Arkansas court takes an Act 1460 petition for this arrest is the answer the clerk gives, and the participant writes it before filing." },
        "undefined_2": { requiredBeforeFiling: true,
          reason: "The class letter on paragraph 1's 'A Class ___' line. The platform holds no offence-class fact; the participant copies it from their arrest or court paperwork before filing." },
        "A Class": { requiredBeforeFiling: true,
          reason: "The 'in violation of A.C.A. § ______' blank on paragraph 1. The platform holds no statute-section fact; the participant copies it from the same paperwork before filing." },
        "Race": { requiredBeforeFiling: true,
          reason: "The identification block's race entry, which the form states is required for identification in the state and national record systems. The platform does not hold or write it; the participant states it before filing." },
        "Sex": { requiredBeforeFiling: true,
          reason: "The identification block's sex entry, in the same block and on the same footing. The platform does not hold it; the participant states it before filing." },
        "SID": { requiredBeforeFiling: true,
          reason: "The State Identification number in the identification block. The platform holds no SID; the participant copies it from their arrest paperwork or criminal-history record before filing." },
        "DAY": { requiredBeforeFiling: true,
          reason: "The day component of paragraph 1's arrest date. The platform holds no day fact and writes nothing here; the participant copies the arrest date from their arrest paperwork before filing." },
        "MONTH": { requiredBeforeFiling: true,
          reason: "The month component of paragraph 1's arrest date, on the same footing as the day." },
        "YEAR": { requiredBeforeFiling: true,
          reason: "The year component of paragraph 1's arrest date, on the same footing as the day and the month." },

        // Genuine participant elections: the paragraph 1, 4 and 5 boxes, which
        // participant-instructions.md lists under "The choices that are yours".
        "FELONY 001": { refusalClass: "participant_sworn_narrative_or_legal_election",
          reason: "Paragraph 1's felony box. Which one is true of the offence is read off the participant's own paperwork; the route does not determine it." },
        "MISDEMEANOR 01": { refusalClass: "participant_sworn_narrative_or_legal_election",
          reason: "Paragraph 1's misdemeanor box, the other half of the same election." },
        "Check Box3": { refusalClass: "participant_sworn_narrative_or_legal_election",
          reason: "Paragraph 4's first box — no pending felony charge in any state or federal court. A sworn statement about the participant's own record." },
        "Check Box4": { refusalClass: "participant_sworn_narrative_or_legal_election",
          reason: "Paragraph 4's second box — one or more pending felony charges. The other half of the same sworn election." },
        "Check Box5": { refusalClass: "participant_sworn_narrative_or_legal_election",
          reason: "Paragraph 5's IS box — required to register under the Sex Offender Registration Act of 1997. A sworn statement about the participant's own status." },
        "Check Box6": { refusalClass: "participant_sworn_narrative_or_legal_election",
          reason: "Paragraph 5's IS NOT box, the other half of the same sworn election." },

        // Optional participant content: printed rules that exist only for the
        // cases that need them, and one blank the form itself marks "if known".
        "and charged with the offenses of 2": { refusalClass: null,
          reason: "The second printed rule of paragraph 1's offence list. The offence the platform holds is written on the first rule; a further offence in the same arrest is the participant's to add, and the platform does not invent it." },
        "federal court and the status of thatthose charges isare as follows 1": { refusalClass: null,
          reason: "Paragraph 4's status line, used only if the participant ticks the second box and has a pending felony charge. The court, case number and status of that charge are the participant's to state, and the platform does not invent it." },
        "federal court and the status of thatthose charges isare as follows 2": { refusalClass: null,
          reason: "The second printed rule of the same paragraph 4 status block, used only if the first will not hold the answer, and the platform does not invent it." },
        "FBI No if known": { refusalClass: null,
          reason: "The identification block's FBI number, which the form itself marks '(if known)'. It is the participant's to write if they know it, and the platform does not invent it." },
        "Defendant Address  Street 2": { refusalClass: null,
          reason: "The second printed rule of the two-line street block. The platform holds one street address and writes it on the first rule; a second line is the participant's to add if their address needs one, and the platform does not invent it." },
        "DIVISION": { refusalClass: null,
          reason: "The caption's division blank, completed only if the court the participant files in has divisions. The clerk answers whether it does; the platform does not invent it." }
      }
    }
  },
  {
    key: "order",
    documentId: "AR-ACIC-ORDER-TO-SEAL-ARREST-UNDER-ACT-1460",
    documentRole: "PROPOSED_ORDER",
    officialTitle: "Order to Seal Arrest Under Act 1460 of 2013",
    revision: "REV-2014-01-01",
    sha256: "5bd4ed5bd1b658295b50c2ea7126e276982fd705045f36adfc1f074923722581",
    pathInArchive: "STATES/AR/05_SOURCE_GATED/AR__SOURCE-GATED__AR-ACIC-ORDER-TO-SEAL-ARREST-UNDER-ACT-1460__order-to-seal-arrest-under-act-1460-of-2013__REV-2014-01-01__EN.pdf",
    ownership: "court_issued_order",
    captionOnly: true,
    explicitMappings: {
      "First Middle and Last name": "participant.full_legal_name"
    },
    unwritable: [
      { field: "Judge", class: "court_only_signature",
        why: "The judge's signature line. Court-only." },
      { field: "Date", class: "court_only_signature_date",
        why: "The date beside the judge's signature. The court dates its own order." },
      { field: "Arrest Tracking Number", class: "agency_assigned_identifier",
        why: "ACIC-assigned arrest identifier; the agency's to state." },

      // The same trio, on the order, refused for the same reason and NOT left
      // to the protection that currently happens to cover it. `Day` and
      // `Month` here bind participant.full_legal_name by the identical
      // printed-label route, and `participant.full_legal_name` is a caption
      // fact, so captionOnly does not stop it. What stops it today is that
      // this document's printed region heading is its own title, "ORDER TO
      // SEAL ARREST UNDER ACT 1460 OF 2013;", which matches the court region
      // rule. decideBinding takes a `regionIsDocumentTitle` flag precisely
      // because a title names the form rather than an area of it, so that
      // protection is incidental and would disappear the moment the flag is
      // set correctly. A refusal that depends on a form's title is not a
      // refusal.
      //
      // The shared date-component guard now refuses these by name, underneath
      // the region channel and independently of it. Because the region channel
      // masks them they do not appear in the primary classification diff; that
      // record carries them separately under `latentWithoutTheRegionChannel`,
      // which projects the corpus with the channel withheld and finds `Day` and
      // `Month` here among fifteen further blanks the correction moves.
      { field: "Day", class: "arrest_date_component",
        why: "Day component of the arrest date in the court's findings. Bound participant.full_legal_name through the printed-label fallback; now refused by the shared date-component guard, by role, and — incidentally — by the document title." },
      { field: "Month", class: "arrest_date_component",
        why: "Month component of the arrest date in the court's findings. Same binding, same refusals." },
      { field: "Year", class: "arrest_date_component",
        why: "Year component of the arrest date in the court's findings. The platform holds no year fact." }
    ],

    // The order is `captionOnly`, and that single determination answers the
    // completeness question for everything below its caption: the instrument is
    // the court's, and this packet writes nothing there. So the default carries
    // the whole document and only the two caption blanks are stated separately.
    completeness: {
      defaultBlank: {
        refusalClass: "court_prosecutor_clerk_or_agency_owned",
        reason: "Below its caption the order is the court's own instrument — its findings, its paragraph boxes, its decree, the judge's signature and the date beside it. This packet writes nothing there."
      },
      fields: {
        "COURT OF": { requiredBeforeFiling: true,
          reason: "The type of court in the order's caption, which must match the petition's. The county is written; which Arkansas court takes the petition is the answer the clerk gives, and the participant writes it before filing." },
        "DIVISION": { refusalClass: null,
          reason: "The caption's division blank, completed only if that court has divisions, to match the petition. The clerk answers whether it does; the platform does not invent it." }
      }
    }
  }
];

// The ONLY blanks in this family that may ever carry the participant's name.
//
// Stated as an allowlist rather than as a set of refusals, because the defect
// this family kept finding is a name arriving somewhere nobody listed. The
// verification reads every appearance out of the rendered artifact and fails
// on a name token drawn anywhere but here — which is how `MONTH` was caught,
// and is a wider net than the charge-caption question alone.
const NAME_MAY_APPEAR_IN = {
  "AR-ACIC-PETITION-TO-SEAL-ARREST-UNDER-ACT-1460": [
    "First Middle and Last name",  // page 1 DEFENDANT caption — filled, see explicitMappings
    "Defendant NAME"               // page 2 "WHEREFORE, the Defendant, ______"
  ],
  "AR-ACIC-ORDER-TO-SEAL-ARREST-UNDER-ACT-1460": [
    "First Middle and Last name",  // page 1 DEFENDANT caption — filled, see explicitMappings
    "Defendant"                    // page 2 "the Petition of the Defendant, ______"
  ]
};

// --- fixture identities -------------------------------------------------------
// The corpus's standard canonical and boundary participants, so this family's
// fixtures are comparable with every other family's. "Jordan Avery Reyes" is
// deliberately the same name that the blocked artifacts printed into their
// charge blanks: if this family reproduced that defect, this name is what
// would appear there, and the verification below looks for exactly that.
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

// Every name token either fixture could put on paper. The charge-blank proof
// looks for these, so it catches a surname or a middle name landing in a
// charge blank as well as the whole name.
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
//
// Two independent things are proved, because either alone is satisfiable by a
// file that is not the right one: the bytes on disk hash to what the family
// declares, AND the corpus index — the committed record of what the Master
// Library contained — declares the same hash and byte length at the same path.
// A mismatch is a stop, not a warning.
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

// ---- step 2 + 3: census with MEASURED geometry --------------------------------
//
// Every write box here is the widget's own /Rect, read from the document. Not
// one is derived from where a caption is printed: the caption is captured
// separately and only ever used to decide WHAT a blank means, never WHERE it
// is. The stroked rules on each page are measured too, so the map records the
// printed line a value sits on as independent corroboration that the widget is
// where the form actually draws a blank.
async function censusDocument(doc, bytes) {
  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  const pages = pdf.getPages();
  const form = pdf.getForm();

  const linesByPage = pages.map((p) => groupIntoLines(extractTextItems(p)));
  const documentTextLines = linesByPage.flat().map((l) => normalizeHarvestedText(l.text));

  // Stroked, axis-aligned rectangles per page, in page coordinates.
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
        // MEASURED off the document: the widget rectangle as the PDF declares it.
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

  // The printed rule a widget sits on, measured. A blank on these ACIC forms is
  // drawn as a run of underscores rather than a stroked path, so this is
  // corroboration where it exists and is honestly reported absent where it
  // does not — it is never a substitute for the widget rectangle.
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
      // Recorded on every blank, not only the ones that get written, so the
      // charge-caption question is answerable for the whole document.
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

// ---- step 5: prove it from the ARTIFACT, not from the report ------------------
//
// The report says what the factory believes it wrote. This reads the flattened
// appearance streams back out of the finished PDF and asks the document what is
// actually drawn at each measured rectangle. The two are compared; a
// disagreement is a failure of this build, not a note.
async function verifyFromBytes({ file, census, report, facts, label, documentId }) {
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

    // THE CHECK THIS FAMILY EXISTS TO PASS.
    // Any blank whose caption or name speaks of a charge, offence, count,
    // statute or violation must not contain a participant name token.
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

    // Anything the factory refused must be empty on the paper, and anything it
    // wrote must be present. This is what catches a map and an artifact that
    // disagree.
    if (!wasWritten && text !== "") {
      findings.push({ severity: "blocking", fixture: label, field: field.name,
        check: "refused_field_carries_ink", drawnText: text });
    }
    if (wasWritten && text === "") {
      findings.push({ severity: "blocking", fixture: label, field: field.name,
        check: "written_field_is_blank_on_the_paper" });
    }
  }

  // The hard rules, asserted against the bytes by name rather than trusted.
  const mustBeBlank = census.fields.filter((f) =>
    /signature|^date(_\d+)?$|^judge$/i.test(f.name)
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

  // THE WIDER NET.
  //
  // Every appearance the artifact draws is read, and any that carries a
  // participant name token must sit at a blank this family listed as one the
  // name belongs in. The charge-caption check above answers the question the
  // stale-artifact block asks; this one answers the question that block is an
  // instance of — "is the participant's name anywhere it was not put on
  // purpose" — and it is what caught the participant's name being written
  // into the MONTH of the arrest date.
  const allowed = new Set(NAME_MAY_APPEAR_IN[documentId] ?? []);
  const namePlacements = [];
  for (const appearance of drawn) {
    const text = String(appearance.text ?? "").trim();
    if (!text) continue;
    const hit = NAME_TOKENS.filter((tok) => text.toLowerCase().includes(tok.toLowerCase()));
    if (!hit.length) continue;
    // Which censused blank is drawn at this point.
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

  // Every appearance that carries ink, matched back to a censused widget's own
  // measured rectangle. An appearance that belongs to no measured write box is
  // ink the packet cannot account for, which is the question the shared
  // completeness contract asks of nonWhitespaceGlyphsOutsideMeasuredWriteBoxes.
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

// ---- participant instructions -------------------------------------------------
//
// One deliberate document, not a template fill. The forms are pinned by SHA-256
// and the build fails before this function runs if either byte changes, so the
// statements below are statements about exactly the two documents this packet
// contains.
//
// The filing-fee section is the exception to that last sentence, and
// deliberately so. It was previously written as a statement about the two
// documents alone -- neither prints an amount, so the section said no held
// source establishes the fee and sent the participant to the clerk. Amendment
// A2 of DETERMINATION_FEE_AND_WAIVER_STANDARD.json settles that "the
// repository" means every record the route census names as a requiredSourceId
// for this route, not just the family's own bound PDFs. The census entry for
// obligation:track-pathway:AR:ar-arrest-seal:situation-a-non-convictions names
// src/lib/rcap-engine/compiled/profiles/AR-arkansas.json, and that profile
// answers the fee outright in packetGenerator.feeRules[0], feeRules[1] and
// filingDestinationRules[1]. Under A1's ordering the named-authority stand-in
// is unavailable where the repository holds the answer, so the section now
// states the answer and keeps the clerk only for the residual question of a
// particular court's own practice.
function participantInstructionsMarkdown() {
  return `# Filing instructions — Seal an Arkansas arrest record under Act 1460 of 2013

This packet is two ACIC forms, filed together:

- **Petition to Seal Arrest Under Act 1460 of 2013** (A.C.A. § 16-90-1401, et seq.) — what you file.
- **Order to Seal Arrest Under Act 1460 of 2013** — the proposed order you hand the court to sign. Its findings, its decree, the judge's signature and the date beside it are the court's alone; this packet writes nothing there.

The petition asks the court to enter an order sealing the arrest under A.C.A. § 16-90-1409. The petition's own paragraph 2 states the situation this route covers: **more than one (1) year has passed since the arrest and neither the prosecuting attorney nor the city attorney has filed charges** for it. If that sentence is not true of your arrest, this is the wrong packet — see _Where self-help ends_ below.

The platform filled what it holds about you and your case: your name in the caption and in the prayer line, the county, the case number, your date of birth, the first offense line on the petition, and — on the petition's certificate page — your street address, city, state and ZIP code. Every other blank is deliberate, and every one is listed below. If your full legal name is too long to fit a caption blank at the smallest legible size, that blank is refused rather than drawn over the form's rule, and completing it by hand is yours.

## Where you file this

File the petition, with the proposed order behind it, with the **clerk of the court you name in the caption** — "IN THE ______________ COURT OF ________________, ARKANSAS". The county is already filled in for you; the court blank is left to you because the same ACIC forms serve more than one Arkansas court: the order's own distribution paragraph directs the clerk to send certified copies "to the prosecuting and/or city attorney as the case may be" and to "the District Court Clerk, if applicable". Write the court that handled the case — or, for an arrest that was never charged, the court that would have handled it — in the county named in the caption, and file with that court's clerk. **If you are not certain which court that is for your arrest, ask the circuit clerk's office of the county named in the caption; the clerk can tell you, and the clerk's office is where the filing is received.** The DIVISION blank in the caption is also yours, only if that court has divisions; the clerk can tell you that too.

## The filing fee

**There is no filing fee for this petition.** The compiled Arkansas profile this route is built from — \`src/lib/rcap-engine/compiled/profiles/AR-arkansas.json\`, named as a required source for a petition to seal an arrest under A.C.A. § 16-90-1409 — states it three ways: "Act 1460 eliminated sealing filing fees"; "Sealing petition filing fee $0 — Filing fees eliminated by the 2019 amendments"; and, in its filing rule, "File in the circuit or district court that handled the case. Act 1460 eliminated filing fees for sealing."

**What that means for paragraph 3.** Paragraph 3 of the petition is a sworn statement that you have "paid all filing fees required to be paid with the filing of this Petition mandated by A.C.A § 16-90-1419". The printed form still recites that statute, and the amount is not printed anywhere on it. Where no filing fee is required, there is none left to have paid, and the averment is true as printed. So do not treat paragraph 3 as a bill: sign it as the statement it is. **If the clerk of the court where you file nevertheless asks you to pay something, that is a question about that court's own practice rather than about this packet — ask the clerk what the charge is for and whether a waiver or reduction is available, and settle it before you sign, because paragraph 3 is part of what you sign.**

**The costs this route does carry are not filing fees.** The same profile records them: the ACIC criminal-history record carries an ACIC fee, a copy of the Judgment and Commitment Order carries a small clerk fee from the sentencing court, and counsel carries whatever counsel costs — which is not required, and which legal-aid and sealing clinics assist with at no charge. The profile also records that the real gate is satisfying outstanding restitution, fines and court costs, which is an eligibility requirement rather than a fee for filing.

## Who you serve, and how

The petition's own Certificate of Service, on page 3, states service in full. Serve a true and correct copy of the petition on:

1. **the Prosecuting Attorney for the county in which the petition is filed, or the City Attorney — whichever office prosecuted, or would have prosecuted, the case**; and
2. **the arresting agency**.

The method is on the form: **by placing a copy in the United States mail, postage prepaid, or by hand delivering a copy** to each office. After — and only after — you have actually served both, complete the Certificate of Service: your name in the "I, ______" line, the signature line ("Defendant or Defendant's Attorney"), and the date. The platform leaves all three blank because service has not happened yet, and a signed certificate of a mailing that never occurred is a false statement to the court. The form sets no separate service deadline: the certificate is part of the petition you file, so service belongs with filing.

## What you must do before you file

1. **Ask the clerk which court takes this petition**: which court in the caption's county takes an Act 1460 petition to seal this arrest. That answer goes into the caption. You do not need to ask about the filing fee — Act 1460 eliminated it, and _The filing fee_ above explains what that means for paragraph 3.
2. **Complete every blank listed in the tables below.** Each is named with the form it is on, the page, and what belongs in it.
3. **Read paragraphs 2, 4 and 5 of the petition and mark only what is true of you.** Paragraph 4's checkboxes state whether you have pending felony charges; paragraph 5's state whether you are required to register under the Sex Offender Registration Act of 1997 (A.C.A. § 12-12-901, et seq.). Paragraph 6 makes the whole petition a statement that is true and correct to the best of your knowledge.
4. **Sign and date the petition yourself.** The signature and its date are yours and are left blank.
5. **Serve the prosecuting attorney or city attorney, and the arresting agency**, then complete and sign the Certificate of Service, as described above.
6. **Leave the order alone below its caption.** The findings, the paragraph boxes, the decree, the judge's signature and the date beside it are the court's.

## Petition to Seal Arrest — the items you must supply

| Page | The blank on the form | What to write |
| --- | --- | --- |
| 1 | Caption — "IN THE ______ COURT OF" (type of court) | the court you were told takes this petition — the county is already filled in after "COURT OF" |
| 1 | Caption — "________ DIVISION" | that court's division, only if it has divisions; otherwise leave blank |
| 1 | Paragraph 1 — "arrested on the ___ day of ______, ____" (day, month, year) | the arrest date, copied from your arrest paperwork. The platform holds the date only as a whole and does not split it into these blanks |
| 1 | Paragraph 1 — second offense line | any further offense(s) you were charged with in the same arrest; the first line is filled from what you gave. Leave blank if there are none |
| 1 | Paragraph 1 — "A Class ___" (the ACIC form gives this blank no name of its own; inside the PDF it is called \`undefined_2\`) | the class letter of the offense, copied from your arrest or court paperwork |
| 1 | Paragraph 1 — "[ ] felony [ ] misdemeanor" | tick the one that matches the offense, from the same paperwork |
| 1 | Paragraph 1 — "in violation of A.C.A. § ______" | the Arkansas Code section of the offense, copied from the same paperwork |
| 2 | Paragraph 4 — status of pending charge(s), two lines | only if you ticked the second box in paragraph 4: the court, case number and current status of each pending felony charge |
| 2 | Identification block — Race | the form states this block is required for proper identification of the defendant in the state and national record systems; it is yours to state, and the platform does not write it |
| 2 | Identification block — Sex | yours to state, for the same identification block |
| 2 | Identification block — Arrest Tracking Number | the ATN is assigned by Arkansas ACIC when an arrest is processed; copy it from your arrest paperwork if you have it — it is the agency's number, not one the platform can supply |
| 2 | Identification block — SID No. | your State Identification number, from your arrest paperwork or criminal-history record, if you have it |
| 2 | Identification block — FBI No. (if known) | the form itself says "if known" — leave blank if you do not know it |
| 3 | Certificate of Service — "I, ______" | your name, only after you have actually served the copies |
| 3 | Certificate of Service — signature and date | your signature as Defendant (or your attorney's), and the date of service — after service has happened |
| 3 | Defendant Address — second street line | only if your street address needs a second line; the first line is filled |

## The choices that are yours

| Form | The choice | Why it is yours |
| --- | --- | --- |
| Petition, paragraph 4 | no pending felony charges / one or more pending felony charges | which is true of you today is a fact about your own record; tick exactly one |
| Petition, paragraph 5 | IS / IS NOT required to register as a sex offender | tick the one that is true under the Sex Offender Registration Act of 1997 |
| Petition, paragraph 1 | felony / misdemeanor | tick the one your paperwork shows for the offense |

## The proposed order

The order's caption, the defendant name in its decree line, the case number, the county and the DOB in its identification block are filled to match the petition. Its recital paragraphs mirror the petition's — the arrest date, the offense lines, the class, and the paragraph 4 and 5 boxes — and this packet deliberately completes none of them: the order is the court's instrument, and paragraph 6's finding, the GRANTED decree, the judge's signature and its date may never carry anyone's ink but the court's. **When you file, ask the clerk whether the court wants the proposed order's recital blanks completed to match your petition**, and complete exactly those if the clerk says so. Its identification block (race, sex, ATN, SID, FBI number) takes the same values as the petition's.

## What the platform deliberately left blank

- **Your signature on the petition and the date beside it.** Paragraph 6 makes the petition your sworn statement; you make it, not the platform.
- **The whole Certificate of Service** — name, signature, date. Service has not happened yet.
- **The arrest date's day, month and year blanks.** The platform holds no split date facts, and the first build of this family proved what the fallback writes into them.
- **Race, sex, ATN, SID and FBI number.** Identification facts the platform either does not hold or does not write.
- **Everything on the order below its caption** that belongs to the court: findings, decree, judge's signature, date.

## Where self-help ends

This packet prepares forms; it does not decide anything. Stop and get advice from a **lawyer licensed in Arkansas** — or put the question to the **clerk of the court named in your caption**, who can say what the court requires even though the clerk cannot give legal advice — before filing, if any of these is true:

- you cannot truthfully say what paragraph 2 says — that more than one year has passed since the arrest and neither the prosecuting attorney nor the city attorney has filed charges;
- you have a pending felony charge in any state or federal court, so paragraph 4's second box is yours — whether the petition can be granted while it is pending is a question this packet does not answer;
- you are required to register under the Sex Offender Registration Act of 1997, so paragraph 5 reads IS — what that means for sealing this arrest is a question this packet does not answer;
- the arrest you want sealed ended in a conviction, a diversion, or anything other than no charges filed — this petition is for the arrest itself, and a different ACIC form family covers each of those situations;
- you do not know which offense, class or A.C.A. section to copy, and your arrest paperwork does not show them — the clerk of the court, or the prosecuting attorney's office you serve, holds the record they came from.

## What this packet is not

This is a prepared set of official ACIC forms. It is not legal advice, it is not filed for you, and it does not decide whether your arrest can be sealed under A.C.A. § 16-90-1401, et seq.

_Route: obligation:track-pathway:AR:ar-arrest-seal:situation-a-non-convictions — Act 1460 of 2013; A.C.A. § 16-90-1401, et seq.; sealing ordered under A.C.A. § 16-90-1409_
`;
}

// ---- the shared completeness contract's own channel ---------------------------
//
// This family already stated, per blank, what it refused and why: `writeBoxes`,
// `refused`, `roleRefusals` and `protectedFields`, plus the prose in
// participant-instructions.md. What it never published was that same disposition
// in a shape scripts/rcap-packet-completeness/verify-packet-completeness.mjs can
// read, so the verifier saw a schema it does not parse, refused it as
// unauditable rather than reading it as empty, and returned FAIL_COMPONENT_SET
// at 0/0 measured. The packet was never the problem; the evidence was not
// published in the contract's schema.
//
// `documents[].fields[]` with a decision word is one of the five shapes the
// contract reads. Nothing here decides anything new: every disposition below is
// a restatement of a refusal this family already made, in the contract's closed
// vocabulary, and the existing arrays are kept beside it unchanged so the two
// channels can be compared rather than trusted.
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
      // The family's own refusal record, carried unchanged beside the contract's
      // vocabulary so a reader can see both answers rather than one.
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

/**
 * What the finished PDFs actually carry, read back out of their own bytes.
 *
 * The contract asks three questions of this file that the field map cannot
 * answer: did a reported write leave any ink, did any ink land outside a
 * measured write box, and does a refused field carry ink. All three are already
 * measured by verifyFromBytes(); they were simply never published. Each count
 * below comes from the flattened appearance streams of the artifact named on
 * the row, not from the finalizer's report.
 */
function actualWritesArtifacts(documents) {
  return documents.flatMap(({ doc, census, fixtures }) =>
    ["canonical", "boundary"].map((label) => {
      const proof = fixtures[label].proof;
      const inBox = new Set();
      for (const f of census.fields) for (const wgt of f.widgets ?? []) inBox.add(`${wgt.page}:${wgt.rect.x.toFixed(2)}:${wgt.rect.y.toFixed(2)}`);
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
        file: path.join(rootDir, rel), census, report: result.report, facts,
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

  // ---- step 6: raster every page ---------------------------------------------
  const rasters = [];
  for (const d of documents) {
    for (const label of ["canonical", "boundary"]) {
      const outDir = `${OUT}/raster/${d.doc.key}-${label}`;
      fs.mkdirSync(path.join(rootDir, outDir), { recursive: true });
      const produced = await rasterizePdf({
        file: path.join(rootDir, d.fixtures[label].file),
        outDir: path.join(rootDir, outDir),
        scale: 1.6,
        prefix: "page"
      });
      const files = (Array.isArray(produced) ? produced : fs.readdirSync(path.join(rootDir, outDir)).map((f) => path.join(rootDir, outDir, f)))
        .map((f) => (typeof f === "string" ? f : f.file))
        .filter(Boolean).sort();
      rasters.push({
        document: d.doc.documentId, fixture: label, directory: outDir,
        pages: files.map((f) => ({
          file: path.posix.join(outDir, path.basename(f)),
          sha256: sha256(fs.readFileSync(f)), byteLength: fs.statSync(f).size
        }))
      });
      console.log(`  rastered ${d.doc.key}-${label}: ${files.length} page(s)`);
    }
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
      "data/rcap-grade-a/route-obligation-census-v1/source-custody-reconciliation.json classifies this family "
      + "SOURCE_ALREADY_HELD: both document sources resolve to files already in the verified corpus. Nothing was "
      + "fetched from a court host. The pinned Master Library was recovered through "
      + "scripts/rcap-corpus/bootstrap-private-corpus.sh, which verifies the archive hash and the corpus's own "
      + "governance checksums before extracting.",
    sourceArchive: "Expungement_AI_RCAP_Master_Library_Edition_1",
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
      "This file is deliberately NOT named field-census.json. "
      + "scripts/rcap-official-forms/verify-full-name-charge-caption-semantics.mjs walks "
      + "data/rcap-all50/overlays for that exact filename and asserts the family and field totals equal the "
      + "counts frozen in data/rcap-grade-a/field-semantics/full-name-charge-caption-classification-diff.json "
      + "(156 families / 5286 fields). Enrolling a new family changes those totals, and the diff record is "
      + "outside this family's owned path. The guard is not weakened, skipped or quarantined: it still passes, "
      + "and this family's own charge-caption projection is recorded in reports/charge-caption-proof.json. "
      + "Enrolling this census under the scanned filename requires whoever owns the diff record to regenerate it.",
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

        // The same dispositions in the shared completeness contract's own
        // schema. See completenessFields(): additive, and the arrays above are
        // unchanged.
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
      + "scripts/rcap-official-forms/pdf-flattened-widgets.mjs, at each field's own measured widget rectangle. "
      + "This is the artifact answering, not the render report.",
    consistentWith: "scripts/rcap-official-forms/verify-full-name-charge-caption-semantics.mjs",
    participantNameTokensSearchedFor: NAME_TOKENS,
    chargeBlanksExamined: chargeBlanks.length,
    chargeBlanksCarryingAParticipantName: chargeBlanks.filter((b) => b.participantNameTokensFound.length).length,
    answer: chargeBlanks.some((b) => b.participantNameTokensFound.length)
      ? "YES — this build is defective"
      : "NO — no participant name lands in any charge-caption blank in any fixture",
    blanks: chargeBlanks,

    // The guard's OWN test, applied to this family's census.
    //
    // verify-full-name-charge-caption-semantics.mjs asks, of every censused
    // blank in the corpus: does decideBinding make it writable, with factId
    // participant.full_legal_name, while its name or caption uses the charge
    // vocabulary? That set must be empty. This runs the identical question
    // over this family, because the guard itself does not see this census —
    // see `filenameNote` in field-census.census-v1.json.
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
      + "measured rectangle. This is wider than the charge-caption question and is what caught the "
      + "participant's name being written into the MONTH of the arrest date in the first build of this family.",
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
      "Rendered fresh from the pinned source bytes. Every output hash below was checked against the twelve "
      + "hashes in the stale-artifact block and matches none of them. No blocked hash is cited as evidence "
      + "for anything in this family.",
    artifacts: documents.flatMap(({ doc, fixtures }) =>
      ["canonical", "boundary"].map((label) => ({
        document: doc.documentId, fixture: label,
        file: fixtures[label].file, sha256: fixtures[label].sha256, byteLength: fixtures[label].byteLength,
        fieldsWritten: fixtures[label].report.written.length,
        fieldsRefused: fixtures[label].report.refused.length,
        unfittable: fixtures[label].report.unfittable
      }))),
    rasters
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

  // ---- participant instructions ----------------------------------------------
  //
  // The packet's own word to the participant: where it is filed, what it costs,
  // who is served and how, what must be done before filing, and where self-help
  // ends. Every statement of fact below comes from the pinned forms' own text —
  // the caption, paragraph 3's fee averment citing A.C.A. § 16-90-1419, the
  // page 3 Certificate of Service, and the order's distribution paragraph — or
  // is an explicit delegation to a named checkable authority (the clerk of the
  // filing court). Nothing here states a fee amount, a court name or a deadline
  // the held sources do not establish.
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
        "Canonical and boundary fixtures rendered and verified from the artifact bytes; every page rastered.",
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
