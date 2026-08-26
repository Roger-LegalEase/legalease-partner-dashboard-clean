#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.env.RCAP_RECLASSIFY_VERIFY_ROOT ?? ".");
const checks = [];
const check = (passed, message) => checks.push({ passed: Boolean(passed), message });
const read = (file) => {
  try { return fs.readFileSync(path.join(root, file), "utf8"); }
  catch { return ""; }
};

const dispatcher = read(".github/workflows/rcap-f1-ephemeral-staging.yml");
const workflow = read(".github/workflows/rcap-production-url-reclassify.yml");
const script = read("scripts/rcap-production-url-reclassify.mjs");

check(dispatcher.includes("production_url_reclassify"), "dispatcher exposes only the isolated Production URL reclassification mode");
check(workflow.includes("RCAP Production public URL one-key reclassification"), "dedicated one-key workflow exists");
check(workflow.includes("node scripts/verify-rcap-production-url-reclassify.mjs"), "workflow self-verifies the mutation contract");
check(workflow.includes("node scripts/test-rcap-production-url-reclassify-mutations.mjs"), "workflow runs mutation resistance proof");
check(workflow.includes("node scripts/rcap-production-url-reclassify.mjs"), "workflow invokes only the dedicated reclassification control");
check(!workflow.includes("npm test") && !workflow.includes("npm ci"), "workflow does not run the repository test battery");
check(!workflow.includes("docker pull") && !workflow.includes("vercel deploy"), "workflow cannot pull a worker or deploy the application");

for (const exact of [
  'const TEAM_SLUG = "roger947s-projects"',
  'const PROJECT_NAME = "legalease-partner-dashboard-clean"',
  'const KEY = "NEXT_PUBLIC_SUPABASE_URL"',
  'const PRODUCTION_PROJECT_REF = "wwtwtsmywnckfkdaqqeg"',
  'const ACCEPTANCE_PROJECT_REF = "hyflxnlhpmiqxvvcoiia"'
]) check(script.includes(exact), `control pins ${exact.split(" = ")[0].replace("const ", "")}`);

check(script.includes('const PUBLIC_ROUTES = ["/sign-in", "/expungement-ai/sign-in"]'), "candidate comes from routes that initialize the browser Supabase client");
check(script.includes('startsWith("/_next/static/")'), "only same-origin Next static chunks may be inspected");
check(script.includes("candidateOrigins.size !== 1"), "zero or multiple captured origins fail closed");
check(script.includes("candidateValues.size !== 1"), "the exact deployed byte representation must be unique");
check(script.includes("candidateValues.add(match[1])"), "the deployed literal is preserved byte-for-byte rather than reconstructed");
check(script.includes("/v1/projects/${encodeURIComponent(PRODUCTION_PROJECT_REF)}"), "authenticated Supabase project identity is checked directly");
check(script.includes("custom-hostname") && script.includes("vanity-subdomain"), "custom and vanity hostnames require authenticated management proof");
check(script.includes('sensitiveEnvironmentVariablePolicy === "on"'), "forced-sensitive team policy is checked before mutation");
check(script.includes('currentEntry.type === "sensitive"'), "current exact Production entry must be sensitive");
check(script.includes("const productionBearingEntries = keyEntries.filter"), "scope correction starts from exactly one Production-bearing entry");
check(script.includes("function sharedTargetsAreExact(entry)"), "precondition requires exactly one shared Preview+Production entry");
check(script.includes("active_environment_operation_detected"), "active deployment, promotion, or alias work fails before deletion");
check(script.includes("createHash(\"sha256\")"), "exact recovered value is compared through an in-memory SHA-256 digest");
check(script.includes('const previewBody = {') && script.includes('type: "sensitive",\n    target: ["preview"]'), "Preview replacement is Sensitive, unbranched, and Preview-only");
check(script.includes('const productionBody = {') && script.includes('type: "encrypted",\n    target: ["production"]'), "Production replacement is readable, unbranched, and Production-only");
const previewCreateIndex = script.indexOf("body: previewBody");
const productionCreateIndex = script.indexOf("body: productionBody");
check(previewCreateIndex >= 0 && productionCreateIndex >= 0 && previewCreateIndex < productionCreateIndex, "Preview entry is created before Production entry");
check(script.includes("async function rollbackAtomicSplit"), "any partial split or verification failure restores the original shared entry");
check(script.includes("!initialEnvironmentIds.has(entry.id)"), "rollback deletes only transaction-created entry ids absent from the initial snapshot");
check(script.includes("rollback_original_state_verified"), "rollback verifies the exact original shared state");
check(script.includes("const developmentEntriesUnchanged ="), "Development-only entry metadata is explicitly preserved");
check(script.includes('method: "DELETE"'), "only the exact existing entry is removed");
check(script.includes('type: "encrypted"'), "replacement is created as readable non-sensitive encrypted-at-rest type");
check(script.includes('type: "encrypted",\n    target: ["production"]'), "replacement is scoped only to Production");
check(script.includes("exactValuePreserved"), "post-write readback requires byte-for-byte value preservation");
check(script.includes("otherVariablesChanged"), "all non-target environment metadata is compared before and after");
check(script.includes("deploymentTriggered"), "deployment identity is compared before and after");
check(script.includes("productionDatabaseMutated: false"), "evidence explicitly records no Production database mutation");
check(script.includes("valuePersisted: false") && script.includes("valuePrinted: false"), "evidence records that the recovered value is neither persisted nor printed");
check(!script.includes("console.log(candidate") && !script.includes("console.error(candidate"), "captured value is never logged");
check(!script.includes("database/query") && !/fetch\([^)]*supabase[^)]*,\s*\{[^}]*method:\s*["'](?:POST|PUT|PATCH|DELETE)/s.test(script), "Supabase control-plane use remains GET-only");
check(!/deployments[^\n]*method:\s*["'](?:POST|PUT|PATCH|DELETE)/s.test(script), "deployment control-plane calls remain GET-only");

const failed = checks.filter((entry) => !entry.passed);
for (const entry of checks) console.log(`${entry.passed ? "ok  " : "FAIL"} ${entry.message}`);
if (failed.length) {
  console.error(`verify-rcap-production-url-reclassify failed: ${failed.length}/${checks.length}`);
  process.exit(1);
}
console.log(`verify-rcap-production-url-reclassify passed: ${checks.length}/${checks.length}`);
