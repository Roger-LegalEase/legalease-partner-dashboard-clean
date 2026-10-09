import Link from "next/link";
import { redirect } from "next/navigation";
import { requirePartnerOnboardingContext } from "@/lib/partners/onboarding/auth-context";
import { getProgramExperience } from "@/lib/partners/onboarding/program-experience-service";
import { isRcap2Enabled } from "@/lib/partners/onboarding/feature";
import { ProgramOnboarding } from "../onboarding/ProgramOnboarding";
export const dynamic="force-dynamic";
export default async function Settings({searchParams}:{searchParams:Promise<{step?:string}>}){
 if(!isRcap2Enabled())redirect("/partner/onboarding");
 const context=await requirePartnerOnboardingContext().catch(e=>{if(e?.code==="unauthenticated")redirect("/sign-in?next=/partner/settings");throw e;});
 const view=await getProgramExperience(context);
 if(context.role!=="partner_admin")return <main className="mx-auto max-w-3xl p-8"><h1 className="text-3xl font-bold">Program settings</h1><p className="mt-4">Your program administrator manages these settings.</p><Link className="mt-4 inline-block underline" href="/partner/dashboard">Return to dashboard</Link></main>;
 if(view.decision.policyVersion==="legacy"&&view.decision.status==="live")return <main className="mx-auto max-w-3xl p-8"><h1 className="text-3xl font-bold">{view.organizationName}</h1><p className="mt-4">Your existing live program retains its approved settings and services.</p><Link className="mt-4 inline-flex min-h-11 items-center underline" href="/partner/onboarding/artifacts">View approved program documents</Link><Link className="ml-5 inline-flex min-h-11 items-center underline" href="/partner/team">Manage team</Link></main>;
 return <ProgramOnboarding initial={view} requestedStep={(await searchParams).step??"organization"} settings/>;
}
