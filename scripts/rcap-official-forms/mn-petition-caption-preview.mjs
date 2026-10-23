// Shared by the family CLI and the owned held-caption consumer. No filesystem or process mutation.
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { PDFDocument } from "pdf-lib";
import { extractTextItems } from "./rcap-pdf-anchor-capture.mjs";
import { rulesOfPage } from "./rcap-pdf-rule-lines.mjs";
import { finalizeFlatOverlay } from "./rcap-official-form-finalize.mjs";

export { MN_CAPTION_SOURCE_FILES } from "./mn-caption-source-files.mjs";

const PETITION = "mn_petition_609a02_subd3-primary-filing-1";
const PROOF_OF_SERVICE = "mn_petition_609a02_subd3-certificate-of-service-2";
const PROPOSED_ORDER = "mn_petition_609a02_subd3-proposed-order-3";
const INSTRUCTION_SHEET = "mn_petition_609a02_subd3-instructions-4";
const FEE_WAIVER = "mn_petition_609a02_subd3-fee-waiver-5";

export const MN_OFFICIAL_COMPONENTS = {
    [PETITION]: {
      sourceId: "official-form:EXP102",
      documentId: "EXP102",
      formNumber: "EXP102",
      officialTitle: "Notice of Hearing and Petition for Expungement (EXP102)",
      revision: "REV-2024-07",
      instrumentKind: "primary_filing",
      sha256: "c98430f1a9c7a6d399b7d01de1ef2eee0df5f0a1a07e89a703b307977d7bf541",
      acroform: false
    },
    [PROOF_OF_SERVICE]: {
      sourceId: "official-form:EXP104",
      documentId: "EXP104",
      formNumber: "EXP104",
      officialTitle: "Proof of Service (EXP104)",
      revision: "REV-2025-01",
      instrumentKind: "certificate_of_service",
      sha256: "0e776a93b61f28f38fc6b318a9f59b78de4e0cbec102236364cf59ab061b423c",
      acroform: false
    },
    [PROPOSED_ORDER]: {
      sourceId: "official-form:EXP105",
      documentId: "EXP105",
      formNumber: "EXP105",
      officialTitle: "Order Concerning Sealing/Expunging of Records (EXP105), Minn. Stat. § 609A.02, subd. 3",
      revision: "REV-2024-07",
      instrumentKind: "proposed_order",
      sha256: "754cd7a55b07409fe8752906d38dcccc45ab6a13cda5a3d7d061a689b837b4a0",
      acroform: false
    },
    [INSTRUCTION_SHEET]: {
      sourceId: "official-form:EXP101",
      documentId: "EXP101",
      formNumber: "EXP101",
      officialTitle: "Instructions for Expungement (EXP101)",
      revision: "REV-2024-07",
      instrumentKind: "instructions",
      sha256: "0ccdc99ec3cbb86300b00f5d93bf724d795541d426709f4e97708119d1b1c5de",
      acroform: false
    },
    [FEE_WAIVER]: {
      sourceId: "official-form:FEE102",
      documentId: "FEE102",
      formNumber: "FEE102",
      officialTitle: "Affidavit to Request Fee Waiver (FEE102), Minn. Stat. § 563.01",
      revision: "REV-2024-07",
      instrumentKind: "fee_waiver",
      sha256: "b8415cddaa06a9c76cf2c4949aee36efe22e3b0ba98783a74063094150c72da8",
      acroform: false
    }
  };

const RULE_TOLERANCE = 1.6;
const SPAN_OVERLAP = 0.55;
const CELL_INSET = 3;
const WRITE_BOX_LIFT = 3.5;
const CAPTION_CLEARANCE = 2.5;
const MIN_WRITE_BOX_HEIGHT = 7.5;
const MAX_WRITE_BOX_HEIGHT = 12;

/*
 * The second measured shape: a RULED BLANK.
 *
 * Not every official form draws a cell grid. Alaska's DPS CRI-103 draws a
 * printed caption followed by a single horizontal stroke, and there is no
 * vertical divider on either side of it — so the four-stroke cell test above
 * finds nothing and would report the whole form as geometry drift. The stroke
 * IS the measurement here: its own x and endX give the horizontal extent the
 * form intends for the value, and the value sits on it, which is why the
 * finalizer's protected-rule test is expressed in the same terms.
 *
 * The ceiling is still measured rather than assumed: the box stops a fixed
 * clearance below the lowest printed baseline that sits above this stroke
 * inside its own span, so a value can never be drawn over the caption of the
 * line above. Where nothing is printed above inside the span, the box takes
 * the maximum height and the fitter decides the rest.
 */
const BASELINE_ABOVE_RULE = 2;

function measureRuledBlank(page, cell) {
  const candidates = page.horizontal
    .filter((r) => Math.abs(r.y - cell.ruleY) <= RULE_TOLERANCE
      && Math.abs(r.x - cell.ruleFromX) <= RULE_TOLERANCE
      && Math.abs(r.endX - cell.ruleToX) <= RULE_TOLERANCE)
    .sort((a, b) => Math.abs(a.y - cell.ruleY) - Math.abs(b.y - cell.ruleY));
  const rule = candidates[0];
  if (!rule) return null;
  const boxBottom = rule.y + BASELINE_ABOVE_RULE;
  const above = page.items
    .filter((t) => String(t.text).trim() && t.x >= rule.x - 2 && t.x <= rule.endX + 2 && t.y > boxBottom + 2)
    .map((t) => t.y);
  const ceiling = above.length > 0 ? Math.min(...above) - CAPTION_CLEARANCE : boxBottom + MAX_WRITE_BOX_HEIGHT;
  const height = Number(Math.min(MAX_WRITE_BOX_HEIGHT, ceiling - boxBottom).toFixed(2));
  const writeBox = {
    x: Number((rule.x + CELL_INSET).toFixed(2)),
    y: Number(boxBottom.toFixed(2)),
    width: Number((rule.endX - rule.x - CELL_INSET * 2).toFixed(2)),
    height: Math.max(0, height)
  };
  return {
    writeBox,
    tooShallowToWriteIn: height < MIN_WRITE_BOX_HEIGHT,
    rectBasis:
      "measured_ruled_blank: one horizontal stroke read from the page content stream — the rule the value is "
      + "written on — matched on its own y, start x and end x against the pinned binary, with the box ceiling "
      + "taken from the lowest printed baseline above it inside its own span",
    measuredCell: {
      ruleY: rule.y, ruleFromX: rule.x, ruleToX: rule.endX,
      ruleThickness: rule.height ?? null,
      lowestPrintedBaselineAboveInsideSpan: above.length > 0 ? Math.min(...above) : null
    }
  };
}

export async function measureCells(bytes, cells) {
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  const pages = doc.getPages();
  const perPage = new Map();
  for (const [i, page] of pages.entries()) {
    const rules = await rulesOfPage(page);
    perPage.set(i + 1, {
      horizontal: rules.horizontal ?? [], vertical: rules.vertical ?? [],
      items: extractTextItems(page),
      size: page.getSize()
    });
  }
  const measured = [];
  const drift = [];
  for (const cell of cells) {
    const here = perPage.get(cell.page) ?? { horizontal: [], vertical: [], items: [] };
    if (Object.hasOwn(cell, "ruleY")) {
      const ruled = measureRuledBlank(here, cell);
      if (!ruled) {
        drift.push({
          cell: cell.key, page: cell.page, shape: "ruled_blank",
          expected: { ruleY: cell.ruleY, ruleFromX: cell.ruleFromX, ruleToX: cell.ruleToX },
          nearest: here.horizontal
            .filter((r) => Math.abs(r.y - cell.ruleY) <= 6)
            .map((r) => ({ y: r.y, x: r.x, endX: r.endX })).slice(0, 4)
        });
        continue;
      }
      measured.push({ ...cell, ...ruled, rect: ruled.writeBox });
      continue;
    }
    const cellHeight = cell.top - cell.bottom;
    const overlapOf = (v) => {
      const y0 = Number(v.y);
      const y1 = y0 + Number(v.height ?? 0);
      return Math.max(0, Math.min(y1, cell.top) - Math.max(y0, cell.bottom)) / cellHeight;
    };
    const hRule = (y) => here.horizontal
      .filter((r) => Math.abs(r.y - y) <= RULE_TOLERANCE)
      .sort((a, b) => Math.abs(a.y - y) - Math.abs(b.y - y))[0];
    const vRule = (x) => here.vertical
      .filter((v) => Math.abs(v.x - x) <= RULE_TOLERANCE && overlapOf(v) >= SPAN_OVERLAP)
      .sort((a, b) => overlapOf(b) - overlapOf(a))[0];
    const top = hRule(cell.top);
    const bottom = hRule(cell.bottom);
    const left = vRule(cell.left);
    const right = vRule(cell.right);
    if (!top || !bottom || !left || !right) {
      drift.push({
        cell: cell.key, page: cell.page,
        expected: { top: cell.top, bottom: cell.bottom, left: cell.left, right: cell.right },
        found: { top: top?.y ?? null, bottom: bottom?.y ?? null, left: left?.x ?? null, right: right?.x ?? null }
      });
      continue;
    }
    const printedInCell = here.items
      .filter((t) => String(t.text).trim() && t.x >= left.x - 2 && t.x <= right.x + 2 && t.y >= bottom.y - 1 && t.y <= top.y + 1)
      .sort((a, b) => b.y - a.y || a.x - b.x);
    const lowestPrintedLine = printedInCell.length > 0 ? Math.min(...printedInCell.map((t) => t.y)) : null;
    /*
     * Where in a measured cell the value sits.
     *
     * By default it sits on the cell's bottom rule, which is where a person
     * writing on paper puts it: the caption is printed at the top of the cell
     * and the line beneath is the line you write on.
     *
     * `writeUnderCaption` is for a TALL cell -- Alaska's DPS mailing-address
     * box is 80 points deep because it expects two or three lines -- where the
     * default would leave a single-line value floating sixty points below its
     * own caption. It places the box directly under the lowest printed line
     * inside the cell instead. BOTH rules are still measured, and the box is
     * still required to sit above the cell's own bottom rule; the flag moves
     * the value inside a measured cell and can never move it out of one.
     */
    const floor = bottom.y + WRITE_BOX_LIFT;
    const ceiling = lowestPrintedLine === null ? top.y - CAPTION_CLEARANCE : lowestPrintedLine - CAPTION_CLEARANCE;
    const boxBottom = cell.writeUnderCaption === true
      ? Math.max(floor, ceiling - MAX_WRITE_BOX_HEIGHT)
      : floor;
    const height = Number(Math.min(MAX_WRITE_BOX_HEIGHT, ceiling - boxBottom).toFixed(2));
    const writeBox = {
      x: Number((left.x + CELL_INSET).toFixed(2)),
      y: Number(boxBottom.toFixed(2)),
      width: Number((right.x - left.x - CELL_INSET * 2).toFixed(2)),
      height: Math.max(0, height)
    };
    measured.push({
      ...cell, writeBox, rect: writeBox,
      tooShallowToWriteIn: height < MIN_WRITE_BOX_HEIGHT,
      placedUnderCaption: cell.writeUnderCaption === true,
      sitsAboveTheCellsOwnBottomRule: boxBottom >= bottom.y,
      lowestPrintedLineInCell: lowestPrintedLine,
      rectBasis:
        "measured_table_cell: four strokes read from the page content stream — the rule above, the rule below, "
        + "and the vertical divider on each side, each re-checked against the pinned binary",
      measuredCell: {
        topRuleY: top.y, bottomRuleY: bottom.y, leftDividerX: left.x, rightDividerX: right.x,
        leftDividerCoversCell: Number(overlapOf(left).toFixed(4)),
        rightDividerCoversCell: Number(overlapOf(right).toFixed(4)),
        topRuleSpan: [top.x, top.endX], bottomRuleSpan: [bottom.x, bottom.endX]
      },
      printedTextInThisCell: printedInCell.slice(0, 10).map((t) => ({ x: Math.round(t.x), y: Math.round(t.y), extracted: t.text }))
    });
  }
  return { measured, drift, pageCount: pages.length };
}

const INK_TOLERANCE = 2.5;

async function itemsOfDocument(bytes) {
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  return doc.getPages().map((page) => extractTextItems(page).map((t) => ({
    x: t.x, y: t.y, text: String(t.text ?? ""), width: t.width ?? 0
  })));
}

const inkKey = (t) => `${Math.round(t.x)}|${Math.round(t.y)}|${t.text}`;
const insideBox = (t, box) =>
  t.x >= box.x - INK_TOLERANCE && t.x <= box.x + box.width + INK_TOLERANCE
  && t.y >= box.y - INK_TOLERANCE && t.y <= box.y + box.height + INK_TOLERANCE;

export async function auditOfficialInk(sourceBytes, outputBytes, boxes) {
  const source = await itemsOfDocument(sourceBytes);
  const output = await itemsOfDocument(outputBytes);
  const added = [];
  for (const [i, page] of output.entries()) {
    const before = new Map();
    for (const t of source[i] ?? []) before.set(inkKey(t), (before.get(inkKey(t)) ?? 0) + 1);
    for (const t of page) {
      const key = inkKey(t);
      const seen = before.get(key) ?? 0;
      if (seen > 0) { before.set(key, seen - 1); continue; }
      added.push({ page: i + 1, ...t });
    }
  }
  let glyphsOutsideMeasuredWriteBoxes = 0;
  const refusedFieldsWithInk = [];
  const written = boxes.filter((b) => b.written);
  const refused = boxes.filter((b) => !b.written);
  for (const t of added) {
    const glyphs = t.text.replace(/\s+/g, "").length;
    if (glyphs === 0) continue;
    /*
     * Ink is attributed to a WRITTEN box first, and ink a written box
     * accounts for is never also charged to a neighbour.
     *
     * AOC-CR-287 is why. Its petitioner block stacks four widgets 13pt tall
     * at 12pt intervals, so PetitionerAddr1 (y 667-680) and PetitionerAddr2
     * (y 655-668) OVERLAP by a point, and the street address drawn correctly
     * on line one has its origin inside line two's rectangle as well. Charged
     * to both, that reported a refused field carrying ink on a page where
     * nothing had gone wrong -- a false protected-write on a correct build,
     * which is the worst kind of finding because it teaches a reader to
     * distrust the counter.
     *
     * The real defect this test exists for survives the change intact: ink on
     * a refused blank that NO written box explains is still ink nobody
     * accounted for, and is still reported.
     */
    const explainedBy = written.filter((b) => b.page === t.page && insideBox(t, b.rect));
    if (explainedBy.length > 0) continue;
    glyphsOutsideMeasuredWriteBoxes += glyphs;
    for (const b of refused) {
      if (b.page === t.page && b.rect && insideBox(t, b.rect)) {
        refusedFieldsWithInk.push({ fieldId: b.key, drawnText: t.text, page: t.page });
      }
    }
  }
  return {
    addedTextItems: added.length,
    addedGlyphs: added.reduce((n, t) => n + t.text.replace(/\s+/g, "").length, 0),
    glyphsOutsideMeasuredWriteBoxes,
    refusedFieldsWithInk,
    method:
      "every text item of the finished document compared against the pinned source document's own items by "
      + "position and content; what remains is what this build added, and each added item is tested against "
      + "every measured box"
  };
}

// Exact-source county floors: EXP104 uses the bottom stroke of its boxed
// County caption. The other three are inline blanks; no widget is inferred.
const CAPTION_COUNTY_CELLS = {
  EXP102: { component: PETITION, ruleY: 655.2, ruleFromX: 123.2, ruleToX: 288 },
  EXP104: { component: PROOF_OF_SERVICE, ruleY: 663.96, ruleFromX: 67.8, ruleToX: 283.32 },
  EXP105: { component: PROPOSED_ORDER, ruleY: 681.6, ruleFromX: 123.2, ruleToX: 288 },
  FEE102: { component: FEE_WAIVER, ruleY: 661.2, ruleFromX: 125.4, ruleToX: 288 }
};

/** Bounded held preview, separate from runFamily and commercial rendering.
 * The existing published family/maps/fixtures stay untouched. */
export async function renderMnPetitionCaptionPreview({ documentId, sourceBytes, preparation, includeFeeWaiver = false }) {
  const cell = Object.hasOwn(CAPTION_COUNTY_CELLS, documentId) ? CAPTION_COUNTY_CELLS[documentId] : null;
  assert(cell && (documentId !== "FEE102" || includeFeeWaiver === true), "Minnesota caption component is not requested");
  const { mnPetitionCaptionFacts } = await import("../../src/lib/rcap/render/mn-petition-caption-facts.ts");
  const facts = mnPetitionCaptionFacts(preparation);
  const source = MN_OFFICIAL_COMPONENTS[cell.component];
  assert.equal(crypto.createHash("sha256").update(sourceBytes).digest("hex"), source.sha256, "Minnesota caption source bytes changed");
  const { measured, drift } = await measureCells(sourceBytes, [{ ...cell, key: "caption_county", page: 1 }]);
  assert.equal(drift.length, 0, "Minnesota caption source geometry changed");
  assert.equal(measured.length, 1);
  assert(!measured[0].tooShallowToWriteIn, "Minnesota county caption has no readable space");
  const result = await finalizeFlatOverlay({
    sourceBytes, expectedSha256: source.sha256,
    anchors: [{ label: "Caption - County", page: 1, writeBox: measured[0].writeBox,
      factId: "matter.county", protectedRules: [] }],
    explicitMappings: { "Caption - County": "matter.county" }, facts,
    documentTextLines: [], title: `MN ${documentId} held county-caption preview`
  });
  assert.equal(result.report.written.length, 1, "Minnesota county caption was refused");
  const ink = await auditOfficialInk(sourceBytes, result.bytes,
    [{ key: "caption_county", page: 1, rect: measured[0].writeBox, written: true }]);
  assert.equal(ink.glyphsOutsideMeasuredWriteBoxes, 0, "Minnesota preview wrote outside the county caption");
  assert.equal(ink.refusedFieldsWithInk.length, 0);
  return { ...result, ink, writeBox: measured[0].writeBox,
    status: "held_preview", authority: false, qualificationCheckboxExportAllowed: false };
}

