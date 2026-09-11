import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  PA_CERTIFICATE_REUSE_DESCRIPTOR,
  reuseOriginalPageEvidence
} from "./reuse-original-page-evidence.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const FAMILY = "pa_6308_underage-set";
const FAMILY_PATH = FAMILY;
const EVIDENCE = "data/rcap-grade-a/packet-factory-24h/pf26/pa-raster-reuse-20260911";
const ORIGINAL = "data/rcap-grade-a/packet-factory-24h/raster-runs/34602289097";
const CANONICAL = Object.freeze({
  kind: "canonical",
  name: "certificate-of-service-canonical.pdf",
  rel: "data/rcap-all50/overlays/census-v1/pa/pa-6308-underage-set--official-pdf-fill/fixtures/certificate-of-service-canonical.pdf",
  expected: "25ef4ba175037ab521617567dd1a1bd7293e96f1a4ee47fd25604f6d999bbfad",
  expectedPages: 1
});
const BOUNDARY = Object.freeze({
  kind: "boundary",
  name: "certificate-of-service-boundary.pdf",
  rel: "data/rcap-all50/overlays/census-v1/pa/pa-6308-underage-set--official-pdf-fill/fixtures/certificate-of-service-boundary.pdf",
  expected: "256d896fba6bf63c61838c7a736d4eeb8c3a62c074df559dd98ddf671c2692f8",
  expectedPages: 1
});

const descriptorFor = (target) => ({
  ...PA_CERTIFICATE_REUSE_DESCRIPTOR,
  documentRole: target.kind,
  documentPath: target.rel,
  documentSha256: target.expected,
  documentName: target.name
});

const digest = (file) => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");

async function attempt({
  root = ROOT,
  target = CANONICAL,
  descriptor = descriptorFor(target),
  scale = 2.5,
  currentPageCount = 1
} = {}) {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), "rcap-pa-reuse-out-"));
  try {
    return await reuseOriginalPageEvidence({
      root, out, familyId: FAMILY, familyPath: FAMILY_PATH,
      target, descriptor, scale, currentPageCount
    });
  } finally {
    fs.rmSync(out, { recursive: true, force: true });
  }
}

function disposableEvidenceRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "rcap-pa-reuse-root-"));
  const files = [
    `${FAMILY}.verdict.json`,
    `${FAMILY}.ORIGINAL_EVIDENCE_VERIFIED.json`,
    `${FAMILY}.PAGE_IMAGES_SHA256.json`,
    `${FAMILY}/certificate-of-service-canonical/page-001.png`,
    `${FAMILY}/certificate-of-service-boundary/page-001.png`
  ];
  for (const relative of files) {
    const source = path.join(ROOT, ORIGINAL, relative);
    const destination = path.join(root, ORIGINAL, relative);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.copyFileSync(source, destination);
  }
  return root;
}

test("reuses the two exact certificate pages and preserves original measurement semantics", async () => {
  for (const target of [CANONICAL, BOUNDARY]) {
    const result = await attempt({ target, descriptor: descriptorFor(target) });
    assert.equal(result.measurements.length, 1);
    const page = result.measurements[0];
    assert.equal(page.renderedInThisRun, false);
    assert.equal(page.originalOrigin.workflowRunId, "34602289097");
    assert.equal(page.originalOrigin.packetCommitSha, "3bb298d136ccca78f63256dc6bef210692f42331");
    assert.deepEqual([page.pngWidth, page.pngHeight], [2040, 2640]);
    assert.deepEqual([page.paper.width, page.paper.height], [2040, 2640]);
    assert.equal(result.document.renderedInThisRun, false);
  }
});

test("production CLI supports an all-reuse partial manifest without Chromium", () => {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), "rcap-pa-reuse-cli-"));
  try {
    execFileSync(process.execPath, [
      "scripts/rcap-raster-batch.mjs",
      "--manifest", `${EVIDENCE}/all-reuse-partial-manifest.json`,
      "--family", FAMILY,
      "--commit", "6518eace0c61cae567250d7c6f57c6ec2f9a93b5",
      "--scale", "2.5",
      "--run-id", "test-pa-reuse",
      "--out", out
    ], { cwd: ROOT, stdio: "pipe" });
    const verdict = JSON.parse(fs.readFileSync(path.join(out, `${FAMILY}.verdict.json`), "utf8"));
    assert.equal(verdict.verdict, "RASTER_PASS");
    assert.equal(verdict.browserExecutable, null);
    assert.equal(verdict.resolvedBy, "not-needed-all-pages-reused");
    assert.equal(verdict.coversTheWholeFamily, false);
    assert.equal(verdict.freshRenderedPages, 0);
    assert.equal(verdict.reusedPages, 2);
    assert.equal(verdict.freshRenderedDocuments.length, 0);
    assert.equal(verdict.reusedDocuments.length, 2);
    assert.ok(verdict.documentsRendered.every((document) => document.renderedInThisRun === false));
  } finally {
    fs.rmSync(out, { recursive: true, force: true });
  }
});

test("production CLI fails an invalid opt-in instead of silently rendering", () => {
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "rcap-pa-reuse-invalid-"));
  const out = path.join(scratch, "out");
  const manifestPath = path.join(scratch, "manifest.json");
  try {
    const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, EVIDENCE, "all-reuse-partial-manifest.json"), "utf8"));
    for (const document of manifest.rows[0].documents) {
      document.reuseOriginalPageEvidence.originalRunId = "wrong-run";
    }
    fs.writeFileSync(manifestPath, JSON.stringify(manifest));
    assert.throws(() => execFileSync(process.execPath, [
      "scripts/rcap-raster-batch.mjs",
      "--manifest", path.relative(ROOT, manifestPath),
      "--family", FAMILY,
      "--scale", "2.5",
      "--run-id", "test-pa-invalid-reuse",
      "--out", out
    ], { cwd: ROOT, stdio: "pipe" }), (error) => error.status === 1);
    const verdict = JSON.parse(fs.readFileSync(path.join(out, `${FAMILY}.verdict.json`), "utf8"));
    assert.equal(verdict.verdict, "RASTER_FAIL");
    assert.equal(verdict.browserExecutable, null);
    assert.equal(verdict.freshRenderedPages, 0);
    assert.equal(verdict.reusedPages, 0);
    assert.equal(verdict.pagesMeasured, 0);
    assert.equal(verdict.problems.length, 2);
    assert.ok(verdict.problems.every((problem) => /original-page reuse refused/.test(problem)));
  } finally {
    fs.rmSync(scratch, { recursive: true, force: true });
  }
});

test("refuses changed current identity, role, scale, page count, run, verdict, and traversal", async () => {
  const cases = [
    { label: "bad current SHA", options: { target: { ...CANONICAL, expected: "0".repeat(64) } } },
    { label: "wrong role", options: { target: { ...CANONICAL, kind: "boundary" } } },
    { label: "wrong scale", options: { scale: 2 }, message: /reuse scale differs/ },
    { label: "wrong current page count", options: { currentPageCount: 2 }, message: /current PDF page count changed/ },
    { label: "wrong queued page count", options: { target: { ...CANONICAL, expectedPages: 2 } } },
    { label: "bad original verdict SHA", options: { descriptor: { ...descriptorFor(CANONICAL), originalVerdictSha256: "0".repeat(64) } } },
    { label: "wrong original run", options: { descriptor: { ...descriptorFor(CANONICAL), originalRunId: "1" } } },
    { label: "wrong original verdict path", options: { descriptor: { ...descriptorFor(CANONICAL), originalVerdictPath: "data/not-the-verdict.json" } } },
    { label: "path traversal", options: { descriptor: { ...descriptorFor(CANONICAL), imageRoot: "../outside" } } }
  ];
  for (const { label, options, message } of cases) {
    await assert.rejects(() => attempt(options), message, label);
  }
});

test("refuses a changed original verdict, corrupt PNG, and missing page", async (t) => {
  await t.test("changed original verdict", async () => {
    const root = disposableEvidenceRoot();
    try {
      fs.appendFileSync(path.join(root, ORIGINAL, `${FAMILY}.verdict.json`), " ");
      await assert.rejects(() => attempt({ root }), /original verdict SHA-256 changed/);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
  await t.test("corrupt PNG", async () => {
    const root = disposableEvidenceRoot();
    try {
      const png = path.join(root, ORIGINAL, `${FAMILY}/certificate-of-service-canonical/page-001.png`);
      fs.appendFileSync(png, Buffer.from([0]));
      await assert.rejects(() => attempt({ root }), /original PNG SHA-256 changed/);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
  await t.test("missing page", async () => {
    const root = disposableEvidenceRoot();
    try {
      const png = path.join(root, ORIGINAL, `${FAMILY}/certificate-of-service-canonical/page-001.png`);
      fs.unlinkSync(png);
      await assert.rejects(() => attempt({ root }), /ENOENT/);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});

test("durable production proof copied the repository-held bytes exactly", () => {
  const verdict = JSON.parse(fs.readFileSync(path.join(ROOT, EVIDENCE, "production-cli-output", `${FAMILY}.verdict.json`), "utf8"));
  assert.equal(verdict.verdict, "RASTER_PASS");
  assert.equal(verdict.coversTheWholeFamily, false);
  assert.equal(verdict.reusedPages, 2);
  for (const page of verdict.measurements) {
    assert.equal(page.renderedInThisRun, false);
    assert.equal(digest(path.join(ROOT, EVIDENCE, "production-cli-output", page.png)), page.pngSha256);
    assert.equal(digest(path.join(ROOT, ORIGINAL, page.originalOrigin.pngMember)), page.pngSha256);
  }
});
