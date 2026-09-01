#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { register } from "node:module";

register("./lib/ts-esm-loader.mjs", import.meta.url);

process.env.NEXT_PUBLIC_EXPUNGEMENT_AI_URL = "https://expungement.ai";
process.env.NEXT_PUBLIC_PARTNER_APP_URL = "https://legaleasepartner.com";

const {
  consumerAuthCallbackPath,
  consumerAuthContinuationFrom,
  consumerForgotPasswordPath,
  consumerSignInRecoveryPath
} = await import("../src/lib/expungement-ai/auth-continuation.ts");
const { isRetryableClaimStatus } = await import("../src/lib/expungement-ai/claim/claim-handoff.ts");
const { isExactMatterPath } = await import("../src/lib/expungement-ai/claim/matter-path.ts");
const { passwordResetRedirectUrl } = await import("../src/lib/app-url.ts");

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const token = "aD9_wH2nR7pL4xQ8mK5vC1sF6jT3bY0uE9iO2zX7qW4";
const matterId = "2ce8d69f-5b69-4fbb-b63a-d85e39c47270";

const initial = consumerAuthContinuationFrom(new URLSearchParams({
  claim: token,
  next: `/briefcase/matters/${matterId}?section=review`,
  locale: "es",
  partner: "browser-controlled-partner",
  event: "browser-controlled-event",
  program: "browser-controlled-program"
}));
assert.equal(initial.claimToken, token, "valid opaque claim must be accepted");
assert.equal(initial.locale, "es", "supported locale must be accepted");
assert.equal(initial.nextPath, `/briefcase/matters/${matterId}?section=review`, "safe same-app next must be accepted");
assert.deepEqual(Object.keys(initial).sort(), ["claimToken", "locale", "nextPath"], "browser continuation must carry no attribution authority");

const forgot = new URL(consumerForgotPasswordPath(initial), "https://expungement.ai");
assert.equal(forgot.pathname, "/auth/forgot-password");
assert.equal(forgot.searchParams.get("claim"), token, "Forgot Password must preserve the claim");
assert.equal(forgot.searchParams.get("locale"), "es", "Forgot Password must preserve locale");
assert.equal(forgot.searchParams.get("next"), initial.nextPath, "Forgot Password must preserve safe next");
assert.equal(forgot.searchParams.get("product"), "expungement");
assert.equal(forgot.searchParams.get("partner"), null, "attribution must not move into the URL");

const reset = new URL(passwordResetRedirectUrl({
  product: "expungement",
  hostname: "legaleasepartner.com",
  continuation: initial
}));
assert.equal(reset.origin, "https://expungement.ai");
assert.equal(reset.pathname, "/auth/set-password");
assert.equal(reset.searchParams.get("claim"), token, "password reset redirect must preserve the claim");
assert.equal(reset.searchParams.get("locale"), "es", "password reset redirect must preserve locale");
assert.equal(reset.searchParams.get("next"), initial.nextPath);
assert.equal(reset.searchParams.get("recovery"), "1", "password reset callback must stay in recovery mode through URL scrubbing and refresh");

const callback = new URL(consumerAuthCallbackPath(initial), "https://expungement.ai");
assert.equal(callback.searchParams.get("claim"), token, "set-password callback must preserve the exact claim");

const external = consumerAuthContinuationFrom(new URLSearchParams({
  claim: token,
  next: "https://attacker.example/steal",
  locale: "es"
}));
assert.equal(external.nextPath, "/briefcase", "external next URL must fail closed");
assert.ok(!consumerAuthCallbackPath(external).includes("attacker.example"));

for (const malformed of ["", "short", `${token}!`, "with spaces and definitely not an opaque token"]) {
  const parsed = consumerAuthContinuationFrom(new URLSearchParams({ claim: malformed, locale: "xx" }));
  assert.equal(parsed.claimToken, "", `malformed claim must be omitted: ${JSON.stringify(malformed)}`);
  assert.equal(parsed.locale, null, "unsupported locale must be omitted");
  assert.equal(new URL(consumerForgotPasswordPath(parsed), "https://expungement.ai").searchParams.get("claim"), null);
}

assert.equal(isRetryableClaimStatus(0), true, "network failure retains the claim for recovery");
assert.equal(isRetryableClaimStatus(401), true, "authentication interruption retains the claim");
assert.equal(isRetryableClaimStatus(403), true, "verification interruption retains the claim");
assert.equal(isRetryableClaimStatus(409), true, "recoverable verification conflict retains the claim");
assert.equal(isRetryableClaimStatus(503), true, "server failure retains the claim");
assert.equal(isRetryableClaimStatus(404), false, "definitive denial does not keep a rejected token in the URL");
assert.equal(new URL(consumerSignInRecoveryPath(initial, true), "https://expungement.ai").searchParams.get("claim"), token);
assert.equal(new URL(consumerSignInRecoveryPath(initial, false), "https://expungement.ai").searchParams.get("claim"), null);
assert.equal(isExactMatterPath(`/briefcase/matters/${matterId}`), true);
assert.equal(isExactMatterPath("/briefcase"), false);
assert.equal(isExactMatterPath("https://attacker.example/briefcase"), false);

const signInSource = read("src/components/expungement-ai/ConsumerSignInForm.tsx");
const forgotSource = read("src/app/auth/forgot-password/page.tsx");
const setPasswordSource = read("src/app/auth/set-password/page.tsx");
const claimServiceSource = read("src/lib/expungement-ai/claim/claim-service.ts");
assert.ok(signInSource.includes("consumerForgotPasswordPath"), "sign-in must use the shared continuation for Forgot Password");
assert.ok(forgotSource.includes("continuation: consumerAuthContinuationFrom(params)"), "reset request must use the shared continuation");
assert.ok(setPasswordSource.includes("consumerSignInRecoveryPath"), "callback failure must use the shared recovery path");
assert.ok(
  setPasswordSource.indexOf("await supabase.auth.updateUser({ password })")
    < setPasswordSource.indexOf("redirectPath = await claimExpungementPending(nextPath)"),
  "password recovery must set the password before claiming the pending result"
);
for (const binding of ["partnerSlug: row.partner_slug", "programId: row.program_id", "eventId: row.event_id", "campaignName: row.campaign_name", "locale: row.locale"]) {
  assert.ok(claimServiceSource.includes(binding), `server claim must preserve protected pending attribution: ${binding}`);
}
assert.ok(claimServiceSource.includes("redirectTo: exactMatterPath(matterId)"), "claim success must return the exact matter");

for (const source of [signInSource, forgotSource, setPasswordSource, read("src/lib/expungement-ai/auth-continuation.ts")]) {
  const code = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  assert.ok(!/\b(?:local|session)Storage\s*(?:\.|\[)/.test(code), "claim continuation must not use browser storage");
  assert.ok(!/console\.(?:log|info|warn|error)/.test(code), "claim continuation must not enter logs");
}

assert.ok(!/signInWithOAuth|signInWithOtp/.test(signInSource), "focused acceptance must not assert OAuth or magic-link modes the product does not expose");

console.log("Expungement.ai password-recovery claim continuation verified: exact claim, safe next, locale, server attribution, retry, and exact-matter redirect.");
console.log("OAuth/magic-link disposition: not exposed by the consumer sign-in surface; no fictional continuation asserted.");
