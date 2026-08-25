import crypto from "node:crypto";

export const DESKTOP_VIEWPORT = Object.freeze({ width: 1440, height: 1000 });
export const MOBILE_VIEWPORT = Object.freeze({ width: 390, height: 844 });

export function stableJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
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
  if (dispositions.rows.length !== expectedRealFlowCount) {
    throw new Error(
      `expected ${expectedRealFlowCount} real flows; found ${dispositions.rows.length}`
    );
  }

  const manifestById = new Map(manifest.flows.map((flow) => [flow.flowId, flow]));
  const rows = dispositions.rows
    .map((disposition) => {
      const flow = manifestById.get(disposition.flowId);
      if (!flow) throw new Error(`missing manifest flow ${disposition.flowId}`);
      const fixture = (device, viewport) => ({
        fixtureId: `${flow.flowId}::${device}`,
        device,
        viewport,
        answers: flow.fixture.answers,
        reproducesTerminal: flow.fixture.reproducesTerminal,
        replayResultCode: flow.fixture.replayResultCode
      });
      return {
        flowId: flow.flowId,
        flowKey: flow.flowKey,
        state: flow.jurisdiction,
        remedy: {
          id: flow.remedy.pathwayId,
          label: flow.remedy.pathwayLabel
        },
        expectedTerminal: {
          evaluator: flow.terminalOutcome.resultCode,
          effective: flow.terminalOutcome.effectiveTerminal
        },
        desktopFixture: fixture("desktop", DESKTOP_VIEWPORT),
        mobileFixture: fixture("mobile", MOBILE_VIEWPORT)
      };
    })
    .sort((left, right) => left.flowId.localeCompare(right.flowId));

  const firstShard = {
    shardId: "BROWSER-SHARD-1",
    stateList: [...browserShardStateGroups[0]].sort(),
    flows: rows.map((row) => ({
      flowId: row.flowId,
      desktopFixtureId: row.desktopFixture.fixtureId,
      mobileFixtureId: row.mobileFixture.fixtureId
    }))
  };
  const matrix = {
    schemaVersion: "expai-fresh-review-matrix/v1",
    candidateSha,
    rows
  };
  const matrixSha256 = crypto.createHash("sha256").update(stableJson(matrix)).digest("hex");

  return {
    matrix,
    browserShards: {
      schemaVersion: "expai-browser-shards/v1",
      candidateSha,
      shards: [firstShard]
    },
    stressSet: {
      schemaVersion: "expai-three-state-stress-set/v1",
      candidateSha,
      states: []
    },
    summary: {
      schemaVersion: "expai-fresh-review-build-summary/v1",
      candidateSha,
      realFlows: rows.length,
      matrixSha256
    }
  };
}
