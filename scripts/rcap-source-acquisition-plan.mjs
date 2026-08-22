#!/usr/bin/env node
// Builds the acquisition matrix: one leg per distinct official source.
//
//   INCLUDE_PROBES=true node scripts/rcap-source-acquisition-plan.mjs
//
// Writes `matrix` and `count` to GITHUB_OUTPUT when present, and prints the
// plan either way so a human can read what will be fetched.
//
// Fails, rather than choosing a winner, when records that share one source key
// disagree about which document that source is.
import fs from "node:fs";
import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { planAcquisitionLegs } from "./rcap-source-acquisition/plan.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const QUEUE = path.join(rootDir, "data/rcap-all50/source-acquisition-queue.json");

const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");

const queue = JSON.parse(fs.readFileSync(QUEUE, "utf8"));
const entries = [...queue.matrix];
if (process.env.INCLUDE_PROBES === "true") entries.push(...queue.probeMatrix);

const { legs, conflicts, coverage } = planAcquisitionLegs(entries, sha256);

if (conflicts.length > 0) {
  console.error("FAIL source-identity conflict — records sharing one source key describe different documents:\n");
  for (const c of conflicts) {
    console.error(`  ${c.sourceKey}`);
    console.error(`    ${c.fact}: ${c.values.map((v) => JSON.stringify(v)).join(" vs ")}`);
    console.error(`    assets: ${c.assetIds.filter(Boolean).join(", ") || "(none recorded)"}`);
  }
  console.error("\nResolve the disagreement in the queue. Do not group records that do not agree.");
  process.exit(1);
}

if (!coverage.everyEntryCoveredExactlyOnce) {
  console.error(
    `FAIL coverage — ${coverage.coveredEntries} covered slots for ${coverage.originalEntries} queue entries; every entry must be covered exactly once`
  );
  process.exit(1);
}
if (!coverage.receiptSlugsAreUnique) {
  console.error("FAIL two acquisition legs share a receipt slug; their receipts would overwrite each other");
  process.exit(1);
}

// GitHub caps a matrix at 256 legs. Truncating silently would read as full
// coverage, so it is refused instead.
if (legs.length > 256) {
  console.error(`FAIL the plan has ${legs.length} legs and a matrix holds 256`);
  process.exit(1);
}

if (process.env.GITHUB_OUTPUT) {
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `matrix=${JSON.stringify({ entry: legs })}\n`);
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `count=${legs.length}\n`);
}

console.log(
  `${coverage.originalEntries} queue entries collapse to ${coverage.uniqueSourceLegs} unique-source acquisition leg(s); every entry covered exactly once.`
);
const grouped = legs.filter((l) => l.coveredQueueEntryCount > 1);
if (grouped.length > 0) {
  console.log(`\n${grouped.length} source(s) answer for more than one queue entry:`);
  for (const l of grouped) {
    console.log(`  ${l.jurisdiction} ${l.formNumber} — ${l.coveredQueueEntryCount} entries → ${l.receiptSlug}`);
  }
}
console.log("");
for (const l of legs) {
  console.log(`  ${l.jurisdiction} ${l.formNumber} [${l.urlKind ?? "-"}] ${l.canonicalUrl}`);
}
