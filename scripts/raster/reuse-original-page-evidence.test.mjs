import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { PDFDocument } from "pdf-lib";
import {
  PA_CERTIFICATE_REUSE_DESCRIPTOR,
  PA_CURRENT_OFFICIAL_REUSE_DESCRIPTOR,
  reuseOriginalPageEvidence
} from "./reuse-original-page-evidence.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const FAMILY = "pa_6308_underage-set";
const FAMILY_PATH = FAMILY;
const EVIDENCE = "data/rcap-grade-a/packet-factory-24h/pf26/pa-raster-reuse-20260911";
const FIX_EVIDENCE = "data/rcap-grade-a/packet-factory-24h/fix05/pa-disposition-20260911";
const ORIGINAL = "data/rcap-grade-a/packet-factory-24h/raster-runs/34602289097";
const CURRENT_ORIGINAL = "data/rcap-grade-a/packet-factory-24h/raster-runs/34627159438";
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
const RULE_490_PETITION = Object.freeze({
  kind: "canonical",
  name: "rule-490-petition-canonical.pdf",
  rel: "data/rcap-all50/overlays/census-v1/pa/pa-6308-underage-set--official-pdf-fill/fixtures/rule-490-petition-canonical.pdf",
  expected: "0bc45b2c0ac23fac1d5f64fbb340cf29cb93af01e29da5d6e1f0923121469a5d",
  expectedPages: 1
});
const RULE_790_ORDER = Object.freeze({
  kind: "boundary",
  name: "rule-790-order-boundary.pdf",
  rel: "data/rcap-all50/overlays/census-v1/pa/pa-6308-underage-set--official-pdf-fill/fixtures/rule-790-order-boundary.pdf",
  expected: "5dcb402f6af5df9930d7283e62d15407f9734862b46063674f0c4c65302ef957",
  expectedPages: 2
});
const RULE_790_PETITION = Object.freeze({
  kind: "boundary",
  name: "rule-790-petition-boundary.pdf",
  rel: "data/rcap-all50/overlays/census-v1/pa/pa-6308-underage-set--official-pdf-fill/fixtures/rule-790-petition-boundary.pdf",
  expected: "a88f0a3cbab962faf0cd06e1a916d8ebf40b34fdfe43041574979b64b0134cb9",
  expectedPages: 1
});
const CURRENT_OFFICIAL = Object.freeze([RULE_490_PETITION, RULE_790_ORDER, RULE_790_PETITION]);

const descriptorFor = (target) => ({
  ...(CURRENT_OFFICIAL.includes(target)
    ? PA_CURRENT_OFFICIAL_REUSE_DESCRIPTOR : PA_CERTIFICATE_REUSE_DESCRIPTOR),
  documentRole: target.kind,
  documentPath: target.rel,
  documentSha256: target.expected,
  documentName: target.name
});

const digest = (file) => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");

async function attempt({
  root = ROOT,
  familyId = FAMILY,
  target = CANONICAL,
  descriptor = descriptorFor(target),
  scale = 2.5,
  currentPageCount = target.expectedPages
} = {}) {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), "rcap-pa-reuse-out-"));
  try {
    return await reuseOriginalPageEvidence({
      root, out, familyId, familyPath: FAMILY_PATH,
      target, descriptor, scale, currentPageCount
    });
  } finally {
    fs.rmSync(out, { recursive: true, force: true });
  }
}

function disposableCurrentEvidenceRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "rcap-pa-current-reuse-root-"));
  const files = [
    `${FAMILY}.verdict.json`,
    `${FAMILY}.ORIGINAL_EVIDENCE_VERIFIED.json`,
    `${FAMILY}.PAGE_IMAGES_SHA256.json`,
    `${FAMILY}/rule-490-petition-canonical/page-001.png`,
    `${FAMILY}/rule-790-order-boundary/page-001.png`,
    `${FAMILY}/rule-790-order-boundary/page-002.png`,
    `${FAMILY}/rule-790-petition-boundary/page-001.png`
  ];
  for (const relative of files) {
    const source = path.join(ROOT, CURRENT_ORIGINAL, relative);
    const destination = path.join(root, CURRENT_ORIGINAL, relative);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.copyFileSync(source, destination);
  }
  return root;
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

test("reuses the three exact unchanged official documents from the current receipt schema", async () => {
  let pages = 0;
  for (const target of CURRENT_OFFICIAL) {
    const result = await attempt({ target, descriptor: descriptorFor(target) });
    assert.equal(result.measurements.length, target.expectedPages);
    pages += result.measurements.length;
    assert.ok(result.measurements.every((page) => page.renderedInThisRun === false));
    assert.ok(result.measurements.every((page) => page.originalOrigin.workflowRunId === "34627159438"));
    assert.ok(result.measurements.every((page) => page.originalOrigin.artifactId === 10275441234));
    assert.ok(result.measurements.every((page) => page.originalOrigin.artifactZipSha256
      === "fa45d034a2f6eaf42895a8aaba16b68b2391f971a9a088efc6a4ac00cc559b69"));
    assert.ok(result.measurements.every((page) => page.originalOrigin.verifiedEvidencePath
      .endsWith("pa_6308_underage-set.ORIGINAL_EVIDENCE_VERIFIED.json")));
  }
  assert.equal(pages, 4);
});

test("production CLI reuses all five unchanged documents and six pages without a browser", () => {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), "rcap-pa-current-reuse-cli-"));
  try {
    execFileSync(process.execPath, [
      "scripts/rcap-raster-batch.mjs",
      "--manifest", `${FIX_EVIDENCE}/all-reuse-five-document-manifest.json`,
      "--family", FAMILY,
      "--commit", "2864db4f9e63e1ca936e8551eec221ee4aa807ef",
      "--scale", "2.5",
      "--run-id", "test-pa-five-document-reuse",
      "--out", out
    ], { cwd: ROOT, stdio: "pipe" });
    const verdict = JSON.parse(fs.readFileSync(path.join(out, `${FAMILY}.verdict.json`), "utf8"));
    assert.equal(verdict.verdict, "RASTER_PASS");
    assert.equal(verdict.browserExecutable, null);
    assert.equal(verdict.resolvedBy, "not-needed-all-pages-reused");
    assert.equal(verdict.coversTheWholeFamily, false);
    assert.equal(verdict.freshRenderedPages, 0);
    assert.equal(verdict.reusedPages, 6);
    assert.equal(verdict.freshRenderedDocuments.length, 0);
    assert.equal(verdict.reusedDocuments.length, 5);
    assert.equal(verdict.pagesMeasured, 6);
    assert.ok(verdict.documentsRendered.every((document) => document.renderedInThisRun === false));
  } finally {
    fs.rmSync(out, { recursive: true, force: true });
  }
});

test("fresh six-document manifest binds current bytes and plans only the changed Rule 490 order for rendering", async () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, FIX_EVIDENCE,
    "proposed-fresh-six-document-manifest.json"), "utf8"));
  const row = manifest.rows.find((item) => item.familyId === FAMILY);
  assert.ok(row);
  assert.equal(row.coverage.complete, true);
  assert.equal(row.documents.length, 6);
  const fresh = row.documents.filter((document) => !document.reuseOriginalPageEvidence);
  const reused = row.documents.filter((document) => document.reuseOriginalPageEvidence);
  assert.deepEqual(fresh.map((document) => document.name), ["rule-490-order-canonical.pdf"]);
  assert.equal(fresh[0].sha256, "39625c0e8b743019c6c080e33f5cff5485bd3559ab64b7d8ab896660b381aae6");
  assert.equal(fresh.reduce((count, document) => count + document.pageCount, 0), 2);
  assert.equal(reused.length, 5);
  assert.equal(reused.reduce((count, document) => count + document.pageCount, 0), 6);
  for (const document of row.documents) {
    const bytes = fs.readFileSync(path.join(ROOT, document.path));
    assert.equal(crypto.createHash("sha256").update(bytes).digest("hex"), document.sha256,
      `${document.name}: manifest must bind current bytes`);
    const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
    assert.equal(pdf.getPageCount(), document.pageCount,
      `${document.name}: manifest must bind the parsed page count`);
  }
  const calculated = crypto.createHash("sha256")
    .update(JSON.stringify(row.documents.map((document) => [document.role, document.path, document.sha256])))
    .digest("hex");
  assert.equal(row.documentsDigest, calculated);
});

test("participant handoff names the proposed-order entry without raw AcroForm identifiers", () => {
  const guide = fs.readFileSync(path.join(ROOT,
    "data/rcap-all50/overlays/census-v1/pa/pa-6308-underage-set--official-pdf-fill/participant-instructions.md"), "utf8");
  const handoff = guide.split("\n").find((line) => line.startsWith(
    "For the specific charges and applicable dispositions entry on each proposed order"));
  assert.ok(handoff, "human-readable proposed-order completion handoff is absent");
  assert.doesNotMatch(handoff, /SpecificCharges|Text15/);
  assert.match(handoff, /copy the charge from the charging document and its applicable disposition from the docket or clerk-certified disposition/i);
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

test("current official policy refuses changed Rule 490 order, unknown scope, identity drift, and scale drift", async () => {
  const changedRule490Order = {
    kind: "canonical",
    name: "rule-490-order-canonical.pdf",
    rel: "data/rcap-all50/overlays/census-v1/pa/pa-6308-underage-set--official-pdf-fill/fixtures/rule-490-order-canonical.pdf",
    expected: "39625c0e8b743019c6c080e33f5cff5485bd3559ab64b7d8ab896660b381aae6",
    expectedPages: 2
  };
  await assert.rejects(() => attempt({
    target: changedRule490Order,
    descriptor: { ...PA_CURRENT_OFFICIAL_REUSE_DESCRIPTOR,
      documentRole: changedRule490Order.kind, documentPath: changedRule490Order.rel,
      documentSha256: changedRule490Order.expected, documentName: changedRule490Order.name }
  }), /not allowlisted/);
  const unknownDocument = { ...RULE_490_PETITION, name: "unknown.pdf" };
  await assert.rejects(() => attempt({
    target: unknownDocument,
    descriptor: { ...PA_CURRENT_OFFICIAL_REUSE_DESCRIPTOR,
      documentRole: unknownDocument.kind, documentPath: unknownDocument.rel,
      documentSha256: unknownDocument.expected, documentName: unknownDocument.name }
  }), /not allowlisted/);
  await assert.rejects(() => attempt({
    familyId: "some-other-family", target: RULE_490_PETITION,
    descriptor: descriptorFor(RULE_490_PETITION)
  }), /closed to pa_6308_underage-set/);
  await assert.rejects(() => attempt({
    target: { ...RULE_490_PETITION, expected: "0".repeat(64) },
    descriptor: descriptorFor(RULE_490_PETITION)
  }), /current SHA-256 is not the allowlisted identity/);
  await assert.rejects(() => attempt({
    target: RULE_790_ORDER, descriptor: descriptorFor(RULE_790_ORDER), currentPageCount: 1
  }), /current PDF page count changed/);
  await assert.rejects(() => attempt({
    target: RULE_790_ORDER, descriptor: descriptorFor(RULE_790_ORDER), scale: 2
  }), /reuse scale differs/);
});

test("current official policy refuses changed proof bytes and missing or changed page images", async (t) => {
  const proofCases = [
    ["changed verdict", `${FAMILY}.verdict.json`, /original verdict SHA-256 changed/],
    ["changed receipt verification", `${FAMILY}.ORIGINAL_EVIDENCE_VERIFIED.json`, /original verified-evidence SHA-256 changed/],
    ["changed inventory", `${FAMILY}.PAGE_IMAGES_SHA256.json`, /original page inventory SHA-256 changed/],
  ];
  for (const [label, relative, message] of proofCases) {
    await t.test(label, async () => {
      const root = disposableCurrentEvidenceRoot();
      try {
        fs.appendFileSync(path.join(root, CURRENT_ORIGINAL, relative), " ");
        await assert.rejects(() => attempt({
          root, target: RULE_490_PETITION, descriptor: descriptorFor(RULE_490_PETITION)
        }), message);
      } finally {
        fs.rmSync(root, { recursive: true, force: true });
      }
    });
  }
  await t.test("changed page image", async () => {
    const root = disposableCurrentEvidenceRoot();
    try {
      fs.appendFileSync(path.join(root, CURRENT_ORIGINAL,
        `${FAMILY}/rule-490-petition-canonical/page-001.png`), Buffer.from([0]));
      await assert.rejects(() => attempt({
        root, target: RULE_490_PETITION, descriptor: descriptorFor(RULE_490_PETITION)
      }), /original PNG SHA-256 changed/);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
  await t.test("missing page image", async () => {
    const root = disposableCurrentEvidenceRoot();
    try {
      fs.unlinkSync(path.join(root, CURRENT_ORIGINAL,
        `${FAMILY}/rule-790-order-boundary/page-002.png`));
      await assert.rejects(() => attempt({
        root, target: RULE_790_ORDER, descriptor: descriptorFor(RULE_790_ORDER)
      }), /ENOENT/);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
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
