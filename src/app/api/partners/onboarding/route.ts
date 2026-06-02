import { NextResponse } from "next/server";
import { validatePartnerOnboardingPayload } from "@/lib/partners/onboarding";
import { getPartnerRecordBySlug, savePartnerOnboardingProfile } from "@/lib/partners/partner-repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid onboarding request." }, { status: 400 });
  }

  const validation = validatePartnerOnboardingPayload(payload);
  if (!validation.success) {
    return NextResponse.json({ error: "Onboarding information needs review.", errors: validation.errors }, { status: 400 });
  }

  const partner = await getPartnerRecordBySlug(validation.data.partnerSlug);
  if (!partner) {
    return NextResponse.json({ error: "Partner record was not found." }, { status: 404 });
  }

  if (partner.paymentStatus !== "paid") {
    return NextResponse.json({ error: "Payment is required before onboarding can be submitted." }, { status: 403 });
  }

  const result = await savePartnerOnboardingProfile({
    input: validation.data,
    onboardingStatus: validation.data.mode === "submit" ? "submitted" : "in_progress"
  });

  if (!result.success) {
    return NextResponse.json({ error: result.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    persisted: result.persisted,
    onboardingStatus: validation.onboardingStatus,
    message: validation.onboardingStatus === "submitted" ? "Onboarding submitted for review." : "Draft saved."
  });
}
