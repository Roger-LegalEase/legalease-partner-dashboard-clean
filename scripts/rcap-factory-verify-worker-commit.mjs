#!/usr/bin/env node
// Pre-push gate for a worker's completion commit.
//
// A worker runs this in its own checkout before pushing. It proves the commit
// integration will actually accept: right parent, only owned paths, the exact
// pinned subject, no binary, an intact assignment marker and the canonical
// branch. A pushed commit cannot be amended, so a subject caught here costs
// nothing and a subject caught at integration costs a captain-equivalent commit.

import path from "node:path";

import { loadJob } from "./lib/rcap-factory/index.mjs";
import { validateWorkerCompletionCommit } from "./lib/rcap-factory/validation.mjs";

const args = process.argv.slice(2).filter((arg) => arg !== "--");
const options = { jobId: null, commit: "HEAD", json: false, rootDir: null };
for (let index = 0; index < args.length; index += 1) {
  const arg = args[index];
  if (arg === "--json") options.json = true;
  else if (arg === "--commit") options.commit = args[++index];
  else if (arg === "--root") options.rootDir = args[++index];
  else if (arg.startsWith("--")) {
    console.error(`Unknown option: ${arg}`);
    process.exit(2);
  } else if (!options.jobId) options.jobId = arg;
}

if (!options.jobId) {
  console.error(
    "Usage: node scripts/rcap-factory-verify-worker-commit.mjs <jobId> [--commit <rev>] [--json]"
  );
  process.exit(2);
}

try {
  const rootDir = path.resolve(options.rootDir ?? process.cwd());
  const loaded = await loadJob(options.jobId, { rootDir, root: rootDir });
  const job = loaded?.job ?? loaded;
  const report = validateWorkerCompletionCommit(job, {
    rootDir,
    commit: options.commit
  });

  if (options.json) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } else if (report.passed) {
    process.stdout.write(
      `Worker completion commit verified: ${report.jobId} ${report.commit?.slice(0, 12)} ` +
        `subject=${JSON.stringify(report.actualCommitSubject)} paths=${report.changedPaths?.length ?? 0}\n`
    );
  } else {
    console.error(`Worker completion commit rejected: ${report.jobId}`);
    for (const entry of report.failures) {
      console.error(`  [${entry.code}] ${entry.path ? `${entry.path}: ` : ""}${entry.message}`);
    }
    console.error("\n  Fix the commit before pushing. A pushed worker commit is not amended;");
    console.error("  it has to be integrated through a captain-equivalent commit instead.");
  }
  if (!report.passed) process.exitCode = 1;
} catch (error) {
  console.error(`Worker completion verification failed: ${error.message}`);
  process.exitCode = 1;
}
