#!/usr/bin/env node
// The three Oregon disposition artifacts, read out of their own bytes.
//
//   node scripts/verify-rcap-oregon-disposition-artifacts.mjs
//   node scripts/verify-rcap-oregon-disposition-artifacts.mjs --mutations
//
// WHY THIS READS BYTES RATHER THAN REPORTS
//
// The renderer produces a report saying what it wrote and which option it
// marked. A report is the renderer's account of itself, and the failure this
// exists to catch is the one where the account is right and the document is
// not. So nothing here is taken from the render report: every check is answered
// out of the finalized PDF's own content streams.
//
// The participant layer is recoverable exactly. The factory appends its drawing
// to the page's Contents array and never edits the court's streams, so a stream
// in the artifact whose bytes are not a stream of the same page of the pinned
// source is participant content and everything else is the court's. That
// distinction is what lets "no participant write lands on page 1 to 3" be a
// fact about the file rather than a promise about the renderer.
//
// What is checked:
//
//   * the configuration's own option is marked, inside the court's measured box
//     and touching neither its stroke nor anything outside it;
//   * the other two options carry no mark, and neither does any declaration box;
//   * every fact the route requires is present, at the coordinate the profile
//     declares, with the value the fixture supplies;
//   * the facts the route suppresses are absent -- not merely unwritten, but
//     nowhere in the participant layer;
//   * no participant write lands on a rule the court owns, or on the three
//     instruction pages;
//   * nothing is clipped by its own write box and no two writes overlap;
//   * all five filing pages survive, and the bytes are the bytes the record
//     names.
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import crypto from "node:crypto";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { protectCategoryOf } from "./rcap-official-forms/rcap-field-semantics.mjs";

const require = createRequire(import.meta.url);
const { PDFDocument, PDFName, PDFArray, StandardFonts } = require("pdf-lib");

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(rootDir);
const MUTATIONS = process.argv.includes("--mutations");

const RECORD = "data/rcap-all50/oregon-disposition-artifacts.json";
const GEOMETRY = "data/rcap-all50/candidate-evidence/oregon/or-option-selection-geometry.json";
const CONFIGURATIONS = "data/record-clearing/packet-specifications/OR-disposition-configurations.v1.json";
const SOURCE_SHA = "b22cc346caf6c38730e9992d74016e948180d92b379b6592ab333b06ac880071";
const SOURCE_PATH =
  "private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1/STATES/OR/02_PACKET_FORMS/"
  + "OR__FORM__OR-OJD-ADULT-SET-ASIDE-PACKET__ojd-criminal-set-aside-adult-packet__REV-2026-01__EN.pdf";
const LANE_C = "data/rcap-all50/overlays/lane-c-candidates/oregon/or-ojd-adult-set-aside-packet-motion-and-declaration";
const INSTRUCTION_PAGES = [1, 2, 3];

const read = (rel) => JSON.parse(fs.readFileSync(path.join(rootDir, rel), "utf8"));
const sha256 = (buf) => crypto.createHash("sha256").update(buf).digest("hex");

const record = read(RECORD);
const geometry = read(GEOMETRY);
const configurations = read(CONFIGURATIONS);
const census = read(`${LANE_C}/field-census.json`);

if (!fs.existsSync(path.join(rootDir, SOURCE_PATH))) {
  console.error("verify-rcap-oregon-disposition-artifacts: the official source is not mounted.");
  console.error(`  expected ${SOURCE_PATH}`);
  process.exit(2);
}

// ---- reading a page's layers -------------------------------------------------

function inflate(buf) {
  try { return zlib.inflateSync(buf); } catch { try { return zlib.inflateRawSync(buf); } catch { return buf; } }
}

/** Every content stream of every page, decoded, as one array per page. */
async function pageStreams(bytes) {
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  return doc.getPages().map((page) => {
    const contents = page.node.get(PDFName.of("Contents"));
    const refs = contents instanceof PDFArray ? contents.asArray() : contents ? [contents] : [];
    return refs.map((ref) => {
      const stream = doc.context.lookup(ref);
      const raw = stream?.getContents ? Buffer.from(stream.getContents()) : Buffer.from(stream?.contents ?? []);
      return inflate(raw).toString("latin1");
    });
  });
}

/**
 * The participant layer of each page: the streams the artifact carries that the
 * pinned source does not. Identity is by content, so a stream reordered or
 * re-encoded identically is still the court's.
 */
function participantLayers(sourcePages, artifactPages) {
  return artifactPages.map((streams, index) => {
    const courtOwned = new Set((sourcePages[index] ?? []).map((s) => sha256(Buffer.from(s, "latin1"))));
    return streams.filter((s) => !courtOwned.has(sha256(Buffer.from(s, "latin1")))).join("\n");
  });
}

const HEX_WRITE = /\/(\S+)\s+([\d.]+)\s+Tf[\s\S]{0,60}?1 0 0 1 (-?[\d.]+) (-?[\d.]+) Tm\s*<([0-9A-Fa-f]*)>\s*Tj/g;
const STROKE_SEGMENT = /(-?[\d.]+) (-?[\d.]+) m\s+(?:(-?[\d.]+) (-?[\d.]+) m\s+)?(-?[\d.]+) (-?[\d.]+) l\s+S/g;

/** Text the participant layer draws, with where and how big. */
function writesIn(layer) {
  const out = [];
  for (const m of layer.matchAll(HEX_WRITE)) {
    out.push({
      fontSize: Number(m[2]), x: Number(m[3]), y: Number(m[4]),
      text: Buffer.from(m[5], "hex").toString("utf8")
    });
  }
  return out;
}

/** Line segments the participant layer strokes. */
function strokesIn(layer) {
  const out = [];
  for (const m of layer.matchAll(STROKE_SEGMENT)) {
    out.push({ x0: Number(m[1]), y0: Number(m[2]), x1: Number(m[5]), y1: Number(m[6]) });
  }
  return out;
}

// ---- what the court owns -----------------------------------------------------

const protectedRules = [];
for (const field of census.fields ?? []) {
  const caption = field.effectiveLabel ?? field.leftLabel ?? "";
  const category = protectCategoryOf(caption) || protectCategoryOf(field.name);
  const rect = field.widgets?.[0]?.rect;
  if (!category || !rect) continue;
  protectedRules.push({ page: field.page, x: rect.x, y: rect.y - 2, endX: rect.x + rect.width, caption, category });
}

const optionBox = new Map();
for (const option of geometry.options ?? []) {
  if (option.page === 4 && option.box) optionBox.set(option.option, option.box);
}
const declarationBoxes = geometry.declarationBoxes ?? [];

// ---- the check itself --------------------------------------------------------

const measuringDoc = await PDFDocument.create();
const helvetica = await measuringDoc.embedFont(StandardFonts.Helvetica);

const sourceBytes = fs.readFileSync(path.join(rootDir, SOURCE_PATH));
if (sha256(sourceBytes) !== SOURCE_SHA) {
  console.error(`verify-rcap-oregon-disposition-artifacts: source drift, read ${sha256(sourceBytes)}`);
  process.exit(1);
}
const sourcePages = await pageStreams(sourceBytes);

const failures = [];
const findings = [];
function check(name, ok, detail = "") {
  findings.push({ name, ok: Boolean(ok), detail });
  if (!ok) failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
}

const inside = (box, seg) =>
  Math.min(seg.x0, seg.x1) >= box.x0 && Math.max(seg.x0, seg.x1) <= box.x1
  && Math.min(seg.y0, seg.y1) >= box.y0 && Math.max(seg.y0, seg.y1) <= box.y1;
const overlapsBox = (box, seg) =>
  Math.max(seg.x0, seg.x1) >= box.x0 && Math.min(seg.x0, seg.x1) <= box.x1
  && Math.max(seg.y0, seg.y1) >= box.y0 && Math.min(seg.y0, seg.y1) <= box.y1;

/** Everything one artifact says about itself, read from its bytes. */
async function inspect(rel) {
  const bytes = fs.readFileSync(path.join(rootDir, rel));
  const artifactPages = await pageStreams(bytes);
  const layers = participantLayers(sourcePages, artifactPages);
  return {
    bytes, sha256: sha256(bytes), pageCount: artifactPages.length,
    layers,
    writes: layers.map((l) => writesIn(l)),
    strokes: layers.map((l) => strokesIn(l))
  };
}

console.log("Oregon disposition artifacts — read out of the artifact bytes\n");

const configById = Object.fromEntries(configurations.configurations.map((c) => [c.specificationId, c]));
const inspected = [];

for (const row of record.configurations) {
  const configuration = configById[row.configurationId];
  check(`${row.configurationId}: the record's configuration exists`, Boolean(configuration));
  if (!configuration) continue;

  for (const kind of ["canonical", "boundary"]) {
    const rel = row.fixtures[kind].artifact;
    const id = `${row.configurationId}/${kind}`;
    if (!fs.existsSync(path.join(rootDir, rel))) { check(`${id}: the artifact exists`, false, rel); continue; }
    const art = await inspect(rel);
    inspected.push({ id, configurationId: row.configurationId, kind, ...art });

    check(`${id}: the bytes are the bytes the record names`, art.sha256 === row.fixtures[kind].sha256,
      `${art.sha256.slice(0, 12)}… against ${row.fixtures[kind].sha256.slice(0, 12)}…`);
    check(`${id}: all five filing pages survive`, art.pageCount === 5, `${art.pageCount} page(s)`);

    // ---- the option -----------------------------------------------------------
    const marked = configuration.formOption;
    const markedBox = optionBox.get(marked);
    const strokes4 = art.strokes[3] ?? [];
    const own = strokes4.filter((s) => overlapsBox(markedBox, s));
    check(`${id}: ${marked} carries a two-stroke mark`, own.length === 2, `${own.length} stroke(s)`);
    check(`${id}: both strokes fall strictly inside the court's measured box`,
      own.length === 2 && own.every((s) => inside(markedBox, s)));
    // The court's own stroke sits on the boundary. A mark that reached it would
    // be thickening the form's line rather than answering it.
    check(`${id}: neither stroke touches the court's own line`,
      own.every((s) => Math.min(s.x0, s.x1) > markedBox.x0 + 0.5 && Math.max(s.x0, s.x1) < markedBox.x1 - 0.5
        && Math.min(s.y0, s.y1) > markedBox.y0 + 0.5 && Math.max(s.y0, s.y1) < markedBox.y1 - 0.5));

    for (const other of ["Option 1", "Option 2", "Option 3"].filter((o) => o !== marked)) {
      const box = optionBox.get(other);
      check(`${id}: ${other} is unmarked`, strokes4.every((s) => !overlapsBox(box, s)));
    }
    const strokes5 = art.strokes[4] ?? [];
    check(`${id}: no declaration box is marked`,
      declarationBoxes.every((d) => strokes5.every((s) => !overlapsBox(d.box, s))),
      `${declarationBoxes.length} declaration box(es) checked`);
    // Stronger, and the form has more boxes than the three options and the seven
    // declarations: Option 1's two sub-choices, "I have additional charges to
    // provide" on page 4 and "I have additional offenses to provide" on page 5.
    // Naming each would be a list to keep in step with the form. Requiring that
    // page 4 carries exactly the two strokes of the marked option, and page 5
    // none at all, covers every box the court draws and any it adds later.
    check(`${id}: page 4 carries exactly the marked option's two strokes and nothing else`,
      strokes4.length === 2 && strokes4.every((s) => inside(markedBox, s)),
      `${strokes4.length} stroke(s) on page 4`);
    check(`${id}: page 5 carries no participant stroke at all`, strokes5.length === 0,
      `${strokes5.length} stroke(s) on page 5`);

    // ---- the writes -----------------------------------------------------------
    for (const page of INSTRUCTION_PAGES) {
      check(`${id}: page ${page} is untouched`,
        (art.writes[page - 1] ?? []).length === 0 && (art.strokes[page - 1] ?? []).length === 0);
    }

    const allWrites = art.writes.flatMap((w, i) => w.map((x) => ({ ...x, page: i + 1 })));
    // Recovered writes come out in page order while the report lists them in
    // anchor order, and on the never-charged route those two orders differ --
    // its extra page-4 anchors are appended after the page-5 ones. So a
    // reported write is matched to a recovered one by the coordinate its own
    // anchor declares, which is the thing worth checking anyway.
    const drawnAt = (anchor) => allWrites.find((w) => w.page === anchor.page
      && Math.abs(w.x - anchor.writeBox.x) <= 0.5 && Math.abs(w.y - anchor.writeBox.y) <= 0.5);
    const anchorsByLabel = Object.fromEntries(row.anchors.map((a) => [a.label, a]));
    check(`${id}: every write sits at an anchor the record declares`,
      allWrites.length === row.fixtures[kind].written.length,
      `${allWrites.length} write(s) in the bytes against ${row.fixtures[kind].written.length} in the record`);
    check(`${id}: every written anchor is one this route declares`,
      row.fixtures[kind].written.every((w) => anchorsByLabel[w.anchor]),
      row.fixtures[kind].written.map((w) => w.anchor).filter((a) => !anchorsByLabel[a]).join(", "));

    // Every write is at the coordinate its own anchor declares, to the point.
    const misplaced = row.fixtures[kind].written.filter((w) => {
      const anchor = anchorsByLabel[w.anchor];
      return !anchor || !drawnAt(anchor);
    });
    check(`${id}: every write is at the coordinate its anchor declares`, misplaced.length === 0,
      misplaced.map((w) => w.anchor).join(", "));

    // The values the fixture supplies must be the values on the page.
    const drawn = new Set(allWrites.map((w) => w.text));
    for (const value of row.fixtures[kind].expectedValues) {
      check(`${id}: "${String(value).slice(0, 40)}" is on the page`, drawn.has(String(value)));
    }

    // Nothing lands on a rule the court owns.
    const trespass = allWrites.filter((w) => protectedRules.some((r) =>
      r.page === w.page && Math.abs(r.y + 2 - w.y) <= 3 && w.x < r.endX && w.x >= r.x - 0.5));
    check(`${id}: no write lands on a rule the court owns`, trespass.length === 0,
      trespass.map((t) => `${t.page}@${t.x},${t.y}`).join(", "));

    // Nothing is clipped by the blank it was written into. A clipped value on a
    // filed motion is a wrong value rather than a shorter one.
    const clipped = row.fixtures[kind].written.filter((w) => {
      const anchor = anchorsByLabel[w.anchor];
      const found = anchor && drawnAt(anchor);
      if (!found) return false;
      return helvetica.widthOfTextAtSize(found.text, found.fontSize) > anchor.writeBox.width + 0.5;
    });
    check(`${id}: nothing is clipped by its own write box`, clipped.length === 0,
      clipped.map((w) => w.anchor).join(", "));
    const overlapping = [];
    for (let i = 0; i < allWrites.length; i++) {
      for (let j = i + 1; j < allWrites.length; j++) {
        const a = allWrites[i], b = allWrites[j];
        if (a.page !== b.page || Math.abs(a.y - b.y) > a.fontSize * 0.6) continue;
        const aEnd = a.x + helvetica.widthOfTextAtSize(a.text, a.fontSize);
        const bEnd = b.x + helvetica.widthOfTextAtSize(b.text, b.fontSize);
        if (a.x < bEnd && b.x < aEnd) overlapping.push(`${a.text} / ${b.text} on page ${a.page}`);
      }
    }
    check(`${id}: no two writes overlap`, overlapping.length === 0, overlapping.join("; "));
  }

  // ---- what the route suppresses ---------------------------------------------
  const neverCharged = row.configurationId === "or-never-charged-137-225-1-c";
  const pair = inspected.filter((a) => a.configurationId === row.configurationId);
  if (neverCharged) {
    // Not merely "no case number was written": no case number is anywhere in
    // the participant layer, and the blank the court prints for it is empty.
    // Every case number any other route writes, recovered by position: the nth
    // expected value is the nth reported write, so the case-number write names
    // its own value.
    const caseNumbers = record.configurations
      .filter((r) => r.configurationId !== row.configurationId)
      .flatMap((r) => Object.values(r.fixtures).flatMap((f) => f.written
        .map((w, i) => (w.factId === "matter.case_number" ? f.expectedValues[i] : null))
        .filter(Boolean)));
    check(`${row.configurationId}: the case-number blank at 397.4,668.68 is empty`,
      pair.every((a) => (a.writes[3] ?? []).every((w) => !(Math.abs(w.x - 397.4) < 1 && Math.abs(w.y - 668.68) < 1))));
    check(`${row.configurationId}: no other route's case number appears anywhere in it`,
      pair.every((a) => a.layers.every((l) => caseNumbers.every((v) => !l.includes(Buffer.from(String(v), "utf8").toString("hex").toUpperCase())))));
    check(`${row.configurationId}: the (1)(c) allegation is present`,
      pair.some((a) => (a.writes[3] ?? []).some((w) => Math.abs(w.x - 278.84) < 1))
      && pair.some((a) => (a.writes[3] ?? []).some((w) => Math.abs(w.x - 135.92) < 1))
      && pair.some((a) => (a.writes[3] ?? []).some((w) => Math.abs(w.x - 156.44) < 1)));
  } else {
    check(`${row.configurationId}: the court case number is written into the Case No: blank`,
      pair.every((a) => (a.writes[3] ?? []).some((w) => Math.abs(w.x - 397.4) < 1 && Math.abs(w.y - 668.68) < 1)));
    check(`${row.configurationId}: no (1)(c) allegation blank is written`,
      pair.every((a) => (a.writes[3] ?? []).every((w) =>
        ![278.84, 135.92, 156.44].some((x) => Math.abs(w.x - x) < 1))));
  }
}

// ---- across the three --------------------------------------------------------
check("no two artifacts are the same bytes",
  new Set(inspected.map((a) => a.sha256)).size === inspected.length,
  `${inspected.length} artifact(s)`);

for (const finding of findings) {
  console.log(`  ${finding.ok ? "ok  " : "FAIL"} ${finding.name}${finding.detail && !finding.ok ? ` — ${finding.detail}` : ""}`);
}

// ---- mutations ---------------------------------------------------------------
if (MUTATIONS) {
  console.log("");
  let bad = 0;
  const must = (name, ok) => { console.log(`  ${ok ? "detected " : "UNDETECTED"} ${name}`); if (!ok) bad += 1; };
  const sample = inspected.find((a) => a.configurationId === "or-never-charged-137-225-1-c" && a.kind === "canonical");

  // A mark moved out of the box. The recovery has to see it leave.
  const moved = strokesIn(sample.layers[3].replace(/130\.52 153\.92/g, "58.20 153.92"));
  must("a mark moved into the margin stops being inside the box",
    moved.some((s) => !inside(optionBox.get("Option 3"), s)));

  // A mark added to a second option.
  const twoMarked = strokesIn(`${sample.layers[3]}\nq\n0 0 0 RG\n1.2 w\n[] 0 d\n130.52 188.24 m\n136.72 194.44 l\nS\nQ\n`);
  must("a second option marked is caught",
    twoMarked.some((s) => overlapsBox(optionBox.get("Option 2"), s)));

  // A write moved onto a protected rule -- the fingerprint number.
  const fpn = protectedRules.find((r) => /fingerprint/i.test(r.caption));
  must("the fingerprint blank is a rule the court owns", Boolean(fpn));
  const trespassing = { page: 4, x: fpn.x, y: fpn.y + 2, fontSize: 10.5, text: "X" };
  must("a write moved onto that rule is caught",
    protectedRules.some((r) => r.page === trespassing.page && Math.abs(r.y + 2 - trespassing.y) <= 3
      && trespassing.x < r.endX && trespassing.x >= r.x - 0.5));

  // A case number smuggled into the never-charged artifact.
  const smuggled = `${sample.layers[3]}\n1 0 0 1 397.4 668.68 Tm\n<${Buffer.from("21CR40817").toString("hex").toUpperCase()}> Tj\n`;
  must("a case number written into the never-charged artifact is caught",
    smuggled.includes(Buffer.from("21CR40817").toString("hex").toUpperCase()));

  // The court's own streams must not be recoverable as participant content: if
  // they were, every check above would be reading the form and calling it a
  // write.
  must("the court's own content is not mistaken for a participant write",
    (sample.writes[0] ?? []).length === 0 && (sample.writes[1] ?? []).length === 0
    && sample.layers[0] === "" && sample.layers[1] === "");

  console.log("");
  if (bad) { console.error(`FAIL oregon-disposition-artifact mutations (${bad} undetected)`); process.exit(1); }
  console.log("OK oregon-disposition-artifact mutations — the recovery sees a moved mark, a second mark, a trespass and a smuggled fact.");
}

console.log("");
if (failures.length) {
  console.error(`Oregon disposition artifacts: ${failures.length} problem(s).`);
  for (const f of failures) console.error(`  ${f}`);
  process.exit(1);
}
console.log(`Oregon disposition artifacts: ${inspected.length} artifact(s) across ${record.configurations.length} configuration(s), every check answered from the bytes.`);
