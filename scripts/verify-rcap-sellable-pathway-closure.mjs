#!/usr/bin/env node
await import("./verify-rcap-il-delivery-binding.mjs");
// SELLABLE PATHWAY CLOSURE — canonical verifier.
//
//   node scripts/verify-rcap-sellable-pathway-closure.mjs                  # full closure gate
//   node scripts/verify-rcap-sellable-pathway-closure.mjs --governance-only # rules that must hold today
//   node scripts/verify-rcap-sellable-pathway-closure.mjs --mutations      # prove the checks bite
//
// The full gate enforces the controlling invariant:
//
//     intendedSellablePathways
//       == publiclyReachableSellablePathways
//       == authoritativePacketReadyPathways
//       == packetSpecCompletePathways
//       == technicallyApprovedPacketPathways
//       == legallyApprovedPacketPathways
//       == successfullyRenderedPathways
//
// It fails today, by design and on purpose: the shortfall is real, it is named
// per pathway, and it is not closable by reclassification. The governance mode
// enforces the subset that must hold at every commit — that the denominator is
// frozen, that no pathway leaves it without a signed reason, that no intended
// paid pathway is quietly served as a finished guidance product, and that the
// 497-track denominator is neither replaced nor reinterpreted here.

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => fs.readFileSync(path.join(rootDir, p), "utf8");
const readJson = (p) => JSON.parse(read(p));
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");

const GOVERNANCE_ONLY = process.argv.includes("--governance-only");
const MUTATIONS = process.argv.includes("--mutations");

const LEDGER = "data/rcap-ledger/sellable-pathway-closure.json";
const FROZEN = "data/rcap-ledger/sellable-pathway-denominator.frozen.json";
const REGISTER = "data/rcap-ledger/sellable-pathway-reclassifications.json";
const TRACK_LEDGER = "data/rcap-ledger/track-terminalization.json";
const TREATMENTS_DIR = "data/rcap-all50/terminalization-treatments";

const CATEGORIES = [
  "paid_packet_intended",
  "non_filing_guidance",
  "product_scope_exclusion",
  "legally_unavailable",
  "exact_external_deferral"
];

const STAGE_ORDER = [
  "intendedSellablePathways",
  "publiclyReachableSellablePathways",
  "authoritativePacketReadyPathways",
  "packetSpecCompletePathways",
  "technicallyApprovedPacketPathways",
  "legallyApprovedPacketPathways",
  "successfullyRenderedPathways"
];

const VALID_RECLASSIFICATION_REASONS = new Set(["no_participant_filing", "product_scope_decision"]);
const REQUIRED_RECLASSIFICATION_FIELDS = ["id", "pathwayKey", "previousClassification", "newClassification", "reason", "evidence", "authority", "decidedOn"];

/**
 * Every governance rule, as a pure function of the three documents. Written this
 * way so --mutations can run the same rules against a deliberately corrupted
 * copy and prove each one bites.
 */
function governanceFailures({ ledger, frozen, register, trackLedger, treatments }) {
  const failures = [];
  const fail = (condition, message) => { if (!condition) failures.push(message); };

  // 1. The two denominators stay separate. This ledger may not restate,
  //    replace or renumber 497/497.
  fail(ledger.separateFrom?.ledger === TRACK_LEDGER,
    "the closure ledger must name the 497-track ledger as a separate denominator it does not replace");
  fail(trackLedger.aggregates?.registryTracks === 497 && trackLedger.aggregates?.tracksTerminal === 497,
    `the 497-track denominator must be left intact; found registryTracks=${trackLedger.aggregates?.registryTracks} tracksTerminal=${trackLedger.aggregates?.tracksTerminal}`);
  fail(ledger.denominator?.count !== trackLedger.aggregates?.registryTracks,
    "the sellable denominator must not be the 497-track denominator restated under a new name");

  // 2. Exactly one category per pathway, drawn from the fixed vocabulary.
  const seen = new Set();
  for (const entry of ledger.pathways) {
    fail(!seen.has(entry.pathwayKey), `${entry.pathwayKey}: appears more than once in the closure ledger`);
    seen.add(entry.pathwayKey);
    fail(CATEGORIES.includes(entry.category), `${entry.pathwayKey}: category ${entry.category} is not one of the five closure categories`);
    fail(typeof entry.categoryBasis === "string" && entry.categoryBasis.length > 0, `${entry.pathwayKey}: carries no written basis for its category`);
  }
  const categorySum = CATEGORIES.reduce((total, category) => total + (ledger.categoryCounts?.[category] ?? 0), 0);
  fail(categorySum === ledger.pathways.length,
    `every compiled pathway must carry exactly one category; counts sum to ${categorySum} against ${ledger.pathways.length} pathways`);

  // 3. The denominator is frozen. Every difference from the freeze is explained
  //    by a signed record, and no reason may be an implementation excuse.
  const live = ledger.pathways.filter((e) => e.category === "paid_packet_intended").map((e) => e.pathwayKey).sort();
  fail(sha256(live.join("\n")) === ledger.denominator?.sha256,
    "the ledger's recorded denominator hash does not match the pathways it lists");
  const frozenKeys = new Set(frozen.pathwayKeys);
  fail(frozen.count === frozen.pathwayKeys.length, "the frozen denominator's count does not match the keys it lists");
  fail(sha256([...frozen.pathwayKeys].sort().join("\n")) === frozen.sha256, "the frozen denominator's hash does not match the keys it lists");

  const signedByKey = new Map((register.reclassifications ?? []).map((r) => [r.pathwayKey, r]));
  for (const key of frozen.pathwayKeys) {
    if (live.includes(key)) continue;
    const signed = signedByKey.get(key);
    fail(Boolean(signed), `${key}: left the intended-sellable denominator with no signed reclassification. Implementation difficulty, a missing form, stale review and an evaluator defect are not valid reasons to shrink the paid denominator.`);
    if (signed) {
      fail(signed.previousClassification === "paid_packet_intended",
        `${key}: its reclassification records previousClassification=${signed.previousClassification}, but the freeze holds it as paid_packet_intended`);
    }
  }
  for (const record of register.reclassifications ?? []) {
    for (const field of REQUIRED_RECLASSIFICATION_FIELDS) {
      fail(record[field] !== undefined && record[field] !== null && record[field] !== "",
        `reclassification ${record.id ?? "(no id)"}: missing required field ${field}`);
    }
    fail(VALID_RECLASSIFICATION_REASONS.has(record.reason),
      `reclassification ${record.id ?? "(no id)"}: reason ${record.reason} is not a valid reason to move a pathway out of the paid denominator`);
    fail(CATEGORIES.includes(record.newClassification),
      `reclassification ${record.id ?? "(no id)"}: newClassification ${record.newClassification} is not a closure category`);
    if (record.reason === "product_scope_decision") {
      fail(String(record.authority ?? "").toLowerCase().includes("roger"),
        `reclassification ${record.id ?? "(no id)"}: a product-scope exclusion requires Roger's authority`);
    }
  }

  // 4. No intended paid pathway is served as a finished guidance product. A
  //    pathway on which the participant files something and which does not
  //    render must carry that as an OPEN BLOCKER, not as a closed treatment.
  for (const entry of ledger.pathways) {
    if (entry.category !== "paid_packet_intended") continue;
    const closed = entry.openBlockers.length === 0;
    const delivers = entry.stages.successfullyRendered === true;
    fail(!(closed && !delivers),
      `${entry.pathwayKey}: recorded as a closed paid pathway while producing no artifact. A paid pathway is closed only when it delivers.`);
    if (!delivers) {
      fail(entry.openBlockers.length > 0,
        `${entry.pathwayKey}: produces no artifact and carries no open blocker, which reads as a completed treatment`);
    }
  }
  for (const entry of ledger.pathways) {
    if (entry.category === "paid_packet_intended") continue;
    const files = (entry.classification?.evidence?.filingEvidence ?? []).length > 0;
    fail(!files || signedByKey.has(entry.pathwayKey),
      `${entry.pathwayKey}: committed evidence records that the participant files their own document(s), yet it sits outside the paid denominator without a signed reclassification`);
  }

  // 5. Guidance substitution is reported, never absorbed. The list is checked
  //    against the committed treatments themselves, so shortening it is caught
  //    rather than believed.
  fail(Array.isArray(ledger.guidanceSubstitution?.tracks),
    "the closure ledger must list every track where guidance was substituted for a packet");
  const listed = new Set((ledger.guidanceSubstitution?.tracks ?? []).map((row) => row.trackId));
  for (const treatment of treatments) {
    if (treatment.participantFiles?.filesSomething !== true) continue;
    if (treatment.treatment === "production_packet") continue;
    fail(listed.has(treatment.trackId),
      `${treatment.trackId}: its own treatment records that the participant files a document, and it is served as a ${treatment.treatment}, but the closure ledger does not list it as a guidance substitution`);
  }
  for (const row of ledger.guidanceSubstitution?.tracks ?? []) {
    fail(row.participantFilesSomething === true,
      `${row.trackId}: listed as a guidance substitution without the filing evidence that makes it one`);
    fail(row.servedAs !== "production_packet",
      `${row.trackId}: a production packet is not a guidance substitution`);
  }

  // 6. Do not charge for guidance. The money gate may never be wider than the
  //    delivery gate.
  const payableUndeliverable = ledger.pathways.filter(
    (e) => e.stages.publiclyReachableSellable === true && e.stages.successfullyRendered !== true
  );
  fail(ledger.doNotChargeForGuidance?.payableButUndeliverable?.length === payableUndeliverable.length,
    `the ledger records ${ledger.doNotChargeForGuidance?.payableButUndeliverable?.length} payable-but-undeliverable pathway(s) against ${payableUndeliverable.length} present in its own rows`);

  // 7. Payment may not run ahead of counsel.
  const payableUnratified = ledger.pathways.filter(
    (e) => e.category === "paid_packet_intended" && e.stages.publiclyReachableSellable === true && e.stages.legallyApprovedPacket !== true
  );
  fail(ledger.paymentFollowsLegalApproval?.payableWithoutRecordedLegalApproval?.length === payableUnratified.length,
    `the ledger records ${ledger.paymentFollowsLegalApproval?.payableWithoutRecordedLegalApproval?.length} payable route(s) without a recorded counsel ratification against ${payableUnratified.length} present in its own rows`);

  return failures;
}

function closureFailures(ledger) {
  const failures = [];
  const counts = ledger.invariant?.counts ?? {};
  const target = counts.intendedSellablePathways;
  for (const stage of STAGE_ORDER.slice(1)) {
    if (counts[stage] !== target) {
      const shortfall = target - counts[stage];
      failures.push(`${stage}: ${counts[stage]} of ${target} — ${shortfall} intended-sellable pathway(s) do not reach this stage`);
    }
  }
  const payable = ledger.doNotChargeForGuidance?.payableButUndeliverable ?? [];
  if (payable.length > 0) {
    failures.push(`do-not-charge-for-guidance: ${payable.length} pathway(s) can take money and cannot deliver an artifact`);
  }
  const unratified = ledger.paymentFollowsLegalApproval?.payableWithoutRecordedLegalApproval ?? [];
  if (unratified.length > 0) {
    failures.push(`payment-follows-legal-approval: ${unratified.length} payable route(s) carry no compiled counsel ratification recording them as packet-capable and payable`);
  }
  const substitutions = ledger.guidanceSubstitution?.tracks ?? [];
  if (substitutions.length > 0) {
    failures.push(`guidance-substitution: ${substitutions.length} track(s) where the participant files a document and is served guidance, a deferral or an exclusion instead of a packet`);
  }
  return failures;
}

// --------------------------------------------------------------------------- run
const treatments = [];
for (const file of fs.readdirSync(path.join(rootDir, TREATMENTS_DIR)).sort()) {
  if (file.startsWith("_") || !file.endsWith(".json")) continue;
  for (const treatment of readJson(`${TREATMENTS_DIR}/${file}`).treatments ?? []) treatments.push(treatment);
}

const documents = {
  ledger: readJson(LEDGER),
  frozen: readJson(FROZEN),
  register: readJson(REGISTER),
  trackLedger: readJson(TRACK_LEDGER),
  treatments
};

if (MUTATIONS) {
  // A verifier that cannot detect a tampered ledger is decoration. Each mutation
  // is a way someone could make the numbers green without closing a pathway.
  const clone = () => JSON.parse(JSON.stringify(documents));
  const mutations = [
    ["a paid pathway silently reclassified to guidance", (d) => {
      const victim = d.ledger.pathways.find((e) => e.category === "paid_packet_intended" && (e.classification?.evidence?.filingEvidence ?? []).length > 0);
      victim.category = "non_filing_guidance";
      victim.openBlockers = [];
    }],
    ["a paid pathway marked closed while it renders nothing", (d) => {
      const victim = d.ledger.pathways.find((e) => e.category === "paid_packet_intended" && e.stages.successfullyRendered !== true);
      victim.openBlockers = [];
    }],
    ["the frozen denominator quietly shrunk", (d) => { d.frozen.pathwayKeys.push("ZZ:invented-pathway"); d.frozen.count += 1; }],
    ["an unsigned reason used to leave the paid denominator", (d) => {
      d.register.reclassifications.push({
        id: "BAD-1", pathwayKey: d.frozen.pathwayKeys[0], previousClassification: "paid_packet_intended",
        newClassification: "non_filing_guidance", reason: "implementation_difficulty",
        evidence: "n/a", authority: "an engineer", decidedOn: "2026-08-19"
      });
    }],
    ["the guidance-substitution list emptied", (d) => { d.ledger.guidanceSubstitution.tracks = []; }],
    ["the closure ledger restated as the 497 denominator", (d) => { d.ledger.denominator.count = 497; }],
    ["a category invented outside the five", (d) => { d.ledger.pathways[0].category = "packet_coming_soon"; }],
    /**
     * Mutated in the direction that can actually fail.
     *
     * This used to empty payableWithoutRecordedLegalApproval, which caught the
     * defect while thirty-nine routes were on that list. The list is empty now
     * — not because payment ran ahead of counsel, but because the compiled
     * profiles carried a stale ratification snapshot and every one of those
     * thirty-nine is ratified_deployable in the ratification registry, which is
     * counsel's own decision. Emptying an empty list changes nothing, so the
     * mutation had stopped testing anything while still reporting "caught".
     *
     * A mutation that cannot fail is worse than no mutation: it is assurance
     * with nothing behind it. So this one now creates the condition the
     * invariant exists to catch — a route that is payable and unratified in the
     * ledger's own rows, and absent from the list that is supposed to name it.
     */
    ["a payable unratified route hidden from the counsel list", (d) => {
      const row = d.ledger.pathways.find((e) => e.category === "paid_packet_intended" && e.stages.publiclyReachableSellable === true);
      if (row) row.stages.legallyApprovedPacket = false;
    }],
    ["the payable-but-undeliverable list emptied", (d) => { d.ledger.doNotChargeForGuidance.payableButUndeliverable = []; }]
  ];
  let undetected = 0;
  for (const [label, mutate] of mutations) {
    const mutated = clone();
    mutate(mutated);
    const caught = governanceFailures(mutated).length > governanceFailures(documents).length;
    console.log(`${caught ? "caught  " : "MISSED  "} ${label}`);
    if (!caught) undetected += 1;
  }
  if (undetected > 0) {
    console.error(`\nverify-rcap-sellable-pathway-closure --mutations FAILED — ${undetected} mutation(s) undetected.`);
    process.exit(1);
  }
  console.log(`\nEvery mutation that would fake closure is detected (${mutations.length}/${mutations.length}).`);
  process.exit(0);
}

const governance = governanceFailures(documents);
if (governance.length > 0) {
  console.error(`verify-rcap-sellable-pathway-closure FAILED — ${governance.length} governance problem(s):\n`);
  for (const failure of governance) console.error(` - ${failure}`);
  process.exit(1);
}

const ledger = documents.ledger;
const counts = ledger.invariant.counts;
console.log(`Sellable pathway closure — ${ledger.universe.compiledPathways} compiled pathways across ${ledger.universe.jurisdictions} jurisdictions.`);
console.log(`Denominator (frozen): ${ledger.denominator.count} intended-sellable pathway(s).`);
for (const stage of STAGE_ORDER) console.log(`  ${stage.padEnd(38)} ${counts[stage]}`);
console.log("Governance holds: the denominator is frozen, every pathway carries exactly one evidenced category, no paid pathway left the denominator unsigned, and 497/497 is untouched.");

const closure = closureFailures(ledger);
if (closure.length === 0) {
  console.log("\nThe closure invariant holds. Every intended-sellable pathway produces a working paid packet.");
  process.exit(0);
}

if (GOVERNANCE_ONLY) {
  console.log(`\nClosure gate not run (--governance-only). ${closure.length} closure invariant(s) are open; see ${LEDGER}.`);
  process.exit(0);
}

console.error(`\nverify-rcap-sellable-pathway-closure FAILED — the closure invariant does not hold:\n`);
for (const failure of closure) console.error(` - ${failure}`);
console.error(`\nEvery line above is an open blocker on an open paid pathway. None of them is closable by`);
console.error(`reclassification, by calling guidance a packet, or by charging for guidance.`);
console.error(`Per-pathway detail: ${LEDGER}. Position: docs/record-clearing/sellable-pathway-closure.md`);
process.exit(1);
