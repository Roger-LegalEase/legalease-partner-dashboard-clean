import { NextResponse } from "next/server";
import {
  getSafeRequestId,
  logSecurityInfo,
  logSecurityWarn
} from "@/lib/observability/logger";
import { isFirstAdminSameOriginRequest } from "@/lib/partners/first-admin-request-security";
import {
  PartnerProvisioningError,
  provisionPartner
} from "@/lib/partners/partner-provisioning-service";
import { provisioningFailureCopy } from "@/lib/partners/partner-provisioning-domain";
import {
  requireInternalAdminSession,
  SessionPartnerError
} from "@/lib/partners/session-partner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const routeName = "/api/internal/partners/provisioning";

/**
 * The only HTTP entry point for creating a partner tenant. It authorizes,
 * forwards to the canonical service, and translates failures into operator
 * language. It contains no write of its own — a route handler that also knew
 * how to build a tenant would be a second definition of what a tenant is.
 */
export async function POST(request: Request) {
  const requestId = getSafeRequestId(request);
  if (!isFirstAdminSameOriginRequest(request)) {
    logSecurityWarn({
      event: "partner provisioning denied",
      route: routeName,
      outcome: "cross_origin",
      requestId
    });
    return NextResponse.json(
      { ok: false, message: "Invalid request origin." },
      { status: 403 }
    );
  }

  let operatorUserId: string;
  try {
    const session = await requireInternalAdminSession();
    operatorUserId = session.authUserId;
  } catch (error) {
    const unauthenticated =
      error instanceof SessionPartnerError && error.code === "unauthenticated";
    logSecurityWarn({
      event: "partner provisioning denied",
      route: routeName,
      outcome: unauthenticated ? "unauthenticated" : "forbidden",
      requestId,
      error
    });
    // A partner administrator, partner staff member, another tenant's user, and
    // a signed-out visitor all get the same sentence. Nothing here confirms
    // that the surface, or any partner, exists.
    return NextResponse.json(
      {
        ok: false,
        code: unauthenticated ? "unauthenticated" : "forbidden",
        message: unauthenticated
          ? "Authentication required."
          : "This operation is not available for your account."
      },
      { status: unauthenticated ? 401 : 403 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, code: "invalid_input", message: "Invalid request." },
      { status: 400 }
    );
  }
  const values =
    body && typeof body === "object" ? (body as Record<string, unknown>) : {};

  try {
    const result = await provisionPartner({
      operatorUserId,
      values: {
        organizationName: values.organizationName,
        legalOrganizationName: values.legalOrganizationName,
        partnerSlug: values.partnerSlug,
        programName: values.programName,
        programPurpose: values.programPurpose,
        administratorName: values.administratorName,
        administratorEmail: values.administratorEmail,
        clearanceReason: values.clearanceReason,
        idempotencyKey: values.idempotencyKey
      }
    });
    logSecurityInfo({
      event: "partner provisioning succeeded",
      route: routeName,
      outcome: result.created ? "created" : "replayed",
      requestId,
      metadata: {
        action: "partner_provisioning",
        status: result.created ? "created" : "replayed"
      }
    });
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    const known = error instanceof PartnerProvisioningError ? error : null;
    const code = known?.code ?? "write_failed";
    logSecurityWarn({
      event: "partner provisioning failed",
      route: routeName,
      outcome: code,
      requestId,
      error,
      metadata: { action: "partner_provisioning", error_code: code }
    });
    return NextResponse.json(
      {
        ok: false,
        code,
        // Operator copy only. The database message never leaves the service.
        message:
          code === "invalid_input" && known
            ? known.message
            : provisioningFailureCopy(code)
      },
      { status: statusFor(code) }
    );
  }
}

export async function GET(request: Request) {
  const requestId = getSafeRequestId(request);
  try {
    await requireInternalAdminSession();
  } catch (error) {
    const unauthenticated =
      error instanceof SessionPartnerError && error.code === "unauthenticated";
    logSecurityWarn({
      event: "partner provisioning denied",
      route: routeName,
      outcome: unauthenticated ? "unauthenticated" : "forbidden",
      requestId,
      error
    });
    return NextResponse.json(
      { ok: false, message: unauthenticated ? "Authentication required." : "This operation is not available for your account." },
      { status: unauthenticated ? 401 : 403 }
    );
  }
  return NextResponse.json(
    { ok: false, message: "Method not allowed." },
    { status: 405 }
  );
}

function statusFor(code: string): number {
  if (code === "invalid_input") return 400;
  if (code === "forbidden") return 403;
  if (code === "not_configured" || code === "write_failed") return 503;
  return 409;
}
