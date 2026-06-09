import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { getSupabasePublicConfig } from "@/lib/supabase/config";

export async function proxy(request: NextRequest) {
  if (request.nextUrl.pathname === "/p/we-must-vote") {
    return NextResponse.rewrite(new URL("/wemustvote-landing.html", request.url));
  }

  if (isAuthSessionPath(request.nextUrl.pathname)) {
    return refreshSupabaseSession(request);
  }

  if (!request.nextUrl.pathname.startsWith("/internal")) {
    return NextResponse.next();
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
  matcher: ["/internal/:path*", "/p/we-must-vote", "/sign-in", "/briefcase", "/briefcase/:path*", "/sign-out"]
};

function unauthorized() {
  return new NextResponse("Internal admin access token required.", {
    status: 401,
    headers: {
      "Content-Type": "text/plain"
    }
  });
}

function isAuthSessionPath(pathname: string) {
  return pathname === "/sign-in" || pathname === "/sign-out" || pathname === "/briefcase" || pathname.startsWith("/briefcase/");
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
