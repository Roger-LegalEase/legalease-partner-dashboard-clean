#!/usr/bin/env node

/*
 * Transient, read-only TX current-stream accounting.
 *
 * The accounting functions are loaded by extracting their unchanged source
 * declarations from the committed account script at runtime. This keeps the
 * comparison implementation identical to the factory lane while limiting
 * its inputs to the eight requested families.
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
import { PDFDocument, PDFDict, PDFName, decodePDFRawStream } from "/workspaces/legalease-partner-dashboard-clean/node_modules/pdf-lib/cjs/index.js";
import { skeleton } from "/workspaces/legalease-partner-dashboard-clean/scripts/grade-a-packet-factory-24h/stroke-fill-skeleton.mjs";

const ROOT = "/workspaces/legalease-partner-dashboard-clean";
const OUT = "/tmp/rcap-tx-current-stream-accounting-20260911";
const MANIFEST = "data/rcap-grade-a/packet-factory-24h/checkpoint-232-to-250/source-restored-ten-family-raster-manifest-20260911.json";
const VF90 = "data/rcap-grade-a/packet-factory-24h/vf90/rows-vf90-border-byte-accounting-20260910.json";
const REMEDIATION = "data/rcap-grade-a/packet-factory-24h/BORDER_COHORT_REMEDIATION.json";
const MK = "data/rcap-grade-a/packet-factory-24h/fix80/MK_BORDER_COHORT.json";
const ACCOUNT = "scripts/grade-a-packet-factory-24h/account-stroke-only-against-pinned-sources.mjs";
const CLASSIFIER = "scripts/grade-a-packet-factory-24h/classify-flattened-widget-appearances.mjs";
const SKELETON = "scripts/grade-a-packet-factory-24h/stroke-fill-skeleton.mjs";
const INPUT_HASHES = [
  "data/rcap-grade-a/packet-factory-24h/checkpoint-232-to-250/source-restored-ten-family-raster-manifest-20260911.json",
  VF90,
  REMEDIATION,
  MK,
  CLASSIFIER,
  ACCOUNT,
  SKELETON,
];
const FAMILIES = [
  "tx_exp_acquittal-set",
  "tx_nd_conviction_no_supervision-set",
  "tx_nd_dwi_deferred-set",
  "tx_nd_probation_misdemeanor-set",
  "tx_nd_deferred_other-set",
  "tx_nd_dwi_probation-set",
  "tx_nd_veterans_court-set",
  "tx_nd_veterans_reemployment-set",
];
const PREFLIGHT_HEAD = "eac1e799ffc09ecfc63db39b25e4223907c5a830";

const familySet = new Set(FAMILIES);
const abs = (p) => path.resolve(ROOT, p);
const sha = (value) => createHash("sha256").update(value).digest("hex");
const fileSha = (p) => sha(fs.readFileSync(p));
const json = (p) => JSON.parse(fs.readFileSync(abs(p), "utf8"));
const readJsonAbs = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
const ensureDir = (p) => fs.mkdirSync(p, { recursive: true });
const uniq = (xs) => [...new Set(xs)];

function normaliseResolvedFrom(value) {
  if (!value) return null;
  const cleaned = value.replace(/^\.\/?/, "");
  const repositoryPrefix = "../legalease-partner-dashboard-clean/";
  if (value.startsWith(repositoryPrefix)) return abs(value.slice(repositoryPrefix.length));
  if (value.startsWith("/")) return value;
  return abs(cleaned);
}

function extractBlock(source, startToken, endToken) {
  const start = source.indexOf(startToken);
  const end = source.indexOf(endToken, start);
  if (start < 0 || end < 0) throw new Error(`could not extract ${startToken}`);
  return source.slice(start, end).trim();
}

async function loadUnchangedAccountFunctions() {
  const sourcePath = abs(ACCOUNT);
  const source = fs.readFileSync(sourcePath, "utf8");
  const moduleText = [
    'import { readFileSync } from "node:fs";',
    'import { createHash } from "node:crypto";',
    `import { PDFDict, PDFDocument, PDFName, decodePDFRawStream } from ${JSON.stringify(pathToFileURL(abs("node_modules/pdf-lib/cjs/index.js")).href)};`,
    `import { skeleton } from ${JSON.stringify(pathToFileURL(abs(SKELETON)).href)};`,
    extractBlock(source, "const FLATTENED =", "const PAINTING ="),
    extractBlock(source, "const PAINTING =", "const sha ="),
    extractBlock(source, "const sha =", "const decode ="),
    extractBlock(source, "const decode =", "/*"),
    extractBlock(source, "async function sourceAppearanceDigests", "async function strokeOnlyDigests"),
    extractBlock(source, "async function strokeOnlyDigests", "const ledger ="),
    "export { sourceAppearanceDigests, strokeOnlyDigests, sha, decode };",
  ].join("\n");
  const moduleUrl = `data:text/javascript;base64,${Buffer.from(moduleText).toString("base64")}`;
  const functions = await import(moduleUrl);
  return {
    ...functions,
    sourceSha256: fileSha(sourcePath),
    extractedSourceSha256: sha(Buffer.from(moduleText, "utf8")),
    extractedSourceLength: moduleText.length,
  };
}

/* Detailed source evidence is supplementary to the unchanged set-returning
 * function. It retains exact source object references for every digest so the
 * final ledger can cite a source, not merely a family-level pool. */
const decodeRaw = (stream) => {
  try { return Buffer.from(decodePDFRawStream(stream).decode()); } catch { return null; }
};

async function sourceAppearanceEvidence(pdfPath, skeleton) {
  const doc = await PDFDocument.load(fs.readFileSync(pdfPath), {
    updateMetadata: false, ignoreEncryption: true, throwOnInvalidObject: false,
  });
  const records = [];
  for (const [ref, object] of doc.context.enumerateIndirectObjects()) {
    const dict = object?.dict;
    if (!(dict instanceof PDFDict)) continue;
    if (!dict.get(PDFName.of("BBox"))) continue;
    const bytes = decodeRaw(object);
    if (!bytes) continue;
    const normal = skeleton(bytes);
    records.push({
      sourcePath: pdfPath,
      sourceObjectRef: ref?.tag ?? null,
      sourceAppearanceSha256: sha(bytes),
      sourceSkeletonSha256: normal.sha256,
      sourceSkeletonChanged: normal.changed,
      bytes: bytes.length,
    });
  }
  return records;
}

async function sourceWidgetRectangles(pdfPath) {
  const doc = await PDFDocument.load(fs.readFileSync(pdfPath), { updateMetadata: false, ignoreEncryption: true });
  const pageOfRef = new Map();
  doc.getPages().forEach((page, index) => pageOfRef.set(page.ref.tag, index));
  const rectangles = [];
  for (const field of doc.getForm().getFields()) {
    for (const widget of field.acroField.getWidgets()) {
      const rect = widget.getRectangle();
      const parent = widget.dict.get(PDFName.of("P"));
      const page = parent ? pageOfRef.get(parent.tag) : null;
      if (page === undefined || page === null) continue;
      rectangles.push({
        field: field.getName(), page,
        x0: Math.min(rect.x, rect.x + rect.width), y0: Math.min(rect.y, rect.y + rect.height),
        x1: Math.max(rect.x, rect.x + rect.width), y1: Math.max(rect.y, rect.y + rect.height),
      });
    }
  }
  return { pageCount: doc.getPageCount(), rectangles };
}

function pageText(pdfPath, pageNumber) {
  try {
    return execFileSync("pdftotext", ["-f", String(pageNumber), "-l", String(pageNumber), "-layout", pdfPath, "-"], {
      encoding: "utf8", stdio: ["ignore", "pipe", "ignore"],
    }).replace(/\s+/g, " ").trim();
  } catch { return ""; }
}

function textTokens(text) {
  return new Set((text.toLowerCase().match(/[a-z0-9]{3,}/g) ?? []));
}

function tokenOverlap(a, b) {
  const left = textTokens(a); const right = textTokens(b);
  if (left.size === 0 || right.size === 0) return 0;
  let common = 0; for (const token of left) if (right.has(token)) common += 1;
  return common / Math.max(1, Math.min(left.size, right.size));
}

/*
 * Build a rectangle-only source with the exact widget rectangles from the
 * pinned forms placed at the packet's verified page offsets. This is only for
 * the classifier's placement check; stream pools below always use the original
 * pinned source PDFs. Page offsets are checked by static-text token overlap.
 */
const PLACEMENT_OFFSETS = {
  tx_exp_acquittal_set: { statement: 7 },
  tx_nd_conviction_no_supervision_set: { petition: 0, order: 5, statement: 9 },
  tx_nd_dwi_deferred_set: { petition: 0, order: 5, statement: 9 },
  tx_nd_probation_misdemeanor_set: { petition: 0, order: 5, statement: 9 },
  tx_nd_deferred_other_set: { petition: 0, order: 6, statement: 10 },
  tx_nd_dwi_probation_set: { petition: 0, order: 5, statement: 9 },
  tx_nd_veterans_court_set: { petition: 0, order: 6, statement: 10 },
  tx_nd_veterans_reemployment_set: { petition: 3, order: 6, statement: 9 },
};

function placementKey(familyId) { return familyId.replaceAll("-", "_"); }

async function buildPlacementSource(family, sources, fixtures) {
  const key = placementKey(family.familyId);
  const offsets = PLACEMENT_OFFSETS[key];
  if (!offsets) throw new Error(`no verified placement offsets for ${family.familyId}`);
  const packetDoc = await PDFDocument.load(fs.readFileSync(fixtures[0].path), { updateMetadata: false, ignoreEncryption: true });
  const target = await PDFDocument.create();
  const pages = packetDoc.getPages();
  for (const page of pages) target.addPage([page.getWidth(), page.getHeight()]);
  const segmentEvidence = [];
  const sourceRole = (source, index) => {
    if (family.familyId === "tx_exp_acquittal-set") return "statement";
    if (source.documentId.includes("petition")) return "petition";
    if (source.documentId.includes("proposed-order")) return "order";
    if (source.documentId.includes("fee-waiver")) return "statement";
    return ["petition", "order", "statement"][index] ?? `source-${index}`;
  };
  let widgetCount = 0;
  for (let sourceIndex = 0; sourceIndex < sources.length; sourceIndex += 1) {
    const source = sources[sourceIndex];
    const role = sourceRole(source, sourceIndex);
    const offset = offsets[role];
    if (offset === undefined) throw new Error(`no offset for ${family.familyId} ${role}`);
    const sourceRectangles = await sourceWidgetRectangles(source.path);
    if (offset + sourceRectangles.pageCount > pages.length) {
      throw new Error(`placement segment exceeds packet pages for ${family.familyId} ${role}`);
    }
    const textChecks = [];
    for (let page = 0; page < sourceRectangles.pageCount; page += 1) {
      const sourceText = pageText(source.path, page + 1);
      const packetText = pageText(fixtures[0].path, offset + page + 1);
      textChecks.push({ sourcePage: page + 1, packetPage: offset + page + 1, tokenOverlap: +tokenOverlap(sourceText, packetText).toFixed(6) });
    }
    const lowText = textChecks.filter((check) => check.tokenOverlap < 0.45);
    for (const rectangle of sourceRectangles.rectangles) {
      const page = target.getPage(offset + rectangle.page);
      const field = target.getForm().createTextField(`${family.familyId}__${role}__${widgetCount}`);
      field.addToPage(page, {
        x: rectangle.x0, y: rectangle.y0,
        width: rectangle.x1 - rectangle.x0, height: rectangle.y1 - rectangle.y0,
        borderWidth: 0,
      });
      widgetCount += 1;
    }
    segmentEvidence.push({
      role, path: source.path, sha256: source.sha256,
      sourcePageCount: sourceRectangles.pageCount, packetPageOffset0: offset,
      sourceWidgetRectangles: sourceRectangles.rectangles.length,
      textChecks, lowTextPages: lowText,
    });
  }
  const outputPath = path.join(OUT, "placement-sources", `${family.familyId}.pdf`);
  fs.writeFileSync(outputPath, await target.save({ useObjectStreams: false }));
  return {
    path: outputPath, sha256: fileSha(outputPath), pageCount: target.getPageCount(),
    widgetCount, segments: segmentEvidence,
    placementTextVerified: segmentEvidence.every((segment) => segment.lowTextPages.length === 0),
  };
}

function runClassifier(fixture, placementSource, outputPath) {
  const args = [CLASSIFIER, fixture.path, "--source", placementSource.path, "--json", outputPath];
  try {
    execFileSync(process.execPath, args, { cwd: ROOT, stdio: ["ignore", "pipe", "pipe"] });
    return readJsonAbs(outputPath);
  } catch (error) {
    return {
      error: String(error.stderr ?? error.message ?? error).slice(0, 500),
      outputPath,
    };
  }
}

function fixtureEvidenceWithPlacement(stroke, classifier) {
  const found = classifier?.appearances?.find((appearance) => appearance.page === stroke.page && appearance.name === stroke.name);
  return {
    ...stroke,
    placement: found ? {
      placedRect: found.placedRect,
      placedAtItsOwnSourceWidget: found.placedAtItsOwnSourceWidget,
      sourceWidgetField: found.sourceWidgetField,
      paintingOperators: found.paintingOperators,
    } : { missingClassifierAppearance: true },
  };
}

function chooseSource(records, predicate) {
  return records.filter(predicate).sort((a, b) => `${a.sourcePath}:${a.sourceObjectRef}`.localeCompare(`${b.sourcePath}:${b.sourceObjectRef}`))[0] ?? null;
}

async function main() {
  ensureDir(OUT); ensureDir(path.join(OUT, "classifier")); ensureDir(path.join(OUT, "primary")); ensureDir(path.join(OUT, "placement-sources"));
  const manifest = json(MANIFEST);
  const vf90 = json(VF90);
  const remediation = json(REMEDIATION);
  const mk = json(MK);
  const accountFunctions = await loadUnchangedAccountFunctions();
  const blockers = [];
  const inputHashes = Object.fromEntries(INPUT_HASHES.map((p) => [p, fileSha(abs(p))]));
  const actualHead = execFileSync("git", ["rev-parse", "HEAD"], { cwd: ROOT, encoding: "utf8" }).trim();
  const manifestRows = new Map(manifest.rows.filter((row) => familySet.has(row.familyId)).map((row) => [row.familyId, row]));
  const vf90Rows = new Map(vf90.rows.filter((row) => familySet.has(row.itemId)).map((row) => [row.itemId, row]));
  const remediationRows = new Map(remediation.rows.filter((row) => familySet.has(row.familyId)).map((row) => [row.familyId, row]));
  const mkRows = new Map((mk.cohort ?? []).filter((row) => familySet.has(row.familyId)).map((row) => [row.familyId, row]));
  for (const familyId of FAMILIES) {
    if (!manifestRows.has(familyId)) blockers.push({ kind: "manifest_row_missing", familyId, path: MANIFEST });
    if (!vf90Rows.has(familyId)) blockers.push({ kind: "vf90_row_missing", familyId, path: VF90 });
    if (!mkRows.has(familyId)) blockers.push({ kind: "mk_row_missing", familyId, path: MK });
    if (!remediationRows.has(familyId)) blockers.push({ kind: "remediation_row_missing", familyId, path: REMEDIATION });
  }

  const families = [];
  for (const familyId of FAMILIES) {
    const manifestRow = manifestRows.get(familyId);
    const vf90Row = vf90Rows.get(familyId);
    const mkRow = mkRows.get(familyId);
    const remediationRow = remediationRows.get(familyId);
    const receiptPath = path.join(ROOT, mkRow?.familyDirectory ?? manifestRow?.canonicalPdfPath?.replace(/\/fixtures\/canonical\.pdf$/, ""), "source-receipt.json");
    const receipt = fs.existsSync(receiptPath) ? readJsonAbs(receiptPath) : null;
    const receiptSha256 = fs.existsSync(receiptPath) ? fileSha(receiptPath) : null;
    if (receiptSha256) inputHashes[path.relative(ROOT, receiptPath)] = receiptSha256;
    if (!receipt) blockers.push({ kind: "source_receipt_missing", familyId, path: receiptPath });
    const sourceDocs = (mkRow?.documents ?? []).map((document) => {
      const sourcePath = normaliseResolvedFrom(document.resolvedFrom);
      const actualExists = !!sourcePath && fs.existsSync(sourcePath);
      const actualSha256 = actualExists ? fileSha(sourcePath) : null;
      const receiptDoc = receipt?.documents?.find((candidate) => candidate.sha256 === document.declaredSha256 || candidate.formNumber === document.formNumber) ?? null;
      const expectedSha256 = receiptDoc?.sha256 ?? document.declaredSha256;
      const shaMatches = actualExists && actualSha256 === expectedSha256 && actualSha256 === document.declaredSha256;
      if (!actualExists) blockers.push({ kind: "source_missing", familyId, path: sourcePath ?? document.resolvedFrom, expectedSha256 });
      else if (!shaMatches) blockers.push({ kind: "source_pin_mismatch", familyId, path: sourcePath, expectedSha256, declaredSha256: document.declaredSha256, actualSha256 });
      return {
        documentId: receiptDoc?.documentId ?? null, formNumber: document.formNumber,
        path: sourcePath, resolvedFrom: document.resolvedFrom,
        sha256: actualSha256, expectedSha256,
        bytes: actualExists ? fs.statSync(sourcePath).size : null,
        expectedBytes: receiptDoc?.byteLength ?? null,
        pageCount: receiptDoc?.pageCount ?? null,
        sourceReceiptPath: receiptPath,
        sourceReceiptSha256: receiptSha256,
        available: actualExists && shaMatches,
      };
    });
    const fixturePaths = [
      { name: "canonical.pdf", path: abs(manifestRow?.canonicalPdfPath ?? "") , expectedSha256: manifestRow?.canonicalPdfSha256 ?? null },
      { name: "boundary.pdf", path: abs(manifestRow?.boundaryPdfPath ?? "") , expectedSha256: manifestRow?.boundaryPdfSha256 ?? null },
    ];
    const fixtureInputs = fixturePaths.map((fixture) => {
      const exists = fs.existsSync(fixture.path);
      const actualSha256 = exists ? fileSha(fixture.path) : null;
      if (!exists) blockers.push({ kind: "fixture_missing", familyId, path: fixture.path, expectedSha256: fixture.expectedSha256 });
      else if (actualSha256 !== fixture.expectedSha256) blockers.push({ kind: "fixture_pin_mismatch", familyId, path: fixture.path, expectedSha256: fixture.expectedSha256, actualSha256 });
      return { ...fixture, exists, actualSha256, bytes: exists ? fs.statSync(fixture.path).size : null };
    });
    const sourceReady = sourceDocs.length > 0 && sourceDocs.every((source) => source.available) && receipt?.allSourcesExact === true;
    const placementSource = sourceReady ? await buildPlacementSource({ familyId }, sourceDocs, fixtureInputs) : null;
    if (placementSource && !placementSource.placementTextVerified) blockers.push({ kind: "placement_text_alignment_failed", familyId, segments: placementSource.segments.filter((segment) => segment.lowTextPages.length > 0) });
    const sourceRecords = [];
    const sourcePools = [];
    if (sourceReady) {
      for (const source of sourceDocs) {
        const pool = await accountFunctions.sourceAppearanceDigests(source.path);
        const detail = (await sourceAppearanceEvidence(source.path, skeleton)).map((record) => ({
          ...record,
          sourceDocumentId: source.documentId,
          sourceFormNumber: source.formNumber,
          sourceExpectedSha256: source.expectedSha256,
        }));
        const detailDigests = new Set(detail.map((record) => record.sourceAppearanceSha256));
        const detailSkeletons = new Set(detail.map((record) => record.sourceSkeletonSha256));
        if (pool.digests.size !== detailDigests.size || [...pool.digests].some((digest) => !detailDigests.has(digest)) || pool.skeletons.size !== detailSkeletons.size || [...pool.skeletons].some((digest) => !detailSkeletons.has(digest))) {
          blockers.push({ kind: "source_evidence_pool_identity_mismatch", familyId, path: source.path });
        }
        sourcePools.push({ source, pool, detail });
        sourceRecords.push(...detail);
      }
    }
    const pool = new Set(sourcePools.flatMap((entry) => [...entry.pool.digests]));
    const skeletonPool = new Set(sourcePools.flatMap((entry) => [...entry.pool.skeletons]));
    const fixtureResults = [];
    for (const fixture of fixtureInputs) {
      const classifierPath = path.join(OUT, "classifier", `${familyId}--${fixture.name}.json`);
      const classifier = fixture.exists && placementSource ? runClassifier(fixture, placementSource, classifierPath) : { error: "UNMEASURED: fixture or pinned source unavailable" };
      if (classifier.error) blockers.push({ kind: "classifier_failed", familyId, fixture: fixture.name, detail: classifier.error });
      const strokes = sourceReady && fixture.exists ? await accountFunctions.strokeOnlyDigests(fixture.path) : [];
      const matched = []; const derivedFromSource = []; const unmatched = [];
      for (const stroke of strokes) {
        const exactSource = chooseSource(sourceRecords, (record) => record.sourceAppearanceSha256 === stroke.sha256);
        if (exactSource) {
          matched.push({ ...fixtureEvidenceWithPlacement(stroke, classifier), matchKind: "BYTE_IDENTICAL_SOURCE_STREAM", source: exactSource });
          continue;
        }
        const sourceByDeliveredSha = chooseSource(sourceRecords, (record) => record.sourceSkeletonSha256 === stroke.sha256);
        const sourceByDeliveredSkeleton = chooseSource(sourceRecords, (record) => record.sourceAppearanceSha256 === stroke.skeletonSha256);
        const sourceBySkeleton = chooseSource(sourceRecords, (record) => record.sourceSkeletonSha256 === stroke.skeletonSha256);
        if (sourceByDeliveredSha || sourceByDeliveredSkeleton || sourceBySkeleton) {
          const source = sourceByDeliveredSha ?? sourceByDeliveredSkeleton ?? sourceBySkeleton;
          const matchKind = sourceByDeliveredSha ? "DELIVERED_BYTES_MATCH_SOURCE_SKELETON" : sourceByDeliveredSkeleton ? "DELIVERED_SKELETON_MATCH_SOURCE_BYTES" : "DELIVERED_SKELETON_MATCH_SOURCE_SKELETON";
          derivedFromSource.push({ ...fixtureEvidenceWithPlacement(stroke, classifier), matchKind, source });
        } else {
          unmatched.push({ ...fixtureEvidenceWithPlacement(stroke, classifier), matchKind: "NO_SOURCE_STREAM_OR_FILL_STRIPPED_DERIVATION" });
        }
      }
      const classifierSummary = classifier.summary ?? null;
      if (classifierSummary && classifierSummary.strokeOnly !== strokes.length) blockers.push({ kind: "classifier_accounting_count_mismatch", familyId, fixture: fixture.name, classifier: classifierSummary.strokeOnly, account: strokes.length });
      const strokeOnlyPlacementUnestablished = classifier?.appearances
        ? classifier.appearances.filter((appearance) => appearance.klass === "STROKE_ONLY" && appearance.placedAtItsOwnSourceWidget !== true).length
        : null;
      if (strokeOnlyPlacementUnestablished > 0) blockers.push({ kind: "stroke_only_placement_unestablished", familyId, fixture: fixture.name, count: strokeOnlyPlacementUnestablished });
      const primaryPath = path.join(OUT, "primary", `${familyId}--${fixture.name}.json`);
      const primary = {
        schemaVersion: "tx-current-stream-accounting-primary-v1",
        familyId, fixture: fixture.name, fixturePath: fixture.path,
        fixtureSha256: fixture.actualSha256, fixtureBytes: fixture.bytes,
        sourceReceiptPath: receiptPath,
        sourceReceiptSha256: receiptSha256,
        sourceFiles: sourceDocs,
        placementSource: placementSource ? { path: placementSource.path, sha256: placementSource.sha256, pageCount: placementSource.pageCount } : null,
        classifierJsonPath: classifierPath,
        classifierSummary,
        strokeOnly: { count: strokes.length, matched: matched.length, fillStripped: derivedFromSource.length, unmatched: unmatched.length, matchedEvidence: matched, fillStrippedEvidence: derivedFromSource, unmatchedEvidence: unmatched },
        sourcePool: { appearanceStreams: pool.size, skeletons: skeletonPool.size },
        grantsNothing: "Primary byte accounting evidence only; no verdict, acceptance, promotion, or repair authorization.",
      };
      fs.writeFileSync(primaryPath, `${JSON.stringify(primary, null, 2)}\n`);
      fixtureResults.push({ name: fixture.name, path: fixture.path, sha256: fixture.actualSha256, classifierJsonPath: classifierPath, primaryEvidencePath: primaryPath, classifierSummary, strokeOnlyCount: strokes.length, matchedCount: matched.length, fillStrippedCount: derivedFromSource.length, unmatchedCount: unmatched.length, strokeOnlyPlacementUnestablished, matchedEvidence: matched, fillStrippedEvidence: derivedFromSource, unmatchedEvidence: unmatched });
    }
    const currentCounts = fixtureResults.reduce((acc, fixture) => ({
      strokeOnly: acc.strokeOnly + fixture.strokeOnlyCount,
      matched: acc.matched + fixture.matchedCount,
      fillStripped: acc.fillStripped + fixture.fillStrippedCount,
      unmatched: acc.unmatched + fixture.unmatchedCount,
      placementUnestablished: acc.placementUnestablished + (fixture.strokeOnlyPlacementUnestablished ?? 0),
    }), { strokeOnly: 0, matched: 0, fillStripped: 0, unmatched: 0, placementUnestablished: 0 });
    const vf = vf90Row?.whatWasMeasured ?? {};
    families.push({
      familyId,
      familyDirectory: mkRow?.familyDirectory ?? null,
      sourceReceiptPath: receiptPath,
      sourceReceiptSha256: receiptSha256,
      receipt: receipt ? { familyId: receipt.familyId, allSourcesExact: receipt.allSourcesExact, sourceBinaryCommitted: receipt.sourceBinaryCommitted, custodyClass: receipt.custodyClass } : null,
      sourceFiles: sourceDocs,
      sourcePool: { appearanceStreams: pool.size, skeletons: skeletonPool.size, sourcesUnreadable: [] },
      placementSource,
      fixtures: fixtureResults,
      originalVF90: {
        verifiedAtBase: vf90Row?.verifiedAtBase ?? null,
        verdict: vf90Row?.verdict ?? null,
        strokeOnlyAppearances: vf.strokeOnlyAppearances ?? null,
        matchingAPinnedSourceStream: vf.matchingAPinnedSourceStream ?? null,
        matchingNothingInTheSources: vf.matchingNothingInTheSources ?? null,
      },
      current: currentCounts,
      currentClassification: currentCounts.unmatched > 0 ? "SYNTHESIZED_INK_CONFIRMED" : currentCounts.fillStripped > 0 ? "EVERY_STROKE_IS_THE_FORMS_OWN_SOME_WITH_ITS_BACKGROUND_FILL_STRIPPED" : "EVERY_STROKE_IS_THE_FORMS_OWN",
      measured: sourceReady && fixtureResults.every((fixture) => !fixture.classifierSummary?.error),
    });
  }
  const accounting = {
    schemaVersion: "tx-current-stream-accounting-v1",
    generatedAt: new Date().toISOString(),
    base: { expected: PREFLIGHT_HEAD, actual: actualHead, headAdvancedAfterPreflight: actualHead !== PREFLIGHT_HEAD, headAdvanceIsMaterialToThisRead: false },
    scope: { families: FAMILIES, fixtureCountExpected: 16, fixtureCountMeasured: families.reduce((n, family) => n + family.fixtures.length, 0), sourceReceiptCountExpected: 8 },
    inputHashes,
    functionSourceIdentity: {
      accountScript: ACCOUNT,
      accountScriptSha256: accountFunctions.sourceSha256,
      extractedFunctionModuleSha256: accountFunctions.extractedSourceSha256,
      extractedFunctionModuleBytes: accountFunctions.extractedSourceLength,
      functions: ["sourceAppearanceDigests", "strokeOnlyDigests", "sha", "decode"],
      skeletonScript: SKELETON,
      skeletonScriptSha256: inputHashes[SKELETON],
    },
    families,
    comparisonTable: families.map((family) => ({
      familyId: family.familyId,
      originalVF90: family.originalVF90,
      current: family.current,
      identity: family.currentClassification,
      allCurrentFixturesMeasured: family.measured,
      sourcePinReady: family.sourceFiles.every((source) => source.available),
      placementEstablished: family.placementSource?.placementTextVerified === true && family.fixtures.every((fixture) => (fixture.strokeOnlyPlacementUnestablished ?? 1) === 0),
    })),
    blockers,
    status: {
      all16PreciselyMeasured: families.every((family) => family.measured),
      allSourcePinsExact: families.every((family) => family.sourceFiles.every((source) => source.available)),
      allPlacementEstablished: families.every((family) => family.placementSource?.placementTextVerified === true && family.fixtures.every((fixture) => (fixture.strokeOnlyPlacementUnestablished ?? 1) === 0)),
      acceptance: "EXCLUDED",
    },
    grantsNothing: "This is byte accounting and placement evidence only. It does not infer visual acceptance, does not authorize a repair, and does not promote or approve a route.",
  };
  fs.writeFileSync(path.join(OUT, "accounting.json"), `${JSON.stringify(accounting, null, 2)}\n`);
  console.log(JSON.stringify({ output: path.join(OUT, "accounting.json"), status: accounting.status, blockerCount: blockers.length, families: accounting.comparisonTable }, null, 2));
}

await main();
