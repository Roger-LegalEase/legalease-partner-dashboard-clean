import { incidentProbe } from '@/lib/partners/onboarding/incident-runtime-probe';
import type { NextRequest } from "next/server";
import { requireInternalOnboardingContext } from "@/lib/partners/onboarding/auth-context";
import { onboardingHttpError,onboardingJson } from "@/lib/partners/onboarding/http";
import { assertSameOrigin,readBoundedJson,requireRequestId } from "@/lib/partners/onboarding/request-security";
import { getProgramOperations,runProgramOperation } from "@/lib/partners/onboarding/program-operations-service";
export const maxDuration=60;
export const dynamic="force-dynamic";
export async function GET(_request:NextRequest,{params}:{params:Promise<{partnerSlug:string}>}){try{return onboardingJson({operations:await getProgramOperations(await requireInternalOnboardingContext((await params).partnerSlug))});}catch(e){return onboardingHttpError(e);}}
export async function POST(request:NextRequest,{params}:{params:Promise<{partnerSlug:string}>}){try{
 if(process.env.RCAP_PROVIDER_INCIDENT_PROBE==='true' && (await params).partnerSlug==='rcap-provider-incident')return incidentProbe(request);
 assertSameOrigin(request);const context=await requireInternalOnboardingContext((await params).partnerSlug);const body=await readBoundedJson(request);
 try {await runProgramOperation(context,body,requireRequestId(body.requestId));}
 catch(error) {
  const failure=onboardingHttpError(error);
  if(body.action!=="prepare" && body.action!=="review")return failure;
  return onboardingJson({...await failure.json(),operations:await getProgramOperations(context)},failure.status);
 }
 return onboardingJson({operations:await getProgramOperations(context)});
}catch(e){return onboardingHttpError(e);}}
