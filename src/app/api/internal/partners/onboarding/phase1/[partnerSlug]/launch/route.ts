import type { NextRequest } from "next/server";
import { requireInternalOnboardingContext } from "@/lib/partners/onboarding/auth-context";
import { onboardingHttpError, onboardingJson } from "@/lib/partners/onboarding/http";
import { getLaunchPreflight } from "@/lib/partners/onboarding/launch-preflight";
import { Phase1OnboardingError } from "@/lib/partners/onboarding/errors";
import { assertSameOrigin } from "@/lib/partners/onboarding/request-security";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export async function GET(_request: NextRequest, {params}: {params: Promise<{partnerSlug:string}>}) {
  try {
    const context = await requireInternalOnboardingContext((await params).partnerSlug);
    return onboardingJson({success:true, preflight:await getLaunchPreflight(context)});
  } catch(error) { return onboardingHttpError(error); }
}
export async function POST(request: NextRequest, {params}: {params: Promise<{partnerSlug:string}>}) {
  try {
    assertSameOrigin(request);
    await requireInternalOnboardingContext((await params).partnerSlug);
    throw new Phase1OnboardingError("feature_disabled", "Launch remains held pending separately authorized commercial/publication policy and an audited, verified release operation.");
  } catch(error) { return onboardingHttpError(error); }
}
