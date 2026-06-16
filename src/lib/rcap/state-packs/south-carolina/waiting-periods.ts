// South Carolina waiting periods. Sourced from the "South Carolina Expungement —
// Wilma Agent Training Reference" (Nationwide Record Clearing), sections 7 and 10,
// corroborated by S.C. Code §§ 17-1-40, 17-22-950, 22-5-910, 22-5-920, 22-5-930,
// 34-11-90(e), 44-53-450, 56-5-750(F), 63-19-2050.
export const scWaitingPeriodNotes = {
  generalSessionsNonConviction:
    "General Sessions not guilty / dismissed / nolle prossed / acquitted (S.C. Code § 17-1-40): usually no conviction waiting period; route as a non-conviction.",
  summaryCourtNonConviction:
    "Summary court dismissed / nolle prossed / not guilty (S.C. Code § 17-22-950): court process runs after the appeal period and the 30-day objection window; if no objection, the judge signs no sooner than 31 and no later than 40 days after notice.",
  internetRecordRemoval:
    "Summary court internet public-record removal (S.C. Code § 17-22-950): eligible criminal charges must be removed within 30 days of disposition, applied retroactively to older cases.",
  diversionPrograms:
    "PTI (§ 17-22-150), AEP (§ 17-22-530), and TEP (§ 17-22-330): expungement route is available after successful completion of the program and the resulting noncriminal disposition.",
  conditionalDischargeDrug:
    "Conditional discharge drug possession (S.C. Code § 44-53-450): expungement available after successful completion and the discharge/dismissal without adjudication; one-time route.",
  fraudulentCheckOneYear:
    "First-offense misdemeanor fraudulent check (S.C. Code § 34-11-90(e)): 1 year from conviction, with no other conviction during that year; misdemeanor only; once only.",
  firstLowLevelThreeYear:
    "First low-level conviction (S.C. Code § 22-5-910): 3 years from the date of conviction, with no other convictions during the period; excludes motor-vehicle offenses; once only.",
  domesticViolenceThirdFiveYear:
    "Third-degree domestic violence (S.C. Code § 22-5-910 special timing): 5 years from conviction, with no other conviction during the period; pending charges can block relief subject to the statute's tolling rules; once only.",
  youthfulOffenderFiveYear:
    "Youthful Offender Act (S.C. Code § 22-5-920): apply 5 years after completing the sentence, including probation and parole, and remaining conviction-free during service and that 5-year period.",
  drugConvictionRoute:
    "Drug conviction route (S.C. Code § 22-5-930): waiting period is offense-specific; treat as manual-review until the exact statute, offense level, and dates are confirmed.",
  failureToStopThreeYear:
    "Failure to stop for blue light, first-offense non-felony route (S.C. Code § 56-5-750(F)): 3 years after completing all sentence terms and conditions, with no other conviction during that period.",
  oldHandgunDeadline:
    "Old unlawful handgun possession (S.C. Code § 17-1-65 / SCCA 223C): convictions before March 7, 2024; application must be submitted before March 7, 2029; no prior § 17-1-65 application.",
  juvenile:
    "Juvenile status/nonviolent offense (S.C. Code § 63-19-2050): usually after age 18, completed disposition, no later adjudication/conviction, and no pending charges; a Family Court not-guilty finding is expunged regardless of age and without a fee.",
  traffickingSurvivor:
    "Human trafficking survivor route (S.C. Code § 16-3-2020 trafficking-victim relief): no ordinary waiting-period framing; this is an evidence-specific court motion proven by a preponderance of the evidence.",
  noLaterConvictions:
    "For YOA, failure-to-stop, fraudulent check, § 22-5-910, and many conviction routes, a later conviction during the clean period blocks relief; pending charges usually block or delay most expungement routes."
};
