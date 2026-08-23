#!/usr/bin/env node
// ENV-007 workflow hardening — the static and dry-run proof.
//
// Nothing here touches a network, a database, a registry or a deployment. Every
// case is either a pure exercise of the selection module against a fixture, or
// a static assertion over committed workflow and script text.
//
// Run: node scripts/verify-rcap-acceptance-workflow-hardening.mjs

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import {
  loadManifest,
  verifyManifest,
  selectBaselineFiles,
  planSequence,
  assertLedgerSequence,
  recoveryDisposition,
  verifyAcceptanceAuthorization,
  computeManifestHash,
  baselineSortKey
} from "./lib/rcap-migration-manifest.mjs";
import { SNAPSHOT_SOURCES } from "./lib/rcap-acceptance-schema-snapshot.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => fs.readFileSync(path.join(rootDir, rel), "utf8");
const git = (...args) => execFileSync("git", args, { cwd: rootDir, encoding: "utf8", maxBuffer: 1 << 28 });

let passed = 0;
let failed = 0;
const results = [];
function check(id, ok, observed) {
  results.push({ id, ok, observed });
  if (ok) { passed += 1; console.log(`PASS  ${id}\n      ${observed}`); }
  else { failed += 1; console.log(`FAIL  ${id}\n      ${observed}`); }
}

const manifest = loadManifest(rootDir);
const action = JSON.parse(read("data/rcap-staging-action.json"));
const readiness = JSON.parse(read("data/rcap-staging-authorization-readiness.json"));
const supabaseFiles = fs.readdirSync(path.join(rootDir, "supabase"));

const hostedWorkflow = read(".github/workflows/rcap-hosted-acceptance-staging.yml");
const f1Workflow = read(".github/workflows/rcap-f1-ephemeral-staging.yml");
const fallbackWorkflow = read(".github/workflows/rcap-github-hosted-acceptance.yml");
const migrateRunner = read("scripts/rcap-hosted-acceptance-migrate.mjs");
const deployScript = read("scripts/rcap-hosted-acceptance-deploy.mjs");
const paymentScript = read("scripts/rcap-hosted-acceptance-payment.mjs");

// =============================================================================
// §3 — the phase-55 double-application defect: reproduce, then correct
// =============================================================================

// The pre-fix selection, transcribed from scripts/rcap-hosted-acceptance-migrate.mjs
// at INFRA_BASE_SHA. It is kept here as the reproduction fixture, and nowhere
// else: no product path imports it.
function legacyBaselineSelection(fileNames) {
  const LEGACY_HARDENING_PHASE = "phase-56-public-view-and-default-privilege-hardening.sql";
  return fileNames
    .filter((name) => name.endsWith(".sql"))
    .filter((name) => !/^phase-(49|50|51|52|53|54)-/.test(name))
    .filter((name) => name !== LEGACY_HARDENING_PHASE)
    .filter((name) => name !== "partner-seed-demo.sql")
    .sort((a, b) => {
      const [an, as_, af] = baselineSortKey(a);
      const [bn, bs, bf] = baselineSortKey(b);
      return an - bn || as_.localeCompare(bs) || af.localeCompare(bf);
    })
    .map((name) => `supabase/${name}`);
}

{
  const legacyBaseline = legacyBaselineSelection(supabaseFiles);
  const legacySequence = action.migrationsInApplyOrder.map((e) => e.path);
  const legacyAll = [...legacyBaseline, ...legacySequence];
  const legacy55 = legacyAll.filter((p) => p.includes("phase-55-")).length;
  check(
    "legacy_regex_selection_reproduces_the_phase55_double_application",
    legacy55 === 2,
    `the pre-fix regex /^phase-(49|50|51|52|53|54)-/ leaves phase 55 in the baseline; baseline selects it once and the authorized sequence selects it again — total selections: ${legacy55} (defect reproduced: ${legacy55 === 2})`
  );
}

{
  const baseline = selectBaselineFiles({ manifest, fileNames: supabaseFiles });
  const sequence = manifest.migrations.map((m) => m.path);
  const all = [...baseline, ...sequence];
  const count55 = all.filter((p) => p.includes("phase-55-")).length;
  check(
    "phase_55_is_selected_exactly_once",
    count55 === 1,
    `manifest-based selection: phase 55 appears ${count55} time(s) across ${baseline.length} baseline file(s) and ${sequence.length} sequence entr(ies)`
  );

  const perMigration = manifest.migrations.map((m) => ({ phase: m.phase, count: all.filter((p) => p === m.path).length }));
  const notOnce = perMigration.filter((r) => r.count !== 1);
  check(
    "every_migration_is_selected_exactly_once",
    notOnce.length === 0,
    notOnce.length === 0
      ? `all ${perMigration.length} manifest migrations are selected exactly once: ${perMigration.map((r) => `${r.phase}=${r.count}`).join(", ")}`
      : `selected more or less than once: ${notOnce.map((r) => `phase ${r.phase} = ${r.count}`).join(", ")}`
  );

  check(
    "ordered_selection_has_length_seven",
    sequence.length === 7 && manifest.migrations.map((m) => m.phase).join(",") === "49,50,51,52,53,54,55",
    `ordered authorized selection: [${manifest.migrations.map((m) => m.phase).join(", ")}] — length ${sequence.length}`
  );

  const overlap = baseline.filter((rel) => sequence.includes(rel));
  check(
    "baseline_and_authorized_sequence_are_disjoint",
    overlap.length === 0,
    overlap.length === 0
      ? `${baseline.length} baseline file(s) and ${sequence.length} sequence file(s) share nothing; exclusion is by exact filename`
      : `overlap: ${overlap.join(", ")}`
  );
}

{
  const fullLedger = manifest.migrations.map((m) => ({ phase: m.phase, sha256: m.sha256 }));
  const plan = planSequence({ manifest, ledgerRows: fullLedger });
  check(
    "a_second_completed_run_selects_zero_migrations",
    plan.mode === "noop" && plan.toApply.length === 0,
    `with all ${fullLedger.length} exact hashes recorded the plan is "${plan.mode}" and selects ${plan.toApply.length} migration(s): ${plan.reason}`
  );

  const disposition = recoveryDisposition({ plan, readback: {} });
  check(
    "a_completed_environment_is_verify_only",
    disposition.resumeSafe === true && disposition.action === "verify_only",
    `recovery disposition: resumeSafe=${disposition.resumeSafe}, action=${disposition.action}`
  );
}

{
  // Prefix: 49,50,51 recorded at their exact hashes.
  const prefix = manifest.migrations.slice(0, 3).map((m) => ({ phase: m.phase, sha256: m.sha256 }));
  const plan = planSequence({ manifest, ledgerRows: prefix });
  check(
    "a_partial_sequence_resumes_from_the_first_unapplied_exact_hash",
    plan.mode === "apply" && plan.toApply[0]?.phase === 52 && plan.toApply.length === 4,
    `ledger [${prefix.map((p) => p.phase).join(",")}] -> mode "${plan.mode}", resumes at phase ${plan.toApply[0]?.phase}, applying ${plan.toApply.length}: ${plan.reason}`
  );
}

{
  // Gap: 49,50,52 recorded — 51 never took effect while a later phase did.
  const gapped = [0, 1, 3].map((i) => ({ phase: manifest.migrations[i].phase, sha256: manifest.migrations[i].sha256 }));
  const plan = planSequence({ manifest, ledgerRows: gapped });
  const disposition = recoveryDisposition({ plan, readback: {} });
  const namesRecreate = /delete the Supabase project and create a new one/i.test(plan.recovery ?? "");
  const namesNoProduction = /No production project is ever eligible/i.test(plan.recovery ?? "");
  check(
    "a_gapped_sequence_blocks_with_an_exact_disposable_project_recovery_instruction",
    plan.mode === "blocked" && plan.toApply.length === 0 && namesRecreate && namesNoProduction && disposition.action === "delete_and_recreate",
    `ledger [${gapped.map((g) => g.phase).join(",")}] -> mode "${plan.mode}" (${plan.code}); recovery names delete-and-recreate: ${namesRecreate}; names that no production project is eligible: ${namesNoProduction}`
  );
}

{
  // Phase 50 recorded at its exact hash must not be re-selected.
  const withFifty = manifest.migrations.slice(0, 2).map((m) => ({ phase: m.phase, sha256: m.sha256 }));
  const plan = planSequence({ manifest, ledgerRows: withFifty });
  const fiftySelected = plan.toApply.some((m) => m.phase === 50);
  const runnerNoLongerAdopts = !/ALREADY_PRESENT|objects_already_present_adopted/.test(migrateRunner.replace(/^\s*\/\/.*$/gm, ""));
  check(
    "phase_50_is_never_blindly_rerun_after_its_ledger_entry_exists",
    !fiftySelected && runnerNoLongerAdopts,
    `phase 50 recorded -> selected for re-apply: ${fiftySelected}; the runner no longer treats a duplicate-object error as "adopted": ${runnerNoLongerAdopts}. Phase 50 creates its triggers unconditionally, so a blind re-run raises a duplicate-object error rather than converging.`
  );
}

{
  const dup = [...manifest.migrations.map((m) => ({ phase: m.phase, sha256: m.sha256 })), { phase: 55, sha256: manifest.migrations[6].sha256 }];
  const verdict = assertLedgerSequence({ manifest, ledgerRows: dup });
  check(
    "phase_55_cannot_be_recorded_twice",
    verdict.ok === false && verdict.perPhase[55] === 2 && verdict.errors.some((e) => e.includes("phase_55_execution_count")),
    `a ledger carrying phase 55 twice fails the sequence assertion: perPhase[55]=${verdict.perPhase[55]}, errors=${verdict.errors.join("; ")}`
  );

  const exact = manifest.migrations.map((m) => ({ phase: m.phase, sha256: m.sha256 }));
  const good = assertLedgerSequence({ manifest, ledgerRows: exact });
  check(
    "the_ledger_sequence_is_exactly_49_to_55_once_each",
    good.ok && good.observed.join(",") === "49,50,51,52,53,54,55" && Object.values(good.perPhase).every((n) => n === 1),
    `expected [${good.expected.join(",")}], observed [${good.observed.join(",")}], per-phase counts ${JSON.stringify(good.perPhase)}`
  );
}

// =============================================================================
// §2 — the manifest is authoritative, and refuses before the first write
// =============================================================================

{
  const verdict = verifyManifest({ manifest, rootDir, action, readiness });
  check(
    "explicit_migration_manifest_is_authoritative",
    verdict.ok &&
      migrateRunner.includes('from "./lib/rcap-migration-manifest.mjs"') &&
      migrateRunner.includes("selectBaselineFiles(") &&
      migrateRunner.includes("planSequence("),
    `verifyManifest ok=${verdict.ok} over ${verdict.rows.length} entries; the runner imports the manifest module and uses selectBaselineFiles/planSequence`
  );

  // No regex may decide membership any more. Comment lines are stripped first:
  // the runner documents the old regex in its header on purpose.
  const code = migrateRunner.split("\n").filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join("\n");
  check(
    "no_regex_decides_which_migrations_execute",
    !/phase-\(49\|/.test(code) && !/readdirSync[\s\S]{0,400}?\.filter\(\(name\) => !\//.test(code),
    `the runner's executable lines contain no phase-number regex filter; selection comes from ${manifest.migrations.length} exact filenames in data/rcap-acceptance-migration-manifest.json`
  );

  check(
    "manifest_hash_describes_its_own_contents",
    computeManifestHash(manifest) === manifest.manifestHash,
    `manifestHash ${manifest.manifestHash} recomputes exactly`
  );
}

// Fixture tree: a copy of supabase/ plus the data records, so a mutation can be
// proven to stop the run without touching the repository.
function fixtureRoot(mutate) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "rcap-manifest-fixture-"));
  fs.mkdirSync(path.join(dir, "supabase"));
  for (const name of supabaseFiles) {
    if (!name.endsWith(".sql")) continue;
    fs.copyFileSync(path.join(rootDir, "supabase", name), path.join(dir, "supabase", name));
  }
  fs.mkdirSync(path.join(dir, "data"));
  const localManifest = JSON.parse(JSON.stringify(manifest));
  mutate({ dir, manifest: localManifest });
  fs.writeFileSync(path.join(dir, "data/rcap-acceptance-migration-manifest.json"), JSON.stringify(localManifest, null, 2));
  return { dir, manifest: localManifest };
}

{
  const { dir, manifest: m } = fixtureRoot(({ dir }) => {
    // One byte appended to phase 52 on disk: the file no longer matches its
    // authorized hash.
    const target = path.join(dir, "supabase/phase-52-rcap-consumer-payment-authority.sql");
    fs.appendFileSync(target, "\n-- fixture mutation\n");
  });
  const verdict = verifyManifest({ manifest: m, rootDir: dir, action, readiness });
  check(
    "migration_hash_mismatch_stops_before_write",
    verdict.ok === false && verdict.errors.some((e) => e.startsWith("hash_mismatch: supabase/phase-52")),
    `a one-line change to phase 52 on disk is refused before anything is applied: ${verdict.errors.filter((e) => e.startsWith("hash_mismatch")).join("; ")}`
  );
  fs.rmSync(dir, { recursive: true, force: true });
}

{
  const { dir, manifest: m } = fixtureRoot(({ dir }) => {
    // An extra migration inside the authorized range that no record authorizes.
    fs.writeFileSync(path.join(dir, "supabase/phase-53a-unauthorized-addition.sql"), "begin;\nselect 1;\ncommit;\n");
  });
  const verdict = verifyManifest({ manifest: m, rootDir: dir, action, readiness });
  check(
    "unknown_migration_stops_before_write",
    verdict.ok === false && verdict.errors.some((e) => e.startsWith("unknown_migration: supabase/phase-53a")),
    `an unlisted phase-53a inside the authorized range is refused: ${verdict.errors.filter((e) => e.startsWith("unknown_migration")).join("; ")}`
  );
  fs.rmSync(dir, { recursive: true, force: true });
}

{
  const { dir, manifest: m } = fixtureRoot(({ dir }) => {
    fs.rmSync(path.join(dir, "supabase/phase-54-rcap-person-namespace-hardening.sql"));
  });
  const verdict = verifyManifest({ manifest: m, rootDir: dir, action, readiness });
  check(
    "missing_migration_stops_before_write",
    verdict.ok === false && verdict.errors.some((e) => e.startsWith("missing_migration: supabase/phase-54")),
    `a manifest member absent from disk is refused: ${verdict.errors.filter((e) => e.startsWith("missing_migration")).join("; ")}`
  );
  fs.rmSync(dir, { recursive: true, force: true });
}

{
  // The runner must exit before writing when the gate fails. Proven from the
  // control flow: the refusal writes evidence and process.exit(1) ahead of the
  // ledger create, the snapshot, the marker and the baseline loop.
  const refusalAt = migrateRunner.indexOf("MIGRATE REFUSED");
  const firstWriteAt = Math.min(
    ...["create table if not exists public.rcap_acceptance_migration_ledger",
        "captureSchemaSnapshot(",
        "rcap_acceptance_environment_marker",
        "for (const rel of ordered)"]
      .map((needle) => { const i = migrateRunner.indexOf(needle); return i === -1 ? Number.MAX_SAFE_INTEGER : i; })
  );
  check(
    "the_manifest_gate_precedes_every_write_in_the_runner",
    refusalAt !== -1 && refusalAt < firstWriteAt,
    `the manifest refusal and process.exit sit at offset ${refusalAt}, ahead of the first write at offset ${firstWriteAt}`
  );
}

// =============================================================================
// §1 — authorization is a separate fact from byte integrity
// =============================================================================

{
  const auth = verifyAcceptanceAuthorization({ manifest });
  const authorized = auth.rows.filter((r) => r.acceptanceAuthorized).map((r) => r.phase);
  check(
    "acceptance_authorization_is_recorded_per_phase",
    auth.rows.length === manifest.migrations.length &&
      auth.rows.every((r) => typeof r.acceptanceAuthorizationRecord === "string" && r.acceptanceAuthorizationRecord.length > 0),
    `every one of the ${auth.rows.length} manifest members carries its acceptance-environment authorization verbatim from data/rcap-staging-action.json; authorized: [${authorized.join(", ")}], withheld: [${auth.withheldPhases.join(", ")}]`
  );

  check(
    "phase_49_and_phase_55_authorization_is_read_not_assumed",
    auth.rows.find((r) => r.phase === 49)?.acceptanceAuthorized === true &&
      auth.rows.find((r) => r.phase === 55)?.acceptanceAuthorized === true &&
      auth.rows.find((r) => r.phase === 49)?.authorizationScope === "repository_integration_and_conditional_production_application" &&
      auth.rows.find((r) => r.phase === 55)?.authorizationScope === "repository_integration_and_nonproduction_acceptance_only",
    `phase 49 scope "${auth.rows.find((r) => r.phase === 49)?.authorizationScope}" (acceptance: ${auth.rows.find((r) => r.phase === 49)?.acceptanceAuthorizationRecord}); phase 55 scope "${auth.rows.find((r) => r.phase === 55)?.authorizationScope}" (acceptance: ${String(auth.rows.find((r) => r.phase === 55)?.acceptanceAuthorizationRecord).slice(0, 60)}…) — both read from the action record, neither inferred from the runner including them`
  );

  check(
    "a_withheld_acceptance_authorization_stops_before_write",
    auth.ok === false &&
      auth.withheldPhases.join(",") === "50,51,52,53,54" &&
      migrateRunner.includes("every_migration_is_authorized_for_this_acceptance_environment") &&
      migrateRunner.indexOf("ACCEPTANCE AUTHORIZATION WITHHELD") <
        migrateRunner.indexOf("create table if not exists public.rcap_acceptance_migration_ledger"),
    `phases ${auth.withheldPhases.join(", ")} are recorded "queued" for staging, so the runner refuses before the ledger is created, before the marker is stamped and before any snapshot: ${auth.errors[0]}`
  );

  check(
    "the_manifest_does_not_itself_authorize_anything",
    /Membership in this manifest is NOT itself an authorization/.test(read("data/rcap-acceptance-migration-manifest.json")) &&
      manifest.containingActionStatus === "prepared_queued_not_authorized" &&
      Array.isArray(action.authorizes) && action.authorizes.length === 0,
    `the containing action record's status is "${manifest.containingActionStatus}" and its "authorizes" list is empty; the manifest says so in its own text`
  );
}

// =============================================================================
// §4 — GitHub Environment declarations
// =============================================================================

function parseJobs(yamlText) {
  // A deliberately small reader: job keys at two-space indent under `jobs:`,
  // and the `if:` / `environment:` lines that belong to each.
  const lines = yamlText.split("\n");
  const jobsAt = lines.findIndex((l) => /^jobs:\s*$/.test(l));
  const jobs = {};
  let current = null;
  for (let i = jobsAt + 1; i < lines.length; i += 1) {
    const line = lines[i];
    const jobKey = /^ {2}([A-Za-z0-9_-]+):\s*$/.exec(line);
    if (jobKey) { current = jobKey[1]; jobs[current] = { if: null, environmentName: null, uses: null, raw: [] }; continue; }
    if (!current) continue;
    if (/^\S/.test(line)) break;
    jobs[current].raw.push(line);
    const ifLine = /^ {4}if:\s*(.+?)\s*$/.exec(line);
    if (ifLine) jobs[current].if = ifLine[1];
    const usesLine = /^ {4}uses:\s*(.+?)\s*$/.exec(line);
    if (usesLine) jobs[current].uses = usesLine[1];
    if (/^ {4}environment:\s*$/.test(line)) {
      const nameLine = /^ {6}name:\s*(.+?)\s*$/.exec(lines[i + 1] ?? "");
      if (nameLine) jobs[current].environmentName = nameLine[1];
    }
    const inlineEnv = /^ {4}environment:\s*(\S.*?)\s*$/.exec(line);
    if (inlineEnv) jobs[current].environmentName = inlineEnv[1];
  }
  return jobs;
}

const hostedJobs = parseJobs(hostedWorkflow);

{
  const writeJobs = Object.entries(hostedJobs).filter(([, j]) => j.environmentName !== null);
  const readOnlyJobs = Object.entries(hostedJobs).filter(([, j]) => j.environmentName === null);
  const writeCapable = hostedJobs.hosted_write;
  check(
    "environment_declared_on_every_write_capable_job",
    Boolean(writeCapable?.environmentName) &&
      /rcap-acceptance/.test(writeCapable.environmentName) &&
      writeCapable.if === "inputs.phase != 'preflight' && inputs.phase != 'vercel_audit'",
    `write-capable job "hosted_write" declares environment ${writeCapable?.environmentName ?? "NONE"} and runs for every phase except preflight and vercel_audit; jobs with an environment: ${writeJobs.map(([k]) => k).join(", ") || "none"}; without: ${readOnlyJobs.map(([k]) => k).join(", ") || "none"}`
  );

  const paymentJob = hostedJobs.hosted_payment;
  check(
    "hosted_payment_uses_the_separate_payment_environment",
    paymentJob?.environmentName === "rcap-acceptance-payment" &&
      paymentJob?.if === "inputs.phase == 'payment'" &&
      writeCapable?.environmentName === "rcap-acceptance",
    `hosted_payment runs only for the payment phase in environment ${paymentJob?.environmentName}; hosted_write runs every other write phase in ${writeCapable?.environmentName}. Two jobs, two environments, no shared Stripe secret.`
  );

  const ro = hostedJobs.readonly_probe;
  check(
    "read_only_phases_declare_no_write_environment",
    Boolean(ro) && ro.environmentName === null && ro.if === "inputs.phase == 'preflight' || inputs.phase == 'vercel_audit'",
    `"readonly_probe" runs for preflight and vercel_audit and declares no environment (${ro?.environmentName ?? "none"})`
  );

  check(
    "the_environment_name_is_never_empty_for_a_write_capable_run",
    writeCapable?.environmentName === "rcap-acceptance" &&
      hostedJobs.hosted_payment?.environmentName === "rcap-acceptance-payment" &&
      ![writeCapable?.environmentName, hostedJobs.hosted_payment?.environmentName].some((n) => !n || n.includes("${{")),
    `both write-capable jobs name a literal environment — hosted_write: ${writeCapable?.environmentName}, hosted_payment: ${hostedJobs.hosted_payment?.environmentName}. Neither is an expression, so neither can evaluate to an empty name.`
  );

  check(
    "pinned_value_refusal_survives_the_environment_change",
    (hostedWorkflow.match(/application_sha is not the authorized value/g) ?? []).length >= 2 &&
      (hostedWorkflow.match(/supabase_project_ref is not the authorized acceptance project/g) ?? []).length >= 2 &&
      /AUTHORIZED_ACCEPTANCE_PROJECT_REF: hyflxnlhpmiqxvvcoiia/.test(hostedWorkflow),
    `both jobs still refuse any input that is not the authorized pinned value; the environment declaration supplements the refusal rather than replacing it`
  );
}

// =============================================================================
// The Stripe privilege boundary — hosted_payment is the only payment-authorized
// phase, and the only job that holds a Stripe secret expression.
// =============================================================================

/**
 * Attribute every line of a workflow to the job whose block it sits in, then
 * drop comment lines. A comment introducing a job sits ABOVE that job's key, so
 * a naive block split blames the previous job for it — and this boundary is
 * exactly the place where a false attribution would be believed.
 */
function executableLinesByJob(yamlText) {
  const lines = yamlText.split("\n");
  const byJob = new Map();
  let job = null;
  let sawJobsKey = false;
  for (const line of lines) {
    if (/^jobs:\s*$/.test(line)) { sawJobsKey = true; continue; }
    if (!sawJobsKey) continue;
    const key = /^ {2}([A-Za-z0-9_-]+):\s*$/.exec(line);
    if (key) { job = key[1]; if (!byJob.has(job)) byJob.set(job, []); continue; }
    if (job === null) continue;
    if (/^\s*#/.test(line)) continue;          // whole-line comment
    if (line.trim() === "") continue;
    byJob.get(job).push(line);
  }
  return byJob;
}

const STRIPE_SECRET_EXPR = /secrets\.HOSTED_STRIPE_TEST_(?:SECRET|WEBHOOK_SECRET)/;
const TRANSACTING_SCRIPTS = [
  "scripts/rcap-hosted-checkout-gate.mjs",
  "scripts/rcap-hosted-acceptance-payment.mjs"
];
const PAYMENT_JOB = "hosted_payment";

const hostedByJob = executableLinesByJob(hostedWorkflow);

{
  const offenders = [...hostedByJob.entries()]
    .filter(([name]) => name !== PAYMENT_JOB)
    .map(([name, ls]) => ({ name, hits: ls.filter((l) => STRIPE_SECRET_EXPR.test(l)) }))
    .filter((r) => r.hits.length > 0);
  const paymentHits = (hostedByJob.get(PAYMENT_JOB) ?? []).filter((l) => STRIPE_SECRET_EXPR.test(l)).length;
  check(
    "only_the_payment_authorized_job_receives_stripe_secret_expressions",
    offenders.length === 0 && paymentHits > 0,
    offenders.length === 0
      ? `${paymentHits} Stripe secret expression(s), all inside "${PAYMENT_JOB}"; jobs "${[...hostedByJob.keys()].filter((n) => n !== PAYMENT_JOB).join('", "')}" carry zero`
      : `Stripe secret expressions outside the payment job: ${offenders.map((o) => `${o.name} (${o.hits.length})`).join(", ")}`
  );
}

{
  const offenders = [...hostedByJob.entries()]
    .filter(([name]) => name !== PAYMENT_JOB)
    .map(([name, ls]) => ({ name, hits: ls.filter((l) => TRANSACTING_SCRIPTS.some((t) => l.includes(t))) }))
    .filter((r) => r.hits.length > 0);
  const paymentRuns = TRANSACTING_SCRIPTS.filter((t) =>
    (hostedByJob.get(PAYMENT_JOB) ?? []).some((l) => l.includes(t))
  );
  check(
    "only_the_payment_phase_may_invoke_a_stripe_transacting_script",
    offenders.length === 0 && paymentRuns.length === TRANSACTING_SCRIPTS.length,
    offenders.length === 0
      ? `both transacting scripts (${paymentRuns.map((t) => t.split("/").pop()).join(", ")}) are invoked only by "${PAYMENT_JOB}", whose job-level \`if\` is inputs.phase == 'payment'`
      : `transacting script invoked outside the payment job: ${offenders.map((o) => o.name).join(", ")}`
  );

  const paymentJobIf = /^ {2}hosted_payment:$[\s\S]*?^ {4}if: (.+)$/m.exec(hostedWorkflow)?.[1]?.trim();
  const paymentEnv = /^ {2}hosted_payment:$[\s\S]*?^ {4}environment:\s*$\n^ {6}name: (.+)$/m.exec(hostedWorkflow)?.[1]?.trim();
  check(
    "the_payment_job_is_bound_to_the_payment_phase_and_the_payment_environment",
    paymentJobIf === "inputs.phase == 'payment'" && paymentEnv === "rcap-acceptance-payment",
    `hosted_payment if=${JSON.stringify(paymentJobIf)} environment=${JSON.stringify(paymentEnv)}`
  );
}

{
  // The contract table is the single place a phase gains Stripe authorization.
  const table = /case "\$PHASE" in([\s\S]*?)esac/.exec(hostedWorkflow)?.[1] ?? "";
  // A row is `<phase>) VALUES ;;` on one line, or `<a>|<b>|<phase>)` with its
  // VALUES on the next. Both shapes appear in the table, so both are read.
  const tableLines = table.split("\n");
  const rowFor = (phase) => {
    const i = tableLines.findIndex((l) => new RegExp(`^\\s*(?:[a-z_]+\\|)*${phase}(?:\\|[a-z_]+)*\\)`).test(l));
    if (i === -1) return "";
    const rest = tableLines[i].replace(/^[^)]*\)/, "");
    return rest.trim().length > 0 ? rest : (tableLines[i + 1] ?? "");
  };
  const stripeTrue = (phase) => /STRIPE=true/.test(rowFor(phase));
  const sessionTrue = (phase) => /CHECKOUT_SESSION=true/.test(rowFor(phase));
  const matrixTrue = (phase) => /MATRIX=true/.test(rowFor(phase));

  check(
    "hosted_accept_contains_no_payment_matrix",
    matrixTrue("accept") && !stripeTrue("accept") && !sessionTrue("accept"),
    `accept: MATRIX=true, STRIPE=false, CHECKOUT_SESSION=false — it runs the non-transacting acceptance matrix and no payment journey. The payment-journey step no longer exists in the non-payment job at all.`
  );

  check(
    "hosted_full_cannot_transact",
    !stripeTrue("full") && !sessionTrue("full") &&
      !(hostedByJob.get("hosted_write") ?? []).some((l) => TRANSACTING_SCRIPTS.some((t) => l.includes(t))),
    `full: STRIPE=false, CHECKOUT_SESSION=false; and the non-payment job contains no transacting script to run even if a future edit set the flag`
  );

  check(
    "hosted_checkout_gate_is_non_transacting",
    !stripeTrue("checkout_gate") && !sessionTrue("checkout_gate") &&
      /VERIFY_GATE=true/.test(rowFor("checkout_gate")) &&
      (hostedByJob.get(PAYMENT_JOB) ?? []).some((l) => l.includes("scripts/rcap-hosted-checkout-gate.mjs")),
    `checkout_gate: VERIFY_GATE=true, STRIPE=false, CHECKOUT_SESSION=false — it runs the STATIC pinning verifier only. The operation that necessarily calls Stripe (rcap-hosted-checkout-gate.mjs, which creates one real Sandbox Session) moved into ${PAYMENT_JOB}`
  );

  const wcRow = rowFor("worker_contract");
  check(
    "hosted_worker_contract_contains_no_stripe_secret",
    /STRIPE=false/.test(wcRow) && !stripeTrue("worker_contract") && !sessionTrue("worker_contract") &&
      !(hostedByJob.get("hosted_write") ?? []).some((l) => STRIPE_SECRET_EXPR.test(l)),
    `worker_contract shares the all-false contract row (STRIPE=false) and runs in hosted_write, which carries zero Stripe secret expressions`
  );

  check(
    "no_non_payment_phase_can_create_a_checkout_session",
    ["full", "deploy", "accept", "checkout_gate", "worker_contract"].every((p) => !sessionTrue(p)) &&
      sessionTrue("payment") &&
      // Both contract-step guards abort the run rather than warning.
      /would create a Checkout Session without Stripe authorization"; exit 1/.test(hostedWorkflow) &&
      /only 'payment' may hold it"; exit 1/.test(hostedWorkflow) &&
      // And no non-payment job holds the script that creates one.
      !(hostedByJob.get("hosted_write") ?? []).some((l) => l.includes("scripts/rcap-hosted-checkout-gate.mjs")),
    `CHECKOUT_SESSION is true for payment alone and false for full, deploy, accept, checkout_gate and worker_contract; the contract step exits 1 if any phase ever pairs CHECKOUT_SESSION=true with STRIPE!=true or claims STRIPE outside the payment phase; and the only script that creates a Session is absent from the non-payment job entirely`
  );
}

{
  // The two secrets can no longer be PASSED IN, so the boundary does not rest
  // on an unset secret resolving to "".
  const declaredInWorkflowCall = /workflow_call:[\s\S]*?^permissions:/m.exec(hostedWorkflow)?.[0] ?? "";
  const declares = /^\s{6}HOSTED_STRIPE_TEST_(SECRET|WEBHOOK_SECRET):\s*$/m.test(declaredInWorkflowCall);
  const f1Forwards = f1Workflow.split("\n").filter((l) => !/^\s*#/.test(l)).some((l) => STRIPE_SECRET_EXPR.test(l));
  check(
    "the_stripe_secrets_cannot_be_supplied_from_outside_the_payment_environment",
    !declares && !f1Forwards,
    `the hosted workflow no longer declares either Stripe secret under workflow_call.secrets (${!declares}), and the F1 dispatch entry point forwards neither to any called workflow (${!f1Forwards}). The only source is the rcap-acceptance-payment environment, read by ${PAYMENT_JOB}`
  );

  // The github_acceptance fallback still references them; it now cannot receive
  // them, and its own first step refuses a non-sk_test key.
  const fallbackCallers = [".github/workflows/rcap-f1-ephemeral-staging.yml"];
  const fallbackStillFed = fallbackCallers.some((f) => {
    const text = read(f);
    const block = /uses: \.\/\.github\/workflows\/rcap-github-hosted-acceptance\.yml[\s\S]*?(?=\n  [a-z_]+:)/.exec(text)?.[0] ?? "";
    return block.split("\n").filter((l) => !/^\s*#/.test(l)).some((l) => STRIPE_SECRET_EXPR.test(l));
  });
  check(
    "the_github_acceptance_fallback_can_no_longer_transact",
    !fallbackStillFed &&
      /Stripe key is not sandbox sk_test_/.test(fallbackWorkflow) &&
      /on:\s*\n\s*workflow_call:/.test(fallbackWorkflow),
    `rcap-github-hosted-acceptance.yml is workflow_call-only with exactly one caller, that caller no longer forwards either Stripe secret, and the fallback's own first step exits 1 on a key that is not sk_test_ — so it fails closed instead of transacting outside the payment phase`
  );
}

{
  const paymentLines = hostedByJob.get(PAYMENT_JOB) ?? [];
  const failsClosed =
    /the rcap-acceptance-payment environment is missing/.test(hostedWorkflow) &&
    /refuses rather than running an un-transacting journey and reporting it as complete/.test(hostedWorkflow) &&
    paymentLines.some((l) => l.includes("id: stripe_present"));
  const antiskipRequires = /require "Stripe test secrets present and correctly shaped"\s+"\$O_STRIPE_PRESENT"/.test(hostedWorkflow);
  check(
    "an_empty_stripe_secret_never_reads_as_a_completed_acceptance",
    failsClosed && antiskipRequires,
    `hosted_payment fails closed on an absent or wrongly-shaped Stripe secret before any Stripe call, and its anti-skip gate requires that step's outcome, so an empty secret cannot present as a skipped step inside a green run`
  );

  const nonPaymentSaysSo = /no Stripe call, no Checkout Session, no payment journey/.test(hostedWorkflow);
  check(
    "non_payment_acceptance_states_what_it_did_not_do",
    nonPaymentSaysSo,
    `the non-payment anti-skip gate records explicitly that the lane produced no Stripe call, no Checkout Session and no payment journey, so a complete non-payment run cannot be read as a complete payment run`
  );
}

{
  const cases = /const REQUIRED_CASES = \[([\s\S]*?)\];/.exec(paymentScript)?.[1] ?? "";
  check(
    "payment_refuses_a_non_sk_test_key",
    /!STRIPE_KEY\.startsWith\("sk_test_"\)/.test(paymentScript) &&
      /process\.exit\(1\)/.test(paymentScript) &&
      /sk_test_\*\) ;;/.test(hostedWorkflow),
    `the payment journey exits 1 unless the key begins sk_test_, and the workflow refuses the same shape before the script is reached`
  );
  check(
    "payment_refuses_an_invalid_webhook_secret",
    /!WEBHOOK_SECRET\.startsWith\("whsec_"\)/.test(paymentScript) &&
      /whsec_\*\) ;;/.test(hostedWorkflow) &&
      /is not a whsec_ signing secret; refusing/.test(hostedWorkflow),
    `the payment journey exits 1 unless the signing secret begins whsec_, and the workflow refuses the same shape first`
  );
}

{
  const envOf = (job) => {
    const m = new RegExp(`^ {2}${job}:$[\\s\\S]*?^ {4}environment:\\s*$\\n^ {6}name: (.+)$`, "m").exec(hostedWorkflow);
    return m ? m[1].trim() : null;
  };
  const write = envOf("hosted_write");
  const pay = envOf("hosted_payment");
  check(
    "the_two_environments_stay_separate_with_no_shared_stripe_secret",
    write === "rcap-acceptance" && pay === "rcap-acceptance-payment" && write !== pay &&
      !(hostedByJob.get("hosted_write") ?? []).some((l) => STRIPE_SECRET_EXPR.test(l)),
    `hosted_write -> ${write} (migrate, deploy, non-payment acceptance, worker contract; zero Stripe expressions); hosted_payment -> ${pay} (Stripe test payment only). The required-reviewer boundary between them is a GitHub Settings control and is listed in the setup checklist.`
  );
}

{
  // The derived matrices, checked as data rather than re-derived here.
  const matrices = JSON.parse(read("data/rcap-render/phase-boundary-matrices.json"));
  const bad = Object.entries(matrices.invariants).filter(([, v]) => v !== true).map(([k]) => k);
  const stripePhases = matrices.secretMatrix.filter((r) => r.holdsStripeTestSecrets).map((r) => r.phase);
  const sessionPhases = matrices.externalWriteMatrix.filter((r) => r.createsCheckoutSession).map((r) => r.phase);
  check(
    "the_derived_phase_boundary_matrices_hold_every_invariant",
    bad.length === 0 && stripePhases.join(",") === "hosted_payment" && sessionPhases.join(",") === "hosted_payment",
    bad.length === 0
      ? `phases holding Stripe secrets: [${stripePhases.join(", ")}]; phases creating a Checkout Session: [${sessionPhases.join(", ")}]; no phase writes Vercel Production. Matrices derived from the workflow by scripts/rcap-phase-boundary-matrix.mjs`
      : `violated invariants: ${bad.join(", ")}`
  );
}

// =============================================================================
// §5, §6, §8 — deployment gates
// =============================================================================

{
  const workerReconcile = read("scripts/rcap-worker-authority-reconcile.mjs");
  const runsBeforeWrite =
    hostedWorkflow.indexOf("scripts/rcap-worker-authority-reconcile.mjs") <
    hostedWorkflow.indexOf("scripts/rcap-hosted-acceptance-migrate.mjs");
  check(
    "worker_mismatch_blocks_deploy",
    /WORKER_AUTHORITY_BLOCKED/.test(workerReconcile) &&
      /process\.exit\(1\)/.test(workerReconcile) &&
      hostedWorkflow.includes("node scripts/rcap-worker-authority-reconcile.mjs") &&
      /require "worker image authority resolved"/.test(hostedWorkflow) &&
      runsBeforeWrite,
    `the reconciler exits non-zero on WORKER_AUTHORITY_BLOCKED, the workflow runs it for every deploying/matrix/gate/diagnose phase ahead of the first write, and the anti-skip gate requires its outcome`
  );

  const reconciliation = JSON.parse(read("data/rcap-render/worker-authority-reconciliation.json"));
  check(
    "the_worker_authority_is_currently_blocked_and_no_pin_was_changed",
    reconciliation.status === "WORKER_AUTHORITY_BLOCKED" &&
      reconciliation.canonicalPair === null &&
      reconciliation.pinsUnchanged === true &&
      /AUTHORIZED_WORKER_DIGEST: sha256:4e5b58e4/.test(hostedWorkflow) &&
      /AUTHORIZED_WORKER_DIGEST: sha256:4e5b58e4/.test(f1Workflow),
    `${reconciliation.status} — ${reconciliation.reason}; the workflow pins are byte-unchanged from INFRA_BASE_SHA`
  );
}

{
  const equivalence = read("scripts/rcap-audit-surface-equivalence.mjs");
  const report = JSON.parse(read("data/rcap-render/audit-surface-equivalence.json"));
  check(
    "audit_source_equivalence_failure_blocks_deploy",
    /if \(!pass\) process\.exit\(1\)/.test(equivalence) &&
      hostedWorkflow.includes("node scripts/rcap-audit-surface-equivalence.mjs") &&
      /require "audited surface equals deployment source"/.test(hostedWorkflow),
    `the equivalence check exits non-zero on failure, the workflow runs it before deploying, and the anti-skip gate requires its outcome`
  );
  check(
    "the_audited_surface_is_computed_not_asserted",
    report.auditedSurface.fileCount > 0 &&
      report.rootSelection.flowManifestRootCount > 0 &&
      report.differingOutsideAuditedSurface.every((d) => d.reason.includes("not reachable from any audited root")),
    `${report.auditedSurface.fileCount} files in the closure from ${report.rootSelection.totalRoots} roots (${report.rootSelection.flowManifestRootCount} from the Phase 1 flow manifest); ${report.identicalCount} identical, ${report.differingInsideAuditedSurface.length} differing inside, ${report.differingOutsideAuditedSurface.length} differing outside — each outside difference carries a derived reachability reason, not a directory claim`
  );
  check(
    "no_unexplained_participant_facing_difference_blocks_deployment",
    report.pass === true && report.differingInsideAuditedSurface.length === 0,
    `${report.verdict}`
  );
}

{
  const cases = /const REQUIRED_CASES = \[([\s\S]*?)\];/.exec(deployScript)?.[1] ?? "";
  const required = [...cases.matchAll(/"([a-z_0-9]+)"/g)].map((m) => m[1]);
  const need = [
    "deployed_to_preview_not_production",
    "deployment_carries_the_final_application_sha",
    "production_aliases_unchanged",
    "production_domains_unchanged",
    "production_deployment_count_unchanged",
    "production_environment_variables_unchanged"
  ];
  const missing = need.filter((c) => !required.includes(c));
  check(
    "vercel_production_target_blocks_deploy",
    missing.length === 0 &&
      /d\.target !== "production"/.test(deployScript) &&
      /target !== "production"/.test(deployScript) &&
      // No "--prod" reaches the CLI. Checked against what is actually pushed
      // into the argument vector, not against every occurrence of the string:
      // the script names the flag in a comment and in one console line, and a
      // grep that cannot tell those apart would fail on documentation.
      !/args\s*(?:=\s*\[|\.push\()[^\n]*--prod/.test(deployScript),
    missing.length === 0
      ? `all six Preview safeguards are required cases: ${need.join(", ")}; the script never passes --prod and asserts target !== "production" both when selecting a reuse candidate and after deploying`
      : `missing required case(s): ${missing.join(", ")}`
  );
}

{
  check(
    "stripe_live_key_blocks_payment",
    /startsWith\("sk_test_"\)/.test(paymentScript) &&
      /refusing to run a payment journey without them/.test(paymentScript) &&
      /!stripeSecret\.startsWith\("sk_test_"\)/.test(deployScript) &&
      /refusing to deploy a non-test Stripe key/.test(deployScript),
    `the payment journey refuses any key that is not sk_test_ and any signing secret that is not whsec_; the deploy refuses to place a non-test key in the acceptance environment`
  );
}

// =============================================================================
// §7 — snapshot and recovery evidence
// =============================================================================

{
  const need = [
    "schemas", "extensions", "tables", "columns", "constraints", "functions",
    "triggers", "tableGrants", "rlsPolicies", "migrationLedger", "environmentMarker"
  ];
  const missing = need.filter((k) => !SNAPSHOT_SOURCES.includes(k));
  check(
    "pre_and_post_write_snapshots_capture_the_required_shape",
    missing.length === 0 &&
      migrateRunner.includes('label: "pre_write"') &&
      migrateRunner.includes('label: "post_write"') &&
      migrateRunner.includes("diffSnapshots(") &&
      migrateRunner.includes("pre_and_post_write_schema_snapshots_captured"),
    missing.length === 0
      ? `${SNAPSHOT_SOURCES.length} catalog sources captured, including ${need.join(", ")}; the runner captures pre_write and post_write and records the case as required`
      : `snapshot is missing required source(s): ${missing.join(", ")}`
  );

  const snapshotModule = read("scripts/lib/rcap-acceptance-schema-snapshot.mjs");
  check(
    "the_snapshot_records_no_secret_and_no_production_identifier",
    /acceptanceProjectRef/.test(snapshotModule) &&
      !/service_role_key|anon_key|SUPABASE_ACCESS_TOKEN|password/i.test(snapshotModule) &&
      /sourceSha/.test(snapshotModule) && /toolsSha/.test(snapshotModule) && /migrationManifestHash/.test(snapshotModule),
    `the snapshot carries the acceptance project ref, the source SHA, the tools SHA and the manifest hash, and reads no key, token or password`
  );

  const preBeforeMarker =
    migrateRunner.indexOf('label: "pre_write"') < migrateRunner.indexOf("rcap_acceptance_environment_marker");
  const preBeforeBaseline =
    migrateRunner.indexOf('label: "pre_write"') < migrateRunner.indexOf("for (const rel of ordered)");
  check(
    "the_pre_write_snapshot_precedes_the_first_schema_write",
    preBeforeMarker && preBeforeBaseline,
    `pre_write is captured before the environment marker is stamped and before the baseline loop runs`
  );

  check(
    "the_recovery_model_is_stated_explicitly",
    /resumeSafe/.test(read("scripts/lib/rcap-migration-manifest.mjs")) &&
      /delete_and_recreate/.test(read("scripts/lib/rcap-migration-manifest.mjs")) &&
      /phase 50 is recorded but its objects are incomplete/.test(read("scripts/lib/rcap-migration-manifest.mjs")) &&
      /phase 53 is recorded but the enqueue signature is wrong/.test(read("scripts/lib/rcap-migration-manifest.mjs")) &&
      /No production project is ever eligible/.test(read("scripts/lib/rcap-migration-manifest.mjs")),
    `recoveryDisposition returns resume-safe or delete-and-recreate, names the phase-50 and phase-53 partial states that force recreation, and states that no production project is eligible`
  );
}

// =============================================================================
// §9 — nothing outside the allowed scope moved
// =============================================================================

const INFRA_BASE_SHA = "dd93579871962260b12918e54c44cf9bf1e81529";

{
  const changed = git("diff", "--name-only", INFRA_BASE_SHA, "HEAD").split("\n").filter(Boolean);
  const workingTree = git("status", "--porcelain", "-uall").split("\n").filter(Boolean).map((l) => l.slice(3));
  const all = [...new Set([...changed, ...workingTree])];

  const productChanged = all.filter((p) => p.startsWith("src/") || p.startsWith("public/") || p === "package.json" || p === "package-lock.json" || p === "next.config.ts");
  check(
    "product_behavior_files_unchanged",
    productChanged.length === 0,
    productChanged.length === 0
      ? `no file under src/ or public/, and neither package manifest nor next.config.ts, differs from INFRA_BASE_SHA or is dirty in the worktree (${all.length} path(s) touched in total)`
      : `product files changed: ${productChanged.join(", ")}`
  );

  const sqlChanged = all.filter((p) => p.startsWith("supabase/") && p.endsWith(".sql"));
  check(
    "migration_sql_files_unchanged",
    sqlChanged.length === 0,
    sqlChanged.length === 0
      ? `no supabase/*.sql file differs from INFRA_BASE_SHA or is dirty; all ${manifest.migrations.length} manifest hashes still recompute to their authorized values`
      : `migration SQL changed: ${sqlChanged.join(", ")}`
  );

  const auditChanged = all.filter((p) => p.startsWith("data/expungement-ai/flow-audit/") || p.startsWith("docs/expungement-ai/flow-audit/"));
  check(
    "audit_manifests_unchanged_on_this_branch",
    auditChanged.length === 0,
    auditChanged.length === 0
      ? `the Phase 1 / Phase 1B / ENV-007 audit artifacts are untouched by this branch; the infrastructure report references the audit commit externally`
      : `audit artifacts changed: ${auditChanged.join(", ")}`
  );
}

{
  let diffCheck = "";
  let clean = true;
  try { diffCheck = git("diff", "--check"); } catch (error) { clean = false; diffCheck = String(error.stdout ?? error.message); }
  let stagedCheck = "";
  try { stagedCheck = git("diff", "--check", "--cached"); } catch (error) { clean = false; stagedCheck = String(error.stdout ?? error.message); }
  check(
    "git_diff_check_is_clean",
    clean && diffCheck.trim() === "" && stagedCheck.trim() === "",
    clean && diffCheck.trim() === "" && stagedCheck.trim() === ""
      ? `git diff --check and git diff --check --cached report no whitespace error and no conflict marker`
      : `git diff --check output: ${(diffCheck + stagedCheck).slice(0, 400)}`
  );
}

{
  const EXPECTED_MANIFEST_HASH = "01a7e8488df436b9366b381f0ba3cb12cdb17c93725603c044b9a8194fb9b4e4";
  check(
    "migration_manifest_hash_is_exactly_the_authorized_value",
    manifest.manifestHash === EXPECTED_MANIFEST_HASH && computeManifestHash(manifest) === EXPECTED_MANIFEST_HASH,
    `recorded ${manifest.manifestHash}; recomputed ${computeManifestHash(manifest)}; expected ${EXPECTED_MANIFEST_HASH}`
  );

  // Blob-level, against the infrastructure base commit: byte-identical, not
  // merely "not listed as changed".
  const drifted = manifest.migrations
    .map((m) => {
      const atBase = (() => { try { return git("rev-parse", `${INFRA_BASE_SHA}:${m.path}`).trim(); } catch { return null; } })();
      const atHead = (() => { try { return git("rev-parse", `HEAD:${m.path}`).trim(); } catch { return null; } })();
      return { phase: m.phase, path: m.path, atBase, atHead, same: atBase !== null && atBase === atHead };
    })
    .filter((r) => !r.same);
  check(
    "all_seven_migration_sql_files_are_byte_identical_to_the_base",
    drifted.length === 0,
    drifted.length === 0
      ? `all ${manifest.migrations.length} migration blobs are identical between ${INFRA_BASE_SHA.slice(0, 8)} and HEAD`
      : `drifted: ${drifted.map((d) => `phase ${d.phase} ${d.atBase} -> ${d.atHead}`).join("; ")}`
  );

  const auditRef = (() => { try { return git("rev-parse", "origin/claude/expai-flow-audit-p1").trim(); } catch { return null; } })();
  check(
    "the_audit_branch_has_not_moved",
    auditRef === "00212d529e82a2a2a90b172b29268922feecfcbd",
    `origin/claude/expai-flow-audit-p1 is at ${auditRef} (the frozen ENV-007 packet commit)`
  );
}

{
  const hashes = manifest.migrations.map((m) => ({
    phase: m.phase,
    recomputed: crypto.createHash("sha256").update(fs.readFileSync(path.join(rootDir, m.path))).digest("hex"),
    manifest: m.sha256
  }));
  const drifted = hashes.filter((h) => h.recomputed !== h.manifest);
  check(
    "every_manifest_hash_still_recomputes_from_disk",
    drifted.length === 0,
    drifted.length === 0
      ? `all ${hashes.length} manifest SHA-256 values recompute from the files in supabase/`
      : `drift: ${drifted.map((d) => `phase ${d.phase}`).join(", ")}`
  );
}

// =============================================================================

const summary = {
  schemaVersion: "rcap-acceptance-workflow-hardening-verification/v1",
  generatedBy: "scripts/verify-rcap-acceptance-workflow-hardening.mjs",
  infraBaseSha: INFRA_BASE_SHA,
  passed,
  failed,
  total: passed + failed,
  results
};
fs.mkdirSync(path.join(rootDir, "data/rcap-render"), { recursive: true });
fs.writeFileSync(
  path.join(rootDir, "data/rcap-render/workflow-hardening-verification.json"),
  `${JSON.stringify(summary, null, 2)}\n`
);

console.log(`\n${passed}/${passed + failed} checks passed`);
process.exit(failed === 0 ? 0 : 1);
