#!/usr/bin/env node
// Secret-backed Production release control.
//
// The only currently enabled phase is `preflight`. It is deliberately GET-only:
// it establishes the current Production deployment, rollback target, and
// Production Supabase project from the deployed project's own Production
// environment. Decrypted URL values exist only long enough to derive and compare
// their public project refs. Values and credentials are never emitted or stored.

import fs from "node:fs";
import path from "node:path";

import {
  HOSTED_VERCEL_PROJECT_NAME,
  hostedVercelScopedUrl,
  resolveHostedVercelIdentity
} from "./rcap-hosted-acceptance-vercel-identity.mjs";

const APPLICATION_SHA = "441ee3188ee52047a012232d8d11f890a09b4ac5";
const TOOLS_SHA = "d075ff0fd5627ec55c9d27c3018b1fb77f1fa08b";
const WORKER_SOURCE_SHA = APPLICATION_SHA;
const WORKER_DIGEST = "sha256:67132df2d1bee49d123d0d2918880f283d2109195b49150265d348fe1d07a69c";
const ACCEPTANCE_PROJECT_REF = "hyflxnlhpmiqxvvcoiia";

const PHASE = (process.env.RCAP_PRODUCTION_PHASE ?? "").trim();
const VERCEL_TOKEN = process.env.VERCEL_TOKEN ?? "";
const SUPABASE_ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN ?? "";
const INPUT_APPLICATION_SHA = (process.env.RCAP_APPLICATION_SHA ?? "").trim();
const INPUT_ACCEPTED_TOOLS_SHA = (process.env.RCAP_ACCEPTED_TOOLS_SHA ?? "").trim();
const INPUT_TOOLS_SHA = (process.env.RCAP_TOOLS_SHA ?? "").trim();
const INPUT_WORKER_SOURCE_SHA = (process.env.RCAP_WORKER_SOURCE_SHA ?? "").trim();
const INPUT_WORKER_DIGEST = (process.env.RCAP_WORKER_DIGEST ?? "").trim();
const EVIDENCE_DIR = path.resolve(process.env.RCAP_PRODUCTION_EVIDENCE_DIR ?? "production-canary-evidence");
const EVIDENCE_FILE = path.join(EVIDENCE_DIR, "production-preflight.json");

fs.mkdirSync(EVIDENCE_DIR, { recursive: true });

const verdicts = [];
const evidence = {
  schemaVersion: "rcap-production-preflight/v1",
  phase: PHASE,
  startedAt: new Date().toISOString(),
  requestedIdentity: {
    applicationSha: APPLICATION_SHA,
    acceptedToolsSha: TOOLS_SHA,
    executionToolsSha: INPUT_TOOLS_SHA,
    workerSourceSha: WORKER_SOURCE_SHA,
    workerDigest: WORKER_DIGEST
  },
  secrets: { persisted: false, printed: false, decryptedProductionUrlValues: { redacted: true } },
  mutationAttempted: false,
  production: null,
  verdicts
};

function record(caseId, passed, observed) {
  verdicts.push({ caseId, passed, observed });
  console.log(`  ${passed ? "ok  " : "FAIL"} ${caseId} — ${observed}`);
  return passed;
}

function persist(passed, failure = null) {
  evidence.finishedAt = new Date().toISOString();
  evidence.passed = passed;
  evidence.failure = failure;
  fs.writeFileSync(EVIDENCE_FILE, `${JSON.stringify(evidence, null, 2)}\n`);
}

function targetsProduction(entry) {
  const target = entry?.target;
  return Array.isArray(target) ? target.includes("production") : target === "production";
}

function projectRefFromSupabaseUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;
  const match = /^([a-z0-9]{8,})\.supabase\.co$/i.exec(url.hostname);
  return match?.[1] ?? null;
}

function safeResponseShape(result) {
  const document = result?.json;
  const envs = Array.isArray(document?.envs) ? document.envs : [];
  return {
    status: result?.status ?? null,
    topLevelKeys: document && typeof document === "object" && !Array.isArray(document)
      ? Object.keys(document).sort()
      : [],
    envCount: envs.length,
    entryShapes: envs.slice(0, 20).map((entry) => ({
      keys: entry && typeof entry === "object" ? Object.keys(entry).filter((key) => key !== "value").sort() : [],
      hasValueField: Boolean(entry && Object.prototype.hasOwnProperty.call(entry, "value")),
      valueType: entry && Object.prototype.hasOwnProperty.call(entry, "value") ? typeof entry.value : "absent"
    }))
  };
}

async function getJson(url, token) {
  const response = await fetch(url, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` }
  });
  const text = await response.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* status is reported without response text */ }
  return { status: response.status, json };
}

try {
  if (PHASE !== "preflight") throw new Error("only the read-only preflight phase is enabled");
  if (!VERCEL_TOKEN || !SUPABASE_ACCESS_TOKEN) throw new Error("required secret-backed read-only sessions are unavailable");

  const identityExact = INPUT_APPLICATION_SHA === APPLICATION_SHA
    && INPUT_ACCEPTED_TOOLS_SHA === TOOLS_SHA
    && /^[0-9a-f]{40}$/.test(INPUT_TOOLS_SHA)
    && INPUT_WORKER_SOURCE_SHA === WORKER_SOURCE_SHA
    && INPUT_WORKER_DIGEST === WORKER_DIGEST;
  if (!record("release_identity_is_exact", identityExact,
    `application=${INPUT_APPLICATION_SHA || "missing"}; acceptedTools=${INPUT_ACCEPTED_TOOLS_SHA || "missing"}; executionTools=${INPUT_TOOLS_SHA || "missing"}; workerSource=${INPUT_WORKER_SOURCE_SHA || "missing"}; digest=${INPUT_WORKER_DIGEST || "missing"}`)) {
    throw new Error("release identity input mismatch");
  }

  const vercelIdentity = await resolveHostedVercelIdentity({ token: VERCEL_TOKEN });
  const vercel = (pathname) => getJson(hostedVercelScopedUrl(pathname, vercelIdentity), VERCEL_TOKEN);

  const projectResult = await vercel(`/v9/projects/${encodeURIComponent(vercelIdentity.projectId)}`);
  const projectExact = projectResult.status === 200
    && projectResult.json?.id === vercelIdentity.projectId
    && projectResult.json?.name === HOSTED_VERCEL_PROJECT_NAME;
  if (!record("production_vercel_project_is_exact", projectExact,
    `status=${projectResult.status}; project=${projectResult.json?.name ?? "unresolved"}; id=${projectResult.json?.id ?? "unresolved"}`)) {
    throw new Error("Vercel Production project identity could not be established");
  }

  const envResult = await vercel(`/v9/projects/${encodeURIComponent(vercelIdentity.projectId)}/env`);
  const envs = Array.isArray(envResult.json?.envs) ? envResult.json.envs : [];
  if (envResult.status !== 200) throw new Error("Vercel Production environment inventory could not be read");

  const exactProductionEntry = (key) => {
    const matches = envs.filter((entry) => entry?.key === key && targetsProduction(entry) && !entry?.gitBranch);
    if (matches.length !== 1 || !matches[0]?.id) {
      throw new Error(`Production environment key ${key} does not resolve to one exact unbranched entry`);
    }
    return matches[0];
  };

  const optionalProductionEntry = (key) => {
    const matches = envs.filter((entry) => entry?.key === key && targetsProduction(entry) && !entry?.gitBranch);
    if (matches.length > 1 || (matches.length === 1 && !matches[0]?.id)) {
      throw new Error(`Optional Production environment key ${key} is ambiguous`);
    }
    return matches[0] ?? null;
  };

  const publicUrlEntry = exactProductionEntry("NEXT_PUBLIC_SUPABASE_URL");
  const serverUrlEntry = optionalProductionEntry("SUPABASE_URL");
  const anonEntry = exactProductionEntry("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const serviceEntry = exactProductionEntry("SUPABASE_SERVICE_ROLE_KEY");

  // Vercel's current CLI reads project environment values from the v10 bulk
  // endpoint with these exact query parameters. The v9 inventory above remains
  // the authority for entry identity. A value is accepted only when the v10
  // response carries that same id/key/target; a name-only match is refused.
  const decryptQuery = new URLSearchParams({
    target: "production",
    decrypt: "true",
    source: "vercel-cli:pull"
  });
  const decryptedResult = await vercel(`/v10/projects/${encodeURIComponent(vercelIdentity.projectId)}/env?${decryptQuery}`);
  evidence.controlPlaneReadback = {
    endpoint: "GET /v10/projects/{exactProjectId}/env?target=production&decrypt=true&source=vercel-cli:pull",
    response: safeResponseShape(decryptedResult),
    joinTelemetry: [],
    valuesPersisted: false
  };
  if (decryptedResult.status !== 200 || !Array.isArray(decryptedResult.json?.envs)) {
    throw new Error(`Vercel Production environment decrypt read failed at v10 bulk endpoint (status ${decryptedResult.status})`);
  }
  const decryptedEntries = decryptedResult.json.envs;
  const decryptProductionValue = (entry) => {
    const scoped = decryptedEntries.filter((candidate) =>
      candidate?.key === entry.key
      && targetsProduction(candidate)
      && !candidate?.gitBranch
    );
    const direct = scoped.filter((candidate) => candidate?.id === entry.id);
    const configured = scoped.filter((candidate) => candidate?.configurationId === entry.id);
    const unique = [...new Set([...direct, ...configured])];
    const telemetry = {
      key: entry.key,
      directIdMatches: direct.length,
      configurationIdMatches: configured.length,
      uniqueCandidateMatches: unique.length,
      selectedIdentityField: unique.length === 1
        ? (direct.includes(unique[0]) ? "id" : "configurationId")
        : null
    };
    evidence.controlPlaneReadback.joinTelemetry.push(telemetry);
    if (unique.length !== 1 || typeof unique[0]?.value !== "string" || !unique[0].value) {
      throw new Error(`Production environment key ${entry.key} could not be joined uniquely from v9 inventory to v10 decrypted data`);
    }
    return unique[0].value;
  };

  const publicRef = projectRefFromSupabaseUrl(decryptProductionValue(publicUrlEntry));
  const serverRef = serverUrlEntry
    ? projectRefFromSupabaseUrl(decryptProductionValue(serverUrlEntry))
    : null;
  const optionalServerMatches = !serverUrlEntry || (Boolean(publicRef) && serverRef === publicRef);
  if (!record("optional_server_supabase_url_matches_when_present", optionalServerMatches,
    `present=${Boolean(serverUrlEntry)}; matchesAuthoritativePublicRef=${optionalServerMatches}`)) {
    throw new Error("optional Production SUPABASE_URL disagrees with NEXT_PUBLIC_SUPABASE_URL");
  }
  const productionRef = publicRef;
  if (!record("production_supabase_project_is_exact", Boolean(productionRef),
    `authoritative public URL ref resolved=${Boolean(productionRef)}; optional server URL present=${Boolean(serverUrlEntry)}; anon entry=${anonEntry.id ? "present" : "missing"}; service entry=${serviceEntry.id ? "present" : "missing"}`)) {
    throw new Error("authoritative Production Supabase URL identity could not be resolved");
  }

  if (!record("production_environment_is_separate_from_acceptance", productionRef !== ACCEPTANCE_PROJECT_REF,
    `productionRef=${productionRef}; acceptanceRef=${ACCEPTANCE_PROJECT_REF}; distinct=${productionRef !== ACCEPTANCE_PROJECT_REF}`)) {
    throw new Error("Production and acceptance Supabase identities overlap");
  }

  const supabaseProject = await getJson(`https://api.supabase.com/v1/projects/${encodeURIComponent(productionRef)}`, SUPABASE_ACCESS_TOKEN);
  const supabaseExact = supabaseProject.status === 200
    && (supabaseProject.json?.ref === productionRef || supabaseProject.json?.id === productionRef);
  if (!record("production_supabase_management_identity_resolves", supabaseExact,
    `status=${supabaseProject.status}; ref=${supabaseProject.json?.ref ?? supabaseProject.json?.id ?? "unresolved"}`)) {
    throw new Error("Production Supabase project is not reachable through the authorized Management session");
  }

  const domainsResult = await vercel(`/v9/projects/${encodeURIComponent(vercelIdentity.projectId)}/domains?limit=100`);
  const domains = (Array.isArray(domainsResult.json?.domains) ? domainsResult.json.domains : [])
    .map((entry) => entry?.name)
    .filter((name) => typeof name === "string" && name.length > 0);
  if (domainsResult.status !== 200 || domains.length === 0) {
    throw new Error("Production domains could not be enumerated");
  }

  const resolutions = [];
  for (const domain of domains) {
    const result = await vercel(`/v13/deployments/${encodeURIComponent(domain)}`);
    const deployment = result.json ?? {};
    if (result.status === 200 && deployment.target === "production" && (deployment.readyState ?? deployment.state) === "READY") {
      resolutions.push({
        domain,
        deploymentId: deployment.id ?? deployment.uid ?? null,
        immutableHostname: deployment.url ?? null,
        target: deployment.target,
        readyState: deployment.readyState ?? deployment.state
      });
    }
  }

  const currentIds = [...new Set(resolutions.map((entry) => entry.deploymentId).filter(Boolean))];
  const currentId = currentIds.length === 1 ? currentIds[0] : null;
  const currentDetailResult = currentId ? await vercel(`/v13/deployments/${encodeURIComponent(currentId)}`) : { status: 0, json: null };
  const currentDetail = currentDetailResult.json ?? {};
  const currentExact = currentDetailResult.status === 200
    && (currentDetail.id ?? currentDetail.uid) === currentId
    && currentDetail.target === "production"
    && (currentDetail.readyState ?? currentDetail.state) === "READY"
    && (currentDetail.projectId === vercelIdentity.projectId || currentDetail.name === HOSTED_VERCEL_PROJECT_NAME)
    && resolutions.length > 0;
  if (!record("current_ready_production_target_is_exact", currentExact,
    `resolvedDomains=${resolutions.length}/${domains.length}; distinctReadyProductionDeployments=${currentIds.length}; deploymentId=${currentId ?? "unresolved"}`)) {
    throw new Error("configured Production domains do not resolve to one exact READY Production deployment");
  }

  const productionDomains = resolutions.map((entry) => entry.domain).sort();
  const immutableHostname = currentDetail.url ?? resolutions.find((entry) => entry.deploymentId === currentId)?.immutableHostname ?? null;
  const rollbackRecorded = Boolean(currentId && immutableHostname && productionDomains.length > 0);
  evidence.production = {
    vercelProject: { id: vercelIdentity.projectId, name: HOSTED_VERCEL_PROJECT_NAME },
    supabaseProjectRef: productionRef,
    currentDeployment: {
      id: currentId,
      immutableHostname,
      target: "production",
      readyState: "READY",
      productionDomains,
      gitSha: currentDetail.meta?.githubCommitSha ?? currentDetail.meta?.gitCommitSha ?? null
    },
    rollbackTarget: {
      deploymentId: currentId,
      immutableHostname,
      productionDomains,
      capturedAt: new Date().toISOString(),
      capturedBeforeMutation: true
    },
    environmentSeparation: {
      acceptanceProjectRef: ACCEPTANCE_PROJECT_REF,
      productionProjectRef: productionRef,
      distinct: true,
      optionalServerUrlPresent: Boolean(serverUrlEntry),
      optionalServerUrlMatched: optionalServerMatches,
      decryptedValuesPersisted: false
    }
  };
  if (!record("rollback_target_recorded_before_mutation", rollbackRecorded,
    `deploymentId=${currentId}; immutableHostname=${immutableHostname}; domains=${productionDomains.join(",")}`)) {
    throw new Error("rollback target is incomplete");
  }

  record("preflight_performed_no_mutation", true, "all external calls were GET; no SQL or deployment command ran");
  persist(true);
  console.log(`PRODUCTION PREFLIGHT PASSED — rollback ${currentId}; Production project ${productionRef}; no mutation attempted`);
} catch (error) {
  const failure = error instanceof Error ? error.message : String(error);
  persist(false, failure);
  console.error(`PRODUCTION PREFLIGHT REFUSED — ${failure}`);
  process.exit(1);
}
