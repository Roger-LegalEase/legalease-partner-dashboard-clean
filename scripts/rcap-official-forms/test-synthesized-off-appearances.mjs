#!/usr/bin/env node
// Controls over the appearance pdf-lib SYNTHESIZES for a check box the source
// left without one.
//
//   node scripts/rcap-official-forms/test-synthesized-off-appearances.mjs
//
// THE DEFECT. sanitizeAndFlatten calls form.updateFieldAppearances() before
// flatten(). pdf-lib's PDFCheckBox.needsAppearancesUpdate returns true for any
// widget whose CURRENT /AS state has no entry in /AP /N, and its default
// provider answers with a stroked square the size of the widget rectangle. A
// form that ships only a /Yes appearance and leaves the box at /Off therefore
// acquires a square at every unticked box -- ink the paper does not carry, and
// ink no conforming viewer paints, because ISO 32000-1 12.5.5 says a viewer
// draws the stream named by /AS and there is none.
//
// The documents built here are not fixtures of any family. They are that
// spelling in three lines apiece, and each one isolates a case the option must
// treat differently:
//
//   A  /AS /Off, /AP /N carrying /Yes alone, nothing written  -> the defect
//   B  the same spelling but the box IS ticked and written    -> must keep its mark
//   C  /AS /Off, /AP /N carrying its own /Off stream          -> must not move a byte
//
// Measured as INK, not as a report count: every page is rastered with pdftoppm
// and the dark pixels inside the widget's own rectangle are counted. A report
// that says a stream was installed is not evidence that the page is clean.
// Rasters are written under the OS temp directory and deleted after measuring.
//
// The control that makes the others mean anything is the negative one: with the
// option OFF, case A must still show the square. A test that passes either way
// is testing nothing.
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";

import { sanitizeAndFlatten } from "./rcap-active-content.mjs";

const require = createRequire(import.meta.url);
const { PDFDocument, PDFName, PDFRawStream } = require("pdf-lib");

const PAGE = { width: 200, height: 200 };
const RECT = { x: 40, y: 120, width: 14.4, height: 14.4 };
const DPI = 300;

/** One appearance stream, drawn in the widget's own BBox coordinates. */
function stateStream(context, content) {
  const bytes = new TextEncoder().encode(content);
  const dict = context.obj({
    Type: "XObject",
    Subtype: "Form",
    FormType: 1,
    BBox: context.obj([0, 0, RECT.width, RECT.height]),
    Matrix: context.obj([1, 0, 0, 1, 0, 0]),
    Resources: context.obj({}),
    Length: bytes.length
  });
  return context.register(PDFRawStream.of(dict, bytes));
}

/**
 * A one-page document carrying one check box with exactly the /AP /N states
 * named, at exactly the /AS state named.
 *
 * pdf-lib's own createCheckBox builds a widget with both states; the /AP /N
 * dictionary is then replaced wholesale, because what is under test is a form
 * that ships FEWER states than pdf-lib would.
 */
async function probe({ states, appearanceState, checked }) {
  const doc = await PDFDocument.create();
  const page = doc.addPage([PAGE.width, PAGE.height]);
  const form = doc.getForm();
  const box = form.createCheckBox("the.box");
  box.addToPage(page, { x: RECT.x, y: RECT.y, width: RECT.width, height: RECT.height, borderWidth: 0 });
  if (checked) box.check();

  const [widget] = box.acroField.getWidgets();
  const normal = doc.context.obj({});
  for (const [state, content] of Object.entries(states)) normal.set(PDFName.of(state), stateStream(doc.context, content));
  const ap = doc.context.obj({});
  ap.set(PDFName.of("N"), normal);
  widget.dict.set(PDFName.of("AP"), ap);
  widget.dict.set(PDFName.of("AS"), PDFName.of(appearanceState));
  widget.dict.delete(PDFName.of("MK"));
  return doc;
}

/** The two states these probes use, drawn as a court's form would draw them. */
const YES_MARK = `q 0 0 0 RG 1.2 w 2 2 m ${RECT.width - 2} ${RECT.height - 2} l S `
  + `2 ${RECT.height - 2} m ${RECT.width - 2} 2 l S Q`;
const OFF_BOX = `q 1 g 0 0 ${RECT.width} ${RECT.height} re f 0 G 0.5 0.5 ${RECT.width - 1} ${RECT.height - 1} re S Q`;

async function finalize(doc, { writtenFields = new Set(), suppressSynthesizedAppearances = false } = {}) {
  const { clean, report } = await sanitizeAndFlatten(doc, { writtenFields, suppressSynthesizedAppearances });
  // Pinned, so a byte comparison measures the page and not the clock.
  const stamp = new Date("2026-01-01T00:00:00Z");
  clean.setCreationDate(stamp);
  clean.setModificationDate(stamp);
  clean.setProducer("");
  return { bytes: Buffer.from(await clean.save({ useObjectStreams: false, updateMetadata: false })), report };
}

/** Dark pixels inside the widget's own rectangle, read off a raster. */
function inkInWidgetRect(bytes, label) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "fix50-test-"));
  try {
    const pdf = path.join(dir, `${label}.pdf`);
    fs.writeFileSync(pdf, bytes);
    execFileSync("pdftoppm", ["-r", String(DPI), "-gray", "-f", "1", "-l", "1", pdf, path.join(dir, "page")]);
    const [pgm] = fs.readdirSync(dir).filter((f) => f.endsWith(".pgm")).map((f) => path.join(dir, f));
    assert.ok(pgm, `pdftoppm produced no raster for ${label}`);
    const raw = fs.readFileSync(pgm);
    // P5 <w> <h> <max>\n, whitespace-separated, no comments from pdftoppm.
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
    let dark = 0;
    for (let y = y0; y <= y1; y += 1) {
      for (let x = x0; x <= x1; x += 1) if (raw[offset + y * width + x] < 200) dark += 1;
    }
    return { dark, window: { x0, x1, y0, y1 } };
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

const results = [];
const control = (name, detail) => { results.push({ control: name, ...detail, pass: true }); console.log(`PASS  ${name}`); };

async function main() {
  // ---- A. the measured defect ------------------------------------------------
  const defectOff = await finalize(await probe({ states: { Yes: YES_MARK }, appearanceState: "Off", checked: false }));
  const defectOn = await finalize(await probe({ states: { Yes: YES_MARK }, appearanceState: "Off", checked: false }),
    { suppressSynthesizedAppearances: true });

  const inkOff = inkInWidgetRect(defectOff.bytes, "a-option-off");
  const inkOn = inkInWidgetRect(defectOn.bytes, "a-option-on");

  assert.ok(inkOff.dark > 0,
    "NEGATIVE CONTROL FAILED: with the option off the synthesized square is absent, so this test proves nothing");
  control("1-with-the-option-off-an-unwritten-box-whose-AS-state-has-no-appearance-is-delivered-as-a-bordered-square", {
    darkPixelsInWidgetRect: inkOff.dark,
    synthesizedBy: "pdf-lib defaultCheckBoxAppearanceProvider via form.updateFieldAppearances()"
  });

  assert.equal(inkOn.dark, 0,
    `with the option on the widget rect still carries ${inkOn.dark} dark pixels`);
  control("2-with-the-option-on-the-same-widget-flattens-to-zero-ink-at-its-rect", {
    darkPixelsInWidgetRect: inkOn.dark,
    wasBefore: inkOff.dark,
    matchesAConformingViewer: "ISO 32000-1 12.5.5: no stream is named by /AS, so nothing is painted"
  });

  const installed = defectOn.report.synthesizedSelectionAppearancesSuppressed;
  assert.equal(installed.installedCount, 1, `report says ${installed.installedCount} appearances installed, expected 1`);
  assert.equal(installed.installed[0].state, "/Off");
  assert.equal(defectOff.report.synthesizedSelectionAppearancesSuppressed, undefined,
    "the option is off, so the sanitize report must not carry a suppression record at all");
  control("3-the-count-is-reported-per-document-and-only-when-the-option-is-on", {
    withOptionOn: { installedCount: installed.installedCount, state: installed.installed[0].state },
    withOptionOff: "no key in the sanitize report"
  });

  // ---- B. a written box keeps its mark --------------------------------------
  const writtenOn = await finalize(await probe({ states: { Yes: YES_MARK }, appearanceState: "Yes", checked: true }),
    { writtenFields: new Set(["the.box"]), suppressSynthesizedAppearances: true });
  const writtenInk = inkInWidgetRect(writtenOn.bytes, "b-written");
  assert.ok(writtenInk.dark > 0, "a ticked, written box lost its mark with the option on");
  const writtenReport = writtenOn.report.synthesizedSelectionAppearancesSuppressed;
  assert.equal(writtenReport.installedCount, 0, "the option installed an appearance on a written field");
  assert.equal(writtenReport.skippedWritten, 1, "the written field was not skipped for being written");
  control("4-a-written-checked-box-still-renders-its-mark-with-the-option-on", {
    darkPixelsInWidgetRect: writtenInk.dark,
    installedOnThisField: writtenReport.installedCount,
    skippedBecauseWritten: writtenReport.skippedWritten
  });

  // ---- C. a source-owned /Off appearance is untouched ------------------------
  const shipsOwnOff = { states: { Off: OFF_BOX, Yes: YES_MARK }, appearanceState: "Off", checked: false };
  const ownOff = await finalize(await probe(shipsOwnOff));
  const ownOn = await finalize(await probe(shipsOwnOff), { suppressSynthesizedAppearances: true });
  assert.equal(ownOn.bytes.length, ownOff.bytes.length,
    `a widget shipping its own /Off appearance changed size: ${ownOff.bytes.length} -> ${ownOn.bytes.length}`);
  assert.ok(ownOn.bytes.equals(ownOff.bytes),
    "a widget shipping its own /Off appearance is not byte-identical with the option on");
  const ownInk = inkInWidgetRect(ownOn.bytes, "c-ships-own-off");
  assert.ok(ownInk.dark > 0, "the source's own /Off box was not reproduced at all, which is a different defect");
  assert.equal(ownOn.report.synthesizedSelectionAppearancesSuppressed.installedCount, 0);
  assert.equal(ownOn.report.synthesizedSelectionAppearancesSuppressed.skippedStateAlreadyDrawn, 1);
  control("5-a-widget-that-ships-its-own-Off-appearance-is-byte-identical-either-way", {
    bytes: ownOff.bytes.length,
    identical: true,
    sourceBoxStillPrinted: ownInk.dark,
    covering: "RI-OFF-APPEARANCE: an unchanged /Off appearance is source-owned form structure"
  });

  console.log(JSON.stringify({ control: "synthesized off-state appearances", dpi: DPI, results }, null, 2));
}

await main();
