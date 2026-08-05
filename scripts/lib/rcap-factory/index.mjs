import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

import { buildFactoryPlan } from "./planner.mjs";
import { validateJob } from "./schema.mjs";
import {
  canonicalSha256,
  canonicalStringify
} from "./canonical-json.mjs";

const WORKTREE_JOB_MARKER = "tmp/rcap-factory/job.json";

export {
  ACTIVE_JOB_STATUSES,
  FACTORY_EFFORTS,
  FACTORY_JOB_STATUSES,
  FACTORY_LANES,
  FACTORY_MODELS,
  FACTORY_SCHEMA_VERSION,
  REQUIRED_JOB_FIELDS,
  assertValidFactoryPlan,
  assertValidJob,
  findOwnedPathOverlaps,
  isActiveJob,
  normalizeRepoPath,
  pathsOverlap,
  validateFactoryPlan,
  validateJob
} from "./schema.mjs";

export {
  FACTORY_INPUT_PATHS,
  GLOBAL_GENERATED_REGISTRIES,
  GLOBAL_WORKER_FORBIDDEN_PATHS,
  WAVE_INTEGRATION_VALIDATION,
  buildFactoryPlan,
  readFactoryInputs
} from "./planner.mjs";

/**
 * The plan is derived from current authoritative inputs on every call. The
 * loader name is retained as the stable adapter for prompt, scaffold,
 * validation, dashboard and integration commands.
 */
export function loadFactoryPlan(options = {}) {
  return buildFactoryPlan(withWorktreeManifestBase(options));
}

export function loadJob(jobId, options = {}) {
  if (typeof jobId !== "string" || jobId.trim().length === 0) {
    throw new Error("A non-empty factory jobId is required.");
  }
  const resolvedOptions = withWorktreeManifestBase(options);
  const marker = readWorktreeMarker(resolvedOptions);
  if (marker?.jobId && marker.jobId !== jobId) {
    throw new Error(
      `This scaffold is assigned to ${marker.jobId}, not ${jobId}.`
    );
  }
  if (marker?.assignedJob) {
    return immutableScaffoldJob(marker, jobId, resolvedOptions);
  }
  const plan = buildFactoryPlan(resolvedOptions);
  const job = plan.jobs.find((entry) => entry.jobId === jobId);
  if (!job) {
    throw new Error(
      `Unknown RCAP factory job ${jobId}. Available jobs: ${plan.jobs
        .map((entry) => entry.jobId)
        .join(", ")}.`
    );
  }
  return job;
}

/**
 * A worker validates the assignment that was scaffolded, not a mutable view of
 * the pending queue. Completing the final pending tracks may correctly remove
 * the child from a newly compiled plan; that must not erase the contract used
 * to validate its own completion commit.
 */
function immutableScaffoldJob(marker, jobId, options) {
  const job = marker.assignedJob;
  if (!job || typeof job !== "object" || Array.isArray(job)) {
    throw new Error(`${WORKTREE_JOB_MARKER} assignedJob must be an object.`);
  }
  if (job.jobId !== jobId || job.jobId !== marker.jobId) {
    throw new Error(
      `${WORKTREE_JOB_MARKER} assignedJob does not match ${jobId}.`
    );
  }
  const digest = canonicalSha256(job);
  if (marker.assignedJobSha256 !== digest) {
    throw new Error(
      `${WORKTREE_JOB_MARKER} assignedJobSha256 does not match the immutable assignment.`
    );
  }
  validateExternalAssignmentAnchor(marker, job, options);
  validateExactAssignmentMarker(marker, job);
  const validation = validateJob(job);
  if (!validation.ok) {
    throw new Error(
      `${WORKTREE_JOB_MARKER} contains an invalid immutable assignment:\n- ` +
        validation.issues.join("\n- ")
    );
  }
  return structuredClone(job);
}

function validateExactAssignmentMarker(marker, job) {
  const assignment = job.officialPdfAssignment;
  const requiresExactMarker =
    Array.isArray(assignment?.identityKeys) &&
    assignment.identityKeys.length > 0;
  if (!requiresExactMarker) {
    if (marker.exactAssignment !== undefined) {
      throw new Error(
        `${WORKTREE_JOB_MARKER} carries an exact assignment for a non-official job.`
      );
    }
    return;
  }
  const expected = {
    jobId: job.jobId,
    baseCommit: marker.manifestBaseCommit,
    workerBranch: marker.branch,
    canonicalParent: job.parentJobId,
    lane: job.lane,
    strategyFamily: job.strategyFamily,
    sourceIdentities: (job.sourceMaterializationInputs ?? []).map(
      (input) => ({
        sourceIdentityKey: input.sourceIdentityKey,
        documentId: input.documentId,
        expectedSha256: input.expectedSha256,
        expectedBytes: input.expectedBytes,
        expectedMime: input.expectedMediaType,
        portableLocator: input.portableLocator,
        materializationDestination: input.materializationDestination
      })
    ),
    projectionPath: assignment.projectionPath,
    projectionSha256: assignment.projectionSha256,
    exactTracks: assignment.exactTrackIds,
    exactComponents: assignment.exactComponentIds,
    newImplementationIdentities:
      assignment.newImplementationIdentityKeys,
    existingImplementationMaterializationOnlyIdentities:
      assignment.existingImplementationMaterializationOnlyIdentityKeys,
    ownedPaths: job.ownedPaths,
    expectedOutputs: job.expectedOutputs,
    focusedVerifier: assignment.focusedVerifier,
    implementationFamilies: assignment.implementationFamilies,
    runtimeDisabledInvariant: assignment.runtimeDisabledInvariant
  };
  if (
    stableStringify(marker.exactAssignment, 0) !==
    stableStringify(expected, 0)
  ) {
    throw new Error(
      `${WORKTREE_JOB_MARKER} exactAssignment broadens or changes the captain-owned assignment.`
    );
  }
}

function validateExternalAssignmentAnchor(marker, job, options) {
  if (!marker.assignmentManifestRelativePath) {
    // Pre-contract scaffolds retain the self-hash fallback. Every newly
    // generated scaffold receives the captain-owned external anchor below.
    return;
  }
  if (
    typeof marker.assignmentManifestRelativePath !== "string" ||
    typeof marker.assignmentManifestSha256 !== "string" ||
    !/^[0-9a-f]{64}$/.test(marker.assignmentManifestSha256)
  ) {
    throw new Error(`${WORKTREE_JOB_MARKER} has an invalid assignment manifest anchor.`);
  }
  const rootDir = path.resolve(
    options.rootDir ?? options.root ?? process.cwd()
  );
  const anchorPath = path.resolve(rootDir, marker.assignmentManifestRelativePath);
  const normalized = anchorPath.replaceAll("\\", "/");
  if (!normalized.includes("/tmp/rcap-factory/jobs/") || !normalized.endsWith("/job.json")) {
    throw new Error(
      `${WORKTREE_JOB_MARKER} assignment manifest anchor is outside the captain-owned scaffold workspace.`
    );
  }
  if (!fs.existsSync(anchorPath)) {
    throw new Error(
      `${WORKTREE_JOB_MARKER} assignment manifest anchor is missing.`
    );
  }
  const bytes = fs.readFileSync(anchorPath);
  const digest = crypto.createHash("sha256").update(bytes).digest("hex");
  if (digest !== marker.assignmentManifestSha256) {
    throw new Error(
      `${WORKTREE_JOB_MARKER} assignment manifest anchor hash does not match.`
    );
  }
  let anchoredJob;
  try {
    anchoredJob = JSON.parse(bytes.toString("utf8"));
  } catch (error) {
    throw new Error(
      `${WORKTREE_JOB_MARKER} assignment manifest anchor is invalid JSON: ${error.message}`
    );
  }
  if (stableStringify(anchoredJob, 0) !== stableStringify(job, 0)) {
    throw new Error(
      `${WORKTREE_JOB_MARKER} immutable assignment does not match the captain-owned anchor.`
    );
  }
}

/**
 * A captain plan is pinned to the captain's current HEAD. Inside a scaffolded
 * worker worktree, retain the manifest's original planning commit even after
 * the worker creates its one job commit.
 */
function withWorktreeManifestBase(options) {
  if (options.baseCommit !== undefined) return options;
  const marker = readWorktreeMarker(options);
  if (!marker) return options;
  const baseCommit = marker.manifestBaseCommit;
  if (typeof baseCommit !== "string" || !/^[0-9a-f]{40}$/.test(baseCommit)) {
    throw new Error(
      `${WORKTREE_JOB_MARKER} has an invalid manifestBaseCommit.`
    );
  }
  return { ...options, baseCommit };
}

function readWorktreeMarker(options) {
  const rootDir = path.resolve(
    options.rootDir ?? options.root ?? process.cwd()
  );
  const markerPath = path.join(rootDir, WORKTREE_JOB_MARKER);
  if (!fs.existsSync(markerPath)) return null;
  try {
    const marker = JSON.parse(fs.readFileSync(markerPath, "utf8"));
    if (!marker || typeof marker !== "object" || Array.isArray(marker)) {
      throw new Error("marker must be a JSON object");
    }
    return marker;
  } catch (error) {
    throw new Error(
      `Cannot read ${WORKTREE_JOB_MARKER}: ${error.message}`
    );
  }
}

export function stableStringify(value, space = 2) {
  return canonicalStringify(value, space);
}

export function serializeFactoryPlan(plan, space = 2) {
  return `${stableStringify(plan, space)}\n`;
}
