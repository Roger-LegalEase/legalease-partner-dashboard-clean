#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const verifier = path.join(root, "scripts/verify-rcap-github-hosted-acceptance.mjs");
const targets = {
  workflow: path.join(root, ".github/workflows/rcap-github-hosted-acceptance.yml"),
  bootstrap: path.join(root, "scripts/rcap-github-acceptance-bootstrap.mjs"),
  gate: path.join(root, "scripts/rcap-github-acceptance-gate.mjs"),
  postPayment: path.join(root, "scripts/rcap-github-post-payment-acceptance.mjs")
};
const originals = Object.fromEntries(Object.entries(targets).map(([key, file]) => [key, fs.readFileSync(file, "utf8")]));

function runVerifier() {
  return spawnSync(process.execPath, [verifier], { cwd: root, encoding: "utf8" });
}

function requireBaseline() {
  const run = runVerifier();
  if (run.status !== 0) {
    throw new Error(`baseline verifier failed:\n${run.stdout}${run.stderr}`);
  }
}

const mutations = [
  {
    name: "fabricated paid event in post-payment acceptance",
    file: "postPayment",
    mutate: (text) => text.replace(
      "async function main() {",
      'const forbiddenSyntheticPaidEvent = { payment_status: "paid" };\n\nasync function main() {'
    ),
    expected: "must not fabricate a paid Stripe event"
  },
  {
    name: "post-payment fixture deletion",
    file: "postPayment",
    mutate: (text) => text.replace(
      "async function main() {",
      "const forbiddenCleanup = `delete from public.consumer_briefcase_items`;\n\nasync function main() {"
    ),
    expected: "must preserve the fixture"
  },
  {
    name: "worker starts before real-payment proof",
    file: "postPayment",
    mutate: (text) => text.replace(
      "async function main() {",
      'let workerRun = spawnSync("docker", ["run", WORKER_REF]);\n\nasync function main() {'
    ),
    expected: "worker can start before replay idempotency is proved"
  },
  {
    name: "direct GitHub input interpolation in run shell",
    file: "workflow",
    mutate: (text) => text.replace('"$REQUESTED_APPLICATION_SHA"', '"${{ inputs.application_sha }}"'),
    expected: "run shell must receive GitHub inputs and secrets through env"
  },
  {
    name: "acceptance keys exported through GITHUB_ENV",
    file: "bootstrap",
    mutate: (text) => text.replace("fs.writeFileSync(RUNTIME_ENV_PATH", "fs.appendFileSync(process.env.GITHUB_ENV"),
    expected: "must not export acceptance keys through GITHUB_ENV"
  },
  {
    name: "worker execution",
    file: "workflow",
    mutate: (text) => text.replace('docker pull "$REF"', 'docker run "$REF"'),
    expected: "must not run the worker container"
  },
  {
    name: "production deployment flag",
    file: "workflow",
    mutate: (text) => text.replace("/tmp/rcap-cloudflared version", "/tmp/rcap-cloudflared version --prod"),
    expected: "production deploy flag"
  },
  {
    name: "production credential inherited by application",
    file: "workflow",
    mutate: (text) => text.replace("PATH=\"$PATH\" \\", "PATH=\"$PATH\" \\\n            SUPABASE_ACCESS_TOKEN=forbidden \\"),
    expected: "application process environment includes SUPABASE_ACCESS_TOKEN"
  },
  {
    name: "direct Stripe Session fallback",
    file: "gate",
    mutate: (text) => text.replace(
      "// Exactly one application call.",
      '// forbidden control: fetch("https://api.stripe.com/v1/checkout/sessions", { method: "POST" });\n  // Exactly one application call.'
    ),
    expected: "must not create a Stripe Session directly"
  },
  {
    name: "schema-invalid compatibility packet pathway",
    file: "gate",
    mutate: (text) => text.replace(
      'const ACCEPTANCE_PACKET_PATHWAY = "source_engine_packet_plan";',
      'const ACCEPTANCE_PACKET_PATHWAY = "Path A — Non-conviction expungement";'
    ),
    expected: "checkout gate is missing"
  },
  {
    name: "compatibility fixture launch blocker removed",
    file: "gate",
    mutate: (text) => text.replace("finalLaunchBlocked: true", "finalLaunchBlocked: false"),
    expected: "checkout gate is missing"
  },
  {
    name: "Vercel bypass leaked into provider-neutral gate",
    file: "gate",
    mutate: (text) => text.replace("protectionBypassUsed: false", 'protectionBypassUsed: false, note: "x-vercel-protection-bypass"'),
    expected: "provider-neutral gate must not use Vercel concepts"
  }
];

try {
  requireBaseline();
  for (const mutation of mutations) {
    const target = targets[mutation.file];
    const mutated = mutation.mutate(originals[mutation.file]);
    if (mutated === originals[mutation.file]) throw new Error(`${mutation.name}: mutation did not change its target`);
    fs.writeFileSync(target, mutated);
    const run = runVerifier();
    fs.writeFileSync(target, originals[mutation.file]);
    const output = `${run.stdout}${run.stderr}`;
    if (run.status === 0 || !output.includes(mutation.expected)) {
      throw new Error(`${mutation.name}: verifier did not reject as expected\n${output}`);
    }
    console.log(`  ok   ${mutation.name}`);
  }
} finally {
  for (const [key, target] of Object.entries(targets)) fs.writeFileSync(target, originals[key]);
}

requireBaseline();
console.log(`OK test-rcap-github-hosted-acceptance-mutations — ${mutations.length} safety mutations rejected and files restored`);
