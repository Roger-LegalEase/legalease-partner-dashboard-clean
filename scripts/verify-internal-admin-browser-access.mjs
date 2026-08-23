/**
 * Focused internal-administrator authorization regression suite.
 *
 * Drives the canonical resolver with synthetic identities, exercises page/API
 * denial and sign-out, and inventories every internal page and handler so a
 * proxy, email, metadata claim, content role, or partner role cannot become an
 * alternate authorization authority.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { register } from "node:module";

register("./lib/ts-esm-loader.mjs", import.meta.url);
register("./lib/internal-auth-test-loader.mjs", import.meta.url);

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relativePath) => fs.readFileSync(path.join(rootDir, relativePath), "utf8");
const doubles = await import("./lib/internal-auth-test-doubles.mjs");
const {
  requireInternalAdminSession,
  SessionPartnerError
} = await import("../src/lib/partners/session-partner.ts");
const {
  denyUnlessContentCapability,
  resolveContentSession
} = await import("../src/lib/content/auth.ts");
const { resolveInternalAdminPageAccess } = await import(
  "../src/lib/partners/internal-admin-gate.tsx"
);
const { safeAppRedirectPath } = await import("../src/lib/auth/redirect.ts");
const signOutRoute = await import("../src/app/sign-out/route.ts");

const IDS = {
  participant: "10000000-0000-4000-8000-000000000001",
  viewer: "10000000-0000-4000-8000-000000000002",
  staff: "10000000-0000-4000-8000-000000000003",
  partnerAdmin: "10000000-0000-4000-8000-000000000004",
  external: "10000000-0000-4000-8000-000000000005",
  corporate: "10000000-0000-4000-8000-000000000006",
  internal: "10000000-0000-4000-8000-000000000007",
  revoked: "10000000-0000-4000-8000-000000000008",
  expired: "10000000-0000-4000-8000-000000000009"
};

const identities = {
  participant: identity(IDS.participant, "participant@outside.test", []),
  viewer: identity(IDS.viewer, "viewer@partner.test", [partnerRow(IDS.viewer, "partner_viewer")]),
  staff: identity(IDS.staff, "staff@partner.test", [partnerRow(IDS.staff, "partner_staff")]),
  partnerAdmin: identity(IDS.partnerAdmin, "admin@partner.test", [partnerRow(IDS.partnerAdmin, "partner_admin")]),
  external: identity(IDS.external, "operator@personal.test", [], {
    app_metadata: { role: "internal_admin" },
    user_metadata: { role: "internal_admin" }
  }),
  corporate: identity(IDS.corporate, "employee@legalease.test", []),
  internal: identity(IDS.internal, "security-admin@legalease.test", [internalRow(IDS.internal, "active")]),
  revoked: identity(IDS.revoked, "revoked@legalease.test", [internalRow(IDS.revoked, "disabled")]),
  // The current schema represents completed expiration by disabling the
  // membership; the historical cause never restores active status.
  expired: identity(IDS.expired, "expired@legalease.test", [internalRow(IDS.expired, "disabled")])
};

let passed = 0;
async function check(name, fn) {
  await fn();
  passed += 1;
  console.log(`  ok  ${name}`);
}

await check("unauthenticated internal page request redirects before data", async () => {
  setIdentity(null);
  await assert.rejects(
    () => resolveInternalAdminPageAccess("/internal/partners/provisioning"),
    (error) => error?.location === "/sign-in?next=%2Finternal%2Fpartners%2Fprovisioning"
  );
});

for (const [name, label] of [
  ["participant", "participant"],
  ["viewer", "partner viewer"],
  ["staff", "partner staff"],
  ["partnerAdmin", "partner administrator"],
  ["external", "external personal-email account"],
  ["corporate", "corporate-domain account without a role"],
  ["revoked", "revoked internal administrator"],
  ["expired", "expired internal administrator"]
]) {
  await check(`${label} is denied`, async () => {
    setIdentity(identities[name]);
    await assertForbidden(() => requireInternalAdminSession());
  });
}

await check("active internal administrator is allowed with server-derived identity", async () => {
  setIdentity(identities.internal);
  const session = await requireInternalAdminSession();
  assert.deepEqual(session, {
    kind: "internal_admin",
    authUserId: IDS.internal,
    email: "security-admin@legalease.test",
    role: "internal_admin"
  });
});

await check("personal email and metadata claims cannot bypass UUID membership", async () => {
  setIdentity(identities.external);
  await assertForbidden(() => requireInternalAdminSession());
});

await check("corporate email alone never grants authorization", async () => {
  setIdentity(identities.corporate);
  await assertForbidden(() => requireInternalAdminSession());
});

await check("partner_admin never implies internal_admin", async () => {
  setIdentity(identities.partnerAdmin);
  await assertForbidden(() => requireInternalAdminSession());
});

await check("denied page decision names the authenticated account without data", async () => {
  setIdentity(identities.external);
  const access = await resolveInternalAdminPageAccess("/internal/partners/provisioning");
  assert.equal(access.kind, "denied");
  assert.equal(access.email, "operator@personal.test");
  assert.ok(!JSON.stringify(access).includes("partnerSlug"));
});

await check("direct internal API request is 403 for authenticated external account", async () => {
  setIdentity(identities.external);
  const result = await denyUnlessContentCapability(
    "content.read",
    "/api/internal/content/posts",
    "focused-security-test"
  );
  assert.equal(result.denied?.status, 403);
  const payload = await result.denied.json();
  assert.deepEqual(payload, { success: false, error: "Internal administrator access required." });
  assert.ok(!JSON.stringify(payload).includes("partner"));
});

await check("direct internal API request is 401 when signed out", async () => {
  setIdentity(null);
  const result = await denyUnlessContentCapability(
    "content.read",
    "/api/internal/content/posts",
    "focused-security-test"
  );
  assert.equal(result.denied?.status, 401);
});

await check("active internal administrator gets effective content capability", async () => {
  setIdentity(identities.internal);
  const session = await resolveContentSession();
  assert.deepEqual(session, { userId: IDS.internal, role: "primary_admin", partnerSlug: null });
});

await check("sign-out is local, clears the session, and disables protected actions", async () => {
  setIdentity(identities.internal);
  const response = await signOutRoute.POST(new Request("https://internal.test/sign-out", { method: "POST" }));
  assert.equal(response.status, 303);
  assert.equal(response.headers.get("location"), "https://internal.test/sign-in?signedOut=1");
  assert.match(response.headers.get("cache-control") ?? "", /no-store/);
  assert.equal(response.headers.get("clear-site-data"), '"cache"');
  assert.equal(doubles.getInternalAuthTestState().lastSignOutScope, "local");
  await assertUnauthenticated(() => requireInternalAdminSession());
  const after = await denyUnlessContentCapability(
    "content.publish",
    "/api/internal/content/posts/example/transition",
    "after-sign-out"
  );
  assert.equal(after.denied?.status, 401);
});

await check("browser Back receives no reusable internal response contract", () => {
  const proxy = read("src/proxy.ts");
  const layout = read("src/app/internal/layout.tsx");
  assert.ok(proxy.includes('"Cache-Control", "private, no-store, max-age=0, must-revalidate"'));
  assert.ok(proxy.includes('requestHeaders.set(INTERNAL_PATH_HEADER, request.nextUrl.pathname)'));
  assert.ok(layout.includes('export const dynamic = "force-dynamic"'));
  assert.ok(layout.includes("noStore()"));
  assert.ok(layout.includes('requestHeaders.get("x-legalease-internal-path")'));
  assert.ok(layout.includes("resolveInternalAdminPageAccess(nextPath)"));
});

await check("switch-account control clears the local session before sign-in", async () => {
  setIdentity(identities.external);
  const body = new URLSearchParams({ intent: "switch-account" });
  const response = await signOutRoute.POST(new Request("https://internal.test/sign-out", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body
  }));
  assert.equal(response.status, 303);
  assert.equal(response.headers.get("location"), "https://internal.test/sign-in?switchAccount=1");
  assert.equal(doubles.getInternalAuthTestState().lastSignOutScope, "local");
  await assertUnauthenticated(() => requireInternalAdminSession());
});

await check("identity, role, and accessible sign-out persist in the internal shell", () => {
  const layout = read("src/app/internal/layout.tsx");
  for (const marker of [
    "Signed in as:",
    "access.session.email",
    "Role:",
    "access.session.role",
    'action="/sign-out"',
    'aria-label="Sign out of LegalEase Internal"',
    "focus-visible:ring-2"
  ]) assert.ok(layout.includes(marker), `internal shell missing ${marker}`);
  assert.ok(!layout.includes("authUserId"), "the shell must not expose the Auth UUID");
});

await check("access denied shows identity, sign-out, and switch-account controls", () => {
  const gate = read("src/lib/partners/internal-admin-gate.tsx");
  for (const marker of [
    "Signed in as:",
    'action="/sign-out"',
    "Sign out",
    "Sign in with another account",
    "does not have an active LegalEase internal administrator authorization"
  ]) assert.ok(gate.includes(marker), `denial experience missing ${marker}`);
});

await check("legacy environment and email allowlists cannot bypass membership", () => {
  const proxy = read("src/proxy.ts");
  const envExample = read(".env.example");
  assert.ok(!proxy.includes("INTERNAL_ADMIN_ACCESS_TOKEN"));
  assert.ok(!proxy.includes("bearerTokenMatches"));
  assert.ok(!envExample.includes("INTERNAL_ADMIN_ACCESS_TOKEN"));
  assert.ok(!/roman\.roger@gmail\.com|roger@legalease\.com/i.test([
    proxy,
    read("src/lib/partners/session-partner.ts"),
    read("src/lib/partners/internal-admin-gate.tsx")
  ].join("\n")));
});

await check("every internal page has a direct canonical server guard", () => {
  const pages = walk("src/app/internal", (file) => file.endsWith("/page.tsx"));
  assert.ok(pages.length >= 38, `expected internal pages, found ${pages.length}`);
  const gates = [
    "resolveInternalAdminPageAccess(",
    "resolveContentPageAccess(",
    "listPilotRequestsForInternalAdmin("
  ];
  const ungated = pages.filter((file) => !gates.some((gate) => read(file).includes(gate)));
  assert.deepEqual(ungated, []);
});

await check("every internal API and route handler has a canonical server guard", () => {
  const routes = [
    ...walk("src/app/api/internal", (file) => file.endsWith("/route.ts")),
    ...walk("src/app/internal", (file) => file.endsWith("/route.ts"))
  ];
  assert.ok(routes.length >= 27, `expected internal handlers, found ${routes.length}`);
  const gates = [
    "requireInternalAdminSession(",
    "requireInternalAdminRouteAccess(",
    "requireInternalOnboardingContext(",
    "denyUnlessInternalAdmin(",
    "denyUnlessContentCapability("
  ];
  const ungated = routes.filter((file) => !gates.some((gate) => read(file).includes(gate)));
  assert.deepEqual(ungated, []);
});

await check("provisioning pages reject before partner data is loaded", () => {
  for (const file of [
    "src/app/internal/partners/provisioning/page.tsx",
    "src/app/internal/partners/provisioning/new/page.tsx",
    "src/app/internal/partners/provisioning/[partnerSlug]/page.tsx"
  ]) {
    const source = read(file);
    const gate = source.indexOf("await resolveInternalAdminPageAccess(");
    const sensitive = firstIndex(source, ["getAllPartners(", "getPartnerRecordBySlug(", "getFirstAdminAccessView("]);
    assert.ok(gate >= 0 && sensitive > gate, `${file} must authorize before partner data`);
  }
});

await check("provisioning API rejects before parsing or mutating", () => {
  const source = read("src/app/api/internal/partners/provisioning/route.ts");
  const gate = source.indexOf("await requireInternalAdminSession(");
  const mutationMarker = ["await ", "provision", "Partner("].join("");
  assert.ok(gate >= 0);
  assert.ok(source.indexOf("await request.json()") > gate);
  assert.ok(source.indexOf(mutationMarker) > gate);
});

await check("invitation, publication, activation, and commercial gate are guarded", () => {
  const cases = [
    ["src/app/api/internal/partners/first-admin/[partnerSlug]/route.ts", "await internalAdminGate(", "createFirstAdminInvitation("],
    ["src/app/api/internal/content/posts/[id]/transition/route.ts", "await denyUnlessContentCapability(", ".update(patch)"],
    ["src/app/api/internal/partners/onboarding/[partnerSlug]/route.ts", "await denyUnlessInternalAdmin(", "markLive("],
    ["src/app/api/internal/partners/onboarding/phase1/[partnerSlug]/route.ts", "await requireInternalOnboardingContext(", "applyInternalOnboardingReview("]
  ];
  for (const [file, guardMarker, mutationMarker] of cases) {
    const source = read(file);
    const gate = source.indexOf(guardMarker);
    const mutation = source.indexOf(mutationMarker);
    assert.ok(gate >= 0 && mutation > gate, `${file} must guard ${mutationMarker}`);
  }
});

await check("there are no internal server actions outside guarded handlers", () => {
  const files = [...walk("src/app/internal"), ...walk("src/lib/partners"), ...walk("src/lib/content")];
  const actions = files.filter((file) => /["']use server["']/.test(read(file)));
  assert.deepEqual(actions, []);
});

await check("returnTo accepts safe local paths only", () => {
  assert.equal(safeAppRedirectPath("/internal/partners/provisioning", "/sign-in"), "/internal/partners/provisioning");
  for (const unsafe of ["https://attacker.test", "//attacker.test", "javascript:alert(1)", "data:text/html,x"]) {
    assert.equal(safeAppRedirectPath(unsafe, "/sign-in"), "/sign-in");
  }
});

await check("service role and internal secrets remain server-only", () => {
  const clientFiles = [
    ...walk("src/app/internal", (file) => /\.(tsx?|jsx?)$/.test(file)),
    ...walk("src/components", (file) => /\.(tsx?|jsx?)$/.test(file))
  ].filter((file) => read(file).includes('"use client"') || read(file).includes("'use client'"));
  for (const file of clientFiles) {
    const source = read(file);
    assert.ok(!source.includes("SUPABASE_SERVICE_ROLE_KEY"), `${file} exposes service-role configuration`);
    assert.ok(!source.includes("INTERNAL_ADMIN_ACCESS_TOKEN"), `${file} exposes a legacy internal secret`);
  }
});

console.log(`\nInternal admin authorization hardening: ${passed}/${passed} focused checks passed.`);

function identity(id, email, rows, metadata = {}) {
  return { user: { id, email, ...metadata }, rows };
}

function partnerRow(authUserId, role) {
  return { auth_user_id: authUserId, partner_slug: "synthetic-partner", role, status: "active" };
}

function internalRow(authUserId, status) {
  return { auth_user_id: authUserId, partner_slug: null, role: "internal_admin", status };
}

function setIdentity(value) {
  doubles.setInternalAuthTestState(value ? { user: value.user, rows: value.rows } : {});
}

async function assertForbidden(fn) {
  await assert.rejects(fn, (error) => {
    assert.ok(error instanceof SessionPartnerError);
    assert.notEqual(error.code, "unauthenticated");
    return true;
  });
}

async function assertUnauthenticated(fn) {
  await assert.rejects(fn, (error) => {
    assert.ok(error instanceof SessionPartnerError);
    assert.equal(error.code, "unauthenticated");
    return true;
  });
}

function walk(relativeDirectory, predicate = () => true) {
  const absolute = path.join(rootDir, relativeDirectory);
  if (!fs.existsSync(absolute)) return [];
  const found = [];
  for (const entry of fs.readdirSync(absolute, { withFileTypes: true })) {
    const relative = path.join(relativeDirectory, entry.name).replaceAll("\\", "/");
    if (entry.isDirectory()) found.push(...walk(relative, predicate));
    else if (predicate(`/${relative}`)) found.push(relative);
  }
  return found;
}

function firstIndex(source, markers) {
  const indexes = markers.map((marker) => source.indexOf(marker)).filter((index) => index >= 0);
  return indexes.length ? Math.min(...indexes) : Number.POSITIVE_INFINITY;
}
