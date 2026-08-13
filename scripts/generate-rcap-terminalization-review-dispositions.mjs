#!/usr/bin/env node
// The promotion signal for the emergency 497/497 terminalization window.
//
// Independent review shards each write one file of their own. This script is
// what turns those files into the single dispositions record the completion
// ledger reads, and it is deliberately the only way a treatment can become
// terminal: an author cannot promote their own work by editing a treatment,
// because promotion lives here and this file is built only from shard evidence.
//
//   node scripts/generate-rcap-terminalization-review-dispositions.mjs
//   node scripts/generate-rcap-terminalization-review-dispositions.mjs --check
//
// It fails rather than guesses. A shard that approves a track nobody briefed, a
// track with no registered treatment, a track whose treatment failed the
// registry contract, or a track a second shard already ruled on, stops the run.

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { register } from "node:module";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

register("./lib/ts-esm-loader.mjs", import.meta.url);
const { terminalTreatmentForTrack } = await import("../src/lib/rcap/documents/guidance-packet-registry.ts");

const SHARD_DIR = path.join(rootDir, "data/rcap-all50/review-artifacts/terminalization-review-shards");
const BRIEFS = path.join(rootDir, "data/rcap-all50/review-artifacts/terminalization-evidence-briefs.json");
const OUT = path.join(rootDir, "data/rcap-all50/review-artifacts/terminalization-review-dispositions.json");

const checkOnly = process.argv.includes("--check");

const ALLOWED_OUTCOMES = new Set([
  "technical_approved_as_terminal_treatment",
  "correction_required",
  "held_on_source_or_design"
]);

function fail(message) {
  console.error(`FAIL terminalization review dispositions — ${message}`);
  process.exit(1);
}

const briefs = JSON.parse(fs.readFileSync(BRIEFS, "utf8"));
const briefedTracks = new Map(briefs.briefs.map((b) => [b.trackId, b]));

const shardFiles = fs.existsSync(SHARD_DIR)
  ? fs.readdirSync(SHARD_DIR).filter((f) => f.endsWith(".json") && !f.startsWith("_")).sort()
  : [];

const closures = [];
const ruledTracks = new Map();
const shards = [];

for (const file of shardFiles) {
  const shard = JSON.parse(fs.readFileSync(path.join(SHARD_DIR, file), "utf8"));
  const reviewId = shard.reviewId ?? file.replace(/\.json$/, "");
  if (!shard.reviewer || !shard.reviewedBaseSha) {
    fail(`${file} does not record who reviewed it and against which base SHA`);
  }
  // No implementation author approves their own work. The shard has to say so,
  // and say it about this window rather than in the abstract.
  if (shard.authoredAnyTreatment !== false) {
    fail(`${file} does not attest that its reviewer authored none of the treatments it reviews`);
  }

  // A review is only worth what it reviewed. Treatment files are authored
  // concurrently with review, so a shard that does not pin the exact bytes it
  // read cannot prove it reviewed the bytes we are about to promote — and a
  // shard whose pinned bytes have since moved has been silently invalidated.
  // Both are refused here rather than discovered after promotion.
  const pinned = shard.reviewedFileSha256 ?? {};
  const jurisdictionsInShard = new Set((shard.dispositions ?? [])
    .map((record) => briefedTracks.get(record.trackId)?.jurisdiction)
    .filter(Boolean));
  for (const jurisdiction of [...jurisdictionsInShard].sort()) {
    const file = path.join(rootDir, `data/rcap-all50/terminalization-treatments/${jurisdiction.toLowerCase()}.json`);
    const declared = pinned[jurisdiction];
    if (!declared) {
      fail(`${reviewId} ruled on ${jurisdiction} without pinning the sha256 of the treatment file it reviewed`);
    }
    const actual = crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
    if (actual !== declared) {
      fail(`${reviewId} reviewed ${jurisdiction} at ${String(declared).slice(0, 12)}… but the file is now ${actual.slice(0, 12)}…; that review is stale and the jurisdiction must be reviewed again`);
    }
  }

  for (const record of shard.dispositions ?? []) {
    const trackId = record.trackId;
    if (!trackId) fail(`${file} carries a disposition with no track id`);
    if (!ALLOWED_OUTCOMES.has(record.outcome)) {
      fail(`${file}: ${trackId} carries outcome ${record.outcome}, which is not one of ${[...ALLOWED_OUTCOMES].join(", ")}`);
    }
    const brief = briefedTracks.get(trackId);
    if (!brief) fail(`${file}: ${trackId} was ruled on but this window never briefed it`);
    if (ruledTracks.has(trackId)) {
      fail(`${file}: ${trackId} was already ruled on by ${ruledTracks.get(trackId)}; two shards may not rule on one track`);
    }
    ruledTracks.set(trackId, reviewId);

    // An approval has to point at something that actually loaded. A treatment
    // that failed the registry's fail-closed contract is not approvable, no
    // matter how carefully it was reviewed as text.
    if (record.outcome === "technical_approved_as_terminal_treatment") {
      const treatment = terminalTreatmentForTrack(trackId);
      if (!treatment) fail(`${file}: ${trackId} was approved but carries no registered terminal treatment`);
      if (treatment.classification !== "terminal_treatment_candidate") {
        fail(`${file}: ${trackId} was approved but its treatment failed the registry contract — ${treatment.invalidReason ?? "unspecified"}`);
      }
      if (!record.runtimeBehaviorInspected) {
        fail(`${file}: ${trackId} was approved without recording that runtime behaviour was inspected, not only the JSON declaration`);
      }
    }
    // A correction has to name a specific supported defect. "I would prefer a
    // better PDF" is not a defect when the track has a complete, safe treatment,
    // and this is where that rule is actually enforced.
    if (record.outcome === "correction_required" && !String(record.defect ?? "").trim()) {
      fail(`${file}: ${trackId} was returned correction_required with no specific supported defect`);
    }

    closures.push({
      reviewId,
      outcome: record.outcome,
      trackKeys: [`${brief.jurisdiction}:${trackId}`],
      treatment: record.treatment ?? terminalTreatmentForTrack(trackId)?.treatment ?? null,
      ...(record.defect ? { defect: record.defect } : {}),
      ...(record.note ? { note: record.note } : {})
    });
  }

  shards.push({
    reviewId,
    file: `data/rcap-all50/review-artifacts/terminalization-review-shards/${file}`,
    reviewer: shard.reviewer,
    reviewedBaseSha: shard.reviewedBaseSha,
    reviewedFileSha256: shard.reviewedFileSha256 ?? {},
    authoredAnyTreatment: false,
    tracksReviewed: (shard.dispositions ?? []).length
  });
}

closures.sort((a, b) => a.trackKeys[0].localeCompare(b.trackKeys[0]));

const byOutcome = (outcome) => closures.filter((c) => c.outcome === outcome).length;
const payload = {
  schemaVersion: "rcap-terminalization-review-dispositions/v1",
  generatedBy: "scripts/generate-rcap-terminalization-review-dispositions.mjs",
  windowId: "2026-08-13-emergency-497",
  promotionRule: "Only technical_approved_as_terminal_treatment promotes a track to terminal in data/rcap-ledger/track-terminalization.json. A technical approval here approves the terminal TREATMENT — the participant product — and never the underlying PDF family, which keeps its own holds and its row in the problematic PDF register.",
  stalenessRule: "Every shard pins the sha256 of each treatment file it read. A shard that pins nothing, or whose pinned bytes have since moved, is refused here — an approval can only promote the exact bytes it reviewed.",
  authorSeparation: "Every shard attests that its reviewer authored none of the treatments it reviews. A shard that cannot attest that is refused here rather than discounted later.",
  correctionStandard: "correction_required requires a specific supported defect: legal, technical, participant-safety or evidence. A preference for a better PDF is not a defect when the track has a complete, safe guidance, deferral or exclusion treatment.",
  shards,
  counts: {
    tracksReviewed: closures.length,
    technicalApprovedAsTerminalTreatment: byOutcome("technical_approved_as_terminal_treatment"),
    correctionRequired: byOutcome("correction_required"),
    heldOnSourceOrDesign: byOutcome("held_on_source_or_design"),
    tracksBriefed: briefs.briefs.length,
    tracksAwaitingReview: briefs.briefs.length - closures.length
  },
  closures
};

const serialized = `${JSON.stringify(payload, null, 2)}\n`;

if (checkOnly) {
  const current = fs.existsSync(OUT) ? fs.readFileSync(OUT, "utf8") : "";
  if (current !== serialized) fail("data/rcap-all50/review-artifacts/terminalization-review-dispositions.json is stale; re-run the generator");
} else {
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, serialized);
}

console.log(`OK terminalization review dispositions — ${payload.counts.tracksReviewed} reviewed (${payload.counts.technicalApprovedAsTerminalTreatment} approved, ${payload.counts.correctionRequired} correction, ${payload.counts.heldOnSourceOrDesign} held), ${payload.counts.tracksAwaitingReview} awaiting`);
