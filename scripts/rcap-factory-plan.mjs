#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

import {
  buildFactoryPlan,
  loadJob,
  serializeFactoryPlan,
  stableStringify
} from "./lib/rcap-factory/index.mjs";
import {
  assertAuthorityOutputContract
} from "./lib/rcap-factory/authority-output.mjs";

try {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    process.stdout.write(
      [
        "Usage: node scripts/rcap-factory-plan.mjs [options]",
        "",
        "Options:",
        "  --base-commit <sha>  Pin every job to this 40-character commit.",
        "  --root <path>         Repository root (defaults to the current directory).",
        "  --out <path>          Write JSON below ignored tmp/rcap-factory or artifacts/rcap-factory.",
        "  --check-job <jobId>   Run the job's bounded output/schema check.",
        "  --summary             Print deterministic lane counts instead of the full plan.",
        "  --compact             Emit compact JSON.",
        "  --help                Show this help.",
        ""
      ].join("\n")
    );
    process.exit(0);
  }

  const rootDir = path.resolve(args.root ?? process.cwd());
  const planOptions = {
    rootDir,
    ...(args.baseCommit ? { baseCommit: args.baseCommit } : {})
  };
  const plan = args.checkJob ? null : buildFactoryPlan(planOptions);
  const output = args.checkJob
    ? `${stableStringify(
        checkJobOutputs(loadJob(args.checkJob, planOptions), rootDir),
        args.compact ? 0 : 2
      )}\n`
    : args.summary
      ? `${stableStringify(summarize(plan), args.compact ? 0 : 2)}\n`
      : serializeFactoryPlan(plan, args.compact ? 0 : 2);

  if (args.out) {
    const outputPath = path.resolve(rootDir, args.out);
    refuseSourceMutation(plan, rootDir, outputPath);
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, output, "utf8");
  } else {
    process.stdout.write(output);
  }
} catch (error) {
  process.stderr.write(`RCAP factory plan failed: ${error.message}\n`);
  process.exitCode = 1;
}

function summarize(plan) {
  return {
    schemaVersion: plan.schemaVersion,
    authorityVersion: plan.authorityVersion,
    baseCommit: plan.baseCommit,
    jurisdictions: new Set(plan.jobs.map((job) => job.jurisdiction)).size,
    jobs: plan.jobs.length,
    byLane: Object.fromEntries(
      plan.lanes.map((lane) => [lane.lane, lane.jobIds.length])
    ),
    byStatus: Object.fromEntries(
      [...new Set(plan.jobs.map((job) => job.status))]
        .sort()
        .map((status) => [
          status,
          plan.jobs.filter((job) => job.status === status).length
        ])
    ),
    runtime: plan.sourceSummary.runtime
  };
}

function refuseSourceMutation(plan, rootDir, outputPath) {
  const relative = path.relative(rootDir, outputPath).replaceAll("\\", "/");
  if (relative === "" || relative === "." || relative.startsWith("../") || path.isAbsolute(relative)) {
    throw new Error("--out must remain inside the repository.");
  }
  if (
    relative !== "tmp/rcap-factory" &&
    !relative.startsWith("tmp/rcap-factory/") &&
    relative !== "artifacts/rcap-factory" &&
    !relative.startsWith("artifacts/rcap-factory/")
  ) {
    throw new Error(
      "--out must be below ignored tmp/rcap-factory/ or artifacts/rcap-factory/."
    );
  }
  const sourcePaths = new Set(plan.generatedFrom.map((entry) => entry.path));
  if (sourcePaths.has(relative)) {
    throw new Error(`--out may not overwrite planner source input ${relative}.`);
  }
}

function checkJobOutputs(job, rootDir) {
  const jobId = job.jobId;
  const checked = [];
  for (const relativePath of job.expectedOutputs) {
    const absolutePath = path.join(rootDir, relativePath);
    if (!fs.existsSync(absolutePath)) {
      throw new Error(`${jobId} is missing expected output ${relativePath}.`);
    }
    const stat = fs.statSync(absolutePath);
    if (!stat.isFile()) {
      throw new Error(`${jobId} expected output is not a file: ${relativePath}.`);
    }
    const realPath = fs.realpathSync(absolutePath);
    const relativeRealPath = path.relative(rootDir, realPath);
    if (
      relativeRealPath === "" ||
      relativeRealPath.startsWith("../") ||
      path.isAbsolute(relativeRealPath)
    ) {
      throw new Error(`${jobId} expected output resolves outside the repository: ${relativePath}.`);
    }

    const text = fs.readFileSync(absolutePath, "utf8");
    if (text.trim().length === 0) {
      throw new Error(`${jobId} expected output is empty: ${relativePath}.`);
    }
    if (relativePath.endsWith(".json")) {
      let value;
      try {
        value = JSON.parse(text);
      } catch (error) {
        throw new Error(`${jobId} expected output is invalid JSON (${relativePath}): ${error.message}`);
      }
      assertAuthorityOutputContract(job, relativePath, value);
    } else if (relativePath.endsWith(".ts") || relativePath.endsWith(".tsx")) {
      checkTypeScriptSyntax(jobId, relativePath, text);
    }
    checked.push(relativePath);
  }

  return {
    jobId,
    lane: job.lane,
    result: "passed",
    checkedOutputs: checked
  };
}

function checkTypeScriptSyntax(jobId, relativePath, source) {
  const require = createRequire(import.meta.url);
  const ts = require("typescript");
  const result = ts.transpileModule(source, {
    fileName: relativePath,
    reportDiagnostics: true,
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      jsx: ts.JsxEmit.ReactJSX
    }
  });
  const errors = (result.diagnostics ?? []).filter(
    (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error
  );
  if (errors.length > 0) {
    const detail = errors
      .map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, " "))
      .join("; ");
    throw new Error(`${jobId} expected output has invalid TypeScript (${relativePath}): ${detail}`);
  }
}

function parseArgs(argv) {
  const result = {
    baseCommit: undefined,
    root: undefined,
    out: undefined,
    checkJob: undefined,
    summary: false,
    compact: false,
    help: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") {
      result.help = true;
    } else if (arg === "--summary") {
      result.summary = true;
    } else if (arg === "--compact") {
      result.compact = true;
    } else if (
      arg === "--base-commit" ||
      arg === "--root" ||
      arg === "--out" ||
      arg === "--check-job"
    ) {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) throw new Error(`${arg} requires a value.`);
      index += 1;
      if (arg === "--base-commit") result.baseCommit = value;
      if (arg === "--root") result.root = value;
      if (arg === "--out") result.out = value;
      if (arg === "--check-job") result.checkJob = value;
    } else if (arg.startsWith("--base-commit=")) {
      result.baseCommit = arg.slice("--base-commit=".length);
    } else if (arg.startsWith("--root=")) {
      result.root = arg.slice("--root=".length);
    } else if (arg.startsWith("--out=")) {
      result.out = arg.slice("--out=".length);
    } else if (arg.startsWith("--check-job=")) {
      result.checkJob = arg.slice("--check-job=".length);
    } else {
      throw new Error(`Unknown argument ${arg}.`);
    }
  }
  return result;
}
