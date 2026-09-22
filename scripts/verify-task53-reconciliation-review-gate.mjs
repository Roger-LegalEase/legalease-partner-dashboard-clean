#!/usr/bin/env node
/**
 * The review gate for Codex's bounded #53 noncommercial-evidence-producer
 * reconciliation.
 *
 * Roger held Phase 4 and directed that the #53 consequence be resolved as a
 * narrow reconciliation rather than by re-pinning builder hashes, rolling owner
 * approvals forward, creating new owner approvals, or reverting #53. This script
 * is what that correction has to survive before it is integrated.
 *
 * It exists because the cheapest wrong ways to make
 * verify-rcap-grade-a-fulfillment-authority green are all edits to the record
 * rather than to the truth: repoint an approved artifact hash, quietly edit an
 * owner approval, or flip an isCurrentCommercialArtifact flag so a failing
 * binding stops being checked as commercial. Each of those would pass the
 * authority verifier and each would be a lie. So this gate pins the things the
 * reconciliation must NOT touch, and says nothing about the evidence-producer
 * identity it is allowed to bind.
 *
 * Baseline captured at 8c68e845e, which is A-lane + #53 + the DC render proof,
 * with the two known #53 failures present and unmasked.
 */
import fs from "node:fs";
import crypto from "node:crypto";

const rootDir = process.cwd();
let failures = 0;
let checks = 0;
const ok = (label, condition, observed) => {
  checks += 1;
  if (condition) {
    console.log(`  ok        ${label}`);
    return;
  }
  failures += 1;
  console.log(`  FAILED    ${label}${observed === undefined ? "" : ` — observed ${JSON.stringify(observed)}`}`);
};
const sha = (file) => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
const json = (file) => JSON.parse(fs.readFileSync(file, "utf8"));

console.log("#53 reconciliation review gate — what the correction must not move\n");

// ---------------------------------------------------------------------------
// 1. The owner approvals stay byte-identical. Not superseded here, not amended,
//    not "refreshed". If a reconciliation needs an approval to change, that is
//    an owner decision and not a Codex commit.
// ---------------------------------------------------------------------------

console.log("1. the owner approval records are untouched");
const APPROVALS = {
  "data/rcap-grade-a/legal-decisions/OWNER_CURRENT_COMMERCIAL_ARTIFACT_APPROVAL_2026-09-20.json":
    "f6dfbd5e9336627d",
  "data/rcap-grade-a/legal-decisions/OWNER_BATCH_ADOPTION_2026-09-02.json":
    "32321a977941bf17",
  "data/rcap-grade-a/legal-decisions/BATCH_ADOPTION_PACKAGE_2026-09-02.json":
    "9b664dab0e9400b0"
};
for (const [file, prefix] of Object.entries(APPROVALS)) {
  const actual = fs.existsSync(file) ? sha(file).slice(0, 16) : null;
  ok(`${file.split("/").pop()} is byte-identical to the review baseline`,
    actual === prefix, { expected: prefix, actual });
}

// ---------------------------------------------------------------------------
// 2. Every artifact the owner approved as current commercial output is still
//    exactly those bytes. This is the participant-delivered surface. #53 did not
//    move any of them and the reconciliation must not either.
// ---------------------------------------------------------------------------

console.log("\n2. the current commercial artifacts are still exact");
const approval = json(
  "data/rcap-grade-a/legal-decisions/OWNER_CURRENT_COMMERCIAL_ARTIFACT_APPROVAL_2026-09-20.json"
);
const approved = approval.approvedArtifacts ?? [];
ok("the approval still carries all 18 approved artifacts", approved.length === 18, approved.length);
const moved = [];
const missing = [];
for (const entry of approved) {
  if (!fs.existsSync(entry.path)) { missing.push(entry.path); continue; }
  if (sha(entry.path) !== entry.sha256) moved.push(entry.artifactId ? `${entry.routeId}/${entry.artifactId}` : entry.path);
}
ok("every approved current-commercial artifact is present", missing.length === 0, missing.slice(0, 5));
ok("every approved current-commercial artifact hashes to its approved value",
  moved.length === 0, moved.slice(0, 5));

// ---------------------------------------------------------------------------
// 3. The two routes #53 broke are evidence producers, and must stay declared as
//    such. This is the anti-cheat that matters most: flipping a flag would make
//    the authority verifier green by reclassifying the thing it was checking.
// ---------------------------------------------------------------------------

console.log("\n3. no binding was reclassified to dodge the check");
const registry = json("data/rcap-grade-a/fulfillment-authority-registry.json");
const records = registry.records ?? [];
const byRoute = new Map();
for (const record of records) {
  const routeId = record.routeId ?? record.route;
  const artifact = record.packetCompleteness?.filingFormatArtifact;
  if (routeId && artifact) byRoute.set(routeId, artifact);
}

// The two #53 failures. Their filing-format artifacts are noncommercial evidence
// producers, which is exactly why a narrow reconciliation is the right shape.
for (const routeId of [
  "MS:additional-justice-court-misdemeanor-relief-9-11-15-3",
  "WY:felony-conviction-expungement-w-s-7-13-1502"
]) {
  const artifact = byRoute.get(routeId);
  ok(`${routeId.split(":")[0]} affected route still declares a filing-format artifact`, Boolean(artifact));
  ok(`${routeId.split(":")[0]} affected artifact is still isCurrentCommercialArtifact false`,
    artifact?.isCurrentCommercialArtifact === false, artifact?.isCurrentCommercialArtifact);
}

// The converse. The one binding that IS current commercial output must not be
// quietly downgraded to false to make a failing check stop applying to it.
const msNonConviction = [...byRoute.entries()]
  .find(([routeId]) => routeId.startsWith("MS:non-conviction-expungement"));
ok("the MS non-conviction binding is still declared current commercial output",
  msNonConviction?.[1]?.isCurrentCommercialArtifact === true,
  msNonConviction?.[1]?.isCurrentCommercialArtifact);
ok("and its filing-format digest is unmoved",
  msNonConviction?.[1]?.sha256 === "9bbe447c8c3eb5ac3967bdbe308a1f19e07a711b21d9b1106f9bcef92dbb4dfd",
  msNonConviction?.[1]?.sha256);

const flagged = records
  .map((record) => record.packetCompleteness?.filingFormatArtifact)
  .filter((artifact) => artifact && "isCurrentCommercialArtifact" in artifact);
ok("the count of current-commercial declarations is unchanged (1 true, 6 false)",
  flagged.filter((a) => a.isCurrentCommercialArtifact === true).length === 1
  && flagged.filter((a) => a.isCurrentCommercialArtifact === false).length === 6,
  { true: flagged.filter((a) => a.isCurrentCommercialArtifact === true).length,
    false: flagged.filter((a) => a.isCurrentCommercialArtifact === false).length });

// ---------------------------------------------------------------------------
// 4. #53 itself is still present. The reconciliation is a narrowing, not a
//    retreat: the shared footer correction has to survive it.
// ---------------------------------------------------------------------------

console.log("\n4. the #53 correction itself survives the reconciliation");
const helper = "scripts/rcap-custom-pleading/court-facing-rows.mjs";
ok("the shared court-facing row helper still exists", fs.existsSync(helper));
const helperText = fs.existsSync(helper) ? fs.readFileSync(helper, "utf8") : "";
// Assert the predicate the correction actually depends on, not merely that the
// string "Route:" survives somewhere in the file.
ok("it still matches the internal route footer on an anchored obligation pattern",
  helperText.includes("^\\s*_?Route:\\s*obligation:\\S"),
  helperText.match(/\/\^[^/]*\//)?.[0] ?? null);
ok("it still preserves the wrapped row count rather than deleting rows",
  helperText.includes("rows.map(() => \" \")"), true);

console.log("");
if (failures > 0) {
  console.log(`REVIEW GATE — ${failures} of ${checks} checks failed. Do not integrate the reconciliation.`);
  process.exit(1);
}
console.log(`${checks}/${checks} checks passed.`);
console.log("The reconciliation moved nothing it was forbidden to move.");
console.log("This gate does not judge the evidence-producer identity it binds — review that separately.");
