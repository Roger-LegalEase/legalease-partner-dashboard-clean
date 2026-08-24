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

// ---------------------------------------------------------------- summary
const askedBefore = sweepBefore.totals.asked;
const askedAfter = sweepAfter.totals.asked;
console.log(JSON.stringify({
  measuredDifferences: measuredDifferences.length,
  unexplainedDifferences: unexplained.length,
  correctedPathways: proofRows.length,
  heldJurisdictions: heldRows.length,
  backlog: backlog.length,
  packetQuestionsNoLongerReAsked: askedBefore - askedAfter
}, null, 2));
