/** Existing source-specific timing facts; selecting a control grants no route authority. */
export const MS_EXACT_TIMING_FACT_IDS = [
  "ms_last_conviction_date_any_court", "ms_successful_sentence_completion_date",
  "ms_mip_dismissal_or_discharge_date", "ms_mip_fine_imposed",
  "ms_mip_sentence_completion_date", "ms_mip_fine_payment_date"
] as const;

export function msExactTimingQuestionIds(jurisdiction: string, pathwayId: string | null | undefined, answers: Record<string, unknown>, includeInactive = false): string[] {
  if (jurisdiction !== "MS") return [];
  if (pathwayId === "additional-justice-or-municipal-court-misdemeanor-relief") return [MS_EXACT_TIMING_FACT_IDS[0]];
  if (pathwayId === "first-offense-dui-expungement") return [MS_EXACT_TIMING_FACT_IDS[1]];
  if (pathwayId !== "minor-in-possession-underage-alcohol-expungement") return [];
  if (includeInactive) return MS_EXACT_TIMING_FACT_IDS.slice(2);
  const outcome = String(answers.case_outcome ?? "").toLowerCase();
  if (/dismiss|acquit|discharge/.test(outcome)) return ["ms_mip_dismissal_or_discharge_date"];
  const fine = String(answers.ms_mip_fine_imposed ?? "").trim().toLowerCase();
  const yes = fine === "yes" || fine === "true" || fine.startsWith("yes,");
  const no = fine === "no" || fine === "false" || fine.startsWith("no,");
  return ["ms_mip_fine_imposed", ...(yes || no ? ["ms_mip_sentence_completion_date"] : []), ...(yes ? ["ms_mip_fine_payment_date"] : [])];
}

/** Calendar rollover must not turn a nonexistent date into an elapsed wait. */
export function msExactCalendarDate(value: unknown): Date | undefined {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value ? date : undefined;
}

export const MS_TIMING_MISSING_TEXT: Record<string, string> = {
  ms_last_conviction_date_any_court: "Enter a valid date for your most recent conviction in any court so we can check the waiting period.",
  ms_successful_sentence_completion_date: "Enter a valid date for completing every term and condition of the DUI sentence so we can check the waiting period.",
  ms_mip_dismissal_or_discharge_date: "Enter a valid date for the underage-alcohol dismissal or discharge so we can check the waiting period.",
  ms_mip_sentence_completion_date: "Enter a valid date for completing the underage-alcohol sentence so we can check the waiting period.",
  ms_mip_fine_payment_date: "Enter a valid date for paying the underage-alcohol fine in full so we can check the waiting period."
};
export const MS_TIMING_MULTIPLE_MISSING_TEXT = "Enter valid dates for completing the underage-alcohol sentence and paying the imposed fine in full so we can check the waiting period.";
