#!/usr/bin/env node
// Proves a database actually carries the Phase 52 state — not merely objects
// with familiar names.
//
// Two modes:
//
//   (default)  self-test. Builds an ephemeral cluster, applies 49 -> 50 -> 51 -> 52,
//              and runs every check against it. This is what makes the checks
//              trustworthy: a check that has never failed is not evidence.
//
//   --target <psql-conn> --project <ref>
//              runs the STRUCTURAL checks against a live database. Behavioural
//              checks write rows and are skipped unless --allow-writes is given,
//              because a read-back on a real environment should not mutate it by
//              default.
//
// Structural checks read catalogs only. Behavioural checks exercise the paths
// that cannot be proven from a catalog: a uniqueness race, a refunded payment,
// and sponsored accounting.
//
//   node scripts/verify-rcap-migration-apply-evidence.mjs
//   node scripts/verify-rcap-migration-apply-evidence.mjs --target "$URL" --project abcdefgh

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { startEphemeralPg, ephemeralPgAvailable } from './lib/rcap-ephemeral-pg.mjs';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const arg = (name) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : null; };
const target = arg('--target');
const projectRef = arg('--project');
const allowWrites = argv.includes('--allow-writes') || !target;

const action = JSON.parse(fs.readFileSync(path.join(rootDir, 'data/rcap-staging-action.json'), 'utf8'));
const MIGRATIONS = action.migrationsInApplyOrder;

// Payment columns anon and authenticated must not be able to write, and the
// safe columns that must stay writable.
const PAYMENT_COLUMNS = [
  'payment_status', 'amount_cents', 'currency', 'payment_provider',
  'checkout_session_id', 'payment_intent_id', 'receipt_url',
  'provider_event_id', 'payment_authority', 'payment_recorded_at', 'payment_recorded_by',
];
const SAFE_COLUMNS = ['status', 'summary_json', 'packet_status'];

const results = [];
let failed = 0;
function check(id, title, ok, observed) {
  results.push({ id, title, passed: Boolean(ok), observed: ok ? null : String(observed) });
  if (!ok) failed += 1;
  console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${id}  ${title}${ok ? '' : `\n         observed: ${observed}`}`);
}

// ---------------------------------------------------------------------------
// 0. The authorization pin. Checked from the filesystem, before touching a DB:
//    a database that matches a migration nobody authorized is not evidence.
// ---------------------------------------------------------------------------
const queue = JSON.parse(fs.readFileSync(path.join(rootDir, 'data/rcap-authorization-queue.json'), 'utf8'));
const byId = new Map((queue.entries || []).map((e) => [e.id, e]));
for (const m of MIGRATIONS) {
  const abs = path.join(rootDir, m.path);
  const actual = fs.existsSync(abs)
    ? crypto.createHash('sha256').update(fs.readFileSync(abs)).digest('hex')
    : null;
  const auth = byId.get(m.authorizationId);
  const idx = auth ? (auth.authorizedPaths || []).indexOf(m.path) : -1;
  const pinned = idx >= 0 ? (auth.authorizedSha256 || [])[idx] : null;
  check(
    `A${m.phase}`,
    `phase ${m.phase} authorization path and bytes still match`,
    actual !== null && actual === m.sha256 && actual === pinned,
    `disk=${actual && actual.slice(0, 12)} action=${m.sha256.slice(0, 12)} authorization=${pinned && pinned.slice(0, 12)}`
  );
}

// Apply order is a property of the action itself. Pinned here deliberately
// rather than derived from the action, so that dropping or reordering a phase
// in the generator has to be stated in two places. The title is built from the
// pin because the prose form had already gone stale once: it still read
// "49 -> 50 -> 51 -> 52 -> 53" after phase 54 joined the comparison.
const EXPECTED_APPLY_ORDER = [49, 50, 51, 52, 53, 54, 55];
check(
  'A-order',
  `the apply order is exactly ${EXPECTED_APPLY_ORDER.join(' -> ')}`,
  MIGRATIONS.map((m) => m.phase).join(',') === EXPECTED_APPLY_ORDER.join(',')
    && MIGRATIONS.every((m, i) => m.sequencePosition === i + 1),
  MIGRATIONS.map((m) => `${m.sequencePosition}:${m.phase}`).join(' ')
);

// ---------------------------------------------------------------------------
// Database session
// ---------------------------------------------------------------------------
let db;
let stop = () => {};
if (target) {
  const psql = (text) => execFileSync('psql', [target, '-X', '--no-psqlrc', '-v', 'ON_ERROR_STOP=1', '-A', '-t', '-c', text], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  db = {
    sql: psql,
    scalar: (t) => psql(t).trim(),
    json: (t) => JSON.parse(psql(`select coalesce((${t})::text, 'null')`).trim() || 'null'),
  };
  // The named environment is part of the evidence: a green read-back against
  // the wrong project proves nothing about the one being rehearsed.
  const dbName = db.scalar('select current_database()');
  const claimed = projectRef ?? '';
  check('E-env', 'the target is the named staging project',
    claimed.length > 0 && (target.includes(claimed) || dbName.includes(claimed)),
    `--project ${claimed || '(absent)'} not found in the connection or database name ${dbName}`);
} else {
  if (!ephemeralPgAvailable()) {
    console.log('verify-rcap-migration-apply-evidence SKIPPED: no ephemeral PostgreSQL available');
    process.exit(0);
  }
  const pg = startEphemeralPg();
  stop = () => pg.stop?.();
  db = pg;
  db.sql(`create role service_role nologin bypassrls`);
  db.sql(`create role anon nologin`);
  db.sql(`create role authenticated nologin`);
  db.sql(`create schema if not exists auth`);
  db.sql(`create table auth.users (id uuid primary key)`);
  db.sql(`create or replace function auth.uid() returns uuid language sql stable as $$
            select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$`);
  db.sql(`create table public.partner_records (id uuid primary key, partner_slug text unique not null)`);
  db.sql(`create table public.rcap_persons (id uuid primary key, partner_slug text not null, match_key text not null)`);
  // Phase 30 creates rcap_persons_partner_match_key_idx, and phase 55's backfill
  // of pre-existing paid rows relies on it as the ON CONFLICT arbiter. Without
  // it the stub is a table that merely looks like rcap_persons: phase 55 fails
  // to apply here while applying cleanly on any database that has phase 30,
  // which would read as a defect in phase 55 rather than a gap in this fixture.
  // Asserted against phase 30's own bytes so the fixture cannot drift from the
  // migration it stands in for.
  const phase30 = fs.readFileSync(path.join(rootDir, 'supabase/phase-30-rcap-person-identity.sql'), 'utf8');
  if (!/create unique index[^;]*rcap_persons_partner_match_key_idx[^;]*on rcap_persons\(partner_slug, match_key\)/s.test(phase30)) {
    console.error('  FAIL fixture  phase 30 no longer declares the rcap_persons(partner_slug, match_key) unique index this fixture reproduces');
    process.exit(1);
  }
  db.sql(`create unique index rcap_persons_partner_match_key_idx on public.rcap_persons(partner_slug, match_key)`);
  db.sql(`create table public.rcap_document_packets (id uuid primary key default gen_random_uuid())`);
  for (const m of ['supabase/phase-26-consumer-briefcase-items.sql', 'supabase/phase-27-consumer-checkout-metadata.sql', 'supabase/phase-28-consumer-packet-generation-status.sql']) {
    if (fs.existsSync(path.join(rootDir, m))) db.applyFile(path.join(rootDir, m));
  }
  db.sql(`grant select, insert, update on public.consumer_briefcase_items to authenticated`);
  for (const m of MIGRATIONS) db.applyFile(path.join(rootDir, m.path));
}

try {
  const b = (v) => String(v).trim() === 't' || String(v).trim() === 'true';

  // -------------------------------------------------------------------------
  // 1. All four migrations are present, proven by objects unique to each phase.
  //    The Supabase migration ledger carries only a baseline row here, so object
  //    presence is the evidence the queue itself specifies.
  // -------------------------------------------------------------------------
  const MARKERS = [
    [49, `to_regclass('public.packet_render_jobs') is not null`],
    [50, `exists (select 1 from pg_constraint where conname = 'packet_render_jobs_eligible_requires_accounting_check')`],
    [51, `to_regprocedure('public.consumer_packet_payment_valid(uuid)') is not null`],
    [52, `to_regprocedure('public.consumer_packet_payment_authority(uuid, uuid)') is not null`],
    // Phase 53's marker is the SIGNATURE: the bound 15-argument form present and
    // the old unbound 13-argument form gone. A database carrying both would let
    // an unbound consumer job be created, which is the shape phase 53 removes.
    [53, `to_regprocedure('public.enqueue_packet_render_job(uuid, text, text, text, text, text, text, text, uuid, uuid, uuid, uuid, integer, uuid, uuid)') is not null
          and to_regprocedure('public.enqueue_packet_render_job(uuid, text, text, text, text, text, text, text, uuid, uuid, uuid, uuid, integer)') is null`],
  ];
  for (const [phase, expr] of MARKERS) {
    check(`M${phase}`, `phase ${phase} is present in the database`, b(db.scalar(`select ${expr}`)), `${expr} is false`);
  }

  // -------------------------------------------------------------------------
  // 2. finalize_packet_render_job is the PHASE 52 definition.
  //    Name presence is not evidence; the body must carry the phase-52 logic
  //    and must no longer carry the phase-51 job-keyed consumption unit.
  // -------------------------------------------------------------------------
  const body = db.scalar(`select prosrc from pg_proc where proname = 'finalize_packet_render_job' limit 1`);
  const has = (s) => body.includes(s);
  check('F-52', 'finalize_packet_render_job is the Phase 52 definition',
    has('consumer_packet_payment_authority') && has('consumer_packet_payment_consumption')
      && has('consumer_payment_matter_conflict'),
    'body lacks the phase-52 authority call, consumption table or matter-conflict result');
  check('F-51-gone', 'the Phase 51 job-keyed consumption unit is gone',
    !/'zero_charge:'\s*\|\|\s*v_job\.id/.test(body),
    "body still hashes 'zero_charge:' || v_job.id, which is the G11 defect");

  // -------------------------------------------------------------------------
  // 3-6. The payment writer: exists, pinned search_path, and reachable by
  //      exactly one role.
  // -------------------------------------------------------------------------
  // Phase 55 replaced the phase-52 eleven-argument writer with a fourteen-
  // argument one carrying the product, person and matter binding, and dropped
  // the old signature outright.
  const RPC = 'public.record_consumer_packet_payment(uuid, text, integer, text, text, text, text, text, text, text, text, text, uuid, uuid)';
  const RPC_PHASE52 = 'public.record_consumer_packet_payment(uuid, text, integer, text, text, text, text, text, text, text, text)';
  const writerPresent = b(db.scalar(`select to_regprocedure('${RPC}') is not null`));
  check('P-exists', 'record_consumer_packet_payment exists', writerPresent, 'function absent');
  check('P-52-gone', 'the phase-52 writer signature no longer exists',
    !b(db.scalar(`select to_regprocedure('${RPC_PHASE52}') is not null`)),
    'the eleven-argument writer is still callable, so a caller can still pay without naming a matter');

  const cfg = db.scalar(`select coalesce(array_to_string(proconfig, ','), '') from pg_proc
                          where oid = to_regprocedure('${RPC}')`);
  check('P-searchpath', 'its search_path is pinned', /search_path=/.test(cfg), `proconfig=${cfg || '(none)'}`);

  check('P-secdef', 'it is SECURITY DEFINER',
    b(db.scalar(`select prosecdef from pg_proc where oid = to_regprocedure('${RPC}')`)), 'not security definer');

  for (const role of ['public', 'anon', 'authenticated']) {
    // has_function_privilege on a NULL oid is NULL, which would read as "cannot
    // execute". An absent writer is not a closed door — it is no door at all,
    // so the presence of the function is part of what this check asserts.
    check(`P-deny-${role}`, `${role} cannot execute the payment writer`,
      writerPresent && !b(db.scalar(`select has_function_privilege('${role}', to_regprocedure('${RPC}'), 'EXECUTE')`)),
      writerPresent ? `${role} holds EXECUTE` : 'the writer is absent, so this proves nothing about the role');
  }
  check('P-allow-service', 'service_role holds the intended execution authority',
    b(db.scalar(`select has_function_privilege('service_role', to_regprocedure('${RPC}'), 'EXECUTE')`)),
    'service_role cannot execute the payment writer');

  // -------------------------------------------------------------------------
  // 7-8. Column authority: payment facts closed, safe surface open.
  // -------------------------------------------------------------------------
  for (const role of ['anon', 'authenticated']) {
    const writable = [];
    for (const col of PAYMENT_COLUMNS) {
      const exists = b(db.scalar(`select exists (select 1 from information_schema.columns
        where table_schema='public' and table_name='consumer_briefcase_items' and column_name='${col}')`));
      if (!exists) continue;
      for (const priv of ['INSERT', 'UPDATE']) {
        if (b(db.scalar(`select has_column_privilege('${role}', 'public.consumer_briefcase_items', '${col}', '${priv}')`))) {
          writable.push(`${col}:${priv}`);
        }
      }
    }
    check(`C-deny-${role}`, `${role} cannot write any payment column`, writable.length === 0, writable.join(', '));
  }
  const safeOpen = SAFE_COLUMNS.filter((col) =>
    b(db.scalar(`select exists (select 1 from information_schema.columns
        where table_schema='public' and table_name='consumer_briefcase_items' and column_name='${col}')`))
    && b(db.scalar(`select has_column_privilege('authenticated', 'public.consumer_briefcase_items', '${col}', 'UPDATE')`)));
  check('C-safe-open', 'safe nonpayment Briefcase operations remain available',
    safeOpen.length > 0, `no safe column is writable by authenticated (checked ${SAFE_COLUMNS.join(', ')})`);

  // -------------------------------------------------------------------------
  // 9. The consumer bindings on the render job.
  // -------------------------------------------------------------------------
  for (const col of ['consumer_briefcase_item_id', 'consumer_auth_user_id', 'person_id', 'matter_id']) {
    check(`B-${col}`, `packet_render_jobs carries ${col}`,
      b(db.scalar(`select exists (select 1 from information_schema.columns
        where table_schema='public' and table_name='packet_render_jobs' and column_name='${col}')`)),
      'column absent');
  }

  // -------------------------------------------------------------------------
  // 10. Consumption uniqueness on the item AND the provider receipt.
  // -------------------------------------------------------------------------
  for (const [id, idx] of [['item', 'consumer_packet_payment_consumption_item_uk'], ['receipt', 'consumer_packet_payment_consumption_receipt_uk']]) {
    const def = db.scalar(`select coalesce(indexdef, '') from pg_indexes where indexname = '${idx}'`);
    check(`U-${id}`, `consumer payment uniqueness covers the ${id}`,
      /CREATE UNIQUE INDEX/i.test(def), def || 'index absent');
  }

  // -------------------------------------------------------------------------
  // 11-13. Behavioural. These cannot be read from a catalog.
  // -------------------------------------------------------------------------
  if (!allowWrites) {
    console.log('  skip  behavioural checks (read-only run; pass --allow-writes to exercise them)');
  } else {
    const first = (out) => String(out).split('\n').map((l) => l.trim()).filter(Boolean)[0] ?? '';
    const row = (sql) => db.json(`select row_to_json(t) from (${sql}) t`);
    const SHA = (s) => crypto.createHash('sha256').update(String(s)).digest('hex');
    const U = '9f000000-0000-4000-8000-00000000000a';
    const P = '9f000000-0000-4000-8000-00000000000b';
    db.sql(`insert into auth.users values ('${U}') on conflict do nothing`);
    db.sql(`insert into partner_records values ('9f000000-0000-4000-8000-0000000000c1','evid-p') on conflict do nothing`);
    db.sql(`insert into rcap_persons values ('${P}','evid-p','k') on conflict do nothing`);

    // Phase 55 binds a consumer payment to a product, a person and a matter.
    // The person must be the reserved consumer-namespace row for this exact
    // user, derived the way the writer derives it — a person row that merely
    // exists proves nothing.
    const CONSUMER_PERSON = '9f000000-0000-4000-8000-00000000000c';
    db.sql(`insert into rcap_persons (id, partner_slug, match_key)
            select '${CONSUMER_PERSON}', 'expungement-ai-consumer',
                   'consumer:' || encode(
                     extensions.digest(convert_to('rcap:consumer-person:v1:${U}', 'utf8'), 'sha256'),
                     'hex')
            on conflict do nothing`);

    // A payable item under phase 55: server-side payment_allowed, a complete
    // presentation, and the checkout binding stored when Checkout began. The
    // writer may confirm that binding; it may not swing it to another session,
    // product, person or matter.
    const item = () => {
      const id = first(db.scalar(
        `insert into consumer_briefcase_items
           (user_id, item_type, status, jurisdiction, pathway_label, result_code, packet_type, payment_allowed)
         values ('${U}','packet','packet_ready','MS','MS Expungement','packet_ready','official_pdf_overlay',true)
         returning id`));
      db.sql(`update consumer_briefcase_items
                 set checkout_session_id = 'cs_${id}',
                     payment_product_id = 'expungement_packet',
                     payment_person_id = '${CONSUMER_PERSON}',
                     payment_matter_id = consumer_matter_id_for_briefcase_item(id)
               where id = '${id}'`);
      return id;
    };
    // Returns the writer's outcome rather than discarding it: a call that
    // silently returned invalid_payment_evidence would leave every check below
    // asserting against an unpaid item and still look like it had run.
    const pay = (it, eventId) => first(db.scalar(
      `select outcome from record_consumer_packet_payment(
         '${it}','paid',5000,'usd','stripe','${eventId}','cs_${it}',null,null,
         'server_webhook','t','expungement_packet','${CONSUMER_PERSON}',
         consumer_matter_id_for_briefcase_item('${it}'))`));
    let seq = 0;
    const job = (it, user, matter, partner = null) => {
      seq += 1;
      // Phase 55's insert trigger requires a consumer job's person to be the
      // one its payment names. A sponsored job keeps the partner person.
      const person = it ? CONSUMER_PERSON : P;
      const packet = first(db.scalar(`with r as (insert into rcap_document_packets default values returning id) select id from r`));
      const id = first(db.scalar(
        `select id from enqueue_packet_render_job('${packet}','MS:x','packet_document_v1','1.0.0',null,'MS','1.3.0','${SHA(`ev-${seq}`)}',${it ? `'${it}'` : 'null'},${partner ? `'${partner}'` : 'null'},'${person}','${matter}',5,${it ? `'${it}'` : 'null'},${it ? `'${user}'` : 'null'})`));
      if (it) db.sql(`update packet_render_jobs set consumer_briefcase_item_id='${it}', consumer_auth_user_id='${user}' where id='${id}'`);
      return id;
    };
    const finalize = (j) => {
      const c = row(`select id, fencing_token from claim_packet_render_job('evid', null, 60)`);
      db.scalar(`select start_packet_render('${j}','${c.fencing_token}')`);
      db.scalar(`select start_packet_validation('${j}','${c.fencing_token}')`);
      const h = SHA(j); const n = SHA(`${j}-n`);
      return row(`select * from finalize_packet_render_job('${j}','${c.fencing_token}','a/${j}/${h}.pdf','${h}','${n}','${h}','${n}',10,1,'d')`);
    };

    // Phase 55 derives the matter from the item rather than letting a caller
    // name one, so a consumer job's matter is no longer free to choose.
    const matterOf = (it) => first(db.scalar(`select consumer_matter_id_for_briefcase_item('${it}')`));

    const refund = (it) => db.sql(
      `select record_consumer_packet_payment('${it}','refunded',null,null,null,null,null,null,null,'server_admin','t',null::text,null::uuid,null::uuid)`);

    // 12a. Phase 55 moved the refund defence earlier: an already-refunded item
    //      cannot enqueue a consumer render job at all.
    const refundedEarly = item();
    // Bound once: pay() writes, so calling it again to build the failure
    // message would report the outcome of a second, different call.
    const refundedPaid = pay(refundedEarly, 'evid_r');
    check('BE-paid-refund-setup', 'the phase 55 writer records the payment it is given',
      refundedPaid === 'recorded_paid', refundedPaid);
    refund(refundedEarly);
    let enqueueRefusal = '';
    try {
      job(refundedEarly, U, matterOf(refundedEarly));
    } catch (e) {
      enqueueRefusal = String(e?.stderr ?? e?.message ?? e);
    }
    check('BE-refund-enqueue', 'a refunded consumer payment cannot enqueue a render job',
      /consumer payment binding refused \(payment_status_refunded\)/.test(enqueueRefusal),
      enqueueRefusal ? enqueueRefusal.split('\n')[0] : 'the enqueue succeeded');

    // 12b. The finalize-time defence phase 52 introduced still holds for the
    //      realistic ordering the enqueue guard cannot cover: the job is
    //      enqueued while the payment stands, and the refund lands afterwards.
    const refundedLate = item();
    const latePaid = pay(refundedLate, 'evid_r2');
    check('BE-paid-late-refund-setup', 'the phase 55 writer records the payment it is given',
      latePaid === 'recorded_paid', latePaid);
    const jr = job(refundedLate, U, matterOf(refundedLate));
    refund(refundedLate);
    // Under phase 52 this returned accounting_blocked. Phase 55's finalize
    // trigger refuses the status transition outright, so finalization raises
    // instead of returning. Either way the packet must never become
    // deliverable — which is what this asserts, from the job row rather than
    // from the return value the call no longer produces.
    let finalizeRefusal = '';
    try {
      finalize(jr);
    } catch (e) {
      finalizeRefusal = String(e?.stderr ?? e?.message ?? e);
    }
    const refundedStatus = first(db.scalar(`select status from packet_render_jobs where id='${jr}'`));
    check('BE-refund', 'a refund landing after enqueue never yields a deliverable packet',
      /consumer payment binding refused \(payment_status_refunded\)/.test(finalizeRefusal)
        && !['artifact_validated', 'delivered'].includes(refundedStatus),
      `${finalizeRefusal.split('\n')[0] || 'finalization succeeded'} status=${refundedStatus}`);

    // 11. One $50 payment buys one matter, and buys it exactly once.
    //
    // Phase 52 keyed this at finalize: two jobs naming different matters on one
    // payment collided there, and the second was typed
    // consumer_payment_matter_conflict. Phase 55 moved the same guarantee to
    // enqueue, so the second matter never gets a job at all. The two cases below
    // are what that split now looks like, and neither may strand a job.
    const paid = item();
    const conflictPaid = pay(paid, 'evid_p');
    check('BE-paid-conflict-setup', 'the phase 55 writer records the payment it is given',
      conflictPaid === 'recorded_paid', conflictPaid);

    // A re-render of the matter already bought is not a second sale: it is not
    // charged again, and it is not blocked either. Blocking it would strand a
    // paying customer's own packet behind their own earlier download.
    const j1 = job(paid, U, matterOf(paid));
    finalize(j1);
    const j2 = job(paid, U, matterOf(paid));
    const f2 = finalize(j2);
    const st2 = first(db.scalar(`select status from packet_render_jobs where id='${j2}'`));
    check('BE-rerender', 'a second job for the matter already paid for is zero-charge, eligible and not stranded',
      f2?.accounting_result === 'zero_charge' && f2?.delivery_eligibility === 'eligible'
        && st2 === 'artifact_validated',
      `${JSON.stringify(f2)} status=${st2}`);

    // Spreading one payment across a second matter is the abuse this exists to
    // stop. Under phase 55 it is refused before a job row exists.
    let matterRefusal = '';
    try {
      job(paid, U, '9f000000-0000-4000-8000-0000000000d3');
    } catch (e) {
      matterRefusal = String(e?.stderr ?? e?.message ?? e);
    }
    const strayJobs = first(db.scalar(
      `select count(*) from packet_render_jobs
        where consumer_briefcase_item_id='${paid}' and matter_id='9f000000-0000-4000-8000-0000000000d3'`));
    check('BE-matter-conflict', 'one payment cannot be spread across a second matter',
      /consumer payment binding refused \(matter_mismatch\)/.test(matterRefusal) && strayJobs === '0',
      `${matterRefusal.split('\n')[0] || 'the enqueue succeeded'} rows=${strayJobs}`);

    // 13. sponsored accounting is separate
    db.sql(`insert into partner_packet_entitlement (partner_id, packet_cap, overage_enabled, overage_cap)
            values ('9f000000-0000-4000-8000-0000000000c1', 2, false, 0)`);
    const js = job(null, null, '9f000000-0000-4000-8000-0000000000d4', '9f000000-0000-4000-8000-0000000000c1');
    const fs2 = finalize(js);
    const led = row(`select event_type, entitlement_id is not null as has_ent from packet_credit_ledger where render_job_id='${js}'`);
    check('BE-sponsored', 'sponsored accounting remains separate from consumer payment',
      fs2?.accounting_result === 'consumed' && led?.event_type === 'consumed' && led?.has_ent === true,
      `${JSON.stringify(fs2)} ledger=${JSON.stringify(led)}`);
  }
} finally {
  stop();
}

const outJson = path.join(rootDir, 'data/rcap-render/staging-apply-evidence.json');
fs.mkdirSync(path.dirname(outJson), { recursive: true });
fs.writeFileSync(outJson, `${JSON.stringify({
  schemaVersion: 'rcap-staging-apply-evidence/v1',
  generatedBy: 'scripts/verify-rcap-migration-apply-evidence.mjs',
  mode: target ? 'live_target' : 'ephemeral_self_test',
  targetProject: projectRef ?? null,
  behaviouralChecksRun: allowWrites,
  migrationsInApplyOrder: MIGRATIONS.map((m) => ({ phase: m.phase, path: m.path, sha256: m.sha256 })),
  totals: { checks: results.length, passed: results.filter((r) => r.passed).length, failed },
  checks: results,
}, null, 2)}\n`);

console.log('');
if (failed > 0) {
  console.error(`verify-rcap-migration-apply-evidence FAILED: ${failed} of ${results.length} checks`);
  process.exit(1);
}
console.log(`verify-rcap-migration-apply-evidence passed: ${results.length}/${results.length} checks (${target ? `target ${projectRef}` : 'ephemeral self-test'}).`);
