// Exercises the isolated render worker end to end against fakes.
//
// The worker is pure orchestration over injected ports, so every branch is
// reachable without a database, storage bucket or renderer. The checks that
// matter most are the ordering ones: nothing reaches the renderer before the
// input guard, and nothing reaches artifact_validated before bytes have been
// read back out of storage and validated.

import { register } from "node:module";
register("./lib/ts-esm-loader.mjs", import.meta.url);

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const worker = await import("../src/lib/rcap/render/worker.ts");
const { runRenderJobOnce, renderObjectPath, assertCreditEligible } = worker;

const checks = [];
function check(label, fn) {
  fn();
  checks.push(label);
}
async function acheck(label, fn) {
  await fn();
  checks.push(label);
}

const GOOD_SHA = "a".repeat(64);
const PDF = new TextEncoder().encode("%PDF-1.7\nbody");
const TXT = new TextEncoder().encode("plain text packet, not a PDF");

function baseJob(overrides = {}) {
  return {
    id: "job-1",
    packetId: "packet-1",
    routeId: "ms-expungement",
    rendererKind: "pdf_lib",
    sourceSha256: GOOD_SHA,
    profileId: "ms-petition",
    profileVersion: "1.0.0",
    inputHash: "b".repeat(64),
    status: "claimed",
    attemptCount: 1,
    outputStoragePath: null,
    outputSha256: null,
    normalizedOutputSha256: null,
    pageCount: null,
    errorCode: null,
    claimedBy: "w1",
    ...overrides
  };
}

const config = {
  workerId: "w1",
  rendererKinds: ["pdf_lib"],
  allowedSourceSha256: [GOOD_SHA],
  knownProfileVersions: { "ms-petition": ["1.0.0"] },
  storageBucket: "rcap-document-packets-private"
};

// Deterministic stand-in for a digest: content-derived, no crypto needed.
function fakeDigest(bytes) {
  let h = 0;
  for (const b of bytes) h = (h * 31 + b) >>> 0;
  return h.toString(16).padStart(64, "0").slice(0, 64);
}

function makeHarness({
  job = baseJob(),
  renderBytes = PDF,
  storedBytes = null,
  writeThrows = false,
  readThrows = false,
  renderThrows = false,
  pages = 3
} = {}) {
  const transitions = [];
  const written = new Map();
  let rendererCalled = 0;

  const ports = {
    queue: {
      async claim() {
        return job;
      },
      async transition(jobId, to, patch) {
        transitions.push({ to, patch: patch ?? null });
      }
    },
    storage: {
      async write(objectPath, bytes) {
        if (writeThrows) throw new Error("write failed");
        written.set(objectPath, bytes);
      },
      async read(objectPath) {
        if (readThrows) throw new Error("read failed");
        // storedBytes lets a test simulate storage returning something other
        // than what was written, which is exactly what a read-back must catch.
        return storedBytes ?? written.get(objectPath) ?? new Uint8Array();
      }
    },
    renderer: {
      async render() {
        rendererCalled += 1;
        if (renderThrows) throw new Error("render failed");
        return renderBytes;
      },
      countPages: () => pages
    },
    hash: {
      sha256: fakeDigest,
      normalizedSha256: (b) => fakeDigest(b).split("").reverse().join("")
    }
  };

  return {
    ports,
    transitions,
    written,
    rendererCalls: () => rendererCalled
  };
}

// ---------------------------------------------------------------------------

await acheck("an empty queue yields idle without touching the renderer", async () => {
  const h = makeHarness();
  h.ports.queue.claim = async () => null;
  const out = await runRenderJobOnce(config, h.ports);
  assert.equal(out.kind, "idle");
  assert.equal(h.rendererCalls(), 0);
  assert.equal(h.transitions.length, 0);
});

await acheck("the happy path ends at artifact_validated with output attached", async () => {
  const h = makeHarness();
  const out = await runRenderJobOnce(config, h.ports);
  assert.equal(out.kind, "validated", JSON.stringify(out));
  assert.equal(out.pageCount, 3);

  const order = h.transitions.map((t) => t.to);
  assert.deepEqual(order, ["rendering", "validating", "artifact_validated"]);

  const final = h.transitions.at(-1);
  assert.ok(final.patch.outputStoragePath.startsWith("rcap-document-packets-private/"));
  assert.equal(final.patch.outputSha256, fakeDigest(PDF));
  assert.equal(final.patch.pageCount, 3);
  assert.ok(final.patch.normalizedOutputSha256);
});

await acheck("an unwhitelisted source never reaches the renderer", async () => {
  const h = makeHarness({ job: baseJob({ sourceSha256: "f".repeat(64) }) });
  const out = await runRenderJobOnce(config, h.ports);
  assert.equal(out.kind, "failed");
  assert.equal(out.errorCode, "source_not_whitelisted");
  assert.equal(h.rendererCalls(), 0, "renderer ran on an unwhitelisted source");
  assert.equal(out.requeued, false, "an input-shaped failure must not requeue");
});

await acheck("an unknown profile version never reaches the renderer", async () => {
  const h = makeHarness({ job: baseJob({ profileVersion: "9.9.9" }) });
  const out = await runRenderJobOnce(config, h.ports);
  assert.equal(out.errorCode, "profile_unknown");
  assert.equal(h.rendererCalls(), 0);
});

await acheck("a renderer crash is a retryable failure", async () => {
  const h = makeHarness({ renderThrows: true });
  const out = await runRenderJobOnce(config, h.ports);
  assert.equal(out.errorCode, "render_failed");
  assert.equal(out.requeued, true);
  assert.deepEqual(
    h.transitions.map((t) => t.to),
    ["rendering", "failed", "queued"]
  );
});

await acheck("a storage write failure is recorded and retried", async () => {
  const h = makeHarness({ writeThrows: true });
  const out = await runRenderJobOnce(config, h.ports);
  assert.equal(out.errorCode, "storage_write_failed");
  assert.equal(out.requeued, true);
  assert.ok(!h.transitions.map((t) => t.to).includes("artifact_validated"));
});

await acheck("a read-back failure never reaches artifact_validated", async () => {
  const h = makeHarness({ readThrows: true });
  const out = await runRenderJobOnce(config, h.ports);
  assert.equal(out.errorCode, "storage_readback_failed");
  assert.ok(!h.transitions.map((t) => t.to).includes("artifact_validated"));
});

await acheck("validation reads storage, not the in-memory buffer", async () => {
  // Renderer produced a valid PDF, but storage returns different bytes. If the
  // worker validated its own buffer this would pass; it must not.
  const h = makeHarness({ renderBytes: PDF, storedBytes: new TextEncoder().encode("%PDF-1.7\nDIFFERENT") });
  const out = await runRenderJobOnce(config, h.ports);
  assert.equal(out.kind, "failed");
  assert.equal(out.errorCode, "checksum_mismatch");
  assert.ok(!h.transitions.map((t) => t.to).includes("artifact_validated"));
});

await acheck("a text/plain artifact is refused, not marked ready", async () => {
  // The current generate path produces exactly this and reports ready.
  const h = makeHarness({ renderBytes: TXT });
  const out = await runRenderJobOnce(config, h.ports);
  assert.equal(out.kind, "failed");
  assert.equal(out.errorCode, "invalid_pdf_output");
  assert.ok(!h.transitions.map((t) => t.to).includes("artifact_validated"));
});

await acheck("a page-count mismatch is terminal, not retried forever", async () => {
  const h = makeHarness({ pages: 2 });
  const out = await runRenderJobOnce({ ...config, expectedPageCounts: { "ms-petition": 5 } }, h.ports);
  assert.equal(out.errorCode, "page_count_mismatch");
  assert.equal(out.requeued, false);
});

check("the object path is derived only from server-held identifiers", () => {
  const p = renderObjectPath({ id: "job-1", packetId: "packet-1" });
  assert.equal(p, "packets/packet-1/job-1.pdf");
  // A crafted packet id cannot escape the prefix, because nothing else is
  // interpolated and the caller never supplies a name.
  assert.ok(!p.includes(".."));
});

check("the credit guard refuses an unvalidated job", () => {
  assert.throws(() => assertCreditEligible(baseJob({ status: "claimed" })));
  assert.throws(() =>
    assertCreditEligible(baseJob({ status: "artifact_validated", outputStoragePath: null }))
  );
  assert.doesNotThrow(() =>
    assertCreditEligible(
      baseJob({
        status: "artifact_validated",
        outputStoragePath: "bucket/packets/p/j.pdf",
        outputSha256: "c".repeat(64)
      })
    )
  );
});

// Comments are stripped before these scans. The worker's header deliberately
// names consume_rcap_packet_credit() to explain that credit lives elsewhere;
// documenting a boundary is not crossing it. The checks below are about code.
function workerCode() {
  return fs
    .readFileSync(path.join(rootDir, "src/lib/rcap/render/worker.ts"), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
}

check("the worker holds no credit-moving capability at all", () => {
  const source = workerCode();
  for (const forbidden of ["consume_rcap_packet_credit", "recordPartnerPacketGeneration", "screenings_used"]) {
    assert.ok(
      !source.includes(forbidden),
      `worker references credit movement (${forbidden}); credit must be a separate gated call`
    );
  }
});

check("the worker opens no network of its own", () => {
  const source = workerCode();
  for (const forbidden of ["fetch(", "node:http", "node:https", "axios", "WebSocket"]) {
    assert.ok(
      !source.includes(forbidden),
      `worker performs network access (${forbidden}); rendering must have no outbound network`
    );
  }
});

check("the worker imports only the contract module", () => {
  const source = fs.readFileSync(path.join(rootDir, "src/lib/rcap/render/worker.ts"), "utf8");
  const specifiers = [...source.matchAll(/from\s+"([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual([...new Set(specifiers)], ["./job-contract"]);
});

console.log("RCAP render worker verification passed.");
for (const label of checks) console.log(`  ok  ${label}`);
console.log(`\n${checks.length} checks passed.`);
