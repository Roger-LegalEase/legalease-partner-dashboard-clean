import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { WA_AUTOMATIC, WA_GUIDANCE_DIRECTORY, WA_GUIDANCE_ROUTES, WA_MOTION_ROUTE } from "./treatment-reconciliation.mjs";

export const WA_GUIDANCE_REVIEW = "data/rcap-grade-a/terminal-treatment-verification/SESSION10_WA_GUIDANCE_ROWS.json";
const MANIFEST = `${WA_GUIDANCE_DIRECTORY}/guidance-manifest.json`;
const sha = bytes => crypto.createHash("sha256").update(bytes).digest("hex");

// Consume the existing independent terminal-treatment review schema. A non-PDF
// guide has no raster identity to invent: inspect and bind its complete text,
// route/fact outcomes, generator and authority. This is static family admission
// only. It creates no track/runtime, entitlement, payment or release authority.
export function assessWashingtonReviewedGuidance(root, overrides = {}) {
  const readBytes = overrides.readBytes ?? (relative => fs.readFileSync(path.join(root, relative)));
  const historical = overrides.readHistorical ?? ((commit, relative) => execFileSync("git", ["show", `${commit}:${relative}`],
    { cwd: root, stdio: ["ignore", "pipe", "ignore"], maxBuffer: 2 ** 24 }));
  try {
    const reviewBytes = readBytes(WA_GUIDANCE_REVIEW);
    const review = JSON.parse(reviewBytes);
    assert.equal(review.schemaVersion, "rcap-terminal-treatment-independent-verification/v1");
    assert.equal(review.authoredByADifferentLaneThanTheTreatmentRecord, true);
    assert.equal(review.editsNothingItVerifies, true);
    assert.equal(review.createsNoApproval, true);
    assert.equal(review.opensNoRoute, true);
    assert.ok(typeof review.reviewer === "string" && review.reviewer.trim());
    assert.ok(typeof review.lane === "string" && review.lane.trim());
    assert.ok(/^[0-9a-f]{40}$/.test(review.verifiedAtBase ?? ""), "review must name its actual immutable base");
    const matches = review.families?.filter(row => row.familyId === WA_AUTOMATIC) ?? [];
    assert.equal(matches.length, 1, "review must contain one exact WA family row");
    const row = matches[0];
    assert.equal(row.verdict, "TREATMENT_CORRECT");
    assert.equal(row.recordedTreatment, "GUIDANCE_READY");
    assert.equal(row.scope, "static_family_treatment");
    assert.equal(row.runtimeInstalled, false);
    assert.equal(row.participantMotionDischarged, false);
    assert.deepEqual(row.routeKeys, WA_GUIDANCE_ROUTES);
    assert.equal(row.preservedSeparateObligationRouteKey, WA_MOTION_ROUTE);
    assert.deepEqual(row.failedObligations ?? [], []);
    assert.deepEqual(row.unmeasuredObligations ?? [], []);
    assert.ok(typeof row.verdictScope === "string" && row.verdictScope.trim().length > 40, "independent findings must state the actual reviewed scope");
    const manifestBytes = readBytes(MANIFEST);
    assert.equal(row.manifest?.path, MANIFEST);
    assert.equal(row.manifest.sha256, sha(manifestBytes), "installed guide manifest differs from independent review");
    const manifest = JSON.parse(manifestBytes);
    assert.equal(manifest.familyId, WA_AUTOMATIC);
    assert.deepEqual(manifest.routeKeys, WA_GUIDANCE_ROUTES);
    assert.equal(manifest.implementationStrategy, "process_guidance");
    assert.equal(manifest.participantFilesGeneratedOutput, false);
    assert.equal(manifest.runtimeInstalled, false);
    assert.equal(manifest.commercialAuthority, false);
    assert.equal(manifest.outputs.length, 12, "selected complete route/fact inventory changed");
    assert.equal(new Set(manifest.outputs.map(output => output.path)).size, manifest.outputs.length);
    assert.deepEqual(row.reviewedOutputs, manifest.outputs, "independent review must enumerate every selected complete text output");
    const stageKeys = [...new Set(manifest.outputs.map(output => output.routeKey))].sort();
    assert.deepEqual(stageKeys, [...WA_GUIDANCE_ROUTES].sort(), "one automatic cohort is missing");
    const expectedInputs = [
      "scripts/grade-a-packet-factory-24h/washington-court-initiated-guidance.mjs",
      "scripts/grade-a-packet-factory-24h/treatment-reconciliation.mjs",
      "scripts/build-census-v1-census-pending-family:WA:juvenile-record-sealing-under-rcw-13-50-260.mjs",
      "data/rcap-grade-a/chat-parallel-2026-09-07/chat1-integration/session10/treatment-reconciliation/wa-guidance-build.json",
      "data/rcap-grade-a/chat-parallel-2026-09-07/chat1-integration/session10/treatment-reconciliation/wa-13-50-260.html.gz",
      "data/rcap-grade-a/chat-parallel-2026-09-07/chat6-source-legal/group-02-wa-guidance-ut-custody.json"
    ];
    assert.deepEqual(manifest.inputs.map(input => input.path), expectedInputs, "guide omitted or replaced a code/source/fixture dependency");
    assert.deepEqual(row.reviewedInputs, manifest.inputs, "independent review must bind actual code and source dependencies");
    const checked = [];
    for (const input of [{ path: MANIFEST, sha256: sha(manifestBytes) }, ...manifest.inputs, ...manifest.outputs]) {
      assert.ok(!input.path.split("/").includes("..") && !path.isAbsolute(input.path), "invalid evidence path");
      const current = readBytes(input.path);
      assert.equal(sha(current), input.sha256, `reviewed bytes changed: ${input.path}`);
      assert.equal(sha(historical(review.verifiedAtBase, input.path)), input.sha256, `review did not inspect the published input: ${input.path}`);
      if (input.mediaType) {
        assert.equal(input.mediaType, "text/markdown");
        assert.equal(current.length, input.byteLength);
      }
      checked.push({ path: input.path, sha256: input.sha256 });
    }
    return { eligible: true, familyId: WA_AUTOMATIC, terminalTreatment: "GUIDANCE_READY",
      reviewPath: WA_GUIDANCE_REVIEW, reviewSha256: sha(reviewBytes), reviewer: review.reviewer,
      lane: review.lane, reviewedAtBase: review.verifiedAtBase, checked,
      runtimeInstalled: false, participantMotionDischarged: false, commercialAuthority: false };
  } catch (error) {
    return { eligible: false, familyId: WA_AUTOMATIC, reviewPath: WA_GUIDANCE_REVIEW, reason: error.message };
  }
}
