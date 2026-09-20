import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PATCH_PATH = path.join(
  ROOT,
  "data/expungement-ai/corrections-a/shared-integration.patch"
);
const BUILDER_PATH = path.join(
  ROOT,
  "scripts/corrections-a/build-shared-integration-patch.mjs"
);
const CLOSURE_PATH = path.join(
  ROOT,
  "data/expungement-ai/corrections-a/closure.json"
);

const patch = fs.readFileSync(PATCH_PATH, "utf8");
const regenerated = execFileSync(process.execPath, [BUILDER_PATH], {
  cwd: ROOT,
  encoding: "utf8",
  maxBuffer: 30 * 1024 * 1024
});
assert.equal(patch, regenerated, "shared integration patch is stale");
execFileSync("git", ["apply", "--unidiff-zero", "--check", PATCH_PATH], {
  cwd: ROOT,
  encoding: "utf8"
});

const closure = JSON.parse(fs.readFileSync(CLOSURE_PATH, "utf8"));
const fileLabels = [...patch.matchAll(/^--- a\/(.+)$/gm)].map((entry) => entry[1]);
assert.deepEqual(fileLabels, [
  "src/lib/rcap-engine/evaluator.ts",
  "src/lib/rcap-engine/public-profile-projection.ts",
  "data/expungement-ai/route-product-metadata.json"
], "shared patch changes an unexpected file");

for (const routeKey of closure.sharedHandoff.removeFromRatifiedDeployable) {
  assert.ok(
    patch.includes(`-  "${routeKey}",`),
    `${routeKey}: exact ratified-removal hunk missing`
  );
}
for (const routeKey of closure.sharedHandoff.addToCorrectedAwaitingReconfirm) {
  assert.ok(
    patch.includes(`+  "${routeKey}",`),
    `${routeKey}: corrected-awaiting-reconfirm hunk missing`
  );
}
for (const routeKey of closure.sharedHandoff.addToHeldGuidance) {
  assert.ok(
    patch.includes(`+  "${routeKey}",`),
    `${routeKey}: held-guidance hunk missing`
  );
}
assert.match(
  patch,
  /timingFromExactAnchor\(profile, answers, rule, pathway, "conviction_date", \{ value: 90/,
  "Louisiana Art. 998 exact conviction-date hunk missing"
);
assert.match(
  patch,
  /timingFromExactAnchor\(profile, answers, rule, pathway, "disposition_date", \{ value: 60/,
  "Alaska TF-810 exact disposition-date hunk missing"
);
for (const questionId of [
  "ms_last_conviction_date_any_court",
  "ms_successful_sentence_completion_date",
  "ms_mip_dismissal_or_discharge_date",
  "ms_mip_sentence_completion_date",
  "ms_mip_fine_imposed",
  "ms_mip_fine_payment_date"
]) {
  assert.ok(patch.includes(questionId), `${questionId}: Mississippi public timing fact hunk missing`);
}

const sha256 = crypto.createHash("sha256").update(patch).digest("hex");
console.log("verify-corrections-a-shared-patch: GREEN");
console.log(JSON.stringify({
  sha256,
  files: fileLabels,
  ratifiedRemovals: closure.sharedHandoff.removeFromRatifiedDeployable.length,
  correctedAdditions: closure.sharedHandoff.addToCorrectedAwaitingReconfirm.length,
  heldGuidanceAdditions: closure.sharedHandoff.addToHeldGuidance.length
}, null, 2));
