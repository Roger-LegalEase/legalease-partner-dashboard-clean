#!/usr/bin/env node
/**
 * The provenance-drift inventory, held to the pins it claims to describe.
 *
 * The inventory exists because verify-rcap-terminalize-c1 refuses to accept a
 * terminalization artifact whose provenance names profile bytes the repository
 * no longer has, and because that refusal is correct. An inventory of a
 * refusal is a comfortable place for the refusal to quietly shrink: a record
 * drops out, a stale pin is described as current, or the instruction not to
 * re-pin is softened into a suggestion. So the inventory is not trusted to
 * describe itself.
 *
 * Recomputed here from the artifacts and the profiles on disk:
 *
 *   - every artifact that pins a compiled profile is counted;
 *   - every pin whose profile has moved appears in the inventory exactly once;
 *   - no pin that still matches its profile may be listed as stale;
 *   - the totals are the measured totals;
 *   - the claim that nothing here is commercially exposed is checked against
 *     the fulfillment-authority registry rather than taken on the inventory's
 *     word.
 *
 * And the part that matters most: the inventory must keep saying that these
 * pins are not the captain's to move. A repository that can re-pin a review's
 * digest to clear a check has no reviews, only digests.
 *
 * Run with --mutations to prove the drift it is built to catch is caught.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { collectPins } from "./generate-rcap-terminalization-provenance-drift.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const INVENTORY = "data/rcap-all50/terminalization-provenance-drift.json";
const REGISTRY = "data/rcap-grade-a/fulfillment-authority-registry.json";

const json = (rel) => JSON.parse(fs.readFileSync(path.join(rootDir, rel), "utf8"));

const failures = [];
let checks = 0;
const ok = (label, condition, detail) => {
  checks += 1;
  if (!condition) failures.push(`${label}${detail === undefined ? "" : ` — got ${detail}`}`);
};

const pins = collectPins({ root: rootDir });
const measuredStale = pins.filter((p) => p.liveSha256 !== p.pinnedSha256);

/** Every refusal the inventory must produce against the measured pins. */
function refusals(inventory, measured) {
  const found = [];
  const say = (reason) => found.push(reason);

  const listed = new Map();
  for (const group of inventory.stale ?? []) {
    for (const record of group.records ?? []) {
      if (listed.has(record)) say(`${record} is listed more than once`);
      listed.set(record, group);
    }
  }

  const staleByRecord = new Map(measured.map((p) => [p.record, p]));
  for (const pin of measured) {
    const group = listed.get(pin.record);
    if (!group) {
      say(`${pin.record} pins ${pin.pinnedSha256.slice(0, 10)}, its profile has moved, and the inventory does not carry it`);
      continue;
    }
    if (group.pinnedSha256 !== pin.pinnedSha256) {
      say(`${pin.record}: the inventory says the pin is ${String(group.pinnedSha256).slice(0, 10)}, the record says ${pin.pinnedSha256.slice(0, 10)}`);
    }
    if (group.liveSha256 !== pin.liveSha256) {
      say(`${pin.record}: the inventory says the profile now hashes to ${String(group.liveSha256).slice(0, 10)}, it hashes to ${pin.liveSha256.slice(0, 10)}`);
    }
    if (group.profilePath !== pin.profilePath) {
      say(`${pin.record}: the inventory names a different profile than the record pins`);
    }
  }
  for (const record of listed.keys()) {
    if (!staleByRecord.has(record)) {
      say(`the inventory lists ${record} as stale; its pin matches the profile that ships`);
    }
  }

  const totals = inventory.totals ?? {};
  if (totals.recordsCarryingAProfilePin !== pins.length) {
    say(`totals.recordsCarryingAProfilePin says ${totals.recordsCarryingAProfilePin}, the corpus has ${pins.length}`);
  }
  if (totals.pinsStale !== measured.length) {
    say(`totals.pinsStale says ${totals.pinsStale}, ${measured.length} pins have drifted`);
  }
  if (totals.pinsCurrent !== pins.length - measured.length) {
    say(`totals.pinsCurrent says ${totals.pinsCurrent}, ${pins.length - measured.length} pins still match`);
  }

  // Each group has to say when the bytes it pins were the file's content and
  // what moved them. A group that cannot say loses the only thing that makes
  // the drift diagnosable rather than merely reported.
  for (const group of inventory.stale ?? []) {
    if (!group.pinnedBytesCurrentAt?.commit) {
      say(`${group.profilePath} @ ${String(group.pinnedSha256).slice(0, 10)}: the inventory cannot say when these bytes were the profile's content`);
    }
    if (!group.movedBy?.commit) {
      say(`${group.profilePath} @ ${String(group.pinnedSha256).slice(0, 10)}: the inventory cannot say what moved the profile`);
    }
    if (!group.profileDelta || typeof group.profileDelta.added !== "number") {
      say(`${group.profilePath} @ ${String(group.pinnedSha256).slice(0, 10)}: the inventory does not measure how far the profile moved`);
    }
  }

  // The instruction is the point of the document.
  const why = inventory.whyItIsNotRepairedHere ?? {};
  if (!String(why.doNotResolveHere ?? "").trim()) {
    say("the inventory no longer says that these pins must not be re-pinned to clear the check");
  }
  if (!String(why.owner ?? "").trim()) {
    say("the inventory names no owner for the decision, so it is a note rather than work");
  }
  if (!String(inventory.notCommerciallyExposed?.howItIsKnown ?? "").trim()) {
    say("the inventory asserts commercial exposure without saying how it is known");
  }
  return found;
}

const inventory = json(INVENTORY);

ok("the inventory declares its schema", inventory.schemaVersion === "rcap-terminalization-provenance-drift/v1", inventory.schemaVersion);
ok("the inventory names the generator that derives it", inventory.generatedBy === "scripts/generate-rcap-terminalization-provenance-drift.mjs");
ok("the inventory says how each field is measured", Object.keys(inventory.howItIsMeasured ?? {}).length >= 4);
ok("the inventory names the verifier it blocks", inventory.blocksCanonicalSuite?.verifier === "scripts/verify-rcap-terminalize-c1.mjs");

const live = refusals(inventory, measuredStale);
ok("the inventory is exactly the measured set of stale pins", live.length === 0, live.join("; "));

// The commercial claim, checked rather than believed: no route named in the
// inventory may appear in the fulfillment-authority registry, because that
// record is the only thing that grants commercial authority.
const registry = JSON.stringify(json(REGISTRY));
const exposed = [];
for (const group of inventory.stale ?? []) {
  for (const record of group.records ?? []) {
    const slug = record.split("/").filter(Boolean).slice(2, 3)[0];
    if (!slug || slug === "manifest.json") continue;
    if (registry.includes(`"${slug}"`)) exposed.push(slug);
  }
}
ok("no route in the inventory carries a fulfillment record", exposed.length === 0, [...new Set(exposed)].join(", "));

ok("the inventory records that re-pinning is not the repair",
  /re-pin/i.test(String(inventory.whyItIsNotRepairedHere?.doNotResolveHere ?? "")));
ok("the inventory records that the reviewedAsOf dates must not be edited",
  /reviewedAsOf/.test(String(inventory.whyItIsNotRepairedHere?.doNotResolveHere ?? "")));
ok("the inventory records that the C1 assertion must not be narrowed",
  /C1/.test(String(inventory.whyItIsNotRepairedHere?.doNotResolveHere ?? "")));

if (process.argv.includes("--mutations")) {
  const clone = () => JSON.parse(JSON.stringify(inventory));
  const cases = [
    ["a drifted record is quietly dropped", () => { const i = clone(); i.stale[0].records.pop(); i.totals.pinsStale -= 1; return i; }],
    ["a whole profile group is dropped", () => { const i = clone(); i.stale.shift(); return i; }],
    ["a stale pin is described as the digest that ships", () => {
      const i = clone(); i.stale[0].pinnedSha256 = i.stale[0].liveSha256; return i;
    }],
    ["the live digest is restated as the pinned one", () => {
      const i = clone(); i.stale[0].liveSha256 = i.stale[0].pinnedSha256; return i;
    }],
    ["a record is listed under the wrong profile", () => {
      const i = clone(); i.stale[0].profilePath = "src/lib/rcap-engine/compiled/profiles/AZ-arizona.json"; return i;
    }],
    ["the stale total is understated", () => { const i = clone(); i.totals.pinsStale = 3; return i; }],
    ["the corpus total is overstated so the ratio looks smaller", () => {
      const i = clone(); i.totals.recordsCarryingAProfilePin = 900; return i;
    }],
    ["a record is listed twice", () => { const i = clone(); i.stale[0].records.push(i.stale[0].records[0]); return i; }],
    ["a group loses the commit that moved the profile", () => { const i = clone(); i.stale[0].movedBy = null; return i; }],
    ["a group loses the measurement of how far the profile moved", () => {
      const i = clone(); i.stale[0].profileDelta = null; return i;
    }],
    ["the instruction not to re-pin is removed", () => {
      const i = clone(); i.whyItIsNotRepairedHere.doNotResolveHere = ""; return i;
    }],
    ["the decision loses its owner", () => { const i = clone(); i.whyItIsNotRepairedHere.owner = ""; return i; }],
    ["the commercial claim is made without evidence", () => {
      const i = clone(); i.notCommerciallyExposed.howItIsKnown = ""; return i;
    }]
  ];
  console.log("\nMutations that must be refused:");
  for (const [name, mutate] of cases) {
    checks += 1;
    const caught = refusals(mutate(), measuredStale);
    if (caught.length === 0) failures.push(`MISSED: ${name}`);
    else console.log(`  refused  ${name}\n             ${caught[0].slice(0, 118)}`);
  }

  // The other direction: a pin that drifts after this inventory was written
  // must not be absorbed by an inventory that already looks complete.
  checks += 1;
  const newlyDrifted = [...measuredStale, {
    record: "data/rcap-all50/pleadings/nowhere/np_route/pleading-config.json",
    profilePath: "src/lib/rcap-engine/compiled/profiles/AZ-arizona.json",
    pinnedSha256: "0".repeat(64),
    reviewedAsOf: "2026-09-19",
    liveSha256: "1".repeat(64)
  }];
  const caught = refusals(inventory, newlyDrifted);
  if (caught.length === 0) failures.push("MISSED: a newly drifted pin the inventory does not carry");
  else console.log(`  refused  a pin drifts after the inventory was written\n             ${caught[0].slice(0, 118)}`);
}

if (failures.length > 0) {
  console.error(`\nterminalization provenance drift FAILED — ${failures.length} problem(s):`);
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}
console.log(
  `\nterminalization provenance drift — ${checks} checks. ${measuredStale.length}/${pins.length} pins name profile bytes that no longer ship; none is commercially exposed, and none is re-pinnable without a review.`
);
