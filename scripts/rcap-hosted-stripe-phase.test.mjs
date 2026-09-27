import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import yaml from 'js-yaml';

const workflow = yaml.load(fs.readFileSync('.github/workflows/rcap-hosted-acceptance-staging.yml', 'utf8'));
const gate = workflow.jobs.preflight.steps.find(step => step.id === 'antiskip');
const caller = yaml.load(fs.readFileSync('.github/workflows/rcap-f1-ephemeral-staging.yml', 'utf8'));

test('expected payment total reaches the harness through caller and reusable inputs', () => {
  assert.equal(caller.on.workflow_dispatch.inputs.expected_total_cents.type, 'string');
  assert.equal(caller.jobs.hosted.with.expected_total_cents, '${{ inputs.expected_total_cents }}');
  assert.equal(workflow.on.workflow_call.inputs.expected_total_cents.type, 'string');
  const payment = workflow.jobs.preflight.steps.find(step => step.id === 'payment_journey');
  assert.equal(payment.env.HOSTED_STRIPE_EXPECTED_TOTAL_CENTS, '${{ inputs.expected_total_cents }}');
  for (const field of ['inputs.mode', 'inputs.tools_sha', 'inputs.application_sha', 'inputs.expected_total_cents']) {
    assert.ok(caller['run-name'].includes(field));
  }
  assert.ok(!/secrets|promotion_code|password/.test(caller['run-name']));
});

test('payment amount inputs refuse before checkout, migration, deployment or fixture writes', () => {
  const first = workflow.jobs.preflight.steps[0];
  const env = {
    PATH: process.env.PATH, ...workflow.env,
    PHASE_INPUT: 'payment', PROMOTION_CODE_INPUT: '', EXPECTED_TOTAL_CENTS_INPUT: '',
    APPLICATION_SHA_INPUT: 'a'.repeat(40), TOOLS_SHA_INPUT: 'b'.repeat(40), WORKFLOW_SHA_INPUT: 'b'.repeat(40),
    WORKER_SOURCE_SHA_INPUT: workflow.env.AUTHORIZED_WORKER_SOURCE_SHA,
    WORKER_DIGEST_INPUT: workflow.env.AUTHORIZED_WORKER_DIGEST,
    SUPABASE_PROJECT_REF_INPUT: workflow.env.AUTHORIZED_ACCEPTANCE_PROJECT_REF,
    PREVIEW_DEPLOYMENT_ID_INPUT: '', PREVIEW_HOSTNAME_INPUT: '',
  };
  for (const phase of ['payment', 'full', 'accept']) {
    for (const [code, amount, status] of [
      ['', '', 0], ['', '5000', 0], ['PARTIAL', '2500', 0], ['FREE', '0', 0],
      ['PARTIAL', '', 1], ['', '0', 1], ['PARTIAL', '5000', 1], ['PARTIAL', '-1', 1], ['PARTIAL', '0500', 1],
    ]) {
      const result = spawnSync('bash', ['-c', first.run], { encoding: 'utf8', env: {
        ...env, PHASE_INPUT: phase, PROMOTION_CODE_INPUT: code, EXPECTED_TOTAL_CENTS_INPUT: amount,
      } });
      assert.equal(result.status, status, `${phase}/${code}/${amount}: ${result.stdout}${result.stderr}`);
    }
  }
});

function runGate(outcome) {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'rcap-stripe-phase-'));
  try {
    const env = Object.fromEntries(Object.keys(gate.env).map(key => [key, 'skipped']));
    Object.assign(env, {
      PATH: process.env.PATH, PHASE: 'stripe_retarget', O_CONTRACT: 'success',
      RUNS_MATRIX: 'false', RUNS_GATE: 'false', RUNS_BROWSER: 'false',
      RUNS_CLINIC: 'false', RUNS_LEGAL_AID: 'false', RUNS_DIAGNOSE: 'false',
      O_STRIPE_RETARGET: outcome,
    });
    return spawnSync('bash', ['-c', gate.run], { cwd, env, encoding: 'utf8' });
  } finally {
    fs.rmSync(cwd, { recursive: true, force: true });
  }
}

test('retarget anti-skip gate accepts the actual successful retarget', () => {
  const result = runGate('success');
  assert.equal(result.status, 0, result.stdout + result.stderr);
});

for (const outcome of ['skipped', 'failure', 'cancelled', '']) {
  test(`retarget anti-skip gate refuses ${outcome || 'missing'} outcome`, () => {
    const result = runGate(outcome);
    assert.equal(result.status, 1, result.stdout + result.stderr);
  });
}
