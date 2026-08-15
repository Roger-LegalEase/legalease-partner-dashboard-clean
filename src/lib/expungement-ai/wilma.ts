export type WilmaPageContext =
  | "landing"
  | "pricing"
  | "start"
  | "check"
  | "results"
  | "pay"
  | "packet-ready"
  | "briefcase";

// The frontend sends page context and renders responses; it must not decide eligibility.
// draftWilmaPlaceholderResponse below is the deterministic, guardrail-safe fallback used
// when no model provider is configured (see wilma-model.ts) — Wilma never *requires* a
// live provider. The live system prompt lives in wilma-system-prompt.ts.
export function wilmaPromptForPage(context: WilmaPageContext) {
  const prompts: Record<WilmaPageContext, string> = {
    landing: "Want me to explain how this works?",
    pricing: "Want to know what is included?",
    start: "Want help getting started?",
    check: "Want me to explain a question?",
    results: "Want me to explain this result?",
    pay: "Want to know what happens after payment?",
    "packet-ready": "Want help with next steps?",
    briefcase: "Want me to explain anything in your Briefcase?"
  };

  return prompts[context];
}

export const wilmaSystemPromptVersion = "wilma-system-prompt-v1";
// Fallback identifier, used when no model provider answers. Wilma must never *require* a
// live provider; the deterministic placeholder below covers that path.
export const wilmaModelVersion = "placeholder-no-provider-v1";
// Identifier for the live model path (wilma-model.ts), reported in telemetry when the
// provider produces the reply.
export const wilmaLiveModelVersion = "wilma-openai-responses-v1";

export function draftWilmaPlaceholderResponse(message: string, locale: "en" | "es" = "en") {
  if (/\b(eligible|qualify|qualification|do i qualify|yes or no)\b/i.test(message)) {
    if (locale === "es") {
      return "La revisión guiada gratis usa sus respuestas y las reglas de su estado para mostrar qué opciones podrían estar disponibles. Puedo explicar las preguntas, pero no decido qué opción está disponible.";
    }
    return "The free guided check uses your answers and your state's rules to show which options may be available. I can explain any question and help you return to the check, but I do not decide which option is available. Want to go through it?";
  }

  if (/\b(lawyer|attorney|legal advice|what should i file|strategy)\b/i.test(message)) {
    if (locale === "es") {
      return "Soy una guía, no su abogada. Puedo explicar el proceso general en lenguaje sencillo, pero para asesoría sobre su situación específica conviene hablar con ayuda legal o con un abogado.";
    }
    return "I'm a guide, not your lawyer. I would rather point you to the right person than guess about something that matters. I can explain the general process in plain English and help you find legal help for advice about your situation.";
  }

  if (/\b(expungement|sealing|petition|filing|court)\b/i.test(message)) {
    if (locale === "es") {
      return "Puedo explicarle el proceso general con palabras claras. La revisión guiada gratis muestra qué opciones podrían estar disponibles. Para una estrategia legal sobre su caso, hable con un abogado o con ayuda legal.";
    }
    return "I can explain how the general process works in plain English. The free guided check shows which options may be available. A lawyer or legal aid should handle legal strategy for your case.";
  }

  if (locale === "es") {
    return "Puedo ayudarle a entender los pasos y las palabras confusas. La revisión guiada gratis usa sus respuestas y las reglas correspondientes para mostrar qué opciones podrían estar disponibles.";
  }
  return "I can help explain the steps and confusing words. The free guided check uses your answers and the applicable rules to show which options may be available.";
}
