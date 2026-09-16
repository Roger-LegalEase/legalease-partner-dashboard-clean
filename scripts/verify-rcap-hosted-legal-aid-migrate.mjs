#!/usr/bin/env node
// Contract verifier for the exact acceptance Legal Aid migration phase.
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.env.RCAP_LEGAL_AID_VERIFY_ROOT ?? ".");
const read = (file) => fs.existsSync(path.join(root, file)) ? fs.readFileSync(path.join(root, file), "utf8") : "";
const workflow = read(".github/workflows/rcap-hosted-acceptance-staging.yml");
const dispatcher = read(".github/workflows/rcap-f1-ephemeral-staging.yml");
const script = read("scripts/rcap-hosted-legal-aid-migrate.mjs");
const contract = read("scripts/rcap-legal-aid/contract.mjs");
const readiness = (() => { try { return JSON.parse(read("data/rcap-staging-authorization-readiness.json")); } catch { return {}; } })();
const checks = [];
const check = (passed, message) => checks.push({ passed, message });

check((dispatcher.match(/inputs\.mode == 'hosted_legal_aid_migrate' && 'legal_aid_migrate'/g) ?? []).length === 1, "hosted_legal_aid_migrate maps exactly once to the legal_aid_migrate phase");
check(workflow.includes("inputs.phase == 'legal_aid_migrate'"), "Legal Aid phase is isolated in the acceptance workflow");
check(workflow.includes("node scripts/verify-rcap-hosted-legal-aid-migrate.mjs"), "workflow self-verifies the Legal Aid migration contract");
check(workflow.includes("node scripts/test-rcap-hosted-legal-aid-migrate-mutations.mjs"), "workflow runs the Legal Aid mutation resistance proof");
check(workflow.includes("node scripts/rcap-hosted-legal-aid-migrate.mjs"), "workflow invokes the dedicated Legal Aid control");
check(/inputs\.phase == 'migrate' \|\| inputs\.phase == 'clinic_migrate' \|\| inputs\.phase == 'legal_aid_migrate'/.test(workflow), "Supabase-only preflight proves the acceptance project before the Legal Aid apply");
check(/worker_contract\|legal_aid_migrate\) DEPLOY=false; MATRIX=false; GATE=false; RETARGET=false; BROWSER=false; CLINIC=false/.test(workflow), "Legal Aid phase never deploys, retargets, or runs the matrix");
check(contract.includes('sha256: "91c9b887324ce36d0515357fef2b9ce19cef271c99c157e8004533c73015cce8"'), "Legal Aid migration hash is exact");
check(contract.includes('sourceSha: "f5c4f40022e422033985302995511da7157f474d"'), "Legal Aid migration source commit is exact");
check(contract.includes('path: "supabase/migrations/20260916120000_legal_aid_clinic_mode.sql"'), "Legal Aid migration path is exact");
check(contract.includes('ACCEPTANCE_PROJECT_REF = "hyflxnlhpmiqxvvcoiia"'), "acceptance project ref is exact");
check(script.includes("frozenMigrationSql("), "migration bytes come from the frozen commit through git show");
check(!/readdirSync|glob|supabase\/phase-|pending migrations/.test(script + contract), "control cannot discover or apply files outside the exact one-file authorization");
check((contract.match(/supabase\/migrations\//g) ?? []).length === 1, "contract names exactly one migration file");
check(script.includes("clinic_mode_prerequisites_read_back_exact"), "Clinic Mode prerequisites are read back before the first write");
check(script.includes("legal_aid_schema_initial_state_is_empty_or_complete"), "partial pre-existing Legal Aid schema is refused");
check(script.includes("ledger_and_catalog_agree"), "ledger and catalog must agree before applying");
check(script.includes("all_12_legal_aid_tables_exist_with_rls_enabled"), "12/12 table and RLS readback is required");
check(script.includes("all_32_legal_aid_functions_exist"), "32/32 function readback is required");
check(script.includes("private_bucket_and_grants_read_back_tight"), "private bucket and grant readback is required");
check(script.includes("independent_readiness_hash_and_project_exact"), "independent readiness record must agree");
check(readiness?.legalAidClinicModeMigrationAuthorization?.status === "authorized_nonproduction_acceptance_only", "readiness carries the bounded nonproduction Legal Aid authorization");
check(readiness?.legalAidClinicModeMigrationAuthorization?.productionAuthorized === false, "readiness does not authorize Production through the acceptance path");
check(readiness?.legalAidClinicModeMigrationAuthorization?.migration?.sha256 === "91c9b887324ce36d0515357fef2b9ce19cef271c99c157e8004533c73015cce8", "readiness pins the same hash");
check(script.includes("database/query"), "DDL and readback use the exact Supabase project endpoint");
check(!/VERCEL|STRIPE|--prod|wwtwtsmywnckfkdaqqeg/i.test(script), "acceptance control reaches no deployment, Stripe, or Production surface");
check(!/delete\s+from|truncate\s|drop\s+(?:table|schema|database|column)/i.test(script + contract), "control contains no destructive SQL");
check(script.includes("productionTouched: false"), "evidence fixes Production to untouched");
check(script.includes("realParticipantRecordsCreated: false"), "evidence fixes real participant creation to false");
check(script.includes("realChargesCreated: false"), "evidence fixes real charges to false");

const failed = checks.filter((entry) => !entry.passed);
for (const entry of checks) console.log(`${entry.passed ? "ok  " : "FAIL"} ${entry.message}`);
if (failed.length) { console.error(`verify-rcap-hosted-legal-aid-migrate failed: ${failed.length}/${checks.length}`); process.exit(1); }
console.log(`verify-rcap-hosted-legal-aid-migrate passed: ${checks.length}/${checks.length}`);
