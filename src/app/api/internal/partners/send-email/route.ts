import { deliverPartnerEmail } from "@/lib/email/email-service";
import { isPartnerEmailMode, isPartnerEmailType } from "@/lib/email/email-types";
import { requireInternalAdminRouteAccess } from "@/lib/partners/internal-admin-gate";
import { getPartnerRecordBySlug } from "@/lib/partners/partner-repository";
import { SessionPartnerError } from "@/lib/partners/session-partner";

export async function POST(request: Request) {
  const denied = await denyUnlessInternalAdmin();
  if (denied) {
    return denied;
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json({ success: false, message: "Invalid JSON request body." }, { status: 400 });
  }

  const partnerSlug = getStringField(body, "partnerSlug");
  const emailType = getStringField(body, "emailType");
  const mode = getStringField(body, "mode");

  if (!partnerSlug) {
    return Response.json({ success: false, message: "partnerSlug is required." }, { status: 400 });
  }

  if (!emailType || !isPartnerEmailType(emailType)) {
    return Response.json({ success: false, message: "A supported emailType is required." }, { status: 400 });
  }

  if (!mode || !isPartnerEmailMode(mode)) {
    return Response.json({ success: false, message: "mode must be preview, dry_run, or send." }, { status: 400 });
  }

  const partner = await getPartnerRecordBySlug(partnerSlug);
  if (!partner) {
    return Response.json({ success: false, message: `Partner ${partnerSlug} was not found.` }, { status: 404 });
  }

  const result = await deliverPartnerEmail({ partner, emailType, mode });

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

async function denyUnlessInternalAdmin() {
  try {
    await requireInternalAdminRouteAccess();
    return undefined;
  } catch (error) {
    if (error instanceof SessionPartnerError && error.code === "unauthenticated") {
      return Response.json({ success: false, message: "Authentication required." }, { status: 401 });
    }

    if (error instanceof SessionPartnerError) {
      return Response.json({ success: false, message: "Internal admin access required." }, { status: 403 });
    }

    throw error;
  }
}
