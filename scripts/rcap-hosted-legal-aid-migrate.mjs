#!/usr/bin/env node

// Exact, isolated Legal Aid Clinic Mode schema apply for the named
// nonproduction acceptance project. One frozen migration file, read from the
// authorized source commit with `git show` and refused unless its bytes hash
// to the authorized value. The Clinic Mode prerequisites are read back before
// the first write; a partial Legal Aid schema is refused; the apply is
// ledgered immutably; the result is read back against the frozen contract.
//
// It cannot touch Production, deploy, move an alias, or run any other
// migration: the only SQL it issues is the one authorized file plus the
// ledger and catalog reads.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { prepareHostedAcceptanceEvidenceLayout } from "./rcap-hosted-acceptance-evidence-layout.mjs";
import {
  ACCEPTANCE_PROJECT_REF, LEGAL_AID_MIGRATION, LEGAL_AID_TABLES, LEGAL_AID_FUNCTIONS, frozenMigrationSql, readbackQuery, summarizeReadback
} from "./rcap-legal-aid/contract.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { root: evidenceDir } = prepareHostedAcceptanceEvidenceLayout({ rootDir });
const evidencePath = path.join(evidenceDir, "legal-aid-migrate.json");

const REQUIRED_PROJECT_REF = ACCEPTANCE_PROJECT_REF;
const READINESS_PATH = "data/rcap-staging-authorization-readiness.json";
const APPLICATION_SHA = (process.env.HOSTED_APPLICATION_SHA ?? "").trim();
const PROJECT_REF = (process.env.ACCEPTANCE_SUPABASE_PROJECT_REF ?? "").trim();
const SUPABASE_ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN ?? "";
const secrets = [SUPABASE_ACCESS_TOKEN].filter(Boolean);

function sanitize(value) {
  let text = String(value ?? "");
  for (const secret of secrets) text = text.split(secret).join("***REDACTED***");
  return text.replace(/eyJ[A-Za-z0-9_.-]{20,}/g, "***REDACTED***");
}

const evidence = {
  schemaVersion: "rcap-hosted-legal-aid-migrate/v1",
  applicationSha: APPLICATION_SHA || null,
  acceptanceProjectRef: PROJECT_REF || null,
  exactMigration: { ...LEGAL_AID_MIGRATION },
  migrationApplied: false,
  migrationDisposition: null,
  productionTouched: false,
  realParticipantRecordsCreated: false,
  realChargesCreated: false,
  readbackBefore: null,
  readbackAfter: null,
  cases: {}
};

class LegalAidMigrationFailure extends Error {
  constructor(caseId, message) { super(`${caseId}: ${sanitize(message)}`); this.name = "LegalAidMigrationFailure"; this.caseId = caseId; }
}

function record(caseId, passed, observed) {
  evidence.cases[caseId] = { passed, observed: sanitize(observed) };
  console.log(`  ${passed ? "ok  " : "FAIL"} ${caseId} — ${sanitize(observed)}`);
  if (!passed) throw new LegalAidMigrationFailure(caseId, observed);
}

function writeEvidence(passed, error = null) {
  evidence.passed = passed;
  if (error) evidence.failure = { caseId: error instanceof LegalAidMigrationFailure ? error.caseId : null, message: sanitize(error instanceof Error ? error.message : error) };
  fs.mkdirSync(evidenceDir, { recursive: true });
  fs.writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`);
}

async function managementQuery(query, caseId = "acceptance_database_query_succeeded") {
  const response = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${SUPABASE_ACCESS_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query })
  });
  const text = await response.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* reported below */ }
  if (!response.ok) throw new LegalAidMigrationFailure(caseId, `HTTP ${response.status}: ${sanitize(json?.message ?? text).slice(0, 400)}`);
  return json;
}

async function readback(caseId) {
  const rows = await managementQuery(readbackQuery(), caseId);
  return summarizeReadback(Array.isArray(rows) ? rows[0] ?? {} : {});
}

async function main() {
  record(
    "exact_nonproduction_inputs_present",
    /^[0-9a-f]{40}$/.test(APPLICATION_SHA) && PROJECT_REF === REQUIRED_PROJECT_REF && Boolean(SUPABASE_ACCESS_TOKEN),
    `application is a full SHA=${/^[0-9a-f]{40}$/.test(APPLICATION_SHA)}; acceptance project exact=${PROJECT_REF === REQUIRED_PROJECT_REF}; credential supplied=${Boolean(SUPABASE_ACCESS_TOKEN)}`
  );

  const sql = frozenMigrationSql(rootDir, APPLICATION_SHA);
  record(
    "frozen_legal_aid_migration_hash_exact",
    sql.length > 0,
    `${LEGAL_AID_MIGRATION.path} read from ${APPLICATION_SHA} hashes to the authorized ${LEGAL_AID_MIGRATION.sha256} (source commit ${LEGAL_AID_MIGRATION.sourceSha})`
  );

  const readiness = JSON.parse(fs.readFileSync(path.join(rootDir, READINESS_PATH), "utf8"));
  const independent = readiness.legalAidClinicModeMigrationAuthorization;
  const independentExact = independent?.status === "authorized_nonproduction_acceptance_only"
    && independent?.acceptanceProjectRef === REQUIRED_PROJECT_REF
    && independent?.productionAuthorized === false
    && independent?.migration?.path === LEGAL_AID_MIGRATION.path
    && independent?.migration?.sha256 === LEGAL_AID_MIGRATION.sha256
    && independent?.migration?.sourceSha === LEGAL_AID_MIGRATION.sourceSha;
  record(
    "independent_readiness_hash_and_project_exact",
    independentExact,
    `readiness names the same file, hash and source commit=${independentExact}; acceptance project exact=${independent?.acceptanceProjectRef === REQUIRED_PROJECT_REF}; Production authorized=${independent?.productionAuthorized === true}`
  );

  await managementQuery(`
    create table if not exists public.rcap_acceptance_legal_aid_migration_ledger (
      migration_path text primary key,
      sha256 text not null check (sha256 ~ '^[0-9a-f]{64}$'),
      source_sha text not null check (source_sha ~ '^[0-9a-f]{40}$'),
      application_sha text not null check (application_sha ~ '^[0-9a-f]{40}$'),
      applied_at timestamptz not null default now()
    );
    revoke all on public.rcap_acceptance_legal_aid_migration_ledger from public, anon, authenticated;
    alter table public.rcap_acceptance_legal_aid_migration_ledger enable row level security;
    create or replace function public.legal_aid_acceptance_ledger_immutable()
    returns trigger language plpgsql set search_path = ''
    as $$ begin raise exception 'legal_aid_acceptance_ledger_immutable'; end $$;
    revoke all on function public.legal_aid_acceptance_ledger_immutable() from public, anon, authenticated;
    do $$ begin
      if not exists (select 1 from pg_trigger where tgname = 'legal_aid_acceptance_ledger_immutable'
        and tgrelid = 'public.rcap_acceptance_legal_aid_migration_ledger'::regclass) then
        create trigger legal_aid_acceptance_ledger_immutable
        before update or delete on public.rcap_acceptance_legal_aid_migration_ledger
        for each row execute function public.legal_aid_acceptance_ledger_immutable();
      end if;
    end $$;
  `, "immutable_legal_aid_migration_ledger_ready");
  const existingRows = await managementQuery(`
    select migration_path, sha256, source_sha, application_sha from public.rcap_acceptance_legal_aid_migration_ledger
  `, "immutable_legal_aid_migration_ledger_readable");
  const existing = Array.isArray(existingRows) ? existingRows : [];
  const ledgerMatches = existing.length === 0
    || (existing.length === 1 && existing[0].migration_path === LEGAL_AID_MIGRATION.path && existing[0].sha256 === LEGAL_AID_MIGRATION.sha256);
  record("existing_ledger_is_empty_or_exact", ledgerMatches, `${existing.length} ledger entries; exact=${ledgerMatches}`);

  const before = await readback("legal_aid_prerequisite_readback_succeeded");
  evidence.readbackBefore = before;
  record(
    "clinic_mode_prerequisites_read_back_exact",
    before.prerequisitesExact,
    `clinic tables=${before.prerequisites.clinicTableCount}/10; baseline tables=${before.prerequisites.baselineTableCount}/4; clinic functions=${before.prerequisites.clinicFunctionCount}/4; jurisdiction column=${before.prerequisites.jurisdictionColumnPresent}; storage catalog=${before.prerequisites.storageCatalogPresent}`
  );
  record(
    "legal_aid_schema_initial_state_is_empty_or_complete",
    before.empty || before.complete,
    `empty=${before.empty}; complete=${before.complete}; tables=${before.legalAid.tableCount}/${LEGAL_AID_TABLES.length}; functions=${before.legalAid.functionCount}/${LEGAL_AID_FUNCTIONS.length}; ledger entries=${existing.length}`
  );
  record(
    "ledger_and_catalog_agree",
    (before.empty && existing.length === 0) || (before.complete && existing.length === 1),
    `catalog empty=${before.empty}; catalog complete=${before.complete}; ledger entries=${existing.length}`
  );

  if (before.empty) {
    await managementQuery(sql, "legal_aid_migration_applied");
    await managementQuery(`
      insert into public.rcap_acceptance_legal_aid_migration_ledger (migration_path, sha256, source_sha, application_sha)
      values ('${LEGAL_AID_MIGRATION.path}', '${LEGAL_AID_MIGRATION.sha256}', '${LEGAL_AID_MIGRATION.sourceSha}', '${APPLICATION_SHA}')
    `, "legal_aid_migration_ledger_recorded");
    evidence.migrationApplied = true;
    evidence.migrationDisposition = "applied_from_frozen_source_and_ledgered";
  } else {
    evidence.migrationDisposition = "already_applied_at_exact_hash";
  }
  record("legal_aid_migration_applied_or_already_exact", true, evidence.migrationDisposition);

  const after = await readback("legal_aid_catalog_direct_readback_succeeded");
  evidence.readbackAfter = after;
  record(
    "all_12_legal_aid_tables_exist_with_rls_enabled",
    after.legalAid.tableCount === LEGAL_AID_TABLES.length && after.legalAid.rlsTableCount === LEGAL_AID_TABLES.length,
    `tables=${after.legalAid.tableCount}/${LEGAL_AID_TABLES.length}; RLS=${after.legalAid.rlsTableCount}/${LEGAL_AID_TABLES.length}`
  );
  record(
    "all_32_legal_aid_functions_exist",
    after.legalAid.functionCount === LEGAL_AID_FUNCTIONS.length,
    `functions=${after.legalAid.functionCount}/${LEGAL_AID_FUNCTIONS.length}`
  );
  record(
    "event_columns_guard_and_widened_constraints_present",
    after.legalAid.eventColumnCount === 7 && after.legalAid.publicationGuard && after.legalAid.auditAppendOnly && after.legalAid.staffPermissionsWidened && after.legalAid.auditActionsCurrent,
    `event columns=${after.legalAid.eventColumnCount}/7; publication guard=${after.legalAid.publicationGuard}; audit append-only=${after.legalAid.auditAppendOnly}; staff permissions widened=${after.legalAid.staffPermissionsWidened}; audit actions current=${after.legalAid.auditActionsCurrent}`
  );
  record(
    "private_bucket_and_grants_read_back_tight",
    after.legalAid.bucketCount === 1 && after.legalAid.bucketPrivate && after.legalAid.noBrowserWrites && after.legalAid.restrictedFieldsUnreadableByBrowser && after.legalAid.restrictedFieldsPolicyless && after.legalAid.serviceOnlyGrantsTight,
    `bucket=${after.legalAid.bucketCount} private=${after.legalAid.bucketPrivate}; browser writes=${!after.legalAid.noBrowserWrites}; restricted fields readable by browser=${!after.legalAid.restrictedFieldsUnreadableByBrowser}; restricted policies=${!after.legalAid.restrictedFieldsPolicyless}; service-only grants tight=${after.legalAid.serviceOnlyGrantsTight}`
  );
  record("legal_aid_schema_complete_after_apply", after.complete, `complete=${after.complete}`);

  const finalLedgerRows = await managementQuery(`
    select migration_path, sha256, source_sha, application_sha from public.rcap_acceptance_legal_aid_migration_ledger
  `, "final_legal_aid_migration_ledger_readback_succeeded");
  const finalLedger = Array.isArray(finalLedgerRows) ? finalLedgerRows : [];
  record(
    "ledger_records_the_exact_frozen_migration",
    finalLedger.length === 1 && finalLedger[0].migration_path === LEGAL_AID_MIGRATION.path && finalLedger[0].sha256 === LEGAL_AID_MIGRATION.sha256 && finalLedger[0].source_sha === LEGAL_AID_MIGRATION.sourceSha,
    `ledger entries=${finalLedger.length}; exact=${finalLedger[0]?.sha256 === LEGAL_AID_MIGRATION.sha256}`
  );
}

try {
  await main();
  writeEvidence(true);
  console.log("\nHOSTED LEGAL AID MIGRATE: PASS — the exact frozen Legal Aid Clinic Mode migration is present on acceptance only");
} catch (error) {
  writeEvidence(false, error);
  console.error(`\nHOSTED LEGAL AID MIGRATE: FAIL — ${sanitize(error instanceof Error ? error.message : error)}`);
  process.exitCode = 1;
}
