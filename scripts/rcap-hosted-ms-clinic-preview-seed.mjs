#!/usr/bin/env node

// Seeds only the bounded synthetic Mississippi Volunteer Lawyers cohort in the
// named nonproduction acceptance project. No real participant, payment,
// Checkout, Stripe, Production deployment, or production project is touched.

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { prepareHostedAcceptanceEvidenceLayout } from "./rcap-hosted-acceptance-evidence-layout.mjs";
import { hostedVercelScopedUrl, resolveHostedVercelIdentity } from "./rcap-hosted-acceptance-vercel-identity.mjs";

const PROJECT_REF = (process.env.ACCEPTANCE_SUPABASE_PROJECT_REF ?? "").trim();
const APPLICATION_SHA = (process.env.HOSTED_APPLICATION_SHA ?? "").trim();
const DEPLOYMENT_ID = (process.env.HOSTED_PREVIEW_DEPLOYMENT_ID ?? "").trim();
const PREVIEW_HOSTNAME = (process.env.HOSTED_PREVIEW_HOSTNAME ?? "").trim().replace(/^https?:\/\//, "").replace(/\/+$/, "");
const SUPABASE_ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN ?? "";
const VERCEL_TOKEN = process.env.VERCEL_TOKEN ?? "";
const ACCESS_CODE = (process.env.HOSTED_CLINIC_DEMO_ACCESS_CODE ?? "").normalize("NFKC").trim().toUpperCase();
const EXPECTED_PROJECT_REF = "hyflxnlhpmiqxvvcoiia";
const EVENT_ID = "77000000-0000-4000-8000-000000000055";
const EVENT_STAFF_ID = "77000000-0000-4000-8000-000000000056";
const ACCESS_CODE_ID = "77000000-0000-4000-8000-000000000057";
const EVENT_SLUG = "mississippi-volunteer-lawyers-demo";
const EVENT_NAME = "Mississippi Volunteer Lawyers Clinic Mode Demo";

if (PROJECT_REF !== EXPECTED_PROJECT_REF
  || !/^[0-9a-f]{40}$/.test(APPLICATION_SHA)
  || !/^dpl_[A-Za-z0-9]+$/.test(DEPLOYMENT_ID)
  || !/^[A-Za-z0-9.-]+\.vercel\.app$/.test(PREVIEW_HOSTNAME)
  || !SUPABASE_ACCESS_TOKEN
  || !VERCEL_TOKEN
  || ACCESS_CODE.length < 8
  || ACCESS_CODE.length > 120) {
  throw new Error("Clinic seed requires the exact acceptance project, application SHA, Preview identity, Vercel/Supabase credentials, and an 8-120 character synthetic event code.");
}

const { root: evidenceDir } = prepareHostedAcceptanceEvidenceLayout({ rootDir: process.cwd() });
const evidencePath = path.join(evidenceDir, "ms-clinic-preview-seed.json");
const evidence = {
  schemaVersion: "rcap-hosted-ms-clinic-preview-seed/v1",
  applicationSha: APPLICATION_SHA,
  acceptanceProjectRef: PROJECT_REF,
  previewUrl: `https://${PREVIEW_HOSTNAME}`,
  previewDeploymentId: DEPLOYMENT_ID,
  partnerSlug: "mvl-demo",
  eventId: EVENT_ID,
  eventSlug: EVENT_SLUG,
  eventName: EVENT_NAME,
  jurisdiction: "MS",
  cohort: [
    "mvl-demo-admin@rcap-acceptance.test",
    "mvl-demo-staff@rcap-acceptance.test",
    "mvl-demo-participant-a@rcap-acceptance.test",
    "mvl-demo-participant-b@rcap-acceptance.test"
  ],
  eventAccessCodeStored: "sha256 only",
  eventSponsorshipAllocation: 2,
  productionTouched: false,
  stripeTouched: false
};

try {
  const identity = await resolveHostedVercelIdentity({ token: VERCEL_TOKEN });
  const deployment = await vercelJson(`/v13/deployments/${encodeURIComponent(DEPLOYMENT_ID)}`, identity);
  const alias = await vercelJson(`/v13/deployments/${encodeURIComponent(PREVIEW_HOSTNAME)}`, identity);
  const aliasDeploymentId = alias.json?.id ?? alias.json?.uid ?? null;
  const exactPreview = deployment.status === 200
    && (deployment.json?.id === DEPLOYMENT_ID || deployment.json?.uid === DEPLOYMENT_ID)
    && alias.status === 200
    && aliasDeploymentId === DEPLOYMENT_ID
    && (deployment.json?.readyState ?? deployment.json?.state) === "READY"
    && (deployment.json?.target === null || deployment.json?.target === "preview")
    && deployment.json?.meta?.rcapApplicationSha === APPLICATION_SHA
    && deployment.json?.meta?.rcapAcceptanceProjectRef === PROJECT_REF
    && deployment.json?.meta?.rcapClinicDemoMode === "mississippi_preview"
    && deployment.json?.meta?.rcapRouteState === "staging_scoped";
  if (!exactPreview) throw new Error("resolved deployment is not the exact READY staging-scoped Mississippi Preview");

  const accessCodeHash = crypto.createHash("sha256").update(ACCESS_CODE).digest("hex");
  const rows = await managementQuery(`
    do $seed$
    declare
      v_admin uuid;
      v_staff uuid;
      v_staff_partner_user uuid;
    begin
      select id into v_admin from auth.users where lower(email)='mvl-demo-admin@rcap-acceptance.test';
      select id into v_staff from auth.users where lower(email)='mvl-demo-staff@rcap-acceptance.test';
      select id into v_staff_partner_user from public.partner_users
       where auth_user_id=v_staff and partner_slug='mvl-demo' and role='partner_staff' and status='active';
      if v_admin is null or v_staff is null or v_staff_partner_user is null then
        raise exception 'bounded_mvl_auth_cohort_not_ready';
      end if;

      insert into public.clinic_events
        (id,partner_slug,public_slug,name,jurisdiction,starts_at,ends_at,timezone,location_name,geography,capacity,status,sponsorship_allocation,created_by)
      values
        ('${EVENT_ID}','mvl-demo','${EVENT_SLUG}','${EVENT_NAME}','MS',now()-interval '1 day',now()+interval '30 days','America/Chicago','Synthetic MVL Preview Clinic','Mississippi statewide',20,'published',2,v_admin)
      on conflict (id) do update set
        partner_slug='mvl-demo', public_slug='${EVENT_SLUG}', name='${EVENT_NAME}', jurisdiction='MS',
        starts_at=now()-interval '1 day', ends_at=now()+interval '30 days',
        timezone='America/Chicago', location_name='Synthetic MVL Preview Clinic',
        geography='Mississippi statewide', capacity=20, status='published',
        sponsorship_allocation=2, created_by=v_admin, updated_at=now();

      insert into public.clinic_event_staff
        (id,event_id,partner_user_id,status,permissions,approved_by,revoked_at)
      values
        ('${EVENT_STAFF_ID}','${EVENT_ID}',v_staff_partner_user,'approved',array['assist','queue','follow_up','reporting']::text[],v_admin,null)
      on conflict (id) do update set
        event_id='${EVENT_ID}', partner_user_id=v_staff_partner_user, status='approved',
        permissions=array['assist','queue','follow_up','reporting']::text[],
        approved_by=v_admin, revoked_at=null, updated_at=now();

      insert into public.clinic_event_access_codes
        (id,event_id,code_hash,code_hint,max_uses,uses_count,starts_at,expires_at,is_active,created_by)
      values
        ('${ACCESS_CODE_ID}','${EVENT_ID}','${accessCodeHash}','MVL',2,0,now()-interval '1 day',now()+interval '30 days',true,v_admin)
      on conflict (id) do update set
        event_id='${EVENT_ID}', code_hash='${accessCodeHash}', code_hint='MVL',
        max_uses=2, uses_count=0, starts_at=now()-interval '1 day', expires_at=now()+interval '30 days',
        is_active=true, created_by=v_admin, updated_at=now();

      insert into public.partner_entitlement
        (partner_slug,screenings_allowed,screenings_used,contract_note,period_label,pause_at_cap,overage_enabled)
      values
        ('mvl-demo',2,0,'Synthetic Mississippi Clinic Preview only','2026-preview',true,false)
      on conflict (partner_slug) do update set
        screenings_allowed=public.partner_entitlement.screenings_used+2,
        contract_note='Synthetic Mississippi Clinic Preview only',
        period_label='2026-preview', pause_at_cap=true, overage_enabled=false, updated_at=now();
    end $seed$;

    select e.id,e.public_slug,e.name,e.jurisdiction,e.status,e.sponsorship_allocation,
      s.id as event_staff_id,s.status as staff_status,
      c.id as access_code_id,c.is_active,c.max_uses,c.uses_count,
      p.screenings_allowed,p.screenings_used,p.pause_at_cap,p.overage_enabled
    from public.clinic_events e
    join public.clinic_event_staff s on s.id='${EVENT_STAFF_ID}' and s.event_id=e.id
    join public.clinic_event_access_codes c on c.id='${ACCESS_CODE_ID}' and c.event_id=e.id
    join public.partner_entitlement p on p.partner_slug=e.partner_slug
    where e.id='${EVENT_ID}';
  `);
  const row = Array.isArray(rows) ? rows[0] : null;
  const passed = row?.id === EVENT_ID
    && row?.public_slug === EVENT_SLUG
    && row?.name === EVENT_NAME
    && row?.jurisdiction === "MS"
    && row?.status === "published"
    && Number(row?.sponsorship_allocation) === 2
    && row?.event_staff_id === EVENT_STAFF_ID
    && row?.staff_status === "approved"
    && row?.access_code_id === ACCESS_CODE_ID
    && row?.is_active === true
    && Number(row?.max_uses) === 2
    && Number(row?.uses_count) === 0
    && Number(row?.screenings_allowed) - Number(row?.screenings_used) === 2
    && row?.pause_at_cap === true
    && row?.overage_enabled === false;
  evidence.readback = row;
  evidence.passed = passed;
  writeEvidence();
  if (!passed) throw new Error("bounded MVL seed readback did not match the exact event, staff, code, and capped entitlement contract");
  console.log(`MVL CLINIC SEED PASSED — ${EVENT_NAME}; synthetic cohort only; Production and Stripe untouched.`);
} catch (error) {
  evidence.passed = false;
  evidence.failure = error instanceof Error ? error.message : String(error);
  writeEvidence();
  throw error;
}

async function vercelJson(route, identity) {
  const response = await fetch(hostedVercelScopedUrl(route, identity), {
    headers: { Authorization: `Bearer ${VERCEL_TOKEN}` }
  });
  return { status: response.status, json: await response.json().catch(() => null) };
}

async function managementQuery(query) {
  const response = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${SUPABASE_ACCESS_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query })
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`acceptance database query failed with HTTP ${response.status}: ${text.slice(0, 300)}`);
  return JSON.parse(text);
}

function writeEvidence() {
  fs.mkdirSync(evidenceDir, { recursive: true });
  fs.writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`);
}
