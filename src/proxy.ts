import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { isRcapPartnerOnboardingEnabled } from "@/lib/partners/onboarding/feature";
import { shouldUseStaticWeMustVoteLanding } from "@/lib/partners/we-must-vote-routing";
import { getSupabasePublicConfig } from "@/lib/supabase/config";

export async function proxy(request: NextRequest) {
  const hostRouting = routePublicProductHost(request);
  if (hostRouting) {
    return hostRouting;
  }

  if (shouldUseStaticWeMustVoteLanding(request.nextUrl.pathname, request.headers.get("host"))) {
    return NextResponse.rewrite(new URL("/wemustvote-landing.html", request.url));
  }

  if (request.nextUrl.pathname === "/legalease") {
    return NextResponse.rewrite(new URL("/static/legalease/index.html", request.url));
  }

  if (isAuthSessionPath(request.nextUrl.pathname)) {
    return refreshSupabaseSession(request);
  }

  if (isContentCmsPath(request.nextUrl.pathname)) {
    return refreshSupabaseSession(request);
  }

  if (!request.nextUrl.pathname.startsWith("/internal")) {
    return NextResponse.next();
  }

  if (request.nextUrl.pathname === "/internal/partner-users/invite" && request.method === "POST") {
    return refreshSupabaseSession(request);
  }

  const configuredToken = process.env.INTERNAL_ADMIN_ACCESS_TOKEN;

  // Unchanged: outside production with no token configured, the gate is inert.
  // Local development and the acceptance harnesses depend on this, and the
  // application's own internal-admin checks still run on every page underneath.
  if (process.env.NODE_ENV !== "production" && !configuredToken) {
    return NextResponse.next();
  }

  // The bearer path first, because it costs no network round trip. Scripts and
  // tooling that already send the token keep working exactly as before.
  if (configuredToken && (await bearerTokenMatches(request, configuredToken))) {
    return NextResponse.next();
  }

  // The session path. A browser cannot attach an Authorization header to a page
  // navigation, so without this an internal administrator has no way in at all.
  // This is the outer door only: every page underneath still runs its own
  // internal-admin check, and that check remains authoritative.
  if (await hasInternalAdminSession(request)) {
    return refreshSupabaseSession(request);
  }

  return unauthorized();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\..*).*)",
    // The catch-all above excludes any path containing a dot, so the RSS feeds would never reach
    // the proxy and would 404 on the public hosts even though the allowlist maps them. They are
    // matched explicitly.
    "/blog/feed.xml",
    "/insights/feed.xml"
  ]
};

function routePublicProductHost(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  if (isStaticOrFrameworkPath(pathname)) {
    return null;
  }

  const host = normalizeHost(request.headers.get("host"));
  const canonicalHost = canonicalPublicHost(host);

  if (canonicalHost && canonicalHost !== host) {
    const url = request.nextUrl.clone();
    url.hostname = canonicalHost;
    return NextResponse.redirect(url, 308);
  }

  if (isPassthroughPath(pathname)) {
    return null;
  }

  const mappedPath = productPathForHost(host, pathname);
  if (!mappedPath || mappedPath === pathname) {
    return null;
  }

  const url = request.nextUrl.clone();
  url.pathname = mappedPath;
  if (host === "cleartherecord.org" && pathname === "/") {
    return NextResponse.redirect(url, 307);
  }

  return NextResponse.rewrite(url);
}

function normalizeHost(hostHeader: string | null) {
  return (hostHeader ?? "").split(":")[0]?.toLowerCase() ?? "";
}

function canonicalPublicHost(host: string) {
  const canonicalHosts: Record<string, string> = {
    "www.legaleasepartner.com": "legaleasepartner.com",
    "www.expungement.ai": "expungement.ai",
    "www.legalease.com": "legalease.com",
    "www.legalease.law": "legalease.law",
    "www.cleartherecord.org": "cleartherecord.org"
  };

  return canonicalHosts[host] ?? null;
}

function productPathForHost(host: string, pathname: string) {
  if (host === "legaleasepartner.com") {
    return legalEasePartnerPath(pathname);
  }

  if (host === "expungement.ai") {
    return expungementAiPath(pathname);
  }

  if (host === "legalease.com" || host === "legalease.law") {
    return legalEasePath(pathname);
  }

  if (host === "cleartherecord.org") {
    return pathname === "/" ? "/internal/command-center/readiness" : null;
  }

  return null;
}

function expungementAiPath(pathname: string) {
  const cleanPaths = new Set([
    "/",
    "/screening",
    "/start",
    "/check",
    // NOTE: "/results" is intentionally omitted. It is an orphaned legacy route that nothing in
    // the funnel links to (the live screening flow renders results inline). Its server adapter
    // `runExpungementAiEligibilityCheck` is stale and 500s on every hit, so it is dropped from the
    // consumer allowlist to 404 instead. The dead route + adapter should be removed later.
    "/pay",
    "/packet-ready",
    "/pricing",
    "/contact",
    "/support",
    "/sign-in",
    "/how-it-works",
    // Shared content platform (phase 43): the editorial hub and the state-resource directory.
    "/blog",
    "/resources",
    "/blog/feed.xml"
  ]);

  if (pathname.startsWith("/screening/")) {
    return `/expungement-ai${pathname}`;
  }

  // State landing pages: expungement.ai/states/<stateSlug> → /expungement-ai/states/<stateSlug>.
  // Mirrors the /screening/ wildcard: only sub-paths are exposed (there is no /states index page).
  if (pathname.startsWith("/states/")) {
    return `/expungement-ai${pathname}`;
  }

  // Content platform article, author, and per-jurisdiction resource pages. Same wildcard shape as
  // /states/: only sub-paths are exposed, so /authors with no slug 404s rather than rendering an index.
  if (
    pathname.startsWith("/blog/") ||
    pathname.startsWith("/authors/") ||
    pathname.startsWith("/resources/")
  ) {
    return `/expungement-ai${pathname}`;
  }

  if (!cleanPaths.has(pathname)) {
    return null;
  }

  return pathname === "/" ? "/expungement-ai" : `/expungement-ai${pathname}`;
}

/**
 * LegalEase Partner public surface. Historically this host exposed only "/" (the static partner
 * landing page); phase 43 adds the partner-facing editorial surface. The shape deliberately mirrors
 * expungementAiPath(): an exact-match allowlist for index pages plus explicit wildcard prefixes, so
 * an internal /partners/* route cannot be reached from the public host unless it is listed here.
 */
function legalEasePartnerPath(pathname: string) {
  const cleanPaths = new Set([
    "/",
    "/insights",
    "/partner-stories",
    "/resources",
    "/insights/feed.xml"
  ]);

  if (
    pathname.startsWith("/insights/") ||
    pathname.startsWith("/partner-stories/") ||
    pathname.startsWith("/authors/")
  ) {
    return `/partners${pathname}`;
  }

  if (!cleanPaths.has(pathname)) {
    return null;
  }

  return pathname === "/" ? "/partners" : `/partners${pathname}`;
}

function legalEasePath(pathname: string) {
  const cleanPaths = new Set(["/", "/contact", "/waitlist", "/terms", "/disclaimer"]);
  if (!cleanPaths.has(pathname)) {
    return null;
  }

  return pathname === "/" ? "/static/legalease/index.html" : `/legalease${pathname}`;
}

function isStaticOrFrameworkPath(pathname: string) {
  return pathname.startsWith("/_next/") ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/static/") ||
    pathname === "/favicon.ico" ||
    pathname.startsWith("/favicon") ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml" ||
    isAssetPath(pathname);
}

function isAssetPath(pathname: string) {
  return /\.(?:avif|css|gif|ico|jpeg|jpg|js|json|map|mp3|mp4|pdf|png|svg|txt|webmanifest|webp|woff|woff2)$/i.test(pathname);
}

function isPassthroughPath(pathname: string) {
  return pathname.startsWith("/api/") ||
    ((pathname.startsWith("/expungement-ai") || pathname.startsWith("/legalease")) &&
      pathname !== "/expungement-ai" && pathname !== "/legalease") ||
    pathname === "/partners" ||
    pathname.startsWith("/partners/") ||
    pathname.startsWith("/p/") ||
    pathname === "/briefcase" ||
    pathname.startsWith("/briefcase/");
}

/**
 * Constant-time bearer check.
 *
 * Both sides are hashed first so the comparison always operates on two 32-byte
 * digests: a raw comparison would have to test length first, and that test
 * leaks the length of the configured secret. This is the same construction the
 * Node route handlers use with crypto.timingSafeEqual — see
 * src/app/api/content/scheduler/run/route.ts — expressed with Web Crypto,
 * because a proxy runs in the edge runtime where node:crypto is unavailable.
 * The final compare accumulates XOR over every byte and never short-circuits.
 */
async function bearerTokenMatches(request: NextRequest, configuredToken: string) {
  const header =
    request.headers.get("Authorization") ?? request.headers.get("authorization") ?? "";
  const match = /^bearer\s+(.+)$/i.exec(header.trim());
  const presented = match?.[1]?.trim();
  if (!presented) {
    return false;
  }

  const [presentedDigest, configuredDigest] = await Promise.all([
    sha256Bytes(presented),
    sha256Bytes(configuredToken)
  ]);

  let difference = 0;
  for (let index = 0; index < presentedDigest.length; index += 1) {
    difference |= presentedDigest[index] ^ configuredDigest[index];
  }

  return difference === 0;
}

async function sha256Bytes(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return new Uint8Array(digest);
}

/**
 * Whether the request carries a session belonging to an internal administrator.
 *
 * This deliberately mirrors the rules resolveSessionPartner() enforces — exactly
 * one active partner_users row, role internal_admin, and no partner slug on it —
 * rather than inventing a looser edge-only notion of the same thing. It cannot
 * call that module: it is server-only and reads cookies through next/headers,
 * neither of which a proxy has. It is a coarse admission check; the page it
 * admits still resolves the identity itself and can still deny.
 */
async function hasInternalAdminSession(request: NextRequest) {
  let config: { url: string; anonKey: string };
  try {
    config = getSupabasePublicConfig();
  } catch {
    // No Supabase configuration means no session can be proven either way.
    return false;
  }

  const supabase = createServerClient(config.url, config.anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      // Read-only probe. Cookie refresh is left to refreshSupabaseSession(),
      // which runs only once the request has actually been admitted.
      setAll() {}
    }
  });

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return false;
  }

  const { data, error } = await supabase
    .from("partner_users")
    .select("auth_user_id, partner_slug, role, status")
    .eq("auth_user_id", userData.user.id)
    .eq("status", "active")
    .limit(2);

  if (error) {
    return false;
  }

  const rows = (data ?? []) as Array<{
    auth_user_id: string;
    partner_slug: string | null;
    role: string;
    status: string;
  }>;

  // More than one active identity is ambiguous and is refused, exactly as
  // resolveSessionPartner() refuses it.
  if (rows.length !== 1) {
    return false;
  }

  const row = rows[0];
  return (
    row.auth_user_id === userData.user.id &&
    row.status === "active" &&
    row.role === "internal_admin" &&
    row.partner_slug === null
  );
}

function unauthorized() {
  return new NextResponse("Internal admin access token required.", {
    status: 401,
    headers: {
      "Content-Type": "text/plain"
    }
  });
}

function isAuthSessionPath(pathname: string) {
  if (
    isRcapPartnerOnboardingEnabled() &&
    (pathname === "/partner" || pathname.startsWith("/partner/"))
  ) {
    return true;
  }

  return pathname === "/sign-in" ||
    pathname === "/sign-out" ||
    pathname === "/briefcase" ||
    pathname.startsWith("/briefcase/") ||
    pathname === "/partner/dashboard" ||
    pathname.startsWith("/partner/dashboard/");
}

function isContentCmsPath(pathname: string) {
  return pathname === "/internal/content" || pathname.startsWith("/internal/content/");
}

async function refreshSupabaseSession(request: NextRequest) {
  const { url, anonKey } = getSupabasePublicConfig();
  let response = nextWithRequest(request);

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: Array<{ name: string; value: string; options: CookieOptions }>, headers: Record<string, string> = {}) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }

        response = nextWithRequest(request);

        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }

        for (const [name, value] of Object.entries(headers)) {
          response.headers.set(name, value);
        }
      }
    }
  });

  await supabase.auth.getUser();

  return response;
}

function nextWithRequest(request: NextRequest) {
  return NextResponse.next({
    request: {
      headers: request.headers
    }
  });
}
