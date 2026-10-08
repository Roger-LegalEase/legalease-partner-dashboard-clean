import type {RenderedDocument} from "@/lib/partners/onboarding/artifact-generator";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireStudioContext } from "@/lib/partners/onboarding/studio-authorization";
import { getInternalPrefillSnapshot } from "@/lib/partners/onboarding/prefill-service";
import { Phase1PrefillPanel } from "@/app/internal/partners/onboarding/[partnerSlug]/Phase1PrefillPanel";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { Phase1OnboardingError } from "@/lib/partners/onboarding/errors";
import { OperationalReview } from "./OperationalReview";
export const dynamic="force-dynamic";
async function loadAssignedStudio(partnerSlug:string) {
  const context=await requireStudioContext(partnerSlug);
  const snapshot=await getInternalPrefillSnapshot(context);
  const admin=getSupabaseAdminClient()!;
  const {data,error}=await admin.from("partner_onboarding_artifacts").select("artifact_type,current_version_id").eq("workspace_id",snapshot.workspace?.id??"").in("artifact_type",["operations_escalation_plan","dashboard_user_reporting_matrix","staff_quick_start_guide"]);
  if(error) throw new Phase1OnboardingError("persistence_failed","Operational materials are unavailable.");
  const ids=(data??[]).map(row=>row.current_version_id).filter(Boolean);
  const versions=ids.length ? await admin.from("partner_onboarding_artifact_versions").select("id,rendered_content,approval_status,version_number").in("id",ids).eq("workspace_id",snapshot.workspace?.id) : {data:[],error:null};
  if(versions.error) throw new Phase1OnboardingError("persistence_failed","Operational versions are unavailable.");
  return {context,snapshot,versions:versions.data??[]};
}
export default async function AssignedStudio({params}:{params:Promise<{partnerSlug:string}>}) {
 const {partnerSlug}=await params;
 let loaded;
 try {loaded=await loadAssignedStudio(partnerSlug); } catch(error) {
  if(error instanceof Phase1OnboardingError){if(error.code==="unauthenticated")redirect(`/sign-in?next=${encodeURIComponent(`/partner-studio/${partnerSlug}`)}`);return <main className="mx-auto max-w-xl p-8"><h1 className="text-2xl font-bold">Program access unavailable</h1><p role="alert">{error.message}</p></main>;}
  throw error;
 }
 const {context,snapshot,versions}=loaded;
 return <main className="mx-auto max-w-6xl px-4 py-8 text-navy"><Link href="/sign-out">Sign out</Link><h1 className="mt-6 text-3xl font-bold">Assigned partner workspace</h1><p className="mt-3">Program: {context.partnerSlug}. Prepared by LegalEase; partner-owned confirmation remains with the partner. Financial, legal, exception and launch decisions require an internal administrator.</p><Phase1PrefillPanel partnerSlug={context.partnerSlug} snapshot={snapshot} assignedOperator/><OperationalReview partnerSlug={context.partnerSlug} versions={versions as Array<{id:string;rendered_content:RenderedDocument;approval_status:string;version_number:number}>}/></main>;
}
