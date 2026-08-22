// The rule lines a form actually draws, read from its content streams.
//
// Write boxes were first measured by rasterising the page and looking for long
// dark horizontal runs. That is lossy in exactly the way that matters. An
// independent review of Wisconsin CR-266 found the consequences: every measured
// baseline sat 1 to 3.4pt off its true rule, and the 77.16pt Case No. rule was
// missed entirely and replaced with a fabricated 213pt box — wide enough that a
// long case number was drawn straight through the caption box's vertical
// divider at x=464.26 and into the court-use cell beside it. The COUNTY venue
// rule was omitted altogether. A petition filed without a venue is not filed.
//
// The rectangles were in the content stream the whole time.
//
// GEOMETRY SOURCE. Content streams are the authoritative source of write-box
// geometry. Rasterised dark-line detection is visual evidence only and is never
// consulted here, in any fallback, under any condition. There is deliberately
// no raster path in this module to fall back to.
//
// The segments come from the shared anchor-capture walker — the same walk that
// reads the labels — so a rule and the caption beside it are measured in one
// coordinate space. That walker already tracks the graphics-state stack, the
// current transformation matrix and nested Form XObjects, so a rule authored
// inside an XObject or under a `cm` is reported where it is drawn rather than
// where it was written.
//
// This module is the reconciliation of two independent implementations. The
// content-stream walk, page-frame normalization, path-index grouping and the
// refusal-on-ambiguity contract come from the shared-contract lane. The
// separate `ruleBeforeCaption` entry point, and the trailing-caption layout it
// exists to serve, come from the problematic-PDF lane, which proved that
// behavior against the real CR-266 binary. Both are kept: the trailing layout
// is reachable through either entry point, and neither lane's callers had to
// change what they ask for.
import { createRequire } from "node:module";

import { extractPageGeometry, groupIntoLines } from "./rcap-pdf-anchor-capture.mjs";

const require = createRequire(import.meta.url);
const { PDFDocument } = require("pdf-lib");

/** Never "raster". Read by the verifier, and by anyone reasoning about drift. */
export const GEOMETRY_SOURCE = "content_stream";

/** The layouts a caption and its rule can be in, all of which occur on CR-266. */
export const ASSOCIATIONS = [
  "inline_rule_after_caption",
  "inline_rule_before_caption",
  "rule_above_or_below_caption"
];

const round = (n) => Number(n.toFixed(2));

/**
 * Page space, normalized.
 *
 * A page may carry a /Rotate and a /CropBox that differ from its /MediaBox, and
 * both move where a coordinate appears to a reader. Everything this module
 * returns is in PDF points relative to the visible box, with rotation applied,
 * so a caller never has to know which of the two a given form used.
 */
function pageFrame(page) {
  const media = page.getMediaBox();
  let box;
  try { box = page.getCropBox(); } catch { box = media; }
  const rotation = ((page.getRotation?.().angle ?? 0) % 360 + 360) % 360;
  return {
    rotation,
    mediaBox: { x: round(media.x), y: round(media.y), width: round(media.width), height: round(media.height) },
    cropBox: { x: round(box.x), y: round(box.y), width: round(box.width), height: round(box.height) }
  };
}

function normalizeRect(rect, frame) {
  const { cropBox: box, rotation } = frame;
  const x = rect.x - box.x;
  const y = rect.y - box.y;
  const w = rect.width;
  const h = rect.height;
  if (rotation === 90) return { x: box.height - (y + h), y: x, width: h, height: w };
  if (rotation === 180) return { x: box.width - (x + w), y: box.height - (y + h), width: w, height: h };
  if (rotation === 270) return { x: y, y: box.width - (x + w), width: h, height: w };
  return { x, y, width: w, height: h };
}

/**
 * Every rule and divider a page draws.
 *
 * `maxThickness` keeps table borders and shading blocks out: a rule a
 * participant writes on is a hairline, not a filled block. `minLength` keeps out
 * tick marks and the short segments that make up box corners.
 *
 * A thin filled rectangle is usually authored as several line segments rather
 * than one `re`, so segments painted together are reassembled by their shared
 * path index and measured as one shape.
 */
export function rulesOfPage(page, { maxThickness = 3, minLength = 40, minDividerLength = 20 } = {}) {
  const frame = pageFrame(page);
  const { paths } = extractPageGeometry(page);

  const byPath = new Map();
  for (const seg of paths) {
    const key = `${seg.stream}#${seg.pathIndex}`;
    if (!byPath.has(key)) byPath.set(key, []);
    byPath.get(key).push(seg);
  }

  const horizontal = [];
  const vertical = [];
  for (const [key, segments] of byPath) {
    const first = segments[0];
    const x1 = Math.min(...segments.map((s) => s.x));
    const y1 = Math.min(...segments.map((s) => s.y));
    const x2 = Math.max(...segments.map((s) => s.x + s.width));
    const y2 = Math.max(...segments.map((s) => s.y + s.height));
    const rect = normalizeRect({ x: x1, y: y1, width: x2 - x1, height: y2 - y1 }, frame);
    const record = {
      x: round(rect.x), y: round(rect.y),
      width: round(rect.width), height: round(rect.height),
      endX: round(rect.x + rect.width), topY: round(rect.y + rect.height),
      operator: first.operator,
      paintedBy: first.paintedBy,
      sourceStream: first.stream,
      pathKey: key,
      geometrySource: GEOMETRY_SOURCE
    };
    if (record.height <= maxThickness && record.width >= minLength) horizontal.push(record);
    else if (record.width <= maxThickness && record.height >= minDividerLength) vertical.push(record);
  }

  horizontal.sort((a, b) => b.y - a.y || a.x - b.x);
  vertical.sort((a, b) => a.x - b.x || b.y - a.y);
  return { ...frame, horizontal, vertical };
}

/** Every page's rules, from raw source bytes. */
export async function ruleLinesOf(sourceBytes, options = {}) {
  const pdfDoc = await PDFDocument.load(sourceBytes, { ignoreEncryption: true, updateMetadata: false });
  return pdfDoc.getPages().map((page, index) => ({ page: index + 1, ...rulesOfPage(page, options) }));
}

/** Every page's printed label lines, measured by the same walk. */
export async function captionLinesOf(sourceBytes) {
  const pdfDoc = await PDFDocument.load(sourceBytes, { ignoreEncryption: true, updateMetadata: false });
  return pdfDoc.getPages().map((page, index) => ({
    page: index + 1,
    lines: groupIntoLines(extractPageGeometry(page).text)
  }));
}

/**
 * The shared association core.
 *
 * `accept` names which layouts this call is willing to bind. Both public entry
 * points run the same constraints, the same refusals and the same evidence, so
 * a caption cannot be bound by one and refused by the other for any reason
 * other than the layout it is actually in.
 */
function associateRule(ruleLines, {
  page,
  baselineY,
  labelX,
  labelX2 = null,
  label = "",
  maxGap = 14,
  sameFieldXTolerance = 60,
  separationTolerance = 0.75,
  participantFallback = "leave blank and collect the value from the participant"
}, accept) {
  const onPage = ruleLines.find((p) => p.page === page);
  const base = {
    label,
    page,
    geometrySource: GEOMETRY_SOURCE,
    associationMethod: "horizontal_overlap_and_vertical_distance",
    acceptedAssociations: [...accept],
    participantFallback
  };
  if (!onPage) {
    return { bound: false, ...base, ambiguity: "no_such_page", candidatesConsidered: 0, confidence: "refused" };
  }

  const withinGap = onPage.horizontal.filter((r) => Math.abs(r.y - baselineY) <= maxGap);
  const scored = withinGap
    .map((rule) => {
      const labelRight = labelX2 ?? labelX;
      const overlapsLabel = rule.endX > labelX && rule.x <= labelX + sameFieldXTolerance;
      const startsAfterLabel = rule.x >= labelRight - 1 && rule.x <= labelRight + sameFieldXTolerance;
      // "________ COUNTY" — the rule finishes where the caption begins. An
      // upward-only search misses it, and so does a search that only allows a
      // rule to start after its label; CR-266's venue rule was omitted
      // altogether for exactly this reason, and a petition filed without a
      // venue is not filed.
      const endsAtLabel = rule.endX <= labelX + 1 && rule.endX >= labelX - sameFieldXTolerance;
      const association = startsAfterLabel
        ? "inline_rule_after_caption"
        : endsAtLabel
          ? "inline_rule_before_caption"
          : "rule_above_or_below_caption";
      return {
        rule,
        verticalDistance: round(Math.abs(rule.y - baselineY)),
        horizontalOverlap: overlapsLabel || startsAfterLabel || endsAtLabel,
        horizontalOffset: round(endsAtLabel ? rule.endX - labelX : rule.x - labelX),
        association
      };
    })
    .filter((candidate) => candidate.horizontalOverlap && accept.includes(candidate.association))
    .sort((a, b) => a.verticalDistance - b.verticalDistance || Math.abs(a.horizontalOffset) - Math.abs(b.horizontalOffset));

  const evidence = {
    ...base,
    candidatesConsidered: withinGap.length,
    candidatesAfterHorizontalConstraint: scored.length,
    candidates: scored.slice(0, 4).map((c) => ({
      x: c.rule.x, y: c.rule.y, width: c.rule.width, endX: c.rule.endX,
      operator: c.rule.operator, sourceStream: c.rule.sourceStream,
      verticalDistance: c.verticalDistance, horizontalOffset: c.horizontalOffset,
      association: c.association
    }))
  };

  if (scored.length === 0) {
    return { bound: false, ...evidence, ambiguity: "no_rule_satisfies_both_constraints", confidence: "refused" };
  }

  // Two candidates the constraints cannot separate is a refusal, not a coin
  // toss. This is the CR-266 defect's general form.
  if (scored.length > 1) {
    const [first, second] = scored;
    const separated = Math.abs(second.verticalDistance - first.verticalDistance) > separationTolerance
      || Math.abs(Math.abs(second.horizontalOffset) - Math.abs(first.horizontalOffset)) > separationTolerance;
    if (!separated) {
      return {
        bound: false,
        ...evidence,
        ambiguity: `two_rules_are_indistinguishable_for_this_caption at y=${first.rule.y} and y=${second.rule.y}`,
        confidence: "refused"
      };
    }
  }

  const chosen = scored[0];
  const rule = chosen.rule;

  // The first divider to the right of the rule's start that actually spans this
  // part of the page. A write box must stop before it.
  const divider = onPage.vertical
    .filter((v) => v.x > rule.x && v.y <= rule.y && v.topY >= rule.y)
    .sort((a, b) => a.x - b.x)[0] ?? null;

  return {
    bound: true,
    ...evidence,
    rule,
    dividerX: divider ? divider.x : null,
    // Never past the rule's own end, and never past a divider.
    maxRightEdge: divider ? round(Math.min(rule.endX, divider.x)) : rule.endX,
    verticalDistance: chosen.verticalDistance,
    horizontalOffset: chosen.horizontalOffset,
    association: chosen.association,
    confidence: scored.length === 1 ? "unambiguous" : "separated_by_constraint"
  };
}

/**
 * The rule a caption labels, the x a write box may not pass, and the evidence
 * for both.
 *
 * Two layouts occur on the same form and both have to be handled. Most captions
 * sit BELOW the rule they label. An inline field — "Case No. ______", "______
 * COUNTY" — prints its words beside a rule that sits fractionally BELOW the
 * caption baseline, which is why searching only upwards found nothing for those
 * two and the Case No. rule was invented instead.
 *
 * Vertical proximity alone is not enough and is never used alone. On CR-266 the
 * Case No. rule sits 6.6pt from the Date of Birth caption while Date of Birth's
 * own rule sits 7.5pt away, so nearest-by-distance hands the date field the
 * case-number line on the far side of the page. A candidate must satisfy BOTH a
 * vertical-distance constraint and a horizontal-overlap constraint.
 *
 * When two candidates remain that the constraints cannot separate, this REFUSES
 * rather than picking one. A refusal names the ambiguity, leaves the field
 * blank, and names the participant fallback. It never guesses, and it never
 * falls back to raster geometry, silently or otherwise.
 *
 * A refusal is an OBJECT carrying `bound: false`, not a null. A falsy refusal
 * is indistinguishable from "not asked", which is how a missing venue rule
 * passed review once already; a caller filters on `bound`, so the reason
 * survives to the report.
 */
export function ruleForCaption(ruleLines, options) {
  return associateRule(ruleLines, options, ASSOCIATIONS);
}

/**
 * The rule a TRAILING caption labels: "______ COUNTY", "______ , Petitioner".
 *
 * Wisconsin's venue line prints the word COUNTY to the right of the blank it
 * names, so a search that requires the rule to extend past the label finds
 * nothing — which is how the venue rule came to be omitted from CR-266
 * altogether, and a petition without a venue is not filed. Here the rule is the
 * one that ENDS at the label, on the same baseline.
 *
 * `ruleForCaption` already considers this layout, so calling both and taking
 * the nearer result — which is what the flat-overlay profile generator does —
 * stays correct and stays the proven behavior. This entry point remains because
 * it answers a narrower question: bind ONLY if the caption trails its rule.
 * Asking that question directly is how a venue field gets a venue rule instead
 * of whichever rule happened to be nearest.
 */
export function ruleBeforeCaption(ruleLines, options) {
  return associateRule(ruleLines, options, ["inline_rule_before_caption"]);
}
