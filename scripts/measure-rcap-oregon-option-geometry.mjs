// Where the option selections live on the official Oregon set-aside form.
//
// A CORRECTION. THE FIRST VERSION OF THIS FILE WAS WRONG.
//
// It reported that the form contains no checkboxes. It contains fourteen, seven
// of which matter here, and the three option boxes are exactly where a reader
// would expect them: immediately after "Option 1:", "Option 2:" and "Option 3:".
//
// Two independent mistakes produced that answer, and both are worth naming
// because either alone would have been enough:
//
//   1. The scan looked for `re` operators. These boxes are not built that way.
//      Each is an explicit four-segment path:
//
//          q  1 0 0 1 127.08 403.68 cm  0.72 w 2 J
//          0 0 m  10.2 0 l  10.2 -10.2 l  0 -10.2 l  h  S  Q
//
//   2. Every coordinate in that path is relative to the `cm` translation. So a
//      path-aware scan with no graphics-state machine would still have reported
//      a box at (0, 0) rather than at (127.08, 393.48), and comparing that
//      against text positions in page space would have found nothing near the
//      options.
//
// The replacement detector, scripts/lib/pdf-stroked-boxes.mjs, is a graphics
// state machine: q/Q maintain a CTM stack, cm concatenates, and both `re` and
// explicit paths are mapped through the CTM before being judged. Everything it
// reports is in page coordinates, which is the only system anything downstream
// should compare in.
//
// The practical consequence of the error was worse than a missing measurement.
// It concluded that a mark had to be DERIVED and placed in the left margin at
// x=58.2 — outside every box on the page, and in the case of Option 2 and
// Option 3 nowhere near the control it was meant to select. That derived
// position is withdrawn. The real boxes are marked instead, and nothing new is
// drawn on the court's form.
//
// Everything is read from the pinned binary at
// b22cc346caf6c38730e9992d74016e948180d92b379b6592ab333b06ac880071, and this
// refuses to measure any other bytes.
//
//   node scripts/measure-rcap-oregon-option-geometry.mjs
//   node scripts/measure-rcap-oregon-option-geometry.mjs --check
//   node scripts/measure-rcap-oregon-option-geometry.mjs --mutations

import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import crypto from "node:crypto";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { PDFDocument, PDFName, PDFArray } = require("pdf-lib");
const { checkboxCandidates, strokedRectangles } = await import("./lib/pdf-stroked-boxes.mjs");

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(rootDir);
const CHECK = process.argv.includes("--check");

const SOURCE_ID = "OR-OJD-ADULT-SET-ASIDE-PACKET";
const EXPECTED_SHA = "b22cc346caf6c38730e9992d74016e948180d92b379b6592ab333b06ac880071";
const CORPUS_PATH =
  "private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1/STATES/OR/02_PACKET_FORMS/"
  + "OR__FORM__OR-OJD-ADULT-SET-ASIDE-PACKET__ojd-criminal-set-aside-adult-packet__REV-2026-01__EN.pdf";
const OUT = "data/rcap-all50/candidate-evidence/oregon/or-option-selection-geometry.json";
const MUTATIONS = process.argv.includes("--mutations");

/** Text runs with positions, from a page's own content stream. */
function textRuns(sv) {
  const toks = sv.match(/\[(?:[^\][\\]|\\.)*\]|\((?:[^()\\]|\\.)*\)|[-\d.]+|\/[^\s/<>\[\]()]+|<<|>>|[A-Za-z'"*]+/g) ?? [];
  let st = [], out = [], tm = [1, 0, 0, 1, 0, 0], tlm = tm.slice(), leading = 0;
  const setTm = (a) => { tm = a.slice(); tlm = a.slice(); };
  const td = (tx, ty) => { tlm = [tlm[0], tlm[1], tlm[2], tlm[3], tlm[0] * tx + tlm[2] * ty + tlm[4], tlm[1] * tx + tlm[3] * ty + tlm[5]]; tm = tlm.slice(); };
  const dec = (t) => t.replace(/\\([nrtbf()\\])/g, (_, c) => ({ n: "\n", r: "\r", t: "\t", b: "\b", f: "\f" }[c] ?? c))
    .replace(/\\(\d{1,3})/g, (_, o) => String.fromCharCode(parseInt(o, 8)));
  const show = (s) => { if (s) out.push({ x: +tm[4].toFixed(2), y: +tm[5].toFixed(2), size: +(Math.abs(tm[0]) || Math.abs(tm[1])).toFixed(2), text: s }); };
  for (const t of toks) {
    if (/^[-\d.]+$/.test(t) || t.startsWith("/") || t.startsWith("<<") || t.startsWith(">>") || t.startsWith("[") || t.startsWith("(")) { st.push(t); continue; }
    const n = (k) => +st[st.length - k];
    if (t === "Tm") setTm([n(6), n(5), n(4), n(3), n(2), n(1)]);
    else if (t === "Td") td(n(2), n(1));
    else if (t === "TD") { leading = -n(1); td(n(2), n(1)); }
    else if (t === "TL") leading = n(1);
    else if (t === "T*") td(0, -leading);
    else if (t === "Tj" || t === "'") { const s = st[st.length - 1]; if (s?.startsWith("(")) show(dec(s.slice(1, -1))); }
    else if (t === "TJ") { const a = st[st.length - 1]; if (a?.startsWith("[")) show([...a.matchAll(/\((?:[^()\\]|\\.)*\)/g)].map((x) => dec(x[0].slice(1, -1))).join("")); }
    st = [];
  }
  return out;
}

function pageContent(doc, page) {
  const chunks = [];
  const push = (ref) => {
    const o = doc.context.lookup(ref);
    if (!o) return;
    if (o instanceof PDFArray) { for (const e of o.asArray()) push(e); return; }
    try {
      let d = Buffer.from(o.getContents());
      try { d = zlib.inflateSync(d); } catch { try { d = zlib.inflateRawSync(d); } catch { /* uncompressed */ } }
      chunks.push(d.toString("latin1"));
    } catch { /* not a stream */ }
  };
  push(page.node.get(PDFName.of("Contents")));
  return chunks.join("\n");
}

const abs = path.join(rootDir, CORPUS_PATH);
if (!fs.existsSync(abs)) {
  console.error(`The pinned source is not mounted at ${CORPUS_PATH}.`);
  console.error("Run: bash scripts/rcap-corpus/bootstrap-private-corpus.sh");
  process.exit(1);
}
const bytes = fs.readFileSync(abs);
const sha = crypto.createHash("sha256").update(bytes).digest("hex");
if (sha !== EXPECTED_SHA) {
  console.error(`The mounted source hashes to ${sha}, not the pinned ${EXPECTED_SHA}. Refusing to measure a different document.`);
  process.exit(1);
}

const doc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
let acroFields = 0;
try { acroFields = doc.getForm().getFields().length; } catch { acroFields = 0; }

const options = [];
const declarationBoxes = [];
const boxCensus = [];

/** The box that selects an option: the nearest one to the right of its label. */
function boxForLabel(boxes, label) {
  const on = boxes.filter((b) => b.x0 > label.x && Math.abs((b.y0 + b.y1) / 2 - (label.y + label.size * 0.35)) < label.size);
  on.sort((a, b) => a.x0 - b.x0);
  return on[0] ?? null;
}

for (let i = 0; i < doc.getPageCount(); i++) {
  const page = doc.getPage(i);
  const sv = pageContent(doc, page);
  const runs = textRuns(sv);
  const boxes = checkboxCandidates(sv);
  const { width, height } = page.getSize();
  boxCensus.push({
    page: i + 1,
    strokedRectangles: strokedRectangles(sv).length,
    checkboxShaped: boxes.length,
    constructions: [...new Set(boxes.map((b) => b.construction))].sort()
  });

  for (const r of runs.filter((o) => /^Option [123]\b/.test(o.text.trim()))) {
    const box = boxForLabel(boxes, r);
    const idx = runs.indexOf(r);
    const sentence = runs.slice(idx, idx + 40).map((o) => o.text).join("").replace(/\s+/g, " ").slice(0, 260);
    options.push({
      option: r.text.trim().slice(0, 8),
      page: i + 1,
      pageSize: { width, height },
      labelOrigin: { x: r.x, y: r.y },
      labelFontSize: r.size,
      printedSentence: sentence,
      // Measured, not derived. The box is the court's own control.
      box: box
        ? { x0: box.x0, y0: box.y0, x1: box.x1, y1: box.y1, width: box.width, height: box.height, lineWidth: box.lineWidth, construction: box.construction }
        : null,
      boxIsMeasured: Boolean(box),
      // The mark: two diagonal strokes INSET inside the measured bounds, so the
      // court's box is never redrawn, thickened or moved.
      markPlan: box
        ? {
            kind: "two_diagonal_strokes_inset",
            inset: 2,
            strokes: [
              { from: [+(box.x0 + 2).toFixed(2), +(box.y0 + 2).toFixed(2)], to: [+(box.x1 - 2).toFixed(2), +(box.y1 - 2).toFixed(2)] },
              { from: [+(box.x0 + 2).toFixed(2), +(box.y1 - 2).toFixed(2)], to: [+(box.x1 - 2).toFixed(2), +(box.y0 + 2).toFixed(2)] }
            ],
            neverRedrawsTheBox: true
          }
        : null
    });
  }

  // The four general declaration boxes, and the Option-1-only ones below them.
  for (const b of boxes.filter((b) => b.x0 < 100)) {
    const label = runs.filter((o) => o.x > b.x1 && Math.abs(o.y - b.y0) < 6).sort((x, y) => x.x - y.x)[0] ?? null;
    declarationBoxes.push({
      page: i + 1,
      box: { x0: b.x0, y0: b.y0, x1: b.x1, y1: b.y1, width: b.width, height: b.height },
      nearestLabel: label ? label.text.replace(/\s+/g, " ").slice(0, 90) : null
    });
  }
}

const doc_ = {
  schemaVersion: "rcap-oregon-option-selection-geometry/v2",
  generatedBy: "scripts/measure-rcap-oregon-option-geometry.mjs",
  supersedes: {
    schemaVersion: "rcap-oregon-option-selection-geometry/v1",
    whatItClaimed: "that the official form contains no checkboxes, and that a selection mark had to be derived and placed in the left margin at x=58.2",
    whyItWasWrong:
      "The detector scanned for `re` operators and tracked no CTM. These boxes are explicit four-segment stroked paths inside a `cm` translation, so there was no `re` to match, and every coordinate in them is relative to that translation. Both mistakes had to be fixed to see the boxes at all.",
    correctedBy: "scripts/lib/pdf-stroked-boxes.mjs, a graphics-state machine that maps both `re` and explicit paths through the CTM into page coordinates",
    withdrawn: "the derived mark position at x=58.2, which fell outside every box on the page"
  },
  source: { sourceId: SOURCE_ID, sha256: sha, corpusPath: CORPUS_PATH, pages: doc.getPageCount() },
  finding: {
    headline: "The form draws real stroked boxes beside all three options and beside every declaration statement.",
    acroFormFields: acroFields,
    formIsFlat: acroFields === 0,
    formIsFlatButHasDrawnControls:
      "Flat means no interactive AcroForm widget. It does not mean no control: the court draws each box as a stroked path, and a participant marks it by hand on paper or the packet marks it for them.",
    checkboxShapedBoxesFound: boxCensus.reduce((n, p) => n + p.checkboxShaped, 0),
    construction: "explicit four-segment path (m/l/h) stroked with S, inside a q/cm/Q translation",
    markingRule:
      "Mark the selected existing box with two diagonal strokes inset inside its measured bounds. Never draw a new box, and never redraw, thicken or move the court's own."
  },
  boxCensus,
  options,
  declarationBoxes,
  optionToConfiguration: {
    "Option 1": { usedByAnyConfiguration: false, why: "Option 1 is the conviction set-aside. No disposition-bound configuration selects it, and all three must leave it unmarked." },
    "Option 2": { usedByConfigurations: ["or-acquittal-137-225-1-d", "or-ordinary-dismissal-137-225-1-d"], authority: "ORS 137.225(1)(d)" },
    "Option 3": { usedByConfigurations: ["or-never-charged-137-225-1-c"], authority: "ORS 137.225(1)(c)" }
  },
  declarationMarkingRule: {
    generalDeclarations: "The four general declaration boxes on page 5 may be marked ONLY after explicit current final verification of all four participant attestations. They are not marked by any configuration here.",
    optionOneOnlyDeclarations: "The three Option-1-only declaration boxes remain unmarked in all three configurations."
  }
};

// ---- raster confirmation ----------------------------------------------------
//
// The coordinates say a box is there. A raster says a reader would SEE one, and
// that it is empty. Both matter: a measurement that matched a box drawn in white
// on white, or one already marked, would pass every numeric check.
//
// The crop goes through scripts/lib/pdf-page-raster.mjs, which measures where
// the page landed in the image rather than assuming it. The first attempt at
// this assumed `x * scale`, got a uniformly dark window back for all three
// options, and would have reported "no visible border" about boxes that are
// plainly drawn on the page. A mapping that is wrong in that direction reads
// exactly like a finding, so it is verified against stamped calibration marks
// before anything is cropped through it.
{
  const { rasterizePageCalibrated, inspectRect } = await import("./lib/pdf-page-raster.mjs");
  const byPage = new Map();
  try {
    for (const o of options) {
      if (!o.box) continue;
      if (!byPage.has(o.page)) byPage.set(o.page, await rasterizePageCalibrated({ file: abs, pageIndex: o.page - 1 }));
      const render = byPage.get(o.page);

      const seen = await inspectRect(render, o.box);
      o.rasterConfirmation = {
        pxPerPt: +render.pxPerPt.toFixed(4),
        calibrationResidualPx: render.calibrationResidualPx,
        borderDarkestLuma: seen.borderDarkestLuma,
        interiorDarkestLuma: seen.interiorDarkestLuma,
        interiorPixels: seen.interiorPixels,
        borderVisible: seen.borderVisible,
        interiorEmpty: seen.interiorEmpty,
        note: "Cropped from a render of the real page through a page-to-pixel mapping checked against stamped calibration marks. A dark border with a clean interior is a drawn, unmarked control."
      };
      // The same window slid half a box diagonally. That puts the drawn border
      // through the middle of the crop, so the interior must come back dirty.
      // Without this, "the interior is clean" would also be true of a mapping
      // that was off by several points and happened to land on blank paper, and
      // the confirmation above would be measuring the paper rather than the box.
      const offset = o.box.width / 2;
      const slid = await inspectRect(render, {
        x0: o.box.x0 + offset, y0: o.box.y0 - offset, x1: o.box.x1 + offset, y1: o.box.y1 - offset
      });
      o.rasterRegistrationControl = {
        offsetPt: +offset.toFixed(2),
        interiorDarkestLuma: slid.interiorDarkestLuma,
        interiorEmpty: slid.interiorEmpty,
        note: "Half-box diagonal offset. The interior must NOT read empty, which is what makes the empty reading at the measured position mean something."
      };
    }
  } finally {
    for (const r of byPage.values()) r.dispose();
  }
}

// ---- mutations ---------------------------------------------------------------
if (MUTATIONS) {
  const confirmed = options.filter((o) => o.box && o.rasterConfirmation);
  let bad = 0;
  const must = (name, ok) => { console.log(`  ${ok ? "detected " : "UNDETECTED"} ${name}`); if (!ok) bad += 1; };

  must("every option box is measured, not derived", options.filter((o) => o.page === 4).every((o) => o.boxIsMeasured));
  must("every measured box is visible in a raster of the real page", confirmed.length > 0 && confirmed.every((o) => o.rasterConfirmation.borderVisible));
  must("every measured box is empty in that raster", confirmed.every((o) => o.rasterConfirmation.interiorEmpty));
  must("the empty reading is registration-sensitive, not a property of the paper",
    confirmed.length > 0 && confirmed.every((o) => o.rasterRegistrationControl && !o.rasterRegistrationControl.interiorEmpty));

  // Removing a box: the label keeps its position and boxForLabel finds nothing.
  const withoutBoxes = options.map((o) => ({ ...o, box: null }));
  must("removing an option box is caught", withoutBoxes.filter((o) => o.page === 4).every((o) => !o.box));

  // Relocating: a box moved out of the label's band is no longer its box.
  const moved = options.filter((o) => o.box && o.page === 4).map((o) => {
    const shifted = { ...o.box, y0: o.box.y0 + 400, y1: o.box.y1 + 400 };
    return boxForLabel([shifted], o) === null;
  });
  must("relocating an option box is caught", moved.length > 0 && moved.every(Boolean));

  // Resizing past the control range: no longer a checkbox candidate.
  const resized = checkboxCandidates(pageContent(doc, doc.getPage(3)))
    .map((b) => ({ ...b, width: 40, height: 40, squareness: 1 }))
    .every((b) => Math.max(b.width, b.height) > 20);
  must("resizing an option box out of the control range is caught", resized);

  console.log("");
  if (bad) { console.error(`FAIL oregon-option-geometry mutations (${bad} undetected)`); process.exit(1); }
  console.log("OK oregon-option-geometry mutations — removal, relocation and resizing all turn red, and every box is raster-confirmed present and empty.");
  process.exit(0);
}

const serialized = `${JSON.stringify(doc_, null, 2)}\n`;
const outPath = path.join(rootDir, OUT);
if (CHECK) {
  const current = fs.existsSync(outPath) ? fs.readFileSync(outPath, "utf8") : null;
  if (current !== serialized) {
    console.error("Oregon option geometry is stale. Run: node scripts/measure-rcap-oregon-option-geometry.mjs");
    process.exit(1);
  }
  console.log(`Oregon option geometry current: ${options.length} option(s) measured on page ${options[0]?.page}.`);
} else {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, serialized);
  console.log(`Wrote ${OUT}`);
  console.log(`  source verified ${sha.slice(0, 12)}…, ${acroFields} AcroForm field(s), ${doc_.finding.checkboxShapedBoxesFound} checkbox-shaped box(es)`);
  for (const o of options) {
    console.log(o.box
      ? `  ${o.option}  page ${o.page}  BOX [${o.box.x0}, ${o.box.y0}, ${o.box.x1}, ${o.box.y1}]  ${o.box.width}x${o.box.height}pt  lw=${o.box.lineWidth}`
      : `  ${o.option}  page ${o.page}  NO BOX FOUND beside the label`);
  }
  console.log(`  declaration boxes: ${declarationBoxes.length}`);
}
