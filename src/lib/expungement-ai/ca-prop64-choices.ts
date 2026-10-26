import copy from "@/lib/expungement-ai/frontend/ca-prop64-reviewed-choices.json";
import type { PublicQuestion } from "@/lib/rcap-engine/contracts";

export const CA_PROP64_CURRENT = "prop-64-currently-serving-petition-11361-8";
export const CA_PROP64_COMPLETED = "prop-64-completed-sentence-application-11361-8";
export const CA_PROP64_QUESTIONS: PublicQuestion[] = copy.questions.map((question) => ({ ...question,
  stage: "timing_and_completion", type: "single_choice",
  optionDisplay: Object.fromEntries(Object.entries(question.optionDisplay).filter(([, display]) => display !== undefined))
}));
export const CA_PROP64_CLARIFICATION_COPY = copy.clarificationCopy;
export const CA_PROP64_RECOVERY_COPY = copy.recoveryCopy;

export function isCaProp64Pathway(jurisdiction: string, pathwayId: string | null | undefined): boolean {
  return jurisdiction === "CA" && (pathwayId === CA_PROP64_CURRENT || pathwayId === CA_PROP64_COMPLETED);
}

/** A display/validation adapter for these two exact authored controls, never an ID-only global alias. */
export function isCaProp64ChoiceQuestion(question: { id: string; type: string; options?: unknown }): boolean {
  const authored = CA_PROP64_QUESTIONS.find((candidate) => candidate.id === question.id);
  return Boolean(authored && question.type === authored.type && JSON.stringify(question.options) === JSON.stringify(authored.options));
}

/** Preserve raw storage. Only exact reviewed single-value phrases establish a branch/request. */
export function caProp64Choice(factId: string, value: unknown): string | null {
  if (!CA_PROP64_QUESTIONS.some((question) => question.id === factId)) return null;
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const wrapper = value as Record<string, unknown>;
    if (Object.keys(wrapper).some((key) => key !== "value" && key !== "unknown")) return null;
    if (wrapper.unknown === true) return "I am not sure";
    if (wrapper.unknown !== undefined && wrapper.unknown !== false) return null;
    value = wrapper.value;
  }
  if (typeof value !== "string") return null;
  const token = value.trim().toLowerCase();
  if (["i am not sure", "i'm not sure", "not sure", "unsure", "unknown", "not_sure"].includes(token)) return "I am not sure";
  return copy.legacyAllowlist.find((entry) => entry.factId === factId && entry.exactNormalizedInput === token)?.canonicalWire ?? null;
}
