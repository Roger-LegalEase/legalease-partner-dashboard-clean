import type { NextRequest } from "next/server";
import { requirePartnerOnboardingContext } from "@/lib/partners/onboarding/auth-context";
import { onboardingHttpError,onboardingJson } from "@/lib/partners/onboarding/http";
import { assertSameOrigin,readBoundedJson,requireRequestId } from "@/lib/partners/onboarding/request-security";
import { enableProgramPolicy,finishProgramSetup,getProgramExperience,prepareProgramDefaults,prepareProgramReview,saveProgramPatches,type ProgramPatch } from "@/lib/partners/onboarding/program-experience-service";
import { Phase1OnboardingError } from "@/lib/partners/onboarding/errors";
export const dynamic="force-dynamic";
export async function GET(){try{return onboardingJson({view:await getProgramExperience(await requirePartnerOnboardingContext())});}catch(e){return onboardingHttpError(e);}}
export async function POST(request:NextRequest){try{
 assertSameOrigin(request);const context=await requirePartnerOnboardingContext({write:true,includeEmail:true});const body=await readBoundedJson(request);const requestId=requireRequestId(body.requestId);
 let view;
 if(body.action==="upgrade_policy"){await enableProgramPolicy(context,{confirmed:body.confirmed===true,requestId,expectedVersion:Number(body.expectedVersion)});view=await getProgramExperience(context);}
 else if(body.action==="initialize")view=await prepareProgramDefaults(context,requestId);
 else if(body.action==="save")view=await saveProgramPatches(context,body.patches as ProgramPatch[],requestId);
 else if(body.action==="review")view=await prepareProgramReview(context);
 else if(body.action==="finish")view=await finishProgramSetup(context,{requestId,confirmed:body.confirmed===true,reviewToken:typeof body.reviewToken==="string"?body.reviewToken:""});
 else throw new Phase1OnboardingError("invalid_input","Choose a program action.");
 return onboardingJson({view});
 }catch(e){return onboardingHttpError(e);}}
