// Independent adversarial audit of the Phase 51 consumer payment gate.
//
// This is an audit lane, not a lane that owns the gate. It applies the real
// migration sequence — 26 -> 27 -> 28 -> 49 -> 50 -> 51 — to an ephemeral
// PostgreSQL cluster whose runtime roles and default privileges are configured
// the way Supabase configures them, and then attacks the gate.
//
// The question it answers: can an unpaid or incorrectly paid consumer packet
// become delivery eligible, and can a participant forge, reuse, or misbind
// payment evidence?
//
// Two sections. GATE states security expectations and fails when one is not
// met — the failing cases are the deliverable, and the captain gets a fixture
// rather than prose. MUTATION proves Phase 51 does real work by removing or
// weakening it and showing the outcome changes.
//
// Nothing here is wired into package.json; lane A owns shared wiring.

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

const CONSUMER_MIGRATIONS = [
  "supabase/phase-26-consumer-briefcase-items.sql",
  "supabase/phase-27-consumer-checkout-metadata.sql",
  "supabase/phase-28-consumer-packet-generation-status.sql"
];
const PACKET_MIGRATIONS = [
  "supabase/phase-49-rcap-packet-render-jobs.sql",
  "supabase/phase-50-rcap-packet-delivery-hardening.sql",
  "supabase/phase-51-rcap-consumer-payment-gate.sql"
];

const results = [];
function record(id, title, expectation, passed, observed, severity = null) {
  results.push({ id, title, expectation, passed, observed, severity });
  const mark = passed ? "ok  " : "FAIL";
  console.log(`  ${mark} ${id} ${title}`);
  if (!passed) console.log(`         expected: ${expectation}`);
  if (!passed) console.log(`         observed: ${observed}`);
}

/** Supabase-equivalent cluster: runtime roles and default privileges exist
 *  BEFORE the migrations, so a migration's grants must beat them. */
function boot({ through = "51", withConsumerStorage = true } = {}) {
  const db = startEphemeralPg();
  db.sql(`create role anon nologin`);
  db.sql(`create role authenticated nologin`);
  db.sql(`create role service_role nologin bypassrls`);
  // Supabase grants runtime roles broad access on new public tables by default.
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

  if (withConsumerStorage) {
    for (const file of CONSUMER_MIGRATIONS) db.applyFile(path.join(rootDir, file));
  }
  const packetFiles = { "49": 1, "50": 2, "51": 3 }[through];
  for (const file of PACKET_MIGRATIONS.slice(0, packetFiles)) db.applyFile(path.join(rootDir, file));

  db.sql(`insert into partner_records (id, partner_slug) values ('${PARTNER_A}','we-must-vote')`);
  db.sql(`insert into rcap_persons (id, partner_slug, match_key) values ('${PERSON_A}','we-must-vote','a')`);
  return db;
}

const newPacket = (db) =>
  db.scalar(`with r as (insert into rcap_document_packets default values returning id) select id from r`);

/** Creates a briefcase item owned by the given user, as the server would. */
function newBriefcaseItem(db, userId, { paymentStatus = "unpaid", amountCents = null } = {}) {
  return db.scalar(
    `with r as (insert into consumer_briefcase_items
       (user_id, item_type, jurisdiction, status, payment_status, amount_cents)
     values ('${userId}','packet','MS','packet_ready','${paymentStatus}',${amountCents === null ? "null" : amountCents})
     returning id) select id from r`
  );
}

/** Drives a job to the point of finalization and returns the finalize result. */
function finalize(db, { briefcaseItemId = null, partnerId = null, personId = null, matterId = null, seed = "s" }) {
  const packetId = newPacket(db);
  const inputHash = createHash("sha256").update(seed).digest("hex");
  const jobId = db.scalar(
    `select id from enqueue_packet_render_job('${packetId}','MS:x','packet_document_v1','1.0.0',null,'MS','1.3.0','${inputHash}',` +
      `${briefcaseItemId ? `'${briefcaseItemId}'` : "null"},${partnerId ? `'${partnerId}'` : "null"},` +
      `${personId ? `'${personId}'` : "null"},${matterId ? `'${matterId}'` : "null"},5)`
  );
  const claim = db.json(
    `select row_to_json(t) from (select id, fencing_token from claim_packet_render_job('w1', null, 600)) t`
  );
  db.scalar(`select start_packet_render('${jobId}','${claim.fencing_token}')`);
  db.scalar(`select start_packet_validation('${jobId}','${claim.fencing_token}')`);
  const out = db.json(
    `select row_to_json(t) from (select * from finalize_packet_render_job('${jobId}','${claim.fencing_token}',` +
      `'p/${jobId}/${SHA("c")}.pdf','${SHA("c")}','${SHA("d")}','${SHA("c")}','${SHA("d")}',100,3,'sha256:x')) t`
  );
  return { jobId, ...out };
}

// =============================================================================
console.log("GATE — does Phase 51 stop an unpaid or forged consumer packet?");
// =============================================================================
{
  const db = boot();
  try {
    // --- G1. Client-forged paid status -------------------------------------
    // The participant owns the row. Phase 26's UPDATE policy is
    // `using (auth.uid() = user_id) with check (auth.uid() = user_id)` with no
    // column restriction, and no trigger or column grant guards payment_status.
    const itemForge = newBriefcaseItem(db, USER_A, { paymentStatus: "unpaid", amountCents: null });
    const forgeErr = (() => {
      try {
        db.sql(
          `set role authenticated; select set_config('request.jwt.claim.sub','${USER_A}',false); ` +
            `update consumer_briefcase_items set payment_status='paid', amount_cents=5000 where id='${itemForge}'`
        );
        return null;
      } catch (e) {
        return String(e.stderr ?? e.message).split("\n")[0];
      }
    })();
    db.sql(`reset role`);
    const forgedRow = db.scalar(
      `select payment_status || '/' || coalesce(amount_cents::text,'null') from consumer_briefcase_items where id='${itemForge}'`
    ).trim();
    record(
      "G1",
      "an authenticated participant cannot self-declare payment",
      "the UPDATE is refused, or payment_status/amount are unchanged",
      forgeErr !== null || forgedRow !== "paid/5000",
      forgeErr ? `refused: ${forgeErr}` : `participant wrote payment_status/amount = ${forgedRow}`,
      "critical"
    );

    const forgedFinal = finalize(db, { briefcaseItemId: itemForge, seed: "forge" });
    record(
      "G1b",
      "a self-declared payment does not open delivery",
      "accounting_result consumer_payment_required, eligibility accounting_blocked",
      forgedFinal.accounting_result === "consumer_payment_required",
      `accounting_result=${forgedFinal.accounting_result} eligibility=${forgedFinal.delivery_eligibility}`,
      "critical"
    );

    // --- G2..G5. Non-final statuses fail closed -----------------------------
    for (const [caseId, status, amount] of [
      ["G2", "unpaid", 5000],
      ["G3", "refunded", 5000],
      ["G4", "not_applicable", 5000],
      ["G5", "paid", null]
    ]) {
      const item = newBriefcaseItem(db, USER_A, { paymentStatus: status, amountCents: amount });
      const out = finalize(db, { briefcaseItemId: item, seed: `${caseId}-${status}-${amount}` });
      record(
        caseId,
        `payment_status='${status}' amount=${amount} fails closed`,
        "consumer_payment_required / accounting_blocked",
        out.accounting_result === "consumer_payment_required" && out.delivery_eligibility === "accounting_blocked",
        `accounting_result=${out.accounting_result} eligibility=${out.delivery_eligibility}`
      );
    }

    // --- G6. A lower amount cannot even be stored ---------------------------
    let lowAmountRejected = false;
    try {
      newBriefcaseItem(db, USER_A, { paymentStatus: "paid", amountCents: 2500 });
    } catch {
      lowAmountRejected = true;
    }
    record(
      "G6",
      "an amount below the canonical $50 cannot be stored",
      "the phase-27 CHECK rejects amount_cents <> 5000",
      lowAmountRejected,
      lowAmountRejected ? "rejected by check constraint" : "a 2500-cent row was stored"
    );

    // --- G7. Missing briefcase item fails closed ----------------------------
    const noItem = finalize(db, { briefcaseItemId: null, seed: "no-item" });
    record(
      "G7",
      "a job with no briefcase item fails closed",
      "consumer_payment_required / accounting_blocked",
      noItem.accounting_result === "consumer_payment_required" && noItem.delivery_eligibility === "accounting_blocked",
      `accounting_result=${noItem.accounting_result} eligibility=${noItem.delivery_eligibility}`
    );

    // --- G8. A genuine paid item is the only thing that opens the gate ------
    const paidItem = newBriefcaseItem(db, USER_A, { paymentStatus: "paid", amountCents: 5000 });
    const paidOut = finalize(db, { briefcaseItemId: paidItem, personId: PERSON_A, seed: "paid-1" });
    record(
      "G8",
      "a genuinely paid item opens delivery as zero_charge",
      "zero_charge / eligible",
      paidOut.accounting_result === "zero_charge" && paidOut.delivery_eligibility === "eligible",
      `accounting_result=${paidOut.accounting_result} eligibility=${paidOut.delivery_eligibility}`
    );

    // --- G9. A paid consumer packet consumes no partner credit --------------
    const consumerLedger = db.json(
      `select row_to_json(t) from (select event_type, entitlement_id, partner_id from packet_credit_ledger where render_job_id='${paidOut.jobId}') t`
    );
    record(
      "G9",
      "a paid consumer packet consumes no partner credit",
      "one zero_charge ledger row with null entitlement and null partner",
      consumerLedger &&
        consumerLedger.event_type === "zero_charge" &&
        consumerLedger.entitlement_id === null &&
        consumerLedger.partner_id === null,
      JSON.stringify(consumerLedger)
    );

    // --- G10. Repeat finalization/download consumes nothing more ------------
    const repeatRows = db.scalar(
      `select count(*) from packet_credit_ledger where render_job_id='${paidOut.jobId}'`
    ).trim();
    db.scalar(`select record_packet_delivery_event('${paidOut.jobId}','delivery_authorized',null,'{}'::jsonb)`);
    db.scalar(`select record_packet_delivery_event('${paidOut.jobId}','transmission_completed',null,'{}'::jsonb)`);
    db.scalar(`select record_packet_delivery_event('${paidOut.jobId}','delivery_authorized',null,'{}'::jsonb)`);
    const afterRepeat = db.scalar(
      `select count(*) from packet_credit_ledger where render_job_id='${paidOut.jobId}'`
    ).trim();
    record(
      "G10",
      "repeat download requires no new payment and consumes nothing",
      "the ledger row count is unchanged across repeated deliveries",
      repeatRows === "1" && afterRepeat === "1",
      `ledger rows before=${repeatRows} after=${afterRepeat}`
    );

    // --- G11. One paid item must not authorize a second distinct matter -----
    const reuse = finalize(db, {
      briefcaseItemId: paidItem,
      personId: PERSON_A,
      matterId: "44444444-4444-4444-4444-444444444444",
      seed: "reuse-second-matter"
    });
    record(
      "G11",
      "one paid item cannot authorize a second distinct matter",
      "the second matter is refused (consumer_payment_required)",
      reuse.accounting_result === "consumer_payment_required",
      `second matter on the same paid item -> accounting_result=${reuse.accounting_result} eligibility=${reuse.delivery_eligibility}`,
      "high"
    );

    // --- G12. Another participant's payment must not authorize the job ------
    const bPaid = newBriefcaseItem(db, USER_B, { paymentStatus: "paid", amountCents: 5000 });
    const crossed = finalize(db, {
      briefcaseItemId: bPaid,
      personId: PERSON_A,
      matterId: "55555555-5555-5555-5555-555555555555",
      seed: "cross-participant"
    });
    record(
      "G12",
      "participant B's payment cannot authorize a job for participant A",
      "the gate refuses a payment owned by a different participant",
      crossed.accounting_result === "consumer_payment_required",
      `job bound to B's paid item -> accounting_result=${crossed.accounting_result} eligibility=${crossed.delivery_eligibility}`,
      "high"
    );

    // --- G13. The delivery route cannot bypass the finalization result ------
    const blockedJob = finalize(db, {
      briefcaseItemId: newBriefcaseItem(db, USER_A, { paymentStatus: "unpaid" }),
      seed: "blocked-delivery"
    });
    const deliveryRefusal = db.sqlExpectError(
      `select record_packet_delivery_event('${blockedJob.jobId}','delivery_authorized',null,'{}'::jsonb)`
    );
    record(
      "G13",
      "a payment-blocked job cannot record any delivery event",
      "record_packet_delivery_event refuses a non-eligible job",
      /not delivery-eligible/.test(deliveryRefusal),
      deliveryRefusal.split("\n")[0]
    );

    // --- G14. Sponsored packets stay on the entitlement path ----------------
    db.sql(`insert into partner_packet_entitlement (partner_id, packet_cap) values ('${PARTNER_A}', 5)`);
    const sponsored = finalize(db, {
      partnerId: PARTNER_A,
      personId: PERSON_A,
      matterId: "66666666-6666-6666-6666-666666666666",
      seed: "sponsored"
    });
    record(
      "G14",
      "a sponsored packet is not forced through the consumer gate",
      "consumed / eligible with a partner ledger row",
      sponsored.accounting_result === "consumed" && sponsored.delivery_eligibility === "eligible",
      `accounting_result=${sponsored.accounting_result} eligibility=${sponsored.delivery_eligibility}`
    );
    const sponsoredLedger = db.json(
      `select row_to_json(t) from (select event_type, entitlement_id is not null as has_entitlement from packet_credit_ledger where render_job_id='${sponsored.jobId}') t`
    );
    record(
      "G15",
      "the sponsored packet consumed partner credit, not a consumer zero_charge",
      "event_type consumed against a real entitlement",
      sponsoredLedger && sponsoredLedger.event_type === "consumed" && sponsoredLedger.has_entitlement === true,
      JSON.stringify(sponsoredLedger)
    );
  } finally {
    db.stop();
  }
}

// --- G16. Missing payment storage fails closed -------------------------------
{
  const db = boot({ withConsumerStorage: false });
  try {
    const out = finalize(db, { briefcaseItemId: "77777777-7777-4777-8777-777777777777", seed: "no-storage" });
    record(
      "G16",
      "a schema with no consumer payment storage fails closed",
      "consumer_payment_required, not a crash and not a pass",
      out.accounting_result === "consumer_payment_required" && out.delivery_eligibility === "accounting_blocked",
      `accounting_result=${out.accounting_result} eligibility=${out.delivery_eligibility}`
    );
  } finally {
    db.stop();
  }
}

// =============================================================================
console.log("\nMUTATION — does Phase 51 actually carry the gate?");
// =============================================================================
const mutations = [];
function mutation(id, title, passed, observed) {
  mutations.push({ id, title, passed, observed });
  console.log(`  ${passed ? "ok  " : "FAIL"} ${id} ${title}`);
  if (!passed) console.log(`         observed: ${observed}`);
}

// --- M1. Phase 49 + 50 only: the unpaid-consumer regression is visible -------
{
  const db = boot({ through: "50" });
  try {
    const item = newBriefcaseItem(db, USER_A, { paymentStatus: "unpaid" });
    const out = finalize(db, { briefcaseItemId: item, seed: "m1-no-51" });
    mutation(
      "M1",
      "without Phase 51 an unpaid consumer packet becomes deliverable",
      out.accounting_result === "zero_charge" && out.delivery_eligibility === "eligible",
      `accounting_result=${out.accounting_result} eligibility=${out.delivery_eligibility}`
    );
  } finally {
    db.stop();
  }
}

// --- M2. Phase 51 with the amount check removed ------------------------------
{
  const db = boot();
  try {
    db.sql(`
      create or replace function public.consumer_packet_payment_valid(p_briefcase_item_id uuid)
      returns boolean language plpgsql stable security definer set search_path = '' as $probe$
      declare v_valid boolean;
      begin
        if p_briefcase_item_id is null then return false; end if;
        if to_regclass('public.consumer_briefcase_items') is null then return false; end if;
        execute 'select exists (select 1 from public.consumer_briefcase_items b
                 where b.id = $1 and b.payment_status = ''paid'')'
          into v_valid using p_briefcase_item_id;
        return coalesce(v_valid, false);
      end; $probe$;
    `);
    const item = newBriefcaseItem(db, USER_A, { paymentStatus: "paid", amountCents: null });
    const out = finalize(db, { briefcaseItemId: item, seed: "m2-weak-amount" });
    mutation(
      "M2",
      "weakening the amount check opens a paid row carrying no amount",
      out.accounting_result === "zero_charge" && out.delivery_eligibility === "eligible",
      `accounting_result=${out.accounting_result} eligibility=${out.delivery_eligibility}`
    );
  } finally {
    db.stop();
  }
}

// --- M3. Phase 51 gate deleted (probe forced true) ---------------------------
{
  const db = boot();
  try {
    db.sql(
      `create or replace function public.consumer_packet_payment_valid(p_briefcase_item_id uuid)
       returns boolean language sql stable security definer set search_path='' as $$ select true $$;`
    );
    const item = newBriefcaseItem(db, USER_A, { paymentStatus: "unpaid" });
    const out = finalize(db, { briefcaseItemId: item, seed: "m3-deleted-gate" });
    mutation(
      "M3",
      "deleting the gate makes an unpaid packet deliverable",
      out.accounting_result === "zero_charge" && out.delivery_eligibility === "eligible",
      `accounting_result=${out.accounting_result} eligibility=${out.delivery_eligibility}`
    );
  } finally {
    db.stop();
  }
}

// =============================================================================
// Report
// =============================================================================
const passed = results.filter((r) => r.passed).length;
const failed = results.filter((r) => !r.passed);
const mutationsPassed = mutations.filter((m) => m.passed).length;

const report = {
  schemaVersion: "rcap-phase51-consumer-payment-security/v1",
  generatedBy: "scripts/verify-rcap-phase51-consumer-payment-security.mjs",
  lane: "consumer-payment-gate-adversarial-audit",
  migrationSequence: [...CONSUMER_MIGRATIONS, ...PACKET_MIGRATIONS],
  totals: {
    gateCases: results.length,
    gatePassed: passed,
    gateFailed: failed.length,
    mutations: mutations.length,
    mutationsPassed
  },
  gateCases: results,
  mutations,
  notes: [
    "consumer_briefcase_items has no currency column, so requirement 8's currency clause is not represented in the schema.",
    "payment_status admits only not_applicable, unpaid, paid, refunded. pending, failed, canceled and disputed cannot be stored, so those cases are structurally unreachable rather than gated.",
    "amount_cents carries a CHECK of 5000 or null, so a lower amount cannot be persisted at all.",
    "Post-delivery refund behaviour is a product-policy question and is deliberately not asserted here; the pre-delivery refunded case is G3."
  ]
};
fs.mkdirSync(path.join(rootDir, "data/rcap-render"), { recursive: true });
fs.writeFileSync(
  path.join(rootDir, "data/rcap-render/phase51-consumer-payment-security.json"),
  `${JSON.stringify(report, null, 2)}\n`
);

console.log(`\nGate cases: ${passed}/${results.length} passed. Mutations: ${mutationsPassed}/${mutations.length} behaved as expected.`);

if (mutationsPassed !== mutations.length) {
  console.error("\nMutation coverage is not sound: Phase 51 did not measurably change behaviour.");
  process.exit(1);
}

if (failed.length > 0) {
  console.error("\nPAYMENT GATE BYPASS FOUND — failing security expectations:\n");
  for (const f of failed) {
    console.error(` - [${f.severity ?? "medium"}] ${f.id} ${f.title}`);
    console.error(`     expected: ${f.expectation}`);
    console.error(`     observed: ${f.observed}`);
  }
  console.error("\nSee docs/RCAP_PHASE51_CONSUMER_PAYMENT_SECURITY.md for the exact patch recommendation.");
  process.exit(1);
}

console.log("\nPhase 51 consumer payment gate: every security expectation held.");
