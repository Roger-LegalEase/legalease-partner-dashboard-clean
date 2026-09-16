#!/usr/bin/env node
// Exact Production Legal Aid Clinic Mode schema apply and direct readback.
//
// Two phases. `legal_aid_readback` is read-only: it proves the canonical
// Production project, reads the Clinic Mode prerequisites and the current
// Legal Aid state, and writes nothing. `legal_aid_migrate` applies the one
// frozen, hash-pinned migration file only when the Legal Aid schema is
// entirely absent and the independent Production authorization record names
// the passing hosted acceptance run; a partial pre-existing schema is refused.
// No ledger, fixture, participant, checkout, deployment, alias, or worker
// action is performed. Nothing is ever dropped.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { LEGAL_AID_MIGRATION, LEGAL_AID_TABLES, LEGAL_AID_FUNCTIONS, PRODUCTION_PROJECT_REF, frozenMigrationSql, readbackQuery, summarizeReadback } from "./rcap-legal-aid/contract.mjs";

const APPLICATION_SHA = "f5c4f40022e422033985302995511da7157f474d";
const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const AUTHORIZATION_PATH = "data/rcap-production-legal-aid-migration-authorization.json";
const PHASE = (process.env.RCAP_PRODUCTION_PHASE ?? "").trim();
const INPUT_APPLICATION_SHA = (process.env.RCAP_APPLICATION_SHA ?? "").trim();
const INPUT_PROJECT_REF = (process.env.RCAP_PRODUCTION_PROJECT_REF ?? "").trim();
const SUPABASE_ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN ?? "";
const EVIDENCE_DIR = path.resolve(process.env.RCAP_PRODUCTION_EVIDENCE_DIR ?? "production-canary-evidence");
const EVIDENCE_FILE = path.join(EVIDENCE_DIR, `production-${PHASE || "legal-aid"}.json`);

fs.mkdirSync(EVIDENCE_DIR, { recursive: true });

const verdicts = [];
const evidence = {
  schemaVersion: "rcap-production-legal-aid-migrate/v1",
  phase: PHASE,
  startedAt: new Date().toISOString(),
  applicationSha: APPLICATION_SHA,
  productionProjectRef: PRODUCTION_PROJECT_REF,
  exactMigration: { ...LEGAL_AID_MIGRATION },
  migrationApplied: false,
  migrationDisposition: null,
  productionDatabaseMutated: false,
  realParticipantRecordsCreated: false,
  realChargesCreated: false,
  deploymentTriggered: false,
  aliasChanged: false,
  environmentVariableChanged: false,
  applicationChanged: false,
  workerChanged: false,
  structureDropped: false,
  readback: null,
  verdicts
};

function record(caseId, passed, observed) {
  verdicts.push({ caseId, passed, observed });
  console.log(`  ${passed ? "ok  " : "FAIL"} ${caseId} — ${observed}`);
  if (!passed) throw new Error(caseId);
}

function persist(passed, failure = null) {
  evidence.finishedAt = new Date().toISOString();
  evidence.passed = passed;
  evidence.failure = failure;
  fs.writeFileSync(EVIDENCE_FILE, `${JSON.stringify(evidence, null, 2)}\n`);
}

function parseJson(text) { try { return JSON.parse(text); } catch { return null; } }

async function managementGet(pathname) {
  const response = await fetch(`https://api.supabase.com${pathname}`, { method: "GET", headers: { Authorization: `Bearer ${SUPABASE_ACCESS_TOKEN}` } });
  return { status: response.status, json: parseJson(await response.text()) };
}

async function managementQuery(query, caseId) {
  const response = await fetch(`https://api.supabase.com/v1/projects/${PRODUCTION_PROJECT_REF}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${SUPABASE_ACCESS_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query })
  });
  const text = await response.text();
  const json = parseJson(text);
  if (!response.ok) throw new Error(`${caseId}: HTTP ${response.status}: ${String(json?.message ?? "database query failed").slice(0, 240)}`);
  return json;
}

async function readback(caseId) {
  const rows = await managementQuery(readbackQuery(), caseId);
  return summarizeReadback(Array.isArray(rows) ? rows[0] ?? {} : {});
}

try {
  if (PHASE !== "legal_aid_readback" && PHASE !== "legal_aid_migrate") throw new Error("only the Legal Aid readback and migration phases are enabled");
  if (INPUT_APPLICATION_SHA !== APPLICATION_SHA || INPUT_PROJECT_REF !== PRODUCTION_PROJECT_REF || !SUPABASE_ACCESS_TOKEN) {
    throw new Error("exact Production Legal Aid inputs are unavailable");
  }

  const project = await managementGet(`/v1/projects/${encodeURIComponent(PRODUCTION_PROJECT_REF)}`);
  record(
    "canonical_production_project_is_authenticated",
    project.status === 200 && (project.json?.ref ?? project.json?.id) === PRODUCTION_PROJECT_REF,
    `authenticated project ref=${project.json?.ref ?? project.json?.id ?? "unresolved"}`
  );

  const sql = frozenMigrationSql(ROOT_DIR, APPLICATION_SHA);
  record("frozen_legal_aid_migration_hash_exact", sql.length > 0, `${LEGAL_AID_MIGRATION.path} at ${APPLICATION_SHA} hashes to the authorized ${LEGAL_AID_MIGRATION.sha256}`);

  const before = await readback("clinic_mode_prerequisites_readback");
  record(
    "clinic_mode_prerequisites_read_back_exact",
    before.prerequisitesExact,
    `clinic tables=${before.prerequisites.clinicTableCount}/10; baseline tables=${before.prerequisites.baselineTableCount}/4; clinic functions=${before.prerequisites.clinicFunctionCount}/4; jurisdiction column=${before.prerequisites.jurisdictionColumnPresent}; storage catalog=${before.prerequisites.storageCatalogPresent}`
  );
  record(
    "legal_aid_schema_initial_state_is_empty_or_complete",
    before.empty || before.complete,
    `empty=${before.empty}; complete=${before.complete}; tables=${before.legalAid.tableCount}/${LEGAL_AID_TABLES.length}; functions=${before.legalAid.functionCount}/${LEGAL_AID_FUNCTIONS.length}`
  );

  if (PHASE === "legal_aid_readback") {
    evidence.readback = { before };
    evidence.migrationDisposition = before.complete ? "already_present_read_only" : "absent_read_only";
    record("readback_phase_wrote_nothing", evidence.productionDatabaseMutated === false, "read-only phase; no SQL other than catalog reads was issued");
    persist(true);
    console.log("PRODUCTION LEGAL AID READBACK PASS — prerequisites and current state recorded without any write");
  } else {
    const authorization = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, AUTHORIZATION_PATH), "utf8"));
    const authorized = authorization?.status === "authorized_after_hosted_acceptance"
      && authorization?.productionProjectRef === PRODUCTION_PROJECT_REF
      && authorization?.migration?.path === LEGAL_AID_MIGRATION.path
      && authorization?.migration?.sha256 === LEGAL_AID_MIGRATION.sha256
      && authorization?.migration?.sourceSha === LEGAL_AID_MIGRATION.sourceSha
      && /^[0-9]{6,}$/.test(String(authorization?.hostedAcceptance?.legalAidMigrateRunId ?? ""))
      && /^[0-9]{6,}$/.test(String(authorization?.hostedAcceptance?.browserRunId ?? ""))
      && authorization?.dropAuthorized === false;
    record(
      "independent_production_authorization_names_passing_acceptance",
      authorized,
      `status=${authorization?.status}; acceptance migrate run=${authorization?.hostedAcceptance?.legalAidMigrateRunId ?? "none"}; acceptance browser run=${authorization?.hostedAcceptance?.browserRunId ?? "none"}; drop authorized=${authorization?.dropAuthorized}`
    );
    if (before.empty) {
      await managementQuery(sql, "legal_aid_migration_applied");
      evidence.migrationApplied = true;
      evidence.productionDatabaseMutated = true;
      evidence.migrationDisposition = "applied_exact_frozen_file";
    } else {
      evidence.migrationDisposition = "preexisting_complete_structural_readback";
    }
    record("legal_aid_migration_applied_or_already_exact", evidence.migrationApplied || before.complete, evidence.migrationDisposition);
    const after = await readback("legal_aid_catalog_direct_readback");
    record("all_12_legal_aid_tables_exist_with_rls_enabled", after.legalAid.tableCount === LEGAL_AID_TABLES.length && after.legalAid.rlsTableCount === LEGAL_AID_TABLES.length, `tables=${after.legalAid.tableCount}/${LEGAL_AID_TABLES.length}; RLS=${after.legalAid.rlsTableCount}/${LEGAL_AID_TABLES.length}`);
    record("all_32_legal_aid_functions_exist", after.legalAid.functionCount === LEGAL_AID_FUNCTIONS.length, `functions=${after.legalAid.functionCount}/${LEGAL_AID_FUNCTIONS.length}`);
    record("private_bucket_and_grants_read_back_tight", after.legalAid.bucketCount === 1 && after.legalAid.bucketPrivate && after.legalAid.noBrowserWrites && after.legalAid.restrictedFieldsUnreadableByBrowser && after.legalAid.restrictedFieldsPolicyless && after.legalAid.serviceOnlyGrantsTight, `bucket=${after.legalAid.bucketCount} private=${after.legalAid.bucketPrivate}; service-only grants tight=${after.legalAid.serviceOnlyGrantsTight}`);
    record("legal_aid_schema_complete_after_apply", after.complete, `complete=${after.complete}`);
    evidence.readback = { before, after };
    persist(true);
    console.log("PRODUCTION LEGAL AID MIGRATE PASS — exact frozen Legal Aid migration and direct readback are complete");
  }
} catch (error) {
  const failure = error instanceof Error ? error.message : String(error);
  persist(false, failure);
  console.error(`PRODUCTION LEGAL AID ${PHASE === "legal_aid_readback" ? "READBACK" : "MIGRATE"} REFUSED — ${failure}`);
  process.exit(1);
}
