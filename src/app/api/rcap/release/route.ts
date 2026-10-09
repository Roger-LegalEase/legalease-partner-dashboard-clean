import { NextResponse } from "next/server";
import { isRcap2Enabled } from "@/lib/partners/onboarding/feature";
import { realLaunchOrigin } from "@/lib/partners/onboarding/real-launch-security";
export const dynamic="force-dynamic";
export function GET(){
 if(!isRcap2Enabled())return new NextResponse(null,{status:404});
 const buildSha=process.env.NEXT_PUBLIC_RCAP_BUILD_SHA??null;
 const runtimeSha=process.env.VERCEL_GIT_COMMIT_SHA??null;
 const sourceBound=Boolean(buildSha&&/^[a-f0-9]{40}$/.test(buildSha)&&buildSha===runtimeSha&&realLaunchOrigin());
 return NextResponse.json({application:"RCAP 2.0",policyVersion:"rcap2.2",buildSha,runtimeSha,sourceBound},{status:sourceBound?200:503,headers:{"cache-control":"no-store"}});
}
