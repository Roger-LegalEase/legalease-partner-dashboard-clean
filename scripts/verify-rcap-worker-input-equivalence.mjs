#!/usr/bin/env node
// ONE worker-equivalence definition, for every active release decision.
//
// Before this existed, the hosted workflow, the F1 preproduction workflow and
// the Checkout gate each carried their own `git diff` path list. Those lists
// were shorter than the canonical closure, so each could report "no worker
// drift" while createWorkerInputPlan reported rebuild-required -- and one of
// them carried a private `:(exclude)` that the canonical resolver does not
// recognise. A release control that answers "may the accepted worker digest
// still be reused?" must not be able to disagree with the planner.
//
// The canonical authority is scripts/rcap-hosted-acceptance-worker-input-plan.mjs
// and nothing here re-derives it. The closure is whatever that module compares:
// its fixed roots, Dockerfile.dockerignore, the supplemental guides, the brand
// asset, and every Docker COPY-derived input resolved for the base SHA. When a
// later Dockerfile COPYs something new, this control follows it with no edit.
//
// Deliberately NOT supported: a path exclusion. There is no flag, environment
// variable or argument that removes a canonical input from the comparison. A
// file that ships in the image is a worker input; whether the worker imports it
// at runtime is a different question and not this contract's.

import path from "node:path";
import process from "node:process";
import { createWorkerInputPlan } from "./rcap-hosted-acceptance-worker-input-plan.mjs";

const EXACT_SHA = /^[0-9a-f]{40}$/;

/** The one predicate. Returns the planner's own answer, unmodified. */
export function workerInputEquivalence(rootDir, baseSha, headSha) {
  if (!EXACT_SHA.test(baseSha ?? "")) throw new Error(`base must be an exact 40-character lowercase Git SHA, got ${baseSha ?? "(absent)"}`);
  if (!EXACT_SHA.test(headSha ?? "")) throw new Error(`head must be an exact 40-character lowercase Git SHA, got ${headSha ?? "(absent)"}`);
  const plan = createWorkerInputPlan({
    rootDir,
    acceptedSourceSha: baseSha,
    acceptedDigest: "sha256:" + "0".repeat(64), // Not a claim about any image; the digest is unused by the comparison.
    candidateSha: headSha
  });
  return {
    equivalent: plan.rebuildRequired === false,
    changedPaths: plan.changedPaths,
    comparedInputs: plan.comparedInputs,
    aggregateInputSha256: plan.aggregateInputSha256
  };
}

function flag(name, fallback = null) {
  const at = process.argv.indexOf(`--${name}`);
  return at === -1 ? fallback : process.argv[at + 1] ?? null;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const rootDir = flag("root", path.resolve(path.dirname(new URL(import.meta.url).pathname), ".."));
  const base = flag("base");
  const head = flag("head");
  const label = flag("label", `${base} -> ${head}`);
  // `reuse` requires equivalence; `report` prints the answer and never fails on
  // drift, for the measurement steps that record a rebuild rather than refuse it.
  const mode = flag("mode", "reuse");
  let result;
  try {
    result = workerInputEquivalence(rootDir, base, head);
  } catch (error) {
    console.error(`::error::worker-input equivalence could not be evaluated for ${label}: ${error.message}`);
    process.exit(2);
  }
  console.log(`worker-input equivalence ${label}`);
  console.log(`  canonical inputs compared: ${result.comparedInputs.length}`);
  console.log(`  aggregate input sha256:    ${result.aggregateInputSha256}`);
  console.log(`  changed canonical inputs:  ${result.changedPaths.length}`);
  for (const p of result.changedPaths) console.log(`    ${p}`);
  if (mode === "report") process.exit(0);
  if (!result.equivalent) {
    console.error(`::error::${label}: ${result.changedPaths.length} canonical worker input(s) changed; the accepted worker digest may not be reused. Build and pin one new full-SHA image.`);
    process.exit(1);
  }
  console.log("  equivalent: the accepted worker digest remains valid for this pair");
}
