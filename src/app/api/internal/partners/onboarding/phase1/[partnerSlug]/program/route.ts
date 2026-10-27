import type { NextRequest } from "next/server";
import { requireInternalOnboardingContext } from "@/lib/partners/onboarding/auth-context";
import { onboardingHttpError,onboardingJson } from "@/lib/partners/onboarding/http";
import { assertSameOrigin,readBoundedJson,requireRequestId } from "@/lib/partners/onboarding/request-security";
import { getProgramOperations,runProgramOperation } from "@/lib/partners/onboarding/program-operations-service";
import { diagnoseOrdinarySponsoredRouteRegistration } from "@/lib/rcap/fulfillment/sponsored-channel-authority";
import { getLaunchPreflight } from "@/lib/partners/onboarding/launch-preflight";
import { acceptancePreviewLaunchBinding,realLaunchOrigin } from "@/lib/partners/onboarding/real-launch-security";
import { Phase1OnboardingError } from "@/lib/partners/onboarding/errors";
export const maxDuration=60;
export const dynamic="force-dynamic";
export async function GET(request:NextRequest,{params}:{params:Promise<{partnerSlug:string}>}){try{
 const context=await requireInternalOnboardingContext((await params).partnerSlug);
 if(request.nextUrl.searchParams.get("ordinaryGuardDiagnostic")==="1"){
  const binding=acceptancePreviewLaunchBinding();
  if(!binding || context.role!=="internal_admin" || context.partnerSlug!=="legalease-ordinary-qa-20261024" || !realLaunchOrigin(process.env,context))throw new Phase1OnboardingError("forbidden","Diagnostic Preview authority is required.");
  const preflight=await getLaunchPreflight(context);
  return onboardingJson({diagnostic:diagnoseOrdinarySponsoredRouteRegistration(context.partnerSlug,preflight.intakeJurisdictions)});
 }
 return onboardingJson({operations:await getProgramOperations(context)});
}catch(e){return onboardingHttpError(e);}}
export async function POST(request:NextRequest,{params}:{params:Promise<{partnerSlug:string}>}){try{
 assertSameOrigin(request);const context=await requireInternalOnboardingContext((await params).partnerSlug);const body=await readBoundedJson(request);
 try {await runProgramOperation(context,body,requireRequestId(body.requestId));}
 catch(error) {
  const failure=onboardingHttpError(error);
  if(body.action!=="prepare" && body.action!=="review")return failure;
  return onboardingJson({...await failure.json(),operations:await getProgramOperations(context)},failure.status);
 }
 return onboardingJson({operations:await getProgramOperations(context)});
}catch(e){return onboardingHttpError(e);}}
