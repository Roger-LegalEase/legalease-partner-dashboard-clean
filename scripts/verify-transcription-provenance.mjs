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

// ---------------------------------------------------------------------------
// 6. Per COMPONENT, not per family.
//
// `drift_characterised` at family level does not authorize the current build
// host as a source. A characterisation proves what changed; a change elsewhere
// in the packet certifies nothing about this page. So every component carried
// in by this derivation-repair program records its own binding, and the
// equivalence it claims has to be available given its family's state.
//
// The covered set is this program's own work, named explicitly. It is the eight
// families that carried approved_shipping_component plus Nevada, which was
// transcribed first. Specification text that predates the program — Mississippi
// non-conviction's, North Dakota's, Virginia's — is deliberately out of scope:
// this control governs what the program carries in, and claiming provenance for
// text it did not carry would be asserting something nobody established.
// ---------------------------------------------------------------------------

const TRANSCRIPTION_PROGRAM = new Set([
  "NV:probation-or-specialty-court-dismissal-set-aside-sealing",
  "DC:dc_actual_innocence_expungement_16_803",
  "GA:restriction-and-sealing-of-a-pardoned-felony",
  "GA:sb-288-misdemeanor-conviction-restriction-and-sealing",
  "IL:criminal-identity-theft-mistaken-identity-relief",
  "MS:additional-justice-court-misdemeanor-relief-9-11-15-3",
  "MS:first-offender-nontraffic-misdemeanor-conviction-expungement-99-19-71-1",
  "SD:suspended-imposition-of-sentence-sealing",
  "WY:felony-conviction-expungement-w-s-7-13-1502"
]);

const EQUIVALENCE_AVAILABLE_IN = {
  matches_adopted: new Set(["exact_adopted_bytes", "recovered_from_adopted"]),
  drift_characterised: new Set(["untouched_by_drift", "drift_outside_substance", "recovered_from_adopted"]),
  drift_uncharacterised: new Set(["recovered_from_adopted"]),
  not_in_adoption: new Set(["recovered_from_adopted"])
};

const hasText = (section) => ["body", "assertions"].some((marker) => {
  const value = section[marker];
  return typeof value === "string" ? value.trim().length > 0 : Array.isArray(value) && value.length > 0;
});

let componentsChecked = 0;
const missingBinding = [];
const impossibleClaim = [];
const thinEvidence = [];
for (const verdict of verdicts) {
  if (!TRANSCRIPTION_PROGRAM.has(verdict.spec.routeKey)) continue;
  for (const document of verdict.spec.documents ?? []) {
    const carriesText = (document.sections ?? []).some(hasText);
    const awaiting = (document.sections ?? []).some((section) => section.kind === "approved_shipping_component");
    if (!carriesText || awaiting) continue;
    componentsChecked += 1;
    const binding = document.transcriptionProvenance;
    const where = `${verdict.spec.routeKey}|${document.documentId}`;
    if (!binding) { missingBinding.push(where); continue; }
    const allowed = EQUIVALENCE_AVAILABLE_IN[verdict.state] ?? new Set();
    if (!allowed.has(binding.componentEquivalence)) {
      impossibleClaim.push(`${where} claims ${binding.componentEquivalence} while its family is ${verdict.state}`);
    }
    if (binding.componentEquivalence !== "exact_adopted_bytes"
      && (typeof binding.evidence !== "string" || binding.evidence.trim().length < 80)) {
      thinEvidence.push(where);
    }
    if (binding.adoptedDigest !== verdict.adoptedSha) {
      impossibleClaim.push(`${where} names adopted digest ${String(binding.adoptedDigest).slice(0, 16)}… and the adoption pins ${String(verdict.adoptedSha).slice(0, 16)}…`);
    }
  }
}

check(componentsChecked > 0, `components carried in by this program are audited (${componentsChecked})`);
check(
  missingBinding.length === 0,
  `every carried component records where its text came from${missingBinding.length ? `; missing on ${missingBinding.join(", ")}` : ""}`
);
check(
  impossibleClaim.length === 0,
  `no component claims an equivalence its family's state cannot support${impossibleClaim.length ? `: ${impossibleClaim.join("; ")}` : ""}`
);
check(
  thinEvidence.length === 0,
  `every equivalence short of exact adopted bytes argues for itself${thinEvidence.length ? `; thin on ${thinEvidence.join(", ")}` : ""}`
);

// The refinement that matters for Illinois and Mississippi: in a drifted
// family, a component may not simply be declared untouched. Something has to
// say so, and the check above requires the argument. This states the rule once
// more where it is easiest to read.
const inDriftedFamilies = verdicts
  .filter((verdict) => verdict.state !== "matches_adopted" && TRANSCRIPTION_PROGRAM.has(verdict.spec.routeKey))
  .flatMap((verdict) => (verdict.spec.documents ?? [])
    .filter((document) => document.transcriptionProvenance)
    .map((document) => ({ where: `${verdict.spec.routeKey}|${document.documentId}`, binding: document.transcriptionProvenance })));
const unargued = inDriftedFamilies.filter(({ binding }) => binding.componentEquivalence === "exact_adopted_bytes");
check(
  unargued.length === 0,
  `no component in a drifted family claims exact adopted bytes${unargued.length ? `: ${unargued.map((row) => row.where).join(", ")}` : ""}`
);

// ---------------------------------------------------------------------------
// 7. The source-to-artifact bridge.
//
// `matches_adopted` proves the FIXTURE equals the adopted artifact. It does not
// prove that today's build host is what produced those bytes: a host can be
// edited without anyone regenerating, and the fixture on disk would go on
// matching the adoption while the source that claims to produce it no longer
// does. So `exact_adopted_bytes` may be claimed from a current host only with a
// direct bridge:
//
//   A. regenerate the family from the current host and show the resulting
//      artifact digest equals the adopted digest; or
//   B. take the text from the exact historical or adopted source version bound
//      to the approved artifact instead of from today's host.
//
// Route A was run for the exact-match families. Two reproduce the adopted bytes
// exactly. Three cannot be regenerated here at all, because their build hosts
// require the Master Library corpus that is not mounted in this environment —
// an external blocker that already exists on the board, not a new finding. For
// those, route B is the available bridge.
// ---------------------------------------------------------------------------

const REGENERATION_BRIDGE = {
  "WY:felony-conviction-expungement-w-s-7-13-1502": {
    proven: true,
    detail: "scripts/build-census-v1-wy_fel_1502-set.mjs regenerated in place; the canonical fixture hashed 3dcdbc4ec3d9f08b6c6302b84f254663aa9302a4f712d7451000e2ecda302e30 before and after, which is the digest the adoption pins. Nothing in the family directory changed."
  },
  "SD:suspended-imposition-of-sentence-sealing": {
    proven: true,
    detail: "scripts/build-census-v1-composed-treatment:sd_sis_sealing.mjs regenerated in place; both fixtures came back byte-identical and the canonical digest d74ec3c175844dbe… is the one the adoption pins. Only build metadata moved, because the run used --no-raster, and it was restored."
  },
  "DC:dc_actual_innocence_expungement_16_803": {
    proven: false,
    detail: "cannot be regenerated in this environment: the build host asserts the Master Library corpus is mounted at private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1, which is the existing GA-8-22E1 external blocker. Use route B, or regenerate once the corpus is mounted."
  },
  "GA:restriction-and-sealing-of-a-pardoned-felony": {
    proven: false,
    detail: "same corpus assertion, via scripts/build-census-v1-ga-host.mjs. Use route B, or regenerate once the corpus is mounted."
  },
  "GA:sb-288-misdemeanor-conviction-restriction-and-sealing": {
    proven: false,
    detail: "same corpus assertion, via scripts/build-census-v1-ga-host.mjs. Use route B, or regenerate once the corpus is mounted."
  }
};

const CURRENT_HOST = /^scripts\//;
const unbridged = [];
for (const verdict of verdicts) {
  if (!TRANSCRIPTION_PROGRAM.has(verdict.spec.routeKey)) continue;
  for (const document of verdict.spec.documents ?? []) {
    const binding = document.transcriptionProvenance;
    if (!binding || binding.componentEquivalence !== "exact_adopted_bytes") continue;
    if (!CURRENT_HOST.test(binding.sourceUsed ?? "")) continue;
    if (REGENERATION_BRIDGE[verdict.spec.routeKey]?.proven !== true) {
      unbridged.push(`${verdict.spec.routeKey}|${document.documentId}`);
    }
  }
}
check(
  unbridged.length === 0,
  `no component claims exact adopted bytes from a current build host without a proven regeneration bridge${
    unbridged.length ? `: ${unbridged.join(", ")}` : ""}`
);

console.log("source-to-artifact bridge, exact-match families:");
for (const [route, bridge] of Object.entries(REGENERATION_BRIDGE)) {
  console.log(`  ${bridge.proven ? "PROVEN    " : "UNAVAILABLE"} ${route}`);
  if (!bridge.proven) console.log(`              ${bridge.detail.slice(0, 120)}…`);
}
const provenBridges = Object.values(REGENERATION_BRIDGE).filter((bridge) => bridge.proven).length;
check(
  provenBridges > 0,
  `at least one exact-match family has a proven source-to-artifact bridge (${provenBridges} of ${Object.keys(REGENERATION_BRIDGE).length})`
);

console.log(`\n${failures.length === 0 ? "PASS" : "FAIL"} — ${failures.length} failing check(s)`);
if (failures.length > 0) {
  for (const failure of failures) console.log(`  - ${failure}`);
  process.exitCode = 1;
}
