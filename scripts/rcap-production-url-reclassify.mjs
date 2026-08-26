#!/usr/bin/env node
// One authorized Production configuration mutation: recover the public
// Supabase origin from the current READY Production deployment, prove its
// authenticated project identity, and replace exactly one sensitive Vercel
// Production entry with an ordinary readable entry carrying the same bytes.
// The recovered value never leaves process memory.

import fs from "node:fs";
import path from "node:path";

import {
  hostedVercelScopedUrl,
  resolveHostedVercelIdentity
} from "./rcap-hosted-acceptance-vercel-identity.mjs";

const TEAM_SLUG = "roger947s-projects";
const PROJECT_NAME = "legalease-partner-dashboard-clean";
const KEY = "NEXT_PUBLIC_SUPABASE_URL";
const PRODUCTION_PROJECT_REF = "wwtwtsmywnckfkdaqqeg";
const ACCEPTANCE_PROJECT_REF = "hyflxnlhpmiqxvvcoiia";
const APPLICATION_SHA = "441ee3188ee52047a012232d8d11f890a09b4ac5";
const WORKER_SOURCE_SHA = APPLICATION_SHA;
const WORKER_DIGEST = "sha256:67132df2d1bee49d123d0d2918880f283d2109195b49150265d348fe1d07a69c";
const BASE_PREFLIGHT_TOOLS_SHA = "5356f5985b71156f9722e93216f2ca408b0cb898";
const PUBLIC_ROUTES = ["/sign-in", "/expungement-ai/sign-in"];

const VERCEL_TOKEN = process.env.VERCEL_TOKEN ?? "";
const SUPABASE_ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN ?? "";
const INPUT_APPLICATION_SHA = (process.env.RCAP_APPLICATION_SHA ?? "").trim();
const INPUT_WORKER_SOURCE_SHA = (process.env.RCAP_WORKER_SOURCE_SHA ?? "").trim();
const INPUT_WORKER_DIGEST = (process.env.RCAP_WORKER_DIGEST ?? "").trim();
const INPUT_TOOLS_SHA = (process.env.RCAP_TOOLS_SHA ?? "").trim();
const EVIDENCE_DIR = path.resolve(process.env.RCAP_RECLASSIFY_EVIDENCE_DIR ?? "production-url-reclassify-evidence");
const EVIDENCE_FILE = path.join(EVIDENCE_DIR, "production-url-reclassify.json");

fs.mkdirSync(EVIDENCE_DIR, { recursive: true });

const evidence = {
  schemaVersion: "rcap-production-url-reclassify/v2",
  startedAt: new Date().toISOString(),
  passed: false,
  failureCode: null,
  stage: "initialization",
  valueSource: "current Production deployment",
  projectIdentity: PRODUCTION_PROJECT_REF,
  key: KEY,
  target: "Production only",
  readable: false,
  exactValuePreserved: false,
  canonicalProjectMatch: false,
  duplicates: null,
  otherVariablesChanged: null,
  deploymentTriggered: null,
  productionDatabaseMutated: false,
  valuePersisted: false,
  valuePrinted: false,
  mutationAttempted: false,
  rollbackAttempted: false,
  scopeCorrectionVerified: false,
  scopeCorrection: {
    required: null,
    initialTargets: [],
    initialBranchScoped: null,
    initialCustomEnvironmentCount: null,
    previewIndependentEntryPresent: null,
    developmentIndependentEntryPresent: null,
    exactValueWritePreserved: false
  },
  sourceInspection: { routesFetched: 0, staticChunksFetched: 0, candidateOriginCount: null },
  controlPlane: { supabaseMethods: ["GET"], deploymentMethods: ["GET"] }
};

function persist() {
  evidence.finishedAt = new Date().toISOString();
  fs.writeFileSync(EVIDENCE_FILE, `${JSON.stringify(evidence, null, 2)}\n`);
}

function fail(code, stage, message) {
  const error = new Error(message);
  error.code = code;
  error.stage = stage;
  throw error;
}

function parseJson(text) {
  try { return JSON.parse(text); }
  catch { return null; }
}

async function request(url, { token = "", method = "GET", body } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const response = await fetch(url, {
    method,
    headers,
    redirect: "follow",
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const text = await response.text();
  return { status: response.status, ok: response.ok, json: parseJson(text), text };
}

function targetList(entry) {
  return (Array.isArray(entry?.target) ? entry.target : [entry?.target].filter(Boolean))
    .filter((target) => typeof target === "string")
    .sort();
}

function bearsTarget(entry, target) {
  return targetList(entry).includes(target);
}

function isProductionOnly(entry) {
  const targets = targetList(entry);
  return targets.length === 1
    && targets[0] === "production"
    && !entry?.gitBranch
    && (!Array.isArray(entry?.customEnvironmentIds) || entry.customEnvironmentIds.length === 0);
}

function createBodyForEntry(entry, value, type = entry?.type) {
  const body = {
    key: KEY,
    value,
    type,
    target: targetList(entry)
  };
  if (entry?.gitBranch) body.gitBranch = entry.gitBranch;
  if (Array.isArray(entry?.customEnvironmentIds) && entry.customEnvironmentIds.length > 0) {
    body.customEnvironmentIds = [...entry.customEnvironmentIds];
  }
  return body;
}

function safeEntryMetadata(entry) {
  return {
    id: entry?.id ?? null,
    configurationId: entry?.configurationId ?? null,
    key: entry?.key ?? null,
    type: entry?.type ?? null,
    target: Array.isArray(entry?.target) ? [...entry.target].sort() : entry?.target ?? null,
    gitBranch: entry?.gitBranch ?? null,
    customEnvironmentIds: Array.isArray(entry?.customEnvironmentIds) ? [...entry.customEnvironmentIds].sort() : []
  };
}

function stableOtherEnvironmentSnapshot(envs, excludedId) {
  return envs
    .filter((entry) => entry?.id !== excludedId)
    .map(safeEntryMetadata)
    .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
}

function equalJson(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function normalizeEmbeddedText(text) {
  return text
    .replaceAll("\\u003a", ":")
    .replaceAll("\\u003A", ":")
    .replaceAll("\\u002f", "/")
    .replaceAll("\\u002F", "/")
    .replaceAll("\\/", "/");
}

function inspectForSupabaseOrigins(text, candidateOrigins, candidateValues) {
  const normalized = normalizeEmbeddedText(text);
  const endpointPattern = /https:\/\/[a-z0-9.-]+(?::\d+)?\/(?:auth|rest|storage|functions)\/v1\/?/gi;
  const defaultOriginPattern = /https:\/\/[a-z0-9.-]+\.supabase\.co\/?/gi;
  const standaloneLiteralPattern = /["'`](https:\/\/[a-z0-9.-]+(?::\d+)?\/?)["'`]/gi;

  for (const pattern of [endpointPattern, defaultOriginPattern]) {
    for (const match of normalized.matchAll(pattern)) {
      try { candidateOrigins.add(new URL(match[0]).origin); }
      catch { /* malformed strings cannot become candidates */ }
    }
  }
  for (const match of normalized.matchAll(standaloneLiteralPattern)) {
    try {
      const parsed = new URL(match[1]);
      if (parsed.hostname.endsWith(".supabase.co") || /\/(?:auth|rest|storage|functions)\/v1\/?/.test(parsed.pathname)) {
        candidateOrigins.add(parsed.origin);
        candidateValues.add(match[1]);
      }
    } catch { /* malformed strings cannot become candidates */ }
  }
}

function scriptSources(html) {
  const sources = new Set();
  for (const match of html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi)) {
    try {
      const parsed = new URL(match[1], "https://production.invalid");
      if (parsed.pathname.startsWith("/_next/static/")) sources.add(`${parsed.pathname}${parsed.search}`);
    } catch { /* ignore malformed script URLs */ }
  }
  return [...sources];
}

async function resolveCurrentProduction(vercel) {
  const domainsResult = await vercel("/v9/projects/__PROJECT_ID__/domains?limit=100");
  if (domainsResult.status !== 200) fail("production_domains_unreadable", "deployment_discovery", "Production domains could not be read");
  const domains = (Array.isArray(domainsResult.json?.domains) ? domainsResult.json.domains : [])
    .map((entry) => entry?.name)
    .filter((name) => typeof name === "string" && name.length > 0);
  const resolutions = [];
  for (const domain of domains) {
    const result = await vercel(`/v13/deployments/${encodeURIComponent(domain)}`);
    const deployment = result.json ?? {};
    if (result.status === 200
      && deployment.target === "production"
      && (deployment.readyState ?? deployment.state) === "READY") {
      resolutions.push({
        domain,
        deploymentId: deployment.id ?? deployment.uid ?? null,
        immutableHostname: deployment.url ?? null
      });
    }
  }
  const deploymentIds = [...new Set(resolutions.map((entry) => entry.deploymentId).filter(Boolean))];
  if (deploymentIds.length !== 1 || resolutions.length === 0) {
    fail("production_deployment_ambiguous", "deployment_discovery", "Production domains do not resolve to one READY Production deployment");
  }
  const detail = await vercel(`/v13/deployments/${encodeURIComponent(deploymentIds[0])}`);
  if (detail.status !== 200
    || (detail.json?.id ?? detail.json?.uid) !== deploymentIds[0]
    || detail.json?.target !== "production"
    || (detail.json?.readyState ?? detail.json?.state) !== "READY") {
    fail("production_deployment_not_ready", "deployment_discovery", "The exact Production deployment is not READY");
  }
  return {
    deploymentId: deploymentIds[0],
    domains: resolutions.map((entry) => entry.domain).sort(),
    immutableHostname: detail.json?.url ?? resolutions[0]?.immutableHostname ?? null
  };
}

async function recoverValueFromProduction(deployment) {
  const candidateOrigins = new Set();
  const candidateValues = new Set();
  const fetchedChunks = new Set();
  for (const domain of deployment.domains) {
    const origin = `https://${domain}`;
    for (const route of PUBLIC_ROUTES) {
      const page = await request(`${origin}${route}`);
      if (!page.ok) continue;
      evidence.sourceInspection.routesFetched += 1;
      inspectForSupabaseOrigins(page.text, candidateOrigins, candidateValues);
      for (const source of scriptSources(page.text)) {
        const chunkUrl = `${origin}${source}`;
        if (fetchedChunks.has(chunkUrl)) continue;
        fetchedChunks.add(chunkUrl);
        const chunk = await request(chunkUrl);
        if (!chunk.ok) continue;
        evidence.sourceInspection.staticChunksFetched += 1;
        inspectForSupabaseOrigins(chunk.text, candidateOrigins, candidateValues);
      }
    }
  }
  evidence.sourceInspection.candidateOriginCount = candidateOrigins.size;
  if (candidateOrigins.size !== 1) {
    fail("production_value_candidate_count_mismatch", "value_discovery", "Current Production deployment did not expose exactly one Supabase origin");
  }
  if (candidateValues.size === 0) candidateValues.add([...candidateOrigins][0]);
  if (candidateValues.size !== 1) {
    fail("production_value_byte_identity_ambiguous", "value_discovery", "Current Production deployment exposed more than one exact Supabase URL representation");
  }
  const captured = [...candidateValues][0];
  if (new URL(captured).origin !== [...candidateOrigins][0]) {
    fail("production_value_origin_mismatch", "value_discovery", "Captured Production value does not match the observed request origin");
  }
  return captured;
}

async function verifySupabaseProjectIdentity(capturedValue) {
  const project = await request(`https://api.supabase.com/v1/projects/${encodeURIComponent(PRODUCTION_PROJECT_REF)}`, {
    token: SUPABASE_ACCESS_TOKEN
  });
  if (project.status !== 200
    || (project.json?.ref ?? project.json?.id) !== PRODUCTION_PROJECT_REF
    || PRODUCTION_PROJECT_REF === ACCEPTANCE_PROJECT_REF) {
    fail("supabase_project_identity_mismatch", "project_verification", "Authenticated Production Supabase project identity did not match the pinned project");
  }
  const hostname = new URL(capturedValue).hostname.toLowerCase();
  if (hostname === `${PRODUCTION_PROJECT_REF}.supabase.co`) return true;

  const custom = await request(`https://api.supabase.com/v1/projects/${encodeURIComponent(PRODUCTION_PROJECT_REF)}/custom-hostname`, {
    token: SUPABASE_ACCESS_TOKEN
  });
  const vanity = await request(`https://api.supabase.com/v1/projects/${encodeURIComponent(PRODUCTION_PROJECT_REF)}/config/vanity-subdomain`, {
    token: SUPABASE_ACCESS_TOKEN
  });
  const customHost = custom.json?.custom_hostname ?? custom.json?.hostname ?? null;
  const vanityName = vanity.json?.vanity_subdomain ?? vanity.json?.vanitySubdomain ?? null;
  const customActive = custom.status === 200 && custom.json?.status === "active" && customHost === hostname;
  const vanityHost = typeof vanityName === "string"
    ? (vanityName.includes(".") ? vanityName : `${vanityName}.supabase.co`)
    : null;
  const vanityActive = vanity.status === 200 && vanity.json?.status === "active" && vanityHost === hostname;
  if (!customActive && !vanityActive) {
    fail("supabase_hostname_project_mismatch", "project_verification", "Captured Production hostname is not active for the authenticated Production Supabase project");
  }
  return true;
}

function decryptedEntryFor(v9Entry, v10Entries) {
  const scoped = v10Entries.filter((candidate) => candidate?.key === v9Entry.key && isProductionOnly(candidate));
  const direct = scoped.filter((candidate) => candidate?.id === v9Entry.id);
  const configured = scoped.filter((candidate) => candidate?.configurationId === v9Entry.id);
  const matches = [...new Set([...direct, ...configured])];
  if (matches.length !== 1) fail("replacement_readback_identity_ambiguous", "post_write_verification", "Replacement could not be joined uniquely for decrypted readback");
  return matches[0];
}

let capturedValue = null;
let vercelIdentity = null;
let beforeDeployment = null;
let beforeOtherEnvironment = null;
let deletedEntry = false;
let vercelRequest = null;
let pendingRollbackBody = null;

try {
  if (!VERCEL_TOKEN || !SUPABASE_ACCESS_TOKEN) fail("credentialed_session_unavailable", "initialization", "Required authenticated control-plane sessions are unavailable");
  if (INPUT_APPLICATION_SHA !== APPLICATION_SHA
    || INPUT_WORKER_SOURCE_SHA !== WORKER_SOURCE_SHA
    || INPUT_WORKER_DIGEST !== WORKER_DIGEST
    || !/^[0-9a-f]{40}$/.test(INPUT_TOOLS_SHA)) {
    fail("release_identity_mismatch", "initialization", "Frozen release identity input mismatch");
  }

  evidence.stage = "vercel_identity";
  vercelIdentity = await resolveHostedVercelIdentity({ token: VERCEL_TOKEN });
  if (vercelIdentity.teamSlug !== TEAM_SLUG || vercelIdentity.projectName !== PROJECT_NAME) {
    fail("vercel_identity_mismatch", "vercel_identity", "Vercel team or project identity mismatch");
  }
  const vercel = async (pathname, options = {}) => {
    const resolvedPath = pathname.replace("__PROJECT_ID__", encodeURIComponent(vercelIdentity.projectId));
    return request(hostedVercelScopedUrl(resolvedPath, vercelIdentity), { token: VERCEL_TOKEN, ...options });
  };
  vercelRequest = vercel;

  const project = await vercel(`/v9/projects/${encodeURIComponent(vercelIdentity.projectId)}`);
  if (project.status !== 200 || project.json?.id !== vercelIdentity.projectId || project.json?.name !== PROJECT_NAME) {
    fail("vercel_project_mismatch", "vercel_identity", "Exact Vercel project could not be established");
  }

  evidence.stage = "deployment_discovery";
  beforeDeployment = await resolveCurrentProduction(vercel);

  evidence.stage = "value_discovery";
  capturedValue = await recoverValueFromProduction(beforeDeployment);

  evidence.stage = "project_verification";
  evidence.canonicalProjectMatch = await verifySupabaseProjectIdentity(capturedValue);

  evidence.stage = "vercel_preconditions";
  const team = await vercel(`/v2/teams/${encodeURIComponent(vercelIdentity.teamId)}`);
  if (team.status !== 200 || team.json?.id !== vercelIdentity.teamId || team.json?.slug !== TEAM_SLUG) {
    fail("vercel_team_mismatch", "vercel_preconditions", "Exact Vercel team policy could not be read");
  }
  const sensitiveEnvironmentVariablePolicy = team.json?.sensitiveEnvironmentVariablePolicy;
  if (sensitiveEnvironmentVariablePolicy === "on") {
    fail("forced_sensitive_policy_active", "vercel_preconditions", "Team policy forces new Production variables to Sensitive");
  }

  const inventory = await vercel(`/v9/projects/${encodeURIComponent(vercelIdentity.projectId)}/env`);
  if (inventory.status !== 200 || !Array.isArray(inventory.json?.envs)) {
    fail("environment_inventory_unreadable", "vercel_preconditions", "Production environment inventory could not be read");
  }
  const envs = inventory.json.envs;
  const keyEntries = envs.filter((entry) => entry?.key === KEY);
  const productionBearingEntries = keyEntries.filter((entry) => bearsTarget(entry, "production"));
  if (productionBearingEntries.length !== 1 || !productionBearingEntries[0]?.id) {
    fail("production_bearing_entry_count_mismatch", "vercel_preconditions", "Expected exactly one entry bearing the Production target for the authorized key");
  }
  let currentEntry = productionBearingEntries[0];
  if (!(currentEntry.type === "sensitive")) {
    fail("production_entry_type_mismatch", "vercel_preconditions", "Current authorized Production entry is not Sensitive");
  }
  beforeOtherEnvironment = stableOtherEnvironmentSnapshot(envs, currentEntry.id);

  const initialTargets = targetList(currentEntry);
  const sharesPreview = initialTargets.includes("preview");
  const sharesDevelopment = initialTargets.includes("development");
  const customEnvironmentCount = Array.isArray(currentEntry.customEnvironmentIds)
    ? currentEntry.customEnvironmentIds.length
    : 0;
  const previewIndependentEntries = keyEntries.filter((entry) => entry?.id !== currentEntry.id
    && bearsTarget(entry, "preview")
    && !entry?.gitBranch);
  const developmentIndependentEntries = keyEntries.filter((entry) => entry?.id !== currentEntry.id
    && bearsTarget(entry, "development")
    && !entry?.gitBranch);
  evidence.scopeCorrection.initialTargets = initialTargets;
  evidence.scopeCorrection.initialBranchScoped = Boolean(currentEntry.gitBranch);
  evidence.scopeCorrection.initialCustomEnvironmentCount = customEnvironmentCount;
  evidence.scopeCorrection.previewIndependentEntryPresent = !sharesPreview || previewIndependentEntries.length > 0;
  evidence.scopeCorrection.developmentIndependentEntryPresent = !sharesDevelopment || developmentIndependentEntries.length > 0;
  if (sharesPreview && previewIndependentEntries.length === 0) {
    fail("preview_independent_entry_missing", "scope_correction_preconditions", "Removing Preview from the Production-bearing entry would leave Preview without an independent entry");
  }
  if (sharesDevelopment && developmentIndependentEntries.length === 0) {
    fail("development_independent_entry_missing", "scope_correction_preconditions", "Removing Development from the Production-bearing entry would leave Development without an independent entry");
  }
  if (customEnvironmentCount > 0) {
    fail("custom_environment_scope_requires_owner_action", "scope_correction_preconditions", "Production-bearing entry also targets a custom environment outside the authorized Preview/Development correction");
  }

  evidence.scopeCorrection.required = !isProductionOnly(currentEntry);
  if (evidence.scopeCorrection.required) {
    evidence.stage = "scope_correction";
    evidence.mutationAttempted = true;
    pendingRollbackBody = createBodyForEntry(currentEntry, capturedValue, "sensitive");
    const scopeRemoved = await vercel(`/v9/projects/${encodeURIComponent(vercelIdentity.projectId)}/env/${encodeURIComponent(currentEntry.id)}`, {
      method: "DELETE"
    });
    if (!scopeRemoved.ok) fail("scope_correction_delete_failed", "scope_correction", "Production-bearing entry could not be removed for exact scope correction");
    deletedEntry = true;
    const scopedBody = {
      key: KEY,
      value: capturedValue,
      type: "sensitive",
      target: ["production"]
    };
    const scopedCreated = await vercel(`/v10/projects/${encodeURIComponent(vercelIdentity.projectId)}/env`, {
      method: "POST",
      body: scopedBody
    });
    if (!scopedCreated.ok) fail("scope_correction_create_failed", "scope_correction", "Sensitive Production-only entry could not be recreated");
    deletedEntry = false;
    pendingRollbackBody = null;
    evidence.scopeCorrection.exactValueWritePreserved = scopedBody.value === capturedValue;
  } else {
    evidence.scopeCorrection.exactValueWritePreserved = true;
  }

  evidence.stage = "scope_correction_verification";
  const scopedInventory = await vercel(`/v9/projects/${encodeURIComponent(vercelIdentity.projectId)}/env`);
  if (scopedInventory.status !== 200 || !Array.isArray(scopedInventory.json?.envs)) {
    fail("scope_correction_inventory_unreadable", "scope_correction_verification", "Scope-corrected inventory could not be read");
  }
  const scopedEnvs = scopedInventory.json.envs;
  const scopedProductionBearing = scopedEnvs.filter((entry) => entry?.key === KEY && bearsTarget(entry, "production"));
  if (scopedProductionBearing.length !== 1
    || !scopedProductionBearing[0]?.id
    || !isProductionOnly(scopedProductionBearing[0])
    || scopedProductionBearing[0].type !== "sensitive") {
    fail("scope_correction_shape_mismatch", "scope_correction_verification", "Scope correction did not yield exactly one Sensitive unbranched Production-only entry");
  }
  currentEntry = scopedProductionBearing[0];
  const scopedOtherEnvironment = stableOtherEnvironmentSnapshot(scopedEnvs, currentEntry.id);
  if (!equalJson(beforeOtherEnvironment, scopedOtherEnvironment)) {
    fail("scope_correction_other_environment_drift", "scope_correction_verification", "Scope correction changed environment metadata outside the authorized entry");
  }
  const scopeDeployment = await resolveCurrentProduction(vercel);
  if (!equalJson(beforeDeployment, scopeDeployment)) {
    fail("scope_correction_deployment_changed", "scope_correction_verification", "Scope correction changed the Production deployment or alias identity");
  }
  evidence.scopeCorrectionVerified = evidence.scopeCorrection.exactValueWritePreserved;
  if (!evidence.scopeCorrectionVerified) {
    fail("scope_correction_value_not_preserved", "scope_correction_verification", "Scope correction did not reuse the exact captured value in memory");
  }

  evidence.stage = "one_key_replacement";
  evidence.mutationAttempted = true;
  pendingRollbackBody = createBodyForEntry(currentEntry, capturedValue, "sensitive");
  const removed = await vercel(`/v9/projects/${encodeURIComponent(vercelIdentity.projectId)}/env/${encodeURIComponent(currentEntry.id)}`, {
    method: "DELETE"
  });
  if (!removed.ok) fail("production_entry_delete_failed", "one_key_replacement", "Exact Sensitive Production entry could not be removed");
  deletedEntry = true;

  const replacementBody = {
    key: KEY,
    value: capturedValue,
    type: "encrypted",
    target: ["production"]
  };
    const created = await vercel(`/v10/projects/${encodeURIComponent(vercelIdentity.projectId)}/env`, {
    method: "POST",
    body: replacementBody
  });
  if (!created.ok) {
    evidence.rollbackAttempted = true;
    const restored = await vercel(`/v10/projects/${encodeURIComponent(vercelIdentity.projectId)}/env`, {
      method: "POST",
      body: pendingRollbackBody
    });
    if (restored.ok) deletedEntry = false;
    fail("production_entry_create_failed", "one_key_replacement", "Readable Production entry could not be recreated; prior Sensitive form was restored when possible");
  }
  deletedEntry = false;
  pendingRollbackBody = null;

  evidence.stage = "post_write_verification";
  const afterInventory = await vercel(`/v9/projects/${encodeURIComponent(vercelIdentity.projectId)}/env`);
  if (afterInventory.status !== 200 || !Array.isArray(afterInventory.json?.envs)) {
    fail("replacement_inventory_unreadable", "post_write_verification", "Replacement inventory could not be read");
  }
  const afterEnvs = afterInventory.json.envs;
  const replacementMatches = afterEnvs.filter((entry) => entry?.key === KEY && isProductionOnly(entry));
  evidence.duplicates = Math.max(0, replacementMatches.length - 1);
  if (replacementMatches.length !== 1 || !replacementMatches[0]?.id) {
    fail("replacement_duplicate_or_missing", "post_write_verification", "Replacement is missing or duplicated in Production");
  }
  const replacementEntry = replacementMatches[0];
  if (replacementEntry.type === "sensitive") {
    fail("forced_sensitive_policy_active", "post_write_verification", "Vercel forced the recreated Production variable to Sensitive");
  }
  if (replacementEntry.type !== "encrypted") {
    fail("replacement_type_mismatch", "post_write_verification", "Replacement is not the required readable encrypted-at-rest type");
  }

  const decryptQuery = new URLSearchParams({ target: "production", decrypt: "true", source: "vercel-cli:pull" });
  const decrypted = await vercel(`/v10/projects/${encodeURIComponent(vercelIdentity.projectId)}/env?${decryptQuery}`);
  if (decrypted.status !== 200 || !Array.isArray(decrypted.json?.envs)) {
    fail("replacement_decrypt_read_failed", "post_write_verification", "Readable replacement GET failed");
  }
  const matched = decryptedEntryFor(replacementEntry, decrypted.json.envs);
  evidence.readable = matched?.decrypted === true && typeof matched?.value === "string" && matched.value.length > 0;
  evidence.exactValuePreserved = evidence.readable && matched.value === capturedValue;
  if (!evidence.readable || !evidence.exactValuePreserved) {
    fail("replacement_value_mismatch", "post_write_verification", "Replacement is unreadable, empty, or not byte-for-byte equal to the current Production value");
  }

  const afterOtherEnvironment = stableOtherEnvironmentSnapshot(afterEnvs, replacementEntry.id);
  evidence.otherVariablesChanged = equalJson(beforeOtherEnvironment, afterOtherEnvironment) ? 0 : 1;
  if (evidence.otherVariablesChanged !== 0) {
    fail("other_environment_drift", "post_write_verification", "Environment metadata outside the authorized key changed");
  }

  const afterDeployment = await resolveCurrentProduction(vercel);
  evidence.deploymentTriggered = !equalJson(beforeDeployment, afterDeployment);
  if (evidence.deploymentTriggered) {
    fail("production_deployment_changed", "post_write_verification", "Production deployment or alias identity changed during the one-key operation");
  }
  evidence.canonicalProjectMatch = await verifySupabaseProjectIdentity(matched.value);
  evidence.passed = true;
  evidence.stage = "complete";
  persist();
  console.log("Production URL reclassification passed; recovered value remained redacted and in memory only.");
} catch (error) {
  if (deletedEntry && capturedValue && vercelRequest) {
    evidence.rollbackAttempted = true;
    try {
      const restored = await vercelRequest(`/v10/projects/${encodeURIComponent(vercelIdentity.projectId)}/env`, {
        method: "POST",
        body: pendingRollbackBody ?? { key: KEY, value: capturedValue, type: "sensitive", target: ["production"] }
      });
      if (restored.ok) deletedEntry = false;
    } catch { /* retain the original fail-closed verdict */ }
  }
  evidence.passed = false;
  evidence.failureCode = error?.code ?? "unexpected_control_failure";
  evidence.stage = error?.stage ?? evidence.stage;
  if (deletedEntry && capturedValue && vercelIdentity) evidence.rollbackAttempted = true;
  persist();
  if (evidence.failureCode === "forced_sensitive_policy_active") {
    console.error("FORCED-SENSITIVE POLICY ACTIVE");
  } else {
    console.error(`Production URL reclassification refused at ${evidence.stage}: ${evidence.failureCode}`);
  }
  process.exit(1);
} finally {
  capturedValue = null;
}

export { BASE_PREFLIGHT_TOOLS_SHA };
