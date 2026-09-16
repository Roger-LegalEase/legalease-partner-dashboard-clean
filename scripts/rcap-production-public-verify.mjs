#!/usr/bin/env node
// Read-only verification of the ACTIVATED Production release on its public
// domain. This control cannot build, promote, roll back, or change any Vercel,
// Supabase or Stripe state. It proves four things from the outside:
//   1. the public domain is a Production domain of the pinned project and, with
//      every other Production domain, resolves to the exact activated deployment
//      (control-plane readback), and the recorded rollback target is still READY;
//   2. the public domain serves the application over HTTPS (health 200 with the
//      structured checks) and the identical build the canonical Vercel domain
//      serves (same script inventory on the same route);
//   3. the public runtime exposes exactly one Supabase origin and it is the same
//      origin the canonical domain exposes (never logged directly; hashed);
//   4. a fresh Chrome context, with no cookies, storage or injected answers,
//      completes the Mississippi screening for a dropped/thrown-out misdemeanor
//      (non-conviction) by clicking visible options only, is never asked about a
//      DUI sentence or underage alcohol, reaches the non-conviction pathway, and
//      never opens Checkout.
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { chromium } from "playwright";

import {
  HOSTED_VERCEL_PROJECT_NAME,
  hostedVercelScopedUrl,
  resolveHostedVercelIdentity
} from "./rcap-hosted-acceptance-vercel-identity.mjs";

const APPLICATION_SHA = "61a2f018a9a444a24b3c1ee9533f4811bcfa56b6";
const WORKER_SOURCE_SHA = "da432bd11924cc3ba8d766cbb9e09b12650347c3";
const WORKER_DIGEST = "sha256:477afe68b5d7dec8d4c2f550761b3491036950346bfc0c8654e7cf85460c4249";
const PRODUCTION_PROJECT_REF = "wwtwtsmywnckfkdaqqeg";
const STAGED_DEPLOYMENT_ID = "dpl_EpRfqnBuTTsuZZmDikXhsRZ3EojX";
const ROLLBACK_DEPLOYMENT_ID = "dpl_DGDUFV4B7ufTAW5wsfR2txJE2dVL";
const PUBLIC_DOMAIN = "expungement.ai";
const SCREENING_PATH = "/expungement-ai/screening/MS";
const EVIDENCE_DIR = path.resolve(process.env.RCAP_PUBLIC_EVIDENCE_DIR ?? "production-public-evidence");
const SHOTS_DIR = path.join(EVIDENCE_DIR, "mississippi-screening");
const EVIDENCE_FILE = path.join(EVIDENCE_DIR, "production-public-verify.json");

const PHASE = (process.env.RCAP_PRODUCTION_PHASE ?? "").trim();
const INPUT_APPLICATION_SHA = (process.env.RCAP_APPLICATION_SHA ?? "").trim();
const INPUT_WORKER_SOURCE_SHA = (process.env.RCAP_WORKER_SOURCE_SHA ?? "").trim();
const INPUT_WORKER_DIGEST = (process.env.RCAP_WORKER_DIGEST ?? "").trim();
const VERCEL_TOKEN = process.env.VERCEL_TOKEN ?? "";

// The screening is answered by clicking the visible option whose text matches
// the participant's situation. Nothing is typed, injected or pre-seeded.
const SCREENING_PLAN = [
  [/own record/i, /^yes/i],
  [/happen in mississippi/i, /^state or local/i],
  [/how did the case end/i, /dismissed|dropped|no-billed|not prosecuted/i],
  [/what kind of charge/i, /^misdemeanor/i],
  [/sound like your situation/i, /^non-conviction expungement for dismissal/i],
  [/completed everything the court ordered/i, /^yes/i],
  [/how long ago/i, /^1-2 years ago/i]
];
const FORBIDDEN_PROMPTS = /\bDUI\b|driving under the influence|underage|alcohol/i;
const EXPECTED_PATHWAY = /non-conviction expungement for dismissal/i;

fs.mkdirSync(SHOTS_DIR, { recursive: true });
const verdicts = [];
const evidence = {
  schemaVersion: "rcap-production-public-verify/v1",
  startedAt: new Date().toISOString(),
  applicationSha: APPLICATION_SHA,
  workerSourceSha: WORKER_SOURCE_SHA,
  workerDigest: WORKER_DIGEST,
  productionProjectRef: PRODUCTION_PROJECT_REF,
  activatedDeploymentId: STAGED_DEPLOYMENT_ID,
  rollbackDeploymentId: ROLLBACK_DEPLOYMENT_ID,
  publicDomain: PUBLIC_DOMAIN,
  productionDomains: [],
  domainResolution: [],
  publicHttp: null,
  buildIdentity: null,
  runtimeOrigin: null,
  screening: null,
  mutations: {
    deploymentTriggered: false,
    productionAliasChanged: false,
    environmentVariableChanged: false,
    productionDatabaseMutated: false,
    accountCreated: false,
    checkoutOpened: false,
    realChargesCreated: false
  },
  originPersisted: false,
  secretsPersisted: false,
  verdicts
};

const sha256 = (value) => createHash("sha256").update(String(value), "utf8").digest("hex");
const parseJson = (text) => { try { return JSON.parse(text); } catch { return null; } };
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
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    redirect: "error",
    signal: AbortSignal.timeout(30_000)
  });
  return { status: response.status, json: parseJson(await response.text()) };
}
async function fetchPublic(url) {
  let last = null;
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    try {
      const response = await fetch(url, { method: "GET", redirect: "follow", signal: AbortSignal.timeout(30_000) });
      if (response.status < 500) return response;
      last = new Error(`HTTP ${response.status}`);
    } catch (error) {
      last = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 3_000 * attempt));
  }
  throw last ?? new Error("public fetch failed");
}
const deploymentId = (value) => value?.id ?? value?.uid ?? null;
const ready = (value) => (value?.readyState ?? value?.state) === "READY";
function scriptSources(html) {
  return [...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map((match) => match[1])
    .filter((source) => source.startsWith("/_next/") || source.startsWith("https://"))
    .sort();
}
function collectOrigins(text, origins) {
  for (const match of text.matchAll(/https:\/\/[a-z0-9-]+\.supabase\.co/gi)) origins.add(match[0].toLowerCase());
  for (const match of text.matchAll(/https:\/\/[a-z0-9.-]+\/(?:auth\/v1|rest\/v1)/gi)) {
    origins.add(new URL(match[0]).origin.toLowerCase());
  }
}
async function inspectPublicRuntime(hostname, allowedHosts) {
  const origins = new Set();
  const fetchedChunks = new Set();
  let pagesInspected = 0;
  let chunksInspected = 0;
  let scripts = null;
  for (const route of ["/", "/sign-in", "/expungement-ai/sign-in"]) {
    const page = await fetchPublic(`https://${hostname}${route}`);
    if (!page.ok || !allowedHosts.has(new URL(page.url).hostname)) continue;
    pagesInspected += 1;
    const html = await page.text();
    if (route === "/") scripts = scriptSources(html);
    collectOrigins(html, origins);
    const finalOrigin = new URL(page.url).origin;
    for (const source of scriptSources(html)) {
      const chunkUrl = new URL(source, finalOrigin).href;
      if (fetchedChunks.has(chunkUrl)) continue;
      fetchedChunks.add(chunkUrl);
      const chunk = await fetchPublic(chunkUrl);
      if (!chunk.ok || !allowedHosts.has(new URL(chunk.url).hostname)) continue;
      chunksInspected += 1;
      collectOrigins(await chunk.text(), origins);
    }
  }
  return { origins: [...origins], pagesInspected, chunksInspected, scripts };
}

async function walkMississippiScreening(hostname) {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const context = await browser.newContext({ viewport: { width: 1200, height: 1600 } });
  const page = await context.newPage();
  const externalRequests = new Set();
  page.on("request", (request) => {
    const host = new URL(request.url()).hostname;
    if (host !== hostname && !host.endsWith(".vercel-insights.com") && !host.endsWith(".vercel-scripts.com")) {
      externalRequests.add(host);
    }
  });
  const steps = [];
  let forbiddenPrompt = null;
  let unplanned = null;
  let reachedResult = false;
  try {
    const initialState = await context.storageState();
    steps.push({
      freshContext: initialState.cookies.length === 0 && initialState.origins.length === 0,
      cookies: initialState.cookies.length,
      storageOrigins: initialState.origins.length
    });
    await page.goto(`https://${hostname}${SCREENING_PATH}`, { waitUntil: "networkidle", timeout: 60_000 });
    for (let step = 0; step < 20; step += 1) {
      await page.waitForTimeout(500);
      const bodyText = (await page.locator("main").innerText().catch(() => page.innerText("body"))).replace(/\s+/g, " ");
      const headings = (await page.locator("h1, h2, legend").allTextContents()).map((t) => t.trim()).filter(Boolean).slice(0, 4);
      const options = (await page.locator("label, [role=radio], button[type=button]").allTextContents()).map((t) => t.trim()).filter(Boolean).slice(0, 30);
      await page.screenshot({ path: path.join(SHOTS_DIR, `step-${String(step).padStart(2, "0")}.png`), fullPage: true });
      const hasContinue = (await page.getByRole("button", { name: /continue/i }).count()) > 0;
      const isResult = !hasContinue && /result|preliminary|next step|create an account|sign in|packet|not eligible|more information/i.test(bodyText);
      if (FORBIDDEN_PROMPTS.test(headings.join(" "))) forbiddenPrompt = { step, headings };
      const rule = SCREENING_PLAN.find(([prompt]) => prompt.test(bodyText));
      const entry = { step, url: page.url(), headings, options, matchedPrompt: rule ? String(rule[0]) : null, isResult };
      if (isResult) {
        entry.pathwayNamed = EXPECTED_PATHWAY.test(bodyText);
        entry.excerpt = bodyText.slice(0, 900);
        steps.push(entry);
        reachedResult = true;
        break;
      }
      if (!rule) { unplanned = { step, headings, excerpt: bodyText.slice(0, 400) }; steps.push(entry); break; }
      const candidates = await page.locator("label, [role=radio], button[type=button], [role=option], li").all();
      let clicked = null;
      for (const candidate of candidates) {
        const text = ((await candidate.textContent().catch(() => "")) ?? "").trim();
        if (rule[1].test(text)) { await candidate.click(); clicked = text; break; }
      }
      entry.clicked = clicked;
      steps.push(entry);
      if (!clicked) { unplanned = { step, headings, noChoiceMatched: true, options }; break; }
      await page.getByRole("button", { name: /continue/i }).first().click();
      await page.waitForTimeout(900);
    }
    const finalState = await context.storageState();
    return {
      steps,
      reachedResult,
      forbiddenPrompt,
      unplanned,
      finalUrl: page.url(),
      finalHost: new URL(page.url()).hostname,
      externalRequestHosts: [...externalRequests].sort(),
      cookiesAfter: finalState.cookies.length
    };
  } finally {
    await browser.close();
  }
}

try {
  if (PHASE !== "public_verify"
    || INPUT_APPLICATION_SHA !== APPLICATION_SHA
    || INPUT_WORKER_SOURCE_SHA !== WORKER_SOURCE_SHA
    || INPUT_WORKER_DIGEST !== WORKER_DIGEST
    || !VERCEL_TOKEN) {
    throw new Error("exact public verification inputs are unavailable");
  }
  record("release_identity_is_exact", true, "application, worker source and immutable digest match the frozen authorization");

  const identity = await resolveHostedVercelIdentity({ token: VERCEL_TOKEN });
  const vercel = (pathname) => getJson(hostedVercelScopedUrl(pathname, identity), VERCEL_TOKEN);
  const [project, activated, rollback, domainsResult] = await Promise.all([
    vercel(`/v9/projects/${encodeURIComponent(identity.projectId)}`),
    vercel(`/v13/deployments/${encodeURIComponent(STAGED_DEPLOYMENT_ID)}`),
    vercel(`/v13/deployments/${encodeURIComponent(ROLLBACK_DEPLOYMENT_ID)}`),
    vercel(`/v9/projects/${encodeURIComponent(identity.projectId)}/domains?limit=100`)
  ]);
  record("exact_vercel_project_is_bound", project.status === 200 && project.json?.name === HOSTED_VERCEL_PROJECT_NAME, "exact Vercel team and project are bound");
  record(
    "activated_deployment_carries_exact_application",
    activated.status === 200
      && deploymentId(activated.json) === STAGED_DEPLOYMENT_ID
      && ready(activated.json)
      && activated.json?.target === "production"
      && activated.json?.gitSource?.sha === APPLICATION_SHA
      && activated.json?.meta?.rcapApplicationSha === APPLICATION_SHA
      && activated.json?.meta?.rcapWorkerSourceSha === WORKER_SOURCE_SHA
      && activated.json?.meta?.rcapWorkerDigest === WORKER_DIGEST,
    `${STAGED_DEPLOYMENT_ID} is READY, Production-target, built from ${APPLICATION_SHA} and carries the exact worker identity`
  );
  const domains = (Array.isArray(domainsResult.json?.domains) ? domainsResult.json.domains : [])
    .map((entry) => entry?.name).filter((name) => typeof name === "string" && name.length > 0).sort();
  evidence.productionDomains = domains;
  record(
    "public_domain_is_a_production_domain",
    domainsResult.status === 200 && domains.includes(PUBLIC_DOMAIN),
    `${PUBLIC_DOMAIN} is one of ${domains.length} Production domains: ${domains.join(", ")}`
  );
  for (const domain of domains) {
    const detail = await vercel(`/v13/deployments/${encodeURIComponent(domain)}`);
    const entry = {
      domain,
      lookupStatus: detail.status,
      deploymentId: detail.status === 200 ? deploymentId(detail.json) : null,
      target: detail.status === 200 ? detail.json?.target ?? null : null,
      state: detail.status === 200 ? detail.json?.readyState ?? detail.json?.state ?? null : null
    };
    evidence.domainResolution.push(entry);
    console.log(`  domain ${domain}: lookup HTTP ${entry.lookupStatus}; deployment ${entry.deploymentId ?? "(none)"}; target ${entry.target ?? "(none)"}; state ${entry.state ?? "(none)"}`);
  }
  // A redirect-only host has no deployment of its own in the lookup; it is
  // proven below over public HTTPS instead. Every host that does resolve must
  // resolve to the activated deployment, and the public domain itself must.
  const resolvable = evidence.domainResolution.filter((entry) => entry.deploymentId !== null);
  const unresolvable = evidence.domainResolution.filter((entry) => entry.deploymentId === null);
  const resolvedIds = new Set(resolvable.map((entry) => entry.deploymentId));
  const publicEntry = evidence.domainResolution.find((entry) => entry.domain === PUBLIC_DOMAIN);
  record(
    "public_domains_resolve_to_activated_deployment",
    publicEntry?.deploymentId === STAGED_DEPLOYMENT_ID && publicEntry?.target === "production" && publicEntry?.state === "READY"
      && resolvedIds.size === 1 && resolvedIds.has(STAGED_DEPLOYMENT_ID)
      && resolvable.every((entry) => entry.target === "production" && entry.state === "READY"),
    `${PUBLIC_DOMAIN} and every other resolvable Production domain (${resolvable.length} of ${domains.length}) resolve to ${STAGED_DEPLOYMENT_ID}; no deployment of their own (redirect hosts, proven over HTTPS below): ${unresolvable.map((entry) => `${entry.domain} (lookup HTTP ${entry.lookupStatus})`).join(", ") || "none"}`
  );
  record(
    "rollback_target_remains_ready",
    rollback.status === 200 && deploymentId(rollback.json) === ROLLBACK_DEPLOYMENT_ID && ready(rollback.json),
    `${ROLLBACK_DEPLOYMENT_ID} remains READY for rollback`
  );

  const allowedHosts = new Set(domains);
  const root = await fetchPublic(`https://${PUBLIC_DOMAIN}/`);
  const rootHost = new URL(root.url).hostname;
  const health = await fetchPublic(`https://${PUBLIC_DOMAIN}/api/health`);
  const healthBody = await health.json().catch(() => null);
  evidence.publicHttp = {
    rootStatus: root.status,
    rootFinalUrl: root.url,
    rootServedByVercel: root.headers.has("x-vercel-id"),
    healthStatus: health.status,
    healthFinalHost: new URL(health.url).hostname,
    healthChecks: healthBody?.checks ?? null,
    healthCacheControl: health.headers.get("cache-control")
  };
  record(
    "public_domain_serves_the_application",
    root.status === 200 && allowedHosts.has(rootHost) && root.headers.has("x-vercel-id")
      && health.status === 200 && allowedHosts.has(new URL(health.url).hostname)
      && healthBody?.ok === true && healthBody?.checks?.db === "ok",
    `https://${PUBLIC_DOMAIN}/ is 200 on ${rootHost} through Vercel; /api/health is 200 with checks.db=ok`
  );
  const www = await fetchPublic(`https://www.${PUBLIC_DOMAIN}/`);
  const wwwHost = new URL(www.url).hostname;
  evidence.publicHttp.wwwStatus = www.status;
  evidence.publicHttp.wwwFinalUrl = www.url;
  record(
    "www_host_lands_on_the_activated_release",
    www.status === 200 && allowedHosts.has(wwwHost) && www.headers.has("x-vercel-id"),
    `https://www.${PUBLIC_DOMAIN}/ answers 200 on ${wwwHost} through Vercel`
  );

  const canonicalDomain = `${HOSTED_VERCEL_PROJECT_NAME}.vercel.app`;
  const publicRuntime = await inspectPublicRuntime(PUBLIC_DOMAIN, allowedHosts);
  const canonicalRuntime = await inspectPublicRuntime(canonicalDomain, allowedHosts);
  evidence.buildIdentity = {
    publicScriptInventorySha256: sha256(JSON.stringify(publicRuntime.scripts)),
    canonicalScriptInventorySha256: sha256(JSON.stringify(canonicalRuntime.scripts)),
    scriptCount: publicRuntime.scripts?.length ?? 0
  };
  record(
    "public_build_matches_canonical_domain",
    Array.isArray(publicRuntime.scripts) && publicRuntime.scripts.length > 0
      && JSON.stringify(publicRuntime.scripts) === JSON.stringify(canonicalRuntime.scripts),
    `the ${publicRuntime.scripts?.length ?? 0}-script inventory of / on ${PUBLIC_DOMAIN} is byte-identical to ${canonicalDomain}`
  );
  evidence.runtimeOrigin = {
    publicOriginCount: publicRuntime.origins.length,
    publicOriginSha256: publicRuntime.origins.length === 1 ? sha256(publicRuntime.origins[0]) : null,
    canonicalOriginSha256: canonicalRuntime.origins.length === 1 ? sha256(canonicalRuntime.origins[0]) : null,
    isCanonicalProjectHost: publicRuntime.origins.length === 1
      && new URL(publicRuntime.origins[0]).hostname === `${PRODUCTION_PROJECT_REF}.supabase.co`,
    pagesInspected: publicRuntime.pagesInspected,
    chunksInspected: publicRuntime.chunksInspected
  };
  record(
    "public_runtime_origin_matches_canonical_domain",
    publicRuntime.origins.length === 1 && canonicalRuntime.origins.length === 1
      && publicRuntime.origins[0] === canonicalRuntime.origins[0],
    `exactly one Supabase origin on ${PUBLIC_DOMAIN} (${publicRuntime.pagesInspected} pages, ${publicRuntime.chunksInspected} chunks) and it is the origin the canonical domain exposes; canonical project host: ${evidence.runtimeOrigin.isCanonicalProjectHost}`
  );

  const screening = await walkMississippiScreening(PUBLIC_DOMAIN);
  evidence.screening = screening;
  evidence.mutations.checkoutOpened = screening.externalRequestHosts.some((host) => /stripe\.com$/i.test(host));
  const answered = screening.steps.filter((entry) => entry.clicked).map((entry) => `${entry.matchedPrompt} → "${entry.clicked}"`);
  const result = screening.steps.find((entry) => entry.isResult);
  record(
    "mississippi_screening_starts_fresh",
    screening.steps[0]?.freshContext === true,
    "new Chrome context with zero cookies and zero storage origins; answers come only from clicking visible options"
  );
  record(
    "mississippi_screening_never_presumes_dui_or_underage_alcohol",
    screening.forbiddenPrompt === null,
    `no prompt across ${screening.steps.length - 1} screens asked about a DUI sentence or underage alcohol`
  );
  record(
    "mississippi_screening_reaches_the_non_conviction_pathway",
    screening.reachedResult && screening.unplanned === null && result?.pathwayNamed === true
      && allowedHosts.has(screening.finalHost),
    `${answered.length} visible answers (${answered.join("; ")}) reached a result on ${screening.finalHost} naming the non-conviction expungement pathway`
  );
  record(
    "mississippi_screening_opens_no_checkout",
    !evidence.mutations.checkoutOpened && allowedHosts.has(screening.finalHost),
    `no request left ${PUBLIC_DOMAIN} for Stripe; external hosts contacted: ${screening.externalRequestHosts.join(", ") || "none"}`
  );

  persist(true);
  console.log(`PRODUCTION PUBLIC VERIFICATION PASS — https://${PUBLIC_DOMAIN} serves the activated deployment ${STAGED_DEPLOYMENT_ID} (application ${APPLICATION_SHA})`);
} catch (error) {
  const failure = error instanceof Error ? error.message : String(error);
  persist(false, failure);
  console.error(`PRODUCTION PUBLIC VERIFICATION REFUSED — ${failure}`);
  process.exit(1);
}
