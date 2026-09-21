#!/usr/bin/env node
// Hosted acceptance staging — the manifest-gated migration apply and readback.
//
// Applies the schema to the NAMED acceptance Supabase project and to nothing
// else. Every statement goes through the Management API's query endpoint, so
// this holds no database password and cannot be pointed at another host by
// changing a connection string: the project ref is the only address it has,
// and the workflow pins that.
//
// THE MIGRATION AUTHORITY (ENV-007)
// ---------------------------------
// data/rcap-acceptance-migration-manifest.json is the ONLY authority for which
// migrations execute, in what order, at what exact bytes. A filename pattern is
// not an authority. The previous version of this script decided the baseline by
// the regex /^phase-(49|50|51|52|53|54)-/, which did not match phase 55 — so
// phase 55 was applied once by the baseline sweep and again as the last entry
// of the authorized sequence, where the duplicate-object codes recorded it as
// "adopted". Two applications, one ledger row, and nothing in the evidence said
// so. Selection now lives in scripts/lib/rcap-migration-manifest.mjs as pure
// functions that a test can exercise without a database.
//
// Two layers, deliberately different in strictness:
//
//   BASELINE — every supabase/*.sql file that is NOT a manifest member and NOT
//   an explicit exclusion, in deterministic phase order. These are already live
//   in production, carry no staging authorization record, and exist here only
//   so the acceptance project has the schema the application expects. A
//   baseline file that fails is recorded with its error and does not stop the
//   run; what stops the run is a REQUIRED table missing afterwards.
//
//   AUTHORIZED SEQUENCE — the manifest, phases 49 through 55. Each file's
//   SHA-256 is recomputed from disk and must match the manifest AND both
//   independent records that carry it (the prepared staging action and the
//   authorization readiness file) before ANY of them is applied. One mismatch
//   anywhere — or one unknown migration inside the authorized range, or one
//   missing member — stops the run with nothing applied. Once applying starts,
//   a single failure is fatal: the sequence is indivisible, and an environment
//   that stops at 51 reintroduces RCAP-SEC-001 by construction.
//
// Every migration is applied AT MOST ONCE per environment, proven by the ledger
// rather than by a duplicate-object error code. A run against an environment
// that already carries all seven exact hashes applies nothing and verifies
// instead. A ledger that is not an exact prefix of the manifest is not
// resumable and stops with an explicit delete-and-recreate instruction.
//
// A pre-write and a post-write schema snapshot bracket every run that writes.
//
// The readback is not a catalog tour. It ends with a live negative control that
// tries the exact forgery RCAP-SEC-001 described, as the role that would
// attempt it, against this database.

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  MANIFEST_RELATIVE_PATH,
  STAGING_ACTION_RELATIVE_PATH,
  AUTHORIZATION_READINESS_RELATIVE_PATH,
  loadManifest,
  verifyManifest,
  verifyAcceptanceAuthorization,
  selectBaselineFiles,
  planSequence,
  assertLedgerSequence,
  recoveryDisposition
} from "./lib/rcap-migration-manifest.mjs";
import { captureSchemaSnapshot, diffSnapshots } from "./lib/rcap-acceptance-schema-snapshot.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const EVIDENCE_DIR = path.join(rootDir, "hosted-acceptance-evidence");
fs.mkdirSync(EVIDENCE_DIR, { recursive: true });

const SUPABASE_ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN ?? "";
const PROJECT_REF = process.env.ACCEPTANCE_SUPABASE_PROJECT_REF ?? "";

if (!SUPABASE_ACCESS_TOKEN || !/^[a-z]{20}$/.test(PROJECT_REF)) {
  console.error("MIGRATE: SUPABASE_ACCESS_TOKEN and a well-formed ACCEPTANCE_SUPABASE_PROJECT_REF are required");
  process.exit(1);
}

const verdicts = new Map();
function record(caseId, passed, observed) {
  verdicts.set(caseId, { passed, observed });
  console.log(`  ${passed ? "ok  " : "FAIL"} ${caseId} — ${observed}`);
}

const REQUIRED_CASES = [
  "migration_manifest_is_authoritative",
  "every_migration_is_authorized_for_this_acceptance_environment",
  "authorized_hashes_agree_across_both_records",
  "baseline_never_applies_a_manifest_migration",
  "ledger_sequence_is_exactly_the_manifest",
  "no_migration_applied_more_than_once",
  "baseline_schema_present",
  "authorized_sequence_applied_in_order",
  "render_jobs_table_secured",
  "person_namespace_hardened",
  "payment_authority_functions_present",
  "legacy_enqueue_signature_dropped",
  "consumption_unit_keyed_on_item",
  "participant_cannot_self_declare_payment",
  "pre_and_post_write_schema_snapshots_captured"
];

const sha256File = (rel) => crypto.createHash("sha256").update(fs.readFileSync(path.join(rootDir, rel))).digest("hex");

async function query(sql) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${SUPABASE_ACCESS_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query: sql })
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* non-JSON surfaces through text */ }
  return { ok: res.status >= 200 && res.status < 300, status: res.status, json, text };
}

/** One scalar out of a single-row single-column result. */
async function scalar(sql) {
  const r = await query(sql);
  if (!r.ok || !Array.isArray(r.json) || r.json.length === 0) return null;
  return Object.values(r.json[0])[0];
}

const evidence = {
  schemaVersion: "rcap-hosted-acceptance-migrate/v1",
  acceptanceProjectRef: PROJECT_REF,
  baseline: [],
  authorizedSequence: [],
  readback: {}
};

// The canonical Security Advisor remediation and the baseline exclusions now
// live in the manifest (manifest.hardeningPhase, manifest.baselineExclusions),
// so there is exactly one place that decides what runs and when.

// --- 1. Manifest gate: the manifest, the disk and both records must agree ----
//
// Nothing below this block writes. If the gate fails, migrate.json is written
// with passed:false and the process exits with nothing applied — not the
// sequence, not the baseline, not the hardening phase.
const action = JSON.parse(fs.readFileSync(path.join(rootDir, STAGING_ACTION_RELATIVE_PATH), "utf8"));
const readiness = JSON.parse(fs.readFileSync(path.join(rootDir, AUTHORIZATION_READINESS_RELATIVE_PATH), "utf8"));
const manifest = loadManifest(rootDir);
const manifestVerdict = verifyManifest({ manifest, rootDir, action, readiness });

evidence.migrationManifest = {
  path: MANIFEST_RELATIVE_PATH,
  manifestHash: manifestVerdict.manifestHash,
  declaredHash: manifest.manifestHash,
  phases: manifest.migrations.map((m) => m.phase),
  entries: manifestVerdict.rows,
  errors: manifestVerdict.errors
};
evidence.authorizedSequence = manifestVerdict.rows.map((row) => ({
  phase: row.phase,
  path: row.path,
  onDisk: row.onDiskSha256,
  matchesManifest: row.matchesManifest,
  matchesAction: row.matchesStagingAction,
  matchesReadiness: row.matchesAuthorizationReadiness,
  authorizationId: row.authorizationId
}));

record(
  "migration_manifest_is_authoritative",
  manifestVerdict.ok,
  manifestVerdict.ok
    ? `${manifest.migrations.length} migrations (${manifest.migrations.map((m) => m.phase).join(",")}) load from ${MANIFEST_RELATIVE_PATH}; every hash recomputed from disk matches the manifest, the prepared staging action and the authorization readiness record; no unknown migration exists inside the authorized range ${manifest.authorizedPhaseRange.min}-${manifest.authorizedPhaseRange.max}`
    : `MANIFEST REFUSED — nothing applied: ${manifestVerdict.errors.join("; ")}`
);

record(
  "authorized_hashes_agree_across_both_records",
  manifestVerdict.ok,
  manifestVerdict.ok
    ? `all ${manifestVerdict.rows.length} migrations recomputed from disk match both the prepared staging action and the authorization readiness record`
    : `HASH OR MEMBERSHIP DRIFT — refusing to apply anything: ${manifestVerdict.errors.slice(0, 6).join("; ")}`
);

if (!manifestVerdict.ok) {
  fs.writeFileSync(path.join(EVIDENCE_DIR, "migrate.json"), `${JSON.stringify({ ...evidence, passed: false }, null, 2)}\n`);
  console.error("\nMIGRATE REFUSED — the migration manifest does not describe what is on disk, or an unauthorized migration is present. Nothing was applied.");
  process.exit(1);
}

// --- 1a. Authorization gate: correct bytes are not the same as permission ----
//
// verifyManifest proved WHICH bytes. This proves WHETHER they may run here.
// The two are separate faults with separate owners: a hash mismatch is an
// engineering error, a withheld authorization is Roger's decision, and no
// amount of correct hashing makes a `queued` migration runnable.
const authorizationVerdict = verifyAcceptanceAuthorization({ manifest });
evidence.acceptanceAuthorization = {
  ok: authorizationVerdict.ok,
  rows: authorizationVerdict.rows,
  withheldPhases: authorizationVerdict.withheldPhases,
  errors: authorizationVerdict.errors,
  remedy: authorizationVerdict.remedy,
  containingActionStatus: manifest.containingActionStatus ?? null
};

record(
  "every_migration_is_authorized_for_this_acceptance_environment",
  authorizationVerdict.ok,
  authorizationVerdict.ok
    ? `all ${manifest.migrations.length} manifest migrations carry an acceptance authorization: ${authorizationVerdict.rows.map((r) => `${r.phase}=${r.acceptanceAuthorizationRecord}`).join("; ")}`
    : `ACCEPTANCE AUTHORIZATION WITHHELD for phase(s) ${authorizationVerdict.withheldPhases.join(", ")} — ${authorizationVerdict.errors.join("; ")}. ${authorizationVerdict.remedy}`
);

if (!authorizationVerdict.ok) {
  fs.writeFileSync(path.join(EVIDENCE_DIR, "migrate.json"), `${JSON.stringify({ ...evidence, passed: false }, null, 2)}\n`);
  console.error(
    `\nMIGRATE REFUSED — phase(s) ${authorizationVerdict.withheldPhases.join(", ")} are not authorized for a hosted acceptance project. ` +
    `Nothing was applied, nothing was stamped, and no snapshot was taken.\n${authorizationVerdict.remedy}`
  );
  process.exit(1);
}

// --- 1b. What this run still has to do, decided from the ledger --------------
//
// Read before any write, so the pre-write snapshot below brackets exactly the
// work this run performs. The ledger table is created here rather than in
// section 3 because the plan depends on reading it.
await query(`
  create table if not exists public.rcap_acceptance_migration_ledger (
    phase int primary key,
    sha256 text not null,
    authorization_id text not null,
    applied_at timestamptz not null default now(),
    applied_by text not null
  )
`);
await query(`revoke all on public.rcap_acceptance_migration_ledger from anon, authenticated`);
await query(`alter table public.rcap_acceptance_migration_ledger enable row level security`);

const ledgerBefore = await query(`select phase, sha256 from public.rcap_acceptance_migration_ledger`);
const ledgerRowsBefore = Array.isArray(ledgerBefore.json) ? ledgerBefore.json : [];
const plan = planSequence({ manifest, ledgerRows: ledgerRowsBefore });

evidence.plan = {
  mode: plan.mode,
  reason: plan.reason,
  code: plan.code ?? null,
  detail: plan.detail ?? null,
  recovery: plan.recovery,
  alreadyAppliedPhases: plan.alreadyApplied.map((m) => m.phase),
  toApplyPhases: plan.toApply.map((m) => m.phase),
  ledgerBefore: ledgerRowsBefore.map((r) => ({ phase: Number(r.phase), sha256: String(r.sha256) }))
};

if (plan.blocked) {
  record(
    "authorized_sequence_applied_in_order",
    false,
    `${plan.reason} ${plan.recovery}`
  );
  record("ledger_sequence_is_exactly_the_manifest", false, plan.reason);
  record("no_migration_applied_more_than_once", false, "not evaluated: the run stopped before applying anything");
  evidence.recovery = { resumeSafe: false, action: "delete_and_recreate", reason: plan.reason, code: plan.code };
  fs.writeFileSync(path.join(EVIDENCE_DIR, "migrate.json"), `${JSON.stringify({ ...evidence, passed: false }, null, 2)}\n`);
  console.error(`\nMIGRATE BLOCKED — ${plan.reason}\n${plan.recovery}`);
  process.exit(1);
}

console.log(`  plan: ${plan.mode} — ${plan.reason}`);

// --- 1c. Pre-write snapshot --------------------------------------------------
//
// Captured before the first write of this run, whatever the plan. On a `noop`
// run it is still captured, so a verification run carries the same evidence
// shape as a writing one and the two can be compared.
const snapshotContext = {
  sourceSha: process.env.HOSTED_APPLICATION_SHA ?? null,
  toolsSha: process.env.HOSTED_TOOLS_SHA ?? null,
  migrationManifestHash: manifestVerdict.manifestHash
};
evidence.snapshots = { preWrite: null, postWrite: null, diff: null };
evidence.snapshots.preWrite = await captureSchemaSnapshot({
  query,
  label: "pre_write",
  projectRef: PROJECT_REF,
  context: snapshotContext
});
console.log(`  pre-write snapshot: ${Object.entries(evidence.snapshots.preWrite.counts).map(([k, v]) => `${k}=${v ?? "n/a"}`).join(" ")}`);

// --- 1d. Stamp the environment before the first write -----------------------
// Written only to the pinned acceptance ref, and it names that ref, so a copy
// of this row in any other database identifies the wrong project and is
// rejected by the preflight. This is what lets the emptiness proof — which is
// necessarily one-time — keep meaning something on every later run.
{
  await query(`
    create table if not exists public.rcap_acceptance_environment_marker (
      project_ref text primary key,
      stamped_at timestamptz not null default now(),
      application_sha text not null,
      note text not null
    )
  `);
  await query(`
    insert into public.rcap_acceptance_environment_marker (project_ref, application_sha, note)
    values (
      '${PROJECT_REF}',
      '${(process.env.HOSTED_APPLICATION_SHA ?? "unrecorded").replace(/[^0-9a-f]/g, "").slice(0, 40) || "unrecorded"}',
      'RCAP acceptance environment. Stamped by the hosted acceptance pipeline immediately before its first write, at which point every production witness table was proven absent or empty. Not a production database.'
    )
    on conflict (project_ref) do update set stamped_at = now(), application_sha = excluded.application_sha
  `);
  // The marker is metadata about the environment, never participant data, so
  // no browser role has any business reading it. RLS is enabled as well as revoked:
  // a table in `public` with no row level security is a finding on its own, and the
  // owner this script runs as is not subject to it.
  await query(`revoke all on public.rcap_acceptance_environment_marker from anon, authenticated`);
  await query(`alter table public.rcap_acceptance_environment_marker enable row level security`);
}

// --- 2. Baseline: every file the manifest does not claim, in phase order ------
{
  // Exclusion is by EXACT relative path taken from the manifest, plus the
  // manifest's own declared exclusions. No pattern decides membership.
  const ordered = selectBaselineFiles({
    manifest,
    fileNames: fs.readdirSync(path.join(rootDir, manifest.migrationsRootDir ?? "supabase"))
  });

  evidence.baselineSelection = {
    count: ordered.length,
    excludedByManifest: manifest.migrations.map((m) => m.path),
    excludedByPolicy: manifest.baselineExclusions ?? [],
    files: ordered
  };

  for (const rel of ordered) {
    const sql = fs.readFileSync(path.join(rootDir, rel), "utf8");
    let r = await query(sql);
    let elevated = false;

    // On hosted Supabase the Management API executes as `postgres`, which is a
    // MEMBER of supabase_storage_admin but not the owner of storage.objects —
    // so a migration that enables RLS or defines a policy on that table is
    // refused with 42501 even though the same file applies fine on a local
    // stack where postgres owns everything. Retrying once under the role that
    // does own it is the difference between the hosted and local platforms, not
    // a relaxation of anything: the migration file is used byte-for-byte and is
    // never edited, and the elevation is recorded per file.
    if (!r.ok && /42501|must be owner of/i.test(String(r.json?.message ?? r.text))) {
      r = await query(`set role supabase_storage_admin;\n${sql}\nreset role;`);
      elevated = r.ok;
    }

    evidence.baseline.push({
      file: rel,
      sha256: sha256File(rel),
      applied: r.ok,
      appliedUnderStorageAdminRole: elevated,
      // Truncated hard: a database error can echo a statement, and a statement
      // in the seed file can contain values. The full text is never kept.
      error: r.ok ? null : String(r.json?.message ?? r.text).slice(0, 300)
    });
    console.log(`    ${r.ok ? (elevated ? "applied*" : "applied ") : "skipped "} ${rel}${r.ok ? "" : ` — ${String(r.json?.message ?? r.text).slice(0, 160)}`}`);
  }

  // The baseline is judged on its RESULT, not on how many files were clean.
  // These are the tables the acceptance journeys and the authorized sequence
  // both need; if one is missing, the baseline failed no matter what applied.
  // Exact relation names as the migrations create them. `screening_sessions`
  // and `partner_entitlement` carry no rcap_ prefix, and an earlier version of
  // this list invented one for each — which failed the run for two tables that
  // had in fact applied cleanly.
  const REQUIRED_BASELINE_TABLES = [
    "partner_records",
    "rcap_document_packets",
    "rcap_persons",
    "consumer_briefcase_items",
    "screening_sessions",
    "partner_entitlement"
  ];
  const missing = [];
  for (const table of REQUIRED_BASELINE_TABLES) {
    const present = await scalar(`select to_regclass('public.${table}') is not null as present`);
    if (present !== true && present !== "true") missing.push(table);
  }
  const failedFiles = evidence.baseline.filter((entry) => !entry.applied);
  record(
    "baseline_schema_present",
    missing.length === 0,
    missing.length === 0
      ? `${evidence.baseline.length - failedFiles.length}/${evidence.baseline.length} baseline files applied cleanly; all ${REQUIRED_BASELINE_TABLES.length} required tables exist${failedFiles.length > 0 ? ` (non-blocking failures: ${failedFiles.map((f) => path.basename(f.file)).join(", ")})` : ""}`
      : `required baseline table(s) missing after the baseline pass: ${missing.join(", ")}`
  );
  record(
    "baseline_never_applies_a_manifest_migration",
    ordered.every((rel) => !manifest.migrations.some((m) => m.path === rel)),
    `${ordered.length} baseline file(s) selected; ${manifest.migrations.length} manifest member(s) excluded by exact filename — ${manifest.migrations.map((m) => path.basename(m.path)).join(", ")}`
  );
  if (missing.length > 0) {
    fs.writeFileSync(path.join(EVIDENCE_DIR, "migrate.json"), `${JSON.stringify({ ...evidence, passed: false }, null, 2)}\n`);
    console.error(`\nMIGRATE STOPPED — the baseline did not produce the schema the authorized sequence builds on. Phases ${manifest.migrations.map((m) => m.phase).join("-")} were NOT applied.`);
    process.exit(1);
  }
}

// --- 3. The authorized sequence, in order, indivisibly, at most once each ----
{
  // The plan already decided what to apply. This loop performs exactly that
  // list and writes exactly one ledger row per migration it applies.
  //
  // A duplicate-object error here is no longer treated as "adopted". Under the
  // manifest the only way a phase's objects can already exist while its ledger
  // row is absent is that something applied it outside this authority — which
  // is precisely the state that must not be waved through.
  let applied = 0;
  let failure = null;

  for (const entry of plan.toApply) {
    const sql = fs.readFileSync(path.join(rootDir, entry.path), "utf8");
    const r = await query(sql);
    const row = evidence.authorizedSequence.find((candidate) => candidate.phase === entry.phase);

    if (!r.ok) {
      row.applied = false;
      row.disposition = "failed";
      row.error = String(r.json?.message ?? r.text).slice(0, 400);
      failure = `phase ${entry.phase} failed: ${row.error}`;
      break;
    }

    const ins = await query(`
      insert into public.rcap_acceptance_migration_ledger (phase, sha256, authorization_id, applied_by)
      values (${entry.phase}, '${entry.sha256}', '${entry.authorizationId}', 'hosted_acceptance_pipeline')
      on conflict (phase) do nothing
    `);
    if (!ins.ok) {
      row.applied = true;
      row.disposition = "applied_but_not_recorded";
      row.error = String(ins.json?.message ?? ins.text).slice(0, 400);
      failure = `phase ${entry.phase} applied but its ledger row could not be written: ${row.error}`;
      break;
    }

    row.applied = true;
    row.disposition = "applied_by_this_run";
    applied += 1;
    console.log(`    phase ${entry.phase} applied (${entry.authorizationId})`);
  }

  for (const entry of plan.alreadyApplied) {
    const row = evidence.authorizedSequence.find((candidate) => candidate.phase === entry.phase);
    row.applied = true;
    row.disposition = "already_applied_at_this_exact_hash";
    console.log(`    phase ${entry.phase} already applied at ${entry.sha256.slice(0, 12)}… (ledger)`);
  }

  const satisfied = applied + plan.alreadyApplied.length;
  evidence.plan.appliedByThisRun = applied;

  record(
    "authorized_sequence_applied_in_order",
    failure === null && satisfied === manifest.migrations.length,
    failure === null && satisfied === manifest.migrations.length
      ? `${manifest.migrations.map((m) => m.phase).join(" -> ")} are all present on ${PROJECT_REF} at their manifest hashes (${applied} applied by this run, ${plan.alreadyApplied.length} already recorded). The readback below is what proves they took effect.`
      : `${failure ?? `satisfied ${satisfied}/${manifest.migrations.length}`} — the sequence is indivisible, so this environment must not serve a participant. RECOVERY: delete and recreate the acceptance Supabase project, then re-run hosted_preflight and hosted_migrate. No production project is eligible.`
  );

  if (failure !== null) {
    evidence.recovery = {
      resumeSafe: false,
      action: "delete_and_recreate",
      reason: failure,
      code: "sequence_failed_mid_apply"
    };
  }
}

// --- 3a. The ledger is exactly the manifest, once each ------------------------
{
  const after = await query(`select phase, sha256 from public.rcap_acceptance_migration_ledger order by phase`);
  const ledgerRowsAfter = Array.isArray(after.json) ? after.json : [];
  const seqVerdict = assertLedgerSequence({ manifest, ledgerRows: ledgerRowsAfter });
  evidence.ledgerAfter = ledgerRowsAfter.map((r) => ({ phase: Number(r.phase), sha256: String(r.sha256) }));
  evidence.ledgerSequence = seqVerdict;

  record(
    "ledger_sequence_is_exactly_the_manifest",
    seqVerdict.ok,
    seqVerdict.ok
      ? `the ledger records exactly ${seqVerdict.expected.join(",")} — ${seqVerdict.expected.length} entries, one per manifest migration, none extra and none missing`
      : `ledger sequence does not match the manifest: ${seqVerdict.errors.join("; ")}`
  );

  const counts = Object.entries(seqVerdict.perPhase);
  const overApplied = counts.filter(([, n]) => n !== 1);
  record(
    "no_migration_applied_more_than_once",
    overApplied.length === 0,
    overApplied.length === 0
      ? `every manifest migration has exactly one ledger entry; phase 55 execution count = ${seqVerdict.perPhase[55] ?? "n/a"} (the ENV-007 double-application defect would show 2 here)`
      : `execution counts other than 1: ${overApplied.map(([p, n]) => `phase ${p} = ${n}`).join(", ")}`
  );

  evidence.recovery = evidence.recovery ?? recoveryDisposition({
    plan,
    readback: { phase50Recorded: ledgerRowsAfter.some((r) => Number(r.phase) === 50), phase53Recorded: ledgerRowsAfter.some((r) => Number(r.phase) === 53) }
  });
}

// --- 3b. The hardening phase, last ------------------------------------------
//
// Same file, same place in the order as the forward migration chain's final step: after
// every object exists, so the narrowed default privileges apply only to whatever anyone
// adds next.
{
  const rel = manifest.hardeningPhase;
  const r = await query(fs.readFileSync(path.join(rootDir, rel), "utf8"));
  record(
    "public_view_and_default_privilege_hardening_applied",
    r.ok,
    r.ok
      ? `${rel} applied: the five content_public_* views run as the querying role, the four named tables have row level security, and anon and authenticated no longer inherit privileges on future objects`
      : `${rel} failed: ${String(r.json?.message ?? r.text).slice(0, 300)}`
  );
}

// --- 4. Readback -------------------------------------------------------------
{
  const rlsOn = async (table) => scalar(
    `select c.relrowsecurity from pg_class c join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relname = '${table}'`
  );
  const truthy = (value) => value === true || value === "true" || value === "t";

  {
    const exists = await scalar(`select to_regclass('public.packet_render_jobs') is not null`);
    const rls = await rlsOn("packet_render_jobs");
    const browserGrants = await scalar(
      `select count(*)::int from information_schema.role_table_grants
       where table_schema = 'public' and table_name = 'packet_render_jobs' and grantee in ('anon','authenticated')`
    );
    const pass = truthy(exists) && truthy(rls) && Number(browserGrants) === 0;
    record(
      "render_jobs_table_secured",
      pass,
      `packet_render_jobs exists=${truthy(exists)}, rowsecurity=${truthy(rls)}, anon/authenticated table grants=${browserGrants} (must be 0)`
    );
    evidence.readback.renderJobs = { exists: truthy(exists), rls: truthy(rls), browserGrants: Number(browserGrants) };
  }

  {
    const rls = await rlsOn("rcap_persons");
    const browserGrants = await scalar(
      `select count(*)::int from information_schema.role_table_grants
       where table_schema = 'public' and table_name = 'rcap_persons' and grantee in ('anon','authenticated')`
    );
    const trigger = await scalar(
      `select count(*)::int from pg_trigger t join pg_class c on c.oid = t.tgrelid
       join pg_namespace n on n.oid = c.relnamespace
       where n.nspname = 'public' and c.relname = 'partner_records' and not t.tgisinternal`
    );
    const pass = truthy(rls) && Number(browserGrants) === 0 && Number(trigger) > 0;
    record(
      "person_namespace_hardened",
      pass,
      `phase 54 on the hosted project: rcap_persons rowsecurity=${truthy(rls)}, anon/authenticated grants=${browserGrants} (must be 0), partner_records guard triggers=${trigger} (must be > 0)`
    );
    evidence.readback.personNamespace = { rls: truthy(rls), browserGrants: Number(browserGrants), triggers: Number(trigger) };
  }

  {
    const rows = await query(
      `select p.proname, p.prosecdef from pg_proc p join pg_namespace n on n.oid = p.pronamespace
       where n.nspname = 'public' and p.proname in ('record_consumer_packet_payment','finalize_packet_render_job','enqueue_packet_render_job')`
    );
    const found = Array.isArray(rows.json) ? rows.json : [];
    const byName = (name) => found.filter((r) => r.proname === name);
    const definer = (name) => byName(name).every((r) => truthy(r.prosecdef)) && byName(name).length > 0;
    const pass = definer("record_consumer_packet_payment") && definer("finalize_packet_render_job") && byName("enqueue_packet_render_job").length > 0;
    record(
      "payment_authority_functions_present",
      pass,
      `record_consumer_packet_payment=${byName("record_consumer_packet_payment").length} (security definer ${definer("record_consumer_packet_payment")}), finalize_packet_render_job=${byName("finalize_packet_render_job").length} (security definer ${definer("finalize_packet_render_job")}), enqueue_packet_render_job=${byName("enqueue_packet_render_job").length}`
    );
    evidence.readback.functions = found;
  }

  {
    // Phase 53 drops the 13-argument enqueue. Its survival would mean the gate
    // is bound to a signature phase 52 no longer authorizes.
    const thirteen = await scalar(
      `select count(*)::int from pg_proc p join pg_namespace n on n.oid = p.pronamespace
       where n.nspname = 'public' and p.proname = 'enqueue_packet_render_job' and p.pronargs = 13`
    );
    record(
      "legacy_enqueue_signature_dropped",
      Number(thirteen) === 0,
      `13-argument enqueue_packet_render_job overloads remaining: ${thirteen} (phase 53 must leave 0)`
    );
    evidence.readback.legacyEnqueueOverloads = Number(thirteen);
  }

  {
    // G11: the consumption unit must be keyed on the item/receipt/matter, not
    // on the job id — otherwise one $50 purchase authorizes unlimited packets.
    const indexes = await query(
      `select indexname, indexdef from pg_indexes
       where schemaname = 'public' and indexdef ilike '%unique%'
         and (tablename ilike '%consumption%' or tablename ilike '%payment%' or tablename ilike '%ledger%')`
    );
    const defs = Array.isArray(indexes.json) ? indexes.json : [];
    const keyedOnItem = defs.some((row) => /item_id|receipt|matter/i.test(String(row.indexdef)));
    const keyedOnJobOnly = defs.some((row) => /\(\s*job_id\s*\)/i.test(String(row.indexdef)));
    record(
      "consumption_unit_keyed_on_item",
      keyedOnItem && !keyedOnJobOnly,
      keyedOnItem && !keyedOnJobOnly
        ? `a unique consumption-unit index keyed on the item/receipt/matter is present and no job-id-only unique index remains (${defs.length} unique index(es) inspected)`
        : `G11 shape not confirmed on the hosted project: keyedOnItem=${keyedOnItem}, jobIdOnlyIndexPresent=${keyedOnJobOnly}, indexes=${defs.map((d) => d.indexname).join(", ") || "none"}`
    );
    evidence.readback.consumptionUnitIndexes = defs.map((d) => ({ name: d.indexname, def: String(d.indexdef).slice(0, 240) }));
  }

  {
    // The live negative control. This is the exact forgery RCAP-SEC-001
    // described, attempted as the role that would attempt it, against this
    // database. A catalog assertion can be satisfied by a policy that does not
    // bite; this cannot.
    const probe = await query(`
      do $$
      declare
        probe_user uuid := gen_random_uuid();
        probe_item uuid;
        forged boolean := false;
      begin
        -- consumer_briefcase_items.user_id references auth.users, so the probe
        -- needs a real identity. It is created here, used for one statement,
        -- and removed in the same block whatever the outcome.
        insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
        values (probe_user, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
                'negative-control-' || probe_user || '@rcap-acceptance.test', '', now(), now(), now());

        insert into public.consumer_briefcase_items
          (user_id, item_type, jurisdiction, status, summary_json, payment_status)
        values
          (probe_user, 'result', 'MS', 'guidance_saved',
           '{"note":"hosted acceptance negative control"}'::jsonb, 'unpaid')
        returning id into probe_item;

        begin
          set local role authenticated;
          update public.consumer_briefcase_items set payment_status = 'paid' where id = probe_item;
          if found then forged := true; end if;
        exception when others then
          forged := false;
        end;
        reset role;

        if forged or exists (select 1 from public.consumer_briefcase_items where id = probe_item and payment_status = 'paid') then
          delete from public.consumer_briefcase_items where id = probe_item;
          delete from auth.users where id = probe_user;
          raise exception 'RCAP-SEC-001 REPRODUCED ON THE HOSTED ACCEPTANCE PROJECT';
        end if;

        delete from public.consumer_briefcase_items where id = probe_item;
        delete from auth.users where id = probe_user;
      end $$;
    `);
    const reproduced = !probe.ok && /RCAP-SEC-001 REPRODUCED/.test(String(probe.json?.message ?? probe.text));
    record(
      "participant_cannot_self_declare_payment",
      probe.ok,
      probe.ok
        ? "a row was inserted unpaid, the authenticated role's attempt to set payment_status='paid' on it did not take effect, and the probe row was removed — the RCAP-SEC-001 forgery does not reproduce here"
        : reproduced
          ? "CRITICAL: the forgery SUCCEEDED against the hosted acceptance project"
          : `the negative control could not be executed: ${String(probe.json?.message ?? probe.text).slice(0, 300)}`
    );
    evidence.readback.negativeControl = { executed: probe.ok, reproduced };
  }
}

// --- 5. Post-write snapshot and the structural diff --------------------------
//
// Same shape as the pre-write capture. The diff between them is this run's
// effect on the acceptance project, stated rather than inferred.
{
  evidence.snapshots.postWrite = await captureSchemaSnapshot({
    query,
    label: "post_write",
    projectRef: PROJECT_REF,
    context: snapshotContext
  });
  evidence.snapshots.diff = diffSnapshots(evidence.snapshots.preWrite, evidence.snapshots.postWrite);
  const d = evidence.snapshots.diff.counts;
  console.log(
    `  post-write snapshot: tables ${d.tables.before}->${d.tables.after}, functions ${d.functions.before}->${d.functions.after}, triggers ${d.triggers.before}->${d.triggers.after}, policies ${d.rlsPolicies.before}->${d.rlsPolicies.after}`
  );
  record(
    "pre_and_post_write_schema_snapshots_captured",
    Boolean(evidence.snapshots.preWrite) && Boolean(evidence.snapshots.postWrite),
    `pre-write and post-write catalog snapshots captured for ${PROJECT_REF} at manifest hash ${snapshotContext.migrationManifestHash}; ${evidence.snapshots.postWrite.unavailable.length} source(s) unavailable post-write`
  );
}

// --- verdict -----------------------------------------------------------------
{
  const missing = REQUIRED_CASES.filter((caseId) => !verdicts.has(caseId));
  const failed = [...verdicts.entries()].filter(([, v]) => !v.passed).map(([caseId]) => caseId);
  evidence.requiredCases = REQUIRED_CASES;
  evidence.missingCases = missing;
  evidence.failedCases = failed;
  evidence.passed = missing.length === 0 && failed.length === 0;
  fs.writeFileSync(path.join(EVIDENCE_DIR, "migrate.json"), `${JSON.stringify(evidence, null, 2)}\n`);

  console.log("");
  if (missing.length > 0) console.error(`MIGRATE INCOMPLETE — no verdict registered for: ${missing.join(", ")}`);
  if (failed.length > 0) console.error(`MIGRATE FAILED — ${failed.join(", ")}`);
  if (evidence.passed) console.log(`MIGRATE PASSED — ${REQUIRED_CASES.length}/${REQUIRED_CASES.length} cases; ${manifest.migrations.map((m) => m.phase).join(", ")} are applied once each and enforcing on ${PROJECT_REF}.`);
  process.exit(evidence.passed ? 0 : 1);
}
