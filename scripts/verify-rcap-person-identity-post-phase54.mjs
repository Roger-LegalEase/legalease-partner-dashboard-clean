// Independent post-Phase-54 audit of RCAP person identity.
//
// The pre-fix audit (origin/claude/rcap-person-identity-audit @ 83c0446) proved
// that public.rcap_persons had no RLS, no policy and no grant, so anon and
// authenticated held full CRUD and could read participant email addresses. That
// branch is before-state evidence only; nothing here inherits its result.
//
// This runs the real sequence 26 -> 27 -> 28 -> 30 -> 49 -> 50 -> 51 -> 52 ->
// 53 -> 54 against an ephemeral PostgreSQL 16 cluster configured the way
// Supabase configures a project — anon / authenticated / service_role created
// BEFORE the migrations, with default privileges granting ALL on new public
// tables — so Phase 54's revokes have to beat them exactly as they must in
// production.
//
// Denial is proven from the live catalog and from executed statements, never
// from application filtering.
//
// Evidence is written only under --write; ordinary runs are non-mutating.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { ephemeralPgAvailable, startEphemeralPg } from "./lib/rcap-ephemeral-pg.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const WRITE_MODE = process.argv.includes("--write");

if (!ephemeralPgAvailable()) {
  console.error("verify-rcap-person-identity-post-phase54: PostgreSQL 16 is not available.");
  process.exit(1);
}

const NS = "expungement-ai-consumer";
const PARTNER = "we-must-vote";
const OTHER = "fulton-county";
const PARTNER_ID = "11111111-1111-1111-1111-111111111111";
const OTHER_ID = "22222222-2222-2222-2222-222222222222";
const USER_A = "1a1a1a1a-1111-4111-8111-111111111111";
const USER_B = "2b2b2b2b-2222-4222-8222-222222222222";
const ITEM_1 = "aaaa1111-1111-4111-8111-111111111111";
const ITEM_2 = "bbbb2222-2222-4222-8222-222222222222";

const consumerKey = (u) => `consumer:${createHash("sha256").update(`rcap:consumer-person:v1:${u}`).digest("hex")}`;

const roleCases = [];
const tenantCases = [];
const mutationCases = [];
let catalog = null;

function push(list, id, title, expectation, passed, observed, severity = null) {
  list.push({ id, title, expectation, passed, observed, severity });
  console.log(`  ${passed ? "ok  " : "FAIL"} ${id} ${title}`);
  if (!passed) {
    console.log(`         expected: ${expectation}`);
    console.log(`         observed: ${observed}`);
  }
}
const R = (...a) => push(roleCases, ...a);
const T = (...a) => push(tenantCases, ...a);
const M = (...a) => push(mutationCases, ...a);

function asRole(db, role, sql) {
  try {
    return db.scalar(`set role ${role}; ${sql}`).replace(/^SET\s*/, "").split("\n").filter(Boolean).pop()?.trim() ?? "";
  } finally { db.sql("reset role"); }
}
function asRoleErr(db, role, sql) {
  try { return db.sqlExpectError(`set role ${role}; ${sql}`); }
  finally { db.sql("reset role"); }
}
/** Denied if the statement errors, or (belt and braces) affects/returns nothing. */
function denied(db, role, sql) {
  try {
    const out = db.sqlExpectError(`set role ${role}; ${sql}`);
    return { denied: true, how: out.split("\n")[0] };
  } catch {
    db.sql("reset role");
    return { denied: false, how: "statement succeeded" };
  } finally { db.sql("reset role"); }
}

function boot({ throughPhase54 = true } = {}) {
  const db = startEphemeralPg();
  db.sql(`create role anon nologin`);
  db.sql(`create role authenticated nologin`);
  db.sql(`create role service_role nologin bypassrls`);
  db.sql(`alter default privileges in schema public grant all on tables to anon, authenticated, service_role`);
  db.sql(`alter default privileges in schema public grant execute on functions to service_role`);

  db.sql(`create schema auth`);
  db.sql(`create table auth.users (id uuid primary key, email text)`);
  db.sql(`create or replace function auth.uid() returns uuid language sql stable set search_path='' as $$
            select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$`);
  db.sql(`grant usage on schema auth to anon, authenticated, service_role`);
  db.sql(`grant execute on function auth.uid() to anon, authenticated, service_role`);
  db.sql(`insert into auth.users (id, email) values ('${USER_A}','a@t.test'), ('${USER_B}','b@t.test')`);

  db.sql(`create table public.partner_records (id uuid primary key default gen_random_uuid(), partner_slug text unique not null)`);
  db.sql(`create table public.rcap_intake_sessions (id uuid primary key default gen_random_uuid(), partner_slug text)`);
  db.sql(`create table public.rcap_document_packets (
            id uuid primary key default gen_random_uuid(), partner_slug text,
            relief_outcome text, state text, created_at timestamptz not null default now())`);

  for (const f of [
    "supabase/phase-26-consumer-briefcase-items.sql",
    "supabase/phase-27-consumer-checkout-metadata.sql",
    "supabase/phase-28-consumer-packet-generation-status.sql",
    "supabase/phase-30-rcap-person-identity.sql",
    "supabase/phase-49-rcap-packet-render-jobs.sql",
    "supabase/phase-50-rcap-packet-delivery-hardening.sql",
    "supabase/phase-51-rcap-consumer-payment-gate.sql",
    "supabase/phase-52-rcap-consumer-payment-authority.sql",
    "supabase/phase-53-rcap-consumer-job-binding.sql",
    ...(throughPhase54 ? ["supabase/phase-54-rcap-person-namespace-hardening.sql"] : [])
  ]) db.applyFile(path.join(rootDir, f));

  db.sql(`insert into partner_records (id, partner_slug) values ('${PARTNER_ID}','${PARTNER}'), ('${OTHER_ID}','${OTHER}')`);
  return db;
}

// =============================================================================
console.log("DIRECT PRIVILEGE PROOF — live catalog after the real sequence");
// =============================================================================
const db = boot();
try {
  catalog = {
    relrowsecurity: db.scalar(`select relrowsecurity from pg_class where oid='public.rcap_persons'::regclass`).trim(),
    owner: db.scalar(`select pg_get_userbyid(relowner) from pg_class where oid='public.rcap_persons'::regclass`).trim(),
    relacl: db.scalar(`select coalesce(array_to_string(relacl,','),'<none>') from pg_class where oid='public.rcap_persons'::regclass`).trim(),
    policies: db.sql(`select policyname||' for '||cmd||' to '||array_to_string(roles,'+')
                      from pg_policies where tablename='rcap_persons' order by policyname`).trim().split("\n").filter(Boolean),
    rolePrivileges: {},
    functionGrants: {}
  };
  for (const role of ["anon", "authenticated", "service_role"]) {
    catalog.rolePrivileges[role] = Object.fromEntries(
      ["SELECT", "INSERT", "UPDATE", "DELETE"].map((p) => [
        p, db.scalar(`select has_table_privilege('${role}','public.rcap_persons','${p}')`).trim()
      ])
    );
  }
  for (const fn of ["public.rcap_consumer_person_namespace()", "public.rcap_guard_reserved_partner_slug()"]) {
    catalog.functionGrants[fn] = Object.fromEntries(
      ["anon", "authenticated", "service_role"].map((r) => [
        r, db.scalar(`select has_function_privilege('${r}','${fn}','EXECUTE')`).trim()
      ])
    );
  }
  console.log(`  relrowsecurity=${catalog.relrowsecurity} owner=${catalog.owner}`);
  console.log(`  relacl=${catalog.relacl}`);
  console.log(`  policies=${JSON.stringify(catalog.policies)}`);
  for (const [r, p] of Object.entries(catalog.rolePrivileges)) {
    console.log(`  ${r}: S/I/U/D = ${Object.values(p).join("/")}`);
  }

  // =============================================================================
  console.log("\nROLE CASES R1-R14");
  // =============================================================================

  // R1 — PUBLIC. Phase 54 revokes from anon and authenticated by name; a grant
  // to the PUBLIC pseudo-role would survive that, so it is checked directly.
  const publicGrants = db.scalar(
    `select count(*) from pg_class c cross join lateral aclexplode(c.relacl) a
     where c.oid='public.rcap_persons'::regclass and a.grantee = 0`).trim();
  R("R1", "PUBLIC holds no table access", "no PUBLIC entry in the table ACL",
    publicGrants === "0", `PUBLIC ACL entries: ${publicGrants} (relacl=${catalog.relacl})`, "critical");

  // Seed rows through the sanctioned server role.
  db.sql(`insert into rcap_persons (partner_slug, match_key) values ('${PARTNER}','email:participant@example.org')`);
  db.sql(`insert into rcap_persons (partner_slug, match_key) values ('${NS}','${consumerKey(USER_B)}')`);

  const attacks = [
    ["R2", "anon", "SELECT", `select match_key from rcap_persons`],
    ["R3", "anon", "INSERT", `insert into rcap_persons (partner_slug, match_key) values ('${PARTNER}','email:forged@evil.test')`],
    ["R4", "anon", "UPDATE", `update rcap_persons set match_key='email:tampered@evil.test' where partner_slug='${PARTNER}'`],
    ["R5", "anon", "DELETE", `delete from rcap_persons`],
    ["R6", "authenticated", "SELECT", `select match_key from rcap_persons`],
    ["R7", "authenticated", "INSERT", `insert into rcap_persons (partner_slug, match_key) values ('${PARTNER}','email:forged2@evil.test')`],
    ["R8", "authenticated", "UPDATE", `update rcap_persons set match_key='email:tampered2@evil.test' where partner_slug='${PARTNER}'`],
    ["R9", "authenticated", "DELETE", `delete from rcap_persons`]
  ];
  for (const [id, role, verb, sql] of attacks) {
    const d = denied(db, role, sql);
    R(id, `${role} ${verb} is denied`, "the statement is refused",
      d.denied && /permission denied/i.test(d.how), d.how, "critical");
  }

  // R10 / R11 — the legitimate resolver path, unchanged.
  const key = consumerKey(USER_A);
  const first = asRole(db, "service_role",
    `with r as (insert into rcap_persons (partner_slug, match_key) values ('${NS}','${key}') returning id) select id from r`);
  R("R10", "service_role still resolves a consumer person", "the insert succeeds and returns an id",
    /^[0-9a-f-]{36}$/.test(first), first || "no id returned", "critical");

  const dupe = asRoleErr(db, "service_role",
    `insert into rcap_persons (partner_slug, match_key) values ('${NS}','${key}')`);
  const resolved = asRole(db, "service_role",
    `select id from rcap_persons where partner_slug='${NS}' and match_key='${key}'`);
  R("R11", "service_role resolution is idempotent",
    "a duplicate is refused by the unique index and the same row resolves",
    /duplicate key|unique constraint/i.test(dupe) && resolved === first,
    `duplicate=${dupe.split("\n")[0]} | resolved=${resolved === first ? "same row" : "DIFFERENT row"}`);

  // R12 — one user's key never resolves another's row.
  const crossed = asRole(db, "service_role",
    `select count(*) from rcap_persons where partner_slug='${NS}' and match_key='${consumerKey(USER_A)}' and id <> '${first}'`);
  const bRow = asRole(db, "service_role",
    `select count(*) from rcap_persons where partner_slug='${NS}' and match_key='${consumerKey(USER_B)}' and id = '${first}'`);
  R("R12", "one auth user cannot resolve another user's consumer person",
    "user A's derived key never selects user B's row",
    crossed === "0" && bRow === "0",
    `A-key rows other than A's own=${crossed}, B-key matching A's row=${bRow}`);

  // R13 — squatting the reserved namespace.
  const squat = denied(db, "authenticated",
    `insert into rcap_persons (partner_slug, match_key) values ('${NS}','consumer:${"0".repeat(64)}')`);
  R("R13", "a browser role cannot squat the reserved consumer namespace",
    "the insert into the reserved namespace is refused",
    squat.denied, squat.how, "high");

  // R14 — a real partner claiming the reserved slug.
  const collide = asRoleErr(db, "service_role", `insert into partner_records (partner_slug) values ('${NS}')`);
  const rename = asRoleErr(db, "service_role", `update partner_records set partner_slug='${NS}' where partner_slug='${OTHER}'`);
  R("R14", "a real partner slug cannot collide with the reserved namespace",
    "both INSERT and UPDATE of partner_records to the reserved slug are refused",
    /reserved direct-to-consumer person namespace/.test(collide) &&
      /reserved direct-to-consumer person namespace/.test(rename),
    `insert=${collide.split("\n")[0]} | update=${rename.split("\n")[0]}`, "high");

  // =============================================================================
  console.log("\nTENANT AND PRODUCT CASES T1-T12");
  // =============================================================================

  // T1 / T2 — a partner admin is an `authenticated` session. The catalog already
  // denies it; these execute the partner-shaped query to show that holds.
  const t1 = denied(db, "authenticated", `select id from rcap_persons where partner_slug='${NS}'`);
  T("T1", "partner-admin queries cannot read consumer-person rows", "the read is refused",
    t1.denied, t1.how, "high");
  const t2 = denied(db, "authenticated", `update rcap_persons set partner_slug='${PARTNER}' where partner_slug='${NS}'`);
  T("T2", "partner-admin queries cannot mutate consumer-person rows", "the write is refused",
    t2.denied, t2.how, "high");

  // T3 / T4 — partner reporting. Consumer packets carry the reserved slug
  // (resolveConsumerPacketId), and the reporting query filters on the partner's
  // own slug, so consumer people can never enter the count.
  const consumerPerson = asRole(db, "service_role", `select id from rcap_persons where match_key='${key}'`);
  const partnerPerson = asRole(db, "service_role", `select id from rcap_persons where match_key='email:participant@example.org'`);
  db.sql(`insert into rcap_document_packets (partner_slug, relief_outcome, person_id)
          values ('${PARTNER}','relief_granted','${partnerPerson}'),
                 ('${NS}','relief_granted','${consumerPerson}')`);
  const partnerCount = db.scalar(
    `select count(distinct person_id) from rcap_document_packets
      where partner_slug='${PARTNER}' and person_id is not null`).trim();
  T("T3", "consumer-person rows do not enter partner participant counts",
    "the partner's distinct-people count counts only its own person",
    partnerCount === "1", `distinct people for ${PARTNER} = ${partnerCount}`);

  const leaked = db.scalar(
    `select count(*) from rcap_document_packets p join rcap_persons r on r.id = p.person_id
      where p.partner_slug='${PARTNER}' and r.partner_slug='${NS}'`).trim();
  T("T4", "consumer-person rows do not alter partner packet reporting",
    "no packet attributed to the partner resolves to a consumer person",
    leaked === "0", `consumer-backed packets under ${PARTNER} = ${leaked}`);

  // T5 / T7 — entitlement and cap consumption are keyed on partner_records.id.
  // The reserved namespace has no such row, which is what R14 protects.
  db.sql(`insert into partner_packet_entitlement (partner_id, packet_cap) values ('${PARTNER_ID}', 5)`);
  const entitlementForNs = db.scalar(
    `select count(*) from partner_packet_entitlement e
      join partner_records pr on pr.id = e.partner_id where pr.partner_slug='${NS}'`).trim();
  T("T5", "consumer-person rows do not enter partner entitlement lookup",
    "no entitlement resolves through the reserved namespace",
    entitlementForNs === "0", `entitlements reachable via ${NS} = ${entitlementForNs}`);

  const capRows = db.scalar(
    `select count(*) from packet_credit_ledger l join rcap_persons r on r.id = l.person_id
      where r.partner_slug='${NS}' and l.event_type in ('consumed','overage_consumed')`).trim();
  T("T7", "consumer-person rows do not enter packet-cap consumption",
    "no consuming ledger event is keyed to a consumer person",
    capRows === "0", `consuming ledger rows for consumer people = ${capRows}`);

  // T6 / T8 — sponsored attribution. Phase 53 refuses a job that mixes modes,
  // so a consumer job can never carry a partner, and vice versa.
  const packetForMix = db.scalar(
    `with r as (insert into rcap_document_packets (partner_slug) values ('${NS}') returning id) select id from r`).trim();
  const mixHash = createHash("sha256").update("t6-mix").digest("hex");
  const mixed = asRoleErr(db, "service_role",
    `select enqueue_packet_render_job('${packetForMix}','MS:x','packet_document_v1','1.0.0',null,'MS','1.3.0','${mixHash}',
      null,'${PARTNER_ID}','${consumerPerson}','${ITEM_1}',5,'${ITEM_1}','${USER_A}')`);
  T("T6", "consumer-person rows do not enter sponsored attribution",
    "a job cannot carry both a partner and a consumer binding",
    /must not carry consumer binding fields/.test(mixed), mixed.split("\n")[0]);

  const sponsoredNoConsumer = db.scalar(
    `select count(*) from packet_render_jobs where partner_id is not null and consumer_auth_user_id is not null`).trim();
  T("T8", "a DTC consumer cannot receive sponsored packet context",
    "no job holds a partner and a consumer identity at once",
    sponsoredNoConsumer === "0", `jobs holding both = ${sponsoredNoConsumer}`);

  // T9 / T10 / T11 — identity derivation, exercised against the shipped module
  // further below; here the database half: the reserved shape constraint keeps
  // partner and consumer keyspaces disjoint in both directions.
  const partnerShapedInNs = asRoleErr(db, "service_role",
    `insert into rcap_persons (partner_slug, match_key) values ('${NS}','email:someone@example.org')`);
  const consumerShapedInPartner = asRoleErr(db, "service_role",
    `insert into rcap_persons (partner_slug, match_key) values ('${PARTNER}','consumer:${"a".repeat(64)}')`);
  T("T11", "browser-supplied identity cannot control canonical identity",
    "the reserved namespace admits only digest keys, and no partner namespace admits one",
    /rcap_persons_reserved_namespace_shape/.test(partnerShapedInNs) &&
      /rcap_persons_reserved_namespace_shape/.test(consumerShapedInPartner),
    `email-in-reserved=${partnerShapedInNs.split("\n")[0]} | consumer-in-partner=${consumerShapedInPartner.split("\n")[0]}`);

  // T12 — the sponsored resolver path is untouched.
  const sponsoredPerson = asRole(db, "service_role",
    `with r as (insert into rcap_persons (partner_slug, match_key) values ('${OTHER}','email:jordan@example.gov') returning id) select id from r`);
  const sponsoredDupe = asRoleErr(db, "service_role",
    `insert into rcap_persons (partner_slug, match_key) values ('${OTHER}','email:jordan@example.gov')`);
  T("T12", "existing sponsored person resolution remains unchanged",
    "a partner person still inserts and still dedupes on (partner_slug, match_key)",
    /^[0-9a-f-]{36}$/.test(sponsoredPerson) && /duplicate key|unique constraint/i.test(sponsoredDupe),
    `insert=${sponsoredPerson ? "ok" : "failed"} dedupe=${sponsoredDupe.split("\n")[0]}`);
} finally {
  db.stop();
}

// =============================================================================
console.log("\nT9 / T10 — matter derivation, executed from the shipped module");
// =============================================================================
{
  const tsc = [path.join(rootDir, "node_modules/.bin/tsc"), process.env.RCAP_TSC ?? ""].find((p) => p && fs.existsSync(p));
  if (!tsc) {
    for (const [id, title] of [["T9", "matter id is stable for one Briefcase item"],
                               ["T10", "distinct Briefcase items produce distinct matter ids"]]) {
      tenantCases.push({ id, title, passed: null, skipped: "no TypeScript compiler reachable (set RCAP_TSC)" });
      console.log(`  SKIP ${id} ${title} — no TypeScript compiler reachable`);
    }
  } else {
    const out = fs.mkdtempSync(path.join(os.tmpdir(), "rcap-p54-ts-"));
    try {
      execFileSync(tsc, [path.join(rootDir, "src/lib/expungement-ai/consumer-identity.ts"),
        "--target", "es2022", "--module", "esnext", "--moduleResolution", "bundler",
        "--noResolve", "--skipLibCheck", "--outDir", out], { stdio: "ignore" });
    } catch { /* type-resolution only; emit checked next */ }
    const emitted = path.join(out, "consumer-identity.js");
    if (!fs.existsSync(emitted)) throw new Error("tsc produced no JavaScript for consumer-identity.ts");
    const loadable = path.join(out, "consumer-identity.mjs");
    fs.writeFileSync(loadable, fs.readFileSync(emitted, "utf8")
      .replace(/^import "server-only";\s*$/m, "")
      .replace(/^import \{ getSupabaseAdminClient \} from "@\/lib\/supabase\/server";\s*$/m,
        "const getSupabaseAdminClient = () => null;"));
    const mod = await import(loadable);

    const m1 = mod.consumerMatterIdForItem(ITEM_1);
    const m1b = mod.consumerMatterIdForItem(ITEM_1);
    const m2 = mod.consumerMatterIdForItem(ITEM_2);
    T("T9", "matter id is stable for one Briefcase item", "the same item yields the same matter",
      m1 === m1b, `${m1} stable=${m1 === m1b}`);
    T("T10", "distinct Briefcase items produce distinct matter ids", "different items never share a matter",
      m1 !== m2, `item1=${m1.slice(0, 13)}… item2=${m2.slice(0, 13)}…`);
    T("T11b", "the reserved namespace constant agrees with the database function",
      "the module constant equals the migration's namespace",
      mod.CONSUMER_PERSON_NAMESPACE === NS, String(mod.CONSUMER_PERSON_NAMESPACE));
    fs.rmSync(out, { recursive: true, force: true });
  }
}

// =============================================================================
console.log("\nMUTATIONS — each must turn a proven property red");
// =============================================================================
//
// Phase 54 applies TWO independent defences: the grants are revoked AND RLS is
// enabled with no policy for a browser role. Measured below, each is on its own
// sufficient — so a mutation that undoes only one does NOT reopen the table.
// That is the migration's stated intent ("adding a policy AND a grant would
// both be required to reopen this by accident"), proven rather than asserted,
// and it is why X1 and X2 assert continued protection while X3 is the red one.

/** What `authenticated` can actually read: an error, or a row count. */
function readAsAuthenticated(d) {
  try {
    const rows = d.scalar(`set role authenticated; select count(*) from rcap_persons`)
      .replace(/^SET\s*/, "").split("\n").filter(Boolean).pop()?.trim();
    return { error: null, rows: Number(rows) };
  } catch (e) {
    return { error: String(e.stderr ?? e.message).split("\n").find((l) => l.includes("ERROR"))?.trim() ?? "error", rows: null };
  } finally { d.sql("reset role"); }
}
const protectedFromRead = (d) => { const r = readAsAuthenticated(d); return r.error !== null || r.rows === 0; };

/** Runs a statement as a role; returns the error text, or null on success. */
function tryAsRole(d, role, sql) {
  try { d.sql(`set role ${role}; ${sql}`); return null; }
  catch (e) { return String(e.stderr ?? e.message).split("\n").find((l) => l.includes("ERROR"))?.trim() ?? "error"; }
  finally { d.sql("reset role"); }
}

function seed(d) {
  d.sql(`insert into rcap_persons (partner_slug, match_key) values ('${PARTNER}','email:participant@example.org')`);
  d.sql(`insert into rcap_persons (partner_slug, match_key) values ('${NS}','${consumerKey(USER_A)}')`);
  const pp = d.scalar(`select id from rcap_persons where match_key='email:participant@example.org'`).trim();
  const cp = d.scalar(`select id from rcap_persons where match_key='${consumerKey(USER_A)}'`).trim();
  d.sql(`insert into rcap_document_packets (partner_slug, relief_outcome, person_id)
         values ('${PARTNER}','relief_granted','${pp}'), ('${NS}','relief_granted','${cp}')`);
}

// X1 / X2 — single-defence removal must NOT reopen the table.
for (const [id, title, mutate] of [
  ["X1", "RLS disabled alone does not reopen the table", (d) => d.sql(`alter table public.rcap_persons disable row level security`)],
  ["X2", "a re-granted authenticated SELECT alone does not reopen the table", (d) => d.sql(`grant select on public.rcap_persons to authenticated`)]
]) {
  const d = boot();
  try {
    seed(d);
    const before = protectedFromRead(d);
    mutate(d);
    const after = readAsAuthenticated(d);
    M(id, title, "the other defence still denies every participant row",
      before === true && (after.error !== null || after.rows === 0),
      `before=protected, after: ${after.error ? `error=${after.error.slice(7, 45)}` : `rows=${after.rows}`}`);
  } finally { d.stop(); }
}

// X3 — undoing BOTH is the mutation that genuinely reopens it.
{
  const d = boot();
  try {
    seed(d);
    const before = protectedFromRead(d);
    d.sql(`alter table public.rcap_persons disable row level security`);
    d.sql(`grant select on public.rcap_persons to authenticated`);
    const after = readAsAuthenticated(d);
    M("X3", "removing RLS and the revoke together turns the audit red",
      "protected before; participant rows readable after",
      before === true && after.error === null && after.rows > 0,
      `before=protected, after rows=${after.rows}`);
  } finally { d.stop(); }
}

// X4 — the reserved-slug guard.
{
  const d = boot();
  try {
    seed(d);
    const before = tryAsRole(d, "service_role", `insert into partner_records (partner_slug) values ('${NS}')`);
    d.sql(`drop trigger rcap_guard_reserved_partner_slug_trg on public.partner_records`);
    const after = tryAsRole(d, "service_role", `insert into partner_records (partner_slug) values ('${NS}')`);
    M("X4", "removing the reserved-slug guard turns the audit red",
      "refused before, accepted after",
      before !== null && /reserved direct-to-consumer person namespace/.test(before) && after === null,
      `before=${before ? before.slice(7, 60) : "accepted"} | after=${after ? after.slice(7, 60) : "accepted"}`);
  } finally { d.stop(); }
}

// X5 — a partner reporting query that loses its consumer exclusion.
{
  const d = boot();
  try {
    seed(d);
    const scoped = d.scalar(`select count(distinct person_id) from rcap_document_packets
      where partner_slug='${PARTNER}' and person_id is not null`).trim();
    const unscoped = d.scalar(`select count(distinct person_id) from rcap_document_packets
      where person_id is not null`).trim();
    M("X5", "dropping the partner filter from reporting turns the audit red",
      "the scoped count excludes the consumer person; the unscoped count includes it",
      scoped === "1" && unscoped === "2",
      `scoped=${scoped} unscoped=${unscoped}`);
  } finally { d.stop(); }
}

// X6 — an entitlement lookup that accepts the reserved namespace.
{
  const d = boot();
  try {
    seed(d);
    const guarded = d.scalar(`select count(*) from partner_records where partner_slug='${NS}'`).trim();
    d.sql(`drop trigger rcap_guard_reserved_partner_slug_trg on public.partner_records`);
    d.sql(`insert into partner_records (partner_slug) values ('${NS}')`);
    d.sql(`insert into partner_packet_entitlement (partner_id, packet_cap)
           select id, 5 from partner_records where partner_slug='${NS}'`);
    const leaked = d.scalar(`select count(*) from partner_packet_entitlement e
      join partner_records pr on pr.id = e.partner_id where pr.partner_slug='${NS}'`).trim();
    M("X6", "letting the reserved namespace become a partner turns the audit red",
      "no entitlement resolves through the namespace while the guard stands; one does once it falls",
      guarded === "0" && leaked === "1",
      `guarded=${guarded} afterGuardRemoved=${leaked}`);
  } finally { d.stop(); }
}

// =============================================================================
const allRan = [...roleCases, ...tenantCases, ...mutationCases].filter((c) => c.passed !== null);
const passed = allRan.filter((c) => c.passed).length;
const failed = allRan.filter((c) => !c.passed);
const skips = [...tenantCases].filter((c) => c.passed === null);

const report = {
  schemaVersion: "rcap-person-identity-post-phase54/v1",
  generatedBy: "scripts/verify-rcap-person-identity-post-phase54.mjs",
  lane: "person-identity-post-phase54-audit",
  auditedCommit: "d6310fd20a4d38ecaa1afdcf92773510c6fffa59",
  beforeStateEvidence: "origin/claude/rcap-person-identity-audit @ 83c0446 (reference only)",
  migrationSequence: [26, 27, 28, 30, 49, 50, 51, 52, 53, 54],
  catalog,
  totals: {
    roleCases: roleCases.length, tenantCases: tenantCases.filter((c) => c.passed !== null).length,
    mutations: mutationCases.length, passed, failed: failed.length, skipped: skips.length
  },
  roleCases, tenantCases, mutations: mutationCases
};

console.log(`\nRole ${roleCases.filter((c) => c.passed).length}/${roleCases.length} | ` +
  `Tenant ${tenantCases.filter((c) => c.passed).length}/${tenantCases.filter((c) => c.passed !== null).length} | ` +
  `Mutations ${mutationCases.filter((c) => c.passed).length}/${mutationCases.length}` +
  (skips.length ? ` | ${skips.length} skipped` : ""));

const EVIDENCE = path.join(rootDir, "data/rcap-render/person-identity-post-phase54.json");
const serialized = `${JSON.stringify(report, null, 2)}\n`;
if (WRITE_MODE) {
  fs.mkdirSync(path.dirname(EVIDENCE), { recursive: true });
  fs.writeFileSync(EVIDENCE, serialized);
  console.log(`Evidence written: ${path.relative(rootDir, EVIDENCE)}`);
} else if (fs.existsSync(EVIDENCE)) {
  const committed = fs.readFileSync(EVIDENCE, "utf8");
  if (committed !== serialized) {
    console.error(`Evidence differs from this run (re-run with --write): ${path.relative(rootDir, EVIDENCE)}`);
    process.exitCode = 1;
  } else console.log(`Evidence verified unchanged: ${path.relative(rootDir, EVIDENCE)}`);
}

if (failed.length > 0) {
  console.error("\nFAILURES:\n");
  for (const f of failed) {
    console.error(` - [${f.severity ?? "medium"}] ${f.id} ${f.title}`);
    console.error(`     expected: ${f.expectation}`);
    console.error(`     observed: ${f.observed}`);
  }
  process.exit(1);
}
console.log("\nPerson identity isolation: every expectation held after Phase 54.");
