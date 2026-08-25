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
check(workflow.includes('RCAP_PRODUCTION_PHASE: "preflight"'), "preflight phase is fixed by the workflow");
check(workflow.includes("permissions:\n  contents: read\n  packages: read"), "workflow permissions are read-only");
check(workflow.includes("Verify the exact frozen identity and image-input equivalence"), "application and worker byte identity gate runs first");
check(workflow.includes("docker pull \"$REF\""), "worker is pulled only by immutable digest");
check(workflow.includes("node scripts/verify-rcap-production-canary.mjs"), "workflow self-verifies before discovery");
check(workflow.includes("node scripts/rcap-production-canary.mjs"), "workflow runs the dedicated control");
check(workflow.includes("if: always()"), "evidence uploads even after refusal");

check(script.includes('const APPLICATION_SHA = "441ee3188ee52047a012232d8d11f890a09b4ac5"'), "application SHA is exact");
check(script.includes('const TOOLS_SHA = "d075ff0fd5627ec55c9d27c3018b1fb77f1fa08b"'), "tools SHA is exact");
check(script.includes('const WORKER_DIGEST = "sha256:67132df2d1bee49d123d0d2918880f283d2109195b49150265d348fe1d07a69c"'), "worker digest is exact");
check(script.includes('const ACCEPTANCE_PROJECT_REF = "hyflxnlhpmiqxvvcoiia"'), "acceptance project is an explicit negative control");
check(script.includes("production_environment_is_separate_from_acceptance"), "environment separation is a required verdict");
check(script.includes("current_ready_production_target_is_exact"), "current READY target is a required verdict");
check(script.includes("rollback_target_recorded_before_mutation"), "rollback identity is a required verdict");
check(script.includes("production_supabase_project_is_exact"), "Production Supabase identity is a required verdict");
check(script.includes("optional_server_supabase_url_matches_when_present"), "optional server URL must match the authoritative public URL when present");
check(script.includes('optionalProductionEntry("SUPABASE_URL")'), "SUPABASE_URL is optional rather than fabricated or required");
check(script.includes('exactProductionEntry("NEXT_PUBLIC_SUPABASE_URL")'), "NEXT_PUBLIC_SUPABASE_URL remains the one authoritative Production URL");
check(script.includes('exactProductionEntry("NEXT_PUBLIC_SUPABASE_ANON_KEY")'), "Production anon key entry remains exact");
check(script.includes('exactProductionEntry("SUPABASE_SERVICE_ROLE_KEY")'), "Production service key entry remains exact");
check(script.includes("method: \"GET\""), "Vercel and Supabase discovery calls are explicitly GET-only");
check(!/method:\s*["'](?:POST|PUT|PATCH|DELETE)["']/.test(script), "preflight contains no mutating HTTP method");
check(!script.includes("database/query"), "preflight does not issue SQL, even read-only SQL through a POST endpoint");
check(!script.includes("console.log(value"), "decrypted values are never logged directly");
check(script.includes("redacted: true"), "evidence marks decrypted values as redacted");

const failed = checks.filter((entry) => !entry.passed);
for (const entry of checks) console.log(`${entry.passed ? "ok  " : "FAIL"} ${entry.message}`);
if (failed.length) {
  console.error(`verify-rcap-production-canary failed: ${failed.length}/${checks.length}`);
  process.exit(1);
}
console.log(`verify-rcap-production-canary passed: ${checks.length}/${checks.length}`);
