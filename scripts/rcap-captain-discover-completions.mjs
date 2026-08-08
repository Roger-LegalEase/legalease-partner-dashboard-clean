#!/usr/bin/env node
//
// Captain-only: which selected jobs already have a worker completion?
//
// Run this before commissioning anything. It fetches every rcap-factory ref
// with a wildcard first, so "no branch" means no branch rather than no fetch,
// and it verifies each candidate against the assignment rather than against its
// name. It reads; it never writes to a worker branch.

import path from "node:path";

import { loadFactoryPlan } from "./lib/rcap-factory/index.mjs";
import {
  COMPLETION_CLASSIFICATIONS,
  discoverCompletions
} from "./lib/rcap-factory/completion-discovery.mjs";

const args = process.argv.slice(2).filter((arg) => arg !== "--");

try {
  const options = parseArgs(args);
  const rootDir = path.resolve(options.rootDir ?? process.cwd());
  const plan = await loadFactoryPlan({ rootDir, root: rootDir });
  const report = discoverCompletions(plan, {
    rootDir,
    jobIds: options.jobIds,
    ...(options.statuses ? { statuses: options.statuses } : {}),
    remote: options.remote,
    fetch: !options.noFetch
  });

  if (options.json) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } else {
    printReport(report);
  }
  if (!report.fetch.fetched && !options.noFetch) process.exitCode = 1;
} catch (error) {
  console.error(`RCAP captain completion discovery failed: ${error.message}`);
  process.exitCode = 1;
}

function printReport(report) {
  console.log(
    `RCAP captain completion discovery: ${report.jobs.length} job(s), ${report.remoteFactoryBranches} factory branch(es) fetched`
  );
  if (!report.fetch.fetched) {
    console.error(
      `  REFS NOT FETCHED: ${report.fetch.detail}. Every "no_branch" below is unproven.`
    );
  }
  for (const classification of COMPLETION_CLASSIFICATIONS) {
    const count = report.totals[classification] ?? 0;
    if (count > 0) console.log(`  ${classification}: ${count}`);
  }
  for (const job of report.jobs) {
    if (job.classification === "no_branch") continue;
    console.log(
      `  ${job.classification.padEnd(24)} ${job.jobId} -> ${job.completionBranch ?? "-"} ${
        job.completionCommit ? job.completionCommit.slice(0, 12) : ""
      }`
    );
    for (const branch of job.branches) {
      for (const failure of branch.failures) {
        console.log(`      [${branch.branch}] ${failure.code}: ${failure.message}`);
      }
    }
  }
  const missing = report.jobs.filter((job) => job.classification === "no_branch");
  if (missing.length > 0) {
    console.log(`  no_branch: ${missing.map((job) => job.jobId).join(", ")}`);
  }
}

function parseArgs(argv) {
  const parsed = {
    jobIds: [],
    statuses: null,
    remote: "origin",
    rootDir: null,
    json: false,
    noFetch: false
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--json") parsed.json = true;
    else if (arg === "--no-fetch") parsed.noFetch = true;
    else if (arg === "--remote") parsed.remote = requireValue(argv, ++index, arg);
    else if (arg === "--root") parsed.rootDir = requireValue(argv, ++index, arg);
    else if (arg === "--job") parsed.jobIds.push(requireValue(argv, ++index, arg));
    else if (arg === "--status") {
      parsed.statuses = (parsed.statuses ?? []).concat(
        requireValue(argv, ++index, arg)
      );
    } else if (arg.startsWith("--")) throw new Error(`Unknown option: ${arg}`);
    else parsed.jobIds.push(arg);
  }
  return parsed;
}

function requireValue(argv, index, option) {
  const value = argv[index];
  if (!value || value.startsWith("--")) throw new Error(`${option} requires a value`);
  return value;
}
