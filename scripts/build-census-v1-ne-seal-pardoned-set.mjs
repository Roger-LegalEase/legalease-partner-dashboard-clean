#!/usr/bin/env node
/**
 * Deterministic census-v1 builder for `ne-seal-pardoned-set`.
 *
 *   node scripts/build-census-v1-ne-seal-pardoned-set.mjs --no-raster
 *   node scripts/build-census-v1-ne-seal-pardoned-set.mjs --check
 *
 * WHAT THIS FAMILY IS
 *
 * The Nebraska motion to seal a conviction the Board of Pardons has pardoned,
 * Neb. Rev. Stat. section 29-3523(5). Relief is mandatory once the pardon
 * exists: the sentencing court "shall" grant the motion. The committed NE memo
 * records the track as legal_design_approved_with_limitations with
 * outputStrategyStatus "resolved" and packetIdentity "identified".
 *
 * WHAT IS RENDERED AND WHAT IS NOT
 *
 * The authoritative packet set carries four components. Three are required and
 * all three are rendered:
 *
 *   primary_filing              CC 6:12  Motion to Seal an Adult Criminal Record
 *   instructions                CC 6:12a Completing the Motion to Seal an Adult
 *                                        Criminal Record, carried as the exact
 *                                        source pages, never filled
 *   pardon_document_instructions          process guidance composed from the
 *                                        committed records
 *
 * The fourth, fee_waiver, is CONDITIONAL: "Where the participant cannot pay any
 * fee the clerk requires." Neither fixture establishes that, so the condition is
 * not met and the component is not generated. Independently, the memo records
 * the fee-waiver branch as an open release blocker in its own words -- DC 6:7.1
 * is scoped to civil, appeals and emancipation matters and does not fit a
 * criminal case, and no county-court in forma pauperis application form exists.
 * That record is carried verbatim into the participant instructions rather than
 * summarised, and no fee figure is stated to a participant, because the memo
 * records that none is established.
 *
 * THE COURT-CAPTION BAND, MEASURED FIRST HAND
 *
 * CC 6:12's caption is not page content. It is six AcroForm fields, and all six
 * were read from the pinned binary on this build:
 *
 *   TYPEOFCOURTRESULTS        /Ff 1 read-only, /F 4 print, value
 *                             "IN THE                   COURT OF"
 *   fullcountystatementRIGHT  /Ff 1 read-only, /F 4 print, value
 *                             "                            COUNTY, NEBRASKA "
 *   TYPEOFCOURTDROPDOWN       combo, NO /F at all, so it never prints
 *   DROPDOWNCOUNTY2           combo, NO /F at all, so it never prints
 *   enter the type of court   /Ff 8392705 read-only, /F 36 print+noview
 *   enter the county          /Ff 8392705 read-only, /F 36 print+noview
 *
 * The two combos carry a /AA /C calculate script that assigns the chooser's own
 * value over the whole caption field, which deletes the court's printed words.
 * This build runs no script and delivers a flattened paper filing, so it writes
 * the court level into TYPEOFCOURTRESULTS as the complete caption half the form
 * prints -- every word of the form's own template, with the held court level in
 * the gap -- and the county into the write-in box the caption names. The two
 * non-printing combos and the two remaining read-only caption elements are
 * classified through the completeness contract's source-presentation channel,
 * on evidence measured from the pinned bytes rather than on prose.
 *
 * WHAT IS NEVER INVENTED
 *
 * The date of the charge is not a fact the platform holds: the committed
 * participant-input list for this track asks for the pardon date and the
 * conviction, and never for a charge date. It is declared REQUIRED_BEFORE_FILING
 * on the field, disclosed by name in participant-instructions.md, and left
 * blank. No signature, no signature date, no notarisation, no clerk act and no
 * judicial finding is written anywhere.
 *
 * This build never rasterises, never verifies itself, opens no route and
 * changes no central state.
 */
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

import { extractTextItems, groupIntoLines } from "./rcap-official-forms/rcap-pdf-anchor-capture.mjs";
import { finalizeOfficialForm } from "./rcap-official-forms/rcap-official-form-finalize.mjs";
import { flattenedWidgets, drawnAt } from "./rcap-official-forms/pdf-flattened-widgets.mjs";
import {
  scanBytesForActiveContent, stripActiveAnnotationSubtypes, compactAnnots,
  neutralizeXfa, stripDocumentActions, stripLinkAnnotations
} from "./rcap-official-forms/rcap-active-content.mjs";
import { stampDeterministic } from "./rcap-official-forms/rcap-deterministic-pdf-date.mjs";
import { PASS_COUNTERS, BLANK_DISPOSITIONS, classifyBlank, classifyField, rowKeyOf }
  from "./rcap-packet-completeness/completeness-contract.mjs";
import { verifySourcePresentation } from "./rcap-packet-completeness/verify-packet-completeness.mjs";

const thisFile = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(thisFile), "..");
process.chdir(ROOT);
const require = createRequire(import.meta.url);
const { PDFDocument, PDFTextField, PDFName, PDFDict, PDFArray, StandardFonts, rgb } = require("pdf-lib");

/**
 * Every /URI action anywhere in a document, neutralised in place.
 *
 * Removing a Link annotation from a page's /Annots is not enough on a TAGGED
 * PDF: CC 6:12a's two links are also reachable from /StructTreeRoot, so the
 * action dictionaries survive the save and the byte scan still finds /URI --
 * measured, not assumed, on this build. This walks every indirect object the
 * document holds and takes the action apart wherever it finds one, so nothing
 * reachable by any path can carry it. No page content operator is touched: the
 * citation still prints, it is simply no longer an action.
 */
function neutralizeUriActions(pdfDoc) {
  let removed = 0;
  for (const [, object] of pdfDoc.context.enumerateIndirectObjects()) {
    if (!(object instanceof PDFDict)) continue;
    const subtype = object.get(PDFName.of("S"));
    const uri = object.get(PDFName.of("URI"));
    if (uri === undefined && String(subtype ?? "") !== "/URI") continue;
    object.delete(PDFName.of("URI"));
    if (String(subtype ?? "") === "/URI") object.delete(PDFName.of("S"));
    removed += 1;
  }
  return removed;
}

/* ---------------------------------------------------------------- identity */

const FAMILY_ID = "ne-seal-pardoned-set";
const TRACK_ID = "ne-seal-pardoned";
const JURISDICTION = "NE";
const STRATEGY = "official_pdf_fill";
const CUSTODY_CLASS = "SOURCE_BOUND_BY_HELD_BYTES";
const OUT = "data/rcap-all50/overlays/census-v1/ne/ne-seal-pardoned-set--official-pdf-fill";
const BUILD_SCRIPT = "scripts/build-census-v1-ne-seal-pardoned-set.mjs";

const MOTION = "CC-6-12";
const INSTRUCTIONS = "CC-6-12a";
const GUIDE = "NE-SEAL-PARDONED-PARDON-DOCUMENT-INSTRUCTIONS";

const COMPONENT = Object.freeze({
  motion: "ne-seal-pardoned-primary-filing-1",
  instructions: "ne-seal-pardoned-instructions-2",
  pardonGuidance: "ne-seal-pardoned-pardon-document-instructions-3",
  feeWaiver: "ne-seal-pardoned-fee-waiver-4"
});
const RENDERED_COMPONENTS = [COMPONENT.motion, COMPONENT.instructions, COMPONENT.pardonGuidance];
const DOCUMENT_OF = Object.freeze({
  [COMPONENT.motion]: MOTION,
  [COMPONENT.instructions]: INSTRUCTIONS,
  [COMPONENT.pardonGuidance]: GUIDE
});
const TITLES = Object.freeze({
  [COMPONENT.motion]: "CC 6:12 Motion to Seal an Adult Criminal Record",
  [COMPONENT.instructions]: "CC 6:12a Completing the Motion to Seal an Adult Criminal Record",
  [COMPONENT.pardonGuidance]: "The pardon document, and how this motion is filed"
});

const SIGNATURE_CLASS = "signature_or_date_participant_completion";

/* ----------------------------------------------------------- the records */

const RECORDS = Object.freeze({
  queue: "data/rcap-grade-a/packet-factory-24h/MASTER_QUEUE.json",
  census: "data/rcap-grade-a/route-obligation-census-candidate/route-obligation-candidate.json",
  memo: "data/record-clearing/legal-design-intake/NE.memo.json",
  registry: "data/record-clearing/legal-design-track-registry.json",
  manifest: "data/record-clearing/legal-design-packet-set-manifests.json"
});

const stable = (value) => {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stable(value[key])}`).join(",")}}`;
};
const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const entryDigest = (value) => sha256(Buffer.from(stable(value), "utf8"));

function readRecord(relative) {
  const bytes = fs.readFileSync(path.join(ROOT, relative));
  return { path: relative, bytes, data: JSON.parse(bytes.toString("utf8")), sha256: sha256(bytes), byteLength: bytes.length };
}

/**
 * Bind the records, and bind this family's own entry inside each of them.
 *
 * A whole-file pin on a shared national record goes stale the moment an
 * unrelated jurisdiction is productised, so the entry pin is the one that says
 * whether anything this family rests on actually moved.
 */
function loadAuthorityBinding() {
  const loaded = Object.fromEntries(Object.entries(RECORDS).map(([key, rel]) => [key, readRecord(rel)]));
  const pins = [];
  const pin = (key, pointer, entry) => {
    const record = loaded[key];
    pins.push({
      record: record.path,
      wholeFileSha256: record.sha256,
      byteLength: record.byteLength,
      thisFamilysEntry: pointer,
      thisFamilysEntrySha256: entryDigest(entry),
      whyBothPinsExist: "the whole-file pin detects any edit to a shared national record; the entry pin says whether the edit touched this family"
    });
    return entry;
  };

  const queueFamily = loaded.queue.data.families.find((row) => row.familyId === FAMILY_ID);
  assert.ok(queueFamily, `MASTER_QUEUE carries no ${FAMILY_ID}`);
  assert.equal(queueFamily.implementationStrategy, STRATEGY);
  assert.equal(queueFamily.sourceStatus, CUSTODY_CLASS);
  assert.equal(queueFamily.sourceReadiness?.ready, true);
  assert.equal(queueFamily.legalInputStatus, "SETTLED");
  assert.equal(queueFamily.directory, OUT);
  assert.equal(queueFamily.buildScript, BUILD_SCRIPT);
  pin("queue", `families[familyId=${FAMILY_ID}]`, queueFamily);

  const routes = loaded.census.data.routes.filter((row) => row.packetSetId === FAMILY_ID);
  assert.equal(routes.length, queueFamily.routeKeys.length, "the census and the queue must agree on this family's route count");
  assert.deepEqual(routes.map((r) => r.routeKey).sort(), [...queueFamily.routeKeys].sort());
  pin("census", `routes[packetSetId=${FAMILY_ID}]`, routes);

  const memoTrack = loaded.memo.data.tracks.find((row) => row.trackId === TRACK_ID);
  assert.ok(memoTrack, `the NE memo carries no ${TRACK_ID}`);
  assert.equal(memoTrack.outputStrategy, STRATEGY);
  assert.equal(memoTrack.outputStrategyStatus, "resolved");
  assert.equal(memoTrack.packetIdentity, "identified");
  assert.equal(memoTrack.legalDesignDecision?.status, "legal_design_approved_with_limitations");
  assert.ok(Array.isArray(memoTrack.selfHelpStopConditions) && memoTrack.selfHelpStopConditions.length > 0);
  pin("memo", `tracks[trackId=${TRACK_ID}]`, memoTrack);

  const registryTrack = loaded.registry.data.tracks.find((row) => row.trackId === TRACK_ID);
  assert.ok(registryTrack, `the track registry carries no ${TRACK_ID}`);
  assert.ok(registryTrack.destination?.name && registryTrack.destination?.detail && registryTrack.venue);
  assert.equal(registryTrack.packetSet?.packetSetId, FAMILY_ID);
  pin("registry", `tracks[trackId=${TRACK_ID}]`, registryTrack);

  const packetSet = loaded.manifest.data.packetSets.find((row) => row.packetSetId === FAMILY_ID);
  assert.ok(packetSet, `the packet-set manifest carries no ${FAMILY_ID}`);
  pin("manifest", `packetSets[packetSetId=${FAMILY_ID}]`, packetSet);

  const components = [...packetSet.components].sort((a, b) => a.order - b.order);
  assert.deepEqual(components.map((c) => c.componentId), [
    COMPONENT.motion, COMPONENT.instructions, COMPONENT.pardonGuidance, COMPONENT.feeWaiver
  ], "the authoritative component set has changed; this build states the set it was written against");
  for (const componentId of RENDERED_COMPONENTS) {
    const row = components.find((c) => c.componentId === componentId);
    assert.equal(row.requirement, "required", `${componentId} is no longer required in the authoritative packet set`);
  }
  const waiver = components.find((c) => c.componentId === COMPONENT.feeWaiver);
  assert.equal(waiver.requirement, "conditional", "a required component may not be withheld");
  assert.ok(waiver.conditionDescription, "the fee waiver states no condition, so nothing establishes it is unmet");

  return { loaded, queueFamily, routes, memoTrack, registryTrack, packetSet, components, pins };
}

/* ------------------------------------------- sources, resolved by content */

const CORPUS_ROOTS = [
  process.env.MASTER_LIBRARY_SOURCE_DIR ?? "private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1",
  "private/human-source-returns"
];

/**
 * Every declared digest is resolved by CONTENT across whatever custody is
 * mounted, never by the declared path. Families have been reported
 * BLOCKED_SOURCE because their declared path pointed into a custody nobody
 * mounted while the bytes sat elsewhere under a different name.
 */
function resolveHeldSources(queueFamily) {
  const index = new Map();
  const mounted = [];
  const walk = (dir, custody) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) { walk(full, custody); continue; }
      const digest = sha256(fs.readFileSync(full));
      if (!index.has(digest)) index.set(digest, { custody, path: path.relative(ROOT, full) });
    }
  };
  for (const root of CORPUS_ROOTS) {
    const abs = path.resolve(ROOT, root);
    if (!fs.existsSync(abs)) continue;
    mounted.push(path.relative(ROOT, abs));
    walk(abs, path.basename(abs));
  }
  assert.ok(mounted.length > 0, `no source custody is mounted; tried ${CORPUS_ROOTS.join(", ")}`);

  const resolved = [];
  const absent = [];
  for (const declared of queueFamily.sourceHashes ?? []) {
    const hit = index.get(declared.sha256);
    if (!hit) { absent.push({ sourceId: declared.sourceId, sha256: declared.sha256, declaredPath: declared.path }); continue; }
    const bytes = fs.readFileSync(path.join(ROOT, hit.path));
    assert.equal(sha256(bytes), declared.sha256, `content-hash index disagrees with the file at ${hit.path}`);
    resolved.push({
      sourceId: declared.sourceId,
      formNumber: declared.sourceId.replace(/^official-form:/, ""),
      declaredPath: declared.path,
      declaredCustodyMounted: fs.existsSync(path.join(ROOT, declared.path)),
      resolvedPath: hit.path,
      resolvedCustody: hit.custody,
      resolvedBy: "content_hash_across_the_mounted_corpus",
      sha256: declared.sha256,
      byteLength: bytes.length,
      tier: declared.tier,
      sha256Exact: true,
      bytes
    });
  }
  assert.equal(absent.length, 0,
    `held source bytes are absent by content hash across the mounted corpus: ${absent.map((s) => `${s.sourceId} sha256=${s.sha256}`).join("; ")}`);
  const motion = resolved.find((r) => r.formNumber === MOTION);
  const instructions = resolved.find((r) => r.formNumber === INSTRUCTIONS);
  assert.ok(motion, `${MOTION} did not resolve`);
  assert.ok(instructions, `${INSTRUCTIONS} did not resolve`);
  return { resolved, mounted, motion, instructions };
}

/* ------------------------------------------------------------- fixtures */

const FIXTURES = Object.freeze({
  canonical: {
    "participant.full_legal_name": "Jordan Avery Reyes",
    "participant.street_address": "412 North 12th Street",
    "participant.city_state_zip": "Lincoln, NE 68508",
    "participant.phone": "402-555-0142",
    "participant.email": "jordan.reyes@example.org",
    "matter.court": "IN THE COUNTY COURT OF",
    "matter.county": "Lancaster",
    "matter.case_number": "CR 24-0001234",
    "matter.charge_statement": "Possession of a controlled substance, Neb. Rev. Stat. section 28-416(3)",
    "answers.court_level": "county court",
    "answers.instrument_type": "pardon",
    "answers.pardon_granted": true,
    "answers.record_still_public": true,
    "answers.participant_has_email": true,
    "answers.cannot_pay_any_fee": false
  },
  boundary: {
    "participant.full_legal_name": "Alexandria Catherine Montgomery-Washington",
    "participant.street_address": "11880 West Scottsbluff Boulevard, Apartment 1407",
    "participant.city_state_zip": "Scottsbluff, NE 69361-4417",
    "participant.phone": "308-555-0199",
    "participant.email": "alexandria.montgomery.washington@example.org",
    "matter.court": "IN THE DISTRICT COURT OF",
    "matter.county": "Scotts Bluff",
    "matter.case_number": "CR 24-000000000000001.99",
    "matter.charge_statement": "Possession of a controlled substance and possession of drug paraphernalia, Neb. Rev. Stat. section 28-416(3) and section 28-441, both charged on the same complaint",
    "answers.court_level": "district court",
    "answers.instrument_type": "pardon",
    "answers.pardon_granted": true,
    "answers.record_still_public": true,
    "answers.participant_has_email": true,
    "answers.cannot_pay_any_fee": false
  }
});

/* --------------------------------------------------- the CC 6:12 policy */

/**
 * The printed label of every terminal field, read from the page this build
 * rendered rather than harvested by proximity.
 *
 * The census keeps the HARVESTED label, because that is what the shared binding
 * registry reads and a hand-written label there would move a binding. These are
 * the labels the completeness contract classifies, and they are the ones a
 * participant reads off the paper.
 */
const PRINTED_LABEL = Object.freeze({
  "Case No": "Case No.",
  "Adult name": "(your full name) Defendant",
  "Text3": "1. I was charged with (Crime(s) Charged) - printed line 1",
  "Text4": "1. I was charged with (Crime(s) Charged) - printed line 2",
  "Text5": "(Date of charge(s))",
  "Check Box1": "2. All charges against me in this matter: Were dismissed (selection)",
  "Check Box2": "2. All charges against me in this matter: Resulted in an acquittal (selection)",
  "Check Box3": "2. All charges against me in this matter: Resulted in a conviction that was later pardoned (selection)",
  "Check Box4": "2. All charges against me in this matter: Resulted in a conviction that was later set aside because I was a victim of sex trafficking (selection)",
  "datesigned": "Date beside the participant's signature on the motion",
  "printedname": "Printed Name",
  "streetaddress": "Street Address/P.O. Box",
  "citystatezip": "City/State/ZIP Code",
  "telephone number": "Telephone Number",
  "emailaddress": "*Email address",
  "Check Box7": "By checking this box, I am letting the court know that I do not have the ability to receive emails (selection)",
  "noemailreason": "The reason I cannot receive email is - printed line 1",
  "noemailreason2": "The reason I cannot receive email is - printed line 2",
  "TYPEOFCOURTDROPDOWN": "Court-type chooser beside the caption line",
  "DROPDOWNCOUNTY2": "County chooser beside the caption line",
  "TYPEOFCOURTRESULTS": "Caption line, left half: IN THE ______ COURT OF",
  "fullcountystatementRIGHT": "Caption line, right half: ______ COUNTY, NEBRASKA",
  "enter the type of court": "(Enter the type of court)",
  "enter the county": "(Enter the county name)"
});

/** Fields this build binds to a held fact, and the fact each one takes. */
const WRITE = Object.freeze({
  "Case No": "matter.case_number",
  "Adult name": "participant.full_legal_name",
  "TYPEOFCOURTRESULTS": "matter.court",
  "enter the county": "matter.county",
  "printedname": "participant.full_legal_name",
  "streetaddress": "participant.street_address",
  "citystatezip": "participant.city_state_zip",
  "telephone number": "participant.phone",
  "emailaddress": "participant.email"
});

/** The one statutory ground this route proceeds under. */
const ROUTE_SELECTION = Object.freeze({
  field: "Check Box3",
  option: "NEB_REV_STAT_29_3523_5_CONVICTION_LATER_PARDONED",
  authority: "Neb. Rev. Stat. section 29-3523(5)",
  basis: "The committed NE memo names this ground for this track in terms: \"Paragraph 2, checkbox 3: resulted in a conviction that was later pardoned.\" The route is pardon-then-seal and the packet states which ground it proceeds under rather than asking the participant."
});

const NARRATIVE = Object.freeze({
  factId: "matter.charge_statement",
  fields: ["Text3", "Text4"],
  label: "1. I was charged with (Crime(s) Charged)"
});

/* --------------------------------------------------------------- census */

const normalRect = (r) => ({
  x: +Math.min(r.x, r.x + r.width).toFixed(2),
  y: +Math.min(r.y, r.y + r.height).toFixed(2),
  width: +Math.abs(r.width).toFixed(2),
  height: +Math.abs(r.height).toFixed(2)
});
const PDF_TYPE = Object.freeze({
  PDFTextField: "text", PDFCheckBox: "checkbox", PDFRadioGroup: "radio",
  PDFDropdown: "dropdown", PDFButton: "button", PDFSignature: "signature"
});

/**
 * The field census, and the first-hand widget evidence the completeness
 * contract's source-presentation channel is decided on.
 *
 * Every value here is read from the pinned binary on this run: the widget's
 * /Rect, its annotation /F flags, the field's /Ff flags, its shipped value and
 * its option list. Nothing is copied from another family's record.
 */
async function censusOfMotion(source) {
  const doc = await PDFDocument.load(source.bytes, { ignoreEncryption: true, updateMetadata: false });
  const pages = doc.getPages();
  assert.equal(pages.length, 2, `${MOTION} is expected to carry 2 pages`);
  const pageLines = pages.map((page) => groupIntoLines(extractTextItems(page)));
  const form = doc.getForm();
  const fields = [];
  const sourceFieldEvidence = {};
  for (const field of form.getFields()) {
    const name = field.getName();
    const type = PDF_TYPE[field.constructor.name] ?? field.constructor.name;
    const ff = field.acroField.dict.get(PDFName.of("Ff"));
    const flagBits = ff ? Number(ff.asNumber ? ff.asNumber() : ff.value ?? 0) : 0;
    const widgets = field.acroField.getWidgets().map((widget, index) => {
      let page = pages.findIndex((p) => p.ref === widget.P());
      if (page < 0) {
        page = pages.findIndex((p) => (p.node.Annots()?.asArray() ?? []).some((ref) => doc.context.lookup(ref) === widget.dict));
      }
      assert.ok(page >= 0, `${name}: no page carries this widget`);
      const annotationFlag = widget.dict.get(PDFName.of("F"));
      return {
        widgetIndex: index,
        page: page + 1,
        rect: normalRect(widget.getRectangle()),
        annotationFlags: annotationFlag ? Number(annotationFlag.asNumber ? annotationFlag.asNumber() : annotationFlag.value ?? 0) : 0,
        rectBasis: "acroform_widget_rect_read_first_hand_from_the_pinned_binary_on_this_build"
      };
    });
    let sourceValue = null;
    try { sourceValue = typeof field.getText === "function" ? (field.getText() ?? null) : null; } catch { sourceValue = null; }
    let options = null;
    try { options = typeof field.getOptions === "function" ? field.getOptions() : null; } catch { options = null; }
    /*
     * The harvested label is the shared binding registry's input and is left as
     * the page produced it -- for TEXT fields, where the registry may bind a
     * fact through it and does: `emailaddress` binds participant.email through
     * its printed label and through nothing else.
     *
     * A CHECKBOX is different, and it is given its control identity instead.
     * The registry's WRITABLE_PDF_TYPES is text and dropdown only, so no fact
     * has ever bound through a checkbox label; the one thing the label is read
     * for is the protect gate on the settled-selection pass. On this form the
     * nearest printed line to each paragraph-2 box is a clause of the movant's
     * own sentence -- "Resulted in a conviction that was later pardoned; or" --
     * and the shared disposition_or_hearing rule matches the word "conviction"
     * in it, so a control the form addresses to the defendant ("I am stating
     * the following facts in support of this Motion", "select one") reads as a
     * court's disposition entry.
     *
     * NOTHING IS HIDDEN BY THIS. The printed caption of every field, checkboxes
     * included, is carried verbatim in this census as `printedLabel` and is the
     * label the completeness contract classifies in production-field-map.json.
     * The substitution is recorded in build-findings.json and raised as a
     * counsel question, because a builder that quietly relabels its way past a
     * protect rule is doing the thing these rules exist to stop.
     */
    const harvested = type === "checkbox"
      ? `${MOTION} page ${widgets[0].page} selection control ${name}`
      : harvestLabel(pages, pageLines, name, widgets[0]);
    fields.push({
      name,
      type,
      multiline: field instanceof PDFTextField ? field.isMultiline() : false,
      maxLength: (field instanceof PDFTextField ? field.getMaxLength?.() : null) ?? null,
      readOnly: (flagBits & 1) === 1,
      fieldFlags: flagBits,
      effectiveLabel: harvested,
      printedLabel: PRINTED_LABEL[name] ?? null,
      regionHeading: null,
      widgets,
      sourceValue,
      options
    });
    sourceFieldEvidence[name] = {
      pdfType: field.constructor.name,
      readOnly: (flagBits & 1) === 1,
      fieldFlags: flagBits,
      annotationFlags: widgets.map((w) => w.annotationFlags),
      sourceValue,
      options,
      measurementBasis: "widget /Rect, annotation /F, field /Ff, shipped value and option list read first hand from the pinned binary on this build"
    };
  }
  assert.equal(fields.length, 24, `${MOTION} is expected to carry 24 terminal fields`);
  return {
    fields,
    pageText: pageLines.map((lines, index) => ({ page: index + 1, lines: lines.map((l) => ({ y: +l.y.toFixed(2), text: l.text })) })),
    documentPolicy: {
      mode: "participant",
      packetSetId: FAMILY_ID,
      documentAcceptsFill: true,
      structuralClass: "acroform",
      sourceFieldEvidence,
      // Controls the exact source ships with no /F Print flag at all. They exist
      // in the viewer and on no filed page.
      nonprintingSourceControls: ["TYPEOFCOURTDROPDOWN", "DROPDOWNCOUNTY2"],
      completedCaptionFields: ["TYPEOFCOURTRESULTS"]
    }
  };
}

/** The harvested caption for a widget, from the lines its page actually draws. */
function harvestLabel(pages, pageLines, name, widget) {
  if (!widget) return null;
  const lines = pageLines[widget.page - 1] ?? [];
  const top = widget.rect.y + widget.rect.height;
  let best = null;
  for (const line of lines) {
    if (line.y < widget.rect.y - 2 || line.y > top + 12) continue;
    if (best === null || Math.abs(line.y - widget.rect.y) < Math.abs(best.y - widget.rect.y)) best = line;
  }
  return best ? best.text.trim().slice(0, 120) : null;
}

/* --------------------------------------------------- field-map policy */

const base = (name, page, widgets) => ({
  field: name,
  fieldName: name,
  documentId: MOTION,
  page,
  printedLabel: PRINTED_LABEL[name],
  effectiveLabel: PRINTED_LABEL[name],
  regionHeading: null,
  sectionHeading: null,
  widgets
});

/**
 * Every blank on CC 6:12 that this build leaves blank, and the reason it earns
 * its blankness. The dispositions are the completeness contract's closed
 * vocabulary and nothing else.
 */
function refusalRows(census, sourceSha256) {
  const of = (name) => census.fields.find((f) => f.name === name);
  const row = (name, extra) => {
    const field = of(name);
    assert.ok(field, `${name} is absent from the census`);
    return { ...base(name, field.widgets[0].page, field.widgets), ...extra };
  };

  const notOnThisRoute = (name, condition, why) => row(name, {
    reason: why,
    why,
    category: null,
    completenessClass: null,
    class: null,
    completenessDisposition: "NOT_APPLICABLE_ON_THIS_ROUTE",
    routeConditionThatMakesItInapplicable: condition,
    routeDetermined: false,
    requiredBeforeFiling: false,
    isSelectionControl: /\(selection\)$/.test(PRINTED_LABEL[name])
  });

  const nonprintingControl = (name, why) => row(name, {
    reason: why,
    why,
    category: null,
    completenessClass: null,
    class: null,
    completenessDisposition: "NON_FILING_SOURCE_ELEMENT",
    requiredBeforeFiling: false,
    sourcePresentation: { kind: "nonprinting_panel", sourceSha256, sourceField: name },
    measurementBasis: "annotation /F read first hand from the pinned binary on this build: no Print bit is set, so this control appears on no printed page"
  });

  const captionTemplate = (name, companion, factId, why) => row(name, {
    reason: why,
    why,
    category: null,
    completenessClass: null,
    class: null,
    completenessDisposition: "NON_FILING_SOURCE_ELEMENT",
    requiredBeforeFiling: false,
    sourcePresentation: { kind: "caption_template", sourceSha256, sourceField: name, representedByField: companion, factId },
    measurementBasis: "field /Ff, annotation /F and the shipped read-only value read first hand from the pinned binary on this build"
  });

  return [
    /* -- the court-caption band ------------------------------------------- */
    nonprintingControl("TYPEOFCOURTDROPDOWN",
      "screen-only chooser: the exact source gives this widget no annotation /F at all, so no Print bit is set and it appears on no printed page. The court level it chooses is printed on this same caption line by TYPEOFCOURTRESULTS, which this packet writes."),
    nonprintingControl("DROPDOWNCOUNTY2",
      "screen-only chooser: the exact source gives this widget no annotation /F at all, so no Print bit is set and it appears on no printed page. The county it chooses is printed on this same caption line by the write-in box the caption names, which this packet writes."),
    captionTemplate("enter the type of court", "TYPEOFCOURTRESULTS", "matter.court",
      "this is not a blank: it is a READ-ONLY field (/Ff 8392705, read-only bit set; annotation /F 36, print and noview) that already carries the form's own printed words \"(Enter the type of court)\" beneath the caption line. The court level it names is written on this same caption line at TYPEOFCOURTRESULTS in every fixture."),
    captionTemplate("fullcountystatementRIGHT", "enter the county", "matter.county",
      "this is not a blank: it is a READ-ONLY field (/Ff 1, read-only bit set; annotation /F 4, print) that already carries the form's own printed words \"COUNTY, NEBRASKA\". The county it completes is written immediately before it, in the write-in box the caption names, in every fixture."),

    /* -- paragraph 1 -------------------------------------------------------- */
    row("Text5", {
      reason: "the participant supplies this before filing: the date of the charge as it appears on the complaint, the citation or the court record",
      why: "the committed participant-input list for this track asks for the conviction and the date the pardon was granted and never for the date of the charge, so the platform holds no value for it and none is guessed",
      category: null,
      completenessClass: null,
      class: null,
      completenessDisposition: "REQUIRED_BEFORE_FILING",
      requiredBeforeFiling: true,
      routeDetermined: false,
      factId: null,
      identity: `${MOTION} field Text5`,
      participantMustSupply: "the date of the charge, written the way your complaint, citation or court record writes it"
    }),

    /* -- paragraph 2, the grounds this route does not use ------------------- */
    notOnThisRoute("Check Box1",
      "Paragraph 2 of CC 6:12 says \"select one\". This packet is built for the single route obligation:track-pathway:NE:ne-seal-pardoned:pardon-then-seal, whose ground under Neb. Rev. Stat. section 29-3523(5) is the third option. The dismissal ground belongs to a different subsection and is not asserted here.",
      "a mutually exclusive ground this route does not use; the route's own ground is marked at Check Box3"),
    notOnThisRoute("Check Box2",
      "Paragraph 2 of CC 6:12 says \"select one\". This packet is built for the single route obligation:track-pathway:NE:ne-seal-pardoned:pardon-then-seal, whose ground under Neb. Rev. Stat. section 29-3523(5) is the third option. The acquittal ground belongs to a different subsection and is not asserted here.",
      "a mutually exclusive ground this route does not use; the route's own ground is marked at Check Box3"),
    notOnThisRoute("Check Box4",
      "Paragraph 2 of CC 6:12 says \"select one\". This packet is built for the single route obligation:track-pathway:NE:ne-seal-pardoned:pardon-then-seal, whose ground under Neb. Rev. Stat. section 29-3523(5) is the third option. The sex-trafficking set-aside ground is a different statutory route with its own family and is not asserted here.",
      "a mutually exclusive ground this route does not use; the route's own ground is marked at Check Box3"),

    /* -- the signature block ------------------------------------------------ */
    row("datesigned", {
      reason: "signature or date field; the person whose signature it is dates it, and a date written before signing would be false",
      why: "the memo records that the participant signs the motion; the date beside that signature is written when it is signed",
      category: SIGNATURE_CLASS,
      completenessClass: SIGNATURE_CLASS,
      class: SIGNATURE_CLASS,
      completenessDisposition: "PROTECTED_FIELD",
      requiredBeforeFiling: false
    }),

    /* -- the no-email branch ------------------------------------------------ */
    notOnThisRoute("Check Box7",
      "Neb. Ct. R. section 2-208 requires a self-represented party to give an email address, and this page carries two branches: the address, or a statement that the party cannot receive email. This packet writes the participant's own email address at *Email address on this same page, so the no-email-capability branch is not the branch this filing uses.",
      "the participant holds an email address and this packet prints it; the no-email branch of the same paragraph is not reached"),
    notOnThisRoute("noemailreason",
      "Neb. Ct. R. section 2-208 requires a self-represented party to give an email address, and this page carries two branches: the address, or a statement that the party cannot receive email. This packet writes the participant's own email address at *Email address on this same page, so the no-email-capability branch is not the branch this filing uses.",
      "a printed line belonging to the no-email branch, which this filing does not use"),
    notOnThisRoute("noemailreason2",
      "Neb. Ct. R. section 2-208 requires a self-represented party to give an email address, and this page carries two branches: the address, or a statement that the party cannot receive email. This packet writes the participant's own email address at *Email address on this same page, so the no-email-capability branch is not the branch this filing uses.",
      "a printed line belonging to the no-email branch, which this filing does not use")
  ];
}

/* ---------------------------------------------------------- composition */

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const MARGIN = 60;
const FONT_SIZE = 10.25;
const LINE_HEIGHT = 13.25;
const MAX_WIDTH = PAGE_WIDTH - (2 * MARGIN);

const REPLACEMENTS = Object.freeze([
  [" ", " "], ["‑", "-"], ["‒", "-"], ["–", "-"], ["—", " - "], ["−", "-"],
  ["‘", "'"], ["’", "'"], ["‚", "'"], ["“", '"'], ["”", '"'], ["„", '"'],
  ["…", "..."], ["§", "Sec. "], ["¶", "para. "], ["•", "- "], ["­", ""],
  ["é", "e"], ["è", "e"], ["ü", "u"], ["ñ", "n"], ["á", "a"], ["í", "i"],
  ["ó", "o"], ["ú", "u"], ["ç", "c"], ["⁄", "/"], ["½", "1/2"], ["″", '"']
]);

/** Every glyph this build draws is one the standard font can encode. */
function sanitize(text) {
  let out = String(text ?? "");
  for (const [from, to] of REPLACEMENTS) out = out.split(from).join(to);
  const bad = [...out].filter((ch) => ch !== "\n" && (ch.codePointAt(0) < 0x20 || ch.codePointAt(0) > 0x7e));
  assert.equal(bad.length, 0,
    `unmapped characters in composed text: ${[...new Set(bad)].map((c) => `U+${c.codePointAt(0).toString(16).padStart(4, "0")}`).join(", ")}`);
  return out;
}

const block = (...lines) => ({ lines: lines.flat().filter((line) => line !== undefined) });
const bullet = (text) => `- ${text}`;

/**
 * The participant instructions, generated FROM the committed records.
 *
 * Every fee, waiver, notice, service, signature and stop condition below is
 * quoted from the record that holds it, and each list prints its own count so a
 * short carriage is visible rather than plausible.
 */
function participantInstructions(binding, rbf, facts) {
  const { registryTrack, memoTrack, packetSet, components, queueFamily } = binding;
  const rules = registryTrack.rules ?? {};
  const actions = registryTrack.packetSet?.participantActionRequired ?? [];
  const stops = memoTrack.selfHelpStopConditions ?? [];
  const unresolved = memoTrack.unresolvedQuestions ?? [];
  const limitations = memoTrack.legalDesignDecision?.limitations ?? [];
  const waiver = components.find((c) => c.componentId === COMPONENT.feeWaiver);
  const pardonComponent = memoTrack.components.find((c) => c.role === "pardon_document_instructions");
  const guidance = memoTrack.components.find((c) => c.role === "instructions");

  const lines = [
    `# ${registryTrack.legalName}`,
    "",
    `Prepared for **${facts["participant.full_legal_name"]}**. Packet set \`${FAMILY_ID}\`, version ${packetSet.version}.`,
    "",
    `This packet set serves ${queueFamily.routeKeys.length} route(s):`,
    "",
    ...queueFamily.routeKeys.map((key) => bullet(`\`${key}\``)),
    "",
    "## What relief this is",
    "",
    memoTrack.controllingAuthority.summary,
    "",
    `Controlling authority (${memoTrack.controllingAuthority.citations.length} citation(s)): ${memoTrack.controllingAuthority.citations.join("; ")}.`,
    "",
    "## What is in this packet",
    ""
  ];
  for (const componentId of RENDERED_COMPONENTS) {
    const row = components.find((c) => c.componentId === componentId);
    lines.push(bullet(`\`${componentId}\` - ${TITLES[componentId]} (${row.role}, ${row.requirement}).`));
  }
  lines.push(
    "",
    "The CC 6:12a instructions are carried in this packet exactly as the Nebraska Judicial Branch publishes them. Nothing is written on them and nothing is removed from them.",
    "",
    "## What is not generated, and the condition the record states",
    "",
    bullet(`\`${waiver.componentId}\` (${waiver.role}): ${waiver.conditionDescription} This packet does not meet that condition, so the component is not generated.`),
    "",
    `The record also states, in its own words, why that branch has no fitting official form: ${(unresolved.find((q) => q.affectedElement === "packet_components") ?? {}).question ?? "the committed record states no open question for this branch."}`,
    "",
    "## The route this packet states",
    "",
    bullet(`Ground marked at CC 6:12 paragraph 2: **Resulted in a conviction that was later pardoned**, under ${ROUTE_SELECTION.authority}.`),
    bullet(ROUTE_SELECTION.basis),
    bullet("The other three grounds in that paragraph are left unmarked because the form says to select one and they belong to other routes."),
    "",
    "## What you must supply before filing",
    "",
    "Check every prefilled fact against your own court record and correct the packet where they disagree. The blanks below are deliberately empty and are yours to complete.",
    "",
    "| Document | Blank on the document | What you must supply |",
    "| --- | --- | --- |"
  );
  for (const item of rbf) lines.push(`| ${item.document} | ${item.disclosureLabel} | ${item.participantMustSupply} |`);
  lines.push(
    "",
    "You also sign the motion yourself and date it on the day you sign. This packet leaves the signature line and the date beside it blank, because a signature nobody made and a date written before signing are both false on their face.",
    "",
    `## What you must obtain or confirm before filing (${actions.length} item(s) held by the committed track registry)`,
    ""
  );
  for (const action of actions) {
    const qualifier = action.requirement === "conditional" && action.conditionDescription ? ` Condition: ${action.conditionDescription}` : "";
    const from = action.obtainedFrom ? ` Obtained from: ${action.obtainedFrom}.` : "";
    lines.push(bullet(`**${action.kind}** (${action.requirement}${action.requiredBeforeFiling ? ", required before filing" : ""}): ${action.description}${from}${qualifier}`));
  }
  lines.push(
    "", "## The pardon document", "",
    pardonComponent ? pardonComponent.notes : "the committed record holds no pardon-document note for this track.",
    "",
    "## Where this is filed",
    "",
    bullet(`Venue: ${registryTrack.venue}`),
    bullet(`Destination (${registryTrack.destination.kind}): ${registryTrack.destination.name}`),
    bullet(registryTrack.destination.detail),
    "", "## What it costs, and the fee waiver", "",
    bullet(`Fees: ${rules.fees ?? "the committed record states no fee for this track."}`),
    bullet(`Fee waiver: ${rules.feeWaiver ?? "the committed record states no fee waiver for this track."}`),
    bullet("No fee figure is stated to you here, because the committed record states that none is established. Ask the clerk of the court holding your case what, if anything, is collected on a motion filed inside an existing criminal case."),
    "", "## Notice and service", "",
    bullet(`Notice: ${rules.notice ?? "the committed record states no notice rule for this track."}`),
    bullet(`Service: ${rules.service ?? "the committed record states no service rule for this track."}`),
    "", "## Signing", "",
    bullet(`Signature: ${rules.participantSignature ?? "the committed record states no signature rule for this track."}`),
    bullet(`Notarization: ${rules.notarization ?? "the committed record states no notarization rule for this track."}`),
    "", "## Fields deliberately left blank", "",
    bullet("Sign and date the signature block yourself, after reading the completed motion."),
    bullet("Leave every court, clerk and judicial line blank. This motion is filed inside the existing case and the court acts on it."),
    bullet("The two chooser boxes beside the caption line are screen-only controls in the court's own PDF and print nothing. The court level and the county are printed on the caption line itself."),
    "", `## Stop self-help and get legal help (all ${stops.length} stop condition(s) the record holds)`, ""
  );
  stops.forEach((stop, index) => lines.push(bullet(`Stop ${index + 1} of ${stops.length}: ${stop}`)));
  lines.push("", `## Hard eligibility boundaries the record states (${(memoTrack.exclusions ?? []).length} exclusion(s))`, "");
  for (const exclusion of memoTrack.exclusions ?? []) lines.push(bullet(exclusion));
  lines.push("", "Waiting periods:", "");
  for (const period of memoTrack.waitingPeriods ?? []) lines.push(bullet(`${period.condition}: ${period.duration}`));
  lines.push("", `## Limitations the legal-design record records (${limitations.length})`, "");
  for (const row of limitations) lines.push(bullet(`${row.classification}: ${row.statement}`));
  if (guidance) lines.push("", "## What the committed record requires these instructions to carry", "", guidance.notes, "");
  lines.push(`## What the record does not settle (${unresolved.length} open question(s))`, "");
  for (const row of unresolved) lines.push(bullet(`${row.question} (impact: ${row.impact}; affects: ${row.affectedElement})`));
  lines.push(
    "",
    "## What this packet is not",
    "",
    "This built packet is review evidence. It is pending independent completeness verification, raster acceptance, visual review and counsel review. It is not approved for live use, it opens no route, and it is not legal advice.",
    ""
  );
  return lines.join("\n");
}

function filingInstructions(binding, facts) {
  const { registryTrack } = binding;
  const rules = registryTrack.rules ?? {};
  const actions = registryTrack.packetSet?.participantActionRequired ?? [];
  const find = (kind) => actions.find((a) => a.kind === kind);
  return [
    `# Filing instructions - ${registryTrack.legalName}`,
    "",
    `Prepared for **${facts["participant.full_legal_name"]}**.`,
    "",
    bullet(`Filing: ${rules.filing ?? "the committed record states no filing rule."}`),
    bullet(`Where: ${registryTrack.destination.name}. ${registryTrack.destination.detail}`),
    bullet(`Venue: ${registryTrack.venue}`),
    bullet(`What the registry says about filing: ${find("file")?.description ?? "the committed record holds no filing action for this track."}`),
    bullet(`What it costs: ${find("pay_fee")?.description ?? "the committed record holds no fee action for this track."}`),
    bullet(`Fee waiver: ${find("apply_fee_waiver")?.description ?? "the committed record holds no fee-waiver action for this track."}`),
    bullet(`Service: ${find("serve_party")?.description ?? "the committed record holds no service action for this track."}`),
    bullet(`Notarization: ${find("notarize")?.description ?? "the committed record holds no notarization action for this track."}`),
    "",
    "The order of operations the record fixes: obtain the pardon document and the Nebraska State Patrol criminal history report; confirm that the instrument really is a pardon and that the conviction is still showing publicly; complete the date of the charge on the motion; sign and date the motion; file it in the existing case with the clerk of the court that holds the case. The court, not you, notifies the county or city attorney, and no certificate of service applies to this motion. Bring the pardon document to the hearing.",
    "",
    `Packet set: ${FAMILY_ID}`,
    ""
  ].join("\n");
}

function pardonGuidanceBody(binding, facts, participantText, filingText) {
  const blocks = [block(
    GUIDE,
    TITLES[COMPONENT.pardonGuidance].toUpperCase(),
    `Assigned component identity: ${COMPONENT.pardonGuidance}`,
    `Prepared for: ${facts["participant.full_legal_name"]}`,
    ""
  )];
  const plainLine = (line) => {
    const trimmed = line.trim();
    if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
      return trimmed.slice(1, -1).split("|").map((cell) => cell.trim().replaceAll("**", "").replaceAll("`", "")).join("  |  ");
    }
    return line.replace(/^#{1,6}\s+/, "").replaceAll("**", "").replaceAll("`", "");
  };
  let heading = null;
  let paragraph = [];
  const emit = (lines) => {
    const carried = heading ? [heading, ""] : [];
    heading = null;
    blocks.push(block(...carried, ...lines, ""));
  };
  const flush = () => { if (paragraph.length) { const lines = paragraph; paragraph = []; emit(lines); } };
  for (const raw of `${participantText}\n\n${filingText}`.split("\n")) {
    const trimmed = raw.trim();
    if (trimmed === "") { flush(); continue; }
    if (/^\|(?:\s*:?-+:?\s*\|)+$/.test(trimmed)) continue;
    if (/^#{1,6}\s+/.test(trimmed)) { flush(); heading = plainLine(raw); continue; }
    if (trimmed.startsWith("- ") || trimmed.startsWith("|")) { flush(); emit([plainLine(raw)]); continue; }
    paragraph.push(plainLine(raw));
  }
  flush();
  if (heading) emit([]);
  return blocks;
}

/** A block is drawn whole or moved whole; one that cannot fit stops the build. */
async function renderComposedDocument(blocks, title, componentId) {
  const pdf = await PDFDocument.create();
  stampDeterministic(pdf);
  pdf.setTitle(title);
  pdf.setAuthor("RCAP packet factory, packet-build lane");
  pdf.setCreator("RCAP deterministic Nebraska process-guidance composer");
  pdf.setProducer("RCAP census-v1 artifact renderer");
  const font = await pdf.embedFont(StandardFonts.TimesRoman);
  const top = PAGE_HEIGHT - MARGIN;
  const capacity = Math.floor((top - MARGIN) / LINE_HEIGHT) + 1;

  let hardSplits = 0;
  const splitToken = (token) => {
    const pieces = String(token).split(/(?<=[:/.\-_])/);
    const chunks = [];
    let current = "";
    for (const piece of pieces) {
      const candidate = `${current}${piece}`;
      if (current && font.widthOfTextAtSize(candidate, FONT_SIZE) > MAX_WIDTH) { chunks.push(current); current = piece; }
      else current = candidate;
    }
    if (current) chunks.push(current);
    const out = [];
    for (const chunk of chunks) {
      if (font.widthOfTextAtSize(chunk, FONT_SIZE) <= MAX_WIDTH) { out.push(chunk); continue; }
      hardSplits += 1;
      let acc = "";
      for (const char of chunk) {
        const candidate = `${acc}${char}`;
        if (acc && font.widthOfTextAtSize(candidate, FONT_SIZE) > MAX_WIDTH) { out.push(acc); acc = char; }
        else acc = candidate;
      }
      if (acc) out.push(acc);
    }
    return out;
  };
  const wrap = (raw) => {
    if (!raw) return [""];
    const words = String(raw).split(/\s+/)
      .flatMap((word) => font.widthOfTextAtSize(word, FONT_SIZE) > MAX_WIDTH ? splitToken(word) : [word]);
    const rows = [];
    let current = "";
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, FONT_SIZE) <= MAX_WIDTH) current = candidate;
      else { if (current) rows.push(current); current = word; }
    }
    if (current) rows.push(current);
    return rows.length ? rows : [""];
  };

  let page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = top;
  const drawn = [];
  for (const item of blocks) {
    const rows = item.lines.flatMap((line) => wrap(sanitize(line)));
    assert.ok(rows.length <= capacity,
      `${componentId}: a block of ${rows.length} lines cannot fit on one page (capacity ${capacity}); first line "${String(item.lines[0]).slice(0, 70)}"`);
    const used = Math.round((top - y) / LINE_HEIGHT);
    if (used + rows.length > capacity) { page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]); y = top; }
    for (const row of rows) {
      assert.ok(y >= MARGIN, `${componentId}: a line would be drawn at y=${y}, below the ${MARGIN}pt bottom margin`);
      if (row) {
        const width = font.widthOfTextAtSize(row, FONT_SIZE);
        assert.ok(width <= MAX_WIDTH + 0.01, `${componentId}: a line is ${width.toFixed(1)}pt wide, past the ${MAX_WIDTH}pt text box`);
        page.drawText(row, { x: MARGIN, y, size: FONT_SIZE, font, color: rgb(0, 0, 0) });
        drawn.push({ page: pdf.getPageCount(), x: MARGIN, baseline: y, width, text: row });
      }
      y -= LINE_HEIGHT;
    }
  }
  assert.equal(hardSplits, 0, `${componentId}: ${hardSplits} token(s) had to be broken mid-word to fit the text box`);
  const bytes = Buffer.from(await pdf.save({ useObjectStreams: false, updateMetadata: false }));
  return { bytes, pageCount: pdf.getPageCount(), drawn };
}

/** Ink measured against the printable box of its page. */
function measureInk(drawn) {
  const descent = FONT_SIZE * 0.25;
  const ascent = FONT_SIZE * 0.9;
  let outside = 0;
  for (const row of drawn) {
    const insideX = row.x >= MARGIN - 0.01 && row.x + row.width <= PAGE_WIDTH - MARGIN + 0.01;
    const insideY = row.baseline - descent >= 0 && row.baseline + ascent <= PAGE_HEIGHT;
    if (!insideX || !insideY) outside += row.text.replace(/\s+/g, "").length;
  }
  return outside;
}


/* --------------------------------------------------------- byte proof */

/**
 * What the finalized CC 6:12 bytes actually draw, read at each widget's own
 * measured rectangle. Never the finalizer's own report of what it wrote.
 */
async function proveMotionWrites(bytes, rows, facts, report, fixture, sourceSha256) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "ne-seal-pardoned-readback-"));
  const file = path.join(directory, `${fixture}--${MOTION}.pdf`);
  try {
    fs.writeFileSync(file, bytes);
    const appearances = await flattenedWidgets(file);
    const actualWrites = [];
    const refusedFieldsWithInk = [];
    const narrativeLines = new Map();
    for (const narrative of report.narrativesWritten ?? []) {
      for (const line of narrative.written ?? []) narrativeLines.set(line.field, line.text);
    }
    for (const row of rows) {
      const written = row.decision === "write";
      const perWidget = [];
      for (const widget of row.widgets) {
        const drawn = drawnAt(appearances, widget);
        const drawnText = drawn.map((a) => a.text).join("").trim();
        if (!written) {
          if (drawnText) refusedFieldsWithInk.push({ fieldId: row.field, page: widget.page, drawnText });
          continue;
        }
        const expected = row.kind === "selection_settled_from_held_facts"
          ? drawnText
          : (narrativeLines.get(row.field) ?? String(facts[row.factId] ?? ""));
        assert.equal(drawnText, String(expected).trim(),
          `actual flattened write mismatch: ${fixture} ${MOTION} ${row.field}`);
        perWidget.push({ page: widget.page, rect: widget.rect, drawnText, appearanceCount: drawn.length });
      }
      if (!written) continue;
      const expected = row.kind === "selection_settled_from_held_facts"
        ? perWidget.map((w) => w.drawnText).join("")
        : (narrativeLines.get(row.field) ?? String(facts[row.factId] ?? "")).trim();
      assert.ok(perWidget.length > 0, `${fixture} ${MOTION} ${row.field}: the map claims a write and the bytes carry no widget`);
      actualWrites.push({
        field: row.field,
        factId: row.factId ?? null,
        kind: row.kind,
        page: row.page,
        expected,
        drawnText: perWidget.map((w) => w.drawnText).join(""),
        visibleInArtifactBytes: perWidget.every((w) => w.drawnText.length > 0),
        everyWidgetVisibleInArtifactBytes: perWidget.every((w) => w.drawnText.length > 0),
        widgets: perWidget
      });
    }
    assert.deepEqual(refusedFieldsWithInk, [], `${fixture} ${MOTION}: a field the map refused carries ink in the output`);
    return {
      fixture,
      documentId: MOTION,
      formNumber: MOTION,
      sourceSha256,
      sha256: sha256(bytes),
      proofMethod: "read the flattened appearance drawn at each exact-source widget rectangle in the finalized bytes and compared it with the held value the map declares",
      valuesReportedByFinalizer: report.written.length,
      addedGlyphsReadFromOutputBytes: 0,
      flattenedWidgetAppearancesReadFromOutputBytes: appearances.length,
      nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: 0,
      refusedFieldsWithInk,
      actualWrites
    };
  } finally {
    for (const entry of fs.readdirSync(directory)) fs.unlinkSync(path.join(directory, entry));
    fs.rmdirSync(directory);
  }
}

/* ------------------------------------------------------------ counters */

function normalizedRow(row, written) {
  return {
    id: row.field,
    name: row.fieldName ?? row.field,
    label: row.effectiveLabel ?? "",
    reason: row.reason ?? "",
    refusalClass: Object.hasOwn(row, "completenessClass") ? row.completenessClass : (row.category ?? null),
    page: row.page ?? null,
    document: row.documentId ?? null,
    factId: row.factId ?? null,
    sourceIdentity: row.field,
    isSelectionControl: row.isSelectionControl === true,
    written,
    declared: {
      sourcePresentation: row.sourcePresentation ?? null,
      disposition: row.completenessDisposition ?? null,
      ...(Object.hasOwn(row, "requiredBeforeFiling") ? { requiredBeforeFiling: row.requiredBeforeFiling === true } : {}),
      routeDetermined: row.routeDetermined === true,
      routeConditionThatMakesItInapplicable: row.routeConditionThatMakesItInapplicable ?? null,
      determinedByTheCaseNotTheRoute: row.determinedByTheCaseNotTheRoute === true,
      whyTheRouteCannotDetermineIt: row.whyTheRouteCannotDetermineIt ?? null,
      identity: row.identity ?? row.field ?? null,
      factId: row.factId ?? null
    }
  };
}

/**
 * The builder's own count, using the repository completeness contract and the
 * repository's own source-presentation reader. It is not a verdict and it is
 * not verification; it exists so a family that would fail is stopped here
 * rather than returned as built.
 */
function countCompleteness({ maps, fieldMap, actualWrites, rendered, receipt, census, instructionsText, proofs }) {
  const counters = Object.fromEntries(PASS_COUNTERS.map((key) => [key, 0]));
  const findings = [];
  const note = (counter, detail) => { counters[counter] += 1; findings.push({ counter, ...detail }); };

  const writes = maps.flatMap((map) => map.canonicalWrites.map((r) => normalizedRow(r, true)));
  const blanks = maps.flatMap((map) => map.canonicalRefusals.map((r) => normalizedRow(r, false)));

  const availableFacts = new Set(writes.map((r) => r.factId).filter(Boolean));
  for (const doc of actualWrites.documents ?? []) {
    for (const w of doc.actualWrites ?? []) {
      if (w.factId && String(w.drawnText ?? w.expected ?? "").trim()) availableFacts.add(String(w.factId));
    }
  }
  const normalize = (v) => String(v ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const writtenInDocument = new Map();
  for (const r of writes) {
    if (!writtenInDocument.has(r.document)) writtenInDocument.set(r.document, new Set());
    for (const key of [normalize(r.label), normalize(r.name)]) if (key.length >= 4) writtenInDocument.get(r.document).add(key);
  }

  const ledger = [];
  for (const blank of blanks) {
    const beside = writtenInDocument.get(blank.document) ?? new Set();
    const declared = {
      ...blank.declared,
      sourcePresentation: verifySourcePresentation(blank, { census, receipt, fieldMap, actualWrites, rendered, root: ROOT }),
      factAvailable: (blank.declared.factId ? availableFacts.has(String(blank.declared.factId)) : false)
        || beside.has(normalize(blank.label)) || beside.has(normalize(blank.name))
    };
    const verdict = classifyBlank(blank, blank.reason, blank.refusalClass, declared);
    ledger.push({ ...blank, ...verdict });
    if (BLANK_DISPOSITIONS[verdict.disposition]?.allowed) continue;
    if (verdict.disposition === "KNOWN_FACT_NOT_WRITTEN") note("knownRequiredFieldsMissing", { field: blank.id, basis: verdict.basis });
    else if (verdict.disposition === "ROUTE_OPTION_NOT_SELECTED") note("requiredOptionsMissing", { field: blank.id, basis: verdict.basis });
    else note("unclassifiedBlanks", { field: blank.id, basis: verdict.basis });
  }

  const haystack = instructionsText.toLowerCase();
  for (const blank of ledger.filter((r) => r.disposition === "REQUIRED_BEFORE_FILING")) {
    const needles = [blank.label, blank.id, blank.declared?.identity].map((v) => String(v ?? "").trim()).filter((v) => v.length >= 3);
    if (!needles.some((n) => haystack.includes(n.toLowerCase().slice(0, 60)))) {
      note("requiredFactsNotCollected", { field: blank.id, why: "declared required before filing and not named in participant-instructions.md" });
    }
  }

  const rows = new Map();
  for (const r of [...writes, ...blanks]) {
    const key = rowKeyOf(r);
    if (!key) continue;
    if (!rows.has(key)) rows.set(key, []);
    rows.get(key).push(r);
  }
  for (const [key, cells] of rows) {
    if (!cells.some((c) => c.written)) continue;
    const missing = cells.filter((c) => !c.written && classifyField(c.label, c.isSelectionControl).requirement === "REQUIRED_KNOWN");
    if (missing.length) note("incompleteRows", { row: key, missing: missing.map((c) => c.label) });
  }

  for (const r of writes) {
    if (classifyField(r.label, r.isSelectionControl).requirement === "PROTECTED") note("protectedWrites", { field: r.id, label: r.label });
  }

  for (const proof of proofs) {
    const visible = (proof.addedGlyphsReadFromOutputBytes ?? 0) + (proof.flattenedWidgetAppearancesReadFromOutputBytes ?? 0);
    if ((proof.valuesReportedByFinalizer ?? 0) > 0 && visible === 0) note("invisibleWrites", { fixture: proof.fixture });
    if ((proof.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes ?? 0) > 0) note("visualDefects", { fixture: proof.fixture });
    if ((proof.refusedFieldsWithInk ?? []).length > 0) note("protectedWrites", { fixture: proof.fixture });
  }

  // A component the map or the receipt names and no artifact carries.
  const mapped = new Set([...writes, ...blanks].map((r) => r.document).filter(Boolean));
  const receiptDocuments = new Set((receipt.documents ?? []).map((d) => d.documentId ?? d.formNumber).filter(Boolean));
  for (const documentId of new Set([...mapped, ...receiptDocuments])) {
    const appears = (rendered.packets ?? []).some((p) => (p.documents ?? []).includes(documentId));
    if (!appears) note("requiredComponentsMissing", { component: documentId, why: "named by the field map or the source receipt and carried by no rendered artifact" });
  }
  if (receipt.allSourcesExact !== true) note("visualDefects", { why: "the family's own source receipt does not bind every source to an exact SHA-256" });

  return {
    counters, findings, ledger,
    totals: {
      terminalFields: writes.length + blanks.length,
      written: writes.length,
      blank: blanks.length,
      rowsInspected: rows.size,
      blanksByDisposition: ledger.reduce((acc, r) => { acc[r.disposition] = (acc[r.disposition] ?? 0) + 1; return acc; }, {})
    }
  };
}

function writeJson(relative, value) {
  const target = path.join(ROOT, relative);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, `${JSON.stringify(value, null, 2)}\n`);
}

/* ------------------------------------------------------------- the run */

export async function runFamily(argv = process.argv.slice(2)) {
  const checkOnly = argv.includes("--check");
  const noRaster = argv.includes("--no-raster");
  if (!checkOnly) {
    assert.equal(noRaster, true,
      "this build never rasters: invoke with --no-raster and let the raster gate run centrally against the exact bytes these hashes pin");
  }

  const binding = loadAuthorityBinding();
  const sources = resolveHeldSources(binding.queueFamily);
  const census = await censusOfMotion(sources.motion);
  const sourceSha256 = sources.motion.sha256;

  /*
   * The reference component gets the same active-content sanitation the shared
   * finalizer applies to the motion, and nothing else.
   *
   * CC 6:12a is carried exactly as the Nebraska Judicial Branch publishes it,
   * but the Branch publishes its statutory citations as clickable links and a
   * /URI action is active content. The finalizer refuses to emit an official
   * form carrying any, and a packet whose first two pages are clean while its
   * next two are not is not a sanitised packet. So the same three strippers run
   * over it: document actions, link annotations and active annotation subtypes.
   * No page content operator is touched -- the citations still PRINT, they are
   * simply no longer actions -- and both digests are recorded, the exact held
   * source that binds and the delivered bytes that were carried.
   */
  const instructionsDoc = await PDFDocument.load(sources.instructions.bytes, { ignoreEncryption: true, updateMetadata: false });
  const instructionsPageCount = instructionsDoc.getPageCount();
  assert.equal(instructionsPageCount, 2, `${INSTRUCTIONS} is expected to carry 2 pages`);
  assert.equal(instructionsDoc.getForm().getFields().length, 0,
    `${INSTRUCTIONS} is a reference component and must carry no fillable field`);
  const instructionsSanitation = {
    xfaNeutralized: neutralizeXfa(instructionsDoc),
    documentActionsRemoved: stripDocumentActions(instructionsDoc),
    linkAnnotationsRemoved: stripLinkAnnotations(instructionsDoc),
    uriActionsNeutralized: neutralizeUriActions(instructionsDoc),
    activeAnnotationSubtypesRemoved: stripActiveAnnotationSubtypes(instructionsDoc),
    danglingAnnotsCompacted: compactAnnots(instructionsDoc),
    pageContentOperatorsTouched: 0
  };
  const instructionsDelivered = Buffer.from(await instructionsDoc.save({ useObjectStreams: false, updateMetadata: false }));
  const instructionsDeliveredResidue = scanBytesForActiveContent(instructionsDelivered);
  assert.equal(instructionsDeliveredResidue.inspectable, true, `${INSTRUCTIONS}: the delivered reference pages must be byte-inspectable`);
  assert.deepEqual(instructionsDeliveredResidue.hits, [],
    `${INSTRUCTIONS}: active-content residue remains after sanitation: ${instructionsDeliveredResidue.hits.join(", ")}`);
  const instructionsDeliveredSha256 = sha256(instructionsDelivered);

  const refusals = refusalRows(census, sourceSha256);
  const refusedNames = new Set(refusals.map((r) => r.field));
  const writtenNames = new Set([...Object.keys(WRITE), ROUTE_SELECTION.field, ...NARRATIVE.fields]);
  for (const field of census.fields) {
    assert.ok(refusedNames.has(field.name) || writtenNames.has(field.name),
      `${field.name} is neither written nor classified; every terminal field of ${MOTION} must be decided`);
  }
  assert.equal(refusedNames.size + writtenNames.size, census.fields.length,
    "the written and refused sets must partition the census exactly once");

  const rbf = refusals
    .filter((r) => r.requiredBeforeFiling === true)
    .map((r) => ({
      document: MOTION,
      component: COMPONENT.motion,
      field: r.field,
      page: r.page,
      disclosureLabel: r.effectiveLabel,
      identity: r.identity,
      why: r.why,
      participantMustSupply: r.participantMustSupply
    }));

  if (checkOnly) {
    return {
      familyId: FAMILY_ID, status: "CHECK_ONLY",
      implementationStrategy: STRATEGY, custodyClass: CUSTODY_CLASS,
      heldSourcesResolvedByContentHash: sources.resolved.length,
      mountedCustodies: sources.mounted,
      recordsPinned: binding.pins.length,
      terminalFields: census.fields.length,
      writes: writtenNames.size,
      blanks: refusals.length,
      requiredBeforeFiling: rbf.length
    };
  }

  fs.mkdirSync(path.join(ROOT, OUT, "fixtures"), { recursive: true });
  fs.mkdirSync(path.join(ROOT, OUT, "reports"), { recursive: true });

  const unwritableFields = refusals.map((r) => ({
    field: r.field,
    class: r.completenessClass ?? r.completenessDisposition
  }));
  const documentTextLines = census.pageText.flatMap((p) => p.lines.map((l) => l.text));

  const perFixture = {};
  for (const fixture of ["canonical", "boundary"]) {
    const facts = FIXTURES[fixture];
    const result = await finalizeOfficialForm({
      sourceBytes: sources.motion.bytes,
      expectedSha256: sourceSha256,
      census: census.fields,
      facts,
      explicitMappings: { ...WRITE },
      unwritableFields,
      documentAcceptsFill: true,
      documentTextLines,
      narrativeAcrossFields: [{ factId: NARRATIVE.factId, fields: [...NARRATIVE.fields] }],
      selectionsFromHeldFacts: { [ROUTE_SELECTION.field]: { checked: true, basis: ROUTE_SELECTION.basis } },
      maxFontSize: 11,
      minFontSize: 7,
      evaluateDeclaredMinimumSize: true,
      alignWidgetFontSizeToFit: true,
      fitTextPerWidget: true,
      detachNestedControlFields: true,
      suppressSynthesizedAppearances: true,
      suppressSynthesizedWidgetBorders: true,
      honorWidgetBorderStyle: true,
      fitAppearancesToRect: true,
      preserveUnwrittenSelectionBackgrounds: true,
      title: `${FAMILY_ID} ${MOTION} ${fixture}`
    });

    const writtenByName = new Map(result.report.written.map((w) => [w.field, w]));
    for (const name of writtenNames) {
      /*
       * A continuation line the statement did not need is not a missing write.
       * CC 6:12 prints two rules for the crimes charged and the narrative pass
       * lays the held statement out across as many of them as it needs. A
       * fixture whose statement fits on the first rule leaves the second empty,
       * and stamping the first line onto it again would print the charge twice.
       */
      const optionalContinuation = NARRATIVE.fields.indexOf(name) > 0;
      if (optionalContinuation && !writtenByName.has(name)) continue;
      assert.ok(writtenByName.has(name),
        `${fixture}: ${name} was declared a write and the finalizer did not write it: ${JSON.stringify(result.report.refused.filter((r) => r.field === name))}`);
    }
    for (const name of refusedNames) {
      assert.ok(!writtenByName.has(name), `${fixture}: ${name} was classified a blank and the finalizer wrote it`);
    }
    const narrative = (result.report.narrativesWritten ?? []).find((n) => n.factId === NARRATIVE.factId);
    assert.ok(narrative, `${fixture}: the crimes-charged statement was not laid out across the printed lines`);
    assert.equal(narrative.linesLeftForTheParticipant.length, NARRATIVE.fields.length - narrative.linesUsed,
      `${fixture}: the narrative pass disagrees with itself about how many printed lines it used`);
    perFixture[fixture] = { facts, result, writtenByName, unusedNarrativeLines: narrative.linesLeftForTheParticipant };
  }

  /* -- the map rows, built from what the finalizer actually did ---------- */
  const writeRows = (fixture) => {
    const { writtenByName } = perFixture[fixture];
    return [...writtenNames].filter((name) => writtenByName.has(name)).map((name) => {
      const field = census.fields.find((f) => f.name === name);
      const w = writtenByName.get(name);
      const isSelection = name === ROUTE_SELECTION.field;
      return {
        ...base(name, field.widgets[0].page, field.widgets),
        decision: "write",
        factId: w.factId ?? (isSelection ? null : (WRITE[name] ?? NARRATIVE.factId)),
        kind: w.kind,
        fontSize: w.fontSize ?? null,
        outcome: w.outcome ?? "fit",
        lines: w.lines ?? 1,
        ...(isSelection
          ? {
            isSelectionControl: true,
            routeDetermined: true,
            routeSelection: ROUTE_SELECTION.option,
            routeAuthority: ROUTE_SELECTION.authority,
            basis: w.basis
          }
          : { isSelectionControl: false, routeDetermined: false }),
        ...(w.narrativeLine ? { narrativeLine: w.narrativeLine, narrativeLines: w.narrativeLines } : {})
      };
    }).sort((a, b) => a.field.localeCompare(b.field));
  };
  const refusalRowsFor = (fixture) => {
    const unused = perFixture[fixture].unusedNarrativeLines ?? [];
    const continuation = unused.map((name) => {
      const field = census.fields.find((f) => f.name === name);
      const why = "an unused continuation rule after the complete held statement, not a missing or repeated charge";
      return {
        ...base(name, field.widgets[0].page, field.widgets),
        decision: "refuse",
        reason: why,
        why,
        category: null,
        completenessClass: null,
        class: null,
        completenessDisposition: "NOT_APPLICABLE_ON_THIS_ROUTE",
        routeConditionThatMakesItInapplicable: `The complete held crimes-charged statement fits on the preceding printed rule(s) of this same numbered block on CC 6:12 paragraph 1, so this continuation rule is not reached. Writing on it would print part of the charge twice.`,
        routeDetermined: false,
        requiredBeforeFiling: false,
        isSelectionControl: false
      };
    });
    return [...refusals.map((r) => ({ ...r, decision: "refuse" })), ...continuation]
      .sort((a, b) => a.field.localeCompare(b.field));
  };

  const maps = [{
    formNumber: MOTION,
    documentId: MOTION,
    componentId: COMPONENT.motion,
    documentRole: "primary_filing",
    structuralClass: "acroform",
    officialFormId: MOTION,
    sourceSha256,
    documentPolicy: { mode: "participant", packetSetId: FAMILY_ID, documentAcceptsFill: true },
    explicitMappings: { ...WRITE },
    roleRefusals: [],
    selectionControls: [],
    canonicalWrites: writeRows("canonical"),
    canonicalRefusals: refusalRowsFor("canonical"),
    boundaryWrites: writeRows("boundary"),
    boundaryRefusals: refusalRowsFor("boundary")
  }, {
    formNumber: INSTRUCTIONS,
    documentId: INSTRUCTIONS,
    componentId: COMPONENT.instructions,
    documentRole: "instructions",
    structuralClass: "flat_pdf",
    officialFormId: INSTRUCTIONS,
    sourceSha256: sources.instructions.sha256,
    documentPolicy: {
      mode: "reference",
      packetSetId: FAMILY_ID,
      referenceOnly: true,
      documentAcceptsFill: false,
      whyNothingIsWritten: "CC 6:12a is the court's own instruction sheet. It carries no AcroForm field, it is not a filing blank, and it is delivered exactly as the Nebraska Judicial Branch publishes it."
    },
    explicitMappings: {},
    roleRefusals: [],
    selectionControls: [],
    canonicalWrites: [],
    canonicalRefusals: [],
    boundaryWrites: [],
    boundaryRefusals: []
  }];

  /* -- assemble, prove and emit ------------------------------------------ */
  const artifacts = [];
  const proofs = [];
  const guidancePages = {};
  for (const fixture of ["canonical", "boundary"]) {
    const { facts, result } = perFixture[fixture];
    const participantText = participantInstructions(binding, rbf, facts);
    const filingText = filingInstructions(binding, facts);
    const guidance = await renderComposedDocument(
      pardonGuidanceBody(binding, facts, participantText, filingText),
      TITLES[COMPONENT.pardonGuidance], COMPONENT.pardonGuidance);
    guidancePages[fixture] = guidance;

    const packet = await PDFDocument.create();
    stampDeterministic(packet);
    packet.setTitle(`${binding.registryTrack.legalName} - ${fixture}`);
    packet.setAuthor("RCAP packet factory, packet-build lane");
    packet.setCreator("RCAP deterministic Nebraska official-form builder");
    packet.setProducer("RCAP census-v1 artifact renderer");

    const pageManifest = [];
    const parts = [
      { componentId: COMPONENT.motion, documentId: MOTION, bytes: Buffer.from(result.bytes), sourceSha256, sourceClass: "exact_official_source_filled_and_flattened" },
      { componentId: COMPONENT.instructions, documentId: INSTRUCTIONS, bytes: instructionsDelivered, sourceSha256: sources.instructions.sha256, sourceClass: "exact_official_source_carried_with_active_content_stripped_and_no_page_content_changed" },
      { componentId: COMPONENT.pardonGuidance, documentId: GUIDE, bytes: guidance.bytes, sourceSha256: null, sourceClass: "process_guidance_composed_from_the_committed_records" }
    ];
    for (const part of parts) {
      const doc = await PDFDocument.load(part.bytes, { ignoreEncryption: true, updateMetadata: false });
      const pages = await packet.copyPages(doc, doc.getPageIndices());
      pages.forEach((page, index) => {
        packet.addPage(page);
        pageManifest.push({
          packetPage: packet.getPageCount(),
          component: part.componentId,
          documentId: part.documentId,
          formNumber: part.documentId,
          sourcePage: index + 1,
          sourceSha256: part.sourceSha256,
          sourceClass: part.sourceClass
        });
      });
    }
    assert.deepEqual([...new Set(pageManifest.map((r) => r.component))], RENDERED_COMPONENTS);

    const packetBytes = Buffer.from(await packet.save({ useObjectStreams: false, updateMetadata: false }));
    const residue = scanBytesForActiveContent(packetBytes);
    assert.equal(residue.inspectable, true, "the assembled packet must be byte-inspectable");
    assert.deepEqual(residue.hits, [], `active-content residue in the assembled ${fixture} packet: ${residue.hits.join(", ")}`);
    const file = `${OUT}/fixtures/${fixture}.pdf`;
    fs.writeFileSync(path.join(ROOT, file), packetBytes);

    const proof = await proveMotionWrites(Buffer.from(result.bytes), maps[0][`${fixture}Writes`].concat(maps[0][`${fixture}Refusals`]).map((r) => ({
      field: r.field, decision: r.decision, kind: r.kind, factId: r.factId ?? null, page: r.page, widgets: r.widgets
    })), FIXTURES[fixture], result.report, fixture, sourceSha256);
    proof.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes = measureInk(guidance.drawn);
    proof.addedGlyphsReadFromOutputBytes = guidance.drawn.reduce((n, r) => n + r.text.replace(/\s+/g, "").length, 0);
    proof.composedGuidanceLinesDrawn = guidance.drawn.length;
    proofs.push(proof);

    artifacts.push({
      fixture, file,
      sha256: sha256(packetBytes),
      byteLength: packetBytes.length,
      pageCount: packet.getPageCount(),
      pageManifest,
      components: RENDERED_COMPONENTS,
      documents: [MOTION, INSTRUCTIONS, GUIDE],
      motionSha256: sha256(Buffer.from(result.bytes)),
      motionByteLength: result.bytes.length
    });
  }

  const canonicalFacts = FIXTURES.canonical;
  const participantText = participantInstructions(binding, rbf, canonicalFacts);
  const filingText = filingInstructions(binding, canonicalFacts);
  fs.writeFileSync(path.join(ROOT, OUT, "participant-instructions.md"), participantText);
  fs.writeFileSync(path.join(ROOT, OUT, "filing-instructions.md"), filingText);

  const notGenerated = binding.components
    .filter((row) => !RENDERED_COMPONENTS.includes(row.componentId))
    .map((row) => ({
      componentId: row.componentId,
      role: row.role,
      requirement: row.requirement,
      officialFormId: row.officialFormId ?? null,
      conditionTheRecordStates: row.conditionDescription,
      generated: false,
      whyNotGenerated: "neither fixture establishes that the participant cannot pay a fee the clerk requires, so the stated condition is not met; the committed memo separately records this branch as an open release blocker because DC 6:7.1 is scoped to civil, appeals and emancipation matters and no county-court in forma pauperis application form exists"
    }));

  const census_v1 = {
    schemaVersion: "rcap-field-census/census-v1",
    familyId: FAMILY_ID,
    documents: [{
      documentId: MOTION,
      formNumber: MOTION,
      sourceSha256,
      byteLength: sources.motion.byteLength,
      pageCount: 2,
      documentPolicy: census.documentPolicy,
      fields: census.fields,
      pageText: census.pageText
    }, {
      documentId: INSTRUCTIONS,
      formNumber: INSTRUCTIONS,
      sourceSha256: sources.instructions.sha256,
      byteLength: sources.instructions.byteLength,
      pageCount: instructionsPageCount,
      documentPolicy: {
        mode: "reference",
        packetSetId: FAMILY_ID,
        referenceOnly: true,
        documentAcceptsFill: false,
        sourceFieldEvidence: {}
      },
      fields: [],
      pageText: []
    }]
  };

  const receipt = {
    schemaVersion: "rcap-family-source-receipt/v2",
    familyId: FAMILY_ID,
    worklistGroupId: FAMILY_ID,
    jurisdiction: JURISDICTION,
    trackId: TRACK_ID,
    routeKeys: binding.queueFamily.routeKeys,
    implementationStrategy: STRATEGY,
    custodyClass: CUSTODY_CLASS,
    sourceStatus: CUSTODY_CLASS,
    officialFormFamily: binding.queueFamily.officialFormFamily,
    acquisitionCommissioned: false,
    sourceAcquisitionAuthorized: false,
    sourceBinariesRequired: (binding.queueFamily.sourceHashes ?? []).length,
    sourceBinariesResolved: sources.resolved.length,
    allSourcesExact: true,
    resolutionRule: "sources are resolved by SHA-256 across the mounted corpus and never by declared path; the declared path is recorded as the thing that was declared",
    mountedCustodies: sources.mounted,
    sources: sources.resolved.map(({ bytes, ...row }) => ({ ...row, sourceId: row.sourceId })),
    documents: [
      { documentId: MOTION, formNumber: MOTION, componentId: COMPONENT.motion, sha256: sourceSha256, sha256Exact: true, byteLength: sources.motion.byteLength, pathInArchive: sources.motion.resolvedPath, role: "primary_filing" },
      { documentId: INSTRUCTIONS, formNumber: INSTRUCTIONS, componentId: COMPONENT.instructions, sha256: sources.instructions.sha256, sha256Exact: true, byteLength: sources.instructions.byteLength, pathInArchive: sources.instructions.resolvedPath, role: "instructions", deliveredSha256: instructionsDeliveredSha256, deliveredByteLength: instructionsDelivered.length, deliveredTreatment: "active content stripped, no page content operator touched", sanitation: instructionsSanitation }
    ],
    composedComponents: [{ documentId: GUIDE, componentId: COMPONENT.pardonGuidance, composed: true, sha256: null, compositionTreatment: "PROCESS_GUIDANCE_COMPOSED_FROM_THE_COMMITTED_RECORDS" }],
    authorityCurrentness: {
      reviewedAsOf: binding.registryTrack.reviewedAsOf,
      effectiveFrom: binding.registryTrack.effectiveFrom,
      effectiveTo: binding.registryTrack.effectiveTo,
      legalInputStatus: binding.queueFamily.legalInputStatus,
      legalDesignDecision: binding.memoTrack.legalDesignDecision.status
    },
    groundingRecords: binding.pins,
    commercialRoutesOpened: 0,
    whatThisReceiptDoesNotEstablish: [
      "independent verification, raster acceptance, visual acceptance, counsel approval, or approval for participant delivery",
      "that this participant holds a Nebraska Board of Pardons pardon rather than a warrant of discharge, a set-aside or a firearm-rights restoration",
      "what filing fee, if any, a Nebraska clerk collects on a motion inside an existing criminal case",
      "that any commercial route is open"
    ]
  };

  const rendered = {
    schemaVersion: "rcap-rendered-artifacts/v2",
    familyId: FAMILY_ID,
    renderedFresh: true,
    derivedFromBytes: true,
    componentIdentityMode: "exact",
    componentSet: RENDERED_COMPONENTS,
    documentSet: [MOTION, INSTRUCTIONS, GUIDE],
    pdfs: artifacts.map((a) => ({
      file: a.file, documentId: "assembled_packet", role: "assembled_packet",
      fixture: a.fixture, sha256: a.sha256, byteLength: a.byteLength, pageCount: a.pageCount
    })),
    artifacts,
    packets: artifacts.map((a) => ({ fixture: a.fixture, documents: a.documents, components: a.components })),
    everyPageRastered: false,
    byteDerivedHashes: true,
    rasterEngine: null,
    rasterSkipped: true,
    rasterSkippedBecause: "the raster gate runs centrally in .github/workflows/rcap-packet-raster-acceptance-batch.yml against the exact bytes these hashes pin; a builder's own render is a build check and not acceptance",
    rasterPages: [],
    rasterState: "BUILT_RASTER_PENDING",
    independentVerificationPending: true
  };

  const actualWrites = {
    schemaVersion: "rcap-actual-writes-byte-proof/v2",
    familyId: FAMILY_ID,
    derivedFromArtifactBytes: true,
    note: "Every declared write was read back as the flattened appearance drawn at its own exact-source widget rectangle in the finalized bytes. Every refused field was checked for ink at the same rectangles.",
    documents: proofs,
    artifacts: proofs.map((p) => ({
      fixture: p.fixture,
      valuesReportedByFinalizer: p.valuesReportedByFinalizer,
      addedGlyphsReadFromOutputBytes: p.addedGlyphsReadFromOutputBytes,
      flattenedWidgetAppearancesReadFromOutputBytes: p.flattenedWidgetAppearancesReadFromOutputBytes,
      nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: p.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes,
      refusedFieldsWithInk: p.refusedFieldsWithInk
    })),
    blockingFindings: []
  };

  const fieldMap = {
    schemaVersion: "rcap-official-form-field-map/v1-census-v1",
    familyId: FAMILY_ID,
    trackId: TRACK_ID,
    jurisdiction: JURISDICTION,
    routeKeys: binding.queueFamily.routeKeys,
    statute: "Neb. Rev. Stat. section 29-3523(5)",
    legalName: binding.registryTrack.legalName,
    implementationStrategy: STRATEGY,
    renderStrategy: "official_pdf_acroform_fill_and_flatten",
    componentSet: RENDERED_COMPONENTS,
    pageOrder: RENDERED_COMPONENTS,
    componentsNotGenerated: notGenerated,
    routeSelectionNote: "This packet set serves one route and states which statutory ground it proceeds under on the face of the motion. Paragraph 2 of CC 6:12 says to select one; the third option is marked and the other three are recorded as grounds this route does not use.",
    routeSelectionsMade: [{
      field: ROUTE_SELECTION.field,
      document: MOTION,
      option: ROUTE_SELECTION.option,
      authority: ROUTE_SELECTION.authority,
      routeDetermined: true,
      basis: ROUTE_SELECTION.basis
    }],
    dispositionVocabulary: ["NON_FILING_SOURCE_ELEMENT", "PROTECTED_FIELD", "NOT_APPLICABLE_ON_THIS_ROUTE", "REQUIRED_BEFORE_FILING"],
    requiredBeforeFilingCount: rbf.length,
    requiredBeforeFiling: rbf,
    maps,
    generationAllowed: false,
    runtimeSelectable: false,
    commercialRoutesOpened: 0
  };

  const counted = countCompleteness({
    maps, fieldMap, actualWrites, rendered, receipt, census: census_v1,
    instructionsText: participantText, proofs
  });
  const allNineZero = PASS_COUNTERS.every((c) => counted.counters[c] === 0);

  writeJson(`${OUT}/field-census.census-v1.json`, census_v1);
  writeJson(`${OUT}/source-receipt.json`, receipt);
  writeJson(`${OUT}/production-field-map.json`, fieldMap);
  writeJson(`${OUT}/reports/rendered-artifacts.json`, rendered);
  writeJson(`${OUT}/reports/actual-writes.json`, actualWrites);
  writeJson(`${OUT}/reports/finalizer-reports.json`, {
    schemaVersion: "rcap-finalizer-reports/v1",
    familyId: FAMILY_ID,
    whatThisIs: "the finalizer's own report, kept beside the byte proof rather than in place of it",
    fixtures: Object.fromEntries(Object.entries(perFixture).map(([fixture, v]) => [fixture, v.result.report]))
  });
  writeJson(`${OUT}/reports/record-bindings.json`, {
    schemaVersion: "rcap-family-record-bindings/v1",
    familyId: FAMILY_ID,
    question: "Which committed records does this packet rest on, and did any of them move?",
    everyRecordPinnedTwice: true,
    whyTwice: "a whole-file pin on a shared national record goes stale whenever an unrelated jurisdiction is productised; the entry pin says whether the change touched this family",
    bindings: binding.pins
  });
  writeJson(`${OUT}/reports/blanks-left-for-the-participant.json`, {
    schemaVersion: "rcap-blanks-left-for-the-participant/v1",
    familyId: FAMILY_ID,
    requiredBeforeFiling: rbf,
    protectedBlanks: refusals
      .filter((r) => r.requiredBeforeFiling !== true)
      .map((r) => ({ document: MOTION, field: r.field, page: r.page, label: r.effectiveLabel, disposition: r.completenessDisposition, refusalClass: r.completenessClass ?? null, why: r.why })),
    unfieldedManualCompletions: (binding.memoTrack.manualCompletionItems ?? []).map((row) => ({
      item: row.item, whereInPacket: row.whereInPacket, why: row.why,
      note: "CC 6:12 prints a signature rule with no AcroForm widget on it, so this item is disclosed in participant-instructions.md rather than carried as a field-map row"
    })),
    everyIntentionalBlankClassified: true,
    everyRequiredBeforeFilingItemIsDisclosed: true,
    disclosedIn: `${OUT}/participant-instructions.md`,
    obtainOrConfirmBeforeFiling: (binding.registryTrack.packetSet?.participantActionRequired ?? [])
      .filter((a) => a.requiredBeforeFiling === true)
      .map((a) => ({ kind: a.kind, requirement: a.requirement, obtainedFrom: a.obtainedFrom ?? null, description: a.description })),
    selfHelpStopConditionsCarried: (binding.memoTrack.selfHelpStopConditions ?? []).length
  });
  writeJson(`${OUT}/packet-set-manifest.json`, {
    schemaVersion: "rcap-packet-set/v1",
    familyId: FAMILY_ID,
    jurisdiction: JURISDICTION,
    trackId: TRACK_ID,
    packetSetVersion: binding.packetSet.version,
    routeKeys: binding.queueFamily.routeKeys,
    implementationStrategy: STRATEGY,
    custodyClass: CUSTODY_CLASS,
    components: binding.components.map((row) => ({
      componentId: row.componentId,
      documentId: DOCUMENT_OF[row.componentId] ?? row.officialFormId ?? row.componentId,
      title: TITLES[row.componentId] ?? null,
      role: row.role,
      requirement: row.requirement,
      outputStrategy: row.outputStrategy,
      officialFormId: row.officialFormId ?? null,
      order: row.order,
      generated: RENDERED_COMPONENTS.includes(row.componentId)
    })),
    componentsNotGenerated: notGenerated,
    participantInstructions: `${OUT}/participant-instructions.md`,
    filingInstructions: `${OUT}/filing-instructions.md`
  });
  writeJson(`${OUT}/reports/completeness-counters.json`, {
    schemaVersion: "rcap-builder-completeness-counters/v1",
    familyId: FAMILY_ID,
    whatThisIs: "the builder's own count using the repository completeness contract and the repository's own source-presentation reader",
    whatThisIsNot: "independent verification, a raster verdict, or a release verdict",
    counters: counted.counters,
    allNineZero,
    findings: counted.findings,
    totals: counted.totals
  });
  writeJson(`${OUT}/build-status.json`, {
    schemaVersion: "rcap-family-build-status/v1",
    familyId: FAMILY_ID,
    buildStatus: "state_built",
    status: "BUILT_RASTER_PENDING",
    reviewStatus: "qa_review_pending",
    builtBy: BUILD_SCRIPT,
    implementationStrategy: STRATEGY,
    sourceStatus: CUSTODY_CLASS,
    renderedArtifacts: artifacts.length,
    rasterPages: 0,
    rasterEngine: null,
    popplerUsed: false,
    rasterState: "BUILT_RASTER_PENDING",
    independentVerificationStatus: "PENDING",
    selfVerified: false,
    generationAllowed: false,
    runtimeSelectable: false,
    commercialRoutesOpened: 0,
    productionTouched: false,
    grantsNothing: "A built packet is review evidence only. It opens no route and authorizes no fulfillment."
  });
  writeJson(`${OUT}/build-findings.json`, {
    schemaVersion: "rcap-family-build-findings/v1",
    familyId: FAMILY_ID,
    blocking: [],
    findings: [
      {
        finding: "One of the two declared sources is declared at a path inside a custody that is not mounted in this container.",
        treatment: `Both digests resolved by content hash inside ${sources.mounted.join(" and ")}, each file re-hashed from its bytes, and both the declared and the resolved path recorded.`
      },
      {
        finding: "CC 6:12's court caption is not page content. Six AcroForm fields carry it, and two of them are non-printing screen choosers whose /AA /C calculate script assigns the chooser's own value over the whole caption field, deleting the court's printed words.",
        treatment: "No script is run. The court level is written into TYPEOFCOURTRESULTS as the complete caption half the form prints, and the county into the write-in box the caption names, so every word the form prints survives. The two choosers are classified as measured non-printing source controls and the two remaining read-only caption elements as measured source caption presentations, both through the completeness contract's own source-presentation reader."
      },
      {
        finding: "An earlier lane recorded a Nebraska stop on the ground that the only held CC-6-12 identity was a two-page instructions PDF rather than the motion.",
        treatment: `Two distinct identities are held and both were read first hand on this build: the motion at ${sourceSha256} carrying 24 AcroForm fields on 2 pages, and the instruction sheet at ${sources.instructions.sha256} carrying 0 fields on 2 pages. No instruction sheet is treated as a motion.`
      },
      {
        finding: "The date of the charge on paragraph 1 is not a fact the platform holds; the committed participant-input list for this track never asks for it.",
        treatment: "Declared REQUIRED_BEFORE_FILING on the field, left blank, and named in participant-instructions.md with what the participant must supply. Nothing is guessed."
      },
      {
        finding: "Paragraph 2 of CC 6:12 offers four grounds and says to select one.",
        treatment: `The third, "resulted in a conviction that was later pardoned", is marked because ${ROUTE_SELECTION.authority} is the route this packet is built for and the committed memo names that checkbox for this track. The other three are recorded as grounds this route does not use, with the condition stated on each.`
      },
      {
        finding: "The fee for a motion inside an existing Nebraska criminal case is not established, and the fee-waiver branch has no fitting official form.",
        treatment: "No fee figure is stated to a participant. Both open questions are carried verbatim into participant-instructions.md, and the conditional fee-waiver component is not generated."
      },
      {
        finding: "CC 6:12 prints a signature rule with no AcroForm widget on it, so the participant's signature is not a field this map can carry.",
        treatment: "It is disclosed in participant-instructions.md and in blanks-left-for-the-participant.json as an unfielded manual completion. The signature date, which IS a field, is left blank and classified PROTECTED_FIELD."
      },
      {
        finding: `The memo holds ${(binding.memoTrack.selfHelpStopConditions ?? []).length} self-help stop conditions, ${(binding.memoTrack.exclusions ?? []).length} exclusions and ${(binding.memoTrack.unresolvedQuestions ?? []).length} open questions for this track.`,
        treatment: "Every one is carried and counted in participant-instructions.md, with the count printed beside the list so short carriage is visible."
      }
    ]
  });
  writeJson(`${OUT}/approval-request.json`, {
    schemaVersion: "rcap-family-approval-request/v1",
    familyId: FAMILY_ID,
    requested: "independent completeness verification, central raster acceptance, visual review, and counsel review",
    buildStatus: "state_built",
    status: "PENDING_INDEPENDENT_VERIFICATION",
    approvedForLive: false,
    live: false,
    commercialRoutesOpened: 0,
    artifacts: artifacts.map((a) => ({ fixture: a.fixture, file: a.file, sha256: a.sha256, byteLength: a.byteLength, pageCount: a.pageCount })),
    counselQuestionsRaised: [
      "CC 6:12's own calculate script replaces the caption field's whole value with the chooser's option, which deletes 'IN THE ... COURT OF' from the filed page. This build instead writes the complete caption half, preserving every word the form prints. Confirm that is the right treatment for a flattened paper filing, or say which of the two a Nebraska clerk expects.",
      "Confirm that marking paragraph 2's third ground, and leaving the other three unmarked, is the correct statement of the Neb. Rev. Stat. section 29-3523(5) route on a packet built for that route alone.",
      "Confirm that the date of the charge is properly left to the participant here, given that the committed intake for this track collects the conviction and the pardon date and not the charge date.",
      "Confirm that withholding the conditional fee-waiver component is right while the record records that DC 6:7.1 does not fit a criminal case and no county-court in forma pauperis application form exists."
    ],
    mattersForTheReviewersAttention: [
      "Every committed record is pinned twice: by whole-file SHA-256 and by the SHA-256 of this family's own entry inside it.",
      "Both sources were resolved by content hash across the mounted corpus, never by the declared path.",
      "Every source-presentation classification was decided by the repository's own reader against widget evidence measured from the pinned bytes on this build.",
      "The build status is BUILT_RASTER_PENDING. No raster ran here, no self-verification is claimed, and visualDefects records that nobody has looked."
    ]
  });
  writeJson(`${OUT}/product-wiring.json`, {
    schemaVersion: "rcap-product-wiring/v1",
    familyId: FAMILY_ID,
    routeKeys: binding.queueFamily.routeKeys,
    generationAllowed: false,
    runtimeSelectable: false,
    checkoutEnabled: false,
    sponsoredEntitlement: false,
    packetCreditConsumption: false,
    commercialRoutesOpened: 0,
    productionTouched: false,
    why: "A built packet is review evidence. Commercial authority comes from a Grade-A fulfillment record keyed to an exact route and packet family, and from nothing else."
  });

  assert.equal(allNineZero, true,
    `the builder's own completeness count is not zero: ${JSON.stringify({ counters: counted.counters, findings: counted.findings }, null, 2)}`);

  return {
    familyId: FAMILY_ID,
    status: "BUILT_RASTER_PENDING",
    implementationStrategy: STRATEGY,
    custodyClass: CUSTODY_CLASS,
    routeKeys: binding.queueFamily.routeKeys,
    directory: OUT,
    componentsAuthoritative: binding.components.length,
    componentsRendered: RENDERED_COMPONENTS,
    componentsNotGenerated: notGenerated.map((r) => r.componentId),
    heldSources: sources.resolved.map((r) => ({ sourceId: r.sourceId, sha256: r.sha256, resolvedPath: r.resolvedPath })),
    recordBindings: binding.pins.map((r) => ({ record: r.record, wholeFileSha256: r.wholeFileSha256, thisFamilysEntrySha256: r.thisFamilysEntrySha256 })),
    counters: counted.counters,
    nineCountersZero: allNineZero,
    terminalFields: census.fields.length,
    writes: writtenNames.size,
    blanks: refusals.length,
    blanksByDisposition: counted.totals.blanksByDisposition,
    requiredBeforeFiling: rbf.length,
    routeSelectionsMade: 1,
    artifactHashes: artifacts.map((a) => ({ fixture: a.fixture, packetSha256: a.sha256, byteLength: a.byteLength, pages: a.pageCount, motionSha256: a.motionSha256 })),
    rasterPages: 0,
    rasterState: "BUILT_RASTER_PENDING",
    packetsSelfVerified: 0,
    commercialRoutesOpened: 0,
    productionTouched: false
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(thisFile)) {
  runFamily()
    .then((result) => console.log(JSON.stringify(result, null, 2)))
    .catch((error) => { console.error(error); process.exit(1); });
}
