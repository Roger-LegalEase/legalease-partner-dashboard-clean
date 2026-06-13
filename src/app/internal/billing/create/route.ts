import { NextResponse } from "next/server";
import { getSafeRequestId, logSecurityError, logSecurityInfo, logSecurityWarn } from "@/lib/observability/logger";
import { createPartnerInvoiceForInternalAdmin, validatePartnerBillingInput } from "@/lib/partners/billing";
import { SessionPartnerError, requireInternalAdminSession } from "@/lib/partners/session-partner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const requestId = getSafeRequestId(request);
  let internalAdminUserId: string;

  try {
    const session = await requireInternalAdminSession();
    internalAdminUserId = session.authUserId;
    logSecurityInfo({ event: "partner_billing create gate allowed", route: "/internal/billing/create", outcome: "allowed", requestId });
  } catch (error) {
    if (error instanceof SessionPartnerError && error.code === "unauthenticated") {
      logSecurityWarn({ event: "partner_billing create denied", route: "/internal/billing/create", outcome: "unauthenticated", requestId, error });
      return NextResponse.json({ success: false, error: "Authentication required." }, { status: 401 });
    }

    if (error instanceof SessionPartnerError) {
      logSecurityWarn({ event: "partner_billing create denied", route: "/internal/billing/create", outcome: "forbidden", requestId, error });
      return NextResponse.json({ success: false, error: "Internal admin access required." }, { status: 403 });
    }

    logSecurityError({ event: "partner_billing create denied", route: "/internal/billing/create", outcome: "error", requestId });
    throw error;
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    logSecurityWarn({ event: "partner_billing create validation failed", route: "/internal/billing/create", outcome: "invalid_form", requestId });
    return NextResponse.json({ success: false, error: "Invalid billing request." }, { status: 400 });
  }

  const validation = validatePartnerBillingInput({
    partnerSlug: formData.get("partnerSlug"),
    partnerPilotRequestId: formData.get("partnerPilotRequestId"),
    contactEmail: formData.get("contactEmail"),
    contactName: formData.get("contactName"),
    amountDollars: formData.get("amountDollars"),
    description: formData.get("description"),
    dueDate: formData.get("dueDate")
  });

  if (!validation.success) {
    logSecurityWarn({ event: "partner_billing create validation failed", route: "/internal/billing/create", outcome: "invalid_payload", requestId });
    return NextResponse.json({ success: false, error: validation.error }, { status: 400 });
  }

  const result = await createPartnerInvoiceForInternalAdmin(validation.data, internalAdminUserId);
  if (!result.success) {
    return NextResponse.json({ success: false, error: result.error }, { status: result.status });
  }

  return NextResponse.redirect(new URL(`/internal/billing?created=${encodeURIComponent(result.billingRequest.id)}`, request.url), {
    status: 303
  });
}
