import { NextResponse } from "next/server";
import {
  validateAdminActionRequest
} from "@/lib/partners/admin-actions";
import { runPartnerAdminAction } from "@/lib/partners/admin-action-runner";
import { requireInternalAdminRouteAccess } from "@/lib/partners/internal-admin-gate";
import { getPartnerRecordBySlug } from "@/lib/partners/partner-repository";
import { SessionPartnerError } from "@/lib/partners/session-partner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const denied = await denyUnlessInternalAdmin();
  if (denied) {
    return denied;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid admin action request." }, { status: 400 });
  }

  const validation = validateAdminActionRequest(body && typeof body === "object" ? body : {});
  if (!validation.success) {
    return NextResponse.json({ success: false, error: validation.error }, { status: 400 });
  }

  const { action, partnerSlug, assetKey, note } = validation.data;
  const partner = await getPartnerRecordBySlug(partnerSlug);
  if (!partner) {
    return NextResponse.json({ success: false, error: "Unknown partner." }, { status: 404 });
  }

  const result = await runPartnerAdminAction({ action, partnerSlug, assetKey, note, currentProvisioningStatus: partner.provisioningStatus });
  const status = result.success ? 200 : 500;

  return NextResponse.json(
    {
      success: result.success,
      persisted: result.persisted,
      mode: result.mode,
      action,
      partnerSlug,
      message: result.message,
      error: result.error
    },
    { status }
  );
}

async function denyUnlessInternalAdmin() {
  try {
    await requireInternalAdminRouteAccess();
    return undefined;
  } catch (error) {
    if (error instanceof SessionPartnerError && error.code === "unauthenticated") {
      return NextResponse.json({ success: false, error: "Authentication required." }, { status: 401 });
    }

    if (error instanceof SessionPartnerError) {
      return NextResponse.json({ success: false, error: "Internal admin access required." }, { status: 403 });
    }

    throw error;
  }
}
