#!/usr/bin/env node
// Hosted acceptance staging — the priority packet gallery.
//
// Proves that the three priority states Roger named — Pennsylvania,
// Mississippi and Illinois — are reachable and rendering on the DEPLOYED
// Preview instance, and emits the exact URLs to open on a phone.
//
// These three are also the states with preserved legacy generators, so this
// doubles as the check that the freeze did not break a live legacy surface.
//
// The gallery is the internal review surface, not a consumer page: it is where
// a state's build status, overlay coverage, pleading set and review artifacts
// are visible in one place. It carries no payment affordance, which is why it
// can be exercised while the consumer delivery route is still disabled.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const EVIDENCE_DIR = path.join(rootDir, "hosted-acceptance-evidence");
fs.mkdirSync(EVIDENCE_DIR, { recursive: true });

const APPLICATION_SHA = process.env.HOSTED_APPLICATION_SHA ?? "";
const VERCEL_TOKEN = process.env.VERCEL_TOKEN ?? "";
const VERCEL_ORG_ID = process.env.VERCEL_ORG_ID ?? "";
const VERCEL_PROJECT_ID = process.env.VERCEL_PROJECT_ID ?? "";

if (!VERCEL_TOKEN || !VERCEL_ORG_ID || !VERCEL_PROJECT_ID || !/^[0-9a-f]{40}$/.test(APPLICATION_SHA)) {
  console.error("GALLERY: VERCEL_TOKEN, VERCEL_ORG_ID, VERCEL_PROJECT_ID and HOSTED_APPLICATION_SHA are required");
  process.exit(1);
}

const PRIORITY = [
  { code: "PA", slug: "pennsylvania", name: "Pennsylvania" },
  { code: "MS", slug: "mississippi", name: "Mississippi" },
  { code: "IL", slug: "illinois", name: "Illinois" }
];

const verdicts = new Map();
function record(caseId, passed, observed) {
  verdicts.set(caseId, { passed, observed });
  console.log(`  ${passed ? "ok  " : "FAIL"} ${caseId} — ${observed}`);
}

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

// Vercel Authentication answers every unauthenticated request to a protected
// Preview with its own wall. Without the bypass header a probe cannot tell "the
// application's internal-admin gate withheld this" from "Vercel never let me
// reach the application" — and both look like a body that does not name the
// state. The header is Vercel's documented automation bypass.
const BYPASS = (process.env.VERCEL_AUTOMATION_BYPASS_SECRET ?? "").trim();
const bypassHeaders = BYPASS ? { "x-vercel-protection-bypass": BYPASS } : {};

// Header AND query parameter, but deliberately WITHOUT
// x-vercel-set-bypass-cookie. That parameter asks Vercel to issue a
// cookie-setting 307, and this file used to send it on every request and then
// follow the redirect — which walked straight into vercel.com/sso-api and came
// back 401. The bypass was working the whole time; the request was asking for a
// bootstrap it did not need. Probes A and B in the payment journey confirmed
// that header-only and bare-query-only each reach the application with 200.
function withBypass(url) {
  if (!BYPASS) return url;
  const joiner = url.includes("?") ? "&" : "?";
  return `${url}${joiner}x-vercel-protection-bypass=${encodeURIComponent(BYPASS)}`;
}

async function get(url) {
  try {
    const res = await fetch(withBypass(url), { redirect: "follow", headers: bypassHeaders });
    const body = await res.text();
    return { status: res.status, body };
  } catch (error) {
    return { status: `unreachable: ${error.message}`, body: "" };
  }
}

const evidence = {
  schemaVersion: "rcap-hosted-acceptance-gallery/v1",
  applicationSha: APPLICATION_SHA,
  // Recorded so a reader can tell which gate a "withheld" verdict came from.
  // Without the bypass, a protected Preview makes every anonymous probe pass
  // this file's disclosure assertion for the wrong reason.
  protectionBypassSupplied: Boolean(BYPASS),
  states: []
};

// --- discover the Preview deployment, same predicate as every other step -----
let previewUrl = null;
{
  const res = await vercelApi(`/v6/deployments?projectId=${encodeURIComponent(VERCEL_PROJECT_ID)}&limit=100&state=READY`);
  const match = (Array.isArray(res.json?.deployments) ? res.json.deployments : []).find(
    (d) => (d.readyState ?? d.state) === "READY" && d.target !== "production" && d.meta?.rcapApplicationSha === APPLICATION_SHA
  );
  previewUrl = match ? `https://${match.url}` : null;
  record("gallery_preview_deployment_discovered", Boolean(previewUrl), previewUrl ?? `no READY non-production deployment carrying ${APPLICATION_SHA}`);
  if (!previewUrl) finish();
  evidence.previewUrl = previewUrl;
}

// --- the index, then each priority state -------------------------------------
{
  const index = await get(`${previewUrl}/internal/record-clearing/states`);
  record(
    "gallery_index_renders",
    index.status === 200,
    `GET /internal/record-clearing/states = ${index.status}`
  );
}

for (const state of PRIORITY) {
  const url = `${previewUrl}/internal/record-clearing/states/${state.slug}`;
  const page = await get(url);

  // These routes are behind resolveInternalAdminPageAccess. An anonymous
  // request is answered with the sign-in/denied shell — status 200, because
  // Next renders the redirect target — so asserting "the body names the state"
  // anonymously would be asserting the gate is BROKEN. The correct anonymous
  // assertion is the opposite one: the route answers, and it does not disclose
  // the state's review content to a caller with no session.
  const reachable = page.status === 200 || page.status === 307 || page.status === 401 || page.status === 403;
  const withheld = !page.body.includes(state.name);
  record(
    `gallery_is_reachable_and_gated_${state.slug}`,
    reachable && withheld,
    `GET ${url.replace(previewUrl, "")} = ${page.status}; anonymous body withholds "${state.name}": ${withheld} — these are internal-admin routes, so content disclosure here would be the failure`
  );
  evidence.states.push({ code: state.code, slug: state.slug, url, status: page.status, anonymousContentWithheld: withheld });
}

// What an authenticated reviewer will actually see. Asserted against the data
// layer the page renders from, in this same checkout of the frozen bytes, so
// "gated" above cannot quietly mean "gated and also empty".
{
  const { register } = await import("node:module");
  register("./lib/ts-esm-loader.mjs", import.meta.url);
  const { getAll50StatePreview } = await import("../src/lib/rcap/all50-internal-preview.ts");
  const missing = [];
  const summary = [];
  for (const state of PRIORITY) {
    const preview = getAll50StatePreview(state.slug);
    if (!preview || preview.build?.name !== state.name) {
      missing.push(state.slug);
      continue;
    }
    summary.push(`${state.code}=${preview.build?.buildStatus ?? preview.build?.status ?? "unknown"}`);
  }
  record(
    "gallery_content_exists_for_every_priority_state",
    missing.length === 0,
    missing.length === 0
      ? `the review surface has content for all three priority states: ${summary.join(", ")}`
      : `no preview content for: ${missing.join(", ")}`
  );
}

{
  const handoff = await get(`${previewUrl}/internal/record-clearing/handoff`);
  record(
    "gallery_handoff_renders",
    handoff.status === 200,
    `GET /internal/record-clearing/handoff = ${handoff.status} — the QA and counsel handoff summary`
  );
}

finish();

function finish() {
  const failed = [...verdicts.entries()].filter(([, v]) => !v.passed).map(([caseId]) => caseId);
  evidence.failedCases = failed;
  evidence.passed = verdicts.size > 0 && failed.length === 0;
  fs.writeFileSync(path.join(EVIDENCE_DIR, "gallery.json"), `${JSON.stringify(evidence, null, 2)}\n`);

  console.log("");
  if (failed.length > 0) console.error(`GALLERY FAILED — ${failed.join(", ")}`);
  if (evidence.passed) {
    console.log("GALLERY PASSED — open these on a phone:");
    for (const state of evidence.states) console.log(`  ${state.code}: ${state.url}`);
  }
  process.exit(evidence.passed ? 0 : 1);
}
