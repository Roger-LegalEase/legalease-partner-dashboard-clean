#!/usr/bin/env node
/**
 * The supersession record for terminalization provenance pins.
 *
 * One entry per (profile, reviewed digest) pair whose profile has moved since
 * the review. Each entry preserves the reviewed digest and its date, records
 * the current digest, the commit whose bytes were reviewed and the commit
 * that moved them, the exact leaf-by-leaf delta, which protected dimensions
 * that delta touches, and how far the earlier review can still be isolated.
 *
 * Everything above is derived and regenerated here. The one thing that is
 * not is the `disposition` block: which of NO_SUBSTANTIVE_CHANGE,
 * TARGETED_REREVIEW_REQUIRED or FULL_REREVIEW_REQUIRED a delta belongs in is
 * an owner record, so an authored disposition is carried forward across
 * regeneration unchanged and keyed to the exact digest pair it was recorded
 * against. A disposition cannot survive its own delta changing: if the
 * profile moves again, the pair's key changes with it and the new pair has no
 * disposition, which is the correct outcome.
 *
 * This file does not decide anything. It measures, so that whoever decides is
 * deciding about something specific.
 *
 * Usage:
 *   node scripts/generate-rcap-terminalization-provenance-supersessions.mjs
 *   node scripts/generate-rcap-terminalization-provenance-supersessions.mjs --check
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  collectPins,
  locateReviewedBytes,
  measureDelta,
  repinHistory
} from "./lib/terminalization-provenance-model.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outRel = "data/rcap-all50/terminalization-provenance-supersessions.json";
const outPath = path.join(rootDir, outRel);
const check = process.argv.includes("--check");

const priorByKey = new Map();
if (fs.existsSync(outPath)) {
  const prior = JSON.parse(fs.readFileSync(outPath, "utf8"));
  for (const entry of prior.supersessions ?? []) {
    if (entry.disposition) priorByKey.set(`${entry.profilePath}|${entry.reviewedSha256}`, entry.disposition);
  }
}

const pins = collectPins({ root: rootDir });
const drifted = pins.filter((pin) => pin.reviewedSha256 !== pin.currentSha256);

// The pins in the records are not all first-hand. Four commits in August 2026
// moved provenance digests across the corpus without moving a single
// reviewedAsOf date, so for the records they touched, provenance.profileSha256
// is not reliably the digest the review saw. That has to be visible, because
// it changes what a disposition is deciding about: the honest chain runs from
// the digest the record was FIRST committed with, not from whatever the last
// refresh left behind.
const historyByRecord = new Map();
const repinEvents = new Map();
for (const pin of pins) {
  const history = repinHistory({ root: rootDir, record: pin.record });
  historyByRecord.set(pin.record, history);
  for (const event of history.events) {
    const key = `${event.commit}|${event.fromSha256}|${event.toSha256}`;
    if (!repinEvents.has(key)) repinEvents.set(key, { ...event, records: [] });
    repinEvents.get(key).records.push(pin.record);
  }
}
const priorUnrecordedRepins = [...repinEvents.values()]
  .map((event) => ({ ...event, recordCount: event.records.length, records: event.records.sort() }))
  .sort((a, b) => a.date.localeCompare(b.date) || a.commit.localeCompare(b.commit) || a.toSha256.localeCompare(b.toSha256));

const grouped = new Map();
for (const pin of drifted) {
  const key = `${pin.profilePath}|${pin.reviewedSha256}`;
  if (!grouped.has(key)) {
    grouped.set(key, {
      profilePath: pin.profilePath,
      reviewedSha256: pin.reviewedSha256,
      currentSha256: pin.currentSha256,
      reviewedAsOf: new Set(),
      records: []
    });
  }
  const group = grouped.get(key);
  group.records.push(pin.record);
  if (pin.reviewedAsOf) group.reviewedAsOf.add(pin.reviewedAsOf);
}

const supersessions = [...grouped.values()]
  .map((group) => {
    const { reviewedBytesCurrentAt, movedBy } = locateReviewedBytes({
      root: rootDir,
      profilePath: group.profilePath,
      reviewedSha256: group.reviewedSha256
    });
    const reviewedAsOf = [...group.reviewedAsOf].sort();

    // The first digest any record in this group was ever committed with. Where
    // it differs from the pinned digest, the pin is itself the product of an
    // earlier unrecorded move, and a disposition that looks only at the last
    // leg would be disposing of part of the change.
    const originals = new Set();
    const repinnedRecords = [];
    for (const record of group.records) {
      const history = historyByRecord.get(record);
      if (history?.original?.digest) originals.add(history.original.digest);
      if ((history?.events ?? []).length > 0) repinnedRecords.push(record);
    }
    const originalDigests = [...originals].sort();
    const pinIsItselfARepin = repinnedRecords.length > 0;
    // Records in one group can have entered at different times, so a group can
    // have more than one original baseline. Each is measured rather than one
    // being picked, because picking would mean choosing which half of the
    // history to show.
    const fromOriginal = [];
    for (const digest of originalDigests) {
      if (digest === group.reviewedSha256) continue;
      const located = locateReviewedBytes({ root: rootDir, profilePath: group.profilePath, reviewedSha256: digest });
      const measured = measureDelta({
        root: rootDir,
        profilePath: group.profilePath,
        reviewedBytesCurrentAt: located.reviewedBytesCurrentAt
      });
      // Counts, dimensions and isolation only: the full path lists for the
      // pinned-digest delta are what a disposition is checked against, and
      // duplicating several hundred paths per baseline would bury them.
      fromOriginal.push({
        originalSha256: digest,
        firstCommittedAt: located.reviewedBytesCurrentAt ?? null,
        counts: measured?.counts ?? null,
        dimensionsTouched: measured?.dimensionsTouched ?? null,
        isolation: measured?.isolation ?? null
      });
    }

    return {
      profilePath: group.profilePath,
      reviewedSha256: group.reviewedSha256,
      reviewedAsOf: reviewedAsOf.length === 1 ? reviewedAsOf[0] : null,
      reviewedAsOfAcrossRecords: reviewedAsOf,
      currentSha256: group.currentSha256,
      reviewedBytesCurrentAt,
      movedBy,
      delta: measureDelta({ root: rootDir, profilePath: group.profilePath, reviewedBytesCurrentAt }),
      priorChain: {
        pinnedDigestIsItselfARepin: pinIsItselfARepin,
        originalCommittedDigests: originalDigests,
        recordsWithAPriorRepin: repinnedRecords.sort(),
        deltasFromOriginalCommittedDigests: fromOriginal,
        note: pinIsItselfARepin
          ? "This group's pinned digest was installed by a later commit than the record's first, and reviewedAsOf did not move with it. A disposition here is deciding about the whole chain from the original committed digest, not only about the last leg."
          : "The pinned digest is the digest this record was first committed with."
      },
      recordCount: group.records.length,
      records: group.records.sort(),
      disposition: priorByKey.get(`${group.profilePath}|${group.reviewedSha256}`) ?? null
    };
  })
  .sort(
    (a, b) => a.profilePath.localeCompare(b.profilePath) || a.reviewedSha256.localeCompare(b.reviewedSha256)
  );

const next = {
  schemaVersion: "rcap-terminalization-provenance-supersessions/v1",
  generatedBy: "scripts/generate-rcap-terminalization-provenance-supersessions.mjs",
  purpose:
    "One entry per terminalization review whose compiled profile has moved since the review. The entry preserves the reviewed digest and its date, records the current digest and the exact delta between them, and carries the owner disposition of that delta. It exists so that a record can be truthful about having been reviewed against earlier bytes, instead of being forced to choose between failing and re-pinning.",
  model: {
    states: {
      CURRENT_PIN: "the reviewed digest equals the current profile digest",
      SUPERSEDED_PIN_WITH_RECORDED_DELTA:
        "the reviewed digest is preserved, the current digest differs, the exact delta is recorded, and the delta carries a satisfied disposition",
      UNSUPERSEDED_DRIFT: "the profile moved and nothing here accounts for it — refused"
    },
    dispositions: {
      NO_SUBSTANTIVE_CHANGE:
        "the delta touches no operative dimension. Permitted only where the machine measurement finds zero operative leaves, and only with a recorded immateriality determination. It does not require redoing the legal review.",
      TARGETED_REREVIEW_REQUIRED:
        "the delta is substantive but the earlier review can still be isolated: review the affected routes and sections, not the whole jurisdiction profile.",
      FULL_REREVIEW_REQUIRED:
        "the delta is broad enough that the earlier review can no longer be meaningfully isolated."
    },
    invariants: [
      "reviewedAsOf is preserved and never advanced",
      "the reviewed digest is preserved and never replaced by the current one",
      "no record inherits a review over bytes that did not exist when the review occurred",
      "a disposition is keyed to an exact digest pair; if the profile moves again the pair changes and the disposition does not carry"
    ],
    whoDecidesWhat:
      "The machine determines the delta, which dimensions it touches, and whether the earlier review is still isolable. The bucket is an owner record. The machine's only veto is that NO_SUBSTANTIVE_CHANGE cannot be recorded over a delta that moves an operative leaf."
  },
  totals: {
    recordsCarryingAProfilePin: pins.length,
    pinsCurrent: pins.length - drifted.length,
    pinsSuperseded: drifted.length,
    distinctProfileAndReviewedDigestPairs: supersessions.length,
    pairsDispositioned: supersessions.filter((s) => s.disposition).length,
    pairsAwaitingDisposition: supersessions.filter((s) => !s.disposition).length,
    priorUnrecordedRepinEvents: priorUnrecordedRepins.length,
    pairsWhosePinIsItselfARepin: supersessions.filter((s) => s.priorChain.pinnedDigestIsItselfARepin).length
  },
  priorUnrecordedRepins: {
    statement:
      "Before this mechanism existed, provenance digests were moved in place. These are every such move in committed history, derived from the records' own history rather than asserted.",
    whyItIsRecordedRatherThanRepaired:
      "History is not rewritten to make a control look clean. These commits are real and stay real. Recording them does two things the alternative does not: it stops the same move happening again unnoticed, because the verifier refuses any digest movement that is not one of these, and it tells whoever dispositions a delta that the pinned digest may not be the digest the review saw.",
    whatItMeansForADisposition:
      "Where pinnedDigestIsItselfARepin is true, the pinned digest was installed after the record's first commit and reviewedAsOf did not move with it. The delta from the pinned digest is the smaller, later half of the change; deltaFromOriginalCommittedDigest is the whole of it.",
    reviewedAsOfMovedInAnyOfThem: priorUnrecordedRepins.some((event) => event.reviewedAsOfMovedWithIt),
    events: priorUnrecordedRepins
  },
  notCommerciallyExposed: {
    statement:
      "No route covered by these supersessions carries commercial authority, and recording them moved no route's commercial state.",
    howItIsKnown:
      "Commercial authority comes only from a Grade-A fulfillment record keyed to an exact route and packet family. None of these routes appears in data/rcap-grade-a/fulfillment-authority-registry.json, so none is sellable, checkout-enabled, sponsored or credit-consuming.",
    consequence:
      "The refusal posture can be kept honestly while the dispositions are decided, because keeping it exposes no participant and blocks no sale."
  },
  supersessions
};

const serialized = `${JSON.stringify(next, null, 2)}\n`;

if (check) {
  if (!fs.existsSync(outPath) || fs.readFileSync(outPath, "utf8") !== serialized) {
    console.error("terminalization provenance supersessions are stale; re-run without --check");
    process.exit(1);
  }
  console.log(
    `terminalization provenance supersessions current. ${next.totals.pinsSuperseded}/${next.totals.recordsCarryingAProfilePin} pins superseded across ${supersessions.length} pair(s); ${next.totals.pairsAwaitingDisposition} awaiting disposition.`
  );
  process.exit(0);
}

fs.writeFileSync(outPath, serialized);
console.log(`wrote ${outRel}`);
for (const entry of supersessions) {
  const d = entry.delta;
  console.log(
    `  ${entry.profilePath.split("/").pop().padEnd(22)}${entry.reviewedSha256.slice(0, 10)}  ${String(entry.recordCount).padStart(2)} rec  ` +
      `moved ${entry.movedBy?.date ?? "?"}  +${d?.counts.added ?? "?"} -${d?.counts.removed ?? "?"} ~${d?.counts.changed ?? "?"}  ` +
      `operative ${d?.counts.operativeLeaves ?? "?"}  disturbed ${d?.isolation.reviewedPathwaysDisturbed.length ?? "?"}/${d?.isolation.pathwaysAtReview ?? "?"}  ` +
      `${entry.disposition ? entry.disposition.bucket : "AWAITING DISPOSITION"}`
  );
}
