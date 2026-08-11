// Independent adversarial audit of the consumer payment gate.
//
// Re-audited against Phase 52 (consumer payment authority) at
// 13e356c4, using the complete sequence 26 -> 27 -> 28 -> 49 -> 50 -> 51 -> 52.
// This lane owns the gate nowhere; it only attacks it.
//
// The four failures this fixture proved against Phase 51 (G1, G1b, G11, G12) are
// re-run in their Phase 52 shape and are expected to be closed. What is new here
// is the REACH section: the Phase 52 gate depends on a binding
// (consumer_auth_user_id) that nothing in the sanctioned runtime path can
// populate, so the paid consumer route is verified end to end through
// enqueue_packet_render_job rather than through a harness that writes the
// binding as the table owner.
//
// Sections:
//   GATE   17 security expectations. Failing cases are the deliverable.
//   REACH  can a legitimately paying consumer actually be served in production?
//   MUT    this lane's three original mutations, in their Phase 52 shape.
//
// The captain's own 32-case verifier and 12 mutations are run separately and are
// not duplicated here.

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
  "supabase/phase-52-rcap-consumer-payment-authority.sql"
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

/** Supabase-equivalent cluster: runtime roles and default privileges exist
 *  before the migrations, so the migrations' grants must beat them. */
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

  db.sql(`create table public.partner_records (id uuid primary key default gen_random_uuid(), partner_slug text unique not null)`);
  db.sql(`create table public.rcap_persons (id uuid primary key default gen_random_uuid(), partner_slug text not null, match_key text not null)`);
  db.sql(`create table public.rcap_document_packets (id uuid primary key default gen_random_uuid())`);
  db.sql(`insert into auth.users (id, email) values ('${USER_A}','a@participant.test'), ('${USER_B}','b@participant.test')`);

  const files = withConsumerStorage ? SEQUENCE : SEQUENCE.slice(3);
  for (const file of files.slice(0, withConsumerStorage ? through : through - 3)) {
    db.applyFile(path.join(rootDir, file));
  }
  db.sql(`insert into partner_records (id, partner_slug) values ('${PARTNER_A}','we-must-vote')`);
  db.sql(`insert into rcap_persons (id, partner_slug, match_key) values ('${PERSON_A}','we-must-vote','a')`);
  return db;
}

const asAuthenticated = (db, user, sql) =>
  `set role authenticated; select set_config('request.jwt.claim.sub','${user}',false); ${sql}`;

/** A briefcase item created the way a participant legitimately creates one:
 *  naming no payment column. */
function newItem(db, userId) {
  return db.scalar(
    `with r as (insert into consumer_briefcase_items (user_id, item_type, jurisdiction, status)
       values ('${userId}','packet','MS','packet_ready') returning id) select id from r`
  );
}

/** The only sanctioned payment writer, under service-role authority. */
function recordPayment(db, itemId, opts = {}) {
  const {
    status = "paid",
    amount = 5000,
    currency = "usd",
    event = `evt_${Math.abs(hash(itemId + status + currency + String(amount)))}`,
    authority = "server_webhook"
  } = opts;
  const out = db.scalar(
    `set role service_role; select outcome from record_consumer_packet_payment(` +
      `'${itemId}','${status}',${amount === null ? "null" : amount},` +
      `${currency === null ? "null" : `'${currency}'`},'stripe',` +
      `${event === null ? "null" : `'${event}'`},'cs','pi','http://r','${authority}','webhook')`
  );
  db.sql(`reset role`);
  return out.replace(/^SET\s*/, "").trim();
}
function hash(s) {
  let h = 0;
  for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return h;
}

/** Enqueue through the sanctioned RPC. Returns the job id. */
function enqueue(db, { item = null, partnerId = null, personId = null, matterId = null, seed = "s" }) {
  const packetId = db.scalar(
    `with r as (insert into rcap_document_packets default values returning id) select id from r`
  );
  const inputHash = createHash("sha256").update(seed).digest("hex");
  return db.scalar(
    `select id from enqueue_packet_render_job('${packetId}','MS:x','packet_document_v1','1.0.0',null,'MS','1.3.0','${inputHash}',` +
      `${item ? `'${item}'` : "null"},${partnerId ? `'${partnerId}'` : "null"},` +
      `${personId ? `'${personId}'` : "null"},${matterId ? `'${matterId}'` : "null"},5)`
  );
}

/** Writes the Phase 52 consumer binding. NOTE: this is a table-owner write.
 *  No runtime role can do this — see the REACH section, which is precisely the
 *  point. Gate cases use it so the gate LOGIC is exercised on its intended
 *  inputs rather than blocked upstream. */
function bindConsumer(db, jobId, item, user) {
  db.sql(
    `update packet_render_jobs set consumer_briefcase_item_id = ${item ? `'${item}'` : "null"}, ` +
      `consumer_auth_user_id = ${user ? `'${user}'` : "null"} where id = '${jobId}'`
  );
}

function drive(db, jobId) {
  const claim = db.json(
    `select row_to_json(t) from (select id, fencing_token from claim_packet_render_job('w1', null, 600)) t`
  );
  db.scalar(`select start_packet_render('${jobId}','${claim.fencing_token}')`);
  db.scalar(`select start_packet_validation('${jobId}','${claim.fencing_token}')`);
  return db.json(
    `select row_to_json(t) from (select * from finalize_packet_render_job('${jobId}','${claim.fencing_token}',` +
      `'p/${jobId}/${SHA("c")}.pdf','${SHA("c")}','${SHA("d")}','${SHA("c")}','${SHA("d")}',100,3,'sha256:x')) t`
  );
}

/** Full consumer run with the binding written by the harness. */
function consumerRun(db, { item, user, matterId, personId = PERSON_A, seed }) {
  const jobId = enqueue(db, { item, personId, matterId, seed });
  bindConsumer(db, jobId, item, user);
  return { jobId, ...drive(db, jobId) };
}

// =============================================================================
console.log("GATE — 17 security expectations against the Phase 52 shape");
// =============================================================================
{
  const db = boot();
  try {
    // --- G1. Participant cannot UPDATE a payment fact -----------------------
    const item = newItem(db, USER_A);
    const updErr = db.sqlExpectError(
      asAuthenticated(db, USER_A, `update consumer_briefcase_items set payment_status='paid', amount_cents=5000 where id='${item}'`)
    );
    db.sql(`reset role`);
    G("G1", "a participant cannot UPDATE payment columns",
      "permission denied",
      /permission denied/.test(updErr), updErr.split("\n")[0], "critical");

    // --- G2. Participant cannot INSERT an already-paid row ------------------
    const insErr = db.sqlExpectError(
      asAuthenticated(db, USER_A,
        `insert into consumer_briefcase_items (user_id,item_type,jurisdiction,status,payment_status,amount_cents,currency)
         values ('${USER_A}','packet','MS','packet_ready','paid',5000,'usd')`)
    );
    db.sql(`reset role`);
    G("G2", "a participant cannot INSERT a row already marked paid",
      "permission denied",
      /permission denied/.test(insErr), insErr.split("\n")[0], "critical");

    // --- G3. Safe nonpayment participant writes still work ------------------
    let safeOk = true;
    let safeObserved = "";
    try {
      const own = db.scalar(
        asAuthenticated(db, USER_A,
          `with r as (insert into consumer_briefcase_items (user_id,item_type,jurisdiction,status)
             values ('${USER_A}','packet','GA','packet_ready') returning id) select id from r`)
      ).replace(/^SET\s*/, "").split("\n").pop().trim();
      db.sql(`reset role`);
      db.sql(asAuthenticated(db, USER_A, `update consumer_briefcase_items set jurisdiction='TX', status='waiting' where id='${own}'`));
      db.sql(`reset role`);
      safeObserved = db.scalar(`select jurisdiction || '/' || status from consumer_briefcase_items where id='${own}'`).trim();
      safeOk = safeObserved === "TX/waiting";
    } catch (e) {
      safeOk = false;
      safeObserved = String(e.stderr ?? e.message).split("\n")[0];
    }
    db.sql(`reset role`);
    G("G3", "safe nonpayment participant INSERT and UPDATE still work",
      "the participant creates and edits their own non-payment fields",
      safeOk, safeObserved);

    // --- G4. Payment recording only via the service-role RPC ----------------
    const rpcDenied = db.sqlExpectError(
      asAuthenticated(db, USER_A,
        `select record_consumer_packet_payment('${item}','paid',5000,'usd','stripe','evt_x','cs','pi','r','server_webhook','w')`)
    );
    db.sql(`reset role`);
    const rpcOk = recordPayment(db, item, { event: "evt_g4" });
    G("G4", "payment is recorded only through record_consumer_packet_payment under service role",
      "authenticated is denied EXECUTE; service_role records paid",
      /permission denied/.test(rpcDenied) && rpcOk === "recorded_paid",
      `authenticated=${rpcDenied.split("\n")[0]} | service_role=${rpcOk}`);

    // --- G5. A Phase-51-shaped row lacking Phase 52 fields stays blocked ----
    // Constructed as the table owner, i.e. strictly stronger than any attacker:
    // even a row written with owner privilege cannot be paid without evidence.
    const legacyErr = db.sqlExpectError(
      `insert into consumer_briefcase_items (user_id,item_type,jurisdiction,status,payment_status,amount_cents)
       values ('${USER_A}','packet','MS','packet_ready','paid',5000)`
    );
    G("G5", "a Phase-51-shaped paid row without the Phase 52 fields cannot exist",
      "the paid_requires_server_evidence constraint refuses it",
      /paid_requires_server_evidence/.test(legacyErr), legacyErr.split("\n")[0]);

    // --- G6. Cross-user payment use fails -----------------------------------
    const itemB = newItem(db, USER_B);
    recordPayment(db, itemB, { event: "evt_g6_b" });
    const crossed = consumerRun(db, { item: itemB, user: USER_A, matterId: MATTER_1, seed: "g6-cross" });
    G("G6", "participant A cannot spend participant B's payment",
      "consumer_payment_owner_mismatch / accounting_blocked",
      crossed.accounting_result === "consumer_payment_owner_mismatch" && crossed.delivery_eligibility === "accounting_blocked",
      `${crossed.accounting_result} / ${crossed.delivery_eligibility}`, "high");

    // --- G7. First legitimate consumption succeeds --------------------------
    const paidItem = newItem(db, USER_A);
    recordPayment(db, paidItem, { event: "evt_g7" });
    const first = consumerRun(db, { item: paidItem, user: USER_A, matterId: MATTER_1, seed: "g7-first" });
    G("G7", "a genuinely paid, owned item opens delivery once",
      "zero_charge / eligible",
      first.accounting_result === "zero_charge" && first.delivery_eligibility === "eligible",
      `${first.accounting_result} / ${first.delivery_eligibility}`);

    // --- G8. Same payment, another matter: typed refusal --------------------
    const otherMatter = consumerRun(db, { item: paidItem, user: USER_A, matterId: MATTER_2, seed: "g8-second-matter" });
    G("G8", "the same payment cannot authorize a second matter",
      "consumer_payment_matter_conflict / accounting_blocked",
      otherMatter.accounting_result === "consumer_payment_matter_conflict" && otherMatter.delivery_eligibility === "accounting_blocked",
      `${otherMatter.accounting_result} / ${otherMatter.delivery_eligibility}`, "high");

    // --- G9. Same item, person and matter stays idempotently eligible -------
    const repeat = consumerRun(db, { item: paidItem, user: USER_A, matterId: MATTER_1, seed: "g9-idempotent" });
    const consumptionRows = db.scalar(
      `select count(*) from consumer_packet_payment_consumption where consumer_briefcase_item_id='${paidItem}'`
    ).trim();
    G("G9", "same item, person and matter remains idempotently eligible",
      "zero_charge / eligible with exactly one consumption row",
      repeat.accounting_result === "zero_charge" && repeat.delivery_eligibility === "eligible" && consumptionRows === "1",
      `${repeat.accounting_result} / ${repeat.delivery_eligibility}, consumption rows=${consumptionRows}`);

    // --- G10. Missing or wrong currency fails -------------------------------
    const noCurrencyItem = newItem(db, USER_A);
    const wrongCurrency = recordPayment(db, noCurrencyItem, { currency: "eur", event: "evt_g10" });
    const nullCurrency = recordPayment(db, noCurrencyItem, { currency: null, event: "evt_g10b" });
    const curRun = consumerRun(db, { item: noCurrencyItem, user: USER_A, matterId: MATTER_1, seed: "g10-currency" });
    G("G10", "a missing or non-USD currency cannot become a payment",
      "the RPC refuses both, and the item never becomes deliverable",
      wrongCurrency === "invalid_payment_evidence" && nullCurrency === "invalid_payment_evidence" &&
        curRun.accounting_result === "consumer_payment_required",
      `eur=${wrongCurrency} null=${nullCurrency} finalize=${curRun.accounting_result}`);

    // --- G11. Missing provider evidence fails -------------------------------
    const noEvidenceItem = newItem(db, USER_A);
    const noEvent = recordPayment(db, noEvidenceItem, { event: null });
    const badAuthority = db.scalar(
      `set role service_role; select outcome from record_consumer_packet_payment('${noEvidenceItem}','paid',5000,'usd','stripe','evt_g11','cs','pi','r','self_asserted','w')`
    ).replace(/^SET\s*/, "").trim();
    db.sql(`reset role`);
    const evRun = consumerRun(db, { item: noEvidenceItem, user: USER_A, matterId: MATTER_1, seed: "g11-evidence" });
    G("G11", "a payment with no provider receipt or no server authority fails",
      "the RPC refuses both, and the item never becomes deliverable",
      noEvent === "invalid_payment_evidence" && badAuthority === "invalid_authority" &&
        evRun.accounting_result === "consumer_payment_required",
      `no_event=${noEvent} bad_authority=${badAuthority} finalize=${evRun.accounting_result}`);

    // --- G12. Pre-finalization refund fails ---------------------------------
    const refundedItem = newItem(db, USER_A);
    recordPayment(db, refundedItem, { event: "evt_g12" });
    recordPayment(db, refundedItem, { status: "refunded", event: "evt_g12" });
    const refundedRun = consumerRun(db, { item: refundedItem, user: USER_A, matterId: MATTER_1, seed: "g12-refund" });
    G("G12", "a refund before finalization blocks delivery",
      "consumer_payment_required / accounting_blocked",
      refundedRun.accounting_result === "consumer_payment_required" && refundedRun.delivery_eligibility === "accounting_blocked",
      `${refundedRun.accounting_result} / ${refundedRun.delivery_eligibility}`);

    // --- G13. Sponsored accounting unchanged --------------------------------
    db.sql(`insert into partner_packet_entitlement (partner_id, packet_cap) values ('${PARTNER_A}', 5)`);
    const sponsoredJob = enqueue(db, { partnerId: PARTNER_A, personId: PERSON_A, matterId: MATTER_1, seed: "g13-sponsored" });
    const sponsored = drive(db, sponsoredJob);
    const sponsoredLedger = db.json(
      `select row_to_json(t) from (select event_type, entitlement_id is not null as has_entitlement from packet_credit_ledger where render_job_id='${sponsoredJob}') t`
    );
    G("G13", "sponsored accounting is unchanged by the consumer gate",
      "consumed / eligible against a real entitlement",
      sponsored.accounting_result === "consumed" && sponsored.delivery_eligibility === "eligible" &&
        sponsoredLedger?.event_type === "consumed" && sponsoredLedger?.has_entitlement === true,
      `${sponsored.accounting_result} / ${sponsored.delivery_eligibility} ledger=${JSON.stringify(sponsoredLedger)}`);

    // --- G14. Paid consumer delivery consumes no partner credit -------------
    const consumerLedger = db.json(
      `select row_to_json(t) from (select event_type, entitlement_id, partner_id from packet_credit_ledger where render_job_id='${first.jobId}') t`
    );
    const entitlementUntouched = db.scalar(
      `select count(*) from packet_credit_ledger where entitlement_id is not null and render_job_id='${first.jobId}'`
    ).trim();
    G("G14", "a paid consumer packet consumes no partner packet credit",
      "one zero_charge row with null entitlement and null partner",
      consumerLedger?.event_type === "zero_charge" && consumerLedger?.entitlement_id === null &&
        consumerLedger?.partner_id === null && entitlementUntouched === "0",
      JSON.stringify(consumerLedger));

    // --- G15. Repeat download needs no new payment or ledger event ----------
    const beforeRows = db.scalar(`select count(*) from packet_credit_ledger where render_job_id='${first.jobId}'`).trim();
    db.scalar(`select record_packet_delivery_event('${first.jobId}','delivery_authorized',null,'{}'::jsonb)`);
    db.scalar(`select record_packet_delivery_event('${first.jobId}','transmission_completed',null,'{}'::jsonb)`);
    db.scalar(`select record_packet_delivery_event('${first.jobId}','delivery_authorized',null,'{}'::jsonb)`);
    const afterRows = db.scalar(`select count(*) from packet_credit_ledger where render_job_id='${first.jobId}'`).trim();
    G("G15", "repeat download requires neither another payment nor another ledger event",
      "the ledger row count is unchanged",
      beforeRows === "1" && afterRows === "1",
      `before=${beforeRows} after=${afterRows}`);

    // --- G16. No uniqueness conflict escapes or strands a job ---------------
    const conflictStatus = db.scalar(`select status from packet_render_jobs where id='${otherMatter.jobId}'`).trim();
    const conflictTyped = otherMatter.accounting_result === "consumer_payment_matter_conflict";
    G("G16", "a uniqueness conflict is typed, and never strands a job in validating",
      "the conflicted job is artifact_validated with a typed blocked result",
      conflictTyped && conflictStatus === "artifact_validated",
      `status=${conflictStatus} result=${otherMatter.accounting_result}`);

    // --- G17. A blocked job cannot record a delivery event ------------------
    const deliveryRefusal = db.sqlExpectError(
      `select record_packet_delivery_event('${otherMatter.jobId}','delivery_authorized',null,'{}'::jsonb)`
    );
    G("G17", "a payment-blocked job cannot record any delivery event",
      "record_packet_delivery_event refuses a non-eligible job",
      /not delivery-eligible/.test(deliveryRefusal), deliveryRefusal.split("\n")[0]);
  } finally {
    db.stop();
  }
}

// Missing briefcase item / missing payment storage fail closed.
{
  const db = boot();
  try {
    const noItemJob = enqueue(db, { item: null, personId: PERSON_A, matterId: MATTER_1, seed: "no-item" });
    const noItem = drive(db, noItemJob);
    G("G18", "a job with no briefcase item fails closed",
      "consumer_payment_required / accounting_blocked",
      noItem.accounting_result === "consumer_payment_required" && noItem.delivery_eligibility === "accounting_blocked",
      `${noItem.accounting_result} / ${noItem.delivery_eligibility}`);
  } finally {
    db.stop();
  }
}
{
  const db = boot({ withConsumerStorage: false });
  try {
    const job = enqueue(db, { item: "77777777-7777-4777-8777-777777777777", personId: PERSON_A, matterId: MATTER_1, seed: "no-storage" });
    const out = drive(db, job);
    G("G19", "a schema with no consumer payment storage fails closed",
      "consumer_payment_required, not a crash and not a pass",
      out.accounting_result === "consumer_payment_required" && out.delivery_eligibility === "accounting_blocked",
      `${out.accounting_result} / ${out.delivery_eligibility}`);
  } finally {
    db.stop();
  }
}

// =============================================================================
console.log("\nREACH — can a legitimately paying consumer actually be served?");
// =============================================================================
{
  const db = boot();
  try {
    // R1. The sanctioned enqueue RPC does not accept the binding the gate needs.
    const args = db.scalar(
      `select pg_get_function_identity_arguments(p.oid) from pg_proc p
       join pg_namespace n on n.oid=p.pronamespace
       where n.nspname='public' and p.proname='enqueue_packet_render_job'`
    ).trim();
    R("R1", "enqueue_packet_render_job accepts the consumer binding",
      "p_consumer_auth_user_id (and item) are parameters of the only sanctioned insert path",
      /consumer_auth_user_id/.test(args),
      `signature has no consumer binding: ${args}`, "high");

    // R2. No runtime role can write the binding after the fact either.
    const svc = db.scalar(`select has_table_privilege('service_role','public.packet_render_jobs','UPDATE')`).trim();
    R("R2", "some runtime role can populate the binding",
      "service_role (or another runtime role) holds UPDATE on packet_render_jobs",
      svc === "t",
      `service_role UPDATE on packet_render_jobs = ${svc} (phase 50 revoked it)`, "high");

    // R3. End to end, through sanctioned paths only: a genuinely paid consumer.
    const item = newItem(db, USER_A);
    const paid = recordPayment(db, item, { event: "evt_reach" });
    const jobId = enqueue(db, { item, personId: PERSON_A, matterId: MATTER_1, seed: "reach-e2e" });
    const bound = db.scalar(`select coalesce(consumer_auth_user_id::text,'NULL') from packet_render_jobs where id='${jobId}'`).trim();
    const out = drive(db, jobId);
    R("R3", "a genuinely paid consumer is served through sanctioned paths only",
      "zero_charge / eligible",
      out.accounting_result === "zero_charge" && out.delivery_eligibility === "eligible",
      `payment=${paid}, job consumer_auth_user_id=${bound}, finalize=${out.accounting_result} / ${out.delivery_eligibility}`,
      "high");
  } finally {
    db.stop();
  }
}

// =============================================================================
console.log("\nMUT — this lane's original three mutations, in the Phase 52 shape");
// =============================================================================
{
  // M1: without the consumer gate at all (49+50 only), unpaid is deliverable.
  const db = boot({ through: 5, withConsumerStorage: true });
  try {
    const jobId = enqueue(db, { item: null, personId: PERSON_A, matterId: MATTER_1, seed: "m1" });
    const out = drive(db, jobId);
    M("M1", "without phases 51/52 an unpaid consumer packet is deliverable",
      "zero_charge / eligible on 49+50 alone",
      out.accounting_result === "zero_charge" && out.delivery_eligibility === "eligible",
      `${out.accounting_result} / ${out.delivery_eligibility}`);
  } finally {
    db.stop();
  }
}
{
  // M2: weaken the authority probe's amount/currency clause.
  const db = boot();
  try {
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
    // A paid row is still constraint-bound to 5000/usd, so weaken by writing a
    // paid row through the owner with a wrong amount, which the probe now allows.
    const item = newItem(db, USER_A);
    recordPayment(db, item, { event: "evt_m2" });
    db.sql(`alter table consumer_briefcase_items drop constraint consumer_briefcase_items_paid_requires_server_evidence`);
    db.sql(`update consumer_briefcase_items set amount_cents=null, currency=null where id='${item}'`);
    const out = consumerRun(db, { item, user: USER_A, matterId: MATTER_1, seed: "m2" });
    M("M2", "weakening the amount and currency clause opens an underpaid row",
      "zero_charge / eligible once the clause is gone",
      out.accounting_result === "zero_charge" && out.delivery_eligibility === "eligible",
      `${out.accounting_result} / ${out.delivery_eligibility}`);
  } finally {
    db.stop();
  }
}
{
  // M3: delete the gate entirely (probe forced true).
  const db = boot();
  try {
    db.sql(
      `create or replace function public.consumer_packet_payment_authority(p_briefcase_item_id uuid, p_consumer_auth_user_id uuid)
       returns table (valid boolean, reason text, provider_event_id text)
       language sql stable security definer set search_path='' as $$ select true, 'forced'::text, 'evt_forced'::text $$;`
    );
    const item = newItem(db, USER_A);
    const out = consumerRun(db, { item, user: USER_A, matterId: MATTER_1, seed: "m3" });
    M("M3", "deleting the gate makes an unpaid packet deliverable",
      "zero_charge / eligible",
      out.accounting_result === "zero_charge" && out.delivery_eligibility === "eligible",
      `${out.accounting_result} / ${out.delivery_eligibility}`);
  } finally {
    db.stop();
  }
}

// =============================================================================
const gatePassed = gate.filter((c) => c.passed).length;
const reachPassed = reach.filter((c) => c.passed).length;
const mutPassed = mutations.filter((c) => c.passed).length;
const failures = [...gate, ...reach].filter((c) => !c.passed);

const report = {
  schemaVersion: "rcap-phase51-consumer-payment-security/v2",
  generatedBy: "scripts/verify-rcap-phase51-consumer-payment-security.mjs",
  lane: "consumer-payment-gate-adversarial-audit",
  auditedCommit: "13e356c49bd484e6f946ba604076718d904bca86",
  migrationSequence: SEQUENCE,
  totals: {
    gateCases: gate.length,
    gatePassed,
    reachCases: reach.length,
    reachPassed,
    mutations: mutations.length,
    mutationsPassed: mutPassed
  },
  gateCases: gate,
  reachCases: reach,
  mutations,
  notes: [
    "Phase 51's four proven failures (G1, G1b, G11, G12) are closed by Phase 52: G1/G2 permission denied, G6 owner mismatch, G8 matter conflict.",
    "Gate cases write the Phase 52 consumer binding as the table owner so the gate logic is exercised on its intended inputs. The REACH section tests whether any runtime path can supply that binding.",
    "Post-delivery refund remains a product-policy question and is not asserted here; the pre-finalization refunded case is G12."
  ]
};
fs.mkdirSync(path.join(rootDir, "data/rcap-render"), { recursive: true });
fs.writeFileSync(
  path.join(rootDir, "data/rcap-render/phase51-consumer-payment-security.json"),
  `${JSON.stringify(report, null, 2)}\n`
);

console.log(
  `\nGate ${gatePassed}/${gate.length} | Reach ${reachPassed}/${reach.length} | Mutations ${mutPassed}/${mutations.length}`
);

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
console.log("\nConsumer payment authority: every expectation held.");
