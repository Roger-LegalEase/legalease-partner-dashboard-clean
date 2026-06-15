// Florida waiting periods. Sourced from the Florida Wilma Agent Training
// Reference (Nationwide Record Clearing), section 13. Florida does not use
// simple "3 years misdemeanor / 5 years felony" waits; it turns on disposition,
// adjudication, offense type, prior record, supervision status, and certificate
// eligibility.
export const flWaitingPeriodNotes = {
  expunctionNonConviction:
    "Court-ordered expunction after no-file/dismissal/acquittal (§ 943.0585): no fixed statutory wait, but the disposition must be final and the person must be off court supervision.",
  sealingWithhold:
    "Court-ordered sealing after a withhold (§ 943.059): no fixed statutory wait, but the person must be off court supervision and otherwise eligible.",
  expunctionAfterSealing:
    "Expunction after a prior sealing: the same record generally must have been sealed for at least 10 years, unless the case fits the no-file / dismissal-before-trial / acquittal / not-guilty exception.",
  certificateValidity:
    "FDLE Certificate of Eligibility: valid for 12 months after FDLE issues it.",
  certificateProcessing:
    "FDLE currently states certificate-application processing takes over 12 weeks, processed in the order received.",
  earlyJuvenile:
    "Early juvenile expunction (§ 943.0515): applicant age 18-20, with a 5-year clean period (no charge or finding of any criminal offense) before the application date.",
  juvenileDiversion:
    "Juvenile diversion expunction (§ 943.0582): available after successful completion of a qualifying diversion program.",
  humanTrafficking:
    "Human-trafficking victim expunction (§ 943.0583): no ordinary wait; due diligence is expected after victimization has ceased or after seeking services, subject to safety concerns.",
  automaticSealing:
    "Automatic sealing (§ 943.0595): occurs after the clerk transmits an eligible certified disposition to FDLE."
};
