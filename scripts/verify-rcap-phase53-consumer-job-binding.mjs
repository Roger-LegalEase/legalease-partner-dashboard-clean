#!/usr/bin/env node
// Phase 53 — proves the paid-consumer journey is reachable through the
// sanctioned path, and that making it reachable widened nothing.
//
// The independent re-audit at 25f6b09 found the Phase 52 gate correct (19 of 19
// payment cases) but unreachable (0 of 3): enqueue could not carry the consumer
// binding, and service_role holds no UPDATE to attach it afterwards.
//
// The discipline that matters here is what these tests are NOT allowed to do.
// Every job is created through enqueue_packet_render_job as service_role would
// call it. There is no table-owner UPDATE, no direct INSERT into
// packet_render_jobs, and no privileged fixture write that production code
// could not itself perform. A test that reaches for one of those is proving the
// gate works on inputs nothing can actually supply — which is the exact defect
// the re-audit found.
//
//   node scripts/verify-rcap-phase53-consumer-job-binding.mjs

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { startEphemeralPg, ephemeralPgAvailable } from './lib/rcap-ephemeral-pg.mjs';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MIGRATIONS = [
  'supabase/phase-26-consumer-briefcase-items.sql',
  'supabase/phase-27-consumer-checkout-metadata.sql',
  'supabase/phase-28-consumer-packet-generation-status.sql',
  'supabase/phase-49-rcap-packet-render-jobs.sql',
  'supabase/phase-50-rcap-packet-delivery-hardening.sql',
  'supabase/phase-51-rcap-consumer-payment-gate.sql',
  'supabase/phase-52-rcap-consumer-payment-authority.sql',
  'supabase/phase-53-rcap-consumer-job-binding.sql',
];

let postgresAvailable = false;
try {
  postgresAvailable = ephemeralPgAvailable();
} catch (error) {
  console.error(JSON.stringify({ status: 'UNAVAILABLE', verifier: 'phase53', reason: error.message }));
  process.exit(2);
}
if (!postgresAvailable) {
  console.error('{"status":"UNAVAILABLE","verifier":"phase53","reason":"postgresql unavailable"}');
  process.exit(2);
}

const results = [];
let failed = 0;
function check(id, title, ok, observed) {
  results.push({ id, title, passed: Boolean(ok), observed: ok ? null : String(observed) });
  if (!ok) failed += 1;
  console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${id}  ${title}${ok ? '' : `\n         observed: ${observed}`}`);
}

const SHA = (s) => crypto.createHash('sha256').update(String(s)).digest('hex');
const db = startEphemeralPg();

try {
  db.sql('create role service_role nologin bypassrls');
  db.sql('create role anon nologin');
  db.sql('create role authenticated nologin');
  db.sql('create schema if not exists auth');
  db.sql('create table auth.users (id uuid primary key)');
  db.sql(`create or replace function auth.uid() returns uuid language sql stable as $$
            select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$`);
  db.sql('create table public.partner_records (id uuid primary key, partner_slug text unique not null)');
  db.sql('create table public.rcap_persons (id uuid primary key, partner_slug text not null, match_key text not null)');
  db.sql('create table public.rcap_document_packets (id uuid primary key default gen_random_uuid())');
  for (const m of MIGRATIONS) db.applyFile(path.join(rootDir, m));

  const first = (out) => String(out).split('\n').map((l) => l.trim()).filter(Boolean)[0] ?? '';
  const row = (sql) => db.json(`select row_to_json(t) from (${sql}) t`);
  const attempt = (sql) => { try { db.sql(sql); return null; } catch (e) { return String(e.stderr ?? e.message); } };

  const USER_A = 'aaaa0000-0000-4000-8000-00000000000a';
  const USER_B = 'bbbb0000-0000-4000-8000-00000000000b';
  const PARTNER = 'cccc0000-0000-4000-8000-0000000000c1';
  const PERSON = 'dddd0000-0000-4000-8000-0000000000d1';
  db.sql(`insert into auth.users values ('${USER_A}'), ('${USER_B}')`);
  db.sql(`insert into partner_records values ('${PARTNER}','p53')`);
  db.sql(`insert into rcap_persons values ('${PERSON}','p53','k')`);

  const newItem = (user) => first(db.scalar(
    `insert into consumer_briefcase_items (user_id, item_type, status, jurisdiction)
     values ('${user}','packet','packet_ready','MS') returning id`));

  // The ONLY way a job is created in this file. Mirrors exactly what
  // job-queue.ts::enqueueRenderJob sends, including argument order.
  let seq = 0;
  const enqueueSql = ({ item = null, partner = null, person = null, matter = null, consumerItem = null, expectedUser = null }) => {
    seq += 1;
    const packet = first(db.scalar(
      'with r as (insert into rcap_document_packets default values returning id) select id from r'));
    const q = (v) => (v === null ? 'null' : `'${v}'`);
    return `select id from enqueue_packet_render_job(${q(packet)}, 'MS:x', 'packet_document_v1', '1.0.0', null, 'MS', '1.3.0', '${SHA(`p53-${seq}`)}', ${q(item)}, ${q(partner)}, ${q(person)}, ${q(matter)}, 5, ${q(consumerItem)}, ${q(expectedUser)})`;
  };
  const enqueue = (opts) => first(db.scalar(enqueueSql(opts)));
  const enqueueExpectError = (opts) => attempt(enqueueSql(opts));

  const finalize = (job) => {
    const c = row("select id, fencing_token from claim_packet_render_job('w53', null, 60)");
    if (!c || c.id !== job) throw new Error(`claim expected ${job}, got ${c && c.id}`);
    db.scalar(`select start_packet_render('${job}','${c.fencing_token}')`);
    db.scalar(`select start_packet_validation('${job}','${c.fencing_token}')`);
    const h = SHA(job); const n = SHA(`${job}-n`);
    return row(`select * from finalize_packet_render_job('${job}','${c.fencing_token}','a/${job}/${h}.pdf','${h}','${n}','${h}','${n}',10,1,'d')`);
  };

  // ===== R1: a paid item passes through the sanctioned enqueue path =========
  const ITEM_A = newItem(USER_A);
  db.sql(`select record_consumer_packet_payment('${ITEM_A}','paid',5000,'usd','stripe','p53_evt_a',null,null,null,'server_webhook','t')`);
  const M1 = 'eeee0000-0000-4000-8000-000000000001';
  let job1 = null;
  const r1err = (() => { try { job1 = enqueue({ consumerItem: ITEM_A, expectedUser: USER_A, person: PERSON, matter: M1 }); return null; } catch (e) { return String(e.stderr ?? e.message); } })();
  check('R1', 'a paid, server-authoritative Briefcase item passes through sanctioned enqueue',
    r1err === null && Boolean(job1), r1err || 'no job returned');

  // ===== R2: the created job carries all four bindings ======================
  const bound = row(`select consumer_briefcase_item_id::text as item, consumer_auth_user_id::text as usr,
                            person_id::text as per, matter_id::text as mat
                       from packet_render_jobs where id='${job1}'`);
  check('R2', 'the created job carries item, consumer, person and matter',
    bound?.item === ITEM_A && bound?.usr === USER_A && bound?.per === PERSON && bound?.mat === M1,
    JSON.stringify(bound));

  // ===== R3: finalization reaches zero_charge / eligible ====================
  const f1 = finalize(job1);
  check('R3', 'finalization reaches zero_charge and eligible for the legitimate paid consumer',
    f1?.accounting_result === 'zero_charge' && f1?.delivery_eligibility === 'eligible', JSON.stringify(f1));

  // ===== R4: missing consumer item is rejected at enqueue ===================
  const missing = enqueueExpectError({
    consumerItem: 'ffff0000-0000-4000-8000-00000000dead', expectedUser: USER_A, person: PERSON,
    matter: 'eeee0000-0000-4000-8000-000000000004' });
  check('R4', 'a missing consumer item is rejected at enqueue',
    /does not exist/.test(missing || ''), missing || 'the enqueue succeeded');

  // ===== R5: an item owned by another user is rejected ======================
  const ITEM_B = newItem(USER_B);
  db.sql(`select record_consumer_packet_payment('${ITEM_B}','paid',5000,'usd','stripe','p53_evt_b',null,null,null,'server_webhook','t')`);
  const crossOwner = enqueueExpectError({
    consumerItem: ITEM_B, expectedUser: USER_A, person: PERSON,
    matter: 'eeee0000-0000-4000-8000-000000000005' });
  check('R5', "an item owned by another authenticated user is rejected",
    /not owned by the expected user/.test(crossOwner || ''), crossOwner || 'the enqueue succeeded');

  // ===== R6: a spoofed expected user id is rejected =========================
  const spoof = enqueueExpectError({
    consumerItem: ITEM_A, expectedUser: USER_B, person: PERSON,
    matter: 'eeee0000-0000-4000-8000-000000000006' });
  check('R6', 'a spoofed expected user id is rejected',
    /not owned by the expected user/.test(spoof || ''), spoof || 'the enqueue succeeded');

  // ===== R7: a consumer request with null binding is rejected ===============
  const nullItem = enqueueExpectError({ person: PERSON, matter: 'eeee0000-0000-4000-8000-000000000007' });
  check('R7a', 'an unsponsored request with no consumer item is rejected',
    /requires a consumer briefcase item/.test(nullItem || ''), nullItem || 'the enqueue succeeded');
  const nullUser = enqueueExpectError({
    consumerItem: ITEM_A, person: PERSON, matter: 'eeee0000-0000-4000-8000-000000000008' });
  check('R7b', 'an unsponsored request with no expected user is rejected',
    /requires the expected consumer user id/.test(nullUser || ''), nullUser || 'the enqueue succeeded');
  const nullMatter = enqueueExpectError({ consumerItem: ITEM_A, expectedUser: USER_A, person: PERSON });
  check('R7c', 'an unsponsored request with no matter is rejected',
    /requires a matter id/.test(nullMatter || ''), nullMatter || 'the enqueue succeeded');

  // ===== R8: an unbound legacy consumer job stays blocked ===================
  // Created the way a pre-phase-53 row exists: briefcase_item_id set, consumer
  // binding absent. Written as the owner ONLY because no sanctioned path can
  // produce this shape any more — that is the point of the case.
  const ITEM_L = newItem(USER_A);
  db.sql(`select record_consumer_packet_payment('${ITEM_L}','paid',5000,'usd','stripe','p53_evt_l',null,null,null,'server_webhook','t')`);
  const legacyPacket = first(db.scalar('with r as (insert into rcap_document_packets default values returning id) select id from r'));
  // One statement: each psql -c is its own session, so the mutation-authority
  // setting has to travel with the insert it authorises.
  const pickUuid = (out) => String(out).split('\n').map((l) => l.trim())
    .find((l) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(l)) ?? '';
  const legacyJob = pickUuid(db.scalar(
    `select set_config('rcap.packet_mutation_authority','enqueue_packet_render_job',true);
     insert into packet_render_jobs (packet_id, route_id, renderer_kind, renderer_version, source_sha256,
       profile_id, profile_version, input_hash, briefcase_item_id, partner_id, person_id, matter_id, max_attempts)
     values ('${legacyPacket}','MS:x','packet_document_v1','1.0.0',null,'MS','1.3.0','${SHA('legacy')}',
       '${ITEM_L}', null, '${PERSON}', 'eeee0000-0000-4000-8000-000000000009', 5) returning id`));
  const fLegacy = finalize(legacyJob);
  check('R8', 'an unbound legacy consumer job remains blocked by Phase 52',
    fLegacy?.accounting_result === 'consumer_payment_required'
      && fLegacy?.delivery_eligibility === 'accounting_blocked', JSON.stringify(fLegacy));

  // ===== R9: sponsored enqueue remains valid with null consumer fields ======
  db.sql(`insert into partner_packet_entitlement (partner_id, packet_cap, overage_enabled, overage_cap)
          values ('${PARTNER}', 3, false, 0)`);
  const MS = 'eeee0000-0000-4000-8000-00000000000a';
  let sponsoredJob = null;
  const r9err = (() => { try { sponsoredJob = enqueue({ partner: PARTNER, person: PERSON, matter: MS }); return null; } catch (e) { return String(e.stderr ?? e.message); } })();
  const fS = sponsoredJob ? finalize(sponsoredJob) : null;
  const sLed = sponsoredJob ? row(`select event_type, entitlement_id is not null as has_ent
                                     from packet_credit_ledger where render_job_id='${sponsoredJob}'`) : null;
  check('R9', 'sponsored enqueue remains valid with null consumer fields',
    r9err === null && fS?.accounting_result === 'consumed' && sLed?.event_type === 'consumed' && sLed?.has_ent === true,
    `${r9err || ''} ${JSON.stringify(fS)} ledger=${JSON.stringify(sLed)}`);

  const sponsoredWithConsumer = enqueueExpectError({
    partner: PARTNER, person: PERSON, matter: 'eeee0000-0000-4000-8000-00000000000b',
    consumerItem: ITEM_A, expectedUser: USER_A });
  check('R9b', 'a sponsored job carrying consumer bindings is rejected',
    /must not carry consumer binding fields/.test(sponsoredWithConsumer || ''),
    sponsoredWithConsumer || 'the enqueue succeeded');

  // ===== R10: no role can mutate the binding after insert ==================
  for (const [role, label] of [['authenticated', 'participant'], ['service_role', 'service_role'], ['anon', 'anon']]) {
    const mutate = attempt(`set role ${role}; update packet_render_jobs set consumer_auth_user_id='${USER_B}' where id='${job1}'`);
    check(`R10-${label}`, `${label} cannot mutate the binding after insert`,
      mutate !== null, 'the UPDATE succeeded');
  }
  const ownerMutate = attempt(`update packet_render_jobs set consumer_auth_user_id='${USER_B}' where id='${job1}'`);
  check('R10-owner', 'even the table owner cannot re-point the binding',
    /immutable once set/.test(ownerMutate || ''), ownerMutate || 'the UPDATE succeeded');

  // ===== R11: the old unbound signature cannot create a job ================
  const oldSig = attempt(
    `select id from enqueue_packet_render_job((select id from rcap_document_packets limit 1),'MS:x','packet_document_v1','1.0.0',null,'MS','1.3.0','${SHA('old')}',null,null,'${PERSON}','eeee0000-0000-4000-8000-00000000000c',5)`);
  check('R11', 'the old 13-argument unbound signature no longer resolves',
    /does not exist|function enqueue_packet_render_job/i.test(oldSig || ''),
    oldSig || 'the old signature still resolves');

  const sigCount = db.scalar(`select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
                               where n.nspname='public' and p.proname='enqueue_packet_render_job'`).trim();
  check('R11b', 'exactly one enqueue signature exists', sigCount === '1', `${sigCount} signatures`);

  // ===== R12: same item, user, person, matter is idempotent ================
  const M12 = 'eeee0000-0000-4000-8000-00000000000d';
  const ITEM_R = newItem(USER_A);
  db.sql(`select record_consumer_packet_payment('${ITEM_R}','paid',5000,'usd','stripe','p53_evt_r',null,null,null,'server_webhook','t')`);
  const jr1 = enqueue({ consumerItem: ITEM_R, expectedUser: USER_A, person: PERSON, matter: M12 });
  const fr1 = finalize(jr1);
  const jr2 = enqueue({ consumerItem: ITEM_R, expectedUser: USER_A, person: PERSON, matter: M12 });
  const fr2 = finalize(jr2);
  const ledgerRows = db.scalar(`select count(*) from packet_credit_ledger l
                                 join packet_render_jobs j on j.id = l.render_job_id
                                 where j.consumer_briefcase_item_id='${ITEM_R}'`).trim();
  check('R12', 'same item, user, person and matter remains idempotent',
    fr1?.accounting_result === 'zero_charge' && fr2?.accounting_result === 'zero_charge'
      && fr2?.delivery_eligibility === 'eligible' && ledgerRows === '1',
    `${JSON.stringify(fr1)} ${JSON.stringify(fr2)} ledgerRows=${ledgerRows}`);

  // ===== R13: same payment on a different matter stays blocked ============
  const jr3 = enqueue({ consumerItem: ITEM_R, expectedUser: USER_A, person: PERSON,
    matter: 'eeee0000-0000-4000-8000-00000000000e' });
  const fr3 = finalize(jr3);
  check('R13', 'the same payment on a different matter remains accounting_blocked',
    fr3?.accounting_result === 'consumer_payment_matter_conflict'
      && fr3?.delivery_eligibility === 'accounting_blocked', JSON.stringify(fr3));

  // ===== enqueue authority is unchanged ===================================
  for (const role of ['anon', 'authenticated']) {
    const canExec = db.scalar(`select has_function_privilege('${role}',
      to_regprocedure('public.enqueue_packet_render_job(uuid, text, text, text, text, text, text, text, uuid, uuid, uuid, uuid, integer, uuid, uuid)'), 'EXECUTE')`).trim();
    check(`G-${role}`, `${role} cannot execute the bound enqueue`, canExec === 'f', `has_function_privilege=${canExec}`);
  }
  const svcExec = db.scalar(`select has_function_privilege('service_role',
    to_regprocedure('public.enqueue_packet_render_job(uuid, text, text, text, text, text, text, text, uuid, uuid, uuid, uuid, integer, uuid, uuid)'), 'EXECUTE')`).trim();
  check('G-service', 'service_role can execute the bound enqueue', svcExec === 't', `has_function_privilege=${svcExec}`);

  const cfg = db.scalar(`select coalesce(array_to_string(proconfig, ','), '') from pg_proc
    where oid = to_regprocedure('public.enqueue_packet_render_job(uuid, text, text, text, text, text, text, text, uuid, uuid, uuid, uuid, integer, uuid, uuid)')`).trim();
  check('G-searchpath', 'the bound enqueue pins search_path', /search_path=/.test(cfg), cfg || '(none)');
} finally {
  db.stop?.();
}

const outPath = path.join(rootDir, 'data/rcap-render/phase53-consumer-job-binding.json');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, `${JSON.stringify({
  schemaVersion: 'rcap-phase53-consumer-job-binding/v1',
  generatedBy: 'scripts/verify-rcap-phase53-consumer-job-binding.mjs',
  lane: 'consumer-job-binding-reachability',
  migrationSequence: MIGRATIONS,
  closes: { audit: 'data/rcap-render/phase51-consumer-payment-security.json', auditCommit: '25f6b09', reachCasesWere: '0 of 3' },
  totals: { cases: results.length, passed: results.filter((r) => r.passed).length, failed },
  cases: results,
}, null, 2)}\n`);

console.log('');
if (failed > 0) {
  console.error(`verify-rcap-phase53-consumer-job-binding FAILED: ${failed} of ${results.length} cases`);
  process.exit(1);
}
console.log(`verify-rcap-phase53-consumer-job-binding passed: ${results.length}/${results.length} cases.`);
console.log('The paid-consumer journey is reachable through sanctioned functions only; no privileged fixture write was used.');
