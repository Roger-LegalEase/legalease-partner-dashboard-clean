#!/usr/bin/env node
// The canonical launch graph: one row per intended-paid pathway, carrying the
// whole chain from compiled pathway to sellability, and one set of counters
// derived from it.
//
//   node scripts/generate-rcap-launch-graph.mjs
//   node scripts/generate-rcap-launch-graph.mjs --check
//
//   compiled pathway
//     -> registry track
//     -> packet family / packet set
//     -> owner-approved legal status
//     -> packet specification
//     -> source assets
//     -> technical status
//     -> PDF status
//     -> renderer
//     -> public witness
//     -> payment result
//     -> artifact result
//     -> DTC result
//     -> RCAP result
//
// There is one denominator and it is not this file's: every row comes from the
// intended-paid set in data/rcap-ledger/sellable-pathway-closure.json, joined
// to the ledgers that already exist. Nothing here re-derives a pathway set, and
// the graph refuses to build if any consumed ledger disagrees about which
// pathways exist — a competing denominator is a hard failure rather than a
// silent reconciliation.
//
// The artifact probe is real. For every route the shared factory admits, the
// packet's composed text is rendered twice through the deterministic
// composed-pleading renderer from the packet specification and the committed
// witness answers, and the two renders must be byte-identical. A route whose
// packet set needs an official PDF this repository does not hold is recorded as
// exactly that and is NOT counted as rendered.

process.env.RCAP_EVALUATOR_TODAY = process.env.RCAP_EVALUATOR_TODAY ?? "2026-07-01";

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { register } from "node:module";
import { fileURLToPath } from "node:url";

import { OWNER_APPROVED, readOwnerLegalDecision } from "./lib/rcap-owner-legal-decision.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(rootDir);
register("./lib/ts-esm-loader.mjs", import.meta.url);

// The governed reader for launch_graph_commercial_status. Imported after the
// TypeScript loader is registered, because it is a .ts module.
const { isOperationallySellable } = await import("../src/lib/rcap/render/commercial-admission.ts");

const CHECK = process.argv.includes("--check");
const JSON_ONLY = process.argv.includes("--json-only");
const JSON_OUT = "data/rcap-ledger/launch-graph.json";
const MD_OUT = "docs/record-clearing/LAUNCH_GRAPH.md";

const read = (rel) => JSON.parse(fs.readFileSync(path.join(rootDir, rel), "utf8"));
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const fileSha = (rel) => sha256(fs.readFileSync(path.join(rootDir, rel)));

const CLOSURE = "data/rcap-ledger/sellable-pathway-closure.json";
const GRAPH = "data/rcap-ledger/paid-pathway-legal-join.json";
const PACKET_SETS = "data/record-clearing/legal-design-packet-set-manifests.json";
const WITNESS = "data/rcap-ledger/public-witness-answer-sets.json";
const FACTORY = "data/record-clearing/factory-v2-route-registry.json";
const PROBLEM_PDFS = "data/rcap-all50/problematic-pdf-register.json";
const SOURCE_ARTIFACTS = "data/record-clearing/source-artifact-registry.json";
const EVIDENCE_PACKET = "data/rcap-ledger/session-a-evidence-packet.json";

const closure = read(CLOSURE);
const legalJoin = read(GRAPH);
const packetSetManifest = read(PACKET_SETS);
const witnessFile = read(WITNESS);
const factoryRegistry = read(FACTORY);
const problematic = read(PROBLEM_PDFS);
const sourceArtifacts = read(SOURCE_ARTIFACTS);
const evidencePacket = read(EVIDENCE_PACKET);
const ownerDecision = readOwnerLegalDecision();

const { getProfileByJurisdiction } = await import("../src/lib/rcap-engine/profile-registry.ts");
const { resolvePacketRoute, PACKET_ROUTE_AVAILABILITIES } = await import("../src/lib/rcap/documents/packet-route-resolver.ts");
const { renderCustomPleading } = await import("../src/lib/record-clearing/renderers/custom-pleading-renderer.ts");
const { packetSpecificationFor, specificationContentSha256 } = await import("../src/lib/rcap/grade-a/packet-specification.ts");

// ---------------------------------------------------------------------------
// One denominator. Every consumed ledger must be talking about the same set of
// intended-paid pathways, or this is not a graph, it is two graphs.
// ---------------------------------------------------------------------------
const intended = (closure.pathways ?? []).filter((pathway) => pathway.category === "paid_packet_intended");
const denominator = intended.map((pathway) => pathway.pathwayKey).sort();
const denominatorHash = sha256(denominator.join("\n"));

function assertSameDenominator(label, keys) {
  const sorted = [...keys].sort();
  if (sha256(sorted.join("\n")) === denominatorHash) return;
  const missing = denominator.filter((key) => !sorted.includes(key));
  const extra = sorted.filter((key) => !denominator.includes(key));
  console.error(`${label} disagrees with the intended-paid denominator: ${missing.length} missing, ${extra.length} extra.`);
  for (const key of missing.slice(0, 5)) console.error(`  missing: ${key}`);
  for (const key of extra.slice(0, 5)) console.error(`  extra:   ${key}`);
  process.exit(1);
}

assertSameDenominator("the paid-pathway legal join", (legalJoin.pathways ?? []).map((row) => row.pathwayKey));
assertSameDenominator("the public witness answer sets", (witnessFile.witnesses ?? []).map((row) => row.pathwayKey));
assertSameDenominator("the factory_v2 route registry", (factoryRegistry.routes ?? []).map((row) => row.pathwayKey));
assertSameDenominator("the Session A evidence packet", (evidencePacket.records ?? []).map((row) => row.pathwayKey));

// ---------------------------------------------------------------------------
// indexes
// ---------------------------------------------------------------------------
const legalByPathway = new Map((legalJoin.pathways ?? []).map((row) => [row.pathwayKey, row]));
const witnessByPathway = new Map((witnessFile.witnesses ?? []).map((row) => [row.pathwayKey, row]));
const factoryByPathway = new Map((factoryRegistry.routes ?? []).map((row) => [row.pathwayKey, row]));
const factoryAdmitted = new Set((factoryRegistry.routes ?? []).filter((row) => row.factoryV2Resolves).map((row) => row.pathwayKey));
const evidenceByPathway = new Map((evidencePacket.records ?? []).map((row) => [row.pathwayKey, row]));
const packetSetByTrack = new Map(packetSetManifest.packetSets.map((set) => [set.trackId, set]));
const problemByTrack = new Map();
for (const record of problematic.records ?? []) {
  for (const trackId of record.affectedTrackIds ?? []) {
    if (!problemByTrack.has(trackId)) problemByTrack.set(trackId, []);
    problemByTrack.get(trackId).push({ assetId: record.identity, formId: record.formId, owner: record.owner });
  }
}
// An official form is "held" only when the artifact registry says its bytes are
// present and its measured hash matches what the inventory recorded.
const heldFormIds = new Set(
  (sourceArtifacts.artifacts ?? [])
    .filter((artifact) => artifact.presence === "present" && artifact.hashState === "match")
    .flatMap((artifact) => [artifact.artifactId, artifact.fileName].filter(Boolean))
);

// ---------------------------------------------------------------------------
// The artifact probe. Deterministic by construction and proved so by rendering
// twice; the second render must reproduce the first byte for byte.
// ---------------------------------------------------------------------------
const RELIEF_TERM = (label) => (/seal|shield|confidential/i.test(String(label ?? "")) ? "sealing" : "expungement");

function composedPleadingConfig(route, sets) {
  const components = sets.flatMap((set) => set.components ?? []);
  const namedForms = [...new Set(components.map((component) => component.officialFormId).filter(Boolean))].sort();
  const reliefTerm = RELIEF_TERM(route.pathwayLabel);
  return {
    jurisdictionCode: route.jurisdiction,
    trackId: route.registryTrackIds[0] ?? route.pathwayId,
    templateGrade: "legal_ops_custom_pleading",
    templateLifecycle: "replacement_candidate",
    primaryReliefTerm: reliefTerm,
    documentTitleFull: `Petition for ${reliefTerm === "sealing" ? "Sealing" : "Expungement"} — ${route.pathwayLabel ?? route.pathwayId}`,
    courtCaption: `In the ${route.jurisdiction} court of record`,
    primaryStatutoryAuthority: namedForms.length > 0
      ? namedForms.map((formId) => ({ citation: formId, summary: `Official form ${formId} named by the packet specification.` }))
      : [{ citation: route.pathwayId, summary: "Compiled pathway authority carried by the packet specification." }],
    verificationStatute: { citation: `${route.jurisdiction} verification`, summary: "Verification as required by the jurisdiction's rules." },
    includeProposedOrder: components.some((component) => /order/i.test(String(component.role ?? ""))),
    includeCertificateOfService: components.some((component) => /service/i.test(String(component.role ?? ""))),
    serviceNote: null,
    counselFlags: []
  };
}

function probeArtifact(route, sets, witness) {
  const answers = witness?.finalAnswers ?? {};
  const text = (id, fallback) => {
    const value = answers[id];
    const asString = Array.isArray(value) ? value.join(", ") : String(value ?? "");
    return asString.trim() === "" || asString === "unknown" ? fallback : asString.trim();
  };
  const input = {
    config: composedPleadingConfig(route, sets),
    partyData: {
      petitionerName: "Witness Participant",
      petitionerAddress: undefined,
      otherNamesUsed: undefined
    },
    caseData: {
      countyName: text("county", "Unknown County"),
      judicialDistrict: undefined,
      docketNumber: text("case_identifier", "UNKNOWN"),
      otn: undefined,
      judgeName: undefined,
      judgeAddress: undefined
    },
    chargeData: {
      chargeDescription: text("charge", "Charge as recorded"),
      offenseGrade: text("offense_level", "As recorded"),
      disposition: text("case_outcome", "As recorded"),
      dispositionDate: text("disposition_date", "2012-06-01"),
      arrestDate: text("arrest_date", "2012-06-01")
    },
    eligibilityData: {
      eligibilityBasisLabel: route.pathwayLabel ?? route.pathwayId,
      waitingPeriodText: witness?.terminalEvaluation?.resultCode === "not_yet"
        ? "The waiting period is not yet satisfied on these facts."
        : "The waiting period is satisfied on these facts.",
      restitutionText: text("financial_obligations", "No") === "Yes"
        ? "All fines, fees, costs and restitution are satisfied."
        : undefined
    },
    productName: "Expungement.ai",
    shadowMode: true
  };
  try {
    const first = renderCustomPleading(input);
    const second = renderCustomPleading(input);
    const firstHash = sha256(first.fullText);
    const secondHash = sha256(second.fullText);
    return {
      rendered: first.rendered === true && first.errors.length === 0,
      deterministic: firstHash === secondHash,
      sha256: firstHash,
      characters: first.fullText.length,
      sections: first.sections.length,
      warnings: first.warnings.length,
      errors: first.errors
    };
  } catch (error) {
    return { rendered: false, deterministic: false, sha256: null, characters: 0, sections: 0, warnings: 0, errors: [String(error?.message ?? error)] };
  }
}

// ---------------------------------------------------------------------------
// rows
// ---------------------------------------------------------------------------
const rows = [];
for (const pathway of intended) {
  const key = pathway.pathwayKey;
  const legal = legalByPathway.get(key);
  const witness = witnessByPathway.get(key) ?? null;
  const factory = factoryByPathway.get(key);
  const evidence = evidenceByPathway.get(key);
  const trackIds = legal?.registryTrackIds ?? [];
  const sets = trackIds.map((id) => packetSetByTrack.get(id)).filter(Boolean);
  const profile = getProfileByJurisdiction(pathway.jurisdiction);
  const compiledPathway = profile?.pathways?.find((candidate) => candidate.id === pathway.pathwayId);

  // This aggregate includes an automatic sibling. Report the productized
  // track from its server-owned specification, never infer aggregate admission
  // or choose the first track in the legal join. Other pathways keep their
  // existing resolution until separately assigned.
  const specification = key === "IL:felony-prostitution-relief" ? packetSpecificationFor(key) : null;
  const selectedTrackId = specification?.trackId && trackIds.includes(specification.trackId)
    ? specification.trackId : null;
  const resolution = resolvePacketRoute({ state: pathway.jurisdiction, pathway: pathway.pathwayId, trackId: selectedTrackId });

  // Source assets: which official forms the packet specification names, and
  // whether this repository actually holds them.
  const namedFormIds = [...new Set(sets.flatMap((set) => (set.components ?? []).map((component) => component.officialFormId)).filter(Boolean))].sort();
  const heldFormIdsForRoute = namedFormIds.filter((formId) => heldFormIds.has(formId));
  const officialSourcesHeld = namedFormIds.length > 0 && heldFormIdsForRoute.length === namedFormIds.length;

  const problemAssets = trackIds.flatMap((id) => problemByTrack.get(id) ?? []);

  // Registry-gap routes are preserved, never dropped. Where no registry track
  // maps to the compiled pathway, the pathway's own compiled packet record is
  // the packet set, and the missing track is recorded as a registry-ownership
  // action rather than a reason to make the route disappear.
  const registryGap = trackIds.length === 0;
  const pathwayLevelPacketRecord = registryGap && compiledPathway
    ? {
        source: "compiled_profile_packet_generator",
        pathwayId: pathway.pathwayId,
        requiredInputIds: [...(factory?.requiredInputIds ?? [])].sort(),
        present: (factory?.requiredInputIds ?? []).length > 0
      }
    : null;

  const factoryResolves = resolution.routeKind === "factory_v2";
  const artifactSets = selectedTrackId ? sets.filter((set) => set.trackId === selectedTrackId) : sets;
  const artifact = factoryResolves ? probeArtifact(
    { ...pathway, registryTrackIds: selectedTrackId ? [selectedTrackId] : trackIds }, artifactSets, witness
  ) : null;
  if (artifact && selectedTrackId) {
    artifact.scope = {
      routeId: key,
      trackId: selectedTrackId,
      packetFamilyId: resolution.factoryV2.packetFamilyId,
      specificationSha256: specificationContentSha256(specification)
    };
  }

  const gates = {
    publicWitnessReachesThisPathway: witness?.landedOnThisPathway === true,
    authoritativeIntendedPathway: Boolean(compiledPathway),
    paymentAllowed: witness?.terminalEvaluation?.paymentAllowed === true,
    packetSpecificationComplete: sets.length > 0 && sets.length === trackIds.length
      && sets.every((set) => (set.components ?? []).length > 0),
    ownerApprovedLegalDesign: legal?.legalStatus === OWNER_APPROVED,
    technicalApprovalCurrent: (evidence?.completedOutput ?? []).some((output) => output.verifierResult === "passed"),
    rendererSelected: resolution.rendererKind !== "none",
    // Two things have to be true to call an artifact proven, and only the
    // first is provable in this worktree. The composed text must render
    // identically twice, AND every official form the packet specification names
    // must actually be held here — because a packet that is missing its
    // mandatory official form is not a packet, however deterministic its
    // narrative is. Today nothing holds its named forms, so this gate passes
    // only for routes whose specification names none.
    deterministicArtifactProven: artifact?.rendered === true
      && artifact?.deterministic === true
      && (namedFormIds.length === 0 || officialSourcesHeld),
    noProblematicPdfHold: problemAssets.length === 0
  };
  const unmetGates = Object.entries(gates).filter(([, met]) => !met).map(([name]) => name);
  const fulfillmentAuthorityAdmitted = isOperationallySellable(pathway.pathwayKey ?? key);

  rows.push({
    pathwayKey: key,
    jurisdiction: pathway.jurisdiction,
    pathwayId: pathway.pathwayId,
    pathwayLabel: pathway.pathwayLabel,

    // The resolver's derived availability word — read from the same resolution
    // that already supplies routeKind and rendererKind, never recomputed here.
    // It is reporting, not rollout: the two ready states are reachable only
    // through a Grade-A record at the admission schema, and flipping the
    // consumer path live remains the single nationwide owner-authorized action.
    availability: resolution.availability,

    compiledPathway: { present: Boolean(compiledPathway), profileVersion: profile?.profileVersion ?? null },
    registryTracks: trackIds,
    registryGap,
    pathwayLevelPacketRecord,
    packetFamilies: legal?.packetFamilies ?? [],
    packetSets: sets.map((set) => ({ packetSetId: set.packetSetId, trackId: set.trackId, components: (set.components ?? []).length })),

    ownerApprovedLegalStatus: legal?.legalStatus ?? null,
    ownerLegalDecisionRecordId: ownerDecision.approved ? ownerDecision.records[0].recordId : null,
    legalBasis: evidence?.ownerApprovedLegal?.basis ?? null,

    packetSpecification: {
      complete: gates.packetSpecificationComplete,
      componentCount: sets.reduce((n, set) => n + (set.components ?? []).length, 0),
      participantActionsRequired: sets.reduce((n, set) => n + (set.participantActionRequired ?? []).length, 0)
    },
    sourceAssets: {
      officialFormIdsNamed: namedFormIds,
      officialFormIdsHeldInThisRepository: heldFormIdsForRoute,
      allNamedSourcesHeld: officialSourcesHeld
    },
    technicalStatus: {
      completedOutputVerifierResults: [...new Set((evidence?.completedOutput ?? []).map((output) => output.verifierResult).filter(Boolean))].sort(),
      current: gates.technicalApprovalCurrent
    },
    pdfStatus: {
      problematicAssets: problemAssets,
      hold: problemAssets.length > 0
    },
    renderer: {
      ...(selectedTrackId ? { trackId: selectedTrackId } : {}),
      routeKind: resolution.routeKind,
      rendererKind: resolution.rendererKind,
      packetSetIds: resolution.factoryV2?.packetSetIds ?? [],
      reason: resolution.reason
    },
    publicWitness: witness
      ? {
          reachesThisPathway: witness.landedOnThisPathway === true,
          settled: witness.terminalEvaluation !== null,
          resultCode: witness.terminalEvaluation?.resultCode ?? null,
          rounds: (witness.rounds ?? []).length
        }
      : null,
    paymentResult: {
      allowedAtTheEvaluator: gates.paymentAllowed,
      sellableAtTheResolver: resolution.sellable === true,
      creditConsumable: resolution.creditConsumable === true
    },
    artifactResult: artifact,
    dtcResult: {
      // The direct-to-consumer surface delivers only where the resolver both
      // renders and sells. A shadow route reaches no consumer.
      deliverable: resolution.sellable === true && resolution.rendererKind !== "none"
    },
    rcapResult: {
      // The RCAP partner surface consumes a packet credit on the same terms.
      creditConsumable: resolution.creditConsumable === true
    },

    operationalGates: gates,
    unmetOperationalGates: unmetGates,
    // Grade-A fulfillment authority is an additional closed door. It cannot
    // override any existing runtime, payment, source, legal, renderer or hold
    // restriction represented by the operational gates above. Conversely,
    // satisfying those older gates cannot substitute for the canonical
    // fulfillment record. A route is sellable only at their intersection.
    fulfillmentAuthorityAdmitted,
    operationallySellable: fulfillmentAuthorityAdmitted && unmetGates.length === 0,
    allOperationalGatesMet: unmetGates.length === 0
  });
}

rows.sort((a, b) => a.pathwayKey.localeCompare(b.pathwayKey));

// ---------------------------------------------------------------------------
// counters
// ---------------------------------------------------------------------------
const count = (predicate) => rows.filter(predicate).length;
const counters = {
  intendedPaid: rows.length,
  correctPathwayPublicWitnesses: count((row) => row.publicWitness?.reachesThisPathway === true),
  wrongPathwayWitnesses: count((row) => row.publicWitness?.settled === true && row.publicWitness?.reachesThisPathway !== true),
  nonConvergingWitnesses: count((row) => row.publicWitness?.settled !== true),
  exactTrackAndPacketSet: count((row) => !row.registryGap && row.packetSpecification.complete),
  registryGapWithPathwayPacketSet: count((row) => row.registryGap && row.pathwayLevelPacketRecord?.present === true),
  registryGapWithoutAPacketRecord: count((row) => row.registryGap && row.pathwayLevelPacketRecord?.present !== true),
  ownerApprovedLegal: count((row) => row.ownerApprovedLegalStatus === OWNER_APPROVED),
  // Selected, not merely admitted. The route registry can only report which
  // routes the factory MAY build; this is driven through the real resolver, so
  // it is the count of routes the factory actually gets.
  factoryV2Selected: count((row) => row.renderer.routeKind === "factory_v2"),
  factoryV2Resolved: count((row) => row.renderer.routeKind === "factory_v2"),
  // Admitted by the registry and then outranked by a suppression that sits
  // ahead of the factory branch. These are not defects — a deferral winning is
  // the resolver working — but the gap between 183 admitted and 180 selected has
  // to be attributable, or the two artifacts just disagree.
  factoryV2AdmittedButSuppressed: rows
    .filter((row) => factoryAdmitted.has(row.pathwayKey) && row.renderer.routeKind !== "factory_v2")
    .map((row) => ({ pathwayKey: row.pathwayKey, suppressedBy: row.renderer.routeKind }))
    .sort((a, b) => a.pathwayKey.localeCompare(b.pathwayKey)),
  paymentAllowed: count((row) => row.paymentResult.allowedAtTheEvaluator),
  // Split on purpose. The first is what this worktree can prove; the second is
  // what a participant would actually receive, and it is the one the
  // operational predicate uses.
  deterministicallyRenderedComposedText: count((row) => row.artifactResult?.deterministic === true && row.artifactResult?.rendered === true),
  deterministicallyRendered: count((row) => row.operationalGates.deterministicArtifactProven),
  officialFormsNamedButNotHeldInThisRepository: count(
    (row) => row.renderer.routeKind === "factory_v2" && row.sourceAssets.officialFormIdsNamed.length > 0 && !row.sourceAssets.allNamedSourcesHeld
  ),
  operationallySellable: count((row) => row.operationallySellable)
};

const unmetTally = {};
for (const row of rows) {
  for (const gate of row.unmetOperationalGates) unmetTally[gate] = (unmetTally[gate] ?? 0) + 1;
}

// ---------------------------------------------------------------------------
// availability aggregation — totals and per-state counts, derived from the rows
// and from nothing else, in the resolver's own vocabulary order.
// ---------------------------------------------------------------------------
const emptyAvailabilityCounts = () => Object.fromEntries(PACKET_ROUTE_AVAILABILITIES.map((word) => [word, 0]));
const availabilityTotals = emptyAvailabilityCounts();
const availabilityByState = {};
for (const row of rows) {
  availabilityTotals[row.availability] += 1;
  if (!availabilityByState[row.jurisdiction]) availabilityByState[row.jurisdiction] = emptyAvailabilityCounts();
  availabilityByState[row.jurisdiction][row.availability] += 1;
}
const availabilityBlock = {
  vocabulary: [...PACKET_ROUTE_AVAILABILITIES],
  source: "src/lib/rcap/documents/packet-route-resolver.ts (resolvePacketRoute().availability)",
  notARolloutMechanism:
    "Availability is derived reporting. PACKET_READY and CUSTOM_PLEADING_READY are reachable only through a current Grade-A fulfillment record at the admission schema version; flipping the consumer path live remains a single nationwide owner-authorized action through the consumer-delivery control under the all-51 launch rule.",
  totals: availabilityTotals,
  byState: Object.fromEntries(Object.entries(availabilityByState).sort(([a], [b]) => a.localeCompare(b)))
};

const graph = {
  schemaVersion: "rcap-launch-graph/v1",
  generatedBy: "scripts/generate-rcap-launch-graph.mjs",
  question: "For every intended-paid pathway, what is the whole chain from compiled pathway to sellability, and which link is the one that is missing?",
  createsApproval: false,
  changesRuntime: false,
  oneDenominator: {
    source: CLOSURE,
    category: "paid_packet_intended",
    pathways: rows.length,
    sha256: denominatorHash,
    enforcement:
      "Every consumed ledger is required to describe exactly this pathway set. A ledger that adds or drops a pathway fails this generator rather than being reconciled quietly, so there is no second denominator to disagree with."
  },
  inputs: Object.fromEntries(
    [CLOSURE, GRAPH, PACKET_SETS, WITNESS, FACTORY, PROBLEM_PDFS, SOURCE_ARTIFACTS, EVIDENCE_PACKET].map((rel) => [rel, fileSha(rel)])
  ),
  ownerLegalDecision: ownerDecision.approved
    ? { approved: true, recordId: ownerDecision.records[0].recordId, effectiveDate: ownerDecision.records[0].effectiveDate }
    : { approved: false, reason: ownerDecision.reason },
  operationalPredicate: [
    "correct public witness",
    "authoritative intended pathway",
    "paymentAllowed=true",
    "complete packet specification",
    "owner-approved existing legal design",
    "current technical approval",
    "renderer selected",
    "deterministic artifact proven",
    "no problematic-PDF hold"
  ],
  artifactProbe: {
    renderer: "src/lib/record-clearing/renderers/custom-pleading-renderer.ts",
    method: "Each admitted route's packet text is composed twice from its packet specification and its committed witness answers; the two renders must hash identically.",
    limitation:
      "Official-form filling cannot be exercised here: the source PDFs live under private/Nationwide Record Clearing/, which this worktree does not carry. A route whose named official forms are not held is recorded as such and is NOT counted as deterministically rendered."
  },
  counters,
  unmetOperationalGates: unmetTally,
  availability: availabilityBlock,
  rows
};

const serialized = `${JSON.stringify(graph, null, 2)}\n`;

const pad = (n) => String(n).padStart(4);
const md = [
  "# The canonical launch graph",
  "",
  "One row per intended-paid pathway, carrying the whole chain: compiled pathway → registry track →",
  "packet family and packet set → owner-approved legal status → packet specification → source assets →",
  "technical status → PDF status → renderer → public witness → payment result → artifact result →",
  "DTC result → RCAP result.",
  "",
  `**One denominator.** All ${rows.length} rows come from the \`paid_packet_intended\` set in`,
  "`data/rcap-ledger/sellable-pathway-closure.json`. Every consumed ledger is required to describe",
  "exactly that set; one that adds or drops a pathway fails this generator rather than being",
  "reconciled quietly, so there is nothing here for a second denominator to disagree with.",
  "",
  "## Counters",
  "",
  "| | |",
  "|---|---:|",
  `| INTENDED PAID | ${counters.intendedPaid} |`,
  `| CORRECT-PATHWAY PUBLIC WITNESSES | ${counters.correctPathwayPublicWitnesses} |`,
  `| WRONG-PATHWAY WITNESSES | ${counters.wrongPathwayWitnesses} |`,
  `| NON-CONVERGING WITNESSES | ${counters.nonConvergingWitnesses} |`,
  `| EXACT TRACK + PACKET SET | ${counters.exactTrackAndPacketSet} |`,
  `| REGISTRY GAP + PATHWAY PACKET SET | ${counters.registryGapWithPathwayPacketSet} |`,
  `| OWNER-APPROVED LEGAL | ${counters.ownerApprovedLegal} |`,
  `| FACTORY_V2 RESOLVED | ${counters.factoryV2Resolved} |`,
  `| PAYMENT ALLOWED | ${counters.paymentAllowed} |`,
  `| DETERMINISTICALLY RENDERED (complete packet) | ${counters.deterministicallyRendered} |`,
  `| — composed text proven deterministic | ${counters.deterministicallyRenderedComposedText} |`,
  `| — official forms named but not held here | ${counters.officialFormsNamedButNotHeldInThisRepository} |`,
  `| OPERATIONALLY SELLABLE | ${counters.operationallySellable} |`,
  "",
  "Operationally sellable means all nine of: correct public witness; authoritative intended pathway;",
  "paymentAllowed=true; complete packet specification; owner-approved existing legal design; current",
  "technical approval; renderer selected; deterministic artifact proven; no problematic-PDF hold.",
  "",
  "## Availability",
  "",
  "The resolver's derived availability word, per route, aggregated here. Reporting, not rollout:",
  "the two ready states are reachable only through a current Grade-A fulfillment record at the",
  "admission schema version, and flipping the consumer path live remains a single nationwide",
  "owner-authorized action through the consumer-delivery control under the all-51 launch rule.",
  "",
  "| Availability | Routes |",
  "|---|---:|",
  ...PACKET_ROUTE_AVAILABILITIES.map((word) => `| \`${word}\` | ${availabilityTotals[word]} |`),
  "",
  "Per-state counts are carried in `availability.byState` of the JSON ledger.",
  "",
  "## What is missing, and on how many routes",
  "",
  "| Unmet gate | Routes |",
  "|---|---:|",
  ...Object.entries(unmetTally).sort((a, b) => b[1] - a[1]).map(([gate, n]) => `| \`${gate}\` | ${n} |`),
  "",
  "## The registry-gap routes",
  "",
  `${counters.registryGapWithPathwayPacketSet + counters.registryGapWithoutAPacketRecord} intended-paid pathways have no registry track. None is dropped. Where the compiled profile`,
  `carries a pathway-level packet record, it is used as the packet set: **${counters.registryGapWithPathwayPacketSet}** of them do.`,
  `The missing registry track is a registry-ownership action recorded against the route, not a reason`,
  "to make the pathway unavailable — and it is never a licence to invent a track-to-family relationship.",
  "",
  "## The artifact probe",
  "",
  "Each admitted route's packet text is composed twice through the shared deterministic",
  "composed-pleading renderer, from its packet specification and its committed witness answers, and the",
  "two renders must hash identically. Official-form *filling* is not exercised here: those source PDFs",
  "live under `private/Nationwide Record Clearing/`, which this worktree does not carry, so a route",
  "whose named official forms are not held is recorded as such and is not counted as rendered.",
  "",
  "Regenerate with `npm run rcap:generate-launch-graph`; `--check` proves it is current.",
  ""
].join("\n");

if (CHECK) {
  const problems = [];
  const currentJson = fs.existsSync(path.join(rootDir, JSON_OUT)) ? fs.readFileSync(path.join(rootDir, JSON_OUT), "utf8") : "";
  const currentMd = fs.existsSync(path.join(rootDir, MD_OUT)) ? fs.readFileSync(path.join(rootDir, MD_OUT), "utf8") : "";
  if (currentJson !== serialized) problems.push(`${JSON_OUT} is stale`);
  if (currentMd !== md) problems.push(`${MD_OUT} is stale`);
  if (problems.length > 0) {
    console.error("launch graph is stale; regenerate with node scripts/generate-rcap-launch-graph.mjs");
    for (const problem of problems) console.error(` - ${problem}`);
    process.exit(1);
  }
  console.log(`launch graph current — ${rows.length} intended-paid pathways, ${counters.operationallySellable} operationally sellable`);
  process.exit(0);
}

fs.writeFileSync(path.join(rootDir, JSON_OUT), serialized);
if (!JSON_ONLY) fs.writeFileSync(path.join(rootDir, MD_OUT), md);
console.log(`wrote ${JSON_OUT}${JSON_ONLY ? " (Markdown unchanged; full --check still checks both outputs)" : ` and ${MD_OUT}`}`);
console.log("");
console.log(`INTENDED PAID:                      ${pad(counters.intendedPaid)}`);
console.log(`CORRECT-PATHWAY PUBLIC WITNESSES:   ${pad(counters.correctPathwayPublicWitnesses)}`);
console.log(`WRONG-PATHWAY WITNESSES:            ${pad(counters.wrongPathwayWitnesses)}`);
console.log(`NON-CONVERGING WITNESSES:           ${pad(counters.nonConvergingWitnesses)}`);
console.log(`EXACT TRACK + PACKET SET:           ${pad(counters.exactTrackAndPacketSet)}`);
console.log(`REGISTRY GAP + PATHWAY PACKET SET:  ${pad(counters.registryGapWithPathwayPacketSet)}`);
console.log(`OWNER-APPROVED LEGAL:               ${pad(counters.ownerApprovedLegal)}`);
console.log(`FACTORY_V2 RESOLVED:                ${pad(counters.factoryV2Resolved)}`);
console.log(`PAYMENT ALLOWED:                    ${pad(counters.paymentAllowed)}`);
console.log(`DETERMINISTICALLY RENDERED:         ${pad(counters.deterministicallyRendered)}   (composed text proven on ${counters.deterministicallyRenderedComposedText}; ${counters.officialFormsNamedButNotHeldInThisRepository} name an official form this repository does not hold)`);
console.log(`OPERATIONALLY SELLABLE:             ${pad(counters.operationallySellable)}`);
console.log("");
console.log("Availability:");
for (const word of PACKET_ROUTE_AVAILABILITIES) {
  console.log(`  ${pad(availabilityTotals[word])}  ${word}`);
}
console.log("");
console.log("Unmet operational gates:");
for (const [gate, n] of Object.entries(unmetTally).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${pad(n)}  ${gate}`);
}
