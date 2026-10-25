// RCAP acceptance — control / application / worker execution authority.
//
// ENV-007 correction C1. Three trees, three authorities, one of which is the
// only one that may ever execute:
//
//   control/      the exact reviewed infrastructure commit (github.sha).
//                 Owns migration authorization, the migration manifest, the
//                 schema snapshots, the migration runner, evidence generation,
//                 boundary verification and acceptance orchestration.
//   application/  the pinned application_source_sha. Build and Preview
//                 deployment source, and nothing else.
//   worker/       the pinned worker_source_sha. Worker image inputs and the
//                 worker contract comparison, and nothing else.
//
// Before this correction a single checkout was replaced in place by
// `git checkout --detach ${{ inputs.tools_sha }}`, so every orchestration
// script — the migration runner included — executed from a caller-supplied
// commit. This module is the shared, testable definition of the boundary the
// workflow now enforces.

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

/** Workspace-relative checkout roots. These names are part of the contract. */
export const CONTROL_ROOT = "control";
export const APPLICATION_ROOT = "application";
export const WORKER_ROOT = "worker";

export const CHECKOUT_ROOTS = Object.freeze({
  control: CONTROL_ROOT,
  application: APPLICATION_ROOT,
  worker: WORKER_ROOT
});

/**
 * Every file the control tree must carry before a database credential or any
 * network-capable write step may run. Absence is a refusal, never a skip.
 */
export const REQUIRED_CONTROL_FILES = Object.freeze([
  "scripts/lib/rcap-migration-manifest.mjs",
  "scripts/lib/rcap-acceptance-schema-snapshot.mjs",
  "scripts/rcap-hosted-acceptance-migrate.mjs",
  "data/rcap-acceptance-migration-manifest.json"
]);

/** The reviewed migration manifest hash. A different value is a different control plane. */
export const AUTHORIZED_MANIFEST_HASH =
  "01a7e8488df436b9366b381f0ba3cb12cdb17c93725603c044b9a8194fb9b4e4";

/**
 * The superseded orchestration commit. It carried the regex-selecting migration
 * runner that applied phase 55 twice. No phase may select or execute it.
 */
export const RETIRED_TOOLS_COMMIT_PREFIX = "6d9e8792";

export const AUTHORITY_INVALID = "INFRASTRUCTURE_EXECUTION_AUTHORITY_INVALID";
export const CONTROL_PLANE_INVALID = "CONTROL_PLANE_AUTHORITY_INVALID";

/** Non-secret configuration names. Values are supplied by repository/environment configuration. */
export const AUTHORITY_VARIABLE_NAMES = Object.freeze([
  "RCAP_AUTHORIZED_INFRASTRUCTURE_SHA",
  "RCAP_AUTHORIZED_EXECUTION_REF"
]);

const FULL_SHA = /^[0-9a-f]{40}$/;

export const HOSTED_WORKFLOW_FILE_PATH = ".github/workflows/rcap-hosted-acceptance-staging.yml";

/**
 * C7 / F1. Decide whether this execution may proceed at all, before checkout,
 * before setup, before any secret is read and before any external request.
 *
 * DOCUMENTED CONTRACT ONLY. The earlier implementation compared a workflow-SHA
 * property on the `github` context that GitHub does not define; it resolved to
 * the empty string, the comparison skipped on empty, and the gate asserted
 * nothing while reporting agreement. What GitHub actually documents:
 *
 *   github.workflow_sha      the workflow in the github context, which inside a
 *                            reusable workflow stays associated with the CALLER
 *   job.workflow_sha         the commit of the workflow file defining THIS job
 *   job.workflow_ref         its full ref, `<owner>/<repo>/<path>@<ref>`
 *   job.workflow_repository  its repository
 *   job.workflow_file_path   its path
 *
 * Fails closed on every axis: an unset expected value, an empty observed value
 * and a mismatched value are all refusals. `called: false` evaluates the caller
 * gate, which has no `job.workflow_*` to compare.
 */
export function evaluateExecutionAuthority({
  githubSha,
  githubRef,
  githubWorkflowSha,
  githubRepository = null,
  jobWorkflowSha = null,
  jobWorkflowRef = null,
  jobWorkflowRepository = null,
  jobWorkflowFilePath = null,
  expectedSha,
  expectedRef,
  expectedWorkflowFilePath = HOSTED_WORKFLOW_FILE_PATH,
  called = true
}) {
  const reasons = [];
  const present = (label, value) => {
    if (value === undefined || value === null || value === "") {
      reasons.push(`${label} is missing or empty`);
      return false;
    }
    return true;
  };
  const equal = (label, observed, expected, expectedLabel) => {
    if (!present(label, observed)) return false;
    if (!present(expectedLabel ?? `expected value for ${label}`, expected)) return false;
    if (observed !== expected) {
      reasons.push(`${label} is '${observed}'; expected '${expected}'`);
      return false;
    }
    return true;
  };

  present("RCAP_AUTHORIZED_INFRASTRUCTURE_SHA", expectedSha);
  present("RCAP_AUTHORIZED_EXECUTION_REF", expectedRef);
  if (expectedSha && !FULL_SHA.test(expectedSha)) {
    reasons.push(`RCAP_AUTHORIZED_INFRASTRUCTURE_SHA is not a full commit SHA: ${expectedSha}`);
  }

  equal("github.sha", githubSha, expectedSha, "RCAP_AUTHORIZED_INFRASTRUCTURE_SHA");
  equal("github.workflow_sha", githubWorkflowSha, expectedSha, "RCAP_AUTHORIZED_INFRASTRUCTURE_SHA");
  equal("github.ref", githubRef, expectedRef, "RCAP_AUTHORIZED_EXECUTION_REF");

  if (called) {
    equal("job.workflow_sha", jobWorkflowSha, expectedSha, "RCAP_AUTHORIZED_INFRASTRUCTURE_SHA");
    equal("job.workflow_repository", jobWorkflowRepository, githubRepository, "github.repository");
    equal("job.workflow_file_path", jobWorkflowFilePath, expectedWorkflowFilePath, "the hosted workflow path");
    if (present("job.workflow_ref", jobWorkflowRef)) {
      if (githubRepository && !jobWorkflowRef.includes(githubRepository)) {
        reasons.push(`job.workflow_ref '${jobWorkflowRef}' does not name repository '${githubRepository}'`);
      }
      if (!jobWorkflowRef.includes(expectedWorkflowFilePath)) {
        reasons.push(`job.workflow_ref '${jobWorkflowRef}' does not name '${expectedWorkflowFilePath}'`);
      }
      if (expectedRef && !jobWorkflowRef.endsWith(`@${expectedRef}`)) {
        reasons.push(`job.workflow_ref '${jobWorkflowRef}' does not end at the authorized execution ref '${expectedRef}'`);
      }
    }
  }

  return { ok: reasons.length === 0, code: reasons.length === 0 ? null : AUTHORITY_INVALID, reasons };
}

const sha256File = (abs) => crypto.createHash("sha256").update(fs.readFileSync(abs)).digest("hex");

/**
 * C1. Prove the control tree really is the reviewed control plane, and that the
 * migration runner it carries reads the manifest from the same tree.
 *
 * `migrationHashes` is the seven-member `<basename> -> sha256` map the manifest
 * records; every one is checked against the control tree's own SQL bytes.
 */
export function evaluateControlPlane({
  controlDir,
  controlSha,
  authorizedSha,
  migrationsRootDir = "supabase",
  migrationHashes = {},
  requiredFiles = REQUIRED_CONTROL_FILES,
  authorizedManifestHash = AUTHORIZED_MANIFEST_HASH,
  manifestHash = null
}) {
  const reasons = [];
  if (!controlSha || !FULL_SHA.test(controlSha)) reasons.push(`control commit is not a full SHA: ${controlSha ?? "<empty>"}`);
  if (!authorizedSha) reasons.push("no authorized infrastructure SHA supplied");
  else if (controlSha && controlSha !== authorizedSha) {
    reasons.push(`control commit ${controlSha} is not the authorized infrastructure SHA ${authorizedSha}`);
  }

  for (const rel of requiredFiles) {
    const abs = path.join(controlDir, rel);
    if (!fs.existsSync(abs)) reasons.push(`control tree is missing ${rel}`);
  }

  if (manifestHash !== null && manifestHash !== authorizedManifestHash) {
    reasons.push(`manifest hash ${manifestHash} is not the authorized ${authorizedManifestHash}`);
  }

  const migrationEntries = Object.entries(migrationHashes).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  if (migrationEntries.length !== 7) {
    reasons.push(`expected seven migration hashes, the manifest declares ${migrationEntries.length}`);
  }
  const checked = [];
  for (const [basename, expected] of migrationEntries) {
    const abs = path.join(controlDir, migrationsRootDir, basename);
    if (!fs.existsSync(abs)) { reasons.push(`control tree is missing ${migrationsRootDir}/${basename}`); continue; }
    const actual = sha256File(abs);
    checked.push({ basename, expected, actual, match: actual === expected });
    if (actual !== expected) reasons.push(`${basename} sha256 ${actual} is not the manifest's ${expected}`);
  }

  // The runner must import the control-plane manifest module by relative path,
  // so it cannot be handed a manifest from another tree.
  const runnerRel = "scripts/rcap-hosted-acceptance-migrate.mjs";
  const runnerAbs = path.join(controlDir, runnerRel);
  let importsControlManifest = false;
  if (fs.existsSync(runnerAbs)) {
    const src = fs.readFileSync(runnerAbs, "utf8");
    importsControlManifest = /from\s+["']\.\/lib\/rcap-migration-manifest\.mjs["']/.test(src);
    if (!importsControlManifest) reasons.push(`${runnerRel} does not import ./lib/rcap-migration-manifest.mjs`);
  }

  return {
    ok: reasons.length === 0,
    code: reasons.length === 0 ? null : CONTROL_PLANE_INVALID,
    reasons,
    migrationsChecked: checked,
    importsControlManifest
  };
}

/**
 * C1. tools_sha is no longer an executable authority. It survives as a
 * provenance label that may name the control plane and nothing else, so no
 * caller-supplied commit — the retired 6d9e8792 runner included — can be
 * selected for execution.
 */
export function evaluateToolsShaLabel({ toolsSha, controlSha }) {
  const reasons = [];
  if (!toolsSha || !FULL_SHA.test(toolsSha)) {
    reasons.push(`tools_sha must be a full commit SHA: ${toolsSha ?? "<empty>"}`);
  } else if (toolsSha !== controlSha) {
    reasons.push(
      `tools_sha ${toolsSha} does not name the control plane ${controlSha}; ` +
      "tools_sha is a label, never a checkout target"
    );
  }
  return { ok: reasons.length === 0, code: reasons.length === 0 ? null : AUTHORITY_INVALID, reasons };
}
