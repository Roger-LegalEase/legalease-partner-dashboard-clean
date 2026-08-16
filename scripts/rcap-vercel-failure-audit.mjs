#!/usr/bin/env node
// Read-only post-failure Vercel audit for the RCAP acceptance deployment.
//
// A Vercel CLI process can fail after Vercel has accepted the archive. Before
// abandoning the Preview path, this script lists every READY deployment for
// the configured project, selects only the exact frozen acceptance tuple, and
// re-reads each candidate by immutable deployment id. It also records a
// value-free snapshot of production aliases and production environment-variable
// shape. Every remote request in this file is GET; absence of a match is a
// valid audit result, not an instruction to deploy.

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const evidenceDir = path.join(rootDir, "hosted-acceptance-evidence");
const evidencePath = path.join(evidenceDir, "vercel-failure-audit.json");
fs.mkdirSync(evidenceDir, { recursive: true });

const EXPECTED_APPLICATION_SHA = "664b8ddd374642bf2bd1820f7e05224f3dd081bc";
const EXPECTED_PROJECT_REF = "hyflxnlhpmiqxvvcoiia";
const EXPECTED_STRIPE_CONFIGURED = "true";
const EXPECTED_ROUTE_STATE = "staging_scoped";

const APPLICATION_SHA = process.env.HOSTED_APPLICATION_SHA ?? "";
const PROJECT_REF = process.env.ACCEPTANCE_SUPABASE_PROJECT_REF ?? "";
const VERCEL_TOKEN = process.env.VERCEL_TOKEN ?? "";
const VERCEL_ORG_ID = process.env.VERCEL_ORG_ID ?? "";
const VERCEL_PROJECT_ID = process.env.VERCEL_PROJECT_ID ?? "";

const evidence = {
  schemaVersion: "rcap-vercel-failure-audit/v1",
  auditedAt: new Date().toISOString(),
  operation: "read_only",
  expected: {
    applicationSha: EXPECTED_APPLICATION_SHA,
    acceptanceProjectRef: EXPECTED_PROJECT_REF,
    stripeConfigured: EXPECTED_STRIPE_CONFIGURED,
    routeState: EXPECTED_ROUTE_STATE,
    readyState: "READY",
    allowedTargets: [null, "preview"]
  },
  remoteMethodsUsed: ["GET"],
  environmentValuesIncluded: false,
  passed: false,
  outcome: "audit_not_started"
};

function writeEvidence() {
  fs.writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, { mode: 0o600 });
}

function redactError(error) {
  let message = String(error?.message ?? error);
  for (const value of [VERCEL_TOKEN, VERCEL_ORG_ID, VERCEL_PROJECT_ID].filter(Boolean)) {
    message = message.split(value).join("***");
  }
  return message;
}

function fail(message) {
  throw new Error(message);
}

function requireInputs() {
  const missing = [
    ["HOSTED_APPLICATION_SHA", APPLICATION_SHA],
    ["ACCEPTANCE_SUPABASE_PROJECT_REF", PROJECT_REF],
    ["VERCEL_TOKEN", VERCEL_TOKEN],
    ["VERCEL_ORG_ID", VERCEL_ORG_ID],
    ["VERCEL_PROJECT_ID", VERCEL_PROJECT_ID]
  ].filter(([, value]) => !value).map(([name]) => name);

  if (missing.length > 0) fail(`missing required inputs: ${missing.join(", ")}`);
  if (APPLICATION_SHA !== EXPECTED_APPLICATION_SHA) fail("application SHA is not the authorized frozen SHA");
  if (PROJECT_REF !== EXPECTED_PROJECT_REF) fail("Supabase ref is not the authorized acceptance project");
}

function scopeCandidates() {
  return VERCEL_ORG_ID.startsWith("team_") ? ["teamId", "slug"] : ["slug", "teamId"];
}

function scopedUrl(pathname, scopeName) {
  const url = new URL(pathname, "https://api.vercel.com");
  url.searchParams.set(scopeName, VERCEL_ORG_ID);
  return url;
}

async function getJson(pathname, scopeName) {
  const response = await fetch(scopedUrl(pathname, scopeName), {
    method: "GET",
    headers: { Authorization: `Bearer ${VERCEL_TOKEN}` },
    signal: AbortSignal.timeout(30_000)
  });
  const text = await response.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* surfaced through status/shape checks */ }
  return { status: response.status, json };
}

function normalizedTargets(target) {
  if (Array.isArray(target)) return [...target].map(String).sort();
  return target == null ? [] : [String(target)];
}

function productionEnvironmentShape(entries) {
  return entries
    .filter((entry) => normalizedTargets(entry?.target).includes("production"))
    .map((entry) => ({
      key: String(entry?.key ?? ""),
      targets: normalizedTargets(entry?.target),
      type: String(entry?.type ?? ""),
      updatedAt: entry?.updatedAt ?? null
    }))
    .sort((left, right) => `${left.key}:${left.targets.join("|")}`.localeCompare(`${right.key}:${right.targets.join("|")}`));
}

function productionAliases(project) {
  return (Array.isArray(project?.alias) ? project.alias : [])
    .filter((entry) => entry && typeof entry === "object" && String(entry.target ?? "").toUpperCase() === "PRODUCTION")
    .map((entry) => ({ domain: String(entry.domain ?? ""), target: "PRODUCTION" }))
    .filter((entry) => entry.domain)
    .sort((left, right) => left.domain.localeCompare(right.domain));
}

function deploymentId(deployment) {
  return deployment?.uid ?? deployment?.id ?? null;
}

function deploymentState(deployment) {
  return deployment?.readyState ?? deployment?.state ?? null;
}

function isPreviewTarget(target) {
  return target === null || target === undefined || target === "preview";
}

function hasExactTuple(deployment) {
  return deploymentState(deployment) === "READY"
    && isPreviewTarget(deployment?.target)
    && deployment?.meta?.rcapApplicationSha === APPLICATION_SHA
    && deployment?.meta?.rcapAcceptanceProjectRef === PROJECT_REF
    && deployment?.meta?.rcapStripeConfigured === EXPECTED_STRIPE_CONFIGURED
    && deployment?.meta?.rcapRouteState === EXPECTED_ROUTE_STATE;
}

function hostname(rawUrl) {
  return String(rawUrl ?? "")
    .replace(/^https?:\/\//i, "")
    .split("/")[0];
}

async function resolveProject() {
  for (const scopeName of scopeCandidates()) {
    const response = await getJson(`/v9/projects/${encodeURIComponent(VERCEL_PROJECT_ID)}`, scopeName);
    if (response.status === 200 && response.json?.id) {
      return { scopeName, project: response.json };
    }
  }
  fail("Vercel project could not be resolved in either authorized team scope form");
}

async function listAllReadyDeployments(canonicalProjectId, scopeName) {
  const deployments = [];
  const seenIds = new Set();
  const seenCursors = new Set();
  let until = null;
  let pagesRead = 0;

  for (;;) {
    pagesRead += 1;
    if (pagesRead > 1000) fail("Vercel deployment pagination exceeded 1000 pages; refusing incomplete evidence");

    const params = new URLSearchParams({
      projectId: canonicalProjectId,
      limit: "100",
      state: "READY"
    });
    if (until !== null) params.set("until", String(until));

    const response = await getJson(`/v6/deployments?${params}`, scopeName);
    if (response.status !== 200 || !Array.isArray(response.json?.deployments)) {
      fail(`Vercel READY deployment list failed with HTTP ${response.status}`);
    }

    for (const item of response.json.deployments) {
      const id = deploymentId(item);
      if (!id || seenIds.has(id)) continue;
      seenIds.add(id);
      deployments.push(item);
    }

    const next = response.json?.pagination?.next ?? null;
    if (next === null || next === undefined) break;
    const cursor = String(next);
    if (seenCursors.has(cursor)) fail("Vercel deployment pagination repeated a cursor; refusing incomplete evidence");
    seenCursors.add(cursor);
    until = cursor;
  }

  return { deployments, pagesRead };
}

async function main() {
  requireInputs();

  const { scopeName, project } = await resolveProject();
  const canonicalProjectId = project.id;
  const envResponse = await getJson(`/v9/projects/${encodeURIComponent(canonicalProjectId)}/env`, scopeName);
  if (envResponse.status !== 200 || !Array.isArray(envResponse.json?.envs)) {
    fail(`Vercel environment-shape read failed with HTTP ${envResponse.status}`);
  }

  const envShape = productionEnvironmentShape(envResponse.json.envs);
  const envShapeJson = JSON.stringify(envShape);
  evidence.project = {
    identityResolved: true,
    name: project.name ?? null,
    framework: project.framework ?? null,
    scopeParameter: scopeName,
    productionAliases: productionAliases(project)
  };
  evidence.productionEnvironment = {
    variableCount: envShape.length,
    shape: envShape,
    shapeSha256: crypto.createHash("sha256").update(envShapeJson).digest("hex"),
    valuesIncluded: false
  };

  const listed = await listAllReadyDeployments(canonicalProjectId, scopeName);
  const exactSummaries = listed.deployments.filter(hasExactTuple);
  const matchingReadyPreviews = [];
  const rejectedAfterDetailRead = [];

  for (const summary of exactSummaries) {
    const id = deploymentId(summary);
    const response = await getJson(`/v13/deployments/${encodeURIComponent(id)}`, scopeName);
    if (response.status !== 200 || !response.json) {
      fail(`Vercel detail read for an exact summary candidate failed with HTTP ${response.status}`);
    }

    const detail = response.json;
    const resolvedId = deploymentId(detail);
    const detailProjectId = detail.projectId ?? detail.project?.id ?? null;
    const exact = resolvedId === id && detailProjectId === canonicalProjectId && hasExactTuple(detail);
    if (!exact) {
      rejectedAfterDetailRead.push({
        id,
        resolvedId,
        projectMatched: detailProjectId === canonicalProjectId,
        readyState: deploymentState(detail),
        target: detail.target ?? null,
        applicationSha: detail.meta?.rcapApplicationSha ?? null,
        acceptanceProjectRef: detail.meta?.rcapAcceptanceProjectRef ?? null,
        stripeConfigured: detail.meta?.rcapStripeConfigured ?? null,
        routeState: detail.meta?.rcapRouteState ?? null
      });
      continue;
    }

    const host = hostname(detail.url);
    if (!host) fail("an exact READY Preview deployment had no hostname");
    matchingReadyPreviews.push({
      id,
      hostname: host,
      url: `https://${host}`,
      target: detail.target ?? null,
      readyState: deploymentState(detail),
      createdAt: detail.createdAt ?? detail.created ?? null,
      applicationSha: detail.meta.rcapApplicationSha,
      acceptanceProjectRef: detail.meta.rcapAcceptanceProjectRef,
      stripeConfigured: detail.meta.rcapStripeConfigured,
      routeState: detail.meta.rcapRouteState
    });
  }

  matchingReadyPreviews.sort((left, right) => Number(right.createdAt ?? 0) - Number(left.createdAt ?? 0));
  evidence.deployments = {
    listComplete: true,
    pagesRead: listed.pagesRead,
    readyDeploymentsExamined: listed.deployments.length,
    exactSummaryCandidates: exactSummaries.length,
    rejectedAfterDetailRead,
    matchingReadyPreviews,
    usablePreviewExists: matchingReadyPreviews.length > 0
  };
  if (rejectedAfterDetailRead.length > 0) {
    fail("one or more exact list candidates failed immutable detail revalidation");
  }
  evidence.passed = true;
  evidence.outcome = matchingReadyPreviews.length > 0
    ? "matching_ready_preview_exists"
    : "no_matching_ready_preview";
  writeEvidence();

  console.log(`VERCEL FAILURE AUDIT PASSED — ${matchingReadyPreviews.length} exact READY Preview deployment(s)`);
  for (const match of matchingReadyPreviews) {
    console.log(`  ${match.id} ${match.hostname} target=${JSON.stringify(match.target)} ready=${match.readyState}`);
  }
  console.log(`  production aliases=${evidence.project.productionAliases.length}; production env shape entries=${envShape.length}; values recorded=false`);
}

main().catch((error) => {
  evidence.passed = false;
  evidence.outcome = "audit_failed";
  evidence.error = redactError(error);
  writeEvidence();
  console.error(`VERCEL FAILURE AUDIT FAILED — ${evidence.error}`);
  process.exit(1);
});
