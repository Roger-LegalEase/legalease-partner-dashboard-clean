import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const sourcePath = path.join(rootDir, "src/lib/rcap/documents/source-repository.ts");
const migrationPath = path.join(rootDir, "supabase/phase-27-rcap-source-document-persistence.sql");
const failures = [];

await testSupabasePersistenceWritesAllReportingTables();
await testFallbackIsLoudAndNonProductionOnly();
await testProductionMisconfigurationBlocksPacketCreation();
testMigrationAllowsSourceDrivenPackets();
testGeneratorsWereNotTouched();

if (failures.length > 0) {
  console.error("RCAP source document persistence verification failed.");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("RCAP source document persistence verification passed.");
console.log("Supabase mode: writes rcap_document_packets, rcap_document_packet_inputs, and rcap_briefcase_items.");
console.log("Local fallback: warning emitted and persisted=false.");
console.log("Production misconfiguration: packet creation blocked.");
console.log("Source-driven packet constraints: configured.");
console.log("Per-state generator logic: untouched by this commit.");

async function testSupabasePersistenceWritesAllReportingTables() {
  const writes = [];
  const stores = new Map();
  const supabase = fakeSupabase({ writes, stores });
  const repo = loadSourceRepository({
    partnerMode: "supabase",
    supabaseConfigured: true,
    supabase
  });

  const result = await repo.createMississippiDocumentPacket({
    partnerSlug: "we-must-vote",
    intakeSessionId: "11111111-1111-1111-1111-111111111111",
    userId: "22222222-2222-2222-2222-222222222222",
    briefcaseId: "33333333-3333-3333-3333-333333333333",
    state: "MS",
    county: "Hinds",
    causeNumber: "2026-CR-1",
    charge: "Sample charge",
    arrestDate: "2024-01-01"
  });

  assert(result.ok, "Supabase packet create should succeed.");
  if (!result.ok) return;
  assert(result.persisted === true, "Supabase packet create should return persisted=true.");
  assert(writes.some((write) => write.table === "rcap_document_packets" && write.operation === "upsert"), "Missing rcap_document_packets upsert.");
  assert(writes.some((write) => write.table === "rcap_document_packet_inputs" && write.operation === "upsert"), "Missing rcap_document_packet_inputs upsert.");
  assert(writes.some((write) => write.table === "rcap_briefcase_items" && write.operation === "upsert"), "Missing rcap_briefcase_items upsert.");
  assert(result.packet.documentType === "source_driven_packet", "Persisted packet changed document type.");
  assert(result.packet.pathway === "source_engine_packet_plan", "Persisted packet changed pathway.");
  assert(result.packet.status === "ready_for_review", "Persisted packet changed status semantics.");
  assert(result.packet.causeNumber === "2026-CR-1", "Persisted packet changed case-number mapping.");

  const cached = await repo.getRcapDocumentPacket(result.packet.id);
  assert(cached?.id === result.packet.id, "Created packet should be readable after persistence.");

  const generateResult = await repo.generateSavedMississippiDocumentPacket(result.packet.id);
  assert(generateResult.ok, "Generate saved packet should succeed in Supabase mode.");
  if (generateResult.ok) {
    assert(generateResult.persisted === true, "Generate saved packet should return persisted=true.");
    assert(generateResult.packet.status === "preview_generated", "Generate saved packet should preserve status transition semantics.");
  }
}

async function testFallbackIsLoudAndNonProductionOnly() {
  const warnings = [];
  const originalWarn = console.warn;
  console.warn = (message) => warnings.push(String(message));
  try {
    const repo = loadSourceRepository({
      partnerMode: "local_seeded",
      supabaseConfigured: false,
      supabase: null
    });
    const result = await repo.createIllinoisDocumentPacket({
      partnerSlug: "demo-partner",
      state: "IL",
      county: "Cook",
      caseOrArrestNumber: "A-1"
    });
    assert(result.ok, "Local fallback packet create should still succeed outside production.");
    if (result.ok) assert(result.persisted === false, "Local fallback should return persisted=false.");
    assert(warnings.some((warning) => warning.includes("persistence fallback active")), "Local fallback should log a clear warning.");
  } finally {
    console.warn = originalWarn;
  }
}

async function testProductionMisconfigurationBlocksPacketCreation() {
  const originalNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";
  try {
    const repo = loadSourceRepository({
      partnerMode: "local_fallback",
      supabaseConfigured: false,
      supabase: null
    });
    const result = await repo.createDcDocumentPacket({
      partnerSlug: "demo-partner",
      state: "DC",
      caseNumber: "2026-CMD-1"
    });
    assert(!result.ok, "Production misconfiguration should block packet creation instead of silently using memory.");
    if (!result.ok) assert(result.error.includes("persistence is required in production"), "Production misconfiguration error should explain persistence requirement.");
  } finally {
    process.env.NODE_ENV = originalNodeEnv;
  }
}

function testMigrationAllowsSourceDrivenPackets() {
  const migration = fs.readFileSync(migrationPath, "utf8");
  for (const expected of ["source_driven_packet", "source_engine_packet_plan", "'PA'", "'TX'", "rcap_document_packets_source_state_idx"]) {
    assert(migration.includes(expected), `Source persistence migration missing ${expected}.`);
  }
}

function testGeneratorsWereNotTouched() {
  const changedFiles = runGit(["diff", "--name-only", "--"]);
  const forbidden = changedFiles.filter((file) =>
    /^src\/lib\/rcap\/documents\/(mississippi|illinois|dc|pennsylvania|texas-harris)\//.test(file) ||
    /^src\/app\/api\/rcap\/documents\/(mississippi|illinois|dc|pennsylvania|texas-harris)\//.test(file)
  );
  assert(forbidden.length === 0, `Per-state generator or route files changed: ${forbidden.join(", ")}`);
}

function loadSourceRepository({ partnerMode, supabaseConfigured, supabase }) {
  const moduleCache = new Map();
  return loadTsModule(sourcePath, moduleCache, {
    "@/lib/partners/partner-repository": {
      getPartnerRepositoryMode: async () => partnerMode
    },
    "@/lib/supabase/server": {
      getSupabaseAdminClient: () => supabase,
      isSupabaseConfigured: () => supabaseConfigured
    },
    "server-only": {}
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
      const state = { table, selected: false, eqColumn: null, eqValue: null };
      return {
        upsert(row, options) {
          writes.push({ table, operation: "upsert", row, options });
          const key = table === "rcap_document_packet_inputs" ? row.document_packet_id : row.id ?? row.document_packet_id;
          stores.set(`${table}:${key}`, row);
          return Promise.resolve({ error: null });
        },
        select() {
          state.selected = true;
          return this;
        },
        eq(column, value) {
          state.eqColumn = column;
          state.eqValue = value;
          return this;
        },
        maybeSingle() {
          if (table === "rcap_document_packets" && state.eqColumn === "id") {
            const row = stores.get(`${table}:${state.eqValue}`);
            return Promise.resolve({ data: row ?? null, error: null });
          }
          return Promise.resolve({ data: null, error: null });
        }
      };
    }
  };
}

function runGit(args) {
  const { spawnSync } = require("node:child_process");
  const result = spawnSync("git", args, { cwd: rootDir, encoding: "utf8" });
  return result.stdout.split(/\r?\n/).filter(Boolean);
}

function assert(condition, message) {
  if (!condition) failures.push(message);
}
