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

export const CURRENT_COMMERCIAL_RENDERER = "rcap_grade_a_document_v1";

export function bindCurrentCommercialArtifact(record) {
  const artifact = record?.packetCompleteness?.filingFormatArtifact;
  if (!artifact) return record;
  const renderer = String(artifact.producedBy?.renderer ?? "");
  artifact.isCurrentCommercialArtifact = renderer.startsWith(CURRENT_COMMERCIAL_RENDERER);
  artifact.currentCommercialArtifactReview = artifact.isCurrentCommercialArtifact ? null : {
    state: "pending_owner_review",
    composedBy: "rcap_grade_a_composer_v1 -> buildGradeAArtifact -> composeGradeAPacket -> assembleParticipantPacket, from the current packet specification",
    approval: null,
    why: `The reviewed artifact ${artifact.sha256 ?? "(none)"} was produced by ${renderer || "an unnamed producer"}, which is not the current commercial provider. `
      + "The packet a participant would receive is composed from the current specification at delivery, and no approval names those composed bytes. "
      + "Specification derivation may be reconciled separately; that reconciles the words, not the output."
  };
  return record;
}
