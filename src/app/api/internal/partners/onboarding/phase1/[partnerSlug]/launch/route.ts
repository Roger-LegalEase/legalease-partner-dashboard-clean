import type { NextRequest } from "next/server";
import { requireInternalOnboardingContext } from "@/lib/partners/onboarding/auth-context";
import { onboardingHttpError, onboardingJson } from "@/lib/partners/onboarding/http";
import { getLaunchPreflight } from "@/lib/partners/onboarding/launch-preflight";
import {Phase1OnboardingError} from "@/lib/partners/onboarding/errors";
import {isDisposableLaunchEnvironment} from "@/lib/partners/onboarding/synthetic-launch-security";
import { executeSyntheticLaunch } from "@/lib/partners/onboarding/synthetic-launch-service";
import { readBoundedJson, requireRequestId, assertSameOrigin } from "@/lib/partners/onboarding/request-security";
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
    const context = await requireInternalOnboardingContext((await params).partnerSlug);
    if(!isDisposableLaunchEnvironment())throw new Phase1OnboardingError("feature_disabled","Live launch is disabled; only registered disposable loopback targets may launch.");
    const body = await readBoundedJson(request);
    return onboardingJson({success:true,result:await executeSyntheticLaunch(context,{requestId:requireRequestId(body.requestId),snapshotHash:String(body.snapshotHash??""),confirmed:body.confirmed===true})});
  } catch(error) { return onboardingHttpError(error); }
}
