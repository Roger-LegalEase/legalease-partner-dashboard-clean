import { NextResponse, type NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  if (request.nextUrl.pathname === "/p/we-must-vote") {
    return NextResponse.rewrite(new URL("/wemustvote-landing.html", request.url));
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
  matcher: ["/internal/:path*", "/p/we-must-vote"]
};

function unauthorized() {
  return new NextResponse("Internal admin access token required.", {
    status: 401,
    headers: {
      "Content-Type": "text/plain"
    }
  });
}
