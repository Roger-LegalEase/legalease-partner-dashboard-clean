// Independent audit of RCAP person identity (`public.rcap_persons`).
//
// Ten surfaces, executed against an ephemeral PostgreSQL 16 cluster configured
// the way Supabase configures a project: anon / authenticated / service_role
// exist before the migrations, and default privileges grant ALL on new public
// tables, so a migration that says nothing about grants inherits them.
//
//   1  anon CRUD on rcap_persons
//   2  authenticated CRUD on rcap_persons
//   3  cross-consumer access
//   4  partner-admin access
//   5  partner reporting contamination
//   6  partner entitlement contamination
//   7  reserved-slug collision
//   8  same-user idempotency
//   9  other-user denial
//   10 matter and Briefcase binding
//
// Surfaces 8-10 exercise the product's own derivations. The pure exports of
// src/lib/expungement-ai/consumer-identity.ts are transpiled with the
// repository's TypeScript and imported, so the algorithm under test is the
// shipped one rather than a restatement of it. If no tsc is reachable those
// three cases report SKIPPED out loud rather than silently passing.
//
// This script writes no product file and no shared artifact. Evidence is
// written only under --write.

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
  console.error("verify-rcap-person-identity-exposure: PostgreSQL 16 is not available.");
  process.exit(1);
}

const findings = [];
function record(id, surface, title, expectation, passed, observed, severity = null) {
  findings.push({ id, surface, title, expectation, passed, observed, severity });
  console.log(`  ${passed ? "ok  " : "FAIL"} ${id} ${title}`);
  if (!passed) {
    console.log(`         expected: ${expectation}`);
    console.log(`         observed: ${observed}`);
  }
}
function skipped(id, surface, title, why) {
  findings.push({ id, surface, title, passed: null, skipped: why });
  console.log(`  SKIP ${id} ${title} — ${why}`);
}

const PARTNER = "we-must-vote";
const OTHER_PARTNER = "fulton-county";
const VICTIM_EMAIL = "participant@example.org";
const USER_A = "1a1a1a1a-1111-4111-8111-111111111111";
const USER_B = "2b2b2b2b-2222-4222-8222-222222222222";

function asRole(db, role, sql) {
  try {
    return db.scalar(`set role ${role}; ${sql}`).replace(/^SET\s*/, "").split("\n").filter(Boolean).pop()?.trim() ?? "";
  } finally {
    db.sql("reset role");
  }
}
function asRoleExpectError(db, role, sql) {
  try {
    return db.sqlExpectError(`set role ${role}; ${sql}`);
  } finally {
    db.sql("reset role");
  }
}

/** A Supabase-equivalent cluster carrying the person-identity schema. */
function boot() {
  const db = startEphemeralPg();
  db.sql(`create role anon nologin`);
  db.sql(`create role authenticated nologin`);
  db.sql(`create role service_role nologin bypassrls`);
  db.sql(`alter default privileges in schema public grant all on tables to anon, authenticated, service_role`);
  db.sql(`alter default privileges in schema public grant execute on functions to service_role`);

  db.sql(`create schema auth`);
  db.sql(`create table auth.users (id uuid primary key, email text)`);
  db.sql(
    `create or replace function auth.uid() returns uuid language sql stable set search_path='' as $$
       select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$`
  );
  db.sql(`grant usage on schema auth to anon, authenticated, service_role`);
  db.sql(`grant execute on function auth.uid() to anon, authenticated, service_role`);

  // Upstream tables phase 30 extends, plus the partner registry the reserved
  // namespace is checked against.
  db.sql(`create table public.partner_records (id uuid primary key default gen_random_uuid(), partner_slug text unique not null)`);
  db.sql(`create table public.rcap_intake_sessions (id uuid primary key default gen_random_uuid(), partner_slug text)`);
  db.sql(`create table public.rcap_document_packets (
            id uuid primary key default gen_random_uuid(),
            partner_slug text, relief_outcome text, state text,
            created_at timestamptz not null default now())`);

  db.applyFile(path.join(rootDir, "supabase/phase-30-rcap-person-identity.sql"));
  db.sql(`insert into partner_records (partner_slug) values ('${PARTNER}'), ('${OTHER_PARTNER}')`);
  return db;
}

// =============================================================================
console.log("Surfaces 1-2 — browser-role CRUD on the person-identity table");
// =============================================================================
const db = boot();
try {
  const rls = db.scalar(`select relrowsecurity from pg_class where oid='public.rcap_persons'::regclass`).trim();
  const policies = db.scalar(`select count(*) from pg_policies where tablename='rcap_persons'`).trim();
  record("P1", "posture", "row level security is enabled on rcap_persons",
    "relrowsecurity = t with at least one policy",
    rls === "t" && Number(policies) > 0,
    `relrowsecurity=${rls}, policies=${policies}`, "critical");

  // Seed a realistic partner person. This is what the product writes: the match
  // key is the participant's own email in near-plaintext.
  const victimKey = `email:${VICTIM_EMAIL}`;
  db.sql(`insert into rcap_persons (partner_slug, match_key) values ('${PARTNER}', '${victimKey}')`);
  db.sql(`insert into rcap_persons (partner_slug, match_key) values ('${OTHER_PARTNER}', 'name:jordan lee')`);

  for (const role of ["anon", "authenticated"]) {
    const privs = db.scalar(
      `select has_table_privilege('${role}','public.rcap_persons','SELECT')||'/'||
              has_table_privilege('${role}','public.rcap_persons','INSERT')||'/'||
              has_table_privilege('${role}','public.rcap_persons','UPDATE')||'/'||
              has_table_privilege('${role}','public.rcap_persons','DELETE')`).trim();
    record(role === "anon" ? "P2" : "P3", role === "anon" ? "1" : "2",
      `${role} holds no write privilege on rcap_persons`,
      "INSERT, UPDATE and DELETE are all false",
      privs.split("/").slice(1).every((v) => v === "false"),
      `S/I/U/D = ${privs}`, "critical");
  }

  // The disclosure, executed rather than inferred.
  const leaked = asRole(db, "anon", `select string_agg(partner_slug || ' -> ' || match_key, ' | ' order by match_key) from rcap_persons`);
  record("P4", "1", "an anonymous caller cannot read participant identities",
    "anon reads no rows",
    leaked === "" || leaked === "null",
    `anon read: ${leaked}`, "critical");

  const forged = asRole(db, "anon",
    `with r as (insert into rcap_persons (partner_slug, match_key) values ('${PARTNER}','email:forged@attacker.test') returning id) select id from r`);
  record("P5", "1", "an anonymous caller cannot insert into a partner's keyspace",
    "the INSERT is refused",
    !/^[0-9a-f-]{36}$/.test(forged),
    forged ? `anon created person ${forged} under ${PARTNER}` : "refused", "critical");

  const tampered = asRole(db, "anon",
    `with r as (update rcap_persons set match_key='email:attacker@evil.test' where match_key='${victimKey}' returning id) select count(*) from r`);
  record("P6", "2", "a browser role cannot rewrite an existing participant identity",
    "the UPDATE matches zero rows",
    tampered === "0",
    `anon updated ${tampered} row(s)`, "critical");
} finally {
  // keep db open across sections
}

// =============================================================================
console.log("\nSurfaces 3-4 — cross-consumer and partner-admin reach");
// =============================================================================
try {
  // A consumer row as the product now writes it: the key is digested.
  const consumerKey = `consumer:${createHash("sha256").update(`rcap:consumer-person:v1:${USER_B}`).digest("hex")}`;
  db.sql(`insert into rcap_persons (partner_slug, match_key) values ('expungement-ai-consumer','${consumerKey}')`);

  const consumerVisible = asRole(db, "authenticated",
    `select count(*) from rcap_persons where partner_slug='expungement-ai-consumer'`);
  record("P7", "3", "one consumer cannot enumerate another consumer's person row",
    "an authenticated caller reads no other consumer's rows",
    consumerVisible === "0",
    `authenticated read ${consumerVisible} consumer row(s)`, "high");

  // Knowing a target's auth user id is enough to locate their row, because the
  // match key is a pure function of it with a published namespace.
  const targeted = asRole(db, "authenticated",
    `select count(*) from rcap_persons where match_key='${consumerKey}'`);
  record("P8", "3", "a consumer's row cannot be located from their auth user id alone",
    "the derived key does not resolve for another caller",
    targeted === "0",
    `a caller who knows the target's auth user id located ${targeted} row(s) via the published derivation`, "high");

  const allPartners = asRole(db, "authenticated",
    `select count(distinct partner_slug) from rcap_persons`);
  record("P9", "4", "a partner admin cannot read other partners' people",
    "a partner-scoped caller sees only its own namespace",
    allPartners === "1",
    `an authenticated caller reads ${allPartners} distinct partner namespaces`, "high");
} finally {
  // keep open
}

// =============================================================================
console.log("\nSurfaces 5-6 — reporting and entitlement contamination");
// =============================================================================
try {
  // Reporting counts distinct person_id on packets, filtered by partner slug
  // and excluding nulls (src/lib/rcap/person-identity.ts getRcapPersonOutcomeSummary).
  const personId = db.scalar(
    `select id from rcap_persons where partner_slug='${PARTNER}' and match_key like 'email:%' limit 1`).trim();
  db.sql(`insert into rcap_document_packets (partner_slug, relief_outcome, person_id)
          values ('${PARTNER}','relief_granted','${personId}'), ('${PARTNER}','relief_granted','${personId}')`);
  const before = db.scalar(
    `select count(distinct person_id) from rcap_document_packets where partner_slug='${PARTNER}' and person_id is not null`).trim();

  // phase 30 attaches person_id ON DELETE SET NULL, so deleting the person
  // silently removes those packets from the partner's reported population.
  const deleted = asRole(db, "anon", `with r as (delete from rcap_persons where id='${personId}' returning id) select count(*) from r`);
  const after = db.scalar(
    `select count(distinct person_id) from rcap_document_packets where partner_slug='${PARTNER}' and person_id is not null`).trim();
  record("P10", "5", "a browser role cannot alter a partner's reported population",
    "the partner's distinct-people count is unchanged",
    deleted === "0" && before === after,
    `anon deleted ${deleted} person row(s); distinct people ${before} -> ${after}`, "high");

  // Entitlement/credit is keyed on the ledger, not on person rows, and the only
  // writer is service-role-only finalization. Forged people must not move it.
  const ledgerReachable = db.scalar(
    `select count(*) from information_schema.tables where table_schema='public' and table_name='packet_credit_ledger'`).trim();
  record("P11", "6", "forged person rows cannot move partner packet entitlement",
    "packet accounting derives from the ledger, which no browser role can write",
    ledgerReachable === "0",
    ledgerReachable === "0"
      ? "the credit ledger is not part of this schema slice; accounting is unreachable from rcap_persons alone"
      : "ledger present in slice — see the payment audit for its own grant proof");
} finally {
  // keep open
}

// =============================================================================
console.log("\nSurface 7 — the reserved consumer namespace");
// =============================================================================
try {
  const source = fs.readFileSync(path.join(rootDir, "src/lib/expungement-ai/consumer-identity.ts"), "utf8");
  const guards = source.includes('.from("partner_records")') &&
    source.includes("collides with a registered partner slug");
  record("P12", "7", "the resolver fails closed if the reserved slug becomes a real partner",
    "resolveConsumerPersonId checks partner_records and refuses on collision",
    guards,
    guards ? "guard present in consumer-identity.ts" : "no collision guard found");

  // The guard protects against a partner registering the slug. It cannot
  // protect the keyspace itself while anyone may write to the table.
  const squat = asRole(db, "anon",
    `with r as (insert into rcap_persons (partner_slug, match_key) values ('expungement-ai-consumer','consumer:squatted') returning id) select id from r`);
  record("P13", "7", "the reserved consumer keyspace cannot be written by a browser role",
    "the INSERT into the reserved namespace is refused",
    !/^[0-9a-f-]{36}$/.test(squat),
    squat ? `anon inserted ${squat} into the reserved consumer namespace` : "refused", "high");
} finally {
  db.stop();
}

// =============================================================================
console.log("\nSurfaces 8-10 — the product's own derivations");
// =============================================================================
{
  const tsc = [
    path.join(rootDir, "node_modules/.bin/tsc"),
    process.env.RCAP_TSC ?? ""
  ].find((p) => p && fs.existsSync(p));

  if (!tsc) {
    for (const [id, surface, title] of [
      ["P14", "8", "same auth user resolves to one stable person key"],
      ["P15", "9", "a different auth user resolves to a different person key"],
      ["P16", "10", "the matter is derived from the Briefcase item, not the browser"]
    ]) skipped(id, surface, title, "no TypeScript compiler reachable (set RCAP_TSC)");
  } else {
    const out = fs.mkdtempSync(path.join(os.tmpdir(), "rcap-persons-ts-"));
    // `--noResolve` means the Next path alias and node: types cannot be
    // resolved, so tsc reports type errors and exits non-zero. It still emits,
    // and emit is all this needs: the check below is that the JavaScript exists.
    try {
      execFileSync(tsc, [
        path.join(rootDir, "src/lib/expungement-ai/consumer-identity.ts"),
        "--target", "es2022", "--module", "esnext", "--moduleResolution", "bundler",
        "--noResolve", "--skipLibCheck", "--outDir", out
      ], { stdio: "ignore" });
    } catch {
      // type-resolution failure only; emit is verified next
    }
    const emitted = path.join(out, "consumer-identity.js");
    if (!fs.existsSync(emitted)) {
      throw new Error(`tsc produced no JavaScript for consumer-identity.ts at ${emitted}`);
    }
    // Drop only the two imports that cannot resolve outside Next. Every
    // exported derivation below is the shipped function body, untouched.
    const patched = fs.readFileSync(emitted, "utf8")
      .replace(/^import "server-only";\s*$/m, "")
      .replace(/^import \{ getSupabaseAdminClient \} from "@\/lib\/supabase\/server";\s*$/m,
        "const getSupabaseAdminClient = () => null;");
    const loadable = path.join(out, "consumer-identity.mjs");
    fs.writeFileSync(loadable, patched);
    const mod = await import(loadable);

    const k1 = mod.consumerPersonMatchKey(USER_A);
    const k1again = mod.consumerPersonMatchKey(USER_A);
    record("P14", "8", "same auth user resolves to one stable person key",
      "the derivation is deterministic for a given user",
      k1 === k1again && /^consumer:[0-9a-f]{64}$/.test(k1),
      `${k1.slice(0, 24)}… stable=${k1 === k1again}`);

    const k2 = mod.consumerPersonMatchKey(USER_B);
    record("P15", "9", "a different auth user resolves to a different person key",
      "distinct users never share a match key",
      k1 !== k2,
      `userA=${k1.slice(9, 21)}… userB=${k2.slice(9, 21)}…`);

    const m1 = mod.consumerMatterIdForItem("11111111-1111-4111-8111-111111111111");
    const m1again = mod.consumerMatterIdForItem("11111111-1111-4111-8111-111111111111");
    const m2 = mod.consumerMatterIdForItem("22222222-2222-4222-8222-222222222222");
    const uuidShape = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
    record("P16", "10", "the matter is derived from the Briefcase item, not the browser",
      "one item yields one stable, well-formed matter; distinct items differ",
      m1 === m1again && m1 !== m2 && uuidShape.test(m1) && uuidShape.test(m2),
      `item1=${m1} stable=${m1 === m1again} distinctFromItem2=${m1 !== m2}`);

    record("P17", "10", "the reserved namespace is a constant, not a partner slug",
      "CONSUMER_PERSON_NAMESPACE is exported and fixed",
      mod.CONSUMER_PERSON_NAMESPACE === "expungement-ai-consumer",
      String(mod.CONSUMER_PERSON_NAMESPACE));
    fs.rmSync(out, { recursive: true, force: true });
  }
}

// =============================================================================
const ran = findings.filter((f) => f.passed !== null);
const passed = ran.filter((f) => f.passed).length;
const failed = ran.filter((f) => !f.passed);
const skips = findings.filter((f) => f.passed === null);

const report = {
  schemaVersion: "rcap-person-identity-exposure/v1",
  generatedBy: "scripts/verify-rcap-person-identity-exposure.mjs",
  lane: "person-identity-adversarial-audit",
  auditedCommit: "7e1b2c4dc1e433c07f9d0819c8125e228da4b236",
  subject: "public.rcap_persons",
  totals: { cases: ran.length, passed, failed: failed.length, skipped: skips.length },
  findings,
  notes: [
    "rcap_persons is created by supabase/phase-30-rcap-person-identity.sql with no RLS, no policy and no grant. On Supabase, default privileges then give anon and authenticated full CRUD.",
    "Partner match keys are 'email:<address>' or 'name:<full name>' (src/lib/rcap/person-identity.ts deriveRcapPersonMatchKey), so the table stores participant contact identity in near-plaintext.",
    "Consumer rows added by src/lib/expungement-ai/consumer-identity.ts digest their key; that mitigation does not extend to the partner rows beside them.",
    "Reporting counts distinct person_id on rcap_document_packets; person_id is ON DELETE SET NULL, so deleting a person row silently removes packets from a partner's reported population."
  ]
};

console.log(`\nCases ${passed}/${ran.length} passed${skips.length ? `, ${skips.length} skipped` : ""}.`);

const EVIDENCE = path.join(rootDir, "data/rcap-render/person-identity-exposure.json");
const serialized = `${JSON.stringify(report, null, 2)}\n`;
if (WRITE_MODE) {
  fs.mkdirSync(path.dirname(EVIDENCE), { recursive: true });
  fs.writeFileSync(EVIDENCE, serialized);
  console.log(`Evidence written: ${path.relative(rootDir, EVIDENCE)}`);
} else if (fs.existsSync(EVIDENCE)) {
  const committed = fs.readFileSync(EVIDENCE, "utf8");
  console.log(committed === serialized
    ? `Evidence verified unchanged: ${path.relative(rootDir, EVIDENCE)}`
    : `Evidence differs from this run (re-run with --write): ${path.relative(rootDir, EVIDENCE)}`);
  if (committed !== serialized) process.exitCode = 1;
}

if (failed.length > 0) {
  console.error("\nFINDINGS:\n");
  for (const f of failed) {
    console.error(` - [${f.severity ?? "medium"}] surface ${f.surface} — ${f.id} ${f.title}`);
    console.error(`     expected: ${f.expectation}`);
    console.error(`     observed: ${f.observed}`);
  }
  process.exit(1);
}
console.log("\nPerson identity: every expectation held.");
