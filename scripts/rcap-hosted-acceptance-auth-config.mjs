#!/usr/bin/env node
// Hosted acceptance staging — Supabase Auth configuration and synthetic identities.
//
// Points the ACCEPTANCE project's GoTrue at the hosted Preview deployment so a
// real sign-in link opens the deployed application rather than localhost, and
// creates the named synthetic participants the scoped delivery state will be
// allowed to admit.
//
// Three things this deliberately will not do:
//
//   * It never touches a project other than ACCEPTANCE_SUPABASE_PROJECT_REF,
//     and it refuses to run at all unless that ref is well-formed. The
//     production project is never named, read, or written here.
//   * It does not invent the Preview URL. The host is DISCOVERED from Vercel
//     using the same predicate the deploy step uses — READY, not
//     production-target, and carrying rcapApplicationSha equal to the frozen
//     SHA — so a stale or unrelated deployment cannot become the auth callback
//     target by accident.
//   * Auth configuration writes only `site_url` and `uri_allow_list`. In the
//     bounded Mississippi mode it also upserts the one synthetic mvl-demo
//     partner and its two synthetic partner roles. It does not change
//     providers, JWT settings, session lifetimes, MFA, or any RLS policy.
//
// The identities are created confirmed through the admin API so no mail catcher
// is needed against a hosted project, and their UUIDs are emitted because those
// UUIDs — not the email addresses — are what the delivery control's staging
// scope names.

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { prepareHostedAcceptanceEvidenceLayout } from "./rcap-hosted-acceptance-evidence-layout.mjs";
import {
  hostedVercelScopedUrl,
  resolveHostedVercelIdentity
} from "./rcap-hosted-acceptance-vercel-identity.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { root: EVIDENCE_DIR } = prepareHostedAcceptanceEvidenceLayout({ rootDir });

const SUPABASE_ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN ?? "";
const PROJECT_REF = process.env.ACCEPTANCE_SUPABASE_PROJECT_REF ?? "";
const APPLICATION_SHA = process.env.HOSTED_APPLICATION_SHA ?? "";
const EXACT_DEPLOYMENT_ID = process.env.HOSTED_PREVIEW_DEPLOYMENT_ID ?? "";
const EXACT_PREVIEW_HOSTNAME = (process.env.HOSTED_PREVIEW_HOSTNAME ?? "").replace(/^https?:\/\//, "").replace(/\/+$/, "");
const VERCEL_TOKEN = process.env.VERCEL_TOKEN ?? "";
const EXPECTED_PROJECT_REF = "hyflxnlhpmiqxvvcoiia";
const CLINIC_DEMO_MODE = (process.env.HOSTED_CLINIC_DEMO_MODE ?? "").trim();
const MISSISSIPPI_PREVIEW_MODE = CLINIC_DEMO_MODE === "mississippi_preview";

if (!SUPABASE_ACCESS_TOKEN
  || PROJECT_REF !== EXPECTED_PROJECT_REF
  || !/^[0-9a-f]{40}$/.test(APPLICATION_SHA)
  || !/^dpl_[A-Za-z0-9]+$/.test(EXACT_DEPLOYMENT_ID)
  || !/^[A-Za-z0-9.-]+\.vercel\.app$/.test(EXACT_PREVIEW_HOSTNAME)) {
  console.error("AUTH: acceptance credentials, final application SHA, and one exact resolved Preview identity are required");
  process.exit(1);
}
if (!VERCEL_TOKEN) {
  console.error("AUTH: VERCEL_TOKEN is required to resolve the pinned nonproduction Preview project");
  process.exit(1);
}
const VERCEL_IDENTITY = await resolveHostedVercelIdentity({ token: VERCEL_TOKEN });

const SUPABASE_URL = `https://${PROJECT_REF}.supabase.co`;

const verdicts = new Map();
function record(caseId, passed, observed) {
  verdicts.set(caseId, { passed, observed });
  console.log(`  ${passed ? "ok  " : "FAIL"} ${caseId} — ${observed}`);
}

const REQUIRED_CASES = [
  "preview_deployment_discovered",
  "auth_callbacks_point_at_the_preview_deployment",
  "synthetic_identities_exist_and_sign_in",
  "identities_are_obviously_synthetic",
  ...(MISSISSIPPI_PREVIEW_MODE ? ["preview_scope_is_exactly_participants_a_and_b"] : []),
  MISSISSIPPI_PREVIEW_MODE ? "clinic_partner_roles_are_provisioned" : "internal_admin_identity_is_provisioned"
];

async function vercelApi(pathname) {
  const res = await fetch(hostedVercelScopedUrl(pathname, VERCEL_IDENTITY), {
    headers: { Authorization: `Bearer ${VERCEL_TOKEN}` }
  });
  let json = null;
  try { json = JSON.parse(await res.text()); } catch { /* non-JSON surfaces as null */ }
  return { status: res.status, json };
}

async function managementApi(pathname, { method = "GET", body = null } = {}) {
  const res = await fetch(`https://api.supabase.com${pathname}`, {
    method,
    headers: { Authorization: `Bearer ${SUPABASE_ACCESS_TOKEN}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* non-JSON surfaces through text */ }
  return { ok: res.ok, status: res.status, json, text: text.slice(0, 300) };
}

async function supabase(pathname, { method = "GET", key, token = null, body = null } = {}) {
  const res = await fetch(`${SUPABASE_URL}${pathname}`, {
    method,
    headers: { apikey: key, Authorization: `Bearer ${token ?? key}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined
  });
  let json = null;
  try { json = JSON.parse(await res.clone().text()); } catch { /* non-JSON is fine */ }
  return { status: res.status, json };
}

// Deterministic, namespaced to this environment, and on a reserved-for-testing
// TLD so these addresses can never resolve to a real inbox.
const LEGACY_USERS = [
  { key: "A", email: "acceptance-consumer-a@rcap-acceptance.test", password: "Acceptance-a-4f7c21!" },
  { key: "B", email: "acceptance-consumer-b@rcap-acceptance.test", password: "Acceptance-b-8d3e95!" }
];

// The internal review galleries — /internal/record-clearing/** — are behind
// `resolveInternalAdminPageAccess`, so an anonymous request gets a gate shell
// with a 200, not the state. Opening a gallery on a phone therefore needs an
// identity that `resolveSessionPartner` classifies as internal_admin: an active
// partner_users row, role internal_admin, and partner_slug NULL — the code
// rejects an internal admin that carries a partner slug.
const INTERNAL_ADMIN = {
  key: "ADMIN",
  email: "acceptance-internal-admin@rcap-acceptance.test",
  password: "Acceptance-admin-2b6f04!"
};

function syntheticPassword(email) {
  const material = crypto.createHmac("sha256", SUPABASE_ACCESS_TOKEN)
    .update(`rcap-ms-clinic-preview:${email}`)
    .digest("base64url");
  return `Acceptance-${material.slice(0, 32)}!`;
}

const MS_CLINIC_IDENTITIES = [
  { key: "PARTNER_ADMIN", role: "partner_admin", email: "mvl-demo-admin@rcap-acceptance.test" },
  { key: "CLINIC_STAFF", role: "partner_staff", email: "mvl-demo-staff@rcap-acceptance.test" },
  { key: "A", role: "participant", email: "mvl-demo-participant-a@rcap-acceptance.test" },
  { key: "B", role: "participant", email: "mvl-demo-participant-b@rcap-acceptance.test" }
].map((identity) => ({ ...identity, password: syntheticPassword(identity.email) }));

const IDENTITIES = MISSISSIPPI_PREVIEW_MODE
  ? MS_CLINIC_IDENTITIES
  : [...LEGACY_USERS, { ...INTERNAL_ADMIN, role: "internal_admin" }];

const evidence = {
  schemaVersion: "rcap-hosted-acceptance-auth/v1",
  acceptanceProjectRef: PROJECT_REF,
  applicationSha: APPLICATION_SHA,
  authConfigurationFieldsWritten: ["site_url", "uri_allow_list"],
  boundedDataWrites: MISSISSIPPI_PREVIEW_MODE
    ? ["four synthetic auth users", "mvl-demo partner record", "two mvl-demo partner role rows"]
    : ["three synthetic auth users", "one internal-admin partner role row"],
  touchedProductionProject: false
};
evidence.cohort = MISSISSIPPI_PREVIEW_MODE ? "bounded_mvl_demo_four_identity_cohort" : "legacy_hosted_acceptance";

// --- 1. Re-read the one Preview resolved by the workflow boundary ------------
let previewUrl = null;
{
  const res = await vercelApi(`/v13/deployments/${encodeURIComponent(EXACT_DEPLOYMENT_ID)}`);
  const match = res.json;
  const exact = res.status === 200
    && match?.id === EXACT_DEPLOYMENT_ID
    && match?.url === EXACT_PREVIEW_HOSTNAME
    && (match?.readyState ?? match?.state) === "READY"
    && (match?.target === null || match?.target === "preview")
    && match?.meta?.rcapApplicationSha === APPLICATION_SHA
    && match?.meta?.rcapAcceptanceProjectRef === PROJECT_REF;
  previewUrl = exact ? `https://${EXACT_PREVIEW_HOSTNAME}` : null;
  record(
    "preview_deployment_discovered",
    Boolean(previewUrl),
    previewUrl
      ? `${previewUrl} — READY, target=${JSON.stringify(match.target ?? null)}, rcapApplicationSha=${APPLICATION_SHA}`
      : `resolved deployment ${EXACT_DEPLOYMENT_ID} did not preserve the exact READY nonproduction candidate contract`
  );
  if (!previewUrl) finish();
  evidence.previewUrl = previewUrl;
  evidence.previewDeploymentId = EXACT_DEPLOYMENT_ID;
}

// --- 2. Point GoTrue at the Preview deployment --------------------------------
{
  // Vercel gives every Preview deployment its own immutable host, so the
  // allow-list carries the exact deployment URL plus its callback path rather
  // than a wildcard. A wildcard here would let any deployment in the project —
  // including a future one nobody has reviewed — receive an auth callback.
  const allowList = [
    `${previewUrl}/**`,
    `${previewUrl}/auth/callback`,
    `${previewUrl}/api/auth/callback`
  ];

  const before = await managementApi(`/v1/projects/${PROJECT_REF}/config/auth`);
  const patch = await managementApi(`/v1/projects/${PROJECT_REF}/config/auth`, {
    method: "PATCH",
    body: { site_url: previewUrl, uri_allow_list: allowList.join(",") }
  });
  const after = await managementApi(`/v1/projects/${PROJECT_REF}/config/auth`);

  const siteOk = after.json?.site_url === previewUrl;
  const listOk = typeof after.json?.uri_allow_list === "string" && after.json.uri_allow_list.includes(previewUrl);
  record(
    "auth_callbacks_point_at_the_preview_deployment",
    patch.ok && siteOk && listOk,
    `PATCH ${patch.status}; site_url now ${JSON.stringify(after.json?.site_url ?? null)} (was ${JSON.stringify(before.json?.site_url ?? null)}); allow-list contains the deployment host: ${listOk}`
  );
  evidence.auth = { siteUrl: after.json?.site_url ?? null, allowListEntries: allowList.length };
}

// --- 3. Create the synthetic participants ------------------------------------
{
  const keys = await managementApi(`/v1/projects/${PROJECT_REF}/api-keys?reveal=true`);
  const list = Array.isArray(keys.json) ? keys.json : [];
  const anon = list.find((k) => k.name === "anon")?.api_key ?? "";
  const service = list.find((k) => k.name === "service_role")?.api_key ?? "";
  if (!anon || !service) {
    record("synthetic_identities_exist_and_sign_in", false, `could not read the acceptance project's anon/service_role keys (${keys.status})`);
    record("identities_are_obviously_synthetic", false, "not reached");
    finish();
  }

  // The runner's own build of the frozen application needs the public Supabase
  // pair at BUILD time — several dashboard pages prerender through the auth
  // client and throw without it. Masked first so neither value can surface in a
  // log line, then handed to later steps through the environment file rather
  // than through a command line.
  if (process.env.GITHUB_ENV) {
    console.log(`::add-mask::${anon}`);
    fs.appendFileSync(process.env.GITHUB_ENV, `NEXT_PUBLIC_SUPABASE_URL=${SUPABASE_URL}\nNEXT_PUBLIC_SUPABASE_ANON_KEY=${anon}\n`);
  }

  const created = [];
  const notes = [];
  for (const user of IDENTITIES) {
    // Idempotent: a 422 here means the identity already exists from an earlier
    // acceptance run, which is a pass, not a failure. The sign-in below is the
    // assertion that matters either way.
    const create = await supabase("/auth/v1/admin/users", {
      method: "POST",
      key: service,
      body: { email: user.email, password: user.password, email_confirm: true }
    });
    let signIn = await supabase("/auth/v1/token?grant_type=password", {
      method: "POST",
      key: anon,
      body: { email: user.email, password: user.password }
    });
    if (signIn.status !== 200 && create.status === 422) {
      const lookup = await managementApi(`/v1/projects/${PROJECT_REF}/database/query`, {
        method: "POST",
        body: { query: `select id from auth.users where lower(email)=lower('${user.email.replaceAll("'", "''")}') limit 1` }
      });
      const id = Array.isArray(lookup.json) ? lookup.json[0]?.id : null;
      if (id) {
        await supabase(`/auth/v1/admin/users/${encodeURIComponent(id)}`, {
          method: "PUT",
          key: service,
          body: { password: user.password, email_confirm: true }
        });
        signIn = await supabase("/auth/v1/token?grant_type=password", {
          method: "POST",
          key: anon,
          body: { email: user.email, password: user.password }
        });
      }
    }
    if (signIn.status === 200 && signIn.json?.user?.id) {
      created.push({ key: user.key, email: user.email, id: signIn.json.user.id });
    } else {
      notes.push(`${user.key}: sign-in ${signIn.status}`);
    }
  }

  const expected = IDENTITIES.length;
  record(
    "synthetic_identities_exist_and_sign_in",
    created.length === expected,
    created.length === expected
      ? `${created.length} controlled synthetic identities confirmed and signed in against ${SUPABASE_URL}`
      : `identity setup incomplete: ${notes.join("; ")}`
  );

  // The scope names UUIDs, but a human reading the acceptance database must be
  // able to tell at a glance that no real person is in it.
  const synthetic = created.every((u) => u.email.endsWith("@rcap-acceptance.test"));
  record(
    "identities_are_obviously_synthetic",
    synthetic && created.length > 0,
    `every acceptance identity is on the reserved .test TLD under @rcap-acceptance.test — ${created.map((u) => u.email).join(", ")}`
  );

  evidence.identities = created.map((identity) => ({
    key: identity.key,
    email: identity.email,
    id: identity.id,
    role: IDENTITIES.find((entry) => entry.key === identity.key)?.role ?? null
  }));
  // The scope names CONSUMERS only. An internal admin is a reviewer, not a
  // paying participant, and putting that identity in the delivery scope would
  // blur the one distinction the scoped state exists to make.
  evidence.stagingScope = created
    .filter((u) => MISSISSIPPI_PREVIEW_MODE ? (u.key === "A" || u.key === "B") : u.key !== "ADMIN")
    .map((u) => u.id)
    .join(",");
  // Only participant A is admitted in the admission test; B stays out of scope
  // on purpose so the matrix can tell "admitted" from "everyone gets in".
  evidence.stagingScopeAdmittingAOnly = created.find((u) => u.key === "A")?.id ?? null;

  if (MISSISSIPPI_PREVIEW_MODE) {
    const deployment = await vercelApi(`/v13/deployments/${encodeURIComponent(EXACT_DEPLOYMENT_ID)}`);
    const expectedScopeHash = crypto.createHash("sha256").update(evidence.stagingScope).digest("hex");
    const exactScope = evidence.stagingScope.split(",").filter(Boolean).length === 2
      && deployment.json?.meta?.rcapClinicDemoMode === "mississippi_preview"
      && deployment.json?.meta?.rcapStagingScopeSha256 === expectedScopeHash
      && deployment.json?.meta?.rcapRouteState === "staging_scoped";
    record(
      "preview_scope_is_exactly_participants_a_and_b",
      exactScope,
      `scope UUID count=2; metadata scope hash exact=${deployment.json?.meta?.rcapStagingScopeSha256 === expectedScopeHash}; route state=${deployment.json?.meta?.rcapRouteState ?? "absent"}`
    );
  }

  // --- 4. Give the internal admin the identity the gallery gate requires -----
  if (MISSISSIPPI_PREVIEW_MODE) {
    const admin = created.find((u) => u.key === "PARTNER_ADMIN");
    const staff = created.find((u) => u.key === "CLINIC_STAFF");
    if (!admin || !staff) {
      record("clinic_partner_roles_are_provisioned", false, "partner administrator or clinic staff identity did not sign in");
      finish();
    }
    const upsert = await managementApi(`/v1/projects/${PROJECT_REF}/database/query`, {
      method: "POST",
      body: {
        query: `
          insert into public.partner_records
            (partner_id,partner_slug,partner_name,organization_name,program_tier,payment_status,qualification_status,provisioning_status)
          values
            ('mvl-demo','mvl-demo','Mississippi Volunteer Lawyers Demo','Mississippi Volunteer Lawyers Demo','sponsored','paid','qualified','provisioned')
          on conflict (partner_slug) do update set
            partner_name=excluded.partner_name,
            organization_name=excluded.organization_name,
            program_tier='sponsored',
            payment_status='paid',
            qualification_status='qualified',
            provisioning_status='provisioned',
            updated_at=now();

          insert into public.partner_users (auth_user_id,partner_slug,role,status,invited_email)
          values
            ('${admin.id}','mvl-demo','partner_admin','active','${admin.email}'),
            ('${staff.id}','mvl-demo','partner_staff','active','${staff.email}')
          on conflict (auth_user_id) do update set
            partner_slug=excluded.partner_slug,
            role=excluded.role,
            status='active',
            invited_email=excluded.invited_email,
            updated_at=now();

          select id,auth_user_id,partner_slug,role,status
            from public.partner_users
           where auth_user_id in ('${admin.id}','${staff.id}')
           order by role;
        `
      }
    });
    const roles = Array.isArray(upsert.json) ? upsert.json : [];
    const adminRow = roles.find((row) => row.auth_user_id === admin.id);
    const staffRow = roles.find((row) => row.auth_user_id === staff.id);
    const exact = roles.length === 2
      && adminRow?.partner_slug === "mvl-demo" && adminRow?.role === "partner_admin" && adminRow?.status === "active"
      && staffRow?.partner_slug === "mvl-demo" && staffRow?.role === "partner_staff" && staffRow?.status === "active";
    record("clinic_partner_roles_are_provisioned", exact, `mvl-demo partner roles exact=${exact}; rows=${roles.length}; no password or token recorded`);
    evidence.partner = { slug: "mvl-demo", name: "Mississippi Volunteer Lawyers Demo" };
    evidence.partnerUsers = roles.map((row) => ({ id: row.id, authUserId: row.auth_user_id, role: row.role, status: row.status }));
    finish();
  }

  const admin = created.find((u) => u.key === "ADMIN");
  if (!admin) {
    record("internal_admin_identity_is_provisioned", false, "the internal admin identity never signed in, so no partner_users row was written");
    finish();
  }

  // Idempotent, and deliberately narrow: it writes exactly one row, for exactly
  // this auth user, with partner_slug NULL. It does not grant anything to any
  // other identity and it touches no policy.
  const upsert = await managementApi(`/v1/projects/${PROJECT_REF}/database/query`, {
    method: "POST",
    body: {
      query: `
        insert into public.partner_users (auth_user_id, partner_slug, role, status, invited_email)
        values ('${admin.id}', null, 'internal_admin', 'active', '${admin.email}')
        on conflict do nothing;
        update public.partner_users
           set role = 'internal_admin', status = 'active', partner_slug = null, updated_at = now()
         where auth_user_id = '${admin.id}';
        select auth_user_id, role, status, partner_slug
          from public.partner_users
         where auth_user_id = '${admin.id}';
      `
    }
  });
  const rows = Array.isArray(upsert.json) ? upsert.json : [];
  const row = rows.find((r) => r?.auth_user_id === admin.id);
  // Exactly one row: resolveSessionPartner throws partner_identity_ambiguous on
  // two, so "a row exists" is not the property that matters — "one row exists"
  // is.
  const exactlyOne = rows.filter((r) => r?.auth_user_id === admin.id).length === 1;
  record(
    "internal_admin_identity_is_provisioned",
    Boolean(row) && exactlyOne && row.role === "internal_admin" && row.status === "active" && row.partner_slug === null,
    row
      ? `partner_users row for ${admin.email}: role=${row.role}, status=${row.status}, partner_slug=${JSON.stringify(row.partner_slug)}, exactly one row: ${exactlyOne}`
      : `no partner_users row came back for the internal admin (query status ${upsert.status})`
  );
  evidence.internalAdmin = { email: admin.email, id: admin.id };
}

finish();

function finish() {
  const missing = REQUIRED_CASES.filter((caseId) => !verdicts.has(caseId));
  const failed = [...verdicts.entries()].filter(([, v]) => !v.passed).map(([caseId]) => caseId);
  evidence.requiredCases = REQUIRED_CASES;
  evidence.missingCases = missing;
  evidence.failedCases = failed;
  evidence.passed = missing.length === 0 && failed.length === 0;
  fs.writeFileSync(path.join(EVIDENCE_DIR, "auth-config.json"), `${JSON.stringify(evidence, null, 2)}\n`);

  console.log("");
  if (missing.length > 0) console.error(`AUTH INCOMPLETE — no verdict for: ${missing.join(", ")}`);
  if (failed.length > 0) console.error(`AUTH FAILED — ${failed.join(", ")}`);
  if (evidence.passed) {
    console.log(`AUTH PASSED — ${PROJECT_REF} callbacks point at ${evidence.previewUrl}`);
    console.log(`  staging scope (UUIDs): ${evidence.stagingScope}`);
  }
  process.exit(evidence.passed ? 0 : 1);
}
