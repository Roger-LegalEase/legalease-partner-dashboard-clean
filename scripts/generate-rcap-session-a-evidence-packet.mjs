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
//   5. THE OWNER-APPROVED LEGAL STATUS of each pathway. There is no counsel
//      queue: the decision owner approved the existing legal designs, the
//      completed outputs, the exception set, and the application of those
//      approved designs across the intended-paid corpus. A pathway supported by
//      an existing legal-design packet set is approved. Only a genuinely new
//      substantive legal choice escalates, and it escalates to the decision
//      owner rather than to counsel.
//
// This is a release artifact, so every input must resolve from the current
// working tree. The lane version could fall back to reading Session A's inputs
// out of an earlier commit, which was right while the two branches were apart
// and is wrong now: a packet that silently reads a stale graph reports a
// denominator nobody can reproduce from HEAD. There is no fallback here. Each
// input is recorded with its exact sha256, and the graph itself is additionally
// required to be the artifact HEAD's own generator produces — not merely a file
// that happens to be present.

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { OWNER_APPROVED, OWNER_PENDING, readOwnerLegalDecision } from "./lib/rcap-owner-legal-decision.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(rootDir);

const CHECK = process.argv.includes("--check");

const JSON_OUT = "data/rcap-ledger/session-a-evidence-packet.json";
const MD_OUT = "docs/record-clearing/session-a-evidence-packet.md";

const sha256 = (v) => crypto.createHash("sha256").update(v).digest("hex");
const readLocal = (p) => fs.readFileSync(path.join(rootDir, p), "utf8");
const git = (args) => execFileSync("git", args, { cwd: rootDir, encoding: "utf8", maxBuffer: 256 * 1024 * 1024 });

/** An input, required to be present in the working tree. No fallback ref. */
function requiredInput(relPath) {
  if (!fs.existsSync(path.join(rootDir, relPath))) {
    throw new Error(`${relPath} is not in the working tree. This packet is a release artifact and reads no other source: there is no commit fallback, so a missing input is a failure rather than a silent substitution.`);
  }
  const raw = readLocal(relPath);
  return { raw, source: "working_tree", ref: null, sha256: sha256(raw) };
}

/**
 * The canonical graph must be what HEAD's own generator produces, not merely a
 * file sitting at the right path. A stale graph would silently change every
 * count in this packet, so the generator is asked directly.
 */
function assertGraphIsHeadsOwnArtifact() {
  try {
    execFileSync("node", ["scripts/generate-rcap-paid-pathway-legal-join.mjs", "--check"], {
      cwd: rootDir,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
  } catch (error) {
    const detail = `${error.stdout ?? ""}${error.stderr ?? ""}`.trim();
    throw new Error(`The canonical pathway-family graph is not the artifact this tree's generator produces, so this packet would report a denominator nobody can reproduce from HEAD. Regenerate it first.\n  ${detail}`);
  }
}

const inputs = {};
function load(name, relPath) {
  const input = requiredInput(relPath);
  inputs[name] = { path: relPath, source: input.source, ref: input.ref, sha256: input.sha256 };
  return JSON.parse(input.raw);
}

// --------------------------------------------------------------------------- inputs
assertGraphIsHeadsOwnArtifact();
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
if (!fs.existsSync(path.join(rootDir, PROOF_DIR))) {
  throw new Error(`${PROOF_DIR} is not in the working tree. This packet reads the completed-output proofs from HEAD only.`);
}
const proofNames = fs.readdirSync(path.join(rootDir, PROOF_DIR)).filter((f) => f.endsWith(".json")).sort();
const proofInputs = proofNames.map((name) => requiredInput(`${PROOF_DIR}/${name}`));
const proofs = proofInputs.map((input) => JSON.parse(input.raw));
inputs.completedOutputPacketProofs = {
  path: PROOF_DIR,
  source: "working_tree",
  ref: null,
  count: proofs.length,
  // One hash over the whole set, in the sorted order read, so a changed proof
  // is visible here rather than only inside a record.
  sha256: sha256(proofNames.map((name, i) => `${name}:${proofInputs[i].sha256}`).join("\n"))
};

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

// --------------------------------------------------------------------------- legal status
// The decision owner's recorded approval, read from the authorization queue by
// the same reader the canonical graph uses. It approved the existing legal
// designs, the completed outputs, the exception set, and the application of
// those approved designs across the intended-paid corpus.
const ownerDecision = readOwnerLegalDecision();
const ownerDecisionRecord = ownerDecision.approved ? ownerDecision.records[0] : null;
inputs.ownerLegalDecision = {
  path: "data/rcap-authorization-queue.json",
  source: "working_tree",
  ref: null,
  sha256: sha256(readLocal("data/rcap-authorization-queue.json")),
  recordId: ownerDecisionRecord?.recordId ?? null
};

// The escalation list, verbatim from the owner's recorded decision. Anything on
// it is a new substantive legal choice and goes back to the decision owner;
// nothing else does, and in particular a technical correction never does.
const SUBSTANTIVE_LEGAL_CHOICES = ownerDecisionRecord?.requiresANewDecisionOwnerDecision ?? [];

function ownerApprovedLegalStatus({ pathway, sets, trackIds, jurisdictionBound, jurisdictionFamilies }) {
  const decisionRef = ownerDecisionRecord
    ? `${ownerDecisionRecord.decisionOwner} under ${ownerDecisionRecord.recordId}, effective ${ownerDecisionRecord.effectiveDate}`
    : null;

  if (!ownerDecisionRecord) {
    return {
      status: OWNER_PENDING,
      basis: "no_owner_decision_recorded",
      escalationRequired: true,
      statement: "No approved owner_legal_decision entry exists in the authorization queue, so nothing here is approved."
    };
  }

  // The graph already applied the owner's decision at family level, so where a
  // named family carries this pathway that is the answer and this packet does
  // not relitigate it.
  const namedFamilies = pathway.ownerApprovedFamilies ?? [];
  if (pathway.legalStatus === OWNER_APPROVED && namedFamilies.length > 0) {
    return {
      status: OWNER_APPROVED,
      basis: "owner_approved_packet_family",
      escalationRequired: false,
      packetFamilies: namedFamilies,
      statement: `${decisionRef} approved the completed output of ${namedFamilies.join(", ")}, the packet famil${namedFamilies.length === 1 ? "y" : "ies"} this pathway resolves to.`
    };
  }

  // The family-level adoption never enumerated every track, but the all-497
  // packet-set manifest defines the treatment. Roger's decision applies the
  // approved designs across the intended-paid corpus, so an exact packet set is
  // the support the decision names — the absent EXT-ADOPT-01 family metadata is
  // not a new legal choice.
  if (sets.length > 0 && sets.length === trackIds.length) {
    return {
      status: OWNER_APPROVED,
      basis: "owner_approved_existing_legal_design_packet_set",
      escalationRequired: false,
      packetSetIds: sets.map((s) => s.packetSetId),
      statement: `Every track on this pathway carries an exact legal-design packet set (${sets.map((s) => s.packetSetId).join(", ")}). ${decisionRef} approved applying the existing approved designs across the intended-paid corpus, and missing EXT-ADOPT-01 family metadata is not a new substantive legal choice where the all-497 manifest already defines the treatment.${jurisdictionBound ? ` ${pathway.jurisdiction} additionally carries ${jurisdictionFamilies.length} bound famil${jurisdictionFamilies.length === 1 ? "y" : "ies"} in EXT-ADOPT-01.` : ""}`
    };
  }

  // Approved through the exception annex rather than through a family or a
  // packet set: the jurisdiction or the named legal action is in the annex the
  // owner adopted, but this repository still cannot name the treatment.
  if (pathway.legalStatus === OWNER_APPROVED) {
    return {
      status: OWNER_APPROVED,
      basis: "owner_approved_exception_annex",
      escalationRequired: false,
      statement: `${decisionRef} approved this pathway through the exception annex. ${pathway.legalStatement} No packet set names its treatment yet, so it is legally approved and not yet buildable.`
    };
  }

  if (sets.length > 0) {
    return {
      status: OWNER_PENDING,
      basis: "partial_packet_set_coverage",
      escalationRequired: false,
      statement: `${sets.length} of ${trackIds.length} tracks on this pathway carry a packet set. The remainder have no defined treatment to apply an approved design to, which is a registry and packet-definition gap rather than a legal question.`
    };
  }

  return {
    status: OWNER_PENDING,
    basis: trackIds.length === 0 ? "registry_gap_no_track" : "no_packet_set_for_any_track",
    escalationRequired: false,
    statement: trackIds.length === 0
      ? "No registry track maps to this compiled pathway, so there is no packet set for an approved design to be applied to. That is a registry-ownership action, not a legal decision."
      : `Tracks ${trackIds.join(", ")} carry no packet set, so there is no defined treatment to apply an approved design to.`
  };
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

  // --- owner-approved legal status ---------------------------------------
  // There is no counsel queue here and no determination owed. The decision
  // owner approved the existing legal designs, the completed outputs, the
  // exception set, and the application of those approved designs across the
  // intended-paid corpus. So a pathway supported by an existing legal-design
  // packet set is approved, and the only thing that escalates is a genuinely
  // new substantive legal choice.
  //
  // Missing EXT-ADOPT-01 family metadata is explicitly NOT such a choice: the
  // all-497 packet-set manifest already defines the treatment, and the older
  // family-level adoption simply never enumerated it.
  const ownerApprovedLegal = ownerApprovedLegalStatus({
    pathway,
    sets,
    trackIds,
    jurisdictionBound,
    jurisdictionFamilies
  });

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
    ownerApprovedLegal
  });
}

// --------------------------------------------------------------------------- totals
const tally = (list, fn) => list.reduce((m, x) => { const k = fn(x); m[k] = (m[k] ?? 0) + 1; return m; }, {});

const sessionADispositions = tally(records, (r) => r.sessionAGraph.disposition);
const registryClassifications = tally(records, (r) => r.registryClassification.kind);
const bridgeResolved = records.filter((r) => r.bridgeImportEffect.changed);
const ownerApproved = records.filter((r) => r.ownerApprovedLegal.status === OWNER_APPROVED);
const ownerApprovalBases = tally(records, (r) => r.ownerApprovedLegal.basis);
const escalations = records.filter((r) => r.ownerApprovedLegal.escalationRequired);
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
    ownerApprovedLegal: ownerApproved.length,
    ownerApprovalBases,
    escalationsToTheDecisionOwner: escalations.length,
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
  ownerLegalDecision: ownerDecisionRecord
    ? {
        approved: true,
        result: OWNER_APPROVED,
        record: ownerDecisionRecord,
        note: "There is no counsel queue. The decision owner approved the existing legal designs, the completed outputs, the exception set and the application of those approved designs across the intended-paid corpus. No signature or separate counsel artifact is required or represented.",
        escalateOnly: SUBSTANTIVE_LEGAL_CHOICES,
        missingAdoptionMetadataIsNotAnEscalation:
          "Missing EXT-ADOPT-01 family metadata is not a new legal decision where the all-497 legal-design packet-set manifest already defines the treatment."
      }
    : { approved: false, reason: ownerDecision.reason },
  escalationsToTheDecisionOwner: escalations.map((r) => ({
    pathwayKey: r.pathwayKey,
    jurisdiction: r.jurisdiction,
    basis: r.ownerApprovedLegal.basis,
    statement: r.ownerApprovedLegal.statement
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
  l.push("## 5 — Owner-approved legal status");
  l.push("");
  l.push(ownerDecisionRecord
    ? `Approved by **${ownerDecisionRecord.decisionOwner}** under \`${ownerDecisionRecord.recordId}\`, effective ${ownerDecisionRecord.effectiveDate}. There is no counsel queue here: the existing legal designs, the completed outputs, the exception set and the application of those approved designs across the intended-paid corpus are all approved, and no signature or separate counsel artifact is required.`
    : "No approved `owner_legal_decision` entry exists in the authorization queue, so every pathway reads back `owner_approval_pending`.");
  l.push("");
  l.push(`**${ownerApproved.length}** of ${records.length} pathways carry owner-approved legal status.`);
  l.push("");
  l.push("| Basis | Pathways |");
  l.push("|---|---|");
  for (const [k, v] of Object.entries(ownerApprovalBases).sort((a, b) => b[1] - a[1])) l.push(`| \`${k}\` | ${v} |`);
  l.push("");
  l.push("Missing EXT-ADOPT-01 family metadata is **not** a new legal decision where the all-497");
  l.push("packet-set manifest already defines the treatment — that is the `owner_approved_existing_legal_design_packet_set`");
  l.push("basis. What remains pending is a registry or packet-definition gap: there is no defined");
  l.push("treatment for an approved design to be applied to, which is an ownership action rather than");
  l.push("a legal question.");
  l.push("");
  l.push(`Escalations to the decision owner: **${escalations.length}**. Only a genuinely new substantive legal choice escalates —`);
  l.push(SUBSTANTIVE_LEGAL_CHOICES.map((c) => `${c}`).join("; ") + ".");
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
console.log(`  owner-approved legal: ${ownerApproved.length} of ${records.length} ${JSON.stringify(ownerApprovalBases)}`);
console.log(`  escalations to the decision owner: ${escalations.length}`);
