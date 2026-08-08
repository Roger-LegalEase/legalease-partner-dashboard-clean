/**
 * Captain-side discovery of worker completions that already exist.
 *
 * Nine of the eleven assignments in the wave this module was written for had a
 * valid, pushed worker branch before their session started, and every one of
 * them read as absent. The cause was not judgement, it was refs: the
 * integration checkout had fetched only its own branch, so `git branch -r`
 * listed no `rcap-factory/*` at all and "no branch exists" was indistinguishable
 * from "no branch was fetched". Work already done was commissioned again.
 *
 * Two rules follow from that and both are enforced here rather than left to a
 * caller's discipline:
 *
 *   1. Refs are fetched explicitly, with a wildcard, before any existence test.
 *      A missing ref is never evidence of a missing branch.
 *   2. A branch is accepted on its assignment, not on its name. The name is a
 *      lookup key; what makes a branch a completion is that it carries the
 *      pinned subject, one parent inside the integration branch's own history,
 *      only the paths the job owns, no binary, and the outputs the job promised.
 *
 * Nothing here writes to a worker branch. There is no push, no fetch into a
 * local branch name, no rewrite, and no force. The module reads.
 */

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

import { assignmentFingerprint, scaffoldKeyFor } from "./scaffold.mjs";
import { canonicalSha256 } from "./canonical-json.mjs";
import { validateChangedPaths } from "./validation.mjs";

export const FACTORY_BRANCH_PREFIX = "rcap-factory/";

/**
 * Every classification a job can hold. Ordered best to worst: the first entry a
 * job qualifies for is the one it reports.
 */
export const COMPLETION_CLASSIFICATIONS = Object.freeze([
  "integrated_completion",
  "exact_completion",
  "valid_pre_claim_branch",
  "valid_legacy_branch",
  "partial_branch",
  "incompatible_branch",
  "no_branch"
]);

const CLASSIFICATION_RANK = new Map(
  COMPLETION_CLASSIFICATIONS.map((value, index) => [value, index])
);

/**
 * The refspecs a captain checkout must fetch before it may conclude anything
 * about which worker branches exist.
 *
 * The integration branch is listed explicitly rather than relied on from the
 * clone's inherited refspec, because the clone that produced the duplicate work
 * was a single-branch clone whose refspec covered exactly one head.
 */
export function factoryFetchRefspecs(
  integrationBranch = "feat/record-clearing-production-integration"
) {
  return [
    `+refs/heads/${integrationBranch}:refs/remotes/origin/${integrationBranch}`,
    `+refs/heads/${FACTORY_BRANCH_PREFIX}*:refs/remotes/origin/${FACTORY_BRANCH_PREFIX}*`
  ];
}

function defaultGit(rootDir) {
  return (args) => {
    const result = spawnSync("git", ["-C", rootDir, ...args], {
      encoding: "utf8",
      maxBuffer: 256 * 1024 * 1024
    });
    return {
      status: result.status ?? 1,
      stdout: result.stdout ?? "",
      stderr: result.stderr ?? ""
    };
  };
}

/**
 * Fetches every factory ref, pruning deleted ones.
 *
 * Returns what it did rather than throwing on a network failure: a captain
 * running offline should get a report that says the refs are stale, not a
 * report that says nine branches vanished.
 */
export function fetchFactoryRefs({
  rootDir = process.cwd(),
  remote = "origin",
  integrationBranch = "feat/record-clearing-production-integration",
  git = defaultGit(path.resolve(rootDir))
} = {}) {
  const refspecs = factoryFetchRefspecs(integrationBranch);
  const result = git(["fetch", remote, "--prune", ...refspecs]);
  return {
    remote,
    refspecs,
    fetched: result.status === 0,
    detail:
      result.status === 0
        ? null
        : (result.stderr || result.stdout || "git fetch failed").trim()
  };
}

/**
 * The branch keys a job's completion could legitimately be under.
 *
 * `canonical` is the key the current assignment produces. `legacy` is the
 * pre-fingerprint key, from before a rebuilt assignment could collide with a
 * branch a previous worker had already pushed. `preClaim` is the key the
 * fingerprint produced while `assignmentClaim` was still inside it, which
 * renamed a branch out from under a worker every time the captain reserved an
 * already-finished job — North Dakota and New York both finished on one.
 *
 * All three are looked up. A completion is not less real for being under an
 * older key, and the branch is never renamed to make it look tidier.
 */
export function candidateBranchKeys(job) {
  const canonical = scaffoldKeyFor(job.jobId, { job, model: job.model });
  const legacy = scaffoldKeyFor(job.jobId);
  const preClaim = scaffoldKeyFor(
    job.jobId,
    preClaimAssignmentFingerprint(job)
  );
  return { canonical, legacy, preClaim };
}

/**
 * The fingerprint a job would have had before `assignmentClaim` was taken out
 * of branch identity. Only `baseCommit`, `completionCommit` and `status` were
 * excluded then.
 */
function preClaimAssignmentFingerprint(job) {
  const rest = Object.fromEntries(
    Object.entries(job).filter(
      ([field]) =>
        !["baseCommit", "completionCommit", "status"].includes(field)
    )
  );
  return canonicalSha256({ ...rest, model: job.model });
}

function gitLines(git, args) {
  const result = git(args);
  if (result.status !== 0) return [];
  return result.stdout.split("\n").filter(Boolean);
}

function gitValue(git, args) {
  const result = git(args);
  if (result.status !== 0) return null;
  return result.stdout.trim() || null;
}

/**
 * Verifies one branch commit against one assignment.
 *
 * Everything below is a property of the commit and the job. None of it is a
 * property of the branch name, which is why a legacy or pre-claim branch can
 * pass and a same-named branch carrying somebody else's work cannot.
 */
export function verifyBranchCompletion(
  job,
  { git, branch, commit, integrationRef = "HEAD" }
) {
  const failures = [];

  const parents = (gitValue(git, ["show", "-s", "--format=%P", commit]) ?? "")
    .split(/\s+/u)
    .filter(Boolean);
  if (parents.length !== 1) {
    failures.push({
      code: "commit_parent_count",
      message: `worker commit must have exactly one parent, found ${parents.length}`
    });
  } else {
    // The captain's rule is broader than the worker's, deliberately. A worker
    // verifies its parent is the exact commit its assignment was scaffolded
    // from. By the time a captain reads the branch the integration tip has
    // usually moved on, and a branch parented on any commit still in the
    // integration branch's history is a branch built on this repository's own
    // work. A parent outside that history is not.
    const contained =
      git(["merge-base", "--is-ancestor", parents[0], integrationRef]).status ===
      0;
    if (!contained) {
      failures.push({
        code: "commit_parent_outside_integration_history",
        message: `worker commit parent ${parents[0]} is not in the integration branch's history`
      });
    }
  }

  const subject = gitValue(git, ["show", "-s", "--format=%s", commit]);
  if (typeof job.commitSubject !== "string" || job.commitSubject.trim() === "") {
    failures.push({
      code: "commit_subject_unassigned",
      message: "job carries no pinned commit subject"
    });
  } else if (subject !== job.commitSubject) {
    failures.push({
      code: "commit_subject_mismatch",
      message: `commit subject must be exactly ${JSON.stringify(job.commitSubject)}, found ${JSON.stringify(subject)}`
    });
  }

  const changedPaths = gitLines(git, [
    "diff-tree",
    "--no-commit-id",
    "--name-only",
    "--diff-filter=ACDMRTUXB",
    "-r",
    commit
  ]).sort((left, right) => left.localeCompare(right));
  for (const violation of validateChangedPaths(job, changedPaths).violations) {
    failures.push({
      code: violation.code ?? "path_not_owned",
      path: violation.path ?? null,
      message: violation.message ?? `${violation.path} is not an owned path`
    });
  }

  const numstat = gitValue(git, [
    "diff-tree",
    "--no-commit-id",
    "--numstat",
    "-r",
    commit
  ]);
  for (const line of (numstat ?? "").split("\n").filter(Boolean)) {
    const [added, removed, changedPath] = line.split(/\t/u);
    if (added === "-" || removed === "-") {
      failures.push({
        code: "binary_in_commit",
        path: changedPath ?? null,
        message: `${changedPath} is a binary change`
      });
    }
  }

  // Marker identity, captain-side. A worker's scaffold marker lives in an
  // ignored path and never reaches a branch, so it cannot be read from here.
  // What can be read is the binding the marker exists to create: the branch key
  // carries the assignment fingerprint, so a branch under a key no current or
  // historical fingerprint produces is carrying an assignment nobody issued.
  const keys = candidateBranchKeys(job);
  const branchKey = branch.startsWith(FACTORY_BRANCH_PREFIX)
    ? branch.slice(FACTORY_BRANCH_PREFIX.length)
    : branch;
  const keyKind =
    branchKey === keys.canonical
      ? "canonical"
      : branchKey === keys.preClaim
        ? "pre_claim"
        : branchKey === keys.legacy
          ? "legacy"
          : "unrecognized";
  if (keyKind === "unrecognized") {
    failures.push({
      code: "assignment_marker_identity",
      message: `branch key ${branchKey} matches no assignment fingerprint this job has held`
    });
  }

  const missingOutputs = (job.expectedOutputs ?? []).filter(
    (relativePath) =>
      git(["cat-file", "-e", `${commit}:${relativePath}`]).status !== 0
  );

  return {
    branch,
    commit,
    keyKind,
    subject,
    parents,
    changedPaths,
    missingOutputs,
    failures
  };
}

/**
 * True when every path the branch touched already carries the branch's exact
 * blob on the integration branch. Blob equality, not commit ancestry: a captain
 * integrates by adopting worker blobs into a captain commit, so the worker
 * commit is never an ancestor of anything.
 */
function branchAlreadyIntegrated(git, verification, integrationRef) {
  if (verification.changedPaths.length === 0) return false;
  return verification.changedPaths.every((relativePath) => {
    const workerBlob = gitValue(git, [
      "rev-parse",
      `${verification.commit}:${relativePath}`
    ]);
    if (git(["cat-file", "-e", `${verification.commit}:${relativePath}`]).status !== 0) {
      // Deleted by the worker: integrated when it is absent on the branch too.
      return (
        git(["cat-file", "-e", `${integrationRef}:${relativePath}`]).status !== 0
      );
    }
    if (git(["cat-file", "-e", `${integrationRef}:${relativePath}`]).status !== 0) {
      return false;
    }
    const integrationBlob = gitValue(git, [
      "rev-parse",
      `${integrationRef}:${relativePath}`
    ]);
    return workerBlob !== null && workerBlob === integrationBlob;
  });
}

function classifyVerification(verification, integrated) {
  if (verification.failures.length > 0) return "incompatible_branch";
  if (integrated) return "integrated_completion";
  if (verification.missingOutputs.length > 0) return "partial_branch";
  if (verification.keyKind === "pre_claim") return "valid_pre_claim_branch";
  if (verification.keyKind === "legacy") return "valid_legacy_branch";
  return "exact_completion";
}

function better(left, right) {
  return CLASSIFICATION_RANK.get(left) <= CLASSIFICATION_RANK.get(right)
    ? left
    : right;
}

/**
 * Discovers, for every selected job, whether a completion already exists.
 *
 * `fetch` defaults to true and is the whole point: a discovery run that skipped
 * the fetch would reproduce the defect this module exists to remove. It is
 * settable only so tests can drive a fixture repository.
 */
export function discoverCompletions(
  plan,
  {
    rootDir = process.cwd(),
    jobIds = null,
    statuses = ["ready", "in_progress", "blocked"],
    remote = "origin",
    integrationBranch = "feat/record-clearing-production-integration",
    integrationRef = "HEAD",
    fetch = true,
    git = defaultGit(path.resolve(rootDir))
  } = {}
) {
  const fetchResult = fetch
    ? fetchFactoryRefs({ rootDir, remote, integrationBranch, git })
    : { remote, refspecs: factoryFetchRefspecs(integrationBranch), fetched: false, detail: "fetch skipped by caller" };

  const remoteBranches = gitLines(git, [
    "for-each-ref",
    "--format=%(refname:short) %(objectname)",
    `refs/remotes/${remote}/${FACTORY_BRANCH_PREFIX}`
  ]).map((line) => {
    const [ref, commit] = line.split(" ");
    return {
      ref,
      branch: ref.slice(`${remote}/`.length),
      commit
    };
  });
  const byBranch = new Map(
    remoteBranches.map((entry) => [entry.branch, entry])
  );

  const selected = plan.jobs.filter((job) => {
    if (Array.isArray(jobIds) && jobIds.length > 0) {
      return jobIds.includes(job.jobId);
    }
    return statuses.includes(job.status);
  });

  const jobs = selected.map((job) => {
    const keys = candidateBranchKeys(job);
    const candidateBranches = [
      ...new Set([
        `${FACTORY_BRANCH_PREFIX}${keys.canonical}`,
        `${FACTORY_BRANCH_PREFIX}${keys.preClaim}`,
        `${FACTORY_BRANCH_PREFIX}${keys.legacy}`,
        // Anything else scaffolded for this job id under some other assignment
        // — a reissued assignment leaves the previous worker's branch behind
        // and it is worth surfacing even though it must not be integrated.
        //
        // Matched on the job-id digest, not on the slug prefix. A slug prefix
        // is not a job identity: `rcap-fl-public-official-download` is a prefix
        // of `rcap-fl-public-official-download-fdle-fac-supersession`, and
        // matching on it made a second job's valid completion read as the first
        // job's incompatible branch.
        ...remoteBranches
          .map((entry) => entry.branch)
          .filter((branch) => jobBranchPattern(job.jobId).test(branch))
      ])
    ];

    const branches = [];
    for (const branch of candidateBranches) {
      const found = byBranch.get(branch);
      if (!found) continue;
      const verification = verifyBranchCompletion(job, {
        git,
        branch,
        commit: found.commit,
        integrationRef
      });
      const integrated = branchAlreadyIntegrated(
        git,
        verification,
        integrationRef
      );
      branches.push({
        ...verification,
        classification: classifyVerification(verification, integrated)
      });
    }
    branches.sort(
      (left, right) =>
        CLASSIFICATION_RANK.get(left.classification) -
          CLASSIFICATION_RANK.get(right.classification) ||
        left.branch.localeCompare(right.branch)
    );

    const classification = branches.reduce(
      (best, entry) => better(best, entry.classification),
      "no_branch"
    );
    const completion =
      branches.find((entry) => entry.classification === classification) ?? null;

    return {
      jobId: job.jobId,
      lane: job.lane,
      jurisdiction: job.jurisdiction,
      status: job.status,
      assignmentFingerprint: assignmentFingerprint(job, job.model),
      canonicalBranch: `${FACTORY_BRANCH_PREFIX}${keys.canonical}`,
      legacyBranch: `${FACTORY_BRANCH_PREFIX}${keys.legacy}`,
      preClaimBranch: `${FACTORY_BRANCH_PREFIX}${keys.preClaim}`,
      ownedPaths: [...(job.ownedPaths ?? [])],
      expectedOutputs: [...(job.expectedOutputs ?? [])],
      classification,
      completionBranch: completion?.branch ?? null,
      completionCommit: completion?.commit ?? null,
      branches
    };
  });

  jobs.sort((left, right) => left.jobId.localeCompare(right.jobId));

  return {
    schemaVersion: "rcap-captain-completion-discovery/v1",
    baseCommit: plan.baseCommit,
    fetch: fetchResult,
    remoteFactoryBranches: remoteBranches.length,
    totals: Object.fromEntries(
      COMPLETION_CLASSIFICATIONS.map((value) => [
        value,
        jobs.filter((entry) => entry.classification === value).length
      ])
    ),
    jobs
  };
}

/**
 * Branches that belong to exactly this job id.
 *
 * A scaffold key is `<slug>-<sha256(jobId)[0..8]>` with an optional
 * `-<assignmentFingerprint[0..8]>`. The digest is what makes it an identity —
 * the slug is truncated at 64 characters and is a prefix of longer job ids.
 */
function jobBranchPattern(jobId) {
  const legacyKey = scaffoldKeyFor(jobId);
  const escaped = legacyKey.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  return new RegExp(
    `^${FACTORY_BRANCH_PREFIX}${escaped}(-[0-9a-f]{8})?$`,
    "u"
  );
}

const INTEGRABLE = new Set([
  "exact_completion",
  "valid_pre_claim_branch",
  "valid_legacy_branch"
]);

/**
 * Turns a discovery report into an ordered integration plan.
 *
 * Order is decisions before implementations, because an implementation
 * integrated ahead of the legal design it is built on registers a completion
 * against a design that has not landed. Within a lane the order is the job id,
 * so a plan is reproducible.
 */
const LANE_ORDER = [
  "legal_design_normalization",
  "source_acquisition",
  "platform_foundation",
  "custom_pleading",
  "guidance_implementation",
  "acroform_fill",
  "flat_pdf_overlay",
  "composed_route",
  "legal_output_review",
  "staging_promotion"
];

export function planIntegrations(
  discovery,
  { jobIds = null, waveManifest = null, activeWorkerJobIds = [] } = {}
) {
  const requested = Array.isArray(jobIds) && jobIds.length > 0
    ? new Set(jobIds)
    : waveManifest
      ? new Set(
          (waveManifest.shards ?? []).flatMap((shard) => shard.jobIds ?? [])
        )
      : null;

  const active = new Set(activeWorkerJobIds);
  const considered = discovery.jobs.filter(
    (entry) => !requested || requested.has(entry.jobId)
  );

  const steps = [];
  const pathOwners = new Map();
  for (const entry of considered) {
    const disposition = active.has(entry.jobId)
      ? "refused_active_worker"
      : entry.classification === "integrated_completion"
        ? "already_integrated"
        : INTEGRABLE.has(entry.classification)
          ? "integrate"
          : entry.classification === "partial_branch"
            ? "correction_required"
            : entry.classification === "incompatible_branch"
              ? "blocked"
              : "no_completion";

    const conflicts = [];
    if (disposition === "integrate") {
      for (const relativePath of entry.ownedPaths) {
        const owner = pathOwners.get(relativePath);
        if (owner && owner !== entry.jobId) conflicts.push({ path: relativePath, owner });
        pathOwners.set(relativePath, entry.jobId);
      }
    }

    steps.push({
      jobId: entry.jobId,
      lane: entry.lane,
      jurisdiction: entry.jurisdiction,
      classification: entry.classification,
      disposition: conflicts.length > 0 ? "blocked" : disposition,
      branch: entry.completionBranch,
      commit: entry.completionCommit,
      ownedPaths: entry.ownedPaths,
      sharedFileConflicts: conflicts,
      reason:
        conflicts.length > 0
          ? `owned path already claimed in this plan by ${conflicts[0].owner}`
          : disposition === "blocked"
            ? (entry.branches.find(
                (branch) => branch.classification === "incompatible_branch"
              )?.failures?.[0]?.message ?? "assignment does not verify")
            : disposition === "correction_required"
              ? `branch is missing expected outputs: ${
                  entry.branches.find(
                    (branch) => branch.classification === "partial_branch"
                  )?.missingOutputs?.join(", ") ?? "unknown"
                }`
              : null
    });
  }

  steps.sort(
    (left, right) =>
      (LANE_ORDER.indexOf(left.lane) + 1 || LANE_ORDER.length + 1) -
        (LANE_ORDER.indexOf(right.lane) + 1 || LANE_ORDER.length + 1) ||
      left.jobId.localeCompare(right.jobId)
  );

  const independent = steps
    .filter(
      (step) =>
        step.disposition === "integrate" && step.sharedFileConflicts.length === 0
    )
    .map((step) => step.jobId);

  return {
    schemaVersion: "rcap-captain-integration-plan/v1",
    baseCommit: discovery.baseCommit,
    fetch: discovery.fetch,
    totals: Object.fromEntries(
      ["integrate", "already_integrated", "blocked", "correction_required", "no_completion", "refused_active_worker"].map(
        (value) => [value, steps.filter((step) => step.disposition === value).length]
      )
    ),
    independentJobIds: independent,
    steps
  };
}

/**
 * Applies one verified completion by adopting its exact blobs.
 *
 * `git checkout <commit> -- <path>` rather than a cherry-pick: the captain is
 * carrying a worker's payload onto a branch whose other files have moved on,
 * and the thing that must survive intact is the blob, not the commit graph. A
 * conflict is impossible by construction, which is why this stops on a
 * verification failure instead of on a merge.
 *
 * Refuses unless the integration branch is clean, so a half-finished captain
 * edit cannot be swept into an integration commit.
 */
export function applyIntegrationStep(
  step,
  { rootDir = process.cwd(), git = defaultGit(path.resolve(rootDir)) } = {}
) {
  if (step.disposition !== "integrate") {
    throw new Error(`${step.jobId}: ${step.disposition} is not an integrable disposition`);
  }
  const dirty = gitLines(git, ["status", "--porcelain=v1", "--untracked-files=no"]);
  if (dirty.length > 0) {
    throw new Error(
      "the integration branch has uncommitted tracked changes; commit or stash before applying"
    );
  }
  const changed = gitLines(git, [
    "diff-tree",
    "--no-commit-id",
    "--name-status",
    "-r",
    step.commit
  ]);
  const applied = [];
  for (const line of changed) {
    const [statusCode, relativePath] = line.split(/\t/u);
    if (!relativePath) continue;
    if (statusCode.startsWith("D")) {
      const removal = git(["rm", "--quiet", "--", relativePath]);
      if (removal.status !== 0) {
        throw new Error(`${step.jobId}: could not remove ${relativePath}`);
      }
    } else {
      const checkout = git(["checkout", step.commit, "--", relativePath]);
      if (checkout.status !== 0) {
        throw new Error(`${step.jobId}: could not adopt ${relativePath}`);
      }
    }
    applied.push(relativePath);
  }
  return {
    jobId: step.jobId,
    branch: step.branch,
    commit: step.commit,
    appliedPaths: applied
  };
}

/** Reads a frozen wave manifest if one is present. */
export function readWaveManifest(rootDir, relativePath) {
  const absolute = path.join(rootDir, relativePath);
  if (!fs.existsSync(absolute)) return null;
  return JSON.parse(fs.readFileSync(absolute, "utf8"));
}
