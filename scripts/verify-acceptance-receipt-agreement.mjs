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

  const problems = [];
  let checked = 0;
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
      }
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
  console.log(`OK acceptance-receipt agreement — ${checked} copied receipt(s) agree with the queue row for their run.`);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
