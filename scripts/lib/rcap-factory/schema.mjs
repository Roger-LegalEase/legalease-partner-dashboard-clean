import path from "node:path";

export const FACTORY_SCHEMA_VERSION = "rcap-production-factory/v1";

export const FACTORY_LANES = Object.freeze([
  "platform_foundation",
  "legal_design_normalization",
  "source_acquisition",
  "custom_pleading",
  "acroform_fill",
  "flat_pdf_overlay",
  "composed_route",
  "guidance_implementation",
  "legal_output_review",
  "staging_promotion"
]);

export const FACTORY_MODELS = Object.freeze(["opus", "codex"]);
export const FACTORY_EFFORTS = Object.freeze(["low", "medium", "high", "xhigh"]);
export const FACTORY_JOB_STATUSES = Object.freeze([
  "planned",
  "ready",
  "blocked",
  "in_progress",
  "completed",
  "cancelled"
]);

/**
 * A blocked job is still active: its paths must stay reserved while its
 * dependencies are being completed. Only terminal jobs release ownership.
 */
export const ACTIVE_JOB_STATUSES = Object.freeze([
  "planned",
  "ready",
  "blocked",
  "in_progress"
]);

export const REQUIRED_JOB_FIELDS = Object.freeze([
  "jobId",
  "parentJobId",
  "canonicalWave",
  "canonicalLane",
  "lane",
  "jurisdiction",
  "trackIds",
  "strategyFamily",
  "baseCommit",
  "dependencies",
  "ownedPaths",
  "integrationOwnedOutputs",
  "forbiddenPaths",
  "requiredInputs",
  "expectedOutputs",
  "requiredOutputFields",
  "focusedValidation",
  "integrationValidation",
  "model",
  "effort",
  "executionScope",
  "status",
  "commitSubject",
  "stopCondition"
]);

const JOB_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const JURISDICTION_PATTERN = /^(?:[A-Z]{2}|NATIONWIDE)$/;
const COMMIT_PATTERN = /^[0-9a-f]{40}$/;
const CANONICAL_LANES = new Set([
  "normalization",
  "authority",
  "platform",
  "implementation-pleading",
  "implementation-acroform",
  "implementation-overlay",
  "implementation-composed",
  "implementation-guidance",
  "proof",
  "counsel",
  "release"
]);

/**
 * Normalize a path carried by a job manifest.
 *
 * Paths in manifests are repository-relative identities, not shell patterns.
 * Refusing absolute paths, traversal, and glob metacharacters makes the same
 * comparison usable by the planner, scaffold and changed-file guard.
 */
export function normalizeRepoPath(value, field = "path") {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${field} must be a non-empty repository-relative path.`);
  }

  const slashPath = value.trim().replaceAll("\\", "/").replace(/\/+/g, "/");
  if (
    slashPath.startsWith("/") ||
    /^[A-Za-z]:\//.test(slashPath) ||
    slashPath.includes("\0")
  ) {
    throw new Error(`${field} must be repository-relative: ${JSON.stringify(value)}.`);
  }
  if (/[*?[\]{}!]/.test(slashPath)) {
    throw new Error(`${field} may not contain glob metacharacters: ${JSON.stringify(value)}.`);
  }

  const normalized = path.posix.normalize(slashPath).replace(/^\.\//, "").replace(/\/$/, "");
  if (
    normalized === "" ||
    normalized === "." ||
    normalized === ".." ||
    normalized.startsWith("../")
  ) {
    throw new Error(`${field} escapes or names the repository root: ${JSON.stringify(value)}.`);
  }
  return normalized;
}

export function pathsOverlap(left, right) {
  const a = normalizeRepoPath(left, "owned path");
  const b = normalizeRepoPath(right, "owned path");
  return a === b || a.startsWith(`${b}/`) || b.startsWith(`${a}/`);
}

export function isActiveJob(job) {
  return ACTIVE_JOB_STATUSES.includes(job?.status);
}

export function validateJob(job) {
  const issues = [];
  const add = (message) => issues.push(message);

  if (!job || typeof job !== "object" || Array.isArray(job)) {
    return { ok: false, issues: ["job must be an object."] };
  }

  for (const field of REQUIRED_JOB_FIELDS) {
    if (!(field in job)) add(`missing required field ${field}.`);
  }

  if (typeof job.jobId !== "string" || !JOB_ID_PATTERN.test(job.jobId)) {
    add("jobId must be a lowercase kebab-case identifier.");
  }
  if (
    typeof job.parentJobId !== "string" ||
    !/^[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*$/.test(job.parentJobId)
  ) {
    add("parentJobId must be a canonical kebab-case identifier.");
  }
  if (
    !Number.isInteger(job.canonicalWave) ||
    job.canonicalWave < 0 ||
    job.canonicalWave > 7
  ) {
    add("canonicalWave must be an integer from 0 through 7.");
  }
  if (!CANONICAL_LANES.has(job.canonicalLane)) {
    add("canonicalLane must name one of the canonical plan's 11 lanes.");
  }
  if (!FACTORY_LANES.includes(job.lane)) {
    add(`lane must be one of: ${FACTORY_LANES.join(", ")}.`);
  }
  if (
    typeof job.jurisdiction !== "string" ||
    !JURISDICTION_PATTERN.test(job.jurisdiction)
  ) {
    add("jurisdiction must be a two-letter uppercase code or NATIONWIDE.");
  }
  if (typeof job.strategyFamily !== "string" || job.strategyFamily.trim().length === 0) {
    add("strategyFamily must be a non-empty string.");
  }
  if (typeof job.baseCommit !== "string" || !COMMIT_PATTERN.test(job.baseCommit)) {
    add("baseCommit must be a lowercase 40-character Git SHA.");
  }
  if (!FACTORY_MODELS.includes(job.model)) {
    add(`model must be one of: ${FACTORY_MODELS.join(", ")}.`);
  }
  if (!FACTORY_EFFORTS.includes(job.effort)) {
    add(`effort must be one of: ${FACTORY_EFFORTS.join(", ")}.`);
  }
  if (!["worker", "captain", "human"].includes(job.executionScope)) {
    add("executionScope must be one of: worker, captain, human.");
  }
  if (!FACTORY_JOB_STATUSES.includes(job.status)) {
    add(`status must be one of: ${FACTORY_JOB_STATUSES.join(", ")}.`);
  }
  if (typeof job.commitSubject !== "string" || job.commitSubject.trim().length === 0) {
    add("commitSubject must be a non-empty string.");
  } else if (job.commitSubject.includes("\n")) {
    add("commitSubject must be one line.");
  } else if (job.commitSubject.length > 100) {
    add("commitSubject must be no more than 100 characters.");
  }
  if (typeof job.stopCondition !== "string" || job.stopCondition.trim().length === 0) {
    add("stopCondition must be a non-empty string.");
  }

  validateStringArray(job, "trackIds", issues, { allowEmpty: true });
  if ("acquisitionIds" in job) {
    validateStringArray(job, "acquisitionIds", issues, { allowEmpty: false });
  }
  if ("reconciliationIds" in job) {
    validateStringArray(job, "reconciliationIds", issues, { allowEmpty: false });
  }
  if ("downloadedSourceCount" in job) {
    if (
      !Number.isInteger(job.downloadedSourceCount) ||
      job.downloadedSourceCount < 0
    ) {
      add("downloadedSourceCount must be a non-negative integer.");
    }
  }
  if ("completionCommit" in job) {
    if (
      typeof job.completionCommit !== "string" ||
      !COMMIT_PATTERN.test(job.completionCommit)
    ) {
      add("completionCommit must be a lowercase 40-character Git SHA.");
    }
  }
  validateStringArray(job, "dependencies", issues, { allowEmpty: true, pattern: JOB_ID_PATTERN });
  validateStringArray(job, "requiredOutputFields", issues, { allowEmpty: true });
  for (const field of [
    "ownedPaths",
    "integrationOwnedOutputs",
    "forbiddenPaths",
    "requiredInputs",
    "expectedOutputs"
  ]) {
    validatePathArray(job, field, issues, {
      allowEmpty: !["ownedPaths", "integrationOwnedOutputs", "expectedOutputs"].includes(field)
    });
  }
  for (const field of ["focusedValidation", "integrationValidation"]) {
    validateStringArray(job, field, issues, { allowEmpty: false });
  }

  if (Array.isArray(job.dependencies) && job.dependencies.includes(job.jobId)) {
    add("dependencies may not include the job itself.");
  }

  if (Array.isArray(job.ownedPaths) && Array.isArray(job.forbiddenPaths)) {
    for (const owned of job.ownedPaths) {
      for (const forbidden of job.forbiddenPaths) {
        try {
          if (pathsOverlap(owned, forbidden)) {
            add(`owned path ${owned} overlaps forbidden path ${forbidden}.`);
          }
        } catch {
          // The path-array validation above already records the malformed path.
        }
      }
    }
  }

  if (Array.isArray(job.expectedOutputs) && Array.isArray(job.ownedPaths)) {
    for (const output of job.expectedOutputs) {
      let covered = false;
      for (const owned of job.ownedPaths) {
        try {
          if (pathsOverlap(output, owned) && isPathWithin(output, owned)) {
            covered = true;
            break;
          }
        } catch {
          // The path-array validation above already records the malformed path.
        }
      }
      if (!covered) add(`expected output ${output} is not contained by an owned path.`);
    }
  }

  if (
    Array.isArray(job.integrationOwnedOutputs) &&
    Array.isArray(job.ownedPaths)
  ) {
    for (const integrationOutput of job.integrationOwnedOutputs) {
      for (const owned of job.ownedPaths) {
        try {
          if (pathsOverlap(integrationOutput, owned)) {
            add(
              `integration-owned output ${integrationOutput} overlaps worker-owned path ${owned}.`
            );
          }
        } catch {
          // The path-array validation above already records the malformed path.
        }
      }
    }
  }

  if (
    job.lane === "source_acquisition" &&
    job.strategyFamily !== "edition_publication"
  ) {
    const assignmentField =
      (job.acquisitionIds?.length ?? 0) > 0
        ? "acquisitionIds"
        : (job.reconciliationIds?.length ?? 0) > 0
          ? "reconciliationIds"
          : null;
    if (!assignmentField) {
      add(
        "source-acquisition reconciliation jobs must carry acquisitionIds or reconciliationIds."
      );
    }
    const requiredOutputFields = new Set(job.requiredOutputFields ?? []);
    if (assignmentField && !requiredOutputFields.has(assignmentField)) {
      add(`requiredOutputFields must include ${assignmentField}.`);
    }
    if (!requiredOutputFields.has("downloadedSourceCount")) {
      add("requiredOutputFields must include downloadedSourceCount.");
    }
  }

  return { ok: issues.length === 0, issues };
}

export function validateFactoryPlan(plan) {
  const issues = [];
  if (!plan || typeof plan !== "object" || Array.isArray(plan)) {
    return { ok: false, issues: ["plan must be an object."] };
  }
  if (plan.schemaVersion !== FACTORY_SCHEMA_VERSION) {
    issues.push(`schemaVersion must equal ${FACTORY_SCHEMA_VERSION}.`);
  }
  if (!Array.isArray(plan.jobs)) issues.push("jobs must be an array.");
  if (!Array.isArray(plan.waves)) issues.push("waves must be an array.");
  if (typeof plan.authorityEdition !== "string" || plan.authorityEdition.length === 0) {
    issues.push("authorityEdition must be a non-empty string.");
  }
  if (typeof plan.authorityVersion !== "string" || plan.authorityVersion.length === 0) {
    issues.push("authorityVersion must be a non-empty string.");
  }
  if (typeof plan.baseCommit !== "string" || !COMMIT_PATTERN.test(plan.baseCommit)) {
    issues.push("baseCommit must be a lowercase 40-character Git SHA.");
  }

  const jobs = Array.isArray(plan.jobs) ? plan.jobs : [];
  const ids = new Map();
  jobs.forEach((job, index) => {
    const result = validateJob(job);
    for (const issue of result.issues) {
      issues.push(`jobs[${index}]${job?.jobId ? ` (${job.jobId})` : ""}: ${issue}`);
    }
    if (typeof job?.jobId === "string") {
      if (ids.has(job.jobId)) {
        issues.push(`duplicate jobId ${job.jobId}.`);
      } else {
        ids.set(job.jobId, job);
      }
    }
    if (job?.baseCommit !== plan.baseCommit) {
      issues.push(`${job?.jobId ?? `jobs[${index}]`} has a baseCommit different from the plan.`);
    }
  });

  for (const job of jobs) {
    if (!Array.isArray(job?.dependencies)) continue;
    for (const dependency of job.dependencies) {
      if (!ids.has(dependency)) {
        issues.push(`${job.jobId} depends on missing job ${dependency}.`);
      }
    }
  }

  issues.push(...findDependencyCycles(jobs));
  issues.push(...findOwnedPathOverlaps(jobs));
  issues.push(...validateWaves(plan.waves, ids));

  return { ok: issues.length === 0, issues };
}

export function assertValidJob(job) {
  const result = validateJob(job);
  if (!result.ok) {
    throw new Error(`Invalid RCAP factory job:\n- ${result.issues.join("\n- ")}`);
  }
  return job;
}

export function assertValidFactoryPlan(plan) {
  const result = validateFactoryPlan(plan);
  if (!result.ok) {
    throw new Error(`Invalid RCAP factory plan:\n- ${result.issues.join("\n- ")}`);
  }
  return plan;
}

export function findOwnedPathOverlaps(jobs) {
  const issues = [];
  const owners = [];
  for (const job of jobs.filter(isActiveJob)) {
    if (!Array.isArray(job.ownedPaths)) continue;
    for (const ownedPath of job.ownedPaths) {
      let normalized;
      try {
        normalized = normalizeRepoPath(ownedPath, `${job.jobId}.ownedPaths`);
      } catch {
        continue;
      }
      for (const previous of owners) {
        if (pathsOverlap(normalized, previous.path)) {
          issues.push(
            `active jobs ${previous.jobId} and ${job.jobId} have overlapping owned paths ` +
              `${previous.path} and ${normalized}.`
          );
        }
      }
      owners.push({ jobId: job.jobId, path: normalized });
    }
  }
  return issues;
}

function validateStringArray(object, field, issues, options) {
  const value = object[field];
  if (!Array.isArray(value)) {
    issues.push(`${field} must be an array of strings.`);
    return;
  }
  if (!options.allowEmpty && value.length === 0) {
    issues.push(`${field} may not be empty.`);
  }
  const seen = new Set();
  value.forEach((entry, index) => {
    if (typeof entry !== "string" || entry.trim().length === 0) {
      issues.push(`${field}[${index}] must be a non-empty string.`);
      return;
    }
    if (options.pattern && !options.pattern.test(entry)) {
      issues.push(`${field}[${index}] has an invalid format: ${entry}.`);
    }
    if (seen.has(entry)) issues.push(`${field} contains duplicate value ${entry}.`);
    seen.add(entry);
  });
}

function validatePathArray(object, field, issues, options) {
  const value = object[field];
  if (!Array.isArray(value)) {
    issues.push(`${field} must be an array of repository-relative paths.`);
    return;
  }
  if (!options.allowEmpty && value.length === 0) {
    issues.push(`${field} may not be empty.`);
  }
  const seen = new Set();
  value.forEach((entry, index) => {
    try {
      const normalized = normalizeRepoPath(entry, `${field}[${index}]`);
      if (entry !== normalized) {
        issues.push(`${field}[${index}] is not normalized; use ${normalized}.`);
      }
      if (seen.has(normalized)) issues.push(`${field} contains duplicate path ${normalized}.`);
      seen.add(normalized);
    } catch (error) {
      issues.push(error.message);
    }
  });
}

function isPathWithin(candidate, owner) {
  const child = normalizeRepoPath(candidate, "expected output");
  const parent = normalizeRepoPath(owner, "owned path");
  return child === parent || child.startsWith(`${parent}/`);
}

function findDependencyCycles(jobs) {
  const byId = new Map(jobs.map((job) => [job.jobId, job]));
  const state = new Map();
  const stack = [];
  const issues = [];

  const visit = (jobId) => {
    const current = state.get(jobId);
    if (current === "done") return;
    if (current === "visiting") {
      const start = stack.indexOf(jobId);
      issues.push(`dependency cycle: ${[...stack.slice(start), jobId].join(" -> ")}.`);
      return;
    }
    state.set(jobId, "visiting");
    stack.push(jobId);
    for (const dependency of byId.get(jobId)?.dependencies ?? []) {
      if (byId.has(dependency)) visit(dependency);
    }
    stack.pop();
    state.set(jobId, "done");
  };

  for (const jobId of byId.keys()) visit(jobId);
  return [...new Set(issues)];
}

function validateWaves(waves, jobsById) {
  if (!Array.isArray(waves)) return [];
  const issues = [];
  const seenWaves = new Set();
  const seenJobs = new Set();
  waves.forEach((wave, index) => {
    const prefix = `waves[${index}]`;
    if (!wave || typeof wave !== "object" || Array.isArray(wave)) {
      issues.push(`${prefix} must be an object.`);
      return;
    }
    if (typeof wave.waveId !== "string" || !JOB_ID_PATTERN.test(wave.waveId)) {
      issues.push(`${prefix}.waveId must be lowercase kebab-case.`);
    } else if (seenWaves.has(wave.waveId)) {
      issues.push(`duplicate waveId ${wave.waveId}.`);
    } else {
      seenWaves.add(wave.waveId);
    }
    if (!Array.isArray(wave.jobIds)) {
      issues.push(`${prefix}.jobIds must be an array.`);
    } else {
      for (const jobId of wave.jobIds) {
        if (!jobsById.has(jobId)) issues.push(`${wave.waveId} references missing job ${jobId}.`);
        if (seenJobs.has(jobId)) issues.push(`job ${jobId} appears in more than one wave.`);
        seenJobs.add(jobId);
      }
    }
    if (
      !Array.isArray(wave.integrationValidation) ||
      wave.integrationValidation.some(
        (command) => typeof command !== "string" || command.trim().length === 0
      )
    ) {
      issues.push(`${prefix}.integrationValidation must be an array of shell-command strings.`);
    }
  });
  for (const jobId of jobsById.keys()) {
    if (!seenJobs.has(jobId)) issues.push(`job ${jobId} is not assigned to a wave.`);
  }
  return issues;
}
