import "server-only";
import { createHash } from "node:crypto";
import contracts from "@/lib/expungement-ai/reviewed-contact-contracts.json";
import type { getProfileByJurisdiction } from "@/lib/rcap-engine/profile-registry";
import type { RegisteredSpecification } from "@/lib/rcap/grade-a/packet-specification";
import type { AnswerValue } from "@/lib/expungement-ai/frontend/contracts";

export const CONTACT_COMPONENT_IDS = ["mailing_address", "phone_number", "email_address"] as const;
export type ContactRepresentationContract = { routeKey: string; contractSha256: string };
/** Protected derivation evidence. Historical raw text is excluded from active facts and summary mirrors. */
export type ContactRepresentationProvenance = ContactRepresentationContract & {
  version: 1;
  inputSha256: string;
  outputSha256: string;
  replacedAnswerSha256?: string;
  legacyAnswers?: Array<{ value: AnswerValue; source: "screeningAnswers" | "prefilledAnswers" | "packetAnswers";
    meaning: "independent_legacy_contact_information" | "exact_prior_component_composition"; profileVersion: string; routeKey: string; valueSha256: string }>;
};

export function contactRepresentationHash(value: unknown): string {
  const canonical = (part: unknown): unknown => Array.isArray(part) ? part.map(canonical)
    : part && typeof part === "object" ? Object.fromEntries(Object.entries(part).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([key, item]) => [key, canonical(item)])) : part;
  return createHash("sha256").update(JSON.stringify(canonical(value))).digest("hex");
}

/** A reviewed representation exception, independent of broad evaluator protection. */
export function reviewedContactRepresentation(input: {
  profile: NonNullable<ReturnType<typeof getProfileByJurisdiction>>;
  pathwayId: string | null;
  specification: RegisteredSpecification | null;
  requiredInputIds: string[];
  decidingFactIds: ReadonlySet<string>;
  unresolvedFactIds: ReadonlySet<string>;
}): ContactRepresentationContract | null {
  const routeKey = `${input.profile.jurisdiction.code}:${input.pathwayId ?? ""}`;
  const reviewed = (contracts.routes as Record<string, {
    specificationId: string; contractSha256: string;
    equivalentContactSuccessors?: Array<{ specificationVersion: string; contractSha256: string }>;
  }>)[routeKey];
  const spec = input.specification;
  if (!reviewed || !spec || !spec.requiredFacts || !("fieldOwnership" in spec) || spec.specificationId !== reviewed.specificationId
    || input.decidingFactIds.has("contact_information") || input.unresolvedFactIds.has("contact_information")
    || !["contact_information", ...CONTACT_COMPONENT_IDS].every((id) => input.requiredInputIds.includes(id))) return null;
  // The only reviewed profile use is its generic packet-input declaration.
  // Any new question, rule, safety or other semantic consumer fails closed.
  const remainingProfile = { ...input.profile, packetGenerator: { ...input.profile.packetGenerator,
    requiredInputs: input.profile.packetGenerator.requiredInputs.filter((id) => id !== "contact_information") } };
  if (JSON.stringify(remainingProfile).includes("contact_information") || JSON.stringify(spec.documents).includes("contact_information")) return null;
  const contract = { specificationId: spec.specificationId, packetFamily: spec.packetFamily,
    requiredFacts: spec.requiredFacts.filter((fact) => ["contact_information", ...CONTACT_COMPONENT_IDS].includes(fact.factId)),
    fieldOwnership: spec.fieldOwnership, documents: spec.documents };
  const currentHash = contactRepresentationHash(contract);
  // A reviewed document successor may change unrelated case/caption sections
  // while preserving every contact consumer, owner and condition. Match its
  // exact full contract; retain the original representation identity so saved
  // provenance does not become invalid merely because those sections changed.
  const exactReviewedContract = currentHash === reviewed.contractSha256
    || reviewed.equivalentContactSuccessors?.some(successor =>
      successor.specificationVersion === spec.specificationVersion && successor.contractSha256 === currentHash);
  return exactReviewedContract ? { routeKey, contractSha256: reviewed.contractSha256 } : null;
}

export function contactRepresentationProvenance(contract: ContactRepresentationContract, answers: Record<string, AnswerValue>, output: AnswerValue, previous?: ContactRepresentationProvenance): ContactRepresentationProvenance {
  return { ...contract, version: 1, inputSha256: contactRepresentationHash(CONTACT_COMPONENT_IDS.map((id) => answers[id] ?? null)),
    outputSha256: contactRepresentationHash(output), ...(previous?.replacedAnswerSha256 ? { replacedAnswerSha256: previous.replacedAnswerSha256 } : {}),
    ...(previous?.legacyAnswers ? { legacyAnswers: previous.legacyAnswers } : {}) };
}

/** Presence alone is not provenance: the current route, contract and retained output must match. */
export function isProvenContactOutput(contract: ContactRepresentationContract, output: AnswerValue | undefined, provenance?: ContactRepresentationProvenance): boolean {
  return Boolean(provenance?.version === 1 && provenance.routeKey === contract.routeKey && provenance.contractSha256 === contract.contractSha256
    && /^[a-f0-9]{64}$/.test(provenance.inputSha256) && output !== undefined && provenance.outputSha256 === contactRepresentationHash(output));
}
