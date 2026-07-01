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
      return "Esa es exactamente la pregunta que la herramienta de revisión debe responder: compara sus datos con las reglas de su estado. Puedo explicar las preguntas y guiarle de vuelta, pero no decido la elegibilidad.";
    }
    return "Honestly? That's exactly what the screening tool is built to figure out — it checks your details against your state's rules, way more reliably than my gut read. I can explain any of the questions and walk you back to it, but I do not decide eligibility. Want to run through it?";
  }

  if (/\b(lawyer|attorney|legal advice|what should i file|strategy)\b/i.test(message)) {
    if (locale === "es") {
      return "Soy una guía, no su abogada. Puedo explicar el proceso general en lenguaje sencillo, pero para asesoría sobre su situación específica conviene hablar con ayuda legal o con un abogado.";
    }
    return "I'm a guide, not your lawyer — and I'd rather point you to the right person than guess on something that matters. I can explain the general process in plain English, and for advice about your specific situation I can point you to a lawyer or legal help.";
  }

  if (/\b(expungement|sealing|petition|filing|court)\b/i.test(message)) {
    if (locale === "es") {
      return "Puedo explicarle el proceso general en lenguaje sencillo. La herramienta de revisión es la que determina la elegibilidad, y cualquier estrategia legal específica debe verla una persona calificada.";
    }
    return "Happy to walk you through how the general process works, in plain English. The screening tool is the part that handles eligibility, and anything that's really legal strategy is better off with a qualified legal helper.";
  }

  if (locale === "es") {
    return "Puedo ayudarle a entender los pasos y las palabras confusas. Para elegibilidad, la herramienta de revisión es la respuesta confiable porque compara sus datos con las reglas correctas.";
  }
  return "I can help make this make sense — the steps, the words, wherever you're stuck — and keep you oriented. For eligibility, the screening tool's the honest answer, since it checks your details against the rules the right way.";
}
