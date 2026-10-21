// Database proof for the shared pending-result and atomic claim boundary.
//
// Contract §7 and §15, ADR-0002. This runs the real migration against a real
// throwaway PostgreSQL 16 cluster and measures effective behaviour: locking,
// uniqueness, idempotency, rollback, grants and RLS. It deliberately does not
// read the migration and assert on its text -- a static string check is what let
// PIN-05's inert column REVOKE look like a fix.
//
// Usage: node scripts/verify-shared-claim-boundary-db.mjs

import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ephemeralPgAvailable, startEphemeralPg } from "./lib/rcap-ephemeral-pg.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIGRATION = "supabase/migrations/20260828100000_shared_pending_result_and_atomic_claim.sql";

if (!ephemeralPgAvailable()) {
  console.error("verify-shared-claim-boundary-db requires a local PostgreSQL toolchain.");
  process.exit(1);
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

  section("13. The anonymous boundary holds until the claim");
  {
    const anon = "30000000-0000-4000-8000-00000000000a";
    db.sql(seedPending(anon, hashOf(token("anon"))));
    const before = db.json(`select to_jsonb(t) from (select
        (select count(*)::int from public.consumer_briefcase_items where source_pending_result_id = '${anon}') as matters,
        (select count(*)::int from public.consumer_pending_screening_results
           where pending_id = '${anon}' and claimed_user_id is null and claimed_matter_id is null) as unowned
      ) t`);
    check(before.matters === 0, "an unclaimed preliminary result has produced no matter");
    check(before.unowned === 1, "an unclaimed preliminary result has no owner and no matter link");

    // The pending result is structurally incapable of holding the things a
    // matter holds. This is the anonymous boundary as a schema fact rather than
    // a convention.
    const pendingHas = (column) => column in pendingColumns;
    for (const forbidden of [
      "user_id", "owner_user_id", "briefcase_id", "payment_status", "amount_cents",
      "checkout_session_id", "payment_intent_id", "entitlement_id", "artifact_id",
      "render_job_id", "verification_snapshot", "upload_id"
    ]) {
      check(!pendingHas(forbidden), `a pending result carries no ${forbidden}`);
    }
    check(
      db.scalar(`select count(*)::int from information_schema.columns
                   where table_schema = 'public' and table_name = 'consumer_pending_screening_results'
                     and column_name like '%packet_status%'`) === "0",
      "a pending result carries no packet status"
    );
  }

  section("14. RCAP: attribution travels, ownership does not");
  {
    const partnerPending = "30000000-0000-4000-8000-00000000000b";
    db.sql(`insert into public.consumer_pending_screening_results
      (pending_id, claim_token_hash, product, jurisdiction, result_code, summary,
       screening_answers, profile_version, screening_correlation_id, anonymous_session_id,
       locale, partner_slug, program_id, event_id, campaign_name, access_code_id, consent_grant_id,
       expires_at, status)
     values ('${partnerPending}', '${hashOf(token("rcap"))}', 'rcap_partner', 'MS', 'packet_ready',
       'A path may be available.', '{"q1":"yes"}'::jsonb, 'v1', 'corr-2', '${ids.sessionA}',
       'es', 'we-must-vote', 'record-clearing', '40000000-0000-4000-8000-000000000001',
       'fall-drive', '50000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000001',
       now() + interval '24 hours', 'PENDING')`);

    const partnerMatter = `'${JSON.stringify({
      item_type: "result",
      jurisdiction: "MS",
      result_code: "packet_ready",
      payment_allowed: false,
      status: "packet_ready",
      summary_json: { text: "A path may be available." },
      next_steps_json: [],
      artifact_refs_json: {
        attribution: {
          product: "rcap_partner",
          partnerSlug: "we-must-vote",
          programId: "record-clearing",
          eventId: "40000000-0000-4000-8000-000000000001",
          campaignName: "fall-drive",
          accessCodeId: "50000000-0000-4000-8000-000000000001",
          consentGrantId: "60000000-0000-4000-8000-000000000001",
          locale: "es"
        }
      },
      payment_status: "not_applicable",
      packet_status: "not_started",
      product: "rcap_partner"
    })}'::jsonb`;

    const rcapClaim = db.json(`select to_jsonb(t) from public.claim_pending_screening_result(
        '${token("rcap")}', '${ids.userA}'::uuid, ${partnerMatter}, 'rcap-1') t`);
    check(rcapClaim.outcome === "claimed", "a sponsored preliminary result claims like any other", JSON.stringify(rcapClaim));

    const matter = db.json(`select to_jsonb(t) from (select user_id, payment_allowed, payment_status,
        artifact_refs_json -> 'attribution' as attribution
      from public.consumer_briefcase_items where id = '${rcapClaim.matter_id}') t`);
    check(matter.user_id === ids.userA, "the participant owns the sponsored matter");
    check(matter.attribution?.partnerSlug === "we-must-vote", "partner attribution reached the matter");
    check(matter.attribution?.eventId === "40000000-0000-4000-8000-000000000001", "event attribution reached the matter");
    check(matter.attribution?.campaignName === "fall-drive", "campaign attribution reached the matter");
    check(matter.attribution?.consentGrantId === "60000000-0000-4000-8000-000000000001", "the consent reference reached the matter");
    check(matter.attribution?.locale === "es", "locale reached the matter");
    check(matter.payment_allowed === false && matter.payment_status === "not_applicable",
      "a sponsored matter carries no consumer payment posture");

    // Attribution is a record of who sponsored the work. It is not an owner, and
    // there is nowhere on the matter for a partner to become one.
    check(
      db.scalar(`select count(*)::int from information_schema.columns
                   where table_schema = 'public' and table_name = 'consumer_briefcase_items'
                     and column_name in ('partner_slug', 'partner_id', 'owner_partner_slug')`) === "0",
      "the canonical matter has no partner-ownership column at all"
    );

    const audit = db.json(`select to_jsonb(t) from (select partner_slug, event_id, actor_user_id
      from public.participant_claim_events
      where pending_result_id = '${partnerPending}' and event = 'claim_succeeded') t`);
    check(audit.partner_slug === "we-must-vote" && audit.event_id === "40000000-0000-4000-8000-000000000001",
      "the claim audit records which partner and event the claim belonged to");
    check(audit.actor_user_id === ids.userA, "the claim audit records the participant, not the partner");

    // Two partners, one participant: two matters, one owner, no crossing.
    const secondPartner = "30000000-0000-4000-8000-00000000000c";
    db.sql(`insert into public.consumer_pending_screening_results
      (pending_id, claim_token_hash, product, jurisdiction, result_code, summary,
       screening_answers, profile_version, screening_correlation_id, partner_slug, expires_at, status)
     values ('${secondPartner}', '${hashOf(token("rcap2"))}', 'rcap_partner', 'IL', 'guidance_only',
       'Next steps.', '{}'::jsonb, 'v1', 'corr-3', 'other-partner', now() + interval '24 hours', 'PENDING')`);
    const second = db.json(`select to_jsonb(t) from public.claim_pending_screening_result(
        '${token("rcap2")}', '${ids.userA}'::uuid,
        '{"item_type":"result","jurisdiction":"IL","status":"guidance_saved","result_code":"guidance_only","payment_allowed":false,"product":"rcap_partner"}'::jsonb,
        'rcap-2') t`);
    check(second.outcome === "claimed", "a second partner's result claims independently");
    check(second.matter_id !== rcapClaim.matter_id, "each partner's result produces its own matter");
    check(
      db.scalar(`select count(distinct user_id)::int from public.consumer_briefcase_items
                   where id in ('${rcapClaim.matter_id}', '${second.matter_id}')`) === "1",
      "both matters have the same single participant owner"
    );

    // A pending result attributed to one partner cannot be claimed into another
    // product's posture: the product is read from the stored row, not the caller.
    const mismatched = db.json(`select to_jsonb(t) from public.claim_pending_screening_result(
        '${token("u1")}', '${ids.userB}'::uuid,
        '{"item_type":"result","jurisdiction":"MS","status":"packet_ready","result_code":"packet_ready","payment_allowed":true,"product":"rcap_partner"}'::jsonb,
        'mismatch-1') t`);
    check(mismatched.outcome === "denied_product_mismatch",
      "a caller cannot claim a DTC result into a sponsored posture", JSON.stringify(mismatched));
    check(
      db.scalar(`select count(*)::int from public.consumer_briefcase_items
                   where source_pending_result_id = '30000000-0000-4000-8000-000000000001'
                     and user_id = '${ids.userB}'`) === "0",
      "a denied product mismatch creates no matter"
    );
  }

  section("15. Ownership denials are measured, not declared");
  {
    // Section 17 reads the policies production declares. Declaring a policy and
    // enforcing it are different facts: a permissive policy, a missing GRANT
    // boundary, or RLS left unforced for the owner all leave the declaration
    // intact and the denial gone. So these run as the actual Supabase roles
    // against the matter claimed in section 4 and measure what each one sees.
    //
    // The SET statements share the connection with the query, so only the last
    // line of psql output is the answer; taking the whole buffer would compare
    // against "SET\nSET\n1" and pass or fail for the wrong reason.
    const asRole = (role, subject, query) => {
      const out = db.sql(
        `set role ${role}; `
        + `set request.jwt.claim.sub = '${subject ?? ""}'; `
        + query
      ).trim().split("\n");
      return out[out.length - 1].trim();
    };

    check(
      asRole("authenticated", ids.userA,
        `select count(*)::int from public.consumer_briefcase_items where id = '${claimed.matter_id}'`) === "1",
      "the owning participant can read their own matter"
    );
    check(
      asRole("authenticated", ids.userB,
        `select count(*)::int from public.consumer_briefcase_items where id = '${claimed.matter_id}'`) === "0",
      "a different authenticated participant cannot read that matter"
    );
    check(
      asRole("authenticated", ids.userB,
        `select count(*)::int from public.consumer_briefcase_items`) === "0",
      "a participant with no matters of their own sees an empty Briefcase, not somebody else's"
    );
    check(
      asRole("anon", null,
        `select count(*)::int from public.consumer_briefcase_items`) === "0",
      "an anonymous caller sees no matter at all"
    );

    // A denial that only covers reads is not ownership. These are the writes
    // that would let one participant take or corrupt another's matter. The
    // takeover UPDATE does not error -- row level security filters it to zero
    // rows -- so the proof is that it changed nothing.
    const takeover = asRole("authenticated", ids.userB,
      `update public.consumer_briefcase_items set user_id = '${ids.userB}'`
      + ` where id = '${claimed.matter_id}'`);
    check(takeover === "UPDATE 0", "a takeover UPDATE by another participant matches no row", takeover);
    check(
      db.scalar(`select user_id from public.consumer_briefcase_items where id = '${claimed.matter_id}'`) === ids.userA,
      "the matter still belongs to the participant who claimed it"
    );
    const corrupt = asRole("authenticated", ids.userB,
      `update public.consumer_briefcase_items set status = 'hard_stop'`
      + ` where id = '${claimed.matter_id}'`);
    check(corrupt === "UPDATE 0", "another participant cannot edit the matter either", corrupt);

    const forgedInsert = db.sqlExpectError(
      `set role authenticated; set request.jwt.claim.sub = '${ids.userB}';`
      + ` insert into public.consumer_briefcase_items (user_id, item_type, jurisdiction, status)`
      + ` values ('${ids.userA}', 'result', 'MS', 'check_saved')`
    );
    check(/row-level security/i.test(forgedInsert),
      "a participant cannot create a matter owned by somebody else", forgedInsert.slice(0, 140));
  }

  section("16. Concurrency: two claimants, one matter");
  await concurrency(db, check, hashOf, token, ids, matterPayload);

  section("17. The fixture matches the schema it stands in for");
  {
    // Everything above measures behaviour against baselineSchema(), which is
    // hand-transcribed from the committed production migrations. That makes the
    // ownership results only as trustworthy as the transcription: if production
    // ever stopped declaring user_id NOT NULL, or dropped an owner-scoped
    // policy, every check here would keep passing against a fixture that still
    // did. "Enforced in the database rather than only in the application" has to
    // mean the real database, so the two are compared rather than assumed.
    const productionSchema = fs.readFileSync(
      path.join(root, "supabase/migrations/20260728213131_remote_schema.sql"), "utf8"
    );
    const matterTable = productionSchema.slice(
      productionSchema.indexOf('CREATE TABLE IF NOT EXISTS "public"."consumer_briefcase_items"')
    );
    const matterDefinition = matterTable.slice(0, matterTable.indexOf(");"));

    check(
      /"user_id"\s+"uuid"\s+NOT NULL/.test(matterDefinition),
      "the production matter table declares user_id NOT NULL"
    );
    check(
      matterColumns.user_id === "NO",
      "the fixture agrees with production that the matter owner is NOT NULL"
    );
    check(
      productionSchema.includes('ALTER TABLE "public"."consumer_briefcase_items" ENABLE ROW LEVEL SECURITY'),
      "the production matter table has row level security enabled"
    );
    for (const [operation, policy] of [
      ["SELECT", 'FOR SELECT USING (("auth"."uid"() = "user_id"))'],
      ["INSERT", 'FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"))'],
      ["UPDATE", 'FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"))'],
      ["DELETE", 'FOR DELETE USING (("auth"."uid"() = "user_id"))']
    ]) {
      check(
        productionSchema.includes(`ON "public"."consumer_briefcase_items" ${policy}`),
        `production scopes matter ${operation} to the owning participant`
      );
    }
  }

  section("18. The conflict path re-checks ownership");
  {
    // ON CONFLICT DO NOTHING means the claimant that loses the insert race
    // re-reads the row the winner created. Section 7 never reaches that path,
    // because an already-CLAIMED pending result is refused earlier; section 15
    // reaches it only when the scheduler happens to interleave that way. This
    // section constructs the state directly: a pending result still PENDING
    // whose matter already exists and belongs to somebody else, which is what a
    // claim that slipped the row lock sees.
    //
    // Without the ownership re-check the loser is handed the winner's matter as
    // its own successful claim, so this is the difference between a race that
    // converges and a race that transfers a matter to the wrong participant.
    const contested = "30000000-0000-4000-8000-000000000012";
    db.sql(seedPending(contested, hashOf(token("conflict"))));
    db.sql(`insert into public.consumer_briefcase_items
              (user_id, item_type, jurisdiction, status, source_pending_result_id)
            values ('${ids.userB}', 'result', 'MS', 'check_saved', '${contested}')`);

    const loser = db.json(`select to_jsonb(t) from public.claim_pending_screening_result(
        '${token("conflict")}', '${ids.userA}'::uuid, ${matterPayload()}, 'req-17') t`);
    check(loser.outcome === "denied_other_user",
      "a claim whose matter already belongs to another participant is denied", JSON.stringify(loser));
    check(loser.matter_id === null, "the denial reveals no matter id");
    check(
      db.scalar(`select count(*)::int from public.consumer_briefcase_items
                   where source_pending_result_id = '${contested}'`) === "1",
      "the denied claim created no second matter"
    );
    check(
      db.scalar(`select user_id from public.consumer_briefcase_items
                   where source_pending_result_id = '${contested}'`) === ids.userB,
      "the existing matter still belongs to its original owner"
    );
    check(
      db.scalar(`select status from public.consumer_pending_screening_results
                   where pending_id = '${contested}'`) === "PENDING",
      "the denied claim did not mark the pending result claimed"
    );
    check(
      db.scalar(`select count(*)::int from public.participant_claim_events
                   where pending_result_id = '${contested}'
                     and event = 'claim_denied_other_user'`) === "1",
      "the denial is recorded in the append-only audit"
    );
  }
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
