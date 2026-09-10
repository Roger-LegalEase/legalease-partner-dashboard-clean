#!/usr/bin/env node
/*
 * The four refusals, each broken on purpose.
 *
 * A gate nobody has tried to break is a gate nobody has tested. Each case here
 * runs the real script against a temporary queue and asserts it refuses, so a
 * later edit that softens a refusal fails here instead of certifying a packet
 * nobody rendered.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, readFileSync, cpSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const SCRIPT = "scripts/grade-a-packet-factory-24h/ingest-raster-receipt.mjs";
const QUEUE_REL = "data/rcap-grade-a/packet-factory-24h/RASTER_QUEUE.json";

const CANONICAL = "a".repeat(64);
const BOUNDARY = "b".repeat(64);
const DOCS = "c".repeat(64);

const baseRow = () => ({
  familyId: "test-family-set",
  canonicalPdfSha256: CANONICAL,
  boundaryPdfSha256: BOUNDARY,
  documentsDigest: DOCS,
  rasterState: "RASTER_PENDING",
  coverage: { complete: true, basis: "one assembled packet", rastered: ["canonical.pdf"], notRenderedByThisGate: ["boundary.pdf"] },
});

const basePayload = () => ({
  familyId: "test-family-set",
  verdict: "RASTER_PASS",
  packetCommitSha: "0".repeat(40),
  workflowRunId: "1234567890",
  hashesBound: { canonical: { pinned: CANONICAL }, boundary: { pinned: BOUNDARY } },
  documentsDigest: DOCS,
  documentsRendered: [{ document: "canonical.pdf" }, { document: "boundary.pdf" }],
  coversTheWholeFamily: true,
  pagesMeasured: 12,
  problems: [],
  environmentProblems: [],
});

/** Run the script in a scratch copy of the repo layout; return {code, stderr, queue}. */
const run = (payload, row = baseRow()) => {
  const dir = mkdtempSync(path.join(tmpdir(), "ingest-test-"));
  mkdirSync(path.join(dir, path.dirname(QUEUE_REL)), { recursive: true });
  mkdirSync(path.join(dir, "scripts/grade-a-packet-factory-24h"), { recursive: true });
  cpSync(SCRIPT, path.join(dir, SCRIPT));
  writeFileSync(path.join(dir, QUEUE_REL), JSON.stringify({ rows: [row] }, null, 2));
  const payloadPath = path.join(dir, "payload.json");
  writeFileSync(payloadPath, JSON.stringify(payload));
  try {
    execFileSync("node", [SCRIPT, "--payload", payloadPath, "--job-id", "99"],
      { cwd: dir, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    return { code: 0, stderr: "", queue: JSON.parse(readFileSync(path.join(dir, QUEUE_REL), "utf8")) };
  } catch (e) {
    return { code: e.status, stderr: String(e.stderr), queue: JSON.parse(readFileSync(path.join(dir, QUEUE_REL), "utf8")) };
  }
};

test("a clean payload writes the receipt and binds both digests", () => {
  const { code, queue } = run(basePayload());
  assert.equal(code, 0);
  const r = queue.rows[0].rasterReceipt;
  assert.equal(r.verdict, "RASTER_PASS");
  assert.equal(r.boundToCanonicalSha256, CANONICAL);
  assert.equal(r.boundToBoundarySha256, BOUNDARY);
  assert.equal(queue.rows[0].rasterState, "RASTER_PASS");
});

test("refusal 1: a verdict for another family is refused", () => {
  const p = basePayload(); p.familyId = "some-other-set";
  const { code, stderr, queue } = run(p);
  assert.equal(code, 1);
  assert.match(stderr, /no row for some-other-set/);
  assert.equal(queue.rows[0].rasterReceipt, undefined);
});

test("refusal 2: a canonical digest that is not the row's is refused, and nothing is written", () => {
  const p = basePayload(); p.hashesBound.canonical.pinned = "d".repeat(64);
  const { code, stderr, queue } = run(p);
  assert.equal(code, 1);
  assert.match(stderr, /bytes moved between the dispatch and this ingest/);
  assert.equal(queue.rows[0].rasterReceipt, undefined);
  assert.equal(queue.rows[0].rasterState, "RASTER_PENDING");
});

test("refusal 2b: a boundary digest that is not the row's is refused", () => {
  const p = basePayload(); p.hashesBound.boundary.pinned = "e".repeat(64);
  const { code, stderr } = run(p);
  assert.equal(code, 1);
  assert.match(stderr, /boundary digest is not the queued row's/);
});

test("refusal 3: a documentsDigest covering a different set is refused", () => {
  const p = basePayload(); p.documentsDigest = "f".repeat(64);
  const { code, stderr } = run(p);
  assert.equal(code, 1);
  assert.match(stderr, /different document set/);
});

test("refusal 4: a run reporting problems writes no receipt", () => {
  const p = basePayload(); p.problems = ["page 3 rendered blank"];
  const { code, stderr, queue } = run(p);
  assert.equal(code, 1);
  assert.match(stderr, /did not come back clean/);
  assert.equal(queue.rows[0].rasterReceipt, undefined);
});

test("refusal 4b: an environment problem is refused too, and never becomes a packet verdict", () => {
  const p = basePayload(); p.environmentProblems = ["no browser on the runner"];
  const { code, stderr } = run(p);
  assert.equal(code, 1);
  assert.match(stderr, /did not come back clean/);
});

test("a payload binding no canonical digest is refused", () => {
  const p = basePayload(); delete p.hashesBound.canonical;
  const { code, stderr } = run(p);
  assert.equal(code, 1);
  assert.match(stderr, /binds no canonical digest/);
});

test("a RASTER_FAIL is recorded, and is not recorded as a pass", () => {
  const p = basePayload(); p.verdict = "RASTER_FAIL";
  const { code, queue } = run(p);
  assert.equal(code, 0);
  assert.equal(queue.rows[0].rasterReceipt.verdict, "RASTER_FAIL");
  assert.equal(queue.rows[0].currentRasterState, "RASTER_FAIL");
});

test("the commit sha is stamped as a generation stamp, not as a byte binding", () => {
  const { queue } = run(basePayload());
  assert.match(queue.rows[0].rasterReceipt.packetCommitShaIsAGenerationStampNotAByteBinding,
    /What the receipt BINDS is the canonical and boundary digests/);
});
