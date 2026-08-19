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

/**
 * The approval verdict for one asset's family packages.
 *
 * `artifacts` is the finalized-artifact audit's view of this asset, so
 * "finalized with no recorded failure" is answered by what the audit read off
 * disk rather than by what a profile claims about itself.
 */
export function platformReadyVerdict({ overlayDir, familyIds, artifacts }) {
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
      if (review?.verdict !== "approved_for_platform_ready") continue;

      const round = [...(review.rounds ?? [])].reverse().find((r) => r.verdict === "approved_for_platform_ready");
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
