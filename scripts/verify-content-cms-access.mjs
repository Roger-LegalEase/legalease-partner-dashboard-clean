/**
 * Content CMS proxy/auth regression coverage.
 *
 * Drives the real production proxy for the path boundary that caused the outage, then verifies the
 * existing page/API authorization contracts remain the decision-makers behind that boundary.
 */

import fs from "node:fs";
import path from "node:path";
import { register } from "node:module";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];

process.env.NODE_ENV = "production";
process.env.INTERNAL_ADMIN_ACCESS_TOKEN = "content-cms-access-verifier-token";
process.env.NEXT_PUBLIC_SUPABASE_URL ??= "http://127.0.0.1:54321";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= "content-cms-access-verifier-anon-key";

register("./lib/next-server-loader.mjs", import.meta.url);
register("./lib/ts-esm-loader.mjs", import.meta.url);
register("./lib/content-auth-test-loader.mjs", import.meta.url);

const { NextRequest } = await import("next/server");
const { proxy } = await import("../src/proxy.ts");
const { setContentAuthTestState } = await import("./lib/content-auth-test-doubles.mjs");
const {
  denyUnlessContentCapability,
  resolveContentPageAccess,
  resolveContentSession
} = await import("../src/lib/content/auth.ts");

// --- 1. The CMS page group reaches Supabase session refresh without a legacy bearer token. -------

for (const pathname of ["/internal/content", "/internal/content/articles"]) {
  const response = await callProxy(pathname, "legaleasepartner.com");
  const body = await response.text();

  assert(response.status === 200, `${pathname} must pass through the proxy, got ${response.status}.`);
  assert(
    response.headers.get("x-middleware-next") === "1",
    `${pathname} must return the session-refresh passthrough response.`
  );
  assert(
    body !== "Internal admin access token required.",
    `${pathname} must not be rejected by the legacy internal-admin token gate.`
  );
}

// --- 2. Only the CMS page group is exempt. -------------------------------------------------------

const protectedLegacyPaths = [
  "/internal/command-center/readiness",
  "/internal/partner-users/new",
  "/internal/billing"
];

for (const pathname of protectedLegacyPaths) {
  const denied = await callProxy(pathname, "legaleasepartner.com");
  assert(denied.status === 401, `${pathname} must still require the legacy token.`);
  assert(
    (await denied.text()) === "Internal admin access token required.",
    `${pathname} must keep the legacy token-gate response.`
  );

  const allowed = await callProxy(pathname, "legaleasepartner.com", "content-cms-access-verifier-token");
  assert(allowed.status === 200, `${pathname} must still accept the configured legacy token.`);
}

// A public product host must not turn an unrelated internal route into a public route.
for (const host of ["expungement.ai", "legalease.com", "cleartherecord.org"]) {
  const response = await callProxy("/internal/partner-users/new", host);
  assert(response.status === 401, `${host} must not expose /internal/partner-users/new.`);
}

// /api/internal/content/* never depended on this legacy page gate; its route-level gate remains
// responsible for the 401/403 capability decision.
const apiProxyResponse = await callProxy("/api/internal/content/posts", "legaleasepartner.com");
assert(apiProxyResponse.status === 200, "/api/internal/content/posts must pass through the proxy.");
assert(
  apiProxyResponse.headers.get("x-middleware-next") === "1",
  "/api/internal/content/posts must continue to reach its API capability gate."
);

// --- 3. The existing content authorization layer remains intact. --------------------------------

setContentAuthTestState({ auth: { isAuthenticated: false } });
try {
  await resolveContentPageAccess("/internal/content");
  failures.push("A signed-out CMS request must redirect instead of returning page access.");
} catch (error) {
  assert(
    error?.location === "/sign-in?next=%2Finternal%2Fcontent",
    `A signed-out CMS request must redirect with the exact next path, got ${error?.location ?? String(error)}.`
  );
}

setContentAuthTestState({ auth: { isAuthenticated: false } });
const signedOutApi = await denyUnlessContentCapability(
  "content.read",
  "/api/internal/content/posts",
  "cms-access-verifier"
);
assert(signedOutApi.denied?.status === 401, "A signed-out internal content API request must remain 401.");

setContentAuthTestState({
  auth: { isAuthenticated: true, userId: "no-content-role-user" },
  internalAdmin: false,
  contentRows: []
});
const noRoleAccess = await resolveContentPageAccess("/internal/content");
assert(
  noRoleAccess.kind === "denied" && noRoleAccess.title === "Content access denied",
  "An authenticated account without a content role must receive the content access-denied page."
);

setContentAuthTestState({
  auth: { isAuthenticated: true, userId: "internal-admin-user" },
  internalAdmin: true
});
const internalAdminSession = await resolveContentSession();
assert(
  internalAdminSession.role === "primary_admin" && internalAdminSession.userId === "internal-admin-user",
  "An existing internal_admin must resolve to content primary_admin."
);

const authSource = read("src/lib/content/auth.ts");
const cmsPageSource = read("src/app/internal/content/page.tsx");
const cmsApiSource = read("src/app/api/internal/content/posts/route.ts");

assert(
  cmsPageSource.includes('resolveContentPageAccess("/internal/content")') &&
    cmsPageSource.includes("<ContentDenied"),
  "The CMS root must call the content page gate with its exact next path and render denials."
);
assert(
  cmsApiSource.includes('denyUnlessContentCapability("content.read"'),
  "The internal content API must still enforce its content capability gate."
);

const contentAuthSurface = [
  authSource,
  ...walk("src/app/internal/content").map(read)
].join("\n");
assert(
  !/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(contentAuthSurface),
  "Content authorization must not hardcode an administrator email."
);

// The exact root redirect is the composition of the page's fixed nextPath and auth.ts's redirect.
const signedOutRedirect = `/sign-in?next=${encodeURIComponent("/internal/content")}`;
assert(
  signedOutRedirect === "/sign-in?next=%2Finternal%2Fcontent",
  "The signed-out CMS redirect contract changed unexpectedly."
);

if (failures.length) {
  console.error("Content CMS access verification failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Content CMS access verification passed.");
console.log("CMS: /internal/content and all child pages use Supabase session refresh, without a bearer token.");
console.log(`Legacy token gate preserved: ${protectedLegacyPaths.join(", ")}.`);
console.log("Content auth preserved: signed-out redirect, access-denied page, API 401, and internal_admin mapping.");
console.log("Public product hosts do not expose unrelated internal pages; no administrator email is hardcoded.");

async function callProxy(pathname, host, bearerToken) {
  const headers = new Headers({ host });
  if (bearerToken) headers.set("authorization", `Bearer ${bearerToken}`);
  return proxy(new NextRequest(`https://${host}${pathname}`, { headers }));
}

function read(rel) {
  return fs.readFileSync(path.join(rootDir, rel), "utf8");
}

function walk(rel) {
  const entries = fs.readdirSync(path.join(rootDir, rel), { withFileTypes: true });
  return entries.flatMap((entry) => {
    const child = path.join(rel, entry.name);
    return entry.isDirectory() ? walk(child) : [child];
  });
}

function assert(condition, message) {
  if (!condition) failures.push(message);
}
