export interface NorthDakotaVerifiedCalendarCoverage {
  jurisdiction: "ND";
  confirmedComplete: true;
  start: string;
  end: string;
  legalHolidays: readonly string[];
  verificationSource: string;
}
export type NorthDakotaAutomaticDeadline =
  | { eligible: false; code: string; detail: string; participantInstruction: string }
  | { eligible: true; orderEntryDate: string; rawDay61: string; adjustedExpiration: string;
      firstAdministrativeCheckDate: string; computationMethod: "CALLER_SUPPLIED_COMPLETE_ND_CALENDAR";
      calendarVerificationSource: string; entryDateExcluded: true; daysCounted: 61;
      mailServiceDaysAdded: 0; firstCheckIsProductStep: true };
export function northDakotaNonconvictionAutomaticDeadline(
  orderEntryDate: unknown, calendarCoverage?: NorthDakotaVerifiedCalendarCoverage | null
): NorthDakotaAutomaticDeadline;
export const ND_NONCONVICTION_AUTOMATIC_TIMING_COPY: readonly [string, string];
