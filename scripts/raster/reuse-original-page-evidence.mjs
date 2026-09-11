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

const ALLOWED = Object.freeze({
  "certificate-of-service-canonical.pdf": Object.freeze({
    role: "canonical",
    path: "data/rcap-all50/overlays/census-v1/pa/pa-6308-underage-set--official-pdf-fill/fixtures/certificate-of-service-canonical.pdf",
    sha256: "25ef4ba175037ab521617567dd1a1bd7293e96f1a4ee47fd25604f6d999bbfad",
    pageCount: 1
  }),
  "certificate-of-service-boundary.pdf": Object.freeze({
    role: "boundary",
    path: "data/rcap-all50/overlays/census-v1/pa/pa-6308-underage-set--official-pdf-fill/fixtures/certificate-of-service-boundary.pdf",
    sha256: "256d896fba6bf63c61838c7a736d4eeb8c3a62c074df559dd98ddf671c2692f8",
    pageCount: 1
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

export async function reuseOriginalPageEvidence({ root, out, familyId, familyPath, target, descriptor, scale, currentPageCount }) {
  assert.equal(familyId, FAMILY, "original-page reuse is initially closed to pa_6308_underage-set");
  const allowed = ALLOWED[target.name];
  assert.ok(allowed, `${target.name}: original-page reuse is not allowlisted`);
  assert.equal(target.kind, allowed.role, `${target.name}: current role is not the allowlisted identity`);
  assert.equal(target.rel, allowed.path, `${target.name}: current path is not the allowlisted identity`);
  assert.equal(target.expected, allowed.sha256, `${target.name}: current SHA-256 is not the allowlisted identity`);
  assert.equal(target.expectedPages, allowed.pageCount, `${target.name}: queued page count is not the allowlisted count`);
  assert.equal(currentPageCount, allowed.pageCount, `${target.name}: current PDF page count changed`);

  const expectedDescriptor = {
    ...PA_CERTIFICATE_REUSE_DESCRIPTOR,
    documentRole: allowed.role,
    documentPath: allowed.path,
    documentSha256: allowed.sha256,
    documentName: target.name
  };
  assert.deepEqual(descriptor, expectedDescriptor, `${target.name}: reuse descriptor is not the closed original receipt`);

  const verdictFile = inside(root, descriptor.originalVerdictPath, "original verdict path");
  const verifiedFile = inside(root, VERIFIED_PATH, "original verified-evidence path");
  const inventoryFile = inside(root, INVENTORY_PATH, "original page inventory path");
  assert.equal(digest(verdictFile), descriptor.originalVerdictSha256, "original verdict SHA-256 changed");
  assert.equal(digest(verifiedFile), VERIFIED_SHA256, "original verified-evidence SHA-256 changed");
  assert.equal(digest(inventoryFile), INVENTORY_SHA256, "original page inventory SHA-256 changed");

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
  assert.equal(verdict.documentsDigest, DOCUMENTS_DIGEST, "original document-set digest changed");
  assert.equal(verdict.coversTheWholeFamily, true, "original receipt did not cover its whole family");

  assert.equal(verified.familyId, FAMILY);
  assert.equal(String(verified.runId), descriptor.originalRunId);
  assert.equal(verified.packetCommitSha, descriptor.originalPacketCommitSha);
  assert.equal(verified.verdict, "RASTER_PASS");
  assert.equal(verified.documentsVerified, 6);
  assert.equal(verified.pagesVerified, 8);
  assert.equal(verified.documentsDigest, DOCUMENTS_DIGEST);
  assert.equal(verified.allCurrentPdfHashesMatch, true);
  assert.equal(verified.allOriginalPngHashesAndLengthsMatch, true);
  const originalArtifact = verified.artifactMetadata.filter((item) => item.id === ORIGINAL_ARTIFACT_ID);
  assert.equal(originalArtifact.length, 1, "original artifact metadata is absent or duplicated");
  assert.equal(originalArtifact[0].digest, `sha256:${ORIGINAL_ARTIFACT_ZIP_SHA256}`);
  assert.equal(verified.originalArchives.artifact.sha256, ORIGINAL_ARTIFACT_ZIP_SHA256);

  const originalDocument = verdict.documentsRendered.filter((row) => row.document === target.name);
  assert.equal(originalDocument.length, 1, `${target.name}: original document identity is absent or duplicated`);
  assert.deepEqual(originalDocument[0], { role: allowed.role, document: target.name, path: allowed.path, pinned: allowed.sha256 });
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
    const imageReading = verified.imageReadings.filter((row) => row.member === measurement.png);
    assert.equal(imageReading.length, 1, `${target.name} page ${measurement.page}: verified image reading is absent or duplicated`);
    const metadata = await sharp(imageFile).metadata();
    assert.deepEqual([metadata.width, metadata.height], imageReading[0].actualPngCanvas, `${target.name} page ${measurement.page}: PNG canvas changed`);
    assert.deepEqual(imageReading[0].originalMeasuredPaper, [measurement.pngWidth, measurement.pngHeight]);
    assert.ok(
      measurement.paper.x0 >= 0 && measurement.paper.y0 >= 0
        && measurement.paper.x0 + measurement.paper.width <= metadata.width
        && measurement.paper.y0 + measurement.paper.height <= metadata.height,
      `${target.name} page ${measurement.page}: measured paper is outside the PNG canvas`
    );
    assert.equal(measurement.paper.x1, measurement.paper.x0 + measurement.paper.width - 1);
    assert.equal(measurement.paper.y1, measurement.paper.y0 + measurement.paper.height - 1);
    assert.equal(imageReading[0].sha256, measurement.pngSha256);
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
        verifiedEvidencePath: VERIFIED_PATH,
        verifiedEvidenceSha256: VERIFIED_SHA256,
        pageInventoryPath: INVENTORY_PATH,
        pageInventorySha256: INVENTORY_SHA256,
        artifactId: ORIGINAL_ARTIFACT_ID,
        artifactZipSha256: ORIGINAL_ARTIFACT_ZIP_SHA256,
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
        verifiedEvidencePath: VERIFIED_PATH,
        verifiedEvidenceSha256: VERIFIED_SHA256,
        pageInventoryPath: INVENTORY_PATH,
        pageInventorySha256: INVENTORY_SHA256,
        artifactId: ORIGINAL_ARTIFACT_ID,
        artifactZipSha256: ORIGINAL_ARTIFACT_ZIP_SHA256,
        pages: reused.length
      }
    }
  };
}
