/**
 * Content platform — live browser verification.
 *
 * Boots `next dev`, drives real pages with Playwright, screenshots them, and asserts what is
 * actually on screen. This exercises the routes end to end rather than trusting that the files exist.
 *
 * Host routing is INERT on localhost (normalizeHost("localhost:3000") matches no branch in
 * src/proxy.ts), so public pages are driven through their INTERNAL paths, and the host-rewrite
 * behaviour is checked separately with a spoofed Host header via fetch.
 *
 * HONESTY: this script does NOT log into the CMS. Without real Supabase credentials there is no
 * authenticated session to establish, so it asserts the SIGNED-OUT behaviour of the admin surface
 * (redirect to /sign-in) and does not claim authenticated coverage.
 */

import { spawn } from "node:child_process";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const shotDir = path.join(rootDir, ".screenshots", "content-platform");
const PORT = process.env.CONTENT_VISUAL_PORT ?? "3178";
const BASE = `http://127.0.0.1:${PORT}`;

const failures = [];
const checks = [];

fs.mkdirSync(shotDir, { recursive: true });

const server = spawn("npx", ["next", "dev", "--port", PORT], {
  cwd: rootDir,
  env: {
    ...process.env,
    // Dummy Supabase config: the pages must render an honest empty state, not crash, when the
    // content tables are unreachable. That is exactly the state we want to verify.
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "local-anon-key",
    NODE_ENV: "development"
  },
  stdio: ["ignore", "pipe", "pipe"]
});

let serverLog = "";
server.stdout.on("data", (chunk) => {
  serverLog += chunk.toString();
});
server.stderr.on("data", (chunk) => {
  serverLog += chunk.toString();
});

try {
  await waitForServer(`${BASE}/expungement-ai/resources`, 120_000);

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  // --- Public: Expungement.ai ---------------------------------------------------------------------

  await visit(page, "/expungement-ai/blog", "expungement-blog-index", async () => {
    const body = await page.textContent("body");
    assert(!/Application error|Unhandled Runtime Error/i.test(body ?? ""), "Blog index must not crash.");
  });

  await visit(page, "/expungement-ai/resources", "expungement-resources-hub", async () => {
    const body = (await page.textContent("body")) ?? "";
    assert(body.includes("Texas"), "The resources hub must list Texas.");
    assert(body.includes("Mississippi"), "The resources hub must list Mississippi.");
    const links = await page.locator('a[href*="/resources/"]').count();
    assert(links >= 51, `The resources hub must link all 51 jurisdictions (found ${links}).`);
  });

  await visit(page, "/expungement-ai/resources/california", "expungement-resource-california", async () => {
    const body = (await page.textContent("body")) ?? "";
    assert(body.includes("California"), "The California resource page must name the state.");
    assertCopySafe(body, "California resource page");
    assertNoInternalMarkers(body, "California resource page");
  });

  await visit(page, "/expungement-ai/resources/district-of-columbia", "expungement-resource-dc", async () => {
    const body = (await page.textContent("body")) ?? "";
    assert(
      body.includes("District of Columbia") || body.includes("Washington"),
      "The DC resource page must name the District of Columbia."
    );
    assertCopySafe(body, "DC resource page");
  });

  // Mobile layout — the reading experience has to survive a phone.
  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await visit(mobile, "/expungement-ai/resources/texas", "expungement-resource-texas-mobile", async () => {
    const overflow = await mobile.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
    );
    assert(!overflow, "The Texas resource page must not scroll horizontally on a 390px viewport.");
  });
  await mobile.close();

  // --- Public: LegalEase Partner ---------------------------------------------------------------------

  await visit(page, "/partners/insights", "partner-insights-index", async () => {
    const body = (await page.textContent("body")) ?? "";
    assert(!/Application error|Unhandled Runtime Error/i.test(body), "Partner insights must not crash.");
  });

  await visit(page, "/partners/partner-stories", "partner-stories-index", async () => {
    const body = (await page.textContent("body")) ?? "";
    assert(!/Application error|Unhandled Runtime Error/i.test(body), "Partner stories must not crash.");
  });

  await visit(page, "/partners/resources", "partner-resources-directory", async () => {
    const body = (await page.textContent("body")) ?? "";
    assert(!/Application error|Unhandled Runtime Error/i.test(body), "Partner resources must not crash.");
    // The partner directory must point at the CANONICAL expungement.ai pages, not duplicate them.
    const canonicalLinks = await page.locator('a[href*="expungement.ai/resources/"]').count();
    assert(
      canonicalLinks > 0,
      "The partner resource directory must link to canonical expungement.ai state resources."
    );
  });

  // --- Admin: signed-out denial ------------------------------------------------------------------------

  await page.goto(`${BASE}/internal/content`, { waitUntil: "domcontentloaded" });
  await page.screenshot({ path: path.join(shotDir, "admin-signed-out.png"), fullPage: true });
  const adminUrl = page.url();
  const adminBody = (await page.textContent("body")) ?? "";
  assert(
    adminUrl.includes("/sign-in") || /access denied|not authorized/i.test(adminBody),
    `An unauthenticated visit to /internal/content must redirect to sign-in or deny (landed on ${adminUrl}).`
  );
  checks.push("PASS: /internal/content denies an unauthenticated visitor");

  // --- API auth boundaries -----------------------------------------------------------------------------

  const postsRes = await fetch(`${BASE}/api/internal/content/posts`);
  assert(
    postsRes.status === 401 || postsRes.status === 403 || postsRes.status === 503,
    `GET /api/internal/content/posts must deny an unauthenticated caller (got ${postsRes.status}).`
  );
  checks.push(`PASS: internal content API denies unauthenticated (${postsRes.status})`);

  const cardRes = await fetch(`${BASE}/api/content/social-card?template=editorial_cover&size=og`);
  assert(
    cardRes.status === 401 || cardRes.status === 403,
    `/api/content/social-card can expose draft titles and must require a content session (got ${cardRes.status}).`
  );
  checks.push(`PASS: social-card requires a content session (${cardRes.status})`);

  const schedRes = await fetch(`${BASE}/api/content/scheduler/run`, { method: "POST" });
  assert(
    schedRes.status === 401 || schedRes.status === 503,
    `The scheduler must reject an unauthenticated POST (got ${schedRes.status}).`
  );
  checks.push(`PASS: scheduler rejects unauthenticated POST (${schedRes.status})`);

  const statusRes = await fetch(`${BASE}/api/content/command-center/status`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ campaign_id: "x", channel: "linkedin", delivery_status: "published" })
  });
  assert(
    statusRes.status === 401,
    `An UNSIGNED Command Center status callback must be rejected with 401 (got ${statusRes.status}).`
  );
  checks.push("PASS: unsigned Command Center status callback rejected with 401");

  // --- Host routing (the proxy is inert on localhost, so we must spoof the Host header) ---------------------
  //
  // NOTE: Node's fetch() treats Host as a forbidden header and SILENTLY DROPS it, so a fetch-based
  // check here would quietly assert nothing. These go through node:http, which does send it.

  const blogOnHost = await requestWithHost("/blog", "expungement.ai");
  assert(
    blogOnHost.status === 200,
    `expungement.ai/blog must rewrite to /expungement-ai/blog and return 200 (got ${blogOnHost.status}).`
  );
  checks.push("PASS: Host: expungement.ai → /blog rewrites and serves 200");

  const insightsOnHost = await requestWithHost("/insights", "legaleasepartner.com");
  assert(
    insightsOnHost.status === 200,
    `legaleasepartner.com/insights must rewrite to /partners/insights (got ${insightsOnHost.status}).`
  );
  checks.push("PASS: Host: legaleasepartner.com → /insights rewrites and serves 200");

  const resourcesOnHost = await requestWithHost("/resources/texas", "expungement.ai");
  assert(
    resourcesOnHost.status === 200,
    `expungement.ai/resources/texas must rewrite and serve 200 (got ${resourcesOnHost.status}).`
  );
  checks.push("PASS: Host: expungement.ai → /resources/texas rewrites and serves 200");

  // The RSS feeds contain a dot, and the proxy matcher excludes dotted paths by default — they are
  // matched explicitly. Without that, these 404 on the live domains while working locally.
  for (const [label, host, feedPath] of [
    ["expungement blog RSS", "expungement.ai", "/blog/feed.xml"],
    ["partner insights RSS", "legaleasepartner.com", "/insights/feed.xml"]
  ]) {
    const res = await requestWithHost(feedPath, host);
    assert(res.status === 200, `${label} must serve 200 on its public host (got ${res.status}).`);
    assert(
      res.body.includes("<rss") || res.body.includes("<feed"),
      `${label} must return a real feed document on its public host.`
    );
    checks.push(`PASS: ${label} serves a valid feed on ${host}`);
  }

  // A path NOT on the allowlist must not serve the CMS on a public host.
  const cmsOnPublicHost = await requestWithHost("/internal/content", "expungement.ai");
  assert(
    !cmsOnPublicHost.body.includes("Content platform") || cmsOnPublicHost.status !== 200,
    "The CMS must not be reachable through the public expungement.ai host."
  );
  checks.push("PASS: the CMS is not served on the public expungement.ai host");

  await browser.close();
} catch (error) {
  failures.push(error instanceof Error ? (error.stack ?? error.message) : String(error));
} finally {
  server.kill("SIGTERM");
}

if (failures.length) {
  console.error("Content platform visual verification failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  if (process.env.CONTENT_VISUAL_DEBUG) {
    console.error("--- dev server log ---");
    console.error(serverLog.slice(-4000));
  }
  process.exit(1);
}

console.log("Content platform visual verification passed.");
for (const check of checks) console.log(check);
console.log(`Screenshots written to .screenshots/content-platform/`);
console.log("NOT VERIFIED: authenticated CMS flows. No real Supabase session was established, so this");
console.log("  script asserts only the signed-out denial behaviour of the admin surface.");

// --- helpers --------------------------------------------------------------------------------------------------

async function visit(page, route, shot, assertions) {
  const response = await page.goto(`${BASE}${route}`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  const status = response?.status() ?? 0;
  assert(status === 200, `${route} must return 200 (got ${status}).`);
  await page.screenshot({ path: path.join(shotDir, `${shot}.png`), fullPage: true });
  if (status === 200 && assertions) {
    await assertions();
  }
  checks.push(`PASS: ${route} rendered 200 → ${shot}.png`);
}

/** The copy rules every public record-clearing page must obey. */
function assertCopySafe(body, label) {
  const required = ["not a law firm", "self-help", "final decision", "may be available"];
  for (const phrase of required) {
    assert(
      body.toLowerCase().includes(phrase.toLowerCase()),
      `${label} must contain the required disclaimer phrase "${phrase}".`
    );
  }

  // Outcome-promise vocabulary is forbidden. "may be available" is the sanctioned phrasing.
  const banned = ["you qualify", "you are eligible", "guaranteed", "we approve", "legal advice for"];
  for (const phrase of banned) {
    assert(
      !body.toLowerCase().includes(phrase),
      `${label} must not contain the outcome-promise phrase "${phrase}".`
    );
  }
}

function assertNoInternalMarkers(body, label) {
  const markers = ["copyGuardrails", "sha256", "SOURCE FILE", "train Wilma", "lawrenceRatification", "orderedDecisionRules"];
  for (const marker of markers) {
    assert(
      !body.toLowerCase().includes(marker.toLowerCase()),
      `${label} leaked the internal engine marker "${marker}" into the rendered page.`
    );
  }
}

/**
 * Issue a request with an explicit Host header. Node's fetch() forbids setting Host and drops it
 * without error, which would make every host-routing assertion silently vacuous — so this goes
 * through node:http, which sends what it is told.
 */
function requestWithHost(pathname, host) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      { hostname: "127.0.0.1", port: Number(PORT), path: pathname, method: "GET", headers: { Host: host } },
      (res) => {
        let body = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => {
          body += chunk;
        });
        res.on("end", () => resolve({ status: res.statusCode ?? 0, body }));
      }
    );
    req.on("error", reject);
    req.end();
  });
}

async function waitForServer(url, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url);
      if (res.status < 500) return;
    } catch {
      // not up yet
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`Dev server did not become ready at ${url} within ${timeoutMs}ms.\n${serverLog.slice(-2000)}`);
}

function assert(condition, message) {
  if (!condition) failures.push(message);
}
