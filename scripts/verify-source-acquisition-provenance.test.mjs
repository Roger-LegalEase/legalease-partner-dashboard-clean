#!/usr/bin/env node
// Every workflow that runs the acquire script must hand it its provenance.
//
// scripts/rcap-acquire-official-source.mjs refuses, inside GitHub Actions, to
// write a receipt without RCAP_ACQUISITION_RUN_ID and RCAP_ARTIFACT_NAME —
// correctly, because a receipt carrying neither can never be matched to the
// artifact holding its bytes. The batch workflow supplied both. The single-URL
// workflow supplied neither, so EVERY single-URL dispatch failed before it
// fetched anything (run 34314697246 among them), and the only working way to
// acquire one form was to add it to a manifest and dispatch a batch.
//
// The artifact name is the other half: the receipt and the upload must name one
// string. It had been composed inline in each workflow's upload step, so the
// two expressions could drift apart with nothing to notice.
//
//   node --test scripts/verify-source-acquisition-provenance.test.mjs
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { sourceArtifactName, ARTIFACT_NAME_PATTERN } from "./lib/rcap-source-artifact-name.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");

const SINGLE = ".github/workflows/rcap-official-source-acquisition.yml";
const BATCH = ".github/workflows/rcap-official-source-acquisition-batch.yml";

/* The env block of the step that runs the acquire script, in one workflow. */
const acquireStepEnv = (yaml) => {
  const at = yaml.indexOf("run: node scripts/rcap-acquire-official-source.mjs");
  assert.notEqual(at, -1, "the workflow must actually run the acquire script");
  const before = yaml.slice(0, at);
  const envAt = before.lastIndexOf("\n        env:\n");
  assert.notEqual(envAt, -1, "the acquire step must carry an env block");
  return before.slice(envAt);
};

for (const wf of [SINGLE, BATCH]) {
  test(`${wf} supplies the acquisition run id`, () => {
    assert.match(
      acquireStepEnv(read(wf)),
      /RCAP_ACQUISITION_RUN_ID:\s*\$\{\{\s*github\.run_id\s*\}\}/,
      "the acquire script refuses a receipt with no run id inside Actions"
    );
  });

  test(`${wf} supplies the artifact name`, () => {
    assert.match(acquireStepEnv(read(wf)), /RCAP_ARTIFACT_NAME:\s*\S/, "the receipt must name its artifact");
  });
}

test("neither workflow composes an artifact name inline", () => {
  // An expression building the name out of inputs or matrix fields is a second
  // derivation; the name must come from a step output or the planner's matrix.
  for (const wf of [SINGLE, BATCH]) {
    const yaml = read(wf);
    assert.doesNotMatch(
      yaml,
      /name:\s*rcap-source-\$\{\{/,
      `${wf} must take the artifact name from one derivation, not build it in the workflow`
    );
  }
});

test("the single-URL upload and the receipt name the same string", () => {
  const yaml = read(SINGLE);
  const env = acquireStepEnv(yaml).match(/RCAP_ARTIFACT_NAME:\s*(.+)/)[1].trim();
  const upload = yaml.slice(yaml.indexOf("uses: actions/upload-artifact@v4")).match(/name:\s*(.+)/)[1].trim();
  assert.equal(upload, env, "one string, referenced twice");
  assert.match(env, /steps\.artifact_name\.outputs\.artifact_name/, "and it is the derivation step's output");
});

test("the planner derives its names from the shared module", () => {
  const src = read("scripts/rcap-plan-source-acquisition-batch.mjs");
  assert.match(src, /from "\.\/lib\/rcap-source-artifact-name\.mjs"/, "one derivation, imported");
  assert.doesNotMatch(src, /replace\(\/\[\^a-z0-9\._-\]\+\/g/, "no second copy of the sanitizer");
});

test("derived names satisfy the shape the acquire script requires", () => {
  for (const [j, id] of [["NM", "4-222"], ["KY", "AOC-334"], ["MA", "CJP 34"], ["DC", "Form 1A"]]) {
    const name = sourceArtifactName(j, id);
    assert.match(name, ARTIFACT_NAME_PATTERN, `${j} ${id}`);
  }
});

test("a name that identifies no acquisition is refused, not sanitized into a shared one", () => {
  // Both segments sanitizing away once produced "rcap-source--", which matches
  // the pattern and would be handed to every such dispatch — where the second
  // upload overwrites the first.
  assert.equal(sourceArtifactName("", ""), null);
  assert.equal(sourceArtifactName("NM", "***"), null);
  assert.equal(sourceArtifactName("///", "4-222"), null);
});

test("case-folding models GitHub's case-insensitive artifact store", () => {
  assert.equal(sourceArtifactName("NM", "Form-A"), sourceArtifactName("nm", "form-a"));
});
