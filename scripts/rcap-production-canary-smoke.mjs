#!/usr/bin/env node
// Bounded smoke for the exact no-alias Production-target staged deployment.
// All synthetic database rows live inside one explicit transaction that ends
// with ROLLBACK. No Auth account, participant record, charge, or artifact is
// persisted.

import { createHash, randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import {
  HOSTED_VERCEL_PROJECT_NAME,
  hostedVercelScopedUrl,
  resolveHostedVercelIdentity
} from "./rcap-hosted-acceptance-vercel-identity.mjs";

const APPLICATION_SHA = "441ee3188ee52047a012232d8d11f890a09b4ac5";
const WORKER_SOURCE_SHA = APPLICATION_SHA;
const WORKER_DIGEST = "sha256:67132df2d1bee49d123d0d2918880f283d2109195b49150265d348fe1d07a69c";
const PRODUCTION_PROJECT_REF = "wwtwtsmywnckfkdaqqeg";
const STAGED_DEPLOYMENT_ID = "dpl_DGDUFV4B7ufTAW5wsfR2txJE2dVL";
const ROLLBACK_DEPLOYMENT_ID = "dpl_9WoA51v3wXSvG3VmBKGUEKtVBCfS";
const REQUIRED_MIGRATION_HASHES = Object.freeze([
  "5e3df0a7f49aae3ebbec10b7392acd331e9ca91b2ffa11c7ee16b3e996f3ddef",
  "9a0af066fbe2d47c82f259e6998a7056a2f8c377c8e6875f143d40fd11f18835",
  "9fb46113fbb87eb75b1502f7cb85c9c27a36bac284888202b64baa63398f8010"
]);

const PHASE = (process.env.RCAP_PRODUCTION_PHASE ?? "").trim();
const INPUT_APPLICATION_SHA = (process.env.RCAP_APPLICATION_SHA ?? "").trim();
const INPUT_WORKER_SOURCE_SHA = (process.env.RCAP_WORKER_SOURCE_SHA ?? "").trim();
const INPUT_WORKER_DIGEST = (process.env.RCAP_WORKER_DIGEST ?? "").trim();
const VERCEL_TOKEN = process.env.VERCEL_TOKEN ?? "";
const SUPABASE_ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN ?? "";
const BYPASS = process.env.VERCEL_AUTOMATION_BYPASS_SECRET ?? "";
const EVIDENCE_DIR = path.resolve(process.env.RCAP_PRODUCTION_EVIDENCE_DIR ?? "production-canary-evidence");
const EVIDENCE_FILE = path.join(EVIDENCE_DIR, "production-canary-smoke.json");

const REQUIRED_TABLES = [
  "clinic_events", "clinic_event_staff", "clinic_event_access_codes",
  "clinic_event_access_redemptions", "clinic_assisted_sessions", "clinic_cases",
  "clinic_follow_ups", "clinic_incidents", "clinic_event_audit",
  "clinic_packet_reservations"
];
const REQUIRED_FUNCTIONS = [
  "clinic_create_event", "clinic_set_event_staff", "clinic_create_access_code",
  "clinic_set_event_status", "clinic_redeem_event_code", "clinic_start_assisted_session",
  "clinic_end_assisted_session", "clinic_upsert_case", "clinic_transition_case",
  "clinic_upsert_follow_up", "clinic_record_incident", "clinic_reserve_packet_credit",
  "clinic_finalize_packet_credit", "clinic_release_packet_credit",
  "clinic_reserve_participant_packet_credit", "clinic_sync_packet_reservation",
  "clinic_actor_can_event", "clinic_upsert_event_follow_up", "clinic_get_event_queue",
  "clinic_transition_event_case", "clinic_get_follow_ups", "clinic_get_event_report"
];

fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
const verdicts = [];
const evidence = {
  schemaVersion: "rcap-production-canary-smoke/v1",
  startedAt: new Date().toISOString(),
  applicationSha: APPLICATION_SHA,
  workerSourceSha: WORKER_SOURCE_SHA,
  workerDigest: WORKER_DIGEST,
  productionProjectRef: PRODUCTION_PROJECT_REF,
  stagedDeploymentId: STAGED_DEPLOYMENT_ID,
  rollbackDeploymentId: ROLLBACK_DEPLOYMENT_ID,
  migrationHashes: REQUIRED_MIGRATION_HASHES,
  realParticipantRecordsCreated: false,
  realChargesCreated: false,
  checkoutCreated: false,
  workerRun: false,
  deploymentTriggered: false,
  aliasChanged: false,
  environmentVariableChanged: false,
  productionDatabasePersistentlyMutated: false,
  transactionalFixtureRolledBack: false,
  originPersisted: false,
  secretsPersisted: false,
  verdicts
};

function record(caseId, passed, observed) {
  verdicts.push({ caseId, passed, observed });
  console.log(`  ${passed ? "ok  " : "FAIL"} ${caseId} — ${observed}`);
  if (!passed) throw new Error(caseId);
}

function persist(passed, failure = null) {
  evidence.finishedAt = new Date().toISOString();
  evidence.passed = passed;
  evidence.failure = failure;
  fs.writeFileSync(EVIDENCE_FILE, `${JSON.stringify(evidence, null, 2)}\n`);
}

function parseJson(text) {
  try { return JSON.parse(text); }
  catch { return null; }
}

function sha256(value) {
  return createHash("sha256").update(String(value), "utf8").digest("hex");
}

function postgresArray(value) {
  if (Array.isArray(value)) return value.map(String);
  if (value === null || value === undefined || value === "{}") return [];
  if (typeof value !== "string" || !value.startsWith("{") || !value.endsWith("}")) return [];
  return value.slice(1, -1).split(",").filter(Boolean).map((entry) => entry.replace(/^"|"$/g, ""));
}

function exactNames(actual, expected) {
  return JSON.stringify([...actual].sort()) === JSON.stringify([...expected].sort());
}

function sqlNames(values) {
  return values.map((value) => `'${value.replaceAll("'", "''")}'`).join(",");
}

async function getJson(url, token) {
  const response = await fetch(url, {
    method: "GET",
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });
  const text = await response.text();
  return { status: response.status, json: parseJson(text) };
}

async function managementQuery(query) {
  const response = await fetch(
    `https://api.supabase.com/v1/projects/${PRODUCTION_PROJECT_REF}/database/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SUPABASE_ACCESS_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ query })
    }
  );
  const text = await response.text();
  if (!response.ok) throw new Error(`Production transactional smoke returned HTTP ${response.status}`);
  return parseJson(text);
}

function deploymentId(value) {
  return value?.id ?? value?.uid ?? null;
}

function ready(value) {
  return (value?.readyState ?? value?.state) === "READY";
}

function normalizeEmbeddedText(value) {
  return value.replaceAll("\\u003a", ":").replaceAll("\\u003A", ":")
    .replaceAll("\\u002f", "/").replaceAll("\\u002F", "/").replaceAll("\\/", "/");
}

function collectOrigins(value, origins) {
  const normalized = normalizeEmbeddedText(value);
  for (const pattern of [
    /https:\/\/[a-z0-9.-]+(?::\d+)?\/(?:auth|rest|storage|functions)\/v1\/?/gi,
    /https:\/\/[a-z0-9.-]+\.supabase\.co\/?/gi
  ]) {
    for (const match of normalized.matchAll(pattern)) {
      try { origins.add(new URL(match[0]).origin); }
      catch { /* malformed strings cannot become origins */ }
    }
  }
}

function scriptSources(html) {
  const values = new Set();
  for (const match of html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi)) {
    try {
      const parsed = new URL(match[1], "https://runtime.invalid");
      if (parsed.pathname.startsWith("/_next/static/")) values.add(parsed.pathname + parsed.search);
    } catch { /* ignore malformed sources */ }
  }
  return [...values];
}

async function stagedFetch(origin, pathname, options = {}) {
  return fetch(new URL(pathname, origin), {
    method: options.method ?? "GET",
    headers: {
      "x-vercel-protection-bypass": BYPASS,
      ...(options.cookie ? { Cookie: options.cookie } : {}),
      ...(options.body ? { "Content-Type": "application/json" } : {})
    },
    redirect: "follow",
    body: options.body ? JSON.stringify(options.body) : undefined
  });
}

async function inspectRuntimeOrigin(hostname) {
  const deploymentOrigin = `https://${hostname}`;
  const candidates = new Set();
  const chunks = new Set();
  for (const route of ["/", "/sign-in", "/expungement-ai/sign-in"]) {
    const page = await stagedFetch(deploymentOrigin, route);
    if (!page.ok || new URL(page.url).host !== hostname) continue;
    const html = await page.text();
    collectOrigins(html, candidates);
    for (const source of scriptSources(html)) {
      if (chunks.has(source)) continue;
      chunks.add(source);
      const chunk = await stagedFetch(deploymentOrigin, source);
      if (chunk.ok) collectOrigins(await chunk.text(), candidates);
    }
  }
  if (candidates.size !== 1) throw new Error("staged runtime did not expose exactly one Supabase origin");
  return { deploymentOrigin, supabaseOrigin: [...candidates][0], candidateCount: candidates.size };
}

async function originMatchesProject(origin) {
  const project = await getJson(
    `https://api.supabase.com/v1/projects/${PRODUCTION_PROJECT_REF}`,
    SUPABASE_ACCESS_TOKEN
  );
  if (project.status !== 200 || (project.json?.ref ?? project.json?.id) !== PRODUCTION_PROJECT_REF) return false;
  const hostname = new URL(origin).hostname.toLowerCase();
  if (hostname === `${PRODUCTION_PROJECT_REF}.supabase.co`) return true;
  const custom = await getJson(
    `https://api.supabase.com/v1/projects/${PRODUCTION_PROJECT_REF}/custom-hostname`,
    SUPABASE_ACCESS_TOKEN
  );
  const vanity = await getJson(
    `https://api.supabase.com/v1/projects/${PRODUCTION_PROJECT_REF}/config/vanity-subdomain`,
    SUPABASE_ACCESS_TOKEN
  );
  const customHost = custom.json?.custom_hostname ?? custom.json?.hostname ?? null;
  const vanityName = vanity.json?.vanity_subdomain ?? vanity.json?.vanitySubdomain ?? null;
  const vanityHost = typeof vanityName === "string"
    ? (vanityName.includes(".") ? vanityName : `${vanityName}.supabase.co`)
    : null;
  return (custom.status === 200 && custom.json?.status === "active" && customHost === hostname)
    || (vanity.status === 200 && vanity.json?.status === "active" && vanityHost === hostname);
}

async function clinicSchemaReadback() {
  const rows = await managementQuery(`
    select
      array(select c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace
        where n.nspname='public' and c.relkind='r' and c.relrowsecurity
          and c.relname in (${sqlNames(REQUIRED_TABLES)}) order by c.relname) as rls_tables,
      array(select distinct p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace
        where n.nspname='public' and p.proname in (${sqlNames(REQUIRED_FUNCTIONS)}) order by p.proname) as functions
  `);
  const row = Array.isArray(rows) ? rows[0] ?? {} : {};
  return { rlsTables: postgresArray(row.rls_tables), functions: postgresArray(row.functions) };
}

try {
  if (PHASE !== "smoke"
    || INPUT_APPLICATION_SHA !== APPLICATION_SHA
    || INPUT_WORKER_SOURCE_SHA !== WORKER_SOURCE_SHA
    || INPUT_WORKER_DIGEST !== WORKER_DIGEST
    || !VERCEL_TOKEN || !SUPABASE_ACCESS_TOKEN || !BYPASS) {
    throw new Error("exact Production smoke inputs are unavailable");
  }

  const identity = await resolveHostedVercelIdentity({ token: VERCEL_TOKEN });
  const vercel = (pathname) => getJson(hostedVercelScopedUrl(pathname, identity), VERCEL_TOKEN);
  const [project, staged, rollback, domains] = await Promise.all([
    vercel(`/v9/projects/${encodeURIComponent(identity.projectId)}`),
    vercel(`/v13/deployments/${encodeURIComponent(STAGED_DEPLOYMENT_ID)}`),
    vercel(`/v13/deployments/${encodeURIComponent(ROLLBACK_DEPLOYMENT_ID)}`),
    vercel(`/v9/projects/${encodeURIComponent(identity.projectId)}/domains?limit=100`)
  ]);
  record(
    "exact_staged_application_worker_identity",
    project.status === 200
      && project.json?.name === HOSTED_VERCEL_PROJECT_NAME
      && staged.status === 200
      && deploymentId(staged.json) === STAGED_DEPLOYMENT_ID
      && ready(staged.json)
      && staged.json?.target === "production"
      && staged.json?.meta?.rcapApplicationSha === APPLICATION_SHA
      && staged.json?.meta?.rcapWorkerSourceSha === WORKER_SOURCE_SHA
      && staged.json?.meta?.rcapWorkerDigest === WORKER_DIGEST,
    "READY staged deployment carries exact application and worker metadata"
  );

  const currentIds = new Set();
  for (const domain of (Array.isArray(domains.json?.domains) ? domains.json.domains : [])) {
    const resolved = await vercel(`/v13/deployments/${encodeURIComponent(domain.name)}`);
    if (resolved.status === 200 && resolved.json?.target === "production" && ready(resolved.json)) {
      currentIds.add(deploymentId(resolved.json));
    }
  }
  record(
    "rollback_target_is_ready_and_still_active",
    rollback.status === 200
      && deploymentId(rollback.json) === ROLLBACK_DEPLOYMENT_ID
      && ready(rollback.json)
      && rollback.json?.target === "production"
      && currentIds.size === 1
      && currentIds.has(ROLLBACK_DEPLOYMENT_ID)
      && !currentIds.has(STAGED_DEPLOYMENT_ID),
    "recorded rollback is READY and remains the sole active Production target"
  );

  const immutableHostname = staged.json?.url ?? null;
  if (!immutableHostname) throw new Error("staged immutable hostname unavailable");
  const runtime = await inspectRuntimeOrigin(immutableHostname);
  record(
    "runtime_supabase_origin_is_canonical",
    runtime.candidateCount === 1 && await originMatchesProject(runtime.supabaseOrigin),
    "one staged runtime origin maps to the authenticated canonical Production project"
  );

  const health = await stagedFetch(runtime.deploymentOrigin, "/api/health");
  const healthBody = await health.json().catch(() => null);
  record(
    "staged_health_is_200",
    health.status === 200 && healthBody && typeof healthBody.checks === "object",
    `status=${health.status}; structured checks=${Boolean(healthBody?.checks)}`
  );

  const schema = await clinicSchemaReadback();
  record(
    "production_clinic_schema_direct_readback",
    exactNames(schema.rlsTables, REQUIRED_TABLES) && exactNames(schema.functions, REQUIRED_FUNCTIONS),
    `RLS tables=${schema.rlsTables.length}/10; functions=${schema.functions.length}/22`
  );

  const colorado = spawnSync(process.execPath, ["scripts/verify-rcap-colorado-juvenile-packet-boundary.mjs"], {
    cwd: process.cwd(),
    encoding: "utf8",
    timeout: 180_000,
    env: { ...process.env, RCAP_EVALUATOR_TODAY: "2026-08-25" }
  });
  const coloradoOutput = `${colorado.stdout ?? ""}\n${colorado.stderr ?? ""}`;
  if (colorado.status !== 0 || !coloradoOutput.includes("Colorado juvenile packet boundary (53/53)")) {
    throw new Error("Colorado juvenile exact-SHA verifier failed");
  }

  const participantId = randomUUID();
  const staffUserId = randomUUID();
  const negativeId = randomUUID();
  const partnerUserId = randomUUID();
  const eventId = randomUUID();
  const eventStaffId = randomUUID();
  const screeningId = randomUUID();
  const sessionId = randomUUID();
  const matterId = randomUUID();
  const caseId = randomUUID();
  const followUpId = randomUUID();
  const slug = `rcap-production-canary-${sha256(eventId).slice(0, 12)}`;

  await managementQuery(`
    begin;
    insert into auth.users (id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at)
    values
      ('${participantId}','00000000-0000-0000-0000-000000000000','authenticated','authenticated','participant-${participantId}@rcap-production-canary.test','',now(),now(),now()),
      ('${staffUserId}','00000000-0000-0000-0000-000000000000','authenticated','authenticated','staff-${staffUserId}@rcap-production-canary.test','',now(),now(),now()),
      ('${negativeId}','00000000-0000-0000-0000-000000000000','authenticated','authenticated','negative-${negativeId}@rcap-production-canary.test','',now(),now(),now());

    insert into public.partner_records
      (partner_id,partner_slug,partner_name,program_tier,payment_status,qualification_status,provisioning_status)
    values ('${slug}','${slug}','RCAP Production Canary Transaction','sponsored','paid','qualified','provisioned');
    insert into public.partner_users (id,auth_user_id,partner_slug,role,status,invited_email)
    values ('${partnerUserId}','${staffUserId}','${slug}','partner_admin','active','staff-${staffUserId}@rcap-production-canary.test');
    insert into public.clinic_events
      (id,partner_slug,public_slug,name,starts_at,ends_at,timezone,location_name,geography,capacity,status,sponsorship_allocation,created_by)
    values ('${eventId}','${slug}','${slug}','Transactional Expunge Colorado Clinic Canary',
      now()-interval '1 hour',now()+interval '2 hours','America/Denver','Transactional location','Colorado',10,'published',0,'${staffUserId}');
    insert into public.clinic_event_staff (id,event_id,partner_user_id,status,permissions,approved_by)
    values ('${eventStaffId}','${eventId}','${partnerUserId}','approved',array['assist','queue','follow_up']::text[],'${staffUserId}');
    insert into public.screening_sessions
      (session_id,jurisdiction,answers,current_question_id,furthest_stage,status,partner_slug,flow_mode,claimed_slot_state)
    values ('${screeningId}','CO','{"age_at_offense":"juvenile"}'::jsonb,null,'results','completed','${slug}','rcap','claimed');
    insert into public.consumer_briefcase_items
      (id,user_id,item_type,jurisdiction,pathway_label,result_code,packet_type,payment_allowed,status,
       summary_json,next_steps_json,artifact_refs_json,payment_status,packet_status,source_session_id)
    values ('${matterId}','${participantId}','result','CO','Juvenile expungement under 19-1-306',
      'guidance_only','guidance_packet',false,'guidance_saved','{"summary":"Transactional guidance only"}'::jsonb,
      '[]'::jsonb,'{}'::jsonb,'not_applicable','not_started','${screeningId}');
    insert into public.clinic_assisted_sessions
      (id,event_id,event_staff_id,participant_user_id,screening_session_id,handoff_token_hash,device_nonce_hash,
       consent_version,consented_at,status,expires_at)
    values ('${sessionId}','${eventId}','${eventStaffId}','${participantId}','${screeningId}',
      '${sha256(sessionId)}','${sha256(eventId)}','canary-v1',now(),'active',now()+interval '1 hour');
    insert into public.clinic_cases
      (id,event_id,participant_user_id,assisted_session_id,screening_session_id,matter_id,queue_status,route_disposition,jurisdiction)
    values ('${caseId}','${eventId}','${participantId}','${sessionId}','${screeningId}','${matterId}','attorney_review','referral','CO');
    insert into public.clinic_follow_ups
      (id,event_id,clinic_case_id,owner_event_staff_id,status,communication_state,participant_safe_message,created_by)
    values ('${followUpId}','${eventId}','${caseId}','${eventStaffId}','open','draft','Transactional canary','${staffUserId}');

    set local role authenticated;
    select set_config('request.jwt.claim.sub','${participantId}',true);
    select set_config('request.jwt.claims','{"sub":"${participantId}","role":"authenticated"}',true);
    do $$ begin
      if (select count(*) from public.clinic_assisted_sessions where id='${sessionId}') <> 1 then
        raise exception 'participant_session_not_visible';
      end if;
    end $$;

    select set_config('request.jwt.claim.sub','${negativeId}',true);
    select set_config('request.jwt.claims','{"sub":"${negativeId}","role":"authenticated"}',true);
    do $$ begin
      if (select count(*) from public.clinic_assisted_sessions where id='${sessionId}') <> 0
        or (select count(*) from public.clinic_cases where id='${caseId}') <> 0
        or (select count(*) from public.clinic_follow_ups where id='${followUpId}') <> 0 then
        raise exception 'negative_control_visible';
      end if;
    end $$;

    select set_config('request.jwt.claim.sub','${participantId}',true);
    select set_config('request.jwt.claims','{"sub":"${participantId}","role":"authenticated"}',true);
    do $$ declare outcome text; begin
      select public.clinic_end_assisted_session('${sessionId}'::uuid,'${participantId}'::uuid,'staff_reset') into outcome;
      if outcome <> 'ended' then raise exception 'clinic_reset_failed'; end if;
    end $$;
    reset role;

    do $$ begin
      if not exists (select 1 from public.clinic_assisted_sessions
        where id='${sessionId}' and status='reset' and ended_reason='staff_reset' and ended_at is not null)
      then raise exception 'clinic_reset_readback_failed'; end if;
      if exists (select 1 from public.consumer_briefcase_items b where b.id='${matterId}' and
        (b.result_code <> 'guidance_only' or b.payment_allowed or b.payment_status <> 'not_applicable'
         or b.packet_status <> 'not_started' or b.checkout_session_id is not null
         or (select count(*) from jsonb_object_keys(coalesce(b.artifact_refs_json,'{}'::jsonb))) <> 0))
      then raise exception 'juvenile_commerce_state_present'; end if;
      if exists (select 1 from public.packet_render_jobs where briefcase_item_id='${matterId}')
        or exists (select 1 from public.consumer_packet_payment_consumption where consumer_briefcase_item_id='${matterId}')
      then raise exception 'juvenile_job_or_credit_present'; end if;
    end $$;
    rollback;
  `);

  const residueRows = await managementQuery(`
    select
      (select count(*)::int from auth.users where id in ('${participantId}','${staffUserId}','${negativeId}')) as users,
      (select count(*)::int from public.clinic_events where id='${eventId}') as events,
      (select count(*)::int from public.clinic_assisted_sessions where id='${sessionId}') as sessions,
      (select count(*)::int from public.consumer_briefcase_items where id='${matterId}') as matters
  `);
  const residue = Array.isArray(residueRows) ? residueRows[0] ?? {} : {};
  evidence.transactionalFixtureRolledBack = Number(residue.users) === 0
    && Number(residue.events) === 0
    && Number(residue.sessions) === 0
    && Number(residue.matters) === 0;
  record(
    "transactional_synthetic_fixture_rolled_back",
    evidence.transactionalFixtureRolledBack,
    `users=${residue.users}; events=${residue.events}; sessions=${residue.sessions}; matters=${residue.matters}`
  );
  record(
    "colorado_juvenile_guidance_has_no_commerce",
    true,
    "exact-SHA Colorado verifier 53/53 plus rolled-back Production DB no-checkout/no-job/no-credit assertions"
  );
  record(
    "clinic_negative_control_isolated",
    true,
    "authenticated negative control saw zero participant session, case, or follow-up rows under Production RLS"
  );

  const reset = await stagedFetch(runtime.deploymentOrigin, "/api/clinic/session/reset", {
    method: "POST",
    cookie: "clinic_session=synthetic-canary; clinic_device=synthetic-canary; clinic_event=synthetic-canary",
    body: { reason: "staff_reset" }
  });
  const resetBody = await reset.json().catch(() => null);
  const cookies = typeof reset.headers.getSetCookie === "function"
    ? reset.headers.getSetCookie().join("\n")
    : String(reset.headers.get("set-cookie") ?? "");
  record(
    "clinic_reset_boundary_passed",
    reset.status === 200
      && resetBody?.success === true
      && String(reset.headers.get("clear-site-data") ?? "").includes("storage")
      && cookies.includes("clinic_session=")
      && cookies.includes("clinic_device=")
      && cookies.includes("clinic_event="),
    `reset HTTP=${reset.status}; Clear-Site-Data=${Boolean(reset.headers.get("clear-site-data"))}; Clinic cookies cleared=${cookies.includes("clinic_session=")}`
  );

  evidence.runtime = {
    exactlyOneSupabaseOrigin: runtime.candidateCount === 1,
    supabaseOriginSha256: sha256(runtime.supabaseOrigin),
    productionProjectMatch: true
  };
  persist(true);
  console.log("PRODUCTION CANARY SMOKE PASS — exact staged deployment is ready for controlled activation");
} catch (error) {
  const failure = error instanceof Error ? error.message : String(error);
  persist(false, failure);
  console.error(`PRODUCTION CANARY SMOKE REFUSED — ${failure}`);
  process.exit(1);
}
