#!/usr/bin/env node
//
// Captain-only: what would integrating the discovered completions look like?
//
// Plan mode is the default and changes nothing. `--apply --captain-ack` adopts
// the exact worker blobs for each integrable step and leaves them staged for a
// captain commit; it does not commit, does not push, does not touch a worker
// branch and never forces anything.

import path from "node:path";

import { loadFactoryPlan } from "./lib/rcap-factory/index.mjs";
import {
  applyIntegrationStep,
  assertCleanIntegrationBranch,
  discoverCompletions,
  planIntegrations,
  readWaveManifest
} from "./lib/rcap-factory/completion-discovery.mjs";

const args = process.argv.slice(2).filter((arg) => arg !== "--");

try {
  const options = parseArgs(args);
  if (options.apply && !options.captainAcknowledged) {
    throw new Error(
      "--apply requires --captain-ack; only the integration captain adopts worker blobs onto the integration branch"
    );
  }
  const rootDir = path.resolve(options.rootDir ?? process.cwd());
  const plan = await loadFactoryPlan({ rootDir, root: rootDir });
  const discovery = discoverCompletions(plan, {
    rootDir,
    jobIds: options.jobIds,
    remote: options.remote,
    fetch: !options.noFetch
  });
  const waveManifest = options.waveManifest
    ? readWaveManifest(rootDir, options.waveManifest)
    : null;
  const integration = planIntegrations(discovery, {
    jobIds: options.jobIds,
    waveManifest,
    activeWorkerJobIds: options.activeJobIds
  });

  if (!options.apply) {
    if (options.json) {
      process.stdout.write(`${JSON.stringify(integration, null, 2)}\n`);
    } else {
      printPlan(integration);
      console.log("Plan mode made no filesystem, index, branch or registry change.");
    }
    process.exit(0);
  }

  if (!discovery.fetch.fetched) {
    throw new Error(
      `refusing to apply against unfetched refs: ${discovery.fetch.detail}`
    );
  }
  // Once, before the first adoption: after that the tree is dirty by design.
  assertCleanIntegrationBranch({ rootDir });
  const applied = [];
  for (const step of integration.steps) {
    if (step.disposition !== "integrate") continue;
    applied.push(applyIntegrationStep(step, { rootDir }));
    console.log(
      `adopted ${step.jobId} from ${step.branch} ${step.commit.slice(0, 12)}: ${applied.at(-1).appliedPaths.join(", ")}`
    );
  }
  console.log(
    `${applied.length} completion(s) staged. Nothing was committed, pushed, rewritten or forced.`
  );
  console.log("Review `git diff --cached`, then make one atomic captain commit.");
} catch (error) {
  console.error(`RCAP captain integration planning failed: ${error.message}`);
  process.exitCode = 1;
}

function printPlan(integration) {
  console.log(`RCAP captain integration plan against ${integration.baseCommit}`);
  for (const [disposition, count] of Object.entries(integration.totals)) {
    if (count > 0) console.log(`  ${disposition}: ${count}`);
  }
  for (const step of integration.steps) {
    console.log(
      `  ${step.disposition.padEnd(22)} ${step.jobId} ${step.branch ?? "-"} ${
        step.commit ? step.commit.slice(0, 12) : ""
      }`
    );
    if (step.reason) console.log(`      ${step.reason}`);
  }
  if (integration.independentJobIds.length > 0) {
    console.log(
      `  independent (no shared owned path): ${integration.independentJobIds.join(", ")}`
    );
  }
}

function parseArgs(argv) {
  const parsed = {
    jobIds: [],
    activeJobIds: [],
    waveManifest: null,
    remote: "origin",
    rootDir: null,
    json: false,
    noFetch: false,
    apply: false,
    captainAcknowledged: false
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--json") parsed.json = true;
    else if (arg === "--no-fetch") parsed.noFetch = true;
    else if (arg === "--apply") parsed.apply = true;
    else if (arg === "--plan" || arg === "--dry-run") parsed.apply = false;
    else if (arg === "--captain-ack") parsed.captainAcknowledged = true;
    else if (arg === "--remote") parsed.remote = requireValue(argv, ++index, arg);
    else if (arg === "--root") parsed.rootDir = requireValue(argv, ++index, arg);
    else if (arg === "--job") parsed.jobIds.push(requireValue(argv, ++index, arg));
    else if (arg === "--active-job") {
      parsed.activeJobIds.push(requireValue(argv, ++index, arg));
    } else if (arg === "--wave-manifest") {
      parsed.waveManifest = requireValue(argv, ++index, arg);
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
