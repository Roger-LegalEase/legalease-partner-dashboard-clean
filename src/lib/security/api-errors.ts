import { NextResponse } from "next/server";
import { reportError } from "@/lib/observability";

export function safeErrorResponse(error: unknown, message = "Unable to complete request.", status = 500): NextResponse {
  void reportError(error, { status, responseMessage: message });

  return NextResponse.json({ error: message }, { status });
}

export function rateLimitedResponse(resetAt: Date): NextResponse {
  return NextResponse.json(
    { error: "Too many requests. Please try again later." },
    {
      status: 429,
      headers: {
        "Retry-After": String(Math.max(1, Math.ceil((resetAt.getTime() - Date.now()) / 1000)))
      }
    }
  );
}
