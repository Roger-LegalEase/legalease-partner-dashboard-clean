import "server-only";

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * Transport rules for the participant privacy routes.
 *
 * Same-origin enforcement is the CSRF control. These routes are cookie
 * authenticated, so a cross-site form post would otherwise carry the
 * participant's session — and the thing on the other end deletes their account.
 * The origin check reuses the rule the partner onboarding routes already
 * enforce, so there is one same-origin rule in this codebase rather than two.
 *
 * A missing Origin header is refused, not waived. Browsers send Origin on every
 * POST; the requests that do not are not browsers, and none of them need to be
 * here.
 */
export { assertSameOrigin, OnboardingRequestError as PrivacyOriginError } from "@/lib/partners/onboarding/request-security";

export const PRIVACY_JSON_BODY_LIMIT_BYTES = 8 * 1024;

export const PRIVACY_RESPONSE_HEADERS = {
  "Cache-Control": "private, no-store, no-cache, must-revalidate, max-age=0",
  Pragma: "no-cache",
  Vary: "Cookie",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "same-origin"
} as const;

export class PrivacyRequestError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status: number
  ) {
    super(message);
    this.name = "PrivacyRequestError";
  }
}

export async function readPrivacyJsonBody(request: NextRequest): Promise<Record<string, unknown>> {
  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.includes("application/json")) {
    throw new PrivacyRequestError("invalid_content_type", "Send this request as JSON.", 415);
  }

  const declared = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(declared) && declared > PRIVACY_JSON_BODY_LIMIT_BYTES) {
    throw new PrivacyRequestError("payload_too_large", "This request is too large.", 413);
  }

  if (!request.body) {
    throw new PrivacyRequestError("invalid_json", "This request had no body.", 400);
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > PRIVACY_JSON_BODY_LIMIT_BYTES) {
        await reader.cancel();
        throw new PrivacyRequestError("payload_too_large", "This request is too large.", 413);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    const parsed = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("object required");
    return parsed as Record<string, unknown>;
  } catch {
    throw new PrivacyRequestError("invalid_json", "This request was not valid JSON.", 400);
  }
}

export function privacyJson(body: Record<string, unknown>, status = 200): NextResponse {
  return NextResponse.json(body, { status, headers: PRIVACY_RESPONSE_HEADERS });
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function requireUuid(value: unknown, field: string): string {
  if (typeof value !== "string" || !UUID_PATTERN.test(value)) {
    throw new PrivacyRequestError("invalid_request", `A valid ${field} is required.`, 400);
  }
  return value.toLowerCase();
}

/**
 * The idempotency key is supplied by the caller and is what makes a
 * double-clicked "Delete my account" one deletion instead of two. It is scoped
 * per user in the database, so one participant's key can never collide with, or
 * reach, another's request.
 */
export function requireIdempotencyKey(value: unknown): string {
  if (typeof value !== "string") {
    throw new PrivacyRequestError("invalid_request", "An idempotency key is required.", 400);
  }
  const trimmed = value.trim();
  if (trimmed.length < 8 || trimmed.length > 200 || !/^[A-Za-z0-9._:-]+$/.test(trimmed)) {
    throw new PrivacyRequestError("invalid_request", "An idempotency key is required.", 400);
  }
  return trimmed;
}

export function privacyClientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    "unknown"
  ).toLowerCase();
}
