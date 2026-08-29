#!/usr/bin/env node
// Where the option selections live on the official Oregon set-aside form.
//
// WHAT THIS WAS ASKED TO MEASURE, AND WHAT IS ACTUALLY THERE
//
// The instruction was to measure exact checkbox geometry for Options 2 and 3
// from the verified official binary. There is no checkbox geometry to measure.
// The form is flat -- zero AcroForm fields -- and it draws no checkbox squares
// anywhere: not beside the three options, and not beside the "Check all that
// apply" items either. Every rectangle on the option page is a rule, a border or
// a hairline; the nearest-to-square shapes are 0.5 x 0.5 pt dots.
//
// The three options are prose headings in the left margin, under the printed
// instruction "(choose one option only)". A participant indicates the option by
// completing its section, and on paper marks it by hand.
//
// That matters for the packet. A mark cannot be placed "in the box" because
// there is no box, and inventing one would have this product draw a control the
// court did not put on its own form. What can be done, and is done here, is
// measure the option LABELS exactly and derive a mark position from each -- the
// same anchor-relative technique the existing Oregon overlay already uses for
// every value it writes. The derived positions are labelled as derived, so no
// later reader mistakes them for something measured off a control.
//
// Everything is read from the pinned binary at
// b22cc346caf6c38730e9992d74016e948180d92b379b6592ab333b06ac880071.
//
//   node scripts/measure-rcap-oregon-option-geometry.mjs
//   node scripts/measure-rcap-oregon-option-geometry.mjs --check

import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import crypto from "node:crypto";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { PDFDocument, PDFName, PDFArray } = require("pdf-lib");

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(rootDir);
const CHECK = process.argv.includes("--check");

const SOURCE_ID = "OR-OJD-ADULT-SET-ASIDE-PACKET";
const EXPECTED_SHA = "b22cc346caf6c38730e9992d74016e948180d92b379b6592ab333b06ac880071";
const CORPUS_PATH =
  "private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1/STATES/OR/02_PACKET_FORMS/"
  + "OR__FORM__OR-OJD-ADULT-SET-ASIDE-PACKET__ojd-criminal-set-aside-adult-packet__REV-2026-01__EN.pdf";
const OUT = "data/rcap-all50/candidate-evidence/oregon/or-option-selection-geometry.json";

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
const rectangleCensus = [];
for (let i = 0; i < doc.getPageCount(); i++) {
  const page = doc.getPage(i);
  const sv = pageContent(doc, page);
  const runs = textRuns(sv);
  const found = runs.filter((r) => /^Option [123]\b/.test(r.text.trim()));
  if (!found.length) continue;
  const { width, height } = page.getSize();
  const rects = [...sv.matchAll(/(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s+re/g)]
    .map((m) => ({ x: +m[1], y: +m[2], w: +m[3], h: +m[4] }));
  const nearSquare = rects.filter((r) => Math.abs(r.w - r.h) < 2 && r.w > 3 && r.w < 25);
  rectangleCensus.push({
    page: i + 1,
    rectangles: rects.length,
    checkboxSizedSquares: nearSquare.length,
    largestNearSquare: nearSquare.length ? Math.max(...nearSquare.map((r) => r.w)) : null,
    smallestRectangle: rects.length ? Math.min(...rects.map((r) => Math.min(r.w, r.h))) : null
  });
  for (const r of found) {
    const label = r.text.trim().slice(0, 8);
    // The sentence the court prints for this option, gathered from the runs that
    // follow it on the same baseline block.
    const idx = runs.indexOf(r);
    const sentence = runs.slice(idx, idx + 40).map((o) => o.text).join("").replace(/\s+/g, " ").slice(0, 260);
    options.push({
      option: label,
      page: i + 1,
      pageSize: { width, height },
      labelOrigin: { x: r.x, y: r.y },
      labelFontSize: r.size,
      printedSentence: sentence,
      // Derived, not measured off a control: there is no control. The mark sits
      // one label-height to the left of the label origin, on the label baseline,
      // which is the blank left margin on this page.
      derivedMarkPosition: {
        x: +(r.x - r.size * 1.25).toFixed(2),
        y: r.y,
        size: +(r.size * 0.85).toFixed(2),
        basis: "derived from the label origin and font size; the form draws no checkbox to measure",
        inLeftMargin: +(r.x - r.size * 1.25).toFixed(2) > 36
      }
    });
  }
}

const doc_ = {
  schemaVersion: "rcap-oregon-option-selection-geometry/v1",
  generatedBy: "scripts/measure-rcap-oregon-option-geometry.mjs",
  source: { sourceId: SOURCE_ID, sha256: sha, corpusPath: CORPUS_PATH, pages: doc.getPageCount() },
  finding: {
    headline: "The form has no checkbox for the three options, and no checkbox anywhere.",
    acroFormFields: acroFields,
    formIsFlat: acroFields === 0,
    checkboxSizedSquaresOnOptionPages: rectangleCensus.reduce((n, p) => n + p.checkboxSizedSquares, 0),
    whatIsThereInstead:
      "Three prose headings in the left margin under the printed instruction \"(choose one option only)\". A participant indicates the option by completing its section, and on paper marks it by hand.",
    consequenceForThePacket:
      "A mark cannot be placed in a box that does not exist, and drawing one would have this product add a control the court did not put on its own form. The option is instead recorded by placing a mark at a position DERIVED from the measured label origin, using the anchor-relative technique the existing Oregon overlay already uses for every value it writes.",
    whatThisDoesNotEstablish:
      "That a derived mark is the correct way to indicate an option on this form. That is a legal-design and visual-review question about the finished document, not a measurement."
  },
  rectangleCensus,
  options,
  optionToConfiguration: {
    "Option 1": { usedByAnyConfiguration: false, why: "Option 1 is the conviction set-aside. None of the three disposition-bound configurations selects it, and all three must leave it unselected." },
    "Option 2": { usedByConfigurations: ["or-acquittal-137-225-1-d", "or-ordinary-dismissal-137-225-1-d"], authority: "ORS 137.225(1)(d)" },
    "Option 3": { usedByConfigurations: ["or-never-charged-137-225-1-c"], authority: "ORS 137.225(1)(c)" }
  }
};

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
  console.log(`  source verified ${sha.slice(0, 12)}…, ${acroFields} AcroForm field(s), ${doc_.finding.checkboxSizedSquaresOnOptionPages} checkbox-sized square(s)`);
  for (const o of options) {
    console.log(`  ${o.option}  page ${o.page}  label (${o.labelOrigin.x}, ${o.labelOrigin.y}) size ${o.labelFontSize}  → derived mark (${o.derivedMarkPosition.x}, ${o.derivedMarkPosition.y})`);
  }
}
