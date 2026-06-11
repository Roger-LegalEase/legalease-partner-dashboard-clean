import { deliverPartnerEmail } from "@/lib/email/email-service";
import { isPartnerEmailMode, isPartnerEmailType } from "@/lib/email/email-types";
import { getSafeRequestId, logSecurityError, logSecurityInfo, logSecurityWarn } from "@/lib/observability/logger";
import { requireInternalAdminRouteAccess } from "@/lib/partners/internal-admin-gate";
import { getPartnerRecordBySlug } from "@/lib/partners/partner-repository";
import { SessionPartnerError } from "@/lib/partners/session-partner";

export async function POST(request: Request) {
  const requestId = getSafeRequestId(request);
  const denied = await denyUnlessInternalAdmin(requestId);
  if (denied) {
    return denied;
  }
  logSecurityInfo({ event: "legacy_admin send_email allowed", route: "/api/internal/partners/send-email", outcome: "allowed", requestId });

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    logSecurityWarn({ event: "legacy_admin send_email validation failed", route: "/api/internal/partners/send-email", outcome: "invalid_json", requestId });
    return Response.json({ success: false, message: "Invalid JSON request body." }, { status: 400 });
  }

  const partnerSlug = getStringField(body, "partnerSlug");
  const emailType = getStringField(body, "emailType");
  const mode = getStringField(body, "mode");

  if (!partnerSlug) {
    logSecurityWarn({ event: "legacy_admin send_email validation failed", route: "/api/internal/partners/send-email", outcome: "missing_partner", requestId, metadata: { mode } });
    return Response.json({ success: false, message: "partnerSlug is required." }, { status: 400 });
  }

  if (!emailType || !isPartnerEmailType(emailType)) {
    logSecurityWarn({ event: "legacy_admin send_email validation failed", route: "/api/internal/partners/send-email", outcome: "invalid_email_type", requestId, metadata: { mode } });
    return Response.json({ success: false, message: "A supported emailType is required." }, { status: 400 });
  }

  if (!mode || !isPartnerEmailMode(mode)) {
    logSecurityWarn({ event: "legacy_admin send_email validation failed", route: "/api/internal/partners/send-email", outcome: "invalid_mode", requestId });
    return Response.json({ success: false, message: "mode must be preview, dry_run, or send." }, { status: 400 });
  }

  const partner = await getPartnerRecordBySlug(partnerSlug);
  if (!partner) {
    logSecurityWarn({ event: "legacy_admin send_email failed", route: "/api/internal/partners/send-email", outcome: "unknown_partner", requestId, metadata: { mode } });
    return Response.json({ success: false, message: `Partner ${partnerSlug} was not found.` }, { status: 404 });
  }

  const result = await deliverPartnerEmail({ partner, emailType, mode });
  if (result.success) {
    logSecurityInfo({ event: "legacy_admin send_email success", route: "/api/internal/partners/send-email", outcome: "ok", requestId, metadata: { mode: result.mode, status: result.status } });
  } else {
    logSecurityError({ event: "legacy_admin send_email failed", route: "/api/internal/partners/send-email", outcome: "error", requestId, metadata: { mode: result.mode, status: result.status } });
  }

  return Response.json({
    success: result.success,
    mode: result.mode,
    status: result.status,
    provider: result.provider,
    message: result.message,
    deliveryPersisted: result.deliveryPersisted,
    providerMessageId: result.providerMessageId,
    error: result.error,
    rendered: {
      emailType: result.rendered.emailType,
      subject: result.rendered.subject,
      text: result.rendered.text,
      html: result.rendered.html,
      recipientEmail: result.rendered.recipientEmail,
      recipientName: result.rendered.recipientName,
      previewUrl: result.rendered.previewUrl
    }
  });
}

function getStringField(body: unknown, key: string) {
  if (!body || typeof body !== "object" || !(key in body)) {
    return undefined;
  }

  const value = (body as Record<string, unknown>)[key];
  return typeof value === "string" ? value.trim() : undefined;
}

async function denyUnlessInternalAdmin(requestId: string) {
  try {
    await requireInternalAdminRouteAccess();
    return undefined;
  } catch (error) {
    if (error instanceof SessionPartnerError && error.code === "unauthenticated") {
      logSecurityWarn({ event: "legacy_admin send_email denied", route: "/api/internal/partners/send-email", outcome: "unauthenticated", requestId, error });
      return Response.json({ success: false, message: "Authentication required." }, { status: 401 });
    }

    if (error instanceof SessionPartnerError) {
      logSecurityWarn({ event: "legacy_admin send_email denied", route: "/api/internal/partners/send-email", outcome: "forbidden", requestId, error });
      return Response.json({ success: false, message: "Internal admin access required." }, { status: 403 });
    }

    logSecurityError({ event: "legacy_admin send_email denied", route: "/api/internal/partners/send-email", outcome: "error", requestId, error });
    throw error;
  }
}
