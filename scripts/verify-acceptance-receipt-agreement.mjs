#!/usr/bin/env node
/**
 * Every record that names a raster run must agree with the queue row for that
 * run.
 *
 * ms-nonconv-set failed independent verification three times in a row on this
 * one thing, and each failure was the same shape: one record describing run
 * 34058277654 was corrected and another was not. VF04 found stale digests; VF12
 * found the product-wiring receipt claiming to cover the whole family; VF13
 * found the queue's own copy still carrying that claim after the product-wiring
 * copy was fixed; VF15 found the product-wiring copy wrong again after the queue
 * was fixed — this time with boundary.pdf in documentsNotCovered, the field
 * acceptance-identity.mjs fails a row on.
 *
 * Hand-maintained duplicates drift. The queue row is the measurement; a receipt
 * copied into a family record is a copy. This asserts the copy still matches,
 * so a fourth divergence is a failed check rather than a failed family.
 *
 * THE TWO COVERAGE QUESTIONS, which is what kept being conflated:
 *   documentsNotCovered       — a CANONICAL document the gate was asked for and
 *                               did not render. Non-empty is a hard failure.
 *   whatThisGateDidNotRender  — a declared fixture the gate never renders by
 *                               design, normally boundary.pdf. Non-empty is
 *                               ordinary and correct.
 *
 *
 * WHAT THIS STILL DOES NOT CATCH, measured rather than assumed. VF16 replayed
 * the first version against the real historical trees and found it caught two
 * of the four shapes. Receipt-to-row comparison now closes VF12's. VF04's is
 * still outside it: that family carried stale DIGESTS in records at a time when
 * no receipt existed anywhere to compare against, and a check that reads
 * receipts cannot see a family that has none. A family whose records name bytes
 * with no receipt at all remains something a reader must catch.
 *
 *   node scripts/verify-acceptance-receipt-agreement.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const QUEUE = "data/rcap-grade-a/packet-factory-24h/RASTER_QUEUE.json";
const MASTER = "data/rcap-grade-a/packet-factory-24h/MASTER_QUEUE.json";
/* Fields a copy must reproduce exactly when it names the same run. Narrow on
 * purpose: a family record may add its own prose, and this is not a demand that
 * the two records be identical — only that they not contradict each other about
 * what the gate did. */
const COMPARED = [
  "documentsCovered",
  "documentsNotCovered",
  "whatThisGateDidNotRender",
  "coversTheWholeFamily",
  "boundToCanonicalSha256",
  "boundToBoundarySha256",
  "renderedCommitSha",
];

export function compareReceipt(copy, queueReceipt) {
  const disagreements = [];
  for (const key of COMPARED) {
    if (copy[key] === undefined) continue; // a copy need not restate everything
    const a = JSON.stringify(copy[key]);
    const b = JSON.stringify(queueReceipt[key]);
    if (a !== b) disagreements.push({ field: key, record: copy[key], queue: queueReceipt[key] });
  }
  return disagreements;
}

/**
 * Agreement is not enough, and a reader proved it.
 *
 * VF16 replayed the first version of this check against the real historical
 * trees and found it catches two of the four shapes that actually reached a
 * verifier. It missed VF12's because the copy and the queue carried the SAME
 * overclaim and therefore agreed with each other — two records can be
 * consistent and both wrong. It compared receipt to receipt and never receipt
 * to the measurement.
 *
 * So a receipt is also checked against the ROW's own coverage, which is the
 * measurement rather than a copy of one:
 *   documentsNotCovered      must equal the row's notRastered — canonical
 *                            documents the gate was asked for and did not
 *                            render. Non-empty is a hard failure downstream.
 *   whatThisGateDidNotRender must equal the row's notRenderedByThisGate —
 *                            fixtures the gate never renders by design.
 *   documentsCovered         must equal the row's rastered.
 *   coversTheWholeFamily     must equal the row's complete.
 * A row that never measured its own edge (frozen history, no
 * notRenderedByThisGate key) cannot answer the second question, so it is not
 * asked it rather than being assumed empty.
 */
export function compareReceiptToRow(receipt, coverage) {
  const problems = [];
  if (!receipt || !coverage) return problems;
  const eq = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
  const check = (field, actual, expected, why) => {
    if (actual === undefined) return;
    if (!eq(actual, expected)) problems.push({ field, receipt: actual, row: expected, why });
  };
  check("documentsCovered", receipt.documentsCovered, coverage.rastered ?? null,
    "the receipt names different rendered documents than the row measured");
  check("documentsNotCovered", receipt.documentsNotCovered, coverage.notRastered ?? null,
    "documentsNotCovered means a CANONICAL document the gate was asked for and did not render; the row measures that as notRastered");
  check("coversTheWholeFamily", receipt.coversTheWholeFamily, coverage.complete ?? null,
    "the receipt and the row disagree about whether every canonical document was rendered");
  if (Object.hasOwn(coverage, "notRenderedByThisGate")) {
    check("whatThisGateDidNotRender", receipt.whatThisGateDidNotRender, coverage.notRenderedByThisGate,
      "whatThisGateDidNotRender means a declared fixture the gate never renders by design; the row measures that as notRenderedByThisGate");
  }
  return problems;
}

/** Walk a JSON document for any object that looks like a raster receipt. */
export function findReceipts(node, at = "") {
  const found = [];
  if (!node || typeof node !== "object") return found;
  if (Array.isArray(node)) {
    node.forEach((v, i) => found.push(...findReceipts(v, `${at}[${i}]`)));
    return found;
  }
  if (node.workflowRunId && (node.verdict === "RASTER_PASS" || node.jobId)) found.push({ at, receipt: node });
  for (const [k, v] of Object.entries(node)) found.push(...findReceipts(v, `${at}.${k}`));
  return found;
}

function main() {
  const queue = JSON.parse(fs.readFileSync(path.join(ROOT, QUEUE), "utf8"));
  const byFamily = new Map();
  for (const row of [...(queue.rows ?? []), ...(queue.historicalRasterRows ?? [])]) {
    if (row.rasterReceipt) byFamily.set(row.familyId, row.rasterReceipt);
  }
  const master = JSON.parse(fs.readFileSync(path.join(ROOT, MASTER), "utf8"));

  /* Coverage as the ROW measured it, which is what a receipt is checked
   * against. Separate from byFamily because a row can carry coverage without
   * carrying a receipt. */
  const coverageByFamily = new Map();
  for (const row of [...(queue.rows ?? []), ...(queue.historicalRasterRows ?? [])]) {
    if (row.coverage) coverageByFamily.set(row.familyId, row.coverage);
  }

  const problems = [];
  let checked = 0;
  let rowChecked = 0;

  /* THE THIRD FILE CLASS. VF16 found the fulfillment-authority registry copies
   * receipts that nothing asserted. It is not under a family directory, so the
   * per-family walk below never reaches it. */
  const AUTHORITY = "data/rcap-grade-a/fulfillment-authority-registry.json";
  const authorityPath = path.join(ROOT, AUTHORITY);
  if (fs.existsSync(authorityPath)) {
    let doc;
    try { doc = JSON.parse(fs.readFileSync(authorityPath, "utf8")); } catch { doc = null; }
    for (const { at, receipt } of doc ? findReceipts(doc) : []) {
      if (/superseded/i.test(at)) continue;
      const famId = [...byFamily.keys()].find((id) => at.includes(id))
        ?? String(receipt.familyId ?? receipt.packetFamilyId ?? "");
      const queueReceipt = byFamily.get(famId);
      if (!queueReceipt) continue; // nothing to compare against; the per-family walk owns absence
      if (String(receipt.workflowRunId ?? receipt.runId) !== String(queueReceipt.workflowRunId)) {
        problems.push(`${AUTHORITY}${at}: names run ${receipt.workflowRunId ?? receipt.runId}; the queue's current receipt is run ${queueReceipt.workflowRunId}`);
        continue;
      }
      checked += 1;
      for (const d of compareReceipt(receipt, queueReceipt)) {
        problems.push(`${AUTHORITY}${at}: ${d.field} is ${JSON.stringify(d.record)} here and ${JSON.stringify(d.queue)} in the queue`);
      }
    }
  }

  for (const f of master.families) {
    if (!f.directory) continue;
    const queueReceipt = byFamily.get(f.familyId);
    for (const name of ["product-wiring.json", "approval-request.json"]) {
      const p = path.join(ROOT, f.directory, name);
      if (!fs.existsSync(p)) continue;
      let doc;
      try { doc = JSON.parse(fs.readFileSync(p, "utf8")); } catch { continue; }
      for (const { at, receipt } of findReceipts(doc)) {
        /* A receipt explicitly kept as history is not asked to match the
         * current row — that is what retaining it means. */
        if (/superseded/i.test(at)) continue;
        if (!queueReceipt) {
          problems.push(`${f.familyId} ${name}${at}: names run ${receipt.workflowRunId} but the queue holds no receipt for this family`);
          continue;
        }
        if (String(receipt.workflowRunId) !== String(queueReceipt.workflowRunId)) {
          problems.push(`${f.familyId} ${name}${at}: names run ${receipt.workflowRunId}; the queue's current receipt is run ${queueReceipt.workflowRunId}`);
          continue;
        }
        checked += 1;
        for (const d of compareReceipt(receipt, queueReceipt)) {
          problems.push(`${f.familyId} ${name}${at}: ${d.field} is ${JSON.stringify(d.record)} here and ${JSON.stringify(d.queue)} in the queue`);
        }
        /* Agreement with the other copy is not enough: both can be wrong
         * together, which is exactly how VF12's shape survived. */
        const coverage = coverageByFamily.get(f.familyId);
        if (coverage) {
          rowChecked += 1;
          for (const p of compareReceiptToRow(receipt, coverage)) {
            problems.push(`${f.familyId} ${name}${at}: ${p.field} is ${JSON.stringify(p.receipt)} but the row measured ${JSON.stringify(p.row)} — ${p.why}`);
          }
        }
      }
    }
  }

  /* And the queue's own receipt against its own row. The generator emitted the
   * conflation once; a copy agreeing with a wrong original is not agreement
   * with the measurement. */
  for (const row of [...(queue.rows ?? []), ...(queue.historicalRasterRows ?? [])]) {
    if (!row.rasterReceipt || !row.coverage) continue;
    rowChecked += 1;
    for (const p of compareReceiptToRow(row.rasterReceipt, row.coverage)) {
      problems.push(`${row.familyId} RASTER_QUEUE.rasterReceipt: ${p.field} is ${JSON.stringify(p.receipt)} but the same row measured ${JSON.stringify(p.row)} — ${p.why}`);
    }
  }

  if (problems.length) {
    console.error(`REFUSED — ${problems.length} record(s) disagree with the queue about a raster run:`);
    for (const p of problems) console.error(`  ${p}`);
    console.error("\nThe queue row is the measurement; a receipt copied into a family record is a copy.");
    console.error("documentsNotCovered means a CANONICAL document the gate missed and is a hard failure;");
    console.error("whatThisGateDidNotRender means a fixture it never renders by design and is ordinary.");
    process.exit(1);
  }
  console.log(`OK acceptance-receipt agreement — ${checked} copied receipt(s) agree with the queue row for their run, and ${rowChecked} receipt(s) agree with the coverage their row measured.`);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
