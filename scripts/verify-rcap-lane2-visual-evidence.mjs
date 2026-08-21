#!/usr/bin/env node
// All-page visual evidence for Gate B lane 2, batch 01.
//
//   node scripts/verify-rcap-lane2-visual-evidence.mjs
//   node scripts/verify-rcap-lane2-visual-evidence.mjs --check
//   node scripts/verify-rcap-lane2-visual-evidence.mjs --mutations
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
const mutationsOnly = process.argv.includes("--mutations");
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

/**
 * Mutations for the two proofs this file owns.
 *
 * Placement, protected regions, raster coverage and stale binding are mutated
 * by scripts/verify-rcap-evidence-contract-controls.mjs, which owns that code.
 * Source-text preservation and the flattened default appearance are decided
 * here, so they are mutated here -- and they need it more, not less: the first
 * run of this generator reported every family clear on both, and both answers
 * were vacuous. A proof that has never been seen to refuse anything is not a
 * proof, so each of these breaks a real artifact in memory and requires the
 * answer to change. Nothing is written to disk.
 */
// The fixture values a mutation injects and then requires the classifier to
// leave alone. Taken from the same canonical facts the renderer draws from, so
// the test is the real discrimination and not a lookalike string.
const MUTATION_VALUES = {
  name: CANONICAL["participant.full_legal_name"],
  caseNumber: CANONICAL["matter.case_number"]
};

async function runMutations() {
  const results = [];
  const record = (id, title, held, detail) => {
    results.push({ id, title, held, detail });
    console.log(`  ${held ? "ok  " : "FAIL"} ${id} — ${title}`);
    console.log(`         ${detail}`);
  };

  const load = async (dir) => {
    const file = path.join(PRODUCTION, dir, "fixtures/canonical-filled.pdf");
    const bytes = fs.readFileSync(file);
    const doc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
    return { bytes, doc };
  };
  const reload = async (doc) => {
    const saved = await doc.save({ useObjectStreams: false });
    return PDFDocument.load(saved, { ignoreEncryption: true, updateMetadata: false });
  };
  // The same appended-content shape the factory writes, so a mutation is
  // detected because of what it paints and not because it looks foreign.
  const appendAppearance = (doc, page, name, body, bbox) => {
    const xobj = doc.context.register(doc.context.stream(body, {
      Type: "XObject", Subtype: "Form", FormType: 1,
      BBox: doc.context.obj(bbox), Resources: doc.context.obj({})
    }));
    const resources = doc.context.lookup(page.node.get(PDFName.of("Resources")));
    let table = resources instanceof PDFDict ? doc.context.lookup(resources.get(PDFName.of("XObject"))) : null;
    if (!(table instanceof PDFDict)) {
      table = doc.context.obj({});
      resources.set(PDFName.of("XObject"), table);
    }
    table.set(PDFName.of(name), xobj);
    const added = doc.context.register(doc.context.stream(`q 1 0 0 1 90 500 cm /${name} Do Q`));
    const contents = page.node.get(PDFName.of("Contents"));
    contents.push(added);
  };
  const residueOf = (placements) => placements
    .filter((pl) => pl.textDrawn.length)
    .filter((pl) => !pl.textDrawn.some((t) => Object.values(MUTATION_VALUES).some((v) => v && t.includes(v))));

  // M1 — the official layer removed. KY:aoc-496-4 carries eight source streams
  // inside the wrapper on page 1; strip them and the page must stop reading as
  // a preserved source rather than reading as an intact empty one.
  {
    const { doc } = await load("kentucky/aoc-496-4-form-en");
    const before = splitLayers(doc, doc.getPages()[0]);
    const page = doc.getPages()[0];
    const contents = page.node.get(PDFName.of("Contents"));
    const kept = [];
    for (let i = 0; i < contents.size(); i += 1) kept.push(contents.get(i));
    const close = before.sourceRefs.length - 1;
    const stripped = [kept[0], kept[close], ...kept.slice(close + 1)];
    page.node.set(PDFName.of("Contents"), doc.context.obj(stripped));
    const after = splitLayers(await reload(doc), (await reload(doc)).getPages()[0]);
    record("M1", "source text: strip the source's own streams and the official layer stops reading as preserved",
      before.splittable && before.officialStreams === 8 && after.splittable === false,
      `intact: splittable=${before.splittable}, officialStreams=${before.officialStreams}; stripped: splittable=${after.splittable}, reason=${after.reason ?? "none"}`);
  }

  // M2 — an opaque box painted over the page. KY:aoc-496-4 paints none, which is
  // why it is the mutation subject: a check that only ever answers "not clear"
  // has not been shown to be reading anything.
  {
    const clean = await load("kentucky/aoc-496-4-form-en");
    const cleanSplit = splitLayers(clean.doc, clean.doc.getPages()[0]);
    const cleanBoxes = overlayPlacements(clean.doc, clean.doc.getPages()[0], cleanSplit, new Set()).filter((pl) => pl.opaqueBox);
    const { doc } = await load("kentucky/aoc-496-4-form-en");
    appendAppearance(doc, doc.getPages()[0], "MutantWhiteBox", "1 g 0 0 180 24 re f", [0, 0, 180, 24]);
    const mutated = await reload(doc);
    const split = splitLayers(mutated, mutated.getPages()[0]);
    const boxes = overlayPlacements(mutated, mutated.getPages()[0], split, new Set()).filter((pl) => pl.opaqueBox);
    record("M2", "source text: an opaque white box appended over the page is seen, on a family that paints none",
      cleanBoxes.length === 0 && boxes.length === 1 && boxes[0].fillGrey === 1,
      `unmutated: ${cleanBoxes.length} opaque box(es); mutated: ${boxes.length} at ${JSON.stringify(boxes[0]?.box ?? null)}, fillGrey=${boxes[0]?.fillGrey ?? "none"}`);
  }

  // M3 — the flattened chooser prompts removed. NE:cc-6-11 draws "Choose " twice;
  // drop the appended invocations and the residue must fall to nothing, or the
  // answer was never a function of the bytes.
  {
    const { doc } = await load("nebraska/cc-6-11-form-en");
    const page = doc.getPages()[0];
    const before = residueOf(overlayPlacements(doc, page, splitLayers(doc, page), new Set()));
    const contents = page.node.get(PDFName.of("Contents"));
    const refs = [];
    for (let i = 0; i < contents.size(); i += 1) refs.push(contents.get(i));
    const split = splitLayers(doc, page);
    page.node.set(PDFName.of("Contents"), doc.context.obj(refs.slice(0, split.sourceRefs.length)));
    const mutated = await reload(doc);
    const mutatedPage = mutated.getPages()[0];
    const mutatedSplit = splitLayers(mutated, mutatedPage);
    const after = mutatedSplit.splittable ? residueOf(overlayPlacements(mutated, mutatedPage, mutatedSplit, new Set())) : [];
    record("M3", "default appearance: with the appended invocations gone the residue count falls to zero",
      before.length === 4 && after.length === 0,
      `unmutated: ${before.length} residue occurrence(s) (${[...new Set(before.map((r) => r.textDrawn[0]?.trim()))].join(", ")}); stripped: ${after.length}`);
  }

  // M4 — a chooser prompt injected, and a participant value injected beside it.
  // The classifier must call the first a surviving default and must not call the
  // second one anything at all: participant-derived text on the page is the
  // renderer doing its job, and flagging it would be the same vacuous answer in
  // the other direction.
  {
    const { doc } = await load("kentucky/aoc-496-4-form-en");
    const page = doc.getPages()[0];
    appendAppearance(doc, page, "MutantChooser", "BT /Helv 9 Tf (Choose the county) Tj ET", [0, 0, 120, 14]);
    appendAppearance(doc, page, "MutantWritten", `BT /Helv 9 Tf (${MUTATION_VALUES.name}) Tj ET`, [0, 0, 120, 14]);
    const mutated = await reload(doc);
    const mutatedPage = mutated.getPages()[0];
    const placements = overlayPlacements(mutated, mutatedPage, splitLayers(mutated, mutatedPage), new Set());
    const residue = residueOf(placements);
    const chooser = residue.filter((r) => /^choose\b/i.test(r.textDrawn.join(" ").trim()));
    const leaked = residue.filter((r) => r.textDrawn.some((t) => t.includes(MUTATION_VALUES.name)));
    const sawWritten = placements.some((pl) => pl.textDrawn.some((t) => t.includes(MUTATION_VALUES.name)));
    record("M4", "default appearance: an injected chooser prompt is caught and an injected participant value is not",
      chooser.length === 1 && sawWritten && leaked.length === 0,
      `injected chooser classified as residue: ${chooser.length === 1}; injected participant value drawn: ${sawWritten}, wrongly called residue: ${leaked.length}`);
  }

  const held = results.filter((r) => r.held).length;
  if (held !== results.length) {
    console.error(`FAIL lane2 visual-evidence mutations — ${held}/${results.length} held`);
    process.exitCode = 1;
    return;
  }
  console.log(`OK lane2 visual-evidence mutations — ${held}/${results.length} held; source-text preservation and flattened default appearance each shown to refuse and to accept`);
}

if (mutationsOnly) await runMutations();
else await main();
