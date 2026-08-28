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

let passed = 0;
const failures = [];
const ok = (name, condition, detail = "") => {
  if (condition) { passed += 1; console.log(`  ok   ${name}`); return; }
  failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
  console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`);
};

const TODAY = new Date("2026-08-28T00:00:00.000Z");
const nd = (facts, options = {}) => resolveRoute({
  jurisdiction: "ND",
  pathwayId: "non-conviction-court-record-closing-under-n-d-c-c-12-60-1-05",
  facts, on: TODAY, ...options
});
const sc = (options = {}) => resolveRoute({
  jurisdiction: "SC",
  pathwayId: "diversion-or-program-completion-expungement",
  facts: {}, on: TODAY, ...options
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

const pre = nd({ nd_qualifying_disposition_date: "2025-07-31" });
ok("a disposition the day before the amendment takes the petition branch",
  pre.selectedBranchId === "pre_effective_date_petition", pre.selectedBranchId ?? "none");
ok("the petition branch is a participant filing, not guidance",
  pre.outcomeMode === "participant_packet", pre.outcomeMode ?? "none");
ok("the petition branch says identified-but-not-available, never a completed guidance outcome",
  pre.serviceDisposition === "identified_not_yet_available", pre.serviceDisposition);
ok("the petition branch is held by the artifact-generation gate",
  pre.openDeliveryGates.includes("artifact_generation"), pre.openDeliveryGates.join(", ") || "none");
ok("the petition branch opens no payment while its artifact is absent",
  pre.generationAuthority === "closed" && pre.commercialDeliveryAuthority === "closed");
ok("the petition branch names its packet family so the work is identified",
  pre.packetFamily === "North Dakota § 12-60.1-05 Petition and Proposed Order", String(pre.packetFamily));

const post = nd({ nd_qualifying_disposition_date: "2025-08-01" });
ok("a disposition on the effective date takes the automatic branch",
  post.selectedBranchId === "post_effective_date_automatic", post.selectedBranchId ?? "none");
ok("the automatic branch is process guidance",
  post.serviceDisposition === "process_guidance", post.serviceDisposition);
ok("the automatic branch binds no packet family", post.packetFamily === null);
ok("the automatic branch opens no payment, generation or sponsorship",
  post.paymentAuthority === "closed" && post.generationAuthority === "closed" && post.sponsorshipAuthority === "closed");
ok("the artifact gate scoped to the petition branch does not hold the automatic branch",
  !post.openDeliveryGates.includes("artifact_generation"), post.openDeliveryGates.join(", ") || "none");

const later = nd({ nd_qualifying_disposition_date: "2026-06-01" });
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
  pti.openDeliveryGates.includes("source_acquisition"), pti.openDeliveryGates.join(", ") || "none");
ok("the source gate names the circuit-specific items",
  (pti.contract.deliveryGates ?? []).some((g) => g.kind === "source_acquisition"
    && g.items.some((i) => /solicitor application|payee|delivery/i.test(i))));
ok("a solicitor denial routes to retained counsel",
  pti.failureDispositions.some((d) => /denies|contested/i.test(d.when) && d.disposition === "retained_counsel"));
ok("the rescinded $150 figure appears nowhere on this route",
  !JSON.stringify(pti.contract).includes("$150") || /must not appear/i.test(JSON.stringify(pti.contract)));

console.log("\nDelivery authority rules:");

const unresolved = sc({ legallyResolved: false });
ok("an unresolved legal question closes every allow flag",
  !unresolved.delivery.generationAllowed && !unresolved.delivery.paymentAllowed
  && !unresolved.delivery.sponsoredGenerationAllowed && !unresolved.delivery.commerciallyDeliverable);
ok("an unresolved route says so first", (unresolved.holdReason ?? "").includes("not resolved"));

const sourceClosed = sc({ closedGateKinds: ["source_acquisition"] });
ok("closing a gate removes it from the open list",
  !sourceClosed.openDeliveryGates.includes("source_acquisition"));
ok("closing the source gate does not open a guidance route to payment",
  sourceClosed.paymentAuthority === "closed" && sourceClosed.generationAuthority === "closed");

const preClosed = nd({ nd_qualifying_disposition_date: "2025-07-31" }, { closedGateKinds: ["artifact_generation"] });
ok("closing the artifact gate lets the petition branch generate",
  preClosed.generationAuthority === "open", preClosed.holdReason ?? "");
ok("and then it is a participant packet, not a held state",
  preClosed.serviceDisposition === "participant_packet", preClosed.serviceDisposition);

const unknown = resolveRoute({ jurisdiction: "ZZ", pathwayId: "no-such-route", facts: {}, on: TODAY });
ok("a route with no contract is never treated as authorised",
  unknown.paymentAuthority === null && unknown.generationAuthority === "closed"
  && unknown.sponsorshipAuthority === "closed" && unknown.commercialDeliveryAuthority === "closed");

console.log("");
if (failures.length > 0) {
  console.error(`Route resolution FAILED — ${failures.length} of ${passed + failures.length}:`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log(`Route resolution passed: ${passed} checks.`);
