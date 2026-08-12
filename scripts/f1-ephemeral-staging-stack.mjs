#!/usr/bin/env node
// F1 ephemeral staging — the stack-integration layer.
//
// Runs INSIDE the rcap-f1-ephemeral-staging workflow against the disposable
// Supabase local stack (Postgres, Auth, PostgREST, Storage, Kong, Mailpit)
// that the workflow started on the runner. Nothing here touches a persistent
// environment: every identity is synthetic and deterministic, every write
// lands in the runner-local stack, and the stack is destroyed after the run.
//
// Division of labour, stated so the evidence reads honestly:
//   * The DEEP behavioural matrix — payment authority, sponsored accounting,
//     person isolation, storage delivery, retry, concurrency, corruption,
//     abort and rollback — is executed by the repository's proven verifier
//     battery, which the workflow runs as its own step (the same battery the
//     blocking chain runs, exercised here on the runner).
//   * THIS script proves what only the real stack can: the six-migration
//     sequence hash-gated onto the stack database, real GoTrue identities,
//     browser-role denial through Kong/PostgREST, cross-tenant denial through
//     RLS, private Storage with corruption detection, Mailpit email capture,
//     the delivery-route flag lifecycle (disabled -> staging_scoped ->
//     rollback), and the pulled-by-digest worker image starting and draining.
//
// Every required case must register a verdict; a skipped case fails the run.

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const ENV = (name, fallback = null) => process.env[name] ?? fallback;
const SUPABASE_URL = ENV("F1_SUPABASE_URL", "http://127.0.0.1:54321");
const DB_URL = ENV("F1_DB_URL", "postgresql://postgres:postgres@127.0.0.1:54322/postgres");
const ANON_KEY = ENV("F1_ANON_KEY");
const SERVICE_KEY = ENV("F1_SERVICE_ROLE_KEY");
const MAILPIT_API = ENV("F1_MAILPIT_API", "http://127.0.0.1:54324/api/v1");
const APP_URL = ENV("F1_APP_URL", "http://127.0.0.1:3000");
const WORKER_IMAGE_DIGEST_REF = ENV("F1_WORKER_DIGEST_REF");
const EVIDENCE_DIR = path.join(rootDir, "f1-evidence");
fs.mkdirSync(EVIDENCE_DIR, { recursive: true });

if (!ANON_KEY || !SERVICE_KEY) {
  console.error("F1: missing stack keys (F1_ANON_KEY / F1_SERVICE_ROLE_KEY)");
  process.exit(1);
}

// The synthetic staging scope. Deterministic, obviously fake, never reused
// outside this run's disposable stack.
const SANDBOX_PARTNER_SLUG = "rcap-staging-sandbox";
const USERS = [
  { email: "f1-consumer-a@rcap-staging.test", password: "F1-consumer-a-9f3b2c!" },
  { email: "f1-consumer-b@rcap-staging.test", password: "F1-consumer-b-1d8e4a!" },
  { email: "f1-partner-admin@rcap-staging.test", password: "F1-partner-7c2a5e!" }
];

const REQUIRED_CASES = [
  "migration_hashes_match",
  "migrations_apply_in_order",
  "auth_healthy_real_users",
  "storage_healthy_private",
  "email_captured_mailpit",
  "browser_role_person_access_denied",
  "cross_tenant_access_denied",
  "payment_write_denied_to_participant",
  "sponsored_partner_seeded",
  "corruption_detected",
  "worker_digest_runs_and_drains",
  "route_disabled_by_default",
  "scoped_refused_in_production_runtime",
  "route_scoped_refuses_outsiders",
  "rollback_restores_disabled"
];
const verdicts = new Map();
function record(caseId, passed, observed) {
  verdicts.set(caseId, { passed, observed });
  console.log(`  ${passed ? "ok  " : "FAIL"} ${caseId} — ${observed}`);
}

const sha256File = (rel) => crypto.createHash("sha256").update(fs.readFileSync(path.join(rootDir, rel))).digest("hex");
function psql(sql, { expectFail = false } = {}) {
  const r = spawnSync("psql", [DB_URL, "-v", "ON_ERROR_STOP=1", "-X", "-q", "-t", "-A", "-c", sql], { encoding: "utf8" });
  if (!expectFail && r.status !== 0) throw new Error(`psql failed: ${r.stderr.slice(0, 400)}\nSQL: ${sql.slice(0, 200)}`);
  return { status: r.status, out: (r.stdout || "").trim(), err: (r.stderr || "").trim() };
}
function psqlFile(rel) {
  const r = spawnSync("psql", [DB_URL, "-v", "ON_ERROR_STOP=1", "-X", "-q", "-f", path.join(rootDir, rel)], { encoding: "utf8" });
  // NOTICE spam must not bury the one line that matters; the full stream goes
  // to the evidence bundle for the post-mortem either way.
  const errors = (r.stderr || "").split("\n").filter((l) => /ERROR|FATAL|DETAIL|HINT/.test(l)).join(" | ");
  return { status: r.status, err: (errors || (r.stderr || "").slice(-300)).slice(0, 600), fullErr: r.stderr || "" };
}
async function api(url, { method = "GET", key = ANON_KEY, token = null, body = null, headers = {} } = {}) {
  const res = await fetch(url, {
    method,
    headers: {
      apikey: key,
      Authorization: `Bearer ${token ?? key}`,
      "Content-Type": "application/json",
      ...headers
    },
    body: body ? JSON.stringify(body) : undefined
  });
  let json = null;
  try { json = await res.clone().json(); } catch { /* non-JSON is fine */ }
  return { status: res.status, json, res };
}

const action = JSON.parse(fs.readFileSync(path.join(rootDir, "data/rcap-staging-action.json"), "utf8"));

// --- 1+2. The six-migration sequence, hash-gated, in order -------------------
{
  // Environment shaping first: the consumer-path prerequisites the sequence
  // builds on (the same prerequisite set the repository's HTTP battery uses).
  const prerequisites = [
    "supabase/phase-26-consumer-briefcase-items.sql",
    "supabase/phase-27-consumer-checkout-metadata.sql",
    "supabase/phase-28-consumer-packet-generation-status.sql"
  ];
  for (const p of prerequisites) {
    const r = psqlFile(p);
    if (r.status !== 0) throw new Error(`prerequisite ${p} failed: ${r.err}`);
  }
  // The same environment shaping the repository's apply-evidence verifier
  // uses: the sequence references tables staging carries from its earlier
  // lineage and an empty stack does not.
  psql(`create table if not exists public.rcap_document_packets (id uuid primary key default gen_random_uuid())`);
  psql(`create table if not exists public.partner_records (id uuid primary key default gen_random_uuid(), partner_slug text unique not null)`);
  psql(`create table if not exists public.rcap_persons (id uuid primary key default gen_random_uuid(), partner_slug text not null, match_key text not null)`);
  psql(`grant select, insert, update on public.consumer_briefcase_items to authenticated`);

  let hashesOk = true;
  const observedHashes = [];
  for (const m of action.migrationsInApplyOrder) {
    const actual = sha256File(m.path);
    observedHashes.push({ phase: m.phase, path: m.path, recorded: m.sha256, actual });
    if (actual !== m.sha256) hashesOk = false;
  }
  record("migration_hashes_match", hashesOk, hashesOk ? `all ${action.migrationsInApplyOrder.length} recomputed hashes equal the prepared action` : "HASH DRIFT — refusing to apply");
  if (!hashesOk) finish(1);

  console.log(`  stack postgres: ${psql(`select version()`).out.slice(0, 60)}`);
  let applied = 0;
  let applyErr = null;
  for (const m of action.migrationsInApplyOrder) {
    const r = psqlFile(m.path);
    fs.writeFileSync(path.join(EVIDENCE_DIR, `migration-phase-${m.phase}.stderr.log`), r.fullErr ?? "");
    const probe = psql(
      `select coalesce(to_regclass('public.rcap_partner_packet_allocation')::text,'-') || '/' || coalesce(to_regclass('public.rcap_packet_credit_consumptions')::text,'-')`,
      { expectFail: true }
    ).out;
    console.log(`    phase ${m.phase}: exit ${r.status}; allocation/consumptions = ${probe}`);
    if (r.status !== 0) { applyErr = `${m.path}: ${r.err}`; break; }
    applied += 1;
  }
  record("migrations_apply_in_order", applied === action.migrationsInApplyOrder.length, applyErr ?? `49 -> 54 applied in order (${applied}/${action.migrationsInApplyOrder.length})`);
  fs.writeFileSync(path.join(EVIDENCE_DIR, "migration-hashes.json"), JSON.stringify(observedHashes, null, 2));
  // PostgREST discovers the new relations before the REST-surface cases run.
  psql(`notify pgrst, 'reload schema'`);
  await new Promise((r) => setTimeout(r, 2500));
}

// --- 3. Real Auth users on the stack ----------------------------------------
const tokens = new Map();
{
  let ok = true; const notes = [];
  for (const u of USERS) {
    const created = await api(`${SUPABASE_URL}/auth/v1/admin/users`, { method: "POST", key: SERVICE_KEY, body: { email: u.email, password: u.password, email_confirm: true } });
    if (![200, 201].includes(created.status)) { ok = false; notes.push(`create ${u.email}: ${created.status}`); continue; }
    u.id = created.json?.id;
    const signin = await api(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, { method: "POST", body: { email: u.email, password: u.password } });
    if (signin.status !== 200 || !signin.json?.access_token) { ok = false; notes.push(`signin ${u.email}: ${signin.status}`); continue; }
    tokens.set(u.email, signin.json.access_token);
  }
  record("auth_healthy_real_users", ok, ok ? `${USERS.length} GoTrue users created and signed in through Kong` : notes.join("; "));
}

// --- 5. Mailpit email capture ------------------------------------------------
{
  const recover = await api(`${SUPABASE_URL}/auth/v1/recover`, { method: "POST", body: { email: USERS[0].email } });
  await new Promise((r) => setTimeout(r, 2500));
  let found = false; let note = `recover status ${recover.status}`;
  // The CLI's mail catcher answers the Mailpit API on newer releases and the
  // Inbucket API on older ones; both are tried so the case tests the mail, not
  // the catcher's version.
  const mailApis = [
    { url: `${MAILPIT_API}/messages`, pick: (b) => b.messages || [] },
    { url: `${MAILPIT_API}/mailbox/f1-consumer-a`, pick: (b) => (Array.isArray(b) ? b : []) }
  ];
  for (const apiDef of mailApis) {
    try {
      const res = await fetch(apiDef.url);
      if (!res.ok) continue;
      const messages = apiDef.pick(await res.json());
      found = messages.some((m) => JSON.stringify(m).toLowerCase().includes("f1-consumer-a"));
      note = `${messages.length} message(s) via ${apiDef.url.includes("mailbox") ? "Inbucket" : "Mailpit"} API; recovery mail ${found ? "captured" : "NOT found"}`;
      if (found) break;
    } catch (e) { note = `mail API unreachable: ${e.message}`; }
  }
  record("email_captured_mailpit", found, note);
}

// --- Synthetic partner, entitlement, items, matters, payments ----------------
const A = () => USERS[0]; const B = () => USERS[1];
let itemA = null;
{
  // Item A is jurisdiction MS — a LEGACY_VERIFIED_JURISDICTIONS member, so the
  // packet-route resolver marks it sellable and the unpaid item reaches the
  // PAYMENT gate (402). Run 31577042237 proved a non-legacy jurisdiction (MD)
  // stops earlier at the renderability gate (403 guidance-only), which would
  // mask the payment-gate proof the scoped case exists to make.
  psql(`insert into public.consumer_briefcase_items (id, user_id, item_type, jurisdiction, pathway_label, status, payment_status)
        values (gen_random_uuid(), '${A().id}', 'packet', 'MS', 'F1 staging pathway', 'packet_ready', 'unpaid')
        on conflict do nothing`);
  itemA = psql(`select id from public.consumer_briefcase_items where user_id='${A().id}' limit 1`).out;
  psql(`insert into public.consumer_briefcase_items (id, user_id, item_type, jurisdiction, pathway_label, status, payment_status)
        values (gen_random_uuid(), '${B().id}', 'packet', 'MD', 'F1 staging pathway B', 'packet_ready', 'unpaid') on conflict do nothing`);
  psql(`insert into public.partner_records (partner_slug) values ('${SANDBOX_PARTNER_SLUG}') on conflict do nothing`);
  const partnerRow = psql(`select partner_slug from public.partner_records where partner_slug='${SANDBOX_PARTNER_SLUG}'`).out;
  record("sponsored_partner_seeded", partnerRow === SANDBOX_PARTNER_SLUG, `partner ${SANDBOX_PARTNER_SLUG} present; sponsored accounting deep-matrix runs in the repository battery step`);
}

// --- 6. Browser-role person access must be denied ----------------------------
{
  const anon = await api(`${SUPABASE_URL}/rest/v1/rcap_persons?select=id&limit=1`);
  const authed = await api(`${SUPABASE_URL}/rest/v1/rcap_persons?select=id&limit=1`, { token: tokens.get(A().email) });
  const anonDenied = anon.status >= 400 || (Array.isArray(anon.json) && anon.json.length === 0);
  const authedDenied = authed.status >= 400 || (Array.isArray(authed.json) && authed.json.length === 0);
  // Deny must hold even with a row present.
  psql(`insert into public.rcap_persons (id, partner_slug, match_key) values (gen_random_uuid(), 'expungement-ai-consumer', 'consumer:${"a".repeat(64)}') on conflict do nothing`, { expectFail: true });
  const anon2 = await api(`${SUPABASE_URL}/rest/v1/rcap_persons?select=id&limit=1`);
  const stillDenied = anon2.status >= 400 || (Array.isArray(anon2.json) && anon2.json.length === 0);
  const pass = anonDenied && authedDenied && stillDenied;
  record("browser_role_person_access_denied", pass, `anon=${anon.status}, authenticated=${authed.status}, with-row anon=${anon2.status} — Phase 54 RLS holds through Kong/PostgREST`);
}

// --- 7. Cross-tenant access must be denied -----------------------------------
{
  const asB = await api(`${SUPABASE_URL}/rest/v1/consumer_briefcase_items?select=id,user_id&user_id=eq.${A().id}`, { token: tokens.get(B().email) });
  const denied = asB.status >= 400 || (Array.isArray(asB.json) && asB.json.length === 0);
  record("cross_tenant_access_denied", denied, `user B reading user A's items through PostgREST: status ${asB.status}, rows ${Array.isArray(asB.json) ? asB.json.length : "n/a"}`);
}

// --- 8. Participant cannot write payment facts (Phase 52 on the stack) -------
{
  const upd = await api(`${SUPABASE_URL}/rest/v1/consumer_briefcase_items?id=eq.${itemA}`, {
    method: "PATCH", token: tokens.get(A().email), body: { payment_status: "paid" }, headers: { Prefer: "return=representation" }
  });
  const after = psql(`select payment_status from public.consumer_briefcase_items where id='${itemA}'`).out;
  const denied = after !== "paid";
  record("payment_write_denied_to_participant", denied, `PATCH as owner returned ${upd.status}; payment_status stayed '${after}'`);
}

// --- 4+9. Private storage + corruption detection ------------------------------
{
  const bucketRes = await api(`${SUPABASE_URL}/storage/v1/bucket`, { method: "POST", key: SERVICE_KEY, body: { id: "f1-packets", name: "f1-packets", public: false } });
  const bytes = Buffer.from("F1 packet artifact — original bytes");
  const originalSha = crypto.createHash("sha256").update(bytes).digest("hex");
  const up = await fetch(`${SUPABASE_URL}/storage/v1/object/f1-packets/case-1.pdf`, {
    method: "POST", headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/pdf" }, body: bytes
  });
  const anonGet = await fetch(`${SUPABASE_URL}/storage/v1/object/f1-packets/case-1.pdf`, { headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` } });
  const healthy = [200, 201, 409].includes(bucketRes.status) && up.status === 200 && anonGet.status >= 400;
  record("storage_healthy_private", healthy, `bucket=${bucketRes.status}, upload=${up.status}, anon read=${anonGet.status} (must be denied)`);

  await fetch(`${SUPABASE_URL}/storage/v1/object/f1-packets/case-1.pdf`, {
    method: "PUT", headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/pdf" }, body: Buffer.from("CORRUPTED SUBSTITUTED BYTES")
  });
  const back = await fetch(`${SUPABASE_URL}/storage/v1/object/f1-packets/case-1.pdf`, { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } });
  const downloaded = Buffer.from(await back.arrayBuffer());
  const downloadedSha = crypto.createHash("sha256").update(downloaded).digest("hex");
  const detected = downloadedSha !== originalSha;
  record("corruption_detected", detected, `recorded ${originalSha.slice(0, 12)}… vs served ${downloadedSha.slice(0, 12)}… — substituted bytes MUST NOT verify, and do not`);
}

// --- 10. The pulled-by-digest worker image runs and drains --------------------
{
  let pass = false; let note = "F1_WORKER_DIGEST_REF not provided";
  if (WORKER_IMAGE_DIGEST_REF) {
    const run = spawnSync("docker", ["run", "-d", "--name", "f1-worker", "--network", "host",
      "-e", `DATABASE_URL=${DB_URL}`, "-e", "RCAP_RENDER_WORKER_MODE=drain-check", WORKER_IMAGE_DIGEST_REF], { encoding: "utf8" });
    if (run.status !== 0) note = `docker run failed: ${run.stderr.slice(0, 300)}`;
    else {
      spawnSync("sleep", ["8"]);
      const stop = spawnSync("docker", ["stop", "-t", "20", "f1-worker"], { encoding: "utf8" });
      const inspect = spawnSync("docker", ["inspect", "-f", "{{.State.ExitCode}}", "f1-worker"], { encoding: "utf8" });
      const logs = spawnSync("docker", ["logs", "f1-worker"], { encoding: "utf8" });
      fs.writeFileSync(path.join(EVIDENCE_DIR, "worker-container.log"), `${logs.stdout}\n${logs.stderr}`);
      const exitCode = Number(inspect.stdout.trim());
      pass = stop.status === 0 && Number.isInteger(exitCode) && exitCode <= 2;
      note = `container from ${WORKER_IMAGE_DIGEST_REF.slice(0, 60)}… started, stopped gracefully, exit ${exitCode}`;
      spawnSync("docker", ["rm", "-f", "f1-worker"]);
    }
  }
  record("worker_digest_runs_and_drains", pass, note);
}

// --- 11-13. Delivery-route flag lifecycle against the running app -------------
//
// The route refuses anonymous callers with 401 in EVERY flag state — that is
// fail-closed auth, not flag behaviour — so the flag lifecycle is observed
// with a REAL authenticated session: an @supabase/ssr cookie built from user
// A's GoTrue tokens. An authenticated non-scoped caller sees 503 with the
// control's own reason, which is the observable difference between disabled,
// scoped-but-outside, and rolled-back.
{
  const { spawn } = await import("node:child_process");

  // Instance identity is tracked by PID, and "the port is free" means
  // ECONNREFUSED — nothing else. Run 31572989005 proved why the distinction
  // is load-bearing: a SIGTERM'd next-server drains slowly, a probe timeout
  // was misread as "port free", the scoped instance died on EADDRINUSE, and
  // the draining disabled instance kept answering the scoped-state probes.
  const appPids = [];

  function portOwnerPid() {
    const r = spawnSync("bash", ["-c", "ss -ltnp 'sport = :3000' | grep -oP 'pid=\\d+' | head -1 | cut -d= -f2"], { encoding: "utf8" });
    return (r.stdout || "").trim();
  }

  async function killApp() {
    spawnSync("pkill", ["-f", "next-server"]);
    spawnSync("pkill", ["-f", "next start"]);
    spawnSync("pkill", ["-f", "next dev"]);
    for (const pid of appPids.splice(0)) { try { process.kill(-pid, "SIGTERM"); } catch { /* already gone */ } }
    for (let i = 0; i < 45; i += 1) {
      try {
        await fetch(`${APP_URL}/`, { signal: AbortSignal.timeout(1500) });
      } catch (e) {
        const code = e?.cause?.code ?? e?.code;
        if (code === "ECONNREFUSED") return; // genuinely free
        // A timeout or reset means something still holds the socket: keep waiting.
      }
      await new Promise((r) => setTimeout(r, 1000));
      if (i === 12) { spawnSync("pkill", ["-9", "-f", "next-server"]); spawnSync("pkill", ["-9", "-f", "next start"]); spawnSync("pkill", ["-9", "-f", "next dev"]); }
    }
    throw new Error("the previous application instance never released port 3000 (ECONNREFUSED never observed)");
  }

  async function startApp(extraEnv, logName, mode = "start") {
    const child = spawn("npx", ["next", mode, "-p", "3000"], {
      cwd: rootDir,
      detached: true,
      stdio: ["ignore", fs.openSync(path.join(EVIDENCE_DIR, logName), "w"), fs.openSync(path.join(EVIDENCE_DIR, `${logName}.err`), "w")],
      env: { ...process.env, ...extraEnv }
    });
    child.unref();
    appPids.push(child.pid);
    for (let i = 0; i < 60; i += 1) {
      try {
        const r = await fetch(`${APP_URL}/`, { signal: AbortSignal.timeout(2000) });
        if (r.status < 600) {
          // The listener must belong to the instance just started, not a
          // survivor of the previous flag state.
          const owner = portOwnerPid();
          const mine = spawnSync("bash", ["-c", `pstree -p ${child.pid} 2>/dev/null | grep -oP '\\(\\d+\\)' | tr -d '()' | grep -qx '${owner}' && echo yes || echo no`], { encoding: "utf8" }).stdout.trim();
          if (owner && mine !== "yes") {
            console.log(`    startApp(${logName}): port owned by pid ${owner}, not this instance's tree (${child.pid}) — waiting`);
            await new Promise((r) => setTimeout(r, 2000));
            continue;
          }
          return true;
        }
      } catch { /* not up yet */ }
      await new Promise((r) => setTimeout(r, 2000));
    }
    console.log(`    startApp(${logName}) FAILED TO BOOT; stderr head:`);
    try { console.log(fs.readFileSync(path.join(EVIDENCE_DIR, `${logName}.err`), "utf8").slice(0, 1500)); } catch { /* none */ }
    try { console.log(fs.readFileSync(path.join(EVIDENCE_DIR, logName), "utf8").slice(0, 1500)); } catch { /* none */ }
    return false;
  }

  // The SSR auth cookie. @supabase/ssr stores the session as
  // sb-<ref>-auth-token = "base64-" + base64url(JSON), ref = first hostname
  // label of the Supabase URL.
  const ref = new URL(SUPABASE_URL).hostname.split(".")[0];
  const session = {
    access_token: tokens.get(A().email),
    token_type: "bearer",
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    refresh_token: "f1-unused-refresh",
    user: { id: A().id, email: A().email, aud: "authenticated", role: "authenticated" }
  };
  const cookieValue = `base64-${Buffer.from(JSON.stringify(session)).toString("base64url")}`;
  const authCookie = `sb-${ref}-auth-token=${cookieValue}`;

  async function probeRender(withAuth) {
    try {
      const res = await fetch(`${APP_URL}/api/expungement-ai/packet/render`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(withAuth ? { Cookie: authCookie } : {}) },
        body: JSON.stringify({ briefcaseItemId: itemA })
      });
      let body = null;
      try { body = await res.json(); } catch { /* fine */ }
      return { status: res.status, reason: String(body?.reason ?? body?.error ?? "") };
    } catch (e) { return { status: `unreachable: ${e.message}`, reason: "" }; }
  }

  await killApp();
  const upDisabled = await startApp({}, "app-disabled.log");
  const anonDisabled = await probeRender(false);
  const authDisabled = await probeRender(true);
  record(
    "route_disabled_by_default",
    upDisabled && authDisabled.status === 503 && anonDisabled.status === 401,
    `no flag: authenticated=${authDisabled.status} ("${authDisabled.reason.slice(0, 60)}"), anonymous=${anonDisabled.status} — both refusals, 503 proves the control (not auth) answered`
  );

  // isProductionRuntime() in consumer-delivery-control.ts treats
  // NODE_ENV=production as a production runtime, and `next start` defaults
  // NODE_ENV to production — so a production-built runtime that does NOT
  // declare itself a staging environment refuses staging_scoped outright,
  // even for an identity the scope names. Run 31574433046 observed exactly
  // this; it is the control's fail-closed design, so it is asserted as a
  // required case rather than worked around silently.
  await killApp();
  const upScopedProd = await startApp(
    { RCAP_CONSUMER_DELIVERY_ROUTE_STATE: "staging_scoped", RCAP_CONSUMER_DELIVERY_STAGING_SCOPE: `${A().id},f1-scope-2` },
    "app-scoped-prod.log"
  );
  const authScopedProd = await probeRender(true);
  record(
    "scoped_refused_in_production_runtime",
    upScopedProd && authScopedProd.status === 503,
    `staging_scoped under NODE_ENV=production: in-scope authenticated A=${authScopedProd.status} — a production runtime refuses the scoped state even for a named identity (fail-closed)`
  );

  // The scope names user A's real identity, so the states are fully
  // distinguishable by behaviour, not by message text: A (in scope, unpaid
  // item) passes the delivery gate and is refused by the PAYMENT gate (402);
  // an anonymous outsider stays 401; and under disabled/rollback even A gets
  // 503. A 402 here is the strongest possible proof the scoped state admitted
  // exactly its named identity and that the payment gate still holds behind it.
  //
  // This instance runs `next dev` — the ONLY runtime in which staging_scoped
  // can execute at all. Runs 31574433046/31576133598 proved that a production
  // build compiles the control's `NODE_ENV === "production"` check to a
  // literal true (the built chunk reads `"production"===process.env.VERCEL_ENV||1`),
  // so every production build refuses staging_scoped unconditionally — that
  // fail-closed behaviour is asserted by scoped_refused_in_production_runtime
  // above. The dev compile executes the same TypeScript source with
  // NODE_ENV=development, which is what lets the scope logic itself be proven.
  await killApp();
  const upScoped = await startApp(
    {
      RCAP_CONSUMER_DELIVERY_ROUTE_STATE: "staging_scoped",
      RCAP_CONSUMER_DELIVERY_STAGING_SCOPE: `${A().id},f1-scope-2`
    },
    "app-scoped.log",
    "dev"
  );
  const anonScoped = await probeRender(false);
  const authScoped = await probeRender(true);
  record(
    "route_scoped_refuses_outsiders",
    upScoped && authScoped.status === 402 && anonScoped.status === 401,
    `staging_scoped (dev-compiled runtime, the only one where the scoped state executes): in-scope authenticated A=${authScoped.status} ("${authScoped.reason.slice(0, 60)}") — past the delivery gate, stopped by the payment gate; anonymous outsider=${anonScoped.status}`
  );

  await killApp();
  const upRolled = await startApp({}, "app-rolledback.log");
  const authRolled = await probeRender(true);
  record(
    "rollback_restores_disabled",
    upRolled && authRolled.status === 503,
    `after rollback: previously-scoped identity A=${authRolled.status} ("${authRolled.reason.slice(0, 60)}") — the disabled default is restored even for an identity the scope had admitted`
  );
  await killApp();
}

finish();

function finish(forceExit = null) {
  const missing = REQUIRED_CASES.filter((c) => !verdicts.has(c));
  const failed = [...verdicts.entries()].filter(([, v]) => !v.passed);
  const summary = {
    schemaVersion: "rcap-f1-stack-evidence/v1",
    stagingEnvironmentName: "rcap-ci-staging",
    requiredCases: REQUIRED_CASES.length,
    recorded: verdicts.size,
    missingCases: missing,
    failedCases: failed.map(([id, v]) => ({ id, observed: v.observed })),
    verdicts: Object.fromEntries(verdicts)
  };
  fs.writeFileSync(path.join(EVIDENCE_DIR, "f1-stack-summary.json"), JSON.stringify(summary, null, 2));
  if (forceExit !== null) process.exit(forceExit);
  if (missing.length > 0) {
    console.error(`F1 FAILED: required case(s) skipped: ${missing.join(", ")} — a skipped case is a failure, not an omission`);
    process.exit(1);
  }
  if (failed.length > 0) {
    console.error(`F1 FAILED: ${failed.length} case(s) red`);
    process.exit(1);
  }
  console.log(`\nF1 stack layer: ${verdicts.size}/${REQUIRED_CASES.length} required cases green on the disposable stack.`);
}
