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
//   * It writes only `site_url` and `uri_allow_list`. It does not change
//     providers, JWT settings, session lifetimes, MFA, or any RLS policy.
//
// The identities are created confirmed through the admin API so no mail catcher
// is needed against a hosted project, and their UUIDs are emitted because those
// UUIDs — not the email addresses — are what the delivery control's staging
// scope names.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const EVIDENCE_DIR = path.join(rootDir, "hosted-acceptance-evidence");
fs.mkdirSync(EVIDENCE_DIR, { recursive: true });

const SUPABASE_ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN ?? "";
const PROJECT_REF = process.env.ACCEPTANCE_SUPABASE_PROJECT_REF ?? "";
const APPLICATION_SHA = process.env.HOSTED_APPLICATION_SHA ?? "";
const VERCEL_TOKEN = process.env.VERCEL_TOKEN ?? "";
const VERCEL_ORG_ID = process.env.VERCEL_ORG_ID ?? "";
const VERCEL_PROJECT_ID = process.env.VERCEL_PROJECT_ID ?? "";

if (!SUPABASE_ACCESS_TOKEN || !/^[a-z]{20}$/.test(PROJECT_REF) || !/^[0-9a-f]{40}$/.test(APPLICATION_SHA)) {
  console.error("AUTH: SUPABASE_ACCESS_TOKEN, a well-formed ACCEPTANCE_SUPABASE_PROJECT_REF and HOSTED_APPLICATION_SHA are required");
  process.exit(1);
}
if (!VERCEL_TOKEN || !VERCEL_ORG_ID || !VERCEL_PROJECT_ID) {
  console.error("AUTH: VERCEL_TOKEN, VERCEL_ORG_ID and VERCEL_PROJECT_ID are required to discover the Preview deployment");
  process.exit(1);
}

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
  "identities_are_obviously_synthetic"
];

async function vercelApi(pathname) {
  const joiner = pathname.includes("?") ? "&" : "?";
  const param = VERCEL_ORG_ID.startsWith("team_") ? "teamId" : "slug";
  const res = await fetch(`https://api.vercel.com${pathname}${joiner}${param}=${encodeURIComponent(VERCEL_ORG_ID)}`, {
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
const USERS = [
  { key: "A", email: "acceptance-consumer-a@rcap-acceptance.test", password: "Acceptance-a-4f7c21!" },
  { key: "B", email: "acceptance-consumer-b@rcap-acceptance.test", password: "Acceptance-b-8d3e95!" }
];

const evidence = {
  schemaVersion: "rcap-hosted-acceptance-auth/v1",
  acceptanceProjectRef: PROJECT_REF,
  applicationSha: APPLICATION_SHA,
  wroteOnly: ["site_url", "uri_allow_list"],
  touchedProductionProject: false
};

// --- 1. Discover the Preview deployment, on the same terms as the deploy step -
let previewUrl = null;
{
  const res = await vercelApi(`/v6/deployments?projectId=${encodeURIComponent(VERCEL_PROJECT_ID)}&limit=100&state=READY`);
  const candidates = Array.isArray(res.json?.deployments) ? res.json.deployments : [];
  const match = candidates.find(
    (d) =>
      (d.readyState ?? d.state) === "READY" &&
      d.target !== "production" &&
      d.meta?.rcapApplicationSha === APPLICATION_SHA
  );
  previewUrl = match ? `https://${match.url}` : null;
  record(
    "preview_deployment_discovered",
    Boolean(previewUrl),
    previewUrl
      ? `${previewUrl} — READY, target=${JSON.stringify(match.target ?? null)}, rcapApplicationSha=${APPLICATION_SHA}`
      : `no READY non-production deployment carrying rcapApplicationSha=${APPLICATION_SHA} among ${candidates.length} candidate(s)`
  );
  if (!previewUrl) finish();
  evidence.previewUrl = previewUrl;
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

  const created = [];
  const notes = [];
  for (const user of USERS) {
    // Idempotent: a 422 here means the identity already exists from an earlier
    // acceptance run, which is a pass, not a failure. The sign-in below is the
    // assertion that matters either way.
    await supabase("/auth/v1/admin/users", {
      method: "POST",
      key: service,
      body: { email: user.email, password: user.password, email_confirm: true }
    });
    const signIn = await supabase("/auth/v1/token?grant_type=password", {
      method: "POST",
      key: anon,
      body: { email: user.email, password: user.password }
    });
    if (signIn.status === 200 && signIn.json?.user?.id) {
      created.push({ key: user.key, email: user.email, id: signIn.json.user.id });
    } else {
      notes.push(`${user.key}: sign-in ${signIn.status}`);
    }
  }

  record(
    "synthetic_identities_exist_and_sign_in",
    created.length === USERS.length,
    created.length === USERS.length
      ? `${created.length} GoTrue identities confirmed and signed in against ${SUPABASE_URL}`
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

  evidence.identities = created;
  // What the scoped state must be given, and nothing more: the two UUIDs.
  evidence.stagingScope = created.map((u) => u.id).join(",");
  // Only participant A is admitted in the admission test; B stays out of scope
  // on purpose so the matrix can tell "admitted" from "everyone gets in".
  evidence.stagingScopeAdmittingAOnly = created.find((u) => u.key === "A")?.id ?? null;
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
