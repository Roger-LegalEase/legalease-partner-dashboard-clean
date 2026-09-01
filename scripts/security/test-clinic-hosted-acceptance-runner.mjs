/**
 * Refusal proof for the Lane H hosted acceptance runner.
 *
 * The runner's first job is to not run. It executes only against a pinned
 * Preview with synthetic identities, and everything else -- a Production host,
 * a live-mode Stripe key, a real participant address, a Production Supabase
 * project, an enabled credit-consumption or domain-activation flag, a
 * half-specified invocation -- has to stop it before a single journey step is
 * planned.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const {
  parseRunnerArgs,
  assertNoProductionExposure,
  buildJourneyPlan,
  writeEvidenceIndex,
  PROHIBITED_TOOLS,
  RCAP_JOURNEY,
  CLINIC_JOURNEY,
  SECURITY_PROBES
} = await import("./clinic-hosted-acceptance-runner.mjs");

const VALID = [
  "--candidate-sha", "0123456789abcdef0123456789abcdef01234567",
  "--preview-url", "https://legalease-git-candidate.vercel.app",
  "--tenant", "synthetic-tenant-a",
  "--event", "synthetic-clinic-event",
  "--participants", "participant.one@example.test,participant.two@example.test"
];

verifyValidInvocationIsAccepted();
verifyMalformedInvocationsAreRefused();
verifyProductionTargetsAreRefused();
verifyRealParticipantsAreRefused();
verifyProductionEnvironmentIsRefused();
verifyPlanIsCompleteAndProductionFree();
verifyEvidenceIndex();

console.log(`Hosted acceptance runner refusals passed: ${RCAP_JOURNEY.length} RCAP steps, ${CLINIC_JOURNEY.length} Clinic steps and ${SECURITY_PROBES.length} security probes planned; Production hosts, live keys, real participants and half-specified runs all refused.`);
console.log("Production touched: no. No hosted request is issued by this verifier.");

function verifyValidInvocationIsAccepted() {
  const parsed = parseRunnerArgs(VALID, {});
  assert.equal(parsed.plan, false);
  assert.equal(parsed.inputs.candidateSha, "0123456789abcdef0123456789abcdef01234567");
  assert.equal(parsed.inputs.previewUrl, "https://legalease-git-candidate.vercel.app/");
  assert.deepEqual(parsed.inputs.participants, ["participant.one@example.test", "participant.two@example.test"]);
  assert.equal(parseRunnerArgs(["--plan"], {}).plan, true, "--plan must work with no captain inputs, so preparation never idles");
}

function verifyMalformedInvocationsAreRefused() {
  for (const [label, argv, expected] of [
    ["a missing candidate SHA", without("--candidate-sha"), /exact 40-character candidate SHA/u],
    ["a short candidate SHA", replace("--candidate-sha", "0123456"), /exact 40-character candidate SHA/u],
    ["a branch name instead of a SHA", replace("--candidate-sha", "claude/grade-a-68h-lane-h"), /exact 40-character candidate SHA/u],
    ["a missing Preview URL", without("--preview-url"), /exact Preview URL/u],
    ["a plaintext Preview URL", replace("--preview-url", "http://legalease-git-candidate.vercel.app"), /must be https/u],
    ["a non-URL Preview", replace("--preview-url", "legalease-git-candidate"), /exact Preview URL/u],
    ["a missing tenant", without("--tenant"), /exact synthetic slug/u],
    ["a non-canonical tenant slug", replace("--tenant", "../synthetic-tenant-a"), /exact synthetic slug/u],
    ["a missing event", without("--event"), /exact synthetic slug/u],
    ["a single participant", replace("--participants", "participant.one@example.test"), /at least two synthetic identities/u],
    ["an unknown flag", [...VALID, "--force"], /--force requires a value/u],
    ["a positional argument", [...VALID, "run"], /Unknown argument: run/u]
  ]) {
    assert.throws(() => parseRunnerArgs(argv, {}), expected, `${label} was accepted`);
  }
}

function verifyProductionTargetsAreRefused() {
  for (const host of [
    "https://expungement.ai",
    "https://www.expungement.ai",
    "https://app.expungement.ai",
    "https://legalease.com",
    "https://partners.legalease.com",
    "https://legalease.ai",
    "https://wilma.legal"
  ]) {
    assert.throws(() => parseRunnerArgs(replace("--preview-url", host), {}), /Production host/u,
      `${host} was accepted as a Preview target`);
  }
}

function verifyRealParticipantsAreRefused() {
  for (const identity of [
    "someone@gmail.com",
    "roger@legalease.com",
    "participant@expungement.ai",
    "not-an-address"
  ]) {
    assert.throws(
      () => parseRunnerArgs(replace("--participants", `${identity},participant.two@example.test`), {}),
      /not on a reserved synthetic domain|is not an address/u,
      `${identity} was accepted as a synthetic participant`
    );
  }
  for (const identity of ["a@x.test", "b@y.invalid", "c@z.example", "d@example.com"]) {
    assert.doesNotThrow(
      () => parseRunnerArgs(replace("--participants", `${identity},participant.two@example.test`), {}),
      `${identity} is a reserved synthetic domain and should be accepted`
    );
  }
}

function verifyProductionEnvironmentIsRefused() {
  for (const [label, environment] of [
    ["a live-mode Stripe key", { STRIPE_SECRET_KEY: "sk_live_synthetic" }],
    ["a live-mode Stripe restricted key", { STRIPE_RESTRICTED_KEY: "sk_live_synthetic" }],
    ["a Production Supabase URL", { NEXT_PUBLIC_SUPABASE_URL: "https://app.expungement.ai" }],
    ["a Production flag", { RCAP_PRODUCTION_ACTIVATION: "true" }],
    ["real participant creation", { ALLOW_REAL_PARTICIPANTS: "1" }],
    ["credit consumption", { ENABLE_CREDIT_CONSUMPTION: "yes" }],
    ["domain activation", { ALLOW_DOMAIN_ACTIVATION: "on" }]
  ]) {
    assert.throws(() => assertNoProductionExposure(environment), /Refusing to run/u, `${label} was accepted`);
  }
  for (const [label, environment] of [
    ["a test-mode Stripe key", { STRIPE_SECRET_KEY: "sk_test_synthetic" }],
    ["a Preview Supabase URL", { NEXT_PUBLIC_SUPABASE_URL: "https://synthetic.supabase.co" }],
    ["a disabled Production flag", { RCAP_PRODUCTION_ACTIVATION: "false" }],
    ["an empty environment", {}]
  ]) {
    assert.equal(assertNoProductionExposure(environment), true, `${label} was wrongly refused`);
  }
}

function verifyPlanIsCompleteAndProductionFree() {
  const plan = buildJourneyPlan(parseRunnerArgs(VALID, {}).inputs);
  assert.equal(plan.productionTouched, false);
  assert.equal(plan.steps.length, RCAP_JOURNEY.length + CLINIC_JOURNEY.length + SECURITY_PROBES.length);

  for (const [phase, expected] of [["rcap", RCAP_JOURNEY], ["clinic", CLINIC_JOURNEY], ["security", SECURITY_PROBES]]) {
    const planned = plan.steps.filter((step) => step.phase === phase);
    assert.deepEqual(planned.map((step) => step.id), [...expected], `the ${phase} journey is not planned in order`);
    assert.deepEqual(planned.map((step) => step.order), expected.map((_, index) => index + 1));
    for (const step of planned) {
      assert.deepEqual(step.evidence, ["screenshot", "console", "network"], `${step.id} plans no evidence capture`);
      assert.equal(step.status, "pending");
    }
  }

  // The Clinic journey is only a shared-device proof if the handover is in it.
  for (const required of ["reset_device", "back_forward_denial", "clean_second_participant"]) {
    assert.ok(CLINIC_JOURNEY.includes(required), `the Clinic journey omits ${required}`);
  }

  // The Production-facing tools stay named and unexecuted.
  assert.ok(PROHIBITED_TOOLS.length >= 5);
  for (const tool of PROHIBITED_TOOLS) {
    assert.ok(plan.prohibitedTools.includes(tool), `${tool} is not recorded as prohibited in the plan`);
    assert.ok(/production|clinic-migrate/u.test(tool), `${tool} does not belong on the prohibited list`);
  }
  const runnerSource = fs.readFileSync(new URL("./clinic-hosted-acceptance-runner.mjs", import.meta.url), "utf8");
  for (const forbidden of ["spawn(", "execSync", "child_process"]) {
    assert.ok(!runnerSource.includes(forbidden),
      `the runner can invoke a subprocess via ${forbidden}; the prohibited tools must stay unreachable from it`);
  }
}

function verifyEvidenceIndex() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "lane-h-evidence-"));
  try {
    const plan = buildJourneyPlan(parseRunnerArgs(VALID, {}).inputs);
    const indexPath = writeEvidenceIndex(plan, directory);
    const written = JSON.parse(fs.readFileSync(indexPath, "utf8"));
    assert.equal(written.lane, "H");
    assert.equal(written.candidateSha, "0123456789abcdef0123456789abcdef01234567");
    assert.equal(written.previewUrl, "https://legalease-git-candidate.vercel.app/");
    assert.equal(written.steps.length, plan.steps.length);
    assert.equal(written.productionTouched, false);
    // The index is the handover artefact: it must not carry a secret.
    const serialized = JSON.stringify(written);
    for (const secret of ["sk_live", "sk_test", "service_role", "SUPABASE_ACCESS_TOKEN", "eyJ"]) {
      assert.ok(!serialized.includes(secret), `the evidence index carries ${secret}`);
    }
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
}

function without(flag) {
  const argv = [...VALID];
  const index = argv.indexOf(flag);
  argv.splice(index, 2);
  return argv;
}

function replace(flag, value) {
  const argv = [...VALID];
  argv[argv.indexOf(flag) + 1] = value;
  return argv;
}
