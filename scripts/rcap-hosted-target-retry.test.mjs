import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const root = path.resolve(import.meta.dirname, "..");
const harnessPath = "scripts/rcap-hosted-acceptance-payment.mjs";
const workflowPath = ".github/workflows/rcap-hosted-acceptance-staging.yml";
const source = fs.readFileSync(path.join(root, harnessPath), "utf8");
const workflow = fs.readFileSync(path.join(root, workflowPath), "utf8");
const executedHead = "4bfe42c98bbdc2a0fa9c50a0b360bb609e4f2dbb";
const original = rel => execFileSync("git", ["show", `${executedHead}:${rel}`], { cwd: root, encoding: "utf8" });
const TARGET = "7f729c6a-6d90-498a-a50b-3f8b461c564c";
const PREDECESSOR = "ca12bf6b-6ace-4e02-af5c-70e1bfb7d331";
const DIGEST = "ghcr.io/roger-legalease/rcap-render-worker@sha256:a950cda9d6016f9b9e1b1d4602680c9236336a9fc6bd4fbd10ead0d60e67b21d";
const OBSERVED_RETRY = "2026-09-24 04:23:58.061386+00";

// Execute the actual functions, including SQL reads, attribution, Docker
// command, and wait loop. Only external transports and time are deterministic.
// No second implementation of the journey predicate exists in this test.
function declarations(text, names) {
  const parsed = ts.createSourceFile("harness.mjs", text, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  const found = new Map();
  const visit = node => {
    if ((ts.isFunctionDeclaration(node) || ts.isVariableDeclaration(node)) && names.includes(node.name?.getText(parsed))) {
      const name = node.name.getText(parsed);
      assert.ok(!found.has(name), `ambiguous production declaration: ${name}`);
      found.set(name, ts.isFunctionDeclaration(node) ? node.getText(parsed) : `const ${node.getText(parsed)};`);
    }
    ts.forEachChild(node, visit);
  };
  visit(parsed);
  return names.map(name => { assert.ok(found.has(name), `missing production declaration: ${name}`); return found.get(name); }).join("\n");
}

async function replay(text = source, options = {}) {
  let clock = Date.parse("2026-09-24T04:22:00Z");
  const clone = value => JSON.parse(JSON.stringify(value));
  const target = { id: TARGET, status: "queued", attempt_count: 0, max_attempts: 5,
    next_attempt_at: null, failure_disposition: null, error_code: null, fencing_token: null,
    renderer_kind: "packet_document_v1", profile_id: "ms-nonconv", profile_version: "fixture",
    created_at: "2026-09-24T04:20:00Z", consumer_briefcase_item_id: "fixture-item" };
  Object.assign(target, options.initial);
  const predecessor = { ...target, id: PREDECESSOR, created_at: "2026-09-24T04:19:00Z" };
  const jobs = new Map([[PREDECESSOR, predecessor], [TARGET, target]]);
  const artifacts = new Map();
  const operations = [], waits = [], logs = [], diagnostics = { cycles: [] };
  const authority = { checkout: ["cs_test_existing"], payments: ["evt_existing"],
    items: ["fixture-item"], packets: ["fixture-packet"], consumption: ["existing-entitlement"] };
  const authorityBefore = clone(authority);
  const due = row => row.status === "queued" && (!row.next_attempt_at || Date.parse(row.next_attempt_at) <= clock);
  const context = {
    crypto, path, targetJobId: TARGET, itemId: "fixture-item", diagnostics,
    EVIDENCE_DIR: "/fixture-evidence", containerName: "fixture-worker", service: "fixture-service-role",
    SUPABASE_URL: "https://acceptance.invalid", WORKER_PARTNER_DATA_FLAG: "true", WORKER_DIGEST_REF: DIGEST,
    sqlText: value => String(value).replaceAll("'", "''"), redactSecrets: value => String(value), redact: value => String(value),
    console: { log: line => logs.push(line) },
    Date: class extends Date { constructor(...args) { super(...(args.length ? args : [clock + (options.clockSkewMs ?? 0)])); } static now() { return clock + (options.clockSkewMs ?? 0); } },
    setTimeout: (resolve, ms) => { assert.ok(ms > 0 && Number.isFinite(ms)); waits.push(ms); clock += ms; resolve(); },
    fs: { rmSync: () => {}, existsSync: () => false },
    fetch: () => { throw new Error("The target retry must not create Checkout, payment, packet or job authority over HTTP"); },
    async sql(query) {
      assert.match(query.trim(), /^select\b/i, "the journey must not write or enqueue through SQL");
      assert.doesNotMatch(query, /\b(insert|update|delete|call)\b/i);
      let rows;
      if (query.includes("as queue_next_attempt_at")) {
        if (options.wakeUnreadable) return { ok: false, status: 520, json: [{ target_next_attempt_at: target.next_attempt_at }] };
        rows = [{ queue_next_attempt_at: new Date(clock + 10_000).toISOString(),
          target_claim_expires_at: new Date(clock - 1_000).toISOString(),
          target_next_attempt_at: target.next_attempt_at, server_now: new Date(clock).toISOString() }];
      } else if (query.includes("count(*)::int as n")) rows = [{ n: [...jobs.values()].filter(r => r.status === "queued").length }];
      else if (query.includes("order by created_at")) rows = [...jobs.values()].filter(due);
      else if (query.includes("where status in")) rows = [...jobs.values()];
      else {
        assert.ok(query.includes(`where id = '${TARGET}'`), "all target reads retain the exact paid-render job id");
        rows = [target];
      }
      return { ok: true, status: 201, json: clone(rows) };
    },
    spawnSync(command, args) {
      assert.equal(command, "docker");
      assert.ok(args.includes(DIGEST), "the accepted worker digest must not move");
      assert.deepEqual(Array.from(args.slice(-3)), ["node", "scripts/rcap-render-worker.mjs", "--once"]);
      assert.ok(operations.length < 30, "the journey must have a finite cycle bound");
      // The accepted worker performs its canonical retry requeue before claim.
      // This recorded transport fixture models that boundary, never an INSERT
      // or a harness-written status. No artifact exists after the HTTP 520.
      for (const row of jobs.values()) if (row.status === "failed" && row.failure_disposition === "retryable"
        && row.attempt_count < row.max_attempts && Date.parse(row.next_attempt_at) <= clock) {
        operations.push({ kind: "requeue", jobId: row.id, at: clock, canonicalAt: Date.parse(row.next_attempt_at) });
        row.status = "queued";
      }
      const row = [...jobs.values()].find(due);
      if (!row) return { status: 0, stdout: '{"outcome":"idle"}', stderr: "" };
      row.attempt_count += 1;
      operations.push({ kind: "claim", jobId: row.id, attempt: row.attempt_count, at: clock });
      let result;
      if (row.id === PREDECESSOR) {
        Object.assign(row, { status: "failed", failure_disposition: "terminal", error_code: "profile_version_unknown" });
        result = { outcome: "failed", jobId: row.id, errorCode: row.error_code, disposition: "terminal" };
      } else if (row.attempt_count === 1 || options.alwaysFail) {
        if (row.attempt_count === 1) clock = Date.parse("2026-09-24T04:22:58.061Z");
        const retryAt = options.retryAt ?? (row.attempt_count === 1 ? OBSERVED_RETRY : new Date(clock + 60_000).toISOString());
        Object.assign(row, { status: "failed", failure_disposition: options.disposition ?? "retryable",
          error_code: "storage_write_failed", next_attempt_at: retryAt });
        Object.assign(row, options.afterFailure);
        operations.push({ kind: "upload", jobId: row.id, httpStatus: 520, bytes: 69849 });
        assert.equal(artifacts.size, 0);
        result = { outcome: "failed", jobId: TARGET, errorCode: "storage_write_failed", disposition: row.failure_disposition };
      } else {
        assert.ok(clock >= Date.parse(row.next_attempt_at), "retry must wait through the canonical target instant");
        const key = "consumer/fixture-item/content-addressed-sha256.pdf";
        assert.equal(artifacts.size, 0, "a failed upload must not create artifact authority");
        artifacts.set(key, { jobId: TARGET, bytes: 69849 });
        operations.push({ kind: "upload", jobId: row.id, httpStatus: 200, bytes: 69849 });
        Object.assign(row, { status: "artifact_validated", error_code: null, failure_disposition: null, output_storage_path: key });
        result = { outcome: "finalized", jobId: TARGET, deliveryEligibility: "deliverable", accountingResult: "consumer_paid" };
      }
      return { status: 0, stdout: JSON.stringify(result), stderr: "" };
    }
  };
  const names = ["TERMINAL_SUCCESS", "WORKER_CLAIM_SECONDS", "CLAIM_STATE_FIELDS", "jobRowOrNull", "sleep",
    "QUEUE_CHURN_ALLOWANCE", "WAIT_BUDGET_MS", "MAX_SINGLE_WAIT_MS", "MIN_SINGLE_WAIT_MS",
    "readJob", "claimablePredicate", "readClaimOrder", "canonicalWakeInstant", "claimStateSnapshot",
    "rowsThatChanged", "classifyCycle", "parseCycleResult", "cycleBoundary", "claimedTupleFor",
    "runOneCycle", "runTargetWorkerJourney"];
  const journey = await vm.runInNewContext(`${declarations(text, names)}\nrunTargetWorkerJourney(targetJobId)`, context);
  assert.deepEqual(authority, authorityBefore, "Checkout/payment/item/packet/entitlement identities and counts remain unchanged");
  assert.deepEqual([...jobs.keys()], [PREDECESSOR, TARGET], "no duplicate render job may be created");
  return { journey: clone(journey), diagnostics, operations, waits, artifacts, target, logs };
}

test("#345 executed control reproduces the valid retry cut off after backlog convergence", async () => {
  const r = await replay(original(harnessPath));
  assert.equal(r.journey.failure.code, "acceptance_target_did_not_finalize_within_bound");
  assert.equal(r.journey.cyclesRun, 2);
  assert.equal(r.journey.targetCycles, 1);
  assert.equal(r.target.attempt_count, 1);
  assert.equal(r.target.next_attempt_at, OBSERVED_RETRY);
  assert.equal(r.artifacts.size, 0);
  assert.equal(r.operations.filter(o => o.kind === "requeue").length, 0);
});

test("HTTP 520 -> canonical wait/requeue -> SAME target finalizes, with one artifact and unchanged payment authority", async () => {
  const r = await replay();
  assert.equal(r.journey.failure, null);
  assert.equal(r.journey.targetJobId, TARGET);
  assert.equal(r.journey.targetRowFinal.id, TARGET);
  assert.equal(r.journey.targetCycleResult.jobId, TARGET);
  assert.equal(r.target.status, "artifact_validated");
  assert.equal(r.journey.cyclesRun, 3);
  assert.equal(r.journey.targetCycles, 2);
  assert.equal(r.target.attempt_count, 2);
  assert.equal(r.artifacts.size, 1);
  assert.deepEqual(r.operations.filter(o => o.kind === "upload").map(o => [o.jobId, o.httpStatus]), [[TARGET, 520], [TARGET, 200]]);
  const requeued = r.operations.filter(o => o.kind === "requeue");
  assert.equal(requeued.length, 1);
  assert.equal(requeued[0].jobId, TARGET);
  assert.ok(requeued[0].at >= requeued[0].canonicalAt);
  assert.equal(r.journey.waitedMs, 66_000);
});

test("long canonical wait is chunked without spending idle worker cycles", async () => {
  const r = await replay(source, { retryAt: "2026-09-24T04:26:18.061Z" });
  assert.equal(r.journey.failure, null);
  assert.equal(r.journey.cyclesRun, 3);
  assert.equal(r.journey.noJobCycles, 0);
  assert.equal(r.journey.waitedMs, 206_000);
  assert.ok(r.waits.every(ms => ms <= 90_000));
});

test("server time determines the canonical wait even when the runner clock is skewed", async () => {
  const r = await replay(source, { clockSkewMs: 3_600_000 });
  assert.equal(r.journey.failure, null);
  assert.equal(r.journey.waitedMs, 66_000);
});

test("remaining retries terminate at max_attempts without a sixth claim", async () => {
  const r = await replay(source, { alwaysFail: true });
  assert.equal(r.journey.failure.code, "acceptance_target_terminal_failure");
  assert.equal(r.target.attempt_count, 5);
  assert.equal(r.journey.targetCycles, 5);
  assert.ok(r.journey.cyclesRun <= r.journey.cycleBoundCeiling);
  assert.ok(r.journey.waitedMs <= 8 * 60 * 1000);
  assert.equal(r.artifacts.size, 0);
});

for (const [name, options, code] of [
  ["terminal failure", { disposition: "terminal" }, "acceptance_target_terminal_failure"],
  ["missing retry instant", { afterFailure: { next_attempt_at: null } }, "acceptance_target_retry_state_invalid"],
  ["malformed retry instant", { retryAt: "not-a-date" }, "acceptance_target_retry_state_invalid"],
  ["numeric retry instant", { afterFailure: { next_attempt_at: 1 } }, "acceptance_target_retry_state_invalid"],
  ["in-flight target state", { afterFailure: { status: "rendering" } }, "acceptance_target_retry_state_invalid"],
  ["changed target identity", { afterFailure: { id: PREDECESSOR } }, "acceptance_target_retry_state_invalid"],
  ["changed attempt ceiling", { afterFailure: { max_attempts: 6 } }, "acceptance_target_retry_state_invalid"],
  ["malformed attempt count", { afterFailure: { attempt_count: 1.5 } }, "acceptance_target_retry_state_invalid"],
  ["unreadable canonical schedule", { wakeUnreadable: true }, "acceptance_target_retry_schedule_unreadable"],
  ["canonical instant outside the wait budget", { retryAt: "2026-09-24T05:00:00Z" }, "acceptance_wait_budget_exhausted"]
]) test(`${name} refuses without another target claim or artifact`, async () => {
  const r = await replay(source, options);
  assert.equal(r.journey.failure?.code, code);
  assert.equal(r.journey.targetCycles, 1);
  assert.equal(r.artifacts.size, 0);
  assert.ok(r.journey.waitedMs <= 8 * 60 * 1000);
});

function promotion(text, input, discount = 0, total = 5000, appliedCodes = []) {
  const expression = text.match(/HOSTED_STRIPE_PROMOTION_CODE:\s*\$\{\{\s*(.*?)\s*\}\}/)?.[1];
  assert.ok(expression, "the payment workflow must supply an explicit promotion expression");
  const envValue = vm.runInNewContext(expression, { inputs: { promotion_code: input }, steps: { stripe_fixtures: { outputs: { promotion_code: "RCAPACCEPTANCEFREE" } } } });
  return vm.runInNewContext(`${declarations(source, ["PROMOTION_CODE", "arithmeticCloses", "discountMatchesTheAttempt"])}\n({ code: PROMOTION_CODE, allowed: arithmeticCloses && discountMatchesTheAttempt })`, {
    process: { env: { HOSTED_STRIPE_PROMOTION_CODE: envValue } }, discount, total, subtotal: 5000, appliedCodes
  });
}

test("#345 workflow reproduces the silent free-code fallback for blank input", () => {
  assert.equal(promotion(original(workflowPath), "").code, "RCAPACCEPTANCEFREE");
});
test("blank input remains blank and accepts the ordinary 5000-cent total only", () => {
  assert.equal(promotion(workflow, "").code, null);
  assert.equal(promotion(workflow, "").allowed, true);
  assert.equal(promotion(workflow, "", 5000, 0, ["promo_free"]).allowed, false);
  assert.equal(promotion(workflow, "", 0, 0).allowed, false);
});
test("explicit RCAPACCEPTANCEFREE reaches the browser and requires Stripe-confirmed discount evidence", () => {
  assert.equal(promotion(workflow, "RCAPACCEPTANCEFREE", 5000, 0, ["promo_free"]).code, "RCAPACCEPTANCEFREE");
  assert.equal(promotion(workflow, "RCAPACCEPTANCEFREE", 5000, 0, ["promo_free"]).allowed, true);
  assert.equal(promotion(workflow, "RCAPACCEPTANCEFREE").allowed, false);
  assert.match(source, /promotionCode: PROMOTION_CODE,/);
});
test("the reused Preview full run skips migration and runs these regressions before payment", () => {
  const guard = workflow.match(/id: migrate_readback\s*[\s\S]*?\n\s*if: (.*)/)?.[1];
  assert.ok(guard);
  assert.equal(vm.runInNewContext(guard, { inputs: { phase: "full", preview_hostname: "pinned-preview.vercel.app" } }), false);
  assert.equal(vm.runInNewContext(guard, { inputs: { phase: "migrate", preview_hostname: "" } }), true);
  const regression = workflow.indexOf("node --test scripts/rcap-hosted-target-retry.test.mjs");
  assert.ok(regression > 0 && regression < workflow.indexOf("id: payment_journey"));
});
