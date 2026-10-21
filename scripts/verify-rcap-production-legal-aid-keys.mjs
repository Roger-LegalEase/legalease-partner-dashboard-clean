#!/usr/bin/env node
// Contract for the Production Legal Aid key control: names only, create once, never overwrite, no deploy.
import fs from "node:fs";
const script = fs.readFileSync("scripts/rcap-production-legal-aid-keys.mjs", "utf8");
const dispatcher = fs.readFileSync(".github/workflows/rcap-f1-ephemeral-staging.yml", "utf8");
const checks = [];
const check = (passed, message) => checks.push({ passed, message });
check(script.includes("env?decrypt=false"), "listing never requests decrypted values");
check(script.includes("secretValuesIncluded: false"), "evidence fixes secret values to excluded");
check(script.includes("upsert=false"), "creation refuses to upsert");
check(script.includes("existing_key_is_never_overwritten"), "existing key is retained");
check(script.includes("existing_pseudonym_secret_is_never_overwritten") && script.includes("pseudonym_secret_retained_if_it_existed"), "existing participant pseudonym secret is retained, never rotated");
check(script.includes('type: "sensitive"'), "the key is stored as a sensitive (write-only) variable");
check(script.includes('target: ["production"]'), "the key targets Production only");
check(!/console\.log\([^)]*value/.test(script) && !script.includes("randomBytes(32).toString(\"base64\") ;"), "no log line carries a value");
check(!/\/v13\/deployments|\/promote\/|\/rollback\/|\/aliases/.test(script), "key control cannot deploy or move aliases");
check(!/api\.supabase\.com/.test(script), "key control touches no database");
check(dispatcher.includes("production_legal_aid_keys_read") && dispatcher.includes("production_legal_aid_keys_create"), "dispatcher exposes read and create modes");
check(dispatcher.includes("node scripts/verify-rcap-production-legal-aid-keys.mjs"), "workflow self-verifies the key contract");
const failed = checks.filter((entry) => !entry.passed);
for (const entry of checks) console.log(`${entry.passed ? "ok  " : "FAIL"} ${entry.message}`);
if (failed.length) { console.error(`verify-rcap-production-legal-aid-keys failed: ${failed.length}/${checks.length}`); process.exit(1); }
console.log(`verify-rcap-production-legal-aid-keys passed: ${checks.length}/${checks.length}`);
