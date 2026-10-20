#!/usr/bin/env node
// readOutputGlyphs measures a flattened appearance against the pinned source's widget
// rectangles, by page. A widget annotation may omit /P (PDF 32000-1 12.5.2); the NY
// CPL 160.59 application does, and before the page-tree fallback every such appearance
// was read as placed on no page and therefore outside every write box.
//
//   node scripts/rcap-official-forms/test-output-glyph-reading-widget-parent.mjs
//
// Controls: an explicit /P still decides; a widget without /P on a valid page resolves
// to THAT page (the field sits on page 2, so a wrong page would refuse); a shifted
// appearance is still refused; no source still measures nothing.
import assert from "node:assert/strict";
import { PDFDocument, PDFName } from "pdf-lib";
import { readOutputGlyphs } from "./rcap-output-glyph-reading.mjs";

const doc = await PDFDocument.create();
doc.addPage([300, 300]);
const second = doc.addPage([300, 300]);
const form = doc.getForm();
const field = form.createTextField("Name");
field.setText("SYNTHETIC");
field.addToPage(second, { x: 20, y: 40, width: 120, height: 25 });
form.updateFieldAppearances();
const withParent = await doc.save();
for (const widget of field.acroField.getWidgets()) widget.dict.delete(PDFName.of("P"));
assert.equal(field.acroField.getWidgets()[0].dict.get(PDFName.of("P")), undefined, "control: /P removed");
const withoutParent = await doc.save();
form.flatten();
const output = await doc.save();

const explicit = await readOutputGlyphs(output, { sourceBytes: withParent });
assert.ok(explicit.addedGlyphsReadFromOutputBytes > 0, "the flattened appearance draws glyphs");
assert.equal(explicit.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes, 0, "explicit /P: placed at its own widget");
assert.equal(explicit.appearancesNotPlacedAtTheirOwnSourceWidget, 0);

const fallback = await readOutputGlyphs(output, { sourceBytes: withoutParent });
assert.deepEqual(fallback, explicit, "a widget without /P on page 2 resolves to page 2 and reads exactly as the explicit case");

const shiftedSource = await PDFDocument.load(withoutParent);
const widget = shiftedSource.getForm().getTextField("Name").acroField.getWidgets()[0];
const rect = widget.getRectangle();
widget.setRectangle({ ...rect, x: rect.x + 50 });
const shifted = await readOutputGlyphs(output, { sourceBytes: await shiftedSource.save() });
assert.ok(shifted.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes > 0, "a shifted appearance is still refused without /P");
assert.equal(shifted.appearancesNotPlacedAtTheirOwnSourceWidget, 1);

const unmeasured = await readOutputGlyphs(output);
assert.equal(unmeasured.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes, null, "no source: placement is not measured, not zero");

console.log(JSON.stringify({ status: "PASS", checks: 8, explicit, fallback, shifted, unmeasured }));
