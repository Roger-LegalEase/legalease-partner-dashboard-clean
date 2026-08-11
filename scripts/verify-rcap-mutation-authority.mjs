// Proves the mutation-authority boundary with a production-equivalent role,
// not by assertion.
//
// The claimed boundary: role grants plus owner-executed SECURITY DEFINER
// functions. The rcap.packet_mutation_authority GUC is trigger coordination
// only. This verifier makes that claim falsifiable: it creates service_role
// exactly as Supabase runs it — BYPASSRLS, with default privileges granting
// ALL on new public tables — applies phase 49 then phase 50, and then attempts
// every protected operation directly as each runtime role, with the GUC set
// both via SET and SET LOCAL. Every attempt must fail on permissions, which
// demonstrates the GUC is forgeable but useless to a forger.
//
// Also proven here: the append-only ledger survives even the table owner
// (trigger-level), an old fencing token cannot complete a job, and the
// dedicated worker and delivery roles hold execution on disjoint function
// sets.
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { ephemeralPgAvailable, startEphemeralPg } from "./lib/rcap-ephemeral-pg.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

if (!ephemeralPgAvailable()) {
  console.error("verify-rcap-mutation-authority: PostgreSQL 16 is not available in this environment.");
  process.exit(1);
}

const failures = [];
function assert(condition, message) {
  if (!condition) failures.push(message);
}

const db = startEphemeralPg();
const SHA = (c) => c.repeat(64);
const P1 = "11111111-1111-1111-1111-111111111111";
const PERSON_A = "aaaaaaaa-1111-1111-1111-111111111111";

try {
  // Production-equivalent runtime roles BEFORE the migrations, so the
  // migrations' revokes must beat Supabase's default privileges, exactly as
  // they must on the real stack.
  db.sql(`create role service_role nologin bypassrls`);
  db.sql(`alter default privileges in schema public grant all on tables to service_role`);
  db.sql(`alter default privileges in schema public grant execute on functions to service_role`);
  db.sql(`create table public.partner_records (id uuid primary key default gen_random_uuid(), partner_slug text unique not null)`);
  db.sql(`create table public.rcap_persons (id uuid primary key default gen_random_uuid(), partner_slug text not null, match_key text not null)`);
  db.sql(`create table public.rcap_document_packets (id uuid primary key default gen_random_uuid())`);
  db.applyFile(path.join(rootDir, "supabase/phase-49-rcap-packet-render-jobs.sql"));
  db.applyFile(path.join(rootDir, "supabase/phase-50-rcap-packet-delivery-hardening.sql"));
  db.applyFile(path.join(rootDir, "supabase/phase-51-rcap-consumer-payment-gate.sql"));

  db.applyFile(path.join(rootDir, "supabase/phase-52-rcap-consumer-payment-authority.sql"));
  db.applyFile(path.join(rootDir, "supabase/phase-53-rcap-consumer-job-binding.sql"));
  db.sql(`insert into partner_records (id, partner_slug) values ('${P1}','we-must-vote')`);
  db.sql(`insert into rcap_persons (id, partner_slug, match_key) values ('${PERSON_A}','we-must-vote','a')`);
  db.sql(`insert into partner_packet_entitlement (partner_id, packet_cap) values ('${P1}', 5)`);

  // A consumed, delivered job plus a terminal job to attack.
  const packetRow = db.scalar(`with r as (insert into rcap_document_packets default values returning id) select id from r`);
  const inputHash = createHash("sha256").update("authority-input").digest("hex");
  const jobId = db.scalar(
    `select id from enqueue_packet_render_job('${packetRow}', 'MS:x', 'packet_document_v1', '1.0.0', null, 'MS', '1.3.0', '${inputHash}', null, '${P1}', '${PERSON_A}', '33333333-3333-3333-3333-333333333333', 5, null, null)`
  );
  const claim = db.json(`select row_to_json(t) from (select id, fencing_token from claim_packet_render_job('w1', null, 600)) t`);
  const oldToken = claim.fencing_token;
  db.scalar(`select start_packet_render('${jobId}', '${oldToken}')`);
  db.scalar(`select start_packet_validation('${jobId}', '${oldToken}')`);
  db.json(
    `select row_to_json(t) from (select * from finalize_packet_render_job('${jobId}', '${oldToken}', 'p/${jobId}/${SHA("c")}.pdf', '${SHA("c")}', '${SHA("d")}', '${SHA("c")}', '${SHA("d")}', 100, 3, 'sha256:x')) t`
  );
  const ledgerId = db.scalar(`select id from packet_credit_ledger where render_job_id = '${jobId}'`);

  // --- 1. The forgery battery, per role, with the GUC set both ways ---------
  const protectedStatements = [
    [`update packet_render_jobs set status = 'queued' where id = '${jobId}'`, "direct state update"],
    [`update packet_render_jobs set output_sha256 = '${SHA("e")}' where id = '${jobId}'`, "direct hash write"],
    [`update packet_render_jobs set output_storage_path = 'attacker/path.pdf' where id = '${jobId}'`, "direct storage-path attachment"],
    [`update packet_render_jobs set delivery_eligibility = 'eligible' where id = '${jobId}'`, "direct eligibility write"],
    [`update packet_render_jobs set accounting_result = 'consumed' where id = '${jobId}'`, "direct accounting write"],
    [`insert into packet_credit_ledger (render_job_id, event_type, consumption_unit_hash) values ('${jobId}','consumed','${SHA("f")}')`, "direct ledger insertion"],
    [`update packet_credit_ledger set event_type = 'zero_charge' where id = '${ledgerId}'`, "consumed-credit reversal"],
    [`delete from packet_credit_ledger where id = '${ledgerId}'`, "consumed-credit deletion"],
    [`insert into packet_delivery_events (render_job_id, event_type) values ('${jobId}','transmission_completed')`, "direct delivery-event insertion"],
    [`delete from packet_render_jobs where id = '${jobId}'`, "job deletion"]
  ];
  for (const role of ["service_role", "rcap_render_worker", "rcap_packet_delivery", "anon", "authenticated"]) {
    for (const gucMode of ["set", "set_local"]) {
      for (const [statement, label] of protectedStatements) {
        const guc = gucMode === "set"
          ? `set rcap.packet_mutation_authority = 'finalize_packet_render_job';`
          : `begin; set local rcap.packet_mutation_authority = 'finalize_packet_render_job';`;
        const err = db.sqlExpectError(`set role ${role}; ${guc} ${statement}`);
        assert(
          /permission denied/.test(err),
          `${role} (${gucMode}) must be denied: ${label} (got ${err.split("\n")[0]})`
        );
      }
    }
  }

  // --- 2. The GUC is coordination even for the owner ------------------------
  // The table owner is not a runtime role, but the append-only rule holds even
  // there: the trigger refuses UPDATE and DELETE on ledger rows regardless of
  // authority, so a consumed entry is irreversible at every level short of
  // dropping the trigger inside an authorized migration.
  const ownerReversal = db.sqlExpectError(`set rcap.packet_mutation_authority = 'finalize_packet_render_job'; update packet_credit_ledger set event_type = 'zero_charge' where id = '${ledgerId}'`);
  assert(/append-only/.test(ownerReversal), "even the owner cannot reverse a consumed ledger entry");
  const ownerDelete = db.sqlExpectError(`delete from packet_credit_ledger where id = '${ledgerId}'`);
  assert(/append-only/.test(ownerDelete), "even the owner cannot delete a consumed ledger entry");

  // --- 3. An old fencing token cannot complete a job ------------------------
  const packet2 = db.scalar(`with r as (insert into rcap_document_packets default values returning id) select id from r`);
  const hash2 = createHash("sha256").update("authority-input-2").digest("hex");
  const job2 = db.scalar(
    `select id from enqueue_packet_render_job('${packet2}', 'MS:x', 'packet_document_v1', '1.0.0', null, 'MS', '1.3.0', '${hash2}', null, '${P1}', '${PERSON_A}', '43333333-3333-3333-3333-333333333333', 5, null, null)`
  );
  const claimA = db.json(`select row_to_json(t) from (select id, fencing_token from claim_packet_render_job('wA', null, 60)) t`);
  db.sql(`update packet_render_jobs set claim_expires_at = now() - interval '1 minute' where id = '${job2}'`);
  db.scalar(`select release_expired_packet_render_claims()`);
  const claimB = db.json(`select row_to_json(t) from (select id, fencing_token from claim_packet_render_job('wB', null, 600)) t`);
  assert(claimB.id === job2 && claimB.fencing_token !== claimA.fencing_token, "a new claim supersedes the old token");
  const staleComplete = db.sqlExpectError(
    `select * from finalize_packet_render_job('${job2}', '${claimA.fencing_token}', 'p/${job2}/${SHA("c")}.pdf', '${SHA("c")}', '${SHA("d")}', '${SHA("c")}', '${SHA("d")}', 1, 1, 'x')`
  );
  assert(/fencing token is not the active claim/.test(staleComplete), "an old claim token cannot complete a job");

  // --- 4. Terminal-job requeue is manual-only, even via functions -----------
  db.scalar(`select start_packet_render('${job2}', '${claimB.fencing_token}')`);
  db.sql(`update packet_render_jobs set max_attempts = attempt_count where id = '${job2}'`);
  db.scalar(`select fail_packet_render_job('${job2}', '${claimB.fencing_token}', 'render_failed', 'x', true)`);
  assert(db.scalar(`select failure_disposition from packet_render_jobs where id = '${job2}'`) === "terminal", "exhausted failure is terminal");
  assert(db.scalar(`select requeue_retryable_packet_render_jobs()`) === "0", "automatic requeue never reaches a terminal job");
  const directRequeue = db.sqlExpectError(`set role service_role; update packet_render_jobs set status = 'queued' where id = '${job2}'`);
  assert(/permission denied/.test(directRequeue), "service_role cannot requeue a terminal job directly");

  // --- 5. Function-set separation -------------------------------------------
  const workerDeliveryAttempt = db.sqlExpectError(
    `set role rcap_render_worker; select record_packet_delivery_event('${jobId}', 'delivery_authorized', null, '{}'::jsonb)`
  );
  assert(/permission denied/.test(workerDeliveryAttempt), "the worker role holds no delivery authority");
  const deliveryClaimAttempt = db.sqlExpectError(
    `set role rcap_packet_delivery; select claim_packet_render_job('x', null, 60)`
  );
  assert(/permission denied/.test(deliveryClaimAttempt), "the delivery role holds no worker authority");
  const deliveryOk = db.scalar(
    `set role rcap_packet_delivery; select record_packet_delivery_event('${jobId}', 'delivery_authorized', null, '{}'::jsonb) is not null`
  );
  assert(deliveryOk.endsWith("t"), "the delivery role can record delivery events through its function");

  // --- 6. service_role keeps its sanctioned surface --------------------------
  const readOk = db.scalar(`set role service_role; select count(*) >= 1 from packet_render_jobs`);
  assert(readOk.endsWith("t"), "service_role keeps SELECT for reporting");
  const entWrite = db.scalar(`set role service_role; update partner_packet_entitlement set packet_cap = 6 where partner_id = '${P1}' returning packet_cap`);
  assert(entWrite.includes("6"), "service_role configures entitlement caps (configuration, not accounting evidence)");
} finally {
  db.stop();
}

if (failures.length > 0) {
  console.error("verify-rcap-mutation-authority FAILED");
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}
console.log("verify-rcap-mutation-authority passed: grants are the boundary; the authority GUC is forgeable but useless to every runtime role.");
