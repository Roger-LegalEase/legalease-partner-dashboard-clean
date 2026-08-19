// The rule lines a form actually draws, read from its content stream.
//
// Write boxes were first measured by rasterising the page and looking for long
// dark horizontal runs. That is lossy in exactly the way that matters. An
// independent review of Wisconsin CR-266 found the consequences: every measured
// baseline sat 1 to 3.4pt off its true rule, and the 77pt Case No. rule was
// missed entirely and replaced with a fabricated 213pt box -- wide enough that
// a long case number was drawn straight through the caption box's vertical
// divider and into the court-use cell beside it.
//
// The rectangles are in the content stream. A rule is a `re` operator with a
// hairline height and a usable length, and reading it gives exact coordinates
// instead of a threshold's opinion about them. Vertical dividers are read the
// same way, so a write box can be clipped to the cell it belongs to rather than
// running past it.
import zlib from "node:zlib";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { PDFDocument, PDFArray } = require("pdf-lib");

/** Decoded content stream text for one page, inflating where necessary. */
function pageContentText(pdfDoc, page) {
  const contents = page.node.Contents();
  if (!contents) return "";
  const streams = contents instanceof PDFArray
    ? contents.asArray().map((ref) => pdfDoc.context.lookup(ref))
    : [contents];
  let text = "";
  for (const stream of streams) {
    let raw = Buffer.from(stream.getContents());
    // Almost every real form arrives Flate-compressed; an uncompressed stream
    // simply fails to inflate and is used as-is.
    try { raw = zlib.inflateSync(raw); } catch { /* already flat */ }
    text += raw.toString("latin1");
  }
  return text;
}

/**
 * Every rule and divider the page draws.
 *
 * `maxThickness` keeps table borders and shading blocks out: a rule a
 * participant writes on is a hairline, not a filled rectangle. `minLength`
 * keeps out tick marks and the short segments that make up box corners.
 */
export async function ruleLinesOf(sourceBytes, { maxThickness = 3, minLength = 40 } = {}) {
  const pdfDoc = await PDFDocument.load(sourceBytes, { ignoreEncryption: true, updateMetadata: false });
  const pages = pdfDoc.getPages();
  const out = [];
  for (const [index, page] of pages.entries()) {
    const text = pageContentText(pdfDoc, page);
    const rects = [...text.matchAll(/(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s+re/g)]
      .map((m) => ({ x: Number(m[1]), y: Number(m[2]), width: Number(m[3]), height: Number(m[4]) }))
      .filter((r) => Number.isFinite(r.x) && Number.isFinite(r.y) && Number.isFinite(r.width) && Number.isFinite(r.height));

    const horizontal = rects
      .filter((r) => r.height > 0 && r.height <= maxThickness && r.width >= minLength)
      .map((r) => ({ ...r, endX: Number((r.x + r.width).toFixed(2)) }))
      .sort((a, b) => b.y - a.y);
    const vertical = rects
      .filter((r) => r.width > 0 && r.width <= maxThickness && r.height >= 20)
      .map((r) => ({ ...r, topY: Number((r.y + r.height).toFixed(2)) }))
      .sort((a, b) => a.x - b.x);

    out.push({ page: index + 1, horizontal, vertical });
  }
  return out;
}

/**
 * The rule a caption labels, and the x a write box may not pass.
 *
 * On a form whose captions sit below their rules, the rule belonging to a
 * caption is the nearest one above its baseline. `maxGap` stops a caption with
 * no rule of its own from adopting a distant one several fields away, which is
 * how a value ends up on someone else's line.
 */
export function ruleForCaption(ruleLines, { page, baselineY, labelX, maxGap = 14, sameFieldXTolerance = 60 }) {
  const onPage = ruleLines.find((p) => p.page === page);
  if (!onPage) return null;

  // Two layouts occur on the same form and both have to be handled. Most
  // captions sit BELOW the rule they label, so the rule is just above the
  // caption baseline. But an inline field -- "Case No. ______", "______
  // COUNTY" -- prints its words beside the rule, which then sits fractionally
  // BELOW the caption baseline. Searching only upwards finds nothing for those,
  // which is how the Case No. rule came to be missed and invented instead.
  // Vertical proximity alone is not enough. On this form the Case No. rule sits
  // 6.6pt from the Date of Birth caption and Date of Birth's own rule sits
  // 7.5pt away, so nearest-by-distance hands the date field the case-number
  // line -- on the far side of the page. The rule must also belong to this
  // label horizontally: it has to start at or near the label and still extend
  // past it.
  const rule = onPage.horizontal
    .filter((r) => Math.abs(r.y - baselineY) <= maxGap)
    .filter((r) => r.endX > labelX && r.x <= labelX + sameFieldXTolerance)
    .sort((a, b) => Math.abs(a.y - baselineY) - Math.abs(b.y - baselineY))[0] ?? null;
  if (!rule) return null;

  // The first divider to the right of the rule's start that actually spans this
  // part of the page. A write box must stop before it.
  const divider = onPage.vertical
    .filter((v) => v.x > rule.x && v.y <= rule.y && v.topY >= rule.y)
    .sort((a, b) => a.x - b.x)[0] ?? null;

  return {
    rule,
    dividerX: divider ? divider.x : null,
    // Never past the rule's own end, and never past a divider.
    maxRightEdge: divider ? Math.min(rule.endX, divider.x) : rule.endX
  };
}

/**
 * The rule a TRAILING caption labels: "______ COUNTY", "______ , Petitioner".
 *
 * Wisconsin's venue line prints the word COUNTY to the right of the blank it
 * names, so a search that requires the rule to extend past the label finds
 * nothing -- which is how the venue rule came to be omitted from CR-266
 * altogether, and a petition without a venue is not filed. Here the rule is the
 * one that ENDS at the label, on the same baseline.
 */
export function ruleBeforeCaption(ruleLines, { page, baselineY, labelX, maxGap = 14, endTolerance = 12 }) {
  const onPage = ruleLines.find((p) => p.page === page);
  if (!onPage) return null;

  const rule = onPage.horizontal
    .filter((r) => Math.abs(r.y - baselineY) <= maxGap)
    .filter((r) => r.endX <= labelX + 1 && r.endX >= labelX - endTolerance && r.x < labelX)
    .sort((a, b) => (labelX - a.endX) - (labelX - b.endX))[0] ?? null;
  if (!rule) return null;

  const divider = onPage.vertical
    .filter((v) => v.x > rule.x && v.y <= rule.y && v.topY >= rule.y)
    .sort((a, b) => a.x - b.x)[0] ?? null;

  return {
    rule,
    dividerX: divider ? divider.x : null,
    maxRightEdge: divider ? Math.min(rule.endX, divider.x) : rule.endX
  };
}
