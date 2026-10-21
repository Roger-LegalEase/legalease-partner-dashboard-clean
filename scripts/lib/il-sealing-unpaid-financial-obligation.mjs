/**
 * The Illinois sealing tracks il-seal-2yr, il-seal-3yr and il-seal-edu each
 * carry the SAME packetInstruction in data/record-clearing/legal-design-track-registry.json:
 *
 *   "Tell the participant that unpaid fines and fees do not delay sealing: a
 *    sentence terminates notwithstanding any outstanding financial legal
 *    obligation, and § 5.2(d)(6)(C) bars denial of a sealing petition for an
 *    unsatisfied financial obligation, excluding court-ordered restitution
 *    unless converted to a civil judgment."
 *
 * That directive is a build instruction, not participant prose, and printing a
 * build directive verbatim into a participant guide is its own defect. What
 * follows is its substance in participant language. Nothing is added to what
 * the record states and nothing the record leaves open is resolved:
 *
 *   - the termination half is the registry provenance's own sourceStatement for
 *     this instruction, from LegalEase-Illinois-Legal-Review-2026-07-30.md,
 *     heading TRACK F: "'Terminate' at (a)(1)(M) includes satisfactory or
 *     unsatisfactory termination, and a sentence is terminated notwithstanding
 *     any outstanding financial legal obligation.";
 *   - the denial half and the restitution carve-out are the directive's own
 *     words, and § 5.2(d)(6)(C) is quoted inside the directive itself on each
 *     of the three tracks.
 *
 * WHERE THE SUPPORT ACTUALLY LIVES, corrected by FIX166 on lane VF58's read.
 * An earlier version of this comment said "20 ILCS 2630/5.2(a)(1)(M) and
 * 20 ILCS 2630/5.2(d)(6)(C) are both in each track's own `authority` array".
 * THAT IS TRUE OF ONE TRACK OF THE THREE. Read out of
 * data/record-clearing/legal-design-track-registry.json:
 *
 *   il-seal-2yr  authority carries both cites.
 *   il-seal-3yr  authority is (c)(2)(D), (c)(2)(E), (c)(2)(F), (c)(3)(C),
 *                (a)(1)(F). NEITHER cite is in it.
 *   il-seal-edu  authority is (c)(3)(E), (c)(2)(C), (c)(2)(D), (c)(2)(E),
 *                (c)(2)(F). NEITHER cite is in it.
 *
 * The sentence below is still supported on all three, through the directive
 * text itself and through each track's own intake-memo provenance: the
 * sourceStatement attached to THIS track's copy of the packet_instruction in
 * data/record-clearing/legal-design-intake/IL.memo.json is where (a)(1)(M) is
 * named. A later lane relying on the old sentence would look in the authority
 * array and find nothing, so it is corrected here rather than left standing.
 *
 * The consequence of an unconverted court-ordered restitution obligation is NOT
 * stated, because the record does not state it. The carve-out is reported as
 * the record reports it and no further.
 *
 * One statement, three tracks, one place to change it.
 */
export const IL_SEALING_UNPAID_FINANCIAL_OBLIGATION_NOTE =
  `**Unpaid fines and fees do not delay sealing.** A sentence terminates notwithstanding any outstanding financial legal obligation; "terminate" at § 5.2(a)(1)(M) covers unsatisfactory as well as satisfactory termination. Section 5.2(d)(6)(C) bars denial of a sealing petition for an unsatisfied financial obligation. If you still owe fines or fees on a case, that is not a reason to wait before filing. The one exception § 5.2(d)(6)(C) carries is court-ordered restitution, which is excluded unless it has been converted to a civil judgment.`;

/**
 * Fails the build if the registry no longer carries the directive this prose
 * renders. A stale legal statement printed under an authority the record has
 * dropped is worse than no statement, so this refuses rather than prints.
 * FIX166: all three Illinois sealing builders now read the registry and call
 * this. il-seal-edu-set used to import the constant alone, so if the directive
 * ever left the registry its two siblings would have failed loudly and it would
 * have gone on printing the statement. That asymmetry is closed.
 */
export function assertRegistryStillDirectsTheUnpaidFinancialObligationNote(track, trackId) {
  const instructions = Array.isArray(track?.packetInstructions) ? track.packetInstructions : [];
  const directive = instructions.find((entry) =>
    typeof entry === "string"
    && entry.includes("unpaid fines and fees do not delay sealing")
    && entry.includes("5.2(d)(6)(C)")
    && entry.includes("restitution"));
  if (!directive) {
    throw new Error(
      `the registry no longer carries the unpaid-fines packetInstruction for ${trackId}; `
      + "refusing to print a participant-facing money statement the controlling record no longer directs");
  }
  return directive;
}
