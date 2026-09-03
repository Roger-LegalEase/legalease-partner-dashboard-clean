#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const entry = fs.readFileSync(path.join(root, ".github/workflows/rcap-f1-ephemeral-staging.yml"), "utf8");
const hosted = fs.readFileSync(path.join(root, ".github/workflows/rcap-hosted-acceptance-staging.yml"), "utf8");
const readiness = JSON.parse(fs.readFileSync(path.join(root, "data/rcap-staging-authorization-readiness.json"), "utf8"));
const migrationScriptPath = path.join(root, "scripts/rcap-hosted-clinic-migrate.mjs");
const migrationScript = fs.existsSync(migrationScriptPath) ? fs.readFileSync(migrationScriptPath, "utf8") : "";
const provenanceMigrationPath = path.join(root, "supabase/migrations/20260901115000_consumer_packet_artifact_provenance.sql");
const provenanceMigration = fs.existsSync(provenanceMigrationPath) ? fs.readFileSync(provenanceMigrationPath, "utf8") : "";

let checks = 0;
const failures = [];
const check = (condition, message) => {
  checks += 1;
  if (!condition) failures.push(message);
};
const includesEvery = (source, needles, label) => check(
  needles.every((needle) => source.includes(needle)),
  `${label} is missing: ${needles.filter((needle) => !source.includes(needle)).join(", ")}`
);

includesEvery(entry, [
  "hosted_clinic_migrate",
  "inputs.mode == 'hosted_clinic_migrate' && 'clinic_migrate'"
], "dispatch entry");
check((entry.match(/inputs\.mode == 'hosted_clinic_migrate' && 'clinic_migrate'/g) ?? []).length === 1, "hosted_clinic_migrate does not map exactly once");

includesEvery(hosted, [
  "inputs.phase == 'migrate' || inputs.phase == 'clinic_migrate'",
  "clinic_migrate|migrate|preflight|vercel_audit|worker_contract",
  "node scripts/verify-rcap-hosted-clinic-migrate.mjs",
  "node scripts/rcap-hosted-clinic-migrate.mjs",
  "SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}",
  "HOSTED_APPLICATION_SHA: ${{ inputs.application_sha }}",
  "exact frozen Clinic migrations",
  "O_VERIFY_CLINIC_MIGRATE",
  "O_CLINIC_MIGRATE"
], "isolated Clinic migration workflow");
check(!/inputs\.phase == 'clinic_migrate'[\s\S]{0,600}(?:rcap-hosted-acceptance-migrate|rcap-hosted-acceptance-deploy|rcap-hosted-checkout-gate|rcap-hosted-colorado-clinic-browser)/.test(hosted), "Clinic migration phase can reach an unrelated hosted runtime");

includesEvery(migrationScript, [
  'const REQUIRED_PROJECT_REF = "hyflxnlhpmiqxvvcoiia"',
  'const READINESS_PATH = "data/rcap-staging-authorization-readiness.json"',
  'path: "supabase/migrations/20260825120000_clinic_mode_core.sql"',
  'sha256: "5e3df0a7f49aae3ebbec10b7392acd331e9ca91b2ffa11c7ee16b3e996f3ddef"',
  'path: "supabase/migrations/20260825121000_clinic_mode_security.sql"',
  'sha256: "9a0af066fbe2d47c82f259e6998a7056a2f8c377c8e6875f143d40fd11f18835"',
  'path: "supabase/migrations/20260825122000_clinic_mode_accounting_reporting.sql"',
  'sha256: "9fb46113fbb87eb75b1502f7cb85c9c27a36bac284888202b64baa63398f8010"',
  'path: "supabase/migrations/20260828100000_shared_pending_result_and_atomic_claim.sql"',
  'sha256: "9d4cfcc1849585ad609fe04547cdaf2186582e7369fac1c4868d414de1f9113c"',
  'path: "supabase/migrations/20260901115000_consumer_packet_artifact_provenance.sql"',
  'sha256: "eb4969342a488c281152323693f4ef90732026a16f443218e53231e09cf78132"',
  'path: "supabase/migrations/20260901120000_dtc_consumer_launch_rails.sql"',
  'sha256: "510883d3aa6b0b34140b7b1d09ecaf9662cd45915e6a1ea4d657e85e0f84ffeb"',
  'path: "supabase/migrations/20260901130000_consumer_private_delivery.sql"',
  'sha256: "ab3c23fa13bc52bbf9604e1811e5fec989a7291fb840e1ae5994a12100395621"',
  'path: "supabase/migrations/20260901140000_tighten_consumer_artifact_authorization.sql"',
  'sha256: "cb0c3289f91b2eb5381fc663217149818ef2bfb0460e420c48f1091f87caf424"',
  'path: "supabase/migrations/20260903120000_clinic_event_jurisdiction_lock.sql"',
  'sha256: "2ce9864b23b628d83ea6ac8583d53928623845f4e3a10bc79644d1b54a1ea39e"',
  'path: "supabase/migrations/20260903130000_atomic_sponsored_packet_finalization.sql"',
  'sha256: "5e032d60f605850538efac1039995ed95c30b6e37babeb83a9240a9ef47888e4"',
  "independent_readiness_hashes_and_order_exact",
  "git",
  '["show", `${APPLICATION_SHA}:${migration.path}`]'
], "frozen commit/hash source contract");
check(!/readdirSync|glob|supabase\/phase-/.test(migrationScript), "migration source can discover or apply files outside the exact ten-file sequence");
check((migrationScript.match(/path: "supabase\/migrations\//g) ?? []).length === 10, "protected runner does not contain exactly ten migration identities");

const authorized = readiness.clinicModePreviewMigrationAuthorization;
check(authorized?.status === "authorized_nonproduction_acceptance_only", "independent readiness does not carry the bounded nonproduction authorization");
check(authorized?.acceptanceProjectRef === "hyflxnlhpmiqxvvcoiia", "independent readiness names the wrong acceptance project");
check(authorized?.productionAuthorized === false, "independent readiness permits Production");
check(authorized?.adHocCaptainShellSqlAuthorized === false, "independent readiness permits ad hoc Captain SQL");
check(authorized?.migrationsInApplyOrder?.length === 10, "independent readiness does not pin exactly ten migrations");
check(
  authorized?.migrationsInApplyOrder?.every((entry) => {
    const bytes = fs.readFileSync(path.join(root, entry.path));
    return crypto.createHash("sha256").update(bytes).digest("hex") === entry.sha256;
  }),
  "an independently authorized migration hash does not match the tracked bytes"
);

includesEvery(provenanceMigration, [
  "create table if not exists public.consumer_packet_artifact_provenance",
  "consumer_packet_artifact_provenance: incompatible column shape",
  "consumer_packet_artifact_provenance: incompatible constraint shape",
  "consumer_packet_artifact_provenance: incompatible owner index",
  "consumer_packet_artifact_provenance: direct RLS policy is incompatible",
  "consumer_packet_artifact_provenance_legacy_evidence_required",
  "consumer_packet_artifact_provenance_user_idx",
  "alter table public.consumer_packet_artifact_provenance enable row level security",
  "revoke all on table public.consumer_packet_artifact_provenance from public, anon, authenticated",
  "create or replace function public.consumer_packet_artifact_provenance_immutable()",
  "create or replace function public.rcap_participant_erasure_authority()",
  "grant execute on function public.consumer_packet_artifact_provenance_immutable() to service_role",
  "grant execute on function public.rcap_participant_erasure_authority() to service_role"
], "authoritative protected provenance prerequisite");
check(!/insert\s+into\s+public\.consumer_packet_artifact_provenance|update\s+public\.consumer_packet_artifact_provenance|delete\s+from\s+public\.consumer_packet_artifact_provenance/i.test(provenanceMigration), "provenance prerequisite mutates artifact rows");

includesEvery(migrationScript, [
  "rcap_acceptance_clinic_migration_ledger",
  "sequence_position",
  "application_sha",
  "clinic_acceptance_ledger_immutable",
  "before update or delete",
  "unexpected ledger row",
  "existing ledger is not an exact prefix"
], "immutable exact-prefix ledger contract");

includesEvery(migrationScript, [
  "clinic_events",
  "clinic_event_staff",
  "clinic_event_access_codes",
  "clinic_event_access_redemptions",
  "clinic_assisted_sessions",
  "clinic_cases",
  "clinic_follow_ups",
  "clinic_incidents",
  "clinic_event_audit",
  "clinic_packet_reservations",
  "consumer_pending_screening_results",
  "clinic_end_assisted_session",
  "clinic_upsert_event_follow_up",
  "clinic_get_follow_ups",
  "finalize_sponsored_packet_generation_if_verified",
  "postgresArray",
  "Supabase Management API may encode PostgreSQL arrays as text",
  "relrowsecurity",
  "protected_table_grants_tight",
  "key_function_grants_tight",
  '"all_required_tables_exist_with_rls_enabled"',
  '"all_required_functions_exist"',
  '"consumer_artifact_provenance_prerequisite_exact"',
  '"all_seven_current_demo_migration_families_read_back"',
  "atomic_sponsored_finalizer_present",
  "ledger records all 10 exact frozen migrations"
], "Clinic Preview catalog/RLS/readback contract");

includesEvery(migrationScript, [
  "migrationApplied",
  "productionTouched: false",
  "rcap-hosted-clinic-migrate/v3",
  "clinic-migrate.json"
], "redacted nonproduction evidence contract");
check(!/VERCEL|STRIPE|--prod|production\.supabase/i.test(migrationScript), "Clinic migration script reaches a deployment, Stripe, or Production surface");
check(!/delete\s+from|truncate\s|drop\s+(?:table|schema|database)/i.test(migrationScript), "Clinic migration orchestration contains destructive SQL");

if (failures.length > 0) {
  console.error(`FAIL verify-rcap-hosted-clinic-migrate — ${failures.length}/${checks} failed`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`OK verify-rcap-hosted-clinic-migrate — ${checks}/${checks}; exact ten-file nonproduction Clinic Preview sequence`);
