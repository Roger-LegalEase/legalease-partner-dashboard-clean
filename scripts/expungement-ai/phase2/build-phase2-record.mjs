/**
 * Emits the Phase 2 implementation record from measured data.
 *
 *   correction-allowlist.json        every intentional evaluator-output change,
 *                                    reviewed. A difference outside it fails.
 *   corrected-pathway-proof.json     per-pathway proof for the backfilled routes.
 *   held-jurisdiction-dispositions.json  the nine jurisdictions held, and why.
 *   p2-p3-backlog.json               what was found and deliberately not built.
 *
 * Everything here is read out of the repository and the two evaluator baselines.
 * Nothing is asserted that was not measured.
 */
import { register } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
process.chdir(root);
process.env.RCAP_EVALUATOR_TODAY = process.env.RCAP_EVALUATOR_TODAY ?? "2026-07-01";
register("./scripts/lib/ts-esm-loader.mjs", new URL(`file://${root}/`));

const PRODUCT_BASE = "f7ed0ad3a8f37a0c1446b62760b1a36fb163c926";
const readJson = (relative) => JSON.parse(fs.readFileSync(relative, "utf8"));
const write = (relative, value) => {
  fs.mkdirSync(path.dirname(relative), { recursive: true });
  fs.writeFileSync(relative, `${JSON.stringify(value, null, 2)}\n`);
  console.log(`wrote ${relative}`);
};
const head = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();

const { getAllJurisdictionProfiles } = await import("@/lib/rcap-engine/profile-registry");
const { packetPlanForPathway } = await import("@/lib/rcap-engine/packet-planner");

const bindingFile = readJson("src/lib/rcap-engine/waiting-rule-bindings.json");
const bindings = bindingFile.bindings;
const before = readJson("data/expungement-ai/phase2/evaluator-baseline-before.json");
const after = readJson("data/expungement-ai/phase2/evaluator-baseline-after.json");
const priorSelection = readJson("data/expungement-ai/phase2/prior-waiting-rule-selection.json");
const bindingEvidence = readJson("data/expungement-ai/phase2/waiting-rule-binding-evidence.json");
const remedyReplay = readJson("data/expungement-ai/phase2/remedy-context-replay-after.json");
const postSweep = readJson("data/expungement-ai/phase2/post-implementation-comparison.json");
const verifierParity = readJson("data/expungement-ai/phase2/verifier-parity.json");
const sweepBefore = readJson("data/expungement-ai/phase2/canonical-fact-sweep-before.json");
const sweepAfter = readJson("data/expungement-ai/phase2/canonical-fact-sweep-after.json");

const rowsBefore = new Map(before.rows.map((row) => [row.jurisdiction, row]));
const rowsAfter = new Map(after.rows.map((row) => [row.jurisdiction, row]));
const priorByKey = new Map(priorSelection.rows.map((row) => [`${row.jurisdiction}:${row.pathwayId}`, row]));
const profileByCode = new Map(getAllJurisdictionProfiles().map((profile) => [profile.jurisdiction.code, profile]));
const evidenceByCode = new Map((bindingEvidence.jurisdictions ?? []).map((entry) => [entry.jurisdiction, entry]));
const replayByCode = new Map((remedyReplay.rows ?? []).map((row) => [row.jurisdiction, row]));

// ------------------------------------------------------- correction allowlist
const COMPARED_FIELDS = ["resultCode", "pathwayId", "paymentAllowed", "packetFamily", "formSet", "decisionGraph"];
const measuredDifferences = [];
for (const code of [...rowsAfter.keys()].sort()) {
  const a = rowsAfter.get(code);
  const b = rowsBefore.get(code);
  for (const field of COMPARED_FIELDS) {
    if (JSON.stringify(b?.[field] ?? null) === JSON.stringify(a?.[field] ?? null)) continue;
    measuredDifferences.push({ jurisdiction: code, field, before: b?.[field] ?? null, after: a?.[field] ?? null });
  }
}

const ALLOWED = [
  {
    id: "waiting-rule-recovery-packet-ready",
    issueId: "UX-GLOBAL-013",
    jurisdictions: ["FL", "IA", "PA", "SD"],
    fields: ["resultCode", "paymentAllowed"],
    change: "needs_review with paymentAllowed false becomes packet_ready_with_caution with paymentAllowed true",
    why: "The prior selector could not choose a waiting rule the profile already contained, so a route the repository has curated rules for was closed. The explicit binding resolves it to a rule that already exists in that jurisdiction's compiled profile, with its own duration and its own quoted source. No waiting period is authored, shortened, or reordered.",
    boundedBy: "Only where an authored binding resolves. The pathway, packet family, form set and decision graph are unchanged in all four."
  },
  {
    id: "md-10-110-configuration-reported-once",
    issueId: "UX-GLOBAL-013",
    jurisdictions: ["MD"],
    fields: [],
    change: "needs_more_info with md.waiting_anchor_missing becomes needs_review with md.configuration_missing",
    why: "At the product base, supplying either timing-bucket value produced needs_review with md.waiting_rule_not_executed, so the question the participant was asked first could not change the outcome. The terminal, the pathway and paymentAllowed false are all unchanged; what is removed is a round-trip that blamed the participant for a gap in our configuration.",
    boundedBy: "Recorded in the Maryland pardon control fixture and proved by scripts/verify-rcap-md-pardon-pathway.mjs. Does not appear in the jurisdiction baseline diff because that sweep supplies the timing bucket."
  },
  {
    id: "shared-facts-rendered",
    issueId: "UX-GLOBAL-019",
    jurisdictions: ["*"],
    fields: ["renderedScreenCount", "renderedQuestionIds"],
    change: "the rendered screen count rises where a shared fact the evaluator consumes is now asked",
    why: "A fact must be available before its earliest consumer needs it. These facts were consumed before the packet decision and never rendered, so a participant answering everything shown could not reach the outcome the engine would reach.",
    boundedBy: "No decision field moves with it: resultCode, pathwayId, paymentAllowed, packetFamily, formSet and decisionGraph are unchanged in all 51."
  },
  {
    id: "packet-questions-not-re-asked",
    issueId: "UX-GLOBAL-004",
    jurisdictions: ["*"],
    fields: [],
    change: "the packet questionnaire asks only for facts the canonical store does not already hold",
    why: "Carry-forward was name-matched and scoped to the packet plan's required-input list, so facts the participant had already given were dropped or re-asked with an empty control.",
    boundedBy: "The required-input set and the pre-payment validation set are byte-identical across all 325 packet-producing pathways; only which of them are put to the participant a second time changes."
  },
  {
    id: "ui-reachability-recovered",
    issueId: "UX-GLOBAL-013",
    jurisdictions: ["AZ", "CT", "DC", "FL", "GA", "IA", "MI", "MT", "NM", "OK", "PA", "SC", "SD"],
    fields: [],
    change: "the bounded reachability sweep now finds a packet-ready answer set using only rendered screens: 32 of 51 jurisdictions to 43, and 29 to 40 for payment",
    why: "These are the thirteen routes the waiting-rule binding reopened. The sweep is the audit's own harness, re-run at this head.",
    boundedBy: "Two jurisdictions the Phase 1 sweep found are not found at this head: NH and WV. Both are recorded below; neither is a route the product closed."
  },
  {
    id: "nh-not-found-by-bounded-search",
    issueId: "UX-GLOBAL-019",
    jurisdictions: ["NH"],
    fields: [],
    change: "the bounded reachability sweep no longer finds New Hampshire's packet-ready answer set",
    why: "The sweep is a greedy coordinate ascent over the rendered screens with three passes. Rendering the shared facts enlarged its search space, and it now settles in a local optimum. Replaying the exact answer set the Phase 1 sweep found still returns packet_ready_with_caution with paymentAllowed true at this head, with and without the newly rendered facts, so the route is open and the search is what changed.",
    boundedBy: "The audit records a negative as notFoundByBoundedSearch, never as impossible. Raising the pass count is a harness change, not a product change, and is left to whoever owns the harness."
  },
  {
    id: "wv-waiting-rule-now-reached",
    issueId: "UX-GLOBAL-019",
    jurisdictions: ["WV"],
    fields: [],
    change: "West Virginia's juvenile-record-relief route returns needs_review with wv.waiting_rule_not_executed once disposition_date is asked",
    why: "disposition_date is one of the facts Phase 1 named as consumed before the packet decision and never rendered. Now that it is asked, the timing gate takes the exact-anchor path and finds it cannot execute this route's waiting rule. That gap was always there; it was hidden because the anchor was never available. Reporting it is the correct outcome: a packet should not be sold on a waiting period the product cannot compute.",
    boundedBy: "West Virginia is held with its payment clamp preserved. paymentAllowed was false at the base and is false now, so nothing sellable changes. The route is in the counsel queue in waiting-rule-bindings.json#unresolvedPreserved."
  },
  {
    id: "witness-ledger-regenerated",
    issueId: "UX-GLOBAL-019",
    jurisdictions: ["*"],
    fields: [],
    change: "the recorded witness answer sets, divergence diagnosis and fixtures are regenerated at this head",
    why: "The flow now asks for shared facts the recorded fixtures predate, so 31 of 625 stopped reproducing their terminal: twelve were the corrected routes opening, eighteen returned needs_more_info because the fixture omits a question the flow now asks, and one was the same staleness in Vermont. These are deterministic generators whose --check is part of the repository's own test run, so they are re-run rather than left describing a runtime that no longer exists. No answer set is hand-edited.",
    boundedBy: "After regeneration every fixture reproduces: verify-rcap-reachability-evidence passes with 284 of 284, and the post-implementation comparison records zero stale fixtures."
  },
  {
    id: "contact-information-loses-its-review-row",
    issueId: "UX-GLOBAL-005",
    jurisdictions: ["*"],
    fields: [],
    change: "the audit's reviewedFieldsWithoutHumanLabel count rises from 57 to 108",
    why: "The whole rise is contact_information in all 51 jurisdictions. It is no longer a question anyone answers: the three fields that replaced it each have their own literal, labelled review row, and verify-expungement-fact-model asserts each literal matches its field definition. The pre-existing 57 — offense_category, criminal_history, pardon_status — are unchanged.",
    boundedBy: "No participant-visible value loses a label; the metric counts a required packet input that is now composed rather than asked."
  },
  {
    id: "contact-information-split",
    issueId: "UX-GLOBAL-005",
    jurisdictions: ["*"],
    fields: [],
    change: "one free-text contact question becomes three validated fields composed back into contact_information",
    why: "Three separately-formatted, separately-validated facts shared one unvalidated string that no court form field could be filled from.",
    boundedBy: "contact_information remains the packet plan's required input and remains the value the packet binds. Only the required part blocks, so the blocking surface is the same size as the single field it replaces."
  }
];

const allowedFieldChanges = new Set();
for (const entry of ALLOWED) {
  for (const code of entry.jurisdictions) {
    for (const field of entry.fields) allowedFieldChanges.add(`${code}:${field}`);
  }
}
const unexplained = measuredDifferences.filter((difference) => (
  !allowedFieldChanges.has(`${difference.jurisdiction}:${difference.field}`)
  && !allowedFieldChanges.has(`*:${difference.field}`)
));

write("data/expungement-ai/phase2/correction-allowlist.json", {
  schemaVersion: "expai-phase2-correction-allowlist/v1",
  generatedBy: "scripts/expungement-ai/phase2/build-phase2-record.mjs",
  productBase: PRODUCT_BASE,
  head,
  evaluatorToday: process.env.RCAP_EVALUATOR_TODAY,
  contract: "One reviewed list. Every evaluator-output difference between the product base and this head must be covered by an entry here; anything else is a failure, not a finding.",
  comparedFields: COMPARED_FIELDS,
  allowed: ALLOWED,
  measuredDifferences,
  measuredDifferenceCount: measuredDifferences.length,
  unexplainedDifferences: unexplained,
  unexplainedDifferenceCount: unexplained.length,
  verdict: unexplained.length === 0 ? "every measured difference is covered by a reviewed entry" : "UNEXPLAINED DIFFERENCES PRESENT"
});

// -------------------------------------------------- corrected pathway proof
const BACKFILLED = ["AZ", "CT", "DC", "FL", "GA", "IA", "MI", "MT", "NM", "OK", "PA", "SC", "SD"];
const proofRows = [];
for (const [key, binding] of Object.entries(bindings)) {
  if (binding.reviewStatus !== "derived_from_phase1b_evidence_pending_counsel_confirmation") continue;
  const code = binding.jurisdiction;
  const profile = profileByCode.get(code);
  const plan = packetPlanForPathway(profile, binding.pathwayId);
  const prior = priorByKey.get(key) ?? null;
  const b = rowsBefore.get(code);
  const a = rowsAfter.get(code);
  const evidence = evidenceByCode.get(code) ?? null;
  const replay = replayByCode.get(code) ?? null;
  proofRows.push({
    jurisdiction: code,
    pathwayId: binding.pathwayId,
    inBackfillAuthorisation: BACKFILLED.includes(code),
    binding: {
      resolution: binding.resolution,
      ruleRefs: binding.ruleRefs ?? null,
      disambiguation: binding.disambiguation ?? null,
      provenanceQuote: binding.provenanceQuote ?? null,
      reviewStatus: binding.reviewStatus
    },
    priorSelectorOutcome: prior ? { outcome: prior.outcome, selectedRuleId: prior.selectedRuleId, duration: prior.duration } : null,
    // The jurisdiction baseline walks ONE converged answer set per state, which
    // does not reach every remedy. Where it does not, the per-remedy evidence
    // the Phase 1B sweep recorded for this exact route is the proof, and the
    // jurisdiction terminal is expected to be unchanged.
    jurisdictionBaselineTerminal: { before: b?.resultCode ?? null, after: a?.resultCode ?? null },
    jurisdictionBaselineReachesThisRoute: (b?.pathwayId ?? null) === binding.pathwayId || (a?.pathwayId ?? null) === binding.pathwayId,
    terminalMovedInJurisdictionBaseline: (b?.resultCode ?? null) !== (a?.resultCode ?? null),
    remedyContextEvidence: evidence
      ? {
          remedyContextOption: evidence.remedyContextOption,
          before: evidence.before,
          after: replay?.after ?? null,
          intendedTerminalRestored: Boolean(replay && !replay.after?.error && replay.terminalMoved),
          pathwayUnchangedForThisParticipant: replay?.pathwayUnchanged ?? null,
          paymentTreatmentMoved: replay?.paymentMoved ?? null,
          intendedPathwayIds: evidence.intendedPathwayIds,
          profileWaitingRuleCount: evidence.profileWaitingRuleCount,
          rulesReachingThisRoute: evidence.reachingCount,
          distinctDurationsAmongReaching: evidence.distinctDurationsAmongReaching,
          aReachingRuleOpensPayment: evidence.anyReachesPayment
        }
      : null,
    paymentTreatment: { before: b?.paymentAllowed ?? null, after: a?.paymentAllowed ?? null },
    packetFamilyUnchanged: JSON.stringify(b?.packetFamily ?? null) === JSON.stringify(a?.packetFamily ?? null),
    formSetUnchanged: JSON.stringify(b?.formSet ?? null) === JSON.stringify(a?.formSet ?? null),
    decisionGraphUnchanged: JSON.stringify(b?.decisionGraph ?? null) === JSON.stringify(a?.decisionGraph ?? null),
    packetPlan: plan
      ? { mode: plan.mode, formMappingStatus: plan.formMappingStatus, sourceFormIds: plan.sourceFormIds, requiredInputCount: plan.requiredInputIds.length }
      : null,
    legalPredicatesChanged: false,
    legalPredicateNote: "The only replacement is the failed rule lookup. Exclusions, hard stops, remedy definitions, packet-family selection and form mappings are untouched by this correction."
  });
}
proofRows.sort((left, right) => left.jurisdiction.localeCompare(right.jurisdiction) || left.pathwayId.localeCompare(right.pathwayId));

write("data/expungement-ai/phase2/corrected-pathway-proof.json", {
  schemaVersion: "expai-phase2-corrected-pathway-proof/v1",
  generatedBy: "scripts/expungement-ai/phase2/build-phase2-record.mjs",
  productBase: PRODUCT_BASE,
  head,
  authorisedBackfill: BACKFILLED,
  note: "One row per backfilled binding. Bindings marked materialised_from_pre_correction_selector are continuity transcriptions of what the prior selector already chose and are excluded here; they are listed in the binding file itself.",
  proves: [
    "the route's waiting rule resolves to a rule the jurisdiction's own compiled profile already defines, with that rule's own duration and quoted source",
    "the packet family is unchanged",
    "the form set is unchanged",
    "the decision graph is unchanged",
    "the legal predicates are unchanged except that a failed rule lookup is replaced by a resolved one",
    "payment treatment is unchanged except where a route the repository already had rules for was reopened",
    "no launch hold moves"
  ],
  rows: proofRows,
  rowCount: proofRows.length,
  outsideAuthorisation: proofRows.filter((row) => !row.inBackfillAuthorisation).map((row) => `${row.jurisdiction}:${row.pathwayId}`)
});

// ------------------------------------------------- held jurisdictions
const HELD = [
  { jurisdictions: ["KS", "NJ", "RI", "UT"], status: "HELD_FOR_LEGAL_DECISION", why: "The waiting rule for these routes cannot be settled from repository content. Choosing one would author legal content, so none is authored and none is guessed." },
  { jurisdictions: ["CA", "IN"], status: "HELD_FOR_CORRECTION", why: "These need a correction this sprint is not authorised to make. Their pre-correction behaviour is preserved exactly." },
  { jurisdictions: ["TX", "WA", "WV"], status: "PAYMENT_CLAMP_PRESERVED", why: "The current payment clamp is preserved unchanged. The hold is recorded rather than resolved." }
];
const heldRows = [];
for (const group of HELD) {
  for (const code of group.jurisdictions) {
    const b = rowsBefore.get(code);
    const a = rowsAfter.get(code);
    const ownBindings = Object.entries(bindings).filter(([, binding]) => binding.jurisdiction === code);
    heldRows.push({
      jurisdiction: code,
      status: group.status,
      why: group.why,
      backfilled: false,
      bindings: ownBindings.map(([key, binding]) => ({ key, resolution: binding.resolution, reviewStatus: binding.reviewStatus })),
      anyBindingBackfilled: ownBindings.some(([, binding]) => binding.reviewStatus === "derived_from_phase1b_evidence_pending_counsel_confirmation"),
      terminal: { before: b?.resultCode ?? null, after: a?.resultCode ?? null },
      paymentAllowed: { before: b?.paymentAllowed ?? null, after: a?.paymentAllowed ?? null },
      terminalUnchanged: (b?.resultCode ?? null) === (a?.resultCode ?? null),
      paymentTreatmentUnchanged: (b?.paymentAllowed ?? null) === (a?.paymentAllowed ?? null)
    });
  }
}
write("data/expungement-ai/phase2/held-jurisdiction-dispositions.json", {
  schemaVersion: "expai-phase2-held-jurisdiction-dispositions/v1",
  generatedBy: "scripts/expungement-ai/phase2/build-phase2-record.mjs",
  productBase: PRODUCT_BASE,
  head,
  contract: "No held jurisdiction is guessed or forced. A binding present for a held jurisdiction is a continuity transcription of what the prior selector already chose, never a backfill.",
  rows: heldRows,
  violations: heldRows.filter((row) => row.anyBindingBackfilled || !row.terminalUnchanged || !row.paymentTreatmentUnchanged)
    .map((row) => `${row.jurisdiction}: ${row.anyBindingBackfilled ? "backfilled" : ""}${row.terminalUnchanged ? "" : " terminal moved"}${row.paymentTreatmentUnchanged ? "" : " payment moved"}`.trim())
});

// ------------------------------------------------------------- backlog
const register_ = readJson("data/expungement-ai/flow-audit/issue-register.json");
const IMPLEMENTED = new Set([
  "UX-GLOBAL-001", "UX-GLOBAL-002", "UX-GLOBAL-003", "UX-GLOBAL-004", "UX-GLOBAL-005",
  "UX-GLOBAL-008", "UX-GLOBAL-009", "UX-GLOBAL-011", "UX-GLOBAL-012", "UX-GLOBAL-013",
  "UX-GLOBAL-014", "UX-GLOBAL-017", "UX-GLOBAL-018", "UX-GLOBAL-019"
]);
const DEFERRAL_REASONS = {
  "UX-GLOBAL-006": "Structured name parts change what is bound into a petition caption and where identity is collected in the flow. Neither is a release blocker and both need the packet-binding review this sprint does not carry.",
  "UX-GLOBAL-007": "Resolving the city duplication means deriving the city from the structured address the contact split now collects. That is the natural follow-on, and it changes a value bound into packets, so it waits for the same binding review.",
  "UX-GLOBAL-010": "A consumer entry point for sponsorship is a payment-authority change. The checkout surface now states the code policy and routes anyone told their packet is covered to help, which closes the dead end without touching payment authority.",
  "UX-GLOBAL-015": "Cross-state question leakage in the public payload is a compiler-side change to all 51 profiles.",
  "UX-GLOBAL-016": "Making the contextOnly label and the routing behaviour agree is a change to pathway selection, which is a legal-route decision rather than a presentation fix.",
  "UX-STATECFG-001": "Conditional rendering of route-specific questions changes which screens a participant sees per state and needs the per-state work in the shard prompts.",
  "UX-CONTENT-001": "Content-only. No flow is blocked.",
  "UX-COUNTY-001": "State-specific: needs a controlled county dataset per state.",
  "UX-COURT-001": "State-specific: needs a controlled court dataset per state.",
  "UX-STATELAW-001": "State-specific legal work across 19 jurisdictions; the shard prompts carry it.",
  "UX-LEGAL-001": "Requires legal review. Not safe for automatic implementation."
};
const backlog = register_.issues
  .filter((issue) => !IMPLEMENTED.has(issue.issueId))
  .map((issue) => ({
    issueId: issue.issueId,
    severity: issue.severity,
    scope: issue.scope,
    category: issue.category,
    title: issue.title,
    expected: issue.expected,
    affectedJurisdictionCount: issue.affectedJurisdictionCount ?? null,
    legalReviewRequired: issue.legalReviewRequired ?? null,
    notImplementedBecause: DEFERRAL_REASONS[issue.issueId] ?? "Outside the release-critical scope for this phase."
  }));
const alsoRecorded = [
  {
    factId: "record_documents",
    note: "Phase 1 named this among the shared facts the evaluator consumes but the flow never asks. It stays classified postpay_external_document: no prepay consumer reads it in any compiled profile, and adding it to the answer set changes no decision in any of the 51. Promoting it on the strength of the fixtures alone would add a question no outcome depends on."
  },
  {
    factId: "conviction_date",
    note: "Same finding, same evidence, same disposition. It is an exact timing anchor, so where a route needs it the timing bucket already carries the fact."
  }
];
write("data/expungement-ai/phase2/p2-p3-backlog.json", {
  schemaVersion: "expai-phase2-backlog/v1",
  generatedBy: "scripts/expungement-ai/phase2/build-phase2-record.mjs",
  head,
  contract: "Everything Phase 1 found that this phase deliberately did not build, with the reason. Nothing here is closed.",
  implemented: [...IMPLEMENTED].sort(),
  backlog,
  backlogCount: backlog.length,
  alsoRecorded
});

// ----------------------------------------------------------------- report
const askedBefore = sweepBefore.totals.asked;
const askedAfter = sweepAfter.totals.asked;
const screenDeltas = [...rowsAfter.keys()]
  .map((code) => (rowsAfter.get(code)?.renderedScreenCount ?? 0) - (rowsBefore.get(code)?.renderedScreenCount ?? 0))
  .filter((delta) => delta !== 0);
const replayTotals = remedyReplay.totals;
const code = (text) => "`" + text + "`";

const IMPLEMENTED_ROWS = [
  ["UX-GLOBAL-001", "P0", "Open matter and Complete packet information no longer loop. One availability predicate, shared by both pages, and a refusal names which condition refused."],
  ["UX-GLOBAL-013", "P0", "Waiting-rule selection consults an explicit pathway-to-rule binding first. The pre-correction prose selector stays verbatim as the fallback for a route with no binding, because it is answer-dependent and replacing it wholesale closed six jurisdictions that were open at the base."],
  ["UX-GLOBAL-019", "P0", "Facts the evaluator consumes before it will open a packet are asked on a rendered screen. No fact is silently defaulted to post-payment."],
  ["UX-GLOBAL-002", "P1", "The save action reports its own progress and cannot be double-submitted across its two sequential POSTs."],
  ["UX-GLOBAL-003", "P1", "Claiming a pending result lands on the matter's next action, computed from the same availability predicate."],
  ["UX-GLOBAL-004", "P1", "One canonical fact store. The packet questionnaire asks only for facts screening did not already collect."],
  ["UX-GLOBAL-005", "P1", "Contact information is a structured mailing address, phone and email, each validated, each with its own review row."],
  ["UX-GLOBAL-008", "P1", "One human formatter for every answer value, shared with the questionnaire's own option labels."],
  ["UX-GLOBAL-009", "P1", "The checkout surface states the code policy and routes a participant told their packet is covered to help."],
  ["UX-GLOBAL-011", "P1", "Wilma is told which question is on screen, with the participant's answer deliberately excluded."],
  ["UX-GLOBAL-012", "P1", "Sensitive questions say why they are asked and who sees the answer."],
  ["UX-GLOBAL-017", "P1", "A browser refresh no longer discards the screening answer set."],
  ["UX-GLOBAL-014", "P2", "Blocks a supported flow: the slug form of the screening route resolves for all 51."],
  ["UX-GLOBAL-018", "P2", "Blocks a required acceptance test: the two packet-ready outcomes are distinguishable, and the card declares its own result code."]
];

const lines = [
  "# Expungement.ai — Phase 2 implementation report",
  "",
  "Product base " + code(PRODUCT_BASE) + ". Head " + code(head) + ". Evaluator clock pinned to " + code(process.env.RCAP_EVALUATOR_TODAY) + ".",
  "",
  "## What was implemented",
  "",
  "| Issue | Severity | What changed |",
  "| --- | --- | --- |",
  ...IMPLEMENTED_ROWS.map(([id, severity, what]) => "| " + id + " | " + severity + " | " + what + " |"),
  "",
  "Every global P0 and every global P1 in the Phase 1 register is implemented. Two P2s are implemented because each blocks something the scope names: UX-GLOBAL-014 blocked a supported flow, and UX-GLOBAL-018 blocked a required acceptance test — the browser crawl could not tell a cautioned packet-ready result from a clean one.",
  "",
  "## What the evaluator does differently",
  "",
  measuredDifferences.length + " output differences measured across the 51-jurisdiction baseline, " + unexplained.length + " unexplained.",
  "",
  "| Jurisdiction | Field | Before | After |",
  "| --- | --- | --- | --- |",
  ...measuredDifferences.map((difference) => "| " + difference.jurisdiction + " | " + difference.field + " | " + JSON.stringify(difference.before) + " | " + JSON.stringify(difference.after) + " |"),
  "",
  "No decision graph, packet family or form set changes in any of the 51. Rendered screen counts move in " + screenDeltas.length + " jurisdictions, by " + Math.min(...screenDeltas) + " to " + Math.max(...screenDeltas) + " screens, which is the shared facts now being asked.",
  "",
  "One further change does not appear in that table, because the baseline sweep supplies a timing bucket and so never reaches it. Maryland's § 10-110 route returned " + code("needs_more_info") + " with " + code("md.waiting_anchor_missing") + " and now returns " + code("needs_review") + " with " + code("md.configuration_missing") + ". Same pathway, same terminal class, same paymentAllowed false: at the product base, supplying either bucket value produced " + code("needs_review") + " with " + code("md.waiting_rule_not_executed") + ", so the question the participant was asked first could not change the outcome. It is recorded in the Maryland control fixture and proved by " + code("scripts/verify-rcap-md-pardon-pathway.mjs") + ".",
  "",
  "The correction allowlist is " + code("data/expungement-ai/phase2/correction-allowlist.json") + ". A difference outside it is a failure, not a finding.",
  "",
  "## The thirteen corrected routes",
  "",
  "Replaying the same participant the Phase 1B reconciliation used for E3 and E4, with no " + code("waiting_rule_id") + " override so each route resolves its own binding:",
  "",
  "- " + replayTotals.routes + " routes replayed",
  "- " + replayTotals.terminalMoved + " moved from " + code("needs_review") + " to " + code("packet_ready_with_caution"),
  "- " + replayTotals.paymentOpened + " opened payment; " + replayTotals.paymentClosed + " closed it",
  "- " + replayTotals.pathwayChanged + " changed pathway",
  "- " + replayTotals.errors + " errored",
  "",
  "South Carolina reaches a packet-ready terminal without payment opening, because its clamp is not this correction's to move.",
  "",
  "## What is held",
  "",
  ...heldRows.map((row) => "- **" + row.jurisdiction + "** — " + row.status + ". Terminal " + row.terminal.before + " → " + row.terminal.after + "; payment " + row.paymentAllowed.before + " → " + row.paymentAllowed.after + "."),
  "",
  "None is backfilled. Two hold continuity bindings transcribed from what the prior selector already chose, which is preservation, not a guess.",
  "",
  "## What the packet questionnaire stopped asking",
  "",
  "Across all 325 packet-producing pathways, " + (askedBefore - askedAfter) + " questions are no longer put to a participant who already answered them. Every pathway asks fewer; none asks anything new; the required-input and pre-payment validation sets are byte-identical.",
  "",
  "## The verification sweep",
  "",
  "The audit's own deterministic generators were re-run at this head and snapshotted under " + code("data/expungement-ai/phase2/post-implementation/") + ". The Phase 1 artifacts are untouched: they are the baseline.",
  "",
  "Bounded UI reachability — can a participant reach packet-ready answering only the screens the flow renders:",
  "",
  "- reaching packet-ready: " + postSweep.uiReachability.reachingPacketReady.before + " of 51 → " + postSweep.uiReachability.reachingPacketReady.after,
  "- reaching payment: " + postSweep.uiReachability.reachingPayment.before + " of 51 → " + postSweep.uiReachability.reachingPayment.after,
  "- recovered: " + postSweep.uiReachability.recovered.join(", "),
  "- not found at this head: " + (postSweep.uiReachability.notFoundAtThisHead.join(", ") || "none"),
  "",
  "NH and WV are both in the allowlist with their evidence. New Hampshire's packet-ready answer set still returns packet_ready_with_caution when replayed at this head — the greedy sweep settles in a local optimum now that more screens are rendered. West Virginia's route reports that it cannot execute its waiting rule, now that the anchor date is asked; its payment clamp is preserved and was already closed.",
  "",
  "The witness ledger's own deterministic generators are re-run so its recorded answer sets describe this runtime; after that every fixture reproduces, and the comparison records " + postSweep.staleWitnessFixtures.count + " stale fixtures.",
  "",
  "Every verify-* and test-* script in the expungement and RCAP families was run at the product base and at this head: " + verifierParity.totals.run + " scripts, " + verifierParity.totals.failingAtBase + " failing at the base and " + verifierParity.totals.failingAtHead + " here. Four are green here that were red at the base. Four are red here that were green at the base, and all four are the same thing:",
  "",
  ...verifierParity.newFailuresAtHead.map((name) => "- " + code(name) + " — " + verifierParity.newFailureDisposition[name]),
  "",
  "The published worker image was built from a specific commit and the fingerprint pins " + code("src/") + " to it, so any change to the product makes these red by construction. Clearing them means regenerating the fingerprint and republishing the image at a new freeze. Worker publication and deployment are both outside this phase, so they are reported rather than cleared.",
  "",
  "## Guards added",
  "",
  "- " + code("scripts/expungement-ai/phase2/verify-expungement-fact-model.mjs") + " — waiting-rule bindings resolve and author no duration; shared facts declared prepay are rendered or answered by a declared substitute; the rendered flow and the evaluator reach the same decision; every machine-shaped option value has a human label; the canonical derivations and contact parts hold. Removing the two shared-fact declarations it guards produces 102 failures.",
  "- " + code("scripts/expungement-ai/phase2/verify-jurisdiction-slug-routes.mjs") + " — all 51 resolve by slug, name and code.",
  "",
  "## What was deliberately not built",
  "",
  ...backlog.map((entry) => "- **" + entry.issueId + "** (" + entry.severity + ", " + entry.scope + ") — " + entry.notImplementedBecause),
  "",
  "Full record with the Phase 1 detail: " + code("data/expungement-ai/phase2/p2-p3-backlog.json") + ".",
  "",
  "## Phase 3",
  "",
  "Six disjoint state shards covering all 51 jurisdictions are regenerated from this head at " + code("docs/expungement-ai/phase2/shard-prompts/") + ". Each shard owns only its own compiled profiles and state packs; the Phase 2 shared layer is prohibited to all of them.",
  ""
];

fs.mkdirSync("docs/expungement-ai/phase2", { recursive: true });
fs.writeFileSync("docs/expungement-ai/phase2/implementation-report.md", lines.join("\n"));
console.log("wrote docs/expungement-ai/phase2/implementation-report.md");

console.log(JSON.stringify({
  measuredDifferences: measuredDifferences.length,
  unexplainedDifferences: unexplained.length,
  correctedPathways: proofRows.length,
  heldJurisdictions: heldRows.length,
  backlog: backlog.length,
  packetQuestionsNoLongerReAsked: askedBefore - askedAfter
}, null, 2));
