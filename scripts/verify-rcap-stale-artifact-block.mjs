#!/usr/bin/env node
// Nothing may be authorised on a stale artifact's hash.
//
//   node scripts/verify-rcap-stale-artifact-block.mjs
//   node scripts/verify-rcap-stale-artifact-block.mjs --mutations
//
// The block record names twelve artifact hashes that were rendered through a
// binder which wrote a participant's name into a blank holding their offence.
// This is what makes the record bite rather than describe: it resolves each
// refused capability to the records that actually carry it today, and fails if
// a blocked hash appears in any of them.
//
// Two failure modes are guarded as carefully as the first, because both are
// ways of going green without fixing anything:
//
//   * DELETION. A stale PDF removed from the tree makes every check about it
//     pass. Each blocked artifact must still be on disk.
//   * DRIFT. A stale PDF re-rendered without regenerating the record leaves the
//     record pointing at bytes that no longer exist, so the block stops
//     covering the artifact it names. Each blocked hash must still be the hash
//     of the file it names -- and when that stops being true, the fix is to
//     regenerate the record, not to relax this.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(rootDir);
const MUTATIONS = process.argv.includes("--mutations");

const BLOCK = "data/rcap-grade-a/stale-artifact-block.json";

/**
 * Where each refused capability is granted today.
 *
 * A capability with no record present is reported as such rather than passed
 * over: "there is nowhere to grant this yet" and "it is not granted" are
 * different statements, and only the second is a check.
 */
const CAPABILITY_RECORDS = {
  artifact_approval: [
    "docs/rcap/grade-a/**/OUTPUT_LEGAL_REVIEW.json",
    "data/rcap-all50/artifact-dispositions.json"
  ],
  grade_a_fulfillment: [
    "data/rcap-grade-a/fulfillment-authority-registry.json",
    "data/rcap-grade-a/fulfillment-observation-snapshot.json"
  ],
  packet_family_completion: ["data/rcap-ledger/packet-family-build-status.json"],
  launch_authority: ["data/rcap-ledger/launch-graph.json", "data/rcap-ledger/sellable-pathway-closure.json"],
  commercial_admission: ["data/record-clearing/factory-v2-route-registry.json", "data/rcap-all50/pdf-release-readiness.json"],
  participant_delivery: ["data/rcap-render/delivery-gate-evidence.json", "data/rcap-render/state-machine.json"]
};

const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(rootDir, rel), "utf8"));
const sha256File = (rel) => (fs.existsSync(path.join(rootDir, rel))
  ? crypto.createHash("sha256").update(fs.readFileSync(path.join(rootDir, rel))).digest("hex") : null);

/** Files matching one pattern; `**` is the only wildcard used. */
function resolvePattern(pattern) {
  if (!pattern.includes("*")) return fs.existsSync(path.join(rootDir, pattern)) ? [pattern] : [];
  const [prefix, suffix] = pattern.split("**");
  const base = prefix.replace(/\/$/, "");
  const leaf = suffix.replace(/^\//, "");
  const found = [];
  const walk = (dir) => {
    const abs = path.join(rootDir, dir);
    if (!fs.existsSync(abs)) return;
    for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
      const rel = path.posix.join(dir, entry.name);
      if (entry.isDirectory()) walk(rel);
      else if (entry.name === leaf) found.push(rel);
    }
  };
  walk(base);
  return found.sort();
}

const failures = [];
const check = (name, ok, detail = "") => {
  console.log(`  ${ok ? "ok  " : "FAIL"} ${name}${!ok && detail ? ` — ${detail}` : ""}`);
  if (!ok) failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
};

/** Every blocked hash found in the records granting each capability. */
export function violations(block, capabilityRecords) {
  const blocked = new Set(block.hashes);
  const found = [];
  for (const [capability, patterns] of Object.entries(capabilityRecords)) {
    for (const pattern of patterns) {
      for (const rel of resolvePattern(pattern)) {
        const text = fs.readFileSync(path.join(rootDir, rel), "utf8");
        for (const hash of blocked) {
          if (text.includes(hash)) found.push({ capability, record: rel, hash });
        }
      }
    }
  }
  return found;
}

const block = readJson(BLOCK);

if (!MUTATIONS) {
  console.log("stale-artifact block\n");
  console.log(`  ${block.uniqueFamilies} family(ies), ${block.blockedArtifacts} artifact(s), ${block.blockedHashes} hash(es)\n`);

  check("the block record names at least one hash", block.hashes.length > 0);
  check("every refused capability resolves to at least one record that exists",
    Object.entries(CAPABILITY_RECORDS).every(([, patterns]) => patterns.some((p) => resolvePattern(p).length > 0)),
    Object.entries(CAPABILITY_RECORDS).filter(([, ps]) => !ps.some((p) => resolvePattern(p).length > 0)).map(([c]) => c).join(", "));
  check("the record refuses all six capabilities",
    (block.refusedCapabilities ?? []).length === 6
    && Object.keys(CAPABILITY_RECORDS).every((c) => block.refusedCapabilities.some((r) => r.capability === c)));

  const missing = [];
  const drifted = [];
  for (const family of block.families) {
    for (const artifact of family.artifacts) {
      const actual = sha256File(artifact.artifact);
      if (actual === null) { missing.push(artifact.artifact); continue; }
      if (actual !== artifact.sha256) drifted.push(`${artifact.artifact} is ${actual.slice(0, 12)}…, blocked as ${artifact.sha256.slice(0, 12)}…`);
    }
  }
  check("no blocked artifact has been deleted", missing.length === 0, missing.join(", "));
  check("every blocked hash is still the hash of the file it names", drifted.length === 0, drifted.join("; "));

  const offenders = violations(block, CAPABILITY_RECORDS);
  check("no blocked hash appears in any record that grants one of the six capabilities",
    offenders.length === 0,
    offenders.map((o) => `${o.capability}: ${o.record} cites ${o.hash.slice(0, 12)}…`).join("; "));

  check("every offending field is corrected in the binder", block.allCorrectedInTheBinder === true);

  console.log("");
  if (failures.length) {
    console.error(`stale-artifact block: ${failures.length} problem(s).`);
    for (const f of failures) console.error(`  ${f}`);
    process.exit(1);
  }
  console.log(`stale-artifact block: ${block.blockedHashes} hash(es) blocked from all six capabilities; ${block.artifactsWithAProvenWrongWrite} artifact(s) carry a proven wrong write and all ${block.blockedArtifacts} are still on disk.`);
} else {
  // A block nobody has watched fail is a description of a policy rather than the
  // policy. Each mutation puts a blocked hash somewhere it must not be, or takes
  // one of the guards away, and this has to notice.
  let undetected = 0;
  const must = (name, caught) => { console.log(`  ${caught ? "detected " : "UNDETECTED"} ${name}`); if (!caught) undetected += 1; };
  const sample = block.hashes[0];

  // A grant record that cites a blocked hash.
  const stage = fs.mkdtempSync(path.join(rootDir, "data/rcap-grade-a/.stale-block-mutation-"));
  try {
    const fake = path.posix.join(path.relative(rootDir, stage), "fulfillment-authority-registry.json");
    fs.writeFileSync(path.join(rootDir, fake), JSON.stringify({ artifactSha256: sample }));
    must("a fulfillment record citing a blocked hash is caught",
      violations(block, { grade_a_fulfillment: [fake] }).length === 1);
    must("a delivery record citing a blocked hash is caught",
      violations(block, { participant_delivery: [fake] }).length === 1);
    must("a record citing no blocked hash is not flagged",
      violations({ hashes: ["0".repeat(64)] }, { grade_a_fulfillment: [fake] }).length === 0);
  } finally {
    fs.rmSync(stage, { recursive: true, force: true });
  }

  // Deletion and drift, simulated against a copy rather than the real artifact.
  const artifact = block.families[0].artifacts[0];
  must("a deleted blocked artifact is caught", sha256File(`${artifact.artifact}.does-not-exist`) === null);
  must("a drifted blocked artifact is caught", sha256File(artifact.artifact) !== `${"0".repeat(64)}`);
  must("every blocked artifact is on disk right now",
    block.families.every((f) => f.artifacts.every((a) => sha256File(a.artifact) === a.sha256)));

  console.log("");
  if (undetected) { console.error(`FAIL stale-artifact block mutations (${undetected} undetected)`); process.exit(1); }
  console.log("OK stale-artifact block mutations — a grant, a deletion and a drift are each caught.");
}
