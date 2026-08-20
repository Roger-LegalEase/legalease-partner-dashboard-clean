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

const OUT_DIR = path.resolve("hosted-acceptance-evidence");

const HOSTNAME_INPUT = (process.env.HOSTED_PREVIEW_HOSTNAME ?? "").trim().replace(/^https?:\/\//, "").replace(/\/+$/, "");
const DEPLOYMENT_ID_INPUT = (process.env.HOSTED_PREVIEW_DEPLOYMENT_ID ?? "").trim();
const APPLICATION_SHA = (process.env.HOSTED_APPLICATION_SHA ?? "").trim();
const PROJECT_REF = (process.env.ACCEPTANCE_SUPABASE_PROJECT_REF ?? "").trim();
const VERCEL_TOKEN = process.env.VERCEL_TOKEN ?? "";
const VERCEL_TEAM = process.env.VERCEL_ORG_ID ?? "";
const BYPASS = process.env.VERCEL_AUTOMATION_BYPASS_SECRET ?? "";

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
  const url = new URL(`https://api.vercel.com${route}`);
  if (VERCEL_TEAM) url.searchParams.set("teamId", VERCEL_TEAM);
  const response = await fetch(url, { headers: { Authorization: `Bearer ${VERCEL_TOKEN}` } });
  if (!response.ok) throw new Error(`Vercel ${route} returned HTTP ${response.status}`);
  return response.json();
};

// --- no candidate supplied: the caller wants a fresh Preview ----------------
if (!HOSTNAME_INPUT && !DEPLOYMENT_ID_INPUT) {
  emit("created_one_new_preview", { rest: { note: "no reuse candidate supplied; the deploy path creates exactly one Preview" } });
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
const resolvedHost = deployment.url ? String(deployment.url).replace(/^https?:\/\//, "") : HOSTNAME_INPUT;

deploymentId ? ok("deployment_id_resolved", deploymentId) : bad("deployment_id_resolved", "Vercel returned no deployment id");
if (HOSTNAME_INPUT) {
  resolvedHost === HOSTNAME_INPUT
    ? ok("hostname_matches_the_authorized_preview", resolvedHost)
    : bad("hostname_matches_the_authorized_preview", `resolved ${resolvedHost}, authorized ${HOSTNAME_INPUT}`);
}
readyState === "READY" ? ok("deployment_is_ready", readyState) : bad("deployment_is_ready", `readyState=${readyState}`);
// target null means Preview. "production" is the one value that must never pass.
target !== "production" ? ok("target_is_preview_not_production", `target=${target}`) : bad("target_is_preview_not_production", "target=production");

const deployedSha = meta.rcapApplicationSha ?? null;
deployedSha === APPLICATION_SHA
  ? ok("deployment_carries_the_authorized_application_sha", deployedSha)
  : bad("deployment_carries_the_authorized_application_sha", `deployment records ${deployedSha ?? "(none)"}, authorized ${APPLICATION_SHA}`);

const deployedProject = meta.rcapAcceptanceProjectRef ?? meta.acceptanceProjectRef ?? null;
if (deployedProject) {
  deployedProject === PROJECT_REF
    ? ok("bound_to_the_acceptance_project", deployedProject)
    : bad("bound_to_the_acceptance_project", `deployment records ${deployedProject}, authorized ${PROJECT_REF}`);
} else {
  ok("bound_to_the_acceptance_project", `not recorded in deployment metadata; asserted downstream against ${PROJECT_REF}`);
}

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
  emit("refused_no_exact_preview", { hostname: resolvedHost, deploymentId, readyState, target, applicationSha: deployedSha, rest });
  console.error(`\nrefused — ${problems.length} condition(s) failed on the supplied reuse candidate:`);
  for (const p of problems) console.error(`  - ${p}`);
  console.error("\nA supplied candidate that does not match is NOT replaced by a fresh deployment. Report the mismatch.");
  process.exit(1);
}

emit("reused_exact_ready_preview", { hostname: resolvedHost, deploymentId, readyState, target, applicationSha: deployedSha, rest });
console.log(`  reusing ${origin} (${deploymentId}); no Vercel deployment command was executed.`);
