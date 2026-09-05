/**
 * The shared build host for the three New Mexico district-court expungement
 * families.
 *
 *   nm_identity_theft-set
 *   nm_conviction-set
 *   nm_release_without_conviction-set
 *
 * WHY THESE THREE SHARE A HOST
 *
 * They are the same packet three times over. Each is a Rule 1-077.1 NMRA civil
 * petition in district court, and each binds Form 4-960.1 NMRA (the statewide
 * notice of hearing) and Form 4-222 NMRA (the fee-waiver application) as
 * components -- the identical binaries, at the identical digests, in all three
 * families. Writing the notice of hearing three times would mean measuring it
 * three times and getting three answers; the shared dictionaries in
 * ./nm-shared-documents.mjs are measured once and read by all three, with the
 * one thing that genuinely differs between the routes -- whether anybody is
 * SERVED -- passed in as a parameter rather than copied.
 *
 * WHY THE SOURCES ARE RESOLVED BY CONTENT HASH AND NEVER BY PATH
 *
 * Every one of these families declares its sources at paths under
 * `private/source-imports/rcap-d-source-packs-2026-08-12/`, a custody that is
 * NOT mounted here. Two of the five custodies the committed index names are.
 * Resolving by the declared path therefore produces BLOCKED_SOURCE for a
 * document whose exact bytes are held, which is the wrong answer arrived at
 * confidently. `resolveSourcesByHash` starts from the digest the assignment
 * pins, finds every index entry carrying that digest in any custody, and takes
 * the first whose bytes are on disk AND hash to the pinned value. A path is an
 * address; the digest is the identity.
 *
 * WHY THE FLAT FORMS ARE MEASURED ON EVERY RUN
 *
 * Three of the four documents of the identity-theft family, and six of the
 * seven of each of the other two, are flat PDFs: no AcroForm, nothing to fill.
 * Their blanks are measured by ./nm-flat-blank-measurer.mjs from the pinned
 * bytes on every build, and each dictionary entry is keyed by the measured
 * position of the blank it describes. A blank that moves changes its key and
 * the build refuses, rather than writing a value onto whatever is now at those
 * coordinates.
 *
 * WHAT THIS HOST NEVER DOES
 *
 *   * It never marks a selection control. New Mexico draws its tick boxes as
 *     printed "[ ]" characters, so there is no path geometry and no widget to
 *     mark; a box drawn from a derived coordinate is a mark nobody measured.
 *     Every control is named in participant-instructions.md instead, with what
 *     to mark and why.
 *   * It never writes a date on a document sworn under penalty of perjury.
 *   * It never writes below the caption of a proposed order. The New Mexico
 *     Judiciary's own instruction packet says the petitioner completes only the
 *     caption and the court completes the rest.
 *   * It never truncates. A value that will not fit its measured box at a
 *     readable size is refused and the refusal is reported.
 *
 * Rasterization goes through scripts/raster/pdf-page-raster.mjs. Never Poppler.
 */
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

import { extractTextItems, groupIntoLines } from "../rcap-official-forms/rcap-pdf-anchor-capture.mjs";
import { finalizeOfficialForm, finalizeFlatOverlay } from "../rcap-official-forms/rcap-official-form-finalize.mjs";
import { flattenedWidgets, drawnAt } from "../rcap-official-forms/pdf-flattened-widgets.mjs";
import { stampDeterministic } from "../rcap-official-forms/rcap-deterministic-pdf-date.mjs";
import { checkboxCandidates } from "../lib/pdf-stroked-boxes.mjs";
import { BLANK_DISPOSITIONS, PASS_COUNTERS, classifyField, classifyBlank, rowKeyOf }
  from "../rcap-packet-completeness/completeness-contract.mjs";
import { measureDocumentBlanks } from "./nm-flat-blank-measurer.mjs";

const require = createRequire(import.meta.url);
const { PDFDocument } = require("pdf-lib");
const { rasterizePageCalibrated } = await import("../raster/pdf-page-raster.mjs");

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const CORPUS_INDEX = "data/rcap-all50/local-source-corpus-index.json";
const PACKET_SET_MANIFESTS = "data/record-clearing/legal-design-packet-set-manifests.json";
const RASTER_ENGINE = "scripts/raster/pdf-page-raster.mjs (Chromium, calibrated)";
/** The value sits ON the printed rule: two points in, two points up. */
export const WRITE_BOX_INSET = 2;
export const WRITE_BOX_HEIGHT = 12;

/* ------------------------------------------------------------------ *
 * The policy vocabulary a document dictionary is written in.
 *
 * Each returns a plain object; nothing here decides a disposition. The
 * completeness contract decides that, from the field-map row this host builds
 * out of these, and the build then measures its own nine counters through the
 * repository's own contract functions rather than asserting them.
 * ------------------------------------------------------------------ */

export const SIGNATURE = "signature_or_date_participant_completion";
export const COURT_OWNED = "court_prosecutor_clerk_or_agency_owned";
export const PARTICIPANT_ELECTION = "participant_sworn_narrative_or_legal_election";

/** The platform holds this fact and writes it here. */
export const WRITE = (fact) => ({ policy: "write", fact });

/**
 * The platform holds no value for this and the participant supplies it before
 * filing.
 *
 * `what` is what the packet tells the PARTICIPANT to write, and it lands in the
 * "What to write" column of a table a self-represented litigant reads. It is
 * kept in their language.
 *
 * `whyTheBuildDoesNotHoldIt` is for the reviewer and the record: which shared
 * protect rule refused the write, which registry descriptor is missing, which
 * fact the intake never collects. That belongs in the field map and in
 * build-findings.json, and it does not belong in a filing instruction. The two
 * were one string in the first version of this and the participant's table read
 * "the shared fact registry has no descriptor for other names or aliases",
 * which is true, is the right thing to record, and is not something to say to
 * someone trying to file a petition.
 */
export const SUPPLY = (what, whyTheBuildDoesNotHoldIt = null) => ({ policy: "supply", what, buildNote: whyTheBuildDoesNotHoldIt });

/** A signature, a signature date, a notarial certificate, a court-only blank. */
export const PROTECT = (refusalClass, why) => ({ policy: "protect", refusalClass, why });

/**
 * A blank inside the decretal text of a proposed order.
 *
 * Kept apart from PROTECT because the typed refusal class cannot carry it. The
 * contract refuses `court_prosecutor_clerk_or_agency_owned` on an AGENCY_FACT
 * field, deliberately and for a good reason: on a PETITION the arresting agency
 * is a case fact the participant holds, and bundling it with the clerk and the
 * judge lets a required fact hide inside a protected class. On a proposed ORDER
 * that reasoning inverts -- the agency line sits inside a decretal paragraph
 * only a judge may make, and the New Mexico Judiciary's instruction packet says
 * in terms that the petitioner completes only the caption and the court
 * completes the rest of the form. So the refusal is stated in prose that names
 * the ground, and the field map records `courtOwnedDecretalText` so a reviewer
 * can see which rows took this route and why.
 */
export const DECRETAL = (why) => ({ policy: "decretal", why });

/** A choice on the paper that is the participant's own to make and to mark. */
export const ELECTION = (why) => ({ policy: "election", why });

/**
 * A blank inside a certificate only an attorney signs.
 *
 * The contract's own attorney path: an ATTORNEY_BLOCK field whose reason speaks
 * of attorney representation is not applicable on a route where no
 * representation fact is held. Page 5 of Form 4-222 is the case -- it is headed
 * "IF YOU ARE REPRESENTED BY AN ATTORNEY, YOUR ATTORNEY MUST SIGN THE FOLLOWING
 * CERTIFICATE" -- and these packets are prepared for self-represented
 * petitioners.
 */
export const ATTORNEY = (why) => ({ policy: "attorney", why });

/**
 * A blank on a branch of the form this route does not reach.
 *
 * `condition` must name the branch of the form, the rule, or the route fact
 * that puts the blank outside the route -- the contract refuses a condition
 * that is a statement of build policy, refuses a row that also declares
 * routeDetermined, and refuses one whose fact the packet writes elsewhere.
 */
export const INAPPLICABLE = (condition, why) => ({ policy: "inapplicable", condition, why });

/**
 * A blank the form offers and the filing does not require: an overflow line
 * under a list that already carries the held value, or an entry a participant
 * has only if their case has one.
 */
export const OPTIONAL = (why) => ({ policy: "optional", why });

/**
 * A printed rule that is not a blank at all.
 *
 * The retained local order forms carry footnote separators: a 144pt rule above
 * the footnote text at the foot of the page. It is a printed rule and a stroke
 * reader finds it, and writing on it would put a participant's value across the
 * bottom margin of a court's order. Recorded as what it is, with the footnote
 * it separates quoted, and carried in the field census rather than in the field
 * map, because a rule that is not a place to write is not a terminal field.
 */
export const NOT_A_BLANK = (why) => ({ policy: "not_a_blank", why });

/* ---- source binding, by content hash ------------------------------------- */

export function corpusRoots() {
  const index = JSON.parse(fs.readFileSync(path.join(ROOT, CORPUS_INDEX), "utf8"));
  const configured = process.env.MASTER_LIBRARY_SOURCE_DIR ?? null;
  const roots = new Map();
  for (const custody of index.custodies ?? []) {
    const declared = custody.root;
    const base = custody.id === "master_library" && configured ? configured : declared;
    roots.set(custody.id, { base, pathsRelativeTo: custody.pathsRelativeTo, custodyType: custody.custodyType ?? null });
  }
  return { index, roots };
}

/**
 * Resolve every document from the digest the assignment pins, across every
 * custody the committed index names, and never from a declared path.
 */
export function resolveSourcesByHash(documents) {
  const { index, roots } = corpusRoots();
  const entries = index.entries ?? [];
  const resolved = [];
  const failures = [];
  for (const wanted of documents) {
    const candidates = entries.filter((e) => e.sha256 === wanted.sha256);
    if (candidates.length === 0) {
      failures.push({ sourceId: wanted.sourceId, sha256: wanted.sha256, why: "no entry in the committed corpus index carries this digest in any custody" });
      continue;
    }
    const tried = [];
    let bound = null;
    for (const candidate of candidates) {
      const custody = roots.get(candidate.custody);
      if (!custody) { tried.push({ custody: candidate.custody, why: "the index names no root for this custody" }); continue; }
      const abs = custody.pathsRelativeTo === "custodyRoot"
        ? path.resolve(ROOT, custody.base, candidate.path)
        : path.resolve(ROOT, candidate.path);
      if (!fs.existsSync(abs)) { tried.push({ custody: candidate.custody, why: "this custody is not mounted at that location" }); continue; }
      const bytes = fs.readFileSync(abs);
      const sha256 = crypto.createHash("sha256").update(bytes).digest("hex");
      if (sha256 !== wanted.sha256) { tried.push({ custody: candidate.custody, why: `the mounted bytes hash to ${sha256}` }); continue; }
      bound = {
        ...wanted, bytes, sha256, byteLength: bytes.length,
        custody: candidate.custody, pathInCustody: candidate.path,
        revision: candidate.revision ?? null,
        pageCountFromIndex: candidate.pageCount ?? null,
        acroFieldCountFromIndex: candidate.acroFieldCount ?? null,
        structuralClassObserved: candidate.structuralClassObserved ?? null,
        custodiesCarryingThisDigest: candidates.map((c) => c.custody),
        resolvedBy: "content_hash_against_the_committed_corpus_index_then_rehashed_from_the_mounted_bytes"
      };
      break;
    }
    if (!bound) failures.push({ sourceId: wanted.sourceId, sha256: wanted.sha256, custodiesTried: tried, why: "the digest is indexed but no mounted custody holds those exact bytes" });
    else resolved.push(bound);
  }
  return { resolved, failures };
}

/* ---- the packet-set manifest, which the completeness verifier cannot see ---- */

/**
 * Reconcile what this family DELIVERS against what the packet-set manifest
 * REQUIRES.
 *
 * `verify-packet-completeness.mjs` derives its component denominator from the
 * family's own field map and source receipt, and never opens
 * data/record-clearing/legal-design-packet-set-manifests.json. So a family can
 * report zero requiredComponentsMissing while the manifest says it ships two of
 * four: the counter is measuring the build against itself. A Colorado packet
 * did exactly that.
 *
 * These three New Mexico families each carry components the manifest marks
 * REQUIRED that are not PDFs at all -- process_guidance: how to obtain the
 * judicial district's own order form, where to file, what to bring, how the
 * record-gathering and the two filing stages sequence. Nothing in the field map
 * can carry them, because they are not documents with blanks. They are
 * delivered as named sections of participant-instructions.md, and this
 * reconciliation names the section that delivers each one and refuses to build
 * a family that leaves any manifest component unaccounted for.
 *
 * The denominator is READ from the manifest rather than restated here, so a
 * component added to the manifest tomorrow stops this build rather than going
 * quietly undelivered.
 */
export function reconcilePacketSetManifest(familyId, delivery, instructionsText) {
  const manifests = JSON.parse(fs.readFileSync(path.join(ROOT, PACKET_SET_MANIFESTS), "utf8"));
  const set = (manifests.packetSets ?? []).find((s) => s.packetSetId === familyId);
  if (!set) {
    return {
      familyId, manifestFound: false,
      why: `no packet set in ${PACKET_SET_MANIFESTS} carries the id ${familyId}; the denominator this family is measured against does not exist`,
      components: [], everyRequiredComponentAccountedFor: false
    };
  }
  const rows = [];
  for (const component of set.components ?? []) {
    const id = component.componentId;
    const claim = delivery[id] ?? null;
    const namedInInstructions = claim?.section
      ? instructionsText.toLowerCase().includes(String(claim.section).toLowerCase())
      : null;
    rows.push({
      componentId: id, role: component.role ?? null,
      requirement: component.requirement ?? null,
      officialFormId: component.officialFormId ?? null,
      outputStrategy: component.outputStrategy ?? null,
      deliveredAs: claim?.deliveredAs ?? null,
      deliveredBy: claim?.deliveredBy ?? null,
      sectionOfParticipantInstructions: claim?.section ?? null,
      sectionIsPresentInTheInstructions: namedInInstructions,
      accountedFor: claim !== null && (claim.section ? namedInInstructions === true : true),
      note: claim?.note ?? null
    });
  }
  const unclaimed = Object.keys(delivery).filter((id) => !(set.components ?? []).some((c) => c.componentId === id));
  return {
    familyId, manifestFound: true,
    manifest: PACKET_SET_MANIFESTS,
    trackId: set.trackId ?? null,
    whyThisExists:
      "verify-packet-completeness.mjs derives its component denominator from this family's own field map and source "
      + "receipt and never opens the packet-set manifest, so its requiredComponentsMissing counter measures the build "
      + "against itself. This reconciliation measures it against the manifest instead.",
    componentsInTheManifest: (set.components ?? []).length,
    components: rows,
    claimsForComponentsNotInTheManifest: unclaimed,
    everyRequiredComponentAccountedFor: rows.every((r) => r.requirement !== "required" || r.accountedFor)
      && rows.every((r) => r.accountedFor) && unclaimed.length === 0
  };
}

/* ---- the flat census ------------------------------------------------------ */

const r2 = (n) => Number(n.toFixed(2));
const writeBoxOf = (blank) => ({
  x: r2(blank.x + WRITE_BOX_INSET),
  y: r2(blank.y + WRITE_BOX_INSET),
  width: r2(blank.width - WRITE_BOX_INSET * 2),
  height: WRITE_BOX_HEIGHT
});

/**
 * Measure a flat document and bind every measured blank to its dictionary row.
 *
 * The dictionary is keyed by the MEASURED position of the blank, so this is a
 * two-way check on every run: a blank with no dictionary entry is an
 * unclassified blank the build refuses to ship, and a dictionary entry with no
 * blank is geometry that has moved. Both stop the build.
 */
export async function censusFlat(source) {
  const doc = await PDFDocument.load(source.bytes, { ignoreEncryption: true });
  const measured = measureDocumentBlanks(doc);
  const acroFieldCount = doc.getForm().getFields().length;
  const strokedBoxes = doc.getPages().map((p) => {
    let content = "";
    for (const stream of p.node.normalizedEntries?.().Contents?.asArray?.() ?? []) {
      try { content += Buffer.from(doc.context.lookup(stream).getContents()).toString("latin1"); } catch { /* not a stream */ }
    }
    return content ? checkboxCandidates(content) : [];
  });

  const pageText = measured.map((m) => ({ page: m.page, lines: m.lines }));
  const unmeasurablePages = measured.filter((m) => m.glyphMetricsExact !== true).map((m) => m.page);
  const dictionary = source.dictionary;
  const rows = [];
  const notBlanks = [];
  const unmapped = [];
  for (const page of measured) {
    for (const blank of page.blanks) {
      const entry = dictionary[blank.key];
      if (!entry) { unmapped.push({ key: blank.key, page: blank.page, kind: blank.kind, printedLine: blank.printedLine }); continue; }
      const row = {
        key: blank.key, name: blank.key, page: blank.page,
        measuredBlank: {
          kind: blank.kind, y: blank.y,
          ...(blank.xIsMeasurable === false
            ? {
              absoluteXIsUnmeasurable: true, ordinalOnBaseline: blank.ordinalOnBaseline,
              reportedX: blank.x, reportedEndX: blank.endX,
              why: "a glyph to the left of this blank on its own baseline is positioned by a fallback advance, so the "
                + "reported x carries that drift. The baseline and the order along it are exact; the coordinate is not, "
                + "and no write box is derived from it"
            }
            : { x: blank.x, endX: blank.endX, width: blank.width }),
          ...(blank.glyphs ? { glyphs: blank.glyphs } : {}),
          ...(blank.thickness ? { thickness: blank.thickness } : {})
        },
        rectBasis: blank.kind === "stroke"
          ? "measured_printed_rule_read_from_the_page_content_stream"
          : blank.kind === "underscore_run"
            ? "measured_underscore_glyph_run_read_from_the_page_content_stream"
            : "measured_printed_bracket_pair_read_from_the_page_content_stream",
        printedLine: blank.printedLine,
        printedTextImmediatelyBefore: blank.printedTextImmediatelyBefore,
        printedTextAtCoordinate: [
          { y: blank.y, extracted: blank.printedLine },
          ...(blank.printedLineBelow ? [{ y: null, extracted: blank.printedLineBelow }] : [])
        ],
        /*
         * A control is a control however the form draws it. New Mexico draws
         * most of its tick boxes as a printed "[ ]" pair and the retained local
         * orders draw theirs as a symbol-font glyph, and only the first kind was
         * being reported as a selection control here. The consequence was not
         * cosmetic: the completeness contract reads a control's caption through
         * a different classifier, so four of the order's decretal boxes --
         * "Arresting agency" and the three "Other" agency boxes -- were read as
         * ordinary agency FIELDS, and the court-owned refusal class, which
         * refuses to excuse an agency field by design, turned four boxes only a
         * judge may tick into four missing required facts.
         */
        type: blank.kind === "underscore_run" || blank.kind === "stroke" ? "flat_overlay_text" : "printed_selection_control",
        isSelectionControl: blank.kind === "bracket_box" || blank.kind === "glyph_selection_control",
        multiline: false, maxLength: null,
        section: entry.section, effectiveLabel: entry.label,
        policy: entry.policy, fact: entry.fact ?? null,
        refusalClass: entry.refusalClass ?? null, what: entry.what ?? null, why: entry.why ?? null,
        buildNote: entry.buildNote ?? null,
        condition: entry.condition ?? null
      };
      // A symbol-font control has an authored origin and no measurable width,
      // and a blank behind a drifting glyph has no trustworthy origin at all.
      // Either way it gets no box, rather than a box derived from a number this
      // build cannot stand behind.
      if (blank.widthIsUnmeasurable === true || blank.xIsMeasurable === false) {
        row.rect = null; row.writeBox = null; row.noGeometry = true;
      } else { row.rect = writeBoxOf(blank); row.writeBox = row.rect; }
      if (entry.policy === "not_a_blank") { notBlanks.push(row); continue; }
      rows.push(row);
    }
  }
  const stale = Object.keys(dictionary).filter((k) => !measured.some((p) => p.blanks.some((b) => b.key === k)));
  const writesWithUnmeasurableX = rows.filter((r) => r.policy === "write" && r.noGeometry === true)
    .map((r) => ({ key: r.key, page: r.page, label: r.effectiveLabel, printedLine: r.printedLine }));
  const blanksWithUnmeasurableX = measured.flatMap((m) => m.blanksWithUnmeasurableX);
  return {
    rows, notBlanks, unmapped, stale, pageText, unmeasurablePages,
    writesWithUnmeasurableX, blanksWithUnmeasurableX,
    pageCount: measured.length,
    acroFieldCount,
    strokedCheckboxCount: strokedBoxes.reduce((n, boxes) => n + boxes.length, 0),
    measuredBlankCount: measured.reduce((n, p) => n + p.blanks.length, 0),
    underlinesOfPrintedText: measured.flatMap((p) => p.underlinesOfPrintedText)
  };
}

/* ---- the AcroForm census -------------------------------------------------- */

export async function censusAcroForm(source) {
  const doc = await PDFDocument.load(source.bytes, { ignoreEncryption: true });
  const pages = doc.getPages();
  const measured = measureDocumentBlanks(doc);
  const pageText = pages.map((p, i) => ({
    page: i + 1,
    lines: groupIntoLines(extractTextItems(p)).map((l) => ({ y: r2(l.y), text: l.text }))
  }));
  const dictionary = source.dictionary;
  const rows = [];
  const unmapped = [];
  const hiddenOrNoView = [];
  const sourceAuthoredValues = [];
  for (const field of doc.getForm().getFields()) {
    const name = field.getName();
    const entry = dictionary[name];
    const widgets = field.acroField.getWidgets().map((w) => {
      const rect = w.getRectangle();
      const ref = w.P();
      let pi = pages.findIndex((p) => p.ref === ref);
      if (pi < 0) pi = 0;
      let flags = null;
      try { flags = w.getFlags(); } catch { flags = null; }
      // ISO 32000-1 12.5.3: bit 2 Hidden, bit 6 NoView. A value written onto a
      // widget nobody can see is a value that is not on the paper. A widget
      // whose flags cannot be read is treated as unreadable rather than as
      // visible, because "we could not tell" is not "it is fine".
      if (flags === null || ((flags >> 1) & 1) === 1 || ((flags >> 5) & 1) === 1) {
        hiddenOrNoView.push({ field: name, flags, why: flags === null ? "the widget's annotation flags could not be read" : "the widget is Hidden or NoView" });
      }
      return {
        page: pi + 1,
        rect: { x: r2(rect.x), y: r2(rect.y), width: r2(rect.width), height: r2(rect.height) },
        rectBasis: "acroform_widget_rect_read_first_hand_from_pinned_binary",
        annotationFlags: flags
      };
    });
    if (!entry) { unmapped.push({ field: name, widgets }); continue; }
    let sourceValue = null;
    try {
      if (typeof field.isChecked === "function") sourceValue = field.isChecked() ? "on" : null;
      else if (typeof field.getText === "function") sourceValue = field.getText() ?? null;
    } catch { sourceValue = null; }
    if (sourceValue !== null && String(sourceValue).trim() !== "") sourceAuthoredValues.push({ field: name, sourceValue });
    const isCheck = field.constructor.name === "PDFCheckBox" || field.constructor.name === "PDFRadioGroup";
    rows.push({
      key: name, name, page: widgets[0]?.page ?? null, widgets, sourceValue,
      rect: widgets[0]?.rect ?? null, rectBasis: widgets[0]?.rectBasis ?? null,
      // The vocabulary the shared semantics reads, not pdf-lib's class names.
      // WRITABLE_PDF_TYPES is {"text","dropdown"}, so a field reported as
      // "textfield" is refused as a non-text field type and every write on the
      // document silently becomes a hole.
      type: field.constructor.name.replace(/^PDF/, "").toLowerCase()
        .replace("textfield", "text").replace("checkbox", "checkbox")
        .replace("radiogroup", "radiogroup").replace("optionlist", "optionlist"),
      isSelectionControl: isCheck,
      multiline: typeof field.isMultiline === "function" ? field.isMultiline() : false,
      maxLength: typeof field.getMaxLength === "function" ? (field.getMaxLength() ?? null) : null,
      section: entry.section, effectiveLabel: entry.label, bindingLabel: entry.bindingLabel ?? entry.label,
      policy: entry.policy, fact: entry.fact ?? null,
      refusalClass: entry.refusalClass ?? null, what: entry.what ?? null, why: entry.why ?? null,
      buildNote: entry.buildNote ?? null,
      condition: entry.condition ?? null,
      printedTextAtCoordinate: (pageText.find((p) => p.page === (widgets[0]?.page ?? 1))?.lines ?? [])
        .filter((l) => widgets[0] && Math.abs(l.y - widgets[0].rect.y) <= 16)
        .sort((a, b) => Math.abs(a.y - widgets[0].rect.y) - Math.abs(b.y - widgets[0].rect.y))
        .slice(0, 2).map((l) => ({ y: l.y, extracted: l.text }))
    });
  }
  /*
   * The blanks the form PRINTS, beside the fields it declares.
   *
   * An AcroForm document is not only its widgets. Form 4-222 prints 160 blanks
   * and declares 158 fields, and the two sets do not coincide: pages 6 and 7 are
   * Form 4-223, the order a judge signs on the application, and its findings and
   * decretal blanks carry no widget at all. Twenty-seven printed blanks live
   * there. Censusing only the widgets would leave every one of them off the map
   * -- blanks on paper the participant receives, that nothing in the packet
   * classifies.
   *
   * They are keyed by page, baseline and position along the line rather than by
   * absolute x, because on this binary the absolute x cannot be measured: the
   * font supplies no widths, the text walker falls back to the font size as the
   * advance, and by the end of a line the reported coordinate is nearly twice
   * the truth. The ORDER of blanks along a baseline survives that drift even
   * though the position does not, so an ordinal is an identity where a
   * coordinate is not -- and no write box is ever derived from one of these.
   */
  const widgetBaselines = rows.flatMap((r) => r.widgets.map((w) => ({ page: w.page, y: w.rect.y, h: w.rect.height })));
  const printedDictionary = source.printedBlankDictionary ?? {};
  const printedBlanks = [];
  const printedUnmapped = [];
  for (const page of measured) {
    for (const blank of page.blanks) {
      const covered = widgetBaselines.some((w) => w.page === page.page && blank.y >= w.y - 6 && blank.y <= w.y + w.h + 3);
      if (covered) continue;
      const entry = printedDictionary[blank.baselineKey];
      if (!entry) { printedUnmapped.push({ key: blank.baselineKey, page: blank.page, kind: blank.kind, printedLine: blank.printedLine }); continue; }
      printedBlanks.push({
        key: blank.baselineKey, name: blank.baselineKey, page: blank.page,
        measuredBlank: { kind: blank.kind, y: blank.y, ordinalOnBaseline: blank.ordinalOnBaseline, absoluteXIsUnmeasurable: page.glyphMetricsExact !== true },
        rect: null, rectBasis: "no widget and no measurable x: identified by page, baseline and position along the printed line",
        noGeometry: true,
        printedLine: blank.printedLine,
        printedTextAtCoordinate: [{ y: blank.y, extracted: blank.printedLine }],
        type: blank.kind === "underscore_run" ? "printed_blank_with_no_widget" : "printed_selection_control_with_no_widget",
        isSelectionControl: blank.kind !== "underscore_run",
        multiline: false, maxLength: null, widgets: [],
        section: entry.section, effectiveLabel: entry.label,
        policy: entry.policy, fact: entry.fact ?? null,
        refusalClass: entry.refusalClass ?? null, what: entry.what ?? null, why: entry.why ?? null,
        buildNote: entry.buildNote ?? null,
        condition: entry.condition ?? null
      });
    }
  }
  const printedStale = Object.keys(printedDictionary)
    .filter((k) => !measured.some((p) => p.blanks.some((b) => b.baselineKey === k)));

  const stale = Object.keys(dictionary).filter((k) => !rows.some((r) => r.key === k));
  return {
    rows: [...rows, ...printedBlanks], widgetRows: rows, printedBlanks,
    unmapped, stale, printedUnmapped, printedStale,
    hiddenOrNoView, sourceAuthoredValues, pageText, pageCount: pages.length,
    printedBlankCount: measured.reduce((n, p) => n + p.blanks.length, 0),
    glyphMetricsExactByPage: measured.map((p) => ({ page: p.page, glyphMetricsExact: p.glyphMetricsExact }))
  };
}

/* ---- render ---------------------------------------------------------------- */

/** Only a PROTECT or DECRETAL rule is handed to the finalizer as protected. */
function protectedRulesOf(census) {
  /*
   * A protected rule whose x cannot be measured is protected across the whole
   * width of its baseline, not across a span this build cannot stand behind.
   * The baseline is exact; failing closed on the line is the safe direction,
   * because the alternative is a protection band in the wrong place.
   */
  return census.rows
    .filter((r) => (r.policy === "protect" || r.policy === "decretal") && r.measuredBlank)
    .map((r) => (r.measuredBlank.absoluteXIsUnmeasurable === true
      ? { page: r.page, y: r.measuredBlank.y, x: 0, endX: 10_000, category: r.refusalClass ?? "court_owned_decretal_text", caption: r.effectiveLabel, spanIsTheWholeBaseline: true }
      : { page: r.page, y: r.measuredBlank.y, x: r.measuredBlank.x, endX: r.measuredBlank.endX, category: r.refusalClass ?? "court_owned_decretal_text", caption: r.effectiveLabel }));
}

export async function renderFlat(source, census, facts) {
  const writable = census.rows.filter((r) => r.policy === "write");
  const protectedRules = protectedRulesOf(census);
  const anchors = writable.map((r) => ({
    page: r.page, label: r.effectiveLabel, writeBox: r.writeBox,
    factId: r.fact, fontSize: 10, protectedRules
  }));
  return finalizeFlatOverlay({
    sourceBytes: source.bytes,
    expectedSha256: source.sha256,
    anchors, protectedRules,
    explicitMappings: Object.fromEntries(writable.map((r) => [r.effectiveLabel, r.fact])),
    facts,
    documentTextLines: census.pageText.flatMap((p) => p.lines.map((l) => l.text)),
    title: source.title
  });
}

export async function renderAcroForm(source, census, facts) {
  const writable = census.rows.filter((r) => r.policy === "write");
  const writableNames = new Set(writable.map((r) => r.name));
  return finalizeOfficialForm({
    sourceBytes: source.bytes,
    expectedSha256: source.sha256,
    census: census.widgetRows.map((r) => ({
      name: r.name, type: r.type, effectiveLabel: r.bindingLabel, regionHeading: r.section,
      widgets: r.widgets.map((w) => ({ page: w.page, rect: w.rect })),
      multiline: r.multiline === true, maxLength: r.maxLength ?? null
    })),
    facts,
    explicitMappings: Object.fromEntries(writable.map((r) => [r.name, r.fact])),
    unwritableFields: census.widgetRows.filter((r) => !writableNames.has(r.name)).map((r) => ({ field: r.name })),
    documentTextLines: census.pageText.flatMap((p) => p.lines.map((l) => l.text)),
    title: source.title
  });
}

/* ---- byte proof ------------------------------------------------------------ */

/**
 * Read the ink back out of the finalized bytes.
 *
 * A flat overlay draws into the page's own content stream and flattens no
 * widget, so the widget-appearance reader sees nothing on it and would report
 * every write as invisible. The flat documents are therefore read back the way
 * they were written -- the output's page text at the coordinates of the blank
 * each value was drawn on -- with the SOURCE's own text at the same coordinates
 * subtracted, because a printed caption sitting level with a rule is the form's
 * ink and not this build's.
 *
 * `nonWhitespaceGlyphsOutsideMeasuredWriteBoxes` is MEASURED here rather than
 * asserted: every text item in the output that the source does not carry is
 * matched against the write boxes, and anything landing outside one is counted.
 */
export async function byteProof(source, census, artifactBytes, report, fixtureName, facts, isFlat) {
  const tmp = path.join(ROOT, `.nm-byte-proof-${source.documentId}-${fixtureName}.pdf`.replace(/[^\w.@+-]/g, "_"));
  fs.writeFileSync(tmp, artifactBytes);
  let widgets = [];
  try { widgets = isFlat ? [] : await flattenedWidgets(tmp); } finally { fs.unlinkSync(tmp); }

  const out = await PDFDocument.load(artifactBytes, { ignoreEncryption: true });
  const src = await PDFDocument.load(source.bytes, { ignoreEncryption: true });
  const textOf = (doc) => {
    const byPage = new Map();
    doc.getPages().forEach((p, i) => {
      byPage.set(i + 1, extractTextItems(p).map((t) => ({
        x: Number(t.x), y: Number(t.y), width: Number(t.width ?? 0), text: String(t.text ?? "")
      })));
    });
    return byPage;
  };
  const outText = textOf(out);
  const srcText = textOf(src);

  /*
   * Whether a glyph sits inside a box, and why a flat box is measured tighter.
   *
   * A widget rectangle has a real height and its flattened appearance can sit
   * anywhere inside it, so the AcroForm test allows the whole rectangle plus a
   * small margin. A flat write box has a NOMINAL height and the overlay draws
   * every value at exactly `box.y`, so the same generous band spans more than
   * one line of the form: these New Mexico petitions set 13.8pt line pitch, a
   * 12pt box with a 3pt margin either side covers 18pt, and the value written
   * on one line was read back as ink inside the refused blank on the line
   * below. Two correctly-refused blanks on Form 4-951 -- the pending-case line
   * and the date the criminal case was filed -- were reported as protected
   * writes on both fixtures for that reason alone. On a flat box the baseline
   * is known exactly, so it is compared exactly.
   */
  const FLAT_BASELINE_TOLERANCE = 1.5;
  const inBox = (t, box, flat = isFlat) => t.x >= box.x - 2 && t.x <= box.x + box.width + 2
    && (flat
      ? Math.abs(t.y - box.y) <= FLAT_BASELINE_TOLERANCE
      : (t.y >= box.y - 3 && t.y <= box.y + box.height + 3));
  const stamp = (t) => `${Math.round(t.x * 10)}:${Math.round(t.y * 10)}:${t.text}`;

  /** Text this build added to a page: present in the output, absent in the source. */
  const addedOn = (page) => {
    const already = new Map();
    for (const t of srcText.get(page) ?? []) already.set(stamp(t), (already.get(stamp(t)) ?? 0) + 1);
    const added = [];
    for (const t of outText.get(page) ?? []) {
      const k = stamp(t);
      if ((already.get(k) ?? 0) > 0) { already.set(k, already.get(k) - 1); continue; }
      if (String(t.text).trim().length === 0) continue;
      added.push(t);
    }
    return added;
  };
  const addedByPage = new Map();
  for (const page of outText.keys()) addedByPage.set(page, addedOn(page));

  const drawnInBox = (page, box) => (addedByPage.get(page) ?? [])
    .filter((t) => inBox(t, box)).sort((a, b) => a.x - b.x).map((t) => t.text);

  const written = isFlat
    ? new Set(report.written.map((w) => w.anchor))
    : new Set(report.written.map((w) => w.field));
  const actualWrites = [];
  const refusedFieldsWithInk = [];
  const documentAuthoredAppearances = [];
  let glyphs = 0;

  for (const r of census.rows) {
    if (r.noGeometry === true) continue;
    const places = isFlat ? [{ page: r.page, rect: r.rect }] : r.widgets;
    for (const wdg of places) {
      const text = isFlat
        ? drawnInBox(wdg.page, wdg.rect)
        : drawnAt(widgets, { page: wdg.page, rect: wdg.rect }).map((d) => d.text).filter(Boolean);
      const ink = text.join("").trim();
      const isWritten = isFlat ? written.has(r.effectiveLabel) : written.has(r.name);
      if (isWritten && r.policy === "write") {
        glyphs += ink.length;
        actualWrites.push({
          field: r.key, factId: r.fact, page: wdg.page, rect: wdg.rect,
          section: r.section, effectiveLabel: r.effectiveLabel,
          ...(r.measuredBlank ? { measuredBlank: r.measuredBlank } : {}),
          drawnText: text, expected: facts[r.fact] ?? null,
          matchesExpected: ink === String(facts[r.fact] ?? "").trim()
        });
        continue;
      }
      if (ink.length === 0) continue;
      if (r.sourceValue !== null && r.sourceValue !== undefined) {
        documentAuthoredAppearances.push({
          field: r.key, page: wdg.page, rect: wdg.rect, drawnText: text, sourceValue: r.sourceValue,
          note: "the pinned source already carries this value; flattening materialises the form's own default"
        });
        continue;
      }
      refusedFieldsWithInk.push({ fieldId: r.key, page: wdg.page, drawnText: text });
    }
  }

  // Every glyph this build added, matched against the boxes it was allowed to
  // add it in. On the AcroForm path the ink lives in flattened widget
  // appearances rather than in the page text, so the measurement is made
  // against the widget rectangles instead.
  const boxes = census.rows.filter((r) => r.noGeometry !== true)
    .flatMap((r) => (isFlat ? [{ page: r.page, rect: r.rect }] : r.widgets));
  let outsideBoxes = 0;
  const strayGlyphs = [];
  for (const [page, added] of addedByPage) {
    for (const t of added) {
      if (boxes.some((b) => b.page === page && inBox(t, b.rect))) continue;
      outsideBoxes += String(t.text).replace(/\s+/g, "").length;
      if (strayGlyphs.length < 12) strayGlyphs.push({ page, x: r2(t.x), y: r2(t.y), text: t.text });
    }
  }

  return {
    actualWrites, refusedFieldsWithInk, documentAuthoredAppearances,
    glyphs, appearances: widgets.length, outsideBoxes, strayGlyphs
  };
}

/* ---- the field map --------------------------------------------------------- */

export function mapFor(source, census, report, isFlat) {
  const writtenNames = isFlat
    ? new Set(report.written.map((w) => w.anchor))
    : new Set(report.written.map((w) => w.field));
  const canonicalWrites = [];
  const canonicalRefusals = [];
  const selectionControls = [];

  for (const r of census.rows) {
    const base = {
      field: `${source.documentId}/${r.key}`,
      fieldName: `${source.documentId}/${r.key}`.replace(/\[\d+\]/g, ""),
      acroFieldName: isFlat ? null : r.name,
      page: r.page, rect: r.rect, rectBasis: r.rectBasis,
      ...(r.measuredBlank ? { measuredBlank: r.measuredBlank } : {}),
      ...(r.widgets ? { widgets: r.widgets } : {}),
      printedLabel: r.effectiveLabel, printedLine: r.printedLine ?? r.effectiveLabel,
      sectionHeading: r.section, regionHeading: r.effectiveLabel, effectiveLabel: r.effectiveLabel,
      captionBasis: isFlat
        ? "the printed section, the printed line the blank sits on, and the words printed immediately before it"
        : "the authored AcroForm field name, the printed line at the widget's own rectangle, and the printed section",
      printedTextAtCoordinate: r.printedTextAtCoordinate,
      document: source.documentId
    };

    if (r.policy === "write") {
      const hit = isFlat ? writtenNames.has(r.effectiveLabel) : writtenNames.has(r.name);
      if (hit) { canonicalWrites.push({ ...base, factId: r.fact, kind: r.type }); continue; }
      canonicalRefusals.push({
        ...base, reason: "the finalizer refused this write; the packet does not claim a value it did not draw",
        category: null, completenessClass: null, class: null,
        requiredBeforeFiling: false, why: "reported rather than claimed, so the defect is visible to the audit"
      });
      continue;
    }

    /*
     * A blank the route does not reach is disposed on that ground whether it is
     * a control or a line. The order of these two branches is load-bearing: a
     * control routed into `selectionControls` first would be recorded as a
     * genuine participant election, and the one control in this packet that is
     * NOT the participant's -- the box in front of the paragraph that would
     * name an alleged identity thief -- would have been offered to them to mark.
     */
    if (r.policy === "inapplicable") {
      canonicalRefusals.push({
        ...base, reason: r.why,
        category: null, completenessClass: null, class: null,
        isSelectionControl: r.isSelectionControl === true,
        completenessDisposition: "NOT_APPLICABLE_ON_THIS_ROUTE",
        routeConditionThatMakesItInapplicable: r.condition,
        requiredBeforeFiling: false, routeDetermined: false, factId: null, why: r.why
      });
      continue;
    }

    if (r.isSelectionControl) {
      const cls = (r.policy === "protect" || r.policy === "decretal") ? (r.refusalClass ?? COURT_OWNED) : PARTICIPANT_ELECTION;
      selectionControls.push({
        ...base, selectionId: base.field, kind: "selection_control", type: r.type,
        widgets: r.widgets ?? (r.rect ? [{ page: r.page, rect: r.rect }] : []),
        disposition: "explicit_refusal", markedByHand: true,
        reason: r.why, category: cls, completenessClass: cls, class: cls,
        requiredBeforeFiling: false, routeDetermined: false
      });
      continue;
    }

    if (r.policy === "protect") {
      canonicalRefusals.push({
        ...base, reason: r.why, category: r.refusalClass,
        completenessClass: r.refusalClass, class: r.refusalClass,
        requiredBeforeFiling: false, why: r.why
      });
      continue;
    }

    if (r.policy === "decretal") {
      canonicalRefusals.push({
        ...base,
        reason: `court, clerk, prosecutor, agency, or hearing field: ${r.why}`,
        category: null, completenessClass: null, class: null,
        courtOwnedDecretalText: true, requiredBeforeFiling: false, why: r.why
      });
      continue;
    }

    if (r.policy === "attorney") {
      canonicalRefusals.push({
        ...base, reason: r.why, category: null, completenessClass: null, class: null,
        requiredBeforeFiling: false, why: r.why
      });
      continue;
    }

    if (r.policy === "election") {
      canonicalRefusals.push({
        ...base, reason: r.why, category: PARTICIPANT_ELECTION,
        completenessClass: PARTICIPANT_ELECTION, class: PARTICIPANT_ELECTION,
        requiredBeforeFiling: false, routeDetermined: false, why: r.why
      });
      continue;
    }

    if (r.policy === "optional") {
      canonicalRefusals.push({
        ...base,
        reason: `optional participant-authored content, and the platform does not invent it: ${r.why}`,
        category: null, completenessClass: null, class: null,
        requiredBeforeFiling: false, why: r.why
      });
      continue;
    }

    canonicalRefusals.push({
      ...base,
      reason: `the participant supplies this before filing: ${r.what}`,
      category: null, completenessClass: null, class: null,
      disposition: "REQUIRED_BEFORE_FILING", completenessDisposition: "REQUIRED_BEFORE_FILING",
      requiredBeforeFiling: true, identity: `${source.documentId} blank ${r.key}`,
      factId: null, routeDetermined: false,
      why: `the platform holds no value for this and the participant supplies it before filing: ${r.what}`,
      participantMustSupply: r.what,
      ...(r.buildNote ? { whyTheBuildDoesNotHoldIt: r.buildNote } : {})
    });
  }

  return {
    formNumber: source.documentId, documentId: source.documentId, documentRole: source.instrumentKind,
    documentPolicy: { mode: "participant", captionOnly: false, documentAcceptsFill: true, routeKey: source.routeKey },
    structuralClass: isFlat ? "flat_pdf_measured_overlay" : "acroform",
    explicitMappings: Object.fromEntries(canonicalWrites.map((w) => [w.field, w.factId])),
    roleRefusals: [], selectionControls, canonicalWrites, canonicalRefusals,
    boundaryWrites: canonicalWrites, boundaryRefusals: canonicalRefusals,
    ...(isFlat ? { printedRulesThatAreNotBlanks: census.notBlanks.map((n) => ({ key: n.key, page: n.page, measuredBlank: n.measuredBlank, why: n.why })) } : {})
  };
}

/* ---- the builder's own count of the nine counters --------------------------- */

export function countCompleteness(maps, writeProofs, artifacts, instructionsText) {
  const counters = Object.fromEntries(PASS_COUNTERS.map((c) => [c, 0]));
  const findings = [];
  const note = (counter, detail) => { counters[counter] += 1; findings.push({ counter, ...detail }); };

  const row = (r, selection = false) => ({
    id: r.field, name: r.fieldName ?? r.field, label: r.effectiveLabel ?? "", reason: r.reason ?? "",
    refusalClass: r.category ?? null, page: r.page ?? null, document: r.document ?? null,
    factId: r.factId ?? null, isSelectionControl: selection,
    declared: {
      disposition: r.completenessDisposition ?? null,
      ...(Object.hasOwn(r, "requiredBeforeFiling") ? { requiredBeforeFiling: r.requiredBeforeFiling === true } : {}),
      ...(Object.hasOwn(r, "routeDetermined") ? { routeDetermined: r.routeDetermined === true } : {}),
      ...(r.routeConditionThatMakesItInapplicable ? { routeConditionThatMakesItInapplicable: r.routeConditionThatMakesItInapplicable } : {}),
      identity: r.identity ?? null, factId: r.factId ?? null
    }
  });

  const writes = maps.flatMap((m) => m.canonicalWrites.map((w) => row(w)));
  const blanks = maps.flatMap((m) => [
    ...m.canonicalRefusals.map((r) => row(r)),
    ...m.selectionControls.map((c) => row(c, true))
  ]);

  const availableFacts = new Set(writes.map((w) => w.factId).filter(Boolean));
  for (const p of writeProofs) {
    for (const w of p.actualWrites) if (w.factId && String(w.drawnText.join("")).trim()) availableFacts.add(String(w.factId));
  }
  const normLabel = (x) => String(x ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const writtenInDocument = new Map();
  for (const w of writes) {
    if (!writtenInDocument.has(w.document)) writtenInDocument.set(w.document, new Set());
    for (const k of [normLabel(w.label), normLabel(w.name)]) if (k.length >= 4) writtenInDocument.get(w.document).add(k);
  }

  const ledger = [];
  for (const blank of blanks) {
    const here = writtenInDocument.get(blank.document) ?? new Set();
    const declared = {
      ...blank.declared,
      factAvailable: (blank.declared.factId ? availableFacts.has(String(blank.declared.factId)) : false)
        || here.has(normLabel(blank.label)) || here.has(normLabel(blank.name))
    };
    const verdict = classifyBlank(blank, blank.reason, blank.refusalClass, declared);
    ledger.push({ field: blank.id, label: blank.label, document: blank.document, ...verdict });
    if (BLANK_DISPOSITIONS[verdict.disposition].allowed) continue;
    const counter = verdict.disposition === "KNOWN_FACT_NOT_WRITTEN" ? "knownRequiredFieldsMissing"
      : verdict.disposition === "ROUTE_OPTION_NOT_SELECTED" ? "requiredOptionsMissing" : "unclassifiedBlanks";
    note(counter, { field: blank.id, label: blank.label, disposition: verdict.disposition, basis: verdict.basis, reasonGiven: blank.reason || null });
  }

  const instructions = String(instructionsText ?? "");
  for (const b of ledger.filter((x) => x.disposition === "REQUIRED_BEFORE_FILING")) {
    const needles = [b.label, b.field].map((x) => String(x ?? "").trim()).filter((x) => x.length >= 3);
    if (needles.some((n) => instructions.toLowerCase().includes(n.toLowerCase().slice(0, 60)))) continue;
    note("requiredFactsNotCollected", { field: b.field, label: b.label, why: "declared required-before-filing and not named in participant-instructions.md" });
  }

  const rows = new Map();
  for (const f of [...writes.map((w) => ({ ...w, written: true })), ...blanks.map((b) => ({ ...b, written: false }))]) {
    const key = rowKeyOf(f);
    if (!key) continue;
    if (!rows.has(key)) rows.set(key, []);
    rows.get(key).push(f);
  }
  for (const [key, cells] of rows) {
    if (!cells.some((c) => c.written)) continue;
    const missing = cells.filter((c) => !c.written && classifyField(c.label, c.isSelectionControl === true).requirement === "REQUIRED_KNOWN");
    if (missing.length > 0) note("incompleteRows", { row: key, missingCells: missing.map((m) => m.label).slice(0, 6) });
  }

  for (const p of writeProofs) {
    const visible = (p.addedGlyphsReadFromOutputBytes ?? 0) + (p.flattenedWidgetAppearancesReadFromOutputBytes ?? 0);
    if ((p.valuesReportedByFinalizer ?? 0) > 0 && visible === 0) {
      note("invisibleWrites", { fixture: p.fixture, document: p.documentId, why: "the finalizer reported values and the output bytes carry no glyph and no flattened appearance" });
    }
    if ((p.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes ?? 0) > 0) {
      note("visualDefects", { fixture: p.fixture, document: p.documentId, glyphs: p.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes, why: "ink landed outside every measured write box" });
    }
    for (const refused of p.refusedFieldsWithInk ?? []) {
      note("protectedWrites", { fixture: p.fixture, field: refused.fieldId, why: "a field the map refused carries ink in the output" });
    }
  }
  for (const w of writes) {
    if (classifyField(w.label, false).requirement === "PROTECTED") {
      note("protectedWrites", { field: w.id, label: w.label, why: "a protected field was written" });
    }
  }

  const rendered = artifacts.map((a) => `${a.file} ${(a.documents ?? []).join(" ")}`).join(" ").toLowerCase();
  const loose = (x) => String(x).toLowerCase().replace(/[^a-z0-9]/g, "");
  for (const m of maps) {
    if (!rendered.includes(String(m.documentId).toLowerCase()) && !loose(rendered).includes(loose(m.documentId))) {
      note("requiredComponentsMissing", { component: m.documentId, why: "the field map names this document and it appears in no rendered artifact" });
    }
  }

  return { counters, findings, ledger };
}

/* ---- artifacts -------------------------------------------------------------- */

export function writeJson(rel, value) {
  fs.mkdirSync(path.dirname(path.join(ROOT, rel)), { recursive: true });
  fs.writeFileSync(path.join(ROOT, rel), `${JSON.stringify(value, null, 2)}\n`);
}

export function requiredBeforeFilingItems(maps) {
  return maps.flatMap((m) => m.canonicalRefusals
    .filter((r) => r.requiredBeforeFiling === true)
    .map((r) => ({
      document: m.documentId, field: r.field, page: r.page,
      section: r.sectionHeading, disclosureLabel: r.effectiveLabel,
      identity: r.identity, why: r.why, participantMustSupply: r.participantMustSupply,
      ...(r.whyTheBuildDoesNotHoldIt ? { whyTheBuildDoesNotHoldIt: r.whyTheBuildDoesNotHoldIt } : {})
    })));
}

export function handMarkedControls(maps) {
  return maps.flatMap((m) => m.selectionControls.map((c) => ({
    document: m.documentId, field: c.field, page: c.page, section: c.sectionHeading,
    printedLine: c.printedLine, label: c.effectiveLabel, refusalClass: c.category, why: c.reason
  })));
}

export function inapplicableBlanks(maps) {
  return maps.flatMap((m) => m.canonicalRefusals
    .filter((r) => r.completenessDisposition === "NOT_APPLICABLE_ON_THIS_ROUTE")
    .map((r) => ({
      document: m.documentId, field: r.field, page: r.page, label: r.effectiveLabel,
      routeCondition: r.routeConditionThatMakesItInapplicable, why: r.why
    })));
}

/* ---- the run ----------------------------------------------------------------- */

/**
 * Build one New Mexico family.
 *
 * `family` carries everything that differs between the three: the id, the
 * output directory, the route, the ordered documents with their dictionaries,
 * the two fixtures, and the functions that write the participant instructions
 * and the review notes.
 */
export async function runNmFamily(family, argv = []) {
  const checkOnly = argv.includes("--check");
  const skipRaster = argv.includes("--no-raster");
  const { familyId, out: OUT, buildScript: BUILD_SCRIPT, route: ROUTE, documents: DOCUMENTS, fixtures: FIXTURES } = family;

  const { resolved, failures } = resolveSourcesByHash(DOCUMENTS.map((d) => ({ ...d, routeKey: ROUTE.routeKey })));
  if (failures.length > 0) {
    return {
      familyId, status: "BLOCKED_SOURCE", failedSourceIdentities: failures,
      why: "a source did not bind by exact SHA-256 in any mounted custody, so nothing may be rendered from it",
      overlayDirectoryTouched: false
    };
  }

  const censuses = [];
  for (const source of resolved) {
    const isFlat = source.strategy === "measured_flat_overlay";
    const census = isFlat ? await censusFlat(source) : await censusAcroForm(source);
    if (isFlat) {
      assert.equal(census.unmapped.length, 0,
        `${source.documentId}: ${census.unmapped.length} measured blank(s) carry no dictionary entry, so the packet would ship a blank nothing classifies: ${JSON.stringify(census.unmapped.slice(0, 6))}`);
      assert.equal(census.stale.length, 0,
        `${source.documentId}: the dictionary names ${census.stale.length} blank(s) this form no longer prints where it says; the geometry has moved: ${JSON.stringify(census.stale)}`);
      assert.equal(census.acroFieldCount, 0,
        `${source.documentId}: the corpus index records this form as flat and it now carries ${census.acroFieldCount} AcroForm field(s); a measured overlay is the wrong strategy for it`);
      assert.equal(census.strokedCheckboxCount, 0,
        `${source.documentId}: ${census.strokedCheckboxCount} stroked tick box(es) are now measurable, so the printed controls this build leaves to the participant should be mapped as measured controls instead`);
      /*
       * A measured overlay derives every write box from a glyph position, and a
       * glyph positioned by a fallback advance is not a position. The check is
       * on the WRITES rather than on the page: the retained local orders draw
       * their tick boxes as a symbol-font glyph whose width the font does not
       * supply, so nineteen refused blanks that sit to the right of one on their
       * own baseline carry a drifting x -- and none of them is a place this
       * build writes. Those rows keep their exact baseline and their position
       * along the line, are recorded as having no measurable coordinate, and get
       * no write box at all. A WRITE in that position stops the build.
       */
      assert.deepEqual(census.writesWithUnmeasurableX, [],
        `${source.documentId}: ${census.writesWithUnmeasurableX.length} value(s) would be written at a coordinate that carries fallback-advance drift: ${JSON.stringify(census.writesWithUnmeasurableX)}`);
    } else {
      assert.equal(census.unmapped.length, 0,
        `${source.documentId}: ${census.unmapped.length} widget(s) carry no dictionary entry: ${JSON.stringify(census.unmapped.slice(0, 8).map((u) => u.field))}`);
      assert.equal(census.stale.length, 0,
        `${source.documentId}: the dictionary names ${census.stale.length} field(s) this form does not have: ${JSON.stringify(census.stale)}`);
      assert.equal(census.printedUnmapped.length, 0,
        `${source.documentId}: ${census.printedUnmapped.length} printed blank(s) that no widget covers carry no dictionary entry, so the packet would ship a blank nothing classifies: ${JSON.stringify(census.printedUnmapped.slice(0, 6))}`);
      assert.equal(census.printedStale.length, 0,
        `${source.documentId}: the printed-blank dictionary names ${census.printedStale.length} blank(s) this form no longer prints there: ${JSON.stringify(census.printedStale)}`);
      assert.equal(census.hiddenOrNoView.length, 0,
        `${source.documentId}: ${census.hiddenOrNoView.length} widget(s) are Hidden or NoView and nothing may be written on them: ${JSON.stringify(census.hiddenOrNoView)}`);
      if (source.acroFieldCountFromIndex != null) {
        assert.equal(census.widgetRows.length, source.acroFieldCountFromIndex,
          `${source.documentId}: censused ${census.widgetRows.length} AcroForm fields, the committed corpus index declares ${source.acroFieldCountFromIndex}`);
      }
    }
    if (source.pageCountFromIndex != null) {
      assert.equal(census.pageCount, source.pageCountFromIndex,
        `${source.documentId}: ${census.pageCount} pages, the committed corpus index declares ${source.pageCountFromIndex}`);
    }
    censuses.push({ source, census, isFlat });
  }

  if (checkOnly) {
    return {
      familyId, status: "CHECK_ONLY",
      documents: censuses.map(({ source, census, isFlat }) => ({
        documentId: source.documentId, strategy: source.strategy, sha256: source.sha256,
        custody: source.custody, pages: census.pageCount,
        blanks: census.rows.length,
        ...(isFlat
          ? { measuredBlanksOnTheForm: census.measuredBlankCount, printedRulesThatAreNotBlanks: census.notBlanks.length, underlinesOfPrintedText: census.underlinesOfPrintedText.length, acroFieldsOnTheForm: census.acroFieldCount }
          : { corpusIndexDeclaresFieldCount: source.acroFieldCountFromIndex, acroFormFields: census.widgetRows.length, printedBlanksWithNoWidget: census.printedBlanks.length, sourceAuthoredValues: census.sourceAuthoredValues.length }),
        writes: census.rows.filter((r) => r.policy === "write").length,
        supply: census.rows.filter((r) => r.policy === "supply").length,
        protect: census.rows.filter((r) => r.policy === "protect").length,
        decretal: census.rows.filter((r) => r.policy === "decretal").length,
        election: census.rows.filter((r) => r.policy === "election").length,
        inapplicable: census.rows.filter((r) => r.policy === "inapplicable").length,
        optional: census.rows.filter((r) => r.policy === "optional").length,
        attorney: census.rows.filter((r) => r.policy === "attorney").length,
        notABlank: census.notBlanks?.length ?? 0
      }))
    };
  }

  fs.mkdirSync(path.join(ROOT, OUT, "fixtures"), { recursive: true });
  fs.mkdirSync(path.join(ROOT, OUT, "reports"), { recursive: true });
  fs.mkdirSync(path.join(ROOT, OUT, "raster"), { recursive: true });

  const artifacts = [];
  const writeProofs = [];
  const rasterPages = [];
  const maps = [];
  const refusedWrites = [];

  for (const fixtureName of ["canonical", "boundary"]) {
    const facts = FIXTURES[fixtureName];
    const packet = await PDFDocument.create();
    stampDeterministic(packet);
    const pageManifest = [];
    for (const { source, census, isFlat } of censuses) {
      const { bytes, report } = isFlat
        ? await renderFlat(source, census, facts)
        : await renderAcroForm(source, census, facts);
      for (const refusal of report.refused ?? []) {
        if (refusal.reason === "classified_unwritable_by_role") continue;
        const label = refusal.anchor ?? refusal.field;
        const owed = census.rows.find((r) => r.policy === "write" && (isFlat ? r.effectiveLabel === label : r.name === label));
        if (owed) refusedWrites.push({ fixture: fixtureName, document: source.documentId, field: owed.key, label, reason: refusal.reason, category: refusal.category ?? null });
      }
      const proof = await byteProof(source, census, bytes, report, fixtureName, facts, isFlat);
      writeProofs.push({
        fixture: fixtureName, documentId: source.documentId, strategy: source.strategy,
        sourceSha256: source.sha256,
        proofMethod: isFlat
          ? "text read back from the finalized bytes at every measured blank the overlay wrote on, with the source's own text at the same coordinates subtracted"
          : "flattened widget appearances read back at every measured /Rect of the finalized bytes",
        valuesReportedByFinalizer: report.written.length,
        flattenedWidgetAppearancesReadFromOutputBytes: proof.appearances,
        addedGlyphsReadFromOutputBytes: proof.glyphs,
        nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: proof.outsideBoxes,
        glyphsOutsideMeasuredWriteBoxesSample: proof.strayGlyphs,
        refusedFieldsWithInk: proof.refusedFieldsWithInk,
        documentAuthoredAppearances: proof.documentAuthoredAppearances,
        unfittable: report.unfittable,
        actualWrites: proof.actualWrites
      });
      const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
      const copied = await packet.copyPages(doc, doc.getPageIndices());
      for (const [i, p] of copied.entries()) {
        packet.addPage(p);
        pageManifest.push({ packetPage: packet.getPageCount(), documentId: source.documentId, sourcePage: i + 1, sourceSha256: source.sha256 });
      }
      if (fixtureName === "canonical") maps.push(mapFor(source, census, report, isFlat));
    }

    const packetBytes = await packet.save({ useObjectStreams: false, updateMetadata: false });
    const file = `${OUT}/fixtures/${fixtureName}.pdf`;
    fs.writeFileSync(path.join(ROOT, file), packetBytes);
    artifacts.push({
      fixture: fixtureName, file,
      sha256: crypto.createHash("sha256").update(packetBytes).digest("hex"),
      byteLength: packetBytes.length, pageCount: packet.getPageCount(), pageManifest,
      documents: censuses.map((c) => c.source.documentId)
    });

    const rasterDir = `${OUT}/raster/${fixtureName}`;
    fs.mkdirSync(path.join(ROOT, rasterDir), { recursive: true });
    for (let i = 0; !skipRaster && i < packet.getPageCount(); i += 1) {
      const stage = path.join(ROOT, rasterDir, `page-${String(i + 1).padStart(2, "0")}`);
      const render = await rasterizePageCalibrated({ file: path.join(ROOT, file), pageIndex: i, keep: stage });
      for (const scrap of ["page.pdf", "page-calibration.pdf", "page-calibration.png"]) {
        const f = path.join(stage, scrap);
        if (fs.existsSync(f)) fs.unlinkSync(f);
      }
      const png = path.join(stage, "page.png");
      rasterPages.push({
        fixture: fixtureName, page: i + 1,
        file: `${rasterDir}/page-${String(i + 1).padStart(2, "0")}/page.png`,
        pageWidthPt: render.pageWidth, pageHeightPt: render.pageHeight,
        pixelsPerPoint: Number(render.pxPerPt.toFixed(4)),
        calibrationResidualPx: render.calibrationResidualPx,
        paperBounds: render.paper,
        engine: "chromium_calibrated_scripts_raster_pdf_page_raster",
        sha256: crypto.createHash("sha256").update(fs.readFileSync(png)).digest("hex")
      });
    }
  }

  // A write the map claims and the finalizer refused is a hole in the packet,
  // and it is stopped here rather than reported: the map would then carry a
  // refusal whose reason is no approved reason at all, and the family would
  // fail its own counters for a defect the build could see coming.
  if (process.env.NM_DEBUG_REFUSALS) { console.error(JSON.stringify(refusedWrites, null, 1)); }
  assert.equal(refusedWrites.length, 0,
    `${refusedWrites.length} value(s) the map owes were refused by the finalizer: ${JSON.stringify(refusedWrites.slice(0, 6))}`);

  const rbf = requiredBeforeFilingItems(maps);
  const controls = handMarkedControls(maps);
  const inapplicable = inapplicableBlanks(maps);
  const instructionsText = family.participantInstructions({ maps, rbf, controls, inapplicable, route: ROUTE, documents: resolved });
  fs.writeFileSync(path.join(ROOT, OUT, "participant-instructions.md"), instructionsText);

  writeJson(`${OUT}/source-receipt.json`, {
    schemaVersion: "rcap-family-source-receipt/v1", familyId, worklistGroupId: familyId,
    jurisdiction: ROUTE.jurisdiction, implementationStrategy: "official_pdf_fill",
    implementationStrategyNote:
      "The assignment names official_pdf_fill for this family. Form 4-222 NMRA is an AcroForm and is filled. Every other "
      + "document in the packet is a flat New Mexico rule form with no AcroForm field on it, so it is built as a measured "
      + "overlay against the blanks the form prints -- underscore glyph runs far more often than stroked rules. The "
      + "strategy per document is recorded below rather than left to be inferred from the family's strategy field.",
    custodyClass: "SOURCE_ALREADY_HELD", acquisitionCommissioned: false,
    corpusRootFromEnvironment: "MASTER_LIBRARY_SOURCE_DIR",
    bindingMethod:
      "content hash. The digest the assignment pins is looked up across every custody the committed corpus index names, "
      + "and the first mounted custody whose bytes re-hash to that digest binds. No declared path is trusted: these "
      + "families declare their sources under a d_source_packs custody that is not mounted here, and resolving by path "
      + "returns BLOCKED_SOURCE for documents whose exact bytes are held.",
    routeKey: ROUTE.routeKey, routeSelectionId: ROUTE.routeSelectionId, statutoryAuthority: ROUTE.authority,
    allSourcesExact: true,
    documents: resolved.map((r) => ({
      sourceIds: [r.sourceId], documentId: r.documentId, formNumber: r.formNumber, revision: r.revision,
      custody: r.custody, pathInCustody: r.pathInCustody, custodiesCarryingThisDigest: r.custodiesCarryingThisDigest,
      resolvedBy: r.resolvedBy, sha256: r.sha256, byteLength: r.byteLength,
      instrumentKind: r.instrumentKind, strategy: r.strategy,
      structuralClassObserved: r.structuralClassObserved, acroFieldCount: r.acroFieldCountFromIndex
    })),
    sourceBinaryCommitted: false, commercialRoutesOpened: 0
  });

  writeJson(`${OUT}/field-census.census-v1.json`, {
    schemaVersion: "rcap-official-form-field-census/v1-census-v1", familyId,
    captionBasis:
      "Form 4-222's captions are the AcroForm field names the New Mexico Courts authored plus the printed line at each "
      + "widget's own rectangle. Every other document has no fields at all: each of its blanks is a measured underscore "
      + "run, printed rule or printed bracket pair, read from the page's own content stream by "
      + "scripts/rcap-nm-flat-forms/nm-flat-blank-measurer.mjs and re-measured on every build. The printed line the blank "
      + "sits on, and the words printed immediately before it, travel with each blank, because on a flat form that "
      + "context IS the label.",
    documents: censuses.map(({ source, census, isFlat }) => ({
      documentId: source.documentId, formNumber: source.formNumber, sourceSha256: source.sha256,
      strategy: source.strategy, structuralClassObserved: source.structuralClassObserved,
      pageCount: census.pageCount, fieldCount: census.rows.length,
      ...(isFlat
        ? {
          acroFieldsOnTheForm: census.acroFieldCount,
          strokedTickBoxesOnTheForm: census.strokedCheckboxCount,
          measuredBlanksOnTheForm: census.measuredBlankCount,
          printedRulesThatAreNotBlanks: census.notBlanks.map((n) => ({ key: n.key, page: n.page, measuredBlank: n.measuredBlank, why: n.why })),
          blanksWhoseAbsoluteXCannotBeMeasured: census.blanksWithUnmeasurableX,
          blanksWhoseAbsoluteXCannotBeMeasuredNote:
            "A glyph to the left of each of these on its own baseline is positioned by a fallback advance the font does "
            + "not supply, so the reported x carries that drift. Their baselines and their order along the line are "
            + "exact. None of them is a place this build writes: every one is a refusal, they are recorded with no write "
            + "box rather than with a coordinate, and a WRITE in that position stops the build.",
          underlinesOfPrintedText: census.underlinesOfPrintedText.map((u) => ({
            page: u.page, y: u.y, x: u.x, endX: u.endX, printedTextSittingOnIt: u.printedTextSittingOnIt
          })),
          underlinesNote:
            "New Mexico rule forms mark amended text by underlining and bracketing it. Every stroke listed here carries "
            + "printed glyphs on it and is an amendment mark, not a blank. A reader that took each of them for a place to "
            + "write would put a write box under the form's own amendment marks."
        }
        : {
          corpusIndexDeclaresFieldCount: source.acroFieldCountFromIndex,
          acroFormFields: census.widgetRows.length,
          widgetsRead: census.widgetRows.reduce((n, r) => n + r.widgets.length, 0),
          hiddenOrNoViewWidgets: census.hiddenOrNoView,
          sourceAuthoredValues: census.sourceAuthoredValues,
          printedBlanksOnTheForm: census.printedBlankCount,
          printedBlanksWithNoWidget: census.printedBlanks.length,
          printedBlanksWithNoWidgetNote:
            "An AcroForm document is not only its widgets. These are blanks the form PRINTS that no widget covers; every "
            + "one of them is on Form 4-223, the order a judge signs on the application, which is bound into the same "
            + "binary on pages 6 and 7 and is not fillable at all. They are carried in the field map as terminal fields so "
            + "that nothing on the paper is unclassified.",
          glyphMetricsExactByPage: census.glyphMetricsExactByPage,
          glyphMetricsNote:
            "Every glyph on this binary reports inexact metrics: the font supplies no widths, so the shared text walker "
            + "falls back to the font size as the advance and the reported x drifts to nearly twice the truth by the end "
            + "of a line. Nothing on this document is positioned from text geometry. The AcroForm widget rectangles are "
            + "exact and are what every write is placed on; the printed blanks above are identified by page, baseline and "
            + "position along the line, and no write box is derived from any of them."
        }),
      fields: census.rows.map((r) => ({
        field: r.key, page: r.page, rect: r.rect, rectBasis: r.rectBasis,
        ...(r.measuredBlank ? { measuredBlank: r.measuredBlank } : {}),
        ...(r.widgets ? { widgets: r.widgets } : {}),
        pdfType: r.type, isSelectionControl: r.isSelectionControl, multiline: r.multiline, maxLength: r.maxLength,
        section: r.section, effectiveLabel: r.effectiveLabel, policy: r.policy, factId: r.fact,
        printedLine: r.printedLine ?? null,
        printedTextAtCoordinate: r.printedTextAtCoordinate
      }))
    }))
  });

  writeJson(`${OUT}/production-field-map.json`, {
    schemaVersion: "rcap-official-form-field-map/v1-census-v1", familyId,
    routeKeys: [ROUTE.routeKey], routeSelectionId: ROUTE.routeSelectionId,
    renderStrategy: "acroform_fill_and_measured_flat_overlay",
    dispositionVocabulary: [SIGNATURE, COURT_OWNED, PARTICIPANT_ELECTION],
    routeDeterminedSelections: [],
    routeSelectionNote: family.routeSelectionNote,
    flatOverlayNote:
      "Every document but Form 4-222 carries no AcroForm field. Every value written on one sits on a blank measured from "
      + "the page's own content stream; measuredBlank records the run, rule or bracket pair each write box was derived "
      + "from, and the build refuses if a measured blank has moved or if a measured blank has no dictionary row.",
    selectionControlNote:
      "No selection control in this packet is marked. New Mexico draws its tick boxes as printed \"[ ]\" characters, so "
      + "checkboxCandidates finds no stroked box and there is no widget to set; a box drawn from a derived coordinate is a "
      + "mark nobody measured. Every control is listed in reports/blanks-left-for-the-participant.json and named in "
      + "participant-instructions.md with what to mark and why.",
    notApplicableOnThisRoute: inapplicable,
    requiredBeforeFilingCount: rbf.length, requiredBeforeFiling: rbf,
    maps, generationAllowed: false, runtimeSelectable: false, commercialRoutesOpened: 0
  });

  const manifestReconciliation = reconcilePacketSetManifest(familyId, family.componentDelivery ?? {}, instructionsText);
  writeJson(`${OUT}/reports/packet-set-manifest-reconciliation.json`, {
    schemaVersion: "rcap-packet-set-manifest-reconciliation/v1", ...manifestReconciliation
  });
  assert.equal(manifestReconciliation.everyRequiredComponentAccountedFor, true,
    `${familyId}: the packet-set manifest names components this build does not account for: ${JSON.stringify(manifestReconciliation.components.filter((c) => !c.accountedFor))}`);

  writeJson(`${OUT}/reports/rendered-artifacts.json`, {
    schemaVersion: "rcap-rendered-artifacts/v1", familyId, renderedFresh: true,
    artifacts, packets: artifacts.map((a) => ({ fixture: a.fixture, documents: a.documents })),
    everyPageRastered: rasterPages.length === artifacts.reduce((n, a) => n + a.pageCount, 0),
    byteDerivedHashes: true, rasterEngine: RASTER_ENGINE, rasterPages,
    independentVerificationPending: true
  });

  writeJson(`${OUT}/reports/actual-writes.json`, {
    schemaVersion: "rcap-actual-writes-byte-proof/v1", familyId, derivedFromArtifactBytes: true,
    note:
      "Read back from the finalized PDF bytes at every write box, not from the finalizer's own report. On a flat document "
      + "the write box is the measured blank the value sits on, the source's own text at those coordinates is subtracted "
      + "so the form's printed caption is not reported as this build's ink, and measuredBlank travels with each write so a "
      + "reviewer can check the placement against the paper.",
    documents: writeProofs,
    artifacts: writeProofs.map((p) => ({
      fixture: p.fixture, documentId: p.documentId, strategy: p.strategy,
      valuesReportedByFinalizer: p.valuesReportedByFinalizer,
      addedGlyphsReadFromOutputBytes: p.addedGlyphsReadFromOutputBytes,
      flattenedWidgetAppearancesReadFromOutputBytes: p.flattenedWidgetAppearancesReadFromOutputBytes,
      nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: p.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes,
      refusedFieldsWithInk: p.refusedFieldsWithInk
    })),
    blockingFindings: writeProofs.flatMap((p) => p.refusedFieldsWithInk.map((r) => ({
      fixture: p.fixture, field: r.fieldId, finding: "a field the map refused carries ink in the output"
    })))
  });

  writeJson(`${OUT}/reports/blanks-left-for-the-participant.json`, {
    schemaVersion: "rcap-blanks-left-for-the-participant/v1", familyId,
    requiredBeforeFiling: rbf,
    handMarkedControls: controls,
    handMarkedControlsNote:
      "New Mexico draws its selection controls as printed \"[ ]\" characters rather than as stroked paths or form fields, "
      + "so there is no measured box for this build to mark and no widget to set. They are listed here and named in "
      + "participant-instructions.md as boxes the participant marks by hand. No geometry was invented for any of them.",
    notApplicableOnThisRoute: inapplicable,
    notApplicableNote:
      "Blanks on a branch of the form this route does not reach. Each names the branch, the rule or the route fact that "
      + "puts it outside the route, and each is stated to the participant so a blank on their paper is a blank they were "
      + "told about rather than one nobody explained.",
    participantElections: maps.flatMap((m) => m.canonicalRefusals
      .filter((r) => r.category === PARTICIPANT_ELECTION)
      .map((r) => ({ document: m.documentId, field: r.field, page: r.page, label: r.effectiveLabel, why: r.why }))),
    protectedBlanks: maps.flatMap((m) => m.canonicalRefusals
      .filter((r) => r.requiredBeforeFiling !== true && r.completenessDisposition !== "NOT_APPLICABLE_ON_THIS_ROUTE")
      .map((r) => ({ document: m.documentId, field: r.field, page: r.page, label: r.effectiveLabel, refusalClass: r.category, why: r.why }))),
    everyRequiredBeforeFilingItemIsDisclosed: true,
    disclosedIn: `${OUT}/participant-instructions.md`
  });

  writeJson(`${OUT}/reports/independent-visual-review.json`, {
    schemaVersion: "rcap-independent-visual-review/v1", familyId,
    required: true, granted: false, reviewedBy: null,
    note:
      "Every page of both fixtures is rastered for a human who did not build this family. It matters more than usual "
      + "here: almost all of this packet is drawn onto flat forms at measured coordinates, and a reviewer reading the "
      + "paper is the check that a value sits on the blank it belongs on rather than merely near it.",
    whatToLookAt: family.whatToLookAt,
    artifacts: artifacts.map((a) => ({ fixture: a.fixture, file: a.file, sha256: a.sha256, pageCount: a.pageCount })),
    rasterPages: rasterPages.map((p) => ({ fixture: p.fixture, page: p.page, file: p.file, sha256: p.sha256 }))
  });

  writeJson(`${OUT}/build-status.json`, {
    schemaVersion: "rcap-family-build-status/v1", familyId,
    buildStatus: "state_built", reviewStatus: "qa_review_pending", builtBy: BUILD_SCRIPT,
    rasterEngine: skipRaster ? "not rendered in this run" : "chromium_calibrated", popplerUsed: false,
    renderedArtifacts: artifacts.length, rasterPages: rasterPages.length,
    independentVerificationStatus: "PENDING", selfVerified: false,
    generationAllowed: false, runtimeSelectable: false,
    commercialRoutesOpened: 0, productionTouched: false,
    grantsNothing: "A rendered packet is review evidence. It authorizes no fulfillment and opens no commercial route."
  });

  const counted = countCompleteness(maps, writeProofs, artifacts, instructionsText);
  writeJson(`${OUT}/reports/completeness-counters.json`, {
    schemaVersion: "rcap-builder-completeness-counters/v1", familyId,
    whatThisIs:
      "The BUILDER's own count of the nine completeness counters, computed with the repository's own contract functions "
      + "over this family's field map, byte proof, rendered artifacts and participant-instructions.md.",
    whatThisIsNot:
      "A verdict. This lane does not verify its own packets, and PASS_COMPLETE additionally requires a hash-bound "
      + "RASTER_PASS from the central raster workflow.",
    counters: counted.counters,
    allNineZero: PASS_COUNTERS.every((c) => counted.counters[c] === 0),
    findings: counted.findings,
    blankDispositions: counted.ledger.reduce((acc, b) => { acc[b.disposition] = (acc[b.disposition] ?? 0) + 1; return acc; }, {})
  });

  writeJson(`${OUT}/build-findings.json`, {
    schemaVersion: "rcap-family-build-findings/v1", familyId,
    blocking: family.blockingFindings ?? [],
    findings: family.findings
  });

  writeJson(`${OUT}/approval-request.json`, {
    schemaVersion: "rcap-family-approval-request/v1", familyId,
    requested: "independent completeness verification, visual review and counsel review",
    buildStatus: "state_built", status: "PENDING_INDEPENDENT_VERIFICATION",
    approvedForLive: false, live: false, commercialRoutesOpened: 0,
    mattersForTheReviewersAttention: family.mattersForTheReviewersAttention
  });

  return {
    familyId,
    status: PASS_COUNTERS.every((c) => counted.counters[c] === 0) ? "COMPLETED" : "STOPPED",
    counters: counted.counters, counterFindings: counted.findings,
    directory: OUT,
    documents: resolved.map((r) => ({ documentId: r.documentId, strategy: r.strategy, sha256: r.sha256, custody: r.custody, pages: r.pageCountFromIndex })),
    writes: maps.reduce((n, m) => n + m.canonicalWrites.length, 0),
    terminalFields: maps.reduce((n, m) => n + m.canonicalWrites.length + m.canonicalRefusals.length + m.selectionControls.length, 0),
    requiredBeforeFiling: rbf.length,
    packetSetManifest: manifestReconciliation,
    handMarkedControlsDisclosed: controls.length,
    notApplicableOnThisRoute: inapplicable.length,
    blankDispositions: counted.ledger.reduce((acc, b) => { acc[b.disposition] = (acc[b.disposition] ?? 0) + 1; return acc; }, {}),
    artifacts: artifacts.map((a) => ({ fixture: a.fixture, sha256: a.sha256, byteLength: a.byteLength, pageCount: a.pageCount })),
    rasterPages: rasterPages.length
  };
}
