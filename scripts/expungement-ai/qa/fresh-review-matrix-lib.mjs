import crypto from "node:crypto";

export const DESKTOP_VIEWPORT = Object.freeze({ width: 1440, height: 1000 });
export const MOBILE_VIEWPORT = Object.freeze({ width: 390, height: 844 });

const SOURCE_PATHS = Object.freeze({
  manifest: "data/expungement-ai/flow-audit/flow-manifest.json",
  dispositions:
    "data/expungement-ai/flow-audit/phase4-corrections/final-flow-dispositions.json",
  waitingRuleAuthority:
    "data/expungement-ai/flow-audit/phase4-corrections/waiting-rule-authority.json"
});

const BASE_PRIVACY_CONTROLS = Object.freeze([
  "save_refresh_resume_back",
  "sign_out_prior_history_denial",
  "cross_user_denial",
  "cross_matter_denial",
  "cross_tenant_denial",
  "participant_matter_ownership",
  "sensitive_analytics_exclusion",
  "clinic_end_session_reset_device",
  "clinic_shared_device_isolation"
]);

export function stableJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function sha256(value) {
  return crypto.createHash("sha256").update(stableJson(value)).digest("hex");
}

function uniqueIndex(rows, label) {
  const index = new Map();
  for (const row of rows) {
    if (!row?.flowId) throw new Error(`${label} row is missing flowId`);
    if (index.has(row.flowId)) {
      throw new Error(`duplicate ${label} flowId ${row.flowId}`);
    }
    index.set(row.flowId, row);
  }
  return index;
}

function validateShardGroups(rows, groups) {
  const stateToShard = new Map();
  groups.forEach((states, shardIndex) => {
    if (!Array.isArray(states) || states.length === 0) {
      throw new Error(`browser shard ${shardIndex + 1} has no states`);
    }
    for (const state of states) {
      if (stateToShard.has(state)) {
        throw new Error(`state ${state} appears in multiple browser shards`);
      }
      stateToShard.set(state, shardIndex);
    }
  });
  for (const row of rows) {
    if (!stateToShard.has(row.state)) {
      throw new Error(`state ${row.state} has no browser shard`);
    }
  }
  return stateToShard;
}

function countsBy(rows, valueOf) {
  const counts = {};
  for (const row of rows) {
    const value = valueOf(row);
    counts[value] = (counts[value] ?? 0) + 1;
  }
  return Object.fromEntries(
    Object.entries(counts).sort(([left], [right]) => left.localeCompare(right))
  );
}

function correctionOwnership(waitingRuleAuthority) {
  const held = Object.entries(waitingRuleAuthority?.proposals?.perProposal ?? {})
    .filter(([, proposal]) => proposal.decision === "HELD")
    .map(([routeKey]) => routeKey)
    .sort();
  return {
    c: new Set(held.slice(0, 36)),
    d: new Set(held.slice(36))
  };
}

function deriveOwner(disposition, owners) {
  if (disposition.disposition === "HELD_FOR_LEGAL_DECISION") {
    return { lane: "B", basis: "approved_legal_decision_implementation" };
  }
  if (disposition.disposition === "HELD_FOR_ENVIRONMENT") {
    return { lane: "F", basis: "hosted_environment_acceptance" };
  }
  if (disposition.disposition !== "HELD_FOR_CORRECTION") {
    return { lane: "A", basis: "release_captain_integrated_behavior" };
  }

  const routeKey = `${disposition.jurisdiction}:${disposition.remedy}`;
  if (owners.c.has(routeKey)) {
    return { lane: "C", basis: "correction_ids_1_36" };
  }
  if (owners.d.has(routeKey)) {
    return { lane: "D", basis: "correction_ids_37_73" };
  }
  if (disposition.shardDisposition === "HELD_FOR_CORRECTION") {
    return { lane: "D", basis: "candidate_exact_phase3_held_flow" };
  }
  return { lane: "A", basis: "shared_or_unassigned_correction" };
}

function derivePacketTreatment(flow, disposition) {
  const effective = flow.terminalOutcome?.effectiveTerminal
    ?? flow.terminalOutcome?.resultCode;
  const packetExpected = flow.remedy?.filingRequired === true
    && effective === "packet_ready_with_caution";
  return {
    kind: packetExpected ? "packet_expected" : "no_packet",
    checkoutAllowed: packetExpected && disposition.purchasableAfter === true,
    packetCreditAllowed: packetExpected,
    renderJobAllowed: packetExpected,
    familyMode: flow.packetFamily?.mode ?? null,
    packetFamilies: [...(flow.packetFamily?.packetFamilies ?? [])],
    packetSets: [...(flow.packetFamily?.packetSets ?? [])],
    registryTracks: [...(flow.packetFamily?.registryTracks ?? [])],
    forms: {
      sourceFormIds: [...(flow.forms?.sourceFormIds ?? [])],
      officialFormIdsNamed: [...(flow.forms?.officialFormIdsNamed ?? [])],
      officialFormIdsHeldInThisRepository: [
        ...(flow.forms?.officialFormIdsHeldInThisRepository ?? [])
      ]
    }
  };
}

export function buildFreshReviewArtifacts({
  candidateSha,
  manifest,
  dispositions,
  waitingRuleAuthority,
  expectedRealFlowCount = 356,
  browserShardStateGroups
}) {
  if (!Array.isArray(manifest?.flows) || !Array.isArray(dispositions?.rows)) {
    throw new Error("manifest flows and disposition rows are required");
  }
  if (!waitingRuleAuthority || typeof waitingRuleAuthority !== "object") {
    throw new Error("waiting-rule authority is required");
  }
  if (!Array.isArray(browserShardStateGroups) || browserShardStateGroups.length === 0) {
    throw new Error("browser shard state groups are required");
  }
  if (!/^[0-9a-f]{40}$/.test(candidateSha ?? "")) {
    throw new Error("candidateSha must be an exact 40-character lowercase SHA");
  }
  if (dispositions.rows.length !== expectedRealFlowCount) {
    throw new Error(
      `expected ${expectedRealFlowCount} real flows; found ${dispositions.rows.length}`
    );
  }

  const manifestById = uniqueIndex(manifest.flows, "manifest");
  uniqueIndex(dispositions.rows, "disposition");
  const owners = correctionOwnership(waitingRuleAuthority);
  const rows = dispositions.rows
    .map((disposition) => {
      const flow = manifestById.get(disposition.flowId);
      if (!flow) throw new Error(`missing manifest flow ${disposition.flowId}`);
      if (flow.flowKey !== disposition.flowKey) {
        throw new Error(`flowKey mismatch for ${disposition.flowId}`);
      }
      const fixture = (device, viewport) => ({
        fixtureId: `${flow.flowId}::${device}`,
        device,
        viewport: { ...viewport },
        entryRoute: flow.entryConditions?.publicRoute ?? null,
        answers: structuredClone(flow.fixture?.answers ?? {}),
        origin: flow.fixture?.origin ?? null,
        evaluatorToday: flow.fixture?.evaluatorToday ?? null,
        synthetic: flow.fixture?.synthetic ?? null,
        reproducesTerminal: flow.fixture?.reproducesTerminal ?? null,
        replayResultCode: flow.fixture?.replayResultCode ?? null
      });
      const packetTreatment = derivePacketTreatment(flow, disposition);
      const privacyControls = [
        ...BASE_PRIVACY_CONTROLS,
        packetTreatment.kind === "packet_expected"
          ? "private_packet_owner_download"
          : "no_checkout_credit_render_job"
      ];
      return {
        flowId: flow.flowId,
        flowKey: flow.flowKey,
        state: flow.jurisdiction,
        stateName: flow.jurisdictionName,
        remedy: {
          id: flow.remedy.pathwayId,
          label: flow.remedy.pathwayLabel,
          routeType: flow.remedy.routeType ?? null,
          automatic: flow.remedy.automatic ?? false,
          filingRequired: flow.remedy.filingRequired ?? null
        },
        entryRoute: flow.entryConditions?.publicRoute ?? null,
        expectedTerminal: {
          evaluator: flow.terminalOutcome.resultCode,
          effective: flow.terminalOutcome.effectiveTerminal,
          landedOnRequestedPathway:
            flow.terminalOutcome.landedOnRequestedPathway ?? null,
          landedPathwayId: flow.terminalOutcome.landedPathwayId ?? null
        },
        requiredFacts: {
          screening: [...(flow.screeningFacts ?? [])].sort(),
          renderedQuestions: [...(flow.screeningScreenIds ?? [])].sort(),
          packet: [...(flow.packetFacts ?? [])].sort()
        },
        packetTreatment,
        payment: {
          mode: disposition.paymentMode ?? flow.paymentMode,
          purchasableBefore: disposition.purchasableBefore ?? null,
          purchasableAfter: disposition.purchasableAfter ?? null
        },
        sponsorship: {
          mode: disposition.sponsorshipMode ?? flow.sponsorshipMode
        },
        clinicMode: {
          expected: true,
          ownerLane: "E",
          status: "pending_lane_e_integration",
          authoritativeNationwideEngineRequired: true,
          terminalParityRequired: true,
          paymentAndSponsorshipParityRequired: true
        },
        ownerLane: deriveOwner(disposition, owners),
        privacyControls,
        currentDisposition: {
          name: disposition.disposition,
          reason: disposition.reason,
          shardDisposition: disposition.shardDisposition ?? null,
          waitingRuleResolution: disposition.waitingRuleResolution ?? null,
          bindingClassification: disposition.bindingClassification ?? null,
          countyCourtCatalog: disposition.countyCourtCatalog ?? null,
          active: disposition.active ?? false
        },
        desktopFixture: fixture("desktop", DESKTOP_VIEWPORT),
        mobileFixture: fixture("mobile", MOBILE_VIEWPORT),
        sourceTrace: {
          candidateSha,
          paths: SOURCE_PATHS,
          productSourceFiles: [...(flow.sourceFiles ?? [])]
        }
      };
    })
    .sort((left, right) => left.flowId.localeCompare(right.flowId));

  const stateToShard = validateShardGroups(rows, browserShardStateGroups);
  const shards = browserShardStateGroups.map((states, shardIndex) => {
    const shardFlows = rows
      .filter((row) => stateToShard.get(row.state) === shardIndex)
      .map((row) => ({
        flowId: row.flowId,
        state: row.state,
        remedyId: row.remedy.id,
        expectedTerminal: row.expectedTerminal.effective,
        desktopFixtureId: row.desktopFixture.fixtureId,
        mobileFixtureId: row.mobileFixture.fixtureId
      }));
    return {
      shardId: `BROWSER-SHARD-${shardIndex + 1}`,
      stateList: [...states].sort(),
      flowCount: shardFlows.length,
      deviceFixtureCount: shardFlows.length * 2,
      flows: shardFlows
    };
  });
  const shardFlowIds = shards.flatMap((shard) => shard.flows.map((flow) => flow.flowId));
  const shardFlowIdSet = new Set(shardFlowIds);
  if (shardFlowIdSet.size !== shardFlowIds.length) {
    throw new Error("browser shard overlap detected");
  }
  if (
    shardFlowIds.length !== rows.length
    || rows.some((row) => !shardFlowIdSet.has(row.flowId))
  ) {
    throw new Error("browser shard union does not equal the matrix");
  }

  const matrix = {
    schemaVersion: "expai-fresh-review-matrix/v1",
    candidateSha,
    sourcePaths: SOURCE_PATHS,
    totals: {
      realFlows: rows.length,
      deviceFixtures: rows.length * 2,
      states: new Set(rows.map((row) => row.state)).size
    },
    rows
  };
  const browserShards = {
    schemaVersion: "expai-browser-shards/v1",
    candidateSha,
    totals: {
      shards: shards.length,
      realFlows: shardFlowIds.length,
      deviceFixtures: shardFlowIds.length * 2
    },
    invariants: {
      overlapCount: shardFlowIds.length - shardFlowIdSet.size,
      unionComplete: shardFlowIds.length === rows.length
    },
    shards
  };

  const stressStates = ["CO", "MS", "WI"].map((state, index) => {
    const stateRows = rows.filter((row) => row.state === state);
    return {
      runOrder: index + 1,
      state,
      flowCount: stateRows.length,
      flowIds: stateRows.map((row) => row.flowId),
      desktopFixtureIds: stateRows.map((row) => row.desktopFixture.fixtureId),
      mobileFixtureIds: stateRows.map((row) => row.mobileFixture.fixtureId)
    };
  });
  const stressSet = {
    schemaVersion: "expai-three-state-stress-set/v1",
    candidateSha,
    runOrder: ["CO", "MS", "WI"],
    totals: {
      realFlows: stressStates.reduce((sum, state) => sum + state.flowCount, 0),
      deviceFixtures:
        stressStates.reduce((sum, state) => sum + state.flowCount, 0) * 2
    },
    states: stressStates
  };
  const matrixSha256 = sha256(matrix);
  const browserShardsSha256 = sha256(browserShards);
  const stressSetSha256 = sha256(stressSet);

  return {
    matrix,
    browserShards,
    stressSet,
    summary: {
      schemaVersion: "expai-fresh-review-build-summary/v1",
      candidateSha,
      realFlows: rows.length,
      deviceFixtures: rows.length * 2,
      browserShards: shards.length,
      states: new Set(rows.map((row) => row.state)).size,
      dispositions: countsBy(rows, (row) => row.currentDisposition.name),
      ownerLanes: countsBy(rows, (row) => row.ownerLane.lane),
      packetTreatments: countsBy(rows, (row) => row.packetTreatment.kind),
      stressStateFlows: Object.fromEntries(
        stressStates.map((state) => [state.state, state.flowCount])
      ),
      invariants: {
        expectedRealFlowCount,
        uniqueFlowIds: new Set(rows.map((row) => row.flowId)).size === rows.length,
        everyFlowHasDesktopAndMobile: rows.every(
          (row) => row.desktopFixture.fixtureId && row.mobileFixture.fixtureId
        ),
        shardsDisjoint: shardFlowIdSet.size === shardFlowIds.length,
        shardUnionComplete: shardFlowIds.length === rows.length
      },
      digests: {
        matrixSha256,
        browserShardsSha256,
        stressSetSha256
      }
    }
  };
}
