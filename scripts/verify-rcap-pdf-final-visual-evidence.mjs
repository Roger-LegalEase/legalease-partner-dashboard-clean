#!/usr/bin/env node
// Final visual evidence for the 38-family PDF finish wave, at freeze f34fe99d.
//
//   node scripts/verify-rcap-pdf-final-visual-evidence.mjs
//   node scripts/verify-rcap-pdf-final-visual-evidence.mjs --check
//   node scripts/verify-rcap-pdf-final-visual-evidence.mjs --mutations
//
// Every official-source raster in this package is rendered from the official
// file the pdf-finish-final-evidence pack installed under private/, whose bytes
// are re-hashed here against the pack manifest before anything is drawn from
// them. There is no fallback and no substitute: not a layer lifted out of a
// finalized artifact, not a contact-sheet panel, not an older raster, and not a
// receipt or manifest digest standing in for bytes. A family whose official
// source is absent or does not hash to its pinned digest produces no source
// raster and is reported blocked.
//
// THE WAVE IS NOT ONE SHAPE
//
// Eight of the 38 families produce a filing artifact. Thirty correctly produce
// none, and they are not failures: an instructional sheet is read rather than
// filed, a translation is published for reference with the English version the
// one that gets filed, an outside party or the clerk completes some forms, and
// one Vermont packet's fixture is withdrawn. For those, terminal evidence is
// the official source rendered in full plus the assertions that make the
// absence checkable -- no participant artifact, nothing stale left in the
// package, the disposition still saying what it said at the freeze.
//
// Six families are captured HTML index pages rather than court forms. They get
// a capture raster labelled as a capture, and no artifact comparison is
// manufactured for them, because there is no filing PDF to compare against and
// drawing one would be inventing the thing the evidence exists to check.
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
import { extractTextItems } from "./rcap-official-forms/rcap-pdf-anchor-capture.mjs";
import { scanBytesForActiveContent } from "./rcap-official-forms/rcap-active-content.mjs";
import { CANONICAL } from "./implement-rcap-official-forms-d1.mjs";

const require = createRequire(import.meta.url);
const sharp = require("sharp");
const { PDFDocument, PDFName, PDFArray, PDFDict } = require("pdf-lib");

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PRODUCTION = path.join(rootDir, "data/rcap-all50/overlays/production");
const OUT_DIR = path.join(rootDir, "docs/record-clearing/pdf-visual-evidence/pdf-finish-final");
const PACK_MANIFEST = path.join(OUT_DIR, "source-pack-manifest.json");
const FREEZE_SHA = "f34fe99d8760805eef219c4014664a87f6e90e50";
const checkOnly = process.argv.includes("--check");
const mutationsOnly = process.argv.includes("--mutations");
const SCALE = 2;
const RENDER_DATE = new Date("2026-01-01T00:00:00Z");
const INK_MAX_GREY = 190;

const JURISDICTION_DIR = {
  AL: "alabama", AK: "alaska", AR: "arkansas", KY: "kentucky", NC: "north-carolina",
  NE: "nebraska", VA: "virginia", VT: "vermont", WI: "wisconsin"
};

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

/**
 * The official source PDF for a family, or the reason there is not one.
 *
 * The path comes from the family's own source-record, which pins both the
 * canonical bundle path and the sha256 of the bytes that record was derived
 * from. Both are checked. A file at the right path whose bytes hash to
 * something else is not the official source and is refused with the two hashes
 * printed, because a picture of near-enough bytes captioned with the pinned
 * digest is worse evidence than no picture at all.
 *
 * There is deliberately no fallback. An earlier generator, faced with an
 * absent pack, lifted the official layer out of the finalized artifact and
 * rendered that instead. It produces a plausible image of the form, but it is
 * an image of the artifact, so it cannot show anything the artifact did to the
 * form -- it is the artifact vouching for itself. When the source is missing
 * this refuses and says so per family.
 */
function officialSourcePdf(sourceRecord) {
  const bundlePath = sourceRecord?.canonicalBundlePath ?? null;
  const pinned = sourceRecord?.sha256 ?? null;
  if (!bundlePath) return { ok: false, code: "NO_CANONICAL_PATH_RECORDED", because: "this family's source-record names no canonicalBundlePath, so there is no official file to look for" };
  // canonicalBundlePath is recorded relative to the library root's parent.
  const candidates = [
    path.join(SOURCE_ROOT, bundlePath.replace(/^Expungement_AI_RCAP_Master_Library_Edition_1\//, "")),
    path.join(path.dirname(SOURCE_ROOT), bundlePath)
  ];
  const file = candidates.find((c) => fs.existsSync(c)) ?? null;
  if (!file) {
    return {
      ok: false, code: "OFFICIAL_SOURCE_NOT_PRESENT", bundlePath, pinnedSha256: pinned,
      lookedIn: candidates.map((c) => path.relative(rootDir, c)),
      because: "the official PDF this family pins is not mounted in this clone, and no official-source raster can be made without it"
    };
  }
  const bytes = fs.readFileSync(file);
  const got = sha256(bytes);
  if (pinned && got !== pinned) {
    return {
      ok: false, code: "OFFICIAL_SOURCE_HASH_MISMATCH", bundlePath, pinnedSha256: pinned, actualSha256: got,
      path: path.relative(rootDir, file),
      because: "a file is present at the pinned path but its bytes are not the bytes this family's records were derived from"
    };
  }
  return { ok: true, bytes, sha256: got, pinnedSha256: pinned, path: path.relative(rootDir, file), bundlePath };
}

/**
 * Whether the official source says on its face that it must not be filed.
 *
 * The three NC translations carry a printed notice -- "THIS FORM IS FOR
 * INFORMATIONAL PURPOSES ONLY. DO NOT COMPLETE THIS FORM FOR FILING. USE THE
 * ENGLISH VERSION" and its Spanish or Vietnamese counterpart. Their overlay
 * profiles nonetheless record documentOwnership `participant_completed`, and the
 * artifacts write participant values onto them.
 *
 * The notice is read out of the source's own glyphs rather than taken from any
 * record, because the record is the thing it contradicts.
 */
const DO_NOT_FILE_PHRASES = [
  /informational purposes only/i,
  /do not complete this form for filing/i,
  /use the english\s+version/i,
  /s[oó]lo se dispone para fines informativos/i,
  /no lo debe presentar en el\s+tribunal/i,
  /ch[ỉi] d[ùu]ng cho m[ụu]c [đd][íi]ch th[ôo]ng tin/i,
  /kh[ôo]ng [đd][ưu][ợo]c [đd][iî][ềe]n v[àa]o m[ẫa]u/i
];

function doNotFileNotice(sourceItems) {
  const joined = sourceItems.map((i) => String(i.text ?? "")).join(" ").replace(/\s+/g, " ");
  const hits = [];
  for (const rx of DO_NOT_FILE_PHRASES) {
    const m = rx.exec(joined);
    if (m) hits.push(m[0].trim());
  }
  return {
    basis: "read from the official source's own glyphs, decoded through each font's ToUnicode map",
    phrasesFound: hits,
    theSourceSaysItMustNotBeFiled: hits.length > 0
  };
}

/**
 * Where a drawn value sits relative to the ink the source already prints.
 *
 * This is the question a declared rectangle cannot answer about itself. NC
 * AOC-CR-287's County anchor declares a writeBox at x=283 on baseline 669.8; the
 * form prints the word "County" with glyphs running to x=331.26 on that same
 * baseline. A containment test against the anchor calls that placement perfect,
 * because the anchor is where the value went. Measuring the value against the
 * source's own glyphs is what shows it landed on top of the caption.
 *
 * Overlap is computed against visible glyphs only. An item's declared width can
 * include trailing spaces, and counting those as ink would manufacture
 * collisions out of whitespace.
 */
// A run of underscores, dots or dashes is a blank the form draws for a value to
// be written on, not printed text a value can collide with. Writing "Jordan
// Avery Reyes" across `________________` is the form being filled in; counting
// it as a collision reported four families as overwriting the document when
// what they overwrote was the blank.
const FILL_GLYPHS = /^[_.\u00b7\u2026\u2014\u2013\-\s]+$/;
const isFillRun = (chars) => FILL_GLYPHS.test(chars.map((c) => c.c).join(""));

function sourceInkCollisions(write, sourceItems, { baselineTolerance = 3 } = {}) {
  if (!write.box) return [];
  const value = write.textDrawn.join("").trim();
  if (!value) return [];
  const left = write.box.x;
  const right = write.box.x + write.box.width;
  const out = [];
  for (const item of sourceItems) {
    const all = (item.chars ?? []).filter((c) => String(c.c).trim());
    if (!all.length) continue;
    const baselineDelta = round(item.y - write.box.y);
    if (Math.abs(baselineDelta) > baselineTolerance) continue;
    // Overlap is measured against the item's real characters only. An item can
    // be a caption followed by its own blank -- "Case No.____________" -- and a
    // value sitting on those underscores has collided with nothing.
    const glyphs = all.filter((c) => !FILL_GLYPHS.test(c.c));
    if (!glyphs.length || isFillRun(all)) continue;
    // Overlap against contiguous runs of real characters, not against the
    // envelope from the first to the last. "Defendant's Birthdate:____________"
    // is one item whose printed characters stop long before its blank ends, and
    // an envelope measurement charged a value sitting on that blank with an 84pt
    // collision against a caption it never touches.
    const runs = [];
    for (const c of glyphs) {
      const last = runs[runs.length - 1];
      if (last && c.x - (last.to) <= 1.5) { last.to = c.x + c.w; last.text += c.c; }
      else runs.push({ from: c.x, to: c.x + c.w, text: c.c });
    }
    let overlap = 0; let hitFrom = null; let hitTo = null; let hitText = "";
    for (const r of runs) {
      const o = Math.min(right, r.to) - Math.max(left, r.from);
      if (o <= 0.5) continue;
      if (o > overlap) { overlap = o; hitFrom = r.from; hitTo = r.to; hitText = r.text; }
    }
    overlap = round(overlap);
    if (overlap <= 0.5) continue;
    const inkLeft = hitFrom;
    const inkRight = hitTo;
    out.push({
      sourceText: hitText,
      wholeItem: glyphs.map((c) => c.c).join("").slice(0, 60),
      sourceInkFrom: round(inkLeft),
      sourceInkTo: round(inkRight),
      note: all.length !== glyphs.length ? "the item's trailing rule characters are excluded; this overlap is with its printed characters" : undefined,
      sourceBaselineY: round(item.y),
      ourValueFrom: round(left),
      ourValueTo: round(right),
      baselineDeltaPt: baselineDelta,
      horizontalOverlapPt: overlap
    });
  }
  return out;
}

/**
 * The blank a trailing-label caption actually leaves, and whether the value used it.
 *
 * A trailing_label anchor means the caption is printed and the blank runs to its
 * right. So the writable run starts where the caption's last glyph ends, not
 * where an estimate says the caption began. NC AOC-CR-287's County anchor puts
 * its writeBox left edge at 283 with `leftEdgeEstimatedFromLabelWidth: true`,
 * and the caption's glyphs run to 331.26 -- the estimate is 48pt short, so the
 * value starts on the caption and the blank to the right of it is left unused.
 */
function writableRunFor(write, slot, sourceItems, { baselineTolerance = 1.5 } = {}) {
  if (!write.box || !slot?.box) return null;
  const onLine = sourceItems
    .filter((i) => Math.abs(i.y - write.box.y) <= baselineTolerance)
    .map((i) => (i.chars ?? []).filter((c) => String(c.c).trim()))
    .filter((g) => g.length);
  const captionEnds = onLine
    .map((g) => g[g.length - 1].x + g[g.length - 1].w)
    .filter((x) => x <= write.box.x + write.box.width)
    .sort((a, b) => b - a)[0] ?? null;
  if (captionEnds === null) return null;
  const runFrom = round(captionEnds);
  // The blank ends where the next thing the form prints on this line begins, not
  // where the declared writeBox happens to stop. AOC-CR-287's County anchor
  // declares a 293pt box running to x=576, but the form prints "District" at
  // x=384 on that same line -- so the blank is 53pt wide, not 244pt, and a
  // 73pt value does not fit in it at all. Bounding the run by the declared box
  // would have reported 220pt of unused blank that does not exist.
  const nextInkRight = sourceItems
    .filter((i) => Math.abs(i.y - write.box.y) <= 3)
    .map((i) => (i.chars ?? []).filter((c) => String(c.c).trim()))
    .filter((g) => g.length && g[0].x > runFrom + 0.5)
    .map((g) => g[0].x)
    .sort((a, b) => a - b)[0] ?? null;
  const runTo = round(Math.min(slot.box.x + slot.box.width, nextInkRight ?? Infinity));
  const runWidth = round(runTo - runFrom);
  const valueWidth = round(write.box.width);
  return {
    value: write.textDrawn.join("").trim(),
    declaredWriteBox: slot.box,
    printedCaptionEndsAt: runFrom,
    blankRunsFrom: runFrom,
    blankRunsTo: runTo,
    ourValueFrom: round(write.box.x),
    ourValueTo: round(write.box.x + write.box.width),
    blankEndsBecause: nextInkRight !== null && nextInkRight < slot.box.x + slot.box.width
      ? "the form prints its next character on this line here"
      : "the declared write box stops here",
    blankWidthPt: runWidth,
    valueWidthPt: valueWidth,
    startsThisFarLeftOfTheBlankPt: round(runFrom - write.box.x),
    valueStartsBeforeTheBlank: write.box.x < runFrom - 0.5,
    valueFitsInsideTheBlank: valueWidth <= runWidth + 0.5
  };
}

/**
 * Whether a value was written on a caption's own line.
 *
 * A caption names the blank; the blank is beneath or beside it. A value sharing
 * a caption's baseline is not in the writable area, whatever rectangle was
 * declared for it -- and on a court filing that reads as the caption having been
 * overwritten rather than as the field having been completed.
 */
function captionLinePlacement(write, sourceItems, { baselineTolerance = 1.5 } = {}) {
  if (!write.box) return null;
  const value = write.textDrawn.join("").trim();
  if (!value) return null;
  // Sharing a baseline with something 400pt away on the other side of the page
  // is not sitting on a caption -- KY AOC-496's revision stamp shares a baseline
  // with the case number and means nothing about it. Only printed characters
  // near the value, and not the blank the form draws, are its caption.
  const sameLine = sourceItems
    .filter((i) => Math.abs(i.y - write.box.y) <= baselineTolerance)
    .map((i) => ({ i, chars: (i.chars ?? []).filter((c) => String(c.c).trim()) }))
    .filter(({ chars }) => chars.length > 1 && !isFillRun(chars))
    .map(({ chars }) => {
      const real = chars.filter((c) => !FILL_GLYPHS.test(c.c));
      return real.length ? { text: real.map((c) => c.c).join(""), x: round(real[0].x), right: round(real[real.length - 1].x + real[real.length - 1].w) } : null;
    })
    .filter(Boolean)
    .filter((i) => i.right > write.box.x - 40 && i.x < write.box.x + write.box.width + 40)
    .filter((i) => i.text.length > 1);
  // The nearest printed line below the caption line is where a writable area
  // would begin, so it is reported alongside for comparison.
  const below = sourceItems
    .filter((i) => (i.chars ?? []).some((c) => String(c.c).trim()))
    .filter((i) => i.y < write.box.y - baselineTolerance && i.y > write.box.y - 24)
    .sort((a, b) => b.y - a.y)[0];
  return {
    value,
    ourBaselineY: round(write.box.y),
    printedTextOnThisExactBaseline: sameLine,
    nearestPrintedLineBelow: below ? { text: (below.chars ?? []).filter((c) => String(c.c).trim()).map((c) => c.c).join(""), y: round(below.y) } : null,
    sitsOnAPrintedCaptionLine: sameLine.length > 0
  };
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
  const joined = text.join(" ").replace(/\\05[01]/g, "").replace(/\s+/g, " ").trim();
  if (/^(choose|select|seleccion|chon|chọn)\b/i.test(joined)) return "unselected chooser prompt";
  // A placeholder telling the filer what to type is the same defect class as a
  // chooser prompt: it is the field's own instruction printed onto the filing.
  if (/^\(?\s*(enter|type|insert|fill in|specify)\b/i.test(joined)) return "unselected chooser prompt";
  if (/^(print|reset|save|clear|submit)\s*form$/i.test(joined)) return "command button";
  if (text.length > 20) return "unselected chooser option list";
  return "flattened caption or label";
}

/**
 * Whether text an appearance draws came from the form or from the participant.
 *
 * "COUNTY, NEBRASKA" is printed on NE CC-6:11 by the form itself, in a field the
 * participant never completes; flattening moves it into the appended layer, so
 * it reads structurally exactly like a value we wrote. Counting it as an
 * undeclared participant write, which a first pass here did, invents a defect
 * out of the form's own caption -- and the standing instruction is not to flag
 * source-inherent text as a generated leak.
 *
 * A string is participant-derived when it is one of the fixture values this
 * family binds. Everything else an appearance draws came with the document.
 */
function isParticipantDerived(text, boundValues) {
  const t = text.join("").trim();
  if (t.length < 2) return false;
  return boundValues.some((v) => v && t.includes(v));
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
  // The rasteriser now returns the page already cropped to its paper. Running
  // the surround-trimmer over that would find white at the corner, take it for
  // background, and trim the page's own margins away to the ink -- so it is
  // used only for a frame that still carries a surround.
  const rect = rendered[0]?.croppedToPage ? null : await pageRectangle(src);
  const dest = path.join(OUT_DIR, outName);
  if (rect) await sharp(src).extract(rect).png().toFile(dest);
  else fs.copyFileSync(src, dest);
  const meta = await sharp(dest).metadata();
  return { image: outName, sha256: sha256(fs.readFileSync(dest)), widthPx: meta.width, heightPx: meta.height,
    croppedToPage: Boolean(rect) || Boolean(rendered[0]?.croppedToPage) };
}


/** The family package directory for a family id. */
function familyDir(familyId) {
  const [jur, slug] = familyId.split(":");
  return path.join(PRODUCTION, JURISDICTION_DIR[jur] ?? jur.toLowerCase(), slug);
}

/**
 * The installed official source for a pack member, re-hashed here.
 *
 * The pack verified its members on the way in. This verifies them again on the
 * way out, from the installed path, because what matters to a raster is the
 * bytes the renderer was handed and not the bytes an installer once saw.
 */
function installedSource(member) {
  const file = path.join(rootDir, member.destination);
  if (!fs.existsSync(file)) {
    return { ok: false, code: "OFFICIAL_SOURCE_NOT_INSTALLED", destination: member.destination, pinnedSha256: member.sha256,
      because: "the pack member is not present at its installed destination, and no official-source raster can be made without it" };
  }
  const bytes = fs.readFileSync(file);
  const got = sha256(bytes);
  if (got !== member.sha256 || bytes.length !== member.byteLength) {
    return { ok: false, code: "OFFICIAL_SOURCE_HASH_MISMATCH", destination: member.destination,
      pinnedSha256: member.sha256, actualSha256: got, pinnedBytes: member.byteLength, actualBytes: bytes.length,
      because: "a file is installed at the pinned destination but its bytes are not the bytes the pack manifest names" };
  }
  return { ok: true, bytes, sha256: got, byteLength: bytes.length, destination: member.destination, kind: /\.html?$/i.test(member.destination) ? "html" : "pdf" };
}

/** A capture raster of an HTML source, rendered as a page and labelled as a capture. */
async function rasterHtmlCapture({ htmlPath, tmpRoot, outName }) {
  const { chromium } = require("playwright");
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? "/opt/pw-browsers/chromium", args: ["--no-sandbox"] });
  try {
    const page = await browser.newPage({ viewport: { width: 1200, height: 1600 } });
    await page.goto(`file://${htmlPath}`, { waitUntil: "load", timeout: 60000 });
    await page.waitForTimeout(1200);
    const dest = path.join(OUT_DIR, outName);
    await page.screenshot({ path: dest, fullPage: true });
    const meta = await sharp(dest).metadata();
    return { image: outName, sha256: sha256(fs.readFileSync(dest)), widthPx: meta.width, heightPx: meta.height };
  } finally { await browser.close(); }
}

/** Whether a family package still carries a participant-populated artifact. */
function participantArtifactsIn(dir) {
  const fixtures = path.join(dir, "fixtures");
  if (!fs.existsSync(fixtures)) return [];
  return fs.readdirSync(fixtures).filter((n) => n.toLowerCase().endsWith(".pdf"))
    .map((n) => ({ file: path.relative(rootDir, path.join(fixtures, n)), sha256: sha256(fs.readFileSync(path.join(fixtures, n))) }));
}

/** Structural facts a filing must satisfy: nothing interactive survives. */
async function structuralResult(bytes) {
  const survival = await widgetSurvival(bytes);
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  let annotations = 0;
  for (const page of doc.getPages()) {
    const a = page.node.get(PDFName.of("Annots"));
    const r = a ? doc.context.lookup(a) : null;
    if (r instanceof PDFArray) annotations += r.size();
  }
  const scan = scanBytesForActiveContent(bytes);
  const activeHits = Array.isArray(scan) ? scan.length : (scan?.hits?.length ?? scan?.count ?? 0);
  return {
    liveFields: survival.acroFieldCount,
    widgets: survival.widgetAnnotations,
    annotations,
    needAppearances: survival.needAppearances,
    activeContentHits: activeHits,
    activeContentDetail: Array.isArray(scan) ? scan : (scan ?? null),
    clean: survival.acroFieldCount === 0 && survival.widgetAnnotations === 0 && annotations === 0 && activeHits === 0
  };
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "rcap-final-"));
  const pack = JSON.parse(fs.readFileSync(PACK_MANIFEST, "utf8"));
  const families = [];
  const blocked = [];

  for (const member of pack.members) {
    const familyId = member.familyIds[0];
    const dir = familyDir(familyId);
    const slug = familyId.replace(/:/g, "-");
    const source = installedSource(member);
    if (!source.ok) {
      blocked.push({ familyId, ...source, noSubstituteWasRendered: "no source raster was produced: nothing was used in place of the official file" });
      console.log(`  ${familyId} — BLOCKED ${source.code}`);
      continue;
    }

    const artifactPath = path.join(dir, "fixtures/canonical-filled.pdf");
    const boundaryPath = path.join(dir, "fixtures/boundary-filled.pdf");
    const hasArtifact = fs.existsSync(artifactPath);
    const record = {
      schemaVersion: "rcap-pdf-final-visual-evidence/v1",
      evidenceContract: EVIDENCE_CONTRACT_VERSION,
      generatedBy: "scripts/verify-rcap-pdf-final-visual-evidence.mjs",
      freezeSha: FREEZE_SHA,
      familyId,
      officialSource: {
        installedAt: source.destination,
        sha256: source.sha256,
        byteLength: source.byteLength,
        kind: source.kind,
        packManifestPinsThisSha256: true,
        basis: "rendered from the official file this pack installed, re-hashed from the same bytes the renderer was handed"
      },
      rasters: [],
      pages: []
    };

    // ---------- captured HTML index families ----------
    if (source.kind === "html") {
      const capture = await rasterHtmlCapture({ htmlPath: path.join(rootDir, source.destination), tmpRoot, outName: `${slug}-source-capture.png` });
      record.disposition = {
        kind: "captured_index_or_guidance",
        terminalOutcome: readJson(path.join(dir, "implementation-proof.json"))?.outcome ?? null,
        thisIsNotAFilingArtifact: "the source is a captured index page, not a court form; the raster below is labelled a capture and no filing-artifact comparison exists to draw",
        participantArtifactsInPackage: participantArtifactsIn(dir),
        noFilingPdfIsExpected: true,
        noArtifactRasterWasManufactured: true
      };
      record.rasters.push({ of: "source-capture", image: path.relative(rootDir, path.join(OUT_DIR, capture.image)),
        sha256: capture.sha256, widthPx: capture.widthPx, heightPx: capture.heightPx,
        boundTo: source.sha256, boundToWhat: "the installed official HTML capture" });
      record.terminalEvidenceComplete = record.disposition.participantArtifactsInPackage.length === 0;
      families.push(record);
      console.log(`  ${familyId} — captured index, 1 capture raster, no filing artifact expected`);
      writeManifest(record, slug);
      continue;
    }

    // ---------- everything below is a PDF source ----------
    const sourceDoc = await PDFDocument.load(source.bytes, { ignoreEncryption: true, updateMetadata: false });
    const sourcePageCount = sourceDoc.getPageCount();
    const sourceItemsByPage = new Map();
    for (let i = 0; i < sourcePageCount; i += 1) sourceItemsByPage.set(i + 1, extractTextItems(sourceDoc.getPages()[i]));
    record.officialSource.pageCount = sourcePageCount;
    record.officialSource.notice = doNotFileNotice([...sourceItemsByPage.values()].flat());

    for (let p = 1; p <= sourcePageCount; p += 1) {
      const row = await rasterOnePage({ bytes: source.bytes, pageIndex: p - 1, tmpRoot, outName: `${slug}-source-page-${String(p).padStart(2, "0")}.png` });
      record.rasters.push({ page: p, of: "source", image: path.relative(rootDir, path.join(OUT_DIR, row.image)),
        sha256: row.sha256, widthPx: row.widthPx, heightPx: row.heightPx, croppedToPage: row.croppedToPage,
        boundTo: source.sha256, boundToWhat: "the installed official source PDF" });
    }

    const sourceRecord = readJson(path.join(dir, "source-record.json")) ?? {};
    const withdrawn = readJson(path.join(dir, "fixtures/withdrawn.json"));

    if (!hasArtifact) {
      const present = participantArtifactsIn(dir);
      record.disposition = {
        kind: "no_participant_artifact_by_terminal_state",
        implementationStatus: sourceRecord.implementationStatus ?? null,
        documentRole: sourceRecord.documentRole ?? null,
        documentOwnership: sourceRecord.documentOwnership ?? null,
        ownershipDetermination: sourceRecord.ownershipDetermination ?? null,
        participantFillable: sourceRecord.participantFillable ?? null,
        generationAllowed: sourceRecord.generationAllowed ?? null,
        productionHolds: sourceRecord.productionHolds ?? [],
        withdrawnFixture: withdrawn ?? null,
        participantArtifactsInPackage: present,
        zeroParticipantArtifact: present.length === 0,
        zeroStalePopulatedArtifact: present.length === 0,
        anIntentionallyAbsentArtifactIsNotAVisualFailure:
          "this family's terminal state requires that no participant PDF exist; the evidence records the official source in full and the absence, and manufactures nothing to compare it against"
      };
      // A reference-only translation must show, in the source itself, the notice
      // that sends the filer to the English version -- otherwise "reference only"
      // is a claim the record makes about a document that does not say it.
      if (sourceRecord.implementationStatus === "no_fill_reference_only_translation") {
        record.disposition.referenceOnly = {
          officialNoticeVisibleInTheActualSource: record.officialSource.notice.theSourceSaysItMustNotBeFiled,
          phrasesFoundInTheSource: record.officialSource.notice.phrasesFound,
          englishFilingFamily: familyId.replace(/-(es|vi)$/, "-en")
        };
      }
      record.terminalEvidenceComplete = present.length === 0
        && (record.disposition.referenceOnly ? record.disposition.referenceOnly.officialNoticeVisibleInTheActualSource : true);
      families.push(record);
      console.log(`  ${familyId} — ${sourcePageCount} source page(s), no participant artifact (${record.disposition.implementationStatus ?? record.disposition.documentRole})`);
      writeManifest(record, slug);
      continue;
    }

    // ---------- filing-artifact families ----------
    const artifactBytes = fs.readFileSync(artifactPath);
    const frozenArtifactSha256 = sha256(artifactBytes);
    const artifactDoc = await PDFDocument.load(artifactBytes, { ignoreEncryption: true, updateMetadata: false });
    const artifactPageCount = artifactDoc.getPageCount();
    const census = readJson(path.join(dir, "field-census.json"));
    const { file: geometryFile, map } = declaredGeometry(dir);
    const populated = readJson(path.join(dir, "reports/populated-fields.json")) ?? [];
    const declaredValues = [...new Set([
      ...(map?.bindings ?? []).map((b) => CANONICAL[b.factId]),
      ...(map?.anchorCapture?.anchors ?? []).map((a) => CANONICAL[a.factId]),
      ...populated.map((r) => CANONICAL[r.factId])
    ])].filter((v) => typeof v === "string" && v.length >= 2);
    // A family can record which fields were written without recording which fact
    // each one carries: AK RequestToSealCrimInfo names five written fields and no
    // factId for any of them, and its profile declares no bindings, so a value
    // set built only from declarations is empty and every value on the filing
    // reads as source-inherent. Falling back to the fixture corpus keeps the same
    // distinction -- participant text is text the fixture supplied -- without
    // needing the family to have said which field supplied it.
    const boundValues = declaredValues.length
      ? declaredValues
      : [...new Set(Object.values(CANONICAL))].filter((v) => typeof v === "string" && v.length >= 4);
    const boundValueBasis = declaredValues.length
      ? "the fixture values this family's own declarations name"
      : "the canonical fixture corpus, because this family declares no factId for any written field";

    for (let p = 1; p <= artifactPageCount; p += 1) {
      const row = await rasterOnePage({ bytes: artifactBytes, pageIndex: p - 1, tmpRoot, outName: `${slug}-canonical-page-${String(p).padStart(2, "0")}.png` });
      record.rasters.push({ page: p, of: "canonical-artifact", image: path.relative(rootDir, path.join(OUT_DIR, row.image)),
        sha256: row.sha256, widthPx: row.widthPx, heightPx: row.heightPx, croppedToPage: row.croppedToPage,
        boundTo: frozenArtifactSha256, boundToWhat: "the frozen canonical artifact" });
    }
    let boundarySha = null;
    if (fs.existsSync(boundaryPath)) {
      const boundaryBytes = fs.readFileSync(boundaryPath);
      boundarySha = sha256(boundaryBytes);
      const bDoc = await PDFDocument.load(boundaryBytes, { ignoreEncryption: true, updateMetadata: false });
      for (let p = 1; p <= bDoc.getPageCount(); p += 1) {
        const row = await rasterOnePage({ bytes: boundaryBytes, pageIndex: p - 1, tmpRoot, outName: `${slug}-boundary-page-${String(p).padStart(2, "0")}.png` });
        record.rasters.push({ page: p, of: "boundary-artifact", image: path.relative(rootDir, path.join(OUT_DIR, row.image)),
          sha256: row.sha256, widthPx: row.widthPx, heightPx: row.heightPx, croppedToPage: row.croppedToPage,
          boundTo: boundarySha, boundToWhat: "the frozen boundary artifact" });
      }
    }

    const allWrites = [];
    for (let p = 1; p <= artifactPageCount; p += 1) {
      const page = artifactDoc.getPages()[p - 1];
      const split = splitLayers(artifactDoc, page);
      let writes = split.splittable ? overlayWrites(artifactDoc, page, split).map((w) => ({ ...w, page: p })) : [];
      // Not every finalized artifact is in the appended-layer shape. AK
      // RequestToSealCrimInfo writes its pages as plain content that does not
      // open with the graphics-state push, so a layer-only reading found no
      // writes on it at all and reported five recorded values as invisible --
      // they are on the page, hex-encoded, and it was the reading that missed
      // them. Where the layer cannot be split, participant text is identified
      // the same way it is everywhere else in this file: by being a fixture
      // value this family binds, read with its own coordinates off the page.
      if (!split.splittable) {
        writes = extractTextItems(page)
          .filter((item) => boundValues.some((v) => String(item.text ?? "").includes(v)))
          .map((item) => ({
            how: "text on a page whose layers do not separate",
            appearance: null, page: p,
            at: { x: round(item.x), y: round(item.y) },
            box: { x: round(item.x), y: round(item.y), width: round(item.width ?? 0), height: round(item.size ?? 0) },
            opaqueBox: false, fillGrey: null, fontSize: item.size ?? null, advance: null,
            textDrawn: [String(item.text ?? "")]
          }));
      }
      allWrites.push(...writes);
      const participant = writes.filter((w) => isParticipantDerived(w.textDrawn, boundValues));
      const slots = declaredSlots(map).filter((s) => s.page === null || s.page === p);
      record.pages.push({
        page: p,
        ourLayerTouchesThisPage: split.splittable,
        participantTextReadBy: split.splittable ? "the appended layer" : "page text matched against this family's bound fixture values, because the layers do not separate on this page",
        whyNot: split.splittable ? undefined : split.reason,
        opaqueBoxesPaintedOverThePage: writes.filter((w) => w.opaqueBox && w.box).map((w) => ({ appearance: w.appearance, box: w.box, fillGrey: w.fillGrey })),
        participantValues: participant.map((w) => ({ value: w.textDrawn.join(""), at: w.at, box: w.box, how: w.how })),
        participantTextOverPrintedSourceText: participant.flatMap((w) => {
          const hits = sourceInkCollisions(w, sourceItemsByPage.get(p) ?? []);
          return hits.length ? [{ value: w.textDrawn.join("").trim(), at: w.at, collidesWith: hits }] : [];
        }),
        clipping: participant.map((w) => clippingOf(w, slots)).filter(Boolean),
        sourceInherentTextCarriedByAnAppearance: writes
          .filter((w) => w.textDrawn.length && w.how === "flattened widget appearance")
          .filter((w) => !isParticipantDerived(w.textDrawn, boundValues))
          .filter((w) => classifyResidue(w.textDrawn) === "flattened caption or label")
          .map((w) => ({ appearance: w.appearance, text: w.textDrawn.slice(0, 6) })),
        controlChromeResidue: writes
          .filter((w) => w.textDrawn.length && w.how === "flattened widget appearance")
          .filter((w) => !isParticipantDerived(w.textDrawn, boundValues))
          .filter((w) => classifyResidue(w.textDrawn) !== "flattened caption or label")
          .map((w) => ({ appearance: w.appearance, box: w.box, kind: classifyResidue(w.textDrawn),
            text: w.textDrawn.length > 12 ? [...w.textDrawn.slice(0, 6), `…and ${w.textDrawn.length - 6} more`] : w.textDrawn }))
      });
    }

    const participantWrites = allWrites.filter((w) => isParticipantDerived(w.textDrawn, boundValues));
    const declaredFieldForValue = new Map();
    for (const b of map?.bindings ?? []) {
      const v = CANONICAL[b.factId];
      if (typeof v === "string" && v.length >= 2 && !declaredFieldForValue.has(v)) declaredFieldForValue.set(v, String(b.field));
    }
    const values = {};
    for (const w of participantWrites) {
      const text = w.textDrawn.join("").trim();
      if (text.length < 2) continue;
      values[declaredFieldForValue.get(text) ?? `drawn:${w.page}:${round(w.at?.x ?? 0)},${round(w.at?.y ?? 0)}`] = text;
    }
    const audit = auditPlacements({ doc: artifactDoc, census, map, values });
    const reconciliation = reconcileWrittenAgainstDeclared({
      writtenFields: populated.filter((r) => r.written !== false).map((r) => String(r.field ?? r.name ?? r)),
      declaredBindings: (map?.bindings ?? []).map((b) => String(b.field)),
      refusedFields: [...(map?.bindingRefusals ?? []), ...populated.filter((r) => r.written === false)]
    });
    const duplicates = duplicatePlacements(participantWrites).map((d) => {
      const declared = [...(map?.bindings ?? []), ...(map?.anchorCapture?.anchors ?? [])].filter((x) => CANONICAL[x.factId] === d.value).length;
      return { ...d, distinctDeclarationsCarryingThisValue: declared, accountedForByDeclarations: declared >= d.times };
    });
    const structural = await structuralResult(artifactBytes);
    const chrome = record.pages.flatMap((p) => p.controlChromeResidue);
    const opaque = record.pages.flatMap((p) => p.opaqueBoxesPaintedOverThePage);
    const collisions = record.pages.flatMap((p) => p.participantTextOverPrintedSourceText.map((c) => ({ page: p.page, ...c })));
    const clipped = record.pages.flatMap((p) => p.clipping).filter((c) => c.clipped);

    record.artifact = {
      canonical: { path: path.relative(rootDir, artifactPath), sha256: frozenArtifactSha256, pageCount: artifactPageCount },
      boundary: boundarySha ? { path: path.relative(rootDir, boundaryPath), sha256: boundarySha } : null,
      declaredGeometryFile: geometryFile,
      structuralClass: census?.structuralClass ?? null
    };
    record.rasterCoverage = rasterContract({
      requiredPages: Array.from({ length: artifactPageCount }, (_, i) => i + 1),
      renderedPages: [...new Set(record.rasters.filter((r) => r.of === "canonical-artifact").map((r) => r.page))],
      manifestArtifactSha256: frozenArtifactSha256, currentArtifactSha256: frozenArtifactSha256
    });
    record.participantValueResult = {
      participantValuesDrawn: participantWrites.length,
      appearancesOnThePage: allWrites.length,
      writtenAgainstDeclared: reconciliation,
      recordedWrittenFields: populated.filter((r) => r.written !== false).length,
      // The substantive question is whether the values the family records as
      // written are on the filing. Reconciliation against declared bindings is
      // reported beside it but cannot decide it: AK RequestToSealCrimInfo
      // declares no bindings at all, so "balanced" is unreachable there and
      // gating on it would report five values that are visibly present as
      // missing.
      reconciliationIsDecidable: (map?.bindings ?? []).length > 0,
      visibleWhereExpected: participantWrites.length >= populated.filter((r) => r.written !== false).length
        && participantWrites.length > 0,
      basis: `participant text is text matching ${boundValueBasis}; everything else an appearance draws came with the document`
    };
    record.protectedRegionResult = {
      drawnIntoAProtectedSlot: audit.drawnIntoAProtectedSlot,
      placedOutsideIntendedGeometry: audit.placedOutsideIntendedGeometry,
      protectedActorsFabricated: audit.drawnIntoAProtectedSlot.filter((x) => /judge|clerk|court|sheriff|prosecut/i.test(String(x.landedInRegion ?? x.landedInField ?? ""))),
      clear: audit.drawnIntoAProtectedSlot.length === 0
    };
    record.sourceTextResult = {
      opaqueBoxCount: opaque.length,
      participantTextOverPrintedSourceText: collisions,
      pagesOurLayerTouches: record.pages.filter((p) => p.ourLayerTouchesThisPage).map((p) => p.page),
      sourceCaptionsAndInstructionsPreserved: opaque.length === 0,
      clear: opaque.length === 0 && collisions.length === 0
    };
    record.controlChromeResult = {
      chooserPlaceholders: chrome.filter((r) => r.kind === "unselected chooser prompt").length,
      commandButtons: chrome.filter((r) => r.kind === "command button").length,
      optionListResidue: chrome.filter((r) => r.kind === "unselected chooser option list").length,
      opaqueWidgetBackgrounds: opaque.length,
      residue: chrome,
      clear: chrome.length === 0 && opaque.length === 0
    };
    record.clippingAndDuplicateResult = {
      clipped, duplicatePlacements: duplicates,
      unaccountedDuplicates: duplicates.filter((d) => !d.accountedForByDeclarations),
      clear: clipped.length === 0 && duplicates.every((d) => d.accountedForByDeclarations)
    };
    record.activeContentAndStructuralResult = structural;
    record.allRequirementsHold = record.rasterCoverage.complete && record.participantValueResult.visibleWhereExpected
      && record.protectedRegionResult.clear && record.sourceTextResult.clear
      && record.controlChromeResult.clear && record.clippingAndDuplicateResult.clear && structural.clean;

    families.push(record);
    console.log(`  ${familyId} — ${sourcePageCount} source page(s), ${artifactPageCount} artifact page(s), ${participantWrites.length} participant value(s)${record.allRequirementsHold ? "" : "  << findings"}`);
    writeManifest(record, slug);
  }

  function writeManifest(rec, slug) {
    rec.visualManifestHash = sha256(Buffer.from(JSON.stringify(rec)));
    const file = path.join(OUT_DIR, `${slug}-visual-manifest.json`);
    const json = `${JSON.stringify(rec, null, 2)}\n`;
    if (checkOnly) {
      const cur = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
      if (cur !== json) { console.error(`FAIL ${rec.familyId} — ${path.relative(rootDir, file)} is stale`); process.exitCode = 1; }
    } else fs.writeFileSync(file, json);
  }

  const artifactBearing = families.filter((f) => f.artifact);
  const terminal = families.filter((f) => !f.artifact);
  const index = {
    schemaVersion: "rcap-pdf-final-visual-evidence-index/v1",
    evidenceContract: EVIDENCE_CONTRACT_VERSION,
    generatedBy: "scripts/verify-rcap-pdf-final-visual-evidence.mjs",
    freezeSha: FREEZE_SHA,
    wave: "pdf-finish-final",
    sourcePack: { packId: pack.packId, assignmentRevision: pack.assignmentRevision, familyCount: pack.familyCount,
      basis: "every official-source raster is rendered from a member of this pack, re-hashed from its installed path before use" },
    totals: {
      familiesAssigned: pack.members.length,
      familiesCovered: families.length,
      familiesBlocked: blocked.length,
      artifactBearingFamilies: artifactBearing.length,
      noArtifactTerminalFamilies: terminal.length,
      logicalSourcePages: families.reduce((n, f) => n + (f.officialSource.pageCount ?? 1), 0),
      sourceRasters: families.reduce((n, f) => n + f.rasters.filter((r) => r.of === "source" || r.of === "source-capture").length, 0),
      artifactRasters: families.reduce((n, f) => n + f.rasters.filter((r) => r.of === "canonical-artifact" || r.of === "boundary-artifact").length, 0),
      artifactBearingFamiliesWhereAllRequirementsHold: artifactBearing.filter((f) => f.allRequirementsHold).length,
      terminalFamiliesWithCompleteEvidence: terminal.filter((f) => f.terminalEvidenceComplete).length,
      chooserPlaceholders: artifactBearing.reduce((n, f) => n + f.controlChromeResult.chooserPlaceholders, 0),
      commandButtons: artifactBearing.reduce((n, f) => n + f.controlChromeResult.commandButtons, 0),
      optionListResidue: artifactBearing.reduce((n, f) => n + f.controlChromeResult.optionListResidue, 0),
      opaqueWidgetBackgrounds: artifactBearing.reduce((n, f) => n + f.controlChromeResult.opaqueWidgetBackgrounds, 0),
      protectedRegionIntrusions: artifactBearing.reduce((n, f) => n + f.protectedRegionResult.drawnIntoAProtectedSlot.length, 0),
      clippedParticipantValues: artifactBearing.reduce((n, f) => n + f.clippingAndDuplicateResult.clipped.length, 0),
      unaccountedDuplicates: artifactBearing.reduce((n, f) => n + f.clippingAndDuplicateResult.unaccountedDuplicates.length, 0),
      activeContentHits: artifactBearing.reduce((n, f) => n + f.activeContentAndStructuralResult.activeContentHits, 0),
      liveFields: artifactBearing.reduce((n, f) => n + f.activeContentAndStructuralResult.liveFields, 0),
      annotations: artifactBearing.reduce((n, f) => n + f.activeContentAndStructuralResult.annotations, 0),
      widgets: artifactBearing.reduce((n, f) => n + f.activeContentAndStructuralResult.widgets, 0),
      referenceOnlyFamiliesWhoseSourceShowsTheNotice: terminal.filter((f) => f.disposition?.referenceOnly?.officialNoticeVisibleInTheActualSource).length,
      referenceOnlyFamilies: terminal.filter((f) => f.disposition?.referenceOnly).length
    },
    blockedFamilies: blocked,
    families: families.map((f) => ({
      familyId: f.familyId,
      officialSourceSha256: f.officialSource.sha256,
      sourceKind: f.officialSource.kind,
      sourcePages: f.officialSource.pageCount ?? 1,
      frozenArtifactSha256: f.artifact?.canonical.sha256 ?? null,
      frozenBoundarySha256: f.artifact?.boundary?.sha256 ?? null,
      disposition: f.artifact ? "filing_artifact" : (f.disposition?.kind ?? null),
      allRequirementsHold: f.artifact ? f.allRequirementsHold : f.terminalEvidenceComplete,
      visualManifestHash: f.visualManifestHash,
      manifest: path.relative(rootDir, path.join(OUT_DIR, `${f.familyId.replace(/:/g, "-")}-visual-manifest.json`))
    }))
  };

  const indexPath = path.join(OUT_DIR, "index.json");
  const indexJson = `${JSON.stringify(index, null, 2)}\n`;
  if (checkOnly) {
    const cur = fs.existsSync(indexPath) ? fs.readFileSync(indexPath, "utf8") : "";
    if (cur !== indexJson) { console.error(`FAIL pdf-finish-final — index.json is stale`); process.exitCode = 1; }
  } else fs.writeFileSync(indexPath, indexJson);

  fs.rmSync(tmpRoot, { recursive: true, force: true });
  if (families.length !== pack.members.length) {
    console.error(`FAIL coverage — ${families.length} of ${pack.members.length} assigned families covered`);
    process.exitCode = 1;
  }
  console.log(`OK pdf-finish-final visual evidence — ${index.totals.familiesCovered}/${index.totals.familiesAssigned} families, `
    + `${index.totals.logicalSourcePages} logical source pages, ${index.totals.sourceRasters} source rasters, ${index.totals.artifactRasters} artifact rasters`);
}

if (mutationsOnly) await runMutations();
else await main();
