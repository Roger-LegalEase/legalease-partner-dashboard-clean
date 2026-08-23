#!/usr/bin/env node
// ENV-007 — the phase boundary matrices, derived from the workflow rather than
// written out by hand.
//
// Three questions a reviewer must be able to answer without reading 1,000 lines
// of YAML:
//
//   which ENVIRONMENT does this phase run in?
//   which SECRETS can the job serving it even reference?
//   which EXTERNAL WRITES can it perform?
//
// Read-only: parses committed workflow text and writes one evidence file.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const WORKFLOW = ".github/workflows/rcap-hosted-acceptance-staging.yml";
const OUT = path.join(rootDir, "data/rcap-render/phase-boundary-matrices.json");

const text = fs.readFileSync(path.join(rootDir, WORKFLOW), "utf8");
const lines = text.split("\n");

/** Executable (non-comment) lines, attributed to the job they sit inside. */
function jobBodies() {
  const byJob = new Map();
  let job = null;
  let inJobs = false;
  for (const line of lines) {
    if (/^jobs:\s*$/.test(line)) { inJobs = true; continue; }
    if (!inJobs) continue;
    const key = /^ {2}([A-Za-z0-9_-]+):\s*$/.exec(line);
    if (key) { job = key[1]; byJob.set(job, []); continue; }
    if (job === null) continue;
    if (/^\s*#/.test(line) || line.trim() === "") continue;
    byJob.get(job).push(line);
  }
  return byJob;
}

const bodies = jobBodies();

// Scoped to the job's OWN body. A lazy match from the job key would run past
// the next job and report the following job's environment as this one's —
// which is precisely the misattribution this matrix exists to rule out.
const jobEnvironment = (job) => {
  const body = bodies.get(job) ?? [];
  const i = body.findIndex((l) => /^ {4}environment:\s*$/.test(l));
  if (i === -1) return null;
  const name = /^ {6}name: (.+)$/.exec(body[i + 1] ?? "");
  return name ? name[1].trim() : null;
};

const SECRET_RE = /secrets\.([A-Z_][A-Z0-9_]*)/g;
const secretsOf = (job) => {
  const found = new Set();
  for (const line of bodies.get(job) ?? []) {
    let m;
    SECRET_RE.lastIndex = 0;
    while ((m = SECRET_RE.exec(line)) !== null) found.add(m[1]);
  }
  return [...found].sort();
};

// Which job serves which phase, from the jobs' own `if:` conditions.
const PHASES = ["preflight", "vercel_audit", "migrate", "deploy", "accept", "full", "checkout_gate", "worker_contract", "payment"];
const jobForPhase = (phase) => {
  if (phase === "preflight" || phase === "vercel_audit") return ["readonly_probe"];
  if (phase === "payment") return ["hosted_write", "hosted_payment"];
  return ["hosted_write"];
};

// The contract table is the authority for what each phase schedules.
const table = /case "\$PHASE" in([\s\S]*?)esac/.exec(text)?.[1] ?? "";
const tableLines = table.split("\n");
const rowFor = (phase) => {
  const i = tableLines.findIndex((l) => new RegExp(`^\\s*(?:[a-z_]+\\|)*${phase}(?:\\|[a-z_]+)*\\)`).test(l));
  if (i === -1) return "";
  const rest = tableLines[i].replace(/^[^)]*\)/, "");
  return rest.trim().length > 0 ? rest : (tableLines[i + 1] ?? "");
};
const flag = (phase, name) => new RegExp(`${name}=true`).test(rowFor(phase));

const TRANSACTING = ["scripts/rcap-hosted-checkout-gate.mjs", "scripts/rcap-hosted-acceptance-payment.mjs"];
const jobRunsTransacting = (job) => TRANSACTING.filter((t) => (bodies.get(job) ?? []).some((l) => l.includes(t)));

const environmentMatrix = PHASES.map((phase) => ({
  phase: `hosted_${phase}`,
  jobs: jobForPhase(phase),
  environments: jobForPhase(phase).map((j) => jobEnvironment(j) ?? "(none — read-only)")
}));

const secretMatrix = PHASES.map((phase) => {
  const jobs = jobForPhase(phase);
  const all = [...new Set(jobs.flatMap(secretsOf))].sort();
  return {
    phase: `hosted_${phase}`,
    jobs,
    referencableSecrets: all,
    holdsStripeTestSecrets: all.some((s) => s.startsWith("HOSTED_STRIPE_TEST"))
  };
});

const externalWriteMatrix = PHASES.map((phase) => {
  const jobs = jobForPhase(phase);
  const transacting = [...new Set(jobs.flatMap(jobRunsTransacting))];
  const readOnly = phase === "preflight" || phase === "vercel_audit";
  return {
    phase: `hosted_${phase}`,
    supabaseSchemaWrite: !readOnly && ["migrate", "full", "payment"].includes(phase),
    supabaseAuthConfigWrite: !readOnly && flag(phase, "MATRIX"),
    vercelPreviewDeployment: !readOnly && flag(phase, "DEPLOY"),
    vercelProductionWrite: false,
    containerRegistryPull: !readOnly && (flag(phase, "MATRIX") || phase === "worker_contract"),
    stripeApiCall: phase === "payment",
    createsCheckoutSession: flag(phase, "CHECKOUT_SESSION"),
    consumesPaymentWebhook: phase === "payment",
    transactingScripts: phase === "payment" ? transacting : []
  };
});

const report = {
  schemaVersion: "rcap-phase-boundary-matrices/v1",
  generatedBy: "scripts/rcap-phase-boundary-matrix.mjs",
  readOnly: true,
  workflow: WORKFLOW,
  jobs: [...bodies.keys()].filter((j) => j !== "workflow_call").map((j) => ({
    job: j,
    environment: jobEnvironment(j),
    stripeSecretExpressions: (bodies.get(j) ?? []).filter((l) => /secrets\.HOSTED_STRIPE_TEST/.test(l)).length,
    transactingScripts: jobRunsTransacting(j)
  })),
  environmentMatrix,
  secretMatrix,
  externalWriteMatrix,
  invariants: {
    onlyPaymentPhaseHoldsStripeSecrets:
      secretMatrix.filter((r) => r.holdsStripeTestSecrets).map((r) => r.phase).join(",") === "hosted_payment",
    onlyPaymentPhaseCallsStripe:
      externalWriteMatrix.filter((r) => r.stripeApiCall).map((r) => r.phase).join(",") === "hosted_payment",
    onlyPaymentPhaseCreatesACheckoutSession:
      externalWriteMatrix.filter((r) => r.createsCheckoutSession).map((r) => r.phase).join(",") === "hosted_payment",
    noPhaseWritesVercelProduction: externalWriteMatrix.every((r) => r.vercelProductionWrite === false)
  }
};

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, `${JSON.stringify(report, null, 2)}\n`);

console.log("phase boundary matrices → data/rcap-render/phase-boundary-matrices.json\n");
console.log("job                environment                  stripeExprs  transacting");
for (const j of report.jobs) {
  console.log(`  ${j.job.padEnd(16)} ${String(j.environment ?? "(none)").padEnd(28)} ${String(j.stripeSecretExpressions).padEnd(12)} ${j.transactingScripts.map((t) => t.split("/").pop()).join(", ") || "-"}`);
}
console.log("\nphase                  environment(s)                          stripe  session");
for (const e of environmentMatrix) {
  const w = externalWriteMatrix.find((x) => x.phase === e.phase);
  console.log(`  ${e.phase.padEnd(22)} ${e.environments.join(" + ").padEnd(39)} ${String(w.stripeApiCall).padEnd(7)} ${w.createsCheckoutSession}`);
}
console.log("\ninvariants:", JSON.stringify(report.invariants, null, 2));

const bad = Object.entries(report.invariants).filter(([, v]) => v !== true);
if (bad.length > 0) {
  console.error(`\nBOUNDARY VIOLATED: ${bad.map(([k]) => k).join(", ")}`);
  process.exit(1);
}
