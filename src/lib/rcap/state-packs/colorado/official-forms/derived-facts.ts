// The two facts these forms establish about themselves.
//
// Neither comes from the participant, so neither is asked for. They are
// computed from the specification, which took them from the document: the
// heading selector's value is the role the document's own source record gives
// it, and the Colorado Bureau of Investigation box is ticked because the form
// prints "(Required)" beside it and prints the Bureau's address underneath.
//
// A participant fact set that tries to set one of these is rejected rather
// than merged, so a caller cannot re-title a petition as a motion or un-tick a
// box the form requires by supplying a fact.
import type { ColoradoFactSet, ColoradoFormSpec } from "./types";

export const DERIVED_FACT_PREFIX = "derived.";

export class DerivedFactOverrideError extends Error {
  constructor(keys: readonly string[]) {
    super(
      `participant facts may not set document-derived values: ${keys.join(", ")}`,
    );
    this.name = "DerivedFactOverrideError";
  }
}

function titleFor(documentRole: string): string {
  return documentRole === "MOTION" ? "Motion" : "Petition";
}

/** What the document says about itself, keyed by fact id. */
export function deriveDocumentFacts(spec: ColoradoFormSpec): ColoradoFactSet {
  return {
    "derived.document_role_title": titleFor(spec.documentRole),
    "derived.cbi_required": "yes",
  };
}

/**
 * Participant facts merged under the document's own, never over them.
 *
 * Throws when the caller supplied a `derived.` key, because silently dropping
 * it would leave the caller believing an override took effect.
 */
export function mergeFacts(spec: ColoradoFormSpec, participantFacts: ColoradoFactSet): ColoradoFactSet {
  const offending = Object.keys(participantFacts).filter((key) => key.startsWith(DERIVED_FACT_PREFIX));
  if (offending.length > 0) throw new DerivedFactOverrideError(offending.sort());
  return { ...participantFacts, ...deriveDocumentFacts(spec) };
}
