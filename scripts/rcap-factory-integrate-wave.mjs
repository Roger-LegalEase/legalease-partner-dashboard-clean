#!/usr/bin/env node

import path from "node:path";

import { loadFactoryPlan } from "./lib/rcap-factory/index.mjs";
import { integrateWave } from "./lib/rcap-factory/wave-integration.mjs";

const args = process.argv.slice(2).filter((arg) => arg !== "--");

try {
  const options = parseArgs(args);
  if (!options.waveId) {
    throw new Error(
      "Usage: node scripts/rcap-factory-integrate-wave.mjs <waveId> [--dry-run] [--execute --captain-ack] [--json]"
    );
  }
  if (options.execute && !options.captainAcknowledged) {
    throw new Error(
      "--execute requires --captain-ack; only the integration captain may cherry-pick jobs, regenerate global outputs, and run full gates"
    );
  }
  const rootDir = path.resolve(options.rootDir ?? process.cwd());
  const plan = await loadFactoryPlan({ rootDir, root: rootDir });
  const result = await integrateWave(plan, options.waveId, {
    rootDir,
    execute: options.execute
  });

  if (options.json) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } else {
    printResult(result);
  }
  if (options.execute && !result.passed) process.exitCode = 1;
} catch (error) {
  console.error(`RCAP factory wave integration failed: ${error.message}`);
  process.exitCode = 1;
}

function parseArgs(argv) {
  const parsed = {
    waveId: null,
    rootDir: null,
    execute: false,
    captainAcknowledged: false,
    json: false
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--dry-run") {
      // Dry-run is the default and remains explicit for automation readability.
      parsed.execute = false;
    } else if (arg === "--execute") {
      parsed.execute = true;
    } else if (arg === "--captain-ack") {
      parsed.captainAcknowledged = true;
    } else if (arg === "--json") {
      parsed.json = true;
    } else if (arg === "--root") {
      parsed.rootDir = requireValue(argv, ++index, arg);
    } else if (arg.startsWith("--")) {
      throw new Error(`Unknown option: ${arg}`);
    } else if (!parsed.waveId) {
      parsed.waveId = arg;
    } else {
      throw new Error(`Unexpected argument: ${arg}`);
    }
  }
  return parsed;
}

function requireValue(argv, index, option) {
  const value = argv[index];
  if (!value || value.startsWith("--")) {
    throw new Error(`${option} requires a value`);
  }
  return value;
}

function printResult(result) {
  if (result.dryRun) {
    console.log(`RCAP factory wave dry run: ${result.waveId}`);
    console.log(`Jobs: ${result.plan.jobs.length}`);
    console.log(
      `Ready for execution: ${result.readyForExecution ? "yes" : "no"}`
    );
    console.log("Captain-only global regeneration:");
    for (const command of result.plan.captainRegeneration) {
      console.log(`  - ${command}`);
    }
    console.log("Deduplicated wave integration gates:");
    for (const command of result.plan.integrationValidation) {
      console.log(`  - ${command}`);
    }
    console.log("Execution sequence:");
    for (const step of result.plan.steps) console.log(`  - ${step}`);
    if (result.readinessBlockers.length > 0) {
      console.log("Readiness blockers (no action taken):");
      for (const blocker of result.readinessBlockers) {
        console.log(`  - ${blocker}`);
      }
    }
    console.log("Dry run made no filesystem, Git index, branch, or registry changes.");
    return;
  }

  console.log(
    `RCAP factory wave integration ${result.passed ? "passed" : "failed"}: ${result.waveId}`
  );
  console.log(`Integrated jobs: ${result.integratedJobs.length}`);
  console.log(`Captain commands run: ${result.commandResults.length}`);
  for (const command of result.commandResults) {
    console.log(
      `  ${command.passed ? "PASS" : "FAIL"} [${command.phase}] ${command.command}`
    );
  }
  for (const failure of result.invariantFailures ?? []) {
    console.error(`  - ${failure}`);
  }
}
