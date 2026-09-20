#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import test from "node:test";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SCRIPTS = path.join(ROOT, "scripts");
const LAYOUT_MODULE = path.join(SCRIPTS, "rcap-hosted-acceptance-evidence-layout.mjs");
const PREPARE_CLI = path.join(SCRIPTS, "rcap-hosted-acceptance-prepare.mjs");
const WORKER_PLAN_MODULE = path.join(SCRIPTS, "rcap-hosted-acceptance-worker-input-plan.mjs");
const CURRENT_BASE = "07675789a80e732d2b835c1e8ba2092b39201b79";
const ACCEPTED_SOURCE = "5ac0d8d6910aec3dc6259b2d4da6931abc5af7e8";
const ACCEPTED_DIGEST = "sha256:4e5b58e4492289446bcbdd100bb39dcd13dd4512916679fa2a252e4532ab9530";
const CANONICAL_ACCEPTED_SOURCE = "b680a4e4dd92e7422bc7030aa2189026929782a1";
const CANONICAL_ACCEPTED_DIGEST = "sha256:bf4589d3432f396f08196b2a619e445b75f1b4e2d2a0c404fbb06c4017e61864";
const EVIDENCE_ONLY_CANDIDATE = "3285b6606605549c4ea730610f2c3e55c1e32859";
const PROJECT_REF = "hyflxnlhpmiqxvvcoiia";
const AUTH_CONFIG_SOURCE = fs.readFileSync(path.join(SCRIPTS, "rcap-hosted-acceptance-auth-config.mjs"), "utf8");
const DEPLOY_SOURCE = fs.readFileSync(path.join(SCRIPTS, "rcap-hosted-acceptance-deploy.mjs"), "utf8");

const EXISTING_HOSTED_ENTRYPOINTS = [
  "rcap-hosted-acceptance-auth-config.mjs",
  "rcap-hosted-acceptance-deploy.mjs",
  "rcap-hosted-acceptance-gallery.mjs",
  "rcap-hosted-acceptance-matrix.mjs",
  "rcap-hosted-acceptance-migrate.mjs",
  "rcap-hosted-acceptance-payment.mjs",
  "rcap-hosted-acceptance-preflight.mjs",
  "rcap-github-acceptance-bootstrap.mjs",
  "rcap-github-acceptance-gate.mjs",
  "rcap-github-post-payment-acceptance.mjs",
  "rcap-hosted-checkout-gate.mjs",
  "rcap-hosted-resolve-preview.mjs",
  "rcap-vercel-failure-audit.mjs",
  "rcap-worker-contract-contradiction.mjs"
];

const CANONICAL_INPUTS = [
  "package.json",
  "package-lock.json",
  "tsconfig.json",
  "scripts/rcap-render-worker.mjs",
  "scripts/lib",
  "src",
  "deploy/rcap-render-worker/Dockerfile"
];

const IDENTITY_ROLES = [
  "paid consumer",
  "sponsored consumer",
  "legacy consumer",
  "clinic participant",
  "clinic staff",
  "partner admin",
  "internal admin",
  "cross-user control",
  "cross-tenant control"
];

function requireFeature(filePath, description) {
  assert.equal(fs.existsSync(filePath), true, `${description} must exist at ${filePath}`);
}

async function importFeature(filePath, description) {
  requireFeature(filePath, description);
  return import(`${pathToFileURL(filePath).href}?test=${Date.now()}-${Math.random()}`);
}

function temporaryDirectory(t, prefix) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  return directory;
}

function runNode(script, environment) {
  return spawnSync(process.execPath, [script], {
    cwd: ROOT,
    encoding: "utf8",
    env: { ...process.env, ...environment }
  });
}

function gitLines(args) {
  const result = spawnSync("git", args, { cwd: ROOT, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim().split(/\r?\n/).filter(Boolean).sort();
}

test("evidence layout preserves the default and rejects unsafe overrides", async () => {
  const {
    DEFAULT_EVIDENCE_DIRECTORY_NAME,
    resolveHostedAcceptanceEvidenceDirectory
  } = await importFeature(LAYOUT_MODULE, "Lane F evidence-layout module");

  assert.equal(DEFAULT_EVIDENCE_DIRECTORY_NAME, "hosted-acceptance-evidence");
  assert.equal(
    resolveHostedAcceptanceEvidenceDirectory({ rootDir: ROOT, environment: {} }),
    path.join(ROOT, "hosted-acceptance-evidence")
  );
  assert.throws(
    () => resolveHostedAcceptanceEvidenceDirectory({
      rootDir: ROOT,
      environment: { HOSTED_ACCEPTANCE_EVIDENCE_DIR: "relative/evidence" }
    }),
    /absolute/i
  );
  assert.throws(
    () => resolveHostedAcceptanceEvidenceDirectory({
      rootDir: ROOT,
      environment: { HOSTED_ACCEPTANCE_EVIDENCE_DIR: path.join(ROOT, "tmp", "evidence") }
    }),
    /outside.*worktree/i
  );
});

test("external evidence layout prepares every required directory", async (t) => {
  const { prepareHostedAcceptanceEvidenceLayout } = await importFeature(
    LAYOUT_MODULE,
    "Lane F evidence-layout module"
  );
  const externalRoot = path.join(temporaryDirectory(t, "rcap-hosted-layout-"), "evidence");
  const folders = prepareHostedAcceptanceEvidenceLayout({
    rootDir: ROOT,
    environment: { HOSTED_ACCEPTANCE_EVIDENCE_DIR: externalRoot }
  });

  assert.deepEqual(Object.keys(folders), [
    "root",
    "screenshots",
    "traces",
    "console",
    "network",
    "database",
    "artifacts"
  ]);
  assert.equal(folders.root, externalRoot);
  for (const directory of Object.values(folders)) {
    assert.equal(fs.statSync(directory).isDirectory(), true, `${directory} must be a directory`);
  }
});

test("preparation CLI writes the exact sanitized fixture matrix outside Git", (t) => {
  requireFeature(PREPARE_CLI, "Lane F environment preparation CLI");
  const externalRoot = path.join(temporaryDirectory(t, "rcap-hosted-prepare-"), "evidence");
  const forbiddenValues = [
    "Acceptance-password-should-never-leak!",
    "sponsor-valid-raw-code",
    "promotion-valid-raw-code",
    "sk_test_secret_should_never_leak",
    "github-token-should-never-leak"
  ];
  const result = runNode(PREPARE_CLI, {
    HOSTED_ACCEPTANCE_EVIDENCE_DIR: externalRoot,
    HOSTED_APPLICATION_SHA: CURRENT_BASE,
    ACCEPTANCE_SUPABASE_PROJECT_REF: PROJECT_REF,
    ACCEPTANCE_PAID_CONSUMER_PASSWORD: forbiddenValues[0],
    HOSTED_SPONSORSHIP_VALID_CODE: forbiddenValues[1],
    HOSTED_PROMOTION_VALID_CODE: forbiddenValues[2],
    HOSTED_STRIPE_TEST_SECRET: forbiddenValues[3],
    GH_TOKEN: forbiddenValues[4],
    VERCEL_TOKEN: "vercel-token-present",
    VERCEL_ORG_ID: "team_fixture",
    VERCEL_PROJECT_ID: "project_fixture",
    SUPABASE_ACCESS_TOKEN: "supabase-token-present",
    GHCR_TOKEN: "ghcr-token-present",
    HOSTED_EMAIL_CAPTURE_URL: "https://mail.invalid",
    HOSTED_PLAYWRIGHT_AVAILABLE: "1",
    HOSTED_CHROMIUM_PATH: "/tmp/chromium"
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  const evidencePath = path.join(externalRoot, "environment-preparation.json");
  const rawEvidence = fs.readFileSync(evidencePath, "utf8");
  const evidence = JSON.parse(rawEvidence);

  assert.equal(evidence.acceptanceProjectRef, PROJECT_REF);
  assert.equal(evidence.applicationSha, CURRENT_BASE);
  assert.deepEqual(evidence.identityRoles, IDENTITY_ROLES);
  assert.deepEqual(evidence.sponsorshipStates, ["valid", "expired", "exhausted", "invalid"]);
  assert.deepEqual(evidence.promotionStates, ["valid", "invalid", "expired", "exhausted", "wrong-product"]);
  assert.deepEqual(Object.keys(evidence.evidenceFolders), [
    "root",
    "screenshots",
    "traces",
    "console",
    "network",
    "database",
    "artifacts"
  ]);
  assert.deepEqual(Object.keys(evidence.capabilities), ["present", "absent"]);
  assert.equal(evidence.capabilities.present.every((name) => typeof name === "string"), true);
  assert.equal(evidence.capabilities.absent.every((name) => typeof name === "string"), true);
  assert.equal("passwords" in evidence, false);
  assert.equal("codes" in evidence, false);
  for (const forbidden of forbiddenValues) assert.equal(rawEvidence.includes(forbidden), false, `leaked ${forbidden}`);
});

test("worker plan exposes exactly the canonical input path set", async () => {
  const { CANONICAL_WORKER_INPUTS } = await importFeature(
    WORKER_PLAN_MODULE,
    "Lane F worker-input plan module"
  );
  assert.deepEqual(CANONICAL_WORKER_INPUTS, CANONICAL_INPUTS);
});

test("Mississippi Preview preparation is bounded to four synthetic identities and a two-participant scope", () => {
  for (const identity of [
    "mvl-demo-admin@rcap-acceptance.test",
    "mvl-demo-staff@rcap-acceptance.test",
    "mvl-demo-participant-a@rcap-acceptance.test",
    "mvl-demo-participant-b@rcap-acceptance.test"
  ]) assert.match(AUTH_CONFIG_SOURCE, new RegExp(identity.replaceAll(".", "\\.")));
  assert.match(AUTH_CONFIG_SOURCE, /MISSISSIPPI_PREVIEW_MODE \? \(u\.key === "A" \|\| u\.key === "B"\)/);
  assert.match(AUTH_CONFIG_SOURCE, /preview_scope_is_exactly_participants_a_and_b/);
  assert.match(AUTH_CONFIG_SOURCE, /partnerSlug\) do update|on conflict \(partner_slug\) do update/);
  assert.match(AUTH_CONFIG_SOURCE, /no password or token recorded/);
  assert.match(DEPLOY_SOURCE, /participants = MISSISSIPPI_PREVIEW_MODE/);
  assert.match(DEPLOY_SOURCE, /SCOPE_IDS\.split\(","\)\.filter\(Boolean\)\.length !== 2/);
  assert.match(DEPLOY_SOURCE, /rcapStagingScopeSha256=/);
  assert.match(DEPLOY_SOURCE, /const args = \["vercel@latest", "deploy", "--archive=tgz", "--yes"/);
  assert.doesNotMatch(DEPLOY_SOURCE.match(/const args = \[[^\n]+/)?.[0] ?? "", /--prod/);
});

test("same worker source SHA reuses the accepted immutable digest", async () => {
  const { createWorkerInputPlan } = await importFeature(
    WORKER_PLAN_MODULE,
    "Lane F worker-input plan module"
  );
  const plan = createWorkerInputPlan({
    rootDir: ROOT,
    acceptedSourceSha: ACCEPTED_SOURCE,
    acceptedDigest: ACCEPTED_DIGEST,
    candidateSha: ACCEPTED_SOURCE
  });

  assert.equal(plan.rebuildRequired, false);
  assert.equal(plan.decision, "reuse-accepted-digest");
  assert.deepEqual(plan.changedPaths, []);
  assert.equal(plan.image.digest, ACCEPTED_DIGEST);
  assert.deepEqual(plan.image.tags, []);
  assert.match(plan.aggregateInputSha256, /^sha256:[0-9a-f]{64}$/);
});

test("distinct evidence-only SHA reuses the digest with the accepted image revision", async () => {
  const { createWorkerInputPlan } = await importFeature(
    WORKER_PLAN_MODULE,
    "Lane F worker-input plan module"
  );
  const plan = createWorkerInputPlan({
    rootDir: ROOT,
    acceptedSourceSha: CANONICAL_ACCEPTED_SOURCE,
    acceptedDigest: CANONICAL_ACCEPTED_DIGEST,
    candidateSha: EVIDENCE_ONLY_CANDIDATE
  });

  assert.deepEqual(plan.changedPaths, []);
  assert.equal(plan.rebuildRequired, false);
  assert.equal(plan.decision, "reuse-accepted-digest");
  assert.equal(plan.image.digest, CANONICAL_ACCEPTED_DIGEST);
  assert.equal(plan.image.sourceSha, CANONICAL_ACCEPTED_SOURCE);
  assert.equal(
    plan.image.ociAnnotations["org.opencontainers.image.revision"],
    CANONICAL_ACCEPTED_SOURCE
  );
});

test("current base versus accepted worker source requires a full-SHA-only rebuild", async () => {
  const { createWorkerInputPlan } = await importFeature(
    WORKER_PLAN_MODULE,
    "Lane F worker-input plan module"
  );
  const plan = createWorkerInputPlan({
    rootDir: ROOT,
    acceptedSourceSha: ACCEPTED_SOURCE,
    acceptedDigest: ACCEPTED_DIGEST,
    candidateSha: CURRENT_BASE
  });
  const expectedChangedPaths = gitLines([
    "diff",
    "--name-only",
    "--no-renames",
    ACCEPTED_SOURCE,
    CURRENT_BASE,
    "--",
    ...CANONICAL_INPUTS
  ]);

  assert.equal(plan.rebuildRequired, true);
  assert.equal(plan.decision, "rebuild-required");
  assert.deepEqual(plan.changedPaths, expectedChangedPaths);
  assert.equal(plan.changedPaths.length > 0, true);
  assert.equal(plan.changedPaths.includes("package.json"), true);
  assert.equal(plan.changedPaths.some((changedPath) => changedPath.startsWith("src/")), true);
  assert.deepEqual(plan.image.tags, [CURRENT_BASE]);
  assert.equal(plan.image.tags.includes("latest"), false);
  assert.equal(plan.image.digest, "pending");
  assert.equal(plan.image.ociAnnotations["org.opencontainers.image.revision"], CURRENT_BASE);
  assert.match(plan.aggregateInputSha256, /^sha256:[0-9a-f]{64}$/);
  assert.equal(
    createWorkerInputPlan({
      rootDir: ROOT,
      acceptedSourceSha: ACCEPTED_SOURCE,
      acceptedDigest: ACCEPTED_DIGEST,
      candidateSha: CURRENT_BASE
    }).aggregateInputSha256,
    plan.aggregateInputSha256
  );
});

test("worker plan CLI writes sanitized evidence to the external layout", (t) => {
  requireFeature(WORKER_PLAN_MODULE, "Lane F worker-input plan CLI");
  const externalRoot = path.join(temporaryDirectory(t, "rcap-worker-plan-"), "evidence");
  const forbiddenValues = [
    "worker-password-should-never-leak",
    "promotion-code-should-never-leak",
    "sk_test_worker_secret_should_never_leak"
  ];
  const result = runNode(WORKER_PLAN_MODULE, {
    HOSTED_ACCEPTANCE_EVIDENCE_DIR: externalRoot,
    HOSTED_ACCEPTED_WORKER_SOURCE_SHA: ACCEPTED_SOURCE,
    HOSTED_ACCEPTED_WORKER_DIGEST: ACCEPTED_DIGEST,
    HOSTED_APPLICATION_SHA: CURRENT_BASE,
    ACCEPTANCE_CONSUMER_PASSWORD: forbiddenValues[0],
    HOSTED_PROMOTION_VALID_CODE: forbiddenValues[1],
    HOSTED_STRIPE_TEST_SECRET: forbiddenValues[2]
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  const evidencePath = path.join(externalRoot, "worker-input-plan.json");
  const rawEvidence = fs.readFileSync(evidencePath, "utf8");
  const evidence = JSON.parse(rawEvidence);
  assert.equal(evidence.rebuildRequired, true);
  assert.equal(evidence.candidateSha, CURRENT_BASE);
  assert.deepEqual(evidence.canonicalInputs, CANONICAL_INPUTS);
  assert.deepEqual(evidence.image.tags, [CURRENT_BASE]);
  for (const forbidden of forbiddenValues) assert.equal(rawEvidence.includes(forbidden), false, `leaked ${forbidden}`);
});

test("every existing Lane F hosted entrypoint honors the shared evidence override", () => {
  for (const fileName of EXISTING_HOSTED_ENTRYPOINTS) {
    const source = fs.readFileSync(path.join(SCRIPTS, fileName), "utf8");
    assert.match(
      source,
      /from "\.\/rcap-hosted-acceptance-evidence-layout\.mjs"/,
      `${fileName} must import the shared evidence layout`
    );
    assert.match(
      source,
      /prepareHostedAcceptanceEvidenceLayout/,
      `${fileName} must prepare the override-aware evidence layout`
    );
    assert.doesNotMatch(
      source,
      /const EVIDENCE_DIR = path\.join\([^\n]+"hosted-acceptance-evidence"\)/,
      `${fileName} must not pin the legacy directory directly`
    );
  }
});
