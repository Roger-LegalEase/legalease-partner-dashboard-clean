import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const FAMILY = "pa_6308_underage-set";
const RUN = "34602289097";
const PACKET_COMMIT = "3bb298d136ccca78f63256dc6bef210692f42331";
const RUN_ROOT = `data/rcap-grade-a/packet-factory-24h/raster-runs/${RUN}`;
const VERDICT_PATH = `${RUN_ROOT}/${FAMILY}.verdict.json`;
const VERDICT_SHA256 = "2030ef74f6deff16322ec6d17feb1da08e75fd15394efb9234f15729f1c1c982";
const VERIFIED_PATH = `${RUN_ROOT}/${FAMILY}.ORIGINAL_EVIDENCE_VERIFIED.json`;
const VERIFIED_SHA256 = "f45d870abfb4c29119b623918383fa06498bd376a916b4702a613fdc48a3a105";
const INVENTORY_PATH = `${RUN_ROOT}/${FAMILY}.PAGE_IMAGES_SHA256.json`;
const INVENTORY_SHA256 = "f0985c2db07cddb11fcb73559606491470458e8e2b879cea10e6785308bb5365";
const DOCUMENTS_DIGEST = "3d6fc9ec01545fa24c61622bef9e864524c887a129413891276005c66d00da77";
const IMAGE_ROOT = RUN_ROOT;
const ORIGINAL_ARTIFACT_ID = 10265570395;
const ORIGINAL_ARTIFACT_ZIP_SHA256 = "ffe836e0433b8cc405443c78f541c0a89d84be56a5e30f411495744eeb3576c7";

const CURRENT_RUN = "34627159438";
const CURRENT_PACKET_COMMIT = "c200f0cec306a3d219371b7118893dd4d24d0536";
const CURRENT_RUN_ROOT = `data/rcap-grade-a/packet-factory-24h/raster-runs/${CURRENT_RUN}`;
const CURRENT_VERDICT_PATH = `${CURRENT_RUN_ROOT}/${FAMILY}.verdict.json`;
const CURRENT_VERDICT_SHA256 = "c8b3b8066269715e77de0174c560b8aa21cd12ded53b779b5496bcdd2e9a6a85";
const CURRENT_VERIFIED_PATH = `${CURRENT_RUN_ROOT}/${FAMILY}.ORIGINAL_EVIDENCE_VERIFIED.json`;
const CURRENT_VERIFIED_SHA256 = "e6cc3118722cf3e530ac7bece1bf7d442b8fb9a4c829d1980aee17b66a620ebe";
const CURRENT_INVENTORY_PATH = `${CURRENT_RUN_ROOT}/${FAMILY}.PAGE_IMAGES_SHA256.json`;
const CURRENT_INVENTORY_SHA256 = "fc89385b0507f206ca4b3d6562e9d00044903c3991a76e1ac06c398645779be8";
const CURRENT_DOCUMENTS_DIGEST = "c92d9ff21530754acd9b92d9cece62bb88e9205430cf7e42a7cc949a16028959";
const CURRENT_ORIGINAL_ARTIFACT_ID = 10275441234;
const CURRENT_ORIGINAL_ARTIFACT_NAME = "rcap-raster-pa_6308_underage-set-34627159438";
const CURRENT_ORIGINAL_ARTIFACT_ZIP_SHA256 = "fa45d034a2f6eaf42895a8aaba16b68b2391f971a9a088efc6a4ac00cc559b69";
const CURRENT_ORIGINAL_ARTIFACT_BYTES = 4293361;

const ALLOWED = Object.freeze({
  "certificate-of-service-canonical.pdf": Object.freeze({
    role: "canonical",
    path: "data/rcap-all50/overlays/census-v1/pa/pa-6308-underage-set--official-pdf-fill/fixtures/certificate-of-service-canonical.pdf",
    sha256: "25ef4ba175037ab521617567dd1a1bd7293e96f1a4ee47fd25604f6d999bbfad",
    pageCount: 1,
    evidencePolicy: "original-certificates"
  }),
  "certificate-of-service-boundary.pdf": Object.freeze({
    role: "boundary",
    path: "data/rcap-all50/overlays/census-v1/pa/pa-6308-underage-set--official-pdf-fill/fixtures/certificate-of-service-boundary.pdf",
    sha256: "256d896fba6bf63c61838c7a736d4eeb8c3a62c074df559dd98ddf671c2692f8",
    pageCount: 1,
    evidencePolicy: "original-certificates"
  }),
  "rule-490-petition-canonical.pdf": Object.freeze({
    role: "canonical",
    path: "data/rcap-all50/overlays/census-v1/pa/pa-6308-underage-set--official-pdf-fill/fixtures/rule-490-petition-canonical.pdf",
    sha256: "0bc45b2c0ac23fac1d5f64fbb340cf29cb93af01e29da5d6e1f0923121469a5d",
    pageCount: 1,
    evidencePolicy: "current-official-forms"
  }),
  "rule-790-order-boundary.pdf": Object.freeze({
    role: "boundary",
    path: "data/rcap-all50/overlays/census-v1/pa/pa-6308-underage-set--official-pdf-fill/fixtures/rule-790-order-boundary.pdf",
    sha256: "5dcb402f6af5df9930d7283e62d15407f9734862b46063674f0c4c65302ef957",
    pageCount: 2,
    evidencePolicy: "current-official-forms"
  }),
  "rule-790-petition-boundary.pdf": Object.freeze({
    role: "boundary",
    path: "data/rcap-all50/overlays/census-v1/pa/pa-6308-underage-set--official-pdf-fill/fixtures/rule-790-petition-boundary.pdf",
    sha256: "a88f0a3cbab962faf0cd06e1a916d8ebf40b34fdfe43041574979b64b0134cb9",
    pageCount: 1,
    evidencePolicy: "current-official-forms"
  })
});

const digest = (file) => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
const read = (file) => JSON.parse(fs.readFileSync(file, "utf8"));

function inside(root, relative, label) {
  assert.equal(typeof relative, "string", `${label} must be a repo-relative path`);
  assert.ok(relative.length > 0 && !path.isAbsolute(relative), `${label} must be a nonempty repo-relative path`);
  const base = fs.realpathSync(root);
  const candidate = path.resolve(root, relative);
  assert.ok(candidate.startsWith(`${path.resolve(root)}${path.sep}`), `${label} escapes the repository`);
  const real = fs.realpathSync(candidate);
  assert.ok(real.startsWith(`${base}${path.sep}`), `${label} resolves outside the repository`);
  return real;
}

function safeOutput(out, familyPath, documentName, page) {
  const dir = path.resolve(out, familyPath, documentName.replace(/\.pdf$/, "").replace(/[^A-Za-z0-9._-]/g, "_"));
  assert.ok(dir.startsWith(`${path.resolve(out)}${path.sep}`), "reuse output escapes the requested output directory");
  fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, `page-${String(page).padStart(3, "0")}.png`);
}

async function inkFraction(png, paper) {
  const { data, info } = await sharp(png).greyscale().extract({
    left: Math.max(0, Math.round(paper.x0)), top: Math.max(0, Math.round(paper.y0)),
    width: Math.max(1, Math.round(paper.width)), height: Math.max(1, Math.round(paper.height))
  }).raw().toBuffer({ resolveWithObject: true });
  let dark = 0;
  for (let i = 0; i < data.length; i += 1) if (data[i] < 200) dark += 1;
  return dark / (info.width * info.height);
}

export const PA_CERTIFICATE_REUSE_DESCRIPTOR = Object.freeze({
  originalVerdictPath: VERDICT_PATH,
  originalVerdictSha256: VERDICT_SHA256,
  originalRunId: RUN,
  originalPacketCommitSha: PACKET_COMMIT,
  imageRoot: IMAGE_ROOT
});

export const PA_CURRENT_OFFICIAL_REUSE_DESCRIPTOR = Object.freeze({
  originalVerdictPath: CURRENT_VERDICT_PATH,
  originalVerdictSha256: CURRENT_VERDICT_SHA256,
  originalRunId: CURRENT_RUN,
  originalPacketCommitSha: CURRENT_PACKET_COMMIT,
  imageRoot: CURRENT_RUN_ROOT
});

export async function reuseOriginalPageEvidence({ root, out, familyId, familyPath, target, descriptor, scale, currentPageCount }) {
  assert.equal(familyId, FAMILY, "original-page reuse is initially closed to pa_6308_underage-set");
  const allowed = ALLOWED[target.name];
  assert.ok(allowed, `${target.name}: original-page reuse is not allowlisted`);
  assert.equal(target.kind, allowed.role, `${target.name}: current role is not the allowlisted identity`);
  assert.equal(target.rel, allowed.path, `${target.name}: current path is not the allowlisted identity`);
  assert.equal(target.expected, allowed.sha256, `${target.name}: current SHA-256 is not the allowlisted identity`);
  assert.equal(target.expectedPages, allowed.pageCount, `${target.name}: queued page count is not the allowlisted count`);
  assert.equal(currentPageCount, allowed.pageCount, `${target.name}: current PDF page count changed`);

  const currentOfficial = allowed.evidencePolicy === "current-official-forms";
  const policy = currentOfficial ? {
    descriptor: PA_CURRENT_OFFICIAL_REUSE_DESCRIPTOR,
    verifiedPath: CURRENT_VERIFIED_PATH,
    verifiedSha256: CURRENT_VERIFIED_SHA256,
    inventoryPath: CURRENT_INVENTORY_PATH,
    inventorySha256: CURRENT_INVENTORY_SHA256,
    documentsDigest: CURRENT_DOCUMENTS_DIGEST,
    artifactId: CURRENT_ORIGINAL_ARTIFACT_ID,
    artifactZipSha256: CURRENT_ORIGINAL_ARTIFACT_ZIP_SHA256
  } : {
    descriptor: PA_CERTIFICATE_REUSE_DESCRIPTOR,
    verifiedPath: VERIFIED_PATH,
    verifiedSha256: VERIFIED_SHA256,
    inventoryPath: INVENTORY_PATH,
    inventorySha256: INVENTORY_SHA256,
    documentsDigest: DOCUMENTS_DIGEST,
    artifactId: ORIGINAL_ARTIFACT_ID,
    artifactZipSha256: ORIGINAL_ARTIFACT_ZIP_SHA256
  };
  const expectedDescriptor = {
    ...policy.descriptor,
    documentRole: allowed.role,
    documentPath: allowed.path,
    documentSha256: allowed.sha256,
    documentName: target.name
  };
  assert.deepEqual(descriptor, expectedDescriptor, `${target.name}: reuse descriptor is not the closed original receipt`);

  const verdictFile = inside(root, descriptor.originalVerdictPath, "original verdict path");
  const verifiedFile = inside(root, policy.verifiedPath, "original verified-evidence path");
  const inventoryFile = inside(root, policy.inventoryPath, "original page inventory path");
  assert.equal(digest(verdictFile), descriptor.originalVerdictSha256, "original verdict SHA-256 changed");
  assert.equal(digest(verifiedFile), policy.verifiedSha256, "original verified-evidence SHA-256 changed");
  assert.equal(digest(inventoryFile), policy.inventorySha256, "original page inventory SHA-256 changed");

  const verdict = read(verdictFile);
  const verified = read(verifiedFile);
  const inventory = read(inventoryFile);
  assert.equal(verdict.familyId, FAMILY);
  assert.equal(verdict.verdict, "RASTER_PASS", "original family verdict was not RASTER_PASS");
  assert.deepEqual(verdict.problems, [], "original family verdict reported problems");
  assert.deepEqual(verdict.environmentProblems, [], "original family verdict reported environment problems");
  assert.equal(String(verdict.workflowRunId), descriptor.originalRunId, "original run id changed");
  assert.equal(verdict.packetCommitSha, descriptor.originalPacketCommitSha, "original packet commit changed");
  assert.equal(verdict.requestedScale, scale, "reuse scale differs from the original render scale");
  assert.equal(verdict.documentsDigest, policy.documentsDigest, "original document-set digest changed");
  assert.equal(verdict.coversTheWholeFamily, true, "original receipt did not cover its whole family");

  if (currentOfficial) {
    assert.equal(verified.schemaVersion, "rcap-original-receipt-verification/v1");
    assert.equal(verified.scope.familyId, FAMILY);
    assert.equal(String(verified.scope.workflowRunId), descriptor.originalRunId);
    assert.equal(verified.scope.pinnedPacketCommitSha, descriptor.originalPacketCommitSha);
    assert.equal(verified.scope.mode, "read-only; no central ingestion/admission performed");
    assert.equal(String(verified.run.id), descriptor.originalRunId);
    assert.equal(verified.run.status, "completed");
    assert.equal(verified.run.conclusion, "success");
    const familyJob = verified.run.jobs.filter((item) => item.id === 103356122596);
    assert.equal(familyJob.length, 1, "original family workflow job is absent or duplicated");
    assert.equal(familyJob[0].name, FAMILY);
    assert.equal(familyJob[0].conclusion, "success");
    assert.equal(verified.familyVerdict.familyId, FAMILY);
    assert.equal(String(verified.familyVerdict.workflowRunId), descriptor.originalRunId);
    assert.equal(verified.familyVerdict.packetCommitSha, descriptor.originalPacketCommitSha);
    assert.equal(verified.familyVerdict.verdict, "RASTER_PASS");
    assert.equal(verified.familyVerdict.documentsDigest, policy.documentsDigest);
    assert.equal(verified.familyVerdict.pagesMeasured, 8);
    assert.equal(verified.familyVerdict.coversTheWholeFamily, true);
    assert.deepEqual(verified.familyVerdict.problems, []);
    assert.deepEqual(verified.familyVerdict.environmentProblems, []);
    const verifiedDocument = verified.familyVerdict.documents
      .filter((item) => item.path === allowed.path);
    assert.equal(verifiedDocument.length, 1, "original verification document is absent or duplicated");
    assert.equal(verifiedDocument[0].expectedSha256, allowed.sha256);
    assert.equal(verifiedDocument[0].actualSha256, allowed.sha256);
    assert.equal(verifiedDocument[0].manifestSha256, allowed.sha256);
    assert.equal(verifiedDocument[0].shaMatch, true);
    assert.equal(verifiedDocument[0].pdfPages, allowed.pageCount);
    assert.equal(verifiedDocument[0].manifestPageCount, allowed.pageCount);
    assert.equal(verifiedDocument[0].exists, true);
    const originalArtifact = verified.artifacts.filter((item) => item.id === policy.artifactId);
    assert.equal(originalArtifact.length, 1, "original artifact metadata is absent or duplicated");
    assert.equal(originalArtifact[0].name, CURRENT_ORIGINAL_ARTIFACT_NAME);
    assert.equal(originalArtifact[0].zipSha256, policy.artifactZipSha256);
    assert.equal(originalArtifact[0].apiDigest, `sha256:${policy.artifactZipSha256}`);
    assert.equal(originalArtifact[0].apiDigestMatches, true);
    assert.equal(originalArtifact[0].sizeBytes, CURRENT_ORIGINAL_ARTIFACT_BYTES);
    assert.equal(String(originalArtifact[0].workflowRunId), descriptor.originalRunId);
    assert.deepEqual(verified.safeExtraction.unsafeMembers, []);
    assert.equal(verified.safeExtraction.familyMemberCount, 22);
    assert.equal(verified.conclusion.zipDigestsMatchApi, true);
    assert.equal(verified.conclusion.allSixCurrentPdfHashesMatch, true);
    assert.equal(verified.conclusion.allEightPngHashesAndLengthsMatch, true);
    assert.equal(verified.conclusion.allEightPngMeasurementsMatch, true);
    assert.equal(verified.conclusion.familyVerdictClean, true);
    assert.equal(verified.conclusion.centralAdmission, false);
  } else {
    assert.equal(verified.familyId, FAMILY);
    assert.equal(String(verified.runId), descriptor.originalRunId);
    assert.equal(verified.packetCommitSha, descriptor.originalPacketCommitSha);
    assert.equal(verified.verdict, "RASTER_PASS");
    assert.equal(verified.documentsVerified, 6);
    assert.equal(verified.pagesVerified, 8);
    assert.equal(verified.documentsDigest, policy.documentsDigest);
    assert.equal(verified.allCurrentPdfHashesMatch, true);
    assert.equal(verified.allOriginalPngHashesAndLengthsMatch, true);
    const originalArtifact = verified.artifactMetadata.filter((item) => item.id === policy.artifactId);
    assert.equal(originalArtifact.length, 1, "original artifact metadata is absent or duplicated");
    assert.equal(originalArtifact[0].digest, `sha256:${policy.artifactZipSha256}`);
    assert.equal(verified.originalArchives.artifact.sha256, policy.artifactZipSha256);
  }

  const originalDocument = verdict.documentsRendered.filter((row) => row.document === target.name);
  assert.equal(originalDocument.length, 1, `${target.name}: original document identity is absent or duplicated`);
  assert.equal(originalDocument[0].role, allowed.role);
  assert.equal(originalDocument[0].document, target.name);
  assert.equal(originalDocument[0].path, allowed.path);
  assert.equal(originalDocument[0].pinned, allowed.sha256);
  if (currentOfficial) {
    assert.equal(originalDocument[0].renderedInThisRun, true,
      `${target.name}: original run did not freshly render the official form`);
    assert.equal(originalDocument[0].originalOrigin, null,
      `${target.name}: original official-form evidence unexpectedly points to older pages`);
  } else {
    assert.deepEqual(originalDocument[0], {
      role: allowed.role, document: target.name, path: allowed.path, pinned: allowed.sha256
    });
  }
  const originalMeasurements = verdict.measurements.filter((row) => row.document === target.name)
    .sort((a, b) => a.page - b.page);
  assert.equal(originalMeasurements.length, allowed.pageCount, `${target.name}: original page coverage is incomplete`);
  assert.deepEqual(originalMeasurements.map((row) => row.page), Array.from({ length: allowed.pageCount }, (_, i) => i + 1), `${target.name}: original pages have a duplicate or gap`);

  const reused = [];
  for (const measurement of originalMeasurements) {
    assert.equal(measurement.kind, allowed.role);
    assert.equal(measurement.nonblank, true);
    assert.equal(measurement.croppedToThePage, true);
    assert.ok(measurement.calibrationResidualPx <= 1.5);
    assert.ok(
      Math.abs(measurement.expectedPxPerPt - (scale * 96 / 72)) < 1e-12,
      `${target.name} page ${measurement.page}: original pixel scale differs`
    );
    const item = inventory.filter((row) => row.member === measurement.png);
    assert.equal(item.length, 1, `${target.name} page ${measurement.page}: inventory row is absent or duplicated`);
    assert.equal(item[0].runId, descriptor.originalRunId);
    assert.equal(item[0].familyId, FAMILY);
    assert.equal(item[0].sha256, measurement.pngSha256);
    assert.equal(item[0].bytes, measurement.bytes);
    assert.equal(item[0].pngWidth, measurement.pngWidth);
    assert.equal(item[0].pngHeight, measurement.pngHeight);

    const imageFile = inside(root, `${descriptor.imageRoot}/${measurement.png}`, "original PNG path");
    assert.equal(digest(imageFile), measurement.pngSha256, `${target.name} page ${measurement.page}: original PNG SHA-256 changed`);
    assert.equal(fs.statSync(imageFile).size, measurement.bytes, `${target.name} page ${measurement.page}: original PNG length changed`);
    const imageReading = (currentOfficial ? verified.familyVerdict.pages : verified.imageReadings)
      .filter((row) => row.member === measurement.png);
    assert.equal(imageReading.length, 1, `${target.name} page ${measurement.page}: verified image reading is absent or duplicated`);
    const metadata = await sharp(imageFile).metadata();
    assert.deepEqual([metadata.width, metadata.height], currentOfficial
      ? imageReading[0].actualDims : imageReading[0].actualPngCanvas,
    `${target.name} page ${measurement.page}: PNG canvas changed`);
    assert.deepEqual(currentOfficial ? imageReading[0].measurementPaperPx : imageReading[0].originalMeasuredPaper,
      [measurement.pngWidth, measurement.pngHeight]);
    assert.ok(
      measurement.paper.x0 >= 0 && measurement.paper.y0 >= 0
        && measurement.paper.x0 + measurement.paper.width <= metadata.width
        && measurement.paper.y0 + measurement.paper.height <= metadata.height,
      `${target.name} page ${measurement.page}: measured paper is outside the PNG canvas`
    );
    assert.equal(measurement.paper.x1, measurement.paper.x0 + measurement.paper.width - 1);
    assert.equal(measurement.paper.y1, measurement.paper.y0 + measurement.paper.height - 1);
    assert.equal(currentOfficial ? imageReading[0].actualSha256 : imageReading[0].sha256, measurement.pngSha256);
    if (currentOfficial) {
      assert.equal(imageReading[0].shaMatch, true);
      assert.equal(imageReading[0].bytesMatch, true);
      assert.equal(imageReading[0].measurementMatch, true);
    }
    const observedInk = await inkFraction(imageFile, measurement.paper);
    assert.ok(Math.abs(observedInk - measurement.inkFractionInsidePaper) < 1e-15, `${target.name} page ${measurement.page}: original ink measurement no longer reproduces`);

    const output = safeOutput(out, familyPath, target.name, measurement.page);
    fs.copyFileSync(imageFile, output);
    assert.equal(digest(output), measurement.pngSha256, `${target.name} page ${measurement.page}: copied PNG differs`);
    reused.push({
      ...measurement,
      png: path.relative(out, output).split(path.sep).join("/"),
      renderedInThisRun: false,
      evidenceOrigin: "REUSED_ORIGINAL_PAGE_EVIDENCE",
      originalOrigin: {
        workflowRunId: descriptor.originalRunId,
        packetCommitSha: descriptor.originalPacketCommitSha,
        verdictPath: descriptor.originalVerdictPath,
        verdictSha256: descriptor.originalVerdictSha256,
        verifiedEvidencePath: policy.verifiedPath,
        verifiedEvidenceSha256: policy.verifiedSha256,
        pageInventoryPath: policy.inventoryPath,
        pageInventorySha256: policy.inventorySha256,
        artifactId: policy.artifactId,
        artifactZipSha256: policy.artifactZipSha256,
        pngMember: measurement.png,
        pngSha256: measurement.pngSha256
      }
    });
  }
  return {
    measurements: reused,
    document: {
      role: allowed.role, document: target.name, path: allowed.path, pinned: allowed.sha256,
      renderedInThisRun: false,
      originalOrigin: {
        workflowRunId: descriptor.originalRunId,
        packetCommitSha: descriptor.originalPacketCommitSha,
        verdictPath: descriptor.originalVerdictPath,
        verdictSha256: descriptor.originalVerdictSha256,
        verifiedEvidencePath: policy.verifiedPath,
        verifiedEvidenceSha256: policy.verifiedSha256,
        pageInventoryPath: policy.inventoryPath,
        pageInventorySha256: policy.inventorySha256,
        artifactId: policy.artifactId,
        artifactZipSha256: policy.artifactZipSha256,
        pages: reused.length
      }
    }
  };
}
