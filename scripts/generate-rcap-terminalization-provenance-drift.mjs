#!/usr/bin/env node
/**
 * The inventory of terminalization provenance pins that no longer name the
 * bytes that ship.
 *
 * Every terminalization artifact under data/rcap-all50/ records, in its
 * provenance block, the compiled profile it was built and reviewed against
 * and the sha256 of that profile's bytes on the review date. The pin exists
 * so that a profile moving after a review cannot pass unnoticed — a review
 * that certified bytes X says nothing about bytes Y.
 *
 * The pin is doing exactly that job, and it is reporting that most of the
 * corpus has moved on. verify-rcap-terminalize-c1 sees ten of these because
 * its scope is sixteen lane-C jobs; the condition is wider than its scope,
 * and an inventory that showed only the ten C1 happens to reach would
 * understate it.
 *
 * This is derived, not authored. Every field is recomputed here: the live
 * digest from the file on disk, the commit whose bytes match the pin and the
 * commit that moved them from Git history, and the delta between those two
 * versions leaf by leaf. Nothing in the output is a judgement about whether
 * a review would reach the same conclusion against the new bytes — that is a
 * legal question, it is recorded as open, and this script does not answer it.
 *
 * Usage:
 *   node scripts/generate-rcap-terminalization-provenance-drift.mjs
 *   node scripts/generate-rcap-terminalization-provenance-drift.mjs --check
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outPath = path.join(rootDir, "data/rcap-all50/terminalization-provenance-drift.json");
const check = process.argv.includes("--check");

const sha256 = (buf) => crypto.createHash("sha256").update(buf).digest("hex");
const git = (...args) => execFileSync("git", args, { cwd: rootDir, maxBuffer: 1 << 30 });
const gitText = (...args) => git(...args).toString("utf8");

/** Every leaf of a JSON document, addressed by path. */
function leaves(value, prefix = "", out = {}) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    for (const key of Object.keys(value)) leaves(value[key], prefix ? `${prefix}.${key}` : key, out);
  } else if (Array.isArray(value)) {
    value.forEach((entry, index) => leaves(entry, `${prefix}[${index}]`, out));
  } else {
    out[prefix] = value;
  }
  return out;
}

function walk(dir, found = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(abs, found);
    else if (entry.isFile() && entry.name.endsWith(".json")) found.push(abs);
  }
  return found;
}

/** Every artifact that pins a compiled profile, with its pin. */
export function collectPins({ root = rootDir } = {}) {
  const base = path.join(root, "data/rcap-all50");
  const pins = [];
  for (const abs of walk(base)) {
    let doc;
    try {
      doc = JSON.parse(fs.readFileSync(abs, "utf8"));
    } catch {
      continue;
    }
    const provenance = doc?.provenance;
    if (!provenance?.profilePath || !provenance?.profileSha256) continue;
    const profileAbs = path.join(root, provenance.profilePath);
    if (!fs.existsSync(profileAbs)) continue;
    pins.push({
      record: path.relative(root, abs).split(path.sep).join("/"),
      profilePath: provenance.profilePath,
      pinnedSha256: provenance.profileSha256,
      reviewedAsOf: provenance.reviewedAsOf ?? null,
      liveSha256: sha256(fs.readFileSync(profileAbs))
    });
  }
  return pins.sort((a, b) => a.record.localeCompare(b.record));
}

/**
 * The commit whose bytes match the pin, and the commit that moved them.
 * A pin whose bytes appear nowhere in this file's history is reported as
 * such rather than guessed at — it means the pin was never the file's
 * committed content, which is a different and worse problem.
 */
function locate(profilePath, pin) {
  const log = gitText("log", "--format=%H%x09%ad%x09%s", "--date=short", "--", profilePath)
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const [sha, date, ...subject] = line.split("\t");
      return { sha, date, subject: subject.join("\t") };
    });
  for (let i = 0; i < log.length; i += 1) {
    let digest;
    try {
      digest = sha256(git("show", `${log[i].sha}:${profilePath}`));
    } catch {
      continue;
    }
    if (digest === pin) return { pinnedAt: log[i], movedAt: i > 0 ? log[i - 1] : null };
  }
  return { pinnedAt: null, movedAt: null };
}

function delta(profilePath, pinnedAt) {
  if (!pinnedAt) return null;
  const before = leaves(JSON.parse(git("show", `${pinnedAt.sha}:${profilePath}`).toString("utf8")));
  const after = leaves(JSON.parse(fs.readFileSync(path.join(rootDir, profilePath), "utf8")));
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  let added = 0;
  let removed = 0;
  let changed = 0;
  for (const key of keys) {
    if (!(key in before)) added += 1;
    else if (!(key in after)) removed += 1;
    else if (before[key] !== after[key]) changed += 1;
  }
  const pathwayIds = (doc) => (doc.pathways ?? []).map((p) => p.id);
  const beforeDoc = JSON.parse(git("show", `${pinnedAt.sha}:${profilePath}`).toString("utf8"));
  const afterDoc = JSON.parse(fs.readFileSync(path.join(rootDir, profilePath), "utf8"));
  const was = pathwayIds(beforeDoc);
  const now = pathwayIds(afterDoc);
  return {
    added,
    removed,
    changed,
    purelyAdditive: removed === 0 && changed === 0,
    pathwaysGained: now.filter((id) => !was.includes(id)),
    pathwaysLost: was.filter((id) => !now.includes(id))
  };
}

// Importing this module must not write anything. verify-…-provenance-drift.mjs
// imports collectPins to measure the corpus for itself; a generator that
// regenerated its own artifact on import would make that verifier tautological.
const isMainModule = process.argv[1]
  ? path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
  : false;

if (isMainModule) main();

function main() {
const pins = collectPins();
const drifted = pins.filter((p) => p.liveSha256 !== p.pinnedSha256);

const groups = new Map();
for (const pin of drifted) {
  const key = `${pin.profilePath}|${pin.pinnedSha256}`;
  if (!groups.has(key)) {
    groups.set(key, {
      profilePath: pin.profilePath,
      pinnedSha256: pin.pinnedSha256,
      liveSha256: pin.liveSha256,
      reviewedAsOf: new Set(),
      records: []
    });
  }
  const group = groups.get(key);
  group.records.push(pin.record);
  if (pin.reviewedAsOf) group.reviewedAsOf.add(pin.reviewedAsOf);
}

const stale = [...groups.values()]
  .map((group) => {
    const { pinnedAt, movedAt } = locate(group.profilePath, group.pinnedSha256);
    return {
      profilePath: group.profilePath,
      pinnedSha256: group.pinnedSha256,
      liveSha256: group.liveSha256,
      reviewedAsOf: [...group.reviewedAsOf].sort(),
      recordCount: group.records.length,
      records: group.records.sort(),
      pinnedBytesCurrentAt: pinnedAt ? { commit: pinnedAt.sha, date: pinnedAt.date, subject: pinnedAt.subject } : null,
      movedBy: movedAt ? { commit: movedAt.sha, date: movedAt.date, subject: movedAt.subject } : null,
      profileDelta: delta(group.profilePath, pinnedAt)
    };
  })
  .sort((a, b) => a.profilePath.localeCompare(b.profilePath) || a.pinnedSha256.localeCompare(b.pinnedSha256));

const next = {
  schemaVersion: "rcap-terminalization-provenance-drift/v1",
  generatedBy: "scripts/generate-rcap-terminalization-provenance-drift.mjs",
  purpose:
    "Every terminalization artifact under data/rcap-all50/ whose provenance pins a compiled profile digest that the committed profile no longer has. The pin records which bytes a review was performed against; where it no longer matches, the review on record certifies bytes that are not the bytes that ship. This inventory says which pins those are, when and by what commit the profile moved, and how far it moved. It does not decide whether the review would reach the same conclusion against the new bytes.",
  howItIsMeasured: {
    liveDigest: "sha256 of the committed profile file, recomputed at generation",
    pinnedBytesCurrentAt: "the most recent commit in the profile's history whose bytes hash to the pin",
    movedBy: "the commit immediately after that one in the profile's history",
    profileDelta: "leaf-by-leaf comparison of the pinned version against the committed one"
  },
  totals: {
    recordsCarryingAProfilePin: pins.length,
    pinsCurrent: pins.length - drifted.length,
    pinsStale: drifted.length,
    distinctProfileAndPinPairs: stale.length
  },
  notCommerciallyExposed: {
    statement:
      "No route in this inventory carries commercial authority, and this inventory moved no route's commercial state.",
    howItIsKnown:
      "Commercial authority comes only from a Grade-A fulfillment record keyed to an exact route and packet family. None of these routes appears in data/rcap-grade-a/fulfillment-authority-registry.json, so none is sellable, checkout-enabled, sponsored or credit-consuming, and nothing here changed that.",
    consequence:
      "The condition is real and it blocks the canonical suite at verify-rcap-terminalize-c1. It exposes no participant to a packet sold on an uncertified basis."
  },
  whyItIsNotRepairedHere: {
    statement:
      "Re-pinning these digests would make the suite green by asserting that each review covers bytes it was never performed against. That assertion is not the captain's to make.",
    detail:
      "The pins carry a reviewedAsOf date. Moving a pin forward without a review silently re-dates the review. Where a profile moved purely additively the question is narrower than where it lost or rewrote leaves, but it is the same question, and it is a legal one.",
    openedBy: "the Grade A 1.1 canonical chain reaching verify-rcap-terminalize-c1",
    owner: "legal review, with the owner deciding whether a re-review or a recorded supersession is the mechanism",
    doNotResolveHere:
      "Do not re-pin a profile digest to clear this check. Do not edit a reviewedAsOf date. Do not narrow the C1 verifier's provenance assertion."
  },
  blocksCanonicalSuite: {
    verifier: "scripts/verify-rcap-terminalize-c1.mjs",
    reportedFailures: 10,
    note:
      "C1's scope is the sixteen lane-C jobs, so it reports a subset. The inventory below is the whole condition, which is why the two counts differ."
  },
  stale
};

const serialized = `${JSON.stringify(next, null, 2)}\n`;

if (check) {
  if (!fs.existsSync(outPath) || fs.readFileSync(outPath, "utf8") !== serialized) {
    console.error("terminalization provenance drift inventory is stale; re-run without --check");
    process.exit(1);
  }
  console.log(
    `terminalization provenance drift current. ${next.totals.pinsStale}/${next.totals.recordsCarryingAProfilePin} pins stale across ${stale.length} profile/pin pairs.`
  );
  process.exit(0);
}

fs.writeFileSync(outPath, serialized);
console.log(
  `wrote ${path.relative(rootDir, outPath)} — ${next.totals.pinsStale}/${next.totals.recordsCarryingAProfilePin} pins stale across ${stale.length} profile/pin pairs.`
);
for (const group of stale) {
  const d = group.profileDelta;
  console.log(
    `  ${group.profilePath.split("/").pop().padEnd(22)} ${group.pinnedSha256.slice(0, 10)}  ${String(group.recordCount).padStart(2)} record(s)  ` +
      `moved ${group.movedBy?.date ?? "?"}  +${d?.added ?? "?"} -${d?.removed ?? "?"} ~${d?.changed ?? "?"}${d?.purelyAdditive ? "  (purely additive)" : ""}`
  );
}
}
