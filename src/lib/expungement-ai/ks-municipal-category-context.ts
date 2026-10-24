import type { ProfileQuestion } from "@/lib/expungement-ai/frontend/contracts";
import type { EngineProfile } from "@/lib/rcap-engine/contracts";
import type { RegisteredSpecification } from "@/lib/rcap/grade-a/packet-specification";
import { contactRepresentationHash as hash } from "@/lib/expungement-ai/contact-representation";
import memo from "../../../data/record-clearing/legal-design-intake/KS.memo.json";

/** Original GA12 rows78/79 only. Retained literal category is not the exact
 * ordinance, statutory ground or state-equivalent offense; no alias or finding.
 * Technical source-purpose guards are not new output/legal approvals. */
export const KS_MUNICIPAL_CATEGORY_CONTRACTS = {
  "municipal-arrest-record-expungement-under-12-4516a": {
    "trackId": "ks-12-4516a-municipal-arrest",
    "authoritySha256": "8977a2c2b808008154d060d62970c86b59057a35d70e56a05cd791c562941194",
    "memoTrackSha256": "4f819981c68b1242ebe5bf86154c9238d673d2b20e8600618e0046d08e1608ad",
    "specificationSha256": "b0aed79e5ba63f494b957a1fa170360f76096815b98b3a8c4381465fe12de49e"
  },
  "municipal-conviction-or-diversion-expungement-under-12-4516": {
    "trackId": "ks-12-4516-municipal",
    "authoritySha256": "3e758ce7d68c23a7c15faa34d35a80e866b596d5d2d8e04d3cb267f3ed27172d",
    "memoTrackSha256": "c82b3aea707b59103712f53744f96858505f9db7d47232174522574dcafaa870",
    "specificationSha256": "f688e39d510836c0a7cd7a95cd27bbfdb36b72fc48941539a778298335667663"
  }
} as const;
function authority(profile: EngineProfile, pathwayId: string) {
  const pathway = profile.pathways.find(path => path.id === pathwayId);
  // The public EngineProfile type omits these retained compiled fields. Read
  // their actual shape safely; the whole pathway below still pins every value.
  const rawTriggerFields = pathway && "triggerFields" in pathway ? pathway.triggerFields : undefined;
  const triggerFields = Array.isArray(rawTriggerFields)
    ? rawTriggerFields.filter((id: unknown): id is string => typeof id === "string") : [];
  const ids = new Set([...triggerFields, "offense_category", "charge", "offense_level", "case_outcome"]);
  return {
    pathway,
    packetPathways: profile.packetGenerator.pathways.filter(path => path.pathwayId === pathwayId),
    orderedDecisionRules: profile.orderedDecisionRules.filter(rule => rule.candidatePathwayIds?.includes(pathwayId)
      || rule.when.backendPathwayId === pathwayId),
    questions: profile.questions.filter(question => ids.has(question.id)),
    categoryDeclared: profile.packetGenerator.requiredInputs.includes("offense_category")
  };
}
export function ksMunicipalCategoryIsContext(profile: EngineProfile | undefined,
  pathwayId: string | null | undefined, specification: RegisteredSpecification | null | undefined): boolean {
  if (!profile || !pathwayId || !Object.hasOwn(KS_MUNICIPAL_CATEGORY_CONTRACTS, pathwayId)) return false;
  const contract = KS_MUNICIPAL_CATEGORY_CONTRACTS[pathwayId as keyof typeof KS_MUNICIPAL_CATEGORY_CONTRACTS];
  return profile.jurisdiction.code === "KS"
    && profile.profileVersion === "2026-06-19-source-conversion-1"
    && profile.source?.sourceCorpusSha256 === "c0bbc9c540a680f360113b8aee2ee5ac0f19ffda4958c8f3974366f68c150362"
    && hash(authority(profile, pathwayId)) === contract.authoritySha256
    && hash(memo.tracks.filter(track => track.trackId === contract.trackId)) === contract.memoTrackSha256
    && specification?.routeKey === `KS:${pathwayId}` && specification.trackId === contract.trackId
    && hash(specification) === contract.specificationSha256
    && !JSON.stringify(specification).includes("offense_category");
}

/** The held editor uses model.questions, while the ordinary builder uses a
 * filtered copy. Both retain the same literal value and optional obligation. */
export function ksMunicipalCategoryContextQuestion(question: ProfileQuestion, context: boolean): ProfileQuestion {
  if (!context || question.id !== "offense_category" || question.type !== "text_or_unknown"
    || question.prompt !== "What category does the court record use for this offense?") return question;
  return { ...question, required: false,
    helperText: "Optional context. You may keep or correct the category stated in the record. It does not establish the ordinance, the ground for relief or the equivalent state offense.",
    translations: { ...question.translations, es: { ...question.translations?.es,
      helperText: "Contexto opcional. Puede conservar o corregir la categoría indicada en el expediente. Esta categoría no determina la ordenanza aplicable, el motivo de la solicitud ni el delito estatal equivalente."
    } }
  };
}
