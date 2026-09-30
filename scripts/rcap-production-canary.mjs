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

import assert from "node:assert/strict";
import { RESTAGE_AUTHORITY, requireProductionPhaseAuthorization } from "./grade-a-launch-control/production-preflight-authorization.mjs";
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

import { requireProductionMigrationRelease } from './rcap-production-migration-contract.mjs';
const RELEASE_CANDIDATE = JSON.parse(fs.readFileSync(new URL('../data/rcap-grade-a/launch-control/RELEASE_CANDIDATE_BINDING.json', import.meta.url), 'utf8'));
const APPLICATION_SHA = RELEASE_CANDIDATE.applicationSha;
const WORKER_SOURCE_SHA = RELEASE_CANDIDATE.workerSourceSha;
const WORKER_DIGEST = RELEASE_CANDIDATE.workerDigest;
const TOOLS_SHA = process.env.RCAP_TOOLS_SHA;
const PRODUCTION_PROJECT_REF = "wwtwtsmywnckfkdaqqeg";
const ACCEPTANCE_PROJECT_REF = "hyflxnlhpmiqxvvcoiia";
// Historical Preview records remain in the successor ledger. This control
// uses the exact Preview recorded for the current application tuple.
const ACCEPTANCE_DEPLOYMENT_ID = RELEASE_CANDIDATE.hostedAcceptance?.preview?.deploymentId;
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
    createdAt: entry?.createdAt ?? null,
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

async function inspectRuntimeSupabaseOrigin(immutableHostname, readRuntime = runtimeGet) {
  const baseOrigin = "https://" + immutableHostname;
  const candidateOrigins = new Set();
  const fetchedChunks = new Set();
  let successfulPages = 0;
  let successfulChunks = 0;

  for (const route of PUBLIC_ROUTES) {
    const page = await readRuntime(baseOrigin, route);
    if (!page.ok || !page.sameHost) continue;
    successfulPages += 1;
    inspectForSupabaseOrigins(page.text, candidateOrigins);
    for (const source of scriptSources(page.text)) {
      if (fetchedChunks.has(source)) continue;
      fetchedChunks.add(source);
      const chunk = await readRuntime(baseOrigin, source);
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

async function originMapsToProject(origin, projectRef, readJson = getJson) {
  const project = await readJson(
    "https://api.supabase.com/v1/projects/" + encodeURIComponent(projectRef),
    SUPABASE_ACCESS_TOKEN
  );
  if (project.status !== 200 || (project.json?.ref ?? project.json?.id) !== projectRef) {
    return false;
  }

  const hostname = new URL(origin).hostname.toLowerCase();
  if (hostname === projectRef + ".supabase.co") return true;

  const custom = await readJson(
    "https://api.supabase.com/v1/projects/" + encodeURIComponent(projectRef) + "/custom-hostname",
    SUPABASE_ACCESS_TOKEN
  );
  const vanity = await readJson(
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

// The staged candidate is created through the same REST transport the
// acceptance Preview uses (one POST /v13/deployments from the exact Git SHA),
// not through the CLI archive upload, which failed on run 35047531870 before
// any identity was verified. `target: "production"` builds the candidate with
// the project's Production environment; `autoAssignCustomDomains: false` is the
// REST form of `--skip-domain`, so no Production domain moves. Exactly one
// creation call is made; a failed build or a timeout never retries.
async function createStagedProduction(vercelIdentity, vercel) {
  const body = {
    name: HOSTED_VERCEL_PROJECT_NAME,
    project: vercelIdentity.projectId,
    gitSource: { type: "github", repoId: "1248656766", ref: APPLICATION_SHA, sha: APPLICATION_SHA },
    target: "production",
    autoAssignCustomDomains: false,
    meta: {
      rcapStagedProduction: "true",
      rcapApplicationSha: APPLICATION_SHA,
      rcapWorkerSourceSha: WORKER_SOURCE_SHA,
      rcapWorkerDigest: WORKER_DIGEST,
      rcapToolsSha: INPUT_TOOLS_SHA
    }
  };
  const created = await fetch(hostedVercelScopedUrl("/v13/deployments", vercelIdentity), {
    method: "POST",
    headers: { Authorization: "Bearer " + VERCEL_TOKEN, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    redirect: "error",
    signal: AbortSignal.timeout(60000)
  });
  const createdJson = parseJson(await created.text());
  if (!created.ok || !/^dpl_[A-Za-z0-9]+$/.test(createdJson?.id ?? "")) {
    throw new Error("staged Production deployment command failed before identity verification (REST create HTTP " + created.status + ")");
  }
  if (createdJson?.gitSource?.sha !== APPLICATION_SHA || createdJson?.target !== "production") {
    throw new Error("staged Production deployment was not created from the exact application SHA as a Production-target build");
  }
  const id = createdJson.id;
  for (let poll = 0; poll < 180; poll += 1) {
    const detail = await vercel("/v13/deployments/" + encodeURIComponent(id));
    if (detail.status !== 200) {
      throw new Error("new staged Production deployment could not be resolved by exact identity");
    }
    const state = detail.json?.readyState ?? detail.json?.state;
    if (state === "READY") return detail.json;
    if (["ERROR", "CANCELED", "CANCELLED", "PAUSED", "BLOCKED"].includes(state)) {
      throw new Error("staged Production deployment build ended in " + state + "; no retry");
    }
    await new Promise((resolve) => setTimeout(resolve, 10000));
  }
  throw new Error("staged Production deployment did not reach READY within the poll budget; no retry");
}

async function exactDeploymentDetail(vercel, identifier) {
  const result = await vercel("/v13/deployments/" + encodeURIComponent(identifier));
  if (result.status !== 200) {
    throw new Error("exact deployment identity could not be resolved");
  }
  return result.json;
}

export function productionRestageKeyTimes(entries) {
  const names=['LEGAL_AID_RESTRICTED_FIELD_KEY','LEGAL_AID_RESTRICTED_FIELD_KEY_VERSION','PARTICIPANT_PRIVACY_PSEUDONYM_SECRET'];
  return names.map(key=>{
    const matches=entries.filter(entry=>entry.key===key && targetList(entry).includes('production'));
    assert.equal(matches.length,1,'restage_key_missing_or_duplicate');
    const entry=matches[0];
    if(key!=='LEGAL_AID_RESTRICTED_FIELD_KEY_VERSION') assert.equal(entry.type,'sensitive','restage_key_not_sensitive');
    const timestamp=value=>typeof value==='number'?value:Date.parse(value);
    const created=timestamp(entry.createdAt),updated=entry.updatedAt==null?created:timestamp(entry.updatedAt);
    assert.ok(Number.isFinite(created)&&created>0&&created<=Date.now()&&Number.isFinite(updated)&&updated>=created&&updated<=Date.now(),'restage_key_timestamp_invalid');
    return Math.max(created,updated);
  });
}
export function restageDeploymentRequest(projectId,toolsSha) {
  return {name:HOSTED_VERCEL_PROJECT_NAME,project:projectId,
    gitSource:{type:'github',repoId:'1248656766',ref:APPLICATION_SHA,sha:APPLICATION_SHA},
    target: "production", autoAssignCustomDomains: false,
    meta:{rcapStagedProduction:'true',rcapApplicationSha:APPLICATION_SHA,rcapWorkerSourceSha:WORKER_SOURCE_SHA,
      rcapWorkerDigest:WORKER_DIGEST,rcapToolsSha:toolsSha,rcapProductionRestage:RESTAGE_AUTHORITY.marker}};
}
export function validateRestageDeploymentRequest(body,projectId,toolsSha) {
  assert.deepEqual(body,restageDeploymentRequest(projectId,toolsSha),'restage_exact_no_alias_request');
  assert.equal(body.autoAssignCustomDomains,false,'restage_no_domain_assignment');
}
export async function runProductionRestage({env=process.env,rootDir=ROOT_DIR,fetchImpl=globalThis.fetch,
  requireRelease=requireProductionMigrationRelease,resolveIdentity=resolveHostedVercelIdentity,
  inspectRuntime=inspectRuntimeSupabaseOrigin,originMatches=originMapsToProject,
  pause=ms=>new Promise(resolve=>setTimeout(resolve,ms))}={}) {
  const receipt={schemaVersion:'rcap-production-restage/v1',passed:false,applicationSha:APPLICATION_SHA,
    workerSourceSha:WORKER_SOURCE_SHA,workerDigest:WORKER_DIGEST,productionProjectRef:PRODUCTION_PROJECT_REF,
    oldStagedDeploymentId:RESTAGE_AUTHORITY.oldStagedDeploymentId,replacementStagedDeploymentId:null,
    rollbackDeploymentId:RESTAGE_AUTHORITY.rollbackDeploymentId,keyNamesPresentOnly:true,keyValuesRecorded:false,
    replacementCreatedAfterKeys:false,publicAliasesChanged:false,environmentMetadataChanged:false,
    productionDatabaseMutated:false,workerChanged:false,migrationReplayed:false,keysCreated:false,
    deploymentCreated:false,deploymentCreateAttempted:false,reusedExactReplacement:false,verdicts:[]};
  const check=(id,ok)=>{receipt.verdicts.push({caseId:id,passed:Boolean(ok)});if(!ok)throw Error(id);};
  const transport=async(operation,url,options={})=>{
    const method=options.method??'GET',maxAttempts=method==='GET'?3:1;
    for(let attempt=1;attempt<=maxAttempts;attempt++){
      let response,text,status,retryable=false;
      try{
        response=await fetchImpl(url,{redirect:'error',...options,method,signal:AbortSignal.timeout(60000)});
        status=response.status;
        if(response.ok===true){text=await response.text();return {ok:true,status,attempts:attempt,url:response.url,text:async()=>text};}
        retryable=status===429||(status>=500&&status<=599);
      }catch{retryable=true;}
      if(method==='GET'&&retryable&&attempt<maxAttempts){await pause(Math.min(1000*2**(attempt-1),2000));continue;}
      receipt.transportFailure={operation,method,...(status===undefined?{}:{status}),attempts:attempt,retryable};
      throw Error(method==='GET'?'restage_read_transport_refused':'restage_write_transport_refused');
    }
  };
  const request=async(operation,url,options)=>{
    const response=await transport(operation,url,options);
    try{return JSON.parse(await response.text());}catch{
      receipt.transportFailure={operation,method:options.method,status:response.status,attempts:response.attempts,retryable:false};
      throw Error(options.method==='GET'?'restage_read_transport_refused':'restage_write_transport_refused');
    }
  };
  try {
    check('restage_phase_exact',env.RCAP_PRODUCTION_PHASE==='restage');
    const release=requireRelease(rootDir,env);
    const authorization=requireProductionPhaseAuthorization(release,'restage');
    check('restage_owner_exact',JSON.stringify({...authorization.restage,recordedAt:undefined})===JSON.stringify({...RESTAGE_AUTHORITY,recordedAt:undefined}));
    check('restage_release_exact',release.applicationSha===APPLICATION_SHA && release.workerSourceSha===WORKER_SOURCE_SHA && release.workerDigest===WORKER_DIGEST
      && release.workerInputFingerprint==='sha256:90a1e89e306cb5fc23631c63c15c12a44d955d745bbe04aada0716af2805daab'
      && release.productionProjectRef===PRODUCTION_PROJECT_REF && authorization.stagedDeploymentId===RESTAGE_AUTHORITY.oldStagedDeploymentId && authorization.rollbackDeploymentId===RESTAGE_AUTHORITY.rollbackDeploymentId);
    check('restage_sessions_available',Boolean(env.VERCEL_TOKEN&&env.SUPABASE_ACCESS_TOKEN&&env.VERCEL_AUTOMATION_BYPASS_SECRET));
    const identity=await resolveIdentity({token:env.VERCEL_TOKEN,fetchImpl:(url,options)=>transport('project_identity',url,options)});
    const headers={Authorization:'Bearer '+env.VERCEL_TOKEN};
    const vercel=(operation,pathname)=>request(operation,hostedVercelScopedUrl(pathname,identity),{method: "GET",headers});
    const project=await vercel('project_identity','/v9/projects/'+encodeURIComponent(identity.projectId));
    check('restage_project_exact',project.id===identity.projectId&&project.name===HOSTED_VERCEL_PROJECT_NAME);
    const production=await request('production_project','https://api.supabase.com/v1/projects/'+PRODUCTION_PROJECT_REF,{method: "GET",headers:{Authorization:'Bearer '+env.SUPABASE_ACCESS_TOKEN}});
    check('restage_production_project_exact',(production.ref??production.id)===PRODUCTION_PROJECT_REF);
    let publicBaselineRead=false;
    const mapping=async()=>{
      const listed=await vercel('public_domains','/v9/projects/'+identity.projectId+'/domains?limit=100&production=true&redirects=true');
      check('restage_domains_complete',Array.isArray(listed.domains)&&listed.domains.length>0&&!listed.pagination?.next);
      const productionDomains=listed.domains.filter(d=>!d.gitBranch&&!d.customEnvironmentId);
      check('restage_public_domains_present',productionDomains.length>0&&productionDomains.every(d=>typeof d.name==='string'&&d.name.length>0));
      const domains=productionDomains.map(d=>d.name).sort();
      check('restage_domain_names_unique',new Set(domains).size===domains.length);
      const rows=[];
      for(const entry of productionDomains){
        const name=entry.name;
        if(entry.redirect!=null&&entry.redirect!==''){
          check('restage_redirect_metadata_valid',typeof entry.redirect==='string'&&(entry.redirectStatusCode==null||Number.isInteger(entry.redirectStatusCode)));
          rows.push({name,kind:'redirect',redirect:entry.redirect,redirectStatusCode:entry.redirectStatusCode??null});
          continue;
        }
        const d=await vercel('public_domain:'+name,'/v13/deployments/'+encodeURIComponent(name));
        if(publicBaselineRead&&deploymentId(d)!==RESTAGE_AUTHORITY.rollbackDeploymentId)receipt.publicAliasesChanged=true;
        check('restage_public_mapping_is_rollback',deploymentId(d)===RESTAGE_AUTHORITY.rollbackDeploymentId&&deploymentReady(d)&&d.target==='production'&&d.projectId===identity.projectId);
        rows.push({name,kind:'deployment',deploymentId:deploymentId(d)});
      }
      rows.sort((a,b)=>a.name<b.name?-1:a.name>b.name?1:0);
      return {domains,rows,hash:sha256(JSON.stringify(rows))};
    };
    const publicBefore=await mapping();publicBaselineRead=true;
    receipt.routingStateBefore=publicBefore.rows;receipt.routingStateBeforeSha256=publicBefore.hash;
    const old=await vercel('old_staged_deployment','/v13/deployments/'+RESTAGE_AUTHORITY.oldStagedDeploymentId);
    const exactTuple=d=>d?.target==='production'&&d?.projectId===identity.projectId&&d?.gitSource?.sha===APPLICATION_SHA
      &&d?.meta?.rcapStagedProduction==='true'&&d.meta.rcapApplicationSha===APPLICATION_SHA&&d.meta.rcapWorkerSourceSha===WORKER_SOURCE_SHA&&d.meta.rcapWorkerDigest===WORKER_DIGEST;
    check('restage_old_staged_exact',deploymentId(old)===RESTAGE_AUTHORITY.oldStagedDeploymentId&&deploymentReady(old)&&exactTuple(old));
    const environment=async()=>{
      const doc=await vercel('environment_metadata','/v9/projects/'+identity.projectId+'/env?decrypt=false');
      check('restage_environment_complete',Array.isArray(doc.envs)&&!doc.pagination?.next);
      return {hash:safeEnvironmentMetadataHash(doc.envs),keyTimes:productionRestageKeyTimes(doc.envs)};
    };
    const envBefore=await environment();check('restage_key_names_types_and_timestamps',envBefore.keyTimes.length===3);
    // Inventory every state, including BUILDING/ERROR. A timed-out create must
    // never disappear merely because a READY-only filter hides its result.
    const replacements=[];let cursor=null,complete=false;const cursors=new Set(),ids=new Set();
    for(let page=0;page<100;page++){
      const listed=await vercel('replacement_inventory','/v6/deployments?projectId='+identity.projectId+'&target=production&limit=100'+(cursor?'&until='+encodeURIComponent(cursor):''));
      check('restage_inventory_valid',Array.isArray(listed.deployments));
      for(const d of listed.deployments)if(d.meta?.rcapProductionRestage===RESTAGE_AUTHORITY.marker&&deploymentId(d)!==RESTAGE_AUTHORITY.rollbackDeploymentId&&!ids.has(deploymentId(d))){ids.add(deploymentId(d));replacements.push(d);}
      cursor=listed.pagination?.next;if(cursor==null){complete=true;break;}
      check('restage_inventory_progress',!cursors.has(cursor));cursors.add(cursor);
    }
    check('restage_inventory_complete',complete);check('restage_at_most_one_replacement',replacements.length<=1);
    let staged,expectedReplacementId;
    if(replacements.length===1){
      expectedReplacementId=deploymentId(replacements[0]);
      staged=await vercel('replacement_detail','/v13/deployments/'+expectedReplacementId);
      check('restage_existing_replacement_ready',deploymentReady(staged));receipt.reusedExactReplacement=true;
    }else{
      // A GitHub rerun after an uncertain transport outcome cannot POST again,
      // even if eventual-consistency inventory has not exposed the first ID.
      check('restage_no_second_create_on_rerun',String(env.GITHUB_RUN_ATTEMPT)==='1');
      const body=restageDeploymentRequest(identity.projectId,env.RCAP_TOOLS_SHA);validateRestageDeploymentRequest(body,identity.projectId,env.RCAP_TOOLS_SHA);
      const immediateMapping=await mapping(),immediateEnvironment=await environment();
      receipt.publicAliasesChanged=immediateMapping.hash!==publicBefore.hash;
      check('restage_precreate_mapping_unchanged',!receipt.publicAliasesChanged);
      receipt.environmentMetadataChanged=immediateEnvironment.hash!==envBefore.hash;
      check('restage_precreate_environment_unchanged',!receipt.environmentMetadataChanged);
      receipt.deploymentCreateAttempted=true;receipt.deploymentCreated=null;
      const created=await request('deployment_create',hostedVercelScopedUrl('/v13/deployments',identity),{method: "POST",headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify(body)});
      check('restage_created_id_valid',/^dpl_[A-Za-z0-9]+$/.test(created.id??'')&&created.id!==RESTAGE_AUTHORITY.oldStagedDeploymentId&&created.id!==RESTAGE_AUTHORITY.rollbackDeploymentId);
      receipt.deploymentCreated=true;receipt.replacementStagedDeploymentId=created.id;expectedReplacementId=created.id;
      for(let poll=0;poll<180;poll++){
        staged=await vercel('replacement_detail','/v13/deployments/'+created.id);
        if(deploymentReady(staged))break;
        check('restage_build_not_failed',!['ERROR','CANCELED','CANCELLED','PAUSED','BLOCKED'].includes(staged.readyState??staged.state));
        if(poll<179)await pause(10000);
      }
    }
    const id=deploymentId(staged);receipt.replacementStagedDeploymentId=id;
    check('restage_replacement_identity',id===expectedReplacementId&&id!==RESTAGE_AUTHORITY.oldStagedDeploymentId&&id!==RESTAGE_AUTHORITY.rollbackDeploymentId&&deploymentReady(staged)&&exactTuple(staged)&&staged.meta.rcapProductionRestage===RESTAGE_AUTHORITY.marker&&staged.meta.rcapToolsSha===env.RCAP_TOOLS_SHA);
    const createdAt=typeof staged.createdAt==='number'?staged.createdAt:typeof staged.created==='number'?staged.created:Date.parse(staged.createdAt);
    check('restage_replacement_after_keys',Number.isFinite(createdAt)&&createdAt<=Date.now()&&envBefore.keyTimes.every(t=>createdAt>t));receipt.replacementCreatedAfterKeys=true;
    const aliases=staged.alias??staged.aliases;
    check('restage_replacement_has_no_public_domain',Array.isArray(aliases)&&aliases.every(alias=>typeof alias==='string'&&!publicBefore.domains.includes(alias))&&staged.autoAssignCustomDomains!==true);
    check('restage_runtime_hostname',typeof staged.url==='string'&&/^[a-z0-9.-]+\.vercel\.app$/.test(staged.url));
    const runtime=await inspectRuntime(staged.url,async(baseOrigin,pathname)=>{
      const response=await transport('replacement_runtime',new URL(pathname,baseOrigin),{method: "GET",headers:{'x-vercel-protection-bypass':env.VERCEL_AUTOMATION_BYPASS_SECRET},redirect:'follow'});
      return {ok:response.ok,status:response.status,sameHost:new URL(response.url).host===new URL(baseOrigin).host,text:await response.text()};
    });
    check('restage_runtime_production_exact',await originMatches(runtime.origin,PRODUCTION_PROJECT_REF,async(url)=>{
      const json=await request('production_project',url,{method: "GET",headers:{Authorization:'Bearer '+env.SUPABASE_ACCESS_TOKEN}});return {status:200,json};
    }));
    const envAfter=await environment(),publicAfter=await mapping();
    receipt.routingStateAfter=publicAfter.rows;receipt.routingStateAfterSha256=publicAfter.hash;
    receipt.environmentMetadataChanged=envAfter.hash!==envBefore.hash;receipt.publicAliasesChanged=publicAfter.hash!==publicBefore.hash;
    check('restage_environment_metadata_unchanged',!receipt.environmentMetadataChanged);check('restage_public_aliases_unchanged',!receipt.publicAliasesChanged&&receipt.routingStateBeforeSha256===receipt.routingStateAfterSha256);
    receipt.controlHashes={environmentBefore:envBefore.hash,environmentAfter:envAfter.hash,aliasesBefore:publicBefore.hash,aliasesAfter:publicAfter.hash};
    receipt.passed=true;
  }catch(error){receipt.failure=receipt.transportFailure?(receipt.transportFailure.method==='GET'?'restage_read_transport_refused':'restage_write_transport_refused'):/^restage_[a-z_]+$/.test(error.message)?error.message:'restage_control_refused';}
  const directory=path.resolve(env.RCAP_PRODUCTION_EVIDENCE_DIR??'production-canary-evidence');fs.mkdirSync(directory,{recursive:true});
  fs.writeFileSync(path.join(directory,'production-restage.json'),JSON.stringify(receipt,null,2)+'\n');return receipt;
}

async function runProductionPreflight() {
fs.mkdirSync(EVIDENCE_DIR, { recursive: true });

try {
  if (PHASE !== "preflight") {
    throw new Error("only the bounded Production preflight phase is enabled");
  }
  if (!VERCEL_TOKEN || !SUPABASE_ACCESS_TOKEN || !VERCEL_AUTOMATION_BYPASS_SECRET) {
    throw new Error("required secret-backed read-only sessions are unavailable");
  }

  requireProductionMigrationRelease(ROOT_DIR, process.env);
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
  // Deployment identifiers are not secrets; the smoke and activation phases
  // pin them by literal, so the preflight names them in its own log.
  console.log("  staged Production-target deployment: " + stagedId);
  console.log("  rollback (current Production) deployment: " + productionBefore.deploymentId);
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
    && acceptance?.projectId === vercelIdentity.projectId
    && acceptance?.gitSource?.sha === APPLICATION_SHA
    && acceptanceMeta.rcapApplicationSha === APPLICATION_SHA
    && acceptanceMeta.rcapWorkerSourceSha === WORKER_SOURCE_SHA
    && acceptanceMeta.rcapWorkerDigest === WORKER_DIGEST
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

}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (PHASE === "restage") { const result=await runProductionRestage(); if(!result.passed)process.exitCode=1; }
  else await runProductionPreflight();
}
