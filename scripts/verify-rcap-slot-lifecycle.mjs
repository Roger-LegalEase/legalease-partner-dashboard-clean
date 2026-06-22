import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const moduleCache = new Map();
const failures = [];

try {
  verifySourceWiring();
  await verifyPartnerUsageEventPayload();

  const db = new PGlite();
  await db.exec("create role anon; create role authenticated; create role service_role;");
  await db.exec(read("supabase/partner-journey-os.sql"));
  await db.exec(read("supabase/phase-32-expungement-screening-sessions.sql"));
  await db.exec(read("supabase/phase-33-expungement-screening-resume-links.sql"));
  await db.exec(read("supabase/phase-35-rcap-partner-entitlement.sql"));
  await db.exec(read("supabase/phase-35b-rcap-screening-session-partner-mode.sql"));
  await db.exec(read("supabase/phase-35c-rcap-claim-screening-session.sql"));
  await db.exec(read("supabase/phase-35d-rcap-slot-lifecycle.sql"));

  await verifyReleaseExpiredOnceOnly(db);
  await verifyCompletionConsumesWithoutCounting(db);
  await verifyRecomputeConvergesWithSharedPredicate(db);
  await verifyDtcIgnored(db);

  await db.close();
} catch (error) {
  failures.push(error instanceof Error ? error.stack ?? error.message : String(error));
}

if (failures.length) {
  console.error("RCAP slot lifecycle verification failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("RCAP slot lifecycle verification passed.");
console.log("Release: expired claimed RCAP sessions decrement once, never below zero, and second passes no-op.");
console.log("Completion: claimed RCAP sessions become consumed/completed without incrementing entitlement.");
console.log("Recompute: ledger count uses the same expiry predicate as release and is idempotent.");
console.log("Usage event: aggregate-only partner_usage_window payload verified with no PII.");

function verifySourceWiring() {
  const migration = read("supabase/phase-35d-rcap-slot-lifecycle.sql");
  const lifecycle = read("src/lib/expungement-ai/rcap-slot-lifecycle.ts");
  const route = read("src/app/api/expungement-ai/screening/complete/route.ts");
  const flow = read("src/components/expungement-ai/screening/ScreeningFlow.tsx");
  const events = read("src/lib/expungement-ai/nudge-os-events.ts");
  const allowlist = read("scripts/rcap-scope-allowlist.mjs");

  assert(migration.includes("rcap_screening_session_is_release_expired"), "Shared expiry predicate is missing.");
  assert(countOccurrences(migration, "public.rcap_screening_session_is_release_expired(") >= 3, "Release and recompute must both call the shared expiry predicate.");
  assert(migration.includes("set claimed_slot_state = 'released'"), "Release must flip claimed_slot_state to released.");
  assert(migration.includes("and ss.claimed_slot_state = 'claimed'"), "Release must be guarded to claimed slots only.");
  assert(migration.includes("greatest(pe.screenings_used - rc.released_count, 0)"), "Release must prevent screenings_used from going negative.");
  assert(migration.includes("and pe.screenings_used > 0"), "Release must conditionally decrement only when used count is positive.");
  assert(migration.includes("set claimed_slot_state = 'consumed'"), "Completion must set claimed_slot_state consumed.");
  assert(migration.includes("status = 'completed'"), "Completion must confirm completed status.");

  const consumeFunction = functionBody(migration, "consume_rcap_screening_session", "recompute_rcap_partner_entitlements");
  assert(!consumeFunction.includes("partner_entitlement"), "Completion must not update partner_entitlement.");
  assert(!consumeFunction.includes("screenings_used + 1"), "Completion must never increment screenings_used.");

  assert(lifecycle.includes('rpc("consume_rcap_screening_session"'), "Lifecycle helper must call consume RPC.");
  assert(lifecycle.includes('rpc("release_expired_rcap_screening_slots"'), "Lifecycle helper must call release RPC.");
  assert(lifecycle.includes('rpc("recompute_rcap_partner_entitlements"'), "Lifecycle helper must call recompute RPC.");
  assert(lifecycle.includes("emitPartnerUsageWindowEvent"), "Lifecycle helper must emit aggregate usage events.");
  assert(route.includes("consumeRcapScreeningSession(sessionId)"), "Completion route must call consume helper.");
  assert(!route.includes("partner_entitlement"), "Completion route must not mutate entitlement directly.");
  assert(flow.includes("void markScreeningSessionCompleted(sessionId);"), "ScreeningFlow must mark successful sessions complete.");
  assert(events.includes('eventType: "partner_usage_window"'), "Partner usage event type missing.");
  assert(events.includes("LEGALEASE_OS_EVENTS_ENABLED"), "Partner usage event must use fail-safe OS event enable flag.");
  assert(allowlist.includes("supabase/phase-35d-rcap-slot-lifecycle.sql"), "Lifecycle migration must be in centralized allowlist.");
  assert(allowlist.includes("src/app/api/expungement-ai/screening/complete/route.ts"), "Completion endpoint must be in centralized allowlist.");
}

async function verifyReleaseExpiredOnceOnly(db) {
  await seedPartner(db, "release-once", { allowed: 3, used: 0 });
  const claim = await claimSession(db, "release-once", "MS");
  assert(claim.ok === true, "Release fixture claim failed.");

  await db.query(
    `update public.screening_sessions
     set created_at = $1,
         resume_token_expires_at = $2,
         status = 'in_progress'
     where session_id = $3`,
    ["2026-06-01T00:00:00.000Z", "2026-06-08T00:00:00.000Z", claim.session_id]
  );

  const firstRelease = await db.query("select * from public.release_expired_rcap_screening_slots($1)", ["2026-06-22T00:00:00.000Z"]);
  assert(firstRelease.rows.length === 1, "First release pass must report the released partner.");
  assert(firstRelease.rows[0].released_count === 1, "First release pass must release one slot.");
  assert((await usedSlots(db, "release-once")) === 0, "First release pass must decrement used slots.");
  assert((await slotState(db, claim.session_id)) === "released", "First release pass must flip session to released.");

  const secondRelease = await db.query("select * from public.release_expired_rcap_screening_slots($1)", ["2026-06-22T00:00:00.000Z"]);
  assert(secondRelease.rows.length === 0, "Second release pass must no-op.");
  assert((await usedSlots(db, "release-once")) === 0, "Second release pass must not decrement again.");
}

async function verifyCompletionConsumesWithoutCounting(db) {
  await seedPartner(db, "complete-one", { allowed: 2, used: 0 });
  const claim = await claimSession(db, "complete-one", "MS");
  assert(claim.ok === true, "Completion fixture claim failed.");
  assert((await usedSlots(db, "complete-one")) === 1, "Claim must consume exactly one slot.");

  const consumed = await db.query("select * from public.consume_rcap_screening_session($1)", [claim.session_id]);
  assert(consumed.rows[0].consumed === true, "Completion must consume claimed slot.");
  assert((await usedSlots(db, "complete-one")) === 1, "Completion must not increment or decrement used slots.");
  const completed = await one(db, "select status, claimed_slot_state from public.screening_sessions where session_id = $1", [claim.session_id]);
  assert(completed.status === "completed", "Completion must set status completed.");
  assert(completed.claimed_slot_state === "consumed", "Completion must set claimed_slot_state consumed.");

  const secondConsumed = await db.query("select * from public.consume_rcap_screening_session($1)", [claim.session_id]);
  assert(secondConsumed.rows[0].consumed === false, "Second completion pass must no-op.");
  assert((await usedSlots(db, "complete-one")) === 1, "Second completion pass must not change used slots.");

  await db.query(
    "update public.screening_sessions set created_at = $1, resume_token_expires_at = $2 where session_id = $3",
    ["2026-06-01T00:00:00.000Z", "2026-06-08T00:00:00.000Z", claim.session_id]
  );
  await db.query("select * from public.release_expired_rcap_screening_slots($1)", ["2026-06-22T00:00:00.000Z"]);
  assert((await usedSlots(db, "complete-one")) === 1, "Expired consumed session must never be released.");
  assert((await slotState(db, claim.session_id)) === "consumed", "Expired consumed session must never be reclaimed.");
}

async function verifyRecomputeConvergesWithSharedPredicate(db) {
  await seedPartner(db, "recompute-one", { allowed: 10, used: 0 });
  const consumed = await claimSession(db, "recompute-one", "MS");
  const active = await claimSession(db, "recompute-one", "MS");
  const expired = await claimSession(db, "recompute-one", "MS");
  assert(consumed.ok && active.ok && expired.ok, "Recompute fixture claims failed.");

  await db.query("select * from public.consume_rcap_screening_session($1)", [consumed.session_id]);
  await db.query(
    "update public.screening_sessions set created_at = $1, resume_token_expires_at = $2, status = 'in_progress' where session_id = $3",
    ["2026-06-01T00:00:00.000Z", "2026-06-08T00:00:00.000Z", expired.session_id]
  );
  await db.query(
    "update public.screening_sessions set created_at = $1, resume_token_expires_at = $2, status = 'in_progress' where session_id = $3",
    ["2026-06-21T00:00:00.000Z", "2026-06-28T00:00:00.000Z", active.session_id]
  );
  await db.query("update public.partner_entitlement set screenings_used = 9 where partner_slug = $1", ["recompute-one"]);

  const first = await db.query("select * from public.recompute_rcap_partner_entitlements($1, $2)", ["recompute-one", "2026-06-22T00:00:00.000Z"]);
  assert(first.rows[0].ledger_count === 2, "Recompute ledger must count consumed plus active-not-expired only.");
  assert(first.rows[0].screenings_used === 2, "Recompute must converge screenings_used to ledger count.");
  assert((await usedSlots(db, "recompute-one")) === 2, "Recompute must persist ledger count.");

  const second = await db.query("select * from public.recompute_rcap_partner_entitlements($1, $2)", ["recompute-one", "2026-06-22T00:00:00.000Z"]);
  assert(second.rows[0].screenings_used === 2 && second.rows[0].ledger_count === 2, "Recompute must be idempotent.");
}

async function verifyDtcIgnored(db) {
  await db.query(
    "insert into public.screening_sessions (session_id, jurisdiction, status, created_at) values ($1, $2, $3, $4)",
    ["00000000-0000-4000-8000-000000000111", "MS", "in_progress", "2026-06-01T00:00:00.000Z"]
  );
  const consume = await db.query("select * from public.consume_rcap_screening_session($1)", ["00000000-0000-4000-8000-000000000111"]);
  assert(consume.rows.length === 0, "DTC session must be ignored by consume RPC.");

  const release = await db.query("select * from public.release_expired_rcap_screening_slots($1)", ["2026-06-22T00:00:00.000Z"]);
  assert(release.rows.every((row) => row.partner_slug !== null), "DTC session must be ignored by release RPC.");
}

async function verifyPartnerUsageEventPayload() {
  const events = loadTsModule(path.join(rootDir, "src/lib/expungement-ai/nudge-os-events.ts"));
  const fixedNow = new Date("2026-06-22T14:30:00.000Z");
  const metrics = {
    partner_slug: "We_Must Vote!",
    screenings_allowed: 5,
    screenings_used: 5,
    at_capacity: false,
    period_label: "June 2026"
  };
  const payload = events.buildPartnerUsageWindowEventPayload(metrics, { now: () => fixedNow });

  assert(payload.eventType === "partner_usage_window", "Partner usage event type mismatch.");
  assert(payload.product === "expungement_ai", "Partner usage product mismatch.");
  assert(payload.source === "partner_entitlement", "Partner usage source mismatch.");
  assert(payload.timestamp === fixedNow.toISOString(), "Partner usage timestamp mismatch.");
  assert(payload.metadata.partner_slug === "we-must-vote", "Partner usage event must sanitize slug only.");
  assert(payload.metadata.screenings_allowed === 5, "Partner usage event must include screenings_allowed.");
  assert(payload.metadata.screenings_used === 5, "Partner usage event must include screenings_used.");
  assert(payload.metadata.at_capacity === true, "Partner usage event must derive at_capacity from counts.");
  assert(payload.metadata.period_label === "June 2026", "Partner usage event should include optional period label.");
  assertNoForbiddenKeys(payload);

  let fetchCount = 0;
  const result = await events.emitPartnerUsageWindowEvent(metrics, {
    configEnv: {
      LEGALEASE_OS_EVENTS_ENDPOINT: "https://os.example.test/api/events/product",
      LEGALEASE_OS_EVENTS_SECRET: "test-secret"
    },
    fetcher: async () => {
      fetchCount += 1;
      return new Response("unexpected", { status: 500 });
    }
  });
  assert(result.enabled === false && result.skipped_reason === "disabled", "Partner usage event must fail closed while disabled.");
  assert(fetchCount === 0, "Disabled partner usage event must not call fetch.");
}

async function seedPartner(db, slug, options = {}) {
  const { allowed, used } = options;
  await db.query(
    `insert into public.partner_records (
      partner_id,
      partner_slug,
      partner_name,
      program_tier,
      target_state,
      payment_status,
      qualification_status,
      provisioning_status
    ) values ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [slug, slug, `Partner ${slug}`, "implementation", "MS", "paid", "qualified", "provisioned"]
  );
  await db.query(
    "insert into public.partner_entitlement (partner_slug, screenings_allowed, screenings_used, period_label) values ($1, $2, $3, $4)",
    [slug, allowed, used, "June 2026"]
  );
}

async function claimSession(db, partnerSlug, jurisdiction) {
  const result = await db.query("select * from public.claim_rcap_screening_session($1, $2)", [partnerSlug, jurisdiction]);
  return result.rows[0];
}

async function usedSlots(db, partnerSlug) {
  const row = await one(db, "select screenings_used from public.partner_entitlement where partner_slug = $1", [partnerSlug]);
  return row.screenings_used;
}

async function slotState(db, sessionId) {
  const row = await one(db, "select claimed_slot_state from public.screening_sessions where session_id = $1", [sessionId]);
  return row.claimed_slot_state;
}

async function one(db, sql, params = []) {
  const result = await db.query(sql, params);
  assert(result.rows.length === 1, `Expected one row for query: ${sql}`);
  return result.rows[0];
}

function functionBody(source, startName, endName) {
  const start = source.indexOf(`function public.${startName}`);
  const end = source.indexOf(`function public.${endName}`);
  assert(start >= 0 && end > start, `Could not locate function body for ${startName}.`);
  return source.slice(start, end);
}

function assertNoForbiddenKeys(value) {
  const forbidden = new Set([
    "name",
    "email",
    "phone",
    "address",
    "userId",
    "anonymousId",
    "answers",
    "charge",
    "case_number",
    "caseNumber",
    "eligibility",
    "eligibility_result",
    "result",
    "payment",
    "packet",
    "briefcase",
    "resume",
    "resume_token",
    "resume_url",
    "token",
    "url"
  ]);
  const seen = [];
  walk(value, [], (keyPath) => {
    const key = keyPath.at(-1);
    if (forbidden.has(key)) seen.push(keyPath.join("."));
  });
  assert(seen.length === 0, `Payload contains forbidden PII/sensitive keys: ${seen.join(", ")}`);
}

function walk(value, pathParts, visitor) {
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    const nextPath = [...pathParts, key];
    visitor(nextPath);
    walk(child, nextPath, visitor);
  }
}

function countOccurrences(source, needle) {
  return source.split(needle).length - 1;
}

function read(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function loadTsModule(filename) {
  const resolved = path.resolve(filename);
  const cached = moduleCache.get(resolved);
  if (cached) return cached.exports;

  const source = fs.readFileSync(resolved, "utf8");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022
    }
  }).outputText;

  const mod = new Module(resolved);
  mod.filename = resolved;
  mod.paths = Module._nodeModulePaths(path.dirname(resolved));
  moduleCache.set(resolved, mod);
  mod.require = (request) => {
    if (request === "server-only") return {};
    const nextFile = resolveTsRequest(request, path.dirname(resolved));
    if (nextFile?.endsWith(".json")) return require(nextFile);
    return nextFile ? loadTsModule(nextFile) : require(request);
  };
  mod._compile(transpiled, resolved);
  return mod.exports;
}

function resolveTsRequest(request, basedir) {
  if (request.startsWith("@/")) {
    const candidate = path.join(rootDir, "src", request.slice(2));
    return resolveExistingModuleFile(candidate);
  }

  if (request.startsWith(".")) {
    return resolveExistingModuleFile(path.resolve(basedir, request));
  }

  return null;
}

function resolveExistingModuleFile(candidate) {
  for (const extension of [".ts", ".tsx", ".js", ".json"]) {
    if (fs.existsSync(`${candidate}${extension}`)) return `${candidate}${extension}`;
  }
  for (const indexFile of ["index.ts", "index.tsx", "index.js"]) {
    const file = path.join(candidate, indexFile);
    if (fs.existsSync(file)) return file;
  }
  return null;
}
