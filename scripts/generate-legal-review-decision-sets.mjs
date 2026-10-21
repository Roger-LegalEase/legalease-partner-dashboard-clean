// Collapses legal_review_pending pathway rows into distinct legal decision sets.
//
// 221 pathway rows is not 221 legal assignments. This reads the registers that
// already hold decisions -- the authorization queue, the owner legal decision,
// the adoption record and the paid-pathway legal join -- and classifies every
// row by what is actually missing, so counsel is never asked to repeat a
// decision an adopted repository authority already supports.
//
// Usage:
//   node scripts/generate-legal-review-decision-sets.mjs           # write
//   node scripts/generate-legal-review-decision-sets.mjs --check   # verify

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readOwnerLegalDecision } from "./lib/rcap-owner-legal-decision.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CHECK = process.argv.includes("--check");

const OUT_JSON = "data/rcap-ledger/legal-review-decision-sets.json";
const OUT_MD = "docs/record-clearing/LEGAL_REVIEW_DECISION_SETS.md";

const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(root, rel), "utf8"));

const closure = readJson("data/rcap-ledger/sellable-pathway-closure.json");
const legalJoin = readJson("data/rcap-ledger/paid-pathway-legal-join.json");
const ownerDecision = readOwnerLegalDecision();

const joinByKey = new Map(legalJoin.pathways.map((p) => [p.pathwayKey, p]));

// The rows in question: every pathway the closure ledger holds open on
// legal_review_pending.
const pendingRows = closure.pathways.filter(
  (p) => (p.openBlockers ?? []).some((b) => b.id === "legal_review_pending")
);

/**
 * One row, one classification, by what is actually missing.
 *
 * The join already answers the only question that matters here: can an owner
 * decision reach this pathway at all? A pathway with no reachable packet family
 * cannot be legally reviewed, because there is nothing to review. Sending that
 * to counsel is not caution, it is noise that buries the rows where a decision
 * would change something.
 */
function classifyRow(row) {
  const join = joinByKey.get(row.pathwayKey);
  const reconfirmation = (row.openBlockers ?? []).some((b) => b.id === "legal_reconfirmation");
  if (!join) {
    return {
      classification: "TRUE_INITIAL_LEGAL_REVIEW_REQUIRED",
      reason: "The pathway is not present in the legal join, so no adopted authority has been evaluated against it."
    };
  }

  const approved = join.legalStatus === "approved_by_decision_owner";

  // The one genuinely legal ask in the set. The approval exists and reaches the
  // family, and counsel ratification of the route is not current. Reconfirming a
  // route whose ratification has lapsed is not a duplicate of the original
  // review; it is the only thing here that a lawyer has to answer.
  if (approved && join.familyBridgePresent && reconfirmation) {
    return {
      classification: "LEGAL_RECONFIRMATION_REQUIRED",
      reason: "The decision owner's approval reaches this pathway's packet family, but counsel ratification of the route is not current."
    };
  }

  if (approved && join.familyBridgePresent && join.onlyPathwayProjectionMissing) {
    return {
      classification: "EXISTING_APPROVAL_NOT_LINKED",
      reason: "The decision owner's approval already reaches this pathway's packet family. Only the projection of that approval onto the pathway row is missing, so the closure ledger still reports the gate as open."
    };
  }

  if (approved && !join.familyBridgePresent) {
    return {
      classification: "IMPLEMENTATION_CONFLICTS_WITH_APPROVED_DECISION",
      reason: "The decision owner has approved a packet corpus, but this pathway does not reach a packet family or track, so the approved decision cannot attach to it. The conflict is in the registry wiring, not in the decision."
    };
  }

  // Not approved, and no family bridge. There is nothing for counsel to look at.
  return {
    classification: "ENGINEERING_BLOCKER_MISCLASSIFIED_AS_LEGAL",
    reason: join.legalStatement
      || "No packet family is reachable from this pathway, so no owner decision reaches it either."
  };
}

const classified = pendingRows.map((row) => {
  const join = joinByKey.get(row.pathwayKey) ?? null;
  const { classification, reason } = classifyRow(row);
  return {
    pathwayKey: row.pathwayKey,
    jurisdiction: row.jurisdiction,
    pathwayId: row.pathwayId,
    pathwayLabel: row.pathwayLabel,
    routeKind: row.route?.routeKind ?? null,
    rendererKind: row.route?.rendererKind ?? null,
    stages: row.stages,
    registryTrackIds: join?.registryTrackIds ?? [],
    packetFamilies: join?.packetFamilies ?? [],
    legalStatus: join?.legalStatus ?? null,
    disposition: join?.disposition ?? null,
    namedLegalActionRequired: Boolean(join?.namedLegalActionRequired),
    familyBridgePresent: Boolean(join?.familyBridgePresent),
    onlyPathwayProjectionMissing: Boolean(join?.onlyPathwayProjectionMissing),
    classification,
    reason
  };
});

// A decision set is a group of rows that share ONE decision. Rows that need no
// decision at all still group, because the engineering action they share is also
// one action -- but they are never counted as a legal assignment.
const DECISION_SETS = [
  {
    id: "LRD-00",
    classification: "LEGAL_RECONFIRMATION_REQUIRED",
    title: "Reconfirm counsel ratification for routes whose ratification is no longer current",
    legalOwner: "Lawrence Blackmon",
    engineeringOwner: "None until the reconfirmation lands.",
    exactUnresolvedQuestion:
      "Is counsel's ratification of each of these routes still current against the route contract, the required facts and the official source as they stand today?",
    whyExistingAuthorityDoesNotResolveIt:
      "The 2026-08-19 owner decision approved the completed output as it stood then, and EXT-ADOPT-01 adopted the legal design in August. Neither says the ratification of these specific routes is current now, and currency is exactly what is being asked.",
    proposedOptions: [
      "Reconfirm the ratification as current, unchanged.",
      "Reconfirm with a named amendment to the route contract or required facts.",
      "Withdraw ratification and route the pathway to a non-packet service outcome."
    ],
    recommendedProductDecision:
      "Reconfirm as current where the official source and route contract have not moved since ratification, and name an amendment where they have. This is the only set here that should reach the legal team at all.",
    engineeringDeltaAfterDecision:
      "Record the reconfirmation in the authorization queue and regenerate the join and the closure ledger. No packet or renderer work follows from a clean reconfirmation."
  },
  {
    id: "LRD-01",
    classification: "EXISTING_APPROVAL_NOT_LINKED",
    title: "Project the existing owner approval onto the pathway rows it already covers",
    legalOwner: "None. No legal decision is required.",
    engineeringOwner: "RCAP ledger generation",
    exactUnresolvedQuestion:
      "None. The question was answered on 2026-08-19 and the answer simply does not reach the pathway projection.",
    whyExistingAuthorityDoesNotResolveIt:
      "It does resolve it. The closure ledger computes legal_review_pending from a per-pathway projection that the legal join already supersedes, and the two generators disagree.",
    proposedOptions: [
      "Project legalStatus from paid-pathway-legal-join.json into the closure ledger's legallyApprovedPacket stage.",
      "Leave the two ledgers disagreeing and continue reporting an approved corpus as unreviewed."
    ],
    recommendedProductDecision:
      "Project the join's legalStatus into the closure ledger. One register already holds the decision; the other should read it rather than recompute it.",
    engineeringDeltaAfterDecision:
      "One change in the closure-ledger generator, plus a regeneration. No legal artifact, no schema change."
  },
  {
    id: "LRD-02",
    classification: "IMPLEMENTATION_CONFLICTS_WITH_APPROVED_DECISION",
    title: "Wire approved pathways to a packet family or track",
    legalOwner: "None yet. Counsel is reached only if the wiring exposes a family outside the approved corpus.",
    engineeringOwner: "RCAP registry and factory",
    exactUnresolvedQuestion:
      "Which packet family does each of these approved pathways resolve to?",
    whyExistingAuthorityDoesNotResolveIt:
      "The owner's decision approves families, and these pathways reach none. The approval is real; the pathway cannot receive it until the registry connects the two.",
    proposedOptions: [
      "Bind each pathway to an existing approved family in the track registry.",
      "Record the pathway as non-packet service where no family is appropriate."
    ],
    recommendedProductDecision:
      "Bind to an existing approved family where one fits; otherwise reclassify the pathway as a non-packet service outcome rather than inventing a family.",
    engineeringDeltaAfterDecision:
      "Track and family registry entries per pathway, then regenerate the join and the closure ledger."
  },
  {
    id: "LRD-03",
    classification: "ENGINEERING_BLOCKER_MISCLASSIFIED_AS_LEGAL",
    title: "Build or bind a packet family before any legal question exists",
    legalOwner: "None. There is no artifact to review.",
    engineeringOwner: "RCAP packet factory",
    exactUnresolvedQuestion:
      "None that counsel can answer. No packet family or track is reachable from these pathways, so there is no packet, no component set and no output for anyone to approve.",
    whyExistingAuthorityDoesNotResolveIt:
      "No authority can. Counsel cannot approve a packet that does not exist, and asking would produce either a refusal or an approval of nothing.",
    proposedOptions: [
      "Build the packet family and then submit the completed output for review under the existing standing adoption.",
      "Record the pathway as a non-packet service outcome, which needs no packet review."
    ],
    recommendedProductDecision:
      "Do not send these to counsel. Build or bind the family first; the existing standing adoption then covers the completed output on the same terms it already covers 72 pathways.",
    engineeringDeltaAfterDecision:
      "Packet family construction or a non-packet service disposition per pathway."
  }
];

const bySet = new Map(DECISION_SETS.map((set) => [set.classification, { ...set, rows: [] }]));
for (const row of classified) {
  const set = bySet.get(row.classification);
  if (!set) throw new Error(`no decision set defined for classification ${row.classification}`);
  set.rows.push(row);
}

const decisionSets = [...bySet.values()]
  .filter((set) => set.rows.length > 0)
  .map((set) => {
    const jurisdictions = [...new Set(set.rows.map((r) => r.jurisdiction))].sort();
    const packetGenerationDisabled = set.rows.filter((r) => !r.stages?.successfullyRendered).length;
    return {
      decisionId: set.id,
      classification: set.classification,
      title: set.title,
      jurisdictions,
      jurisdictionCount: jurisdictions.length,
      affectedPathwayRows: set.rows.length,
      affectedVariants: [...new Set(set.rows.map((r) => `${r.routeKind}/${r.rendererKind ?? "none"}`))].sort(),
      currentLegalReview: set.rows[0]?.legalStatus ?? null,
      currentPrimaryAuthority: ownerDecision.approved
        ? "auth-2026-08-19-owner-legal-approval-completed-output (approved, authorized) plus EXT-ADOPT-01 standing external counsel adoption of 2026-08-08"
        : "none recorded",
      currentProductTreatment: "Packet generation and payment are closed for every row in this set.",
      exactUnresolvedQuestion: set.exactUnresolvedQuestion,
      whyExistingAuthorityDoesNotResolveIt: set.whyExistingAuthorityDoesNotResolveIt,
      proposedOptions: set.proposedOptions,
      recommendedProductDecision: set.recommendedProductDecision,
      legalOwner: set.legalOwner,
      engineeringOwner: set.engineeringOwner,
      engineeringDeltaAfterDecision: set.engineeringDeltaAfterDecision,
      packetGenerationCurrentlyDisabled: `${packetGenerationDisabled} of ${set.rows.length} rows do not render today; payment is closed for all ${set.rows.length}.`,
      paymentCurrentlyDisabled: `All ${set.rows.length} rows.`,
      duplicateDecisionsCollapsed: set.rows.length - 1,
      requiresLegalAssignment: set.classification === "LEGAL_RECONFIRMATION_REQUIRED",
      pathwayKeys: set.rows.map((r) => r.pathwayKey).sort()
    };
  });

const counts = {};
for (const row of classified) counts[row.classification] = (counts[row.classification] ?? 0) + 1;

const legalAssignments = decisionSets.filter((set) => set.requiresLegalAssignment);

const register = {
  schemaVersion: 1,
  generatedBy: "scripts/generate-legal-review-decision-sets.mjs",
  question: "The closure ledger holds 221 paid pathway rows open on legal_review_pending. How many distinct legal decisions is that?",
  createsApproval: false,
  sources: {
    closureLedger: "data/rcap-ledger/sellable-pathway-closure.json",
    legalJoin: "data/rcap-ledger/paid-pathway-legal-join.json",
    authorizationQueue: "data/rcap-authorization-queue.json",
    standingAdoption: "data/record-clearing/template-families/EXT-ADOPT-01-standing-external-counsel-adoption.json"
  },
  ownerLegalDecision: {
    approved: ownerDecision.approved,
    reason: ownerDecision.reason ?? null,
    recordIds: (ownerDecision.records ?? []).map((r) => r.id)
  },
  pathwayRowsReviewed: classified.length,
  classificationCounts: counts,
  distinctDecisionSets: decisionSets.length,
  duplicateRowsCollapsed: classified.length - decisionSets.length,
  exactLegalTeamAssignments: legalAssignments.length,
  decisionSets,
  rows: classified
};

const serialized = `${JSON.stringify(register, null, 2)}\n`;
const markdown = renderMarkdown(register);

if (CHECK) {
  const problems = [];
  const sum = Object.values(counts).reduce((a, b) => a + b, 0);
  if (sum !== classified.length) problems.push(`classifications sum to ${sum}, not ${classified.length}`);
  const setRowTotal = decisionSets.reduce((a, s) => a + s.affectedPathwayRows, 0);
  if (setRowTotal !== classified.length) problems.push(`decision sets cover ${setRowTotal} rows, not ${classified.length}`);
  const assigned = new Set(decisionSets.flatMap((s) => s.pathwayKeys));
  if (assigned.size !== classified.length) problems.push(`${classified.length - assigned.size} rows are assigned to more than one decision set`);
  for (const [rel, expected] of [[OUT_JSON, serialized], [OUT_MD, markdown]]) {
    const abs = path.join(root, rel);
    if (!fs.existsSync(abs)) problems.push(`${rel} has not been generated`);
    else if (fs.readFileSync(abs, "utf8") !== expected) problems.push(`${rel} is stale; regenerate it`);
  }
  if (problems.length > 0) {
    console.error("Legal review decision-set register failed:");
    for (const problem of problems) console.error(`  - ${problem}`);
    process.exit(1);
  }
  console.log(`Legal review decision sets verified: ${classified.length} rows, ${decisionSets.length} sets, ${legalAssignments.length} legal assignments.`);
  process.exit(0);
}

fs.mkdirSync(path.join(root, path.dirname(OUT_JSON)), { recursive: true });
fs.mkdirSync(path.join(root, path.dirname(OUT_MD)), { recursive: true });
fs.writeFileSync(path.join(root, OUT_JSON), serialized);
fs.writeFileSync(path.join(root, OUT_MD), markdown);

console.log(`Wrote ${OUT_JSON} and ${OUT_MD}`);
console.log(`Rows reviewed: ${classified.length}`);
for (const [key, value] of Object.entries(counts)) console.log(`  ${key}: ${value}`);
console.log(`Distinct decision sets: ${decisionSets.length}`);
console.log(`Exact legal team assignments: ${legalAssignments.length}`);

function renderMarkdown(data) {
  const lines = [];
  lines.push("# Legal review pending — decision-set reconciliation");
  lines.push("");
  lines.push("**Generated by** `scripts/generate-legal-review-decision-sets.mjs`. Do not edit by hand.");
  lines.push("");
  lines.push(`The closure ledger holds **${data.pathwayRowsReviewed} paid pathway rows** open on`);
  lines.push("`legal_review_pending`. That is not the number of legal decisions. This register");
  lines.push("collapses those rows against the registers that already hold decisions.");
  lines.push("");
  lines.push(`**Exact legal team assignments: ${data.exactLegalTeamAssignments}.**`);
  lines.push("");
  lines.push("## Classification");
  lines.push("");
  lines.push("| Classification | Rows |");
  lines.push("|---|---:|");
  for (const [key, value] of Object.entries(data.classificationCounts)) lines.push(`| ${key} | ${value} |`);
  lines.push(`| **TOTAL** | **${data.pathwayRowsReviewed}** |`);
  lines.push("");
  lines.push("## Controlling authority already on record");
  lines.push("");
  lines.push(`- Owner legal decision approved: **${data.ownerLegalDecision.approved}**`);
  for (const id of data.ownerLegalDecision.recordIds) lines.push(`- \`${id}\``);
  lines.push("- `EXT-ADOPT-01` standing external counsel adoption, 2026-08-08");
  lines.push("");
  lines.push("## Decision sets");
  lines.push("");
  for (const set of data.decisionSets) {
    lines.push(`### ${set.decisionId} — ${set.title}`);
    lines.push("");
    lines.push(`- **CLASSIFICATION:** ${set.classification}`);
    lines.push(`- **JURISDICTION:** ${set.jurisdictionCount} — ${set.jurisdictions.join(" ")}`);
    lines.push(`- **ROUTES / AFFECTED VARIANTS:** ${set.affectedVariants.join(", ")}`);
    lines.push(`- **AFFECTED PATHWAY ROWS:** ${set.affectedPathwayRows}`);
    lines.push(`- **CURRENT LEGAL REVIEW:** ${set.currentLegalReview}`);
    lines.push(`- **CURRENT PRIMARY AUTHORITY:** ${set.currentPrimaryAuthority}`);
    lines.push(`- **CURRENT PRODUCT TREATMENT:** ${set.currentProductTreatment}`);
    lines.push(`- **EXACT UNRESOLVED QUESTION:** ${set.exactUnresolvedQuestion}`);
    lines.push(`- **WHY EXISTING AUTHORITY DOES NOT RESOLVE IT:** ${set.whyExistingAuthorityDoesNotResolveIt}`);
    lines.push(`- **PROPOSED OPTIONS:** ${set.proposedOptions.map((o, i) => `(${i + 1}) ${o}`).join(" ")}`);
    lines.push(`- **RECOMMENDED PRODUCT DECISION:** ${set.recommendedProductDecision}`);
    lines.push(`- **LEGAL OWNER:** ${set.legalOwner}`);
    lines.push(`- **ENGINEERING OWNER:** ${set.engineeringOwner}`);
    lines.push(`- **ENGINEERING DELTA AFTER DECISION:** ${set.engineeringDeltaAfterDecision}`);
    lines.push(`- **PACKET GENERATION CURRENTLY DISABLED:** ${set.packetGenerationCurrentlyDisabled}`);
    lines.push(`- **PAYMENT CURRENTLY DISABLED:** ${set.paymentCurrentlyDisabled}`);
    lines.push(`- **DUPLICATE DECISIONS COLLAPSED:** ${set.duplicateDecisionsCollapsed}`);
    lines.push("");
  }
  lines.push("## Every row, with its classification");
  lines.push("");
  lines.push("| Pathway | Route | Classification |");
  lines.push("|---|---|---|");
  for (const row of data.rows) {
    lines.push(`| \`${row.pathwayKey}\` | ${row.routeKind} | ${row.classification} |`);
  }
  lines.push("");
  return `${lines.join("\n")}\n`;
}
