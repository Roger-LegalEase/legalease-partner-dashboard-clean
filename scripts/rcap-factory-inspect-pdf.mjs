#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

import {
  createOwnershipMapProposal,
  inspectPdfSource
} from "./lib/rcap-factory/pdf-inspection.mjs";

const args = process.argv.slice(2).filter((arg) => arg !== "--");

try {
  const options = parseArgs(args);
  if (!options.source) {
    throw new Error(
      "Usage: node scripts/rcap-factory-inspect-pdf.mjs <source> [--out <report.json>] [--ownership-map <proposal.json>]"
    );
  }

  const rootDir = path.resolve(options.rootDir ?? process.cwd());
  const report = await inspectPdfSource(options.source, { rootDir });

  if (options.outputPath) {
    writeJson(
      safeOutputPath(rootDir, options.outputPath, options.source),
      report
    );
  }
  if (options.ownershipMapPath) {
    const proposal = createOwnershipMapProposal(report);
    writeJson(
      safeOutputPath(rootDir, options.ownershipMapPath, options.source),
      proposal
    );
  }

  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  if (report.errors.length > 0) process.exitCode = 1;
} catch (error) {
  console.error(`RCAP factory PDF inspection failed: ${error.message}`);
  process.exitCode = 1;
}

function parseArgs(argv) {
  const parsed = {
    source: null,
    rootDir: null,
    outputPath: null,
    ownershipMapPath: null
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--root") {
      parsed.rootDir = requireValue(argv, ++index, arg);
    } else if (arg === "--out") {
      parsed.outputPath = requireValue(argv, ++index, arg);
    } else if (arg === "--ownership-map") {
      parsed.ownershipMapPath = requireValue(argv, ++index, arg);
    } else if (arg.startsWith("--")) {
      throw new Error(`Unknown option: ${arg}`);
    } else if (!parsed.source) {
      parsed.source = arg;
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

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function safeOutputPath(rootDir, requestedPath, source) {
  if (path.isAbsolute(requestedPath)) {
    throw new Error("PDF inspection outputs must be repository-relative");
  }
  const normalized = path.posix.normalize(requestedPath.replaceAll("\\", "/"));
  if (
    normalized === ".." ||
    normalized.startsWith("../") ||
    normalized.includes("/../")
  ) {
    throw new Error("PDF inspection output escapes the repository");
  }
  if (
    !normalized.startsWith("tmp/rcap-factory/") &&
    !normalized.startsWith("artifacts/rcap-factory/")
  ) {
    throw new Error(
      "PDF inspection output must stay under ignored tmp/rcap-factory/ or artifacts/rcap-factory/"
    );
  }
  const absolutePath = path.resolve(rootDir, normalized);
  const relative = path.relative(rootDir, absolutePath);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("PDF inspection output escapes the repository");
  }
  if (fs.existsSync(absolutePath)) {
    throw new Error(`Refusing to overwrite existing inspection output: ${normalized}`);
  }
  if (!/^https?:\/\//i.test(source)) {
    const sourcePath = path.resolve(rootDir, source);
    if (sourcePath === absolutePath) {
      throw new Error("PDF inspection output may not overwrite its source");
    }
  }
  return absolutePath;
}
