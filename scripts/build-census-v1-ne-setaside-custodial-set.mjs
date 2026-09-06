#!/usr/bin/env node
// CENTRAL packet-family builder shared by the NE, SD, UT, and WV census-v1
// families assigned to this lane. Sibling builders import runFamilyById from
// this family-named file so the implementation remains inside the lane's owned
// scripts. It creates review evidence only: every product record is closed.

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

import {
  captureWidgetContext,
  extractPageGeometry,
  extractTextItems,
  groupIntoLines,
  normalizeHarvestedText,
  pageRegions
} from "./rcap-official-forms/rcap-pdf-anchor-capture.mjs";
import { rulesOfPage } from "./rcap-official-forms/rcap-pdf-rule-lines.mjs";
import {
  finalizeFlatOverlay,
  finalizeOfficialForm
} from "./rcap-official-forms/rcap-official-form-finalize.mjs";
import { flattenedWidgets, drawnAt } from "./rcap-official-forms/pdf-flattened-widgets.mjs";
import { scanBytesForActiveContent } from "./rcap-official-forms/rcap-active-content.mjs";
import { checkboxCandidates, strokedRectangles } from "./lib/pdf-stroked-boxes.mjs";
import {
  captionDescribesChargeValue,
  decideBinding,
  descriptorsMatching,
  protectCategoryOf,
  regionProtectCategoryOf,
  resolveFact
} from "./rcap-official-forms/rcap-field-semantics.mjs";
// The completeness contract's CLOSED refusal vocabulary, imported rather than
// restated. A disposition this builder writes and a disposition the packet
// completeness audit reads are then the same set by construction.
import { REFUSAL_CLASSES } from "./rcap-packet-completeness/completeness-contract.mjs";

const thisFile = fileURLToPath(import.meta.url);
const rootDir = path.resolve(path.dirname(thisFile), "..");
process.chdir(rootDir);
const require = createRequire(import.meta.url);
const {
  PDFDocument,
  PDFTextField,
  PDFCheckBox,
  PDFRadioGroup,
  PDFDropdown,
  PDFOptionList,
  PDFRawStream,
  PDFName,
  decodePDFRawStream
} = require("pdf-lib");
const sharp = require("sharp");

const CORPUS_INDEX = "data/rcap-all50/local-source-corpus-index.json";
const CUSTODY = "data/rcap-grade-a/route-obligation-census-v1/source-custody-reconciliation.json";
const WORKLIST = "data/rcap-grade-a/route-obligation-census-v1/category-a-implementation-waves.json";
const STALE_BLOCK = "data/rcap-grade-a/stale-artifact-block.json";
const FIXED_DATE = new Date("2026-01-01T00:00:00Z");
const POPPLER_PDFTOPPM = process.env.RCAP_PDFTOPPM || "pdftoppm";
const RASTER_DPI = 72;

function popplerEvidenceFromProbe({ configuredByEnvironment, stdout, stderr }) {
  const combined = `${stderr ?? ""}\n${stdout ?? ""}`;
  const version = /\bpdftoppm\s+version\s+([^\s]+)/i.exec(combined)?.[1] ?? null;
  assert.ok(version, `Poppler pdftoppm version was not reported: ${combined.trim()}`);
  return {
    engine: "poppler_pdftoppm",
    discoveryMode: configuredByEnvironment ? "RCAP_PDFTOPPM" : "PATH",
    version,
  };
}

function assertPopplerAvailable() {
  const probe = spawnSync(POPPLER_PDFTOPPM, ["-v"], { encoding: "utf8" });
  assert.ifError(probe.error);
  assert.equal(probe.status, 0,
    `Poppler pdftoppm is unavailable via RCAP_PDFTOPPM/PATH: ${probe.stderr || probe.stdout}`);
  return popplerEvidenceFromProbe({
    configuredByEnvironment: Boolean(process.env.RCAP_PDFTOPPM),
    stdout: probe.stdout,
    stderr: probe.stderr,
  });
}

/*
 * FIX81. The Nebraska local-rules check, in the memo's own words.
 *
 * Quoted verbatim from data/record-clearing/legal-design-intake/NE.memo.json,
 * track ne-setaside-custodial, components[5].notes. `assertLocalRulesCheckIsTheMemos`
 * re-reads the memo on every build and throws if this string and the memo's
 * have drifted by one character, so the packet cannot go on quoting a sentence
 * the record no longer carries.
 */
const LOCAL_RULES_CHECK_NOTE =
  "The judiciary warns twice that local practice varies. "
  + "The packet tells the participant to confirm with the clerk what that court requires before filing.";

const LEGAL_DESIGN_MEMO = "data/record-clearing/legal-design-intake/NE.memo.json";
const PACKET_SET_MANIFESTS = "data/record-clearing/legal-design-packet-set-manifests.json";

const UT_COMMON_SOURCES = [
  "official-form:1000EX",
  "official-form:1020EX",
  "official-form:1044XX",
  "official-form:1146XX",
  "official-form:1148XX",
  "official-form:1149XX",
  "official-form:1169XX",
  "official-form:UT-BCI-EXP-APPLICATION",
  "official-form:UT-BCI-THIRD-PARTY-RELEASE"
];

const utRoutes = (track) => [
  `obligation:unit:UT:${track}:${track}-bci-certificate`,
  `obligation:unit:UT:${track}:${track}-court-petition`
];

const FAMILY_CONFIGS = Object.freeze({
  "ne-setaside-custodial-set": {
    state: "ne",
    action: "BUILD",
    outputVehicle: "official-pdf-fill",
    assignmentOwnedPath: "data/rcap-all50/overlays/census-v1/ne/ne-setaside-custodial-set--official-pdf-fill",
    routeKeys: ["obligation:track-pathway:NE:ne-setaside-custodial:set-aside-incarceration-one-year-or-less"],
    selectionId: "ne-custodial-cc-6-11-complete-set",
    sourceIds: ["official-form:CC-6-11", "official-form:CC-6-11.2", "official-form:CC-6-11a", "official-form:DC-1-15"],
    chargeLabel: "Eligible Nebraska conviction",
    participantGuidance: {
      heldSourceNote:
        "Every statement in the sections above is taken from the committed track registry entry for track "
        + "ne-setaside-custodial (data/record-clearing/legal-design-track-registry.json), which is a held source "
        + "under DET-FEE-AND-WAIVER-001 amendments A1 and A2. Where the registry records that a fact is NOT "
        + "established, that is said in terms and an office you can actually reach is named, per the same "
        + "determination. Nothing here is inferred from a neighbouring Nebraska route. The one exception is the "
        + "local-rules check, which names its own source inside that section: the committed legal-design memo for "
        + "track ne-setaside-custodial, quoted there in full.",
      whereYouFile: [
        "**File the petition and the proposed order in your EXISTING criminal case, with the clerk of the sentencing court.** "
        + "This is not a new case: it goes into the case file that already exists.",
        "**Which court is the sentencing court** — the Nebraska county court or district court that imposed the sentence. "
        + "The caption on the packet reads \"IN THE ______ COURT OF ______ COUNTY, NEBRASKA\" and both blanks are yours to "
        + "complete: write the court type (county or district) and the county from your own sentencing record.",
        "**How you may file** — in person, by mail, or by fax if you are filing for yourself.",
        "**One petition per conviction.** If you have more than one conviction to set aside, each needs its own separate packet."
      ],
      whatItCosts: [
        "**No fee amount is stated here, because no held source states one for this filing.** The committed track registry "
        + "records it in terms: the statewide fee schedule carries no line item for a petition filed inside an existing "
        + "criminal case, so no figure may be shown to you. This packet will not guess one.",
        "**Ask the clerk of the sentencing court what this filing costs, before you file.** That clerk is the office that "
        + "answers it — the same clerk you file with. Ask about each petition separately if you are filing more than one.",
        "**If you cannot pay, a waiver exists in principle.** Neb. Rev. Stat. § 25-2301.01 provides for proceeding in forma "
        + "pauperis and reaches criminal cases in any county or state court. This packet does not include a waiver form: "
        + "the registry records that the official DC 6:7.1 form does not fit this filing, and that mismatch is recorded as "
        + "a release blocker rather than papered over. Ask the clerk how to apply for the waiver on this petition."
      ],
      whoYouServe: [
        "**In DISTRICT court:** you obtain a hearing date from the judge's bailiff, then file the Notice of Hearing (DC 1:15) "
        + "and give a copy to the prosecutor. Service is BY MAIL on the prosecutor, and the certificate of service on page "
        + "two of DC 1:15 is how you evidence it. Sign that certificate only after you have actually mailed the copy.",
        "**In COUNTY court:** you do not schedule or serve the notice. The clerk schedules the hearing and mails the notice. "
        + "The DC 1:15 pages in this packet are for a district-court case; leave them alone in a county-court case.",
        "**The hearing date, time, courtroom and judge on DC 1:15 are blank on purpose** — the bailiff gives you those, and "
        + "the platform cannot know them."
      ],
      whereSelfHelpEnds: [
        "any signal that the prosecutor opposes the petition, or any contested hearing;",
        "a petition that has already been denied, where the choice is between appeal and refiling, or a prior denial where it is unclear which subsection it was under;",
        "probation revoked or violated, or discharge on disputed terms;",
        "you want the conviction VACATED rather than set aside;",
        "your real goal is firearm-rights restoration — a Nebraska set-aside does not restore firearm rights, and § 29-2264(6) preserves the conviction for the firearm statute. A pardon is the only route;",
        "any sex-offender registration obligation, current or historical;",
        "any immigration exposure — a Nebraska set-aside has no federal effect, and filing can surface a record;",
        "an out-of-state, federal or tribal record, or any uncertainty about a pending charge anywhere;",
        "any offence that might be a motor-vehicle offence under the Rules of the Road;",
        "consecutive sentences that together exceed one year;",
        "you need representation at the hearing."
      ],
      whatThisReliefIsNot:
        "Say SET ASIDE, never expunge, clear or erase. Neb. Rev. Stat. § 29-2264(5) nullifies the conviction and removes "
        + "civil disabilities and disqualifications. It does not seal, erase or remove the record, and § 29-2264(6) lists "
        + "the many purposes for which the conviction still counts.",
      /*
       * FIX81, COMPONENT_SET. The sixth component this route names.
       *
       * The committed packet-set manifest declares six components for
       * ne-setaside-custodial-set. Five of them are a form or a stated absence.
       * The sixth, `ne-setaside-custodial-local-rules-check-6`, has role
       * local_rules_check, requirement REQUIRED and outputStrategy
       * process_guidance -- it is guidance rather than paper, and it reached no
       * delivered surface at all: participant-instructions.md contained no
       * occurrence of "local", "varies", "vary" or "practice", and CC 6:11a,
       * the judiciary's own instruction page, carries no local-practice warning
       * either.
       *
       * The content is the memo's, not this builder's. LOCAL_RULES_CHECK_NOTE
       * below is asserted at build time to equal NE.memo.json, track
       * ne-setaside-custodial, components[5].notes character for character, so
       * this section cannot drift from the record it carries, and nothing is
       * said here that the memo does not say. The memo attaches no statute to
       * this component and none is invented for it.
       */
      localRulesCheck: [
        "**Local practice varies, and the Nebraska judiciary warns about it twice.** Before you file, ask the clerk of "
        + "the court you are filing in — the county court or district court that imposed the sentence — what that court "
        + "requires for this filing, and do what that clerk tells you the court requires.",
        "This is the packet's local-rules check: component `ne-setaside-custodial-local-rules-check-6` of the committed "
        + "packet-set manifest, role local_rules_check, requirement required, delivered as process guidance because the "
        + "manifest gives it no form to fill. It carries the committed legal-design memo's own words for that component "
        + "— data/record-clearing/legal-design-intake/NE.memo.json, track ne-setaside-custodial, components[5]: "
        + "\"" + LOCAL_RULES_CHECK_NOTE + "\" Nothing beyond that is stated here, because the memo states nothing beyond it."
      ]
    },
    /*
     * FIX81. Every component the route names, and what became of it.
     *
     * Asserted at build time against data/record-clearing/legal-design-packet-set-manifests.json:
     * the componentIds, roles and requirements below must equal that manifest's
     * six rows exactly, in order. A component may be delivered, conditional and
     * explained, or not generated with a reason -- and nothing else.
     */
    componentDisposition: [
      { componentId: "ne-setaside-custodial-primary-filing-1", role: "primary_filing", requirement: "required",
        disposition: "delivered", where: "packet page 1 (CC 6:11, Petition to Set Aside Criminal Conviction, Rev. 04/2024)" },
      { componentId: "ne-setaside-custodial-proposed-order-2", role: "proposed_order", requirement: "required",
        disposition: "delivered", where: "packet page 2 (CC 6:11.2, Order Setting Aside a Criminal Conviction, Rev. 12/2020)" },
      { componentId: "ne-setaside-custodial-notice-and-certificate-of-service-3", role: "notice_and_certificate_of_service",
        requirement: "conditional", disposition: "delivered_conditional_and_explained",
        where: "packet pages 4 and 5 (DC 1:15, Notice of Hearing and Certificate of Service, New 08/2019)",
        conditionStatedTo: "participant-instructions.md, \"Who must receive a copy, and how\": district court cases only; in county court the clerk schedules the hearing and mails the notice." },
      { componentId: "ne-setaside-custodial-instructions-4", role: "instructions", requirement: "required",
        disposition: "delivered", where: "packet page 3 (CC 6:11a, Completing the Petition, Rev. 06/2024)" },
      { componentId: "ne-setaside-custodial-fee-waiver-5", role: "fee_waiver", requirement: "conditional",
        disposition: "not_generated_with_a_reason",
        where: null,
        reason: "No fitting official form exists: DC 6:7.1 is scoped to civil, appeals and emancipation matters and offers no criminal case type, and no county-court application form exists at all. The absence and the reason are stated to the participant in participant-instructions.md, \"What it costs, and what to do if you cannot pay\", and the mismatch is carried as a release blocker rather than papered over." },
      { componentId: "ne-setaside-custodial-local-rules-check-6", role: "local_rules_check", requirement: "required",
        disposition: "delivered",
        where: "participant-instructions.md, section \"Confirm what the filing court requires before you file\" (process guidance; the manifest gives this component no form)" }
    ],
    /*
     * FIX81, KNOWN_PREFILLS. Facts the platform holds, written at the widget
     * the pinned form prints the caption for.
     *
     * Each entry names a FACT ID and a field, and the shared finalizer's
     * `narrativeAcrossFields` channel resolves it from the same `facts` set
     * every other write is resolved from. No text from this file can reach the
     * page through it, the value is fitted to that widget's own /Rect, and a
     * value that will not fit at the minimum readable size is refused whole
     * rather than truncated.
     *
     * Why the channel is needed at all: the shared descriptor list matches
     * nothing at these widgets. CC 6:11 harvests its Case No. caption from a
     * scrambled text stream as ",  CasNe o", CC 6:11.2 as ",  Cas" and DC 1:15
     * as "Case", so `decideBinding` returns no_allowlisted_fact_matches on all
     * three; and DC 1:15's certificate-of-service identity block harvests the
     * caption of the line BELOW each widget, so `streetaddress` reads
     * "City/State/ZIP Code" and the exact-caption gate refuses it. Both are
     * statements about this build's allowlist, and the completeness contract's
     * first condition for leaving a blank -- that the platform holds no value
     * -- is false: the packet writes the same participant's name and email
     * address in the same block.
     *
     * Measured on the pinned bytes before any write was made: each Case No.
     * widget sits immediately right of its own printed "Case No." caption
     * (CC 6:11 caption x 326.00-369.92 y 631.93-648.10 against widget
     * x 377.28-506.62 y 633.39-647.79; CC 6:11.2 x 325.34-369.26 y 614.41-630.58
     * against x 374.40-504.00 y 616.20-630.60; DC 1:15 x 347.88-391.52
     * y 619.05-635.21 against x 396.69-495.69 y 621.86-636.26), and each
     * identity-block widget sits right of its own printed caption on both
     * DC 1:15 pages ("Street Address/P.O. Box:" x 111.01-232.38, "City/State/ZIP
     * Code:" x 111.01-212.42 and "Telephone Number:" x 111.01-207.26, every
     * caption ending at least 3.5pt left of the widget it labels).
     *
     * FIX91, KNOWN_PREFILLS, the five widgets FIX81 left blank. VF02 read the
     * delivered pages and found the platform holding, and printing elsewhere in
     * this same packet, five facts the forms ask for and this build refused:
     * the caption defendant name on all three case-captioned documents, and the
     * street address and the email address in CC 6:11's own signature block.
     * They are added to this same channel, and to no other, so the shared
     * semantics module is untouched.
     *
     * RULED ON FROM THE PINNED FORM'S OWN LABEL, not from the field name. None
     * of the five is court-only or prosecutor-only:
     *   - CC 6:11 `defendant` (/Rect x 109.31 y 575.21 w 197.94 h 14.40, page
     *     1) sits on the caption line the delivered page prints as ", " above
     *     "(your full name)  Defendant." -- the form names the writer of this
     *     line as the participant, in those words.
     *   - CC 6:11.2 `defendant` (x 108.00 y 550.44 w 197.05) and DC 1:15
     *     `defendant` (x 106.32 y 562.72 w 189.00) are the same caption line on
     *     the proposed order and the notice of hearing; the caption of a filing
     *     into an existing criminal case names the same defendant.
     *   - CC 6:11 `streetaddress` (x 235.64 y 297.29 w 268.36) and
     *     `emailaddress` (x 193.09 y 248.40 w 310.91) are two lines of the
     *     six-line identity block under "Signature:", of which this build
     *     already writes `printedname`, `citystatezip` and "telephone number".
     *     The delivered page prints, immediately under the blank email line,
     *     "*Nebraska Supreme Court Rule § 2-208 requires individuals who are
     *     not attorneys and representing themselves to provide their email
     *     address" -- the form asks the participant for it by rule, and
     *     Neb. Ct. R. § 2-208 is in this track's authority list in
     *     data/record-clearing/legal-design-track-registry.json.
     *
     * The obstacle was never the widget. All six CC 6:11 identity fields are
     * /FT /Tx carrying the identical flag word Ff 8388608 (read-only clear,
     * required clear), /F 4, no /MaxLen and no /V, and the build wrote three of
     * the six. The refusal these five carried was
     * `binding_not_approved_by_exact_caption_gate`: CC 6:11 harvests
     * `defendant`'s caption as "vs", `streetaddress`'s as
     * "CRIMINAL CONVICTION · Street Address/P.O. Box" and `emailaddress`'s one
     * line high as "CRIMINAL CONVICTION · Telephone Num", and DC 1:15
     * `defendant` harvests no caption at all. That is a statement about this
     * build's allowlist, and `prepareAcroPolicy` still lifts nothing else: a
     * target whose reason were role, signature-date or forbidden-fact-class
     * stops the build.
     *
     * FIX81's local-rules check, its three case-number writes and its
     * measuredRefusals are unchanged by this repair.
     */
    namedFactWrites: {
      "CC-6-11": [
        { factId: "matter.case_number", fields: ["Text2"] },
        { factId: "participant.full_legal_name", fields: ["defendant"] },
        { factId: "participant.street_address", fields: ["streetaddress"] },
        { factId: "participant.email", fields: ["emailaddress"] }
      ],
      "CC-6-11.2": [
        { factId: "matter.case_number", fields: ["Text2"] },
        { factId: "participant.full_legal_name", fields: ["defendant"] }
      ],
      "DC-1-15": [
        { factId: "matter.case_number", fields: ["Text38"] },
        { factId: "participant.full_legal_name", fields: ["defendant"] },
        { factId: "participant.street_address", fields: ["streetaddress"] },
        { factId: "participant.city_state_zip", fields: ["citystatezip"] },
        { factId: "participant.phone", fields: ["telephone number"] }
      ]
    },
    /* FIX91 recovery. CC 6:11's defendant widget has its own 12pt /DA.
     * The narrative fitter reports 6pt for the boundary name, but that pass
     * does not align widget /DA sizes: the saved WIP clips the name at 12pt.
     * Its ordinary descriptor already resolves participant.full_legal_name.
     * Keep the same measured caption exemption, and use the existing ordinary
     * text writer with widget-size alignment. DC 1:15's caption also uses the
     * ordinary writer: its boundary name needs 184.302pt at 6pt in 185pt usable
     * width, but the narrative wrapper reserves a trailing space and refuses
     * it. One single-line name needs no narrative separator. Other named facts
     * retain their existing narrative channel. No source bytes change. */
    standardNamedFactWrites: { "CC-6-11": ["defendant"], "DC-1-15": ["defendant"] },
    /*
     * FIX81, KNOWN_PREFILLS. The caption court and county, said as the widget is.
     *
     * VF02 read the delivered page 1 as "IN THE ______ COURT OF ______ COUNTY,
     * NEBRASKA" with both blanks unwritten while the platform holds
     * matter.court and matter.county, and faulted the refusals for describing
     * build policy. They are named here so the row states the measurement
     * instead: two of them are PDF drop-downs, and the words of the caption
     * itself live in read-only display fields the form's own script rewrites.
     * `measuredWidgetFacts` re-reads each one from the pinned binary on every
     * build, and `assertMeasuredRefusalsAreMeasurable` throws if a declared
     * field stops being a drop-down or stops being read-only, so the sentence
     * cannot outlive the widget it describes.
     */
    measuredRefusals: {
      "CC-6-11": {
        TYPEOFCOURTDROPDOWN: { holds: ["matter.court"], expect: "choice_dropdown" },
        DROPDOWNCOUNTY2: { holds: ["matter.county"], expect: "choice_dropdown" },
        TYPEOFCOURTRESULTS: { holds: ["matter.court"], expect: "read_only_text" },
        fullcountystatementRIGHT: { holds: ["matter.county"], expect: "read_only_text" },
        "enter the type of court": { holds: ["matter.court"], expect: "read_only_text" },
        "enter the county": { holds: ["matter.county"], expect: "read_only_text" }
      },
      "CC-6-11.2": {
        TYPEOFCOURTDROPDOWN: { holds: ["matter.court"], expect: "choice_dropdown" },
        DROPDOWNCOUNTY2: { holds: ["matter.county"], expect: "choice_dropdown" },
        TYPEOFCOURTRESULTS: { holds: ["matter.court"], expect: "read_only_text" },
        fullcountystatementRIGHT: { holds: ["matter.county"], expect: "read_only_text" },
        "enter the type of court": { holds: ["matter.court"], expect: "read_only_text" },
        "enter the county": { holds: ["matter.county"], expect: "read_only_text" }
      },
      "DC-1-15": {
        TYPEOFCOURTDROPDOWN: { holds: ["matter.court"], expect: "choice_dropdown" },
        DROPDOWNCOUNTY2: { holds: ["matter.county"], expect: "choice_dropdown" },
        TYPEOFCOURTRESULTS: { holds: ["matter.court"], expect: "read_only_text" },
        fullcountystatementRIGHT: { holds: ["matter.county"], expect: "read_only_text" }
      }
    },
    /*
     * FIX81. The Captain maintains `binding` inside this family's
     * product-wiring.json and this builder does not author it; a rebuild that
     * simply rewrote the file would delete a record nobody meant to delete.
     * Opt-in, per family, so no other family on this host changes behaviour.
     */
    carryProductBinding: true
  },
  "ne-setaside-noncustodial-set": {
    state: "ne",
    action: "STOP",
    outputVehicle: "custom-pleading",
    assignmentOwnedPath: "data/rcap-all50/overlays/census-v1/ne/ne-setaside-noncustodial-set--custom-pleading",
    routeKeys: ["obligation:track-pathway:NE:ne-setaside-noncustodial:set-aside-probation-fine-community-service"],
    selectionId: "ne-noncustodial-vehicle-redirect-stop",
    sourceIds: ["official-form:CC-6-11", "official-form:CC-6-11.2", "official-form:CC-6-11a", "official-form:DC-1-15"],
    stopCode: "ASSIGNMENT_VEHICLE_CONFLICT",
    stopSummary: "The composed-group assignment says custom_pleading, while the controlling NE legal-design evidence resolves this route to the same official CC-6-11 packet and expressly does not authorize a composed pleading.",
    requiredResolution: "Correct the shared assignment vehicle to official_pdf_fill, or provide an approved exact hybrid design. No custom pleading may be invented from the conflict."
  },
  "ne-trafficking-setaside-and-seal-set": {
    state: "ne",
    action: "STOP",
    outputVehicle: "official-pdf-fill",
    assignmentOwnedPath: "data/rcap-all50/overlays/census-v1/ne/ne-trafficking-setaside-and-seal-set--official-pdf-fill",
    routeKeys: [
      "obligation:unit:NE:ne-trafficking-setaside-and-seal:ne_trafficking_setaside_motion",
      "obligation:unit:NE:ne-trafficking-setaside-and-seal:ne_trafficking_seal_motion"
    ],
    selectionId: "ne-trafficking-source-identity-and-vehicle-stop",
    sourceIds: ["official-form:CC-6-12"],
    stopCode: "SOURCE_IDENTITY_AND_DUPLICATE_VEHICLE_CONFLICT",
    stopSummary: "The worklist assigns this one family twice with incompatible custom_pleading and official_pdf_fill vehicles, and the only held CC-6-12 identity is a two-page instructions PDF rather than either named motion.",
    requiredResolution: "Bind the actual set-aside motion and sealing motion components by exact identity and resolve the duplicate vehicle rows before any packet is authored or filled."
  },
  "sd_arrest_expungement-set": {
    state: "sd",
    action: "BUILD",
    outputVehicle: "official-pdf-fill",
    assignmentOwnedPath: "data/rcap-all50/overlays/census-v1/sd/sd-arrest-expungement-set--official-pdf-fill",
    routeKeys: ["obligation:unit:SD:sd_arrest_expungement:sd-arrest-stage-2-ujs-motion-packet"],
    selectionId: "sd-stage-2-ujs-232-391-through-395",
    sourceIds: ["official-form:UJS-232", "official-form:UJS-391", "official-form:UJS-392", "official-form:UJS-393", "official-form:UJS-394", "official-form:UJS-395"],
    chargeLabel: "Arrest record sought to be expunged"
  },
  "ut_pet_acquittal-set": {
    state: "ut", action: "BUILD", outputVehicle: "official-pdf-fill",
    assignmentOwnedPath: "data/rcap-all50/overlays/census-v1/ut/ut-pet-acquittal-set--official-pdf-fill",
    routeKeys: utRoutes("ut_pet_acquittal"), selectionId: "ut-acquittal-bci-plus-court",
    sourceIds: [...UT_COMMON_SOURCES], chargeLabel: "Acquitted charge"
  },
  "ut_pet_conviction-set": {
    state: "ut", action: "BUILD", outputVehicle: "official-pdf-fill",
    assignmentOwnedPath: "data/rcap-all50/overlays/census-v1/ut/ut-pet-conviction-set--official-pdf-fill",
    routeKeys: utRoutes("ut_pet_conviction"), selectionId: "ut-conviction-bci-plus-court",
    sourceIds: [...UT_COMMON_SOURCES], chargeLabel: "Eligible conviction"
  },
  "ut_pet_dismissed_with_prejudice-set": {
    state: "ut", action: "BUILD", outputVehicle: "official-pdf-fill",
    assignmentOwnedPath: "data/rcap-all50/overlays/census-v1/ut/ut-pet-dismissed-with-prejudice-set--official-pdf-fill",
    routeKeys: utRoutes("ut_pet_dismissed_with_prejudice"), selectionId: "ut-dismissed-with-prejudice-bci-plus-court",
    sourceIds: [...UT_COMMON_SOURCES], chargeLabel: "Charge dismissed with prejudice"
  },
  "ut_pet_dismissed_without_prejudice-set": {
    state: "ut", action: "BUILD", outputVehicle: "official-pdf-fill",
    assignmentOwnedPath: "data/rcap-all50/overlays/census-v1/ut/ut-pet-dismissed-without-prejudice-set--official-pdf-fill",
    routeKeys: utRoutes("ut_pet_dismissed_without_prejudice"), selectionId: "ut-dismissed-without-prejudice-bci-plus-court",
    sourceIds: [...UT_COMMON_SOURCES], chargeLabel: "Charge dismissed without prejudice"
  },
  "ut_pet_limitations-set": {
    state: "ut", action: "BUILD", outputVehicle: "official-pdf-fill",
    assignmentOwnedPath: "data/rcap-all50/overlays/census-v1/ut/ut-pet-limitations-set--official-pdf-fill",
    routeKeys: utRoutes("ut_pet_limitations"), selectionId: "ut-limitations-bci-plus-court",
    sourceIds: [...UT_COMMON_SOURCES], chargeLabel: "Charge ended by limitations period"
  },
  "ut_pet_no_charges-set": {
    state: "ut", action: "BUILD", outputVehicle: "official-pdf-fill",
    assignmentOwnedPath: "data/rcap-all50/overlays/census-v1/ut/ut-pet-no-charges-set--official-pdf-fill",
    routeKeys: utRoutes("ut_pet_no_charges"), selectionId: "ut-no-charges-bci-plus-court",
    sourceIds: [...UT_COMMON_SOURCES], chargeLabel: "Arrest with no charges filed"
  },
  "ut_pet_traffic-set": {
    state: "ut", action: "BUILD", outputVehicle: "official-pdf-fill",
    assignmentOwnedPath: "data/rcap-all50/overlays/census-v1/ut/ut-pet-traffic-set--official-pdf-fill",
    routeKeys: ["obligation:track-pathway:UT:ut_pet_traffic:path-i-traffic-offense-expungement-or-deletion"],
    selectionId: "ut-traffic-direct-court-no-bci",
    sourceIds: ["official-form:1002EX", "official-form:1022EX", "official-form:1044XX", "official-form:1146XX", "official-form:1148XX"],
    chargeLabel: "Eligible traffic conviction"
  },
  "wv_conv_multiple_misdemeanors-set": {
    state: "wv", action: "BUILD", outputVehicle: "official-pdf-fill",
    assignmentOwnedPath: "data/rcap-all50/overlays/census-v1/wv/wv-conv-multiple-misdemeanors-set--official-pdf-fill",
    routeKeys: ["obligation:track-pathway:WV:wv_conv_multiple_misdemeanors:eligible-conviction-expungement-under-w-va-code-61-11-26"],
    selectionId: "wv-sca-c906-multiple-misdemeanors",
    sourceIds: ["official-form:SCA-C906"], chargeCount: 3,
    chargeLabel: "Multiple eligible misdemeanor convictions"
  },
  "wv_conv_single_misdemeanor-set": {
    state: "wv", action: "BUILD", outputVehicle: "official-pdf-fill",
    assignmentOwnedPath: "data/rcap-all50/overlays/census-v1/wv/wv-conv-single-misdemeanor-set--official-pdf-fill",
    routeKeys: ["obligation:track-pathway:WV:wv_conv_single_misdemeanor:eligible-conviction-expungement-under-w-va-code-61-11-26"],
    selectionId: "wv-sca-c906-single-misdemeanor",
    /*
     * FIX-C/FIX03, COMPONENT_SET.
     *
     * This family used to bind SCA-C900 as well
     * (source-sha256:89ff7d2d911406465bd39da947737a3ee262edbcbc98db9a3cedda952598864e),
     * and the delivered nine-page packet carried all five of its pages: page 5
     * an obsolete instruction sheet, pages 6 to 9 a SECOND complete petition,
     * verification and certificate. The committed packet-set manifest for
     * wv_conv_single_misdemeanor-set declares five components and every one is
     * SCA-C906 or process guidance; it declares no SCA-C900. The second
     * petition also contradicted this route -- a petitioner aged 18 to 26 with
     * no prior or subsequent convictions, the 2009 statute, and a TEN-day reply
     * window, where controlling decision NATIONAL-2026-08-28-C-WV-02 holds the
     * reply period is THIRTY days under subsection (g)(3), "not the ten days
     * the SCA-C900 instruction sheet prints".
     *
     * The binding is removed rather than the delivery filtered, so the census,
     * the source receipt, the field map and the packet all say the same thing.
     * Changed in THIS FAMILY'S OWN ENTRY only; no other family on this host
     * reads it and no other family's bytes move.
     */
    sourceIds: ["official-form:SCA-C906"],
    chargeCount: 1, chargeLabel: "Single eligible misdemeanor conviction"
  }
});

const DOCUMENT_POLICIES = Object.freeze({
  "CC-6-11": { mode: "participant" },
  "CC-6-11.2": { mode: "caption_only" },
  "CC-6-11A": { mode: "no_fill", reason: "official instructions, not a participant-completed filing" },
  "DC-1-15": { mode: "participant" },
  "UJS-232": { mode: "participant" },
  "UJS-391": { mode: "participant" },
  "UJS-392": { mode: "no_fill", reason: "waiver and service-act companion; left for post-event completion" },
  "UJS-393": { mode: "no_fill", reason: "notice-of-hearing companion containing court/process facts not held by the platform" },
  "UJS-394": { mode: "caption_only" },
  "UJS-395": { mode: "no_fill", reason: "notice-of-entry/service companion; the triggering acts have not occurred" },
  "1000EX": { mode: "participant" },
  "1002EX": { mode: "participant" },
  "1020EX": { mode: "caption_only" },
  "1022EX": { mode: "caption_only" },
  "1044XX": { mode: "participant" },
  "UT-BCI-EXP-APPLICATION": { mode: "participant" },
  "UT-BCI-THIRD-PARTY-RELEASE": { mode: "no_fill", reason: "optional third-party authorization is a participant election and signature instrument" },
  "1146XX": { mode: "no_fill", reason: "acceptance of service belongs to the recipient after service" },
  "1148XX": { mode: "no_fill", reason: "consent and waiver belongs to the responding party" },
  "1149XX": { mode: "no_fill", reason: "victim or prosecutor statement belongs to that actor" },
  "1169XX": { mode: "no_fill", reason: "reply contains participant-authored legal assertions not held as facts" },
  "SCA-C906": { mode: "participant" },
  "SCA-C900": { mode: "no_fill", reason: "official instructions/supporting reference, not the selected petition" }
});

const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const round = (n) => Number(Number(n).toFixed(2));
const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(rootDir, rel), "utf8"));
const writeJson = (rel, value) => {
  const abs = path.join(rootDir, rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, `${JSON.stringify(value, null, 2)}\n`);
};
const normalized = (value) => String(value ?? "").toLowerCase().replace(/\s+/g, " ").trim();

function assertFailClosedEvidence(value, context) {
  const requiredValues = new Map([
    ["generationAllowed", false],
    ["runtimeSelectable", false],
    ["commercialRoutesOpened", 0],
    ["createsFulfillmentRecord", false],
    ["opensCommercialRoute", false],
    ["grantedBy", null],
  ]);
  const visit = (current, location) => {
    if (Array.isArray(current)) {
      current.forEach((item, index) => visit(item, `${location}[${index}]`));
      return;
    }
    if (!current || typeof current !== "object") return;
    for (const [key, item] of Object.entries(current)) {
      if (requiredValues.has(key) && item !== requiredValues.get(key)) {
        throw new Error(`${context}: fail-closed evidence violation at ${location}.${key}; expected ${JSON.stringify(requiredValues.get(key))}, received ${JSON.stringify(item)}`);
      }
      visit(item, `${location}.${key}`);
    }
  };
  visit(value, "$record");
}

function assertStopEvidenceMatches(actual, expected, familyId) {
  try {
    assert.deepEqual(actual, expected);
  } catch (cause) {
    throw new Error(`${familyId}: deterministic STOP evidence drift`, { cause });
  }
}

function assertFreshRasterEvidence(storedPages, freshPages, context) {
  const comparable = (page) => ({
    page: page.page,
    sha256: page.sha256,
    byteLength: page.byteLength,
    widthPx: page.widthPx,
    heightPx: page.heightPx,
    looksBlank: page.looksBlank,
    croppedToPage: page.croppedToPage,
  });
  try {
    assert.deepEqual(freshPages.map(comparable), storedPages.map(comparable));
  } catch (cause) {
    throw new Error(`${context}: fresh raster evidence drift`, { cause });
  }
}

export function classifyFamilyAction(familyId) {
  const config = FAMILY_CONFIGS[familyId];
  if (!config) return "UNKNOWN";
  return config.action;
}

function outputRoot(familyId, config = FAMILY_CONFIGS[familyId]) {
  assert.equal(config.assignmentOwnedPath.includes(`/${config.state}/`), true,
    `${familyId}: assignment-owned path must remain in its jurisdiction`);
  return config.assignmentOwnedPath;
}

function corpusRoot() {
  const configured = process.env.MASTER_LIBRARY_SOURCE_DIR;
  if (!configured) throw new Error("MASTER_LIBRARY_SOURCE_DIR is required and must point to Expungement_AI_RCAP_Master_Library_Edition_1");
  const abs = path.resolve(configured);
  if (!fs.existsSync(abs)) throw new Error(`MASTER_LIBRARY_SOURCE_DIR does not exist: ${abs}`);
  return abs;
}

function fieldType(field) {
  if (field instanceof PDFTextField) return "text";
  if (field instanceof PDFCheckBox) return "checkbox";
  if (field instanceof PDFRadioGroup) return "radio";
  if (field instanceof PDFDropdown) return "dropdown";
  if (field instanceof PDFOptionList) return "optionlist";
  return String(field?.constructor?.name ?? "other").toLowerCase();
}

function policyFor(source) {
  const policy = DOCUMENT_POLICIES[source.formNumber];
  if (!policy) throw new Error(`${source.formNumber}: no first-hand document-role policy exists`);
  return { ...policy, captionOnly: policy.mode === "caption_only", documentAcceptsFill: policy.mode !== "no_fill" };
}

function collectObjectsWhere(value, predicate, rows = []) {
  if (Array.isArray(value)) value.forEach((item) => collectObjectsWhere(item, predicate, rows));
  else if (value && typeof value === "object") {
    if (predicate(value)) rows.push(value);
    Object.values(value).forEach((item) => collectObjectsWhere(item, predicate, rows));
  }
  return rows;
}

function worklistRowsFor(familyId) {
  return collectObjectsWhere(readJson(WORKLIST), (value) =>
    value.worklistGroupId === familyId && Boolean(value.implementationStrategy));
}

function custodyRowsFor(familyId) {
  return collectObjectsWhere(readJson(CUSTODY), (value) =>
    value.worklistGroupId === familyId && Array.isArray(value.documentSources));
}

function resolveSources(familyId, config) {
  const custodyRows = custodyRowsFor(familyId);
  if (custodyRows.length === 0) throw new Error(`${familyId}: no source-custody row`);
  const relationships = custodyRows.flatMap((row) => row.documentSources ?? []);
  const index = readJson(CORPUS_INDEX);
  const root = corpusRoot();
  const selected = [];
  for (const sourceId of config.sourceIds) {
    const relation = relationships.find((item) => item.sourceId === sourceId);
    if (!relation) throw new Error(`${familyId}: selected source is absent from custody: ${sourceId}`);
    if (relation.resolved !== true || !relation.heldAs) throw new Error(`${familyId}: selected source is unresolved: ${sourceId}`);
    const held = relation.heldAs;
    const indexEntry = (index.entries ?? []).find((entry) => entry.path === held.path);
    if (!indexEntry) throw new Error(`${familyId}/${sourceId}: SOURCE_ABSENT_FROM_INDEX at ${held.path}`);
    if (indexEntry.sha256 !== held.sha256) throw new Error(`${familyId}/${sourceId}: SOURCE_MISMATCH_AGAINST_INDEX`);
    const abs = path.join(root, held.path);
    if (!fs.existsSync(abs)) throw new Error(`${familyId}/${sourceId}: SOURCE_ABSENT_FROM_DISK at ${abs}`);
    const bytes = fs.readFileSync(abs);
    const digest = sha256(bytes);
    if (digest !== held.sha256) throw new Error(`${familyId}/${sourceId}: SOURCE_MISMATCH_ON_DISK expected ${held.sha256}, read ${digest}`);
    if (bytes.length !== indexEntry.byteLength) throw new Error(`${familyId}/${sourceId}: SOURCE_BYTE_LENGTH_DISAGREES_WITH_INDEX`);
    selected.push({ sourceId, relationship: relation, ...held, indexEntry, bytes });
  }
  const unique = [];
  for (const source of selected) {
    const existing = unique.find((item) => item.sha256 === source.sha256);
    if (existing) existing.relationshipIds.push(source.sourceId);
    else unique.push({ ...source, relationshipIds: [source.sourceId] });
  }
  return { custodyRows, relationships, sources: unique };
}

function sourceReceipt(familyId, config, resolved) {
  return {
    schemaVersion: "rcap-family-source-receipt/v1",
    familyId,
    worklistGroupId: familyId,
    jurisdiction: config.state.toUpperCase(),
    implementationStrategy: config.outputVehicle.replaceAll("-", "_"),
    custodyClass: "SOURCE_ALREADY_HELD",
    acquisitionCommissioned: false,
    corpusRootFromEnvironment: "MASTER_LIBRARY_SOURCE_DIR",
    bindingMethod: "exact path + custody SHA-256 + corpus-index SHA-256 + on-disk SHA-256 + byte length",
    routeSelectionId: config.selectionId,
    documents: resolved.sources.map((source) => ({
      sourceIds: source.relationshipIds,
      formNumber: source.formNumber,
      revision: source.revision ?? null,
      pathInArchive: source.path,
      sha256: source.sha256,
      byteLength: source.bytes.length,
      pageCount: source.indexEntry.pageCount,
      acroFieldCount: source.indexEntry.acroFieldCount,
      structuralClassObserved: source.indexEntry.structuralClassObserved,
      exactHashVerified: true,
      corpusIndexAgrees: true
    })),
    generationAllowed: false,
    runtimeSelectable: false,
    commercialRoutesOpened: 0
  };
}

function decodedContent(pdf, page) {
  let output = "";
  const contents = page.node.normalizedEntries?.().Contents;
  const refs = contents?.asArray?.() ?? (contents ? [contents] : []);
  for (const ref of refs) {
    const stream = pdf.context.lookup(ref);
    if (!(stream instanceof PDFRawStream)) continue;
    try { output += Buffer.from(decodePDFRawStream(stream).decode()).toString("latin1"); } catch { /* recorded as no decoded geometry */ }
  }
  return output;
}

function pathRectangles(paths = []) {
  const byPath = new Map();
  for (const segment of paths) {
    if (!/^(S|s|f|F|f\*|B|B\*|b|b\*)$/.test(String(segment.paintedBy ?? ""))) continue;
    const key = `${segment.stream}#${segment.pathIndex}`;
    if (!byPath.has(key)) byPath.set(key, []);
    byPath.get(key).push(segment);
  }
  const rectangles = [];
  for (const [pathKey, segments] of byPath) {
    const x0 = Math.min(...segments.map((segment) => segment.x));
    const y0 = Math.min(...segments.map((segment) => segment.y));
    const x1 = Math.max(...segments.map((segment) => segment.x + segment.width));
    const y1 = Math.max(...segments.map((segment) => segment.y + segment.height));
    const width = x1 - x0;
    const height = y1 - y0;
    if (!(width >= 4 && height >= 4)) continue;
    rectangles.push({
      pathKey,
      x0: round(x0), y0: round(y0), x1: round(x1), y1: round(y1),
      width: round(width), height: round(height),
      squareness: round(Math.min(width, height) / Math.max(width, height)),
      construction: segments.some((segment) => segment.operator === "re") ? "re" : "closed_path",
      paintedBy: segments[0].paintedBy,
      sourceStream: segments[0].stream,
    });
  }
  return rectangles;
}

function controlsOverlap(a, b) {
  const overlapX = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0);
  const overlapY = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0);
  return overlapX > Math.min(a.width, b.width) * 0.55
    && overlapY > Math.min(a.height, b.height) * 0.55;
}

function nearestControlLabel(lines, rectangle) {
  const centerY = (rectangle.y0 + rectangle.y1) / 2;
  const nearest = [...lines]
    .filter((line) => Math.abs(Number(line.y) - centerY) <= 22)
    .sort((a, b) => Math.abs(Number(a.y) - centerY) - Math.abs(Number(b.y) - centerY))[0];
  return nearest ? normalizeHarvestedText(nearest.text) : null;
}

function selectionControlRecord({ page, construction, rectangle, label, sourceRasterSha256 = null }) {
  return {
    selectionId: `p${page}-${construction}-x${round(rectangle.x0)}-y${round(rectangle.y0)}`,
    kind: "selection_control",
    page,
    construction,
    measured: {
      x0: round(rectangle.x0), y0: round(rectangle.y0),
      x1: round(rectangle.x1), y1: round(rectangle.y1),
      width: round(rectangle.x1 - rectangle.x0), height: round(rectangle.y1 - rectangle.y0),
    },
    label: label || null,
    geometryBasis: sourceRasterSha256
      ? `first-hand measurement from the pinned source raster at SHA-256 ${sourceRasterSha256}`
      : "CTM-tracked source glyph or painted-path geometry",
    disposition: "explicit_refusal",
    reason: "selection_requires_participant_or_authorized_official_choice",
  };
}

function selectionControlsOfPage({ page, lines, content, paths = [] }) {
  const controls = [];
  const singleGlyphs = new Set(["\u0002", "☐", "□", "❑", "\uf06f"]);
  for (const line of lines) {
    const chars = [...(line.chars ?? [])].sort((a, b) => a.x - b.x);
    for (let index = 0; index < chars.length; index += 1) {
      if (singleGlyphs.has(chars[index].c)) {
        const height = Math.max(6, Number(line.size ?? 10));
        const width = Math.max(4, Number(chars[index].w ?? height));
        const rectangle = {
          x0: chars[index].x,
          y0: Number(line.y) - height * 0.25,
          x1: chars[index].x + width,
          y1: Number(line.y) + height * 0.75,
        };
        controls.push(selectionControlRecord({
          page,
          construction: `printed_glyph_u${chars[index].c.charCodeAt(0).toString(16).padStart(4, "0")}`,
          rectangle,
          label: normalizeHarvestedText(line.text.replace(chars[index].c, "")),
        }));
        continue;
      }
      if (chars[index].c !== "[") continue;
      const closing = chars.slice(index + 1, index + 6)
        .findIndex((character) => character.c === "]");
      if (closing < 0) continue;
      const closeIndex = index + 1 + closing;
      const middle = chars.slice(index + 1, closeIndex).map((character) => character.c).join("");
      if (middle.trim() !== "") continue;
      const x0 = chars[index].x;
      const x1 = chars[closeIndex].x + (chars[closeIndex].w ?? 0);
      if (x1 - x0 < 4 || x1 - x0 > 28) continue;
      const height = Math.max(6, Number(line.size ?? 10));
      const y0 = Number(line.y) - height * 0.25;
      controls.push(selectionControlRecord({
        page, construction: "printed_bracket_pair",
        rectangle: { x0, y0, x1, y1: y0 + height },
        label: normalizeHarvestedText(line.text),
      }));
      index = closeIndex;
    }
  }

  const vectorCandidates = [
    ...checkboxCandidates(content ?? "", { minSize: 5, maxSize: 35, minSquareness: 0.58 })
      .map((rectangle) => ({ ...rectangle, source: "decoded_page_stream" })),
    ...pathRectangles(paths)
      .filter((rectangle) => rectangle.width <= 35 && rectangle.height <= 35 && rectangle.squareness >= 0.58)
      .map((rectangle) => ({ ...rectangle, source: "recursive_ctm_path" })),
  ];
  for (const rectangle of vectorCandidates) {
    const duplicate = controls.some((control) => controlsOverlap(control.measured, rectangle));
    if (duplicate) continue;
    controls.push(selectionControlRecord({
      page,
      construction: `${rectangle.source}_${rectangle.construction === "re" ? "stroked_re_box" : "stroked_path_box"}`,
      rectangle,
      label: nearestControlLabel(lines, rectangle),
    }));
  }
  return controls.sort((a, b) => a.page - b.page || b.measured.y0 - a.measured.y0 || a.measured.x0 - b.measured.x0);
}

function boxedEntryControlsOfPage({ page, lines, paths = [] }) {
  return pathRectangles(paths)
    .filter((rectangle) => rectangle.width <= 350 && rectangle.height <= 35
      && (rectangle.width > 35 || rectangle.squareness < 0.58))
    .map((rectangle) => ({
      ...selectionControlRecord({
        page, construction: `recursive_ctm_${rectangle.construction}_boxed_entry`,
        rectangle, label: nearestControlLabel(lines, rectangle),
      }),
      kind: "boxed_entry_control",
      reason: "boxed_entry_requires_participant_or_authorized_official_completion",
    }));
}

const UT_BCI_APPLICATION_SHA256 = "b4eacb2b9f78c9d69da76ee6528d12c58d0d896a7d2869aeb7ba77de24a91b13";

function sourceSpecificFlatControls(source, page, pageWidth, pageHeight) {
  if (source.formNumber !== "UT-BCI-EXP-APPLICATION" || source.sha256 !== UT_BCI_APPLICATION_SHA256 || page !== 2) {
    return [];
  }
  assert.equal(round(pageWidth), 612, "UT BCI page 2 width drifted from the pinned source measurement");
  assert.equal(round(pageHeight), 792, "UT BCI page 2 height drifted from the pinned source measurement");
  const fromRaster = (x, y, width, height) => ({
    x0: round(x * 72 / 100),
    y0: round(pageHeight - (y + height) * 72 / 100),
    x1: round((x + width) * 72 / 100),
    y1: round(pageHeight - y * 72 / 100),
  });
  const choices = [
    ["payment_check_money_order_or_cashiers_check", 56, 637, 8, 15, "Check, money order, or cashier's check"],
    ["payment_credit_card", 56, 666, 12, 15, "Credit card"],
    ["payment_visa", 382, 666, 12, 15, "Visa"],
    ["payment_mastercard", 426, 666, 12, 15, "MasterCard"],
    ["payment_discover", 518, 666, 12, 15, "Discover"],
    ["payment_amex", 603, 666, 12, 15, "AMEX"],
  ].map(([id, x, y, width, height, label]) => ({
    ...selectionControlRecord({
      page,
      construction: `pinned_source_raster_${id}`,
      rectangle: fromRaster(x, y, width, height),
      label,
      sourceRasterSha256: source.sha256,
    }),
    selectionId: `p2-pinned-raster-${id}`,
  }));
  const cellGroups = [
    ["card_number", [65, 91, 116, 142, 175, 201, 226, 252, 285, 311, 337, 363, 396, 421, 447, 473]],
    ["card_control", [555, 579, 603, 627]],
    ["card_expiration", [685, 710, 735, 760]],
  ];
  const cells = cellGroups.flatMap(([group, xs]) => xs.map((x, index) => ({
    ...selectionControlRecord({
      page,
      construction: `pinned_source_raster_${group}_cell`,
      rectangle: fromRaster(x, 707, 21, 26),
      label: `${group.replaceAll("_", " ")} segmented entry cell ${index + 1}`,
      sourceRasterSha256: source.sha256,
    }),
    selectionId: `p2-pinned-raster-${group}-cell-${index + 1}`,
    kind: "boxed_entry_control",
    reason: "payment_or_sensitive_boxed_entry_requires_manual_participant_completion",
  })));
  return [...choices, ...cells];
}

function addedGlyphsInSelectionControls(addedGlyphs, controls) {
  return controls.flatMap((control) => {
    const box = control.measured;
    const glyphs = addedGlyphs.filter((glyph) => String(glyph.c ?? "").trim() !== ""
      && glyph.page === control.page
      && glyph.x + glyph.w >= box.x0 - 2 && glyph.x <= box.x1 + 2
      && glyph.y >= box.y0 - 3 && glyph.y <= box.y1 + 3);
    return glyphs.length ? [{ selectionId: control.selectionId, page: control.page, label: control.label, glyphs }] : [];
  });
}

function comparablePath(segment, page) {
  return {
    page,
    operator: segment.operator,
    paintedBy: segment.paintedBy,
    x: round(segment.x), y: round(segment.y),
    width: round(segment.width), height: round(segment.height),
  };
}

async function paintedPathsOf(bytes) {
  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  return pdf.getPages().flatMap((page, index) => extractPageGeometry(page).paths
    .filter((segment) => /^(S|s|f|F|f\*|B|B\*|b|b\*)$/.test(String(segment.paintedBy ?? "")))
    .map((segment) => comparablePath(segment, index + 1)));
}

function pathFingerprint(pathRow) {
  return [pathRow.page, pathRow.operator, pathRow.paintedBy,
    pathRow.x, pathRow.y, pathRow.width, pathRow.height].join("|");
}

async function addedPaintedPaths(sourceBytes, artifactBytes) {
  const source = await paintedPathsOf(sourceBytes);
  const final = await paintedPathsOf(artifactBytes);
  const counts = new Map();
  for (const row of source) {
    const key = pathFingerprint(row);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const added = [];
  for (const row of final) {
    const key = pathFingerprint(row);
    const remaining = counts.get(key) ?? 0;
    if (remaining > 0) counts.set(key, remaining - 1);
    else added.push(row);
  }
  return added;
}

function addedPathsInSelectionControls(addedPaths, controls) {
  return controls.flatMap((control) => {
    const box = control.measured;
    const inset = Math.max(0.5, Math.min(2, box.width * 0.18, box.height * 0.18));
    const interior = { x0: box.x0 + inset, y0: box.y0 + inset, x1: box.x1 - inset, y1: box.y1 - inset };
    const paths = addedPaths.filter((row) => {
      if (row.page !== control.page) return false;
      const x1 = row.x + row.width;
      const y1 = row.y + row.height;
      const centerX = row.x + row.width / 2;
      const centerY = row.y + row.height / 2;
      const centerInside = centerX >= interior.x0 && centerX <= interior.x1
        && centerY >= interior.y0 && centerY <= interior.y1;
      if (!centerInside) return false;
      // Flattening a blank AcroForm control materializes its appearance border.
      // Those borders may be smaller than /Rect (or be four separate edge
      // segments), so overlap alone is not evidence of a selection.  A mark
      // must put a non-outline path through the measured control's center.
      const strokeOnlyRectangle = row.operator === "re"
        && /^(?:S|s)$/.test(String(row.paintedBy ?? ""));
      const horizontalAppearanceEdge = row.width >= box.width * 0.55 && row.height <= 1
        && (Math.abs(row.y - box.y0) <= box.height * 0.25
          || Math.abs(row.y - box.y1) <= box.height * 0.25);
      const verticalAppearanceEdge = row.height >= box.height * 0.55 && row.width <= 1
        && (Math.abs(row.x - box.x0) <= box.width * 0.25
          || Math.abs(row.x - box.x1) <= box.width * 0.25);
      return !strokeOnlyRectangle && !horizontalAppearanceEdge && !verticalAppearanceEdge;
    });
    return paths.length ? [{ selectionId: control.selectionId, page: control.page,
      label: control.label, kind: control.kind, paths }] : [];
  });
}

async function censusAcro(source) {
  const pdf = await PDFDocument.load(source.bytes, { ignoreEncryption: true, updateMetadata: false });
  const pages = pdf.getPages();
  const form = pdf.getForm();
  const pageByWidgetDictionary = new Map();
  pages.forEach((page, index) => {
    for (const annotationRef of page.node.Annots()?.asArray?.() ?? []) {
      const annotation = pdf.context.lookup(annotationRef);
      if (annotation) pageByWidgetDictionary.set(annotation, index + 1);
    }
  });
  const linesByPage = pages.map((page) => groupIntoLines(extractTextItems(page)));
  const documentTextLines = linesByPage.flat().map((line) => normalizeHarvestedText(line.text));
  const widgetsByPage = new Map();
  const rawFields = form.getFields().map((field) => {
    const name = field.getName();
    const type = fieldType(field);
    const widgets = field.acroField.getWidgets().map((widget, widgetIndex) => {
      const rect = widget.getRectangle();
      const pageRef = widget.P?.();
      let page = pageByWidgetDictionary.get(widget.dict) ?? null;
      if (pageRef) {
        pages.forEach((candidate, index) => {
          if (candidate.ref === pageRef || candidate.ref.toString() === pageRef.toString()) page = index + 1;
        });
      }
      assert.ok(Number.isInteger(page), `${source.formNumber}/${name}: widget ${widgetIndex} is not attached to a measured page`);
      const measured = { x: round(rect.x), y: round(rect.y), width: round(rect.width), height: round(rect.height) };
      if (!widgetsByPage.has(page)) widgetsByPage.set(page, []);
      widgetsByPage.get(page).push({ name, rect: measured });
      return { page, rect: measured, rectBasis: "acroform_widget_rect_read_first_hand_from_pinned_binary" };
    });
    let maxLength = null;
    let multiline = false;
    let sourceSelection = null;
    try { maxLength = field instanceof PDFTextField ? field.getMaxLength() ?? null : null; } catch { maxLength = null; }
    try { multiline = field instanceof PDFTextField ? field.isMultiline() : false; } catch { multiline = false; }
    try {
      if (field instanceof PDFCheckBox) sourceSelection = field.isChecked();
      else if (field instanceof PDFRadioGroup || field instanceof PDFDropdown || field instanceof PDFOptionList) {
        const selected = field.getSelected();
        sourceSelection = Array.isArray(selected) ? selected : (selected == null ? [] : [selected]);
      }
    } catch { sourceSelection = null; }
    return { name, type, widgets, maxLength, multiline, sourceSelection };
  });
  const contexts = new Map();
  pages.forEach((page, index) => {
    const widgets = widgetsByPage.get(index + 1) ?? [];
    for (const context of captureWidgetContext(page, widgets, { precomputedLines: linesByPage[index], isFirstPage: index === 0 })) {
      if (!contexts.has(context.name)) contexts.set(context.name, context);
    }
  });
  const strokedByPage = pages.map((page, index) => {
    const content = decodedContent(pdf, page);
    const rectangles = content ? strokedRectangles(content) : [];
    return { page: index + 1, count: rectangles.length, rectangles };
  });
  const fields = rawFields.map((field) => {
    const context = contexts.get(field.name) ?? {};
    const subject = context.effectiveLabel ?? field.name;
    return {
      ...field,
      effectiveLabel: context.effectiveLabel ?? null,
      labelBasis: context.labelBasis ?? null,
      regionHeading: context.regionHeading ?? null,
      regionBasis: context.regionBasis ?? null,
      protectCategory: protectCategoryOf(subject) ?? protectCategoryOf(field.name) ?? null,
      captionDescribesChargeValue: captionDescribesChargeValue(subject),
      descriptorsByName: descriptorsMatching(field.name).map((descriptor) => descriptor.factId),
      descriptorsByLabel: context.effectiveLabel ? descriptorsMatching(context.effectiveLabel).map((descriptor) => descriptor.factId) : []
    };
  });
  if (fields.length !== source.indexEntry.acroFieldCount) {
    throw new Error(`${source.formNumber}: first-hand AcroForm count ${fields.length} does not equal indexed count ${source.indexEntry.acroFieldCount}`);
  }
  return {
    structuralClass: "acroform",
    fields,
    selectionControls: fields
      .filter((field) => ["checkbox", "radio", "dropdown", "optionlist"].includes(field.type))
      .map((field) => ({
        selectionId: field.name,
        kind: "selection_control",
        field: field.name,
        type: field.type,
        widgets: field.widgets,
        sourceSelection: field.sourceSelection,
        disposition: "explicit_refusal",
        reason: "selection_requires_participant_or_authorized_official_choice"
      })),
    pageGeometry: pages.map((page, index) => ({ page: index + 1, width: round(page.getSize().width), height: round(page.getSize().height) })),
    documentTextLines,
    strokedByPage
  };
}

function underscoreRuns(line) {
  const runs = [];
  let current = null;
  for (const character of line.chars ?? []) {
    if (character.c === "_") {
      if (!current) current = { x0: character.x, x1: character.x + character.w, glyphs: 1 };
      else { current.x1 = character.x + character.w; current.glyphs += 1; }
    } else if (current) { runs.push(current); current = null; }
  }
  if (current) runs.push(current);
  return runs;
}

function inkWidth(line, x0, x1) {
  let width = 0;
  for (const character of line.chars ?? []) {
    if (String(character.c).trim() === "") continue;
    width += Math.max(0, Math.min(character.x + character.w, x1) - Math.max(character.x, x0));
  }
  return width;
}

function captionText(value) {
  return normalizeHarvestedText(String(value ?? ""))
    .replace(/[_.…]{3,}/g, " ")
    .replace(/\s+/g, " ")
    .replace(/^.*?[;|]\s*/, "")
    .replace(/[:.,;\s]+$/, "")
    .trim();
}

function captionForBlank(blank, lines, peerBlanks) {
  const sameLine = lines.find((line) => Math.abs(line.y - blank.baselineY) <= 2.5) ?? null;
  if (sameLine) {
    const previous = peerBlanks.filter((candidate) => candidate.x1 <= blank.x0 + 0.5)
      .reduce((max, candidate) => Math.max(max, candidate.x1), -Infinity);
    const next = peerBlanks.filter((candidate) => candidate.x0 >= blank.x1 - 0.5)
      .reduce((min, candidate) => Math.min(min, candidate.x0), Infinity);
    const slice = (x0, x1) => (sameLine.chars ?? [])
      .filter((character) => character.x >= x0 - 0.5 && character.x + character.w <= x1 + 0.5)
      .map((character) => character.c).join("");
    const before = captionText(slice(Number.isFinite(previous) ? previous : -Infinity, blank.x0));
    if (before) return { caption: before.slice(-80), basis: "same_line_before_measured_blank" };
    const after = captionText(slice(blank.x1, Number.isFinite(next) ? next : Infinity));
    if (after) return { caption: after.slice(0, 80), basis: "same_line_after_measured_blank" };
  }
  const nearby = lines
    .map((line) => {
      const chars = line.chars ?? [];
      if (!chars.length) return null;
      const x0 = Math.min(...chars.map((character) => character.x));
      const x1 = Math.max(...chars.map((character) => character.x + character.w));
      const overlap = Math.min(x1, blank.x1) - Math.max(x0, blank.x0);
      const distance = Math.abs(line.y - blank.baselineY);
      return overlap > 0 && distance > 2.5 && distance <= 28 ? { line, distance } : null;
    })
    .filter(Boolean)
    .sort((a, b) => a.distance - b.distance)[0] ?? null;
  return nearby
    ? { caption: captionText(nearby.line.text).slice(0, 80), basis: "nearest_overlapping_printed_line" }
    : { caption: "", basis: "no_adjacent_printed_caption" };
}

function regionForBlank(blank, regions, pageWidth) {
  const mid = (blank.x0 + blank.x1) / 2;
  const region = regions.find((candidate) => {
    const inBand = blank.baselineY <= candidate.yTop && blank.baselineY > candidate.yBottom;
    const fullWidth = candidate.xRight - candidate.xLeft >= pageWidth * 0.58;
    return inBand && (fullWidth || (mid >= candidate.xLeft - 8 && mid <= candidate.xRight + 8));
  });
  return region ?? null;
}

async function censusFlat(source) {
  const pdf = await PDFDocument.load(source.bytes, { ignoreEncryption: true, updateMetadata: false });
  const pages = pdf.getPages();
  let fields = 0;
  try { fields = pdf.getForm().getFields().length; } catch { fields = 0; }
  if (fields !== 0) throw new Error(`${source.formNumber}: indexed flat PDF now exposes ${fields} AcroForm fields`);
  const blanks = [];
  const selectionControls = [];
  const pageGeometry = [];
  const geometryEvidence = [];
  const documentTextLines = [];
  for (const [index, page] of pages.entries()) {
    const pageNumber = index + 1;
    const { width, height } = page.getSize();
    pageGeometry.push({ page: pageNumber, width: round(width), height: round(height) });
    const geometry = extractPageGeometry(page);
    const lines = groupIntoLines(geometry.text);
    documentTextLines.push(...lines.map((line) => normalizeHarvestedText(line.text)));
    const regions = pageRegions(page, lines, { isFirstPage: index === 0 });
    const ruleGeometry = rulesOfPage(page, { maxThickness: 3, minLength: 24, minDividerLength: 18 });
    const content = decodedContent(pdf, page);
    const stroked = content ? strokedRectangles(content) : [];
    const pageControls = [
      ...selectionControlsOfPage({ page: pageNumber, lines, content, paths: geometry.paths }),
      ...boxedEntryControlsOfPage({ page: pageNumber, lines, paths: geometry.paths }),
      ...sourceSpecificFlatControls(source, pageNumber, width, height),
    ];
    for (const control of pageControls) {
      const duplicate = selectionControls.some((prior) => prior.page === control.page
        && prior.kind === control.kind && controlsOverlap(prior.measured, control.measured));
      if (!duplicate) selectionControls.push(control);
    }
    geometryEvidence.push({
      page: pageNumber,
      geometrySource: "recursive_content_and_Form_XObject_streams_with_CTM_tracking",
      horizontalRules: ruleGeometry.horizontal,
      verticalDividers: ruleGeometry.vertical,
      strokedRectangles: stroked,
      recursivePaintedRectangles: pathRectangles(geometry.paths),
    });
    const raw = [];
    for (const line of lines) {
      for (const run of underscoreRuns(line)) {
        if (run.x1 - run.x0 < 24) continue;
        raw.push({ construction: "underscore_glyph_run", x0: round(run.x0), x1: round(run.x1), baselineY: round(line.y), glyphs: run.glyphs });
      }
    }
    for (const rule of ruleGeometry.horizontal) {
      const inkFraction = rule.width > 0
        ? Math.max(...lines.map((line) => Math.abs(line.y - rule.y) <= 13 ? inkWidth(line, rule.x, rule.endX) / rule.width : 0), 0)
        : 0;
      if (inkFraction >= 0.45) continue;
      const duplicate = raw.some((candidate) => Math.abs(candidate.baselineY - rule.y) <= 2
        && Math.min(candidate.x1, rule.endX) - Math.max(candidate.x0, rule.x) >= Math.min(candidate.x1 - candidate.x0, rule.width) * 0.75);
      if (duplicate) continue;
      raw.push({ construction: "content_stream_rule", x0: rule.x, x1: rule.endX, baselineY: rule.y, pathKey: rule.pathKey });
    }
    for (const candidate of raw) {
      const peers = raw.filter((other) => Math.abs(other.baselineY - candidate.baselineY) <= 2.5);
      const caption = captionForBlank(candidate, lines, peers);
      const region = regionForBlank(candidate, regions, width);
      const subject = caption.caption;
      blanks.push({
        blankId: `p${pageNumber}-y${candidate.baselineY.toFixed(2)}-x${candidate.x0.toFixed(2)}`,
        page: pageNumber,
        construction: candidate.construction,
        measured: {
          x0: candidate.x0, x1: candidate.x1, baselineY: candidate.baselineY,
          width: round(candidate.x1 - candidate.x0), glyphs: candidate.glyphs ?? null,
          pathKey: candidate.pathKey ?? null
        },
        geometryBasis: candidate.construction === "underscore_glyph_run"
          ? "glyph positions and font widths from CTM-tracked text operators"
          : "horizontal path geometry from shared CTM-tracked content-stream walker",
        caption: subject,
        captionBasis: caption.basis,
        regionHeading: region?.heading ?? null,
        regionIsDocumentTitle: region?.isDocumentTitle ?? false,
        protectCategory: protectCategoryOf(subject) ?? null,
        regionProtectCategory: region && !region.isDocumentTitle ? regionProtectCategoryOf(region.heading) : null,
        descriptorsByCaption: descriptorsMatching(subject).map((descriptor) => descriptor.factId),
        captionDescribesChargeValue: captionDescribesChargeValue(subject)
      });
    }
  }
  blanks.sort((a, b) => a.page - b.page || b.measured.baselineY - a.measured.baselineY || a.measured.x0 - b.measured.x0);
  const ids = blanks.map((blank) => blank.blankId);
  if (new Set(ids).size !== ids.length) throw new Error(`${source.formNumber}: duplicate measured flat blank id`);
  const selectionIds = selectionControls.map((control) => control.selectionId);
  if (new Set(selectionIds).size !== selectionIds.length) throw new Error(`${source.formNumber}: duplicate measured selection-control id`);
  return { structuralClass: "flat_pdf", blanks, selectionControls, pageGeometry, geometryEvidence, documentTextLines };
}

const UNSAFE_OWNER = /\b(signature|signed|sign here|certificate of service|proof of service|served|service date|mail(?:ed|ing)?|notar|jurat|judge|judicial officer|clerk|prosecut|district attorney|agency|law enforcement|victim|respondent|opposing party|court use|court only|order entered|granted|denied|hearing date|hearing time|attorney)\b/i;
const UNSAFE_DATE = /\b(date signed|signature date|date of signature|filing date|arrest date|offense date|conviction date|disposition date|cert(?:ificate)? date|hearing date)\b/i;
const FORBIDDEN_FACTS = new Set([
  "deterministic.filing_date",
  "matter.arrest_date",
  "matter.offense_date",
  "matter.conviction_date",
  "matter.disposition_date",
  "matter.court",
  "matter.citing_or_arresting_agency"
]);

function approvedFactLabel(factId, subject) {
  const text = normalized(subject);
  if (!text || text.length > 72 || text.split(/\s+/).length > 9) return false;
  const patterns = {
    "participant.full_legal_name": /^(full legal name|full name|printed name|name of (the )?(petitioner|applicant|defendant)|petitioner'?s name|applicant'?s name|defendant'?s name|your name|name)$/i,
    "participant.first_name": /^(first name|given name)$/i,
    "participant.middle_name": /^(middle name|middle initial)$/i,
    "participant.last_name": /^(last name|surname|family name)$/i,
    "participant.street_address": /^(street address|mailing address|home address|address|address line 1)$/i,
    "participant.city": /^city$/i,
    "participant.state": /^(state|state abbreviation)$/i,
    "participant.zip": /^(zip|zip code|postal code)$/i,
    "participant.city_state_zip": /^city[ ,/]+state[ ,/]+zip(?: code)?$/i,
    "participant.phone": /^(phone|phone number|telephone|telephone number|daytime phone)$/i,
    "participant.email": /^(email|e-mail|email address|e-mail address)$/i,
    "participant.date_of_birth": /^(dob|date of birth|birth date)$/i,
    "matter.county": /^(county|county of conviction|filing county)$/i,
    "matter.case_number": /^(case (?:no|number|#)|docket (?:no|number)|cause (?:no|number)|case id)$/i,
    "matter.citation_number": /^(citation (?:no|number|#))$/i,
    "matter.charge": /^(charge|charges|offense|offenses|violation|violations|statute|count|crime|crime charged)$/i
  };
  return patterns[factId]?.test(text) === true;
}

function unsafeReason(subject, regionHeading, factId) {
  const combined = `${subject ?? ""} ${regionHeading ?? ""}`;
  if (UNSAFE_OWNER.test(combined)) return "actor_or_post_event_field_not_owned_by_participant";
  if (UNSAFE_DATE.test(combined)) return "signature_or_event_date_must_not_be_prefilled";
  if (FORBIDDEN_FACTS.has(factId)) return "fact_class_is_not_permitted_for_prefill_in_this_lane";
  return null;
}

// ---------------------------------------------------------------------------
// COMPLETENESS DISPOSITION
//
// Every family this host builds published a field map that recorded what the
// build DID and never what the blank IS. Three things were missing from every
// refusal row, and two of them from every flat write row as well:
//
//   the field's printed label   The census measures `effectiveLabel` and
//                               `regionHeading` first hand and the map dropped
//                               both, so a reader saw `Text2` and
//                               `emailaddress` where the form prints "Case No."
//                               and "E-mail Address". A blank nobody can name
//                               is exactly the one that goes missing.
//
//   the field's identity        A flat document emitted its withheld blanks as
//                               `{ blankId, caption, reason }` under
//                               `roleRefusals`, a key whose rows are read as
//                               `{ field, why, class }`. Every one of those
//                               blanks therefore arrived with no id, no label
//                               and no reason at all -- 2,814 of them across
//                               nine of the eleven built families in this
//                               host's closure. Flat writes carried the same
//                               hole and reported `undefined` as the field.
//
//   an approved disposition     `no_allowlisted_fact_matches` and
//                               `binding_not_approved_by_exact_caption_gate`
//                               state what this build's allowlist offers.
//                               Neither says anything about whether the filing
//                               needs the value, and a statement of build
//                               policy is not a reason for a blank on a court
//                               filing.
//
// The class vocabulary is IMPORTED rather than restated below, so a disposition
// this builder writes and a disposition the completeness audit reads cannot
// drift apart.
// ---------------------------------------------------------------------------

/** A control the PDF viewer owns. It is not a filing fact and never was one. */
const VIEWER_CONTROL = /\b(reset|print\s*form|printform|resetbutton|save\s*this\s*form|clear\s*(this\s*)?form|for\s*your\s*records)\b/i;

/**
 * A column of a repeating charge table, as those columns are actually named.
 *
 * West Virginia's SCA-C906 names them Charge1..Charge4 and CaseNo1..CaseNo4;
 * SCA-C900 names them Offense1/Offense2 and Statute1/Statute2. The vocabulary is
 * deliberately narrow: `PetAdd1`/`PetAdd2` repeats the same way and is two lines
 * of one address, not two rows of a table.
 */
const CHARGE_ROW_COLUMN = /charge|offen[cs]e|count|statute|violation|case\s*no|caseno|citation|docket|conviction|disposition|sentence/i;

/** A stem that names the charge itself, which is what makes a row a charge row. */
const CHARGE_ROW_SUBJECT = /charge|offen[cs]e|count|statute|violation/i;

/**
 * An election the ROUTE determines rather than the participant.
 *
 * Each family here is built for exactly one statutory route and says so in its
 * own `routeKeys`. A petition built for one route that ships the route election
 * blank asks the participant to re-decide the thing the packet was built around.
 */
const ROUTE_DETERMINED_ELECTION = /\beligib|\bpursuant\s+to\b|\bunder\s+(?:section|§|penal\s+code|statute)|\bset[-\s]?aside\b|\bexpunge|\bseal(?:ing)?\b|\bcheck\s+(?:the\s+)?(?:one|box|all)\s+that\s+appl|\bselect\s+one\b|\btype\s+of\s+(?:petition|case|action)\b/i;

/** Protect categories whose owner really is the court, the clerk or the prosecutor. */
const OFFICIAL_OWNED_CATEGORIES = new Set([
  "court", "clerk", "prosecutor", "responsible_official", "licensing_board"
]);

/** Protect categories that describe an act a person performs, at or after the act. */
const ACT_COMPLETED_CATEGORIES = new Set(["signature", "notarization", "service_block"]);

/**
 * The printed context of a field: what a reader of the paper form sees around it.
 *
 * Composed rather than picked, because no single surface is reliable. CC-6-11
 * harvests `defendant`'s printed label as "vs" and DC-1-15 harvests a case
 * number's as ",  CasNe o"; the field NAME carries the meaning in the first case
 * and the LABEL carries it in the second. Publishing both, plus the section
 * heading and the row ordinal, is strictly more than either alone and invents
 * nothing: every part was measured first hand from the pinned source.
 */
export function printedContextOf({ label = null, sectionHeading = null, rowOrdinal = null } = {}) {
  const parts = [];
  const heading = String(sectionHeading ?? "").trim();
  const printed = String(label ?? "").trim();
  if (heading) parts.push(heading);
  if (printed && normalized(printed) !== normalized(heading)) parts.push(printed);
  if (rowOrdinal) parts.push(`row ${rowOrdinal}`);
  return parts.join(" · ") || null;
}

/**
 * Which repeating row each cell of a charge table belongs to.
 *
 * A cell is a row cell when its stem names a charge-table column, repeats across
 * two or more ordinals, and at least one repeating stem names the charge itself.
 * Returns an empty map for a document with no charge table, which is most of
 * them.
 */
export function chargeRowOrdinals(names) {
  const stems = new Map();
  const cells = new Map();
  for (const name of names) {
    const match = /^(.*[A-Za-z])(\d{1,2})$/.exec(String(name ?? ""));
    if (!match) continue;
    const [, stem, ordinal] = match;
    if (!CHARGE_ROW_COLUMN.test(stem)) continue;
    cells.set(name, { stem, ordinal: Number(ordinal) });
    if (!stems.has(stem)) stems.set(stem, new Set());
    stems.get(stem).add(Number(ordinal));
  }
  const repeating = new Set([...stems.entries()].filter(([, ordinals]) => ordinals.size >= 2).map(([stem]) => stem));
  if (![...repeating].some((stem) => CHARGE_ROW_SUBJECT.test(stem))) return new Map();
  const rows = new Map();
  for (const [name, cell] of cells) {
    if (repeating.has(cell.stem)) rows.set(name, cell.ordinal);
  }
  return rows;
}

/**
 * What a blank IS, decided from a property of the field.
 *
 * Returns one of the completeness contract's CLOSED refusal classes, or null
 * where no approved class applies and the blank has to be carried to the
 * participant instead. `requiredBeforeFiling` marks the second case: a fact the
 * filing needs that the platform does not hold, which is surfaced in the packet
 * rather than guessed. A guessed arresting agency is worse than a blank one --
 * the blank is visible and the guess is not.
 */
export function completenessDispositionOf({
  printedContext = null, fieldName = null, protectCategory = null,
  regionProtectCategory = null, documentAcceptsFill = true, documentPolicyReason = null
} = {}) {
  const context = `${printedContext ?? ""} ${fieldName ?? ""}`.trim();
  const category = protectCategory ?? regionProtectCategory ?? null;

  if (VIEWER_CONTROL.test(context)) {
    return { refusalClass: null, requiredBeforeFiling: false, why: "viewer ui control; never a filing fact" };
  }
  if (ACT_COMPLETED_CATEGORIES.has(category)) {
    return {
      refusalClass: "signature_or_date_participant_completion",
      requiredBeforeFiling: false,
      why: `${category} field: signed, sworn or certified by a person at or after the act it records, and never prefilled`
    };
  }
  if (OFFICIAL_OWNED_CATEGORIES.has(category)) {
    return {
      refusalClass: "court_prosecutor_clerk_or_agency_owned",
      requiredBeforeFiling: false,
      why: `${category}-owned field: the court, clerk or prosecutor completes it, not the participant`
    };
  }
  if (category === "attorney") {
    return {
      refusalClass: null, requiredBeforeFiling: false,
      why: "attorney-only block; no representation fact is held for this participant"
    };
  }
  // The agency is the fourth name inside `court_prosecutor_clerk_or_agency_owned`
  // and the only one of the four that is not protected. An arresting, citing or
  // prosecuting agency is a case fact the participant already has from the
  // record they screened with, so bundling it with the clerk and the judge lets a
  // required fact hide inside a protected class.
  if (category === "agency") {
    return {
      refusalClass: null, requiredBeforeFiling: true,
      why: "the arresting, citing or prosecuting agency is a case fact the participant holds from the record they screened with; it is required before filing and is not court-owned"
    };
  }
  if (!documentAcceptsFill && documentPolicyReason) {
    return {
      refusalClass: null, requiredBeforeFiling: true,
      why: `this document is completed by hand on this route (${documentPolicyReason}); the fields the filing still needs are required before filing`
    };
  }
  return {
    refusalClass: null, requiredBeforeFiling: true,
    why: "a participant or case fact the filing needs; the platform does not write it here and it must be supplied before filing"
  };
}

/**
 * What an unmade ELECTION is.
 *
 * Two answers, and the old map gave one of them to every control it met:
 * "selection_requires_participant_or_authorized_official_choice". That sentence
 * is true of a genuine election and false of a route election, and a packet
 * built for one statutory route must state which route it is.
 *
 * Which box a route selects is per-form data this shared host does not hold, so
 * the route election is NAMED as unmade rather than guessed. The naming is the
 * correction: it moves the defect from an unexplained blank to an owned one.
 */
export function electionDispositionOf({ printedContext = null, fieldName = null, protectCategory = null, regionProtectCategory = null, routeKey = null } = {}) {
  const context = `${printedContext ?? ""} ${fieldName ?? ""}`.trim();
  const category = protectCategory ?? regionProtectCategory ?? null;
  if (ACT_COMPLETED_CATEGORIES.has(category)) {
    return {
      refusalClass: "signature_or_date_participant_completion", requiredBeforeFiling: false, routeDetermined: false,
      why: `${category} control: marked by a person at or after the act it records, and never prefilled`
    };
  }
  if (OFFICIAL_OWNED_CATEGORIES.has(category)) {
    return {
      refusalClass: "court_prosecutor_clerk_or_agency_owned", requiredBeforeFiling: false, routeDetermined: false,
      why: `${category}-owned control: the court, clerk or prosecutor marks it, not the participant`
    };
  }
  if (ROUTE_DETERMINED_ELECTION.test(context)) {
    return {
      refusalClass: null, requiredBeforeFiling: false, routeDetermined: true,
      why: `the shared semantics never writes a checkbox, so the election this route determines is left unmade; this packet is built for ${routeKey ?? "a single statutory route"} and must state which route it is`
    };
  }
  return {
    refusalClass: "participant_sworn_narrative_or_legal_election", requiredBeforeFiling: false, routeDetermined: false,
    why: "a sworn assertion or legal election the route does not determine; only the participant may make it"
  };
}

/**
 * Attach printed context and an approved disposition to one map row.
 *
 * Applied to every row of every map -- writes and refusals, canonical and
 * boundary, AcroForm and flat -- so no reader of the field map has to
 * reconstruct what a row was about from the row's own name. The exact PDF field
 * name or measured blank id is preserved untouched on `field`/`blankId`, because
 * the artifact proof matches on it; the build's own words are preserved on
 * `buildPolicyReason` rather than deleted, so the correction is auditable
 * against what it replaced.
 */
export function withCompletenessDisposition(row, context = null) {
  if (!context) return { ...row };
  const {
    printedLabel = null, sectionHeading = null, rowOrdinal = null,
    disposition = null, page = null, identity = null
  } = context;
  const printedContext = printedContextOf({ label: printedLabel, sectionHeading, rowOrdinal });
  const enriched = {
    ...row,
    ...(identity === null ? {} : { field: identity }),
    printedLabel,
    sectionHeading,
    // A completeness reader forms an AcroForm field's label as
    // `${regionHeading} ${field}`, so this carries every printed surface the
    // census measured rather than the section heading alone. `sectionHeading`
    // above keeps the raw heading unmixed.
    regionHeading: printedContext,
    effectiveLabel: printedContext,
    ...(rowOrdinal ? { chargeRowOrdinal: rowOrdinal } : {}),
    ...(page === null ? {} : { page })
  };
  if (!disposition) return enriched;
  return {
    ...enriched,
    buildPolicyReason: row.reason ?? row.why ?? null,
    buildPolicyCategory: row.category ?? row.class ?? null,
    completenessClass: disposition.refusalClass,
    category: disposition.refusalClass,
    class: disposition.refusalClass,
    requiredBeforeFiling: disposition.requiredBeforeFiling === true,
    ...(disposition.routeDetermined ? { routeDetermined: true } : {}),
    reason: disposition.why,
    why: disposition.why
  };
}

/**
 * Everything the packet needs before it can be filed, in the participant's words.
 *
 * A required fact the platform does not hold may be blank only because the
 * packet says so. Nothing in these families said so, so the fact was simply
 * missing. This collects them, and `buildOfficial` writes them into the packet.
 */
export function requiredBeforeFilingItems(maps) {
  const items = [];
  const seen = new Set();
  for (const map of maps) {
    for (const row of [...(map.canonicalRefusals ?? []), ...(map.roleRefusals ?? []), ...(map.selectionControls ?? [])]) {
      if (row.requiredBeforeFiling !== true) continue;
      const label = row.regionHeading ?? row.printedLabel ?? row.field ?? row.blankId ?? null;
      if (!label) continue;
      const key = `${map.formNumber}::${label}`;
      if (seen.has(key)) continue;
      seen.add(key);
      items.push({ document: map.formNumber, field: row.field ?? row.blankId ?? null, page: row.page ?? null, printedContext: label, why: row.why ?? row.reason ?? null });
    }
  }
  return items.sort((a, b) => String(a.document).localeCompare(String(b.document))
    || Number(a.page ?? 0) - Number(b.page ?? 0)
    || String(a.printedContext).localeCompare(String(b.printedContext)));
}

/** The participant-facing disclosure of every blank the filing still needs. */
export function participantInstructionsMarkdown(familyId, config, items) {
  const lines = [
    `# Before you file: ${familyId}`,
    "",
    `This packet is built for ${config.routeKeys.join(", ")}.`,
    "",
    "Every field listed below is blank on the packet and the filing needs it. The",
    "platform does not hold the value, and it is not guessed: a guessed arresting",
    "agency is worse than a blank one, because the blank is visible and the guess is",
    "not. Complete each one by hand before you file.",
    "",
    `Required before filing: ${items.length} field(s).`,
    ""
  ];
  let document = null;
  for (const item of items) {
    if (item.document !== document) {
      document = item.document;
      lines.push(`## ${document}`, "");
    }
    lines.push(`- ${item.printedContext}${item.page ? ` (page ${item.page})` : ""} — ${item.why}`);
  }
  lines.push("");
  lines.push("Signature, signature date, and any certificate of mailing are deliberately left");
  lines.push("blank and are not listed here: you sign them, and a certificate of mailing is");
  lines.push("completed after mailing has happened.");
  lines.push("");
  lines.push(...participantGuidanceMarkdown(config.participantGuidance));
  return lines.join("\n");
}

/*
 * The four questions a blank-field disclosure cannot answer.
 *
 * The list above tells a participant what to write. It does not tell them where
 * to take the paper, what it costs, who must receive a copy, or when the task
 * stops being self-help — and a verifier established that on two families of
 * this host the packet answered none of the four, while the repository held the
 * answers. DET-FEE-AND-WAIVER-001 amendment A1 governs: ask first whether the
 * repository establishes the answer; if it does, state it; only where nothing
 * establishes it may a named checkable authority stand in, and then it must be
 * named rather than gestured at.
 *
 * The content is per family and lives in FAMILY_CONFIGS, because the answers are
 * per route: what is held for one route answers nothing for another, which is
 * amendment A3. A family that declares no guidance renders none and its bytes do
 * not move.
 */
export function participantGuidanceMarkdown(guidance) {
  if (!guidance) return [];
  const out = [];
  const section = (heading, body) => {
    if (!body || (Array.isArray(body) && body.length === 0)) return;
    out.push(`## ${heading}`, "");
    for (const entry of Array.isArray(body) ? body : [body]) out.push(entry, "");
  };
  const bullets = (heading, items, lead) => {
    if (!items || items.length === 0) return;
    out.push(`## ${heading}`, "");
    if (lead) out.push(lead, "");
    for (const item of items) out.push(`- ${item}`);
    out.push("");
  };
  section("Where you file this", guidance.whereYouFile);
  section("What it costs, and what to do if you cannot pay", guidance.whatItCosts);
  section("Who must receive a copy, and how", guidance.whoYouServe);
  bullets("Stop, and take this to a lawyer, if any of these is true", guidance.whereSelfHelpEnds);
  section("What this relief is, and is not", guidance.whatThisReliefIsNot);
  /* FIX81. The route's local_rules_check component, delivered as the process
   * guidance the packet-set manifest declares it to be. A family that declares
   * none renders none and its bytes do not move. */
  section("Confirm what the filing court requires before you file", guidance.localRulesCheck);
  if (guidance.heldSourceNote) out.push("## Where these answers come from", "", guidance.heldSourceNote, "");
  return out;
}

function chargeMappingFor(subject, fieldName = subject) {
  return approvedFactLabel("matter.charge", subject) ? { [fieldName]: "matter.charge" } : {};
}

/*
 * FIX81. The refusals a named-fact write replaces, and the ones it may not.
 *
 * A field this family writes through the finalizer's `narrativeAcrossFields`
 * channel must not also be declared unwritable by role: the role gate is not
 * overridable inside the shared module, and a field on both lists is written
 * nowhere and refused twice. Only ONE build-policy reason may be lifted this
 * way -- `binding_not_approved_by_exact_caption_gate`, which says the harvested
 * caption did not match the descriptor the field name already bound, and says
 * nothing about who owns the field. Anything else (an actor-owned field, a
 * signature or event date, a fact class this lane may not prefill) stops the
 * build, so this cannot become a way around a protect rule.
 */
const CAPTION_GATE_REASON = "binding_not_approved_by_exact_caption_gate";

function prepareAcroPolicy(census, policy, namedFactWrites = []) {
  const namedFactFields = new Set(namedFactWrites.flatMap((entry) => entry.fields ?? []));
  const namedFactExemptions = [];
  const explicitMappings = {};
  for (const field of census.fields) {
    const subject = field.effectiveLabel ?? field.name;
    Object.assign(explicitMappings, chargeMappingFor(subject, field.name));
  }
  const unwritableFields = [];
  const preclassification = [];
  const rowOrdinals = chargeRowOrdinals(census.fields.map((field) => field.name));
  const contextOf = (field) => ({
    printedLabel: field.effectiveLabel ?? null,
    sectionHeading: field.regionHeading ?? null,
    rowOrdinal: rowOrdinals.get(field.name) ?? null,
    page: field.widgets?.[0]?.page ?? null
  });
  for (const field of census.fields) {
    const subject = field.effectiveLabel ?? field.name;
    const decision = decideBinding(
      { name: field.name, pdfType: field.type, effectiveLabel: field.effectiveLabel, regionHeading: field.regionHeading },
      { explicitMappings, captionOnly: policy.captionOnly, availableChargeRows: 8, documentAcceptsFill: policy.documentAcceptsFill }
    );
    let reason = null;
    if (!policy.documentAcceptsFill) reason = policy.reason ?? "document_role_does_not_accept_prefill";
    if (!reason) reason = unsafeReason(subject, field.regionHeading, decision.factId);
    if (!reason && decision.writable && !approvedFactLabel(decision.factId, subject)) reason = "binding_not_approved_by_exact_caption_gate";
    if (reason && namedFactFields.has(field.name)) {
      assert.equal(reason, CAPTION_GATE_REASON,
        `${field.name}: a named-fact write may only lift ${CAPTION_GATE_REASON}, not ${reason}`);
      namedFactExemptions.push({
        field: field.name,
        liftedBuildPolicyReason: reason,
        printedLabelHarvested: field.effectiveLabel ?? null,
        writtenBy: "narrativeAcrossFields",
        why: "the harvested caption did not match the descriptor this field name already binds; the platform holds the value and writes it at this widget's own /Rect"
      });
      reason = null;
    }
    if (reason) {
      const context = contextOf(field);
      unwritableFields.push(withCompletenessDisposition({ field: field.name, class: reason, why: reason }, {
        ...context,
        disposition: completenessDispositionOf({
          printedContext: printedContextOf(context),
          fieldName: field.name,
          protectCategory: field.protectCategory ?? null,
          regionProtectCategory: regionProtectCategoryOf(field.regionHeading),
          documentAcceptsFill: policy.documentAcceptsFill,
          documentPolicyReason: policy.reason ?? null
        })
      }));
    }
    preclassification.push({ field: field.name, subject, sharedDecision: decision, roleRefusal: reason });
  }
  const censusByName = new Map(census.fields.map((field) => [field.name, field]));
  const selectionControls = census.selectionControls.map((control) => {
    const field = censusByName.get(control.field) ?? { name: control.field };
    const context = contextOf(field);
    return withCompletenessDisposition({ ...control, disposition: "explicit_refusal" }, {
      ...context,
      disposition: electionDispositionOf({
        printedContext: printedContextOf(context),
        fieldName: control.field,
        protectCategory: field.protectCategory ?? null,
        regionProtectCategory: regionProtectCategoryOf(field.regionHeading),
        routeKey: policy.routeKey ?? null
      })
    });
  });
  return { explicitMappings, unwritableFields, preclassification, selectionControls, namedFactWrites, namedFactExemptions };
}

/**
 * One withheld flat blank, in the shape every reader of a field map expects.
 *
 * A measured blank has no PDF field name -- its identity is the measured
 * `blankId` -- so the previous rows carried `blankId`/`caption`/`reason` under a
 * key whose rows are read as `field`/`why`/`class`. The blank then arrived with
 * no id, no label and no reason at all. Both keys are populated here and
 * `blankId` is preserved, because the flat write/refusal partition is proved
 * against it.
 */
export function flatRefusalRow(row, blank, policy, override = null) {
  const context = {
    printedLabel: blank.caption ?? null,
    sectionHeading: blank.regionHeading ?? null,
    rowOrdinal: null,
    page: blank.page ?? null,
    identity: printedContextOf({ label: blank.caption ?? null, sectionHeading: blank.regionHeading ?? null }) ?? blank.blankId
  };
  const disposition = override ?? completenessDispositionOf({
    printedContext: printedContextOf(context),
    fieldName: blank.blankId,
    protectCategory: blank.protectCategory ?? null,
    regionProtectCategory: blank.regionProtectCategory ?? null,
    documentAcceptsFill: policy.documentAcceptsFill,
    documentPolicyReason: policy.reason ?? null
  });
  return withCompletenessDisposition(row, { ...context, disposition });
}

function prepareFlatPolicy(census, policy) {
  const anchors = [];
  const withheld = [];
  const explicitMappings = {};
  for (const blank of census.blanks) Object.assign(explicitMappings, chargeMappingFor(blank.caption, blank.caption));
  const candidates = [];
  for (const blank of census.blanks) {
    const decision = decideBinding(
      { name: blank.caption, pdfType: "text", effectiveLabel: blank.caption },
      { explicitMappings, captionOnly: policy.captionOnly, availableChargeRows: 8, documentAcceptsFill: policy.documentAcceptsFill }
    );
    let reason = null;
    if (!policy.documentAcceptsFill) reason = policy.reason ?? "document_role_does_not_accept_prefill";
    if (!reason && blank.regionProtectCategory) reason = `protected_page_region:${blank.regionProtectCategory}`;
    if (!reason) reason = unsafeReason(blank.caption, blank.regionHeading, decision.factId);
    if (!reason && decision.writable && !approvedFactLabel(decision.factId, blank.caption)) reason = "binding_not_approved_by_exact_caption_gate";
    if (!reason && !decision.writable) reason = decision.reason;
    const width = round(blank.measured.width - 3.5);
    if (!reason && width < 24) reason = "measured_blank_too_narrow";
    if (reason) {
      withheld.push(flatRefusalRow({ blankId: blank.blankId, page: blank.page, caption: blank.caption,
        measured: blank.measured, construction: blank.construction, reason, sharedDecision: decision }, blank, policy));
      continue;
    }
    candidates.push({ blank, decision, width });
  }
  const groups = new Map();
  for (const candidate of candidates) {
    const key = `${candidate.blank.page}:${candidate.decision.factId}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(candidate);
  }
  for (const group of groups.values()) {
    group.sort((a, b) => b.width - a.width || b.blank.measured.baselineY - a.blank.measured.baselineY || a.blank.measured.x0 - b.blank.measured.x0);
    const winner = group[0];
    const blank = winner.blank;
    anchors.push({
      blankId: blank.blankId,
      label: blank.caption,
      factId: winner.decision.factId,
      page: blank.page,
      writeBox: {
        x: round(blank.measured.x0 + 1.5),
        y: round(blank.measured.baselineY + (blank.construction === "content_stream_rule" ? 2 : 0)),
        width: winner.width,
        height: 12
      },
      fontSize: 10,
      captionOnly: policy.captionOnly,
      geometryBasis: blank.geometryBasis
    });
    for (const duplicate of group.slice(1)) {
      withheld.push(flatRefusalRow({
        blankId: duplicate.blank.blankId,
        page: duplicate.blank.page,
        caption: duplicate.blank.caption,
        measured: duplicate.blank.measured,
        construction: duplicate.blank.construction,
        reason: "duplicate_safe_fact_on_same_page_kept_once",
        keptInstead: blank.blankId,
        sharedDecision: duplicate.decision
      }, duplicate.blank, policy, {
        refusalClass: null,
        requiredBeforeFiling: false,
        why: `the same fact is already written once on this page at ${blank.blankId}; a second copy of it is not a second fact`
      }));
    }
  }
  const protectedRules = census.blanks
    .filter((blank) => blank.construction === "content_stream_rule" && (blank.protectCategory || blank.regionProtectCategory))
    .map((blank) => ({
      page: blank.page,
      x: blank.measured.x0,
      endX: blank.measured.x1,
      y: blank.measured.baselineY,
      category: blank.protectCategory ?? blank.regionProtectCategory,
      caption: blank.caption
    }));
  const selectionControls = census.selectionControls.map((control) => {
    const context = {
      printedLabel: control.label ?? null,
      sectionHeading: null,
      rowOrdinal: null,
      page: control.page ?? null,
      identity: control.label ?? control.selectionId
    };
    const shared = {
      printedContext: printedContextOf(context),
      fieldName: control.selectionId,
      protectCategory: protectCategoryOf(control.label ?? "") ?? null,
      regionProtectCategory: null
    };
    // A boxed entry is a place to WRITE something, not an election to make, so it
    // is dispositioned as a field. Only a real selection control asks the reader
    // to choose.
    const disposition = control.kind === "selection_control"
      ? electionDispositionOf({ ...shared, routeKey: policy.routeKey ?? null })
      : completenessDispositionOf({
        ...shared,
        documentAcceptsFill: policy.documentAcceptsFill,
        documentPolicyReason: policy.reason ?? null
      });
    return withCompletenessDisposition({ ...control }, { ...context, disposition });
  });
  return { anchors, withheld, explicitMappings, protectedRules, selectionControls };
}

function factsFor(config, fixture) {
  const boundary = fixture === "boundary";
  const chargeCount = config.chargeCount ?? 1;
  const baseCharge = boundary
    ? `${config.chargeLabel}; an unusually long statutory description used only to test legible fit and fail-closed overflow behavior`
    : config.chargeLabel;
  const charges = Array.from({ length: chargeCount }, (_, index) => ({
    case_number: boundary ? `2026-CR-${String(900123 + index).padStart(6, "0")}-EXTENDED-CASE-IDENTIFIER` : `24-CR-${String(1234 + index).padStart(6, "0")}`,
    citation_number: `C-${889201 + index}`,
    charge: index === 0 ? baseCharge : `${baseCharge} ${index + 1}`,
    arrest_date: "2019-03-08",
    offense_date: "2019-03-08",
    conviction_date: "2019-11-02",
    disposition_date: "2020-01-15"
  }));
  return {
    "participant.full_legal_name": boundary ? "Alexandrina-Katharine Montgomery-Vandenberg-Oyelaran Fitzwilliam" : "Jordan Avery Reyes",
    "participant.first_name": boundary ? "Alexandrina-Katharine" : "Jordan",
    "participant.middle_name": boundary ? "Montgomery-Vandenberg" : "Avery",
    "participant.last_name": boundary ? "Oyelaran Fitzwilliam" : "Reyes",
    "participant.street_address": boundary ? "12345 Southwest Grandview Boulevard Northeast, Building 7, Apartment 4321-B" : "118 Maple Street",
    "participant.city": boundary ? "Unincorporated Township of Long Hollow Crossing" : "Springfield",
    "participant.state": config.state.toUpperCase(),
    "participant.zip": boundary ? "01234-9999" : "01234",
    "participant.city_state_zip": boundary ? `Unincorporated Township of Long Hollow Crossing, ${config.state.toUpperCase()} 01234-9999` : `Springfield, ${config.state.toUpperCase()} 01234`,
    "participant.phone": boundary ? "555-0142 ext. 44821" : "555-0142",
    "participant.email": boundary ? "alexandrina.montgomery.vandenberg.oyelaran.fitzwilliam@department-of-example.example.gov" : "jordan.reyes@example.com",
    "participant.date_of_birth": "1991-04-17",
    "matter.county": boundary ? "Saint Bartholomew and the Northern Reaches County" : "Example County",
    "matter.court": "District Court",
    "matter.case_number": charges[0].case_number,
    "matter.citation_number": charges[0].citation_number,
    "matter.charge": charges[0].charge,
    "matter.arrest_date": charges[0].arrest_date,
    "matter.offense_date": charges[0].offense_date,
    "matter.conviction_date": charges[0].conviction_date,
    "matter.disposition_date": charges[0].disposition_date,
    "deterministic.filing_date": "2026-08-30",
    "matter.charges": charges
  };
}

async function addedInkOf(sourceBytes, artifactBytes) {
  const before = await PDFDocument.load(sourceBytes, { ignoreEncryption: true, updateMetadata: false });
  const after = await PDFDocument.load(artifactBytes, { ignoreEncryption: true, updateMetadata: false });
  const key = (page, character, y) => `${page}|${round(character.x)}|${round(y)}|${character.c}`;
  const sourceGlyphs = new Set();
  before.getPages().forEach((page, index) => {
    for (const item of extractTextItems(page)) for (const character of item.chars ?? []) sourceGlyphs.add(key(index + 1, character, item.y));
  });
  const added = [];
  after.getPages().forEach((page, index) => {
    for (const item of extractTextItems(page)) {
      for (const character of item.chars ?? []) {
        if (!sourceGlyphs.has(key(index + 1, character, item.y))) {
          added.push({ page: index + 1, x: round(character.x), y: round(item.y), w: round(character.w), c: character.c });
        }
      }
    }
  });
  return added;
}

function inkInBox(added, anchor) {
  const box = anchor.writeBox;
  const glyphs = added.filter((glyph) => glyph.page === anchor.page
    && glyph.x >= box.x - 2 && glyph.x + glyph.w <= box.x + box.width + 2
    && glyph.y >= box.y - 3 && glyph.y <= box.y + box.height + 3)
    .sort((a, b) => a.y === b.y ? a.x - b.x : b.y - a.y);
  return { text: glyphs.map((glyph) => glyph.c).join("").replace(/\s+/g, " ").trim(), glyphs };
}

function fixtureTokens(facts) {
  return Object.entries(facts)
    .filter(([, value]) => typeof value === "string" && value.length >= 4)
    .map(([factId, value]) => ({ factId, value: String(value), normalized: normalized(value) }));
}

async function verifyAcroBytes(source, census, policyData, artifactBytes, report, facts, fixture) {
  const stage = fs.mkdtempSync(path.join(os.tmpdir(), "central-acro-proof-"));
  const file = path.join(stage, "artifact.pdf");
  fs.writeFileSync(file, artifactBytes);
  let appearances;
  try { appearances = await flattenedWidgets(file); } finally { fs.rmSync(stage, { recursive: true, force: true }); }
  const findings = [];
  const actualWrites = [];
  const tokens = fixtureTokens(facts);
  const roleRefused = new Set(policyData.unwritableFields.map((item) => item.field));
  for (const field of census.fields) {
    if (!field.widgets.length) continue;
    const byWidget = field.widgets.map((widget) => ({
      widget,
      texts: drawnAt(appearances, { page: widget.page, rect: widget.rect, tolerance: 3 })
        .map((appearance) => String(appearance.text ?? "").trim()).filter(Boolean),
    }));
    const drawnText = byWidget.flatMap((row) => row.texts).join(" ").trim();
    const written = report.written.find((item) => item.field === field.name) ?? null;
    if (written) {
      const expected = String(resolveFact(facts, written.factId) ?? "");
      const visible = byWidget.length > 0 && byWidget.every((row) =>
        normalized(row.texts.join(" ")).includes(normalized(expected)));
      actualWrites.push({ field: field.name, factId: written.factId,
        widgets: byWidget.map((row) => ({ page: row.widget.page, rect: row.widget.rect, drawnText: row.texts })),
        expected, drawnText, everyWidgetVisibleInArtifactBytes: visible, visibleInArtifactBytes: visible });
      if (!visible) findings.push({ fixture, document: source.formNumber, field: field.name, check: "reported_write_not_visible_at_measured_widget", expected, drawnText });
    }
    if (roleRefused.has(field.name) && drawnText) {
      const participantValues = tokens.filter((token) => normalized(drawnText).includes(token.normalized));
      if (participantValues.length) findings.push({ fixture, document: source.formNumber, field: field.name, check: "role_refused_field_contains_fixture_fact", facts: participantValues.map((item) => item.factId), drawnText });
    }
    if (field.captionDescribesChargeValue && drawnText) {
      const name = normalized(facts["participant.full_legal_name"]);
      if (normalized(drawnText).includes(name)) findings.push({ fixture, document: source.formNumber, field: field.name, check: "participant_name_in_charge_caption", drawnText });
    }
  }
  const addedPaths = await addedPaintedPaths(source.bytes, artifactBytes);
  const measuredControls = policyData.selectionControls.flatMap((control) => control.widgets.map((widget, index) => ({
    ...control,
    selectionId: `${control.selectionId}#widget-${index + 1}`,
    page: widget.page,
    measured: {
      x0: widget.rect.x, y0: widget.rect.y,
      x1: round(widget.rect.x + widget.rect.width), y1: round(widget.rect.y + widget.rect.height),
      width: widget.rect.width, height: widget.rect.height,
    },
  })));
  const vectorMarks = addedPathsInSelectionControls(addedPaths, measuredControls);
  const protectedSelectionControls = policyData.selectionControls.map((control) => {
    const reportedWrite = report.written.some((item) => item.field === control.field);
    const refused = report.refused.some((item) => item.field === control.field);
    const textMarks = control.widgets.flatMap((widget, index) => drawnAt(appearances, {
      page: widget.page, rect: widget.rect, tolerance: 2,
    }).map((appearance) => String(appearance.text ?? "").trim()).filter(Boolean)
      .map((text) => ({ widget: index + 1, page: widget.page, text })));
    const pathMarks = vectorMarks.filter((mark) => mark.selectionId.startsWith(`${control.selectionId}#widget-`));
    const generatedSelection = reportedWrite || textMarks.length > 0 || pathMarks.length > 0;
    if (generatedSelection || !refused) {
      findings.push({
        fixture,
        document: source.formNumber,
        field: control.field,
        check: generatedSelection
          ? "selection_control_carries_artifact_derived_text_or_vector_mark"
          : "selection_control_lacks_explicit_refusal"
      });
    }
    return {
      selectionId: control.selectionId,
      field: control.field,
      type: control.type,
      widgets: control.widgets,
      sourceSelection: control.sourceSelection,
      disposition: control.disposition,
      reason: control.reason,
      generatedSelection,
      artifactEvidence: { reportedWrite, textMarks, pathMarks },
      explicitlyRefused: refused
    };
  });
  const reopened = await PDFDocument.load(artifactBytes, { ignoreEncryption: true, updateMetadata: false });
  let remainingFields = 0;
  try { remainingFields = reopened.getForm().getFields().length; } catch { remainingFields = 0; }
  if (remainingFields !== 0) findings.push({ fixture, document: source.formNumber, check: "final_artifact_retains_acroform_fields", remainingFields });
  return { findings, actualWrites, protectedSelectionControls,
    appearancesRead: appearances.length, addedPaintedPaths: addedPaths.length, remainingAcroFields: remainingFields };
}

async function verifyFlatBytes(source, policyData, artifactBytes, report, facts, fixture) {
  const added = await addedInkOf(source.bytes, artifactBytes);
  const addedPaths = await addedPaintedPaths(source.bytes, artifactBytes);
  const findings = [];
  const actualWrites = [];
  for (const anchor of policyData.anchors) {
    const ink = inkInBox(added, anchor);
    const written = report.written.find((item) => item.anchor === anchor.label && item.factId === anchor.factId) ?? null;
    const expected = String(resolveFact(facts, anchor.factId) ?? "");
    const visible = written ? normalized(ink.text).includes(normalized(expected)) : ink.text === "";
    actualWrites.push({ blankId: anchor.blankId, label: anchor.label, factId: anchor.factId, page: anchor.page, writeBox: anchor.writeBox, expected: written ? expected : null, drawnText: ink.text || null, visibleInArtifactBytes: visible });
    if (!visible) findings.push({ fixture, document: source.formNumber, blankId: anchor.blankId, check: written ? "reported_flat_write_not_visible_at_measured_box" : "refused_flat_anchor_carries_added_ink", expected, drawnText: ink.text });
  }
  if (!policyFor(source).documentAcceptsFill && added.some((glyph) => String(glyph.c).trim() !== "")) {
    findings.push({ fixture, document: source.formNumber, check: "no_fill_flat_document_carries_added_text", glyphs: added.length });
  }
  const markedSelectionText = addedGlyphsInSelectionControls(added, policyData.selectionControls);
  const markedSelectionPaths = addedPathsInSelectionControls(addedPaths, policyData.selectionControls);
  for (const marked of [...markedSelectionText, ...markedSelectionPaths]) {
    findings.push({
      fixture,
      document: source.formNumber,
      selectionId: marked.selectionId,
      check: "explicitly_refused_selection_control_carries_added_ink",
      glyphs: marked.glyphs ?? null,
      paths: marked.paths ?? null,
    });
  }
  const protectedWithheldInk = policyData.withheld.flatMap((blank) => {
    const measured = blank.measured;
    if (!measured) return [];
    const box = {
      x0: measured.x0, x1: measured.x1,
      y0: measured.baselineY - 3, y1: measured.baselineY + 12,
    };
    const glyphs = added.filter((glyph) => glyph.page === blank.page
      && glyph.x + glyph.w >= box.x0 && glyph.x <= box.x1
      && glyph.y >= box.y0 && glyph.y <= box.y1
      && String(glyph.c ?? "").trim() !== "");
    return glyphs.length ? [{ blankId: blank.blankId, page: blank.page, caption: blank.caption, glyphs }] : [];
  });
  for (const marked of protectedWithheldInk) findings.push({
    fixture, document: source.formNumber, blankId: marked.blankId,
    check: "withheld_or_protected_blank_carries_added_artifact_ink", glyphs: marked.glyphs,
  });
  const protectedSelectionControls = policyData.selectionControls.map((control) => ({
    selectionId: control.selectionId,
    page: control.page,
    label: control.label,
    measured: control.measured,
    disposition: control.disposition,
    reason: control.reason,
    generatedSelection: markedSelectionText.some((item) => item.selectionId === control.selectionId)
      || markedSelectionPaths.some((item) => item.selectionId === control.selectionId),
    artifactEvidence: {
      textMarks: markedSelectionText.filter((item) => item.selectionId === control.selectionId),
      vectorMarks: markedSelectionPaths.filter((item) => item.selectionId === control.selectionId),
    },
  }));
  return { findings, actualWrites, protectedSelectionControls, protectedWithheldInk,
    addedGlyphs: added.length, addedPaintedPaths: addedPaths.length };
}

/*
 * FIX81, KNOWN_PREFILLS. A blank the platform holds a value for and does not
 * write, described by MEASURING THE WIDGET rather than by naming build policy.
 *
 * The caption of the Nebraska petition, order and notice -- "IN THE ______
 * COURT OF ______ COUNTY, NEBRASKA" -- is not four blanks. It is two PDF
 * DROP-DOWNS and two READ-ONLY display fields that the form's own script
 * rewrites from them, and the shared filler writes text fields: it selects no
 * option on a choice field, and a value written into a read-only display field
 * would replace the caption's own printed words rather than fill a blank.
 * Those are facts about the widget, and they are what the row should say. The
 * refusals they replace said "the platform does not write it here", which is a
 * statement about this build.
 *
 * Every number below is READ FROM THE PINNED BINARY on each build -- field
 * type, /Ff, /F, /Rect, the option list and the source-carried value -- and the
 * declared expectation is asserted against it, so this cannot go on describing
 * a widget the form no longer has.
 */
async function measuredWidgetFacts(source, fieldNames) {
  const facts = new Map();
  if (fieldNames.length === 0) return facts;
  const doc = await PDFDocument.load(source.bytes, { ignoreEncryption: true, updateMetadata: false });
  const form = doc.getForm();
  const pages = doc.getPages();
  for (const name of fieldNames) {
    let field;
    try { field = form.getField(name); } catch { field = null; }
    assert.ok(field, `${source.formNumber}: measured-refusal field ${name} is absent from the pinned form`);
    const dict = field.acroField.dict;
    const ff = dict.get(PDFName.of("Ff"))?.asNumber?.() ?? 0;
    const widget = field.acroField.getWidgets()[0];
    const rect = widget.getRectangle();
    let page = null;
    pages.forEach((candidate, index) => { if (candidate.ref === widget.P?.()) page = index + 1; });
    const flags = widget.dict.get(PDFName.of("F"))?.asNumber?.() ?? null;
    let value = null;
    try {
      const raw = field.acroField.dict.get(PDFName.of("V"));
      value = raw ? String(doc.context.lookup(raw)).replace(/^\(|\)$/g, "") : null;
    } catch { value = null; }
    let options = null;
    try { options = typeof field.getOptions === "function" ? field.getOptions() : null; } catch { options = null; }
    facts.set(name, {
      field: name,
      pdfType: field.constructor.name === "PDFDropdown" ? "choice_dropdown"
        : field.constructor.name === "PDFTextField" ? "text" : field.constructor.name,
      fieldFlags: ff,
      readOnly: (ff & 1) === 1,
      multiline: (ff & 4096) === 4096,
      annotationFlags: flags,
      noView: flags !== null && (flags & 32) === 32,
      page,
      rect: { x: round(rect.x), y: round(rect.y), width: round(rect.width), height: round(rect.height) },
      sourceCarriedValue: value,
      optionCount: options ? options.length : null,
      options: options ?? null
    });
  }
  return facts;
}

/**
 * A choice option that is a real value rather than a prompt or a ruled line.
 *
 * The Nebraska caption lists open with "Choose the court" / "Choose the county"
 * and, on the court list, a rule of underscores. Counting those as values would
 * overstate what the list offers by two, and the whole point of this sentence
 * is that the count is measured.
 */
const REAL_OPTION = (option) => {
  const text = String(option ?? "").trim();
  return text !== "" && !/^_+$/.test(text) && !/^choose the\b/i.test(text);
};

/** A held value the list actually offers, matched on the option's own words. */
function optionOffering(options, value) {
  const target = normalized(value);
  if (!target) return null;
  for (const option of options) {
    const candidate = normalized(option);
    if (!candidate) continue;
    if (candidate === target) return option;
    if (target.startsWith(`${candidate} `)) return option;
  }
  return null;
}

/** A PDF string as a reader sees it, not as the file escapes it. */
const readablePdfString = (value) => String(value ?? "")
  .replace(/\\([()\\])/g, "$1")
  .replace(/\\r|\\n/g, " ")
  .replace(/\s+/g, " ")
  .trim();

/** The participant-facing sentence a measured refusal earns, from the measurement. */
function measuredRefusalWhy(measured, held) {
  const box = `page ${measured.page}, /Rect [${measured.rect.x} ${measured.rect.y} `
    + `${round(measured.rect.x + measured.rect.width)} ${round(measured.rect.y + measured.rect.height)}]`;
  if (measured.pdfType === "choice_dropdown") {
    const offered = (measured.options ?? []).filter(REAL_OPTION);
    const notOffered = held.filter((value) => optionOffering(offered, value) === null);
    const matched = held
      .map((value) => ({ value, option: optionOffering(offered, value) }))
      .filter((row) => row.option !== null);
    return `this is not a typed blank: it is a PDF drop-down (/FT /Ch, ${box}) whose list holds `
      + `${measured.optionCount} entr(ies), ${offered.length} of them values. Choose the value from the list in a PDF `
      + `viewer, or write it by hand on the printed caption. The platform holds this fact and does not write it here `
      + `because the shared filler writes text fields and makes no selection on a choice field`
      + (notOffered.length
        ? `; and the value it holds in these review fixtures (${notOffered.map((value) => `"${value}"`).join(", ")}) `
          + `is not one of the ${offered.length} the list offers, so no option corresponds to it.`
        : `. The value it holds (${matched.map((row) => `"${row.value}"`).join(", ")}) does correspond to the option `
          + `${matched.map((row) => `"${row.option}"`).join(", ")}, so the obstacle is the widget type and nothing else.`);
  }
  if (measured.readOnly) {
    return `this is not a blank: it is a READ-ONLY field (/Ff ${measured.fieldFlags}, read-only bit set`
      + (measured.noView ? `; annotation /F ${measured.annotationFlags}, NoView` : "")
      + `, ${box}) that already carries the form's own words, "${readablePdfString(measured.sourceCarriedValue)}", `
      + `which the form's script rewrites when the drop-down beside it is used. Writing a fact into it would replace `
      + `the form's printed text rather than fill a blank.`;
  }
  return null;
}

/**
 * A measured refusal, written onto the refusal rows a reader will actually meet.
 *
 * Applied identically by `buildOfficial` and by `--check`, so a stored map and
 * a live recomputation stay comparable -- the same reason `dispositionRowsFor`
 * enriches in one place rather than two.
 */
export function applyMeasuredRefusalRows(rows, measuredRefusals) {
  const byField = new Map((measuredRefusals ?? []).map((row) => [row.field, row]));
  for (const row of rows ?? []) {
    const measured = byField.get(row.field);
    if (!measured) continue;
    row.why = measured.why;
    row.reason = measured.why;
    row.measurementBasis = "widget type, /Ff, /F, /Rect, option list and source-carried value read first hand from the pinned binary on this build";
    row.measuredWidget = {
      pdfType: measured.pdfType, fieldFlags: measured.fieldFlags, readOnly: measured.readOnly,
      annotationFlags: measured.annotationFlags, noView: measured.noView,
      page: measured.page, rect: measured.rect,
      optionCount: measured.optionCount, optionsSample: measured.optionsSample,
      sourceCarriedValue: measured.sourceCarriedValue
    };
  }
  return rows;
}

async function renderOneDocument(source, config, fixture) {
  // The route the packet is built for travels with the document policy, so a
  // selection control can say whether the election is one the ROUTE determines
  // or one that genuinely belongs to the participant.
  const policy = { ...policyFor(source), routeKey: config.routeKeys[0] ?? null };
  const facts = factsFor(config, fixture);
  /* FIX81. Facts this family writes at a named widget, per document. A family
   * that declares none passes an empty list and is byte-unaffected. */
  const namedFactWrites = (config.namedFactWrites ?? {})[source.formNumber] ?? [];
  if (source.indexEntry.structuralClassObserved === "acroform") {
    const census = await censusAcro(source);
    const policyData = prepareAcroPolicy(census, policy, namedFactWrites);
    const standardNamedFields = new Set((config.standardNamedFactWrites ?? {})[source.formNumber] ?? []);
    const narrativeWrites = namedFactWrites.filter((entry) => {
      if (!(entry.fields ?? []).some((field) => standardNamedFields.has(field))) return true;
      assert.equal(entry.fields.length, 1, "standard named facts must name exactly one field");
      const field = census.fields.find((item) => item.name === entry.fields[0]);
      assert.ok(field, `${source.formNumber}/${entry.fields[0]}: standard named field missing`);
      const decision = decideBinding({
        name: field.name, pdfType: field.type,
        effectiveLabel: field.effectiveLabel, regionHeading: field.regionHeading
      }, { explicitMappings: policyData.explicitMappings, captionOnly: policy.captionOnly,
        documentAcceptsFill: policy.documentAcceptsFill });
      assert.equal(decision.writable, true, `${source.formNumber}/${field.name}: ordinary writer refused`);
      assert.equal(decision.factId, entry.factId, `${source.formNumber}/${field.name}: fact binding changed`);
      const exemption = policyData.namedFactExemptions.find((item) => item.field === field.name);
      if (exemption) exemption.writtenBy = "ordinary_text_with_widget_font_size_alignment";
      return false;
    });
    const result = await finalizeOfficialForm({
      sourceBytes: source.bytes,
      expectedSha256: source.sha256,
      census: census.fields,
      facts,
      explicitMappings: policyData.explicitMappings,
      unwritableFields: policyData.unwritableFields,
      captionOnly: policy.captionOnly,
      documentAcceptsFill: policy.documentAcceptsFill,
      documentTextLines: census.documentTextLines,
      maxFontSize: 10,
      /* FIX68. DC-1-15 field Text60.0 ships an appearance whose /BBox is
       * 313.129pt wide against a /Rect 221.09pt wide, so the rule of
       * underscores it draws overhangs its own widget by 92.04pt and runs off
       * the text column. ISO 32000-1 12.5.5 requires the transformed BBox to
       * be fitted to the /Rect -- here 0.706 -- and pdf-lib's flatten() emits
       * a translation only, so the fit never happened. VF08 measured 1520 dark
       * pixels outside that rect per fixture at 300 dpi on packet page 5,
       * where the form's own conforming placement carries none, and proved the
       * ink is the shared step's rather than this family's by reproducing the
       * identical pixel set from a zero-write flatten of the pinned source
       * with the option OFF.
       *
       * Opting in pre-composes the 12.5.5 mapping into that appearance's own
       * /Matrix. This is the shared step's defect, not Nebraska's; the option
       * is default-off and no other family's bytes move because this family
       * passes it. No synthesized square was recorded for this family, so
       * FIX50's suppressSynthesizedAppearances is not passed. This file also
       * hosts ne-setaside-noncustodial-set, whose action is STOP: that family
       * is routed to buildStop and never reaches this call, so its directory
       * is unaffected. */
      fitAppearancesToRect: true,
      /* FIX81, KNOWN_PREFILLS. See `namedFactWrites` in FAMILY_CONFIGS: the
       * caller names fact ids and field names only, and the shared module
       * resolves, protects, fits and refuses. Empty for every other family. */
      narrativeAcrossFields: narrativeWrites,
      ...(standardNamedFields.size ? {
        alignWidgetFontSizeToFit: true,
        evaluateDeclaredMinimumSize: true
      } : {}),
      title: source.formNumber
    });
    const proof = await verifyAcroBytes(source, census, policyData, result.bytes, result.report, facts, fixture);
    /* FIX81. The measurement each declared caption widget earns, read from the
     * pinned binary on this build and asserted against the declaration. */
    const declared = (config.measuredRefusals ?? {})[source.formNumber] ?? {};
    const measured = await measuredWidgetFacts(source, Object.keys(declared));
    const measuredRefusals = [];
    for (const [field, expectation] of Object.entries(declared)) {
      const row = measured.get(field);
      if (expectation.expect === "choice_dropdown") {
        assert.equal(row.pdfType, "choice_dropdown",
          `${source.formNumber}/${field}: declared a drop-down, measured ${row.pdfType}`);
        assert.ok((row.optionCount ?? 0) > 0, `${source.formNumber}/${field}: a drop-down with no options`);
      } else {
        assert.equal(row.pdfType, "text", `${source.formNumber}/${field}: declared a text field, measured ${row.pdfType}`);
        assert.equal(row.readOnly, true, `${source.formNumber}/${field}: declared read-only, measured writable`);
      }
      /* Both personas, not this fixture's: the sentence lands in a map and a
       * disclosure table shared by both fixtures, so a value named in it must
       * be true of both. It is also what makes the row identical whichever
       * fixture is being rendered, which `--check` then compares. */
      const heldEverywhere = ["canonical", "boundary"]
        .flatMap((persona) => (expectation.holds ?? []).map((factId) => resolveFact(factsFor(config, persona), factId)))
        .filter((value) => typeof value === "string" && value.trim());
      const held = [...new Set(heldEverywhere)];
      const why = measuredRefusalWhy(row, held);
      assert.ok(why, `${source.formNumber}/${field}: no measurement sentence could be composed`);
      measuredRefusals.push({ ...row, holdsFactIds: expectation.holds ?? [], heldValues: held, why,
        optionsSample: row.options ? row.options.slice(0, 6) : null, options: undefined });
    }
    return { source, policy, census, policyData, fixture, bytes: result.bytes, report: result.report, proof, measuredRefusals };
  }
  if (source.indexEntry.structuralClassObserved !== "flat_pdf") throw new Error(`${source.formNumber}: unsupported structural class ${source.indexEntry.structuralClassObserved}`);
  const census = await censusFlat(source);
  const policyData = prepareFlatPolicy(census, policy);
  const result = await finalizeFlatOverlay({
    sourceBytes: source.bytes,
    expectedSha256: source.sha256,
    anchors: policyData.anchors,
    selections: [],
    protectedRules: policyData.protectedRules,
    explicitMappings: policyData.explicitMappings,
    facts,
    documentTextLines: census.documentTextLines,
    title: source.formNumber
  });
  const proof = await verifyFlatBytes(source, policyData, result.bytes, result.report, facts, fixture);
  return { source, policy, census, policyData, fixture, bytes: result.bytes, report: result.report, proof };
}

/**
 * The finalizer's write and refusal rows, carrying the printed context the
 * census measured and an approved disposition instead of build-policy prose.
 *
 * The finalizer names an AcroForm row by its PDF field and a flat row by its
 * anchor label; neither carries the printed label, the section heading, or the
 * charge-row ordinal, and a flat row carried no field identity at all -- which is
 * why every flat write in this closure reported `undefined` as its field. The
 * enrichment is applied here rather than inside the finalizer because the
 * finalizer is shared far beyond this lane, and it is applied identically by
 * `buildOfficial` and by `--check` so a stored map and a live recomputation stay
 * comparable.
 */
export function dispositionRowsFor(item, report) {
  const acroform = item.census.structuralClass === "acroform";
  const rowOrdinals = acroform
    ? chargeRowOrdinals(item.census.fields.map((field) => field.name))
    : new Map();
  const byName = acroform ? new Map(item.census.fields.map((field) => [field.name, field])) : new Map();
  const blanksById = acroform ? new Map() : new Map(item.census.blanks.map((blank) => [blank.blankId, blank]));
  const anchorsByLabel = new Map();
  for (const anchor of item.policyData.anchors ?? []) {
    if (!anchorsByLabel.has(anchor.label)) anchorsByLabel.set(anchor.label, anchor);
  }
  const contextFor = (row, withDisposition) => {
    if (acroform) {
      const field = byName.get(row.field);
      if (!field) return null;
      const context = {
        printedLabel: field.effectiveLabel ?? null,
        sectionHeading: field.regionHeading ?? null,
        rowOrdinal: rowOrdinals.get(field.name) ?? null,
        page: field.widgets?.[0]?.page ?? null
      };
      if (!withDisposition) return context;
      return {
        ...context,
        disposition: completenessDispositionOf({
          printedContext: printedContextOf(context),
          fieldName: field.name,
          protectCategory: field.protectCategory ?? null,
          regionProtectCategory: regionProtectCategoryOf(field.regionHeading),
          documentAcceptsFill: item.policy.documentAcceptsFill,
          documentPolicyReason: item.policy.reason ?? null
        })
      };
    }
    const anchor = anchorsByLabel.get(row.anchor);
    const blank = anchor ? blanksById.get(anchor.blankId) : null;
    const context = {
      printedLabel: blank?.caption ?? anchor?.label ?? row.anchor ?? null,
      sectionHeading: blank?.regionHeading ?? null,
      rowOrdinal: null,
      page: blank?.page ?? anchor?.page ?? null,
      identity: anchor?.blankId ?? null
    };
    if (!withDisposition) return context;
    return {
      ...context,
      disposition: completenessDispositionOf({
        printedContext: printedContextOf(context),
        fieldName: anchor?.blankId ?? row.anchor ?? null,
        protectCategory: blank?.protectCategory ?? null,
        regionProtectCategory: blank?.regionProtectCategory ?? null,
        documentAcceptsFill: item.policy.documentAcceptsFill,
        documentPolicyReason: item.policy.reason ?? null
      })
    };
  };
  return {
    written: report.written.map((row) => withCompletenessDisposition(row, contextFor(row, false))),
    refused: report.refused.map((row) => withCompletenessDisposition(row, contextFor(row, true)))
  };
}

async function combinePacket(familyId, fixture, rendered) {
  const packet = await PDFDocument.create();
  packet.setCreationDate(FIXED_DATE);
  packet.setModificationDate(FIXED_DATE);
  packet.setTitle(`Official-form review fixture: ${familyId} (${fixture})`);
  const pageManifest = [];
  let nextPage = 1;
  for (const item of rendered) {
    const source = await PDFDocument.load(item.bytes, { ignoreEncryption: true, updateMetadata: false });
    const pages = await packet.copyPages(source, source.getPageIndices());
    pages.forEach((page, index) => {
      packet.addPage(page);
      pageManifest.push({ packetPage: nextPage++, formNumber: item.source.formNumber, sourcePage: index + 1, sourceSha256: item.source.sha256 });
    });
  }
  const bytes = await packet.save({ useObjectStreams: false, updateMetadata: false });
  const active = scanBytesForActiveContent(bytes);
  if (!active.inspectable || active.hits.length) throw new Error(`${familyId}/${fixture}: combined packet has active-content residue: ${active.hits.join(", ")}`);
  return { bytes, pageManifest, activeContentScan: active };
}

function popplerEnvironment(fontCache) {
  const bundledFontsConfig = path.resolve(path.dirname(process.execPath),
    "../../native/poppler/poppler/etc/fonts/fonts.conf");
  return {
    ...process.env,
    XDG_CACHE_HOME: fontCache,
    ...(fs.existsSync(bundledFontsConfig) ? { FONTCONFIG_FILE: bundledFontsConfig } : {})
  };
}

async function rasterPacket(file, outDirRel) {
  const outDir = path.join(rootDir, outDirRel);
  const rasterProvenance = assertPopplerAvailable();
  fs.mkdirSync(outDir, { recursive: true });
  for (const name of fs.readdirSync(outDir)) {
    if (/^page-(?:raw-)?\d+\.png$/.test(name)) fs.rmSync(path.join(outDir, name));
  }
  const targetPrefix = path.join(outDir, "page-raw");
  const fontCache = fs.mkdtempSync(path.join(os.tmpdir(), "central-c11-poppler-cache-"));
  let run;
  try {
    run = spawnSync(POPPLER_PDFTOPPM,
      ["-png", "-r", String(RASTER_DPI), file, targetPrefix],
      {
        encoding: "utf8",
        maxBuffer: 64 * 1024 * 1024,
        env: popplerEnvironment(fontCache)
      });
  } finally {
    fs.rmSync(fontCache, { recursive: true, force: true });
  }
  assert.ifError(run.error);
  assert.equal(run.status, 0, `Poppler raster failed for ${file}: ${run.stderr || run.stdout}`);
  const document = await PDFDocument.load(fs.readFileSync(file), { ignoreEncryption: true, updateMetadata: false });
  const geometry = document.getPages().map((page, index) => ({ page: index + 1, ...page.getSize() }));
  const found = fs.readdirSync(outDir)
    .map((name) => ({ name, match: /^page-raw-(\d+)\.png$/.exec(name) }))
    .filter((row) => row.match)
    .map((row) => ({ ...row, page: Number(row.match[1]) }))
    .sort((a, b) => a.page - b.page);
  const pages = [];
  for (const row of found) {
    const output = path.join(outDir, `page-${String(row.page).padStart(2, "0")}.png`);
    fs.renameSync(path.join(outDir, row.name), output);
    const metadata = await sharp(output).metadata();
    const { channels } = await sharp(output).greyscale().stats();
    const pageGeometry = geometry.find((candidate) => candidate.page === row.page);
    const expectedWidth = Math.round(pageGeometry.width * RASTER_DPI / 72);
    const expectedHeight = Math.round(pageGeometry.height * RASTER_DPI / 72);
    const croppedToPage = Math.abs(metadata.width - expectedWidth) <= 1
      && Math.abs(metadata.height - expectedHeight) <= 1;
    const bytes = fs.readFileSync(output);
    pages.push({
      page: row.page,
      file: path.relative(rootDir, output).split(path.sep).join("/"),
      widthPx: metadata.width,
      heightPx: metadata.height,
      pdfWidthPt: pageGeometry.width,
      pdfHeightPt: pageGeometry.height,
      attempts: 1,
      looksBlank: channels[0].max - channels[0].min <= 6,
      croppedToPage,
      engine: rasterProvenance.engine,
      engineDiscoveryMode: rasterProvenance.discoveryMode,
      engineVersion: rasterProvenance.version,
      dpi: RASTER_DPI,
      sha256: sha256(bytes),
      byteLength: bytes.length
    });
  }
  return { pages, rasterProvenance };
}

async function freshRasterEvidence(file, dpi) {
  const rasterProvenance = assertPopplerAvailable();
  const stage = fs.mkdtempSync(path.join(os.tmpdir(), "central-c11-raster-check-"));
  try {
    const prefix = path.join(stage, "page");
    const run = spawnSync(POPPLER_PDFTOPPM,
      ["-png", "-r", String(dpi), file, prefix],
      {
        encoding: "utf8",
        maxBuffer: 64 * 1024 * 1024,
        env: popplerEnvironment(path.join(stage, "font-cache"))
      });
    assert.ifError(run.error);
    assert.equal(run.status, 0, `Fresh Poppler raster failed for ${file}: ${run.stderr || run.stdout}`);
    const document = await PDFDocument.load(fs.readFileSync(file), { ignoreEncryption: true, updateMetadata: false });
    const geometry = document.getPages().map((page, index) => ({ page: index + 1, ...page.getSize() }));
    const found = fs.readdirSync(stage)
      .map((name) => ({ name, match: /^page-(\d+)\.png$/.exec(name) }))
      .filter((row) => row.match)
      .map((row) => ({ ...row, page: Number(row.match[1]) }))
      .sort((a, b) => a.page - b.page);
    const pages = [];
    for (const row of found) {
      const pngPath = path.join(stage, row.name);
      const metadata = await sharp(pngPath).metadata();
      const { channels } = await sharp(pngPath).greyscale().stats();
      const pageGeometry = geometry.find((candidate) => candidate.page === row.page);
      assert.ok(pageGeometry, `${file}: fresh raster page ${row.page} exceeds PDF page count`);
      const expectedWidth = Math.round(pageGeometry.width * dpi / 72);
      const expectedHeight = Math.round(pageGeometry.height * dpi / 72);
      const bytes = fs.readFileSync(pngPath);
      pages.push({
        page: row.page,
        sha256: sha256(bytes),
        byteLength: bytes.length,
        widthPx: metadata.width,
        heightPx: metadata.height,
        looksBlank: channels[0].max - channels[0].min <= 6,
        croppedToPage: Math.abs(metadata.width - expectedWidth) <= 1
          && Math.abs(metadata.height - expectedHeight) <= 1,
      });
    }
    return { pages, rasterProvenance };
  } finally {
    fs.rmSync(stage, { recursive: true, force: true });
  }
}

/*
 * FIX81. The `binding` block a rebuild would otherwise delete.
 *
 * This builder does not author product-wiring.json's `binding`: the Captain
 * writes it after a family terminalizes, and it carries the route keys, the
 * source versions, the last independent verification and the raster acceptance
 * receipt. Rewriting the file from scratch on every rebuild silently removed
 * all of it, which is a deletion nobody decided on.
 *
 * Carried forward here, with exactly two changes, both of them forced by the
 * bytes this build just wrote:
 *
 *   - an acceptance receipt bound to a canonical digest this build did not
 *     produce is set to null, with the superseded digest named, because a
 *     receipt that names a file the tree no longer carries is worse than none;
 *   - `packetComponents` becomes the componentIds this build actually
 *     delivers, so the record and the packet name the same components.
 *
 * Opt-in per family (`carryProductBinding`), so no other family on this shared
 * host changes behaviour.
 */
function carriedProductBinding(familyId, config, canonicalSha256) {
  if (config.carryProductBinding !== true) return null;
  const existing = readJson(`${outputRoot(familyId, config)}/product-wiring.json`)?.binding ?? null;
  if (!existing) return null;
  const binding = JSON.parse(JSON.stringify(existing));
  const delivered = (config.componentDisposition ?? [])
    .filter((row) => String(row.disposition).startsWith("delivered"))
    .map((row) => `component:${row.componentId}`)
    .sort();
  if (delivered.length) binding.packetComponents = delivered;
  const receipt = binding.acceptanceReceipt ?? null;
  if (receipt && canonicalSha256 && receipt.boundToCanonicalSha256 !== canonicalSha256) {
    binding.acceptanceReceipt = null;
    binding.whyTheAcceptanceReceiptIsNull =
      `The receipt was bound to canonical ${receipt.boundToCanonicalSha256}`
      + ` (workflow run ${receipt.workflowRunId ?? "unknown"}), and this build wrote ${canonicalSha256}.`
      + " A central raster of the new bytes is owed; nothing here is that receipt.";
  }
  // A later rebuild must not retain the WIP digest as "this build wrote".
  // Preserve the superseded receipt identity while refreshing only this
  // builder-authored current-artifact clause. The receipt remains null.
  if (!binding.acceptanceReceipt && canonicalSha256 && typeof binding.whyTheAcceptanceReceiptIsNull === "string") {
    binding.whyTheAcceptanceReceiptIsNull = binding.whyTheAcceptanceReceiptIsNull
      .replace(/this build wrote [a-f0-9]{64}/, `this build wrote ${canonicalSha256}`);
  }
  return binding;
}

function commonClosedProductRecord(familyId, config, canonicalSha256 = null) {
  const binding = carriedProductBinding(familyId, config, canonicalSha256);
  return {
    schemaVersion: "rcap-family-product-wiring/v1",
    familyId,
    routeKeys: config.routeKeys,
    routeSelectionId: config.selectionId,
    implementationStrategy: config.outputVehicle.replaceAll("-", "_"),
    generationAllowed: false,
    runtimeSelectable: false,
    commercialRoutesOpened: 0,
    createsFulfillmentRecord: false,
    opensCommercialRoute: false,
    assignmentOwnedPath: config.assignmentOwnedPath,
    evidenceOutputPath: outputRoot(familyId, config),
    note: "Review artifacts and maps create no authority. A route remains closed until exact output-level legal and independent visual approval exists in the separate control plane.",
    /* FIX81. Every component the route names, and what became of it: delivered,
     * conditional and explained, or not generated with a reason. Absent for a
     * family that declares none. */
    ...(config.componentDisposition ? { componentDisposition: config.componentDisposition } : {}),
    ...(binding ? { binding } : {})
  };
}

function expectedStopRecords(familyId, config, resolved) {
  const worklistRows = worklistRowsFor(familyId).map((row) => ({
    implementationStrategy: row.implementationStrategy,
    routeKeys: row.routeKeys,
    ownedPaths: row.ownedPaths
  }));
  return {
    "source-receipt.json": sourceReceipt(familyId, config, resolved),
    "vehicle-conflict-stop.json": {
      schemaVersion: "rcap-family-build-stop/v1",
      familyId,
      status: "STOP",
      stopCode: config.stopCode,
      summary: config.stopSummary,
      requiredResolution: config.requiredResolution,
      worklistRows,
      exactHeldSources: resolved.sources.map((source) => ({
        sourceIds: source.relationshipIds,
        formNumber: source.formNumber,
        pathInArchive: source.path,
        sha256: source.sha256,
        pageCount: source.indexEntry.pageCount,
        structuralClassObserved: source.indexEntry.structuralClassObserved
      })),
      noPleadingInvented: true,
      noInstructionTreatedAsMotion: true,
      generationAllowed: false,
      runtimeSelectable: false,
      commercialRoutesOpened: 0
    },
    "product-wiring.json": { ...commonClosedProductRecord(familyId, config), stopped: true },
    "approval-request.json": {
      schemaVersion: "rcap-output-approval-request/v1",
      familyId,
      status: "NOT_REQUESTED_WHILE_STOPPED",
      blockers: [config.stopCode],
      generationAllowed: false,
      runtimeSelectable: false,
      commercialRoutesOpened: 0
    },
    "build-findings.json": {
      schemaVersion: "rcap-build-findings/v1",
      familyId,
      status: "STOP",
      blocking: [{ code: config.stopCode, summary: config.stopSummary, requiredResolution: config.requiredResolution }],
      findingCount: 1
    },
    "build-status.json": {
      schemaVersion: "rcap-family-build-status/v1",
      familyId,
      status: "STOPPED_WITH_EVIDENCE",
      builtDocuments: 0,
      renderedArtifacts: 0,
      generationAllowed: false,
      runtimeSelectable: false,
      commercialRoutesOpened: 0
    }
  };
}

async function buildStop(familyId, config) {
  const out = outputRoot(familyId, config);
  const resolved = resolveSources(familyId, config);
  const records = expectedStopRecords(familyId, config, resolved);
  for (const [rel, record] of Object.entries(records)) writeJson(`${out}/${rel}`, record);
  console.log(`${familyId}: STOP evidence written (${config.stopCode})`);
}

/*
 * FIX81. The three things this repair can be wrong about, checked in the build.
 *
 * Each of these has a live negative case: change the quoted sentence and the
 * first throws; add, drop or re-role a component and the second throws; write
 * the section and fail to render it and the third throws. A check that cannot
 * fail proves nothing, so none of them is written as a comment.
 */
function assertLocalRulesCheckIsTheMemos() {
  const memo = readJson(LEGAL_DESIGN_MEMO);
  const track = (memo?.tracks ?? []).find((row) => row.trackId === "ne-setaside-custodial");
  assert.ok(track, `${LEGAL_DESIGN_MEMO}: track ne-setaside-custodial is absent`);
  const component = (track.components ?? []).find((row) => row.role === "local_rules_check");
  assert.ok(component, "NE.memo.json: track ne-setaside-custodial declares no local_rules_check component");
  assert.equal(component.requirement, "required");
  assert.equal(component.outputStrategy, "process_guidance");
  assert.equal(component.notes, LOCAL_RULES_CHECK_NOTE,
    "the local-rules check quoted in this builder has drifted from NE.memo.json components[5].notes");
}

function assertComponentDispositionMatchesTheManifest(familyId, config) {
  if (!config.componentDisposition) return;
  const manifests = readJson(PACKET_SET_MANIFESTS);
  const rows = Array.isArray(manifests) ? manifests : (manifests.packetSets ?? Object.values(manifests));
  const set = rows.find((row) => row.packetSetId === familyId);
  assert.ok(set, `${PACKET_SET_MANIFESTS}: no packet set ${familyId}`);
  assert.equal(config.componentDisposition.length, set.components.length,
    `${familyId}: the component table names ${config.componentDisposition.length} of the route's ${set.components.length} components`);
  set.components.forEach((component, index) => {
    const declared = config.componentDisposition[index];
    assert.equal(declared.componentId, component.componentId, `${familyId}: component ${index + 1} identity drift`);
    assert.equal(declared.role, component.role, `${familyId}/${component.componentId}: role drift`);
    assert.equal(declared.requirement, component.requirement, `${familyId}/${component.componentId}: requirement drift`);
    assert.ok(["delivered", "delivered_conditional_and_explained", "not_generated_with_a_reason"].includes(declared.disposition),
      `${familyId}/${component.componentId}: ${declared.disposition} is not a component disposition`);
    if (declared.disposition === "not_generated_with_a_reason") {
      assert.ok(String(declared.reason ?? "").length > 40,
        `${familyId}/${component.componentId}: a component that is not generated must say why`);
    } else {
      assert.ok(String(declared.where ?? "").length > 0,
        `${familyId}/${component.componentId}: a delivered component must name where it is delivered`);
    }
  });
}

/** The delivered guidance really carries the section, not just the config. */
function assertGuidanceReachesTheDeliveredFile(familyId, config, markdown) {
  if (!config.participantGuidance?.localRulesCheck) return;
  assert.ok(markdown.includes("## Confirm what the filing court requires before you file"),
    `${familyId}: the local-rules check section is not in participant-instructions.md`);
  assert.ok(markdown.includes(LOCAL_RULES_CHECK_NOTE),
    `${familyId}: participant-instructions.md does not carry the memo's local-rules sentence`);
  assert.ok(/local practice varies/i.test(markdown),
    `${familyId}: participant-instructions.md never tells the participant that local practice varies`);
}

/** A named-fact write that reached no page is a claim the paper contradicts. */
function assertNamedFactWritesLanded(familyId, item, fixture) {
  const declared = item.policyData.namedFactWrites ?? [];
  for (const entry of declared) {
    for (const field of entry.fields ?? []) {
      const written = item.report.written.find((row) => row.field === field);
      const refused = item.report.refused.find((row) => row.field === field);
      assert.ok(written || refused,
        `${familyId}/${fixture}/${item.source.formNumber}: named-fact target ${field} is neither written nor refused`);
      if (written) {
        assert.equal(written.factId, entry.factId,
          `${familyId}/${fixture}/${item.source.formNumber}/${field}: written from ${written.factId}, declared ${entry.factId}`);
        const proof = item.proof.actualWrites.find((row) => row.field === field);
        assert.ok(proof?.everyWidgetVisibleInArtifactBytes === true,
          `${familyId}/${fixture}/${item.source.formNumber}/${field}: the write is reported but not visible at every measured widget`);
      } else {
        /* A refusal here is only acceptable when the fitter measured it: the
         * value does not fit the printed line at the minimum readable size.
         * Any other refusal means the channel never reached the widget. */
        assert.equal(refused.reason, "narrative_exceeds_the_printed_lines_at_minimum_font",
          `${familyId}/${fixture}/${item.source.formNumber}/${field}: refused as ${refused.reason}, which is not a measurement`);
      }
    }
  }
}

async function buildOfficial(familyId, config) {
  assertLocalRulesCheckIsTheMemos();
  assertComponentDispositionMatchesTheManifest(familyId, config);
  const out = outputRoot(familyId, config);
  const resolved = resolveSources(familyId, config);
  const blockedHashes = new Set(readJson(STALE_BLOCK).hashes ?? []);
  const byFixture = { canonical: [], boundary: [] };
  const findings = [];
  for (const fixture of ["canonical", "boundary"]) {
    for (const source of resolved.sources) {
      const rendered = await renderOneDocument(source, config, fixture);
      assertNamedFactWritesLanded(familyId, rendered, fixture);
      byFixture[fixture].push(rendered);
      findings.push(...rendered.proof.findings);
      console.log(`${familyId}/${fixture}/${source.formNumber}: writes=${rendered.report.written.length} refusals=${rendered.report.refused.length}`);
    }
  }

  const artifacts = [];
  for (const fixture of ["canonical", "boundary"]) {
    const packet = await combinePacket(familyId, fixture, byFixture[fixture]);
    const rel = `${out}/fixtures/${fixture}.pdf`;
    const abs = path.join(rootDir, rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, packet.bytes);
    const digest = sha256(packet.bytes);
    if (blockedHashes.has(digest)) findings.push({ fixture, check: "combined_packet_matches_stale_blocked_hash", sha256: digest });
    const rasterDir = `${out}/raster/${fixture}`;
    const rasterResult = await rasterPacket(abs, rasterDir);
    const rasterPages = rasterResult.pages;
    if (rasterPages.length !== packet.pageManifest.length) findings.push({ fixture, check: "not_every_packet_page_was_rastered", expected: packet.pageManifest.length, actual: rasterPages.length });
    for (const page of rasterPages) {
      if (page.looksBlank || !page.croppedToPage) findings.push({ fixture, page: page.page, check: "raster_is_blank_or_not_cropped_to_page", looksBlank: page.looksBlank, croppedToPage: page.croppedToPage });
    }
    artifacts.push({
      fixture,
      file: rel,
      sha256: digest,
      byteLength: packet.bytes.length,
      pageCount: packet.pageManifest.length,
      pageManifest: packet.pageManifest,
      activeContentScan: packet.activeContentScan,
      rasterEngine: rasterResult.rasterProvenance.engine,
      rasterEngineDiscoveryMode: rasterResult.rasterProvenance.discoveryMode,
      rasterEngineVersion: rasterResult.rasterProvenance.version,
      rasterDpi: RASTER_DPI,
      rasterPages
    });
  }

  const censusDocuments = byFixture.canonical.map((item) => ({
    formNumber: item.source.formNumber,
    sourceSha256: item.source.sha256,
    documentPolicy: item.policy,
    structuralClass: item.census.structuralClass,
    pageGeometry: item.census.pageGeometry,
    fieldCount: item.census.structuralClass === "acroform"
      ? item.census.fields.length
      : item.census.blanks.length + item.census.selectionControls.length,
    selectionControlCount: item.census.selectionControls.length,
    fields: item.census.structuralClass === "acroform"
      ? item.census.fields
      : [...item.census.blanks, ...item.census.selectionControls],
    selectionControls: item.census.selectionControls,
    geometryEvidence: item.census.strokedByPage ?? item.census.geometryEvidence,
    censusBasis: item.census.structuralClass === "acroform"
      ? "widget /Rect geometry and printed-label/page-region context read first hand from pinned bytes"
      : "underscore glyphs, rules, checkbox glyphs, recursive Form-XObject paths, and pinned-source raster-measured controls read first hand from exact bytes"
  }));
  const maps = byFixture.canonical.map((item) => {
    const boundary = byFixture.boundary.find((candidate) => candidate.source.sha256 === item.source.sha256);
    const canonical = dispositionRowsFor(item, item.report);
    const boundaryRows = dispositionRowsFor(boundary, boundary.report);
    return {
      formNumber: item.source.formNumber,
      documentPolicy: item.policy,
      structuralClass: item.census.structuralClass,
      explicitMappings: item.policyData.explicitMappings,
      roleRefusals: item.census.structuralClass === "acroform"
        ? item.policyData.unwritableFields
        : [...item.policyData.withheld, ...item.policyData.selectionControls],
      selectionControls: item.policyData.selectionControls,
      offeredAnchors: item.policyData.anchors ?? null,
      protectedRules: item.policyData.protectedRules ?? null,
      /* FIX81. What this family writes by fact id at a named widget, and which
       * build-policy refusal each such write replaced. Omitted entirely for a
       * document that declares none, so no other family's map gains a key. */
      ...((item.policyData.namedFactWrites ?? []).length
        ? { namedFactWrites: item.policyData.namedFactWrites, namedFactExemptions: item.policyData.namedFactExemptions ?? [] }
        : {}),
      canonicalWrites: canonical.written,
      canonicalRefusals: canonical.refused,
      boundaryWrites: boundaryRows.written,
      boundaryRefusals: boundaryRows.refused
    };
  });
  // Every blank the filing still needs, carried to the participant. A
  // required-before-filing blank is permitted only because the packet says it
  // must be supplied; nothing in these families said so, so the fact was simply
  // missing from the filing.
  /*
   * FIX81. A refusal that was measured says the measurement, in every place a
   * reader of this family can meet it: the canonical rows, the boundary rows,
   * the role-refusal list, and -- through requiredBeforeFilingItems below --
   * the participant's own disclosure table.
   */
  for (const map of maps) {
    const measuredForForm = byFixture.canonical.find((item) => item.source.formNumber === map.formNumber)?.measuredRefusals ?? [];
    if (!measuredForForm.length) continue;
    map.measuredRefusals = measuredForForm;
    for (const rows of [map.canonicalRefusals, map.boundaryRefusals, map.roleRefusals]) {
      applyMeasuredRefusalRows(rows, measuredForForm);
    }
  }
  const requiredBeforeFiling = requiredBeforeFilingItems(maps);
  const actualWrites = ["canonical", "boundary"].flatMap((fixture) => byFixture[fixture].map((item) => ({
    fixture,
    formNumber: item.source.formNumber,
    sourceSha256: item.source.sha256,
    proofMethod: item.census.structuralClass === "acroform"
      ? "flattened widget appearances plus artifact-derived painted paths read back at every measured /Rect"
      : "added glyphs and painted paths derived by subtracting pinned source geometry from finalized artifact geometry",
    actualWrites: item.proof.actualWrites,
    protectedSelectionControls: item.proof.protectedSelectionControls,
    protectedWithheldInk: item.proof.protectedWithheldInk ?? [],
    proofSummary: {
      appearancesRead: item.proof.appearancesRead ?? null,
      addedGlyphs: item.proof.addedGlyphs ?? null,
      addedPaintedPaths: item.proof.addedPaintedPaths ?? null,
      remainingAcroFields: item.proof.remainingAcroFields ?? null,
      selectionControlsProtected: item.proof.protectedSelectionControls.length
    }
  })));

  writeJson(`${out}/source-receipt.json`, sourceReceipt(familyId, config, resolved));
  writeJson(`${out}/field-census.census-v1.json`, {
    schemaVersion: "rcap-official-form-field-census/v1-census-v1",
    familyId,
    routeSelectionId: config.selectionId,
    censusBasis: "first_hand_inspection_of_each_exact_hash_bound_source",
    documents: censusDocuments
  });
  fs.mkdirSync(path.join(rootDir, out), { recursive: true });
  const instructions = participantInstructionsMarkdown(familyId, config, requiredBeforeFiling);
  assertGuidanceReachesTheDeliveredFile(familyId, config, instructions);
  fs.writeFileSync(path.join(rootDir, out, "participant-instructions.md"), instructions);
  writeJson(`${out}/production-field-map.json`, {
    schemaVersion: "rcap-official-form-field-map/v1-census-v1",
    familyId,
    routeKeys: config.routeKeys,
    routeSelectionId: config.selectionId,
    dispositionVocabulary: Object.keys(REFUSAL_CLASSES),
    requiredBeforeFilingCount: requiredBeforeFiling.length,
    requiredBeforeFiling,
    maps,
    generationAllowed: false,
    runtimeSelectable: false,
    commercialRoutesOpened: 0
  });
  writeJson(`${out}/reports/actual-writes.json`, {
    schemaVersion: "rcap-actual-writes-byte-proof/v1",
    familyId,
    derivedFromArtifactBytes: true,
    documents: actualWrites,
    blockingFindings: findings
  });
  writeJson(`${out}/reports/rendered-artifacts.json`, {
    schemaVersion: "rcap-rendered-artifacts/v1",
    familyId,
    renderedFresh: true,
    artifacts,
    everyPageRastered: artifacts.every((artifact) => artifact.rasterPages.length === artifact.pageCount),
    byteDerivedHashes: true
  });
  writeJson(`${out}/product-wiring.json`, commonClosedProductRecord(familyId, config,
    artifacts.find((artifact) => artifact.fixture === "canonical")?.sha256 ?? null));
  writeJson(`${out}/approval-request.json`, {
    schemaVersion: "rcap-output-approval-request/v1",
    familyId,
    routeKeys: config.routeKeys,
    status: "REQUESTED",
    grantedBy: null,
    exactSourceReviewComplete: true,
    independentVisualReviewRequired: true,
    outputLegalApprovalRequired: true,
    generationAllowed: false,
    runtimeSelectable: false,
    commercialRoutesOpened: 0
  });
  writeJson(`${out}/build-findings.json`, {
    schemaVersion: "rcap-build-findings/v1",
    familyId,
    blocking: findings,
    findingCount: findings.length,
    observations: [
      "Signature and signing-date facts are never eligible for prefill.",
      "Unmailed service certificates and recipient acceptances are left blank.",
      "Court, prosecutor, clerk, agency, victim, notary, and judicial-officer fields are refused by role.",
      "Flat-form anchors are authored from first-hand CTM geometry and admitted only through an exact caption gate.",
      "No checkbox or radio election is made by this builder; an election the route determines is named as unmade rather than described as the participant's.",
      `${requiredBeforeFiling.length} field(s) the filing needs are classified required-before-filing and surfaced in participant-instructions.md rather than guessed.`,
      ...(config.componentDisposition
        ? [`Every one of the route's ${config.componentDisposition.length} declared components is delivered, conditional and explained, or recorded as not generated with a reason; product-wiring.json componentDisposition carries the table and it is asserted against the committed packet-set manifest on every build.`]
        : []),
      ...(config.namedFactWrites
        ? [`Facts the platform holds are written at the widget the pinned form prints the caption for, through the shared finalizer's fact-id channel, where the shared descriptor list matches the harvested caption and nothing else does; production-field-map.json namedFactWrites and namedFactExemptions name each one and the build-policy refusal it replaced.`]
        : [])
    ]
  });
  writeJson(`${out}/build-status.json`, {
    schemaVersion: "rcap-family-build-status/v1",
    familyId,
    status: findings.length ? "BUILT_WITH_BLOCKING_FINDINGS" : "BUILT_REVIEW_PENDING",
    builtDocuments: resolved.sources.length,
    renderedArtifacts: artifacts.length,
    rasterPages: artifacts.reduce((count, artifact) => count + artifact.rasterPages.length, 0),
    generationAllowed: false,
    runtimeSelectable: false,
    commercialRoutesOpened: 0
  });
  if (findings.length) throw new Error(`${familyId}: ${findings.length} blocking byte/raster finding(s); see ${out}/build-findings.json`);
  console.log(`${familyId}: built ${resolved.sources.length} exact document(s), 2 packet fixtures, ${artifacts.reduce((n, artifact) => n + artifact.rasterPages.length, 0)} raster page(s)`);
}

export async function checkFamily(familyId) {
  const config = FAMILY_CONFIGS[familyId];
  if (!config) throw new Error(`unknown CENTRAL family: ${familyId}`);
  const out = outputRoot(familyId, config);
  const required = config.action === "STOP"
    ? ["source-receipt.json", "vehicle-conflict-stop.json", "product-wiring.json", "approval-request.json", "build-findings.json", "build-status.json"]
    : ["source-receipt.json", "field-census.census-v1.json", "production-field-map.json", "reports/actual-writes.json", "reports/rendered-artifacts.json", "product-wiring.json", "approval-request.json", "build-findings.json", "build-status.json"];
  const requiredText = config.action === "STOP" ? [] : ["participant-instructions.md"];
  for (const rel of requiredText) if (!fs.existsSync(path.join(rootDir, out, rel))) throw new Error(`${familyId}: missing ${out}/${rel}`);
  for (const rel of required) if (!fs.existsSync(path.join(rootDir, out, rel))) throw new Error(`${familyId}: missing ${out}/${rel}`);
  const records = Object.fromEntries(required.map((rel) => [rel, readJson(`${out}/${rel}`)]));
  for (const [rel, record] of Object.entries(records)) {
    assertFailClosedEvidence(record, `${familyId}/${rel}`);
  }
  const product = records["product-wiring.json"];
  assert.equal(product.generationAllowed, false);
  assert.equal(product.runtimeSelectable, false);
  assert.equal(product.commercialRoutesOpened, 0);
  assert.equal(product.createsFulfillmentRecord, false);
  assert.equal(product.opensCommercialRoute, false);
  assert.deepEqual(product, config.action === "STOP"
    ? { ...commonClosedProductRecord(familyId, config), stopped: true }
    : commonClosedProductRecord(familyId, config),
    `${familyId}: deterministic closed product wiring drift`);
  const receipt = records["source-receipt.json"];
  const resolved = resolveSources(familyId, config);
  assert.deepEqual(receipt, sourceReceipt(familyId, config, resolved),
    `${familyId}: deterministic source receipt drift`);
  assert.equal(receipt.documents.length, resolved.sources.length,
    `${familyId}: source receipt count drift`);
  for (const source of resolved.sources) {
    const document = receipt.documents.find((row) => row.sha256 === source.sha256);
    assert.ok(document, `${familyId}/${source.formNumber}: exact source is absent from receipt`);
    assert.equal(document.pathInArchive, source.path);
    assert.equal(document.byteLength, source.bytes.length);
    assert.equal(document.exactHashVerified, true);
    assert.equal(document.corpusIndexAgrees, true);
  }
  if (config.action === "STOP") {
    const expected = expectedStopRecords(familyId, config, resolved);
    assertStopEvidenceMatches(records, expected, familyId);
    console.log(`${familyId}: --check OK (intentional STOP ${expected["vehicle-conflict-stop.json"].stopCode})`);
    return;
  }
  const findings = records["build-findings.json"];
  assert.equal(findings.findingCount, 0, `${familyId}: blocking findings remain`);
  assert.deepEqual(findings.blocking, [], `${familyId}: blocking finding rows remain`);
  const approval = records["approval-request.json"];
  assert.equal(approval.status, "REQUESTED", `${familyId}: output approval status is not fail-closed`);
  assert.equal(approval.grantedBy, null, `${familyId}: output approval must remain ungranted`);
  assert.equal(approval.independentVisualReviewRequired, true);
  assert.equal(approval.outputLegalApprovalRequired, true);
  const census = records["field-census.census-v1.json"];
  const fieldMap = records["production-field-map.json"];
  assert.equal(census.documents.length, resolved.sources.length,
    `${familyId}: field-census document count drift`);
  assert.equal(fieldMap.maps.length, resolved.sources.length,
    `${familyId}: field-map document count drift`);
  for (const document of census.documents) {
    const map = fieldMap.maps.find((row) => row.formNumber === document.formNumber);
    assert.ok(map, `${familyId}/${document.formNumber}: field map missing`);
    assert.equal(document.selectionControlCount, document.selectionControls.length,
      `${familyId}/${document.formNumber}: selection-control census count drift`);
    assert.equal(map.selectionControls.length, document.selectionControlCount,
      `${familyId}/${document.formNumber}: selection-control disposition count drift`);
    assert.ok(map.selectionControls.every((control) => control.disposition === "explicit_refusal"),
      `${familyId}/${document.formNumber}: selection control lacks explicit refusal`);
    if (document.structuralClass === "acroform") {
      const canonicalDisposition = [...map.canonicalWrites, ...map.canonicalRefusals];
      const boundaryDisposition = [...map.boundaryWrites, ...map.boundaryRefusals];
      for (const [fixture, rows] of [["canonical", canonicalDisposition], ["boundary", boundaryDisposition]]) {
        assert.equal(rows.length, document.fields.length,
          `${familyId}/${document.formNumber}/${fixture}: AcroForm write/refusal partition is incomplete`);
        assert.equal(new Set(rows.map((row) => row.field)).size, document.fields.length,
          `${familyId}/${document.formNumber}/${fixture}: AcroForm field was omitted or disposed twice`);
      }
    } else {
      const blankIds = document.fields.filter((row) => row.blankId).map((row) => row.blankId);
      const dispositionIds = [
        ...(map.offeredAnchors ?? []).map((row) => row.blankId),
        ...map.roleRefusals.filter((row) => row.blankId).map((row) => row.blankId),
      ];
      assert.equal(dispositionIds.length, blankIds.length,
        `${familyId}/${document.formNumber}: flat blank write/refusal partition is incomplete`);
      assert.equal(new Set(dispositionIds).size, blankIds.length,
        `${familyId}/${document.formNumber}: flat blank was omitted or disposed twice`);
    }
  }
  const storedRequired = requiredBeforeFilingItems(fieldMap.maps);
  assert.deepEqual(fieldMap.requiredBeforeFiling ?? [], storedRequired,
    `${familyId}: required-before-filing disclosure does not match the field map it is derived from`);
  assert.equal(fieldMap.requiredBeforeFilingCount, storedRequired.length,
    `${familyId}: required-before-filing count drift`);
  assert.equal(
    fs.readFileSync(path.join(rootDir, out, "participant-instructions.md"), "utf8"),
    participantInstructionsMarkdown(familyId, config, storedRequired),
    `${familyId}: the packet's required-before-filing disclosure has drifted from the field map`);
  for (const map of fieldMap.maps) {
    for (const row of [...map.canonicalRefusals, ...map.boundaryRefusals, ...map.roleRefusals, ...map.selectionControls]) {
      const declared = row.completenessClass ?? null;
      assert.ok(declared === null || Object.hasOwn(REFUSAL_CLASSES, declared),
        `${familyId}/${map.formNumber}: refusal class ${declared} is outside the closed disposition vocabulary`);
    }
  }
  const rendered = records["reports/rendered-artifacts.json"];
  assert.equal(rendered.renderedFresh, true);
  assert.equal(rendered.byteDerivedHashes, true);
  assert.equal(rendered.artifacts.length, 2);
  assert.equal(rendered.everyPageRastered, true);
  for (const artifact of rendered.artifacts) {
    const pdfBytes = fs.readFileSync(path.join(rootDir, artifact.file));
    assert.equal(sha256(pdfBytes), artifact.sha256, `${familyId}/${artifact.fixture}: PDF hash drift`);
    assert.equal(pdfBytes.length, artifact.byteLength, `${familyId}/${artifact.fixture}: PDF length drift`);
    const pdf = await PDFDocument.load(pdfBytes, { ignoreEncryption: true, updateMetadata: false });
    const pages = pdf.getPages();
    assert.equal(pages.length, artifact.pageCount, `${familyId}/${artifact.fixture}: PDF page-count drift`);
    assert.equal(artifact.pageManifest.length, artifact.pageCount,
      `${familyId}/${artifact.fixture}: page manifest is incomplete`);
    const storedRasterProvenance = {
      engine: artifact.rasterEngine,
      discoveryMode: artifact.rasterEngineDiscoveryMode,
      version: artifact.rasterEngineVersion,
    };
    assert.equal(storedRasterProvenance.engine, "poppler_pdftoppm");
    assert.ok(["RCAP_PDFTOPPM", "PATH"].includes(storedRasterProvenance.discoveryMode));
    assert.match(storedRasterProvenance.version, /^\S+$/);
    assert.equal(artifact.rasterDpi, RASTER_DPI);
    assert.equal(artifact.rasterPages.length, artifact.pageCount);
    assert.deepEqual(artifact.rasterPages.map((page) => page.page),
      Array.from({ length: artifact.pageCount }, (_, index) => index + 1),
      `${familyId}/${artifact.fixture}: raster page sequence is incomplete`);
    for (const page of artifact.rasterPages) {
      const pngPath = path.join(rootDir, page.file);
      const png = fs.readFileSync(pngPath);
      assert.equal(sha256(png), page.sha256, `${familyId}/${artifact.fixture}/page-${page.page}: PNG hash drift`);
      assert.equal(png.length, page.byteLength, `${familyId}/${artifact.fixture}/page-${page.page}: PNG length drift`);
      assert.equal(page.engine, storedRasterProvenance.engine);
      assert.equal(page.engineDiscoveryMode, storedRasterProvenance.discoveryMode);
      assert.equal(page.engineVersion, storedRasterProvenance.version);
      assert.equal(page.dpi, RASTER_DPI);
      const metadata = await sharp(pngPath).metadata();
      const { channels } = await sharp(pngPath).greyscale().stats();
      const recomputedBlank = channels[0].max - channels[0].min <= 6;
      assert.equal(metadata.format, "png");
      assert.equal(metadata.width, page.widthPx);
      assert.equal(metadata.height, page.heightPx);
      assert.equal(recomputedBlank, false, `${page.file}: raster is blank`);
      assert.equal(page.looksBlank, recomputedBlank, `${page.file}: stored blank flag drift`);
      const geometry = pages[page.page - 1].getSize();
      const expectedWidth = Math.round(geometry.width * RASTER_DPI / 72);
      const expectedHeight = Math.round(geometry.height * RASTER_DPI / 72);
      const recomputedCrop = Math.abs(metadata.width - expectedWidth) <= 1
        && Math.abs(metadata.height - expectedHeight) <= 1;
      assert.equal(recomputedCrop, true, `${page.file}: raster is not cropped to the PDF page`);
      assert.equal(page.croppedToPage, recomputedCrop, `${page.file}: stored crop flag drift`);
    }
    const freshRaster = await freshRasterEvidence(path.join(rootDir, artifact.file), artifact.rasterDpi);
    assert.deepEqual(freshRaster.rasterProvenance, storedRasterProvenance,
      `${familyId}/${artifact.fixture}: live Poppler identity/version drift`);
    assert.equal(freshRaster.pages.length, artifact.pageCount,
      `${familyId}/${artifact.fixture}: fresh raster page coverage is incomplete`);
    assert.deepEqual(freshRaster.pages.map((page) => page.page),
      Array.from({ length: artifact.pageCount }, (_, index) => index + 1),
      `${familyId}/${artifact.fixture}: fresh raster page sequence is incomplete`);
    assert.ok(freshRaster.pages.every((page) => !page.looksBlank && page.croppedToPage),
      `${familyId}/${artifact.fixture}: fresh raster is blank or not cropped to the PDF page`);
    assertFreshRasterEvidence(artifact.rasterPages, freshRaster.pages,
      `${familyId}/${artifact.fixture}`);
  }
  const buildStatus = records["build-status.json"];
  assert.equal(buildStatus.status, "BUILT_REVIEW_PENDING",
    `${familyId}: build status must remain review-pending`);
  assert.equal(buildStatus.builtDocuments, resolved.sources.length);
  assert.equal(buildStatus.renderedArtifacts, rendered.artifacts.length);
  assert.equal(buildStatus.rasterPages,
    rendered.artifacts.reduce((count, artifact) => count + artifact.rasterPages.length, 0));
  const writes = records["reports/actual-writes.json"];
  assert.equal(writes.derivedFromArtifactBytes, true);
  assert.equal(writes.blockingFindings.length, 0);
  for (const document of writes.documents) {
    assert.ok(document.protectedSelectionControls.every((control) => control.generatedSelection === false),
      `${familyId}/${document.formNumber}/${document.fixture}: selection protection failed`);
    assert.deepEqual(document.protectedWithheldInk ?? [], [],
      `${familyId}/${document.formNumber}/${document.fixture}: withheld blank carries generated ink`);
  }
  // Recompute the census, finalizer decisions, actual-write proof, protected
  // control proof, and deterministic packet bytes from the currently bound
  // sources. A stored report cannot validate itself, and --check remains
  // read-only because every intermediate artifact stays in memory or a cleaned
  // proof temp directory.
  for (const fixture of ["canonical", "boundary"]) {
    const recomputed = [];
    for (const source of resolved.sources) {
      const fresh = await renderOneDocument(source, config, fixture);
      recomputed.push(fresh);
      const storedCensus = census.documents.find((row) => row.formNumber === source.formNumber);
      const storedMap = fieldMap.maps.find((row) => row.formNumber === source.formNumber);
      const storedProof = writes.documents.find((row) => row.formNumber === source.formNumber && row.fixture === fixture);
      assert.ok(storedCensus && storedMap && storedProof,
        `${familyId}/${source.formNumber}/${fixture}: stored evidence partition is incomplete`);
      assert.deepEqual(fresh.census.selectionControls, storedCensus.selectionControls,
        `${familyId}/${source.formNumber}: live selection-control census drift`);
      assert.equal(fresh.census.structuralClass === "acroform" ? fresh.census.fields.length
        : fresh.census.blanks.length + fresh.census.selectionControls.length, storedCensus.fieldCount,
      `${familyId}/${source.formNumber}: live census count drift`);
      assert.deepEqual(fresh.policyData.selectionControls, storedMap.selectionControls,
        `${familyId}/${source.formNumber}: live selection refusal map drift`);
      assert.deepEqual(fresh.policyData.explicitMappings, storedMap.explicitMappings,
        `${familyId}/${source.formNumber}: live explicit mapping drift`);
      assert.deepEqual(fresh.policyData.anchors ?? null, storedMap.offeredAnchors,
        `${familyId}/${source.formNumber}: live anchor map drift`);
      assert.deepEqual(fresh.policyData.protectedRules ?? null, storedMap.protectedRules,
        `${familyId}/${source.formNumber}: live protected-rule map drift`);
      const freshRows = dispositionRowsFor(fresh, fresh.report);
      /* FIX81. The same measurement pass the build applies, so a measured
       * refusal is not read as drift. */
      applyMeasuredRefusalRows(freshRows.refused, fresh.measuredRefusals ?? []);
      applyMeasuredRefusalRows(fresh.policyData.unwritableFields, fresh.measuredRefusals ?? []);
      assert.deepEqual(freshRows.written,
        fixture === "canonical" ? storedMap.canonicalWrites : storedMap.boundaryWrites,
      `${familyId}/${source.formNumber}/${fixture}: live write disposition drift`);
      assert.deepEqual(freshRows.refused,
        fixture === "canonical" ? storedMap.canonicalRefusals : storedMap.boundaryRefusals,
      `${familyId}/${source.formNumber}/${fixture}: live refusal disposition drift`);
      assert.deepEqual(fresh.proof.actualWrites, storedProof.actualWrites,
        `${familyId}/${source.formNumber}/${fixture}: live actual-write proof drift`);
      assert.deepEqual(fresh.proof.protectedSelectionControls, storedProof.protectedSelectionControls,
        `${familyId}/${source.formNumber}/${fixture}: live protected-control proof drift`);
      assert.deepEqual(fresh.proof.protectedWithheldInk ?? [], storedProof.protectedWithheldInk ?? [],
        `${familyId}/${source.formNumber}/${fixture}: live withheld-blank proof drift`);
      assert.deepEqual(fresh.proof.findings, [],
        `${familyId}/${source.formNumber}/${fixture}: live artifact proof has blocking findings`);
    }
    const packet = await combinePacket(familyId, fixture, recomputed);
    const storedArtifact = rendered.artifacts.find((artifact) => artifact.fixture === fixture);
    assert.ok(storedArtifact, `${familyId}/${fixture}: stored packet artifact missing`);
    assert.equal(sha256(packet.bytes), storedArtifact.sha256,
      `${familyId}/${fixture}: deterministic packet does not match live source-derived build`);
    assert.equal(packet.bytes.length, storedArtifact.byteLength,
      `${familyId}/${fixture}: deterministic packet byte length drift`);
    assert.deepEqual(packet.pageManifest, storedArtifact.pageManifest,
      `${familyId}/${fixture}: live packet component manifest drift`);
  }
  console.log(`${familyId}: --check OK (${rendered.artifacts.reduce((count, artifact) => count + artifact.rasterPages.length, 0)} raster pages)`);
}

export async function runSelfTests() {
  assert.equal(typeof assertFailClosedEvidence, "function",
    "the checker must expose a recursive fail-closed evidence assertion");
  assert.equal(typeof popplerEvidenceFromProbe, "function",
    "Poppler provenance must be derived through a path-free evidence parser");
  assert.equal(typeof assertStopEvidenceMatches, "function",
    "STOP evidence must be compared as a complete deterministic record set");
  assert.equal(typeof assertFreshRasterEvidence, "function",
    "--check must compare freshly rendered page evidence with every stored raster page");
  assert.doesNotThrow(() => assertFailClosedEvidence({
    generationAllowed: false,
    nested: {
      runtimeSelectable: false,
      commercialRoutesOpened: 0,
      createsFulfillmentRecord: false,
      opensCommercialRoute: false,
      grantedBy: null,
    },
  }, "synthetic-closed-record"));
  for (const unsafe of [
    { generationAllowed: true },
    { nested: { runtimeSelectable: true } },
    { nested: { commercialRoutesOpened: 1 } },
    { createsFulfillmentRecord: true },
    { opensCommercialRoute: true },
    { grantedBy: "reviewer" },
  ]) {
    assert.throws(() => assertFailClosedEvidence(unsafe, "synthetic-open-record"),
      /fail-closed evidence violation/,
      "every route-opening or approval signal must fail closed during --check");
  }
  const parsedPoppler = popplerEvidenceFromProbe({
    configuredByEnvironment: false,
    stdout: "",
    stderr: "pdftoppm version 25.06.0\nCopyright 2005-2025 The Poppler Developers",
  });
  assert.deepEqual(parsedPoppler, {
    engine: "poppler_pdftoppm",
    discoveryMode: "PATH",
    version: "25.06.0",
  });
  assert.equal(JSON.stringify(parsedPoppler).includes("/Users/"), false,
    "raster provenance must never persist a raw executable path");
  const expectedStop = { stop: { stopCode: "EXPECTED", commercialRoutesOpened: 0 } };
  assert.doesNotThrow(() => assertStopEvidenceMatches(expectedStop, expectedStop, "synthetic-stop"));
  assert.throws(() => assertStopEvidenceMatches(
    { stop: { stopCode: "DRIFTED", commercialRoutesOpened: 0 } },
    expectedStop,
    "synthetic-stop",
  ), /deterministic STOP evidence drift/,
  "STOP evidence drift must make --check fail");
  const rasterPage = {
    page: 1,
    sha256: "a".repeat(64),
    byteLength: 123,
    widthPx: 612,
    heightPx: 792,
    looksBlank: false,
    croppedToPage: true,
  };
  assert.doesNotThrow(() => assertFreshRasterEvidence([rasterPage], [rasterPage], "synthetic-raster"));
  assert.throws(() => assertFreshRasterEvidence(
    [rasterPage],
    [{ ...rasterPage, sha256: "b".repeat(64) }],
    "synthetic-raster",
  ), /fresh raster evidence drift/,
  "a substituted raster plus updated metadata must not self-attest during --check");
  const rasterStage = fs.mkdtempSync(path.join(os.tmpdir(), "central-c11-raster-self-test-"));
  try {
    const syntheticPdf = await PDFDocument.create();
    const syntheticPage = syntheticPdf.addPage([72, 72]);
    syntheticPage.drawText("CENTRAL QA", { x: 8, y: 32, size: 8 });
    const syntheticPdfPath = path.join(rasterStage, "synthetic.pdf");
    fs.writeFileSync(syntheticPdfPath, await syntheticPdf.save({ useObjectStreams: false }));
    const fresh = await freshRasterEvidence(syntheticPdfPath, RASTER_DPI);
    assert.equal(fresh.pages.length, 1, "fresh raster self-test must cover the only PDF page");
    assert.equal(fresh.pages[0].page, 1);
    assert.equal(fresh.pages[0].looksBlank, false);
    assert.equal(fresh.pages[0].croppedToPage, true);
    assert.equal(fresh.pages[0].widthPx, 72);
    assert.equal(fresh.pages[0].heightPx, 72);
  } finally {
    fs.rmSync(rasterStage, { recursive: true, force: true });
  }
  assert.equal(
    process.env.RCAP_PDFTOPPM ? true : POPPLER_PDFTOPPM === "pdftoppm",
    true,
    "Poppler discovery must use RCAP_PDFTOPPM or PATH, never a host-specific absolute fallback"
  );
  const livePoppler = assertPopplerAvailable();
  assert.equal(livePoppler.engine, "poppler_pdftoppm");
  assert.equal(livePoppler.discoveryMode,
    process.env.RCAP_PDFTOPPM ? "RCAP_PDFTOPPM" : "PATH");
  assert.match(livePoppler.version, /^\S+$/);
  assert.equal(JSON.stringify(livePoppler).includes("/"), false,
    "live raster provenance must not persist the executable path");
  const syntheticControls = selectionControlsOfPage({
    page: 1,
    lines: [{
      y: 100,
      size: 10,
      text: "[ ] Participant election",
      chars: [
        { c: "[", x: 10, w: 3 },
        { c: " ", x: 13, w: 3 },
        { c: "]", x: 16, w: 3 }
      ]
    }],
    content: "100 100 10 10 re S"
  });
  assert.equal(syntheticControls.length, 2,
    "printed and vector selection controls must both be censused");
  assert.equal(
    addedGlyphsInSelectionControls([{ page: 1, x: 11, y: 101, w: 2, c: "X" }], syntheticControls).length,
    1,
    "added selection ink must be detected from artifact bytes"
  );
  const glyphControls = selectionControlsOfPage({
    page: 2,
    lines: [{ y: 456, size: 9, text: "\u0002 Indigency election",
      chars: [{ c: "\u0002", x: 26.7, w: 4.5 }, { c: " ", x: 31.2, w: 4.5 }] }],
    content: "",
  });
  assert.equal(glyphControls.length, 1, "symbol-font selection glyph must be censused");
  const recursiveBoxes = boxedEntryControlsOfPage({
    page: 2, lines: [], paths: [
      { stream: "page>form", pathIndex: 1, operator: "re", paintedBy: "S", x: 100, y: 200, width: 80, height: 14 },
    ],
  });
  assert.equal(recursiveBoxes.length, 1, "recursive Form-XObject boxed entry must be censused");
  assert.equal(sourceSpecificFlatControls({ formNumber: "UT-BCI-EXP-APPLICATION", sha256: UT_BCI_APPLICATION_SHA256 }, 2, 612, 792).length,
    30, "pinned UT BCI raster measurements must cover six payment choices and twenty-four segmented cells");
  assert.equal(addedPathsInSelectionControls([
    { page: 1, operator: "l", paintedBy: "S", x: 12, y: 102, width: 4, height: 4 },
  ], syntheticControls).length, 1, "added vector selection ink must be detected from artifact bytes");
  assert.equal(RASTER_DPI >= 72 && RASTER_DPI <= 96, true, "raster DPI must stay in the approved modest range");
  assert.equal(classifyFamilyAction("ne-setaside-custodial-set"), "BUILD");
  assert.equal(classifyFamilyAction("ne-setaside-noncustodial-set"), "STOP");
  assert.equal(classifyFamilyAction("ne-trafficking-setaside-and-seal-set"), "STOP");
  assert.equal(classifyFamilyAction("ut_pet_traffic-set"), "BUILD");
  assert.equal(classifyFamilyAction("not-a-family"), "UNKNOWN");
  assert.equal(
    factsFor(FAMILY_CONFIGS["ut_pet_traffic-set"], "boundary")["participant.full_legal_name"],
    "Alexandrina-Katharine Montgomery-Vandenberg-Oyelaran Fitzwilliam",
    "the shared Utah boundary name must remain fully visible in the narrow measured name blanks"
  );
  assert.equal(approvedFactLabel("participant.full_legal_name", "Full legal name"), true);
  assert.equal(approvedFactLabel("participant.full_legal_name", "Petitioner"), false);
  assert.equal(approvedFactLabel("matter.case_number", "Case Number"), true);
  assert.equal(approvedFactLabel("participant.state", "State of Utah"), false);
  assert.equal(unsafeReason("Signature date", null, "deterministic.filing_date"), "actor_or_post_event_field_not_owned_by_participant");
  assert.equal(unsafeReason("Date of birth", null, "participant.date_of_birth"), null);
  // --- completeness disposition -------------------------------------------------
  for (const declared of [
    "signature_or_date_participant_completion",
    "court_prosecutor_clerk_or_agency_owned",
    "participant_sworn_narrative_or_legal_election"
  ]) {
    assert.equal(Object.hasOwn(REFUSAL_CLASSES, declared), true,
      `${declared} must remain a class of the shared closed disposition vocabulary`);
  }
  assert.equal(printedContextOf({ label: "vs", sectionHeading: null }), "vs");
  assert.equal(printedContextOf({ label: null, sectionHeading: null }), null);
  assert.equal(printedContextOf({ label: "Charge", sectionHeading: "OFFENSES", rowOrdinal: 2 }),
    "OFFENSES · Charge · row 2",
    "a repeating cell must publish the row it belongs to, or a half-filled row reads as a finished one");
  assert.equal(printedContextOf({ label: "ORDER", sectionHeading: "ORDER" }), "ORDER",
    "a label that repeats its own heading must not be published twice");
  const chargeRows = chargeRowOrdinals([
    "PetAdd1", "PetAdd2", "Charge1", "CaseNo1", "Charge2", "CaseNo2", "PetitionersCurrentName1"
  ]);
  assert.deepEqual([...chargeRows.entries()].sort(),
    [["CaseNo1", 1], ["CaseNo2", 2], ["Charge1", 1], ["Charge2", 2]],
    "a charge row is a charge row; two lines of one address are not two rows");
  assert.equal(chargeRowOrdinals(["Text2", "Text5", "Text6"]).size, 0,
    "one stem repeating is a list of unrelated boxes, not a table");
  assert.equal(
    completenessDispositionOf({ printedContext: "Petitioner Signature", protectCategory: "signature" }).refusalClass,
    "signature_or_date_participant_completion");
  assert.equal(
    completenessDispositionOf({ printedContext: "Judge", protectCategory: "court" }).refusalClass,
    "court_prosecutor_clerk_or_agency_owned");
  const agency = completenessDispositionOf({ printedContext: "Arresting agency", protectCategory: "agency" });
  assert.equal(agency.refusalClass, null,
    "an agency name must not hide inside the protected court/clerk/prosecutor class");
  assert.equal(agency.requiredBeforeFiling, true,
    "an arresting agency is a case fact the participant holds; it is surfaced, never guessed");
  assert.equal(completenessDispositionOf({ printedContext: "PrintForm" }).requiredBeforeFiling, false,
    "a viewer control is not a filing fact");
  assert.equal(completenessDispositionOf({ printedContext: "E-mail Address" }).requiredBeforeFiling, true,
    "a contact fact the packet leaves blank is required before filing, not silently dropped");
  const routeElection = electionDispositionOf({
    printedContext: "Eligible for set-aside under section 29-2264",
    routeKey: "obligation:track-pathway:NE:ne-setaside-custodial:set-aside-incarceration-one-year-or-less"
  });
  assert.equal(routeElection.routeDetermined, true,
    "a packet built for one statutory route must state which route it is");
  assert.equal(routeElection.refusalClass, null,
    "a route election is not the participant's to make, so no participant-election class may excuse it");
  assert.equal(
    electionDispositionOf({ printedContext: "I request a waiver of fees" }).refusalClass,
    "participant_sworn_narrative_or_legal_election",
    "an election the route does not determine still belongs to the participant");
  const enriched = withCompletenessDisposition(
    { field: "emailaddress", reason: "no_allowlisted_fact_matches", category: null },
    {
      printedLabel: "E-mail Address", sectionHeading: null, rowOrdinal: null, page: 1,
      disposition: completenessDispositionOf({ printedContext: "E-mail Address", fieldName: "emailaddress" })
    });
  assert.equal(enriched.field, "emailaddress", "the exact PDF field name must survive enrichment");
  assert.equal(enriched.regionHeading, "E-mail Address");
  assert.equal(enriched.buildPolicyReason, "no_allowlisted_fact_matches",
    "the build's own words are kept beside the disposition that replaced them, not deleted");
  assert.equal(enriched.requiredBeforeFiling, true);
  assert.equal(withCompletenessDisposition({ field: "x", reason: "r" }, null).reason, "r",
    "a row with no measured context is passed through unchanged rather than guessed at");
  const disclosure = requiredBeforeFilingItems([{
    formNumber: "CC-6-11",
    canonicalRefusals: [{ field: "emailaddress", regionHeading: "E-mail Address", page: 1, requiredBeforeFiling: true, why: "needed" }],
    roleRefusals: [{ field: "emailaddress", regionHeading: "E-mail Address", page: 1, requiredBeforeFiling: true, why: "needed" }],
    selectionControls: [{ field: "sig", regionHeading: "Signature", requiredBeforeFiling: false }]
  }]);
  assert.equal(disclosure.length, 1, "one field is disclosed once, however many map rows mention it");
  assert.match(participantInstructionsMarkdown("ne-setaside-custodial-set", FAMILY_CONFIGS["ne-setaside-custodial-set"], disclosure),
    /E-mail Address/, "a required-before-filing field must reach the participant by name");

  const selections = new Set(Object.values(FAMILY_CONFIGS).map((config) => config.selectionId));
  assert.equal(selections.size, Object.keys(FAMILY_CONFIGS).length, "route-specific selections must remain distinct");
  for (const [familyId, config] of Object.entries(FAMILY_CONFIGS)) {
    assert.equal(config.routeKeys.length > 0, true, `${familyId}: route keys required`);
    assert.equal(config.sourceIds.length > 0, true, `${familyId}: source ids required`);
    assert.equal(outputRoot(familyId, config), config.assignmentOwnedPath,
      `${familyId}: output root must equal the exact assignment-owned path`);
  }
  /*
   * FIX81 self-tests. Each one is run against its own negative case, because a
   * check that passes whatever it is given is not a check.
   */
  assertLocalRulesCheckIsTheMemos();
  assertComponentDispositionMatchesTheManifest("ne-setaside-custodial-set", FAMILY_CONFIGS["ne-setaside-custodial-set"]);
  {
    const family = FAMILY_CONFIGS["ne-setaside-custodial-set"];
    // The section is rendered and carries the memo's sentence.
    const markdown = participantGuidanceMarkdown(family.participantGuidance).join("\n");
    assertGuidanceReachesTheDeliveredFile("ne-setaside-custodial-set", family, markdown);
    // Negative case: guidance without the section must be caught.
    assert.throws(() => assertGuidanceReachesTheDeliveredFile("ne-setaside-custodial-set", family,
      markdown.replace("## Confirm what the filing court requires before you file", "## Something else")),
      /local-rules check section is not in participant-instructions.md/);
    // Negative case: a component table that drops a component must be caught.
    assert.throws(() => assertComponentDispositionMatchesTheManifest("ne-setaside-custodial-set",
      { ...family, componentDisposition: family.componentDisposition.slice(0, 5) }),
      /component table names 5 of the route's 6 components/);
    // Negative case: a re-roled component must be caught.
    assert.throws(() => assertComponentDispositionMatchesTheManifest("ne-setaside-custodial-set",
      { ...family, componentDisposition: family.componentDisposition.map((row, index) =>
        index === 5 ? { ...row, role: "instructions" } : row) }),
      /role drift/);
    // Every fact a named-fact write names is held for BOTH personas.
    for (const fixture of ["canonical", "boundary"]) {
      const facts = factsFor(family, fixture);
      for (const entries of Object.values(family.namedFactWrites)) {
        for (const entry of entries) {
          const value = facts[entry.factId];
          assert.equal(typeof value, "string", `${entry.factId} is not held for the ${fixture} persona`);
          assert.ok(value.trim().length > 0, `${entry.factId} is empty for the ${fixture} persona`);
        }
      }
    }
    // The option matcher: a held value the list really offers, and one it does not.
    assert.equal(optionOffering(["DISTRICT", "COUNTY", "JUVENILE"], "District Court"), "DISTRICT");
    assert.equal(optionOffering(["ADAMS", "ANTELOPE", "BUFFALO"], "Adams County"), "ADAMS");
    assert.equal(optionOffering(["ADAMS", "ANTELOPE", "BUFFALO"], "Example County"), null);
    // The bug this replaced: a blank option must not swallow every value.
    assert.equal(optionOffering([" ", ""], "Example County"), null);
    assert.deepEqual(["Choose the county", " ", "ADAMS", "____"].filter(REAL_OPTION), ["ADAMS"]);
    assert.equal(readablePdfString("\\r   \\(Enter the county name\\)"), "(Enter the county name)");
    // A named-fact target may only lift the caption gate.
    assert.throws(() => prepareAcroPolicy(
      { fields: [{ name: "datesigned", type: "text", effectiveLabel: "Date", regionHeading: null, widgets: [] }], selectionControls: [] },
      { captionOnly: false, documentAcceptsFill: true, routeKey: null },
      [{ factId: "matter.case_number", fields: ["datesigned"] }]),
      /may only lift binding_not_approved_by_exact_caption_gate/);
  }
  console.log(`CENTRAL self-test OK (${Object.keys(FAMILY_CONFIGS).length} families)`);
}

export async function runFamilyById(familyId, argv = process.argv.slice(2)) {
  const config = FAMILY_CONFIGS[familyId];
  if (!config) throw new Error(`unknown CENTRAL family: ${familyId}`);
  if (argv.includes("--self-test")) return runSelfTests();
  if (argv.includes("--check")) return checkFamily(familyId);
  if (argv.some((arg) => arg.startsWith("--"))) throw new Error(`${familyId}: unsupported option ${argv.find((arg) => arg.startsWith("--"))}`);
  return config.action === "STOP" ? buildStop(familyId, config) : buildOfficial(familyId, config);
}

if (path.resolve(process.argv[1] ?? "") === path.resolve(thisFile)) {
  await runFamilyById("ne-setaside-custodial-set");
}
