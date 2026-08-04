import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  assertAuthorityVersion,
  assertSupportedModel,
  compileWorkerPrompt,
  orderedJobManifest,
  stableStringify
} from "./prompt.mjs";

const NEVER_WORKER_OWNED_PATHS = [
  "data/record-clearing/legal-design-implementation-queue.json",
  "data/record-clearing/legal-design-packet-set-manifests.json",
  "data/record-clearing/legal-design-specifications.json",
  "data/record-clearing/legal-design-track-registry.json",
  "data/record-clearing/legal-design-track-source-relationships.json",
  "data/record-clearing/master-library/authoritative-blocker-ledger.json",
  "data/record-clearing/master-library/reconciliation.json",
  "data/record-clearing/master-library/repository-asset-audit.json",
  "data/record-clearing/master-library/source-acquisition-queue.json",
  "data/record-clearing/master-library/track-source-audit.json",
  "src/lib/rcap/jurisdictions/packet-capability.ts",
  "src/lib/rcap/state-promotion-manifest.ts"
];

const IMMUTABLE_EDITION_PREFIX = "data/record-clearing/master-library/edition-";
export const WORKTREE_JOB_MARKER = "tmp/rcap-factory/job.json";

/**
 * Return the complete, deterministic scaffold plan without mutating Git or the
 * filesystem. Reading HEAD is intentional: workers branch from the committed
 * factory while the job's baseCommit remains its planning provenance. The CLI
 * uses this path unless the captain explicitly supplies --apply.
 */
export function buildScaffoldPlan({ rootDir, job, authorityVersion, model = job?.model }) {
  assertScaffoldableJob(job);
  assertSupportedModel(model);
  assertAuthorityVersion(authorityVersion);
  assertRoot(rootDir);

  const scaffoldBaseCommit = currentHead(rootDir);
  const scaffoldKey = scaffoldKeyFor(job.jobId);
  const worktreePath = `tmp/rcap-factory/worktrees/${scaffoldKey}`;
  const workspacePath = `tmp/rcap-factory/jobs/${scaffoldKey}`;
  const branch = `rcap-factory/${scaffoldKey}`;

  return {
    schemaVersion: 1,
    jobId: job.jobId,
    model,
    authorityVersion,
    baseCommit: job.baseCommit,
    manifestBaseCommit: job.baseCommit,
    scaffoldBaseCommit,
    workerBaseCommit: scaffoldBaseCommit,
    branch,
    worktreePath,
    workspacePath,
    artifacts: {
      jobManifest: `${workspacePath}/job.json`,
      workerPrompt: `${workspacePath}/worker-prompt.md`,
      scaffoldManifest: `${workspacePath}/scaffold.json`,
      worktreeMarker: `${worktreePath}/${WORKTREE_JOB_MARKER}`
    },
    command: [
      "git",
      "worktree",
      "add",
      "-b",
      branch,
      worktreePath,
      scaffoldBaseCommit
    ],
    safety: {
      explicitApplyRequired: true,
      generatedArtifactsIgnored: true,
      globalRegistryRegeneration: false,
      staging: false,
      deployment: false
    }
  };
}

export function scaffoldJob({
  rootDir,
  job,
  authorityVersion,
  model = job?.model,
  apply = false
}) {
  const plan = buildScaffoldPlan({ rootDir, job, authorityVersion, model });
  if (!apply) return { ...plan, applied: false };

  applyScaffoldPlan({ rootDir, job, plan });
  return { ...plan, applied: true };
}

export function applyScaffoldPlan({ rootDir, job, plan }) {
  assertRoot(rootDir);
  assertScaffoldableJob(job);

  const expected = buildScaffoldPlan({
    rootDir,
    job,
    authorityVersion: plan.authorityVersion,
    model: plan.model
  });
  if (stableStringify(expected) !== stableStringify(plan)) {
    throw new Error("Refusing to apply a scaffold plan that does not match the assigned job.");
  }

  assertRepositoryRoot(rootDir);
  assertCommitExists(rootDir, plan.baseCommit);
  assertManifestBaseAncestor(rootDir, plan.baseCommit, plan.scaffoldBaseCommit);
  assertBranchAvailable(rootDir, plan.branch);
  assertIgnoredTargets(rootDir, plan);

  const worktreeAbsolute = resolveInsideRoot(rootDir, plan.worktreePath);
  const workspaceAbsolute = resolveInsideRoot(rootDir, plan.workspacePath);
  assertNoSymlinkAncestors(rootDir, plan.worktreePath);
  assertNoSymlinkAncestors(rootDir, plan.workspacePath);
  if (fs.existsSync(worktreeAbsolute)) {
    throw new Error(`Worktree target already exists: ${plan.worktreePath}`);
  }
  if (fs.existsSync(workspaceAbsolute)) {
    throw new Error(`Job workspace already exists: ${plan.workspacePath}`);
  }

  fs.mkdirSync(path.dirname(worktreeAbsolute), { recursive: true });
  fs.mkdirSync(path.dirname(workspaceAbsolute), { recursive: true });

  runGit(rootDir, plan.command.slice(1));

  const actualStartCommit = currentHead(worktreeAbsolute);
  if (actualStartCommit !== plan.scaffoldBaseCommit) {
    throw new Error(
      `Scaffold worktree started at ${actualStartCommit}, expected ${plan.scaffoldBaseCommit}.`
    );
  }

  fs.mkdirSync(workspaceAbsolute);
  fs.writeFileSync(
    resolveInsideRoot(rootDir, plan.artifacts.jobManifest),
    `${JSON.stringify(orderedJobManifest(job, plan.model), null, 2)}\n`,
    { flag: "wx" }
  );
  fs.writeFileSync(
    resolveInsideRoot(rootDir, plan.artifacts.workerPrompt),
    compileWorkerPrompt({
      job,
      authorityVersion: plan.authorityVersion,
      model: plan.model
    }),
    { flag: "wx" }
  );
  fs.writeFileSync(
    resolveInsideRoot(rootDir, plan.artifacts.scaffoldManifest),
    `${stableStringify(scaffoldManifestFor(plan))}\n`,
    { flag: "wx" }
  );
  const markerAbsolute = resolveInsideRoot(rootDir, plan.artifacts.worktreeMarker);
  fs.mkdirSync(path.dirname(markerAbsolute), { recursive: true });
  fs.writeFileSync(
    markerAbsolute,
    `${stableStringify(worktreeMarkerFor(plan, job, actualStartCommit))}\n`,
    { flag: "wx" }
  );
}

export function assertScaffoldableJob(job) {
  if (!job || typeof job !== "object" || Array.isArray(job)) {
    throw new Error("Factory job must be an object.");
  }
  if (typeof job.jobId !== "string" || job.jobId.trim() === "") {
    throw new Error("Factory job is missing jobId.");
  }
  if (typeof job.baseCommit !== "string" || !/^[0-9a-f]{7,40}$/i.test(job.baseCommit)) {
    throw new Error(`${job.jobId}: baseCommit must be a 7-40 character Git SHA.`);
  }
  if (!Array.isArray(job.ownedPaths) || !Array.isArray(job.forbiddenPaths)) {
    throw new Error(`${job.jobId}: ownedPaths and forbiddenPaths must be arrays.`);
  }

  for (const candidate of [...job.ownedPaths, ...job.forbiddenPaths]) {
    assertRepositoryPattern(candidate, job.jobId);
  }

  for (const owned of job.ownedPaths) {
    if (NEVER_WORKER_OWNED_PATHS.some((restricted) => pathsOverlap(owned, restricted))) {
      throw new Error(`${job.jobId}: workers cannot own global generated registry path ${owned}.`);
    }
    if (patternPrefix(owned).startsWith(IMMUTABLE_EDITION_PREFIX)) {
      throw new Error(`${job.jobId}: workers cannot modify an existing Master Library edition (${owned}).`);
    }
    assertMemoOwnership(job, owned);

    const conflict = job.forbiddenPaths.find((forbidden) => pathsOverlap(owned, forbidden));
    if (conflict) {
      throw new Error(`${job.jobId}: owned path ${owned} overlaps forbidden path ${conflict}.`);
    }
  }
}

export function scaffoldKeyFor(jobId) {
  const slug =
    String(jobId)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 64) || "job";
  const digest = createHash("sha256").update(String(jobId)).digest("hex").slice(0, 8);
  return `${slug}-${digest}`;
}

function scaffoldManifestFor(plan) {
  return {
    schemaVersion: plan.schemaVersion,
    jobId: plan.jobId,
    model: plan.model,
    authorityVersion: plan.authorityVersion,
    manifestBaseCommit: plan.manifestBaseCommit,
    scaffoldBaseCommit: plan.scaffoldBaseCommit,
    workerBaseCommit: plan.workerBaseCommit,
    branch: plan.branch,
    worktreePath: plan.worktreePath,
    jobManifest: plan.artifacts.jobManifest,
    workerPrompt: plan.artifacts.workerPrompt,
    safety: plan.safety
  };
}

function worktreeMarkerFor(plan, job, actualStartCommit) {
  return {
    schemaVersion: 1,
    jobId: plan.jobId,
    model: plan.model,
    authorityVersion: plan.authorityVersion,
    manifestBaseCommit: plan.manifestBaseCommit,
    scaffoldBaseCommit: actualStartCommit,
    workerBaseCommit: actualStartCommit,
    branch: plan.branch,
    markerPath: WORKTREE_JOB_MARKER,
    ownedPaths: job.ownedPaths,
    forbiddenPaths: job.forbiddenPaths,
    focusedValidation: job.focusedValidation
  };
}

function assertMemoOwnership(job, ownedPath) {
  const memo = patternPrefix(ownedPath).match(
    /^data\/record-clearing\/legal-design-intake\/([A-Z]{2})\.memo\.json$/
  );
  if (!memo) return;

  const jurisdiction = String(job.jurisdiction ?? "").toUpperCase();
  if (memo[1] !== jurisdiction) {
    throw new Error(
      `${job.jobId}: ${memo[1]} memo belongs to another jurisdiction (assigned ${jurisdiction || "none"}).`
    );
  }
}

function assertRepositoryPattern(candidate, jobId) {
  if (typeof candidate !== "string" || candidate.trim() === "") {
    throw new Error(`${jobId}: owned and forbidden paths must be non-empty strings.`);
  }

  const normalized = candidate.replaceAll("\\", "/");
  if (
    path.posix.isAbsolute(normalized) ||
    normalized === ".." ||
    normalized.startsWith("../") ||
    normalized.includes("/../")
  ) {
    throw new Error(`${jobId}: path must stay repository-relative (${candidate}).`);
  }
}

function pathsOverlap(left, right) {
  const leftPrefix = patternPrefix(left);
  const rightPrefix = patternPrefix(right);
  if (leftPrefix === "" || rightPrefix === "") return true;
  return (
    leftPrefix === rightPrefix ||
    leftPrefix.startsWith(`${rightPrefix}/`) ||
    rightPrefix.startsWith(`${leftPrefix}/`)
  );
}

function patternPrefix(value) {
  const normalized = String(value)
    .replaceAll("\\", "/")
    .replace(/^\.\//, "")
    .replace(/\/+/g, "/");
  const wildcard = normalized.search(/[*?[\]{}!]/);
  return (wildcard === -1 ? normalized : normalized.slice(0, wildcard))
    .replace(/\/+$/, "");
}

function assertRoot(rootDir) {
  if (typeof rootDir !== "string" || !path.isAbsolute(rootDir)) {
    throw new Error("rootDir must be an absolute repository path.");
  }
}

function resolveInsideRoot(rootDir, relativePath) {
  const resolvedRoot = path.resolve(rootDir);
  const resolved = path.resolve(resolvedRoot, relativePath);
  if (resolved === resolvedRoot || !resolved.startsWith(`${resolvedRoot}${path.sep}`)) {
    throw new Error(`Scaffold path escapes the repository: ${relativePath}`);
  }
  return resolved;
}

function assertNoSymlinkAncestors(rootDir, relativePath) {
  const normalized = path.relative(rootDir, resolveInsideRoot(rootDir, relativePath));
  let cursor = path.resolve(rootDir);
  for (const part of normalized.split(path.sep)) {
    cursor = path.join(cursor, part);
    if (!fs.existsSync(cursor)) break;
    if (fs.lstatSync(cursor).isSymbolicLink()) {
      throw new Error(`Scaffold path traverses a symbolic link: ${path.relative(rootDir, cursor)}`);
    }
  }
}

function assertRepositoryRoot(rootDir) {
  const result = runGit(rootDir, ["rev-parse", "--show-toplevel"]);
  const declaredRoot = fs.realpathSync(rootDir);
  const gitRoot = fs.realpathSync(result.stdout.trim());
  if (declaredRoot !== gitRoot) {
    throw new Error(`Scaffold root ${declaredRoot} is not the Git worktree root ${gitRoot}.`);
  }
}

function assertCommitExists(rootDir, commit) {
  runGit(rootDir, ["cat-file", "-e", `${commit}^{commit}`]);
}

function assertManifestBaseAncestor(rootDir, manifestBaseCommit, scaffoldBaseCommit) {
  const result = runGit(
    rootDir,
    ["merge-base", "--is-ancestor", manifestBaseCommit, scaffoldBaseCommit],
    { acceptedStatuses: [0, 1] }
  );
  if (result.status !== 0) {
    throw new Error(
      `Manifest base ${manifestBaseCommit} is not an ancestor of scaffold base ${scaffoldBaseCommit}.`
    );
  }
}

function currentHead(rootDir) {
  return runGit(rootDir, ["rev-parse", "HEAD"]).stdout.trim();
}

function assertBranchAvailable(rootDir, branch) {
  runGit(rootDir, ["check-ref-format", "--branch", branch]);
  const result = runGit(
    rootDir,
    ["show-ref", "--verify", "--quiet", `refs/heads/${branch}`],
    { acceptedStatuses: [0, 1] }
  );
  if (result.status === 0) throw new Error(`Scaffold branch already exists: ${branch}`);
}

function assertIgnoredTargets(rootDir, plan) {
  const targets = [
    `${plan.worktreePath}/.git`,
    plan.artifacts.jobManifest,
    plan.artifacts.workerPrompt,
    plan.artifacts.scaffoldManifest,
    plan.artifacts.worktreeMarker
  ];

  for (const target of targets) {
    const result = runGit(
      rootDir,
      ["check-ignore", "--quiet", "--no-index", target],
      { acceptedStatuses: [0, 1] }
    );
    if (result.status !== 0) {
      throw new Error(`Refusing to create a scaffold artifact that Git does not ignore: ${target}`);
    }
  }
}

function runGit(rootDir, args, { acceptedStatuses = [0] } = {}) {
  const result = spawnSync("git", args, {
    cwd: rootDir,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });

  if (result.error) throw result.error;
  if (!acceptedStatuses.includes(result.status)) {
    const detail = (result.stderr || result.stdout || "Git command failed.").trim();
    throw new Error(`git ${args.join(" ")}: ${detail}`);
  }
  return result;
}
