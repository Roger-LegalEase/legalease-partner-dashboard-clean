export type WilmaPageContext =
  | "landing"
  | "pricing"
  | "start"
  | "check"
  | "results"
  | "pay"
  | "packet-ready"
  | "briefcase";

// Placeholder adapter only; replace with the production Wilma service integration and safety harness.
// The frontend sends page context and renders responses; it must not decide eligibility.
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

export const wilmaSystemPromptVersion = "wilma-safety-harness-v1";
export const wilmaModelVersion = "placeholder-no-provider-v1";

export function draftWilmaPlaceholderResponse(message: string) {
  if (/\b(eligible|qualify|qualification|do i qualify|yes or no)\b/i.test(message)) {
    return "That is exactly what the screening tool is built to figure out. I can explain the questions and walk you back to the tool, but I do not decide eligibility.";
  }

  if (/\b(lawyer|attorney|legal advice|what should i file|strategy)\b/i.test(message)) {
    return "I am a guide, not your lawyer. I can explain the general process in plain language, and I can point you to legal help for advice about your specific situation.";
  }

  if (/\b(expungement|sealing|petition|filing|court)\b/i.test(message)) {
    return "I can explain the general process. The screening tool handles eligibility, and any legal strategy questions should go to a qualified legal helper.";
  }

  return "I can help explain the process in plain language and keep you oriented. For eligibility, use the screening tool so your details are checked the right way.";
}
