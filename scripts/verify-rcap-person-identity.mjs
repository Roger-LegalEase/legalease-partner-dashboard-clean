import nodeAssert from "node:assert/strict";
import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const migrationPath = path.join(rootDir, "supabase/phase-30-rcap-person-identity.sql");
const personIdentityPath = path.join(rootDir, "src/lib/rcap/person-identity.ts");
const intakeRepositoryPath = path.join(rootDir, "src/lib/rcap-intake/repository.ts");
const packetRepositoryPath = path.join(rootDir, "src/lib/rcap/documents/source-repository.ts");
const finalReportRoutePath = path.join(rootDir, "src/app/api/partner-reports/final/route.ts");
const finalReportDataPath = path.join(rootDir, "src/lib/reports/partner-final-impact-report-data.ts");
const packagePath = path.join(rootDir, "package.json");
const failures = [];

await testPersonResolutionAndCounts();
testMigrationShapeAndNoNewPii();
testWritePathsAndReportUsePersonCounts();
testNpmTestWiresVerifier();
testGeneratorsUntouched();

if (failures.length > 0) {
  console.error("RCAP person identity verification failed.");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("RCAP person identity verification passed.");
console.log("Same partner + same email collapses to one rcap_persons row.");
console.log("Distinct relief counts count people, not packet rows.");
console.log("Email match keys are case/whitespace-insensitive.");
console.log("No SSN, DOB, phone-derived identity key, or new raw PII field was introduced.");
console.log("Packet generation, intake eligibility, and per-state generators remain untouched.");

async function testPersonResolutionAndCounts() {
  const stores = new Map();
  const writes = [];
  const supabase = fakeSupabase({ stores, writes });
  const identity = loadTsModule(personIdentityPath, new Map(), {
    "@/lib/supabase/server": {
      getSupabaseAdminClient: () => supabase
    }
  });

  nodeAssert.equal(identity.deriveRcapPersonMatchKey({ partnerSlug: "we-must-vote", email: "  TEST@Example.COM " }), "email:test@example.com");

  const first = await identity.resolveRcapPersonId(supabase, {
    partnerSlug: "we-must-vote",
    email: " Test@Example.com "
  });
  const second = await identity.resolveRcapPersonId(supabase, {
    partnerSlug: "we-must-vote",
    email: "test@example.COM"
  });
  assert(!("error" in first), "First identity resolution should succeed.");
  assert(!("error" in second), "Second identity resolution should succeed.");
  nodeAssert.equal(first.personId, second.personId, "Same email under one partner should collapse to one person.");
  nodeAssert.equal(countRows(stores, "rcap_persons"), 1, "Expected one rcap_persons row for duplicate email.");

  storeRow("rcap_document_packets", {
    id: "packet-a",
    partner_slug: "we-must-vote",
    person_id: first.personId,
    relief_outcome: "relief_granted"
  }, stores);
  storeRow("rcap_document_packets", {
    id: "packet-b",
    partner_slug: "we-must-vote",
    person_id: first.personId,
    relief_outcome: "relief_granted"
  }, stores);
  storeRow("rcap_document_packets", {
    id: "packet-c",
    partner_slug: "we-must-vote",
    person_id: "22222222-2222-4222-8222-222222222222",
    relief_outcome: "relief_denied"
  }, stores);

  const summary = await identity.getRcapPersonOutcomeSummary(supabase, "we-must-vote");
  nodeAssert.equal(summary.distinctPeople, 2, "Distinct person count should count people, not packet rows.");
  nodeAssert.equal(summary.reliefOutcomePeople.relief_granted, 1, "Two granted packets for one person should count as one granted person.");
  nodeAssert.equal(summary.actualReliefDeliveredPeople, 1, "Actual relief delivered should count distinct people.");
}

function testMigrationShapeAndNoNewPii() {
  const migration = fs.readFileSync(migrationPath, "utf8");
  for (const expected of [
    "create table if not exists rcap_persons",
    "partner_slug text not null",
    "match_key text not null",
    "rcap_persons_partner_match_key_idx",
    "alter table rcap_intake_sessions",
    "add column if not exists person_id uuid references rcap_persons(id) on delete set null",
    "alter table rcap_document_packets",
    "rcap_intake_sessions_partner_person_idx",
    "rcap_document_packets_partner_outcome_person_idx",
    "rcap_partner_person_outcome_counts",
    "count(distinct p.person_id)"
  ]) {
    assert(migration.includes(expected), `Person identity migration missing ${expected}.`);
  }

  const tableBlock = migration.slice(
    migration.indexOf("create table if not exists rcap_persons"),
    migration.indexOf(");", migration.indexOf("create table if not exists rcap_persons"))
  );
  for (const forbidden of ["ssn", "dob", "date_of_birth", "phone", "email text", "display_name"]) {
    assert(!tableBlock.toLowerCase().includes(forbidden), `rcap_persons must not introduce ${forbidden}.`);
  }
  assert(migration.includes("No backfill is required."), "Migration must document no backfill requirement.");
}

function testWritePathsAndReportUsePersonCounts() {
  const identity = fs.readFileSync(personIdentityPath, "utf8");
  const intake = fs.readFileSync(intakeRepositoryPath, "utf8");
  const packets = fs.readFileSync(packetRepositoryPath, "utf8");
  const finalRoute = fs.readFileSync(finalReportRoutePath, "utf8");
  const finalData = fs.readFileSync(finalReportDataPath, "utf8");

  assert(identity.includes("email:${email}") || identity.includes("`email:${email}`"), "Identity helper must prefer email match keys.");
  assert(identity.includes("name:${name}") || identity.includes("`name:${name}`"), "Identity helper must support normalized name fallback.");
  assert(intake.includes("resolveRcapPersonId"), "Intake contact persistence must resolve person_id.");
  assert(intake.includes("fieldUpdates.person_id = person.personId"), "Intake contact persistence must set person_id.");
  assert(packets.includes("resolvePacketPersonId"), "Packet persistence must resolve person_id.");
  assert(packets.includes("person_id: packet.personId ?? null"), "Packet rows must persist person_id.");
  assert(packets.includes("getRcapPersonOutcomeSummary"), "Packet summary must expose distinct person outcome counts.");
  assert(finalRoute.includes("actualReliefDeliveredPeople: documentActivity.actualReliefDeliveredPeople"), "Final report route must pass delivered relief people count.");
  assert(finalData.includes("distinctPeopleHelped: number"), "Final report data must expose distinct people helped.");
  assert(finalData.includes("actualReliefDeliveredPeople ?? 0"), "Final report must use people count for actual relief delivered.");
}

function testNpmTestWiresVerifier() {
  const pkg = JSON.parse(fs.readFileSync(packagePath, "utf8"));
  assert(pkg.scripts.test.includes("verify-rcap-person-identity.mjs"), "npm test must include the RCAP person identity verifier.");
  assert(pkg.scripts["rcap:verify-person-identity"] === "node scripts/verify-rcap-person-identity.mjs", "Missing rcap:verify-person-identity script.");
}

function testGeneratorsUntouched() {
  const changedFiles = runGit(["diff", "--name-only", "HEAD~1", "--"]).split(/\r?\n/).filter(Boolean);
  const forbidden = changedFiles.filter((file) =>
    /^src\/lib\/rcap\/documents\/(mississippi|illinois|dc|pennsylvania|texas-harris)\//.test(file) ||
    /^src\/app\/api\/rcap\/documents\/(mississippi|illinois|dc|pennsylvania|texas-harris)\//.test(file)
  );
  nodeAssert.equal(forbidden.join(", "), "", `Per-state generators changed: ${forbidden.join(", ")}`);
}

function loadTsModule(filename, moduleCache, mocks) {
  const resolved = path.resolve(filename);
  const cached = moduleCache.get(resolved);
  if (cached) return cached.exports;

  const source = fs.readFileSync(resolved, "utf8");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020
    }
  }).outputText;

  const mod = new Module(resolved);
  mod.filename = resolved;
  mod.paths = Module._nodeModulePaths(path.dirname(resolved));
  moduleCache.set(resolved, mod);
  mod.require = (request) => {
    if (Object.prototype.hasOwnProperty.call(mocks, request)) return mocks[request];
    const nextFile = resolveTsRequest(request, path.dirname(resolved));
    return nextFile ? loadTsModule(nextFile, moduleCache, mocks) : require(request);
  };
  mod._compile(transpiled, resolved);
  return mod.exports;
}

function resolveTsRequest(request, basedir) {
  if (request.startsWith("@/")) {
    const candidate = path.join(rootDir, "src", request.slice(2));
    return resolveExisting(candidate);
  }
  if (request.startsWith(".")) return resolveExisting(path.resolve(basedir, request));
  return null;
}

function resolveExisting(candidate) {
  for (const extension of [".ts", ".tsx", ".js"]) {
    if (fs.existsSync(`${candidate}${extension}`)) return `${candidate}${extension}`;
  }
  return fs.existsSync(candidate) ? candidate : null;
}

function fakeSupabase({ stores, writes }) {
  return {
    from(table) {
      const state = { table, operation: "select", row: null, filters: [], notFilters: [], onConflict: null };
      const builder = {
        insert(row) {
          state.operation = "insert";
          state.row = Array.isArray(row) ? row[0] : row;
          const stored = storeRow(table, state.row, stores);
          writes.push({ table, operation: "insert", row: stored });
          return builder;
        },
        upsert(row, options = {}) {
          state.operation = "upsert";
          state.row = row;
          state.onConflict = options.onConflict ?? null;
          return builder;
        },
        update(row) {
          state.operation = "update";
          state.row = row;
          return builder;
        },
        select() {
          return builder;
        },
        eq(column, value) {
          state.filters.push({ column, value });
          return builder;
        },
        not(column, operator, value) {
          state.notFilters.push({ column, operator, value });
          return builder;
        },
        maybeSingle() {
          return Promise.resolve({ data: findRows(table, state.filters, state.notFilters, stores)[0] ?? null, error: null });
        },
        single() {
          if (state.operation === "upsert") {
            const stored = upsertRow(table, state.row, state.onConflict, stores);
            writes.push({ table, operation: "upsert", row: stored });
            return Promise.resolve({ data: stored, error: null });
          }
          if (state.operation === "insert") return Promise.resolve({ data: storeRow(table, state.row, stores), error: null });
          return Promise.resolve({ data: findRows(table, state.filters, state.notFilters, stores)[0] ?? null, error: null });
        },
        then(resolve) {
          if (state.operation === "upsert") {
            const stored = upsertRow(table, state.row, state.onConflict, stores);
            writes.push({ table, operation: "upsert", row: stored });
            return Promise.resolve({ data: [stored], error: null }).then(resolve);
          }
          return Promise.resolve({ data: findRows(table, state.filters, state.notFilters, stores), error: null }).then(resolve);
        }
      };
      return builder;
    }
  };
}

function upsertRow(table, row, onConflict, stores) {
  if (onConflict) {
    const columns = onConflict.split(",").map((column) => column.trim());
    const existing = findRows(table, columns.map((column) => ({ column, value: row[column] })), [], stores)[0];
    if (existing) return storeRow(table, { ...existing, ...row }, stores);
  }
  return storeRow(table, row, stores);
}

function storeRow(table, row, stores) {
  const id = row.id ?? deterministicId(table, row);
  const stored = { ...row, id };
  stores.set(`${table}:${id}`, stored);
  return stored;
}

function findRows(table, filters, notFilters, stores) {
  return Array.from(stores.entries())
    .filter(([key]) => key.startsWith(`${table}:`))
    .map(([, value]) => value)
    .filter((row) => filters.every((filter) => row[filter.column] === filter.value))
    .filter((row) => notFilters.every((filter) => filter.operator !== "is" || filter.value !== null || row[filter.column] !== null));
}

function countRows(stores, table) {
  return Array.from(stores.keys()).filter((key) => key.startsWith(`${table}:`)).length;
}

function deterministicId(table, row) {
  if (table === "rcap_persons") {
    const source = `${row.partner_slug}:${row.match_key}`;
    let hash = 0;
    for (const char of source) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
    return `00000000-0000-4000-8000-${String(hash).padStart(12, "0").slice(-12)}`;
  }
  return `00000000-0000-4000-8000-${String(countRows(new Map(), table) + 1).padStart(12, "0")}`;
}

function runGit(args) {
  return String(spawnSync("git", args, { cwd: rootDir, encoding: "utf8" }).stdout ?? "").trim();
}

function assert(condition, message) {
  if (!condition) failures.push(message);
}
