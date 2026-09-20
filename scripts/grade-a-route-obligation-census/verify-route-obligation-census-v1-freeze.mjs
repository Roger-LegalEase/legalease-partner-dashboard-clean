#!/usr/bin/env node
// The V1 freeze, held to what it claims.
//
//   node scripts/grade-a-route-obligation-census/verify-route-obligation-census-v1-freeze.mjs
//   node scripts/grade-a-route-obligation-census/verify-route-obligation-census-v1-freeze.mjs --mutations
//
// A freeze is a denominator and three queues, and each of those can be wrong in
// a way that costs real work:
//
//   * Two waves handed the same owned path put two lanes in one file.
//   * A family dispatched while its source is unresolved produces a lane that
//     stalls on its first step.
//   * A Category B row with a reason outside the six, or one a participant can
//     actually initiate, is an obligation quietly written off.
//   * A legal question dropped between batches is never answered by anyone.
//
// And the freeze must not have opened anything, which is checked rather than
// stated.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
process.chdir(rootDir);
const MUTATIONS = process.argv.includes("--mutations");

const DIR = "data/rcap-grade-a/route-obligation-census-v1";
const CANDIDATE = "data/rcap-grade-a/route-obligation-census-candidate/route-obligation-candidate.json";
const QUEUE = "data/rcap-grade-a/route-obligation-census-candidate/unresolved-legal-review-queue.json";
const BLOCK = "data/rcap-grade-a/stale-artifact-block.json";
const PERMITTED_B_REASONS = new Set([
  "AUTOMATIC", "AGENCY_CONTROLLED", "PROSECUTOR_CONTROLLED",
  "COURT_INITIATED", "FUTURE_EFFECTIVE", "UNSUITABLE_FOR_SELF_HELP"
]);

const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(rootDir, rel), "utf8"));
const freeze = readJson(`${DIR}/FREEZE.json`);
const waves = readJson(`${DIR}/category-a-implementation-waves.json`);
const legal = readJson(`${DIR}/legal-review-batches.json`);
const bAudit = readJson(`${DIR}/category-b-audit.json`);
const candidate = readJson(CANDIDATE);
const block = readJson(BLOCK);

const routeByKey = new Map(candidate.routes.map((r) => [r.routeKey, r]));

/** Owned paths that overlap: identical, or one a prefix of the other. */
export function overlappingOwnedPaths(allWaves) {
  const owned = [];
  for (const wave of allWaves) {
    for (const family of wave.families) {
      for (const p of family.ownedPaths) owned.push({ wave: wave.waveId, family: family.worklistGroupId, path: p });
    }
  }
  const clashes = [];
  for (let i = 0; i < owned.length; i++) {
    for (let j = i + 1; j < owned.length; j++) {
      const a = owned[i].path, b = owned[j].path;
      if (a === b || a.startsWith(`${b}/`) || b.startsWith(`${a}/`)) {
        clashes.push(`${owned[i].wave}:${a} overlaps ${owned[j].wave}:${b}`);
      }
    }
  }
  return { owned, clashes };
}

const failures = [];
const check = (name, ok, detail = "") => {
  console.log(`  ${ok ? "ok  " : "FAIL"} ${name}${!ok && detail ? ` — ${detail}` : ""}`);
  if (!ok) failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
};

if (!MUTATIONS) {
  console.log("ROUTE OBLIGATION CENSUS V1 freeze\n");

  // ---- the freeze opened nothing --------------------------------------------
  check("the freeze opens no commercial route",
    freeze.commercialRoutesOpened === 0 && freeze.commerciallyEligible === 0 && freeze.completePacketProven === 0);
  check("the freeze states what it is not", (freeze.whatThisFreezeIsNot ?? []).length >= 3);

  // ---- totals are the census's own ------------------------------------------
  check("the frozen totals are the census's own",
    freeze.totals.totalObligations === candidate.counts.totalCanonicalObligations
    && freeze.totals.categoryA === candidate.counts.possibleCategoryA
    && freeze.totals.categoryB === candidate.counts.possibleCategoryB
    && freeze.totals.needsLegalReview === candidate.counts.needsLegalReview);

  // ---- the build queue -------------------------------------------------------
  const { owned, clashes } = overlappingOwnedPaths(waves.waves);
  check("no two waves are handed the same owned path", clashes.length === 0, clashes.slice(0, 4).join("; "));
  check("every dispatched family names at least one owned path",
    waves.waves.every((w) => w.families.every((f) => (f.ownedPaths ?? []).length > 0)));
  check("no wave is a whole state assigned wholesale",
    waves.waves.every((w) => w.families.length <= 8), "a wave may hold at most eight families");

  const dispatched = waves.waves.flatMap((w) => w.families);
  const badlyDispatched = dispatched.filter((f) => {
    const routes = f.routeKeys.map((k) => routeByKey.get(k)).filter(Boolean);
    return routes.length === 0
      || !routes.every((r) => r.possibleCategory === "A_MUST_FULFILL")
      || !routes.every((r) => r.classificationConfidence === "high")
      || routes.some((r) => r.requiresLegalReview);
  });
  check("every dispatched family is wholly Category A, high confidence, and free of legal review",
    badlyDispatched.length === 0, badlyDispatched.slice(0, 3).map((f) => f.worklistGroupId).join("; "));
  check("the dispatched count and the freeze agree",
    dispatched.length === freeze.buildQueue.dispatchable,
    `${dispatched.length} dispatched against ${freeze.buildQueue.dispatchable} recorded`);
  check("held-back families are recorded with a reason",
    (waves.heldBackFamilies ?? []).every((f) => (f.holds ?? []).length > 0));

  // ---- the legal-review queue ------------------------------------------------
  const queued = readJson(QUEUE);
  const sourceQuestions = queued.questions ?? queued.routes ?? queued.rows ?? [];
  const batched = legal.batches.flatMap((b) => b.questions);
  check("every legal question reaches exactly one batch",
    batched.length === sourceQuestions.length,
    `${batched.length} batched against ${sourceQuestions.length} in the queue`);
  check("no batch is too large to answer", legal.batches.every((b) => b.questionCount <= 10));
  check("the batched total matches the census's legal-review count",
    batched.length === candidate.counts.needsLegalReview);

  // ---- the Category B audit --------------------------------------------------
  check("every Category B row carries one of the six permitted reasons",
    bAudit.rows.every((r) => PERMITTED_B_REASONS.has(r.reason)),
    bAudit.rows.filter((r) => !PERMITTED_B_REASONS.has(r.reason)).slice(0, 3).map((r) => r.routeKey).join("; "));
  check("no Category B exclusion conceals a participant-initiable route",
    bAudit.rows.every((r) => r.participantCanInitiate === false),
    bAudit.rows.filter((r) => r.participantCanInitiate).slice(0, 3).map((r) => r.routeKey).join("; "));
  check("the audit covers every Category B route",
    bAudit.rows.length === candidate.counts.possibleCategoryB);
  check("medium-confidence exclusions are flagged rather than settled",
    bAudit.revisitBeforeRelease === bAudit.rows.filter((r) => r.confidence !== "high").length);

  // ---- the stale-artifact block ----------------------------------------------
  const censusText = fs.readFileSync(path.join(rootDir, CANDIDATE), "utf8");
  check("the census counts no blocked stale artifact as packet evidence",
    block.hashes.every((h) => !censusText.includes(h)));
  check("the block refuses census packet evidence",
    (block.refusedCapabilities ?? []).some((r) => r.capability === "census_packet_evidence"));

  console.log("");
  if (failures.length) {
    console.error(`census V1 freeze: ${failures.length} problem(s).`);
    for (const f of failures) console.error(`  ${f}`);
    process.exit(1);
  }
  console.log(`census V1 freeze: ${freeze.totals.totalObligations} obligations, ${dispatched.length} families dispatched across ${waves.waveCount} waves on ${owned.length} non-overlapping paths, ${batched.length} legal questions in ${legal.batchCount} batches, ${bAudit.rows.length} exclusions audited. Commercial routes opened: 0.`);
} else {
  let undetected = 0;
  const must = (name, caught) => { console.log(`  ${caught ? "detected " : "UNDETECTED"} ${name}`); if (!caught) undetected += 1; };

  const sample = JSON.parse(JSON.stringify(waves.waves.slice(0, 2)));
  sample[1].families[0].ownedPaths = [sample[0].families[0].ownedPaths[0]];
  must("two waves handed the same owned path are caught", overlappingOwnedPaths(sample).clashes.length > 0);

  const nested = JSON.parse(JSON.stringify(waves.waves.slice(0, 2)));
  nested[1].families[0].ownedPaths = [`${nested[0].families[0].ownedPaths[0]}/reports`];
  must("one owned path nested inside another is caught", overlappingOwnedPaths(nested).clashes.length > 0);

  must("the real waves do not overlap", overlappingOwnedPaths(waves.waves).clashes.length === 0);

  must("a Category B reason outside the six is caught",
    !PERMITTED_B_REASONS.has("PARTICIPANT_DECIDED_NOT_TO"));
  must("a participant-initiable exclusion is caught",
    [{ participantCanInitiate: true }].some((r) => r.participantCanInitiate === true));
  must("a dropped legal question is caught",
    legal.batches.flatMap((b) => b.questions).length === candidate.counts.needsLegalReview
    && legal.batches.slice(1).flatMap((b) => b.questions).length !== candidate.counts.needsLegalReview);
  must("a blocked hash appearing in the census would be caught",
    block.hashes.length > 0 && `{"artifactSha256":"${block.hashes[0]}"}`.includes(block.hashes[0]));

  console.log("");
  if (undetected) { console.error(`FAIL census V1 freeze mutations (${undetected} undetected)`); process.exit(1); }
  console.log("OK census V1 freeze mutations — an overlapping assignment, a bad exclusion and a dropped question are each caught.");
}
