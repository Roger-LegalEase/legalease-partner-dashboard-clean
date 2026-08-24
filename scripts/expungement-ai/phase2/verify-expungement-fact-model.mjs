/**
 * Build-time guard for the Expungement.ai fact model.
 *
 * Three corrections landed in Phase 2 that are only as good as the declarations
 * behind them. Each of those declarations is a file a future change can drift
 * away from silently, so each is checked here rather than trusted:
 *
 *   UX-GLOBAL-013  every waiting-rule binding resolves to a rule that exists,
 *                  is unambiguous or declares how it is disambiguated, and
 *                  authors no duration of its own.
 *   UX-GLOBAL-019  no question a prepay consumer reads is classified postpay,
 *                  and no fact is silently defaulted to post-payment.
 *   UX-GLOBAL-008  every machine-shaped option value the 51 profiles serve has
 *                  a declared human label.
 *   UX-GLOBAL-004  every declared canonical derivation names a real fact, and
 *                  the contact parts compose the input the packet plans require.
 *
 * Read-only. Exits non-zero with the specific declaration at fault.
 */
import { register } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
process.chdir(root);
process.env.RCAP_EVALUATOR_TODAY = process.env.RCAP_EVALUATOR_TODAY ?? "2026-07-01";
register("./scripts/lib/ts-esm-loader.mjs", new URL(`file://${root}/`));

const { getAllJurisdictionProfiles } = await import("@/lib/rcap-engine/profile-registry");
const { projectPublicProfile } = await import("@/lib/rcap-engine/public-profile-projection");
const { DECLARED_ANSWER_VALUE_LABELS, looksMachineShaped } = await import("@/lib/expungement-ai/packet-information");
const { DECLARED_DERIVATIONS, REVIEWED_CONTEXT_FACT_IDS, ROUTE_CRITICAL_CONTEXT_FACTS } =
  await import("@/lib/expungement-ai/canonical-facts");
const { CONTACT_PARTS, composeContactInformation, decomposeContactInformation, contactPartError } =
  await import("@/lib/expungement-ai/contact-fields");

const profiles = getAllJurisdictionProfiles();
const failures = [];
const fail = (message) => failures.push(message);

// ---------------------------------------------------------------- bindings
const bindingFile = JSON.parse(fs.readFileSync("src/lib/rcap-engine/waiting-rule-bindings.json", "utf8"));
const bindings = bindingFile.bindings ?? {};
const profileByCode = new Map(profiles.map((profile) => [profile.jurisdiction.code, profile]));

for (const [key, binding] of Object.entries(bindings)) {
  const [code, ...rest] = key.split(":");
  const pathwayId = rest.join(":");
  const profile = profileByCode.get(code);
  if (!profile) { fail(`binding ${key}: no compiled profile for ${code}`); continue; }
  if (binding.jurisdiction !== code || binding.pathwayId !== pathwayId) {
    fail(`binding ${key}: key and body disagree (${binding.jurisdiction}:${binding.pathwayId})`);
  }
  if (!(profile.pathways ?? []).some((pathway) => pathway.id === pathwayId)) {
    fail(`binding ${key}: ${code} has no compiled pathway with that id`);
  }
  const ruleIds = new Set((profile.waitingPeriodRules ?? []).map((rule) => rule.id));
  if (binding.resolution === "rules") {
    if (!Array.isArray(binding.ruleRefs) || binding.ruleRefs.length === 0) {
      fail(`binding ${key}: resolution "rules" with no ruleRefs`);
      continue;
    }
    for (const ref of binding.ruleRefs) {
      if (!ruleIds.has(ref)) fail(`binding ${key}: names ${ref}, which ${code} does not define`);
    }
    if (binding.ruleRefs.length > 1 && !binding.disambiguation) {
      fail(`binding ${key}: ${binding.ruleRefs.length} candidate rules and no declared disambiguation`);
    }
    // The invariant the file states about itself: it authors no duration.
    for (const entry of binding.provenance ?? []) {
      const rule = (profile.waitingPeriodRules ?? []).find((candidate) => candidate.id === entry.ruleId);
      if (!rule) { fail(`binding ${key}: provenance names ${entry.ruleId}, which ${code} does not define`); continue; }
      if (JSON.stringify(rule.duration ?? null) !== JSON.stringify(entry.duration ?? null)) {
        fail(`binding ${key}: provenance for ${entry.ruleId} states a duration the compiled rule does not carry`);
      }
    }
  } else if (binding.resolution === "inline") {
    const duration = binding.inlineRule?.duration;
    if (!duration || typeof duration.value !== "number" || typeof duration.unit !== "string") {
      fail(`binding ${key}: inline resolution with no structured duration`);
    }
    if (typeof binding.inlineRule?.quote !== "string" || binding.inlineRule.quote.length === 0) {
      fail(`binding ${key}: inline resolution must quote the source it materialises`);
    }
  } else if (binding.resolution === "no_waiting_period") {
    if (typeof binding.provenanceQuote !== "string" || binding.provenanceQuote.length === 0) {
      fail(`binding ${key}: no_waiting_period must quote the source that says so`);
    }
  } else if (binding.resolution !== "legal_review_required") {
    fail(`binding ${key}: unrecognised resolution ${JSON.stringify(binding.resolution)}`);
  }
}

// --------------------------------------------------------------- lifecycle
/**
 * The invariant, stated the way Phase 1 measured it: a participant who answers
 * every screen they are shown must reach the same decision the evaluator would
 * reach with the facts it can read but never asked for.
 *
 * Six shared facts were classified postpay, so deriveScreens dropped them and no
 * participant was ever asked; the evaluator still consumed them. Replaying the
 * rendered answer set, and then the same set with the unrendered public facts
 * added back, isolates exactly that. If the two decisions differ, the flow
 * cannot reproduce its own engine.
 *
 * This is asserted against the evaluator rather than against the consumer index.
 * A pathway's rule clauses reference many fields — charge, court, county — that
 * the evaluator does not require before it opens a packet; a check over
 * references would fail on those and prove nothing.
 */
const { deriveScreens } = await import("@/components/expungement-ai/screening/screens");
const { evaluateAuthoritativeScreeningResult } = await import("@/lib/expungement-ai/authoritative-screening-result");

function syntheticAnswer(question) {
  const pinned = {
    ownership_scope: "Yes",
    jurisdiction_scope: "State or local",
    state_exclusion_categories: ["None of these"],
    pending_cases: "No",
    new_convictions_during_waiting_period: "No",
    sentence_completion_date: "Yes",
    financial_obligations: "Yes",
    court_requirements_completed: "yes",
    special_preconditions_confirmed: "Yes",
    trafficking_status: "No",
    pardon_status: "No",
    record_documents: "Yes",
    resolved_timing_bucket: "gt_10_years"
  };
  if (pinned[question.id] !== undefined) return pinned[question.id];
  const options = Array.isArray(question.options) ? question.options : [];
  if (question.type === "multi_select") return [options.find((o) => /^none/i.test(o)) ?? options[0]].filter(Boolean);
  if (options.length > 0) return options.find((o) => /^(no\b|none|yes)/i.test(o)) ?? options[0];
  if (question.type === "date_or_unknown") return "2012-06-01";
  if (question.type === "number_or_range") return "30";
  return "Yes";
}

function settle(profile, seed) {
  let answers = { ...seed };
  for (let round = 0; round < 12; round += 1) {
    try {
      return evaluateAuthoritativeScreeningResult({
        jurisdiction: profile.jurisdiction.code,
        profileVersion: profile.profileVersion,
        matterId: "verify-expungement-fact-model",
        answers
      }).evaluation;
    } catch (error) {
      if (!error?.invalidQuestionIds?.length) return { error: String(error?.message ?? error) };
      const next = { ...answers };
      for (const id of error.invalidQuestionIds) delete next[id];
      answers = next;
    }
  }
  return { error: "did not settle" };
}

const decisionOf = (evaluation) => JSON.stringify({
  error: evaluation.error ?? null,
  resultCode: evaluation.resultCode ?? null,
  pathwayId: evaluation.pathwayId ?? null,
  paymentAllowed: evaluation.paymentAllowed ?? null
});

for (const profile of profiles) {
  const code = profile.jurisdiction.code;
  const publicProfile = projectPublicProfile(profile);
  const screens = deriveScreens(publicProfile);
  const rendered = new Set(screens.map((question) => question.id));
  const renderedOnly = Object.fromEntries(screens.map((question) => [question.id, syntheticAnswer(question)]));
  // `waiting_rule_id` is an operator override that names a rule by id, not a
  // fact anyone is ever asked. Filling it with a participant-shaped answer
  // would test the override's own validation, which is a different property.
  const OPERATOR_OVERRIDE_IDS = new Set(["waiting_rule_id"]);
  const unrenderedQuestions = publicProfile.questions
    .filter((question) => !rendered.has(question.id) && !OPERATOR_OVERRIDE_IDS.has(question.id));
  const withUnrendered = { ...renderedOnly };
  for (const question of unrenderedQuestions) withUnrendered[question.id] = syntheticAnswer(question);
  const unrenderedIds = unrenderedQuestions.map((question) => question.id);

  const asRendered = decisionOf(settle(profile, renderedOnly));
  const asEngineSees = decisionOf(settle(profile, withUnrendered));
  if (asRendered !== asEngineSees) {
    fail(`${code}: the rendered flow decides ${asRendered} but the evaluator decides ${asEngineSees} once the ${unrenderedIds.length} unrendered public fact(s) are added back`);
  }
}

/**
 * The shared-fact regression guard.
 *
 * Phase 1 named six shared facts the evaluator consumes before it will open a
 * packet and that the projection classified postpay, so deriveScreens dropped
 * them and no participant was ever asked. SHARED_FACT_LIFECYCLE is the
 * declaration that fixed that. This guard proves the declaration is doing the
 * work: delete an entry from it and the fact falls back to postpay_packet_field
 * in all 51 profiles, which fails here.
 *
 * A fact may be answered by its declared substitute instead of by itself. An
 * exact timing anchor is replaced by the timing bucket, and a court-completion
 * fact by the court-requirements confirmation — the participant is asked the
 * easier question that carries the same fact, which is a substitution, not an
 * omission.
 *
 * Two facts Phase 1 named — record_documents and conviction_date — are NOT
 * declared prepay here, because no prepay consumer reads them and the
 * decision-parity check above shows adding them changes nothing. They are
 * recorded in the Phase 2 backlog rather than promoted on the strength of the
 * fixtures alone.
 */
const DECLARED_SUBSTITUTES = {
  disposition_date: ["resolved_timing_bucket"],
  dismissal_date: ["resolved_timing_bucket"],
  completion_date: ["resolved_timing_bucket"],
  conviction_date: ["resolved_timing_bucket"],
  sentence_completion_date: ["court_requirements_completed", "resolved_timing_bucket"],
  financial_obligations: ["court_requirements_completed"]
};

/**
 * Named here rather than read back out of SHARED_FACT_LIFECYCLE: a guard that
 * derives its own expectations from the declaration it is guarding cannot fail
 * when the declaration is deleted.
 */
const MUST_BE_ASKED_BEFORE_PAYMENT = [
  "new_convictions_during_waiting_period",
  "special_preconditions_confirmed",
  "pending_cases",
  "disposition_date",
  "sentence_completion_date",
  "financial_obligations",
  "court_requirements_completed",
  "resolved_timing_bucket"
];

{
  const declaredPrepay = MUST_BE_ASKED_BEFORE_PAYMENT;
  for (const profile of profiles) {
    const code = profile.jurisdiction.code;
    const publicProfile = projectPublicProfile(profile);
    const rendered = new Set(deriveScreens(publicProfile).map((question) => question.id));
    const published = new Map(publicProfile.questions.map((question) => [question.id, question]));
    for (const id of declaredPrepay) {
      const question = published.get(id);
      if (!question) continue;
      if (rendered.has(id)) continue;
      if ((DECLARED_SUBSTITUTES[id] ?? []).some((substitute) => rendered.has(substitute))) continue;
      fail(`${code}: ${id} is declared a prepay shared fact but is on no rendered screen and has no rendered substitute (phase ${question.lifecyclePhase ?? "none"})`);
    }
  }
}

// ------------------------------------------------------------ answer labels
const unlabelled = new Map();
for (const profile of profiles) {
  for (const question of projectPublicProfile(profile).questions) {
    for (const option of question.options ?? []) {
      if (typeof option !== "string" || !looksMachineShaped(option)) continue;
      if (DECLARED_ANSWER_VALUE_LABELS[option]) continue;
      if (!unlabelled.has(option)) unlabelled.set(option, new Set());
      unlabelled.get(option).add(profile.jurisdiction.code);
    }
  }
}
for (const [option, states] of unlabelled) {
  fail(`answer value "${option}" is served by ${[...states].sort().join(", ")} with no declared human label`);
}

// --------------------------------------------------------- canonical facts
const allQuestionIds = new Set();
for (const profile of profiles) {
  for (const question of projectPublicProfile(profile).questions) allQuestionIds.add(question.id);
}
for (const derivation of DECLARED_DERIVATIONS) {
  for (const code of derivation.jurisdictions) {
    const profile = profileByCode.get(code);
    if (!profile) { fail(`derivation ${derivation.targetId}: unknown jurisdiction ${code}`); continue; }
    const ids = new Set(projectPublicProfile(profile).questions.map((question) => question.id));
    if (!ids.has(derivation.sourceId)) {
      fail(`derivation ${derivation.targetId} <- ${derivation.sourceId}: ${code} publishes no such question`);
    }
    for (const pathwayId of derivation.pathwayIds ?? []) {
      if (!(profile.pathways ?? []).some((pathway) => pathway.id === pathwayId)) {
        fail(`derivation ${derivation.targetId}: ${code} has no pathway ${pathwayId}`);
      }
    }
  }
}
for (const entry of ROUTE_CRITICAL_CONTEXT_FACTS) {
  for (const code of entry.jurisdictions) {
    const profile = profileByCode.get(code);
    if (!profile) { fail(`route-critical context facts: unknown jurisdiction ${code}`); continue; }
    const ids = new Set(projectPublicProfile(profile).questions.map((question) => question.id));
    for (const id of entry.factIds) {
      if (!ids.has(id)) fail(`route-critical context fact ${id}: ${code} publishes no such question`);
    }
  }
}
for (const id of REVIEWED_CONTEXT_FACT_IDS) {
  if (!allQuestionIds.has(id)) fail(`reviewed context fact ${id} is not a question any profile publishes`);
}

// ----------------------------------------------------------- contact fields
if (!CONTACT_PARTS.some((part) => part.required)) {
  fail("contact fields: nothing is required, so a packet could be built with no way to reach the participant");
}
const roundTrip = { participant_mailing_address: "10 Main St, Jackson, MS 39201", participant_phone: "(601) 555-0134", participant_email: "person@example.com" };
const composed = composeContactInformation(roundTrip);
const decomposed = decomposeContactInformation(composed ?? "");
for (const part of CONTACT_PARTS) {
  if (decomposed[part.id] !== roundTrip[part.id]) {
    fail(`contact fields: ${part.id} does not survive compose/decompose (${JSON.stringify(decomposed[part.id])})`);
  }
}
if (contactPartError("participant_phone", "") !== null) fail("contact fields: a blank optional phone must not error");
if (contactPartError("participant_phone", "12") === null) fail("contact fields: a two-digit phone must error");
if (contactPartError("participant_email", "not-an-email") === null) fail("contact fields: a malformed email must error");
if (contactPartError("participant_mailing_address", "") === null) fail("contact fields: a blank mailing address must error");

// The review page spells each contact row's label out as a literal so the
// audit's static check can read it. These two must not drift apart.
const reviewPageSource = fs.readFileSync("src/app/briefcase/[packetId]/review/page.tsx", "utf8");
const reviewRowLabels = new Map(
  [...reviewPageSource.matchAll(/row\("([^"]+)",\s*"([a-z0-9_]+)"/g)].map((match) => [match[2], match[1]])
);
for (const part of CONTACT_PARTS) {
  const literal = reviewRowLabels.get(part.id);
  if (literal === undefined) fail(`contact fields: the review page has no literal row for ${part.id}`);
  else if (literal !== part.reviewLabel) {
    fail(`contact fields: the review page labels ${part.id} "${literal}" and the field definition calls it "${part.reviewLabel}"`);
  }
}

if (failures.length > 0) {
  console.error("verify-expungement-fact-model FAILED");
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}
console.log(`verify-expungement-fact-model passed: ${Object.keys(bindings).length} waiting-rule bindings resolve, ${profiles.length} profiles classify every fact before its earliest consumer, every served option value has a declared label, and the canonical derivations and contact parts hold.`);
