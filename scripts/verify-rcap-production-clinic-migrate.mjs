#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.env.RCAP_PRODUCTION_CLINIC_VERIFY_ROOT ?? ".");
const read = (file) => fs.existsSync(path.join(root, file))
  ? fs.readFileSync(path.join(root, file), "utf8")
  : "";
const workflow = read(".github/workflows/rcap-production-canary.yml");
const dispatcher = read(".github/workflows/rcap-f1-ephemeral-staging.yml");
const script = read("scripts/rcap-production-clinic-migrate.mjs");
const checks = [];
const check = (passed, message) => checks.push({ passed, message });

check(dispatcher.includes("production_clinic_migrate"), "dispatcher exposes only the exact Production Clinic phase");
check(workflow.includes("inputs.phase == 'clinic_migrate'"), "Clinic phase is isolated from runtime preflight");
check(workflow.includes("node scripts/verify-rcap-production-clinic-migrate.mjs"), "workflow self-verifies the migration contract");
check(workflow.includes("node scripts/test-rcap-production-clinic-migrate-mutations.mjs"), "workflow runs focused mutation resistance proof");
check(workflow.includes("node scripts/rcap-production-clinic-migrate.mjs"), "workflow invokes the dedicated migration control");
check(script.includes('const PRODUCTION_PROJECT_REF = "wwtwtsmywnckfkdaqqeg"'), "Production project ref is exact");
check(script.includes('const APPLICATION_SHA = "441ee3188ee52047a012232d8d11f890a09b4ac5"'), "application SHA is exact");
for (const [name, hash] of [
  ["core", "5e3df0a7f49aae3ebbec10b7392acd331e9ca91b2ffa11c7ee16b3e996f3ddef"],
  ["security", "9a0af066fbe2d47c82f259e6998a7056a2f8c377c8e6875f143d40fd11f18835"],
  ["accounting", "9fb46113fbb87eb75b1502f7cb85c9c27a36bac284888202b64baa63398f8010"]
]) check(script.includes(hash), `${name} migration hash is exact`);
check(script.includes('spawnSync("git", ["show"'), "migration bytes come from the frozen application commit");
check(script.includes("baseline_phases_49_55_readback_passed"), "accepted phase 49–55 baseline is read before mutation");
check(script.includes("clinic_schema_initial_state_is_empty_or_complete"), "partial pre-existing Clinic schema is refused");
check(script.includes("clinic_migrations_applied_in_exact_order"), "three files apply only in exact order");
check(script.includes("all_10_clinic_tables_exist_with_rls_enabled"), "10/10 Clinic table and RLS readback is required");
check(script.includes("all_22_clinic_functions_exist"), "22/22 Clinic function readback is required");
check(script.includes("database/query"), "DDL and direct readback use the exact Supabase project endpoint");
check(!script.includes("rcap_acceptance_clinic_migration_ledger"), "Production phase does not create the acceptance ledger");
check(
  !script.includes("api.vercel.com")
    && !script.includes("vercel@")
    && !script.includes("/aliases")
    && !script.includes("vercel promote"),
  "migration phase cannot deploy or move aliases"
);
check(script.includes("realParticipantRecordsCreated: false"), "evidence fixes real participant creation to false");
check(script.includes("realChargesCreated: false"), "evidence fixes real charges to false");

const failed = checks.filter((entry) => !entry.passed);
for (const entry of checks) console.log(`${entry.passed ? "ok  " : "FAIL"} ${entry.message}`);
if (failed.length) {
  console.error(`verify-rcap-production-clinic-migrate failed: ${failed.length}/${checks.length}`);
  process.exit(1);
}
console.log(`verify-rcap-production-clinic-migrate passed: ${checks.length}/${checks.length}`);
