#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.env.RCAP_PRODUCTION_ACTIVATION_VERIFY_ROOT ?? ".");
const read = (file) => fs.existsSync(path.join(root, file))
  ? fs.readFileSync(path.join(root, file), "utf8")
  : "";
const workflow = read(".github/workflows/rcap-production-canary.yml");
const dispatcher = read(".github/workflows/rcap-f1-ephemeral-staging.yml");
const script = read("scripts/rcap-production-activate.mjs");
const checks = [];
const check = (passed, message) => checks.push({ passed, message });

check(dispatcher.includes("production_activate"), "dispatcher exposes one isolated Production activation phase");
check(workflow.includes("inputs.phase == 'activate'"), "activation is isolated from preflight, migration, and smoke");
check(workflow.includes("actions: read"), "workflow can read only the exact prior smoke artifact");
check(dispatcher.includes("permissions:\n  contents: read\n  packages: read\n  actions: read"), "dispatcher grants the reusable workflow prior-artifact read access");
check(workflow.includes("run-id: 32967717618"), "workflow pins the successful Production smoke run");
check(workflow.includes("rcap-production-smoke-32967717618"), "workflow pins the exact successful smoke artifact");
check(workflow.includes("node scripts/verify-rcap-production-activation.mjs"), "workflow self-verifies the activation contract");
check(workflow.includes("node scripts/test-rcap-production-activation-mutations.mjs"), "workflow runs activation mutation proof");
check(workflow.includes("node scripts/rcap-production-activate.mjs"), "workflow invokes only the dedicated activation control");

check(script.includes('const STAGED_DEPLOYMENT_ID = "dpl_DGDUFV4B7ufTAW5wsfR2txJE2dVL"'), "exact staged deployment is pinned");
check(script.includes('const ROLLBACK_DEPLOYMENT_ID = "dpl_9WoA51v3wXSvG3VmBKGUEKtVBCfS"'), "exact rollback deployment is pinned");
check(script.includes('const SMOKE_RUN_ID = "32967717618"'), "exact successful smoke run is pinned");
check(script.includes('const PRODUCTION_PROJECT_REF = "wwtwtsmywnckfkdaqqeg"'), "canonical Production Supabase project is pinned");
check(script.includes('const APPLICATION_SHA = "441ee3188ee52047a012232d8d11f890a09b4ac5"'), "final application SHA is pinned");
check(script.includes('const WORKER_DIGEST = "sha256:67132df2d1bee49d123d0d2918880f283d2109195b49150265d348fe1d07a69c"'), "immutable worker digest is pinned");
check(script.includes("successful_smoke_artifact_is_exact"), "activation requires the exact successful smoke artifact");
check(script.includes("rollback_is_ready_and_active_before_promotion"), "rollback is READY and active before promotion");
check(script.includes("staged_deployment_identity_is_exact"), "staged deployment identity is rechecked before promotion");
check(script.includes("production_clinic_schema_is_exact"), "Production Clinic schema is directly read back before promotion");
check(script.includes('"promote"'), "activation promotes the existing staged deployment");
check(script.includes('"--timeout=5m"'), "promotion has a bounded control-plane wait");
check(script.includes("production_domains_resolve_to_staged_deployment"), "all Production domains must resolve to the staged deployment");
check(script.includes("canonicalRuntimeDomain"), "runtime smoke selects one exact canonical Vercel Production domain");
check(script.includes("fetchWithRetry"), "post-promotion runtime reads use bounded retry for edge convergence");
check(script.includes("active_production_health_is_200"), "active Production health must pass after promotion");
check(script.includes("active_runtime_project_is_canonical"), "active runtime must map to canonical Production Supabase");
check(script.includes("environment_metadata_is_unchanged"), "environment metadata must remain unchanged");
check(script.includes("rollback_target_remains_ready"), "recorded rollback target must remain READY");
check(script.includes("automaticRollback"), "post-promotion failure has an automatic rollback path");
check(script.includes('"rollback"'), "automatic rollback uses the exact recorded deployment");
check(script.includes("rollback_domains_restored"), "automatic rollback verifies domain restoration");
check(!script.includes('"deploy"') && !script.includes("vercel deploy"), "activation cannot build or create a deployment");
check(!/\/env[^\n]{0,180}method:\s*["'](?:POST|PUT|PATCH|DELETE)["']/.test(script), "activation cannot mutate environment variables");
check(!script.includes("stripe.com") && !script.includes("checkout/sessions"), "activation cannot create Checkout or charges");
check(!script.includes("insert into") && !script.includes("update ") && !script.includes("delete from"), "activation contains no database writes");
check(script.includes("applicationChanged: false") && script.includes("workerChanged: false"), "evidence fixes application and worker changes to false");

const failed = checks.filter((entry) => !entry.passed);
for (const entry of checks) console.log(`${entry.passed ? "ok  " : "FAIL"} ${entry.message}`);
if (failed.length) {
  console.error(`verify-rcap-production-activation failed: ${failed.length}/${checks.length}`);
  process.exit(1);
}
console.log(`verify-rcap-production-activation passed: ${checks.length}/${checks.length}`);
