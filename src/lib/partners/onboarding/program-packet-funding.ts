import "server-only";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

/** Acquisition and ownership stay intact. Funding is independently revalidated. */
export async function getProgramPacketFunding(partnerSlug:string,jurisdiction:string):Promise<"sponsored"|"consumer"|"unavailable">{
 const db=getSupabaseAdminClient();if(!db)return "unavailable";
 const workspace=await db.from("partner_onboarding").select("*").eq("partner_slug",partnerSlug).maybeSingle();
 if(workspace.error)return "unavailable";
 if(workspace.data?.operating_model==="legalease_managed"){
  const goals=await db.from("partner_onboarding_sections").select("response_data").eq("workspace_id",workspace.data.id).eq("section_key","program_goals").maybeSingle();
  if(goals.error)return "unavailable";
  if(["screening_only","participant_paid"].includes(goals.data?.response_data?.service_mode))return "consumer";
 }
 const authority=await db.rpc("rcap_program_packet_scope_authorized",{p_slug:partnerSlug,p_jurisdiction:jurisdiction});
 return !authority.error && authority.data===true ? "sponsored" : "unavailable";
}
