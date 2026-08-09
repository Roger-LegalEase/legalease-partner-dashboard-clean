// The one entry point for RCAP partner onboarding verification.
//
// Before this, 24 onboarding verifiers existed and 11 ran anywhere. The rest were orphaned:
// no gate owned them, two were broken and could not have passed if they had been wired in,
// and nothing recorded which gate was supposed to run which. This registry is the answer to
// "who owns this verifier", and it fails if a new onboarding verifier appears without being
// classified.
//
// Groups:
//   local     deterministic, no credentials, no network. Runs in npm test and CI.
//   database  needs a reachable Supabase with the onboarding schema applied.
//   browser   drives a running application.
//   staging   hosted acceptance, release gate only.
//
// Usage:
//   node scripts/verify-onboarding-all.mjs             run the local group (default)
//   node scripts/verify-onboarding-all.mjs --group=database
//   node scripts/verify-onboarding-all.mjs --list      print the registry and exit

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/**
 * Every onboarding verifier, and the gate that owns it. Keep this list exhaustive: the
 * coverage check at the bottom fails when a matching script exists but is absent here.
 */
const REGISTRY = [
  // --- local: deterministic, credential-free -------------------------------------------
  { file: "verify-rcap-partner-onboarding.mjs", group: "local" },
  { file: "verify-rcap-partner-onboarding-domain.mjs", group: "local" },
  { file: "verify-rcap-partner-onboarding-service.mjs", group: "local" },
  { file: "verify-rcap-partner-onboarding-security.mjs", group: "local" },
  { file: "verify-rcap-partner-onboarding-ui.mjs", group: "local" },
  { file: "verify-rcap-partner-onboarding-phase1-database.mjs", group: "local",
    note: "named database but asserts the committed SQL, not a live connection" },
  { file: "verify-rcap-onboarding-artifact-domain.mjs", group: "local" },
  { file: "verify-rcap-onboarding-artifact-security.mjs", group: "local" },
  { file: "verify-rcap-onboarding-artifact-database.mjs", group: "local",
    note: "asserts committed SQL, not a live connection" },
  { file: "verify-rcap-onboarding-registry-extension.mjs", group: "local" },
  { file: "verify-rcap-onboarding-document-generators.mjs", group: "local" },
  { file: "verify-rcap-onboarding-page-configuration.mjs", group: "local" },
  { file: "verify-rcap-onboarding-launch-readiness.mjs", group: "local" },
  { file: "verify-rcap-onboarding-launch-kit.mjs", group: "local" },
  { file: "verify-rcap-onboarding-launch-database.mjs", group: "local",
    note: "asserts committed SQL, not a live connection" },
  { file: "verify-rcap-onboarding-prefill-domain.mjs", group: "local" },
  { file: "verify-rcap-onboarding-prefill-service.mjs", group: "local" },
  { file: "verify-rcap-onboarding-prefill-security.mjs", group: "local" },
  { file: "verify-rcap-onboarding-prefill-ui.mjs", group: "local" },
  { file: "verify-rcap-onboarding-partner-labels.mjs", group: "local" },
  { file: "verify-rcap-onboarding-support-contact.mjs", group: "local" },
  { file: "verify-first-admin-provisioning.mjs", group: "local" },
  { file: "verify-launch-readiness.mjs", group: "local" },

  // --- database: needs a reachable Supabase --------------------------------------------
  { file: "verify-onboarding-persistence.mjs", group: "database",
    note: "requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY" },
  { file: "test-first-admin-supabase-lifecycle.mjs", group: "database",
    note: "invitation lifecycle against a live schema" },

  // --- staging: hosted acceptance, release gate only ------------------------------------
  { file: "capture-first-admin-acceptance.mjs", group: "staging",
    note: "capture harness; hosted acceptance evidence" },
  { file: "capture-onboarding-launch-readiness-acceptance.mjs", group: "staging" },
  { file: "capture-onboarding-page-documents-acceptance.mjs", group: "staging" }
];

const args = process.argv.slice(2);
const listOnly = args.includes("--list");
const groupArg = args.find((a) => a.startsWith("--group="));
const group = groupArg ? groupArg.slice("--group=".length) : "local";

if (listOnly) {
  const byGroup = new Map();
  for (const entry of REGISTRY) {
    if (!byGroup.has(entry.group)) byGroup.set(entry.group, []);
    byGroup.get(entry.group).push(entry);
  }
  for (const [name, entries] of byGroup) {
    console.log(`\n${name} (${entries.length})`);
    for (const e of entries) {
      console.log(`  ${e.file}${e.note ? `  — ${e.note}` : ""}`);
    }
  }
  process.exit(0);
}

// A verifier that exists but is in no group is exactly the problem this file was written to
// end, so an unclassified script is a hard failure rather than a warning.
const registered = new Set(REGISTRY.map((e) => e.file));
const onDisk = fs
  .readdirSync(path.join(rootDir, "scripts"))
  .filter(
    (f) =>
      f !== "verify-onboarding-all.mjs" &&
      /^(verify|test|capture)-.*(onboarding|first-admin|launch-readiness|partner-labels|support-contact).*\.mjs$/.test(f)
  );
const unclassified = onDisk.filter((f) => !registered.has(f));
if (unclassified.length) {
  console.error("Onboarding verifiers exist that no gate owns:");
  for (const f of unclassified) console.error(`  - ${f}`);
  console.error("\nAdd each to REGISTRY in scripts/verify-onboarding-all.mjs with its group.");
  process.exit(1);
}

const missing = REGISTRY.filter(
  (e) => !fs.existsSync(path.join(rootDir, "scripts", e.file))
);
if (missing.length) {
  console.error("Registry names verifiers that do not exist:");
  for (const e of missing) console.error(`  - ${e.file}`);
  process.exit(1);
}

const selected = REGISTRY.filter((e) => e.group === group);
if (!selected.length) {
  console.error(`No verifiers in group "${group}". Known groups: local, database, staging.`);
  process.exit(1);
}

console.log(`RCAP onboarding verification — group "${group}" (${selected.length} verifiers)\n`);

const failures = [];
for (const entry of selected) {
  const started = process.hrtime.bigint();
  const result = spawnSync(process.execPath, [path.join(rootDir, "scripts", entry.file)], {
    cwd: rootDir,
    encoding: "utf8"
  });
  const ms = Number((process.hrtime.bigint() - started) / 1000000n);
  const ok = result.status === 0;
  console.log(`  ${ok ? "ok  " : "FAIL"}  ${entry.file}  (${ms}ms)`);
  if (!ok) {
    failures.push({ file: entry.file, output: `${result.stdout ?? ""}${result.stderr ?? ""}` });
  }
}

if (failures.length) {
  console.error(`\n${failures.length} of ${selected.length} onboarding verifiers failed.\n`);
  for (const f of failures) {
    console.error(`--- ${f.file} ---`);
    console.error(f.output.trim().split("\n").slice(-25).join("\n"));
    console.error("");
  }
  process.exit(1);
}

console.log(`\nAll ${selected.length} onboarding verifiers in group "${group}" passed.`);
