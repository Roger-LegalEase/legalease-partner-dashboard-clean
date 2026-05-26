import { NextResponse } from "next/server";
import {
  validateAdminActionRequest
} from "@/lib/partners/admin-actions";
import { runPartnerAdminAction } from "@/lib/partners/admin-action-runner";
import { getPartnerRecordBySlug } from "@/lib/partners/partner-repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
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
