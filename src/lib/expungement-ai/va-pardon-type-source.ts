import "server-only";
import type { EngineProfile } from "@/lib/rcap-engine/contracts";
import type { RegisteredSpecification } from "@/lib/rcap/grade-a/packet-specification";
import type { ProfileQuestion, AnswerValue } from "@/lib/expungement-ai/frontend/contracts";
import { contactRepresentationHash as hash } from "@/lib/expungement-ai/contact-representation";
import { questionAnswerState, scalarAnswerText } from "@/lib/expungement-ai/question-answer-state";
import memo from "../../../data/record-clearing/legal-design-intake/VA.memo.json";

export const VA_PARDON_ROUTE = "VA:regime-1-expungement-available-now";
// Reuse the retained memo's input key. Generic pardon_status keeps its old meaning.
export const VA_PARDON_TYPE_ID = "pardonType";
export const VA_PARDON_TYPE_INPUTS = ["case_outcome", "pardon_status", "charge", "court", "disposition_date"] as const;
export const VA_PARDON_TYPE_SOURCE = { memo: "VA.memo.json", trackId: "va_exp_absolute_pardon",
  inputPointer: "/tracks/1/participantInputs/9", adoption: "OWNER-RELAYED-ADOPTION-v3; section 7",
  scope: "participant reports what the pardon document says; no court finding or qualification certification" } as const;

/** Identity only for one existing held specification, never composition authority. */
export function vaPardonTypeContract(profile: EngineProfile | undefined, pathwayId: string | null | undefined,
  specification: RegisteredSpecification | null | undefined, currentSource: unknown = {
    trackId: memo.tracks[1].trackId, participantInput: memo.tracks[1].participantInputs[9],
    supportingDocument: memo.tracks[1].supportingDocuments[0]
  }): boolean {
  return profile?.jurisdiction.code === "VA" && `VA:${pathwayId}` === VA_PARDON_ROUTE
    && hash(profile) === "8b9e5e8eb7100788dae197f75a552d4e831918fc11d5fa74218652c1f8a7ca1c"
    && specification != null && "legalSectionsBound" in specification && specification.legalSectionsBound === false
    && hash(specification) === "1a86cdc4709753cb09fa4753a700f18a37feb4b9a6094a46f2db2e6244fe501e"
    && hash(currentSource) === "360845da4ffecfd1caaaef62380829b585986ceead09dfdbfc7559f39080d486";
}
export function vaPardonTypeDescriptor(profile: EngineProfile | undefined, pathwayId: string | null | undefined,
  specification: RegisteredSpecification | null | undefined): ProfileQuestion | null {
  if (!vaPardonTypeContract(profile, pathwayId, specification)) return null;
  return { id: VA_PARDON_TYPE_ID, stage: "packet_information", type: "yes_no_unsure", options: null,
    prompt: "Does the pardon document say it is an absolute pardon, and does it say it is for a crime you did not commit?",
    helperText: "Answer about the words in the pardon document for this case. If you do not know, choose I'm not sure. A general answer that you received a pardon does not answer this question.",
    required: true, contextOnly: false,
    translations: { es: {
      prompt: "¿El documento de indulto dice que es un indulto absoluto y que corresponde a un delito que usted no cometió?",
      helperText: "Responda sobre las palabras del documento de indulto de este caso. Si no lo sabe, elija No estoy seguro/a. Una respuesta general de que recibió un indulto no responde esta pregunta."
    } } };
}
/** Actual offered answers only, with saved > prefilled > screening precedence supplied by caller. */
export function vaPardonTypeQuestion(profile: EngineProfile | undefined, pathwayId: string | null | undefined,
  specification: RegisteredSpecification | null | undefined, answers: Readonly<Record<string, unknown>>, unresolvedInputIds: readonly string[] = []): ProfileQuestion | null {
  if (["case_outcome", "pardon_status"].some(id => unresolvedInputIds.includes(id))) return null;
  const question = vaPardonTypeDescriptor(profile, pathwayId, specification);
  if (!question || !profile) return null;
  for (const [id, value] of [["case_outcome", "Pardoned conviction"], ["pardon_status", "Yes"]]) {
    const offered = profile.questions.find(candidate => candidate.id === id);
    if (!offered || questionAnswerState(offered, answers[id] as AnswerValue) !== "known_valid"
      || scalarAnswerText(answers[id])?.trim() !== value) return null;
  }
  return question;
}
/** Classification of the reported answer, not a legal decision or qualification grant. */
export function vaPardonTypeReportedState(question: ProfileQuestion | null, raw: unknown): "known_both" | "known_not_both" | "unknown" {
  if (!question || questionAnswerState(question, raw as AnswerValue) !== "known_valid") return "unknown";
  // Shared question validation accepts primitive known booleans in retained raw facts.
  // Normalize only here; protected save API AnswerValue filtering is unchanged.
  const text = typeof raw === "boolean" ? raw ? "Yes" : "No" : scalarAnswerText(raw)?.trim();
  return text?.toLowerCase() === "yes" ? "known_both" : text?.toLowerCase() === "no" ? "known_not_both" : "unknown";
}
