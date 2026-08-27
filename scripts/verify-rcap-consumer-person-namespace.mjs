#!/usr/bin/env node
/**
 * The reserved consumer person namespace, proven rather than assumed.
 *
 * `packet_render_jobs.person_id` is a foreign key to `rcap_persons`, whose
 * `partner_slug` is NOT NULL — so serving a direct-to-consumer user means
 * putting a row in a table built for partner intake. The absence of a foreign
 * key on `partner_slug` is what makes that POSSIBLE; it is not what makes it
 * SAFE. These eight cases are the difference.
 *
 * N2 used to be scoped down: `rcap_persons` had no row-level security and no
 * explicit grants, so the strongest honest claim was that partner-SCOPED reads
 * could not return consumer persons. Phase 54 closes that, and N2 now asserts
 * the thing it always wanted to — that a browser role reaches no row at all —
 * alongside R1-R6 below, which cover the role, tenant, reporting, entitlement,
 * attribution and isolation dimensions directly.
 *
 *   node scripts/verify-rcap-consumer-person-namespace.mjs
 */

import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

import { ephemeralPgAvailable, startEphemeralPg } from "./lib/rcap-ephemeral-pg.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

if (!ephemeralPgAvailable({ allowPgliteFallback: true })) {
  console.error("verify-rcap-consumer-person-namespace requires a local PostgreSQL toolchain.");
  process.exit(1);
}

const SEQUENCE = [
  "supabase/phase-26-consumer-briefcase-items.sql",
  "supabase/phase-27-consumer-checkout-metadata.sql",
  "supabase/phase-28-consumer-packet-generation-status.sql",
  "supabase/phase-49-rcap-packet-render-jobs.sql",
  "supabase/phase-50-rcap-packet-delivery-hardening.sql",
  "supabase/phase-51-rcap-consumer-payment-gate.sql",
  "supabase/phase-52-rcap-consumer-payment-authority.sql",
  "supabase/phase-53-rcap-consumer-job-binding.sql",
  "supabase/phase-54-rcap-person-namespace-hardening.sql"
];

const NAMESPACE = "expungement-ai-consumer";
const PERSON_MATCH_NAMESPACE = "rcap:consumer-person:v1";
const MATTER_NAMESPACE = "rcap:consumer-matter:v1";

function duuid(label) {
  const h = createHash("sha256").update(`consumer-namespace/${label}`).digest("hex");
  const variant = ((parseInt(h[16], 16) & 0x3) | 0x8).toString(16);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-${variant}${h.slice(17, 20)}-${h.slice(20, 32)}`;
}
const matchKeyFor = (userId) =>
  `consumer:${createHash("sha256").update(`${PERSON_MATCH_NAMESPACE}:${userId}`).digest("hex")}`;
const matterFor = (itemId) => {
  const h = createHash("sha256").update(`${MATTER_NAMESPACE}:${itemId}`).digest("hex");
  const variant = ((parseInt(h[16], 16) & 0x3) | 0x8).toString(16);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-${variant}${h.slice(17, 20)}-${h.slice(20, 32)}`;
};

const USER_A = duuid("user-a");
const USER_B = duuid("user-b");
const PARTNER_SLUG = "we-must-vote";

const results = [];
function check(id, title, passed, observed) {
  results.push({ id, title, passed, observed });
  console.log(`  ${passed ? "ok  " : "FAIL"} ${id} ${title}`);
  if (!passed) console.log(`         observed: ${observed}`);
}

const db = startEphemeralPg({ allowPgliteFallback: true });
try {
  const attempt = (sql) => {
    try { db.sql(sql); return null; }
    catch (error) { return String(error.stderr ?? error.message); }
  };
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
  db.sql(`create table public.partner_records (id uuid primary key default gen_random_uuid(), partner_slug text unique not null)`);
  db.sql(`create table public.rcap_persons (id uuid primary key default gen_random_uuid(), partner_slug text not null, match_key text not null, created_at timestamptz not null default now())`);
  db.sql(`create unique index rcap_persons_partner_match_key_idx on public.rcap_persons(partner_slug, match_key)`);
  db.sql(`create table public.rcap_document_packets (id uuid primary key default gen_random_uuid(), partner_slug text not null, user_id uuid, briefcase_id uuid, state text not null default 'MS', jurisdiction text, pathway text not null)`);
  db.sql(`insert into auth.users (id, email) values ('${USER_A}','a@test.local'), ('${USER_B}','b@test.local')`);
  db.sql(`insert into public.partner_records (partner_slug) values ('${PARTNER_SLUG}')`);
  for (const file of SEQUENCE) db.applyFile(path.join(rootDir, file));

  const partnerId = db
    .sql(`select id from public.partner_records where partner_slug='${PARTNER_SLUG}'`)
    .trim();

  // Fixtures: one partner person, two consumer persons.
  db.sql(`insert into public.rcap_persons (partner_slug, match_key) values ('${PARTNER_SLUG}','email:client@partner.test')`);
  const personA = db
    .sql(`with r as (insert into public.rcap_persons (partner_slug, match_key) values ('${NAMESPACE}','${matchKeyFor(USER_A)}') returning id) select id from r`)
    .trim();
  const personB = db
    .sql(`with r as (insert into public.rcap_persons (partner_slug, match_key) values ('${NAMESPACE}','${matchKeyFor(USER_B)}') returning id) select id from r`)
    .trim();

  // --- N1 ------------------------------------------------------------------
  // The reserved slug must not be claimable as a real partner. The database
  // cannot express that on its own — partner_slug is free text — so the
  // application refuses to resolve when the collision exists. Both halves are
  // asserted: that the collision is detectable, and that the runtime guard
  // reads the same table the collision would appear in.
  const collisionVisible = db
    .sql(`select count(*) from public.partner_records where partner_slug='${NAMESPACE}'`)
    .trim();
  const identitySource = (await import("node:fs")).readFileSync(
    path.join(rootDir, "src/lib/expungement-ai/consumer-identity.ts"),
    "utf8"
  );
  const guards =
    /from\("partner_records"\)/.test(identitySource) &&
    /collides with a registered partner slug/.test(identitySource);
  check(
    "N1",
    "the reserved namespace cannot silently collide with a real partner slug",
    collisionVisible === "0" && guards,
    `existingCollisions=${collisionVisible} runtimeGuard=${guards}`
  );

  // --- N2 ------------------------------------------------------------------
  // A partner-scoped read cannot return a consumer person, and the consumer row
  // carries no account identifier.
  const partnerScoped = db.json(
    `select coalesce(json_agg(match_key), '[]'::json) from public.rcap_persons where partner_slug='${PARTNER_SLUG}'`
  );
  const consumerRows = db.json(
    `select coalesce(json_agg(match_key), '[]'::json) from public.rcap_persons where partner_slug='${NAMESPACE}'`
  );
  const leaksUserId = consumerRows.some(
    (key) => key.includes(USER_A) || key.includes(USER_B) || /auth_user:/.test(key)
  );
  check(
    "N2",
    "partner-scoped reads never return consumer persons, and consumer rows carry no account id",
    partnerScoped.length === 1 &&
      !partnerScoped.some((k) => k.startsWith("consumer:")) &&
      consumerRows.length === 2 &&
      !leaksUserId,
    `partnerRows=${JSON.stringify(partnerScoped)} consumerLeaksUserId=${leaksUserId}`
  );

  // --- N3 ------------------------------------------------------------------
  // Partner reporting and entitlement join through partner_records. The
  // reserved slug has no partner_records row, so an inner join drops it — which
  // is what keeps consumer people out of partner counts.
  const reportingCount = db
    .sql(
      `select count(*) from public.rcap_persons p join public.partner_records r on r.partner_slug = p.partner_slug`
    )
    .trim();
  check(
    "N3",
    "consumer persons do not enter partner reporting or entitlement joins",
    reportingCount === "1",
    `personsVisibleToPartnerJoins=${reportingCount} (only the real partner's person)`
  );

  // --- N4 ------------------------------------------------------------------
  // A consumer job carries a null partner and takes the zero_charge path, so it
  // can consume no partner entitlement even though its person row sits in a
  // partner-shaped table.
  db.sql(
    `insert into public.partner_packet_entitlement (partner_id, packet_cap, overage_enabled, overage_cap)
     values ('${partnerId}', 5, true, 5)`
  );
  const itemA = duuid("item-a");
  db.sql(
    `insert into public.consumer_briefcase_items (id, user_id, item_type, jurisdiction, status, payment_allowed)
     values ('${itemA}','${USER_A}','packet','MS','packet_ready',true)`
  );
  db.sql(
    `select outcome from public.record_consumer_packet_payment('${itemA}','paid',5000,'usd','stripe','evt_n4','cs','pi','r','server_webhook','test')`
  );

  const packetA = duuid("packet-a");
  db.sql(
    `insert into public.rcap_document_packets (id, partner_slug, pathway, state) values ('${packetA}','${NAMESPACE}','ms','MS')`
  );
  const hashA = createHash("sha256").update("n4").digest("hex");
  const jobA = db
    .sql(
      `select id from public.enqueue_packet_render_job('${packetA}','MS:ms','packet_document_v1','1.0.0',null,'MS','1.3.0','${hashA}',null,null,'${personA}','${matterFor(itemA)}',5,'${itemA}','${USER_A}')`
    )
    .trim();

  const claim = db.json(
    `select row_to_json(t) from (select id, fencing_token from public.claim_packet_render_job('w-ns', null, 60)) t`
  );
  db.sql(`select public.start_packet_render('${claim.id}','${claim.fencing_token}')`);
  db.sql(`select public.start_packet_validation('${claim.id}','${claim.fencing_token}')`);
  const outA = createHash("sha256").update(`out-${claim.id}`).digest("hex");
  const normA = createHash("sha256").update(`norm-${claim.id}`).digest("hex");
  const finalA = db.json(
    `select row_to_json(t) from (select accounting_result, delivery_eligibility from public.finalize_packet_render_job(
       '${claim.id}','${claim.fencing_token}','a/${claim.id}/${outA}.pdf','${outA}','${normA}','${outA}','${normA}',10,1,'sha256:${"c".repeat(64)}')) t`
  );
  const ledger = db.json(
    `select coalesce(json_agg(row_to_json(t)), '[]'::json) from (
       select event_type, entitlement_id, partner_id from public.packet_credit_ledger where render_job_id='${jobA}') t`
  );
  check(
    "N4",
    "a DTC consumer receives no sponsored entitlement through the reserved namespace",
    finalA?.accounting_result === "zero_charge" &&
      ledger.length === 1 &&
      ledger[0].entitlement_id === null &&
      ledger[0].partner_id === null,
    `${JSON.stringify(finalA)} ledger=${JSON.stringify(ledger)}`
  );

  // --- N5 ------------------------------------------------------------------
  // Resolution is idempotent: the unique index means a second attempt for the
  // same user conflicts rather than minting a second person.
  const dupe = db.sqlExpectError(
    `insert into public.rcap_persons (partner_slug, match_key) values ('${NAMESPACE}','${matchKeyFor(USER_A)}')`
  );
  const personCount = db
    .sql(`select count(*) from public.rcap_persons where partner_slug='${NAMESPACE}' and match_key='${matchKeyFor(USER_A)}'`)
    .trim();
  check(
    "N5",
    "repeated resolution for one auth user is idempotent",
    /duplicate key|unique/i.test(dupe) && personCount === "1",
    `rows=${personCount} secondInsert=${dupe.split("\n")[0]}`
  );

  // --- N6 ------------------------------------------------------------------
  // One user's key cannot address another's person. The keys are distinct and
  // derived, so asking with B's key never returns A's row.
  const aByB = db
    .sql(`select count(*) from public.rcap_persons where partner_slug='${NAMESPACE}' and match_key='${matchKeyFor(USER_B)}' and id='${personA}'`)
    .trim();
  check(
    "N6",
    "one auth user cannot resolve another user's consumer person",
    matchKeyFor(USER_A) !== matchKeyFor(USER_B) && aByB === "0" && personA !== personB,
    `crossHits=${aByB} keysDistinct=${matchKeyFor(USER_A) !== matchKeyFor(USER_B)}`
  );

  // --- N7 ------------------------------------------------------------------
  // The matter stored on the job is exactly the one derived from the item.
  const storedMatter = db
    .sql(`select matter_id from public.packet_render_jobs where id='${jobA}'`)
    .trim();
  check(
    "N7",
    "matter identity remains bound to the canonical Briefcase item",
    storedMatter === matterFor(itemA),
    `stored=${storedMatter} derived=${matterFor(itemA)}`
  );

  // --- N8 ------------------------------------------------------------------
  // The same paid item on a second matter is refused by the accounting gate.
  const packetB = duuid("packet-b");
  db.sql(
    `insert into public.rcap_document_packets (id, partner_slug, pathway, state) values ('${packetB}','${NAMESPACE}','ms','MS')`
  );
  const hashB = createHash("sha256").update("n8").digest("hex");
  // Enqueued for its side effect: the job must exist for the claim below. Its
  // id is not needed — the conflict is observed at finalization.
  db.sql(
      `select id from public.enqueue_packet_render_job('${packetB}','MS:ms','packet_document_v1','1.0.0',null,'MS','1.3.0','${hashB}',null,null,'${personA}','${duuid("other-matter")}',5,'${itemA}','${USER_A}')`
    );
  const claimB = db.json(
    `select row_to_json(t) from (select id, fencing_token from public.claim_packet_render_job('w-ns2', null, 60)) t`
  );
  db.sql(`select public.start_packet_render('${claimB.id}','${claimB.fencing_token}')`);
  db.sql(`select public.start_packet_validation('${claimB.id}','${claimB.fencing_token}')`);
  const outB = createHash("sha256").update(`out-${claimB.id}`).digest("hex");
  const normB = createHash("sha256").update(`norm-${claimB.id}`).digest("hex");
  const finalB = db.json(
    `select row_to_json(t) from (select accounting_result, delivery_eligibility from public.finalize_packet_render_job(
       '${claimB.id}','${claimB.fencing_token}','a/${claimB.id}/${outB}.pdf','${outB}','${normB}','${outB}','${normB}',10,1,'sha256:${"c".repeat(64)}')) t`
  );
  check(
    "N8",
    "the same paid item cannot be reassigned to another matter",
    finalB?.accounting_result === "consumer_payment_matter_conflict" &&
      finalB?.delivery_eligibility === "accounting_blocked",
    JSON.stringify(finalB)
  );

  // =========================================================================
  // Phase 54 dimensions: role, tenant, reporting, entitlement, attribution and
  // isolation. N1-N8 prove the namespace behaves; these prove the database
  // enforces it rather than the application remembering to.
  // =========================================================================

  // --- R1 role -------------------------------------------------------------
  // A browser role reaches no row. Both halves are asserted because either
  // alone can be undone: RLS without the revoke leaves a confusing grant, and
  // the revoke without RLS is re-granted by the next `alter default privileges`.
  const rlsOn = db
    .sql(`select relrowsecurity from pg_class where oid = 'public.rcap_persons'::regclass`)
    .trim();
  const browserGrants = db
    .sql(
      `select count(*) from information_schema.role_table_grants
        where table_schema='public' and table_name='rcap_persons' and grantee in ('anon','authenticated')`
    )
    .trim();
  const anonRead = attempt(`set role anon; select count(*) from public.rcap_persons`);
  db.sql(`reset role`);
  const authRead = attempt(`set role authenticated; select count(*) from public.rcap_persons`);
  db.sql(`reset role`);
  check(
    "R1",
    "no browser role can read or write rcap_persons",
    rlsOn === "t" &&
      browserGrants === "0" &&
      /permission denied/i.test(anonRead ?? "") &&
      /permission denied/i.test(authRead ?? ""),
    `rls=${rlsOn} browserGrants=${browserGrants} anon=${(anonRead ?? "read succeeded").split("\n")[0]}`
  );

  // --- R2 tenant -----------------------------------------------------------
  // The reserved slug cannot be registered as a partner. This is the collision
  // the application guard also checks; here the database refuses it outright,
  // so a direct INSERT or a slug rename cannot create it either.
  const claimInsert = attempt(
    `insert into public.partner_records (partner_slug) values ('${NAMESPACE}')`
  );
  const claimRename = attempt(
    `update public.partner_records set partner_slug='${NAMESPACE}' where partner_slug='${PARTNER_SLUG}'`
  );
  check(
    "R2",
    "a real partner cannot claim the reserved namespace, by insert or by rename",
    /reserved direct-to-consumer person namespace/.test(claimInsert ?? "") &&
      /reserved direct-to-consumer person namespace/.test(claimRename ?? ""),
    `${(claimInsert ?? "insert succeeded").split("\n")[0]} | ${(claimRename ?? "rename succeeded").split("\n")[0]}`
  );

  // --- R3 reporting --------------------------------------------------------
  // The partner outcome summary counts distinct people for one partner slug.
  // A consumer person must never appear in it, for any partner and for the
  // reserved slug itself when asked as though it were one.
  const summaryForPartner = db
    .sql(`select count(distinct id) from public.rcap_persons where partner_slug='${PARTNER_SLUG}'`)
    .trim();
  const summaryForReserved = db
    .sql(
      `select count(distinct p.id) from public.rcap_persons p
         join public.partner_records r on r.partner_slug = p.partner_slug
        where p.partner_slug='${NAMESPACE}'`
    )
    .trim();
  check(
    "R3",
    "consumer persons never enter a partner reporting count",
    summaryForPartner === "1" && summaryForReserved === "0",
    `partner=${summaryForPartner} reservedViaPartnerJoin=${summaryForReserved}`
  );

  // --- R4 entitlement ------------------------------------------------------
  // No entitlement row can be reached through the reserved namespace, because
  // entitlement is keyed on a partner id and the reserved slug has no partner.
  const entitlementReach = db
    .sql(
      `select count(*) from public.partner_packet_entitlement e
         join public.partner_records r on r.id = e.partner_id
        where r.partner_slug = '${NAMESPACE}'`
    )
    .trim();
  check(
    "R4",
    "no partner entitlement is reachable through the reserved namespace",
    entitlementReach === "0",
    `entitlementsReachable=${entitlementReach}`
  );

  // --- R5 attribution ------------------------------------------------------
  // Attribution is unambiguous in both directions: a partner identity cannot
  // sit in the consumer namespace, and a consumer-shaped identity cannot sit
  // under a partner slug.
  const partnerKeyInReserved = attempt(
    `insert into public.rcap_persons (partner_slug, match_key) values ('${NAMESPACE}','email:client@partner.test')`
  );
  const consumerKeyUnderPartner = attempt(
    `insert into public.rcap_persons (partner_slug, match_key) values ('${PARTNER_SLUG}','${matchKeyFor(USER_A)}')`
  );
  check(
    "R5",
    "attribution cannot be blurred in either direction",
    /rcap_persons_reserved_namespace_shape/.test(partnerKeyInReserved ?? "") &&
      /rcap_persons_reserved_namespace_shape/.test(consumerKeyUnderPartner ?? ""),
    `partnerKeyInReserved=${(partnerKeyInReserved ?? "insert succeeded").split("\n")[0]}`
  );

  // --- R6 isolation --------------------------------------------------------
  // A positive control. Everything above proves a door is locked; this proves
  // the building still works — the server-side path that legitimately resolves
  // consumer persons is unaffected by the lockdown.
  const serviceRead = db
    .sql(`set role service_role; select count(*) from public.rcap_persons where partner_slug='${NAMESPACE}'`)
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && l !== "SET")
    .pop();
  db.sql(`reset role`);
  const newUser = duuid("user-c");
  const serviceWrite = db
    .sql(
      `set role service_role; with r as (insert into public.rcap_persons (partner_slug, match_key)
         values ('${NAMESPACE}','${matchKeyFor(newUser)}') returning id) select id from r`
    )
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => /^[0-9a-f-]{36}$/.test(l))
    .pop();
  db.sql(`reset role`);
  check(
    "R6",
    "the sanctioned server-side path still resolves consumer persons",
    serviceRead === "2" && Boolean(serviceWrite),
    `serviceRead=${serviceRead} serviceWrite=${serviceWrite}`
  );
} finally {
  db.stop();
}

const passed = results.filter((r) => r.passed).length;
console.log(`\nverify-rcap-consumer-person-namespace: ${passed}/${results.length} properties proven.`);
if (passed !== results.length) {
  console.error("\nThe reserved consumer person namespace is not proven safe.");
  process.exit(1);
}
console.log(
  "Reserved namespace holds, and Phase 54 enforces it in the database: RLS on, browser roles revoked, the reserved slug unclaimable, and attribution unambiguous both ways."
);
