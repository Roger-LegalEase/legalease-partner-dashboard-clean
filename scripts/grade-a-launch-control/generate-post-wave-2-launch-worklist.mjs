#!/usr/bin/env node
/**
 * POST_WAVE_2_NATIONAL_LAUNCH_WORKLIST — every family, its whole chain, frozen.
 *
 *   node scripts/grade-a-launch-control/generate-post-wave-2-launch-worklist.mjs [--check]
 *
 * The chain a family must complete before it can launch has five links: a bound
 * official source, a built artifact, independent verification, output approval,
 * and product-path proof. A family is launch-ready only when it holds all five,
 * and the worklist names the first link it is missing rather than a status word.
 *
 * The freeze at the end is the same instrument as the census freeze: input
 * digests plus a content hash, so a later reader can tell whether the worklist
 * they are holding is the one that was frozen.
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
process.chdir(ROOT);
const CHECK = process.argv.includes("--check");
const read = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
const sha = (p) => crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex");

const INPUTS = [
  "data/rcap-grade-a/route-obligation-census-v1/COMPLETION_SCOREBOARD.json",
  "data/rcap-grade-a/route-obligation-census-v1/FREEZE.json",
  "data/rcap-grade-a/launch-control/WAVE_2_VERIFICATION_LEDGER.json",
  "data/rcap-grade-a/launch-control/LAWRENCE_REVIEW_BATCH_1.json",
  "data/rcap-grade-a/launch-control/WAVE_2_REPAIR_ASSIGNMENTS.json",
  "data/rcap-grade-a/launch-control/WAVE_2_LEGAL_INPUT_ASSIGNMENTS.json",
  "data/rcap-grade-a/fulfillment-authority-projection.json"
];
const scoreboard = read(INPUTS[0]);
const freeze = read(INPUTS[1]);
const ledger = read(INPUTS[2]);
const projection = read(INPUTS[6]);

const verdictByFamily = new Map(ledger.rows.map((r) => [r.family, r]));

/*
 * A built artifact is counted from the tree, never from a status field. The
 * evidence is reports/rendered-artifacts.json: that is the file the verification
 * shards read the canonical and boundary hashes out of. packet-evidence.json is
 * a California-only extra, and using it as the test would have reported two
 * families that passed verification as unbuilt.
 */
const OVERLAYS = "data/rcap-all50/overlays/census-v1";
const builtByFamily = new Map();
for (const st of fs.readdirSync(OVERLAYS)) {
  const dir = path.join(OVERLAYS, st);
  if (!fs.statSync(dir).isDirectory()) continue;
  for (const d of fs.readdirSync(dir)) {
    if (!fs.existsSync(path.join(dir, d, "reports/rendered-artifacts.json"))) continue;
    /*
     * The directory name is hyphenated and the family id is not, so parsing the
     * name mis-joins most families. Each overlay states its own familyId in its
     * receipt or its wiring record; read it there and fall back to the name only
     * when neither exists.
     */
    let familyId = null;
    for (const f of ["source-receipt.json", "product-wiring.json"]) {
      const full = path.join(dir, d, f);
      if (!familyId && fs.existsSync(full)) familyId = read(full).familyId ?? null;
    }
    builtByFamily.set(familyId ?? d.replace(/--(official-pdf-fill|custom-pleading)$/, ""), path.posix.join(OVERLAYS, st, d));
  }
}

/* A family's identity in the scoreboard is its worklist group; the verification
 * ledger keys by packet-family id. Join on the family id where the group names
 * one, so a family is not counted twice under two names. */
const familyIdOf = (row) => {
  const g = row.worklistGroupId ?? "";
  const tail = g.split(":").pop();
  return tail && (builtByFamily.has(tail) || verdictByFamily.has(tail)) ? tail : g;
};

const LINKS = ["source_bound", "artifact_built", "independently_verified", "output_approved", "product_path_proven"];
const hasHold = (f, k) => (f.holds ?? []).some((h) => h.kind === k);

const families = scoreboard.familiesDetail.map((f) => {
  const id = familyIdOf(f);
  const v = verdictByFamily.get(id) ?? null;
  const chain = {
    source_bound: !hasHold(f, "missing_source"),
    artifact_built: builtByFamily.has(id),
    independently_verified: v?.verdict === "PASS",
    output_approved: !hasHold(f, "missing_output_approval"),
    product_path_proven: false
  };
  const firstMissing = LINKS.find((l) => !chain[l]) ?? null;
  return {
    familyId: id,
    worklistGroupId: f.worklistGroupId,
    jurisdictions: f.jurisdictions,
    implementationStrategy: f.implementationStrategy,
    sourceCustody: f.sourceCustody,
    chain,
    linksHeld: LINKS.filter((l) => chain[l]).length,
    firstMissingLink: firstMissing,
    launchReady: firstMissing === null,
    verification: v ? { verdict: v.verdict, shard: v.shard, decisiveObligation: v.decisiveObligation, nextOwner: v.requiredNextOwner } : { verdict: "NOT_YET_VERIFIED", shard: null },
    nextOwner: v?.requiredNextOwner ?? (firstMissing === "source_bound" ? "source acquisition" : firstMissing === "artifact_built" ? "packet build lane" : "verification shard"),
    commercialState: "CLOSED"
  };
});

const countBy = (key) => families.reduce((acc, f) => ({ ...acc, [f[key] ?? "none"]: (acc[f[key] ?? "none"] ?? 0) + 1 }), {});

const worklist = {
  schemaVersion: "rcap-grade-a-post-wave-2-national-launch-worklist/v1",
  generatedBy: "scripts/grade-a-launch-control/generate-post-wave-2-launch-worklist.mjs",
  question: "For every packet family in the national build, what is the first thing standing between it and launch?",
  theChain: {
    links: LINKS,
    rule: "A family launches only when it holds all five. The links are ordered: verifying an unbuilt artifact and approving an unverified one are both category errors, so the worklist names the first missing link and routes to that owner alone."
  },
  atCaptainHead: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  censusDenominator: { obligations: freeze.totals.totalObligations, categoryA: freeze.totals.categoryA, packetFamilies: freeze.totals.packetFamilies },
  counts: {
    families: families.length,
    launchReady: families.filter((f) => f.launchReady).length,
    sourceBound: families.filter((f) => f.chain.source_bound).length,
    artifactBuilt: families.filter((f) => f.chain.artifact_built).length,
    independentlyVerified: families.filter((f) => f.chain.independently_verified).length,
    outputApproved: families.filter((f) => f.chain.output_approved).length,
    productPathProven: families.filter((f) => f.chain.product_path_proven).length,
    byFirstMissingLink: countBy("firstMissingLink"),
    byVerificationVerdict: families.reduce((acc, f) => ({ ...acc, [f.verification.verdict]: (acc[f.verification.verdict] ?? 0) + 1 }), {})
  },
  dispatchedWork: {
    lawrenceReviewBatch1: read(INPUTS[3]).count,
    repairAssignments: read(INPUTS[4]).count,
    legalInputAssignments: read(INPUTS[5]).count,
    legalInputToLawrence: read(INPUTS[5]).toLawrence
  },
  commercial: {
    commercialRoutesOpened: 0,
    completePacketProven: projection.counters.completePacketProven,
    commerciallyEligible: projection.counters.commerciallyEligible,
    rule: "COMPLETE_PACKET_PROVEN counts families holding PASS and output approval and product-path proof. No family holds all three, so it is 0 and the launch gate is CLOSED."
  },
  launchGate: { open: families.some((f) => f.launchReady), why: "No family holds all five links: independent verification stands at four and product-path proof at zero." },
  families
};

if (!CHECK) fs.writeFileSync("data/rcap-grade-a/launch-control/POST_WAVE_2_NATIONAL_LAUNCH_WORKLIST.json", `${JSON.stringify(worklist, null, 2)}\n`);

const frozen = {
  schemaVersion: "rcap-grade-a-post-wave-2-launch-worklist-freeze/v1",
  frozenAs: "POST WAVE 2 NATIONAL LAUNCH WORKLIST",
  frozenAtHead: worklist.atCaptainHead,
  worklist: "data/rcap-grade-a/launch-control/POST_WAVE_2_NATIONAL_LAUNCH_WORKLIST.json",
  worklistSha256: CHECK ? null : sha("data/rcap-grade-a/launch-control/POST_WAVE_2_NATIONAL_LAUNCH_WORKLIST.json"),
  inputDigests: Object.fromEntries(INPUTS.map((f) => [f, sha(f)])),
  whatThisFreezeIs: [
    "A launch denominator: every packet family and the first link it is missing.",
    "A dispatch basis: repair, legal-input and review queues that name their own owner."
  ],
  whatThisFreezeIsNot: [
    "It is not an approval and creates no fulfillment record.",
    "It opens no commercial route and grants no runtime authority.",
    "A PASS in it proves a packet was verified, not that it may be sold."
  ],
  totals: worklist.counts,
  commercialRoutesOpened: 0,
  completePacketProven: projection.counters.completePacketProven,
  launchGate: "CLOSED"
};
if (!CHECK) fs.writeFileSync("data/rcap-grade-a/launch-control/POST_WAVE_2_NATIONAL_LAUNCH_WORKLIST_FREEZE.json", `${JSON.stringify(frozen, null, 2)}\n`);

console.log(`worklist: ${worklist.counts.families} families`);
console.log(`  source bound ${worklist.counts.sourceBound} · built ${worklist.counts.artifactBuilt} · verified ${worklist.counts.independentlyVerified} · approved ${worklist.counts.outputApproved} · product-path ${worklist.counts.productPathProven}`);
console.log(`  first missing link: ${JSON.stringify(worklist.counts.byFirstMissingLink)}`);
console.log(`  launch-ready ${worklist.counts.launchReady} · gate ${frozen.launchGate}`);
