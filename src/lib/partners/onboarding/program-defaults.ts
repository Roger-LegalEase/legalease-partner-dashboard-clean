import { ONBOARDING_JURISDICTIONS } from "./jurisdictions";
import type { OnboardingPartnerData } from "./types";

// Reusable application templates. Partner-specific claims are never machine-translated.
export const STANDARD_PROGRAM_COPY = {
  headline: ["Explore your record-clearing options", "Explore sus opciones para eliminar antecedentes"],
  subheadline: ["Answer clear questions to understand possible next steps.", "Responda preguntas claras para conocer los posibles próximos pasos."],
  primaryActionLabel: ["Start free screening", "Comenzar evaluación gratuita"],
  participantSupportCopy: ["Contact program support if you need help getting started.", "Contacte con el equipo de apoyo del programa si necesita ayuda para comenzar."],
  targetAudience: ["People in the program service area", "Personas en la zona de servicio del programa"]
} as const;
export const PROGRAM_JURISDICTIONS:Record<string,string>=Object.fromEntries(ONBOARDING_JURISDICTIONS.map(({code,name})=>[code,name]));
export const programServiceArea=(codes:string[])=>codes.map(c=>PROGRAM_JURISDICTIONS[c]??c).join(", ");
export function standardProgramSpanish(data:OnboardingPartnerData){
 const brand=data.brand_public_page,geo=data.geography_audience_language_accessibility;
 const name=data.organization_contacts?.public_organization_name??data.organization_contacts?.legal_organization_name??"";
 const pair=(key:keyof typeof STANDARD_PROGRAM_COPY,english:string|undefined,custom:string|undefined)=>custom|| (english===STANDARD_PROGRAM_COPY[key][0]?STANDARD_PROGRAM_COPY[key][1]:undefined);
 return {
  headline:pair("headline",brand?.program_headline,brand?.program_headline_es),
  subheadline:pair("subheadline",brand?.program_subheadline,brand?.program_subheadline_es),
  primaryActionLabel:pair("primaryActionLabel",brand?.primary_cta_label,brand?.primary_cta_label_es),
  participantSupportCopy:pair("participantSupportCopy",brand?.participant_support_copy,brand?.participant_support_copy_es),
  targetAudience:pair("targetAudience",data.program_goals?.target_population,brand?.target_audience_es),
  organizationDescription:brand?.approved_organization_description_es || (brand?.approved_organization_description===`A record-clearing access program from ${name}.`?`Un programa de acceso a la eliminación de antecedentes de ${name}.`:undefined),
  serviceArea:brand?.service_area_es || (geo?.service_area_description===programServiceArea(geo?.jurisdictions??[]) ? (geo?.jurisdictions??[]).map(c=>c==="DC"?"Distrito de Columbia":PROGRAM_JURISDICTIONS[c]??c).join(", "):undefined)
 };
}
