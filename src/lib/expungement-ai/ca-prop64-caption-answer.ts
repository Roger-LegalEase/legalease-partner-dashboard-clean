export const CA_PROP64_CAPTION_ANSWER_CONTRACT = "ca_prop64_caption_fact_v1" as const;
export const CA_PROP64_CAPTION_TEXT_IDS = ["participant_full_legal_name", "ca_prop64_court_case_number", "ca_prop64_filing_court_county"];

/** Preserve exact court text, including leading zeros, rather than accepting
 * numeric coercion or a shape that the saved text control cannot represent. */
export function caProp64CaptionAnswerState(id: string, value: unknown): "unanswered" | "invalid" | "known_valid" | "uncertain" | "declined" {
  if (!CA_PROP64_CAPTION_TEXT_IDS.includes(id)) return "invalid";
  if (value === undefined || value === null || value === "") return "unanswered";
  if (typeof value === "object" && !Array.isArray(value)) {
    const wrapper = value as Record<string, unknown>;
    if (Object.keys(wrapper).some(key => key !== "value" && key !== "unknown")
      || wrapper.unknown !== undefined && typeof wrapper.unknown !== "boolean") return "invalid";
    if (wrapper.unknown === true) return "uncertain";
    if (!Object.hasOwn(wrapper, "value")) return "invalid";
    value = wrapper.value;
    if (value === undefined || value === null) return "unanswered";
  }
  if (typeof value !== "string" || /[\x00-\x1f\x7f]/.test(value)) return "invalid";
  const text = value.trim().toLowerCase().replace(/\u2019/g, "'");
  if (!text) return "unanswered";
  if (["i am not sure", "i'm not sure", "not sure", "unsure", "unknown", "not_sure", "no estoy seguro", "no estoy segura", "no sé", "no se"].includes(text)) return "uncertain";
  return text === "prefer not to say" ? "declined" : "known_valid";
}
