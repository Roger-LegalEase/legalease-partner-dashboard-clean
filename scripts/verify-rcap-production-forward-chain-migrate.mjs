#!/usr/bin/env node
// Contract verifier for the exact Production forward-chain readback and migration phases.
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const PRODUCTION_PROJECT_REF = "wwtwtsmywnckfkdaqqeg";
const APPLICATION_SHA = "436520e4a99f0b8a290ace32f1d717b951630319";
const LEDGER_BASELINE_LAST_VERSION = "20260823171000";
const RECOVERED_REMOTE_BASELINE_VERSION = "20260728213131";
const UNLEDGERED_PREFILL_VERSION = "20260822180000";
const FIRST_FORWARD_VERSION = "20260828100000";
const EXPECTED_POSITIONS = Object.freeze([17, 18, 19, 20, 21, 22, 23, 24, 25, 26]);

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
check(script.includes(`const APPLICATION_SHA = "${APPLICATION_SHA}"`), "application SHA is exact");
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
check(script.includes("_late_apply_cannot_clobber_later_definitions"), "each late apply is guarded against clobbering a present later migration");
check(
  script.includes("executeDespiteLedgerRow") && script.includes('&& migration.signature.kind === "ledger"'),
  "a ledger row recorded without an execution can be backed by executing the file only when the authorization names the version and the signature is ledger-only"
);

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
check(script.includes("independent_production_authorization_names_the_exact_chain"), "Production apply requires the independent authorization naming the exact chain");
check(
  script.includes("existing_row_revocation_within_the_owner_accepted_bound")
    && ["maxUnexpiredUnclaimedRowsRevoked", "maxClaimedRowsWithoutProvableMatterRevoked", "maxExpiredUnclaimedRowsRevoked"].every((key) => script.includes(`"${key}"`))
    && script.includes("pending_result_existing_row_impact_read_as_counts"),
  "existing-row revocation is counted before any write and must stay within every owner-accepted maximum"
);
check(script.includes("forward_chain_complete_after_apply"), "complete forward chain is read back after apply");
check(script.includes("ledger_records_every_forward_version"), "ledger readback of every forward version is required");
check(script.includes("database/query"), "DDL and direct readback use the exact Supabase project endpoint");
check(script.includes("on conflict (version) do nothing"), "ledger rows are recorded idempotently");
check(!/api\.vercel\.com|vercel@|\/aliases|vercel promote/.test(script), "migration phase cannot deploy or move aliases");
check(!/delete\s+from|truncate\s|drop\s+(?:table|schema|database|column)/i.test(script), "control contains no destructive SQL of its own");
check(script.includes("structureDropped: false"), "evidence fixes structure drops to false");
check(script.includes("realParticipantRecordsCreated: false"), "evidence fixes real participant creation to false");
check(script.includes("realChargesCreated: false"), "evidence fixes real charges to false");
check(authorization?.status === "authorized_production_incident", "authorization record carries the Production incident status");
check(authorization?.productionProjectRef === PRODUCTION_PROJECT_REF, "authorization record names the canonical Production project");
check(authorization?.applicationSha === APPLICATION_SHA, "authorization record pins the same application SHA");
check(authorization?.dropAuthorized === false, "authorization record forbids dropping structure");
check(/^[0-9]{6,}$/.test(String(authorization?.readbackRunId ?? "")), "authorization record names the incident readback run");
check(
  Array.isArray(authorization?.migrations)
    && authorization.migrations.length === EXPECTED_POSITIONS.length
    && migrations.length === EXPECTED_POSITIONS.length
    && authorization.migrations.every((entry, index) => entry.position === migrations[index].position && entry.path === migrations[index].path && entry.sha256 === migrations[index].sha256),
  "authorization record names the exact forward chain the control applies"
);

const failed = checks.filter((entry) => !entry.passed);
for (const entry of checks) console.log(`${entry.passed ? "ok  " : "FAIL"} ${entry.message}`);
if (failed.length) { console.error(`verify-rcap-production-forward-chain-migrate failed: ${failed.length}/${checks.length}`); process.exit(1); }
console.log(`verify-rcap-production-forward-chain-migrate passed: ${checks.length}/${checks.length}`);
