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

const reportDataPath = path.join(rootDir, "src/lib/reports/partner-final-impact-report-data.ts");
const routePath = path.join(rootDir, "src/app/api/partner-reports/final/route.ts");
const packagePath = path.join(rootDir, "package.json");
const failures = [];

await testLiveReportUsesDurableRowsAndPersonCounts();
await testEmptyLiveReportDoesNotFabricateNumbers();
await testSeedFixturesRequireExplicitDevFlag();
testStaticWiring();
testNpmTestWiresVerifier();
testForbiddenSurfacesWereNotTouched();

if (failures.length > 0) {
  console.error("RCAP final impact live-data verification failed.");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("RCAP final impact live-data verification passed.");
console.log("Final Impact Report defaults to live Supabase durable records.");
console.log("Distinct people and relief delivered reuse the Commit 4 person outcome counter.");
console.log("Empty live partners render zeros and no recorded outcomes.");
console.log("Seed/static report data is gated by LEGALEASE_FINAL_IMPACT_REPORT_USE_SEED_FIXTURES=true outside production.");
console.log("PDF rendering pipeline, route auth shape, generators, eligibility, and intake flow remain untouched.");

async function testLiveReportUsesDurableRowsAndPersonCounts() {
  delete process.env.LEGALEASE_FINAL_IMPACT_REPORT_USE_SEED_FIXTURES;
  const supabase = fakeSupabase({
    rcap_intake_sessions: [
      { id: "intake-1", partner_slug: "we-must-vote", status: "completed", eligibility_signal: "possible_pathway", person_id: "person-1", state: "MS", county: "Hinds", created_at: "2026-06-01T00:00:00.000Z", completed_at: "2026-06-01T00:10:00.000Z" },
      { id: "intake-2", partner_slug: "we-must-vote", status: "needs_review", eligibility_signal: "human_review_recommended", person_id: "person-2", state: "MS", county: "Hinds", created_at: "2026-06-02T00:00:00.000Z", completed_at: null }
    ],
    rcap_document_packets: [
      { id: "packet-1", partner_slug: "we-must-vote", status: "preview_generated", relief_outcome: "relief_granted", person_id: "person-1", state: "MS", county: "Hinds", created_at: "2026-06-03T00:00:00.000Z", completed_at: null },
      { id: "packet-2", partner_slug: "we-must-vote", status: "preview_generated", relief_outcome: "relief_granted", person_id: "person-1", state: "MS", county: "Hinds", created_at: "2026-06-03T00:00:00.000Z", completed_at: null },
      { id: "packet-3", partner_slug: "we-must-vote", status: "ready_for_review", relief_outcome: "filed_pending", person_id: "person-2", state: "MS", county: "Madison", created_at: "2026-06-04T00:00:00.000Z", completed_at: null }
    ],
    rcap_record_events: [
      { id: "event-1", partner_slug: "we-must-vote", record_type: "intake_session", event_type: "created", record_id: "intake-1", occurred_at: "2026-06-01T00:00:00.000Z" },
      { id: "event-2", partner_slug: "we-must-vote", record_type: "document_packet", event_type: "relief_outcome_changed", record_id: "packet-1", occurred_at: "2026-06-03T00:00:00.000Z" }
    ]
  });
  const reportModule = loadReportModule(supabase, {
    distinctPeople: 2,
    reliefOutcomePeople: { relief_granted: 1, filed_pending: 1 },
    actualReliefDeliveredPeople: 1
  });

  const report = await reportModule.buildPartnerFinalImpactReportData({
    partnerId: "we-must-vote",
    partnerName: "We Must Vote",
    dateRange: "All time",
    state: "All States"
  });

  nodeAssert.equal(report.dataSource, "live_supabase");
  nodeAssert.equal(report.metrics.distinctPeopleHelped, 2);
  nodeAssert.equal(report.metrics.actualReliefDelivered, 1);
  nodeAssert.equal(report.metrics.packetStarted, 3);
  nodeAssert.equal(report.metrics.packetReady, 3);
  nodeAssert.equal(report.metrics.auditTrailEvents, 2);
  nodeAssert.equal(report.metrics.durableRecords, 5);
  nodeAssert.equal(report.reliefOutcomePeople.relief_granted, 1);
  assert(report.outcomeRows.some((row) => row.label === "Filed pending" && row.count === 1), "Live outcome rows should expose filed pending people.");
  assert(report.routingRows.some((row) => row.label === "MS / Hinds"), "Live report should include jurisdiction rows from durable records.");
}

async function testEmptyLiveReportDoesNotFabricateNumbers() {
  delete process.env.LEGALEASE_FINAL_IMPACT_REPORT_USE_SEED_FIXTURES;
  const reportModule = loadReportModule(null, {
    distinctPeople: 0,
    reliefOutcomePeople: {},
    actualReliefDeliveredPeople: 0
  });
  const report = await reportModule.buildPartnerFinalImpactReportData({ partnerId: "empty-partner", partnerName: "Empty Partner" });
  nodeAssert.equal(report.dataSource, "live_empty");
  nodeAssert.equal(report.metrics.distinctPeopleHelped, 0);
  nodeAssert.equal(report.metrics.actualReliefDelivered, 0);
  nodeAssert.equal(report.metrics.auditTrailEvents, 0);
  assert(report.outcomeRows.some((row) => row.label === "Not recorded" && row.conversion === "No durable records yet"), "Empty report must say no durable records yet.");
}

async function testSeedFixturesRequireExplicitDevFlag() {
  process.env.LEGALEASE_FINAL_IMPACT_REPORT_USE_SEED_FIXTURES = "true";
  const reportModule = loadReportModule(null, {
    distinctPeople: 0,
    reliefOutcomePeople: {},
    actualReliefDeliveredPeople: 0
  });
  const report = await reportModule.buildPartnerFinalImpactReportData({ partnerId: "current-partner", partnerName: "Current Partner" });
  nodeAssert.equal(report.dataSource, "seed_dev");
  assert(report.metrics.screenings > 0, "Explicit dev seed mode should keep local report fixtures available.");
  delete process.env.LEGALEASE_FINAL_IMPACT_REPORT_USE_SEED_FIXTURES;
}

function testStaticWiring() {
  const route = fs.readFileSync(routePath, "utf8");
  const reportData = fs.readFileSync(reportDataPath, "utf8");

  assert(route.includes("await buildPartnerFinalImpactReportData(parsed.data)"), "Route must delegate data loading to the report data module.");
  assert(!route.includes("getPartnerDocumentActivitySummary"), "Route must not stitch static data with packet summary counts.");
  assert(reportData.includes("getSupabaseAdminClient"), "Report data module must read live Supabase.");
  assert(reportData.includes("getRcapPersonOutcomeSummary"), "Report data module must reuse person outcome counts.");
  assert(reportData.includes("rcap_intake_sessions"), "Report must read durable intake sessions.");
  assert(reportData.includes("rcap_document_packets"), "Report must read durable document packets.");
  assert(reportData.includes("rcap_record_events"), "Report must read the immutable audit trail.");
  assert(reportData.includes("LEGALEASE_FINAL_IMPACT_REPORT_USE_SEED_FIXTURES"), "Seed fixtures must be behind an explicit dev flag.");
  assert(reportData.includes("No durable records yet"), "Empty partner report must render honest zero state.");
}

function testNpmTestWiresVerifier() {
  const pkg = JSON.parse(fs.readFileSync(packagePath, "utf8"));
  assert(pkg.scripts.test.includes("verify-rcap-final-impact-live-data.mjs"), "npm test must include the final impact live-data verifier.");
  assert(pkg.scripts["rcap:verify-final-impact-live-data"] === "node scripts/verify-rcap-final-impact-live-data.mjs", "Missing rcap:verify-final-impact-live-data script.");
}

function testForbiddenSurfacesWereNotTouched() {
  const changedFiles = runGit(["diff", "--name-only", "--"]).split(/\r?\n/).filter(Boolean);
  const forbidden = changedFiles.filter((file) =>
    /^src\/lib\/rcap\/documents\/(mississippi|illinois|dc|pennsylvania|texas-harris)\//.test(file) ||
    /^src\/app\/api\/rcap\/documents\/(mississippi|illinois|dc|pennsylvania|texas-harris)\//.test(file) ||
    /^src\/lib\/rcap-intake\//.test(file) ||
    file === "src/lib/reports/render-final-impact-report-pdf.ts" ||
    file === "src/lib/reports/render-final-impact-report-html.ts"
  );
  nodeAssert.equal(forbidden.join(", "), "", `Forbidden generation, intake, eligibility, or PDF pipeline files changed: ${forbidden.join(", ")}`);
}

function loadReportModule(supabase, personSummary) {
  return loadTsModule(reportDataPath, new Map(), {
    "@/lib/supabase/server": {
      getSupabaseAdminClient: () => supabase
    },
    "@/lib/rcap/person-identity": {
      getRcapPersonOutcomeSummary: async () => personSummary
    }
  });
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
  if (request.startsWith("@/")) return resolveExisting(path.join(rootDir, "src", request.slice(2)));
  if (request.startsWith(".")) return resolveExisting(path.resolve(basedir, request));
  return null;
}

function resolveExisting(candidate) {
  for (const extension of [".ts", ".tsx", ".js"]) {
    if (fs.existsSync(`${candidate}${extension}`)) return `${candidate}${extension}`;
  }
  return fs.existsSync(candidate) ? candidate : null;
}

function fakeSupabase(tables) {
  return {
    from(table) {
      const state = { table, filters: [], notFilters: [], gteFilters: [], lteFilters: [] };
      const builder = {
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
        gte(column, value) {
          state.gteFilters.push({ column, value });
          return builder;
        },
        lte(column, value) {
          state.lteFilters.push({ column, value });
          return builder;
        },
        then(resolve) {
          return Promise.resolve({ data: filterRows(tables[state.table] ?? [], state), error: null }).then(resolve);
        }
      };
      return builder;
    }
  };
}

function filterRows(rows, state) {
  return rows
    .filter((row) => state.filters.every((filter) => row[filter.column] === filter.value))
    .filter((row) => state.notFilters.every((filter) => filter.operator !== "is" || filter.value !== null || row[filter.column] !== null))
    .filter((row) => state.gteFilters.every((filter) => !row[filter.column] || row[filter.column] >= filter.value))
    .filter((row) => state.lteFilters.every((filter) => !row[filter.column] || row[filter.column] <= filter.value));
}

function runGit(args) {
  return String(spawnSync("git", args, { cwd: rootDir, encoding: "utf8" }).stdout ?? "").trim();
}

function assert(condition, message) {
  if (!condition) failures.push(message);
}
