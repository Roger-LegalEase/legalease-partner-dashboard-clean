/**
 * The cover panel of the Mississippi successor review packet, written once.
 *
 * Two programs need these exact values: the generator that produced the bytes
 * the owner approved, and the verifier that re-derives them to prove the bytes
 * still reproduce. If each built the panel itself, a change to either would
 * either fail the proof for a reason that has nothing to do with the packet, or
 * -- worse -- pass it while the two disagreed about what was rendered.
 *
 * It is built from the fixture's own facts rather than from a verification
 * snapshot, because both callers are offline programs with no protected
 * snapshot to read. The route's declared case identifier comes from the
 * specification through the product's own resolver, never from a scan of
 * likely field names.
 */

const fact = (fixture, id) => {
  const value = fixture.facts?.[id];
  return typeof value === "string" && value.trim() ? value : null;
};

export const MS_SUCCESSOR_REVIEW_PACKET_ID = "ms-nonconv-successor-review";

export function msSuccessorReviewMatter({ fixture, specification, locale, participantGuideDate, caseIdentifierFactId }) {
  return {
    preparedFor: fact(fixture, "participant_full_legal_name"),
    preparedOn: participantGuideDate(fixture.verifiedAt, locale),
    jurisdiction: "MS",
    courtOrAgency: fact(fixture, "court_name"),
    caseOrMatter: fact(fixture, caseIdentifierFactId ?? ""),
    remedy: locale === "es" ? specification.pathwayLabelEs ?? null : specification.pathwayLabel ?? null,
    packetId: MS_SUCCESSOR_REVIEW_PACKET_ID
  };
}

/** The three artifacts the owner approved, in the order the review produced them. */
export const MS_SUCCESSOR_REVIEW_OUTPUTS = [
  { id: "full-en", variant: "full", locale: "en", file: "ms-nonconviction-successor-review-full-en.pdf" },
  { id: "full-es", variant: "full", locale: "es", file: "ms-nonconviction-successor-review-full-es.pdf" },
  { id: "court-only", variant: "court_only", locale: "en", file: "ms-nonconviction-successor-review-court-only.pdf" }
];
