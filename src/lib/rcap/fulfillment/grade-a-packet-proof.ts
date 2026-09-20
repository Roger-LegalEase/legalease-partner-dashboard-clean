import "server-only";

/**
 * What a Grade-A packet must prove about itself, beyond existing.
 *
 * The authority's first version bound provenance: which legal decision, which
 * specification hash, which sources, which provider, which fixture, which
 * artifact. All of that answers "where did this come from". None of it answers
 * the question a participant actually has, which is "if I file this, is anything
 * missing".
 *
 * A packet can be perfectly provenanced and still be unfileable: a motion with no
 * proposed order in a jurisdiction that requires one, a filing with no service
 * list, a complete application with no statement of where it goes or what the fee
 * is. The Grade-A non-negotiables name those dimensions one by one, and this
 * module is where the record has to answer for each of them.
 *
 * The vocabulary is not invented here. It is the vocabulary the packet
 * specifications already use — `data/record-clearing/packet-specifications/*.json`
 * carry `documents`, `filingDestination`, `feeAndWaiver`, `serviceAndNotice`,
 * `copyRequirements`, `postFilingTimeline`, `hearingAndObjectionStops` and
 * `attachments`. A record's completeness proof states which of those the
 * specification actually covers, at a named specification version and hash, so
 * "the spec covers service and notice" is a checkable claim rather than a
 * reassuring adjective.
 *
 * Fail-closed, in three ways that matter:
 *
 *   1. a record with NO completeness proof is incomplete, not exempt;
 *   2. `not_required` must be justified by a named authority, because "this
 *      jurisdiction doesn't need a proposed order" is a legal claim;
 *   3. a dimension the specification does not cover is a gap even when the
 *      renderer happily produces pages without it.
 */

/**
 * Per-dimension coverage. `not_required` is a real answer — not every route needs
 * a proposed order or a service list — but it is a legal conclusion, so it
 * carries the authority that reached it.
 */
export type PacketDimensionState = "covered" | "not_required" | "missing";

export type PacketDimensionProof = {
  state: PacketDimensionState;
  /**
   * The specification section, document id or decision record backing the state.
   * Required for `covered` and for `not_required`; meaningless for `missing`.
   */
  basis: string | null;
};

/**
 * The filing-format artifact: the bytes a participant would actually file.
 *
 * Separate from the authority record's `artifactValidation`, which proves a
 * render happened and hashed to a known value. This proves the render was in a
 * fileable format. A deterministic text composition is a real artifact and is not
 * a filing.
 */
export type FilingFormatArtifactProof = {
  format: string;
  sha256: string | null;
  pageCount: number;
  /**
   * What actually produced these bytes.
   *
   * A record's `provider` names the worker image that renders packets at
   * delivery. That is not always the thing that produced the artifact a reviewer
   * looked at: the Oregon filing PDFs were produced by the official-form
   * regeneration factory, and the record named the delivery image. Binding a
   * reviewed artifact to an image that did not produce it is a provenance claim
   * nobody checked, and it is exactly the claim a reviewer would assume had been
   * checked.
   *
   * So the artifact carries its own producer, and whether that producer is the
   * record's provider is stated rather than implied. A mismatch is not itself a
   * defect -- two environments legitimately produce two different objects -- but
   * an unrecorded one is.
   */
  producedBy: {
    renderer: string;
    matchesRecordProvider: boolean;
    /** Required when it does not match: why the difference is legitimate. */
    reconciliation: string | null;
    deterministicRenderVerified: boolean;
  } | null;
  /**
   * WHETHER THESE ARE THE BYTES A PARAGRAPH-BUYING PARTICIPANT ACTUALLY GETS.
   *
   * `producedBy` says what made this artifact. It does not say whether that
   * thing is what the commercial path will run, and the two came apart without
   * anyone noticing.
   *
   * For an ordinary paid Grade-A route the product composes at delivery:
   * `packetFulfillmentAuthority` -> `rcap_grade_a_composer_v1` ->
   * `buildGradeAArtifact` -> the CURRENT packet specification ->
   * `composeGradeAPacket` -> `assembleParticipantPacket`. A personalized route
   * composes the same way inside the worker. So a record whose filing-format
   * artifact came from a census-v1 build host names an ADOPTED artifact -- the
   * thing a reviewer looked at -- and not the thing the participant receives.
   *
   * While such a route is held for other reasons the difference is invisible.
   * The moment the last unrelated gate clears, it would go commercially
   * eligible on the strength of an approval that names bytes the product no
   * longer produces. That is the failure this field exists to make impossible,
   * so it is required rather than optional: a record that does not answer is
   * incomplete.
   */
  isCurrentCommercialArtifact?: boolean;
  /**
   * Required when the answer is no: what has to happen before delivery, and the
   * approval that closed it if one has.
   */
  currentCommercialArtifactReview?: {
    state: "approved" | "pending_owner_review";
    /** The path the participant's bytes actually come out of. */
    composedBy: string;
    /** The approval naming those exact composed bytes, or null while pending. */
    approval: { path: string; sha256: string; recordId: string; artifactSha256: string } | null;
    why: string;
  } | null;
};

/**
 * The producer identity that means "the current commercial Grade-A provider".
 *
 * A record may only claim its filing-format artifact IS what a participant
 * receives when the thing that produced it is this renderer. Anything else --
 * a census-v1 build host, an official-form regeneration lane -- produced an
 * adopted artifact, whatever the record would like to say about it.
 */
export const CURRENT_COMMERCIAL_RENDERER = "rcap_grade_a_document_v1";

/**
 * A custom pleading is a document this product drafts rather than a form a court
 * publishes. Where a route uses one, someone with authority has to have approved
 * the drafting — which is a different approval from approving the packet's output.
 */
export type CustomPleadingAuthorityProof = {
  required: boolean;
  approved: boolean;
  authorityId: string | null;
};

export type PacketCompletenessProof = {
  /** The versioned specification this proof is about. */
  specificationId: string;
  specificationVersion: string;
  specificationSha256: string;
  /** The complete filing or application the participant submits. */
  filingApplication: PacketDimensionProof;
  proposedOrder: PacketDimensionProof;
  attachmentsAndSchedules: PacketDimensionProof;
  serviceAndNotice: PacketDimensionProof;
  filingDestination: PacketDimensionProof;
  feeAndWaiverInstructions: PacketDimensionProof;
  copyRequirements: PacketDimensionProof;
  postFilingSteps: PacketDimensionProof;
  hearingAndObjectionStopConditions: PacketDimensionProof;
  customPleadingAuthority: CustomPleadingAuthorityProof;
  filingFormatArtifact: FilingFormatArtifactProof;
};

/** The nine specification dimensions, in the order gaps are reported. */
export const PACKET_COMPLETENESS_DIMENSIONS = [
  "filingApplication",
  "proposedOrder",
  "attachmentsAndSchedules",
  "serviceAndNotice",
  "filingDestination",
  "feeAndWaiverInstructions",
  "copyRequirements",
  "postFilingSteps",
  "hearingAndObjectionStopConditions"
] as const;

export type PacketCompletenessDimension = (typeof PACKET_COMPLETENESS_DIMENSIONS)[number];

/**
 * The filing application itself is the one dimension that can never be waived.
 * Every other dimension has a route somewhere that genuinely does not need it;
 * a packet with no filing is not a packet.
 */
const NEVER_WAIVABLE: readonly PacketCompletenessDimension[] = ["filingApplication"];

/** Formats that are a filing. A text composition is an artifact and is not one. */
export const FILEABLE_ARTIFACT_FORMATS = ["pdf"] as const;

function nonEmpty(value: string | null | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * Every reason this packet is not provably complete. Sorted, so two runs against
 * the same proof produce byte-identical output and a projection cannot drift on
 * ordering alone.
 */
export function collectPacketCompletenessGaps(
  proof: PacketCompletenessProof | null | undefined
): string[] {
  if (!proof) {
    return ["packet_completeness: no completeness proof is bound to this record"];
  }

  const gaps: string[] = [];

  if (!nonEmpty(proof.specificationId) || !nonEmpty(proof.specificationVersion) || !nonEmpty(proof.specificationSha256)) {
    gaps.push("packet_completeness: a versioned, hashed specification identity is required");
  }

  for (const dimension of PACKET_COMPLETENESS_DIMENSIONS) {
    const entry = proof[dimension];
    if (!entry) {
      gaps.push(`packet_completeness: ${dimension} is absent from the completeness proof`);
      continue;
    }
    if (entry.state === "missing") {
      gaps.push(`packet_completeness: ${dimension} is missing`);
      continue;
    }
    if (entry.state === "not_required" && NEVER_WAIVABLE.includes(dimension)) {
      gaps.push(`packet_completeness: ${dimension} cannot be waived; a packet with no filing is not a packet`);
      continue;
    }
    if (!nonEmpty(entry.basis)) {
      // A dimension marked covered or waived with nothing behind it is the same
      // as a dimension nobody looked at.
      gaps.push(`packet_completeness: ${dimension} is ${entry.state} with no stated basis`);
    }
  }

  const pleading = proof.customPleadingAuthority;
  if (!pleading) {
    gaps.push("packet_completeness: customPleadingAuthority is absent from the completeness proof");
  } else if (pleading.required && (!pleading.approved || !nonEmpty(pleading.authorityId))) {
    gaps.push("packet_completeness: this route drafts a custom pleading and has no approved drafting authority");
  }

  const artifact = proof.filingFormatArtifact;
  if (!artifact) {
    gaps.push("packet_completeness: filingFormatArtifact is absent from the completeness proof");
  } else {
    if (!FILEABLE_ARTIFACT_FORMATS.includes(String(artifact.format).toLowerCase() as (typeof FILEABLE_ARTIFACT_FORMATS)[number])) {
      gaps.push(`packet_completeness: ${artifact.format || "an unnamed format"} is not a filing format`);
    }
    if (!nonEmpty(artifact.sha256)) {
      gaps.push("packet_completeness: the filing-format artifact has no SHA-256");
    }
    if (!(artifact.pageCount > 0)) {
      gaps.push("packet_completeness: the filing-format artifact has no pages");
    }
    const producer = artifact.producedBy;
    if (!producer) {
      gaps.push("packet_completeness: the filing-format artifact does not record what produced it");
    } else {
      if (!nonEmpty(producer.renderer)) {
        gaps.push("packet_completeness: the filing-format artifact's producer is unnamed");
      }
      if (!producer.matchesRecordProvider && !nonEmpty(producer.reconciliation)) {
        gaps.push(
          "packet_completeness: the filing-format artifact was produced by something other than the record's provider, with no reconciliation stating why that is legitimate"
        );
      }
      if (!producer.deterministicRenderVerified) {
        gaps.push("packet_completeness: the filing-format artifact's render has not been shown to be deterministic");
      }
    }

    /*
     * And whether these bytes are the ones the commercial path produces.
     *
     * Checked here, inside the completeness proof, so it is collected by
     * `collectMissingProof` -- which the authority evaluates BEFORE it looks
     * for an observation. That ordering is the whole point: worker publication
     * clears the observation, and it must not be able to clear this.
     */
    const isCurrent = artifact.isCurrentCommercialArtifact;
    const review = artifact.currentCommercialArtifactReview ?? null;
    if (typeof isCurrent !== "boolean") {
      gaps.push(
        "packet_completeness: the record does not say whether the filing-format artifact is the one the current commercial provider composes for a participant"
      );
    } else if (isCurrent) {
      // A record cannot talk itself into this. Only the Grade-A renderer
      // produces what the commercial path produces.
      if (!String(artifact.producedBy?.renderer ?? "").startsWith(CURRENT_COMMERCIAL_RENDERER)) {
        gaps.push(
          `packet_completeness: the filing-format artifact claims to be the current commercial artifact, but ${artifact.producedBy?.renderer || "an unnamed producer"} is not ${CURRENT_COMMERCIAL_RENDERER}`
        );
      }
    } else if (!review || review.state !== "approved" || !review.approval) {
      gaps.push(
        "packet_completeness: the filing-format artifact is an adopted artifact, not the packet the current commercial provider composes from the specification, and no approval names those composed bytes"
      );
    } else if (!nonEmpty(review.approval.artifactSha256) || !nonEmpty(review.approval.sha256)) {
      gaps.push(
        "packet_completeness: the current-composed-artifact approval names neither the approved bytes nor its own record digest"
      );
    }
  }

  return gaps.sort();
}
