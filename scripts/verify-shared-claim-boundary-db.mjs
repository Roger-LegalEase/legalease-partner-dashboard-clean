// Database proof for the shared pending-result and atomic claim boundary.
//
// Contract §7 and §15, ADR-0002. This runs the real migration against a real
// throwaway PostgreSQL 16 cluster and measures effective behaviour: locking,
// uniqueness, idempotency, rollback, grants and RLS. It deliberately does not
// read the migration and assert on its text -- a static string check is what let
// PIN-05's inert column REVOKE look like a fix.
//
// Usage: node scripts/verify-shared-claim-boundary-db.mjs

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ephemeralPgAvailable, startEphemeralPg } from "./lib/rcap-ephemeral-pg.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIGRATION = "supabase/migrations/20260828100000_shared_pending_result_and_atomic_claim.sql";

if (!ephemeralPgAvailable()) {
  console.error("Shared claim boundary DB proof requires PostgreSQL 16 binaries (initdb, pg_ctl).");
  process.exit(2);
}

const ids = {
  userA: "10000000-0000-4000-8000-00000000000a",
  userB: "10000000-0000-4000-8000-00000000000b",
  sessionA: "20000000-0000-4000-8000-00000000000a"
};
const legacyPendingId = "30000000-0000-4000-8000-0000000000e1";

const failures = [];
function check(condition, label, detail = "") {
  if (condition) {
    console.log(`  ok   ${label}`);
  } else {
    failures.push(detail ? `${label} -- ${detail}` : label);
    console.log(`  FAIL ${label}${detail ? ` -- ${detail}` : ""}`);
  }
}

const token = (suffix) => `claim_token_fixture_value_0123456789_${suffix}`;
const hashOf = (value) => createHash("sha256").update(value, "utf8").digest("hex");

const db = startEphemeralPg();
try {
  db.sql(baselineSchema());
  db.applyFile(path.join(root, MIGRATION));
  console.log(`Applied ${MIGRATION} to an isolated PostgreSQL cluster.\n`);

  section("1. Schema");
  const pendingColumns = db.json(`
    select jsonb_object_agg(column_name, is_nullable)
      from information_schema.columns
     where table_schema = 'public' and table_name = 'consumer_pending_screening_results'
  `);
  for (const column of [
    "pending_id", "anonymous_session_id", "screening_correlation_id", "claim_token_hash",
    "status", "claimed_matter_id", "claimed_user_id", "claimed_at", "expires_at", "created_at",
    "locale", "partner_slug", "program_id", "event_id", "campaign_name", "consent_grant_id",
    "candidate_route_context", "product", "jurisdiction", "screening_answers", "profile_version"
  ]) {
    check(column in pendingColumns, `pending result carries ${column}`);
  }
  check(!("matter_id" in pendingColumns), "pending result no longer names a column matter_id");
  check(!("source_session_id" in pendingColumns), "pending result no longer names a column source_session_id");
  check(!("pending_token_hash" in pendingColumns), "the dead pending_token_hash column is gone");

  const matterColumns = db.json(`
    select jsonb_object_agg(column_name, is_nullable)
      from information_schema.columns
     where table_schema = 'public' and table_name = 'consumer_briefcase_items'
  `);
  check("source_pending_result_id" in matterColumns, "canonical matter carries source_pending_result_id");
  check(matterColumns.user_id === "NO", "canonical matter owner is NOT NULL");

  check(
    db.scalar(`select count(*)::int from pg_class where relname = 'participant_claim_events'`) === "1",
    "append-only claim audit table exists"
  );

  section("2. Pre-existing pending results are revoked, not left claimable by id");
  check(
    db.scalar(`select status from public.consumer_pending_screening_results where pending_id = '${legacyPendingId}'`) === "REVOKED",
    "a pending result created before the migration is REVOKED"
  );

  section("3. Uniqueness");
  db.sql(seedPending("30000000-0000-4000-8000-000000000001", hashOf(token("u1"))));
  db.sql(`insert into public.consumer_briefcase_items
            (user_id, item_type, jurisdiction, status, source_pending_result_id)
          values ('${ids.userA}', 'result', 'MS', 'check_saved', '30000000-0000-4000-8000-000000000001')`);
  const duplicate = db.sqlExpectError(`insert into public.consumer_briefcase_items
            (user_id, item_type, jurisdiction, status, source_pending_result_id)
          values ('${ids.userB}', 'result', 'MS', 'check_saved', '30000000-0000-4000-8000-000000000001')`);
  check(/unique|duplicate key/i.test(duplicate), "one pending result cannot produce two matters", duplicate.slice(0, 120));
  db.sql(`insert into public.consumer_briefcase_items (user_id, item_type, jurisdiction, status) values
            ('${ids.userA}', 'result', 'MS', 'check_saved'),
            ('${ids.userA}', 'result', 'IL', 'check_saved')`);
  check(true, "two matters with no pending result coexist (UNIQUE allows repeated NULL)");

  section("4. Valid claim");
  const p2 = "30000000-0000-4000-8000-000000000002";
  db.sql(seedPending(p2, hashOf(token("u2"))));
  const claimed = db.json(`select to_jsonb(t) from public.claim_pending_screening_result(
      '${token("u2")}', '${ids.userA}'::uuid, ${matterPayload()}, 'req-1') t`);
  check(claimed.outcome === "claimed", "a valid token claims the pending result", JSON.stringify(claimed));
  check(Boolean(claimed.matter_id), "the claim returns an exact matter id");
  const claimedRow = db.json(`select to_jsonb(t) from (select status, claimed_user_id, claimed_matter_id
      from public.consumer_pending_screening_results where pending_id = '${p2}') t`);
  check(claimedRow.status === "CLAIMED", "the pending result is marked CLAIMED");
  check(claimedRow.claimed_user_id === ids.userA, "the claim records the claiming participant");
  check(claimedRow.claimed_matter_id === claimed.matter_id, "the pending result points at the exact matter");
  check(
    db.scalar(`select user_id from public.consumer_briefcase_items where id = '${claimed.matter_id}'`) === ids.userA,
    "the participant owns the created matter"
  );
  check(
    db.scalar(`select count(*)::int from public.participant_claim_events
                where pending_result_id = '${p2}' and event = 'claim_succeeded'`) === "1",
    "the claim wrote exactly one append-only success event"
  );

  section("5. Token rejection");
  const p3 = "30000000-0000-4000-8000-000000000003";
  db.sql(seedPending(p3, hashOf(token("u3"))));
  const wrong = db.json(`select to_jsonb(t) from public.claim_pending_screening_result(
      '${token("wrong")}', '${ids.userA}'::uuid, ${matterPayload()}, 'req-2') t`);
  check(wrong.outcome === "denied_invalid_token", "a wrong token is denied", JSON.stringify(wrong));
  check(wrong.matter_id === null, "a wrong token creates no matter");
  check(
    db.scalar(`select status from public.consumer_pending_screening_results where pending_id = '${p3}'`) === "PENDING",
    "a wrong token leaves the pending result claimable by its real holder"
  );
  // The denial is audited against the request, not against a pending result: a
  // wrong token cannot say which result it was aimed at, and guessing would put
  // a false link in the audit trail.
  check(
    db.scalar(`select count(*)::int from public.participant_claim_events
                where request_id = 'req-2' and event = 'claim_denied_invalid_token'`) === "1",
    "the denial survives its own transaction as an audit row"
  );
  check(
    db.scalar(`select count(*)::int from public.participant_claim_events
                where request_id = 'req-2' and pending_result_id is not null`) === "0",
    "an invalid-token denial does not guess which pending result was targeted"
  );

  // A token that matches nothing and a token that is simply wrong give the same
  // answer on purpose: neither reveals whether a pending result exists.
  const unknown = db.json(`select to_jsonb(t) from public.claim_pending_screening_result(
      '${token("matches_nothing")}', '${ids.userA}'::uuid, ${matterPayload()}, 'req-3') t`);
  check(unknown.outcome === "denied_invalid_token", "a token matching no pending result is denied identically", JSON.stringify(unknown));
  check(unknown.matter_id === null, "an unmatched token creates no matter");

  section("6. Expiry and revocation");
  const p4 = "30000000-0000-4000-8000-000000000004";
  db.sql(seedPending(p4, hashOf(token("u4")), { expiresAt: "now() - interval '1 minute'" }));
  const expired = db.json(`select to_jsonb(t) from public.claim_pending_screening_result(
      '${token("u4")}', '${ids.userA}'::uuid, ${matterPayload()}, 'req-4') t`);
  check(expired.outcome === "denied_expired", "an expired pending result is denied", JSON.stringify(expired));
  check(
    db.scalar(`select status from public.consumer_pending_screening_results where pending_id = '${p4}'`) === "EXPIRED",
    "an expired pending result is moved to EXPIRED"
  );

  const p5 = "30000000-0000-4000-8000-000000000005";
  db.sql(seedPending(p5, hashOf(token("u5"))));
  db.sql(`update public.consumer_pending_screening_results
             set status = 'REVOKED', revoked_at = now() where pending_id = '${p5}'`);
  const revoked = db.json(`select to_jsonb(t) from public.claim_pending_screening_result(
      '${token("u5")}', '${ids.userA}'::uuid, ${matterPayload()}, 'req-5') t`);
  check(revoked.outcome === "denied_revoked", "a revoked pending result is denied");

  section("7. Replay");
  const replay = db.json(`select to_jsonb(t) from public.claim_pending_screening_result(
      '${token("u2")}', '${ids.userA}'::uuid, ${matterPayload()}, 'req-6') t`);
  check(replay.outcome === "idempotent_replay", "the same participant replaying gets an idempotent replay");
  check(replay.matter_id === claimed.matter_id, "the replay returns the same matter, not a second one");
  check(
    db.scalar(`select count(*)::int from public.consumer_briefcase_items where source_pending_result_id = '${p2}'`) === "1",
    "replay created no second matter"
  );

  const otherUser = db.json(`select to_jsonb(t) from public.claim_pending_screening_result(
      '${token("u2")}', '${ids.userB}'::uuid, ${matterPayload()}, 'req-7') t`);
  check(otherUser.outcome === "denied_other_user", "a different participant replaying the same token is denied");
  check(otherUser.matter_id === null, "a denied different-user replay reveals no matter id");
  check(
    db.scalar(`select count(*)::int from public.consumer_briefcase_items
                where source_pending_result_id = '${p2}'`) === "1",
    "a denied different-user replay creates no matter"
  );

  section("8. Rollback");
  const p6 = "30000000-0000-4000-8000-000000000006";
  db.sql(seedPending(p6, hashOf(token("u6"))));
  // status is NOT NULL on the matter table; omitting it makes the insert inside
  // the claim function fail, which must take the whole claim down with it.
  const broken = db.sqlExpectError(`select * from public.claim_pending_screening_result(
      '${token("u6")}', '${ids.userA}'::uuid,
      '{"jurisdiction":"MS","item_type":"result"}'::jsonb, 'req-8')`);
  check(/null value in column "status"|violates not-null/i.test(broken), "a failing matter insert raises", broken.slice(0, 140));
  check(
    db.scalar(`select status from public.consumer_pending_screening_results where pending_id = '${p6}'`) === "PENDING",
    "a failed claim does not mark the pending result claimed"
  );
  check(
    db.scalar(`select count(*)::int from public.consumer_briefcase_items where source_pending_result_id = '${p6}'`) === "0",
    "a failed claim creates no matter"
  );
  check(
    db.scalar(`select count(*)::int from public.participant_claim_events where pending_result_id = '${p6}'`) === "0",
    "a failed claim records no success event"
  );

  section("9. The database cannot hold a half-claimed state");
  const halfClaim = db.sqlExpectError(`update public.consumer_pending_screening_results
      set status = 'CLAIMED' where pending_id = '${p6}'`);
  check(/claim_shape/i.test(halfClaim), "CLAIMED without an owner and a matter is rejected", halfClaim.slice(0, 140));
  const orphanMatterLink = db.sqlExpectError(`update public.consumer_pending_screening_results
      set claimed_matter_id = '${claimed.matter_id}' where pending_id = '${p6}'`);
  check(/matter_implies_claimed/i.test(orphanMatterLink), "a matter link without a CLAIMED status is rejected", orphanMatterLink.slice(0, 140));
  const tokenlessPending = db.sqlExpectError(`insert into public.consumer_pending_screening_results
      (pending_id, product, jurisdiction, result_code, summary, expires_at)
      values ('30000000-0000-4000-8000-0000000000aa', 'expungement_ai_dtc', 'MS', 'packet_ready', 's', now() + interval '1 day')`);
  check(/pending_needs_token/i.test(tokenlessPending), "a PENDING row without a token hash is rejected", tokenlessPending.slice(0, 140));

  section("10. Append-only audit");
  const auditUpdate = db.sqlExpectError(`update public.participant_claim_events set event = 'claim_succeeded'`);
  check(/append-only/i.test(auditUpdate), "claim audit rows cannot be updated");
  const auditDelete = db.sqlExpectError(`delete from public.participant_claim_events`);
  check(/append-only/i.test(auditDelete), "claim audit rows cannot be deleted");
  const auditText = db.scalar(`select coalesce(string_agg(detail::text, ' '), '') from public.participant_claim_events`);
  check(!auditText.includes("claim_token_fixture_value"), "no claim token reached the audit table");

  section("11. Grants and RLS");
  const pendingPrivs = db.json(`
    select jsonb_object_agg(grantee || ':' || privilege_type, true)
      from information_schema.role_table_grants
     where table_schema = 'public' and table_name = 'consumer_pending_screening_results'
       and grantee in ('anon', 'authenticated')
  `);
  check(pendingPrivs === null, "anon and authenticated hold no table privilege on the pending result", JSON.stringify(pendingPrivs));
  check(
    db.scalar(`select has_table_privilege('anon', 'public.consumer_pending_screening_results', 'select')`) === "f",
    "anon cannot SELECT the pending result table"
  );
  check(
    db.scalar(`select has_table_privilege('authenticated', 'public.consumer_pending_screening_results', 'select')`) === "f",
    "authenticated cannot SELECT the pending result table"
  );
  for (const column of ["screening_answers", "claim_token_hash", "result_payload"]) {
    check(
      db.scalar(`select has_column_privilege('authenticated', 'public.consumer_pending_screening_results', '${column}', 'select')`) === "f",
      `authenticated cannot read the ${column} column`
    );
  }
  check(
    db.scalar(`select has_table_privilege('service_role', 'public.consumer_pending_screening_results', 'select')`) === "t",
    "service_role retains the access the claim service needs"
  );
  check(
    db.scalar(`select has_table_privilege('anon', 'public.participant_claim_events', 'select')`) === "f",
    "anon cannot read the claim audit"
  );
  check(
    db.scalar(`select relrowsecurity from pg_class where relname = 'participant_claim_events'`) === "t",
    "row-level security is enabled on the claim audit"
  );
  check(
    db.scalar(`select has_function_privilege('anon',
      'public.claim_pending_screening_result(text,uuid,jsonb,text)', 'execute')`) === "f",
    "anon cannot execute the claim function"
  );
  check(
    db.scalar(`select has_function_privilege('authenticated',
      'public.claim_pending_screening_result(text,uuid,jsonb,text)', 'execute')`) === "f",
    "authenticated cannot execute the claim function"
  );
  check(
    db.scalar(`select has_function_privilege('service_role',
      'public.claim_pending_screening_result(text,uuid,jsonb,text)', 'execute')`) === "t",
    "service_role can execute the claim function"
  );
  check(
    db.scalar(`select prosecdef from pg_proc where proname = 'claim_pending_screening_result'`) === "t",
    "the claim function is SECURITY DEFINER"
  );
  check(
    db.scalar(`select proconfig::text from pg_proc where proname = 'claim_pending_screening_result'`).includes("search_path"),
    "the claim function pins its search_path"
  );

  section("12. An unauthenticated caller cannot claim");
  const anonymousClaim = db.sqlExpectError(`select * from public.claim_pending_screening_result(
      '${token("u3")}', null, ${matterPayload()}, 'req-9')`);
  check(/claim_requires_authenticated_participant/.test(anonymousClaim), "a null participant is refused");

  section("13. Concurrency: two claimants, one matter");
  await concurrency(db, check, hashOf, token, ids, matterPayload);
} finally {
  db.stop();
}

console.log("");
if (failures.length > 0) {
  console.error(`Shared claim boundary DB proof failed: ${failures.length} check(s).`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}
console.log("Shared claim boundary DB proof passed against isolated PostgreSQL.");

// ---------------------------------------------------------------------------

function section(title) {
  console.log(`\n${title}`);
}

async function concurrency(db, check, hashOf, token, ids, matterPayload) {
  // Same user, two tabs.
  const pA = "30000000-0000-4000-8000-000000000010";
  db.sql(seedPending(pA, hashOf(token("cc1"))));
  const sameUser = await Promise.all([
    db.sqlAsync(`select outcome from public.claim_pending_screening_result(
      '${token("cc1")}', '${ids.userA}'::uuid, ${matterPayload()}, 'tab-1')`),
    db.sqlAsync(`select outcome from public.claim_pending_screening_result(
      '${token("cc1")}', '${ids.userA}'::uuid, ${matterPayload()}, 'tab-2')`)
  ]);
  check(sameUser.every((run) => run.ok), "two concurrent same-user claims both complete", JSON.stringify(sameUser));
  check(
    db.scalar(`select count(*)::int from public.consumer_briefcase_items where source_pending_result_id = '${pA}'`) === "1",
    "two concurrent same-user claims create exactly one matter"
  );
  const sameUserOutcomes = sameUser.map((run) => run.out).sort();
  check(
    sameUserOutcomes.includes("claimed") && sameUserOutcomes.includes("idempotent_replay"),
    "one concurrent claim wins and the other converges on it",
    JSON.stringify(sameUserOutcomes)
  );

  // Different users, same token.
  const pB = "30000000-0000-4000-8000-000000000011";
  db.sql(seedPending(pB, hashOf(token("cc2"))));
  const twoUsers = await Promise.all([
    db.sqlAsync(`select outcome from public.claim_pending_screening_result(
      '${token("cc2")}', '${ids.userA}'::uuid, ${matterPayload()}, 'race-a')`),
    db.sqlAsync(`select outcome from public.claim_pending_screening_result(
      '${token("cc2")}', '${ids.userB}'::uuid, ${matterPayload()}, 'race-b')`)
  ]);
  check(twoUsers.every((run) => run.ok), "two concurrent different-user claims both complete", JSON.stringify(twoUsers));
  check(
    db.scalar(`select count(*)::int from public.consumer_briefcase_items where source_pending_result_id = '${pB}'`) === "1",
    "two concurrent different-user claims create exactly one matter"
  );
  const outcomes = twoUsers.map((run) => run.out).sort();
  check(
    outcomes.includes("claimed") && outcomes.includes("denied_other_user"),
    "one participant owns it and the other is denied generically",
    JSON.stringify(outcomes)
  );
  const owners = db.scalar(`select count(distinct user_id)::int from public.consumer_briefcase_items
                              where source_pending_result_id = '${pB}'`);
  check(owners === "1", "exactly one owner results from a contested claim");
}

function seedPending(pendingId, tokenHash, options = {}) {
  const expiresAt = options.expiresAt ?? "now() + interval '24 hours'";
  return `insert into public.consumer_pending_screening_results
    (pending_id, claim_token_hash, product, jurisdiction, result_code, summary,
     screening_answers, profile_version, screening_correlation_id, anonymous_session_id,
     locale, partner_slug, expires_at, status)
   values ('${pendingId}', '${tokenHash}', 'expungement_ai_dtc', 'MS', 'packet_ready',
     'A path may be available.', '{"q1":"yes"}'::jsonb, 'v1', 'corr-1', '${ids.sessionA}',
     'en', null, ${expiresAt}, 'PENDING')`;
}

function matterPayload() {
  return `'${JSON.stringify({
    item_type: "result",
    jurisdiction: "MS",
    pathway_label: "Mississippi expungement",
    result_code: "packet_ready",
    packet_type: "official_pdf_overlay",
    payment_allowed: true,
    status: "packet_ready",
    summary_json: { text: "A path may be available." },
    next_steps_json: ["Review your information"],
    artifact_refs_json: {},
    payment_status: "unpaid",
    amount_cents: 5000,
    packet_status: "not_started",
    product: "expungement_ai_dtc"
  })}'::jsonb`;
}

function baselineSchema() {
  // The two real table definitions this migration alters, lifted from
  // supabase/migrations/20260728213131_remote_schema.sql and
  // supabase/phase-38-expungement-pending-screening-results.sql, plus the
  // Supabase roles and the GRANT ALL that PIN-05 proved was the live exposure.
  return `
    create role anon;
    create role authenticated;
    create role service_role bypassrls;
    create schema auth;
    create table auth.users (id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $fn$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $fn$;
    create function auth.role() returns text language sql stable as $fn$
      select coalesce(nullif(current_setting('request.jwt.claim.role', true), ''), 'anon') $fn$;
    insert into auth.users (id) values ('${ids.userA}'), ('${ids.userB}');

    create table public.screening_sessions (session_id uuid primary key);
    insert into public.screening_sessions (session_id) values ('${ids.sessionA}');

    create table public.consumer_briefcase_items (
      id uuid default gen_random_uuid() not null primary key,
      user_id uuid not null references auth.users(id) on delete cascade,
      item_type text not null,
      jurisdiction text not null,
      pathway_label text,
      result_code text,
      packet_type text,
      payment_allowed boolean default false not null,
      status text not null,
      summary_json jsonb default '{}'::jsonb not null,
      next_steps_json jsonb default '[]'::jsonb not null,
      artifact_refs_json jsonb default '{}'::jsonb not null,
      payment_status text default 'not_applicable'::text not null,
      packet_status text default 'not_started'::text not null,
      reminder_at timestamptz,
      source_session_id text,
      created_at timestamptz default now() not null,
      updated_at timestamptz default now() not null,
      payment_provider text,
      checkout_session_id text,
      payment_intent_id text,
      amount_cents integer,
      receipt_url text,
      constraint consumer_briefcase_items_amount_cents_check check ((amount_cents is null) or (amount_cents = 5000)),
      constraint consumer_briefcase_items_item_type_check check (item_type = any (array['eligibility_check','result','packet','wilma_conversation'])),
      constraint consumer_briefcase_items_packet_status_check check (packet_status = any (array['not_started','pending','generating','ready','failed','downloaded'])),
      constraint consumer_briefcase_items_packet_type_check check ((packet_type is null) or (packet_type = any (array['official_pdf_overlay','custom_pleading','legacy_packet','guidance_packet']))),
      constraint consumer_briefcase_items_payment_status_check check (payment_status = any (array['not_applicable','unpaid','paid','refunded'])),
      constraint consumer_briefcase_items_result_code_check check ((result_code is null) or (result_code = any (array['packet_ready','packet_ready_with_caution','needs_more_info','not_yet','guidance_only','not_covered_yet','likely_not_eligible','needs_review','hard_stop']))),
      constraint consumer_briefcase_items_status_check check (status = any (array['check_saved','guidance_saved','packet_ready','needs_info','needs_review','waiting','not_eligible','hard_stop']))
    );
    alter table public.consumer_briefcase_items enable row level security;
    create policy "consumer briefcase select own items" on public.consumer_briefcase_items for select using (auth.uid() = user_id);
    create policy "consumer briefcase insert own items" on public.consumer_briefcase_items for insert with check (auth.uid() = user_id);
    create policy "consumer briefcase update own items" on public.consumer_briefcase_items for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
    create policy "consumer briefcase delete own items" on public.consumer_briefcase_items for delete using (auth.uid() = user_id);

    create table public.consumer_pending_screening_results (
      pending_id uuid primary key default gen_random_uuid(),
      pending_token_hash text unique,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      expires_at timestamptz not null default (now() + interval '24 hours'),
      claimed_at timestamptz,
      claimed_user_id uuid references auth.users(id) on delete set null,
      product text not null default 'expungement_ai_dtc' check (product in ('expungement_ai_dtc','rcap_partner')),
      jurisdiction text not null,
      result_code text not null,
      pathway_label text,
      packet_type text,
      payment_allowed boolean not null default false,
      summary text not null,
      next_steps jsonb not null default '[]'::jsonb,
      screening_answers jsonb not null default '{}'::jsonb,
      result_payload jsonb not null default '{}'::jsonb,
      profile_version text,
      matter_id text,
      packet_plan jsonb not null default '{}'::jsonb,
      source_session_id uuid
    );
    alter table public.consumer_pending_screening_results enable row level security;
    create policy "service role can manage pending screening results"
      on public.consumer_pending_screening_results for all
      using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

    grant usage on schema public to anon, authenticated, service_role;
    grant usage on schema auth to anon, authenticated, service_role;
    grant all on table public.consumer_briefcase_items to anon;
    grant all on table public.consumer_briefcase_items to authenticated;
    grant all on table public.consumer_briefcase_items to service_role;
    grant all on table public.consumer_pending_screening_results to anon;
    grant all on table public.consumer_pending_screening_results to authenticated;
    grant all on table public.consumer_pending_screening_results to service_role;

    insert into public.consumer_pending_screening_results
      (pending_id, product, jurisdiction, result_code, summary, expires_at)
      values ('${legacyPendingId}', 'expungement_ai_dtc', 'MS', 'packet_ready', 'legacy', now() + interval '10 hours');
  `;
}
