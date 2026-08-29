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
};

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
  }

  return gaps.sort();
}
