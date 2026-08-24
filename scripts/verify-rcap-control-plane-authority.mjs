#!/usr/bin/env node
// ENV-007 — C1..C7 CORRECTION REGRESSION SUITE.
//
// Static and simulated only: no network, no database, no registry, no
// deployment, no workflow dispatch. Every check is named and reported.
//
//   node scripts/verify-rcap-control-plane-authority.mjs

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import yaml from "./control/rcap-minimal-yaml.mjs";

import {
  AUTHORIZED_MANIFEST_HASH,
  APPLICATION_ROOT,
  CONTROL_ROOT,
  HOSTED_WORKFLOW_FILE_PATH,
  REQUIRED_CONTROL_FILES,
  RETIRED_TOOLS_COMMIT_PREFIX,
  WORKER_ROOT,
  evaluateControlPlane,
  evaluateExecutionAuthority,
  evaluateToolsShaLabel
} from "./control/rcap-execution-authority.mjs";
import {
  buildWorkerImageInputManifestAtCommit,
  parseBuildContextSpecs,
  verifyNoUnlistedInput
} from "./control/rcap-worker-image-inputs.mjs";
import { evaluateExpression, isTrue, extractExpressions } from "./control/rcap-workflow-expression.mjs";
import { loadManifest, computeManifestHash } from "./lib/rcap-migration-manifest.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => fs.readFileSync(path.join(rootDir, rel), "utf8");
const git = (...a) => execFileSync("git", a, { cwd: rootDir, encoding: "utf8", maxBuffer: 1 << 28 });

const HOSTED = ".github/workflows/rcap-hosted-acceptance-staging.yml";
const F1 = ".github/workflows/rcap-f1-ephemeral-staging.yml";
const FALLBACK = ".github/workflows/rcap-github-hosted-acceptance.yml";
const INFRA_BASE_SHA = "dd93579871962260b12918e54c44cf9bf1e81529";
const AUDIT_SHA = "00212d529e82a2a2a90b172b29268922feecfcbd";
const REJECTED_CANDIDATE = "a22066423096882f1f202990519f1dcb0d96afca";

const hostedText = read(HOSTED);
const f1Text = read(F1);
const fallbackText = read(FALLBACK);
const hosted = yaml.parse(hostedText);
const f1 = yaml.parse(f1Text);

// Absence claims are made about EXECUTABLE content only. A comment that quotes
// the construct it replaced — "routing was `startsWith(inputs.mode, 'hosted_')`"
// — must not make the check that the construct is gone report that it is still
// there.
const executableText = (text) => text.split("\n").filter((l) => !l.trim().startsWith("#")).join("\n");
const hostedExec = executableText(hostedText);
const f1Exec = executableText(f1Text);

const results = [];
function check(id, ok, observed) {
  results.push({ id, ok: Boolean(ok), observed });
  console.log(`${ok ? "PASS" : "FAIL"}  ${id}`);
  console.log(`      ${observed}`);
}

const stepsOf = (wf, job) => wf.jobs[job]?.steps ?? [];
const stepById = (wf, job, id) => stepsOf(wf, job).find((s) => s.id === id);
const indexById = (wf, job, id) => stepsOf(wf, job).findIndex((s) => s.id === id);
const indexByName = (wf, job, name) => stepsOf(wf, job).findIndex((s) => (s.name ?? "") === name);

// ===========================================================================
// C1 — control, application and worker are separate executable authorities
// ===========================================================================
{
  const jobs = ["readonly_probe", "hosted_write", "hosted_payment"];
  const offenders = [];
  const controlSteps = [];
  for (const job of jobs) {
    for (const s of stepsOf(hosted, job)) {
      const run = s.run;
      if (typeof run !== "string") continue;
      const touchesTree = /\bnode scripts\//.test(run) || /\bnpm (ci|run)\b/.test(run) || /\bgit\s/.test(run);
      if (!touchesTree) continue;
      const wd = s["working-directory"];
      if (!wd) { offenders.push(`${job}/${s.id ?? s.name}: no working-directory`); continue; }
      if (![CONTROL_ROOT, APPLICATION_ROOT, WORKER_ROOT].includes(wd)) {
        offenders.push(`${job}/${s.id ?? s.name}: working-directory ${wd}`); continue;
      }
      if (/\bnode scripts\//.test(run) && wd !== CONTROL_ROOT) {
        offenders.push(`${job}/${s.id ?? s.name}: runs an orchestration script from ${wd}`); continue;
      }
      if (wd === CONTROL_ROOT) controlSteps.push(`${job}/${s.id ?? s.name}`);
    }
  }
  const applicationSteps = jobs.flatMap((job) =>
    stepsOf(hosted, job).filter((s) => s["working-directory"] === APPLICATION_ROOT).map((s) => `${job}/${s.id}`)
  );
  check(
    "c1_control_scripts_execute_only_from_control",
    offenders.length === 0 && controlSteps.length > 0 && applicationSteps.length > 0,
    offenders.length === 0
      ? `${controlSteps.length} tree-touching steps run from ${CONTROL_ROOT}/ and every one that invokes \`node scripts/\` does; ${applicationSteps.length} build steps run from ${APPLICATION_ROOT}/ (${applicationSteps.join(", ")}); no orchestration script runs from any other tree`
      : `steps executing outside the control tree: ${offenders.join("; ")}`
  );
}

{
  const jobs = ["readonly_probe", "hosted_write", "hosted_payment"];
  const rows = [];
  for (const job of jobs) {
    for (const s of stepsOf(hosted, job)) {
      if (typeof s.uses === "string" && s.uses.startsWith("actions/checkout")) {
        rows.push({ job, path: s.with?.path, ref: s.with?.ref, repository: s.with?.repository });
      }
    }
  }
  const perJob = jobs.map((j) => rows.filter((r) => r.job === j));
  const shapeOk = perJob.every((rs) =>
    rs.length === 3 &&
    // F1 — the control tree is bound to the reusable workflow's OWN documented
    // identity, not to the caller's github.sha.
    rs.some((r) => r.path === CONTROL_ROOT &&
      r.ref === "${{ job.workflow_sha }}" &&
      r.repository === "${{ job.workflow_repository }}") &&
    rs.some((r) => r.path === APPLICATION_ROOT && r.ref === "${{ inputs.application_sha }}") &&
    rs.some((r) => r.path === WORKER_ROOT && r.ref === "${{ inputs.worker_source_sha }}")
  );
  const noRootCheckout = rows.every((r) => Boolean(r.path));
  // No executable line may move the control tree.
  const mutations = hostedExec.split("\n").filter((l) => /\bgit (checkout|reset|switch)\b/.test(l));
  check(
    "c1_application_and_worker_checkouts_cannot_overwrite_control",
    shapeOk && noRootCheckout && mutations.length === 0,
    shapeOk && noRootCheckout && mutations.length === 0
      ? `each of ${jobs.join(", ")} checks out exactly three trees at distinct paths — ${CONTROL_ROOT}/ at job.workflow_sha from job.workflow_repository, ${APPLICATION_ROOT}/ at application_sha, ${WORKER_ROOT}/ at worker_source_sha — none at the workspace root, and no executable git checkout/reset/switch line exists anywhere in the workflow`
      : `shape=${shapeOk} rootless=${noRootCheckout} tree-mutating lines=${JSON.stringify(mutations)}`
  );
}

{
  // tools_sha must never be a checkout ref, in any workflow.
  const asRef = [hostedText, f1Text].some((t) =>
    /ref:\s*\$\{\{\s*inputs\.tools_sha/.test(t) || /checkout --detach\s+"?\$\{\{\s*inputs\.tools_sha/.test(t.replace(/^\s*#.*$/gm, ""))
  );
  const f1RequiresLabel = /\[ "\$\{\{ inputs\.tools_sha \}\}" = "\$\{\{ github\.sha \}\}" \]/.test(f1Text);
  const gateRunsLabelCheck = read("scripts/rcap-verify-control-plane.mjs").includes("evaluateToolsShaLabel");
  const retired = `${RETIRED_TOOLS_COMMIT_PREFIX}${"0".repeat(32)}`;
  const refusesRetired = evaluateToolsShaLabel({ toolsSha: retired, controlSha: REJECTED_CANDIDATE }).ok === false;
  const acceptsControl = evaluateToolsShaLabel({ toolsSha: REJECTED_CANDIDATE, controlSha: REJECTED_CANDIDATE }).ok === true;
  // The one remaining `git checkout --detach "$REQUESTED_TOOLS_SHA"` lives in
  // the retired fallback, whose FIRST step exits 1 unconditionally.
  const fallbackFirstRefuses = (() => {
    const fb = yaml.parse(fallbackText);
    const steps = fb.jobs?.acceptance?.steps ?? [];
    const first = steps[0] ?? {};
    const body = String(first.run ?? "");
    // Structural, not textual: the FIRST step of the only job refuses
    // unconditionally and exits 1, so no later step — the detach included — is
    // reachable. Index comparisons over raw text would be fooled by the comment
    // that explains the detach.
    return /retired/i.test(String(first.name ?? "")) &&
      first.if === undefined &&
      body.includes("GITHUB_ACCEPTANCE_RETIRED") && /exit 1/.test(body) &&
      executableText(fallbackText).indexOf("GITHUB_ACCEPTANCE_RETIRED") <
        executableText(fallbackText).indexOf("git checkout --detach");
  })();
  check(
    "c1_old_tools_runner_cannot_execute",
    !asRef && f1RequiresLabel && gateRunsLabelCheck && refusesRetired && acceptsControl && fallbackFirstRefuses,
    !asRef && f1RequiresLabel && gateRunsLabelCheck && refusesRetired && acceptsControl && fallbackFirstRefuses
      ? `tools_sha appears as a checkout ref in no workflow; the F1 rehearsal requires tools_sha == github.sha; the control gate runs evaluateToolsShaLabel, which refuses ${retired.slice(0, 8)}… and accepts only the control commit; the retired fallback's own first step exits 1 before its detach line is reachable`
      : `ref=${asRef} f1Label=${f1RequiresLabel} gate=${gateRunsLabelCheck} refusesRetired=${refusesRetired} acceptsControl=${acceptsControl} fallback=${fallbackFirstRefuses}`
  );
}

{
  const gate = read("scripts/rcap-verify-control-plane.mjs");
  const readsControlDir = /process\.env\.RCAP_CONTROL_DIR/.test(gate) && /loadManifest\(controlDir\)/.test(gate);
  const refusesForeignTree = /this script is executing from/.test(gate);
  const runner = read("scripts/rcap-hosted-acceptance-migrate.mjs");
  const runnerImports = /from "\.\/lib\/rcap-migration-manifest\.mjs"/.test(runner);
  const jobsWithGate = ["readonly_probe", "hosted_write", "hosted_payment"]
    .filter((j) => Boolean(stepById(hosted, j, "control_authority")));
  const gateEnv = stepById(hosted, "hosted_write", "control_authority")?.env ?? {};
  check(
    "c1_manifest_and_authorization_are_loaded_from_control",
    readsControlDir && refusesForeignTree && runnerImports && jobsWithGate.length === 3 &&
      gateEnv.RCAP_CONTROL_DIR === "${{ github.workspace }}/control",
    `the control gate loads the manifest from RCAP_CONTROL_DIR (${gateEnv.RCAP_CONTROL_DIR}) and refuses if it is itself executing from any other tree; the migration runner imports ./lib/rcap-migration-manifest.mjs by relative path so it cannot be handed a foreign manifest; the gate runs in ${jobsWithGate.join(", ")}`
  );
}

{
  const manifest = loadManifest(rootDir);
  const hashes = Object.fromEntries(manifest.migrations.map((m) => [m.path, m.sha256]));
  const good = evaluateControlPlane({
    controlDir: rootDir, controlSha: REJECTED_CANDIDATE, authorizedSha: REJECTED_CANDIDATE,
    migrationsRootDir: "", migrationHashes: hashes,
    manifestHash: computeManifestHash(manifest)
  });
  const tampered = { ...hashes };
  const firstKey = Object.keys(tampered).sort()[0];
  tampered[firstKey] = "0".repeat(64);
  const bad = evaluateControlPlane({
    controlDir: rootDir, controlSha: REJECTED_CANDIDATE, authorizedSha: REJECTED_CANDIDATE,
    migrationsRootDir: "", migrationHashes: tampered,
    manifestHash: computeManifestHash(manifest)
  });
  const shortManifest = evaluateControlPlane({
    controlDir: rootDir, controlSha: REJECTED_CANDIDATE, authorizedSha: REJECTED_CANDIDATE,
    migrationsRootDir: "", migrationHashes: Object.fromEntries(Object.entries(hashes).slice(0, 6)),
    manifestHash: computeManifestHash(manifest)
  });
  // Position: the gate must precede the credential preflight and the migration.
  const gateAt = indexById(hosted, "hosted_write", "control_authority");
  const preflightAt = indexById(hosted, "hosted_write", "preflight");
  const migrateAt = indexById(hosted, "hosted_write", "migrate_readback");
  check(
    "c1_all_seven_migration_hashes_are_checked_before_write",
    good.ok && good.migrationsChecked.length === 7 && good.migrationsChecked.every((m) => m.match) &&
      !bad.ok && !shortManifest.ok &&
      gateAt >= 0 && gateAt < preflightAt && gateAt < migrateAt,
    `all 7 manifest SHA-256 values recompute from the control tree's own SQL bytes; a single tampered hash and a six-member manifest are both refused; the gate sits at step ${gateAt}, ahead of the credential preflight (${preflightAt}) and the migration runner (${migrateAt})`
  );
}

{
  const manifest = loadManifest(rootDir);
  const drift = manifest.migrations.filter((m) => {
    const base = git("rev-parse", `${INFRA_BASE_SHA}:${m.path}`).trim();
    const head = git("rev-parse", `HEAD:${m.path}`).trim();
    return base !== head;
  });
  check(
    "c1_migration_sql_is_unchanged",
    drift.length === 0,
    drift.length === 0
      ? `all 7 migration blobs are byte-identical between ${INFRA_BASE_SHA.slice(0, 8)} and HEAD; the manifest hash is ${computeManifestHash(manifest)}`
      : `migration SQL changed: ${drift.map((m) => m.path).join(", ")}`
  );
  check(
    "c1_migration_manifest_hash_is_the_reviewed_value",
    computeManifestHash(manifest) === AUTHORIZED_MANIFEST_HASH,
    `manifest hash ${computeManifestHash(manifest)} equals the reviewed ${AUTHORIZED_MANIFEST_HASH}`
  );
  const missing = REQUIRED_CONTROL_FILES.filter((f) => !fs.existsSync(path.join(rootDir, f)));
  check(
    "c1_control_tree_carries_every_required_file",
    missing.length === 0,
    missing.length === 0 ? `control carries ${REQUIRED_CONTROL_FILES.join(", ")}` : `missing: ${missing.join(", ")}`
  );
}

// ===========================================================================
// WORKER — equivalence over actual image inputs only
// ===========================================================================
{
  const dockerfile = read("deploy/rcap-render-worker/Dockerfile");
  const specs = parseBuildContextSpecs(dockerfile);
  const fromDeps = /^COPY\s+--from=/im.test(dockerfile);
  const manifest = buildWorkerImageInputManifestAtCommit(rootDir, "HEAD");
  const coverage = verifyNoUnlistedInput(manifest, rootDir);
  const ordered = manifest.entries.every((e, i, a) => i === 0 || a[i - 1].path < e.path);
  const everyEntryHashed = manifest.entries.every((e) => /^[0-9a-f]{64}$/.test(e.sha256) && e.inclusion.length > 0);
  const controlExcluded = !manifest.entries.some((e) => e.path.startsWith("scripts/control/"));
  const reconcile = read("scripts/rcap-worker-authority-reconcile.mjs");
  const noDirectoryDiff = !/WORKER_IMAGE_INPUT_PATHS/.test(reconcile) &&
    /buildWorkerImageInputManifestAtCommit/.test(reconcile) && /compareManifests/.test(reconcile);
  check(
    "worker_equivalence_uses_only_actual_worker_image_inputs",
    specs.length > 0 && fromDeps && coverage.ok && ordered && everyEntryHashed && controlExcluded && noDirectoryDiff,
    coverage.ok && noDirectoryDiff
      ? `${manifest.fileCount} inputs derived from the Dockerfile's ${specs.length} context-reading COPY specs (the --from=deps stage excluded), each with an exact path, SHA-256 and inclusion proof, ordered byte-wise; aggregate ${manifest.aggregateSha256}; nothing under scripts/control/ enters the context; the reconciler no longer compares whole directories`
      : `coverage=${JSON.stringify(coverage.errors).slice(0, 200)} ordered=${ordered} controlExcluded=${controlExcluded} perFile=${noDirectoryDiff}`
  );

  // Honest, recorded: COPY scripts/lib/ is a whole-directory copy.
  const evidence = JSON.parse(read("data/rcap-render/worker-image-input-manifest.json"));
  const inside = evidence.buildContextInclusionProof.infrastructureModulesInsideBuildContext;
  const outside = evidence.buildContextInclusionProof.infrastructureModulesOutsideBuildContext;
  check(
    "worker_manifest_states_which_control_modules_enter_the_image",
    Array.isArray(inside) && inside.length === 2 && Array.isArray(outside) && outside.length > 0 &&
      evidence.buildContextInclusionProof.wholeDirectoryCopies.includes("scripts/lib/"),
    `recorded rather than hidden: COPY scripts/lib/ is a whole-directory copy, so ${inside.join(" and ")} DO enter the image context; ${outside.length} infrastructure-only module(s) under scripts/control/ do not`
  );
}

{
  let exit = 0;
  let out = "";
  try {
    out = execFileSync("node", ["scripts/rcap-worker-authority-reconcile.mjs"], { cwd: rootDir, encoding: "utf8" });
  } catch (e) { exit = e.status; out = `${e.stdout ?? ""}${e.stderr ?? ""}`; }
  const evidence = JSON.parse(read("data/rcap-render/worker-image-input-manifest.json"));
  check(
    "worker_authority_remains_blocked_and_no_worker_is_selected",
    exit === 1 && /WORKER_AUTHORITY_BLOCKED/.test(out) &&
      evidence.workerAuthority === "WORKER_AUTHORITY_BLOCKED" && evidence.workerSelectedOrPublished === false,
    `the reconciler exits ${exit} with WORKER_AUTHORITY_BLOCKED, changes no pin, and the image-input evidence records workerSelectedOrPublished=false. This is a gate, not a worker acceptance.`
  );
}

// ===========================================================================
// SIMULATED GATE — which steps actually run, per phase
// ===========================================================================
const PHASES = [
  "preflight", "vercel_audit", "environment_probe", "migrate", "deploy",
  "accept", "full_nonpayment", "checkout_pinning", "worker_contract",
  "payment_environment_probe", "payment"
];

/**
 * Run a job for a phase. Step conditions are evaluated for real; a step's
 * outputs are taken from a supplied oracle so the contract step's decisions
 * propagate exactly as they would on a runner.
 */
function simulateJob(job, phase, outputs = {}) {
  const jobIf = hosted.jobs[job].if;
  const ctx = {
    inputs: { phase, application_sha: "", worker_source_sha: "", worker_digest: "", tools_sha: "", supabase_project_ref: "", preview_hostname: "", preview_deployment_id: "", contradiction_job_id: "" },
    github: { sha: "0".repeat(40), ref: "refs/tags/x", workspace: "/w", run_id: "1", actor: "a" },
    vars: {}, secrets: {}, env: {},
    needs: { hosted_write: { outputs: { lane: outputs.__lane ?? "", phase } } },
    steps: {}
  };
  if (jobIf && !isTrue(jobIf, ctx)) return { scheduled: false, ran: [], skipped: [] };
  const ran = [], skipped = [];
  for (const s of stepsOf(hosted, job)) {
    const label = s.id ?? s.name;
    const cond = s.if;
    const willRun = cond === undefined ? true : isTrue(String(cond), ctx);
    if (willRun) {
      ran.push(label);
      if (s.id) ctx.steps[s.id] = { outcome: "success", conclusion: "success", outputs: outputs[s.id] ?? {} };
    } else {
      skipped.push(label);
      if (s.id) ctx.steps[s.id] = { outcome: "skipped", conclusion: "skipped", outputs: {} };
    }
  }
  return { scheduled: true, ran, skipped };
}

// The contract table's real decisions, transcribed from the workflow's own
// `case` block so the simulation is driven by the file rather than by a copy.
function contractOutputsFor(phase) {
  const table = {
    environment_probe: ["false", "false", "false", "probe"],
    migrate: ["false", "false", "false", "nonpayment"],
    deploy: ["true", "false", "false", "nonpayment"],
    accept: ["false", "true", "true", "nonpayment"],
    full_nonpayment: ["true", "true", "true", "nonpayment"],
    checkout_pinning: ["false", "false", "true", "nonpayment"],
    worker_contract: ["false", "false", "false", "nonpayment"],
    payment: ["true", "true", "true", "payment"]
  }[phase];
  if (!table) return {};
  const [deploy, matrix, verify_gate, lane] = table;
  return { deploy, matrix, verify_gate, lane, diagnose: phase === "worker_contract" ? "true" : "false" };
}

// ===========================================================================
// C2 — the payment probe lane
// ===========================================================================
{
  const sim = simulateJob("payment_probe", "payment_environment_probe");
  const allowed = ["execution_authority", "env_identity", "legacy_refusal", "capability", "payment_environment_probe", "antiskip"];
  const ranIds = sim.ran.filter((n) => allowed.includes(n));
  const uploadRan = sim.ran.some((n) => /Upload the payment environment probe evidence/.test(String(n)));
  const job = hosted.jobs.payment_probe;
  const noNeeds = job.needs === undefined;
  const noCheckout = !stepsOf(hosted, "payment_probe").some((s) => typeof s.uses === "string" && s.uses.startsWith("actions/checkout"));
  const onlyUpload = stepsOf(hosted, "payment_probe").filter((s) => s.uses).map((s) => s.uses);
  const body = stepsOf(hosted, "payment_probe").map((s) => s.run ?? "").join("\n");
  const noNetwork = !/(api\.stripe\.com|api\.vercel\.com|api\.supabase\.com|ghcr\.io|curl |wget |node scripts\/)/.test(body);
  const stamped = /"PAYMENT_EXERCISED": false/.test(body);
  // Nothing unrelated is even present to require.
  const unrelated = ["worker_authority", "audit_equivalence", "migrate_readback", "deploy_preview", "matrix_build", "payment_journey", "checkout_gate", "golden_journey"];
  const absent = unrelated.filter((id) => stepById(hosted, "payment_probe", id));
  check(
    "c2_payment_probe_reaches_success_with_all_unrelated_steps_skipped",
    sim.scheduled && uploadRan && ranIds.length === allowed.length && noNeeds && noCheckout && noNetwork && stamped &&
      absent.length === 0 && onlyUpload.length === 1 && onlyUpload[0].startsWith("actions/upload-artifact"),
    sim.scheduled && uploadRan
      ? `payment_environment_probe schedules payment_probe and reaches its artifact-upload step, running exactly [${ranIds.join(", ")}] and nothing else. No needs:, no checkout, no network, no Stripe API call, no Checkout Session, no webhook; the only action is actions/upload-artifact. Worker authority, audit equivalence, migration readback, deployment, matrix and payment steps are not merely skipped — they are absent from the lane.`
      : `scheduled=${sim.scheduled} upload=${uploadRan} ran=${JSON.stringify(sim.ran)} absent=${JSON.stringify(absent)}`
  );

  const inWrite = simulateJob("hosted_write", "payment_environment_probe");
  const inPayment = simulateJob("hosted_payment", "payment_environment_probe");
  check(
    "c2_payment_probe_no_longer_traverses_the_write_or_payment_jobs",
    inWrite.scheduled === false && inPayment.scheduled === false,
    `for phase payment_environment_probe, hosted_write is not scheduled (${inWrite.scheduled}) and hosted_payment is not scheduled (${inPayment.scheduled}); the probe needs neither, so it no longer depends on a job that checks out, sets up Node and runs a contract and anti-skip gate`
  );
}

// ===========================================================================
// C3 — non-payment acceptance actually runs the matrix
// ===========================================================================
for (const phase of ["accept", "full_nonpayment"]) {
  const sim = simulateJob("hosted_write", phase, { contract: contractOutputsFor(phase) });
  const wanted = ["golden_journey", "verify_harness", "auth_identities", "matrix_build", "galleries", "verify_checkout_pinning"];
  const missing = wanted.filter((id) => !sim.ran.includes(id));
  const gj = stepById(hosted, "hosted_write", "golden_journey");
  const vh = stepById(hosted, "hosted_write", "verify_harness");
  const gatedOnLaneAndMatrix = [gj, vh].every((s) =>
    String(s?.if) === "steps.contract.outputs.lane == 'nonpayment' && steps.contract.outputs.matrix == 'true'"
  );
  check(
    `c3_hosted_${phase === "accept" ? "accept" : "full_nonpayment"}_runs_golden_journey_and_verify_harness`,
    missing.length === 0 && gatedOnLaneAndMatrix,
    missing.length === 0
      ? `simulating phase ${phase}: hosted_write runs ${wanted.join(", ")}; both new steps are gated exactly on lane == nonpayment && matrix == true, so migrate, deploy, checkout_pinning, worker_contract and the probes are untouched`
      : `phase ${phase} did not run: ${missing.join(", ")}`
  );
}

{
  const nonMatrix = ["migrate", "deploy", "checkout_pinning", "worker_contract", "environment_probe"];
  const leaked = nonMatrix.filter((p) => {
    const sim = simulateJob("hosted_write", p, { contract: contractOutputsFor(p) });
    return sim.ran.includes("golden_journey") || sim.ran.includes("verify_harness");
  });
  check(
    "c3_the_matrix_runs_only_where_the_contract_says_matrix_true",
    leaked.length === 0,
    leaked.length === 0
      ? `phases ${nonMatrix.join(", ")} run neither golden_journey nor verify_harness; MATRIX=true in the contract now means the matrix actually runs, and MATRIX=false means it does not`
      : `matrix leaked into: ${leaked.join(", ")}`
  );
}

{
  const nonPaymentJobs = ["readonly_probe", "hosted_write"];
  const lines = hostedText.split("\n");
  const jobStart = (n) => lines.findIndex((l) => l === `  ${n}:`);
  const bounds = (n) => {
    const a = jobStart(n);
    const b = lines.findIndex((l, i) => i > a && /^ {2}[A-Za-z0-9_-]+:$/.test(l));
    return [a, b === -1 ? lines.length : b];
  };
  const offenders = [];
  for (const j of nonPaymentJobs) {
    const [a, b] = bounds(j);
    const body = lines.slice(a, b).filter((l) => !l.trim().startsWith("#")).join("\n");
    if (/secrets\.HOSTED_STRIPE_TEST/.test(body)) offenders.push(`${j}: Stripe secret expression`);
    // Exact script paths. `verify-rcap-hosted-checkout-gate.mjs` is the STATIC
    // pinning verifier and is a different file from the transacting gate.
    if (/scripts\/rcap-hosted-checkout-gate\.mjs|scripts\/rcap-hosted-acceptance-payment\.mjs/.test(body)) offenders.push(`${j}: transacting script`);
    if (/api\.stripe\.com|checkout\/sessions/.test(body)) offenders.push(`${j}: Stripe endpoint`);
  }
  check(
    "c3_neither_non_payment_phase_references_stripe",
    offenders.length === 0,
    offenders.length === 0
      ? `readonly_probe and hosted_write contain zero secrets.HOSTED_STRIPE_TEST_* expressions, zero references to either transacting script and zero Stripe endpoints — the boundary is the absence of the reference, not an empty value`
      : offenders.join("; ")
  );
}

// ===========================================================================
// C4 — the workflow-validation defect
// ===========================================================================
{
  const files = fs.readdirSync(path.join(rootDir, ".github/workflows")).filter((f) => f.endsWith(".yml"));
  const broken = [];
  const ctx = {
    inputs: { mode: "hosted_accept", phase: "accept" },
    // The documented contexts only. The undefined github-context workflow-SHA
    // property that F1 removed is deliberately absent here too.
    github: { sha: "x", ref: "y", workspace: "/w", run_id: "1", actor: "a", workflow_sha: "x", repository: "o/r" },
    job: { workflow_sha: "x", workflow_ref: "o/r/p@r", workflow_repository: "o/r", workflow_file_path: "p" },
    vars: {}, secrets: {}, env: {}, needs: {}, steps: {}, matrix: { entry: {} }, runner: {}, strategy: {}
  };
  for (const f of files) {
    const text = read(`.github/workflows/${f}`);
    for (const e of extractExpressions(text)) {
      try { evaluateExpression(e.source, ctx); }
      catch (err) {
        if (/parser did not reach end of input|unexpected|unterminated/.test(err.message)) {
          broken.push(`${f}:${e.line}: ${err.message}`);
        }
      }
    }
  }
  const chainGone = !/\|\| 'preflight'\)+/.test(f1Exec);
  check(
    "c4_every_workflow_expression_parses_to_the_end_of_its_input",
    broken.length === 0 && chainGone,
    broken.length === 0
      ? `every \${{ }} expression in all ${files.length} workflow files parses to the end of its input. The construct GitHub rejected — a phase map with nine opening and ten closing parentheses ending in \`|| 'preflight'\` — no longer exists`
      : broken.join("; ")
  );
}

{
  const evidencePath = "data/rcap-render/env007-workflow-parser-evidence.json";
  const ok = fs.existsSync(path.join(rootDir, evidencePath));
  const ev = ok ? JSON.parse(read(evidencePath)) : null;
  check(
    "c4_github_parser_accepts_the_corrected_workflow",
    ok && ev.before.invalidWorkflowRuns > 0 && ev.after.invalidWorkflowRuns === 0 && ev.after.checkSuitesReportingParseFailure === 0,
    ok
      ? `${evidencePath}: before ${ev.before.sha.slice(0, 8)} → ${ev.before.invalidWorkflowRuns} zero-job push-event failure run(s) for ${ev.workflow}; after ${ev.after.sha.slice(0, 8)} → ${ev.after.invalidWorkflowRuns}, with ${ev.after.checkSuitesReportingParseFailure} check suite(s) reporting a parse failure and no hosted or protected job dispatched`
      : `${evidencePath} is absent`
  );
}

// ===========================================================================
// C5 — exact dispatch routing
// ===========================================================================
{
  const routeStep = (f1.jobs.route.steps ?? []).find((s) => s.id === "map");
  const body = String(routeStep?.run ?? "");
  const noStartsWith = !/startsWith\(inputs\.mode/.test(f1Exec);
  const hostedIf = String(f1.jobs.hosted.if);
  const f1If = String(f1.jobs.f1.if);
  const needsRoute = f1.jobs.hosted.needs === "route" && f1.jobs.f1.needs === "route";
  const RETIRED = ["hosted_full", "full", "hosted_checkout_gate", "checkout_gate", "github_acceptance"];
  const refusedByName = RETIRED.every((m) => new RegExp(`(^|\\||\\s)${m}(\\||\\))`, "m").test(body));
  const refusalsExit = (body.match(/exit 1 ;;/g) ?? []).length >= 4;
  // Each retired value must reach a `case` arm that exits before the accepted map.
  const refusalBlock = body.slice(0, body.indexOf("# THE EXACT ACCEPTED SET"));
  const allRetiredInRefusalBlock = RETIRED.every((m) => refusalBlock.includes(m));
  check(
    "c5_retired_modes_make_no_readonly_or_protected_call",
    noStartsWith && needsRoute && refusedByName && refusalsExit && allRetiredInRefusalBlock &&
      hostedIf === "needs.route.outputs.target == 'hosted'" && f1If === "needs.route.outputs.target == 'ephemeral'",
    `routing is an exact map in the \`route\` job: no startsWith test anywhere in the file; ${RETIRED.join(", ")} each reach a refusal arm that exits 1 BEFORE the accepted-mode map is consulted; \`hosted\` and \`f1\` both need route, so a refusal there means neither readonly_probe, hosted_write, payment_probe nor hosted_payment is ever scheduled`
  );

  const acceptedBlock = body.slice(body.indexOf("# THE EXACT ACCEPTED SET"));
  const hasCatchAll = /\*\)\n\s*echo "::error::UNKNOWN_MODE_REFUSED/.test(acceptedBlock);
  const noDefaultPhase = !/\|\| 'preflight'/.test(f1Exec) && !/PHASE=preflight ;;\s*\*\)/.test(acceptedBlock);
  const preflightOnlyForItsMode = (acceptedBlock.match(/PHASE=preflight/g) ?? []).length === 1 &&
    /hosted_preflight\)\s+TARGET=hosted;\s+PHASE=preflight/.test(acceptedBlock);
  check(
    "c5_unknown_mode_refuses_explicitly",
    hasCatchAll && /UNKNOWN_MODE_REFUSED/.test(body),
    `the accepted-mode map's only catch-all prints UNKNOWN_MODE_REFUSED and exits 1; there is no fallthrough that assigns a target or a phase`
  );
  check(
    "c5_no_execution_path_defaults_to_preflight",
    noDefaultPhase && preflightOnlyForItsMode,
    `PHASE=preflight is assigned in exactly one place, by the literal mode hosted_preflight; the \`|| 'preflight'\` tail of the old chained expression is gone from the file entirely`
  );

  // And the hosted workflow's own contract still fails closed on an unknown phase.
  const contractBody = String(stepById(hosted, "hosted_write", "contract")?.run ?? "");
  check(
    "c5_the_called_workflow_also_fails_closed_on_an_unknown_phase",
    /unknown phase '\$PHASE'; refusing rather than defaulting to a weaker phase/.test(contractBody),
    `defence in depth: even if a phase reached the called workflow, its contract step refuses an unrecognised value rather than defaulting`
  );
}

// ===========================================================================
// C6 — the read-only payment stamp
// ===========================================================================
{
  const stamp = stepById(hosted, "readonly_probe", "stamp_payment_exercised");
  const stamper = read("scripts/rcap-stamp-payment-exercised.mjs");
  const noNetwork = !/fetch\(|https?:\/\//.test(stamper.replace(/^\s*\/\/.*$/gm, ""));
  const runsForBoth = ["preflight", "vercel_audit"].every((p) => simulateJob("readonly_probe", p).ran.includes("stamp_payment_exercised"));
  const upload = stepsOf(hosted, "readonly_probe").find((s) => String(s.uses ?? "").startsWith("actions/upload-artifact"));
  const stampBeforeUpload =
    indexById(hosted, "readonly_probe", "stamp_payment_exercised") <
    stepsOf(hosted, "readonly_probe").indexOf(upload);
  check(
    "c6_readonly_artifacts_contain_payment_exercised_false",
    Boolean(stamp) && stamp.env.RCAP_PAYMENT_EXERCISED === "false" && stamp["working-directory"] === CONTROL_ROOT &&
      stamp.if === "always()" && runsForBoth && stampBeforeUpload && noNetwork,
    `preflight and vercel_audit both reach the stamp step (if: always()), which runs from ${CONTROL_ROOT}/ with RCAP_PAYMENT_EXERCISED=false and sits before the artifact upload; the stamper opens no socket, so this adds no network activity beyond the existing upload`
  );
}

// ===========================================================================
// SHARED-SECRET PROVENANCE — the caveat is in the artifact, not only the prose
// ===========================================================================
{
  // Both probe bodies are EXECUTED here, in a scratch directory, with dummy
  // values. A static assertion that the strings are present would not prove the
  // shell emits parseable JSON; this does.
  const cases = [
    { job: "hosted_write", id: "environment_probe", file: "environment-probe.json", stripeProven: false },
    { job: "payment_probe", id: "payment_environment_probe", file: "payment-environment-probe.json", stripeProven: true }
  ];
  const out = [];
  for (const c of cases) {
    const run = String(stepById(hosted, c.job, c.id)?.run ?? "");
    const dir = fs.mkdtempSync(path.join(process.env.RUNNER_TEMP ?? "/tmp", "rcap-probe-"));
    const env = {
      ...process.env,
      S_SUPABASE_ACCESS_TOKEN: "x", S_VERCEL_TOKEN: "x", S_VERCEL_ORG_ID: "x",
      S_VERCEL_PROJECT_ID: "x", S_VERCEL_AUTOMATION_BYPASS_SECRET: "x",
      S_STRIPE: "sk_test_dummy", S_WEBHOOK: "whsec_dummy",
      OBSERVED_ID: "id", OBSERVED_CLASS: "cls",
      STRIPE_SECRET_ACCESS: "true", STRIPE_TRANSACTION: "false"
    };
    let status = 0;
    try { execFileSync("bash", ["-c", run], { cwd: dir, env, encoding: "utf8" }); }
    catch (e) { status = e.status ?? 1; }
    const artifact = path.join(dir, "hosted-acceptance-evidence", c.file);
    const parsed = fs.existsSync(artifact) ? JSON.parse(fs.readFileSync(artifact, "utf8")) : null;
    out.push({ ...c, status, parsed });
    fs.rmSync(dir, { recursive: true, force: true });
  }
  const allLabelled = out.every((r) =>
    r.status === 0 && r.parsed &&
    r.parsed.sharedSecretEvidenceClass === "PRESENCE_ONLY" &&
    r.parsed.environmentProvenance === "ENVIRONMENT_PROVENANCE_NOT_YET_PROVEN" &&
    /pre-probe plan/.test(String(r.parsed.environmentProvenanceNote)) &&
    r.parsed.PAYMENT_EXERCISED === false
  );
  const stripeLabelled = out.find((r) => r.stripeProven)?.parsed?.stripeSecretProvenance === "ENVIRONMENT_SCOPED";
  check(
    "shared_secret_evidence_is_labelled_presence_only_in_the_artifact",
    allLabelled && stripeLabelled,
    allLabelled && stripeLabelled
      ? `both probe bodies were executed and each emitted parseable JSON carrying sharedSecretEvidenceClass=PRESENCE_ONLY, ENVIRONMENT_PROVENANCE_NOT_YET_PROVEN, a concrete pre-probe plan for removing the broader copies, and PAYMENT_EXERCISED=false. The two Stripe secrets are separately labelled ENVIRONMENT_SCOPED, because they are declared in no workflow_call secrets block and forwarded by no caller.`
      : `labelled=${allLabelled} stripe=${stripeLabelled} ${JSON.stringify(out.map((r) => ({ id: r.id, status: r.status, has: Boolean(r.parsed) })))}`
  );

  // Option A (drop caller forwarding) is unavailable without weakening the
  // read-only preflight, so the reason is asserted rather than asserted away.
  const callerForwards = ["VERCEL_TOKEN", "VERCEL_ORG_ID", "VERCEL_PROJECT_ID", "SUPABASE_ACCESS_TOKEN", "VERCEL_AUTOMATION_BYPASS_SECRET"]
    .filter((n) => new RegExp(`^\\s+${n}:\\s+\\$\\{\\{ secrets\\.${n} \\}\\}$`, "m").test(f1Exec));
  const readonlyHasNoEnvironment = hosted.jobs.readonly_probe.environment === undefined;
  const readonlyNeedsThem = JSON.stringify(stepsOf(hosted, "readonly_probe")).includes("secrets.SUPABASE_ACCESS_TOKEN");
  check(
    "the_readonly_preflight_path_is_not_weakened_by_the_provenance_caveat",
    callerForwards.length === 5 && readonlyHasNoEnvironment && readonlyNeedsThem,
    `the caller still forwards ${callerForwards.length} shared secrets because readonly_probe declares no environment (${readonlyHasNoEnvironment}) and still needs them (${readonlyNeedsThem}); a reusable workflow's job resolves no repository-scope secret it was not passed, so dropping the forwarding would disable the read-only preflight rather than harden it. The caveat is therefore labelled, not fixed, and the plan is recorded in the artifact.`
  );
}

// ===========================================================================
// C7 — immutable execution authority
// ===========================================================================
{
  const AUTHORIZED = "1".repeat(40);
  const REF = "refs/tags/rcap-acceptance-infra-v1";
  const REPO = "Roger-LegalEase/legalease-partner-dashboard-clean";
  const base = {
    githubSha: AUTHORIZED,
    githubRef: REF,
    githubWorkflowSha: AUTHORIZED,
    githubRepository: REPO,
    jobWorkflowSha: AUTHORIZED,
    jobWorkflowRef: `${REPO}/${HOSTED_WORKFLOW_FILE_PATH}@${REF}`,
    jobWorkflowRepository: REPO,
    jobWorkflowFilePath: HOSTED_WORKFLOW_FILE_PATH,
    expectedSha: AUTHORIZED,
    expectedRef: REF
  };
  const good = evaluateExecutionAuthority(base);
  const wrongSha = evaluateExecutionAuthority({ ...base, githubSha: "2".repeat(40) });
  const wrongRef = evaluateExecutionAuthority({ ...base, githubRef: "refs/heads/some-branch" });
  const splitAuthority = evaluateExecutionAuthority({ ...base, jobWorkflowSha: "3".repeat(40) });
  const unset = evaluateExecutionAuthority({ ...base, expectedSha: "", expectedRef: "" });
  check(
    "c7_wrong_sha_refuses",
    good.ok && !wrongSha.ok && wrongSha.code === "INFRASTRUCTURE_EXECUTION_AUTHORITY_INVALID",
    `a github.sha other than RCAP_AUTHORIZED_INFRASTRUCTURE_SHA returns INFRASTRUCTURE_EXECUTION_AUTHORITY_INVALID — ${wrongSha.reasons[0]}`
  );
  check(
    "c7_wrong_ref_refuses",
    !wrongRef.ok && wrongRef.code === "INFRASTRUCTURE_EXECUTION_AUTHORITY_INVALID",
    `a github.ref other than RCAP_AUTHORIZED_EXECUTION_REF returns INFRASTRUCTURE_EXECUTION_AUTHORITY_INVALID — ${wrongRef.reasons[0]}`
  );
  check(
    "c7_caller_and_called_workflow_must_share_one_authority",
    !splitAuthority.ok && !unset.ok,
    `a called workflow resolving from a different commit than its caller refuses (${splitAuthority.reasons[0]}); an UNCONFIGURED authority also refuses rather than passing — ${unset.reasons.length} reason(s), so the gate fails closed until both variables exist`
  );

  const jobs = ["readonly_probe", "hosted_write", "hosted_payment", "payment_probe"];
  const positions = jobs.map((j) => {
    const steps = stepsOf(hosted, j);
    const authAt = steps.findIndex((s) => s.id === "execution_authority");
    const firstCheckout = steps.findIndex((s) => String(s.uses ?? "").startsWith("actions/checkout"));
    const firstSecret = steps.findIndex((s) => JSON.stringify(s.env ?? {}).includes("secrets."));
    return { j, authAt, firstCheckout, firstSecret };
  });
  const ok = positions.every((p) =>
    p.authAt === 0 &&
    (p.firstCheckout === -1 || p.firstCheckout > 0) &&
    (p.firstSecret === -1 || p.firstSecret > 0)
  );
  const authStep = stepById(hosted, "hosted_write", "execution_authority");
  const readsVars = JSON.stringify(authStep.env).includes("vars.RCAP_AUTHORIZED_INFRASTRUCTURE_SHA") &&
    JSON.stringify(authStep.env).includes("vars.RCAP_AUTHORIZED_EXECUTION_REF");
  const noSecret = !JSON.stringify(authStep.env).includes("secrets.");
  const inCaller = (f1.jobs.route.steps ?? []).some((s) => s.id === "execution_authority");
  check(
    "c7_authority_gate_precedes_checkout_setup_and_secrets",
    ok && readsVars && noSecret && inCaller,
    `execution_authority is step 0 of ${jobs.join(", ")} and of the caller's route job; it reads the two non-secret variables and no secret; every checkout and every secret-bearing step in each job comes after it (${positions.map((p) => `${p.j}: checkout@${p.firstCheckout} secret@${p.firstSecret}`).join("; ")})`
  );

  const names = JSON.stringify(hostedExec.match(/RCAP_AUTHORIZED_[A-Z_]+/g) ?? []);
  check(
    "c7_expected_values_are_named_but_not_created",
    /RCAP_AUTHORIZED_INFRASTRUCTURE_SHA/.test(names) && /RCAP_AUTHORIZED_EXECUTION_REF/.test(names) &&
      !/vars\.RCAP_AUTHORIZED_INFRASTRUCTURE_SHA\s*:\s*[0-9a-f]{40}/.test(hostedText),
    `both non-secret names appear as \`vars.*\` references only; no value is hard-coded, no repository or environment variable is created by this change, and no tag is created`
  );
}

// ===========================================================================
// F1 — documented caller and called-workflow identities
// ===========================================================================
{
  const files = fs.readdirSync(path.join(rootDir, ".github/workflows")).filter((f) => f.endsWith(".yml"));
  // Composed rather than written out, so this file is not itself a hit.
  const UNDEFINED_PROPERTY = ["job", "workflow", "sha"].join("_");
  const offenders = files.filter((f) => read(`.github/workflows/${f}`).includes(UNDEFINED_PROPERTY));
  const inSources = ["scripts", "docs", "data"].flatMap((d) => {
    const walk = (rel) => fs.readdirSync(path.join(rootDir, rel), { withFileTypes: true }).flatMap((e) =>
      e.isDirectory() ? walk(`${rel}/${e.name}`) : [`${rel}/${e.name}`]);
    return walk(d);
  }).filter((rel) => /\.(mjs|md|json|ya?ml)$/.test(rel) && read(rel).includes(UNDEFINED_PROPERTY));
  check(
    "f1_the_undefined_github_workflow_sha_property_appears_nowhere",
    offenders.length === 0 && inSources.length === 0,
    offenders.length === 0 && inSources.length === 0
      ? `the undefined github-context workflow-SHA property appears in none of the ${files.length} workflow files and in no script, document or evidence artifact`
      : `still referenced in: ${[...offenders, ...inSources].join(", ")}`
  );
}

{
  const AUTHORIZED = "1".repeat(40);
  const REF = "refs/tags/rcap-acceptance-infra-v1";
  const REPO = "Roger-LegalEase/legalease-partner-dashboard-clean";
  const base = {
    githubSha: AUTHORIZED, githubRef: REF, githubWorkflowSha: AUTHORIZED, githubRepository: REPO,
    jobWorkflowSha: AUTHORIZED, jobWorkflowRef: `${REPO}/${HOSTED_WORKFLOW_FILE_PATH}@${REF}`,
    jobWorkflowRepository: REPO, jobWorkflowFilePath: HOSTED_WORKFLOW_FILE_PATH,
    expectedSha: AUTHORIZED, expectedRef: REF
  };
  const cases = [
    ["f1_missing_github_workflow_sha_refuses",     { githubWorkflowSha: "" }],
    ["f1_wrong_github_workflow_sha_refuses",       { githubWorkflowSha: "2".repeat(40) }],
    ["f1_missing_job_context_workflow_sha_refuses", { jobWorkflowSha: null }],
    ["f1_wrong_job_context_workflow_sha_refuses",   { jobWorkflowSha: "3".repeat(40) }],
    ["f1_wrong_job_workflow_repository_refuses",   { jobWorkflowRepository: "attacker/fork" }],
    ["f1_wrong_job_workflow_file_path_refuses",    { jobWorkflowFilePath: ".github/workflows/other.yml" }],
    ["f1_wrong_job_workflow_ref_refuses",          { jobWorkflowRef: `${REPO}/${HOSTED_WORKFLOW_FILE_PATH}@refs/heads/anything` }]
  ];
  for (const [id, patch] of cases) {
    const r = evaluateExecutionAuthority({ ...base, ...patch });
    check(id, r.ok === false && r.code === "INFRASTRUCTURE_EXECUTION_AUTHORITY_INVALID", r.ok ? "ACCEPTED — the gate did not refuse" : r.reasons[0]);
  }
  const ok = evaluateExecutionAuthority(base);
  const caller = evaluateExecutionAuthority({
    githubSha: AUTHORIZED, githubRef: REF, githubWorkflowSha: AUTHORIZED,
    expectedSha: AUTHORIZED, expectedRef: REF, called: false
  });
  check(
    "f1_correct_caller_and_called_shas_pass",
    ok.ok && caller.ok,
    `the called gate passes when github.sha, github.workflow_sha and job.workflow_sha all equal the authorized SHA, job.workflow_repository equals github.repository, job.workflow_file_path equals ${HOSTED_WORKFLOW_FILE_PATH} and job.workflow_ref ends at the authorized ref; the caller gate passes on its three comparisons`
  );
}

{
  // Structural, in the workflow itself: the success line cannot be reached
  // while any comparison is outstanding, and no comparison is conditional on
  // the observed value being non-empty.
  const bodies = ["readonly_probe", "hosted_write", "payment_probe", "hosted_payment"]
    .map((j) => ({ j, body: String(stepById(hosted, j, "execution_authority")?.run ?? "") }));
  const guardedByFail = bodies.every(({ body }) => {
    const successAt = body.indexOf("caller and called workflow resolve from one execution authority");
    const exitAt = body.indexOf('echo "INFRASTRUCTURE_EXECUTION_AUTHORITY_INVALID"');
    return successAt > 0 && exitAt > 0 && exitAt < successAt && /if \[ "\$fail" -ne 0 \]/.test(body);
  });
  const comparesAll = bodies.every(({ body }) =>
    ["github.sha", "github.workflow_sha", "job.workflow_sha", "github.ref",
     "job.workflow_repository", "job.workflow_file_path", "job.workflow_ref"].every((k) => body.includes(k)));
  const emptyIsRefusal = bodies.every(({ body }) => /note "\$1 is missing or empty"/.test(body));
  const callerBody = String((f1.jobs.route.steps ?? []).find((s) => s.id === "execution_authority")?.run ?? "");
  const callerCompares = ["github.sha", "github.workflow_sha", "github.ref"].every((k) => callerBody.includes(k)) &&
    /note "\$1 is missing or empty"/.test(callerBody);
  check(
    "f1_success_statement_is_unreachable_until_every_comparison_passes",
    guardedByFail && comparesAll && emptyIsRefusal && callerCompares,
    `in all four called-workflow jobs the refusal branch precedes the success line and is reached whenever fail is set; all seven documented values are compared; an empty observed value calls note() and so is a refusal, never a skipped check. The caller gate compares its three values on the same rule.`
  );

  const controlCheckouts = ["readonly_probe", "hosted_write", "hosted_payment"].map((j) =>
    stepsOf(hosted, j).find((s) => String(s.uses ?? "").startsWith("actions/checkout") && s.with?.path === CONTROL_ROOT));
  check(
    "f1_control_checkout_uses_job_workflow_repository_and_sha",
    controlCheckouts.every((s) => s?.with?.repository === "${{ job.workflow_repository }}" && s?.with?.ref === "${{ job.workflow_sha }}"),
    `all three control checkouts read repository: job.workflow_repository and ref: job.workflow_sha, so the control tree is the reusable workflow's own bytes; the control_authority gate still re-proves that commit against RCAP_AUTHORIZED_INFRASTRUCTURE_SHA`
  );
}

// ===========================================================================
// F2 — actionlint exits zero, and the ignores stay narrow
// ===========================================================================
{
  const cfgPath = ".github/actionlint.yaml";
  const cfgExists = fs.existsSync(path.join(rootDir, cfgPath));
  const cfg = cfgExists ? read(cfgPath) : "";
  const scoped = /^paths:\s*$/m.test(cfg) &&
    (cfg.match(/^ {2}\S+:\s*$/gm) ?? []).length === 1 &&
    cfg.includes(`  ${HOSTED_WORKFLOW_FILE_PATH}:`);
  const ignores = (cfg.match(/^ {6}- '(.+)'$/gm) ?? []).map((l) => l.replace(/^ {6}- '/, "").replace(/'$/, ""));
  const named = ["workflow_sha", "workflow_ref", "workflow_repository", "workflow_file_path",
                 "hosted_stripe_test_secret", "hosted_stripe_test_webhook_secret"];
  const everyIgnoreNamesOneProperty = ignores.length === named.length &&
    named.every((n) => ignores.some((i) => i.includes(`"${n}"`)));
  const jobIgnoresAnchored = ignores.filter((i) => /workflow_(sha|ref|repository|file_path)/.test(i))
    .every((i) => i.includes("check_run_id: number; container:"));
  const noBlanket = !/^\s*ignore:\s*\[\s*\]/m.test(cfg) &&
    !ignores.some((i) => i === ".*" || i === "" || /^property ".\*"/.test(i));
  check(
    "f2_actionlint_configuration_is_narrowly_scoped",
    cfgExists && scoped && everyIgnoreNamesOneProperty && jobIgnoresAnchored && noBlanket,
    cfgExists
      ? `${cfgPath} scopes every ignore to ${HOSTED_WORKFLOW_FILE_PATH} alone and lists exactly ${ignores.length} patterns, each naming ONE property or secret; the four job-context patterns are anchored on actionlint's own {check_run_id: number; container: …} object type, so a misspelled job property is not covered`
      : `${cfgPath} is absent`
  );

  const bin = process.env.RCAP_ACTIONLINT_BIN ?? "actionlint";
  const runLint = (args) => {
    try { return { status: 0, out: execFileSync(bin, args, { cwd: rootDir, encoding: "utf8" }) }; }
    catch (e) { return { status: e.status ?? -1, out: `${e.stdout ?? ""}${e.stderr ?? ""}` }; }
  };
  const available = (() => { try { execFileSync(bin, ["--version"], { cwd: rootDir }); return true; } catch { return false; } })();
  if (!available) {
    check(
      "f2_actionlint_exits_zero_with_the_checked_in_configuration",
      false,
      `actionlint is not on PATH and RCAP_ACTIONLINT_BIN is unset, so this check cannot be evaluated. Install the pinned v1.7.12 or set RCAP_ACTIONLINT_BIN.`
    );
  } else {
    const workflows = fs.readdirSync(path.join(rootDir, ".github/workflows"))
      .filter((f) => f.endsWith(".yml")).map((f) => `.github/workflows/${f}`);
    const green = runLint(["-shellcheck=", "-pyflakes=", ...workflows]);
    check(
      "f2_actionlint_exits_zero_with_the_checked_in_configuration",
      green.status === 0,
      green.status === 0
        ? `actionlint -shellcheck= -pyflakes= over all ${workflows.length} workflow files exits 0 with the checked-in ${cfgPath}`
        : `exit ${green.status}: ${green.out.slice(0, 400)}`
    );

    // The negative control lives OUTSIDE .github/workflows, so no path ignore
    // applies to it. Every MUST-FAIL must still be reported.
    const FIXTURE = "scripts/control/fixtures/actionlint-negative-control.yml";
    const neg = runLint(["-shellcheck=", "-pyflakes=", "-oneline", "-no-color", FIXTURE]);
    const reported = (needle) => neg.out.includes(needle);
    const mustFail = {
      "misspelled github property": reported('property "workfl0w_sha" is not defined'),
      "misspelled job property": reported('property "workflow_shaa" is not defined'),
      "unrelated undefined secret": reported('property "some_secret_that_is_not_declared" is not defined'),
      "ignored job property outside the hosted workflow": reported('property "workflow_sha" is not defined'),
      "ignored job repository outside the hosted workflow": reported('property "workflow_repository" is not defined'),
      "ignored Stripe secret outside the hosted workflow": reported('property "hosted_stripe_test_secret" is not defined')
    };
    const declaredSecretQuiet = !neg.out.includes('property "declared_secret" is not defined');
    const missed = Object.entries(mustFail).filter(([, v]) => !v).map(([k]) => k);
    check(
      "f2_a_misspelled_property_and_an_unrelated_secret_still_fail",
      neg.status === 1 && missed.length === 0 && declaredSecretQuiet,
      missed.length === 0
        ? `the negative control exits ${neg.status} and all six MUST-FAIL findings are reported — including the four names the config DOES ignore, at a path the config does not cover, which is the scoping proof; the one correctly declared secret produces no finding`
        : `not reported: ${missed.join(", ")}`
    );
  }
}

// ===========================================================================
// F3 — accept requires an exact existing Preview
// ===========================================================================
{
  // Preview resolution is the only variable, so it is supplied to the
  // simulation as the resolver's real outputs.
  const simAccept = (reused) => simulateJob("hosted_write", "accept", {
    contract: { ...contractOutputsFor("accept"), require_exact_preview: "true" },
    resolve_preview: { reused: reused ? "true" : "false", outcome: reused ? "reused_exact_ready_preview" : "created_one_new_preview" }
  });
  const withPreview = simAccept(true);
  const withoutPreview = simAccept(false);
  const APPLICATION_STEPS = ["auth_identities", "matrix_build", "gate_deps", "golden_journey", "verify_harness", "galleries"];

  check(
    "f3_accept_with_an_exact_preview_reaches_the_matrix",
    withPreview.ran.includes("require_exact_preview") === false &&
      APPLICATION_STEPS.every((id) => withPreview.ran.includes(id)) &&
      withPreview.ran.includes("deploy_preview") === false,
    `accept with a reused exact Preview skips the refusal, runs ${APPLICATION_STEPS.join(", ")}, and never runs deploy_preview`
  );

  const refusalAt = withoutPreview.ran.indexOf("require_exact_preview");
  const firstApplicationAt = Math.min(...APPLICATION_STEPS.map((id) => {
    const i = withoutPreview.ran.indexOf(id);
    return i === -1 ? Number.POSITIVE_INFINITY : i;
  }));
  const refusalBody = String(stepById(hosted, "hosted_write", "require_exact_preview")?.run ?? "");
  check(
    "f3_accept_without_an_exact_preview_refuses_early",
    refusalAt >= 0 && refusalAt < firstApplicationAt &&
      /ACCEPTANCE_EXACT_PREVIEW_REQUIRED/.test(refusalBody) && /exit 1/.test(refusalBody),
    `accept with no exact Preview reaches require_exact_preview at position ${refusalAt}, ahead of every application step (first at ${firstApplicationAt === Number.POSITIVE_INFINITY ? "n/a" : firstApplicationAt}); it prints ACCEPTANCE_EXACT_PREVIEW_REQUIRED and exits 1, so npm ci, the build, Auth configuration and the matrix are never reached`
  );

  const acceptContract = contractOutputsFor("accept");
  const contractBody = String(stepById(hosted, "hosted_write", "contract")?.run ?? "");
  check(
    "f3_accept_performs_no_deploy",
    acceptContract.deploy === "false" &&
      /accept\)\s+DEPLOY=false;.*REQUIRE_EXACT_PREVIEW=true/.test(contractBody) &&
      /requires an exact existing Preview and also claims deploy authority/.test(contractBody),
    `the contract row for accept is DEPLOY=false with REQUIRE_EXACT_PREVIEW=true, and the contract refuses outright if any phase ever claims both`
  );

  const fullNo = simulateJob("hosted_write", "full_nonpayment", {
    contract: contractOutputsFor("full_nonpayment"),
    resolve_preview: { reused: "false", outcome: "created_one_new_preview" }
  });
  const fullReuse = simulateJob("hosted_write", "full_nonpayment", {
    contract: contractOutputsFor("full_nonpayment"),
    resolve_preview: { reused: "true", outcome: "reused_exact_ready_preview" }
  });
  check(
    "f3_full_nonpayment_deploys_when_no_exact_preview_exists",
    fullNo.ran.includes("deploy_preview") && !fullNo.ran.includes("require_exact_preview") &&
      !fullReuse.ran.includes("deploy_preview"),
    `full_nonpayment with no exact Preview runs deploy_preview and never reaches the exact-Preview refusal; with a reused exact Preview it deploys nothing`
  );

  const antiskip = String(stepById(hosted, "hosted_write", "antiskip")?.run ?? "");
  const gated = /if \[ "\$RUNS_DEPLOY" = "true" \] && \[ "\$O_REUSED" != "true" \]; then\n\s+require "deploy one new Preview"/.test(antiskip);
  const envHasRunsDeploy = JSON.stringify(stepById(hosted, "hosted_write", "antiskip")?.env ?? {})
    .includes("steps.contract.outputs.deploy");
  check(
    "f3_the_antiskip_gate_no_longer_requires_a_forbidden_deploy",
    gated && envHasRunsDeploy,
    `the anti-skip gate demands deploy success only when RUNS_DEPLOY=true and O_REUSED!=true, so a phase whose contract forbids deploying is never failed for not having deployed — the misleading "deploy one new Preview" failure cannot occur for accept`
  );
}

// ===========================================================================
// F4 — Node is pinned before any Node execution
// ===========================================================================
{
  const violations = [];
  for (const [job, j] of Object.entries(hosted.jobs)) {
    const steps = j.steps ?? [];
    const setupAt = steps.findIndex((s) => String(s.uses ?? "").startsWith("actions/setup-node"));
    const firstNodeAt = steps.findIndex((s) => typeof s.run === "string" && /(^|\s)node\s/.test(s.run));
    const firstCheckoutAt = steps.findIndex((s) => String(s.uses ?? "").startsWith("actions/checkout"));
    const authorityAt = steps.findIndex((s) => s.id === "execution_authority");
    if (firstNodeAt === -1) continue;
    if (setupAt === -1) { violations.push(`${job}: node runs with no setup-node`); continue; }
    if (setupAt > firstNodeAt) violations.push(`${job}: setup-node at ${setupAt} follows node at ${firstNodeAt}`);
    if (firstCheckoutAt !== -1 && setupAt < firstCheckoutAt) violations.push(`${job}: setup-node at ${setupAt} precedes checkout at ${firstCheckoutAt}`);
    if (authorityAt !== 0) violations.push(`${job}: execution_authority is at ${authorityAt}, not 0`);
  }
  const versions = Object.values(hosted.jobs).flatMap((j) => (j.steps ?? [])
    .filter((s) => String(s.uses ?? "").startsWith("actions/setup-node"))
    .map((s) => String(s.with?.["node-version"])));
  const pinned = versions.length > 0 && versions.every((v) => v === versions[0]);
  check(
    "f4_no_node_invocation_precedes_setup_node",
    violations.length === 0 && pinned,
    violations.length === 0
      ? `every job orders execution authority (step 0, shell only) → control/application/worker checkout → actions/setup-node@node-version ${versions[0]} → the worker image-input manifest → the control-plane gate → the remaining Node scripts. No node command runs before setup-node, and the before-checkout authority gate is unmoved.`
      : violations.join("; ")
  );
}

// ===========================================================================
// F5 — tools_sha is a provenance label
// ===========================================================================
{
  const descs = [
    String(hosted.on?.workflow_call?.inputs?.tools_sha?.description ?? ""),
    String(f1.on?.workflow_dispatch?.inputs?.tools_sha?.description ?? "")
  ];
  const statesAll = descs.every((d) =>
    /PROVENANCE LABEL ONLY/.test(d) &&
    /must equal the reviewed control-plane SHA/i.test(d) &&
    /NOT a checkout ref/i.test(d) &&
    /NOT executable/i.test(d) &&
    /6d9e8792/.test(d));
  const neverCheckedOut = ![hostedExec, f1Exec].some((t) =>
    /ref:\s*\$\{\{\s*inputs\.tools_sha/.test(t) || /checkout --detach\s+"?\$\{\{\s*inputs\.tools_sha/.test(t));
  check(
    "f5_tools_sha_is_documented_as_a_provenance_label_only",
    statesAll && neverCheckedOut && descs.every(Boolean),
    statesAll
      ? `both the dispatch input and the workflow_call input state that tools_sha is a provenance label only, must equal the reviewed control-plane SHA, is not a checkout ref, is not executable authority, and that the former 6d9e8792 value is no longer valid; it appears as a checkout ref in neither workflow`
      : `descriptions: ${JSON.stringify(descs)} neverCheckedOut=${neverCheckedOut}`
  );
}

// ===========================================================================
// INTEGRITY
// ===========================================================================
{
  const changed = git("diff", "--name-only", `${INFRA_BASE_SHA}...HEAD`).split("\n").filter(Boolean);
  const PRODUCT = /^(src\/|supabase\/|public\/|next\.config|package(-lock)?\.json|tsconfig)/;
  const product = changed.filter((f) => PRODUCT.test(f));
  check(
    "product_files_remain_unchanged",
    product.length === 0,
    product.length === 0
      ? `${changed.length} files differ from ${INFRA_BASE_SHA.slice(0, 8)}, none of them under src/, supabase/, public/, next.config*, package.json, package-lock.json or tsconfig*`
      : `product files changed: ${product.join(", ")}`
  );

  const auditHead = git("rev-parse", "origin/claude/expai-flow-audit-p1").trim();
  const auditArtifacts = changed.filter((f) => /^data\/rcap-render\/(flow-audit|audit-surface-equivalence)/.test(f));
  check(
    "audit_branch_and_audit_artifacts_remain_unchanged",
    auditHead === AUDIT_SHA && auditArtifacts.filter((f) => f.includes("flow-audit")).length === 0,
    `origin/claude/expai-flow-audit-p1 is at ${auditHead} (the frozen ENV-007 packet commit); no flow-audit artifact was written`
  );

  let diffCheck = "";
  let diffOk = true;
  try { diffCheck = git("diff", "--check"); } catch (e) { diffOk = false; diffCheck = String(e.stdout ?? e.message); }
  check(
    "git_diff_check_is_clean",
    diffOk && diffCheck.trim() === "",
    diffOk && diffCheck.trim() === "" ? "git diff --check reports no whitespace error" : diffCheck.slice(0, 300)
  );
}

const passed = results.filter((r) => r.ok).length;
fs.mkdirSync(path.join(rootDir, "data/rcap-render"), { recursive: true });
fs.writeFileSync(
  path.join(rootDir, "data/rcap-render/control-plane-authority-verification.json"),
  `${JSON.stringify({
    schemaVersion: "rcap-control-plane-authority-verification/v1",
    total: results.length,
    passed,
    failed: results.length - passed,
    checks: results
  }, null, 2)}\n`
);
console.log(`\n${passed}/${results.length} C1–C7 regression checks passed`);
if (passed !== results.length) process.exit(1);
