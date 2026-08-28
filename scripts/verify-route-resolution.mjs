#!/usr/bin/env node
/**
 * The canonical branch resolver, at the boundaries that consume it.
 *
 * Every case here is a service outcome a participant would actually be given.
 * The North Dakota pre-2025-08-01 cases are the reason this exists: the branch
 * was prose until the selector landed, so every North Dakota participant was
 * served post-2025 verification guidance, and a pre-2025 participant would have
 * waited for an automatic closure that was never going to happen.
 */
import { register } from "node:module";
register("./lib/ts-esm-loader.mjs", import.meta.url);

const { resolveRoute } = await import("@/lib/legal-authority/resolve-route");
const { evaluateCondition } = await import("@/lib/legal-authority/conditions");

let passed = 0;
const failures = [];
const ok = (name, condition, detail = "") => {
  if (condition) { passed += 1; console.log(`  ok   ${name}`); return; }
  failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
  console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`);
};

const fs = await import("node:fs");
const TODAY = new Date("2026-08-28T00:00:00.000Z");
/** A verified-record fact, the provenance a branch selector demands. */
const verified = (value) => ({ value, provenance: "verified_record", verifiedAt: "2026-08-28T00:00:00.000Z" });
/** Something the authenticated participant told us. */
const stated = (value) => ({ value, provenance: "participant_authenticated" });

const nd = (facts, options = {}) => resolveRoute({
  jurisdiction: "ND",
  pathwayId: "non-conviction-court-record-closing-under-n-d-c-c-12-60-1-05",
  facts, on: TODAY, phase: "FINAL_VERIFICATION", ...options
});
const sc = (facts = {}, options = {}) => resolveRoute({
  jurisdiction: "SC",
  pathwayId: "diversion-or-program-completion-expungement",
  facts, on: TODAY, phase: "FINAL_VERIFICATION", ...options
});

console.log("North Dakota § 12-60.1-05, branch by branch:");

const noDate = nd({});
ok("missing exact date resolves to needs_more_info, not to a branch",
  noDate.serviceDisposition === "needs_more_info" && noDate.selectedBranchId === null,
  `${noDate.serviceDisposition} / ${noDate.selectedBranchId}`);
ok("missing exact date names the fact it needs",
  noDate.missingFacts.includes("nd_qualifying_disposition_date"), noDate.missingFacts.join(", "));
ok("missing exact date opens nothing",
  noDate.paymentAuthority === "closed" && noDate.generationAuthority === "closed" && noDate.sponsorshipAuthority === "closed");

const pre = nd({ nd_qualifying_disposition_date: verified("2025-07-31") });
ok("a disposition the day before the amendment takes the petition branch",
  pre.selectedBranchId === "pre_effective_date_petition", pre.selectedBranchId ?? "none");
ok("the petition branch is a participant filing, not guidance",
  pre.outcomeMode === "participant_packet", pre.outcomeMode ?? "none");
ok("the petition branch says identified-but-not-available, never a completed guidance outcome",
  pre.serviceDisposition === "identified_not_yet_available", pre.serviceDisposition);
ok("the petition branch is held by the artifact-generation gate",
  pre.openDeliveryGateIds.includes("nd_pre_2025_petition_artifact"), pre.openDeliveryGateIds.join(", ") || "none");
ok("the petition branch opens no payment while its artifact is absent",
  pre.generationAuthority === "closed" && pre.commercialDeliveryAuthority === "closed");
ok("the petition branch names its packet family so the work is identified",
  pre.packetFamily === "North Dakota § 12-60.1-05 Petition and Proposed Order", String(pre.packetFamily));

const post = nd({ nd_qualifying_disposition_date: verified("2025-08-01") });
ok("a disposition on the effective date takes the automatic branch",
  post.selectedBranchId === "post_effective_date_automatic", post.selectedBranchId ?? "none");
ok("the automatic branch is process guidance",
  post.serviceDisposition === "process_guidance", post.serviceDisposition);
ok("the automatic branch binds no packet family", post.packetFamily === null);
ok("the automatic branch opens no payment, generation or sponsorship",
  post.paymentAuthority === "closed" && post.generationAuthority === "closed" && post.sponsorshipAuthority === "closed");
ok("the artifact gate scoped to the petition branch does not hold the automatic branch",
  !post.openDeliveryGateIds.includes("nd_pre_2025_petition_artifact"), post.openDeliveryGateIds.join(", ") || "none");

const later = nd({ nd_qualifying_disposition_date: verified("2026-06-01") });
ok("a recent disposition also takes the automatic branch", later.selectedBranchId === "post_effective_date_automatic");

// 61 complete days then verification on day 62. The period is the court's, so
// it lives in processingDeadlines and never in timing.
const contract = post.contract;
const deadline = (contract.processingDeadlines ?? [])[0];
ok("the 61-day period is a processing deadline, not an eligibility clock",
  Boolean(deadline) && /61 complete days/i.test(deadline.label));
ok("verification is day 62 or the next business day",
  /day 62 or the next business day/i.test(deadline.label));
ok("the timing rule carries no elapsed duration",
  contract.timing.kind === "event_trigger" && contract.timing.value === undefined);

const dispositions = post.failureDispositions;
ok("a record still public on day 62 routes to clerk then original-case correction",
  dispositions.some((d) => /day 62/i.test(d.when) && d.disposition === "agency_correction"
    && /clerk/i.test(d.note) && /enforce/i.test(d.note)));
ok("a BCI or originating-agency history is a separate challenge",
  dispositions.some((d) => /BCI|originating agency/i.test(d.when) && /must not be presented as one step/i.test(d.note)));
ok("contested eligibility is an attorney handoff",
  dispositions.some((d) => /contested/i.test(d.when) && d.disposition === "attorney_or_prosecutor"));
ok("no individualized notice is promised",
  (contract.exclusions ?? []).some((e) => /No individualized notice may be promised/i.test(e)));

console.log("\nSouth Carolina § 17-22-150:");

const pti = sc();
ok("the legal route is resolved", pti.delivery.legallyResolved === true);
ok("the outcome is solicitor-administered guidance",
  pti.serviceDisposition === "process_guidance" && pti.outcomeMode === "guidance_status");
ok("no custom pleading: the route binds no packet family", pti.packetFamily === null);
ok("checkout is closed", pti.paymentAuthority === "closed" && pti.delivery.paymentAllowed === false);
ok("sponsored generation is closed", pti.sponsorshipAuthority === "closed");
ok("packet credits are zero", pti.contract.commercialPosture.packetCreditsConsumed === 0);
ok("generation is closed", pti.generationAuthority === "closed");
ok("the circuit-specific source gate stays open after legal resolution",
  pti.openDeliveryGateIds.includes("sc_pti_circuit_solicitor_configuration"), pti.openDeliveryGateIds.join(", ") || "none");
ok("the source gate names the circuit-specific items",
  (pti.contract.deliveryGates ?? []).some((g) => g.kind === "source_acquisition"
    && g.items.some((i) => /solicitor application|payee|delivery/i.test(i))));
ok("an ordinary successful PTI is guidance, with no failure selected",
  pti.selectedFailureDisposition === null && pti.serviceDisposition === "process_guidance");
ok("the rescinded $150 figure appears nowhere on this route",
  !JSON.stringify(pti.contract).includes("$150") || /must not appear/i.test(JSON.stringify(pti.contract)));

console.log("\nDelivery authority rules:");

const unresolved = sc({}, { legallyResolved: false });
ok("an unresolved legal question closes every allow flag",
  !unresolved.delivery.generationAllowed && !unresolved.delivery.paymentAllowed
  && !unresolved.delivery.sponsoredGenerationAllowed && !unresolved.delivery.commerciallyDeliverable);
ok("an unresolved route says so first", (unresolved.holdReason ?? "").includes("not resolved"));

const sourceClosed = sc({}, { closedGateIds: ["sc_pti_circuit_solicitor_configuration"] });
ok("closing a gate removes it from the open list",
  !sourceClosed.openDeliveryGateIds.includes("sc_pti_circuit_solicitor_configuration"));
ok("closing the source gate does not open a guidance route to payment",
  sourceClosed.paymentAuthority === "closed" && sourceClosed.generationAuthority === "closed");

const preClosed = nd({ nd_qualifying_disposition_date: verified("2025-07-31") }, { closedGateIds: ["nd_pre_2025_petition_artifact"] });
ok("closing the artifact gate lets the petition branch generate",
  preClosed.generationAuthority === "open", preClosed.holdReason ?? "");
ok("and then it is a participant packet, not a held state",
  preClosed.serviceDisposition === "participant_packet", preClosed.serviceDisposition);

const unknown = resolveRoute({ jurisdiction: "ZZ", pathwayId: "no-such-route", facts: {}, on: TODAY, phase: "FINAL_VERIFICATION" });
ok("a route with no contract is never treated as authorised",
  unknown.paymentAuthority === null && unknown.generationAuthority === "closed"
  && unknown.sponsorshipAuthority === "closed" && unknown.commercialDeliveryAuthority === "closed");

console.log("\nFailure dispositions are executable, not prose:");

const denied = sc({ sc_pti_solicitor_decision: stated("denied") });
ok("SC solicitor denial selects a failure and becomes a handoff",
  denied.selectedFailureDisposition?.id === "sc_pti_solicitor_denied" && denied.serviceDisposition === "handoff",
  `${denied.selectedFailureDisposition?.id ?? "none"} / ${denied.serviceDisposition}`);
ok("SC denial names retained counsel", denied.selectedFailureDisposition?.disposition === "retained_counsel");
const contested = sc({ sc_pti_eligibility_contested: stated("true") });
ok("SC contested eligibility becomes a handoff",
  contested.selectedFailureDisposition?.id === "sc_pti_eligibility_contested" && contested.serviceDisposition === "handoff");
const granted = sc({ sc_pti_solicitor_decision: stated("granted") });
ok("SC ordinary successful PTI stays guidance with no failure selected",
  granted.selectedFailureDisposition === null && granted.serviceDisposition === "process_guidance");

const stillPublic = nd({ nd_qualifying_disposition_date: verified("2026-01-01"), nd_record_still_public_on_day_62: stated("true") });
ok("ND record still public on day 62 selects the clerk-correction failure",
  stillPublic.selectedFailureDisposition?.id === "nd_still_public_day_62"
  && stillPublic.selectedFailureDisposition?.disposition === "agency_correction");
const agencyWrong = nd({ nd_qualifying_disposition_date: verified("2026-01-01"), nd_agency_history_still_shows_matter: stated("true") });
ok("ND agency history error selects a separate agency correction",
  agencyWrong.selectedFailureDisposition?.id === "nd_agency_history_error");
ok("the ND agency correction is not the same step as the court closure",
  /must not be presented as one step/i.test(agencyWrong.selectedFailureDisposition?.note ?? ""));
const ndContested = nd({ nd_qualifying_disposition_date: verified("2026-01-01"), nd_eligibility_contested: stated("true") });
ok("ND contested eligibility becomes an attorney handoff",
  ndContested.selectedFailureDisposition?.id === "nd_eligibility_contested" && ndContested.serviceDisposition === "handoff");
ok("a selected failure closes packet actions",
  ndContested.generationAuthority === "closed" && ndContested.sponsorshipAuthority === "closed" && ndContested.commercialDeliveryAuthority === "closed");

console.log("\nPresence is not satisfaction — the Georgia-style consent test:");

const CONSENT = {
  operator: "verified_document_status",
  factId: "ga_written_prosecutor_consent_status",
  value: "verified_written_consent",
  requiredProvenance: "server_verified_document",
  requiredPhase: "FINAL_VERIFICATION"
};
const NEVER_CONSENT = ["unknown", "refused", "no", "silence", "request sent", "no known objection", "pending", "verbal"];
for (const value of NEVER_CONSENT) {
  const result = evaluateCondition(CONSENT, { ga_written_prosecutor_consent_status: stated(value) }, "FINAL_VERIFICATION");
  ok(`"${value}" does not satisfy verified written consent`, result.satisfied === false, result.reason ?? "");
}
ok("an absent consent fact does not satisfy it",
  evaluateCondition(CONSENT, {}, "FINAL_VERIFICATION").satisfied === false);
ok("the right value with the wrong provenance still fails",
  evaluateCondition(CONSENT, { ga_written_prosecutor_consent_status: stated("verified_written_consent") }, "FINAL_VERIFICATION").satisfied === false,
  "a participant saying the document exists is not the document");
ok("only a server-verified document satisfies it",
  evaluateCondition(CONSENT, { ga_written_prosecutor_consent_status: { value: "verified_written_consent", provenance: "server_verified_document" } }, "FINAL_VERIFICATION").satisfied === true);
ok("and not during preliminary screening, whatever the evidence",
  evaluateCondition(CONSENT, { ga_written_prosecutor_consent_status: { value: "verified_written_consent", provenance: "server_verified_document" } }, "PRELIMINARY_SCREENING").satisfied === false);

console.log("\nLifecycle phase and fact provenance:");

const screening = resolveRoute({ jurisdiction: "ND", pathwayId: "non-conviction-court-record-closing-under-n-d-c-c-12-60-1-05",
  facts: { nd_qualifying_disposition_date: { value: "2025-07-31", provenance: "screening_answer" } }, on: TODAY, phase: "PRELIMINARY_SCREENING" });
ok("a screening answer never selects the ND branch",
  screening.selectedBranchId === null, screening.selectedBranchId ?? "none");
ok("preliminary screening does not demand the exact date as a missing fact",
  !screening.missingFacts.includes("nd_qualifying_disposition_date"), screening.missingFacts.join(", ") || "none");
const verifiedPhase = nd({ nd_qualifying_disposition_date: { value: "2025-07-31", provenance: "screening_answer" } });
ok("at final verification a screening-provenance date is refused and reported missing",
  verifiedPhase.selectedBranchId === null && verifiedPhase.missingFacts.includes("nd_qualifying_disposition_date"));

const foreign = nd({ nd_qualifying_disposition_date: { ...verified("2025-07-31"), matterId: "other-matter" } }, { matterId: "this-matter" });
ok("a fact snapshot from another matter is rejected",
  foreign.rejectedFacts.some((r) => r.factId === "nd_qualifying_disposition_date") && foreign.selectedBranchId === null);
const foreignOwner = nd({ nd_qualifying_disposition_date: { ...verified("2025-07-31"), ownerUserId: "someone-else" } }, { ownerUserId: "this-participant" });
ok("a fact snapshot owned by another participant is rejected",
  foreignOwner.rejectedFacts.length === 1 && foreignOwner.selectedBranchId === null);

console.log("\nArtifact approval closes money, not generation:");

const { routeDeliveryAuthority } = await import("@/lib/legal-authority/index");
const packetRoute = {
  routeKey: "ZZ:t", jurisdiction: "ZZ", pathwayId: "t", decisionId: "T", ruleId: "T",
  mechanism: "m", statute: "s", stage: "single_stage", outcomeMode: "participant_packet",
  timing: { kind: "event_trigger", anchorText: "x" }, requiredFacts: ["f"], packetFamily: "F"
};
const awaiting = routeDeliveryAuthority({ ...packetRoute, artifactApprovalRequired: true }, TODAY);
ok("artifact approval pending allows candidate generation",
  awaiting.generationAllowed === true);
ok("artifact approval pending closes payment", awaiting.paymentAllowed === false);
ok("artifact approval pending closes sponsored credit consumption", awaiting.sponsoredGenerationAllowed === false);
ok("artifact approval pending closes participant delivery", awaiting.commerciallyDeliverable === false);
const approved = routeDeliveryAuthority(packetRoute, TODAY);
ok("an approved artifact lets the ordinary gates control",
  approved.paymentAllowed && approved.sponsoredGenerationAllowed && approved.commerciallyDeliverable);
const generationGate = routeDeliveryAuthority({ ...packetRoute, deliveryGates: [{ id: "g", kind: "artifact_generation", items: ["x"], owner: "o", statusSource: "server_artifact_record", note: "" }] }, TODAY);
ok("an open artifact-generation gate closes generation, payment, sponsorship and delivery",
  !generationGate.generationAllowed && !generationGate.paymentAllowed
  && !generationGate.sponsoredGenerationAllowed && !generationGate.commerciallyDeliverable);
const reviewGate = routeDeliveryAuthority({ ...packetRoute, deliveryGates: [{ id: "g", kind: "artifact_legal_review", items: ["x"], owner: "o", statusSource: "server_approval_record", note: "" }] }, TODAY);
ok("an open artifact-review gate allows generation but closes payment and delivery",
  reviewGate.generationAllowed && !reviewGate.paymentAllowed && !reviewGate.commerciallyDeliverable);

console.log("\nGeorgia § 42-8-66 — consent is a truth test, not a field with something in it:");

const doc = (value) => ({ value, provenance: "server_verified_document" });
const ga = (facts, phase = "FINAL_VERIFICATION") => resolveRoute({
  jurisdiction: "GA", pathwayId: "retroactive-first-offender-treatment-under-42-8-66",
  facts, on: TODAY, phase
});

// Nothing short of the document opens the packet. Each of these is a value a
// participant could plausibly give, and the report says none of them is consent.
for (const value of ["unknown", "silence", "no known objection", "request sent", "pending", "verbal", "verified_written_consent"]) {
  const r = ga({ ga_written_prosecutor_consent_status: stated(value) });
  ok(`consent stated as "${value}" does not open the Georgia packet`,
    r.serviceDisposition !== "participant_packet" && r.delivery.paymentAllowed === false,
    `${r.serviceDisposition} / pay=${r.delivery.paymentAllowed}`);
}
ok("the last of those is the RIGHT value with the WRONG provenance, and still fails",
  ga({ ga_written_prosecutor_consent_status: stated("verified_written_consent") }).serviceDisposition !== "participant_packet");

const gaAbsent = ga({});
ok("absent consent needs more info and opens nothing",
  gaAbsent.serviceDisposition === "needs_more_info" && gaAbsent.delivery.paymentAllowed === false
  && gaAbsent.sponsorshipAuthority === "closed");

const gaRefused = ga({ ga_written_prosecutor_consent_status: stated("refused") });
ok("refusal is a prosecutor handoff, not a defective packet",
  gaRefused.serviceDisposition === "handoff"
  && gaRefused.selectedFailureDisposition?.disposition === "attorney_or_prosecutor");
const gaWithdrawn = ga({ ga_written_prosecutor_consent_status: stated("withdrawn") });
ok("withdrawn consent is a handoff", gaWithdrawn.selectedFailureDisposition?.id === "ga_consent_withdrawn");
const gaContested = ga({ ga_written_prosecutor_consent_status: doc("verified_written_consent"), ga_contested_evidentiary_hearing: stated("true") });
ok("a contested evidentiary hearing goes to retained counsel",
  gaContested.selectedFailureDisposition?.id === "ga_contested_hearing" && gaContested.serviceDisposition === "handoff");

const gaConsented = ga({ ga_written_prosecutor_consent_status: doc("verified_written_consent") });
ok("only the verified document gets past the consent precondition",
  gaConsented.unsatisfiedPreconditions.length === 0 && gaConsented.selectedFailureDisposition === null);
ok("and the route is then held by its output gates rather than by consent",
  gaConsented.serviceDisposition === "identified_not_yet_available"
  && gaConsented.openDeliveryGateIds.length === 2);
ok("and it names the § 42-8-66 packet family",
  gaConsented.packetFamily === "Georgia § 42-8-66 Retroactive First Offender Petition");

// Consent is never collected in anonymous screening. The route may still be
// IDENTIFIED there; what it may not do is sell.
const gaScreening = ga({ ga_written_prosecutor_consent_status: doc("verified_written_consent") }, "PRELIMINARY_SCREENING");
ok("anonymous screening cannot prove consent, so it opens no payment",
  gaScreening.delivery.paymentAllowed === false && gaScreening.sponsorshipAuthority === "closed");
ok("but screening still identifies the route rather than reporting a refusal",
  gaScreening.serviceDisposition !== "handoff", gaScreening.serviceDisposition);
ok("the consent precondition is not collected in anonymous screening",
  gaConsented.contract.packetReleasePreconditions[0].collectedAt === "authenticated_intake");

// A granted order is not re-petitioned.
const gaOrderAfter = ga({ ga_written_prosecutor_consent_status: doc("verified_written_consent"), ga_qualifying_order_date: verified("2026-07-02") });
ok("an order granted on or after 2026-07-01 enters implementation tracking",
  gaOrderAfter.selectedBranchId === "order_already_granted_post_2026_07_01"
  && gaOrderAfter.serviceDisposition === "process_guidance" && gaOrderAfter.packetFamily === null);
ok("and sells nothing, because the court has already granted the relief",
  gaOrderAfter.delivery.paymentAllowed === false && gaOrderAfter.sponsorshipAuthority === "closed");
const gaOrderBefore = ga({ ga_written_prosecutor_consent_status: doc("verified_written_consent"), ga_qualifying_order_date: verified("2026-06-30") });
ok("an order granted before that date is also implementation, not a second petition",
  gaOrderBefore.selectedBranchId === "order_already_granted_before_2026_07_01"
  && gaOrderBefore.packetFamily === null);

// Route identity: the legacy pathway keeps its own different statute.
const gaLegacy = resolveRoute({ jurisdiction: "GA", pathwayId: "youthful-first-offender-restriction-route", facts: {}, on: TODAY, phase: "FINAL_VERIFICATION" });
ok("the legacy Georgia pathway still exists and still carries § 42-8-62.1",
  gaLegacy.contract?.statute === "O.C.G.A. § 42-8-62.1", gaLegacy.contract?.statute ?? "absent");
ok("the new § 42-8-66 route is a separate contract, not a rename",
  gaConsented.contract.statute === "O.C.G.A. § 42-8-66" && gaConsented.routeKey !== gaLegacy.routeKey);
// Route identity is checked through the revalidation record, not an alias:
// see the product-integration block below.

console.log("\nMissouri § 311.326 — scope branches and the six clerk gates:");

const MO_GATES = ["mo_311_326_clerk_final_caption", "mo_311_326_clerk_filing_code", "mo_311_326_clerk_fee",
  "mo_311_326_clerk_service", "mo_311_326_clerk_summons", "mo_311_326_clerk_division_instructions"];
const mo = (facts, opts = {}) => resolveRoute({
  jurisdiction: "MO", pathwayId: "first-minor-in-possession-alcohol-expungement-under-311-326",
  facts, on: TODAY, phase: "FINAL_VERIFICATION", ...opts
});

const moState = mo({ mo_311_326_conviction_origin: verified("state_311_325") });
ok("a § 311.325 state conviction takes the state route",
  moState.selectedBranchId === "state_311_325_conviction" && moState.outcomeMode === "participant_packet");
ok("the state route is packet-bearing but held",
  moState.outcomeMode === "participant_packet" && moState.openDeliveryGateIds.length === 6);
ok("and the derived eligibility date is required before any packet",
  moState.missingFacts.includes("date_of_birth")
  || moState.unsatisfiedPreconditions.some((p) => p.precondition.id === "date_of_birth"));

const MO_DOB = { date_of_birth: verified("2000-01-01") };
const moAdopts = mo({ ...MO_DOB, mo_311_326_conviction_origin: verified("ordinance_expressly_adopts_311_326") });
ok("an ordinance that expressly adopts the remedy is a separate local route, not this one",
  moAdopts.selectedBranchId === "ordinance_expressly_adopts_311_326"
  && moAdopts.serviceDisposition === "handoff" && moAdopts.packetFamily === null);

const moMirrors = mo({ ...MO_DOB, mo_311_326_conviction_origin: verified("ordinance_mirrors_offence") });
ok("mere municipal equivalence falls outside § 311.326",
  moMirrors.selectedBranchId === "ordinance_merely_mirrors_offence"
  && moMirrors.paymentAuthority === "closed" && moMirrors.packetFamily === null);
ok("and routes to § 610.140 or local relief rather than selling this petition",
  /610\.140|local relief/i.test(moMirrors.selectedFailureDisposition?.note ?? moMirrors.contract.serviceBranches.find((b) => b.id === "ordinance_merely_mirrors_offence").note));

const moAmbiguous = mo({ ...MO_DOB, mo_311_326_conviction_origin: verified("ambiguous") });
ok("an ambiguous judgment holds for the certified disposition",
  moAmbiguous.selectedBranchId === "judgment_ambiguous" && moAmbiguous.paymentAuthority === "closed");

const moNoFact = mo({});
ok("without the instrument of conviction the route needs more info, not a guess",
  moNoFact.serviceDisposition === "needs_more_info"
  && moNoFact.missingFacts.includes("mo_311_326_conviction_origin"));

// The six clerk requirements are six gates, not one. Closing five must not open
// the route: that is what gate ids exist for.
for (let i = 0; i < MO_GATES.length; i += 1) {
  const closed = MO_GATES.filter((_, index) => index !== i);
  const partial = mo({ mo_311_326_conviction_origin: verified("state_311_325") }, { closedGateIds: closed });
  ok(`closing five clerk gates leaves ${MO_GATES[i]} holding the route`,
    partial.generationAuthority === "closed" && partial.openDeliveryGateIds.join() === MO_GATES[i],
    partial.openDeliveryGateIds.join(", ") || "none");
}
const moAll = mo({ ...MO_DOB, mo_311_326_conviction_origin: verified("state_311_325") }, { closedGateIds: MO_GATES });
ok("with all six confirmed the merits petition is a real participant packet",
  moAll.serviceDisposition === "participant_packet" && moAll.generationAuthority === "open"
  && moAll.delivery.paymentAllowed === true && moAll.sponsorshipAuthority === "open");

const moContract = mo({}).contract;
ok("the filing-code rule is recorded: XG provisional, X5 prohibited, X1 on clerk direction",
  /XG provisional, X5 prohibited, X1 only on clerk direction/i.test(
    (moContract.deliveryGates.find((g) => g.id === "mo_311_326_clerk_filing_code")?.items ?? []).join(" ")));
ok("the clerk gate is operational configuration, not legal research",
  /operational configuration, NOT unresolved legal research/i.test(moContract.notes ?? ""));
ok("the decision is scoped to § 311.326 and not extended to mo-610-130",
  /must not be extended to mo-610-130/i.test(moContract.notes ?? ""));

console.log("\nProduct integration — Georgia route identity and Missouri screening:");

// Free screening must not ask an exact date for the § 311.326 clock.
const { getProfileByJurisdiction } = await import("@/lib/rcap-engine/profile-registry");
const { projectPublicProfile } = await import("@/lib/rcap-engine/public-profile-projection");
const moPublic = projectPublicProfile(getProfileByJurisdiction("MO"));
// `projectPublicProfile(...).questions` is the whole catalogue, prepay and
// postpay together. Free screening is what `selectScreeningQuestionIds`
// returns, so that is what this asks — checked against the empty context and
// every pathway context, since naming a route shows a participant more.
const { selectScreeningQuestionIds } = await import("@/lib/rcap-engine/screening-question-selection");
const moProfileForScreening = getProfileByJurisdiction("MO");
const moScreeningIds = new Set([
  ...selectScreeningQuestionIds(moProfileForScreening, moPublic, {}),
  ...moProfileForScreening.pathways.flatMap((pathway) =>
    selectScreeningQuestionIds(moProfileForScreening, moPublic, { possible_pathway_context: pathway.label }))
]);
ok("Missouri free screening asks no exact birth date",
  !moScreeningIds.has("date_of_birth"));
const moProfile = getProfileByJurisdiction("MO");
// Read from the public catalogue, not the compiled profile. Missouri renders
// from a designer profile, so a question in `profile.questions` that the
// designer profile does not carry is never published — which is exactly how the
// old twenty_first_birthday anchor came to name a fact no Missouri profile
// asked. Both of these are published by the projection from the route
// contract's own screeningFactIds and packetReleasePreconditions.
const moBirthDate = moPublic.questions.find((q) => q.id === "date_of_birth");
ok("the birth date is a packet_information fact, collected after the claim",
  moBirthDate?.stage === "packet_information", moBirthDate?.stage);
ok("it collects date of birth once and derives the clock from it",
  /date of birth/i.test(moBirthDate?.prompt ?? ""));
// Being a route consumer is what keeps the fact scoped to the one route that
// needs it; it is not publication. The check that matters is that no context —
// including naming the § 311.326 route itself — puts it in screening, and the
// earlier assertion covers that. What this adds is that the scope is exact.
ok("the birth date is scoped to the one route that needs it",
  (moProfile.questionLifecycle?.routeConsumers?.date_of_birth ?? []).join() === "first-minor-in-possession-alcohol-expungement-under-311-326");
ok("and no other Missouri route inherits it",
  moProfile.pathways.every((pathway) => pathway.id === "first-minor-in-possession-alcohol-expungement-under-311-326"
    || !(moProfile.questionLifecycle?.routeConsumers?.date_of_birth ?? []).includes(pathway.id)));
ok("it is still an exact packet fact",
  (moProfile.questionLifecycle?.exactPacketFactIds ?? []).includes("date_of_birth"));
// Screening carries the approximate form of the same fact, so a plainly
// under-age person is not told to authenticate before being told no.
ok("free screening carries the approximate age question instead",
  moPublic.questions.some((q) => q.id === "mo_at_least_twenty_two"));
ok("and it is a yes/no/unsure question, not a date",
  moPublic.questions.find((q) => q.id === "mo_at_least_twenty_two")?.type === "yes_no_unsure",
  moPublic.questions.find((q) => q.id === "mo_at_least_twenty_two")?.type);

// Georgia: two route identities, not an alias.
const aliasDoc = JSON.parse(fs.readFileSync("data/rcap-ledger/route-aliases.json", "utf8"));
ok("no blanket alias exists between the two Georgia routes", aliasDoc.aliases.length === 0);
const reval = aliasDoc.revalidations.find((r) => r.jurisdiction === "GA");
ok("a revalidation path exists instead of an alias",
  reval?.legacyPathwayId === "youthful-first-offender-restriction-route"
  && reval?.candidatePathwayId === "retroactive-first-offender-treatment-under-42-8-66");
ok("it migrates only matters proven to have represented § 42-8-66",
  reval?.migrateOnlyWhen?.operator === "all"
  && (reval.migrateOnlyWhen.conditions ?? []).some((c) => c.value === "retroactive_first_offender_42_8_66"));
ok("it is idempotent and does not rewrite matter history",
  /already carrying/i.test(reval?.idempotence ?? "") && /Do not rewrite matter history/i.test(reval?.neverDo ?? ""));

// ga-rfo reaches exactly one statutory route.
const crosswalk = JSON.parse(fs.readFileSync("data/rcap-ledger/track-pathway-crosswalk.json", "utf8"));
const gaRfo = crosswalk.registryTracks.find((t) => t.registryTrackId === "ga-rfo");
ok("ga-rfo maps to exactly one route",
  gaRfo.mappedCompiledPathwayIds.length === 1, gaRfo.mappedCompiledPathwayIds.join(", "));
ok("and it is the § 42-8-66 route",
  gaRfo.mappedCompiledPathwayIds[0] === "retroactive-first-offender-treatment-under-42-8-66");
ok("the legacy route no longer reaches ga-rfo",
  !gaRfo.mappedCompiledPathwayIds.includes("youthful-first-offender-restriction-route"));

// The petition family is its own, and its gates hold the money closed.
const gaPetition = ga({ ga_written_prosecutor_consent_status: doc("verified_written_consent") });
ok("the § 42-8-66 route names its own petition family",
  gaPetition.packetFamily === "Georgia § 42-8-66 Retroactive First Offender Petition");
ok("with consent verified the route is identified and not deliverable",
  gaPetition.serviceDisposition === "identified_not_yet_available");
ok("the petition family build gate is open",
  gaPetition.openDeliveryGateIds.includes("ga_42_8_66_petition_family_build"));
ok("the candidate and review gate is open",
  gaPetition.openDeliveryGateIds.includes("ga_42_8_66_candidate_and_review"));
ok("no guidance-family approval opens payment on the petition",
  gaPetition.delivery.paymentAllowed === false && gaPetition.sponsorshipAuthority === "closed"
  && gaPetition.commercialDeliveryAuthority === "closed");
ok("artifact approval is required on this route",
  gaPetition.contract.artifactApprovalRequired === true);

console.log("\nCommercial classification and service disposition are independent:");

const { LEGAL_AUTHORITY, routePaymentAuthority } = await import("@/lib/legal-authority/index");
const closure = JSON.parse(fs.readFileSync("data/rcap-ledger/sellable-pathway-closure.json", "utf8"));
const contradictions = JSON.parse(fs.readFileSync("data/rcap-ledger/closure-authority-contradictions.json", "utf8"));
const closureByKey = new Map(closure.pathways.map((p) => [p.pathwayKey, p]));
const contractByKey = new Map(LEGAL_AUTHORITY.routes.map((r) => [r.routeKey, r]));

// A parent leaving the paid denominator must not disable its children. The
// children are resolved through the real resolver, not read from a ledger.
const CHILD_EXPECTATIONS = [
  ["MS:additional-justice-court-misdemeanor-relief-9-11-15-3", "participant_packet"],
  ["MS:additional-municipal-court-misdemeanor-relief-21-23-7-6", "participant_packet"],
  ["MS:first-offense-controlled-substance-conditional-discharge-relief", "participant_packet"],
  ["MS:first-offense-dui-expungement", "participant_packet"],
  ["MS:nonadjudication-under-99-15-26", "participant_packet"],
  ["MS:pretrial-intervention-or-diversion-expungement", "participant_packet"],
  ["MS:human-trafficking-survivor-vacatur-97-3-54-6-5", "attorney_review_packet"],
  ["MS:human-trafficking-survivor-expungement-97-3-54-6-6", "attorney_review_packet"]
];
for (const [key, expectedMode] of CHILD_EXPECTATIONS) {
  const [code, pathwayId] = [key.slice(0, key.indexOf(":")), key.slice(key.indexOf(":") + 1)];
  const child = resolveRoute({ jurisdiction: code, pathwayId, facts: {}, on: TODAY, phase: "FINAL_VERIFICATION" });
  ok(`${key} remains ${expectedMode} and reachable`,
    child.outcomeMode === expectedMode && child.contract !== null,
    `${child.outcomeMode ?? "no contract"}`);
  ok(`${key} still binds a packet family`, child.packetFamily !== null, String(child.packetFamily));
}

// The trafficking children are attorney-review packets, which is packet-bearing.
// Demoting them to handoffs when the umbrella moves would lose two packets.
for (const key of ["MS:human-trafficking-survivor-vacatur-97-3-54-6-5", "MS:human-trafficking-survivor-expungement-97-3-54-6-6"]) {
  const contract = contractByKey.get(key);
  ok(`${key} keeps attorney review rather than becoming a handoff`,
    routePaymentAuthority(contract) === "attorney_review_required", routePaymentAuthority(contract));
}

// No route that binds no packet family may open checkout, anywhere.
const nullFamilyWithCheckout = LEGAL_AUTHORITY.routes
  .filter((r) => r.packetFamily === null && routePaymentAuthority(r) === "packet_checkout");
ok("no packetFamily-null route opens checkout", nullFamilyWithCheckout.length === 0,
  nullFamilyWithCheckout.map((r) => r.routeKey).join(", "));

// Every adjudicated row keeps its service disposition regardless of what the
// commercial classification becomes.
for (const row of contradictions.rows) {
  const contract = contractByKey.get(row.pathwayKey);
  ok(`${row.pathwayKey}: service disposition is preserved beside the denominator move`,
    row.proposal.preservedOutcomeMode === contract.outcomeMode
    && Boolean(row.proposal.preservedServiceDisposition));
}
ok("the eleven rows are adjudicated individually, not as one move",
  new Set(contradictions.rows.map((r) => r.adjudication?.serviceDisposition)).size > 1,
  JSON.stringify(contradictions.serviceDispositions));
ok("North Dakota is branch_mixed and blocked on the closure vocabulary",
  contradictions.rowsBlockedOnVocabulary.length === 1
  && contradictions.rowsBlockedOnVocabulary[0].pathwayKey.startsWith("ND:"));
ok("Minnesota's two conflated mechanisms are named",
  (contradictions.rows.find((r) => r.pathwayKey.startsWith("MN:"))?.adjudication?.conflatesDistinctMechanisms ?? []).length === 2);
// Rhode Island has left the contradiction register — it is reclassified — so the
// claim is now checked against its contract, which is where it has to hold.
// A route that leaves the paid denominator must not thereby become sellable.
const riContract = contractByKey.get("RI:path-g-decriminalized-offense-expungement");
ok("Rhode Island stays held until its statute is identified",
  riContract?.outcomeMode === "referral" && riContract?.packetFamily === null
  && /until the specific statute is identified/i.test(riContract?.notes ?? ""),
  `${riContract?.outcomeMode} / ${riContract?.packetFamily}`);
ok("Rhode Island opens no checkout after reclassification",
  routePaymentAuthority(riContract) === "closed");

// The eight reclassified routes: their commercial classification moved and
// nothing about their behaviour did.
const RECLASSIFIED = [
  "MS:additional-justice-or-municipal-court-misdemeanor-relief",
  "MS:controlled-substance-conditional-discharge-active-case-admission",
  "MS:dui-nonadjudication",
  "MS:human-trafficking-survivor-vacatur-and-expungement",
  "MS:nonadjudication-99-15-26-active-case-admission",
  "MS:pretrial-intervention-active-case-admission",
  "RI:path-g-decriminalized-offense-expungement",
  "SC:diversion-or-program-completion-expungement",
  // Confirmed by the owner separately: stage=enforcement is none of the five
  // categories the original approval enumerated, so it was held until asked.
  "MS:intervention-court-statutory-result-enforcement-referral"
];
for (const key of RECLASSIFIED) {
  const pathway = closureByKey.get(key);
  const contract = contractByKey.get(key);
  ok(`${key}: left the paid denominator`, pathway?.category === "non_filing_guidance", pathway?.category ?? "absent");
  ok(`${key}: its outcome mode is unchanged and still closes checkout`,
    routePaymentAuthority(contract) === "closed" && contract.packetFamily === null);
}

// The three held rows must NOT have moved. Two are conditioned by the owner and
// one falls outside the categories the approval names.
// Two rows remain held, each on a condition the owner's approval states: North
// Dakota until its branches are classified separately, Minnesota until its two
// mechanisms are separated.
for (const key of [
  "ND:non-conviction-court-record-closing-under-n-d-c-c-12-60-1-05",
  "MN:cannabis-automatic-or-board-reviewed-expungement-under-609a-055-06"
]) {
  ok(`${key}: held back, still in the paid denominator`,
    closureByKey.get(key)?.category === "paid_packet_intended", closureByKey.get(key)?.category ?? "absent");
}
ok("two rows remain in the contradiction register", contradictions.total === 2, String(contradictions.total));

// The approval says in terms that the move does not convert a handoff into
// ordinary guidance. The enforcement referral is the case that tests it: its
// closure category is now non_filing_guidance and its service disposition must
// still be a handoff.
const enforcement = contractByKey.get("MS:intervention-court-statutory-result-enforcement-referral");
ok("the enforcement referral keeps its referral outcome after the denominator move",
  enforcement?.outcomeMode === "referral" && enforcement?.stage === "enforcement",
  `${enforcement?.outcomeMode} / ${enforcement?.stage}`);
ok("the enforcement referral is not served as ordinary guidance",
  resolveRoute({ jurisdiction: "MS", pathwayId: "intervention-court-statutory-result-enforcement-referral",
    facts: {}, on: TODAY, phase: "FINAL_VERIFICATION" }).serviceDisposition === "handoff");
ok("the enforcement referral still prepares no merits petition",
  enforcement?.packetFamily === null && /never sold as an expungement packet/i.test(enforcement?.notes ?? ""));

// Applying the proposal must not change what any route does. Every row's route
// keeps the outcome mode its contract states.
for (const row of contradictions.rows) {
  const before = closureByKey.get(row.pathwayKey);
  ok(`${row.pathwayKey}: the ledger move does not touch the contract`,
    before?.category === row.proposal.previousClassification
    && contractByKey.get(row.pathwayKey)?.outcomeMode === row.authorityOutcomeMode);
}

console.log("");
if (failures.length > 0) {
  console.error(`Route resolution FAILED — ${failures.length} of ${passed + failures.length}:`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log(`Route resolution passed: ${passed} checks.`);
