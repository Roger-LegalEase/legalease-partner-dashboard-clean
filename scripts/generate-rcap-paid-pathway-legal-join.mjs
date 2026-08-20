#!/usr/bin/env node
// The deterministic join from an intended-paid pathway to the counsel record
// that does or does not already cover it.
//
// The closure ledger reports 232 of 284 intended-paid pathways as
// `legal_review_pending`, because it derives legal approval from one optional
// field — `lawrenceRatification` — on the compiled pathway. That is not the same
// question as "has counsel already adopted this packet family".
//
// A standing external counsel adoption exists: EXT-ADOPT-01, adopted
// 2026-08-08, family-level and standing, binding 57 packet families across 45
// jurisdictions, with an explicit continuity policy that does NOT require a new
// adoption for regenerated evidence, layout-only corrections or technical
// corrections. Its sha256 is pinned inside the D adoption-continuity analysis
// and verified here on every run.
//
// This joins:
//
//   compiled pathway
//     -> registry track            (track-pathway crosswalk)
//     -> packet family             (D track-family map / canonical job id)
//     -> standing adoption record  (EXT-ADOPT-01 boundFamilies)
//     -> scope + hash disposition
//
// It creates no approval. It widens no adoption. Where the bridge from a
// pathway to a packet family does not exist in this repository, it says so as
// its own finding rather than counting the pathway as either covered or as a
// new counsel review — because neither would be true.
//
//   node scripts/generate-rcap-paid-pathway-legal-join.mjs [--check]

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  OWNER_APPROVED,
  OWNER_PENDING,
  annexJurisdictionStatus,
  familyLegalStatus,
  legalActionStatus,
  readOwnerLegalDecision
} from "./lib/rcap-owner-legal-decision.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CHECK = process.argv.includes("--check");
const OUT = path.join(rootDir, "data/rcap-ledger/paid-pathway-legal-join.json");

const read = (rel) => JSON.parse(fs.readFileSync(path.join(rootDir, rel), "utf8"));
const sha256 = (rel) => crypto.createHash("sha256").update(fs.readFileSync(path.join(rootDir, rel))).digest("hex");

const ADOPTION = "data/record-clearing/template-families/EXT-ADOPT-01-standing-external-counsel-adoption.json";
// Pinned by the D adoption-continuity analysis, which is on main and names the
// exact bytes it reasoned over. A different record is a different adoption.
const ADOPTION_SHA256 = "7bea6b4c78cde50a4075bb107ea08a4804f2af3d5add75b245ebc37afaef1185";

const actual = sha256(ADOPTION);
if (actual !== ADOPTION_SHA256) {
  console.error(`The standing counsel adoption record does not match the bytes the continuity analysis reasoned over.\n  expected ${ADOPTION_SHA256}\n  actual   ${actual}`);
  process.exit(1);
}

const adoption = read(ADOPTION);
const closure = read("data/rcap-ledger/sellable-pathway-closure.json");
const crosswalk = read("data/rcap-ledger/track-pathway-crosswalk.json");
const familyMap = read("data/rcap-codex/d-track-terminalization/track-family-map.json");
const continuity = read("data/rcap-codex/d-adoption-continuity/track-adoption.json");
const reconciliation = read("data/rcap-all50/review-artifacts/d-adoption-reconciliation.json");

// ---------------------------------------------------------------------------
// The adoption's exact scope. Family-level, so a jurisdiction is in scope only
// through a family that is actually bound.
// ---------------------------------------------------------------------------
const boundByFamily = new Map(adoption.boundFamilies.map((f) => [f.familyJobId, f]));
const boundJurisdictions = new Set(adoption.boundFamilies.map((f) => f.jurisdiction));
const supersededFamilies = new Set((adoption.familiesCarryingSupersededTechnicalResult ?? []).map((f) => f.familyJobId));
const outsideStandingScopeTracks = new Set(continuity.adoptionInventory?.outsideStandingScopeTrackIds ?? []);
const staleTracks = new Set(
  (reconciliation.tracks ?? [])
    .filter((t) => t.reconciledStatus === "stale_due_to_substantive_family_change")
    .map((t) => t.trackId)
);

// ---------------------------------------------------------------------------
// pathway -> registry track(s). The crosswalk records the mapping on the track,
// so it is inverted once.
// ---------------------------------------------------------------------------
const tracksByPathway = new Map();
for (const track of crosswalk.registryTracks ?? []) {
  for (const pathwayId of track.mappedCompiledPathwayIds ?? []) {
    const key = `${track.jurisdiction}:${pathwayId}`;
    if (!tracksByPathway.has(key)) tracksByPathway.set(key, []);
    tracksByPathway.get(key).push(track);
  }
}

// ---------------------------------------------------------------------------
// track -> packet family. The D map is the only track-to-family bridge in this
// repository, and it covers lane D only, so most tracks resolve to nothing.
// That absence is reported, never guessed around.
// ---------------------------------------------------------------------------
const proofGates = new Map();
const familyByTrack = new Map();
const addFamily = (trackId, familyJobId) => {
  if (!trackId || !familyJobId) return;
  if (!familyByTrack.has(trackId)) familyByTrack.set(trackId, new Set());
  familyByTrack.get(trackId).add(familyJobId);
};
// The adopted families' own packet proofs name the tracks they serve. This is
// the exact bridge for the adopted scope and widens nothing: a family reaches
// only the tracks its own proof lists.
for (const family of adoption.boundFamilies) {
  const proofPath = family.packetProofPath;
  if (!proofPath || !fs.existsSync(path.join(rootDir, proofPath))) continue;
  if (family.packetProofSha256 && sha256(proofPath) !== family.packetProofSha256) {
    console.error(`packet proof ${proofPath} does not match the hash the adoption bound; refusing to join on drifted bytes`);
    process.exit(1);
  }
  const proof = read(proofPath);
  proofGates.set(family.familyJobId, {
    counselAdopted: proof.counselAdopted ?? null,
    completedOutputLegalReview: proof.completedOutputLegalReview ?? null,
    visualReview: proof.visualReview ?? null,
    packetReady: proof.packetReady ?? null
  });
  for (const sample of proof.samplePackets ?? []) addFamily(sample.trackId, family.familyJobId);
}
for (const track of familyMap.tracks ?? []) {
  const families = [
    track.canonicalImplementationJobId,
    ...(track.exactFamilyJobIds ?? []),
    ...(track.familyJobIds ?? [])
  ].filter((value) => typeof value === "string" && value.trim() !== "");
  for (const familyJobId of families) addFamily(track.trackId, familyJobId);
}

// The decision-owner legal approval, read from the authorization queue. Absent
// or declined, this is {approved:false} and every row falls back to the
// counsel-record analysis, which is where this join started.
const ownerDecision = readOwnerLegalDecision();

const paid = (closure.pathways ?? []).filter((p) => p.category === "paid_packet_intended");

const rows = [];
for (const pathway of paid) {
  const key = `${pathway.jurisdiction}:${pathway.pathwayId}`;
  const tracks = tracksByPathway.get(key) ?? [];
  const trackIds = tracks.map((t) => t.registryTrackId);
  const families = [...new Set(trackIds.flatMap((id) => [...(familyByTrack.get(id) ?? [])]))];
  const bound = families.map((f) => boundByFamily.get(f)).filter(Boolean);

  const hasLegalActionRequired = (pathway.openBlockers ?? []).some((b) => b.id === "legal_action_required");
  const needsReconfirm = (pathway.openBlockers ?? []).some((b) => b.id === "legal_reconfirmation")
    || families.some((f) => supersededFamilies.has(f))
    || trackIds.some((id) => staleTracks.has(id));
  const explicitlyOutside = trackIds.some((id) => outsideStandingScopeTracks.has(id));

  // Two different questions, kept apart on purpose.
  //
  // The legal question is "has the decision owner approved the legal design and
  // completed output behind this route". The bridge question is "does this
  // repository know which packet family the route uses at all". A route can be
  // legally approved and still have no family bridge, and collapsing the two
  // would let an owner decision paper over a missing bridge — which is exactly
  // the data gap that has to be closed, not relabelled.
  const ownerApprovedFamilies = families.filter((f) => familyLegalStatus(ownerDecision, f) === OWNER_APPROVED);
  const ownerAnnexedLegalAction = hasLegalActionRequired && legalActionStatus(ownerDecision, key) === OWNER_APPROVED;
  const ownerAnnexedJurisdiction = annexJurisdictionStatus(ownerDecision, pathway.jurisdiction) === OWNER_APPROVED;

  // Legal status, decided only by the owner's recorded decision.
  let legalStatus;
  let legalStatement;
  if (hasLegalActionRequired && !ownerAnnexedLegalAction) {
    legalStatus = OWNER_PENDING;
    legalStatement = "The closure ledger records a named legal action on this route, and no owner decision names it.";
  } else if (families.length > 0 && ownerApprovedFamilies.length === families.length) {
    legalStatus = OWNER_APPROVED;
    legalStatement = `${ownerDecision.records[0].decisionOwner} approved the completed output of ${ownerApprovedFamilies.join(", ")} on ${ownerDecision.records[0].effectiveDate} under ${ownerDecision.records[0].recordId}${ownerAnnexedLegalAction ? ", including this route's named legal action through the exception annex" : ""}. EXT-ADOPT-01 adopted the legal design on ${adoption.adoptedOn}; the owner's decision closes the completed-output gate that adoption left open.`;
  } else if (families.length > 0) {
    legalStatus = OWNER_PENDING;
    legalStatement = `The pathway resolves to ${families.length === 1 ? "packet family" : "packet families"} ${families.join(", ")}, and ${families.length - ownerApprovedFamilies.length} of them ${families.length - ownerApprovedFamilies.length === 1 ? "is" : "are"} not named by any owner legal decision.`;
  } else if (ownerAnnexedLegalAction) {
    legalStatus = OWNER_APPROVED;
    legalStatement = `${ownerDecision.records[0].decisionOwner} approved this route's named legal action through the exception annex under ${ownerDecision.records[0].recordId}.`;
  } else if (ownerAnnexedJurisdiction) {
    legalStatus = OWNER_APPROVED;
    legalStatement = `${ownerDecision.records[0].decisionOwner} approved ${pathway.jurisdiction} family coverage through the exception annex under ${ownerDecision.records[0].recordId}. Which family this route uses is still unknown to this repository.`;
  } else {
    legalStatus = OWNER_PENDING;
    legalStatement = "No packet family is reachable from this pathway, so no owner decision reaches it either.";
  }

  // Bridge and coverage disposition. A missing bridge always wins: it is the
  // reason the row cannot be trusted, whatever its legal status.
  let disposition;
  let statement;
  if (families.length === 0) {
    disposition = trackIds.length === 0
      ? "family_bridge_missing_no_track"
      : "family_bridge_missing_no_family";
    statement = trackIds.length === 0
      ? `No registry track maps to this compiled pathway, so no packet family can be reached from it. ${legalStatement}`
      : `Tracks ${trackIds.join(", ")} map to this pathway, but this repository carries no track-to-family bridge for them. ${legalStatement}`;
  } else if (legalStatus === OWNER_APPROVED) {
    disposition = OWNER_APPROVED;
    statement = legalStatement;
  } else if (hasLegalActionRequired) {
    disposition = "legal_action_required";
    statement = legalStatement;
  } else if (ownerDecision.approved) {
    disposition = OWNER_PENDING;
    statement = legalStatement;
  } else if (explicitlyOutside) {
    disposition = "genuinely_new_counsel_review_required";
    statement = "The D continuity analysis places this track outside the standing adoption's scope by name.";
  } else if (bound.length === 0 && families.length > 0) {
    disposition = "genuinely_new_counsel_review_required";
    statement = `The pathway resolves to packet ${families.length === 1 ? "family" : "families"} ${families.join(", ")}, and none is bound by EXT-ADOPT-01.`;
  } else if (!boundJurisdictions.has(pathway.jurisdiction)) {
    disposition = "genuinely_new_counsel_review_required";
    statement = `${pathway.jurisdiction} has no family bound by EXT-ADOPT-01.`;
  } else if (bound.some((b) => {
    const g = proofGates.get(b.familyJobId);
    return g && (g.counselAdopted !== true || g.completedOutputLegalReview !== "complete");
  })) {
    disposition = "covered_design_but_output_review_pending";
    statement = `EXT-ADOPT-01 binds ${bound.map((b) => b.familyJobId).join(", ")}, but the adoption is the legal-design gate only and each family's own packet proof still records counselAdopted=false with completed-output legal review pending.`;
  } else if (needsReconfirm) {
    disposition = "covered_but_needs_reconfirmation_due_to_byte_or_spec_change";
    statement = `EXT-ADOPT-01 binds ${bound.map((b) => b.familyJobId).join(", ")}, but a recorded byte or spec change since 2026-08-08 needs reconfirmation before it is relied on.`;
  } else {
    disposition = "covered_by_existing_standing_adoption";
    statement = `EXT-ADOPT-01 (adopted ${adoption.adoptedOn}, family level, standing) binds ${bound.map((b) => b.familyJobId).join(", ")} in ${pathway.jurisdiction}.`;
  }

  rows.push({
    pathwayKey: key,
    jurisdiction: pathway.jurisdiction,
    pathwayId: pathway.pathwayId,
    pathwayLabel: pathway.pathwayLabel,
    registryTrackIds: trackIds,
    packetFamilies: families,
    adoptionRecordId: bound.length ? adoption.recordId : null,
    adoptionRecordSha256: bound.length ? ADOPTION_SHA256 : null,
    adoptedOn: bound.length ? adoption.adoptedOn : null,
    adoptionScopeLevel: bound.length ? adoption.scope.level : null,
    boundFamilyEvidence: bound.map((b) => ({
      familyJobId: b.familyJobId,
      jurisdiction: b.jurisdiction,
      packetProofSha256: b.packetProofSha256 ?? null,
      legalDesignMemoSha256: b.legalDesignMemoSha256 ?? null
    })),
    ownerLegalDecisionRecordId: ownerApprovedFamilies.length > 0 || ownerAnnexedLegalAction || ownerAnnexedJurisdiction
      ? ownerDecision.records[0].recordId
      : null,
    ownerApprovedFamilies,
    legalStatus,
    legalStatement,
    namedLegalActionRequired: hasLegalActionRequired,
    familyBridgePresent: families.length > 0,
    onlyPathwayProjectionMissing: disposition === OWNER_APPROVED || disposition === "covered_by_existing_standing_adoption",
    familyGates: bound.map((b) => ({ familyJobId: b.familyJobId, ...(proofGates.get(b.familyJobId) ?? {}) })),
    lawrenceRatification: pathway.lawrence?.lawrence_review ?? pathway.lawrence ?? null,
    ledgerSaysLegalReviewPending: (pathway.openBlockers ?? []).some((b) => b.id === "legal_review_pending"),
    disposition,
    statement
  });
}

const counts = rows.reduce((acc, row) => {
  acc[row.disposition] = (acc[row.disposition] ?? 0) + 1;
  return acc;
}, {});

const ledger = {
  schemaVersion: "rcap-paid-pathway-legal-join/v1",
  generatedBy: "scripts/generate-rcap-paid-pathway-legal-join.mjs",
  question: "For each intended-paid pathway, is its packet family covered by a recorded legal decision, or does a legal decision genuinely remain open?",
  createsApproval: false,
  widensAdoption: false,
  ownerLegalDecision: ownerDecision.approved
    ? {
        approved: true,
        result: ownerDecision.result,
        records: ownerDecision.records,
        familiesNamed: ownerDecision.families.size,
        annexAdopted: ownerDecision.annexApproved,
        note: "The decision owner closed the completed-output legal gate directly. No signature, signed manifest, uploaded approval evidence or separate counsel artifact is required or represented, and none is read by this generator."
      }
    : { approved: false, reason: ownerDecision.reason },
  adoption: {
    recordId: adoption.recordId,
    path: ADOPTION,
    sha256: ADOPTION_SHA256,
    adoptedOn: adoption.adoptedOn,
    approvedByRole: adoption.approvedByRole,
    scopeLevel: adoption.scope.level,
    boundFamilies: adoption.boundFamilies.length,
    boundJurisdictions: [...boundJurisdictions].sort(),
    familiesCarryingSupersededTechnicalResult: [...supersededFamilies].sort()
  },
  bridge: {
    trackToFamilySource: "data/rcap-codex/d-track-terminalization/track-family-map.json",
    trackToFamilyScope: familyMap.scope?.lane ?? "unknown",
    tracksWithAFamilyBridge: familyByTrack.size,
    adoptedFamilyProofsRead: proofGates.size,
    note: "The only track-to-family bridge in this repository covers lane D. A pathway whose tracks are outside it cannot be joined to a counsel record here, and is reported as bridge-missing rather than as covered or as a new review."
  },
  intendedPaidPathways: rows.length,
  counts,
  pathways: rows
};

const serialized = `${JSON.stringify(ledger, null, 2)}\n`;
if (CHECK) {
  const existing = fs.existsSync(OUT) ? fs.readFileSync(OUT, "utf8") : "";
  if (existing !== serialized) {
    console.error("paid-pathway legal join is stale; regenerate with node scripts/generate-rcap-paid-pathway-legal-join.mjs");
    process.exit(1);
  }
  console.log(`paid-pathway legal join current — ${rows.length} intended-paid pathways joined against ${adoption.recordId}`);
  process.exit(0);
}

fs.writeFileSync(OUT, serialized);
console.log(`Wrote ${path.relative(rootDir, OUT)}`);
console.log(`Standing adoption ${adoption.recordId} (${adoption.adoptedOn}, ${adoption.scope.level}, sha256 ${ADOPTION_SHA256.slice(0, 12)}…) binds ${adoption.boundFamilies.length} families across ${boundJurisdictions.size} jurisdictions.`);
console.log(`Intended-paid pathways: ${rows.length}`);
for (const [disposition, n] of Object.entries(counts).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(n).padStart(4)}  ${disposition}`);
}
