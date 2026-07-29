// The /internal admission gate.
//
// These checks drive the real proxy function against a stub Supabase, so what is
// asserted is what the gate actually decides rather than what its source says.
// What they defend: a browser session belonging to an internal administrator
// gets in, nothing else new does, the bearer path still works, the token
// comparison is constant time, the two carve-outs are exactly as wide as they
// were, and no internal page is left without an application-level check.
import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { register } from "node:module";

register("./lib/ts-esm-loader.mjs", import.meta.url);

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relativePath) =>
  fs.readFileSync(path.join(rootDir, relativePath), "utf8");

let passed = 0;
const results = [];

async function check(name, fn) {
  await fn();
  passed += 1;
  results.push(name);
  console.log(`  ok  ${name}`);
}

// --- stub Supabase -----------------------------------------------------------

const INTERNAL_ADMIN = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const PARTNER_ADMIN = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const AMBIGUOUS_USER = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const SLUG_BEARING_ADMIN = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";

/**
 * Answers the two calls the gate makes: who the session belongs to, and what
 * active partner_users rows that user has. Keyed by the access token the client
 * presents, which is what a real Supabase would do.
 */
const USERS = {
  "token-internal-admin": { id: INTERNAL_ADMIN },
  "token-partner-admin": { id: PARTNER_ADMIN },
  "token-ambiguous": { id: AMBIGUOUS_USER },
  "token-slug-bearing-admin": { id: SLUG_BEARING_ADMIN }
};

const ROWS = {
  [INTERNAL_ADMIN]: [
    { auth_user_id: INTERNAL_ADMIN, partner_slug: null, role: "internal_admin", status: "active" }
  ],
  [PARTNER_ADMIN]: [
    {
      auth_user_id: PARTNER_ADMIN,
      partner_slug: "demo-partner",
      role: "partner_admin",
      status: "active"
    }
  ],
  // Two active identities: resolveSessionPartner refuses this, so the gate must
  // refuse it too.
  [AMBIGUOUS_USER]: [
    { auth_user_id: AMBIGUOUS_USER, partner_slug: null, role: "internal_admin", status: "active" },
    {
      auth_user_id: AMBIGUOUS_USER,
      partner_slug: "demo-partner",
      role: "partner_admin",
      status: "active"
    }
  ],
  // An internal_admin row that carries a partner slug is invalid by the same
  // rule the application enforces.
  [SLUG_BEARING_ADMIN]: [
    {
      auth_user_id: SLUG_BEARING_ADMIN,
      partner_slug: "demo-partner",
      role: "internal_admin",
      status: "active"
    }
  ]
};

let requestLog = [];

const stub = http.createServer((request, response) => {
  const url = new URL(request.url, "http://127.0.0.1");
  requestLog.push(url.pathname);
  const authorization = request.headers.authorization ?? "";
  const accessToken = authorization.replace(/^Bearer\s+/i, "").trim();

  const send = (status, body) => {
    response.writeHead(status, { "content-type": "application/json" });
    response.end(JSON.stringify(body));
  };

  if (url.pathname === "/auth/v1/user") {
    const user = USERS[accessToken];
    if (!user) return send(401, { message: "invalid token" });
    return send(200, { id: user.id, aud: "authenticated", role: "authenticated" });
  }

  if (url.pathname === "/rest/v1/partner_users") {
    const user = USERS[accessToken];
    if (!user) return send(200, []);
    return send(200, ROWS[user.id] ?? []);
  }

  return send(404, { message: "not stubbed" });
});

await new Promise((resolve) => stub.listen(0, "127.0.0.1", resolve));
const stubUrl = `http://127.0.0.1:${stub.address().port}`;

// The proxy reads its Supabase configuration from the environment, so it is
// pointed at the stub before the module is imported.
process.env.NEXT_PUBLIC_SUPABASE_URL = stubUrl;
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "stub-anon-key";
process.env.INTERNAL_ADMIN_ACCESS_TOKEN = "correct-horse-battery-staple";
// Production behaviour: the development passthrough must not mask anything.
process.env.NODE_ENV = "production";

const { NextRequest } = await import("next/server");
const { proxy } = await import("../src/proxy.ts");

const INTERNAL_PATH = "/internal/partners/provisioning";

/** Builds a request the way a browser or a script would send one. */
function buildRequest({
  pathname = INTERNAL_PATH,
  method = "GET",
  bearer = null,
  sessionToken = null
} = {}) {
  const headers = new Headers();
  if (bearer) headers.set("Authorization", `Bearer ${bearer}`);
  if (sessionToken) {
    // What @supabase/ssr reads: the project-scoped auth cookie carrying the
    // session. The stub keys off the access token inside it.
    const session = {
      access_token: sessionToken,
      refresh_token: "stub-refresh",
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      expires_in: 3600,
      token_type: "bearer",
      user: { id: USERS[sessionToken]?.id ?? "unknown" }
    };
    headers.set(
      "cookie",
      `sb-127-auth-token=base64-${Buffer.from(JSON.stringify(session)).toString("base64")}`
    );
  }
  return new NextRequest(new URL(`http://127.0.0.1:3000${pathname}`), {
    method,
    headers
  });
}

/** True when the gate refused the request. */
function refused(response) {
  return response.status === 401;
}

/** True when the gate let the request continue to the application. */
function admitted(response) {
  // NextResponse.next() carries the rewrite marker rather than a body.
  return response.status === 200 && !response.headers.get("content-type")?.includes("text/plain");
}

try {
  // --- refusals --------------------------------------------------------------

  await check("no session and no token is refused", async () => {
    const response = await proxy(buildRequest());
    assert.ok(refused(response), `expected 401, got ${response.status}`);
    assert.equal(await response.text(), "Internal admin access token required.");
  });

  await check("a wrong bearer token is refused", async () => {
    const response = await proxy(buildRequest({ bearer: "not-the-token" }));
    assert.ok(refused(response), `expected 401, got ${response.status}`);
  });

  await check("a bearer token of the right length but wrong value is refused", async () => {
    const wrong = "x".repeat("correct-horse-battery-staple".length);
    const response = await proxy(buildRequest({ bearer: wrong }));
    assert.ok(refused(response), `expected 401, got ${response.status}`);
  });

  await check("a partner administrator session is refused", async () => {
    const response = await proxy(buildRequest({ sessionToken: "token-partner-admin" }));
    assert.ok(refused(response), `a partner session must not open /internal`);
  });

  await check("an ambiguous identity is refused", async () => {
    const response = await proxy(buildRequest({ sessionToken: "token-ambiguous" }));
    assert.ok(
      refused(response),
      "two active identities must be refused, as the application refuses them"
    );
  });

  await check("an internal_admin row carrying a partner slug is refused", async () => {
    const response = await proxy(buildRequest({ sessionToken: "token-slug-bearing-admin" }));
    assert.ok(refused(response), "an internal admin must not be partner-scoped");
  });

  await check("an unrecognised session cookie is refused", async () => {
    const response = await proxy(buildRequest({ sessionToken: "token-does-not-exist" }));
    assert.ok(refused(response), `expected 401, got ${response.status}`);
  });

  // --- admissions ------------------------------------------------------------

  await check("the correct bearer token passes, with no session", async () => {
    requestLog = [];
    const response = await proxy(
      buildRequest({ bearer: "correct-horse-battery-staple" })
    );
    assert.ok(admitted(response), `expected admission, got ${response.status}`);
    // The bearer path must cost no Supabase round trip.
    assert.deepEqual(requestLog, [], "the token path must not call Supabase");
  });

  await check("an internal administrator session passes", async () => {
    const response = await proxy(buildRequest({ sessionToken: "token-internal-admin" }));
    assert.ok(
      admitted(response),
      `an internal admin session must open /internal, got ${response.status}`
    );
  });

  await check("the session path proves identity against partner_users", async () => {
    requestLog = [];
    await proxy(buildRequest({ sessionToken: "token-internal-admin" }));
    assert.ok(
      requestLog.includes("/auth/v1/user"),
      "the gate must establish who the session belongs to"
    );
    assert.ok(
      requestLog.includes("/rest/v1/partner_users"),
      "the gate must check the identity, not merely that a session exists"
    );
  });

  // --- carve-outs, exactly as wide as before ---------------------------------

  await check("the invite carve-out still allows only POST to that one path", async () => {
    const post = await proxy(
      buildRequest({ pathname: "/internal/partner-users/invite", method: "POST" })
    );
    assert.ok(admitted(post), "POST to the invite path must pass, as it did before");

    // Same path, different method: back behind the gate.
    const get = await proxy(
      buildRequest({ pathname: "/internal/partner-users/invite", method: "GET" })
    );
    assert.ok(refused(get), "GET on the invite path must not be carved out");

    // A neighbouring path must not inherit the carve-out.
    const sibling = await proxy(
      buildRequest({ pathname: "/internal/partner-users/invite/extra", method: "POST" })
    );
    assert.ok(refused(sibling), "the carve-out must not extend to subpaths");
    const other = await proxy(
      buildRequest({ pathname: "/internal/partner-users/new", method: "POST" })
    );
    assert.ok(refused(other), "the carve-out must not extend to sibling paths");
  });

  await check("the content carve-out still covers exactly /internal/content", async () => {
    for (const pathname of ["/internal/content", "/internal/content/articles"]) {
      const response = await proxy(buildRequest({ pathname }));
      assert.ok(
        admitted(response),
        `${pathname} passed the gate before this change and must still pass`
      );
    }
    // A path that merely starts with the same letters must not be carved out.
    const lookalike = await proxy(buildRequest({ pathname: "/internal/contentx" }));
    assert.ok(refused(lookalike), "the content carve-out must not match a prefix");
  });

  await check("a non-internal path is untouched", async () => {
    const response = await proxy(buildRequest({ pathname: "/partner/dashboard" }));
    assert.ok(!refused(response), "the gate must only guard /internal");
  });

  // --- constant-time comparison, asserted against the implementation ---------

  /**
   * Asserted structurally rather than by timing measurement: a wall-clock test
   * on a shared runner is noise, and what actually matters is that the code
   * cannot short-circuit. Both sides are hashed to a fixed length and every byte
   * is folded into one accumulator.
   */
  await check("the token comparison cannot short-circuit", () => {
    const source = read("src/proxy.ts");
    const fn = source.match(/async function bearerTokenMatches[\s\S]*?\n}\n/)?.[0];
    assert.ok(fn, "the bearer check must be one named function");

    assert.ok(
      !/token\s*!==\s*configuredToken/.test(source),
      "the raw non-constant-time comparison must be gone"
    );
    assert.ok(
      !/presented\s*===\s*configuredToken|presented\s*!==\s*configuredToken/.test(fn),
      "the presented token must never be compared directly"
    );
    assert.ok(fn.includes("sha256Bytes("), "both sides must be hashed first");
    assert.ok(
      /difference \|= presentedDigest\[index\] \^ configuredDigest\[index\]/.test(fn),
      "every byte must be folded into one accumulator"
    );
    assert.ok(
      !/return\s+false;[\s\S]*for \(let index/.test(
        fn.slice(fn.indexOf("for (let index"))
      ),
      "the comparison loop must not return early"
    );
    assert.ok(
      /return difference === 0;/.test(fn),
      "the result must come from the accumulator alone"
    );
    // A length test on the raw values would itself leak the secret's length.
    assert.ok(
      !/presented\.length\s*[=!]==\s*configuredToken\.length/.test(fn),
      "no raw length comparison may gate the check"
    );
  });

  await check("the digest helper hashes with SHA-256 over the whole value", () => {
    const source = read("src/proxy.ts");
    const fn = source.match(/async function sha256Bytes[\s\S]*?\n}\n/)?.[0];
    assert.ok(fn);
    assert.ok(fn.includes('crypto.subtle.digest("SHA-256"'));
    assert.ok(fn.includes("new TextEncoder().encode(value)"));
  });

  // --- the application checks are still there --------------------------------

  /**
   * The regression this fix could have introduced: the proxy learning to accept
   * a session while some page underneath has no check of its own. Nothing
   * asserted this before, which is how two such pages survived.
   */
  await check("every internal page has an application-level gate", () => {
    const GATES = [
      "resolveInternalAdminPageAccess",
      "requireInternalAdminSession",
      "requireInternalAdminRouteAccess",
      "requireInternalOnboardingContext",
      "resolveContentPageAccess",
      "requireContentCapability",
      "denyUnlessContentCapability",
      "resolveContentSession",
      "listPilotRequestsForInternalAdmin"
    ];
    const pages = listPages(path.join(rootDir, "src/app/internal"));
    assert.ok(pages.length >= 38, `expected the internal surface, found ${pages.length}`);

    const ungated = pages.filter((file) => {
      const source = fs.readFileSync(file, "utf8");
      return !GATES.some((gate) => source.includes(gate));
    });
    assert.deepEqual(
      ungated.map((file) => path.relative(rootDir, file)),
      [],
      "an internal page with no application-level check is reachable by anyone the proxy admits"
    );
  });

  await check("the two newly gated pages use the shared gate", () => {
    for (const file of [
      "src/app/internal/partners/data/page.tsx",
      "src/app/internal/partners/supabase-check/page.tsx"
    ]) {
      const source = read(file);
      assert.ok(
        source.includes("resolveInternalAdminPageAccess("),
        `${file} must resolve internal admin access`
      );
      assert.ok(
        source.includes("<InternalAdminDenied"),
        `${file} must render the denied state rather than its own`
      );
      assert.ok(
        !source.includes("Auth will be added before production"),
        `${file} must not still promise authorization it now has`
      );
    }
  });

  await check("the proxy did not become the only check anywhere", () => {
    const gate = read("src/lib/partners/internal-admin-gate.tsx");
    // The application gate is untouched: still session-derived, still redirecting
    // an unauthenticated viewer and denying an unauthorized one.
    assert.ok(gate.includes("await requireInternalAdminSession()"));
    assert.ok(gate.includes('redirect(`/sign-in?next=${encodeURIComponent(nextPath)}`)'));
    assert.ok(gate.includes('kind: "denied"'));

    const session = read("src/lib/partners/session-partner.ts");
    assert.ok(session.includes('.eq("status", "active")'));
    assert.ok(session.includes("rows.length > 1"), "ambiguity must still be refused");
    assert.ok(
      session.includes('row.partner_slug !== null'),
      "a partner-scoped internal admin must still be refused"
    );
  });
} finally {
  stub.close();
}

function listPages(directory) {
  const found = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      found.push(...listPages(full));
    } else if (entry.name === "page.tsx") {
      found.push(full);
    }
  }
  return found;
}

console.log(`\nInternal admin browser access: ${passed}/${passed} checks passed.`);
