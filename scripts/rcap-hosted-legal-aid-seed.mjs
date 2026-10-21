#!/usr/bin/env node

// Seeds the bounded synthetic MVLP Legal Aid training cohort in the named
// nonproduction acceptance project, for the hosted Legal Aid Clinic Mode
// browser phase. Synthetic identities on the reserved .test TLD only; the
// MVLP training organization here is the acceptance copy, never the
// Production MVLP organization. No real participant, payment, Checkout,
// Stripe, Production deployment, or production project is touched.
//
// Idempotent and bounded: every row it writes or clears is keyed to the
// fixed synthetic event, the synthetic identities, or the synthetic handoff
// organization named below, so a re-run starts the same training records
// from a clean state without touching anything else in the project.

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { prepareHostedAcceptanceEvidenceLayout } from "./rcap-hosted-acceptance-evidence-layout.mjs";
import { hostedVercelScopedUrl, resolveHostedVercelIdentity } from "./rcap-hosted-acceptance-vercel-identity.mjs";
import { LEGAL_AID_FIXTURE } from "./rcap-legal-aid/hosted-fixture.mjs";

const PROJECT_REF = (process.env.ACCEPTANCE_SUPABASE_PROJECT_REF ?? "").trim();
const APPLICATION_SHA = (process.env.HOSTED_APPLICATION_SHA ?? "").trim();
const DEPLOYMENT_ID = (process.env.HOSTED_PREVIEW_DEPLOYMENT_ID ?? "").trim();
const PREVIEW_HOSTNAME = (process.env.HOSTED_PREVIEW_HOSTNAME ?? "").trim().replace(/^https?:\/\//, "").replace(/\/+$/, "");
const SUPABASE_ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN ?? "";
const VERCEL_TOKEN = process.env.VERCEL_TOKEN ?? "";
const DEMO_PASSWORD = (process.env.HOSTED_CLINIC_DEMO_PASSWORD ?? "").trim();
const EXPECTED_PROJECT_REF = "hyflxnlhpmiqxvvcoiia";
const SUPABASE_URL = `https://${PROJECT_REF}.supabase.co`;
const F = LEGAL_AID_FIXTURE;

if (PROJECT_REF !== EXPECTED_PROJECT_REF
  || !/^[0-9a-f]{40}$/.test(APPLICATION_SHA)
  || !/^dpl_[A-Za-z0-9]+$/.test(DEPLOYMENT_ID)
  || !/^[A-Za-z0-9.-]+\.vercel\.app$/.test(PREVIEW_HOSTNAME)
  || !SUPABASE_ACCESS_TOKEN
  || !VERCEL_TOKEN
  || DEMO_PASSWORD.length < 20) {
  throw new Error("Legal Aid seed requires the exact acceptance project, application SHA, Preview identity, Vercel/Supabase credentials, and the 20+ character synthetic demo password.");
}

const { root: evidenceRoot } = prepareHostedAcceptanceEvidenceLayout({ rootDir: process.cwd() });
const evidenceDir = path.join(evidenceRoot, "legal-aid");
const evidencePath = path.join(evidenceDir, "seed.json");
const secrets = [SUPABASE_ACCESS_TOKEN, VERCEL_TOKEN, DEMO_PASSWORD];
const sanitize = (value) => {
  let text = String(value ?? "");
  for (const secret of secrets) if (secret) text = text.split(secret).join("***REDACTED***");
  return text.replace(/eyJ[A-Za-z0-9_.-]{20,}/g, "***REDACTED***");
};
const sqlText = (value) => String(value).split("'").join("''");
const shortId = (value) => crypto.createHash("sha256").update(String(value)).digest("hex").slice(0, 12);

const evidence = {
  schemaVersion: "rcap-hosted-legal-aid-seed/v1",
  applicationSha: APPLICATION_SHA,
  acceptanceProjectRef: PROJECT_REF,
  previewUrl: `https://${PREVIEW_HOSTNAME}`,
  previewDeploymentId: DEPLOYMENT_ID,
  partnerSlug: F.partnerSlug,
  handoffPartnerSlug: F.handoffPartnerSlug,
  eventId: F.eventId,
  eventSlug: F.eventSlug,
  eventName: F.eventName,
  jurisdiction: "MS",
  timezone: "America/Chicago",
  cohort: F.identities.map((identity) => ({ key: identity.key, email: identity.email, role: identity.role })),
  packetApplicant: F.packetApplicantEmail,
  passwordsRecorded: false,
  boundedWrites: [
    "synthetic auth users (create or password reset, confirmed)",
    `partner_records/partner_users rows for ${F.partnerSlug} (acceptance copy of the MVLP organization)`,
    `clinic_events row ${F.eventId} reset to a draft standard event`,
    "training records of that event cleared (registrations, intakes and their children, cases, follow-ups, policy profiles)",
    `every row of the synthetic handoff organization ${F.handoffPartnerSlug} cleared`
  ],
  productionTouched: false,
  stripeTouched: false
};

try {
  // --- the exact Preview this run seeds for --------------------------------
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

  // --- synthetic identities ------------------------------------------------
  const keys = await supabaseKeys();
  const users = [];
  for (const spec of F.identities) {
    const user = await ensureSyntheticUser({ email: spec.email, keys });
    users.push({ ...spec, id: user.id });
  }
  const packetApplicantRows = await managementQuery(`select id from auth.users where lower(email)='${sqlText(F.packetApplicantEmail)}' limit 1`);
  const packetApplicantId = Array.isArray(packetApplicantRows) ? packetApplicantRows[0]?.id ?? null : null;
  if (!packetApplicantId) throw new Error("the Clinic Preview participant who holds the sponsored Mississippi packet does not exist; run the Clinic seed and journey first");
  evidence.identities = users.map((user) => ({ key: user.key, role: user.role, idHash: shortId(user.id) }));
  evidence.packetApplicantIdHash = shortId(packetApplicantId);

  const byKey = Object.fromEntries(users.map((user) => [user.key, user]));
  const membershipRows = users.filter((user) => user.role !== "participant" && user.role !== "auth_only").map((user) =>
    `('${user.id}',${user.role === "internal_admin" ? "null" : `'${F.partnerSlug}'`},'${user.role}','active','${sqlText(user.email)}')`);
  const noMembership = users.filter((user) => user.role === "participant" || user.role === "auth_only").map((user) => `'${user.id}'`);

  // --- bounded reset and seed ----------------------------------------------
  const rows = await managementQuery(`
    do $seed$
    begin
      -- The acceptance copy of the MVLP organization.
      insert into public.partner_records (partner_id,partner_slug,partner_name,program_tier,payment_status,qualification_status,provisioning_status)
      values ('rcap-hosted-mvlp-training','${F.partnerSlug}','Mississippi Volunteer Lawyers Project (acceptance training copy)','sponsored','paid','qualified','provisioned')
      on conflict (partner_slug) do update set partner_name=excluded.partner_name, updated_at=now();

      -- Memberships for the synthetic cohort; participants and the handoff
      -- replacement carry no membership at all.
      delete from public.partner_users where auth_user_id in (${noMembership.join(",")});
      insert into public.partner_users (auth_user_id,partner_slug,role,status,invited_email)
      values ${membershipRows.join(",\n             ")}
      on conflict (auth_user_id) do update set partner_slug=excluded.partner_slug, role=excluded.role, status='active', invited_email=excluded.invited_email, updated_at=now();

      -- Clear this event's training records and the synthetic handoff
      -- organization, then reset the event to a draft standard event.
      delete from public.legal_aid_intakes where event_id='${F.eventId}';
      delete from public.clinic_registrations where event_id='${F.eventId}';
      delete from public.clinic_follow_ups where event_id='${F.eventId}';
      delete from public.clinic_cases where event_id='${F.eventId}';
      delete from public.clinic_event_staff where event_id='${F.eventId}';
      delete from public.clinic_event_audit where event_id='${F.eventId}';
      update public.clinic_events set policy_profile_id=null, experience='standard', status='draft' where id='${F.eventId}';
      delete from public.legal_aid_policy_profiles where partner_slug='${F.partnerSlug}';

      insert into public.clinic_events (id,partner_slug,public_slug,name,jurisdiction,starts_at,ends_at,timezone,location_name,geography,capacity,status,sponsorship_allocation,created_by)
      values ('${F.eventId}','${F.partnerSlug}','${F.eventSlug}','${sqlText(F.eventName)}','MS',now()+interval '14 days',now()+interval '14 days 6 hours','America/Chicago','Training venue (synthetic)','Hinds County, Mississippi',${F.capacity},'draft',null,'${byKey.ADMIN_A.id}')
      on conflict (id) do update set
        partner_slug='${F.partnerSlug}', public_slug='${F.eventSlug}', name='${sqlText(F.eventName)}', jurisdiction='MS',
        starts_at=now()+interval '14 days', ends_at=now()+interval '14 days 6 hours', timezone='America/Chicago',
        location_name='Training venue (synthetic)', geography='Hinds County, Mississippi', capacity=${F.capacity},
        status='draft', sponsorship_allocation=null, created_by='${byKey.ADMIN_A.id}', experience='standard', policy_profile_id=null, updated_at=now();

      delete from public.partner_users where partner_slug='${F.handoffPartnerSlug}';
      delete from public.partner_events where partner_slug='${F.handoffPartnerSlug}';
      delete from public.partner_onboarding where partner_slug='${F.handoffPartnerSlug}';
      delete from public.partner_access_codes where partner_slug='${F.handoffPartnerSlug}';
      delete from public.partner_entitlement where partner_slug='${F.handoffPartnerSlug}';
      delete from public.partner_records where partner_slug='${F.handoffPartnerSlug}';
    end $seed$;

    select
      (select count(*) from public.partner_users where partner_slug='${F.partnerSlug}' and status='active' and role='partner_admin') as admins,
      (select count(*) from public.partner_users where partner_slug='${F.partnerSlug}' and status='active' and role='partner_staff') as staff,
      (select count(*) from public.partner_users where auth_user_id='${byKey.INTERNAL_ADMIN.id}' and role='internal_admin' and partner_slug is null and status='active') as internal_admin,
      (select count(*) from public.partner_users where auth_user_id in (${noMembership.join(",")})) as participant_memberships,
      (select count(*) from public.clinic_registrations where event_id='${F.eventId}') as registrations,
      (select count(*) from public.legal_aid_intakes where event_id='${F.eventId}') as intakes,
      (select count(*) from public.legal_aid_policy_profiles where partner_slug='${F.partnerSlug}') as profiles,
      (select count(*) from public.partner_records where partner_slug='${F.handoffPartnerSlug}') as handoff_partner_rows,
      e.id, e.public_slug, e.status, e.experience, e.capacity, e.jurisdiction, e.policy_profile_id
    from public.clinic_events e where e.id='${F.eventId}';
  `);
  const row = Array.isArray(rows) ? rows[0] : null;
  const passed = row?.id === F.eventId
    && row?.public_slug === F.eventSlug
    && row?.status === "draft"
    && row?.experience === "standard"
    && Number(row?.capacity) === F.capacity
    && row?.jurisdiction === "MS"
    && row?.policy_profile_id === null
    && Number(row?.admins) === 2
    && Number(row?.staff) === 4
    && Number(row?.internal_admin) === 1
    && Number(row?.participant_memberships) === 0
    && Number(row?.registrations) === 0
    && Number(row?.intakes) === 0
    && Number(row?.profiles) === 0
    && Number(row?.handoff_partner_rows) === 0;
  evidence.readback = row;
  evidence.passed = passed;
  writeEvidence();
  if (!passed) throw new Error("bounded Legal Aid seed readback did not match the exact event, cohort and clean-state contract");
  console.log(`LEGAL AID SEED PASSED — ${F.eventName}; synthetic cohort only; Production and Stripe untouched.`);
} catch (error) {
  evidence.passed = false;
  evidence.failure = sanitize(error instanceof Error ? error.message : String(error));
  writeEvidence();
  throw error;
}

async function vercelJson(route, identity) {
  const response = await fetch(hostedVercelScopedUrl(route, identity), { headers: { Authorization: `Bearer ${VERCEL_TOKEN}` } });
  return { status: response.status, json: await response.json().catch(() => null) };
}

async function managementQuery(query) {
  const response = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${SUPABASE_ACCESS_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query })
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`acceptance database query failed with HTTP ${response.status}: ${sanitize(text).slice(0, 300)}`);
  return JSON.parse(text);
}

async function supabaseKeys() {
  const response = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/api-keys?reveal=true`, { headers: { Authorization: `Bearer ${SUPABASE_ACCESS_TOKEN}` } });
  const list = await response.json().catch(() => null);
  const pick = (name) => Array.isArray(list) ? list.find((entry) => entry.name === name)?.api_key ?? null : null;
  if (!response.ok || !pick("anon") || !pick("service_role")) throw new Error(`could not read the acceptance project's anon/service_role keys (HTTP ${response.status})`);
  return { anon: pick("anon"), service: pick("service_role") };
}

// Idempotent: an existing identity has its password reset to the demo
// password and stays confirmed; a missing one is created confirmed. The
// sign-in afterwards is the assertion that matters. Passwords are never
// written to evidence.
async function ensureSyntheticUser({ email, keys }) {
  if (!email.endsWith("@rcap-acceptance.test")) throw new Error("only reserved .test identities may be seeded");
  const rows = await managementQuery(`select id from auth.users where lower(email)=lower('${sqlText(email)}') limit 1`);
  let userId = Array.isArray(rows) ? rows[0]?.id ?? null : null;
  const headers = { apikey: keys.service, Authorization: `Bearer ${keys.service}`, "Content-Type": "application/json" };
  if (!userId) {
    const created = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, { method: "POST", headers, body: JSON.stringify({ email, password: DEMO_PASSWORD, email_confirm: true }) });
    const body = await created.json().catch(() => null);
    userId = body?.id ?? body?.user?.id ?? null;
    if (!created.ok || !userId) throw new Error(`could not create ${email.split("@")[0]} (HTTP ${created.status})`);
  } else {
    const updated = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${encodeURIComponent(userId)}`, { method: "PUT", headers, body: JSON.stringify({ password: DEMO_PASSWORD, email_confirm: true }) });
    if (!updated.ok) throw new Error(`could not reset synthetic ${email.split("@")[0]} (HTTP ${updated.status})`);
  }
  const signedIn = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: keys.anon, Authorization: `Bearer ${keys.anon}`, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: DEMO_PASSWORD })
  });
  const session = await signedIn.json().catch(() => null);
  if (!signedIn.ok || !session?.access_token) throw new Error(`could not sign in ${email.split("@")[0]} (HTTP ${signedIn.status})`);
  return { id: userId, email };
}

function writeEvidence() {
  fs.mkdirSync(evidenceDir, { recursive: true });
  fs.writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`);
}
