import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { getSupabasePublicConfig } from "@/lib/supabase/config";

export async function proxy(request: NextRequest) {
  const hostRouting = routePublicProductHost(request);
  if (hostRouting) {
    return hostRouting;
  }

  if (request.nextUrl.pathname === "/p/we-must-vote") {
    return NextResponse.rewrite(new URL("/wemustvote-landing.html", request.url));
  }

  if (request.nextUrl.pathname === "/legalease") {
    return NextResponse.rewrite(new URL("/static/legalease/index.html", request.url));
  }

  if (isAuthSessionPath(request.nextUrl.pathname)) {
    return refreshSupabaseSession(request);
  }

  if (!request.nextUrl.pathname.startsWith("/internal")) {
    return NextResponse.next();
  }

  if (request.nextUrl.pathname === "/internal/partner-users/invite" && request.method === "POST") {
    return refreshSupabaseSession(request);
  }

  const configuredToken = process.env.INTERNAL_ADMIN_ACCESS_TOKEN;

  if (process.env.NODE_ENV !== "production" && !configuredToken) {
    return NextResponse.next();
  }

  if (!configuredToken) {
    return unauthorized();
  }

  const authorizationHeader = request.headers.get("Authorization") ?? request.headers.get("authorization") ?? "";
  const token = authorizationHeader.startsWith("Bearer ") ? authorizationHeader.slice("Bearer ".length).trim() : "";

  if (token !== configuredToken) {
    return unauthorized();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\..*).*)"]
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
    return pathname === "/" ? "/partners" : null;
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
    "/how-it-works"
  ]);

  if (pathname.startsWith("/screening/")) {
    return `/expungement-ai${pathname}`;
  }

  if (!cleanPaths.has(pathname)) {
    return null;
  }

  return pathname === "/" ? "/expungement-ai" : `/expungement-ai${pathname}`;
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

function unauthorized() {
  return new NextResponse("Internal admin access token required.", {
    status: 401,
    headers: {
      "Content-Type": "text/plain"
    }
  });
}

function isAuthSessionPath(pathname: string) {
  return pathname === "/sign-in" ||
    pathname === "/sign-out" ||
    pathname === "/briefcase" ||
    pathname.startsWith("/briefcase/") ||
    pathname === "/partner/dashboard" ||
    pathname.startsWith("/partner/dashboard/");
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
