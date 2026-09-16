#!/usr/bin/env node
// Exact Production forward-chain apply and direct readback.
//
// Incident of 2026-09-16 ("Save my result and continue" fails on the live
// Mississippi result page): the Production database's migration ledger ends
// at 20260823171000 and the deployed application writes columns and calls
// functions that the forward migrations from 20260828100000 onward create.
// This control applies exactly those ten committed forward migrations, in
// repository order, each hash-pinned to its bytes at the frozen application
// commit, reads back one signature object per file, and records each version
// in supabase_migrations.schema_migrations so a later `supabase db push`
// sees the same history. Nothing else is written. No participant, checkout,
// deployment, alias, worker or environment action is performed.

import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const APPLICATION_SHA = "436520e4a99f0b8a290ace32f1d717b951630319";
const PRODUCTION_PROJECT_REF = "wwtwtsmywnckfkdaqqeg";
const AUTHORIZATION_PATH = "data/rcap-production-forward-chain-migration-authorization.json";
const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PHASE = (process.env.RCAP_PRODUCTION_PHASE ?? "").trim();
const INPUT_APPLICATION_SHA = (process.env.RCAP_APPLICATION_SHA ?? "").trim();
const INPUT_PROJECT_REF = (process.env.RCAP_PRODUCTION_PROJECT_REF ?? "").trim();
const SUPABASE_ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN ?? "";
const EVIDENCE_DIR = path.resolve(process.env.RCAP_PRODUCTION_EVIDENCE_DIR ?? "production-canary-evidence");
const EVIDENCE_FILE = path.join(EVIDENCE_DIR, `production-${PHASE || "forward-chain"}.json`);

// The thirteen versions the Production ledger carries, read back exactly by
// run 35127720320: the recovered remote baseline 20260728213131 and the
// forward chain through 20260823171000, less 20260822180000, for which the
// ledger holds no row. That prefill step and the three 2026-08-25 Clinic files
// (applied by the dedicated Clinic control) are reconciled against their
// objects below and are never replayed here because a ledger row is absent.
export const LEDGER_BASELINE_VERSIONS = Object.freeze([
  "20260728213131",
  "20260818200000", "20260818201000", "20260818202000", "20260818203000", "20260818204000",
  "20260818205000", "20260818206000", "20260818207000", "20260818208000", "20260818209000",
  "20260819120000", "20260823171000"
]);

// Forward steps before position 17 whose ledger rows may be absent. Each is
// reconciled against one signature object and reported; none is applied by
// this control. The Clinic steps are required because 20260903120000 alters
// clinic_events; the prefill step is outside this chain entirely.
export const UNLEDGERED_PRIOR_STEPS = Object.freeze([
  Object.freeze({ position: 12, version: "20260822180000", signature: { kind: "function", name: "rcap_onboarding_prefill_supersede_prior_applied" }, requiredByChain: false }),
  Object.freeze({ position: 14, version: "20260825120000", signature: { kind: "table", name: "clinic_cases" }, requiredByChain: true }),
  Object.freeze({ position: 15, version: "20260825121000", signature: { kind: "function", name: "clinic_is_event_staff" }, requiredByChain: true }),
  Object.freeze({ position: 16, version: "20260825122000", signature: { kind: "function", name: "clinic_reserve_packet_credit" }, requiredByChain: true })
]);

// Positions continue the numbering of scripts/verify-rcap-production-schema-upgrade.mjs FORWARD_CHAIN.
export const MIGRATIONS = Object.freeze([
  Object.freeze({ position: 17, version: "20260828100000", path: "supabase/migrations/20260828100000_shared_pending_result_and_atomic_claim.sql", sha256: "9d4cfcc1849585ad609fe04547cdaf2186582e7369fac1c4868d414de1f9113c", signature: { kind: "table", name: "participant_claim_events" } }),
  Object.freeze({ position: 18, version: "20260830120000", path: "supabase/migrations/20260830120000_participant_data_rights.sql", sha256: "991fe21eab48b1ee72ab9f06346339f959f82d5f668b34560eef97bda08272ca", signature: { kind: "table", name: "participant_privacy_requests" } }),
  Object.freeze({ position: 19, version: "20260901115000", path: "supabase/migrations/20260901115000_consumer_packet_artifact_provenance.sql", sha256: "eb4969342a488c281152323693f4ef90732026a16f443218e53231e09cf78132", signature: { kind: "table", name: "consumer_packet_artifact_provenance" } }),
  Object.freeze({ position: 20, version: "20260901120000", path: "supabase/migrations/20260901120000_dtc_consumer_launch_rails.sql", sha256: "510883d3aa6b0b34140b7b1d09ecaf9662cd45915e6a1ea4d657e85e0f84ffeb", signature: { kind: "function", name: "get_consumer_packet_verification_authority" } }),
  Object.freeze({ position: 21, version: "20260901130000", path: "supabase/migrations/20260901130000_consumer_private_delivery.sql", sha256: "ab3c23fa13bc52bbf9604e1811e5fec989a7291fb840e1ae5994a12100395621", signature: { kind: "table", name: "consumer_artifact_download_grants" } }),
  // Re-creates authorize_consumer_artifact_download with an identical signature; only the ledger row distinguishes it.
  Object.freeze({ position: 22, version: "20260901140000", path: "supabase/migrations/20260901140000_tighten_consumer_artifact_authorization.sql", sha256: "cb0c3289f91b2eb5381fc663217149818ef2bfb0460e420c48f1091f87caf424", signature: { kind: "ledger", name: "20260901140000" } }),
  Object.freeze({ position: 23, version: "20260903120000", path: "supabase/migrations/20260903120000_clinic_event_jurisdiction_lock.sql", sha256: "2ce9864b23b628d83ea6ac8583d53928623845f4e3a10bc79644d1b54a1ea39e", signature: { kind: "column", table: "clinic_events", name: "jurisdiction" } }),
  Object.freeze({ position: 24, version: "20260903130000", path: "supabase/migrations/20260903130000_atomic_sponsored_packet_finalization.sql", sha256: "5e032d60f605850538efac1039995ed95c30b6e37babeb83a9240a9ef47888e4", signature: { kind: "function", name: "finalize_sponsored_packet_generation_if_verified" } }),
  Object.freeze({ position: 25, version: "20260906120000", path: "supabase/migrations/20260906120000_sponsored_route_render_transaction.sql", sha256: "e323452b977c71bef2553fefd537a297b9b36151a043bae8003145f9dc691fd9", signature: { kind: "table", name: "sponsored_packet_render_routes" } }),
  Object.freeze({ position: 26, version: "20260906130000", path: "supabase/migrations/20260906130000_verified_artifact_regeneration.sql", sha256: "f0deae88fca966d9cedb63991621312edd1bfa1b65a58de7e5ee63106fc183b7", signature: { kind: "function", name: "finalize_sponsored_packet_generation_for_route" } })
]);

// Objects the deployed application writes through, created by the loose phase
// inputs the recovered baseline already carried. Read before any apply.
export const PHASE_PREREQUISITES = Object.freeze([
  { name: "packet_render_jobs", kind: "table" },
  { name: "consumer_pending_screening_results", kind: "table" },
  { name: "consumer_briefcase_items", kind: "table" },
  { name: "screening_sessions", kind: "table" },
  { name: "clinic_events", kind: "table" },
  { name: "enqueue_packet_render_job", kind: "function" },
  { name: "consumer_packet_payment_authority", kind: "function" }
]);

fs.mkdirSync(EVIDENCE_DIR, { recursive: true });

const verdicts = [];
const evidence = {
  schemaVersion: "rcap-production-forward-chain-migrate/v1",
  phase: PHASE,
  startedAt: new Date().toISOString(),
  applicationSha: APPLICATION_SHA,
  productionProjectRef: PRODUCTION_PROJECT_REF,
  exactMigrationSequence: MIGRATIONS.map(({ position, version, path: migrationPath, sha256 }) => ({ position, version, path: migrationPath, sha256 })),
  migrationsApplied: [],
  migrationsAlreadyPresent: [],
  ledgerRowsRecorded: [],
  productionDatabaseMutated: false,
  realParticipantRecordsCreated: false,
  realChargesCreated: false,
  deploymentTriggered: false,
  aliasChanged: false,
  environmentVariableChanged: false,
  applicationChanged: false,
  workerChanged: false,
  structureDropped: false,
  readback: null,
  verdicts
};

function record(caseId, passed, observed) {
  verdicts.push({ caseId, passed, observed });
  console.log(`  ${passed ? "ok  " : "FAIL"} ${caseId} — ${observed}`);
  if (!passed) throw new Error(caseId);
}

function persist(passed, failure = null) {
  evidence.finishedAt = new Date().toISOString();
  evidence.passed = passed;
  evidence.failure = failure;
  fs.writeFileSync(EVIDENCE_FILE, `${JSON.stringify(evidence, null, 2)}\n`);
}

function parseJson(text) { try { return JSON.parse(text); } catch { return null; } }
function sqlLiteral(value) { return `'${String(value).replaceAll("'", "''")}'`; }

async function managementGet(pathname) {
  const response = await fetch(`https://api.supabase.com${pathname}`, { method: "GET", headers: { Authorization: `Bearer ${SUPABASE_ACCESS_TOKEN}` } });
  return { status: response.status, json: parseJson(await response.text()) };
}

async function managementQuery(query, caseId) {
  const response = await fetch(`https://api.supabase.com/v1/projects/${PRODUCTION_PROJECT_REF}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${SUPABASE_ACCESS_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query })
  });
  const text = await response.text();
  const json = parseJson(text);
  if (!response.ok) throw new Error(`${caseId}: HTTP ${response.status}: ${String(json?.message ?? "database query failed").slice(0, 300)}`);
  return json;
}

/** Bytes of one migration at the frozen application commit; refuses any drift from the pinned hash. */
export function frozenMigrationSql(rootDir, migration) {
  const result = spawnSync("git", ["show", `${APPLICATION_SHA}:${migration.path}`], { cwd: rootDir, stdio: ["ignore", "pipe", "pipe"] });
  if (result.status !== 0) throw new Error(`git show failed for ${migration.path} at ${APPLICATION_SHA}: ${result.stderr.toString("utf8").slice(0, 200)}`);
  const hash = createHash("sha256").update(result.stdout).digest("hex");
  if (hash !== migration.sha256) throw new Error(`frozen migration hash ${hash} for ${migration.path} does not equal the pinned ${migration.sha256}`);
  return result.stdout.toString("utf8");
}

function signatureProbe(signature) {
  if (signature.kind === "table") return `to_regclass('public.${signature.name}') is not null`;
  if (signature.kind === "function") return `exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname=${sqlLiteral(signature.name)})`;
  if (signature.kind === "column") return `exists(select 1 from information_schema.columns where table_schema='public' and table_name=${sqlLiteral(signature.table)} and column_name=${sqlLiteral(signature.name)})`;
  if (signature.kind === "ledger") return `exists(select 1 from supabase_migrations.schema_migrations where version=${sqlLiteral(signature.name)})`;
  throw new Error(`unknown signature kind ${signature.kind}`);
}

export function readbackQuery() {
  return `
    select
      to_regclass('supabase_migrations.schema_migrations') is not null as ledger_present,
      exists(select 1 from information_schema.columns where table_schema='supabase_migrations' and table_name='schema_migrations' and column_name='name') as ledger_has_name_column,
      coalesce((select array_agg(version::text order by version) from supabase_migrations.schema_migrations), '{}'::text[]) as ledger_versions,
      ${PHASE_PREREQUISITES.map((entry) => `${signatureProbe(entry)} as prereq_${entry.name}`).join(",\n      ")},
      ${UNLEDGERED_PRIOR_STEPS.map((step) => `${signatureProbe(step.signature)} as prior_${step.version}`).join(",\n      ")},
      ${MIGRATIONS.map((migration) => `${signatureProbe(migration.signature)} as sig_${migration.version}`).join(",\n      ")}
  `;
}

function truthy(value) { return value === true || value === "true" || value === "t"; }
function unixToIso(value) { return Number.isFinite(Number(value)) && Number(value) > 0 ? new Date(Number(value) * 1000).toISOString() : "none"; }
function postgresArray(value) {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value !== "string") return [];
  const inner = value.replace(/^\{|\}$/g, "");
  return inner ? inner.split(",").map((entry) => entry.replace(/^"|"$/g, "")) : [];
}

export function summarizeReadback(row) {
  const ledgerVersions = postgresArray(row.ledger_versions);
  const prerequisites = Object.fromEntries(PHASE_PREREQUISITES.map((entry) => [entry.name, truthy(row[`prereq_${entry.name}`])]));
  const signatures = Object.fromEntries(MIGRATIONS.map((migration) => [migration.version, truthy(row[`sig_${migration.version}`])]));
  const baselineExact = LEDGER_BASELINE_VERSIONS.every((version) => ledgerVersions.includes(version));
  const unknownLedgerVersions = ledgerVersions.filter((version) => !LEDGER_BASELINE_VERSIONS.includes(version)
    && !UNLEDGERED_PRIOR_STEPS.some((step) => step.version === version)
    && !MIGRATIONS.some((migration) => migration.version === version));
  const priorSteps = UNLEDGERED_PRIOR_STEPS.map((step) => ({
    position: step.position,
    version: step.version,
    ledgerRow: ledgerVersions.includes(step.version),
    objectPresent: truthy(row[`prior_${step.version}`]),
    requiredByChain: step.requiredByChain
  }));
  const missing = MIGRATIONS.filter((migration) => !signatures[migration.version]).map((migration) => migration.version);
  const present = MIGRATIONS.filter((migration) => signatures[migration.version]).map((migration) => migration.version);
  // The chain is an ordered prefix only if no later file is present while an earlier one is absent.
  const firstMissingIndex = MIGRATIONS.findIndex((migration) => !signatures[migration.version]);
  const orderedPrefix = firstMissingIndex === -1 || MIGRATIONS.slice(firstMissingIndex).every((migration) => !signatures[migration.version]);
  return {
    ledgerPresent: truthy(row.ledger_present),
    ledgerHasNameColumn: truthy(row.ledger_has_name_column),
    ledgerVersions,
    baselineExact,
    unknownLedgerVersions,
    prerequisites,
    prerequisitesExact: Object.values(prerequisites).every(Boolean),
    priorSteps,
    priorStepsRequiredPresent: priorSteps.every((step) => !step.requiredByChain || step.objectPresent),
    signatures,
    present,
    missing,
    orderedPrefix,
    complete: missing.length === 0
  };
}

async function readback(caseId) {
  const rows = await managementQuery(readbackQuery(), caseId);
  return summarizeReadback(Array.isArray(rows) ? rows[0] ?? {} : {});
}

// Aggregate, SELECT-only impact of 20260828100000 on stored pending results,
// evaluated against whichever column names the table carries right now (the
// migration renames matter_id, source_session_id and pending_token_hash and
// adds status). Counts only; no row content is read back.
async function pendingResultImpactReadback() {
  const columnRows = await managementQuery(
    "select column_name::text from information_schema.columns where table_schema='public' and table_name='consumer_pending_screening_results'",
    "pending_result_columns"
  );
  const columns = new Set((Array.isArray(columnRows) ? columnRows : []).map((row) => row.column_name));
  const tokenHash = columns.has("claim_token_hash") ? "claim_token_hash" : "pending_token_hash";
  const hasStatus = columns.has("status");
  // The migration runs three statements in order: (1) link claimed rows to
  // their unique Briefcase matter, (2) mark rows with user, matter and time
  // CLAIMED, (3) revoke what is still PENDING and carries no token or an old
  // claim. A row that step 2 marks CLAIMED is not PENDING at step 3, so the
  // revocation is modelled after the earlier steps, never on the raw table.
  const rows = await managementQuery(`
    with p as (
      select p0.pending_id, p0.claimed_user_id, p0.claimed_at, p0.expires_at, p0.created_at,
        p0.${tokenHash} as token_hash,
        ${columns.has("claimed_matter_id") ? "p0.claimed_matter_id" : "null::uuid"} as claimed_matter_id_now,
        ${hasStatus ? "p0.status" : "'PENDING'"} as status_now,
        (select count(*) from public.consumer_briefcase_items m where m.user_id = p0.claimed_user_id and m.source_session_id = p0.pending_id::text) as matter_matches
      from public.consumer_pending_screening_results p0
    ), s as (
      select *,
        (claimed_user_id is not null and claimed_matter_id_now is null and matter_matches = 1) as gains_matter_link,
        (claimed_user_id is not null and claimed_at is not null and (claimed_matter_id_now is not null or matter_matches = 1) and status_now <> 'CLAIMED') as becomes_claimed
      from p
    ), t as (
      select *, (status_now = 'PENDING' and not becomes_claimed and (token_hash is null or claimed_user_id is not null)) as becomes_revoked from s
    )
    select
      count(*)::int as total_rows,
      count(*) filter (where claimed_user_id is not null)::int as claimed_under_old_scheme,
      count(*) filter (where gains_matter_link)::int as claimed_rows_gaining_matter_link,
      count(*) filter (where becomes_claimed)::int as rows_becoming_claimed,
      count(*) filter (where becomes_revoked)::int as rows_to_be_revoked,
      count(*) filter (where becomes_revoked and claimed_user_id is not null)::int as claimed_rows_without_provable_matter_to_be_revoked,
      count(*) filter (where becomes_revoked and claimed_user_id is null and expires_at > now())::int as unexpired_unclaimed_rows_to_be_revoked,
      count(*) filter (where becomes_revoked and claimed_user_id is null and expires_at <= now())::int as expired_unclaimed_rows_to_be_revoked,
      count(*) filter (where becomes_revoked and created_at > now() - interval '24 hours')::int as rows_to_be_revoked_created_last_24h,
      count(*) filter (where status_now = 'PENDING' and not becomes_revoked and not becomes_claimed and expires_at > now())::int as live_pending_rows_kept,
      count(*) filter (where status_now = 'PENDING' and not becomes_revoked and not becomes_claimed and expires_at <= now())::int as expired_pending_rows_kept
    from t
  `, "pending_result_impact");
  const row = Array.isArray(rows) ? rows[0] ?? {} : {};
  return {
    columnNamesNow: { tokenHash, statusColumnPresent: hasStatus, claimedMatterIdPresent: columns.has("claimed_matter_id") },
    totalRows: Number(row.total_rows ?? 0),
    claimedUnderOldScheme: Number(row.claimed_under_old_scheme ?? 0),
    claimedRowsGainingMatterLink: Number(row.claimed_rows_gaining_matter_link ?? 0),
    rowsBecomingClaimed: Number(row.rows_becoming_claimed ?? 0),
    rowsToBeRevoked: Number(row.rows_to_be_revoked ?? 0),
    claimedRowsWithoutProvableMatterToBeRevoked: Number(row.claimed_rows_without_provable_matter_to_be_revoked ?? 0),
    unexpiredUnclaimedRowsToBeRevoked: Number(row.unexpired_unclaimed_rows_to_be_revoked ?? 0),
    expiredUnclaimedRowsToBeRevoked: Number(row.expired_unclaimed_rows_to_be_revoked ?? 0),
    rowsToBeRevokedCreatedLast24h: Number(row.rows_to_be_revoked_created_last_24h ?? 0),
    livePendingRowsKept: Number(row.live_pending_rows_kept ?? 0),
    expiredPendingRowsKept: Number(row.expired_pending_rows_kept ?? 0)
  };
}

// Read-only recovery facts: the project's database backups as the Management
// API reports them (PITR and scheduled backups), without any change.
async function backupReadback() {
  const backups = await managementGet(`/v1/projects/${encodeURIComponent(PRODUCTION_PROJECT_REF)}/database/backups`);
  const json = backups.json ?? {};
  const list = Array.isArray(json.backups) ? json.backups : [];
  return {
    httpStatus: backups.status,
    pitrEnabled: json.pitr_enabled === true,
    walgEnabled: json.walg_enabled === true,
    region: typeof json.region === "string" ? json.region : null,
    backupCount: list.length,
    latestCompletedBackupAt: list.filter((entry) => entry?.status === "COMPLETED").map((entry) => entry.inserted_at ?? entry.created_at ?? null).filter(Boolean).sort().at(-1) ?? null,
    physicalBackupData: json.physical_backup_data ?? null
  };
}

async function recordLedgerRow(migration, hasNameColumn) {
  const name = path.basename(migration.path, ".sql").replace(/^\d+_/, "");
  const query = hasNameColumn
    ? `insert into supabase_migrations.schema_migrations (version, name) values (${sqlLiteral(migration.version)}, ${sqlLiteral(name)}) on conflict (version) do nothing`
    : `insert into supabase_migrations.schema_migrations (version) values (${sqlLiteral(migration.version)}) on conflict (version) do nothing`;
  await managementQuery(query, `ledger_row_${migration.version}`);
  evidence.ledgerRowsRecorded.push(migration.version);
}

try {
  if (PHASE !== "forward_chain_readback" && PHASE !== "forward_chain_migrate") throw new Error("only the forward-chain readback and migration phases are enabled");
  if (INPUT_APPLICATION_SHA !== APPLICATION_SHA || INPUT_PROJECT_REF !== PRODUCTION_PROJECT_REF || !SUPABASE_ACCESS_TOKEN) {
    throw new Error("exact Production forward-chain inputs are unavailable");
  }

  const project = await managementGet(`/v1/projects/${encodeURIComponent(PRODUCTION_PROJECT_REF)}`);
  record(
    "canonical_production_project_is_authenticated",
    project.status === 200 && (project.json?.ref ?? project.json?.id) === PRODUCTION_PROJECT_REF,
    `authenticated project ref=${project.json?.ref ?? project.json?.id ?? "unresolved"}`
  );

  const sqlByVersion = new Map(MIGRATIONS.map((migration) => [migration.version, frozenMigrationSql(ROOT_DIR, migration)]));
  record("frozen_forward_chain_hashes_exact", sqlByVersion.size === MIGRATIONS.length, `${MIGRATIONS.length} files at ${APPLICATION_SHA} hash to their pinned values`);

  const before = await readback("forward_chain_readback");
  evidence.readback = { before };
  record(
    "migration_ledger_carries_the_recovered_baseline",
    before.ledgerPresent && before.baselineExact,
    `ledger present=${before.ledgerPresent}; versions=${before.ledgerVersions.length} [${before.ledgerVersions.join(", ")}]; baseline 13 present=${before.baselineExact}; unknown=${JSON.stringify(before.unknownLedgerVersions)}`
  );
  record(
    "unledgered_prior_steps_reconciled_against_objects",
    before.priorStepsRequiredPresent,
    before.priorSteps.map((step) => `${step.version}: ledger row=${step.ledgerRow}, object ${step.objectPresent ? "present" : "absent"}${step.requiredByChain ? "" : " (outside this chain; never replayed here)"}`).join("; ")
  );
  record(
    "loose_phase_prerequisites_present",
    before.prerequisitesExact,
    Object.entries(before.prerequisites).map(([name, present]) => `${name}=${present}`).join(", ")
  );
  record(
    "forward_chain_state_is_an_ordered_prefix",
    before.orderedPrefix,
    `present=[${before.present.join(", ")}]; missing=[${before.missing.join(", ")}]`
  );

  const impact = await pendingResultImpactReadback();
  evidence.pendingResultImpact = impact;
  record(
    "pending_result_existing_row_impact_read_as_counts",
    Number.isInteger(impact.totalRows),
    `rows=${impact.totalRows}; claimed under old scheme=${impact.claimedUnderOldScheme}; would gain matter link=${impact.claimedRowsGainingMatterLink}; would become CLAIMED=${impact.rowsBecomingClaimed}; would be REVOKED=${impact.rowsToBeRevoked} (claimed without a provable matter=${impact.claimedRowsWithoutProvableMatterToBeRevoked}; unexpired unclaimed=${impact.unexpiredUnclaimedRowsToBeRevoked}; expired unclaimed=${impact.expiredUnclaimedRowsToBeRevoked}; created in last 24h=${impact.rowsToBeRevokedCreatedLast24h}); pending rows kept: live=${impact.livePendingRowsKept}, expired=${impact.expiredPendingRowsKept}; token column now=${impact.columnNamesNow.tokenHash}; status column present=${impact.columnNamesNow.statusColumnPresent}`
  );

  const backups = await backupReadback();
  evidence.backups = backups;
  record(
    "database_backup_facts_read_without_writing",
    backups.httpStatus === 200,
    `backups HTTP ${backups.httpStatus}; PITR=${backups.pitrEnabled}; WAL-G=${backups.walgEnabled}; region=${backups.region ?? "unknown"}; backups listed=${backups.backupCount}; latest completed=${backups.latestCompletedBackupAt ?? "none listed"}; physical backups earliest=${unixToIso(backups.physicalBackupData?.earliest_physical_backup_date_unix)} latest=${unixToIso(backups.physicalBackupData?.latest_physical_backup_date_unix)}`
  );

  if (PHASE === "forward_chain_readback") {
    record("readback_phase_wrote_nothing", evidence.productionDatabaseMutated === false, "read-only phase; no SQL other than catalog reads was issued");
    persist(true);
    console.log(`PRODUCTION FORWARD-CHAIN READBACK PASS — ${before.missing.length} of ${MIGRATIONS.length} forward migrations absent: ${before.missing.join(", ") || "none"}`);
  } else {
    const authorization = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, AUTHORIZATION_PATH), "utf8"));
    const authorized = authorization?.status === "authorized_production_incident"
      && authorization?.productionProjectRef === PRODUCTION_PROJECT_REF
      && authorization?.applicationSha === APPLICATION_SHA
      && Array.isArray(authorization?.migrations)
      && authorization.migrations.length === MIGRATIONS.length
      && authorization.migrations.every((entry, index) => entry.path === MIGRATIONS[index].path && entry.sha256 === MIGRATIONS[index].sha256)
      && /^[0-9]{6,}$/.test(String(authorization?.readbackRunId ?? ""))
      && authorization?.dropAuthorized === false;
    record(
      "independent_production_authorization_names_the_exact_chain",
      authorized,
      `status=${authorization?.status}; readback run=${authorization?.readbackRunId ?? "none"}; migrations=${authorization?.migrations?.length ?? 0}; drop authorized=${authorization?.dropAuthorized}`
    );
    // The revocation in 20260828100000 marks REVOKED every stored pending
    // result that stays PENDING and carries no claim token or an old-scheme
    // claim without a provable matter. The apply is allowed only while each
    // revocation bucket, re-read now, stays within the maximum the owner
    // accepted in the authorization record after the readback run; a larger
    // live effect stops here before any write.
    const accepted = authorization?.acceptedRevocation ?? {};
    const revocationBounds = [
      ["unexpiredUnclaimedRowsToBeRevoked", "maxUnexpiredUnclaimedRowsRevoked"],
      ["claimedRowsWithoutProvableMatterToBeRevoked", "maxClaimedRowsWithoutProvableMatterRevoked"],
      ["expiredUnclaimedRowsToBeRevoked", "maxExpiredUnclaimedRowsRevoked"]
    ];
    record(
      "existing_row_revocation_within_the_owner_accepted_bound",
      revocationBounds.every(([observedKey, acceptedKey]) => Number.isInteger(accepted[acceptedKey]) && accepted[acceptedKey] >= 0 && impact[observedKey] <= accepted[acceptedKey]),
      revocationBounds.map(([observedKey, acceptedKey]) => `${observedKey}=${impact[observedKey]} (owner-accepted maximum ${Number.isInteger(accepted[acceptedKey]) ? accepted[acceptedKey] : "not recorded"})`).join("; ")
    );

    for (const migration of MIGRATIONS) {
      const current = await readback(`pre_apply_readback_${migration.version}`);
      if (current.signatures[migration.version]) {
        evidence.migrationsAlreadyPresent.push(migration.version);
        if (!current.ledgerVersions.includes(migration.version)) {
          await recordLedgerRow(migration, current.ledgerHasNameColumn);
          evidence.productionDatabaseMutated = true;
        }
        record(`forward_migration_${migration.position}_already_present`, true, `${migration.path} signature present; ledger row ${current.ledgerVersions.includes(migration.version) ? "present" : "recorded"}`);
        continue;
      }
      await managementQuery(sqlByVersion.get(migration.version), `forward_migration_${migration.position}_applied`);
      evidence.productionDatabaseMutated = true;
      evidence.migrationsApplied.push(migration.version);
      const after = await readback(`post_apply_readback_${migration.version}`);
      if (!after.ledgerVersions.includes(migration.version)) await recordLedgerRow(migration, after.ledgerHasNameColumn);
      const proven = migration.signature.kind === "ledger" ? true : after.signatures[migration.version] === true;
      record(`forward_migration_${migration.position}_applied_and_read_back`, proven, `${migration.path} applied; signature ${migration.signature.kind}:${migration.signature.name} present=${proven}`);
    }

    const final = await readback("forward_chain_final_readback");
    evidence.readback.after = final;
    record("forward_chain_complete_after_apply", final.complete && final.orderedPrefix, `present=[${final.present.join(", ")}]; missing=[${final.missing.join(", ")}]`);
    record(
      "ledger_records_every_forward_version",
      MIGRATIONS.every((migration) => final.ledgerVersions.includes(migration.version)),
      `ledger versions=${final.ledgerVersions.length}: [${final.ledgerVersions.join(", ")}]`
    );
    persist(true);
    console.log(`PRODUCTION FORWARD-CHAIN MIGRATION PASS — applied ${evidence.migrationsApplied.length}, already present ${evidence.migrationsAlreadyPresent.length}, ledger rows recorded ${evidence.ledgerRowsRecorded.length}`);
  }
} catch (error) {
  const failure = error instanceof Error ? error.message : String(error);
  persist(false, failure);
  console.error(`PRODUCTION FORWARD-CHAIN ${PHASE === "forward_chain_migrate" ? "MIGRATION" : "READBACK"} REFUSED — ${failure}`);
  process.exit(1);
}
