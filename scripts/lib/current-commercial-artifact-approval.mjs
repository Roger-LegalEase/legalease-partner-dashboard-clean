/**
 * The owner decision approving the bytes the current commercial provider composes.
 *
 * WHAT THIS IS FOR
 *
 * Five routes carried an adopted build-host artifact and had no approval naming
 * what the product actually composes at delivery, so `collectPacketCompletenessGaps`
 * held them. This is the one object that closes that gap, and it closes it only
 * for the exact digests the owner named.
 *
 * WHY IT VALIDATES THIS HARD
 *
 * Everything it is asked to prove is a digest equality, and a digest equality
 * that is not checked is a sentence. So every binding the owner named is
 * re-derived from disk here: the Item 13B batch, the visual review, and each
 * artifact's own bytes. Nothing is taken from the decision's own say-so.
 *
 * The consequence is the one that matters: regenerate an artifact, re-run the
 * batch, or re-inspect a page and a digest moves, this returns null, and the
 * routes close again. An approval that survived the bytes moving would be the
 * defect this whole lane exists to prevent -- it is what the Item 13A finding
 * was, and what the September 20 Mississippi approval became when the shared
 * renderer corrected.
 *
 * WHAT IT DOES NOT DO
 *
 * It approves bytes. It is not a channel authority, not a provider proof and not
 * a publication proof: a route that clears this gap still has to clear every
 * other one on its own terms, and the projection still reports them.
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { assertDcInnocenceArtifactSuccessor, dcInnocenceArtifactMove,
  DC_INNOCENCE_ARTIFACT_DECISION_PATH, DC_INNOCENCE_ARTIFACT_DECISION_SHA256, DC_INNOCENCE_ARTIFACT_MOVE_PATH
} from '../../src/lib/rcap/fulfillment/question-contract-source-successor.mjs';

export const CURRENT_COMMERCIAL_ARTIFACT_APPROVAL_PATH =
  "data/rcap-grade-a/legal-decisions/OWNER_CURRENT_COMMERCIAL_ARTIFACT_APPROVAL_2026-09-20.json";
export const CURRENT_COMMERCIAL_ARTIFACT_APPROVAL_ID =
  "OWNER-CURRENT-COMMERCIAL-ARTIFACT-APPROVAL-20260920";

const BATCH = "data/rcap-grade-a/legal-decisions/CURRENT_COMMERCIAL_ARTIFACT_REVIEW_2026-09-20.json";
const VISUAL = "data/rcap-grade-a/legal-decisions/CURRENT_COMMERCIAL_ARTIFACT_VISUAL_REVIEW_2026-09-20.json";

/**
 * The composed path a participant's bytes come out of. Stated rather than
 * inferred, because the whole finding behind this lane was that nobody had
 * written down which path the reviewed artifact came from.
 */
export const COMPOSED_BY =
  "rcap_grade_a_composer_v1 -> buildGradeAArtifact -> composeGradeAPacket -> assembleParticipantPacket, "
  + "from the current packet specification";

const digest = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");

/**
 * Route id -> the approval for that route's composed artifacts, or an empty map.
 *
 * Empty rather than throwing: an absent or broken approval is a route that stays
 * held, which is the safe direction, and the projection already says in terms
 * what is missing. A throw here would take the whole build down over a gate that
 * is working correctly.
 */
export function loadCurrentCommercialArtifactApprovals(root = process.cwd(),
  readBytes = file => fs.readFileSync(path.join(root, file))) {
  const empty = new Map();
  let bytes;
  try { bytes = readBytes(CURRENT_COMMERCIAL_ARTIFACT_APPROVAL_PATH); }
  catch { return empty; }

  let decision;
  try { decision = JSON.parse(bytes.toString("utf8")); } catch { return empty; }

  if (decision.schemaVersion !== "rcap-owner-current-commercial-artifact-approval/v1"
    || decision.decisionId !== CURRENT_COMMERCIAL_ARTIFACT_APPROVAL_ID
    || decision.status !== "APPROVED_EXACT_CURRENT_COMMERCIAL_ARTIFACTS"
    || decision.owner !== "Roger Roman"
    || decision.decidedAt !== "2026-09-20"
    || decision.authenticationKind !== "owner_instruction_in_current_conversation"
    || decision.approvesComposedBytes !== true
    // The two things this approval is explicitly NOT, declared rather than
    // assumed, so a later edit that quietly widened it would not load.
    || decision.productionAuthorized !== false
    || decision.liveChargesAuthorized !== false) return empty;

  // The bindings the owner named, re-derived from disk. A regenerated batch or a
  // re-inspected page set moves one of these and the approval stops loading.
  let batchBytes;
  let visualBytes;
  try {
    batchBytes = readBytes(BATCH);
    visualBytes = readBytes(VISUAL);
  } catch { return empty; }
  if (decision.boundTo?.commit == null
    || decision.boundTo?.batch?.path !== BATCH
    || decision.boundTo?.batch?.sha256 !== digest(batchBytes)
    || decision.boundTo?.visualReview?.path !== VISUAL
    || decision.boundTo?.visualReview?.sha256 !== digest(visualBytes)) return empty;

  /*
   * Custody of what this supersedes.
   *
   * The superseded record must still be on disk and still be exactly the bytes
   * this decision says it supersedes. "Supersede, do not rewrite history" is only
   * a real constraint if something refuses when the history is rewritten.
   */
  for (const entry of decision.preservedUnedited ?? []) {
    let preserved;
    try { preserved = readBytes(entry.path); } catch { return empty; }
    if (digest(preserved) !== entry.sha256) return empty;
  }
  for (const entry of decision.supersedes ?? []) {
    if (entry.priorDecisionMutated !== false) return empty;
    let prior;
    try { prior = readBytes(entry.path); } catch { return empty; }
    if (digest(prior) !== entry.sha256) return empty;
  }

  const approvedArtifacts = decision.approvedArtifacts;
  if (!Array.isArray(approvedArtifacts) || approvedArtifacts.length === 0) return empty;

  const byRoute = new Map();
  for (const entry of approvedArtifacts) {
    // The bytes themselves. This is the check the approval exists to make.
    let artifact;
    try { artifact = readBytes(entry.path); } catch { return empty; }
    if (digest(artifact) !== entry.sha256) return empty;
    if (!(entry.pageCount > 0)) return empty;
    // And the visual review passed THESE bytes, not bytes that used to be here.
    if (entry.visualReviewStatus !== "inspected_no_blocking_defect") return empty;

    if (!byRoute.has(entry.routeId)) byRoute.set(entry.routeId, []);
    byRoute.get(entry.routeId).push(entry);
  }

  const approvals = new Map();
  for (const [routeId, entries] of byRoute) {
    /*
     * Which digest the completeness proof carries as THE approved artifact.
     *
     * A route delivers more than one artifact -- a full packet per locale and a
     * court-only one -- and the completeness proof has room for a single
     * filing-format artifact. The full English packet is the one a participant
     * receives by default, so it is named there, and the whole approved set is
     * carried beside it so nothing is hidden behind that choice.
     */
    const primary = entries.find((entry) => entry.variant === "full" && entry.locale === "en");
    if (!primary) return empty;
    approvals.set(routeId, {
      path: CURRENT_COMMERCIAL_ARTIFACT_APPROVAL_PATH,
      sha256: digest(bytes),
      recordId: String(decision.decisionId),
      artifactSha256: primary.sha256,
      artifactPageCount: primary.pageCount,
      decidedAt: String(decision.decidedAt),
      owner: String(decision.owner),
      boundToCommit: String(decision.boundTo.commit),
      boundToBatchSha256: String(decision.boundTo.batch.sha256),
      boundToVisualReviewSha256: String(decision.boundTo.visualReview.sha256),
      approvedArtifacts: entries.map((entry) => ({
        artifactId: entry.artifactId, variant: entry.variant, locale: entry.locale,
        path: entry.path, sha256: entry.sha256, pageCount: entry.pageCount
      }))
    });
  }
  // An installed MS successor never falls back to obsolete bytes. Its source
  // pin binds the owner instruction and the complete measured/reviewed tuple.
  const msRoute = 'MS:non-conviction-expungement-for-dismissal-no-disposition-or-acquittal';
  const msMovePath = 'data/rcap-grade-a/legal-decisions/MS_NONCONVICTION_ARTIFACT_MOVE_2026-10-20.json';
  let msMovePresent = false;
  try { readBytes(msMovePath); msMovePresent = true; }
  catch (error) { if (error?.code !== 'ENOENT') approvals.delete(msRoute); }
  if (msMovePresent) {
    approvals.delete(msRoute);
    try {
      const readBound = binding => {
        const value = readBytes(binding.path);
        if (digest(value) !== binding.sha256) throw new Error(`MS successor evidence changed: ${binding.path}`);
        return value;
      };
      const binding = {
        path: 'data/rcap-grade-a/legal-decisions/OWNER_CURRENT_COMMERCIAL_ARTIFACT_APPROVAL_MS_NONCONVICTION_2026-10-20.json',
        sha256: 'a36699d585649a2204f21bf02537b13144606c35c5bbf571b8ab0036db49f50b'
      };
      const next = JSON.parse(readBound(binding).toString('utf8'));
      const move = JSON.parse(readBound(next.explainedMove).toString('utf8'));
      readBound(next.supersedesArtifactDigestConditionOnly);
      readBound(next.ownerInstructionEvidence);
      for (const entry of next.preservedEvidence) readBound(entry);
      const measured = JSON.parse(readBound(next.boundTo.batch).toString('utf8'));
      const visual = JSON.parse(readBound(next.boundTo.visualReview).toString('utf8'));
      readBound(visual.independentPreparation);
      readBound(visual.evidence.custodySuccessor.copiedFromAcceptanceDraft);
      if (move.routeId !== msRoute || next.routeId !== msRoute
        || measured.worktreeHead !== next.boundTo.commit
        || measured.results.length !== 3 || next.approvedArtifacts.length !== 3
        || visual.evidence.rasterReview.artifacts.length !== 3) throw new Error('MS successor tuple mismatch');
      for (const artifact of next.approvedArtifacts) {
        const result = measured.results.find(row => row.id === artifact.artifactId);
        const raster = visual.evidence.rasterReview.artifacts.find(row => row.id === artifact.artifactId);
        const artifactBytes = readBound(artifact);
        if (!result?.deterministic || result.sha256 !== artifact.sha256 || result.byteLength !== artifactBytes.length
          || raster?.sourcePdf !== artifact.path || raster.sourcePdfSha256 !== artifact.sha256
          || raster.pagesReviewed !== artifact.pageCount || raster.pageSha256.length !== artifact.pageCount) {
          throw new Error('MS successor artifact/review mismatch');
        }
        for (const [index, sha256] of raster.pageSha256.entries()) readBound({
          path: `${raster.rasterDirectory}/page-${String(index + 1).padStart(String(artifact.pageCount).length, '0')}.png`, sha256
        });
      }
      const primary = next.approvedArtifacts.find(a => a.variant === 'full' && a.locale === 'en');
      approvals.set(msRoute, { path: binding.path, sha256: binding.sha256,
        recordId: next.decisionId, artifactSha256: primary.sha256,
        artifactPageCount: primary.pageCount, decidedAt: next.decidedAt, owner: next.owner,
        boundToCommit: next.boundTo.commit, boundToBatchSha256: next.boundTo.batch.sha256,
        boundToVisualReviewSha256: next.boundTo.visualReview.sha256,
        approvedArtifacts: next.approvedArtifacts,
        preservedPriorApproval: next.supersedesArtifactDigestConditionOnly,
        artifactSuccessor: { routeId: msRoute, decision: binding, rawOutput: next.boundTo.batch,
          artifactDigests: next.approvedArtifacts, createsOwnerApproval: false,
          commercialAuthorityGranted: false, productionAuthorized: false },
        commercialAuthorityGranted: false, productionAuthorized: false });
    } catch { /* Missing, unreadable or drifted successor evidence holds only MS. */ }
  }
  // An explained current move removes only this route's obsolete current-byte
  // claim. It cannot add an approval. All 18 original approval artifacts remain.
  let moveRecordPresent = false;
  try { readBytes(DC_INNOCENCE_ARTIFACT_MOVE_PATH); moveRecordPresent = true; }
  catch (error) {
    if (error?.code !== 'ENOENT') {
      // Installed/unreadable evidence is not evidence of absence. Never restore
      // the obsolete DC claim on EACCES, EIO, or another read failure.
      approvals.delete('DC:dc_actual_innocence_expungement_16_803');
      return approvals;
    }
  }
  const move = dcInnocenceArtifactMove(readBytes);
  if (moveRecordPresent) {
    // Corrupt or incomplete successor evidence cannot fall back to a stale
    // current-byte claim for the old DC artifact set.
    approvals.delete('DC:dc_actual_innocence_expungement_16_803');
    if (!move) return approvals;
    try {
      const binding = { path: DC_INNOCENCE_ARTIFACT_DECISION_PATH,
        sha256: DC_INNOCENCE_ARTIFACT_DECISION_SHA256 };
      const proof = JSON.parse(readBytes(move.measuredOutput.path).toString('utf8'));
      const successor = assertDcInnocenceArtifactSuccessor({ binding, proof, readBytes });
      const nextBytes = readBytes(binding.path), next = JSON.parse(nextBytes.toString('utf8'));
      const primary = next.approvedArtifacts.find(a => a.variant === 'full' && a.locale === 'en');
      approvals.set(move.routeId, { path: binding.path, sha256: digest(nextBytes),
        recordId: next.decisionId, artifactSha256: primary.sha256,
        artifactPageCount: primary.pageCount, decidedAt: next.decidedAt, owner: next.owner,
        boundToCommit: next.boundTo.commit, boundToBatchSha256: next.boundTo.batch.sha256,
        boundToVisualReviewSha256: next.boundTo.visualReview.sha256,
        approvedArtifacts: next.approvedArtifacts,
        preservedPriorApproval: next.supersedesArtifactDigestConditionOnly,
        artifactSuccessor: successor,
        commercialAuthorityGranted: false, productionAuthorized: false });
    } catch { /* Exact adoption absent/drifted: this route stays held. */ }
  }
  return approvals;
}
