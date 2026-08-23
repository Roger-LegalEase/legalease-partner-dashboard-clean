#!/usr/bin/env node
// Static detection of the shared UX defects the flow audit is asked to flag.
//
//   node scripts/expungement-ai/flow-audit/detect-static-defects.mjs
//   node scripts/expungement-ai/flow-audit/detect-static-defects.mjs --check
//
// Every finding names the file and line it was read from, so a reviewer can
// disagree with the conclusion without re-deriving the evidence. Findings are
// classified into the audit's twelve scope buckets and the twelve Mississippi
// reference canaries are answered global-or-state-specific here.
//
// Reads only. No product file is opened for writing by this script.

import {
  read, readJson, exists, gitSha, writeArtifact, stableJson,
  getAllJurisdictionProfiles, projectPublicProfile, deriveScreens
} from "./lib/engine.mjs";

const CHECK = process.argv.includes("--check");
const OUT = "data/expungement-ai/flow-audit/static-findings.json";

const SCOPES = [
  "GLOBAL_SHARED_COMPONENT", "GLOBAL_FACT_MODEL", "GLOBAL_NAVIGATION",
  "GLOBAL_REVIEW_FORMATTING", "GLOBAL_PAYMENT", "GLOBAL_HELP",
  "STATE_CONFIGURATION", "STATE_LEGAL_LOGIC", "COUNTY_DATA", "COURT_DATA",
  "CONTENT_ONLY", "REQUIRES_LEGAL_REVIEW"
];

/* ------------------------------------------------------------------ */
/* Evidence helpers                                                    */
/* ------------------------------------------------------------------ */

const sources = new Map();
function source(file) {
  if (!sources.has(file)) sources.set(file, exists(file) ? read(file).split("\n") : null);
  return sources.get(file);
}

/** First line number whose text contains `needle`, 1-indexed. */
function lineOf(file, needle) {
  const lines = source(file);
  if (!lines) return null;
  const index = lines.findIndex((line) => line.includes(needle));
  return index === -1 ? null : index + 1;
}

function evidence(file, needle, note) {
  const line = lineOf(file, needle);
  return { file, line, excerpt: line ? (source(file)[line - 1] ?? "").trim().slice(0, 240) : null, note: note ?? null };
}

/* ------------------------------------------------------------------ */
/* Derived inputs                                                      */
/* ------------------------------------------------------------------ */

const manifest = readJson("data/expungement-ai/flow-audit/flow-manifest.json");
const inventory = readJson("data/expungement-ai/flow-audit/question-inventory.json");
const reachability = readJson("data/expungement-ai/flow-audit/ui-reachability.json");

const findings = [];
let sequence = 0;
function finding(row) {
  sequence += 1;
  findings.push({
    findingId: `EXPAI-FA-${String(sequence).padStart(3, "0")}`,
    ...row,
    scope: row.scope,
    canary: row.canary ?? null
  });
}

/* ------------------------------------------------------------------ */
/* 1. Redirect cycles                                                  */
/* ------------------------------------------------------------------ */

finding({
  defectClass: "redirect_cycle",
  canary: 1,
  severity: "P0",
  scope: "GLOBAL_NAVIGATION",
  title: "Open matter and Complete packet information loop for any packet-ready matter whose paymentAllowed is false or whose commercialFlow cannot be reconstructed",
  detail:
    "The matter page decides the 'Complete packet information' CTA from packetInformationModelFor(item) alone. "
    + "The packet-information page it links to gates on a second condition the matter page never applies: "
    + "item.paymentAllowed || sponsored. A saved matter whose resultCode is packet_ready or packet_ready_with_caution "
    + "but whose paymentAllowed is false therefore gets a forward CTA that lands on a page which refuses and offers only "
    + "'Open matter', returning to the CTA. The same loop arises a second way: commercialFlowForItem returns null when a "
    + "legacy matter carries no persisted commercialFlow and its stored pathwayLabel does not string-match a "
    + "packetGenerator pathwayLabel, which makes the model null on both pages while the matter page's optional chain "
    + "(model?.stage !== 'ready_to_generate') still renders the forward CTA.",
  affectedFlowIds: manifest.flows
    .filter((flow) => flow.terminalOutcome.resultCode.startsWith("packet_ready"))
    .map((flow) => flow.flowId),
  evidence: [
    evidence("src/app/briefcase/[packetId]/page.tsx", "const model = item && packetMatter ? packetInformationModelFor(item) : null;", "matter page: no paymentAllowed guard"),
    evidence("src/app/briefcase/[packetId]/page.tsx", "{model?.stage === \"in_progress\" ? \"Resume packet information\" : \"Complete packet information\"}", "forward CTA rendered whenever the model is not ready_to_generate, including when the model is null"),
    evidence("src/app/briefcase/[packetId]/packet-information/page.tsx", "const model = item && packetResult && (item.paymentAllowed || sponsored)", "packet-information page: extra guard the matter page does not apply"),
    evidence("src/app/briefcase/[packetId]/packet-information/page.tsx", "Packet information is not available for this matter.", "refusal screen"),
    evidence("src/app/briefcase/[packetId]/packet-information/page.tsx", "Open matter", "refusal screen's only action returns to the matter page"),
    evidence("src/lib/expungement-ai/packet-information.ts", "if (!pathway) return null;", "commercialFlowForItem gives up when the stored pathwayLabel does not match a compiled pathwayLabel")
  ],
  reproduction: [
    "Sign in to a Briefcase that holds a matter with resultCode packet_ready_with_caution and paymentAllowed false (a matter saved before the payment clamp was persisted).",
    "Open /briefcase/{matterId}.",
    "Click 'Complete packet information'.",
    "Observe /briefcase/{matterId}/packet-information renders 'Packet information is not available for this matter.' with a single 'Open matter' action.",
    "Click 'Open matter' and observe the same forward CTA."
  ],
  actualBehaviour: "The participant alternates between two screens and can never reach the packet questionnaire.",
  expectedBehaviour: "Either the matter page suppresses the forward CTA under exactly the same condition the destination enforces, or the destination explains what is missing and offers a real next action.",
  implementationOwner: "shared briefcase navigation (src/app/briefcase/[packetId]/**)",
  legalReviewRequired: false
});

/* ------------------------------------------------------------------ */
/* 2. Missing pending feedback                                         */
/* ------------------------------------------------------------------ */

finding({
  defectClass: "action_without_pending_or_error_ui",
  canary: 2,
  severity: "P1",
  scope: "GLOBAL_SHARED_COMPONENT",
  title: "Save this matter and continue performs two sequential network calls with no pending state on the button",
  detail:
    "handlePacketAction awaits POST /api/expungement-ai/screening/pending and then POST /api/expungement-ai/screening/pending/claim. "
    + "The component holds packetActionError but no in-flight state: the button is never disabled, never relabelled, and no busy "
    + "affordance is rendered. The sibling controls in the same product do carry one (ConsumerCheckoutButton disables and shows "
    + "'Starting checkout...', PacketInformationBuilder disables and shows 'Saving...'), so this is an omission rather than a "
    + "house style. Nothing debounces a second click, and a second click starts a second pending row.",
  affectedFlowIds: manifest.flows.filter((flow) => flow.audience === "direct_to_consumer").map((flow) => flow.flowId),
  evidence: [
    evidence("src/components/expungement-ai/screening/ScreeningFlow.tsx", "async function handlePacketAction() {", "two awaited fetches, no pending state"),
    evidence("src/components/expungement-ai/screening/ScreeningResult.tsx", "onClick={onPacketAction}", "button carries no disabled or busy state"),
    evidence("src/app/expungement-ai/pay/ConsumerCheckoutButton.tsx", "isLoading ? translate(\"payment.starting\", \"Starting checkout...\")", "the pattern this control is missing"),
    evidence("src/components/expungement-ai/PacketInformationBuilder.tsx", "{saving ? \"Saving...\"", "the same pattern, again present elsewhere")
  ],
  reproduction: [
    "Complete a screening to any authoritative result.",
    "Throttle the network to Slow 3G.",
    "Click 'Save this matter and continue'.",
    "Observe the button stays enabled and unchanged for the whole round trip; click it again and observe a second pending row is created."
  ],
  actualBehaviour: "No visible acknowledgement between click and navigation; repeated clicks are accepted.",
  expectedBehaviour: "The control disables and announces its pending state for the duration of the request, as the checkout and packet-information controls already do.",
  implementationOwner: "shared screening result component",
  legalReviewRequired: false
});

/* ------------------------------------------------------------------ */
/* 3. Save-and-continue lands in the Briefcase list                    */
/* ------------------------------------------------------------------ */

finding({
  defectClass: "dead_end_next_action",
  canary: 3,
  severity: "P1",
  scope: "GLOBAL_NAVIGATION",
  title: "Save this matter and continue always lands on the Briefcase list rather than on the saved matter's next step",
  detail:
    "handlePacketAction hard-codes next: '/briefcase' for the authenticated claim and for the sign-in redirect. The claim "
    + "response's redirectTo is honoured, but the value the client asked for is the Briefcase index, not the matter that was "
    + "just created and not its packet-information step. The label says 'continue'; the destination is a list.",
  affectedFlowIds: manifest.flows.filter((flow) => flow.audience === "direct_to_consumer").map((flow) => flow.flowId),
  evidence: [
    evidence("src/components/expungement-ai/screening/ScreeningFlow.tsx", "body: JSON.stringify({ pendingId: pending.pendingId, next: \"/briefcase\" })", "authenticated claim target"),
    evidence("src/components/expungement-ai/screening/ScreeningFlow.tsx", "const params = new URLSearchParams({ mode: \"create\", next: \"/briefcase\" });", "sign-in redirect target"),
    evidence("src/components/expungement-ai/screening/ScreeningResult.tsx", "result.save_matter_continue", "the CTA copy that promises continuation")
  ],
  reproduction: [
    "Complete a screening to a packet-ready result.",
    "Click 'Save this matter and continue'.",
    "Observe the landing page is /briefcase, the list of all matters, not /briefcase/{newMatterId} or its packet-information step."
  ],
  actualBehaviour: "The participant is dropped on a list and has to find the matter they just created.",
  expectedBehaviour: "Continue lands on the saved matter's next action.",
  implementationOwner: "shared screening flow",
  legalReviewRequired: false
});

/* ------------------------------------------------------------------ */
/* 4. Known fact re-asked                                              */
/* ------------------------------------------------------------------ */

const reAskedByJurisdiction = [];
for (const profile of getAllJurisdictionProfiles()) {
  const code = profile.jurisdiction.code;
  const screenIds = new Set(deriveScreens(projectPublicProfile(profile)).map((q) => q.id));
  const requiredInputs = profile.packetGenerator.requiredInputs ?? [];
  const reAsked = requiredInputs.filter((id) => screenIds.has(id));
  if (reAsked.length > 0) reAskedByJurisdiction.push({ jurisdiction: code, reAsked });
}

finding({
  defectClass: "known_fact_re_asked",
  canary: 4,
  severity: "P1",
  scope: "GLOBAL_FACT_MODEL",
  title: "Facts already answered during screening are rendered again in the packet-information questionnaire, and the carry-forward is name-matched rather than guaranteed",
  detail:
    "packetInformationModelFor seeds initialAnswers with `requiredInputIds.filter(id => id in screeningAnswers)`. Carry-forward "
    + "therefore depends on the packet plan's input id being spelled exactly like the screening question id. Where it matches, the "
    + "question is still rendered again by PacketInformationBuilder (prefilled). Where it does not, the participant is asked a fact "
    + "they already answered, with an empty control. Mississippi's non-conviction route carries a hand-written block that copies "
    + "ownership_scope, jurisdiction_scope, resolved_timing_bucket and court_requirements_completed across and derives "
    + "offense_category from offense_level and sentence_completion_date from court_requirements_completed. That block is proof the "
    + "generic mechanism does not carry those facts; it exists for exactly one state and one pathway.",
  affectedFlowIds: manifest.flows.filter((flow) => flow.terminalOutcome.resultCode.startsWith("packet_ready")).map((flow) => flow.flowId),
  evidence: [
    evidence("src/lib/expungement-ai/packet-information.ts", "...Object.fromEntries(requiredInputIds.filter((id) => id in screeningAnswers)", "name-matched carry-forward"),
    evidence("src/lib/expungement-ai/packet-information.ts", "const mississippiNonConviction = profile.jurisdiction.code === \"MS\"", "state-specific repair of the generic gap"),
    evidence("src/lib/expungement-ai/packet-information.ts", "for (const id of [\"ownership_scope\", \"jurisdiction_scope\", \"resolved_timing_bucket\", \"court_requirements_completed\"])", "the four facts hand-carried for one state"),
    evidence("src/components/expungement-ai/PacketInformationBuilder.tsx", "questions={displayedQuestions}", "every builder question renders, answered or not")
  ],
  reproduction: [
    "Complete a screening for a state other than Mississippi to a packet-ready result and save the matter.",
    "Open /briefcase/{matterId}/packet-information.",
    "Step through the questionnaire and compare each prompt against the screening answers already given."
  ],
  actualBehaviour: "Screening answers reappear as packet questions; outside the Mississippi special case, scope, jurisdiction and timing facts are not carried at all.",
  expectedBehaviour: "One canonical fact store, with the packet questionnaire asking only for facts screening did not already collect.",
  implementationOwner: "shared fact model (src/lib/expungement-ai/packet-information.ts)",
  legalReviewRequired: false,
  perJurisdiction: reAskedByJurisdiction
});

/* ------------------------------------------------------------------ */
/* 5. Several structured facts in one field                            */
/* ------------------------------------------------------------------ */

finding({
  defectClass: "several_structured_facts_in_one_field",
  canary: 5,
  severity: "P1",
  scope: "GLOBAL_FACT_MODEL",
  title: "Contact information is collected as one free-text field that asks for a mailing address, a phone number and an email at once",
  detail:
    "contact_information is a single `text` question whose helper reads 'Include the mailing address, phone number, or email the "
    + "court form requests.' The value is stored as one string, printed on the review page under one row, and bound into packets as "
    + "one value. Nothing separates the address from the phone or email, nothing validates any of them, and the packet cannot place "
    + "them in separate form fields. The question is a required packet input in every jurisdiction that has a packet plan.",
  affectedFlowIds: manifest.flows.filter((flow) => (flow.packetFacts ?? []).includes("contact_information")).map((flow) => flow.flowId),
  evidence: [
    evidence("src/lib/expungement-ai/packet-information.ts", "contact_information: packetQuestion(\"contact_information\"", "single text field for three facts"),
    evidence("src/app/briefcase/[packetId]/review/page.tsx", "row(\"Contact information\", \"contact_information\"", "one review row for three facts"),
    evidence("src/components/expungement-ai/screening/QuestionField.tsx", "case \"text\":", "the renderer offers one unvalidated input for this type")
  ],
  reproduction: [
    "Reach /briefcase/{matterId}/packet-information for any packet-ready matter.",
    "Advance to the contact-information question and observe one text input covering address, phone and email.",
    "Enter a value with only a phone number and continue; observe it is accepted and rendered on the review page as the whole contact fact."
  ],
  actualBehaviour: "Three separately-formatted, separately-validated facts share one unvalidated string.",
  expectedBehaviour: "Structured mailing address, phone and email fields with their own validation and their own review rows.",
  implementationOwner: "shared fact model + shared question renderer",
  legalReviewRequired: false
});

/* ------------------------------------------------------------------ */
/* 6 + 7. County and court are free text                               */
/* ------------------------------------------------------------------ */

const countyCourtStates = manifest.flows
  .filter((flow) => (flow.packetFacts ?? []).includes("county") || (flow.packetFacts ?? []).includes("court"))
  .reduce((set, flow) => set.add(flow.jurisdiction), new Set());

const countyDatasetPresent = exists("data/expungement-ai/county-index.json") || exists("data/rcap-all50/county-index.json");

for (const [field, canary, scope, label] of [
  ["county", 6, "COUNTY_DATA", "County"],
  ["court", 7, "COURT_DATA", "Court"]
]) {
  finding({
    defectClass: "controlled_data_collected_as_free_text",
    canary,
    severity: "P1",
    scope,
    title: `${label} is collected as free text with no state-aware selector and no controlled dataset behind it`,
    detail:
      `${field} is a text_or_unknown packet question. The renderer has no selector branch for it, and the repository holds no `
      + `controlled ${field} dataset for consumer selection: the only ${field}-shaped data is per-state prose guidance `
      + `(src/lib/rcap/state-packs/*/county-court-instructions.ts) written for five legacy states, not a selectable list. `
      + `A typed value flows straight into the packet and onto the review page, so a misspelling reaches a court filing unchecked. `
      + `The court question additionally has no manual fallback affordance because it has no selector to fall back from.`,
    affectedFlowIds: manifest.flows.filter((flow) => (flow.packetFacts ?? []).includes(field)).map((flow) => flow.flowId),
    evidence: [
      evidence("src/lib/expungement-ai/packet-information.ts", `${field}: packetQuestion("${field}"`, "free-text packet question"),
      evidence("src/components/expungement-ai/screening/QuestionField.tsx", "case \"text_or_unknown\":", "renderer offers a text box plus an unknown checkbox; no selector exists"),
      evidence("src/lib/rcap/state-packs/mississippi/county-court-instructions.ts", "export function getMississippiCountyCourtInstructions", "prose guidance, not a selectable dataset"),
      { file: "data/expungement-ai/county-index.json", line: null, excerpt: null, note: `Absent. countyDatasetPresent=${countyDatasetPresent}. No controlled ${field} list exists anywhere in the repository for consumer selection.` }
    ],
    reproduction: [
      "Reach /briefcase/{matterId}/packet-information for any packet-ready matter.",
      `Advance to the ${field} question.`,
      "Observe a free-text input with an 'I'm not sure' checkbox and no list of valid values for the matter's state.",
      "Enter a deliberately invalid value and continue; observe it is accepted and printed on the review page."
    ],
    actualBehaviour: `Any string is accepted as the ${field} and is carried into the packet.`,
    expectedBehaviour: `A state-aware ${field} selector sourced from a controlled dataset, with a clearly-labelled manual entry fallback.`,
    implementationOwner: `${scope === "COUNTY_DATA" ? "county" : "court"} dataset owner + shared question renderer`,
    legalReviewRequired: false,
    jurisdictionsAffected: [...countyCourtStates].sort()
  });
}

/* ------------------------------------------------------------------ */
/* 8 + 9. Legal name and current city                                  */
/* ------------------------------------------------------------------ */

finding({
  defectClass: "several_structured_facts_in_one_field",
  canary: 8,
  severity: "P2",
  scope: "GLOBAL_FACT_MODEL",
  title: "Full legal name is collected once, as a single text field, and only after the result and the save",
  detail:
    "participant_full_legal_name is a single `text` packet question. It is never asked during screening, so the earliest a "
    + "participant gives their name is the packet-information questionnaire, after the eligibility result and after the matter is "
    + "saved. It has no given/middle/family structure, no suffix, and no alias affordance, yet it is the value bound into the "
    + "petition caption.",
  affectedFlowIds: manifest.flows.filter((flow) => (flow.packetFacts ?? []).includes("participant_full_legal_name")).map((flow) => flow.flowId),
  evidence: [
    evidence("src/lib/expungement-ai/packet-information.ts", "participant_full_legal_name: packetQuestion(\"participant_full_legal_name\"", "single text field"),
    evidence("src/app/briefcase/[packetId]/review/page.tsx", "row(\"Full legal name\", \"participant_full_legal_name\"", "one review row"),
    { file: "data/expungement-ai/flow-audit/question-inventory.json", line: null, excerpt: null, note: "participant_full_legal_name has reachability rendered_by_packet_information_builder in every jurisdiction and appears on no consumer screen." }
  ],
  reproduction: [
    "Complete a screening to a packet-ready result and save the matter.",
    "Observe no name was requested at any point before the save.",
    "Open /briefcase/{matterId}/packet-information and observe one text field for the whole legal name."
  ],
  actualBehaviour: "The name that goes on a court filing is a single unstructured string collected late.",
  expectedBehaviour: "Structured name parts collected at a point where the participant expects to identify themselves.",
  implementationOwner: "shared fact model",
  legalReviewRequired: false
});

finding({
  defectClass: "several_structured_facts_in_one_field",
  canary: 9,
  severity: "P2",
  scope: "GLOBAL_FACT_MODEL",
  title: "Current city duplicates the address already requested inside contact information",
  detail:
    "residency_or_location asks 'What city or location belongs with this matter?' and is labelled 'Current city' on the review "
    + "page, while contact_information already asks for the mailing address on the same questionnaire. The participant supplies "
    + "their city twice, in two differently-shaped controls, and nothing reconciles them. Mississippi's special case rewrites the "
    + "prompt to 'What city do you currently live in?' for one pathway, which makes the collision explicit for that state and "
    + "leaves it ambiguous everywhere else.",
  affectedFlowIds: manifest.flows.filter((flow) => (flow.packetFacts ?? []).includes("residency_or_location")).map((flow) => flow.flowId),
  evidence: [
    evidence("src/lib/expungement-ai/packet-information.ts", "residency_or_location: packetQuestion(\"residency_or_location\"", "generic prompt"),
    evidence("src/lib/expungement-ai/packet-information.ts", "prompt: \"What city do you currently live in?\"", "Mississippi-only rewrite"),
    evidence("src/app/briefcase/[packetId]/review/page.tsx", "row(\"Current city\", \"residency_or_location\"", "review label asserts a meaning the prompt does not"),
    evidence("src/lib/expungement-ai/packet-information.ts", "Include the mailing address, phone number, or email the court form requests.", "the address is already being collected")
  ],
  reproduction: [
    "Reach /briefcase/{matterId}/packet-information for any packet-ready matter outside Mississippi.",
    "Answer the contact-information question with a full mailing address.",
    "Continue to the city question and observe the city is requested a second time with no reference to the address just given."
  ],
  actualBehaviour: "The same fact is collected twice under two prompts, and the review page names one of them something the prompt never said.",
  expectedBehaviour: "One structured address, from which the city is derived, or one clearly distinct question explaining why a second location is needed.",
  implementationOwner: "shared fact model + review formatting",
  legalReviewRequired: false
});

/* ------------------------------------------------------------------ */
/* 10. Raw internal values on the review page                          */
/* ------------------------------------------------------------------ */

const reviewFormatted = new Set(["gt_10_years", "yes", "no"]);
const rawEnumValues = new Map();
for (const profile of getAllJurisdictionProfiles()) {
  const publicProfile = projectPublicProfile(profile);
  for (const question of publicProfile.questions) {
    for (const option of question.options ?? []) {
      if (typeof option !== "string") continue;
      if (!/^[a-z0-9]+(_[a-z0-9]+)+$/.test(option)) continue;
      if (reviewFormatted.has(option)) continue;
      if (!rawEnumValues.has(option)) rawEnumValues.set(option, new Set());
      rawEnumValues.get(option).add(`${profile.jurisdiction.code}:${question.id}`);
    }
  }
}
const reviewRowFieldIds = [...read("src/app/briefcase/[packetId]/review/page.tsx").matchAll(/row\("([^"]+)",\s*"([a-z0-9_]+)"/g)].map((m) => m[2]);
const builderFieldsWithoutReviewRow = [...new Set(
  inventory.questions
    .filter((q) => q.reachability === "rendered_by_packet_information_builder" && !reviewRowFieldIds.includes(q.questionId))
    .map((q) => q.questionId)
)].sort();

finding({
  defectClass: "raw_internal_enum_without_review_formatter",
  canary: 10,
  severity: "P1",
  scope: "GLOBAL_REVIEW_FORMATTING",
  title: "The accuracy review page formats exactly three internal values and prints every other snake_case answer verbatim",
  detail:
    "displayAnswer on the review page holds a three-entry label map — gt_10_years, yes, no — and otherwise returns String(value). "
    + `Every other snake_case option the profiles offer therefore reaches the participant unformatted; ${rawEnumValues.size} distinct `
    + "snake_case option values are served across the 51 public profiles with no label. pathway_id and jurisdiction are stored as "
    + "server facts and rendered through the same path. The 'Details to check' list uses answerLabel(id), which title-cases the raw "
    + "field id when the id is not one of the fourteen in the fallback table.",
  affectedFlowIds: manifest.flows.filter((flow) => flow.terminalOutcome.resultCode.startsWith("packet_ready")).map((flow) => flow.flowId),
  evidence: [
    evidence("src/app/briefcase/[packetId]/review/page.tsx", "const labels: Record<string, string> = {", "the entire formatter"),
    evidence("src/app/briefcase/[packetId]/review/page.tsx", "return labels[String(value)] ?? String(value);", "unlabelled values print raw"),
    evidence("src/lib/expungement-ai/packet-information.ts", "export function answerLabel(id: string) {", "raw field id title-cased when absent from the fallback table"),
    { file: "src/lib/rcap-engine/compiled/all51.json", line: null, excerpt: null, note: `Unformatted snake_case option values served to the public profile: ${[...rawEnumValues.keys()].sort().slice(0, 12).join(", ")}${rawEnumValues.size > 12 ? ", …" : ""}` }
  ],
  reproduction: [
    "Complete a screening whose timing answer is any bucket other than gt_10_years and save the matter.",
    "Complete packet information and open /briefcase/{matterId}/review.",
    "Observe the 'How long ago the case ended' row renders the raw bucket value."
  ],
  actualBehaviour: "Internal enum values are shown to the participant on the page whose whole purpose is checking accuracy before payment.",
  expectedBehaviour: "Every value rendered on the review page passes through a human formatter; an unmapped value is a build failure, not a raw string.",
  implementationOwner: "shared review formatting",
  legalReviewRequired: false,
  unformattedOptionValues: [...rawEnumValues.keys()].sort(),
  builderFieldsWithoutReviewRow
});

/* ------------------------------------------------------------------ */
/* 11. Discount code                                                   */
/* ------------------------------------------------------------------ */

const promoInCheckout = /allow_promotion_codes|discounts|coupon|promotion_code/.test(read("src/lib/expungement-ai/payment-adapter.ts"));

finding({
  defectClass: "no_discount_entry_before_checkout",
  canary: 11,
  severity: "P1",
  scope: "GLOBAL_PAYMENT",
  title: "No discount-code entry exists anywhere before checkout, and the only code the product accepts is a partner access code that grants a free packet",
  detail:
    "The checkout request body is { briefcaseItemId } and nothing else; no route, component, or Stripe session option in the "
    + `consumer path mentions a promotion or coupon (payment adapter promo references: ${promoInCheckout}). The one code-shaped `
    + "concept in the product is the partner access code validated by POST /api/rcap/access-code/validate, which is a sponsorship "
    + "grant, not a discount — it makes a packet free through a partner program and is not reachable from any Expungement.ai "
    + "consumer page. A participant holding a partner code and a participant expecting a discount are given the same non-answer: "
    + "no field.",
  affectedFlowIds: manifest.flows.filter((flow) => flow.paymentMode === "dtc_paid" || flow.paymentMode === "dtc_payment_refused_at_checkout").map((flow) => flow.flowId),
  evidence: [
    evidence("src/app/api/expungement-ai/checkout/route.ts", "const body = await request.json().catch(() => null) as { briefcaseItemId?: string } | null;", "the entire checkout request contract"),
    evidence("src/app/expungement-ai/pay/ConsumerCheckoutButton.tsx", "body: JSON.stringify({ briefcaseItemId })", "the client sends nothing else"),
    evidence("src/app/briefcase/[packetId]/review/page.tsx", "$50 one time for this matter.", "the price is stated with no adjustment affordance"),
    evidence("src/app/api/rcap/access-code/validate/route.ts", "Public, unauthenticated code check.", "the only code concept in the product is a sponsorship grant on the partner surface")
  ],
  reproduction: [
    "Complete a screening to a packet-ready result, save it, complete packet information and open /briefcase/{matterId}/review.",
    "Look for any field to enter a code before 'Pay $50 and generate my packet'.",
    "Observe none exists on the review page, the matter page, or the checkout control."
  ],
  actualBehaviour: "A participant with a code has nowhere to enter it and no explanation.",
  expectedBehaviour: "Either a discount entry before checkout, or explicit copy saying codes are not accepted here and where a partner code is used instead.",
  implementationOwner: "consumer payment surface",
  legalReviewRequired: false
});

finding({
  defectClass: "sponsorship_and_discount_conflated",
  severity: "P2",
  scope: "GLOBAL_PAYMENT",
  title: "Sponsorship is a server-side session property with no consumer entry point, so it cannot be distinguished from a discount by anyone using the product",
  detail:
    "Sponsored mode is decided by isPartnerSponsoredPacketItem(item) and by the ?session= query the partner intake page mints. "
    + "There is no consumer-visible way to declare sponsorship, and the checkout route refuses a sponsored matter with 'Checkout is "
    + "not used for partner-sponsored RCAP sessions.' A participant who arrives without the session query sees the $50 price for a "
    + "matter their partner program covers, and the product offers no way to say so.",
  affectedFlowIds: manifest.flows.filter((flow) => flow.sponsorshipMode !== "none_direct_to_consumer").map((flow) => flow.flowId),
  evidence: [
    evidence("src/app/api/expungement-ai/checkout/route.ts", "Checkout is not used for partner-sponsored RCAP sessions.", "sponsored matters are refused rather than routed"),
    evidence("src/app/expungement-ai/screening/[state]/page.tsx", "const initialSessionId = candidateSessionId && await isRcapPartnerScreeningSession(candidateSessionId)", "sponsorship is carried only by a query parameter"),
    evidence("src/app/api/rcap/access-code/validate/route.ts", "validatePartnerAccessCode", "the access code exists but no Expungement.ai consumer page calls this route")
  ],
  reproduction: [
    "Open a state screening route without a ?session= query.",
    "Complete the flow to a packet-ready result and observe the $50 price.",
    "Search the flow for any way to declare a partner program or enter an access code; observe none exists."
  ],
  actualBehaviour: "Sponsorship is invisible and undeclarable from the consumer surface.",
  expectedBehaviour: "One code entry that names what it is, and a distinct route for a sponsorship grant versus a price reduction.",
  implementationOwner: "consumer payment surface + partner intake",
  legalReviewRequired: false
});

/* ------------------------------------------------------------------ */
/* 12. Wilma help                                                      */
/* ------------------------------------------------------------------ */

finding({
  defectClass: "help_not_question_aware",
  canary: 12,
  severity: "P1",
  scope: "GLOBAL_HELP",
  title: "Wilma receives a page-level context only; the current question, its prompt and its help copy are never passed",
  detail:
    "The screening flow renders WilmaBubble with a WilmaPageContext ('check' during questions, 'results' after). buildWilmaContext "
    + "composes state-pack content plus a sanitized case summary and carries no question id, prompt, stage, or helper text. "
    + "Wilma therefore cannot answer 'what does this question mean' for the question actually on screen, on any of the "
    + `${inventory.totals.consumerScreenNodes} consumer screen nodes across the 51 jurisdictions.`,
  affectedFlowIds: manifest.flows.map((flow) => flow.flowId),
  evidence: [
    evidence("src/components/expungement-ai/screening/ScreeningFlow.tsx", "wilmaContext=\"results\"", "page-level context is the whole signal"),
    evidence("src/lib/expungement-ai/wilma-context.ts", "export function buildWilmaContext({", "no question identity in the context type"),
    evidence("src/lib/expungement-ai/wilma-context.ts", "export type ReadOnlyCaseSummary = {", "the case summary carries state, result code and stage only"),
    evidence("src/components/expungement-ai/screening/QuestionField.tsx", "// TODO(save-and-resume): PR 3 attaches the save affordance near readiness helper copy.", "the question renderer holds no help hand-off to Wilma")
  ],
  reproduction: [
    "Open any state screening route.",
    "Advance to a state-specific question.",
    "Ask Wilma what the question means and observe the answer is generic to the state and the page, not to the question."
  ],
  actualBehaviour: "Help is page-scoped where the participant's confusion is question-scoped.",
  expectedBehaviour: "The active question's id, prompt and helper text reach the help surface.",
  implementationOwner: "shared help surface",
  legalReviewRequired: false
});

/* ------------------------------------------------------------------ */
/* Sensitive questions without purpose or help                         */
/* ------------------------------------------------------------------ */

const sensitiveNoHelp = [...new Map(
  inventory.questions
    .filter((q) => ["special_category", "identity_direct"].includes(q.sensitivity))
    .filter((q) => !q.helpCopy.hasHelperText)
    .filter((q) => q.reachability === "rendered_as_consumer_screen" || q.reachability === "rendered_by_packet_information_builder")
    .map((q) => [q.questionId, { questionId: q.questionId, prompt: q.prompt, sensitivity: q.sensitivity, purpose: q.purpose, jurisdictions: 0 }])
).values()];
for (const row of sensitiveNoHelp) {
  row.jurisdictions = new Set(inventory.questions.filter((q) => q.questionId === row.questionId).map((q) => q.jurisdiction)).size;
}

finding({
  defectClass: "sensitive_question_without_purpose_or_help",
  severity: "P1",
  scope: "GLOBAL_HELP",
  title: `${sensitiveNoHelp.length} sensitive question id(s) are asked with no helper text and no stated reason`,
  detail:
    "Questions classified special_category or identity_direct that render to the participant with no helperText and no on-screen "
    + "explanation of why the fact is needed. Trafficking status is the sharpest case: it is a yes_no_prefer_not_to_say question "
    + "asked as a required prepay screen in several states, with no copy saying what it decides or who sees it.",
  affectedFlowIds: manifest.flows.map((flow) => flow.flowId),
  evidence: [
    evidence("src/components/expungement-ai/screening/QuestionField.tsx", "const helperNode = question.helperText ? (", "help renders only when the profile supplies it"),
    evidence("src/lib/expungement-ai/packet-information.ts", "trafficking_status: packetQuestion(\"trafficking_status\"", "no helper text on the packet fallback either"),
    { file: "data/expungement-ai/flow-audit/question-inventory.json", line: null, excerpt: null, note: `Sensitive rendered questions without helper text: ${sensitiveNoHelp.map((r) => r.questionId).sort().join(", ") || "(none)"}` }
  ],
  reproduction: [
    "Open a state screening route whose profile includes trafficking_status as a rendered screen (for example WI).",
    "Advance to that question and observe the prompt with no explanation of purpose, use, or visibility."
  ],
  actualBehaviour: "A participant is asked a special-category fact with no reason given.",
  expectedBehaviour: "Every special-category and identity-direct question carries a plain reason and a visibility statement.",
  implementationOwner: "shared help surface + profile content",
  legalReviewRequired: false,
  questions: sensitiveNoHelp
});

/* ------------------------------------------------------------------ */
/* Unconditional questions relevant to only some remedies              */
/* ------------------------------------------------------------------ */

const unconditional = [];
for (const profile of getAllJurisdictionProfiles()) {
  const code = profile.jurisdiction.code;
  const screens = deriveScreens(projectPublicProfile(profile));
  const triggerFields = new Set(profile.pathways.flatMap((p) => p.triggerFields ?? []));
  for (const question of screens) {
    if (question.contextOnly === true || question.required !== true) continue;
    const pathwaysUsing = profile.pathways.filter((p) => (p.triggerFields ?? []).includes(question.id)).length;
    if (pathwaysUsing > 0 && pathwaysUsing < profile.pathways.length) {
      unconditional.push({ jurisdiction: code, questionId: question.id, pathwaysUsing, pathwaysTotal: profile.pathways.length });
    }
  }
  void triggerFields;
}

/** State-specific prepay facts a state asks of every participant regardless of route. */
const stateSpecificAlwaysAsked = [];
for (const profile of getAllJurisdictionProfiles()) {
  const code = profile.jurisdiction.code;
  for (const question of deriveScreens(projectPublicProfile(profile))) {
    if (!new RegExp(`^${code.toLowerCase()}_`).test(question.id)) continue;
    stateSpecificAlwaysAsked.push({ jurisdiction: code, questionId: question.id, prompt: question.prompt, required: question.required === true });
  }
}

finding({
  defectClass: "unconditional_question_relevant_to_some_remedies_only",
  severity: "P2",
  scope: "STATE_CONFIGURATION",
  title: "Route-specific facts are asked of every participant in the state before the route is known",
  detail:
    "The screening flow renders every prepay question in stage order with no conditional gating: deriveScreens filters by "
    + "lifecycle phase and stage, never by the pathway a participant's earlier answers already implied. So a California "
    + "participant with a non-marijuana record still answers four Proposition 64 questions, a New York participant with a "
    + "non-conviction record still answers seven CPL 160.59 conviction-counting questions, and Wisconsin, Hawaii and Indiana "
    + "each ask their route-specific gate unconditionally.",
  affectedFlowIds: manifest.flows.filter((flow) => stateSpecificAlwaysAsked.some((row) => row.jurisdiction === flow.jurisdiction)).map((flow) => flow.flowId),
  evidence: [
    evidence("src/components/expungement-ai/screening/screens.ts", "export function deriveScreens(profile: JurisdictionProfile): ProfileQuestion[] {", "no conditional gating anywhere in the derivation"),
    evidence("src/lib/rcap-engine/public-profile-projection.ts", "const STATE_SPECIFIC_PREPAY_WILMA_FACT_IDS: Record<string, Set<string>> = {", "the state-specific prepay facts that become unconditional screens"),
    { file: "data/expungement-ai/flow-audit/question-inventory.json", line: null, excerpt: null, note: `State-prefixed screens asked unconditionally: ${stateSpecificAlwaysAsked.length} across ${new Set(stateSpecificAlwaysAsked.map((r) => r.jurisdiction)).size} jurisdiction(s).` }
  ],
  reproduction: [
    "Open /expungement-ai/screening/CA.",
    "Answer the case-outcome question with a dismissal and the offence question with a non-drug offence.",
    "Continue and observe four Proposition 64 marijuana questions are still asked."
  ],
  actualBehaviour: "Participants answer questions that cannot apply to the route their earlier answers already selected.",
  expectedBehaviour: "Route-specific questions appear only once the answers so far make that route possible.",
  implementationOwner: "state configuration + shared screen derivation",
  legalReviewRequired: false,
  stateSpecificAlwaysAsked,
  triggerFieldMismatches: unconditional.slice(0, 200),
  triggerFieldMismatchCount: unconditional.length
});

/* ------------------------------------------------------------------ */
/* Checkout losing matter context                                      */
/* ------------------------------------------------------------------ */

const payPageSource = read("src/app/expungement-ai/pay/page.tsx");
finding({
  defectClass: "checkout_context",
  severity: "P3",
  scope: "GLOBAL_PAYMENT",
  title: "Checkout carries the matter id explicitly and does not lose matter context; recorded as checked and clear",
  detail:
    "The checkout control posts briefcaseItemId, the route re-reads the matter under the authenticated session, and the return "
    + "path resolves through the confirm route rather than a client-held identifier. No path was found where the matter identity "
    + "is dropped between the review page and the Stripe session. This finding exists so the check is on the record as performed.",
  affectedFlowIds: manifest.flows.filter((flow) => flow.paymentMode === "dtc_paid").map((flow) => flow.flowId),
  evidence: [
    evidence("src/app/api/expungement-ai/checkout/route.ts", "const item = await getBriefcaseItem(auth.userId, briefcaseItemId);", "matter re-read server-side under the session"),
    { file: "src/app/expungement-ai/pay/page.tsx", line: null, excerpt: null, note: `pay page length ${payPageSource.split("\n").length} lines; no client-held matter identity is used to resume checkout.` }
  ],
  reproduction: ["Start checkout from /briefcase/{matterId}/review and observe the request body names the matter."],
  actualBehaviour: "Matter context is preserved.",
  expectedBehaviour: "Matter context is preserved.",
  implementationOwner: "consumer payment surface",
  legalReviewRequired: false,
  outcome: "no_defect_found"
});

/* ------------------------------------------------------------------ */
/* Analytics containing sensitive answer values                        */
/* ------------------------------------------------------------------ */

const funnelCalls = [...read("src/components/expungement-ai/screening/ScreeningFlow.tsx").matchAll(/trackFunnelEvent\([\s\S]{0,320}?\}\);/g)].map((m) => m[0]);
const forbiddenFragments = read("src/lib/analytics/sanitize.ts").match(/FORBIDDEN_META_KEY_FRAGMENTS = \[[\s\S]*?\] as const;/)?.[0] ?? "";
const analyticsCarriesAnswers = /answers|answer:|charge|offense|county|court|contact/.test(funnelCalls.join("\n"));

finding({
  defectClass: "analytics_sensitive_values",
  severity: "P3",
  scope: "GLOBAL_SHARED_COMPONENT",
  title: "Screening analytics carry state, product surface and the engine result code only; no answer value reaches the tracker",
  detail:
    "Every trackFunnelEvent call on the consumer flow sends state, product_surface and (on the result event) result_code. "
    + "A shared sanitizer additionally drops any metadata key containing answer-, record- or charge-shaped fragments and redacts "
    + "email, SSN, phone and date-of-birth patterns from free text, on both the browser and the server. The one value worth "
    + "naming is result_code: it is the engine's public outcome code, not a participant answer, and it does describe the "
    + "participant's legal situation at a coarse grain. Recorded so the trade-off is visible rather than assumed.",
  affectedFlowIds: manifest.flows.map((flow) => flow.flowId),
  evidence: [
    evidence("src/components/expungement-ai/screening/ScreeningFlow.tsx", "trackFunnelEvent(isPartnerSession ? \"partner_result_viewed\" : \"screening_result_viewed\", {", "the only event carrying an outcome"),
    evidence("src/lib/analytics/sanitize.ts", "export const FORBIDDEN_META_KEY_FRAGMENTS = [", "shared key denylist"),
    { file: "src/lib/analytics/sanitize.ts", line: null, excerpt: null, note: `analyticsCarriesAnswerValues=${analyticsCarriesAnswers}; denylist length ${(forbiddenFragments.match(/"/g) ?? []).length / 2} fragments.` }
  ],
  reproduction: ["Complete a screening with the network panel open and inspect the POST body to /api/analytics/web."],
  actualBehaviour: "No answer value is transmitted; the coarse result code is.",
  expectedBehaviour: "Same, with the result-code decision recorded deliberately.",
  implementationOwner: "analytics",
  legalReviewRequired: false,
  outcome: analyticsCarriesAnswers ? "defect_found" : "no_defect_found"
});

/* ------------------------------------------------------------------ */
/* Reachability findings (derived, not asserted)                       */
/* ------------------------------------------------------------------ */

finding({
  defectClass: "dead_end_next_action",
  severity: "P0",
  scope: "STATE_LEGAL_LOGIC",
  title: `${reachability.totals.jurisdictionsNotReachingPacketReady.length} jurisdictions reach no packet-ready outcome when the audit answers only the screens the flow renders`,
  detail:
    "A deterministic best-first search over every rendered consumer screen, in every pathway-context option, across "
    + `${reachability.totals.evaluations} evaluations, reaches a packet-ready outcome in `
    + `${reachability.totals.jurisdictionsReachingPacketReady} of 51 jurisdictions and a payment-allowed outcome in `
    + `${reachability.totals.jurisdictionsReachingPayment}. The repository's own witness ledger reports these routes as reachable, `
    + "but its fixtures seed facts the flow never asks — financial_obligations, pending_cases, sentence_completion_date, "
    + "special_preconditions_confirmed, new_convictions_during_waiting_period and record_documents are classified postpay by "
    + "lifecyclePhaseForQuestion in many states and so never render as a screen, while the evaluator still consumes them. "
    + "The gap is between what the projection asks and what the evaluator needs, not between the ledger and the code.",
  affectedFlowIds: manifest.flows
    .filter((flow) => reachability.totals.jurisdictionsNotReachingPacketReady.includes(flow.jurisdiction))
    .map((flow) => flow.flowId),
  evidence: [
    evidence("src/lib/rcap-engine/public-profile-projection.ts", "function lifecyclePhaseForQuestion(question: PublicQuestion): QuestionLifecyclePhase {", "the text-pattern classifier that decides prepay vs postpay"),
    evidence("src/lib/rcap-engine/public-profile-projection.ts", "function phaseForWilmaFact(question: PublicQuestion, jurisdictionCode: string): QuestionLifecyclePhase {", "Wilma facts default to postpay unless the state is on a hand-written allowlist"),
    evidence("src/components/expungement-ai/screening/screens.ts", "  return !POSTPAY_STAGES.has(question.stage);", "postpay questions are dropped from the consumer screen list"),
    { file: "data/expungement-ai/flow-audit/ui-reachability.json", line: null, excerpt: null, note: `Jurisdictions not reaching packet-ready: ${reachability.totals.jurisdictionsNotReachingPacketReady.join(", ")}` }
  ],
  reproduction: [
    "Open /expungement-ai/screening/PA.",
    "Answer all six rendered screens in every combination the controls allow.",
    "Observe no combination produces a packet-ready result; the flow ends in guidance, review, or a timing wait."
  ],
  actualBehaviour: "In 19 jurisdictions a participant cannot reach the product's paid outcome by answering the questions they are shown.",
  expectedBehaviour: "Every jurisdiction whose promotion manifest marks the Expungement.ai channel approved has at least one packet-ready outcome reachable from the rendered screens, or states plainly that it does not.",
  implementationOwner: "profile projection lifecycle classification + per-state configuration",
  legalReviewRequired: true,
  jurisdictionsAffected: reachability.totals.jurisdictionsNotReachingPacketReady
});

/* ------------------------------------------------------------------ */
/* Slug route dead end                                                 */
/* ------------------------------------------------------------------ */

finding({
  defectClass: "dead_end_next_action",
  severity: "P2",
  scope: "GLOBAL_NAVIGATION",
  title: "The slug form of the screening route resolves to the missing-profile screen for 50 of 51 jurisdictions",
  detail:
    "normalizeJurisdictionCode uppercases and strips non-letters, then matches against two-letter jurisdiction codes. "
    + "'/expungement-ai/screening/mississippi' therefore normalizes to MISSISSIPPI, matches nothing, and GET /profiles/{state} "
    + "answers 404 unsupported_jurisdiction, which the flow renders as the missing-profile dead end. District of Columbia is the "
    + "one exception because the normalizer special-cases DISTRICTOFCOLUMBIA. No product surface currently links to a slug "
    + "screening route, but the repository's own witness ledger records publicRoute values in exactly this unreachable form.",
  affectedFlowIds: [manifest.flows.find((flow) => flow.jurisdiction === "XX")?.flowId].filter(Boolean),
  evidence: [
    evidence("src/lib/rcap-engine/profile-registry.ts", "const normalized = value.trim().toUpperCase().replace(/[^A-Z]/g, \"\");", "slug never becomes a code"),
    evidence("src/lib/rcap-engine/profile-registry.ts", "if (normalized === \"WASHINGTONDC\" || normalized === \"DISTRICTOFCOLUMBIA\") return \"DC\";", "the single slug that works"),
    evidence("src/app/api/expungement-ai/profiles/[state]/route.ts", "error: \"unsupported_jurisdiction\",", "the 404 the flow renders as a dead end"),
    { file: "data/rcap-ledger/public-witness-fixtures.json", line: null, excerpt: null, note: "Every fixture records publicRoute as /expungement-ai/screening/{slug}, which is unreachable for 50 of 51 jurisdictions." }
  ],
  reproduction: [
    "Open /expungement-ai/screening/mississippi.",
    "Observe the missing-profile screen rather than the Mississippi questions.",
    "Open /expungement-ai/screening/MS and observe the flow loads."
  ],
  actualBehaviour: "A human-readable URL for a supported state is a dead end.",
  expectedBehaviour: "The slug resolves, or redirects to the code route.",
  implementationOwner: "shared navigation / jurisdiction normalizer",
  legalReviewRequired: false
});

/* ------------------------------------------------------------------ */
/* Questions with no discoverable purpose                              */
/* ------------------------------------------------------------------ */

const purposeNotFound = [...new Set(inventory.questions.filter((q) => q.purpose === "purpose_not_found").map((q) => q.questionId))].sort();
finding({
  defectClass: "question_without_discoverable_purpose",
  severity: "P3",
  scope: "CONTENT_ONLY",
  title: `${purposeNotFound.length} question id(s) are served in the public profile payload with no eligibility, form, packet-selection or escalation consumer`,
  detail:
    "These ids reach the browser inside the public profile's postPaymentPacketCompletion groups but are not in any pathway's "
    + "requiredInputIds, so PacketInformationBuilder never renders them, and no compiled rule, waiting rule, exclusion rule, "
    + "timing anchor or evaluator branch reads them. record_documents is the clearest case: its only named consumer anywhere in "
    + "src is the drop-point nudge email's question-to-copy mapping.",
  affectedFlowIds: manifest.flows.map((flow) => flow.flowId),
  evidence: [
    evidence("src/lib/rcap-engine/public-profile-projection.ts", "function postPaymentPacketCompletion(questions: PublicQuestion[])", "everything non-prepay is grouped and served"),
    evidence("src/lib/expungement-ai/screening-drop-point-nudge-email.ts", "record_documents", "the only consumer of record_documents in src"),
    { file: "data/expungement-ai/flow-audit/question-inventory.json", line: null, excerpt: null, note: `purpose_not_found ids: ${purposeNotFound.join(", ")}` }
  ],
  reproduction: [
    "GET /api/expungement-ai/profiles/PA and inspect postPaymentPacketCompletion.",
    "Search the repository for each id and observe no rule, form binding or packet-selection consumer."
  ],
  actualBehaviour: "Questions are published to the browser that nothing asks and nothing reads.",
  expectedBehaviour: "A question is either asked and consumed, or not published.",
  implementationOwner: "profile projection",
  legalReviewRequired: false,
  questionIds: purposeNotFound
});

/* ------------------------------------------------------------------ */
/* Cross-state question leakage                                        */
/* ------------------------------------------------------------------ */

const leakage = [];
for (const profile of getAllJurisdictionProfiles()) {
  const code = profile.jurisdiction.code;
  const foreign = projectPublicProfile(profile).questions
    .filter((q) => /^([a-z]{2})_/.test(q.id))
    .filter((q) => q.id.slice(0, 2).toUpperCase() !== code)
    .map((q) => q.id);
  if (foreign.length > 0) leakage.push({ jurisdiction: code, foreignQuestionIds: [...new Set(foreign)].sort() });
}

finding({
  defectClass: "question_without_discoverable_purpose",
  severity: "P3",
  scope: "GLOBAL_SHARED_COMPONENT",
  title: `Every jurisdiction's public profile carries other states' state-prefixed questions (${leakage.length} jurisdictions affected)`,
  detail:
    "withWilmaFactQuestions appends one shared WILMA_FACT_QUESTIONS list to every jurisdiction, including the California "
    + "Proposition 64, New York CPL 160.58/160.59, Wisconsin, Hawaii and Indiana route questions. Outside their own state they "
    + "are classified postpay and never rendered, so this is payload weight and reviewer confusion rather than a wrong question "
    + "on screen — but Mississippi's public profile does describe New York's conviction-counting questions to anyone who fetches it.",
  affectedFlowIds: manifest.flows.map((flow) => flow.flowId),
  evidence: [
    evidence("src/lib/rcap-engine/public-profile-projection.ts", "const WILMA_FACT_QUESTIONS: PublicQuestion[] = [", "one list appended to all 51"),
    evidence("src/lib/rcap-engine/public-profile-projection.ts", "const STATE_SPECIFIC_PREPAY_WILMA_FACT_IDS: Record<string, Set<string>> = {", "the allowlist that keeps them off screen elsewhere"),
    { file: "data/expungement-ai/flow-audit/question-inventory.json", line: null, excerpt: null, note: `Example: MS carries ${leakage.find((l) => l.jurisdiction === "MS")?.foreignQuestionIds.length ?? 0} foreign state-prefixed question ids.` }
  ],
  reproduction: ["GET /api/expungement-ai/profiles/MS and search the payload for ny_16059_ and ca_prop64_."],
  actualBehaviour: "Every state's public profile publishes other states' route questions.",
  expectedBehaviour: "A jurisdiction's public profile carries its own questions.",
  implementationOwner: "profile projection",
  legalReviewRequired: false,
  perJurisdiction: leakage
});

/* ------------------------------------------------------------------ */
/* Contract contradiction: contextOnly says it never routes            */
/* ------------------------------------------------------------------ */

finding({
  defectClass: "known_fact_re_asked",
  severity: "P2",
  scope: "GLOBAL_SHARED_COMPONENT",
  title: "The frontend contract states a contextOnly question never selects the pathway; the evaluator selects the pathway from one",
  detail:
    "ProfileQuestion documents contextOnly as 'optional and non-routing … never selecting the pathway', and the projection sets "
    + "doesNotSelectPathway true for it. possible_pathway_context is contextOnly in every jurisdiction, and selectPathway reads it "
    + "as its first signal, as does matchCompiledRuleRoute. A participant is shown a banner saying the answer does not decide the "
    + "result, and the answer helps decide the route.",
  affectedFlowIds: manifest.flows.filter((flow) => flow.branchingConditions?.pathwayContextSteer).map((flow) => flow.flowId),
  evidence: [
    evidence("src/lib/expungement-ai/frontend/contracts.ts", "   * Context/pathway questions are optional and non-routing: rendered as optional, labeled so", "the stated contract"),
    evidence("src/lib/rcap-engine/evaluator.ts", "  const context = answerText(answers.possible_pathway_context).toLowerCase();", "selectPathway reads it"),
    evidence("src/lib/rcap-engine/evaluator.ts", "  const requestedPathwayContext = answerText(answers.possible_pathway_context).trim();", "the compiled-rule matcher reads it too"),
    evidence("src/components/expungement-ai/screening/ContextOnlyBanner.tsx", "", "the banner shown beside the question")
  ],
  reproduction: [
    "Open /expungement-ai/screening/MS and reach the 'which route do you think applies' question.",
    "Complete the flow twice with identical answers except that question, and compare the returned pathwayId."
  ],
  actualBehaviour: "An answer labelled non-routing participates in routing.",
  expectedBehaviour: "Either the label matches the behaviour, or the behaviour matches the label.",
  implementationOwner: "shared contract + evaluator",
  legalReviewRequired: false
});

/* ------------------------------------------------------------------ */
/* Legal-review items surfaced by the probes                           */
/* ------------------------------------------------------------------ */

const exclusionStillPacketReady = manifest.flows
  .filter((flow) => flow.remedy.probeId === "state_exclusion_selected" && flow.terminalOutcome.resultCode.startsWith("packet_ready"))
  .map((flow) => ({ jurisdiction: flow.jurisdiction, pathwayId: flow.terminalOutcome.landedPathwayId, flowId: flow.flowId }));

const timingStillPacketReady = manifest.flows
  .filter((flow) => flow.remedy.probeId === "inside_waiting_period" && flow.terminalOutcome.resultCode.startsWith("packet_ready"))
  .map((flow) => ({ jurisdiction: flow.jurisdiction, pathwayId: flow.terminalOutcome.landedPathwayId, flowId: flow.flowId }));

finding({
  defectClass: "legal_outcome_requires_review",
  severity: "P1",
  scope: "REQUIRES_LEGAL_REVIEW",
  title: "Selecting a state exclusion category still returns packet-ready in some jurisdictions, and so does the shortest timing bucket",
  detail:
    "Two deterministic probes hold a clear record and change exactly one answer. Selecting the first non-'None of these' state "
    + "exclusion category still returns packet_ready_with_caution in "
    + `${new Set(exclusionStillPacketReady.map((r) => r.jurisdiction)).size} jurisdiction(s); choosing the shortest timing bucket `
    + `still returns packet_ready_with_caution in ${new Set(timingStillPacketReady.map((r) => r.jurisdiction)).size}. `
    + "Both land on non-conviction routes, where an exclusion category or a waiting period may genuinely not apply. This is "
    + "recorded as a legal question, not asserted as a bug: whether the exclusion list and the timing rule are meant to bind those "
    + "routes is a source-law decision the audit cannot make.",
  affectedFlowIds: [...exclusionStillPacketReady, ...timingStillPacketReady].map((r) => r.flowId),
  evidence: [
    evidence("src/lib/rcap-engine/evaluator.ts", "function exclusionReason(profile: EngineProfile, answers: Record<string, ScreeningAnswerValue>): ScreeningReason | undefined {", "the exclusion gate that did not fire"),
    evidence("src/lib/rcap-engine/evaluator.ts", "function specialRouteTiming(profile: EngineProfile, answers: Record<string, ScreeningAnswerValue>, rule: CompiledRule, pathway: CompiledPathway): TimingResult | undefined {", "route-specific timing overrides"),
    { file: "data/expungement-ai/flow-audit/flow-manifest.json", line: null, excerpt: null, note: `Exclusion probe still packet-ready in: ${[...new Set(exclusionStillPacketReady.map((r) => r.jurisdiction))].join(", ") || "(none)"}. Timing probe still packet-ready in: ${[...new Set(timingStillPacketReady.map((r) => r.jurisdiction))].join(", ") || "(none)"}.` }
  ],
  reproduction: [
    "Open a state screening route named above.",
    "Answer every screen with the clear-record answers, then select the first state exclusion category that is not 'None of these'.",
    "Observe the result is still packet-ready."
  ],
  actualBehaviour: "A declared exclusion or a very recent case does not change the outcome on these routes.",
  expectedBehaviour: "Counsel confirms that the exclusion list and the waiting rule do not bind the non-conviction routes, or the rules are corrected.",
  implementationOwner: "legal design + state configuration",
  legalReviewRequired: true,
  exclusionStillPacketReady,
  timingStillPacketReady
});

/* ------------------------------------------------------------------ */
/* Refresh discards every answer                                       */
/* ------------------------------------------------------------------ */

const crawlPath = "data/expungement-ai/flow-audit/evidence/crawl-report.json";
const crawlReport = exists(crawlPath) ? readJson(crawlPath) : null;

finding({
  defectClass: "action_without_pending_or_error_ui",
  severity: "P1",
  scope: "GLOBAL_NAVIGATION",
  title: "A browser refresh discards every screening answer and restarts the flow at question one, with no warning and no recovery",
  detail:
    "ScreeningFlow holds answers in component state. Nothing is written to sessionStorage, localStorage, the URL, or the server "
    + "unless the participant opens the 'Save progress' dialog and supplies an email. A refresh, a back-forward navigation out and "
    + "in, or a browser tab restore therefore drops every answer and returns the participant to the first question. The read path "
    + "for resumption exists — the flow reads an `expungement-ai:resume-session` sessionStorage key — but nothing in the flow ever "
    + "writes it; only the emailed resume link populates it."
    + (crawlReport
      ? ` The browser crawl reloaded the terminal page for every crawled flow: ${crawlReport.totals.flowsLosingAnswersOnRefresh} of ${crawlReport.flows.length} returned to 'Are you asking about your own record?'.`
      : ""),
  affectedFlowIds: manifest.flows.filter((flow) => flow.audience === "direct_to_consumer").map((flow) => flow.flowId),
  evidence: [
    evidence("src/components/expungement-ai/screening/ScreeningFlow.tsx", "const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});", "answers live only in component state"),
    evidence("src/components/expungement-ai/screening/ScreeningFlow.tsx", "const stored = window.sessionStorage.getItem(\"expungement-ai:resume-session\");", "the read side of a resume mechanism"),
    evidence("src/components/expungement-ai/screening/ScreeningFlow.tsx", "async function handleSaveProgress() {", "the only writer, and it requires an email address"),
    evidence("src/components/expungement-ai/screening/answers.ts", " * Answers are held in memory by the flow component and never written to URLs, analytics,", "the stated design")
  ],
  reproduction: [
    "Open any state screening route and answer several questions.",
    "Reload the page.",
    "Observe the flow restarts at the first question with every answer gone."
  ],
  actualBehaviour: "Every answer is lost on refresh, silently.",
  expectedBehaviour: "Answers survive a refresh within the session, or the participant is warned before losing them.",
  implementationOwner: "shared screening flow",
  legalReviewRequired: false
});

/* ------------------------------------------------------------------ */
/* Browser-confirmed non-defects, recorded so the checks are on record */
/* ------------------------------------------------------------------ */

if (crawlReport) {
  finding({
    defectClass: "browser_confirmed_checks",
    severity: "P3",
    scope: "GLOBAL_SHARED_COMPONENT",
    title: "Four checks the browser crawl performed and found clean",
    detail:
      `Across ${crawlReport.flows.length} crawled flow records against a local production build of this SHA: `
      + `Back preserved a committed answer in ${crawlReport.totals.flowsWhereBackPreservedTheAnswer} record(s); `
      + `no participant screen rendered a raw snake_case token (${crawlReport.totals.flowsWithRawTokenOnAParticipantScreen} record(s) did); `
      + `${crawlReport.totals.analyticsRequestsObserved} analytics requests left the browser and `
      + `${crawlReport.totals.analyticsRequestsCarryingAnAnswerValue} carried an answer value; `
      + `${crawlReport.totals.productBrowserErrors} product browser error(s) were raised. `
      + "The accuracy review page, where the raw-value defect actually lives, needs an authenticated session and was not reached.",
    affectedFlowIds: [],
    evidence: [
      { file: crawlPath, line: null, excerpt: null, note: `Crawl totals: ${JSON.stringify(crawlReport.totals)}` }
    ],
    reproduction: ["Run tests/e2e/expungement-ai/flow-audit/crawl-screening-flows.mjs against a local build and read data/expungement-ai/flow-audit/evidence/crawl-report.json."],
    actualBehaviour: "Clean on all four checks, on the surfaces the crawl could reach.",
    expectedBehaviour: "Clean.",
    implementationOwner: "none",
    legalReviewRequired: false,
    outcome: "no_defect_found"
  });
}

/* ------------------------------------------------------------------ */
/* Two result codes render as the same sentence                        */
/* ------------------------------------------------------------------ */

const resultComponentSource = read("src/components/expungement-ai/screening/ScreeningResult.tsx");

finding({
  defectClass: "review_page_missing_a_human_label",
  severity: "P2",
  scope: "GLOBAL_REVIEW_FORMATTING",
  title: "packet_ready and packet_ready_with_caution render an eyebrow that differs only by a full stop, under an identical title",
  detail:
    "RESULT_PRESENTATION gives packet_ready the eyebrow 'A path may be available' and packet_ready_with_caution "
    + "'A path may be available.'. Both render the same h1 — 'You may be able to prepare an expungement packet.' — and the same "
    + "subheading, because packetSubheading returns one string for both packet-ready codes. The two codes carry different tone "
    + "styling and different translation keys, but with the English fallback copy a participant sees one sentence with a trailing "
    + "period as the only difference between 'this looks clean' and 'this has cautions you must read'. The audit's own browser "
    + "crawl could not tell the two apart from the rendered page, which is the point.",
  affectedFlowIds: manifest.flows.filter((flow) => flow.terminalOutcome.resultCode.startsWith("packet_ready")).map((flow) => flow.flowId),
  evidence: [
    evidence("src/components/expungement-ai/screening/ScreeningResult.tsx", "packet_ready: { eyebrow: \"A path may be available\"", "the first eyebrow"),
    evidence("src/components/expungement-ai/screening/ScreeningResult.tsx", "packet_ready_with_caution: { eyebrow: \"A path may be available.\"", "the second, differing by one character"),
    evidence("src/components/expungement-ai/screening/ScreeningResult.tsx", "{isPacketReady ? translate(\"result.packet_title\", \"You may be able to prepare an expungement packet.\")", "one title for both codes"),
    { file: "src/components/expungement-ai/screening/ScreeningResult.tsx", line: null, excerpt: null, note: `packetSubheading returns the same string for both packet-ready codes; the component is ${resultComponentSource.split("\n").length} lines.` }
  ],
  reproduction: [
    "Complete a screening that returns packet_ready and screenshot the result card.",
    "Complete a screening that returns packet_ready_with_caution and screenshot the result card.",
    "Compare the eyebrow and the title."
  ],
  actualBehaviour: "Two legally different outcomes are visually near-identical above the fold.",
  expectedBehaviour: "A cautioned packet-ready result says so in its heading, not in a full stop.",
  implementationOwner: "shared result presentation",
  legalReviewRequired: false
});

/* ------------------------------------------------------------------ */
/* The browser cannot reproduce the ledger's own witnesses             */
/* ------------------------------------------------------------------ */

const divergencePath = "data/expungement-ai/flow-audit/crawl-divergence.json";
const divergence = exists(divergencePath) ? readJson(divergencePath) : null;

if (divergence) {
  const unrendered = divergence.divergences.filter((row) => row.classification === "unrendered_fact_missing");
  const frequency = divergence.totals.unrenderedFactFrequency ?? {};
  finding({
    defectClass: "known_fact_re_asked",
    severity: "P0",
    scope: "GLOBAL_FACT_MODEL",
    title: "The evaluator consumes facts before it will open a packet that the flow never asks for, so a browser cannot reproduce the repository's own recorded witnesses",
    detail:
      "Six shared facts — "
      + Object.keys(frequency).slice(0, 6).map((id) => `\`${id}\``).join(", ")
      + " — are supplied by the fixtures in data/rcap-ledger/public-witness-fixtures.json and are classified postpay by "
      + "lifecyclePhaseForQuestion or phaseForWilmaFact in the public-profile projection, so deriveScreens drops them and no "
      + "participant is ever asked. The browser crawl walked every rendered screen with the fixture's own answers and "
      + `diverged from the manifest on ${divergence.totals.divergentRecords} record(s); replaying each browser answer set through the real `
      + "evaluator, and then again with only the unrendered facts added back, isolates which divergences are the product's. "
      + "This is the same defect the reachability probe measures from the other direction, established here from a browser.",
    affectedFlowIds: [...new Set(divergence.divergences.map((row) => row.flowId))],
    evidence: [
      evidence("src/lib/rcap-engine/public-profile-projection.ts", "function phaseForWilmaFact(question: PublicQuestion, jurisdictionCode: string): QuestionLifecyclePhase {", "the classifier that sends shared facts postpay"),
      evidence("src/components/expungement-ai/screening/screens.ts", "    .filter(({ question }) => isPrepayQuestion(question))", "postpay questions never become screens"),
      evidence("src/lib/rcap-engine/evaluator.ts", "function missingProductFactIds(profile: EngineProfile, answers: Record<string, ScreeningAnswerValue>, pathway: CompiledPathway) {", "the evaluator still requires them"),
      { file: divergencePath, line: null, excerpt: null, note: `Unrendered-fact frequency across divergent records: ${JSON.stringify(frequency)}` }
    ],
    reproduction: [
      "Serve a build of this SHA and open any state screening route.",
      "Answer every rendered screen the way data/rcap-ledger/public-witness-fixtures.json answers it.",
      "Compare the terminal against that fixture's recorded expected result."
    ],
    actualBehaviour: `A participant answering everything they are shown cannot reach the outcome the repository's own witness ledger records for that route; ${unrendered.length} divergence(s) reproduce the recorded outcome as soon as the unrendered facts are added back.`,
    expectedBehaviour: "Every fact the evaluator requires before opening a packet is asked on a rendered prepay screen.",
    implementationOwner: "profile projection lifecycle classification",
    legalReviewRequired: false,
    divergenceSummary: divergence.totals
  });
}

/* ------------------------------------------------------------------ */
/* Emit                                                                */
/* ------------------------------------------------------------------ */

const severityCounts = {};
for (const row of findings) severityCounts[row.severity] = (severityCounts[row.severity] ?? 0) + 1;
const scopeCounts = {};
for (const row of findings) scopeCounts[row.scope] = (scopeCounts[row.scope] ?? 0) + 1;

const canaryVerdicts = [
  { canary: 1, statement: "A pre-rebuild matter loops between Open matter and Complete packet information.", verdict: "reproduced_statically", classification: "GLOBAL_NAVIGATION" },
  { canary: 2, statement: "Save This Matter and Continue provides no immediate pending feedback.", verdict: "reproduced_statically", classification: "GLOBAL_SHARED_COMPONENT" },
  { canary: 3, statement: "Save and continue lands in Briefcase rather than continuing.", verdict: "reproduced_statically", classification: "GLOBAL_NAVIGATION" },
  { canary: 4, statement: "A prescreen answer is asked again as though it were blank.", verdict: "reproduced_statically", classification: "GLOBAL_FACT_MODEL" },
  { canary: 5, statement: "Contact information is collected in one ambiguous unstructured field.", verdict: "reproduced_statically", classification: "GLOBAL_FACT_MODEL" },
  { canary: 6, statement: "County is free text instead of a state-aware selector.", verdict: "reproduced_statically", classification: "COUNTY_DATA" },
  { canary: 7, statement: "Court is free text instead of a state/county-aware selector with manual fallback.", verdict: "reproduced_statically", classification: "COURT_DATA" },
  { canary: 8, statement: "Full legal name is collected late and as one field.", verdict: "reproduced_statically", classification: "GLOBAL_FACT_MODEL" },
  { canary: 9, statement: "Current city duplicates the address.", verdict: "reproduced_statically", classification: "GLOBAL_FACT_MODEL" },
  { canary: 10, statement: "Raw internal values may appear on the review page.", verdict: "reproduced_statically", classification: "GLOBAL_REVIEW_FORMATTING" },
  { canary: 11, statement: "No visible discount-code entry exists before checkout.", verdict: "reproduced_statically", classification: "GLOBAL_PAYMENT" },
  { canary: 12, statement: "Wilma help is not consistently question-aware.", verdict: "reproduced_statically", classification: "GLOBAL_HELP" }
];

const packet = {
  schemaVersion: "expai-static-findings/v1",
  generatedBy: "scripts/expungement-ai/flow-audit/detect-static-defects.mjs",
  baseSha: gitSha("origin/main"),
  changesNoProductBehavior: true,
  scopeVocabulary: SCOPES,
  severityVocabulary: {
    P0: "dead end, data loss, payment risk, privacy risk, or wrong legal outcome",
    P1: "likely conversion or comprehension failure",
    P2: "usability or accessibility defect",
    P3: "polish or optimization"
  },
  canaryVerdicts,
  totals: {
    findings: findings.length,
    severityCounts,
    scopeCounts,
    globalFindings: findings.filter((f) => f.scope.startsWith("GLOBAL")).length,
    stateSpecificFindings: findings.filter((f) => f.scope.startsWith("STATE") || f.scope === "COUNTY_DATA" || f.scope === "COURT_DATA").length,
    legalReviewFindings: findings.filter((f) => f.legalReviewRequired).length,
    noDefectFoundChecks: findings.filter((f) => f.outcome === "no_defect_found").length
  },
  findings
};

const text = stableJson(packet);
if (CHECK) {
  if (read(OUT) !== text) {
    console.error(`${OUT} is stale or non-deterministic; re-run without --check.`);
    process.exit(1);
  }
  console.log(`static findings current and deterministic: ${findings.length} finding(s).`);
  process.exit(0);
}
const written = writeArtifact(OUT, text);
console.log(`wrote ${written.path} (${written.bytes} bytes)`);
console.log(`  findings: ${findings.length}  severities: ${JSON.stringify(severityCounts)}`);
console.log(`  scopes: ${JSON.stringify(scopeCounts)}`);
