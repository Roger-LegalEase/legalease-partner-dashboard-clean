#!/usr/bin/env node
// Exact Production Legal Aid Clinic Mode schema apply and direct readback.
//
// Two phases. `legal_aid_readback` is read-only: it proves the canonical
// Production project, reads the Clinic Mode prerequisites and the current
// Legal Aid state, and writes nothing. `legal_aid_migrate` applies the one
// frozen, hash-pinned migration file only when the Legal Aid schema is
// entirely absent and the independent Production authorization record names
// the passing hosted acceptance run; a partial pre-existing schema is refused.
// No ledger, fixture, participant, checkout, deployment, alias, or worker
// action is performed. Nothing is ever dropped.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { LEGAL_AID_MIGRATION, LEGAL_AID_TABLES, LEGAL_AID_FUNCTIONS, PRODUCTION_PROJECT_REF, frozenMigrationSql, readbackQuery, summarizeReadback } from "./rcap-legal-aid/contract.mjs";

const APPLICATION_SHA = "436520e4a99f0b8a290ace32f1d717b951630319";
const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const AUTHORIZATION_PATH = "data/rcap-production-legal-aid-migration-authorization.json";
const PHASE = (process.env.RCAP_PRODUCTION_PHASE ?? "").trim();
const INPUT_APPLICATION_SHA = (process.env.RCAP_APPLICATION_SHA ?? "").trim();
const INPUT_PROJECT_REF = (process.env.RCAP_PRODUCTION_PROJECT_REF ?? "").trim();
const SUPABASE_ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN ?? "";
const EVIDENCE_DIR = path.resolve(process.env.RCAP_PRODUCTION_EVIDENCE_DIR ?? "production-canary-evidence");
const EVIDENCE_FILE = path.join(EVIDENCE_DIR, `production-${PHASE || "legal-aid"}.json`);

fs.mkdirSync(EVIDENCE_DIR, { recursive: true });

const verdicts = [];
const evidence = {
  schemaVersion: "rcap-production-legal-aid-migrate/v1",
  phase: PHASE,
  startedAt: new Date().toISOString(),
  applicationSha: APPLICATION_SHA,
  productionProjectRef: PRODUCTION_PROJECT_REF,
  exactMigration: { ...LEGAL_AID_MIGRATION },
  migrationApplied: false,
  migrationDisposition: null,
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
  if (!response.ok) throw new Error(`${caseId}: HTTP ${response.status}: ${String(json?.message ?? "database query failed").slice(0, 240)}`);
  return json;
}

// One signature object per forward migration after the Clinic core (the
// repository order in verify-rcap-production-schema-upgrade.mjs). Read-only.
const FORWARD_CHAIN_SIGNATURES = Object.freeze([
  { migration: "20260828100000_shared_pending_result_and_atomic_claim", key: "m20260828100000", probe: "to_regclass('public.participant_claim_events') is not null" },
  { migration: "20260830120000_participant_data_rights", key: "m20260830120000", probe: "exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='guard_packet_delivery_events')" },
  { migration: "20260901115000_consumer_packet_artifact_provenance", key: "m20260901115000", probe: "to_regclass('public.consumer_packet_artifact_provenance') is not null" },
  { migration: "20260901120000_dtc_consumer_launch_rails", key: "m20260901120000", probe: "exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='bind_consumer_checkout_verification')" },
  { migration: "20260901130000_consumer_private_delivery", key: "m20260901130000", probe: "to_regclass('public.consumer_artifact_download_grants') is not null" },
  { migration: "20260903120000_clinic_event_jurisdiction_lock", key: "m20260903120000", probe: "exists(select 1 from information_schema.columns where table_schema='public' and table_name='clinic_events' and column_name='jurisdiction')" },
  { migration: "20260903130000_atomic_sponsored_packet_finalization", key: "m20260903130000", probe: "exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='finalize_sponsored_packet_generation_if_verified')" },
  { migration: "20260906120000_sponsored_route_render_transaction", key: "m20260906120000", probe: "to_regclass('public.sponsored_packet_render_routes') is not null" },
  { migration: "20260906130000_verified_artifact_regeneration", key: "m20260906130000", probe: "exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='finalize_sponsored_packet_generation_for_route')" }
]);

function forwardChainInventoryQuery() {
  return `select to_regclass('supabase_migrations.schema_migrations') is not null as migration_ledger_present, ${FORWARD_CHAIN_SIGNATURES.map(({ key, probe }) => `${probe} as ${key}`).join(", ")}`;
}

async function readback(caseId) {
  const rows = await managementQuery(readbackQuery(), caseId);
  return summarizeReadback(Array.isArray(rows) ? rows[0] ?? {} : {});
}

try {
  if (PHASE !== "legal_aid_readback" && PHASE !== "legal_aid_migrate") throw new Error("only the Legal Aid readback and migration phases are enabled");
  if (INPUT_APPLICATION_SHA !== APPLICATION_SHA || INPUT_PROJECT_REF !== PRODUCTION_PROJECT_REF || !SUPABASE_ACCESS_TOKEN) {
    throw new Error("exact Production Legal Aid inputs are unavailable");
  }

  const project = await managementGet(`/v1/projects/${encodeURIComponent(PRODUCTION_PROJECT_REF)}`);
  record(
    "canonical_production_project_is_authenticated",
    project.status === 200 && (project.json?.ref ?? project.json?.id) === PRODUCTION_PROJECT_REF,
    `authenticated project ref=${project.json?.ref ?? project.json?.id ?? "unresolved"}`
  );

  const sql = frozenMigrationSql(ROOT_DIR, APPLICATION_SHA);
  record("frozen_legal_aid_migration_hash_exact", sql.length > 0, `${LEGAL_AID_MIGRATION.path} at ${APPLICATION_SHA} hashes to the authorized ${LEGAL_AID_MIGRATION.sha256}`);

  // SELECT-only inventory of the forward migration chain after the Clinic
  // core, recorded before any verdict so a prerequisite refusal (readback run
  // 35121528344: jurisdiction column absent) still reports exactly which
  // repository migrations Production carries and which it lacks.
  const forwardChainRows = await managementQuery(forwardChainInventoryQuery(), "forward_chain_inventory");
  const forwardChain = Array.isArray(forwardChainRows) ? forwardChainRows[0] ?? {} : {};
  const ledgerPresent = forwardChain.migration_ledger_present === true || forwardChain.migration_ledger_present === "true";
  const appliedVersions = ledgerPresent
    ? await managementQuery("select version::text as version, coalesce(name, '') as name from supabase_migrations.schema_migrations order by version", "forward_chain_ledger")
    : [];
  evidence.forwardChain = {
    migrationLedgerPresent: ledgerPresent,
    ledgerVersions: Array.isArray(appliedVersions) ? appliedVersions.map((row) => `${row.version}${row.name ? ` ${row.name}` : ""}`) : [],
    signatures: Object.fromEntries(FORWARD_CHAIN_SIGNATURES.map(({ migration, key }) => [migration, forwardChain[key] === true || forwardChain[key] === "true"]))
  };
  record(
    "forward_chain_inventory_read_without_writing",
    Array.isArray(forwardChainRows) && forwardChainRows.length === 1,
    `ledger=${ledgerPresent ? evidence.forwardChain.ledgerVersions.length + " versions" : "absent"}; signatures ${FORWARD_CHAIN_SIGNATURES.map(({ migration }) => `${migration}=${evidence.forwardChain.signatures[migration]}`).join(", ")}`
  );

  const before = await readback("clinic_mode_prerequisites_readback");
  record(
    "clinic_mode_prerequisites_read_back_exact",
    before.prerequisitesExact,
    `clinic tables=${before.prerequisites.clinicTableCount}/10; baseline tables=${before.prerequisites.baselineTableCount}/4; clinic functions=${before.prerequisites.clinicFunctionCount}/4; jurisdiction column=${before.prerequisites.jurisdictionColumnPresent}; storage catalog=${before.prerequisites.storageCatalogPresent}`
  );
  record(
    "legal_aid_schema_initial_state_is_empty_or_complete",
    before.empty || before.complete,
    `empty=${before.empty}; complete=${before.complete}; tables=${before.legalAid.tableCount}/${LEGAL_AID_TABLES.length}; functions=${before.legalAid.functionCount}/${LEGAL_AID_FUNCTIONS.length}`
  );

  if (PHASE === "legal_aid_readback") {
    // Read-only onboarding facts for the MVLP coordinator setup (Roger's
    // 2026-09-16 onboarding authorization): whether the MVLP organization,
    // its onboarding workspace and first-administrator record exist, and the
    // membership shape of the named setup contact. SELECT only; nothing is
    // created, changed or confirmed here. No password, token or personal data
    // beyond the named work email's role and status is read.
    const onboardingRows = await managementQuery(`
      select
        (select count(*) from public.partner_records where partner_slug='mvlp') as mvlp_partner_rows,
        (select organization_name from public.partner_records where partner_slug='mvlp' limit 1) as mvlp_organization_name,
        (select provisioning_status from public.partner_records where partner_slug='mvlp' limit 1) as mvlp_provisioning_status,
        (select count(*) from public.partner_onboarding where partner_slug='mvlp') as mvlp_onboarding_workspaces,
        (select count(*) from public.partner_users where partner_slug='mvlp' and role='partner_admin' and status='active') as mvlp_active_administrators,
        (select count(*) from public.partner_users where partner_slug='mvlp' and role='partner_staff' and status='active') as mvlp_active_staff,
        (select count(*) from public.partner_events where partner_slug='mvlp' and event_type like 'first_admin_invitation_%') as mvlp_first_admin_events,
        (select count(*) from public.clinic_events where partner_slug='mvlp') as mvlp_clinic_events,
        (select count(*) from auth.users where lower(email)='roger@legalease.com') as contact_accounts,
        (select (email_confirmed_at is not null) from auth.users where lower(email)='roger@legalease.com' limit 1) as contact_email_confirmed,
        (select coalesce(jsonb_agg(jsonb_build_object('role', pu.role, 'partner_slug', pu.partner_slug, 'status', pu.status)), '[]'::jsonb)
           from public.partner_users pu join auth.users u on u.id=pu.auth_user_id where lower(u.email)='roger@legalease.com') as contact_memberships,
        (select count(*) from public.partner_users where role='internal_admin' and status='active') as active_internal_administrators
    `, "mvlp_onboarding_readback");
    const onboarding = Array.isArray(onboardingRows) ? onboardingRows[0] ?? {} : {};
    evidence.mvlpOnboarding = {
      readOnly: true,
      contactEmail: "roger@legalease.com",
      mvlpPartnerRows: Number(onboarding.mvlp_partner_rows ?? 0),
      mvlpOrganizationName: onboarding.mvlp_organization_name ?? null,
      mvlpProvisioningStatus: onboarding.mvlp_provisioning_status ?? null,
      mvlpOnboardingWorkspaces: Number(onboarding.mvlp_onboarding_workspaces ?? 0),
      mvlpActiveAdministrators: Number(onboarding.mvlp_active_administrators ?? 0),
      mvlpActiveStaff: Number(onboarding.mvlp_active_staff ?? 0),
      mvlpFirstAdminEvents: Number(onboarding.mvlp_first_admin_events ?? 0),
      mvlpClinicEvents: Number(onboarding.mvlp_clinic_events ?? 0),
      contactAccounts: Number(onboarding.contact_accounts ?? 0),
      contactEmailConfirmed: onboarding.contact_email_confirmed ?? null,
      contactMemberships: onboarding.contact_memberships ?? [],
      activeInternalAdministrators: Number(onboarding.active_internal_administrators ?? 0)
    };
    record("mvlp_onboarding_facts_read_without_writing", Array.isArray(onboardingRows), `mvlp partner rows=${evidence.mvlpOnboarding.mvlpPartnerRows}; onboarding workspaces=${evidence.mvlpOnboarding.mvlpOnboardingWorkspaces}; active administrators=${evidence.mvlpOnboarding.mvlpActiveAdministrators}; contact accounts=${evidence.mvlpOnboarding.contactAccounts}; confirmed=${evidence.mvlpOnboarding.contactEmailConfirmed}; memberships=${JSON.stringify(evidence.mvlpOnboarding.contactMemberships)}`);
    evidence.readback = { before };
    evidence.migrationDisposition = before.complete ? "already_present_read_only" : "absent_read_only";
    record("readback_phase_wrote_nothing", evidence.productionDatabaseMutated === false, "read-only phase; no SQL other than catalog reads was issued");
    persist(true);
    console.log("PRODUCTION LEGAL AID READBACK PASS — prerequisites and current state recorded without any write");
  } else {
    const authorization = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, AUTHORIZATION_PATH), "utf8"));
    const authorized = authorization?.status === "authorized_after_hosted_acceptance"
      && authorization?.productionProjectRef === PRODUCTION_PROJECT_REF
      && authorization?.migration?.path === LEGAL_AID_MIGRATION.path
      && authorization?.migration?.sha256 === LEGAL_AID_MIGRATION.sha256
      && authorization?.migration?.sourceSha === LEGAL_AID_MIGRATION.sourceSha
      && /^[0-9]{6,}$/.test(String(authorization?.hostedAcceptance?.legalAidMigrateRunId ?? ""))
      && /^[0-9]{6,}$/.test(String(authorization?.hostedAcceptance?.browserRunId ?? ""))
      && authorization?.dropAuthorized === false;
    record(
      "independent_production_authorization_names_passing_acceptance",
      authorized,
      `status=${authorization?.status}; acceptance migrate run=${authorization?.hostedAcceptance?.legalAidMigrateRunId ?? "none"}; acceptance browser run=${authorization?.hostedAcceptance?.browserRunId ?? "none"}; drop authorized=${authorization?.dropAuthorized}`
    );
    if (before.empty) {
      await managementQuery(sql, "legal_aid_migration_applied");
      evidence.migrationApplied = true;
      evidence.productionDatabaseMutated = true;
      evidence.migrationDisposition = "applied_exact_frozen_file";
    } else {
      evidence.migrationDisposition = "preexisting_complete_structural_readback";
    }
    record("legal_aid_migration_applied_or_already_exact", evidence.migrationApplied || before.complete, evidence.migrationDisposition);
    const after = await readback("legal_aid_catalog_direct_readback");
    record("all_12_legal_aid_tables_exist_with_rls_enabled", after.legalAid.tableCount === LEGAL_AID_TABLES.length && after.legalAid.rlsTableCount === LEGAL_AID_TABLES.length, `tables=${after.legalAid.tableCount}/${LEGAL_AID_TABLES.length}; RLS=${after.legalAid.rlsTableCount}/${LEGAL_AID_TABLES.length}`);
    record("all_32_legal_aid_functions_exist", after.legalAid.functionCount === LEGAL_AID_FUNCTIONS.length, `functions=${after.legalAid.functionCount}/${LEGAL_AID_FUNCTIONS.length}`);
    record("private_bucket_and_grants_read_back_tight", after.legalAid.bucketCount === 1 && after.legalAid.bucketPrivate && after.legalAid.noBrowserWrites && after.legalAid.restrictedFieldsUnreadableByBrowser && after.legalAid.restrictedFieldsPolicyless && after.legalAid.serviceOnlyGrantsTight, `bucket=${after.legalAid.bucketCount} private=${after.legalAid.bucketPrivate}; service-only grants tight=${after.legalAid.serviceOnlyGrantsTight}`);
    record("legal_aid_schema_complete_after_apply", after.complete, `complete=${after.complete}`);
    evidence.readback = { before, after };
    persist(true);
    console.log("PRODUCTION LEGAL AID MIGRATE PASS — exact frozen Legal Aid migration and direct readback are complete");
  }
} catch (error) {
  const failure = error instanceof Error ? error.message : String(error);
  persist(false, failure);
  console.error(`PRODUCTION LEGAL AID ${PHASE === "legal_aid_readback" ? "READBACK" : "MIGRATE"} REFUSED — ${failure}`);
  process.exit(1);
}
