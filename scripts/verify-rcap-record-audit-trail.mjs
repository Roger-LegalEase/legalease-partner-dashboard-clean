import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const packetRepositoryPath = path.join(rootDir, "src/lib/rcap/documents/source-repository.ts");
const intakeRepositoryPath = path.join(rootDir, "src/lib/rcap-intake/repository.ts");
const migrationPath = path.join(rootDir, "supabase/phase-28-rcap-record-audit-trail.sql");
const packagePath = path.join(rootDir, "package.json");
const failures = [];

await testPacketAuditEvents();
await testIntakeAuditEvents();
testMigrationIsAppendOnly();
testNoPiiPayloadFields();
testNpmTestWiresVerifier();
testGeneratorsWereNotTouched();

if (failures.length > 0) {
  console.error("RCAP record audit trail verification failed.");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("RCAP record audit trail verification passed.");
console.log("Packet and intake status changes write rcap_record_events rows.");
console.log("Audit migration is append-only: insert/select grants only, update/delete blocked.");
console.log("Audit payload stays non-PII and starts from Phase 28 forward; no backfill required.");
console.log("Per-state generator logic: untouched by this commit.");

async function testPacketAuditEvents() {
  const writes = [];
  const stores = new Map();
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

  const createResult = await repo.createMississippiDocumentPacket({
    partnerSlug: "we-must-vote",
    intakeSessionId: "11111111-1111-1111-1111-111111111111",
    briefcaseId: "33333333-3333-3333-3333-333333333333",
    state: "MS",
    county: "Hinds",
    causeNumber: "2026-CR-1",
    charge: "Sample charge"
  });
  assert(createResult.ok, "Packet create should succeed.");
  if (!createResult.ok) return;

  const generateResult = await repo.generateSavedMississippiDocumentPacket(createResult.packet.id);
  assert(generateResult.ok, "Packet generate should succeed.");

  const events = writes.filter((write) => write.table === "rcap_record_events" && write.operation === "insert").map((write) => write.row);
  assert(events.length === 2, `Expected one packet audit event per status change, got ${events.length}.`);
  assert(events[0]?.record_type === "document_packet", "Packet audit event should use document_packet record_type.");
  assert(events[0]?.event_type === "created", "Packet create should write a created audit event.");
  assert(events[0]?.from_status === null && events[0]?.to_status === "ready_for_review", "Packet create audit event should capture initial status.");
  assert(events[1]?.event_type === "status_changed", "Packet generate should write a status_changed audit event.");
  assert(events[1]?.from_status === "ready_for_review" && events[1]?.to_status === "preview_generated", "Packet generate audit event should capture the status transition.");
  assert(new Set(events.map((event) => `${event.record_id}:${event.event_type}:${event.from_status}:${event.to_status}`)).size === events.length, "Packet audit events should not be duplicated.");
}

async function testIntakeAuditEvents() {
  const writes = [];
  const stores = new Map();
  const supabase = fakeSupabase({ writes, stores });
  const repo = loadTsModule(intakeRepositoryPath, new Map(), {
    "@/lib/partners/partner-repository": {
      getPartnerRepositoryMode: async () => "supabase",
      getPartnerRecordBySlug: async (partnerSlug) => ({
        partnerSlug,
        partnerId: "partner-we-must-vote",
        targetState: "MS",
        targetCounty: "Hinds",
        state: "MS"
      })
    },
    "@/lib/supabase/server": {
      getSupabaseAdminClient: () => supabase
    }
  });

  const startResult = await repo.startRcapIntakeSession({
    partnerSlug: "we-must-vote",
    legalDisclaimerAccepted: true
  });
  assert(startResult.ok, "Intake start should succeed.");
  if (!startResult.ok) return;

  const responseResult = await repo.respondToRcapIntake({
    sessionId: startResult.session.id,
    stepId: "understand_goal",
    value: "charged_not_convicted"
  });
  assert(responseResult.ok, "Intake response should succeed.");
  if (!responseResult.ok) return;

  const completeResult = await repo.completeRcapIntakeSession(startResult.session.id);
  assert(completeResult.ok, "Intake complete should succeed.");

  const events = writes.filter((write) => write.table === "rcap_record_events" && write.operation === "insert").map((write) => write.row);
  assert(events.length === 3, `Expected one intake audit event per status/current_step change, got ${events.length}.`);
  assert(events[0]?.record_type === "intake_session", "Intake audit event should use intake_session record_type.");
  assert(events[0]?.event_type === "created" && events[0]?.to_status === "started", "Intake start should write a created audit event.");
  assert(events[1]?.event_type === "status_changed", "Intake response should write a status_changed audit event.");
  assert(events[1]?.from_status === "started" && events[1]?.to_status === "in_progress", "Intake response should capture the status transition.");
  assert(events[1]?.metadata?.from_step === "understand_goal" && events[1]?.metadata?.to_step === "state", "Intake response should capture the current_step transition in metadata.");
  assert(events[2]?.event_type === "completed", "Intake completion should write a completed audit event.");
  assert(events[2]?.metadata?.to_step === "completed", "Intake completion should capture completed current_step in metadata.");
  assert(new Set(events.map((event) => `${event.record_id}:${event.event_type}:${event.from_status}:${event.to_status}:${event.metadata?.to_step ?? ""}`)).size === events.length, "Intake audit events should not be duplicated.");
}

function testMigrationIsAppendOnly() {
  const migration = fs.readFileSync(migrationPath, "utf8");
  for (const expected of [
    "create table if not exists rcap_record_events",
    "record_type text not null check (record_type in ('intake_session', 'document_packet'))",
    "occurred_at timestamptz not null default now()",
    "create trigger rcap_record_events_prevent_update",
    "create trigger rcap_record_events_prevent_delete",
    "revoke all on table rcap_record_events from public",
    "revoke all on table rcap_record_events from anon",
    "revoke all on table rcap_record_events from authenticated",
    "grant select, insert on table rcap_record_events to authenticated"
  ]) {
    assert(migration.includes(expected), `Audit migration missing ${expected}.`);
  }
  assert(!/grant\s+[^;]*(update|delete)[^;]*rcap_record_events/i.test(migration), "Audit migration must not grant update/delete on rcap_record_events.");
}

function testNoPiiPayloadFields() {
  const migration = fs.readFileSync(migrationPath, "utf8");
  const packetSource = fs.readFileSync(packetRepositoryPath, "utf8");
  const intakeSource = fs.readFileSync(intakeRepositoryPath, "utf8");
  const migrationColumns = migration.slice(
    migration.indexOf("create table if not exists rcap_record_events"),
    migration.indexOf(");", migration.indexOf("create table if not exists rcap_record_events"))
  );
  for (const forbidden of ["ssn", "social_security", "date_of_birth", "dob"]) {
    assert(!migrationColumns.toLowerCase().includes(forbidden), `Audit table columns must not contain ${forbidden}.`);
  }

  const packetAuditBody = functionBody(packetSource, "packetAuditEventRow");
  const intakeAuditBody = functionBody(intakeSource, "writeRcapIntakeAuditEvent");
  for (const forbidden of [
    "petitionerFirstName",
    "petitionerLastName",
    "causeNumber",
    "charge",
    "offenseDate",
    "arrestDate",
    "userFirstName",
    "userLastName",
    "userEmail",
    "userPhone"
  ]) {
    assert(!packetAuditBody.includes(forbidden), `Packet audit payload must not include ${forbidden}.`);
    assert(!intakeAuditBody.includes(forbidden), `Intake audit payload must not include ${forbidden}.`);
  }
}

function testNpmTestWiresVerifier() {
  const pkg = JSON.parse(fs.readFileSync(packagePath, "utf8"));
  assert(pkg.scripts.test.includes("verify-rcap-record-audit-trail.mjs"), "npm test must include the RCAP record audit trail verifier.");
  assert(pkg.scripts["rcap:verify-record-audit-trail"] === "node scripts/verify-rcap-record-audit-trail.mjs", "Missing rcap:verify-record-audit-trail script.");
}

function testGeneratorsWereNotTouched() {
  const changedFiles = runGit(["diff", "--name-only", "--"]);
  const forbidden = changedFiles.filter((file) =>
    /^src\/lib\/rcap\/documents\/(mississippi|illinois|dc|pennsylvania|texas-harris)\//.test(file) ||
    /^src\/app\/api\/rcap\/documents\/(mississippi|illinois|dc|pennsylvania|texas-harris)\//.test(file)
  );
  assert(forbidden.length === 0, `Per-state generator or route files changed: ${forbidden.join(", ")}`);
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
      const state = { table, operation: null, row: null, eqColumn: null, eqValue: null };
      const builder = {
        error: null,
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
          state.eqColumn = column;
          state.eqValue = value;
          if (state.operation === "update") {
            const current = stores.get(`${table}:${value}`) ?? {};
            const updated = { ...current, ...state.row };
            stores.set(`${table}:${value}`, updated);
            writes.push({ table, operation: "update", row: updated });
          }
          return builder;
        },
        maybeSingle() {
          return Promise.resolve({ data: stores.get(`${table}:${state.eqValue}`) ?? null, error: null });
        },
        single() {
          if (state.operation === "insert") return Promise.resolve({ data: storeRow(table, state.row, stores), error: null });
          if (state.operation === "update") return Promise.resolve({ data: stores.get(`${table}:${state.eqValue}`) ?? null, error: null });
          return Promise.resolve({ data: null, error: null });
        }
      };
      return builder;
    }
  };
}

function storeRow(table, row, stores) {
  const id = row.id ?? crypto.randomUUID();
  const now = new Date().toISOString();
  const stored = {
    ...row,
    id,
    created_at: row.created_at ?? now,
    updated_at: row.updated_at ?? now
  };
  const key = table === "rcap_document_packet_inputs" ? stored.document_packet_id : id;
  stores.set(`${table}:${key}`, stored);
  return stored;
}

function functionBody(source, functionName) {
  const start = source.indexOf(`function ${functionName}`);
  if (start === -1) return "";
  const nextFunction = source.indexOf("\nfunction ", start + 1);
  return source.slice(start, nextFunction === -1 ? source.length : nextFunction);
}

function runGit(args) {
  const { spawnSync } = require("node:child_process");
  const result = spawnSync("git", args, { cwd: rootDir, encoding: "utf8" });
  return result.stdout.split(/\r?\n/).filter(Boolean);
}

function assert(condition, message) {
  if (!condition) failures.push(message);
}
