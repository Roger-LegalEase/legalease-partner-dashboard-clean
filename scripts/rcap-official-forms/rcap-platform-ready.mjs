// Whether an independent reviewer approved the EXACT bytes now on disk.
//
// `platform_ready` is the one disposition that is an end state rather than a
// description of what is wrong, so it is derived from measured evidence and
// never asserted. Every clause here is checked against something that was read
// off disk elsewhere: the approval has to name artifact hashes, and those hashes
// have to be what is actually in the family package now.
//
// This lives in one shared module because two generators need the answer and
// they cannot ask each other. The master list already reads the register, so a
// register that read the master list back would close a cycle — the same defect
// that once had the factory registry and the PDF register each waiting on the
// other. Both import this instead, and there is exactly one implementation of
// what "approved" means.
//
// The distinction this exists to protect: a GLOBAL RELEASE HOLD IS NOT A DEFECT.
// An asset can be technically and visually approved and still be unavailable
// everywhere because nationwideLaunchAuthorized is false, or because an edition
// is switched off. That is a decision about when to ship, not a finding about
// the form. Counting it as a defect made the corpus permanently unfinishable:
// no amount of correction could clear a flag that only a release decision
// clears, so a form that had been reviewed four times and measured against its
// own bytes still reported as problematic.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

/** Holds that describe WHEN a thing ships, not WHETHER it is correct. */
export const RELEASE_STATE_HOLDS = new Set([
  "state_manifest_generation_allowed_no",
  "edition_1_runtime_disabled",
  "nationwide_launch_not_authorized",
  "global_runtime_disabled"
]);

/** Holds that a completed independent review discharges. */
export const REVIEW_REQUIRED_HOLDS = new Set([
  "f_independent_visual_review_required",
  "independent_visual_review_required",
  "independent_technical_review_required"
]);

const sha256File = (file) => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");

/** The verdict an overlay profile has to carry. */
export const PROFILE_APPROVED_VERDICT = "approved_for_platform_ready";

/** The verdict a canonical independent-review record has to carry. */
export const REVIEW_APPROVED_VERDICT = "approved_platform_ready";

/** The review lane's verdict vocabulary, in full. A record outside it is not a record. */
export const REVIEW_VERDICTS = new Set([
  "approved_platform_ready",
  "correction_required",
  "source_identity_unresolved",
  "substantive_owner_decision_required"
]);

/**
 * The approval an overlay profile carries for one asset's family packages.
 *
 * `artifacts` is the finalized-artifact audit's view of this asset, so
 * "finalized with no recorded failure" is answered by what the audit read off
 * disk rather than by what a profile claims about itself.
 */
export function overlayProfileApproval({ overlayDir, familyIds, artifacts }) {
  for (const familyId of familyIds ?? []) {
    const slug = familyId.includes(":") ? familyId.split(":")[1] : familyId;
    const stateDirs = fs.existsSync(overlayDir) ? fs.readdirSync(overlayDir) : [];
    for (const state of stateDirs) {
      const dir = path.join(overlayDir, state, slug);
      const profilePath = path.join(dir, "overlay-profile.json");
      if (!fs.existsSync(profilePath)) continue;
      let profile;
      try { profile = JSON.parse(fs.readFileSync(profilePath, "utf8")); } catch { continue; }
      const review = profile.independentReview ?? null;
      // One asset can cover several family packages — CR-266 covers both
      // cr-266-en and cr-266-form-en, and only one carries the profile and the
      // artifacts. Returning on the first family without a review concluded
      // "unreviewed" before looking at the family that was reviewed.
      if (review?.verdict !== PROFILE_APPROVED_VERDICT) continue;

      const round = [...(review.rounds ?? [])].reverse().find((r) => r.verdict === PROFILE_APPROVED_VERDICT);
      const approvedHashes = round?.reviewedArtifactSha256 ?? null;
      if (!approvedHashes) return { approved: false, reason: "the approval does not name the artifact hashes it approved" };

      // The approval must be of the bytes that are here now.
      for (const [relative, sha] of Object.entries(approvedHashes)) {
        const file = path.join(dir, relative);
        if (!fs.existsSync(file)) return { approved: false, reason: `${relative} is named by the approval and is not on disk` };
        if (sha256File(file) !== sha) return { approved: false, reason: `${relative} has changed since it was approved` };
      }

      const classificationPath = path.join(dir, "field-classification.json");
      const classification = fs.existsSync(classificationPath)
        ? JSON.parse(fs.readFileSync(classificationPath, "utf8"))
        : null;
      if (!classification
        || Number(classification.classifiedFieldsOrAnchors) !== Number(classification.discoveredFieldsOrAnchors)
        || Number(classification.discoveredFieldsOrAnchors) === 0) {
        return { approved: false, reason: "the field or anchor classification is not complete" };
      }

      if (!Array.isArray(artifacts) || artifacts.length === 0
        || !artifacts.every((a) => a.finalized && (a.failures ?? []).length === 0)) {
        return { approved: false, reason: "not every artifact is finalized with no recorded failure" };
      }

      return {
        approved: true,
        rounds: (review.rounds ?? []).length,
        approvedArtifacts: Object.keys(approvedHashes),
        reason: `independent review approved these exact bytes after ${(review.rounds ?? []).length} round(s)`
      };
    }
  }
  return { approved: false, reason: "no overlay profile carries an independent review for this family" };
}

// ---------------------------------------------------------------------------
// The second approval channel.
//
// The overlay profile was the only place the gate ever looked, and 26 of the 27
// independently reviewed families are AcroForm-fill: they carry
// production-field-map.json, which has no independentReview field and never
// will. Their reviews were complete, exact-hash bound and independent, and the
// gate had no supported way to read them, so a clean review could not move the
// count. This channel is that way in.
//
// It is a second SOURCE, not a second SYSTEM. Both channels answer the same
// question through the same function, and this one is strictly the stricter of
// the two: every clause the profile channel checks is checked here as well,
// plus the source binary, the field map, the provenance sidecar, the visual
// evidence, the independence of the reviewer and the currency of the record.
// Nothing here can approve something the profile channel would refuse.
// ---------------------------------------------------------------------------

const HEX64 = /^[0-9a-f]{64}$/;
const HEX40 = /^[0-9a-f]{40}$/;

const REVIEW_BATCH_SCHEMA = "rcap-pdf-independent-review-batch/";

/** Every field that, if present and non-empty, means a correction is still open. */
const CORRECTION_FIELDS = ["corrections", "smallestCorrection", "secondCorrection", "thirdCorrection"];

function readJsonOrNull(file) {
  try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch { return null; }
}

/**
 * The canonical review records on disk, keyed by family.
 *
 * The format is the one the review lane already produces and is not restated
 * here: a `<batch>-manifest.json` freeze carrying the hashes, a set of
 * `<batch>-group-N.review.json` files carrying the verdicts, and a
 * `<batch>-verdicts.json` rollup. Discovering them rather than declaring them
 * is what keeps this from becoming a competing schema.
 */
export function loadReviewRecords(reviewsDir) {
  const byFamily = new Map();
  const batches = [];
  if (!reviewsDir || !fs.existsSync(reviewsDir)) return { byFamily, batches };

  for (const file of fs.readdirSync(reviewsDir).sort()) {
    if (!file.endsWith("-manifest.json")) continue;
    const manifest = readJsonOrNull(path.join(reviewsDir, file));
    if (!manifest || !String(manifest.schemaVersion ?? "").startsWith(REVIEW_BATCH_SCHEMA)) continue;
    const batchId = manifest.batch ?? file.replace("-manifest.json", "");

    const groups = fs.readdirSync(reviewsDir)
      .filter((f) => f.startsWith(`${batchId}-group-`) && f.endsWith(".review.json"))
      .sort()
      .map((f) => ({ file: f, body: readJsonOrNull(path.join(reviewsDir, f)) }))
      .filter((g) => g.body);
    const rollup = readJsonOrNull(path.join(reviewsDir, `${batchId}-verdicts.json`));

    const verdictsByFamily = new Map();
    const seenIn = new Map();
    for (const group of groups) {
      for (const verdict of group.body.verdicts ?? []) {
        if (seenIn.has(verdict.family)) seenIn.get(verdict.family).push(group.file);
        else seenIn.set(verdict.family, [group.file]);
        verdictsByFamily.set(verdict.family, { ...verdict, groupFile: group.file, group: group.body.group ?? null });
      }
    }

    const batch = {
      batchId,
      manifestFile: file,
      manifest,
      groups,
      rollup,
      seenIn,
      reviewerBranch: rollup?.reviewerBranch ?? groups[0]?.body?.reviewerBranch ?? null,
      reviewedLaneBranch: manifest.reviewedLaneBranch ?? rollup?.reviewedLaneBranch ?? null,
      reviewedLaneHead: manifest.reviewedLaneHead ?? rollup?.reviewedLaneHead ?? null,
      withdrawn: manifest.withdrawn === true || rollup?.withdrawn === true,
      supersededBy: manifest.supersededBy ?? rollup?.supersededBy ?? null
    };
    batches.push(batch);

    for (const family of manifest.families ?? []) {
      const record = { batch, family, verdict: verdictsByFamily.get(family.familyId) ?? null };
      if (byFamily.has(family.familyId)) byFamily.get(family.familyId).push(record);
      else byFamily.set(family.familyId, [record]);
    }
  }
  return { byFamily, batches };
}

/**
 * Condition 2, and the whole of the record-level review verifier.
 *
 * One implementation, called both by the gate — which refuses a record that
 * does not pass — and by scripts/verify-rcap-pdf-independent-review-records.mjs,
 * which reports the same problems for CI. A verifier that reimplemented this
 * would be a second definition of a valid record.
 */
export function validateReviewRecords(reviewsDir) {
  const { byFamily, batches } = loadReviewRecords(reviewsDir);
  const problems = [];
  const note = (batchId, message) => problems.push({ batchId, message });

  for (const batch of batches) {
    const { manifest, batchId } = batch;
    if (!batch.reviewerBranch) note(batchId, "the record does not say who reviewed it");
    if (!batch.reviewedLaneBranch) note(batchId, "the record does not say what it reviewed");
    if (batch.reviewerBranch && batch.reviewerBranch === batch.reviewedLaneBranch) {
      note(batchId, "the reviewer branch and the reviewed branch are the same, so the record is not independent");
    }
    if (!batch.reviewedLaneHead || !HEX40.test(String(batch.reviewedLaneHead))) {
      note(batchId, "the record does not pin the head it was taken against");
    }
    if (!Array.isArray(manifest.families) || manifest.families.length === 0) {
      note(batchId, "the frozen manifest names no families");
    }
    if (!batch.groups.length) note(batchId, "the batch carries no group review file");

    for (const [family, files] of batch.seenIn) {
      if (files.length > 1) note(batchId, `${family} carries a verdict in ${files.length} groups; groups must be disjoint`);
      if (!(manifest.families ?? []).some((f) => f.familyId === family)) {
        note(batchId, `${family} carries a verdict but is not in the frozen manifest`);
      }
    }

    for (const family of manifest.families ?? []) {
      const verdict = batch.seenIn.has(family.familyId);
      if (!verdict) note(batchId, `${family.familyId} is frozen for review and carries no verdict`);
      for (const [field, value] of Object.entries({
        sourceSha256: family.sourceSha256,
        fieldClassificationSha256: family.fieldClassificationSha256,
        provenanceSha256: family.provenanceSha256,
        contactSheetSha256: family.contactSheetSha256
      })) {
        if (value != null && !HEX64.test(String(value))) note(batchId, `${family.familyId}.${field} is not a SHA-256`);
      }
      for (const artifact of family.artifacts ?? []) {
        if (!HEX64.test(String(artifact.sha256 ?? ""))) {
          note(batchId, `${family.familyId} names ${artifact.rel} without a SHA-256`);
        }
      }
    }

    for (const group of batch.groups) {
      for (const verdict of group.body.verdicts ?? []) {
        if (!REVIEW_VERDICTS.has(verdict.verdict)) {
          note(batchId, `${verdict.family} carries the verdict "${verdict.verdict}", which is outside the vocabulary`);
        }
      }
    }
  }

  return { ok: problems.length === 0, problems, batches: batches.length, families: byFamily.size };
}

/**
 * Where the blank official form actually is, if it is anywhere.
 *
 * Condition 3 compares the reviewed source SHA against the current source
 * binary, which means there has to BE one. The corpus is git-ignored, so this
 * looks for a materialised family copy first and the mounted corpus second, and
 * returns null rather than a guess.
 */
function resolveSourceBinary(familyDir, sourceRecord, corpusRoots) {
  const local = [
    path.join(familyDir, "source.pdf"),
    path.join(familyDir, "source", "source.pdf")
  ];
  const bundlePath = sourceRecord?.canonicalBundlePath ?? null;
  if (bundlePath) {
    local.push(path.join(familyDir, "source", path.basename(bundlePath)));
    for (const root of corpusRoots) {
      local.push(path.join(root, bundlePath));
      // The index records paths relative to the library folder as well as to
      // its parent, and both spellings appear in committed source records.
      local.push(path.join(root, bundlePath.split("/").slice(1).join("/")));
    }
  }
  return local.find((candidate) => candidate && fs.existsSync(candidate)) ?? null;
}

/**
 * The approval a canonical independent-review record carries, if it carries one.
 *
 * Twelve conditions, each returning its own refusal. Every one of them is a
 * comparison against bytes on disk or a property of the record itself; none is
 * a declaration that can be edited into a file and believed.
 */
export function reviewRecordApproval({ overlayDir, familyIds, artifacts, reviewsDir, rootDir, corpusRoots = [] }) {
  // Record paths are repository-relative, so they need the repository root.
  // Derived from the overlay directory when the caller does not pass it:
  // .../data/rcap-all50/overlays/production is exactly four levels down.
  const repoRoot = rootDir ?? path.resolve(overlayDir, "..", "..", "..", "..");
  const { byFamily } = loadReviewRecords(reviewsDir);
  if (byFamily.size === 0) return { approved: false, reason: "no canonical independent-review record is present" };

  const validation = validateReviewRecords(reviewsDir);
  const refusals = [];

  for (const familyId of familyIds ?? []) {
    const slug = familyId.includes(":") ? familyId.split(":")[1] : familyId;
    // A record names its own family path, but the asset can cover several
    // packages, so match on the family the caller asked about and on the slug
    // the packages are stored under.
    const records = [...byFamily.entries()]
      .filter(([id]) => id === familyId || id.split(":")[1] === slug)
      .flatMap(([, list]) => list);
    if (!records.length) continue;

    // 11 — currency. The newest batch that names the family is the one that
    // counts; an older one is superseded by the fact that the family was
    // looked at again.
    const newest = records[records.length - 1];
    const refuse = (n, reason) => refusals.push(`${familyId}: condition ${n} — ${reason}`);

    if (newest.batch.withdrawn) { refuse(11, "the batch is withdrawn"); continue; }
    if (newest.batch.supersededBy) { refuse(11, `the batch is superseded by ${newest.batch.supersededBy}`); continue; }
    if (newest.family.withdrawn === true) { refuse(11, "the family record is withdrawn"); continue; }
    if (records.length > 1 && records.slice(0, -1).some((r) => r.batch.batchId === newest.batch.batchId)) {
      refuse(11, "the family is frozen twice inside one batch");
      continue;
    }

    // 1 — the verdict.
    const verdict = newest.verdict;
    if (!verdict) { refuse(1, "the record freezes the family but carries no verdict"); continue; }
    if (verdict.verdict !== REVIEW_APPROVED_VERDICT) {
      refuse(1, `the verdict is ${verdict.verdict}, not ${REVIEW_APPROVED_VERDICT}`);
      continue;
    }

    // 2 — the record-level verifier.
    const batchProblems = validation.problems.filter((p) => p.batchId === newest.batch.batchId);
    if (batchProblems.length) {
      refuse(2, `the batch does not pass the review-record verifier: ${batchProblems[0].message}`);
      continue;
    }

    // 12 — independence.
    if (!newest.batch.reviewerBranch || newest.batch.reviewerBranch === newest.batch.reviewedLaneBranch) {
      refuse(12, "the record is not independent of the lane it reviewed");
      continue;
    }

    // 10 — the record has to be about a family that is here, under the exact
    // identity it names.
    const familyDir = newest.family.familyPath ? path.resolve(repoRoot, newest.family.familyPath) : null;
    const dir = familyDir && fs.existsSync(familyDir)
      ? familyDir
      : (fs.existsSync(overlayDir) ? fs.readdirSync(overlayDir)
          .map((state) => path.join(overlayDir, state, slug))
          .find((candidate) => fs.existsSync(candidate)) ?? null
        : null);
    if (!dir) { refuse(10, "the family package the record names is not on disk"); continue; }
    if (!newest.family.documentId) { refuse(10, "the record does not name the asset"); continue; }

    const compare = (n, relative, expected, label) => {
      if (expected == null) return `${label} is not pinned by the record`;
      const file = path.join(dir, relative);
      if (!fs.existsSync(file)) return `${label} is named by the record and is not on disk`;
      if (sha256File(file) !== expected) return `${label} has changed since it was reviewed`;
      return null;
    };

    // 3 — the source binary.
    const sourceRecord = readJsonOrNull(path.join(dir, "source-record.json"));
    const sourceBinary = resolveSourceBinary(dir, sourceRecord, corpusRoots);
    if (!newest.family.sourceSha256) { refuse(3, "the record does not pin a source SHA-256"); continue; }
    if (!sourceBinary) {
      refuse(3, "the reviewed source binary is not present, so the reviewed source SHA cannot be compared");
      continue;
    }
    if (sha256File(sourceBinary) !== newest.family.sourceSha256) {
      refuse(3, "the source binary has changed since it was reviewed");
      continue;
    }

    // 4 — the field map, or the overlay profile for a flat-overlay family.
    const mapRelative = newest.family.fieldMapPath
      ? path.basename(newest.family.fieldMapPath)
      : (fs.existsSync(path.join(dir, "overlay-profile.json")) ? "overlay-profile.json" : "production-field-map.json");
    const mapExpected = newest.family.fieldMapSha256 ?? newest.family.overlayProfileSha256 ?? null;
    const mapProblem = compare(4, mapRelative, mapExpected, mapRelative);
    if (mapProblem) { refuse(4, mapProblem); continue; }

    // 5 — the classification.
    const classProblem = compare(5, "field-classification.json", newest.family.fieldClassificationSha256, "field-classification.json");
    if (classProblem) { refuse(5, classProblem); continue; }

    // 6 — every artifact the record reviewed.
    if (!Array.isArray(newest.family.artifacts) || newest.family.artifacts.length === 0) {
      refuse(6, "the record names no artifacts");
      continue;
    }
    let artifactProblem = null;
    for (const artifact of newest.family.artifacts) {
      artifactProblem = compare(6, artifact.rel, artifact.sha256, artifact.rel);
      if (artifactProblem) break;
    }
    if (artifactProblem) { refuse(6, artifactProblem); continue; }

    // 7 — the provenance sidecar.
    const provenanceProblem = compare(7, "artifact-provenance.json", newest.family.provenanceSha256, "artifact-provenance.json");
    if (provenanceProblem) { refuse(7, provenanceProblem); continue; }

    // 8 — the visual evidence. The blank-versus-filled proof is the evidence;
    // a rasterisation of it, where the record names one, has to be there too.
    const sheet = (newest.family.artifacts ?? []).find((a) => a.kind === "contact_sheet");
    const sheetRelative = sheet?.rel ?? "contact-sheet/blank-vs-filled.pdf";
    const visualProblem = compare(8, sheetRelative, newest.family.contactSheetSha256, sheetRelative);
    if (visualProblem) { refuse(8, visualProblem); continue; }
    if (newest.family.visualEvidenceSha256) {
      const rendered = newest.family.renderedEvidence
        ? path.resolve(repoRoot, newest.family.renderedEvidence)
        : null;
      if (!rendered || !fs.existsSync(rendered)) { refuse(8, "the rendered visual evidence is not on disk"); continue; }
      if (sha256File(rendered) !== newest.family.visualEvidenceSha256) {
        refuse(8, "the rendered visual evidence has changed since it was reviewed");
        continue;
      }
    }

    // 9 — no correction left open.
    const openCorrections = CORRECTION_FIELDS.filter((field) => {
      const value = verdict[field];
      return Array.isArray(value) ? value.length > 0 : Boolean(value);
    });
    if (openCorrections.length) {
      refuse(9, `the verdict still carries ${openCorrections.join(", ")}`);
      continue;
    }
    if (Number(verdict.openCorrections ?? 0) > 0) { refuse(9, "the verdict records open corrections"); continue; }

    // The clauses the profile channel already enforced. This channel is not
    // allowed to be the softer of the two.
    const classification = readJsonOrNull(path.join(dir, "field-classification.json"));
    if (!classification
      || Number(classification.classifiedFieldsOrAnchors) !== Number(classification.discoveredFieldsOrAnchors)
      || Number(classification.discoveredFieldsOrAnchors) === 0) {
      refusals.push(`${familyId}: the field or anchor classification is not complete`);
      continue;
    }
    if (!Array.isArray(artifacts) || artifacts.length === 0
      || !artifacts.every((a) => a.finalized && (a.failures ?? []).length === 0)) {
      refusals.push(`${familyId}: not every artifact is finalized with no recorded failure`);
      continue;
    }

    return {
      approved: true,
      batch: newest.batch.batchId,
      reviewer: newest.batch.reviewerBranch,
      reviewedLaneHead: newest.batch.reviewedLaneHead,
      approvedArtifacts: newest.family.artifacts.map((a) => a.rel),
      reason: `canonical independent-review record ${newest.batch.batchId} approved these exact bytes, and all twelve conditions hold`
    };
  }

  return {
    approved: false,
    reason: refusals[0] ?? "no canonical independent-review record names this family",
    refusals
  };
}

/**
 * The one platform-ready answer, from either approval source.
 *
 * Order matters only for reporting: the profile channel is tried first because
 * it is the older one and the assets that use it should keep reporting through
 * it. Neither channel can approve what the other would refuse on the clauses
 * they share.
 */
export function platformReadyVerdict({ overlayDir, familyIds, artifacts, reviewsDir, rootDir, corpusRoots }) {
  const profile = overlayProfileApproval({ overlayDir, familyIds, artifacts });
  if (profile.approved) return { ...profile, channel: "overlay_profile" };

  const review = reviewRecordApproval({ overlayDir, familyIds, artifacts, reviewsDir, rootDir, corpusRoots });
  if (review.approved) return { ...review, channel: "independent_review_record" };

  // Which refusal to lead with. The profile channel's "no overlay profile
  // carries an independent review" is true of 26 of the 27 reviewed families
  // and tells a reader nothing they can act on, so when a review record exists
  // and named a condition, that is the reason worth reporting.
  const reviewNamedACondition = Array.isArray(review.refusals) && review.refusals.length > 0;
  return {
    approved: false,
    channel: null,
    reason: reviewNamedACondition ? review.reason : profile.reason,
    channelReasons: { overlay_profile: profile.reason, independent_review_record: review.reason }
  };
}

/**
 * Split an asset's production holds into what a review can clear and what only
 * a release decision can.
 *
 * Reported rather than dropped. An approved asset still carries its release
 * holds and is still globally unavailable while they stand; what changes is
 * that they no longer describe it as defective.
 */
export function partitionHolds(productionHolds) {
  const holds = Array.isArray(productionHolds) ? productionHolds : [];
  return {
    releaseStateHolds: holds.filter((h) => RELEASE_STATE_HOLDS.has(h)),
    reviewRequiredHolds: holds.filter((h) => REVIEW_REQUIRED_HOLDS.has(h)),
    substantiveHolds: holds.filter((h) => !RELEASE_STATE_HOLDS.has(h) && !REVIEW_REQUIRED_HOLDS.has(h))
  };
}
