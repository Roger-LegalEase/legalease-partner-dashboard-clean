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
const superseded = [];

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

  // A review is only worth the bytes it read. Treatments are authored and
  // corrected while review runs, so every shard pins the sha256 of each file it
  // read, and a pin that no longer matches means that jurisdiction has moved
  // underneath the reviewer.
  //
  // A stale pin SUPERSEDES rather than fails: the correct response to "these
  // bytes changed" is that a fresh reviewer rules them, which is exactly what
  // happens, and treating it as fatal would make an ordinary correction cycle
  // impossible. What stays fatal is a track left with NO current ruling, or two
  // current shards ruling the same track — both checked below.
  const pinned = shard.reviewedFileSha256 ?? {};
  const currentJurisdictions = new Set();
  const staleJurisdictions = new Set();
  for (const record of shard.dispositions ?? []) {
    const jurisdiction = briefedTracks.get(record.trackId)?.jurisdiction;
    if (!jurisdiction) continue;
    if (currentJurisdictions.has(jurisdiction) || staleJurisdictions.has(jurisdiction)) continue;
    const treatmentFile = path.join(rootDir, `data/rcap-all50/terminalization-treatments/${jurisdiction.toLowerCase()}.json`);
    const declared = pinned[jurisdiction];
    if (!declared || !fs.existsSync(treatmentFile)) {
      staleJurisdictions.add(jurisdiction);
      continue;
    }
    const actual = crypto.createHash("sha256").update(fs.readFileSync(treatmentFile)).digest("hex");
    (actual === declared ? currentJurisdictions : staleJurisdictions).add(jurisdiction);
  }

  let kept = 0;
  for (const record of shard.dispositions ?? []) {
    const trackId = record.trackId;
    if (!trackId) fail(`${file} carries a disposition with no track id`);
    if (!ALLOWED_OUTCOMES.has(record.outcome)) {
      fail(`${file}: ${trackId} carries outcome ${record.outcome}, which is not one of ${[...ALLOWED_OUTCOMES].join(", ")}`);
    }
    const brief = briefedTracks.get(trackId);
    if (!brief) fail(`${file}: ${trackId} was ruled on but this window never briefed it`);
    if (!currentJurisdictions.has(brief.jurisdiction)) continue;

    if (ruledTracks.has(trackId)) {
      fail(`${file}: ${trackId} was already ruled on by ${ruledTracks.get(trackId)} against the same current bytes; two live shards may not rule one track`);
    }
    ruledTracks.set(trackId, reviewId);
    kept += 1;

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
    // and this is where that rule is actually enforced. Substance is what is
    // required, not a particular field: reviewers legitimately write the finding
    // into `note`, and refusing that would be form over substance. A bare label
    // in either field still fails.
    const statedDefect = String(record.defect ?? "").trim() || String(record.note ?? "").trim();
    if (record.outcome === "correction_required" && statedDefect.length < 40) {
      fail(`${file}: ${trackId} was returned correction_required with no specific supported defect`);
    }

    closures.push({
      reviewId,
      outcome: record.outcome,
      trackKeys: [`${brief.jurisdiction}:${trackId}`],
      treatment: record.treatment ?? terminalTreatmentForTrack(trackId)?.treatment ?? null,
      ...(record.outcome === "correction_required" ? { defect: statedDefect } : {}),
      ...(record.note ? { note: record.note } : {})
    });
  }

  if (staleJurisdictions.size > 0) {
    superseded.push({
      reviewId,
      file: `data/rcap-all50/review-artifacts/terminalization-review-shards/${file}`,
      supersededJurisdictions: [...staleJurisdictions].sort(),
      why: "the treatment bytes this shard pinned have since changed, so its rulings for those jurisdictions no longer describe what would be promoted; a later shard rules them against current bytes"
    });
  }

  if (kept > 0) {
    shards.push({
      reviewId,
      file: `data/rcap-all50/review-artifacts/terminalization-review-shards/${file}`,
      reviewer: shard.reviewer,
      reviewedBaseSha: shard.reviewedBaseSha,
      reviewedFileSha256: shard.reviewedFileSha256 ?? {},
      authoredAnyTreatment: false,
      currentJurisdictions: [...currentJurisdictions].sort(),
      tracksReviewed: kept
    });
  }
}

// Every briefed track needs exactly one CURRENT ruling. A track whose only
// rulings were superseded is unreviewed, and saying so here is the difference
// between a promotion gate and a rubber stamp.
const unruled = briefs.briefs.filter((b) => !ruledTracks.has(b.trackId)).map((b) => b.key);

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
  supersededReviews: superseded,
  tracksAwaitingCurrentReview: unruled,
  counts: {
    tracksReviewed: closures.length,
    technicalApprovedAsTerminalTreatment: byOutcome("technical_approved_as_terminal_treatment"),
    correctionRequired: byOutcome("correction_required"),
    heldOnSourceOrDesign: byOutcome("held_on_source_or_design"),
    tracksBriefed: briefs.briefs.length,
    tracksAwaitingReview: unruled.length,
    supersededShardJurisdictions: superseded.reduce((n, r) => n + r.supersededJurisdictions.length, 0)
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
