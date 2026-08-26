#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const checks = [];
const check = (passed, message) => checks.push({ passed, message });
const root = path.resolve(process.env.RCAP_PRODUCTION_VERIFY_ROOT ?? ".");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const workflow = read(".github/workflows/rcap-production-canary.yml");
const dispatcher = read(".github/workflows/rcap-f1-ephemeral-staging.yml");
const script = read("scripts/rcap-production-canary.mjs");

check(workflow.includes("RCAP controlled Production canary"), "dedicated Production workflow exists");
check(dispatcher.includes("production_preflight"), "dispatcher exposes the read-only Production preflight");
check(!dispatcher.includes("production_url_reclassify"), "withdrawn environment-mutation mode is not dispatchable");
check(workflow.includes('RCAP_PRODUCTION_PHASE: "preflight"'), "preflight phase is fixed by the workflow");
check(workflow.includes("permissions:\n  contents: read\n  packages: read"), "workflow permissions are read-only");
check(workflow.includes("Verify the exact frozen identity and image-input equivalence"), "application and worker byte identity gate runs first");
check(workflow.includes("docker pull \"$REF\""), "worker is pulled only by immutable digest");
check(workflow.includes("node scripts/verify-rcap-production-canary.mjs"), "workflow self-verifies before discovery");
check(workflow.includes("node scripts/rcap-production-canary.mjs"), "workflow runs the dedicated control");
check(workflow.includes("if: always()"), "evidence uploads even after refusal");
check(workflow.includes("VERCEL_AUTOMATION_BYPASS_SECRET"), "runtime inspection receives the existing protection-bypass secret without printing it");

check(script.includes('const APPLICATION_SHA = "441ee3188ee52047a012232d8d11f890a09b4ac5"'), "application SHA is exact");
check(script.includes('const TOOLS_SHA = "d075ff0fd5627ec55c9d27c3018b1fb77f1fa08b"'), "tools SHA is exact");
check(script.includes('const WORKER_DIGEST = "sha256:67132df2d1bee49d123d0d2918880f283d2109195b49150265d348fe1d07a69c"'), "worker digest is exact");
check(script.includes('const ACCEPTANCE_PROJECT_REF = "hyflxnlhpmiqxvvcoiia"'), "acceptance project is an explicit negative control");
check(script.includes('const PRODUCTION_PROJECT_REF = "wwtwtsmywnckfkdaqqeg"'), "canonical Production project is pinned explicitly");
check(script.includes('const ACCEPTANCE_DEPLOYMENT_ID = "dpl_9ygomDGFAXSLHENBfc6Undtyknjf"'), "accepted Preview deployment is pinned exactly");
check(script.includes("production_environment_is_separate_from_acceptance"), "environment separation is a required verdict");
check(script.includes("staged_production_deployment_is_exact"), "exact READY staged Production deployment is a required verdict");
check(script.includes("accepted_preview_deployment_is_exact"), "accepted Preview deployment identity is required before runtime inspection");
check(script.includes("rollback_target_recorded_before_mutation"), "rollback identity is a required verdict");
check(script.includes("inspectRuntimeSupabaseOrigin"), "Production and acceptance identities come from bounded runtime inspection");
check(script.includes("candidateOrigins.size !== 1"), "runtime inspection requires exactly one Supabase origin");
check(script.includes("production_runtime_project_is_canonical"), "Production runtime must map to the canonical project");
check(script.includes("acceptance_preview_project_is_exact"), "accepted Preview runtime must map to acceptance");
check(script.includes("createHash(\"sha256\")"), "only SHA-256 origin hashes are retained in evidence");
check(script.includes('"--prod", "--skip-domain"'), "a missing staged candidate may be created without domain assignment");
check(!script.includes("vercel promote"), "preflight cannot promote the staged deployment");
check(!script.includes("decrypt=true") && !script.includes('decrypt: "true"'), "withdrawn plaintext/decrypt readback gate is absent");
check(!script.includes("/v1/projects/${encodeURIComponent(vercelIdentity.projectId)}/env/"), "stale single-variable v1 endpoint is absent");
check(script.includes("environmentVariableChanged: false"), "evidence fixes environment-variable mutation to false");
check(script.includes("productionAliasChanged: false"), "evidence fixes Production alias movement to false");
check(script.includes("productionDatabaseMutated: false"), "evidence fixes Production database mutation to false");
check(!/\/env[^\n]{0,180}method:\s*["'](?:POST|PUT|PATCH|DELETE)["']/.test(script), "preflight contains no environment-variable mutation");
check(!script.includes("database/query"), "preflight does not issue SQL, even read-only SQL through a POST endpoint");
check(script.includes('method: "GET"'), "runtime and management inspection retain explicit GET-only transport");
check(!script.includes("console.log(origin") && !script.includes("console.error(origin"), "runtime origins are never logged directly");
check(script.includes("originPersisted: false"), "evidence records that runtime origins are not persisted");

const failed = checks.filter((entry) => !entry.passed);
for (const entry of checks) console.log(`${entry.passed ? "ok  " : "FAIL"} ${entry.message}`);
if (failed.length) {
  console.error(`verify-rcap-production-canary failed: ${failed.length}/${checks.length}`);
  process.exit(1);
}
console.log(`verify-rcap-production-canary passed: ${checks.length}/${checks.length}`);
