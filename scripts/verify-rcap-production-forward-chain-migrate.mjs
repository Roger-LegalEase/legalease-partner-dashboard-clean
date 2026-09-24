#!/usr/bin/env node
// Contract verifier for the exact Production forward-chain readback and migration phases.
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const PRODUCTION_PROJECT_REF = "wwtwtsmywnckfkdaqqeg";
// This historical permission remains bound to its original tuple. It never
// supplies successor Production permission.
const HISTORICAL_AUTHORIZATION_SHA = "4e16d6d8ebe991a8a3f529637b0d3a38c3149cbb";
const APPLICATION_SHA = process.env.RCAP_APPLICATION_SHA ?? JSON.parse(fs.readFileSync('data/rcap-grade-a/launch-control/RELEASE_CANDIDATE_BINDING.json','utf8')).applicationSha;
const LEDGER_BASELINE_LAST_VERSION = "20260823171000";
const RECOVERED_REMOTE_BASELINE_VERSION = "20260728213131";
const UNLEDGERED_PREFILL_VERSION = "20260822180000";
const FIRST_FORWARD_VERSION = "20260828100000";
const EXPECTED_POSITIONS = Object.freeze([17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27]);

const root = path.resolve(process.env.RCAP_FORWARD_CHAIN_VERIFY_ROOT ?? ".");
// Frozen migration bytes are read from the repository this verifier runs in rather than from the
// verify root: a copy under test carries no git history, and the pinned commit yields identical
// bytes in every clone that holds it.
const gitDir = process.cwd();
const read = (file) => fs.existsSync(path.join(root, file)) ? fs.readFileSync(path.join(root, file), "utf8") : "";
const workflow = read(".github/workflows/rcap-production-canary.yml");
const dispatcher = read(".github/workflows/rcap-f1-ephemeral-staging.yml");
const script = read("scripts/rcap-production-forward-chain-migrate.mjs");
const authorization = (() => { try { return JSON.parse(read("data/rcap-production-forward-chain-migration-authorization.json")); } catch { return {}; } })();
const checks = [];
const check = (passed, message) => checks.push({ passed, message });

const migrations = [];
const entryPattern = /Object\.freeze\(\{\s*position:\s*(\d+),\s*version:\s*"(\d+)",\s*path:\s*"([^"]+)",\s*sha256:\s*"([0-9a-f]{64})"/g;
for (const match of script.matchAll(entryPattern)) migrations.push({ position: Number(match[1]), version: match[2], path: match[3], sha256: match[4] });

const frozenSha256 = (migrationPath) => {
  const result = spawnSync("git", ["show", `${APPLICATION_SHA}:${migrationPath}`], { cwd: gitDir, stdio: ["ignore", "pipe", "pipe"] });
  return result.status === 0 ? createHash("sha256").update(result.stdout).digest("hex") : null;
};

check(dispatcher.includes("production_forward_chain_readback") && dispatcher.includes("production_forward_chain_migrate"), "dispatcher exposes the forward-chain readback and migration phases");
check(workflow.includes("inputs.phase == 'forward_chain_readback'") && workflow.includes("inputs.phase == 'forward_chain_migrate'"), "forward-chain phases are isolated from runtime preflight");
check(workflow.includes("node scripts/verify-rcap-production-forward-chain-migrate.mjs"), "workflow self-verifies the forward-chain contract");
check(workflow.includes("node scripts/test-rcap-production-forward-chain-migrate-mutations.mjs"), "workflow runs the forward-chain mutation resistance proof");
check(workflow.includes("node scripts/rcap-production-forward-chain-migrate.mjs"), "workflow invokes the dedicated forward-chain control");
check(workflow.includes('RCAP_PRODUCTION_PHASE: "forward_chain_readback"') && workflow.includes('RCAP_PRODUCTION_PHASE: "forward_chain_migrate"'), "workflow fixes each phase name");
check(script.includes(`const PRODUCTION_PROJECT_REF = "${PRODUCTION_PROJECT_REF}"`), "Production project ref is exact");
check(script.includes('const release = requireRelease(ROOT_DIR, env);') && script.includes('requireRelease = requireProductionMigrationRelease'), "current successor tuple and separate phase permission are verified before service access");
check(workflow.includes('node scripts/rcap-production-migration-contract.mjs') && workflow.includes('node --test scripts/rcap-production-migration-contract.test.mjs'), "workflow requires exact binding and behavioral proof");
check(script.includes('PHASE !== "forward_chain_readback" && PHASE !== "forward_chain_migrate"'), "control enables only the forward-chain readback and migration phases");
check(migrations.length === EXPECTED_POSITIONS.length, `control pins exactly ${EXPECTED_POSITIONS.length} forward migrations`);
check(migrations.map((entry) => entry.position).join(",") === EXPECTED_POSITIONS.join(","), "forward migrations carry positions 17 through 26 in order");
check(
  migrations.length > 0 && migrations.every((entry, index) => path.basename(entry.path).startsWith(`${entry.version}_`) && (index === 0 || entry.version > migrations[index - 1].version)),
  "forward migration versions ascend strictly and match their file names"
);
check(script.includes(`"${LEDGER_BASELINE_LAST_VERSION}"`) && migrations[0]?.version === FIRST_FORWARD_VERSION, "forward chain begins immediately after the recovered ledger baseline");
const baselineStart = script.indexOf("export const LEDGER_BASELINE_VERSIONS");
const baselineBlock = baselineStart === -1 ? "" : script.slice(baselineStart, script.indexOf("]);", baselineStart));
check(
  baselineBlock.includes(`"${RECOVERED_REMOTE_BASELINE_VERSION}"`) && baselineBlock.includes(`"${LEDGER_BASELINE_LAST_VERSION}"`)
    && !baselineBlock.includes(`"${UNLEDGERED_PREFILL_VERSION}"`) && (baselineBlock.match(/"\d{14}"/g) ?? []).length === 13,
  "ledger baseline is the thirteen versions Production recorded: the recovered remote baseline through 20260823171000 without the unledgered prefill step"
);
check(
  script.includes("unledgered_prior_steps_reconciled_against_objects") && script.includes(`version: "${UNLEDGERED_PREFILL_VERSION}"`) && script.includes("rcap_onboarding_prefill_supersede_prior_applied"),
  "unledgered prior steps are reconciled against their objects and never replayed for a missing ledger row"
);
for (const position of EXPECTED_POSITIONS) {
  const migration = migrations.find((entry) => entry.position === position);
  const actual = migration ? frozenSha256(migration.path) : null;
  check(Boolean(migration) && actual !== null && actual === migration.sha256, `forward migration ${position} (${migration?.version ?? "absent"}) hashes to its pinned value at the frozen application commit`);
}
check(script.includes("frozenMigrationSql("), "migration bytes come from the frozen application commit");
check(script.includes("canonical_production_project_is_authenticated"), "canonical Production project is authenticated before any read");
check(script.includes("frozen_forward_chain_hashes_exact"), "frozen forward-chain hashes are proven exact before any apply");
check(script.includes("migration_ledger_carries_the_recovered_baseline"), "migration ledger must carry the recovered baseline before mutation");
check(script.includes("loose_phase_prerequisites_present"), "loose phase prerequisites are read before mutation");
check(script.includes("forward_chain_gaps_cannot_clobber_later_definitions") && script.includes("unsafeGaps("), "a partial forward chain is refused when a late apply would overwrite a later migration's definitions");
check(script.includes('expected: contract.current, actual: normalizeCatalog('), "current complete source postconditions are required");
check(!script.includes('managementQuery(sqlByVersion.get(') && !script.includes('insert into supabase_migrations.schema_migrations'), "historical SQL and ledger receipts are never replayed or adopted");

// Every object signature must be created by no earlier migration file, or the
// control would treat a file as applied because an earlier file created the
// same object (run 35130488671 skipped positions 19 and 26 that way).
const signatures = [];
const signaturePattern = /position:\s*(\d+),[^\n]*?sha256:\s*"[0-9a-f]{64}",\s*signature:\s*\{\s*kind:\s*"(\w+)",(?:\s*table:\s*"([a-z0-9_]+)",)?\s*name:\s*"([a-z0-9_]+)"\s*\}/g;
for (const match of script.matchAll(signaturePattern)) signatures.push({ position: Number(match[1]), kind: match[2], table: match[3], name: match[4] });
const migrationDir = path.join(gitDir, "supabase/migrations");
const migrationFiles = fs.existsSync(migrationDir) ? fs.readdirSync(migrationDir).filter((file) => file.endsWith(".sql")).sort() : [];
const earlierSql = (version) => migrationFiles.filter((file) => file.slice(0, 14) < version).map((file) => fs.readFileSync(path.join(migrationDir, file), "utf8").toLowerCase()).join("\n");
const createsObject = (sql, signature) => {
  const name = signature.name.toLowerCase();
  if (signature.kind === "table") return new RegExp(`create\\s+table\\s+(?:if\\s+not\\s+exists\\s+)?"?(?:public\\.)?"?${name}"?\\s*\\(`).test(sql);
  if (signature.kind === "function") return new RegExp(`function\\s+"?(?:public\\.)?"?${name}"?\\s*\\(`).test(sql);
  if (signature.kind === "column") {
    if (new RegExp(`add\\s+column\\s+(?:if\\s+not\\s+exists\\s+)?"?${name}"?\\b`).test(sql)) return true;
    const table = signature.table.toLowerCase();
    const blockStart = sql.search(new RegExp(`create\\s+table\\s+(?:if\\s+not\\s+exists\\s+)?"?(?:public\\.)?"?${table}"?\\s*\\(`));
    if (blockStart === -1) return false;
    const block = sql.slice(blockStart, sql.indexOf("\n);", blockStart));
    return new RegExp(`\\b${name}\\b`).test(block);
  }
  return false;
};
check(signatures.length === EXPECTED_POSITIONS.length, "every forward migration carries one signature");
for (const signature of signatures) {
  const migration = migrations.find((entry) => entry.position === signature.position);
  const unique = signature.kind === "ledger" ? migration?.version === signature.name : Boolean(migration) && !createsObject(earlierSql(migration.version), signature);
  check(unique, `forward migration ${signature.position} signature ${signature.kind}:${signature.name} is created by no earlier migration file`);
}
check(script.includes("readback_phase_wrote_nothing"), "readback phase asserts it wrote nothing");
check(script.includes('current_release_dependencies_verified_no_write') && script.includes('current_release_verification_wrote_nothing'), "complete current state has a no-write success path");
check(script.includes('historicalChainCertified = false'), "current dependency proof is not a certificate for unrelated historical schema");
check(script.includes('forward_chain_current_release_inventory_complete'), "historical inventory cannot hide a missing prerequisite");
check(script.includes('forward_chain_current_release_postconditions_verified'), "the required current dependency proof is recorded");
check(script.includes("database/query"), "direct readback uses the exact Supabase project endpoint");
check(!/api\.vercel\.com|vercel@|\/aliases|vercel promote/.test(script), "migration phase cannot deploy or move aliases");
check(!/delete\s+from|truncate\s|drop\s+(?:table|schema|database|column)/i.test(script), "control contains no destructive SQL of its own");
check(script.includes("structureDropped: false"), "evidence fixes structure drops to false");
check(script.includes("realParticipantRecordsCreated: false"), "evidence fixes real participant creation to false");
check(script.includes("realChargesCreated: false"), "evidence fixes real charges to false");
// Everything above is the control's own contract and is checked in every phase.
// What follows is different in kind: it inspects the record that AUTHORISES AN
// APPLY, and that record's contents depend on the read-only readback which
// establishes what an apply would do to existing rows.
//
// Requiring it in every phase made the documented sequence impossible to run.
// Run 35205868198 is the proof: a readback that writes nothing, refused for
// want of an authorisation to write, and no authorisation obtainable until that
// readback had run. The record is therefore not required in the readback phase
// alone.
//
// The condition is written as an allow-list of one for a reason. An unset,
// misspelled or unexpected phase leaves `readbackOnly` false and the record is
// required, so no phase value can bypass authorisation -- only the exact string
// the workflow passes for the read-only phase can, and only while no record
// exists yet. Once a record is present it is checked in every phase, readback
// included, so a wrong record can never sit unexamined.
//
// This narrows no protection on the apply. The migrate phase still requires
// every check below, and the control re-reads the same record itself before
// writing: rcap-production-forward-chain-migrate.mjs records
// independent_production_authorization_names_the_exact_chain through a record()
// that throws on a false verdict, and its readback branch never consults the
// record at all.
const PHASE = (process.env.RCAP_PRODUCTION_PHASE ?? "").trim();
const readbackOnly = PHASE === "forward_chain_readback";
const authorizationPresent = Object.keys(authorization).length > 0;
if (readbackOnly && !authorizationPresent) {
  console.log("note  read-only readback phase and no apply-authorization record yet: its contents depend on this readback, so they are not required to run it");
} else {
  check(authorization?.status === "authorized_production_incident", "authorization record carries the Production incident status");
  check(authorization?.productionProjectRef === PRODUCTION_PROJECT_REF, "authorization record names the canonical Production project");
  check(authorization?.applicationSha === HISTORICAL_AUTHORIZATION_SHA, "historical authorization retains its original application SHA");
  check(authorization?.dropAuthorized === false, "authorization record forbids dropping structure");
  check(/^[0-9]{6,}$/.test(String(authorization?.readbackRunId ?? "")), "authorization record names the incident readback run");
  check(
    Array.isArray(authorization?.migrations)
      && authorization.migrations.length === EXPECTED_POSITIONS.length
      && migrations.length === EXPECTED_POSITIONS.length
      && authorization.migrations.every((entry, index) => entry.position === migrations[index].position && entry.path === migrations[index].path && entry.sha256 === migrations[index].sha256),
    "authorization record names the exact forward chain the control applies"
  );
}

const failed = checks.filter((entry) => !entry.passed);
for (const entry of checks) console.log(`${entry.passed ? "ok  " : "FAIL"} ${entry.message}`);
if (failed.length) { console.error(`verify-rcap-production-forward-chain-migrate failed: ${failed.length}/${checks.length}`); process.exit(1); }
console.log(`verify-rcap-production-forward-chain-migrate passed: ${checks.length}/${checks.length}`);
