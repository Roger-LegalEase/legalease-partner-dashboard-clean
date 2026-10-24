import type { EngineProfile, ScreeningPacketPlan } from "@/lib/rcap-engine/contracts";
import { IL_PROGRAM_ROUTE } from "@/lib/rcap-engine/illinois-program-facts";

// IL2a: reviewed EXP-AD/qualprob and CXP source sets; no family renderer is installed.
const expAdForms = [
  "IL:STATES/IL/02_PACKET_FORMS/IL__FORM__EXP-AD-REQUEST__request-to-expunge-and-or-seal-criminal-records__REV-2026-06__EN.pdf:44792beaede1d03f5ea65e61dba00cdf5cb9b7c617f7ff265e55e92576cd7853",
  "IL:LegalEase Illinois/EXP-AD Case List Request to Expunge Seal Records.pdf:b72d30d274b061e0671933b8bd65abf7d2c37a6f1dd4ebfbf3968bc55b9bed0c",
  "IL:STATES/IL/02_PACKET_FORMS/IL__FORM__EXP-AD-ORDER-GRANTING__order-to-expunge-and-or-seal-criminal-records__REV-2026-06__EN.pdf:52e06b58008d797aa861902bf6b85e281804af8b4a397c591fc1c270b0151305",
  "IL:STATES/IL/02_PACKET_FORMS/IL__FORM__FW-CIV-APPLICATION__application-for-waiver-of-court-fees-civil__REV-2025-08__EN.pdf:b2da395f5ba53eb3cec6bbd39a746f2152bf7f84987ea5f4b5c511ada17337f5"
];
const cannabisForms = [
  "IL:LegalEase Illinois/CXP Motion to Vacate and Expunge.pdf:728ad50c5db068d3d3a6bc68901c79431e865f8e2eaa94c37c38a086d9815acf",
  "IL:LegalEase Illinois/CXP Additional Cannabis Convictions.pdf:32b1ef344909ff9a38b816f0235f261678c57abaebe9858aec12b70094e55969",
  "IL:LegalEase Illinois/CXP Notice of Court Date for Motion.pdf:56179412256e2c98b0f535a328801e4cf012ae3d179848c3a1efe7df6377b041",
  "IL:LegalEase Illinois/CXP Additional Notice of Court Date.pdf:4a6dde5541b6531f99a4294e07a28ea85096ea5c982ee76e46cf3e8dd00b0afa",
  "IL:LegalEase Illinois/CXP Order Granting or Denying Motion.pdf:ca0fdef8909a3ef134c562d09a89dcc24de22036c7b8238902443892c3ac77cc"
];
const formsByRoute: Readonly<Record<string, readonly string[]>> = {
  "adult-conviction-sealing": expAdForms,
  [IL_PROGRAM_ROUTE]: expAdForms,
  "cannabis-specific-automatic-or-petition-expungement": cannabisForms,
  "adult-non-conviction-expungement": [],
  "human-trafficking-survivor-vacatur-and-expungement": [],
  "juvenile-automatic-or-petition-expungement": []
};

export function illinoisPlanForms(profile: EngineProfile, pathwayId: string): Pick<ScreeningPacketPlan, "sourceFormIds" | "formMappingStatus"> | undefined {
  const forms = formsByRoute[pathwayId], plan = profile.packetGenerator.pathways.find(p => p.pathwayId === pathwayId);
  if (!forms || profile.jurisdiction.code !== "IL" || profile.profileVersion !== "2026-06-19-source-conversion-1"
    || profile.source?.sourceCorpusSha256 !== "aa34523e3b643b32124db5d83973622f37082f2d112b3e32ef55912258a7e630"
    || plan?.mode !== "official_form_overlay_or_source_form_set" || plan.formMappingStatus !== "source_candidate_identified"
    || plan.formCandidates?.length !== 1
    || plan.formCandidates[0].relativePath !== "LegalEase Illinois/CXP Additional Cannabis Convictions.pdf"
    || plan.formCandidates[0].sha256 !== "32b1ef344909ff9a38b816f0235f261678c57abaebe9858aec12b70094e55969") return undefined;
  return { sourceFormIds: [...forms], formMappingStatus: forms.length ? "source_candidate_identified" : "not_required" };
}

export function isIllinoisOfficialPlanUninstalled(plan: ScreeningPacketPlan): boolean {
  return (formsByRoute[plan.pathwayId]?.length ?? 0) > 0
    && plan.mode === "official_form_overlay_or_source_form_set"
    && plan.sourceFormIds.some(id => id.startsWith("IL:"));
}
