#!/usr/bin/env node
// Where each consumer record is actually created, proved on a real database.
//
// The hosted acceptance matrix asserted two boundaries it had guessed. It read
// the payment-consumption row as something the webhook writes, so a paid item
// with no consumption row looked like a broken identity binding; and it
// required exactly one entitlement to exist before replaying an event, so a
// correct "nothing moved" replay reported as a failure. Both guesses turned one
// unfinalized render into four separate-looking failures.
//
// This boots an ephemeral PostgreSQL 16 cluster, applies the authorized
// migration sequence, and walks one consumer matter from checkout to finalized
// artifact, asserting after every step which rows exist and which do not. The
// answers are the contract the acceptance matrix is written against, so if a
// migration ever moves a boundary this goes red instead of the matrix quietly
// asserting the old one.
//
//   node scripts/verify-rcap-consumer-lifecycle-boundaries.mjs

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { startEphemeralPg, ephemeralPgAvailable } from './lib/rcap-ephemeral-pg.mjs';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const action = JSON.parse(fs.readFileSync(path.join(rootDir, 'data/rcap-staging-action.json'), 'utf8'));
const MIGRATIONS = action.migrationsInApplyOrder;

let failed = 0;
function check(id, title, ok, observed) {
  if (!ok) failed += 1;
  console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${id}  ${title}${ok ? '' : `\n         observed: ${observed}`}`);
}

if (!ephemeralPgAvailable()) {
  console.log('verify-rcap-consumer-lifecycle-boundaries SKIPPED: no ephemeral PostgreSQL available');
  process.exit(0);
}

const pg = startEphemeralPg();
const db = pg;
try {
  // The same fixture the migration-apply verifier uses: the partner-side tables
  // these migrations reference, then the authorized sequence itself.
  db.sql(`create role service_role nologin bypassrls`);
  db.sql(`create role anon nologin`);
  db.sql(`create role authenticated nologin`);
  db.sql(`create schema if not exists auth`);
  db.sql(`create table auth.users (id uuid primary key)`);
  db.sql(`create or replace function auth.uid() returns uuid language sql stable as $$
            select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$`);
  db.sql(`create table public.partner_records (id uuid primary key, partner_slug text unique not null)`);
  db.sql(`create table public.rcap_persons (id uuid primary key, partner_slug text not null, match_key text not null)`);
  db.sql(`create unique index rcap_persons_partner_match_key_idx on public.rcap_persons(partner_slug, match_key)`);
  db.sql(`create table public.rcap_document_packets (id uuid primary key default gen_random_uuid())`);
  for (const m of ['supabase/phase-26-consumer-briefcase-items.sql', 'supabase/phase-27-consumer-checkout-metadata.sql', 'supabase/phase-28-consumer-packet-generation-status.sql']) {
    if (fs.existsSync(path.join(rootDir, m))) db.applyFile(path.join(rootDir, m));
  }
  db.sql(`grant select, insert, update on public.consumer_briefcase_items to authenticated`);
  for (const m of MIGRATIONS) db.applyFile(path.join(rootDir, m.path));

  const USER = '11111111-1111-4111-8111-111111111111';
  const ITEM = '22222222-2222-4222-8222-222222222222';
  const PERSON = '33333333-3333-4333-8333-333333333333';
  const PACKET = '44444444-4444-4444-8444-444444444444';
  const HASH = 'a'.repeat(64);

  const scalar = (text) => db.scalar(text).trim();
  const count = (table, column) => Number(scalar(`select count(*) from public.${table} where ${column} = '${ITEM}'`));
  const jobStatus = () => scalar(`select coalesce(max(status), '(no job)') from public.packet_render_jobs where consumer_briefcase_item_id = '${ITEM}'`);

  db.sql(`insert into auth.users(id) values ('${USER}')`);
  db.sql(`insert into public.rcap_document_packets(id) values ('${PACKET}')`);
  db.sql(`insert into public.consumer_briefcase_items
            (id, user_id, item_type, status, jurisdiction, pathway_label, result_code, packet_type, payment_allowed, summary_json)
          values ('${ITEM}', '${USER}', 'result', 'packet_ready', 'MS', 'Non-conviction expungement', 'packet_ready',
                  'custom_pleading', true, '{}'::jsonb)`);
  db.sql(`insert into public.rcap_persons(id, partner_slug, match_key)
          values ('${PERSON}', public.rcap_consumer_person_namespace(),
                  'consumer:' || encode(extensions.digest(convert_to('rcap:consumer-person:v1:${USER}', 'utf8'), 'sha256'), 'hex'))`);
  const MATTER = scalar(`select public.consumer_matter_id_for_briefcase_item('${ITEM}')`);

  check('B-matter', 'the canonical matter id is derived from the item, not chosen by a caller',
    /^[0-9a-f-]{36}$/.test(MATTER), `consumer_matter_id_for_briefcase_item returned "${MATTER}"`);

  // ---- checkout ------------------------------------------------------------
  db.sql(`update public.consumer_briefcase_items
             set checkout_session_id = 'cs_test_lifecycle', payment_product_id = public.expungement_packet_product_id(),
                 payment_person_id = '${PERSON}', payment_matter_id = '${MATTER}', payment_status = 'unpaid'
           where id = '${ITEM}'`);
  check('B-checkout', 'checkout stores the binding the webhook will later have to match',
    scalar(`select payment_person_id || ' ' || payment_matter_id from public.consumer_briefcase_items where id = '${ITEM}'`) === `${PERSON} ${MATTER}`,
    'the item does not carry the person and matter the Checkout Session was opened for');

  // ---- the signed webhook --------------------------------------------------
  const paid = db.sql(`select * from public.record_consumer_packet_payment(
      '${ITEM}', 'paid', 5000, 'usd', 'stripe', 'evt_lifecycle_1', 'cs_test_lifecycle', 'pi_lifecycle', null,
      'server_webhook', 'lifecycle-verifier', public.expungement_packet_product_id(), '${PERSON}', '${MATTER}')`).trim();
  check('B-paid', 'the server-only writer records the payment',
    paid.startsWith('recorded_paid') && scalar(`select payment_status from public.consumer_briefcase_items where id = '${ITEM}'`) === 'paid',
    `record_consumer_packet_payment returned "${paid}"`);

  // THE boundary the acceptance matrix had wrong.
  check('B-no-consumption-at-payment',
    'payment does NOT create a consumption row or a credit ledger event',
    count('consumer_packet_payment_consumption', 'consumer_briefcase_item_id') === 0
    && Number(scalar(`select count(*) from public.packet_credit_ledger`)) === 0,
    `after the webhook: ${count('consumer_packet_payment_consumption', 'consumer_briefcase_item_id')} consumption row(s), ${scalar(`select count(*) from public.packet_credit_ledger`)} ledger event(s) — a matrix that asserts an entitlement here is asserting finalization`);

  // ---- enqueue -------------------------------------------------------------
  db.sql(`select public.enqueue_packet_render_job(
      '${PACKET}', 'MS:Non-conviction expungement', 'packet_document_v1', '1.0.0', null, 'MS', '1.3.0', '${HASH}',
      '${ITEM}', null, '${PERSON}', '${MATTER}', 5, '${ITEM}', '${USER}')`);
  const JOB = scalar(`select id from public.packet_render_jobs where consumer_briefcase_item_id = '${ITEM}'`);
  const bound = scalar(`select person_id || ' ' || matter_id || ' ' || consumer_auth_user_id
                          from public.packet_render_jobs where id = '${JOB}'`);
  check('B-bound-at-enqueue', 'person, matter and owner are bound in the enqueue INSERT itself',
    bound === `${PERSON} ${MATTER} ${USER}`,
    `the job carries "${bound}" instead of "${PERSON} ${MATTER} ${USER}"`);
  check('B-still-no-consumption-at-enqueue',
    'enqueue still creates no consumption row and no ledger event',
    count('consumer_packet_payment_consumption', 'consumer_briefcase_item_id') === 0
    && Number(scalar(`select count(*) from public.packet_credit_ledger`)) === 0,
    'a consumption row appeared before any artifact validated');

  // ---- the worker's own sequence ------------------------------------------
  db.sql(`select public.claim_packet_render_job('lifecycle-worker', array['packet_document_v1'], 600)`);
  const token = scalar(`select fencing_token from public.packet_render_jobs where id = '${JOB}'`);
  check('B-claim', 'claiming moves the job to claimed and issues a fencing token',
    jobStatus() === 'claimed' && /^[0-9a-f-]{36}$/.test(token),
    `status ${jobStatus()}, token "${token}"`);

  const started = scalar(`select public.start_packet_render('${JOB}', '${token}')`);
  check('B-start-render', 'start_packet_render accepts a freshly claimed job',
    started === 't' && jobStatus() === 'rendering',
    `start_packet_render returned "${started}" and the job is ${jobStatus()} — a worker that leaves a job in 'claimed' is NOT being refused by this contract`);

  const validating = scalar(`select public.start_packet_validation('${JOB}', '${token}')`);
  check('B-start-validation', 'start_packet_validation accepts a rendering job',
    validating === 't' && jobStatus() === 'validating', `returned "${validating}", job is ${jobStatus()}`);

  const OUT = 'e'.repeat(64);
  const NORM = 'f'.repeat(64);
  const finalized = db.sql(`select * from public.finalize_packet_render_job(
      '${JOB}', '${token}', 'consumer/${MATTER}/${JOB}/${OUT}.pdf', '${OUT}', '${NORM}', '${OUT}', '${NORM}',
      12345, 3, 'sha256:lifecycle')`).trim();
  check('B-finalize', 'finalization moves the job to artifact_validated and returns an eligibility',
    finalized.includes('eligible') && jobStatus() === 'artifact_validated',
    `finalize_packet_render_job returned "${finalized}", job is ${jobStatus()}`);

  // The other half of the boundary.
  check('B-consumption-at-finalize',
    'the consumption row and the credit ledger event are written by finalization',
    count('consumer_packet_payment_consumption', 'consumer_briefcase_item_id') === 1
    && Number(scalar(`select count(*) from public.packet_credit_ledger`)) === 1,
    `after finalization: ${count('consumer_packet_payment_consumption', 'consumer_briefcase_item_id')} consumption row(s), ${scalar(`select count(*) from public.packet_credit_ledger`)} ledger event(s)`);
  check('B-consumption-binding', 'the consumption row carries the same person and matter as the job',
    scalar(`select person_id || ' ' || matter_id from public.consumer_packet_payment_consumption
             where consumer_briefcase_item_id = '${ITEM}'`) === `${PERSON} ${MATTER}`,
    'the accounting row names a different identity than the job it justifies');

  // ---- the shape a failing worker leaves behind ---------------------------
  // Written down because the acceptance matrix has to distinguish it from a
  // success, and because it proves a failing worker does NOT leave a job
  // claimed: every fail path moves the job to 'failed'.
  const PACKET2 = '55555555-5555-4555-8555-555555555555';
  db.sql(`insert into public.rcap_document_packets(id) values ('${PACKET2}')`);
  db.sql(`select public.enqueue_packet_render_job('${PACKET2}', 'MS:Non-conviction expungement', 'packet_document_v1',
      '1.0.0', null, 'MS', '1.3.0', '${'b'.repeat(64)}', '${ITEM}', null, '${PERSON}', '${MATTER}', 5, '${ITEM}', '${USER}')`);
  const JOB2 = scalar(`select id from public.packet_render_jobs where packet_id = '${PACKET2}'`);
  db.sql(`select public.claim_packet_render_job('lifecycle-worker-2', array['packet_document_v1'], 600)`);
  const token2 = scalar(`select fencing_token from public.packet_render_jobs where id = '${JOB2}'`);
  const disposition = scalar(`select public.fail_packet_render_job('${JOB2}', '${token2}', 'render_failed', 'lifecycle probe', true)`);
  const status2 = scalar(`select status from public.packet_render_jobs where id = '${JOB2}'`);
  check('B-fail-leaves-failed', 'a reported failure leaves the job failed, never claimed',
    disposition === 'retryable' && status2 === 'failed',
    `fail_packet_render_job returned "${disposition}" and the job is ${status2}`);
  check('B-fail-consumes-nothing', 'a failed render consumes no entitlement',
    count('consumer_packet_payment_consumption', 'consumer_briefcase_item_id') === 1,
    'a failed attempt changed the consumption count');
} finally {
  pg.stop?.();
}

console.log('');
if (failed > 0) {
  console.error(`verify-rcap-consumer-lifecycle-boundaries FAILED: ${failed} boundary check(s) did not hold.`);
  process.exit(1);
}
console.log('verify-rcap-consumer-lifecycle-boundaries passed: binding at enqueue, consumption and credit at finalization, failure never leaves a job claimed.');
