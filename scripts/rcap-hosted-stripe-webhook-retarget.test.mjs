#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const implementationPath = path.join(root, "scripts/rcap-hosted-stripe-webhook-retarget.mjs");

assert.ok(
  fs.existsSync(implementationPath),
  "the credential-safe Stripe webhook retarget implementation must exist"
);

const {
  EXPECTED_EVENTS,
  assessWebhookEndpoint,
  buildRequiredWebhookUrl,
  endpointShape
} = await import(pathToFileURL(implementationPath));

const endpointId = "we_1U4AKGRWROAHlAKyNFChAnWr";
const bypass = "test-bypass-value";
const requiredUrl = buildRequiredWebhookUrl({
  hostname: "legalease-rcap-441ee3188ee5-roger947s-projects.vercel.app",
  bypass
});

function endpoint(overrides = {}) {
  return {
    id: endpointId,
    url: "https://smithsonian-supervisors-envelope-handling.trycloudflare.com/api/stripe/webhook",
    status: "enabled",
    livemode: false,
    enabled_events: [...EXPECTED_EVENTS],
    ...overrides
  };
}

test("builds the exact Preview webhook URL with one protection-bypass parameter", () => {
  const parsed = new URL(requiredUrl);
  assert.equal(parsed.origin, "https://legalease-rcap-441ee3188ee5-roger947s-projects.vercel.app");
  assert.equal(parsed.pathname, "/api/stripe/webhook");
  assert.deepEqual([...parsed.searchParams.keys()], ["x-vercel-protection-bypass"]);
  assert.equal(parsed.searchParams.get("x-vercel-protection-bypass"), bypass);
});

test("allows one URL-only update when endpoint identity, mode, status, path, and events are exact", () => {
  assert.deepEqual(
    assessWebhookEndpoint({ endpoint: endpoint(), endpointId, requiredUrl }),
    { safe: true, needsUpdate: true, failures: [] }
  );
});

test("reports readback-only when the endpoint already has the exact protected Preview URL", () => {
  assert.deepEqual(
    assessWebhookEndpoint({ endpoint: endpoint({ url: requiredUrl }), endpointId, requiredUrl }),
    { safe: true, needsUpdate: false, failures: [] }
  );
});

test("refuses live mode, endpoint substitution, disabled status, event drift, and a noncanonical path", () => {
  const assessment = assessWebhookEndpoint({
    endpoint: endpoint({
      id: "we_substituted",
      url: "https://example.test/not-the-webhook",
      status: "disabled",
      livemode: true,
      enabled_events: ["checkout.session.completed"]
    }),
    endpointId,
    requiredUrl
  });
  assert.equal(assessment.safe, false);
  assert.equal(assessment.needsUpdate, false);
  assert.deepEqual(assessment.failures, [
    "endpoint identity mismatch",
    "endpoint is not enabled",
    "endpoint is not sandbox-only",
    "enabled-event set drift",
    "existing endpoint path is not canonical"
  ]);
});

test("safe evidence shapes retain no query values", () => {
  assert.deepEqual(endpointShape(requiredUrl), {
    host: "legalease-rcap-441ee3188ee5-roger947s-projects.vercel.app",
    pathname: "/api/stripe/webhook",
    queryParameterNames: ["x-vercel-protection-bypass"]
  });
});

test("release workflows expose one isolated retarget phase", () => {
  const entry = fs.readFileSync(path.join(root, ".github/workflows/rcap-f1-ephemeral-staging.yml"), "utf8");
  const hosted = fs.readFileSync(path.join(root, ".github/workflows/rcap-hosted-acceptance-staging.yml"), "utf8");
  assert.match(entry, /hosted_stripe_retarget/);
  assert.match(entry, /hosted_stripe_retarget' && 'stripe_retarget'/);
  assert.match(hosted, /stripe_retarget\)\s*DEPLOY=false;\s*MATRIX=false;\s*GATE=false;\s*RETARGET=true/);
  assert.match(hosted, /node scripts\/rcap-hosted-stripe-webhook-retarget\.mjs/);
  assert.match(hosted, /steps\.contract\.outputs\.retarget == 'true'/);
});
