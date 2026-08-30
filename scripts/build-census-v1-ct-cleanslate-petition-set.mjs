#!/usr/bin/env node
// Route-obligation census v1 — packet family `ct-cleanslate-petition-set`.
//
//   node scripts/build-census-v1-ct-cleanslate-petition-set.mjs
//
// Connecticut, PETITIONED Clean Slate erasure for convictions entered before
// 1 January 2000, route
// `obligation:track-pathway:CT:ct-cleanslate-petition:petitioned-clean-slate-
// erasure-for-eligible-pre-2000-convictions-jd-cr-202`.
//
// The family delivers ONE document: JD-CR-202, the Judicial Branch petition.
// Connecticut prints the court's own decree on page 2 of the same sheet rather
// than issuing a separate proposed order, so this single binary is both the
// participant's filing and the court's instrument. That is the fact the field
// map has to survive: `captionOnly` cannot express "the second half of this
// document belongs to the court", so the court's half is refused field by
// field and the refusal is proved from the rendered bytes.
//
// WHAT THIS SCRIPT IS NOT
//
// It is not a renderer. Every decision about what may be written is made by
// scripts/rcap-official-forms/rcap-field-semantics.mjs and every byte is
// written by finalizeOfficialForm. This file supplies only what a caller can
// supply — the family's ROLE classification — and then proves the result from
// the artifact bytes rather than from its own report.
//
// WHAT THE CENSUS FOUND, AND WHY THE WRITTEN SET IS THREE FIELDS OF TWENTY-TWO
//
// JD-CR-202 lays its caption out as a four-cell table header row:
//
//     Name of defendant | E-mail address | Phone number | Date of birth
//
// captureWidgetContext's "printed directly above in the same column" branch
// takes the WHOLE line, not the cell above the widget — unlike its "to the
// left" branch, which is cell-aware via cellTextLeftOf. So all four widgets
// under that row harvest the identical caption
// "Name of defendantE-mail addressPhone numberDate of birth", and
// most-specific-first ordering resolves it to participant.date_of_birth for
// every one of them. Run unguided against this form, the factory writes the
// participant's date of birth into the NAME box, the E-MAIL box and the PHONE
// box. That is not a prediction; scripts/... this build's own dry run recorded
// it, and reports/caption-channel-defect.json carries the evidence.
//
// The same single mechanism cuts three ways on this form, which is why it is
// reported rather than worked around:
//
//   1. It MISBINDS the four header-row fields, as above, plus COURTADDRESS
//      (the field name contains "ADDRESS", so participant.street_address binds
//      by the NAME channel and the court's address line would carry the
//      participant's home address) and JDGANUM (the run-on caption resolves to
//      matter.case_number, so the docket number would be written into the
//      court-location box).
//
//   2. It ACCIDENTALLY PROTECTS two fields that must never be prefilled. The
//      jurat rows print as "Signature (Defendant) | Print name | Date" and
//      "Signature (Notary, Commissioner of the Superior Court, Clerk) | Print
//      name | Date". Because the run-on caption contains the word "Signature",
//      protectCategoryOf returns `signature` and PRINTNAME/DATESIGN are
//      refused. Given the cell-accurate caption they deserve — "Print name" —
//      PRINTNAME resolves to writable participant.full_legal_name. The
//      platform would prefill the printed name in the attestation block of a
//      petition sworn before a notary, and nothing shared would stop it. The
//      same is true of the court's own DATEJUDGMNT, whose cell-accurate
//      caption "On (Date)" carries no protect category at all.
//
//   3. It is NOT the reason CRIMES2ERASE is dangerous. That blank is wrong
//      under BOTH captures — see below.
//
// Fixing the caption harvest would therefore repair six data fields and
// simultaneously REMOVE the only thing standing between the platform and the
// signature block of a sworn document. The fix belongs to whoever owns
// scripts/rcap-official-forms/rcap-pdf-anchor-capture.mjs, which is outside
// this family's owned path and is read here, never edited. Until it lands,
// this family refuses every affected field BY ROLE, so that not one of its
// refusals depends on the defect.
//
// THE CHARGE-CAPTION FINDING, WHICH THE CORPUS GUARD CANNOT SEE
//
// `form1[0].PAGE1[0].CRIMES2ERASE[0]` is the blank in which the petitioner
// lists the convictions they are asking the court to erase. It is captioned
// "Crime(s) defendant asks the court to erase". decideBinding makes it
// WRITABLE with factId participant.full_legal_name — the word "defendant" in
// the caption matches the name descriptor — and the unguided dry run wrote
// "Jordan Avery Reyes" across the crimes box.
//
// This is the same defect as the twelve artifacts in
// data/rcap-grade-a/stale-artifact-block.json: the participant's own name
// printed as the offence they were charged with. But the guard built to catch
// it does not fire here. CHARGE_VALUE_WORDS is
//
//     /\b(charges?|offen[cs]es?|counts?|statutes?|violations?)\b/i
//
// and Connecticut says CRIME. `captionDescribesChargeValue` is false for this
// blank, so verify-full-name-charge-caption-semantics.mjs would report zero
// offending rows on a form that has one. The guard is not weakened, skipped or
// quarantined by this build: it still passes, and the projection recorded in
// reports/charge-caption-proof.json runs the guard's own offending-row test
// over this census and reports honestly that it returns 0 while the defect is
// present. Closing the gap means adding the word to the shared vocabulary,
// which is outside this family's owned path.
//
// Note also that matter.charge — the fact that BELONGS in this blank — cannot
// reach it either: its descriptor matches /\bcharge\b|\boffense\b|\bstatute\b|
// \bviolation\b|\bcount\b/ and "CRIMES2ERASE" / "Crime(s) ..." matches none of
// them. So the blank is left for the participant, which is also the right
// answer for a second reason: WHICH convictions are eligible under Clean Slate
// is an eligibility question, and this family does not decide eligibility.
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
const { PDFDocument, PDFTextField, PDFCheckBox, PDFRadioGroup, PDFDropdown, PDFOptionList, PDFName } = require("pdf-lib");

const FAMILY_ID = "ct-cleanslate-petition-set";
const OUT = "data/rcap-all50/overlays/census-v1/ct/ct-cleanslate-petition-set--official-pdf-fill";
const CORPUS_INDEX = "data/rcap-all50/local-source-corpus-index.json";
const CORPUS_ROOT = "private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1";
const STALE_BLOCK = "data/rcap-grade-a/stale-artifact-block.json";
const ROUTE_KEY =
  "obligation:track-pathway:CT:ct-cleanslate-petition:petitioned-clean-slate-erasure-for-eligible-pre-2000-convictions-jd-cr-202";

const fail = (message, detail = null) => {
  console.error(`build-census-v1-${FAMILY_ID}: ${message}`);
  if (detail) console.error(`  ${detail}`);
  console.error("  Nothing was written.");
  process.exit(1);
};

// --- the document, pinned by hash --------------------------------------------
const DOCUMENTS = [
  {
    key: "petition",
    documentId: "CT-JD-CR-202-PETITION-FOR-CLEAN-SLATE-ERASURE-CONVICTIONS-BEFORE-2000",
    documentRole: "PETITION_WITH_COURT_ORDER_SECTION",
    officialTitle: "Petition for Clean Slate Erasure, Convictions Before 1/1/2000",
    formNumber: "JD-CR-202",
    revision: "REV-2023-11",
    sha256: "b5a917c2cd07727172a50534a4884a63e8ae08704b631c62a199c3454623062c",
    pathInArchive:
      "STATES/CT/02_PACKET_FORMS/CT__FORM__JD-CR-202__petition-for-clean-slate-erasure-convictions-before-1-1-2000__REV-2023-11__EN.pdf",
    ownership: "participant_completed_with_a_court_completed_section",

    // captionOnly is FALSE because page 1 is the participant's sworn petition
    // and takes participant facts. It cannot be used to protect page 2: the
    // flag is per-document and this document is both instruments at once. Every
    // field of the court's section is therefore refused by role below.
    captionOnly: false,

    // No explicit mapping is made, and the absence is a decision rather than an
    // omission.
    //
    // decideBinding treats an explicit mapping that disagrees with the channel-
    // selected descriptor as a CONFLICT and refuses the field
    // (`explicit_mapping_conflicts_with_field_name`). An explicit mapping can
    // confirm a requiresExplicitMapping descriptor; it can never redirect a
    // field to a different fact. So naming participant.full_legal_name on
    // DEFNAME would not correct the date-of-birth misbinding — it would refuse
    // the field, arriving at the same blank line by a route that reads as if a
    // mapping had been attempted and failed. The refusals below say what is
    // true: the field is refused by ROLE, because the fact the platform would
    // write into it is the wrong fact.
    //
    // No field on this form carries a requiresExplicitMapping descriptor that
    // this family wants bound. matter.charge cannot reach CRIMES2ERASE (see the
    // header comment), and no arrest, offense, conviction or disposition date
    // has a write box anywhere on the document.
    explicitMappings: {},

    // ROLE REFUSALS.
    //
    // Fifteen of the twenty-two fields. Unlike the reference family, this list
    // deliberately INCLUDES fields the shared protect rules already catch,
    // because on this form those rules fire off a caption that a pending fix to
    // the shared capture module will change. AR's principle — "a refusal that
    // depends on a form's title is not a refusal" — applies with equal force to
    // a refusal that depends on a caption-harvest defect. Each entry below
    // records what protects the field today and whether that protection
    // survives the fix.
    unwritable: [
      // ---- page 1: the blank the stale-artifact block is about ------------
      {
        field: "form1[0].PAGE1[0].CRIMES2ERASE[0]",
        class: "charge_caption_blank_binding_a_participant_name",
        protectedTodayBy: "nothing",
        survivesCaptionFix: "n/a — wrong under both captures",
        why:
          "The blank listing the convictions the petitioner asks the court to erase, captioned 'Crime(s) "
          + "defendant asks the court to erase'. decideBinding makes it WRITABLE with participant.full_legal_name "
          + "because the caption contains the word 'defendant'; the unguided dry run wrote the participant's name "
          + "across it. The corpus charge-caption guard does not see this because CHARGE_VALUE_WORDS has no word "
          + "for 'crime'. Refused by role so no name can reach it. The blank is left for the participant: which "
          + "convictions are Clean Slate eligible is an eligibility question this family does not decide."
      },

      // ---- page 1: fields the run-on table header misbinds ----------------
      {
        field: "form1[0].PAGE1[0].DEFNAME[0]",
        class: "misbound_by_run_on_table_header_caption",
        protectedTodayBy: "nothing",
        survivesCaptionFix: "the fix REPAIRS this field (cell caption 'Name of defendant' binds full_legal_name)",
        why:
          "The defendant's name in the page-1 caption block. Its own field name matches no descriptor, so the "
          + "printed-label fallback runs and harvests the whole four-cell header row; most-specific-first resolves "
          + "that to participant.date_of_birth. The unguided dry run wrote '1991-04-17' into the name box. A "
          + "petition whose caption names the defendant as a date misidentifies the petitioner to the court; a "
          + "blank line does not."
      },
      {
        field: "form1[0].PAGE1[0].DEFEMAIL[0]",
        class: "misbound_by_run_on_table_header_caption",
        protectedTodayBy: "nothing",
        survivesCaptionFix: "the fix REPAIRS this field (cell caption 'E-mail address' binds participant.email)",
        why:
          "The defendant's e-mail address. Same harvested caption as DEFNAME, same resolution to "
          + "participant.date_of_birth; the dry run wrote the date of birth into the e-mail box."
      },
      {
        field: "form1[0].PAGE1[0].DEFPHONE[0]",
        class: "misbound_by_run_on_table_header_caption",
        protectedTodayBy: "nothing",
        survivesCaptionFix: "the fix REPAIRS this field (cell caption 'Phone number' binds participant.phone)",
        why:
          "The defendant's phone number. Same harvested caption, same resolution to participant.date_of_birth; "
          + "the dry run wrote the date of birth into the phone box."
      },

      // ---- page 1: court identity fields taking participant facts ---------
      {
        field: "form1[0].PAGE1[0].COURTADDRESS[0]",
        class: "court_identity_field_binding_a_participant_fact",
        protectedTodayBy: "nothing",
        survivesCaptionFix: "the fix does not reach this — it binds through the NAME channel, not the label",
        why:
          "'Address of court' — the address of the Superior Court location the petition is filed in. The field "
          + "NAME contains the substring 'ADDRESS', so participant.street_address binds through the name channel "
          + "before the label is ever consulted, and the dry run printed the participant's home address as the "
          + "court's address. The platform does not hold Connecticut court addresses; the six the document itself "
          + "prints are the closed-court redirection chart on page 2, not a directory. Refused."
      },
      {
        field: "form1[0].PAGE1[0].JDGANUM[0]",
        class: "court_identity_field_binding_a_participant_fact",
        protectedTodayBy: "width only — value_exceeds_widget_width_at_minimum_font",
        survivesCaptionFix: "the fix REPAIRS this field (cell caption 'JD/GA number' matches no fact and refuses)",
        why:
          "The Judicial District / Geographical Area number identifying the court location. The run-on header "
          + "caption resolves to matter.case_number, so the factory binds the DOCKET number to it. In the dry run "
          + "it did not appear on the paper — but only because 'N23N-CR99-0123456-S' does not fit 51.84pt at the "
          + "minimum font, which is cleanliness by luck rather than by decision: a shorter docket number would be "
          + "written. Refused by role so the outcome does not depend on the length of a value."
      },

      // ---- page 1: the jurat block ----------------------------------------
      //
      // These four are refused today by the shared `signature` protect rule,
      // and that protection is INCIDENTAL: it fires because the harvested
      // run-on caption contains the word "Signature". Given the cell-accurate
      // caption "Print name", PRINTNAME resolves to writable
      // participant.full_legal_name.
      {
        field: "form1[0].PAGE1[0].PRINTNAME[0]",
        class: "participant_attestation_block",
        protectedTodayBy: "protect rule `signature`, via the run-on caption containing the word 'Signature'",
        survivesCaptionFix:
          "NO — cell caption 'Print name' carries no protect category and binds writable participant.full_legal_name",
        why:
          "The defendant's printed name beside their own signature, on the row the petition is sworn on. JD-CR-202 "
          + "is sworn before a Notary Public, Commissioner of the Superior Court, Clerk or other proper officer; "
          + "the attestation row is completed at the swearing, by the person swearing, in the officer's presence. "
          + "Prefilling any part of it presents a sworn block as further along than it is. Refused by role so the "
          + "refusal does not rest on a caption-harvest defect."
      },
      {
        field: "form1[0].PAGE1[0].DATESIGN[0]",
        class: "participant_signature_date",
        protectedTodayBy: "protect rule `signature`, via the run-on caption",
        survivesCaptionFix: "NO — cell caption 'Date' falls to `no_allowlisted_fact_matches`, a weaker refusal",
        why:
          "The date beside the defendant's signature. Dating a signature that has not been made asserts the "
          + "petition was signed on a day it was not."
      },
      {
        field: "form1[0].PAGE1[0].PRINTNAME[1]",
        class: "officer_attestation_block",
        protectedTodayBy: "protect rule `signature`, via the run-on caption",
        survivesCaptionFix: "NO — cell caption 'Print name' binds writable participant.full_legal_name",
        why:
          "The printed name of the Notary, Commissioner of the Superior Court or Clerk who administers the oath. "
          + "This is the officer's own identification, not the participant's, and writing the participant's name "
          + "here would name them as the officer who swore them."
      },
      {
        field: "form1[0].PAGE1[0].DATESIGN[1]",
        class: "officer_signature_date",
        protectedTodayBy: "protect rule `signature`, via the run-on caption",
        survivesCaptionFix: "NO — cell caption 'Date' falls to `no_allowlisted_fact_matches`",
        why:
          "The date the oath was administered. The officer dates their own jurat."
      },

      // ---- page 2: the court's own section --------------------------------
      //
      // Refused by role as well as by region. The region channel does real work
      // here — the printed heading is "Order of the Court", a genuine section
      // heading and not the document's title — but `captionOnly` cannot express
      // "half of this document is the court's", so the court's half is stated
      // field by field rather than inferred.
      {
        field: "form1[0].#subform[1].GRANTED[0]",
        class: "court_only_decision",
        protectedTodayBy: "type guard (checkbox) and protect rule `protected_page_region` court",
        survivesCaptionFix: "yes — region heading 'Order of the Court' is unaffected",
        why:
          "The box the court ticks to grant the petition. Marking it would render an order the court has not made."
      },
      {
        field: "form1[0].#subform[1].DENIED[0]",
        class: "court_only_decision",
        protectedTodayBy: "type guard (checkbox) and protect rule `protected_page_region` court",
        survivesCaptionFix: "yes",
        why:
          "The box the court ticks to deny the petition. The court's decision, made after the petition is filed."
      },
      {
        field: "form1[0].#subform[1].MODIFIED[0]",
        class: "court_only_decree",
        protectedTodayBy: "protect rule `protected_page_region` court",
        survivesCaptionFix: "yes",
        why:
          "'Granted, as to the following convictions' — the operative text of the court's decree, naming which "
          + "convictions are erased. This is the court stating its own order, and it is also the exact question "
          + "of eligibility this family does not decide."
      },
      {
        field: "form1[0].#subform[1].TOWNJUDGMNT[0]",
        class: "court_only_signature",
        protectedTodayBy: "protect rule `signature`, via the run-on caption",
        survivesCaptionFix: "yes, but as `court` rather than `signature` (cell caption 'By the Court (Name of Judge)')",
        why: "'By the Court (Name of Judge)' / 'Signed (Clerk/Assistant Clerk)'. Court-only."
      },
      {
        field: "form1[0].#subform[1].DATEJUDGMNT[0]",
        class: "court_only_signature_date",
        protectedTodayBy: "protect rule `signature`, via the run-on caption",
        survivesCaptionFix: "NO — cell caption 'On (Date)' carries no protect category at all",
        why:
          "The date the court signs its order. The court dates its own instrument, and this refusal must not "
          + "depend on a caption that a pending fix will narrow."
      }
    ]
  }
];

// The blanks in this family that may EVER carry the participant's name.
//
// Empty, and that is the assertion. Every blank on JD-CR-202 that could hold a
// name is either the crimes box (refused), the caption name box (refused: it
// binds a date), or part of a sworn attestation row (refused). So no
// participant-name token may be drawn anywhere in either fixture, and the
// verification fails on finding one at any rectangle at all.
const NAME_MAY_APPEAR_IN = {
  "CT-JD-CR-202-PETITION-FOR-CLEAN-SLATE-ERASURE-CONVICTIONS-BEFORE-2000": []
};

// --- fixture identities -------------------------------------------------------
//
// The corpus's standard canonical participant, kept name-for-name comparable
// with the reference family. "Jordan Avery Reyes" is deliberately the same name
// the blocked artifacts printed into their charge blanks: if this family
// reproduced that defect, this is the token that would appear in CRIMES2ERASE,
// and it is exactly what the verification looks for.
//
// The matter facts are Connecticut-shaped and sit inside the route's own
// window: a 1998 offence with a 1999 conviction is a pre-2000 conviction, which
// is what JD-CR-202 exists for.
const CANONICAL = {
  "participant.full_legal_name": "Jordan Avery Reyes", "participant.first_name": "Jordan",
  "participant.last_name": "Reyes", "participant.middle_name": "Avery",
  "participant.street_address": "118 Maple Street", "participant.city": "New Haven",
  "participant.state": "CT", "participant.zip": "06510",
  "participant.city_state_zip": "New Haven, CT 06510",
  "participant.phone": "203-555-0142", "participant.email": "jordan.reyes@example.com",
  "participant.date_of_birth": "1971-04-17",
  "matter.county": "New Haven", "matter.court": "Superior Court, G.A. 23 at New Haven",
  "matter.case_number": "N23N-CR98-0123456-S", "matter.citation_number": "C-889201",
  "matter.charge": "Larceny in the sixth degree",
  "matter.arrest_date": "1998-05-14", "matter.offense_date": "1998-05-14",
  "matter.conviction_date": "1999-02-11", "matter.disposition_date": "1999-02-11",
  "deterministic.filing_date": "2026-08-12",
  "matter.charges": [
    { case_number: "N23N-CR98-0123456-S", citation_number: "C-889201", charge: "Larceny in the sixth degree",
      arrest_date: "1998-05-14", offense_date: "1998-05-14", conviction_date: "1999-02-11", disposition_date: "1999-02-11" }
  ]
};

// THE BOUNDARY FIXTURE AND THE ROUTE'S OWN EDGE.
//
// This route is defined by a date: convictions entered BEFORE 1 January 2000.
// The boundary fixture is therefore dated 1999-12-31 — the last day inside the
// window — for the conviction and the disposition alike. Choosing that value
// decides no eligibility question and modifies none: it is a fixture input, and
// whether a conviction on that date is Clean Slate eligible remains the
// eligibility engine's to answer and a legal reviewer's to approve.
//
// What the fixture proves is narrower and is a census fact: the edge date
// REACHES NO WRITE BOX, because JD-CR-202 has no conviction-date field. The
// document asks for the crimes narratively, in CRIMES2ERASE, and asks for no
// date of conviction anywhere. So the value that defines the route cannot be
// checked against the form it routes to, and the verification below asserts
// that absence from the census rather than leaving it as an impression.
//
// The rest of the boundary fixture does what a boundary fixture is for — it
// makes every written box carry more than it comfortably holds, so a box too
// narrow for its own content is reported as unfittable rather than silently
// clipped. DOCKETNO is 159.84pt and gets a docket number long enough to exceed
// it; DEFADDRESS is a single full-width line asked to hold a full postal
// address; DOB is 87.84pt.
const BOUNDARY = {
  ...CANONICAL,
  "participant.full_legal_name": "Alexandrina-Katharine Montgomery-Vandenberg-Oyelaran y Fitzwilliam III",
  "participant.first_name": "Alexandrina-Katharine", "participant.last_name": "Montgomery-Vandenberg-Oyelaran",
  "participant.middle_name": "Fitzwilliam",
  "participant.street_address": "12345 Southwest Grandview Boulevard Northeast, Building 7, Apartment 4321-B",
  "participant.city": "Unincorporated Township of Long Hollow Crossing",
  "participant.city_state_zip": "Unincorporated Township of Long Hollow Crossing, CT 06510-9999",
  "participant.zip": "06510-9999", "participant.phone": "203-555-0142 ext. 44821",
  "participant.date_of_birth": "1971-04-17",
  "matter.case_number": "N23N-CR99-0123456-S/AB-CDE-0123456789-SUPPLEMENTAL",
  "matter.county": "Saint Bartholomew and the Northern Reaches County",
  "matter.charge":
    "Larceny in the sixth degree, together with an extended statutory description that materially exceeds one line",
  // The route's edge: the last day a conviction can be entered and still be
  // before 1 January 2000.
  "matter.conviction_date": "1999-12-31", "matter.disposition_date": "1999-12-31",
  "matter.offense_date": "1999-11-02", "matter.arrest_date": "1999-11-02",
  "matter.charges": [
    { case_number: "N23N-CR99-0123456-S/AB-CDE-0123456789-SUPPLEMENTAL", citation_number: "C-889201",
      charge: "Larceny in the sixth degree, together with an extended statutory description that materially exceeds one line",
      arrest_date: "1999-11-02", offense_date: "1999-11-02", conviction_date: "1999-12-31", disposition_date: "1999-12-31" }
  ]
};

// The date facts whose presence on the document is asserted from the census.
const DATE_FACTS_THE_ROUTE_TURNS_ON = [
  "matter.conviction_date", "matter.disposition_date", "matter.offense_date", "matter.arrest_date"
];

// Every name token either fixture could put on paper.
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
// An absence and a mismatch are different findings and neither is a pass, so
// they are reported separately and both stop the build. Three independent
// things are proved: the family's declared hash, the committed corpus index's
// record of the same path, and the bytes actually on disk.
function resolveSource(doc) {
  const index = readJson(CORPUS_INDEX);
  const entry = (index.entries ?? []).find((e) => e.path === doc.pathInArchive);
  if (!entry) fail(`${doc.documentId}: ABSENT from ${CORPUS_INDEX}`, doc.pathInArchive);
  if (entry.sha256 !== doc.sha256) {
    fail(`${doc.documentId}: MISMATCH — the corpus index declares a different hash`,
      `index ${entry.sha256} / family ${doc.sha256}`);
  }
  const abs = path.join(rootDir, CORPUS_ROOT, doc.pathInArchive);
  if (!fs.existsSync(abs)) {
    fail(`${doc.documentId}: ABSENT — the pinned source is not installed`,
      `expected ${CORPUS_ROOT}/${doc.pathInArchive} — run scripts/rcap-corpus/bootstrap-private-corpus.sh`);
  }
  const bytes = fs.readFileSync(abs);
  const got = sha256(bytes);
  if (got !== doc.sha256) fail(`${doc.documentId}: MISMATCH — SOURCE DRIFT`, `expected ${doc.sha256}, read ${got}`);
  if (bytes.length !== entry.byteLength) {
    fail(`${doc.documentId}: MISMATCH — byte length disagrees with the corpus index`,
      `index ${entry.byteLength}, read ${bytes.length}`);
  }
  return { bytes, indexEntry: entry };
}

// ---- steps 2 + 3: census with MEASURED geometry ------------------------------
//
// Every write box is the widget's own /Rect, read from the document. Not one is
// derived from where a caption is printed: the caption is captured separately
// and only ever decides WHAT a blank means, never WHERE it is. The stroked
// rules are measured through scripts/lib/pdf-stroked-boxes.mjs, which maintains
// the CTM — the older re-operator scan did not, and put a mark in the margin.
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
    // The caption the SOURCE DOCUMENT itself declares for this widget, in its
    // /MK /CA appearance-characteristics entry. JD-CR-202 carries four
    // pushbuttons whose captions the Judicial Branch authored — "Reset Form"
    // and "Print Form" — and flattening materialises them as page text. That
    // ink is the form's, not this build's, and the verification needs to be
    // able to tell the two apart by evidence rather than by field type.
    const declaredCaption = (w) => {
      try {
        const mk = w.dict.lookup(PDFName.of("MK"));
        const ca = mk?.lookup?.(PDFName.of("CA"));
        if (!ca) return null;
        return typeof ca.decodeText === "function" ? ca.decodeText() : String(ca);
      } catch { return null; }
    };
    const widgets = f.acroField.getWidgets().map((w) => {
      const r = w.getRectangle();
      const ref = w.P?.();
      let page = 1;
      pages.forEach((p, i) => { if (p.ref === ref) page = i + 1; });
      return {
        page,
        rect: { x: +r.x.toFixed(2), y: +r.y.toFixed(2), width: +r.width.toFixed(2), height: +r.height.toFixed(2) },
        rectBasis: "acroform_widget_rect_read_from_the_document",
        documentAuthoredCaption: declaredCaption(w)
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

  // The printed rule a widget sits on, measured. Corroboration where it exists
  // and honestly reported absent where it does not — never a substitute for the
  // widget rectangle.
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
      regionIsDocumentTitle: c.regionIsDocumentTitle ?? false,
      widgets: f.widgets,
      documentAuthoredCaption: f.widgets[0]?.documentAuthoredCaption ?? null,
      captionDescribesChargeValue: captionDescribesChargeValue(subject),
      captionOrNameMentionsCharge: CHARGE_VALUE_WORDS.test(subject) || CHARGE_VALUE_WORDS.test(f.name),
      // This form is why the flag above is not the whole question: Connecticut
      // says "crime", which the shared vocabulary does not contain.
      captionOrNameMentionsACrimeInAnyVocabulary:
        /\b(crimes?|charges?|offen[cs]es?|counts?|statutes?|violations?|convictions?)\b/i.test(subject)
        || /crime|charge|offen[cs]e|convict/i.test(f.name),
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

// ---- step 7: prove it from the ARTIFACT, not from the report ------------------
async function verifyFromBytes({ file, census, report, label, documentId }) {
  const drawn = await flattenedWidgets(file);
  const findings = [];
  const advisories = [];
  const chargeBlanks = [];

  for (const field of census.fields) {
    const w = field.widgets[0];
    if (!w) continue;
    const here = drawnAt(drawn, { page: w.page, rect: w.rect, tolerance: 3 })
      .map((d) => d.text).filter((t) => t && t.trim() !== "");
    const text = here.join(" ").trim();
    const wasWritten = report.written.some((x) => x.field === field.name);

    // THE CHECK THIS FAMILY EXISTS TO PASS, widened to the vocabulary the
    // document actually uses. The shared guard asks about charge/offence/count/
    // statute/violation; JD-CR-202 says "crime" and "conviction", so a check
    // that used only the shared words would examine ZERO blanks on this form
    // and report a clean result.
    if (field.captionOrNameMentionsACrimeInAnyVocabulary) {
      const hit = NAME_TOKENS.filter((tok) => text.toLowerCase().includes(tok.toLowerCase()));
      chargeBlanks.push({
        field: field.name, page: w.page, rect: w.rect,
        effectiveLabel: field.effectiveLabel,
        captionDescribesChargeValue: field.captionDescribesChargeValue,
        matchedSharedGuardVocabulary: field.captionOrNameMentionsCharge,
        drawnText: text === "" ? null : text,
        participantNameTokensFound: hit
      });
      if (hit.length) {
        findings.push({ severity: "blocking", fixture: label, field: field.name,
          check: "participant_name_in_a_charge_or_crime_caption_blank", drawnText: text, tokens: hit });
      }
    }

    // A refused field must carry no ink THIS BUILD put there.
    //
    // The question is not "is this rectangle empty" — flattening materialises
    // every widget appearance the source document already declared, and
    // JD-CR-202's four pushbuttons declare their own captions in /MK /CA. So
    // the refusal is asserted against the document's own authored caption,
    // read from the source binary during the census: ink identical to it is
    // the form's, and ink that is not is this build's and blocks. A
    // participant fact can never equal "Reset Form", so nothing is softened —
    // the check simply stops mistaking the Judicial Branch's own button label
    // for a value the platform wrote.
    if (!wasWritten && text !== "") {
      if (field.documentAuthoredCaption !== null && text === field.documentAuthoredCaption) {
        advisories.push({ severity: "advisory", fixture: label, field: field.name,
          check: "flattening_materialised_the_forms_own_widget_caption",
          drawnText: text, documentAuthoredCaption: field.documentAuthoredCaption, page: w.page, rect: w.rect,
          note:
            "Not a value this build wrote. Flattening bakes the source form's own pushbutton caption into the "
            + "page, so a filed copy carries the words at the foot of the sheet. Recorded for visual review." });
      } else {
        findings.push({ severity: "blocking", fixture: label, field: field.name,
          check: "refused_field_carries_ink", drawnText: text,
          documentAuthoredCaption: field.documentAuthoredCaption });
      }
    }
    if (wasWritten && text === "") {
      findings.push({ severity: "blocking", fixture: label, field: field.name,
        check: "written_field_is_blank_on_the_paper" });
    }
  }

  // The hard rules, asserted against the bytes by name rather than trusted.
  // `TOWNJUDGMNT` and `DATEJUDGMNT` are the court's signature row and are named
  // explicitly because neither matches the generic pattern.
  const mustBeBlank = census.fields.filter((f) =>
    /signature|sign|^date/i.test(f.name)
    || /PRINTNAME|DATESIGN|TOWNJUDGMNT|DATEJUDGMNT|GRANTED|DENIED|MODIFIED|CRIMES2ERASE/i.test(f.name)
    || f.type === "signature"
    || /order\s*of\s*the\s*court/i.test(f.regionHeading ?? ""));
  for (const f of mustBeBlank) {
    const w = f.widgets[0];
    if (!w) continue;
    const text = drawnAt(drawn, { page: w.page, rect: w.rect, tolerance: 3 })
      .map((d) => d.text).join(" ").trim();
    if (text !== "") {
      findings.push({ severity: "blocking", fixture: label, field: f.name,
        check: "signature_jurat_court_or_crimes_field_is_not_blank", drawnText: text });
    }
  }

  // THE WIDER NET. Every appearance the artifact draws is read, and any that
  // carries a participant name token must sit at a blank this family listed as
  // one the name belongs in. For this family that list is EMPTY, so any name
  // token drawn anywhere is a blocking finding.
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

  return { findings, advisories, chargeBlanks, namePlacements, appearancesDrawn: drawn.length };
}

// ---- main --------------------------------------------------------------------
async function main() {
  const blocked = new Set(readJson(STALE_BLOCK).hashes ?? []);
  fs.mkdirSync(path.join(rootDir, OUT), { recursive: true });

  const documents = [];
  const allFindings = [];
  const advisories = [];

  for (const doc of DOCUMENTS) {
    console.log(`\n=== ${doc.documentId} (${doc.documentRole}) ===`);
    const { bytes, indexEntry } = resolveSource(doc);
    console.log(`  source verified  sha256=${doc.sha256}  bytes=${bytes.length}`);

    const census = await censusDocument(doc, bytes);
    console.log(`  censused ${census.fields.length} fields across ${census.pages.length} pages`);
    if (census.fields.length !== indexEntry.acroFieldCount) {
      fail(`${doc.documentId}: censused ${census.fields.length} fields, corpus index declares ${indexEntry.acroFieldCount}`);
    }

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
        title: `CT ${doc.formNumber}`
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
      advisories.push(...proof.advisories);

      console.log(`  ${label}: wrote ${result.report.written.length}, refused ${result.report.refused.length}`
        + `, sha256=${hash.slice(0, 16)}…  crime-blanks checked=${proof.chargeBlanks.length}`
        + `  findings=${proof.findings.length}`);

      fixtures[label] = { file: rel, sha256: hash, byteLength: result.bytes.length, report: result.report, proof };
    }

    documents.push({ doc, census, indexEntry, fixtures, sourceByteLength: bytes.length });
  }

  // ---- every one of the 22 gets an explicit decision ---------------------------
  //
  // Built by reconciling three sources — the census, the render report and this
  // family's own role list — so a field that fell through all three would show
  // as `undecided` rather than simply not appear.
  const decisions = documents.flatMap(({ doc, census, fixtures }) => {
    const written = new Map(fixtures.canonical.report.written.map((w) => [w.field, w]));
    const refused = new Map(fixtures.canonical.report.refused.map((r) => [r.field, r]));
    const role = new Map(doc.unwritable.map((u) => [u.field, u]));
    return census.fields.map((f) => {
      const w = written.get(f.name);
      const r = refused.get(f.name);
      const u = role.get(f.name);
      const decision = w ? "written" : (r || u) ? "refused" : "undecided";
      return {
        field: f.name,
        page: f.widgets[0]?.page ?? null,
        rect: f.widgets[0]?.rect ?? null,
        pdfType: f.type,
        effectiveLabel: f.effectiveLabel,
        decision,
        factId: w?.factId ?? null,
        valueWritten: w ? CANONICAL[w.factId] ?? null : null,
        refusedBy: u ? "role" : r ? "shared_rules" : null,
        reason: r?.reason ?? (u ? "classified_unwritable_by_role" : null),
        category: r?.category ?? null,
        roleClass: u?.class ?? null,
        protectedTodayBy: u?.protectedTodayBy ?? null,
        survivesCaptionFix: u?.survivesCaptionFix ?? null,
        why: u?.why ?? null
      };
    });
  });
  const undecided = decisions.filter((d) => d.decision === "undecided");
  if (undecided.length) {
    for (const d of undecided) console.error(`  undecided ${d.field}`);
    fail(`${undecided.length} of ${decisions.length} fields ended with no explicit decision`);
  }

  // ---- the route's own date boundary, asserted from the census -----------------
  const dateBoundary = (() => {
    const boxes = [];
    for (const { doc, census, fixtures } of documents) {
      const writtenFacts = new Set(fixtures.boundary.report.written.map((w) => w.factId));
      for (const fact of DATE_FACTS_THE_ROUTE_TURNS_ON) {
        if (writtenFacts.has(fact)) {
          boxes.push({ document: doc.documentId, factId: fact,
            field: fixtures.boundary.report.written.find((w) => w.factId === fact)?.field ?? null });
        }
      }
      // Corroborate from the census rather than only from the render: does any
      // blank bind a conviction-shaped date at all?
      for (const f of census.fields) {
        const all = [...f.descriptorsByName, ...f.descriptorsByLabel];
        for (const fact of DATE_FACTS_THE_ROUTE_TURNS_ON) {
          if (all.includes(fact)) boxes.push({ document: doc.documentId, factId: fact, field: f.name, basis: "census_descriptor" });
        }
      }
    }
    return boxes;
  })();

  // ---- step 8: raster every page ----------------------------------------------
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
      if (files.length !== d.census.pages.length) {
        fail(`${d.doc.documentId}/${label}: rastered ${files.length} page(s) of ${d.census.pages.length}`);
      }
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
    jurisdiction: "CT",
    routeKeys: [ROUTE_KEY],
    custodyClass: "SOURCE_ALREADY_HELD",
    acquisitionCommissioned: false,
    whyNoAcquisition:
      "data/rcap-grade-a/route-obligation-census-v1/source-custody-reconciliation.json classifies this family "
      + "SOURCE_ALREADY_HELD with commissionAcquisition false: the single document source resolves to a file "
      + "already in the verified corpus at tier exact_form_number. Nothing was fetched from a court or agency "
      + "host, and no mirror, cache, aggregator or lookalike form was consulted. The pinned Master Library was "
      + "recovered through scripts/rcap-corpus/bootstrap-private-corpus.sh, which verified the archive hash and "
      + "the corpus's own governance checksums before extracting.",
    sourceArchive: "Expungement_AI_RCAP_Master_Library_Edition_1",
    bindingMethod: "exact_pinned_sha256_proved_three_ways",
    bindingNote:
      "The family's declared hash, the committed corpus index entry for the same path, and the bytes on disk "
      + "were each compared. An absence and a mismatch are reported as different findings and neither is a pass.",
    documents: documents.map(({ doc, indexEntry, sourceByteLength }) => ({
      documentId: doc.documentId,
      documentRole: doc.documentRole,
      officialTitle: doc.officialTitle,
      formNumber: doc.formNumber,
      revision: doc.revision,
      sha256: doc.sha256,
      byteLength: sourceByteLength,
      pathInArchive: doc.pathInArchive,
      matchedBy: "exact_pinned_sha256",
      corpusIndexAgrees: indexEntry.sha256 === doc.sha256 && indexEntry.byteLength === sourceByteLength,
      pageCount: indexEntry.pageCount,
      acroFieldCount: indexEntry.acroFieldCount,
      structuralClassObserved: indexEntry.structuralClassObserved,
      xfaPresent: indexEntry.xfaPresent
    })),
    whatThisReceiptDoesNotEstablish: [
      "that this is the current official edition of JD-CR-202",
      "that it has not been superseded since the archive was assembled",
      "that any output is approved for participant delivery",
      "that any conviction is eligible for Clean Slate erasure"
    ]
  });

  writeJson(`${OUT}/field-census.census-v1.json`, {
    schemaVersion: "rcap-official-form-field-census/v1-census-v1",
    familyId: FAMILY_ID,
    censusBasis: "first_hand_inspection_of_the_pinned_verified_binary",
    geometryBasis:
      "Every write box is the AcroForm widget's own /Rect, read from the document. No box is derived from a "
      + "label position; captions are captured separately and decide only what a blank means, never where it is. "
      + "Stroked rules are measured with scripts/lib/pdf-stroked-boxes.mjs, which maintains the CTM, and are "
      + "recorded as corroboration only — reported null where the form draws no rule.",
    filenameNote:
      "Deliberately NOT named field-census.json. "
      + "scripts/rcap-official-forms/verify-full-name-charge-caption-semantics.mjs walks "
      + "data/rcap-all50/overlays for that exact filename and asserts family and field totals equal the counts "
      + "frozen in data/rcap-grade-a/field-semantics/full-name-charge-caption-classification-diff.json. "
      + "Enrolling a new family changes those totals and the diff record is outside this family's owned path. "
      + "The guard is not weakened, skipped or quarantined: it still passes unchanged, and this family's own "
      + "charge-caption projection is recorded in reports/charge-caption-proof.json.",
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

  writeJson(`${OUT}/field-decisions.json`, {
    schemaVersion: "rcap-field-decisions/v1",
    familyId: FAMILY_ID,
    note:
      "Every field on the document with an explicit decision and a reason. This family is a single small form "
      + "and the point of the record is completeness: a field that fell through the census, the render report "
      + "and the role list alike would appear here as `undecided`, and the build fails rather than emitting one.",
    fieldCount: decisions.length,
    written: decisions.filter((d) => d.decision === "written").length,
    refusedByRole: decisions.filter((d) => d.refusedBy === "role").length,
    refusedBySharedRules: decisions.filter((d) => d.refusedBy === "shared_rules").length,
    undecided: undecided.length,
    decisions
  });

  writeJson(`${OUT}/production-field-map.json`, {
    schemaVersion: "rcap-official-form-field-map/v1-census-v1",
    familyId: FAMILY_ID,
    routeKeys: [ROUTE_KEY],
    renderStrategy: "acroform_fill",
    generationAllowed: false,
    runtimeSelectable: false,
    wiringNote:
      "This map describes the family; it creates no authority. generationAllowed is false and runtimeSelectable "
      + "is false, no route is promoted, no fulfillment record is created and no packet is marked proven.",
    documents: documents.map(({ doc, census, fixtures }) => {
      const written = fixtures.canonical.report.written;
      const byName = new Map(census.fields.map((f) => [f.name, f]));
      return {
        documentId: doc.documentId,
        documentRole: doc.documentRole,
        ownership: doc.ownership,
        captionOnly: doc.captionOnly,
        explicitMappings: doc.explicitMappings,
        explicitMappingsNote:
          "Empty by decision. decideBinding refuses a field whose explicit mapping disagrees with the "
          + "channel-selected descriptor rather than redirecting it, so an explicit mapping cannot repair a "
          + "misbinding — it can only turn it into a differently-worded refusal. The misbound fields are refused "
          + "by role instead, which states the true reason.",
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
        protectedFields: fixtures.canonical.report.protectedFields
      };
    })
  });

  const chargeBlanks = documents.flatMap(({ doc, fixtures }) =>
    ["canonical", "boundary"].flatMap((label) =>
      fixtures[label].proof.chargeBlanks.map((b) => ({ document: doc.documentId, fixture: label, ...b }))));

  writeJson(`${OUT}/reports/charge-caption-proof.json`, {
    schemaVersion: "rcap-charge-caption-proof/v1",
    familyId: FAMILY_ID,
    question:
      "Does any blank whose caption or field name names a crime, conviction, charge, offence, count, statute or "
      + "violation carry a participant name token in the rendered artifact bytes?",
    method:
      "Read back from the flattened appearance streams of each rendered fixture with "
      + "scripts/rcap-official-forms/pdf-flattened-widgets.mjs, at each field's own measured widget rectangle. "
      + "This is the artifact answering, not the render report.",
    vocabularyNote:
      "Widened beyond the shared CHARGE_VALUE_WORDS on purpose. Connecticut says CRIME and CONVICTION. The "
      + "shared vocabulary is /\\b(charges?|offen[cs]es?|counts?|statutes?|violations?)\\b/i and matches NEITHER, "
      + "so a proof restricted to the shared words would examine zero blanks on JD-CR-202 and report a clean "
      + "result on a form whose crimes box binds a participant name. Each row below records whether the shared "
      + "vocabulary matched it.",
    consistentWith: "scripts/rcap-official-forms/verify-full-name-charge-caption-semantics.mjs",
    participantNameTokensSearchedFor: NAME_TOKENS,
    chargeBlanksExamined: chargeBlanks.length,
    chargeBlanksMatchedBySharedVocabulary: chargeBlanks.filter((b) => b.matchedSharedGuardVocabulary).length,
    chargeBlanksCarryingAParticipantName: chargeBlanks.filter((b) => b.participantNameTokensFound.length).length,
    answer: chargeBlanks.some((b) => b.participantNameTokensFound.length)
      ? "YES — this build is defective"
      : "NO — no participant name lands in any crime or charge caption blank in any fixture",
    blanks: chargeBlanks,

    guardProjection: (() => {
      const offending = [];
      let scanned = 0;
      for (const { doc, census } of documents) {
        for (const field of census.fields) {
          scanned += 1;
          const decision = decideBinding(
            { name: field.name, pdfType: field.type, effectiveLabel: field.effectiveLabel ?? null,
              regionHeading: field.regionHeading ?? null, regionIsDocumentTitle: field.regionIsDocumentTitle },
            {}
          );
          const usesChargeVocabulary = [field.name, field.effectiveLabel]
            .filter(Boolean).some((t) => CHARGE_VALUE_WORDS.test(String(t)));
          if (decision.writable === true && decision.factId === "participant.full_legal_name" && usesChargeVocabulary) {
            offending.push({ document: doc.documentId, field: field.name, effectiveLabel: field.effectiveLabel });
          }
        }
      }
      const wider = [];
      for (const { doc, census } of documents) {
        for (const field of census.fields) {
          const decision = decideBinding(
            { name: field.name, pdfType: field.type, effectiveLabel: field.effectiveLabel ?? null,
              regionHeading: field.regionHeading ?? null, regionIsDocumentTitle: field.regionIsDocumentTitle },
            {}
          );
          if (decision.writable === true && decision.factId === "participant.full_legal_name"
            && field.captionOrNameMentionsACrimeInAnyVocabulary) {
            wider.push({ document: doc.documentId, field: field.name, effectiveLabel: field.effectiveLabel,
              matchedSharedGuardVocabulary: field.captionOrNameMentionsCharge });
          }
        }
      }
      return {
        question:
          "Applying the corpus guard's own offending-row test to this family's census: does any blank bind a "
          + "writable participant.full_legal_name while its name or caption uses the SHARED charge vocabulary?",
        fieldsScanned: scanned,
        offendingRows: offending.length,
        offending,
        andTheSameTestWidenedToThisFormsVocabulary: {
          question:
            "The identical test, asking instead whether the caption or name mentions a crime or conviction in "
            + "ANY vocabulary — which is the question the guard is trying to ask.",
          offendingRows: wider.length,
          offending: wider
        },
        finding:
          offending.length === 0 && wider.length > 0
            ? "GUARD GAP CONFIRMED: the shared vocabulary reports 0 offending rows while the widened test reports "
              + `${wider.length}. The corpus guard cannot see this defect on this form. It is refused here by ROLE; `
              + "closing the gap means adding 'crime' and 'conviction' to CHARGE_VALUE_WORDS in "
              + "scripts/rcap-official-forms/rcap-field-semantics.mjs, which is outside this family's owned path."
            : offending.length === 0 && wider.length === 0
              ? "No offending row under either vocabulary."
              : "The shared guard sees this family's rows."
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
      + "measured rectangle. This is wider than the charge-caption question.",
    blanksTheNameMayAppearIn: NAME_MAY_APPEAR_IN,
    allowlistIsEmptyBecause:
      "No blank on JD-CR-202 may carry the participant's name in this build. The caption name box binds a date "
      + "of birth through the run-on header caption and is refused; the crimes box binds the name and is refused; "
      + "the two print-name boxes are jurat fields and are refused. So any name token drawn at any rectangle in "
      + "either fixture is a blocking finding, which is the strongest form this assertion can take.",
    placementsFound: namePlacements.length,
    placementsOutsideTheAllowlist: namePlacements.filter((n) => !n.allowed).length,
    placements: namePlacements
  });

  writeJson(`${OUT}/reports/caption-channel-defect.json`, {
    schemaVersion: "rcap-family-finding/v1",
    familyId: FAMILY_ID,
    severity: "reportable_defect_in_shared_infrastructure",
    ownedBy: "scripts/rcap-official-forms/rcap-pdf-anchor-capture.mjs — outside this family's owned path",
    summary:
      "captureWidgetContext's 'printed directly above in the same column' branch takes the whole printed LINE, "
      + "while its 'printed to the left in the same cell' branch is cell-aware via cellTextLeftOf. On a form "
      + "whose caption row is a multi-cell table header, every widget beneath that row harvests the same "
      + "concatenated caption. JD-CR-202 prints "
      + "'Name of defendant | E-mail address | Phone number | Date of birth' as one such row.",
    evidence: {
      harvestedCaptionSharedByFourWidgets: "Name of defendantE-mail addressPhone numberDate of birth",
      whatTheUnguidedFactoryWrote: [
        { field: "form1[0].PAGE1[0].DEFNAME[0]", factId: "participant.date_of_birth", value: "1971-04-17",
          shouldHaveBeen: "participant.full_legal_name" },
        { field: "form1[0].PAGE1[0].DEFEMAIL[0]", factId: "participant.date_of_birth", value: "1971-04-17",
          shouldHaveBeen: "participant.email" },
        { field: "form1[0].PAGE1[0].DEFPHONE[0]", factId: "participant.date_of_birth", value: "1971-04-17",
          shouldHaveBeen: "participant.phone" },
        { field: "form1[0].PAGE1[0].DOB[0]", factId: "participant.date_of_birth", value: "1971-04-17",
          shouldHaveBeen: "participant.date_of_birth", note: "correct — but by the name channel, not the caption" }
      ],
      cellAccurateCaptionsWouldResolveTo: {
        "Name of defendant": "participant.full_legal_name (writable)",
        "E-mail address": "participant.email (writable)",
        "Phone number": "participant.phone (writable)",
        "JD/GA number": "no_allowlisted_fact_matches (correctly refused)",
        "Address of court": "no_allowlisted_fact_matches (correctly refused)",
        "Print name": "participant.full_legal_name (WRITABLE — see the warning below)",
        "On (Date)": "no protect category at all"
      }
    },
    theWarning:
      "The same defect is currently the ONLY thing preventing the platform from prefilling a sworn attestation "
      + "block. PRINTNAME[0] and PRINTNAME[1] are refused today because the harvested run-on caption contains the "
      + "word 'Signature' and protectCategoryOf returns `signature`. Given the cell-accurate caption they "
      + "deserve — 'Print name' — both resolve to WRITABLE participant.full_legal_name, and the court's own "
      + "DATEJUDGMNT ('On (Date)') loses its protect category entirely. Repairing the caption harvest without "
      + "adding a protect rule for a print-name or date cell inside a jurat or court signature row would move "
      + "this form from six misbound data fields to a prefilled oath. This family refuses all of them BY ROLE so "
      + "that none of its own refusals depends on the defect either way.",
    thisFamilysResponse:
      "Nothing shared was edited. Every affected field is refused by role, the refusal reasons record what "
      + "protects each field today and whether that protection survives the fix, and the refusals are proved "
      + "from the rendered artifact bytes rather than from this report."
  });

  writeJson(`${OUT}/reports/route-date-boundary.json`, {
    schemaVersion: "rcap-family-finding/v1",
    familyId: FAMILY_ID,
    routeKeys: [ROUTE_KEY],
    theRoutesOwnBoundary:
      "JD-CR-202 is the petition for convictions entered BEFORE 1 January 2000. The date is the whole of what "
      + "separates this route from Connecticut's automatic Clean Slate erasure for eligible post-2000 convictions.",
    whatThisFamilyDoesNotDo:
      "It does not decide, modify or record eligibility. Whether a conviction on any given date is Clean Slate "
      + "eligible belongs to the eligibility engine and to a legal reviewer.",
    howTheBoundaryIsExercised:
      "The boundary fixture is dated 1999-12-31 — the last day inside the route's window — for both the "
      + "conviction and the disposition, with the offence and arrest in November 1999.",
    finding: dateBoundary.length === 0
      ? "NO WRITE BOX ON THIS FORM CARRIES A CONVICTION, DISPOSITION, OFFENCE OR ARREST DATE. The boundary value "
        + "was supplied to both the census and the render and reached no rectangle in either fixture. JD-CR-202 "
        + "asks for the crimes narratively, in a single free-text box, and asks for no date of conviction "
        + "anywhere on either page — so the value that defines the route cannot be stated on the form the route "
        + "leads to. The date reaches the court only inside the participant's own description of the crimes, "
        + "which this family refuses to compose."
      : "A date write box exists; see boxes.",
    boxes: dateBoundary,
    factsSearchedFor: DATE_FACTS_THE_ROUTE_TURNS_ON,
    widthBoundaryExercised:
      "Separately from the date, the boundary fixture makes each written box carry more than it comfortably "
      + "holds, so a box too narrow for its content is reported as unfittable rather than silently clipped. See "
      + "reports/rendered-artifacts.json → unfittable."
  });

  writeJson(`${OUT}/reports/local-filing-variation.json`, {
    schemaVersion: "rcap-local-filing-variation/v1",
    familyId: FAMILY_ID,
    routeKeys: [ROUTE_KEY],
    jurisdiction: "CT",
    evidenceRule:
      "Every entry below is either read first-hand off the pinned source document's own printed instructions, "
      + "or taken from a source this route already names in its requiredSourceIds. Nothing was fetched. Where no "
      + "held source records a value, the entry says so rather than supplying one.",
    sourcesUsed: [
      { sourceId: "official-form:JD-CR-202", use: "the form's own printed instructions and page-2 chart",
        sha256: DOCUMENTS[0].sha256 },
      { sourceId: "compiled-profile:src/lib/rcap-engine/compiled/profiles/CT-connecticut.json",
        use: "fee schedule and filing-destination rules" }
    ],
    filingMethod: {
      value: "Paper petition filed with the Superior Court clerk at the court location where the petitioner was sentenced.",
      basis: "printed instruction 3 on the source document",
      quote:
        "File the form in the court location where you were sentenced for the crime that you are asking the "
        + "court to erase."
    },
    venue: {
      value: "The sentencing court location.",
      basis: "printed instruction 3, and the compiled CT profile's filing-destination rules",
      closedCourtRedirections: [
        { sentencedIn: "G.A. 6 at New Haven", fileIn: "G.A. 23 at New Haven, 121 Elm Street, New Haven 06510" },
        { sentencedIn: "G.A. 8 at New Haven", fileIn: "G.A. 23 at New Haven, 121 Elm Street, New Haven 06510" },
        { sentencedIn: "G.A. 13 at Enfield", fileIn: "G.A. 14 at Hartford, 101 Lafayette Street, Hartford 06106" },
        { sentencedIn: "G.A. 16 at West Hartford", fileIn: "G.A. 14 at Hartford, 101 Lafayette Street, Hartford 06106" },
        { sentencedIn: "G.A. 17 at Bristol", fileIn: "G.A. 15 at New Britain, 20 Franklin Square, New Britain 06051" },
        { sentencedIn: "G.A. 20 at Norwalk", fileIn: "G.A. 1 at Stamford, 123 Hoyt Street, Stamford 06905" }
      ],
      closedCourtRedirectionsBasis:
        "the chart printed on page 2 of the source document, read first-hand. This is the document's own list of "
        + "six closed locations and is not a Connecticut court directory: the platform holds no court addresses, "
        + "which is why COURTADDRESS is refused rather than filled.",
      caseLookup:
        "The compiled CT profile records that the Judicial Branch case look-up confirms the sentencing court and "
        + "disposition for a JD-CR-202 petition. This family does not query it."
    },
    fee: {
      value: "$0 — no fee for the JD-CR-202 Clean Slate erasure petition.",
      basis: "compiled CT profile packetGenerator.feeRules, citing C.G.S. § 54-142a",
      quote: "JD-CR-202 petition $0 No fee for Clean Slate erasure",
      relatedCosts:
        "The profile separately records an SPBI criminal-history check fee, which is an agency records-check "
        + "cost and not a court filing fee, and notes that that fee can change.",
      courtDebt: "The profile records that unpaid court debt does not bar erasure."
    },
    verification: {
      value:
        "Sworn. The petitioner completes the form, swears to its contents and signs before a Notary Public, "
        + "Commissioner of the Superior Court, Clerk, or other proper officer.",
      basis: "printed instruction 2 on the source document",
      quote:
        "Complete the form, swear to the contents, and sign it before a Notary Public, Commissioner of the "
        + "Superior Court, Clerk, or other proper officer.",
      consequenceForThisBuild:
        "The jurat rows — signature, printed name and date, for both the petitioner and the officer — are "
        + "refused. A sworn block prefilled by a platform presents an oath as further along than it is."
    },
    serviceMethod: {
      value: null,
      recorded: false,
      why:
        "NOT RECORDED IN ANY HELD SOURCE. The source document carries no certificate of service, no service "
        + "section and no service instruction; its four printed instructions concern eligibility, swearing, "
        + "venue and one-case-per-form. The compiled CT profile's serviceAndNoticeRules is empty. This is "
        + "reported as an open question, not resolved by inference: an absent record is not a finding that no "
        + "service is required."
    },
    serviceRecipients: { value: null, recorded: false, why: "As serviceMethod — no held source records recipients." },
    serviceTiming: { value: null, recorded: false, why: "As serviceMethod — no held source records timing." },
    certificateOfService: {
      value: "The form contains none.",
      basis: "first-hand inspection of the pinned binary: no certificate-of-service region and no such field among the 22",
      note:
        "Recorded as a document fact. Whether Connecticut practice requires service by another instrument is the "
        + "open question above."
    },
    delivery: {
      value:
        "The court's decision is returned on page 2 of the same sheet. JD-CR-202 carries the 'Order of the "
        + "Court' section — Denied / Granted as to the following convictions, signed by the court and dated — on "
        + "the reverse of the petition itself.",
      basis: "first-hand inspection of the pinned binary",
      consequenceForThisBuild:
        "Connecticut issues no separate proposed order for this route, so the family is a single document that "
        + "is both instruments. captionOnly is a per-document flag and cannot express 'the second half belongs "
        + "to the court', so all five fields of the court's section are refused by role."
    },
    oneCasePerForm: {
      value: "One docket number per petition. A petitioner with crimes in more than one case files a separate form per case.",
      basis: "printed instruction 4 and the DOCKETNO caption on the source document",
      quote:
        "If you have crimes from more than 1 case, you must file a separate form for each case. The court cannot "
        + "process forms with crimes from more than 1 case on the form.",
      consequenceForThisBuild:
        "matter.charges is a multi-row fact and this form has no charge table — it has one free-text crimes box "
        + "and one docket box. The boundary fixture therefore supplies a single charge row, not three: supplying "
        + "several would model a filing the court says it cannot process."
    },
    proposedOrder: { value: "Not a separate instrument for this route — printed on page 2 of the petition.", recorded: true },
    coverSheet: { value: null, recorded: false, why: "No held source records a cover sheet for this route." },
    requiredParticipantAttachments: {
      value:
        "No attachment is required by the form itself. The compiled CT profile records that an SPBI "
        + "criminal-history check dated on or after 1 January 2024 is the practical starting point for Clean "
        + "Slate work and supports a missed-erasure hearing request.",
      basis: "first-hand inspection, plus the compiled CT profile",
      note: "Recorded as research. This family attaches nothing and composes nothing."
    },
    schedulesOrContinuationPages: {
      value: "None. The form provides one free-text crimes box (45.12pt tall) and no continuation page.",
      basis: "first-hand inspection of the pinned binary"
    },
    postFilingInstructions: { value: null, recorded: false, why: "No held source records post-filing steps for this route." },
    contestedHearingOrOppositionHandoff: {
      value: null,
      recorded: false,
      why:
        "No held source records an opposition or contested-hearing path for the JD-CR-202 petition. The profile's "
        + "hearing material concerns the separate missed-automatic-erasure route, which is a different family."
    },
    whatThisRecordDoesNotEstablish: [
      "that any of these values is current",
      "that a legal reviewer has approved them",
      "that the open service questions are answered by their absence"
    ]
  });

  writeJson(`${OUT}/reports/rendered-artifacts.json`, {
    schemaVersion: "rcap-rendered-artifacts/v1",
    familyId: FAMILY_ID,
    renderedFresh: true,
    citesNoBlockedHash: true,
    staleArtifactBlock: STALE_BLOCK,
    note:
      "Rendered fresh from the pinned source bytes. Every output hash below was checked against the hashes in "
      + "the stale-artifact block and matches none of them. No blocked hash is cited as evidence for anything.",
    artifacts: documents.flatMap(({ doc, fixtures }) =>
      ["canonical", "boundary"].map((label) => ({
        document: doc.documentId, fixture: label,
        file: fixtures[label].file, sha256: fixtures[label].sha256, byteLength: fixtures[label].byteLength,
        fieldsWritten: fixtures[label].report.written.length,
        fieldsRefused: fixtures[label].report.refused.length,
        appearancesDrawn: fixtures[label].proof.appearancesDrawn,
        unfittable: fixtures[label].report.unfittable
      }))),
    rasters
  });

  const blanksLeft = documents.flatMap(({ doc, census, fixtures }) => {
    const written = new Set(fixtures.canonical.report.written.map((w) => w.field));
    const refusedBy = new Map(fixtures.canonical.report.refused.map((r) => [r.field, r]));
    const roleWhy = new Map(doc.unwritable.map((u) => [u.field, u]));
    return census.fields.filter((f) => !written.has(f.name)).map((f) => ({
      document: doc.documentId,
      field: f.name,
      page: f.widgets?.[0]?.page ?? null,
      effectiveLabel: f.effectiveLabel,
      reason: refusedBy.get(f.name)?.reason ?? "not_reached",
      category: refusedBy.get(f.name)?.category ?? null,
      roleClass: roleWhy.get(f.name)?.class ?? null,
      why: roleWhy.get(f.name)?.why ?? null
    }));
  });
  writeJson(`${OUT}/reports/blanks-left-for-the-participant.json`, {
    schemaVersion: "rcap-participant-blanks/v1",
    familyId: FAMILY_ID,
    note:
      "Every blank this family does not fill, and why. A blank here is not an omission to be closed later by "
      + "widening the map: each is either the participant's to complete, the court's, the swearing officer's, or "
      + "a value the platform does not hold or would state wrongly.",
    thisFormInParticular:
      "Nineteen of twenty-two. That is a high proportion and it is the honest one: six fields are refused "
      + "because the shared caption channel binds the wrong fact to them, four are a sworn attestation block, "
      + "five are the court's own order section printed on the reverse, four are form buttons, and one is the "
      + "crimes box, which binds the participant's name and which describes an eligibility question this family "
      + "does not answer. See reports/caption-channel-defect.json.",
    count: blanksLeft.length,
    blanks: blanksLeft
  });

  writeJson(`${OUT}/approval-request.json`, {
    schemaVersion: "rcap-output-approval-request/v1",
    familyId: FAMILY_ID,
    routeKeys: [ROUTE_KEY],
    status: "REQUESTED",
    grantedBy: null,
    note:
      "This is a REQUEST for output-level legal review. This build grants no approval, opens no commercial "
      + "route, creates no fulfillment record and marks no packet proven. The family remains not "
      + "runtime-selectable and generationAllowed is false.",
    workTypesAddressed: {
      OFFICIAL_SOURCE_ACQUISITION_REQUIRED:
        "Resolved as custody, not acquisition: the source was already held and is bound by pinned SHA-256 "
        + "proved three ways. commissionAcquisition was false and nothing was acquired.",
      OFFICIAL_FORM_MAP_REQUIRED:
        "Field map built from measured widget geometry. All 22 fields carry an explicit decision and a reason "
        + "in field-decisions.json; `not_mapped` appears nowhere.",
      ARTIFACT_REVIEW_REQUIRED:
        "Canonical and boundary fixtures rendered from the pinned bytes and verified from the artifact bytes at "
        + "their measured rectangles; both pages of both fixtures rastered.",
      OUTPUT_LEGAL_APPROVAL_REQUIRED:
        "NOT addressed. Requested here; a human legal reviewer grants it or does not."
    },
    mattersForTheReviewersAttention: [
      "reports/caption-channel-defect.json — a shared-infrastructure defect that both misbinds six fields on "
        + "this form and is the only thing currently preventing a sworn attestation block from being prefilled.",
      "reports/charge-caption-proof.json — the corpus charge-caption guard reports zero offending rows on this "
        + "form because its vocabulary has no word for 'crime', while the widened test finds one.",
      "reports/route-date-boundary.json — the form carries no conviction-date field, so the pre-2000 boundary "
        + "that defines this route cannot be stated on it.",
      "reports/local-filing-variation.json — service method, recipients and timing are recorded as NOT FOUND in "
        + "any held source rather than inferred."
    ],
    independentVisualReviewRequired: true
  });

  // ---- standing advisories, derived from the render rather than asserted ------
  //
  // Neither is a defect in this build and neither gates it. Both are things a
  // reviewer looking at the paper would ask about, so they are recorded next to
  // the findings instead of being left for the reviewer to notice.
  for (const { doc, census, fixtures } of documents) {
    const addr = fixtures.canonical.report.written.find((w) => w.factId === "participant.street_address");
    if (addr) {
      const f = census.fields.find((x) => x.name === addr.field);
      advisories.push({
        severity: "advisory", fixture: "canonical", field: addr.field,
        check: "a_single_full_width_address_line_receives_only_the_street",
        note:
          "The form gives the defendant's address one full-width line captioned 'Address'. The platform holds "
          + `the address in parts and binds participant.street_address, so the line carries `
          + `"${CANONICAL["participant.street_address"]}" and not the city, state or ZIP. The value written is `
          + "correct as far as it goes and nothing false is stated, but the line is left incomplete and the "
          + "participant completes it. Widening this would mean binding a composite fact, which is a shared "
          + "descriptor decision and not this family's to make.",
        rect: f?.widgets?.[0]?.rect ?? null
      });
    }
    const dob = fixtures.canonical.report.written.find((w) => w.factId === "participant.date_of_birth");
    if (dob) {
      advisories.push({
        severity: "advisory", fixture: "canonical", field: dob.field,
        check: "dates_are_written_in_iso_form",
        note:
          `The date of birth is written as "${CANONICAL["participant.date_of_birth"]}". valueMatchesType requires `
          + "YYYY-MM-DD and the factory writes the value it is given, so every family renders ISO dates. A "
          + "Connecticut Judicial Branch form is conventionally completed MM/DD/YYYY. This is unambiguous rather "
          + "than wrong, it is consistent across the corpus, and the formatting decision belongs to the shared "
          + "factory. Raised for the reviewer, not fixed here."
      });
    }
  }

  writeJson(`${OUT}/reports/independent-visual-review.json`, {
    schemaVersion: "rcap-independent-visual-review/v1",
    familyId: FAMILY_ID,
    required: true,
    granted: false,
    reviewedBy: null,
    note:
      "Every page of every fixture is rastered for review by a human who did not build this family. The build's "
      + "own byte-level verification is not a substitute: it can prove a value sits at a measured rectangle and "
      + "cannot see that a rectangle is the wrong place to put it.",
    whatToLookAt: [
      "Page 1, the caption block: 'Name of defendant', 'E-mail address', 'Phone number', 'JD/GA number' and "
        + "'Address of court' are all deliberately BLANK. Confirm that reads as an incomplete form to be "
        + "finished, not as a filled form with missing data. See reports/caption-channel-defect.json.",
      "Page 1, the crimes box: blank, and it is the largest empty area on the form. Confirm the participant "
        + "would understand it is theirs to complete.",
      "Page 1, both jurat rows: signature, print name and date all blank for the defendant and the officer.",
      "Page 2, the Order of the Court: both checkboxes unticked and the decree, judge, clerk and date blank.",
      "The foot of both pages: flattening materialises the form's own 'Print Form' and 'Reset Form' button "
        + "captions as static text. They are the Judicial Branch's own labels, not values this build wrote, but "
        + "they will appear on a filed copy. See build-findings.json → advisory.",
      "The boundary fixture, page 1: the docket box is blank because the boundary docket number does not fit "
        + "159.84pt at the minimum readable font. Confirm a refusal is preferable to a clipped docket number."
    ],
    rasters
  });

  writeJson(`${OUT}/captain-reproduction.json`, {
    schemaVersion: "rcap-census-v1-captain-reproduction/v1",
    familyId: FAMILY_ID,
    howToReproduce: [
      "bash scripts/rcap-corpus/bootstrap-private-corpus.sh",
      "node scripts/verify-packet-build-environment.mjs --family ct-cleanslate-petition-set --branch claude/census-v1-build-ct-cleanslate-petition-set",
      "node scripts/build-census-v1-ct-cleanslate-petition-set.mjs"
    ],
    determinism:
      "The build takes no input but the pinned source bytes and the two fixture fact sets declared in the "
      + "script, and writes no timestamp, so it reproduces byte-identically. Re-running it over its own output "
      + "leaves every fixture hash and every report unchanged.",
    sourceSha256: DOCUMENTS[0].sha256,
    fixtures: documents.flatMap(({ doc, fixtures }) =>
      ["canonical", "boundary"].map((label) => ({
        document: doc.documentId, fixture: label, file: fixtures[label].file, sha256: fixtures[label].sha256
      }))),
    rasterPageHashes: rasters.flatMap((r) => r.pages.map((p) => ({ file: p.file, sha256: p.sha256 })))
  });

  writeJson(`${OUT}/build-findings.json`, {
    schemaVersion: "rcap-build-findings/v1",
    familyId: FAMILY_ID,
    blocking: allFindings.filter((f) => f.severity === "blocking"),
    advisory: advisories,
    findingCount: allFindings.length
  });

  console.log(`\n${allFindings.length === 0 ? "OK" : "FINDINGS"}: `
    + `${chargeBlanks.length} crime/charge caption blanks examined across all fixtures, `
    + `${chargeBlanks.filter((b) => b.participantNameTokensFound.length).length} carrying a participant name; `
    + `${decisions.length} fields all decided.`);
  if (allFindings.length) {
    for (const f of allFindings) console.error(`  ${f.severity} ${f.fixture} ${f.field}: ${f.check}`);
    process.exit(1);
  }
}

await main();
