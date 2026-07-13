/**
 * Content platform — route, proxy, SEO, and admin-gate coverage (static analysis).
 *
 * This is the cheap, always-on companion to scripts/verify-content-visual.mjs (which boots a real
 * browser). It proves the routes exist, that the public host allowlist actually maps them, that
 * every CMS page gates BEFORE it reads data, and that admin surfaces are noindex.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];

// --- 1. Public routes exist -----------------------------------------------------------------------

const PUBLIC_PAGES = [
  "src/app/expungement-ai/blog/page.tsx",
  "src/app/expungement-ai/blog/[slug]/page.tsx",
  "src/app/expungement-ai/authors/[slug]/page.tsx",
  "src/app/expungement-ai/resources/page.tsx",
  "src/app/expungement-ai/resources/[jurisdiction]/page.tsx",
  "src/app/partners/insights/page.tsx",
  "src/app/partners/insights/[slug]/page.tsx",
  "src/app/partners/partner-stories/page.tsx",
  "src/app/partners/partner-stories/[slug]/page.tsx",
  "src/app/partners/authors/[slug]/page.tsx",
  "src/app/partners/resources/page.tsx"
];

for (const page of PUBLIC_PAGES) {
  assert(exists(page), `Missing public route: ${page}`);
}

const FEEDS = [
  "src/app/expungement-ai/blog/feed.xml/route.ts",
  "src/app/partners/insights/feed.xml/route.ts"
];
for (const feed of FEEDS) {
  assert(exists(feed), `Missing RSS feed route: ${feed}`);
}

// --- 2. The proxy actually maps them ---------------------------------------------------------------

const proxy = read("src/proxy.ts");

for (const marker of [
  '"/blog"',
  '"/resources"',
  'pathname.startsWith("/blog/")',
  'pathname.startsWith("/authors/")',
  'pathname.startsWith("/resources/")'
]) {
  assert(proxy.includes(marker), `src/proxy.ts must map ${marker} for expungement.ai.`);
}

assert(
  proxy.includes("function legalEasePartnerPath"),
  "src/proxy.ts must define legalEasePartnerPath for the partner public surface."
);
for (const marker of ['"/insights"', '"/partner-stories"', 'pathname.startsWith("/insights/")']) {
  assert(proxy.includes(marker), `src/proxy.ts must map ${marker} for legaleasepartner.com.`);
}

// The CMS must never be reachable from a public host allowlist.
assert(
  !/cleanPaths[\s\S]{0,400}"\/internal/.test(proxy),
  "The CMS (/internal) must never appear in a public host allowlist."
);

// --- 3. Every public page has real SEO -------------------------------------------------------------

for (const page of PUBLIC_PAGES) {
  if (!exists(page)) continue;
  const src = read(page);

  assert(
    /export (async )?function generateMetadata|export const metadata/.test(src),
    `${page} must export metadata (title/description/canonical).`
  );
  assert(/canonical/.test(src), `${page} must declare a canonical URL.`);
  assert(/openGraph/.test(src), `${page} must declare Open Graph metadata.`);
}

// Article pages carry Article + Breadcrumb JSON-LD.
for (const page of [
  "src/app/expungement-ai/blog/[slug]/page.tsx",
  "src/app/partners/insights/[slug]/page.tsx",
  "src/app/partners/partner-stories/[slug]/page.tsx"
]) {
  if (!exists(page)) continue;
  const src = read(page);
  assert(/application\/ld\+json|JsonLd/.test(src), `${page} must emit JSON-LD.`);
  assert(/datePublished/.test(src), `${page} must emit datePublished.`);
  assert(/dateModified/.test(src), `${page} must emit dateModified.`);
  assert(/BreadcrumbList/.test(src), `${page} must emit BreadcrumbList JSON-LD.`);
}

// Dynamic public routes must 404 on an unknown slug rather than rendering an empty shell.
for (const page of PUBLIC_PAGES.filter((p) => p.includes("["))) {
  if (!exists(page)) continue;
  assert(read(page).includes("notFound"), `${page} must call notFound() for an unknown slug.`);
}

// The state resource route is static over the approved jurisdiction list only.
const resourcePage = "src/app/expungement-ai/resources/[jurisdiction]/page.tsx";
if (exists(resourcePage)) {
  const src = read(resourcePage);
  assert(src.includes("generateStaticParams"), `${resourcePage} must pre-generate the approved jurisdictions.`);
  assert(
    /dynamicParams\s*=\s*false/.test(src),
    `${resourcePage} must set dynamicParams = false so an unapproved jurisdiction 404s.`
  );
}

// --- 4. Sitemap + robots ----------------------------------------------------------------------------

const sitemap = read("src/app/sitemap.ts");
assert(sitemap.includes("/states/"), "The sitemap must keep the existing state landing pages.");
assert(/blog|resources/.test(sitemap), "The sitemap must include the new content routes.");
assert(exists("src/app/robots.ts"), "Missing src/app/robots.ts.");

const robots = read("src/app/robots.ts");
assert(/\/internal/.test(robots), "robots.ts must disallow the /internal admin surface.");

// --- 5. CMS pages: gate BEFORE data read, and noindex -------------------------------------------------

const cmsDir = path.join(rootDir, "src/app/internal/content");
assert(fs.existsSync(cmsDir), "Missing the CMS at src/app/internal/content.");

const cmsPages = fs.existsSync(cmsDir) ? walk(cmsDir).filter((f) => f.endsWith("page.tsx")) : [];
assert(cmsPages.length >= 10, `Expected at least 10 CMS pages, found ${cmsPages.length}.`);

for (const file of cmsPages) {
  const rel = path.relative(rootDir, file);
  const src = fs.readFileSync(file, "utf8");

  assert(
    src.includes("resolveContentPageAccess"),
    `${rel} must gate on resolveContentPageAccess().`
  );

  // The gate must appear textually before the first data read, mirroring the legacy internal-admin
  // verifier's ordering invariant.
  const gateIndex = src.indexOf("resolveContentPageAccess");
  const readMatch = src.match(/await (list|get|fetch|load)[A-Za-z]*\(/);
  if (gateIndex !== -1 && readMatch?.index !== undefined) {
    assert(
      gateIndex < readMatch.index,
      `${rel} must call resolveContentPageAccess() BEFORE its first data read.`
    );
  }

  // No CMS page may import a Supabase client directly into a client component.
  if (src.includes('"use client"')) {
    assert(
      !/@\/lib\/supabase/.test(src),
      `${rel} is a client component and must not import @/lib/supabase.`
    );
  }
}

const cmsLayout = "src/app/internal/content/layout.tsx";
assert(exists(cmsLayout), "Missing the CMS layout.");
if (exists(cmsLayout)) {
  const src = read(cmsLayout);
  assert(
    /robots[\s\S]{0,120}index:\s*false/.test(src),
    "The CMS layout must set robots noindex — admin surfaces must never be indexed."
  );
}

// --- 6. Internal API routes exist and gate before parsing ----------------------------------------------

const API_ROUTES = [
  "src/app/api/internal/content/posts/route.ts",
  "src/app/api/internal/content/posts/[id]/route.ts",
  "src/app/api/internal/content/posts/[id]/transition/route.ts",
  "src/app/api/internal/content/posts/[id]/versions/route.ts",
  "src/app/api/internal/content/posts/[id]/versions/restore/route.ts",
  "src/app/api/internal/content/media/route.ts",
  "src/app/api/internal/content/media/[id]/route.ts",
  "src/app/api/internal/content/social/[postId]/route.ts",
  "src/app/api/internal/content/promotion/[postId]/export/route.ts",
  "src/app/api/internal/content/promotion/[postId]/send/route.ts",
  "src/app/api/internal/content/state-editorial/[code]/route.ts",
  "src/app/api/internal/content/authors/route.ts",
  "src/app/api/content/scheduler/run/route.ts",
  "src/app/api/content/command-center/status/route.ts",
  "src/app/api/content/social-card/route.ts"
];

for (const route of API_ROUTES) {
  assert(exists(route), `Missing API route: ${route}`);
  if (!exists(route)) continue;
  const src = read(route);

  if (route.includes("/api/internal/content/")) {
    assert(
      src.includes("denyUnlessContentCapability"),
      `${route} must gate on denyUnlessContentCapability().`
    );
    const gateIndex = src.indexOf("denyUnlessContentCapability");
    const bodyIndex = src.indexOf("request.json");
    if (gateIndex !== -1 && bodyIndex !== -1) {
      assert(gateIndex < bodyIndex, `${route} must gate BEFORE parsing the request body.`);
    }
  }
}

// The client can never hand the server HTML — HTML is derived from the structured doc.
const savePost = "src/app/api/internal/content/posts/[id]/route.ts";
if (exists(savePost)) {
  const src = read(savePost);
  assert(
    !/body\.html|input\.html|\.html\s*\?\?/.test(src),
    `${savePost} must never accept an html field from the client — HTML is rendered server-side.`
  );

  const schemaStart = src.indexOf("const patchSchema = z.strictObject({");
  const schemaEnd = src.indexOf("type PostRow", schemaStart);
  const inputSchema = schemaStart >= 0 && schemaEnd > schemaStart ? src.slice(schemaStart, schemaEnd) : "";
  assert(inputSchema.length > 0, `${savePost} must use an explicit strict input allowlist.`);
  for (const forbidden of [
    "legal_approved_at",
    "legal_approved_by",
    "editorial_approved_at",
    "editorial_approved_by",
    "created_by",
    "status",
    "published_at",
    "scheduled_for"
  ]) {
    assert(!inputSchema.includes(forbidden), `${savePost} must not accept client-controlled ${forbidden}.`);
  }
  assert(
    !/\.update\(\s*(input|raw|parsed\.data)\s*\)/.test(src),
    `${savePost} must not spread or pass request JSON directly into content_posts.update().`
  );
}

const createPost = "src/app/api/internal/content/posts/route.ts";
if (exists(createPost)) {
  const src = read(createPost);
  const schemaStart = src.indexOf("const createSchema = z.strictObject({");
  const schemaEnd = src.indexOf("export async function GET", schemaStart);
  const inputSchema = schemaStart >= 0 && schemaEnd > schemaStart ? src.slice(schemaStart, schemaEnd) : "";
  assert(inputSchema.length > 0, `${createPost} must use an explicit strict input allowlist.`);
  for (const forbidden of [
    "legal_approved_at",
    "legal_approved_by",
    "editorial_approved_at",
    "editorial_approved_by",
    "created_by",
    "status",
    "published_at",
    "scheduled_for"
  ]) {
    assert(!inputSchema.includes(forbidden), `${createPost} must not accept client-controlled ${forbidden}.`);
  }
  assert(
    !/\.insert\(\s*(input|raw|parsed\.data)\s*\)/.test(src),
    `${createPost} must not spread or pass request JSON directly into content_posts.insert().`
  );
}

const transitionPost = "src/app/api/internal/content/posts/[id]/transition/route.ts";
if (exists(transitionPost)) {
  const src = read(transitionPost);
  assert(src.includes("evaluateTransition({"), `${transitionPost} must apply the workflow engine before status mutation.`);
  assert(
    src.includes('userClient.rpc("content_apply_legal_review"'),
    `${transitionPost} must perform legal approval through the authenticated RPC, not the service-role update path.`
  );
  assert(
    !/patch\.legal_approved_|patch\[?["']legal_approved_/.test(src),
    `${transitionPost} must never place legal approval fields in its service-role content_posts patch.`
  );
}

// The scheduler must be secret-protected and must not run unprotected.
const scheduler = "src/app/api/content/scheduler/run/route.ts";
if (exists(scheduler)) {
  const src = read(scheduler);
  assert(src.includes("CONTENT_SCHEDULER_SECRET"), `${scheduler} must require CONTENT_SCHEDULER_SECRET.`);
  assert(
    src.includes("timingSafeEqual"),
    `${scheduler} must compare the secret in constant time.`
  );
}

// The inbound status callback must verify a signature.
const status = "src/app/api/content/command-center/status/route.ts";
if (exists(status)) {
  const src = read(status);
  assert(src.includes("verifySignature"), `${status} must verify the HMAC signature.`);
  assert(
    src.includes("request.text()"),
    `${status} must verify against the RAW body text (request.text()), not a re-serialized JSON object.`
  );
}

// --- 7. Analytics events registered -----------------------------------------------------------------------

const events = read("src/lib/analytics/event-names.ts");
for (const event of ["content_article_viewed", "content_cta_clicked", "content_promotion_sent"]) {
  assert(events.includes(event), `Analytics event ${event} must be on the allowlist or it will be dropped with a 400.`);
}
assert(
  /SERVER_ONLY_EVENT_NAMES[\s\S]{0,200}content_promotion_sent/.test(events),
  "content_promotion_sent must be server-only so a browser cannot forge it."
);

// --- report -------------------------------------------------------------------------------------------------

if (failures.length) {
  console.error("Content platform route verification failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Content platform route verification passed.");
console.log(`Routes: ${PUBLIC_PAGES.length} public pages + 2 RSS feeds across both destinations, mapped by the proxy allowlist.`);
console.log(`CMS: ${cmsPages.length} admin pages, each gating before its first data read, noindex at the layout.`);
console.log(`APIs: ${API_ROUTES.length} routes; internal ones gate before parsing the body; no route accepts client HTML.`);
console.log("Scheduler is secret-protected with a constant-time compare; the status callback verifies the raw signed body.");

function exists(rel) {
  return fs.existsSync(path.join(rootDir, rel));
}

function read(rel) {
  return fs.readFileSync(path.join(rootDir, rel), "utf8");
}

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

function assert(condition, message) {
  if (!condition) failures.push(message);
}
