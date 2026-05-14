import process from "node:process";

const scenarios = [
  ["IL dismissed state case", "likely eligible -> email gate -> checkout"],
  ["PA nonconviction", "likely eligible -> email gate -> checkout"],
  ["MD dismissal/not guilty", "likely eligible -> email gate -> checkout"],
  ["DC nonconviction sealing by motion", "likely eligible only if required facts are present"],
  ["MS dismissed/dropped/not guilty", "likely eligible -> email gate -> checkout"],
  ["TX Chapter 55A acquittal", "likely eligible -> email gate -> checkout"],
  ["TX nondisclosure", "no paid CTA"],
  ["Federal case", "not a fit"],
  ["Unsupported state", "outside supported scope"],
  ["Pending case", "no paid CTA"],
  ["No email captured", "no checkout"],
  ["Fake browser payment-success POST", "no order, no docs, no tracker"],
  ["Duplicate webhook replay", "one order and one document/tracker handoff"],
  ["40-message cap", "safe stop"],
  ["Expired session", "safe restart message"]
];

const prompts = [
  ["IL", "My Illinois state case in Cook County was dismissed. It was an adult case and nothing is pending."],
  ["PA", "My Pennsylvania charges were withdrawn and I have the county docket."],
  ["MD", "My Maryland case was dismissed more than three years ago and all charges were resolved."],
  ["DC", "My DC case ended without a conviction and I have facts about housing and work reasons for sealing."],
  ["MS", "My Mississippi charge was dismissed and there is no pending case."],
  ["TX", "I was acquitted in a Texas trial court and there is no same criminal episode conviction or pending case."],
  ["TX nondisclosure", "I finished deferred adjudication and want a nondisclosure order."],
  ["Unsupported", "My record is in New York."],
  ["Federal", "This was a federal case."],
  ["Pending", "I still have a pending criminal case."]
];

console.log("Wilma smoke test guide");
console.log("======================");
console.log("");
console.log("Run this against the browser or API after deploying to staging/production.");
console.log("This script documents expected pass/fail behavior; it does not mutate production data.");
console.log("");
console.log("Manual QA matrix:");
for (const [scenario, expected] of scenarios) {
  console.log(`- ${scenario}: ${expected}`);
}
console.log("");
console.log("Suggested prompts:");
for (const [label, prompt] of prompts) {
  console.log(`- ${label}: ${prompt}`);
}
console.log("");
console.log("Required follow-up checks:");
console.log("- Email gate appears before paid CTA for likely eligible paths.");
console.log("- Checkout is blocked unless likely eligible and email captured.");
console.log("- Verified webhook creates exactly one order.");
console.log("- Duplicate webhook replay is idempotent.");
console.log("- Admin audit page shows transcript, facts, decision, risk flags, checkout/payment/order, and document/tracker fulfillment.");

if (process.argv.includes("--strict")) {
  console.error("Strict automated smoke is not implemented; use the documented manual matrix.");
  process.exit(1);
}
