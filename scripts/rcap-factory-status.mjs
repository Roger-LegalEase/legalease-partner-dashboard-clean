#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_ROOT = path.resolve(SCRIPT_DIR, "..");

const INPUTS = {
  authority: "data/record-clearing/master-library/authority.json",
  tracks: "data/record-clearing/legal-design-track-registry.json",
  jurisdictionInventory: "data/record-clearing/relief-track-registry.json",
  relationships: "data/record-clearing/legal-design-track-source-relationships.json",
  blockers: "data/record-clearing/master-library/authoritative-blocker-ledger.json",
  trackSourceAudit: "data/record-clearing/master-library/track-source-audit.json",
  trancheDirectory: "data/record-clearing/implementation-tranches",
  adoptionDirectory: "data/record-clearing/template-families",
  factoryReviewDirectory:
    "data/record-clearing/production-factory/review-manifests"
};

const AUTHORITY_BLOCKER_SCOPES = new Set([
  "master_library_source_gap",
  "source_or_currentness_blocker",
  "source_acquisition_blocker",
  "source_currentness_blocker",
  "source_provenance_blocker",
  "commercial_use_blocker"
]);

const TERMINAL_LEGAL_STATUSES = new Set([
  "legal_rejected",
  "not_offered",
  "excluded",
  "superseded",
  "withdrawn"
]);

const TRUSTED_COUNSEL_ADOPTIONS = Object.freeze({
  "ADOPT-01-custom-pleading-family-adoption.json": {
    // Advanced from 3fa44438 when Georgia's rendered evidence was regenerated
    // after the shared custom-pleading engine stopped letting VERIFICATION and
    // CERTIFICATE OF SERVICE stand alone at the foot of a page. Six of nine
    // Georgia packets moved digest; no text, page count, route, component or
    // fixture moved, and the standing external counsel adoption continues
    // across exactly that. The seal's substantive half — the fourteen approved
    // route ids below — is unchanged, and the pre-repin digest is preserved in
    // EXT-ADOPT-01-APPLICABILITY-01-georgia-layout-only-regeneration.json.
    sha256: "c1c60d37aa9cfcfc9fc615a9972c1c617bf69200bcdafb808a0516f4562b6b77",
    scopes: {
      "tranche-1-mississippi-petitions": [
        "ms-fel",
        "ms-misd-1st",
        "ms-misd-addl",
        "ms-nonconv",
        "ms-nonadj"
      ],
      "tranche-3-georgia-superior-court-pleadings": [
        "ga-felony-j1",
        "ga-vacated-j2",
        "ga-deaddocket-j3",
        "ga-misd-j4",
        "ga-fugitive-j5",
        "ga-pardon-j7",
        "ga-seal-m",
        "ga-fo-active-pre2026",
        "ga-fo-discharged-pre2026"
      ]
    }
  },
  "ADOPT-02-official-acroform-family-adoption.json": {
    sha256: "8c5d87a5ed7476987a48573b86f2d5827bcedaa5a0859ff3296b2764ed5509ca",
    scopes: {
      "tranche-2-maryland-official-forms": [
        "md_second_chance_shielding"
      ]
    }
  }
});

function readJson(rootDir, relativePath) {
  return JSON.parse(fs.readFileSync(path.join(rootDir, relativePath), "utf8"));
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function sha256Canonical(value) {
  return sha256(Buffer.from(canonicalJson(value), "utf8"));
}

function canonicalJson(value) {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean" ||
    (typeof value === "number" && Number.isFinite(value))
  ) {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
      .join(",")}}`;
  }
  throw new Error("Counsel-adoption hash scope contains a non-canonical value");
}

function artifactPinMatches(rootDir, pin) {
  if (
    !pin ||
    typeof pin.path !== "string" ||
    !/^[0-9a-f]{64}$/.test(pin.sha256 ?? "")
  ) {
    return false;
  }
  const root = path.resolve(rootDir);
  const absolutePath = path.resolve(root, pin.path);
  if (
    absolutePath !== root &&
    !absolutePath.startsWith(`${root}${path.sep}`)
  ) {
    return false;
  }
  return (
    fs.existsSync(absolutePath) &&
    fs.statSync(absolutePath).isFile() &&
    sha256(fs.readFileSync(absolutePath)) === pin.sha256
  );
}

function firstStatement(items) {
  for (const item of asArray(items)) {
    if (typeof item === "string" && item.trim()) return item.trim();
    if (item && typeof item.statement === "string" && item.statement.trim()) {
      return item.statement.trim();
    }
    if (item && typeof item.question === "string" && item.question.trim()) {
      return item.question.trim();
    }
  }
  return null;
}

function loadProofIndex(rootDir) {
  const directory = path.join(rootDir, INPUTS.trancheDirectory);
  const implementation = new Map();
  const authorityPins = new Set();
  const technical = new Map();
  const visual = new Map();
  const legalRecommendation = new Map();
  const counsel = new Map();
  const staging = new Map();
  const production = new Map();

  if (!fs.existsSync(directory)) {
    loadCounselAdoptionProofs();
    loadFactoryReviewProofs();
    return {
      implementation,
      authorityPins,
      technical,
      visual,
      legalRecommendation,
      counsel,
      staging,
      production
    };
  }

  const files = fs
    .readdirSync(directory)
    .filter((name) => name.endsWith(".json"))
    .sort();
  const records = files.map((name) => ({
    name,
    value: readJson(rootDir, path.posix.join(INPUTS.trancheDirectory, name))
  }));
  const trancheTracks = new Map(
    records
      .filter(({ name }) => /^tranche-\d+\.json$/.test(name))
      .map(({ value }) => [
        value.trancheId,
        asArray(value.selectedTracks)
          .map((entry) => (typeof entry === "string" ? entry : entry?.trackId))
          .filter(Boolean)
      ])
  );

  for (const { name, value } of records) {
    const selectedTracks = asArray(value.selectedTracks);
    const explicitTrackIds = selectedTracks
      .map((entry) => (typeof entry === "string" ? entry : entry?.trackId))
      .filter(Boolean);
    const recommendationTrackIds = asArray(value.recommendations)
      .flatMap((entry) => [
        entry?.trackId,
        ...asArray(entry?.trackIds)
      ])
      .filter(Boolean);
    const trackIds =
      explicitTrackIds.length > 0
        ? explicitTrackIds
        : recommendationTrackIds.length > 0
          ? recommendationTrackIds
          : trancheTracks.get(value.trancheId) ?? [];

    if (name.endsWith("-authority-pins.json")) {
      for (const entry of asArray(value.tracks)) {
        if (entry?.trackId) authorityPins.add(entry.trackId);
      }
    }

    if (value.implementationStatus) {
      const passed =
        value.implementationStatus === "implemented_and_internally_proved" ||
        value.implementationStatus === "implementation_complete";
      for (const trackId of trackIds) implementation.set(trackId, passed);
    }

    if (name.endsWith("-review-manifest.json")) {
      const technicalPassed =
        value.technicalResult === "passed" ||
        value.technicalReview?.passed === true;
      const visualPassed =
        value.visualResult === "passed" ||
        value.visualResult === "passed_no_unresolved_defects";
      const counselAdopted = ["approved", "adopted", "counsel_adopted"].includes(
        value.humanLegalReviewStatus
      );
      const stagingPassed = ["staging_passed", "approved_for_staging"].includes(
        value.runtimeStatus
      );
      const productionEnabled =
        value.runtimeStatus === "production_enabled" ||
        value.runtimeStatus === "live" ||
        value.packetReady === true;

      for (const trackId of trackIds) {
        mergeProof(technical, trackId, technicalPassed);
        mergeProof(visual, trackId, visualPassed);
        mergeProof(
          legalRecommendation,
          trackId,
          value.legalRecommendationComplete === true
        );
        mergeProof(counsel, trackId, counselAdopted);
        mergeProof(staging, trackId, stagingPassed);
        mergeProof(production, trackId, productionEnabled);
      }
    }

    if (name.endsWith("-visual-review.json")) {
      const visualPassed = [
        "passed",
        "passed_no_unresolved_defects"
      ].includes(value.result);
      for (const trackId of trackIds) mergeProof(visual, trackId, visualPassed);
    }

    if (name.endsWith("-legal-output-recommendation.json")) {
      const recommended = asArray(value.recommendations).filter((entry) =>
        ["recommended_for_counsel_adoption", "recommended"].includes(entry?.status)
      );
      for (const entry of recommended) {
        for (const trackId of [
          entry.trackId,
          ...asArray(entry.trackIds)
        ].filter(Boolean)) {
          mergeProof(legalRecommendation, trackId, true);
          mergeProof(
            counsel,
            trackId,
            ["approved", "adopted", "counsel_adopted"].includes(
              value.humanLegalReviewStatus
            )
          );
        }
      }
    }
  }

  loadCounselAdoptionProofs();
  loadFactoryReviewProofs();
  return {
    implementation,
    authorityPins,
    technical,
    visual,
    legalRecommendation,
    counsel,
    staging,
    production
  };

  function loadCounselAdoptionProofs() {
    const adoptionDirectory = path.join(rootDir, INPUTS.adoptionDirectory);
    if (!fs.existsSync(adoptionDirectory)) return;
    const adoptedTrackIds = new Set();
    for (const [name, trusted] of Object.entries(TRUSTED_COUNSEL_ADOPTIONS)) {
      const absolutePath = path.join(adoptionDirectory, name);
      if (!fs.existsSync(absolutePath)) continue;
      const recordBytes = fs.readFileSync(absolutePath);
      if (sha256(recordBytes) !== trusted.sha256) {
        throw new Error(`${name} does not match its trusted counsel-adoption hash`);
      }
      const value = readJson(
        rootDir,
        path.posix.join(INPUTS.adoptionDirectory, name)
      );
      if (
        value.status !== "counsel_adopted" ||
        value.blanketFutureApproval !== false ||
        value.productionEnabled !== false
      ) {
        throw new Error(`${name} is not a fail-closed counsel adoption record`);
      }
      const observedFamilyIds = asArray(value.completedScopes)
        .map((scope) => scope?.familyId)
        .sort();
      const expectedFamilyIds = Object.keys(trusted.scopes).sort();
      if (JSON.stringify(observedFamilyIds) !== JSON.stringify(expectedFamilyIds)) {
        throw new Error(`${name} does not match its trusted adopted families`);
      }
      for (const scope of asArray(value.completedScopes)) {
        const expectedRoutes = [...trusted.scopes[scope.familyId]].sort();
        const observedRoutes = [...asArray(scope.approvedRouteIds)].sort();
        if (
          scope.status !== "counsel_adopted" ||
          scope.scopeCompletion !== "exact_implemented_routes_complete" ||
          scope.fullCanonicalParentComplete !== false ||
          scope.runtime?.runtimeStatus !== "runtime_disabled" ||
          scope.runtime?.generationAllowed !== false ||
          scope.runtime?.packetReady !== false ||
          scope.runtime?.jurisdictionEnabled !== false ||
          scope.runtime?.productionEnabled !== false ||
          !/^[0-9a-f]{64}$/.test(scope.templateFamilySha256 ?? "") ||
          !asArray(scope.templateHashes).every((entry) =>
            /^[0-9a-f]{64}$/.test(entry?.sha256 ?? "")
          ) ||
          !asArray(scope.reviewArtifacts).every((entry) =>
            /^[0-9a-f]{64}$/.test(entry?.sha256 ?? "")
          ) ||
          scope.hashBoundScope?.schemaVersion !==
            "rcap-counsel-adoption-hash-scope/v1" ||
          sha256Canonical(scope.hashBoundScope) !== scope.templateFamilySha256 ||
          JSON.stringify(observedRoutes) !== JSON.stringify(expectedRoutes) ||
          asArray(scope.legalDesignSpecificationHashes).length !==
            expectedRoutes.length ||
          !asArray(scope.boundArtifactHashes).every((entry) =>
            artifactPinMatches(rootDir, entry)
          )
        ) {
          throw new Error(`${name} contains an invalid adopted scope`);
        }
        for (const trackId of asArray(scope.approvedRouteIds)) {
          if (typeof trackId !== "string" || adoptedTrackIds.has(trackId)) {
            throw new Error(`${name} duplicates or invalidly names ${trackId}`);
          }
          adoptedTrackIds.add(trackId);
          mergeProof(legalRecommendation, trackId, true);
          mergeProof(counsel, trackId, true);
        }
      }
    }
  }

  function loadFactoryReviewProofs() {
    const factoryDirectory = path.join(rootDir, INPUTS.factoryReviewDirectory);
    if (!fs.existsSync(factoryDirectory)) return;
    const implementationLanes = new Set([
      "custom_pleading",
      "acroform_fill",
      "flat_pdf_overlay",
      "composed_route",
      "guidance_implementation"
    ]);
    const proofLanes = new Set([
      ...implementationLanes,
      "legal_output_review",
      "staging_promotion"
    ]);
    for (const name of fs
      .readdirSync(factoryDirectory)
      .filter((entry) => entry.endsWith(".json"))
      .sort()) {
      const value = readJson(
        rootDir,
        path.posix.join(INPUTS.factoryReviewDirectory, name)
      );
      const trackIds = asArray(value.trackIds).filter(
        (trackId) => typeof trackId === "string"
      );
      const outputsComplete =
        asArray(value.implementationOutputs).length > 0 &&
        asArray(value.implementationOutputs).every(
          (entry) => entry?.exists === true
        );
      for (const trackId of trackIds) {
        if (implementationLanes.has(value.lane)) {
          mergeProof(implementation, trackId, outputsComplete);
        }
        if (proofLanes.has(value.lane)) {
          mergeProof(technical, trackId, value.technicalProofPassed === true);
        }
        if (["legal_output_review", "staging_promotion"].includes(value.lane)) {
          mergeProof(visual, trackId, value.visualProofPassed === true);
          mergeProof(
            legalRecommendation,
            trackId,
            value.legalRecommendationComplete === true
          );
          mergeProof(counsel, trackId, value.counselAdopted === true);
        }
        if (value.lane === "staging_promotion") {
          mergeProof(staging, trackId, value.stagingPassed === true);
          mergeProof(production, trackId, value.productionEnabled === true);
        }
      }
    }
  }
}

function mergeProof(map, key, value) {
  if (value === true || !map.has(key)) map.set(key, value === true);
}

function blockerFor(row, sourceRows) {
  if (!row.authorityCleared) {
    const authorityBlocker = sourceRows.find((entry) =>
      AUTHORITY_BLOCKER_SCOPES.has(entry.blockerScope)
    );
    if (authorityBlocker) {
      return (
        authorityBlocker.requiredResolution ||
        authorityBlocker.currentRepositoryTreatment ||
        authorityBlocker.blockerType
      );
    }
    return "The track has not cleared every adopted authority requirement.";
  }
  if (!row.sourcePinned) {
    return "The selected source is not pinned to an immutable repository revision.";
  }
  if (!row.implementationComplete) {
    return `Implementation incomplete (${row.implementationQueue ?? "unassigned"}).`;
  }
  if (!row.technicalProofPassed) {
    return (
      firstStatement(row.rawBlockers.filter((entry) => entry?.kind === "technical_proof_gate")) ||
      "Focused technical proof has not passed."
    );
  }
  if (!row.visualProofPassed) {
    return (
      firstStatement(row.rawBlockers.filter((entry) => entry?.kind === "visual_review_gate")) ||
      "Rendered packet visual proof has not passed."
    );
  }
  if (!row.legalRecommendationComplete) {
    return `Legal recommendation is incomplete (${row.legalDesignStatus ?? "unknown"}).`;
  }
  if (!row.counselAdopted) {
    return "Counsel has not adopted the produced legal output.";
  }
  if (!row.stagingPassed) return "Staging validation has not passed.";
  if (!row.productionEnabled) return "Production enablement has not been approved.";
  return null;
}

export function buildFactoryStatus({ rootDir = DEFAULT_ROOT } = {}) {
  const authority = readJson(rootDir, INPUTS.authority);
  const registry = readJson(rootDir, INPUTS.tracks);
  const jurisdictionInventory = readJson(rootDir, INPUTS.jurisdictionInventory);
  const relationships = readJson(rootDir, INPUTS.relationships);
  const blockerLedger = readJson(rootDir, INPUTS.blockers);
  const trackSourceAudit = readJson(rootDir, INPUTS.trackSourceAudit);
  const proofs = loadProofIndex(rootDir);
  const authorityAuditByTrack = new Map(
    asArray(trackSourceAudit.tracks).map((entry) => [
      `${entry.jurisdiction}:${entry.trackId}`,
      entry
    ])
  );

  const relationshipsByTrack = new Map();
  for (const entry of asArray(relationships.relationships)) {
    const key = `${entry.jurisdiction}:${entry.trackId}`;
    if (!relationshipsByTrack.has(key)) relationshipsByTrack.set(key, []);
    relationshipsByTrack.get(key).push(entry);
  }

  const blockersByTrack = new Map();
  for (const entry of asArray(blockerLedger.rows)) {
    const key = `${entry.jurisdiction}:${entry.trackId}`;
    if (!blockersByTrack.has(key)) blockersByTrack.set(key, []);
    blockersByTrack.get(key).push(entry);
  }

  const tracks = asArray(registry.tracks)
    .map((track) => {
      const key = `${track.jurisdiction}:${track.trackId}`;
      const trackRelationships = relationshipsByTrack.get(key) ?? [];
      const ledgerRows = blockersByTrack.get(key) ?? [];
      const hasAuthorityBlocker = ledgerRows.some((entry) =>
        AUTHORITY_BLOCKER_SCOPES.has(entry.blockerScope)
      );
      const hasPinnedRelationship =
        trackRelationships.length === 0 ||
        trackRelationships.every(
          (entry) => !entry.officialFormId || /^[0-9a-f]{64}$/.test(entry.sha256 ?? "")
        );

      const normalized = Boolean(track.trackId && track.legalDesignStatus);
      const authorityCleared =
        authority.adoptionStatus === "adopted" &&
        authorityAuditByTrack.get(key)?.cleared === true;
      const sourcePinned =
        authority.adoptionStatus === "adopted" &&
        (proofs.authorityPins.has(track.trackId) ||
          (hasPinnedRelationship && !hasAuthorityBlocker));
      const implementationComplete = proofs.implementation.get(track.trackId) === true;
      const technicalProofPassed = proofs.technical.get(track.trackId) === true;
      const visualProofPassed = proofs.visual.get(track.trackId) === true;
      const legalRecommendationComplete =
        proofs.legalRecommendation.get(track.trackId) === true;
      const counselAdopted = proofs.counsel.get(track.trackId) === true;
      const stagingPassed = proofs.staging.get(track.trackId) === true;
      const productionEnabled = proofs.production.get(track.trackId) === true;
      const finalDisposition =
        productionEnabled || TERMINAL_LEGAL_STATUSES.has(track.legalStatus);

      const internal = {
        jurisdiction: track.jurisdiction,
        trackId: track.trackId,
        strategyFamily: track.outputStrategy ?? track.implementationQueue ?? "unclassified",
        implementationQueue: track.implementationQueue ?? null,
        legalDesignStatus: track.legalDesignStatus ?? null,
        legalStatus: track.legalStatus ?? null,
        normalized,
        authorityCleared,
        sourcePinned,
        authorityPinned: sourcePinned,
        implementationComplete,
        technicalProofPassed,
        visualProofPassed,
        legalRecommendationComplete,
        counselAdopted,
        stagingPassed,
        productionEnabled,
        finalDisposition,
        rawBlockers: asArray(track.blockers)
      };
      return {
        ...internal,
        exactBlocker: blockerFor(internal, ledgerRows)
      };
    })
    .sort(
      (left, right) =>
        left.jurisdiction.localeCompare(right.jurisdiction) ||
        left.trackId.localeCompare(right.trackId)
    );

  const publicTracks = tracks.map((track) =>
    Object.fromEntries(
      Object.entries(track).filter(([field]) => field !== "rawBlockers")
    )
  );
  const inventoryByJurisdiction = new Map(
    asArray(jurisdictionInventory.jurisdictions).map((entry) => [entry.jurisdiction, entry])
  );
  const jurisdictionCodes = [
    ...new Set([
      ...inventoryByJurisdiction.keys(),
      ...publicTracks.map((track) => track.jurisdiction)
    ])
  ].sort();
  const jurisdictions = jurisdictionCodes.map((jurisdiction) => {
    const rows = publicTracks.filter((track) => track.jurisdiction === jurisdiction);
    const inventory = inventoryByJurisdiction.get(jurisdiction);
    const count = (field) => rows.filter((row) => row[field]).length;
    const firstBlocked = rows.find((row) => row.exactBlocker);
    return {
      jurisdiction,
      trackCount: rows.length,
      normalized: count("normalized"),
      authorityCleared: count("authorityCleared"),
      sourcePinned: count("sourcePinned"),
      authorityPinned: count("authorityPinned"),
      implementationComplete: count("implementationComplete"),
      technicalProofPassed: count("technicalProofPassed"),
      visualProofPassed: count("visualProofPassed"),
      legalRecommendationComplete: count("legalRecommendationComplete"),
      counselAdopted: count("counselAdopted"),
      stagingPassed: count("stagingPassed"),
      productionEnabled: count("productionEnabled"),
      finalDisposition: count("finalDisposition"),
      exactBlocker: firstBlocked
        ? `${firstBlocked.trackId}: ${firstBlocked.exactBlocker}`
        : firstStatement(inventory?.blockers) ||
          inventory?.nextAction ||
          (rows.length === 0 ? "Relief tracks have not been normalized." : null)
    };
  });

  const finalDispositionCount = publicTracks.filter((track) => track.finalDisposition).length;
  const jurisdictionsWithoutNormalizedTracks = jurisdictions.filter(
    (entry) => entry.trackCount === 0
  ).length;
  const rawCompletion =
    publicTracks.length === 0 ? 0 : (finalDispositionCount / publicTracks.length) * 100;
  const countTracks = (field) =>
    publicTracks.filter((track) => track[field]).length;
  const implementationProofCount = publicTracks.filter(
    (track) =>
      track.implementationComplete &&
      track.technicalProofPassed &&
      track.visualProofPassed
  ).length;
  const completionPercent =
    jurisdictionsWithoutNormalizedTracks > 0 && rawCompletion >= 100
      ? 99.99
      : Number(rawCompletion.toFixed(2));
  return {
    schemaVersion: 1,
    authorityVersion: `master-library/${authority.edition}`,
    authoritySchemaVersion: authority.authoritySchemaVersion,
    authorityEdition: authority.edition,
    definitionOfComplete:
      "100% requires all 51 jurisdictions normalized and every track to have a terminal disposition: production enabled or an explicit terminal legal disposition.",
    readinessMetrics: {
      authorityCleared: countTracks("authorityCleared"),
      authorityBlocked: publicTracks.length - countTracks("authorityCleared"),
      sourcePinned: countTracks("sourcePinned"),
      implementationProof: implementationProofCount,
      finalDisposition: finalDispositionCount
    },
    totals: {
      jurisdictions: jurisdictions.length,
      jurisdictionsWithoutNormalizedTracks,
      tracks: publicTracks.length,
      normalized: countTracks("normalized"),
      authorityCleared: countTracks("authorityCleared"),
      authorityBlocked: publicTracks.length - countTracks("authorityCleared"),
      authorityPinned: countTracks("authorityPinned"),
      sourcePinned: countTracks("sourcePinned"),
      implementationComplete: countTracks("implementationComplete"),
      implementationProof: implementationProofCount,
      technicalProofPassed: countTracks("technicalProofPassed"),
      visualProofPassed: countTracks("visualProofPassed"),
      legalRecommendationComplete: countTracks(
        "legalRecommendationComplete"
      ),
      counselAdopted: countTracks("counselAdopted"),
      stagingPassed: countTracks("stagingPassed"),
      productionEnabled: countTracks("productionEnabled"),
      finalDisposition: finalDispositionCount,
      completionPercent,
      packetReady: Number(registry.packetReadyCount ?? 0),
      enabledJurisdictions: publicTracks.some((track) => track.productionEnabled)
        ? new Set(
            publicTracks
              .filter((track) => track.productionEnabled)
              .map((track) => track.jurisdiction)
          ).size
        : 0,
      launchGate: publicTracks.some((track) => track.productionEnabled) ? "not_red" : "red"
    },
    jurisdictions,
    tracks: publicTracks
  };
}

function parseArgs(argv) {
  const options = {
    json: false,
    tracks: false,
    jurisdiction: null,
    trackId: null
  };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--json") options.json = true;
    else if (value === "--tracks") options.tracks = true;
    else if (value === "--jurisdiction") options.jurisdiction = argv[++index]?.toUpperCase();
    else if (value.startsWith("--jurisdiction=")) {
      options.jurisdiction = value.slice("--jurisdiction=".length).toUpperCase();
    } else if (value === "--track") options.trackId = argv[++index];
    else if (value.startsWith("--track=")) options.trackId = value.slice("--track=".length);
    else throw new Error(`Unknown argument: ${value}`);
  }
  return options;
}

function fraction(value, total) {
  return `${value}/${total}`;
}

function printHuman(status, options) {
  const filteredTracks = status.tracks.filter(
    (track) =>
      (!options.jurisdiction || track.jurisdiction === options.jurisdiction) &&
      (!options.trackId || track.trackId === options.trackId)
  );

  console.log(
    `RCAP production factory — Master Library ${status.authorityEdition} — ` +
      `${status.totals.finalDisposition}/${status.totals.tracks} final dispositions ` +
      `(${status.totals.completionPercent}%)`
  );
  console.log(
    `packet_ready=${status.totals.packetReady} enabled_jurisdictions=${status.totals.enabledJurisdictions} ` +
      `launch_gate=${status.totals.launchGate}`
  );
  console.log(status.definitionOfComplete);
  console.log("");

  if (options.tracks || options.trackId) {
    console.log(
      "Flags: normalized, authority, implementation, technical, visual, recommendation, counsel, staging, production"
    );
    for (const row of filteredTracks) {
      const marks = [
        row.normalized,
        row.authorityPinned,
        row.implementationComplete,
        row.technicalProofPassed,
        row.visualProofPassed,
        row.legalRecommendationComplete,
        row.counselAdopted,
        row.stagingPassed,
        row.productionEnabled
      ]
        .map((value) => (value ? "Y" : "-"))
        .join("");
      console.log(
        `${row.jurisdiction} ${row.trackId} [${marks}] ${row.exactBlocker ?? "final"}`
      );
    }
    return;
  }

  for (const row of status.jurisdictions.filter(
    (entry) => !options.jurisdiction || entry.jurisdiction === options.jurisdiction
  )) {
    console.log(
      `${row.jurisdiction} tracks=${row.trackCount} normalized=${fraction(
        row.normalized,
        row.trackCount
      )} pinned=${fraction(row.authorityPinned, row.trackCount)} implemented=${fraction(
        row.implementationComplete,
        row.trackCount
      )} technical=${fraction(row.technicalProofPassed, row.trackCount)} visual=${fraction(
        row.visualProofPassed,
        row.trackCount
      )} recommendation=${fraction(
        row.legalRecommendationComplete,
        row.trackCount
      )} counsel=${fraction(row.counselAdopted, row.trackCount)} staging=${fraction(
        row.stagingPassed,
        row.trackCount
      )} production=${fraction(row.productionEnabled, row.trackCount)} blocker=${
        row.exactBlocker ?? "none"
      }`
    );
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const options = parseArgs(process.argv.slice(2));
    const status = buildFactoryStatus();
    const filtered = {
      ...status,
      jurisdictions: status.jurisdictions.filter(
        (entry) => !options.jurisdiction || entry.jurisdiction === options.jurisdiction
      ),
      tracks: status.tracks.filter(
        (entry) =>
          (!options.jurisdiction || entry.jurisdiction === options.jurisdiction) &&
          (!options.trackId || entry.trackId === options.trackId)
      )
    };
    if (options.json) console.log(`${JSON.stringify(filtered, null, 2)}\n`);
    else printHuman(status, options);
  } catch (error) {
    console.error(`rcap:factory:status failed: ${error.message}`);
    process.exitCode = 1;
  }
}
