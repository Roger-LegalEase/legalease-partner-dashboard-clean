// Where the closure ledger and the legal-authority route layer disagree about
// whether a pathway sells a packet.
//
// Two repository layers answer that question independently:
//
//   The compiled profile's routeMetadata.productRouteType — court_petition,
//   court_motion, administrative_application — which is what
//   generate-rcap-sellable-pathway-closure.mjs reads to set `category`.
//
//   The legal-authority route records in src/lib/legal-authority/routes, which
//   carry outcomeMode and packetFamily under a decision id and a rule id. That
//   layer exists precisely to answer "does the participant file something we
//   sell", and it is the later and more deliberate of the two.
//
// The closure generator consults only the first. Where the second says
// referral, automatic_relief, guidance_status or agency_application and the
// closure ledger still counts the pathway as paid_packet_intended, the pathway
// carries blockers it can never close: a renderer is demanded for a route the
// authority already decided renders nothing.
//
// This register does not resolve that. data/rcap-ledger/sellable-pathway-reclassifications.json
// is explicit that the only way a pathway leaves paid_packet_intended is a
// signed record naming the person who decided, and a reason of
// product_scope_decision requires that person to be Roger. So this prepares the
// evidenced proposals in exactly the shape that register requires and leaves the
// authority and decidedOn fields for the decision owner to fill. Nothing here
// changes a category.
//
// Usage: node scripts/generate-closure-authority-contradictions.mjs [--check]

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CHECK = process.argv.includes("--check");
const OUT_JSON = "data/rcap-ledger/closure-authority-contradictions.json";
const OUT_MD = "docs/record-clearing/CLOSURE_AUTHORITY_CONTRADICTIONS.md";
const ROUTE_DIR = "src/lib/legal-authority/routes";
const RECLASS = "data/rcap-ledger/sellable-pathway-reclassifications.json";

const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(root, rel), "utf8"));
const closure = readJson("data/rcap-ledger/sellable-pathway-closure.json");
const reclassifications = readJson(RECLASS);

const routeByKey = new Map();
for (const file of fs.readdirSync(path.join(root, ROUTE_DIR)).sort()) {
  if (!file.endsWith(".json")) continue;
  const walk = (node) => {
    if (Array.isArray(node)) return node.forEach(walk);
    if (!node || typeof node !== "object") return;
    if (typeof node.routeKey === "string" && node.outcomeMode !== undefined) {
      routeByKey.set(node.routeKey, { sourceFile: `${ROUTE_DIR}/${file}`, ...node });
      return;
    }
    Object.values(node).forEach(walk);
  };
  walk(readJson(`${ROUTE_DIR}/${file}`));
}

/**
 * Outcome modes under which the participant files nothing the product sells,
 * with the reason each maps to in the reclassification register's own
 * vocabulary. Only no_participant_filing is derivable from legal evidence;
 * product_scope_decision is the decision owner's alone and is never proposed
 * here.
 */
const NON_PACKET_MODES = {
  referral: "The route refers the participant elsewhere; it prepares no filing of its own.",
  automatic_relief: "Relief happens by operation of law with no participant filing.",
  guidance_status: "The route reports or verifies a status; nothing is filed.",
  agency_application: "An agency, not a court filing the participant prepares, controls the action."
};

/**
 * The service disposition each outcome mode carries, preserved across the
 * reclassification.
 *
 * The closure vocabulary has one non-packet category, so every proposal below
 * moves to the same one. That is a statement about the paid-packet denominator
 * and nothing else: a referral route is still a referral after it leaves that
 * denominator, and an automatic-relief route is still automatic. Recording the
 * disposition on the row is what stops the move from flattening nine handoffs
 * and two no-filing routes into one undifferentiated bucket.
 */
const SERVICE_DISPOSITION_BY_MODE = {
  referral: "handoff",
  automatic_relief: "process_guidance",
  guidance_status: "process_guidance",
  agency_application: "agency_application"
};

const alreadyReclassified = new Set((reclassifications.reclassifications ?? []).map((r) => r.pathwayKey));

const rows = [];
for (const pathway of closure.pathways ?? []) {
  const route = routeByKey.get(pathway.pathwayKey);
  if (!route || !(route.outcomeMode in NON_PACKET_MODES)) continue;
  if (pathway.category !== "paid_packet_intended") continue;
  // A non-court outcome mode is not by itself a contradiction. Hawaii's
  // § 831-3.2 Attorney General application and Maryland's § 10-103 written
  // request are both agency_application routes that name a packet family, and on
  // both the participant does prepare a document — it is addressed to an agency
  // rather than a court. Proposing no_participant_filing there would be false.
  // The contradiction is the authority naming no packet family at all.
  if (route.packetFamily) continue;

  const blockers = (pathway.openBlockers ?? []).map((b) => b.id);
  rows.push({
    pathwayKey: pathway.pathwayKey,
    jurisdiction: pathway.jurisdiction,
    pathwayLabel: pathway.pathwayLabel,
    closureCategory: pathway.category,
    closureCategoryBasis: pathway.categoryBasis,
    authorityOutcomeMode: route.outcomeMode,
    authorityPacketFamily: route.packetFamily ?? null,
    authorityDecisionId: route.decisionId ?? null,
    authorityRuleId: route.ruleId ?? null,
    authorityNotes: route.notes ?? null,
    authoritySourceFile: route.sourceFile,
    openBlockers: blockers,
    // Blockers that cannot be closed while the categorisation stands, because
    // each demands a packet the authority says this route does not produce.
    unclosableBlockers: blockers.filter((b) =>
      ["renderer_unavailable", "packet_spec_incomplete", "not_paid_product"].includes(b)),
    alreadyReclassified: alreadyReclassified.has(pathway.pathwayKey),
    proposal: {
      id: `PROPOSED-${pathway.jurisdiction}-${pathway.pathwayId}`.toUpperCase().replace(/[^A-Z0-9-]/g, "-"),
      pathwayKey: pathway.pathwayKey,
      previousClassification: "paid_packet_intended",
      newClassification: "non_filing_guidance",
      reason: "no_participant_filing",
      evidence: `${route.sourceFile} records ${pathway.pathwayKey} under ${route.decisionId ?? "an unattributed decision"} / ${route.ruleId ?? "an unattributed rule"} as outcomeMode=${route.outcomeMode} with packetFamily=${JSON.stringify(route.packetFamily ?? null)}, citing ${route.statute ?? "no statute"}. ${NON_PACKET_MODES[route.outcomeMode]}${route.notes ? ` The record's own note: "${route.notes}"` : ""}`,
      authority: null,
      decidedOn: null,
      preservedServiceDisposition: SERVICE_DISPOSITION_BY_MODE[route.outcomeMode],
      preservedOutcomeMode: route.outcomeMode,
      preservationNote: `Leaving paid_packet_intended changes what this route is counted as, not what it does. It remains a ${route.outcomeMode} route serving a ${SERVICE_DISPOSITION_BY_MODE[route.outcomeMode]} outcome, and any consumer that reads the new classification must read this field with it.`
    }
  });
}

const counts = {};
for (const row of rows) counts[row.authorityOutcomeMode] = (counts[row.authorityOutcomeMode] ?? 0) + 1;

const register = {
  schemaVersion: 1,
  generatedBy: "scripts/generate-closure-authority-contradictions.mjs",
  question: "Which pathways does the closure ledger count as paid packets while the legal-authority route layer already decided they sell nothing?",
  governingConstraint: `${RECLASS} states that the only way a pathway leaves paid_packet_intended is a signed record naming the person who decided. These are prepared proposals with authority and decidedOn left null. No category is changed by this generator, and a proposal is not a reclassification.`,
  total: rows.length,
  counts,
  excludedNonCourtRoutesThatStillProduceAPacket: (closure.pathways ?? [])
    .filter((p) => {
      const r = routeByKey.get(p.pathwayKey);
      return r && r.outcomeMode in NON_PACKET_MODES && p.category === "paid_packet_intended" && Boolean(r.packetFamily);
    })
    .map((p) => {
      const r = routeByKey.get(p.pathwayKey);
      return {
        pathwayKey: p.pathwayKey,
        outcomeMode: r.outcomeMode,
        packetFamily: r.packetFamily,
        why: "The route is not a court filing, but the authority names a packet family and the participant prepares it. paid_packet_intended is correct; only the destination is an agency."
      };
    }),
  rows
};

const markdown = renderMarkdown(register);
const serialized = `${JSON.stringify(register, null, 2)}\n`;

if (CHECK) {
  const problems = [];
  if (Object.values(counts).reduce((a, b) => a + b, 0) !== rows.length) problems.push("outcome modes do not sum");
  for (const row of rows) {
    if (!row.proposal.preservedServiceDisposition) {
      problems.push(`${row.pathwayKey} proposes a reclassification without preserving its service disposition`);
    }
    if (row.proposal.preservedOutcomeMode !== row.authorityOutcomeMode) {
      problems.push(`${row.pathwayKey} preserves ${row.proposal.preservedOutcomeMode} but the authority records ${row.authorityOutcomeMode}`);
    }
    if (row.authorityPacketFamily) {
      problems.push(`${row.pathwayKey} is proposed for no_participant_filing while the authority names packet family ${JSON.stringify(row.authorityPacketFamily)}`);
    }
  }
  for (const row of rows) {
    if (row.proposal.authority !== null || row.proposal.decidedOn !== null) {
      problems.push(`${row.pathwayKey}: a proposal carries an authority or a decision date. This generator must never fill those in.`);
    }
  }
  for (const [rel, expected] of [[OUT_JSON, serialized], [OUT_MD, markdown]]) {
    const abs = path.join(root, rel);
    if (!fs.existsSync(abs)) problems.push(`${rel} has not been generated`);
    else if (fs.readFileSync(abs, "utf8") !== expected) problems.push(`${rel} is stale; regenerate it`);
  }
  if (problems.length > 0) {
    console.error("Closure/authority contradiction register failed:");
    for (const p of problems) console.error(`  - ${p}`);
    process.exit(1);
  }
  console.log(`Closure/authority contradictions verified: ${rows.length} pathways.`);
  process.exit(0);
}

fs.mkdirSync(path.join(root, path.dirname(OUT_JSON)), { recursive: true });
fs.writeFileSync(path.join(root, OUT_JSON), serialized);
fs.writeFileSync(path.join(root, OUT_MD), markdown);
console.log(`Wrote ${OUT_JSON} and ${OUT_MD}`);
console.log(`contradicting pathways: ${rows.length}`);
for (const [k, v] of Object.entries(counts).sort((a, b) => b[1] - a[1])) console.log(`  ${k}: ${v}`);

function renderMarkdown(data) {
  const L = [];
  L.push("# Pathways the closure ledger sells and the route authority does not");
  L.push("");
  L.push("**Generated by** `scripts/generate-closure-authority-contradictions.mjs`. Do not edit by hand.");
  L.push("");
  L.push(data.governingConstraint);
  L.push("");
  L.push("| Authority outcome mode | Pathways |");
  L.push("|---|---:|");
  for (const [k, v] of Object.entries(data.counts).sort((a, b) => b[1] - a[1])) L.push(`| ${k} | ${v} |`);
  L.push(`| **TOTAL** | **${data.total}** |`);
  L.push("");
  if (data.excludedNonCourtRoutesThatStillProduceAPacket.length > 0) {
    L.push("## Deliberately not proposed");
    L.push("");
    L.push("These routes are also non-court, and they are **not** contradictions. The authority names a packet family and the participant prepares it; only the destination is an agency rather than a court.");
    L.push("");
    for (const e of data.excludedNonCourtRoutesThatStillProduceAPacket) {
      L.push(`- \`${e.pathwayKey}\` — ${e.outcomeMode}, packet family ${JSON.stringify(e.packetFamily)}`);
    }
    L.push("");
  }
  for (const row of data.rows) {
    L.push(`## \`${row.pathwayKey}\``);
    L.push("");
    L.push(`- **Closure says**: ${row.closureCategory} — ${row.closureCategoryBasis}`);
    L.push(`- **Route authority says**: outcomeMode ${row.authorityOutcomeMode}, packetFamily ${JSON.stringify(row.authorityPacketFamily)} (${row.authorityDecisionId ?? "unattributed"} / ${row.authorityRuleId ?? "unattributed"})`);
    if (row.authorityNotes) L.push(`- **The record's own note**: ${row.authorityNotes}`);
    L.push(`- **Open blockers**: ${row.openBlockers.join(", ") || "none"}`);
    if (row.unclosableBlockers.length > 0) {
      L.push(`- **Cannot close while the categorisation stands**: ${row.unclosableBlockers.join(", ")} — each demands a packet the authority says this route does not produce.`);
    }
    L.push(`- **Service disposition preserved**: ${row.proposal.preservedServiceDisposition} (outcome mode ${row.proposal.preservedOutcomeMode}). ${row.proposal.preservationNote}`);
    L.push("- **Prepared proposal** (authority and decidedOn are for the decision owner):");
    L.push("");
    L.push("```json");
    L.push(JSON.stringify(row.proposal, null, 2));
    L.push("```");
    L.push("");
  }
  return `${L.join("\n")}\n`;
}
