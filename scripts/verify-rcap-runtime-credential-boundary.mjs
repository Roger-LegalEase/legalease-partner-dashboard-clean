// Adversarial proof of the RUNTIME CREDENTIAL boundary across migration states.
//
// This verifier does not overlap verify-rcap-mutation-authority.mjs. That one
// asks "in the finished 49+50 schema, can a runtime role forge a protected
// mutation?" and answers no. This one asks the question that one cannot,
// because it only ever boots the finished schema:
//
//   Which database states are actually reachable in deployment, and is the
//   boundary intact in each of them?
//
// The answer is no. Phase 49 is authorized for production; phase 50 is
// authorized for repository integration only. The single state currently
// authorized to exist in production is phase 49 standing alone, and in that
// state two SECURITY DEFINER functions carry PostgreSQL's default PUBLIC
// EXECUTE grant, so anon and authenticated — both reachable over PostgREST with
// the publishable key — can move sponsored credit and claim render jobs while
// holding no table privilege at all.
//
// Sections A and B pin that: A proves the hazard is real by exploiting it, B
// proves phase 50 closes it. Together they make the apply-order requirement in
// docs/RCAP_MIGRATION_APPLY_ORDER_SECURITY.md a load-bearing security control
// rather than a sequencing note, and C requires that document to keep saying so.
//
// Section D covers the phase-50 private artifact bucket, which no verifier
// asserted. Section E characterizes the two residual trust gaps in the 49+50
// state — incoherent accounting identity, and unverified delivery actors — and
// pins the out-of-database control that is the only defense for each, so
// removing that control turns this file red.

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { ephemeralPgAvailable, startEphemeralPg } from "./lib/rcap-ephemeral-pg.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relativePath) => fs.readFileSync(path.join(rootDir, relativePath), "utf8");

const PHASE_49 = "supabase/phase-49-rcap-packet-render-jobs.sql";
const PHASE_50 = "supabase/phase-50-rcap-packet-delivery-hardening.sql";
const ADVISORY = "docs/RCAP_MIGRATION_APPLY_ORDER_SECURITY.md";

if (!ephemeralPgAvailable()) {
  console.error("verify-rcap-runtime-credential-boundary: PostgreSQL 16 is not available in this environment.");
  process.exit(1);
}

const failures = [];
let checks = 0;
function check(condition, message) {
  checks += 1;
  if (!condition) failures.push(message);
}

const SHA = (c) => c.repeat(64);
const PARTNER_A = "11111111-1111-1111-1111-111111111111";
const PARTNER_B = "22222222-2222-2222-2222-222222222222";
const PERSON_A = "aaaaaaaa-1111-1111-1111-111111111111";
const PERSON_B = "bbbbbbbb-2222-2222-2222-222222222222";

/** Supabase-equivalent preconditions: runtime roles and default privileges
 *  exist BEFORE the migrations, so a migration's revokes must actually beat
 *  them, exactly as on the real stack. */
function seedCluster(db, { withStorage = false } = {}) {
  db.sql(`create role service_role nologin bypassrls`);
  db.sql(`create role anon nologin`);
  db.sql(`create role authenticated nologin`);
  db.sql(`alter default privileges in schema public grant all on tables to service_role`);
  db.sql(`alter default privileges in schema public grant execute on functions to service_role`);
  db.sql(`create table public.partner_records (id uuid primary key default gen_random_uuid(), partner_slug text unique not null)`);
  db.sql(`create table public.rcap_persons (id uuid primary key default gen_random_uuid(), partner_slug text not null, match_key text not null)`);
  db.sql(`create table public.rcap_document_packets (id uuid primary key default gen_random_uuid())`);
  if (withStorage) {
    db.sql(`create schema storage`);
    db.sql(`create table storage.buckets (id text primary key, name text not null, public boolean not null default false, file_size_limit bigint, allowed_mime_types text[])`);
    db.sql(`create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text not null references storage.buckets(id), name text not null, unique (bucket_id, name))`);
    db.sql(`grant usage on schema storage to anon, authenticated, service_role`);
    // Supabase's real default storage grants. RLS-with-no-policy must be the
    // only thing denying the attacker, or the test proves nothing.
    db.sql(`grant select, insert, update, delete on storage.objects to anon, authenticated`);
    db.sql(`grant select on storage.buckets to anon, authenticated`);
    db.sql(`alter table storage.objects enable row level security`);
  }
}

const newPacket = (db) =>
  db.scalar(`with r as (insert into rcap_document_packets default values returning id) select id from r`);

// =============================================================================
// A. The state authorized for production TODAY: phase 49 standing alone.
// =============================================================================

console.log("A. phase 49 alone — the only production-authorized state");
{
  const db = startEphemeralPg();
  try {
    seedCluster(db);
    db.applyFile(path.join(rootDir, PHASE_49));

    // A1. The grant posture itself.
    for (const signature of [
      "consume_rcap_packet_credit(text, text, uuid)",
      "claim_packet_render_job(text, text[])"
    ]) {
      for (const role of ["anon", "authenticated"]) {
        const granted = db
          .scalar(`select has_function_privilege('${role}', 'public.${signature}', 'EXECUTE')`)
          .trim();
        check(
          granted === "t",
          `regression: ${role} no longer holds the documented default EXECUTE on ${signature}. ` +
            `If phase 49 was hardened, update ${ADVISORY} and this verifier together.`
        );
      }
    }
    console.log("  ok  both phase-49 SECURITY DEFINER functions carry the default PUBLIC execute grant");

    // A2. Exploit it: a browser role moves sponsored credit end to end.
    db.sql(`insert into partner_records (id, partner_slug) values ('${PARTNER_A}','we-must-vote')`);
    db.sql(`insert into rcap_partner_packet_allocation (partner_slug, packets_allowed) values ('we-must-vote', 2)`);

    const packetId = newPacket(db);
    const inputHash = createHash("sha256").update("phase49-alone").digest("hex");
    const jobId = db.scalar(
      `with r as (insert into packet_render_jobs
         (packet_id, route_id, renderer_kind, source_sha256, profile_id, profile_version, input_hash)
       values ('${packetId}','MS:x','packet_document_v1','${SHA("a")}','MS','1.3.0','${inputHash}')
       returning id) select id from r`
    );
    for (const status of ["claimed", "rendering", "validating"]) {
      db.sql(`update packet_render_jobs set status='${status}' where id='${jobId}'`);
    }
    db.sql(
      `update packet_render_jobs set output_storage_path='p/x.pdf', output_sha256='${SHA("c")}', status='artifact_validated' where id='${jobId}'`
    );

    const drained = db
      .scalar(
        `set role authenticated; select row_to_json(t)::text from (select * from consume_rcap_packet_credit('we-must-vote','matter-1','${jobId}')) t`
      )
      .replace(/^SET\s*/, "")
      .trim();
    check(
      drained.includes('"ok":true') && drained.includes('"reason":"consumed"'),
      `the documented phase-49-alone credit bypass did not reproduce (got ${drained}). ` +
        `If this is now denied, phase 49 changed: re-verify and update ${ADVISORY}.`
    );

    const writtenRows = db.scalar(`select count(*) from rcap_packet_credit_consumptions`).trim();
    check(writtenRows === "1", "a browser role must have written exactly one consumption row in this state");

    // The bypass is the definer function, not a table grant: prove the table is
    // still closed to the same role that just wrote through it.
    const tableGrant = db
      .scalar(`select has_table_privilege('authenticated','public.rcap_packet_credit_consumptions','INSERT')`)
      .trim();
    check(
      tableGrant === "f",
      "the phase-49 bypass must be via SECURITY DEFINER, not a direct table grant"
    );
    console.log("  ok  a browser role moved sponsored credit while holding no table privilege");

    // A3. The charged partner is whatever the caller names. consume_rcap_packet_credit
    // never relates the render job to the partner it bills, and in this state
    // packet_render_jobs has no partner column at all (phase 50 adds it), so ONE
    // job id — the participant's own, visible in /api/rcap/packets/<jobId>/download —
    // is sufficient to bill any partner whose slug is public.
    db.sql(`insert into partner_records (id, partner_slug) values ('${PARTNER_B}','fulton-county')`);
    db.sql(`insert into rcap_partner_packet_allocation (partner_slug, packets_allowed) values ('fulton-county', 2)`);
    const otherTenant = db
      .scalar(
        `set role anon; select row_to_json(t)::text from (select * from consume_rcap_packet_credit('fulton-county','matter-x','${jobId}')) t`
      )
      .replace(/^SET\s*/, "")
      .trim();
    check(
      otherTenant.includes('"ok":true'),
      `the same job id must bill an unrelated partner in this state (got ${otherTenant})`
    );
    const unrelatedJobColumn = db
      .scalar(
        `select count(*) from information_schema.columns where table_schema='public' and table_name='packet_render_jobs' and column_name='partner_id'`
      )
      .trim();
    check(
      unrelatedJobColumn === "0",
      "phase 49 has no partner column on the job, which is why the billed partner is purely caller-supplied"
    );
    console.log("  ok  one job id bills any partner: the function never relates the job to the partner it charges");

    // A4. anon can also steal work off the queue.
    const secondHash = createHash("sha256").update("phase49-alone-2").digest("hex");
    db.sql(
      `insert into packet_render_jobs (packet_id, route_id, renderer_kind, source_sha256, profile_id, profile_version, input_hash)
       values ('${packetId}','MS:y','packet_document_v1','${SHA("a")}','MS','1.3.0','${secondHash}')`
    );
    const stolen = db
      .scalar(`set role anon; select claimed_by from claim_packet_render_job('attacker-worker', array['packet_document_v1'])`)
      .replace(/^SET\s*/, "")
      .trim();
    check(stolen === "attacker-worker", "anon must be able to claim a queued job in this state (documented hazard)");
    console.log("  ok  anon claimed a queued render job");
  } catch (error) {
    failures.push(`section A threw: ${String(error.stderr ?? error.message).split("\n").slice(0, 3).join(" | ")}`);
  } finally {
    db.stop();
  }
}

// =============================================================================
// B. The safe state: phase 49 + phase 50, applied in one window.
// =============================================================================

console.log("\nB. phase 49 + 50 — every browser-role path closed");
{
  const db = startEphemeralPg();
  try {
    seedCluster(db);
    db.applyFile(path.join(rootDir, PHASE_49));
    db.applyFile(path.join(rootDir, PHASE_50));

    // B1. The two vulnerable phase-49 functions are gone, not merely revoked.
    const survivors = db
      .scalar(
        `select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
         where n.nspname='public' and p.proname in ('consume_rcap_packet_credit')`
      )
      .trim();
    check(survivors === "0", "phase 50 must drop consume_rcap_packet_credit outright");

    // B2. No packet mutation function is executable by a browser role.
    const executable = db
      .sql(
        `select p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')'
         from pg_proc p join pg_namespace n on n.oid = p.pronamespace
         where n.nspname='public'
           and p.prokind = 'f'
           and pg_get_function_result(p.oid) <> 'trigger'
           and (p.proname like '%packet%' or p.proname like '%render_job%')
           and (has_function_privilege('anon', p.oid, 'EXECUTE')
                or has_function_privilege('authenticated', p.oid, 'EXECUTE'))
         order by 1`
      )
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    // Only non-mutating helpers may remain reachable, and only because they
    // cannot do anything without a privilege the browser roles lack.
    const ALLOWED_INERT = new Set([
      "rcap_packet_mutation_authority()",
      "assert_packet_render_job_fencing(p_job packet_render_jobs, p_fencing_token uuid)"
    ]);
    const unexpected = executable.filter((signature) => !ALLOWED_INERT.has(signature));
    check(
      unexpected.length === 0,
      `no packet mutation function may be executable by a browser role, found: ${unexpected.join(", ")}`
    );
    console.log("  ok  no packet mutation function is executable by anon or authenticated");

    // B3. The inert survivors really are inert.
    const fencingAttempt = db.sqlExpectError(
      `set role anon; select public.assert_packet_render_job_fencing(j.*, gen_random_uuid()) from public.packet_render_jobs j`
    );
    check(
      /permission denied for table packet_render_jobs/.test(fencingAttempt),
      "the fencing assertion must be unreachable without a table privilege"
    );
    for (const triggerFn of [
      "guard_packet_credit_ledger",
      "guard_packet_render_job_insert",
      "guard_packet_render_job_transition",
      "guard_packet_delivery_events",
      "guard_packet_render_job_delete"
    ]) {
      const attempt = db.sqlExpectError(`set role authenticated; select public.${triggerFn}()`);
      check(
        /trigger functions can only be called as triggers/.test(attempt),
        `${triggerFn} must be callable only as a trigger`
      );
    }
    console.log("  ok  every PUBLIC-executable survivor is a trigger function or needs a withheld privilege");

    // B4. The GUC forgery does not help a browser role reach a protected table.
    for (const role of ["anon", "authenticated"]) {
      const forged = db.sqlExpectError(
        `set role ${role}; set rcap.packet_mutation_authority = 'finalize_packet_render_job'; ` +
          `insert into packet_credit_ledger (render_job_id, event_type, consumption_unit_hash) ` +
          `values (gen_random_uuid(),'consumed','${SHA("f")}')`
      );
      check(/permission denied/.test(forged), `${role} must be denied a forged ledger append`);
    }
    console.log("  ok  a forged authority GUC buys a browser role nothing");
  } catch (error) {
    failures.push(`section B threw: ${String(error.stderr ?? error.message).split("\n").slice(0, 3).join(" | ")}`);
  } finally {
    db.stop();
  }
}

// =============================================================================
// C. The apply-order control must stay written down.
// =============================================================================

console.log("\nC. the deployment control that contains section A");
{
  const advisory = fs.existsSync(path.join(rootDir, ADVISORY)) ? read(ADVISORY) : "";
  check(advisory.length > 0, `${ADVISORY} must exist: it is the only control for the section-A hazard`);
  check(
    advisory.includes("consume_rcap_packet_credit") && advisory.includes("claim_packet_render_job"),
    `${ADVISORY} must name both functions that carry the default PUBLIC grant`
  );
  check(
    /never be applied[^.]*without phase 50|same authorized window|same window/i.test(advisory),
    `${ADVISORY} must state the co-application requirement`
  );
  check(
    advisory.includes("revoke all on function public.consume_rcap_packet_credit"),
    `${ADVISORY} must carry the exact REVOKE for an operator who must apply phase 49 alone`
  );

  // The phase-49 file is hash-pinned by its authorization; this verifier must
  // never be the reason someone edits it.
  check(
    !/revoke\s+(all|execute)/i.test(read(PHASE_49)),
    "phase 49 is hash-pinned and unrevoked by design; if it gained a REVOKE its authorization was voided and must be re-issued"
  );
  console.log("  ok  the apply-order advisory is present, specific, and the pinned migration is untouched");
}

// =============================================================================
// D. The phase-50 private artifact bucket (previously unasserted anywhere).
// =============================================================================

console.log("\nD. the private packet-artifact bucket");
{
  const db = startEphemeralPg();
  try {
    seedCluster(db, { withStorage: true });
    db.applyFile(path.join(rootDir, PHASE_49));
    db.applyFile(path.join(rootDir, PHASE_50));

    const bucket = db
      .scalar(
        `select public::text || '|' || file_size_limit::text || '|' || array_to_string(allowed_mime_types, ',')
         from storage.buckets where id = 'rcap-packet-artifacts-private'`
      )
      .trim();
    const [isPublic, sizeLimit, mimeTypes] = bucket.split("|");
    check(isPublic === "false", "the packet artifact bucket must not be public");
    check(Number(sizeLimit) > 0, "the packet artifact bucket must carry a size limit");
    check(mimeTypes === "application/pdf", `the bucket must accept PDF only, got ${mimeTypes}`);
    check(!mimeTypes.includes("svg"), "the bucket must never accept a script-carrying SVG");

    const policies = db.scalar(`select count(*) from pg_policies where schemaname='storage'`).trim();
    check(policies === "0", `storage must carry no object policy admitting a browser role, found ${policies}`);
    console.log("  ok  bucket is private, PDF-only, size-bounded, and carries no storage policy");

    // With Supabase's real storage grants in place, RLS-with-no-policy is the
    // only control. Prove it holds for every operation and both browser roles.
    db.sql(
      `insert into storage.objects (bucket_id, name) values ('rcap-packet-artifacts-private','partners/a/job/${SHA("c")}.pdf')`
    );
    for (const role of ["anon", "authenticated"]) {
      const visible = db
        .scalar(`set role ${role}; select count(*) from storage.objects where bucket_id='rcap-packet-artifacts-private'`)
        .replace(/^SET\s*/, "")
        .trim();
      check(visible === "0", `${role} must not list any object in the packet artifact bucket`);

      const inserted = db.sqlExpectError(
        `set role ${role}; insert into storage.objects (bucket_id, name) values ('rcap-packet-artifacts-private','attacker-${role}.pdf')`
      );
      check(/row-level security|permission denied/i.test(inserted), `${role} must not insert an object`);

      for (const [statement, label] of [
        [`update storage.objects set name = name || '.hijacked' where bucket_id='rcap-packet-artifacts-private'`, "update"],
        [`delete from storage.objects where bucket_id='rcap-packet-artifacts-private'`, "delete"]
      ]) {
        const affected = db
          .scalar(`set role ${role}; with c as (${statement} returning 1) select count(*) from c`)
          .replace(/^SET\s*/, "")
          .trim();
        check(affected === "0", `${role} must ${label} zero objects in the packet artifact bucket`);
      }
    }
    console.log("  ok  neither browser role can read, write, or delete a packet artifact");
  } catch (error) {
    failures.push(`section D threw: ${String(error.stderr ?? error.message).split("\n").slice(0, 3).join(" | ")}`);
  } finally {
    db.stop();
  }
}

// =============================================================================
// E. Residual trust gaps in the 49+50 state, with their only control pinned.
// =============================================================================

console.log("\nE. residual trust gaps and the controls that compensate for them");
{
  const db = startEphemeralPg();
  try {
    seedCluster(db);
    db.applyFile(path.join(rootDir, PHASE_49));
    db.applyFile(path.join(rootDir, PHASE_50));

    db.sql(`insert into partner_records (id, partner_slug) values ('${PARTNER_A}','partner-a'), ('${PARTNER_B}','partner-b')`);
    db.sql(
      `insert into rcap_persons (id, partner_slug, match_key) values ('${PERSON_A}','partner-a','a'), ('${PERSON_B}','partner-b','b')`
    );
    db.sql(`insert into partner_packet_entitlement (partner_id, packet_cap) values ('${PARTNER_A}', 5), ('${PARTNER_B}', 5)`);

    // E1. Incoherent accounting identity: partner A + partner B's person.
    const packetId = newPacket(db);
    const inputHash = createHash("sha256").update("cross-tenant").digest("hex");
    const jobId = db.scalar(
      `select id from enqueue_packet_render_job('${packetId}','MS:x','packet_document_v1','1.0.0',null,'MS','1.3.0','${inputHash}',null,'${PARTNER_A}','${PERSON_B}','33333333-3333-3333-3333-333333333333',5)`
    );
    const claim = db.json(
      `select row_to_json(t) from (select id, fencing_token from claim_packet_render_job('w1', null, 600)) t`
    );
    db.scalar(`select start_packet_render('${jobId}','${claim.fencing_token}')`);
    db.scalar(`select start_packet_validation('${jobId}','${claim.fencing_token}')`);
    db.json(
      `select row_to_json(t) from (select * from finalize_packet_render_job('${jobId}','${claim.fencing_token}','p/${jobId}/${SHA("c")}.pdf','${SHA("c")}','${SHA("d")}','${SHA("c")}','${SHA("d")}',100,3,'sha256:x')) t`
    );
    const charged = db
      .scalar(`select partner_id::text || '|' || person_id::text from packet_credit_ledger where render_job_id='${jobId}'`)
      .trim();
    check(
      charged === `${PARTNER_A}|${PERSON_B}`,
      `documented gap changed shape: expected the ledger to charge partner A for partner B's person, got ${charged}`
    );

    // The linkage a database-level fix would use must still be available.
    const linkage = db
      .scalar(
        `select count(*) from information_schema.columns where table_schema='public' and table_name='rcap_persons' and column_name='partner_slug'`
      )
      .trim();
    check(linkage === "1", "rcap_persons.partner_slug must remain available as the coherence check a fix would use");

    // The only compensating control: enqueue is not reachable by a browser role.
    for (const role of ["anon", "authenticated"]) {
      const denied = db.sqlExpectError(
        `set role ${role}; select enqueue_packet_render_job('${packetId}','MS:z','packet_document_v1','1.0.0',null,'MS','1.3.0','${SHA("9")}',null,'${PARTNER_A}','${PERSON_B}',gen_random_uuid(),5)`
      );
      check(/permission denied/.test(denied), `${role} must not reach enqueue_packet_render_job`);
    }
    console.log("  ok  incoherent accounting identity reproduces; enqueue stays server-only (its only control)");

    // E2. Delivery events trust their caller for job ownership and actor id.
    const forgedActor = "99999999-9999-9999-9999-999999999999";
    const forged = db
      .scalar(
        `set role rcap_packet_delivery; select record_packet_delivery_event('${jobId}','transmission_completed','${forgedActor}','{"surface":"forged"}'::jsonb) is not null`
      )
      .replace(/^SET\s*/, "")
      .trim();
    check(forged === "t", "documented gap changed: the delivery credential could not record an event for this job");
    const statusAfter = db.scalar(`select status from packet_render_jobs where id='${jobId}'`).trim();
    check(statusAfter === "delivered", "the delivery credential flipped the job to delivered without any ownership check");
    const recordedActor = db
      .scalar(`select actor_user_id::text from packet_delivery_events where render_job_id='${jobId}' order by created_at desc limit 1`)
      .trim();
    check(recordedActor === forgedActor, "the delivery credential's supplied actor id is recorded unverified");

    // It must remain unable to read the job row or the artifact location.
    const readAttempt = db.sqlExpectError(
      `set role rcap_packet_delivery; select output_storage_path from packet_render_jobs where id='${jobId}'`
    );
    check(
      /permission denied for table packet_render_jobs/.test(readAttempt),
      "the delivery credential must never read the artifact location"
    );
    console.log("  ok  delivery-event forgery reproduces and stays non-exfiltrating");

    // The only ownership control lives in the application. Pin it.
    const delivery = read("src/lib/rcap/render/packet-delivery.ts");
    check(
      delivery.includes("userOwnsBriefcaseItem(input.userId, job.briefcaseItemId)"),
      "packet-delivery.ts must keep the briefcase ownership check: it is the ONLY ownership control for delivery"
    );
    check(
      /if \(!job\.briefcaseItemId\)[\s\S]{0,200}unauthorized/.test(delivery),
      "a job without a briefcase item must be refused before any ownership lookup"
    );
    check(
      delivery.includes("if (!isDeliverable(job))"),
      "packet-delivery.ts must keep the accounting-eligibility gate ahead of any storage read"
    );
    check(
      delivery.includes("sha256(bytes) !== job.outputSha256"),
      "packet-delivery.ts must re-verify the stored bytes: storage is tamper-evident, not immutable"
    );
    console.log("  ok  the application-layer ownership and integrity controls are present and pinned");
  } catch (error) {
    failures.push(`section E threw: ${String(error.stderr ?? error.message).split("\n").slice(0, 3).join(" | ")}`);
  } finally {
    db.stop();
  }
}

if (failures.length > 0) {
  console.error("\nverify-rcap-runtime-credential-boundary FAILED");
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log(
  `\nverify-rcap-runtime-credential-boundary passed: ${checks} assertions.\n` +
    "Phase 49 alone is exploitable by a browser role and phase 50 closes it, so apply order is a security control;\n" +
    "the private artifact bucket denies both browser roles on every operation; and the two residual trust gaps\n" +
    "(incoherent accounting identity, unverified delivery actor) reproduce with their only controls pinned."
);
