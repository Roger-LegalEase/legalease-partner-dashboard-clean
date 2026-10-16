import "server-only";
import { projectPublicProfile } from "@/lib/rcap-engine/public-profile-projection";
import type { EngineProfile } from "@/lib/rcap-engine/contracts";
import type { ProfileQuestion } from "@/lib/expungement-ai/frontend/contracts";
import type { RegisteredSpecification } from "@/lib/rcap/grade-a/packet-specification";
import { contactRepresentationHash } from "@/lib/expungement-ai/contact-representation";
import memo from "../../../data/record-clearing/legal-design-intake/MN.memo.json";
import petitionMap from "../../../data/rcap-all50/overlays/census-v1/mn/mn-petition-609a02-subd3-set--custom-pleading/production-field-map.json";
import petitionWiring from "../../../data/rcap-all50/overlays/census-v1/mn/mn-petition-609a02-subd3-set--custom-pleading/product-wiring.json";
import prosecutorMap from "../../../data/rcap-all50/overlays/census-v1/mn/mn-prosecutor-agreed-set--custom-pleading/production-field-map.json";
import prosecutorWiring from "../../../data/rcap-all50/overlays/census-v1/mn/mn-prosecutor-agreed-set--custom-pleading/product-wiring.json";

export const MN_PETITION_ROUTE = "petition-based-expungement-under-609a-02-03";
export const MN_PROSECUTOR_ROUTE = "prosecutor-agreed-sealing-without-a-full-petition-under-609a-025";
export const MN_CASE_COUNTY = "mn_deciding_case_county";
export const MN_PROSECUTED_COUNTY = "mn_prosecuted_case_county";
export const MN_PROSECUTOR_KIND = "mn_prosecuted_by";
export const MN_PROSECUTING_CITY = "mn_prosecuting_city";
export const MN_TWO_COUNTY_SOURCE = "MN.memo:mn_petition_609a02_subd3, mn_prosecutor_agreed; required participant county/prosecutedBy inputs";

/** Collection identity only. This is not a route/track crosswalk, agreement,
 * filing authority or an installation of the retained document families. */
export function mnTwoCountySourceContract(profile: EngineProfile | undefined,
  pathwayId: string | null | undefined, specification: RegisteredSpecification | null | undefined,
  current: { memo?: unknown; map?: unknown; wiring?: unknown } = {}): boolean {
  if (profile?.jurisdiction.code !== "MN" || specification != null
    || ![MN_PETITION_ROUTE, MN_PROSECUTOR_ROUTE].includes(pathwayId ?? "")) return false;
  const petition = pathwayId === MN_PETITION_ROUTE;
  return contactRepresentationHash(profile) === "f779704436f10e0aabf0949877f3213af1900d5bf51729cec8397006e6a3f8bf"
    && contactRepresentationHash(current.memo === undefined ? memo : current.memo) === "f0e6fbc0b3082a8721be317442151023be3a31fcb597dd96c4dde4e76596644a"
    && contactRepresentationHash(current.map === undefined ? petition ? petitionMap : prosecutorMap : current.map)
      === (petition ? "4ed42eaf8d64764f9ffafdfda713fdaf84b082662e29f2579022680d88607b66" : "8b3e793a3ac0d4431c0c609c8465a14137ba02db05466110e99b6cf7ef53b419")
    && contactRepresentationHash(current.wiring === undefined ? petition ? petitionWiring : prosecutorWiring : current.wiring)
      === (petition ? "d02b19ce7bdb8542c13c5135a8c2a3e24d28c01c48d9cae5c3a4be3c452b4ca2" : "b1a525e1f98998aa1557d1b15b7251640027f17cce5574466e828fd10e2b0765");
}

export function mnTwoCountyFactIds(pathwayId: string): string[] {
  return pathwayId === MN_PETITION_ROUTE ? [MN_CASE_COUNTY]
    : pathwayId === MN_PROSECUTOR_ROUTE ? [MN_PROSECUTED_COUNTY, MN_PROSECUTOR_KIND, MN_PROSECUTING_CITY] : [];
}

// Engineering EN/ES copy; adopted meaning does not certify final translations.
export function mnTwoCountyQuestions(pathwayId: string): ProfileQuestion[] {
  const text = (id: string, prompt: string, helperText: string, es: string, esHelper: string): ProfileQuestion => ({
    id, stage: "packet_information", type: "text_or_unknown", required: true, contextOnly: false, options: null,
    prompt, helperText, translations: { es: { prompt: es, helperText: esHelper } }
  });
  if (pathwayId === MN_PETITION_ROUTE) return [text(MN_CASE_COUNTY,
    "Which Minnesota county's district court decided this case?",
    "Use the county shown for this case in the court papers. Your home county and the county where you sign can be different.",
    "¿El tribunal de distrito de qué condado de Minnesota resolvió este caso?",
    "Use el condado que figura para este caso en los documentos judiciales. Su condado de residencia y el condado donde firma pueden ser distintos.")];
  if (pathwayId !== MN_PROSECUTOR_ROUTE) return [];
  const kind = text(MN_PROSECUTOR_KIND, "Was this case prosecuted by the county attorney or a city attorney?",
    "Use the prosecutor named in the court papers. This answer does not show that the prosecutor agreed to sealing.",
    "¿Este caso fue procesado por la fiscalía del condado o por una fiscalía municipal?",
    "Use la fiscalía nombrada en los documentos judiciales. Esta respuesta no demuestra que haya aceptado el sellado.");
  kind.type = "single_choice";
  kind.options = ["county_attorney", "city_attorney", "unknown"];
  kind.optionDisplay = {
    county_attorney: { label: "County attorney", translations: { es: { label: "Fiscalía del condado" } } },
    city_attorney: { label: "City attorney", translations: { es: { label: "Fiscalía municipal" } } },
    unknown: { label: "I am not sure", translations: { es: { label: "No estoy seguro" } } }
  };
  return [text(MN_PROSECUTED_COUNTY, "In which Minnesota county was this case prosecuted?",
    "Use the county shown for this case in the court papers.",
    "¿En qué condado de Minnesota se procesó este caso?",
    "Use el condado que figura para este caso en los documentos judiciales."), kind,
  text(MN_PROSECUTING_CITY, "Which city's attorney prosecuted this case?",
    "Use the city named for the prosecuting attorney in the court papers.",
    "¿La fiscalía de qué ciudad procesó este caso?",
    "Use la ciudad que figura para la fiscalía en los documentos judiciales.")];
}

/** Current target-case meaning, confirmed explicitly through the existing
 * record-fact contract. A historical generic State/local scalar is not proof. */
export const MN_TARGET_ORIGIN_ID = "jurisdiction_scope";
export const MN_TARGET_ORIGIN_SOURCE = "OWNER-RELAYED-ADOPTION-v4:MN target conviction only; other history evaluated separately";
// These are existing target-case inputs in the MN profile/held source. The
// charge/statute source answer is retained literally. No actual case-number
// value is held here; possession of paperwork is not identity. Missing optional
// identity remains unanswered, not a new question.
// No residence, signing county, contact or destination answer supplies origin.
export const MN_TARGET_ORIGIN_IDENTITY_INPUTS = [
  "court", "charge",
  "source_question_04_4-what-were-the-charges-and-statute-numb"
] as const;

export function mnTargetOriginQuestion(profile: EngineProfile | undefined, pathwayId: string | null | undefined, specification: RegisteredSpecification | null | undefined): ProfileQuestion | null {
  if (!profile || !mnTwoCountySourceContract(profile, pathwayId, specification)) return null;
  const question = projectPublicProfile(profile).questions.find(candidate => candidate.id === MN_TARGET_ORIGIN_ID);
  const options = question?.options;
  if (!question || question.prompt !== "Did this case happen in Minnesota (not a federal case)?"
    || question.type !== "single_choice" || !Array.isArray(options) || !options.every(option => typeof option === "string")
    || JSON.stringify(options) !== JSON.stringify(["State or local", "Federal", "I am not sure"])) return null;
  return { id: question.id, stage: question.stage, type: question.type, prompt: question.prompt,
    helperText: question.helperText, required: true, contextOnly: false,
    lifecyclePhase: question.lifecyclePhase, options,
    translations: question.translations };
}

/** Filter a single source-owned inventory entry, never a fact from the
 * aggregate set: another unresolved rule may reference the same fact. */
export function mnTargetOriginRule18Entry(entry: { section: string; ruleId: string; factIds: string[] }): boolean {
  return entry.section === "orderedDecisionRules" && entry.ruleId === "rule-18-federal-or-out-of-state-conviction"
    && entry.factIds.length === 1 && entry.factIds[0] === "residency_or_location";
}
