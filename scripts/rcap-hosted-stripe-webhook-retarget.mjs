#!/usr/bin/env node

// Release-control-only mutation for the hosted acceptance lane.
//
// It updates the URL of one already-existing Stripe sandbox webhook endpoint.
// It never creates or deletes an endpoint, never writes enabled_events, never
// reads or rotates the signing secret, and refuses unless the exact READY
// Vercel Preview identity and the existing endpoint contract both match.

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { prepareHostedAcceptanceEvidenceLayout } from "./rcap-hosted-acceptance-evidence-layout.mjs";
import {
  expectedHostedReturnOrigin,
  hostedVercelScopedUrl,
  resolveHostedVercelIdentity
} from "./rcap-hosted-acceptance-vercel-identity.mjs";

export const EXPECTED_EVENTS = Object.freeze([
  "checkout.session.async_payment_succeeded",
  "checkout.session.completed",
  "invoice.finalized",
  "invoice.paid",
  "invoice.payment_failed",
  "invoice.voided"
].sort());

const EXPECTED_APPLICATION_SHA = "441ee3188ee52047a012232d8d11f890a09b4ac5";
const EXPECTED_PROJECT_REF = "hyflxnlhpmiqxvvcoiia";
const EXPECTED_ENDPOINT_ID = "we_1U4AKGRWROAHlAKyNFChAnWr";

function sameStringSet(left, right) {
  return JSON.stringify([...(left ?? [])].sort()) === JSON.stringify([...(right ?? [])].sort());
}

export function buildRequiredWebhookUrl({ hostname, bypass }) {
  if (!/^[A-Za-z0-9.-]+\.vercel\.app$/.test(hostname ?? "")) {
    throw new Error("Preview hostname is not one exact *.vercel.app host");
  }
  if (!String(bypass ?? "").trim()) throw new Error("Vercel automation bypass secret is required");
  const url = new URL(`https://${hostname}/api/stripe/webhook`);
  url.searchParams.set("x-vercel-protection-bypass", String(bypass).trim());
  return url.toString();
}

export function endpointShape(value) {
  const url = new URL(value);
  return {
    host: url.host,
    pathname: url.pathname,
    queryParameterNames: [...new Set([...url.searchParams.keys()])].sort()
  };
}

export function assessWebhookEndpoint({ endpoint, endpointId, requiredUrl }) {
  const failures = [];
  if (endpoint?.id !== endpointId) failures.push("endpoint identity mismatch");
  if (endpoint?.status !== "enabled") failures.push("endpoint is not enabled");
  if (endpoint?.livemode !== false) failures.push("endpoint is not sandbox-only");
  if (!sameStringSet(endpoint?.enabled_events, EXPECTED_EVENTS)) failures.push("enabled-event set drift");
  let canonicalPath = false;
  try { canonicalPath = new URL(endpoint?.url ?? "").pathname === "/api/stripe/webhook"; } catch { /* failure below */ }
  if (!canonicalPath) failures.push("existing endpoint path is not canonical");
  return {
    safe: failures.length === 0,
    needsUpdate: failures.length === 0 && endpoint.url !== requiredUrl,
    failures
  };
}

function sanitizeFactory(secrets) {
  return (value) => {
    let text = String(value ?? "");
    for (const secret of secrets.filter(Boolean)) text = text.split(secret).join("***REDACTED***");
    return text
      .replace(/(x-vercel-protection-bypass=)[^&\s"']+/gi, "$1***REDACTED***")
      .replace(/(?:sk|rk)_(?:test|live)_[A-Za-z0-9_]+/g, "***REDACTED***");
  };
}

async function main() {
  const applicationSha = process.env.HOSTED_APPLICATION_SHA ?? "";
  const projectRef = process.env.ACCEPTANCE_SUPABASE_PROJECT_REF ?? "";
  const deploymentId = process.env.HOSTED_PREVIEW_DEPLOYMENT_ID ?? "";
  const previewHostname = process.env.HOSTED_PREVIEW_HOSTNAME ?? "";
  const stripeKey = process.env.HOSTED_STRIPE_TEST_SECRET ?? "";
  const vercelToken = process.env.VERCEL_TOKEN ?? "";
  const bypass = (process.env.VERCEL_AUTOMATION_BYPASS_SECRET ?? "").trim();
  const sanitize = sanitizeFactory([stripeKey, vercelToken, bypass]);
  const { root: evidenceDir } = prepareHostedAcceptanceEvidenceLayout({ rootDir: process.cwd() });
  const evidencePath = path.join(evidenceDir, "stripe-webhook-retarget.json");
  const evidence = {
    schemaVersion: "rcap-hosted-stripe-webhook-retarget/v1",
    applicationSha,
    acceptanceProjectRef: projectRef,
    previewDeploymentId: deploymentId,
    previewHostname,
    endpointId: EXPECTED_ENDPOINT_ID,
    stripeMode: "sandbox",
    endpointCreated: false,
    endpointDeleted: false,
    enabledEventsWritten: false,
    signingSecretReadOrWritten: false,
    productionTouched: false,
    passed: false
  };
  const writeEvidence = () => fs.writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`);

  try {
    if (applicationSha !== EXPECTED_APPLICATION_SHA) throw new Error("application SHA is not the frozen replacement candidate");
    if (projectRef !== EXPECTED_PROJECT_REF) throw new Error("project ref is not the acceptance project");
    if (!/^dpl_[A-Za-z0-9]+$/.test(deploymentId)) throw new Error("deployment id is not one exact Vercel deployment id");
    const expectedReturnOrigin = expectedHostedReturnOrigin(applicationSha);
    const expectedPreviewHostname = new URL(expectedReturnOrigin).host;
    if (previewHostname !== expectedPreviewHostname) throw new Error("hostname is not the deterministic SHA-scoped acceptance Preview");
    if (!stripeKey || !vercelToken || !bypass) throw new Error("required nonproduction credentials are unavailable");

    const vercelIdentity = await resolveHostedVercelIdentity({ token: vercelToken });
    const deploymentResponse = await fetch(
      hostedVercelScopedUrl(`/v13/deployments/${encodeURIComponent(deploymentId)}`, vercelIdentity),
      { headers: { Authorization: `Bearer ${vercelToken}` } }
    );
    const deployment = await deploymentResponse.json().catch(() => null);
    const aliasResponse = await fetch(
      hostedVercelScopedUrl(`/v13/deployments/${encodeURIComponent(expectedPreviewHostname)}`, vercelIdentity),
      { headers: { Authorization: `Bearer ${vercelToken}` } }
    );
    const aliasDeployment = await aliasResponse.json().catch(() => null);
    const aliasDeploymentId = aliasDeployment?.id ?? aliasDeployment?.uid ?? null;
    const deploymentReady = deploymentResponse.ok
      && deployment?.id === deploymentId
      && deployment?.readyState === "READY"
      && (deployment?.target === null || deployment?.target === "preview")
      && deployment?.meta?.rcapApplicationSha === applicationSha
      && deployment?.meta?.rcapAcceptanceProjectRef === projectRef
      && deployment?.meta?.rcapRouteState === "staging_scoped"
      && deployment?.meta?.rcapReturnOrigin === expectedReturnOrigin
      && aliasResponse.ok
      && aliasDeploymentId === deploymentId;
    if (!deploymentReady) throw new Error("Vercel deployment identity is not the exact READY staging-scoped Preview");
    evidence.deployment = {
      id: deployment.id,
      hostname: previewHostname,
      immutableHostname: deployment.url,
      readyState: deployment.readyState,
      target: deployment.target ?? null,
      applicationSha: deployment.meta.rcapApplicationSha,
      routeState: deployment.meta.rcapRouteState
    };

    async function stripe(pathname, { method = "GET", body = null } = {}) {
      const response = await fetch(`https://api.stripe.com${pathname}`, {
        method,
        headers: {
          Authorization: `Bearer ${stripeKey}`,
          ...(body === null ? {} : { "Content-Type": "application/x-www-form-urlencoded" })
        },
        body
      });
      const json = await response.json().catch(() => null);
      if (!response.ok) throw new Error(`Stripe ${method} ${pathname} returned HTTP ${response.status}`);
      return json;
    }

    const listed = await stripe("/v1/webhook_endpoints?limit=100");
    if (listed?.has_more) throw new Error("Stripe endpoint list requires pagination; refusing an incomplete uniqueness proof");
    const canonical = (listed?.data ?? []).filter((endpoint) => {
      try { return new URL(endpoint.url).pathname === "/api/stripe/webhook"; } catch { return false; }
    });
    if (canonical.length !== 1 || canonical[0]?.id !== EXPECTED_ENDPOINT_ID) {
      throw new Error("the one canonical sandbox webhook endpoint identity changed");
    }

    const requiredUrl = buildRequiredWebhookUrl({ hostname: previewHostname, bypass });
    const before = canonical[0];
    const beforeAssessment = assessWebhookEndpoint({
      endpoint: before,
      endpointId: EXPECTED_ENDPOINT_ID,
      requiredUrl
    });
    if (!beforeAssessment.safe) throw new Error(`endpoint precondition failed: ${beforeAssessment.failures.join(", ")}`);
    evidence.before = {
      url: endpointShape(before.url),
      status: before.status,
      livemode: before.livemode,
      enabledEvents: [...before.enabled_events].sort()
    };

    if (beforeAssessment.needsUpdate) {
      const body = new URLSearchParams({ url: requiredUrl });
      await stripe(`/v1/webhook_endpoints/${encodeURIComponent(EXPECTED_ENDPOINT_ID)}`, {
        method: "POST",
        body
      });
      evidence.action = "updated_existing_endpoint_url_only";
    } else {
      evidence.action = "readback_only_already_exact";
    }

    const after = await stripe(`/v1/webhook_endpoints/${encodeURIComponent(EXPECTED_ENDPOINT_ID)}`);
    const afterAssessment = assessWebhookEndpoint({
      endpoint: after,
      endpointId: EXPECTED_ENDPOINT_ID,
      requiredUrl
    });
    if (!afterAssessment.safe || afterAssessment.needsUpdate) {
      throw new Error(`endpoint readback failed: ${afterAssessment.failures.join(", ") || "URL not exact"}`);
    }
    evidence.after = {
      url: endpointShape(after.url),
      status: after.status,
      livemode: after.livemode,
      enabledEvents: [...after.enabled_events].sort()
    };
    evidence.enabledEventSetPreserved = sameStringSet(before.enabled_events, after.enabled_events)
      && sameStringSet(after.enabled_events, EXPECTED_EVENTS);
    if (!evidence.enabledEventSetPreserved) throw new Error("enabled-event set changed during URL-only update");
    evidence.passed = true;
    writeEvidence();
    console.log("STRIPE SANDBOX WEBHOOK RETARGET PASSED");
    console.log(`  endpoint: ${EXPECTED_ENDPOINT_ID}`);
    console.log(`  action: ${evidence.action}`);
    console.log(`  host: ${previewHostname}`);
    console.log("  signing secret untouched; six-event set preserved; Production untouched");
  } catch (error) {
    evidence.error = sanitize(error instanceof Error ? error.message : error);
    writeEvidence();
    console.error(`STRIPE SANDBOX WEBHOOK RETARGET FAILED — ${evidence.error}`);
    process.exitCode = 1;
  }
}

const directExecution = process.argv[1]
  && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (directExecution) await main();
