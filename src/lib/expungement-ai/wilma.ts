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
