import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { requireInternalOnboardingContext } from "@/lib/partners/onboarding/auth-context";
import { loadInternalOnboardingAssetUrl } from "@/lib/partners/onboarding/artifact-service";
import { onboardingHttpError } from "@/lib/partners/onboarding/http";
import { ONBOARDING_PRIVATE_RESPONSE_HEADERS } from "@/lib/partners/onboarding/request-security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Serves one organizational image to the internal co-branded page preview, the
 * way the existing partner asset route serves it to the partner. Read-only:
 * there is no POST, PATCH, or DELETE here, the asset is resolved inside the
 * workspace the partner slug names, and the response is a short-lived private
 * redirect rather than a public URL.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ partnerSlug: string; assetId: string }> }
) {
  try {
    const { partnerSlug, assetId } = await params;
    const context = await requireInternalOnboardingContext(partnerSlug);
    const asset = await loadInternalOnboardingAssetUrl(context, assetId);
    return NextResponse.redirect(asset.url, {
      status: 307,
      headers: ONBOARDING_PRIVATE_RESPONSE_HEADERS
    });
  } catch (error) {
    return onboardingHttpError(error);
  }
}
