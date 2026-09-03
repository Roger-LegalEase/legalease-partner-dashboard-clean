#!/usr/bin/env node
// One boundary that decides which Preview the matrix runs against.
//
// Every phase needing a Preview passes through here, and it always returns
// exactly one of three outcomes:
//
//   reused_exact_ready_preview   an existing deployment satisfied every
//                                condition, and NO deployment command ran
//   created_one_new_preview      no candidate was supplied and none was found,
//                                so exactly one Preview was created
//   refused_no_exact_preview     a candidate was supplied and did not match
//
// The third outcome is the one that matters. When a hostname is handed in and
// the deployment behind it is not READY, or is production, or carries another
// application SHA, the safe-looking move is to deploy a fresh one and carry on
// — and that silently discards the operator's instruction to reuse a specific
// deployment. So a supplied-but-mismatching candidate REFUSES. It never falls
// back to creating one.
//
// Reuse is decided from Vercel's own answer about the deployment, not from the
// hostname resolving or the run that created it having passed. A hostname is
// not evidence; the deployment record is.
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { prepareHostedAcceptanceEvidenceLayout } from "./rcap-hosted-acceptance-evidence-layout.mjs";
import {
  expectedHostedReturnOrigin,
  hostedVercelScopedUrl,
  resolveHostedVercelIdentity
} from "./rcap-hosted-acceptance-vercel-identity.mjs";

const { root: OUT_DIR } = prepareHostedAcceptanceEvidenceLayout({ rootDir: process.cwd() });

const HOSTNAME_INPUT = (process.env.HOSTED_PREVIEW_HOSTNAME ?? "").trim().replace(/^https?:\/\//, "").replace(/\/+$/, "");
const DEPLOYMENT_ID_INPUT = (process.env.HOSTED_PREVIEW_DEPLOYMENT_ID ?? "").trim();
const APPLICATION_SHA = (process.env.HOSTED_APPLICATION_SHA ?? "").trim();
const PROJECT_REF = (process.env.ACCEPTANCE_SUPABASE_PROJECT_REF ?? "").trim();
const VERCEL_TOKEN = process.env.VERCEL_TOKEN ?? "";
const SUPABASE_ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN ?? "";
const BYPASS = process.env.VERCEL_AUTOMATION_BYPASS_SECRET ?? "";
const CLINIC_DEMO_MODE = (process.env.HOSTED_CLINIC_DEMO_MODE ?? "").trim();
const EXPECTED_CLINIC_DEMO_MODE = CLINIC_DEMO_MODE || "none";
const EXPECTED_STRIPE_CONFIGURED = CLINIC_DEMO_MODE === "mississippi_preview" ? "false" : "true";
const EXPECTED_PROJECT_REF = "hyflxnlhpmiqxvvcoiia";

if (!/^[0-9a-f]{40}$/.test(APPLICATION_SHA)) {
  console.error("PREVIEW RESOLUTION: HOSTED_APPLICATION_SHA must be one exact lowercase 40-character SHA");
  process.exit(1);
}
if (PROJECT_REF !== EXPECTED_PROJECT_REF) {
  console.error("PREVIEW RESOLUTION: ACCEPTANCE_SUPABASE_PROJECT_REF is not the pinned acceptance project");
  process.exit(1);
}
const VERCEL_IDENTITY = await resolveHostedVercelIdentity({ token: VERCEL_TOKEN });
const EXPECTED_RETURN_ORIGIN = expectedHostedReturnOrigin(APPLICATION_SHA);
const EXPECTED_RETURN_HOST = new URL(EXPECTED_RETURN_ORIGIN).host;
const EXPECTED_CLINIC_SCOPE_SHA256 = CLINIC_DEMO_MODE === "mississippi_preview"
  ? await resolveClinicScopeSha256()
  : null;

// Phases that transact — Checkout, payment, worker, artifact, delivery — need
// the delivery route OPEN and narrowed to the named synthetic identity. Phases
// that only deploy or photograph galleries do not.
//
// This distinction has to live here because "the route refuses an
// unauthenticated caller" cannot tell the two apart: staging_scoped answers
// 401 and disabled answers 503, and both look like a safe refusal. Run
// 32365300555 reused a disabled Preview past this boundary on exactly that
// reasoning, and the Checkout gate rejected it four steps later — after a
// build, a registry login and a dependency install had already run.
const REQUIRED_ROUTE_STATE = "staging_scoped";
const REQUIRE_STAGING_SCOPED = (process.env.HOSTED_REQUIRE_STAGING_SCOPED ?? "").trim() === "true";
const routeStateOf = (deployment) => deployment?.meta?.rcapRouteState ?? null;
const isPreviewTarget = (target) => target === null || target === "preview";

/** The route state is acceptable for this phase, or it is not. Never inferred. */
function routeStateAcceptable(state) {
  return REQUIRE_STAGING_SCOPED ? state === REQUIRED_ROUTE_STATE : true;
}

const problems = [];
const checks = [];
const ok = (label, detail) => checks.push({ label, ok: true, detail });
const bad = (label, detail) => { checks.push({ label, ok: false, detail }); problems.push(`${label} — ${detail}`); };

function emit(outcome, extra = {}) {
  const record = {
    schemaVersion: "rcap-hosted-preview-resolution/v1",
    outcome,
    reused: outcome === "reused_exact_ready_preview",
    newPreviewCreated: outcome === "created_one_new_preview",
    hostname: extra.hostname ?? null,
    deploymentId: extra.deploymentId ?? null,
    readyState: extra.readyState ?? null,
    target: extra.target ?? null,
    applicationSha: extra.applicationSha ?? null,
    acceptanceProjectRef: PROJECT_REF || null,
    // Emitted explicitly, always — an unstated route state is how a disabled
    // Preview passed for a staging-scoped one.
    routeState: extra.routeState ?? null,
    requiredRouteState: REQUIRE_STAGING_SCOPED ? REQUIRED_ROUTE_STATE : "any",
    routeStateRequired: REQUIRE_STAGING_SCOPED,
    checks,
    ...extra.rest
  };
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUT_DIR, "preview-resolution.json"), `${JSON.stringify(record, null, 2)}\n`);
  if (process.env.GITHUB_OUTPUT) {
    const out = [
      `outcome=${outcome}`,
      `reused=${record.reused}`,
      `new_preview_created=${record.newPreviewCreated}`,
      `hostname=${record.hostname ?? ""}`,
      `deployment_id=${record.deploymentId ?? ""}`
    ].join("\n");
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `${out}\n`);
  }
  for (const c of checks) console.log(`  ${c.ok ? "ok  " : "FAIL"} ${c.label} — ${c.detail}`);
  console.log(`\nPREVIEW RESOLUTION: ${outcome}`);
  return record;
}

const api = async (route) => {
  const response = await fetch(hostedVercelScopedUrl(route, VERCEL_IDENTITY), {
    headers: { Authorization: `Bearer ${VERCEL_TOKEN}` }
  });
  if (!response.ok) throw new Error(`Vercel ${route} returned HTTP ${response.status}`);
  return response.json();
};

/**
 * Ask Vercel whether an exact match already exists before authorising a new
 * deployment. Creating a Preview that already exists is not harmless: each one
 * is another hostname the Stripe destination could be pointed at, and another
 * environment someone could later mistake for the accepted one.
 */
async function findExistingExactPreview() {
  const listed = await api(`/v6/deployments?projectId=${encodeURIComponent(VERCEL_IDENTITY.projectId)}&target=preview&state=READY&limit=40`);
  const candidates = listed.deployments ?? [];
  const examined = [];
  for (const summary of candidates) {
    const id = summary.uid ?? summary.id;
    if (!id) continue;
    let full;
    try { full = await api(`/v13/deployments/${encodeURIComponent(id)}`); } catch { continue; }
    const meta = full.meta ?? {};
    const state = routeStateOf(full);
    const matches = (full.readyState ?? full.status) === "READY"
      && isPreviewTarget(full.target)
      && meta.rcapApplicationSha === APPLICATION_SHA
      && meta.rcapAcceptanceProjectRef === PROJECT_REF
      && meta.rcapStripeConfigured === EXPECTED_STRIPE_CONFIGURED
      && meta.rcapReturnOrigin === EXPECTED_RETURN_ORIGIN
      && meta.rcapClinicDemoMode === EXPECTED_CLINIC_DEMO_MODE
      && (CLINIC_DEMO_MODE !== "mississippi_preview"
        || (EXPECTED_CLINIC_SCOPE_SHA256 && meta.rcapStagingScopeSha256 === EXPECTED_CLINIC_SCOPE_SHA256))
      && routeStateAcceptable(state);
    let aliasBound = false;
    if (matches) {
      try {
        const aliased = await api(`/v13/deployments/${encodeURIComponent(EXPECTED_RETURN_HOST)}`);
        aliasBound = (aliased.id ?? aliased.uid ?? null) === id;
      } catch { /* absence is a mismatch */ }
    }
    examined.push({ id, host: full.url ?? null, applicationSha: meta.rcapApplicationSha ?? null, routeState: state, returnOrigin: meta.rcapReturnOrigin ?? null, aliasBound, matches: matches && aliasBound });
    if (matches && aliasBound) return { found: full, examined };
  }
  return { found: null, examined };
}

// --- no candidate supplied --------------------------------------------------
if (!HOSTNAME_INPUT && !DEPLOYMENT_ID_INPUT) {
  const { found, examined } = await findExistingExactPreview();
  if (found) {
    const id = found.id ?? found.uid ?? null;
    const host = EXPECTED_RETURN_HOST;
    ok("existing_exact_preview_found", `${host} (${id}); routeState=${routeStateOf(found)}`);
    emit("reused_exact_ready_preview", {
      hostname: host,
      deploymentId: id,
      readyState: found.readyState ?? found.status ?? null,
      target: found.target ?? null,
      applicationSha: found.meta?.rcapApplicationSha ?? null,
      routeState: routeStateOf(found),
      rest: {
        candidateSuppliedBy: "vercel_search",
        deploymentIdWasResolvedFromHostname: false,
        vercelDeployCommandsExecuted: 0,
        deploymentsExamined: examined.length
      }
    });
    console.log(`  reusing https://${host} (${id}); no Vercel deployment command was executed.`);
    process.exit(0);
  }
  emit("created_one_new_preview", {
    routeState: null,
    rest: {
      note: `no exact ${REQUIRE_STAGING_SCOPED ? REQUIRED_ROUTE_STATE : "matching"} Preview exists; the deploy path creates exactly one`,
      deploymentsExamined: examined.length,
      // Named, so "nothing matched" can be audited rather than trusted.
      nearMisses: examined.filter((e) => !e.matches).slice(0, 10)
    }
  });
  process.exit(0);
}

// --- a candidate was supplied: it matches exactly, or this refuses ----------
let deployment;
try {
  if (DEPLOYMENT_ID_INPUT) {
    deployment = await api(`/v13/deployments/${encodeURIComponent(DEPLOYMENT_ID_INPUT)}`);
  } else {
    // Resolve the id FROM the hostname, so the operator only has to supply the
    // hostname and no prior Actions artifact has to be downloaded.
    deployment = await api(`/v13/deployments/${encodeURIComponent(HOSTNAME_INPUT)}`);
  }
} catch (error) {
  bad("deployment_resolves", String(error.message ?? error));
  emit("refused_no_exact_preview", { hostname: HOSTNAME_INPUT || null, deploymentId: DEPLOYMENT_ID_INPUT || null });
  console.error("\nA reuse candidate was supplied and could not be resolved. Refusing rather than deploying a different Preview.");
  process.exit(1);
}

const deploymentId = deployment.id ?? deployment.uid ?? null;
const readyState = deployment.readyState ?? deployment.status ?? null;
const target = deployment.target ?? null;
const meta = deployment.meta ?? {};
const resolvedHost = EXPECTED_RETURN_HOST;

deploymentId ? ok("deployment_id_resolved", deploymentId) : bad("deployment_id_resolved", "Vercel returned no deployment id");
if (HOSTNAME_INPUT) {
  HOSTNAME_INPUT === EXPECTED_RETURN_HOST
    ? ok("hostname_matches_the_authorized_preview", resolvedHost)
    : bad("hostname_matches_the_authorized_preview", `resolved ${resolvedHost}, authorized ${HOSTNAME_INPUT}`);
}
readyState === "READY" ? ok("deployment_is_ready", readyState) : bad("deployment_is_ready", `readyState=${readyState}`);
// Vercel represents Preview as null or "preview". No other target is admitted.
isPreviewTarget(target) ? ok("target_is_preview_not_production", `target=${target}`) : bad("target_is_preview_not_production", `target=${target}`);

const deployedSha = meta.rcapApplicationSha ?? null;
deployedSha === APPLICATION_SHA
  ? ok("deployment_carries_the_authorized_application_sha", deployedSha)
  : bad("deployment_carries_the_authorized_application_sha", `deployment records ${deployedSha ?? "(none)"}, authorized ${APPLICATION_SHA}`);

const deployedReturnOrigin = meta.rcapReturnOrigin ?? null;
deployedReturnOrigin === EXPECTED_RETURN_ORIGIN
  ? ok("deployment_carries_the_deterministic_return_origin", deployedReturnOrigin)
  : bad("deployment_carries_the_deterministic_return_origin", `deployment records ${deployedReturnOrigin ?? "(none)"}, expected ${EXPECTED_RETURN_ORIGIN}`);

meta.rcapClinicDemoMode === EXPECTED_CLINIC_DEMO_MODE
  ? ok("deployment_carries_the_exact_clinic_mode", EXPECTED_CLINIC_DEMO_MODE)
  : bad("deployment_carries_the_exact_clinic_mode", `deployment records ${meta.rcapClinicDemoMode ?? "(none)"}, expected ${EXPECTED_CLINIC_DEMO_MODE}`);
meta.rcapStripeConfigured === EXPECTED_STRIPE_CONFIGURED
  ? ok("deployment_carries_the_expected_stripe_posture", `rcapStripeConfigured=${EXPECTED_STRIPE_CONFIGURED}`)
  : bad("deployment_carries_the_expected_stripe_posture", `deployment records ${meta.rcapStripeConfigured ?? "(none)"}, expected ${EXPECTED_STRIPE_CONFIGURED}`);
if (CLINIC_DEMO_MODE === "mississippi_preview") {
  EXPECTED_CLINIC_SCOPE_SHA256 && meta.rcapStagingScopeSha256 === EXPECTED_CLINIC_SCOPE_SHA256
    ? ok("deployment_carries_the_exact_two_participant_scope", EXPECTED_CLINIC_SCOPE_SHA256)
    : bad("deployment_carries_the_exact_two_participant_scope",
      `deployment records ${meta.rcapStagingScopeSha256 ?? "(none)"}; expected ${EXPECTED_CLINIC_SCOPE_SHA256 ?? "unresolvable synthetic cohort"}`);
}

try {
  const aliased = await api(`/v13/deployments/${encodeURIComponent(EXPECTED_RETURN_HOST)}`);
  const aliasDeploymentId = aliased.id ?? aliased.uid ?? null;
  aliasDeploymentId === deploymentId
    ? ok("deterministic_return_alias_resolves_to_exact_deployment", `${EXPECTED_RETURN_HOST} -> ${aliasDeploymentId}`)
    : bad("deterministic_return_alias_resolves_to_exact_deployment", `${EXPECTED_RETURN_HOST} -> ${aliasDeploymentId ?? "(none)"}, expected ${deploymentId}`);
} catch (error) {
  bad("deterministic_return_alias_resolves_to_exact_deployment", String(error.message ?? error));
}

// The route state, stated outright. `disabled` is a legitimate gallery Preview
// and an illegitimate payment one; only the phase decides which.
const observedRouteState = routeStateOf(deployment);
routeStateAcceptable(observedRouteState)
  ? ok("route_state_matches_this_phase", `rcapRouteState=${observedRouteState ?? "(absent)"}; this phase requires ${REQUIRE_STAGING_SCOPED ? REQUIRED_ROUTE_STATE : "any route state"}`)
  : bad("route_state_matches_this_phase",
      `rcapRouteState=${observedRouteState ?? "(absent)"}, but this phase runs Checkout, payment, worker, artifact or delivery acceptance and requires ${REQUIRED_ROUTE_STATE}. `
      + "A disabled Preview refuses unauthenticated delivery with 503 and a staging-scoped one with 401; both look safe, and only one can transact. "
      + "Deployment metadata is fixed at deploy time, so this Preview cannot be promoted — it needs a staging-scoped deployment.");

const deployedProject = meta.rcapAcceptanceProjectRef ?? null;
deployedProject === PROJECT_REF
  ? ok("bound_to_the_acceptance_project", deployedProject)
  : bad("bound_to_the_acceptance_project", `deployment records ${deployedProject ?? "(none)"}, authorized ${PROJECT_REF}`);

// No Production alias may be attached to a deployment the matrix will drive.
try {
  const aliases = await api(`/v2/deployments/${encodeURIComponent(deploymentId)}/aliases`);
  const production = (aliases.aliases ?? []).filter((a) => a.deployment?.target === "production" || a.target === "production");
  production.length === 0
    ? ok("no_production_alias_attached", `${(aliases.aliases ?? []).length} alias(es), none production`)
    : bad("no_production_alias_attached", `${production.length} production alias(es) attached`);
} catch (error) {
  bad("no_production_alias_attached", `alias query failed: ${String(error.message ?? error)}`);
}

// The deployment must be alive and must still refuse delivery unauthenticated.
const origin = `https://${resolvedHost}`;
const headers = BYPASS ? { "x-vercel-protection-bypass": BYPASS } : {};
try {
  const health = await fetch(`${origin}/api/health`, { headers });
  health.status === 200 ? ok("health_returns_200", `GET /api/health=${health.status}`) : bad("health_returns_200", `GET /api/health=${health.status}`);
} catch (error) {
  bad("health_returns_200", String(error.message ?? error));
}
try {
  const refused = await fetch(`${origin}/api/expungement-ai/packet/render`, { method: "POST", headers });
  refused.status >= 400
    ? ok("unauthenticated_render_refuses", `POST /packet/render=${refused.status}`)
    : bad("unauthenticated_render_refuses", `POST /packet/render=${refused.status}; a 2xx here is the failure`);
} catch (error) {
  bad("unauthenticated_render_refuses", String(error.message ?? error));
}

const rest = {
  candidateSuppliedBy: DEPLOYMENT_ID_INPUT ? "deployment_id" : "hostname",
  deploymentIdWasResolvedFromHostname: !DEPLOYMENT_ID_INPUT,
  vercelDeployCommandsExecuted: 0
};

if (problems.length > 0) {
  emit("refused_no_exact_preview", { hostname: resolvedHost, deploymentId, readyState, target, applicationSha: deployedSha, routeState: observedRouteState, rest });
  console.error(`\nrefused — ${problems.length} condition(s) failed on the supplied reuse candidate:`);
  for (const p of problems) console.error(`  - ${p}`);
  console.error("\nA supplied candidate that does not match is NOT replaced by a fresh deployment. Report the mismatch.");
  process.exit(1);
}

emit("reused_exact_ready_preview", { hostname: resolvedHost, deploymentId, readyState, target, applicationSha: deployedSha, routeState: observedRouteState, rest });
console.log(`  reusing ${origin} (${deploymentId}); no Vercel deployment command was executed.`);

async function resolveClinicScopeSha256() {
  if (!SUPABASE_ACCESS_TOKEN) return null;
  const response = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${SUPABASE_ACCESS_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      query: `select id,email from auth.users where lower(email) in ('mvl-demo-participant-a@rcap-acceptance.test','mvl-demo-participant-b@rcap-acceptance.test') order by case lower(email) when 'mvl-demo-participant-a@rcap-acceptance.test' then 1 else 2 end`
    })
  });
  const rows = await response.json().catch(() => null);
  if (!response.ok || !Array.isArray(rows) || rows.length !== 2 || rows.some((row) => !/^[0-9a-f-]{36}$/i.test(row?.id ?? ""))) return null;
  return createHash("sha256").update(rows.map((row) => row.id).join(",")).digest("hex");
}
