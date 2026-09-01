#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const entry = fs.readFileSync(path.join(root, ".github/workflows/rcap-f1-ephemeral-staging.yml"), "utf8");
const hosted = fs.readFileSync(path.join(root, ".github/workflows/rcap-hosted-acceptance-staging.yml"), "utf8");
const migrationScriptPath = path.join(root, "scripts/rcap-hosted-clinic-migrate.mjs");
const migrationScript = fs.existsSync(migrationScriptPath) ? fs.readFileSync(migrationScriptPath, "utf8") : "";

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
  'const REQUIRED_APPLICATION_SHA = "441ee3188ee52047a012232d8d11f890a09b4ac5"',
  'const REQUIRED_PROJECT_REF = "hyflxnlhpmiqxvvcoiia"',
  'path: "supabase/migrations/20260825120000_clinic_mode_core.sql"',
  'sha256: "5e3df0a7f49aae3ebbec10b7392acd331e9ca91b2ffa11c7ee16b3e996f3ddef"',
  'path: "supabase/migrations/20260825121000_clinic_mode_security.sql"',
  'sha256: "9a0af066fbe2d47c82f259e6998a7056a2f8c377c8e6875f143d40fd11f18835"',
  'path: "supabase/migrations/20260825122000_clinic_mode_accounting_reporting.sql"',
  'sha256: "9fb46113fbb87eb75b1502f7cb85c9c27a36bac284888202b64baa63398f8010"',
  "git",
  '["show", `${APPLICATION_SHA}:${migration.path}`]'
], "frozen commit/hash source contract");
check(!/readdirSync|glob|supabase\/phase-|supabase\/migrations\/[^(2026082512)]/.test(migrationScript), "migration source can discover or apply files outside the exact three-file sequence");

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
  "clinic_end_assisted_session",
  "clinic_upsert_event_follow_up",
  "clinic_get_follow_ups",
  "postgresArray",
  "Supabase Management API may encode PostgreSQL arrays as text",
  "relrowsecurity",
  "all 10 Clinic tables exist with RLS enabled",
  "all 22 Clinic functions exist",
  "ledger records all 3 exact frozen migrations"
], "Clinic catalog/RLS readback");

includesEvery(migrationScript, [
  "migrationApplied",
  "productionTouched: false",
  "rcap-hosted-clinic-migrate/v1",
  "clinic-migrate.json"
], "redacted nonproduction evidence contract");
check(!/VERCEL|STRIPE|--prod|production\.supabase/i.test(migrationScript), "Clinic migration script reaches a deployment, Stripe, or Production surface");
check(!/delete\s+from|truncate\s|drop\s+(?:table|schema|database)/i.test(migrationScript), "Clinic migration orchestration contains destructive SQL");

if (failures.length > 0) {
  console.error(`FAIL verify-rcap-hosted-clinic-migrate — ${failures.length}/${checks} failed`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`OK verify-rcap-hosted-clinic-migrate — ${checks}/${checks}; exact three-file nonproduction Clinic sequence`);
