/**
 * Whether a record's filing-format artifact is the packet a participant gets.
 *
 * Derived from the producer the record already carries, never hand-set, and
 * applied wherever a record is built so that every consumer sees the same
 * answer. The authority refuses a record that does not answer at all.
 *
 * The commercial path for an ordinary paid Grade-A route composes at delivery
 * from the CURRENT specification -- packetFulfillmentAuthority,
 * rcap_grade_a_composer_v1, buildGradeAArtifact, composeGradeAPacket,
 * assembleParticipantPacket -- and a personalized route composes the same way
 * inside the worker. So the only artifact that is what the participant receives
 * is one the Grade-A renderer produced. A census-v1 build host's reviewed
 * fixture and an official-form regeneration lane's PDF are ADOPTED artifacts:
 * real, reviewed, and not the bytes the product now makes.
 */

import {
  loadCurrentCommercialArtifactApprovals,
  COMPOSED_BY
} from "./current-commercial-artifact-approval.mjs";

export const CURRENT_COMMERCIAL_RENDERER = "rcap_grade_a_document_v1";

/**
 * Read once per build rather than once per record: the approval reads and
 * digests every artifact it names, and a record loop would do that work as many
 * times as there are records for no additional truth.
 */
let approvalsCache = null;
function approvals(root) {
  if (approvalsCache === null) approvalsCache = loadCurrentCommercialArtifactApprovals(root);
  return approvalsCache;
}

/** For controls that need to observe a changed tree in the same process. */
export function resetCurrentCommercialArtifactApprovalCache() { approvalsCache = null; }

export function bindCurrentCommercialArtifact(record, root = process.cwd()) {
  const artifact = record?.packetCompleteness?.filingFormatArtifact;
  if (!artifact) return record;
  const renderer = String(artifact.producedBy?.renderer ?? "");
  artifact.isCurrentCommercialArtifact = renderer.startsWith(CURRENT_COMMERCIAL_RENDERER);
  if (artifact.isCurrentCommercialArtifact) {
    artifact.currentCommercialArtifactReview = null;
    return record;
  }

  /*
   * An adopted artifact, so the question is whether an owner decision names the
   * bytes the commercial path composes instead. The approval is keyed by route
   * and re-derives every digest from disk, so this is a lookup, not a claim:
   * move an artifact and the approval stops loading, and the route closes again.
   */
  const approval = approvals(root).get(record.routeId) ?? null;
  artifact.currentCommercialArtifactReview = approval ? {
    state: "approved",
    composedBy: COMPOSED_BY,
    approval,
    why: `The reviewed artifact ${artifact.sha256 ?? "(none)"} was produced by ${renderer || "an unnamed producer"}, which is not the `
      + "current commercial provider, so it is an adopted artifact and not the packet a participant receives. What the participant "
      + `receives is composed at delivery, and ${approval.recordId} approves those exact composed bytes -- bound to commit `
      + `${approval.boundToCommit}, to the Item 13B batch, to the page-by-page visual review, and to each artifact's own digest. `
      + "This closes the composed-artifact question and nothing else: every other gate on this route still applies."
  } : {
    state: "pending_owner_review",
    composedBy: COMPOSED_BY,
    approval: null,
    why: `The reviewed artifact ${artifact.sha256 ?? "(none)"} was produced by ${renderer || "an unnamed producer"}, which is not the current commercial provider. `
      + "The packet a participant would receive is composed from the current specification at delivery, and no approval names those composed bytes. "
      + "Specification derivation may be reconciled separately; that reconciles the words, not the output."
  };
  return record;
}
