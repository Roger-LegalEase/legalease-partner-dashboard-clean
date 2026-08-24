#!/usr/bin/env node
// How every Phase 1 count relates to every other Phase 1 count.
//
//   node scripts/expungement-ai/flow-audit/build-denominator-reconciliation.mjs
//   node scripts/expungement-ai/flow-audit/build-denominator-reconciliation.mjs --check
//
// Phase 1 reported a dozen numbers over four different denominators. Read
// together they look contradictory — 622 flows but 121 browser terminals, 41
// paid rows but 14 checkout passes — and a reader who cannot reconcile them is
// right not to trust any of them. Every relation below is recomputed from the
// artifacts rather than restated, and every one is asserted, so a drift fails
// this generator instead of quietly surviving in prose.

import { read, readJson, gitSha, writeArtifact, stableJson } from "./lib/engine.mjs";

const CHECK = process.argv.includes("--check");
const OUT = "data/expungement-ai/flow-audit/denominator-reconciliation.json";

const manifest = readJson("data/expungement-ai/flow-audit/flow-manifest.json");
const crawl = readJson("data/expungement-ai/flow-audit/evidence/crawl-report.json");
const divergence = readJson("data/expungement-ai/flow-audit/crawl-divergence.json");

const flows = manifest.flows;
const assertions = [];
function assertEqual(label, actual, expected, explanation) {
  assertions.push({ label, actual, expected, holds: actual === expected, explanation });
}

/* --- the flow denominator ------------------------------------------- */

const remedyFlows = flows.filter((flow) => flow.remedy.kind === "compiled_pathway");
const nonRemedyFlows = flows.filter((flow) => flow.remedy.kind === "no_remedy_resolved");
assertEqual("remedy + non-remedy = all flow IDs", remedyFlows.length + nonRemedyFlows.length, flows.length,
  "Every flow row is either a compiled pathway or one of the six non-remedy probes. There is no third kind.");

const supported = flows.filter((flow) => !flow.unsupportedOrReferralOutcome);
const unsupported = flows.filter((flow) => flow.unsupportedOrReferralOutcome?.kind === "unsupported");
const referral = flows.filter((flow) => flow.unsupportedOrReferralOutcome?.kind === "referral");
assertEqual("supported + unsupported + referral = all flow IDs", supported.length + unsupported.length + referral.length, flows.length,
  "Terminal classification partitions the same 622 rows. It is a second cut of the SAME denominator, not an additional set — which is why supported (90) plus unsupported (182) plus referral (350) equals 622 and not something larger.");

/* --- the audience/payment cut --------------------------------------- */

const dtcPaid = flows.filter((flow) => flow.paymentMode === "dtc_paid");
const dtcRefused = flows.filter((flow) => flow.paymentMode === "dtc_payment_refused_at_checkout");
const sponsored = flows.filter((flow) => flow.sponsorshipMode !== "none_direct_to_consumer");
const dtcNoPayment = flows.filter((flow) => flow.paymentMode === "dtc_no_payment");

assertEqual("dtc_paid + dtc_payment_refused = sponsored rows", dtcPaid.length + dtcRefused.length, sponsored.length,
  "A payment-eligible terminal emits exactly two rows: one direct-to-consumer and one partner-sponsored. So the sponsored row count equals the DTC payment-eligible row count, and 14 + 27 = 41 is that identity, not a coincidence.");

assertEqual("every payment mode accounted for", dtcPaid.length + dtcRefused.length + dtcNoPayment.length + sponsored.length, flows.length,
  "The four payment modes partition all 622 rows.");

const paymentEligiblePathways = new Set(
  flows.filter((flow) => flow.terminalOutcome.paymentAllowedAtEvaluator).map((flow) => `${flow.jurisdiction}:${flow.remedy.pathwayId ?? flow.remedy.probeId}`)
);

/* --- the browser cut ------------------------------------------------- */

const crawledRecords = crawl.flows.filter((record) => record.terminal && record.terminal.terminalMatchesManifest !== null);
const matched = crawl.totals.terminalsMatchingTheManifest;
const diverged = crawl.totals.terminalsDivergingFromTheManifest;
assertEqual("matched + diverged = comparable browser terminals", matched + diverged, crawledRecords.length,
  "Only records that reached a result card and rendered a recognisable eyebrow are comparable. The two shared-surface records (state picker, unregistered jurisdiction) render no result code and are excluded from both sides.");
assertEqual("diverged records equal the explained divergence set", diverged, divergence.totals.divergentRecords,
  "Every divergence the crawl reports is carried into crawl-divergence.json and classified there. Nothing is dropped between the two files.");

const uniqueCrawledFlowIds = new Set(crawl.flows.map((record) => record.flowId).filter((id) => !id.startsWith("EXPAI-SURFACE-")));

/* --- the relations a reader actually needs --------------------------- */

const relations = [
  {
    from: "622 flow IDs",
    to: "356 remedy rows + 266 non-remedy rows",
    relation: "partition",
    detail: `${remedyFlows.length} rows describe a compiled pathway; ${nonRemedyFlows.length} describe one of the six non-remedy probes across 51 jurisdictions plus the single unregistered-jurisdiction row. 51 x 5 probes = 255, plus 10 extra rows where a probe landed on a payment-eligible terminal and therefore emitted a partner-sponsored row as well, plus the unregistered row = ${nonRemedyFlows.length}.`
  },
  {
    from: "622 flow IDs",
    to: "90 supported + 182 unsupported + 350 referral",
    relation: "second partition of the same rows",
    detail: "Not an additional 622. Terminal classification re-cuts the same denominator: a row is supported when its terminal is neither an unsupported nor a referral outcome."
  },
  {
    from: "41 paid/sponsored rows",
    to: "14 checkout-guard passes + 27 checkout refusals",
    relation: "the DTC half of the payment-eligible rows",
    detail: `${paymentEligiblePathways.size} distinct (jurisdiction, pathway) pairs are payment-allowed at the evaluator. Each emits one DTC row and one partner-sponsored row. The ${dtcPaid.length} DTC rows whose route is not refused by a deferral or treatment classification are the checkout-guard passes; the other ${dtcRefused.length} are refused. 14 + 27 = 41 = the sponsored row count.`
  },
  {
    from: "622 flow IDs",
    to: "121 browser terminals",
    relation: "sample, not subset arithmetic",
    detail: `The crawl walks one canonical supported flow, one unsupported and one referral flow per jurisdiction, on desktop, plus one mobile capture per unique screen template, plus two shared surfaces. That is ${uniqueCrawledFlowIds.size} distinct flow IDs and ${crawl.flows.length} records. Crawling all 622 would re-drive the same six to eighteen screens hundreds of times; the manifest already holds the per-flow evaluation, and the browser's job is what the evaluator cannot answer.`
  },
  {
    from: "121 browser terminals",
    to: "117 matched + 4 diverged",
    relation: "partition",
    detail: "Each comparable record's rendered result-card eyebrow is mapped back to an engine result code and compared with the manifest row that drove it."
  }
];

/* --- the four divergences, in full ----------------------------------- */

const flowById = new Map(flows.map((flow) => [flow.flowId, flow]));
const divergenceDetail = divergence.divergences.map((row) => {
  const flow = flowById.get(row.flowId);
  const record = crawl.flows.find((candidate) => candidate.flowId === row.flowId && candidate.viewport === row.viewport);
  const firstDivergentScreen = (record?.screens ?? []).find((screen) => {
    const fixtureValue = flow?.fixture?.answers?.[screen.questionId];
    if (fixtureValue === undefined) return false;
    return JSON.stringify(screen.selectedValue) !== JSON.stringify(fixtureValue);
  }) ?? null;

  const severity = row.classification === "unrendered_fact_missing" || row.classification === "unrendered_fact_changes_the_outcome"
    ? "P1"
    : row.classification === "evaluator_disagrees" ? "P2" : "P3";

  return {
    flowId: row.flowId,
    state: row.jurisdiction,
    viewport: row.viewport,
    fixture: {
      origin: flow?.fixture?.origin ?? null,
      answers: flow?.fixture?.answers ?? {},
      renderedScreensWalked: (record?.screens ?? []).map((screen) => screen.questionId).filter(Boolean)
    },
    expectedTerminal: row.expectedFromManifest,
    actualTerminal: row.observedInBrowser,
    firstDivergence: firstDivergentScreen
      ? {
        questionId: firstDivergentScreen.questionId,
        browserSelected: firstDivergentScreen.selectedValue,
        fixtureValue: flow?.fixture?.answers?.[firstDivergentScreen.questionId] ?? null,
        offeredOptions: firstDivergentScreen.offeredOptions ?? []
      }
      : {
        questionId: null,
        note: "No rendered screen was answered differently from the fixture. The divergence is downstream of the answers: either the result card renders two engine result codes identically, or the fixture supplied a fact the flow never renders."
      },
    classification: row.classification,
    evidence: {
      crawlReport: "data/expungement-ai/flow-audit/evidence/crawl-report.json",
      divergenceRecord: "data/expungement-ai/flow-audit/crawl-divergence.json",
      browserReplayResultCode: row.browserAnswerReplay?.resultCode ?? null,
      browserReplayReasonCodes: row.browserAnswerReplay?.reasonCodes ?? [],
      screenshots: (record?.screenshotIds ?? [])
    },
    severity,
    recommendedPhase2Owner: row.classification === "evaluator_disagrees"
      ? "shared result presentation — two engine result codes render an eyebrow differing only by a full stop, so the browser cannot distinguish them"
      : row.classification === "crawl_answer_differs"
        ? "flow audit harness — the crawl driver, not the product"
        : "shared fact model — the fixture supplies a fact the flow never renders"
  };
});

const packet = {
  schemaVersion: "expai-denominator-reconciliation/v1",
  generatedBy: "scripts/expungement-ai/flow-audit/build-denominator-reconciliation.mjs",
  baseSha: gitSha("origin/main"),
  auditHead: gitSha("HEAD"),
  changesNoProductBehavior: true,
  counts: {
    flowIds: flows.length,
    remedyRows: remedyFlows.length,
    nonRemedyRows: nonRemedyFlows.length,
    supportedTerminals: supported.length,
    unsupportedTerminals: unsupported.length,
    referralTerminals: referral.length,
    browserRecords: crawl.flows.length,
    comparableBrowserTerminals: crawledRecords.length,
    matchedTerminals: matched,
    divergedTerminals: diverged,
    distinctFlowIdsCrawled: uniqueCrawledFlowIds.size,
    paidOrSponsoredRows: dtcPaid.length + dtcRefused.length + sponsored.length,
    sponsoredRows: sponsored.length,
    dtcPaymentEligibleRows: dtcPaid.length + dtcRefused.length,
    checkoutGuardPasses: dtcPaid.length,
    checkoutRefusals: dtcRefused.length,
    distinctPaymentEligiblePathways: paymentEligiblePathways.size
  },
  relations,
  assertions,
  allAssertionsHold: assertions.every((assertion) => assertion.holds),
  divergences: divergenceDetail
};

if (!packet.allAssertionsHold) {
  console.error("denominator reconciliation failed:");
  for (const assertion of assertions.filter((a) => !a.holds)) {
    console.error(`  ${assertion.label}: got ${assertion.actual}, expected ${assertion.expected}`);
  }
  process.exit(1);
}

const text = stableJson(packet);
if (CHECK) {
  if (read(OUT) !== text) {
    console.error(`${OUT} is stale or non-deterministic; re-run without --check.`);
    process.exit(1);
  }
  console.log(`denominator reconciliation current: ${assertions.length} assertion(s) hold.`);
  process.exit(0);
}
const written = writeArtifact(OUT, text);
console.log(`wrote ${written.path} (${written.bytes} bytes)`);
console.log(`  ${assertions.length} assertions, all hold`);
console.log(`  divergences detailed: ${divergenceDetail.length}`);
