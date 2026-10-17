/** Explicit retirement is available only after these facts have been saved. */
export function ny16059CustodyRemovalAvailable(state: string, pathway: string | null | undefined, answers: Record<string, unknown>): boolean {
  const no = typeof answers.ny_16059_sentence_incarceration === "string"
    && answers.ny_16059_sentence_incarceration.trim().toLowerCase() === "no";
  return state === "NY" && pathway === "discretionary-conviction-sealing-by-petition-under-cpl-160-59" && no
    && answers.ny_16059_incarceration_history === "none"
    && ["release_date", "ny_16059_incarceration_periods"].some(id => Object.prototype.hasOwnProperty.call(answers, id));
}
