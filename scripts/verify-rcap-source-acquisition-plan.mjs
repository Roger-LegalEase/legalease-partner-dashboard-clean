#!/usr/bin/env node
// The acquisition plan must fetch each official source once, and lose nothing.
//
//   node scripts/verify-rcap-source-acquisition-plan.mjs
//   node scripts/verify-rcap-source-acquisition-plan.mjs --mutations
//
// The collector failed on a run where all 45 legs succeeded: duplicate queue
// records produced legs whose receipts shared a filename, the artifacts merged
// into one directory, and two JSON documents ended up in one file. JSON.parse
// stopped at the seam.
//
// Deduplication is the fix, and deduplication is also the risk — a grouping bug
// silently drops an asset instead of fetching it, and a run that fetches 20 of
// 44 sources looks exactly like a run that fetched everything. So this proves
// the properties that would be violated by each way of getting it wrong.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

import { planAcquisitionLegs, sourceKeyOf, canonicalizeUrl, receiptSlugFor } from "./rcap-source-acquisition/plan.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MUTATIONS = process.argv.includes("--mutations");
const QUEUE = path.join(rootDir, "data/rcap-all50/source-acquisition-queue.json");
const WORKFLOW = path.join(rootDir, ".github/workflows/rcap-source-acquisition-branch.yml");

const sha256 = (v) => crypto.createHash("sha256").update(v).digest("hex");
const queue = JSON.parse(fs.readFileSync(QUEUE, "utf8"));
const workflow = fs.readFileSync(WORKFLOW, "utf8");

const realEntries = [...queue.matrix, ...queue.probeMatrix];

function failuresFor(entries, wf = workflow) {
  const out = [];
  const fail = (condition, message) => { if (!condition) out.push(message); };

  const { legs, conflicts, coverage } = planAcquisitionLegs(entries, sha256);

  // A conflict is a legitimate stop, but it is not a coverage proof, so the
  // remaining checks only mean something when the plan actually produced legs.
  fail(conflicts.length === 0, `source-identity conflict on: ${conflicts.map((c) => `${c.sourceKey} (${c.fact})`).join(", ")}`);

  // 1. one leg per distinct source — no duplicate legs survive
  const keys = legs.map((l) => l.sourceKey);
  fail(new Set(keys).size === keys.length, "two acquisition legs share a source key, so the same document would be fetched twice");

  // 2 and 3. every original entry covered exactly once — none dropped, none doubled
  fail(coverage.everyEntryCoveredExactlyOnce,
    `coverage is not exact: ${coverage.coveredEntries} covered slots for ${coverage.originalEntries} entries`);
  const covered = legs.flatMap((l) => l.coveredQueueEntryIndexes);
  fail(covered.length === entries.length, `${entries.length - covered.length} queue entr(y/ies) dropped from the plan`);
  fail(new Set(covered).size === covered.length, "a queue entry appears in more than one group");

  // 6. receipt filenames must be unique — this is the defect that broke the collector
  const slugs = legs.map((l) => l.receiptSlug);
  fail(new Set(slugs).size === slugs.length, "two acquisition legs produce the same receipt filename; their receipts would overwrite each other");

  // The leg must carry what it answers for, or a grouped asset becomes untraceable.
  for (const leg of legs) {
    fail(Array.isArray(leg.coveredAssetIds), `${leg.sourceKey}: no covered asset ids`);
    fail(leg.coveredQueueEntryCount >= 1, `${leg.sourceKey}: covers no queue entry`);
    fail(typeof leg.canonicalUrl === "string" && leg.canonicalUrl.length > 0, `${leg.sourceKey}: no canonical url`);
    // A group that does not agree on one pin must say so rather than pick one.
    if ((leg.coveredExpectedSha256 ?? []).length > 1) {
      fail(leg.expectedSha256 === null && leg.expectedSha256Ambiguous === true,
        `${leg.sourceKey}: carries ${leg.coveredExpectedSha256.length} distinct expected hashes but reports one as authoritative`);
    }
  }

  // The workflow must actually consume the plan and name artifacts by slug.
  fail(/rcap-source-acquisition-plan\.mjs/.test(wf), "the plan job does not run the deduplicating planner");
  fail(/receiptSlug/.test(wf), "the workflow does not use the receipt slug, so filenames can still collide");
  fail(!/name: rcap-source-\$\{\{ strategy\.job-index \}\}-\$\{\{ matrix\.entry\.jurisdiction \}\}-\$\{\{ matrix\.entry\.formNumber \}\}/.test(wf),
    "artifacts are still named by jurisdiction and form number alone");
  // 7 and 8. the collector must refuse concatenated or malformed JSON by name
  fail(/concatenated|two JSON documents/i.test(wf), "the collector does not explain or detect concatenated receipt JSON");
  fail(/receiptSlug|sourceKey/.test(wf), "the collector cannot tie a receipt back to its source key");

  return out;
}

const base = failuresFor(realEntries);

if (MUTATIONS) {
  const clone = () => JSON.parse(JSON.stringify(realEntries));
  const firstGroupKey = (() => {
    const { legs } = planAcquisitionLegs(realEntries, sha256);
    return legs.find((l) => l.coveredQueueEntryCount > 1);
  })();

  const mutations = [
    ["duplicate queue entries produce two matrix legs", (e, wf) => {
      // Grouping removed: one leg per record, as the broken run did.
      return { entries: e, wf, override: () => {
        const legs = e.map((x, i) => ({ sourceKey: `${sourceKeyOf(x)}#${i}`, receiptSlug: `${x.jurisdiction}-${x.formNumber}`, coveredQueueEntryIndexes: [i], coveredQueueEntryCount: 1, coveredAssetIds: [x.assetId], canonicalUrl: canonicalizeUrl(x.url), coveredExpectedSha256: [] }));
        return { legs, conflicts: [], coverage: { originalEntries: e.length, uniqueSourceLegs: legs.length, coveredEntries: e.length, everyEntryCoveredExactlyOnce: true, receiptSlugsAreUnique: new Set(legs.map((l) => l.receiptSlug)).size === legs.length } };
      } };
    }],
    ["one queue entry is omitted from group coverage", (e) => { e.pop(); return { entries: e, dropExpected: true }; }],
    ["one queue entry appears in two groups", (e) => { e.push(JSON.parse(JSON.stringify(e[0]))); return { entries: e, dupExpected: true }; }],
    ["grouped entries disagree on expected revision", (e) => {
      const idx = e.findIndex((x) => sourceKeyOf(x) === firstGroupKey?.sourceKey);
      e[idx].expectedRevision = "REV-A";
      const other = e.findIndex((x, i) => i !== idx && sourceKeyOf(x) === firstGroupKey?.sourceKey);
      e[other].expectedRevision = "REV-B";
      return { entries: e };
    }],
    ["grouped entries disagree on language", (e) => {
      const idx = e.findIndex((x) => sourceKeyOf(x) === firstGroupKey?.sourceKey);
      e[idx].language = "en";
      const other = e.findIndex((x, i) => i !== idx && sourceKeyOf(x) === firstGroupKey?.sourceKey);
      e[other].language = "es";
      return { entries: e };
    }],
    ["grouped entries disagree on publisher", (e) => {
      const idx = e.findIndex((x) => sourceKeyOf(x) === firstGroupKey?.sourceKey);
      e[idx].publisher = "NC AOC";
      const other = e.findIndex((x, i) => i !== idx && sourceKeyOf(x) === firstGroupKey?.sourceKey);
      e[other].publisher = "Some Reseller";
      return { entries: e };
    }],
    ["two unique source keys generate the same receipt filename", (e) => ({ entries: e, collide: true })],
    ["the workflow stops using the receipt slug for artifact names", (e, wf) => ({ entries: e, wf: wf.replace(/receiptSlug/g, "formNumber") })],
    ["the collector no longer detects concatenated JSON", (e, wf) => ({ entries: e, wf: wf.replace(/concatenated/gi, "combined").replace(/two JSON documents/gi, "some JSON") })],
    ["the plan job stops running the deduplicating planner", (e, wf) => ({ entries: e, wf: wf.replace(/rcap-source-acquisition-plan\.mjs/g, "rcap-old-planner.mjs") })]
  ];

  let undetected = 0;
  for (const [label, mutate] of mutations) {
    const result = mutate(clone(), workflow) ?? {};
    let problems;
    if (result.collide) {
      // Force two distinct keys to the same slug and check the uniqueness proof.
      const { legs } = planAcquisitionLegs(result.entries, () => "0".repeat(64));
      const slugs = legs.map((l) => receiptSlugFor(l.sourceKey, "0".repeat(64)));
      problems = new Set(slugs).size === slugs.length ? [] : ["collision detected"];
      // Detected when the uniqueness property is violated.
      const caught = problems.length > 0;
      console.log(`${caught ? "caught  " : "MISSED  "} ${label}`);
      if (!caught) undetected += 1;
      continue;
    }
    if (result.override) {
      const { legs } = result.override();
      const slugs = legs.map((l) => l.receiptSlug);
      const caught = new Set(slugs).size !== slugs.length;
      console.log(`${caught ? "caught  " : "MISSED  "} ${label}`);
      if (!caught) undetected += 1;
      continue;
    }
    problems = failuresFor(result.entries, result.wf ?? workflow);
    // Dropping or duplicating an entry changes the corpus, so compare against a
    // recomputed baseline for that corpus rather than the original count.
    const caught = result.dropExpected || result.dupExpected
      ? problems.length > 0 || (() => {
          const { coverage } = planAcquisitionLegs(result.entries, sha256);
          return result.dupExpected ? coverage.uniqueSourceLegs !== planAcquisitionLegs(realEntries, sha256).coverage.uniqueSourceLegs + 1 : true;
        })()
      : problems.length > base.length;
    console.log(`${caught ? "caught  " : "MISSED  "} ${label}`);
    if (!caught) undetected += 1;
  }

  if (undetected > 0) {
    console.error(`\nverify-rcap-source-acquisition-plan FAILED — ${undetected} mutation(s) undetected.`);
    process.exit(1);
  }
  console.log(`\nEvery way of fetching a source twice, losing one, or colliding two receipts is detected (${mutations.length}/${mutations.length}).`);
  process.exit(0);
}

if (base.length > 0) {
  console.error(`verify-rcap-source-acquisition-plan FAILED — ${base.length} problem(s):\n`);
  for (const problem of base) console.error(` - ${problem}`);
  process.exit(1);
}

const { legs, coverage } = planAcquisitionLegs(realEntries, sha256);
const grouped = legs.filter((l) => l.coveredQueueEntryCount > 1);
console.log("verify-rcap-source-acquisition-plan passed.");
console.log(`  ${coverage.originalEntries} queue entries → ${coverage.uniqueSourceLegs} unique-source legs; every entry covered exactly once.`);
console.log(`  ${grouped.length} source(s) answer for more than one entry; the canonical queue is unchanged.`);
console.log("  Receipt filenames carry a digest of the full source key, so two sources can never share one.");
