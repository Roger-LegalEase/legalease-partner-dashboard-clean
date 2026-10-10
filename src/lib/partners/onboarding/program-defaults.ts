import { ONBOARDING_JURISDICTIONS } from "./jurisdictions";
import type { OnboardingPartnerData } from "./types";

// Approved reusable copy. Custom drafts are resolved separately against their source.
export const STANDARD_PROGRAM_COPY = {
  headline: ["Explore your record-clearing options", "Explore sus opciones para eliminar antecedentes"],
  subheadline: ["Answer clear questions to understand possible next steps.", "Responda preguntas claras para conocer los posibles próximos pasos."],
  primaryActionLabel: ["Start free screening", "Comenzar evaluación gratuita"],
  participantSupportCopy: ["Contact program support if you need help getting started.", "Contacte con el equipo de apoyo del programa si necesita ayuda para comenzar."],
  targetAudience: ["People in the program service area", "Personas en la zona de servicio del programa"]
} as const;
export const PROGRAM_JURISDICTIONS:Record<string,string>=Object.fromEntries(ONBOARDING_JURISDICTIONS.map(({code,name})=>[code,name]));
export const programServiceArea=(codes:string[])=>codes.map(c=>PROGRAM_JURISDICTIONS[c]??c).join(", ");
export const SPANISH_FIELDS = {
 headline: "program_headline_es", subheadline: "program_subheadline_es",
 organizationDescription: "approved_organization_description_es", primaryActionLabel: "primary_cta_label_es",
 participantSupportCopy: "participant_support_copy_es", serviceArea: "service_area_es", targetAudience: "target_audience_es"
} as const;
export type PublicCopyKey = keyof typeof SPANISH_FIELDS;
export type PublicCopy = Record<PublicCopyKey, string>;
export function publicCopySource(data: OnboardingPartnerData) {
 const brand=data.brand_public_page, geo=data.geography_audience_language_accessibility;
 return {
  english: {
   headline: brand?.program_headline ?? "", subheadline: brand?.program_subheadline ?? "",
   organizationDescription: brand?.approved_organization_description ?? "", primaryActionLabel: brand?.primary_cta_label ?? "",
   participantSupportCopy: brand?.participant_support_copy ?? "", serviceArea: geo?.service_area_description ?? "",
   targetAudience: data.program_goals?.target_population ?? ""
  },
  identity: { organization: data.organization_contacts?.public_organization_name ?? data.organization_contacts?.legal_organization_name ?? "", program: data.organization_contacts?.public_program_name ?? "" },
  jurisdictions: geo?.jurisdictions ?? [], services: data.program_goals?.service_mode ?? "documented_services"
 };
}
export type SpanishPreparation = { source: ReturnType<typeof publicCopySource>; copy: PublicCopy };
export function approvedProgramSpanish(data:OnboardingPartnerData): Record<PublicCopyKey, string | undefined> {
 const brand=data.brand_public_page,geo=data.geography_audience_language_accessibility;
 const name=data.organization_contacts?.public_organization_name??data.organization_contacts?.legal_organization_name??"";
 const pair=(key:keyof typeof STANDARD_PROGRAM_COPY,english:string|undefined)=>english===STANDARD_PROGRAM_COPY[key][0]?STANDARD_PROGRAM_COPY[key][1]:undefined;
 return {
  headline:pair("headline",brand?.program_headline),
  subheadline:pair("subheadline",brand?.program_subheadline),
  primaryActionLabel:pair("primaryActionLabel",brand?.primary_cta_label),
  participantSupportCopy:pair("participantSupportCopy",brand?.participant_support_copy),
  targetAudience:pair("targetAudience",data.program_goals?.target_population),
  organizationDescription:brand?.approved_organization_description===`A record-clearing access program from ${name}.`?`Un programa de acceso a la eliminación de antecedentes de ${name}.`:undefined,
  serviceArea:geo?.service_area_description===programServiceArea(geo?.jurisdictions??[]) ? (geo?.jurisdictions??[]).map(c=>c==="DC"?"Distrito de Columbia":PROGRAM_JURISDICTIONS[c]??c).join(", "):undefined
 };
}
export function standardProgramSpanish(data: OnboardingPartnerData) {
 const resolved=approvedProgramSpanish(data), source=publicCopySource(data), saved=data.brand_public_page?.spanish_preparation;
 if (saved?.source?.identity && saved.source.identity.organization===source.identity.organization && saved.source.identity.program===source.identity.program && JSON.stringify(saved.source.jurisdictions)===JSON.stringify(source.jurisdictions) && saved.source.services===source.services) {
  for (const key of Object.keys(SPANISH_FIELDS) as PublicCopyKey[]) {
   const copy=data.brand_public_page?.[SPANISH_FIELDS[key]];
   if (!resolved[key] && copy?.trim() && saved.source.english[key]===source.english[key] && saved.copy[key]===copy) resolved[key]=copy;
  }
 }
 return resolved;
}

// Prose never authorizes a jurisdiction. Keep this predicate aligned with the
// database policy; both refuse a multi-state/national claim for a narrower scope.
export function programGeographyIssue(data: OnboardingPartnerData): string | null {
 const geo=data.geography_audience_language_accessibility, states=geo?.jurisdictions??[], prose=geo?.service_area_description??"";
 if ((states.length<2 && /multi[ -]?state|multiple states|several states/i.test(prose)) || (states.length<51 && /nationwide|all (?:50|fifty) states|all states|national coverage/i.test(prose))) {
  return `The service-area description says “${prose}”, but authorized screening is limited to ${programServiceArea(states) || "the selected jurisdictions"}. Correct the description or explicitly select the intended jurisdictions.`;
 }
 return null;
}
