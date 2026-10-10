import "server-only";
import { randomUUID } from "node:crypto";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import type { InternalOnboardingContext, PartnerOnboardingContext } from "./auth-context";
import { getProgramConfiguration } from "./program-configuration-service";
import { SPANISH_FIELDS, publicCopySource, standardProgramSpanish, type PublicCopy, type PublicCopyKey } from "./program-defaults";
import { draftProgramSpanish, spanishProviderConfig, validateSpanishDraft } from "./program-spanish-provider";
import { Phase1OnboardingError } from "./errors";

// Called only by the explicit prepare/save operation, never by a read path.
export async function prepareProgramSpanish(context: InternalOnboardingContext | PartnerOnboardingContext) {
 const config=await getProgramConfiguration(context);
 if(!config.data.geography_audience_language_accessibility?.enable_spanish)return;
 const db=getSupabaseAdminClient()!, source=publicCopySource(config.data), resolved=standardProgramSpanish(config.data);
 const keys=Object.keys(SPANISH_FIELDS) as PublicCopyKey[];
 if(keys.some(key=>!source.english[key].trim()))throw new Phase1OnboardingError("invalid_input","Complete the English public-page copy before preparing its Spanish preview.");
 // Existing immutable snapshots prove which English a prior custom translation
 // accompanied. Reuse only exact source/translation pairs; never infer from age.
 const artifacts=await db.from("partner_onboarding_artifacts").select("id").eq("workspace_id",config.workspaceId).eq("artifact_type","co_branded_page_configuration");
 if(artifacts.error)throw new Phase1OnboardingError("persistence_failed","Existing Spanish source versions could not be checked. Retry Update Materials.");
 const versions=artifacts.data.length?await db.from("partner_onboarding_artifact_versions").select("normalized_snapshot,rendered_content").in("artifact_id",artifacts.data.map(a=>a.id)).eq("generation_status","succeeded").order("version_number",{ascending:false}).limit(50):{data:[],error:null};
 if(versions.error)throw new Phase1OnboardingError("persistence_failed","Existing Spanish source versions could not be checked. Retry Update Materials.");
 const paths:Record<PublicCopyKey,string>={headline:"brand_public_page.program_headline",subheadline:"brand_public_page.program_subheadline",organizationDescription:"brand_public_page.approved_organization_description",primaryActionLabel:"brand_public_page.primary_cta_label",participantSupportCopy:"brand_public_page.participant_support_copy",serviceArea:"geography_audience_language_accessibility.service_area_description",targetAudience:"program_goals.target_population"};
 for(const key of keys)if(!resolved[key]) {
  const existing=config.data.brand_public_page?.[SPANISH_FIELDS[key]];
  if(!existing?.trim())continue;
  const matched=versions.data?.some(version=>{
   const snapshot=version.normalized_snapshot, page=version.rendered_content?.pagePreview;
   return snapshot?.[paths[key]]===source.english[key] && page?.[key]?.value===source.english[key] && page?.spanish?.[key]===existing && snapshot?.["organization_contacts.public_organization_name"]===source.identity.organization && snapshot?.["organization_contacts.public_program_name"]===source.identity.program && JSON.stringify(snapshot?.["geography_audience_language_accessibility.jurisdictions"])===JSON.stringify(source.jurisdictions);
  });
  if(matched)resolved[key]=existing;
 }
 const missing=keys.filter(key=>!resolved[key]);
 const requestId=randomUUID();let reserved=false;
 if(missing.length) {
  spanishProviderConfig(); // A missing credential is not a successful preparation.
  const reservation=await db.rpc("rcap_service_reserve_program_translation",{p_slug:context.partnerSlug,p_actor:context.authUserId,p_version:config.version,p_source:source,p_request:requestId});
  if(reservation.error) {
   if(reservation.error.code==="PT409")throw new Phase1OnboardingError("revision_conflict","The English source changed. Review it and retry Update Materials.");
   if(reservation.error.code==="55P03")throw new Phase1OnboardingError("request_in_progress","Spanish preparation is already in progress. Retry Update Materials in a minute.");
   if(reservation.error.code==="P0001")throw new Phase1OnboardingError("request_in_progress","Spanish preparation limit reached. Retry Update Materials in ten minutes.");
   throw new Phase1OnboardingError("persistence_failed","Spanish preparation could not start. Retry Update Materials; if this continues, the preparation service needs attention.");
  }
  reserved=true;
 }
 try {
  if(missing.length)Object.assign(resolved,await draftProgramSpanish(source,missing,requestId));
  const copy=resolved as PublicCopy;
  validateSpanishDraft(source,copy,missing);
  if(keys.some(key=>!copy[key]?.trim()))throw new Phase1OnboardingError("invalid_input","Spanish content is incomplete. Retry Update Materials.");
  // Atomic CAS persists drafts in the existing canonical section and binds their
  // source. The unchanged Program Summary and all approval history are preserved.
  const saved=await db.rpc("rcap_service_save_program_translation",{p_slug:context.partnerSlug,p_actor:context.authUserId,p_version:config.version,p_source:source,p_copy:copy,p_request:requestId});
  if(saved.error)throw new Phase1OnboardingError(saved.error.code==="PT409"?"revision_conflict":"persistence_failed",saved.error.code==="PT409"?"The program changed during Spanish preparation. Review the saved source and retry Update Materials.":"Spanish drafts could not be saved. Retry Update Materials.");
  const readback=await getProgramConfiguration(context), current=standardProgramSpanish(readback.data);
  if(JSON.stringify(publicCopySource(readback.data))!==JSON.stringify(source)||keys.some(key=>current[key]!==copy[key]))throw new Phase1OnboardingError("revision_conflict","The program changed during Spanish preparation. Review it and retry Update Materials.");
 } catch(error) {
  if(reserved)await db.from("partner_onboarding_idempotency").update({result_status:"failed",completed_at:new Date().toISOString()}).eq("request_id",requestId).eq("actor_user_id",context.authUserId).eq("result_status","started");
  throw error;
 }
}
