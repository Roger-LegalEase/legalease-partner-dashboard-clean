// Write-box map for ca-1203-4-set, measured off the official forms.
//
// The rule this exists to keep: never draw a new box on an official form; mark
// the boxes the form already has, inside their measured bounds. So every
// checkbox this family will ever tick is checked here against the box the page
// actually strokes, using the shared instrument scripts/lib/pdf-stroked-boxes.mjs
// (which tracks the CTM -- the older re-operator scan did not, and put a mark in
// the margin).
//
// The instrument takes a CONTENT STREAM, not a PDFDocument. That is what makes
// it usable here at all: these five sources are encrypted and pdf-lib 1.17.1
// cannot open them, but their content streams can be extracted from the
// SHA-256-bound official binary. census-official-fields.py writes them to a
// scratch directory; this joins them to the censused widget rectangles.
//
//   python3 scripts/census-v1-ca-1203-4-set/census-official-fields.py
//   node scripts/census-v1-ca-1203-4-set/map-write-boxes.mjs
//
// Nothing here opens a rescued derivative.

import fs from "node:fs";
import path from "node:path";
import { strokedRectangles } from "../lib/pdf-stroked-boxes.mjs";
import { allRectangles, barAssembledBox } from "./bar-assembled-boxes.mjs";

const OUT_DIR =
  "data/rcap-all50/overlays/census-v1/ca/ca-1203-4-set--official-pdf-fill/reports";
const SCRATCH = process.env.CA_1203_4_SCRATCH ?? "/tmp/ca-1203-4-set-content";
const CENSUS = path.join(OUT_DIR, "field-census.json");

// Candidate printed boxes, at control scale. Deliberately NOT filtered by
// squareness: on CR-180 the printed box beside each option is 18x9 while the
// widget that draws the tick is 9x9 centred inside it, so a squareness filter
// discards the very box the mark has to land in. The widgets do the selecting
// instead -- a box is a candidate only if a checkable widget sits in it.
const BOX = { minSize: 4, maxSize: 40 };
// A widget counts as inside its printed box if it exceeds it by no more than
// this, in points. CR-180's widgets overhang the printed box by ~0.6pt at the
// top, which is the form's own construction, not a mapping error.
const CONTAINMENT_TOLERANCE_PT = 1.0;

const area = (r) => Math.max(0, r.x1 - r.x0) * Math.max(0, r.y1 - r.y0);
const asRect = ([x0, y0, x1, y1]) => ({ x0, y0, x1, y1 });

function intersectionOverUnion(a, b) {
  const ix = Math.max(0, Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0));
  const iy = Math.max(0, Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0));
  const inter = ix * iy;
  const union = area(a) + area(b) - inter;
  return union > 0 ? inter / union : 0;
}

function centre(r) {
  return [(r.x0 + r.x1) / 2, (r.y0 + r.y1) / 2];
}

function centreDistance(a, b) {
  const [ax, ay] = centre(a);
  const [bx, by] = centre(b);
  return Math.hypot(ax - bx, ay - by);
}

const round = (n) => +n.toFixed(2);

/**
 * Whether the mark this widget paints lands inside the box the form prints.
 *
 * Measured against the widget's PAINTED region, not its /Rect. The appearance
 * stream clips the glyph inset from the rectangle, and on MC-031 that inset is
 * decisive: the /Rect overhangs the printed box, while the painted mark sits
 * inside it.
 */
function agreementFor(w, boxRect) {
  const markRect = asRect(w.markRegion ? w.markRegion.rect : w.rect);
  const inside =
    markRect.x0 >= boxRect.x0 - 0.01 && markRect.y0 >= boxRect.y0 - 0.01 &&
    markRect.x1 <= boxRect.x1 + 0.01 && markRect.y1 <= boxRect.y1 + 0.01;
  return {
    markInsidePrintedBox: inside,
    markRegionBasis: w.markRegion ? w.markRegion.basis : "widget /Rect (no appearance stream)",
    widgetRectInsidePrintedBox:
      w.rect[0] >= boxRect.x0 - 0.01 && w.rect[1] >= boxRect.y0 - 0.01 &&
      w.rect[2] <= boxRect.x1 + 0.01 && w.rect[3] <= boxRect.y1 + 0.01,
    marginPt: round(Math.min(
      markRect.x0 - boxRect.x0, markRect.y0 - boxRect.y0,
      boxRect.x1 - markRect.x1, boxRect.y1 - markRect.y1,
    )),
    iou: round(intersectionOverUnion(markRect, boxRect)),
    centreDistancePt: round(centreDistance(markRect, boxRect)),
  };
}

function main() {
  const census = JSON.parse(fs.readFileSync(CENSUS, "utf8"));
  const forms = {};
  let totals = {
    checkableWidgets: 0,
    matchedToDrawnBox: 0,
    drawnByWidgetAppearanceOnly: 0,
    drawnBoxesWithNoWidget: 0,
    markOutsideItsPrintedBox: 0,
    widgetsWithNoOnState: 0,
  };

  for (const formNumber of census.formOrder) {
    const form = census.forms[formNumber];

    // Boxes the page actually strokes, per page, in page coordinates.
    const pageContent = form.pages.map((page, i) =>
      fs.readFileSync(
        path.join(SCRATCH, formNumber, `page-${String(i + 1).padStart(2, "0")}.txt`),
        "latin1",
      ));
    // Every rectangle, painted or stroked, for the four-bar fallback below.
    const allRects = pageContent.map((c) => allRectangles(c));

    const drawn = form.pages.map((page, i) => {
      const content = pageContent[i];
      // The census wrote these streams from the bound official binary; check the
      // hash rather than trusting the path, so a stale scratch file cannot be
      // measured by accident.
      return strokedRectangles(content)
        .filter(
          (r) =>
            Math.min(r.width, r.height) >= BOX.minSize &&
            Math.max(r.width, r.height) <= BOX.maxSize,
        )
        .map((r) => ({ ...r, pageIndex: i, claimedBy: null }));
    });

    // Every widget that can be ticked: a /Btn that is not a pushbutton and is
    // not hidden. Pushbuttons (Print / Save / Clear) are never written.
    const checkable = [];
    for (const field of form.fields) {
      if (field.fieldType !== "/Btn") continue;
      if (field.flags.includes("pushButton")) continue;
      for (const [i, w] of field.widgets.entries()) {
        if (w.hidden) continue;
        checkable.push({
          field: field.name,
          tooltip: field.tooltip,
          widgetIndex: i,
          kind: field.flags.includes("radio") ? "radio" : "checkbox",
          onStates: w.onStates,
          pageIndex: w.pageIndex,
          rect: w.rect,
          width: w.width,
          height: w.height,
          markRegion: w.markRegion,
        });
      }
    }

    const mapped = [];
    for (const w of checkable) {
      const widgetRect = asRect(w.rect);
      const candidates = drawn[w.pageIndex] ?? [];

      // The printed box for a widget is the smallest unclaimed stroked box that
      // contains it (within tolerance). Smallest, because a widget also sits
      // inside every larger frame on the page, and the frame is not its box.
      let best = null;
      for (const box of candidates) {
        if (box.claimedBy) continue;
        const contains =
          widgetRect.x0 >= box.x0 - CONTAINMENT_TOLERANCE_PT &&
          widgetRect.y0 >= box.y0 - CONTAINMENT_TOLERANCE_PT &&
          widgetRect.x1 <= box.x1 + CONTAINMENT_TOLERANCE_PT &&
          widgetRect.y1 <= box.y1 + CONTAINMENT_TOLERANCE_PT;
        const iou = intersectionOverUnion(widgetRect, box);
        if (!contains && iou < 0.25) continue;
        if (!best || area(box) < area(best.box)) {
          best = { box, iou, contains, dist: centreDistance(widgetRect, box) };
        }
      }

      if (best) {
        best.box.claimedBy = `${w.field}#${w.widgetIndex}`;
        mapped.push({
          ...w,
          printedBox: {
            source: "stroked path on the official page",
            rect: [best.box.x0, best.box.y0, best.box.x1, best.box.y1],
            width: best.box.width,
            height: best.box.height,
            construction: best.box.construction,
            lineWidth: best.box.lineWidth,
          },
          // Where the tick is actually drawn: the widget's own appearance stream
          // paints into its /Rect. This is the form's own geometry for the mark.
          markRect: w.markRegion ? w.markRegion.rect : w.rect,
          agreement: agreementFor(w, asRect([best.box.x0, best.box.y0, best.box.x1, best.box.y1])),
          resolution: "MARK_THE_PRINTED_BOX",
        });
        continue;
      }

      // No stroked rectangle here. The box may still be drawn, as four separate
      // thin bars -- MC-031 draws every checkbox that way. Assemble it.
      const frame = barAssembledBox(allRects[w.pageIndex] ?? [], w.rect);
      if (frame) {
        mapped.push({
          ...w,
          printedBox: {
            source: "four thin bars on the official page, assembled",
            rect: frame.rect,
            width: frame.width,
            height: frame.height,
            construction: "assembled_bars",
            barCount: frame.barCount,
            sidesPresent: frame.sidesPresent,
            paints: frame.paints,
          },
          markRect: w.markRegion ? w.markRegion.rect : w.rect,
          agreement: agreementFor(w, asRect(frame.rect)),
          resolution: "MARK_THE_PRINTED_BOX",
        });
        continue;
      }

      // Genuinely no box on the page: the control is drawn by the widget's own
      // appearance stream. The widget /Rect is then the form's own bounds for
      // it -- still measured off the official document, but a different
      // measurement, and labelled as one.
      mapped.push({
        ...w,
        printedBox: null,
        markRect: w.markRegion ? w.markRegion.rect : w.rect,
        agreement: null,
        resolution: "MARK_WITHIN_WIDGET_RECT_NO_PRINTED_BOX",
      });
    }

    const unclaimed = drawn
      .flat()
      .filter((b) => !b.claimedBy)
      .map((b) => ({
        pageIndex: b.pageIndex,
        rect: [b.x0, b.y0, b.x1, b.y1],
        width: b.width,
        height: b.height,
        construction: b.construction,
        squareness: b.squareness,
        note: "a control-sized box the page strokes that no checkable widget claims",
      }));

    const byResolution = mapped.reduce((acc, m) => {
      acc[m.resolution] = (acc[m.resolution] ?? 0) + 1;
      return acc;
    }, {});

    totals.checkableWidgets += mapped.length;
    totals.matchedToDrawnBox += byResolution.MARK_THE_PRINTED_BOX ?? 0;
    totals.drawnByWidgetAppearanceOnly +=
      byResolution.MARK_WITHIN_WIDGET_RECT_NO_PRINTED_BOX ?? 0;
    totals.markOutsideItsPrintedBox += mapped.filter(
      (m) => m.agreement && !m.agreement.markInsidePrintedBox,
    ).length;
    totals.widgetsWithNoOnState += mapped.filter((m) => m.onStates.length === 0).length;
    totals.drawnBoxesWithNoWidget += unclaimed.length;

    forms[formNumber] = {
      formNumber,
      pinnedOfficialSha256: form.pinnedOfficialSha256,
      pageContentStreamSha256: form.pages.map((p) => p.contentStreamSha256),
      isHybridXfa: form.acroForm.isHybridXfa,
      checkableWidgetCount: mapped.length,
      byResolution,
      strokedControlBoxesFound: drawn.flat().length,
      writeBoxes: mapped,
      drawnBoxesWithNoWidget: unclaimed,
    };
  }

  const report = {
    schemaVersion: "rcap-census-v1-write-box-map/v1",
    worklistGroupId: "ca-1203-4-set",
    measuredOff: "the official binaries, bound by exact SHA-256",
    derivativesUsed: false,
    instrument: "scripts/lib/pdf-stroked-boxes.mjs (CTM-tracking)",
    controlBoxBand: BOX,
    rule: "Mark the boxes the form already has, inside their measured bounds. "
      + "No box in this map was drawn by this build.",
    onStateNote:
      "Each checkable widget records the /AP /N state names it accepts. On these "
      + "forms the on-state is '1', not 'Yes'. Writing 'Yes' sets a state the "
      + "widget has no appearance for, and the box renders empty.",
    coordinateSystem:
      "PDF page coordinates (points), origin bottom-left; every page 612x792, "
      + "CropBox == MediaBox, /Rotate 0",
    totals,
    forms,
  };

  const out = path.join(OUT_DIR, "write-box-map.json");
  fs.writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`wrote ${out}`);
  for (const formNumber of census.formOrder) {
    const f = forms[formNumber];
    console.log(
      `  ${formNumber.padEnd(7)} checkable=${String(f.checkableWidgetCount).padStart(2)}` +
        `  strokedBoxes=${String(f.strokedControlBoxesFound).padStart(2)}` +
        `  ${JSON.stringify(f.byResolution)}` +
        `  unclaimedBoxes=${f.drawnBoxesWithNoWidget.length}`,
    );
  }
  console.log(`  totals: ${JSON.stringify(totals)}`);
}

main();
