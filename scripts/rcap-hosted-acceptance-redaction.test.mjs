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

test("deployment failure paths redact before log or evidence persistence", () => {
  const source = fs.readFileSync(
    path.join(ROOT, "scripts/rcap-hosted-acceptance-deploy.mjs"),
    "utf8"
  );
  assert.match(source, /rcap-hosted-acceptance-redaction\.mjs/);
  assert.match(source, /tail: redact\(combined\)/);
  assert.match(source, /DEPLOY FAILED[^\n]+redact\(combined\)/);
  assert.match(source, /HOSTED_STRIPE_TEST_WEBHOOK_SECRET/);
});
