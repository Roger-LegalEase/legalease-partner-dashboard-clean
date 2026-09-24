#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("deployment output redaction removes exact held secrets and secret-shaped values", async () => {
  const { redactHostedAcceptanceOutput } = await import(
    `${new URL("./rcap-hosted-acceptance-redaction.mjs", import.meta.url).href}?${Date.now()}`
  );
  const held = [
    "vercel-token-that-is-not-shape-matched",
    "supabase-access-token-that-is-not-shape-matched",
    "whsec_short-but-held"
  ];
  const shapedWebhook = "whsec_0123456789abcdefghijklmnopqrstuvwxyz";
  const shapedStripe = "sk_test_0123456789abcdefghijklmnopqrstuvwxyz";
  const output = redactHostedAcceptanceOutput(
    `argv ${held.join(" ")} ${shapedWebhook} ${shapedStripe}`,
    held
  );

  for (const secret of [...held, shapedWebhook, shapedStripe]) {
    assert.equal(output.includes(secret), false, `redacted output leaked ${secret}`);
  }
  assert.match(output, /\*\*\*REDACTED\*\*\*/);
});

// The module is NOT orphaned: rcap-hosted-vercel-diagnostics.mjs imports
// redactHostedAcceptanceOutput, and the REST transport routes every receipt
// through sanitizeVercelDiagnostic. What moved is the call site, not the
// control — the CLI's combined stdout/stderr tail no longer exists, so the
// assertions about `redact(combined)` described a failure path that is gone.
// This proves the live REST path by running it, rather than by reading it.
test("the REST failure path redacts before any receipt is emitted", async () => {
  const transport = await import(
    `${new URL("./rcap-hosted-vercel-rest-transport.mjs", import.meta.url).href}?${Date.now()}`
  );
  const identity = await import(
    `${new URL("./rcap-hosted-acceptance-vercel-identity.mjs", import.meta.url).href}?${Date.now()}`
  );

  const token = "vercel-token-held-for-this-run";
  const stripeSecret = "sk_test_0123456789abcdefghijklmnopqrstuvwxyz";
  const webhookSecret = "whsec_0123456789abcdefghijklmnopqrstuvwxyz";
  const serviceKey = "service-role-key-held-for-this-run";
  const held = [token, stripeSecret, webhookSecret, serviceKey];

  const sha = transport.FROZEN_APPLICATION_SHA;
  const supabaseUrl = "https://hyflxnlhpmiqxvvcoiia.supabase.co";
  const runtimeEnv = {
    SUPABASE_URL: supabaseUrl,
    NEXT_PUBLIC_SUPABASE_URL: supabaseUrl,
    STRIPE_SECRET_KEY: stripeSecret,
    STRIPE_WEBHOOK_SECRET: webhookSecret,
    SUPABASE_SERVICE_ROLE_KEY: serviceKey
  };
  const buildEnv = { NEXT_PUBLIC_SUPABASE_URL: supabaseUrl };
  const meta = {
    ...transport.FROZEN_WORKER_METADATA,
    rcapApplicationSha: sha,
    rcapAcceptanceProjectRef: "hyflxnlhpmiqxvvcoiia",
    rcapReturnOrigin: identity.expectedHostedReturnOrigin(sha),
    rcapStripeConfigured: "true",
    rcapRouteState: "acceptance",
    rcapClinicDemoMode: "none",
    rcapStagingScopeSha256: "0".repeat(64)
  };

  // A hostile API failure body: it echoes the request, names the bearer token,
  // and carries the acceptance secrets back in several shapes.
  const failureBody = {
    error: {
      code: "forbidden",
      message: `rejected request with Authorization: Bearer ${token}`,
      requestBody: { env: runtimeEnv, build: { env: buildEnv } }
    },
    token,
    accessToken: token,
    diagnostics: [`stripe=${stripeSecret}`, `webhook=${webhookSecret}`, `service=${serviceKey}`]
  };

  const receipts = [];
  await assert.rejects(
    transport.createRestPreview(
      { token, identity: { teamId: identity.HOSTED_VERCEL_TEAM_ID, projectId: identity.HOSTED_VERCEL_PROJECT_ID, projectName: identity.HOSTED_VERCEL_PROJECT_NAME },
        applicationSha: sha, runtimeEnv, buildEnv, meta },
      { fetchImpl: async () => ({ ok: false, status: 403, json: async () => failureBody }),
        onState: r => receipts.push(structuredClone(r)),
        onCreated: r => receipts.push(structuredClone(r)) }
    ),
    /REST_CREATE_HTTP_403/
  );

  // The failure body reached a receipt at all — otherwise this proves nothing.
  assert.ok(receipts.length >= 3, "the failure path must emit receipts");
  const serialized = JSON.stringify(receipts);
  assert.match(serialized, /"creationHttpStatus":403/);
  assert.match(serialized, /forbidden/, "the sanitized diagnostic must still be useful");
  for (const secret of held) {
    assert.equal(serialized.includes(secret), false, `an emitted receipt leaked ${secret}`);
  }
  const bearers = [...serialized.matchAll(/Bearer (\S+?)(?=[",\\]|$)/g)].map(m => m[1]);
  assert.ok(bearers.length >= 1, "the hostile body's Authorization header must reach a receipt");
  for (const value of bearers) assert.equal(value, "[REDACTED]");

  // Negative control: the same body, unsanitized, does leak — so the assertions
  // above are measuring redaction and not an accident of the fixture.
  const raw = JSON.stringify(failureBody);
  for (const secret of held) assert.ok(raw.includes(secret));
});

test("the live redaction call sites are the diagnostics and transport modules", () => {
  const diagnostics = fs.readFileSync(path.join(ROOT, "scripts/rcap-hosted-vercel-diagnostics.mjs"), "utf8");
  const transport = fs.readFileSync(path.join(ROOT, "scripts/rcap-hosted-vercel-rest-transport.mjs"), "utf8");
  const deploy = fs.readFileSync(path.join(ROOT, "scripts/rcap-hosted-acceptance-deploy.mjs"), "utf8");

  assert.match(diagnostics, /import \{redactHostedAcceptanceOutput\} from '\.\/rcap-hosted-acceptance-redaction\.mjs'/);
  assert.match(transport, /import \{sanitizeVercelDiagnostic\} from '\.\/rcap-hosted-vercel-diagnostics\.mjs'/);

  // Every receipt the transport emits is sanitized first: the only assignment
  // to `receipt` after construction runs through sanitizeVercelDiagnostic.
  assert.match(transport, /receipt=\{\.\.\.receipt,\.\.\.sanitizeVercelDiagnostic\(d,secrets\)/);
  assert.match(transport, /const secrets=\[options\.token,[\s\S]*?KEY\|SECRET\|PASSWORD\|TOKEN/);
  assert.equal((transport.match(/onState\(receipt\)/g) ?? []).length, 2);
  assert.doesNotMatch(transport, /onState\((?!receipt\))/);

  // The CLI failure tail is gone from the deploy path, not merely unasserted.
  assert.doesNotMatch(deploy, /redact\(combined\)|spawn\("npx"|vercel@latest/);
  assert.match(deploy, /HOSTED_STRIPE_TEST_WEBHOOK_SECRET/);
});
