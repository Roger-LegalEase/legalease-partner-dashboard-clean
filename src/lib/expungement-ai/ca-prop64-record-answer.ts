/** Exact CA record-detail input contract. This classifies input, never legal eligibility. */
export const CA_PROP64_RECORD_ANSWER_CONTRACT = "ca_prop64_record_fact_v1" as const;
export const CA_PROP64_RECORD_FACT_IDS = ["court", "charge"] as const;

export function caProp64RecordAnswerState(id: string, value: unknown): "unanswered" | "invalid" | "known_valid" | "uncertain" | "declined" {
  if (!CA_PROP64_RECORD_FACT_IDS.some((factId) => factId === id)) return "invalid";
  if (value === undefined || value === null || value === "") return "unanswered";
  if (typeof value === "object" && !Array.isArray(value)) {
    const wrapper = value as Record<string, unknown>;
    if (Object.keys(wrapper).some((key) => key !== "value" && key !== "unknown")
      || wrapper.unknown !== undefined && typeof wrapper.unknown !== "boolean") return "invalid";
    if (wrapper.unknown === true) return "uncertain";
    value = wrapper.value;
    if (value === undefined || value === null) return "unanswered";
  }
  if (typeof value !== "string") return "invalid";
  const text = value.trim().toLowerCase();
  if (!text) return "unanswered";
  if (["i am not sure", "i'm not sure", "not sure", "unsure", "unknown", "not_sure",
    "no estoy seguro", "no estoy segura", "no sé", "no se"].includes(text)) return "uncertain";
  if (text === "prefer not to say") return "declined";
  return "known_valid";
}
