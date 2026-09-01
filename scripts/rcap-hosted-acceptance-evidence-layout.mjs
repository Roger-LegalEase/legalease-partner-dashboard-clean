import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const DEFAULT_EVIDENCE_DIRECTORY_NAME = "hosted-acceptance-evidence";

export const HOSTED_ACCEPTANCE_EVIDENCE_SUBDIRECTORIES = Object.freeze([
  "screenshots",
  "traces",
  "console",
  "network",
  "database",
  "artifacts"
]);

const DEFAULT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function canonicalizeExistingPrefix(targetPath) {
  const missingSegments = [];
  let existingPath = targetPath;

  while (!fs.existsSync(existingPath)) {
    const parent = path.dirname(existingPath);
    if (parent === existingPath) break;
    missingSegments.unshift(path.basename(existingPath));
    existingPath = parent;
  }

  const canonicalPrefix = fs.realpathSync.native(existingPath);
  return path.join(canonicalPrefix, ...missingSegments);
}

function isPathWithin(parentPath, candidatePath) {
  const relative = path.relative(parentPath, candidatePath);
  return relative === "" || (relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative));
}

export function resolveHostedAcceptanceEvidenceDirectory({
  rootDir = DEFAULT_ROOT,
  environment = process.env
} = {}) {
  const worktreeRoot = canonicalizeExistingPrefix(path.resolve(rootDir));
  const override = environment.HOSTED_ACCEPTANCE_EVIDENCE_DIR;

  if (override === undefined || override === "") {
    return path.join(worktreeRoot, DEFAULT_EVIDENCE_DIRECTORY_NAME);
  }
  if (typeof override !== "string" || !path.isAbsolute(override)) {
    throw new Error("HOSTED_ACCEPTANCE_EVIDENCE_DIR must be an absolute path");
  }

  const evidenceDirectory = path.normalize(override);
  const canonicalEvidenceDirectory = canonicalizeExistingPrefix(evidenceDirectory);
  if (isPathWithin(worktreeRoot, canonicalEvidenceDirectory)) {
    throw new Error("HOSTED_ACCEPTANCE_EVIDENCE_DIR must resolve outside the Git worktree");
  }
  return evidenceDirectory;
}

export function prepareHostedAcceptanceEvidenceLayout(options = {}) {
  const evidenceDirectory = resolveHostedAcceptanceEvidenceDirectory(options);
  const folders = { root: evidenceDirectory };

  fs.mkdirSync(evidenceDirectory, { recursive: true });
  for (const name of HOSTED_ACCEPTANCE_EVIDENCE_SUBDIRECTORIES) {
    const directory = path.join(evidenceDirectory, name);
    fs.mkdirSync(directory, { recursive: true });
    folders[name] = directory;
  }

  return folders;
}
