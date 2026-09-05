/**
 * Measuring the blanks on a flat New Mexico rule form.
 *
 * WHY THIS EXISTS AND WHY `measureRuledBlank` IS NOT ENOUGH
 *
 * The factory's existing blank finder reads STROKED horizontal rules out of the
 * page content stream. That is the right reader for Colorado's JDF forms and
 * for Washington's vacatur set, and it finds almost nothing on a New Mexico
 * rule form: the Supreme Court's 4-95x set draws most of its blanks as runs of
 * the UNDERSCORE GLYPH inside the printed sentence, not as paths. On Form 4-951
 * NMRA a stroke reader finds 15 rules where the form has 71 blanks, and 10 of
 * those 15 strokes are not blanks at all.
 *
 * So four kinds of blank are measured here, all in one coordinate space, from
 * the same walker the rest of the factory uses:
 *
 *   underscore_run  contiguous U+005F glyphs on one baseline, taken from the
 *                   per-glyph x and advance `extractTextItems` reports. Runs
 *                   that abut across two text-showing operators are joined at a
 *                   1.2pt tolerance -- the forms break a single printed rule
 *                   across operators constantly -- and a run of fewer than
 *                   three glyphs is not a blank.
 *   stroke          a filled horizontal rectangle read by `rulesOfPage`, wide
 *                   enough to write on.
 *   bracket_box     a printed "[ ]" selection control, located from the
 *                   per-glyph positions of the bracket pair. The New Mexico
 *                   forms draw these as characters, so `checkboxCandidates`
 *                   finds no stroked box for them and there is no path
 *                   geometry to mark. They are located so they can be NAMED,
 *                   never so a mark can be invented on top of them.
 *   glyph_selection_control
 *                   a selection control drawn as a single symbol-font character
 *                   whose ToUnicode map yields a private-use codepoint. The
 *                   retained local orders draw every one of their tick boxes
 *                   this way -- twenty-eight on the identity-theft order and
 *                   thirty-eight on the conviction order -- and neither the
 *                   bracket reader nor the stroked-box reader can see any of
 *                   them. Only the glyph's own origin is trustworthy, so no
 *                   width is claimed and no write box is ever derived from one.
 *
 * AND WHY AN UNDERLINE IS NOT A BLANK
 *
 * New Mexico rule forms mark amended text by underlining and bracketing it. The
 * 2025 amendments to Form 4-951 underline ten runs of printed words. A reader
 * that took every stroke for a blank would place ten write boxes underneath the
 * form's own amendment marks -- on the heading of the petition, among other
 * places. A stroke carrying printed glyphs on it, at a baseline within 13pt
 * above the stroke and overlapping its x span, is therefore an underline of
 * printed text and is reported separately rather than as a blank.
 *
 * Nothing here classifies a blank or decides what may be written on one. It
 * measures, and the geometry it returns is the geometry a write box is derived
 * from.
 */
import { extractTextItems, groupIntoLines } from "../rcap-official-forms/rcap-pdf-anchor-capture.mjs";
import { rulesOfPage } from "../rcap-official-forms/rcap-pdf-rule-lines.mjs";

/** Two glyph runs closer than this on one baseline are one printed rule. */
export const RUN_JOIN_TOLERANCE = 1.2;
/** Fewer underscores than this is punctuation, not a place to write. */
export const MIN_RUN_GLYPHS = 3;
/** A stroke narrower than this is a tick, a border or a footnote mark. */
export const MIN_STROKE_WIDTH = 12;
/** A stroke thicker than this is a filled box, not a rule. */
export const MAX_STROKE_THICKNESS = 3;
/** Glyphs sitting this far above a stroke are sitting ON it. */
export const UNDERLINE_BASELINE_BAND = 13;
/**
 * How much of a stroke's own x span a printed glyph must cover before that
 * glyph counts as sitting ON the stroke.
 *
 * A blank almost always begins immediately after the caption that names it,
 * and on the retained local order the colon of "District Court case number:"
 * touches the left end of the rule the number goes on. With a bare
 * greater-than-zero test that touch made a write box into an amendment mark
 * and the blank disappeared from the map -- a field the packet must carry,
 * lost to a rounding-width overlap. A real underline covers the words above
 * it, not their last punctuation mark.
 */
export const UNDERLINE_MIN_OVERLAP = 2;
/** Baselines within this are the same baseline. */
export const BASELINE_TOLERANCE = 1.0;

const r2 = (n) => Number(n.toFixed(2));

/** Every underscore glyph on a page, as {x, w, y}. */
function underscoreGlyphs(items) {
  const out = [];
  for (const item of items) {
    for (const ch of item.chars ?? []) {
      if (ch.c === "_") out.push({ x: ch.x, w: ch.w, y: item.y });
    }
  }
  return out;
}

/** Contiguous underscore glyphs on one baseline, joined across operators. */
function underscoreRuns(items) {
  const byBaseline = new Map();
  for (const g of underscoreGlyphs(items)) {
    let key = null;
    for (const k of byBaseline.keys()) if (Math.abs(k - g.y) <= BASELINE_TOLERANCE) { key = k; break; }
    if (key === null) { key = g.y; byBaseline.set(key, []); }
    byBaseline.get(key).push(g);
  }
  const runs = [];
  for (const [y, glyphs] of byBaseline) {
    glyphs.sort((a, b) => a.x - b.x);
    let run = null;
    const flush = () => {
      if (run && run.glyphs >= MIN_RUN_GLYPHS) {
        runs.push({ kind: "underscore_run", y: r2(y), x: r2(run.x), endX: r2(run.endX), width: r2(run.endX - run.x), glyphs: run.glyphs });
      }
      run = null;
    };
    for (const g of glyphs) {
      if (run && g.x - run.endX <= RUN_JOIN_TOLERANCE) { run.endX = g.x + g.w; run.glyphs += 1; continue; }
      flush();
      run = { x: g.x, endX: g.x + g.w, glyphs: 1 };
    }
    flush();
  }
  return runs;
}

/**
 * Printed "[ ]" pairs, from the per-glyph positions of the brackets.
 *
 * A control is an EMPTY pair, and that is tested rather than approximated by
 * width. New Mexico's 2025 amendments renumbered the paragraphs of Form 4-951
 * and left the old numbers in brackets -- "[5.] 6.", "[6.] 7.", "[7.] 8." --
 * so a width threshold generous enough to admit "[ ]" also admits "[5.]", and
 * the form grows three selection controls it does not have, each one sitting
 * on an amendment mark. A pair with any non-space glyph between its brackets
 * is a citation or an amendment mark, never a box.
 */
function bracketBoxes(items) {
  const glyphs = [];
  for (const item of items) {
    for (const ch of item.chars ?? []) glyphs.push({ c: ch.c, x: ch.x, w: ch.w, y: item.y });
  }
  glyphs.sort((a, b) => b.y - a.y || a.x - b.x);
  const boxes = [];
  for (let i = 0; i < glyphs.length; i += 1) {
    const open = glyphs[i];
    if (open.c !== "[") continue;
    const close = glyphs.slice(i + 1).find((g) => Math.abs(g.y - open.y) <= BASELINE_TOLERANCE && g.c === "]");
    if (!close) continue;
    const between = glyphs.filter((g) => Math.abs(g.y - open.y) <= BASELINE_TOLERANCE
      && g.x >= open.x + open.w - 0.01 && g.x + g.w <= close.x + 0.01 && g.c !== "[" && g.c !== "]");
    if (between.some((g) => g.c.trim().length > 0)) continue;
    boxes.push({ kind: "bracket_box", y: r2(open.y), x: r2(open.x), endX: r2(close.x + close.w), width: r2(close.x + close.w - open.x) });
  }
  return boxes;
}

/**
 * Selection controls drawn as a symbol-font glyph rather than as "[ ]".
 *
 * The retained local order forms draw their tick boxes as a single Wingdings
 * character whose ToUnicode map yields nothing, so the text extractor reports
 * an item with empty text. `bracketBoxes` cannot see them and neither can
 * `checkboxCandidates`, which reads stroked paths. Twenty-eight of them carry
 * the whole findings-and-orders structure of the identity-theft order: every
 * "the applicant is entitled to...", every "GRANTED"/"DENIED", and the box in
 * front of the paragraph that would name an alleged identity thief. Leaving
 * them unmeasured would leave the most consequential controls on the document
 * out of the map entirely.
 *
 * Only the x ORIGIN of such a glyph is trustworthy -- it is the authored
 * position of its own show-text operator -- so no width is claimed for it and
 * no write box is ever derived from one. They are located so they can be named
 * and disposed, never so a mark can be invented on top of them.
 */
export const isUndecodableGlyph = (t) => {
  if ((t.chars ?? []).length !== 1) return false;
  const text = String(t.text ?? "");
  if (text.length !== 1) return false;
  const code = text.codePointAt(0);
  // Private Use Areas, where a symbol font's ToUnicode map leaves a dingbat.
  return (code >= 0xe000 && code <= 0xf8ff) || (code >= 0xf0000 && code <= 0x10fffd);
};

function glyphBoxes(items) {
  return items
    .filter(isUndecodableGlyph)
    .map((t) => ({ kind: "glyph_selection_control", y: r2(t.y), x: r2(t.x), endX: r2(t.x), width: 0, widthIsUnmeasurable: true }));
}

/** Horizontal strokes wide enough to write on, split into blanks and underlines. */
function strokes(page, items) {
  const { horizontal } = rulesOfPage(page, { maxThickness: MAX_STROKE_THICKNESS, minLength: MIN_STROKE_WIDTH, minDividerLength: 10_000 });
  const out = [];
  for (const rule of horizontal) {
    const sitting = items.filter((t) => {
      if (!(t.y >= rule.y && t.y - rule.y <= UNDERLINE_BASELINE_BAND)) return false;
      const overlap = Math.min(t.x + (t.width ?? 0), rule.endX) - Math.max(t.x, rule.x);
      if (overlap <= UNDERLINE_MIN_OVERLAP) return false;
      const text = String(t.text).trim();
      return text.length > 0 && !/^_+$/.test(text);
    });
    const printedTextSittingOnIt = sitting.length ? sitting.map((t) => t.text).join("").trim() : null;
    out.push({
      kind: "stroke", y: r2(rule.y), x: r2(rule.x), endX: r2(rule.endX), width: r2(rule.width),
      thickness: r2(rule.height), printedTextSittingOnIt,
      isUnderlineOfPrintedText: printedTextSittingOnIt !== null
    });
  }
  return out;
}

/**
 * Every blank on one page, and every stroke that is an underline instead.
 *
 * The printed context travels with each blank -- the line it sits on, the lines
 * above and below it, and the words immediately to its left -- because on a
 * flat form that context IS the field's label. There is no authored field name
 * to fall back on.
 */
export function measurePageBlanks(page, pageNumber) {
  const items = extractTextItems(page);
  const lines = groupIntoLines(items).map((l) => ({ y: r2(l.y), text: l.text }));
  const ordered = [...lines].sort((a, b) => b.y - a.y);

  const all = [...underscoreRuns(items), ...bracketBoxes(items), ...glyphBoxes(items), ...strokes(page, items)];
  /*
   * Whether this page's glyph x coordinates can be measured at all.
   *
   * `extractTextItems` reports `metricsExact` false when the font supplies no
   * widths and the walker has to fall back to the font size as the advance. On
   * Form 4-222 NMRA that is EVERY glyph of all 11,846 on the document: the
   * first glyph of each show-text operator sits at its authored position and
   * every glyph after it drifts, so by the end of a line the reported x is
   * nearly twice the truth. A blank measured out of those coordinates would be
   * a write box in the margin. The flag travels with the page so a caller can
   * refuse to derive geometry from it rather than discovering the drift in a
   * raster.
   */
  /*
   * Which blanks on this page have a trustworthy x, measured per BASELINE
   * rather than per page.
   *
   * `extractTextItems` reports `metricsExact` false when a font supplies no
   * widths and the walker falls back to the font size as the advance. Item
   * origins are computed by accumulating those advances along a line -- on Form
   * 4-951 the run at x=140.28 is 51pt wide and the next item begins at 191.4 --
   * so one bad advance early on a line shifts every glyph after it on that line
   * and nothing before it or on any other line.
   *
   * A whole-page flag was the first version of this and it was too blunt in
   * both directions. Form 4-953 page 3 prints five bullet characters, each in
   * its own show-text operator at an authored x=126, and each reports inexact
   * metrics because the bullet's width is not in the font; they sit on the five
   * lines of the statutory exclusions list, which carry no blanks at all, and a
   * page-level flag refused the page for them. Form 4-222 is the other
   * direction: every one of its 11,846 glyphs is inexact and by the end of a
   * line the reported x is nearly twice the truth, so nothing on it is
   * measurable and it must be refused.
   *
   * So the question is asked of each blank: is any glyph to the LEFT of it on
   * its own baseline positioned by a fallback advance? If so its x carries that
   * drift and no write box may be derived from it.
   */
  const driftBefore = (y, x) => items.some((t) =>
    Math.abs(t.y - y) <= BASELINE_TOLERANCE && t.x < x && t.metricsExact !== true);
  const decorate = (b) => {
    const idx = ordered.findIndex((l) => Math.abs(l.y - b.y) <= 2.4);
    const own = idx >= 0 ? ordered[idx] : null;
    const before = own
      ? items.filter((t) => Math.abs(t.y - own.y) <= 2.4 && t.x + (t.width ?? 0) <= b.x + 0.5)
        .sort((a, c) => a.x - c.x).map((t) => t.text).join("").trim()
      : "";
    return {
      key: `p${pageNumber}-y${String(Math.round(b.y * 100))}-x${String(Math.round(b.x * 100))}`,
      page: pageNumber, ...b,
      printedTextSittingOnIt: b.printedTextSittingOnIt ?? null,
      isUnderlineOfPrintedText: b.isUnderlineOfPrintedText === true,
      printedLine: own ? own.text : "",
      printedLineAbove: idx > 0 ? ordered[idx - 1].text : "",
      printedLineBelow: idx >= 0 && idx < ordered.length - 1 ? ordered[idx + 1].text : "",
      printedTextImmediatelyBefore: before
    };
  };

  const decorated = all.map(decorate).sort((a, b) => b.y - a.y || a.x - b.x);
  // A stable ordinal within the baseline, so a blank on a page whose absolute x
  // cannot be measured still has an identity. The scaling that makes the
  // absolute coordinate wrong is monotonic, so the ORDER of blanks along a line
  // survives it even where the position does not.
  const seen = new Map();
  for (const b of decorated) {
    b.xIsMeasurable = b.kind === "stroke" || !driftBefore(b.y, b.x);
    const k = `${b.page}-${Math.round(b.y * 100)}`;
    const n = (seen.get(k) ?? 0) + 1;
    seen.set(k, n);
    b.ordinalOnBaseline = n;
    b.baselineKey = `p${pageNumber}-y${Math.round(b.y * 100)}-n${n}`;
  }
  const blanksHere = decorated.filter((b) => !b.isUnderlineOfPrintedText);
  return {
    page: pageNumber,
    lines,
    glyphMetricsExact: blanksHere.length === 0 || blanksHere.every((b) => b.xIsMeasurable),
    blanksWithUnmeasurableX: blanksHere.filter((b) => !b.xIsMeasurable)
      .map((b) => ({ key: b.key, kind: b.kind, y: b.y, printedLine: b.printedLine })),
    blanks: decorated.filter((b) => !b.isUnderlineOfPrintedText),
    underlinesOfPrintedText: decorated.filter((b) => b.isUnderlineOfPrintedText)
  };
}

/** Every page of one document. */
export function measureDocumentBlanks(pdfDoc) {
  return pdfDoc.getPages().map((page, i) => measurePageBlanks(page, i + 1));
}
