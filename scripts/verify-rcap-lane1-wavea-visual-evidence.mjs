#!/usr/bin/env node
// All-page visual evidence for Gate B lane 1, wave A.
//
//   node scripts/verify-rcap-lane1-wavea-visual-evidence.mjs
//   node scripts/verify-rcap-lane1-wavea-visual-evidence.mjs --check
//   node scripts/verify-rcap-lane1-wavea-visual-evidence.mjs --mutations
//
// Four families re-rendered at this branch's base, each given every page of the
// official source and of the finalized artifact as a picture, bound by hash to
// the bytes those pictures are of.
//
// WHAT IS DIFFERENT HERE, AND WHY IT MATTERS
//
// Lane 2 had no official source binaries in the clone, so its source panel came
// from a contact sheet the factory built. This wave installs the lane 1 batch 01
// source pack, so the source raster is rendered from the official PDF itself and
// its bytes are hashed directly. Every family's field census pins a sha256, and
// each one equals the hash of the file this run rendered -- so the source side of
// every comparison is the document the census was derived from, not a picture of
// something asserted to be it.
//
// EVERY PAGE, NOT EVERY FIELD PAGE
//
// pagesRequiringRaster() returns the pages carrying census fields. Three of these
// four families are flat_pdf with a field count of zero, so that answer is the
// empty list, and a package built on it would contain no pictures at all while
// reporting complete coverage. These documents get filed whole, so every page of
// each is rendered and the manifest says which pages carry a field and which do
// not. Refusing a page-1-only package is not enough when the risk is a no-page one.
//
// PLACEMENT, AND ZERO PLACEMENTS
//
// A family that writes nothing is a real result, not a gap, and it is recorded as
// one: no expected value is invented so that a proof has something to find. What
// is checked instead is the inverse and it is the stronger question -- whether the
// artifact draws anything the family never declared.
//
// Placement, protected regions, raster coverage and stale binding stay with
// scripts/rcap-official-forms/rcap-evidence-contract.mjs, which owns them. Two
// proofs this wave adds are decided here because nothing else answers them:
// clipping (text drawn past the rectangle that was declared for it) and duplicate
// placement (one value drawn more than once).
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import zlib from "node:zlib";
import { rasterizePdf } from "./rcap-official-forms/rcap-pdf-rasterize.mjs";
import { auditPlacements, pagesRequiringRaster, rasterContract, reconcileWrittenAgainstDeclared, EVIDENCE_CONTRACT_VERSION }
  from "./rcap-official-forms/rcap-evidence-contract.mjs";
import { CANONICAL } from "./implement-rcap-official-forms-d1.mjs";

const require = createRequire(import.meta.url);
const sharp = require("sharp");
const { PDFDocument, PDFName, PDFArray, PDFDict } = require("pdf-lib");

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PRODUCTION = path.join(rootDir, "data/rcap-all50/overlays/production");
const SOURCE_ROOT = path.join(rootDir, "private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1");
const OUT_DIR = path.join(rootDir, "docs/record-clearing/pdf-visual-evidence/lane1-wavea");
const checkOnly = process.argv.includes("--check");
const mutationsOnly = process.argv.includes("--mutations");
const SCALE = 2;
const RENDER_DATE = new Date("2026-01-01T00:00:00Z");
const INK_MAX_GREY = 190;

// The wave, in the order the assignment names it. `source` is the path inside the
// installed pack; the pack's own manifest is what pinned it, and the census pins
// the same hash independently.
const WAVE = [
  {
    familyId: "AK:tf-810-form-en",
    dir: "alaska/tf-810-form-en",
    source: "STATES/AK/02_PACKET_FORMS/AK__FORM__TF-810__request-to-exclude-case-from-online-public-index-courtview-under-administrative-rule-40-a__REV-2025-05__EN.pdf"
  },
  {
    familyId: "NC:aoc-cr-287-form-es",
    dir: "north-carolina/aoc-cr-287-form-es",
    source: "STATES/NC/02_PACKET_FORMS/NC__FORM__AOC-CR-287__aoc-cr-287-petition-and-order-of-expunction__REV-2020-12__ES.pdf"
  },
  {
    familyId: "NC:aoc-cr-287-form-vi",
    dir: "north-carolina/aoc-cr-287-form-vi",
    source: "STATES/NC/02_PACKET_FORMS/NC__FORM__AOC-CR-287__aoc-cr-287-petition-and-order-of-expunction__REV-2020-12__VI.pdf"
  },
  {
    familyId: "NC:aoc-cr-288-form-es",
    dir: "north-carolina/aoc-cr-288-form-es",
    source: "STATES/NC/02_PACKET_FORMS/NC__FORM__AOC-CR-288__aoc-cr-288-petition-and-order-of-expunction__REV-2020-12__ES.pdf"
  }
];

const sha256 = (buf) => crypto.createHash("sha256").update(buf).digest("hex");

/**
 * Everything a verdict in this package is computed from.
 *
 * Hashing the artifact alone is not enough. The placement audit and the
 * protected-region proof are computed from the declared geometry -- the field
 * map or overlay profile, the census, the classification -- not from the PDF, so
 * a rerender that leaves an artifact byte-identical and moves only its derived
 * records still changes what those two proofs mean.
 *
 * The official source is watched for the same reason and a blunter one: this
 * wave renders it directly, so if its bytes moved mid-run the source raster and
 * the hash printed beside it would be of two different documents.
 */
const EVIDENCE_INPUTS = [
  ["artifact", "fixtures/canonical-filled.pdf"],
  ["contactSheet", "contact-sheet/blank-vs-filled.pdf"],
  ["fieldMap", "production-field-map.json"],
  ["overlayProfile", "overlay-profile.json"],
  ["overlayProfileDerived", "overlay-profile.derived.json"],
  ["census", "field-census.json"],
  ["classification", "field-classification.json"],
  ["populatedFields", "reports/populated-fields.json"]
];

/** The hash of every evidence input present in a family directory. */
function evidenceInputHashes(baseDir) {
  const out = {};
  for (const [key, rel] of EVIDENCE_INPUTS) {
    const file = path.join(baseDir, rel);
    out[key] = fs.existsSync(file) ? sha256(fs.readFileSync(file)) : null;
  }
  return out;
}
const readJson = (file, fallback = null) => {
  if (!fs.existsSync(file)) return fallback;
  try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch { return fallback; }
};
const round = (n) => Number(n.toFixed(2));

/** Greyscale pixels of a rendered page, with its dimensions. */
async function greyscale(pngPath, rect = null) {
  const pipeline = rect ? sharp(pngPath).extract(rect) : sharp(pngPath);
  const { data, info } = await pipeline.greyscale().raw().toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

/**
 * A one-page document holding just `pageIndex`.
 *
 * The viewer's `#page=N` anchor scrolls to a page, it does not isolate one: the
 * captured frame carries the following sheet page below the one asked for, and
 * everything measured after that is measuring two pages at once. Handing the
 * renderer a document with one page in it removes the ambiguity at the source.
 */
async function onePageDocument(bytes, pageIndex) {
  const source = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  const single = await PDFDocument.create();
  const [copied] = await single.copyPages(source, [pageIndex]);
  single.addPage(copied);
  single.setCreationDate(RENDER_DATE);
  single.setModificationDate(RENDER_DATE);
  return single.save({ useObjectStreams: false });
}

/**
 * Where the page sits inside the captured frame.
 *
 * The renderer letterboxes the page against its own dark viewer background,
 * and that background is darker than the ink threshold -- so measuring the
 * frame reports ink across its whole width and the gutter between the panels
 * can never be found. The page is the light region inside the dark one.
 */
async function pageRectangle(pngPath) {
  const { data, width, height } = await greyscale(pngPath);
  const background = data[0];
  const isBackground = (v) => Math.abs(v - background) <= 6;
  const columnIsBackground = (x) => {
    for (let y = 0; y < height; y += 3) if (!isBackground(data[y * width + x])) return false;
    return true;
  };
  const rowIsBackground = (y, x0, x1) => {
    for (let x = x0; x <= x1; x += 3) if (!isBackground(data[y * width + x])) return false;
    return true;
  };
  let left = 0;
  while (left < width && columnIsBackground(left)) left += 1;
  let right = width - 1;
  while (right > left && columnIsBackground(right)) right -= 1;
  let top = 0;
  while (top < height && rowIsBackground(top, left, right)) top += 1;
  let bottom = height - 1;
  while (bottom > top && rowIsBackground(bottom, left, right)) bottom -= 1;
  const inset = 3;
  const w = right - left + 1 - inset * 2;
  const h = bottom - top + 1 - inset * 2;
  if (w < 64 || h < 64) return null;
  return { left: left + inset, top: top + inset, width: w, height: h };
}

/** Decoded text of a content stream, or null when its filter is not one we read. */
function decodeStream(doc, ref) {
  const stream = doc.context.lookup(ref);
  if (!stream?.contents) return null;
  const raw = Buffer.from(stream.contents);
  const filter = stream.dict?.get(PDFName.of("Filter"));
  const name = filter ? String(filter) : "";
  if (!name) return raw.toString("latin1");
  if (name.includes("FlateDecode")) { try { return zlib.inflateSync(raw).toString("latin1"); } catch { return null; } }
  return null;
}

/**
 * The official layer and ours, separated by the structure the factory writes.
 *
 * Each page's content is an array opening with `q`, holding the official
 * source's own streams, closing with the matching `Q`, and then carrying
 * whatever the renderer appended. So the official layer is not reconstructed
 * from a picture -- it is the same stream objects the source shipped, and our
 * content is strictly after them.
 *
 * That is worth stating precisely, because "appended" is not the same as
 * "harmless". A flattened widget appearance can open with `1 g 0 0 w h re f`,
 * an opaque white box the width of its field, and paint out whatever the form
 * printed underneath. Which is why every placement is returned with its
 * rectangle and whether it covers.
 */
function splitLayers(doc, page) {
  const contents = page.node.get(PDFName.of("Contents"));
  if (!(contents instanceof PDFArray)) return { splittable: false, reason: "page content is a single stream" };
  const refs = [];
  for (let i = 0; i < contents.size(); i += 1) refs.push(contents.get(i));
  const decoded = refs.map((r) => decodeStream(doc, r));
  if (decoded.some((t) => t === null)) return { splittable: false, reason: "a content stream uses a filter this reader does not decode" };
  if (!decoded.length || decoded[0].trim() !== "q") return { splittable: false, reason: "page content does not open with the graphics-state push the factory writes" };
  const close = decoded.findIndex((t, i) => i > 0 && t.trim() === "Q");
  if (close < 0) return { splittable: false, reason: "page content has no matching graphics-state pop" };
  // An empty wrapper is not a preserved source. The mutation that removes the
  // source's own streams and leaves `q Q` behind would otherwise still read as
  // an intact official layer, which is the one thing this proof exists to deny.
  if (close - 1 < 1) return { splittable: false, reason: "the graphics-state wrapper carries no official source stream" };
  return { splittable: true, sourceRefs: refs.slice(0, close + 1), officialStreams: close - 1,
    overlayText: decoded.slice(close + 1).join("\n") };
}

/** Grey level of the last fill colour an XObject sets, if it sets one. */
function fillGreyOf(text) {
  let grey = null;
  for (const m of text.matchAll(/(?:^|\s)([\d.]+)\s+g(?=\s|$)/g)) grey = Number(m[1]);
  for (const m of text.matchAll(/(?:^|\s)([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+rg(?=\s|$)/g)) {
    grey = (Number(m[1]) + Number(m[2]) + Number(m[3])) / 3;
  }
  return grey;
}

/**
 * Every flattened widget appearance our layer places, with what it paints.
 *
 * `opaqueBox` is the finding that matters: a near-white rectangle filling the
 * appearance's own box. `promptText` is the other -- a chooser's placeholder,
 * or any text an appearance draws for a field the renderer never wrote, which
 * is the widget's own default surviving flattening. A widget-annotation count
 * cannot see either of them, because flattening moved both into the page.
 */
function overlayPlacements(doc, page, split, writtenFields) {
  const resources = doc.context.lookup(page.node.get(PDFName.of("Resources")));
  const xobjects = resources instanceof PDFDict ? doc.context.lookup(resources.get(PDFName.of("XObject"))) : null;
  const out = [];
  const re = /q\s+1\s+0\s+0\s+1\s+([-\d.]+)\s+([-\d.]+)\s+cm[\s\S]*?\/([^\s/]+)\s+Do/g;
  for (const m of split.overlayText.matchAll(re)) {
    const [x, y, name] = [Number(m[1]), Number(m[2]), m[3]];
    if (!(xobjects instanceof PDFDict)) continue;
    const ref = xobjects.get(PDFName.of(name));
    if (!ref) continue;
    const text = decodeStream(doc, ref);
    if (text === null) continue;
    const dict = doc.context.lookup(ref)?.dict;
    const bboxArr = dict ? doc.context.lookup(dict.get(PDFName.of("BBox"))) : null;
    const bbox = bboxArr instanceof PDFArray && bboxArr.size() === 4
      ? [0, 1, 2, 3].map((i) => Number(String(bboxArr.get(i)))) : null;
    const grey = fillGreyOf(text);
    const boxFill = /(?:^|\s)[\d.\s]*re\s+f\*?(?=\s|$)/.test(text);
    const runs = [...text.matchAll(/\(((?:\\.|[^\\()])*)\)\s*Tj/g)].map((r) => r[1]).filter((t) => t.trim());
    out.push({
      appearance: name,
      at: { x: round(x), y: round(y) },
      box: bbox ? { x: round(x + bbox[0]), y: round(y + bbox[1]), width: round(bbox[2] - bbox[0]), height: round(bbox[3] - bbox[1]) } : null,
      opaqueBox: Boolean(boxFill && grey !== null && grey >= 0.9),
      fillGrey: grey,
      textDrawn: runs
    });
  }
  return out;
}


/**
 * Standard Helvetica advance widths, in 1/1000 em, for the printable ASCII the
 * overlay writes.
 *
 * The overlay's fonts are `/Subtype /Type1 /BaseFont /Helvetica` with
 * WinAnsiEncoding -- one of the fourteen standard faces, not an embedded subset.
 * So these are the widths the viewer will actually use, and the advance computed
 * from them is the real one rather than an estimate. Anything outside this table
 * falls back to the width of `n`, and a placement that relied on the fallback is
 * marked so a reader knows not to treat its extent as exact.
 */
const HELVETICA_WIDTHS = {
  " ": 278, "!": 278, '"': 355, "#": 556, $: 556, "%": 889, "&": 667, "'": 191,
  "(": 333, ")": 333, "*": 389, "+": 584, ",": 278, "-": 333, ".": 278, "/": 278,
  0: 556, 1: 556, 2: 556, 3: 556, 4: 556, 5: 556, 6: 556, 7: 556, 8: 556, 9: 556,
  ":": 278, ";": 278, "<": 584, "=": 584, ">": 584, "?": 556, "@": 1015,
  A: 667, B: 667, C: 722, D: 722, E: 667, F: 611, G: 778, H: 722, I: 278, J: 500,
  K: 667, L: 556, M: 833, N: 722, O: 778, P: 667, Q: 778, R: 722, S: 667, T: 611,
  U: 722, V: 667, W: 944, X: 667, Y: 667, Z: 611,
  "[": 278, "\\": 278, "]": 278, "^": 469, _: 556, "`": 333,
  a: 556, b: 556, c: 500, d: 556, e: 556, f: 278, g: 556, h: 556, i: 222, j: 222,
  k: 500, l: 222, m: 833, n: 556, o: 556, p: 556, q: 556, r: 333, s: 500, t: 278,
  u: 556, v: 500, w: 722, x: 500, y: 500, z: 500,
  "{": 334, "|": 260, "}": 334, "~": 584
};

/** Advance width of a string at a font size, and whether every glyph was known. */
function helveticaAdvance(text, size) {
  let mils = 0;
  let exact = true;
  for (const ch of text) {
    const w = HELVETICA_WIDTHS[ch];
    if (w === undefined) { exact = false; mils += HELVETICA_WIDTHS.n; } else { mils += w; }
  }
  return { width: round((mils / 1000) * size), exact };
}

/**
 * Every string a content stream shows, in order.
 *
 * Three operators put text on a page and all three are read. Reading only
 * `(literal) Tj` is what a first pass here did, and AK TF-810's flattened
 * appearances write `<hex> Tj` exclusively -- so all 23 of its placements came
 * back with an empty value, its duplicate check had nothing to compare, and its
 * default-appearance proof reported clear because it had found no text to judge.
 * Three proofs passed on an extraction bug rather than on the bytes.
 */
function showsText(body) {
  const out = [];
  const re = /(?:<([0-9A-Fa-f\s]*)>|\(((?:\\.|[^\\()])*)\))\s*Tj|\[((?:[^\][]|\\.)*)\]\s*TJ/g;
  for (const m of body.matchAll(re)) {
    if (m[1] !== undefined) { out.push(pdfStringToText(m[1], true)); continue; }
    if (m[2] !== undefined) { out.push(pdfStringToText(m[2], false)); continue; }
    const parts = [...m[3].matchAll(/<([0-9A-Fa-f\s]*)>|\(((?:\\.|[^\\()])*)\)/g)]
      .map((q) => (q[1] !== undefined ? pdfStringToText(q[1], true) : pdfStringToText(q[2], false)));
    if (parts.length) out.push(parts.join(""));
  }
  return out.filter((t) => t.trim());
}

/** PDF string literal or hex string to the characters it encodes. */
function pdfStringToText(raw, isHex) {
  if (isHex) {
    const hex = raw.replace(/\s+/g, "");
    let out = "";
    for (let i = 0; i + 1 < hex.length; i += 2) out += String.fromCharCode(parseInt(hex.slice(i, i + 2), 16));
    return out;
  }
  return raw.replace(/\\([nrtbf()\\])/g, (m, c) => ({ n: "\n", r: "\r", t: "\t", b: "\b", f: "\f" }[c] ?? c));
}

/**
 * The declared geometry for a family, whichever file carries it.
 *
 * An acroform family gets a production-field-map.json; a flat_pdf family gets an
 * overlay-profile.json. They are the same schema under two names, and reading
 * only the first would silently treat all three flat families here as having
 * declared nothing at all -- which is exactly the state a leaked write would
 * hide behind.
 */
function declaredGeometry(baseDir) {
  for (const name of ["production-field-map.json", "overlay-profile.json"]) {
    const file = path.join(baseDir, name);
    const json = readJson(file);
    if (json) return { file: name, map: json };
  }
  return { file: null, map: null };
}

/**
 * Every value our layer draws on a page, with where it drew it.
 *
 * Two shapes reach the page and both are read. A flattened acroform widget is an
 * XObject invoked through `cm ... /Name Do`, and its text lives inside the form.
 * A flat_pdf overlay writes text directly, positioning it with `Tm`. Reading only
 * the first shape would report every flat family as drawing nothing -- and all
 * three of them do draw.
 */
function overlayWrites(doc, page, split) {
  const out = [];
  const resources = doc.context.lookup(page.node.get(PDFName.of("Resources")));
  const xobjects = resources instanceof PDFDict ? doc.context.lookup(resources.get(PDFName.of("XObject"))) : null;

  const widget = /q\s+1\s+0\s+0\s+1\s+([-\d.]+)\s+([-\d.]+)\s+cm[\s\S]*?\/([^\s/]+)\s+Do/g;
  for (const m of split.overlayText.matchAll(widget)) {
    const [x, y, name] = [Number(m[1]), Number(m[2]), m[3]];
    if (!(xobjects instanceof PDFDict)) continue;
    const ref = xobjects.get(PDFName.of(name));
    if (!ref) continue;
    const text = decodeStream(doc, ref);
    if (text === null) continue;
    const dict = doc.context.lookup(ref)?.dict;
    const bboxArr = dict ? doc.context.lookup(dict.get(PDFName.of("BBox"))) : null;
    const bbox = bboxArr instanceof PDFArray && bboxArr.size() === 4
      ? [0, 1, 2, 3].map((i) => Number(String(bboxArr.get(i)))) : null;
    const grey = fillGreyOf(text);
    const boxFill = /(?:^|\s)[\d.\s]*re\s+f\*?(?=\s|$)/.test(text);
    const runs = showsText(text);
    // The appearance clips its own text with `W n` over a rectangle inset inside
    // its BBox. That rectangle, not the BBox, is what the viewer will actually
    // show -- so it is what a clipping question has to be asked against.
    const clipPath = /([\d.]+)\s+([\d.]+)\s+m\s+[\d.]+\s+([\d.]+)\s+l\s+([\d.]+)\s+[\d.]+\s+l[\s\S]*?\bW\s+n/.exec(text);
    const clip = clipPath
      ? { x: Number(clipPath[1]), y: Number(clipPath[2]), width: round(Number(clipPath[4]) - Number(clipPath[1])), height: round(Number(clipPath[3]) - Number(clipPath[2])) }
      : null;
    const innerTf = /\/([^\s/]+)\s+([\d.]+)\s+Tf/.exec(text);
    const innerTm = /([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+Tm/.exec(text);
    const innerSize = innerTf ? Number(innerTf[2]) : null;
    const joinedRuns = runs.join("");
    const innerAdvance = innerSize === null || !joinedRuns ? null : helveticaAdvance(joinedRuns, innerSize);
    out.push({
      how: "flattened widget appearance",
      appearance: name,
      at: { x: round(x), y: round(y) },
      box: bbox ? { x: round(x + bbox[0]), y: round(y + bbox[1]), width: round(bbox[2] - bbox[0]), height: round(bbox[3] - bbox[1]) } : null,
      clipBox: clip ? { x: round(x + clip.x), y: round(y + clip.y), width: clip.width, height: clip.height } : null,
      textOrigin: innerTm ? { x: round(x + Number(innerTm[5])), y: round(y + Number(innerTm[6])) } : null,
      opaqueBox: Boolean(boxFill && grey !== null && grey >= 0.9),
      fillGrey: grey,
      textDrawn: runs,
      fontSize: innerSize,
      advance: innerAdvance
    });
  }

  const direct = /BT\b([\s\S]*?)\bET\b/g;
  for (const block of split.overlayText.matchAll(direct)) {
    const body = block[1];
    const tf = /\/([^\s/]+)\s+([\d.]+)\s+Tf/.exec(body);
    const tm = /([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+Tm/.exec(body);
    const show = showsText(body);
    if (!show.length) continue;
    const size = tf ? Number(tf[2]) : null;
    const x = tm ? Number(tm[5]) : null;
    const y = tm ? Number(tm[6]) : null;
    const joined = show.join("");
    const adv = size === null ? null : helveticaAdvance(joined, size);
    out.push({
      how: "text drawn directly by the overlay",
      appearance: tf ? tf[1] : null,
      at: x === null ? null : { x: round(x), y: round(y) },
      box: x === null || adv === null ? null
        : { x: round(x), y: round(y), width: adv.width, height: round(size * 1.25) },
      opaqueBox: false,
      fillGrey: fillGreyOf(body),
      textDrawn: show,
      fontSize: size,
      advance: adv
    });
  }
  return out;
}

/** Every declared write rectangle, from bindings and from captured anchors alike. */
function declaredSlots(map) {
  const slots = [];
  for (const b of map?.bindings ?? []) {
    slots.push({ from: "binding", field: b.field ?? null, factId: b.factId ?? null, page: b.page ?? null, box: b.writeBox ?? b.rect ?? null });
  }
  for (const a of map?.anchorCapture?.anchors ?? []) {
    slots.push({ from: "anchor", field: a.label ?? null, factId: a.factId ?? null, page: a.page ?? null, box: a.writeBox ?? null });
  }
  return slots;
}

/**
 * Whether a drawn value stayed inside the rectangle that was declared for it.
 *
 * Clipping is not a cosmetic complaint on a court filing: a county name that runs
 * past its rule and under the next printed cell is either unreadable or reads as
 * belonging to a field it does not belong to. The advance width here is computed
 * from the standard Helvetica metrics the overlay's own font dictionary names, so
 * the extent is the real one.
 */
function clippingOf(write, slots) {
  const value = write.textDrawn.join("");
  if (!value.trim()) return null;
  // A flattened appearance carries its own answer: the `W n` rectangle is what
  // the viewer will clip the text to, and the text's own origin and advance say
  // how far it runs. No declared slot is needed, and none would be as exact.
  if (write.how === "flattened widget appearance") {
    if (!write.clipBox || !write.textOrigin || !write.advance) {
      return { value, declaredSlot: null, verdict: "this appearance does not express a clip rectangle, a text origin and a font size together, so its extent is not measurable" };
    }
    const overhang = round(write.textOrigin.x + write.advance.width - (write.clipBox.x + write.clipBox.width));
    return {
      value,
      declaredSlot: { from: "appearance clip rectangle", field: write.appearance, factId: null, box: write.clipBox },
      drawnBox: { x: write.textOrigin.x, y: write.textOrigin.y, width: write.advance.width, height: round((write.fontSize ?? 0) * 1.25) },
      advanceIsExact: write.advance.exact,
      overhangPt: overhang,
      clipped: overhang > 0.5
    };
  }
  if (!write.box) return null;
  const slot = slots.find((s) => s.box && Math.abs(s.box.x - write.box.x) <= 1 && Math.abs(s.box.y - write.box.y) <= 1)
    ?? slots.find((s) => s.box && s.page === write.page);
  if (!slot?.box) return { value, declaredSlot: null, verdict: "no declared rectangle to measure against" };
  const overhang = round(write.box.x + write.box.width - (slot.box.x + slot.box.width));
  return {
    value,
    declaredSlot: { from: slot.from, field: slot.field, factId: slot.factId, box: slot.box },
    drawnBox: write.box,
    advanceIsExact: write.advance?.exact ?? false,
    overhangPt: overhang,
    clipped: overhang > 0.5
  };
}

/** Values our layer drew more than once on the same page. */
function duplicatePlacements(writes) {
  const seen = new Map();
  for (const w of writes) {
    const value = w.textDrawn.join("").trim();
    if (!value) continue;
    const key = `${w.page}:${value}`;
    if (!seen.has(key)) seen.set(key, []);
    seen.get(key).push({ page: w.page, at: w.at, appearance: w.appearance, how: w.how });
  }
  return [...seen.entries()]
    .filter(([, at]) => at.length > 1)
    .map(([key, at]) => ({ page: at[0].page, value: key.slice(key.indexOf(":") + 1), times: at.length, occurrences: at }));
}

/** How a surviving default appearance reads on a filing. */
function classifyResidue(text) {
  const joined = text.join(" ").trim();
  if (/^(choose|select|seleccion|chon|chọn)\b/i.test(joined)) return "unselected chooser prompt";
  if (/^(print|reset|save|clear|submit)\s*form$/i.test(joined.replace(/\s+/g, " "))) return "command button";
  if (text.length > 20) return "unselected chooser option list";
  return "flattened caption or label";
}

/** Interactive machinery that survived flattening, by widget count. */
async function widgetSurvival(bytes) {
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  const acroForm = doc.catalog.get(PDFName.of("AcroForm"));
  let acroFieldCount = 0;
  let needAppearances = null;
  if (acroForm) {
    const dict = doc.context.lookup(acroForm);
    const fields = dict?.get?.(PDFName.of("Fields"));
    const resolved = fields ? doc.context.lookup(fields) : null;
    acroFieldCount = resolved instanceof PDFArray ? resolved.size() : 0;
    const need = dict?.get?.(PDFName.of("NeedAppearances"));
    needAppearances = need === undefined ? null : String(need) === "true";
  }
  let widgetAnnotations = 0;
  for (const page of doc.getPages()) {
    const annots = page.node.get(PDFName.of("Annots"));
    const resolved = annots ? doc.context.lookup(annots) : null;
    if (!(resolved instanceof PDFArray)) continue;
    for (let i = 0; i < resolved.size(); i += 1) {
      const annot = doc.context.lookup(resolved.get(i));
      const subtype = annot?.get?.(PDFName.of("Subtype"));
      if (subtype && String(subtype) === "/Widget") widgetAnnotations += 1;
    }
  }
  const flat = acroFieldCount === 0 && widgetAnnotations === 0 && needAppearances !== true;
  return { acroFormPresent: Boolean(acroForm), acroFieldCount, widgetAnnotations, needAppearances, flat };
}

/** Rasterize one page of one document into OUT_DIR, cached by content. */
async function rasterOnePage({ bytes, pageIndex, tmpRoot, outName }) {
  const single = await onePageDocument(bytes, pageIndex);
  const key = sha256(Buffer.concat([Buffer.from(single), Buffer.from(String(SCALE))]));
  const work = path.join(tmpRoot, key);
  fs.mkdirSync(work, { recursive: true });
  const pdf = path.join(work, "page.pdf");
  fs.writeFileSync(pdf, single);
  const rendered = await rasterizePdf({ file: pdf, outDir: work, pages: [1], scale: SCALE, prefix: "p" });
  const src = rendered[0]?.file ?? rendered[0];
  const rect = await pageRectangle(src);
  const dest = path.join(OUT_DIR, outName);
  if (rect) await sharp(src).extract(rect).png().toFile(dest);
  else fs.copyFileSync(src, dest);
  const meta = await sharp(dest).metadata();
  return { image: outName, sha256: sha256(fs.readFileSync(dest)), widthPx: meta.width, heightPx: meta.height, croppedToPage: Boolean(rect) };
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "rcap-lane1-"));
  const families = [];
  const hashesBefore = {};
  const hashesAfter = {};
  const sourceBefore = {};
  const sourceAfter = {};

  for (const entry of WAVE) {
    const base = path.join(PRODUCTION, entry.dir);
    const artifactPath = path.join(base, "fixtures/canonical-filled.pdf");
    const sourcePath = path.join(SOURCE_ROOT, entry.source);
    if (!fs.existsSync(sourcePath)) throw new Error(`the installed source pack is missing ${entry.source} — run the pack's install.sh first`);

    const artifactBytes = fs.readFileSync(artifactPath);
    const sourceBytes = fs.readFileSync(sourcePath);
    const currentArtifactSha256 = sha256(artifactBytes);
    const currentSourceSha256 = sha256(sourceBytes);
    hashesBefore[entry.familyId] = evidenceInputHashes(base);
    sourceBefore[entry.familyId] = currentSourceSha256;

    const census = readJson(path.join(base, "field-census.json"));
    const { file: geometryFile, map } = declaredGeometry(base);
    const populated = readJson(path.join(base, "reports/populated-fields.json")) ?? [];
    const fieldPages = pagesRequiringRaster(census);
    // Every fixture value this family actually binds, from its declarations --
    // bindings and captured anchors alike, since a flat_pdf family declares only
    // the second kind.
    const boundValues = [...new Set([
      ...(map?.bindings ?? []).map((b) => CANONICAL[b.factId]),
      ...(map?.anchorCapture?.anchors ?? []).map((a) => CANONICAL[a.factId]),
      ...populated.map((r) => CANONICAL[r.factId])
    ])].filter((v) => typeof v === "string" && v.length >= 2);

    const artifactDoc = await PDFDocument.load(artifactBytes, { ignoreEncryption: true, updateMetadata: false });
    const sourceDoc = await PDFDocument.load(sourceBytes, { ignoreEncryption: true, updateMetadata: false });
    const artifactPageCount = artifactDoc.getPageCount();
    const sourcePageCount = sourceDoc.getPageCount();
    // Every page, not every field page. Three of these four declare no fields at
    // all, so a package scoped to field pages would hold no pictures and still
    // report itself complete.
    const requiredPages = Array.from({ length: artifactPageCount }, (_, i) => i + 1);

    const slug = entry.familyId.replace(":", "-");
    const rasters = [];
    const pages = [];
    const blankRasters = [];

    for (const pageNumber of requiredPages) {
      for (const [of_, bytes, count] of [["source", sourceBytes, sourcePageCount], ["finalized", artifactBytes, artifactPageCount]]) {
        if (pageNumber > count) continue;
        const row = await rasterOnePage({
          bytes, pageIndex: pageNumber - 1, tmpRoot,
          outName: `${slug}-${of_}-page-${String(pageNumber).padStart(2, "0")}.png`
        });
        rasters.push({
          page: pageNumber, of: of_,
          image: path.relative(rootDir, path.join(OUT_DIR, row.image)),
          sha256: row.sha256, widthPx: row.widthPx, heightPx: row.heightPx, croppedToPage: row.croppedToPage,
          boundTo: of_ === "source" ? currentSourceSha256 : currentArtifactSha256
        });
      }

      const page = artifactDoc.getPages()[pageNumber - 1];
      const split = splitLayers(artifactDoc, page);
      const writes = split.splittable
        ? overlayWrites(artifactDoc, page, split).map((w) => ({ ...w, page: pageNumber }))
        : [];
      const covering = writes.filter((w) => w.opaqueBox && w.box);
      const slots = declaredSlots(map).filter((s) => s.page === null || s.page === pageNumber);
      const clipping = writes.map((w) => clippingOf(w, slots)).filter(Boolean);

      pages.push({
        page: pageNumber,
        carriesACensusField: fieldPages.includes(pageNumber),
        ourLayerTouchesThisPage: split.splittable,
        whyNot: split.splittable ? undefined : split.reason,
        images: rasters.filter((r) => r.page === pageNumber).map((r) => path.basename(r.image)),
        writes,
        sourceTextPreservation: split.splittable
          ? {
            officialLayerIntact: true,
            officialStreamsCarriedForward: split.officialStreams,
            ourContentIsStrictlyAppended: true,
            opaqueBoxesPaintedOverThePage: covering.map((c) => ({ appearance: c.appearance, box: c.box, fillGrey: c.fillGrey }))
          }
          : { officialLayerIntact: "untouched", because: split.reason, opaqueBoxesPaintedOverThePage: [] },
        clipping,
        // Text an appearance draws that is not any value this family binds is the
        // widget's own default, flattened onto the filing. Judging every
        // appearance as residue would call the participant's own name a defect;
        // judging none would be the vacuous answer in the other direction.
        defaultAppearanceResidue: writes
          .filter((w) => w.textDrawn.length)
          .filter((w) => w.how === "flattened widget appearance")
          .filter((w) => !w.textDrawn.some((t) => boundValues.some((v) => v && t.includes(v))))
          .map((w) => ({ appearance: w.appearance, box: w.box, kind: classifyResidue(w.textDrawn),
            text: w.textDrawn.length > 12 ? [...w.textDrawn.slice(0, 6), `…and ${w.textDrawn.length - 6} more`] : w.textDrawn }))
      });
    }

    const allWrites = pages.flatMap((p) => p.writes);
    // The audit is run against what the page actually carries, not against a
    // report's list of what it should. On a family whose populated-fields report
    // is empty and whose artifact still draws two values, a values map built from
    // the report would have nothing to look for and would come back clean.
    const values = {};
    for (const w of allWrites) {
      const text = w.textDrawn.join("").trim();
      if (text.length >= 2) values[`drawn:${w.page}:${round(w.at?.x ?? 0)},${round(w.at?.y ?? 0)}`] = text;
    }
    const audit = auditPlacements({ doc: artifactDoc, census, map, values });

    const declaredBindings = (map?.bindings ?? []).map((b) => String(b.field));
    const writtenFields = populated.filter((r) => r.written !== false).map((r) => String(r.field ?? r.name ?? r));
    const reconciliation = reconcileWrittenAgainstDeclared({
      writtenFields, declaredBindings,
      refusedFields: [...(map?.bindingRefusals ?? []), ...populated.filter((r) => r.written === false)]
    });

    const slotsAll = declaredSlots(map);
    // The question a zero-binding family actually poses. Three of these four
    // declare no binding and no refusal, and all three still draw two values on
    // page 1. Asking only "was every declaration written?" answers yes for them.
    // Matched by rectangle where a declaration carries one, and by value where it
    // does not. AK TF-810's bindings name a field and a factId and no geometry at
    // all, so a rectangle-only test called all six of its real, declared writes
    // undeclared -- a finding invented by the test rather than found in the bytes.
    const slotsWithGeometry = slotsAll.filter((sl) => sl.box);
    const declaredValues = new Set(slotsAll.map((sl) => CANONICAL[sl.factId]).filter((v) => typeof v === "string" && v.length >= 2));
    const undeclaredWrites = allWrites
      .filter((w) => w.textDrawn.join("").trim().length >= 2)
      .filter((w) => {
        const value = w.textDrawn.join("").trim();
        if (declaredValues.has(value)) return false;
        return !slotsWithGeometry.some((sl) => w.box
          && Math.abs(sl.box.x - w.box.x) <= 1 && Math.abs(sl.box.y - w.box.y) <= 1);
      })
      .map((w) => ({ page: w.page, value: w.textDrawn.join("").trim(), at: w.at, how: w.how, appearance: w.appearance,
        because: "no declaration of this family names this value, and none declares a rectangle at this position" }));

    const pixelIdenticalPages = [];
    const pixelDifferentPages = [];
    for (const pageNumber of requiredPages) {
      const src = rasters.find((r) => r.page === pageNumber && r.of === "source");
      const fin = rasters.find((r) => r.page === pageNumber && r.of === "finalized");
      if (!src || !fin) continue;
      (src.sha256 === fin.sha256 ? pixelIdenticalPages : pixelDifferentPages).push(pageNumber);
    }

    const censusDeclaresWidgets = (census?.fieldCount ?? 0) > 0;
    // Containment for a family whose declarations are anchors: the value has to
    // sit inside the rectangle its own anchor declared, not merely near it.
    const outsideDeclaredAnchor = allWrites
      .filter((w) => w.box && w.textDrawn.join("").trim().length >= 2)
      .filter((w) => !declaredValues.has(w.textDrawn.join("").trim()) || slotsWithGeometry.length > 0)
      .filter((w) => {
        const slot = slotsAll.find((sl) => sl.box && (sl.page === null || sl.page === w.page)
          && w.box.x >= sl.box.x - 1 && w.box.y >= sl.box.y - 1
          && w.box.x + w.box.width <= sl.box.x + sl.box.width + 1);
        return !slot;
      })
      .map((w) => ({ page: w.page, value: w.textDrawn.join("").trim(), at: w.at, box: w.box,
        because: "this value sits inside no rectangle the family declared for it" }));

    // A value two distinct declarations legitimately carry is not a duplicate
    // defect: AK TF-810 binds participant.full_legal_name to both `name` and
    // `partyNames`, so the name appearing twice is the map being honoured. A
    // repeat with no second declaration behind it is the finding.
    const declarationsCarrying = (value) => [
      ...(map?.bindings ?? []), ...(map?.anchorCapture?.anchors ?? [])
    ].filter((d) => CANONICAL[d.factId] === value).length;
    const duplicates = duplicatePlacements(allWrites).map((d) => {
      const declared = declarationsCarrying(d.value);
      return { ...d, distinctDeclarationsCarryingThisValue: declared,
        accountedForByDeclarations: declared >= d.times };
    });
    const clippedValues = pages.flatMap((p) => p.clipping).filter((c) => c.clipped);
    const unmeasurable = pages.flatMap((p) => p.clipping).filter((c) => c.declaredSlot === null);
    const coveredPages = pages.filter((p) => p.sourceTextPreservation.opaqueBoxesPaintedOverThePage.length);
    const unsplittableTouched = pages.filter((p) => p.ourLayerTouchesThisPage === false && p.writes.length);
    const residuePages = pages.filter((p) => p.defaultAppearanceResidue.length);
    const survival = await widgetSurvival(artifactBytes);
    const blank = rasters.filter((r) => r.looksBlank);

    const coverage = rasterContract({
      requiredPages,
      renderedPages: [...new Set(rasters.filter((r) => r.of === "finalized").map((r) => r.page))],
      manifestArtifactSha256: currentArtifactSha256,
      currentArtifactSha256
    });

    const manifest = {
      schemaVersion: "rcap-lane1-wavea-visual-evidence/v1",
      evidenceContract: EVIDENCE_CONTRACT_VERSION,
      generatedBy: "scripts/verify-rcap-lane1-wavea-visual-evidence.mjs",
      familyId: entry.familyId,
      officialSource: {
        pathInPack: entry.source,
        sha256: currentSourceSha256,
        pageCount: sourcePageCount,
        censusPinsThisSha256: census?.sha256 === currentSourceSha256,
        basis: "rendered from the official PDF this pack installed, not from a contact sheet, and hashed from the same bytes the renderer was handed"
      },
      artifact: {
        path: path.relative(rootDir, artifactPath),
        currentArtifactSha256,
        pageCount: artifactPageCount,
        structuralClass: census?.structuralClass ?? null,
        censusFieldCount: census?.fieldCount ?? 0,
        declaredGeometryFile: geometryFile,
        pagesCarryingACensusField: fieldPages,
        pagesRasterized: [...new Set(rasters.map((r) => r.page))].sort((a, b) => a - b)
      },
      computedFrom: hashesBefore[entry.familyId],
      rasterCoverage: {
        ...coverage,
        everyPageOfBothDocuments: rasters.length === requiredPages.length * 2,
        blankRasters: blank.map((b) => b.image),
        basis: "every page of the official source and every page of the finalized artifact, because three of these four families declare no field and a field-page package would hold no pictures at all"
      },
      placementProof: {
        participantValuesPlaced: allWrites.length,
        basis: allWrites.length === 0
          ? "this family draws nothing: no value was invented so that this proof would have something to find"
          : "every value the finalized bytes actually draw, read from the page content streams with its own coordinates",
        placements: allWrites.map((w) => ({ page: w.page, value: w.textDrawn.join(""), at: w.at, box: w.box, how: w.how, appearance: w.appearance })),
        // The contract answers containment against the census's widget
        // rectangles. A flat_pdf family has none, so every value it draws lands
        // in no widget and the contract reports each one outside intended
        // geometry -- which describes the census, not a misplaced value. On such
        // a family the declared rectangle is the captured anchor's writeBox, so
        // that is what containment is decided against, and the contract's answer
        // is carried through labelled rather than dropped or restated as a defect.
        containmentDecidedAgainst: censusDeclaresWidgets ? "census widget rectangles" : "captured anchor writeBox rectangles",
        placedOutsideIntendedGeometry: censusDeclaresWidgets ? audit.placedOutsideIntendedGeometry : outsideDeclaredAnchor,
        contractSaidOutsideItsOwnGeometry: censusDeclaresWidgets ? undefined : {
          count: audit.placedOutsideIntendedGeometry.length,
          because: "this family's census declares no widget rectangle, so the contract's containment test has nothing to contain against; it is not a finding about where the value landed"
        },
        declaredButNeverDrawn: audit.declaredButNeverDrawn,
        writtenButNeverDeclared: undeclaredWrites,
        declarationsCarryingNoRectangle: slotsAll.filter((sl) => !sl.box)
          .map((sl) => ({ from: sl.from, field: sl.field, factId: sl.factId,
            because: "this declaration names a field and a fact and no geometry, so where its value may land is not something this family states" })),
        clean: (censusDeclaresWidgets ? audit.placedOutsideIntendedGeometry.length : outsideDeclaredAnchor.length) === 0
          && undeclaredWrites.length === 0
      },
      protectedRegionProof: {
        drawnIntoAProtectedSlot: audit.drawnIntoAProtectedSlot,
        basis: "auditPlacements attributes an occurrence to the rectangle that contains it and refuses one that lands in a slot or page region the participant does not complete",
        clear: audit.drawnIntoAProtectedSlot.length === 0
      },
      sourceTextPreservation: {
        basis: "the official layer is the source's own content streams inside a q/Q wrapper with our content strictly appended, so nothing in it is rewritten; what can still hide printed text is an opaque box our layer paints on top, so every such box is listed with its rectangle",
        pagesOurLayerTouches: pages.filter((p) => p.ourLayerTouchesThisPage).map((p) => p.page),
        pagesLeftExactlyAsTheSourceShippedThem: pages.filter((p) => !p.ourLayerTouchesThisPage).map((p) => p.page),
        // An independent confirmation of the structural claim, at the pixel level:
        // a page our layer never appended to must render identically from the
        // official source and from the finalized artifact. It does not read the
        // content streams at all, so it fails separately if the stream-splitting
        // above were ever wrong.
        pagesRenderingPixelIdenticalToTheSource: pixelIdenticalPages,
        pagesRenderingDifferentlyFromTheSource: pixelDifferentPages,
        everyUntouchedPageIsPixelIdentical: pages.filter((p) => !p.ourLayerTouchesThisPage).every((p) => pixelIdenticalPages.includes(p.page)),
        pagesCarryingAnOpaqueBoxOverThePage: coveredPages.map((p) => p.page),
        opaqueBoxCount: coveredPages.reduce((n, p) => n + p.sourceTextPreservation.opaqueBoxesPaintedOverThePage.length, 0),
        pagesWhereOurLayerCouldNotBeSeparated: unsplittableTouched.map((p) => p.page),
        clear: coveredPages.length === 0 && unsplittableTouched.length === 0
      },
      clippingAndDuplicatePlacementProof: {
        basis: "extent computed from the standard Helvetica metrics the overlay's own font dictionary names, measured against the rectangle the family declared for that value",
        measured: pages.flatMap((p) => p.clipping),
        clipped: clippedValues,
        withoutADeclaredRectangleToMeasureAgainst: unmeasurable.map((c) => ({ value: c.value, verdict: c.verdict })),
        duplicatePlacements: duplicates,
        unaccountedDuplicates: duplicates.filter((d) => !d.accountedForByDeclarations),
        clean: clippedValues.length === 0 && unmeasurable.length === 0
          && duplicates.every((d) => d.accountedForByDeclarations)
      },
      defaultAppearances: {
        ...survival,
        verdict: survival.flat
          ? "flat: no widget survives to draw a chooser prompt, comb or default appearance"
          : "NOT FLAT: interactive machinery survives and will draw its own appearance on the filing",
        flattenedPromptsOnThePage: residuePages.map((p) => ({ page: p.page, residue: p.defaultAppearanceResidue })),
        chooserPromptsSurviving: residuePages.reduce((n, p) => n + p.defaultAppearanceResidue.filter((r) => r.kind.startsWith("unselected")).length, 0),
        commandButtonsSurviving: residuePages.reduce((n, p) => n + p.defaultAppearanceResidue.filter((r) => r.kind === "command button").length, 0),
        clear: survival.flat && residuePages.length === 0,
        note: "A count of surviving widget annotations cannot see a default appearance that flattening moved into the page. Both are asked here."
      },
      writtenAgainstDeclared: reconciliation,
      pages: pages.map(({ writes, ...rest }) => rest),
      rasters
    };
    manifest.visualManifestHash = sha256(Buffer.from(JSON.stringify(manifest)));

    const manifestPath = path.join(OUT_DIR, `${slug}-visual-manifest.json`);
    const manifestJson = `${JSON.stringify(manifest, null, 2)}\n`;
    if (checkOnly) {
      const current = fs.existsSync(manifestPath) ? fs.readFileSync(manifestPath, "utf8") : "";
      if (current !== manifestJson) {
        console.error(`FAIL ${entry.familyId} — ${path.relative(rootDir, manifestPath)} is stale`);
        process.exitCode = 1;
      }
    } else {
      fs.writeFileSync(manifestPath, manifestJson);
    }

    hashesAfter[entry.familyId] = evidenceInputHashes(base);
    sourceAfter[entry.familyId] = sha256(fs.readFileSync(sourcePath));
    families.push(manifest);
    console.log(`  ${entry.familyId} — ${requiredPages.length} page(s), ${rasters.length} rasters, ${allWrites.length} value(s) drawn, manifest ${manifest.visualManifestHash.slice(0, 12)}`);
  }

  const moved = [];
  for (const familyId of Object.keys(hashesBefore)) {
    for (const [key] of EVIDENCE_INPUTS) {
      if (hashesBefore[familyId][key] !== hashesAfter[familyId][key]) moved.push(`${familyId}:${key}`);
    }
    if (sourceBefore[familyId] !== sourceAfter[familyId]) moved.push(`${familyId}:officialSource`);
  }

  const index = {
    schemaVersion: "rcap-lane1-wavea-visual-evidence-index/v1",
    evidenceContract: EVIDENCE_CONTRACT_VERSION,
    generatedBy: "scripts/verify-rcap-lane1-wavea-visual-evidence.mjs",
    lane: "LANE-EVIDENCE",
    wave: "lane1-wavea",
    purpose: "Every page of the official source and of the finalized artifact for the four lane 1 batch 01 families, bound by hash to the bytes the pictures are of.",
    sourcePack: {
      packId: "family-rerender-lane-1-batch-01",
      installedUnder: path.relative(rootDir, SOURCE_ROOT),
      basis: "official source PDFs installed from the verified pack; each family's field census independently pins the same sha256"
    },
    currentByteGuard: {
      basis: "every input a verdict in this package is computed from, including the official source this run rendered directly",
      inputsWatched: [...EVIDENCE_INPUTS.map(([key, rel]) => ({ key, path: rel })), { key: "officialSource", path: "installed source pack" }],
      hashesBefore, hashesAfter, sourceBefore, sourceAfter,
      anyEvidenceInputChangedDuringTheRun: moved.length > 0, changed: moved
    },
    totals: {
      familiesCovered: families.length,
      pagesCovered: families.reduce((n, f) => n + f.artifact.pageCount, 0),
      rasters: families.reduce((n, f) => n + f.rasters.length, 0),
      familiesWithCompleteCoverage: families.filter((f) => f.rasterCoverage.complete && f.rasterCoverage.everyPageOfBothDocuments).length,
      familiesDrawingNoValueAtAll: families.filter((f) => f.placementProof.participantValuesPlaced === 0).length,
      valuesDrawnAcrossTheWave: families.reduce((n, f) => n + f.placementProof.participantValuesPlaced, 0),
      familiesDrawingAValueTheyNeverDeclared: families.filter((f) => f.placementProof.writtenButNeverDeclared.length > 0).length,
      familiesWhoseDeclarationsCarryNoRectangle: families.filter((f) => f.placementProof.declarationsCarryingNoRectangle.length > 0).length,
      familiesWithAProtectedRegionIntrusion: families.filter((f) => !f.protectedRegionProof.clear).length,
      familiesPaintingAnOpaqueBoxOverThePage: families.filter((f) => f.sourceTextPreservation.opaqueBoxCount > 0).length,
      familiesNotFlat: families.filter((f) => !f.defaultAppearances.flat).length,
      familiesCarryingAFlattenedDefaultAppearance: families.filter((f) => !f.defaultAppearances.clear).length,
      familiesWithAClippedValue: families.filter((f) => f.clippingAndDuplicatePlacementProof.clipped.length > 0).length,
      familiesWithADuplicatePlacement: families.filter((f) => f.clippingAndDuplicatePlacementProof.duplicatePlacements.length > 0).length,
      familiesWithADuplicateNoDeclarationAccountsFor: families.filter((f) => f.clippingAndDuplicatePlacementProof.unaccountedDuplicates.length > 0).length,
      familiesWithAValueNoRectangleCouldBeMeasuredAgainst: families.filter((f) => f.clippingAndDuplicatePlacementProof.withoutADeclaredRectangleToMeasureAgainst.length > 0).length,
      familiesWhoseSourceHashTheCensusConfirms: families.filter((f) => f.officialSource.censusPinsThisSha256).length,
      familiesWhereEveryUntouchedPageRendersPixelIdenticalToTheSource: families.filter((f) => f.sourceTextPreservation.everyUntouchedPageIsPixelIdentical).length
    },
    families: families.map((f) => ({
      familyId: f.familyId,
      structuralClass: f.artifact.structuralClass,
      officialSourceSha256: f.officialSource.sha256,
      currentArtifactSha256: f.artifact.currentArtifactSha256,
      visualManifestHash: f.visualManifestHash,
      pages: f.artifact.pageCount,
      rasters: f.rasters.length,
      valuesDrawn: f.placementProof.participantValuesPlaced,
      placementClean: f.placementProof.clean,
      protectedRegionsClear: f.protectedRegionProof.clear,
      sourceTextPreserved: f.sourceTextPreservation.clear,
      flat: f.defaultAppearances.flat,
      defaultAppearancesClear: f.defaultAppearances.clear,
      clippingAndDuplicatesClean: f.clippingAndDuplicatePlacementProof.clean,
      manifest: path.relative(rootDir, path.join(OUT_DIR, `${f.familyId.replace(":", "-")}-visual-manifest.json`))
    }))
  };

  const indexPath = path.join(OUT_DIR, "index.json");
  const indexJson = `${JSON.stringify(index, null, 2)}\n`;
  if (checkOnly) {
    const current = fs.existsSync(indexPath) ? fs.readFileSync(indexPath, "utf8") : "";
    if (current !== indexJson) {
      console.error(`FAIL lane1 wave A visual evidence — ${path.relative(rootDir, indexPath)} is stale`);
      process.exitCode = 1;
    }
  } else {
    fs.writeFileSync(indexPath, indexJson);
  }

  if (moved.length) {
    console.error(`FAIL current-byte guard — evidence inputs moved during the run: ${moved.join(", ")}`);
    process.exitCode = 1;
  }
  fs.rmSync(tmpRoot, { recursive: true, force: true });
  console.log(`OK lane1 wave A visual evidence — ${index.totals.familiesCovered} families, ${index.totals.pagesCovered} pages, ${index.totals.rasters} rasters`);
}

/**
 * Mutations for every proof this file decides.
 *
 * All four families come back clean on every question, which is the result that
 * most needs checking: a proof that has never been seen to refuse anything is
 * indistinguishable from one that cannot. Two of these already caught real bugs
 * in this file rather than in the artifacts -- M2 is the extraction bug that had
 * AK's 23 placements reporting empty values, and M5 is the rectangle-only match
 * that called six declared writes undeclared. Each breaks a real artifact in
 * memory and requires the answer to change. Nothing is written to disk.
 */
async function runMutations() {
  const results = [];
  const record = (id, title, held, detail) => {
    results.push({ id, title, held });
    console.log(`  ${held ? "ok  " : "FAIL"} ${id} — ${title}`);
    console.log(`         ${detail}`);
  };
  const AK = path.join(PRODUCTION, "alaska/tf-810-form-en");
  const NC = path.join(PRODUCTION, "north-carolina/aoc-cr-287-form-es");
  const load = async (dir) => {
    const bytes = fs.readFileSync(path.join(dir, "fixtures/canonical-filled.pdf"));
    return { bytes, doc: await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false }) };
  };
  const reload = async (doc) => PDFDocument.load(await doc.save({ useObjectStreams: false }), { ignoreEncryption: true, updateMetadata: false });
  const appendAppearance = (doc, page, name, body, bbox) => {
    const xobj = doc.context.register(doc.context.stream(body, {
      Type: "XObject", Subtype: "Form", FormType: 1, BBox: doc.context.obj(bbox), Resources: doc.context.obj({})
    }));
    const resources = doc.context.lookup(page.node.get(PDFName.of("Resources")));
    let table = resources instanceof PDFDict ? doc.context.lookup(resources.get(PDFName.of("XObject"))) : null;
    if (!(table instanceof PDFDict)) { table = doc.context.obj({}); resources.set(PDFName.of("XObject"), table); }
    table.set(PDFName.of(name), xobj);
    page.node.get(PDFName.of("Contents")).push(doc.context.register(doc.context.stream(`q 1 0 0 1 90 500 cm /${name} Do Q`)));
  };
  const writesOf = async (doc) => {
    const page = doc.getPages()[0];
    const split = splitLayers(doc, page);
    return { split, writes: split.splittable ? overlayWrites(doc, page, split).map((w) => ({ ...w, page: 1 })) : [] };
  };

  // M1 — the source's own streams removed. The wrapper must stop reading as an
  // intact official layer rather than reading as an intact empty one.
  {
    const { doc } = await load(AK);
    const page = doc.getPages()[0];
    const before = splitLayers(doc, page);
    const contents = page.node.get(PDFName.of("Contents"));
    const refs = []; for (let i = 0; i < contents.size(); i += 1) refs.push(contents.get(i));
    const close = before.sourceRefs.length - 1;
    page.node.set(PDFName.of("Contents"), doc.context.obj([refs[0], refs[close], ...refs.slice(close + 1)]));
    const after = splitLayers(await reload(doc), (await reload(doc)).getPages()[0]);
    record("M1", "source text: strip the source's own streams and the official layer stops reading as preserved",
      before.splittable && before.officialStreams >= 1 && after.splittable === false,
      `intact: officialStreams=${before.officialStreams}; stripped: splittable=${after.splittable}, reason=${after.reason ?? "none"}`);
  }

  // M2 — hex, literal and TJ-array text must all be read. This is the bug that
  // had AK's 23 placements come back with empty values and three proofs pass on
  // having found nothing to judge.
  {
    const hex = showsText("BT <4A6F7264616E> Tj ET");
    const lit = showsText("BT (Jordan) Tj ET");
    const arr = showsText("BT [<4A6F72> 2 (dan)] TJ ET");
    const { doc } = await load(AK);
    const { writes } = await writesOf(doc);
    const withText = writes.filter((w) => w.textDrawn.join("").trim());
    record("M2", "every text operator is read: hex, literal and TJ array alike, and AK's real values come out non-empty",
      hex[0] === "Jordan" && lit[0] === "Jordan" && arr[0] === "Jordan" && withText.length === 6,
      `hex=${JSON.stringify(hex)}, literal=${JSON.stringify(lit)}, TJ=${JSON.stringify(arr)}; AK appearances carrying text: ${withText.length} of ${writes.length}`);
  }

  // M3 — an opaque white box appended over a family that paints none.
  {
    const clean = await load(AK);
    const cleanBoxes = (await writesOf(clean.doc)).writes.filter((w) => w.opaqueBox);
    const { doc } = await load(AK);
    appendAppearance(doc, doc.getPages()[0], "MutantWhiteBox", "1 g 0 0 180 24 re f", [0, 0, 180, 24]);
    const boxes = (await writesOf(await reload(doc))).writes.filter((w) => w.opaqueBox);
    record("M3", "source text: an opaque white box appended over the page is seen, on a family that paints none",
      cleanBoxes.length === 0 && boxes.length === 1 && boxes[0].fillGrey === 1,
      `unmutated: ${cleanBoxes.length} opaque box(es); mutated: ${boxes.length}, fillGrey=${boxes[0]?.fillGrey ?? "none"}`);
  }

  // M4 — a chooser prompt and a command button injected, beside a real fixture
  // value. The first two must be classified as surviving defaults; the third must
  // not be called residue, because participant text on the page is the renderer
  // doing its job.
  {
    const { doc } = await load(AK);
    const page = doc.getPages()[0];
    appendAppearance(doc, page, "MutantChooser", "BT /Helv 9 Tf (Choose the court) Tj ET", [0, 0, 120, 14]);
    appendAppearance(doc, page, "MutantButton", "BT /Helv 9 Tf (Print Form) Tj ET", [0, 0, 60, 14]);
    appendAppearance(doc, page, "MutantWritten", `BT /Helv 9 Tf (${CANONICAL["participant.full_legal_name"]}) Tj ET`, [0, 0, 120, 14]);
    const { writes } = await writesOf(await reload(doc));
    const bound = [CANONICAL["participant.full_legal_name"]];
    const residue = writes.filter((w) => w.textDrawn.length)
      .filter((w) => w.how === "flattened widget appearance")
      .filter((w) => !w.textDrawn.some((t) => bound.some((v) => t.includes(v))))
      .map((w) => classifyResidue(w.textDrawn));
    record("M4", "residue: an injected chooser prompt and Print Form are classified, and an injected participant value is not",
      residue.includes("unselected chooser prompt") && residue.includes("command button")
      && !writes.filter((w) => w.textDrawn.some((t) => t.includes(bound[0]))).some((w) => residue.includes(w.appearance)),
      `classified: ${JSON.stringify([...new Set(residue)])}; the participant value was drawn and was not called residue`);
  }

  // M5 — a value drawn that no declaration names. The rectangle-only version of
  // this test called AK's six real declared writes undeclared; the value-matching
  // version must accept those six and still refuse a genuinely foreign one.
  {
    const map = declaredGeometry(AK).map;
    const slots = declaredSlots(map);
    const declaredValues = new Set(slots.map((sl) => CANONICAL[sl.factId]).filter((v) => typeof v === "string" && v.length >= 2));
    const { doc } = await load(AK);
    appendAppearance(doc, doc.getPages()[0], "MutantForeign",
      "BT /Helv 9 Tf (Cordelia Nakamura-Whitfield) Tj ET", [0, 0, 160, 14]);
    const { writes } = await writesOf(await reload(doc));
    const undeclared = writes.filter((w) => w.textDrawn.join("").trim().length >= 2)
      .filter((w) => !declaredValues.has(w.textDrawn.join("").trim()))
      .map((w) => w.textDrawn.join("").trim());
    record("M5", "placement: a value no declaration names is refused, and the six AK declares are not",
      undeclared.length === 1 && undeclared[0] === "Cordelia Nakamura-Whitfield",
      `declarations with no rectangle: ${slots.filter((sl) => !sl.box).length}; values refused as undeclared: ${JSON.stringify(undeclared)}`);
  }

  // M6 — clipping, measured against an appearance's own clip rectangle, and a
  // duplicate no declaration accounts for.
  {
    const { doc } = await load(AK);
    const { writes } = await writesOf(doc);
    const real = writes.find((w) => w.clipBox && w.textOrigin && w.advance);
    const overlong = { ...real, textDrawn: ["M".repeat(80)], advance: helveticaAdvance("M".repeat(80), real.fontSize) };
    const okClip = clippingOf(real, []);
    const badClip = clippingOf(overlong, []);
    const dupWrites = [
      { page: 1, textDrawn: ["Stray Value"], at: { x: 1, y: 1 }, appearance: "A", how: "flattened widget appearance" },
      { page: 1, textDrawn: ["Stray Value"], at: { x: 2, y: 2 }, appearance: "B", how: "flattened widget appearance" }
    ];
    const dups = duplicatePlacements(dupWrites);
    record("M6", "clipping and duplicates: an overlong value overruns its own clip rectangle, and a repeat is counted",
      okClip?.clipped === false && badClip?.clipped === true && dups.length === 1 && dups[0].times === 2,
      `real value overhang ${okClip?.overhangPt}pt (clipped=${okClip?.clipped}); 80-character value overhang ${badClip?.overhangPt}pt (clipped=${badClip?.clipped}); duplicate detected ${dups.length === 1 ? `${dups[0].times}x` : "not at all"}`);
  }

  // M7 — a derived record moved while the artifact stood still. Two of these four
  // families have exactly that between this base and the previous one.
  {
    const before = evidenceInputHashes(NC);
    const copy = fs.mkdtempSync(path.join(os.tmpdir(), "rcap-guard-"));
    for (const [, rel] of EVIDENCE_INPUTS) {
      const from = path.join(NC, rel);
      if (!fs.existsSync(from)) continue;
      const to = path.join(copy, rel);
      fs.mkdirSync(path.dirname(to), { recursive: true });
      fs.copyFileSync(from, to);
    }
    const target = path.join(copy, "field-classification.json");
    const json = JSON.parse(fs.readFileSync(target, "utf8"));
    json.__mutation = "one derived record re-derived, artifact untouched";
    fs.writeFileSync(target, JSON.stringify(json, null, 2));
    const after = evidenceInputHashes(copy);
    const changed = EVIDENCE_INPUTS.map(([key]) => key).filter((key) => before[key] !== after[key]);
    fs.rmSync(copy, { recursive: true, force: true });
    record("M7", "current-byte guard: a moved classification is caught even though the artifact is byte-identical",
      before.artifact === after.artifact && changed.length === 1 && changed[0] === "classification",
      `artifact unchanged: ${before.artifact === after.artifact}; inputs reported moved: ${changed.join(", ") || "none"}`);
  }

  const held = results.filter((r) => r.held).length;
  if (held !== results.length) {
    console.error(`FAIL lane1 wave A mutations — ${held}/${results.length} held`);
    process.exitCode = 1;
    return;
  }
  console.log(`OK lane1 wave A mutations — ${held}/${results.length} held; every proof in this file shown to refuse and to accept`);
}

if (mutationsOnly) await runMutations();
else await main();
