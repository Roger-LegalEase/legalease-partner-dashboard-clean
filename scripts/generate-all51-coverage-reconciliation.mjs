// Exact 51-jurisdiction coverage reconciliation.
//
// Track B's first action. Every jurisdiction is classified exactly once, from
// repository evidence rather than narrative, and the classifications must total
// 51 with no jurisdiction missing and none counted twice.
//
// The rule this exists to enforce: a jurisdiction is NOT complete because a
// profile exists, a source PDF exists, a route appears in a manifest, a branch
// contains work, the jurisdiction is marked live, or screening returns a result.
// Completion is measured against the closure ledger's stage chain and the
// operational gates, which is the same denominator the launch graph uses.
//
// Usage:
//   node scripts/generate-all51-coverage-reconciliation.mjs           # write
//   node scripts/generate-all51-coverage-reconciliation.mjs --check   # verify

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CHECK = process.argv.includes("--check");

const OUT_JSON = "data/rcap-all50/all51-coverage-reconciliation.json";
const OUT_MD = "docs/record-clearing/ALL51_COVERAGE_RECONCILIATION.md";

const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(root, rel), "utf8"));

const closure = readJson("data/rcap-ledger/sellable-pathway-closure.json");
const launchGraph = readJson("data/rcap-ledger/launch-graph.json");
const buildManifest = readJson("data/rcap-all50/all-state-build-manifest.json");

const PROFILE_DIR = "src/lib/rcap-engine/compiled/profiles";
const profileFiles = fs.readdirSync(path.join(root, PROFILE_DIR)).filter((f) => f.endsWith(".json"));

// The controlling denominator: 50 states plus the District of Columbia.
const JURISDICTIONS = profileFiles.map((file) => ({
  code: file.slice(0, 2),
  slug: file.slice(3, -5),
  file: `${PROFILE_DIR}/${file}`
})).sort((a, b) => a.code.localeCompare(b.code));

// Preserved live legacy generators. Their presence is a fact about the product,
// not evidence that the jurisdiction's chain is closed.
const LEGACY_GENERATORS = new Set(["MS", "IL", "DC", "PA", "TX"]);

// The seven stages the closure ledger tracks for a paid packet pathway, in the
// order they have to hold.
const STAGES = [
  "intendedSellable",
  "publiclyReachableSellable",
  "authoritativePacketReady",
  "packetSpecComplete",
  "technicallyApprovedPacket",
  "legallyApprovedPacket",
  "successfullyRendered"
];

const byJurisdiction = new Map(JURISDICTIONS.map((j) => [j.code, {
  ...j,
  pathways: [],
  categories: {},
  paidIntended: 0,
  stageCounts: Object.fromEntries(STAGES.map((s) => [s, 0])),
  rendered: 0,
  paymentAllowed: 0,
  blockers: new Map()
}]));

for (const pathway of closure.pathways) {
  const entry = byJurisdiction.get(pathway.jurisdiction);
  if (!entry) throw new Error(`closure ledger names a jurisdiction with no profile: ${pathway.jurisdiction}`);
  entry.pathways.push(pathway);
  entry.categories[pathway.category] = (entry.categories[pathway.category] ?? 0) + 1;
  if (pathway.category !== "paid_packet_intended") continue;

  entry.paidIntended += 1;
  for (const stage of STAGES) if (pathway.stages?.[stage]) entry.stageCounts[stage] += 1;
  if (pathway.render?.rendered) entry.rendered += 1;
  if (pathway.routeMetadata?.checkoutEligibility === "eligible"
    && pathway.routeMetadata?.paidRouteBlocker === "none"
    && pathway.stages?.legallyApprovedPacket) {
    entry.paymentAllowed += 1;
  }
  for (const blocker of pathway.openBlockers ?? []) {
    const current = entry.blockers.get(blocker.id) ?? { id: blocker.id, severity: blocker.severity, statement: blocker.statement, count: 0 };
    current.count += 1;
    entry.blockers.set(blocker.id, current);
  }
}

const manifestByCode = new Map(buildManifest.states.map((s) => [s.code, s]));

// Unmerged lineages carrying reviewed per-jurisdiction implementation the
// controlling branch does not have. The jurisdiction lists come from the
// tranche manifests on the branch itself, not from a description of it.
const BRANCH_WORK = readJson("data/rcap-all50/all51-branch-port-evidence.json");
const branchWorkByCode = new Map(Object.entries(BRANCH_WORK.jurisdictions));

// The launch graph is the authority on operational sellability, and it counts
// zero. Nothing below may claim acceptance while that holds.
const OPERATIONALLY_SELLABLE = launchGraph.counters.operationallySellable > 0;
const HOSTED_ACCEPTED = new Set(BRANCH_WORK.hostedAcceptedJurisdictions ?? []);

// Blockers that only a named owner can clear. Everything else is engineering
// work, and a jurisdiction holding one of those is not "blocked" -- it is
// unbuilt, and calling it blocked would hide work behind a signature.
const OWNER_DECISION_BLOCKERS = new Set([
  "legal_review_pending",
  "legal_reconfirmation",
  "legal_action_required"
]);

const rows = [];
for (const entry of byJurisdiction.values()) {
  const profile = readJson(entry.file);
  const manifest = manifestByCode.get(entry.code) ?? null;
  const paid = entry.pathways.filter((p) => p.category === "paid_packet_intended");
  const nonPaid = entry.pathways.filter((p) => p.category !== "paid_packet_intended");

  const fullyClosed = paid.filter((p) => STAGES.every((s) => p.stages?.[s]));
  const blockers = [...entry.blockers.values()].sort((a, b) => b.count - a.count);

  const classification = classify({
    jurisdiction: entry.code,
    paidIntended: entry.paidIntended,
    fullyClosed: fullyClosed.length,
    blockers,
    operationallySellable: OPERATIONALLY_SELLABLE,
    hostedAccepted: HOSTED_ACCEPTED.has(entry.code),
    branchWork: branchWorkByCode.get(entry.code) ?? null
  });

  rows.push({
    jurisdiction: entry.code,
    slug: entry.slug,
    name: manifest?.name ?? entry.slug,
    profile: {
      path: entry.file,
      version: profile.profileVersion ?? profile.version ?? null,
      pathwayCount: Array.isArray(profile.pathways) ? profile.pathways.length : null
    },
    buildManifestStatus: manifest?.buildStatus ?? null,
    reviewStatuses: manifest?.reviewStatuses ?? null,
    legacyGenerator: LEGACY_GENERATORS.has(entry.code),
    pathways: {
      total: entry.pathways.length,
      byCategory: entry.categories,
      paidIntended: entry.paidIntended,
      nonPacketService: nonPaid.length
    },
    stages: entry.stageCounts,
    renderedPaidPathways: entry.rendered,
    paymentAllowedPathways: entry.paymentAllowed,
    fullyClosedPaidPathways: fullyClosed.length,
    openBlockers: blockers,
    branchWork: branchWorkByCode.get(entry.code) ?? null,
    hostedAccepted: HOSTED_ACCEPTED.has(entry.code),
    classification: classification.classification,
    classificationBasis: classification.basis,
    smallestRemainingDelta: classification.delta
  });
}

rows.sort((a, b) => a.jurisdiction.localeCompare(b.jurisdiction));

/**
 * One jurisdiction, one classification. The order of these tests is the
 * precedence, and every branch returns, so a jurisdiction cannot land in two.
 */
function classify({ jurisdiction, paidIntended, fullyClosed, blockers, operationallySellable, hostedAccepted, branchWork }) {
  if (paidIntended === 0) {
    return {
      classification: "COMPLETE_NON_PACKET_SERVICE",
      basis: "No participant-filed packet route is adopted here. Every pathway is guidance, automatic relief, an agency process, or out of product scope.",
      delta: "Confirm the non-packet service disposition text is complete for every pathway."
    };
  }

  // Acceptance is not the same as a closed chain. The closure ledger's seven
  // stages are necessary; the launch graph's nine operational gates and hosted
  // generation are the rest of it. A jurisdiction whose chain closes but which
  // has never generated a packet on a hosted environment has not been accepted.
  if (fullyClosed === paidIntended && operationallySellable && hostedAccepted) {
    return {
      classification: "INTEGRATED_AND_ACCEPTED",
      basis: "Every adopted participant-filed route closes all seven stages, satisfies the operational predicate, and has hosted generation evidence.",
      delta: "None."
    };
  }

  // Reviewed work already exists on an unmerged lineage. Port the delta; do not
  // rebuild legal, form, mapping or renderer work that someone already did.
  if (branchWork) {
    return {
      classification: "EXISTING_BRANCH_TO_PORT",
      basis: `Reviewed implementation for this jurisdiction exists on ${branchWork.branch} at ${branchWork.commit} (${branchWork.evidence}), and the controlling branch does not carry it.`,
      delta: `Port the reviewed ${branchWork.artifacts} for ${jurisdiction} from ${branchWork.branch}; do not merge the branch wholesale.`
    };
  }

  const ids = new Set(blockers.map((b) => b.id));
  const ownerOnly = ids.size > 0 && [...ids].every((id) => OWNER_DECISION_BLOCKERS.has(id));
  if (ownerOnly) {
    return {
      classification: "BLOCKED_EXACTLY",
      basis: "Every open blocker is an owner decision. The technical chain resolves; no engineering work is outstanding.",
      delta: "Counsel ratification recording each adopted route as packet-capable and payable."
    };
  }
  if (ids.size === 0 && fullyClosed === paidIntended) {
    return {
      classification: "BLOCKED_EXACTLY",
      basis: "The chain closes and no blocker is open. What is missing is hosted generation acceptance, which depends on Track A Phase 8 rather than on any work in this jurisdiction.",
      delta: "Execute hosted generation acceptance for this jurisdiction once the participant platform reaches controlled hosted acceptance."
    };
  }

  return {
    classification: "REMAINING_TO_BUILD",
    basis: `${paidIntended - fullyClosed} of ${paidIntended} adopted participant-filed routes have an unmet engineering gate.`,
    delta: blockers.length > 0
      ? blockers.map((b) => `${b.id} (${b.count})`).join("; ")
      : "Close the remaining stages in the closure chain."
  };
}

const counts = {};
for (const row of rows) counts[row.classification] = (counts[row.classification] ?? 0) + 1;

const seen = new Map();
for (const row of rows) seen.set(row.jurisdiction, (seen.get(row.jurisdiction) ?? 0) + 1);
const duplicated = [...seen.entries()].filter(([, n]) => n > 1).map(([code]) => code);
const expected = new Set(JURISDICTIONS.map((j) => j.code));
const missing = [...expected].filter((code) => !seen.has(code));

const reconciliation = {
  schemaVersion: 1,
  generatedBy: "scripts/generate-all51-coverage-reconciliation.mjs",
  denominator: {
    rule: "50 states plus the District of Columbia",
    expected: 51,
    actual: rows.length
  },
  sources: {
    closureLedger: "data/rcap-ledger/sellable-pathway-closure.json",
    launchGraph: "data/rcap-ledger/launch-graph.json",
    buildManifest: "data/rcap-all50/all-state-build-manifest.json",
    compiledProfiles: PROFILE_DIR
  },
  launchGraphCounters: launchGraph.counters,
  unmetOperationalGates: launchGraph.unmetOperationalGates,
  classificationCounts: counts,
  total: rows.length,
  missingJurisdictions: missing,
  duplicatedJurisdictions: duplicated,
  jurisdictions: rows
};

const markdown = renderMarkdown(reconciliation);

if (CHECK) {
  const problems = [];
  if (reconciliation.total !== 51) problems.push(`total is ${reconciliation.total}, not 51`);
  if (missing.length > 0) problems.push(`missing jurisdictions: ${missing.join(", ")}`);
  if (duplicated.length > 0) problems.push(`duplicated jurisdictions: ${duplicated.join(", ")}`);
  const sum = Object.values(counts).reduce((a, b) => a + b, 0);
  if (sum !== 51) problems.push(`classifications sum to ${sum}, not 51`);
  for (const rel of [OUT_JSON, OUT_MD]) {
    if (!fs.existsSync(path.join(root, rel))) problems.push(`${rel} has not been generated`);
  }
  if (fs.existsSync(path.join(root, OUT_JSON))) {
    const onDisk = fs.readFileSync(path.join(root, OUT_JSON), "utf8");
    if (onDisk !== `${JSON.stringify(reconciliation, null, 2)}\n`) problems.push(`${OUT_JSON} is stale; regenerate it`);
  }
  if (problems.length > 0) {
    console.error("All-51 coverage reconciliation failed:");
    for (const problem of problems) console.error(`  - ${problem}`);
    process.exit(1);
  }
  console.log(`All-51 coverage reconciliation verified: ${reconciliation.total} jurisdictions, 0 missing, 0 duplicated.`);
  process.exit(0);
}

fs.mkdirSync(path.join(root, path.dirname(OUT_JSON)), { recursive: true });
fs.mkdirSync(path.join(root, path.dirname(OUT_MD)), { recursive: true });
fs.writeFileSync(path.join(root, OUT_JSON), `${JSON.stringify(reconciliation, null, 2)}\n`);
fs.writeFileSync(path.join(root, OUT_MD), markdown);

console.log(`Wrote ${OUT_JSON} and ${OUT_MD}`);
console.log(`Total ${reconciliation.total} | missing ${missing.length} | duplicated ${duplicated.length}`);
for (const [key, value] of Object.entries(counts)) console.log(`  ${key}: ${value}`);

function renderMarkdown(data) {
  const lines = [];
  lines.push("# All-51 jurisdiction coverage reconciliation");
  lines.push("");
  lines.push("**Generated by** `scripts/generate-all51-coverage-reconciliation.mjs`. Do not edit by hand.");
  lines.push("");
  lines.push("The controlling denominator is 50 states plus the District of Columbia: 51.");
  lines.push("Every jurisdiction is classified exactly once.");
  lines.push("");
  lines.push("A jurisdiction is **not** counted complete because a profile exists, a source");
  lines.push("PDF exists, a route appears in a manifest, a branch contains work, the");
  lines.push("jurisdiction is marked live, or screening returns a result. Completion is");
  lines.push("measured against the closure ledger's seven-stage chain.");
  lines.push("");
  lines.push("## Totals");
  lines.push("");
  lines.push("| Classification | Jurisdictions |");
  lines.push("|---|---|");
  for (const [key, value] of Object.entries(data.classificationCounts)) lines.push(`| ${key} | ${value} |`);
  lines.push(`| **TOTAL** | **${data.total}** |`);
  lines.push(`| MISSING | ${data.missingJurisdictions.length} |`);
  lines.push(`| DUPLICATED | ${data.duplicatedJurisdictions.length} |`);
  lines.push("");
  lines.push("## Operational gates still unmet, across the whole denominator");
  lines.push("");
  lines.push("| Gate | Pathways failing it |");
  lines.push("|---|---|");
  for (const [gate, count] of Object.entries(data.unmetOperationalGates)) lines.push(`| ${gate} | ${count} |`);
  lines.push("");
  lines.push("## Per jurisdiction");
  lines.push("");
  lines.push("| Code | Name | Classification | Paid routes | Fully closed | Rendered | Legally approved | Open blockers |");
  lines.push("|---|---|---|---:|---:|---:|---:|---|");
  for (const row of data.jurisdictions) {
    lines.push(`| ${row.jurisdiction} | ${row.name} | ${row.classification} | ${row.pathways.paidIntended} | `
      + `${row.fullyClosedPaidPathways} | ${row.renderedPaidPathways} | ${row.stages.legallyApprovedPacket} | `
      + `${row.openBlockers.map((b) => `${b.id}×${b.count}`).join(", ") || "none"} |`);
  }
  lines.push("");
  lines.push("## Smallest remaining delta, per jurisdiction");
  lines.push("");
  for (const row of data.jurisdictions) {
    lines.push(`- **${row.jurisdiction} ${row.name}** — ${row.classification}. ${row.classificationBasis} _Delta:_ ${row.smallestRemainingDelta}`);
  }
  lines.push("");
  return `${lines.join("\n")}\n`;
}
