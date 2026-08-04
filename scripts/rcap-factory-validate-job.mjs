#!/usr/bin/env node

import path from "node:path";

import { loadJob } from "./lib/rcap-factory/index.mjs";
import { validateJobWorkspace } from "./lib/rcap-factory/validation.mjs";

const args = process.argv.slice(2).filter((arg) => arg !== "--");
const options = parseArgs(args);

if (!options.jobId) {
  console.error(
    "Usage: node scripts/rcap-factory-validate-job.mjs <jobId> [--json] [--no-run]"
  );
  process.exit(2);
}

try {
  const rootDir = path.resolve(options.rootDir ?? process.cwd());
  const loaded = await loadJob(options.jobId, { rootDir, root: rootDir });
  const job = loaded?.job ?? loaded;
  const report = validateJobWorkspace(job, {
    rootDir,
    runCommands: !options.noRun,
    requireExpectedOutputs: !options.allowMissingOutputs
  });

  if (options.json) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } else {
    printReport(report);
  }
  if (!report.passed) process.exitCode = 1;
} catch (error) {
  if (options.json) {
    process.stdout.write(
      `${JSON.stringify(
        {
          schemaVersion: "rcap-factory-job-validation/v1",
          jobId: options.jobId,
          scope: "focused",
          passed: false,
          failures: [
            {
              code: "validation_error",
              path: null,
              message: error.message
            }
          ]
        },
        null,
        2
      )}\n`
    );
  } else {
    console.error(`RCAP factory job validation failed: ${error.message}`);
  }
  process.exitCode = 1;
}

function parseArgs(argv) {
  const parsed = {
    jobId: null,
    rootDir: null,
    json: false,
    noRun: false,
    allowMissingOutputs: false
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--json") parsed.json = true;
    else if (arg === "--no-run") parsed.noRun = true;
    else if (arg === "--allow-missing-outputs") {
      parsed.allowMissingOutputs = true;
    } else if (arg === "--root") {
      parsed.rootDir = requireValue(argv, ++index, arg);
    } else if (arg.startsWith("--")) {
      throw new Error(`Unknown option: ${arg}`);
    } else if (!parsed.jobId) {
      parsed.jobId = arg;
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

function printReport(report) {
  const status = report.passed ? "passed" : "failed";
  console.log(`RCAP factory focused validation ${status}: ${report.jobId}`);
  console.log(`Jurisdiction: ${report.jurisdiction ?? "unknown"}`);
  console.log(`Baseline: ${report.baselineCommit ?? "unresolved"}`);
  console.log(`Changed paths: ${report.changedPaths.length}`);
  console.log(`Focused commands run: ${report.commandResults.length}`);

  for (const result of report.commandResults) {
    console.log(
      `  ${result.passed ? "PASS" : "FAIL"} ${result.command} (exit ${result.exitCode ?? "unknown"})`
    );
    if (result.stdout.trim()) process.stdout.write(indent(result.stdout));
    if (result.stderr.trim()) process.stderr.write(indent(result.stderr));
  }

  if (report.failures.length > 0) {
    console.error("Failures:");
    for (const failure of report.failures) {
      console.error(
        `  - [${failure.code}]${failure.path ? ` ${failure.path}:` : ""} ${failure.message}`
      );
    }
  }
  for (const note of report.notes) console.log(`Note: ${note}`);
}

function indent(value) {
  const text = value.endsWith("\n") ? value : `${value}\n`;
  return text
    .split("\n")
    .map((line, index, lines) =>
      index === lines.length - 1 && line === "" ? "" : `    ${line}`
    )
    .join("\n");
}
