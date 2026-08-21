#!/usr/bin/env node
// All-page visual evidence for Gate B lane 2, batch 01.
//
//   node scripts/verify-rcap-lane2-visual-evidence.mjs
//   node scripts/verify-rcap-lane2-visual-evidence.mjs --check
//
// The six KY/NE families re-rendered at this branch's base, each given the
// package a reviewer needs and nothing more: every field-carrying page of the
// official source and of the finalized artifact as a picture, bound by hash to
// the artifact bytes those pictures are of.
//
// WHAT THIS DOES NOT RE-IMPLEMENT
//
// Placement, protected regions, raster coverage and stale binding are decided
// by scripts/rcap-official-forms/rcap-evidence-contract.mjs, which already owns
// them. This file renders the pages, runs those contract functions against the
// current bytes, and writes the result down. A second geometry engine beside
// the contract would be two answers to one question, and the wrong one would
// eventually be the one somebody quoted.
//
// The official source binaries live under private/ and are not in this clone,
// which is why the contact sheet is the required input: its left panel IS the
// official source page and its right panel the finalized artifact, so one
// render carries both and the comparison between them needs no third file.
//
// SOURCE-TEXT PRESERVATION is the one question the contract does not answer, so
// it is answered here and only here: every pixel of ink the official panel
// carries must still be ink in the finalized panel. That is what "no printed
// source text erased" means when you ask it of a picture rather than of a
// string. The panels are located by finding the unlinked gutter between them
// rather than by the sheet builder's layout constants, so a change to the
// builder cannot silently move what is being compared.
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import zlib from "node:zlib";
import { rasterizePdf } from "./rcap-official-forms/rcap-pdf-rasterize.mjs";
import { auditPlacements, pagesRequiringRaster, rasterContract, placementValuesFor, reconcileWrittenAgainstDeclared, EVIDENCE_CONTRACT_VERSION }
  from "./rcap-official-forms/rcap-evidence-contract.mjs";
import { CANONICAL } from "./implement-rcap-official-forms-d1.mjs";

const require = createRequire(import.meta.url);
const sharp = require("sharp");
const { PDFDocument, PDFName, PDFArray, PDFDict } = require("pdf-lib");

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PRODUCTION = path.join(rootDir, "data/rcap-all50/overlays/production");
const OUT_DIR = path.join(rootDir, "docs/record-clearing/pdf-visual-evidence/lane2-batch01");
const checkOnly = process.argv.includes("--check");
const SCALE = 2;
const RENDER_DATE = new Date("2026-01-01T00:00:00Z");
// Court forms print black on white and the renderer draws black; the threshold
// sits far from both.
const INK_MAX_GREY = 190;

// The batch, in the order the assignment names it. The seventh family is listed
// deliberately: it has no artifact, and a package that simply omitted it would
// be indistinguishable from one that forgot it.
const BATCH = [
  { familyId: "KY:aoc-496-form-en", dir: "kentucky/aoc-496-form-en" },
  { familyId: "KY:aoc-496-2-form-en", dir: "kentucky/aoc-496-2-form-en" },
  { familyId: "KY:aoc-496-4-form-en", dir: "kentucky/aoc-496-4-form-en" },
  { familyId: "NE:cc-6-11-form-en", dir: "nebraska/cc-6-11-form-en" },
  { familyId: "NE:cc-6-11-2-form-en", dir: "nebraska/cc-6-11-2-form-en" },
  { familyId: "NE:cc-6-12-form-en", dir: "nebraska/cc-6-12-form-en" }
];
const NOT_APPLICABLE = { familyId: "NE:cc-6-11a-instructions-en", dir: "nebraska/cc-6-11a-instructions-en" };

const sha256 = (buf) => crypto.createHash("sha256").update(buf).digest("hex");
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
 * Interactive machinery that survived flattening.
 *
 * A finalized filing must be flat. A surviving widget draws its own default
 * appearance -- an unselected chooser prompt, a comb, a highlight box -- and
 * that is a mark on a court filing that no field map describes and no reviewer
 * asked for.
 */
async function defaultAppearanceProof(bytes) {
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
  return {
    acroFormPresent: Boolean(acroForm), acroFieldCount, widgetAnnotations, needAppearances, flat,
    verdict: flat
      ? "flat: no widget survives to draw a chooser prompt, comb or default appearance"
      : "NOT FLAT: interactive machinery survives and will draw its own appearance on the filing"
  };
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "rcap-lane2-"));
  const families = [];
  const hashesBefore = {};
  const hashesAfter = {};

  for (const entry of BATCH) {
    const base = path.join(PRODUCTION, entry.dir);
    const artifactPath = path.join(base, "fixtures/canonical-filled.pdf");
    const sheetPath = path.join(base, "contact-sheet/blank-vs-filled.pdf");
    const artifactBytes = fs.readFileSync(artifactPath);
    const currentArtifactSha256 = sha256(artifactBytes);
    hashesBefore[entry.familyId] = currentArtifactSha256;

    const census = readJson(path.join(base, "field-census.json"));
    const map = readJson(path.join(base, "production-field-map.json"));
    const populated = readJson(path.join(base, "reports/populated-fields.json")) ?? [];
    const requiredPages = pagesRequiringRaster(census);

    const doc = await PDFDocument.load(artifactBytes, { ignoreEncryption: true, updateMetadata: false });
    const finalizedPageCount = doc.getPageCount();
    const sheetBytes = fs.readFileSync(sheetPath);
    const sheetDoc = await PDFDocument.load(sheetBytes, { ignoreEncryption: true, updateMetadata: false });
    const sheetPageCount = sheetDoc.getPageCount();

    const jur = entry.familyId.split(":")[0];
    const slug = entry.familyId.split(":")[1];
    const workDir = path.join(tmpRoot, slug);

    // The contact sheet carries the official source and the finalized artifact
    // side by side, which is why it is the required input: the official binary
    // is not in this clone and the sheet is where the source page still exists.
    // One document per page, so a captured frame holds that page and nothing
    // else. See onePageDocument.
    fs.mkdirSync(workDir, { recursive: true });
    const sheetRendered = [];
    const finalizedRendered = [];
    for (const pageNumber of requiredPages) {
      for (const [bytes, into, prefix, sink] of [
        [sheetBytes, "sheet", "sheet", sheetRendered],
        [artifactBytes, "final", "final", finalizedRendered]
      ]) {
        const one = path.join(workDir, `${prefix}-${String(pageNumber).padStart(2, "0")}.pdf`);
        fs.writeFileSync(one, await onePageDocument(bytes, pageNumber - 1));
        const [row] = await rasterizePdf({ file: one, outDir: path.join(workDir, into), scale: SCALE, prefix: `${prefix}-${String(pageNumber).padStart(2, "0")}-of` });
        if (row) sink.push({ ...row, page: pageNumber });
      }
    }

    const { values, tooShortToLocate, noFactValue, refusedAtRender } = placementValuesFor({ populatedFields: populated, facts: CANONICAL });
    const writtenFields = new Set(populated.filter((r) => r.written !== false).map((r) => String(r.field)));
    const rasters = [];
    const pages = [];
    for (const pageNumber of requiredPages) {
      const sheetRow = sheetRendered.find((r) => r.page === pageNumber) ?? null;
      const finalRow = finalizedRendered.find((r) => r.page === pageNumber) ?? null;
      const committed = [];

      for (const [kind, row] of [["contact-sheet", sheetRow], ["finalized", finalRow]]) {
        if (!row) continue;
        const name = `${jur}-${slug}-${kind}-page-${String(pageNumber).padStart(2, "0")}.png`;
        const target = path.join(OUT_DIR, name);
        if (!checkOnly) fs.copyFileSync(row.file, target);
        const bytes = fs.existsSync(target) ? fs.readFileSync(target) : fs.readFileSync(row.file);
        rasters.push({
          page: pageNumber, of: kind, image: path.relative(rootDir, target), sha256: sha256(bytes),
          widthPx: row.widthPx, heightPx: row.heightPx, boundToArtifactSha256: currentArtifactSha256
        });
        committed.push(name);
      }

      const split = splitLayers(doc, doc.getPages()[pageNumber - 1]);
      const placements = split.splittable ? overlayPlacements(doc, doc.getPages()[pageNumber - 1], split, writtenFields) : [];
      const covering = placements.filter((pl) => pl.opaqueBox && pl.box);
      // Text an appearance draws for a field the renderer never wrote is the
      // widget's own default, flattened onto the filing. NE:cc-6-11 draws
      // "Choose " that way -- an unselected chooser prompt on a court document,
      // invisible to any count of surviving widget annotations.
      const classify = (text) => {
        const joined = text.join(" ").trim();
        if (/^choose\b/i.test(joined)) return "unselected chooser prompt";
        if (/^(print|reset|save|clear|submit)\s*form$/i.test(joined.replace(/\s+/g, " "))) return "command button";
        if (text.length > 20) return "unselected chooser option list";
        return "flattened caption or label";
      };
      const prompts = placements
        .filter((pl) => pl.textDrawn.length)
        .filter((pl) => !pl.textDrawn.some((t) => Object.values(values).some((v) => v && t.includes(v))))
        .map((pl) => ({ appearance: pl.appearance, box: pl.box, kind: classify(pl.textDrawn),
          text: pl.textDrawn.length > 12 ? [...pl.textDrawn.slice(0, 6), `…and ${pl.textDrawn.length - 6} more`] : pl.textDrawn }));

      const preservation = split.splittable
        ? {
          officialLayerIntact: true,
          officialStreamsCarriedForward: split.officialStreams,
          ourContentIsStrictlyAppended: true,
          opaqueBoxesPaintedOverThePage: covering.map((c) => ({ appearance: c.appearance, box: c.box, fillGrey: c.fillGrey }))
        }
        : { officialLayerIntact: false, because: split.reason };

      pages.push({
        page: pageNumber, carriesFields: true, images: committed,
        sourceTextPreservation: preservation,
        defaultAppearanceResidue: prompts
      });
    }

    const audit = auditPlacements({ doc, census, map, values });
    const coverage = rasterContract({
      requiredPages, renderedPages: [...new Set(rasters.map((r) => r.page))],
      manifestArtifactSha256: currentArtifactSha256, currentArtifactSha256
    });
    const reconciliation = reconcileWrittenAgainstDeclared({
      writtenFields: populated.filter((r) => r.written !== false).map((r) => r.field),
      declaredBindings: (map?.bindings ?? []).map((b) => b.field),
      // The renderer records a refusal on the populated-fields row it could not
      // write (`written: false` with a reason), not in the map's binding
      // refusals. Reading the map alone reported KY AOC-496's county -- refused
      // because the fixture county is not among the dropdown's options -- as a
      // binding that silently vanished, which is a different and more serious
      // finding than the one that is true.
      refusedFields: [
        ...(map?.bindingRefusals ?? []),
        ...populated.filter((r) => r.written === false)
      ]
    });
    const appearances = await defaultAppearanceProof(artifactBytes);

    const coveredPages = pages.filter((p) => (p.sourceTextPreservation?.opaqueBoxesPaintedOverThePage ?? []).length);
    const promptPages = pages.filter((p) => (p.defaultAppearanceResidue ?? []).length);
    // A page whose panels could not be located was not checked, and an unchecked
    // page must never read as a clear one. The first run of this generator
    // located no panels at all -- the viewer's dark background counted as ink
    // across the whole frame -- and still reported every family clear, which is
    // the exact shape of a verdict nobody should trust.
    const unsplittablePages = pages.filter((p) => !p.sourceTextPreservation?.officialLayerIntact);
    const manifest = {
      schemaVersion: "rcap-lane2-visual-evidence/v1",
      evidenceContract: EVIDENCE_CONTRACT_VERSION,
      generatedBy: "scripts/verify-rcap-lane2-visual-evidence.mjs",
      familyId: entry.familyId,
      artifact: {
        path: path.relative(rootDir, artifactPath),
        currentArtifactSha256,
        contactSheetSha256: sha256(sheetBytes),
        finalizedPageCount, contactSheetPageCount: sheetPageCount,
        pagesRequiringRaster: requiredPages,
        pagesRasterized: [...new Set(rasters.map((r) => r.page))].sort((a, b) => a - b)
      },
      rasterCoverage: coverage,
      placementAudit: {
        placements: audit.placements,
        placedOutsideIntendedGeometry: audit.placedOutsideIntendedGeometry,
        valuesNotLocatable: { tooShortToLocate, noFactValue, refusedAtRender }
      },
      protectedRegionProof: {
        drawnIntoAProtectedSlot: audit.drawnIntoAProtectedSlot,
        basis: "auditPlacements attributes an occurrence only when it matches a fixture value the map declared, so text the official form prints is never counted as participant-derived",
        clear: audit.drawnIntoAProtectedSlot.length === 0
      },
      sourceTextPreservation: {
        basis: "the official layer is the source's own content streams, carried forward inside a q/Q wrapper with our content strictly appended after it, so nothing in it is rewritten. What can still hide printed text is an opaque box our layer paints on top, so every such box is listed with its rectangle.",
        pagesWhereTheOfficialLayerIsIntact: pages.length - unsplittablePages.length,
        pagesNotSeparable: unsplittablePages.map((p) => p.page),
        pagesCarryingAnOpaqueBoxOverThePage: coveredPages.map((p) => p.page),
        opaqueBoxCount: coveredPages.reduce((n, p) => n + p.sourceTextPreservation.opaqueBoxesPaintedOverThePage.length, 0),
        clear: coveredPages.length === 0 && unsplittablePages.length === 0
      },
      writtenAgainstDeclared: reconciliation,
      defaultAppearances: {
        ...appearances,
        flattenedPromptsOnThePage: promptPages.map((p) => ({ page: p.page, residue: p.defaultAppearanceResidue })),
        chooserPromptsSurviving: promptPages.reduce((n, p) => n + p.defaultAppearanceResidue.filter((r) => r.kind.startsWith("unselected")).length, 0),
        commandButtonsSurviving: promptPages.reduce((n, p) => n + p.defaultAppearanceResidue.filter((r) => r.kind === "command button").length, 0),
        clear: appearances.flat && promptPages.length === 0,
        note: "A count of surviving widget annotations cannot see a default appearance that flattening moved into the page. Both are asked here."
      },
      pages, rasters
    };
    manifest.visualManifestHash = sha256(Buffer.from(
      rasters.map((r) => `${r.page}:${r.of}:${r.sha256}`).sort().join("\n") + `\n${currentArtifactSha256}`
    ));

    const target = path.join(OUT_DIR, `${jur}-${slug}-visual-manifest.json`);
    const json = `${JSON.stringify(manifest, null, 2)}\n`;
    if (checkOnly) {
      const current = fs.existsSync(target) ? fs.readFileSync(target, "utf8") : "";
      if (current !== json) {
        console.error(`FAIL lane2 visual evidence — ${path.relative(rootDir, target)} is stale`);
        process.exitCode = 1;
      }
    } else {
      fs.writeFileSync(target, json);
    }

    hashesAfter[entry.familyId] = sha256(fs.readFileSync(artifactPath));
    families.push(manifest);
    console.log(`  ${entry.familyId} — ${manifest.artifact.pagesRasterized.length}/${requiredPages.length} field pages, ${rasters.length} rasters, manifest ${manifest.visualManifestHash.slice(0, 12)}`);
  }

  fs.rmSync(tmpRoot, { recursive: true, force: true });

  // The seventh family is recorded, not skipped. "No artifact exists" and "we
  // did not look" are different statements and only one of them is true here.
  const naBase = path.join(PRODUCTION, NOT_APPLICABLE.dir);
  const notApplicable = {
    familyId: NOT_APPLICABLE.familyId,
    directoryPresent: fs.existsSync(naBase),
    finalizedArtifactPresent: fs.existsSync(path.join(naBase, "fixtures/canonical-filled.pdf")),
    contactSheetPresent: fs.existsSync(path.join(naBase, "contact-sheet/blank-vs-filled.pdf")),
    verdict: "not applicable: no participant fill and no finalized artifact exist for this instruction family, so no filled visual package was manufactured"
  };

  const moved = Object.keys(hashesBefore).filter((k) => hashesBefore[k] !== hashesAfter[k]);
  const index = {
    schemaVersion: "rcap-lane2-visual-evidence-index/v1",
    evidenceContract: EVIDENCE_CONTRACT_VERSION,
    generatedBy: "scripts/verify-rcap-lane2-visual-evidence.mjs",
    lane: "LANE-EVIDENCE", batch: "lane2-batch01",
    purpose: "Every field-carrying page of the official source and the finalized artifact for the six re-rendered KY/NE families, bound by hash to the bytes the pictures are of.",
    currentByteGuard: {
      hashesBefore, hashesAfter, anyArtifactChangedDuringTheRun: moved.length > 0, changed: moved
    },
    totals: {
      familiesCovered: families.length,
      pagesRequired: families.reduce((n, f) => n + f.artifact.pagesRequiringRaster.length, 0),
      pagesRasterized: families.reduce((n, f) => n + f.artifact.pagesRasterized.length, 0),
      rasters: families.reduce((n, f) => n + f.rasters.length, 0),
      familiesWithCompleteCoverage: families.filter((f) => f.rasterCoverage.complete).length,
      familiesWithAProtectedRegionIntrusion: families.filter((f) => !f.protectedRegionProof.clear).length,
      familiesPaintingAnOpaqueBoxOverThePage: families.filter((f) => !f.sourceTextPreservation.clear).length,
      familiesNotFlat: families.filter((f) => !f.defaultAppearances.flat).length,
      familiesCarryingAFlattenedDefaultAppearance: families.filter((f) => !f.defaultAppearances.clear).length,
      familiesWithAPlacementOutsideIntendedGeometry: families.filter((f) => f.placementAudit.placedOutsideIntendedGeometry.length > 0).length
    },
    families: families.map((f) => ({
      familyId: f.familyId, currentArtifactSha256: f.artifact.currentArtifactSha256,
      visualManifestHash: f.visualManifestHash,
      pagesRequired: f.artifact.pagesRequiringRaster, pagesRasterized: f.artifact.pagesRasterized,
      coverageComplete: f.rasterCoverage.complete,
      protectedRegionsClear: f.protectedRegionProof.clear,
      sourceTextPreserved: f.sourceTextPreservation.clear,
      flat: f.defaultAppearances.flat,
      defaultAppearancesClear: f.defaultAppearances.clear,
      manifest: path.relative(rootDir, path.join(OUT_DIR, `${f.familyId.replace(":", "-")}-visual-manifest.json`))
    })),
    notApplicable
  };

  const indexPath = path.join(OUT_DIR, "index.json");
  const indexJson = `${JSON.stringify(index, null, 2)}\n`;
  if (checkOnly) {
    const current = fs.existsSync(indexPath) ? fs.readFileSync(indexPath, "utf8") : "";
    if (current !== indexJson) {
      console.error(`FAIL lane2 visual evidence — ${path.relative(rootDir, indexPath)} is stale`);
      process.exitCode = 1;
    }
  } else {
    fs.writeFileSync(indexPath, indexJson);
  }

  if (moved.length) {
    console.error(`FAIL current-byte guard — artifact bytes moved during the run: ${moved.join(", ")}`);
    process.exitCode = 1;
  }
  console.log(`OK lane2 visual evidence — ${index.totals.familiesCovered} families, ${index.totals.pagesRasterized}/${index.totals.pagesRequired} field pages, ${index.totals.rasters} rasters`);
}

await main();
