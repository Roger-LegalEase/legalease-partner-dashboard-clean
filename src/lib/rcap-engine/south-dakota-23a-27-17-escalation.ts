/**
 * South Dakota SDCL § 23A-27-17: when the escalation motion becomes available.
 *
 * WHY THIS EXISTS
 *
 * This route ships an ordered pair. The participant first files a WRITTEN
 * REQUEST asking the original court to enter the sealing order the statute
 * already requires; only if the record is still not corrected does the
 * ENFORCEMENT MOTION apply. The adopted family records that sequence in terms:
 * "Used only AFTER the written request: the recorded escalation is the written
 * implementation request in the original case first, and the motion to enforce
 * § 23A-27-17 only if the record is not corrected."
 *
 * The motion was marked `conditional` with no condition attached, so the
 * planner correctly omitted it — from every packet, permanently. A participant
 * whose record was never corrected had no supported way to obtain the second
 * instrument at all. The component existed, composed and rendered; nothing
 * selected it.
 *
 * WHAT THIS ASKS, AND WHAT IT REFUSES TO ASK
 *
 * One question, about where the participant is in that sequence. It asks a
 * FACT — has the court corrected the record — and never for a document. No
 * upload, no scan, no "do you have a copy of your request". A document the
 * platform cannot produce is never a condition of anything.
 *
 * It is a `postpay_packet_field`, not a route splitter: the route, the
 * eligibility and the price are identical at either stage. Only which
 * instruments belong in the packet changes.
 *
 * Unanswered is UNRESOLVED, never "no". The planner reports an unevaluable
 * condition and composition refuses, rather than quietly shipping a packet
 * missing the instrument the participant actually needs.
 */

export const SD_SIS_ROUTE_KEY = "SD:suspended-imposition-of-sentence-sealing";

/** The one fact that decides it. */
export const SD_SIS_STAGE_FACT_ID = "sd_sis_record_correction_stage";

export const SD_SIS_STAGE_REQUEST_NOT_MADE = "request_not_yet_made";
export const SD_SIS_STAGE_RECORD_CORRECTED = "request_made_record_corrected";
export const SD_SIS_STAGE_RECORD_NOT_CORRECTED = "request_made_record_not_corrected";

/** The condition the escalation motion is selected by. */
export const SD_SIS_ESCALATION_CONDITION = "sd_sis_enforcement_stage_reached";

/**
 * The condition every REMEDIAL component is selected by.
 *
 * Conditioning only the motion was a half-fix, and it produced a worse document
 * than the one it replaced. The written request alleges, in its own third
 * paragraph, that "the matter still appears on a public record search" -- so a
 * participant who had just told us the record WAS corrected received a freshly
 * generated filing contradicting the answer they had given a moment earlier.
 *
 * Nothing about that is fixed by rewriting the allegation. The allegation is
 * correct; the document simply does not belong in that packet. So the request
 * and the filing instructions are selected by whether a remedy is still needed
 * at all, and the completion guidance is selected by the same fact inverted.
 */
export const SD_SIS_REMEDY_NEEDED_CONDITION = "sd_sis_remedy_still_needed";

/** The condition the completion guidance is selected by. */
export const SD_SIS_COMPLETED_CONDITION = "sd_sis_record_already_corrected";

export const SD_SIS_STAGE_QUESTION = {
  id: SD_SIS_STAGE_FACT_ID,
  stage: "record_readiness",
  prompt: "Have you already filed the written request asking the court to seal this case, and has the record still not been corrected?",
  helperText:
    "South Dakota's sequence is the written request first, and the motion to enforce only if the record is still not "
    + "corrected afterwards. Answer from what has happened so far. You do not need to send us anything.",
  type: "single_choice",
  required: true,
  lifecyclePhase: "postpay_packet_field",
  contextOnly: false,
  doesNotSelectPathway: true,
  options: [
    {
      value: SD_SIS_STAGE_REQUEST_NOT_MADE,
      label: "No — I have not filed the written request yet",
      translations: { es: "No — todavia no he presentado la solicitud por escrito" }
    },
    {
      value: SD_SIS_STAGE_RECORD_CORRECTED,
      label: "I filed the written request and the record has now been corrected",
      translations: { es: "Presente la solicitud por escrito y el registro ya fue corregido" }
    },
    {
      value: SD_SIS_STAGE_RECORD_NOT_CORRECTED,
      label: "Yes — I filed the written request and the record still has not been corrected",
      translations: { es: "Si — presente la solicitud por escrito y el registro aun no ha sido corregido" }
    }
  ],
  translations: {
    es: {
      prompt: "Ya presento la solicitud por escrito pidiendo al tribunal que selle este caso, y el registro aun no ha sido corregido?",
      helperText:
        "La secuencia en Dakota del Sur es primero la solicitud por escrito, y la mocion para hacer cumplir la ley solo "
        + "si despues el registro sigue sin corregirse. Responda segun lo que ha ocurrido hasta ahora. No necesita enviarnos nada."
    }
  }
} as const;

/**
 * Has the participant reached the stage at which the motion applies?
 *
 * `undefined` means the question has not been answered, which is a refusal
 * upstream rather than a "no".
 */
export function southDakotaEscalationStageReached(
  facts: Readonly<Record<string, string>>
): boolean | undefined {
  const answer = facts[SD_SIS_STAGE_FACT_ID];
  if (!answer) return undefined;
  if (answer === SD_SIS_STAGE_RECORD_NOT_CORRECTED) return true;
  if (answer === SD_SIS_STAGE_REQUEST_NOT_MADE || answer === SD_SIS_STAGE_RECORD_CORRECTED) return false;
  return undefined;
}

/**
 * Is there still a record-clearing problem for this route to solve?
 *
 * False once the record has been corrected: the statute's duty has been carried
 * out and there is nothing left to ask a court for on this route.
 */
export function southDakotaRemedyStillNeeded(
  facts: Readonly<Record<string, string>>
): boolean | undefined {
  const answer = facts[SD_SIS_STAGE_FACT_ID];
  if (!answer) return undefined;
  if (answer === SD_SIS_STAGE_RECORD_CORRECTED) return false;
  if (answer === SD_SIS_STAGE_REQUEST_NOT_MADE || answer === SD_SIS_STAGE_RECORD_NOT_CORRECTED) return true;
  return undefined;
}

/** The mirror of the above, for the completion guidance. */
export function southDakotaRecordAlreadyCorrected(
  facts: Readonly<Record<string, string>>
): boolean | undefined {
  const needed = southDakotaRemedyStillNeeded(facts);
  return needed === undefined ? undefined : !needed;
}

/** What the participant is told at each stage, in their own terms. */
export const SD_SIS_STAGE_GUIDANCE: Readonly<Record<string, string>> = {
  [SD_SIS_STAGE_REQUEST_NOT_MADE]:
    "Your packet contains the written request. File it with the clerk of the court that handled your case. "
    + "If the record is still not corrected afterwards, come back and tell us — the motion to enforce is the next step, "
    + "and we will prepare it then.",
  [SD_SIS_STAGE_RECORD_CORRECTED]:
    "The sealing has been carried out, so the motion to enforce does not apply and is not included.",
  [SD_SIS_STAGE_RECORD_NOT_CORRECTED]:
    "Your packet contains the motion to enforce SDCL Sec. 23A-27-17 as well as the written request, because the "
    + "recorded escalation applies: the request was made and the record was not corrected."
};
