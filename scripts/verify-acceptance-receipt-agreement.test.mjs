#!/usr/bin/env node
// Regression tests for the acceptance-receipt agreement check.
//
// Each case is a shape that actually reached an independent verifier on
// ms-nonconv-set and failed the family. The check exists so the next one is a
// failed check instead.
//
//   node --test scripts/verify-acceptance-receipt-agreement.test.mjs
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { compareReceipt, compareReceiptToRow, findReceipts } from "./verify-acceptance-receipt-agreement.mjs";

const VERIFIER = path.join(path.dirname(fileURLToPath(import.meta.url)), "verify-acceptance-receipt-agreement.mjs");

/* The queue row's receipt for run 34058277654, in its corrected shape. */
const queue = {
  verdict: "RASTER_PASS",
  workflowRunId: "34058277654",
  jobId: "101554484258",
  renderedCommitSha: "2495d6d9b595a53c4e3cdf3cbeebea94b891d151",
  boundToCanonicalSha256: "732e7f47cff8659b30712c3fc0e886c9ac141052955d1aefbb7f3008aa63f845",
  boundToBoundarySha256: "87e4bf90460e42f74dc220b31c23e90ce16206c43a2ee5d6cc78fd71ac583d58",
  documentsCovered: ["canonical.pdf"],
  documentsNotCovered: [],
  whatThisGateDidNotRender: ["boundary.pdf"],
  coversTheWholeFamily: true,
};
const copyOf = (over = {}) => ({ ...queue, ...over });

test("an agreeing copy passes", () => {
  assert.deepEqual(compareReceipt(copyOf(), queue), []);
});

test("a copy that restates only part of the receipt still passes", () => {
  const partial = { workflowRunId: queue.workflowRunId, jobId: queue.jobId, documentsCovered: ["canonical.pdf"] };
  assert.deepEqual(compareReceipt(partial, queue), []);
});

test("VF12's shape is caught: claiming to cover the whole family while excluding nothing", () => {
  /* The pre-8bb1b82f0 block: documentsNotCovered [] beside a boundary digest,
   * with nothing recording that the gate never rendered it. */
  const bad = copyOf({ documentsNotCovered: [], whatThisGateDidNotRender: [] });
  const d = compareReceipt(bad, queue);
  assert.equal(d.length, 1);
  assert.equal(d[0].field, "whatThisGateDidNotRender");
});

test("VF15's shape is caught: a by-design exclusion put in the hard-failure field", () => {
  /* The post-8bb1b82f0 block: boundary.pdf in documentsNotCovered, which
   * acceptance-identity.mjs fails a row on, and absent from the field where a
   * by-design exclusion belongs. */
  const bad = { ...queue, documentsNotCovered: ["boundary.pdf"] };
  delete bad.whatThisGateDidNotRender;
  const d = compareReceipt(bad, queue);
  assert.equal(d.length, 1);
  assert.equal(d[0].field, "documentsNotCovered");
  assert.deepEqual(d[0].record, ["boundary.pdf"]);
  assert.deepEqual(d[0].queue, []);
});

test("VF04's shape is caught: a copy pinned to bytes the queue no longer names", () => {
  const bad = copyOf({ boundToCanonicalSha256: "0441d16c75b90f5e1d199a0f32e28433a5db1e7fe6af3e381db016f31520f5dc" });
  const d = compareReceipt(bad, queue);
  assert.equal(d.length, 1);
  assert.equal(d[0].field, "boundToCanonicalSha256");
});

test("several disagreements are all reported, not just the first", () => {
  const bad = copyOf({ documentsNotCovered: ["boundary.pdf"], coversTheWholeFamily: false, renderedCommitSha: "0".repeat(40) });
  const fields = compareReceipt(bad, queue).map((x) => x.field).sort();
  assert.deepEqual(fields, ["coversTheWholeFamily", "documentsNotCovered", "renderedCommitSha"]);
});

test("findReceipts reaches a receipt nested under a hand-authored block", () => {
  const doc = { censusV1Representation: { acceptanceReceipt: copyOf() } };
  const found = findReceipts(doc);
  assert.equal(found.length, 1);
  assert.equal(found[0].at, ".censusV1Representation.acceptanceReceipt");
});

test("findReceipts finds every receipt, including retained history", () => {
  /* The walker does not filter; the caller skips paths naming superseded, so
   * the walker must still surface them or that decision cannot be made. */
  const doc = { acceptanceReceipt: copyOf(), supersededReceipts: [copyOf({ workflowRunId: "33973869055" })] };
  assert.equal(findReceipts(doc).length, 2);
});


/* ---- what VF16 proved the first version missed -------------------------- */

/* The row's own measurement for this family: one canonical document rendered,
 * nothing canonical missed, boundary never rendered by design. */
const rowCoverage = {
  documents: ["canonical.pdf"],
  rastered: ["canonical.pdf"],
  notRastered: [],
  notRenderedByThisGate: ["boundary.pdf"],
  complete: true,
};

test("VF12's shape is caught against the ROW even though the two copies agreed", () => {
  /* Both the queue receipt and the family's copy carried coversTheWholeFamily
   * true with nothing excluded. compareReceipt sees no disagreement — they are
   * identical — and that is exactly why receipt-to-receipt was not enough. */
  const bothWrong = copyOf({ documentsNotCovered: [], whatThisGateDidNotRender: [] });
  assert.deepEqual(compareReceipt(bothWrong, bothWrong), [], "the two copies agree, which is the trap");
  const vsRow = compareReceiptToRow(bothWrong, rowCoverage);
  assert.equal(vsRow.length, 1);
  assert.equal(vsRow[0].field, "whatThisGateDidNotRender");
  assert.deepEqual(vsRow[0].row, ["boundary.pdf"]);
});

test("VF15's shape is caught against the row too, in the other direction", () => {
  const bad = copyOf({ documentsNotCovered: ["boundary.pdf"], whatThisGateDidNotRender: [] });
  const fields = compareReceiptToRow(bad, rowCoverage).map((p) => p.field).sort();
  assert.deepEqual(fields, ["documentsNotCovered", "whatThisGateDidNotRender"]);
});

test("a receipt that matches the row's measurement passes", () => {
  assert.deepEqual(compareReceiptToRow(copyOf(), rowCoverage), []);
});

test("a canonical document the gate actually missed is caught", () => {
  /* The one case where a non-empty documentsNotCovered is TRUE: the row itself
   * measured a canonical document as unrendered. The receipt must say so. */
  const missed = { ...rowCoverage, rastered: [], notRastered: ["canonical.pdf"], complete: false };
  const silent = copyOf({ documentsCovered: ["canonical.pdf"], documentsNotCovered: [], coversTheWholeFamily: true });
  const fields = compareReceiptToRow(silent, missed).map((p) => p.field).sort();
  assert.deepEqual(fields, ["coversTheWholeFamily", "documentsCovered", "documentsNotCovered"]);
});

test("a row that never measured its edge is not asked about it", () => {
  /* Frozen history has no notRenderedByThisGate key. Demanding one would assert
   * a measurement that row never made — the same overclaim in a new place. */
  const frozen = { documents: ["canonical.pdf"], rastered: ["canonical.pdf"], notRastered: [], complete: true };
  assert.deepEqual(compareReceiptToRow(copyOf(), frozen), []);
});

test("a partial copy is still only asked about what it states", () => {
  assert.deepEqual(compareReceiptToRow({ documentsCovered: ["canonical.pdf"] }, rowCoverage), []);
});

test("the row comparison is reached from the checker, not only exported", () => {
  const source = fs.readFileSync(VERIFIER, "utf8");
  assert.match(source, /compareReceiptToRow\(receipt, coverage\)/, "the per-family walk no longer checks receipts against the row");
  assert.match(source, /RASTER_QUEUE\.rasterReceipt/, "the queue's own receipt is no longer checked against its own row");
  assert.match(source, /fulfillment-authority-registry/, "the third file class VF16 found is no longer walked");
});
