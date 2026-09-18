#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.env.RCAP_PRODUCTION_SMOKE_VERIFY_ROOT ?? ".");
const read = (file) => fs.existsSync(path.join(root, file)) ? fs.readFileSync(path.join(root, file), "utf8") : "";
const workflow = read(".github/workflows/rcap-production-canary.yml");
const dispatcher = read(".github/workflows/rcap-f1-ephemeral-staging.yml");
const script = read("scripts/rcap-production-canary-smoke.mjs");
const checks = [];
const check = (passed, message) => checks.push({ passed, message });

check(dispatcher.includes("production_smoke"), "dispatcher exposes the isolated Production smoke phase");
check(workflow.includes("inputs.phase == 'smoke'"), "smoke is isolated from migration and activation");
check(workflow.includes("node scripts/verify-rcap-production-smoke.mjs"), "workflow self-verifies the smoke contract");
check(workflow.includes("node scripts/test-rcap-production-smoke-mutations.mjs"), "workflow runs focused smoke mutation proof");
check(workflow.includes("node scripts/rcap-production-canary-smoke.mjs"), "workflow invokes the dedicated smoke control");
check(script.includes('const STAGED_DEPLOYMENT_ID = "dpl_4rwbPYsHvj92tfZr4rWqZWBF4M9C"'), "exact staged deployment is pinned");
check(script.includes('const ROLLBACK_DEPLOYMENT_ID = "dpl_6qREkfSYpgQGKGnTPE9qRpM7BhFV"'), "exact rollback deployment is pinned");
check(!script.includes('"dpl_DGDUFV4B7ufTAW5wsfR2txJE2dVL"'), "the pre-migration deployment is named by no pin, so it cannot be a recovery target");
// The pair this release supersedes. Its staged id is the deployment Production
// serves now, so carrying it forward makes smoke test the live site and report
// the new release sound without ever reaching it -- which is what smoke run
// 35276699023 refused. Naming the superseded rollback here keeps the stale pair
// from returning by either half.
check(!script.includes('"dpl_DjAscmNucgJHauNsTtpbzGp9zfpU"'), "the superseded rollback deployment is named by no pin");
check(script.includes('const PRODUCTION_PROJECT_REF = "wwtwtsmywnckfkdaqqeg"'), "Production project is pinned");
check(script.includes("exact_staged_application_worker_identity"), "staged application and worker identity are required");
check(script.includes("rollback_target_is_ready_and_still_active"), "rollback readiness and unchanged active target are required");
check(script.includes("runtime_supabase_origin_is_canonical"), "staged runtime must still map to canonical Production Supabase");
check(script.includes("staged_health_is_200"), "staged health must pass");
check(script.includes("production_clinic_schema_direct_readback"), "Production Clinic schema receives direct readback");
check(script.includes("save_claim_schema_read_back_exact"), "save/claim pending-result schema receives exact read-back before activation");
check(script.includes('"claim_token_hash"'), "save/claim read-back requires the claim_token_hash column the live pending route writes");
check(script.includes('"claim_pending_screening_result"'), "save/claim read-back requires the atomic claim function the claim service calls");
check(script.includes('"participant_claim_events"'), "save/claim read-back requires the participant claim events table");
check(script.includes('const SAVE_CLAIM_LEGACY_COLUMNS = ["matter_id", "source_session_id", "pending_token_hash"]') && script.includes("legacyPresent.length === 0"), "save/claim read-back rejects the legacy matter_id, source_session_id and pending_token_hash columns");
check(script.includes("colorado_juvenile_guidance_has_no_commerce"), "Colorado juvenile path must remain guidance-only with no commerce");
check(script.includes("clinic_negative_control_isolated"), "negative-control isolation is required");
check(script.includes("clinic_reset_boundary_passed"), "Clinic reset API, cookie, header, and DB boundary are required");
check(script.includes("reset role;\n    do $$ declare outcome text"), "Clinic reset preserves the server-authority-only function grant");
check(script.includes("transactional_synthetic_fixture_rolled_back"), "synthetic fixture must be transactionally rolled back");
check(script.includes("realParticipantRecordsCreated: false"), "evidence fixes real participant creation to false");
check(script.includes("realChargesCreated: false"), "evidence fixes real charges to false");
check(!script.includes("stripe.com") && !script.includes("checkout/sessions"), "smoke cannot contact Stripe or create Checkout");
check(!script.includes("vercel promote") && !script.includes("/aliases"), "smoke cannot activate or move aliases");
check(!/\bdelete\s+from\b/i.test(script), "smoke contains no destructive cleanup statement");
check(script.includes("SQLSTATE=") && script.includes("<synthetic-email>"), "transaction failures expose only safe SQL classification");

const failed = checks.filter((entry) => !entry.passed);
for (const entry of checks) console.log(`${entry.passed ? "ok  " : "FAIL"} ${entry.message}`);
if (failed.length) {
  console.error(`verify-rcap-production-smoke failed: ${failed.length}/${checks.length}`);
  process.exit(1);
}
console.log(`verify-rcap-production-smoke passed: ${checks.length}/${checks.length}`);
