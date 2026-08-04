#!/usr/bin/env node

import path from "node:path";

import {
  loadFactoryPlan,
  loadJob
} from "./lib/rcap-factory/index.mjs";
import { generateJobReviewArtifacts } from "./lib/rcap-factory/review-artifacts.mjs";

const args = process.argv.slice(2).filter((arg) => arg !== "--");

try {
  const options = parseArgs(args);
  if (!options.jobId) {
    throw new Error(
      "Usage: node scripts/rcap-factory-generate-review.mjs <jobId> [--json] [--artifact-dir <path>] [--manifest <path>]"
    );
  }
  const rootDir = path.resolve(options.rootDir ?? process.cwd());
  const plan = await loadFactoryPlan({ rootDir, root: rootDir });
  const loaded = await loadJob(options.jobId, { rootDir, root: rootDir });
  const job = loaded?.job ?? loaded;
  const result = await generateJobReviewArtifacts(job, {
    rootDir,
    authorityVersion: plan.authorityVersion,
    authorityEdition: plan.authorityEdition,
    artifactDirectory: options.artifactDirectory,
    manifestPath: options.manifestPath,
    performValidation: !options.noValidate,
    write: true
  });

  if (options.json) {
    process.stdout.write(
      `${JSON.stringify(
        {
          manifestPath: result.manifestPath,
          artifactDirectory: result.artifactDirectory,
          manifest: result.manifest
        },
        null,
        2
      )}\n`
    );
  } else {
    console.log(`RCAP factory review generated: ${job.jobId}`);
    console.log(`Tracked manifest: ${result.manifestPath}`);
    console.log(`Ignored artifacts: ${result.artifactDirectory}`);
    console.log(
      `Synthetic packet: ${result.manifest.packet.pageCount} page(s), ${result.manifest.packet.sha256}`
    );
    console.log(`Rendered images: ${result.manifest.renderedPages.length}`);
    console.log(
      `Technical proof: ${result.manifest.technicalProofPassed ? "passed" : "pending"}`
    );
    console.log("Visual proof: pending");
    console.log("Counsel adoption: pending");
  }
} catch (error) {
  console.error(`RCAP factory review generation failed: ${error.message}`);
  if (error.validationReport?.failures) {
    for (const failure of error.validationReport.failures) {
      console.error(
        `- [${failure.code}]${failure.path ? ` ${failure.path}:` : ""} ${failure.message}`
      );
    }
  }
  process.exitCode = 1;
}

function parseArgs(argv) {
  const parsed = {
    jobId: null,
    rootDir: null,
    artifactDirectory: null,
    manifestPath: null,
    json: false,
    noValidate: false
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--json") parsed.json = true;
    else if (arg === "--no-validate") parsed.noValidate = true;
    else if (arg === "--root") {
      parsed.rootDir = requireValue(argv, ++index, arg);
    } else if (arg === "--artifact-dir") {
      parsed.artifactDirectory = requireValue(argv, ++index, arg);
    } else if (arg === "--manifest") {
      parsed.manifestPath = requireValue(argv, ++index, arg);
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
