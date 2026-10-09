import type { OnboardingPartnerData, OnboardingSectionKey } from "./types";
import type { RenderedDocument } from "./artifact-generator";
export const PROGRAM_ACTIONS = ["complete_setup", "publish_partner_page", "accept_screenings", "issue_sponsored_packet", "offer_paid_packet", "create_clinic", "publish_clinic", "assist_participant", "manage_team", "view_reporting"] as const;
export type ProgramAction = typeof PROGRAM_ACTIONS[number];
export type ProgramRequirement = {key:string;label:string;owner_domain:string;classification:string;passing?:boolean;effective?:boolean;dependency_hash?:string;default_applied?:boolean;exception_id?:string|null};
export type ProgramDecision = {policyVersion:string;workspaceId:string;partnerSlug:string;actor:string;role:string;action:ProgramAction;allowed:boolean;requirements:ProgramRequirement[];blockers:ProgramRequirement[];activeExceptions:string[];sourceVersion:number;scopeHash:string;materialsHash:string;authorityId:string|null;setupComplete:boolean;delegated:boolean;configurationComplete:boolean;live:boolean;status:string;primaryNextAction:string};
export type ProgramMaterial = {type:string;version:number;document:RenderedDocument};
export type ProgramExperience = {
 partnerSlug:string;organizationName:string;version:number;data:OnboardingPartnerData;canEdit:boolean;legalIdentityLocked:boolean;
 decision:ProgramDecision;capabilities:Partial<Record<ProgramAction,boolean>>;materials:ProgramMaterial[];reviewToken:string|null;
 publicUrl:string|null;commercial:{label:string;screenings:number|null;packets:number|null;expiresAt:string|null};
};
export const PROGRAM_STEPS = ["join","organization","program","team","start"] as const;
export type ProgramStep = typeof PROGRAM_STEPS[number];
export const STEP_SECTIONS:Record<ProgramStep,OnboardingSectionKey[]> = {join:[],organization:["organization_contacts"],program:["program_goals","geography_audience_language_accessibility","access_sponsorship_capacity","support_referrals_reporting","brand_public_page"],team:[],start:[]};
export function firstProgramStep(data:OnboardingPartnerData):ProgramStep {
 const org=data.organization_contacts;
 if(!org?.legal_organization_name || !org.public_organization_name || !org.public_program_name) return "organization";
 if(!data.geography_audience_language_accessibility?.jurisdictions?.length || !data.geography_audience_language_accessibility.service_area_description || !data.program_goals?.participation_mode || !data.access_sponsorship_capacity?.participant_access_model) return "program";
 return "start";
}
