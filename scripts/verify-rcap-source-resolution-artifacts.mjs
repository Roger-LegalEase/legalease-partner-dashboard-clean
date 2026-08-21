#!/usr/bin/env node
// The drift comparison and the archive reconciliation must still be true of the
// queue they describe.
//
//   node scripts/verify-rcap-source-resolution-artifacts.mjs
//
// Both artifacts are joins over data/rcap-all50/source-acquisition-queue.json.
// A queue that gains, loses or repins a row silently invalidates them, and the
// way that failure presents is the dangerous one: a stale report that still
// parses, still totals, and still reads as though someone checked.
//
// So this proves the artifacts are what their generators produce from the
// committed queue, and that they say something about every row rather than
// about the rows that happened to join.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => JSON.parse(fs.readFileSync(path.join(rootDir, file), "utf8"));

const queue = read("data/rcap-all50/source-acquisition-queue.json");
const drift = read("data/rcap-all50/source-drift-comparison.json");
const reconciliation = read("data/rcap-all50/archive-reconciliation.json");
const observed = read("data/rcap-all50/source-observation-log.json");

const failures = [];
const fail = (message) => failures.push(message);

// 1. Both artifacts are reproducible from the committed inputs.
for (const script of ["scripts/rcap-source-drift-compare.mjs", "scripts/rcap-archive-reconciliation.mjs"]) {
  try {
    execFileSync(process.execPath, [path.join(rootDir, script), "--check"], { stdio: "pipe" });
  } catch (error) {
    fail(`${script} --check failed: ${String(error.stderr ?? error.message).trim().split("\n")[0]}`);
  }
}

// 2. Every queue row is accounted for in both, exactly once.
const queueAssetIds = Object.values(queue.sets ?? {}).flat().map((entry) => entry.assetId);
for (const [name, artifact] of [["drift comparison", drift], ["archive reconciliation", reconciliation]]) {
  const ids = artifact.assets.map((row) => row.assetId);
  if (ids.length !== queueAssetIds.length) fail(`the ${name} covers ${ids.length} rows for ${queueAssetIds.length} queue rows`);
  if (new Set(ids).size !== ids.length) fail(`the ${name} lists an asset twice`);
  const missing = queueAssetIds.filter((id) => !ids.includes(id));
  if (missing.length > 0) fail(`the ${name} says nothing about ${missing.length} queue row(s), starting with ${missing[0]}`);
}

// 3. Every verdict and every route is one of the declared kinds. A typo would
//    otherwise become a silent new category that no total counts.
for (const row of drift.assets) {
  if (!(row.verdict in drift.verdictVocabulary)) fail(`${row.assetId} carries verdict ${row.verdict}, which is not in the vocabulary`);
}
for (const row of reconciliation.assets) {
  if (!(row.acquisitionRoute in reconciliation.routeVocabulary)) fail(`${row.assetId} carries route ${row.acquisitionRoute}, which is not in the vocabulary`);
}

// 4. The totals are the rows, not a number someone typed.
const tally = (rows, key) => rows.reduce((acc, row) => ({ ...acc, [row[key]]: (acc[row[key]] ?? 0) + 1 }), {});
for (const [verdict, count] of Object.entries(tally(drift.assets, "verdict"))) {
  if (drift.totals[verdict] !== count) fail(`the drift comparison totals ${verdict} as ${drift.totals[verdict]}, but ${count} rows carry it`);
}
for (const [route, count] of Object.entries(tally(reconciliation.assets, "acquisitionRoute"))) {
  if (reconciliation.totals[route] !== count) fail(`the reconciliation totals ${route} as ${reconciliation.totals[route]}, but ${count} rows carry it`);
}

// 5. A live witness must be a real observation of the pinned bytes. This is the
//    claim that would matter most if it were wrong: it is the only thing in
//    either artifact that says an issuing body was actually reached.
const acquiredHashes = new Set(
  observed.observations.filter((o) => o.outcome === "acquired" && o.observedSha256).map((o) => o.observedSha256)
);
for (const row of drift.assets) {
  if (row.verdict !== "pin_confirmed_live") continue;
  if (!acquiredHashes.has(String(row.pinnedHistoricalSha256).toLowerCase())) {
    fail(`${row.assetId} claims a live confirmation for bytes no recorded observation acquired`);
  }
  if (row.witnesses.live?.agrees !== true) fail(`${row.assetId} is confirmed live but carries no agreeing live witness`);
}

// 6. A contradiction must show both byte strings, or it is an accusation with
//    no evidence attached.
for (const row of drift.assets) {
  if (row.verdict !== "pin_contradicted_live") continue;
  const served = row.witnesses.live?.observed ?? [];
  if (served.length === 0) fail(`${row.assetId} is reported as contradicted but names nothing that was served instead`);
  if (served.some((o) => o.sha256 === row.pinnedHistoricalSha256)) fail(`${row.assetId} is reported as contradicted by its own pinned bytes`);
}

// 7. The two artifacts must not disagree about which assets were seen live.
const liveInDrift = new Set(drift.assets.filter((r) => r.verdict === "pin_confirmed_live").map((r) => r.assetId));
const liveInReconciliation = new Set(reconciliation.assets.filter((r) => r.acquisitionRoute === "already_observed_live").map((r) => r.assetId));
for (const id of liveInDrift) {
  if (!liveInReconciliation.has(id)) fail(`${id} is confirmed live in the drift comparison but not routed as observed in the reconciliation`);
}
for (const id of liveInReconciliation) {
  if (!liveInDrift.has(id)) fail(`${id} is routed as observed in the reconciliation but not confirmed live in the drift comparison`);
}

// 8. Every observation must name the job it was read from, or it cannot be
//    checked by anyone who doubts it.
for (const observation of observed.observations) {
  if (!Number.isInteger(observation.jobId)) fail(`an observation of ${observation.jurisdiction} ${observation.formNumber} carries no job id`);
  if (observation.outcome === "acquired" && !/^[0-9a-f]{64}$/.test(observation.observedSha256 ?? "")) {
    fail(`the acquired observation of ${observation.jurisdiction} ${observation.formNumber} carries no SHA-256`);
  }
  if (observation.outcome !== "acquired" && !observation.failure) {
    fail(`the unacquired observation of ${observation.jurisdiction} ${observation.formNumber} does not say what went wrong`);
  }
}

// 9. The observation log must not claim completeness it does not have.
//
//    Checked for internal consistency only, and deliberately NOT against the
//    current queue's leg count. The log describes one past run at a named head
//    sha; the queue moves. Tying the two together would turn an ordinary queue
//    edit into a failure here, and a check that cries wolf is a check people
//    learn to skip.
const coverage = observed.coverage ?? {};
if (coverage.legsReadHere !== observed.observations.length) {
  fail(`the observation log says ${coverage.legsReadHere} legs were read and lists ${observed.observations.length}`);
}
if (coverage.legsReadHere + coverage.legsNotRead !== coverage.legsInTheRun) {
  fail(`the observation log's coverage does not add up: ${coverage.legsReadHere} read + ${coverage.legsNotRead} unread is not ${coverage.legsInTheRun}`);
}

// 10. A URL the evidence records as REFUSED must never appear in the queue as a
//     known-good official source. The queue generator harvests URLs out of
//     data/rcap-all50, these reports live there, and they name the Kentucky
//     page that 404s and the North Carolina pages that 403. If the generator's
//     self-exclusion ever stops covering them, a dead page becomes a
//     jurisdiction's recorded official source and nothing else would notice.
//     A refusal is the publisher ANSWERING and saying no — a 404 or a 403.
//     A request that never completed is not a refusal and says nothing about
//     the URL: WI CR-266 failed at the transport in the run recorded here and
//     delivered bytes from the same URL in the run before it. Treating that as
//     a dead lead would retire a working official source over one bad minute.
const refusedUrls = new Set(
  observed.observations
    .filter((o) => o.outcome !== "acquired" && Number.isInteger(o.httpStatus) && o.httpStatus >= 400)
    .flatMap((o) => [o.requestedUrl, o.finalUrl])
    .filter(Boolean)
);
for (const entry of queue.sets?.exact_official_url_known ?? []) {
  if (refusedUrls.has(entry.url)) {
    fail(`${entry.assetId} is filed under exact_official_url_known with ${entry.url}, which the observation log records as refused`);
  }
}
for (const entry of Object.values(queue.sets ?? {}).flat()) {
  if (entry.unverifiedPatternCandidateUrl && entry.reconciliation !== "no_official_url_for_this_jurisdiction_is_recorded_anywhere_in_the_repository") {
    fail(`${entry.assetId} carries an unverified pattern candidate outside group C, so a derived URL has been promoted to a recorded one`);
  }
}

// 11. None of this lane's own evidence may appear as a queue row's provenance.
//     The generator harvests URLs out of data/rcap-all50 AND docs/record-clearing,
//     and this lane writes to both. The marker `rcap-url-evidence` is how a file
//     opts out; this proves the opt-out is working rather than trusting it.
const EVIDENCE_FILES = [
  "data/rcap-all50/source-observation-log.json",
  "data/rcap-all50/source-drift-comparison.json",
  "data/rcap-all50/archive-reconciliation.json",
  "docs/record-clearing/source-resolution-reconciliation.md"
];
for (const entry of Object.values(queue.sets ?? {}).flat()) {
  for (const provenance of entry.reconciledFrom ?? []) {
    if (EVIDENCE_FILES.includes(provenance)) {
      fail(`${entry.assetId} cites ${provenance} as the record of its official URL; this lane's evidence is not a source record`);
    }
  }
}
for (const file of EVIDENCE_FILES) {
  const text = fs.readFileSync(path.join(rootDir, file), "utf8");
  if (!/rcap-url-evidence|rcap-source-observation-log\/|rcap-source-drift-comparison\/|rcap-archive-reconciliation\//.test(text)) {
    fail(`${file} carries no marker excluding it from the queue generator's link harvest`);
  }
}

if (failures.length > 0) {
  console.error(`FAIL source-resolution artifacts — ${failures.length} problem(s):`);
  for (const failure of failures) console.error(`  ${failure}`);
  process.exit(1);
}
console.log("OK source-resolution artifacts — both reports are reproducible, complete over the queue, and consistent with each other.");
console.log(`   ${drift.assets.length} queue rows; ${drift.totals.pin_confirmed_live} pins confirmed live, ${drift.totals.pin_contradicted_live ?? 0} contradicted.`);
console.log(`   ${reconciliation.totals.rowsWhosePinnedBytesAreInAnArchive} rows' pinned bytes are indexed in an archive; ${reconciliation.totals.still_unlocated ?? 0} row(s) remain unlocated.`);
