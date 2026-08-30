// Produces the finalized participant artifact for one official form.
//
// "Finalized" means the thing a participant would actually file: values
// materialized into appearances, the form flattened so no interactive field
// survives, active content removed and proven gone, and the bytes made
// reproducible. Everything downstream -- the contact sheet, the visibility
// proof, the drift check -- reads this artifact rather than an intermediate
// one, because an intermediate is not what gets filed.
import { createRequire } from "node:module";
import crypto from "node:crypto";
import { decideBinding, resolveFact, valueMatchesType, selectOnePerSlot, isChooserPrompt } from "./rcap-field-semantics.mjs";
import { fitTextToWidget, applyFitToTextField, MIN_READABLE_FONT_SIZE } from "./rcap-text-fitting.mjs";
import { sanitizeAndFlatten, scanBytesForActiveContent, ensureDefaultAppearances } from "./rcap-active-content.mjs";
import { detectNonFilingNotice } from "./rcap-source-notice.mjs";
import { extractTextItems, groupIntoLines, captureWidgetContext } from "./rcap-pdf-anchor-capture.mjs";

const require = createRequire(import.meta.url);
const { PDFDocument, PDFTextField, PDFDropdown, PDFName, StandardFonts, rgb } = require("pdf-lib");

// A fixed instant: a fresh document otherwise stamps the wall clock into its
// info dictionary, and every render of the same facts would differ.
export const DETERMINISTIC_STAMP = new Date("2026-01-01T00:00:00Z");

/**
 * Participant values are drawn in black.
 *
 * The renderer defaulted to a dark blue for no recorded reason. A filed court
 * document is a black-ink document unless its own instructions say otherwise,
 * and an unexplained colour on a filing is a difference nobody asked for.
 */
export const PARTICIPANT_INK = rgb(0, 0, 0);
export const PARTICIPANT_INK_RGB = { r: 0, g: 0, b: 0 };

// The write box sits this far above the rule it is measured from, so a box that
// belongs to a protected rule is one whose baseline is this far above it.
export const BASELINE_ABOVE_RULE = 2;
// Tolerance around that, so a profile that rounds differently still trips.
export const PROTECTED_RULE_BAND = 3;

/**
 * The one way a form may use another ink.
 *
 * A family profile may carry `approvedTextColor: { r, g, b, reason, source }`,
 * and both the reason and the source citation are required — an override with
 * no source behind it is the unexplained default arriving under a new name. A
 * colour is never inherited from a prior fixture merely because it rendered.
 */
export function participantInk(approvedTextColor) {
  if (approvedTextColor === undefined || approvedTextColor === null) return PARTICIPANT_INK;
  const { r, g, b, reason, source } = approvedTextColor;
  const inRange = (v) => typeof v === "number" && v >= 0 && v <= 1;
  if (!inRange(r) || !inRange(g) || !inRange(b)) {
    throw new Error("approvedTextColor must carry r, g and b in 0..1");
  }
  if (typeof reason !== "string" || reason.trim().length < 20) {
    throw new Error("approvedTextColor requires a reason; an unexplained colour on a filed form is the defect this replaced");
  }
  if (typeof source !== "string" || source.trim() === "") {
    throw new Error("approvedTextColor requires a source citation for the requirement");
  }
  return rgb(r, g, b);
}

/**
 * Carries the court's own document metadata onto the finalized artifact.
 *
 * The finalizer used to stamp its own Producer and Creator and overwrite the
 * Title, which destroyed the issuing court's provenance — author, subject,
 * keywords and the form's real name — and wrote partner branding into a
 * document whose footer says it shall not be modified. The participant's
 * official form carries the court's identity, not ours.
 *
 * Only descriptive metadata crosses. Nothing active does: JavaScript, actions,
 * embedded executables, interactive behaviour and unsafe attachments are the
 * sanitizer's business and are removed there, and no amount of "it was in the
 * source" makes any of them safe to carry.
 *
 * One field cannot be carried. pdf-lib 1.17 stamps its own /Producer into any
 * document it constructs, and the finalized artifact is constructed rather than
 * edited in place, so /Producer reads as the PDF library that wrote the bytes.
 * That is reported rather than hidden. It is also not a loss worth working
 * around: /Producer names whoever last wrote the file, which is exactly why it
 * was the wrong place for provenance and why the sidecar record replaced it.
 * What matters — that no partner branding appears on the participant's filed
 * form — holds, and the verifier checks that rather than checking for a stamp.
 */
export function preserveSourceMetadata(sourceDoc, cleanDoc) {
  const carried = {};
  for (const [key, get, set] of [
    ["title", () => sourceDoc.getTitle(), (v) => cleanDoc.setTitle(v)],
    ["author", () => sourceDoc.getAuthor(), (v) => cleanDoc.setAuthor(v)],
    ["subject", () => sourceDoc.getSubject(), (v) => cleanDoc.setSubject(v)],
    ["keywords", () => sourceDoc.getKeywords(), (v) => cleanDoc.setKeywords(v.split(/\s*,\s*/))],
    ["creator", () => sourceDoc.getCreator(), (v) => cleanDoc.setCreator(v)],
    ["producer", () => sourceDoc.getProducer(), (v) => cleanDoc.setProducer(v)]
  ]) {
    let value;
    try { value = get(); } catch { value = undefined; }
    if (typeof value === "string" && value.trim() !== "") {
      try { set(value); carried[key] = value; } catch { /* a field the source cannot round-trip is left alone */ }
    }
  }
  return carried;
}

/**
 * What the emitted bytes actually carry, read back from the bytes.
 *
 * The in-memory document is not the artifact. pdf-lib writes its own /Producer
 * when it serialises a constructed document, so the only honest way to report
 * what a participant's form says is to read the file that was written.
 */
export async function metadataOfBytes(bytes) {
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  const read = (fn) => { try { const v = fn(); return typeof v === "string" ? v : null; } catch { return null; } };
  return {
    title: read(() => doc.getTitle()),
    author: read(() => doc.getAuthor()),
    subject: read(() => doc.getSubject()),
    keywords: read(() => doc.getKeywords()),
    creator: read(() => doc.getCreator()),
    producer: read(() => doc.getProducer())
  };
}

/** Any partner branding left on a participant's filed form. */
export const BRANDING_PATTERN = /legalease|rcap|expungement\.ai/i;

export function brandingInMetadata(metadata) {
  return Object.entries(metadata ?? {})
    .filter(([, value]) => typeof value === "string" && BRANDING_PATTERN.test(value))
    .map(([field, value]) => ({ field, value }));
}

/**
 * The source's creation date, carried through; and our own modification date.
 *
 * Carrying the creation date is honest — the court created this form on that
 * day. Carrying the source's MODIFICATION date would not be: the artifact was
 * modified, by us, and a modification date that predates the modification says
 * the opposite. Ours is a fixed instant so a re-render of unchanged inputs
 * reproduces byte for byte.
 */
export function carryDates(sourceDoc, cleanDoc) {
  let created = null;
  try { created = sourceDoc.getCreationDate(); } catch { created = null; }
  cleanDoc.setCreationDate(created instanceof Date && !Number.isNaN(created.getTime()) ? created : DETERMINISTIC_STAMP);
  cleanDoc.setModificationDate(DETERMINISTIC_STAMP);
  return {
    creationDate: (created instanceof Date && !Number.isNaN(created.getTime()) ? created : DETERMINISTIC_STAMP).toISOString(),
    modificationDate: DETERMINISTIC_STAMP.toISOString(),
    modificationDateIsOurs: true
  };
}

/** A fingerprint of the source's descriptive metadata, for the sidecar. */
export function sourceMetadataFingerprint(doc) {
  const read = (fn) => { try { const v = fn(); return typeof v === "string" ? v : ""; } catch { return ""; } };
  const parts = [
    read(() => doc.getTitle()), read(() => doc.getAuthor()), read(() => doc.getSubject()),
    read(() => doc.getKeywords()), read(() => doc.getCreator()), read(() => doc.getProducer())
  ];
  return crypto.createHash("sha256").update(parts.join("\u0000"), "utf8").digest("hex");
}

/** How far inside a control's own bounds the mark is drawn, in points. */
export const SELECTION_INSET = 2;
/** The mark's stroke. Heavier than the court's 0.72pt box, so it reads as a mark. */
export const SELECTION_LINE_WIDTH = 1.2;

/**
 * Marks selection controls the document already draws.
 *
 * A form that offers "check one option only" is answered by marking the box the
 * court printed. Two things this does NOT do, and the distinction is the whole
 * point:
 *
 *   * It never draws a box. Adding a control to a court's form changes the form
 *     rather than completing it, and a reader cannot tell a drawn box from a
 *     printed one.
 *   * It never redraws, thickens or moves the existing box. The two diagonals
 *     are struck strictly INSIDE the measured bounds, inset far enough that the
 *     court's own stroke is untouched.
 *
 * Every box passed here must have been MEASURED off the document. A derived
 * coordinate -- one inferred from where a label sits -- is how a mark ends up
 * in the margin next to nothing, so a selection carrying `measured: false` is
 * refused rather than drawn.
 */
function markSelections({ pages, selections, protectedRules, ink, report }) {
  report.selections = [];
  report.selectionsRefused = [];
  for (const selection of selections ?? []) {
    const page = pages[selection.page - 1];
    const refuse = (reason, detail = null) =>
      report.selectionsRefused.push({ control: selection.label ?? null, reason, ...(detail ? { detail } : {}) });
    if (!page) { refuse("selection_page_not_in_document"); continue; }
    if (selection.measured !== true) { refuse("selection_box_was_not_measured_off_the_document"); continue; }
    const box = selection.box ?? {};
    const { x0, y0, x1, y1 } = box;
    if (![x0, y0, x1, y1].every((n) => typeof n === "number" && Number.isFinite(n))) { refuse("selection_box_is_not_a_rectangle"); continue; }
    const width = x1 - x0, height = y1 - y0;
    const inset = selection.inset ?? SELECTION_INSET;
    // Inset twice over, so a control too small to mark inside its own stroke is
    // refused rather than marked over the court's line.
    if (!(width > inset * 2 + 1 && height > inset * 2 + 1)) {
      refuse("selection_box_is_too_small_to_mark_inside_its_own_bounds", `${width}x${height}pt with a ${inset}pt inset`);
      continue;
    }
    const { width: pageWidth, height: pageHeight } = page.getSize();
    if (x0 < 0 || y0 < 0 || x1 > pageWidth + 0.5 || y1 > pageHeight + 0.5) {
      refuse("selection_box_falls_outside_the_page", `${x0},${y0} to ${x1},${y1} on a ${pageWidth}x${pageHeight} page`);
      continue;
    }
    const trespass = (selection.protectedRules ?? protectedRules).find((r) =>
      r.page === selection.page && r.y >= y0 - PROTECTED_RULE_BAND && r.y <= y1 + PROTECTED_RULE_BAND
      && x0 < r.endX && x1 > r.x);
    if (trespass) {
      refuse("selection_box_lands_on_a_rule_the_court_owns",
        `the rule at page ${trespass.page} y=${trespass.y} is owned by ${JSON.stringify(trespass.caption ?? trespass.category ?? "the court")}`);
      continue;
    }
    const a = { x: x0 + inset, y: y0 + inset }, b = { x: x1 - inset, y: y1 - inset };
    const lineWidth = selection.lineWidth ?? SELECTION_LINE_WIDTH;
    page.drawLine({ start: a, end: b, thickness: lineWidth, color: ink });
    page.drawLine({ start: { x: a.x, y: b.y }, end: { x: b.x, y: a.y }, thickness: lineWidth, color: ink });
    report.selections.push({
      control: selection.label ?? null, page: selection.page,
      box: { x0, y0, x1, y1 }, inset, lineWidth,
      mark: "two_diagonal_strokes_inset",
      drewANewBox: false, redrewTheCourtsBox: false
    });
  }
}

/**
 * Finalizes a flat printed form by drawing values at measured anchors.
 *
 * A flat form has no widgets, so there is nothing to fill and nothing to
 * flatten: the values are drawn into page content directly and are therefore
 * visible from the moment they are written. The rest of the pipeline is
 * identical, because a flat form is just as capable of carrying a Launch
 * action or an XFA packet as a widget-bearing one.
 */
export async function finalizeFlatOverlay({
  sourceBytes,
  expectedSha256,
  anchors,
  // Existing selection controls the court already drew, and which of them this
  // configuration marks. Never a new box: see markSelections below.
  selections = [],
  protectedRules = [],
  // fieldName -> factId. The only way a descriptor marked
  // `requiresExplicitMapping` can bind, and it can override nothing: a protect
  // rule, a type guard and a caption-only document all still refuse.
  explicitMappings = {},
  facts,
  nonFilingNotice = null,
  // The document's own printed text. Passed so this path can hold for itself
  // rather than only when a caller remembered to look: the defect this closes
  // was a detector that returned false, and a path that trusts the caller
  // inherits every future miss the same way.
  documentTextLines = [],
  minFontSize = MIN_READABLE_FONT_SIZE,
  title = null,
  approvedTextColor = null
}) {
  const ink = participantInk(approvedTextColor);
  const sourceSha = crypto.createHash("sha256").update(sourceBytes).digest("hex");
  if (expectedSha256 && expectedSha256 !== sourceSha) {
    throw new Error(`source drift: expected ${expectedSha256}, read ${sourceSha}`);
  }
  // Either the caller's notice or one this path finds for itself, including in
  // the anchor labels — on a flat overlay those ARE the document's printed
  // text, so a reference-only notice sitting on an anchor is caught even with
  // no line list supplied.
  const flatHold = nonFilingNotice
    ?? detectNonFilingNotice([...documentTextLines, ...(anchors ?? []).map((a) => a?.label)])?.notice
    ?? null;
  if (flatHold) throw new NonFilingHoldError(flatHold);

  const pdfDoc = await PDFDocument.load(sourceBytes, { ignoreEncryption: true, updateMetadata: false });
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const pages = pdfDoc.getPages();
  const report = { sourceSha256: sourceSha, written: [], refused: [], unfittable: [], expectedValues: [], normalized: [] };

  // The printed section each write box lands in, measured once per page from
  // the page's own text. captureWidgetContext is the shared measurement the
  // widget path already uses, so a flat overlay and a widget form answer the
  // same question the same way rather than through two implementations that
  // can drift apart. A page whose content stream cannot be decoded yields no
  // region rather than a guess -- the refusals that depend on a NAME are
  // unaffected either way.
  const linesByPage = new Map();
  const regionOf = (anchor) => {
    if (anchor.regionHeading !== undefined && anchor.regionHeading !== null) {
      return { heading: anchor.regionHeading, isDocumentTitle: anchor.regionIsDocumentTitle === true };
    }
    const page = pages[anchor.page - 1];
    if (!page || !anchor.writeBox) return { heading: null, isDocumentTitle: false };
    try {
      if (!linesByPage.has(anchor.page)) linesByPage.set(anchor.page, groupIntoLines(extractTextItems(page)));
      const [context] = captureWidgetContext(page, [{ name: anchor.label, rect: anchor.writeBox }], {
        precomputedLines: linesByPage.get(anchor.page), isFirstPage: anchor.page === 1
      });
      return { heading: context?.regionHeading ?? null, isDocumentTitle: context?.regionIsDocumentTitle === true };
    } catch {
      return { heading: null, isDocumentTitle: false };
    }
  };

  for (const anchor of anchors) {
    const page = pages[anchor.page - 1];
    if (!page) {
      report.refused.push({ anchor: anchor.label, reason: "anchor_page_not_in_document" });
      continue;
    }

    // A write box outside the page cannot be reviewed, cannot be read, and on a
    // filed document is a value that simply is not there. The factory had no
    // such check: an anchor at x=560 on a 612pt page was drawn, running off the
    // right edge. Refused rather than clipped — a clipped value on a filing is
    // a wrong value, not a shorter one.
    const { width: pageWidth, height: pageHeight } = page.getSize();
    const box = anchor.writeBox;
    if (box.x < 0 || box.y < 0 || box.x + box.width > pageWidth + 0.5 || box.y + box.height > pageHeight + 0.5) {
      report.refused.push({
        anchor: anchor.label, reason: "write_box_falls_outside_the_page",
        detail: `box ${box.x},${box.y} ${box.width}x${box.height} against a ${pageWidth}x${pageHeight} page`
      });
      continue;
    }

    // Protection had been a naming convention: the protect rules are applied to
    // the anchor's LABEL, so an anchor labelled "Name Printed or Typed" whose
    // write box sits on the signature rule was written without complaint. A
    // court owns the blank, not the word next to it, so the rule the box lands
    // on is checked as well. This is geometry-based protection, and it holds
    // independently of what the label says.
    const trespass = (anchor.protectedRules ?? protectedRules).find((r) =>
      r.page === anchor.page
      && Math.abs(r.y + BASELINE_ABOVE_RULE - box.y) <= PROTECTED_RULE_BAND
      && box.x < r.endX && box.x + box.width > r.x);
    if (trespass) {
      report.refused.push({
        anchor: anchor.label, reason: "write_box_lands_on_a_rule_the_court_owns",
        category: trespass.category ?? "protected_rule",
        detail: `the rule at page ${trespass.page} y=${trespass.y} is owned by the protected caption ${JSON.stringify(trespass.caption ?? "")}`
      });
      continue;
    }

    // An anchor is only ever placed against an allowlisted label, but the
    // protect rules are applied again here: the drawing path must not be a way
    // around them.
    //
    // Including the printed REGION, which this path used to drop. The widget
    // path has always passed `regionHeading`, so a widget under a printed
    // "Certificate of Service" or "VERIFICATION" is refused by region whatever
    // it is called; the flat path passed { name, pdfType, effectiveLabel } and
    // nothing else, so on a flat overlay the region channel never ran at all.
    // The family that measured this recorded the consequence: on the Arkansas
    // misdemeanour petition, page 4 is a Certificate of Service and page 3 is a
    // VERIFICATION, and a blank captioned "Date" under the certificate binds
    // deterministic.filing_date through its printed caption with nothing to
    // object.
    //
    // The heading is taken from the anchor when a caller measured one, and
    // otherwise measured here from the page's own content stream. That second
    // clause is deliberate and follows `documentTextLines` above: a path that
    // can only be protected when the caller remembered to look inherits every
    // future miss the same way.
    const region = regionOf(anchor);
    const decision = decideBinding(
      {
        name: anchor.label,
        pdfType: "text",
        effectiveLabel: anchor.label,
        regionHeading: region.heading,
        regionIsDocumentTitle: region.isDocumentTitle
      },
      {
        explicitMappings,
        captionOnly: anchor.captionOnly === true,
        availableChargeRows: Array.isArray(facts?.["matter.charges"]) ? facts["matter.charges"].length : 0
      }
    );
    if (!decision.writable) {
      report.refused.push({ anchor: anchor.label, reason: decision.reason, category: decision.category ?? null,
        regionHeading: decision.regionHeading ?? null });
      continue;
    }
    const factId = anchor.factId ?? decision.factId;
    const raw = resolveFact(facts, factId);
    // Some blanks are followed by the word they are a blank FOR: Wisconsin's
    // venue line prints "CIRCUIT COURT, ______ COUNTY". Writing a county fact
    // that already carries the suffix produced "Milwaukee County   COUNTY" on
    // the caption of a petition. The suffix the form itself prints is removed
    // from the value, and the removal is recorded rather than done silently.
    let value = raw;
    const printedSuffix = anchor.printedSuffixAfterBlank ?? null;
    if (printedSuffix && typeof raw === "string") {
      // Anchored at the end, so the match has to be made against a trimmed
      // value: "La Crosse County " — which is what a form field and a CSV
      // import routinely produce — otherwise defeats the pattern, the trailing
      // space alone gets trimmed, and the venue renders "La Crosse County
      // COUNTY" while the audit record claims the suffix was removed. A false
      // normalization record is worse than none: it is the artifact a reviewer
      // would trust instead of looking.
      const escaped = printedSuffix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      // The abbreviation the same word is printed as. "Milwaukee Co." doubles
      // exactly as "Milwaukee County" does.
      const abbreviation = printedSuffix.length > 3 ? `${escaped.slice(0, 2)}\\.` : null;
      const alternatives = [escaped, ...(abbreviation ? [abbreviation] : [])].join("|");
      const base = raw.trim();
      const stripped = base.replace(new RegExp(`\\s*\\b(?:${alternatives})\\.?$`, "i"), "").trim();
      // Only when the suffix actually came off. A value that merely had
      // whitespace trimmed was not normalized and must not be recorded as if
      // it were.
      if (stripped !== base && stripped.length > 0) {
        value = stripped;
        report.normalized.push({ anchor: anchor.label, factId, from: raw, to: stripped,
          why: `the form prints ${JSON.stringify(printedSuffix)} after this blank, so the value must not repeat it` });
      } else {
        value = base;
      }
    }
    if (!valueMatchesType(value, decision.valueType)) {
      report.refused.push({ anchor: anchor.label, reason: "no_value_or_type_mismatch", factId });
      continue;
    }
    const fit = fitTextToWidget({
      font, text: String(value), rect: anchor.writeBox, multiline: false,
      maxFontSize: anchor.fontSize, minFontSize
    });
    if (fit.outcome === "refused") {
      report.unfittable.push({ anchor: anchor.label, factId, ...fit });
      report.refused.push({ anchor: anchor.label, reason: fit.reason, category: "unfittable" });
      continue;
    }
    page.drawText(fit.lines.join(" "), {
      x: anchor.writeBox.x, y: anchor.writeBox.y, size: fit.fontSize, font, color: ink
    });
    report.written.push({ anchor: anchor.label, factId, fontSize: fit.fontSize, outcome: fit.outcome });
    report.expectedValues.push(String(value));
  }

  markSelections({ pages, selections, protectedRules, ink, report });

  const { clean, report: sanitation } = await sanitizeAndFlatten(pdfDoc);
  report.sanitation = sanitation;
  report.sourceMetadataFingerprint = sourceMetadataFingerprint(pdfDoc);
  report.metadataCarried = preserveSourceMetadata(pdfDoc, clean);
  report.participantInk = approvedTextColor ? { ...approvedTextColor } : PARTICIPANT_INK_RGB;
  report.dates = carryDates(pdfDoc, clean);
  const bytes = await clean.save({ useObjectStreams: false, updateMetadata: false });
  report.metadataEmitted = await metadataOfBytes(bytes);
  report.metadataBranding = brandingInMetadata(report.metadataEmitted);
  if (report.metadataBranding.length > 0) {
    throw new Error(`refusing to emit: partner branding on a participant's official form (${report.metadataBranding.map((b) => b.field).join(", ")})`);
  }
  const residue = scanBytesForActiveContent(bytes);
  if (!residue.inspectable) throw new Error("finalized overlay is not byte-inspectable");
  if (residue.hits.length > 0) throw new Error(`refusing to emit: active-content residue remains: ${residue.hits.join(", ")}`);
  report.activeContentScan = residue;
  report.outputSha256 = crypto.createHash("sha256").update(bytes).digest("hex");
  report.outputBytes = bytes.length;
  return { bytes, report };
}

export class NonFilingHoldError extends Error {
  constructor(notice) {
    super(`document states it is not for filing: ${String(notice).slice(0, 160)}`);
    this.name = "NonFilingHoldError";
    this.notice = notice;
  }
}

/**
 * Fills, fits, flattens, sanitizes and stamps one form.
 *
 * `census` supplies each field's pdf type, widget rectangle and multiline
 * flag, all read from the binary. `facts` is the fact set. Refusals -- a
 * protected field, an unfittable value, a charge row with no charge -- are
 * returned, never worked around.
 */
export async function finalizeOfficialForm({
  sourceBytes,
  expectedSha256,
  census,
  facts,
  explicitMappings = {},
  // Fields the classifier decided, by ROLE, that the participant does not
  // complete. Supplied by the caller because only the caller has the
  // classification, and required here because deciding twice means deciding
  // differently: the driver refused these and recorded them in the map's
  // unwritableFields, then called this function, which re-derived every
  // decision from the census alone and wrote them anyway. KY AOC-334's `Court`
  // and `Date`, VA CC-1201's `User.FullName` and `User.Sex`, NE DC 1:15's
  // `adoptionof` and VT 600-00228's `3` were all refused in their own maps and
  // present in their own bytes -- and the comment beside the driver's refusal
  // asserted the factory would refuse them at render time, which nothing did.
  unwritableFields = [],
  captionOnly = false,
  documentAcceptsFill = true,
  nonFilingNotice = null,
  // As above: this path holds on the document's own words, not only on the
  // caller's reading of them.
  documentTextLines = [],
  maxFontSize,
  minFontSize = MIN_READABLE_FONT_SIZE,
  title = null,
  // Field name -> appearance disposition, for the family being rendered. The
  // caller resolves it from the shared semantic registry; an empty map leaves
  // every field on the structural default, which is what every unclassified
  // family gets.
  appearanceDispositions = new Map()
}) {
  const sourceSha = crypto.createHash("sha256").update(sourceBytes).digest("hex");
  if (expectedSha256 && expectedSha256 !== sourceSha) {
    throw new Error(`source drift: expected ${expectedSha256}, read ${sourceSha}`);
  }

  // A form that says on its own face that it must not be completed for filing
  // is never filled, whatever else the profile says.
  const hold = nonFilingNotice ?? detectNonFilingNotice(documentTextLines)?.notice ?? null;
  if (hold) throw new NonFilingHoldError(hold);

  const pdfDoc = await PDFDocument.load(sourceBytes, { ignoreEncryption: true, updateMetadata: false });
  const form = pdfDoc.getForm();
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  // Before anything is written: setting a font size edits the /DA string, so a
  // field without one has to be given a default first.
  const defaultAppearancesRepaired = ensureDefaultAppearances(form);

  const availableChargeRows = Array.isArray(facts?.["matter.charges"]) ? facts["matter.charges"].length : 0;
  const report = {
    sourceSha256: sourceSha,
    written: [],
    refused: [],
    unfittable: [],
    protectedFields: [],
    expectedValues: []
  };

  // Deciding and writing used to happen in one pass, which cannot see that two
  // widgets are competing for one place on the paper. Every field is decided
  // first, the writable ones are reduced to one per slot, and only then is
  // anything written — so the artifact and the map agree about which widget
  // carries the value.
  const unwritableByRole = new Set((unwritableFields ?? []).map((f) => String(f?.field ?? f?.name ?? f)));

  const allowed = [];
  for (const field of census) {
    // Role first, and it is not overridable. The name channel can only ever
    // widen what binds; a class the classifier declined to call participant is
    // the caller's finding about the whole field, and no pattern match on its
    // name is entitled to reverse it.
    if (unwritableByRole.has(field.name)) {
      report.refused.push({ field: field.name, reason: "classified_unwritable_by_role", category: "role" });
      report.protectedFields.push({ field: field.name, category: "role" });
      continue;
    }

    const decision = decideBinding(
      { name: field.name, pdfType: field.type, effectiveLabel: field.effectiveLabel, regionHeading: field.regionHeading },
      { explicitMappings, captionOnly, availableChargeRows, documentAcceptsFill }
    );

    if (!decision.writable) {
      report.refused.push({ field: field.name, reason: decision.reason, category: decision.category ?? null,
        regionHeading: decision.regionHeading ?? null });
      if (decision.reason === "protected_category" || decision.reason === "protected_page_region" || decision.category === "type_guard") {
        report.protectedFields.push({ field: field.name, category: decision.category });
      }
      continue;
    }
    allowed.push({
      field, decision,
      name: field.name, factId: decision.factId, pdfType: field.type,
      page: field.widgets?.[0]?.page ?? 1, rect: field.widgets?.[0]?.rect ?? null
    });
  }

  const slots = selectOnePerSlot(allowed);
  for (const loser of slots.refused) {
    report.refused.push({ field: loser.name, reason: loser.reason, category: loser.category,
      factId: loser.factId, keptInstead: loser.keptInstead });
  }
  report.slotArbitration = { candidates: allowed.length, kept: slots.kept.length, refusedAsDuplicate: slots.refused.length };

  for (const { field, decision } of slots.kept) {
    const value = resolveFact(facts, decision.factId);
    if (!valueMatchesType(value, decision.valueType)) {
      report.refused.push({ field: field.name, reason: "no_value_or_type_mismatch", factId: decision.factId });
      continue;
    }

    let handle;
    try { handle = form.getField(field.name); } catch {
      report.refused.push({ field: field.name, reason: "field_not_present_in_form" });
      continue;
    }

    if (handle instanceof PDFDropdown) {
      const options = handle.getOptions?.() ?? [];
      const wanted = String(value).trim().toLowerCase();
      const match = options.find((o) => String(o).trim().toLowerCase() === wanted)
        ?? options.find((o) => String(o).trim().toLowerCase() === wanted.replace(/\s*county$/, ""));
      if (!match) {
        report.refused.push({ field: field.name, reason: "value_not_among_field_options", factId: decision.factId });
        continue;
      }
      handle.select(match);
      report.written.push({ field: field.name, factId: decision.factId, kind: "dropdown" });
      report.expectedValues.push(String(match));
      continue;
    }

    if (!(handle instanceof PDFTextField)) {
      report.refused.push({ field: field.name, reason: "non_text_field_type", category: "type_guard" });
      continue;
    }

    const rect = field.widgets?.[0]?.rect ?? null;
    const declaredMax = field.maxLength ?? null;
    let text = String(value);
    if (declaredMax && text.length > declaredMax) {
      // The form's own limit wins over any preference of ours.
      report.refused.push({ field: field.name, reason: "value_exceeds_form_max_length", maxLength: declaredMax, valueLength: text.length, factId: decision.factId });
      continue;
    }

    const fit = fitTextToWidget({
      font: helvetica,
      text,
      rect,
      multiline: field.multiline === true,
      maxFontSize,
      minFontSize
    });

    if (fit.outcome === "refused") {
      report.unfittable.push({ field: field.name, factId: decision.factId, ...fit });
      report.refused.push({ field: field.name, reason: fit.reason, category: "unfittable" });
      continue;
    }

    applyFitToTextField(handle, fit);
    report.written.push({
      field: field.name, factId: decision.factId, kind: "text",
      fontSize: fit.fontSize, outcome: fit.outcome, lines: fit.lines.length
    });
    report.expectedValues.push(text);
  }

  // A choice field nobody selected still carries the source document's own
  // chooser prompt, and flattening draws it onto the page as ordinary ink:
  // Nebraska's forms ship selected on "Choose the court" and "Choose the
  // county", so a filed pleading told the court to choose one.
  //
  // Clearing the value alone does not do it. pdf-lib leaves the widget's
  // existing appearance stream in place and the prompt renders from that, so
  // the stale appearance goes too and flatten regenerates from nothing. A
  // field this run WROTE is never touched here.
  const written = new Set(report.written.map((w) => w.field));
  report.promptsSuppressed = [];
  for (const handle of form.getFields()) {
    const name = handle.getName();
    if (written.has(name)) continue;
    if (typeof handle.getOptions !== "function" || typeof handle.getSelected !== "function") continue;
    let selected = [];
    let options = [];
    try { selected = handle.getSelected() ?? []; options = handle.getOptions() ?? []; } catch { continue; }
    if (!selected.some((value) => isChooserPrompt(value, options))) continue;
    handle.acroField.dict.delete(PDFName.of("V"));
    for (const widget of handle.acroField.getWidgets()) widget.dict.delete(PDFName.of("AP"));
    report.promptsSuppressed.push({ field: name, suppressed: selected });
  }

  // The fields this run actually bound. A chooser in this set was answered by
  // the participant; one outside it is still showing the court's own prompt.
  const { clean, report: sanitation } = await sanitizeAndFlatten(pdfDoc, {
    defaultFont: helvetica,
    writtenFields: new Set(report.written.map((w) => w.field)),
    // What each classified field's appearance means. The caller resolves this
    // for the family it is rendering and hands over a plain field-name map, so
    // the finalizer never learns which family it is working on.
    appearanceDispositions
  });
  report.sanitation = { ...sanitation, defaultAppearancesRepairedBeforeFill: defaultAppearancesRepaired };

  report.sourceMetadataFingerprint = sourceMetadataFingerprint(pdfDoc);
  report.metadataCarried = preserveSourceMetadata(pdfDoc, clean);
  report.participantInk = PARTICIPANT_INK_RGB;
  report.dates = carryDates(pdfDoc, clean);

  // Serialized without object streams so the residue scan can actually see
  // into the file it is judging.
  const bytes = await clean.save({ useObjectStreams: false, updateMetadata: false });
  report.metadataEmitted = await metadataOfBytes(bytes);
  report.metadataBranding = brandingInMetadata(report.metadataEmitted);
  if (report.metadataBranding.length > 0) {
    throw new Error(`refusing to emit: partner branding on a participant's official form (${report.metadataBranding.map((b) => b.field).join(", ")})`);
  }

  const residue = scanBytesForActiveContent(bytes);
  if (!residue.inspectable) {
    throw new Error("finalized artifact is not byte-inspectable: object streams would hide active-content residue");
  }
  if (residue.hits.length > 0) {
    throw new Error(`refusing to emit: active-content residue remains: ${residue.hits.join(", ")}`);
  }
  report.activeContentScan = residue;
  report.outputSha256 = crypto.createHash("sha256").update(bytes).digest("hex");
  report.outputBytes = bytes.length;
  return { bytes, report };
}
