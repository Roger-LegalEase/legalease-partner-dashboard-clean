#!/usr/bin/env node
// Contract verifier for the exact Production Legal Aid readback and migration phases.
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.env.RCAP_LEGAL_AID_VERIFY_ROOT ?? ".");
const read = (file) => fs.existsSync(path.join(root, file)) ? fs.readFileSync(path.join(root, file), "utf8") : "";
const workflow = read(".github/workflows/rcap-production-canary.yml");
const dispatcher = read(".github/workflows/rcap-f1-ephemeral-staging.yml");
const script = read("scripts/rcap-production-legal-aid-migrate.mjs");
const contract = read("scripts/rcap-legal-aid/contract.mjs");
const authorization = (() => { try { return JSON.parse(read("data/rcap-production-legal-aid-migration-authorization.json")); } catch { return {}; } })();
const checks = [];
const check = (passed, message) => checks.push({ passed, message });

check(dispatcher.includes("production_legal_aid_readback") && dispatcher.includes("production_legal_aid_migrate"), "dispatcher exposes the Legal Aid readback and migration phases");
check(workflow.includes("inputs.phase == 'legal_aid_migrate'") && workflow.includes("inputs.phase == 'legal_aid_readback'"), "Legal Aid phases are isolated from runtime preflight");
check(workflow.includes("node scripts/verify-rcap-production-legal-aid-migrate.mjs"), "workflow self-verifies the Legal Aid contract");
check(workflow.includes("node scripts/test-rcap-production-legal-aid-migrate-mutations.mjs"), "workflow runs the Legal Aid mutation resistance proof");
check(workflow.includes("node scripts/rcap-production-legal-aid-migrate.mjs"), "workflow invokes the dedicated Legal Aid control");
check(workflow.includes('RCAP_PRODUCTION_PHASE: "legal_aid_readback"') && workflow.includes('RCAP_PRODUCTION_PHASE: "legal_aid_migrate"'), "workflow fixes each phase name");
check(contract.includes('PRODUCTION_PROJECT_REF = "wwtwtsmywnckfkdaqqeg"'), "Production project ref is exact");
check(script.includes('const release = requireRelease(ROOT_DIR, env);') && script.includes('requireRelease = requireProductionMigrationRelease'), "current successor application, worker and tools tuple is verified before service access");
check(script.includes('certifyClinicSourceCatalog(reference,') && script.includes('already_exact_source_postconditions_no_write'), "complete source postconditions allow verified no-write success");
check(workflow.includes('node scripts/rcap-production-migration-contract.mjs') && workflow.includes('node --test scripts/rcap-production-migration-contract.test.mjs'), "workflow requires current release authorization and behavioral migration proof");
check(contract.includes('sha256: "91c9b887324ce36d0515357fef2b9ce19cef271c99c157e8004533c73015cce8"'), "Legal Aid migration hash is exact");
check(script.includes("frozenMigrationSql("), "migration bytes come from the frozen application commit");
check(script.includes("clinic_mode_prerequisites_read_back_exact"), "Clinic Mode prerequisites are read before mutation");
check(script.includes("legal_aid_schema_initial_state_is_empty_or_complete"), "partial pre-existing Legal Aid schema is refused");
check(script.includes("independent_production_authorization_and_reviewed_behavior"), "Production apply requires independent authorization and reviewed behavior");
check(script.includes("readback_phase_wrote_nothing"), "readback phase asserts it wrote nothing");
check(script.includes("all_12_legal_aid_tables_exist_with_rls_enabled"), "12/12 table and RLS readback is required");
check(script.includes("all_32_legal_aid_functions_exist"), "32/32 function readback is required");
check(script.includes("private_bucket_and_grants_read_back_tight"), "private bucket and grant readback is required");
check(script.includes("database/query"), "DDL and direct readback use the exact Supabase project endpoint");
check(!script.includes("rcap_acceptance_legal_aid_migration_ledger"), "Production phase does not create the acceptance ledger");
check(!/api\.vercel\.com|vercel@|\/aliases|vercel promote/.test(script), "migration phase cannot deploy or move aliases");
check(!/delete\s+from|truncate\s|drop\s+(?:table|schema|database|column)/i.test(script + contract), "control contains no destructive SQL");
check(script.includes("structureDropped: false"), "evidence fixes structure drops to false");
check(script.includes("realParticipantRecordsCreated: false"), "evidence fixes real participant creation to false");
check(script.includes("realChargesCreated: false"), "evidence fixes real charges to false");
check(authorization?.productionProjectRef === "wwtwtsmywnckfkdaqqeg", "authorization record names the canonical Production project");
check(authorization?.dropAuthorized === false, "authorization record forbids dropping Legal Aid structure");
check(authorization?.migration?.sha256 === "91c9b887324ce36d0515357fef2b9ce19cef271c99c157e8004533c73015cce8", "authorization record pins the same hash");

const proof = read("scripts/rcap-production-legal-aid-browser-receipt.mjs");
check(authorization.status === 'authorized_on_unchanged_application_and_reviewed_behavior', 'owner authorization uses Production-native proof condition');
check(!/legal_aid_browser_run_id|RCAP_LEGAL_AID_BROWSER_RUN_ID/.test(workflow+dispatcher+script), 'no stale browser run input remains');
check(!/api\.github\.com|\bfetch\s*\(/.test(proof), 'Production proof requires no GitHub receipt fetch');
check(proof.includes('applicationInputEquivalence') && proof.includes("application.changedPaths,[]") && proof.includes("application.equivalent,true"), 'canonical application equivalence refuses drift');
check(proof.includes('verifyReviewedLegalAidBehavior') && proof.includes('reviewed behavior drift:'), 'reviewed Legal Aid behavior bytes are preserved');
check(script.includes('behaviorProof = runProductionLegalAidBehaviorProof') && script.includes('await behaviorProof({') && script.indexOf('await behaviorProof({') < script.indexOf('await managementGet('), 'deterministic behavior battery precedes service access');
check(script.includes('proof = verifyProductionLegalAidProof') && script.includes('await proof({'), 'empty schema requires the Production proof');
check(script.includes('immediateBeforeWrite.empty && immediateBeforeWrite.prerequisitesExact') && script.indexOf('await proof({') < script.indexOf('await readback("legal_aid_immediate_prewrite_readback")') && script.indexOf('await readback("legal_aid_immediate_prewrite_readback")') < script.indexOf('await managementQuery(sql,'), 'immediate pre-write readback remains mandatory after proof');

const failed = checks.filter((entry) => !entry.passed);
for (const entry of checks) console.log(`${entry.passed ? "ok  " : "FAIL"} ${entry.message}`);
if (failed.length) { console.error(`verify-rcap-production-legal-aid-migrate failed: ${failed.length}/${checks.length}`); process.exit(1); }
console.log(`verify-rcap-production-legal-aid-migrate passed: ${checks.length}/${checks.length}`);
