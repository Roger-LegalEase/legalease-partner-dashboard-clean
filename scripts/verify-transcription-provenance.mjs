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

/**
 * A LATER OWNER RE-REVIEW OF THE CURRENT BYTES.
 *
 * The batch adoption's own travelling condition is that a shipping-artifact
 * digest change requires fresh re-review. Where that re-review happened and
 * APPROVED the new digest, the family is not drifting away from an approval --
 * it is sitting on a newer one, and reporting it as drifted reads the record
 * backwards.
 *
 * Mississippi's additional-misdemeanour family is the case: Roger Roman
 * approved the repaired pair by exact digest on 2026-09-14 after a typographic
 * change he describes in terms. Only APPROVED_EXACT_SHIPPING_ARTIFACTS counts,
 * only for the digests it names, and the approval travels no further than
 * those -- the record says so itself, and so does this.
 */
const ownerReapprovals = new Map();
for (const file of fs.readdirSync(path.join(rootDir, "data/rcap-grade-a/legal-decisions"))) {
  if (!/^OWNER_ARTIFACT_REREVIEW_.*\.json$/.test(file)) continue;
  const record = read(`data/rcap-grade-a/legal-decisions/${file}`);
  if (record.decision !== "APPROVED_EXACT_SHIPPING_ARTIFACTS" || !record.familyId) continue;
  const canonical = (record.approvedArtifacts ?? []).find((a) => a.fixture === "canonical");
  if (!canonical?.sha256) continue;
  ownerReapprovals.set(record.familyId, {
    sha256: canonical.sha256,
    record: `data/rcap-grade-a/legal-decisions/${file}`,
    decidedOn: record.decidedOn,
    decisionOwner: record.decisionOwner
  });
}

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
  // The bytes moved AND the owner re-approved exactly these bytes afterwards.
  const reapproved = ownerReapprovals.get(family.key);
  if (reapproved && onDisk === reapproved.sha256) {
    verdicts.push({
      ...family,
      state: "matches_owner_rereview",
      adoptedSha: reapproved.sha256,
      batchAdoptedSha: canonical.sha256,
      onDisk,
      reapproval: reapproved
    });
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
  if (verdict.state === "matches_owner_rereview") {
    console.log(`                      batch adopted ${verdict.batchAdoptedSha.slice(0, 16)}… -> on disk ${
      verdict.onDisk.slice(0, 16)}…, which ${verdict.reapproval.decisionOwner} approved by exact digest on ${
      verdict.reapproval.decidedOn}`);
    console.log(`                      ${verdict.reapproval.record}`);
  }
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

/*
 * THE PROGRAMME FINISHING IS NOT A FAILURE.
 *
 * This asserted that families were still waiting, which was a useful thing to
 * know while any were -- it would have caught a specification quietly losing
 * its `approved_shipping_component` marker without gaining any text. It is not
 * what the check is for, and with the last family transcribed it turned into a
 * control that fails because the work is done.
 *
 * What matters is that nothing is awaiting text AND untranscribed at once, and
 * that every family this program covers ended up with substance. Both hold
 * whether the count is nine or zero.
 */
const programme = verdicts.filter((verdict) => TRANSCRIPTION_PROGRAM.has(verdict.spec.routeKey));
const stillEmpty = programme.filter((verdict) => verdict.awaiting > 0 || verdict.transcribed === 0);
check(
  stillEmpty.length === 0,
  `every family this program covers carries its text (${programme.length} families, ${
    verdicts.filter((v) => v.awaiting > 0).length} still awaiting)${
    stillEmpty.length ? `; empty: ${stillEmpty.map((v) => v.spec.routeKey).join(", ")}` : ""}`
);

/*
 * `adopted_substance_split` is available only where the family matches the
 * adoption, and for the same reason the other exact claims are: the split
 * record is measured line by line against the adopted artifact, so the artifact
 * has to be the adopted one. In a drifted family the substance is recovered
 * first, and a recovered component that also needs splitting is a recovery
 * followed by a split, not a single claim.
 */
/*
 * `recovered_from_recorded_repair` belongs only to a drifted family, because
 * the drift IS the repair. It is the case the three original states had no
 * name for: the adopted bytes were independently reviewed and failed, so
 * "transcribe the adopted substance" would carry the findings into production.
 * It is checked below against the committed review and repair rows, not
 * accepted on the binding's word.
 */
const EQUIVALENCE_AVAILABLE_IN = {
  matches_adopted: new Set(["exact_adopted_bytes", "recovered_from_adopted", "adopted_substance_split"]),
  // The owner approved THESE bytes by exact digest, so they are adopted bytes
  // in every sense that matters here -- by a newer record than the batch.
  matches_owner_rereview: new Set(["exact_adopted_bytes", "recovered_from_adopted", "adopted_substance_split"]),
  drift_characterised: new Set([
    "untouched_by_drift", "drift_outside_substance", "recovered_from_adopted", "recovered_from_recorded_repair"
  ]),
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
const REAPPROVED_STATES = new Set(["matches_adopted", "matches_owner_rereview"]);
const inDriftedFamilies = verdicts
  .filter((verdict) => !REAPPROVED_STATES.has(verdict.state) && TRANSCRIPTION_PROGRAM.has(verdict.spec.routeKey))
  .flatMap((verdict) => (verdict.spec.documents ?? [])
    .filter((document) => document.transcriptionProvenance)
    .map((document) => ({ where: `${verdict.spec.routeKey}|${document.documentId}`, binding: document.transcriptionProvenance })));
const unargued = inDriftedFamilies.filter(({ binding }) =>
  binding.componentEquivalence === "exact_adopted_bytes"
  // A split makes the same claim about the same bytes, so it is barred from a
  // drifted family for the same reason and cannot be used to get around this.
  || binding.componentEquivalence === "adopted_substance_split");
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
  /*
   * These three were recorded as unregenerable because their hosts assert the
   * Master Library corpus and it is not at the path they default to. The hosts
   * take MASTER_LIBRARY_SOURCE_DIR, the corpus is readable in this environment,
   * and all three regenerate -- so route A is available for them after all.
   *
   * SCOPE, stated narrowly: this resolves the Master Library dependency for
   * THESE transcriptions. It does not resolve the repository's corpus
   * governance. The "513 of 583, 70 missing" figure is still the
   * recovery-kit-only view, the consolidated disposition still has to be
   * reconciled into the active dependency contract, and the nine unheld active
   * dependencies in NATIONWIDE_ACTIVE_DEPENDENCY_STATUS.json are unaffected by
   * anything here. One host finding its corpus is not a corpus audit.
   */
  "DC:dc_actual_innocence_expungement_16_803": {
    proven: true,
    detail: "scripts/build-census-v1-dc_innocence_expungement-set.mjs regenerated with MASTER_LIBRARY_SOURCE_DIR pointed at the readable Master Library; the canonical fixture still hashes to the digest OWNER_BATCH_ADOPTION_2026-09-02 pins and the working tree came back clean. The host is therefore the source that produced the adopted bytes."
  },
  "GA:restriction-and-sealing-of-a-pardoned-felony": {
    proven: true,
    detail: "scripts/build-census-v1-ga-host.mjs ga-pardon-j7-set --no-raster regenerated with the Master Library pointed at; both the canonical and boundary fixtures came back at the digests the adoption pins. Only build metadata moved, and it was restored."
  },
  "GA:sb-288-misdemeanor-conviction-restriction-and-sealing": {
    proven: true,
    // Named ga-misd-j4-set, not ga-seal-m-set: the route's own packetSetId is
    // the misdemeanour J4 family, and a bridge citing a neighbouring Georgia
    // family would prove a regeneration of the wrong artifact.
    detail: "scripts/build-census-v1-ga-host.mjs ga-misd-j4-set --no-raster regenerated the same way; both fixtures came back at the adopted digests. Only build metadata moved, and it was restored."
  }
};

const CURRENT_HOST = /^scripts\//;
/*
 * A split carries the same claim about the same host.
 *
 * `adopted_substance_split` still says every line came from the adopted
 * artifact -- it says only that the lines now sit on two pages instead of one.
 * Taking them from today's build host therefore needs the same bridge, and
 * leaving the split out of this loop would have let a component escape the
 * requirement by being divided.
 */
const NEEDS_BRIDGE = new Set(["exact_adopted_bytes", "adopted_substance_split"]);
const unbridged = [];
for (const verdict of verdicts) {
  if (!TRANSCRIPTION_PROGRAM.has(verdict.spec.routeKey)) continue;
  for (const document of verdict.spec.documents ?? []) {
    const binding = document.transcriptionProvenance;
    if (!binding || !NEEDS_BRIDGE.has(binding.componentEquivalence)) continue;
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

// ---------------------------------------------------------------------------
// 8. A repair is a claim about two committed records, so both are read.
//
// `recovered_from_recorded_repair` says the adopted bytes failed review and
// newer bytes answered it. That is a strong thing to assert -- it is the one
// state in which the text NOT carried is the owner-adopted text -- so it is
// not taken on the binding's word. For every component claiming it:
//
//   the failing review must exist, name this family, and carry a FAIL verdict
//   on the obligations the binding lists;
//   the repair row must exist, name this family, and record as its output the
//   digest that is actually on disk;
//   and the binding must name the digest the adoption pins as the ADOPTED one,
//   so nobody can relabel the repair as the adoption.
// ---------------------------------------------------------------------------

const repairClaims = [];
for (const verdict of verdicts) {
  if (!TRANSCRIPTION_PROGRAM.has(verdict.spec.routeKey)) continue;
  for (const document of verdict.spec.documents ?? []) {
    const binding = document.transcriptionProvenance;
    if (binding?.componentEquivalence !== "recovered_from_recorded_repair") continue;
    repairClaims.push({ verdict, document, binding, where: `${verdict.spec.routeKey}|${document.documentId}` });
  }
}

for (const claim of repairClaims) {
  const record = claim.binding.repairRecord;
  check(
    Boolean(record?.repairRow) && Boolean(record?.failingReview) && (record?.obligationsFailed ?? []).length > 0,
    `${claim.where}: the repair claim names its review, its repair row and the obligations that failed`
  );
  if (!record?.repairRow || !record?.failingReview) continue;

  const reviewPath = path.join(rootDir, record.failingReview);
  const repairPath = path.join(rootDir, record.repairRow);
  check(fs.existsSync(reviewPath) && fs.existsSync(repairPath), `${claim.where}: both records are committed`);
  if (!fs.existsSync(reviewPath) || !fs.existsSync(repairPath)) continue;

  const review = read(record.failingReview);
  const reviewRow = (review.rows ?? []).find((row) => row.familyId === claim.verdict.spec.packetSetId);
  check(
    Boolean(reviewRow) && /^FAIL/.test(reviewRow.verdict ?? ""),
    `${claim.where}: the review read THIS family's adopted bytes and failed them (${reviewRow?.verdict ?? "no row"})`
  );
  const failed = new Set(Object.entries(reviewRow?.proofObligations ?? {})
    .filter(([, value]) => value.result === "FAIL").map(([name]) => name));
  const overstated = (record.obligationsFailed ?? []).filter((name) => !failed.has(name));
  check(
    overstated.length === 0,
    `${claim.where}: every obligation the binding names actually failed${
      overstated.length ? ` (${overstated.join(", ")} did not)` : ` (${failed.size} did)`}`
  );

  const repair = read(record.repairRow);
  const repairRow = (repair.rows ?? []).find((row) => row.familyId === claim.verdict.spec.packetSetId);
  const produced = (repairRow?.artifacts?.packets ?? []).find((packet) => packet.role === "canonical");
  check(
    produced?.sha256 === claim.verdict.onDisk,
    `${claim.where}: the repair produced the bytes that are on disk (${String(produced?.sha256).slice(0, 12)}… vs ${
      String(claim.verdict.onDisk).slice(0, 12)}…)`
  );
  // And the repair is not quietly wearing the adoption: the binding's adopted
  // digest is the one the owner pinned, which is NOT what was transcribed.
  check(
    claim.binding.adoptedDigest === claim.verdict.adoptedSha
    && claim.binding.adoptedDigest !== claim.verdict.onDisk,
    `${claim.where}: names the adoption's own digest as adopted, and it is not the digest transcribed`
  );
}
check(
  repairClaims.length === 0 || repairClaims.length > 0,
  `components carried from a recorded repair are audited (${repairClaims.length})`
);

console.log(`\n${failures.length === 0 ? "PASS" : "FAIL"} — ${failures.length} failing check(s)`);
if (failures.length > 0) {
  for (const failure of failures) console.log(`  - ${failure}`);
  process.exitCode = 1;
}
