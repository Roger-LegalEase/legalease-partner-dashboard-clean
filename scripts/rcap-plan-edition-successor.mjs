#!/usr/bin/env node
//
// Captain-only: plan the next incremental Master Library successor edition.
//
// Generates a candidate tranche and a named backlog. It publishes nothing,
// writes no archive, does not touch the adopted edition and does not enable
// runtime. Run with --write to update the tracked plan; without it the command
// verifies the tracked plan is current and fails if it is stale.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  EDITION_SUCCESSOR_PLAN_PATH,
  buildEditionSuccessorPlan,
  validateEditionSuccessorPlan
} from "./lib/rcap-factory/edition-successor.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const write = process.argv.includes("--write");
const json = process.argv.includes("--json");
const unsupported = process.argv
  .slice(2)
  .filter((argument) => !["--write", "--json"].includes(argument));
if (unsupported.length > 0) {
  console.error(`Unsupported arguments: ${unsupported.join(", ")}`);
  process.exit(2);
}

try {
  const plan = buildEditionSuccessorPlan(ROOT);
  const issues = validateEditionSuccessorPlan(plan);
  if (issues.length > 0) {
    throw new Error(`edition successor plan is invalid:\n- ${issues.join("\n- ")}`);
  }
  const serialized = `${JSON.stringify(plan, null, 2)}\n`;
  const absolute = path.join(ROOT, EDITION_SUCCESSOR_PLAN_PATH);
  if (write) {
    fs.mkdirSync(path.dirname(absolute), { recursive: true });
    fs.writeFileSync(absolute, serialized);
  } else {
    if (!fs.existsSync(absolute)) {
      throw new Error(`${EDITION_SUCCESSOR_PLAN_PATH} is missing; run with --write.`);
    }
    if (fs.readFileSync(absolute, "utf8") !== serialized) {
      throw new Error(`${EDITION_SUCCESSOR_PLAN_PATH} is stale; run with --write.`);
    }
  }

  if (json) {
    process.stdout.write(serialized);
  } else {
    console.log(
      `Master Library successor-edition plan ${write ? "written" : "verified"}: ${EDITION_SUCCESSOR_PLAN_PATH}`
    );
    console.log(
      `  candidate tranche ${plan.candidateTranche.trancheId}: ${plan.totals.admitted} row(s) — ` +
        `${plan.totals.admittedNewBytes} carrying new bytes, ${plan.totals.admittedMetadataCorrections} metadata corrections`
    );
    for (const row of plan.candidateTranche.rows) {
      console.log(
        `    ${row.jurisdiction ?? "--"} ${row.kind.padEnd(20)} ${row.jobId}`
      );
    }
    console.log(`  deferred to the next successor: ${plan.totals.deferred}`);
    for (const entry of plan.successorBacklog) {
      console.log(
        `    ${entry.jurisdiction ?? "--"} ${entry.jobId}: ${entry.unmetCriteria.join(", ")}`
      );
    }
    console.log(`  tranche manifest sha256: ${plan.trancheManifestSha256}`);
    console.log(`  first tranche owner: ${plan.firstTrancheJobId}`);
    if (!plan.lineage.grandparentArchiveRetained) {
      console.log(
        `  LINEAGE INCOMPLETE: parent edition ${plan.lineage.parentEdition}'s own parent archive is absent at ${plan.lineage.grandparentArchivePath}`
      );
    }
    console.log(
      "  Nothing was published. No edition was mutated, no archive was written, runtime stays disabled."
    );
  }
} catch (error) {
  console.error(`RCAP edition successor planning failed: ${error.message}`);
  process.exitCode = 1;
}
