#!/usr/bin/env node
// Controls over the BORDER pdf-lib SYNTHESIZES from a widget's /MK for a field
// the packet does not write.
//
//   node scripts/grade-a-packet-factory-24h/test-synthesized-widget-borders.mjs
//
// Its two siblings, which it is written in the pattern of, live beside the
// module under test:
//
//   scripts/rcap-official-forms/test-synthesized-off-appearances.mjs   (FIX50)
//   scripts/rcap-official-forms/test-appearance-fit-to-rect.mjs        (FIX61)
//
// THE DEFECT. `/MK /BC` is a widget's border colour and `/MK /BG` its
// background colour. Under ISO 32000-1 12.5.6.19 both are appearance
// CHARACTERISTICS: a viewer consults them only when it has to construct an
// appearance for itself, and a widget that ships its own `/AP /N` is drawn from
// that stream with its `/MK` never read. pdf-lib's default providers read `/MK`
// unconditionally whenever they regenerate. So wherever sanitizeAndFlatten
// leaves an unwritten field without a usable appearance -- by clearing one on
// the unwritten-input drop, or because the source shipped none --
// form.updateFieldAppearances() paints a stroked rectangle the size of the
// widget and flatten() stamps it on the filing as ordinary ink.
//
// The measured instance is Colorado's JDF 641, and VF02 measured it: choice
// widgets 9B.0, 9B.2 and 9C.0 on page 4, three participant elections the packet
// deliberately leaves unmade, each carrying /MK /BC [0 0 0] and each nested
// below an AcroForm root so the drop cannot detach it. Delivered as 8,344 dark
// pixels of black rectangle per fixture at 300 dpi that the Colorado Judicial
// Department's form does not print -- over the top of the one rule it does
// print there, which the widget's own 29-byte appearance draws.
//
// The documents built here are not fixtures of any family. Each is that
// spelling in a few lines, and each isolates one case the option must treat
// differently:
//
//   A  a text field with /MK /BC and NO /AP, unwritten   -> the defect
//   B  a chooser with /MK /BC and a SILENT source /AP    -> keep the court's rule
//   C  the same widget spelling but WRITTEN              -> not a byte moves
//   D  a chooser whose source /AP shows a PROMPT         -> still dropped whole
//
// Measured as INK, not as a report count: every page is rastered with pdftoppm
// and the dark pixels inside the widget's own rectangle are counted. A report
// that says an entry was removed is not evidence that the page is clean.
// Rasters are written under the OS temp directory and deleted after measuring.
//
// The control that makes the others mean anything is the negative one: with the
// option OFF, cases A and B must still show the stroke. A test that passes
// either way is testing nothing.
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const { sanitizeAndFlatten } = await import(
  path.join(HERE, "..", "rcap-official-forms", "rcap-active-content.mjs"));

const require = createRequire(import.meta.url);
const { PDFDocument, PDFName, PDFRawStream } = require("pdf-lib");

const PAGE = { width: 300, height: 200 };
const RECT = { x: 40, y: 120, width: 160, height: 14.1092 };
const DPI = 300;

/** One appearance stream, drawn in the widget's own BBox coordinates. */
function appearanceStream(context, content) {
  const bytes = new TextEncoder().encode(content);
  const dict = context.obj({
    Type: "XObject",
    Subtype: "Form",
    FormType: 1,
    BBox: context.obj([0, 0, RECT.width, RECT.height]),
    Matrix: context.obj([1, 0, 0, 1, 0, 0]),
    Resources: context.obj({ ProcSet: context.obj(["PDF"]) }),
    Length: bytes.length
  });
  return context.register(PDFRawStream.of(dict, bytes));
}

/**
 * What JDF 641's own widgets draw where the packet leaves the answer to the
 * participant: one rule along the bottom of the box, and no word.
 */
const SILENT_RULE = `0 G\n0 0.5 m\n${RECT.width - 0.1} 0.5 l\ns\n`;
/**
 * What the six correctly-boxed `/MK /BC` widgets on that same Pennsylvania page
 * ship: a stroked rectangle, which is what the default solid style declares.
 */
const SOURCE_BOX = `0 G\n0.5 0.5 ${RECT.width - 1} ${RECT.height - 1} re\ns\n`;
/** The one field name every probe uses, as the set the finalizer takes. */
const WRITTEN = new Set(["the.field"]);
/** What a chooser still showing the court's prompt draws. */
const PROMPT = `${SILENT_RULE}/Tx BMC\nq\nBT\n/Helv 9 Tf\n0 g\n2 3.6 Td\n(Choose the court) Tj\nET\nQ\nEMC\n`;

/**
 * A one-page document carrying one field with `/MK /BC [0 0 0]` at RECT.
 *
 * `kind` picks the field type, because the two halves of the remedy are reached
 * through different dispositions: a text field is PRESERVE_SOURCE_APPEARANCE
 * and never dropped, a chooser is RENDER_PARTICIPANT_VALUE_ONLY_WHEN_WRITTEN
 * and is dropped when unwritten. `appearance` is the stream the source ships,
 * or null for a source that ships none.
 */
async function probe({ kind, appearance = null, value = null, borderStyle = null, borderColor = [0, 0, 0] }) {
  const doc = await PDFDocument.create();
  const page = doc.addPage([PAGE.width, PAGE.height]);
  const form = doc.getForm();
  const field = kind === "chooser" ? form.createDropdown("the.field") : form.createTextField("the.field");
  if (kind === "chooser") field.addOptions(["A", "B"]);
  if (value !== null) field.select ? field.select(value) : field.setText(value);
  field.addToPage(page, { x: RECT.x, y: RECT.y, width: RECT.width, height: RECT.height, borderWidth: 0 });

  const [widget] = field.acroField.getWidgets();
  // The source's own characteristics, replacing whatever pdf-lib's builder set:
  // a black border and no background, exactly as JDF 641 ships them.
  const mk = doc.context.obj({});
  if (borderColor !== null) mk.set(PDFName.of("BC"), doc.context.obj(borderColor));
  widget.dict.set(PDFName.of("MK"), mk);
  // The border STYLE, which says WHERE that colour is painted. Set explicitly
  // or removed explicitly, never left to whatever pdf-lib's widget builder put
  // there, or the case under test would not be the case described.
  if (borderStyle === null) widget.dict.delete(PDFName.of("BS"));
  else {
    const bs = doc.context.obj({});
    bs.set(PDFName.of("S"), PDFName.of(borderStyle.S));
    if (borderStyle.W !== undefined) bs.set(PDFName.of("W"), doc.context.obj(borderStyle.W));
    widget.dict.set(PDFName.of("BS"), bs);
  }
  if (appearance === null) widget.dict.delete(PDFName.of("AP"));
  else {
    const ap = doc.context.obj({});
    ap.set(PDFName.of("N"), appearanceStream(doc.context, appearance));
    widget.dict.set(PDFName.of("AP"), ap);
  }
  return doc;
}

async function finalize(doc, { writtenFields = new Set(), suppressSynthesizedWidgetBorders = false,
  honorWidgetBorderStyle = false } = {}) {
  const { clean, report } = await sanitizeAndFlatten(doc,
    { writtenFields, suppressSynthesizedWidgetBorders, honorWidgetBorderStyle });
  // Pinned, so a byte comparison measures the page and not the clock.
  const stamp = new Date("2026-01-01T00:00:00Z");
  clean.setCreationDate(stamp);
  clean.setModificationDate(stamp);
  clean.setProducer("");
  return { bytes: Buffer.from(await clean.save({ useObjectStreams: false, updateMetadata: false })), report };
}

/**
 * Dark pixels inside the widget's own rectangle, and how many of them sit in
 * the top four fifths of it.
 *
 * The split matters: the court's rule lies along the bottom edge, so a count
 * that only says "some ink" cannot tell a preserved rule from a stamped box.
 * Everything above the bottom fifth of the rect is border the form does not
 * print.
 */
function inkInWidgetRect(bytes, label) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "fix80-test-"));
  try {
    const pdf = path.join(dir, `${label}.pdf`);
    fs.writeFileSync(pdf, bytes);
    execFileSync("pdftoppm", ["-r", String(DPI), "-gray", "-f", "1", "-l", "1", pdf, path.join(dir, "page")]);
    const [pgm] = fs.readdirSync(dir).filter((f) => f.endsWith(".pgm")).map((f) => path.join(dir, f));
    assert.ok(pgm, `pdftoppm produced no raster for ${label}`);
    const raw = fs.readFileSync(pgm);
    const header = raw.subarray(0, 64).toString("latin1");
    const m = /^P5\s+(\d+)\s+(\d+)\s+(\d+)\s/.exec(header);
    assert.ok(m, `unreadable PGM header for ${label}: ${JSON.stringify(header.slice(0, 24))}`);
    const [width, height, offset] = [Number(m[1]), Number(m[2]), m[0].length];
    const s = DPI / 72;
    const pad = 3;
    const x0 = Math.max(0, Math.floor(RECT.x * s) - pad);
    const x1 = Math.min(width - 1, Math.ceil((RECT.x + RECT.width) * s) + pad);
    const y0 = Math.max(0, Math.floor((PAGE.height - RECT.y - RECT.height) * s) - pad);
    const y1 = Math.min(height - 1, Math.ceil((PAGE.height - RECT.y) * s) + pad);
    // The bottom fifth of the rect, in raster rows: the band the court's rule
    // is drawn in.
    const ruleBand = Math.ceil((PAGE.height - RECT.y - RECT.height * 0.2) * s);
    // Two bands a stroked rectangle fills and an underline never touches, and
    // which the participant's own value cannot reach either: the leftmost
    // 1.2pt of the rect, inside the 2pt of padding pdf-lib insets its text by,
    // and the topmost 1.2pt. Measured separately from `aboveTheRule`, which a
    // written value fills legitimately.
    const edge = Math.max(1, Math.round(1.2 * s));
    const leftEdgeX = Math.floor(RECT.x * s) + edge;
    const topEdgeY = Math.floor((PAGE.height - RECT.y - RECT.height) * s) + edge;
    // The bottom 1.2pt: where the underline the style declares is drawn.
    const ruleBandY = Math.ceil((PAGE.height - RECT.y) * s) - edge;
    let dark = 0;
    let aboveTheRule = 0;
    let leftEdge = 0;
    let topEdge = 0;
    let ruleBandInk = 0;
    for (let y = y0; y <= y1; y += 1) {
      for (let x = x0; x <= x1; x += 1) {
        if (raw[offset + y * width + x] >= 200) continue;
        dark += 1;
        if (y < ruleBand) aboveTheRule += 1;
        if (x < leftEdgeX && y > topEdgeY && y < ruleBandY) leftEdge += 1;
        if (y < topEdgeY) topEdge += 1;
        if (y >= ruleBandY) ruleBandInk += 1;
      }
    }
    return { dark, aboveTheRule, leftEdge, topEdge, ruleBand: ruleBandInk };
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

/** The text a reader gets off the delivered page, read with poppler. */
function pdfText(bytes) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "fix85-text-"));
  try {
    const pdf = path.join(dir, "page.pdf");
    fs.writeFileSync(pdf, bytes);
    return execFileSync("pdftotext", ["-layout", pdf, "-"], { encoding: "utf8" });
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

const results = [];
const control = (name, detail) => { results.push({ control: name, ...detail, pass: true }); console.log(`PASS  ${name}`); };

async function main() {
  // ---- A. the required construction: /MK /BC and no /AP at all ---------------
  const noApOff = await finalize(await probe({ kind: "text" }));
  const noApOn = await finalize(await probe({ kind: "text" }), { suppressSynthesizedWidgetBorders: true });
  const noApInkOff = inkInWidgetRect(noApOff.bytes, "a-off");
  const noApInkOn = inkInWidgetRect(noApOn.bytes, "a-on");

  assert.ok(noApInkOff.dark > 0,
    "NEGATIVE CONTROL FAILED: with the option off no border is synthesized, so this test proves nothing");
  control("1-with-the-option-off-an-unwritten-widget-with-MK-BC-and-no-AP-is-delivered-as-a-stroked-rectangle", {
    darkPixelsInWidgetRect: noApInkOff.dark,
    synthesizedBy: "pdf-lib defaultTextFieldAppearanceProvider via form.updateFieldAppearances(), reading /MK /BC"
  });

  assert.equal(noApInkOn.dark, 0,
    `with the option on the widget rect still carries ${noApInkOn.dark} dark pixels`);
  control("2-with-the-option-on-the-same-widget-flattens-to-zero-ink-at-its-rect", {
    darkPixelsInWidgetRect: noApInkOn.dark,
    wasBefore: noApInkOff.dark,
    matchesAConformingViewer: "ISO 32000-1 12.5.6.19: /MK is consulted only to CONSTRUCT an appearance, and a "
      + "widget carrying no value has nothing to show"
  });

  assert.equal(noApOn.report.widgetContributions.synthesizedBorderCharacteristicsRemoved, 1,
    "the report does not record the one /MK entry removed");
  assert.equal(noApOff.report.widgetContributions.synthesizedBorderCharacteristicsRemoved, 0,
    "the option is off, so no /MK entry may be removed");
  control("3-the-count-is-reported-per-document-and-is-zero-when-the-option-is-off", {
    withOptionOn: noApOn.report.widgetContributions.synthesizedBorderCharacteristicsRemoved,
    withOptionOff: noApOff.report.widgetContributions.synthesizedBorderCharacteristicsRemoved
  });

  // ---- B. the court's own silent rule survives -------------------------------
  const ruleOff = await finalize(await probe({ kind: "chooser", appearance: SILENT_RULE }));
  const ruleOn = await finalize(await probe({ kind: "chooser", appearance: SILENT_RULE }),
    { suppressSynthesizedWidgetBorders: true });
  const ruleInkOff = inkInWidgetRect(ruleOff.bytes, "b-off");
  const ruleInkOn = inkInWidgetRect(ruleOn.bytes, "b-on");

  assert.ok(ruleInkOff.aboveTheRule > 0,
    "NEGATIVE CONTROL FAILED: with the option off no box is stamped above the rule, so this test proves nothing");
  assert.equal(ruleInkOn.aboveTheRule, 0,
    `with the option on ${ruleInkOn.aboveTheRule} dark pixels remain above the rule band`);
  assert.ok(ruleInkOn.dark > 0, "the court's own rule was lost as well as the box, which is a different defect");
  assert.deepEqual(ruleOn.report.widgetContributions.silentSourceAppearancesKept, ["the.field"]);
  assert.deepEqual(ruleOff.report.widgetContributions.unselectedChoicesDropped, ["the.field"]);
  control("4-a-chooser-whose-source-appearance-draws-only-a-rule-keeps-that-rule-and-loses-the-box", {
    withOptionOff: { darkPixelsInWidgetRect: ruleInkOff.dark, aboveTheRuleBand: ruleInkOff.aboveTheRule },
    withOptionOn: { darkPixelsInWidgetRect: ruleInkOn.dark, aboveTheRuleBand: ruleInkOn.aboveTheRule },
    covering: "the delivered page draws what the pinned form draws at that widget, and nothing else"
  });

  // ---- C. a written field is not touched at all ------------------------------
  const writtenOff = await finalize(await probe({ kind: "text", value: "Jordan Reyes" }),
    { writtenFields: new Set(["the.field"]) });
  const writtenOn = await finalize(await probe({ kind: "text", value: "Jordan Reyes" }),
    { writtenFields: new Set(["the.field"]), suppressSynthesizedWidgetBorders: true });
  assert.ok(writtenOn.bytes.equals(writtenOff.bytes),
    "a written field is not byte-identical with the option on, so the option reaches a written appearance");
  const writtenInk = inkInWidgetRect(writtenOn.bytes, "c-written");
  assert.ok(writtenInk.dark > 0, "the written value disappeared, which is a different defect");
  assert.equal(writtenOn.report.widgetContributions.synthesizedBorderCharacteristicsRemoved, 0,
    "the option removed a /MK entry from a field this run wrote");
  control("5-a-written-field-is-byte-identical-either-way-and-keeps-its-value", {
    bytes: writtenOff.bytes.length,
    identical: true,
    darkPixelsInWidgetRect: writtenInk.dark,
    covering: "both halves of the remedy are reached only for a field this run did not write"
  });

  // ---- D. a chooser still showing a prompt is dropped whole ------------------
  const promptOn = await finalize(await probe({ kind: "chooser", appearance: PROMPT }),
    { suppressSynthesizedWidgetBorders: true });
  const promptInk = inkInWidgetRect(promptOn.bytes, "d-prompt");
  assert.equal(promptInk.dark, 0, `a chooser prompt survived onto the page: ${promptInk.dark} dark pixels`);
  assert.deepEqual(promptOn.report.widgetContributions.silentSourceAppearancesKept, [],
    "an appearance showing a word was kept as silent");
  assert.deepEqual(promptOn.report.widgetContributions.unselectedChoicesDropped, ["the.field"]);
  control("6-a-chooser-whose-source-appearance-shows-a-prompt-is-still-dropped-whole-with-the-option-on", {
    darkPixelsInWidgetRect: promptInk.dark,
    keptAsSilent: promptOn.report.widgetContributions.silentSourceAppearancesKept.length,
    covering: "the unwritten-input drop is narrowed by the option, never widened"
  });


  // ---- E. a WRITTEN text field whose border style is an underline -----------
  //
  // The Pennsylvania Rule 490 order spelling, in a few lines: `/MK /BC [0 0 0]`
  // with `/BS << /S /U >>`, and a source appearance that draws the one rule the
  // style declares. The packet writes a value into it, so neither half of
  // suppressSynthesizedWidgetBorders is ever reached for it and the box above
  // survives every option that existed before this one.
  const underlineProbe = () => probe({ kind: "text", appearance: SILENT_RULE, value: "Jordan Reyes",
    borderStyle: { S: "U" } });
  const underlineOff = await finalize(await underlineProbe(), { writtenFields: WRITTEN });
  const underlineOn = await finalize(await underlineProbe(),
    { writtenFields: WRITTEN, honorWidgetBorderStyle: true });
  // The same widget with no border colour at all: what dropping `/MK /BC` and
  // regenerating would deliver on its own. Its rule band is the measurement
  // that says whether the court's rule needs drawing back.
  const noColour = await finalize(await probe({ kind: "text", appearance: SILENT_RULE, value: "Jordan Reyes",
    borderStyle: { S: "U" }, borderColor: null }), { writtenFields: WRITTEN });

  const underlineInkOff = inkInWidgetRect(underlineOff.bytes, "e-off");
  const underlineInkOn = inkInWidgetRect(underlineOn.bytes, "e-on");
  const noColourInk = inkInWidgetRect(noColour.bytes, "e-nocolour");

  assert.ok(underlineInkOff.leftEdge > 0 && underlineInkOff.topEdge > 0,
    "NEGATIVE CONTROL FAILED: with the option off no box is stroked around the written widget, "
    + "so this test proves nothing");
  control("7-with-the-option-off-a-written-underline-styled-widget-is-delivered-inside-a-stroked-rectangle", {
    darkPixelsInWidgetRect: underlineInkOff.dark,
    leftEdgeBand: underlineInkOff.leftEdge,
    topEdgeBand: underlineInkOff.topEdge,
    synthesizedBy: "pdf-lib defaultTextFieldAppearanceProvider reads /MK /BC and never reads /BS /S"
  });

  assert.equal(underlineInkOn.leftEdge, 0,
    `with the option on the left edge of the rect still carries ${underlineInkOn.leftEdge} dark pixels`);
  assert.equal(underlineInkOn.topEdge, 0,
    `with the option on the top edge of the rect still carries ${underlineInkOn.topEdge} dark pixels`);
  control("8-with-the-option-on-the-box-is-gone-from-every-side-the-underline-style-does-not-declare", {
    leftEdgeBand: { before: underlineInkOff.leftEdge, after: underlineInkOn.leftEdge },
    topEdgeBand: { before: underlineInkOff.topEdge, after: underlineInkOn.topEdge },
    matchesAConformingViewer: "ISO 32000-1 12.5.4 Table 166: /S /U is 'a single line along the bottom of the "
      + "annotation rectangle', not a border around it"
  });

  // The rule is the half that a bare `/MK /BC` deletion would lose, so it is
  // measured against a document that does exactly that and nothing more.
  assert.ok(underlineInkOn.ruleBand > 0, "the option removed the box and the court's rule with it");
  assert.ok(underlineInkOn.ruleBand > noColourInk.ruleBand,
    "CONTROL FAILED: the rule band is no fuller than with the border colour simply deleted, so the "
    + "underline is not being drawn back and this option is only a deletion");
  control("9-the-writing-rule-the-underline-style-declares-is-drawn-back-and-a-bare-BC-deletion-loses-it", {
    ruleBand: { withTheOptionOn: underlineInkOn.ruleBand, withTheBorderColourSimplyDeleted: noColourInk.ruleBand },
    covering: "at the Pennsylvania widgets the court's rule is drawn ONLY by the widget's own appearance "
      + "stream and not by the page, so removing /MK /BC alone trades a border the form does not print "
      + "for the loss of a rule the form does"
  });

  const valueOn = pdfText(underlineOn.bytes);
  assert.ok(valueOn.includes("Jordan Reyes"),
    `the participant's value is not legible on the delivered page: ${JSON.stringify(valueOn)}`);
  assert.deepEqual(underlineOn.report.declaredWidgetBorderStyles.widgets,
    [{ field: "the.field", borderWidthPt: 1, stroke: "0 0 0 RG" }]);
  assert.equal(underlineOn.report.declaredWidgetBorderStyles.drawn.length, 1);
  assert.equal(underlineOff.report.declaredWidgetBorderStyles, undefined,
    "the option is off, so nothing about border styles may be reported");
  control("10-the-value-is-still-legible-and-the-widget-is-reported-with-the-geometry-it-was-drawn-at", {
    valueReadBackWithPdftotext: "Jordan Reyes",
    reported: underlineOn.report.declaredWidgetBorderStyles.drawn[0],
    withOptionOff: "no declaredWidgetBorderStyles key at all"
  });

  // ---- F. a written widget with NO /BS keeps the box the form prints --------
  //
  // The other six /MK /BC widgets on that same Pennsylvania page: no /BS at
  // all, so the style is the default solid, and each ships an appearance that
  // strokes a rectangle. Honouring the declared style must leave them exactly
  // as they are.
  const boxedOff = await finalize(await probe({ kind: "text", appearance: SOURCE_BOX, value: "Jordan Reyes" }),
    { writtenFields: WRITTEN });
  const boxedOn = await finalize(await probe({ kind: "text", appearance: SOURCE_BOX, value: "Jordan Reyes" }),
    { writtenFields: WRITTEN, honorWidgetBorderStyle: true });
  const boxedInk = inkInWidgetRect(boxedOn.bytes, "f-boxed");
  assert.ok(boxedOn.bytes.equals(boxedOff.bytes),
    "a widget declaring no /BS is not byte-identical with the option on");
  assert.ok(boxedInk.leftEdge > 0, "the solid border the form does print was removed");
  assert.deepEqual(boxedOn.report.declaredWidgetBorderStyles.widgets, []);
  control("11-a-written-widget-that-declares-no-border-style-keeps-its-box-and-not-a-byte-moves", {
    bytes: boxedOff.bytes.length,
    identical: true,
    leftEdgeBand: boxedInk.leftEdge,
    covering: "the default style is solid, and a solid border is a border around the rectangle"
  });

  // ---- G. a widget whose own appearance contradicts its declared style ------
  const contradictOn = await finalize(
    await probe({ kind: "text", appearance: SOURCE_BOX, value: "Jordan Reyes", borderStyle: { S: "U" } }),
    { writtenFields: WRITTEN, honorWidgetBorderStyle: true });
  const contradictOff = await finalize(
    await probe({ kind: "text", appearance: SOURCE_BOX, value: "Jordan Reyes", borderStyle: { S: "U" } }),
    { writtenFields: WRITTEN });
  assert.ok(contradictOn.bytes.equals(contradictOff.bytes),
    "a widget whose appearance contradicts its declared style was repaired anyway");
  assert.deepEqual(contradictOn.report.declaredWidgetBorderStyles.refusedContradictoryAppearance, ["the.field"]);
  assert.deepEqual(contradictOn.report.declaredWidgetBorderStyles.widgets, []);
  control("12-a-widget-declaring-an-underline-whose-own-appearance-draws-a-box-is-refused-and-counted", {
    identical: true,
    refusedContradictoryAppearance: ["the.field"],
    covering: "two signals must agree; where the form contradicts itself, honouring either would change "
      + "what the court's own form shows"
  });

  // ---- H. the two options do not overlap ------------------------------------
  const unwrittenUnderline = await finalize(
    await probe({ kind: "text", appearance: SILENT_RULE, borderStyle: { S: "U" } }),
    { honorWidgetBorderStyle: true });
  assert.deepEqual(unwrittenUnderline.report.declaredWidgetBorderStyles.widgets, [],
    "the new option reached a field this run did not write");
  assert.equal(unwrittenUnderline.report.widgetContributions.synthesizedBorderCharacteristicsRemoved, 0,
    "the new option performed the other option's remedy");
  control("13-the-new-option-never-reaches-an-unwritten-field-and-the-two-remedies-do-not-overlap", {
    honorWidgetBorderStyleTouched: 0,
    suppressSynthesizedWidgetBordersTouched: 0,
    covering: "suppressSynthesizedWidgetBorders acts only on a field this run did not write; "
      + "honorWidgetBorderStyle acts only on a field this run did write"
  });

  console.log(JSON.stringify({ control: "synthesized widget borders from /MK", dpi: DPI, results }, null, 2));
}

await main();
