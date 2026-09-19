#!/usr/bin/env node
/**
 * The supersession record, held to the pins and the profiles it describes.
 *
 * The supersession mechanism makes it possible for a terminalization record to
 * be truthful about having been reviewed against earlier bytes. That is
 * strictly better than the rule it replaces — and it is also a new and more
 * comfortable way to launder a review, because a supersession is a document
 * that says the drift is fine, and a document that says the drift is fine is
 * exactly what someone reaches for when they want the suite green.
 *
 * So the mechanism is not trusted to describe itself. Every measurement is
 * recomputed here from the artifacts, the profiles and Git history, and the
 * document is refused when:
 *
 *   1. a drifted pin has no supersession record;
 *   2. the recorded reviewed digest is not the digest the record was reviewed
 *      against;
 *   3. the recorded current digest is not the profile's current bytes;
 *   4. the delta counts or paths are understated;
 *   5. a delta that moves an operative leaf is labelled NO_SUBSTANTIVE_CHANGE;
 *   6. a TARGETED or FULL re-review disposition has no review record;
 *   7. a terminalization record's pin was simply replaced with the new digest;
 *   8. a reviewedAsOf date was advanced;
 *   9. a supersession record is dropped.
 *
 * Conditions 7 and 8 cannot be checked against the working tree, because a
 * successful re-pin leaves a working tree that looks perfectly consistent —
 * that is the whole danger. They are checked against each record's committed
 * history instead.
 *
 * That check immediately found that the thing it forbids had already happened:
 * four commits in August 2026 moved provenance digests across the corpus, in
 * thirteen events, and not one of them moved a reviewedAsOf date with it. One
 * says so in its subject line. Those commits are history and history is not
 * rewritten to make a control look clean, so they are enumerated in the
 * document and the check refuses any digest movement that is NOT one of them.
 * A new re-pin fails; the old ones are named rather than hidden; and any pair
 * whose pin was installed that way is marked, because its recorded delta is
 * the last leg of a longer change and a disposition needs the whole chain.
 *
 * Run with --mutations to prove each refusal fires.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  collectPins,
  locateReviewedBytes,
  measureDelta,
  evaluateSupersession,
  provenanceState,
  repinHistory
} from "./terminalization/terminalization-provenance-model.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DOCUMENT = "data/rcap-all50/terminalization-provenance-supersessions.json";
const REGISTRY = "data/rcap-grade-a/fulfillment-authority-registry.json";

const failures = [];
let checks = 0;
const ok = (label, condition, detail) => {
  checks += 1;
  if (!condition) failures.push(`${label}${detail === undefined ? "" : ` — got ${detail}`}`);
};

const document = JSON.parse(fs.readFileSync(path.join(rootDir, DOCUMENT), "utf8"));
const pins = collectPins({ root: rootDir });
const drifted = pins.filter((pin) => pin.reviewedSha256 !== pin.currentSha256);

/** Every refusal the document must produce against the measured corpus. */
function refusals(doc, measuredPins) {
  const found = [];
  const say = (reason) => found.push(reason);

  const byKey = new Map();
  for (const entry of doc.supersessions ?? []) {
    const key = `${entry.profilePath}|${entry.reviewedSha256}`;
    if (byKey.has(key)) say(`${entry.profilePath} @ ${String(entry.reviewedSha256).slice(0, 10)} appears more than once`);
    byKey.set(key, entry);
  }

  const measuredDrift = measuredPins.filter((pin) => pin.reviewedSha256 !== pin.currentSha256);
  const liveKeys = new Set(measuredDrift.map((pin) => `${pin.profilePath}|${pin.reviewedSha256}`));

  // (1) and (9): every drifted pin is covered, and nothing covers a pin that
  // is not drifted.
  for (const pin of measuredDrift) {
    const key = `${pin.profilePath}|${pin.reviewedSha256}`;
    if (!byKey.has(key)) {
      say(`${pin.record}: its profile moved and no supersession record covers ${pin.reviewedSha256.slice(0, 10)}`);
      continue;
    }
    const entry = byKey.get(key);
    if (!(entry.records ?? []).includes(pin.record)) {
      say(`${pin.record} is covered by no supersession's record list, so it would leave the superseded set unnoticed`);
    }
  }
  for (const key of byKey.keys()) {
    if (!liveKeys.has(key)) say(`the document supersedes ${key.split("|")[1].slice(0, 10)}, which is not a drifted pin`);
  }

  // (2), (3) and the disposition rules, through the same evaluator the C1
  // control uses, so the two cannot disagree about what "satisfied" means.
  for (const pin of measuredDrift) {
    const verdict = evaluateSupersession({ pin, supersession: byKey.get(`${pin.profilePath}|${pin.reviewedSha256}`) });
    for (const problem of verdict.problems ?? []) say(`${pin.record}: ${problem}`);
  }

  return found;
}

ok("the document declares its schema", document.schemaVersion === "rcap-terminalization-provenance-supersessions/v1", document.schemaVersion);
ok("the document states the two satisfying states", Boolean(document.model?.states?.CURRENT_PIN && document.model?.states?.SUPERSEDED_PIN_WITH_RECORDED_DELTA));
ok("the document states the third, refused state", Boolean(document.model?.states?.UNSUPERSEDED_DRIFT));
ok("the document defines all three dispositions", Object.keys(document.model?.dispositions ?? {}).length === 3);
ok("the document records that reviewedAsOf is never advanced",
  (document.model?.invariants ?? []).some((line) => /reviewedAsOf/.test(line) && /never/.test(line)));
ok("the document records that the reviewed digest is never replaced",
  (document.model?.invariants ?? []).some((line) => /never replaced/.test(line)));
ok("the document records that no review is inherited over bytes that did not exist",
  (document.model?.invariants ?? []).some((line) => /did not exist/.test(line)));
ok("the document says who decides the bucket", /owner record/i.test(String(document.model?.whoDecidesWhat ?? "")));

const live = refusals(document, pins);
ok("the document is exactly the measured set of superseded pins, consistently recorded", live.length === 0, live.slice(0, 3).join("; "));

ok("totals.recordsCarryingAProfilePin is the measured corpus", document.totals?.recordsCarryingAProfilePin === pins.length,
  `${document.totals?.recordsCarryingAProfilePin} vs ${pins.length}`);
ok("totals.pinsSuperseded is the measured drift", document.totals?.pinsSuperseded === drifted.length,
  `${document.totals?.pinsSuperseded} vs ${drifted.length}`);
ok("totals.pairsAwaitingDisposition is the count actually awaiting one",
  document.totals?.pairsAwaitingDisposition === (document.supersessions ?? []).filter((s) => !s.disposition).length);

// (4) The delta is recomputed rather than read. An understated count or a
// dropped path is the cheapest way to make a substantive delta look small.
for (const entry of document.supersessions ?? []) {
  const { reviewedBytesCurrentAt } = locateReviewedBytes({
    root: rootDir,
    profilePath: entry.profilePath,
    reviewedSha256: entry.reviewedSha256
  });
  checks += 1;
  if (!reviewedBytesCurrentAt) {
    failures.push(`${entry.profilePath} @ ${entry.reviewedSha256.slice(0, 10)}: no commit in the profile's history has these bytes`);
    continue;
  }
  const measured = measureDelta({ root: rootDir, profilePath: entry.profilePath, reviewedBytesCurrentAt });
  const label = `${entry.profilePath.split("/").pop()} @ ${entry.reviewedSha256.slice(0, 10)}`;
  const recorded = entry.delta;
  const mismatches = [];
  for (const field of ["added", "removed", "changed", "totalMoved", "operativeLeaves"]) {
    if (recorded?.counts?.[field] !== measured.counts[field]) {
      mismatches.push(`counts.${field} records ${recorded?.counts?.[field]}, measured ${measured.counts[field]}`);
    }
  }
  for (const kind of ["added", "removed", "changed"]) {
    const recordedPaths = recorded?.changedPaths?.[kind] ?? [];
    if (recordedPaths.length !== measured.changedPaths[kind].length) {
      mismatches.push(`changedPaths.${kind} records ${recordedPaths.length} path(s), measured ${measured.changedPaths[kind].length}`);
    }
  }
  if (JSON.stringify(recorded?.dimensionsTouched ?? []) !== JSON.stringify(measured.dimensionsTouched)) {
    mismatches.push(`dimensionsTouched records ${JSON.stringify(recorded?.dimensionsTouched)}, measured ${JSON.stringify(measured.dimensionsTouched)}`);
  }
  if (mismatches.length > 0) failures.push(`${label}: ${mismatches[0]}`);
}

// (7) and (8) A pin or a review date moved in place is the thing the
// supersession mechanism replaces. It cannot be checked against the working
// tree — a successful re-pin leaves a tree that looks perfectly consistent,
// which is exactly the danger — so it is checked against each record's
// committed history.
//
// Digests did move, before this mechanism existed: four commits in August
// 2026, thirteen events. Those are history and are not rewritten. They are
// enumerated in the document instead, which is what makes a NEW one
// detectable: any movement that is not one of the recorded events fails here.
const recordedRepins = new Set(
  (document.priorUnrecordedRepins?.events ?? []).map((e) => `${e.commit}|${e.fromSha256}|${e.toSha256}`)
);
const unrecordedMoves = [];
const advancedDates = [];
const measuredRepinKeys = new Set();
const priorChainByRecord = new Map();
for (const pin of pins) {
  const history = repinHistory({ root: rootDir, record: pin.record });
  priorChainByRecord.set(pin.record, history);
  for (const event of history.events) {
    const key = `${event.commit}|${event.fromSha256}|${event.toSha256}`;
    measuredRepinKeys.add(key);
    if (!recordedRepins.has(key)) {
      unrecordedMoves.push(
        `${pin.record}: ${event.fromSha256.slice(0, 10)} -> ${event.toSha256.slice(0, 10)} at ${event.commit.slice(0, 9)} is not a recorded event`
      );
    }
    if (event.reviewedAsOfMovedWithIt) {
      advancedDates.push(
        `${pin.record}: reviewedAsOf moved ${event.reviewedAsOfBefore} -> ${event.reviewedAsOfAfter} at ${event.commit.slice(0, 9)}`
      );
    }
  }
}
ok("every provenance digest movement in history is a recorded event", unrecordedMoves.length === 0, unrecordedMoves.slice(0, 2).join("; "));
ok("no reviewedAsOf date has ever been advanced", advancedDates.length === 0, advancedDates.slice(0, 2).join("; "));
ok("the document records no re-pin event that did not happen",
  [...recordedRepins].every((key) => measuredRepinKeys.has(key)),
  [...recordedRepins].filter((key) => !measuredRepinKeys.has(key)).slice(0, 2).join("; "));
ok("the document states how many prior re-pin events there were",
  document.totals?.priorUnrecordedRepinEvents === (document.priorUnrecordedRepins?.events ?? []).length);
ok("the document's claim about review dates moving matches what history shows",
  document.priorUnrecordedRepins?.reviewedAsOfMovedInAnyOfThem === (advancedDates.length > 0),
  `document says ${document.priorUnrecordedRepins?.reviewedAsOfMovedInAnyOfThem}, history shows ${advancedDates.length > 0}`);

// Each pair has to be honest about whether its own pinned digest is
// first-hand. A pair whose pin was installed by a later refresh is disposing
// of the last leg of a longer change, and saying otherwise would understate
// exactly the thing a disposition turns on.
for (const entry of document.supersessions ?? []) {
  checks += 1;
  const measuredRepinned = (entry.records ?? []).filter((record) => (priorChainByRecord.get(record)?.events ?? []).length > 0);
  if (entry.priorChain?.pinnedDigestIsItselfARepin !== measuredRepinned.length > 0) {
    failures.push(
      `${entry.profilePath.split("/").pop()} @ ${entry.reviewedSha256.slice(0, 10)}: says pinnedDigestIsItselfARepin ${entry.priorChain?.pinnedDigestIsItselfARepin}, measured ${measuredRepinned.length > 0}`
    );
    continue;
  }
  if (JSON.stringify((entry.priorChain?.recordsWithAPriorRepin ?? []).slice().sort()) !== JSON.stringify(measuredRepinned.slice().sort())) {
    failures.push(
      `${entry.profilePath.split("/").pop()} @ ${entry.reviewedSha256.slice(0, 10)}: records with a prior re-pin are understated`
    );
    continue;
  }
  if (measuredRepinned.length > 0) {
    const originals = new Set();
    for (const record of entry.records ?? []) {
      const original = priorChainByRecord.get(record)?.original?.digest;
      if (original && original !== entry.reviewedSha256) originals.add(original);
    }
    const recorded = new Set((entry.priorChain?.deltasFromOriginalCommittedDigests ?? []).map((d) => d.originalSha256));
    for (const original of originals) {
      if (!recorded.has(original)) {
        failures.push(
          `${entry.profilePath.split("/").pop()} @ ${entry.reviewedSha256.slice(0, 10)}: no whole-chain delta from the original digest ${original.slice(0, 10)}`
        );
        break;
      }
    }
  }
}

// The commercial claim, checked rather than believed.
const registry = fs.readFileSync(path.join(rootDir, REGISTRY), "utf8");
const exposed = new Set();
for (const entry of document.supersessions ?? []) {
  for (const record of entry.records ?? []) {
    const slug = record.split("/")[3];
    if (!slug || slug.endsWith(".json")) continue;
    if (registry.includes(`"${slug}"`)) exposed.add(slug);
  }
}
ok("no route under supersession carries a fulfillment record", exposed.size === 0, [...exposed].join(", "));

// And the state model itself: every record resolves to exactly one state, and
// a record is satisfied only through one of the two honest ones.
const { byKey: supersessionsByKey } = {
  byKey: new Map((document.supersessions ?? []).map((e) => [`${e.profilePath}|${e.reviewedSha256}`, e]))
};
const states = { CURRENT_PIN: 0, SUPERSEDED_PIN_WITH_RECORDED_DELTA: 0, SUPERSEDED_PIN_AWAITING_DISPOSITION: 0, UNSUPERSEDED_DRIFT: 0 };
let satisfied = 0;
for (const pin of pins) {
  const verdict = provenanceState({ pin, supersessionsByKey });
  states[verdict.state] = (states[verdict.state] ?? 0) + 1;
  if (verdict.satisfied) satisfied += 1;
}
ok("every pinned record resolves to a known provenance state",
  Object.values(states).reduce((a, b) => a + b, 0) === pins.length);
ok("no record is satisfied through anything but a current or properly superseded pin",
  satisfied === states.CURRENT_PIN + (document.supersessions ?? [])
    .filter((e) => evaluateSupersession({
      pin: { profilePath: e.profilePath, reviewedSha256: e.reviewedSha256, currentSha256: e.currentSha256, reviewedAsOf: e.reviewedAsOf },
      supersession: e
    }).satisfied)
    .reduce((total, e) => total + e.recordCount, 0));

if (process.argv.includes("--mutations")) {
  const clone = () => JSON.parse(JSON.stringify(document));
  const firstKey = document.supersessions[0];
  const cases = [
    ["(9) a supersession record is dropped", () => { const d = clone(); d.supersessions.shift(); return d; }],
    ["(1) a drifted record is removed from its supersession's record list", () => {
      const d = clone(); d.supersessions[0].records.pop(); return d;
    }],
    ["(2) the recorded reviewed digest is not the digest the record was reviewed against", () => {
      const d = clone(); d.supersessions[0].reviewedSha256 = "f".repeat(64); return d;
    }],
    ["(3) the recorded current digest is not the profile's current bytes", () => {
      const d = clone(); d.supersessions[0].currentSha256 = "e".repeat(64); return d;
    }],
    ["(7) the reviewed digest is quietly replaced by the current one", () => {
      const d = clone(); d.supersessions[0].reviewedSha256 = d.supersessions[0].currentSha256; return d;
    }],
    ["(8) reviewedAsOf is advanced inside the supersession", () => {
      const d = clone(); d.supersessions[0].reviewedAsOf = "2026-09-19"; return d;
    }],
    ["(5) an operative delta is labelled NO_SUBSTANTIVE_CHANGE", () => {
      const d = clone();
      d.supersessions[0].disposition = {
        bucket: "NO_SUBSTANTIVE_CHANGE", recordedBy: "someone", recordedOn: "2026-09-19",
        rationale: "looks like formatting", immaterialityDetermination: "asserted"
      };
      return d;
    }],
    ["(6) a targeted re-review is claimed with no review record", () => {
      const d = clone();
      d.supersessions[0].disposition = {
        bucket: "TARGETED_REREVIEW_REQUIRED", recordedBy: "someone", recordedOn: "2026-09-19", rationale: "narrow"
      };
      return d;
    }],
    ["(6) a full re-review names a review record with no digest", () => {
      const d = clone();
      d.supersessions[0].disposition = {
        bucket: "FULL_REREVIEW_REQUIRED", recordedBy: "someone", recordedOn: "2026-09-19", rationale: "broad",
        reviewRecord: { path: "docs/nowhere.md" }
      };
      return d;
    }],
    ["a disposition is recorded with nobody accountable for it", () => {
      const d = clone();
      d.supersessions[0].disposition = { bucket: "FULL_REREVIEW_REQUIRED", recordedOn: "2026-09-19", rationale: "x", reviewRecord: { path: "p", sha256: "a" } };
      return d;
    }],
    ["an invented disposition bucket is used", () => {
      const d = clone();
      d.supersessions[0].disposition = { bucket: "FINE_ACTUALLY", recordedBy: "x", recordedOn: "2026-09-19", rationale: "x" };
      return d;
    }],
    ["a supersession covers a pin that never drifted", () => {
      const d = clone();
      d.supersessions.push({ ...firstKey, profilePath: "src/lib/rcap-engine/compiled/profiles/AZ-arizona.json", reviewedSha256: "a".repeat(64) });
      return d;
    }],
    ["a pair is listed twice", () => { const d = clone(); d.supersessions.push(d.supersessions[0]); return d; }]
  ];
  console.log("\nMutations that must be refused:");
  for (const [name, mutate] of cases) {
    checks += 1;
    const caught = refusals(mutate(), pins);
    if (caught.length === 0) failures.push(`MISSED: ${name}`);
    else console.log(`  refused  ${name}\n             ${caught[0].slice(0, 116)}`);
  }

  // The other direction: a pin that drifts after the document was written.
  checks += 1;
  const grown = [...pins, {
    record: "data/rcap-all50/pleadings/nowhere/np_route/pleading-config.json",
    profilePath: "src/lib/rcap-engine/compiled/profiles/AZ-arizona.json",
    reviewedSha256: "0".repeat(64),
    reviewedAsOf: "2026-09-19",
    currentSha256: "1".repeat(64)
  }];
  const caught = refusals(document, grown);
  if (caught.length === 0) failures.push("MISSED: a pin drifts after the document was written");
  else console.log(`  refused  a pin drifts after the document was written\n             ${caught[0].slice(0, 116)}`);
}

if (failures.length > 0) {
  console.error(`\nterminalization provenance supersessions FAILED — ${failures.length} problem(s):`);
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}
console.log(
  `\nterminalization provenance supersessions — ${checks} checks. ` +
    `${states.CURRENT_PIN} record(s) on a current pin, ${satisfied - states.CURRENT_PIN} on a satisfied supersession, ` +
    `${states.SUPERSEDED_PIN_AWAITING_DISPOSITION + states.UNSUPERSEDED_DRIFT} awaiting an owner disposition. No pin was moved.`
);
