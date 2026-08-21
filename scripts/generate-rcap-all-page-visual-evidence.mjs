#!/usr/bin/env node
// All-page visual evidence for finalized RCAP artifacts: what LegalEase put on
// each page, where it landed, and what it left alone.
//
//   node scripts/generate-rcap-all-page-visual-evidence.mjs --batch=4
//   node scripts/generate-rcap-all-page-visual-evidence.mjs --families=WI:cr-266-form-en
//   node scripts/generate-rcap-all-page-visual-evidence.mjs --check
//
// The evidence that existed before this was page 1 of a blank-versus-filled
// contact sheet for nine families. A one-page sample of a four-page petition is
// not visual review of that petition: the pages a participant's name, signature
// block, service certificate and proposed order live on are the pages nobody
// had looked at. This renders every page of every family and refuses, in the
// manifest itself, to call a multi-page form covered by a page-1 package.
//
// WHAT MAKES THE LAYER CLAIM TRUE
//
// Splitting "the court printed this" from "we printed this" by differencing a
// filled page against a blank one requires the blank, and the verified source
// binaries live under private/ and are not in this clone -- 62 of 63 families
// cannot be differenced that way here. They do not need to be. Every artifact
// this factory emits carries its page content as [q, official source stream, Q,
// appended overlay stream]. The official layer is not reconstructed from a
// pixel difference; it is the same stream object the source shipped. Rendering
// the page with our stream removed shows what the court printed. Rendering it
// with the source removed shows what we added. See rcap-page-layers.mjs.
//
// So the three renders per page are the finalized artifact, the source-inherent
// layer alone, and the generated layer alone, and every verdict below is a
// measurement over those three.
//
//   placement            Ink in the generated render is clustered, converted to
//                        page points and required to sit inside a rectangle the
//                        family's own map declares writable.
//   protected region     No generated ink may touch a signature, clerk, court,
//                        attorney or agency rectangle. Source-inherent text in
//                        those rectangles is not a leak and is not flagged --
//                        it is in the source layer, where the split puts it.
//   source preservation  Source ink that is missing from the finalized render
//                        is source text we destroyed. It must be zero.
//   default appearances  A finalized filing must be flat. A surviving widget
//                        draws its own chooser prompt or comb, which is a mark
//                        on a court filing that no field map describes.
//
// The text side is measured independently of the pixel side: the values are
// read back out of our own overlay stream with their coordinates, so a family
// clears only when the ink is in the right box AND the thing in the box is the
// value that belongs there. Pixels alone cannot tell those apart.
//
// Rendering is deterministic for a given file on a given renderer build, so a
// raster's SHA-256 is a stable identifier and `--check` compares exactly. A
// different Chromium shifts antialiasing and moves the low-order digits; a
// `--check` failure on a different browser build means re-run, not that a
// verdict moved. The verdicts are integer pixel counts against thresholds far
// from their boundaries.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { rasterizePdf, withRasterBrowser } from "./rcap-official-forms/rcap-pdf-rasterize.mjs";
import { isolateLayer, interactiveResidue, splitPageLayers, singlePagePdf } from "./rcap-official-forms/rcap-page-layers.mjs";
import { textRuns } from "./rcap-official-forms/rcap-written-text.mjs";

const require = createRequire(import.meta.url);
const sharp = require("sharp");
const { PDFDocument, PDFName, PDFDict } = require("pdf-lib");

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PRODUCTION = path.join(rootDir, "data/rcap-all50/overlays/production");
const LANE = path.join(rootDir, "data/rcap-all50/visual-evidence");
const FAMILY_DIR = path.join(LANE, "families");
const INDEX = path.join(LANE, "index.json");
const RASTER_STORE = path.join(rootDir, "tmp/rcap-visual-evidence");
const EVIDENCE_DIR = path.join(rootDir, "docs/record-clearing/pdf-visual-evidence/all-page");

const RENDER_DATE = new Date("2026-08-12T00:00:00.000Z");
const SCALE = 2;
// Ink is anything meaningfully darker than the page. Court forms print in black
// on white and our overlay draws in black, so the threshold sits far from both.
const INK_MAX_GREY = 190;
// A cluster smaller than this is a rasteriser speck, not a mark. Nine cells at
// two pixels square is about two points across at this scale -- below the size
// of a comma in a nine-point font.
const MIN_CLUSTER_CELLS = 9;
const CELL = 2;
// A value's ink may sit slightly proud of its declared rectangle: descenders
// drop below the baseline box and antialiasing spreads a fraction of a point.
// Beyond this it is not rounding, it is the wrong box.
const CONTAINMENT_TOLERANCE_PT = 4;
// Below this, lost source ink cannot be a lost character. A short written value
// on these pages measures 200 to 650 ink pixels, so a glyph is never 16 -- and
// 16 is what overprinting one value on a printed rule costs at the antialiased
// edges. The exact count is reported either way; only the finding is floored.
const SOURCE_LOSS_FLOOR_PX = 64;
// Source ink counts as destroyed only where the finalized page is clearly bare
// paper, not merely a shade lighter. A composed page antialiases a glyph edge
// slightly differently from the same glyph rendered alone, so edge pixels drift
// a few levels and some cross the ink threshold; on the Arkansas orders that
// read as 432 "lost" pixels scattered over the whole page, every one of them
// landing between grey 192 and 224 -- within a whisker of the threshold they
// had just crossed. Ink knocked out by an opaque fill goes to paper white, so
// this stays sensitive to the thing actually worth catching.
const CLEARLY_BLANK_GREY = 230;
// The viewer paints a hairline border at the edge of the page. It is present in
// every variant so it cancels in the layer accounting, but it clusters as one
// page-sized mark that then "touches" every protected region on the page. The
// masks are inset past it. The cost is that nothing within 1.5pt of the paper's
// edge is measured, which is well inside any court's margin requirement.
const PAGE_EDGE_INSET_PX = 3;
// How far a value's ink may run past the right edge of its own rectangle before
// it is running into whatever the form prints next.
const OVERRUN_ALLOWANCE_PT = 1.5;

const args = process.argv.slice(2);
const checkOnly = args.includes("--check");
const batchSize = Number((args.find((a) => a.startsWith("--batch=")) ?? "").split("=")[1] || 0);
const onlyFamilies = new Set(
  (args.find((a) => a.startsWith("--families=")) ?? "").split("=")[1]?.split(",").filter(Boolean) ?? []
);

const readJson = (file, fallback = null) => {
  if (!fs.existsSync(file)) return fallback;
  try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch { return fallback; }
};
const sha256 = (buf) => crypto.createHash("sha256").update(buf).digest("hex");
const round = (n) => Number(n.toFixed(2));

/** Every family in the production tree that has a finalized artifact. */
function enumerateFamilies() {
  const out = [];
  for (const stateDir of fs.readdirSync(PRODUCTION).sort()) {
    const statePath = path.join(PRODUCTION, stateDir);
    if (!fs.statSync(statePath).isDirectory()) continue;
    for (const familyDir of fs.readdirSync(statePath).sort()) {
      const familyPath = path.join(statePath, familyDir);
      const canonical = path.join(familyPath, "fixtures/canonical-filled.pdf");
      if (!fs.existsSync(canonical)) continue;
      const record = readJson(path.join(familyPath, "source-record.json")) ?? {};
      const jurisdiction = String(record.jurisdiction ?? stateDir).toUpperCase();
      out.push({
        familyId: `${jurisdiction}:${familyDir}`,
        jurisdiction, stateDir, familySlug: familyDir, familyPath, canonical,
        documentId: record.documentId ?? familyDir,
        officialTitle: record.officialTitle ?? null,
        sourceSha256: record.sha256 ?? null
      });
    }
  }
  return out;
}

/** Every PDF in the clone by SHA-256, so a pinned source binary can be found. */
function pdfsInClone() {
  const found = new Map();
  // This lane's own raster store is skipped. It fills with one derived PDF per
  // page per layer per family -- hundreds of files that are by construction not
  // anybody's pinned source, and hashing them made the startup scan slower with
  // every run.
  const skip = new Set(["node_modules", ".git", ".next", "rcap-visual-evidence"]);
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (skip.has(entry.name)) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.pdf$/i.test(entry.name)) {
        const sha = sha256(fs.readFileSync(full));
        if (!found.has(sha)) found.set(sha, full);
      }
    }
  };
  walk(rootDir);
  return found;
}

/**
 * Rectangles this family's own map says a participant value may be written in.
 *
 * Flat families carry measured write boxes on the overlay profile. Widget
 * families carry bindings by field name, and the rectangle is the widget's, read
 * from the census taken first-hand from the verified binary.
 */
function declaredWriteRects(familyPath) {
  const profile = readJson(path.join(familyPath, "overlay-profile.json"));
  if (profile?.anchors?.length) {
    return {
      basis: "measured write boxes on overlay-profile.json",
      rects: profile.anchors.map((anchor) => ({
        page: anchor.page ?? 1, label: anchor.label, factId: anchor.factId ?? null,
        x: anchor.writeBox.x, y: anchor.writeBox.y,
        width: anchor.writeBox.width, height: anchor.writeBox.height
      }))
    };
  }
  const map = readJson(path.join(familyPath, "production-field-map.json"));
  const census = readJson(path.join(familyPath, "field-census.json"));
  if (!map?.bindings?.length || !census?.fields?.length) return { basis: null, rects: [] };
  const byName = new Map(census.fields.map((field) => [field.name, field]));
  const rects = [];
  for (const binding of map.bindings) {
    const field = byName.get(binding.field);
    if (!field) continue;
    for (const widget of field.widgets ?? []) {
      rects.push({
        page: widget.page ?? 1, label: binding.field, factId: binding.factId ?? null,
        x: widget.rect.x, y: widget.rect.y, width: widget.rect.width, height: widget.rect.height
      });
    }
  }
  return { basis: "bound widget rectangles from field-census.json", rects };
}

/**
 * Rectangles no generated mark may touch.
 *
 * Flat families declare protected rules as the rule line itself; the band above
 * it is where a value written to that rule would land, so the rectangle is the
 * rule extended upward by a line height. Widget families name protected fields
 * in the classification, and the rectangle is the widget's.
 */
function protectedRects(familyPath) {
  const profile = readJson(path.join(familyPath, "overlay-profile.json"));
  const classification = readJson(path.join(familyPath, "field-classification.json"));
  const census = readJson(path.join(familyPath, "field-census.json"));
  const rects = [];
  for (const rule of profile?.protectedRules ?? []) {
    rects.push({
      page: rule.page ?? 1, caption: rule.caption, category: rule.category,
      x: rule.x, y: rule.y, width: rule.endX - rule.x, height: 14,
      basis: "declared protected rule line, extended one line height above the rule"
    });
  }
  if (census?.fields?.length) {
    const byName = new Map(census.fields.map((field) => [field.name, field]));
    const names = new Set(
      (classification?.entries ?? [])
        .filter((entry) => entry.class === "protected" && entry.source !== "measured_anchor")
        .map((entry) => entry.label)
    );
    for (const field of readJson(path.join(familyPath, "reports/protected-fields.json"))?.unwritableFields ?? []) {
      names.add(field.field);
    }
    for (const name of names) {
      const field = byName.get(name);
      if (!field) continue;
      for (const widget of field.widgets ?? []) {
        rects.push({
          page: widget.page ?? 1, caption: name, category: "protected_field",
          x: widget.rect.x, y: widget.rect.y, width: widget.rect.width, height: widget.rect.height,
          basis: "protected widget rectangle from field-census.json"
        });
      }
    }
  }
  return rects;
}

/**
 * Where the PDF page actually sits inside a rendered frame.
 *
 * The renderer letterboxes the page against its own viewer background, which is
 * a dark grey. Measuring the frame instead of the page counts that background
 * as ink and reports a blank overlay layer as 57% covered, so every mask below
 * is cropped to the page first. The page's own aspect ratio gives the height,
 * which is steadier than hunting for a bottom edge.
 */
async function pageRectangle(pngPath, widthPt, heightPt) {
  const { data, info } = await sharp(pngPath).greyscale().raw().toBuffer({ resolveWithObject: true });
  const at = (x, y) => data[y * info.width + x];
  const background = at(0, 0);
  const isBackground = (value) => Math.abs(value - background) <= 6;
  const columnIsBackground = (x) => {
    for (let y = 0; y < info.height; y += 3) if (!isBackground(at(x, y))) return false;
    return true;
  };
  let left = 0;
  while (left < info.width && columnIsBackground(left)) left += 1;
  let right = info.width - 1;
  while (right > left && columnIsBackground(right)) right -= 1;
  let top = 0;
  while (top < info.height) {
    let empty = true;
    for (let x = left; x <= right; x += 3) if (!isBackground(at(x, top))) { empty = false; break; }
    if (!empty) break;
    top += 1;
  }
  const widthPx = right - left + 1;
  if (widthPx < 64) return null;
  const pxPerPt = widthPx / widthPt;
  // The aspect ratio gives the page height to within a pixel or two, and those
  // pixels are letterbox. Trimming back to the last row that is not uniformly
  // the viewer's background removes the strip without guessing at a margin:
  // a row of background is background, whatever the arithmetic said.
  const rowIsBackground = (y) => {
    for (let x = left; x <= right; x += 3) if (!isBackground(at(x, y))) return false;
    return true;
  };
  let bottom = Math.min(top + Math.round(heightPt * pxPerPt), info.height) - 1;
  while (bottom > top && rowIsBackground(bottom)) bottom -= 1;
  const fullHeightPx = bottom - top + 1;
  const inset = PAGE_EDGE_INSET_PX;
  const insetWidth = widthPx - inset * 2;
  const insetHeight = fullHeightPx - inset * 2;
  if (insetWidth < 64 || insetHeight < 64) return null;
  return {
    left: left + inset, top: top + inset, widthPx: insetWidth, heightPx: insetHeight,
    pxPerPt, insetPx: inset, pageLeft: left, pageTop: top, pageHeightPx: fullHeightPx
  };
}

/** Greyscale ink mask of the page area of a rendered frame. */
async function inkMask(pngPath, rect) {
  const { data, info } = await sharp(pngPath)
    .extract({ left: rect.left, top: rect.top, width: rect.widthPx, height: rect.heightPx })
    .greyscale().raw().toBuffer({ resolveWithObject: true });
  const mask = new Uint8Array(info.width * info.height);
  let count = 0;
  for (let i = 0; i < mask.length; i += 1) {
    if (data[i] <= INK_MAX_GREY) { mask[i] = 1; count += 1; }
  }
  return { mask, grey: data, width: info.width, height: info.height, inkPixels: count };
}

/**
 * Connected runs of ink, as page-point rectangles.
 *
 * Ink is reduced to a coarse cell grid and dilated slightly before the
 * components are walked, so the separate glyphs of one value join into one
 * cluster while two values on different rules stay apart. Reporting every glyph
 * as its own finding would bury the one that matters.
 */
function clusterInk({ mask, width, height }, pxPerPt, pageHeightPt, insetPt = 0) {
  const cols = Math.ceil(width / CELL);
  const rows = Math.ceil(height / CELL);
  const cells = new Uint8Array(cols * rows);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (mask[y * width + x]) cells[Math.floor(y / CELL) * cols + Math.floor(x / CELL)] = 1;
    }
  }
  // Horizontal dilation only. It closes the inter-character and inter-word gaps
  // within one written value. Growing vertically as well merges a value with
  // whatever sits on the line above it -- on AK:tf-800 that welded a caption
  // name to the party name below it into a single 25pt-tall cluster that fitted
  // neither of their rectangles and read as two misplaced values.
  const grown = new Uint8Array(cells);
  const dilate = (dx, dy) => {
    const next = new Uint8Array(grown);
    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < cols; c += 1) {
        if (!grown[r * cols + c]) continue;
        for (let j = -dy; j <= dy; j += 1) {
          for (let i = -dx; i <= dx; i += 1) {
            const rr = r + j;
            const cc = c + i;
            if (rr >= 0 && rr < rows && cc >= 0 && cc < cols) next[rr * cols + cc] = 1;
          }
        }
      }
    }
    grown.set(next);
  };
  dilate(3, 0);

  const seen = new Uint8Array(cols * rows);
  const clusters = [];
  const stack = [];
  for (let start = 0; start < grown.length; start += 1) {
    if (!grown[start] || seen[start]) continue;
    stack.length = 0;
    stack.push(start);
    seen[start] = 1;
    let minC = cols;
    let maxC = -1;
    let minR = rows;
    let maxR = -1;
    let size = 0;
    let inked = 0;
    while (stack.length) {
      const at = stack.pop();
      const r = Math.floor(at / cols);
      const c = at - r * cols;
      size += 1;
      if (cells[at]) inked += 1;
      if (c < minC) minC = c;
      if (c > maxC) maxC = c;
      if (r < minR) minR = r;
      if (r > maxR) maxR = r;
      const neighbours = [at - 1, at + 1, at - cols, at + cols];
      for (const n of neighbours) {
        if (n < 0 || n >= grown.length || seen[n] || !grown[n]) continue;
        if ((n === at - 1 && c === 0) || (n === at + 1 && c === cols - 1)) continue;
        seen[n] = 1;
        stack.push(n);
      }
    }
    if (inked < MIN_CLUSTER_CELLS) continue;
    // Back off the dilation so the reported rectangle is the ink's own extent.
    const leftPx = Math.max(0, (minC + 3) * CELL);
    const rightPx = Math.min(width, (maxC - 2) * CELL);
    const topPx = Math.max(0, minR * CELL);
    const bottomPx = Math.min(height, (maxR + 1) * CELL);
    if (rightPx <= leftPx || bottomPx <= topPx) continue;
    clusters.push({
      x: round(leftPx / pxPerPt + insetPt),
      // PDF space counts up from the bottom of the page; raster space counts
      // down from the top. The crop was inset from both, so both axes shift back.
      y: round(pageHeightPt - insetPt - bottomPx / pxPerPt),
      width: round((rightPx - leftPx) / pxPerPt),
      height: round((bottomPx - topPx) / pxPerPt),
      inkCells: inked, sizeCells: size
    });
  }
  return clusters.sort((a, b) => b.y - a.y || a.x - b.x);
}

/**
 * How much of a generated cluster sits on top of ink the official form already
 * printed there.
 *
 * Flattening an interactive form bakes every widget's appearance into the page,
 * including the empty square of an unticked checkbox. That square usually lands
 * exactly on the square the form already prints, so it is our ink by attribution
 * but it is the form's own furniture by appearance -- and calling it a stray
 * mark in a court filing would be wrong. Ink we drew where the form prints
 * NOTHING is the finding that matters, and this is what tells them apart.
 */
function sourceInkUnder(cluster, masks, rect, pageHeightPt) {
  if (!masks.source || !masks.generated) return null;
  const insetPt = rect.insetPx / rect.pxPerPt;
  const left = Math.max(0, Math.round((cluster.x - insetPt) * rect.pxPerPt));
  const right = Math.min(masks.source.width, Math.round((cluster.x + cluster.width - insetPt) * rect.pxPerPt));
  const top = Math.max(0, Math.round((pageHeightPt - insetPt - cluster.y - cluster.height) * rect.pxPerPt));
  const bottom = Math.min(masks.source.height, Math.round((pageHeightPt - insetPt - cluster.y) * rect.pxPerPt));
  let sourceInk = 0;
  let generatedInk = 0;
  for (let y = top; y < bottom; y += 1) {
    for (let x = left; x < right; x += 1) {
      const at = y * masks.source.width + x;
      if (masks.source.mask[at]) sourceInk += 1;
      if (masks.generated.mask[at]) generatedInk += 1;
    }
  }
  return {
    sourceInkPixels: sourceInk,
    generatedInkPixels: generatedInk,
    // Half is a wide margin either way: a value written onto blank paper scores
    // near zero, and a re-drawn checkbox outline scores near one.
    coincidesWithSourceFurniture: generatedInk > 0 && sourceInk / generatedInk >= 0.5
  };
}

/**
 * A pixel mask covering `rects`, each grown by `tolerance` points.
 *
 * Placement is decided pixel by pixel rather than by comparing bounding boxes.
 * A bounding box is both too generous and too mean: it hides ink that escapes a
 * rectangle as long as the box's corners are inside, and it fails a value that
 * legitimately spans two stacked rectangles. On NC:aoc-cr-287 the two petitioner
 * address lines cluster as one 24pt-tall mark that fits neither rectangle alone,
 * and reporting that as misplaced ink would have buried what is actually there:
 * the same street address written onto both lines.
 */
function rectMask(rects, tolerance, dims, rect, pageHeightPt) {
  const mask = new Uint8Array(dims.width * dims.height);
  const insetPt = rect.insetPx / rect.pxPerPt;
  for (const r of rects) {
    const left = Math.max(0, Math.floor((r.x - tolerance - insetPt) * rect.pxPerPt));
    const right = Math.min(dims.width, Math.ceil((r.x + r.width + tolerance - insetPt) * rect.pxPerPt));
    const top = Math.max(0, Math.floor((pageHeightPt - insetPt - r.y - r.height - tolerance) * rect.pxPerPt));
    const bottom = Math.min(dims.height, Math.ceil((pageHeightPt - insetPt - r.y + tolerance) * rect.pxPerPt));
    for (let y = top; y < bottom; y += 1) for (let x = left; x < right; x += 1) mask[y * dims.width + x] = 1;
  }
  return mask;
}

const containedIn = (cluster, rect, tolerance) =>
  cluster.x >= rect.x - tolerance
  && cluster.y >= rect.y - tolerance
  && cluster.x + cluster.width <= rect.x + rect.width + tolerance
  && cluster.y + cluster.height <= rect.y + rect.height + tolerance;

const overlaps = (cluster, rect) => {
  const inset = 0.5;
  return cluster.x < rect.x + rect.width - inset
    && cluster.x + cluster.width > rect.x + inset
    && cluster.y < rect.y + rect.height - inset
    && cluster.y + cluster.height > rect.y + inset;
};

/** How much of the source layer's ink survives into the finalized render. */
/**
 * How much of the official form's printed ink our layer covers, and where.
 *
 * The two renders differ by exactly one thing -- our appended content stream --
 * so printed ink that reads as bare paper in the finalized page was necessarily
 * covered by something we drew. There is no third possibility, which is why an
 * earlier version of this asking whether the covering shape was one of our INK
 * clusters was ill-posed: an opaque fill that paints no ink of its own covers
 * printed text and leaves no cluster to find. On KY:aoc-333 that reported 3,582
 * pixels as vanishing under nothing, when the opaque background of an unfilled
 * widget was sitting on three of the form's printed rules.
 *
 * The split that does mean something is whether the covering happened inside a
 * rectangle this family's own map declares writable. Writing a value onto a
 * rule blanks that rule, which is the fill doing its job. Printed text covered
 * anywhere else is the form losing something nobody asked it to lose.
 */
function sourcePreservation(source, finalized, declaredMask = null) {
  if (source.width !== finalized.width || source.height !== finalized.height) return null;
  let sourceInk = 0;
  let lighter = 0;
  let blanked = 0;
  let blankedInsideADeclaredRectangle = 0;
  for (let i = 0; i < source.mask.length; i += 1) {
    if (!source.mask[i]) continue;
    sourceInk += 1;
    if (finalized.mask[i]) continue;
    lighter += 1;
    if (finalized.grey[i] < CLEARLY_BLANK_GREY) continue;
    blanked += 1;
    if (declaredMask?.[i]) blankedInsideADeclaredRectangle += 1;
  }
  return {
    printedInkCoveredInsideADeclaredRectangle: blankedInsideADeclaredRectangle,
    printedInkCoveredOutsideEveryDeclaredRectangle: blanked - blankedInsideADeclaredRectangle,
    sourceInkPixels: sourceInk,
    // Both numbers are reported. The first is every source pixel that stopped
    // reading as ink, which is dominated by antialiasing at glyph edges; the
    // second is the subset the finalized page renders as bare paper, which is
    // what an opaque fill over printed text would produce. The verdict uses the
    // second.
    sourceInkPixelsNoLongerReadingAsInk: lighter,
    sourceInkPixelsBlankedToPaper: blanked,
    blankedFraction: sourceInk ? Number((blanked / sourceInk).toFixed(6)) : 0
  };
}

/**
 * Pixels the renderer paints regardless of page content.
 *
 * The two isolated layers are disjoint by construction: a content stream is
 * either the source's or ours, never both. So a pixel inked in BOTH renders was
 * painted by neither stream -- it is the viewer's own furniture, the hairline
 * border it draws at the edge of the paper. On WI that border clustered as a
 * 598pt-wide mark and had to be excluded by insetting the crop, which is a
 * threshold; this is an identity, and it does not need tuning.
 *
 * Where a written value overprints a rule the form prints, those few pixels are
 * removed from the value's cluster too. The glyphs around them are untouched, so
 * the cluster still forms and its rectangle barely moves.
 */
function withoutRendererChrome(source, generated) {
  if (!source || !generated) return generated;
  if (source.width !== generated.width || source.height !== generated.height) return generated;
  const mask = new Uint8Array(generated.mask);
  let count = 0;
  for (let i = 0; i < mask.length; i += 1) {
    if (mask[i] && source.mask[i]) mask[i] = 0;
    if (mask[i]) count += 1;
  }
  return { mask, width: generated.width, height: generated.height, inkPixels: count };
}

/** Ink in the finalized render explained by neither layer. */
function unexplainedInk(source, generated, finalized) {
  if (source.width !== finalized.width || generated.width !== finalized.width) return null;
  let unexplained = 0;
  for (let i = 0; i < finalized.mask.length; i += 1) {
    if (finalized.mask[i] && !source.mask[i] && !generated.mask[i]) unexplained += 1;
  }
  return {
    finalizedInkPixels: finalized.inkPixels,
    inkInNeitherLayer: unexplained,
    unexplainedFraction: finalized.inkPixels ? Number((unexplained / finalized.inkPixels).toFixed(6)) : 0
  };
}

/** An annotated page: declared boxes, protected regions and what we drew. */
async function annotate(pngPath, target, { frame, pageHeightPt, writeRects, protectedOnPage, clusters, findings }) {
  const meta = await sharp(pngPath).metadata();
  // The page is letterboxed inside the captured frame, so a page-point
  // coordinate has to be offset by where the page starts before it is drawn.
  // Without that offset every box lands in the margin, which is how this was
  // caught: the first annotated page had the judge's decision boxes marked out
  // in the white space beside the form.
  const toPx = (rect) => ({
    x: frame.left + rect.x * frame.pxPerPt,
    y: frame.top + (pageHeightPt - rect.y - rect.height) * frame.pxPerPt,
    w: rect.width * frame.pxPerPt,
    h: rect.height * frame.pxPerPt
  });
  const box = (rect, stroke, dash) => {
    const r = toPx(rect);
    return `<rect x="${r.x.toFixed(1)}" y="${r.y.toFixed(1)}" width="${r.w.toFixed(1)}" height="${r.h.toFixed(1)}" fill="none" stroke="${stroke}" stroke-width="1.6"${dash ? ` stroke-dasharray="${dash}"` : ""}/>`;
  };
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${meta.width}" height="${meta.height}">
${writeRects.map((r) => box(r, "#1668d8", "5 3")).join("\n")}
${protectedOnPage.map((r) => box(r, "#c81e1e")).join("\n")}
${clusters.map((c) => box(c, "#0f8a3d")).join("\n")}
<g font-family="Helvetica" font-size="11" fill="#111">
<rect x="8" y="8" width="286" height="62" fill="#ffffff" fill-opacity="0.9" stroke="#111" stroke-width="1"/>
<text x="16" y="26">blue dashed — declared writable rectangle</text>
<text x="16" y="42">red — protected region, no generated ink allowed</text>
<text x="16" y="58">green — ink LegalEase added${findings ? ` (${findings} finding${findings === 1 ? "" : "s"})` : ""}</text>
</g></svg>`;
  await sharp(pngPath).composite([{ input: Buffer.from(svg), top: 0, left: 0 }]).png().toFile(target);
}

async function main() {
  const all = enumerateFamilies();
  const existing = new Set(
    fs.existsSync(FAMILY_DIR) ? fs.readdirSync(FAMILY_DIR).filter((f) => f.endsWith(".json")) : []
  );
  const manifestName = (family) => `${family.jurisdiction}__${family.familySlug}.json`;
  let selected = all;
  if (onlyFamilies.size) selected = all.filter((f) => onlyFamilies.has(f.familyId) || onlyFamilies.has(f.familySlug));
  else if (batchSize && !checkOnly) selected = all.filter((f) => !existing.has(manifestName(f))).slice(0, batchSize);

  const binaries = pdfsInClone();
  fs.mkdirSync(FAMILY_DIR, { recursive: true });
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });

  const written = [];
  await withRasterBrowser(async (browser) => {
    for (const family of selected) {
      const bytes = fs.readFileSync(family.canonical);
      const artifactSha = sha256(bytes);
      const doc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
      const pageCount = doc.getPageCount();
      const geometry = doc.getPages().map((page, index) => {
        const { width, height } = page.getSize();
        return { page: index + 1, widthPt: round(width), heightPt: round(height) };
      });

      const residue = await interactiveResidue(bytes);
      const layerSplit = doc.getPages().map((page, index) => ({ page: index + 1, ...splitPageLayers(doc, page) }));
      const unsplittable = layerSplit.filter((s) => !s.splittable);

      const workDir = path.join(RASTER_STORE, family.jurisdiction, family.familySlug);
      fs.mkdirSync(workDir, { recursive: true });
      const isControl = family.sourceSha256 ? binaries.has(family.sourceSha256) : false;
      const variants = {};
      const isolated = {
        finalized: bytes,
        source: (await isolateLayer(bytes, "source", RENDER_DATE)).bytes,
        generated: (await isolateLayer(bytes, "generated", RENDER_DATE)).bytes
      };
      // Where the pinned source binary is in this clone, it is rendered too and
      // compared against the layer this script isolated out of the artifact.
      // That comparison is the control for the whole method: it is the only
      // place the "the official layer IS the source's own stream" claim can be
      // checked against the actual acquired form rather than argued from
      // structure. Sixty-two families depend on it holding here.
      if (isControl) isolated.pinnedSource = fs.readFileSync(binaries.get(family.sourceSha256));
      for (const [name, variantBytes] of Object.entries(isolated)) {
        // One document per page, so the captured frame holds that page and
        // nothing else. See singlePagePdf.
        const rows = [];
        for (let index = 0; index < pageCount; index += 1) {
          const file = path.join(workDir, `${name}-page-${String(index + 1).padStart(2, "0")}.pdf`);
          const pageBytes = await singlePagePdf(variantBytes, index, RENDER_DATE);
          fs.writeFileSync(file, pageBytes);
          // Rendering is a pure function of these bytes at this scale, so a page
          // whose one-page document is unchanged does not need the browser
          // again. Correcting how a measurement is CLASSIFIED should not cost a
          // fresh Chromium render of every page it was measured from; without
          // this, re-deriving eighteen families meant re-rasterising two
          // hundred pages that were already on disk and byte-identical.
          const cacheKey = `${sha256(pageBytes)}:${SCALE}`;
          const cachedPng = path.join(workDir, name, `page-${String(index + 1).padStart(2, "0")}-of-01.png`);
          const cacheStamp = `${cachedPng}.key`;
          if (fs.existsSync(cachedPng) && fs.existsSync(cacheStamp)
            && fs.readFileSync(cacheStamp, "utf8") === cacheKey) {
            const geo = geometry[index];
            rows.push({
              page: index + 1, file: cachedPng, attempts: 0, looksBlank: false,
              widthPx: Math.max(320, Math.round(geo.widthPt * SCALE)),
              heightPx: Math.max(320, Math.round(geo.heightPt * SCALE)),
              pdfWidthPt: geo.widthPt, pdfHeightPt: geo.heightPt, fromCache: true
            });
            continue;
          }
          // The overlay layer of a page we wrote nothing to is blank because it
          // is empty, not because the render failed, and the blank-retry is for
          // the second case. Reading it off the stream rather than the pixels
          // keeps the retry where it belongs.
          const split = layerSplit[index];
          const nothingToDraw = name === "generated"
            && (!split.splittable || !/[A-Za-z]/.test(split.generatedStreamText ?? ""));
          const [row] = await rasterizePdf({
            file, outDir: path.join(workDir, name), scale: SCALE, browser,
            prefix: `page-${String(index + 1).padStart(2, "0")}-of`,
            attempts: nothingToDraw ? 1 : undefined
          });
          if (row) {
            fs.writeFileSync(`${row.file}.key`, cacheKey);
            rows.push({ ...row, page: index + 1, fromCache: false });
          }
        }
        variants[name] = rows;
      }

      // Text the overlay wrote, read back out of our own stream with its
      // coordinates, per page.
      const runsByPage = new Map();
      for (const [index, page] of doc.getPages().entries()) {
        const split = layerSplit[index];
        if (!split.splittable) { runsByPage.set(index + 1, []); continue; }
        const resources = doc.context.lookup(page.node.get(PDFName.of("Resources")));
        runsByPage.set(index + 1, textRuns(
          doc.context, split.generatedStreamText, resources instanceof PDFDict ? resources : null
        ));
      }

      const declared = declaredWriteRects(family.familyPath);
      const guarded = protectedRects(family.familyPath);
      const populated = readJson(path.join(family.familyPath, "reports/populated-fields.json")) ?? [];

      const pages = [];
      const rasterHashes = [];
      for (const geo of geometry) {
        const rendered = Object.fromEntries(
          Object.entries(variants).map(([name, list]) => [name, list.find((r) => r.page === geo.page) ?? null])
        );
        const missing = Object.entries(rendered).filter(([, r]) => !r);
        // The page rectangle is found once, on the finalized render, and reused
        // for all three variants. They share a viewport and a page size, so they
        // letterbox identically -- and the generated-only render is nearly white,
        // which is exactly the image edge-detection would fail on.
        const rect = rendered.finalized
          ? await pageRectangle(rendered.finalized.file, geo.widthPt, geo.heightPt) : null;
        const masks = {};
        for (const [name, row] of Object.entries(rendered)) {
          if (!row) continue;
          if (rect) masks[name] = await inkMask(row.file, rect);
          rasterHashes.push({
            page: geo.page, variant: name,
            raster: path.relative(rootDir, row.file),
            sha256: sha256(fs.readFileSync(row.file)),
            widthPx: row.widthPx, heightPx: row.heightPx,
            attempts: row.attempts, fromCache: Boolean(row.fromCache)
          });
        }

        const pxPerPt = rect ? rect.pxPerPt : SCALE;
        const writeOnPage = declared.rects.filter((r) => r.page === geo.page);
        const protectedOnPage = guarded.filter((r) => r.page === geo.page);
        // Clustering runs on our ink with the viewer's furniture removed; the
        // layer accounting below still uses the raw masks, because a pixel the
        // renderer painted is genuinely present in all three renders.
        const generatedOwn = withoutRendererChrome(masks.source, masks.generated);
        const clusters = generatedOwn
          ? clusterInk(generatedOwn, pxPerPt, geo.heightPt, rect.insetPx / rect.pxPerPt) : [];

        for (const cluster of clusters) {
          if (rect) cluster.overSourceInk = sourceInkUnder(cluster, { source: masks.source, generated: generatedOwn }, rect, geo.heightPt);
        }

        // Placement, measured in pixels: our ink that falls outside the union of
        // every rectangle this family's own map declares writable.
        let outsideEveryWriteBox = [];
        let redrawnFurniture = [];
        let placedInkPixels = null;
        let strayInkPixels = null;
        if (generatedOwn && rect) {
          const declaredMask = rectMask(writeOnPage, CONTAINMENT_TOLERANCE_PT, generatedOwn, rect, geo.heightPt);
          const stray = new Uint8Array(generatedOwn.mask.length);
          let placed = 0;
          let outside = 0;
          for (let i = 0; i < stray.length; i += 1) {
            if (!generatedOwn.mask[i]) continue;
            if (declaredMask[i]) { placed += 1; continue; }
            stray[i] = 1;
            outside += 1;
          }
          placedInkPixels = placed;
          strayInkPixels = outside;
          const strayClusters = clusterInk(
            { mask: stray, width: generatedOwn.width, height: generatedOwn.height, inkPixels: outside },
            pxPerPt, geo.heightPt, rect.insetPx / rect.pxPerPt
          );
          for (const cluster of strayClusters) {
            cluster.overSourceInk = sourceInkUnder(cluster, { source: masks.source, generated: generatedOwn }, rect, geo.heightPt);
          }
          outsideEveryWriteBox = strayClusters.filter((c) => !c.overSourceInk?.coincidesWithSourceFurniture);
          redrawnFurniture = strayClusters.filter((c) => c.overSourceInk?.coincidesWithSourceFurniture);
        }

        // Protection, measured the same way, and split by what the ink IS. A
        // participant value inside a judge's decision box is a leak. The empty
        // outline of an unticked checkbox, re-drawn by flattening exactly where
        // the form already prints one, is not -- it carries no participant data
        // and changes nothing a reader sees. Reporting the second as the first
        // would bury a real leak among dozens of them.
        const runs = runsByPage.get(geo.page) ?? [];
        const touchingProtected = [];
        if (generatedOwn && rect) {
          for (const region of protectedOnPage) {
            const mask = rectMask([region], 0, generatedOwn, rect, geo.heightPt);
            let inside = 0;
            let coincident = 0;
            for (let i = 0; i < mask.length; i += 1) {
              if (!mask[i] || !generatedOwn.mask[i]) continue;
              inside += 1;
              if (masks.source?.mask[i]) coincident += 1;
            }
            if (!inside) continue;
            // Whether this is a leak is settled by the text channel, not by how
            // much of the ink happens to sit on the printed outline. NC's order
            // page carries generated ink in the judge's decision boxes and NOT
            // ONE written value anywhere on the page: that ink is the empty
            // checkbox outline flattening re-drew, and calling it participant
            // data would be false. A value's own glyphs landing in the region is
            // the thing that is actually reportable.
            const valuesInRegion = runs
              .filter((run) => run.x >= region.x - CONTAINMENT_TOLERANCE_PT
                && run.x <= region.x + region.width + CONTAINMENT_TOLERANCE_PT
                && run.y >= region.y - CONTAINMENT_TOLERANCE_PT
                && run.y <= region.y + region.height + CONTAINMENT_TOLERANCE_PT)
              .map((run) => run.text);
            touchingProtected.push({
              region: region.caption, category: region.category, basis: region.basis,
              generatedInkPixelsInRegion: inside,
              pixelsCoincidingWithSourceInk: coincident,
              valuesWrittenInsideThisRegion: valuesInRegion,
              participantDerived: valuesInRegion.length > 0
            });
          }
        }
        // "Crosses its boundary" means the mark reached into somebody else's
        // cell, not that a descender dropped below its own baseline box. The
        // reportable shapes are a value that overlaps a rectangle other than the
        // one it was written to, and a value that runs past the right edge of
        // its own rule into whatever the form prints next.
        const crossingBoundary = [];
        for (const cluster of clusters) {
          const host = writeOnPage.find((r) => containedIn(cluster, r, CONTAINMENT_TOLERANCE_PT));
          if (!host) continue;
          const intruded = writeOnPage.filter((r) => r !== host && overlaps(cluster, r));
          if (intruded.length) {
            crossingBoundary.push({ cluster, writtenTo: host.label, reachesInto: intruded.map((r) => r.label) });
            continue;
          }
          const overrun = cluster.x + cluster.width - (host.x + host.width);
          if (overrun > OVERRUN_ALLOWANCE_PT) {
            crossingBoundary.push({ cluster, writtenTo: host.label, runsPastRightEdgeByPt: round(overrun) });
          }
        }

        const valuesOnPage = runs.map((run) => {
          const host = writeOnPage.find(
            (r) => run.x >= r.x - CONTAINMENT_TOLERANCE_PT && run.x <= r.x + r.width + CONTAINMENT_TOLERANCE_PT
              && run.y >= r.y - CONTAINMENT_TOLERANCE_PT && run.y <= r.y + r.height + CONTAINMENT_TOLERANCE_PT
          ) ?? null;
          return {
            text: run.text, x: run.x, y: run.y, fontSize: run.fontSize,
            declaredRectangle: host ? host.label : null,
            boundFactId: host ? host.factId : null
          };
        });
        // A name that appears twice because the form asks for it in a caption AND
        // under the signature block is the form's design, not a stray duplicate:
        // both landings are declared rectangles and they are different ones. What
        // is reportable is the same value landing twice in one rectangle, or
        // landing somewhere no rectangle was declared.
        const byText = new Map();
        for (const value of valuesOnPage) {
          if (value.text.trim().length <= 3) continue;
          if (!byText.has(value.text)) byText.set(value.text, []);
          byText.get(value.text).push(value);
        }
        const repeated = [...byText.entries()]
          .filter(([, hits]) => hits.length > 1)
          .map(([text, hits]) => ({
            text,
            occurrences: hits.length,
            declaredRectangles: [...new Set(hits.map((h) => h.declaredRectangle))],
            undeclaredLandings: hits.filter((h) => !h.declaredRectangle).length
          }))
          .filter((row) => row.undeclaredLandings > 0
            || row.declaredRectangles.length < row.occurrences);
        // A value the form asks for twice -- a name in the caption and again
        // under the signature block -- is the form's design. The same value in
        // two rectangles that are not asking for the same thing is a binding
        // question, and a reviewer should see it either way, so it is recorded
        // without being called a placement defect.
        const acrossRectangles = [...byText.entries()]
          .filter(([, hits]) => hits.length > 1 && hits.every((h) => h.declaredRectangle))
          .map(([text, hits]) => ({
            text,
            rectangles: hits.map((h) => ({ rectangle: h.declaredRectangle, factId: h.boundFactId }))
          }));

        let pinnedSourceControl = null;
        if (masks.pinnedSource && masks.source) {
          if (masks.pinnedSource.width !== masks.source.width || masks.pinnedSource.height !== masks.source.height) {
            pinnedSourceControl = { comparable: false, reason: "the pinned binary and the isolated layer render at different sizes" };
          } else {
            let differing = 0;
            for (let i = 0; i < masks.source.mask.length; i += 1) {
              if (masks.source.mask[i] !== masks.pinnedSource.mask[i]) differing += 1;
            }
            const fraction = Number((differing / masks.source.mask.length).toFixed(6));
            pinnedSourceControl = {
              comparable: true,
              pinnedSourceInkPixels: masks.pinnedSource.inkPixels,
              isolatedLayerInkPixels: masks.source.inkPixels,
              differingPixels: differing,
              differingFraction: fraction,
              // Antialiasing moves a pixel here and there between two renders of
              // the same marks; a real difference is orders of magnitude larger.
              verdict: fraction < 0.001
                ? "the official layer isolated from the artifact renders as the pinned source binary does"
                : "the official layer isolated from the artifact DIFFERS from the pinned source binary"
            };
          }
        }

        // Printed characters can be covered by an opaque fill inside something
        // we drew: flattening an unticked checkbox paints a solid square over
        // the "[_]" the Arkansas orders print, and the underscore stops being
        // ink. That is real coverage of official characters and is reported --
        // but it is not the same event as printed text vanishing under nothing,
        // and the two must not share a finding. This mask says which it is.
        // EVERY cluster, not just the ones that reproduce the form's own
        // furniture. Whether a mark we drew looks like the form's box is a
        // question about placement; for erasure the only question is whether
        // something we drew is sitting on the printed character. Restricting
        // this to furniture reported 73 covered pixels on the Arkansas
        // post-adjudication petition as vanishing under nothing, when an 18-by-
        // 19pt mark of ours was sitting directly on them.
        const preservation = masks.source && masks.finalized
          ? sourcePreservation(
            masks.source, masks.finalized,
            generatedOwn && rect ? rectMask(writeOnPage, CONTAINMENT_TOLERANCE_PT, generatedOwn, rect, geo.heightPt) : null
          ) : null;
        const unexplained = masks.source && masks.generated && masks.finalized
          ? unexplainedInk(masks.source, masks.generated, masks.finalized) : null;

        const findings = [];
        if (missing.length) findings.push({ code: "page_did_not_render", detail: missing.map(([n]) => n).join(", ") });
        if (rendered.finalized && !rect) findings.push({ code: "page_rectangle_not_locatable_in_render", detail: "the rendered frame has no detectable page area, so nothing on this page is measured" });
        for (const [name, row] of Object.entries(rendered)) {
          // A uniform capture is a render that never painted. It is only a real
          // observation for the generated layer, which is genuinely near-blank on
          // a page we wrote nothing to.
          if (row?.looksBlank && name !== "generated") findings.push({ code: "page_rasterized_with_no_ink", detail: `${name} layer, after ${row.attempts} attempt(s)` });
        }
        // A value that missed its box and a page with no boxes at all are
        // different statements, and collapsing them would report the second as
        // the first. AK:dps-cri-103 is retired, its populated-fields report is
        // empty and its map declares no bindings and no anchors -- and its
        // committed artifact still carries five participant values. Nothing in
        // the repository describes those marks, which is worth saying plainly
        // rather than as five misplacements.
        if (!writeOnPage.length && outsideEveryWriteBox.length) {
          findings.push({
            code: "artifact_carries_generated_ink_but_no_writable_rectangle_is_declared",
            generatedInkPixels: strayInkPixels,
            clusters: outsideEveryWriteBox,
            valuesReadBackFromOurOwnStream: valuesOnPage.map((v) => v.text),
            note: "This family's own map declares no writable rectangle on this page, so there is nothing these marks can be checked against. Whether the artifact predates a map change, a retirement or a refusal is not a visual question."
          });
        } else {
          for (const cluster of outsideEveryWriteBox) findings.push({ code: "generated_ink_outside_every_declared_rectangle", cluster });
        }
        for (const hit of touchingProtected) {
          findings.push({
            code: hit.participantDerived
              ? "participant_derived_ink_in_protected_region"
              : "flattening_redrew_form_furniture_in_a_protected_region",
            ...hit,
            note: hit.participantDerived
              ? "Ink we added inside a region reserved for a court, clerk, prosecutor, attorney or agency, not coinciding with anything the form prints there."
              : "Ink we added inside a protected region, landing on the outline the form already prints there. Flattening re-drew the widget's empty appearance; it carries no participant value."
          });
        }
        for (const crossing of crossingBoundary) findings.push({ code: "generated_ink_crosses_its_rectangle_boundary", ...crossing });
        for (const dup of repeated) findings.push({ code: "written_value_appears_more_than_once_on_page", ...dup });
        for (const dup of acrossRectangles) {
          findings.push({
            code: "same_value_written_to_more_than_one_declared_rectangle",
            ...dup,
            note: "Both landings are declared writable, so this is not misplacement. Recorded because whether the form is asking for the value twice, or a binding is repeating it where a second line should hold something else, is a map question a reviewer should answer."
          });
        }
        for (const cluster of redrawnFurniture) {
          findings.push({
            code: "flattening_redrew_the_form_s_own_furniture",
            cluster,
            note: "Ink outside every declared rectangle, landing on ink the official form already prints there. Attributed to us because flattening baked a widget appearance into the page; visually it reproduces the form's own box rather than adding a mark."
          });
        }
        if (preservation && preservation.printedInkCoveredOutsideEveryDeclaredRectangle > SOURCE_LOSS_FLOOR_PX) {
          findings.push({
            code: "printed_source_ink_covered_outside_every_declared_rectangle",
            ...preservation,
            note: "Printed ink of the official form no longer reads as ink, at a place this family's map does not declare writable. Flattening an unfilled widget paints its appearance onto the page: on the Arkansas orders that is the solid checkbox square over a printed [_]; on the Kentucky forms it is an opaque background over the form's own printed rules, which leaves the participant a line that is no longer there."
          });
        }
        // A composed page antialiases a glyph edge slightly differently from the
        // same glyph rendered alone, so a few edge pixels land in neither mask.
        // The finding is for ink that is actually unaccounted for, which is
        // orders of magnitude larger than an edge.
        if (unexplained && unexplained.unexplainedFraction >= 0.001) {
          findings.push({ code: "finalized_ink_in_neither_layer", ...unexplained });
        }
        if (pinnedSourceControl?.comparable && pinnedSourceControl.differingFraction >= 0.001) {
          findings.push({ code: "official_layer_differs_from_pinned_source_binary", ...pinnedSourceControl });
        }

        pages.push({
          page: geo.page, widthPt: geo.widthPt, heightPt: geo.heightPt,
          // Where this page sits inside its captured frame, so an annotated
          // render can put a page-point rectangle back in the right place.
          pageFrame: rect ? { left: rect.pageLeft, top: rect.pageTop, pxPerPt: round(rect.pxPerPt) } : null,
          layerSplit: layerSplit[geo.page - 1].splittable
            ? "official source layer and generated layer separated by content-stream structure"
            : layerSplit[geo.page - 1].reason,
          ink: {
            sourceInherentPixels: masks.source?.inkPixels ?? null,
            generatedPixels: generatedOwn?.inkPixels ?? null,
            rendererChromePixels: masks.generated && generatedOwn
              ? masks.generated.inkPixels - generatedOwn.inkPixels : null,
            finalizedPixels: masks.finalized?.inkPixels ?? null
          },
          generatedInkClusters: clusters,
          generatedInkPlacement: { insideADeclaredRectangle: placedInkPixels, outsideEveryDeclaredRectangle: strayInkPixels },
          declaredWritableRectanglesOnPage: writeOnPage.length,
          protectedRegionsOnPage: protectedOnPage.length,
          valuesWrittenOnPage: valuesOnPage,
          sourceTextPreservation: preservation,
          inkAccountedToALayer: unexplained,
          pinnedSourceControl,
          findings
        });
      }

      // One hash over the whole page set, so a package cannot be quoted a page
      // at a time. Any page re-rendered, added or dropped changes it.
      const visualEvidenceHash = sha256(Buffer.from(
        rasterHashes.map((r) => `${r.page}:${r.variant}:${r.sha256}`).sort().join("\n")
      ));

      const findingCount = pages.reduce((n, p) => n + p.findings.length, 0);
      const evidenceImages = [];
      for (const page of pages) {
        const carriesFinding = page.findings.length > 0;
        if (!carriesFinding && !isControl) continue;
        const row = rasterHashes.find((r) => r.page === page.page && r.variant === "finalized");
        if (!row || !page.pageFrame) continue;
        const target = path.join(
          EVIDENCE_DIR,
          `${family.jurisdiction}-${family.familySlug}-audit-page-${String(page.page).padStart(2, "0")}.png`
        );
        if (!checkOnly) {
          await annotate(path.join(rootDir, row.raster), target, {
            frame: page.pageFrame, pageHeightPt: page.heightPt,
            writeRects: declared.rects.filter((r) => r.page === page.page),
            protectedOnPage: guarded.filter((r) => r.page === page.page),
            clusters: page.generatedInkClusters,
            findings: page.findings.length
          });
        }
        evidenceImages.push(path.relative(rootDir, target));
      }

      const manifest = {
        schemaVersion: "rcap-all-page-visual-evidence/v1",
        generatedBy: "scripts/generate-rcap-all-page-visual-evidence.mjs",
        familyId: family.familyId,
        jurisdiction: family.jurisdiction,
        familySlug: family.familySlug,
        documentId: family.documentId,
        officialTitle: family.officialTitle,
        artifact: {
          path: path.relative(rootDir, family.canonical),
          sha256: artifactSha,
          pagesExpected: pageCount,
          pagesRasterized: pages.length,
          everyPageCovered: pages.length === pageCount,
          pageOneOnlyPackageRefused: pageCount > 1 && pages.length === 1 ? true : false
        },
        pinnedSourceSha256: family.sourceSha256,
        sourceBinaryInThisClone: isControl ? path.relative(rootDir, binaries.get(family.sourceSha256)) : null,
        layerBasis: unsplittable.length
          ? `${unsplittable.length} of ${pageCount} page(s) could not be split into official and generated layers`
          : "every page split into the official source stream and the appended generated stream",
        declaredWritableRectangles: { basis: declared.basis, count: declared.rects.length },
        protectedRegions: { count: guarded.length, regions: guarded },
        boundParticipantFields: populated.length,
        defaultAppearances: {
          ...residue,
          verdict: residue.flat
            ? "flat: no widget survives to draw a chooser prompt, comb or default appearance"
            : "NOT FLAT: an interactive widget survives and will draw its own appearance on the filing"
        },
        visualEvidenceHash,
        rasters: rasterHashes,
        renderedEvidence: evidenceImages,
        pages,
        verdict: {
          findings: findingCount,
          duplicateValues: pages.some((p) => p.findings.some((f) => f.code === "same_value_written_to_more_than_one_declared_rectangle" || f.code === "written_value_appears_more_than_once_on_page"))
            ? "a value is written more than once; see the per-page findings"
            : "no value is written more than once on any page",
          placement: pages.some((p) => p.findings.some((f) => f.code === "artifact_carries_generated_ink_but_no_writable_rectangle_is_declared"))
            ? "not checkable: the artifact carries generated ink on a page whose map declares no writable rectangle"
            : pages.every((p) => !p.findings.some((f) => f.code === "generated_ink_outside_every_declared_rectangle" || f.code === "generated_ink_crosses_its_rectangle_boundary"))
              ? "every generated mark sits inside a declared writable rectangle"
              : "generated ink is outside or across a declared writable rectangle",
          protectedRegions: pages.some((p) => p.findings.some((f) => f.code === "participant_derived_ink_in_protected_region"))
            ? "participant-derived ink is inside a protected region"
            : pages.some((p) => p.findings.some((f) => f.code === "flattening_redrew_form_furniture_in_a_protected_region"))
              ? "no participant-derived ink in any protected region; flattening re-drew the form's own outline inside one"
              : "no generated ink touches a protected region",
          sourcePreservation: pages.some((p) => p.findings.some((f) => f.code === "printed_source_ink_covered_outside_every_declared_rectangle"))
            ? "our layer covers printed ink outside every declared writable rectangle"
            : "no printed ink is covered outside a declared writable rectangle",
          defaultAppearances: residue.flat ? "clear" : "residual interactive machinery",
          pinnedSourceControl: isControl
            ? (pages.every((p) => p.pinnedSourceControl?.comparable && p.pinnedSourceControl.differingFraction < 0.001)
              ? "control held: the isolated official layer renders as the pinned source binary does"
              : "CONTROL FAILED: the isolated official layer does not render as the pinned source binary does")
            : "not available: the pinned source binary is not in this clone"
        },
        whatThisDoesNotEstablish: [
          "that the official source layer matches the current official edition of the form",
          isControl
            ? "nothing further: the pinned source binary is in this clone and the source layer can be compared against it"
            : "that the official source layer is uncontaminated, since the pinned source binary is not in this clone and cannot be hashed against the artifact's source stream",
          "that a value is legally correct for the participant, which is counsel's judgement and not a measurement"
        ]
      };

      const target = path.join(FAMILY_DIR, manifestName(family));
      const json = `${JSON.stringify(manifest, null, 2)}\n`;
      if (checkOnly) {
        const current = fs.existsSync(target) ? fs.readFileSync(target, "utf8") : "";
        if (current !== json) {
          console.error(`FAIL all-page visual evidence — ${path.relative(rootDir, target)} is stale`);
          process.exitCode = 1;
        }
      } else {
        fs.writeFileSync(target, json);
      }
      written.push(manifest);
      console.log(`  ${family.familyId} — ${pages.length}/${pageCount} pages, ${findingCount} finding(s), evidence hash ${visualEvidenceHash.slice(0, 12)}`);
    }
  });

  // The roll-up is rebuilt from every manifest on disk, not only this batch, so
  // a four-family run never narrows the denominator to four.
  const onDisk = fs.readdirSync(FAMILY_DIR).filter((f) => f.endsWith(".json")).sort()
    .map((f) => readJson(path.join(FAMILY_DIR, f))).filter(Boolean);
  const index = {
    schemaVersion: "rcap-all-page-visual-evidence-index/v1",
    generatedBy: "scripts/generate-rcap-all-page-visual-evidence.mjs",
    purpose: "Every page of every finalized RCAP artifact, rendered and measured: where the marks LegalEase added landed, and what of the official form they left alone.",
    method: {
      renderer: "Chromium's bundled PDF engine, via scripts/rcap-official-forms/rcap-pdf-rasterize.mjs",
      scale: SCALE,
      layerSeparation: "Structural, not differential. Each artifact page carries [q, official source stream, Q, appended generated stream]; the official layer is the source's own stream object rather than a reconstruction, so no blank binary is needed to tell the two apart.",
      placement: "Ink in the generated-layer render is clustered, converted to page points and required to sit inside a rectangle the family's own map declares writable, within 4pt.",
      protectedRegions: "A protected region is breached only by ink in the GENERATED layer. Official text printed inside a signature or clerk block lives in the source layer and is never counted as a leak.",
      sourcePreservation: "Source-layer ink absent from the finalized render is source text the fill destroyed, counted in pixels.",
      values: "Written values are read back out of the overlay's own content stream with their coordinates, so the text side of the verdict is independent of the pixel side."
    },
    totals: {
      familiesCovered: onDisk.length,
      familiesInProductionTree: all.length,
      pagesExpected: onDisk.reduce((n, m) => n + m.artifact.pagesExpected, 0),
      pagesRasterized: onDisk.reduce((n, m) => n + m.artifact.pagesRasterized, 0),
      rastersRecorded: onDisk.reduce((n, m) => n + m.rasters.length, 0),
      familiesWithEveryPageCovered: onDisk.filter((m) => m.artifact.everyPageCovered).length,
      familiesWithNoFindings: onDisk.filter((m) => m.verdict.findings === 0).length,
      familiesWithFindings: onDisk.filter((m) => m.verdict.findings > 0).length,
      familiesWithParticipantDerivedInkInAProtectedRegion: onDisk.filter((m) => m.verdict.protectedRegions.startsWith("participant-derived")).length,
      familiesWhereOurLayerCoversPrintedInkOutsideADeclaredRectangle: onDisk.filter((m) => m.verdict.sourcePreservation.startsWith("our layer covers")).length,
      familiesNotFlat: onDisk.filter((m) => !m.defaultAppearances.flat).length,
      familiesWhereFlatteningRedrewFormFurniture: onDisk.filter((m) => m.pages.some((p) => p.findings.some((f) => f.code === "flattening_redrew_the_form_s_own_furniture"))).length,
      familiesCarryingGeneratedInkWithNoDeclaredRectangle: onDisk.filter((m) => m.verdict.placement.startsWith("not checkable")).length,
      familiesWhosePinnedSourceIsInThisClone: onDisk.filter((m) => m.sourceBinaryInThisClone).length,
      controlFamiliesWhoseOfficialLayerMatchesThePinnedBinary: onDisk.filter((m) => m.verdict.pinnedSourceControl.startsWith("control held")).length
    },
    families: onDisk.map((m) => ({
      familyId: m.familyId, artifactSha256: m.artifact.sha256,
      pagesExpected: m.artifact.pagesExpected, pagesRasterized: m.artifact.pagesRasterized,
      visualEvidenceHash: m.visualEvidenceHash, findings: m.verdict.findings,
      placement: m.verdict.placement, protectedRegions: m.verdict.protectedRegions,
      sourcePreservation: m.verdict.sourcePreservation, defaultAppearances: m.verdict.defaultAppearances,
      pinnedSourceControl: m.verdict.pinnedSourceControl,
      manifest: path.relative(rootDir, path.join(FAMILY_DIR, `${m.jurisdiction}__${m.familySlug}.json`))
    }))
  };
  const indexJson = `${JSON.stringify(index, null, 2)}\n`;
  if (checkOnly) {
    const current = fs.existsSync(INDEX) ? fs.readFileSync(INDEX, "utf8") : "";
    if (current !== indexJson) {
      console.error(`FAIL all-page visual evidence — ${path.relative(rootDir, INDEX)} is stale`);
      process.exitCode = 1;
    }
  } else {
    fs.writeFileSync(INDEX, indexJson);
  }

  console.log(`OK all-page visual evidence — ${index.totals.familiesCovered}/${index.totals.familiesInProductionTree} families, ${index.totals.pagesRasterized}/${index.totals.pagesExpected} pages, ${index.totals.familiesWithFindings} with findings`);
}

await main();
