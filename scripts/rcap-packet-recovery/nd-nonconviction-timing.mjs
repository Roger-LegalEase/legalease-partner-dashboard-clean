const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const EFFECTIVE_DATE = "2025-08-01";
const WHOLE_CASE_DISPOSITIONS = new Set([
  "ALL_CHARGES_DISMISSED",
  "ALL_CHARGES_ACQUITTED",
]);

const participantInstruction =
  "Obtain the entered order and use its entry date. Confirm that every criminal charge in the case was dismissed or every charge was acquitted, that the case was never appealed, and that none of the listed statutory exceptions applies. For the deadline, supply a complete verified North Dakota court-calendar window covering day 61 through the next business day, or supply both a verified adjusted expiration and verified first-check date. Do not add mail-service days. Check public access on or after that first-check date and keep dated evidence.";

const fail = (code, detail) => ({
  eligible: false,
  code,
  detail,
  participantInstruction,
});

function parseIsoDate(value, label) {
  if (!ISO_DATE.test(String(value ?? ""))) return { error: fail(`INVALID_${label}`, `${label} must be YYYY-MM-DD`) };
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.valueOf()) || date.toISOString().slice(0, 10) !== value) {
    return { error: fail(`INVALID_${label}`, `${label} is not a calendar date`) };
  }
  return { date };
}

const iso = (date) => date.toISOString().slice(0, 10);
const addDays = (date, count) => new Date(date.valueOf() + count * 86_400_000);
const isWeekend = (date) => date.getUTCDay() === 0 || date.getUTCDay() === 6;

function verifiedCalendar(calendarCoverage, rawDay61) {
  if (!calendarCoverage || calendarCoverage.confirmedComplete !== true
    || calendarCoverage.jurisdiction !== "ND"
    || !Array.isArray(calendarCoverage.legalHolidays)
    || typeof calendarCoverage.verificationSource !== "string"
    || calendarCoverage.verificationSource.trim().length < 3) return null;
  const start = parseIsoDate(calendarCoverage.start, "CALENDAR_START");
  const end = parseIsoDate(calendarCoverage.end, "CALENDAR_END");
  if (start.error || end.error || start.date > rawDay61 || end.date < rawDay61) return null;
  const holidays = new Set();
  for (const value of calendarCoverage.legalHolidays) {
    const parsed = parseIsoDate(value, "LEGAL_HOLIDAY");
    if (parsed.error) return null;
    holidays.add(value);
  }
  return { start: start.date, end: end.date, holidays, source: calendarCoverage.verificationSource.trim() };
}

function nextBusinessDate(start, calendar, includeStart) {
  let date = includeStart ? new Date(start) : addDays(start, 1);
  while (date <= calendar.end) {
    if (!isWeekend(date) && !calendar.holidays.has(iso(date))) return date;
    date = addDays(date, 1);
  }
  return null;
}

export function computeNdNonconvictionDeadline({
  orderEntryDate,
  calendarCoverage = null,
  verifiedAdjustedExpiration = null,
  verifiedFirstCheckDate = null,
  deadlineVerificationSource = null,
} = {}) {
  const entered = parseIsoDate(orderEntryDate, "ORDER_ENTRY_DATE");
  if (entered.error) return entered.error;
  const rawDay61Date = addDays(entered.date, 61);
  const rawDay61 = iso(rawDay61Date);
  const calendar = verifiedCalendar(calendarCoverage, rawDay61Date);
  if (calendar) {
    const adjusted = nextBusinessDate(rawDay61Date, calendar, true);
    if (!adjusted) return fail("CALENDAR_COVERAGE_ENDS_BEFORE_ADJUSTED_EXPIRATION",
      "calendar coverage ends before the Rule 45 adjusted expiration can be established");
    const firstCheck = nextBusinessDate(adjusted, calendar, false);
    if (!firstCheck) return fail("CALENDAR_COVERAGE_ENDS_BEFORE_FIRST_CHECK",
      "calendar coverage ends before the next-business-day product check can be established");
    return {
      eligible: true,
      orderEntryDate,
      rawDay61,
      adjustedExpiration: iso(adjusted),
      firstAdministrativeCheckDate: iso(firstCheck),
      computationMethod: "CALLER_SUPPLIED_COMPLETE_ND_CALENDAR",
      calendarVerificationSource: calendar.source,
      entryDateExcluded: true,
      daysCounted: 61,
      mailServiceDaysAdded: 0,
      firstCheckIsProductStep: true,
    };
  }

  const adjusted = parseIsoDate(verifiedAdjustedExpiration, "VERIFIED_ADJUSTED_EXPIRATION");
  const firstCheck = parseIsoDate(verifiedFirstCheckDate, "VERIFIED_FIRST_CHECK_DATE");
  if (!adjusted.error && !firstCheck.error && typeof deadlineVerificationSource === "string"
    && deadlineVerificationSource.trim().length >= 3
    && adjusted.date >= rawDay61Date && firstCheck.date > adjusted.date) {
    return {
      eligible: true,
      orderEntryDate,
      rawDay61,
      adjustedExpiration: verifiedAdjustedExpiration,
      firstAdministrativeCheckDate: verifiedFirstCheckDate,
      computationMethod: "EXPLICITLY_COLLECTED_VERIFIED_DATES",
      calendarVerificationSource: deadlineVerificationSource.trim(),
      entryDateExcluded: true,
      daysCounted: 61,
      mailServiceDaysAdded: 0,
      firstCheckIsProductStep: true,
    };
  }

  return fail("MISSING_VERIFIED_CALENDAR_OR_DEADLINES",
    "automatic calculation is unavailable without complete calendar coverage or both explicitly verified dates");
}

export function evaluateNdNonconvictionFailureBranch(input = {}) {
  const entered = parseIsoDate(input.orderEntryDate, "ORDER_ENTRY_DATE");
  if (entered.error) return entered.error;
  if (input.orderEntryDate < EFFECTIVE_DATE) {
    return fail("PRE_EFFECTIVE_ORDER", "orders entered before August 1, 2025 use the separate petition mechanism");
  }
  if (input.wholeCaseDisposition == null) {
    return fail("UNKNOWN_WHOLE_CASE_DISPOSITION", "the disposition of every criminal charge in the case is required");
  }
  if (!WHOLE_CASE_DISPOSITIONS.has(input.wholeCaseDisposition)) {
    return fail("WHOLE_CASE_NOT_QUALIFYING", "a mixed, partial or other disposition cannot use this failure branch");
  }
  if (input.caseWasEverAppealed == null) {
    return fail("UNKNOWN_APPEAL_HISTORY", "the participant must verify whether the case was ever appealed");
  }
  if (input.caseWasEverAppealed !== false) {
    return fail("ANY_APPEAL_HISTORY_EXCLUDED", "any appeal history stops automatic admission to this workflow");
  }
  const exclusions = [
    ["dismissalInPleaAgreementInvolvingConviction", "PLEA_AGREEMENT_CONVICTION_EXCEPTION"],
    ["unfitToProceedDisposition", "UNFIT_TO_PROCEED_EXCEPTION"],
    ["lackCriminalResponsibilityAcquittal", "LACK_CRIMINAL_RESPONSIBILITY_EXCEPTION"],
  ];
  for (const [field, code] of exclusions) {
    if (input[field] == null) return fail(`UNKNOWN_${code}`, `${field} must be verified from the whole case record`);
    if (input[field] !== false) return fail(code, `${field} excludes automatic admission to this workflow`);
  }

  const timing = computeNdNonconvictionDeadline(input);
  if (!timing.eligible) return timing;
  const checked = parseIsoDate(input.publicAccessCheckedOn, "PUBLIC_ACCESS_CHECK_DATE");
  if (checked.error) return checked.error;
  if (input.publicAccessCheckedOn < timing.firstAdministrativeCheckDate) {
    return fail("PREMATURE_PUBLIC_ACCESS_CHECK",
      `the public-access check must occur on or after ${timing.firstAdministrativeCheckDate}`);
  }
  if (input.recordStillPublicAfterPeriod == null) {
    return fail("UNKNOWN_PUBLIC_ACCESS_STATUS", "the post-period public-access status must be checked and recorded");
  }
  if (input.recordStillPublicAfterPeriod !== true) {
    return fail("RECORD_NOT_PUBLIC_AFTER_PERIOD", "this correction packet is unnecessary when the record is no longer public");
  }
  if (typeof input.publicAccessEvidence !== "string" || input.publicAccessEvidence.trim().length < 3) {
    return fail("MISSING_PUBLIC_ACCESS_EVIDENCE", "dated evidence of continuing public access is required");
  }

  const wholeCaseStatement = input.wholeCaseDisposition === "ALL_CHARGES_DISMISSED"
    ? "All criminal charges in this case were dismissed."
    : "The defendant was acquitted of all criminal charges in this case.";
  return {
    eligible: true,
    code: "ELIGIBLE_FAILURE_BRANCH",
    ...timing,
    wholeCaseDisposition: input.wholeCaseDisposition,
    wholeCaseStatement,
    appealHistoryStatement: "The case was never appealed.",
    statutoryExceptionsStatement:
      "The disposition was not a dismissal in a plea agreement involving another conviction, was not based on unfitness to proceed, and was not an acquittal based on lack of criminal responsibility.",
    publicAccessCheckedOn: input.publicAccessCheckedOn,
    publicAccessEvidence: input.publicAccessEvidence.trim(),
  };
}

export const ND_NONCONVICTION_EFFECTIVE_DATE = EFFECTIVE_DATE;
export const ND_NONCONVICTION_PARTICIPANT_INSTRUCTION = participantInstruction;
