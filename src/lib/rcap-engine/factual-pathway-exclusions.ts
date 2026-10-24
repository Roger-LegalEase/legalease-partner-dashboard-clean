import { IL_CANNABIS_PATHWAY } from "@/lib/rcap-engine/illinois-cannabis-facts";
import { GA_ORIGINAL_FIRST_OFFENDER_PATHWAY } from "@/lib/rcap-engine/georgia-first-offender";

/** These exact answers exclude one procedure, without electing another one. */
export function pathwayExcludedByKnownFacts(jurisdiction: string, answers: Record<string, unknown>, pathwayId: string) {
  return jurisdiction === "IL" && pathwayId === IL_CANNABIS_PATHWAY && answers.il_cannabis_next_step === "other_relief"
    || jurisdiction === "GA" && pathwayId === GA_ORIGINAL_FIRST_OFFENDER_PATHWAY && answers.ga_original_first_offender === "no";
}

export const FACTUAL_PATHWAY_EXCLUSION_COPY = {
  IL: "You asked to review other record-clearing options instead of the cannabis procedure. The cannabis procedure does not match that request. Review which other kind of help you want for this record. This does not decide whether another remedy is available.",
  GA: "You said the court did not originally impose First Offender treatment. The original First Offender procedure does not match that answer. A request for retroactive treatment is a separate choice. Review which other kind of help you want for this record. This does not decide whether another remedy is available."
};
