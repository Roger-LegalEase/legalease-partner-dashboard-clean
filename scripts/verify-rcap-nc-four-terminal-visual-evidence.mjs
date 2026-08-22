#!/usr/bin/env node
// Current terminal visual evidence for the four corrected NC translations.
//
//   node scripts/verify-rcap-nc-four-terminal-visual-evidence.mjs
//   node scripts/verify-rcap-nc-four-terminal-visual-evidence.mjs --check
//
// The result these four families now carry is that no participant artifact
// exists, so that is what this proves. It renders every page of each official
// source from the installed source PDF, reads the court's own non-filing notice
// out of those pages, and then establishes the absence: no fixture, no contact
// sheet, no proof describing artifacts that were withdrawn.
//
// It deliberately does not raster an artifact. There is no current participant
// PDF to raster, and rendering the withdrawn one would produce a picture of a
// file that no longer exists -- current-looking evidence for the exact thing the
// correction removed. The withdrawal receipts are carried by hash instead, which
// says what was removed without reconstituting it.
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { rasterizePdf } from "./rcap-official-forms/rcap-pdf-rasterize.mjs";
import { extractTextItems } from "./rcap-official-forms/rcap-pdf-anchor-capture.mjs";

const require = createRequire(import.meta.url);
const sharp = require("sharp");
const { PDFDocument } = require("pdf-lib");

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = path.join(rootDir, "docs/record-clearing/pdf-visual-evidence/nc-four-terminal");
const SOURCE_ROOT = path.join(rootDir, "private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1");
const DISPATCH_COMMIT = "f6ae12208f13a38afa86cfd5bb5732c905197fc7";
const DISPATCH_PATH = "data/rcap-all50/pdf-nc-four-freeze-dispatch.json";
const FREEZE_SHA = "0ed171216480b43f6e67848f1a3b3947caf59641";
const ENGLISH_FAMILIES = [
  "data/rcap-all50/overlays/production/north-carolina/aoc-cr-287-form-en",
  "data/rcap-all50/overlays/production/north-carolina/aoc-cr-288-form-en"
];
const checkOnly = process.argv.includes("--check");
const SCALE = 2;
const RENDER_DATE = new Date("2026-01-01T00:00:00Z");

const sha256 = (b) => crypto.createHash("sha256").update(b).digest("hex");
const round = (n) => Number(Number(n).toFixed(2));
const git = (...args) => execFileSync("git", args, { cwd: rootDir, maxBuffer: 1 << 28 });

// The notice the court prints on these translations, in each of the three
// languages the four families carry. Read out of the source's own glyphs: the
// whole disposition rests on the document saying this, so it is established
// from the document rather than from any record that describes it.
const NOTICE_PHRASES = [
  { id: "informational_purposes_only", rx: /informational purposes only/i },
  { id: "do_not_complete_this_form_for_filing", rx: /do not complete this form for filing/i },
  { id: "use_the_english_version", rx: /use the english\s+version/i },
  { id: "es_solo_informativo", rx: /s[oó]lo se dispone para fines informativos/i },
  { id: "es_no_presentar", rx: /no lo debe presentar en el\s+tribunal/i },
  { id: "vi_thong_tin", rx: /th[ôo]ng tin/i }
];

/** A one-page document holding just pageIndex, so no neighbouring page bleeds in. */
async function onePageDocument(bytes, pageIndex) {
  const src = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  const one = await PDFDocument.create();
  const [copied] = await one.copyPages(src, [pageIndex]);
  one.addPage(copied);
  one.setCreationDate(RENDER_DATE);
  one.setModificationDate(RENDER_DATE);
  return one.save({ useObjectStreams: false });
}

/** Where the page sits inside the captured frame, so the viewer letterbox is not counted. */
async function pageRectangle(pngPath) {
  const { data, info } = await sharp(pngPath).greyscale().raw().toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  const background = data[0];
  const isBg = (v) => Math.abs(v - background) <= 6;
  const colBg = (x) => { for (let y = 0; y < height; y += 3) if (!isBg(data[y * width + x])) return false; return true; };
  const rowBg = (y, x0, x1) => { for (let x = x0; x <= x1; x += 3) if (!isBg(data[y * width + x])) return false; return true; };
  let left = 0; while (left < width && colBg(left)) left += 1;
  let right = width - 1; while (right > left && colBg(right)) right -= 1;
  let top = 0; while (top < height && rowBg(top, left, right)) top += 1;
  let bottom = height - 1; while (bottom > top && rowBg(bottom, left, right)) bottom -= 1;
  const inset = 3;
  const w = right - left + 1 - inset * 2;
  const h = bottom - top + 1 - inset * 2;
  if (w < 64 || h < 64) return null;
  return { left: left + inset, top: top + inset, width: w, height: h };
}

async function rasterSourcePage({ bytes, pageIndex, tmpRoot, outName }) {
  const single = await onePageDocument(bytes, pageIndex);
  const work = path.join(tmpRoot, sha256(Buffer.from(single)));
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
  return { image: outName, sha256: sha256(fs.readFileSync(dest)), widthPx: meta.width, heightPx: meta.height,
    croppedToPage: Boolean(rect), looksBlank: rendered[0]?.looksBlank ?? null };
}

/**
 * A watermark, read as a page-spanning run of text drawn at an angle or in
 * outsized type. Reported as found or as not present in this source: a
 * translation that carries no watermark is not a failure, and claiming one it
 * does not have would be the failure.
 */
function watermarkOn(items, page) {
  const candidates = items
    .filter((i) => (i.size ?? 0) >= 24)
    .map((i) => ({ text: String(i.text ?? "").trim(), size: round(i.size ?? 0), x: round(i.x), y: round(i.y) }))
    .filter((i) => i.text.length >= 3);
  return { page, oversizedTextRuns: candidates, watermarkPresent: candidates.length > 0 };
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "rcap-nc4-"));
  const dispatch = JSON.parse(git("show", `${DISPATCH_COMMIT}:${DISPATCH_PATH}`).toString("utf8"));
  if (dispatch.NC_FOUR_IMPLEMENTATION_FREEZE_SHA !== FREEZE_SHA) {
    throw new Error(`freeze mismatch: dispatch names ${dispatch.NC_FOUR_IMPLEMENTATION_FREEZE_SHA}, this run is built for ${FREEZE_SHA}`);
  }

  const englishTreeHashes = {};
  for (const p of ENGLISH_FAMILIES) {
    englishTreeHashes[p] = {
      atFreeze: git("rev-parse", `${FREEZE_SHA}:${p}`).toString("utf8").trim(),
      onDisk: git("rev-parse", `HEAD:${p}`).toString("utf8").trim()
    };
    englishTreeHashes[p].unchanged = englishTreeHashes[p].atFreeze === englishTreeHashes[p].onDisk;
  }

  const families = [];
  for (const fam of dispatch.families) {
    const pkg = path.join(rootDir, fam.packagePath);
    const sourceFile = path.join(SOURCE_ROOT, fam.canonicalBundlePath.replace(/^Expungement_AI_RCAP_Master_Library_Edition_1\//, ""));
    if (!fs.existsSync(sourceFile)) throw new Error(`${fam.familyId}: official source not installed at ${fam.canonicalBundlePath}`);
    const sourceBytes = fs.readFileSync(sourceFile);
    const sourceSha = sha256(sourceBytes);
    if (sourceSha !== fam.sourceSha256 || sourceBytes.length !== fam.sourceByteLength) {
      throw new Error(`${fam.familyId}: installed source is not the pinned bytes (${sourceSha.slice(0, 16)} vs ${fam.sourceSha256.slice(0, 16)})`);
    }

    const doc = await PDFDocument.load(sourceBytes, { ignoreEncryption: true, updateMetadata: false });
    const pageCount = doc.getPageCount();
    const slug = fam.familyId.replace(/:/g, "-");
    const rasters = [];
    const itemsByPage = [];
    for (let p = 1; p <= pageCount; p += 1) {
      itemsByPage.push(extractTextItems(doc.getPages()[p - 1]));
      const row = await rasterSourcePage({ bytes: sourceBytes, pageIndex: p - 1, tmpRoot, outName: `${slug}-source-page-${String(p).padStart(2, "0")}.png` });
      rasters.push({ page: p, of: "official-source", image: path.relative(rootDir, path.join(OUT_DIR, row.image)),
        sha256: row.sha256, widthPx: row.widthPx, heightPx: row.heightPx, croppedToPage: row.croppedToPage,
        boundTo: sourceSha, boundToWhat: "the installed official source PDF, re-hashed against the freeze dispatch pin" });
    }

    const allText = itemsByPage.flat().map((i) => String(i.text ?? "")).join(" ").replace(/\s+/g, " ");
    const noticeHits = NOTICE_PHRASES.filter((p) => p.rx.test(allText)).map((p) => p.id);
    const watermarks = itemsByPage.map((items, i) => watermarkOn(items, i + 1));

    // Absence, established from the package rather than asserted about it.
    const fixturesDir = path.join(pkg, "fixtures");
    const sheetDir = path.join(pkg, "contact-sheet");
    const listPdfs = (d) => (fs.existsSync(d) ? fs.readdirSync(d).filter((n) => n.toLowerCase().endsWith(".pdf")) : []);
    const staleProofs = ["artifact-provenance.json", "reports/protected-fields-scan.json", "reports/rendered-artifacts.json"]
      .map((rel) => ({ rel, exists: fs.existsSync(path.join(pkg, rel)) }));
    const renderedArtifacts = (() => { try { return JSON.parse(fs.readFileSync(path.join(pkg, "reports/rendered-artifacts.json"), "utf8")); } catch { return null; } })();
    const sourceRecord = JSON.parse(fs.readFileSync(path.join(pkg, "source-record.json"), "utf8"));

    const absence = {
      participantPdfCount: listPdfs(fixturesDir).length,
      staleCanonicalArtifactCount: fs.existsSync(path.join(fixturesDir, "canonical-filled.pdf")) ? 1 : 0,
      staleBoundaryArtifactCount: fs.existsSync(path.join(fixturesDir, "boundary-filled.pdf")) ? 1 : 0,
      staleNegativeArtifactCount: fs.existsSync(path.join(fixturesDir, "negative.json")) ? 1 : 0,
      contactSheetCount: listPdfs(sheetDir).length,
      staleParticipantArtifactProofCount: staleProofs.filter((s) => s.exists && s.rel !== "reports/rendered-artifacts.json").length,
      renderedArtifactsRecordsNone: renderedArtifacts ? Object.keys(renderedArtifacts.artifacts ?? {}).length === 0 : null,
      whyNoArtifact: renderedArtifacts?.whyNoArtifact ?? null
    };
    absence.allZero = absence.participantPdfCount === 0 && absence.staleCanonicalArtifactCount === 0
      && absence.staleBoundaryArtifactCount === 0 && absence.staleNegativeArtifactCount === 0
      && absence.contactSheetCount === 0 && absence.staleParticipantArtifactProofCount === 0;

    const withdrawal = (sourceRecord.artifactsWithdrawn ?? []).map((w) => ({ artifact: w.artifact, sha256: w.sha256, byteLength: w.byteLength, basis: w.basis }));

    const record = {
      schemaVersion: "rcap-nc-four-terminal-visual-evidence/v1",
      generatedBy: "scripts/verify-rcap-nc-four-terminal-visual-evidence.mjs",
      familyId: fam.familyId,
      correctedImplementationFreezeSha: FREEZE_SHA,
      freezeDispatchCommit: DISPATCH_COMMIT,
      officialSource: {
        canonicalBundlePath: fam.canonicalBundlePath,
        installedAt: path.relative(rootDir, sourceFile),
        sha256: sourceSha,
        byteLength: sourceBytes.length,
        pageCount,
        dispatchPinMatches: true,
        basis: "rendered from the installed official PDF, re-hashed from the same bytes the renderer was handed"
      },
      sourceRasters: rasters,
      officialNoticeResult: {
        basis: "read from the official source's own glyphs, decoded through each font's ToUnicode map",
        phrasesFound: noticeHits,
        informationalNoticeVisible: noticeHits.length > 0,
        doNotCompleteThisFormForFilingVisible: noticeHits.includes("do_not_complete_this_form_for_filing"),
        useTheEnglishVersionVisible: noticeHits.includes("use_the_english_version")
      },
      watermarkResult: {
        basis: "oversized text runs on each page of the official source; a source that carries none is reported as carrying none rather than as failing",
        pages: watermarks,
        watermarkPresentInThisSource: watermarks.some((w) => w.watermarkPresent)
      },
      terminalState: {
        canonicalTerminalCategory: fam.canonicalTerminalCategory,
        familyLocalDetail: fam.familyLocalDetail,
        implementationStatus: sourceRecord.implementationStatus,
        ownerDisposition: sourceRecord.ownerDisposition ?? null,
        participantCompleted: sourceRecord.participantCompleted ?? null,
        currentTerminalStateHash: sha256(fs.readFileSync(path.join(pkg, "source-record.json"))),
        currentTerminalStateFile: path.relative(rootDir, path.join(pkg, "source-record.json")),
        requiresNoParticipantArtifact: sourceRecord.participantFillable === false && sourceRecord.generationAllowed === false
      },
      withdrawalReceipts: withdrawal,
      staleArtifactAbsenceResult: absence,
      englishFilingFamilyTreeHash: englishTreeHashes,
      artifactExpected: false,
      artifactCount: 0,
      referenceOnly: true,
      participantFillable: false,
      noArtifactRasterWasGenerated: "no current participant artifact exists; rastering the withdrawn one would picture a file the correction removed",
      boundPackageHashes: Object.fromEntries(Object.entries(fam.boundHashes).map(([n, h]) => [n, { pinned: h, onDisk: sha256(fs.readFileSync(path.join(pkg, n))), matches: sha256(fs.readFileSync(path.join(pkg, n))) === h }]))
    };
    record.terminalEvidenceComplete = record.officialNoticeResult.doNotCompleteThisFormForFilingVisible
      && record.officialNoticeResult.useTheEnglishVersionVisible
      && absence.allZero
      && Object.values(record.boundPackageHashes).every((b) => b.matches)
      && Object.values(englishTreeHashes).every((e) => e.unchanged);
    record.visualManifestHash = sha256(Buffer.from(JSON.stringify(record)));

    const file = path.join(OUT_DIR, `${slug}-terminal-visual-manifest.json`);
    const json = `${JSON.stringify(record, null, 2)}\n`;
    if (checkOnly) {
      const cur = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
      if (cur !== json) { console.error(`FAIL ${fam.familyId} — manifest is stale`); process.exitCode = 1; }
    } else fs.writeFileSync(file, json);
    families.push(record);
    console.log(`  ${fam.familyId} — ${pageCount} source page(s), ${rasters.length} source raster(s), artifacts ${record.artifactCount}, notice ${record.officialNoticeResult.doNotCompleteThisFormForFilingVisible ? "visible" : "NOT VISIBLE"}`);
  }

  const index = {
    schemaVersion: "rcap-nc-four-terminal-visual-index/v1",
    generatedBy: "scripts/verify-rcap-nc-four-terminal-visual-evidence.mjs",
    correctedImplementationFreezeSha: FREEZE_SHA,
    freezeDispatchCommit: DISPATCH_COMMIT,
    purpose: "the current result for these four families is that no participant artifact exists; this package proves that from the official source and the package, and rasters no artifact because there is none",
    totals: {
      familiesAssigned: dispatch.families.length,
      familiesCovered: families.length,
      officialSourcePages: families.reduce((n, f) => n + f.officialSource.pageCount, 0),
      sourceRasters: families.reduce((n, f) => n + f.sourceRasters.length, 0),
      artifactRasters: 0,
      participantArtifactCount: families.reduce((n, f) => n + f.artifactCount, 0),
      familiesWhereTheNoticeIsVisible: families.filter((f) => f.officialNoticeResult.doNotCompleteThisFormForFilingVisible && f.officialNoticeResult.useTheEnglishVersionVisible).length,
      familiesCarryingAWatermark: families.filter((f) => f.watermarkResult.watermarkPresentInThisSource).length,
      familiesWithAllStaleArtifactsAbsent: families.filter((f) => f.staleArtifactAbsenceResult.allZero).length,
      familiesWithCompleteTerminalEvidence: families.filter((f) => f.terminalEvidenceComplete).length,
      englishFilingFamiliesUnchanged: Object.values(englishTreeHashes).filter((e) => e.unchanged).length
    },
    englishFilingFamilyTreeHash: englishTreeHashes,
    families: families.map((f) => ({
      familyId: f.familyId,
      officialSourceSha256: f.officialSource.sha256,
      officialSourcePages: f.officialSource.pageCount,
      sourceRasters: f.sourceRasters.length,
      artifactCount: f.artifactCount,
      referenceOnly: f.referenceOnly,
      noticeVisible: f.officialNoticeResult.doNotCompleteThisFormForFilingVisible && f.officialNoticeResult.useTheEnglishVersionVisible,
      watermarkPresent: f.watermarkResult.watermarkPresentInThisSource,
      staleArtifactsAbsent: f.staleArtifactAbsenceResult.allZero,
      terminalEvidenceComplete: f.terminalEvidenceComplete,
      visualManifestHash: f.visualManifestHash,
      manifest: path.relative(rootDir, path.join(OUT_DIR, `${f.familyId.replace(/:/g, "-")}-terminal-visual-manifest.json`))
    }))
  };
  const indexPath = path.join(OUT_DIR, "index.json");
  const indexJson = `${JSON.stringify(index, null, 2)}\n`;
  if (checkOnly) {
    const cur = fs.existsSync(indexPath) ? fs.readFileSync(indexPath, "utf8") : "";
    if (cur !== indexJson) { console.error("FAIL nc-four terminal — index.json is stale"); process.exitCode = 1; }
  } else fs.writeFileSync(indexPath, indexJson);

  fs.rmSync(tmpRoot, { recursive: true, force: true });
  if (families.length !== dispatch.families.length) { console.error(`FAIL coverage — ${families.length}/${dispatch.families.length}`); process.exitCode = 1; }
  console.log(`OK nc-four terminal visual evidence — ${index.totals.familiesCovered}/${index.totals.familiesAssigned} families, `
    + `${index.totals.officialSourcePages} official source pages, ${index.totals.sourceRasters} source rasters, ${index.totals.artifactRasters} artifact rasters`);
}

await main();
