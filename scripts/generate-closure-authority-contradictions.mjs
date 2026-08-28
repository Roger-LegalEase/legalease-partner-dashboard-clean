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
 * The service disposition each outcome mode carries by default. A row may name
 * a more specific one where the mechanism demands it.
 */
const SERVICE_DISPOSITION_BY_MODE = {
  referral: "handoff",
  automatic_relief: "automatic_guidance",
  guidance_status: "process_guidance",
  agency_application: "agency_application"
};

/**
 * Per-row adjudication.
 *
 * The eleven rows are not one move. They are a selection parent, three
 * active-case admission stages, an enforcement referral, a remedy-selection
 * umbrella, a conflated pair of unrelated mechanisms, an undefined statute, an
 * automatic-relief route with a packet-bearing branch, and a solicitor-
 * administered guidance route. Proposing one classification for all eleven
 * would say the same thing about a selection parent whose two children each
 * sell a packet and about a route whose statute nobody has identified.
 *
 * Each entry states the service disposition the route keeps, the child routes
 * that must stay reachable, and what applying the proposal actually does. A
 * route with children is the case that matters: the parent leaving the paid
 * denominator must not take its children's packets with it.
 */
const ADJUDICATION = {
  "MN:cannabis-automatic-or-board-reviewed-expungement-under-609a-055-06": {
    commercialClassification: "non_paid_service",
    serviceDisposition: "selection_only",
    conflatesDistinctMechanisms: [
      "Minn. Stat. § 609A.055 automatic cannabis expungement — relief by operation of law, served as status and correction guidance",
      "Minn. Stat. § 609A.06 Cannabis Expungement Board review — a Board process, served as Board-process guidance with a partner or attorney handoff where individualized review is needed"
    ],
    childPacketRoutesThatMustRemainActive: [],
    implementationEffect: "The route stays reachable as a selector or legacy alias. Neither mechanism is a participant-filed court packet under the current authority, and flattening both into one generic handoff would describe the automatic category as though a person had to ask for it. Splitting them into two child routes is separate work this proposal does not do; it records that the conflation exists so the split is not lost.",
    doNotDo: "Do not flatten the automatic category and the Board-review category into one generic handoff."
  },
  "MS:additional-justice-or-municipal-court-misdemeanor-relief": {
    commercialClassification: "non_paid_service",
    serviceDisposition: "selection_only",
    childPacketRoutesThatMustRemainActive: [
      "MS:additional-justice-court-misdemeanor-relief-9-11-15-3",
      "MS:additional-municipal-court-misdemeanor-relief-21-23-7-6"
    ],
    implementationEffect: "This is the court-selection node between two terminal routes under different statutes. It never rendered and never should. Both children are participant packets bound to ms-misd-addl and must remain reachable and sellable; the parent leaving the paid denominator says nothing about them.",
    doNotDo: "Do not let the parent's reclassification close either child route."
  },
  "MS:controlled-substance-conditional-discharge-active-case-admission": {
    commercialClassification: "non_paid_service",
    serviceDisposition: "handoff",
    childPacketRoutesThatMustRemainActive: ["MS:first-offense-controlled-substance-conditional-discharge-relief"],
    implementationEffect: "Admission into conditional discharge happens while the prosecution is live, so there is no disposition to expunge yet and no packet to sell. The post-completion route under § 41-29-150 is a separate participant packet and must remain reachable.",
    doNotDo: "Do not treat the active-case stage and the post-completion packet as one route."
  },
  "MS:dui-nonadjudication": {
    commercialClassification: "non_paid_service",
    serviceDisposition: "handoff",
    childPacketRoutesThatMustRemainActive: ["MS:first-offense-dui-expungement"],
    implementationEffect: "DUI nonadjudication is an active-case admission with an attorney-assisted motion where supported, not a self-help packet. The five-year first-offense DUI expungement is a different route with its own clock and must remain reachable.",
    doNotDo: "Never apply the five-year first-offense DUI expungement rule to this route."
  },
  "MS:human-trafficking-survivor-vacatur-and-expungement": {
    commercialClassification: "non_paid_service",
    serviceDisposition: "selection_only",
    childPacketRoutesThatMustRemainActive: [
      "MS:human-trafficking-survivor-vacatur-97-3-54-6-5",
      "MS:human-trafficking-survivor-expungement-97-3-54-6-6"
    ],
    implementationEffect: "The umbrella selects between vacatur and expungement. Its own record says it never sells a packet on its own. Both children are attorney_review_packet routes and stay that way: each statutory remedy requires attorney review, which is a packet-bearing outcome, not a handoff.",
    doNotDo: "Do not demote the children to handoffs when the parent leaves the denominator."
  },
  "MS:intervention-court-statutory-result-enforcement-referral": {
    commercialClassification: "non_paid_service",
    serviceDisposition: "handoff",
    childPacketRoutesThatMustRemainActive: [],
    implementationEffect: "Enforcement of relief the statute already granted. Its own record reads 'Never sold as an expungement packet.' The service stays a referral with implementation and correction support; it does not become ordinary guidance.",
    doNotDo: "Do not silently change this referral to ordinary guidance. It is a handoff, and changing that is an owner decision, not a side effect of the denominator move."
  },
  "MS:nonadjudication-99-15-26-active-case-admission": {
    commercialClassification: "non_paid_service",
    serviceDisposition: "handoff",
    childPacketRoutesThatMustRemainActive: ["MS:nonadjudication-under-99-15-26"],
    implementationEffect: "Admission to nonadjudication is discretionary and happens while the case is active. The post-completion § 99-15-26 expungement is a separate participant packet and must remain reachable.",
    doNotDo: "Do not open checkout before completion and closure."
  },
  "MS:pretrial-intervention-active-case-admission": {
    commercialClassification: "non_paid_service",
    serviceDisposition: "handoff",
    childPacketRoutesThatMustRemainActive: ["MS:pretrial-intervention-or-diversion-expungement"],
    implementationEffect: "Entry depends on the district attorney and the program, not on any elapsed wait. The post-completion diversion expungement is a separate participant packet and must remain reachable.",
    doNotDo: "Do not open checkout until a qualifying disposition exists."
  },
  "ND:non-conviction-court-record-closing-under-n-d-c-c-12-60-1-05": {
    commercialClassification: "branch_mixed",
    serviceDisposition: "branch_dependent",
    branchClassification: [
      { branchId: "pre_effective_date_petition", commercialClassification: "paid_packet_intended", serviceDisposition: "participant_packet", note: "Held by the artifact-generation gate until the official petition family is rendered. Packet-bearing, not sellable today." },
      { branchId: "post_effective_date_automatic", commercialClassification: "non_paid_service", serviceDisposition: "automatic_guidance", note: "The record closes by operation of law. Day-62 verification and the clerk correction workflow; no checkout." }
    ],
    childPacketRoutesThatMustRemainActive: [],
    blockedOnVocabulary: "The closure ledger has no branch_mixed category. Applying non_filing_guidance to the whole route would classify the pre-2025-08-01 participant petition as a no-filing route, which is the error this adjudication exists to prevent. This row cannot be applied until the closure generator can classify by branch, or until the two branches become child pathways with the current id retained as a selector.",
    implementationEffect: "No denominator change is proposed for this route yet. Its branches are already correctly resolved at runtime by the canonical resolver; only the ledger cannot express the split.",
    doNotDo: "Do not reclassify the whole route as non-filing guidance."
  },
  "RI:path-g-decriminalized-offense-expungement": {
    commercialClassification: "non_paid_service",
    serviceDisposition: "handoff",
    childPacketRoutesThatMustRemainActive: [],
    implementationEffect: "The controlling statute for the specific decriminalized offence has not been identified. Until it is, the route collects the exact record and hands off to a partner or attorney. When the statute is identified it routes to a new exact packet or guidance mechanism, which is a new contract rather than a change to this one.",
    doNotDo: "Do not sell a generic packet for an undefined statute, and do not merge this with the filed-complaint clock."
  },
  "SC:diversion-or-program-completion-expungement": {
    commercialClassification: "non_paid_service",
    serviceDisposition: "process_guidance",
    childPacketRoutesThatMustRemainActive: [],
    implementationEffect: "Solicitor-administered intake. packetFamily null, checkout disabled, sponsored generation disabled, packet credits zero, and a retained-counsel handoff on solicitor denial or contested eligibility. The circuit-specific source gate stays open and holds the guidance content, not the legal answer.",
    doNotDo: "Do not copy this route's fee schedule onto the other seven South Carolina routes."
  }
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
  const adjudication = ADJUDICATION[pathway.pathwayKey] ?? null;
  rows.push({
    adjudication,
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
      newClassification: adjudication?.commercialClassification === "branch_mixed" ? "branch_mixed" : "non_filing_guidance",
      reason: "no_participant_filing",
      evidence: `${route.sourceFile} records ${pathway.pathwayKey} under ${route.decisionId ?? "an unattributed decision"} / ${route.ruleId ?? "an unattributed rule"} as outcomeMode=${route.outcomeMode} with packetFamily=${JSON.stringify(route.packetFamily ?? null)}, citing ${route.statute ?? "no statute"}. ${NON_PACKET_MODES[route.outcomeMode]}${route.notes ? ` The record's own note: "${route.notes}"` : ""}`,
      authority: null,
      decidedOn: null,
      preservedServiceDisposition: adjudication?.serviceDisposition ?? SERVICE_DISPOSITION_BY_MODE[route.outcomeMode],
      preservedOutcomeMode: route.outcomeMode,
      preservationNote: `Leaving paid_packet_intended changes what this route is counted as, not what it does. It remains a ${route.outcomeMode} route serving a ${adjudication?.serviceDisposition ?? SERVICE_DISPOSITION_BY_MODE[route.outcomeMode]} outcome, and any consumer that reads the new classification must read this field with it.`
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
  commercialClassifications: rows.reduce((acc, row) => {
    const key = row.adjudication?.commercialClassification ?? "unadjudicated";
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {}),
  serviceDispositions: rows.reduce((acc, row) => {
    const key = row.proposal.preservedServiceDisposition;
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {}),
  childPacketRoutesThatMustRemainActive: [...new Set(rows.flatMap((row) => row.adjudication?.childPacketRoutesThatMustRemainActive ?? []))],
  rowsBlockedOnVocabulary: rows.filter((row) => row.adjudication?.blockedOnVocabulary)
    .map((row) => ({ pathwayKey: row.pathwayKey, reason: row.adjudication.blockedOnVocabulary })),
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
  // Every row must be adjudicated individually. An unadjudicated row would fall
  // back to the flat default, which is the thing this register exists to stop.
  for (const row of rows) {
    if (!row.adjudication) {
      problems.push(`${row.pathwayKey} has no individual adjudication; the eleven rows are not one move`);
      continue;
    }
    // A parent leaving the paid denominator must not take its children with it.
    for (const child of row.adjudication.childPacketRoutesThatMustRemainActive ?? []) {
      const childPathway = (closure.pathways ?? []).find((p) => p.pathwayKey === child);
      if (!childPathway) { problems.push(`${row.pathwayKey} names child ${child}, which the closure ledger does not carry`); continue; }
      if (childPathway.category !== "paid_packet_intended") {
        problems.push(`${row.pathwayKey}: child ${child} is ${childPathway.category}; a selector or active-stage parent leaving the denominator must not take its packet child with it`);
      }
      const childRoute = routeByKey.get(child);
      if (!childRoute) { problems.push(`${row.pathwayKey}: child ${child} has no legal-authority contract`); continue; }
      if (!["participant_packet", "attorney_review_packet", "agency_application"].includes(childRoute.outcomeMode)) {
        problems.push(`${row.pathwayKey}: child ${child} is ${childRoute.outcomeMode}, which carries no packet`);
      }
      if (!childRoute.packetFamily) {
        problems.push(`${row.pathwayKey}: child ${child} names no packet family`);
      }
    }
    if (row.adjudication.commercialClassification === "branch_mixed" && !row.adjudication.blockedOnVocabulary) {
      problems.push(`${row.pathwayKey} is branch_mixed but does not say why the closure ledger cannot express it`);
    }
    if (!row.adjudication.implementationEffect) {
      problems.push(`${row.pathwayKey} does not state what applying the proposal actually does`);
    }
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
  L.push("## The proposed batch, for the decision owner");
  L.push("");
  L.push("Eleven rows, adjudicated individually. The approval changes the paid-packet denominator and nothing else: every row records the service disposition it keeps and the child packet routes that must remain active, and the checks fail if a child is missing, non-packet, or unbound to a family.");
  L.push("");
  L.push("`authority` and `decidedOn` are null on every row. They stay null until the decision owner supplies the approval text; this generator never writes them.");
  L.push("");
  L.push("| Pathway | Commercial | Service disposition | Children to keep | Decision |");
  L.push("|---|---|---|---|---|");
  for (const row of data.rows) {
    const children = (row.adjudication?.childPacketRoutesThatMustRemainActive ?? []);
    L.push(`| \`${row.pathwayKey}\` | ${row.proposal.previousClassification} → ${row.adjudication?.commercialClassification ?? "?"} | ${row.proposal.preservedServiceDisposition} | ${children.length === 0 ? "—" : children.length} | ${row.authorityDecisionId ?? "unattributed"} |`);
  }
  L.push("");
  if (data.rowsBlockedOnVocabulary.length > 0) {
    L.push("### Not ready to apply");
    L.push("");
    for (const row of data.rowsBlockedOnVocabulary) L.push(`- \`${row.pathwayKey}\` — ${row.reason}`);
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
    if (row.adjudication) {
      L.push(`- **Proposed commercial classification**: ${row.adjudication.commercialClassification}`);
      for (const mechanism of row.adjudication.conflatesDistinctMechanisms ?? []) L.push(`- **Conflates**: ${mechanism}`);
      for (const child of row.adjudication.childPacketRoutesThatMustRemainActive ?? []) L.push(`- **Child packet route that must remain active**: \`${child}\``);
      for (const branch of row.adjudication.branchClassification ?? []) {
        L.push(`- **Branch \`${branch.branchId}\`**: ${branch.commercialClassification} / ${branch.serviceDisposition}. ${branch.note}`);
      }
      if (row.adjudication.blockedOnVocabulary) L.push(`- **Not ready to apply**: ${row.adjudication.blockedOnVocabulary}`);
      L.push(`- **Implementation effect**: ${row.adjudication.implementationEffect}`);
      if (row.adjudication.doNotDo) L.push(`- **Do not**: ${row.adjudication.doNotDo}`);
    }
    L.push("- **Prepared proposal** (authority and decidedOn are for the decision owner):");
    L.push("");
    L.push("```json");
    L.push(JSON.stringify(row.proposal, null, 2));
    L.push("```");
    L.push("");
  }
  return `${L.join("\n")}\n`;
}
