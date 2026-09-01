import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import { register } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const INTEGRATED_MODE = process.argv.includes("--integrated");
const FIXTURE_PATH = path.join(
  ROOT,
  "data/expungement-ai/corrections-a/runtime-fixtures.json"
);
const CLOSURE_PATH = path.join(
  ROOT,
  "data/expungement-ai/corrections-a/closure.json"
);
const BUILDER_PATH = path.join(
  ROOT,
  "scripts/corrections-a/build-runtime-fixtures.mjs"
);

const fixture = JSON.parse(fs.readFileSync(FIXTURE_PATH, "utf8"));
const closure = JSON.parse(fs.readFileSync(CLOSURE_PATH, "utf8"));
process.env.RCAP_EVALUATOR_TODAY = fixture.evaluatorToday;

register(
  pathToFileURL(path.join(ROOT, "scripts/corrections-a/native-ts-loader.mjs")).href,
  import.meta.url
);
const { evaluateScreening } = await import(
  pathToFileURL(path.join(ROOT, "src/lib/rcap-engine/evaluator.ts")).href
);

assert.equal(
  fixture.schemaVersion,
  "expai-corrections-a-runtime-fixtures/v1",
  "runtime fixture schema changed"
);
assert.equal(fixture.evaluatorToday, "2026-08-25", "runtime clock is not pinned");
assert.equal(fixture.routes.length, 36, "runtime fixture must cover all 36 assigned IDs");
assert.deepEqual(
  fixture.routes.map((row) => row.routeKey),
  closure.routes.map((row) => row.routeKey),
  "runtime fixture IDs diverge from the closure register"
);

if (!INTEGRATED_MODE) {
  const regenerated = execFileSync(process.execPath, [BUILDER_PATH], {
    cwd: ROOT,
    encoding: "utf8",
    env: { ...process.env, RCAP_EVALUATOR_TODAY: fixture.evaluatorToday },
    maxBuffer: 30 * 1024 * 1024
  });
  assert.equal(regenerated, fs.readFileSync(FIXTURE_PATH, "utf8"), "runtime fixture is stale");
}

const ratifiedRemovals = new Set(closure.sharedHandoff.removeFromRatifiedDeployable);
const closureByKey = new Map(closure.routes.map((row) => [row.routeKey, row]));
const currentPaymentLeaks = [];
const integratedExactFacts = {
  "LA:first-offense-marijuana-expungement-after-90-days-art-998": {
    conviction_date: "2000-01-01"
  },
  "MS:additional-justice-or-municipal-court-misdemeanor-relief": {
    ms_last_conviction_date_any_court: "2000-01-01"
  },
  "MS:first-offense-dui-expungement": {
    ms_successful_sentence_completion_date: "2000-01-01"
  },
  "MS:minor-in-possession-underage-alcohol-expungement": {
    ms_mip_sentence_completion_date: "2000-01-01",
    ms_mip_fine_imposed: "Yes",
    ms_mip_fine_payment_date: "2000-01-01"
  }
};

for (const row of fixture.routes) {
  const evaluation = evaluateScreening({
    jurisdiction: row.jurisdiction,
    profileVersion: row.profileVersion,
    matterId: `corrections-a-${row.jurisdiction.toLowerCase()}-${row.pathwayId}`,
    answers: INTEGRATED_MODE
      ? { ...row.answers, ...(integratedExactFacts[row.routeKey] ?? {}) }
      : row.answers
  });
  assert.equal(evaluation.pathwayId, row.pathwayId, `${row.routeKey}: actual evaluator selected a different pathway`);
  if (!INTEGRATED_MODE) {
    assert.deepEqual(
      {
        resultCode: evaluation.resultCode,
        pathwayId: evaluation.pathwayId ?? null,
        paymentAllowed: evaluation.paymentAllowed,
        reasonCodes: evaluation.reasons.map((reason) => reason.code),
        missingQuestionIds: evaluation.missingQuestionIds
      },
      row.baseline,
      `${row.routeKey}: actual evaluator drifted from its reviewed fixture`
    );
  }

  const closureRow = closureByKey.get(row.routeKey);
  assert.ok(closureRow, `${row.routeKey}: missing closure row`);
  const effectivePaymentAllowed = INTEGRATED_MODE
    ? evaluation.paymentAllowed
    : evaluation.paymentAllowed && !ratifiedRemovals.has(row.routeKey);
  assert.equal(
    effectivePaymentAllowed,
    closureRow.checkoutExpected,
    `${row.routeKey}: shared ratification clamp does not produce the reviewed payment outcome`
  );
  if (evaluation.paymentAllowed && !closureRow.checkoutExpected) currentPaymentLeaks.push(row.routeKey);
}

assert.deepEqual(
  currentPaymentLeaks,
  INTEGRATED_MODE ? [] : [
    "DC:dc_motion_seal_felony_conviction_8yr_16_806",
    "DC:dc_motion_seal_misdemeanor_conviction_5yr_16_806",
    "DC:dc_motion_seal_nonconviction_16_806",
    "LA:felony-ten-year-clean-period-expungement",
    "LA:misdemeanor-five-year-clean-period-expungement",
    "MA:adult-conviction-sealing-under-m-g-l-c-276-100a",
    "MO:first-intoxication-related-traffic-or-boating-expungement-under-610-130"
  ],
  "reviewed shared payment-removal surface changed"
);

console.log(`verify-corrections-a-runtime: GREEN (${INTEGRATED_MODE ? "integrated" : "lane handoff"})`);
console.log(JSON.stringify({
  assigned: fixture.routes.length,
  actualEvaluatorPathwaysMatched: fixture.routes.length,
  sharedPaymentRemovalsProven: currentPaymentLeaks.length,
  expectedPaidAfterHandoff: closure.routes.filter((row) => row.checkoutExpected).map((row) => row.routeKey)
}, null, 2));
