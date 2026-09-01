#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { register } from "node:module";

register("./lib/ts-esm-loader.mjs", import.meta.url);

const root = process.cwd();
const read = (path) => readFileSync(resolve(root, path), "utf8");

const signIn = read("src/components/expungement-ai/ConsumerSignInForm.tsx");
const continuation = read("src/lib/expungement-ai/auth-continuation.ts");
const forgot = read("src/app/auth/forgot-password/page.tsx");
const reset = read("src/app/auth/set-password/page.tsx");
const handoff = read("src/lib/expungement-ai/claim/claim-handoff.ts");
const pageGuard = read("src/lib/expungement-ai/auth.ts");
const apiGuard = read("src/lib/expungement-ai/privacy/api-session.ts");
const packetInformation = read("src/app/api/expungement-ai/briefcase/[itemId]/packet-information/route.ts");
const render = read("src/app/api/expungement-ai/packet/render/route.ts");

const {
  consumerAuthCallbackPath,
  consumerAuthContinuationFrom,
  consumerClaimRecoveryHandoffFrom,
  consumerForgotPasswordPath,
  consumerSignInRecoveryPath
} = await import("../src/lib/expungement-ai/auth-continuation.ts");
const { isRetryableClaimStatus } = await import("../src/lib/expungement-ai/claim/claim-handoff.ts");

const claimToken = "consumerAuthContinuationFixtureToken_1234567890";
const matterId = "11111111-1111-4111-8111-111111111111";
const parsed = consumerAuthContinuationFrom(new URLSearchParams({
  claim: claimToken,
  locale: "es",
  next: `/briefcase/matters/${matterId}`,
  partner: "browser-controlled-partner"
}));
assert.equal(parsed.claimToken, claimToken);
assert.equal(parsed.locale, "es");
assert.equal(parsed.nextPath, `/briefcase/matters/${matterId}`);
assert.deepEqual(Object.keys(parsed).sort(), ["claimToken", "locale", "nextPath"]);
assert.equal(new URL(consumerForgotPasswordPath(parsed), "https://expungement.ai").searchParams.get("claim"), claimToken);
assert.equal(new URL(consumerAuthCallbackPath(parsed), "https://expungement.ai").searchParams.get("claim"), claimToken);
const recovery = new URL(consumerSignInRecoveryPath(parsed, true), "https://expungement.ai");
assert.equal(consumerClaimRecoveryHandoffFrom(recovery.searchParams), "retry");
assert.equal(recovery.searchParams.get("locale"), "es");
assert.equal(isRetryableClaimStatus(409), true);
assert.equal(isRetryableClaimStatus(503), true);

assert.match(continuation, /claimToken/);
assert.match(continuation, /locale/);
assert.match(continuation, /answer, partner, program, event and campaign authority/i);
assert.doesNotMatch(continuation, /localStorage|sessionStorage/);

assert.match(signIn, /signUp\(/, "signup continuation exists");
assert.match(signIn, /signInWithPassword\(/, "existing-account continuation exists");
assert.match(signIn, /signInWithOtp\(/, "magic-link continuation exists");
assert.match(signIn, /signInWithOAuth\(/, "OAuth continuation exists");
assert.match(signIn, /emailRedirectTo: expungementAuthRedirectTo/);
assert.match(forgot, /continuation\s*\n\s*}\);/, "password reset preserves the validated continuation object");
assert.match(reset, /claimExpungementPending/);
assert.match(reset, /consumerSignInRecoveryPath/, "auth callback distinguishes retryable and definitive claim failures");
assert.match(signIn, /data-pending-claim-retry="true"/);
assert.match(handoff, /isRetryableClaimStatus/);
assert.match(signIn, /runConsumerClaimRecoveryOnce/, "post-reset retries are automatic and Strict-Mode safe");
assert.match(signIn, /consumerSignInAfterRecoveryPath/, "post-reset flags are consumed before retry");

for (const source of [pageGuard, apiGuard, packetInformation, render]) {
  assert.match(source, /isVerified/, "all participant authority guards require verification");
}

assert.match(read("src/app/api/expungement-ai/screening/pending/claim/route.ts"), /accountVerified: auth\.isVerified === true/);
assert.match(read("src/lib/expungement-ai/claim/matter-path.ts"), /briefcase\/matters/);

console.log("Consumer auth continuation verified: password, magic link, OAuth, reset, retry, and verified-account gates.");
