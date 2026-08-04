import fs from "node:fs";
import path from "node:path";

import { buildFactoryPlan } from "./planner.mjs";

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
  return JSON.stringify(sortObject(value), null, space);
}

export function serializeFactoryPlan(plan, space = 2) {
  return `${stableStringify(plan, space)}\n`;
}

function sortObject(value) {
  if (Array.isArray(value)) return value.map(sortObject);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.keys(value)
      .sort((a, b) => a.localeCompare(b))
      .map((key) => [key, sortObject(value[key])])
  );
}
