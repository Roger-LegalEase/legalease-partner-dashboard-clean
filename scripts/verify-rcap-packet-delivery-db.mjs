// Behavioral verification of the phase-48 render-job, accounting and delivery
// layer against a real ephemeral PostgreSQL 16 cluster.
//
// Everything here exercises actual database behavior — no source-text reads.
// Concurrency cases run as genuinely parallel psql processes, so row locking
// and the exactly-once index are tested for real, not simulated.
//
// Map to the delivery-gate requirements:
//   fencing + stale worker            cases 1, 2
//   retry exhaustion, manual requeue  case 3
//   mutation-authority enforcement    case 4
//   validated artifact + typed result case 5
//   exactly-once per matter           cases 5, 9
//   checksum mismatch fails closed    case 6
//   cap, overage, cap-bypass race     cases 7, 8, 16
//   idempotent finalize retry         case 15
//   grants / RLS                      case 12
//   delivery-event authority          case 13
//   TS/SQL unit-hash parity           case 14
import path from "node:path";
import { createHash } from "node:crypto";
import { register } from "node:module";
import { fileURLToPath } from "node:url";
import { ephemeralPgAvailable, startEphemeralPg } from "./lib/rcap-ephemeral-pg.mjs";
register("./lib/ts-esm-loader.mjs", import.meta.url);

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { consumptionUnitHash } = await import("../src/lib/rcap/render/job-contract.ts");

if (!ephemeralPgAvailable()) {
  console.error("verify-rcap-packet-delivery-db: PostgreSQL 16 is not available in this environment.");
  process.exit(1);
}

const failures = [];
function assert(condition, message) {
  if (!condition) failures.push(message);
}

const db = startEphemeralPg();
const SHA = (c) => c.repeat(64);
const P1 = "11111111-1111-1111-1111-111111111111";
const P2 = "21111111-1111-1111-1111-111111111111";
const P3 = "31111111-1111-1111-1111-111111111111";
const PERSON_A = "aaaaaaaa-1111-1111-1111-111111111111";
const PERSON_C = "cccccccc-1111-1111-1111-111111111111";

let jobSeq = 0;
function enqueue({ packet, partner = null, person = null, matter = null, maxAttempts = 5 }) {
  jobSeq += 1;
  const hash = createHash("sha256").update(`input-${jobSeq}`).digest("hex");
  return db
    .scalar(
      `select id from enqueue_packet_render_job('${packet}', 'MS:misdemeanor_conviction', 'packet_document_v1', '1.0.0', null, 'MS', '1.3.0', '${hash}', null, ${partner ? `'${partner}'` : "null"}, ${person ? `'${person}'` : "null"}, ${matter ? `'${matter}'` : "null"}, ${maxAttempts})`
    )
    .trim();
}

// The claim function takes the oldest queued job, so cases that leave a job in
// the queue drain it first to keep later claims deterministic.
function drainQueuedJob(jobId) {
  const c = claim("drain");
  if (!c) return;
  if (c.id !== jobId) throw new Error(`drain expected ${jobId}, claimed ${c.id}`);
  db.scalar(`select fail_packet_render_job('${jobId}', '${c.fencing_token}', 'render_failed', 'drained by test harness', false)`);
}

function claim(worker = "w1", seconds = 60) {
  const row = db.json(
    `select row_to_json(t) from (select id, fencing_token from claim_packet_render_job('${worker}', null, ${seconds})) t`
  );
  return row; // {id, fencing_token} or null
}

function toValidating(jobId, token) {
  db.scalar(`select start_packet_render('${jobId}', '${token}')`);
  db.scalar(`select start_packet_validation('${jobId}', '${token}')`);
}

function finalize(jobId, token, { sha = SHA("c"), stored = null, norm = SHA("d"), storedNorm = null, path: storagePath = null } = {}) {
  const p = storagePath ?? `packet-artifacts/x/y/${jobId}/${sha}.pdf`;
  return db.json(
    `select row_to_json(t) from (select * from finalize_packet_render_job('${jobId}', ${token ? `'${token}'` : "null"}, '${p}', '${sha}', '${norm}', '${stored ?? sha}', '${storedNorm ?? norm}', 1000, 3, 'sha256:test')) t`
  );
}

function jobRow(jobId) {
  return db.json(
    `select row_to_json(t) from (select status, delivery_eligibility, accounting_result, failure_disposition, last_error_code, next_attempt_at, attempt_count, max_attempts, output_sha256, fencing_token from packet_render_jobs where id = '${jobId}') t`
  );
}

try {
  // --- schema + seed ---------------------------------------------------------
  db.sql(`create table public.partner_records (id uuid primary key, partner_slug text unique not null)`);
  db.sql(`create table public.rcap_persons (id uuid primary key, partner_slug text not null, match_key text not null)`);
  db.applyFile(path.join(rootDir, "supabase/phase-48-rcap-packet-render-jobs.sql"));
  db.sql(`insert into partner_records values ('${P1}','we-must-vote'), ('${P2}','partner-two'), ('${P3}','partner-three')`);
  db.sql(`insert into rcap_persons values ('${PERSON_A}','we-must-vote','a'), ('${PERSON_C}','partner-two','c')`);
  db.sql(`insert into partner_packet_entitlement (partner_id, packet_cap, overage_enabled, overage_cap) values ('${P1}', 2, true, 1)`);
  db.sql(`insert into partner_packet_entitlement (partner_id, packet_cap, overage_enabled, overage_cap) values ('${P2}', 1, false, 0)`);
  db.sql(`insert into partner_packet_entitlement (partner_id, packet_cap, overage_enabled, overage_cap, pause_at_cap) values ('${P3}', 0, false, 5, false)`);

  // --- case 1: fencing and the stale worker ---------------------------------
  const m1 = "9aaaaaaa-1111-1111-1111-111111111111";
  const j1 = enqueue({ packet: "pkt-1", partner: P1, person: PERSON_A, matter: m1 });
  const c1 = claim("w1");
  assert(c1?.id === j1, "case1: w1 claims the queued job");

  // Force the lease into the past (test time-travel on non-guarded columns),
  // release, and let a second worker claim.
  db.sql(`update packet_render_jobs set claim_expires_at = now() - interval '1 minute' where id = '${j1}'`);
  const released = db.scalar(`select release_expired_packet_render_claims()`);
  assert(released === "1", `case1: expired claim released (got ${released})`);
  const c2 = claim("w2");
  assert(c2?.id === j1 && c2.fencing_token !== c1.fencing_token, "case1: w2 claims with a fresh fencing token");

  const staleStart = db.sqlExpectError(`select start_packet_render('${j1}', '${c1.fencing_token}')`);
  assert(/fencing token is not the active claim/.test(staleStart), "case1: stale token cannot start render");
  const staleFinalize = db.sqlExpectError(
    `select * from finalize_packet_render_job('${j1}', '${c1.fencing_token}', 'p/${j1}/${SHA("c")}.pdf', '${SHA("c")}', '${SHA("d")}', '${SHA("c")}', '${SHA("d")}', 1, 1, 'x')`
  );
  assert(/fencing token is not the active claim/.test(staleFinalize), "case1: a stale worker cannot finalize");

  // The live token works.
  toValidating(j1, c2.fencing_token);
  assert(jobRow(j1).status === "validating", "case1: live token advances the job");

  // --- case 2: lease expiry mid-render fails retryably with backoff ---------
  const j2 = enqueue({ packet: "pkt-2" });
  const c3 = claim("w3");
  assert(c3?.id === j2, "case2: claim");
  db.scalar(`select start_packet_render('${j2}', '${c3.fencing_token}')`);
  db.sql(`update packet_render_jobs set claim_expires_at = now() - interval '1 minute' where id = '${j2}'`);
  db.scalar(`select release_expired_packet_render_claims()`);
  let row2 = jobRow(j2);
  assert(row2.status === "failed" && row2.failure_disposition === "retryable" && row2.last_error_code === "timeout", "case2: mid-render expiry fails retryably as timeout");
  assert(row2.next_attempt_at !== null, "case2: a retryable failure carries a backoff time");
  // Not due yet: automatic requeue leaves it alone.
  assert(db.scalar(`select requeue_retryable_packet_render_jobs()`) === "0", "case2: backoff not elapsed, no requeue");
  db.sql(`update packet_render_jobs set next_attempt_at = now() - interval '1 second' where id = '${j2}'`);
  assert(db.scalar(`select requeue_retryable_packet_render_jobs()`) === "1", "case2: due retryable failure requeues");
  assert(jobRow(j2).status === "queued", "case2: back in the queue");
  drainQueuedJob(j2);

  // --- case 3: exhaustion is terminal, visible, manual-only ------------------
  const j3 = enqueue({ packet: "pkt-3", maxAttempts: 2 });
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const c = claim("w4");
    assert(c?.id === j3, `case3: claim attempt ${attempt + 1}`);
    const disposition = db.scalar(`select fail_packet_render_job('${j3}', '${c.fencing_token}', 'render_failed', 'boom', true)`);
    if (attempt === 0) {
      assert(disposition === "retryable", "case3: first failure retryable");
      db.sql(`update packet_render_jobs set next_attempt_at = now() - interval '1 second' where id = '${j3}'`);
      db.scalar(`select requeue_retryable_packet_render_jobs()`);
    } else {
      assert(disposition === "terminal", "case3: exhausted failure is terminal");
    }
  }
  let row3 = jobRow(j3);
  assert(row3.status === "failed" && row3.failure_disposition === "terminal", "case3: terminal visible state");
  assert(db.scalar(`select requeue_retryable_packet_render_jobs()`) === "0", "case3: terminal is never auto-requeued");
  const claimAfterTerminal = claim("w5");
  assert(claimAfterTerminal === null || claimAfterTerminal.id !== j3, "case3: terminal job is not claimable");
  const noAuthorizer = db.sqlExpectError(`select requeue_packet_render_job_manual('${j3}', '  ')`);
  assert(/named authorizer/.test(noAuthorizer), "case3: manual requeue requires an authorizer");
  db.scalar(`select requeue_packet_render_job_manual('${j3}', 'Roger Roman')`);
  row3 = jobRow(j3);
  assert(row3.status === "queued" && row3.max_attempts > 2, "case3: manual requeue with recorded authorization");
  drainQueuedJob(j3);

  // --- case 4: mutation authority ------------------------------------------
  const directInsert = db.sqlExpectError(
    `insert into packet_render_jobs (packet_id, route_id, renderer_kind, renderer_version, profile_id, profile_version, input_hash) values ('x','x','packet_document_v1','1','x','1','${SHA("e")}')`
  );
  assert(/only through enqueue_packet_render_job/.test(directInsert), "case4: direct job insert refused");
  const directValidate = db.sqlExpectError(`update packet_render_jobs set status = 'artifact_validated' where id = '${j1}'`);
  assert(/artifact_validated is written only by finalize/.test(directValidate), "case4: direct artifact_validated refused");
  const directEligible = db.sqlExpectError(`update packet_render_jobs set delivery_eligibility = 'eligible' where id = '${j1}'`);
  assert(/accounting fields are written only by finalize/.test(directEligible), "case4: direct eligibility refused");
  const directLedger = db.sqlExpectError(
    `insert into packet_credit_ledger (render_job_id, event_type, consumption_unit_hash) values ('${j1}', 'consumed', '${SHA("f")}')`
  );
  assert(/appended only by finalize_packet_render_job/.test(directLedger), "case4: direct ledger insert refused");
  const directEvent = db.sqlExpectError(
    `insert into packet_delivery_events (render_job_id, event_type) values ('${j1}', 'delivery_started')`
  );
  assert(/recorded only by record_packet_delivery_event/.test(directEvent), "case4: direct delivery event refused");
  const directDelete = db.sqlExpectError(`delete from packet_render_jobs where id = '${j1}'`);
  assert(/never deleted/.test(directDelete), "case4: job delete refused");

  // --- case 5: finalize -> consumed; re-render -> already_consumed ----------
  const fin1 = finalize(j1, c2.fencing_token);
  assert(fin1.accounting_result === "consumed" && fin1.delivery_eligibility === "eligible", `case5: first packet consumes (got ${JSON.stringify(fin1)})`);
  const row1 = jobRow(j1);
  assert(row1.status === "artifact_validated" && row1.output_sha256 === SHA("c"), "case5: artifact evidence recorded");
  assert(row1.fencing_token === null, "case5: finalize retires the fencing token");

  const j5 = enqueue({ packet: "pkt-1-rerender", partner: P1, person: PERSON_A, matter: m1 });
  const c5 = claim("w6");
  assert(c5?.id === j5, "case5: re-render claim");
  toValidating(j5, c5.fencing_token);
  const fin5 = finalize(j5, c5.fencing_token, { sha: SHA("a"), norm: SHA("b") });
  assert(fin5.accounting_result === "already_consumed" && fin5.delivery_eligibility === "eligible", "case5: re-render of the same matter consumes nothing and stays deliverable");
  const ledgerCount1 = db.scalar(`select count(*) from packet_credit_ledger where event_type in ('consumed','overage_consumed')`);
  assert(ledgerCount1 === "1", `case5: exactly one consuming entry (got ${ledgerCount1})`);

  // --- case 15: finalize retry after commit converges -----------------------
  const finAgain = finalize(j1, null);
  assert(finAgain.accounting_result === "consumed" && finAgain.delivery_eligibility === "eligible", "case15: a finalize retry returns the recorded outcome");
  assert(
    db.scalar(`select count(*) from packet_credit_ledger where event_type in ('consumed','overage_consumed')`) === "1",
    "case15: the retry consumed nothing further"
  );

  // --- case 6: checksum mismatch fails closed -------------------------------
  const j6 = enqueue({ packet: "pkt-6", partner: P1, person: PERSON_A, matter: "9bbbbbbb-1111-1111-1111-111111111111" });
  const c6 = claim("w7");
  toValidating(j6, c6.fencing_token);
  const fin6 = finalize(j6, c6.fencing_token, { stored: SHA("0") });
  assert(fin6.accounting_result === "not_validated", "case6: mismatch does not validate");
  const row6 = jobRow(j6);
  assert(row6.status === "failed" && row6.last_error_code === "checksum_mismatch", "case6: checksum mismatch fails the job");
  assert(
    db.scalar(`select count(*) from packet_credit_ledger where render_job_id = '${j6}'`) === "0",
    "case6: no credit on a mismatch"
  );

  // --- case 7 + 10: cap, overage reserve, cap-bypass race closed ------------
  // P1 cap=2, one consumed so far (m1). Same person, new matters: per-matter
  // accounting, not per-person.
  const consumeMatter = (matter, packet) => {
    const j = enqueue({ packet, partner: P1, person: PERSON_A, matter });
    const c = claim("wcap");
    toValidating(j, c.fencing_token);
    return { j, out: finalize(j, c.fencing_token, { sha: SHA("c"), norm: SHA("d") }) };
  };
  const m2 = consumeMatter("9ccccccc-1111-1111-1111-111111111111", "pkt-7a");
  assert(m2.out.accounting_result === "consumed", "case7: second matter consumes the final capped unit (two matters, one person)");
  const m3 = consumeMatter("9ddddddd-1111-1111-1111-111111111111", "pkt-7b");
  assert(m3.out.accounting_result === "overage_consumed", "case7: reserve unit consumed as overage");
  const m4 = consumeMatter("9eeeeeee-1111-1111-1111-111111111111", "pkt-7c");
  assert(m4.out.accounting_result === "cap_reached" && m4.out.delivery_eligibility === "accounting_blocked", "case7: past the reserve is visibly accounting-blocked");
  const row7 = jobRow(m4.j);
  assert(row7.status === "artifact_validated" && row7.output_sha256 !== null, "case7: the blocked job preserves its artifact evidence");
  const blockedEvent = db.sqlExpectError(
    `select record_packet_delivery_event('${m4.j}', 'delivery_started', null, '{}'::jsonb)`
  );
  assert(/not delivery-eligible/.test(blockedEvent), "case7: the cap-bypass race is closed — a valid artifact without accounting cannot record delivery");

  // --- case 16: pause_at_cap=false with no overage still fails closed -------
  const j16 = enqueue({ packet: "pkt-16", partner: P3, person: PERSON_A, matter: "9fffffff-1111-1111-1111-111111111111" });
  const c16 = claim("w16");
  toValidating(j16, c16.fencing_token);
  const fin16 = finalize(j16, c16.fencing_token);
  assert(fin16.accounting_result === "cap_reached" && fin16.delivery_eligibility === "accounting_blocked", "case16: zero cap without overage is blocked regardless of pause_at_cap");

  // --- case 8: concurrent finalize race at the final unit -------------------
  const raceMatterX = "8aaaaaaa-1111-1111-1111-111111111111";
  const raceMatterY = "8bbbbbbb-1111-1111-1111-111111111111";
  const jx = enqueue({ packet: "pkt-8x", partner: P2, person: PERSON_C, matter: raceMatterX });
  const cx = claim("wx");
  toValidating(jx, cx.fencing_token);
  const jy = enqueue({ packet: "pkt-8y", partner: P2, person: PERSON_C, matter: raceMatterY });
  const cy = claim("wy");
  toValidating(jy, cy.fencing_token);

  const finalizeSql = (jobId, token) =>
    `select accounting_result from finalize_packet_render_job('${jobId}', '${token}', 'p/${jobId}/${SHA("c")}.pdf', '${SHA("c")}', '${SHA("d")}', '${SHA("c")}', '${SHA("d")}', 1, 1, 'x')`;
  const [rx, ry] = await Promise.all([db.sqlAsync(finalizeSql(jx, cx.fencing_token)), db.sqlAsync(finalizeSql(jy, cy.fencing_token))]);
  const raceResults = [rx.out, ry.out].sort();
  assert(rx.ok && ry.ok, `case8: both concurrent finalizes complete (${rx.err} ${ry.err})`);
  assert(
    JSON.stringify(raceResults) === JSON.stringify(["cap_reached", "consumed"]),
    `case8: the final unit is deterministic under concurrency (got ${JSON.stringify(raceResults)})`
  );
  assert(
    db.scalar(`select count(*) from packet_credit_ledger l join partner_packet_entitlement e on e.id = l.entitlement_id where e.partner_id = '${P2}' and l.event_type = 'consumed'`) === "1",
    "case8: exactly one consumed unit for the racing partner"
  );

  // --- case 9: two workers, two jobs, the same matter, concurrently ---------
  const sharedMatter = "8ccccccc-1111-1111-1111-111111111111";
  db.sql(`update partner_packet_entitlement set packet_cap = 3 where partner_id = '${P2}'`);
  const ja = enqueue({ packet: "pkt-9a", partner: P2, person: PERSON_C, matter: sharedMatter });
  const ca = claim("wa");
  toValidating(ja, ca.fencing_token);
  const jb = enqueue({ packet: "pkt-9b", partner: P2, person: PERSON_C, matter: sharedMatter });
  const cb = claim("wb");
  toValidating(jb, cb.fencing_token);
  const [ra, rb] = await Promise.all([db.sqlAsync(finalizeSql(ja, ca.fencing_token)), db.sqlAsync(finalizeSql(jb, cb.fencing_token))]);
  assert(ra.ok && rb.ok, `case9: both same-matter finalizes complete (${ra.err} ${rb.err})`);
  const sameMatterResults = [ra.out, rb.out].sort();
  assert(
    JSON.stringify(sameMatterResults) === JSON.stringify(["already_consumed", "consumed"]),
    `case9: same matter twice = one consumed, one already_consumed (got ${JSON.stringify(sameMatterResults)})`
  );

  // --- case 11: consumer path is explicit zero-charge ------------------------
  const j11 = enqueue({ packet: "pkt-11" });
  const c11 = claim("w11");
  toValidating(j11, c11.fencing_token);
  const fin11 = finalize(j11, c11.fencing_token);
  assert(fin11.accounting_result === "zero_charge" && fin11.delivery_eligibility === "eligible", "case11: consumer packet records an explicit zero-charge disposition");
  assert(
    db.scalar(`select count(*) from packet_credit_ledger where render_job_id = '${j11}' and event_type = 'zero_charge'`) === "1",
    "case11: zero-charge is written to the ledger for audit"
  );

  // --- case 13: delivery events --------------------------------------------
  db.scalar(`select record_packet_delivery_event('${j1}', 'delivery_started', null, '{}'::jsonb)`);
  db.scalar(`select record_packet_delivery_event('${j1}', 'delivery_completed', null, '{}'::jsonb)`);
  assert(jobRow(j1).status === "delivered", "case13: delivery_completed advances to delivered");
  // Repeat download: free, and still recordable after delivered.
  db.scalar(`select record_packet_delivery_event('${j1}', 'delivery_started', null, '{}'::jsonb)`);
  db.scalar(`select record_packet_delivery_event('${j1}', 'delivery_completed', null, '{}'::jsonb)`);
  assert(
    db.scalar(`select count(*) from packet_credit_ledger where event_type in ('consumed','overage_consumed')`) ===
      db.scalar(`select count(distinct consumption_unit_hash) from packet_credit_ledger where event_type in ('consumed','overage_consumed')`),
    "case13: repeat downloads never add consuming entries"
  );
  const eventOnQueued = db.sqlExpectError(`select record_packet_delivery_event('${j2}', 'delivery_started', null, '{}'::jsonb)`);
  assert(/not delivery-eligible/.test(eventOnQueued), "case13: no delivery event on an unfinalized job");

  // Ledger immutability: consumed entries are undeletable and irreversible.
  const ledgerUpdate = db.sqlExpectError(`update packet_credit_ledger set event_type = 'zero_charge' where event_type = 'consumed'`);
  assert(/append-only/.test(ledgerUpdate), "case13: ledger update refused");
  const ledgerDelete = db.sqlExpectError(`delete from packet_credit_ledger where event_type = 'consumed'`);
  assert(/append-only/.test(ledgerDelete), "case13: ledger delete refused");
  const eventUpdate = db.sqlExpectError(`update packet_delivery_events set event_type = 'delivery_completed'`);
  assert(/append-only/.test(eventUpdate), "case13: delivery event update refused");

  // --- case 12: grants and RLS ----------------------------------------------
  for (const role of ["anon", "authenticated"]) {
    const tableRead = db.sqlExpectError(`set role ${role}; select count(*) from packet_render_jobs`);
    assert(/permission denied/.test(tableRead), `case12: ${role} cannot read render jobs`);
    const ledgerRead = db.sqlExpectError(`set role ${role}; select count(*) from packet_credit_ledger`);
    assert(/permission denied/.test(ledgerRead), `case12: ${role} cannot read the credit ledger`);
    const fnCall = db.sqlExpectError(`set role ${role}; select claim_packet_render_job('x', null, 60)`);
    assert(/permission denied/.test(fnCall), `case12: ${role} cannot execute claim`);
    const finalizeCall = db.sqlExpectError(
      `set role ${role}; select finalize_packet_render_job('${j1}', null, 'p', '${SHA("c")}', '${SHA("d")}', '${SHA("c")}', '${SHA("d")}', 1, 1, 'x')`
    );
    assert(/permission denied/.test(finalizeCall), `case12: ${role} cannot execute finalize`);
  }

  // --- case 14: TS and SQL derive the same consumption unit hash ------------
  const entId = db.scalar(`select id from partner_packet_entitlement where partner_id = '${P1}'`);
  const sqlHash = db.scalar(
    `select consumption_unit_hash from packet_credit_ledger where entitlement_id = '${entId}' and event_type = 'consumed' order by created_at limit 1`
  );
  const tsHash = consumptionUnitHash({
    partnerId: P1,
    entitlementScope: "sponsored_packets",
    personId: PERSON_A,
    matterId: m1
  });
  assert(sqlHash === tsHash, `case14: TS unit hash ${tsHash.slice(0, 12)}… != SQL ${sqlHash.slice(0, 12)}…`);

  // --- case 17: the storage path must bind job identity ---------------------
  const j17 = enqueue({ packet: "pkt-17" });
  const c17 = claim("w17");
  toValidating(j17, c17.fencing_token);
  const badPath = db.sqlExpectError(
    `select * from finalize_packet_render_job('${j17}', '${c17.fencing_token}', 'packet-artifacts/somewhere-else.pdf', '${SHA("c")}', '${SHA("d")}', '${SHA("c")}', '${SHA("d")}', 1, 1, 'x')`
  );
  assert(/storage path must bind/.test(badPath), "case17: a path that does not bind job id and hash is refused");
} finally {
  db.stop();
}

if (failures.length > 0) {
  console.error("verify-rcap-packet-delivery-db FAILED");
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}
console.log("verify-rcap-packet-delivery-db passed: lifecycle, fencing, accounting, delivery and grants hold on a real database.");
