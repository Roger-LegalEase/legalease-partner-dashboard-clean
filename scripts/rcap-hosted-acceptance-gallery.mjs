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

async function get(url) {
  try {
    const res = await fetch(url, { redirect: "follow" });
    const body = await res.text();
    return { status: res.status, body };
  } catch (error) {
    return { status: `unreachable: ${error.message}`, body: "" };
  }
}

const evidence = { schemaVersion: "rcap-hosted-acceptance-gallery/v1", applicationSha: APPLICATION_SHA, states: [] };

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
  // A 200 that does not name the state is a shell, not a gallery. Requiring the
  // state's own name in the body is what separates "the route exists" from
  // "the route rendered this state".
  const named = page.status === 200 && page.body.includes(state.name);
  record(
    `gallery_renders_${state.slug}`,
    named,
    `GET ${url.replace(previewUrl, "")} = ${page.status}${page.status === 200 ? `, body names "${state.name}": ${page.body.includes(state.name)}` : ""}`
  );
  evidence.states.push({ code: state.code, slug: state.slug, url, status: page.status, named });
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
