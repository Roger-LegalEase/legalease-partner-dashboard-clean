#!/usr/bin/env node
// The evidence packet for Session A.
//
//   node scripts/generate-rcap-session-a-evidence-packet.mjs
//   node scripts/generate-rcap-session-a-evidence-packet.mjs --check
//
// Session A owns the canonical pathway-family graph
// (data/rcap-ledger/paid-pathway-legal-join.json). This packet CONSUMES that
// graph. It does not recompute a disposition, does not maintain a rival
// denominator, changes no runtime and issues no approval.
//
// What it adds that the graph does not already carry:
//
//   1. THE PACKET-FAMILY BRIDGE, IMPORTED AND RECONCILED. Session A's join reads
//      data/rcap-codex/d-track-terminalization/track-family-map.json, which is
//      lane-D only and marked proposed_noncanonical_analysis. The repository also
//      carries data/record-clearing/legal-design-packet-set-manifests.json — a
//      packet set for all 497 registry tracks, with each component's role,
//      requirement, output strategy and official form id. Importing it resolves
//      the "no track-to-family bridge" reason for every pathway that has tracks.
//
//   2. AN EXPLICIT REGISTRY-GAP CLASSIFICATION for every pathway the bridge still
//      cannot reach, so nothing is left as "unknown".
//
//   3. COMPLETED-OUTPUT EVIDENCE joined by track id from the adopted packet
//      proofs — assembled artifact hashes, page counts and verifier results.
//
//   4. THE DETERMINISTIC PUBLIC WITNESS for each pathway, from
//      data/rcap-ledger/public-witness-answer-sets.json.
//
//   5. GENUINE NEW COUNSEL EXCEPTIONS ONLY — a pathway is called an exception
//      only when there is no existing counsel record to reason from at all, or
//      when Session A already recorded legal_action_required. Whether an existing
//      adoption reaches a given pathway is counsel's determination, never this
//      packet's, and is reported as a determination owed rather than an exception.
//
// Session A's inputs are read from the working tree when present and otherwise
// from the exact commit below, so this runs before and after the merge and
// records which source it used plus the sha256 of every input.

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(rootDir);

const CHECK = process.argv.includes("--check");
const SESSION_A_COMMIT = "4072b6189c0cde20ab43673a9f0569d2b8d20752";
const SESSION_A_FALLBACK_REF = "origin/claude/rcap-48h-launch-integration";

const JSON_OUT = "data/rcap-ledger/session-a-evidence-packet.json";
const MD_OUT = "docs/record-clearing/session-a-evidence-packet.md";

const sha256 = (v) => crypto.createHash("sha256").update(v).digest("hex");
const readLocal = (p) => fs.readFileSync(path.join(rootDir, p), "utf8");
const git = (args) => execFileSync("git", args, { cwd: rootDir, encoding: "utf8", maxBuffer: 256 * 1024 * 1024 });

/** Session A's file: the working tree if it is there, otherwise their commit. */
function sessionAInput(relPath) {
  if (fs.existsSync(path.join(rootDir, relPath))) {
    const raw = readLocal(relPath);
    return { raw, source: "working_tree", ref: null, sha256: sha256(raw) };
  }
  for (const ref of [SESSION_A_COMMIT, SESSION_A_FALLBACK_REF]) {
    try {
      const raw = git(["show", `${ref}:${relPath}`]);
      return { raw, source: "session_a_commit", ref, sha256: sha256(raw) };
    } catch { /* try the next ref */ }
  }
  throw new Error(`${relPath} is not in the working tree and not reachable at ${SESSION_A_COMMIT} or ${SESSION_A_FALLBACK_REF}. Session A's graph must be present for this packet to consume it.`);
}

const inputs = {};
function load(name, relPath) {
  const input = sessionAInput(relPath);
  inputs[name] = { path: relPath, source: input.source, ref: input.ref, sha256: input.sha256 };
  return JSON.parse(input.raw);
}

// --------------------------------------------------------------------------- inputs
const graph = load("sessionAPathwayFamilyGraph", "data/rcap-ledger/paid-pathway-legal-join.json");
const packetSets = load("packetFamilyBridge", "data/record-clearing/legal-design-packet-set-manifests.json");
const relationships = load("trackSourceRelationships", "data/record-clearing/legal-design-track-source-relationships.json");
const adoption = load("extAdopt01", "data/record-clearing/template-families/EXT-ADOPT-01-standing-external-counsel-adoption.json");
const witnessFile = JSON.parse(readLocal("data/rcap-ledger/public-witness-answer-sets.json"));
inputs.publicWitnessAnswerSets = {
  path: "data/rcap-ledger/public-witness-answer-sets.json",
  source: "working_tree",
  ref: null,
  sha256: sha256(readLocal("data/rcap-ledger/public-witness-answer-sets.json"))
};
const problematic = JSON.parse(readLocal("data/rcap-all50/problematic-pdf-register.json"));
inputs.problematicPdfRegister = {
  path: "data/rcap-all50/problematic-pdf-register.json",
  source: "working_tree",
  ref: null,
  sha256: sha256(readLocal("data/rcap-all50/problematic-pdf-register.json"))
};

// Completed-output evidence: the adopted packet proofs, read as a set.
const PROOF_DIR = "data/record-clearing/production-factory/packet-proofs";
let proofNames = [];
if (fs.existsSync(path.join(rootDir, PROOF_DIR))) {
  proofNames = fs.readdirSync(path.join(rootDir, PROOF_DIR)).filter((f) => f.endsWith(".json")).sort();
} else {
  proofNames = git(["ls-tree", "--name-only", `${SESSION_A_COMMIT}:${PROOF_DIR}`])
    .split("\n").map((s) => s.trim()).filter((s) => s.endsWith(".json")).sort();
}
const proofs = proofNames.map((name) => JSON.parse(sessionAInput(`${PROOF_DIR}/${name}`).raw));
inputs.completedOutputPacketProofs = { path: PROOF_DIR, source: fs.existsSync(path.join(rootDir, PROOF_DIR)) ? "working_tree" : "session_a_commit", count: proofs.length };

// --------------------------------------------------------------------------- indexes
const packetSetByTrack = new Map(packetSets.packetSets.map((s) => [s.trackId, s]));
const relationshipsByTrack = new Map();
for (const r of relationships.relationships ?? []) {
  const t = r.trackId ?? r.track_id;
  if (!t) continue;
  if (!relationshipsByTrack.has(t)) relationshipsByTrack.set(t, []);
  relationshipsByTrack.get(t).push(r);
}
const boundFamilyById = new Map(adoption.boundFamilies.map((f) => [f.familyJobId, f]));
const boundJurisdictions = new Set(adoption.boundFamilies.map((f) => f.jurisdiction));
const supersededFamilies = new Set((adoption.familiesCarryingSupersededTechnicalResult ?? []).map((f) => f.familyJobId));

const completedOutputByTrack = new Map();
for (const proof of proofs) {
  for (const sample of proof.samplePackets ?? []) {
    if (!sample.trackId) continue;
    if (!completedOutputByTrack.has(sample.trackId)) completedOutputByTrack.set(sample.trackId, []);
    completedOutputByTrack.get(sample.trackId).push({
      jobId: proof.jobId,
      jurisdiction: proof.jurisdiction,
      completionCommit: proof.completionCommit,
      authorityEdition: proof.authorityEdition,
      verifierResult: proof.verifier?.result ?? null,
      verifierPath: proof.verifier?.path ?? null,
      assembledFileName: sample.assembledFileName,
      assembledSha256: sample.assembledSha256,
      assembledPageCount: sample.assembledPageCount,
      familyIsAdopted: boundFamilyById.has(proof.jobId),
      familyCarriesSupersededTechnicalResult: supersededFamilies.has(proof.jobId)
    });
  }
}

const witnessByPathway = new Map(witnessFile.witnesses.map((w) => [w.pathwayKey, w]));

const problematicByTrack = new Map();
for (const record of problematic.records ?? []) {
  for (const trackId of record.affectedTrackIds ?? []) {
    if (!problematicByTrack.has(trackId)) problematicByTrack.set(trackId, []);
    problematicByTrack.get(trackId).push({ assetId: record.identity, formId: record.formId, postLaunchPriority: record.postLaunchPriority, owner: record.owner });
  }
}

// --------------------------------------------------------------------------- records
const records = [];
for (const pathway of graph.pathways) {
  const code = pathway.jurisdiction;
  const trackIds = pathway.registryTrackIds ?? [];

  // --- bridge import ------------------------------------------------------
  const sets = trackIds.map((t) => packetSetByTrack.get(t)).filter(Boolean);
  const packetFamilyBridge = {
    source: "data/record-clearing/legal-design-packet-set-manifests.json",
    scope: "all 497 registry tracks",
    supersedesForThisPurpose: graph.bridge?.trackToFamilySource ?? null,
    packetSets: sets.map((s) => ({
      packetSetId: s.packetSetId,
      trackId: s.trackId,
      version: s.version,
      components: (s.components ?? []).map((c) => ({
        componentId: c.componentId,
        role: c.role,
        requirement: c.requirement,
        outputStrategy: c.outputStrategy,
        officialFormId: c.officialFormId,
        officialSourceUrl: c.officialSourceUrl
      })),
      requiredBeforeFiling: s.requiredBeforeFiling ?? null,
      participantActionRequired: s.participantActionRequired ?? []
    })),
    tracksWithNoPacketSet: trackIds.filter((t) => !packetSetByTrack.has(t)),
    sourceRelationshipCount: trackIds.reduce((n, t) => n + (relationshipsByTrack.get(t)?.length ?? 0), 0)
  };

  // --- registry classification -------------------------------------------
  let registryClassification;
  if (trackIds.length === 0) {
    registryClassification = {
      kind: "registry_gap_no_track",
      statement: "No registry track maps to this compiled pathway, so there is nothing to bridge to a packet family. This is a registry gap in the track-to-pathway crosswalk, not an absence of counsel coverage."
    };
  } else if (sets.length === 0) {
    registryClassification = {
      kind: "registry_gap_no_packet_set",
      statement: `Tracks ${trackIds.join(", ")} map to this pathway but carry no packet set in the manifest, so no family can be derived.`
    };
  } else {
    registryClassification = {
      kind: "exact_track_and_packet_set",
      statement: `Tracks ${trackIds.join(", ")} map to this pathway and each carries an exact packet set (${sets.map((s) => s.packetSetId).join(", ")}).`
    };
  }

  // --- what the bridge import did to Session A's reason -------------------
  const bridgeImportEffect = pathway.disposition === "family_bridge_missing_no_family" && sets.length > 0
    ? {
      changed: true,
      sessionADisposition: pathway.disposition,
      sessionAReason: pathway.statement,
      afterImport: "packet_set_bridge_present",
      statement: "Session A's join reported no track-to-family bridge because it read the lane-D map. The all-497 packet-set manifest in this repository does carry a set for these tracks, so the bridge is present. Whether the adoption reaches it is still counsel's determination."
    }
    : { changed: false, sessionADisposition: pathway.disposition, sessionAReason: pathway.statement, afterImport: pathway.disposition };

  // --- adoption -----------------------------------------------------------
  const jurisdictionBound = boundJurisdictions.has(code);
  const jurisdictionFamilies = adoption.boundFamilies.filter((f) => f.jurisdiction === code).map((f) => ({
    familyJobId: f.familyJobId,
    legalDesignMemoSha256: f.legalDesignMemoSha256,
    packetProofSha256: f.packetProofSha256,
    implementationCommit: f.implementationCommit,
    carriesSupersededTechnicalResult: supersededFamilies.has(f.familyJobId)
  }));
  const adoptionJoin = {
    recordId: adoption.recordId,
    adoptedOn: adoption.adoptedOn,
    scopeLevel: adoption.scope.level,
    recordSha256: inputs.extAdopt01.sha256,
    jurisdictionIsBound: jurisdictionBound,
    boundFamiliesInThisJurisdiction: jurisdictionFamilies,
    sessionAAdoptionRecordId: pathway.adoptionRecordId ?? null,
    sessionABoundFamilyEvidence: pathway.boundFamilyEvidence ?? []
  };

  // --- completed output ---------------------------------------------------
  const completedOutput = trackIds.flatMap((t) => (completedOutputByTrack.get(t) ?? []).map((o) => ({ trackId: t, ...o })));

  // --- counsel exception --------------------------------------------------
  // Conservative on purpose. An existing adoption whose reach is unclear is a
  // determination owed to counsel, not a new exception; calling it an exception
  // would manufacture counsel work that may already be covered.
  let counselException;
  if (pathway.disposition === "legal_action_required") {
    counselException = {
      isGenuineNewException: true,
      reason: "session_a_recorded_legal_action_required",
      statement: pathway.statement
    };
  } else if (!jurisdictionBound) {
    counselException = {
      isGenuineNewException: true,
      reason: "no_bound_family_in_this_jurisdiction",
      statement: `${code} has no bound family in EXT-ADOPT-01 at all, so there is no existing counsel record to reason from. A new adoption is genuinely required.`
    };
  } else {
    counselException = {
      isGenuineNewException: false,
      reason: "existing_counsel_record_exists_reach_is_a_determination",
      statement: `${code} carries ${jurisdictionFamilies.length} bound famil${jurisdictionFamilies.length === 1 ? "y" : "ies"} in EXT-ADOPT-01. Whether that adoption reaches this pathway is a determination for counsel and Session A. It is not a new exception and this packet does not decide it.`
    };
  }

  // --- witness ------------------------------------------------------------
  const w = witnessByPathway.get(pathway.pathwayKey) ?? null;
  const publicWitness = w
    ? {
      publicRoute: w.publicRoute,
      evaluationEndpoint: w.evaluationEndpoint,
      profileVersion: w.profileVersion,
      pathwayContextOffered: w.pathwayContextOffered,
      seedAnswers: w.seedAnswers,
      rounds: w.rounds.length,
      finalAnswerCount: Object.keys(w.finalAnswers).length,
      terminalEvaluation: w.terminalEvaluation,
      landedOnThisPathway: w.landedOnThisPathway,
      error: w.error,
      answerSetRef: `data/rcap-ledger/public-witness-answer-sets.json#witnesses[pathwayKey=${pathway.pathwayKey}]`
    }
    : null;

  records.push({
    pathwayKey: pathway.pathwayKey,
    jurisdiction: code,
    pathwayId: pathway.pathwayId,
    pathwayLabel: pathway.pathwayLabel,
    sessionAGraph: {
      disposition: pathway.disposition,
      statement: pathway.statement,
      registryTrackIds: trackIds,
      packetFamilies: pathway.packetFamilies ?? [],
      lawrenceRatification: pathway.lawrenceRatification ?? null,
      ledgerSaysLegalReviewPending: pathway.ledgerSaysLegalReviewPending === true,
      consumedVerbatim: true
    },
    packetFamilyBridge,
    registryClassification,
    bridgeImportEffect,
    adoptionJoin,
    completedOutput,
    problematicPdfAssets: trackIds.flatMap((t) => (problematicByTrack.get(t) ?? []).map((p) => ({ trackId: t, ...p }))),
    publicWitness,
    counselException
  });
}

// --------------------------------------------------------------------------- totals
const tally = (list, fn) => list.reduce((m, x) => { const k = fn(x); m[k] = (m[k] ?? 0) + 1; return m; }, {});

const sessionADispositions = tally(records, (r) => r.sessionAGraph.disposition);
const registryClassifications = tally(records, (r) => r.registryClassification.kind);
const bridgeResolved = records.filter((r) => r.bridgeImportEffect.changed);
const exceptions = records.filter((r) => r.counselException.isGenuineNewException);
const exceptionReasons = tally(exceptions, (r) => r.counselException.reason);
const withCompletedOutput = records.filter((r) => r.completedOutput.length > 0);

const packet = {
  schemaVersion: "rcap-session-a-evidence-packet/v1",
  generatedBy: "scripts/generate-rcap-session-a-evidence-packet.mjs",
  forSession: "A (sole integration and release captain)",
  canonicalGraphOwner: "Session A",
  canonicalGraph: inputs.sessionAPathwayFamilyGraph,
  doesNotMaintainASeparateDenominator:
    "The denominator here is Session A's graph, consumed as-is: every pathway key, registry track list and disposition comes from data/rcap-ledger/paid-pathway-legal-join.json and none is recomputed. data/rcap-ledger/sellable-pathway-closure.json remains only as the denominator input Session A already integrated; it is not a rival canonical record and nothing in this packet re-derives it.",
  createsApproval: false,
  changesRuntime: false,
  inputs,
  totals: {
    pathways: records.length,
    sessionADispositions,
    registryClassifications,
    bridgeImportResolved: bridgeResolved.length,
    pathwaysWithCompletedOutputEvidence: withCompletedOutput.length,
    genuineNewCounselExceptions: exceptions.length,
    genuineNewCounselExceptionReasons: exceptionReasons,
    determinationsOwedToCounselNotExceptions: records.length - exceptions.length,
    publicWitness: {
      settled: records.filter((r) => r.publicWitness?.terminalEvaluation).length,
      landedOnTheirOwnPathway: records.filter((r) => r.publicWitness?.landedOnThisPathway).length,
      paymentAllowedAtTheEvaluator: records.filter((r) => r.publicWitness?.terminalEvaluation?.paymentAllowed).length
    }
  },
  packetFamilyBridgeReconciliation: {
    sessionABridge: graph.bridge ?? null,
    importedBridge: {
      path: "data/record-clearing/legal-design-packet-set-manifests.json",
      sha256: inputs.packetFamilyBridge.sha256,
      trackCount: packetSets.packetSets.length,
      scope: "every registry track"
    },
    effect:
      `Session A's join reported ${sessionADispositions.family_bridge_missing_no_family ?? 0} pathway(s) as family_bridge_missing_no_family because the bridge it reads covers lane D only. ` +
      `Importing the all-497 packet-set manifest supplies an exact packet set for ${bridgeResolved.length} of them. ` +
      `That changes the REASON, never the coverage answer: a bridged pathway is one whose family can now be named, not one an adoption has been shown to cover.`,
    stillUnbridgeable: records.filter((r) => r.registryClassification.kind !== "exact_track_and_packet_set").length
  },
  genuineNewCounselExceptions: exceptions.map((r) => ({
    pathwayKey: r.pathwayKey,
    jurisdiction: r.jurisdiction,
    reason: r.counselException.reason,
    statement: r.counselException.statement
  })),
  records
};

// --------------------------------------------------------------------------- report
function md() {
  const l = [];
  l.push("# Session A evidence packet");
  l.push("");
  l.push(`One record for each of the **${records.length}** intended-paid pathways in Session A's canonical`);
  l.push("pathway-family graph. The graph is consumed as-is: every pathway key, registry track list");
  l.push("and disposition is Session A's. Nothing here recomputes a disposition, maintains a rival");
  l.push("denominator, changes runtime, or issues an approval.");
  l.push("");
  l.push("## Inputs, pinned");
  l.push("");
  l.push("| Input | Source | sha256 |");
  l.push("|---|---|---|");
  for (const [name, i] of Object.entries(inputs)) {
    l.push(`| \`${name}\` | ${i.source}${i.ref ? ` @ \`${String(i.ref).slice(0, 8)}\`` : ""} | ${i.sha256 ? `\`${i.sha256.slice(0, 16)}…\`` : `${i.count} file(s)`} |`);
  }
  l.push("");
  l.push("## 1 — The packet-family bridge, imported and reconciled");
  l.push("");
  l.push(`Session A's join reads \`${graph.bridge?.trackToFamilySource ?? "(none)"}\`, which is`);
  l.push("lane-D scoped and marked `proposed_noncanonical_analysis`. The repository also carries");
  l.push("`data/record-clearing/legal-design-packet-set-manifests.json`, a packet set for **all 497**");
  l.push("registry tracks with every component's role, requirement, output strategy and official form id.");
  l.push("");
  l.push("| Session A disposition | Pathways | After importing the bridge |");
  l.push("|---|---|---|");
  for (const [k, v] of Object.entries(sessionADispositions).sort((a, b) => b[1] - a[1])) {
    const resolved = records.filter((r) => r.sessionAGraph.disposition === k && r.bridgeImportEffect.changed).length;
    l.push(`| \`${k}\` | ${v} | ${resolved > 0 ? `**${resolved}** now carry an exact packet set` : "unchanged"} |`);
  }
  l.push("");
  l.push(`**${bridgeResolved.length}** pathways move from "no track-to-family bridge" to a named packet set.`);
  l.push("This changes the **reason**, never the coverage answer. A bridged pathway is one whose");
  l.push("family can now be named — not one an adoption has been shown to cover.");
  l.push("");
  l.push("## 2 — Registry-gap classification");
  l.push("");
  l.push("| Classification | Pathways |");
  l.push("|---|---|");
  for (const [k, v] of Object.entries(registryClassifications).sort((a, b) => b[1] - a[1])) l.push(`| \`${k}\` | ${v} |`);
  l.push("");
  l.push("Nothing is left as \"unknown\": every pathway is an exact track-and-packet-set, or an");
  l.push("explicitly named registry gap.");
  l.push("");
  l.push("## 3 — EXT-ADOPT-01 and completed-output evidence");
  l.push("");
  l.push(`- Adoption \`${adoption.recordId}\`, adopted **${adoption.adoptedOn}**, scope \`${adoption.scope.level}\`, sha256 \`${inputs.extAdopt01.sha256.slice(0, 16)}…\``);
  l.push(`- Bound families: **${adoption.boundFamilies.length}** across **${boundJurisdictions.size}** jurisdictions`);
  l.push(`- Completed-output packet proofs read: **${proofs.length}**`);
  l.push(`- Pathways carrying completed-output evidence by exact track id: **${withCompletedOutput.length}**`);
  l.push("");
  l.push("Each record carries the assembled artifact filename, sha256, page count, the verifier that");
  l.push("passed it, whether its family is adopted, and whether that family carries a superseded");
  l.push("technical result.");
  l.push("");
  l.push("## 4 — Deterministic public witness");
  l.push("");
  l.push(`Answer sets live in \`data/rcap-ledger/public-witness-answer-sets.json\` — no randomness,`);
  l.push("re-running reproduces the file byte for byte, and `--check` proves it.");
  l.push("");
  l.push(`- Settled on a terminal evaluation: **${packet.totals.publicWitness.settled}** of ${records.length}`);
  l.push(`- Landed on their own pathway: **${packet.totals.publicWitness.landedOnTheirOwnPathway}**`);
  l.push(`- Payment allowed at the evaluator: **${packet.totals.publicWitness.paymentAllowedAtTheEvaluator}**`);
  l.push("");
  l.push("## 5 — Genuine new counsel exceptions");
  l.push("");
  l.push(`**${exceptions.length}** of ${records.length}.`);
  l.push("");
  l.push("| Reason | Pathways |");
  l.push("|---|---|");
  for (const [k, v] of Object.entries(exceptionReasons).sort((a, b) => b[1] - a[1])) l.push(`| \`${k}\` | ${v} |`);
  l.push("");
  l.push(`The other **${records.length - exceptions.length}** are not exceptions. Their jurisdiction carries a bound family in`);
  l.push("EXT-ADOPT-01, so an existing counsel record exists; whether it reaches the pathway is a");
  l.push("determination for counsel and Session A. Calling those exceptions would manufacture counsel");
  l.push("work that may already be covered, so this packet does not.");
  l.push("");
  l.push(`Jurisdictions with no bound family at all: ${[...new Set(exceptions.filter((e) => e.counselException?.reason !== "session_a_recorded_legal_action_required").map((e) => e.jurisdiction))].sort().map((c) => `\`${c}\``).join(", ") || "—"}.`);
  l.push("");
  l.push("Regenerate with `npm run rcap:generate-session-a-packet`; verify with `npm run rcap:verify-session-a-packet`.");
  return l.join("\n") + "\n";
}

const jsonText = JSON.stringify(packet, null, 2) + "\n";
const mdText = md();

if (CHECK) {
  const problems = [];
  if (readLocal(JSON_OUT) !== jsonText) problems.push(`${JSON_OUT} is stale; regenerate it.`);
  if (readLocal(MD_OUT) !== mdText) problems.push(`${MD_OUT} is stale; regenerate it.`);
  if (problems.length > 0) {
    console.error("generate-rcap-session-a-evidence-packet --check FAILED:");
    for (const p of problems) console.error(` - ${p}`);
    process.exit(1);
  }
  console.log(`session A evidence packet current: ${records.length} pathway record(s).`);
  process.exit(0);
}

fs.writeFileSync(path.join(rootDir, JSON_OUT), jsonText);
fs.writeFileSync(path.join(rootDir, MD_OUT), mdText);
console.log(`wrote ${JSON_OUT} and ${MD_OUT}`);
console.log(`  consumed Session A graph from ${inputs.sessionAPathwayFamilyGraph.source}${inputs.sessionAPathwayFamilyGraph.ref ? ` @ ${inputs.sessionAPathwayFamilyGraph.ref.slice(0, 8)}` : ""}`);
console.log(`  Session A dispositions: ${JSON.stringify(sessionADispositions)}`);
console.log(`  bridge import resolved: ${bridgeResolved.length}`);
console.log(`  registry classifications: ${JSON.stringify(registryClassifications)}`);
console.log(`  completed-output evidence on ${withCompletedOutput.length} pathway(s)`);
console.log(`  genuine new counsel exceptions: ${exceptions.length} ${JSON.stringify(exceptionReasons)}`);
