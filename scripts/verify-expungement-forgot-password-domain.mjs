import fs from "node:fs";
import path from "node:path";
import { register } from "node:module";

register("./lib/ts-esm-loader.mjs", import.meta.url);

// The /auth/forgot-password route is shared by Expungement.ai consumers and
// LegalEase partner staff. The reset email must return the user to the domain
// they came from. This verifier proves the context-aware redirect helper and
// its wiring, and that set-password stays prerender-safe.

// Deterministic bases for the pure helper under test.
process.env.NEXT_PUBLIC_EXPUNGEMENT_AI_URL = "https://expungement.ai";
process.env.NEXT_PUBLIC_PARTNER_APP_URL = "https://legaleasepartner.com";
delete process.env.NEXT_PUBLIC_LEGALEASE_PARTNER_URL;

const { passwordResetRedirectUrl } = await import("../src/lib/app-url.ts");
const { consumerAuthContinuationFrom } = await import("../src/lib/expungement-ai/auth-continuation.ts");

const root = process.cwd();
const failures = [];
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const assert = (condition, message) => {
  if (!condition) failures.push(message);
};

// 1. DTC contexts resolve to expungement.ai/briefcase.
const dtcByProduct = passwordResetRedirectUrl({ product: "expungement", hostname: "legaleasepartner.com" });
assert(
  dtcByProduct === "https://expungement.ai/auth/set-password?next=/briefcase",
  `DTC (product=expungement) reset URL should target expungement.ai/briefcase, got: ${dtcByProduct}`
);

for (const hostname of ["expungement.ai", "www.expungement.ai"]) {
  const url = passwordResetRedirectUrl({ hostname });
  assert(
    url === "https://expungement.ai/auth/set-password?next=/briefcase",
    `DTC host ${hostname} reset URL should target expungement.ai/briefcase, got: ${url}`
  );
}

// 2. Partner contexts resolve to legaleasepartner.com/partner/dashboard.
const partnerByHost = passwordResetRedirectUrl({ hostname: "legaleasepartner.com" });
assert(
  partnerByHost === "https://legaleasepartner.com/auth/set-password?next=/partner/dashboard",
  `Partner host reset URL should target legaleasepartner.com/partner/dashboard, got: ${partnerByHost}`
);

// 3. Default (no product, no host) stays on the partner app (historical behavior).
const defaultUrl = passwordResetRedirectUrl({});
assert(
  defaultUrl === "https://legaleasepartner.com/auth/set-password?next=/partner/dashboard",
  `Default reset URL should target the partner app, got: ${defaultUrl}`
);

// 4. Cross-domain safety: a DTC reset must never land on the partner domain and
//    a partner reset must never land on expungement.ai.
assert(!dtcByProduct.includes("legaleasepartner.com"), "DTC reset URL must not point at the partner domain.");
assert(!partnerByHost.includes("expungement.ai"), "Partner reset URL must not point at expungement.ai.");

// 5. A DTC password-recovery interruption preserves only the validated claim,
// safe local next path and locale.
const claimToken = "aD9_wH2nR7pL4xQ8mK5vC1sF6jT3bY0uE9iO2zX7qW4";
const continuation = consumerAuthContinuationFrom(new URLSearchParams({
  claim: claimToken,
  next: "/briefcase/matters/2ce8d69f-5b69-4fbb-b63a-d85e39c47270",
  locale: "es",
  partner: "untrusted"
}));
const continuedUrl = new URL(passwordResetRedirectUrl({ product: "expungement", continuation }));
assert(continuedUrl.searchParams.get("claim") === claimToken, "DTC reset must preserve the validated opaque claim.");
assert(continuedUrl.searchParams.get("locale") === "es", "DTC reset must preserve locale.");
assert(continuedUrl.searchParams.get("partner") === null, "DTC reset must not preserve browser-controlled attribution.");

// 6. Wiring: the consumer sign-in link carries the validated continuation, and
//    the partner sign-in link uses the partner default (no product hint).
const consumerForm = read("src/components/expungement-ai/ConsumerSignInForm.tsx");
assert(
  consumerForm.includes("consumerForgotPasswordPath(requestContext)")
    && consumerForm.includes("setRequestContext(readAuthRequestContext())"),
  "Consumer sign-in form must hydrate Forgot Password from the validated continuation."
);
const partnerSignIn = read("src/app/sign-in/page.tsx");
assert(
  partnerSignIn.includes('href="/auth/forgot-password"'),
  "Partner sign-in must link to /auth/forgot-password (partner default)."
);
assert(
  !partnerSignIn.includes("/auth/forgot-password?product=expungement"),
  "Partner sign-in must not carry the expungement product hint."
);

// 7. Prerender safety: set-password is a client component and never instantiates
//    Supabase at module scope (only inside effects/handlers).
const setPassword = read("src/app/auth/set-password/page.tsx");
assert(setPassword.trimStart().startsWith('"use client"'), "set-password must be a client component (\"use client\").");
const moduleScopeSupabase = setPassword
  .split("\n")
  .some((line) => /^createBrowserSupabaseClient\s*\(/.test(line));
assert(!moduleScopeSupabase, "set-password must not instantiate Supabase at module scope (prerender safety).");

if (failures.length > 0) {
  console.error("Expungement.ai forgot-password domain verification failed.");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Expungement.ai forgot-password domain verifier passed.");
console.log("DTC resets preserve the validated claim on expungement.ai; partner resets return to legaleasepartner.com; set-password stays prerender-safe.");
