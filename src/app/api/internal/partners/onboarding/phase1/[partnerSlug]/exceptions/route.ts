import type {NextRequest} from "next/server";
import {requireInternalOnboardingContext} from "@/lib/partners/onboarding/auth-context";
import {recordLaunchException} from "@/lib/partners/onboarding/launch-exception-service";
import {assertSameOrigin,readBoundedJson,requireRequestId} from "@/lib/partners/onboarding/request-security";
import {onboardingJson,onboardingHttpError} from "@/lib/partners/onboarding/http";
import {Phase1OnboardingError} from "@/lib/partners/onboarding/errors";
export async function POST(request:NextRequest,{params}:{params:Promise<{partnerSlug:string}>}){try{assertSameOrigin(request);const context=await requireInternalOnboardingContext((await params).partnerSlug);const body=await readBoundedJson(request);if(body.kind!=="grant" && body.kind!=="revoke")throw new Phase1OnboardingError("invalid_input","Choose grant or revoke.");return onboardingJson({success:true,result:await recordLaunchException(context,{kind:body.kind,requestId:requireRequestId(body.requestId),checkKey:String(body.checkKey??""),grantId:body.grantId?requireRequestId(body.grantId):undefined,reason:String(body.reason??""),authorityReference:String(body.authorityReference??""),snapshotHash:String(body.snapshotHash??""),expiresAt:String(body.expiresAt??"")})});}catch(error){return onboardingHttpError(error);}}
