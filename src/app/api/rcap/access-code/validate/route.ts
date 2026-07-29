import { NextRequest, NextResponse } from "next/server";
import { getSafeRequestId, logSecurityInfo, logSecurityWarn } from "@/lib/observability/logger";
import { checkAccessCodeValidationRateLimit } from "@/lib/partners/access-code-validation-rate-limit";
import { PartnerAccessCodeError, validatePartnerAccessCode } from "@/lib/partners/partner-access-codes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ROUTE = "/api/rcap/access-code/validate";

// Public, unauthenticated code check. Returns a minimal status only (valid +
// reason category + campaign name). Never lists codes and never reveals a hash.
export async function POST(request: NextRequest) {
  const requestId = getSafeRequestId(request);

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const partnerSlug = typeof body.partnerSlug === "string" ? body.partnerSlug.trim() : "";
  const code = typeof body.code === "string" ? body.code : "";
  if (!partnerSlug || !code) {
    return NextResponse.json({ error: "partnerSlug and code are required." }, { status: 400 });
  }

  const clientIp = (request.headers.get("x-forwarded-for") ?? "unknown").split(",")[0]!.trim();
  const rate = checkAccessCodeValidationRateLimit(`${partnerSlug}:${clientIp}`);
  if (!rate.ok) {
    logSecurityWarn({ event: "access code validate rate limited", route: ROUTE, outcome: "rate_limited", requestId });
    return NextResponse.json(
      { error: "Too many attempts. Please wait a moment and try again." },
      { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds ?? 60) } }
    );
  }

  try {
    const result = await validatePartnerAccessCode(partnerSlug, code);
    logSecurityInfo({ event: "access code validated", route: ROUTE, outcome: result.valid ? "valid" : "invalid", requestId });
    // Deliberately minimal payload.
    return NextResponse.json({
      valid: result.valid,
      reason: result.valid ? undefined : result.reason,
      campaignName: result.valid ? result.campaignName : undefined
    });
  } catch (error) {
    if (error instanceof PartnerAccessCodeError && error.code === "supabase_unconfigured") {
      return NextResponse.json({ error: "Validation is temporarily unavailable." }, { status: 503 });
    }
    // Never leak internals through the public boundary.
    logSecurityWarn({ event: "access code validate failed", route: ROUTE, outcome: "error", requestId });
    return NextResponse.json({ valid: false, reason: "invalid" }, { status: 200 });
  }
}
