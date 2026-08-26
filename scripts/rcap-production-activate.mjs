#!/usr/bin/env node
// Final activation for the exact staged Production deployment. This control
// cannot build, migrate, or alter configuration. It promotes the already-smoked
// Production-target deployment and automatically restores the recorded READY
// deployment if any post-promotion assertion fails.

import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import {
  HOSTED_VERCEL_PROJECT_NAME,
  HOSTED_VERCEL_TEAM_SLUG,
  hostedVercelCliEnvironment,
  hostedVercelScopedUrl,
  resolveHostedVercelIdentity
} from "./rcap-hosted-acceptance-vercel-identity.mjs";

const APPLICATION_SHA = "441ee3188ee52047a012232d8d11f890a09b4ac5";
const WORKER_SOURCE_SHA = APPLICATION_SHA;
const WORKER_DIGEST = "sha256:67132df2d1bee49d123d0d2918880f283d2109195b49150265d348fe1d07a69c";
const PRODUCTION_PROJECT_REF = "wwtwtsmywnckfkdaqqeg";
const STAGED_DEPLOYMENT_ID = "dpl_DGDUFV4B7ufTAW5wsfR2txJE2dVL";
const ROLLBACK_DEPLOYMENT_ID = "dpl_9WoA51v3wXSvG3VmBKGUEKtVBCfS";
const SMOKE_RUN_ID = "32967717618";
const SMOKE_FILE = path.resolve(
  process.env.RCAP_PRODUCTION_SMOKE_EVIDENCE_FILE
    ?? "prior-production-smoke-evidence/production-canary-smoke.json"
);
const EVIDENCE_DIR = path.resolve(
  process.env.RCAP_PRODUCTION_EVIDENCE_DIR ?? "production-canary-evidence"
);
const EVIDENCE_FILE = path.join(EVIDENCE_DIR, "production-activation.json");
const REQUIRED_MIGRATION_HASHES = Object.freeze([
  "5e3df0a7f49aae3ebbec10b7392acd331e9ca91b2ffa11c7ee16b3e996f3ddef",
  "9a0af066fbe2d47c82f259e6998a7056a2f8c377c8e6875f143d40fd11f18835",
  "9fb46113fbb87eb75b1502f7cb85c9c27a36bac284888202b64baa63398f8010"
]);
const REQUIRED_TABLES = Object.freeze([
  "clinic_events", "clinic_event_staff", "clinic_event_access_codes",
  "clinic_event_access_redemptions", "clinic_assisted_sessions", "clinic_cases",
  "clinic_follow_ups", "clinic_incidents", "clinic_event_audit",
  "clinic_packet_reservations"
]);
const REQUIRED_FUNCTIONS = Object.freeze([
  "clinic_create_event", "clinic_set_event_staff", "clinic_create_access_code",
  "clinic_set_event_status", "clinic_redeem_event_code", "clinic_start_assisted_session",
  "clinic_end_assisted_session", "clinic_upsert_case", "clinic_transition_case",
  "clinic_upsert_follow_up", "clinic_record_incident", "clinic_reserve_packet_credit",
  "clinic_finalize_packet_credit", "clinic_release_packet_credit",
  "clinic_reserve_participant_packet_credit", "clinic_sync_packet_reservation",
  "clinic_actor_can_event", "clinic_upsert_event_follow_up", "clinic_get_event_queue",
  "clinic_transition_event_case", "clinic_get_follow_ups", "clinic_get_event_report"
]);

const PHASE = (process.env.RCAP_PRODUCTION_PHASE ?? "").trim();
const INPUT_APPLICATION_SHA = (process.env.RCAP_APPLICATION_SHA ?? "").trim();
const INPUT_WORKER_SOURCE_SHA = (process.env.RCAP_WORKER_SOURCE_SHA ?? "").trim();
const INPUT_WORKER_DIGEST = (process.env.RCAP_WORKER_DIGEST ?? "").trim();
const VERCEL_TOKEN = process.env.VERCEL_TOKEN ?? "";
const SUPABASE_ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN ?? "";

fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
const verdicts = [];
const evidence = {
  schemaVersion: "rcap-production-activation/v1",
  startedAt: new Date().toISOString(),
  applicationSha: APPLICATION_SHA,
  workerSourceSha: WORKER_SOURCE_SHA,
  workerDigest: WORKER_DIGEST,
  productionProjectRef: PRODUCTION_PROJECT_REF,
  stagedDeploymentId: STAGED_DEPLOYMENT_ID,
  rollbackDeploymentId: ROLLBACK_DEPLOYMENT_ID,
  smokeRunId: SMOKE_RUN_ID,
  migrationHashes: REQUIRED_MIGRATION_HASHES,
  promotionAttempted: false,
  promotionCompleted: false,
  productionAliasChanged: false,
  deploymentTriggered: false,
  environmentVariableChanged: false,
  productionDatabaseMutated: false,
  applicationChanged: false,
  workerChanged: false,
  realParticipantRecordsCreated: false,
  realChargesCreated: false,
  automaticRollback: {
    attempted: false,
    completed: false,
    failure: null
  },
  originPersisted: false,
  secretsPersisted: false,
  controlHashes: null,
  verdicts
};

function sha256(value) {
  return createHash("sha256").update(String(value), "utf8").digest("hex");
}

function parseJson(text) {
  try { return JSON.parse(text); }
  catch { return null; }
}

function record(caseId, passed, observed) {
  verdicts.push({ caseId, passed, observed });
  console.log(`  ${passed ? "ok  " : "FAIL"} ${caseId} — ${observed}`);
  if (!passed) throw new Error(caseId);
}

function persist(passed, failure = null) {
  evidence.finishedAt = new Date().toISOString();
  evidence.passed = passed;
  evidence.failure = failure;
  fs.writeFileSync(EVIDENCE_FILE, `${JSON.stringify(evidence, null, 2)}\n`);
}

async function getJson(url, token) {
  const response = await fetch(url, {
    method: "GET",
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });
  const text = await response.text();
  return { status: response.status, json: parseJson(text) };
}

function deploymentId(value) {
  return value?.id ?? value?.uid ?? null;
}

function ready(value) {
  return (value?.readyState ?? value?.state) === "READY";
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

function deploymentInventoryHash(deployments) {
  const safe = deployments.map((entry) => deploymentId(entry)).filter(Boolean).sort();
  return sha256(JSON.stringify(safe));
}

function postgresArray(value) {
  if (Array.isArray(value)) return value.map(String);
  if (value === null || value === undefined || value === "{}") return [];
  if (typeof value !== "string" || !value.startsWith("{") || !value.endsWith("}")) return [];
  return value.slice(1, -1).split(",").filter(Boolean)
    .map((entry) => entry.replace(/^"|"$/g, ""));
}

function exactNames(actual, expected) {
  return JSON.stringify([...actual].sort()) === JSON.stringify([...expected].sort());
}

function sqlNames(values) {
  return values.map((value) => `'${value.replaceAll("'", "''")}'`).join(",");
}

async function managementSelect(query) {
  if (!/^\s*select\b/i.test(query)) throw new Error("activation database readback must be SELECT-only");
  const response = await fetch(
    `https://api.supabase.com/v1/projects/${PRODUCTION_PROJECT_REF}/database/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SUPABASE_ACCESS_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ query })
    }
  );
  const text = await response.text();
  if (!response.ok) throw new Error(`Production SELECT readback returned HTTP ${response.status}`);
  return parseJson(text);
}

async function clinicSchemaReadback() {
  const rows = await managementSelect(`
    select
      array(select c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace
        where n.nspname='public' and c.relname in (${sqlNames(REQUIRED_TABLES)})
          and c.relrowsecurity order by c.relname) as rls_tables,
      array(select distinct p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace
        where n.nspname='public' and p.proname in (${sqlNames(REQUIRED_FUNCTIONS)})
        order by p.proname) as functions
  `);
  const row = Array.isArray(rows) ? rows[0] ?? {} : {};
  return {
    rlsTables: postgresArray(row.rls_tables),
    functions: postgresArray(row.functions)
  };
}

async function listProductionDomains(vercel, projectId) {
  const result = await vercel(`/v9/projects/${encodeURIComponent(projectId)}/domains?limit=100`);
  if (result.status !== 200) throw new Error("Production domains could not be enumerated");
  const domains = (Array.isArray(result.json?.domains) ? result.json.domains : [])
    .map((entry) => entry?.name)
    .filter((name) => typeof name === "string" && name.length > 0)
    .sort();
  if (domains.length === 0) throw new Error("Production domain inventory is empty");
  return domains;
}

async function resolveProductionDomains(vercel, projectId) {
  const domains = await listProductionDomains(vercel, projectId);
  const mappings = [];
  for (const domain of domains) {
    const result = await vercel(`/v13/deployments/${encodeURIComponent(domain)}`);
    mappings.push({
      domain,
      deploymentId: result.status === 200 && result.json?.target === "production" && ready(result.json)
        ? deploymentId(result.json)
        : null
    });
  }
  return {
    domains,
    deploymentIds: [...new Set(mappings.map((entry) => entry.deploymentId).filter(Boolean))],
    mappingHash: sha256(JSON.stringify(mappings))
  };
}

async function waitForExactProduction(vercel, projectId, expectedDeploymentId) {
  const deadline = Date.now() + 120_000;
  let last = null;
  while (Date.now() < deadline) {
    last = await resolveProductionDomains(vercel, projectId);
    if (last.deploymentIds.length === 1
      && last.deploymentIds[0] === expectedDeploymentId
      && last.domains.length > 0) return last;
    await new Promise((resolve) => setTimeout(resolve, 3_000));
  }
  throw new Error(`Production domains did not converge to ${expectedDeploymentId}; resolved=${last?.deploymentIds.length ?? 0}`);
}

function normalizeEmbeddedText(value) {
  return value.replaceAll("\\u003a", ":").replaceAll("\\u003A", ":")
    .replaceAll("\\u002f", "/").replaceAll("\\u002F", "/").replaceAll("\\/", "/");
}

function collectOrigins(value, origins) {
  const normalized = normalizeEmbeddedText(value);
  for (const pattern of [
    /https:\/\/[a-z0-9.-]+(?::\d+)?\/(?:auth|rest|storage|functions)\/v1\/?/gi,
    /https:\/\/[a-z0-9.-]+\.supabase\.co\/?/gi
  ]) {
    for (const match of normalized.matchAll(pattern)) {
      try { origins.add(new URL(match[0]).origin); }
      catch { /* malformed strings are not candidates */ }
    }
  }
}

function scriptSources(html) {
  const values = new Set();
  for (const match of html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi)) {
    try {
      const parsed = new URL(match[1], "https://runtime.invalid");
      if (parsed.pathname.startsWith("/_next/static/")) values.add(parsed.pathname + parsed.search);
    } catch { /* malformed sources are ignored */ }
  }
  return [...values];
}

async function inspectActiveRuntime(domains) {
  const allowedHosts = new Set(domains);
  const origins = new Set();
  const fetchedChunks = new Set();
  let healthyDomains = 0;
  let pagesInspected = 0;
  let chunksInspected = 0;

  for (const domain of domains) {
    const health = await fetch(`https://${domain}/api/health`, { method: "GET", redirect: "follow" });
    const healthBody = await health.json().catch(() => null);
    if (health.status === 200 && healthBody && typeof healthBody.checks === "object") healthyDomains += 1;

    for (const route of ["/", "/sign-in", "/expungement-ai/sign-in"]) {
      const page = await fetch(`https://${domain}${route}`, { method: "GET", redirect: "follow" });
      if (!page.ok || !allowedHosts.has(new URL(page.url).hostname)) continue;
      pagesInspected += 1;
      const html = await page.text();
      collectOrigins(html, origins);
      const finalOrigin = new URL(page.url).origin;
      for (const source of scriptSources(html)) {
        const chunkUrl = new URL(source, finalOrigin).href;
        if (fetchedChunks.has(chunkUrl)) continue;
        fetchedChunks.add(chunkUrl);
        const chunk = await fetch(chunkUrl, { method: "GET", redirect: "follow" });
        if (!chunk.ok || !allowedHosts.has(new URL(chunk.url).hostname)) continue;
        chunksInspected += 1;
        collectOrigins(await chunk.text(), origins);
      }
    }
  }
  if (origins.size !== 1) throw new Error("active Production runtime did not expose exactly one Supabase origin");
  return {
    origin: [...origins][0],
    candidateCount: origins.size,
    healthyDomains,
    pagesInspected,
    chunksInspected
  };
}

async function originMatchesProductionProject(origin) {
  const project = await getJson(
    `https://api.supabase.com/v1/projects/${PRODUCTION_PROJECT_REF}`,
    SUPABASE_ACCESS_TOKEN
  );
  if (project.status !== 200 || (project.json?.ref ?? project.json?.id) !== PRODUCTION_PROJECT_REF) {
    return false;
  }
  const hostname = new URL(origin).hostname.toLowerCase();
  if (hostname === `${PRODUCTION_PROJECT_REF}.supabase.co`) return true;
  const custom = await getJson(
    `https://api.supabase.com/v1/projects/${PRODUCTION_PROJECT_REF}/custom-hostname`,
    SUPABASE_ACCESS_TOKEN
  );
  const vanity = await getJson(
    `https://api.supabase.com/v1/projects/${PRODUCTION_PROJECT_REF}/config/vanity-subdomain`,
    SUPABASE_ACCESS_TOKEN
  );
  const customHost = custom.json?.custom_hostname ?? custom.json?.hostname ?? null;
  const vanityName = vanity.json?.vanity_subdomain ?? vanity.json?.vanitySubdomain ?? null;
  const vanityHost = typeof vanityName === "string"
    ? (vanityName.includes(".") ? vanityName : `${vanityName}.supabase.co`)
    : null;
  return (custom.status === 200 && custom.json?.status === "active"
      && String(customHost ?? "").toLowerCase() === hostname)
    || (vanity.status === 200 && vanity.json?.status === "active"
      && String(vanityHost ?? "").toLowerCase() === hostname);
}

function runVercelCli(args, cliEnvironment) {
  return new Promise((resolve) => {
    const child = spawn("npx", args, {
      cwd: process.cwd(),
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, ...cliEnvironment }
    });
    let outputLength = 0;
    child.stdout.on("data", (chunk) => { outputLength += chunk.length; });
    child.stderr.on("data", (chunk) => { outputLength += chunk.length; });
    child.on("error", (error) => resolve({ status: null, error, outputLength }));
    child.on("close", (code) => resolve({ status: code, error: null, outputLength }));
  });
}

async function automaticRollback(identity, vercel) {
  evidence.automaticRollback.attempted = true;
  const cliEnv = hostedVercelCliEnvironment(identity);
  let result = await runVercelCli([
    "vercel@latest", "rollback", ROLLBACK_DEPLOYMENT_ID,
    "--timeout=5m", "--token", VERCEL_TOKEN, "--scope", HOSTED_VERCEL_TEAM_SLUG
  ], cliEnv);
  if (result.error || result.status !== 0) {
    result = await runVercelCli([
      "vercel@latest", "promote", ROLLBACK_DEPLOYMENT_ID, "--yes",
      "--timeout=5m", "--token", VERCEL_TOKEN, "--scope", HOSTED_VERCEL_TEAM_SLUG
    ], cliEnv);
  }
  if (result.error || result.status !== 0) {
    evidence.automaticRollback.failure = "exact rollback control command failed";
    return false;
  }
  try {
    await waitForExactProduction(vercel, identity.projectId, ROLLBACK_DEPLOYMENT_ID);
    evidence.automaticRollback.completed = true;
    verdicts.push({
      caseId: "rollback_domains_restored",
      passed: true,
      observed: "all Production domains restored to the exact recorded rollback deployment"
    });
    return true;
  } catch {
    evidence.automaticRollback.failure = "Production domains did not restore to the exact rollback deployment";
    return false;
  }
}

let promotionAttempted = false;
let identity = null;
let vercel = null;
try {
  if (PHASE !== "activate"
    || INPUT_APPLICATION_SHA !== APPLICATION_SHA
    || INPUT_WORKER_SOURCE_SHA !== WORKER_SOURCE_SHA
    || INPUT_WORKER_DIGEST !== WORKER_DIGEST
    || !VERCEL_TOKEN || !SUPABASE_ACCESS_TOKEN) {
    throw new Error("exact Production activation inputs are unavailable");
  }

  const smokeText = fs.readFileSync(SMOKE_FILE, "utf8");
  const smoke = parseJson(smokeText);
  const smokeExact = smoke?.passed === true
    && smoke?.applicationSha === APPLICATION_SHA
    && smoke?.workerSourceSha === WORKER_SOURCE_SHA
    && smoke?.workerDigest === WORKER_DIGEST
    && smoke?.productionProjectRef === PRODUCTION_PROJECT_REF
    && smoke?.stagedDeploymentId === STAGED_DEPLOYMENT_ID
    && smoke?.rollbackDeploymentId === ROLLBACK_DEPLOYMENT_ID
    && JSON.stringify(smoke?.migrationHashes) === JSON.stringify(REQUIRED_MIGRATION_HASHES)
    && smoke?.transactionalFixtureRolledBack === true
    && smoke?.productionDatabasePersistentlyMutated === false
    && smoke?.realParticipantRecordsCreated === false
    && smoke?.realChargesCreated === false;
  record(
    "successful_smoke_artifact_is_exact",
    smokeExact,
    "exact successful rollback-safe smoke artifact is bound to this activation"
  );

  identity = await resolveHostedVercelIdentity({ token: VERCEL_TOKEN });
  vercel = (pathname) => getJson(hostedVercelScopedUrl(pathname, identity), VERCEL_TOKEN);
  const [project, staged, rollback, envBefore, inventoryBefore] = await Promise.all([
    vercel(`/v9/projects/${encodeURIComponent(identity.projectId)}`),
    vercel(`/v13/deployments/${encodeURIComponent(STAGED_DEPLOYMENT_ID)}`),
    vercel(`/v13/deployments/${encodeURIComponent(ROLLBACK_DEPLOYMENT_ID)}`),
    vercel(`/v9/projects/${encodeURIComponent(identity.projectId)}/env`),
    vercel(`/v6/deployments?projectId=${encodeURIComponent(identity.projectId)}&limit=100`)
  ]);
  record(
    "exact_vercel_project_is_bound",
    project.status === 200 && project.json?.name === HOSTED_VERCEL_PROJECT_NAME,
    "exact Vercel team and project are bound"
  );
  record(
    "staged_deployment_identity_is_exact",
    staged.status === 200
      && deploymentId(staged.json) === STAGED_DEPLOYMENT_ID
      && ready(staged.json)
      && staged.json?.target === "production"
      && staged.json?.meta?.rcapApplicationSha === APPLICATION_SHA
      && staged.json?.meta?.rcapWorkerSourceSha === WORKER_SOURCE_SHA
      && staged.json?.meta?.rcapWorkerDigest === WORKER_DIGEST,
    "READY Production-target staged deployment carries exact application and worker metadata"
  );
  const beforeDomains = await resolveProductionDomains(vercel, identity.projectId);
  record(
    "rollback_is_ready_and_active_before_promotion",
    rollback.status === 200
      && deploymentId(rollback.json) === ROLLBACK_DEPLOYMENT_ID
      && ready(rollback.json)
      && rollback.json?.target === "production"
      && beforeDomains.deploymentIds.length === 1
      && beforeDomains.deploymentIds[0] === ROLLBACK_DEPLOYMENT_ID,
    "recorded READY rollback deployment is the sole active Production target"
  );
  if (envBefore.status !== 200 || !Array.isArray(envBefore.json?.envs)) {
    throw new Error("environment metadata inventory unavailable before activation");
  }
  if (inventoryBefore.status !== 200 || !Array.isArray(inventoryBefore.json?.deployments)) {
    throw new Error("deployment inventory unavailable before activation");
  }
  const envHashBefore = safeEnvironmentMetadataHash(envBefore.json.envs);
  const deploymentHashBefore = deploymentInventoryHash(inventoryBefore.json.deployments);

  const schema = await clinicSchemaReadback();
  record(
    "production_clinic_schema_is_exact",
    exactNames(schema.rlsTables, REQUIRED_TABLES) && exactNames(schema.functions, REQUIRED_FUNCTIONS),
    `Production Clinic schema readback RLS=${schema.rlsTables.length}/10; functions=${schema.functions.length}/22`
  );

  promotionAttempted = true;
  evidence.promotionAttempted = true;
  const promoted = await runVercelCli([
    "vercel@latest", "promote", STAGED_DEPLOYMENT_ID, "--yes",
    "--timeout=5m", "--token", VERCEL_TOKEN, "--scope", HOSTED_VERCEL_TEAM_SLUG
  ], hostedVercelCliEnvironment(identity));
  if (promoted.error || promoted.status !== 0) {
    throw new Error("exact staged deployment promotion command failed");
  }
  evidence.promotionCompleted = true;

  const activeDomains = await waitForExactProduction(vercel, identity.projectId, STAGED_DEPLOYMENT_ID);
  evidence.productionAliasChanged = true;
  record(
    "production_domains_resolve_to_staged_deployment",
    activeDomains.deploymentIds.length === 1
      && activeDomains.deploymentIds[0] === STAGED_DEPLOYMENT_ID
      && activeDomains.domains.length === beforeDomains.domains.length,
    `all ${activeDomains.domains.length} Production domains resolve to the exact staged deployment`
  );

  const runtime = await inspectActiveRuntime(activeDomains.domains);
  record(
    "active_production_health_is_200",
    runtime.healthyDomains === activeDomains.domains.length,
    `structured health is 200 on ${runtime.healthyDomains}/${activeDomains.domains.length} Production domains`
  );
  const canonicalRuntime = await originMatchesProductionProject(runtime.origin);
  record(
    "active_runtime_project_is_canonical",
    runtime.candidateCount === 1 && canonicalRuntime,
    "exactly one active Production runtime origin maps to the canonical Supabase project"
  );

  const [envAfter, inventoryAfter, rollbackAfter] = await Promise.all([
    vercel(`/v9/projects/${encodeURIComponent(identity.projectId)}/env`),
    vercel(`/v6/deployments?projectId=${encodeURIComponent(identity.projectId)}&limit=100`),
    vercel(`/v13/deployments/${encodeURIComponent(ROLLBACK_DEPLOYMENT_ID)}`)
  ]);
  if (envAfter.status !== 200 || !Array.isArray(envAfter.json?.envs)) {
    throw new Error("environment metadata inventory unavailable after activation");
  }
  if (inventoryAfter.status !== 200 || !Array.isArray(inventoryAfter.json?.deployments)) {
    throw new Error("deployment inventory unavailable after activation");
  }
  const envHashAfter = safeEnvironmentMetadataHash(envAfter.json.envs);
  const deploymentHashAfter = deploymentInventoryHash(inventoryAfter.json.deployments);
  record(
    "environment_metadata_is_unchanged",
    envHashBefore === envHashAfter,
    "Vercel environment metadata SHA-256 is unchanged"
  );
  record(
    "activation_created_no_deployment",
    deploymentHashBefore === deploymentHashAfter,
    "deployment identity inventory SHA-256 is unchanged; the staged deployment was promoted without rebuild"
  );
  record(
    "rollback_target_remains_ready",
    rollbackAfter.status === 200
      && deploymentId(rollbackAfter.json) === ROLLBACK_DEPLOYMENT_ID
      && ready(rollbackAfter.json),
    "recorded rollback deployment remains READY after activation"
  );

  evidence.controlHashes = {
    smokeArtifactSha256: sha256(smokeText),
    environmentMetadataBeforeSha256: envHashBefore,
    environmentMetadataAfterSha256: envHashAfter,
    deploymentInventoryBeforeSha256: deploymentHashBefore,
    deploymentInventoryAfterSha256: deploymentHashAfter,
    productionMappingBeforeSha256: beforeDomains.mappingHash,
    productionMappingAfterSha256: activeDomains.mappingHash,
    activeRuntimeOriginSha256: sha256(runtime.origin)
  };
  evidence.deploymentTriggered = deploymentHashBefore !== deploymentHashAfter;
  evidence.environmentVariableChanged = envHashBefore !== envHashAfter;
  evidence.productionDatabaseMutated = false;
  evidence.runtimeProof = {
    productionProjectMatch: canonicalRuntime,
    exactlyOneOrigin: runtime.candidateCount === 1,
    healthyDomainCount: runtime.healthyDomains,
    productionDomainCount: activeDomains.domains.length,
    pagesInspected: runtime.pagesInspected,
    chunksInspected: runtime.chunksInspected
  };
  persist(true);
  console.log("PRODUCTION RELEASE COMPLETE — exact staged deployment activated and verified");
} catch (error) {
  const failure = error instanceof Error ? error.message : String(error);
  let rollbackResult = null;
  if (promotionAttempted && identity && vercel) {
    rollbackResult = await automaticRollback(identity, vercel);
    evidence.productionAliasChanged = rollbackResult ? false : true;
  }
  persist(false, failure);
  console.error(
    `PRODUCTION ACTIVATION REFUSED — ${failure}; rollback=${promotionAttempted ? (rollbackResult ? "restored" : "failed") : "not-required"}`
  );
  process.exit(1);
}
