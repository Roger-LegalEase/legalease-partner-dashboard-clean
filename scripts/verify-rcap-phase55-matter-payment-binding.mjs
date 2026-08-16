#!/usr/bin/env node
// Phase 55 focused PostgreSQL proof. Runs only in isolated in-memory PGlite;
// it never connects to Supabase or Stripe.

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PHASE55 = "supabase/phase-55-expungement-matter-payment-binding.sql";
const FULL_SEQUENCE = [
  "supabase/phase-26-consumer-briefcase-items.sql",
  "supabase/phase-27-consumer-checkout-metadata.sql",
  "supabase/phase-28-consumer-packet-generation-status.sql",
  "supabase/phase-49-rcap-packet-render-jobs.sql",
  "supabase/phase-50-rcap-packet-delivery-hardening.sql",
  "supabase/phase-51-rcap-consumer-payment-gate.sql",
  "supabase/phase-52-rcap-consumer-payment-authority.sql",
  "supabase/phase-53-rcap-consumer-job-binding.sql",
  "supabase/phase-54-rcap-person-namespace-hardening.sql",
  PHASE55
];

const USER_A = "11111111-1111-4111-8111-111111111111";
const USER_B = "22222222-2222-4222-8222-222222222222";
const ITEM_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const ITEM_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const ITEM_C = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const ITEM_SPONSORED = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const ITEM_CLOSED = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
const ITEM_GUIDANCE = "99999999-9999-4999-8999-999999999999";
const SPONSORED_SESSION = "ffffffff-ffff-4fff-8fff-ffffffffffff";
const PRODUCT = "expungement_packet";
const CONSUMER_NAMESPACE = "expungement-ai-consumer";

const sha = (value) => crypto.createHash("sha256").update(value).digest("hex");
const personMatchKey = (userId) => `consumer:${sha(`rcap:consumer-person:v1:${userId}`)}`;
function matterFor(itemId) {
  const hash = sha(`rcap:consumer-matter:v1:${itemId}`);
  const variant = ((parseInt(hash[16], 16) & 0x3) | 0x8).toString(16);
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-${variant}${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}

async function database() {
  const db = new PGlite({ extensions: { pgcrypto } });
  await db.exec(`
    create extension pgcrypto with schema public;
    create schema extensions;
    create or replace function extensions.digest(bytea, text)
      returns bytea language sql immutable
      as $$ select public.digest($1, $2) $$;
    create role anon;
    create role authenticated;
    create role service_role bypassrls;
  `);
  return db;
}

async function apply(db, file) {
  await db.exec(fs.readFileSync(path.join(rootDir, file), "utf8"));
}

async function one(db, text, params = []) {
  const result = await db.query(text, params);
  return result.rows[0] ?? null;
}

async function value(db, text, params = []) {
  const row = await one(db, text, params);
  return row ? Object.values(row)[0] : null;
}

async function expectDatabaseError(action, pattern) {
  let caught = null;
  try {
    await action();
  } catch (error) {
    caught = error;
  }
  assert.ok(caught, "expected PostgreSQL to refuse the statement");
  assert.match(String(caught.message ?? caught), pattern);
}

async function bootFull() {
  const db = await database();
  await db.exec(`
    alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
    alter default privileges in schema public grant execute on functions to service_role;
    create schema auth;
    create table auth.users (id uuid primary key, email text);
    create or replace function auth.uid() returns uuid language sql stable set search_path=''
      as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth to anon, authenticated, service_role;
    grant execute on function auth.uid() to anon, authenticated, service_role;
    create table public.partner_records (
      id uuid primary key default gen_random_uuid(),
      partner_slug text unique not null
    );
    create table public.rcap_persons (
      id uuid primary key default gen_random_uuid(),
      partner_slug text not null,
      match_key text not null,
      created_at timestamptz not null default now()
    );
    create unique index rcap_persons_partner_match_key_idx
      on public.rcap_persons(partner_slug, match_key);
    create table public.rcap_document_packets (
      id uuid primary key default gen_random_uuid(),
      partner_slug text not null,
      user_id uuid,
      briefcase_id uuid,
      state text not null default 'MS',
      jurisdiction text,
      pathway text not null
    );
    create table public.screening_sessions (
      session_id uuid primary key,
      flow_mode text not null default 'dtc',
      partner_slug text,
      partner_benefit_active boolean not null default false
    );
    insert into public.screening_sessions
      (session_id, flow_mode, partner_slug, partner_benefit_active)
    values
      ('${SPONSORED_SESSION}', 'rcap', 'we-must-vote', true);
    insert into auth.users (id, email) values
      ('${USER_A}', 'a@test.local'), ('${USER_B}', 'b@test.local');
  `);
  for (const file of FULL_SEQUENCE) await apply(db, file);
  // Forward migrations are routinely retried after an interrupted apply. Phase
  // 55 must converge rather than fail on its own constraints or triggers.
  await apply(db, PHASE55);
  return db;
}

async function createConsumerFixtures(db) {
  const personA = String(await value(
    db,
    `insert into public.rcap_persons (partner_slug, match_key)
     values ($1, $2) returning id`,
    [CONSUMER_NAMESPACE, personMatchKey(USER_A)]
  ));
  const personB = String(await value(
    db,
    `insert into public.rcap_persons (partner_slug, match_key)
     values ($1, $2) returning id`,
    [CONSUMER_NAMESPACE, personMatchKey(USER_B)]
  ));

  for (const [id, user] of [[ITEM_A, USER_A], [ITEM_B, USER_A], [ITEM_C, USER_B]]) {
    await db.query(
      `insert into public.consumer_briefcase_items
        (id, user_id, item_type, jurisdiction, pathway_label, result_code, packet_type,
         payment_allowed, status, payment_status, amount_cents)
       values ($1, $2, 'packet', 'MS', 'non-conviction-expungement-for-dismissal-no-disposition-or-acquittal',
               'packet_ready', 'custom_pleading', true, 'packet_ready', 'unpaid', 5000)`,
      [id, user]
    );
  }

  await db.query(
    `insert into public.consumer_briefcase_items
      (id, user_id, item_type, jurisdiction, pathway_label, result_code,
       packet_type, payment_allowed, status, payment_status, amount_cents, source_session_id)
     values
      ($1, $3, 'packet', 'MS', 'sponsored-packet', 'packet_ready',
       'custom_pleading', true, 'packet_ready', 'unpaid', 5000, $4),
      ($2, $3, 'packet', 'MS', 'closed-consumer-packet', 'packet_ready',
       'custom_pleading', false, 'packet_ready', 'unpaid', 5000, null)`,
    [ITEM_SPONSORED, ITEM_CLOSED, USER_A, SPONSORED_SESSION]
  );
  await db.query(
    `insert into public.consumer_briefcase_items
      (id, user_id, item_type, jurisdiction, pathway_label, result_code,
       packet_type, payment_allowed, status, payment_status)
     values ($1, $2, 'result', 'MS', 'guidance-only-path', 'guidance_only',
       'guidance_packet', false, 'guidance_saved', 'not_applicable')`,
    [ITEM_GUIDANCE, USER_A]
  );

  const bindings = [
    [ITEM_A, USER_A, "cs_test_a", personA, matterFor(ITEM_A)],
    [ITEM_B, USER_A, "cs_test_b", personA, matterFor(ITEM_B)],
    [ITEM_C, USER_B, "cs_test_c", personB, matterFor(ITEM_C)],
    [ITEM_SPONSORED, USER_A, "cs_test_sponsored", personA, matterFor(ITEM_SPONSORED)],
    [ITEM_CLOSED, USER_A, "cs_test_closed", personA, matterFor(ITEM_CLOSED)],
    [ITEM_GUIDANCE, USER_A, "cs_test_guidance", personA, matterFor(ITEM_GUIDANCE)]
  ];
  for (const [item, user, session, person, matter] of bindings) {
    await db.query(
      `update public.consumer_briefcase_items
          set payment_provider='stripe', checkout_session_id=$3,
              payment_product_id=$4, payment_person_id=$5, payment_matter_id=$6
        where id=$1 and user_id=$2`,
      [item, user, session, PRODUCT, person, matter]
    );
  }
  return { personA, personB };
}

async function recordPayment(db, {
  item,
  status = "paid",
  event,
  session,
  person,
  matter
}) {
  return one(
    db,
    `select * from public.record_consumer_packet_payment(
       $1, $2, $3, $4, 'stripe', $5, $6, $7, null,
       'server_webhook', 'phase55_test', $8, $9, $10
     )`,
    [
      item,
      status,
      status === "paid" ? 5000 : null,
      status === "paid" ? "usd" : null,
      event,
      session,
      status === "paid" ? `pi_${event}` : null,
      PRODUCT,
      person,
      matter
    ]
  );
}

async function authority(db, item, user, person, matter) {
  return one(
    db,
    `select * from public.consumer_packet_payment_authority($1, $2, $3, $4, $5)`,
    [item, user, PRODUCT, person, matter]
  );
}

async function packet(db, label, owner = USER_A) {
  return String(await value(
    db,
    `insert into public.rcap_document_packets
       (partner_slug, user_id, briefcase_id, state, jurisdiction, pathway)
     values ($1, $2, $3, 'MS', 'MS', $4) returning id`,
    [CONSUMER_NAMESPACE, owner, ITEM_A, label]
  ));
}

async function enqueueConsumer(db, { packetId, inputHash, item, user, person, matter }) {
  return one(
    db,
    `select * from public.enqueue_packet_render_job(
      $1, 'MS:non-conviction-expungement-for-dismissal-no-disposition-or-acquittal',
      'packet_document_v1', '1.0.0', null, 'MS', '1.3.0', $2,
      $3, null, $4, $5, 5, $3, $6
    )`,
    [packetId, inputHash, item, person, matter, user]
  );
}

async function fullSchemaProof() {
  const db = await bootFull();
  try {
    const { personA, personB } = await createConsumerFixtures(db);

    for (const column of [
      "payment_allowed",
      "item_type",
      "jurisdiction",
      "pathway_label",
      "result_code",
      "packet_type",
      "source_session_id"
    ]) {
      assert.equal(
        await value(db, `select has_column_privilege('authenticated', 'public.consumer_briefcase_items', $1, 'INSERT')`, [column]),
        false,
        `authenticated cannot insert server-owned ${column}`
      );
      assert.equal(
        await value(db, `select has_column_privilege('authenticated', 'public.consumer_briefcase_items', $1, 'UPDATE')`, [column]),
        false,
        `authenticated cannot update server-owned ${column}`
      );
    }

    await db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [USER_A]);
    await db.exec(`set role authenticated`);
    await expectDatabaseError(
      () => db.query(
        `update public.consumer_briefcase_items
            set payment_allowed=true, result_code='packet_ready',
                packet_type='custom_pleading', status='packet_ready'
          where id=$1`,
        [ITEM_GUIDANCE]
      ),
      /permission denied/
    );
    await db.query(
      `update public.consumer_briefcase_items
          set summary_json='{"text":"participant note remains writable"}'::jsonb
        where id=$1`,
      [ITEM_GUIDANCE]
    );
    await db.exec(`reset role`);
    assert.equal(
      await value(db, `select payment_allowed from consumer_briefcase_items where id=$1`, [ITEM_GUIDANCE]),
      false,
      "a browser cannot promote a guidance matter to a paid packet"
    );

    await expectDatabaseError(
      () => db.query(
        `insert into public.consumer_briefcase_items
          (user_id, item_type, jurisdiction, pathway_label, result_code, packet_type,
           payment_allowed, status, payment_status, source_session_id)
         select user_id, item_type, jurisdiction, pathway_label, result_code, packet_type,
                payment_allowed, status, payment_status, source_session_id
           from public.consumer_briefcase_items where id=$1`,
        [ITEM_SPONSORED]
      ),
      /consumer_briefcase_items_user_source_session_uk|duplicate key/
    );

    // Even a compromised server caller that managed to set the boolean cannot
    // write payment for a route whose canonical result identity is guidance.
    await db.query(
      `update public.consumer_briefcase_items
          set payment_allowed=true, payment_status='unpaid', amount_cents=5000
        where id=$1`,
      [ITEM_GUIDANCE]
    );
    const malformedGuidance = await recordPayment(db, {
      item: ITEM_GUIDANCE,
      event: "evt_guidance",
      session: "cs_test_guidance",
      person: personA,
      matter: matterFor(ITEM_GUIDANCE)
    });
    assert.equal(malformedGuidance.outcome, "invalid_item", "guidance route identity remains non-payable in the writer");

    assert.equal(
      String(await value(db, `select public.consumer_matter_id_for_briefcase_item($1)`, [ITEM_A])),
      matterFor(ITEM_A),
      "database and server must derive the same canonical matter UUID"
    );

    const paidA = await recordPayment(db, {
      item: ITEM_A,
      event: "evt_a",
      session: "cs_test_a",
      person: personA,
      matter: matterFor(ITEM_A)
    });
    assert.equal(paidA.outcome, "recorded_paid");

    const exact = await authority(db, ITEM_A, USER_A, personA, matterFor(ITEM_A));
    assert.equal(exact.valid, true);
    assert.equal(exact.reason, "authorized");
    assert.equal((await authority(db, ITEM_A, USER_B, personA, matterFor(ITEM_A))).reason, "owner_mismatch");
    assert.equal((await authority(db, ITEM_B, USER_A, personA, matterFor(ITEM_B))).valid, false);
    assert.equal((await authority(db, ITEM_A, USER_A, personA, matterFor(ITEM_B))).reason, "matter_mismatch");

    const replayA = await recordPayment(db, {
      item: ITEM_A,
      event: "evt_a_second_delivery",
      session: "cs_test_a",
      person: personA,
      matter: matterFor(ITEM_A)
    });
    assert.equal(replayA.outcome, "already_paid");
    assert.equal(replayA.provider_event_id, "evt_a", "first signed receipt remains immutable");

    const wrongBinding = await recordPayment(db, {
      item: ITEM_B,
      event: "evt_wrong_binding",
      session: "cs_test_b",
      person: personA,
      matter: matterFor(ITEM_A)
    });
    assert.equal(wrongBinding.outcome, "invalid_payment_evidence");

    const duplicatedReceipt = await recordPayment(db, {
      item: ITEM_C,
      event: "evt_a",
      session: "cs_test_c",
      person: personB,
      matter: matterFor(ITEM_C)
    });
    assert.equal(duplicatedReceipt.outcome, "duplicate_provider_event");
    assert.equal(
      await value(db, `select payment_status from consumer_briefcase_items where id=$1`, [ITEM_C]),
      "unpaid"
    );

    const sponsored = await recordPayment(db, {
      item: ITEM_SPONSORED,
      event: "evt_sponsored",
      session: "cs_test_sponsored",
      person: personA,
      matter: matterFor(ITEM_SPONSORED)
    });
    assert.equal(sponsored.outcome, "sponsored_item", "the payment writer itself rejects RCAP-sponsored items");
    assert.equal(
      await value(db, `select payment_status from consumer_briefcase_items where id=$1`, [ITEM_SPONSORED]),
      "unpaid"
    );

    const closed = await recordPayment(db, {
      item: ITEM_CLOSED,
      event: "evt_closed",
      session: "cs_test_closed",
      person: personA,
      matter: matterFor(ITEM_CLOSED)
    });
    assert.equal(closed.outcome, "payment_not_allowed", "a non-sellable item cannot enter the DTC writer");

    const packetA = await packet(db, "packet-a");
    const inputHash = sha("packet-a-input");
    const job1 = await enqueueConsumer(db, {
      packetId: packetA,
      inputHash,
      item: ITEM_A,
      user: USER_A,
      person: personA,
      matter: matterFor(ITEM_A)
    });
    const sameJob = await enqueueConsumer(db, {
      packetId: packetA,
      inputHash,
      item: ITEM_A,
      user: USER_A,
      person: personA,
      matter: matterFor(ITEM_A)
    });
    assert.equal(sameJob.id, job1.id, "duplicate enqueue returns the one active durable job");

    const unpaidPacket = await packet(db, "unpaid-b");
    await expectDatabaseError(
      () => enqueueConsumer(db, {
        packetId: unpaidPacket,
        inputHash: sha("unpaid-b"),
        item: ITEM_B,
        user: USER_A,
        person: personA,
        matter: matterFor(ITEM_B)
      }),
      /payment binding refused \(payment_status_unpaid\)/
    );

    const claimed1 = await one(
      db,
      `select * from public.claim_packet_render_job('phase55-worker', array['packet_document_v1']::text[], 60)`
    );
    assert.equal(claimed1.id, job1.id);
    assert.equal(
      await value(
        db,
        `select public.fail_packet_render_job($1, $2, 'render_failed', 'first attempt failed', false)`,
        [job1.id, claimed1.fencing_token]
      ),
      "terminal"
    );

    const job2 = await enqueueConsumer(db, {
      packetId: packetA,
      inputHash,
      item: ITEM_A,
      user: USER_A,
      person: personA,
      matter: matterFor(ITEM_A)
    });
    assert.notEqual(job2.id, job1.id, "failed rendering may retry without another payment");
    assert.equal(
      Number(await value(db, `select count(*) from consumer_briefcase_items where id=$1 and payment_status='paid'`, [ITEM_A])),
      1
    );

    const claimed2 = await one(
      db,
      `select * from public.claim_packet_render_job('phase55-worker', array['packet_document_v1']::text[], 60)`
    );
    assert.equal(claimed2.id, job2.id);
    assert.equal(await value(db, `select public.start_packet_render($1, $2)`, [job2.id, claimed2.fencing_token]), true);
    assert.equal(await value(db, `select public.start_packet_validation($1, $2)`, [job2.id, claimed2.fencing_token]), true);
    const outputHash = sha("stored-packet-a");
    const normalizedHash = sha("normalized-packet-a");
    const finalized = await one(
      db,
      `select * from public.finalize_packet_render_job(
        $1, $2, $3, $4, $5, $4, $5, 1234, 2, 'sha256:worker'
      )`,
      [
        job2.id,
        claimed2.fencing_token,
        `private/${job2.id}/${outputHash}.pdf`,
        outputHash,
        normalizedHash
      ]
    );
    assert.equal(finalized.accounting_result, "zero_charge");
    assert.equal(finalized.delivery_eligibility, "eligible");

    const consumption = await one(
      db,
      `select product_id, checkout_session_id, amount_cents, currency,
              person_id::text, matter_id::text
         from consumer_packet_payment_consumption
        where consumer_briefcase_item_id=$1`,
      [ITEM_A]
    );
    assert.deepEqual(consumption, {
      product_id: PRODUCT,
      checkout_session_id: "cs_test_a",
      amount_cents: 5000,
      currency: "usd",
      person_id: personA,
      matter_id: matterFor(ITEM_A)
    });

    await db.query(
      `select public.record_packet_delivery_event($1, 'transmission_completed', $2, '{}'::jsonb)`,
      [job2.id, USER_A]
    );
    await db.query(
      `select public.record_packet_delivery_event($1, 'delivery_authorized', $2, '{}'::jsonb)`,
      [job2.id, USER_A]
    );
    assert.equal(
      Number(await value(db, `select count(*) from packet_credit_ledger where render_job_id=$1`, [job2.id])),
      1,
      "repeat delivery creates no second payment consumption"
    );

    const correctionPacket = await packet(db, "packet-a-correction");
    const correction = await enqueueConsumer(db, {
      packetId: correctionPacket,
      inputHash: sha("packet-a-corrected-input"),
      item: ITEM_A,
      user: USER_A,
      person: personA,
      matter: matterFor(ITEM_A)
    });
    assert.ok(correction.id, "same-matter correction is authorized by the same payment");

    const paidB = await recordPayment(db, {
      item: ITEM_B,
      event: "evt_b",
      session: "cs_test_b",
      person: personA,
      matter: matterFor(ITEM_B)
    });
    assert.equal(paidB.outcome, "recorded_paid", "a separate matter requires its own payment receipt");
    assert.equal(
      Number(await value(db, `select count(*) from consumer_briefcase_items where payment_status='paid'`)),
      2
    );

    const refunded = await recordPayment(db, {
      item: ITEM_A,
      status: "refunded",
      event: "evt_refund_a",
      session: "cs_test_a",
      person: personA,
      matter: matterFor(ITEM_A)
    });
    assert.equal(refunded.outcome, "recorded_refunded");
    assert.equal(
      Number(await value(db, `select count(*) from consumer_packet_payment_consumption where consumer_briefcase_item_id=$1`, [ITEM_A])),
      1,
      "refund preserves already-consumed delivery evidence"
    );
    await db.query(
      `update consumer_packet_payment_consumption set created_at=created_at
        where consumer_briefcase_item_id=$1`,
      [ITEM_A]
    );
    await expectDatabaseError(
      () => db.query(
        `update consumer_packet_payment_consumption set matter_id=$2
          where consumer_briefcase_item_id=$1`,
        [ITEM_A, matterFor(ITEM_B)]
      ),
      /consumer payment consumption binding is immutable/
    );
    await db.query(
      `select public.record_packet_delivery_event($1, 'delivery_authorized', $2, '{}'::jsonb)`,
      [job2.id, USER_A]
    );

    assert.equal(
      await value(
        db,
        `select has_column_privilege('authenticated', 'public.consumer_briefcase_items', 'payment_product_id', 'UPDATE')`
      ),
      false
    );
    assert.equal(
      await value(
        db,
        `select has_column_privilege('authenticated', 'public.consumer_briefcase_items', 'payment_matter_id', 'INSERT')`
      ),
      false
    );
  } finally {
    await db.close();
  }
}

async function partnerOnlyProof() {
  const db = await database();
  try {
    await db.exec(`
      create table public.partner_records (
        id uuid primary key default gen_random_uuid(), partner_slug text unique not null
      );
      create table public.rcap_persons (
        id uuid primary key default gen_random_uuid(), partner_slug text not null, match_key text not null
      );
      create unique index rcap_persons_partner_match_key_idx on rcap_persons(partner_slug, match_key);
      create table public.rcap_document_packets (
        id uuid primary key default gen_random_uuid(), partner_slug text not null,
        state text not null default 'MS', pathway text not null
      );
    `);
    for (const file of FULL_SEQUENCE.slice(3)) await apply(db, file);
    await apply(db, PHASE55);

    assert.equal(
      await value(db, `select to_regclass('public.consumer_briefcase_items') is null`),
      true
    );
    assert.ok(
      await value(db, `select to_regclass('public.packet_render_jobs')::text`),
      "partner queue remains available when consumer storage is absent"
    );
  } finally {
    await db.close();
  }
}

await fullSchemaProof();
await partnerOnlyProof();

console.log("Phase 55 matter-level payment binding verification passed.");
console.log("- Exact user/item/product/person/matter/Session/5000/USD authority is enforced.");
console.log("- The security-definer payment writer rejects sponsored and non-sellable items.");
console.log("- Duplicate, retry, correction, second-matter and refund-after-delivery cases converge safely.");
console.log("- Migration reruns and partner-only schemas remain supported.");
