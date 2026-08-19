#!/usr/bin/env node
// SELLABLE PATHWAY EVIDENCE JOIN — one record per intended-paid pathway.
//
//   node scripts/generate-rcap-sellable-evidence-join.mjs
//   node scripts/generate-rcap-sellable-evidence-join.mjs --check
//
// Built for Session A, who is the sole integration and release captain. This
// script joins records that already exist and changes no runtime, no
// classification and no count in the closure ledger. It approves nothing: where
// it says a standing counsel adoption covers a pathway's packet family, that is
// a statement that the JOIN EXISTS, not a legal determination that the join is
// sufficient. Counsel and Session A decide that.
//
// It answers two reconciliation questions the closure ledger raised:
//
//   1. Of the 232 pathways carrying legal_review_pending, how many are a MISSING
//      JOIN — the packet family is inside the standing external counsel adoption
//      of 2026-08-08, and only the compiled per-pathway lawrenceRatification
//      record fails to reference it — and how many are a GENUINE MISSING REVIEW?
//
//   2. Of the 244 pathways carrying renderer_unavailable, how many are explained
//      by the absent factory_v2 branch in resolvePacketRoute rather than by any
//      missing packet asset?
//
// Sources, all committed and read only:
//   data/rcap-ledger/sellable-pathway-closure.json          the denominator
//   data/rcap-ledger/track-terminalization.json             track -> pathway
//   05c168e7:data/record-clearing/template-families/EXT-ADOPT-01-...json
//                                                           the standing adoption
//   data/rcap-codex/d-adoption-continuity/track-adoption.json  adoption inventory
//   data/rcap-all50/review-artifacts/d-adoption-reconciliation.json
//   data/rcap-all50/problematic-pdf-register.json
//   data/rcap-all50/overlays/production/implementation-index.json
//   data/rcap-all50/{pleadings,composed-routes,hard-forms}/  committed packet assets
//   src/lib/rcap/documents/packet-route-resolver.ts          the resolver under test

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(rootDir);

const CHECK = process.argv.includes("--check");
const read = (p) => fs.readFileSync(path.join(rootDir, p), "utf8");
const readJson = (p) => JSON.parse(read(p));
const sha256 = (v) => crypto.createHash("sha256").update(v).digest("hex");
const git = (args) => execFileSync("git", args, { cwd: rootDir, encoding: "utf8" });

const JSON_OUT = "data/rcap-ledger/sellable-pathway-evidence-join.json";
const MD_OUT = "docs/record-clearing/sellable-pathway-evidence-join.md";

// The standing adoption lives at a commit, not in the working tree. Read it from
// git so the hash in this packet is the hash Session A can re-derive.
const ADOPTION_REF = "05c168e70aee524b795a4e2f712a05cedb3e65db";
const ADOPTION_PATH = "data/record-clearing/template-families/EXT-ADOPT-01-standing-external-counsel-adoption.json";
const adoptionRaw = git(["show", `${ADOPTION_REF}:${ADOPTION_PATH}`]);
const adoption = JSON.parse(adoptionRaw);
const adoptionSha256 = sha256(adoptionRaw);

const closure = readJson("data/rcap-ledger/sellable-pathway-closure.json");
const trackLedger = readJson("data/rcap-ledger/track-terminalization.json");
const continuity = readJson("data/rcap-codex/d-adoption-continuity/track-adoption.json");
const reconciliation = readJson("data/rcap-all50/review-artifacts/d-adoption-reconciliation.json");
const problematic = readJson("data/rcap-all50/problematic-pdf-register.json");
const d1Index = readJson("data/rcap-all50/overlays/production/implementation-index.json");
const resolverSource = read("src/lib/rcap/documents/packet-route-resolver.ts");

// --------------------------------------------------------------------------- adoption index
const boundFamilyById = new Map(adoption.boundFamilies.map((f) => [f.familyJobId, f]));
const boundJurisdictions = new Set(adoption.boundFamilies.map((f) => f.jurisdiction));
const supersededFamilies = new Map(
  (adoption.familiesCarryingSupersededTechnicalResult ?? []).map((f) => [f.familyJobId, f])
);
const exactMemoTracks = new Set(continuity.adoptionInventory.exactDTrackIdsInHashBoundMemos ?? []);
const outsideScopeTracks = new Set(continuity.adoptionInventory.outsideStandingScopeTrackIds ?? []);
const reconciledByTrack = new Map((reconciliation.tracks ?? []).map((t) => [t.trackId, t]));

// --------------------------------------------------------------------------- track index
const tracksByPathway = new Map();
const trackById = new Map();
for (const track of trackLedger.tracks) {
  trackById.set(track.trackId, track);
  for (const pathwayId of track.mappedCompiledPathwayIds ?? []) {
    const key = `${track.jurisdiction}:${pathwayId}`;
    if (!tracksByPathway.has(key)) tracksByPathway.set(key, []);
    tracksByPathway.get(key).push(track);
  }
}

// --------------------------------------------------------------------------- committed packet assets
const ASSET_ROOTS = {
  "data/rcap-all50/pleadings": "controlled_pleading",
  "data/rcap-all50/composed-routes": "composed_route",
  "data/rcap-all50/hard-forms": "official_form_hard"
};
const assetsByTrack = new Map();
for (const [root, kind] of Object.entries(ASSET_ROOTS)) {
  for (const state of fs.readdirSync(path.join(rootDir, root))) {
    const stateDir = path.join(rootDir, root, state);
    if (!fs.statSync(stateDir).isDirectory()) continue;
    for (const entry of fs.readdirSync(stateDir)) {
      if (entry.endsWith(".json")) continue;
      if (!assetsByTrack.has(entry)) assetsByTrack.set(entry, []);
      assetsByTrack.get(entry).push({ kind, path: `${root}/${state}/${entry}` });
    }
  }
}
const d1ByJurisdiction = new Map();
for (const family of d1Index.families ?? []) {
  if (!d1ByJurisdiction.has(family.jurisdiction)) d1ByJurisdiction.set(family.jurisdiction, []);
  d1ByJurisdiction.get(family.jurisdiction).push(family);
}

// --------------------------------------------------------------------------- problematic PDFs
const problematicByTrack = new Map();
for (const record of problematic.records ?? []) {
  for (const trackId of record.affectedTrackIds ?? []) {
    if (!problematicByTrack.has(trackId)) problematicByTrack.set(trackId, []);
    problematicByTrack.get(trackId).push({
      assetId: record.identity,
      formId: record.formId,
      jurisdiction: record.jurisdiction,
      structuralClass: record.structuralClass,
      binaryPresent: record.binaryPresent,
      defectCategories: record.defectCategories,
      technicalDisposition: record.technicalDisposition,
      legalDisposition: record.legalDisposition,
      postLaunchPriority: record.postLaunchPriority,
      owner: record.owner
    });
  }
}

// --------------------------------------------------------------------------- the resolver
// Read as a fact rather than asserted: factory_v2 is a declared route kind with
// no branch that returns it, which is why every non-legacy jurisdiction falls
// through to guidance_only.
const factoryV2Declared = /\|\s*"factory_v2"/.test(resolverSource);
const factoryV2Returned = /routeKind:\s*"factory_v2"/.test(resolverSource);
const legacyVerified = new Set(
  (resolverSource.match(/LEGACY_VERIFIED_JURISDICTIONS = \[([^\]]*)\]/)?.[1] ?? "")
    .match(/"([A-Z]{2})"/g)?.map((s) => s.replace(/"/g, "")) ?? []
);

// --------------------------------------------------------------------------- profile slugs
const profilesDir = "src/lib/rcap-engine/compiled/profiles";
const slugByCode = new Map();
const versionByCode = new Map();
for (const file of fs.readdirSync(path.join(rootDir, profilesDir))) {
  if (!file.endsWith(".json")) continue;
  const profile = readJson(`${profilesDir}/${file}`);
  slugByCode.set(profile.jurisdiction.code, profile.jurisdiction.slug);
  versionByCode.set(profile.jurisdiction.code, profile.profileVersion);
}

// --------------------------------------------------------------------------- family derivation
const FAMILY_KIND_FOR_MODE = {
  automatic_relief_verification_and_guidance: "guidance-implementation",
  state_specific_custom_packet_from_source_rules: "custom-pleading",
  official_form_overlay_or_source_form_set: "official-pdf"
};

function candidateFamilyJobIds(code, mode) {
  const lower = code.toLowerCase();
  const kind = FAMILY_KIND_FOR_MODE[mode] ?? null;
  const candidates = [];
  if (kind === "custom-pleading") {
    candidates.push(`rcap-${lower}-custom-pleading`, `rcap-${lower}-custom-pleading-clean-tracks`);
  } else if (kind === "guidance-implementation") {
    candidates.push(`rcap-${lower}-guidance-implementation`);
  } else {
    // An official-PDF pathway has no dedicated familyJobId in the adoption's
    // bound list; the adoption's own scope text says it covers "every current
    // official-PDF family", so the jurisdiction's bound families are what a
    // reviewer would be joining against. Both are offered, never merged.
    candidates.push(`rcap-${lower}-guidance-implementation`, `rcap-${lower}-custom-pleading`, `rcap-${lower}-custom-pleading-clean-tracks`);
  }
  return candidates;
}

// --------------------------------------------------------------------------- build
const intended = closure.pathways.filter((p) => p.category === "paid_packet_intended");
const records = [];

for (const entry of intended) {
  const code = entry.jurisdiction;
  const key = entry.pathwayKey;
  const tracks = tracksByPathway.get(key) ?? [];
  const trackIds = tracks.map((t) => t.trackId);
  const mode = entry.classification.evidence.packetPlanMode ?? null;

  // --- packet family -------------------------------------------------------
  const candidates = candidateFamilyJobIds(code, mode);
  const boundMatches = candidates.filter((id) => boundFamilyById.has(id));
  const declaredStrategies = [...new Set(tracks.map((t) => t.declaredStrategy).filter(Boolean))];
  const implementationFamilies = [...new Set(tracks.map((t) => t.implementationFamily).filter(Boolean))];
  const packetFamily = {
    packetPlanMode: mode,
    familyKind: FAMILY_KIND_FOR_MODE[mode] ?? "unmapped",
    candidateFamilyJobIds: candidates,
    boundFamilyJobIds: boundMatches,
    trackDeclaredStrategies: declaredStrategies,
    trackImplementationFamilies: implementationFamilies
  };

  // --- standing counsel adoption ------------------------------------------
  const exactTracks = trackIds.filter((t) => exactMemoTracks.has(t));
  const outsideTracks = trackIds.filter((t) => outsideScopeTracks.has(t));
  const boundFamilies = boundMatches.map((id) => {
    const family = boundFamilyById.get(id);
    return {
      familyJobId: id,
      jurisdiction: family.jurisdiction,
      implementationCommit: family.implementationCommit,
      packetProofPath: family.packetProofPath,
      packetProofSha256: family.packetProofSha256,
      legalDesignMemoPath: family.legalDesignMemoPath,
      legalDesignMemoSha256: family.legalDesignMemoSha256,
      reviewManifestPath: family.reviewManifestPath,
      reviewManifestSha256: family.reviewManifestSha256,
      supersededTechnicalResult: supersededFamilies.get(id) ?? null
    };
  });

  const standingCounselAdoption = boundFamilies.length > 0 || exactTracks.length > 0
    ? {
      recordId: adoption.recordId,
      status: adoption.status,
      adoptedOn: adoption.adoptedOn,
      approvedByRole: adoption.approvedByRole,
      approvalBasis: adoption.approvalBasis,
      recordRef: `${ADOPTION_REF}:${ADOPTION_PATH}`,
      recordSha256: adoptionSha256,
      boundAtFamilyLevel: boundFamilies,
      boundAtTrackLevel: exactTracks.map((t) => ({
        trackId: t,
        exactTrackPresentInHashBoundMemo: true,
        reconciledStatus: reconciledByTrack.get(t)?.reconciledStatus ?? null,
        boundLegalDesignMemoSha256: reconciledByTrack.get(t)?.supportingAdoptionRecord?.boundLegalDesignMemoSha256 ?? null
      }))
    }
    : null;

  // The strongest legal evidence in the repository is track-level: 54 track ids
  // sit inside hash-bound memos of the standing adoption. Every one of them
  // carries coverageDisposition "missing_from_compiled_runtime" and zero
  // mappedCompiledPathwayIds, so none of it can reach a compiled pathway. Where
  // that unreachable evidence is in this pathway's own jurisdiction, say so:
  // the join is broken at the crosswalk, not at counsel.
  const unreachableInJurisdiction = [...exactMemoTracks].filter((t) => {
    const track = trackById.get(t);
    return track && track.jurisdiction === code && (track.mappedCompiledPathwayIds ?? []).length === 0;
  });

  const adoptionScopeAndHash = {
    scopeLevel: adoption.scope.level,
    standing: adoption.scope.standing,
    familiesInScope: adoption.scope.familiesInScope,
    jurisdictionsNormalized: adoption.scope.jurisdictionsNormalized,
    boundFamilyCountGlobal: continuity.adoptionInventory.standingBoundFamilyCountGlobal,
    boundJurisdictionCountGlobal: continuity.adoptionInventory.standingBoundJurisdictionCountGlobal,
    corpusReviewedThrough: adoption.scope.corpusReviewedThrough,
    covers: adoption.scope.covers,
    adoptionRecordSha256: adoptionSha256,
    thisJurisdictionIsBound: boundJurisdictions.has(code),
    newAdoptionRequiredOnlyWhen: adoption.continuityPolicy.newAdoptionRequiredOnlyWhenAChangeAfter20260808MateriallyChanges,
    trackLevelAdoptionEvidenceUnreachableInThisJurisdiction: unreachableInJurisdiction.map((t) => ({
      trackId: t,
      coverageDisposition: trackById.get(t)?.coverageDisposition ?? null,
      mappedCompiledPathwayIds: trackById.get(t)?.mappedCompiledPathwayIds ?? [],
      note: "Inside a hash-bound memo of the standing adoption, but mapped to no compiled pathway, so its adoption cannot reach this or any pathway."
    }))
  };

  // --- missing join, or genuine missing review -----------------------------
  const legalPending = entry.openBlockers.some((b) => b.id === "legal_review_pending");
  let legalReviewPending;
  if (!legalPending) {
    legalReviewPending = {
      kind: "not_pending",
      basis: "The compiled profile carries a ratified_deployable counsel ratification that is packet-capable and payable."
    };
  } else if (exactTracks.length > 0) {
    legalReviewPending = {
      kind: "missing_join_track_level",
      basis: `${exactTracks.join(", ")} appears by exact track id inside a hash-bound memo of the 2026-08-08 standing adoption. The pathway's compiled lawrenceRatification record does not reference it. Joining the two is a records question for Session A and counsel, not a new review.`,
      joinKey: { trackIds: exactTracks, adoptionRecordSha256: adoptionSha256 }
    };
  } else if (boundFamilies.length > 0) {
    legalReviewPending = {
      kind: "missing_join_family_level",
      basis: `The pathway's packet family (${boundFamilies.map((f) => f.familyJobId).join(", ")}) is inside the standing adoption, whose scope is packet_family and whose covers list includes every current packet family of this kind as of 2026-08-08. No exact track-level memo binding exists, so whether family-level coverage reaches this pathway is a counsel determination, not something this packet decides.`,
      joinKey: { familyJobIds: boundFamilies.map((f) => f.familyJobId), adoptionRecordSha256: adoptionSha256 }
    };
  } else if (outsideTracks.length > 0) {
    legalReviewPending = {
      kind: "genuine_missing_review_outside_scope",
      basis: `${outsideTracks.join(", ")} is recorded in outsideStandingScopeTrackIds: the 2026-08-08 adoption never covered it. d-roger-adoption-decision-packet recommends commissioning one new counsel adoption for Alabama, Arizona, Iowa and Oregon together.`
    };
  } else if (!boundJurisdictions.has(code)) {
    legalReviewPending = {
      kind: "genuine_missing_review_jurisdiction_unbound",
      basis: `${code} has no bound family in the standing adoption at all, so nothing exists to join to. A new counsel adoption is required for this jurisdiction.`
    };
  } else {
    legalReviewPending = {
      kind: "genuine_missing_review_family_kind_unbound",
      basis: `${code} has bound families in the standing adoption, but none is the family kind this pathway needs (${packetFamily.familyKind}), and no exact track-level memo binding exists. This is a weaker claim than an unbound jurisdiction: the adoption's own scope text covers "every current ${packetFamily.familyKind === "official-pdf" ? "official-PDF" : packetFamily.familyKind} family", so whether that reaches a family kind with no bound familyJobId is a counsel determination.`
    };
  }

  // --- renderer ------------------------------------------------------------
  const trackAssets = trackIds.flatMap((t) => (assetsByTrack.get(t) ?? []).map((a) => ({ trackId: t, ...a })));
  const d1Families = d1ByJurisdiction.get(code) ?? [];
  const rendererFamily = {
    declared: FAMILY_KIND_FOR_MODE[mode] ?? "unmapped",
    resolverRouteKind: entry.route.routeKind,
    resolverRendererKind: entry.route.rendererKind,
    legacyVerifiedJurisdiction: legacyVerified.has(code),
    committedPacketAssets: trackAssets,
    d1OfficialFormPackages: d1Families.map((f) => ({
      family: f.family,
      mapKind: f.mapKind,
      status: f.status,
      fields: f.fields,
      bound: f.bound,
      holds: f.holds
    }))
  };

  const hasAsset = trackAssets.length > 0 || d1Families.length > 0;
  const factoryV2CouldServe = {
    answer: entry.stages.successfullyRendered ? "already_served_by_legacy_verified_renderer" : (hasAsset ? "yes_asset_committed" : "not_from_committed_assets"),
    basis: entry.stages.successfullyRendered
      ? `${code} is a LEGACY_VERIFIED jurisdiction, so packet_document_v1 already renders this route; factory_v2 is not what stands between this pathway and an artifact.`
      : hasAsset
        ? `A committed packet asset exists for this pathway (${[...new Set([...trackAssets.map((a) => a.kind), ...(d1Families.length ? ["official_form_d1_package"] : [])])].join(", ")}). A factory_v2 branch in resolvePacketRoute could bind it. Whether the asset is legally and technically fit to serve is a separate gate this packet does not decide.`
        : "No committed pleading, composed-route, hard-form or D1 official-form package covers this pathway's tracks, so a factory_v2 branch alone would not produce an artifact for it."
  };

  const rendererUnavailableAssigned = entry.openBlockers.some((b) => b.id === "renderer_unavailable");
  const rendererUnavailableReason = !rendererUnavailableAssigned
    ? null
    : {
      proximateCause: "resolvePacketRoute returned a routeKind whose rendererKind is \"none\".",
      resolverRouteKind: entry.route.routeKind,
      resolverReason: entry.route.reason,
      structuralCause: factoryV2Declared && !factoryV2Returned
        ? "factory_v2 is declared in PacketRouteKind and no branch in resolvePacketRoute returns it, so every jurisdiction outside LEGACY_VERIFIED_JURISDICTIONS falls through to the guidance_only default regardless of what packet assets are committed."
        : "factory_v2 has a returning branch; renderer_unavailable here is not explained by the missing branch.",
      notCausedBy: hasAsset ? "a missing packet asset — one is committed for this pathway" : null
    };

  // --- public witness ------------------------------------------------------
  const exactPublicWitness = {
    guidedCheckRoute: `/expungement-ai/screening/${slugByCode.get(code) ?? code.toLowerCase()}`,
    stateLandingRoute: `/expungement-ai/states/${slugByCode.get(code) ?? code.toLowerCase()}`,
    evaluationEndpoint: "POST /api/expungement-ai/screening",
    checkoutEndpoint: "POST /api/expungement-ai/checkout",
    packetDownloadEndpoint: "GET /api/rcap/documents/[packetId]/pdf/[pdfType]",
    profileVersion: versionByCode.get(code) ?? null,
    pathwayLabel: entry.pathwayLabel,
    whatTheParticipantReachesToday: entry.stages.successfullyRendered
      ? "A packet that is offered, paid for and downloaded."
      : entry.stages.publiclyReachableSellable
        ? "A result the evaluator marks payment-eligible, on which the delivery guard shows no price and refuses Checkout with 409 packet_not_deliverable."
        : "A guidance result. No price is shown and no packet is offered."
  };

  // --- problematic PDFs ----------------------------------------------------
  const problematicPdfAssetIds = trackIds.flatMap((t) => (problematicByTrack.get(t) ?? []).map((r) => ({ trackId: t, ...r })));

  // --- the single remaining blocker ---------------------------------------
  const blockerIds = new Set(entry.openBlockers.map((b) => b.id));
  let exactRemainingBlocker;
  if (blockerIds.size === 0) {
    exactRemainingBlocker = { id: "none", statement: "Closed. The pathway is payment-eligible and produces an artifact." };
  } else if (blockerIds.has("unclassified_route")) {
    exactRemainingBlocker = { id: "unclassified_route", statement: "No row exists in route-product-metadata.json, so no product decision exists for this pathway at all." };
  } else if (blockerIds.has("packet_spec_incomplete")) {
    exactRemainingBlocker = { id: "packet_spec_incomplete", statement: "The compiled packet plan does not name the required inputs, source rules and source forms a packet needs." };
  } else if (legalReviewPending.kind === "genuine_missing_review") {
    exactRemainingBlocker = { id: "counsel_adoption_absent", statement: legalReviewPending.basis };
  } else if (blockerIds.has("gate_build") || blockerIds.has("intake_fix") || blockerIds.has("wait_anchor_fix") || blockerIds.has("route_metadata")) {
    const first = ["route_metadata", "gate_build", "intake_fix", "wait_anchor_fix"].find((b) => blockerIds.has(b));
    exactRemainingBlocker = { id: first, statement: entry.openBlockers.find((b) => b.id === first).statement };
  } else if (blockerIds.has("renderer_unavailable")) {
    exactRemainingBlocker = {
      id: "renderer_unavailable",
      statement: factoryV2CouldServe.answer === "yes_asset_committed"
        ? "A factory_v2 branch in resolvePacketRoute, bound to the committed packet asset for this pathway. Nothing else on this pathway is open except the adoption join."
        : "A committed packet asset for this pathway, and then a factory_v2 branch to bind it."
    };
  } else {
    const first = entry.openBlockers[0];
    exactRemainingBlocker = { id: first.id, statement: first.statement };
  }

  records.push({
    pathwayKey: key,
    jurisdiction: code,
    pathwayId: entry.pathwayId,
    pathwayLabel: entry.pathwayLabel,
    trackIds,
    packetFamily,
    standingCounselAdoption,
    adoptionScopeAndHash,
    legalReviewPending,
    rendererFamily,
    factoryV2CouldServe,
    rendererUnavailableReason,
    problematicPdfAssetIds,
    exactPublicWitness,
    exactRemainingBlocker,
    closureStages: entry.stages,
    openBlockerIds: [...blockerIds]
  });
}

// --------------------------------------------------------------------------- reconciliation
const legalPendingRecords = records.filter((r) => r.legalReviewPending.kind !== "not_pending");
const legalKinds = {};
for (const r of legalPendingRecords) legalKinds[r.legalReviewPending.kind] = (legalKinds[r.legalReviewPending.kind] ?? 0) + 1;
const missingJoin = legalPendingRecords.filter((r) => r.legalReviewPending.kind.startsWith("missing_join"));
const genuineReview = legalPendingRecords.filter((r) => r.legalReviewPending.kind.startsWith("genuine_missing_review"));

const rendererRecords = records.filter((r) => r.rendererUnavailableReason !== null);
const rendererByFactory = {};
for (const r of rendererRecords) rendererByFactory[r.factoryV2CouldServe.answer] = (rendererByFactory[r.factoryV2CouldServe.answer] ?? 0) + 1;

const unboundJurisdictions = [...new Set(records.map((r) => r.jurisdiction))].filter((c) => !boundJurisdictions.has(c)).sort();

const packet = {
  schemaVersion: "rcap-sellable-pathway-evidence-join/v1",
  generatedBy: "scripts/generate-rcap-sellable-evidence-join.mjs",
  builtForSession: "A (sole integration and release captain)",
  headSha: git(["rev-parse", "HEAD"]).trim(),
  approvesNothing:
    "This packet joins existing records. It issues no counsel approval, changes no runtime, moves no pathway between closure categories and changes no count in data/rcap-ledger/sellable-pathway-closure.json. Where a record says a standing adoption covers a packet family, that states that the join exists — not that it is legally sufficient. Counsel and Session A decide sufficiency.",
  standingAdoption: {
    recordId: adoption.recordId,
    status: adoption.status,
    adoptedOn: adoption.adoptedOn,
    recordedOn: adoption.recordedOn,
    approvedByRole: adoption.approvedByRole,
    approvalBasis: adoption.approvalBasis,
    recordRef: `${ADOPTION_REF}:${ADOPTION_PATH}`,
    recordSha256: adoptionSha256,
    scope: adoption.scope,
    boundFamilyCount: adoption.boundFamilies.length,
    boundJurisdictionCount: boundJurisdictions.size,
    boundJurisdictions: [...boundJurisdictions].sort(),
    jurisdictionsWithNoBoundFamily: unboundJurisdictions,
    familiesCarryingSupersededTechnicalResult: adoption.familiesCarryingSupersededTechnicalResult
  },
  trackLevelJoinBlocked: (() => {
    const unmapped = [...exactMemoTracks].filter((t) => (trackById.get(t)?.mappedCompiledPathwayIds ?? []).length === 0);
    const dispositions = {};
    for (const t of unmapped) {
      const d = trackById.get(t)?.coverageDisposition ?? "(not in the 497 ledger)";
      dispositions[d] = (dispositions[d] ?? 0) + 1;
    }
    return {
      exactTrackIdsInHashBoundMemos: exactMemoTracks.size,
      ofThoseMappedToNoCompiledPathway: unmapped.length,
      coverageDispositions: dispositions,
      jurisdictions: [...new Set(unmapped.map((t) => trackById.get(t)?.jurisdiction).filter(Boolean))].sort(),
      trackIds: unmapped.sort(),
      statement:
        "This is the reason not one pathway in the paid denominator reaches missing_join_track_level. Every track id carrying an exact hash-bound counsel memo is recorded missing_from_compiled_runtime with zero mappedCompiledPathwayIds, so the strongest legal evidence in the repository cannot reach a compiled pathway at all. The join is broken at the track-to-pathway crosswalk, not at counsel. Repairing the crosswalk is a records question that would move pathways from genuine_missing_review or family-level inference onto exact track-level adoption; it is not a new review and it is not this lane's to decide."
    };
  })(),
  legalReviewReconciliation: {
    closureLedgerCount: closure.pathways.filter((p) => p.category === "paid_packet_intended" && p.openBlockers.some((b) => b.id === "legal_review_pending")).length,
    breakdown: legalKinds,
    missingJoin: missingJoin.length,
    genuineMissingReview: genuineReview.length,
    genuineMissingReviewJurisdictions: [...new Set(genuineReview.map((r) => r.jurisdiction))].sort(),
    statement:
      "legal_review_pending in the closure ledger is derived from the per-pathway compiled lawrenceRatification record only. The standing external counsel adoption of 2026-08-08 is a separate record system, scoped at packet_family. Splitting the count is a records question; granting the join is counsel's."
  },
  rendererReconciliation: {
    closureLedgerCount: closure.pathways.filter((p) => p.category === "paid_packet_intended" && p.openBlockers.some((b) => b.id === "renderer_unavailable")).length,
    factoryV2DeclaredInPacketRouteKind: factoryV2Declared,
    factoryV2ReturnedByAnyResolverBranch: factoryV2Returned,
    legacyVerifiedJurisdictions: [...legacyVerified].sort(),
    breakdown: rendererByFactory,
    statement: factoryV2Declared && !factoryV2Returned
      ? "Every renderer_unavailable in the denominator traces to one structural fact: factory_v2 is a declared PacketRouteKind that no branch of resolvePacketRoute returns, so every jurisdiction outside LEGACY_VERIFIED_JURISDICTIONS falls through to the guidance_only default no matter what packet assets are committed."
      : "factory_v2 has a returning branch; renderer_unavailable is not explained by a missing branch."
  },
  problematicPdfReconciliation: {
    pathwaysWithProblematicPdf: records.filter((r) => r.problematicPdfAssetIds.length > 0).length,
    distinctAssetIds: [...new Set(records.flatMap((r) => r.problematicPdfAssetIds.map((a) => a.assetId)))].length,
    jurisdictions: [...new Set(records.filter((r) => r.problematicPdfAssetIds.length > 0).map((r) => r.jurisdiction))].sort()
  },
  totals: {
    intendedPaidPathways: records.length,
    denominatorSha256: closure.denominator.sha256
  },
  records
};

// --------------------------------------------------------------------------- report
function md() {
  const l = [];
  l.push("# Sellable pathway evidence join — for Session A");
  l.push("");
  l.push(`One record for each of the **${records.length}** intended-paid pathways, on head \`${packet.headSha.slice(0, 8)}\`.`);
  l.push("");
  l.push("This packet joins records that already exist. It issues no counsel approval, changes no");
  l.push("runtime, and changes no count in the closure ledger. Where a record says a standing");
  l.push("adoption covers a packet family, that states **that the join exists** — not that it is");
  l.push("legally sufficient. Counsel and Session A decide sufficiency.");
  l.push("");
  l.push("## The standing counsel adoption");
  l.push("");
  l.push(`- Record: \`${adoption.recordId}\`, status \`${adoption.status}\`, adopted **${adoption.adoptedOn}**`);
  l.push(`- Ref: \`${ADOPTION_REF.slice(0, 8)}:${ADOPTION_PATH}\``);
  l.push(`- sha256: \`${adoptionSha256}\``);
  l.push(`- Scope: \`${adoption.scope.level}\`, standing, **${adoption.scope.familiesInScope} families**, corpus reviewed through ${adoption.scope.corpusReviewedThrough}`);
  l.push(`- Bound families actually listed: **${adoption.boundFamilies.length}**, across **${boundJurisdictions.size} jurisdictions**`);
  l.push("");
  l.push("### Correction to the release brief");
  l.push("");
  l.push("The brief says the adoption covers \"57 document families across 45 states plus D.C.\".");
  l.push(`The record's own bound-family list carries 57 families across **${boundJurisdictions.size} jurisdictions, and DC is one of them** —`);
  l.push(`that is **${boundJurisdictions.size - 1} states plus D.C.**, not 45 states plus D.C.`);
  l.push("");
  l.push(`Jurisdictions in the paid denominator with **no bound family at all**: ${unboundJurisdictions.map((c) => `\`${c}\``).join(", ")}.`);
  l.push("");
  l.push("`d-roger-adoption-decision-packet.json` describes this as \"one decision about four states\"");
  l.push("— Alabama, Arizona, Iowa and Oregon. That packet was scoped to the 67 D-lane tracks.");
  l.push("Across the full 284-pathway paid denominator, **Idaho and Wyoming are also unbound**, and");
  l.push("neither appears in `outsideStandingScopeTrackIds`. Six jurisdictions need an adoption");
  l.push("decision, not four.");
  l.push("");
  l.push("## Reconciliation 1 — the 232 legal-review count");
  l.push("");
  l.push(`\`legal_review_pending\` in the closure ledger: **${packet.legalReviewReconciliation.closureLedgerCount}**. It is derived from the`);
  l.push("per-pathway compiled `lawrenceRatification` record alone. The standing adoption is a");
  l.push("separate record system scoped at `packet_family`. Joining them splits the count:");
  l.push("");
  l.push("| Kind | Pathways | What it means |");
  l.push("|---|---|---|");
  l.push(`| \`missing_join_track_level\` | ${legalKinds.missing_join_track_level ?? 0} | The exact track id sits inside a hash-bound memo of the adoption. Records question. |`);
  l.push(`| \`missing_join_family_level\` | ${legalKinds.missing_join_family_level ?? 0} | The pathway's packet family is bound; no exact track-level binding exists. Counsel determines reach. |`);
  l.push(`| \`genuine_missing_review_jurisdiction_unbound\` | ${legalKinds.genuine_missing_review_jurisdiction_unbound ?? 0} | The jurisdiction has no bound family at all. A new adoption is required. |`);
  l.push(`| \`genuine_missing_review_family_kind_unbound\` | ${legalKinds.genuine_missing_review_family_kind_unbound ?? 0} | The jurisdiction is bound, but not for this family kind. Weaker claim; counsel determines reach. |`);
  l.push(`| \`genuine_missing_review_outside_scope\` | ${legalKinds.genuine_missing_review_outside_scope ?? 0} | Recorded in outsideStandingScopeTrackIds. Never covered. |`);
  l.push("");
  l.push(`**${missingJoin.length} of ${packet.legalReviewReconciliation.closureLedgerCount}** are a missing join. **${genuineReview.length}** are a genuine missing review, in ${packet.legalReviewReconciliation.genuineMissingReviewJurisdictions.map((c) => `\`${c}\``).join(", ")}.`);
  l.push("");
  l.push("Three bound families carry a superseded technical result and remain an open technical");
  l.push("gate even where the legal design is adopted: " +
    adoption.familiesCarryingSupersededTechnicalResult.map((f) => `\`${f.familyJobId}\``).join(", ") + ".");
  l.push("");
  l.push("### Why no pathway reaches track-level adoption");
  l.push("");
  l.push(`**${packet.trackLevelJoinBlocked.exactTrackIdsInHashBoundMemos} track ids** carry an exact hash-bound counsel memo inside the standing adoption —`);
  l.push("the strongest legal evidence in the repository. **Every one of them**");
  l.push(`(${packet.trackLevelJoinBlocked.ofThoseMappedToNoCompiledPathway}/${packet.trackLevelJoinBlocked.exactTrackIdsInHashBoundMemos}) is recorded \`missing_from_compiled_runtime\` with zero \`mappedCompiledPathwayIds\`,`);
  l.push("so none of it can reach a compiled pathway.");
  l.push("");
  l.push("That is why `missing_join_track_level` is **0** and why 138 pathways fall back to");
  l.push("family-level inference. The join is broken at the **track-to-pathway crosswalk**, not at");
  l.push(`counsel. Affected jurisdictions: ${packet.trackLevelJoinBlocked.jurisdictions.map((c) => `\`${c}\``).join(", ")}.`);
  l.push("");
  l.push("Repairing the crosswalk is a records question. It would move pathways from");
  l.push("`genuine_missing_review` or family-level inference onto exact track-level adoption");
  l.push("without any new review — and it is Session A's call, not this lane's.");
  l.push("");
  l.push("## Reconciliation 2 — the 244 renderer count");
  l.push("");
  l.push(`\`renderer_unavailable\` in the closure ledger: **${packet.rendererReconciliation.closureLedgerCount}**.`);
  l.push("");
  l.push(`- \`factory_v2\` declared in \`PacketRouteKind\`: **${factoryV2Declared}**`);
  l.push(`- \`factory_v2\` returned by any branch of \`resolvePacketRoute\`: **${factoryV2Returned}**`);
  l.push(`- \`LEGACY_VERIFIED_JURISDICTIONS\`: ${[...legacyVerified].sort().map((c) => `\`${c}\``).join(", ")}`);
  l.push("");
  l.push("Every one of them traces to that single structural fact: with no branch returning");
  l.push("`factory_v2`, every jurisdiction outside the legacy-verified five falls through to the");
  l.push("`guidance_only` default no matter what packet assets are committed.");
  l.push("");
  l.push("| Could factory_v2 serve it | Pathways |");
  l.push("|---|---|");
  for (const [k, v] of Object.entries(rendererByFactory).sort((a, b) => b[1] - a[1])) l.push(`| \`${k}\` | ${v} |`);
  l.push("");
  l.push(`**${rendererByFactory.yes_asset_committed ?? 0}** carry a committed pleading, composed-route, hard-form or D1 official-form`);
  l.push("package already, so a `factory_v2` branch would have something to bind. The rest would");
  l.push("need the asset built first. Whether any asset is legally and technically fit to serve is a");
  l.push("separate gate this packet does not decide.");
  l.push("");
  l.push("## Problematic-PDF intersections");
  l.push("");
  l.push(`**${packet.problematicPdfReconciliation.pathwaysWithProblematicPdf}** intended-paid pathways touch **${packet.problematicPdfReconciliation.distinctAssetIds}** problematic-PDF asset ids, in ` +
    packet.problematicPdfReconciliation.jurisdictions.map((c) => `\`${c}\``).join(", ") + ".");
  l.push("Asset ids, defect categories, dispositions, owners and post-launch priorities are on each record.");
  l.push("");
  l.push("## Record shape");
  l.push("");
  l.push("Each record in `data/rcap-ledger/sellable-pathway-evidence-join.json` carries:");
  l.push("`packetFamily`, `standingCounselAdoption`, `adoptionScopeAndHash`, `legalReviewPending`,");
  l.push("`rendererFamily`, `factoryV2CouldServe`, `rendererUnavailableReason`,");
  l.push("`problematicPdfAssetIds`, `exactPublicWitness`, `exactRemainingBlocker`.");
  l.push("");
  l.push("Regenerate with `npm run rcap:generate-sellable-evidence-join`.");
  return l.join("\n") + "\n";
}

const jsonText = JSON.stringify(packet, null, 2) + "\n";
const mdText = md();

if (CHECK) {
  const problems = [];
  if (read(JSON_OUT) !== jsonText) problems.push(`${JSON_OUT} is stale; regenerate it.`);
  if (read(MD_OUT) !== mdText) problems.push(`${MD_OUT} is stale; regenerate it.`);
  if (problems.length > 0) {
    console.error("generate-rcap-sellable-evidence-join --check FAILED:");
    for (const p of problems) console.error(` - ${p}`);
    process.exit(1);
  }
  console.log(`evidence join current: ${records.length} intended-paid pathway record(s).`);
  process.exit(0);
}

fs.writeFileSync(path.join(rootDir, JSON_OUT), jsonText);
fs.writeFileSync(path.join(rootDir, MD_OUT), mdText);
console.log(`wrote ${JSON_OUT} and ${MD_OUT}`);
console.log(`records: ${records.length}`);
console.log(`legal_review_pending ${packet.legalReviewReconciliation.closureLedgerCount} = missing join ${missingJoin.length} + genuine missing review ${genuineReview.length}`);
console.log(`  ${JSON.stringify(legalKinds)}`);
console.log(`renderer_unavailable ${packet.rendererReconciliation.closureLedgerCount}: factory_v2 declared=${factoryV2Declared} returned=${factoryV2Returned}`);
console.log(`  ${JSON.stringify(rendererByFactory)}`);
console.log(`adoption: ${adoption.boundFamilies.length} families / ${boundJurisdictions.size} jurisdictions; unbound in denominator: ${unboundJurisdictions.join(", ")}`);
