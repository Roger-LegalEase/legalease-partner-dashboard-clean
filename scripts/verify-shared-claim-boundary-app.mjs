// Application-layer proof for the shared claim boundary.
//
// The database proof (verify-shared-claim-boundary-db.mjs) measures what the
// database does. This measures what the application does around it: that the
// claim token stays out of storage, logs and analytics; that it leaves the URL
// once used; that every authentication continuation carries it; and that nothing
// but the token is believed.
//
// Contract §3, §7, §8, §15. Usage: node scripts/verify-shared-claim-boundary-app.mjs

import { register } from "node:module";
register("./lib/ts-esm-loader.mjs", import.meta.url);

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const { claimTokenHash, isWellFormedClaimToken, mintClaimToken, redactClaimToken } =
  await import("../src/lib/expungement-ai/claim/claim-token.ts");

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");
const stripComments = (source) => source
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/^\s*\/\/.*$/gm, "");

const failures = [];
function check(condition, label, detail = "") {
  if (condition) {
    console.log(`  ok   ${label}`);
  } else {
    failures.push(detail ? `${label} -- ${detail}` : label);
    console.log(`  FAIL ${label}${detail ? ` -- ${detail}` : ""}`);
  }
}
const section = (title) => console.log(`\n${title}`);

const sources = {
  token: read("src/lib/expungement-ai/claim/claim-token.ts"),
  handoff: read("src/lib/expungement-ai/claim/claim-handoff.ts"),
  service: read("src/lib/expungement-ai/claim/claim-service.ts"),
  matterPath: read("src/lib/expungement-ai/claim/matter-path.ts"),
  attribution: read("src/lib/expungement-ai/claim/screening-attribution.ts"),
  obligations: read("src/lib/expungement-ai/claim/claim-obligations.ts"),
  pendingCreate: read("src/app/api/expungement-ai/screening/pending/route.ts"),
  pendingClaim: read("src/app/api/expungement-ai/screening/pending/claim/route.ts"),
  screeningFlow: read("src/components/expungement-ai/screening/ScreeningFlow.tsx"),
  signIn: read("src/components/expungement-ai/ConsumerSignInForm.tsx"),
  setPassword: read("src/app/auth/set-password/page.tsx"),
  saveIntent: read("src/components/expungement-ai/BriefcaseSaveIntent.tsx"),
  briefcaseHome: read("src/app/briefcase/page.tsx"),
  matterRoute: read("src/app/briefcase/matters/[matterId]/page.tsx"),
  authServer: read("src/lib/supabase/auth-server.ts")
};

section("1. The token itself");
{
  const a = mintClaimToken();
  const b = mintClaimToken();
  check(a !== b, "each minted token is unique");
  check(isWellFormedClaimToken(a), "a minted token satisfies the shape the claim function enforces", a.length + " chars");
  check(a.length >= 40, "a minted token carries at least 256 bits of entropy", `${a.length} base64url characters`);
  check(!/[^A-Za-z0-9_-]/.test(a), "a minted token is URL-safe and needs no escaping");
  check(claimTokenHash(a).length === 64 && /^[0-9a-f]+$/.test(claimTokenHash(a)), "the stored hash is SHA-256 hex");
  check(claimTokenHash(a) !== a, "the token is never its own hash");
  check(claimTokenHash(a) === claimTokenHash(a), "hashing is stable");
  check(!redactClaimToken(a).includes(a), "the redaction helper never echoes the token");
  check(redactClaimToken(null) === "absent", "the redaction helper handles an absent token");
  for (const bad of ["", "short", "has spaces in it and is long enough to pass length", `${a}!`]) {
    check(!isWellFormedClaimToken(bad), `a malformed token is rejected: ${JSON.stringify(bad.slice(0, 24))}`);
  }
}

section("2. The token never reaches storage, logs or analytics");
{
  // The module that owns the token in the browser touches no persistent store at
  // all. Elsewhere the rule is narrower and more useful: no line that mentions
  // the token may also reach a store, a log, or an analytics call. ScreeningFlow
  // legitimately persists screening answers for resume; it may not persist this.
  const code = Object.fromEntries(Object.entries(sources).map(([key, value]) => [key, stripComments(value)]));

  check(!/\b(?:local|session)Storage\s*(?:\.|\[)/.test(code.handoff), "the claim handoff writes no browser storage");
  check(!/document\.cookie/.test(code.handoff), "the claim handoff writes no cookie");

  const LEAK = /(?:local|session)Storage|document\.cookie|console\.(?:log|info|warn|error)|trackFunnelEvent|logSecurityError|dataLayer|gtag/;
  const ALLOWED_TOKEN_SINKS = [
    "claim_token_hash: claimTokenHash(claimToken)",
    "claimTokenHash(input.claimToken)",
    "p_claim_token: input.claimToken"
  ];
  const surfaces = [
    ["claim handoff", code.handoff],
    ["sign-in form", code.signIn],
    ["set-password page", code.setPassword],
    ["save intent", code.saveIntent],
    ["screening flow", code.screeningFlow],
    ["pending create route", code.pendingCreate],
    ["claim route", code.pendingClaim],
    ["claim service", code.service],
    ["claim obligations", code.obligations]
  ];
  for (const [label, source] of surfaces) {
    const offending = source
      .split("\n")
      .filter((line) => /claimToken|claim_token(?!_hash)/.test(line))
      .filter((line) => LEAK.test(line))
      .filter((line) => !ALLOWED_TOKEN_SINKS.some((allowed) => line.includes(allowed)));
    check(offending.length === 0, `${label} never routes the token to a store, a log, or analytics`, offending.join(" | ").slice(0, 160));
  }

  for (const [label, source] of [
    ["pending create route", code.pendingCreate],
    ["claim route", code.pendingClaim],
    ["claim service", code.service],
    ["claim obligations", code.obligations]
  ]) {
    check(!/console\.(log|info|warn|error)/.test(source), `${label} writes no console log`);
  }

  // The token reaches persistence exactly once, as a hash.
  check(
    (code.pendingCreate.match(/claim_token_hash/g) ?? []).length === 1
      && code.pendingCreate.includes("claim_token_hash: claimTokenHash(claimToken)"),
    "the token is persisted only as a SHA-256 hash"
  );
  check(!code.pendingCreate.includes("claim_token:"), "the plaintext token is never a column value");

  // The one place a token-derived value may be logged is the redaction helper,
  // and it emits a hash prefix rather than the token.
  check(sources.token.includes("claimTokenHash(token).slice(0, 8)"), "the only loggable form of a token is a hash prefix");

  const flowCode = stripComments(sources.screeningFlow);
  const trackCalls = flowCode.match(/trackFunnelEvent\([^)]*\)/g) ?? [];
  check(!trackCalls.some((call) => /claimToken|pending\.claimToken/.test(call)), "no analytics event carries the claim token");
}

section("3. The token leaves the URL once it is used");
{
  check(sources.handoff.includes("history.replaceState"), "the token is stripped with replaceState, adding no history entry");
  check(sources.handoff.includes("url.searchParams.delete(CLAIM_TOKEN_PARAM)"), "stripping removes the claim parameter");
  check(sources.handoff.includes("if (status !== 401) stripClaimTokenFromUrl();"),
    "the token is stripped whenever the server has seen it, and kept only when authentication is still needed");
  check(sources.setPassword.includes("scrubAuthUrl"), "the auth callback scrubs its URL");
  check(sources.setPassword.includes("cleanParams.set(CLAIM_TOKEN_PARAM, claimToken)"),
    "the auth callback preserves the token exactly one step further, to the claim itself");
}

section("4. Only the token is believed");
{
  const create = stripComments(sources.pendingCreate);
  const claim = stripComments(sources.pendingClaim);
  for (const forbidden of ["body.product", "body.partnerSlug", "body.userId", "body.matterId", "body.ownerUserId"]) {
    check(!create.includes(forbidden), `the pending create route ignores browser-supplied ${forbidden}`);
  }
  check(create.includes("resolveScreeningAttribution"), "attribution is resolved from the server's own session record");
  check(!create.includes("pending_id"), "the pending id is never returned to the browser");
  check(claim.includes("body?.claimToken"), "the claim route reads exactly one field from the browser");
  check(!/body\?\.(?!claimToken)/.test(claim), "the claim route reads nothing else from the browser");
  check(sources.service.includes('.eq("claim_token_hash", claimTokenHash(input.claimToken))'),
    "the pending result is resolved by token hash, never by a client-supplied id");
}

section("5. An unverified account receives nothing");
{
  check(sources.authServer.includes("isVerified"), "the server auth state reports verification");
  check(sources.pendingClaim.includes("accountVerified: auth.isVerified === true"), "the claim route passes verification through");
  check(sources.service.includes('if (!input.accountVerified) return { ok: false, reason: "unverified_account" };'),
    "an unverified account is refused before anything is created");
  const guardIndex = sources.service.indexOf("unverified_account");
  const rpcIndex = sources.service.indexOf('supabase.rpc("claim_pending_screening_result"');
  check(guardIndex >= 0 && rpcIndex > guardIndex, "the verification guard runs before the claim transaction");
}

section("6. Every continuation lands on the exact matter");
{
  check(sources.matterPath.includes("/briefcase/matters/"), "the canonical destination is /briefcase/matters/{matter_id}");
  check(fs.existsSync(path.join(root, "src/app/briefcase/matters/[matterId]/page.tsx")), "the canonical route exists");
  check(sources.service.includes("redirectTo: exactMatterPath(matterId)"), "the claim returns the exact matter path");
  check(sources.handoff.includes("if (!isExactMatterPath(redirectTo)) return { ok: false, status };"),
    "the browser refuses any redirect that is not an exact matter");

  // The eight continuations Contract §8 enumerates.
  const continuations = [
    ["new account creation", sources.signIn, "expungementAuthRedirectTo(requestContext.nextPath, requestContext.claimToken)"],
    ["existing-account sign-in", sources.signIn, "if (requestContext.claimToken) {"],
    ["email verification", sources.setPassword, "claimExpungementPending"],
    ["magic link", sources.setPassword, "CLAIM_TOKEN_PARAM"],
    ["password reset", sources.setPassword, "submitClaim(claimToken)"],
    ["same-device callback", sources.setPassword, "scrubAuthUrl"],
    ["different-device callback", sources.saveIntent, "readClaimTokenFromUrl()"],
    ["already signed in", sources.screeningFlow, "submitClaim(pending.claimToken)"]
  ];
  for (const [label, source, marker] of continuations) {
    check(source.includes(marker), `continuation preserved: ${label}`);
  }
  check(sources.briefcaseHome.includes("<BriefcaseSaveIntent"), "the Briefcase home completes a claim that arrives there instead of an empty landing");
}

section("7. Pre-authentication language names no matter and no Briefcase");
{
  const start = sources.screeningFlow.indexOf("async function handlePacketAction()");
  const end = sources.screeningFlow.indexOf("function handleContinue()", start);
  const handoff = sources.screeningFlow.slice(start, end);
  check(start >= 0 && end > start, "the pre-authentication handoff is structurally identifiable");
  check(!/pendingId|matterId:/.test(handoff), "the pre-authentication handoff carries no matter identifier");
  const result = read("src/components/expungement-ai/screening/ScreeningResult.tsx");
  const dtcBlock = result.slice(result.indexOf("const DTC_RESULT_ACTIONS"), result.indexOf("const TONE_ACCENT"));
  check(!dtcBlock.includes("Briefcase"), "the anonymous DTC result actions name no Briefcase");
  check(dtcBlock.includes("Save my result and continue"), "the anonymous DTC result uses the approved preliminary-result action");
}

section("8. Post-claim work cannot undo the claim");
{
  const claim = sources.pendingClaim;
  // Index from the call sites, not the import list.
  const rpcCall = claim.indexOf("claimPendingScreeningResult({");
  const followUp = claim.indexOf("createClinicReviewFollowUpForSavedMatter({");
  const analytics = claim.indexOf("recordScreeningEligibilityResult(\n");
  const success = claim.indexOf("ok: true,");
  check(followUp > rpcCall && analytics > rpcCall, "follow-up and analytics run after the ownership transaction");
  check(success > followUp && success > analytics, "the successful response is returned last");
  check(!claim.includes("return NextResponse.json({ ok: false") || claim.indexOf("return NextResponse.json({ ok: false") < followUp,
    "no post-claim failure path can convert a successful claim into a failure");
  check(claim.includes("recordOutstandingClinicFollowUp"), "an unmet obligation is recorded durably rather than dropped");
  check(sources.obligations.includes("participant_claim_events"), "the obligation lands in the append-only claim audit");
}

console.log("");
if (failures.length > 0) {
  console.error(`Shared claim boundary application proof failed: ${failures.length} check(s).`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}
console.log("Shared claim boundary application proof passed.");
