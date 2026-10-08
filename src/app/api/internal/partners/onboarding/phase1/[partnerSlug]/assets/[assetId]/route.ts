import {isRcapLaunchStudioEnabled} from "@/lib/partners/onboarding/feature";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { requireInternalOnboardingContext } from "@/lib/partners/onboarding/auth-context";
import { loadInternalOnboardingAssetUrl } from "@/lib/partners/onboarding/artifact-service";
import {getSupabaseAdminClient} from "@/lib/supabase/server";
import {Phase1OnboardingError} from "@/lib/partners/onboarding/errors";
import {assertSameOrigin,readBoundedJson,requireRequestId} from "@/lib/partners/onboarding/request-security";
import { onboardingJson, onboardingHttpError } from "@/lib/partners/onboarding/http";
import { ONBOARDING_PRIVATE_RESPONSE_HEADERS } from "@/lib/partners/onboarding/request-security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Serves one organizational image to the internal co-branded page preview, the
 * way the existing partner asset route serves it to the partner. Its scoped POST records an elevated organizational-media review; the asset is resolved inside the
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

export async function POST(request:NextRequest,{params}:{params:Promise<{partnerSlug:string;assetId:string}>}){
 try {assertSameOrigin(request);if(!isRcapLaunchStudioEnabled())throw new Phase1OnboardingError("feature_disabled","Studio asset review unavailable.");const {partnerSlug,assetId}=await params;const context=await requireInternalOnboardingContext(partnerSlug);const body=await readBoundedJson(request);if(!["approve","reject"].includes(String(body.decision))||String(body.reason??"").trim().length<10)throw new Phase1OnboardingError("invalid_input","Inspect the asset and record a specific review reason.");const admin=getSupabaseAdminClient();if(!admin)throw new Phase1OnboardingError("persistence_failed","Asset review unavailable.");const {error}=await admin.rpc("rcap_service_review_studio_asset",{p_slug:context.partnerSlug,p_actor:context.authUserId,p_asset:requireRequestId(assetId),p_decision:body.decision,p_reason:String(body.reason).trim(),p_request:requireRequestId(body.requestId)});if(error)throw new Phase1OnboardingError("invalid_transition","Asset review refused a stale, unscoped or conflicting request.");return onboardingJson({success:true});}catch(error){return onboardingHttpError(error);}
}
