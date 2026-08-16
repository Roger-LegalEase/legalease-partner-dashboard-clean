#!/usr/bin/env node
// Hosted acceptance staging — the complete terminal-treatment packet gallery.
//
// Proves that the three priority states Roger named — Pennsylvania,
// Mississippi and Illinois — are present in the frozen data and that the
// DEPLOYED Preview returns the exact application-owned internal-admin redirect
// for each anonymous request. It emits the exact URLs an authenticated reviewer
// can open on a phone.
//
// These three are also the states with preserved legacy generators, so this
// doubles as the check that the freeze did not break a live legacy surface.
//
// The gallery is the internal review surface, not a consumer page: it is where
// a state's build status, overlay coverage, pleading set and review artifacts
// are visible in one place. It carries no payment affordance, which is why it
// can be exercised while the consumer delivery route is still disabled.

import fs from "node:fs";
import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const EVIDENCE_DIR = path.join(rootDir, "hosted-acceptance-evidence");
const TERMINALIZATION_LEDGER_PATH = path.join(rootDir, "data/rcap-ledger/track-terminalization.json");
const PROBLEMATIC_PDF_REGISTER_PATH = path.join(rootDir, "data/rcap-all50/problematic-pdf-register.json");
fs.mkdirSync(EVIDENCE_DIR, { recursive: true });

const APPLICATION_SHA = process.env.HOSTED_APPLICATION_SHA ?? "";
const PROJECT_REF = process.env.ACCEPTANCE_SUPABASE_PROJECT_REF ?? "";
const ROUTE_STATE_TAG = process.env.HOSTED_ROUTE_STATE || "disabled";
const ACCEPTANCE_ORIGIN = `https://rcap-acceptance-${PROJECT_REF}.vercel.app`;
const VERCEL_TOKEN = process.env.VERCEL_TOKEN ?? "";
const VERCEL_ORG_ID = process.env.VERCEL_ORG_ID ?? "";
const VERCEL_PROJECT_ID = process.env.VERCEL_PROJECT_ID ?? "";

if (!VERCEL_TOKEN || !VERCEL_ORG_ID || !VERCEL_PROJECT_ID || !/^[0-9a-f]{40}$/.test(APPLICATION_SHA) || !/^[a-z]{20}$/.test(PROJECT_REF)) {
  console.error("GALLERY: VERCEL_TOKEN, VERCEL_ORG_ID, VERCEL_PROJECT_ID, HOSTED_APPLICATION_SHA and ACCEPTANCE_SUPABASE_PROJECT_REF are required");
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

// Manual redirects, deliberately. Following blindly is what turned a perfectly
// ordinary application redirect into a 401: the hop left the deployment, landed
// on Vercel's SSO endpoint, and this file reported the result as though the
// application had refused. Reading the FIRST response and identifying who sent
// it is the only way these verdicts mean what they say.
async function get(url) {
  try {
    const res = await fetch(withBypass(url), { redirect: "manual", headers: bypassHeaders });
    const body = await res.text();
    const location = res.headers.get("location") ?? "";
    let redirectHost = "";
    try { redirectHost = location ? new URL(location, url).host : ""; } catch { redirectHost = "(unparseable)"; }
    const cookieNames = (typeof res.headers.getSetCookie === "function" ? res.headers.getSetCookie() : [])
      .map((line) => String(line).split("=")[0].trim());
    const fromProtectionLayer =
      /(^|\.)vercel\.com$/i.test(redirectHost) || cookieNames.includes("_vercel_sso_nonce");
    return { status: res.status, body, location, redirectHost, cookieNames, fromProtectionLayer };
  } catch (error) {
    return { status: `unreachable: ${error.message}`, body: "", location: "", redirectHost: "", cookieNames: [], fromProtectionLayer: false };
  }
}

function exactInternalAdminRedirect(response, requestedPath) {
  let location = null;
  try { location = response.location ? new URL(response.location, ACCEPTANCE_ORIGIN) : null; } catch { /* invalid is a failure */ }
  return response.status === 307
    && !response.fromProtectionLayer
    && location?.origin === ACCEPTANCE_ORIGIN
    && location.pathname === "/sign-in"
    && location.searchParams.get("next") === requestedPath;
}

const evidence = {
  schemaVersion: "rcap-hosted-acceptance-gallery/v2",
  applicationSha: APPLICATION_SHA,
  // Recorded so a reader can tell which gate a "withheld" verdict came from.
  // Without the bypass, a protected Preview makes every anonymous probe pass
  // this file's disclosure assertion for the wrong reason.
  protectionBypassSupplied: Boolean(BYPASS),
  states: [],
  jurisdictions: []
};

// Prepare the complete internal-review gallery from the same frozen inputs the
// deployed routes read. The three named priority states retain their focused
// hosted probes below; this ledger-backed layer adds every state plus DC and
// refuses to call the gallery complete if even one track is nonterminal,
// unknown, unowned, or absent from a jurisdiction page.
let terminalTreatmentGallery = [];
{
  const { register } = await import("node:module");
  register("./lib/ts-esm-loader.mjs", import.meta.url);
  const { getAll50StatePreviews } = await import("../src/lib/rcap/all50-internal-preview.ts");
  const previews = getAll50StatePreviews();
  const ledger = JSON.parse(fs.readFileSync(TERMINALIZATION_LEDGER_PATH, "utf8"));
  const tracks = Array.isArray(ledger.tracks) ? ledger.tracks : [];
  const aggregates = ledger.aggregates ?? {};
  const uniquePreviews = new Map(previews.map((preview) => [preview.build.code, preview]));
  const ledgerCodes = [...new Set(tracks.map((track) => track.jurisdiction))].sort();
  const previewCodes = [...uniquePreviews.keys()].sort();
  const matchingJurisdictionSets = JSON.stringify(ledgerCodes) === JSON.stringify(previewCodes);

  terminalTreatmentGallery = [...uniquePreviews.values()]
    .sort((a, b) => a.build.code.localeCompare(b.build.code))
    .map((preview) => {
      const stateTracks = tracks.filter((track) => track.jurisdiction === preview.build.code);
      const dispositionCounts = {};
      for (const track of stateTracks) {
        const disposition = track.coverageDisposition ?? "unknown";
        dispositionCounts[disposition] = (dispositionCounts[disposition] ?? 0) + 1;
      }
      return {
        code: preview.build.code,
        name: preview.build.name,
        slug: preview.build.slug,
        reviewUrl: `${ACCEPTANCE_ORIGIN}/internal/record-clearing/states/${preview.build.slug}`,
        buildStatus: preview.build.buildStatus,
        trackCount: stateTracks.length,
        terminalTrackCount: stateTracks.filter((track) => track.terminal === true).length,
        nonterminalTrackCount: stateTracks.filter((track) => track.terminal !== true).length,
        dispositionCounts,
        priority: PRIORITY.some((state) => state.code === preview.build.code)
      };
    });

  record(
    "terminal_treatment_gallery_has_51_unique_jurisdictions",
    previews.length === 51 && uniquePreviews.size === 51 && ledgerCodes.length === 51 && matchingJurisdictionSets,
    `preview rows=${previews.length}, unique preview codes=${uniquePreviews.size}, ledger jurisdictions=${ledgerCodes.length}, code sets match=${matchingJurisdictionSets}`
  );
  record(
    "terminal_treatment_gallery_has_497_of_497_terminal_tracks",
    tracks.length === 497
      && aggregates.registryTracks === 497
      && aggregates.tracksTerminal === 497
      && terminalTreatmentGallery.reduce((sum, state) => sum + state.trackCount, 0) === 497
      && terminalTreatmentGallery.reduce((sum, state) => sum + state.terminalTrackCount, 0) === 497,
    `track rows=${tracks.length}, registry=${aggregates.registryTracks}, terminal=${aggregates.tracksTerminal}`
  );
  record(
    "terminal_treatment_gallery_has_no_nonterminal_unknown_or_unowned_entries",
    aggregates.tracksNonterminal === 0
      && aggregates.unknownTrackDispositions === 0
      && aggregates.unownedBlockers === 0
      && aggregates.unownedRequiredComponents === 0
      && terminalTreatmentGallery.every((state) => state.trackCount > 0 && state.nonterminalTrackCount === 0),
    `nonterminal=${aggregates.tracksNonterminal}, unknown=${aggregates.unknownTrackDispositions}, unowned blockers=${aggregates.unownedBlockers}, unowned required components=${aggregates.unownedRequiredComponents}`
  );

  evidence.terminalTreatment = {
    ledger: path.relative(rootDir, TERMINALIZATION_LEDGER_PATH),
    aggregates,
    jurisdictionCount: terminalTreatmentGallery.length,
    jurisdictions: terminalTreatmentGallery
  };
  fs.writeFileSync(
    path.join(EVIDENCE_DIR, "terminal-treatment-gallery.json"),
    `${JSON.stringify({
      schemaVersion: "rcap-terminal-treatment-gallery/v1",
      applicationSha: APPLICATION_SHA,
      acceptanceOrigin: ACCEPTANCE_ORIGIN,
      ledger: evidence.terminalTreatment.ledger,
      aggregates,
      jurisdictions: terminalTreatmentGallery
    }, null, 2)}\n`
  );
}

// Copy the canonical problematic-PDF register into the hosted evidence bundle
// byte-for-byte and bind it by SHA-256. Zero sellable/public routes is checked
// both in the aggregate and in the underlying route arrays, preventing a stale
// summary counter from concealing an exposed route.
{
  const registerBytes = fs.readFileSync(PROBLEMATIC_PDF_REGISTER_PATH);
  const problemRegister = JSON.parse(registerBytes.toString("utf8"));
  const totals = problemRegister.totals ?? {};
  const sellableRoutes = Array.isArray(problemRegister.routesStillSellable) ? problemRegister.routesStillSellable : null;
  const publicRoutes = Array.isArray(problemRegister.routesStillPublic) ? problemRegister.routesStillPublic : null;
  const records = Array.isArray(problemRegister.records) ? problemRegister.records : [];
  const sha256 = crypto.createHash("sha256").update(registerBytes).digest("hex");
  const exactMasterList = records.length === totals.problematicPdfsTotal
    && records.every((entry) => typeof entry?.identity === "string" && typeof entry?.jurisdiction === "string");

  record(
    "problematic_pdf_master_list_is_complete",
    exactMasterList,
    `records=${records.length}, aggregate total=${totals.problematicPdfsTotal}, sha256=${sha256}`
  );
  record(
    "problematic_pdf_routes_are_neither_sellable_nor_public",
    totals.problemPdfRoutesStillSellable === 0
      && totals.problemPdfRoutesStillPublic === 0
      && sellableRoutes?.length === 0
      && publicRoutes?.length === 0,
    `sellable=${totals.problemPdfRoutesStillSellable}/${sellableRoutes?.length ?? "invalid"}, public=${totals.problemPdfRoutesStillPublic}/${publicRoutes?.length ?? "invalid"}`
  );

  fs.writeFileSync(path.join(EVIDENCE_DIR, "problematic-pdf-master-list.json"), registerBytes);
  evidence.problematicPdfMasterList = {
    source: path.relative(rootDir, PROBLEMATIC_PDF_REGISTER_PATH),
    artifact: "problematic-pdf-master-list.json",
    sha256,
    totals,
    recordCount: records.length,
    routesStillSellable: sellableRoutes,
    routesStillPublic: publicRoutes
  };
}

// --- discover the Preview deployment, same predicate as every other step -----
let previewUrl = null;
{
  const res = await vercelApi(`/v6/deployments?projectId=${encodeURIComponent(VERCEL_PROJECT_ID)}&limit=100&state=READY`);
  const match = (Array.isArray(res.json?.deployments) ? res.json.deployments : []).find(
    (d) => (d.readyState ?? d.state) === "READY"
      && d.target !== "production"
      && d.meta?.rcapApplicationSha === APPLICATION_SHA
      && d.meta?.rcapAcceptanceProjectRef === PROJECT_REF
      && d.meta?.rcapPublicOrigin === ACCEPTANCE_ORIGIN
      && d.meta?.rcapRouteState === ROUTE_STATE_TAG
  );
  previewUrl = match ? ACCEPTANCE_ORIGIN : null;
  record("gallery_preview_deployment_discovered", Boolean(previewUrl), previewUrl ?? `no READY non-production deployment carrying ${APPLICATION_SHA}`);
  if (!previewUrl) finish();
  evidence.previewUrl = previewUrl;
}

// --- the must-succeed anchor: the bypass reaches the application -------------
//
// Every other case on this page is a route that legitimately refuses an
// anonymous caller, and a refusal cannot distinguish the application's gate
// from Vercel's wall. This one route must answer 200 with application JSON, so
// it is what gives the refusals below their meaning.
{
  const health = await get(`${previewUrl}/api/health`);
  let json = null;
  try { json = JSON.parse(health.body); } catch { /* HTML means the wall answered */ }
  const reached = health.status === 200 && json !== null && typeof json === "object" && "checks" in json;
  record(
    "gallery_bypass_reaches_the_application",
    reached,
    `GET /api/health = ${health.status}; answered by=${reached ? "the application (JSON carrying `checks`)" : health.fromProtectionLayer ? "VERCEL'S PROTECTION LAYER" : "neither shape"}`
  );
  evidence.bypassAnchor = { status: health.status, reachedApplication: reached };
  if (!reached) finish();
}

// --- the index, then every state plus DC -------------------------------------
{
  const requestedPath = "/internal/record-clearing/states";
  const index = await get(`${previewUrl}${requestedPath}`);
  const exactGate = exactInternalAdminRedirect(index, requestedPath);
  record(
    "gallery_index_reached_the_application",
    exactGate,
    `GET /internal/record-clearing/states = ${index.status}${index.location ? `, location=${index.location}` : ""}; ` +
    `exact application-owned 307 to /sign-in with next=${requestedPath}: ${exactGate}`
  );
}

for (const state of terminalTreatmentGallery) {
  const requestedPath = `/internal/record-clearing/states/${state.slug}`;
  const url = `${previewUrl}${requestedPath}`;
  const page = await get(url);

  // resolveInternalAdminPageAccess uses Next's redirect(), whose deterministic
  // response is 307 to this origin's /sign-in with the exact requested path in
  // `next`. A generic 4xx/5xx or a body that merely omits the state name is not
  // accepted as evidence that the route exists or that its gate executed.
  const exactGate = exactInternalAdminRedirect(page, requestedPath);
  record(
    `gallery_is_reachable_and_gated_${state.slug}`,
    exactGate,
    `GET ${url.replace(previewUrl, "")} = ${page.status}${page.location ? `, location=${page.location}` : ""}; ` +
    `exact application-owned 307 to /sign-in with next=${requestedPath}: ${exactGate}`
  );
  const routeEvidence = {
    code: state.code, slug: state.slug, url, status: page.status,
    location: page.location, exactInternalAdminRedirect: exactGate
  };
  evidence.jurisdictions.push(routeEvidence);
  if (state.priority) evidence.states.push(routeEvidence);
}

// What an authenticated reviewer will actually see. Asserted against the data
// layer the page renders from, in this same checkout of the frozen bytes, so
// "gated" above cannot quietly mean "gated and also empty".
{
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
  const requestedPath = "/internal/record-clearing/handoff";
  const handoff = await get(`${previewUrl}${requestedPath}`);
  const exactGate = exactInternalAdminRedirect(handoff, requestedPath);
  record(
    "gallery_handoff_reached_the_application",
    exactGate,
    `GET /internal/record-clearing/handoff = ${handoff.status}${handoff.location ? `, location=${handoff.location}` : ""}; ` +
    `exact application-owned 307 to /sign-in with next=${requestedPath}: ${exactGate}`
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
    console.log("GALLERY GATES AND FROZEN CONTENT PASSED — sign in as an internal reviewer, then open these on a phone:");
    for (const state of evidence.states) console.log(`  ${state.code}: ${state.url}`);
  }
  process.exit(evidence.passed ? 0 : 1);
}
