import { NextResponse } from "next/server";
import {
  getSafeRequestId,
  logSecurityInfo,
  logSecurityWarn
} from "@/lib/observability/logger";
import {
  createFirstAdminInvitation,
  FirstAdminProvisioningError,
  getFirstAdminAccessView,
  revokeFirstAdminInvitation,
  sendFirstAdminInvitationEmail
} from "@/lib/partners/first-admin-service";
import { isFirstAdminSameOriginRequest } from "@/lib/partners/first-admin-request-security";
import {
  requireInternalAdminSession,
  SessionPartnerError
} from "@/lib/partners/session-partner";

export const dynamic = "force-dynamic";

const routeName = "/api/internal/partners/first-admin/[partnerSlug]";

export async function GET(
  request: Request,
  context: { params: Promise<{ partnerSlug: string }> }
) {
  const requestId = getSafeRequestId(request);
  const gate = await internalAdminGate(requestId);
  if (!gate.ok) return gate.response;
  try {
    const { partnerSlug } = await context.params;
    const access = await getFirstAdminAccessView(partnerSlug);
    return NextResponse.json({ ok: true, access });
  } catch (error) {
    return errorResponse(error, requestId, "read");
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ partnerSlug: string }> }
) {
  const requestId = getSafeRequestId(request);
  if (!isFirstAdminSameOriginRequest(request)) {
    logSecurityWarn({
      event: "first_admin provisioning denied",
      route: routeName,
      outcome: "cross_origin",
      requestId
    });
    return NextResponse.json(
      { ok: false, message: "Invalid request origin." },
      { status: 403 }
    );
  }
  const gate = await internalAdminGate(requestId);
  if (!gate.ok) return gate.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, message: "Invalid request." },
      { status: 400 }
    );
  }
  const values =
    body && typeof body === "object"
      ? (body as Record<string, unknown>)
      : {};
  const action = typeof values.action === "string" ? values.action : "";
  try {
    const { partnerSlug } = await context.params;
    let result: Record<string, unknown> = {};
    if (action === "create" || action === "replace") {
      const creation = await createFirstAdminInvitation({
        partnerSlug,
        operatorUserId: gate.authUserId,
        replaceCurrent: action === "replace",
        values: {
          fullName: values.fullName,
          email: values.email,
          idempotencyKey: values.idempotencyKey,
          expirationHours: values.expirationHours
        }
      });
      result = {
        created: creation.created,
        duplicatePrevented: creation.duplicatePrevented,
        setupLink: creation.setupLink
      };
    } else if (action === "revoke") {
      await revokeFirstAdminInvitation({
        partnerSlug,
        operatorUserId: gate.authUserId,
        invitationId: values.invitationId
      });
    } else if (action === "send") {
      await sendFirstAdminInvitationEmail({
        partnerSlug,
        operatorUserId: gate.authUserId,
        invitationId: values.invitationId,
        setupLink: values.setupLink
      });
      result = { sent: true };
    } else {
      throw new FirstAdminProvisioningError(
        "invalid_input",
        "Choose an administrator access action."
      );
    }
    const access = await getFirstAdminAccessView(partnerSlug);
    logSecurityInfo({
      event: "first_admin provisioning succeeded",
      route: routeName,
      outcome: action,
      requestId,
      metadata: { action }
    });
    return NextResponse.json({ ok: true, ...result, access });
  } catch (error) {
    return errorResponse(error, requestId, action || "unknown");
  }
}

async function internalAdminGate(requestId: string): Promise<
  | { ok: true; authUserId: string }
  | { ok: false; response: NextResponse }
> {
  try {
    const session = await requireInternalAdminSession();
    return { ok: true, authUserId: session.authUserId };
  } catch (error) {
    const unauthenticated =
      error instanceof SessionPartnerError &&
      error.code === "unauthenticated";
    logSecurityWarn({
      event: "first_admin provisioning denied",
      route: routeName,
      outcome: unauthenticated ? "unauthenticated" : "forbidden",
      requestId,
      error
    });
    return {
      ok: false,
      response: NextResponse.json(
        {
          ok: false,
          message: unauthenticated
            ? "Authentication required."
            : "Internal administrator access is required."
        },
        { status: unauthenticated ? 401 : 403 }
      )
    };
  }
}

function errorResponse(error: unknown, requestId: string, action: string) {
  const known =
    error instanceof FirstAdminProvisioningError ? error : null;
  logSecurityWarn({
    event: "first_admin provisioning failed",
    route: routeName,
    outcome: known?.code ?? "unknown_error",
    requestId,
    error,
    metadata: {
      action,
      error_code: known?.code ?? "unknown_error"
    }
  });
  const status =
    known?.code === "invalid_input"
      ? 400
      : known?.code === "partner_not_found"
        ? 404
        : known?.code === "not_configured" ||
            known?.code === "write_failed" ||
            known?.code === "auth_failed" ||
            known?.code === "delivery_failed"
          ? 503
          : 409;
  return NextResponse.json(
    {
      ok: false,
      code: known?.code ?? "unknown_error",
      message:
        known?.message ??
        "Administrator access could not be updated right now."
    },
    { status }
  );
}
