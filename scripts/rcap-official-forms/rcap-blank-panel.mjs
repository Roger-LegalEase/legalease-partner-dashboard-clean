// Reads the BLANK rendering of a family out of its own committed contact sheet.
//
// A family package carries the court's blank form only as a picture: the
// binary itself lives in the Master Library, which is not in the repository.
// But the contact sheet embeds the blank -- sanitized and flattened exactly as
// the filed artifact is -- on the left of every page at a fixed scale and
// margin, so the blank's own page content is recoverable from bytes that are
// committed.
//
// That matters for two questions this lane has to answer without the source:
//
//   * what the form PRINTS, as opposed to what the renderer wrote. A string on
//     the filed page that is also on the blank arrived with the form; one that
//     is not is ours. NC AOC-CR-298 carries a records officer's name in an AOC
//     certification block, and until the two halves are separated every check
//     reads that name as clean because the renderer did not write it.
//   * what the caption and region channels would measure today. The channels
//     recorded in a family's classification were captured by an earlier reader;
//     re-measuring them needs the blank's geometry, not the filled artifact's.
//
// Nothing here reconstructs the source binary or stands in for it. The blank
// panel is a rendering, so it establishes what the form draws and where -- not
// the identity of the bytes it was drawn from.
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { extractTextItems, groupIntoLines, captureWidgetContext } from "./rcap-pdf-anchor-capture.mjs";
import { sanitizeAndFlatten } from "./rcap-active-content.mjs";

const require = createRequire(import.meta.url);
const { PDFDocument } = require("pdf-lib");

// The geometry buildContactSheet lays every page out with. Stated as constants
// there and mirrored here; the inverse is exact.
export const PANEL_SCALE = 0.62;
export const PANEL_MARGIN = 28;
const SHEET_HEADING = /blank \(left\) vs finalized fill/;

/** Maps one text item from sheet space back into the blank's own page space. */
const unscale = (item) => ({
  ...item,
  x: (item.x - PANEL_MARGIN) / PANEL_SCALE,
  y: (item.y - PANEL_MARGIN) / PANEL_SCALE,
  size: item.size / PANEL_SCALE,
  width: (item.width ?? 0) / PANEL_SCALE,
  // Every measurement a character carries, not just its position: the cell
  // splitter compares gaps against the character's own font size, and a size
  // left in sheet space made every threshold six-tenths of what it should be —
  // and made a 12-point section heading read as 7.4-point body text.
  chars: (item.chars ?? []).map((c) => ({
    ...c,
    x: (c.x - PANEL_MARGIN) / PANEL_SCALE,
    w: c.w / PANEL_SCALE,
    size: (c.size ?? item.size) / PANEL_SCALE
  }))
});

/**
 * Both panels of a family's contact sheet, page by page, in the source page's
 * own coordinates.
 *
 * Returns [{ page, blank: lines[], filled: lines[] }]. The filled panel is
 * returned in the same space for comparison; its x origin differs on the sheet
 * and is not corrected, because nothing compares the two by position.
 */
export async function readContactSheet(familyDir) {
  const sheet = path.join(familyDir, "contact-sheet/blank-vs-filled.pdf");
  if (!fs.existsSync(sheet)) return null;
  const doc = await PDFDocument.load(fs.readFileSync(sheet), { ignoreEncryption: true, updateMetadata: false });
  return doc.getPages().map((page, index) => {
    const { width } = page.getSize();
    const items = extractTextItems(page).filter((it) => !SHEET_HEADING.test(it.text));
    return {
      page: index + 1,
      blank: groupIntoLines(items.filter((it) => it.x < width / 2).map(unscale)),
      filled: groupIntoLines(items.filter((it) => it.x >= width / 2))
    };
  });
}

/** Just the blank half, which is what re-measurement needs. */
export async function blankPagesOf(familyDir) {
  const sheet = await readContactSheet(familyDir);
  return sheet ? sheet.map((p) => p.blank) : null;
}

/** Widget rectangles from a family's committed census, grouped by page. */
export function widgetsByPage(familyDir) {
  const censusPath = path.join(familyDir, "field-census.json");
  if (!fs.existsSync(censusPath)) return new Map();
  const census = JSON.parse(fs.readFileSync(censusPath, "utf8"));
  const byPage = new Map();
  for (const field of census.fields ?? []) {
    for (const widget of field.widgets ?? []) {
      if (!widget.page || !widget.rect) continue;
      if (!byPage.has(widget.page)) byPage.set(widget.page, []);
      byPage.get(widget.page).push({ name: field.name, rect: widget.rect });
    }
  }
  return byPage;
}

/**
 * What the caption and region channels measure for this family TODAY, off the
 * blank it committed.
 *
 * A field with widgets on more than one page keeps the first context measured
 * for it, matching the driver: the same field drawn twice is one field.
 */
export async function recaptureFieldContext(familyDir, pageSize = { width: 612, height: 792 }) {
  const pages = await blankPagesOf(familyDir);
  if (!pages) return null;
  const byPage = widgetsByPage(familyDir);
  const out = new Map();
  for (const [pageNumber, widgets] of [...byPage].sort((a, b) => a[0] - b[0])) {
    const lines = pages[pageNumber - 1];
    if (!lines) continue;
    const contexts = captureWidgetContext({ getSize: () => pageSize }, widgets,
      { precomputedLines: lines, isFirstPage: pageNumber === 1 });
    for (const context of contexts) if (!out.has(context.name)) out.set(context.name, { ...context, page: pageNumber });
  }
  return out;
}

const normalize = (text) => String(text).replace(/\s+/g, " ").trim();

/**
 * Every string the FILED artifact shows, split by where it came from.
 *
 * `sourceInherent` is on the blank as well, so the court printed it.
 * `participantDerived` is on the filed page and not on the blank, so this
 * platform put it there. The split is the evidence a protected-region check
 * needs: "the renderer did not write it" is not the same claim as "it is not
 * on the filed document", and a scan whose basis is the first cannot see a
 * name that arrives with the source and is made permanent by flattening.
 */
export async function attributePageText(familyDir, finalizedRelPath = "fixtures/canonical-filled.pdf") {
  const sheet = await readContactSheet(familyDir);
  if (!sheet) return null;
  const finalized = path.join(familyDir, finalizedRelPath);
  if (!fs.existsSync(finalized)) return null;
  const doc = await PDFDocument.load(fs.readFileSync(finalized), { ignoreEncryption: true, updateMetadata: false });

  return doc.getPages().map((page, index) => {
    const blankLines = new Set((sheet[index]?.blank ?? []).map((l) => normalize(l.text)));
    const lines = groupIntoLines(extractTextItems(page));
    const sourceInherent = [];
    const participantDerived = [];
    for (const line of lines) {
      const text = normalize(line.text);
      if (text === "") continue;
      (blankLines.has(text) ? sourceInherent : participantDerived)
        .push({ text, x: line.x, y: line.y, size: line.size });
    }
    return {
      page: index + 1,
      blankPanelAvailable: Boolean(sheet[index]),
      sourceInherent,
      participantDerived
    };
  });
}

/**
 * The same split, computed from the two binaries directly.
 *
 * `blankBytes` is the court's own form. It is sanitized and flattened first,
 * exactly as the filed artifact is, because much of what a form prints it
 * prints through field appearances -- Nebraska draws its statutory caption
 * that way -- and an unflattened blank would make the form's own words look
 * like ours.
 *
 * This is what a renderer can compute at render time; `attributePageText`
 * above is the same question answered later, from what a family committed.
 */
export async function attributeAgainstBlank(blankBytes, finalizedBytes) {
  const blankDoc = await PDFDocument.load(blankBytes, { ignoreEncryption: true, updateMetadata: false });
  const { clean } = await sanitizeAndFlatten(blankDoc);
  const flatBlank = await PDFDocument.load(await clean.save({ useObjectStreams: false, updateMetadata: false }),
    { ignoreEncryption: true, updateMetadata: false });
  const finalized = await PDFDocument.load(finalizedBytes, { ignoreEncryption: true, updateMetadata: false });

  const blankByPage = flatBlank.getPages()
    .map((page) => new Set(groupIntoLines(extractTextItems(page)).map((l) => normalize(l.text))));

  return finalized.getPages().map((page, index) => {
    const known = blankByPage[index] ?? new Set();
    const sourceInherent = [];
    const participantDerived = [];
    for (const line of groupIntoLines(extractTextItems(page))) {
      const text = normalize(line.text);
      if (text === "") continue;
      (known.has(text) ? sourceInherent : participantDerived).push({ text, x: line.x, y: line.y });
    }
    return { page: index + 1, sourceInherent, participantDerived };
  });
}
