import { redirect } from "next/navigation";
import { getPartnerDashboardRlsData } from "@/lib/partners/partner-dashboard-rls-repository";
import { SessionPartnerError } from "@/lib/partners/session-partner";
import { getProgramExperience } from "@/lib/partners/onboarding/program-experience-service";
import { listClinicEvents } from "@/lib/clinic-mode/service";
import { ProgramDashboard } from "../dashboard/ProgramDashboard";
export const dynamic="force-dynamic";
export default async function Participants(){
 const dashboard=await getPartnerDashboardRlsData().catch(e=>{if(e instanceof SessionPartnerError&&e.code==="unauthenticated")redirect("/sign-in?next=/partner/participants");throw e;});
 if(dashboard.kind!=="partner")redirect("/internal");
 const [program,clinics]=await Promise.all([getProgramExperience({partnerSlug:dashboard.partnerSlug,authUserId:dashboard.authUserId,role:dashboard.role,workEmail:null}).catch(()=>null),listClinicEvents().catch(()=>null)]);
 return <ProgramDashboard dashboard={dashboard} program={program} clinicCount={clinics?.length??null} participants/>;
}
