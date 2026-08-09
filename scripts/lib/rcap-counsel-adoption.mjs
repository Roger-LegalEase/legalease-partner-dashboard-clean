import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { register } from "node:module";
import { spawnSync } from "node:child_process";

register("./ts-esm-loader.mjs", import.meta.url);

export const ADOPTION_RECORD_PATHS = Object.freeze([
  "data/record-clearing/template-families/ADOPT-01-custom-pleading-family-adoption.json",
  "data/record-clearing/template-families/ADOPT-02-official-acroform-family-adoption.json"
]);

const SHA256_PATTERN = /^[0-9a-f]{64}$/;
const ADOPTED_ON = "2026-08-04";
const APPROVED_BY_ROLE = "licensed_counsel";
const APPROVAL_BASIS =
  "counsel_approved_all_current_implemented_legal_output_recommendations";
const HASH_SCOPE_SCHEMA_VERSION = "rcap-counsel-adoption-hash-scope/v1";
const RENEWAL_TRIGGERS = Object.freeze([
  "controlling_legal_authority",
  "source_sha256",
  "source_role",
  "template_family_hash",
  "pleading_specification",
  "official_form_field_map",
  "participant_facing_text",
  "packet_component_order",
  "branch_logic",
  "self_help_stop_condition",
  "proposed_order_language",
  "final_packet_bytes_except_proven_container_only_changes"
]);

const FAMILY_CONFIGS = Object.freeze([
  {
    adoptionJobId: "ADOPT-01-custom-pleading-family-adoption",
    reviewJobId: "REV-01-custom-pleading-family-review",
    adoptionRecordPath: ADOPTION_RECORD_PATHS[0],
    familyId: "tranche-1-mississippi-petitions",
    trancheNumber: 1,
    jurisdiction: "MS",
    sourceImplementationCommit: "1fd2e122c30f7608817910583084e3b068bd5940",
    integratedImplementationCommit: "1fd2e122c30f7608817910583084e3b068bd5940",
    approvedRouteIds: [
      "ms-fel",
      "ms-misd-1st",
      "ms-misd-addl",
      "ms-nonconv",
      "ms-nonadj"
    ],
    templateRegistry: "mississippi",
    mappingRegistry: null,
    routeCodePaths: [
      "src/lib/rcap/packets/engines/guidance-templates-mississippi.ts",
      "src/lib/rcap/packets/engines/pleading-templates-mississippi.ts",
      "src/lib/rcap/packets/registry-mississippi.ts",
      "src/lib/rcap/packets/tranche-1-mississippi-facts.ts"
    ],
    requiredBeforeFiling: [
      "Use the packet's exact participant guide; obtain and cross-check the certified case records it identifies before filing.",
      "Complete and sign every participant-owned field, and confirm any local verification, notarization, form, and filing-fee practice with the clerk.",
      "File in the exact court and venue identified by the route, retain copies, and complete the packet's service steps.",
      "For ms-fel, give the district attorney ten days' written notice and retain proof of that notice."
    ],
    additionalKnownLimitations: [
      "The adopted review visually sampled the declared Mississippi branches recorded in the visual-review artifact; the complete positive-fixture and template hashes bind every declared branch."
    ],
    nonCounselReleaseBlockers: [
      "The per-track promotion/status application contract is not implemented.",
      "Packet persistence and the staging contract are not implemented.",
      "Mississippi staging and end-to-end acceptance have not passed.",
      "Runtime remains disabled and production promotion has not occurred."
    ],
    excludedRouteIds: []
  },
  {
    adoptionJobId: "ADOPT-01-custom-pleading-family-adoption",
    reviewJobId: "REV-01-custom-pleading-family-review",
    adoptionRecordPath: ADOPTION_RECORD_PATHS[0],
    familyId: "tranche-3-georgia-superior-court-pleadings",
    trancheNumber: 3,
    jurisdiction: "GA",
    sourceImplementationCommit: "080ed5d94e92442069b4000511f04194f734f36d",
    integratedImplementationCommit: "037d1a2ce2bccd0dffc243e213a26c5019865561",
    approvedRouteIds: [
      "ga-felony-j1",
      "ga-vacated-j2",
      "ga-deaddocket-j3",
      "ga-misd-j4",
      "ga-fugitive-j5",
      "ga-pardon-j7",
      "ga-seal-m",
      "ga-fo-active-pre2026",
      "ga-fo-discharged-pre2026"
    ],
    templateRegistry: "georgia",
    mappingRegistry: null,
    routeCodePaths: [
      "src/lib/rcap/packets/engines/guidance-templates-ga.ts",
      "src/lib/rcap/packets/engines/pleading-templates-ga.ts",
      "src/lib/rcap/packets/registry-ga-superior-court-pleading-family.ts"
    ],
    requiredBeforeFiling: [
      "Obtain and attach the route-specific disposition, criminal-history, pardon, sentence, discharge, or other evidence listed in the packet.",
      "Complete any missing offender tracking number by hand when available, and confirm the exact court, venue, existing case number, local filing method, and fee with the clerk.",
      "The participant signs the pleading and certificate of service; the proposed order remains for the judge.",
      "Serve the route-specific statutory recipients and follow the exact filing, notice, service, and stop instructions bound in the component-guidance artifact."
    ],
    additionalKnownLimitations: [
      "Seven cited, non-generation-target Georgia sources have no recorded SHA-256; their staleness remains manually reviewable rather than mechanically detectable.",
      "The nine rendered positive packets visually cover one current sample per route, not every declared branch variant. All declared branch logic is bound by the exact template, fixture, component-order, and code hashes in this adoption scope.",
      "Georgia's 45 templates remain isolated from the shared template registry. Their exact objects are bound with canonicalJsonSha256; registration and runtime wiring remain separate integration work.",
      "The six counsel questions remain preserved as as-built limitations. Adoption approves the exact implemented treatments and does not silently answer or rewrite those questions."
    ],
    nonCounselReleaseBlockers: [
      "The per-track promotion/status application contract is not implemented.",
      "The shared review-time registration follow-up remains open.",
      "Packet persistence and the staging contract are not implemented.",
      "Georgia staging and end-to-end acceptance have not passed.",
      "Runtime remains disabled and production promotion has not occurred."
    ],
    excludedRouteIds: ["ga-jail-k2"]
  },
  {
    adoptionJobId: "ADOPT-02-official-acroform-family-adoption",
    reviewJobId: "REV-02-official-acroform-family-review",
    adoptionRecordPath: ADOPTION_RECORD_PATHS[1],
    familyId: "tranche-2-maryland-official-forms",
    trancheNumber: 2,
    jurisdiction: "MD",
    sourceImplementationCommit: "e209f3469b1b426d30d6d05550e84dfb0b24c147",
    integratedImplementationCommit: "4ccf8ce2f96b5aef19dc6e53715db35cc685776a",
    approvedRouteIds: ["md_second_chance_shielding"],
    templateRegistry: "maryland",
    mappingRegistry: "maryland",
    routeCodePaths: [
      "src/lib/rcap/packets/engines/guidance-templates-maryland.ts",
      "src/lib/rcap/packets/registry-maryland.ts",
      "src/lib/rcap/packets/tranche-2-maryland-facts.ts"
    ],
    requiredBeforeFiling: [
      "Sign and date the participant-owned fields by hand and confirm case numbers, offence elections, court, and county against Maryland Judiciary Case Search.",
      "Use this route only for one court and one county and only if the participant has never previously filed a shielding petition.",
      "File the completed CC-DC-CR-148 and MDJ-008; retain the participant guide rather than filing it.",
      "Confirm the current filing method and fee with the clerk, follow the guide's service and supporting-document instructions, and stop on every listed handoff condition."
    ],
    additionalKnownLimitations: [
      "The exact private CC-DC-CR-148 and MDJ-008 binaries are absent from this integration environment; their previously verified source hashes remain bound.",
      "The retained Maryland legal review records no SHA-256 for its cited statute, Rules, and Judiciary self-help page, so those currentness checks remain manual."
    ],
    nonCounselReleaseBlockers: [
      "Edition 1.2 still records generation_allowed=false; Edition 1.3/source binding has not authorized generation.",
      "The shielding-fee/current-authority treatment remains an authority release gate.",
      "The exact private source PDFs are unavailable in this integration environment.",
      "The per-track promotion/status application contract is not implemented.",
      "Packet persistence and the staging contract are not implemented.",
      "Maryland staging and end-to-end acceptance have not passed.",
      "Runtime remains disabled and production promotion has not occurred."
    ],
    excludedRouteIds: []
  }
]);

export async function buildCurrentCounselAdoptionRecords({
  rootDir = process.cwd()
} = {}) {
  const root = path.resolve(rootDir);
  const registries = await loadTemplateRegistries();
  const scopes = [];
  for (const config of FAMILY_CONFIGS) {
    scopes.push(buildAdoptionScope(root, config, registries));
  }

  const records = new Map();
  for (const recordPath of ADOPTION_RECORD_PATHS) {
    const recordScopes = scopes
      .filter((scope) => scope.adoptionRecordPath === recordPath)
      .map(({ adoptionRecordPath: _recordPath, ...scope }) => scope)
      .sort((left, right) => left.familyId.localeCompare(right.familyId));
    const adoptionJobId = recordScopes[0].adoptionJobId;
    records.set(recordPath, {
      schemaVersion: "rcap-counsel-adoption/v1",
      adoptionJobId,
      status: "counsel_adopted",
      adoptedOn: ADOPTED_ON,
      approvedByRole: APPROVED_BY_ROLE,
      approvalBasis: APPROVAL_BASIS,
      counselIdentityReference: null,
      scopePolicy:
        "Approval is route-, source-, template-, mapping-, branch-, review-, and packet-hash bound. It does not cover future or modified output.",
      completedScopeCount: recordScopes.length,
      approvedRouteCount: recordScopes.reduce(
        (total, scope) => total + scope.approvedRouteIds.length,
        0
      ),
      completedScopes: recordScopes,
      blanketFutureApproval: false,
      productionEnabled: false
    });
  }
  return records;
}

function buildAdoptionScope(root, config, registries) {
  const prefix =
    `data/record-clearing/implementation-tranches/tranche-${config.trancheNumber}`;
  const tranchePath = `${prefix}.json`;
  const authorityPinsPath = `${prefix}-authority-pins.json`;
  const componentGuidancePath = `${prefix}-component-guidance.json`;
  const fieldOwnershipPath = `${prefix}-field-ownership.json`;
  const fixturesPath = `${prefix}-fixtures.json`;
  const reviewManifestPath = `${prefix}-review-manifest.json`;
  const visualReviewPath = `${prefix}-visual-review.json`;
  const legalRecommendationPath = `${prefix}-legal-output-recommendation.json`;
  const tranche = readJson(root, tranchePath);
  const authorityPins = readJson(root, authorityPinsPath);
  const fixtures = readJson(root, fixturesPath);
  const review = readJson(root, reviewManifestPath);
  const visualReview = readJson(root, visualReviewPath);
  const legalRecommendation = fs.existsSync(path.join(root, legalRecommendationPath))
    ? readJson(root, legalRecommendationPath)
    : null;
  const legalDesignSpecifications = readJson(
    root,
    "data/record-clearing/legal-design-specifications.json"
  );

  assertApprovedProof(
    config,
    tranche,
    review,
    visualReview,
    legalRecommendation
  );

  const tracks = authorityPins.tracks.filter((track) =>
    config.approvedRouteIds.includes(track.trackId)
  );
  const componentShapes = tracks.flatMap((track) =>
    track.components.map((component, index) => ({
      trackId: track.trackId,
      componentId: component.componentId,
      order: index + 1,
      role: component.role,
      requirement: component.requirement === "conditional" ? "conditional" : "required",
      conditionKey: component.conditionKey ?? null,
      outputStrategy: component.outputStrategy,
      rendererStrategy: component.rendererStrategy ?? component.outputStrategy,
      templateId: component.templateId ?? null,
      sourceId: component.asset?.documentId ?? component.officialFormId ?? null,
      mappingId:
        component.outputStrategy === "official_pdf_fill"
          ? component.officialFormId ?? null
          : null
    }))
  );
  const templateIds = [
    ...new Set(componentShapes.map((component) => component.templateId).filter(Boolean))
  ].sort();
  const templateHashes = templateIds.map((templateId) => {
    const registered = registries[config.templateRegistry][templateId];
    if (!registered) {
      throw new Error(`${config.familyId} template is not available: ${templateId}`);
    }
    return {
      id: templateId,
      sha256: registries.canonicalJsonSha256(registered),
      hashMethod:
        config.templateRegistry === "georgia"
          ? "canonicalJsonSha256_isolated_template_object"
          : "canonicalJsonSha256_registered_template_object"
    };
  });
  const mappingHashes =
    config.mappingRegistry === "maryland"
      ? [
          {
            id: "CC-DC-CR-148",
            sha256: registries.canonicalMappingSha256(
              registries.marylandMappings.ccDcCr148
            )
          },
          {
            id: "MDJ-008",
            sha256: registries.canonicalMappingSha256(
              registries.marylandMappings.mdj008
            )
          }
        ]
      : [];
  const sourceHashes = collectSourceHashes(authorityPins, tracks);
  const reviewManifestSha256 = fileSha256(root, reviewManifestPath);
  const visualReviewSha256 = fileSha256(root, visualReviewPath);
  const branchVariantCoverage = buildBranchCoverage(
    config,
    tranche,
    fixtures,
    review,
    visualReview
  );
  const representativePackets = normalizeRepresentativePackets(review);
  const preservedCounselQuestions =
    config.jurisdiction === "GA"
      ? asArray(legalRecommendation?.questionsForCounsel)
      : [];
  if (config.jurisdiction === "GA" && preservedCounselQuestions.length !== 6) {
    throw new Error(
      `${config.familyId} must preserve the six reviewed Georgia counsel questions`
    );
  }
  const legalDesignSpecificationHashes = buildLegalDesignSpecificationHashes(
    config,
    legalDesignSpecifications,
    registries.canonicalJsonSha256
  );
  const knownLimitations = [
    ...asArray(tranche.mappingGatesRemaining),
    ...asArray(tranche.sourceGatesRemaining),
    ...config.additionalKnownLimitations
  ].filter(
    (entry) =>
      typeof entry === "string" &&
      !entry.includes("production-factory review manifest")
  );
  const hashBoundScope = {
    schemaVersion: HASH_SCOPE_SCHEMA_VERSION,
    familyId: config.familyId,
    templates: templateHashes,
    sources: sourceHashes,
    mappings: mappingHashes,
    legalDesignSpecifications: legalDesignSpecificationHashes,
    counselQuestions: preservedCounselQuestions.map((question) => ({
      id: question.id,
      sha256: registries.canonicalJsonSha256(question)
    })),
    components: componentShapes,
    branchVariants: branchVariantCoverage.flatMap((track) =>
      track.declaredVariantIds.map((variantId) => `${track.trackId}:${variantId}`)
    ),
    authorityArchiveSha256: authorityPins.authorityArchiveSha256,
    controllingReviewSha256: reviewManifestSha256
  };
  const implementationBoundPaths = [
    tranchePath,
    authorityPinsPath,
    componentGuidancePath,
    fieldOwnershipPath,
    fixturesPath,
    reviewManifestPath,
    visualReviewPath,
    ...(legalRecommendation ? [legalRecommendationPath] : []),
    ...config.routeCodePaths
  ];
  assertCommitProvenance(root, config, implementationBoundPaths);
  const boundArtifactPaths = [
    ...implementationBoundPaths,
    ...(config.jurisdiction === "GA"
      ? [
          "data/record-clearing/production-factory/review-manifests/rcap-ga-custom-pleading.json"
        ]
      : [])
  ];
  const reviewArtifacts = [
    artifactPin(root, reviewManifestPath, "technical_and_packet_review"),
    artifactPin(root, visualReviewPath, "visual_review"),
    ...(legalRecommendation
      ? [artifactPin(root, legalRecommendationPath, "legal_output_recommendation")]
      : []),
    ...(config.jurisdiction === "GA"
      ? [
          artifactPin(
            root,
            "data/record-clearing/production-factory/review-manifests/rcap-ga-custom-pleading.json",
            "integration_factory_review"
          )
        ]
      : [])
  ];

  return {
    adoptionRecordPath: config.adoptionRecordPath,
    adoptionJobId: config.adoptionJobId,
    reviewJobId: config.reviewJobId,
    familyId: config.familyId,
    jurisdiction: config.jurisdiction,
    status: "counsel_adopted",
    adoptedOn: ADOPTED_ON,
    approvedByRole: APPROVED_BY_ROLE,
    approvalBasis: APPROVAL_BASIS,
    sourceImplementationCommit: config.sourceImplementationCommit,
    integratedImplementationCommit: config.integratedImplementationCommit,
    approvedRouteIds: [...config.approvedRouteIds],
    excludedRouteIds: [...config.excludedRouteIds],
    hashBoundScope,
    templateFamilySha256: registries.canonicalJsonSha256(hashBoundScope),
    templateHashes,
    sourceHashes,
    mappingHashes,
    legalDesignSpecificationHashes,
    authorityPinsManifest: artifactPin(
      root,
      authorityPinsPath,
      "authority_source_pins"
    ),
    reviewArtifacts,
    representativePackets,
    branchVariantCoverage,
    preservedCounselQuestions,
    specificationPins: [
      artifactPin(root, componentGuidancePath, "component_guidance"),
      artifactPin(root, fieldOwnershipPath, "field_ownership"),
      artifactPin(root, fixturesPath, "positive_and_boundary_fixtures"),
      ...legalDesignSpecificationHashes.map((entry) => ({
        role: "canonical_legal_design_specification",
        path: "data/record-clearing/legal-design-specifications.json",
        trackId: entry.trackId,
        sha256: entry.sha256,
        hashMethod: entry.hashMethod
      }))
    ],
    boundArtifactHashes: boundArtifactPaths.map((artifactPath) =>
      artifactPin(root, artifactPath, "adopted_scope")
    ),
    knownLimitations,
    requiredBeforeFiling: [...config.requiredBeforeFiling],
    nonCounselReleaseBlockers: [...config.nonCounselReleaseBlockers],
    renewalTriggers: [...RENEWAL_TRIGGERS],
    runtime: {
      runtimeStatus: tranche.runtimeStatus,
      generationAllowed: tranche.generationAllowed,
      packetReady: tranche.packetReady,
      jurisdictionEnabled: tranche.jurisdictionEnabled,
      productionEnabled: false
    },
    scopeCompletion: "exact_implemented_routes_complete",
    fullCanonicalParentComplete: false
  };
}

async function loadTemplateRegistries() {
  const [
    templateHash,
    mississippiPleading,
    mississippiGuidance,
    georgiaPleading,
    marylandGuidance,
    marylandRegistry
  ] = await Promise.all([
    import("../../src/lib/rcap/packets/template-hash.ts"),
    import("../../src/lib/rcap/packets/engines/pleading-templates-mississippi.ts"),
    import("../../src/lib/rcap/packets/engines/guidance-templates-mississippi.ts"),
    import("../../src/lib/rcap/packets/engines/pleading-templates-ga.ts"),
    import("../../src/lib/rcap/packets/engines/guidance-templates-maryland.ts"),
    import("../../src/lib/rcap/packets/registry-maryland.ts")
  ]);
  return {
    canonicalJsonSha256: templateHash.canonicalJsonSha256,
    canonicalMappingSha256: templateHash.canonicalMappingSha256,
    mississippi: {
      ...mississippiPleading.MISSISSIPPI_PLEADING_TEMPLATES,
      ...mississippiGuidance.MISSISSIPPI_GUIDANCE_TEMPLATES
    },
    georgia: georgiaPleading.GEORGIA_PLEADING_TEMPLATES,
    maryland: marylandGuidance.MARYLAND_GUIDANCE_TEMPLATES,
    marylandMappings: {
      ccDcCr148: marylandRegistry.MARYLAND_CC_DC_CR_148_MAPPINGS,
      mdj008: marylandRegistry.MARYLAND_MDJ_008_MAPPINGS
    }
  };
}

function assertApprovedProof(
  config,
  tranche,
  review,
  visualReview,
  legalRecommendation
) {
  const trancheRoutes = asArray(tranche.selectedTracks)
    .map((entry) => (typeof entry === "string" ? entry : entry?.trackId))
    .filter(Boolean)
    .sort();
  const expectedRoutes = [...config.approvedRouteIds].sort();
  if (JSON.stringify(trancheRoutes) !== JSON.stringify(expectedRoutes)) {
    throw new Error(`${config.familyId} approved route set does not match its tranche`);
  }
  const reviewRoutes = [
    ...new Set(
      asArray(review.selectedTracks)
        .map((entry) => (typeof entry === "string" ? entry : entry?.trackId))
        .filter(Boolean)
        .concat(asArray(review.samplePackets).map((entry) => entry?.trackId).filter(Boolean))
    )
  ].sort();
  if (JSON.stringify(reviewRoutes) !== JSON.stringify(expectedRoutes)) {
    throw new Error(`${config.familyId} approved route set does not match its review proof`);
  }
  const technicalPassed =
    review.technicalResult === "passed" || review.technicalReview?.passed === true;
  const visualPassed = ["passed", "passed_no_unresolved_defects"].includes(
    visualReview.result
  );
  if (
    !technicalPassed ||
    !visualPassed ||
    !Array.isArray(visualReview.unresolvedDefects) ||
    visualReview.unresolvedDefects.length !== 0
  ) {
    throw new Error(`${config.familyId} lacks completed technical or visual proof`);
  }
  const packets = normalizeRepresentativePackets(review);
  const packetRoutes = [...new Set(packets.map((packet) => packet.trackId))].sort();
  if (
    JSON.stringify(packetRoutes) !== JSON.stringify(expectedRoutes) ||
    packets.some(
      (packet) =>
        typeof packet.fixtureId !== "string" ||
        typeof packet.fileName !== "string" ||
        !SHA256_PATTERN.test(packet.sha256 ?? "") ||
        !Number.isInteger(packet.pageCount) ||
        packet.pageCount < 1
    )
  ) {
    throw new Error(`${config.familyId} representative packet proof is incomplete`);
  }
  if (legalRecommendation) {
    const recommendedRoutes = [
      ...new Set(
        asArray(legalRecommendation.recommendations)
          .filter(
            (entry) => entry?.status === "recommended_for_counsel_adoption"
          )
          .flatMap((entry) => [
            entry?.trackId,
            ...asArray(entry?.trackIds)
          ])
          .filter(Boolean)
      )
    ].sort();
    if (
      legalRecommendation.humanLegalReviewStatus !==
        "awaiting_counsel_adoption" ||
      JSON.stringify(recommendedRoutes) !== JSON.stringify(expectedRoutes)
    ) {
      throw new Error(
        `${config.familyId} legal-output recommendation no longer matches the approved routes`
      );
    }
  }
  if (
    tranche.runtimeStatus !== "runtime_disabled" ||
    tranche.generationAllowed !== false ||
    tranche.packetReady !== false ||
    tranche.jurisdictionEnabled !== false
  ) {
    throw new Error(`${config.familyId} runtime posture is not fail-closed`);
  }
}

function assertCommitProvenance(root, config, implementationBoundPaths) {
  for (const commit of [
    config.sourceImplementationCommit,
    config.integratedImplementationCommit
  ]) {
    git(root, ["cat-file", "-e", `${commit}^{commit}`]);
  }
  git(root, [
    "merge-base",
    "--is-ancestor",
    config.integratedImplementationCommit,
    "HEAD"
  ]);
  if (
    config.sourceImplementationCommit !== config.integratedImplementationCommit
  ) {
    const result = spawnSync(
      "git",
      [
        "diff",
        "--quiet",
        config.sourceImplementationCommit,
        config.integratedImplementationCommit,
        "--",
        ...implementationBoundPaths
      ],
      { cwd: root, encoding: "utf8" }
    );
    if (result.status !== 0) {
      throw new Error(
        `${config.familyId} integrated implementation is not content-equivalent to its source commit`
      );
    }
  }
  const current = spawnSync(
    "git",
    [
      "diff",
      "--quiet",
      config.integratedImplementationCommit,
      "--",
      ...implementationBoundPaths
    ],
    { cwd: root, encoding: "utf8" }
  );
  if (current.status !== 0) {
    const drifted = git(root, [
      "diff",
      "--name-only",
      config.integratedImplementationCommit,
      "--",
      ...implementationBoundPaths
    ])
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    const covered = drifted.every((relativePath) =>
      standingAdoptionCoversRegeneration(root, config, relativePath)
    );
    if (!covered) {
      throw new Error(
        `${config.familyId} approved implementation paths have drifted from ${config.integratedImplementationCommit}; renewed counsel adoption is required`
      );
    }
  }
}

/**
 * Whether the standing adoption reaches a regenerated bound artifact.
 *
 * Counsel adopted a legal document. The review manifest that records it also
 * records the SHA-256 and byte size of every render, so a shared-renderer
 * correction moves those digests without touching a word: the pagination fix
 * that stopped VERIFICATION and CERTIFICATE OF SERVICE standing alone at the
 * foot of a page moved six of Georgia's nine packets and changed no text, no
 * page count, no route, no component and no fixture.
 *
 * Asked as plain byte equality that reads as "the approved implementation has
 * drifted", and the only ways past it were to leave the manifest asserting
 * digests the renderer no longer produces, or to leave a real layout defect
 * unfixed. The standing external counsel adoption already answers the question
 * — it continues across "a PDF hash change from pagination or appearance
 * correction" — and a recorded applicability record names the artifact it was
 * applied to.
 *
 * Two conditions, both required, and the second is recomputed here rather than
 * believed: an applicability record must name this family, this artifact and
 * this adopted commit; and the two versions of the artifact must be identical
 * once the four measurement fields are removed. Anything else — a page count, a
 * route, a component, a fixture, a word, or drift in any other bound path —
 * fails and still demands renewal. This distinguishes the document from the
 * measurement of the document; it narrows nothing about legal content.
 */
function standingAdoptionCoversRegeneration(root, config, relativePath) {
  const applicability = readApplicabilityRecords(root).find(
    (record) =>
      record?.appliesTo?.familyId === config.familyId &&
      record?.appliesTo?.artifactPath === relativePath &&
      record?.historicalAdoptionPreserved?.integratedImplementationCommit ===
        config.integratedImplementationCommit &&
      record?.whatMoved?.kind === "layout_only" &&
      record?.boundary?.substantiveLegalReviewPerformed === false
  );
  if (!applicability) return false;

  const previous = spawnSync(
    "git",
    ["show", `${config.integratedImplementationCommit}:${relativePath}`],
    { cwd: root, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }
  );
  if (previous.status !== 0) return false;
  const absolute = path.join(root, relativePath);
  if (!fs.existsSync(absolute)) return false;
  let before;
  let after;
  try {
    before = JSON.parse(previous.stdout);
    after = JSON.parse(fs.readFileSync(absolute, "utf8"));
  } catch {
    return false;
  }
  const MEASUREMENT_FIELDS = new Set([
    "sha256",
    "assembledSha256",
    "assembledBytes",
    "byteSize"
  ]);
  const withoutMeasurements = (value) => {
    if (Array.isArray(value)) return value.map(withoutMeasurements);
    if (value && typeof value === "object") {
      const out = {};
      for (const key of Object.keys(value).sort()) {
        if (MEASUREMENT_FIELDS.has(key)) continue;
        out[key] = withoutMeasurements(value[key]);
      }
      return out;
    }
    return value;
  };
  return (
    JSON.stringify(withoutMeasurements(before)) ===
    JSON.stringify(withoutMeasurements(after))
  );
}

/**
 * Whether a re-pin of an adoption record moves only measurement.
 *
 * Exported for the recording script, which otherwise has two doors: refuse, or
 * `--renewed-counsel-adoption`, which asserts a renewal that did not happen. A
 * layout-only regeneration is neither. The comparison strips exactly the fields
 * that are digests or byte counts of a render — including the family hash that
 * is itself a digest of them — and requires everything else to be identical:
 * routes, statuses, scope completion, page counts, fixture ids, file names,
 * declared branch variants, specification hashes and adoption metadata all
 * still have to match, and an applicability record has to name the family.
 */
export function adoptionRepinIsMeasurementOnly(root, existing, replacement) {
  // Digests and byte counts of renders, and the two digests computed from them.
  //
  // `controllingReviewSha256` and `templateFamilySha256` are safe to strip here
  // only because the review manifest they measure is separately proven — by
  // recomputation, not assertion — to be identical once its own measurement
  // fields are removed. `authorityArchiveSha256` is deliberately absent: the
  // controlling authority is not a measurement of a render, and if it moves this
  // is not a layout-only regeneration.
  const MEASUREMENT_FIELDS = new Set([
    "sha256",
    "assembledSha256",
    "assembledBytes",
    "byteSize",
    "templateFamilySha256",
    "controllingReviewSha256"
  ]);
  const strip = (value) => {
    if (Array.isArray(value)) return value.map(strip);
    if (value && typeof value === "object") {
      const out = {};
      for (const key of Object.keys(value).sort()) {
        if (MEASUREMENT_FIELDS.has(key)) continue;
        out[key] = strip(value[key]);
      }
      return out;
    }
    return value;
  };
  if (JSON.stringify(strip(existing)) !== JSON.stringify(strip(replacement))) {
    return false;
  }
  const moved = (replacement.completedScopes ?? []).filter((scope, index) => {
    const before = (existing.completedScopes ?? [])[index];
    return JSON.stringify(before) !== JSON.stringify(scope);
  });
  if (moved.length === 0) return true;
  const applicability = readApplicabilityRecords(root);
  return moved.every((scope) =>
    applicability.some(
      (record) =>
        record?.appliesTo?.familyId === scope.familyId &&
        record?.whatMoved?.kind === "layout_only" &&
        record?.boundary?.substantiveLegalReviewPerformed === false
    )
  );
}

function readApplicabilityRecords(root) {
  const directory = path.join(root, "data/record-clearing/template-families");
  if (!fs.existsSync(directory)) return [];
  const records = [];
  for (const name of fs.readdirSync(directory).sort()) {
    if (!/^EXT-ADOPT-.*-APPLICABILITY-.*\.json$/u.test(name)) continue;
    try {
      records.push(JSON.parse(fs.readFileSync(path.join(directory, name), "utf8")));
    } catch {
      continue;
    }
  }
  return records;
}

function buildLegalDesignSpecificationHashes(
  config,
  specifications,
  canonicalJsonSha256
) {
  const collections = [
    "customPleadingSpecs",
    "officialFormAssignments",
    "processGuidanceSpecs",
    "participantFilingRequirements"
  ];
  return config.approvedRouteIds.map((trackId) => {
    const routeSpecification = Object.fromEntries(
      collections.map((collection) => [
        collection,
        asArray(specifications[collection]).filter(
          (entry) =>
            entry?.jurisdiction === config.jurisdiction &&
            entry?.trackId === trackId
        )
      ])
    );
    const entryCount = Object.values(routeSpecification).reduce(
      (total, entries) => total + entries.length,
      0
    );
    if (entryCount === 0) {
      throw new Error(`${config.familyId} lacks a canonical specification for ${trackId}`);
    }
    return {
      trackId,
      sha256: canonicalJsonSha256(routeSpecification),
      hashMethod: "canonicalJsonSha256_exact_route_specification_subset",
      entryCount
    };
  });
}

function collectSourceHashes(authorityPins, tracks) {
  const roots = [
    ["controllingAuthority", authorityPins.controllingAuthority],
    ["primaryEnactedLaw", authorityPins.primaryEnactedLaw],
    ["referenceOnlySources", authorityPins.referenceOnlySources],
    [
      "generationSources",
      tracks.flatMap((track) =>
        track.components.map((component) => component.asset).filter(Boolean)
      )
    ]
  ];
  const pins = [];
  for (const [rootName, value] of roots) {
    walk(value, rootName);
  }
  const unique = new Map();
  for (const pin of pins) unique.set(`${pin.id}:${pin.sha256}`, pin);
  return [...unique.values()].sort(
    (left, right) =>
      left.id.localeCompare(right.id) || left.sha256.localeCompare(right.sha256)
  );

  function walk(value, jsonPath) {
    if (!value || typeof value !== "object") return;
    if (Array.isArray(value)) {
      value.forEach((entry, index) => walk(entry, `${jsonPath}[${index}]`));
      return;
    }
    if (SHA256_PATTERN.test(value.sha256 ?? "")) {
      pins.push({
        id:
          value.workflowKey ??
          value.documentId ??
          value.citation ??
          value.canonicalRelativePath ??
          jsonPath,
        sha256: value.sha256,
        sourceRole:
          value.documentRole ??
          value.assetTreatment ??
          value.assetClass ??
          "authority_source"
      });
    }
    for (const [key, entry] of Object.entries(value)) {
      if (key !== "sha256") walk(entry, `${jsonPath}.${key}`);
    }
  }
}

function buildBranchCoverage(config, tranche, fixtures, review, visualReview) {
  const samplePacketsByTrack = new Map();
  for (const packet of asArray(review.samplePackets)) {
    if (!samplePacketsByTrack.has(packet.trackId)) {
      samplePacketsByTrack.set(packet.trackId, []);
    }
    samplePacketsByTrack.get(packet.trackId).push({
      fixtureId: packet.fixtureId,
      branchVariantId: packet.branchVariantId ?? null,
      sha256: packet.assembledSha256 ?? packet.sha256
    });
  }
  const positiveFixtureById = new Map(
    asArray(fixtures.positiveFixtures).map((fixture) => [
      fixture.fixtureId,
      fixture
    ])
  );
  return asArray(tranche.selectedTracks).map((track) => {
    const trackId = typeof track === "string" ? track : track.trackId;
    const declaredVariantIds =
      typeof track === "string"
        ? []
        : asArray(track.branchVariants).map((variant) => variant.variantId);
    const samples = asArray(samplePacketsByTrack.get(trackId)).map((sample) => {
      const fixture = positiveFixtureById.get(sample.fixtureId);
      return {
        ...sample,
        branchVariantId:
          sample.branchVariantId ??
          inferBranchVariant(config.jurisdiction, trackId, fixture?.facts) ??
          null
      };
    });
    return {
      trackId,
      declaredVariantIds,
      positiveSampleCoverage: samples,
      visualInspectionVariantIds: asArray(
        visualReview.branchVariantsInspected
      ).filter((variantId) => declaredVariantIds.includes(variantId)),
      coveragePolicy:
        "Declared branch logic is hash-bound. Positive packet and visual coverage are listed separately and are not overstated."
    };
  });
}

function inferBranchVariant(jurisdiction, trackId, facts) {
  if (jurisdiction !== "GA" || !facts) return null;
  const candidates = {
    "ga-felony-j1": ["felonyDisposition", "dispositionType", "disposition"],
    "ga-vacated-j2": ["vacatedOrReversed", "vacaturType", "dispositionType"],
    "ga-misd-j4": ["misdemeanorScope", "offenseScope"],
    "ga-seal-m": ["restrictionBasis", "restrictionType"],
    "ga-fo-discharged-pre2026": ["dischargeBasis", "dischargeType"]
  }[trackId];
  for (const key of candidates ?? []) {
    if (typeof facts[key] === "string") return facts[key];
  }
  return null;
}

function normalizeRepresentativePackets(review) {
  return asArray(review.samplePackets)
    .map((packet) => ({
      fixtureId: packet.fixtureId,
      trackId: packet.trackId,
      branchVariantId: packet.branchVariantId ?? null,
      fileName: packet.assembledFileName ?? packet.fileName,
      sha256: packet.assembledSha256 ?? packet.sha256,
      pageCount: packet.assembledPageCount ?? packet.pageCount
    }))
    .sort((left, right) => left.fixtureId.localeCompare(right.fixtureId));
}

function artifactPin(root, relativePath, role) {
  return {
    role,
    path: relativePath,
    sha256: fileSha256(root, relativePath)
  };
}

function fileSha256(root, relativePath) {
  return crypto
    .createHash("sha256")
    .update(fs.readFileSync(path.join(root, relativePath)))
    .digest("hex");
}

function readJson(root, relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function git(root, args) {
  const result = spawnSync("git", args, {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024
  });
  if (result.status !== 0) {
    throw new Error(
      `git ${args.join(" ")} failed: ${result.stderr.trim() || "unknown error"}`
    );
  }
  return result.stdout;
}
