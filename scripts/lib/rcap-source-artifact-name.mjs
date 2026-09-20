/**
 * The one derivation of a source-acquisition artifact name.
 *
 * An acquisition receipt is matched to the artifact holding its bytes by name
 * alone. Three places once composed that name — the batch planner, the batch
 * workflow's upload step and the single-URL workflow's upload step — and
 * nothing made them agree, so a handoff could be refused for a difference
 * nobody could inspect. The single-URL workflow additionally passed no name at
 * all, which the acquire script correctly refuses inside Actions.
 *
 * Both dispatch paths now derive the name here. The batch path names an entry
 * by its manifest source id; the single-URL path has no manifest and names the
 * form by its official form number, which is the only stable identifier a
 * person dispatching one URL supplies.
 *
 * GitHub artifact names may not contain " : < > | * ? \r \n \\ /, so the
 * derivation sanitizes rather than trusting an id to be safe.
 */

/*
 * Case-folded, because the uniqueness proof has to model the collision domain
 * it protects. GitHub's artifact store treats names CASE-INSENSITIVELY, so two
 * ids differing only in case would pass a case-sensitive check and then
 * collide at upload time — where the second upload is the one that loses.
 * Folding at derivation means the caller's check and the platform are asking
 * the same question.
 */
export const safeArtifactSegment = (x) =>
  String(x).toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);

/** The exact shape the acquire script requires of RCAP_ARTIFACT_NAME. */
export const ARTIFACT_NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]+$/;

/**
 * Derive the artifact name for one acquisition, or return null when no valid
 * name can be derived. Callers decide how to refuse; this module never exits.
 */
export const sourceArtifactName = (jurisdiction, id) => {
  const j = safeArtifactSegment(jurisdiction);
  const i = safeArtifactSegment(id);
  /* Either segment sanitizing to nothing yields a name that still matches the
   * pattern but identifies no acquisition — "rcap-source--" would be handed to
   * every such dispatch, and the second upload would overwrite the first. */
  if (j === "" || i === "") return null;
  const name = `rcap-source-${j}-${i}`;
  return ARTIFACT_NAME_PATTERN.test(name) ? name : null;
};
