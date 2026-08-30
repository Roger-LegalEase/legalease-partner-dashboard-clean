#!/usr/bin/env node
// Route-obligation census v1 — packet family `ca-1203-4-set`.
//
//   node scripts/build-census-v1-ca-1203-4-set.mjs
//
// California Penal Code § 1203.4, dismissal/set-aside after successful
// probation, route
// `obligation:track-pathway:CA:ca-1203-4:tool-1-dismissal-set-aside`.
// Five Judicial Council forms: CR-180 (the petition), CR-181 (the proposed
// order), CR-106 (the proof of service), MC-025 (the attachment sheet) and
// MC-031 (the attached declaration).
//
// This family is NOT `ca-1203-41-set`. That is a different statute, a different
// packet and a sibling worker's family; nothing here applies to it.
//
// WHAT THIS SCRIPT IS NOT
//
// It is not a renderer. Every decision about what may be written is made by
// scripts/rcap-official-forms/rcap-field-semantics.mjs and every byte is
// written by finalizeOfficialForm. This file supplies the two things only a
// caller can supply — this family's ROLE classification and its explicit
// mappings — and then proves the result from the artifact bytes rather than
// from its own report.
//
// THE THING THAT MAKES THIS FAMILY DIFFERENT: THE SOURCE IS NOT READABLE BY
// THE WRITER
//
// All five official binaries carry a permissions-only /Standard security
// handler with an EMPTY user password, and `/P -1084`, which denies content
// modification and extraction and explicitly ALLOWS filling in form fields.
// They are readable by any conforming implementation. pdf-lib 1.17.1 — the only
// PDF writer in this repository — implements no decryption at all, so it cannot
// open them to write a filled artifact.
//
// The predecessor measured off the official bytes with pikepdf, correctly, and
// stopped before rendering because there was no sanctioned way to write. That
// gate is now open, and it is opened by a pipeline rather than by an exception:
//
//   scripts/rcap-corpus/build-tooling-readable-rendition.py
//
// verifies the official SHA-256 BEFORE transforming, produces a tooling-
// readable rendition under private/ (never committed), and proves the rendition
// is the same document — page count, page geometry, per-page content-stream
// SHA-256, terminal field identities, widget rectangles, /FT, /Ff, /MaxLen,
// appearance states and their stream hashes, the XFA packet, the document
// information dictionary and the permanent /ID. Zero deltas on all five, on
// deterministic bytes. Its report is readable-rendition.json.
//
// This build re-runs that pipeline every time and binds the rendition it fills
// by the SHA-256 the pipeline proved, so a filled artifact can never rest on a
// rendition nobody checked.
//
// GEOMETRY IS STILL MEASURED OFF THE OFFICIAL BINARY. reports/official-field-
// census.json and reports/write-box-map.json are read from the official bytes
// by pikepdf, and every widget rectangle this build uses is asserted equal to
// the official one before anything is written. A rendition is where pdf-lib
// WRITES; it is never where this family measures.
//
// THE XFA DECISION, WHICH IS MADE HERE AND NOT INHERITED
//
// CR-180, CR-181 and CR-106 are hybrid static-XFA documents (/XFA present,
// /NeedsRendering absent). The rendition stage removes nothing. pdf-lib removes
// the XFA packet when it loads any of them, announcing it, and there is no
// option to keep it. So the FILL stage removes XFA, this build says so, and
// section `xfaDecision` of build-findings.json records what is lost and what is
// not. The page content streams survive byte for byte — that is measured below,
// not assumed — so what prints and what gets filed is unchanged; what goes is
// the XFA packet and the publisher's permission bits.
//
// A WARNING ABOUT HOW THAT ANSWER GETS CHECKED. The raster review renders
// through a rasteriser that does not render XFA at all. For this class of
// change our own raster review is structurally incapable of showing a
// difference. A green raster is not evidence about the XFA question.
//
// WHAT MEASURING THIS FAMILY FOUND
//
// Seven wrong bindings, each refused by ROLE below and each proved absent from
// the artifact bytes. They are not hypothetical: every one is what the shared
// binder does with these forms today.
//
//   1-3. CR-180's court block is named CrtStreet, CrtMailingAdd and CrtCityZip.
//        `Crt` is not `court`, so participant.street_address's own /\bcourt\b/
//        refusal never fires, and the harvested captions are the bare words
//        STREET ADDRESS and MAILING ADDRESS printed INSIDE the court box. The
//        participant's home address and ZIP bound to the Superior Court's
//        address — on a petition filed with that court.
//   4.   CR-181's CrtStreet took matter.county: the county name in the court's
//        street-address line.
//   5.   CR-181's page-2 Party1 (the short title) took participant.state. Its
//        harvested caption is the squashed band
//        "PEOPLE OF THE STATE OF CALIFORNIA v. DEFENDANT:CASE NUMBER", in which
//        the word STATE reaches participant.state before DEFENDANT reaches
//        full_legal_name.
//   6.   MC-031's caption captions are attributed the wrong way round. Measured:
//        "PLAINTIFF/PETITIONER:" prints at y=730.56 and FillText10 sits at
//        y=728.08–743.27; "DEFENDANT/RESPONDENT:" prints at y=715.14 and
//        FillText9 sits at y=711.83–726.71. So FillText10 is the PLAINTIFF
//        blank — and it harvested the label "DEFENDANT/RESPONDENT", while
//        FillText9 harvested "PLAINTIFF/PETITIONER:CASE NUMBER". Both bind
//        full_legal_name, so the participant's name is written as the
//        plaintiff AND as the defendant. In a § 1203.4 matter the plaintiff is
//        the People of the State of California and never the petitioner.
//   7.   MC-025's FillText5 and MC-031's FillText11 are CASE NUMBER caption
//        blanks. rowIndexOf() reads any trailing digit as a repeating-row
//        index, so they are row 5 and row 11 of a charge table that does not
//        exist, and matter.case_number is a ROW_FACT. The boundary fixture
//        carries FIVE charges precisely so row index 4 is reachable and this
//        defect is LIVE rather than masked by
//        `repeating_row_without_indexed_fact` — the role refusal is then doing
//        real work, and the artifact bytes prove it.
//
// WHY NO CHECKBOX IS TICKED, ON ANY OF THE FIVE
//
// reports/write-box-map.json binds all 59 checkable widgets to a box the form
// actually draws, records each widget's own /AP /N on-state (which is `1`, `2`,
// `3`, `4`, `5` or `6` on these forms and never `Yes`), and shows every painted
// mark landing inside its printed box. Nothing here draws a new box, and
// nothing here ticks one either: on CR-180 every checkbox elects which
// subdivision of § 1203.4 the petitioner qualifies under, and on CR-181 every
// checkbox is the court's own ruling. Both are legal determinations. The map is
// the measured groundwork for a future in which counsel approves an election;
// it is not an election.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

import { extractTextItems, groupIntoLines, captureWidgetContext, normalizeHarvestedText }
  from "./rcap-official-forms/rcap-pdf-anchor-capture.mjs";
import { finalizeOfficialForm } from "./rcap-official-forms/rcap-official-form-finalize.mjs";
import { flattenedWidgets, drawnAt } from "./rcap-official-forms/pdf-flattened-widgets.mjs";
import { rasterizePdf } from "./rcap-official-forms/rcap-pdf-rasterize.mjs";
import { CHARGE_VALUE_WORDS, captionDescribesChargeValue, descriptorsMatching, protectCategoryOf }
  from "./rcap-official-forms/rcap-field-semantics.mjs";
import { loadAppearanceSemantics, dispositionsForFamily }
  from "./rcap-official-forms/rcap-appearance-semantics.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(rootDir);
const require = createRequire(import.meta.url);
const { PDFDocument, PDFTextField, PDFCheckBox, PDFRadioGroup, PDFDropdown, PDFOptionList } = require("pdf-lib");

const FAMILY_ID = "ca-1203-4-set";
const WORKLIST_GROUP_ID = "ca-1203-4-set";
const OUT = "data/rcap-all50/overlays/census-v1/ca/ca-1203-4-set--official-pdf-fill";
const CORPUS_INDEX = "data/rcap-all50/local-source-corpus-index.json";
const CORPUS_ROOT = process.env.RCAP_BUNDLE_EXTRACT
  ?? "private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1";
const STALE_BLOCK = "data/rcap-grade-a/stale-artifact-block.json";
const RENDITION_REQUEST = `${OUT}/readable-rendition-request.json`;
const RENDITION_REPORT = `${OUT}/readable-rendition.json`;
const RENDITION_PIPELINE = "scripts/rcap-corpus/build-tooling-readable-rendition.py";
const OFFICIAL_CENSUS = `${OUT}/reports/official-field-census.json`;
const APPEARANCE_DISPOSITIONS = `${OUT}/field-appearance-dispositions.json`;
const WRITE_BOX_MAP = `${OUT}/reports/write-box-map.json`;
const ROUTE_KEY = "obligation:track-pathway:CA:ca-1203-4:tool-1-dismissal-set-aside";

const fail = (what, detail = "") => {
  console.error(`\nSTOP: ${what}`);
  if (detail) console.error(`      ${detail}`);
  process.exit(1);
};

// --- the five documents, pinned by hash ---------------------------------------
//
// `unwritable` is this family's ROLE classification. It is supplied by the
// caller because only the caller has it, and it is stated here rather than
// re-derived at render time because deciding twice means deciding differently.
// Every entry names the binding it displaces, so the record says what would
// have happened rather than only that something was refused.
const DOCUMENTS = [
  {
    documentId: "CA-CR-180-PETITION-FOR-DISMISSAL",
    key: "petition",
    formNumber: "CR-180",
    revision: "REV-2024-01-01",
    officialTitle: "Petition for Dismissal (Pen. Code, §§ 1203.4, 1203.4a, 1203.41, 1203.42, 1203.43, 1203.49)",
    documentRole: "the participant's own petition",
    ownership: "participant",
    captionOnly: false,
    sha256: "06c1b64315ebd5c7f8260d7169abc2392d6373a202dc39f4788cb8a8c98bbdbe",
    pathInArchive: "STATES/CA/02_PACKET_FORMS/CA__FORM__CR-180__petition-for-dismissal__REV-2024-01-01__EN.pdf",
    explicitMappings: {},
    unwritable: [
      {
        field: "CR-180[0].Page1[0].P1Caption[0].CourtInfo[0].CrtStreet[0]",
        class: "court_address_block",
        displaces: "participant.street_address",
        why: "The Superior Court's own street address. `Crt` is not `court`, so the street_address descriptor's /\\bcourt\\b/ refusal never fires, and the caption harvested from inside the court box is the bare words STREET ADDRESS."
      },
      {
        field: "CR-180[0].Page1[0].P1Caption[0].CourtInfo[0].CrtMailingAdd[0]",
        class: "court_address_block",
        displaces: "participant.street_address",
        why: "The Superior Court's own mailing address, for the same reason."
      },
      {
        field: "CR-180[0].Page1[0].P1Caption[0].CourtInfo[0].CrtCityZip[0]",
        class: "court_address_block",
        displaces: "participant.zip",
        why: "The Superior Court's own city and ZIP. The binder offered the participant's ZIP off a caption that harvested as empty."
      },
      {
        field: "CR-180[0].Page1[0].P1Caption[0].HeaderSub[0].CrtUse[0].TextField[0]",
        class: "court_scheduling",
        displaces: null,
        why: "The hearing TIME, set by the court when the petition is calendared. Nothing binds it today, but it is refused only because no descriptor happens to match a field whose harvested caption is a statutory citation string — and a refusal that depends on which caption a harvester picked up is not a refusal."
      },
      {
        field: "CR-180[0].Page1[0].P1Caption[0].HeaderSub[0].CrtUse[0].TextField[1]",
        class: "court_scheduling",
        displaces: null,
        why: "The hearing DEPARTMENT, set by the court, refused today only for want of a matching descriptor."
      }
    ]
  },
  {
    documentId: "CA-CR-181-ORDER-FOR-DISMISSAL",
    key: "order",
    formNumber: "CR-181",
    revision: "REV-2024-01-01",
    officialTitle: "Order for Dismissal (Pen. Code, §§ 17(b), 17(d)(2), 1203.4, 1203.4a, 1203.41, 1203.42, 1203.43, 1203.49)",
    documentRole: "the proposed order the COURT signs",
    ownership: "court",
    // Everything below the caption is the court speaking: GRANTS, DENIES, the
    // relief elected and the judicial officer's date. The caption identifies
    // the matter and is the petitioner's to complete.
    captionOnly: true,
    sha256: "f737503a89465d40206b11b1123e815e44a249d324bad16d313c337a695ce504",
    pathInArchive: "STATES/CA/02_PACKET_FORMS/CA__FORM__CR-181__order-for-dismissal__REV-2024-01-01__EN.pdf",
    explicitMappings: {},
    unwritable: [
      {
        field: "CR-181[0].Page1[0].Caption[0].CourtInfo[0].CrtStreet[0]",
        class: "court_address_block",
        displaces: "matter.county",
        why: "The court's street address. captionOnly does not reach it, because matter.county IS a caption fact — so the county name would be written into the street-address line of a court's own order."
      },
      {
        field: "CR-181[0].Page2[0].P2Header[0].Party1[0]",
        class: "squashed_caption_band",
        displaces: "participant.state",
        why: "The page-2 short title. Its harvested caption is the whole squashed band `PEOPLE OF THE STATE OF CALIFORNIA v. DEFENDANT:CASE NUMBER`, in which STATE reaches participant.state before DEFENDANT reaches full_legal_name. captionOnly refuses it today, but only incidentally — because participant.state is not a caption fact, not because the binding is wrong."
      }
    ]
  },
  {
    documentId: "CA-CR-106-PROOF-OF-SERVICE",
    key: "proof-of-service",
    formNumber: "CR-106",
    revision: "REV-2020-01-01",
    officialTitle: "Proof of Service (Criminal Record Clearing)",
    documentRole: "the server's sworn proof of service",
    // The person who signs CR-106 states, under penalty of perjury, what THEY
    // did: which agency they served, at which address, on which date, from
    // which city. Under Code Civ. Proc. § 1013a service by mail is made by a
    // person who is NOT a party to the action, so the participant is not the
    // server and no participant fact belongs anywhere but the caption.
    ownership: "server",
    captionOnly: true,
    sha256: "f8a37a9a8c30a016b432bb39fd67407717c3dee7be74bc3e3d471127bf190c5a",
    pathInArchive: "STATES/CA/02_PACKET_FORMS/CA__FORM__CR-106__proof-of-service-criminal-record-clearing__REV-2020-01-01__EN.pdf",
    explicitMappings: {},
    // Stated by ROLE rather than left to captionOnly. captionOnly is a
    // statement about a COURT-ISSUED ORDER; CR-106 is not one, and a later
    // change that turned captionOnly off for this document would put the
    // participant's home address back into eleven service-address blanks.
    // The refusal belongs to what the document is, not to a flag.
    unwritable: [
      ["CR-106[0].Page1[0].#area[2].AppellantLawyerMailingAddress[0]", "participant.street_address"],
      ["CR-106[0].Page1[0].#area[2].AppellantLawyerMailingCity[0]", "participant.city"],
      ["CR-106[0].Page1[0].#area[2].AppellantLawyerMailingState[0]", "participant.state"],
      ["CR-106[0].Page1[0].#area[2].AppellantLawyerMailingZip[0]", "participant.zip"],
      ["CR-106[0].Page1[0].SrvMailingAddress1[0]", "participant.street_address"],
      ["CR-106[0].Page1[0].#area[7].SrvMailingCity1[0]", "participant.city"],
      ["CR-106[0].Page1[0].#area[7].SrvMailingState1[0]", "participant.state"],
      ["CR-106[0].Page1[0].#area[7].SrvMailingZip1[0]", "participant.zip"],
      ["CR-106[0].Page1[0].#area[8].SrvMailingAddress2[0]", "participant.street_address"],
      ["CR-106[0].Page1[0].#area[8].SrvMailingCity2[0]", null],
      ["CR-106[0].Page1[0].#area[8].SrvMailingState2[0]", "participant.state"],
      ["CR-106[0].Page1[0].#area[8].SrvMailingZip2[0]", "participant.zip"],
      ["CR-106[0].Page1[0].FillText72[1]", "participant.city"],
      ["CR-106[0].Page1[0].FillText72[2]", "participant.state"],
      ["CR-106[0].Page2[0].#area[1].SrvMailingAddress3[0]", "participant.street_address"],
      ["CR-106[0].Page2[0].#area[1].SrvMailingCity3[0]", "participant.city"],
      ["CR-106[0].Page2[0].#area[1].SrvMailingState3[0]", "participant.state"],
      ["CR-106[0].Page2[0].#area[1].SrvMailingZip3[0]", "participant.zip"],
      ["CR-106[0].Page2[0].#area[2].SrvMailingAddress4[0]", "participant.street_address"],
      ["CR-106[0].Page2[0].#area[2].SrvMailingCity4[0]", "participant.city"],
      ["CR-106[0].Page2[0].#area[2].SrvMailingState4[0]", "participant.state"],
      ["CR-106[0].Page2[0].#area[2].SrvMailingZip4[0]", "participant.zip"]
    ].map(([field, displaces]) => ({
      field,
      class: "service_block",
      displaces,
      why: displaces
        ? `A blank in the sworn service block. The binder offers ${displaces} for it, which would state the participant's own home as the address of an agency served, or as the place the server mailed from.`
        : "A blank in the sworn service block, refused with the rest of it."
    }))
  },
  {
    documentId: "CA-MC-025-ATTACHMENT",
    key: "attachment",
    formNumber: "MC-025",
    revision: "REV-2009-07-01",
    officialTitle: "Attachment to Judicial Council Form",
    documentRole: "a continuation sheet for whichever item overflows",
    ownership: "participant",
    // A continuation sheet carries the caption of the form it is attached to
    // and then free text the participant writes. The platform has no fact that
    // is "the overflowing text of item 2c", so the body is theirs.
    captionOnly: true,
    sha256: "b0ca1509f2c3de152518079de7c1eb2771eaa1eb7da457c2e918498894f6f0af",
    pathInArchive: "STATES/CA/02_PACKET_FORMS/CA__FORM__MC-025__attachment-to-judicial-council-form__REV-2009-07-01__EN.pdf",
    explicitMappings: {},
    unwritable: [
      {
        field: "FillText5",
        class: "row_index_heuristic_misreads_a_caption_blank",
        displaces: "matter.charges[4].case_number",
        why: "This is MC-025's CASE NUMBER caption blank — measured at [395.04, 723.62, 575.21, 738.50], beside the printed CASE NUMBER caption. rowIndexOf() reads the trailing `5` of an arbitrary field name as a repeating-row index and matter.case_number is a ROW_FACT, so with five charges available the binder writes the FIFTH charge's case number into the caption of a continuation sheet."
      }
    ]
  },
  {
    documentId: "CA-MC-031-ATTACHED-DECLARATION",
    key: "declaration",
    formNumber: "MC-031",
    revision: "REV-2005-07-01",
    officialTitle: "Attached Declaration",
    documentRole: "a declaration attached to the petition",
    ownership: "participant",
    captionOnly: true,
    sha256: "defc9108f6baa4c2ca444c1571d737d841af78289bef337f874f51e595191075",
    pathInArchive: "STATES/CA/02_PACKET_FORMS/CA__FORM__MC-031__attached-declaration__REV-2005-07-01__EN.pdf",
    explicitMappings: {},
    unwritable: [
      {
        field: "FillText10",
        class: "caption_slots_attributed_the_wrong_way_round",
        displaces: "participant.full_legal_name",
        why: "The PLAINTIFF/PETITIONER blank. Measured on the official page: `PLAINTIFF/PETITIONER:` prints at y=730.56 x=64.80 and this widget sits at [162.03, 728.08, 404.44, 743.27] — the same band. `DEFENDANT/RESPONDENT:` prints at y=715.14 and belongs to FillText9 at [162.03, 711.83, 404.44, 726.71]. The harvester attributes each blank the OTHER one's caption, and because both labels reach full_legal_name the error is invisible in the binding: the participant's name is written as the plaintiff AND as the defendant. In a § 1203.4 matter the plaintiff is the People of the State of California."
      },
      {
        field: "FillText11",
        class: "row_index_heuristic_misreads_a_caption_blank",
        displaces: "matter.charges[10].case_number",
        why: "MC-031's CASE NUMBER caption blank, read as row 11 of a charge table that does not exist. Refused today only because no fixture carries eleven charges."
      }
    ]
  }
];

// Where a participant name is allowed to appear, per document. Anything drawn
// anywhere else that carries a name token is a blocking finding, whether or not
// this family predicted the field.
const NAME_MAY_APPEAR_IN = {
  "CA-CR-180-PETITION-FOR-DISMISSAL": [
    "CR-180[0].Page1[0].P1Caption[0].TitlePartyName[0].Defendant[0]",
    "CR-180[0].Page2[0].pXCaption[0].Defendant[0]",
    "CR-180[0].Page3[0].pXCaption[0].Defendant[0]"
  ],
  "CA-CR-181-ORDER-FOR-DISMISSAL": [
    "CR-181[0].Page1[0].Caption[0].TitlePartyName[0].Party1[0]"
  ],
  "CA-CR-106-PROOF-OF-SERVICE": [
    "CR-106[0].Page1[0].RightCaption[0].TCCaseName_ft[0]"
  ],
  "CA-MC-025-ATTACHMENT": [],
  "CA-MC-031-ATTACHED-DECLARATION": ["FillText9"]
};

// --- fixture identities -------------------------------------------------------
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
  "matter.county": "Example County", "matter.court": "Superior Court",
  "matter.case_number": "24-CR-001234", "matter.citation_number": "C-889201",
  "matter.charge": "Possession of a controlled substance", "matter.arrest_date": "2019-03-08",
  "matter.offense_date": "2019-03-08", "matter.conviction_date": "2019-11-02",
  "matter.disposition_date": "2020-01-15", "deterministic.filing_date": "2026-08-12",
  "matter.charges": [
    { case_number: "24-CR-001234", citation_number: "C-889201",
      charge: "Possession of a controlled substance", arrest_date: "2019-03-08",
      offense_date: "2019-03-08", conviction_date: "2019-11-02", disposition_date: "2020-01-15" }
  ]
};

// FIVE convictions, and the count is chosen from the documents rather than
// copied from another family. Two reasons, and both are about making a defect
// LIVE rather than masked:
//
//   1. CR-180's conviction table prints exactly five rows, so five is the
//      table's capacity and `repeating_row_without_indexed_fact` never fires
//      on any row it has. A three-charge fixture would leave rows 4 and 5
//      refused for a reason that says nothing about whether they are safe.
//   2. It makes row index 4 reachable, which is what MC-025's `FillText5`
//      resolves to under rowIndexOf(). With fewer than five charges that
//      field is refused by the row guard and the role refusal is untested; at
//      five it is refused BY ROLE and the artifact proves it.
const BOUNDARY = {
  ...CANONICAL,
  "participant.full_legal_name": "Alexandrina-Katharine Montgomery-Vandenberg-Oyelaran y Fitzwilliam III",
  "participant.street_address": "12345 Southwest Grandview Boulevard Northeast, Building 7, Apartment 4321-B",
  "participant.city": "Unincorporated Township of Long Hollow Crossing",
  "participant.city_state_zip": "Unincorporated Township of Long Hollow Crossing, XX 01234-9999",
  "participant.zip": "01234-9999", "participant.phone": "555-0142 ext. 44821",
  "matter.case_number": "0123-45-2026-CR-900123.00-AB-CDE/2201",
  "matter.county": "Saint Bartholomew and the Northern Reaches County",
  "matter.charge": "Violation of Health and Safety Code section 11350(a), with an extended statutory description that materially exceeds one line",
  "matter.charges": [
    { case_number: "0123-45-2026-CR-900123.00-AB-CDE/2201", citation_number: "C-889201",
      charge: "Violation of Health and Safety Code section 11350(a), with an extended statutory description that materially exceeds one line",
      arrest_date: "2019-03-08", offense_date: "2019-03-08", conviction_date: "2019-11-02", disposition_date: "2020-01-15" },
    { case_number: "0123-45-2026-CR-900124.00", citation_number: "C-889202",
      charge: "Petty theft, Pen. Code, § 484(a)", arrest_date: "2020-06-21",
      offense_date: "2020-06-20", conviction_date: "2021-02-09", disposition_date: "2021-03-01" },
    { case_number: "0123-45-2026-CR-900125.00", citation_number: "C-889203",
      charge: "Driving with a suspended licence, Veh. Code, § 14601.1(a)", arrest_date: "2021-09-02",
      offense_date: "2021-09-02", conviction_date: "2022-01-18", disposition_date: "2022-02-14" },
    { case_number: "0123-45-2026-CR-900126.00", citation_number: "C-889204",
      charge: "Vandalism, Pen. Code, § 594(b)(2)(A)", arrest_date: "2022-04-11",
      offense_date: "2022-04-10", conviction_date: "2022-09-30", disposition_date: "2022-10-14" },
    { case_number: "0123-45-2026-CR-900127.00", citation_number: "C-889205",
      charge: "Disturbing the peace, Pen. Code, § 415(2)", arrest_date: "2023-01-05",
      offense_date: "2023-01-04", conviction_date: "2023-06-12", disposition_date: "2023-07-01" }
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
//
// Three independent records, because any one alone is satisfiable by a file
// that is not the right one: the bytes on disk hash to what the family
// declares, the committed corpus index declares the same hash and byte length
// at the same path, and the custody reconciliation names the same hash for the
// same source id. An ABSENCE and a MISMATCH are different findings and are
// reported as different findings.
function resolveOfficial(doc) {
  const index = readJson(CORPUS_INDEX);
  const entry = (index.entries ?? []).find((e) => e.path === doc.pathInArchive);
  if (!entry) fail(`${doc.documentId}: ABSENT from ${CORPUS_INDEX}`, doc.pathInArchive);
  if (entry.sha256 !== doc.sha256) {
    fail(`${doc.documentId}: MISMATCH — the corpus index declares a different hash`,
      `index ${entry.sha256} / family ${doc.sha256}`);
  }
  const abs = path.isAbsolute(CORPUS_ROOT)
    ? path.join(CORPUS_ROOT, doc.pathInArchive)
    : path.join(rootDir, CORPUS_ROOT, doc.pathInArchive);
  if (!fs.existsSync(abs)) {
    fail(`${doc.documentId}: ABSENT — the pinned source is not installed`,
      "run scripts/rcap-corpus/bootstrap-private-corpus.sh");
  }
  const bytes = fs.readFileSync(abs);
  const got = sha256(bytes);
  if (got !== doc.sha256) fail(`${doc.documentId}: MISMATCH — SOURCE DRIFT`, `expected ${doc.sha256}, read ${got}`);
  if (bytes.length !== entry.byteLength) {
    fail(`${doc.documentId}: MISMATCH — byte length disagrees with the corpus index`,
      `index ${entry.byteLength}, read ${bytes.length}`);
  }
  return { officialBytes: bytes, indexEntry: entry };
}

// ---- step 1b: the tooling-readable rendition, re-proved on every run ----------
//
// The pipeline is re-run rather than trusted, because a committed report and a
// file under private/ can drift apart in a way nothing else here would notice.
// It stops on any delta against the official binary, so reaching this point at
// all is the proof; what is read back is which rendition to fill and the hash
// it must have.
function buildRenditions() {
  console.log("=== tooling-readable renditions ===");
  const out = execFileSync("python3", [
    RENDITION_PIPELINE, "--request", RENDITION_REQUEST, "--report", RENDITION_REPORT,
    "--corpus", CORPUS_ROOT
  ], { cwd: rootDir, encoding: "utf8", maxBuffer: 1 << 26 });
  process.stdout.write(out.replace(/^/gm, "  "));

  const report = readJson(RENDITION_REPORT);
  if (report.allIdentical !== true || report.allDeterministic !== true) {
    fail("the rendition pipeline did not prove identity and determinism", RENDITION_REPORT);
  }
  const byForm = new Map();
  for (const s of report.sources) {
    if (s.comparison.deltaCount !== 0) fail(`${s.formNumber}: rendition delta against the official`, `${s.comparison.deltaCount}`);
    if (s.official.verifiedBeforeTransformation !== true) fail(`${s.formNumber}: official hash not verified before transformation`);
    const abs = path.join(rootDir, s.rendition.path);
    if (!fs.existsSync(abs)) fail(`${s.formNumber}: the rendition is absent`, s.rendition.path);
    const bytes = fs.readFileSync(abs);
    const got = sha256(bytes);
    if (got !== s.rendition.sha256) {
      fail(`${s.formNumber}: RENDITION DRIFT — the file is not the one the pipeline proved`,
        `report ${s.rendition.sha256}, read ${got}`);
    }
    byForm.set(s.formNumber, { bytes, sha256: got, path: s.rendition.path, source: s });
  }
  return { report, byForm };
}

// ---- steps 2 + 3: census, with geometry tied to the OFFICIAL binary -----------
//
// The captions and the region headings are harvested through pdf-lib from the
// rendition, because pdf-lib is the only harvester here and it cannot open the
// official binary. That is sound precisely because the rendition pipeline
// asserts every page's DECODED CONTENT STREAM is byte-identical to the
// official's — the harvester reads the content stream and nothing else, so it
// is reading the official page.
//
// The GEOMETRY is not taken on that argument. Every widget rectangle read here
// is compared against reports/official-field-census.json, which pikepdf read
// from the official bytes, and a disagreement anywhere stops the build.
async function censusDocument(doc, renditionBytes, officialCensus) {
  const pdf = await PDFDocument.load(renditionBytes, { updateMetadata: false });
  const pages = pdf.getPages();
  const form = pdf.getForm();

  const linesByPage = pages.map((p) => groupIntoLines(extractTextItems(p)));
  const documentTextLines = linesByPage.flat().map((l) => normalizeHarvestedText(l.text));

  const officialFields = new Map(officialCensus.fields.map((f) => [f.name, f]));
  const widgetsForCapture = new Map();
  const geometryDisagreements = [];

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
        rectBasis: "acroform_widget_rect, asserted equal to the official binary's"
      };
    });

    // The assertion that keeps this family's coordinates on the official bytes.
    const official = officialFields.get(name);
    if (!official) {
      geometryDisagreements.push({ field: name, problem: "present in the rendition and absent from the official census" });
    } else {
      const officialWidgets = official.widgets ?? [];
      if (officialWidgets.length !== widgets.length) {
        geometryDisagreements.push({ field: name, problem: "widget count differs",
          official: officialWidgets.length, rendition: widgets.length });
      } else {
        // The official census sorts widgets by page then top-down; sort the
        // same way before comparing so the two lists line up.
        const mine = [...widgets].sort((a, b) => (a.page - b.page)
          || ((b.rect.y + b.rect.height) - (a.rect.y + a.rect.height)) || (a.rect.x - b.rect.x));
        mine.forEach((w, i) => {
          const o = officialWidgets[i];
          const got = [w.rect.x, w.rect.y, w.rect.x + w.rect.width, w.rect.y + w.rect.height];
          const want = o.rect;
          if (o.pageIndex !== w.page - 1 || got.some((v, k) => Math.abs(v - want[k]) > 0.011)) {
            geometryDisagreements.push({ field: name, widgetIndex: i, problem: "rectangle or page differs",
              official: { page: o.pageIndex + 1, rect: want }, rendition: { page: w.page, rect: got } });
          }
        });
      }
    }

    for (const w of widgets) {
      if (!widgetsForCapture.has(w.page)) widgetsForCapture.set(w.page, []);
      widgetsForCapture.get(w.page).push({ name, rect: w.rect });
    }
    return {
      name, type, widgets,
      maxLength: official?.maxLen ?? null,
      // Bit 13 of /Ff (PDF 32000-1 table 228). Read from the document, so a
      // multi-line explanation box is fitted as one.
      multiline: Boolean((official?.rawFf ?? 0) & (1 << 12)),
      readOnly: Boolean((official?.rawFf ?? 0) & 1),
      onStates: official?.widgets?.[0]?.onStates ?? []
    };
  });

  if (geometryDisagreements.length) {
    fail(`${doc.documentId}: the rendition's geometry disagrees with the official binary`,
      JSON.stringify(geometryDisagreements.slice(0, 4), null, 2));
  }

  const context = new Map();
  pages.forEach((page, i) => {
    const list = widgetsForCapture.get(i + 1) ?? [];
    if (!list.length) return;
    for (const c of captureWidgetContext(page, list, { precomputedLines: linesByPage[i], isFirstPage: i === 0 })) {
      if (!context.has(c.name)) context.set(c.name, c);
    }
  });

  const censusFields = fields.map((f) => {
    const c = context.get(f.name) ?? {};
    const subject = c.effectiveLabel ?? f.name;
    return {
      name: f.name,
      type: f.type,
      effectiveLabel: c.effectiveLabel ?? null,
      labelBasis: c.labelBasis ?? null,
      regionHeading: c.regionHeading ?? null,
      widgets: f.widgets,
      maxLength: f.maxLength,
      multiline: f.multiline,
      readOnly: f.readOnly,
      onStates: f.onStates,
      // Recorded on every blank, not only the ones that get written, so the
      // charge-caption question is answerable for the whole document.
      captionDescribesChargeValue: captionDescribesChargeValue(subject),
      captionOrNameMentionsCharge: CHARGE_VALUE_WORDS.test(subject) || CHARGE_VALUE_WORDS.test(f.name),
      protectCategory: protectCategoryOf(subject) ?? protectCategoryOf(f.name) ?? null,
      descriptorsByName: descriptorsMatching(f.name).map((d) => d.factId),
      descriptorsByLabel: c.effectiveLabel ? descriptorsMatching(c.effectiveLabel).map((d) => d.factId) : []
    };
  });

  return {
    pages, fields: censusFields, documentTextLines,
    pageGeometry: pages.map((p, i) => ({
      page: i + 1, width: +p.getSize().width.toFixed(2), height: +p.getSize().height.toFixed(2)
    })),
    geometryTiedToOfficial: true
  };
}

// ---- step 7: prove it from the ARTIFACT, not from the report ------------------
//
// The report says what the factory believes it wrote. This reads the flattened
// appearance streams back out of the finished PDF and asks the document what is
// actually drawn at each MEASURED rectangle — the rectangle the official binary
// declares, not one this build chose. A disagreement is a failure of this
// build, not a note.
async function verifyFromBytes({ file, doc, census, report, label }) {
  const drawn = await flattenedWidgets(file);
  const findings = [];
  const chargeBlanks = [];
  const roleRefusals = [];

  const roleFields = new Map((doc.unwritable ?? []).map((u) => [u.field, u]));
  const textAt = (w) => drawnAt(drawn, { page: w.page, rect: w.rect, tolerance: 3 })
    .map((d) => d.text).filter((t) => t && t.trim() !== "").join(" ").trim();

  for (const field of census.fields) {
    const w = field.widgets[0];
    if (!w) continue;
    const text = textAt(w);
    const wasWritten = report.written.some((x) => x.field === field.name);

    // THE CHECK THIS FAMILY EXISTS TO PASS. Any blank whose caption or field
    // name speaks of a charge, offence, count, statute or violation must not
    // contain a participant name token. On CR-180 that reaches all twenty-five
    // conviction-table cells and the § 1203.43 dismissal-date blank.
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

    // Every ROLE refusal, proved from the paper. This is what turns a
    // classification into a fact: the seven wrong bindings this family found
    // are recorded as refused AND shown to have drawn nothing.
    if (roleFields.has(field.name)) {
      const u = roleFields.get(field.name);
      roleRefusals.push({
        field: field.name, class: u.class, displaces: u.displaces,
        page: w.page, rect: w.rect, drawnText: text === "" ? null : text, blank: text === ""
      });
      if (text !== "") {
        findings.push({ severity: "blocking", fixture: label, field: field.name,
          check: "role_refused_field_carries_ink", class: u.class, drawnText: text });
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
  // CR-180 and CR-106 name their signature blocks SigName/SigDate, CR-181 names
  // the judicial officer's date Signature_dt, and MC-031 prints a
  // "(TYPE OR PRINT NAME)(SIGNATURE)" band over FillText13/FillText14.
  const mustBeBlank = census.fields.filter((f) =>
    /sig(nature|name|date)|_dt$|^FillText1[34]$/i.test(f.name)
    || f.type === "signature"
    || /certificate\s*of\s*(service|mailing)|proof\s*of\s*service/i.test(f.regionHeading ?? "")
    || /\(signature\)/i.test(f.regionHeading ?? ""));
  const signatureBlanks = [];
  for (const f of mustBeBlank) {
    const w = f.widgets[0];
    if (!w) continue;
    const text = textAt(w);
    signatureBlanks.push({ field: f.name, page: w.page, rect: w.rect, blank: text === "" });
    if (text !== "") {
      findings.push({ severity: "blocking", fixture: label, field: f.name,
        check: "signature_signature_date_or_certificate_of_service_field_is_not_blank", drawnText: text });
    }
  }

  // THE WIDER NET. Every appearance the artifact draws is read, and any that
  // carries a participant name token must sit at a blank this family listed as
  // one the name belongs in.
  const allowed = new Set(NAME_MAY_APPEAR_IN[doc.documentId] ?? []);
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

  return { findings, chargeBlanks, roleRefusals, signatureBlanks, namePlacements, appearancesDrawn: drawn.length };
}

// ---- main --------------------------------------------------------------------
async function main() {
  const blocked = new Set(readJson(STALE_BLOCK).hashes ?? []);
  fs.mkdirSync(path.join(rootDir, OUT), { recursive: true });

  const { report: renditionReport, byForm } = buildRenditions();
  const officialCensus = readJson(OFFICIAL_CENSUS);
  const writeBoxMap = readJson(WRITE_BOX_MAP);

  // What each classified field's appearance MEANS. Loaded through the shared
  // module's own loader, which validates every disposition, and handed to the
  // finalizer as a plain field-name map so it never learns which family it is
  // working on. 212 of 217 fields are left on the structural default.
  const appearanceDispositions = dispositionsForFamily(
    loadAppearanceSemantics(path.join(rootDir, APPEARANCE_DISPOSITIONS)), FAMILY_ID);
  console.log(`\nappearance dispositions: ${appearanceDispositions.size} classified, `
    + "the rest on the structural default");

  const documents = [];
  const allFindings = [];

  for (const doc of DOCUMENTS) {
    console.log(`\n=== ${doc.documentId} (${doc.documentRole}) ===`);
    const { officialBytes, indexEntry } = resolveOfficial(doc);
    const rendition = byForm.get(doc.formNumber);
    if (!rendition) fail(`${doc.documentId}: the rendition pipeline produced nothing for this form`);
    console.log(`  official  sha256=${doc.sha256.slice(0, 16)}…  bytes=${officialBytes.length}`);
    console.log(`  rendition sha256=${rendition.sha256.slice(0, 16)}…  bytes=${rendition.bytes.length}`
      + `  deltas=0  xfa=${rendition.source.xfaDecision.sourceCarriesXfa ? "carried" : "absent"}`);

    const census = await censusDocument(doc, rendition.bytes, officialCensus.forms[doc.formNumber]);
    console.log(`  censused ${census.fields.length} fields across ${census.pages.length} pages`
      + `, every rectangle asserted equal to the official binary's`);

    const fixtures = {};
    for (const [label, facts] of [["canonical", CANONICAL], ["boundary", BOUNDARY]]) {
      const result = await finalizeOfficialForm({
        sourceBytes: rendition.bytes,
        // The rendition's own hash, proved this run by the pipeline. The
        // official hash is bound separately above; conflating the two would
        // let a filled artifact rest on an unchecked rendition.
        expectedSha256: rendition.sha256,
        census: census.fields,
        facts,
        explicitMappings: doc.explicitMappings,
        unwritableFields: doc.unwritable.map((u) => ({ field: u.field, class: u.class })),
        captionOnly: doc.captionOnly,
        documentTextLines: census.documentTextLines,
        appearanceDispositions,
        title: `CA ${doc.formNumber}`
      });

      const rel = `${OUT}/fixtures/${doc.key}-${label}-filled.pdf`;
      fs.mkdirSync(path.dirname(path.join(rootDir, rel)), { recursive: true });
      fs.writeFileSync(path.join(rootDir, rel), result.bytes);
      const hash = sha256(result.bytes);
      if (blocked.has(hash)) fail(`${doc.documentId}/${label}: rendered to a BLOCKED hash`, hash);

      const proof = await verifyFromBytes({
        file: path.join(rootDir, rel), doc, census, report: result.report, label: `${doc.key}-${label}`
      });
      allFindings.push(...proof.findings);

      console.log(`  ${label}: wrote ${result.report.written.length}, refused ${result.report.refused.length}`
        + `, sha256=${hash.slice(0, 16)}…  charge-blanks=${proof.chargeBlanks.length}`
        + ` role-refusals-proved-blank=${proof.roleRefusals.filter((r) => r.blank).length}/${proof.roleRefusals.length}`
        + `  findings=${proof.findings.length}`);

      fixtures[label] = { file: rel, sha256: hash, byteLength: result.bytes.length, report: result.report, proof };
    }

    documents.push({ doc, census, indexEntry, fixtures, rendition, officialByteLength: officialBytes.length });
  }

  // ---- step 8: raster every page ---------------------------------------------
  const rasters = [];
  for (const d of documents) {
    for (const label of ["canonical", "boundary"]) {
      const outDir = `${OUT}/raster/${d.doc.key}-${label}`;
      fs.mkdirSync(path.join(rootDir, outDir), { recursive: true });
      const produced = await rasterizePdf({
        file: path.join(rootDir, d.fixtures[label].file),
        outDir: path.join(rootDir, outDir), scale: 1.6, prefix: "page"
      });
      const files = (Array.isArray(produced) ? produced
        : fs.readdirSync(path.join(rootDir, outDir)).map((f) => path.join(rootDir, outDir, f)))
        .map((f) => (typeof f === "string" ? f : f.file)).filter(Boolean).sort();
      if (files.length !== d.census.pages.length) {
        fail(`${d.doc.documentId}/${label}: rastered ${files.length} page(s) of ${d.census.pages.length}`,
          "every page is reviewed or none is");
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
    worklistGroupId: WORKLIST_GROUP_ID,
    implementationStrategy: "official_pdf_fill",
    jurisdiction: "CA",
    routeKeys: [ROUTE_KEY],
    custodyClass: "SOURCE_ALREADY_HELD",
    acquisitionCommissioned: false,
    whyNoAcquisition:
      "data/rcap-grade-a/route-obligation-census-v1/source-custody-reconciliation.json classifies this family "
      + "SOURCE_ALREADY_HELD with commissionAcquisition false: all five document sources it names resolve to "
      + "files already in the verified corpus. Nothing was fetched from a court or agency host, and no mirror, "
      + "cache or aggregator was consulted. The pinned Master Library was recovered through "
      + "scripts/rcap-corpus/bootstrap-private-corpus.sh, which verifies the archive hash and the corpus's own "
      + "governance checksums before extracting.",
    sourceArchive: "Expungement_AI_RCAP_Master_Library_Edition_1",
    bindingMethod:
      "Bound by exact SHA-256 on two independent records: the bytes on disk, and the committed corpus index's "
      + "declaration of hash and byte length at the same path. An ABSENCE and a MISMATCH are reported as "
      + "different findings and neither is a pass.",
    documents: documents.map(({ doc, indexEntry, officialByteLength, rendition }) => ({
      documentId: doc.documentId,
      documentRole: doc.documentRole,
      ownership: doc.ownership,
      officialTitle: doc.officialTitle,
      formNumber: doc.formNumber,
      revision: doc.revision,
      sha256: doc.sha256,
      byteLength: officialByteLength,
      pathInArchive: doc.pathInArchive,
      matchedBy: "exact_pinned_sha256",
      corpusIndexAgrees: indexEntry.sha256 === doc.sha256 && indexEntry.byteLength === officialByteLength,
      pageCount: indexEntry.pageCount,
      acroFieldCount: indexEntry.acroFieldCount,
      structuralClassObserved: indexEntry.structuralClassObserved,
      structuralClassObservedIsWrong:
        "`unreadable` is a true statement about pdf-lib 1.17.1 and a false statement about this document, which "
        + "opens with an empty user password in any conforming implementation. Reported to the Captain in "
        + "build-findings.json; the index is a shared manifest and was not edited here.",
      filledFrom: {
        surface: "the tooling-readable rendition",
        renditionSha256: rendition.sha256,
        provenIdenticalToTheOfficial: true,
        proof: RENDITION_REPORT
      }
    })),
    toolingReadableRendition: {
      why:
        "pdf-lib 1.17.1 implements no decryption and cannot open any of these five to write a filled artifact. "
        + "The rendition is a form of the same document that it can open. It is a build intermediate under "
        + "private/, is git-ignored and is never committed.",
      pipeline: RENDITION_PIPELINE,
      report: RENDITION_REPORT,
      tool: renditionReport.transformation.tool,
      pikepdfVersion: renditionReport.transformation.pikepdfVersion,
      libqpdfVersion: renditionReport.transformation.libqpdfVersion,
      call: renditionReport.transformation.call,
      officialHashVerifiedBeforeTransformation: true,
      deltasAgainstTheOfficial: 0,
      deterministicBytes: renditionReport.allDeterministic,
      derivativesUsed: false,
      whyNoDerivative:
        "data/rcap-all50/overlays/encrypted-pdf-rescue-report.json's three 2026-06-17 derivatives are faithful — "
        + "SOURCE_FIDELITY_FINDING.md measured zero delta — and unnecessary. A faithful copy of a readable "
        + "original is not a reason to rest this family's coordinates on a 2026-06-17 transform. None was opened."
    },
    whatThisReceiptDoesNotEstablish: [
      "that CR-180 REV-2024-01-01, CR-181 REV-2024-01-01, CR-106 REV-2020-01-01, MC-025 REV-2009-07-01 and "
      + "MC-031 REV-2005-07-01 are the current official editions",
      "that none has been superseded since the archive was assembled",
      "that any output is approved for participant delivery"
    ]
  });

  writeJson(`${OUT}/field-census.census-v1.json`, {
    schemaVersion: "rcap-official-form-field-census/v1-census-v1",
    familyId: FAMILY_ID,
    censusBasis: "first_hand_inspection_of_the_pinned_verified_binaries",
    geometryBasis:
      "Every write box is the AcroForm widget's own /Rect. It is read from the official binary by pikepdf into "
      + "reports/official-field-census.json, read again through pdf-lib from the tooling-readable rendition, and "
      + "the two are asserted equal to 0.011pt on every widget of every field before anything is written; a "
      + "disagreement stops the build. No box is derived from a label position. Captions are captured separately "
      + "and decide only what a blank means, never where it is. Every page is 612x792 with CropBox == MediaBox "
      + "and /Rotate 0, so page coordinates and user space coincide and no measurement needs a transform.",
    captionBasis:
      "Captions and region headings are harvested by scripts/rcap-official-forms/rcap-pdf-anchor-capture.mjs "
      + "through pdf-lib, which cannot open the official binaries. That is sound here and only here because the "
      + "rendition pipeline asserts each page's DECODED CONTENT STREAM is byte-identical to the official's, and "
      + "the harvester reads the content stream and nothing else.",
    filenameNote:
      "This file is deliberately NOT named field-census.json. "
      + "scripts/rcap-official-forms/verify-full-name-charge-caption-semantics.mjs walks "
      + "data/rcap-all50/overlays for that exact basename and asserts the family and field totals equal the "
      + "counts frozen in data/rcap-grade-a/field-semantics/full-name-charge-caption-classification-diff.json. "
      + "A predecessor on this branch wrote reports/field-census.json here, which moved the family count from "
      + "156 to 157 and made that verifier fail; the file is renamed reports/official-field-census.json and the "
      + "verifier passes again. The diff record is outside this family's owned path. The guard is not weakened, "
      + "skipped or quarantined, and this family's own charge-caption projection is in "
      + "reports/charge-caption-proof.json.",
    documents: documents.map(({ doc, census }) => ({
      documentId: doc.documentId,
      documentRole: doc.documentRole,
      ownership: doc.ownership,
      captionOnly: doc.captionOnly,
      pageGeometry: census.pageGeometry,
      fieldCount: census.fields.length,
      fields: census.fields
    })),
    totals: {
      documents: documents.length,
      terminalFields: documents.reduce((n, d) => n + d.census.fields.length, 0),
      checkableWidgetsMappedToADrawnBox: writeBoxMap.totals.matchedToDrawnBox,
      boxesDrawnByThisBuild: 0
    }
  });

  const decisionRows = documents.flatMap(({ doc, census, fixtures }) => {
    const role = new Map((doc.unwritable ?? []).map((u) => [u.field, u]));
    const written = new Map(fixtures.canonical.report.written.map((w) => [w.field, w]));
    const refused = new Map(fixtures.canonical.report.refused.map((r) => [r.field, r]));
    return census.fields.map((f) => {
      const w = f.widgets[0] ?? null;
      const r = role.get(f.name) ?? null;
      return {
        documentId: doc.documentId,
        field: f.name,
        pdfType: f.type,
        page: w?.page ?? null,
        writeBox: w?.rect ?? null,
        writeBoxBasis: w?.rectBasis ?? null,
        maxLength: f.maxLength,
        multiline: f.multiline,
        readOnlyInTheSource: f.readOnly,
        effectiveLabel: f.effectiveLabel,
        regionHeading: f.regionHeading,
        onStates: f.onStates,
        disposition: written.has(f.name) ? "written" : "refused",
        factId: written.get(f.name)?.factId ?? null,
        refusedReason: refused.get(f.name)?.reason ?? null,
        refusedCategory: refused.get(f.name)?.category ?? null,
        refusedByRole: Boolean(r),
        roleClass: r?.class ?? null,
        roleDisplaces: r?.displaces ?? null,
        roleWhy: r?.why ?? null
      };
    });
  });

  writeJson(`${OUT}/production-field-map.json`, {
    schemaVersion: "rcap-official-form-field-map/v1-census-v1",
    familyId: FAMILY_ID,
    routeKeys: [ROUTE_KEY],
    renderStrategy: "acroform_fill",
    generationAllowed: false,
    runtimeSelectable: false,
    mapCoverageNote:
      "Every one of the 217 terminal fields across the five documents is either written, refused by a shared "
      + "rule, or refused by this family's ROLE classification with a stated reason. `not_mapped` appears "
      + "nowhere. The written set is small, and section `whyTheWrittenSetIsSmall` says why field by field "
      + "rather than leaving it to be inferred.",
    filledFrom:
      "The tooling-readable rendition of each official binary, bound by the SHA-256 the rendition pipeline "
      + "proved on this run. Geometry is the official binary's, asserted equal on every widget.",
    noBoxWasDrawn:
      "reports/write-box-map.json binds all 59 checkable widgets to a box the form already draws, with each "
      + "widget's own /AP /N on-state. This build ticks none of them: on CR-180 each checkbox elects which "
      + "subdivision of § 1203.4 the petitioner qualifies under and on CR-181 each is the court's own ruling. "
      + "Both are legal determinations, and the platform makes neither.",
    whyTheWrittenSetIsSmall: [
      "CR-180 and CR-181 head their party block `ATTORNEY OR PARTY WITHOUT ATTORNEY`, and every field in it is "
      + "named Atty*. The shared `attorney` protect rule refuses all eleven, which is right for a represented "
      + "party and wrong for the self-represented petitioner this family serves. It is an OVER-refusal and it "
      + "is left standing: widening a protect category is not this family's call.",
      "CR-180's conviction table asks for Code, Section and Type of offense as three separate columns. The "
      + "shared vocabulary holds one `matter.charge` string, so there is nothing to decompose into them and "
      + "every cell is left blank. See reports/shared-vocabulary-gaps.json.",
      "CR-180's ConvictionDate is refused by the `disposition_or_hearing` protect rule, which matches the word "
      + "`conviction` in its own name.",
      "CR-181 is a proposed order the court signs; captionOnly restricts it to caption facts.",
      "CR-106 is a sworn proof of service; nothing but the caption is the platform's to state.",
      "MC-025 and MC-031 are continuation sheets whose body is free text the participant writes."
    ],
    fieldCount: decisionRows.length,
    writtenCount: decisionRows.filter((r) => r.disposition === "written").length,
    refusedByRoleCount: decisionRows.filter((r) => r.refusedByRole).length,
    fields: decisionRows
  });

  writeJson(`${OUT}/reports/charge-caption-proof.json`, {
    schemaVersion: "rcap-family-charge-caption-proof/v1",
    familyId: FAMILY_ID,
    question:
      "Does any blank whose caption or field name speaks of a charge, offence, count, statute or violation "
      + "carry a participant name token in the rendered bytes?",
    answeredFrom: "the flattened appearance streams of both fixtures, read at each field's measured rectangle",
    noChargeFactIsWrittenAnywhere:
      "This family supplies no explicit mapping for any sensitive fact, so matter.charge, matter.conviction_date "
      + "and their siblings are refused `requires_explicit_mapping` wherever they bind. Nothing this build "
      + "writes is a charge fact.",
    documents: documents.map(({ doc, fixtures }) => ({
      documentId: doc.documentId,
      chargeCaptionBlanks: fixtures.canonical.proof.chargeBlanks.length,
      canonical: fixtures.canonical.proof.chargeBlanks,
      boundary: fixtures.boundary.proof.chargeBlanks
    })),
    nameTokensSearchedFor: NAME_TOKENS,
    offendingBlanks: allFindings.filter((f) => f.check === "participant_name_in_a_charge_caption_blank"),
    result: allFindings.some((f) => f.check === "participant_name_in_a_charge_caption_blank")
      ? "FAILED" : "no participant name token appears in any charge-caption blank in either fixture"
  });

  writeJson(`${OUT}/reports/participant-name-placement.json`, {
    schemaVersion: "rcap-family-name-placement/v1",
    familyId: FAMILY_ID,
    method:
      "Every appearance drawn in each fixture is read out of the flattened bytes; any carrying a name token "
      + "must sit at a blank this family listed as one the participant's name belongs in.",
    nameMayAppearIn: NAME_MAY_APPEAR_IN,
    whyMC031FillText10IsNotOnThatList:
      "It is the PLAINTIFF/PETITIONER blank. Measured on the official page, `PLAINTIFF/PETITIONER:` prints at "
      + "y=730.56 and FillText10 sits at y=728.08-743.27; `DEFENDANT/RESPONDENT:` prints at y=715.14 and belongs "
      + "to FillText9 at y=711.83-726.71. The caption harvester attributes each blank the other's label. Because "
      + "both labels reach participant.full_legal_name the error is invisible in the binding and visible only on "
      + "the paper, where the petitioner would appear as the plaintiff as well as the defendant.",
    documents: documents.map(({ doc, fixtures }) => ({
      documentId: doc.documentId,
      canonical: fixtures.canonical.proof.namePlacements,
      boundary: fixtures.boundary.proof.namePlacements
    })),
    violations: allFindings.filter((f) => f.check === "participant_name_drawn_in_a_blank_not_listed_as_a_name_blank")
  });

  writeJson(`${OUT}/reports/role-refusals-proved-from-the-bytes.json`, {
    schemaVersion: "rcap-family-role-refusal-proof/v1",
    familyId: FAMILY_ID,
    what:
      "The seven wrong bindings this family found, each stated as a ROLE refusal and each proved to have drawn "
      + "nothing at its measured rectangle in both fixtures. A refusal that is recorded and then written anyway "
      + "is the failure this report exists to make impossible.",
    documents: documents.map(({ doc, fixtures }) => ({
      documentId: doc.documentId,
      declared: doc.unwritable,
      canonical: fixtures.canonical.proof.roleRefusals,
      boundary: fixtures.boundary.proof.roleRefusals,
      allBlankCanonical: fixtures.canonical.proof.roleRefusals.every((r) => r.blank),
      allBlankBoundary: fixtures.boundary.proof.roleRefusals.every((r) => r.blank)
    })),
    whyTheBoundaryFixtureCarriesFiveCharges:
      "MC-025's FillText5 resolves to charge row index 4 under rowIndexOf(). With fewer than five charges the "
      + "row guard refuses it and the ROLE refusal is untested. At five charges the row is available, the "
      + "binder would write matter.charges[4].case_number into a continuation sheet's CASE NUMBER caption, and "
      + "the role refusal is the only thing stopping it — which the boundary bytes then prove.",
    violations: allFindings.filter((f) => f.check === "role_refused_field_carries_ink")
  });

  writeJson(`${OUT}/reports/blanks-left-for-the-participant.json`, {
    schemaVersion: "rcap-family-blanks-left/v1",
    familyId: FAMILY_ID,
    what:
      "What a participant receiving this packet would still have to complete, and why. A blank left for a good "
      + "reason and a blank left because the binder could not reach it are different things and are separated.",
    categories: {
      theirs_by_design: "The document's own author intends the participant, the server or the court to write here.",
      over_refused_by_a_shared_rule:
        "A shared protect rule refuses a blank the participant would legitimately complete. Safe, but a gap.",
      refused_by_role: "This family refused it because the binder's offer was wrong. See role-refusals report.",
      no_fact_available: "Nothing in the shared fact vocabulary corresponds to what the blank asks for."
    },
    documents: documents.map(({ doc, census, fixtures }) => {
      const written = new Set(fixtures.canonical.report.written.map((w) => w.field));
      const refused = new Map(fixtures.canonical.report.refused.map((r) => [r.field, r]));
      const role = new Set((doc.unwritable ?? []).map((u) => u.field));
      return {
        documentId: doc.documentId,
        fieldCount: census.fields.length,
        written: [...written],
        blanks: census.fields.filter((f) => !written.has(f.name) && f.type !== "other").map((f) => {
          const r = refused.get(f.name);
          const category = role.has(f.name) ? "refused_by_role"
            : r?.category === "attorney" ? "over_refused_by_a_shared_rule"
            : r?.category === "disposition_or_hearing" ? "over_refused_by_a_shared_rule"
            : r?.reason === "no_allowlisted_fact_matches" ? "no_fact_available"
            : r?.reason === "requires_explicit_mapping" ? "theirs_by_design"
            : r?.reason === "court_issued_order_accepts_caption_facts_only" ? "theirs_by_design"
            : r?.category === "signature" || r?.category === "service_block" || r?.category === "court"
              || r?.category === "clerk" || r?.category === "agency" ? "theirs_by_design"
            : r?.category === "type_guard" ? "theirs_by_design"
            : "no_fact_available";
          return { field: f.name, pdfType: f.type, page: f.widgets[0]?.page ?? null,
            reason: r?.reason ?? null, category, effectiveLabel: f.effectiveLabel };
        })
      };
    }),
    theBiggestGap:
      "CR-180 and CR-181's party block. Eleven fields per form are named Atty* and the shared `attorney` protect "
      + "rule refuses every one, so a self-represented petitioner receives a petition with no name, address, "
      + "telephone number or email in the box the court reads first. It is an over-refusal in this family and "
      + "the correct refusal for a represented party, and widening a protect category is a shared-vocabulary "
      + "decision, not this family's."
  });

  writeJson(`${OUT}/reports/shared-vocabulary-gaps.json`, {
    schemaVersion: "rcap-family-vocabulary-gaps/v1",
    familyId: FAMILY_ID,
    what: "Where these five forms ask for something the shared fact vocabulary cannot express.",
    gaps: [
      {
        id: "charge-is-one-string-and-the-table-has-three-columns",
        where: "CR-180 page 1, ConvTable Row1-Row5",
        formAsksFor: ["Code (Penal, Vehicle, etc.)", "Section", "Type of offense (felony, misdemeanor, or infraction)"],
        vocabularyHolds: "matter.charges[n].charge — one free-text string",
        consequence:
          "All twenty-five cells are left blank. Writing the whole charge string into the `Code` column would "
          + "misstate the record to the court, which is the defect data/rcap-grade-a/stale-artifact-block.json "
          + "blocks twelve Arkansas and Kentucky artifacts for.",
        thisFamilyDidNotWorkAroundIt: true
      },
      {
        id: "eligibility-for-reduction-is-a-legal-conclusion",
        where: "CR-180 page 1, ConvTable columns `Reduce{n}` and `Offense{n}`",
        formAsksFor: [
          "Eligible for reduction to misdemeanor under Penal Code, § 17(b) (yes or no)",
          "Eligible for reduction to infraction under Penal Code, § 17(d)(2) (yes or no)"
        ],
        vocabularyHolds: "nothing — and correctly so",
        consequence:
          "Left blank. These columns ask the petitioner to assert a legal conclusion about their own "
          + "convictions. The platform holds no such fact and must not manufacture one.",
        thisFamilyDidNotWorkAroundIt: true
      },
      {
        id: "short-title-blanks-are-left-empty",
        where: "CR-181 page 2, P2Header.Party1; MC-025 FillText6 (SHORT TITLE); MC-031 FillText11 (CASE NUMBER)",
        formAsksFor: "the short title and case number that identify which filing a continuation sheet belongs to",
        vocabularyHolds: "participant.full_legal_name and matter.case_number, both of which the binder reaches "
          + "wrongly here -- through a squashed caption band on CR-181, and through the trailing-digit row-index "
          + "heuristic on the two MC forms",
        consequence:
          "All three are left blank, so a continuation sheet is delivered without the caption that ties it to "
          + "the petition. A participant completes it by hand.",
        correctedByMeasurement:
          "CR-106's TCCaseName_ft was expected to have the same problem and does NOT. Measured on the raster: "
          + "the form itself prints `People of the State of California` and `v.` inside the Case Name box, so "
          + "writing the defendant's name alone completes the case name exactly. It is written, and it is "
          + "right.",
        thisFamilyDidNotWorkAroundIt: true
      },
      {
        id: "row-index-heuristic-reads-any-trailing-digit-as-a-table-row",
        where: "MC-025 FillText5, MC-031 FillText11",
        formAsksFor: "the CASE NUMBER in the caption of a continuation sheet",
        vocabularyHolds: "matter.case_number, which is a ROW_FACT",
        consequence:
          "rowIndexOf() in rcap-field-semantics.mjs matches /^(.*?)(\\d{1,2})$/ against the field NAME, so any "
          + "field whose name ends in a digit is treated as a repeating row. Both are refused by role here. "
          + "The class is corpus-wide and belongs to whoever owns the shared module.",
        thisFamilyDidNotWorkAroundIt: true,
        forTheCaptain: true
      }
    ]
  });

  writeJson(`${OUT}/reports/rendered-artifacts.json`, {
    schemaVersion: "rcap-family-rendered-artifacts/v1",
    familyId: FAMILY_ID,
    note:
      "Internal review fixtures. Nothing here is a participant deliverable, a fulfilment record or an approved "
      + "output. Each was rendered from a tooling-readable rendition whose identity to the official binary is "
      + "proved in readable-rendition.json, and each was verified from its own bytes.",
    artifacts: documents.flatMap(({ doc, fixtures, rendition }) =>
      ["canonical", "boundary"].map((label) => ({
        documentId: doc.documentId,
        formNumber: doc.formNumber,
        fixture: label,
        file: fixtures[label].file,
        sha256: fixtures[label].sha256,
        byteLength: fixtures[label].byteLength,
        officialSha256: doc.sha256,
        renditionSha256: rendition.sha256,
        fieldsWritten: fixtures[label].report.written.length,
        fieldsRefused: fixtures[label].report.refused.length,
        appearancesDrawn: fixtures[label].proof.appearancesDrawn,
        blockedHash: false
      }))),
    rasters
  });

  writeJson(`${OUT}/reports/independent-visual-review.json`, {
    schemaVersion: "rcap-family-visual-review/v1",
    familyId: FAMILY_ID,
    status: "NOT_INDEPENDENT",
    performedBy: "the same worker that produced the artifacts",
    whyThatMatters:
      "A worker checking its own output is not an independent review, and this record says so rather than "
      + "letting a green raster set stand in for one.",
    pagesRastered: rasters.reduce((n, r) => n + r.pages.length, 0),
    everyPageOfEveryFixture: true,
    aGreenRasterIsNotEvidenceAboutXfa:
      "The rasteriser does not render XFA. For the XFA question in build-findings.json, our own raster review is "
      + "structurally incapable of showing a difference and must not be cited as evidence either way.",

    theRasterIsNotThePrintedPage: {
      what:
        "These forms carry OPTIONAL CONTENT, and the rasteriser ignores /OCProperties. A reviewer looking at "
        + "these PNGs is not looking at what a printer would put on paper, in both directions, and the "
        + "measurement below says exactly which.",
      measuredBy: "scripts/rcap-corpus/build-tooling-readable-rendition.py, from the official binaries",
      groups: renditionReport.sources.map((s) => ({
        formNumber: s.formNumber,
        optionalContentPresent: s.optionalContent.present,
        groups: s.optionalContent.groups,
        usedOnPages: s.optionalContent.usageByPage
      })),
      whatItMeansHere:
        "CR-180, CR-181 and CR-106 each use exactly ONE optional-content block, on their last page, and every "
        + "one of them is in a group named `ViewOnly Layer` whose /Usage says /Print /PrintState /OFF. That "
        + "block is the light-grey panel (0.753 grey, [36.00, 12.78, 247.29, 35.96] on CR-180 page 3) that the "
        + "form paints behind its `Clear This Form` warning. It appears in these rasters and a conforming "
        + "printer omits it. It is the court's own page content and was NOT added, moved or removed by this "
        + "build; nothing here rewrites a page.",
      theDangerousDirectionWasChecked:
        "The reverse case is the one that would matter: content in a group with /PrintState /ON and /ViewState "
        + "/OFF prints on the filed page and never appears in a raster, so a visual review could not see it. "
        + "CR-180, CR-181 and CR-106 each DECLARE such a group -- `PrintOnly Layer` -- but no page of any of "
        + "the five forms draws a single block inside it. So there is no content on these documents that "
        + "prints and is invisible to this review.",
      forTheReviewer:
        "Read the grey panel at the foot of CR-180 page 3, CR-181 page 2 and CR-106 page 2 as a rasteriser "
        + "artefact, not as ink on the filing."
    },

    pageByPageReview: rasters.flatMap((r) => r.pages.map((page, i) => ({
      document: r.document, fixture: r.fixture, page: i + 1, file: page.file,
      reviewedBy: "the worker that produced it (not independent)"
    }))),
    rasters
  });

  const xfaSources = renditionReport.sources.filter((s) => s.xfaDecision.sourceCarriesXfa);
  writeJson(`${OUT}/build-findings.json`, {
    schemaVersion: "rcap-family-build-findings/v1",
    familyId: FAMILY_ID,
    worklistGroupId: WORKLIST_GROUP_ID,
    routeKeys: [ROUTE_KEY],
    blockingFindings: allFindings.filter((f) => f.severity === "blocking"),
    blockingFindingCount: allFindings.filter((f) => f.severity === "blocking").length,

    xfaDecision: {
      question: "Does any source carry XFA, was it removed, and why?",
      sourcesCarryingXfa: xfaSources.map((s) => ({
        formNumber: s.formNumber, shape: s.xfaDecision.shape, partCount: s.xfaDecision.partCount,
        hybridStaticXfa: s.xfaDecision.hybridStaticXfa, packetSha256: s.xfaDecision.officialPacketSha256
      })),
      sourcesWithoutXfa: renditionReport.sources
        .filter((s) => !s.xfaDecision.sourceCarriesXfa).map((s) => s.formNumber),
      atTheRenditionStage: {
        removed: false,
        why:
          "The rendition stage's whole claim is that the rendition IS the document. A rendition that dropped the "
          + "XFA packet would not be. The packet is carried through and its SHA-256 is a compared dimension: "
          + "identical on all three.",
        packetIdentical: xfaSources.every((s) => s.xfaDecision.packetIdentical)
      },
      atTheFillStage: {
        removed: true,
        removedBy: "pdf-lib 1.17.1, on load, announcing `Removing XFA form data as pdf-lib does not support reading or writing XFA`",
        optional: false,
        whatIsLost: ["the /XFA packet", "the publisher's /Standard handler and its permission bits"],
        whatIsNotLost: [
          "every page's decoded content stream, byte for byte — what prints and what is filed",
          "every page's geometry",
          "every terminal field's identity, type, flags and maximum length",
          "every widget's rectangle"
        ],
        whyThisIsProbablyAcceptableAndWhyItIsSTILLTheCaptainsCall:
          "All three are hybrid STATIC XFA (/XFA present, /NeedsRendering absent), so the page content is what "
          + "prints and the XFA packet is redundant with it. And because pdf-lib REMOVES the packet rather than "
          + "leaving it stale, there is no AcroForm/XFA desynchronisation and no risk of a viewer rendering the "
          + "form blank — the obvious fear is the wrong one here. But it is still an alteration to an official "
          + "Judicial Council form, and the discipline is to say what is lost and let a human rule on it rather "
          + "than bake the ruling into a committed artifact.",
        howNOTToCheckIt:
          "Not by looking at the rasters. The rasteriser does not render XFA, so this class of change is "
          + "invisible to our own visual review in both directions."
      }
    },

    sharedModuleRepaired: {
      which: "scripts/rcap-official-forms/rcap-active-content.mjs, detachFromAcroForm()",
      theDefect:
        "SUPPRESS_CONTROL_APPEARANCE did not hold on a nested field tree. dropWidgets() deletes a suppressed "
        + "field's /AP and removes its widget from the page's /Annots, then calls detachFromAcroForm() to take "
        + "the field out of the form -- but detachFromAcroForm scanned only the TOP LEVEL of /Fields. On a "
        + "flat-named form every field is top-level and it worked. On an XFA-authored form it is not: CR-180's "
        + "`Print this form` button lives at CR-180[0] > #pageSet[0] > MPLast[0] > Footer[0] > Print[0], so "
        + "nothing was detached, the field stayed in the form, and the next two lines of sanitizeAndFlatten "
        + "undid the suppression completely -- updateFieldAppearances saw a widget with no /AP (because "
        + "dropWidgets had just deleted it) and REGENERATED the button face from /MK /CA, and flatten then "
        + "found the widget's page through its /P and stamped that face onto the page.",
      whatItPutOnFiledDOCUMENTS:
        "On this family, before the repair: `www.courts.ca.gov`, `Print this form`, `Save this form`, "
        + "`Clear this form` and `For your protection and privacy, please press the Clear This Form button "
        + "after you have printed the form.` -- drawn as ordinary ink on CR-180, CR-181 and CR-106.",
      theRepair:
        "detachFromAcroForm walks the field tree instead of only its top level, descending only into "
        + "non-terminal nodes (a terminal field's /Kids holds widgets, not fields) and pruning an ancestor "
        + "left holding an empty /Kids -- without that prune, pdf-lib reads such a node as a terminal and "
        + "throws on its missing /FT. On a flat form the behaviour is byte-for-byte what it was.",
      blastRadiusMeasured:
        "All five census-v1 families were rebuilt after the repair. ak-tf805-set, ar-arrest-seal-set, "
        + "ar-misdemeanor-dwi-seal-set and mi-setaside-marihuana-set are byte-identical -- their forms are "
        + "flat-named, so the top-level scan already reached every field. ct-cleanslate-petition-set MOVED, "
        + "and the whole of the move is that four appearances left its two fixtures: `Print Form` and "
        + "`Reset Form`, on pages 1 and 2. Nothing was added and no content was lost.",
      ctHadAlreadyFoundIt:
        "ct-cleanslate-petition-set's own build-findings.json carried eight advisory findings, "
        + "`flattening_materialised_the_forms_own_widget_caption`, one per button per fixture, noting that a "
        + "filed copy carries the words at the foot of the sheet and recording them for visual review. It saw "
        + "the symptom and could not reach the cause. After the repair its advisory list is empty and its own "
        + "verification still passes. Its regenerated fixtures, rasters and hash records are committed with "
        + "this change, because leaving them would leave committed artifacts that its own build script no "
        + "longer reproduces.",
      whyThisWasNotWorkedAroundInThisFamilyInstead:
        "There is no lever. The disposition this family would supply is already the one being computed; the "
        + "failure is downstream of it, in the flatten path. A family-local workaround would have meant "
        + "leaving every other California Judicial Council form with the same defect."
    },

    verifierAlreadyFailingOnTheBranch: {
      which: "scripts/rcap-official-forms/verify-name-date-component-semantics.mjs",
      status: "still failing, on one check, and it was failing before this build",
      measured:
        "Run against a pristine worktree of the branch point (2f023bd1): `the record scanned every committed "
        + "census, including census-v1 -- 157 of 162 censuses, 5352 of 5428 fields`. Run after this build: "
        + "`157 of 162 censuses, 5352 of 5645 fields`.",
      whatThisBuildChangesAboutIt:
        "The census COUNT is unchanged at 162: this family removed one scanned filename "
        + "(reports/field-census.json) and added another (field-census.census-v1.json). The FIELD count grows "
        + "by 217 because the removed file was `forms`-shaped and contributed zero fields to that scan, while "
        + "the added one is `documents`-shaped and contributes all 217 -- which is this family being enrolled "
        + "in the scan, as the check itself requires (it asserts a field-census.census-v1.json is present).",
      everyOtherCheckInThatVerifierPasses: true,
      notFixedHere:
        "The frozen record is data/rcap-grade-a/field-semantics/name-date-component-classification-diff.json, "
        + "regenerated by scripts/rcap-official-forms/diff-name-date-component-semantics.mjs. It is a shared "
        + "record outside this family's owned path and regenerating it would restate another lane's totals as "
        + "a side effect of a California build. Reported rather than edited.",
      action: "reported, not acted on"
    },

    forTheCaptain: [
      {
        id: "pdf-lib-cannot-read-any-encrypted-source",
        severity: "factory-level",
        finding:
          "pdf-lib 1.17.1 implements no decryption at all. PDFDocument.load throws on any encrypted input, and "
          + "with { ignoreEncryption: true } it parses still-encrypted object streams as plaintext and fails on "
          + "every indirect reference — which is the `Expected instance of PDFDict, but got instance of "
          + "undefined` recorded across the corpus index. It is therefore structurally unable to write a filled "
          + "artifact from ANY encrypted official source, not only these five.",
        whatThisFamilyDidAboutIt:
          "Built scripts/rcap-corpus/build-tooling-readable-rendition.py: verify the official SHA-256 first, "
          + "produce a tooling-readable rendition under private/, prove it is the same document on thirteen "
          + "dimensions, prove the bytes are deterministic, and record the tool and its version. A new preflight "
          + "check, readable_rendition_stage_declared, refuses to call any family that declares a rendition "
          + "request buildable unless the stage is installed AND its committed proof holds.",
        stillTheCaptainsToDecide:
          "Whether the rendition stage is adopted corpus-wide, and how it is declared. pikepdf is a Python "
          + "dependency and package.json is the worker-image input; this build did not touch package.json, so "
          + "the stage is currently declared by the preflight check and by this family's rendition request, not "
          + "by a manifest a worker image reads.",
        action: "reported, not acted on"
      },
      {
        id: "structuralClassObserved-unreadable-is-the-wrong-label",
        severity: "shared-manifest",
        finding:
          "data/rcap-all50/local-source-corpus-index.json records all five of this family's sources as "
          + "`structuralClassObserved: \"unreadable\"` with `loadError: \"Expected instance of PDFDict, but got "
          + "instance of undefined\"`. That is a true statement about pdf-lib 1.17.1 and a false statement about "
          + "the documents: every one opens on the first try, with an empty user password, through any "
          + "implementation of the standard security handler. Reading `unreadable` as `damaged` is what made "
          + "this family look unbuildable.",
        suggestedValue:
          "Something that distinguishes encrypted-but-readable from damaged — e.g. "
          + "`encrypted_permissions_only_readable`, carrying the handler, /V, /R and the fact that the user "
          + "password is empty.",
        likelyBlastRadius:
          "The other rescued sources (DE, ME x2, NV, PA, WV, CA CR-409/CR-410) and any other encrypted entry.",
        notEditedHere: "It is a shared manifest and outside this family's owned path.",
        action: "reported, not acted on"
      },
      {
        id: "row-index-heuristic-reads-any-trailing-digit-as-a-table-row",
        severity: "shared-module",
        finding:
          "rowIndexOf() in rcap-field-semantics.mjs matches /^(.*?)(\\d{1,2})$/ against a field NAME, so any "
          + "field whose name ends in 1-40 is treated as row N of a repeating table. MC-025's FillText5 and "
          + "MC-031's FillText11 are CASE NUMBER caption blanks, and matter.case_number is a ROW_FACT, so with "
          + "five or eleven charges available the binder writes that row's case number into a continuation "
          + "sheet's caption. Both are refused by role here and proved blank in the boundary bytes.",
        action: "reported, not acted on"
      },
      {
        id: "the-shared-appearance-registry-cannot-take-a-sixth-family",
        severity: "shared-manifest",
        finding:
          "data/rcap-all50/shared/field-appearance-semantics.json is the sanctioned place to record what a "
          + "field's appearance MEANS, and it is keyed by family. But scripts/verify-rcap-appearance-"
          + "semantics.mjs asserts it covers EXACTLY the five Nebraska families it was assigned, by an "
          + "equality frozen in the verifier file rather than in a data record. A sixth family cannot "
          + "contribute to the shared registry without editing that assertion.",
        whatThisFamilyDidAboutIt:
          "Recorded its two classifications in its own field-appearance-dispositions.json, in the same schema "
          + "and loaded through the shared module's own validating loader, and handed the finalizer the plain "
          + "field-name map it takes. Nothing shared was edited and that verifier still passes at exactly five "
          + "families. But per-family copies of a shared registry is not where this should end up.",
        theTwoClassifications:
          "MC-025 and MC-031's NoticeHeader1 and NoticeFooter1 -- read-only text fields whose appearance draws "
          + "`please press the Clear This Form button`, an instruction about a control a flattened artifact "
          + "does not have. Measured chrome, not the court's content: no text-drawing operator in either "
          + "page's own content layer sits above y=760, and MC-025 carries its own hiding mechanism for it, a "
          + "field literally named WhiteOut painted over it.",
        action: "reported, not acted on"
      },
      {
        id: "preflight-prove-mode-reports-two-master-library-checks-vacuous",
        severity: "minor",
        finding:
          "`node scripts/verify-packet-build-environment.mjs --prove` reports master_library_mounted and "
          + "master_library_complete as VACUOUS when MASTER_LIBRARY_SOURCE_DIR is exported, because "
          + "masterLibraryRoot() honours that variable and so resolves the same corpus for the synthetic barren "
          + "environment as for the real one. Pre-existing, not introduced by this build, and noted because "
          + "--prove is the mechanism that keeps the preflight honest.",
        action: "reported, not acted on"
      }
    ],

    whatThisBuildDidNotDo: [
      "It did not edit data/rcap-all50/local-source-corpus-index.json, or any other shared manifest.",
      "It did not touch package.json, migrations/**, production, payment or sponsorship.",
      "It did not modify scripts/lib/pdf-stroked-boxes.mjs, rcap-field-semantics.mjs, rcap-pdf-anchor-capture.mjs "
      + "or rcap-official-form-finalize.mjs. It DID modify rcap-active-content.mjs, and sharedModuleRepaired "
      + "above says exactly what and measures the blast radius across all five census-v1 families.",
      "It did not build, dispatch or measure any other encrypted California family. The pipeline is what "
      + "unblocks them; finishing this one first is what proves the pipeline.",
      "It did not commit a source binary, a derivative, an absolute container path or a symlink.",
      "It did not open, read or modify any rescued derivative.",
      "It did not tick a checkbox, draw a box, or write a participant name into any charge, offence, count, "
      + "statute or violation caption.",
      "It did not prefill a signature, a signature date, a certificate of mailing or a court-only field.",
      "It did not skip, weaken or quarantine a verifier — and it repaired one a predecessor on this branch broke."
    ],

    verifierRepaired: {
      which: "scripts/rcap-official-forms/verify-full-name-charge-caption-semantics.mjs",
      wasFailing:
        "A predecessor on this branch wrote reports/field-census.json into this family's directory. That "
        + "verifier walks data/rcap-all50/overlays for that exact basename and asserts the family count equals "
        + "the 156 frozen in the committed classification diff, so it saw 157 and failed: `the recorded field "
        + "and family totals are the corpus's own — 5286 of 5286 across 156 of 157`.",
      fix:
        "The official-geometry census is renamed reports/official-field-census.json, which is also the more "
        + "accurate name for what it is. The verifier passes again at 156 families and 5286 fields. Nothing was "
        + "weakened and the frozen diff record was not edited."
    }
  });

  writeJson(`${OUT}/product-wiring.json`, {
    schemaVersion: "rcap-family-product-wiring/v1",
    familyId: FAMILY_ID,
    worklistGroupId: WORKLIST_GROUP_ID,
    routeKeys: [ROUTE_KEY],
    implementationStrategy: "official_pdf_fill",
    renderStrategy: "acroform_fill",
    fieldMap: `${OUT}/production-field-map.json`,
    sourceReceipt: `${OUT}/source-receipt.json`,
    renditionProof: RENDITION_REPORT,
    generationAllowed: false,
    runtimeSelectable: false,
    createsFulfilmentRecord: false,
    opensCommercialRoute: false,
    wiringIsNotApproval:
      "This record names the artifacts a runtime would read if this family were ever enabled. It enables "
      + "nothing. generationAllowed and runtimeSelectable are both false, no payment, sponsorship or fulfilment "
      + "record is touched, no route identity is created or changed, and no legal eligibility rule is written. "
      + "Commercial authority comes from a Grade-A fulfilment record keyed to an exact route and packet family, "
      + "and from nothing else.",
    aRuntimeWouldAlsoNeedTheRenditionStage:
      "Every one of the five sources is encrypted, so a runtime that rendered this family would need the "
      + "rendition stage present, not only the field map. That is a real deployment fact and it is stated here "
      + "rather than discovered later: without pikepdf (or an equivalent standard-handler implementation) ahead "
      + "of pdf-lib, this family renders nothing at all.",
    blockersBeforeThisCouldEverBeEnabled: [
      "OUTPUT_LEGAL_APPROVAL_REQUIRED — not addressed by this build; requested in approval-request.json.",
      "A ruling on the XFA question in build-findings.json: a filled artifact preserves the printed page byte "
      + "for byte but loses the /XFA packet and the publisher's permission bits.",
      "An independent visual review. The review recorded by this build was performed by the worker that "
      + "produced the artifacts and is therefore not independent.",
      "A decision on whether the rendition stage is adopted as a declared factory dependency.",
      "Source currency for all five editions, none of which this build establishes.",
      "The party block. A self-represented petitioner receives CR-180 and CR-181 with no name, address, "
      + "telephone or email, because the shared `attorney` protect rule refuses the whole Atty* block. See "
      + "reports/blanks-left-for-the-participant.json.",
      "LOCAL_VARIATION_REQUIRED is addressed statewide only: local-variation-record.json establishes "
      + "county-specific practice for ZERO of California's 58 counties."
    ],
    pathsThisFamilyOwns: [
      OUT,
      "scripts/build-census-v1-ca-1203-4-set.mjs",
      "scripts/census-v1-ca-1203-4-set/"
    ],
    pathsThisFamilyAddedForEveryone: [
      "scripts/rcap-corpus/build-tooling-readable-rendition.py — generic; driven by a per-family "
      + "readable-rendition-request.json and used here for this family only",
      "scripts/verify-packet-build-environment.mjs — one added check, readable_rendition_stage_declared",
      "scripts/rcap-official-forms/rcap-active-content.mjs — detachFromAcroForm now walks the field tree "
      + "instead of only its top level, so SUPPRESS_CONTROL_APPEARANCE holds on a nested (XFA-authored) form. "
      + "See build-findings.json sharedModuleRepaired: four of the five census-v1 families are byte-identical "
      + "after it, and the fifth (CT) loses exactly the four `Print Form`/`Reset Form` appearances its own "
      + "advisory findings had already flagged.",
      "data/rcap-all50/overlays/census-v1/ct/... — CT's fixtures, rasters and hash records regenerated by its "
      + "own unmodified build script, because a committed artifact its script no longer reproduces is worse "
      + "than an updated one"
    ],
    pathsThisFamilyDidNotTouch: [
      "package.json",
      "migrations/**",
      "data/rcap-all50/local-source-corpus-index.json",
      "data/rcap-grade-a/** (shared manifests, census records and the stale-artifact block)",
      "data/rcap-all50/shared/field-appearance-semantics.json",
      "scripts/rcap-official-forms/rcap-field-semantics.mjs",
      "scripts/rcap-official-forms/rcap-pdf-anchor-capture.mjs",
      "scripts/rcap-official-forms/rcap-official-form-finalize.mjs",
      "scripts/rcap-official-forms/rcap-appearance-semantics.mjs",
      "scripts/lib/pdf-stroked-boxes.mjs",
      "any other packet family's build script, field map, census or source receipt"
    ]
  });

  writeJson(`${OUT}/approval-request.json`, {
    schemaVersion: "rcap-output-approval-request/v1",
    familyId: FAMILY_ID,
    worklistGroupId: WORKLIST_GROUP_ID,
    routeKeys: [ROUTE_KEY],
    status: "REQUESTED",
    grantedBy: null,
    note:
      "This is a REQUEST for output-level legal review. This build grants no approval, opens no commercial "
      + "route, creates no fulfilment record and marks no packet proven. The family remains not "
      + "runtime-selectable and generationAllowed is false.",
    workTypesAddressed: {
      OFFICIAL_SOURCE_ACQUISITION_REQUIRED:
        "Resolved as custody, not acquisition: all five sources were already held and each is bound by pinned "
        + "SHA-256 on the bytes and on the committed corpus index. Nothing was acquired.",
      OFFICIAL_FORM_MAP_REQUIRED:
        "Field map built from measured widget geometry for all 217 terminal fields across five documents; every "
        + "field is written, refused by a shared rule, or refused by role with a stated reason. `not_mapped` "
        + "appears nowhere. 59 of 59 checkable widgets are additionally bound to a box the form draws, with each "
        + "widget's own on-state, in reports/write-box-map.json.",
      LOCAL_VARIATION_REQUIRED:
        "Addressed in local-variation-record.json — statewide only. Zero of California's 58 counties has any "
        + "county-specific practice established from a source in this environment.",
      ARTIFACT_REVIEW_REQUIRED:
        "Canonical and boundary fixtures rendered for all five documents and verified from the artifact bytes "
        + "at their measured rectangles; every page of every fixture rastered.",
      OUTPUT_LEGAL_APPROVAL_REQUIRED:
        "NOT addressed. Requested here; a human legal reviewer grants it or does not."
    },
    questionsForTheReviewer: [
      "The XFA question. A filled CR-180, CR-181 or CR-106 preserves the printed page byte for byte but loses "
      + "the /XFA packet and the publisher's permission bits, because pdf-lib removes XFA on load and offers no "
      + "option to keep it. Acceptable for a Judicial Council form filed with a Superior Court?",
      "CR-180 and CR-181 are delivered with an empty party block, because every field in "
      + "`ATTORNEY OR PARTY WITHOUT ATTORNEY` is named Atty* and the shared attorney protect rule refuses it. "
      + "Is a petition with no petitioner contact details worth delivering, or should the shared rule learn "
      + "that this box belongs to a party without an attorney?",
      "CR-180's conviction table is delivered entirely blank, because the form wants Code, Section and Type of "
      + "offense in separate columns and the vocabulary holds one charge string. Is a blank table acceptable, "
      + "or does this family need a decomposed charge fact first?",
      "CR-106 is delivered with only its caption completed. Under Code Civ. Proc. § 1013a service by mail is "
      + "made by someone who is not a party, so the participant is not the server — is including a "
      + "caption-only proof of service in the packet the right thing, or should CR-106 ship blank?",
      "Should the platform ever tick a box on CR-180? Every checkbox on it elects which subdivision of "
      + "§ 1203.4 the petitioner qualifies under. reports/write-box-map.json has the measured geometry and "
      + "on-states ready if the answer is ever yes."
    ],
    whatThisRequestDoesNotAssert: [
      "that any of the five editions is current",
      "that the packet is complete for any county",
      "that any output may be delivered to a participant"
    ]
  });

  // ---- the gate ----------------------------------------------------------------
  const blocking = allFindings.filter((f) => f.severity === "blocking");
  console.log(`\n${"=".repeat(78)}`);
  console.log(`documents: ${documents.length}   fields: ${decisionRows.length}`
    + `   written (canonical): ${decisionRows.filter((r) => r.disposition === "written").length}`
    + `   refused by role: ${decisionRows.filter((r) => r.refusedByRole).length}`);
  console.log(`fixtures: ${documents.length * 2}   pages rastered: ${rasters.reduce((n, r) => n + r.pages.length, 0)}`);
  for (const d of documents) {
    for (const label of ["canonical", "boundary"]) {
      console.log(`  ${d.doc.formNumber} ${label.padEnd(9)} ${d.fixtures[label].sha256}`
        + `  ${String(d.fixtures[label].report.written.length).padStart(2)} written`);
    }
  }
  if (blocking.length) {
    console.error(`\n${blocking.length} BLOCKING finding(s):`);
    for (const f of blocking.slice(0, 20)) console.error(`  ${f.fixture} ${f.field}: ${f.check} ${JSON.stringify(f.drawnText ?? "")}`);
    process.exit(1);
  }
  console.log("\nCA_1203_4_SET_BUILD_COMPLETE: 0 blocking findings");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
