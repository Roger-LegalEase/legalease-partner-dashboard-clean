#!/usr/bin/env node

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { register } from "node:module";
import { Worker as NodeWorker } from "node:worker_threads";
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { PGliteWorker } from "@electric-sql/pglite/worker";

register("./lib/ts-esm-loader.mjs", import.meta.url);
const packetInformationApplication = await import("../src/lib/expungement-ai/packet-information.ts");
const packetGenerationApplication = await import("../src/lib/expungement-ai/packet-generation.ts");

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const migrationPath = path.join(root, "supabase/migrations/20260827120000_consumer_packet_verification_cas.sql");
const migration = fs.existsSync(migrationPath) ? fs.readFileSync(migrationPath, "utf8") : "";

const USER_A = "11111111-1111-4111-8111-111111111111";
const USER_B = "22222222-2222-4222-8222-222222222222";
const ITEM_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const ITEM_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const ITEM_SPONSORED = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const PERSON_A = "33333333-3333-4333-8333-333333333333";
const PERSON_B = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
const MATTER_A = "44444444-4444-4444-8444-444444444444";
const MATTER_B = "99999999-9999-4999-8999-999999999999";
const PENDING_A = "55555555-5555-4555-8555-555555555555";
const SESSION_A = "66666666-6666-4666-8666-666666666666";
const PENDING_SPONSORED = "88888888-8888-4888-8888-888888888888";
const PACKET_A = "77777777-7777-4777-8777-777777777777";
let HASH_A = "a".repeat(64);
const HASH_B = "b".repeat(64);
let DRAFT_HASH = "d".repeat(64);
const INPUT_HASH = "e".repeat(64);
const SOURCE_HASH = "f".repeat(64);
const sha = (value) => crypto.createHash("sha256").update(value).digest("hex");

class ReplayWorkerAdapter {
  constructor(url) {
    this.worker = new NodeWorker(url);
    this.messages = [];
    this.listeners = new Set();
    this.worker.on("message", (data) => {
      this.messages.push(data);
      for (const entry of [...this.listeners]) this.deliver(entry, data);
    });
  }

  addEventListener(type, listener, options = {}) {
    if (type !== "message") return;
    const entry = { listener, once: options?.once === true };
    this.listeners.add(entry);
    queueMicrotask(() => {
      for (const data of this.messages) {
        if (!this.listeners.has(entry)) break;
        this.deliver(entry, data);
      }
    });
  }

  removeEventListener(type, listener) {
    if (type !== "message") return;
    for (const entry of this.listeners) {
      if (entry.listener === listener) this.listeners.delete(entry);
    }
  }

  postMessage(data) { this.worker.postMessage(data); }
  terminate() { return this.worker.terminate(); }

  deliver(entry, data) {
    if (entry.once) this.listeners.delete(entry);
    entry.listener({ data });
  }
}

async function one(db, text, params = []) {
  const result = await db.query(text, params);
  return result.rows[0] ?? null;
}

async function value(db, text, params = []) {
  const row = await one(db, text, params);
  return row ? Object.values(row)[0] : null;
}

async function expectError(action, pattern) {
  let caught;
  try { await action(); } catch (error) { caught = error; }
  assert.ok(caught, "expected PostgreSQL refusal");
  assert.match(String(caught.message ?? caught), pattern);
}

async function boot() {
  const db = new PGlite({ extensions: { pgcrypto } });
  await db.exec(`
    create extension pgcrypto with schema public;
    create schema extensions;
    create or replace function extensions.digest(bytea, text) returns bytea
      language sql immutable as $$ select public.digest($1, $2) $$;
    create schema auth;
    create role anon;
    create role authenticated;
    create role service_role bypassrls;
    create table auth.users (id uuid primary key);
    create table public.rcap_persons (id uuid primary key, partner_slug text, match_key text);
    create table public.rcap_document_packets (id uuid primary key);
    create table public.consumer_briefcase_items (
      id uuid primary key, user_id uuid not null references auth.users(id), item_type text not null,
      jurisdiction text not null, pathway_label text, result_code text, packet_type text,
      payment_allowed boolean not null default false, status text not null,
      summary_json jsonb not null default '{}'::jsonb, next_steps_json jsonb not null default '[]'::jsonb,
      artifact_refs_json jsonb not null default '{}'::jsonb, payment_status text not null default 'unpaid',
      packet_status text not null default 'not_started', source_session_id text,
      payment_provider text, checkout_session_id text, payment_intent_id text, amount_cents integer,
      currency text, receipt_url text, provider_event_id text, payment_authority text,
      payment_recorded_at timestamptz, payment_recorded_by text,
      payment_product_id text, payment_person_id uuid, payment_matter_id uuid,
      created_at timestamptz not null default now(), updated_at timestamptz not null default now()
    );
    grant select, insert, update, delete on public.consumer_briefcase_items to authenticated;
    grant insert(
      id,user_id,created_at,payment_status,amount_cents,currency,payment_provider,checkout_session_id,
      payment_intent_id,receipt_url,provider_event_id,payment_authority,payment_recorded_at,payment_recorded_by,
      payment_product_id,payment_person_id,payment_matter_id,payment_allowed,item_type,jurisdiction,pathway_label,
      result_code,packet_type,source_session_id
    ), update(
      id,user_id,created_at,payment_status,amount_cents,currency,payment_provider,checkout_session_id,
      payment_intent_id,receipt_url,provider_event_id,payment_authority,payment_recorded_at,payment_recorded_by,
      payment_product_id,payment_person_id,payment_matter_id,payment_allowed,item_type,jurisdiction,pathway_label,
      result_code,packet_type,source_session_id
    )
      on public.consumer_briefcase_items to public, anon, authenticated;
    grant all on public.consumer_briefcase_items to service_role;
    create table public.consumer_pending_screening_results (
      pending_id uuid primary key, claimed_user_id uuid, claimed_at timestamptz, expires_at timestamptz,
      product text not null, jurisdiction text not null, screening_answers jsonb not null,
      profile_version text, matter_id text, source_session_id uuid,
      created_at timestamptz not null default now(), updated_at timestamptz not null default now()
    );
    create table public.screening_sessions (
      session_id uuid primary key, flow_mode text, partner_slug text, partner_benefit_active boolean,
      claimed_slot_state text, status text
    );
    create table public.partner_entitlement (
      partner_slug text primary key, screenings_used integer, screenings_allowed integer,
      overage_enabled boolean, pause_at_cap boolean, overage_packets integer, overage_amount_cents integer,
      overage_packet_price_cents integer
    );
    create table public.packet_render_jobs (
      id uuid primary key default gen_random_uuid(), packet_id uuid not null, route_id text not null,
      renderer_kind text not null, renderer_version text not null, source_sha256 text, profile_id text not null,
      profile_version text not null, input_hash text not null, briefcase_item_id uuid, partner_id uuid,
      person_id uuid, matter_id uuid, max_attempts integer not null, consumer_briefcase_item_id uuid,
      consumer_auth_user_id uuid, status text not null default 'queued', created_at timestamptz default now()
    );
    create unique index packet_render_jobs_input_hash_live_unique
      on public.packet_render_jobs(packet_id, input_hash) where status <> 'failed';
    revoke insert, update, delete on public.packet_render_jobs from service_role;
    grant select on public.packet_render_jobs to service_role;

    create or replace function public.consumer_matter_id_for_briefcase_item(uuid) returns uuid
      language sql immutable as $$ select '${MATTER_A}'::uuid $$;
    create or replace function public.consumer_packet_payment_authority(uuid, uuid, text, uuid, uuid)
      returns table(valid boolean, reason text, provider_event_id text) language sql stable security definer as $$
        select b.payment_status = 'paid' and b.user_id = $2 and b.payment_product_id = $3
               and b.payment_person_id = $4 and b.payment_matter_id = $5,
               case when b.payment_status = 'paid' then 'authorized' else 'not_paid' end,
               b.provider_event_id
        from public.consumer_briefcase_items b where b.id = $1
      $$;
    create or replace function public.record_consumer_packet_payment(
      uuid,text,integer,text,text,text,text,text,text,text,text,text,uuid,uuid
    ) returns table(outcome text, briefcase_item_id uuid, provider_event_id text)
      language plpgsql security definer as $$ begin
        update public.consumer_briefcase_items set payment_status=$2, amount_cents=$3, currency=$4,
          payment_provider=$5, provider_event_id=$6, checkout_session_id=$7, payment_intent_id=$8,
          receipt_url=$9, payment_authority=$10, payment_recorded_by=$11,
          payment_recorded_at=now(), payment_product_id=$12, payment_person_id=$13, payment_matter_id=$14
          where id=$1;
        return query select ('recorded_' || $2)::text, $1, $6;
      end $$;
    create or replace function public.enqueue_packet_render_job(
      uuid,text,text,text,text,text,text,text,uuid,uuid,uuid,uuid,integer,uuid,uuid
    ) returns setof public.packet_render_jobs language plpgsql security definer as $$ begin
      return query insert into public.packet_render_jobs(packet_id,route_id,renderer_kind,renderer_version,
        source_sha256,profile_id,profile_version,input_hash,briefcase_item_id,partner_id,person_id,matter_id,
        max_attempts,consumer_briefcase_item_id,consumer_auth_user_id)
      values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) returning *;
    end $$;
    create or replace function public.record_partner_packet_generation(uuid, timestamptz default now())
      returns table(recorded boolean,counted_as text,reason text,partner_slug text,screenings_used integer,
                    screenings_allowed integer,overage_packets integer,overage_amount_cents integer)
      language plpgsql security definer as $$ declare s public.screening_sessions%rowtype; e public.partner_entitlement%rowtype;
      begin
        select * into s from public.screening_sessions where session_id=$1 for update;
        select * into e from public.partner_entitlement pe where pe.partner_slug=s.partner_slug for update;
        if s.claimed_slot_state <> 'claimed' then
          return query select false,'not_counted'::text,'already_recorded'::text,s.partner_slug,e.screenings_used,e.screenings_allowed,e.overage_packets,e.overage_amount_cents; return;
        end if;
        update public.partner_entitlement pe set screenings_used=pe.screenings_used+1 where pe.partner_slug=s.partner_slug;
        update public.screening_sessions set claimed_slot_state='consumed',status='completed' where session_id=$1;
        return query select true,'included'::text,null::text,s.partner_slug,e.screenings_used+1,e.screenings_allowed,e.overage_packets,e.overage_amount_cents;
      end $$;
  `);
  await db.exec(migration);
  return db;
}

async function provePartnerInitializationAcrossTwoConnections() {
  const seed = await boot();
  const data = await seed.dumpDataDir();
  await seed.close();

  const workerAdapter = new ReplayWorkerAdapter(new URL("./lib/pglite-cas-worker-thread.mjs", import.meta.url));
  const options = {
    id: `consumer-cas-${crypto.randomUUID()}`,
    dataDir: "memory://consumer-cas-concurrency",
    loadDataDir: data
  };
  const first = await PGliteWorker.create(workerAdapter, options);
  const second = await PGliteWorker.create(workerAdapter, options);
  try {
    const session = "12121212-1212-4212-8212-121212121212";
    const pendingOne = "13131313-1313-4313-8313-131313131313";
    const pendingTwo = "14141414-1414-4414-8414-141414141414";
    const itemOne = "15151515-1515-4515-8515-151515151515";
    const itemTwo = "16161616-1616-4616-8616-161616161616";
    await first.query("insert into auth.users(id) values($1),($2)", [USER_A,USER_B]);
    await first.query(`insert into public.screening_sessions(session_id,flow_mode,partner_slug,partner_benefit_active,claimed_slot_state,status)
      values($1,'rcap','concurrent-partner',true,'claimed','completed')`, [session]);
    await first.query(`insert into public.consumer_briefcase_items
      (id,user_id,item_type,jurisdiction,pathway_label,result_code,packet_type,payment_allowed,status,source_session_id)
      values($1,$2,'result','MS','path','packet_ready','custom_pleading',false,'packet_ready',$3),
            ($4,$5,'result','MS','path','packet_ready','custom_pleading',false,'packet_ready',$3)`,
      [itemOne,USER_A,session,itemTwo,USER_B]);
    await first.query(`insert into public.consumer_pending_screening_results
      (pending_id,product,jurisdiction,screening_answers,profile_version,matter_id,source_session_id,expires_at)
      values($1,'rcap_partner','MS',$2::jsonb,'1','concurrent-one',$3,now()+interval '1 day'),
            ($4,'rcap_partner','MS',$2::jsonb,'1','concurrent-two',$3,now()+interval '1 day')`,
      [pendingOne,JSON.stringify({eligible:true}),session,pendingTwo]);
    const firstDraft = {
      ...draft(),
      dependencies: { commercialFlowVersion: 1, entitlementSource: "partner_sponsorship", productId: "expungement_packet" }
    };
    const secondDraft = { ...firstDraft };
    const [oneResult, twoResult] = await Promise.all([
      one(first, `select * from public.initialize_consumer_packet_verification($1,$2,$3,'concurrent-one',$4,$5::jsonb)`,
        [USER_A,itemOne,pendingOne,packetInformationApplication.protectedPacketDraftHash(firstDraft),JSON.stringify(firstDraft)]),
      one(second, `select * from public.initialize_consumer_packet_verification($1,$2,$3,'concurrent-two',$4,$5::jsonb)`,
        [USER_B,itemTwo,pendingTwo,packetInformationApplication.protectedPacketDraftHash(secondDraft),JSON.stringify(secondDraft)])
    ]);
    assert.equal([oneResult,twoResult].filter(Boolean).length, 1,
      "two connections racing one partner source must initialize exactly one owner/pending pair");
    assert.equal(Number(await value(first, `select count(*) from public.consumer_pending_screening_results
      where source_session_id=$1 and claimed_user_id is not null`, [session])), 1);
    assert.equal(Number(await value(second, `select count(*) from public.consumer_briefcase_items
      where source_session_id=$1 and packet_verification_status is not null`, [session])), 1);
  } finally {
    await first.close();
    await second.close();
  }
}

function draft(capturedAt = "2026-08-27T12:00:00.000Z") {
  return {
    schemaVersion: "expungement-ai/protected-packet-draft/v1", capturedAt,
    jurisdiction: "MS", profileVersion: "1", profileSourceFingerprint: null,
    profileAuthorityFingerprint: "authority", pathwayId: "path", resultCode: "packet_ready",
    paymentAllowed: true, packetType: "custom_pleading", packetPlan: { requiredInputIds: [] },
    requiredInputIds: [], packetFamilyIdentifiers: { mode: "custom", sourceFormIds: [] },
    selectedTrackId: null, treatmentClassification: null, deferralComponentIds: [],
    screeningAnswers: { eligible: true }, packetAnswers: {}, serverFacts: { jurisdiction: "MS" },
    prefilledAnswers: {}, dependencies: { commercialFlowVersion: 1, entitlementSource: "consumer_payment", productId: "expungement_packet" }
  };
}

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
  }
  return value;
}

function jsonHash(value) {
  return sha(JSON.stringify(canonical(value)));
}

async function persist(db, { user = USER_A, item = ITEM_A, priorHash = null, revision = 0, draftSnapshot = draft() } = {}) {
  const snapshot = draftSnapshot;
  const verified = packetInformationApplication.verifiedPacketRecordFromDraft(snapshot, snapshot.capturedAt);
  assert.equal(verified.status, "verified");
  const final = verified.snapshot;
  const draftHash = packetInformationApplication.protectedPacketDraftHash(snapshot);
  const nextHash = verified.hash;
  return one(db, `select * from public.persist_consumer_packet_verification(
    $1,$2,$3,$4,'{}'::jsonb,'{}'::jsonb,$5,$6::jsonb,'verified','explicit_final_verification',$7,$8::jsonb,null
  )`, [user,item,priorHash,revision,draftHash,JSON.stringify(snapshot),nextHash,JSON.stringify(final)]);
}

async function main() {
  assert.ok(migration, "migration missing");
  assert.equal(typeof packetInformationApplication.verifiedPacketRecordFromDraft, "function",
    "the application must expose its real protected-draft to final-snapshot/hash transition to this integration harness");
  const initialDraft = draft();
  DRAFT_HASH = packetInformationApplication.protectedPacketDraftHash(initialDraft);
  HASH_A = packetInformationApplication.verifiedPacketRecordFromDraft(initialDraft, initialDraft.capturedAt).hash;
  const db = await boot();
  try {
    const canonicalProbe = { zebra: [3, { beta: "é", alpha: "line\nbreak" }], alpha: true };
    assert.equal(
      await value(db, "select public.consumer_packet_json_sha256($1::jsonb)", [JSON.stringify(canonicalProbe)]),
      jsonHash(canonicalProbe),
      "PostgreSQL canonical JSON must match sorted compact application JSON"
    );
    await db.query("insert into auth.users(id) values($1),($2)", [USER_A, USER_B]);
    await db.query(`insert into public.rcap_persons(id,partner_slug,match_key) values
      ($1,'expungement-ai-consumer',$2),($3,'expungement-ai-consumer',$4)`, [
      PERSON_A, `consumer:${sha(`rcap:consumer-person:v1:${USER_A}`)}`,
      PERSON_B, `consumer:${sha(`rcap:consumer-person:v1:${USER_B}`)}`
    ]);
    await db.query(`insert into public.consumer_briefcase_items
      (id,user_id,item_type,jurisdiction,pathway_label,result_code,packet_type,payment_allowed,status,source_session_id)
      values($1,$2,'result','MS','path','packet_ready','custom_pleading',true,'packet_ready',$3),
            ($4,$5,'result','MS','path','packet_ready','custom_pleading',true,'packet_ready',null)`,
      [ITEM_A,USER_A,PENDING_A,ITEM_B,USER_B]);
    await db.query(`insert into public.consumer_pending_screening_results
      (pending_id,claimed_user_id,claimed_at,expires_at,product,jurisdiction,screening_answers,profile_version,matter_id)
      values($1,$2,'2026-08-26T11:00:00Z','2026-08-26T12:00:00Z','expungement_ai_dtc','MS',$3::jsonb,'1','screening-matter')`,
      [PENDING_A,USER_A,JSON.stringify({eligible:true})]);

    // Lazy same-source legacy initialization: the expired source was already
    // claimed by this exact owner, but no participant JSON is promoted. The
    // protected row remains absent until the atomic initializer validates it.
    assert.equal(await one(db, "select * from public.get_consumer_packet_verification_authority($1,$2)", [USER_A,ITEM_A]), null);
    const initialized = await one(db, `select * from public.initialize_consumer_packet_verification($1,$2,$3,'screening-matter',$4,$5::jsonb)`,
      [USER_A,ITEM_A,PENDING_A,DRAFT_HASH,JSON.stringify(initialDraft)]);
    assert.equal(initialized.initialized, true);
    assert.equal(initialized.revision, 0);
    const duplicateInitializer = await one(db, `select * from public.initialize_consumer_packet_verification($1,$2,$3,'screening-matter',$4,$5::jsonb)`,
      [USER_A,ITEM_A,PENDING_A,DRAFT_HASH,JSON.stringify(initialDraft)]);
    assert.equal(duplicateInitializer.initialized, false, "identical initializer retry converges");
    assert.equal(await one(db, `select * from public.initialize_consumer_packet_verification($1,$2,$3,'wrong-matter',$4,$5::jsonb)`,
      [USER_A,ITEM_A,PENDING_A,DRAFT_HASH,JSON.stringify(initialDraft)]), null);
    assert.equal(await one(db, `select * from public.initialize_consumer_packet_verification($1,$2,$3,'screening-matter',$4,$5::jsonb)`,
      [USER_B,ITEM_A,PENDING_A,DRAFT_HASH,JSON.stringify(initialDraft)]), null);
    const forgedDraft = { ...initialDraft, screeningAnswers: { eligible: false } };
    assert.equal(await one(db, `select * from public.initialize_consumer_packet_verification($1,$2,$3,'screening-matter',$4,$5::jsonb)`,
      [USER_A,ITEM_A,PENDING_A,packetInformationApplication.protectedPacketDraftHash(forgedDraft),JSON.stringify(forgedDraft)]), null);
    const concurrentWriters = await Promise.all([persist(db), persist(db)]);
    const winners = concurrentWriters.filter(Boolean);
    assert.equal(winners.length, 1, "two concurrent expected-revision writers must have exactly one winner");
    const first = winners[0];
    assert.equal(first.revision, 1);
    assert.equal(first.hash, HASH_A);
    assert.equal((await persist(db, { priorHash: null, revision: 0 })) ?? null, null, "stale concurrent initializer must refuse");
    const reread = await one(db, "select * from public.get_consumer_packet_verification_authority($1,$2)", [USER_A,ITEM_A]);
    assert.equal(reread.hash, HASH_A, "subsequent read uses the protected winner");
    assert.equal((await persist(db, { user: USER_B, priorHash: HASH_A, revision: 1 })) ?? null, null);
    assert.equal((await persist(db, { item: ITEM_B, priorHash: HASH_A, revision: 1 })) ?? null, null);

    const noOp = await persist(db, { priorHash: HASH_A, revision: 1 });
    assert.equal(noOp.revision, 1, "semantic no-op must not churn revision");

    const checkoutBindingSql = `select checkout_session_id,packet_checkout_verification_hash,
      payment_product_id,payment_person_id,payment_matter_id
      from public.consumer_briefcase_items where id=$1`;
    const beforeCheckout = await one(db, checkoutBindingSql, [ITEM_A]);
    assert.deepEqual(beforeCheckout, {
      checkout_session_id: null, packet_checkout_verification_hash: null,
      payment_product_id: null, payment_person_id: null, payment_matter_id: null
    }, "a fresh verified item has no prepopulated checkout binding authority");
    const staleBind = await one(db, `select * from public.bind_consumer_checkout_verification($1,$2,'cs_stale','stripe','expungement_packet',$3,$4,$5)`, [USER_A,ITEM_A,PERSON_A,MATTER_A,HASH_B]);
    assert.equal(staleBind.ok, false);
    const wrongOwnerBind = await one(db, `select * from public.bind_consumer_checkout_verification($1,$2,'cs_wrong_owner','stripe','expungement_packet',$3,$4,$5)`, [USER_B,ITEM_A,PERSON_A,MATTER_A,HASH_A]);
    assert.equal(wrongOwnerBind.ok, false);
    const wrongMatterBind = await one(db, `select * from public.bind_consumer_checkout_verification($1,$2,'cs_wrong_matter','stripe','expungement_packet',$3,$4,$5)`, [USER_A,ITEM_A,PERSON_A,MATTER_B,HASH_A]);
    assert.equal(wrongMatterBind.ok, false);
    const wrongPersonBind = await one(db, `select * from public.bind_consumer_checkout_verification($1,$2,'cs_wrong_person','stripe','expungement_packet',$3,$4,$5)`, [USER_A,ITEM_A,PERSON_B,MATTER_A,HASH_A]);
    assert.equal(wrongPersonBind.ok, false);
    const wrongProductBind = await one(db, `select * from public.bind_consumer_checkout_verification($1,$2,'cs_wrong_product','stripe','other_product',$3,$4,$5)`, [USER_A,ITEM_A,PERSON_A,MATTER_A,HASH_A]);
    assert.equal(wrongProductBind.ok, false);
    assert.deepEqual(
      await one(db, checkoutBindingSql, [ITEM_A]),
      beforeCheckout,
      "cross-owner, cross-matter, cross-person, wrong-product, and stale checkout refusals must have no side effects"
    );
    await db.query("select set_config('legalease.packet_cas_authority','checkout',false)");
    await db.query("update public.consumer_briefcase_items set payment_product_id='expungement_packet' where id=$1", [ITEM_A]);
    await db.query("select set_config('legalease.packet_cas_authority','',false)");
    const mixedBind = await one(db, `select * from public.bind_consumer_checkout_verification($1,$2,'cs_mixed','stripe','expungement_packet',$3,$4,$5)`, [USER_A,ITEM_A,PERSON_A,MATTER_A,HASH_A]);
    assert.equal(mixedBind.ok, false, "a partially populated binding refuses rather than completing mixed state");
    assert.deepEqual(await one(db, checkoutBindingSql, [ITEM_A]), {
      checkout_session_id: null, packet_checkout_verification_hash: null,
      payment_product_id: "expungement_packet", payment_person_id: null, payment_matter_id: null
    }, "mixed binding refusal has no side effects");
    await db.query("select set_config('legalease.packet_cas_authority','checkout',false)");
    await db.query("update public.consumer_briefcase_items set payment_product_id=null where id=$1", [ITEM_A]);
    await db.query("select set_config('legalease.packet_cas_authority','',false)");
    const bound = await one(db, `select * from public.bind_consumer_checkout_verification($1,$2,'cs_a','stripe','expungement_packet',$3,$4,$5)`, [USER_A,ITEM_A,PERSON_A,MATTER_A,HASH_A]);
    assert.equal(bound.ok, true);
    assert.deepEqual(await one(db, checkoutBindingSql, [ITEM_A]), {
      checkout_session_id: "cs_a", packet_checkout_verification_hash: HASH_A,
      payment_product_id: "expungement_packet", payment_person_id: PERSON_A, payment_matter_id: MATTER_A
    }, "first fresh bind atomically persists session, verification hash, product, canonical person, and deterministic matter");
    const rebound = await one(db, `select * from public.bind_consumer_checkout_verification($1,$2,'cs_a','stripe','expungement_packet',$3,$4,$5)`, [USER_A,ITEM_A,PERSON_A,MATTER_A,HASH_A]);
    assert.equal(rebound.ok, true, "identical checkout retry converges");

    const stalePayment = await one(db, `select * from public.record_consumer_packet_payment(
      $1,'paid',5000,'usd','stripe','evt_stale','cs_a','pi_a',null,'server_webhook','test','expungement_packet',$2,$3,$4
    )`, [ITEM_A,PERSON_A,MATTER_A,HASH_B]);
    assert.notEqual(stalePayment.outcome, "recorded_paid");
    assert.deepEqual(
      await one(db, "select payment_status,provider_event_id,packet_payment_verification_hash from public.consumer_briefcase_items where id=$1", [ITEM_A]),
      { payment_status: "unpaid", provider_event_id: null, packet_payment_verification_hash: null },
      "stale payment refusal must roll back every payment effect"
    );
    const paid = await one(db, `select * from public.record_consumer_packet_payment(
      $1,'paid',5000,'usd','stripe','evt_a','cs_a','pi_a',null,'server_webhook','test','expungement_packet',$2,$3,$4
    )`, [ITEM_A,PERSON_A,MATTER_A,HASH_A]);
    assert.equal(paid.outcome, "recorded_paid");

    const staleArtifact = await one(db, `select * from public.attach_consumer_packet_artifact_if_verified($1,$2,$3,'consumer_payment',$4::jsonb)`,
      [USER_A,ITEM_A,HASH_B,JSON.stringify({ source: "source_driven_packet_plan", artifactSha256: sha("a") })]);
    assert.equal(staleArtifact, null);
    assert.equal(Number(await value(db, "select packet_artifact_revision from public.consumer_briefcase_items where id=$1", [ITEM_A])), 0);
    const artifact = {
      provider: "rcap_source_engine",
      packetId: "packet-a",
      fileName: "packet-a.txt",
      contentType: "text/plain",
      generatedAt: "2026-08-27T12:00:00.000Z",
      source: "source_driven_packet_plan",
      packetPlanId: "MS:path",
      downloadPath: "/api/expungement-ai/briefcase/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/packet/download",
      text: "immutable packet bytes"
    };
    const attached = await one(db, `select * from public.attach_consumer_packet_artifact_if_verified($1,$2,$3,'consumer_payment',$4::jsonb)`,
      [USER_A,ITEM_A,HASH_A,JSON.stringify(artifact)]);
    assert.equal(attached.status, "ready");
    const conflicting = await one(db, `select * from public.attach_consumer_packet_artifact_if_verified($1,$2,$3,'consumer_payment',$4::jsonb)`,
      [USER_A,ITEM_A,HASH_A,JSON.stringify({ ...artifact, artifactSha256: sha("other") })]);
    assert.equal(conflicting, null, "artifact authority is immutable");

    const job = await one(db, `select * from public.enqueue_verified_consumer_packet_render(
      $1,'MS:path','packet_document_v1','1', $2,'MS','1',$3,$4,$5,$6,5,$4,$7,$8,$9::jsonb,$10::jsonb
    )`, [PACKET_A,SOURCE_HASH,INPUT_HASH,ITEM_A,PERSON_A,MATTER_A,USER_A,HASH_A,JSON.stringify({packet:true}),JSON.stringify({facts:true})]);
    assert.ok(job?.id);
    const staleJobCount = await value(db, `select count(*) from public.enqueue_verified_consumer_packet_render(
      $1,'MS:path','packet_document_v1','1',$2,'MS','1',$3,$4,$5,$6,5,$4,$7,$8,$9::jsonb,$10::jsonb
    )`, [PACKET_A,SOURCE_HASH,"1".repeat(64),ITEM_A,PERSON_A,MATTER_A,USER_A,HASH_B,JSON.stringify({packet:true}),JSON.stringify({facts:true})]);
    assert.equal(Number(staleJobCount), 0);
    assert.equal(Number(await value(db, "select count(*) from public.packet_render_jobs")), 1);

    await expectError(() => db.query(`select * from public.enqueue_packet_render_job(
      gen_random_uuid(),'MS:path','packet_document_v1','1',$1,'MS','1',$2,$3,null,$4,$5,5,$3,$6
    )`, [SOURCE_HASH,"2".repeat(64),ITEM_A,PERSON_A,MATTER_A,USER_A]), /consumer jobs require enqueue_verified_consumer_packet_render/);
    assert.equal(Number(await value(db, "select count(*) from public.packet_render_jobs")), 1,
      "the old enqueue consumer refusal must not create a job");

    assert.equal(await value(db, `select to_regprocedure('public.record_consumer_packet_payment(uuid,text,integer,text,text,text,text,text,text,text,text,text,uuid,uuid)') is null`), true,
      "the old public 14-argument payment overload must be gone");
    assert.equal(await value(db, `select to_regprocedure('public.record_consumer_packet_payment_phase55(uuid,text,integer,text,text,text,text,text,text,text,text,text,uuid,uuid)') is not null`), true);

    const blockedColumns = [
      "id","user_id","created_at","payment_status","amount_cents","currency","payment_provider","checkout_session_id",
      "payment_intent_id","receipt_url","provider_event_id","payment_authority","payment_recorded_at","payment_recorded_by",
      "payment_product_id","payment_person_id","payment_matter_id","payment_allowed","item_type","jurisdiction","pathway_label",
      "result_code","packet_type","source_session_id","packet_verification_revision","packet_draft_hash","packet_draft_snapshot",
      "packet_verification_status","packet_verification_reason","packet_verification_hash","packet_verification_snapshot",
      "packet_verification_invalidated_at","packet_checkout_verification_hash","packet_payment_verification_hash","packet_artifact_json",
      "packet_artifact_verification_hash","packet_artifact_entitlement_source","packet_artifact_accounting_result","packet_artifact_revision"
    ];
    for (const role of ["anon", "authenticated"]) {
      assert.equal(await value(db, `select has_function_privilege($1,'public.persist_consumer_packet_verification(uuid,uuid,text,bigint,jsonb,jsonb,text,jsonb,text,text,text,jsonb,timestamptz)','EXECUTE')`, [role]), false);
      assert.equal(await value(db, `select has_column_privilege($1,'public.consumer_briefcase_items','packet_verification_hash','UPDATE')`, [role]), false);
      for (const column of blockedColumns) {
        assert.equal(await value(db, `select has_column_privilege($1,'public.consumer_briefcase_items',$2,'INSERT')`, [role,column]), false);
        assert.equal(await value(db, `select has_column_privilege($1,'public.consumer_briefcase_items',$2,'UPDATE')`, [role,column]), false);
      }
      assert.equal(await value(db, `select has_table_privilege($1,'public.consumer_briefcase_items','TRUNCATE')`, [role]), false);
      assert.equal(await value(db, `select has_function_privilege($1,'public.initialize_consumer_packet_verification(uuid,uuid,uuid,text,text,jsonb)','EXECUTE')`, [role]), false);
    }
    assert.equal(await value(db, `select has_function_privilege('service_role','public.persist_consumer_packet_verification(uuid,uuid,text,bigint,jsonb,jsonb,text,jsonb,text,text,text,jsonb,timestamptz)','EXECUTE')`), true);
    assert.equal(await value(db, `select has_function_privilege('service_role','public.record_consumer_packet_payment_phase55(uuid,text,integer,text,text,text,text,text,text,text,text,text,uuid,uuid)','EXECUTE')`), false);
    assert.equal(await value(db, `select has_function_privilege('service_role','public.enqueue_packet_render_job_phase53(uuid,text,text,text,text,text,text,text,uuid,uuid,uuid,uuid,integer,uuid,uuid)','EXECUTE')`), false);
    assert.equal(await value(db, `select has_function_privilege('service_role','public.enqueue_packet_render_job(uuid,text,text,text,text,text,text,text,uuid,uuid,uuid,uuid,integer,uuid,uuid)','EXECUTE')`), true);
    assert.equal(Number(await value(db, `select count(*) from information_schema.column_privileges
      where table_schema='public' and table_name='consumer_briefcase_items' and grantee='PUBLIC'
        and privilege_type in ('INSERT','UPDATE') and column_name = any($1::text[])`, [blockedColumns])), 0,
      "PUBLIC must retain no explicit blocked-column grants");
    await expectError(() => db.exec(`set role authenticated;
      update public.consumer_briefcase_items
         set id='17171717-1717-4171-8171-171717171717'
       where id='${ITEM_A}'`), /permission denied/);
    await db.exec("reset role");
    await expectError(() => db.exec(`set role authenticated;
      insert into public.consumer_briefcase_items
        (id,user_id,item_type,jurisdiction,payment_allowed,status,created_at)
      values
        ('18181818-1818-4181-8181-181818181818','${USER_A}','result','MS',false,'packet_ready',now())`), /permission denied/);
    await db.exec("reset role");
    assert.equal(await value(db, `select has_function_privilege('service_role','public.record_partner_packet_generation(uuid,timestamptz)','EXECUTE')`), false,
      "sponsored credit is reachable only inside the session-aware verified finalizer");

    const source = await one(db, "select * from public.get_consumer_briefcase_presentation_source($1,$2)", [USER_A,ITEM_A]);
    assert.equal(source.consumer_auth_user_id, USER_A);
    assert.equal(source.briefcase_item_id, ITEM_A);
    assert.match(source.screening_answers_sha256, /^[a-f0-9]{64}$/);
    assert.match(source.source_linkage_sha256, /^[a-f0-9]{64}$/);
    assert.equal(await one(db, "select * from public.get_consumer_briefcase_presentation_source($1,$2)", [USER_B,ITEM_A]), null);
    await db.query(`insert into public.consumer_pending_screening_results
      (pending_id,claimed_user_id,claimed_at,expires_at,product,jurisdiction,screening_answers,profile_version,matter_id)
      values(gen_random_uuid(),$1,'2026-08-27T12:00:00Z','2026-08-26T12:00:00Z','expungement_ai_dtc','MS','{}','1','forged')`, [USER_B]);
    assert.equal(await one(db, "select * from public.get_consumer_briefcase_presentation_source($1,$2)", [USER_B,ITEM_B]), null);

    // Sponsored generation reuses the existing included/overage writer and
    // attaches protected artifact authority in the same transaction.
    const sponsoredDraft = {
      ...draft(),
      dependencies: { commercialFlowVersion: 1, entitlementSource: "partner_sponsorship", productId: "expungement_packet" }
    };
    await db.query(`insert into public.consumer_briefcase_items
      (id,user_id,item_type,jurisdiction,pathway_label,result_code,packet_type,payment_allowed,status,source_session_id)
      values($1,$2,'result','MS','path','packet_ready','custom_pleading',false,'packet_ready',$3)`,
      [ITEM_SPONSORED,USER_A,SESSION_A]);
    await db.query(`insert into public.screening_sessions(session_id,flow_mode,partner_slug,partner_benefit_active,claimed_slot_state,status)
      values($1,'rcap','partner-a',true,'claimed','completed')`, [SESSION_A]);
    await db.query(`insert into public.partner_entitlement(partner_slug,screenings_used,screenings_allowed,overage_enabled,pause_at_cap,overage_packets,overage_amount_cents,overage_packet_price_cents)
      values('partner-a',0,2,true,false,0,0,5000)`);
    await db.query(`insert into public.consumer_pending_screening_results
      (pending_id,product,jurisdiction,screening_answers,profile_version,matter_id,source_session_id,expires_at)
      values($1,'rcap_partner','MS',$2::jsonb,'1','sponsored-matter',$3,now()+interval '1 day')`,
      [PENDING_SPONSORED,JSON.stringify({eligible:true}),SESSION_A]);
    assert.deepEqual(
      await one(db, `select p.claimed_user_id,b.packet_verification_status
        from public.consumer_pending_screening_results p cross join public.consumer_briefcase_items b
       where p.pending_id=$1 and b.id=$2`, [PENDING_SPONSORED,ITEM_SPONSORED]),
      { claimed_user_id: null, packet_verification_status: null },
      "a required follow-up failure before initialization leaves source and protected state retryable"
    );
    const sponsoredInit = await one(db, `select * from public.initialize_consumer_packet_verification($1,$2,$3,'sponsored-matter',$4,$5::jsonb)`,
      [USER_A,ITEM_SPONSORED,PENDING_SPONSORED,packetInformationApplication.protectedPacketDraftHash(sponsoredDraft),JSON.stringify(sponsoredDraft)]);
    assert.equal(sponsoredInit.initialized, true);
    const sponsoredVerified = await persist(db, { item: ITEM_SPONSORED, draftSnapshot: sponsoredDraft });
    const sponsoredHash = sponsoredVerified.hash;
    const sponsoredArtifact = { source: "source_driven_packet_plan", artifactSha256: sha("sponsored") };
    assert.equal(await one(db, `select * from public.attach_consumer_packet_artifact_if_verified($1,$2,$3,'partner_sponsorship',$4::jsonb)`,
      [USER_A,ITEM_SPONSORED,sponsoredHash,JSON.stringify(sponsoredArtifact)]), null,
    "the generic artifact writer must remain paid-only");
    const refusedFinalization = await one(db, `select * from public.finalize_sponsored_packet_generation_if_verified($1,$2,$3,$4::jsonb)`,
      [SESSION_A,ITEM_SPONSORED,HASH_B,JSON.stringify(sponsoredArtifact)]);
    assert.equal(refusedFinalization.ok, false);
    assert.deepEqual(
      await one(db, `select s.claimed_slot_state,e.screenings_used,b.packet_artifact_json
        from public.screening_sessions s cross join public.partner_entitlement e
        join public.consumer_briefcase_items b on b.id=$2
       where s.session_id=$1 and e.partner_slug='partner-a'`, [SESSION_A,ITEM_SPONSORED]),
      { claimed_slot_state: "claimed", screenings_used: 0, packet_artifact_json: null },
      "sponsored verification refusal must consume neither credit nor artifact"
    );
    const finalized = await one(db, `select * from public.finalize_sponsored_packet_generation_if_verified($1,$2,$3,$4::jsonb)`,
      [SESSION_A,ITEM_SPONSORED,sponsoredHash,JSON.stringify(sponsoredArtifact)]);
    assert.equal(finalized.ok, true);
    assert.equal(finalized.recorded, true);
    assert.equal(finalized.counted_as, "included");
    const finalizedRetry = await one(db, `select * from public.finalize_sponsored_packet_generation_if_verified($1,$2,$3,$4::jsonb)`,
      [SESSION_A,ITEM_SPONSORED,sponsoredHash,JSON.stringify(sponsoredArtifact)]);
    assert.equal(finalizedRetry.ok, true);
    assert.equal(finalizedRetry.recorded, false);
    assert.equal(Number(await value(db, "select screenings_used from public.partner_entitlement where partner_slug='partner-a'")), 1);
    assert.ok(await one(db, "select * from public.get_consumer_briefcase_presentation_source($1,$2)", [USER_A,ITEM_SPONSORED]));
    await db.query(`insert into public.consumer_pending_screening_results
      (pending_id,claimed_user_id,claimed_at,expires_at,product,jurisdiction,screening_answers,profile_version,matter_id,source_session_id)
      values(gen_random_uuid(),$1,now(),now()-interval '1 day','rcap_partner','MS',$2::jsonb,'1','sponsored-matter',$3)`,
      [USER_B,JSON.stringify({eligible:true}),SESSION_A]);
    assert.equal(await one(db, "select * from public.get_consumer_briefcase_presentation_source($1,$2)", [USER_A,ITEM_SPONSORED]), null,
      "a cross-owner ambiguous protected presentation source must remain unavailable");

    await expectError(() => db.exec("set role authenticated; update public.consumer_briefcase_items set packet_verification_hash='" + HASH_B + "' where id='" + ITEM_A + "'"), /permission denied/);
    await db.exec("reset role");

    await db.query("update public.packet_render_jobs set status='artifact_validated' where id=$1", [job.id]);
    await db.query("update public.consumer_briefcase_items set jurisdiction='DC' where id=$1", [ITEM_A]);
    const invalidated = await one(db, "select packet_verification_status,packet_verification_hash,packet_checkout_verification_hash,checkout_session_id from public.consumer_briefcase_items where id=$1", [ITEM_A]);
    assert.equal(invalidated.packet_verification_status, "invalidated");
    assert.equal(invalidated.packet_verification_hash, null);
    assert.equal(invalidated.packet_checkout_verification_hash, null);
    assert.equal(invalidated.checkout_session_id, "cs_a", "invalidation retains provider identity for compensation/reconciliation");
    const issuedArtifact = await one(db, "select * from public.get_consumer_packet_artifact_authority($1,$2)", [USER_A,ITEM_A]);
    assert.equal(issuedArtifact.status, "ready", "already-issued protected bytes survive later fact invalidation for download");
    assert.deepEqual(issuedArtifact.artifact, artifact);
    assert.deepEqual(packetGenerationApplication.readyPacketArtifactAccess({}, {
      status: issuedArtifact.status,
      revision: Number(issuedArtifact.revision),
      verificationHash: issuedArtifact.verification_hash,
      entitlementSource: issuedArtifact.entitlement_source,
      artifact: issuedArtifact.artifact
    }), artifact, "download access consumes stored protected Ready authority after invalidation");
    await db.query("update public.packet_render_jobs set status='delivered' where id=$1", [job.id]);
    assert.equal(await value(db, "select status from public.packet_render_jobs where id=$1", [job.id]), "delivered",
      "a validated immutable artifact may complete delivery after later verification invalidation");

    const revisionBeforeIdChange = Number(await value(db, "select packet_verification_revision from public.consumer_briefcase_items where id=$1", [ITEM_A]));
    const movedItemId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
    await db.query("update public.consumer_briefcase_items set id=$2 where id=$1", [ITEM_A,movedItemId]);
    const identityInvalidated = await one(db, "select packet_verification_revision,packet_verification_reason from public.consumer_briefcase_items where id=$1", [movedItemId]);
    assert.equal(Number(identityInvalidated.packet_verification_revision), revisionBeforeIdChange + 1);
    assert.equal(identityInvalidated.packet_verification_reason, "protected_matter_facts_changed");

    // Forward-only apply is convergent after a successful apply.
    await db.exec(migration);
    await provePartnerInitializationAcrossTwoConnections();
    console.log("consumer packet verification CAS PostgreSQL behavior passed");
  } finally {
    await db.close();
  }
}

await main();
