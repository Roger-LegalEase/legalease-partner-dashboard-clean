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

/**
 * C7. Decide whether this execution may proceed at all, before checkout, before
 * setup, before any secret is read and before any external request.
 *
 * Fails closed: an unset expected value is not a pass, it is an unconfigured
 * control plane. `jobWorkflowSha` is github.job_workflow_sha — the commit the
 * called reusable workflow itself resolved from — so caller and callee are
 * proven to come from one execution authority rather than assumed to.
 */
export function evaluateExecutionAuthority({
  githubSha,
  githubRef,
  jobWorkflowSha = null,
  expectedSha,
  expectedRef
}) {
  const reasons = [];
  if (!expectedSha) reasons.push("RCAP_AUTHORIZED_INFRASTRUCTURE_SHA is not configured");
  else if (!FULL_SHA.test(expectedSha)) reasons.push(`RCAP_AUTHORIZED_INFRASTRUCTURE_SHA is not a full commit SHA: ${expectedSha}`);
  if (!expectedRef) reasons.push("RCAP_AUTHORIZED_EXECUTION_REF is not configured");
  if (!githubSha || !FULL_SHA.test(githubSha)) reasons.push(`github.sha is not a full commit SHA: ${githubSha ?? "<empty>"}`);
  if (!githubRef) reasons.push("github.ref is empty");

  if (expectedSha && githubSha && expectedSha !== githubSha) {
    reasons.push(`github.sha ${githubSha} is not the authorized infrastructure SHA ${expectedSha}`);
  }
  if (expectedRef && githubRef && expectedRef !== githubRef) {
    reasons.push(`github.ref ${githubRef} is not the authorized execution ref ${expectedRef}`);
  }
  // A reusable workflow resolved from a different commit than its caller would
  // mean two execution authorities in one run.
  if (jobWorkflowSha && githubSha && jobWorkflowSha !== githubSha) {
    reasons.push(`the called workflow resolved from ${jobWorkflowSha}, the caller from ${githubSha}`);
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
