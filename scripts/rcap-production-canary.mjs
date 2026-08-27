#!/usr/bin/env node
// Bounded Production release preflight.
//
// The Vercel environment entry remains untouched. The controlling identity
// proof comes from the exact staged Production deployment's client runtime,
// with the accepted Preview as an explicit negative control. A missing staged
// candidate may be created with --prod --skip-domain; no alias is assigned.
//
// Supabase origins exist only in process memory. Evidence contains only
// booleans, project refs, SHA-256 hashes, and deployment identities.

import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  HOSTED_VERCEL_PROJECT_NAME,
  HOSTED_VERCEL_TEAM_SLUG,
  hostedVercelCliEnvironment,
  hostedVercelScopedUrl,
  resolveHostedVercelIdentity
} from "./rcap-hosted-acceptance-vercel-identity.mjs";

const APPLICATION_SHA = "441ee3188ee52047a012232d8d11f890a09b4ac5";
const TOOLS_SHA = "d075ff0fd5627ec55c9d27c3018b1fb77f1fa08b";
const WORKER_SOURCE_SHA = APPLICATION_SHA;
const WORKER_DIGEST = "sha256:67132df2d1bee49d123d0d2918880f283d2109195b49150265d348fe1d07a69c";
const PRODUCTION_PROJECT_REF = "wwtwtsmywnckfkdaqqeg";
const ACCEPTANCE_PROJECT_REF = "hyflxnlhpmiqxvvcoiia";
const ACCEPTANCE_DEPLOYMENT_ID = "dpl_9ygomDGFAXSLHENBfc6Undtyknjf";
const PUBLIC_ROUTES = ["/", "/sign-in", "/expungement-ai/sign-in"];

const PHASE = (process.env.RCAP_PRODUCTION_PHASE ?? "").trim();
const VERCEL_TOKEN = process.env.VERCEL_TOKEN ?? "";
const SUPABASE_ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN ?? "";
const VERCEL_AUTOMATION_BYPASS_SECRET = process.env.VERCEL_AUTOMATION_BYPASS_SECRET ?? "";
const INPUT_APPLICATION_SHA = (process.env.RCAP_APPLICATION_SHA ?? "").trim();
const INPUT_ACCEPTED_TOOLS_SHA = (process.env.RCAP_ACCEPTED_TOOLS_SHA ?? "").trim();
const INPUT_TOOLS_SHA = (process.env.RCAP_TOOLS_SHA ?? "").trim();
const INPUT_WORKER_SOURCE_SHA = (process.env.RCAP_WORKER_SOURCE_SHA ?? "").trim();
const INPUT_WORKER_DIGEST = (process.env.RCAP_WORKER_DIGEST ?? "").trim();
const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const EVIDENCE_DIR = path.resolve(process.env.RCAP_PRODUCTION_EVIDENCE_DIR ?? "production-canary-evidence");
const EVIDENCE_FILE = path.join(EVIDENCE_DIR, "production-preflight.json");

fs.mkdirSync(EVIDENCE_DIR, { recursive: true });

const verdicts = [];
const evidence = {
  schemaVersion: "rcap-production-preflight/v2",
  phase: PHASE,
  startedAt: new Date().toISOString(),
  valueReadbackRequirement: "superseded",
  valueSource: "exact staged deployment runtime",
  requestedIdentity: {
    applicationSha: APPLICATION_SHA,
    acceptedToolsSha: TOOLS_SHA,
    executionToolsSha: INPUT_TOOLS_SHA,
    workerSourceSha: WORKER_SOURCE_SHA,
    workerDigest: WORKER_DIGEST
  },
  projectRefs: {
    production: PRODUCTION_PROJECT_REF,
    acceptance: ACCEPTANCE_PROJECT_REF
  },
  productionConfigurationMutationAttempted: false,
  environmentVariableChanged: false,
  productionAliasChanged: false,
  productionDatabaseMutated: false,
  applicationChanged: false,
  workerChanged: false,
  originPersisted: false,
  secretsPersisted: false,
  stagedDeploymentCreated: false,
  deployments: null,
  controlHashes: null,
  runtimeProof: null,
  verdicts
};

function record(caseId, passed, observed) {
  verdicts.push({ caseId, passed, observed });
  console.log("  " + (passed ? "ok  " : "FAIL") + " " + caseId + " — " + observed);
  return passed;
}

function persist(passed, failure = null) {
  evidence.finishedAt = new Date().toISOString();
  evidence.passed = passed;
  evidence.failure = failure;
  fs.writeFileSync(EVIDENCE_FILE, JSON.stringify(evidence, null, 2) + "\n");
}

function sha256(value) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function parseJson(text) {
  try { return JSON.parse(text); }
  catch { return null; }
}

async function getJson(url, token) {
  const response = await fetch(url, {
    method: "GET",
    headers: token ? { Authorization: "Bearer " + token } : {}
  });
  const text = await response.text();
  return { status: response.status, ok: response.ok, json: parseJson(text) };
}

function targetList(entry) {
  return (Array.isArray(entry?.target) ? entry.target : [entry?.target].filter(Boolean))
    .filter((target) => typeof target === "string")
    .sort();
}

function safeEnvironmentMetadataHash(entries) {
  const safe = entries.map((entry) => ({
    id: entry?.id ?? null,
    configurationId: entry?.configurationId ?? null,
    key: entry?.key ?? null,
    type: entry?.type ?? null,
    target: targetList(entry),
    gitBranch: entry?.gitBranch ?? null,
    customEnvironmentIds: Array.isArray(entry?.customEnvironmentIds)
      ? [...entry.customEnvironmentIds].sort()
      : [],
    updatedAt: entry?.updatedAt ?? null
  })).sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)));
  return sha256(JSON.stringify(safe));
}

function normalizeEmbeddedText(value) {
  return value
    .replaceAll("\\u003a", ":")
    .replaceAll("\\u003A", ":")
    .replaceAll("\\u002f", "/")
    .replaceAll("\\u002F", "/")
    .replaceAll("\\/", "/");
}

function inspectForSupabaseOrigins(value, candidateOrigins) {
  const normalized = normalizeEmbeddedText(value);
  const patterns = [
    /https:\/\/[a-z0-9.-]+(?::\d+)?\/(?:auth|rest|storage|functions)\/v1\/?/gi,
    /https:\/\/[a-z0-9.-]+\.supabase\.co\/?/gi
  ];
  for (const pattern of patterns) {
    for (const match of normalized.matchAll(pattern)) {
      try { candidateOrigins.add(new URL(match[0]).origin); }
      catch { /* malformed strings are not candidates */ }
    }
  }
}

function scriptSources(html) {
  const sources = new Set();
  for (const match of html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi)) {
    try {
      const parsed = new URL(match[1], "https://runtime.invalid");
      if (parsed.pathname.startsWith("/_next/static/")) {
        sources.add(parsed.pathname + parsed.search);
      }
    } catch { /* malformed script references are ignored */ }
  }
  return [...sources];
}

async function runtimeGet(baseOrigin, pathname) {
  const headers = {
    "x-vercel-protection-bypass": VERCEL_AUTOMATION_BYPASS_SECRET
  };
  const response = await fetch(new URL(pathname, baseOrigin), {
    method: "GET",
    headers,
    redirect: "follow"
  });
  return {
    status: response.status,
    ok: response.ok,
    sameHost: new URL(response.url).host === new URL(baseOrigin).host,
    text: await response.text()
  };
}

async function inspectRuntimeSupabaseOrigin(immutableHostname) {
  const baseOrigin = "https://" + immutableHostname;
  const candidateOrigins = new Set();
  const fetchedChunks = new Set();
  let successfulPages = 0;
  let successfulChunks = 0;

  for (const route of PUBLIC_ROUTES) {
    const page = await runtimeGet(baseOrigin, route);
    if (!page.ok || !page.sameHost) continue;
    successfulPages += 1;
    inspectForSupabaseOrigins(page.text, candidateOrigins);
    for (const source of scriptSources(page.text)) {
      if (fetchedChunks.has(source)) continue;
      fetchedChunks.add(source);
      const chunk = await runtimeGet(baseOrigin, source);
      if (!chunk.ok || !chunk.sameHost) continue;
      successfulChunks += 1;
      inspectForSupabaseOrigins(chunk.text, candidateOrigins);
    }
  }

  if (successfulPages === 0) {
    throw new Error("runtime inspection could not fetch a public page from the exact deployment");
  }
  if (candidateOrigins.size !== 1) {
    throw new Error("runtime inspection did not expose exactly one Supabase origin");
  }

  return {
    origin: [...candidateOrigins][0],
    successfulPages,
    successfulChunks,
    candidateOriginCount: candidateOrigins.size
  };
}

async function originMapsToProject(origin, projectRef) {
  const project = await getJson(
    "https://api.supabase.com/v1/projects/" + encodeURIComponent(projectRef),
    SUPABASE_ACCESS_TOKEN
  );
  if (project.status !== 200 || (project.json?.ref ?? project.json?.id) !== projectRef) {
    return false;
  }

  const hostname = new URL(origin).hostname.toLowerCase();
  if (hostname === projectRef + ".supabase.co") return true;

  const custom = await getJson(
    "https://api.supabase.com/v1/projects/" + encodeURIComponent(projectRef) + "/custom-hostname",
    SUPABASE_ACCESS_TOKEN
  );
  const vanity = await getJson(
    "https://api.supabase.com/v1/projects/" + encodeURIComponent(projectRef) + "/config/vanity-subdomain",
    SUPABASE_ACCESS_TOKEN
  );
  const customHost = custom.json?.custom_hostname ?? custom.json?.hostname ?? null;
  const vanityName = vanity.json?.vanity_subdomain ?? vanity.json?.vanitySubdomain ?? null;
  const vanityHost = typeof vanityName === "string"
    ? (vanityName.includes(".") ? vanityName : vanityName + ".supabase.co")
    : null;
  const customMatches = custom.status === 200
    && custom.json?.status === "active"
    && String(customHost ?? "").toLowerCase() === hostname;
  const vanityMatches = vanity.status === 200
    && vanity.json?.status === "active"
    && String(vanityHost ?? "").toLowerCase() === hostname;
  return customMatches || vanityMatches;
}

function deploymentId(deployment) {
  return deployment?.id ?? deployment?.uid ?? null;
}

function deploymentReady(deployment) {
  return (deployment?.readyState ?? deployment?.state) === "READY";
}

async function resolveCurrentProduction(vercel, projectId) {
  const domainsResult = await vercel(
    "/v9/projects/" + encodeURIComponent(projectId) + "/domains?limit=100"
  );
  if (domainsResult.status !== 200) {
    throw new Error("Production domains could not be enumerated");
  }
  const domains = (Array.isArray(domainsResult.json?.domains) ? domainsResult.json.domains : [])
    .map((entry) => entry?.name)
    .filter((name) => typeof name === "string" && name.length > 0)
    .sort();
  const resolutions = [];
  for (const domain of domains) {
    const result = await vercel("/v13/deployments/" + encodeURIComponent(domain));
    if (result.status === 200
      && result.json?.target === "production"
      && deploymentReady(result.json)) {
      resolutions.push({ domain, deploymentId: deploymentId(result.json) });
    }
  }
  const ids = [...new Set(resolutions.map((entry) => entry.deploymentId).filter(Boolean))];
  if (ids.length !== 1 || resolutions.length === 0) {
    throw new Error("Production domains do not resolve to one exact READY deployment");
  }
  return {
    deploymentId: ids[0],
    aliasMappingHash: sha256(JSON.stringify(resolutions)),
    resolvedDomainCount: resolutions.length
  };
}

async function listExactStagedCandidates(vercel, projectId, currentProductionId) {
  const listed = await vercel(
    "/v6/deployments?projectId=" + encodeURIComponent(projectId)
      + "&target=production&state=READY&limit=100"
  );
  if (listed.status !== 200 || !Array.isArray(listed.json?.deployments)) {
    throw new Error("READY Production-target deployment inventory could not be read");
  }
  return listed.json.deployments.filter((candidate) => {
    const meta = candidate?.meta ?? {};
    return deploymentReady(candidate)
      && candidate?.target === "production"
      && deploymentId(candidate) !== currentProductionId
      && meta.rcapStagedProduction === "true"
      && meta.rcapApplicationSha === APPLICATION_SHA
      && meta.rcapWorkerSourceSha === WORKER_SOURCE_SHA
      && meta.rcapWorkerDigest === WORKER_DIGEST;
  });
}

async function runVercelCli(args, cliEnvironment) {
  return new Promise((resolve) => {
    const child = spawn("npx", args, {
      cwd: ROOT_DIR,
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, ...cliEnvironment }
    });
    let combined = "";
    child.stdout.on("data", (chunk) => { combined += String(chunk); });
    child.stderr.on("data", (chunk) => { combined += String(chunk); });
    child.on("error", (error) => resolve({ status: null, error, output: combined }));
    child.on("close", (code) => resolve({ status: code, error: null, output: combined }));
  });
}

async function createStagedProduction(vercelIdentity, vercel) {
  const targetArgs = ["--prod", "--skip-domain"];
  const args = [
    "vercel@latest",
    "deploy",
    "--archive=tgz",
    "--yes",
    "--token",
    VERCEL_TOKEN,
    "--scope",
    HOSTED_VERCEL_TEAM_SLUG,
    ...targetArgs,
    "--meta",
    "rcapStagedProduction=true",
    "--meta",
    "rcapApplicationSha=" + APPLICATION_SHA,
    "--meta",
    "rcapWorkerSourceSha=" + WORKER_SOURCE_SHA,
    "--meta",
    "rcapWorkerDigest=" + WORKER_DIGEST,
    "--meta",
    "rcapToolsSha=" + INPUT_TOOLS_SHA
  ];
  const result = await runVercelCli(args, hostedVercelCliEnvironment(vercelIdentity));
  if (result.error || result.status !== 0) {
    throw new Error("staged Production deployment command failed before identity verification");
  }

  const urls = result.output.match(/https:\/\/[a-z0-9-]+\.vercel\.app/gi) ?? [];
  const hostname = urls.length > 0 ? new URL(urls[urls.length - 1]).hostname : null;
  if (!hostname) {
    throw new Error("staged Production deployment command returned no immutable deployment identity");
  }
  const detail = await vercel("/v13/deployments/" + encodeURIComponent(hostname));
  if (detail.status !== 200) {
    throw new Error("new staged Production deployment could not be resolved by exact identity");
  }
  return detail.json;
}

async function exactDeploymentDetail(vercel, identifier) {
  const result = await vercel("/v13/deployments/" + encodeURIComponent(identifier));
  if (result.status !== 200) {
    throw new Error("exact deployment identity could not be resolved");
  }
  return result.json;
}

try {
  if (PHASE !== "preflight") {
    throw new Error("only the bounded Production preflight phase is enabled");
  }
  if (!VERCEL_TOKEN || !SUPABASE_ACCESS_TOKEN || !VERCEL_AUTOMATION_BYPASS_SECRET) {
    throw new Error("required secret-backed read-only sessions are unavailable");
  }

  const identityExact = INPUT_APPLICATION_SHA === APPLICATION_SHA
    && INPUT_ACCEPTED_TOOLS_SHA === TOOLS_SHA
    && /^[0-9a-f]{40}$/.test(INPUT_TOOLS_SHA)
    && INPUT_WORKER_SOURCE_SHA === WORKER_SOURCE_SHA
    && INPUT_WORKER_DIGEST === WORKER_DIGEST;
  if (!record(
    "release_identity_is_exact",
    identityExact,
    "application, tools, worker source, and immutable digest match the frozen authorization"
  )) {
    throw new Error("release identity input mismatch");
  }

  const vercelIdentity = await resolveHostedVercelIdentity({ token: VERCEL_TOKEN });
  const vercel = (pathname) => getJson(
    hostedVercelScopedUrl(pathname, vercelIdentity),
    VERCEL_TOKEN
  );

  const projectResult = await vercel(
    "/v9/projects/" + encodeURIComponent(vercelIdentity.projectId)
  );
  const projectExact = projectResult.status === 200
    && projectResult.json?.id === vercelIdentity.projectId
    && projectResult.json?.name === HOSTED_VERCEL_PROJECT_NAME;
  if (!record(
    "production_vercel_project_is_exact",
    projectExact,
    "team and project resolve to the pinned Production control plane"
  )) {
    throw new Error("Vercel Production project identity could not be established");
  }

  const envBeforeResult = await vercel(
    "/v9/projects/" + encodeURIComponent(vercelIdentity.projectId) + "/env"
  );
  if (envBeforeResult.status !== 200 || !Array.isArray(envBeforeResult.json?.envs)) {
    throw new Error("Vercel environment metadata inventory could not be read");
  }
  const environmentHashBefore = safeEnvironmentMetadataHash(envBeforeResult.json.envs);

  const productionBefore = await resolveCurrentProduction(vercel, vercelIdentity.projectId);
  if (!record(
    "rollback_target_recorded_before_mutation",
    Boolean(productionBefore.deploymentId),
    "current READY Production deployment identity recorded before staging"
  )) {
    throw new Error("rollback target is incomplete");
  }

  let stagedCandidates = await listExactStagedCandidates(
    vercel,
    vercelIdentity.projectId,
    productionBefore.deploymentId
  );
  let staged = null;
  if (stagedCandidates.length === 1) {
    staged = await exactDeploymentDetail(vercel, deploymentId(stagedCandidates[0]));
  } else if (stagedCandidates.length === 0) {
    staged = await createStagedProduction(vercelIdentity, vercel);
    evidence.stagedDeploymentCreated = true;
  } else {
    throw new Error("more than one exact staged Production candidate exists");
  }

  const stagedId = deploymentId(staged);
  const stagedMeta = staged?.meta ?? {};
  const stagedExact = Boolean(stagedId)
    && stagedId !== productionBefore.deploymentId
    && staged?.target === "production"
    && deploymentReady(staged)
    && stagedMeta.rcapStagedProduction === "true"
    && stagedMeta.rcapApplicationSha === APPLICATION_SHA
    && stagedMeta.rcapWorkerSourceSha === WORKER_SOURCE_SHA
    && stagedMeta.rcapWorkerDigest === WORKER_DIGEST;
  if (!record(
    "staged_production_deployment_is_exact",
    stagedExact,
    "READY Production-target staging identity is exact and is not the active Production deployment"
  )) {
    throw new Error("staged Production deployment identity mismatch");
  }

  const acceptance = await exactDeploymentDetail(vercel, ACCEPTANCE_DEPLOYMENT_ID);
  const acceptanceMeta = acceptance?.meta ?? {};
  const acceptanceExact = deploymentId(acceptance) === ACCEPTANCE_DEPLOYMENT_ID
    && deploymentReady(acceptance)
    && (acceptance?.target === null || acceptance?.target === "preview")
    && acceptanceMeta.rcapApplicationSha === APPLICATION_SHA
    && acceptanceMeta.rcapAcceptanceProjectRef === ACCEPTANCE_PROJECT_REF;
  if (!record(
    "accepted_preview_deployment_is_exact",
    acceptanceExact,
    "accepted READY Preview deployment and per-deployment acceptance identity are exact"
  )) {
    throw new Error("accepted Preview deployment identity mismatch");
  }

  const stagedHostname = staged?.url ?? null;
  const acceptanceHostname = acceptance?.url ?? null;
  if (!stagedHostname || !acceptanceHostname) {
    throw new Error("immutable deployment hostnames are unavailable for bounded runtime inspection");
  }

  const productionRuntime = await inspectRuntimeSupabaseOrigin(stagedHostname);
  const acceptanceRuntime = await inspectRuntimeSupabaseOrigin(acceptanceHostname);
  const productionCanonical = await originMapsToProject(
    productionRuntime.origin,
    PRODUCTION_PROJECT_REF
  );
  const acceptanceCanonical = await originMapsToProject(
    acceptanceRuntime.origin,
    ACCEPTANCE_PROJECT_REF
  );

  if (!record(
    "production_runtime_project_is_canonical",
    productionCanonical,
    "exact staged runtime maps to canonical Production project " + PRODUCTION_PROJECT_REF
  )) {
    throw new Error("staged Production runtime maps to the wrong Supabase project");
  }
  if (!record(
    "acceptance_preview_project_is_exact",
    acceptanceCanonical,
    "exact accepted Preview runtime maps to acceptance project " + ACCEPTANCE_PROJECT_REF
  )) {
    throw new Error("accepted Preview runtime maps to the wrong Supabase project");
  }
  if (!record(
    "production_environment_is_separate_from_acceptance",
    productionRuntime.origin !== acceptanceRuntime.origin
      && PRODUCTION_PROJECT_REF !== ACCEPTANCE_PROJECT_REF,
    "Production and acceptance runtime project identities are distinct"
  )) {
    throw new Error("Production and acceptance Supabase identities overlap");
  }

  const envAfterResult = await vercel(
    "/v9/projects/" + encodeURIComponent(vercelIdentity.projectId) + "/env"
  );
  if (envAfterResult.status !== 200 || !Array.isArray(envAfterResult.json?.envs)) {
    throw new Error("post-staging environment metadata inventory could not be read");
  }
  const environmentHashAfter = safeEnvironmentMetadataHash(envAfterResult.json.envs);
  const productionAfter = await resolveCurrentProduction(vercel, vercelIdentity.projectId);

  const envUnchanged = environmentHashBefore === environmentHashAfter;
  const aliasesUnchanged = productionBefore.deploymentId === productionAfter.deploymentId
    && productionBefore.aliasMappingHash === productionAfter.aliasMappingHash;
  evidence.environmentVariableChanged = !envUnchanged;
  evidence.productionAliasChanged = !aliasesUnchanged;

  if (!record(
    "production_environment_metadata_unchanged",
    envUnchanged,
    "project environment metadata SHA-256 is unchanged"
  )) {
    throw new Error("Vercel project environment metadata changed during preflight");
  }
  if (!record(
    "production_aliases_unchanged",
    aliasesUnchanged,
    "active Production deployment and domain mapping SHA-256 are unchanged"
  )) {
    throw new Error("Production alias mapping changed during preflight");
  }

  evidence.deployments = {
    rollbackTarget: productionBefore.deploymentId,
    stagedProduction: stagedId,
    acceptedPreview: ACCEPTANCE_DEPLOYMENT_ID
  };
  evidence.controlHashes = {
    environmentMetadataBeforeSha256: environmentHashBefore,
    environmentMetadataAfterSha256: environmentHashAfter,
    productionAliasMappingBeforeSha256: productionBefore.aliasMappingHash,
    productionAliasMappingAfterSha256: productionAfter.aliasMappingHash
  };
  evidence.runtimeProof = {
    productionProjectRef: PRODUCTION_PROJECT_REF,
    acceptanceProjectRef: ACCEPTANCE_PROJECT_REF,
    exactlyOneProductionOrigin: productionRuntime.candidateOriginCount === 1,
    exactlyOneAcceptanceOrigin: acceptanceRuntime.candidateOriginCount === 1,
    productionOriginSha256: sha256(productionRuntime.origin),
    acceptanceOriginSha256: sha256(acceptanceRuntime.origin),
    productionProjectMatch: productionCanonical,
    acceptanceProjectMatch: acceptanceCanonical,
    productionPagesInspected: productionRuntime.successfulPages,
    productionChunksInspected: productionRuntime.successfulChunks,
    acceptancePagesInspected: acceptanceRuntime.successfulPages,
    acceptanceChunksInspected: acceptanceRuntime.successfulChunks
  };

  record(
    "preflight_performed_no_production_mutation",
    true,
    "no environment, alias, database, application, or worker mutation occurred"
  );
  persist(true);
  console.log("PRODUCTION PREFLIGHT PASS — exact staged runtime identity proven; no Production alias or database mutation");
} catch (error) {
  const failure = error instanceof Error ? error.message : String(error);
  persist(false, failure);
  console.error("PRODUCTION PREFLIGHT REFUSED — " + failure);
  process.exit(1);
}
