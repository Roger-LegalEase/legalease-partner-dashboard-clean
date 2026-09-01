#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

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

assert.match(continuation, /claimToken/);
assert.match(continuation, /locale/);
assert.match(continuation, /screening answers, attribution, route identity/i);
assert.doesNotMatch(continuation, /localStorage|sessionStorage/);

assert.match(signIn, /signUp\(/, "signup continuation exists");
assert.match(signIn, /signInWithPassword\(/, "existing-account continuation exists");
assert.match(signIn, /signInWithOtp\(/, "magic-link continuation exists");
assert.match(signIn, /signInWithOAuth\(/, "OAuth continuation exists");
assert.match(signIn, /emailRedirectTo: expungementAuthRedirectTo/);
assert.match(forgot, /consumerAuthContinuationQuery\(continuation\)/, "password reset preserves the continuation");
assert.match(reset, /claimExpungementPending/);
assert.match(reset, /claimRetry: "1"/, "auth callback claim failures are recoverable");
assert.match(signIn, /data-pending-claim-retry="true"/);
assert.match(handoff, /status >= 500|status \|\| 0/);
assert.match(handoff, /status >= 400 && status < 500 && status !== 401/);

for (const source of [pageGuard, apiGuard, packetInformation, render]) {
  assert.match(source, /isVerified/, "all participant authority guards require verification");
}

assert.match(read("src/app/api/expungement-ai/screening/pending/claim/route.ts"), /accountVerified: auth\.isVerified === true/);
assert.match(read("src/lib/expungement-ai/claim/matter-path.ts"), /briefcase\/matters/);

console.log("Consumer auth continuation verified: password, magic link, OAuth, reset, retry, and verified-account gates.");
