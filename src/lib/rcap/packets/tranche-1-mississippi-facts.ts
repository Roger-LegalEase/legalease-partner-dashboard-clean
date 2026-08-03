// Derived pleading facts for implementation Tranche 1 (Mississippi).
//
// A template placeholder is filled from a participant fact. Two Tranche 1
// tracks additionally need a phrase that depends on which statutory BRANCH the
// participant is on — which disposition ended the case, and whether a justice
// or a municipal court convicted them.
//
// Those phrases are enumerated here rather than composed. The participant picks
// a branch from a closed list; this module returns the approved sentence for
// that branch and throws on anything else. Nothing here writes legal argument,
// infers a branch the participant did not choose, or falls back to a default
// when the branch is unknown — an unrecognised branch fails closed, because
// guessing which disposition a court entered is exactly the error that would
// put a false statement in front of a judge.

export class MississippiBranchError extends Error {
  constructor(readonly trackId: string, readonly key: string, readonly value: unknown) {
    super(
      `No approved Mississippi ${key} branch for track ${trackId}. A branch must be chosen from the approved list; it is never inferred.`
    );
    this.name = "MississippiBranchError";
  }
}

/**
 * Miss. Code Ann. § 99-19-71(4) reaches any case that did not end in a
 * conviction. Which sentence appears depends on how this case actually ended.
 */
export const MS_NONCONVICTION_BRANCHES = {
  dismissed:
    "The charge in this cause was dismissed on {{dispositionDate}}, and the record of that dismissal is attached.",
  nolle_prosequi:
    "The charge in this cause was retired to the file, or a nolle prosequi was entered, on {{dispositionDate}}, and the record of that disposition is attached.",
  acquitted:
    "Petitioner was tried on the charge in this cause and was found not guilty on {{dispositionDate}}, and the judgment of acquittal is attached.",
  no_charge_filed:
    "Petitioner was arrested on the charge described above, but no charge was ever formally filed against Petitioner, and the record of that arrest is attached."
} as const;

export type MississippiNonConvictionBranch = keyof typeof MS_NONCONVICTION_BRANCHES;

/**
 * §§ 9-11-15(3) and 21-23-7(6) are word-for-word identical on every operative
 * element, which is why the normalization keeps one track. Only the court and
 * the citation change.
 */
export const MS_ADDITIONAL_MISDEMEANOR_VENUES = {
  justice_court: {
    citation: "Miss. Code Ann. § 9-11-15(3)",
    sentence:
      "Miss. Code Ann. § 9-11-15(3) permits a justice court to expunge the record of a misdemeanour conviction entered in that court, on the petition of the person convicted, where two years or more have passed since the person satisfied all terms and conditions of the sentence.",
    courtNoun: "Justice Court"
  },
  municipal_court: {
    citation: "Miss. Code Ann. § 21-23-7(6)",
    sentence:
      "Miss. Code Ann. § 21-23-7(6) permits a municipal court to expunge the record of a misdemeanour conviction entered in that court, on the petition of the person convicted, where two years or more have passed since the person satisfied all terms and conditions of the sentence.",
    courtNoun: "Municipal Court"
  }
} as const;

export type MississippiAdditionalMisdemeanorVenue = keyof typeof MS_ADDITIONAL_MISDEMEANOR_VENUES;

/** Tracks whose petition depends on a branch the participant chooses. */
export const MS_BRANCHED_TRACKS: Readonly<Record<string, "disposition" | "courtVenue">> = {
  "ms-nonconv": "disposition",
  "ms-misd-addl": "courtVenue"
};

function requireString(facts: Record<string, unknown>, key: string): string {
  const value = facts[key];
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Adds the derived keys the Mississippi templates reference.
 *
 * Deterministic: identical facts in, identical facts out. Every derived value is
 * either copied from a participant answer or selected from a closed approved
 * list, and no value is invented.
 */
export function deriveMississippiFacts(
  trackId: string,
  facts: Record<string, unknown>
): Record<string, unknown> {
  const derived: Record<string, unknown> = { ...facts };

  // The caption line is the participant's own court name, upper-cased. It is
  // presentation, not a legal conclusion.
  const courtName = requireString(facts, "courtName");
  derived.courtNameUpper = courtName ? courtName.toUpperCase() : "";
  const courtCounty = requireString(facts, "courtCounty");
  derived.courtCountyUpper = courtCounty ? courtCounty.toUpperCase() : "";

  // A statute number is optional on every Mississippi route: participants
  // frequently do not know it, and the charge name identifies the case. The
  // whole charge phrase is derived rather than glued together in the template,
  // because an empty placeholder renders as a fill-in rule — which would print
  // a blank line in the middle of a sentence for every participant who does not
  // know their code section.
  const chargeStatute = requireString(facts, "chargeStatute");
  const chargeName = requireString(facts, "chargeName");
  derived.chargeDescription = chargeStatute ? `${chargeName}, Miss. Code Ann. § ${chargeStatute}` : chargeName;

  const branchKind = MS_BRANCHED_TRACKS[trackId];

  if (branchKind === "disposition") {
    const branch = requireString(facts, "disposition") as MississippiNonConvictionBranch;
    const sentence = MS_NONCONVICTION_BRANCHES[branch];
    if (!sentence) throw new MississippiBranchError(trackId, "disposition", facts.disposition);
    // The branch sentence itself carries one placeholder, so it is filled here
    // rather than leaving a literal {{dispositionDate}} in the rendered text.
    const dispositionDate = requireString(facts, "dispositionDate");
    derived.dispositionAllegation = sentence.replace(
      "{{dispositionDate}}",
      dispositionDate || "____________________"
    );
    derived.branchVariantId = branch;
  }

  if (branchKind === "courtVenue") {
    const branch = requireString(facts, "courtVenue") as MississippiAdditionalMisdemeanorVenue;
    const venue = MS_ADDITIONAL_MISDEMEANOR_VENUES[branch];
    if (!venue) throw new MississippiBranchError(trackId, "courtVenue", facts.courtVenue);
    derived.venueStatuteCitation = venue.citation;
    derived.venueStatuteSentence = venue.sentence;
    derived.branchVariantId = branch;
  }

  return derived;
}
