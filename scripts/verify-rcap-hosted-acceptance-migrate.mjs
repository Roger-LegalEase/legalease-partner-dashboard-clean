#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CANONICAL_APPLICATION_SHA = "664b8ddd374642bf2bd1820f7e05224f3dd081bc";
const CANONICAL_WORKER_DIGEST = "sha256:e958cb057abaa1c22902d01ffe0e42aec0feb09118ba9f2bc44210cbdeb244c7";
const ACCEPTANCE_PROJECT_REF = "hyflxnlhpmiqxvvcoiia";
const PHASE_55_PATH = "supabase/phase-55-expungement-matter-payment-binding.sql";
const PHASE_55_AUTHORIZATION_ID = "auth-2026-08-16-pr101-release-integration";

const read = (relativePath) => fs.readFileSync(path.join(rootDir, relativePath), "utf8");
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");

const original = {
  migrate: read("scripts/rcap-hosted-acceptance-migrate.mjs"),
  phase55: read(PHASE_55_PATH),
  action: JSON.parse(read("data/rcap-staging-action.json")),
  readiness: JSON.parse(read("data/rcap-staging-authorization-readiness.json")),
  authorizationQueue: JSON.parse(read("data/rcap-authorization-queue.json")),
  publicationEvidence: JSON.parse(read("data/rcap-render/worker-publication-evidence.json")),
  f1Stack: read("scripts/f1-ephemeral-staging-stack.mjs"),
  workflows: [
    read(".github/workflows/rcap-f1-ephemeral-staging.yml"),
    read(".github/workflows/rcap-hosted-acceptance-staging.yml"),
    read(".github/workflows/rcap-github-hosted-acceptance.yml")
  ]
};

function validate(snapshot) {
  const failures = [];
  const check = (condition, message) => { if (!condition) failures.push(message); };

  const baseSequence = snapshot.action.migrationsInApplyOrder ?? [];
  check(
    baseSequence.map((entry) => entry.phase).join(",") === "49,50,51,52,53,54"
      && baseSequence.every((entry, index) => entry.sequencePosition === index + 1),
    "the prepared base sequence must remain exactly 49 -> 50 -> 51 -> 52 -> 53 -> 54"
  );

  const authorization = (snapshot.authorizationQueue.entries ?? []).find((entry) => entry.id === PHASE_55_AUTHORIZATION_ID);
  const pathIndex = (authorization?.authorizedPaths ?? []).indexOf(PHASE_55_PATH);
  const authorizedHash = pathIndex >= 0 ? authorization.authorizedSha256?.[pathIndex] ?? null : null;
  const diskHash = sha256(snapshot.phase55);
  const readinessHash = snapshot.readiness.blockers
    ?.find((blocker) => blocker.id === "RCAP-SEC-001")
    ?.resolution?.migrationSha256?.["phase-55"] ?? null;
  check(authorization?.decision === "approved", "Phase 55 exact-path authorization must be approved");
  check(authorization?.authorizationScope === "repository_integration_and_nonproduction_acceptance_only", "Phase 55 authorization scope must remain repository integration and nonproduction acceptance only");
  check(authorization?.scopedAuthorization?.acceptance?.startsWith("authorized"), "Phase 55 must be authorized for acceptance and no broader environment by this harness");
  check(!authorization?.scopedAuthorization?.production?.startsWith("authorized"), "Phase 55 must remain unauthorized for production");
  check(pathIndex >= 0, "Phase 55 path is absent from the exact-path authorization");
  check(diskHash === authorizedHash, `Phase 55 disk hash ${diskHash} differs from authorization ${authorizedHash}`);
  check(diskHash === readinessHash, `Phase 55 disk hash ${diskHash} differs from readiness ${readinessHash}`);

  for (const workflow of snapshot.workflows) {
    check(workflow.includes(CANONICAL_APPLICATION_SHA), "a hosted workflow does not pin the canonical application SHA");
    check(workflow.includes(`AUTHORIZED_WORKER_SOURCE_SHA: ${CANONICAL_APPLICATION_SHA}`), "a hosted workflow does not pin the canonical worker source SHA");
    check(workflow.includes(CANONICAL_WORKER_DIGEST), "a hosted workflow does not pin the canonical worker digest");
  }
  for (const workflow of snapshot.workflows.slice(1)) {
    check(workflow.includes(ACCEPTANCE_PROJECT_REF), "a reusable hosted workflow does not pin the acceptance project ref");
  }

  const publication = snapshot.publicationEvidence;
  const readinessPublication = snapshot.readiness.workerImagePublication ?? {};
  check(readinessPublication.publishedSourceSha === publication.sourceSha, "readiness current worker source differs from committed publication evidence");
  check(readinessPublication.publishedDigest === publication.immutableRegistryDigest, "readiness current worker digest differs from committed publication evidence");
  check(String(readinessPublication.workflowRunId) === String(publication.workflowRunId), "readiness publication run differs from committed evidence");
  check(readinessPublication.workflowSha256 === publication.workflowSha256, "readiness publication workflow hash differs from committed evidence");
  check(readinessPublication.packageVisibility === publication.packageVisibility, "readiness package visibility differs from committed evidence");
  check(readinessPublication.mutableLatestTagCreated === publication.mutableLatestTagCreated, "readiness latest-tag result differs from committed evidence");
  check(readinessPublication.workflowConclusion === publication.workflowConclusion, "readiness workflow conclusion differs from committed evidence");
  check(readinessPublication.publishOnlyNoDeploy === publication.publishOnlyNoDeploy, "readiness publish-only result differs from committed evidence");
  check(readinessPublication.workerClaimingStarted === publication.workerClaimingStarted, "readiness worker-claiming result differs from committed evidence");
  check(readinessPublication.stagingAndProductionUnchanged === publication.stagingAndProductionUnchanged, "readiness environment-change result differs from committed evidence");

  const f1 = snapshot.f1Stack;
  for (const token of [
    'const PHASE_55_PATH = "supabase/phase-55-expungement-matter-payment-binding.sql"',
    'const PHASE_55_AUTHORIZATION_ID = "auth-2026-08-16-pr101-release-integration"',
    'authorizedSequence.map((entry) => entry.phase).join(",") === "49,50,51,52,53,54,55"',
    'for (const m of authorizedSequence)',
    '49 -> 55 applied in order'
  ]) check(f1.includes(token), `F1 stack no longer proves ${JSON.stringify(token)}`);

  const source = snapshot.migrate;
  const requiredSource = [
    `const AUTHORIZED_ACCEPTANCE_PROJECT_REF = "${ACCEPTANCE_PROJECT_REF}"`,
    "PROJECT_REF !== AUTHORIZED_ACCEPTANCE_PROJECT_REF",
    `const PHASE_55_PATH = "${PHASE_55_PATH}"`,
    `const PHASE_55_AUTHORIZATION_ID = "${PHASE_55_AUTHORIZATION_ID}"`,
    "expectedPhases = \"49,50,51,52,53,54,55\"",
    ".filter((name) => !/^phase-(49|50|51|52|53|54|55)-/.test(name))",
    "const ledgerRows = await mustQuery(\n    \"read acceptance migration ledger\"",
    "authorization_id, applied_by",
    "ledger_hash_or_authorization_mismatch_refused",
    "phase55SignatureSql",
    "phase55AdoptionTransaction",
    "\n      savepoint phase55_probe;",
    "rollback to savepoint phase55_probe",
    "phase-55 rollback did not restore the pre-probe signature",
    "lock table public.consumer_briefcase_items",
    '"consumer_pending_screening_results",',
    "lock table public.rcap_acceptance_migration_ledger",
    "phase55Reconstituted !== phase55Sql",
    "on conflict (phase) do nothing",
    "authorized_migration_ledger_exact",
    "exact_authorized_fixed_point_adopted_without_reapply",
    "matter_payment_binding_hardened",
    "record_consumer_packet_payment(uuid,text,integer,text,text,text,text,text,text,text,text,text,uuid,uuid)",
    "packet_render_jobs_paid_matter_insert_trg",
    "packet_render_jobs_paid_matter_finalize_trg",
    "consumer_payment_consumption_binding_trg",
    "consumer_briefcase_items_paid_requires_server_evidence",
    "consumer_payment_consumption_currency_check",
    "49-55 are applied and enforcing"
  ];
  for (const token of requiredSource) check(source.includes(token), `migration harness is missing ${JSON.stringify(token)}`);
  check(!source.includes("!/^phase-(49|50|51|52|53|54)-/.test(name)"), "Phase 55 can still enter the nonblocking baseline pass");

  check(!source.includes("on conflict (phase) do update"), "the migration ledger can overwrite history");
  check(source.includes("rows.length === 1") && source.includes("authorization_id === entry.authorizationId"), "exact ledger row readback is absent");
  check(snapshot.workflows[1].includes("node scripts/verify-rcap-hosted-acceptance-migrate.mjs --mutations"), "hosted workflow does not run the migration verifier and mutations");

  return failures;
}

const failures = validate(original);
if (failures.length > 0) {
  console.error(`verify-rcap-hosted-acceptance-migrate FAILED: ${failures.length} check(s)`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

if (process.argv.includes("--mutations")) {
  const clone = () => structuredClone(original);
  const mutations = [
    ["Phase 55 bytes drift", (snapshot) => { snapshot.phase55 += "\n-- unauthorized drift\n"; }],
    ["Phase 55 readiness hash drifts", (snapshot) => {
      snapshot.readiness.blockers.find((blocker) => blocker.id === "RCAP-SEC-001").resolution.migrationSha256["phase-55"] = "f".repeat(64);
    }],
    ["Phase 55 acceptance authorization is removed", (snapshot) => {
      snapshot.authorizationQueue.entries.find((entry) => entry.id === PHASE_55_AUTHORIZATION_ID).scopedAuthorization.acceptance = "queued";
    }],
    ["Phase 55 production authorization is added", (snapshot) => {
      snapshot.authorizationQueue.entries.find((entry) => entry.id === PHASE_55_AUTHORIZATION_ID).scopedAuthorization.production = "authorized";
    }],
    ["Phase 55 falls back into the baseline", (snapshot) => {
      snapshot.migrate = snapshot.migrate.replace("49|50|51|52|53|54|55", "49|50|51|52|53|54");
    }],
    ["pending-result handoff falls out of the baseline", (snapshot) => {
      snapshot.migrate = snapshot.migrate.replace('    "consumer_pending_screening_results",\n', "");
    }],
    ["Phase 55 savepoint is removed", (snapshot) => {
      snapshot.migrate = snapshot.migrate.replace("savepoint phase55_probe", "select true");
    }],
    ["Phase 55 rollback is removed", (snapshot) => {
      snapshot.migrate = snapshot.migrate.replace("rollback to savepoint phase55_probe", "release savepoint phase55_probe");
    }],
    ["Phase 55 ledger lock is removed", (snapshot) => {
      snapshot.migrate = snapshot.migrate.replace("lock table public.rcap_acceptance_migration_ledger", "select 'ledger unlocked'");
    }],
    ["Phase 55 transaction extraction is loosened", (snapshot) => {
      snapshot.migrate = snapshot.migrate.replace("phase55Reconstituted !== phase55Sql", "false");
    }],
    ["ledger history becomes overwritable", (snapshot) => {
      snapshot.migrate = snapshot.migrate.replaceAll("on conflict (phase) do nothing", "on conflict (phase) do update set sha256 = excluded.sha256");
    }],
    ["ledger mismatch refusal is removed", (snapshot) => {
      snapshot.migrate = snapshot.migrate.replace("ledger_hash_or_authorization_mismatch_refused", "ledger_drift_ignored");
    }],
    ["exact ledger row cardinality is removed", (snapshot) => {
      snapshot.migrate = snapshot.migrate.replaceAll("rows.length === 1", "true");
    }],
    ["migration ledger read becomes unchecked", (snapshot) => {
      snapshot.migrate = snapshot.migrate.replace('mustQuery(\n    "read acceptance migration ledger"', 'query(\n    "read acceptance migration ledger"');
    }],
    ["Phase 55 trigger signature class is removed", (snapshot) => {
      snapshot.migrate = snapshot.migrate.replace("packet_render_jobs_paid_matter_finalize_trg", "packet_render_jobs_finalizer_missing");
    }],
    ["hosted workflow is repointed to another application", (snapshot) => {
      snapshot.workflows[0] = snapshot.workflows[0].replaceAll(CANONICAL_APPLICATION_SHA, "0".repeat(40));
    }],
    ["hosted workflow worker source is repointed", (snapshot) => {
      snapshot.workflows[1] = snapshot.workflows[1].replace(`AUTHORIZED_WORKER_SOURCE_SHA: ${CANONICAL_APPLICATION_SHA}`, `AUTHORIZED_WORKER_SOURCE_SHA: ${"0".repeat(40)}`);
    }],
    ["hosted workflow stops running migration mutations", (snapshot) => {
      snapshot.workflows[1] = snapshot.workflows[1].replace("node scripts/verify-rcap-hosted-acceptance-migrate.mjs --mutations", "echo skipped");
    }],
    ["F1 omits Phase 55", (snapshot) => {
      snapshot.f1Stack = snapshot.f1Stack.replace('49,50,51,52,53,54,55', '49,50,51,52,53,54');
    }],
    ["readiness current publication digest drifts", (snapshot) => {
      snapshot.readiness.workerImagePublication.publishedDigest = `sha256:${"0".repeat(64)}`;
    }]
  ];

  const survived = [];
  for (const [name, mutate] of mutations) {
    const snapshot = clone();
    mutate(snapshot);
    if (validate(snapshot).length === 0) survived.push(name);
    else console.log(`  caught   ${name}`);
  }
  if (survived.length > 0) {
    console.error(`verify-rcap-hosted-acceptance-migrate mutations FAILED: ${survived.length} survived`);
    for (const name of survived) console.error(`  - ${name}`);
    process.exit(1);
  }
  console.log(`verify-rcap-hosted-acceptance-migrate mutations passed: ${mutations.length}/${mutations.length} red`);
} else {
  console.log("verify-rcap-hosted-acceptance-migrate passed: canonical pins and acceptance-only 49 -> 55 migration plan are exact");
}
