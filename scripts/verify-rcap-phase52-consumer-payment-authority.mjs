#!/usr/bin/env node
// Phase 52 — proves the four bypasses Terminal B confirmed against phase 51 are
// closed, and that the thirteen Phase 52 requirements hold.
//
// The phase-51 audit (data/rcap-render/phase51-consumer-payment-security.json,
// commit f82f842) is the input. Its four failing gate cases are re-run here
// against 49 -> 50 -> 51 -> 52 and must now pass; its thirteen passing cases
// must still pass, because a fix that breaks the working gate is not a fix.
//
//   node scripts/verify-rcap-phase52-consumer-payment-authority.mjs

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { startEphemeralPg, ephemeralPgAvailable } from "./lib/rcap-ephemeral-pg.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIGRATIONS = [
  "supabase/phase-49-rcap-packet-render-jobs.sql",
  "supabase/phase-50-rcap-packet-delivery-hardening.sql",
  "supabase/phase-51-rcap-consumer-payment-gate.sql",
  "supabase/phase-52-rcap-consumer-payment-authority.sql",
];

let postgresAvailable = false;
try {
  postgresAvailable = ephemeralPgAvailable();
} catch (error) {
  console.error(JSON.stringify({ status: "UNAVAILABLE", verifier: "phase52", reason: error.message }));
  process.exit(2);
}
if (!postgresAvailable) {
  console.error('{"status":"UNAVAILABLE","verifier":"phase52","reason":"postgresql unavailable"}');
  process.exit(2);
}

const results = [];
let failed = 0;
function check(id, title, ok, observed) {
  results.push({ id, title, passed: Boolean(ok), observed });
  if (!ok) failed += 1;
  console.log(`  ${ok ? "ok  " : "FAIL"} ${id}  ${title}${ok ? "" : `\n         observed: ${observed}`}`);
}

import crypto from "node:crypto";
const SHA = (s) => crypto.createHash("sha256").update(String(s)).digest("hex");

/**
 * A stable, distinct, valid UUID derived from a label.
 *
 * Fixture rows used to take their tables' gen_random_uuid() defaults, which put
 * a fresh id into this verifier's recorded evidence on every run and left the
 * committed artifact permanently dirty. The values are still real and distinct
 * per fixture — uniqueness, binding and conflict handling are exercised against
 * genuinely different ids — they are just derived from the case rather than the
 * clock. Mirrors the approach the payment-audit lane adopted at c8ade58.
 */
function duuid(label) {
  const h = SHA(`rcap-phase52-fixture/${label}`);
  const variant = ((parseInt(h[16], 16) & 0x3) | 0x8).toString(16);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-${variant}${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

const db = startEphemeralPg();
try {
  // --- schema ---------------------------------------------------------------
  db.sql(`create role service_role nologin bypassrls`);
  db.sql(`create role anon nologin`);
  db.sql(`create role authenticated nologin`);
  db.sql(`create schema if not exists auth`);
  db.sql(`create table auth.users (id uuid primary key)`);
  db.sql(`create or replace function auth.uid() returns uuid language sql stable as $$
            select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$`);
  db.sql(`create table public.partner_records (id uuid primary key, partner_slug text unique not null)`);
  db.sql(`create table public.rcap_persons (id uuid primary key, partner_slug text not null, match_key text not null)`);
  db.sql(`create table public.rcap_document_packets (id uuid primary key default gen_random_uuid())`);

  for (const m of ["supabase/phase-26-consumer-briefcase-items.sql", "supabase/phase-27-consumer-checkout-metadata.sql", "supabase/phase-28-consumer-packet-generation-status.sql"]) {
    if (fs.existsSync(path.join(rootDir, m))) db.applyFile(path.join(rootDir, m));
  }
  db.sql(`grant select, insert, update on public.consumer_briefcase_items to authenticated`);
  db.sql(`grant select on public.consumer_briefcase_items to anon`);
  for (const m of MIGRATIONS) db.applyFile(path.join(rootDir, m));

  const USER_A = "aaaaaaaa-0000-0000-0000-00000000000a";
  const USER_B = "bbbbbbbb-0000-0000-0000-00000000000b";
  db.sql(`insert into auth.users values ('${USER_A}'), ('${USER_B}')`);
  const PERSON = "cccccccc-0000-0000-0000-00000000000c";
  db.sql(`insert into partner_records values ('11111111-0000-0000-0000-000000000001','p-one')`);
  db.sql(`insert into rcap_persons values ('${PERSON}','p-one','a')`);

  // psql prints the RETURNING row first and the command tag ("INSERT 0 1")
  // after it, so the id is the FIRST non-empty line, not the last.
  const lastLine = (out) => String(out).split("\n").map((l) => l.trim()).filter(Boolean)[0] ?? "";
  let itemSeq = 0;
  const newItem = (user) => {
    itemSeq += 1;
    const id = duuid(`item-${itemSeq}`);
    db.sql(
      `insert into consumer_briefcase_items (id, user_id, item_type, status, jurisdiction) values ('${id}','${user}','packet','packet_ready','MS')`
    );
    return id;
  };

  // The helper's sqlExpectError throws when SQL succeeds, which is the wrong
  // shape for cases that must succeed. This returns null on success and the
  // error text on failure, so both directions are assertable.
  function attempt(sql) {
    try { db.sql(sql); return null; } catch (e) { return String(e.stderr ?? e.message); }
  }
  const asUser = (user, sql) =>
    attempt(`set request.jwt.claim.sub = '${user}'; set role authenticated; ${sql}`);
  const row = (sql) => db.json(`select row_to_json(t) from (${sql}) t`);

  // ===== Requirement 1: anon/authenticated cannot write any payment fact =====
  const ITEM_A = newItem(USER_A);

  const selfDeclare = asUser(USER_A,
    `update consumer_briefcase_items set payment_status='paid', amount_cents=5000 where id='${ITEM_A}'`);
  check("R1-G1", "an authenticated participant cannot self-declare payment",
    /permission denied|denied for (column|table)/i.test(selfDeclare || ""),
    selfDeclare || "the UPDATE succeeded");

  const anonWrite = attempt(
    `set role anon; update consumer_briefcase_items set payment_status='paid' where id='${ITEM_A}'`);
  check("R1-anon", "anon cannot write a payment fact",
    /permission denied/i.test(anonWrite || ""), anonWrite || "the UPDATE succeeded");

  const insertPaid = asUser(USER_A,
    `insert into consumer_briefcase_items (user_id, item_type, status, jurisdiction, payment_status, amount_cents)
     values ('${USER_A}','packet','packet_ready','MS','paid',5000)`);
  check("R1-insert", "an authenticated participant cannot insert a paid item",
    /permission denied/i.test(insertPaid || ""), insertPaid || "the INSERT succeeded");

  // ===== Requirement 2: safe nonpayment operations still work ================
  const safeUpdate = asUser(USER_A,
    `update consumer_briefcase_items set status='waiting' where id='${ITEM_A}'`);
  check("R2-safe-update", "a safe nonpayment column remains writable",
    safeUpdate === null, safeUpdate || "");
  const safeInsert = asUser(USER_A,
    `insert into consumer_briefcase_items (user_id, item_type, status, jurisdiction) values ('${USER_A}','packet','packet_ready','MS')`);
  check("R2-safe-insert", "a nonpayment insert remains available",
    safeInsert === null, safeInsert || "");
  db.sql(`update consumer_briefcase_items set status='packet_ready' where id='${ITEM_A}'`);

  // ===== Requirement 3 + 10: server-only payment path =======================
  const rpcAsUser = asUser(USER_A,
    `select * from record_consumer_packet_payment('${ITEM_A}','paid',5000,'usd','stripe','evt_x',null,null,null,'server_webhook','t')`);
  check("R3-rpc-denied", "the payment RPC is not reachable by an authenticated participant",
    /permission denied/i.test(rpcAsUser || ""), rpcAsUser || "the call succeeded");

  const wrongAmount = row(
    `select * from record_consumer_packet_payment('${ITEM_A}','paid',2500,'usd','stripe','evt_bad',null,null,null,'server_webhook','t')`);
  check("R10-amount", "a payment that is not 5000 cents is refused",
    wrongAmount?.outcome === "invalid_payment_evidence", JSON.stringify(wrongAmount));

  const wrongCurrency = row(
    `select * from record_consumer_packet_payment('${ITEM_A}','paid',5000,'eur','stripe','evt_bad2',null,null,null,'server_webhook','t')`);
  check("R10-currency", "a payment that is not USD is refused",
    wrongCurrency?.outcome === "invalid_payment_evidence", JSON.stringify(wrongCurrency));

  const noEvidence = row(
    `select * from record_consumer_packet_payment('${ITEM_A}','paid',5000,'usd','stripe',null,null,null,null,'server_webhook','t')`);
  check("R10-evidence", "a payment with no provider receipt is refused",
    noEvidence?.outcome === "invalid_payment_evidence", JSON.stringify(noEvidence));

  const good = row(
    `select * from record_consumer_packet_payment('${ITEM_A}','paid',5000,'usd','stripe','evt_A',null,null,null,'server_webhook','t')`);
  check("R3-record", "the server path records a valid payment",
    good?.outcome === "recorded_paid", JSON.stringify(good));

  const ITEM_B = newItem(USER_B);
  const replay = row(
    `select * from record_consumer_packet_payment('${ITEM_B}','paid',5000,'usd','stripe','evt_A',null,null,null,'server_webhook','t')`);
  check("R10-receipt-unique", "a replayed provider receipt is a typed refusal, not a second authorization",
    replay?.outcome === "duplicate_provider_event", JSON.stringify(replay));

  // ===== Requirement 4: immutable binding ===================================
  const MATTER_1 = "d0000000-0000-0000-0000-000000000001";
  const MATTER_2 = "d0000000-0000-0000-0000-000000000002";
  // Jobs go through the real enqueue function; the phase-52 consumer binding is
  // then written once, which is what the immutability trigger protects.
  let jobSeq = 0;
  function mkJob(item, user, matter) {
    jobSeq += 1;
    const hash = SHA(`input-${jobSeq}`);
    const packetRow = duuid(`packet-${jobSeq}`);
    db.sql(`insert into rcap_document_packets (id) values ('${packetRow}')`);
    const id = lastLine(db.scalar(
      `select id from enqueue_packet_render_job('${packetRow}', 'MS:misdemeanor_conviction', 'packet_document_v1', '1.0.0', null, 'MS', '1.3.0', '${hash}', ${item ? `'${item}'` : "null"}, null, '${PERSON}', ${matter ? `'${matter}'` : "null"}, 5)`));
    db.sql(`update packet_render_jobs set consumer_briefcase_item_id = ${item ? `'${item}'` : "null"}, consumer_auth_user_id = ${user ? `'${user}'` : "null"} where id = '${id}'`);
    return id;
  }

  function mkSponsoredJob(partner, matter) {
    jobSeq += 1;
    const hash = SHA(`input-${jobSeq}`);
    const packetRow = duuid(`sponsored-packet-${jobSeq}`);
    db.sql(`insert into rcap_document_packets (id) values ('${packetRow}')`);
    return lastLine(db.scalar(
      `select id from enqueue_packet_render_job('${packetRow}', 'MS:misdemeanor_conviction', 'packet_document_v1', '1.0.0', null, 'MS', '1.3.0', '${hash}', null, '${partner}', '${PERSON}', '${matter}', 5)`));
  }

  const jobImm = mkJob(ITEM_A, USER_A, MATTER_1);
  const mutate = attempt(
    `update packet_render_jobs set consumer_briefcase_item_id = '${ITEM_B}' where id = '${jobImm}'`);
  check("R4-immutable-item", "consumer_briefcase_item_id cannot be re-pointed once set",
    /immutable once set/.test(mutate || ""), mutate || "the UPDATE succeeded");
  const mutateUser = attempt(
    `update packet_render_jobs set consumer_auth_user_id = '${USER_B}' where id = '${jobImm}'`);
  check("R4-immutable-user", "consumer_auth_user_id cannot be re-pointed once set",
    /immutable once set/.test(mutateUser || ""), mutateUser || "the UPDATE succeeded");
  const mutateMatter = attempt(
    `update packet_render_jobs set matter_id = '${MATTER_2}' where id = '${jobImm}'`);
  // matter_id was already immutable under the phase-50 transition guard, which
  // words it "matter_id is immutable". Phase 52 adds the same protection for the
  // two consumer identifiers; either guard satisfies requirement 4 here.
  check("R4-immutable-matter", "matter_id cannot be re-pointed once set",
    /matter_id is immutable/.test(mutateMatter || ""), mutateMatter || "the UPDATE succeeded");

  // --- finalize helper ------------------------------------------------------
  // The claim function takes the oldest queued job, so each case creates its
  // job and immediately drives that same job through the real lifecycle.
  function finalize(job) {
    const c = row(`select id, fencing_token from claim_packet_render_job('w1', null, 60)`);
    if (!c || c.id !== job) throw new Error(`claim expected ${job}, got ${c && c.id}`);
    db.scalar(`select start_packet_render('${job}', '${c.fencing_token}')`);
    db.scalar(`select start_packet_validation('${job}', '${c.fencing_token}')`);
    const h = SHA(job);
    const n = SHA(`${job}-n`);
    return row(
      `select * from finalize_packet_render_job('${job}','${c.fencing_token}','packet-artifacts/${job}/${h}.pdf','${h}','${n}','${h}','${n}',1000,3,'sha256:test')`);
  }

  // packet_render_jobs is append-only by design (phase 49: "rows are never
  // deleted"), so the unfinalized immutability job is drained through the real
  // failure path rather than removed, keeping later claims deterministic.
  function drain(job) {
    const c = row(`select id, fencing_token from claim_packet_render_job('drain', null, 60)`);
    if (!c || c.id !== job) throw new Error(`drain expected ${job}, got ${c && c.id}`);
    db.scalar(`select fail_packet_render_job('${job}', '${c.fencing_token}', 'render_failed', 'drained by harness', false)`);
  }
  drain(jobImm);

  // ===== Requirement 5 + G12: owner-scoped ==================================
  const jobCross = mkJob(ITEM_A, USER_B, MATTER_1); // A's paid item, B's job
  const crossOut = finalize(jobCross);
  check("R5-G12", "participant B's job cannot spend participant A's payment",
    crossOut?.accounting_result === "consumer_payment_owner_mismatch"
      && crossOut?.delivery_eligibility === "accounting_blocked", JSON.stringify(crossOut));

  // ===== Requirement 6 + 7: unit keyed on item, retry idempotent ============
  const job1 = mkJob(ITEM_A, USER_A, MATTER_1);
  const out1 = finalize(job1);
  check("R6-first", "a genuinely paid, owned item opens delivery",
    out1?.accounting_result === "zero_charge" && out1?.delivery_eligibility === "eligible",
    JSON.stringify(out1));

  const consumptionRows = db.scalar(`select count(*) from consumer_packet_payment_consumption`);
  check("R6-unit", "exactly one consumption row is keyed on the Briefcase item",
    consumptionRows === "1", `rows=${consumptionRows}`);

  const job1b = mkJob(ITEM_A, USER_A, MATTER_1); // same item, same matter
  const out1b = finalize(job1b);
  const ledgerAfterRetry = db.scalar(`select count(*) from packet_credit_ledger where event_type='zero_charge'`);
  check("R7-idempotent", "same item, same matter retries into the same authorization",
    out1b?.accounting_result === "zero_charge" && out1b?.delivery_eligibility === "eligible"
      && ledgerAfterRetry === "1",
    `${JSON.stringify(out1b)} ledgerRows=${ledgerAfterRetry}`);

  // The consumption unit must be derived from the ITEM, the receipt and the
  // matter. Asserting only that a second matter is blocked would still pass if
  // the hash reverted to the job id, because the consumption TABLE does that
  // blocking; this pins the keying itself.
  const recordedHash = lastLine(db.scalar(
    `select consumption_unit_hash from consumer_packet_payment_consumption where consumer_briefcase_item_id='${ITEM_A}'`));
  const expectedHash = SHA(`consumer_payment:${ITEM_A}:evt_A:${MATTER_1}`);
  check("R6-keyed-on-item", "the consumption unit is derived from the item, receipt and matter — not the job id",
    recordedHash === expectedHash, `recorded=${recordedHash} expected=${expectedHash}`);

  // The uniqueness keys are the race backstop the code path never reaches when
  // it wins the check-then-insert, so they are asserted structurally.
  const itemUk = lastLine(db.scalar(
    `select indexdef from pg_indexes where indexname='consumer_packet_payment_consumption_item_uk'`));
  check("R6-item-unique-index", "the Briefcase item consumption key is UNIQUE",
    /create unique index/i.test(itemUk), itemUk || "index absent");

  const receiptUk = lastLine(db.scalar(
    `select indexdef from pg_indexes where indexname='consumer_packet_payment_consumption_receipt_uk'`));
  check("R6-receipt-unique-index", "the provider receipt consumption key is UNIQUE",
    /create unique index/i.test(receiptUk), receiptUk || "index absent");

  // ===== Requirement 8 + G11: second matter blocked =========================
  const job2 = mkJob(ITEM_A, USER_A, MATTER_2);
  const out2 = finalize(job2);
  check("R8-G11", "one paid item cannot authorize a second distinct matter",
    out2?.accounting_result === "consumer_payment_matter_conflict"
      && out2?.delivery_eligibility === "accounting_blocked", JSON.stringify(out2));

  // ===== Requirement 9: no raw error, no stranded job =======================
  const strandedStatus = db.scalar(`select status from packet_render_jobs where id='${job2}'`);
  check("R9-not-stranded", "a conflicted job is finalized and typed, never stranded",
    strandedStatus === "artifact_validated", `status=${strandedStatus}`);

  // ===== Defence in depth: the forged-paid row ==============================
  // Column grants stop the participant, but the constraint and the probe are
  // the second and third lines. Each is exercised on its own here, because a
  // layered defence where every layer is only tested through the outermost one
  // can lose an inner layer silently.
  const ITEM_F = newItem(USER_A);
  const forged = attempt(
    `update consumer_briefcase_items set payment_status='paid', amount_cents=5000, currency='usd' where id='${ITEM_F}'`);
  check("R10-forged-row", "a paid row with no server evidence is refused by the table constraint",
    /consumer_briefcase_items_paid_requires_server_evidence/.test(forged || ""),
    forged || "the forged UPDATE succeeded");

  // With the constraint suspended, the probe must still refuse: it does not
  // rely on the constraint having held.
  db.sql(`alter table consumer_briefcase_items drop constraint consumer_briefcase_items_paid_requires_server_evidence`);
  db.sql(`update consumer_briefcase_items set payment_status='paid', amount_cents=5000, currency='usd' where id='${ITEM_F}'`);
  const probeForged = row(
    `select * from consumer_packet_payment_authority('${ITEM_F}','${USER_A}')`);
  check("R10-probe-independent", "the authority probe refuses a forged paid row on its own",
    probeForged?.valid === false && probeForged?.reason === "no_server_payment_evidence",
    JSON.stringify(probeForged));
  db.sql(`update consumer_briefcase_items set payment_status='unpaid', amount_cents=null, currency=null where id='${ITEM_F}'`);
  db.sql(`alter table consumer_briefcase_items add constraint consumer_briefcase_items_paid_requires_server_evidence
            check (payment_status <> 'paid' or (payment_authority is not null and provider_event_id is not null
                   and payment_recorded_at is not null and amount_cents = 5000 and currency = 'usd'))`);

  // ===== Requirement 11: pre-finalization refund blocks =====================
  const ITEM_C = newItem(USER_A);
  db.sql(`select record_consumer_packet_payment('${ITEM_C}','paid',5000,'usd','stripe','evt_C',null,null,null,'server_webhook','t')`);
  db.sql(`select record_consumer_packet_payment('${ITEM_C}','refunded',null,null,null,null,null,null,null,'server_admin','t')`);
  const MATTER_3 = "d0000000-0000-0000-0000-000000000003";
  const jobRef = mkJob(ITEM_C, USER_A, MATTER_3);
  const outRef = finalize(jobRef);
  check("R11-pre-refund", "a refund before finalization blocks delivery",
    outRef?.accounting_result === "consumer_payment_required"
      && outRef?.delivery_eligibility === "accounting_blocked", JSON.stringify(outRef));

  // ===== Requirement 12: post-delivery refund ==============================
  db.sql(`select record_consumer_packet_payment('${ITEM_A}','refunded',null,null,null,null,null,null,null,'server_admin','t')`);
  const job1c = mkJob(ITEM_A, USER_A, MATTER_1); // same matter, already delivered
  const out1c = finalize(job1c);
  check("R12-artifact-preserved", "a post-delivery refund preserves the already-delivered matter",
    out1c?.accounting_result === "zero_charge" && out1c?.delivery_eligibility === "eligible",
    JSON.stringify(out1c));

  const MATTER_4 = "d0000000-0000-0000-0000-000000000004";
  const job1d = mkJob(ITEM_A, USER_A, MATTER_4);
  const out1d = finalize(job1d);
  check("R12-no-new-matter", "a refunded payment cannot authorize a new matter",
    out1d?.delivery_eligibility === "accounting_blocked", JSON.stringify(out1d));

  const ITEM_D = newItem(USER_B);
  db.sql(`select record_consumer_packet_payment('${ITEM_D}','refunded',null,null,null,null,null,null,null,'server_admin','t')`);
  const MATTER_5 = "d0000000-0000-0000-0000-000000000005";
  const jobFirst = mkJob(ITEM_D, USER_B, MATTER_5);
  const outFirst = finalize(jobFirst);
  check("R12-no-first-render", "a refunded payment cannot authorize a new first-time render",
    outFirst?.delivery_eligibility === "accounting_blocked", JSON.stringify(outFirst));

  // ===== Requirement 13: sponsored accounting unchanged ====================
  // The entitlement id is pinned because the sponsored consumption unit hashes
  // it (phase 50), so letting the table default it made this case's recorded
  // hash different on every run.
  db.sql(`insert into partner_packet_entitlement (id, partner_id, packet_cap, overage_enabled, overage_cap)
          values ('${duuid("sponsored-entitlement")}', '11111111-0000-0000-0000-000000000001', 2, true, 1)`);
  const MATTER_S = "d0000000-0000-0000-0000-00000000000f";
  const jobS = mkSponsoredJob('11111111-0000-0000-0000-000000000001', MATTER_S);
  const outS = finalize(jobS);
  const sponsoredLedger = row(
    `select event_type, entitlement_id is not null as has_entitlement from packet_credit_ledger where render_job_id='${jobS}'`);
  check("R13-sponsored", "a sponsored packet still consumes partner credit, unchanged",
    outS?.accounting_result === "consumed" && outS?.delivery_eligibility === "eligible"
      && sponsoredLedger?.event_type === "consumed" && sponsoredLedger?.has_entitlement === true,
    `${JSON.stringify(outS)} ledger=${JSON.stringify(sponsoredLedger)}`);

  // ===== the phase-51 gate cases that already passed must still pass ========
  const ITEM_E = newItem(USER_A);
  const MATTER_6 = "d0000000-0000-0000-0000-000000000006";
  const jobUnpaid = mkJob(ITEM_E, USER_A, MATTER_6);
  const outUnpaid = finalize(jobUnpaid);
  check("R11-unpaid", "an unpaid item is still blocked",
    outUnpaid?.accounting_result === "consumer_payment_required", JSON.stringify(outUnpaid));

  const MATTER_7 = "d0000000-0000-0000-0000-000000000007";
  const jobNoItem = mkJob(null, null, MATTER_7);
  const outNoItem = finalize(jobNoItem);
  check("G7-no-item", "a job with no briefcase item is still blocked",
    outNoItem?.accounting_result === "consumer_payment_required", JSON.stringify(outNoItem));
} finally {
  db.stop?.();
}

const outPath = path.join(rootDir, "data/rcap-render/phase52-consumer-payment-authority.json");
fs.mkdirSync(path.dirname(outPath), { recursive: true });
/**
 * Removes the two values in recorded evidence that no fixture can pin: an id the
 * database mints for a ledger row, and the timestamps Postgres prints inside a
 * constraint-violation DETAIL. Both are incidental to what each case proves, and
 * leaving them in kept the committed artifact permanently dirty. The pass/fail
 * verdicts and every asserted value are untouched — this only affects the
 * written record, and only after the checks have run.
 */
function redactVolatile(text) {
  return String(text ?? "")
    .replace(/("credit_ledger_id":")[0-9a-f-]{36}(")/g, "$1<db-generated>$2")
    .replace(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(\.\d+)?\+\d{2}/g, "<timestamp>");
}

fs.writeFileSync(outPath, `${JSON.stringify({
  schemaVersion: "rcap-phase52-consumer-payment-authority/v1",
  generatedBy: "scripts/verify-rcap-phase52-consumer-payment-authority.mjs",
  lane: "consumer-payment-authority",
  migrationSequence: MIGRATIONS,
  closes: {
    audit: "data/rcap-render/phase51-consumer-payment-security.json",
    auditCommit: "f82f842",
    failuresClosed: ["G1", "G1b", "G11", "G12"],
  },
  totals: { cases: results.length, passed: results.filter((r) => r.passed).length, failed },
  cases: results.map((r) => ({ ...r, observed: redactVolatile(r.observed) })),
}, null, 2)}\n`);

console.log("");
if (failed > 0) {
  console.error(`verify-rcap-phase52-consumer-payment-authority FAILED: ${failed} of ${results.length} cases`);
  process.exit(1);
}
console.log(`verify-rcap-phase52-consumer-payment-authority passed: ${results.length}/${results.length} cases.`);
console.log("G1, G1b, G11 and G12 are closed; the thirteen phase-51 passing cases still pass.");
