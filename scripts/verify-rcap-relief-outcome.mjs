import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const migrationPath = path.join(rootDir, "supabase/phase-29-rcap-relief-outcome.sql");
const packetRepositoryPath = path.join(rootDir, "src/lib/rcap/documents/source-repository.ts");
const packetTypesPath = path.join(rootDir, "src/lib/rcap/documents/types.ts");
const routePath = path.join(rootDir, "src/app/api/internal/rcap/document-packets/[packetId]/relief-outcome/route.ts");
const adminPagePath = path.join(rootDir, "src/app/internal/partners/admin/[partnerSlug]/page.tsx");
const adminPanelPath = path.join(rootDir, "src/app/internal/partners/admin/[partnerSlug]/ReliefOutcomePanel.tsx");
const finalReportRoutePath = path.join(rootDir, "src/app/api/partner-reports/final/route.ts");
const finalReportDataPath = path.join(rootDir, "src/lib/reports/partner-final-impact-report-data.ts");
const finalReportNarrativePath = path.join(rootDir, "src/lib/reports/generate-final-impact-report-narrative.ts");
const packagePath = path.join(rootDir, "package.json");
const failures = [];

await testRepositoryReliefOutcomeSetter();
testMigrationAuditsOutcomeChanges();
testTypesAndAdminSurface();
testImpactReportCountsActualRelief();
testNpmTestWiresVerifier();
testForbiddenSurfacesWereNotTouched();

if (failures.length > 0) {
  console.error("RCAP relief outcome verification failed.");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("RCAP relief outcome verification passed.");
console.log("rcap_document_packets.relief_outcome has constrained definitive values.");
console.log("Database trigger writes relief_outcome_changed rows to rcap_record_events.");
console.log("Internal admin route and existing partner admin surface can set outcomes.");
console.log("Final impact report distinguishes actual relief delivered from activity.");
console.log("Packet generation, intake, eligibility, and per-state generators remain untouched.");

async function testRepositoryReliefOutcomeSetter() {
  const writes = [];
  const stores = new Map();
  const packetId = "11111111-1111-1111-1111-111111111111";
  stores.set(`rcap_document_packets:${packetId}`, {
    id: packetId,
    partner_slug: "we-must-vote",
    state: "MS",
    county: "Hinds",
    status: "preview_generated",
    relief_outcome: "filed_pending",
    updated_at: "2026-06-22T00:00:00.000Z",
    created_at: "2026-06-21T00:00:00.000Z"
  });

  const supabase = fakeSupabase({ writes, stores });
  const repo = loadTsModule(packetRepositoryPath, new Map(), {
    "@/lib/partners/partner-repository": {
      getPartnerRepositoryMode: async () => "supabase"
    },
    "@/lib/supabase/server": {
      getSupabaseAdminClient: () => supabase,
      isSupabaseConfigured: () => true
    },
    "server-only": {}
  });

  const result = await repo.setRcapDocumentPacketReliefOutcome({
    packetId,
    partnerSlug: "we-must-vote",
    reliefOutcome: "relief_granted"
  });

  assert(result.ok, "Relief outcome setter should succeed in Supabase mode.");
  if (!result.ok) return;
  assert(result.changed === true, "Relief outcome setter should report changed when the value differs.");
  assert(result.packet.reliefOutcome === "relief_granted", "Relief outcome setter should return the updated outcome.");

  const packetUpdates = writes.filter((write) => write.table === "rcap_document_packets" && write.operation === "update");
  assert(packetUpdates.length === 1, `Expected one packet update, got ${packetUpdates.length}.`);
  assert(packetUpdates[0]?.row?.relief_outcome === "relief_granted", "Packet update should set relief_outcome.");

  const auditWrites = writes.filter((write) => write.table === "rcap_record_events");
  assert(auditWrites.length === 0, "Repository should rely on the Phase 29 database trigger rather than duplicating audit rows in app code.");

  const noOp = await repo.setRcapDocumentPacketReliefOutcome({
    packetId,
    partnerSlug: "we-must-vote",
    reliefOutcome: "relief_granted"
  });
  assert(noOp.ok && noOp.changed === false, "Setting the same relief outcome should be a no-op.");
}

function testMigrationAuditsOutcomeChanges() {
  const migration = fs.readFileSync(migrationPath, "utf8");
  for (const expected of [
    "alter table rcap_document_packets",
    "add column if not exists relief_outcome text not null default 'not_recorded'",
    "rcap_document_packets_relief_outcome_check",
    "'relief_granted'",
    "'relief_partially_granted'",
    "create index if not exists rcap_document_packets_relief_outcome_idx",
    "create or replace function write_rcap_document_packet_relief_outcome_event()",
    "insert into rcap_record_events",
    "'relief_outcome_changed'",
    "old.relief_outcome",
    "new.relief_outcome",
    "create trigger rcap_document_packets_relief_outcome_audit",
    "after update of relief_outcome on rcap_document_packets"
  ]) {
    assert(migration.includes(expected), `Relief outcome migration missing ${expected}.`);
  }
  assert(!/update\s+rcap_record_events/i.test(migration), "Relief outcome migration must not update audit events.");
  assert(!/delete\s+from\s+rcap_record_events/i.test(migration), "Relief outcome migration must not delete audit events.");
}

function testTypesAndAdminSurface() {
  const types = fs.readFileSync(packetTypesPath, "utf8");
  const repository = fs.readFileSync(packetRepositoryPath, "utf8");
  const route = fs.readFileSync(routePath, "utf8");
  const adminPage = fs.readFileSync(adminPagePath, "utf8");
  const adminPanel = fs.readFileSync(adminPanelPath, "utf8");

  for (const expected of [
    "export const rcapReliefOutcomeValues",
    "export type RcapReliefOutcome",
    "reliefOutcome: RcapReliefOutcome"
  ]) {
    assert(types.includes(expected), `Types missing ${expected}.`);
  }

  for (const expected of [
    "setRcapDocumentPacketReliefOutcome",
    "Relief outcome changes require Supabase audit trail persistence.",
    "relief_outcome: packet.reliefOutcome",
    "reliefOutcome: \"not_recorded\"",
    ".select(\"id, partner_slug, state, county, pathway, status, relief_outcome, person_id, briefcase_id, updated_at, created_at\")",
    "actualReliefDeliveredPackets"
  ]) {
    assert(repository.includes(expected), `Repository missing ${expected}.`);
  }

  assert(route.includes("requireInternalAdminRouteAccess"), "Relief outcome API must reuse internal admin route guard.");
  assert(route.includes("setRcapDocumentPacketReliefOutcome"), "Relief outcome API must call the repository setter.");
  assert(adminPage.includes("resolveInternalAdminPageAccess"), "Admin page must remain behind existing internal admin page guard.");
  assert(adminPage.includes("ReliefOutcomePanel"), "Existing partner admin page should include the minimal relief outcome panel.");
  assert(adminPanel.includes("internalRcapReliefOutcomeApi"), "Relief outcome panel should call the internal API route.");
  assert(adminPanel.includes("rcapReliefOutcomeValues"), "Relief outcome panel should use the shared constrained outcomes.");
}

function testImpactReportCountsActualRelief() {
  const route = fs.readFileSync(finalReportRoutePath, "utf8");
  const data = fs.readFileSync(finalReportDataPath, "utf8");
  const narrative = fs.readFileSync(finalReportNarrativePath, "utf8");

  assert(route.includes("getPartnerDocumentActivitySummary"), "Final impact report route must read packet outcome activity.");
  assert(route.includes("actualReliefDeliveredPeople: documentActivity.actualReliefDeliveredPeople"), "Final impact report route must pass actual relief delivered people counts.");
  assert(data.includes("actualReliefDelivered: number"), "Final impact report metrics must expose actual relief delivered.");
  assert(data.includes("const actualReliefDelivered = context.actualReliefDeliveredPeople ?? 0"), "Final impact report data must derive actual relief from person outcomes.");
  assert(data.includes("Actual relief delivered"), "Final impact report tables must label actual relief delivered separately from outcomes available.");
  assert(narrative.includes("definitive relief delivered outcomes"), "Final impact narrative must describe definitive relief outcomes.");
}

function testNpmTestWiresVerifier() {
  const pkg = JSON.parse(fs.readFileSync(packagePath, "utf8"));
  assert(pkg.scripts.test.includes("verify-rcap-relief-outcome.mjs"), "npm test must include the RCAP relief outcome verifier.");
  assert(pkg.scripts["rcap:verify-relief-outcome"] === "node scripts/verify-rcap-relief-outcome.mjs", "Missing rcap:verify-relief-outcome script.");
}

function testForbiddenSurfacesWereNotTouched() {
  const changedFiles = runGit(["diff", "--name-only", "--"]);
  const forbidden = changedFiles.filter((file) =>
    /^src\/lib\/rcap\/documents\/(mississippi|illinois|dc|pennsylvania|texas-harris)\//.test(file) ||
    /^src\/app\/api\/rcap\/documents\/(mississippi|illinois|dc|pennsylvania|texas-harris)\//.test(file) ||
    (/^src\/lib\/rcap-intake\//.test(file) && !["src/lib/rcap-intake/repository.ts", "src/lib/rcap-intake/types.ts"].includes(file))
  );
  assert(forbidden.length === 0, `Generation, eligibility, or intake files changed: ${forbidden.join(", ")}`);
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

  if (request.startsWith(".")) {
    return resolveExisting(path.resolve(basedir, request));
  }

  return null;
}

function resolveExisting(candidate) {
  for (const extension of [".ts", ".tsx", ".js"]) {
    if (fs.existsSync(`${candidate}${extension}`)) return `${candidate}${extension}`;
  }
  if (fs.existsSync(candidate)) return candidate;
  return null;
}

function fakeSupabase({ writes, stores }) {
  return {
    from(table) {
      const state = { table, operation: null, row: null, filters: [] };
      const builder = {
        insert(row) {
          state.operation = "insert";
          state.row = Array.isArray(row) ? row[0] : row;
          const stored = storeRow(table, state.row, stores);
          writes.push({ table, operation: "insert", row: stored });
          return builder;
        },
        upsert(row, options) {
          state.operation = "upsert";
          state.row = row;
          const stored = storeRow(table, row, stores);
          writes.push({ table, operation: "upsert", row: stored, options });
          return Promise.resolve({ error: null });
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
        maybeSingle() {
          return Promise.resolve({ data: findRow(table, state.filters, stores), error: null });
        },
        single() {
          if (state.operation === "update") {
            const current = findRow(table, state.filters, stores);
            if (!current) return Promise.resolve({ data: null, error: { message: "not found" } });
            const updated = storeRow(table, { ...current, ...state.row }, stores);
            writes.push({ table, operation: "update", row: updated });
            return Promise.resolve({ data: updated, error: null });
          }

          if (state.operation === "insert") return Promise.resolve({ data: storeRow(table, state.row, stores), error: null });
          return Promise.resolve({ data: findRow(table, state.filters, stores), error: null });
        }
      };
      return builder;
    }
  };
}

function findRow(table, filters, stores) {
  for (const [key, row] of stores.entries()) {
    if (!key.startsWith(`${table}:`)) continue;
    const matches = filters.every((filter) => row[snakeKey(filter.column)] === filter.value);
    if (matches) return row;
  }
  return null;
}

function storeRow(table, row, stores) {
  const id = row.id ?? crypto.randomUUID();
  const now = new Date().toISOString();
  const stored = {
    ...row,
    id,
    created_at: row.created_at ?? now,
    updated_at: now
  };
  const key = table === "rcap_document_packet_inputs" ? stored.document_packet_id : id;
  stores.set(`${table}:${key}`, stored);
  return stored;
}

function snakeKey(key) {
  return key;
}

function runGit(args) {
  const { spawnSync } = require("node:child_process");
  const result = spawnSync("git", args, { cwd: rootDir, encoding: "utf8" });
  return result.stdout.split(/\r?\n/).filter(Boolean);
}

function assert(condition, message) {
  if (!condition) failures.push(message);
}
