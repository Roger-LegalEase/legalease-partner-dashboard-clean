import { createHash, randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import { register } from "node:module";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ephemeralPgAvailable, startEphemeralPg } from "./lib/rcap-ephemeral-pg.mjs";

register("./lib/ts-esm-loader.mjs", import.meta.url);

const {
  appendAttributionQuery,
  extractPartnerAttribution,
  normalizePartnerAnalyticsAttribution,
  readAttributionFromFormData
} = await import("../src/lib/expungement-ai/partner-attribution.ts");

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const migrationPath = path.join(root, "supabase/migrations/20260901162000_rcap_analytics_attribution_claim_binding.sql");
const migration = fs.readFileSync(migrationPath, "utf8");
const failures = [];
let assertions = 0;
const IDS = {
  userA: "10000000-0000-4000-8000-000000000001",
  userB: "10000000-0000-4000-8000-000000000002",
  event: "20000000-0000-4000-8000-000000000001",
  evilEvent: "20000000-0000-4000-8000-000000000099",
  accessCode: "30000000-0000-4000-8000-000000000001",
  consent: "40000000-0000-4000-8000-000000000001",
  pending: "50000000-0000-4000-8000-000000000001"
};

function check(condition, label) {
  assertions += 1;
  if (!condition) failures.push(label);
}

// The real TypeScript module is executable under the repository's existing
// loader; no second implementation and no added runtime dependency.
const analytics = extractPartnerAttribution({
  county: "  Hinds   County ",
  utm_source: "newsletter",
  utm_medium: "email",
  utm_campaign: "fresh-start-2026",
  utm_term: "record clearing",
  utm_content: "cta-a",
  source: "partner-site",
  ref: "fall-clinic",
  partner_slug: "browser-forgery",
  event_id: "browser-forgery"
});
check(analytics.county === "Hinds County", "county is normalized");
check(analytics.utm_campaign === "fresh-start-2026", "UTM campaign is retained");
check(!("partner_slug" in analytics) && !("event_id" in analytics), "unsupported authority keys are discarded");

const malformed = normalizePartnerAnalyticsAttribution({
  county: ["Hinds", "Rankin"],
  utm_source: "x".repeat(121),
  source: "https://outside.example/ref",
  ref: "javascript:alert(1)",
  utm_medium: "email\u0000injection",
  utm_content: "valid-label"
});
check(Object.keys(malformed).length === 1 && malformed.utm_content === "valid-label",
  "repeated, oversized, external and control-character values are rejected");

const callbackPath = appendAttributionQuery("/intake/tenant-a?from=callback", analytics);
check(callbackPath.includes("county=Hinds%20County") && callbackPath.includes("utm_campaign=fresh-start-2026"),
  "normalized analytics survives the callback return URL");
const form = new FormData();
for (const [key, value] of new URL(`https://local.test${callbackPath}`).searchParams) {
  if (key !== "from") form.append(`attr_${key}`, value);
}
const afterPassword = readAttributionFromFormData(form);
check(JSON.stringify(afterPassword) === JSON.stringify(analytics), "analytics survives password and callback form handoff");
form.append("attr_source", "second-value");
check(readAttributionFromFormData(form).source === undefined, "repeated form attribution is rejected");

const intake = fs.readFileSync(path.join(root, "src/app/intake/[partnerSlug]/page.tsx"), "utf8");
const pendingRoute = fs.readFileSync(path.join(root, "src/app/api/expungement-ai/screening/pending/route.ts"), "utf8");
const claimService = fs.readFileSync(path.join(root, "src/lib/expungement-ai/claim/claim-service.ts"), "utf8");
check(intake.includes("analyticsAttribution: attribution"), "server session creation receives normalized analytics");
check(pendingRoute.includes("const { sponsorshipAuthority, analyticsAttribution } = attribution"),
  "pending creation separates sponsorship authority from analytics");
check(pendingRoute.includes("analytics_attribution: analyticsAttribution"), "pending result persists analytics server-side");
check(claimService.includes("sponsorshipAuthority:") && claimService.includes("analyticsAttribution:"),
  "matter representation keeps authority and analytics separate");

const normalOutcome = runDatabaseProof(migration);
check(normalOutcome.session.analytics_attribution.county === "Hinds County", "session persists normalized county");
check(normalOutcome.session.analytics_attribution.utm_source === "newsletter", "session persists normalized UTM/source data");
check(normalOutcome.session.partner_slug === "tenant-a", "server-owned partner is preserved");
check(normalOutcome.session.program_id === "server-program", "server-owned program is preserved");
check(normalOutcome.session.event_id === IDS.event, "server-owned event is preserved");
check(normalOutcome.session.campaign_name === "server-campaign", "server-owned campaign is preserved");
check(normalOutcome.matter.attribution.partnerSlug === "tenant-a", "browser cannot replace sponsored partner authority");
check(normalOutcome.matter.attribution.sponsorshipAuthority.eventId === IDS.event,
  "browser cannot replace event authority");
check(normalOutcome.matter.attribution.analyticsAttribution.county === "Hinds County",
  "exact claimed matter receives analytics atomically");
check(normalOutcome.matter.owner === IDS.userA, "claimed matter remains participant-owned");
check(normalOutcome.unrelatedAttribution === null, "unrelated matter inherits no attribution");
check(normalOutcome.replayOutcome === "idempotent_replay" && normalOutcome.matterCount === 1,
  "claim replay is safe and creates no duplicate matter or attribution record");
check(normalOutcome.otherUserOutcome === "denied_other_user", "another user cannot inherit the claim attribution");

// Required negative control: remove the atomic trigger from otherwise identical
// migration bytes. The behavioral proof must turn red because the malicious
// application payload is no longer overwritten from the exact pending row.
const mutatedMigration = migration.replace(
  /create trigger bind_pending_attribution_to_claimed_matter[\s\S]*?execute function public\.bind_pending_attribution_to_claimed_matter\(\);/,
  ""
);
check(mutatedMigration !== migration, "atomic-copy mutation was applied");
const mutationOutcome = runDatabaseProof(mutatedMigration);
check(mutationOutcome.matter.attribution.analyticsAttribution?.county !== "Hinds County"
  || mutationOutcome.matter.attribution.partnerSlug !== "tenant-a",
"removing the atomic copy turns the behavioral verifier red");

if (failures.length) {
  console.error("RCAP partner attribution verification failed.");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`RCAP partner attribution verifier passed (${assertions} assertions).`);
console.log("Server-owned sponsorship and non-authoritative county/UTM/source attribution remain separate and exact-matter bound.");

function runDatabaseProof(migrationSource) {
  const db = startIsolatedPg();
  const temporaryMigration = path.join(os.tmpdir(), `rcap-attribution-${process.pid}-${Math.random().toString(16).slice(2)}.sql`);
  try {
    db.sql(baselineSchema());
    fs.writeFileSync(temporaryMigration, migrationSource, { mode: 0o600 });
    db.applyFile(temporaryMigration);

    const analyticsJson = JSON.stringify(analytics).replaceAll("'", "''");
    const sessionClaim = db.json(`select to_jsonb(claim) from public.claim_partner_screening_session(
        'tenant-a', 'MS', 'code-hash', '${analyticsJson}'::jsonb, now()
      ) claim`);
    const session = db.json(`select to_jsonb(screening) from (
      select session_id, partner_slug, program_id, event_id, campaign_name, analytics_attribution
      from public.screening_sessions where session_id = '${sessionClaim.session_id}'
    ) screening`);

    const pendingId = IDS.pending;
    db.sql(`insert into public.consumer_pending_screening_results (
      pending_id, claim_token_hash, product, jurisdiction, partner_slug, program_id,
      event_id, campaign_name, access_code_id, consent_grant_id, locale,
      analytics_attribution, status, expires_at
    ) select
      '${pendingId}', '${hash("claim-token")}', 'rcap_partner', 'MS', partner_slug, program_id,
      event_id, campaign_name, partner_access_code_id, '${IDS.consent}', 'es',
      analytics_attribution, 'PENDING', now() + interval '1 day'
    from public.screening_sessions where session_id = '${session.session_id}'`);

    const maliciousPayload = JSON.stringify({
      artifact_refs_json: {
        attribution: {
          partnerSlug: "browser-forgery",
          eventId: IDS.evilEvent,
          sponsorshipAuthority: { partnerSlug: "browser-forgery", eventId: IDS.evilEvent },
          analyticsAttribution: { county: "Evil County" }
        }
      }
    }).replaceAll("'", "''");

    const claimed = db.json(`select to_jsonb(result) from public.claim_pending_screening_result(
      'claim-token', '${IDS.userA}', '${maliciousPayload}'::jsonb,
      'request-1'
    ) result`);
    const matter = db.json(`select jsonb_build_object(
      'owner', user_id,
      'attribution', artifact_refs_json -> 'attribution'
    ) from public.consumer_briefcase_items where id = '${claimed.matter_id}'`);

    const replay = db.json(`select to_jsonb(result) from public.claim_pending_screening_result(
      'claim-token', '${IDS.userA}', '{}'::jsonb, 'request-2'
    ) result`);
    const otherUser = db.json(`select to_jsonb(result) from public.claim_pending_screening_result(
      'claim-token', '${IDS.userB}', '{}'::jsonb, 'request-3'
    ) result`);

    db.sql(`insert into public.consumer_briefcase_items (user_id, artifact_refs_json)
      values ('${IDS.userA}', '{}'::jsonb)`);

    return {
      session,
      matter,
      replayOutcome: replay.outcome,
      otherUserOutcome: otherUser.outcome,
      matterCount: Number(db.scalar(`select count(*) from public.consumer_briefcase_items where source_pending_result_id = '${pendingId}'`)),
      unrelatedAttribution: db.json(`select artifact_refs_json -> 'attribution'
        from public.consumer_briefcase_items where source_pending_result_id is null limit 1`)
    };
  } finally {
    fs.rmSync(temporaryMigration, { force: true });
    db.stop();
  }
}

function hash(value) {
  return createHash("sha256").update(value).digest("hex");
}

function startIsolatedPg() {
  if (ephemeralPgAvailable()) return startEphemeralPg();

  const image = "public.ecr.aws/supabase/postgres:17.6.1.165";
  const name = `rcap-attribution-${process.pid}-${randomUUID().slice(0, 8)}`;
  try {
    execFileSync("docker", ["image", "inspect", image], { stdio: "ignore" });
  } catch {
    throw new Error("RCAP partner attribution verification requires local PostgreSQL tools or the already-installed Supabase PostgreSQL image.");
  }

  execFileSync("docker", [
    "run", "--pull=never", "--rm", "--detach", "--name", name,
    "--env", "POSTGRES_PASSWORD=local-verifier-only", image
  ], { stdio: ["ignore", "pipe", "pipe"] });

  let ready = false;
  for (let attempt = 0; attempt < 160; attempt += 1) {
    try {
      const health = execFileSync(
        "docker",
        ["inspect", "--format", "{{.State.Health.Status}}", name],
        { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }
      ).trim();
      if (health === "healthy") {
        execFileSync("docker", ["exec", name, "pg_isready", "-U", "postgres"], { stdio: "ignore" });
        ready = true;
        break;
      }
    } catch {
      // The image performs one controlled restart after initialization.
    }
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 125);
  }
  if (!ready) {
    execFileSync("docker", ["rm", "--force", name], { stdio: "ignore" });
    throw new Error("The isolated attribution PostgreSQL verifier did not become ready.");
  }

  const psql = (args, input) => execFileSync(
    "docker",
    ["exec", "-i", name, "psql", "-U", "postgres", "-d", "postgres", "-X", "-v", "ON_ERROR_STOP=1", ...args],
    { input, encoding: "utf8", stdio: [input === undefined ? "ignore" : "pipe", "pipe", "pipe"] }
  );

  return {
    sql(text) {
      return psql(["-A", "-t", "-c", text]);
    },
    json(text) {
      const out = this.sql(`select coalesce((${text})::text, 'null')`).trim();
      return JSON.parse(out || "null");
    },
    scalar(text) {
      return this.sql(text).trim();
    },
    applyFile(file) {
      psql(["-q"], fs.readFileSync(file));
    },
    stop() {
      try {
        execFileSync("docker", ["rm", "--force", name], { stdio: "ignore" });
      } catch {
        // Already stopped.
      }
    }
  };
}

function baselineSchema() {
  return `
    create extension if not exists pgcrypto;
    do $$ begin if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon; end if; end $$;
    do $$ begin if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated; end if; end $$;
    do $$ begin if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role; end if; end $$;
    create schema if not exists auth;
    create table public.screening_sessions (
      session_id uuid primary key,
      partner_slug text,
      program_id text,
      event_id uuid,
      campaign_name text,
      partner_access_code_id uuid
    );
    create table public.consumer_pending_screening_results (
      pending_id uuid primary key,
      claim_token_hash text unique,
      product text not null,
      jurisdiction text not null,
      partner_slug text,
      program_id text,
      event_id uuid,
      campaign_name text,
      access_code_id uuid,
      consent_grant_id uuid,
      locale text,
      status text not null default 'PENDING',
      expires_at timestamptz not null,
      claimed_user_id uuid,
      claimed_matter_id uuid,
      claimed_at timestamptz
    );
    create table public.consumer_briefcase_items (
      id uuid primary key default gen_random_uuid(),
      user_id uuid not null,
      artifact_refs_json jsonb not null default '{}'::jsonb,
      source_pending_result_id uuid unique
    );

    create function public.claim_rcap_screening_session(p_partner_slug text, p_jurisdiction text)
    returns table(ok boolean, session_id uuid, reason text, screenings_used integer, screenings_allowed integer)
    language plpgsql security definer set search_path = '' as $$
    declare v_id uuid := gen_random_uuid();
    begin
      insert into public.screening_sessions(session_id, partner_slug, program_id, event_id, campaign_name)
      values (v_id, p_partner_slug, 'server-program', '${IDS.event}', 'server-campaign');
      return query select true, v_id, null::text, 0, 100;
    end $$;

    create function public.claim_partner_screening_session(
      p_partner_slug text, p_jurisdiction text, p_code_hash text default null, p_now timestamptz default now()
    ) returns table(ok boolean, session_id uuid, reason text, benefit_active boolean,
      attribution_source text, campaign_name text, access_mode text, code_id uuid)
    language plpgsql security definer set search_path = '' as $$
    declare v_id uuid := gen_random_uuid();
    begin
      insert into public.screening_sessions(
        session_id, partner_slug, program_id, event_id, campaign_name, partner_access_code_id
      ) values (
        v_id, p_partner_slug, 'server-program', '${IDS.event}', 'server-campaign', '${IDS.accessCode}'
      );
      return query select true, v_id, null::text, true, 'partner_code'::text,
        'server-campaign'::text, 'required_code'::text, '${IDS.accessCode}'::uuid;
    end $$;

    create function public.claim_pending_screening_result(
      p_claim_token text, p_user_id uuid, p_matter jsonb, p_request_id text default null
    ) returns table(matter_id uuid, outcome text)
    language plpgsql security definer set search_path = '' as $$
    declare v_pending public.consumer_pending_screening_results%rowtype;
    declare v_matter uuid;
    begin
      select * into v_pending from public.consumer_pending_screening_results
      where claim_token_hash = encode(sha256(convert_to(p_claim_token, 'utf8')), 'hex') for update;
      if not found then return query select null::uuid, 'denied_invalid_token'::text; return; end if;
      if v_pending.status = 'CLAIMED' then
        if v_pending.claimed_user_id = p_user_id then
          return query select v_pending.claimed_matter_id, 'idempotent_replay'::text;
        else
          return query select null::uuid, 'denied_other_user'::text;
        end if;
        return;
      end if;
      insert into public.consumer_briefcase_items(user_id, artifact_refs_json, source_pending_result_id)
      values (p_user_id, coalesce(p_matter -> 'artifact_refs_json', '{}'::jsonb), v_pending.pending_id)
      returning id into v_matter;
      update public.consumer_pending_screening_results set status = 'CLAIMED', claimed_user_id = p_user_id,
        claimed_matter_id = v_matter, claimed_at = now() where pending_id = v_pending.pending_id;
      return query select v_matter, 'claimed'::text;
    end $$;
  `;
}
