#!/usr/bin/env node
// One control over where a flattened checkbox appearance lands.
//
//   node scripts/rcap-official-forms/test-widget-appearance-placement.mjs
//
// The form built here is not a fixture of any family. It is the SCA-C906
// spelling reproduced in eleven lines: a checkbox whose /N appearances -- the
// selected one and the unselected one alike -- carry a /BBox in absolute page
// coordinates and draw at absolute page coordinates, which is legal, common,
// and the exact spelling pdf-lib's PDFForm.flatten() mishandles by translating
// a second time.
//
// Three results, and the third is the one that makes the other two mean
// something: the same document flattened WITHOUT the correction must fail. A
// control that cannot fail is not evidence that the correction works.
import assert from "node:assert/strict";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

import { sanitizeAndFlatten } from "./rcap-active-content.mjs";
import { normalizeWidgetAppearancePlacement } from "./rcap-widget-appearance-placement.mjs";
import { misplacedFlattenedAppearances, sourceWidgetRects } from "./rcap-acroform-appearance-defect.mjs";

const require = createRequire(import.meta.url);
const { PDFDocument, PDFDict, PDFName } = require("pdf-lib");

const thisFile = fileURLToPath(import.meta.url);
process.chdir(path.resolve(path.dirname(thisFile), "..", ".."));

// The two rectangles are SCA-C906's own: SingleFelonyCB on page 1, which this
// route selects, and CurrentOrderCB1 on page 2, which it does not. The second
// is where the defect is worst -- twice 412.34 is 824.68, off the top of a
// 792pt page -- so an unselected box is not the easy case, it is the far one.
const SELECTED = { name: "SingleFelonyCB", x: 91.68, y: 324.91, width: 11.52, height: 11.52 };
const UNSELECTED = { name: "CurrentOrderCB1", x: 147.92, y: 412.34, width: 11.52, height: 11.52 };

/** The absolute-coordinate spelling, written the way the court's form writes it. */
function absoluteAppearance(context, box, checked) {
  const [x, y, width, height] = [box.x, box.y, box.width, box.height];
  const inner = `${(x + 0.5).toFixed(4)} ${(y + 0.5).toFixed(4)} ${(width - 1).toFixed(4)} ${(height - 1).toFixed(4)} re`;
  const mark = checked
    ? `BT\n0 0 0 rg\n1 0 0 1 ${(x + 1.9).toFixed(4)} ${(y + 2.6).toFixed(4)} Tm\n/F2 9.1524 Tf\n(4) Tj\nET\n`
    : "";
  const stream = context.stream(`0 G\n1 g\n1 w\n${inner}\nB*\n${mark}`, {
    Type: "XObject",
    Subtype: "Form",
    // Absolute page coordinates, and no /Matrix -- exactly SCA-C906.
    BBox: [x, y, x + width, y + height],
    Resources: context.obj({})
  });
  return context.register(stream);
}

async function buildSource() {
  const doc = await PDFDocument.create();
  const page = doc.addPage([612, 792]);
  const form = doc.getForm();
  for (const box of [SELECTED, UNSELECTED]) {
    const field = form.createCheckBox(box.name);
    field.addToPage(page, { x: box.x, y: box.y, width: box.width, height: box.height, borderWidth: 0 });
    if (box === SELECTED) field.check(); else field.uncheck();
  }
  form.updateFieldAppearances();
  // Replace every generated origin-relative /N with the court's spelling.
  for (const box of [SELECTED, UNSELECTED]) {
    const field = form.getCheckBox(box.name);
    for (const widget of field.acroField.getWidgets()) {
      const ap = widget.dict.lookupMaybe(PDFName.of("AP"), PDFDict);
      const normal = doc.context.lookup(ap.get(PDFName.of("N")));
      assert.ok(normal instanceof PDFDict, `${box.name}: expected an appearance sub-dictionary keyed by state`);
      for (const [state] of normal.entries()) {
        normal.set(state, absoluteAppearance(doc.context, box, state.toString() !== "/Off"));
      }
    }
  }
  return Buffer.from(await doc.save({ useObjectStreams: false, updateMetadata: false }));
}

/** The production flatten, with the placement correction switched on or off. */
async function flatten(sourceBytes, { correct }) {
  const doc = await PDFDocument.load(sourceBytes, { ignoreEncryption: true, updateMetadata: false });
  if (correct) normalizeWidgetAppearancePlacement(doc);
  const { clean } = await sanitizeAndFlatten(doc, { writtenFields: new Set([SELECTED.name]) });
  return Buffer.from(await clean.save({ useObjectStreams: false, updateMetadata: false }));
}

function landingOf(scan, box) {
  const placed = [...scan.misplaced.map((m) => ({ ...m, misplaced: true }))];
  const hit = placed.find((m) => m.sourceWidget.field === box.name);
  return hit ?? null;
}

async function main() {
  const sourceBytes = await buildSource();
  const rects = await sourceWidgetRects(sourceBytes);
  assert.equal(rects.length, 2, "the control form must declare exactly the two widgets it is about");

  const results = [];

  // --- 1 and 2: corrected ---------------------------------------------------
  const corrected = await flatten(sourceBytes, { correct: true });
  const afterCorrection = await misplacedFlattenedAppearances(corrected, rects);
  assert.equal(afterCorrection.unmatched, 0, "every flattened appearance must trace back to a widget of the control form");
  assert.equal(afterCorrection.matched, 2, "both appearances must survive the flatten and land on a source widget");
  assert.equal(afterCorrection.misplaced.length, 0,
    `corrected flatten still misplaces: ${JSON.stringify(afterCorrection.misplaced)}`);
  assert.equal(landingOf(afterCorrection, UNSELECTED), null);
  results.push({
    result: "an unselected widget remains correctly located",
    widget: UNSELECTED.name,
    sourceRect: { x: UNSELECTED.x, y: UNSELECTED.y },
    landsOn: { x: UNSELECTED.x, y: UNSELECTED.y },
    pass: true
  });
  results.push({
    result: "a selected widget is placed at the source widget coordinates",
    widget: SELECTED.name,
    sourceRect: { x: SELECTED.x, y: SELECTED.y },
    landsOn: { x: SELECTED.x, y: SELECTED.y },
    pass: true
  });

  // --- 3: the same document, uncorrected, must fail -------------------------
  const uncorrected = await flatten(sourceBytes, { correct: false });
  const withoutCorrection = await misplacedFlattenedAppearances(uncorrected, rects);
  assert.equal(withoutCorrection.misplaced.length, 2,
    "without the correction BOTH appearances must be misplaced; a control that cannot fail proves nothing");
  for (const box of [SELECTED, UNSELECTED]) {
    const hit = landingOf(withoutCorrection, box);
    assert.ok(hit, `${box.name} was expected to be misplaced without the correction`);
    assert.ok(Math.abs(hit.landsOn.x - box.x * 2) <= 0.05 && Math.abs(hit.landsOn.y - box.y * 2) <= 0.05,
      `${box.name} was expected at exactly twice its coordinates, not ${JSON.stringify(hit.landsOn)}`);
  }
  results.push({
    result: "the previous doubled-coordinate result fails",
    detected: withoutCorrection.misplaced.map((m) => ({
      widget: m.sourceWidget.field,
      belongsIn: { x: m.belongsIn.x, y: m.belongsIn.y },
      landsOn: { x: m.landsOn.x, y: m.landsOn.y },
      displacementPoints: m.displacementPoints
    })),
    pass: true
  });

  for (const entry of results) console.log(`PASS  ${entry.result}`);
  console.log(JSON.stringify({ control: "widget appearance placement", results }, null, 2));
}

await main();
