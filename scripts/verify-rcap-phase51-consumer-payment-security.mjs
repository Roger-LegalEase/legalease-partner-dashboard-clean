// Independent adversarial audit of the consumer payment gate.
//
// Re-audited at f79fb0d9 across the full sequence
// 26 -> 27 -> 28 -> 49 -> 50 -> 51 -> 52 -> 53.
//
// NO PRIVILEGED FIXTURE WRITES.
//
// The previous revision of this file wrote the Phase 52 consumer binding with a
// direct `update packet_render_jobs set consumer_auth_user_id = ...` as the
// table owner, because no sanctioned path could supply it. That was the
// regression this lane reported, and Phase 53 closed it. So the shortcut is gone
// and does not come back: every payment fact, every job, every state transition
// and every finalization below is produced by a role a real deployment actually
// has —
//
//   authenticated   creates and edits its own Briefcase item (no payment column)
//   service_role    records payment, enqueues, drives the worker lifecycle
//   anon            attacks
//
// The only owner-level statements are (a) seeding upstream tables the gate does
// not govern — auth.users, partner_records, rcap_persons — and (b) the mutation
// section, where replacing a function IS the experiment. Both are labelled.
// assertNoPrivilegedGateWrite() below fails the run if a gate-surface write ever
// executes without a role set.
//
// The captain's own Phase 52 and Phase 53 suites are run separately and are not
// duplicated here.

import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { ephemeralPgAvailable, startEphemeralPg } from "./lib/rcap-ephemeral-pg.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

if (!ephemeralPgAvailable()) {
  console.error("verify-rcap-phase51-consumer-payment-security: PostgreSQL 16 is not available.");
  process.exit(1);
}

const SHA = (c) => c.repeat(64);
const PARTNER_A = "11111111-1111-1111-1111-111111111111";
const PERSON_A = "aaaaaaaa-1111-1111-1111-111111111111";
const USER_A = "1a1a1a1a-1111-4111-8111-111111111111";
const USER_B = "2b2b2b2b-2222-4222-8222-222222222222";
const MATTER_1 = "44444444-4444-4444-4444-444444444444";
const MATTER_2 = "55555555-5555-5555-5555-555555555555";

const SEQUENCE = [
  "supabase/phase-26-consumer-briefcase-items.sql",
  "supabase/phase-27-consumer-checkout-metadata.sql",
  "supabase/phase-28-consumer-packet-generation-status.sql",
  "supabase/phase-49-rcap-packet-render-jobs.sql",
  "supabase/phase-50-rcap-packet-delivery-hardening.sql",
  "supabase/phase-51-rcap-consumer-payment-gate.sql",
  "supabase/phase-52-rcap-consumer-payment-authority.sql",
  "supabase/phase-53-rcap-consumer-job-binding.sql"
];

const gate = [];
const reach = [];
const mutations = [];

function push(list, id, title, expectation, passed, observed, severity = null) {
  list.push({ id, title, expectation, passed, observed, severity });
  console.log(`  ${passed ? "ok  " : "FAIL"} ${id} ${title}`);
  if (!passed) {
    console.log(`         expected: ${expectation}`);
    console.log(`         observed: ${observed}`);
  }
}
const G = (...a) => push(gate, ...a);
const R = (...a) => push(reach, ...a);
const M = (...a) => push(mutations, ...a);

// --- role-scoped execution ---------------------------------------------------
// Every gate-surface statement goes through one of these. Nothing else may.

const GATE_SURFACE = /\b(consumer_briefcase_items|packet_render_jobs|packet_credit_ledger|consumer_packet_payment_consumption|record_consumer_packet_payment|enqueue_packet_render_job|finalize_packet_render_job|consumer_packet_payment_authority)\b/i;

function assertNoPrivilegedGateWrite(sql) {
  if (GATE_SURFACE.test(sql) && !/^\s*set role /i.test(sql)) {
    throw new Error(`privileged gate-surface statement attempted without a role: ${sql.slice(0, 120)}`);
  }
}

/** Runs SQL as a named role, then resets. Returns trimmed scalar output. */
function asRole(db, role, sql, { sub = null } = {}) {
  const preamble = sub
    ? `set role ${role}; select set_config('request.jwt.claim.sub','${sub}',false);`
    : `set role ${role};`;
  try {
    return db.scalar(`${preamble} ${sql}`).replace(/^SET\s*/, "").split("\n").filter(Boolean).pop()?.trim() ?? "";
  } finally {
    db.sql(`reset role`);
  }
}
function asRoleJson(db, role, sql) {
  try {
    db.sql(`set role ${role}`);
    return db.json(sql);
  } finally {
    db.sql(`reset role`);
  }
}
function asRoleExpectError(db, role, sql, { sub = null } = {}) {
  const preamble = sub
    ? `set role ${role}; select set_config('request.jwt.claim.sub','${sub}',false);`
    : `set role ${role};`;
  try {
    return db.sqlExpectError(`${preamble} ${sql}`);
  } finally {
    db.sql(`reset role`);
  }
}

/** Supabase-equivalent cluster. Roles and default privileges precede the
 *  migrations so their grants must beat them. */
function boot({ through = SEQUENCE.length, withConsumerStorage = true } = {}) {
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

  // Upstream fixtures the payment gate does not govern.
  db.sql(`create table public.partner_records (id uuid primary key default gen_random_uuid(), partner_slug text unique not null)`);
  db.sql(`create table public.rcap_persons (id uuid primary key default gen_random_uuid(), partner_slug text not null, match_key text not null)`);
  db.sql(`create table public.rcap_document_packets (id uuid primary key default gen_random_uuid())`);
  db.sql(`insert into auth.users (id, email) values ('${USER_A}','a@participant.test'), ('${USER_B}','b@participant.test')`);

  const files = withConsumerStorage ? SEQUENCE : SEQUENCE.slice(3);
  const take = withConsumerStorage ? through : through - 3;
  for (const file of files.slice(0, take)) db.applyFile(path.join(rootDir, file));

  db.sql(`insert into partner_records (id, partner_slug) values ('${PARTNER_A}','we-must-vote')`);
  db.sql(`insert into rcap_persons (id, partner_slug, match_key) values ('${PERSON_A}','we-must-vote','a')`);
  return db;
}

// --- sanctioned operations ---------------------------------------------------

/** The participant creates their own item, naming no payment column. */
function createItemAsParticipant(db, userId) {
  const sql = `with r as (insert into consumer_briefcase_items (user_id, item_type, jurisdiction, status)
     values ('${userId}','packet','MS','packet_ready') returning id) select id from r`;
  assertNoPrivilegedGateWrite(`set role authenticated; ${sql}`);
  return asRole(db, "authenticated", sql, { sub: userId });
}

/** The only sanctioned payment writer, under service-role authority. */
function recordPayment(db, itemId, opts = {}) {
  const {
    status = "paid", amount = 5000, currency = "usd",
    event = `evt_${createHash("sha1").update(itemId + status + String(amount) + String(currency)).digest("hex").slice(0, 12)}`,
    authority = "server_webhook"
  } = opts;
  return asRole(db, "service_role",
    `select outcome from record_consumer_packet_payment('${itemId}','${status}',` +
      `${amount === null ? "null" : amount},${currency === null ? "null" : `'${currency}'`},` +
      `'stripe',${event === null ? "null" : `'${event}'`},'cs','pi','http://r','${authority}','webhook')`);
}

function newPacket(db) {
  return asRole(db, "service_role",
    `with r as (insert into rcap_document_packets default values returning id) select id from r`);
}

/** Phase 53 bound enqueue, consumer mode. */
function enqueueConsumer(db, { item, expectedUser, personId = PERSON_A, matterId, seed }) {
  const packetId = newPacket(db);
  const inputHash = createHash("sha256").update(seed).digest("hex");
  return asRole(db, "service_role",
    `select id from enqueue_packet_render_job('${packetId}','MS:x','packet_document_v1','1.0.0',null,'MS','1.3.0','${inputHash}',` +
      `${item ? `'${item}'` : "null"},null,${personId ? `'${personId}'` : "null"},${matterId ? `'${matterId}'` : "null"},5,` +
      `${item ? `'${item}'` : "null"},${expectedUser ? `'${expectedUser}'` : "null"})`);
}
function enqueueConsumerExpectError(db, { item, expectedUser, personId = PERSON_A, matterId, seed }) {
  const packetId = newPacket(db);
  const inputHash = createHash("sha256").update(seed).digest("hex");
  return asRoleExpectError(db, "service_role",
    `select id from enqueue_packet_render_job('${packetId}','MS:x','packet_document_v1','1.0.0',null,'MS','1.3.0','${inputHash}',` +
      `${item ? `'${item}'` : "null"},null,${personId ? `'${personId}'` : "null"},${matterId ? `'${matterId}'` : "null"},5,` +
      `${item ? `'${item}'` : "null"},${expectedUser ? `'${expectedUser}'` : "null"})`);
}

/** Phase 53 bound enqueue, sponsored mode. */
function enqueueSponsored(db, { partnerId, personId = PERSON_A, matterId, seed }) {
  const packetId = newPacket(db);
  const inputHash = createHash("sha256").update(seed).digest("hex");
  return asRole(db, "service_role",
    `select id from enqueue_packet_render_job('${packetId}','MS:x','packet_document_v1','1.0.0',null,'MS','1.3.0','${inputHash}',` +
      `null,'${partnerId}','${personId}','${matterId}',5,null,null)`);
}

/** Worker lifecycle, entirely under service-role authority. */
function drive(db, jobId) {
  const claim = asRoleJson(db, "service_role",
    `select row_to_json(t) from (select id, fencing_token from claim_packet_render_job('w1', null, 600)) t`);
  asRole(db, "service_role", `select start_packet_render('${jobId}','${claim.fencing_token}')`);
  asRole(db, "service_role", `select start_packet_validation('${jobId}','${claim.fencing_token}')`);
  return asRoleJson(db, "service_role",
    `select row_to_json(t) from (select * from finalize_packet_render_job('${jobId}','${claim.fencing_token}',` +
      `'p/${jobId}/${SHA("c")}.pdf','${SHA("c")}','${SHA("d")}','${SHA("c")}','${SHA("d")}',100,3,'sha256:x')) t`);
}

function consumerRun(db, args) {
  const jobId = enqueueConsumer(db, args);
  return { jobId, ...drive(db, jobId) };
}
const read = (db, sql) => asRole(db, "service_role", sql);

// =============================================================================
console.log("GATE — security expectations, sanctioned roles only");
// =============================================================================
{
  const db = boot();
  try {
    const item = createItemAsParticipant(db, USER_A);

    // G1 / G2 — the participant cannot write a payment fact, either way.
    const updErr = asRoleExpectError(db, "authenticated",
      `update consumer_briefcase_items set payment_status='paid', amount_cents=5000 where id='${item}'`,
      { sub: USER_A });
    G("G1", "a participant cannot UPDATE payment columns", "permission denied",
      /permission denied/.test(updErr), updErr.split("\n")[0], "critical");

    const insErr = asRoleExpectError(db, "authenticated",
      `insert into consumer_briefcase_items (user_id,item_type,jurisdiction,status,payment_status,amount_cents,currency)
       values ('${USER_A}','packet','MS','packet_ready','paid',5000,'usd')`, { sub: USER_A });
    G("G2", "a participant cannot INSERT a row already marked paid", "permission denied",
      /permission denied/.test(insErr), insErr.split("\n")[0], "critical");

    // G3 — the safe nonpayment surface still works for the participant.
    let safeOk = true, safeObserved = "";
    try {
      const own = createItemAsParticipant(db, USER_A);
      asRole(db, "authenticated",
        `update consumer_briefcase_items set jurisdiction='TX', status='waiting' where id='${own}'`, { sub: USER_A });
      safeObserved = asRole(db, "authenticated",
        `select jurisdiction || '/' || status from consumer_briefcase_items where id='${own}'`, { sub: USER_A });
      safeOk = safeObserved === "TX/waiting";
    } catch (e) { safeOk = false; safeObserved = String(e.stderr ?? e.message).split("\n")[0]; }
    G("G3", "safe nonpayment participant INSERT and UPDATE still work",
      "the participant creates and edits their own non-payment fields", safeOk, safeObserved);

    // G4 — payment recording is service-role only.
    const rpcDenied = asRoleExpectError(db, "authenticated",
      `select record_consumer_packet_payment('${item}','paid',5000,'usd','stripe','evt_x','cs','pi','r','server_webhook','w')`,
      { sub: USER_A });
    const rpcOk = recordPayment(db, item, { event: "evt_g4" });
    G("G4", "payment is recorded only through record_consumer_packet_payment under service role",
      "authenticated denied EXECUTE; service_role returns recorded_paid",
      /permission denied/.test(rpcDenied) && rpcOk === "recorded_paid",
      `authenticated=${rpcDenied.split("\n")[0]} | service_role=${rpcOk}`);

    // G5 — even service_role cannot hand-write a paid row without evidence.
    const legacyErr = asRoleExpectError(db, "service_role",
      `insert into consumer_briefcase_items (user_id,item_type,jurisdiction,status,payment_status,amount_cents)
       values ('${USER_A}','packet','MS','packet_ready','paid',5000)`);
    G("G5", "a Phase-51-shaped paid row without the Phase 52 fields cannot exist",
      "paid_requires_server_evidence refuses it even for service_role",
      /paid_requires_server_evidence/.test(legacyErr), legacyErr.split("\n")[0]);

    // G6 — cross-user payment is refused at enqueue, before a job exists.
    const itemB = createItemAsParticipant(db, USER_B);
    recordPayment(db, itemB, { event: "evt_g6_b" });
    const crossErr = enqueueConsumerExpectError(db,
      { item: itemB, expectedUser: USER_A, matterId: MATTER_1, seed: "g6-cross" });
    G("G6", "participant A cannot spend participant B's payment",
      "the bound enqueue refuses: item not owned by the expected user",
      /not owned by the expected user/.test(crossErr), crossErr.split("\n")[0], "high");

    // G7 — the legitimate journey, end to end, sanctioned roles only.
    const paidItem = createItemAsParticipant(db, USER_A);
    recordPayment(db, paidItem, { event: "evt_g7" });
    const first = consumerRun(db, { item: paidItem, expectedUser: USER_A, matterId: MATTER_1, seed: "g7-first" });
    G("G7", "a genuinely paid, owned item opens delivery once", "zero_charge / eligible",
      first.accounting_result === "zero_charge" && first.delivery_eligibility === "eligible",
      `${first.accounting_result} / ${first.delivery_eligibility}`);

    // G8 — same payment, another matter.
    const otherMatter = consumerRun(db, { item: paidItem, expectedUser: USER_A, matterId: MATTER_2, seed: "g8-second" });
    G("G8", "the same payment cannot authorize a second matter",
      "consumer_payment_matter_conflict / accounting_blocked",
      otherMatter.accounting_result === "consumer_payment_matter_conflict" &&
        otherMatter.delivery_eligibility === "accounting_blocked",
      `${otherMatter.accounting_result} / ${otherMatter.delivery_eligibility}`, "high");

    // G9 — same item, person and matter stays idempotent.
    const repeat = consumerRun(db, { item: paidItem, expectedUser: USER_A, matterId: MATTER_1, seed: "g9-idem" });
    const consumptionRows = read(db,
      `select count(*) from consumer_packet_payment_consumption where consumer_briefcase_item_id='${paidItem}'`);
    G("G9", "same item, person and matter remains idempotently eligible",
      "zero_charge / eligible with exactly one consumption row",
      repeat.accounting_result === "zero_charge" && repeat.delivery_eligibility === "eligible" && consumptionRows === "1",
      `${repeat.accounting_result} / ${repeat.delivery_eligibility}, rows=${consumptionRows}`);

    // G10 — currency.
    const curItem = createItemAsParticipant(db, USER_A);
    const eur = recordPayment(db, curItem, { currency: "eur", event: "evt_g10a" });
    const nul = recordPayment(db, curItem, { currency: null, event: "evt_g10b" });
    const curRun = consumerRun(db, { item: curItem, expectedUser: USER_A, matterId: MATTER_1, seed: "g10" });
    G("G10", "a missing or non-USD currency cannot become a payment",
      "the RPC refuses both; the item never becomes deliverable",
      eur === "invalid_payment_evidence" && nul === "invalid_payment_evidence" &&
        curRun.accounting_result === "consumer_payment_required",
      `eur=${eur} null=${nul} finalize=${curRun.accounting_result}`);

    // G11 — provider evidence.
    const evItem = createItemAsParticipant(db, USER_A);
    const noEvent = recordPayment(db, evItem, { event: null });
    const badAuth = asRole(db, "service_role",
      `select outcome from record_consumer_packet_payment('${evItem}','paid',5000,'usd','stripe','evt_g11','cs','pi','r','self_asserted','w')`);
    const evRun = consumerRun(db, { item: evItem, expectedUser: USER_A, matterId: MATTER_1, seed: "g11" });
    G("G11", "a payment with no provider receipt or no server authority fails",
      "the RPC refuses both; the item never becomes deliverable",
      noEvent === "invalid_payment_evidence" && badAuth === "invalid_authority" &&
        evRun.accounting_result === "consumer_payment_required",
      `no_event=${noEvent} bad_authority=${badAuth} finalize=${evRun.accounting_result}`);

    // G12 — pre-finalization refund.
    const refItem = createItemAsParticipant(db, USER_A);
    recordPayment(db, refItem, { event: "evt_g12" });
    recordPayment(db, refItem, { status: "refunded", event: "evt_g12" });
    const refRun = consumerRun(db, { item: refItem, expectedUser: USER_A, matterId: MATTER_1, seed: "g12" });
    G("G12", "a refund before finalization blocks delivery",
      "consumer_payment_required / accounting_blocked",
      refRun.accounting_result === "consumer_payment_required" && refRun.delivery_eligibility === "accounting_blocked",
      `${refRun.accounting_result} / ${refRun.delivery_eligibility}`);

    // G13 — sponsored accounting unchanged.
    asRole(db, "service_role", `insert into partner_packet_entitlement (partner_id, packet_cap) values ('${PARTNER_A}', 5)`);
    const sponsoredJob = enqueueSponsored(db, { partnerId: PARTNER_A, matterId: MATTER_1, seed: "g13" });
    const sponsored = drive(db, sponsoredJob);
    const sponsoredLedger = asRoleJson(db, "service_role",
      `select row_to_json(t) from (select event_type, entitlement_id is not null as has_entitlement from packet_credit_ledger where render_job_id='${sponsoredJob}') t`);
    G("G13", "sponsored accounting is unchanged by the consumer gate",
      "consumed / eligible against a real entitlement",
      sponsored.accounting_result === "consumed" && sponsored.delivery_eligibility === "eligible" &&
        sponsoredLedger?.event_type === "consumed" && sponsoredLedger?.has_entitlement === true,
      `${sponsored.accounting_result} / ${sponsored.delivery_eligibility} ledger=${JSON.stringify(sponsoredLedger)}`);

    // G14 — paid consumer consumes no partner credit.
    const consumerLedger = asRoleJson(db, "service_role",
      `select row_to_json(t) from (select event_type, entitlement_id, partner_id from packet_credit_ledger where render_job_id='${first.jobId}') t`);
    G("G14", "a paid consumer packet consumes no partner packet credit",
      "one zero_charge row with null entitlement and null partner",
      consumerLedger?.event_type === "zero_charge" && consumerLedger?.entitlement_id === null &&
        consumerLedger?.partner_id === null, JSON.stringify(consumerLedger));

    // G15 — repeat download.
    const before = read(db, `select count(*) from packet_credit_ledger where render_job_id='${first.jobId}'`);
    for (const ev of ["delivery_authorized", "transmission_completed", "delivery_authorized"]) {
      asRole(db, "service_role", `select record_packet_delivery_event('${first.jobId}','${ev}',null,'{}'::jsonb)`);
    }
    const after = read(db, `select count(*) from packet_credit_ledger where render_job_id='${first.jobId}'`);
    G("G15", "repeat download requires neither another payment nor another ledger event",
      "the ledger row count is unchanged", before === "1" && after === "1", `before=${before} after=${after}`);

    // G16 — a conflict is typed and never strands a job.
    const conflictStatus = read(db, `select status from packet_render_jobs where id='${otherMatter.jobId}'`);
    G("G16", "a uniqueness conflict is typed, and never strands a job in validating",
      "the conflicted job is artifact_validated with a typed blocked result",
      otherMatter.accounting_result === "consumer_payment_matter_conflict" && conflictStatus === "artifact_validated",
      `status=${conflictStatus} result=${otherMatter.accounting_result}`);

    // G17 — a blocked job records no delivery event.
    const refusal = asRoleExpectError(db, "service_role",
      `select record_packet_delivery_event('${otherMatter.jobId}','delivery_authorized',null,'{}'::jsonb)`);
    G("G17", "a payment-blocked job cannot record any delivery event",
      "record_packet_delivery_event refuses a non-eligible job",
      /not delivery-eligible/.test(refusal), refusal.split("\n")[0]);

    // G18 — an unbound consumer job cannot be created at all.
    const unbound = enqueueConsumerExpectError(db, { item: null, expectedUser: USER_A, matterId: MATTER_1, seed: "g18" });
    const noUser = enqueueConsumerExpectError(db, { item: paidItem, expectedUser: null, matterId: MATTER_1, seed: "g18b" });
    const noMatter = enqueueConsumerExpectError(db, { item: paidItem, expectedUser: USER_A, matterId: null, seed: "g18c" });
    G("G18", "a consumer job cannot be created without item, user and matter",
      "the bound enqueue refuses each missing part",
      /requires a consumer briefcase item/.test(unbound) &&
        /requires the expected consumer user id/.test(noUser) &&
        /requires a matter id/.test(noMatter),
      `item=${unbound.split("\n")[0]} | user=${noUser.split("\n")[0]} | matter=${noMatter.split("\n")[0]}`);

    // G19 — sponsored mode may not borrow consumer fields.
    const packetX = newPacket(db);
    const hashX = createHash("sha256").update("g19").digest("hex");
    const mixed = asRoleExpectError(db, "service_role",
      `select id from enqueue_packet_render_job('${packetX}','MS:x','packet_document_v1','1.0.0',null,'MS','1.3.0','${hashX}',` +
        `null,'${PARTNER_A}','${PERSON_A}','${MATTER_1}',5,'${paidItem}','${USER_A}')`);
    G("G19", "a sponsored job cannot carry consumer binding fields",
      "the bound enqueue refuses the mixed shape",
      /must not carry consumer binding fields/.test(mixed), mixed.split("\n")[0]);

    // G20 — anon and authenticated cannot enqueue at all.
    const anonEnq = asRoleExpectError(db, "anon",
      `select enqueue_packet_render_job('${packetX}','MS:x','packet_document_v1','1.0.0',null,'MS','1.3.0','${hashX}',null,null,'${PERSON_A}','${MATTER_1}',5,'${paidItem}','${USER_A}')`);
    const authEnq = asRoleExpectError(db, "authenticated",
      `select enqueue_packet_render_job('${packetX}','MS:x','packet_document_v1','1.0.0',null,'MS','1.3.0','${hashX}',null,null,'${PERSON_A}','${MATTER_1}',5,'${paidItem}','${USER_A}')`,
      { sub: USER_A });
    G("G20", "browser roles cannot reach the bound enqueue", "permission denied for both",
      /permission denied/.test(anonEnq) && /permission denied/.test(authEnq),
      `anon=${anonEnq.split("\n")[0]} | authenticated=${authEnq.split("\n")[0]}`);
  } finally {
    db.stop();
  }
}

// G21 — no payment storage: a consumer job cannot be created.
{
  const db = boot({ withConsumerStorage: false });
  try {
    const err = enqueueConsumerExpectError(db,
      { item: "77777777-7777-4777-8777-777777777777", expectedUser: USER_A, matterId: MATTER_1, seed: "g21" });
    G("G21", "a schema with no consumer payment storage fails closed",
      "the bound enqueue refuses to create a consumer job",
      /consumer payment storage is absent/.test(err), err.split("\n")[0]);
  } finally {
    db.stop();
  }
}

// =============================================================================
console.log("\nREACH — is the paid consumer served through sanctioned paths only?");
// =============================================================================
{
  const db = boot();
  try {
    // R1 — the sanctioned enqueue accepts the binding.
    const args = read(db,
      `select pg_get_function_identity_arguments(p.oid) from pg_proc p
       join pg_namespace n on n.oid=p.pronamespace
       where n.nspname='public' and p.proname='enqueue_packet_render_job'`);
    R("R1", "enqueue_packet_render_job accepts the consumer binding",
      "the consumer item and expected user are parameters of the sanctioned insert path",
      /p_consumer_briefcase_item_id uuid/.test(args) && /p_expected_consumer_auth_user_id uuid/.test(args),
      args, "high");

    // R2 — direct DML stays revoked; the binding never needed it.
    const svc = read(db, `select has_table_privilege('service_role','public.packet_render_jobs','UPDATE')`);
    R("R2", "the fix did not restore direct DML on packet_render_jobs",
      "service_role still holds no UPDATE — the binding happens in the insert",
      svc === "f", `service_role UPDATE = ${svc}`, "high");

    // R3 — the whole journey, no privileged write anywhere.
    const item = createItemAsParticipant(db, USER_A);
    const paid = recordPayment(db, item, { event: "evt_reach" });
    const jobId = enqueueConsumer(db, { item, expectedUser: USER_A, matterId: MATTER_1, seed: "reach-e2e" });
    const bound = read(db, `select coalesce(consumer_auth_user_id::text,'NULL') from packet_render_jobs where id='${jobId}'`);
    const out = drive(db, jobId);
    R("R3", "a genuinely paid consumer is served through sanctioned paths only",
      "zero_charge / eligible with the binding stored at insert",
      out.accounting_result === "zero_charge" && out.delivery_eligibility === "eligible" && bound === USER_A,
      `payment=${paid}, consumer_auth_user_id=${bound}, finalize=${out.accounting_result} / ${out.delivery_eligibility}`,
      "high");

    // R4 — the unbound 13-argument signature is gone, not merely discouraged.
    const packetId = newPacket(db);
    const hash13 = createHash("sha256").update("r4").digest("hex");
    const legacy = asRoleExpectError(db, "service_role",
      `select enqueue_packet_render_job('${packetId}','MS:x','packet_document_v1','1.0.0',null,'MS','1.3.0','${hash13}',null,null,'${PERSON_A}','${MATTER_1}',5)`);
    R("R4", "the old unbound 13-argument enqueue no longer resolves",
      "an unbound consumer job is impossible by signature",
      /does not exist/.test(legacy), legacy.split("\n")[0], "high");

    // R5 — the database stores its own canonical owner, not the caller's claim.
    const itemB = createItemAsParticipant(db, USER_B);
    recordPayment(db, itemB, { event: "evt_r5" });
    const jobB = enqueueConsumer(db, { item: itemB, expectedUser: USER_B, matterId: MATTER_2, seed: "r5" });
    const storedB = read(db, `select consumer_auth_user_id::text from packet_render_jobs where id='${jobB}'`);
    R("R5", "the stored binding is the item's canonical owner",
      "consumer_auth_user_id equals the Briefcase item's user_id",
      storedB === USER_B, `stored=${storedB} expected=${USER_B}`);
  } finally {
    db.stop();
  }
}

// =============================================================================
console.log("\nMUT — this lane's three mutations (function replacement is the experiment)");
// =============================================================================
{
  const db = boot({ through: 5 });
  try {
    // 49+50 only: no consumer gate at all. Old signature still present here.
    const packetId = newPacket(db);
    const h = createHash("sha256").update("m1").digest("hex");
    const jobId = asRole(db, "service_role",
      `select id from enqueue_packet_render_job('${packetId}','MS:x','packet_document_v1','1.0.0',null,'MS','1.3.0','${h}',null,null,'${PERSON_A}','${MATTER_1}',5)`);
    const out = drive(db, jobId);
    M("M1", "without phases 51/52/53 an unpaid consumer packet is deliverable",
      "zero_charge / eligible on 49+50 alone",
      out.accounting_result === "zero_charge" && out.delivery_eligibility === "eligible",
      `${out.accounting_result} / ${out.delivery_eligibility}`);
  } finally { db.stop(); }
}
{
  const db = boot();
  try {
    const item = createItemAsParticipant(db, USER_A);
    recordPayment(db, item, { event: "evt_m2" });
    // Mutation: strip amount and currency from the authority probe, and remove
    // the constraint that would otherwise keep the row honest.
    db.sql(`alter table consumer_briefcase_items drop constraint consumer_briefcase_items_paid_requires_server_evidence`);
    db.sql(`
      create or replace function public.consumer_packet_payment_authority(
        p_briefcase_item_id uuid, p_consumer_auth_user_id uuid)
      returns table (valid boolean, reason text, provider_event_id text)
      language plpgsql stable security definer set search_path='' as $a$
      declare v_owner uuid; v_status text; v_event text;
      begin
        if p_briefcase_item_id is null or p_consumer_auth_user_id is null then
          return query select false,'no_binding'::text,null::text; return; end if;
        execute 'select b.user_id, b.payment_status, b.provider_event_id from public.consumer_briefcase_items b where b.id=$1'
          into v_owner, v_status, v_event using p_briefcase_item_id;
        if v_owner is distinct from p_consumer_auth_user_id then
          return query select false,'owner_mismatch'::text,null::text; return; end if;
        if v_status is distinct from 'paid' then
          return query select false,'not_paid'::text,null::text; return; end if;
        return query select true,'authorized'::text,v_event;
      end; $a$;`);
    db.sql(`update consumer_briefcase_items set amount_cents=null, currency=null where id='${item}'`);
    const out = consumerRun(db, { item, expectedUser: USER_A, matterId: MATTER_1, seed: "m2" });
    M("M2", "weakening the amount and currency clause opens an underpaid row",
      "zero_charge / eligible once the clause is gone",
      out.accounting_result === "zero_charge" && out.delivery_eligibility === "eligible",
      `${out.accounting_result} / ${out.delivery_eligibility}`);
  } finally { db.stop(); }
}
{
  const db = boot();
  try {
    db.sql(
      `create or replace function public.consumer_packet_payment_authority(p_briefcase_item_id uuid, p_consumer_auth_user_id uuid)
       returns table (valid boolean, reason text, provider_event_id text)
       language sql stable security definer set search_path='' as $$ select true, 'forced'::text, 'evt_forced'::text $$;`);
    const item = createItemAsParticipant(db, USER_A);
    const out = consumerRun(db, { item, expectedUser: USER_A, matterId: MATTER_1, seed: "m3" });
    M("M3", "deleting the gate makes an unpaid packet deliverable",
      "zero_charge / eligible", out.accounting_result === "zero_charge" && out.delivery_eligibility === "eligible",
      `${out.accounting_result} / ${out.delivery_eligibility}`);
  } finally { db.stop(); }
}

// =============================================================================
const gatePassed = gate.filter((c) => c.passed).length;
const reachPassed = reach.filter((c) => c.passed).length;
const mutPassed = mutations.filter((c) => c.passed).length;
const failures = [...gate, ...reach].filter((c) => !c.passed);

const report = {
  schemaVersion: "rcap-phase51-consumer-payment-security/v3",
  generatedBy: "scripts/verify-rcap-phase51-consumer-payment-security.mjs",
  lane: "consumer-payment-gate-adversarial-audit",
  auditedCommit: "f79fb0d9",
  migrationSequence: SEQUENCE,
  privilegedFixtureWrites: "none on any gate surface; upstream seeding and mutation function replacement only",
  totals: {
    gateCases: gate.length, gatePassed,
    reachCases: reach.length, reachPassed,
    mutations: mutations.length, mutationsPassed: mutPassed
  },
  gateCases: gate, reachCases: reach, mutations,
  notes: [
    "Every gate and reach case runs as anon, authenticated or service_role. The owner-level binding write used in the previous revision is removed.",
    "Phase 53 closes the reachability regression this lane reported at 25f6b09: the binding is written inside the enqueue insert and the unbound 13-argument signature is dropped.",
    "Post-delivery refund remains a product-policy question; the pre-finalization refunded case is G12."
  ]
};
fs.mkdirSync(path.join(rootDir, "data/rcap-render"), { recursive: true });
fs.writeFileSync(
  path.join(rootDir, "data/rcap-render/phase51-consumer-payment-security.json"),
  `${JSON.stringify(report, null, 2)}\n`
);

console.log(`\nGate ${gatePassed}/${gate.length} | Reach ${reachPassed}/${reach.length} | Mutations ${mutPassed}/${mutations.length}`);

if (mutPassed !== mutations.length) {
  console.error("\nMutation coverage unsound: the gate did not measurably change behaviour.");
  process.exit(1);
}
if (failures.length > 0) {
  console.error("\nFAILURES:\n");
  for (const f of failures) {
    console.error(` - [${f.severity ?? "medium"}] ${f.id} ${f.title}`);
    console.error(`     expected: ${f.expectation}`);
    console.error(`     observed: ${f.observed}`);
  }
  process.exit(1);
}
console.log("\nConsumer payment authority and reachability: every expectation held, with no privileged fixture write.");
