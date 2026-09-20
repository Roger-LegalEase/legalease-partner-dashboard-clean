#!/usr/bin/env node
// Route-obligation census v1 — packet family `ar-pardon-seal-set`.
//
//   node scripts/build-census-v1-ar-pardon-seal-set.mjs
//   node scripts/build-census-v1-ar-pardon-seal-set.mjs --census-only
//
// Arkansas, sealing the record of a PARDONED OFFENDER or PARDONED YOUTHFUL
// FELONY OFFENDER under Act 1460 of 2013, A.C.A. § 16-90-1401 et seq., route
// `obligation:unit:AR:ar-pardon-seal:ar-pardon-seal-stage-2`. Two documents:
//
//   * the ACIC Petition to Seal Records of a Pardoned Offender or Pardoned
//     Youthful Felony Offender — the participant's own filing;
//   * the ACIC Order of the same name — the proposed order the COURT signs.
//
// WHAT THIS ROUTE IS, AND WHAT IT MUST NOT SAY
//
// This packet is the SEALING STEP THAT FOLLOWS A PARDON. It does not apply for
// a pardon, evidence one, or establish that one was granted. The petition's
// paragraph 5 prints
//
//     5. On the ____ day of ________, the Governor issued a Pardon to the
//        Defendant for the above referenced offense(s).
//
// and the order opens "Before the Court is the Pardon issued by the Governor in
// the above referenced matter." The printed sentences are the form's; the blanks
// in them are not this build's to fill. Writing a date into that trio would
// assert, on the participant's own signed petition, that a pardon issued on a
// day this platform has no fact for. The trio is refused by role, and the
// refusal is recorded as a route precondition rather than as a formatting rule.
//
// HOW THIS DIFFERS FROM ITS TWO SIBLINGS
//
// scripts/build-census-v1-ar-arrest-seal-set.mjs builds the AR ACIC arrest-seal
// family. Its two forms are AcroForms — 37 and 29 widgets — so its census reads
// geometry off each widget's own /Rect and its fill stage is
// finalizeOfficialForm. None of that transfers.
//
// scripts/build-census-v1-ar-misdemeanor-dwi-seal-set.mjs is the pattern this
// build follows. Its two forms are FLAT, as these two are, so its census
// measures every write box from the page content stream and its fill stage is
// finalizeFlatOverlay. This file reuses that method unchanged.
//
// ONE THING DOES NOT TRANSFER FROM THE FLAT SIBLING, AND IT IS THE WHOLE RISK.
//
// The DWI forms PRE-PRINT the offence — "charged with the offense(s) of Driving
// or Boating While Intoxicated" — so that family could prove there was no charge
// blank to fill. THESE TWO DOCUMENTS DRAW CHARGE BLANKS. Both print
//
//     1. The Defendant was arrested on the ___ day of ______, ____, and charged
//        with the offense(s) of: ______________________
//     2. The Defendant either pled guilty or nolo contendere or was found guilty
//        ... the offense(s) of: ______________________
//
// The stale-artifact block in data/rcap-grade-a/stale-artifact-block.json is
// about a map that wrote the PARTICIPANT'S NAME into blanks holding the offence
// they were charged with, and one of the twelve blocked artifacts is the AR ACIC
// arrest petition — the same authority, the same drafting, the same year. This
// family has the defect's surface. It is therefore the family where the
// charge-caption proof does real work rather than confirming an absence, and the
// proof is taken from the artifact's own glyphs at the measured rectangles.
//
// WHAT THE CONTENT STREAM ACTUALLY DRAWS
//
// scripts/lib/pdf-stroked-boxes.mjs is run over every page of both documents. It
// maintains the CTM through q/Q/cm and emits only on stroke operators, which is
// the detector that found fourteen checkboxes on the Oregon set-aside form after
// an `re`-only scan reported none. Whatever it reports here is recorded as a
// MEASUREMENT — including zero — because "the tool found nothing" and "the tool
// was not run" are different findings.
//
// The blanks themselves are drawn two ways, both measured through the shared
// CTM-tracking walker in scripts/rcap-official-forms/rcap-pdf-anchor-capture.mjs:
//
//   * UNDERSCORE LEADER RUNS — runs of the `_` glyph inside a text-showing
//     operator, "vs. Case No. ______". Start, end and baseline come from the
//     glyph metrics.
//   * DRAWN RULES — thin filled rectangles, read by rulesOfPage from the same
//     walk.
//
// A rule with printed glyphs sitting on it is an UNDERLINE, not a blank — both
// forms underline their own titles — so each rule is classified by measuring how
// much of its width carries glyphs above it. Nothing is classified by guessing
// which line looks like a heading.
//
// THE REVISION SKEW, RECORDED AND NOT CORRECTED
//
// The order is REV-2022-03-07 and the petition REV-2022-03-08: the order carries
// a revision date one day BEFORE the petition it is filed with. Both revisions
// are confirmed from the corpus index and from each file's own printed footer.
// This is recorded as an observed property of the pinned pair. It is not an
// error, it is not corrected, and neither document is substituted for a
// same-dated one.
//
// A GAP IN THE SHARED FLAT PATH, COMPENSATED HERE AND REPORTED
//
// finalizeOfficialForm passes `regionHeading` to decideBinding, so a widget under
// a printed "Certificate of Service" is refused by region whatever it is called.
// finalizeFlatOverlay does not pass it — see the decideBinding call in
// scripts/rcap-official-forms/rcap-official-form-finalize.mjs — so on a flat
// overlay the region channel never runs. That matters here: the petition's page 3
// is a VERIFICATION carrying a notarial jurat and page 4 is a Certificate of
// Service, and both are regions the shared rules would protect if they were
// asked. This family computes regionProtectCategoryOf itself and withholds every
// anchor in a protected region, so nothing here depends on the gap. The gap is
// not patched from this family's build — the shared module is not this family's
// path — it is carried as a finding with the evidence to reproduce it.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

import { extractTextItems, groupIntoLines, normalizeHarvestedText }
  from "./rcap-official-forms/rcap-pdf-anchor-capture.mjs";
import { rulesOfPage } from "./rcap-official-forms/rcap-pdf-rule-lines.mjs";
import { finalizeFlatOverlay } from "./rcap-official-forms/rcap-official-form-finalize.mjs";
import { rasterizePdf } from "./rcap-official-forms/rcap-pdf-rasterize.mjs";
import { stampDeterministic } from "./rcap-official-forms/rcap-deterministic-pdf-date.mjs";
import { strokedRectangles } from "./lib/pdf-stroked-boxes.mjs";
import {
  CHARGE_VALUE_WORDS, captionDescribesChargeValue, descriptorsMatching, protectCategoryOf,
  regionProtectCategoryOf, decideBinding
} from "./rcap-official-forms/rcap-field-semantics.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(rootDir);
const require = createRequire(import.meta.url);
const { PDFDocument, StandardFonts, PDFName } = require("pdf-lib");

const FAMILY_ID = "ar-pardon-seal-set";
const OUT = "data/rcap-all50/overlays/census-v1/ar/ar-pardon-seal-set--official-pdf-fill";
const CORPUS_INDEX = "data/rcap-all50/local-source-corpus-index.json";
const CORPUS_ROOT = "private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1";
const STALE_BLOCK = "data/rcap-grade-a/stale-artifact-block.json";
const ROUTE_KEY = "obligation:unit:AR:ar-pardon-seal:ar-pardon-seal-stage-2";

// ---- FIX04 repair: the three records the packet's own obligations come from ---
//
// VF01 measured four failures on this family — COMPONENT_SET,
// REQUIRED_BEFORE_FILING, SERVICE and SELF_HELP_STOP — and every one of them was
// the same defect wearing four faces: the build rendered the two official PDFs
// and stopped, so the packet-set's OWN committed obligations never reached the
// participant. They are read here, at build time, and carried through verbatim.
//
// Verbatim is the whole discipline. Where a record says the source review does
// not state a fee, a waiver or a notarization requirement, that sentence is what
// the participant is told. This build does not supply a value the record does
// not hold, and it does not soften, shorten or explain one it does.
const PACKET_SET_MANIFESTS = "data/record-clearing/legal-design-packet-set-manifests.json";
const TRACK_REGISTRY = "data/record-clearing/legal-design-track-registry.json";
const PACKET_SET_ID = "ar-pardon-seal-set";
const TRACK_ID = "ar-pardon-seal";
// The process_guidance component's own committed text. It is copied byte for
// byte; this build authors no guidance of its own and paraphrases none of it.
const PROCESS_GUIDANCE_SOURCE =
  "data/rcap-all50/composed-routes/arkansas/ar-pardon-seal/components/"
  + "ar-pardon-seal-process-guidance-1/process-guidance.md";
const PROCESS_GUIDANCE_COMPONENT_ID = "ar-pardon-seal-process-guidance-1";

// Steps 1-3 only: bind the sources, census the blanks, write the census record,
// stop. This exists because the map has to be written against measured blank ids
// and a blank id is its measurement — there is no field name on a flat form to
// write a map against beforehand. It renders nothing and claims nothing.
const CENSUS_ONLY = process.argv.includes("--census-only");
const NO_RASTER = process.argv.includes("--no-raster");

// The write-box geometry independent review corrected CR-266 to, reused
// unchanged so this family is measured the way every other flat family is.
const INSET_X = 1.5;
const INSET_RIGHT = 2;
const BASELINE_ABOVE_RULE = 2;
const BOX_HEIGHT = 12;
// The participant's ink is set in the form's own type size, capped so a 14pt
// caption blank does not print a long name larger than the form's body text.
const MAX_FONT_SIZE = 12;

const fail = (message, detail = null) => {
  console.error(`build-census-v1-${FAMILY_ID}: ${message}`);
  if (detail) console.error(`  ${detail}`);
  console.error("  Nothing was written.");
  process.exit(1);
};

const sha256 = (buf) => crypto.createHash("sha256").update(buf).digest("hex");
const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(rootDir, rel), "utf8"));
const writeJson = (rel, value) => {
  fs.mkdirSync(path.dirname(path.join(rootDir, rel)), { recursive: true });
  fs.writeFileSync(path.join(rootDir, rel), `${JSON.stringify(value, null, 2)}\n`);
};
const round = (n) => Number(Number(n).toFixed(2));

// FIX04: the packet set is read once and reused, so the wiring record and the
// participant instructions cannot disagree about which components exist.
let packetSetCache = null;
const readPacketSet = () => {
  if (packetSetCache) return packetSetCache;
  const entry = (readJson(PACKET_SET_MANIFESTS).packetSets ?? [])
    .find((candidate) => candidate.packetSetId === PACKET_SET_ID);
  if (!entry) fail(`packet set absent from the committed manifest: ${PACKET_SET_ID}`);
  packetSetCache = entry;
  return entry;
};

// ---- the two documents, pinned by hash ---------------------------------------
//
// `captionOnly` is the whole of the difference between them. The petition is the
// participant's statement; the order is the court's own instrument and accepts
// nothing but caption facts, so its findings, its decree, its signature and its
// date are refused by the shared factory rather than by a rule this file writes.
//
// A blank's id is its MEASUREMENT: page, baseline and left edge, in page points.
// Nothing else on a flat form is stable — there is no field name to key on — and
// an id that is the measurement cannot drift from the thing it names without the
// census failing to find it.
const DOCUMENTS = [
  {
    key: "petition",
    documentId: "AR-ACIC-PETITION-TO-SEAL-RECORDS-OF-PARDONED-OFFENDER-OR-YOUTHFUL",
    documentRole: "PETITION",
    officialTitle: "Petition to Seal Records of a Pardoned Offender or Pardoned Youthful Felony Offender",
    revision: "REV-2022-03-08",
    sha256: "59ba1407a5a6c2b8c327a9ca549b379ab88d65105ade1c7e69110d8c1ac6c5d0",
    pathInArchive: "STATES/AR/05_SOURCE_GATED/AR__SOURCE-GATED__AR-ACIC-PETITION-TO-SEAL-RECORDS-OF-PARDONED-OFFENDER-OR-YOUTHFUL__petition-to-seal-records-of-a-pardoned-offender-or-pardoned-youthful-felony-offender__REV-2022-03-08__EN.pdf",
    ownership: "participant_completed",
    captionOnly: false,

    // NO EXPLICIT MAPPINGS, AND matter.charge IS THE ONE THAT IS DELIBERATELY
    // ABSENT.
    //
    // Unlike the flat DWI sibling, this petition DOES draw charge blanks, so the
    // absence here is a decision rather than an impossibility. Three reasons, in
    // order of weight:
    //
    //  1. Paragraph 1 asks what the defendant was CHARGED with; paragraph 2 asks
    //     what they pled or were found GUILTY of. The platform holds one
    //     `matter.charge`. Writing it into both would assert that the offence
    //     charged and the offence convicted are the same, which a plea to a
    //     lesser offence makes false — and this is a PARDON route, reached after
    //     a conviction that may well have been pled down.
    //  2. Each offence runs onto a full-measure continuation rule (page 1
    //     y=386.76 and y=367.71 for paragraph 1, y=234.36 for paragraph 2). The
    //     shared factory writes one value into one rectangle; it does not split
    //     a value across measured continuation rules, and a charge truncated at
    //     the end of the first rule misstates the offence.
    //  3. The class blanks beside them ("A Class ___ felony ___ misdemeanor")
    //     and the statute blanks ("in violation of A.C.A. § ___") are facts the
    //     platform does not hold at all, so even a correctly written offence
    //     would sit in a half-completed sentence.
    //
    // These blanks are left for the participant and listed in
    // reports/blanks-left-for-the-participant.json. `not_mapped` is not a map,
    // so the reason is recorded rather than the field being silently skipped.
    explicitMappings: {},

    // Role refusals: what this family determines the participant does not
    // complete, or does not complete YET. Where another channel also refuses a
    // blank the role is still stated, so no refusal rests on a single channel.
    roleRefusals: [
      // --- the arrest-date trio, refused as a trio -----------------------------
      //
      // These complete "1. The Defendant was arrested on the ___ day of ___,
      // ___, and charged with...". The platform holds matter.arrest_date as a
      // whole date and holds no day, month or year fact, so nothing correct
      // exists to write into any of them.
      //
      // The refusal is not precautionary. The DAY blank's own measured caption
      // is "1.The Defendant was arrested on the", which the census records
      // binding participant.full_legal_name with writable=true through the word
      // "Defendant" — the exact printed-label route that put the participant's
      // name into the MONTH of an arrest date the first time the sibling AR ACIC
      // family was built. The projection is in the census so this can be checked
      // rather than believed.
      { blankId: "p1-y427.27-x282.65", class: "arrest_date_component",
        why: "Day component of the arrest date. The platform holds no day fact, and this blank's measured caption binds participant.full_legal_name with writable=true through the word 'Defendant' in it." },
      { blankId: "p1-y427.27-x423.43", class: "arrest_date_component",
        why: "Month component of the arrest date. Same sentence, same fact the platform does not hold in component form." },
      { blankId: "p1-y410.83-x187.70", class: "arrest_date_component",
        why: "Year component of the arrest date. Its measured caption is ', and charged with the offense(s) of', so the shared charge-caption rule refuses a name here as well; the role refusal is stated so the blank does not depend on that one channel." },

      // --- the pardon-grant date trio: the route's own precondition ------------
      //
      // Paragraph 5 prints "5. On the ___ day of ___, ___ the Governor issued a
      // Pardon to the Defendant for the above referenced offense(s)." This is
      // the one place on either document where the participant's signed filing
      // states WHEN the pardon issued.
      //
      // A pardon route depends on a pardon having been granted. The platform
      // holds no pardon fact of any kind — not the grant, not its date, not the
      // executive order number — and this packet is the sealing step that
      // FOLLOWS a pardon rather than evidence of one. Writing anything into
      // these three would assert, on the participant's own verified petition,
      // that a pardon issued on a day this build has no source for. Refused as a
      // route precondition, not as a formatting rule.
      { blankId: "p2-y653.45-x152.78", class: "pardon_grant_date_component",
        why: "Day component of the date the Governor issued the Pardon. The platform holds no pardon fact; this packet is the sealing step that follows a pardon and must not assert or imply the pardon itself." },
      { blankId: "p2-y653.45-x309.56", class: "pardon_grant_date_component",
        why: "Month component of the pardon-grant date. Same sentence, same absent fact." },
      { blankId: "p2-y653.93-x419.15", class: "pardon_grant_date_component",
        why: "Year component of the pardon-grant date, measured as its own rule at y=653.93 immediately before the printed words 'the Governor'." },

      // --- signature, date and notarial blocks --------------------------------
      { blankId: "p2-y368.60-x361.13", class: "participant_signature",
        why: "The Defendant's signature rule on page 2, captioned 'Defendant's Signature' beneath it. The shared protect rules classify that caption as a signature too; the role refusal is stated so it does not rest on one channel." },
      { blankId: "p2-y312.30-x361.13", class: "participant_signature_date",
        why: "The date under the Defendant's signature on page 2. Dating a signature that has not been made asserts the petition was signed on a day it was not. Nothing shared refuses it: its measured caption is the printed word 'Date', which reaches no descriptor at all. This role refusal is the whole of the protection." },
      { blankId: "p3-y648.46-x185.54", class: "notarial_jurat_venue",
        why: "The county on the VERIFICATION page's jurat, 'STATE OF ARKANSAS / COUNTY OF ___'. This is where the oath is administered, which is the notary's to record and is not necessarily the county of the case. The page's VERIFICATION heading also places it in a protected region, which this family runs because the shared flat path does not." },
      { blankId: "p3-y515.75-x325.05", class: "participant_signature",
        why: "The Petitioner's signature rule on the VERIFICATION page, captioned 'Petitioner' beneath it. The census records that caption binding participant.full_legal_name with writable=true, so without this refusal the name would be printed on a signature line." },
      { blankId: "p3-y434.71-x313.97", class: "notarial_jurat_date_component",
        why: "Day component of 'Subscribed and sworn to before me on this ___ day of ___, 20___'. The oath has not been taken; the notary records when it was." },
      { blankId: "p3-y418.27-x101.78", class: "notarial_jurat_date_component",
        why: "Month component of the same jurat date." },
      { blankId: "p3-y418.27-x309.89", class: "notarial_jurat_date_component",
        why: "Year component of the same jurat date, printed as '20___'." },
      { blankId: "p3-y351.75-x323.05", class: "notarial_signature",
        why: "The Notary Public's signature rule. The notary's, and only after the oath is administered." },

      // --- the ACIC identification block --------------------------------------
      { blankId: "p3-y126.14-x127.70", class: "fact_not_held_by_the_platform",
        why: "Race, in the block headed 'THE FOLLOWING INFORMATION IS REQUIRED FOR PROPER IDENTIFICATION OF THE DEFENDANT IN THE STATE AND NATIONAL RECORD SYSTEMS'. The platform holds no race fact and will not derive one." },
      { blankId: "p3-y92.90-x126.98", class: "fact_not_held_by_the_platform",
        why: "Sex, in the same identification block. The platform holds no sex fact and will not derive one." },
      { blankId: "p3-y92.90-x391.27", class: "agency_assigned_identifier",
        why: "The State Identification (SID) number is assigned by Arkansas ACIC. It is the agency's to state; the shared vocabulary classifies the caption as a government identifier as well." },

      // --- the Certificate of Service, page 4 ---------------------------------
      //
      // THE REGION CHANNEL DOES NOT FIRE ON THIS PAGE. The petition's page 4
      // heading is typeset with its glyphs out of order, so the walker reads it
      // as "Certicatofefi Service" and regionProtectCategoryOf does not match it.
      // The census records regionProtectCategory null for the blank below. On
      // the DWI sibling the same page was caught by region; here it is not, and
      // these role refusals are the whole of the protection.
      { blankId: "p4-y635.38-x115.10", class: "certificate_of_service_attestation",
        why: "The certifying party's name in 'I, ___, do hereby certify that a true and correct copy ... has been provided'. This is a sworn statement about an act of service, not a caption, and it is the filer's to make after mailing. The page's own heading is scrambled in the content stream, so the shared region channel does NOT protect this blank; this refusal is the only thing that does." },
      { blankId: "p4-y471.50-x311.10", class: "participant_signature",
        why: "The signature rule captioned 'Defendant or Defendant's Attorney' beneath it, on the Certificate of Service." },
      { blankId: "p4-y389.00-x311.10", class: "certificate_of_service_date",
        why: "The date on the page 4 Certificate of Service. Service has not happened; a date here certifies a mailing that has not occurred." }
    ]
  },
  {
    key: "order",
    documentId: "AR-ACIC-ORDER-TO-SEAL-RECORDS-OF-PARDONED-OFFENDER-OR-YOUTHFUL-FEL",
    documentRole: "PROPOSED_ORDER",
    officialTitle: "Order to Seal Records of a Pardoned Offender or Pardoned Youthful Felony Offender",
    revision: "REV-2022-03-07",
    sha256: "741fda999c348d763848b98053f93e8c28d25dcc1ba5e8438e98b1bdf555ae6e",
    pathInArchive: "STATES/AR/05_SOURCE_GATED/AR__SOURCE-GATED__AR-ACIC-ORDER-TO-SEAL-RECORDS-OF-PARDONED-OFFENDER-OR-YOUTHFUL-FEL__order-to-seal-records-of-a-pardoned-offender-or-pardoned-youthful-felony-offender__REV-2022-03-07__EN.pdf",
    ownership: "court_issued_order",
    captionOnly: true,

    // Empty for the same reasons as the petition, and one more: this document is
    // the COURT's findings. The offence, its class and its statute here are what
    // the court finds, not what the participant states.
    explicitMappings: {},

    roleRefusals: [
      // --- the arrest-date trio, in the court's findings -----------------------
      //
      // Refused for the same reason as on the petition, and NOT left to
      // captionOnly. The DAY blank's measured caption is "1.The Defendant was
      // arrested on the", which the census records binding
      // participant.full_legal_name with writable=true — and
      // participant.full_legal_name IS a caption fact, so captionOnly does not
      // stop it. A refusal that depends on a document being caption-only is no
      // refusal at all for the one class of fact caption-only admits.
      { blankId: "p1-y354.20-x315.52", class: "arrest_date_component",
        why: "Day component of the arrest date in the court's findings. Binds participant.full_legal_name with writable=true through the printed-label route, and captionOnly does not stop a caption fact. Refused by role." },
      { blankId: "p1-y354.20-x408.61", class: "arrest_date_component",
        why: "Month component of the arrest date in the court's findings. Same binding, same refusal." },
      { blankId: "p1-y331.70-x108.02", class: "arrest_date_component",
        why: "Year component of the arrest date in the court's findings." },

      // --- the conviction-date trio in paragraph 2 -----------------------------
      //
      // "A.C.A § ___ on the ___ day of ___, ___." — when the plea or finding of
      // guilt was entered. Component date blanks again, and the platform holds
      // matter.conviction_date only as a whole date. These three ALSO measure
      // outside the page (x=536, x=744 and x=874 on a 612pt page) because their
      // line's glyph widths could not be resolved; the geometry gates would
      // withhold them anyway. The role is stated so the refusal does not rest on
      // a measurement defect that a better walker would remove.
      { blankId: "p1-y188.80-x536.02", class: "conviction_date_component",
        why: "Day component of the date the plea or finding of guilt was entered. The platform holds matter.conviction_date as a whole date and holds no day fact." },
      { blankId: "p1-y188.80-x744.02", class: "conviction_date_component",
        why: "Month component of the same conviction date." },
      { blankId: "p1-y188.80-x874.02", class: "conviction_date_component",
        why: "Year component of the same conviction date." },

      // --- court-only ----------------------------------------------------------
      { blankId: "p2-y175.70-x324.05", class: "court_only_signature",
        why: "The judge's signature rule, captioned 'Judge' beneath it. Court-only. The shared protect rules refuse it by that caption too; the role refusal is stated so it does not rest on one channel." },
      { blankId: "p2-y119.30-x324.05", class: "court_only_signature_date",
        why: "The date beneath the judge's signature. The court dates its own order. Its caption is the printed word 'Date', which reaches no descriptor, so the caption channel is never even consulted; this role refusal is the whole of the protection." },

      // --- the ACIC identification block ---------------------------------------
      { blankId: "p3-y618.50-x108.72", class: "fact_not_held_by_the_platform",
        why: "Race. The platform holds no race fact and will not derive one." },
      { blankId: "p3-y618.50-x404.62", class: "agency_assigned_identifier",
        why: "The Arrest Tracking Number is assigned by Arkansas ACIC when an arrest is processed. It identifies the arrest through a system the platform has no knowledge of and is the agency's to state. No allowlisted fact matches its caption either; the refusal is stated so it does not rest on that absence." },
      { blankId: "p3-y594.30-x107.90", class: "fact_not_held_by_the_platform",
        why: "Sex. The platform holds no sex fact and will not derive one." },
      { blankId: "p3-y594.30-x367.99", class: "agency_assigned_identifier",
        why: "The State Identification (SID) number, assigned by ACIC and the agency's to state." },
      { blankId: "p3-y570.20-x364.06", class: "agency_assigned_identifier",
        why: "The FBI number, assigned by the FBI and marked '(if known)' on the form itself. Not the platform's to supply." }
    ]
  }
];

// The ONLY blanks in this family that may ever carry the participant's name.
//
// Stated as an allowlist rather than as a set of refusals, because the defect
// this lineage keeps finding is a name arriving somewhere nobody listed. The
// verification reads every glyph this build adds to the page and fails on a name
// token drawn anywhere but here.
const NAME_MAY_APPEAR_IN = {
  // Page 1's caption blank, the one printed "______ DEFENDANT" with
  // "(First, Middle and Last name)" beneath it. The petition's page 2 WHEREFORE
  // blank is NOT here: its rectangle is estimated rather than measured, so the
  // geometry gate withholds it and no name reaches it.
  "AR-ACIC-PETITION-TO-SEAL-RECORDS-OF-PARDONED-OFFENDER-OR-YOUTHFUL": [
    "p1-y575.85-x77.05"
  ],
  "AR-ACIC-ORDER-TO-SEAL-RECORDS-OF-PARDONED-OFFENDER-OR-YOUTHFUL-FEL": [
    "p1-y557.90-x72.02",  // page 1 DEFENDANT caption blank
    "p2-y417.20-x275.12"  // page 2 "... of the Defendant, ______, should be, and hereby is SEALED"
  ]
};

// --- fixture identities -------------------------------------------------------
// The corpus's standard canonical and boundary participants, identical to both
// sibling families', so this family's fixtures are comparable with every other
// family's. "Jordan Avery Reyes" is deliberately the same name the blocked
// artifacts printed into their charge blanks.
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
  "matter.charge": "Theft of property", "matter.arrest_date": "2019-03-08",
  "matter.offense_date": "2019-03-08", "matter.conviction_date": "2019-11-02",
  "matter.disposition_date": "2020-01-15", "deterministic.filing_date": "2026-08-12",
  "matter.charges": [
    { case_number: "24-CR-001234", citation_number: "C-889201", charge: "Theft of property",
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
  "matter.charge": "Theft of property, a Class D felony, with an extended statutory description that materially exceeds one line",
  "matter.charges": [
    { case_number: "0123-45-2026-CR-900123.00-AB-CDE/2201", citation_number: "C-889201",
      charge: "Theft of property, a Class D felony, with an extended statutory description that materially exceeds one line",
      arrest_date: "2019-03-08", offense_date: "2019-03-08", conviction_date: "2019-11-02", disposition_date: "2020-01-15" }
  ]
};

// Every name token either fixture could put on paper. The proofs look for these,
// so a surname or a middle name landing in the wrong blank is caught as well as
// the whole name.
const NAME_TOKENS = [...new Set(
  [CANONICAL, BOUNDARY].flatMap((f) => [
    f["participant.full_legal_name"], f["participant.first_name"],
    f["participant.last_name"], f["participant.middle_name"]
  ]).filter(Boolean).flatMap((v) => [v, ...String(v).split(/[\s\-]+/)])
    .map((s) => s.trim()).filter((s) => s.length >= 4)
)];

// ==============================================================================
// Step 1: the source is the pinned source.
//
// Two independent things are proved, because either alone is satisfiable by a
// file that is not the right one: the bytes on disk hash to what the family
// declares, AND the corpus index — the committed record of what the Master
// Library contained — declares the same hash and byte length at the same path.
// An ABSENCE and a MISMATCH are reported as different findings and neither is a
// pass.
// ==============================================================================
function resolveSource(doc) {
  const index = readJson(CORPUS_INDEX);
  const entry = (index.entries ?? []).find((e) => e.path === doc.pathInArchive);
  if (!entry) fail(`${doc.documentId}: SOURCE_ABSENT_FROM_INDEX`, `${CORPUS_INDEX} names no entry at ${doc.pathInArchive}`);
  if (entry.sha256 !== doc.sha256) {
    fail(`${doc.documentId}: SOURCE_MISMATCH_AGAINST_INDEX`, `index ${entry.sha256} / family ${doc.sha256}`);
  }
  if (entry.revision !== doc.revision) {
    fail(`${doc.documentId}: SOURCE_REVISION_DISAGREES_WITH_INDEX`, `index ${entry.revision} / family ${doc.revision}`);
  }
  const abs = path.join(rootDir, CORPUS_ROOT, doc.pathInArchive);
  if (!fs.existsSync(abs)) {
    fail(`${doc.documentId}: SOURCE_ABSENT_FROM_DISK`,
      `expected ${CORPUS_ROOT}/${doc.pathInArchive} — run scripts/rcap-corpus/bootstrap-private-corpus.sh`);
  }
  const bytes = fs.readFileSync(abs);
  const got = sha256(bytes);
  if (got !== doc.sha256) fail(`${doc.documentId}: SOURCE_MISMATCH_ON_DISK`, `expected ${doc.sha256}, read ${got}`);
  if (bytes.length !== entry.byteLength) {
    fail(`${doc.documentId}: SOURCE_BYTE_LENGTH_DISAGREES_WITH_INDEX`, `index ${entry.byteLength}, read ${bytes.length}`);
  }
  return { bytes, indexEntry: entry };
}

// ==============================================================================
// Steps 2 and 3: census the blanks with real geometry, read off the document.
// ==============================================================================

/** The page's raw content stream, for the stroked-box detector. */
function contentStringOf(pdf, page) {
  let content = "";
  for (const stream of page.node.normalizedEntries?.().Contents?.asArray?.() ?? []) {
    try { content += Buffer.from(pdf.context.lookup(stream).getContents()).toString("latin1"); } catch { /* not a stream */ }
  }
  return content;
}

/** Printed text a run of glyphs draws, with leaders and trailing punctuation off. */
function captionTextOf(raw) {
  return normalizeHarvestedText(String(raw ?? ""))
    .replace(/[_.…]{3,}/g, " ")
    .replace(/\s+/g, " ")
    .replace(/[:.\s]+$/, "")
    .trim();
}

/** Non-space glyph width drawn between x0 and x1 on one line. */
function inkBetween(line, x0, x1) {
  let ink = 0;
  for (const ch of line.chars ?? []) {
    if (String(ch.c).trim() === "") continue;
    const a = Math.max(ch.x, x0);
    const b = Math.min(ch.x + ch.w, x1);
    if (b > a) ink += b - a;
  }
  return ink;
}

/** Maximal runs of the `_` glyph on one line, in page coordinates. */
function underscoreRunsOf(line) {
  const runs = [];
  let cur = null;
  for (const ch of line.chars ?? []) {
    if (ch.c === "_") {
      if (cur) { cur.x1 = ch.x + ch.w; cur.glyphs += 1; }
      else cur = { x0: ch.x, x1: ch.x + ch.w, glyphs: 1 };
    } else if (cur) { runs.push(cur); cur = null; }
  }
  if (cur) runs.push(cur);
  return runs;
}

/**
 * A drawn rule is a BLANK unless the form prints words on it.
 *
 * Both of these documents underline their own titles, and the petition
 * underlines the word VERIFICATION. An underline and a blank are the same
 * rectangle drawn for opposite reasons, so they are told apart by measuring how
 * much non-space glyph ink sits on the rule rather than by guessing which lines
 * look like headings. UNDERLINE_INK_FRACTION is the share of the rule's width
 * that must carry glyphs for it to be an underline.
 */
const UNDERLINE_INK_FRACTION = 0.5;
function classifyRule(rule, lines) {
  let bestInk = 0;
  let over = null;
  for (const line of lines) {
    const size = line.size || 12;
    if (!(line.y >= rule.y - 0.5 && line.y <= rule.y + size * 1.3)) continue;
    const ink = inkBetween(line, rule.x, rule.endX);
    if (ink > bestInk) { bestInk = ink; over = line; }
  }
  const fraction = rule.width > 0 ? bestInk / rule.width : 0;
  return {
    isUnderline: fraction >= UNDERLINE_INK_FRACTION,
    inkFraction: round(fraction),
    textOnTheRule: over && fraction >= UNDERLINE_INK_FRACTION ? over.text : null
  };
}

/**
 * The printed words this blank is labelled by, measured.
 *
 * One rule, applied to every blank on both documents so no blank gets a caption
 * chosen for it:
 *
 *   1. the printed glyphs on the blank's own line that lie between the end of
 *      the previous blank on that line and the start of this one;
 *   2. failing that, the glyphs between this blank's end and the next blank on
 *      the line;
 *   3. failing that, a SHORT printed line directly beneath the blank whose span
 *      overlaps it — the "Defendant's Signature", "Judge", "Date" layout.
 *
 * Step 3 is capped at 40 characters on purpose. Uncapped, a body sentence
 * beneath a blank becomes its label, and on these two documents nearly every
 * body sentence contains the word "Defendant" — which is the exact printed-label
 * route that hands a blank participant.full_legal_name. A label is a label; a
 * sentence is not one.
 */
const BELOW_LABEL_MAX_CHARS = 40;
const BELOW_LABEL_MAX_DROP = 30;
function captionFor({ blank, line, blanksOnLine, lines }) {
  if (line) {
    const previousEnd = blanksOnLine
      .filter((b) => b.x1 <= blank.x0 + 0.5)
      .reduce((m, b) => Math.max(m, b.x1), -Infinity);
    const nextStart = blanksOnLine
      .filter((b) => b.x0 >= blank.x1 - 0.5)
      .reduce((m, b) => Math.min(m, b.x0), Infinity);
    const pick = (x0, x1) => (line.chars ?? [])
      .filter((ch) => ch.x + ch.w <= x1 + 0.5 && ch.x >= x0 - 0.5)
      .map((ch) => ch.c).join("");
    const before = captionTextOf(pick(Number.isFinite(previousEnd) ? previousEnd : -Infinity, blank.x0));
    if (before) return { caption: before, basis: "same_line_before_the_blank" };
    const after = captionTextOf(pick(blank.x1, Number.isFinite(nextStart) ? nextStart : Infinity));
    if (after) return { caption: after, basis: "same_line_after_the_blank" };
  }
  const below = lines
    .filter((l) => l.y < blank.baselineY - 4 && l.y >= blank.baselineY - BELOW_LABEL_MAX_DROP)
    .filter((l) => underscoreRunsOf(l).length === 0)
    .filter((l) => {
      const chars = l.chars ?? [];
      if (!chars.length) return false;
      const x0 = chars[0].x;
      const x1 = chars[chars.length - 1].x + chars[chars.length - 1].w;
      return Math.min(x1, blank.x1) - Math.max(x0, blank.x0) > 0;
    })
    .sort((a, b) => b.y - a.y)[0] ?? null;
  const belowText = below ? captionTextOf(below.text) : "";
  if (belowText && belowText.length <= BELOW_LABEL_MAX_CHARS) {
    return { caption: belowText, basis: "short_label_line_below_the_blank" };
  }
  return { caption: "", basis: "no_printed_caption_adjacent_to_this_blank" };
}

/**
 * The printed section heading a blank sits under.
 *
 * A heading on these forms is centred on the page. That is what actually
 * separates "VERIFICATION" and "Certificate of Service" from "STATE OF
 * ARKANSAS", which is a caption-block line flush at the left margin and is not a
 * heading however upper-case it is. Measuring the centring rather than reading
 * the capitals is the difference between protecting the notarial block and
 * protecting the whole page.
 */
// Two lines of these forms' leading. See the charge context channel below.
const CHARGE_CONTEXT_MAX_DROP = 60;

const HEADING_MAX_CHARS = 60;
const HEADING_CENTRE_TOLERANCE = 40;
const HEADING_MIN_CAPITALS = 3;
function headingCandidatesOf(lines, pageWidth) {
  return lines.filter((line) => {
    const text = captionTextOf(line.text);
    if (!text || text.length > HEADING_MAX_CHARS) return false;
    if (underscoreRunsOf(line).length > 0) return false;

    // The deny vocabulary wins wherever it fires, centred or not. A printed
    // "Certificate of Service" opens a service block whatever the typesetting —
    // and on this petition it is set at the left margin, not centred.
    if (regionProtectCategoryOf(text)) return true;

    const chars = line.chars ?? [];
    if (!chars.length) return false;
    let x0 = Infinity, x1 = -Infinity;
    for (const ch of chars) {
      if (String(ch.c).trim() === "") continue;
      x0 = Math.min(x0, ch.x); x1 = Math.max(x1, ch.x + ch.w);
    }
    if (!Number.isFinite(x0)) return false;
    if (Math.abs((x0 + x1) / 2 - pageWidth / 2) > HEADING_CENTRE_TOLERANCE) return false;

    // Centring alone is not enough. A full-measure line of body prose is also
    // centred on the page by arithmetic, and would make the region channel
    // meaningless. A heading on these forms is set in capitals, so a line
    // carrying any lower-case letter is prose.
    const capitals = (text.match(/[A-Z]/g) ?? []).length;
    return capitals >= HEADING_MIN_CAPITALS && !/[a-z]/.test(text);
  });
}

/** Censuses one document: every blank the form draws, measured from its bytes. */
async function censusDocument(doc, bytes) {
  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  const pages = pdf.getPages();

  // Re-read the structural class from the bytes rather than trusting the index.
  let acroFieldCount = 0;
  try { acroFieldCount = pdf.getForm().getFields().length; } catch { acroFieldCount = 0; }
  if (acroFieldCount !== 0) {
    fail(`${doc.documentId}: expected a flat PDF, found ${acroFieldCount} AcroForm field(s)`,
      "This family's whole method assumes there are no widgets. A form that has grown some is a different document.");
  }

  const titleWords = doc.officialTitle.toUpperCase().replace(/\s+/g, " ");
  const blanks = [];
  const pageGeometry = [];
  const strokedByPage = [];
  const rulesByPage = [];
  const documentTextLines = [];

  for (const [index, page] of pages.entries()) {
    const pageNumber = index + 1;
    const { width: pageWidth, height: pageHeight } = page.getSize();
    pageGeometry.push({ page: pageNumber, width: round(pageWidth), height: round(pageHeight) });

    const lines = groupIntoLines(extractTextItems(page));
    for (const line of lines) documentTextLines.push(normalizeHarvestedText(line.text));

    // The CTM-tracking stroked-box detector, run on every page. Whatever it
    // reports is a measurement, including zero.
    const stroked = strokedRectangles(contentStringOf(pdf, page));
    strokedByPage.push({ page: pageNumber, strokedRectangles: stroked.length, rectangles: stroked });

    const measuredRules = rulesOfPage(page, { maxThickness: 3, minLength: 20, minDividerLength: 20 });
    const classified = measuredRules.horizontal.map((rule) => ({ ...rule, ...classifyRule(rule, lines) }));
    rulesByPage.push({
      page: pageNumber,
      horizontal: classified.map((r) => ({
        x: r.x, endX: r.endX, y: r.y, width: r.width, height: r.height,
        operator: r.operator, paintedBy: r.paintedBy,
        classifiedAs: r.isUnderline ? "underline_of_printed_text" : "blank_rule",
        inkFractionOnTheRule: r.inkFraction,
        textOnTheRule: r.textOnTheRule
      })),
      vertical: measuredRules.vertical.map((v) => ({ x: v.x, y: v.y, topY: v.topY, width: v.width }))
    });

    const headings = headingCandidatesOf(lines, pageWidth);

    // Every blank on this page, from both constructions, in one list.
    const raw = [];
    for (const line of lines) {
      for (const run of underscoreRunsOf(line)) {
        raw.push({
          construction: "underscore_leader_run", line,
          x0: round(run.x0), x1: round(run.x1), baselineY: round(line.y),
          glyphCount: run.glyphs, printedSize: round(line.size || 12)
        });
      }
    }
    for (const rule of classified) {
      if (rule.isUnderline) continue;
      const size = 12;
      const host = lines.find((l) => l.y >= rule.y - 0.5 && l.y <= rule.y + (l.size || size) * 1.3) ?? null;
      raw.push({
        construction: "drawn_rule", line: host,
        x0: round(rule.x), x1: round(rule.endX), baselineY: round(rule.y),
        glyphCount: null, printedSize: round(host?.size || size),
        rule: { x: rule.x, endX: rule.endX, y: rule.y, height: rule.height, operator: rule.operator, paintedBy: rule.paintedBy }
      });
    }

    for (const blank of raw) {
      const blanksOnLine = blank.line
        ? raw.filter((b) => b.line === blank.line).map((b) => ({ x0: b.x0, x1: b.x1 }))
        : [];
      const { caption, basis } = captionFor({ blank, line: blank.line, blanksOnLine, lines });

      const headingAbove = headings
        .filter((h) => h.y > blank.baselineY + 2)
        .sort((a, b) => a.y - b.y)[0] ?? null;
      const regionHeading = headingAbove ? captionTextOf(headingAbove.text) : null;
      const regionIsDocumentTitle = Boolean(regionHeading && titleWords.includes(regionHeading.toUpperCase()));
      const regionCategory = regionHeading && !regionIsDocumentTitle
        ? regionProtectCategoryOf(regionHeading) : null;

      // What the SHARED factory would decide for this blank, computed for every
      // blank whether or not this family offers it one. This is what makes a
      // role refusal checkable instead of believable.
      const projection = decideBinding(
        { name: caption, pdfType: "text", effectiveLabel: caption },
        { explicitMappings: doc.explicitMappings, captionOnly: doc.captionOnly === true,
          availableChargeRows: 0 }
      );

      // THE CHARGE CONTEXT CHANNEL, AND WHY THE CAPTION CHANNEL IS NOT ENOUGH.
      //
      // On the petition the actual charge blanks are the two full-measure rules
      // beneath ", and charged with the offense(s) of :" — 416pt and 417pt wide,
      // at y=386.76 and y=367.71. Neither has a printed caption anywhere near it
      // and neither has a host text line, so `captionOrLineMentionsCharge` is
      // FALSE for both: the blanks that most need watching are exactly the ones
      // the caption channel cannot see. The same is true of the conviction
      // offence's continuation rule at y=234.36.
      //
      // So the nearest printed line ABOVE the blank is measured too, within
      // CHARGE_CONTEXT_MAX_DROP — two lines of this form's leading. A blank is
      // charge-associated if its caption, its own line, OR the printed line it
      // sits under names a charge, offence, count, statute or violation. The
      // proof reports on all of them.
      const above = lines
        .filter((l) => l.y > blank.baselineY + 1 && l.y <= blank.baselineY + CHARGE_CONTEXT_MAX_DROP)
        .filter((l) => captionTextOf(l.text) !== "")
        .sort((a, b) => a.y - b.y)[0] ?? null;
      const contextLine = above ? normalizeHarvestedText(above.text) : null;
      const contextMentionsCharge = Boolean(contextLine && CHARGE_VALUE_WORDS.test(contextLine));

      // The stricter caption gate the flat-overlay profile generator applies:
      // a caption is a short noun phrase, not a sentence.
      const words = caption ? caption.split(/\s+/).filter(Boolean).length : 0;
      const flatCaptionGate = !caption
        ? "no_caption"
        : caption.length < 3 || caption.length > 30 || words > 4
          ? "not_a_caption"
          : "caption_shaped";

      blanks.push({
        blankId: `p${pageNumber}-y${blank.baselineY.toFixed(2)}-x${blank.x0.toFixed(2)}`,
        page: pageNumber,
        construction: blank.construction,
        // MEASURED off the document. Nothing here is derived from where a label
        // sits; the caption is captured separately and decides only what a blank
        // means, never where it is.
        measured: {
          x0: blank.x0, x1: blank.x1, baselineY: blank.baselineY,
          width: round(blank.x1 - blank.x0),
          underscoreGlyphs: blank.glyphCount,
          rule: blank.rule ?? null
        },
        geometryBasis: blank.construction === "underscore_leader_run"
          ? "underscore_leader_glyph_run_measured_from_the_text_showing_operators"
          : "thin_filled_rectangle_measured_from_the_page_path_operators",
        printedLine: blank.line ? normalizeHarvestedText(blank.line.text) : null,
        printedSize: blank.printedSize,
        // Whether the walker resolved this line's real glyph widths from the
        // font, or fell back to using the type size as the width of every
        // glyph. On an underscore leader run the rectangle IS the glyph run, so
        // a fallback width makes the rectangle an estimate rather than a
        // measurement. See writeBoxIsExactlyMeasured below.
        metricsExact: blank.line ? blank.line.metricsExact : null,
        withinTheMediaBox: blank.x0 >= 0 && blank.x1 <= round(pageWidth)
          && blank.baselineY >= 0 && blank.baselineY <= round(pageHeight),
        writeBoxIsExactlyMeasured: blank.construction === "drawn_rule"
          ? true
          : blank.line?.metricsExact === true,
        caption,
        captionBasis: basis,
        regionHeading,
        regionIsDocumentTitle,
        regionProtectCategory: regionCategory,
        // Recorded on every blank, not only the ones that get written, so the
        // charge-caption question is answerable for the whole document.
        captionDescribesChargeValue: captionDescribesChargeValue(caption),
        captionOrLineMentionsCharge: CHARGE_VALUE_WORDS.test(caption)
          || CHARGE_VALUE_WORDS.test(blank.line ? blank.line.text : ""),
        printedLineAbove: contextLine,
        printedLineAboveMentionsCharge: contextMentionsCharge,
        chargeAssociated: CHARGE_VALUE_WORDS.test(caption)
          || CHARGE_VALUE_WORDS.test(blank.line ? blank.line.text : "")
          || contextMentionsCharge,
        protectCategory: protectCategoryOf(caption) ?? null,
        descriptorsByCaption: descriptorsMatching(caption).map((d) => d.factId),
        sharedFactoryProjection: projection,
        flatCaptionGate
      });
    }
  }

  blanks.sort((a, b) => a.page - b.page || b.measured.baselineY - a.measured.baselineY || a.measured.x0 - b.measured.x0);

  const duplicates = blanks.map((b) => b.blankId).filter((id, i, all) => all.indexOf(id) !== i);
  if (duplicates.length) {
    fail(`${doc.documentId}: two blanks share one measured id`, duplicates.join(", "));
  }

  return { pdf, pages, blanks, pageGeometry, strokedByPage, rulesByPage, documentTextLines, acroFieldCount };
}

// ==============================================================================
// Steps 4 and 5: the anchors this family offers the shared factory, and the
// blanks it withholds.
//
// Three gates run before an anchor is offered at all:
//
//   * the family's own ROLE refusals, listed on each document above;
//   * the printed REGION the blank sits in;
//   * the measured WIDTH of the blank.
//
// The region gate is here rather than in the factory because finalizeFlatOverlay
// does not pass `regionHeading` to decideBinding, so on a flat overlay the shared
// region channel never runs. Nothing in this family depends on that gap being
// closed; the gap is reported as a finding.
// ==============================================================================
function anchorsFor(doc, census) {
  const roleById = new Map(doc.roleRefusals.map((r) => [r.blankId, r]));
  const known = new Set(census.blanks.map((b) => b.blankId));
  for (const declared of roleById.keys()) {
    if (!known.has(declared)) {
      fail(`${doc.documentId}: role refusal names a blank that is not in the census: ${declared}`,
        "A refusal that names nothing refuses nothing. Either the measurement moved or the id is wrong.");
    }
  }

  const anchors = [];
  const withheld = [];
  for (const blank of census.blanks) {
    const role = roleById.get(blank.blankId);
    if (role) {
      withheld.push({
        blankId: blank.blankId, page: blank.page, caption: blank.caption,
        channel: "family_role_refusal", class: role.class, why: role.why,
        // The role gate runs first, so a blank that BOTH the role and the region
        // channel would catch is reported here rather than there — which is why
        // the region channel's own count is zero on this family. Recording the
        // overlap keeps that honest: it says the second channel exists and would
        // have held, not that it did the holding.
        alsoInAProtectedRegion: blank.regionProtectCategory ?? null,
        alsoProtectedByItsCaption: blank.protectCategory ?? null,
        wouldTheSharedFactoryHaveWritten: blank.sharedFactoryProjection.writable === true,
        wouldHaveBound: blank.sharedFactoryProjection.factId ?? null
      });
      continue;
    }
    if (blank.regionProtectCategory) {
      withheld.push({
        blankId: blank.blankId, page: blank.page, caption: blank.caption,
        channel: "printed_page_region", class: `protected_page_region:${blank.regionProtectCategory}`,
        why: `The blank sits under the printed section heading ${JSON.stringify(blank.regionHeading)}, which the shared region vocabulary classifies as ${blank.regionProtectCategory}. finalizeFlatOverlay does not run the region channel, so this family runs it.`,
        wouldTheSharedFactoryHaveWritten: blank.sharedFactoryProjection.writable === true,
        wouldHaveBound: blank.sharedFactoryProjection.factId ?? null
      });
      continue;
    }

    // A RECTANGLE OFF THE PAGE IS NOT A WRITE BOX.
    //
    // Six blanks across the two documents measure outside the 612x792 media box
    // — the order's conviction-date trio reaches x=952 and the petition's page 2
    // signature and date rules reach x=739.6. Ink drawn there is on no page
    // anybody prints, and it would still satisfy every per-blank check below,
    // because it lands inside a blank that the census really did measure. This
    // gate is what stops that, and it is the same failure mode as the mark in
    // the margin: geometry that looks like a measurement and is not.
    if (!blank.withinTheMediaBox) {
      withheld.push({
        blankId: blank.blankId, page: blank.page, caption: blank.caption,
        channel: "measured_geometry", class: "write_box_falls_outside_the_page_media_box",
        why: `measured x ${blank.measured.x0}..${blank.measured.x1} on a page ${census.pageGeometry.find((p) => p.page === blank.page)?.width}pt wide`,
        wouldTheSharedFactoryHaveWritten: blank.sharedFactoryProjection.writable === true,
        wouldHaveBound: blank.sharedFactoryProjection.factId ?? null
      });
      continue;
    }

    // A RECTANGLE ESTIMATED FROM FALLBACK GLYPH WIDTHS IS NOT A MEASUREMENT.
    //
    // An underscore leader run's rectangle IS the run of `_` glyphs, so it is
    // only as exact as the glyph metrics. Where the walker could not resolve the
    // font's widths it reports metricsExact=false and falls back to the type
    // size as the width of every glyph; on the order's page 1 that fallback
    // walks the line 340pt past the right edge of the paper, which is how this
    // gate was found rather than assumed. Drawn rules are exempt: their geometry
    // comes from the path operators, not from glyph metrics.
    //
    // This is why the petition writes so little. Its page 2 is entirely
    // underscore leaders on lines the walker could not measure — the same page
    // whose glyphs arrive out of order, which is also why its captions read
    // "da oy" and "Ci". Those blanks are left for the participant and listed in
    // reports/blanks-left-for-the-participant.json, rather than written into a
    // rectangle this build cannot stand behind.
    if (!blank.writeBoxIsExactlyMeasured) {
      withheld.push({
        blankId: blank.blankId, page: blank.page, caption: blank.caption,
        channel: "measured_geometry", class: "write_box_not_exactly_measured",
        why: "The blank is an underscore leader run on a line whose glyph widths the shared walker could not "
          + "resolve from the font (metricsExact=false), so its rectangle is estimated from the type size rather "
          + "than measured. A write box is offered only where the geometry is exact.",
        wouldTheSharedFactoryHaveWritten: blank.sharedFactoryProjection.writable === true,
        wouldHaveBound: blank.sharedFactoryProjection.factId ?? null
      });
      continue;
    }

    const x = round(blank.measured.x0 + INSET_X);
    const width = round(blank.measured.x1 - INSET_RIGHT - x);
    const y = blank.construction === "drawn_rule"
      ? round(blank.measured.baselineY + BASELINE_ABOVE_RULE)
      : blank.measured.baselineY;
    if (width < 20) {
      withheld.push({
        blankId: blank.blankId, page: blank.page, caption: blank.caption,
        channel: "measured_geometry", class: "write_box_too_narrow_to_hold_a_value",
        why: `${width}pt between the measured ends of the blank`,
        wouldTheSharedFactoryHaveWritten: blank.sharedFactoryProjection.writable === true,
        wouldHaveBound: blank.sharedFactoryProjection.factId ?? null
      });
      continue;
    }
    anchors.push({
      blankId: blank.blankId,
      label: blank.caption,
      page: blank.page,
      writeBox: { x, y, width, height: BOX_HEIGHT },
      baselineBasis: blank.construction === "drawn_rule"
        ? `rule_y_plus_${BASELINE_ABOVE_RULE}pt`
        : "underscore_leader_glyph_baseline",
      fontSize: Math.min(blank.printedSize, MAX_FONT_SIZE),
      captionOnly: doc.captionOnly === true
    });
  }
  return { anchors, withheld };
}

/**
 * The drawn rules a protected caption owns, handed to the factory so its own
 * geometry gate runs as well as this family's.
 */
function protectedRulesFor(census) {
  return census.blanks
    .filter((b) => b.construction === "drawn_rule" && (b.protectCategory || b.regionProtectCategory))
    .map((b) => ({
      page: b.page, x: b.measured.x0, endX: b.measured.x1, y: b.measured.baselineY,
      category: b.protectCategory ?? b.regionProtectCategory, caption: b.caption
    }));
}

// ==============================================================================
// Step 7: prove it from the ARTIFACT, not from the report.
//
// The report says what the factory believes it wrote. This reads the finished
// PDF's own text-showing operators back out, subtracts every glyph the SOURCE
// already drew, and asks what is left — which is exactly the ink this build
// added — and where it sits. A flat overlay draws into page content rather than
// into a widget appearance, so this is the artifact answering directly.
// ==============================================================================
async function addedInkOf(sourceBytes, outBytes) {
  const before = await PDFDocument.load(sourceBytes, { ignoreEncryption: true, updateMetadata: false });
  const after = await PDFDocument.load(outBytes, { ignoreEncryption: true, updateMetadata: false });

  // ATTRIBUTION IS PER ITEM, BY THE ITEM'S ORIGIN, AND THE FIRST PASS GOT THIS
  // WRONG IN THE INSTRUCTIVE DIRECTION.
  //
  // A text item's `x`/`y` come straight from the text matrix, and its `text` is
  // the decoded string: both are exact whatever the font. Its per-glyph x and w
  // are not — they are accumulated from the font's advance widths, and where the
  // walker cannot resolve those it falls back to the type size as every glyph's
  // width. The overlay's own Helvetica is one of the fonts it cannot resolve.
  //
  // Attributing glyph by glyph therefore reconstructed the boundary fixture's
  // 69-character name as spanning 245.7pt and reported it drawn outside its
  // 238.4pt rule. It is not: the factory shrank it to 7pt, where Helvetica's
  // true width for that string is 228.25pt, so it sits inside the rule with 10pt
  // to spare. The artifact was right and the verifier's transcription was wrong
  // — which is exactly the failure the whitespace comment below was written
  // about, in a different disguise.
  //
  // So: an item is located by its origin, transcribed from its own text, and its
  // EXTENT is measured separately and explicitly, never inferred from glyph
  // positions the walker could not resolve.
  const key = (page, ch, y) => `${page}|${ch.x.toFixed(1)}|${y.toFixed(1)}|${ch.c}`;
  const original = new Set();
  before.getPages().forEach((page, i) => {
    for (const item of extractTextItems(page)) {
      for (const ch of item.chars ?? []) original.add(key(i + 1, ch, item.y));
    }
  });

  const items = [];
  after.getPages().forEach((page, i) => {
    for (const item of extractTextItems(page)) {
      const chars = item.chars ?? [];
      if (!chars.length) continue;
      // Whitespace glyphs are counted here. Dropping them made an earlier
      // reconstruction read "JordanAveryReyes", which matched no value the
      // factory reported writing — a verifier failing on its own transcription
      // rather than on the artifact.
      const fresh = chars.filter((ch) => !original.has(key(i + 1, ch, item.y)));
      if (!fresh.length) continue;
      if (fresh.length !== chars.length) {
        // An item that is part source and part overlay would make the
        // transcription below a mixture of the two. The overlay draws its own
        // text-showing operators, so this should never happen; it is checked
        // rather than assumed.
        fail("an added text item overlaps glyphs the source already drew",
          `page ${i + 1} y=${item.y}: ${fresh.length} of ${chars.length} glyphs are new`);
      }
      items.push({
        page: i + 1,
        x: round(item.x),           // exact: the text matrix origin
        y: round(item.y),           // exact
        size: item.size,
        text: String(item.text),    // exact: the decoded string
        metricsExact: item.metricsExact === true,
        glyphs: chars.length
      });
    }
  });
  return items;
}

/**
 * The true drawn width of a string, from the artifact's own font size and the
 * public metrics of the font the overlay embeds.
 *
 * Not taken from the render report: the report says what the factory believes it
 * wrote, and the whole point of this stage is not to ask it. The size and the
 * string come from the artifact; Helvetica's advance widths are a published
 * property of a standard font. `assertArtifactUsesHelvetica` confirms from the
 * finished PDF's own resource dictionaries that this is the font on the page.
 */
async function helveticaRuler() {
  const scratch = await PDFDocument.create();
  stampDeterministic(scratch);
  const font = await scratch.embedFont(StandardFonts.Helvetica);
  return (text, size) => round(font.widthOfTextAtSize(String(text), size));
}

async function assertArtifactUsesHelvetica(outBytes, label) {
  const pdf = await PDFDocument.load(outBytes, { ignoreEncryption: true, updateMetadata: false });
  const names = new Set();
  for (const page of pdf.getPages()) {
    const fonts = page.node.Resources?.()?.lookup?.(PDFName.of("Font"));
    for (const key of fonts?.keys?.() ?? []) {
      const base = fonts.lookup(key)?.get?.(PDFName.of("BaseFont"));
      if (base) names.add(String(base.decodeText ? base.decodeText() : base).replace(/^\//, ""));
    }
  }
  const helvetica = [...names].filter((n) => /Helvetica/i.test(n));
  if (!helvetica.length) {
    fail(`${label}: the artifact names no Helvetica font resource`,
      `The extent check measures the drawn value with Helvetica's metrics, so it has to be the font on the page. Fonts found: ${[...names].join(", ") || "none"}`);
  }
  return helvetica;
}

/** The added items whose ORIGIN lands inside one measured blank. */
function inkInBlank(items, blank) {
  const x0 = blank.measured.x0 - 1;
  const x1 = blank.measured.x1 + 1;
  const yLow = blank.measured.baselineY - 3;
  const yHigh = blank.measured.baselineY + BOX_HEIGHT + 2;
  const hits = items
    .filter((it) => it.page === blank.page && it.y >= yLow && it.y <= yHigh && it.x >= x0 && it.x <= x1)
    .sort((a, b) => a.x - b.x);
  return { hits, text: hits.map((it) => it.text).join("").trim() };
}

const CATEGORIES_THAT_MUST_STAY_BLANK = new Set([
  "signature", "notarization", "service_block", "court", "clerk", "prosecutor", "attorney"
]);

function verifyFromBytes({ doc, census, anchors, withheld, report, added, label, widthOf }) {
  const findings = [];
  const anchorById = new Map(anchors.map((a) => [a.blankId, a]));
  const withheldById = new Map(withheld.map((w) => [w.blankId, w]));
  const allowedNameBlanks = new Set(NAME_MAY_APPEAR_IN[doc.documentId] ?? []);
  const expected = new Set((report.expectedValues ?? []).map((v) => String(v)));

  const perBlank = [];
  const chargeBlanks = [];
  const namePlacements = [];
  const attributed = new Set();

  for (const blank of census.blanks) {
    const { hits, text } = inkInBlank(added, blank);
    for (const it of hits) attributed.add(it);
    const carriesInk = text !== "";
    const offered = anchorById.has(blank.blankId);
    const held = withheldById.get(blank.blankId) ?? null;

    perBlank.push({
      blankId: blank.blankId, page: blank.page, caption: blank.caption,
      measured: blank.measured, offeredAsAnchor: offered,
      withheldBy: held ? held.channel : null, withheldClass: held ? held.class : null,
      inkFoundAtTheMeasuredRectangle: carriesInk ? text : null,
      drawnExtent: carriesInk
        ? hits.map((it) => ({
            originX: it.x, fontSize: it.size,
            trueWidthAtHelveticaMetrics: widthOf(it.text, it.size),
            endsAtX: round(it.x + widthOf(it.text, it.size)),
            measuredBlankEndsAtX: blank.measured.x1
          }))
        : null
    });

    // THE VALUE HAS TO FIT THE BLANK IT WAS WRITTEN INTO.
    //
    // Measured from the artifact's own font size and string against Helvetica's
    // published advance widths, never from the walker's per-glyph positions,
    // which on this overlay's font are fallback estimates. A value that runs
    // past the end of the rule it was written on is a wrong value on a filing,
    // not a longer one.
    for (const it of hits) {
      const endsAt = it.x + widthOf(it.text, it.size);
      if (endsAt > blank.measured.x1 + 1) {
        findings.push({ severity: "blocking", fixture: label, blankId: blank.blankId,
          check: "drawn_value_runs_past_the_end_of_the_measured_blank",
          drawnText: it.text, fontSize: it.size, endsAtX: round(endsAt),
          measuredBlankEndsAtX: blank.measured.x1 });
      }
    }

    // THE CHECK THIS LINEAGE EXISTS TO PASS.
    //
    // Unlike the flat DWI sibling, this family HAS charge blanks: both documents
    // draw a blank after "and charged with the offense(s) of:". The name check is
    // the blocking one and applies to every such blank. Ink alone is reported
    // rather than blocked, because on these documents a charge blank is a real
    // blank a filer completes — but no participant name may ever reach one.
    if (blank.chargeAssociated) {
      const hit = NAME_TOKENS.filter((t) => text.toLowerCase().includes(t.toLowerCase()));
      chargeBlanks.push({
        blankId: blank.blankId, page: blank.page, caption: blank.caption,
        printedLine: blank.printedLine,
        printedLineAbove: blank.printedLineAbove,
        associatedBy: [
          CHARGE_VALUE_WORDS.test(blank.caption) ? "caption" : null,
          CHARGE_VALUE_WORDS.test(blank.printedLine ?? "") ? "own_printed_line" : null,
          blank.printedLineAboveMentionsCharge ? "printed_line_above" : null
        ].filter(Boolean),
        captionDescribesChargeValue: blank.captionDescribesChargeValue,
        measured: blank.measured,
        offeredAsAnchor: offered,
        withheldBy: held ? held.channel : null,
        inkFound: carriesInk ? text : null,
        participantNameTokensFound: hit
      });
      if (hit.length) {
        findings.push({ severity: "blocking", fixture: label, blankId: blank.blankId,
          check: "participant_name_in_a_charge_caption_blank", drawnText: text, tokens: hit });
      }
    }

    // A blank this family withheld must be empty on the paper.
    if (held && carriesInk) {
      findings.push({ severity: "blocking", fixture: label, blankId: blank.blankId,
        check: "withheld_blank_carries_ink", withheldBy: held.channel, class: held.class, drawnText: text });
    }
    if (carriesInk && !offered) {
      findings.push({ severity: "blocking", fixture: label, blankId: blank.blankId,
        check: "ink_in_a_blank_that_was_never_offered_as_an_anchor", drawnText: text });
    }
    if (carriesInk && !expected.has(text)) {
      findings.push({ severity: "blocking", fixture: label, blankId: blank.blankId,
        check: "ink_at_this_rectangle_is_not_a_value_the_factory_reported_writing", drawnText: text });
    }

    // Blanks the shared vocabulary says somebody else owns must be blank.
    const owned = blank.protectCategory ?? blank.regionProtectCategory ?? null;
    if (owned && CATEGORIES_THAT_MUST_STAY_BLANK.has(owned) && carriesInk) {
      findings.push({ severity: "blocking", fixture: label, blankId: blank.blankId,
        check: "signature_notarial_service_or_court_owned_blank_is_not_blank",
        category: owned, drawnText: text });
    }

    if (carriesInk) {
      const hit = NAME_TOKENS.filter((t) => text.toLowerCase().includes(t.toLowerCase()));
      if (hit.length) {
        namePlacements.push({ blankId: blank.blankId, page: blank.page, caption: blank.caption,
          text, tokens: hit, allowed: allowedNameBlanks.has(blank.blankId) });
        if (!allowedNameBlanks.has(blank.blankId)) {
          findings.push({ severity: "blocking", fixture: label, blankId: blank.blankId,
            check: "participant_name_drawn_in_a_blank_not_listed_as_a_name_blank",
            drawnText: text, tokens: hit });
        }
      }
    }
  }

  // THE WIDER NET: ink this build added that lands in no measured blank at all.
  // A value drawn in the margin is invisible to every per-blank check above, and
  // a mark in the margin is precisely what the older `re`-operator scan produced.
  const inNoBlank = added.filter((it) => !attributed.has(it) && it.text.trim() !== "");
  if (inNoBlank.length) {
    findings.push({ severity: "blocking", fixture: label,
      check: "this_build_drew_ink_outside_every_measured_blank",
      items: inNoBlank.length,
      firstAt: { page: inNoBlank[0].page, x: inNoBlank[0].x, y: inNoBlank[0].y, text: inNoBlank[0].text } });
  }

  // Every value the factory reported writing has to be findable on the paper.
  for (const value of report.expectedValues ?? []) {
    const found = perBlank.some((b) => b.inkFoundAtTheMeasuredRectangle === String(value));
    if (!found) {
      findings.push({ severity: "blocking", fixture: label,
        check: "a_value_the_factory_reported_writing_is_not_at_any_measured_rectangle", value: String(value) });
    }
  }

  return {
    findings, perBlank, chargeBlanks, namePlacements,
    itemsAdded: added.length,
    itemsInsideAMeasuredBlank: attributed.size,
    glyphsAdded: added.reduce((n, it) => n + it.glyphs, 0),
    blanksCarryingInk: perBlank.filter((b) => b.inkFoundAtTheMeasuredRectangle).length
  };
}

// ==============================================================================
// main
// ==============================================================================
async function main() {
  const blocked = new Set(readJson(STALE_BLOCK).hashes ?? []);
  fs.mkdirSync(path.join(rootDir, OUT), { recursive: true });

  const widthOf = await helveticaRuler();
  const documents = [];
  const allFindings = [];

  for (const doc of DOCUMENTS) {
    console.log(`\n=== ${doc.documentId} (${doc.documentRole}) ===`);
    const { bytes, indexEntry } = resolveSource(doc);
    console.log(`  source bound     sha256=${doc.sha256}  bytes=${bytes.length}  pages=${indexEntry.pageCount}  revision=${doc.revision}`);

    const census = await censusDocument(doc, bytes);
    const strokedTotal = census.strokedByPage.reduce((n, p) => n + p.strokedRectangles, 0);
    console.log(`  censused ${census.blanks.length} blanks across ${census.pages.length} pages`
      + `  (stroked rectangles measured: ${strokedTotal}; acroform fields: ${census.acroFieldCount})`);

    if (CENSUS_ONLY) {
      documents.push({ doc, census, indexEntry, anchors: [], withheld: [], protectedRules: [], fixtures: null, sourceByteLength: bytes.length });
      continue;
    }

    const { anchors, withheld } = anchorsFor(doc, census);
    const protectedRules = protectedRulesFor(census);
    console.log(`  offered ${anchors.length} anchors, withheld ${withheld.length}`
      + ` (${withheld.filter((w) => w.channel === "family_role_refusal").length} by role,`
      + ` ${withheld.filter((w) => w.channel === "printed_page_region").length} by page region,`
      + ` ${withheld.filter((w) => w.channel === "measured_geometry").length} by measured width)`);

    const fixtures = {};
    for (const [label, facts] of [["canonical", CANONICAL], ["boundary", BOUNDARY]]) {
      const result = await finalizeFlatOverlay({
        sourceBytes: bytes,
        expectedSha256: doc.sha256,
        anchors,
        selections: [],
        protectedRules,
        explicitMappings: doc.explicitMappings,
        facts,
        documentTextLines: census.documentTextLines,
        title: `AR ${doc.documentId}`
      });

      const rel = `${OUT}/fixtures/${doc.key}-${label}-filled.pdf`;
      fs.mkdirSync(path.dirname(path.join(rootDir, rel)), { recursive: true });
      fs.writeFileSync(path.join(rootDir, rel), result.bytes);
      const hash = sha256(result.bytes);
      if (blocked.has(hash)) fail(`${doc.documentId}/${label}: rendered to a BLOCKED hash`, hash);

      const fontsOnThePage = await assertArtifactUsesHelvetica(result.bytes, `${doc.documentId}/${label}`);
      const added = await addedInkOf(bytes, result.bytes);
      const proof = verifyFromBytes({
        doc, census, anchors, withheld, report: result.report, added, widthOf,
        label: `${doc.key}-${label}`
      });
      allFindings.push(...proof.findings);

      console.log(`  ${label}: factory wrote ${result.report.written.length}, refused ${result.report.refused.length}`
        + `; artifact carries ink in ${proof.blanksCarryingInk} measured blank(s)`
        + `; sha256=${hash.slice(0, 16)}…  findings=${proof.findings.length}`);

      fixtures[label] = { file: rel, sha256: hash, byteLength: result.bytes.length, report: result.report, proof, fontsOnThePage };
    }

    documents.push({ doc, census, indexEntry, anchors, withheld, protectedRules, fixtures, sourceByteLength: bytes.length });
  }

  if (CENSUS_ONLY) {
    writeCensusRecord(documents);
    console.log("\n--census-only: steps 1-3 complete. Nothing was rendered, verified or rastered, and nothing is claimed.");
    return;
  }

  // ---- step 8: local raster, or exact-PDF handoff to central Chromium ---------
  const rasters = [];
  if (!NO_RASTER) {
    for (const d of documents) {
      for (const label of ["canonical", "boundary"]) {
        const outDir = `${OUT}/raster/${d.doc.key}-${label}`;
        fs.mkdirSync(path.join(rootDir, outDir), { recursive: true });
        await rasterizePdf({
          file: path.join(rootDir, d.fixtures[label].file),
          outDir: path.join(rootDir, outDir),
          scale: 1.6,
          prefix: "page"
        });
        const files = fs.readdirSync(path.join(rootDir, outDir)).filter((f) => f.endsWith(".png")).sort();
        if (files.length !== d.census.pages.length) {
          fail(`${d.doc.documentId}/${label}: rastered ${files.length} page(s) of ${d.census.pages.length}`,
            "Every page is rastered for visual review, or the family is not reviewable.");
        }
        rasters.push({
          document: d.doc.documentId, fixture: label, directory: outDir,
          pages: files.map((f) => ({
            file: path.posix.join(outDir, f),
            sha256: sha256(fs.readFileSync(path.join(rootDir, outDir, f))),
            byteLength: fs.statSync(path.join(rootDir, outDir, f)).size
          }))
        });
        console.log(`  rastered ${d.doc.key}-${label}: ${files.length} page(s)`);
      }
    }
  } else {
    console.log("  raster deferred: exact canonical/boundary PDF hashes bind the central Chromium handoff");
  }

  writeRecords({ documents, rasters, allFindings });

  const chargeBlanks = documents.flatMap(({ fixtures }) =>
    ["canonical", "boundary"].flatMap((l) => fixtures[l].proof.chargeBlanks));
  console.log(`\n${allFindings.length === 0 ? "OK" : "FINDINGS"}: `
    + `${chargeBlanks.length} charge-vocabulary blanks examined across all fixtures, `
    + `${chargeBlanks.filter((b) => b.participantNameTokensFound.length).length} carrying a participant name, `
    + `${chargeBlanks.filter((b) => b.inkFound).length} carrying any ink at all.`);
  if (allFindings.length) {
    for (const f of allFindings) console.error(`  ${f.severity} ${f.fixture ?? ""} ${f.blankId ?? ""}: ${f.check}`);
    process.exit(1);
  }
}

// ==============================================================================
// The records.
// ==============================================================================

/**
 * Step 2 record: every blank both documents draw, with the measurement it was
 * found by. Written by the full build and by --census-only alike, because the
 * map has to be written against measured ids and this is where they come from.
 */
function writeCensusRecord(documents) {
  writeJson(`${OUT}/field-census.census-v1.json`, {
    schemaVersion: "rcap-official-form-field-census/v1-flat",
    familyId: FAMILY_ID,
    routeKeys: [ROUTE_KEY],
    jurisdiction: "AR",
    structuralClass: "flat_pdf",
    structuralClassReadFrom: "the source bytes, via pdf-lib getForm().getFields() — not from the corpus index",
    geometrySource: "content_stream",
    geometryMethod: {
      strokedBoxes:
        "scripts/lib/pdf-stroked-boxes.mjs, run over every page of both documents. It maintains the CTM through "
        + "q/Q/cm and emits only on stroke operators. Its count per page is recorded below as a MEASUREMENT, "
        + "including where that measurement is zero: 'the tool found nothing' and 'the tool was not run' are "
        + "different findings. The older re-operator scan tracked no CTM and put a mark in the margin.",
      underscoreLeaderRuns:
        "Maximal runs of the `_` glyph inside the text-showing operators, measured through the shared "
        + "CTM-tracking walker in scripts/rcap-official-forms/rcap-pdf-anchor-capture.mjs. Start, end and baseline "
        + "come from the glyph metrics.",
      drawnRules:
        "Thin filled rectangles, read by rulesOfPage from the same walk. A rule carrying printed glyphs across at "
        + `least ${UNDERLINE_INK_FRACTION} of its width is an UNDERLINE, not a blank; both documents underline `
        + "their own titles. The classification is measured, never guessed from which line looks like a heading.",
      blankIdIsTheMeasurement:
        "A blank's id is `p<page>-y<baseline>-x<left>` in page points. A flat form has no field name to key on, and "
        + "an id that IS the measurement cannot drift from the thing it names without the census failing to find it."
    },
    revisionSkew: {
      petition: "REV-2022-03-08",
      order: "REV-2022-03-07",
      observation:
        "The order carries a revision date one day BEFORE the petition it is filed with. Both revisions are "
        + "confirmed from the corpus index and from each document's own printed footer.",
      treatment: "Recorded as an observed property of the pinned pair. Not an error, not corrected, not substituted."
    },
    documents: documents.map(({ doc, census, indexEntry, sourceByteLength }) => ({
      documentId: doc.documentId,
      documentRole: doc.documentRole,
      officialTitle: doc.officialTitle,
      revision: doc.revision,
      sha256: doc.sha256,
      byteLength: sourceByteLength,
      pageCount: indexEntry.pageCount,
      ownership: doc.ownership,
      captionOnly: doc.captionOnly,
      pageGeometry: census.pageGeometry,
      acroFieldCount: census.acroFieldCount,
      strokedRectanglesByPage: census.strokedByPage.map((p) => ({
        page: p.page, strokedRectangles: p.strokedRectangles
      })),
      blankCount: census.blanks.length,
      blankCountByConstruction: {
        underscore_leader_run: census.blanks.filter((b) => b.construction === "underscore_leader_run").length,
        drawn_rule: census.blanks.filter((b) => b.construction === "drawn_rule").length
      },
      rulesByPage: census.rulesByPage,
      blanks: census.blanks
    }))
  });
}

function writeRecords({ documents, rasters, allFindings }) {
  const rasterPending = rasters.length === 0;
  const standardWrites = [];
  const standardRefusals = [];
  for (const { doc, census, anchors, withheld, fixtures } of documents) {
    const inked = new Set(fixtures.canonical.proof.perBlank
      .filter((row) => row.inkFoundAtTheMeasuredRectangle)
      .map((row) => row.blankId));
    const anchorById = new Map(anchors.map((row) => [row.blankId, row]));
    const withheldById = new Map(withheld.map((row) => [row.blankId, row]));
    for (const blank of census.blanks) {
      const anchor = anchorById.get(blank.blankId) ?? null;
      const written = anchor
        ? fixtures.canonical.report.written.find((row) => row.anchor === anchor.label) ?? null
        : null;
      const effectiveLabel = blank.caption || blank.printedLine || blank.blankId;
      if (inked.has(blank.blankId)) {
        standardWrites.push({
          documentId: doc.documentId,
          fieldName: blank.blankId,
          effectiveLabel,
          factId: written?.factId ?? null,
          page: blank.page,
        });
        continue;
      }
      const held = withheldById.get(blank.blankId) ?? null;
      const protectedBlank = held?.channel === "printed_page_region"
        || /signature|notar|jurat|court|judge|clerk|prosecutor|service|certificate/i
          .test(`${held?.class ?? ""} ${effectiveLabel}`);
      const classifiedLabel = protectedBlank
        ? (/court|judge|clerk|prosecutor/i.test(`${held?.class ?? ""} ${effectiveLabel}`)
            ? `For court use only — ${effectiveLabel}`
            : `Signature or service-event completion — ${effectiveLabel}`)
        : effectiveLabel;
      standardRefusals.push({
        documentId: doc.documentId,
        fieldName: blank.blankId,
        effectiveLabel: classifiedLabel,
        page: blank.page,
        ...(protectedBlank
          ? {
              completenessDisposition: "PROTECTED_FIELD",
              reason: /signature/i.test(`${held?.class ?? ""} ${effectiveLabel}`)
                ? "Signature or date field; never prefilled before the participant or official signs."
                : "Court, clerk, prosecutor, agency, service-event, or notarial field; never prefilled.",
            }
          : {
              completenessDisposition: "REQUIRED_BEFORE_FILING",
              requiredBeforeFiling: true,
              factAvailable: false,
              reason: "Participant-completable fact not held by this build; supply and verify before filing.",
            }),
      });
    }
  }
  const requiredInstructionLines = standardRefusals
    .filter((row) => row.completenessDisposition === "REQUIRED_BEFORE_FILING")
    .map((row) => `- ${row.effectiveLabel} (source blank: \`${row.fieldName}\`)`);
  // ---- step 1 record ---------------------------------------------------------
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
      + "SOURCE_ALREADY_HELD with commissionAcquisition false: both document sources resolve to files already in "
      + "the verified corpus. Nothing was fetched from a court or agency host, and no mirror, cache, aggregator or "
      + "lookalike form was consulted. The pinned Master Library was recovered through "
      + "scripts/rcap-corpus/bootstrap-private-corpus.sh, which verifies the archive hash and the corpus's own "
      + "governance checksums before extracting.",
    sourceArchive: "Expungement_AI_RCAP_Master_Library_Edition_1",
    bindingMethod: {
      how: "Each binary is hashed on disk and the digest compared with BOTH the family's pinned value and the "
        + "committed corpus index entry at the same path; the byte length and the revision label are compared with "
        + "the index as well.",
      absenceAndMismatchAreDifferentFindings: {
        SOURCE_ABSENT_FROM_INDEX: "the committed index names no entry at this path",
        SOURCE_ABSENT_FROM_DISK: "the index names it but the corpus does not hold it",
        SOURCE_MISMATCH_AGAINST_INDEX: "the index declares a different digest from the family pin",
        SOURCE_MISMATCH_ON_DISK: "the bytes on disk hash to something else",
        SOURCE_BYTE_LENGTH_DISAGREES_WITH_INDEX: "same digest claim, different length",
        SOURCE_REVISION_DISAGREES_WITH_INDEX: "same digest claim, different revision label"
      },
      neitherIsAPass: true
    },
    priorAttemptThisReopens: {
      gateReport: `${OUT}/gate-report.json`,
      status: "BLOCKED_ENVIRONMENT_SOURCE_CORPUS_UNREACHABLE",
      whatWasBlocking:
        "bootstrap-private-corpus.sh failed resolving the pinned release asset with HTTP 403: the credential in "
        + "that container could not read Roger-LegalEase/legalease-source-artifacts. Both sources were recorded "
        + "NOT_BOUND_SOURCE_ABSENT — an absence, not a mismatch — and neither PDF was opened.",
      howItWasReopened:
        "The source-artifacts repository was attached to this session read-only, after which the same unmodified "
        + "bootstrap resolved the asset, verified the archive digest "
        + "a26e3ca7d52db4460e53c2eddd893109037702f5c8035f2c698a7e16bad84e89 and extracted the corpus. Nothing about "
        + "the block's diagnosis was wrong: it was an access-capability block, and granting the access cleared it.",
      whatThePriorAttemptCarriedForward:
        "Both documents flat at 0 AcroForm fields, the flat DWI sibling as the pattern, and the one-day revision "
        + "skew. Each was labelled there as resting on the committed index rather than on the bytes. All three are "
        + "now CONFIRMED against the bytes by this build and are no longer index-only claims."
    },
    documents: documents.map(({ doc, census, indexEntry, sourceByteLength }) => ({
      sourceId: doc.documentRole === "PETITION"
        ? "official-form:ACIC-PETITION-TO-SEAL-PARDONED-OFFENDER"
        : "official-form:ACIC-ORDER-TO-SEAL-PARDONED-OFFENDER",
      documentId: doc.documentId,
      documentRole: doc.documentRole,
      officialTitle: doc.officialTitle,
      issuingAuthority: "Arkansas Crime Information Center (ACIC)",
      revision: doc.revision,
      pathInArchive: doc.pathInArchive,
      sha256: doc.sha256,
      byteLength: sourceByteLength,
      pageCount: indexEntry.pageCount,
      bindingResult: "BOUND_EXACT",
      structuralClassInTheIndex: indexEntry.structuralClassObserved,
      acroFieldCountInTheIndex: indexEntry.acroFieldCount,
      acroFieldCountReadFromTheBytes: census.acroFieldCount,
      structuralClassConfirmedFromTheBytes: census.acroFieldCount === 0
    })),
    revisionSkew: {
      order: "REV-2022-03-07",
      petition: "REV-2022-03-08",
      observation:
        "The proposed order carries a revision date one day BEFORE the petition it is filed with. Both labels are "
        + "confirmed from the corpus index and from each document's own printed footer.",
      treatment:
        "Recorded as an observed property of the pinned pair. It is not an error, it is not corrected, neither "
        + "document is substituted for a same-dated one, and no later revision was sought — egress to the issuing "
        + "authority is refused by policy and this family is SOURCE_ALREADY_HELD."
    },
    egress: {
      courtOrAgencyHostsContacted: 0,
      mirrorsOrCachesConsulted: 0,
      statement: "Acquisition was not commissioned and none was attempted. The only network access this build "
        + "depended on was the pinned GitHub release that carries the Master Library archive."
    }
  });

  // ---- step 2 record ---------------------------------------------------------
  writeCensusRecord(documents);

  // ---- step 3 record: the map ------------------------------------------------
  //
  // The write boxes recorded here are the ones the ARTIFACT carries ink at, not
  // the ones the render report claims. A map built from the report would be the
  // report vouching for itself.
  writeJson(`${OUT}/production-field-map.json`, {
    schemaVersion: "rcap-official-form-field-map/v1-census-v1",
    familyId: FAMILY_ID,
    routeKeys: [ROUTE_KEY],
    renderStrategy: "flat_overlay_draw",
    renderedBy: "scripts/rcap-official-forms/rcap-official-form-finalize.mjs finalizeFlatOverlay",
    generationAllowed: false,
    runtimeSelectable: false,
    writeBoxesAreConfirmedFromTheArtifact: true,
    noBoxWasDrawn: {
      statement:
        "Every write box below is a rectangle one of these two documents already draws. No box was invented, "
        + "widened, or moved, and no selection control was marked: scripts/lib/pdf-stroked-boxes.mjs measures ZERO "
        + "stroked rectangles on every page of both documents, so there is no measured box for markSelections to "
        + "mark. The order's '[_] Felony [_] Misdemeanor' controls are text glyphs inside the text-showing "
        + "operators, not stroked paths, and are withheld by the measured-width gate at 12.98pt.",
      selectionsMade: 0
    },
    geometryGates: {
      write_box_falls_outside_the_page_media_box:
        "A rectangle measuring outside the 612x792 media box is withheld. Six blanks across the two documents do: "
        + "the order's conviction-date trio reaches x=952 and the petition's page 2 signature and date rules reach "
        + "x=739.6. Ink there is on no page anybody prints, and it would still satisfy every per-blank check, "
        + "because it lands inside a blank the census really did measure.",
      write_box_not_exactly_measured:
        "An underscore leader run whose line reports metricsExact=false has a rectangle estimated from the type "
        + "size rather than measured from the font's glyph widths. Those are withheld. Drawn rules are exempt: "
        + "their geometry comes from the path operators. This is what the off-page rectangles above are evidence "
        + "for — the same fallback, on the same lines, walking a line 340pt past the edge of the paper.",
      write_box_too_narrow_to_hold_a_value: "Fewer than 20pt between the measured ends of the blank."
    },
    writes: standardWrites,
    refusals: standardRefusals,
    documents: documents.map(({ doc, census, anchors, withheld, protectedRules, fixtures }) => {
      const byId = new Map(census.blanks.map((b) => [b.blankId, b]));
      const inked = new Set(fixtures.canonical.proof.perBlank
        .filter((b) => b.inkFoundAtTheMeasuredRectangle)
        .map((b) => b.blankId));
      return {
        documentId: doc.documentId,
        documentRole: doc.documentRole,
        ownership: doc.ownership,
        captionOnly: doc.captionOnly,
        explicitMappings: doc.explicitMappings,
        explicitMappingsNote:
          "Empty on purpose, and matter.charge is the mapping deliberately absent. Unlike the flat DWI sibling, "
          + "these two documents DO draw charge blanks, so the absence is a decision. Paragraph 1 asks what the "
          + "defendant was CHARGED with and paragraph 2 what they pled or were found GUILTY of; the platform holds "
          + "one matter.charge, and writing it into both would assert the charged and convicted offences are the "
          + "same, which a plea to a lesser offence makes false — on a PARDON route, reached after a conviction "
          + "that may well have been pled down. Each offence also runs onto a full-measure continuation rule, and "
          + "the shared factory does not split a value across continuation rules. The class and statute blanks "
          + "beside them are facts the platform does not hold at all. not_mapped is not a map: these blanks are "
          + "left for the participant and listed in reports/blanks-left-for-the-participant.json.",
        roleRefusals: doc.roleRefusals,
        anchorsOffered: anchors.length,
        writeBoxes: anchors
          .filter((a) => inked.has(a.blankId))
          .map((a) => {
            const b = byId.get(a.blankId);
            const written = fixtures.canonical.report.written.find((w) => w.anchor === a.label) ?? null;
            return {
              blankId: a.blankId,
              factId: written?.factId ?? null,
              page: a.page,
              writeBox: a.writeBox,
              rectBasis: b.geometryBasis,
              baselineBasis: a.baselineBasis,
              measuredBlank: b.measured,
              writeBoxIsExactlyMeasured: b.writeBoxIsExactlyMeasured,
              withinTheMediaBox: b.withinTheMediaBox,
              caption: b.caption,
              captionBasis: b.captionBasis,
              printedLine: b.printedLine,
              confirmedInkInTheArtifact: fixtures.canonical.proof.perBlank
                .find((p) => p.blankId === a.blankId)?.inkFoundAtTheMeasuredRectangle ?? null
            };
          }),
        anchorsOfferedButRefusedByTheFactory: anchors
          .filter((a) => !inked.has(a.blankId))
          .map((a) => ({ blankId: a.blankId, caption: a.label, page: a.page })),
        withheldBeforeTheFactory: withheld,
        refusedByTheFactory: fixtures.canonical.report.refused,
        protectedRulesHandedToTheFactory: protectedRules
      };
    })
  });

  // ---- step 4 record: the local variation -------------------------------------
  //
  // Every clause below is either read off the printed text of the pinned sources
  // — with the page it is printed on — or taken from the committed route record.
  // Nothing else is asserted, and what the sources do not establish is named as
  // not established rather than filled in.
  writeJson(`${OUT}/local-filing-variation.json`, {
    schemaVersion: "rcap-local-filing-variation/v1",
    familyId: FAMILY_ID,
    jurisdiction: "AR",
    routeKeys: [ROUTE_KEY],
    evidenceBasis:
      "The printed text of the two pinned source binaries, and "
      + "data/rcap-grade-a/route-obligation-census-candidate/route-obligation-candidate.json for the route's own "
      + "destination and actor. No court or agency host was contacted; egress to those hosts is refused by policy.",
    statuteOrAuthority: {
      asPrintedOnBothForms: "Act 1460 of 2013; A.C.A. 16-90-1401, Et. Seq.",
      committedRouteRecord: "A.C.A. § 16-90-1411",
      whatThePetitionPraysUnder: "A.C.A. § 16-90-1406 (petition, page 2)",
      whatTheOrderSealsUnder: "A.C.A. § 14-90-1411 (order, page 2), quoted exactly as printed",
      whatTheOrderFindsUnder: "A.C.A. § 16-90-1415(e) and § 16-90-1411 (order, page 2, paragraph 5)",
      observedInconsistency: {
        finding:
          "The order's operative decree cites A.C.A. § 14-90-1411 while its own paragraph 5 immediately above "
          + "cites § 16-90-1411, and the sealing chapter these forms are issued under is Title 16 § 16-90-1401 et "
          + "seq. as printed in both documents' titles.",
        treatment:
          "Quoted exactly as the form prints it and NOT corrected. Whether this is a typographical error in the "
          + "official form is a question for counsel, not for this build. It is recorded so review sees it."
      }
    },
    routePrecondition: {
      statement:
        "A pardon must already have been granted. This packet is the sealing step that follows one; it does not "
        + "apply for a pardon, evidence one, or establish that one issued.",
      howTheFormsExpressIt:
        "The petition's paragraph 5 reads 'On the ___ day of ___, ___ the Governor issued a Pardon to the "
        + "Defendant for the above referenced offense(s).' The order opens 'Before the Court is the Pardon issued "
        + "by the Governor in the above referenced matter.'",
      platformFillsIt: false,
      whyNot:
        "The platform holds no pardon fact of any kind — not the grant, not its date, not an executive order "
        + "number. All three components of the pardon-grant date are refused by role, so nothing this build "
        + "produces asserts or implies that a pardon was granted. See the map's roleRefusals, class "
        + "'pardon_grant_date_component'.",
      committedRouteRecord:
        "route-obligation-candidate.json records destination.detail 'The pardon itself is a prerequisite event. "
        + "The later sealing filing is a participant packet.'"
    },
    venue: {
      statement: "The court handling the sealing after the pardon.",
      source: "route-obligation-candidate.json destination.name for this route key",
      howTheFormsExpressIt:
        "The petition prints 'IN THE CIRCUIT COURT OF ______, ARKANSAS' followed by '______ DIVISION' — the court "
        + "type is pre-printed as CIRCUIT. The order prints 'IN THE ______ COURT OF ______ COUNTY, ARKANSAS' "
        + "followed by '______ DIVISION', leaving the court type blank as well. The two documents therefore "
        + "disagree about whether the court type is a blank at all, which is recorded as observed.",
      platformFillsIt: false,
      whyNot:
        "The form prints no caption naming the county, the court type or the division. The blanks are measured "
        + "exactly, but the printed words beside them are 'IN THE CIRCUIT COURT OF', 'COURT OF', ', ARKANSAS' and "
        + "'DIVISION', and none of those names an allowlisted fact. This family will not assert a caption-to-fact "
        + "binding the document does not express, so all of them are left for the participant and the gap is "
        + "reported rather than closed by inventing a label. See reports/blanks-left-for-the-participant.json."
    },
    filing: {
      whoFiles: "the participant (processActor 'participant', participantCanInitiate true on this route)",
      whatIsFiled: "the ACIC Petition, with the ACIC Order tendered to the court as the proposed order it signs",
      verification: {
        required: true,
        statement:
          "The petition carries a VERIFICATION page: the petitioner swears the petition is true and correct "
          + "before a notary — 'Subscribed and sworn to before me on this ___ day of ___, 20___' — over the "
          + "notary's signature and commission expiry, with a seal. Petition page 3.",
        platformCompletesIt: false,
        whyNot:
          "The oath has not been taken, and the jurat is executed in one act before a notary. The jurat county, "
          + "the petitioner's signature, all three jurat date components and the notary's signature are refused by "
          + "role, and the whole page additionally sits under the printed heading VERIFICATION, which the shared "
          + "region vocabulary classifies as notarization."
      },
      identificationBlock: {
        statement:
          "Both documents end with 'THE FOLLOWING INFORMATION IS REQUIRED FOR PROPER IDENTIFICATION OF THE "
          + "DEFENDANT IN THE STATE AND NATIONAL RECORD SYSTEMS' and ask for Race, Sex, DOB, Arrest Tracking "
          + "Number, SID No. and FBI No.",
        whatThePlatformSupplies:
          "The date of birth, and only on the order, where the caption is measured cleanly. Race and Sex are facts "
          + "the platform does not hold; the Arrest Tracking Number, the SID number and the FBI number are "
          + "assigned by ACIC and the FBI and are the agencies' to state — the FBI number is marked '(if known)' "
          + "on the form itself.",
        petitionAsymmetry:
          "On the PETITION the same six blanks are not written at all. Its identification block's captions arrive "
          + "from the content stream with their glyphs out of order, so the walker reads 'DO' for DOB and 'Ra' for "
          + "Race and no caption binds; the Arrest Tracking Number and FBI No. rules additionally carry their own "
          + "printed words across 85% and 75% of their width and are classified as underlines rather than blanks. "
          + "This is recorded as a measurement outcome, not claimed as a refusal. See "
          + "reports/blanks-left-for-the-participant.json."
      }
    },
    fee: {
      established: false,
      whatTheSourcesSay:
        "Neither pinned form states a filing fee, names a fee-waiver route, or mentions costs at all. Unlike the "
        + "misdemeanor DWI petition, this petition carries no paragraph about court costs being paid or excused.",
      whatIsNotEstablished:
        "The filing fee for this petition, whether any county charges one, and whether a waiver exists. No amount "
        + "is asserted here. Establishing it needs a source this family does not hold and may not fetch."
    },
    service: {
      required: true,
      statement:
        "A copy of the petition must be provided to the Prosecuting Attorney for the county in which the petition "
        + "has been filed, and to the arresting agency, by placing a copy in the United States mail postage "
        + "prepaid or by hand delivering a copy to said office.",
      source: "the petition's Certificate of Service, page 4, read from the pinned bytes",
      platformCompletesIt: false,
      whyNot:
        "The certificate attests to an act of service that has not happened. The certifying name, the signature "
        + "rule captioned 'Defendant or Defendant's Attorney' and the date are all refused by role.",
      sharedRegionChannelDoesNotProtectThisPage: {
        finding:
          "The page 4 heading is typeset with its glyphs out of order, so the walker reads 'Certicatofefi Service' "
          + "and regionProtectCategoryOf does not match it. The census records regionProtectCategory null for the "
          + "'I, ___' blank on that page.",
        consequence:
          "On the flat DWI sibling the equivalent page was caught by the region channel. Here it is not, and the "
          + "role refusals are the whole of the protection. This is why the refusals are stated per blank instead "
          + "of relying on the region gate."
      }
    },
    deliveryAfterTheOrder: {
      statement:
        "The order directs the Clerk to mail or transmit a certified copy of the ORDER to the Arkansas Crime "
        + "Information [Center], the Administrative Office of the Courts, the prosecuting attorney, the arresting "
        + "agency, and both the city attorney and District Court Clerk if applicable; each of those agencies must "
        + "then comply with A.C.A. § 16-90-1413 as it pertains to them.",
      source: "the order, page 2, read from the pinned bytes",
      actor: "the court clerk, not the participant and not the platform"
    },
    eligibilityConditionsThePetitionAsserts: [
      "the defendant was arrested and charged with a stated offence (paragraph 1)",
      "the defendant pled guilty or nolo contendere or was found guilty of a stated offence (paragraph 2)",
      "the offence did not involve a victim under eighteen, did not constitute a sex offence, and did not result "
        + "in serious injury or death (paragraph 3)",
      "if a youthful offender: the felony was committed in Arkansas while under sixteen, the defendant was "
        + "convicted and given a suspended sentence, and has not been convicted of another criminal offence "
        + "(paragraph 4)",
      "the Governor issued a Pardon for the referenced offence(s) (paragraph 5)"
    ],
    conditionsThePlatformDoesNotAnswer: {
      statement:
        "Paragraphs 3 and 4 are assertions the form states rather than questions with controls, and the order's "
        + "'[_] Felony [_] Misdemeanor' is the only choice control on either document. It reads as boxes on the "
        + "page but is drawn as TEXT GLYPHS inside the text-showing operators, not as stroked paths: "
        + "scripts/lib/pdf-stroked-boxes.mjs measures ZERO stroked rectangles on every page of both documents. The "
        + "platform holds no charge-class fact, so nothing is marked. markSelections refuses a box that was not "
        + "measured off the document, and there is no measured stroked box here to give it.",
      selectionsMade: 0
    },
    routeAvailability: {
      committedState: "unit:ar-pardon-seal-stage-2:available=true",
      thisBuildChangesIt: false,
      note:
        "This route is already marked available in the committed record, unlike the flat DWI sibling's. That is "
        + "not this build's doing and this build does not touch it. Availability is not output approval: the "
        + "route's own record still carries currentCommercialState "
        + "NO_UNIT_LEVEL_GRADE_A_FULFILLMENT_RECORD and packetFamilyId null."
    }
  });

  // ---- step 5 record: the wiring, which creates no authority -------------------
  //
  // FIX04: a later wiring lane appended a `binding` block to this file by hand —
  // the acceptance receipt, the last independent verdict, the maintenance
  // relationship. A rebuild used to drop it silently, which is how a rebuild
  // destroys someone else's record. It is carried forward verbatim instead, with
  // the single exception of `packetComponents`: that list named only the two
  // official forms, and naming two of three required components is exactly the
  // COMPONENT_SET defect this repair answers. It is set from the manifest.
  const priorWiringPath = path.join(rootDir, `${OUT}/product-wiring.json`);
  const priorWiring = fs.existsSync(priorWiringPath)
    ? JSON.parse(fs.readFileSync(priorWiringPath, "utf8"))
    : {};
  const carriedBinding = priorWiring.binding
    ? {
        ...priorWiring.binding,
        packetComponents: (readPacketSet().components ?? [])
          .map((component) => `component:${component.componentId}`)
      }
    : undefined;
  writeJson(`${OUT}/product-wiring.json`, {
    schemaVersion: "rcap-packet-family-product-wiring/v1",
    familyId: FAMILY_ID,
    worklistGroupId: FAMILY_ID,
    routeKeys: [ROUTE_KEY],
    packetSetId: "ar-pardon-seal-set",
    implementationStrategy: "official_pdf_fill",
    renderStrategy: "flat_overlay_draw",
    documents: documents.map(({ doc }) => ({
      documentId: doc.documentId, documentRole: doc.documentRole,
      officialTitle: doc.officialTitle, revision: doc.revision, sha256: doc.sha256,
      ownership: doc.ownership, order: doc.documentRole === "PETITION" ? 1 : 2
    })),
    fieldMap: `${OUT}/production-field-map.json`,
    fieldCensus: `${OUT}/field-census.census-v1.json`,
    sourceReceipt: `${OUT}/source-receipt.json`,
    localFilingVariation: `${OUT}/local-filing-variation.json`,
    // FIX04: the packet set has three required components, not two. The
    // process_guidance component is delivered as a file, so the wiring names
    // where the whole set is accounted for rather than listing only the PDFs.
    componentSet: `${OUT}/reports/component-set.json`,

    // What this wiring is NOT. Every one of these stays false, and none of them
    // is this family's to set.
    generationAllowed: false,
    runtimeSelectable: false,
    commercialRouteOpened: false,
    fulfilmentRecordCreated: false,
    outputApprovalGranted: false,
    packetFamilyId: null,
    packetFamilyIdNote:
      "Left null. A packet-family identity is a route identity, and route identities are not this family's to mint. "
      + "The committed route record still carries packetFamilyId null and unit-packet-identity-status 'not recorded'.",
    routeAvailabilityUnchanged: {
      committedState: "unit:ar-pardon-seal-stage-2:available=true",
      thisBuildChangesIt: false,
      why: "Availability was already true in the committed record before this build and is untouched by it. It is "
        + "not an output approval and this build does not treat it as one."
    },
    whatWouldOpenTheRoute: [
      "output-level legal approval for this exact packet family and route scope",
      "counsel's answer to the two questions this build records rather than resolves: the order's A.C.A. "
        + "§ 14-90-1411 citation, and whether the charged and convicted offence blanks may ever be filled from a "
        + "single held charge fact",
      "human independent visual review of the rendered pages",
      "a Grade-A fulfilment record keyed to the exact route and packet family — which is the ONLY thing that "
        + "creates commercial authority, and which this build does not and cannot create"
    ],
    paymentOrSponsorshipTouched: false,
    productionConfigurationTouched: false,
    sharedManifestsTouched: false,
    otherFamiliesTouched: false,
    legacyGeneratorsTouched: false,
    liveRcapRoutesTouched: false,
    ...(carriedBinding ? { binding: carriedBinding } : {})
  });

  // ---- the proofs --------------------------------------------------------------
  const chargeBlanks = documents.flatMap(({ doc, fixtures }) =>
    ["canonical", "boundary"].flatMap((label) =>
      fixtures[label].proof.chargeBlanks.map((b) => ({ document: doc.documentId, fixture: label, ...b }))));

  writeJson(`${OUT}/reports/charge-caption-proof.json`, {
    schemaVersion: "rcap-charge-caption-proof/v1",
    familyId: FAMILY_ID,
    question:
      "Does any blank associated with a charge, offence, count, statute or violation carry a participant name "
      + "token in the rendered artifact bytes?",
    whyThisFamilyIsTheOneThatMatters:
      "The stale-artifact block in data/rcap-grade-a/stale-artifact-block.json is about a map that wrote the "
      + "participant's NAME into blanks holding the offence they were charged with, and one of its twelve blocked "
      + "artifacts is the AR ACIC arrest petition — the same issuing authority, the same drafting, the same year. "
      + "The flat DWI sibling could only prove the defect was unreproducible there, because its offence is "
      + "pre-printed and it has no charge blank at all. THESE TWO DOCUMENTS DRAW CHARGE BLANKS. This is the family "
      + "where the proof does real work rather than confirming an absence.",
    method:
      "Every glyph the finished PDF draws is read back through the shared CTM-tracking walker, every glyph the "
      + "SOURCE already drew is subtracted, and what remains is located against each blank's own measured "
      + "rectangle. A flat overlay draws into page content rather than into a widget appearance, so this is the "
      + "artifact answering directly rather than the render report vouching for itself.",
    howABlankCountsAsChargeAssociated: {
      caption: "the blank's own measured caption names a charge, offence, count, statute or violation",
      own_printed_line: "the printed line the blank sits on names one",
      printed_line_above:
        "the nearest printed line above the blank, within 60pt — two lines of these forms' leading. This channel "
        + "exists because the petition's ACTUAL charge blanks are the two full-measure rules beneath ', and "
        + "charged with the offense(s) of :' at y=386.76 and y=367.71, and neither has a caption or a host text "
        + "line of its own. Without it, the blanks that most need watching would be the ones the proof could not "
        + "see."
    },
    consistentWith: "scripts/rcap-official-forms/verify-full-name-charge-caption-semantics.mjs",
    nameTokensSearchedFor: NAME_TOKENS,
    chargeAssociatedBlanksExamined: chargeBlanks.length,
    carryingAParticipantNameToken: chargeBlanks.filter((b) => b.participantNameTokensFound.length).length,
    carryingAnyInkAtAll: chargeBlanks.filter((b) => b.inkFound).length,
    result: chargeBlanks.every((b) => b.participantNameTokensFound.length === 0)
      ? "NO_PARTICIPANT_NAME_IN_ANY_CHARGE_ASSOCIATED_BLANK"
      : "PARTICIPANT_NAME_FOUND_IN_A_CHARGE_ASSOCIATED_BLANK",
    blanks: chargeBlanks
  });

  const namePlacements = documents.flatMap(({ doc, fixtures }) =>
    ["canonical", "boundary"].flatMap((label) =>
      fixtures[label].proof.namePlacements.map((p) => ({ document: doc.documentId, fixture: label, ...p }))));

  writeJson(`${OUT}/reports/participant-name-placement.json`, {
    schemaVersion: "rcap-participant-name-placement/v1",
    familyId: FAMILY_ID,
    question: "Every place either fixture's participant name reaches paper, and whether it was allowed there.",
    method:
      "The allowlist is stated per document as a set of blank ids. The verification reads every glyph this build "
      + "adds and fails on a name token drawn anywhere but those, so a surname or a middle name landing in the "
      + "wrong blank is caught as well as the whole name.",
    allowlist: NAME_MAY_APPEAR_IN,
    placements: namePlacements,
    allWithinTheAllowlist: namePlacements.every((p) => p.allowed)
  });

  writeJson(`${OUT}/reports/rendered-artifacts.json`, {
    schemaVersion: "rcap-rendered-artifacts/v1",
    familyId: FAMILY_ID,
    approvedForParticipantDelivery: false,
    note:
      "Internal review fixtures. They are rendered from the pinned sources with corpus-standard canonical and "
      + "boundary participants so review can see what the map does; they are not participant output, they open no "
      + "commercial route, and they create no fulfilment record.",
    artifacts: documents.flatMap(({ doc, census, fixtures }) =>
      ["canonical", "boundary"].map((label) => ({
        document: doc.documentId,
        documentRole: doc.documentRole,
        fixture: label,
        file: fixtures[label].file,
        sha256: fixtures[label].sha256,
        byteLength: fixtures[label].byteLength,
        sourceSha256: doc.sha256,
        pageCount: census.pages.length,
        fieldsWrittenByTheFactory: fixtures[label].report.written.length,
        fieldsRefusedByTheFactory: fixtures[label].report.refused.length,
        measuredBlanksCarryingInkInTheArtifact: fixtures[label].proof.blanksCarryingInk,
        textItemsAdded: fixtures[label].proof.itemsAdded,
        textItemsInsideAMeasuredBlank: fixtures[label].proof.itemsInsideAMeasuredBlank,
        glyphsAdded: fixtures[label].proof.glyphsAdded,
        blockingFindings: fixtures[label].proof.findings.length
      }))),
    rasterState: rasterPending ? "BUILT_RASTER_PENDING" : "LOCAL_RASTERS_RECORDED_PENDING_CENTRAL_ACCEPTANCE",
    rasters
  });

  // ---- FIX04 repair: the packet-set's own obligations, carried verbatim ------
  //
  // Read the two committed records and the one committed component text, bind
  // each by SHA-256, and fail loudly rather than emit a packet that silently
  // drops an obligation the manifest declares.
  const packetSet = readPacketSet();
  const track = (readJson(TRACK_REGISTRY).tracks ?? []).find((entry) => entry.trackId === TRACK_ID);
  if (!track) fail(`track absent from the committed registry: ${TRACK_ID}`);
  const stopConditions = track.selfHelpStopConditions ?? [];
  if (stopConditions.length === 0) fail(`the track declares no selfHelpStopConditions: ${TRACK_ID}`);

  const guidanceBytes = fs.readFileSync(path.join(rootDir, PROCESS_GUIDANCE_SOURCE));
  const guidanceComponent = (packetSet.components ?? [])
    .find((component) => component.componentId === PROCESS_GUIDANCE_COMPONENT_ID);
  if (!guidanceComponent) fail(`the manifest declares no component ${PROCESS_GUIDANCE_COMPONENT_ID}`);
  const guidanceOut = `${OUT}/components/${PROCESS_GUIDANCE_COMPONENT_ID}/process-guidance.md`;
  fs.mkdirSync(path.dirname(path.join(rootDir, guidanceOut)), { recursive: true });
  fs.writeFileSync(path.join(rootDir, guidanceOut), guidanceBytes);

  // Every component the manifest marks required must now be present in the
  // delivered packet, each bound to the artifact that carries it.
  // The manifest names its two official components by role — primary_filing and
  // proposed_order — which is exactly how this build already distinguishes its
  // two documents. Matching on role rather than on officialFormId avoids
  // asserting an identity between two differently-spelled form ids that no
  // record states.
  const roleToDocumentRole = { primary_filing: "PETITION", proposed_order: "PROPOSED_ORDER" };
  const documentForComponent = (component) => documents
    .find(({ doc }) => doc.documentRole === roleToDocumentRole[component.role])?.doc ?? null;
  const deliveredComponents = (packetSet.components ?? []).map((component) => {
    const isGuidance = component.componentId === PROCESS_GUIDANCE_COMPONENT_ID;
    const doc = isGuidance ? null : documentForComponent(component);
    return {
      componentId: component.componentId,
      role: component.role,
      requirement: component.requirement,
      order: component.order,
      outputStrategy: component.outputStrategy,
      officialFormId: component.officialFormId,
      deliveredAs: isGuidance ? guidanceOut : (doc?.documentId ?? null),
      deliveredSha256: isGuidance ? sha256(guidanceBytes) : (doc?.sha256 ?? null),
      copiedVerbatimFrom: isGuidance ? PROCESS_GUIDANCE_SOURCE : null
    };
  });
  const undelivered = deliveredComponents
    .filter((component) => component.requirement === "required" && component.deliveredAs === null);
  if (undelivered.length > 0) {
    fail("a required component of this packet set is not delivered",
      undelivered.map((component) => component.componentId).join(", "));
  }
  writeJson(`${OUT}/reports/component-set.json`, {
    schemaVersion: "rcap-packet-component-set/v1",
    familyId: FAMILY_ID,
    packetSetId: PACKET_SET_ID,
    question:
      "Does the delivered packet carry every component the committed packet-set manifest declares required? "
      + "A packet that renders its official forms and drops a required process_guidance component is short a "
      + "component, not merely short an explanation.",
    manifestPath: PACKET_SET_MANIFESTS,
    manifestSha256: sha256(fs.readFileSync(path.join(rootDir, PACKET_SET_MANIFESTS))),
    componentsDeclaredRequired: deliveredComponents.filter((c) => c.requirement === "required").length,
    componentsDelivered: deliveredComponents.filter((c) => c.deliveredAs !== null).length,
    components: deliveredComponents
  });

  // The manifest's own required-before-filing sentences, and its own service
  // sentence, quoted rather than restated. `requiredBeforeFiling` on the
  // manifest already carries the fingerprint card, the ACIC criminal history,
  // the conviction-details cross-check, the pardon documentation and the
  // pardon/date cross-check; nothing is added to that list here.
  const manifestPrerequisites = (packetSet.requiredBeforeFiling ?? []);
  if (manifestPrerequisites.length === 0) fail("the manifest declares no requiredBeforeFiling entries");
  const serviceActions = (packetSet.participantActionRequired ?? [])
    .filter((action) => action.kind === "serve_party");
  if (serviceActions.length === 0) fail("the manifest declares no serve_party action");
  const serviceFromTheForm = readJson(`${OUT}/local-filing-variation.json`).service;

  fs.writeFileSync(path.join(rootDir, `${OUT}/participant-instructions.md`),
    `# Participant instructions\n\nPacket family: \`${FAMILY_ID}\`\n\n`
    + `These are review artifacts, not papers approved for filing or commercial delivery. Before any filing, `
    + `obtain and verify every item below and in \`reports/blanks-left-for-the-participant.json\`.\n\n`
    + `## Before this packet applies to you\n\n`
    + `A pardon must already have been granted. \`${guidanceOut}\` is the packet's own `
    + `process-guidance component and explains that step; it does not apply for a pardon and this packet does `
    + `not establish that one exists.\n\n`
    + `## Documents and cross-checks required before filing\n\n`
    + `${manifestPrerequisites.map((line) => `- ${line}`).join("\n")}\n\n`
    + `## Service\n\n`
    + `${serviceActions.map((action) => `- ${action.description}`).join("\n")}\n`
    + `- ${serviceFromTheForm.statement} (${serviceFromTheForm.source})\n\n`
    + `## Stop and get a lawyer if\n\n`
    + `${stopConditions.map((line) => `- ${line}`).join("\n")}\n\n`
    + `## Exact items required before filing\n\n${requiredInstructionLines.join("\n")}\n\nDo not pre-sign, `
    + `pre-date, or pre-certify service. Court, judge, clerk, notary, and service-event blanks remain for the `
    + `person or event named by the official form. The petition follows a granted pardon; this packet does not `
    + `establish that a pardon exists.\n`);
  fs.writeFileSync(path.join(rootDir, `${OUT}/filing-instructions.md`),
    `# Filing and process instructions\n\nPacket family: \`${FAMILY_ID}\`\n\n`
    + `This build does not authorize filing and does not guess a filing fee, waiver, address, deadline, or local `
    + `service practice. Review \`local-filing-variation.json\`, complete the official petition and proposed order, `
    + `and confirm the current process with the court for the case before signing or filing.\n`);

  writeJson(`${OUT}/reports/blanks-left-for-the-participant.json`, {
    schemaVersion: "rcap-blanks-left-for-the-participant/v1",
    familyId: FAMILY_ID,
    question:
      "Which blanks does this map leave empty, and for which of them is the reason a decision rather than a "
      + "limitation? A packet whose gaps are unexplained is not reviewable.",
    reasonClasses: {
      family_role_refusal:
        "This family determined the participant does not complete it, or does not complete it yet. A decision.",
      printed_page_region:
        "The blank sits under a printed heading the shared vocabulary protects — VERIFICATION, a service block. "
        + "A decision, run by this family because finalizeFlatOverlay does not run the region channel.",
      "measured_geometry:write_box_falls_outside_the_page_media_box":
        "The measured rectangle is not on the page. A limitation of the source's typesetting, reported not hidden.",
      "measured_geometry:write_box_not_exactly_measured":
        "The rectangle is estimated from fallback glyph widths rather than measured. A limitation of the walker "
        + "against these fonts, reported not hidden.",
      "measured_geometry:write_box_too_narrow_to_hold_a_value":
        "Fewer than 20pt between the measured ends. A limitation.",
      refused_by_the_shared_factory:
        "Offered as an anchor; the shared factory's own protect, type or caption-only rules refused it.",
      no_caption_binds_it:
        "Offered as an anchor and not refused, but no allowlisted fact matches its measured caption, so nothing "
        + "was written. This is where the two documents' scrambled captions land, and it is a limitation."
    },
    documents: documents.map(({ doc, census, anchors, withheld, fixtures }) => {
      const inked = new Set(fixtures.canonical.proof.perBlank
        .filter((b) => b.inkFoundAtTheMeasuredRectangle).map((b) => b.blankId));
      const withheldById = new Map(withheld.map((w) => [w.blankId, w]));
      const anchorById = new Map(anchors.map((a) => [a.blankId, a]));
      return {
        documentId: doc.documentId,
        blanksTotal: census.blanks.length,
        blanksWritten: census.blanks.filter((b) => inked.has(b.blankId)).length,
        blanksLeftEmpty: census.blanks.filter((b) => !inked.has(b.blankId)).length,
        blanks: census.blanks.filter((b) => !inked.has(b.blankId)).map((b) => {
          const held = withheldById.get(b.blankId) ?? null;
          return {
            blankId: b.blankId,
            page: b.page,
            caption: b.caption,
            printedLine: b.printedLine,
            measured: b.measured,
            reasonClass: held
              ? (held.channel === "measured_geometry" ? `measured_geometry:${held.class}` : held.channel)
              : (anchorById.has(b.blankId) ? "no_caption_binds_it" : "refused_by_the_shared_factory"),
            reason: held
              ? held.why
              : "Offered as an anchor. No allowlisted fact matched its measured caption, so nothing was written.",
            whoCompletesIt: held && held.channel === "family_role_refusal"
              ? held.class
              : "the participant, their attorney, the notary, the clerk or the court, per the printed form"
          };
        })
      };
    })
  });

  writeJson(`${OUT}/reports/independent-visual-review.json`, {
    schemaVersion: "rcap-independent-visual-review-request/v1",
    familyId: FAMILY_ID,
    status: "visual_review_pending",
    whatIsBeingAskedFor:
      "A human looks at every page produced by the central Chromium raster workflow and confirms that what the "
      + "build says is on the paper is what is on the paper. This build proves ink position from the artifact's "
      + "own glyphs; it cannot see that a value "
      + "looks wrong to a reader, overlaps a printed word, or sits on the wrong line of a two-line block.",
    lookHardestAt: [
      "Petition page 1, paragraph 1: the arrest-date trio and the two full-measure charge rules beneath it must "
        + "all be EMPTY. This is the geometry where the blocked artifacts put a participant's name into an offence.",
      "Petition page 2, paragraph 5: the pardon-grant date trio must be EMPTY. Anything printed there asserts a "
        + "pardon on a date.",
      "Petition page 2 generally: nothing at all is written on this page. Confirm that is legible as an unfilled "
        + "page rather than as a broken render — every blank on it is an underscore leader on a line whose glyph "
        + "widths could not be resolved.",
      "Petition pages 3 and 4: the VERIFICATION jurat and the Certificate of Service must be entirely empty.",
      "Order page 1: the defendant name and case number are written; the arrest-date trio, the charge blanks, the "
        + "class and the statute blanks must be empty.",
      "Order page 2: the defendant's name inside the decree sentence must read as part of that sentence and must "
        + "not run into 'should be, and'. The Judge and Date rules must be empty.",
      "Order page 3: the DOB is the only thing written in the identification block.",
      "Both documents, boundary fixture: the long name and the long case number must stay inside their measured "
        + "rules and must not overprint an adjacent caption."
    ],
    rasters
  });

  writeJson(`${OUT}/approval-request.json`, {
    schemaVersion: "rcap-output-approval-request/v1",
    familyId: FAMILY_ID,
    routeKeys: [ROUTE_KEY],
    status: "REQUESTED",
    grantedBy: null,
    note:
      "This is a REQUEST for output-level legal review. This build grants no approval, opens no commercial route, "
      + "creates no fulfilment record and marks no packet proven. The family remains not runtime-selectable and "
      + "generationAllowed is false. The route's committed availability was already true before this build and is "
      + "untouched by it; availability is not output approval.",
    workTypesAddressed: {
      OFFICIAL_SOURCE_ACQUISITION_REQUIRED:
        "Resolved as CUSTODY, not acquisition: both sources were already held and are bound by exact pinned "
        + "SHA-256 against both the bytes on disk and the committed corpus index, with the byte length and the "
        + "revision label checked too. Nothing was acquired.",
      OFFICIAL_FORM_MAP_REQUIRED:
        "Addressed. Both documents are flat PDFs with zero AcroForm fields — confirmed from the bytes, not from "
        + "the index — so every write box is measured from the page content stream and each is confirmed from the "
        + "artifact bytes at its own rectangle.",
      ARTIFACT_REVIEW_REQUIRED:
        (rasterPending
          ? "Addressed at the nonvisual machine level: canonical and boundary fixtures rendered and verified from the artifact bytes. All fourteen page rasters and the HUMAN independent visual review remain pending the central Chromium workflow."
          : "Addressed at the machine level: canonical and boundary fixtures rendered, verified from the artifact bytes, and all fourteen pages rastered. The HUMAN independent visual review is still outstanding."),
      PRODUCT_WIRING_REQUIRED:
        "Addressed as wiring only, in product-wiring.json. It creates no authority: generationAllowed false, "
        + "runtimeSelectable false, packetFamilyId still null, route availability unchanged.",
      OUTPUT_LEGAL_APPROVAL_REQUIRED:
        "NOT addressed. Requested here; a human legal reviewer grants it or does not."
    },
    decisionsAReviewerShouldLookAtFirst: [
      {
        decision: "The charge blanks are left BLANK on both documents, and matter.charge is deliberately not mapped.",
        where: "petition page 1 paragraphs 1 and 2; order page 1 paragraphs 1 and 2",
        why: "Paragraph 1 asks what the defendant was CHARGED with and paragraph 2 what they pled or were found "
          + "GUILTY of. The platform holds one matter.charge, and writing it into both would assert those are the "
          + "same offence — which a plea to a lesser offence makes false, on a route reached after a conviction "
          + "that may well have been pled down. Each offence also runs onto a full-measure continuation rule, and "
          + "the factory does not split a value across continuation rules.",
        askTheReviewer: "Is leaving both offence statements to the participant correct? If the platform should "
          + "fill paragraph 1, it needs a charged-offence fact distinct from the convicted offence — a new fact, "
          + "not a new mapping."
      },
      {
        decision: "The pardon-grant date is refused in full: 'On the ___ day of ___, ___ the Governor issued a Pardon'.",
        where: "petition page 2 paragraph 5",
        why: "This packet is the sealing step that FOLLOWS a pardon. The platform holds no pardon fact of any "
          + "kind, and anything printed there would assert on the participant's own verified petition that a "
          + "pardon issued on a date this build has no source for.",
        askTheReviewer: "Confirm that the participant supplies the pardon date. If the platform is ever to hold a "
          + "pardon fact, that is a new fact and a new eligibility question, not a mapping change."
      },
      {
        decision: "The venue line is left entirely blank on both documents.",
        where: "page 1 of both: 'IN THE ___ COURT OF ___, ARKANSAS' and '___ DIVISION'",
        why: "The form prints no caption naming the court, the county or the division, and this family will not "
          + "invent one to force a binding. The two documents also disagree about whether the court type is a "
          + "blank at all: the petition pre-prints CIRCUIT, the order leaves it open.",
        askTheReviewer: "Is a packet that leaves the venue for the participant acceptable for this route, or must "
          + "the shared descriptor list learn this Arkansas caption line first?"
      },
      {
        decision: "The petition writes only TWO values in total — the case number and the defendant's name — while "
          + "the order writes four.",
        where: "the whole petition, and especially its page 2, which is entirely blank",
        why: "Not a role decision. 23 of the petition's 40 blanks are underscore leaders on lines whose glyph "
          + "widths the shared walker cannot resolve, so their rectangles are estimates rather than measurements "
          + "and the geometry gate withholds them. Two of those estimates land 127pt off the right edge of the "
          + "paper, which is the evidence the gate rests on. The petition's own captions arrive scrambled from the "
          + "content stream for the same reason — 'da oy' for 'day of', 'Ci' for 'City', 'DO' for 'DOB'.",
        askTheReviewer: "Is a petition this sparse acceptable as an internal review fixture while the walker's "
          + "font handling is improved, or should the family wait for exact metrics on these two documents? Note "
          + "the ORDER is unaffected and fills normally."
      },
      {
        decision: "The date of birth is written into the identification block on the ORDER but not on the PETITION.",
        where: "order page 3 'DOB ___'; petition page 3 'DOB ___'",
        why: "An asymmetry of measurement, not of policy. The order's caption reads cleanly as 'DOB' and binds; "
          + "the petition's arrives as 'DO' and binds nothing. It is recorded rather than closed by hand-writing a "
          + "caption the document does not express.",
        askTheReviewer: "Confirm that pre-filling the DOB on the proposed ORDER is intended at all, and whether "
          + "the petition should carry it too once its caption can be read."
      },
      {
        decision: "Dates are printed in ISO form: the rendered order reads 'DOB 1991-04-17'.",
        where: "order page 3",
        why: "The shared factory writes a date fact as the string the fact set carries, and valueMatchesType "
          + "requires YYYY-MM-DD. Nothing reformats a date per jurisdiction, so this is shared behaviour rather "
          + "than a choice this family made.",
        askTheReviewer: "Is ISO acceptable on an Arkansas filing, or must the date of birth print MM/DD/YYYY? If "
          + "the latter, the change belongs in the shared factory and affects every family, not here."
      },
      {
        decision: "An over-long value is left BLANK rather than shrunk past legibility or clipped.",
        where: "the boundary fixture: the long case number is refused on both documents",
        why: "fitTextToWidget refuses below MIN_READABLE_FONT_SIZE rather than clipping. A clipped value on a "
          + "filing is a wrong value, not a shorter one. The boundary NAME does fit, at 7pt, and is verified to "
          + "end 10pt inside its rule using Helvetica's true metrics.",
        askTheReviewer: "Confirm that a 7pt name on a form whose body is 10pt is acceptable, or set a floor at "
          + "which the platform should leave the blank for the participant instead."
      },
      {
        decision: "The order's decree is quoted as printed, citing A.C.A. § 14-90-1411.",
        where: "order page 2",
        why: "Its own paragraph 5 immediately above cites § 16-90-1411, and both titles are issued under "
          + "§ 16-90-1401 et seq. The form is reproduced exactly; nothing is corrected.",
        askTheReviewer: "Is the Title 14 citation a known typographical error in the official ACIC form, and does "
          + "it affect whether this order is acceptable as tendered?"
      }
    ],
    independentVisualReviewRequired: true,
    thisDoesNotOpenACommercialRoute: true
  });

  writeJson(`${OUT}/build-findings.json`, {
    schemaVersion: "rcap-family-build-findings/v1",
    familyId: FAMILY_ID,
    blockingFindings: allFindings,
    blockingFindingCount: allFindings.length,
    advisory: [
      {
        id: "flat-overlay-region-channel-never-runs",
        severity: "advisory",
        where: "scripts/rcap-official-forms/rcap-official-form-finalize.mjs, the decideBinding call inside finalizeFlatOverlay",
        finding:
          "finalizeOfficialForm passes `regionHeading` to decideBinding; finalizeFlatOverlay does not. On a flat "
          + "overlay the shared region channel therefore never runs, so a blank under a printed 'Certificate of "
          + "Service' or 'VERIFICATION' is not refused by region however it is captioned.",
        evidence:
          "This family computes regionProtectCategoryOf itself and withholds every anchor in a protected region; "
          + "the census records regionProtectCategory per blank, and the withheld list records channel "
          + "'printed_page_region' for each one the shared path would have missed.",
        whyItIsNotPatchedHere:
          "The shared module is not this family's path to change. Patching it from a packet build would alter "
          + "every flat family's behaviour in a commit whose subject is one Arkansas route.",
        thisFamilyDependsOnIt: false
      },
      {
        id: "region-heading-defeated-by-scrambled-glyph-order",
        severity: "advisory",
        where: "the petition, page 4",
        finding:
          "Even where the region channel is run, it can be defeated by the source's own typesetting. The "
          + "petition's page 4 heading is emitted with its glyphs out of order, so the walker reads 'Certicatofefi "
          + "Service' and regionProtectCategoryOf does not match it. The census records regionProtectCategory null "
          + "for the 'I, ___' certifying-name blank on that page.",
        consequence:
          "On the flat DWI sibling the equivalent page WAS caught by region. Here it is not, and the family's role "
          + "refusals are the whole of the protection for that page. A family that relied on the region gate alone "
          + "would have left the certifying name writable.",
        thisFamilyDependsOnIt: false
      },
      {
        id: "underscore-leader-geometry-unreliable-on-these-sources",
        severity: "advisory",
        where: "both documents; worst on the petition's page 2 and the order's page 1",
        finding:
          "23 of the petition's 40 blanks and 10 of the order's 28 sit on lines the shared walker reports "
          + "metricsExact=false, meaning it could not resolve the font's glyph widths and fell back to the type "
          + "size as the width of every glyph. Six of those rectangles land outside the 612x792 media box — the "
          + "order's conviction-date trio reaches x=952 and the petition's page 2 signature and date rules reach "
          + "x=739.6.",
        consequence:
          "Underscore-leader rectangles on those lines are estimates, not measurements. This build withholds them "
          + "rather than writing into them, which is why the petition writes only two values. Drawn rules are "
          + "unaffected: their geometry comes from the path operators.",
        whatWouldResolveIt:
          "Font-width resolution for these two documents' embedded fonts in the shared walker. Until then the "
          + "affected blanks are left for the participant and listed in "
          + "reports/blanks-left-for-the-participant.json.",
        thisFamilyDependsOnIt: false
      },
      {
        id: "per-glyph-ink-attribution-produces-false-overflow-findings",
        severity: "advisory",
        where: "this family's own verification stage, corrected before this build was accepted",
        finding:
          "The first version of verifyFromBytes located added ink glyph by glyph, using each glyph's x and w from "
          + "the walker. Those per-glyph values are accumulated from the font's advance widths, and where the "
          + "walker cannot resolve them it falls back to the type size as every glyph's width. The overlay's own "
          + "embedded Helvetica is one of the fonts it cannot resolve.",
        consequence:
          "It reported three BLOCKING findings against the petition's boundary fixture — that the 69-character "
          + "name was drawn outside every measured blank and was not a value the factory reported writing. All "
          + "three were false. The factory shrank the name to 7pt, where Helvetica's true width for that string is "
          + "228.25pt against a 234.9pt write box on a 238.4pt rule, so the artifact-byte geometry proves it stays "
          + "inside. The verifier was failing on its own transcription rather than on the artifact.",
        howItWasFixed:
          "Ink is now attributed PER TEXT ITEM by the item's origin — which comes straight from the text matrix "
          + "and is exact whatever the font — and transcribed from the item's own decoded string. The drawn EXTENT "
          + "is measured separately against Helvetica's published advance widths, after assertArtifactUsesHelvetica "
          + "confirms from the finished PDF's own font resources that Helvetica is the font on the page. No "
          + "verifier was weakened or skipped: the extent check is stricter than what it replaced, and it now "
          + "fails on a value that truly runs past its rule.",
        whyItIsRecorded:
          "Every flat family verifying this way inherits the same trap, and the tempting response to a false "
          + "blocking finding is to loosen the check that raised it. The correct response was to measure the right "
          + "thing.",
        thisFamilyDependsOnIt: false
      },
      {
        id: "order-decree-cites-title-14",
        severity: "advisory_for_counsel",
        where: "the order, page 2",
        finding:
          "The order's operative decree prints 'hereby is SEALED pursuant to A.C.A. §14-90-1411' while its own "
          + "paragraph 5 immediately above cites §16-90-1411, and both documents' titles are issued under A.C.A. "
          + "16-90-1401 et seq.",
        treatment:
          "Quoted exactly as printed and NOT corrected. Whether it is a typographical error in the official form "
          + "is counsel's question, not this build's.",
        thisFamilyDependsOnIt: false
      },
      {
        id: "shared-name-date-semantics-record-lags-every-census-v1-family",
        severity: "advisory",
        where: "data/rcap-grade-a/field-semantics/name-date-component-classification-diff.json, checked by "
          + "scripts/rcap-official-forms/verify-name-date-component-semantics.mjs",
        finding:
          "That verifier's stored record was generated over 157 censuses. On this branch 162 committed censuses "
          + "already exist before this family, so the check 'the record scanned every committed census, including "
          + "census-v1' FAILS at HEAD independently of this work. Adding this family's census makes it 163.",
        whatThisFamilyChanges:
          "One census, from 162 to 163. The failure is pre-existing and was confirmed by running the verifier at "
          + "HEAD with this family's output removed: it reports the identical failure with 162. The companion "
          + "check in verify-full-name-charge-caption-semantics.mjs fails at HEAD too, with text this family does "
          + "not change at all.",
        whyItIsNotRegeneratedHere:
          "The record is shared across every family, and regenerating it from this build would sweep five other "
          + "census-v1 families' censuses into a commit whose subject is one Arkansas route. It belongs to a "
          + "regeneration pass over all of them.",
        whatDOESHold:
          "Every substantive invariant in both verifiers passes with this family's census present: no field binds "
          + "a writable participant name into a charge blank, no date-component blank binds a writable participant "
          + "name, no protect category is removed, no protect rule is weakened, and no refused field becomes "
          + "writable. Neither verifier was modified, skipped or weakened.",
        thisFamilyDependsOnIt: false
      },
      {
        id: "revision-skew-between-the-pair",
        severity: "observation",
        finding:
          "The order is REV-2022-03-07 and the petition REV-2022-03-08: the proposed order carries a revision date "
          + "one day BEFORE the petition it is filed with. Confirmed from the corpus index and from each "
          + "document's own printed footer.",
        treatment:
          "Recorded as an observed property of the pinned pair. Not an error, not corrected, not substituted, and "
          + "no later revision was sought.",
        thisFamilyDependsOnIt: false
      }
    ],
    whatThisBuildDoesNotEstablish: [
      "that this family is approved for participant delivery — it is not, and this build cannot grant that",
      "that any commercial route is open, or that any fulfilment record exists",
      "that the charged offence and the convicted offence may be filled from a single held charge fact — this "
        + "build refuses to and records the question for counsel",
      "that the order's A.C.A. § 14-90-1411 citation is or is not an error in the official form",
      "any filing fee, or that none exists",
      "that a pardon was granted in any matter — this packet is the step that follows one and asserts nothing "
        + "about it"
    ]
  });
}

main().catch((e) => fail(e.message, e.stack));
