#!/usr/bin/env node
/**
 * Read-only evidence gate for the September 11 FL/TX nine-family closure.
 *
 * This deliberately verifies the two independent returns and the evidence
 * they cite. It does not infer queue state, require live claims, or promote a
 * route. Central integration is a separate operation and may still be running.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { ACCEPTANCE, IDENTITY, evaluateAcceptance, identityOf } from "./acceptance-identity.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
process.chdir(ROOT);

const BASE = "data/rcap-grade-a/packet-factory-24h";
const EVIDENCE = `${BASE}/closure-nine-20260911`;
const FL_RETURN = `${BASE}/vf64/rows-vf64-20260911-fl-early-closure.json`;
const TX_RETURN = `${BASE}/vf08/rows-vf08-20260911-tx-eight-closure.json`;
const TX_MANIFEST = `${BASE}/fix07/tx-eight-complete-20260911/raster-manifest.json`;
const FL_MEASUREMENTS = `${EVIDENCE}/fl-current-measurements.json`;
const TX_MEASUREMENTS = `${EVIDENCE}/tx-current-measurements.json`;
const FL_RUN = "34650539599";
const TX_RUN = "34651035676";
const RETIRED_TX_RUN = "34644046027";
const RASTER_WORKFLOW = ".github/workflows/rcap-packet-raster-acceptance-batch.yml";
const REQUIRE_TERMINAL = process.argv.includes("--require-terminal");
const FL_FAMILY = "fl-early-juvenile-set";
const TX_FAMILIES = [
  "tx_exp_acquittal-set",
  "tx_nd_conviction_no_supervision-set",
  "tx_nd_dwi_deferred-set",
  "tx_nd_probation_misdemeanor-set",
  "tx_nd_deferred_other-set",
  "tx_nd_dwi_probation-set",
  "tx_nd_veterans_court-set",
  "tx_nd_veterans_reemployment-set",
];
const ALL_FAMILIES = [FL_FAMILY, ...TX_FAMILIES];
const OBLIGATIONS = [
  "ROUTE_IDENTITY", "SOURCE_IDENTITY", "COMPONENT_SET", "KNOWN_PREFILLS",
  "REQUIRED_BEFORE_FILING", "ROUTE_OPTIONS", "REPEATING_ROWS",
  "PROTECTED_FIELDS", "ARTIFACTS", "PAGE_ORDER", "CLIPPING_AND_OVERLAP",
  "FEE_AND_WAIVER", "FILING_DESTINATION", "SERVICE", "SELF_HELP_STOP",
];
const COUNTERS = [
  "knownRequiredFieldsMissing", "requiredFactsNotCollected", "unclassifiedBlanks",
  "incompleteRows", "requiredOptionsMissing", "requiredComponentsMissing",
  "invisibleWrites", "protectedWrites", "visualDefects",
];

const failures = [];
const stats = {
  families: 0,
  obligations: 0,
  pdfs: 0,
  sourceFiles: 0,
  originalPngMetadata: 0,
  originalPngsRehashed: 0,
  txArchives: 0,
  selectedPngs: 0,
  evidencePaths: 0,
  terminalFamilies: 0,
};
const fail = (scope, message) => failures.push(`${scope}: ${message}`);
const check = (scope, condition, message) => {
  if (!condition) fail(scope, message);
  return condition;
};
const digest = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");

function readJson(rel) {
  try {
    return JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));
  } catch (error) {
    fail(rel, `cannot read valid JSON (${error.message})`);
    return null;
  }
}

function sameOrdered(actual, expected) {
  return Array.isArray(actual)
    && actual.length === expected.length
    && actual.every((value, index) => value === expected[index]);
}

function sameSet(actual, expected) {
  return Array.isArray(actual)
    && actual.length === expected.length
    && new Set(actual).size === actual.length
    && actual.every((value) => expected.includes(value));
}

function confinedPath(claim, scope) {
  if (typeof claim !== "string" || claim.length === 0) {
    fail(scope, "empty or non-string path");
    return null;
  }
  const absolute = path.isAbsolute(claim) ? path.resolve(claim) : path.resolve(ROOT, claim);
  if (absolute !== ROOT && !absolute.startsWith(`${ROOT}${path.sep}`)) {
    fail(scope, `path escapes this checkout: ${claim}`);
    return null;
  }
  return absolute;
}

function existingPath(claim, scope, { file = false } = {}) {
  const absolute = confinedPath(claim, scope);
  if (!absolute) return null;
  try {
    const stat = fs.statSync(absolute);
    if (file && !stat.isFile()) fail(scope, `not a file: ${claim}`);
    stats.evidencePaths += 1;
    return { absolute, stat };
  } catch {
    fail(scope, `claimed path does not exist: ${claim}`);
    return null;
  }
}

function verifyFile(scope, claim, sha256, byteLength = null) {
  const found = existingPath(claim, scope, { file: true });
  if (!found) return null;
  const identity = identityOf(ROOT, claim, sha256);
  check(scope, identity.identity === IDENTITY.MATCH,
    `SHA-256 mismatch for ${claim}; expected ${sha256}, observed ${identity.actual ?? identity.identity}`);
  if (Number.isInteger(byteLength)) {
    check(scope, found.stat.size === byteLength,
      `byte length mismatch for ${claim}; expected ${byteLength}, observed ${found.stat.size}`);
  }
  return identity.actual;
}

function recordClaimedPaths(value, scope, parentKey = "") {
  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      if (typeof item === "string" && /^(data|private|reference|scripts|src)\//.test(item)
        && /^(evidence|evidenceRead|artifactsRead|artifacts)$/i.test(parentKey)) {
        existingPath(item, `${scope}/${parentKey}/${index}`);
      } else recordClaimedPaths(item, `${scope}/${index}`, parentKey);
    });
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [key, item] of Object.entries(value)) {
    const isPathKey = key === "path" || key.endsWith("Path")
      || key === "familyDirectory" || key === "claimEvidence" || key === "log";
    if (isPathKey && typeof item === "string"
      && (/^(data|private|reference|scripts|src)\//.test(item) || path.isAbsolute(item))) {
      existingPath(item, `${scope}/${key}`);
    }
    recordClaimedPaths(item, `${scope}/${key}`, key);
  }
}

function pngDimensions(bytes, scope) {
  const signature = "89504e470d0a1a0a";
  if (bytes.length < 24 || bytes.subarray(0, 8).toString("hex") !== signature) {
    fail(scope, "file does not have a valid PNG signature/IHDR");
    return null;
  }
  return [bytes.readUInt32BE(16), bytes.readUInt32BE(20)];
}

function validateReturn(document, rel, lane, expectedFamilies) {
  if (!document) return [];
  check(rel, document.schemaVersion === "rcap-verifier-lane-return/v1", "wrong schemaVersion");
  check(rel, document.lane === lane, `expected lane ${lane}, observed ${document.lane}`);
  check(rel, document.laneKind === "independent-verification", "wrong laneKind");
  check(rel, document.status === "COMPLETED", `expected COMPLETED, observed ${document.status}`);
  const rows = Array.isArray(document.rows) ? document.rows : [];
  check(rel, sameOrdered(rows.map((row) => row.familyId), expectedFamilies),
    `family list must be exactly ${expectedFamilies.join(", ")}`);
  for (const row of rows) {
    const scope = `${rel}/${row.familyId ?? "unnamed"}`;
    stats.families += 1;
    check(scope, row.itemId === row.familyId, "itemId and familyId differ");
    check(scope, row.lane === lane && row.laneKind === "independent-verification",
      "row lane identity differs from its return");
    check(scope, row.isIndependentVerification === true, "independent-verification flag is not true");
    check(scope, row.status === "COMPLETED", `expected COMPLETED, observed ${row.status}`);
    check(scope, row.verdict === "PASS_COMPLETE_INDEPENDENT",
      `expected PASS_COMPLETE_INDEPENDENT, observed ${row.verdict}`);
    check(scope, Array.isArray(row.failedObligationNames) && row.failedObligationNames.length === 0,
      "failedObligationNames is not empty");
    check(scope, Array.isArray(row.unmeasuredObligations) && row.unmeasuredObligations.length === 0,
      "unmeasuredObligations is not empty");
    check(scope, row.rasterState === "RASTER_PASS", `expected RASTER_PASS, observed ${row.rasterState}`);
    check(scope, row.packetPdfsModified === false || row.packetPdfsModified === 0,
      "return says packet PDFs were modified");
    check(scope, row.commercialRoutesOpened === false || row.commercialRoutesOpened === 0,
      "return says commercial routes were opened");
    check(scope, row.productionTouched === false, "return says production was touched");
    check(scope, row.grantsNothing === true
      || (typeof row.grantsNothing === "string" && row.grantsNothing.length > 0),
    "return does not preserve grantsNothing");

    const obligations = row.proofObligations && typeof row.proofObligations === "object"
      ? row.proofObligations : {};
    check(scope, sameSet(Object.keys(obligations), OBLIGATIONS), "proof-obligation set is not the exact 15-key contract");
    for (const obligation of OBLIGATIONS) {
      const finding = obligations[obligation];
      stats.obligations += 1;
      check(`${scope}/${obligation}`, finding?.result === "PASS",
        `expected PASS, observed ${finding?.result ?? "missing"}`);
      check(`${scope}/${obligation}`, finding?.measured === true, "obligation is not marked measured");
    }
    if (row.obligationCounts) {
      check(scope, row.obligationCounts.PASS === 15
        && row.obligationCounts.FAIL === 0
        && row.obligationCounts.NOT_MEASURABLE_HERE === 0,
      `bad obligationCounts: ${JSON.stringify(row.obligationCounts)}`);
    }
    check(scope, row.nineCounters?.allZero === true && row.nineCounters?.measuredHere === true,
      "nine-counter summary is not measured and all-zero");
    for (const counter of COUNTERS) {
      check(`${scope}/nineCounters`, row.nineCounters?.[counter] === 0,
        `${counter} is ${row.nineCounters?.[counter] ?? "missing"}, expected 0`);
    }
  }
  recordClaimedPaths(document, rel);
  return rows;
}

function validateSource(scope, source, pathKey) {
  const claim = source?.[pathKey];
  check(scope, typeof claim === "string" && claim.toLowerCase().endsWith(".pdf"), "source is not a PDF path");
  if (typeof claim !== "string") return;
  verifyFile(scope, claim, source.sha256, source.byteLength);
  stats.sourceFiles += 1;
}

function validateReceipt(row, runId, artifacts) {
  const family = row.familyId;
  const rel = `${BASE}/raster-runs/${runId}/${family}.verdict.json`;
  const receipt = readJson(rel);
  const scope = `receipt/${family}`;
  if (!receipt) return null;
  check(scope, receipt.familyId === family, `receipt names ${receipt.familyId}`);
  check(scope, String(receipt.workflowRunId) === runId,
    `receipt belongs to run ${receipt.workflowRunId}, expected ${runId}`);
  check(scope, receipt.verdict === "RASTER_PASS", `receipt verdict is ${receipt.verdict}`);
  check(scope, receipt.coversTheWholeFamily === true, "receipt does not cover the whole family");
  check(scope, Array.isArray(receipt.problems) && receipt.problems.length === 0, "receipt has problems");
  check(scope, Array.isArray(receipt.environmentProblems) && receipt.environmentProblems.length === 0,
    "receipt has environment problems");
  check(scope, receipt.pagesMeasured === artifacts.reduce((sum, artifact) => sum + artifact.pages, 0),
    `pagesMeasured is ${receipt.pagesMeasured}, expected ${artifacts.reduce((sum, artifact) => sum + artifact.pages, 0)}`);
  const rendered = Array.isArray(receipt.documentsRendered) ? receipt.documentsRendered : [];
  check(scope, rendered.length === 2, `receipt renders ${rendered.length} documents, expected 2`);
  for (const artifact of artifacts) {
    const renderedDocument = rendered.find((entry) => entry.role === artifact.fixture);
    check(scope, renderedDocument?.path === artifact.path && renderedDocument?.pinned === artifact.sha256,
      `${artifact.fixture} document path/hash differs between return and receipt`);
    const bound = receipt.hashesBound?.[artifact.fixture];
    check(scope, bound?.path === artifact.path && bound?.pinned === artifact.sha256,
      `${artifact.fixture} hashesBound differs between return and receipt`);
  }
  return receipt;
}

function validateArtifacts(rows, flMeasurements, txManifest) {
  const manifestRows = Array.isArray(txManifest?.rows) ? txManifest.rows : [];
  check(TX_MANIFEST, sameOrdered(manifestRows.map((row) => row.familyId), TX_FAMILIES),
    "manifest is not the exact Texas eight-family list");
  const manifestByFamily = new Map(manifestRows.map((row) => [row.familyId, row]));
  for (const row of rows) {
    const scope = `pdf/${row.familyId}`;
    const listed = row.artifacts ?? row.artifactsRead;
    const artifacts = Array.isArray(listed) ? listed.map((artifact) => ({
      fixture: artifact.fixture,
      path: artifact.path,
      sha256: artifact.sha256,
      byteLength: artifact.byteLength,
      pages: artifact.pages ?? artifact.pageCount,
    })) : [];
    check(scope, artifacts.length === 2 && sameSet(artifacts.map((artifact) => artifact.fixture), ["canonical", "boundary"]),
      "return must bind exactly canonical and boundary PDFs");
    for (const artifact of artifacts) {
      stats.pdfs += 1;
      check(scope, artifact.path === `${row.familyDirectory}/fixtures/${artifact.fixture}.pdf`,
        `${artifact.fixture} path is outside the declared family fixture directory`);
      check(scope, row.rasterHashBinding?.[artifact.fixture] === artifact.sha256,
        `${artifact.fixture} rasterHashBinding differs from the artifact hash`);
      verifyFile(`${scope}/${artifact.fixture}`, artifact.path, artifact.sha256, artifact.byteLength);
    }

    const runId = row.familyId === FL_FAMILY ? FL_RUN : TX_RUN;
    check(scope, String(row.rasterWorkflowRunId) === runId,
      `return binds run ${row.rasterWorkflowRunId}, expected ${runId}`);
    const receipt = validateReceipt(row, runId, artifacts);
    if (row.familyId === FL_FAMILY) {
      const ref = flMeasurements?.raster?.verdict;
      check(scope, ref?.path === `${BASE}/raster-runs/${FL_RUN}/${FL_FAMILY}.verdict.json`,
        "Florida measurement points at the wrong receipt");
      if (ref?.path) verifyFile(`${scope}/receipt-record`, ref.path, ref.sha256, ref.byteLength);
    } else {
      const ref = row.rasterEvidence?.verdict;
      check(scope, ref?.path === `${BASE}/raster-runs/${TX_RUN}/${row.familyId}.verdict.json`,
        "Texas return points at the wrong receipt");
      if (ref?.path) verifyFile(`${scope}/receipt-record`, ref.path, ref.sha256, ref.byteLength);
      const manifest = manifestByFamily.get(row.familyId);
      const docs = Array.isArray(manifest?.documents) ? manifest.documents : [];
      check(scope, docs.length === 2, "Texas raster manifest does not bind two documents");
      for (const artifact of artifacts) {
        const document = docs.find((entry) => entry.role === artifact.fixture);
        check(scope, document?.path === artifact.path && document?.sha256 === artifact.sha256
          && document?.pageCount === artifact.pages,
        `${artifact.fixture} differs between Texas manifest and independent return`);
      }
    }
    check(scope, receipt !== null, "receipt could not be validated");
  }
}

function expectedMembers(family, artifacts) {
  const members = [];
  for (const fixture of ["canonical", "boundary"]) {
    const artifact = artifacts.find((entry) => entry.fixture === fixture);
    for (let page = 1; page <= (artifact?.pages ?? 0); page += 1) {
      members.push(`${family}/${fixture}/page-${String(page).padStart(3, "0")}.png`);
    }
  }
  return members;
}

function normalizePngRows(rows) {
  return rows.map((row) => [row.member, row.sha256, row.byteLength ?? row.bytes]);
}

function validatePngMetadata(scope, family, rows, artifacts, runId) {
  const expected = expectedMembers(family, artifacts);
  check(scope, Array.isArray(rows), "PNG metadata is not an array");
  if (!Array.isArray(rows)) return [];
  check(scope, sameOrdered(rows.map((row) => row.member), expected),
    `PNG member sequence/count differs; expected ${expected.length}, observed ${rows.length}`);
  check(scope, new Set(rows.map((row) => row.member)).size === rows.length, "duplicate PNG member names");
  for (const [index, row] of rows.entries()) {
    const rowScope = `${scope}/${row.member ?? index}`;
    check(rowScope, /^[0-9a-f]{64}$/.test(row.sha256 ?? ""), "invalid SHA-256");
    check(rowScope, Number.isInteger(row.byteLength ?? row.bytes) && (row.byteLength ?? row.bytes) > 0,
      "invalid byte length");
    if (row.runId !== undefined) check(rowScope, String(row.runId) === runId, `metadata names run ${row.runId}`);
    if (row.familyId !== undefined) check(rowScope, row.familyId === family, `metadata names family ${row.familyId}`);
    const dimensions = row.dimensions ?? [row.pngWidth, row.pngHeight];
    check(rowScope, Array.isArray(dimensions) && dimensions.length === 2
      && dimensions.every((value) => Number.isInteger(value) && value > 0), "invalid PNG dimensions");
  }
  stats.originalPngMetadata += rows.length;
  return rows;
}

function validateOriginalRaster(rows, flMeasurements, txMeasurements) {
  const rowByFamily = new Map(rows.map((row) => [row.familyId, row]));
  const allMetadata = [];
  const flRow = rowByFamily.get(FL_FAMILY);
  const flArtifacts = (flRow?.artifacts ?? []).map((artifact) => ({
    fixture: artifact.fixture, pages: artifact.pageCount,
  }));
  const flMetadataRel = `${BASE}/raster-runs/${FL_RUN}/${FL_FAMILY}.ORIGINAL_PAGE_IMAGES_SHA256.json`;
  const flMetadata = validatePngMetadata(`png/${FL_FAMILY}`, FL_FAMILY,
    readJson(flMetadataRel), flArtifacts, FL_RUN);
  const flMeasuredPages = Array.isArray(flMeasurements?.raster?.pages) ? flMeasurements.raster.pages : [];
  check(`png/${FL_FAMILY}`, flMeasuredPages.length === 10, "Florida measurement does not bind all 10 pages");
  for (const metadata of flMetadata) {
    allMetadata.push({ family: FL_FAMILY, ...metadata });
    const rel = `${BASE}/raster-runs/${FL_RUN}/${metadata.member}`;
    const measured = flMeasuredPages.find((page) => page.path === rel);
    check(`png/${FL_FAMILY}`, measured?.sha256 === metadata.sha256
      && measured?.byteLength === metadata.bytes, `${metadata.member} differs from Florida measurement`);
    verifyFile(`png/${metadata.member}`, rel, metadata.sha256, metadata.bytes);
    const bytes = fs.existsSync(path.join(ROOT, rel)) ? fs.readFileSync(path.join(ROOT, rel)) : Buffer.alloc(0);
    pngDimensions(bytes, `png/${metadata.member}`);
    stats.originalPngsRehashed += 1;
  }

  const proofRel = `${BASE}/raster-runs/${TX_RUN}/ORIGINAL_EVIDENCE_VERIFIED.json`;
  const txProof = readJson(proofRel);
  check(proofRel, String(txProof?.runId) === TX_RUN && txProof?.conclusion === "success",
    "Texas original proof is not a successful current-run proof");
  check(proofRel, txProof?.inputs?.raster_manifest_path === TX_MANIFEST,
    "Texas proof names a different raster manifest");
  check(proofRel, txProof?.inputs?.family_batch === TX_FAMILIES.join(","),
    "Texas proof family_batch is not the exact eight-family list");
  check(proofRel, sameOrdered((txProof?.families ?? []).map((entry) => entry.familyId), TX_FAMILIES),
    "Texas proof is not the exact eight-family list");
  const proofByFamily = new Map((txProof?.families ?? []).map((entry) => [entry.familyId, entry]));
  const measureByFamily = new Map((txMeasurements ?? []).map((entry) => [entry.familyId, entry]));

  for (const family of TX_FAMILIES) {
    const row = rowByFamily.get(family);
    const artifacts = (row?.artifactsRead ?? []).map((artifact) => ({
      fixture: artifact.fixture, pages: artifact.pages,
    }));
    const metadataRel = `${BASE}/raster-runs/${TX_RUN}/${family}.PAGE_IMAGES_SHA256.json`;
    const metadata = validatePngMetadata(`png/${family}`, family, readJson(metadataRel), artifacts, TX_RUN);
    allMetadata.push(...metadata.map((entry) => ({ family, ...entry })));
    const proof = proofByFamily.get(family);
    const expectedPages = artifacts.reduce((sum, artifact) => sum + artifact.pages, 0);
    check(`png/${family}`, proof?.pagesMeasured === expectedPages, "proof page count differs from return");
    check(`png/${family}`, proof?.verdict === "RASTER_PASS"
      && proof?.currentAndPinnedPdfHashesVerified === true
      && proof?.originalArtifactAndJobLogAgree === true
      && proof?.originalPngBytesVerified === true, "Texas original proof is incomplete or not PASS");
    const measured = measureByFamily.get(family)?.originalRaster;
    check(`png/${family}`, measured?.run === TX_RUN && measured?.pagesVerified === expectedPages
      && measured?.artifactAndLogAgree === true && measured?.allPngHashesVerified === true,
    "Texas current measurement does not agree with original proof");

    const expectedArchive = `${BASE}/raster-runs/${TX_RUN}/${family}.zip`;
    check(`png/${family}`, proof?.archivePath === expectedArchive,
      `proof archive path is ${proof?.archivePath ?? "missing"}, expected ${expectedArchive}`);
    if (proof?.archivePath) verifyFile(`archive/${family}`, proof.archivePath, proof.archiveSha256);
    const jobLog = `${BASE}/raster-runs/${TX_RUN}/${family}.job.log`;
    verifyFile(`job-log/${family}`, jobLog, proof?.jobLogSha256);
    stats.txArchives += 1;

    const archiveAbs = path.join(ROOT, expectedArchive);
    if (fs.existsSync(archiveAbs)) {
      const test = spawnSync("unzip", ["-tqq", archiveAbs], { cwd: ROOT, encoding: "utf8" });
      check(`archive/${family}`, test.status === 0,
        `ZIP integrity check failed: ${(test.stderr || test.stdout || "unknown unzip error").trim()}`);
      const listing = spawnSync("unzip", ["-Z1", archiveAbs], { cwd: ROOT, encoding: "utf8" });
      const members = listing.status === 0 ? listing.stdout.split(/\r?\n/).filter(Boolean) : [];
      check(`archive/${family}`, listing.status === 0, `cannot list ZIP: ${listing.stderr.trim()}`);
      const familyPngs = members.filter((name) => name.startsWith(`${family}/`) && name.endsWith(".png"));
      const expectedPages = expectedMembers(family, artifacts);
      const permittedCalibration = [
        `${family}/canonical/page-calibration.png`,
        `${family}/boundary/page-calibration.png`,
      ];
      check(`archive/${family}`, sameSet(
        familyPngs.filter((name) => !permittedCalibration.includes(name)), expectedPages,
      ) && permittedCalibration.every((name) => familyPngs.includes(name)),
      "ZIP does not contain the exact original page set plus its two calibration images");
      const inside = spawnSync("unzip", ["-p", archiveAbs, "PAGE_IMAGES_SHA256.json"], {
        cwd: ROOT, encoding: "utf8", maxBuffer: 4 * 1024 * 1024,
      });
      if (inside.status !== 0) fail(`archive/${family}`, `cannot read embedded PNG metadata: ${inside.stderr.trim()}`);
      else {
        try {
          const embedded = JSON.parse(inside.stdout);
          check(`archive/${family}`, JSON.stringify(normalizePngRows(embedded)) === JSON.stringify(normalizePngRows(metadata)),
            "embedded original PNG hashes/lengths differ from checked-out metadata");
        } catch (error) {
          fail(`archive/${family}`, `embedded PNG metadata is invalid JSON (${error.message})`);
        }
      }
    }
  }
  check("original-raster", allMetadata.length === 394,
    `expected 394 original PNG metadata rows, observed ${allMetadata.length}`);
  return allMetadata;
}

function validateSelectedPngs(allMetadata) {
  const indexRel = `${EVIDENCE}/visual-index.json`;
  const reviewRel = `${EVIDENCE}/visual-review.json`;
  const index = readJson(indexRel);
  const review = readJson(reviewRel);
  const indexItems = Array.isArray(index?.items) ? index.items : [];
  const reviewItems = Array.isArray(review?.items) ? review.items : [];
  check(indexRel, index?.uniqueImages === 27 && indexItems.length === 27, "visual index does not bind exactly 27 images");
  check(reviewRel, review?.uniqueImages === 27 && reviewItems.length === 27, "visual review does not cover exactly 27 images");
  check(reviewRel, reviewItems.every((item) => item.reviewResult === "PASS"), "visual review contains a non-PASS item");
  check(reviewRel, sameSet(reviewItems.map((item) => item.sha256), indexItems.map((item) => item.sha256)),
    "visual review and visual index image sets differ");
  const metadataByHash = new Map();
  for (const row of allMetadata.filter((entry) => TX_FAMILIES.includes(entry.family))) {
    if (!metadataByHash.has(row.sha256)) metadataByHash.set(row.sha256, []);
    metadataByHash.get(row.sha256).push(row);
  }
  const selectedDir = `${EVIDENCE}/original-pages`;
  const actualNames = fs.existsSync(path.join(ROOT, selectedDir))
    ? fs.readdirSync(path.join(ROOT, selectedDir)).filter((name) => name.endsWith(".png")).sort() : [];
  const expectedNames = indexItems.map((item) => `${item.sha256}.png`).sort();
  check(selectedDir, sameOrdered(actualNames, expectedNames), "selected original-pages directory is not the exact indexed 27-PNG set");
  let aliases = 0;
  for (const item of indexItems) {
    const scope = `selected/${item.sha256}`;
    const expectedPath = `${selectedDir}/${item.sha256}.png`;
    check(scope, item.path === expectedPath, `index path is ${item.path}, expected ${expectedPath}`);
    const matches = metadataByHash.get(item.sha256) ?? [];
    check(scope, matches.length > 0, "selected PNG hash is absent from Texas original metadata");
    const bytes = fs.existsSync(path.join(ROOT, expectedPath)) ? fs.readFileSync(path.join(ROOT, expectedPath)) : null;
    if (!bytes) fail(scope, `missing selected PNG ${expectedPath}`);
    else {
      check(scope, digest(bytes) === item.sha256, `selected PNG hashes to ${digest(bytes)}`);
      check(scope, matches.some((entry) => entry.byteLength === bytes.length),
        `selected PNG length ${bytes.length} differs from metadata`);
      const dimensions = pngDimensions(bytes, scope);
      check(scope, matches.some((entry) => entry.dimensions?.[0] === dimensions?.[0]
        && entry.dimensions?.[1] === dimensions?.[1]),
      `selected PNG dimensions ${dimensions?.join("x") ?? "invalid"} differ from metadata`);
      stats.originalPngsRehashed += 1;
      stats.selectedPngs += 1;
    }
    for (const alias of item.aliases ?? []) {
      aliases += 1;
      check(scope, matches.some((entry) => entry.member === alias.member && entry.family === alias.family),
        `alias ${alias.member} does not bind this PNG hash in original metadata`);
    }
  }
  check(indexRel, aliases === index?.pageOccurrences,
    `index aliases total ${aliases}, pageOccurrences says ${index?.pageOccurrences}`);
}

function validateChecksAndAudit(txMeasurements) {
  const checksRel = `${EVIDENCE}/checks.json`;
  const checks = readJson(checksRel);
  const expectedNames = ["focused-tests"];
  for (const family of ALL_FAMILIES) expectedNames.push(`${family}-entrypoint`, `${family}-completeness`);
  check(checksRel, Array.isArray(checks) && sameSet(checks.map((entry) => entry.name), expectedNames),
    "checks.json is not the exact 19-check closure set");
  for (const entry of checks ?? []) {
    check(`${checksRel}/${entry.name}`, entry.exitCode === 0, `exitCode is ${entry.exitCode}`);
    check(`${checksRel}/${entry.name}`, Array.isArray(entry.argv) && entry.argv.length > 1, "missing argv");
    existingPath(entry.log, `${checksRel}/${entry.name}/log`, { file: true });
  }

  const streamRel = `${EVIDENCE}/stream-measurements.json`;
  const stream = readJson(streamRel);
  check(streamRel, stream?.totals?.sourceAppearanceStreamsExpected === 546
    && stream?.totals?.sourceAppearanceStreamsRetained === 546
    && stream?.totals?.unmatchedSourceAppearanceStreams === 0,
  `source-appearance totals are ${JSON.stringify(stream?.totals)}`);
  const writes = (txMeasurements ?? []).reduce((sum, family) => sum
    + (family.fixtures ?? []).reduce((fixtureSum, fixture) => fixtureSum + (fixture.writeMeasurements?.length ?? 0), 0), 0);
  check(TX_MEASUREMENTS, writes === 198, `expected 198 measured Texas widget writes, observed ${writes}`);

  const auditRel = `${EVIDENCE}/secondary-independent-audit.json`;
  const audit = readJson(auditRel);
  const expected = {
    fileBindingsVerified: 297,
    texasOriginalPngsVerified: 384,
    texasPdfPinsVerified: 16,
    texasWidgetWritesVerified: 198,
    texasSourceAppearancesRetained: 546,
    texasUnmatchedSourceAppearances: 0,
    texasUniqueImagesInspected: 27,
    texasChangedPageOccurrencesCovered: 42,
    floridaOriginalPngsVerified: 10,
    floridaChangedPagesInspected: 2,
    floridaSourceWordsAndPositionsPreservedPerFixture: 1250,
  };
  check(auditRel, audit?.schemaVersion === "rcap-secondary-review/v1" && audit?.verdict === "PASS",
    "secondary audit is absent, wrong-schema, or non-PASS");
  check(auditRel, audit?.reviewer?.authoredPacketsOrRepairs === false,
    "secondary reviewer is not recorded as independent of packet/repair authorship");
  for (const [key, value] of Object.entries(expected)) {
    check(auditRel, audit?.measurements?.[key] === value,
      `${key} is ${audit?.measurements?.[key] ?? "missing"}, expected ${value}`);
  }
}

function validateTerminalState() {
  if (!REQUIRE_TERMINAL) return;
  const masterRel = `${BASE}/MASTER_QUEUE.json`;
  const rasterRel = `${BASE}/RASTER_QUEUE.json`;
  const master = readJson(masterRel);
  const raster = readJson(rasterRel);
  const masterTargets = (master?.families ?? []).filter((row) => ALL_FAMILIES.includes(row.familyId));
  const rasterTargets = (raster?.rows ?? []).filter((row) => ALL_FAMILIES.includes(row.familyId));
  check(masterRel, sameSet(masterTargets.map((row) => row.familyId), ALL_FAMILIES),
    "central master queue does not contain each closure family exactly once");
  check(rasterRel, sameSet(rasterTargets.map((row) => row.familyId), ALL_FAMILIES),
    "central raster queue does not contain each closure family exactly once");
  check(rasterRel, raster?.workflow === RASTER_WORKFLOW,
    `queue names ${raster?.workflow ?? "no workflow"}, expected ${RASTER_WORKFLOW}`);
  check(rasterRel, raster?.workflowReachability?.presentOnDefaultBranch === true,
    "central raster workflow is not recorded reachable on the default branch");
  const rasterByFamily = new Map(rasterTargets.map((row) => [row.familyId, row]));
  for (const masterRow of masterTargets) {
    const family = masterRow.familyId;
    const scope = `terminal/${family}`;
    const rasterRow = rasterByFamily.get(family);
    const expectedRun = family === FL_FAMILY ? FL_RUN : TX_RUN;
    check(scope, masterRow.state === "COMPLETE_PACKET_PROVEN",
      `master state is ${masterRow.state}, expected COMPLETE_PACKET_PROVEN`);
    check(scope, rasterRow?.currentRasterState === "RASTER_PASS",
      `raster state is ${rasterRow?.currentRasterState ?? "missing"}, expected RASTER_PASS`);
    const receipt = rasterRow?.rasterReceipt;
    check(scope, receipt?.workflow === RASTER_WORKFLOW,
      `receipt names ${receipt?.workflow ?? "no workflow"}`);
    check(scope, String(receipt?.workflowRunId ?? "") === expectedRun,
      `receipt run is ${receipt?.workflowRunId ?? "missing"}, expected ${expectedRun}`);
    check(scope, receipt?.verdict === "RASTER_PASS", `receipt verdict is ${receipt?.verdict ?? "missing"}`);
    check(scope, receipt?.jobConclusion === "success",
      `receipt jobConclusion is ${receipt?.jobConclusion ?? "missing"}`);
    check(scope, /^[0-9]+$/.test(String(receipt?.jobId ?? "")), "receipt names no numeric jobId");
    if (rasterRow) {
      const acceptance = evaluateAcceptance(ROOT, rasterRow, { requireReceiptDeclaredCoverage: true });
      check(scope, acceptance.status === ACCEPTANCE.PROVEN_ON_CURRENT_BYTES && acceptance.proven === true,
        `shared acceptance identity returned ${acceptance.status}: ${acceptance.reasons.join("; ")}`);
    }
    stats.terminalFamilies += 1;
  }
  check("terminal", stats.terminalFamilies === 9,
    `expected 9 terminal families, observed ${stats.terminalFamilies}`);
}

const flReturn = readJson(FL_RETURN);
const txReturn = readJson(TX_RETURN);
const flMeasurements = readJson(FL_MEASUREMENTS);
const txMeasurements = readJson(TX_MEASUREMENTS);
const txManifest = readJson(TX_MANIFEST);
const flRows = validateReturn(flReturn, FL_RETURN, "VF64", [FL_FAMILY]);
const txRows = validateReturn(txReturn, TX_RETURN, "VF08", TX_FAMILIES);
const rows = [...flRows, ...txRows];

check("closure", stats.families === 9, `expected 9 independently completed families, observed ${stats.families}`);
check("closure", stats.obligations === 135, `expected 135 measured obligations, observed ${stats.obligations}`);
check(TX_MEASUREMENTS, Array.isArray(txMeasurements)
  && sameOrdered(txMeasurements.map((entry) => entry.familyId), TX_FAMILIES),
"Texas measurements are not the exact eight-family list");
recordClaimedPaths(flMeasurements, FL_MEASUREMENTS);
recordClaimedPaths(txMeasurements, TX_MEASUREMENTS);
if (flMeasurements?.source) validateSource(`${FL_MEASUREMENTS}/source`, flMeasurements.source, "path");
else fail(FL_MEASUREMENTS, "missing held source identity");
for (const family of txMeasurements ?? []) {
  check(`${TX_MEASUREMENTS}/${family.familyId}`, Array.isArray(family.sources) && family.sources.length > 0,
    "no held source identities");
  for (const [index, source] of (family.sources ?? []).entries()) {
    validateSource(`${TX_MEASUREMENTS}/${family.familyId}/sources/${index}`, source, "file");
  }
}

validateArtifacts(rows, flMeasurements, txManifest);
check("pdf", stats.pdfs === 18, `expected 18 current PDFs, observed ${stats.pdfs}`);
const pngMetadata = validateOriginalRaster(rows, flMeasurements, txMeasurements);
validateSelectedPngs(pngMetadata);
validateChecksAndAudit(txMeasurements);
validateTerminalState();

for (const rel of [FL_RETURN, TX_RETURN, FL_MEASUREMENTS, TX_MEASUREMENTS,
  `${BASE}/raster-runs/${TX_RUN}/ORIGINAL_EVIDENCE_VERIFIED.json`]) {
  try {
    check(rel, !fs.readFileSync(path.join(ROOT, rel), "utf8").includes(RETIRED_TX_RUN),
      `retired Texas run ${RETIRED_TX_RUN} appears in current closure evidence`);
  } catch { /* readJson already reported it */ }
}

if (failures.length) {
  console.error(`FL/TX CURRENT CLOSURE: FAIL (${failures.length} finding${failures.length === 1 ? "" : "s"})`);
  for (const finding of failures) console.error(`  - ${finding}`);
  process.exitCode = 1;
} else {
  console.log("FL/TX CURRENT CLOSURE: PASS");
  console.log(`  ${stats.families} independent family returns; ${stats.obligations} measured PASS obligations; 81/81 counters zero`);
  console.log(`  ${stats.pdfs} current PDFs match reviews and receipts (FL ${FL_RUN}; TX ${TX_RUN})`);
  console.log(`  ${stats.originalPngMetadata} original PNG hashes bound; ${stats.txArchives} Texas ZIPs verified; ${stats.originalPngsRehashed} available PNGs rehashed (${stats.selectedPngs} selected)`);
  console.log(`  ${stats.sourceFiles} held source references and ${stats.evidencePaths} local path claims resolved inside this checkout`);
  if (REQUIRE_TERMINAL) {
    console.log(`  ${stats.terminalFamilies} terminal queue rows have current-byte, workflow/run, and successful-job provenance`);
  } else {
    console.log("  review-evidence gate only; central queue/claim state was not required or changed");
  }
}
