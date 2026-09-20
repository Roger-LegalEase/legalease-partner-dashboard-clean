#!/usr/bin/env node
/**
 * The transcription-provenance guard.
 *
 * Eight families carry `approved_shipping_component` sections: a heading
 * describing an approved component plus the field ids it uses, and none of its
 * text. The substance exists upstream, in each family's census-v1 build host,
 * and the repair is to carry it into the production specification — the same
 * derivation repair Nevada had.
 *
 * The hazard this guards is that a build host is NOT authority merely because
 * it exists. It is a convenient transcription source only where its output
 * still corresponds to what the owner adopted. Illinois already demonstrated
 * the failure mode: its shipping bytes drifted after adoption, the re-review
 * that recorded the drift is explicitly NOT an approval, and transcribing from
 * the current host would have carried an unapproved post-adoption edit into
 * production wearing the adoption's authority.
 *
 * So, per family, this establishes one of three states:
 *
 *   matches_adopted        the on-disk canonical fixture hashes to the digest
 *                          the owner adopted. The build host reproduces the
 *                          adopted artifact, so it is a proven source.
 *   drift_characterised    the bytes moved, and a committed record names the
 *                          current digest and says what changed. Transcribe the
 *                          ADOPTED substance, using the characterisation to know
 *                          what the current host adds or moves.
 *   drift_uncharacterised  the bytes moved and nothing committed explains them.
 *                          Recover the approved content or version first. Do not
 *                          transcribe.
 *
 * And the rule that makes it bite: a family in `drift_uncharacterised` must not
 * already have transcribed text sitting in its specification.
 *
 * This proves traceability, never approval. A characterised drift is still an
 * unapproved drift; it is simply one whose contents are known.
 */

import { register } from "node:module";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
register("./lib/ts-esm-loader.mjs", import.meta.url);

const failures = [];
const check = (passed, message) => {
  console.log(`${passed ? "ok  " : "FAIL"} ${message}`);
  if (!passed) failures.push(message);
};

const read = (relative) => JSON.parse(fs.readFileSync(path.join(rootDir, relative), "utf8"));
const digestOf = (relative) => {
  const full = path.join(rootDir, relative);
  return fs.existsSync(full) ? crypto.createHash("sha256").update(fs.readFileSync(full)).digest("hex") : null;
};

// ---------------------------------------------------------------------------
// 1. What the owner adopted, per family.
// ---------------------------------------------------------------------------

const adoption = read("data/rcap-grade-a/legal-decisions/OWNER_BATCH_ADOPTION_2026-09-02.json");
const adopted = new Map();
for (const qualification of adoption.adoption.qualifications) {
  for (const [family, fixtures] of Object.entries(qualification.digestConditionRecordedPerFamily ?? {})) {
    adopted.set(family, fixtures);
  }
}
check(adopted.size > 0, `the adoption record pins artifact digests per family (${adopted.size})`);
check(
  /shipping-artifact digest,? requires re-review/i.test(adoption.theConditionThatTravelsWithIt ?? ""),
  "the adoption's own condition is that a shipping-artifact digest change requires re-review"
);

// ---------------------------------------------------------------------------
// 2. Every committed digest anywhere under the Grade-A records, so a drifted
//    artifact can be recognised as traceable rather than unexplained.
// ---------------------------------------------------------------------------

const committedDigests = new Map();
const walk = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) { walk(full); continue; }
    if (!entry.name.endsWith(".json")) continue;
    let text;
    try { text = fs.readFileSync(full, "utf8"); } catch { continue; }
    for (const [, hash] of text.matchAll(/\b([0-9a-f]{64})\b/g)) {
      if (!committedDigests.has(hash)) committedDigests.set(hash, []);
      const where = committedDigests.get(hash);
      const relative = path.relative(rootDir, full);
      if (where.length < 4 && !where.includes(relative)) where.push(relative);
    }
  }
};
walk(path.join(rootDir, "data/rcap-grade-a"));
check(committedDigests.size > 100, `the Grade-A records carry traceable artifact digests (${committedDigests.size})`);

// ---------------------------------------------------------------------------
// 3. The families this guard covers: those carrying approved_shipping_component
//    (still to be transcribed) and those already transcribed.
// ---------------------------------------------------------------------------

const specDir = path.join(rootDir, "data/record-clearing/packet-specifications");
const TRANSCRIBED_MARKERS = ["body", "assertions"];
const families = [];
for (const file of fs.readdirSync(specDir)) {
  if (!file.endsWith(".json")) continue;
  const spec = JSON.parse(fs.readFileSync(path.join(specDir, file), "utf8"));
  const documents = spec.documents ?? [];
  const awaiting = documents.filter((document) =>
    (document.sections ?? []).some((section) => section.kind === "approved_shipping_component"));
  const transcribed = documents.filter((document) => (document.sections ?? [])
    .some((section) => TRANSCRIBED_MARKERS.some((marker) => {
      const value = section[marker];
      return typeof value === "string" ? value.trim().length > 0 : Array.isArray(value) && value.length > 0;
    })));
  if (awaiting.length === 0 && transcribed.length === 0) continue;
  const key = [...adopted.keys()].find((name) =>
    name === spec.packetSetId || name === `${spec.trackId}-set` || (spec.trackId && name.includes(spec.trackId)));
  families.push({ spec, file, awaiting: awaiting.length, transcribed: transcribed.length, key });
}
check(families.length > 0, `there are families to classify (${families.length})`);

// ---------------------------------------------------------------------------
// 4. Classify, and enforce the rule.
// ---------------------------------------------------------------------------

const verdicts = [];
for (const family of families.sort((a, b) => a.spec.routeKey.localeCompare(b.spec.routeKey))) {
  if (!family.key) {
    verdicts.push({ ...family, state: "not_in_adoption" });
    continue;
  }
  const canonical = (adopted.get(family.key) ?? []).find((fixture) => fixture.fixture === "canonical");
  if (!canonical) {
    verdicts.push({ ...family, state: "not_in_adoption" });
    continue;
  }
  const onDisk = digestOf(canonical.file);
  if (onDisk === canonical.sha256) {
    verdicts.push({ ...family, state: "matches_adopted", adoptedSha: canonical.sha256, onDisk });
    continue;
  }
  const traceable = onDisk ? committedDigests.get(onDisk) ?? [] : [];
  verdicts.push({
    ...family,
    state: traceable.length > 0 ? "drift_characterised" : "drift_uncharacterised",
    adoptedSha: canonical.sha256,
    onDisk,
    recordedIn: traceable
  });
}

console.log("");
for (const verdict of verdicts) {
  const counts = `awaiting=${verdict.awaiting} transcribed=${verdict.transcribed}`;
  console.log(`${verdict.state.toUpperCase().padEnd(21)} ${verdict.spec.routeKey}  (${counts})`);
  if (verdict.state === "drift_characterised") {
    console.log(`                      adopted ${verdict.adoptedSha.slice(0, 16)}… -> on disk ${verdict.onDisk.slice(0, 16)}…`);
    for (const where of verdict.recordedIn) console.log(`                      recorded in ${where}`);
  }
  if (verdict.state === "drift_uncharacterised") {
    console.log(`                      adopted ${verdict.adoptedSha.slice(0, 16)}… -> on disk ${String(verdict.onDisk).slice(0, 16)}… — NOTHING COMMITTED EXPLAINS THIS`);
  }
}
console.log("");

// The rule. A family whose bytes moved for reasons nothing records is not a
// transcription source, and must not already have text carried into it.
const transcribedFromUnexplained = verdicts.filter((verdict) =>
  verdict.state === "drift_uncharacterised" && verdict.transcribed > 0);
check(
  transcribedFromUnexplained.length === 0,
  `no family with uncharacterised drift has transcribed text in its specification${
    transcribedFromUnexplained.length ? `: ${transcribedFromUnexplained.map((v) => v.spec.routeKey).join(", ")}` : ""}`
);

// Every family still awaiting transcription must have a state that tells the
// next agent what to do. "not_in_adoption" is not one of them: a family whose
// artifact the owner never adopted has no adopted substance to carry.
const awaitingFamilies = verdicts.filter((verdict) => verdict.awaiting > 0);
check(awaitingFamilies.length > 0, `families awaiting transcription are classified (${awaitingFamilies.length})`);
const unclassified = awaitingFamilies.filter((verdict) => verdict.state === "not_in_adoption");
check(
  unclassified.length === 0,
  `every family awaiting transcription is covered by the adoption${
    unclassified.length ? `; not covered: ${unclassified.map((v) => v.spec.routeKey).join(", ")}` : ""}`
);

// ---------------------------------------------------------------------------
// 5. Nevada, the one family already transcribed, stated in full.
//
// Its bytes moved twice after adoption, and both hops are characterised. Neither
// touches the three components whose text was carried: FIX07 removed a route
// footer from the proposed order and changed nothing substantive; FIX72 changed
// exactly the final stop bullet of the referral page, which is a component that
// was deliberately NOT transcribed.
// ---------------------------------------------------------------------------

const nevada = verdicts.find((verdict) => verdict.spec.routeKey.startsWith("NV:probation-or-specialty"));
check(Boolean(nevada), "Nevada is covered by this guard");
check(nevada?.transcribed > 0, `Nevada's specification carries transcribed text (${nevada?.transcribed ?? 0} documents)`);
check(
  nevada?.state === "drift_characterised",
  `Nevada's post-adoption drift is characterised rather than unexplained (got ${nevada?.state})`
);

const fix07 = read("data/rcap-grade-a/packet-factory-24h/fix07/nv-seal-probation-pagination-return.json");
check(
  fix07.oldArtifacts?.some((artifact) => artifact.sha256 === nevada?.adoptedSha),
  "FIX07 records the adopted digest as the artifact it changed, so the chain starts at the adoption"
);
check(
  /No legal theory, component, filing destination, fee, service statement, or substantive instruction changed/
    .test(fix07.exactRepair ?? ""),
  "FIX07 records its change as non-substantive"
);
check(
  /proposed_order/.test(fix07.exactRepair ?? ""),
  "and confines it to the proposed order, not to the petition or the declaration"
);

console.log(`\n${failures.length === 0 ? "PASS" : "FAIL"} — ${failures.length} failing check(s)`);
if (failures.length > 0) {
  for (const failure of failures) console.log(`  - ${failure}`);
  process.exitCode = 1;
}
