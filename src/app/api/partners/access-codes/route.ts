import { NextRequest, NextResponse } from "next/server";
import { getSafeRequestId, logSecurityError, logSecurityInfo, logSecurityWarn } from "@/lib/observability/logger";
import { SessionPartnerError } from "@/lib/partners/session-partner";
import { partnerAuthStatus, resolveAuthorizedPartnerSlug } from "@/lib/partners/partner-scope-auth";
import {
  createPartnerAccessCode,
  getPartnerAccessCodeAnalytics,
  PartnerAccessCodeError,
  PARTNER_ACCESS_CODE_TYPES,
  type PartnerAccessCodeType
} from "@/lib/partners/partner-access-codes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ROUTE = "/api/partners/access-codes";

export async function GET(request: NextRequest) {
  const requestId = getSafeRequestId(request);
  let partnerSlug: string;
  try {
    ({ partnerSlug } = await resolveAuthorizedPartnerSlug(request.nextUrl.searchParams.get("partnerSlug")));
  } catch (error) {
    return authErrorResponse(error, requestId);
  }

  try {
    const analytics = await getPartnerAccessCodeAnalytics(partnerSlug);
    logSecurityInfo({ event: "access codes listed", route: ROUTE, outcome: "ok", requestId });
    return NextResponse.json({ success: true, analytics });
  } catch (error) {
    return accessCodeErrorResponse(error, requestId, "read");
  }
}

export async function POST(request: NextRequest) {
  const requestId = getSafeRequestId(request);

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON." }, { status: 400 });
  }

  let partnerSlug: string;
  try {
    ({ partnerSlug } = await resolveAuthorizedPartnerSlug(typeof body.partnerSlug === "string" ? body.partnerSlug : null));
  } catch (error) {
    return authErrorResponse(error, requestId);
  }

  const rawCode = typeof body.code === "string" ? body.code : "";
  const codeType = normalizeCodeType(body.codeType);

  try {
    const code = await createPartnerAccessCode({
      partnerSlug,
      rawCode,
      campaignName: typeof body.campaignName === "string" ? body.campaignName : null,
      description: typeof body.description === "string" ? body.description : null,
      codeType,
      maxUses: typeof body.maxUses === "number" ? body.maxUses : parseMaxUses(body.maxUses),
      startsAt: typeof body.startsAt === "string" ? body.startsAt : null,
      expiresAt: typeof body.expiresAt === "string" ? body.expiresAt : null,
      createdBy: "partner_admin"
    });
    logSecurityInfo({ event: "access code created", route: ROUTE, outcome: "ok", requestId });
    return NextResponse.json({ success: true, code });
  } catch (error) {
    return accessCodeErrorResponse(error, requestId, "create");
  }
}

function normalizeCodeType(value: unknown): PartnerAccessCodeType {
  return typeof value === "string" && (PARTNER_ACCESS_CODE_TYPES as string[]).includes(value)
    ? (value as PartnerAccessCodeType)
    : "shared";
}

function parseMaxUses(value: unknown): number | null {
  if (typeof value === "string" && /^\d+$/.test(value.trim())) return Number(value.trim());
  return null;
}

function authErrorResponse(error: unknown, requestId: string) {
  if (error instanceof SessionPartnerError) {
    logSecurityWarn({ event: "access code auth denied", route: ROUTE, outcome: error.code, requestId, error });
    return NextResponse.json({ success: false, error: "Access denied." }, { status: partnerAuthStatus(error) });
  }
  logSecurityError({ event: "access code auth error", route: ROUTE, outcome: "error", requestId, error });
  throw error;
}

export function accessCodeErrorResponse(error: unknown, requestId: string, operation: string) {
  if (error instanceof PartnerAccessCodeError) {
    const status =
      error.code === "unknown_partner" || error.code === "not_found"
        ? 404
        : error.code === "invalid_input"
          ? 400
          : error.code === "duplicate_code"
            ? 409
            : error.code === "supabase_unconfigured"
              ? 503
              : 500;
    logSecurityWarn({ event: "access code op failed", route: ROUTE, outcome: error.code, requestId, metadata: { operation } });
    return NextResponse.json({ success: false, error: error.message, code: error.code }, { status });
  }
  logSecurityError({ event: "access code op error", route: ROUTE, outcome: "error", requestId, error });
  throw error;
}
