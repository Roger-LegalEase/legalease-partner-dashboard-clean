import type { EngineProfile } from "@/lib/rcap-engine/contracts";

export const OK_CLEAN_SLATE_ROUTE = "clean-slate-automatic-expungement";
// Exact LD-OK-01 automatic guidance. Section 18b category, clean-record and
// operational conditions remain separate from generic payment completeness.
// Section 19d victim-restitution objections are not answered by this fact.
const EXPECTED = {
  "id": "clean-slate-automatic-expungement",
  "sourceRef": "section:101-110; corpus-unit:67",
  "ruleClauses": [
    "Oklahoma created a Clean Slate process for automatic sealing of certain",
    "arrest records. The statute directs OSBI to identify eligible records monthly, notify the prosecutor/arresting agency, allow a 45-day objection window, and then provide unobjectioned eligible cases to courts for signed expungement orders. Objections may include lack of eligibility, unpaid victim restitution, or supported belief that the person is continuing criminal activity. (\"https://law.justia.com/codes/oklahoma/title-22/section-22-19/\")",
    "OSBI\u0019s Clean Slate page says the law was created in 2022, funding and implementation have been phased, and there was not a clear implementation deadline at the time of OSBI\u0019s posted update. OSBI describes an implementation plan bridging the current petition-based process and the future Clean Slate process. (\"https://oklahoma.gov/osbi/services/information-services-division/clean-slate-initiative.html\")",
    "Wilma rule:Do not promise automatic expungement. Say:",
    "This may be Clean Slate eligible, but if it has not happened automatically, you may still be able to file a petition.",
    "Wilma status labels:possible_clean_slate_eligibleclean_slate_not_guaranteed_verify_osbipetition_available_if_auto_not_completed",
    "Clean Slate automatic expungement Oklahoma created a Clean Slate process for automatic sealing of certain clean slate eligible arrest records."
  ],
  "automatic": true,
  "filingRequired": false,
  "routeType": "automatic_guidance",
  "suggestedResultCode": "guidance_only",
  "waitingRules": [
    "a no-petition statutory process; the participant files nothing",
    "This rule took effect on 2026-07-01.",
    "Expedited portal due 2026-11-01 — an implementation deadline for the state, not a participant wait.",
    "Automated identification due to begin 2027-11-01 — an implementation deadline for the state, not a participant wait.",
    "Eligible electronic backlog due 2029-11-01 — an implementation deadline for the state, not a participant wait."
  ],
  "exclusionRules": [
    "All charges dismissed, not deferred Eligible if all misdemeanor/felony charges were dismissed, the person has never been convicted of a felony, no misdemeanor/felony charges are pending, and the statute of limitations expired or the prosecutor confirms the charges will not be refiled. This route does not apply to charges dismissed after completion of a deferred judgment or delayed sentence. (",
    "This route does not apply to charges dismissed after completion of a deferred judgment or delayed sentence. ( \"https://law.justia.com/codes/oklahoma/title-22/section-22-18v2/\") Wilma status: likely_eligible_all_charges_dismissed_no_deferred B."
  ],
  "frontendBranch": {
    "entryCondition": "Backend matched this jurisdiction-specific route after evaluating the cited source rules.",
    "missingFactsResult": "needs_more_info",
    "unmetTimingResult": "not_yet",
    "exclusionOrAmbiguityResult": "likely_not_eligible",
    "matchedResult": "guidance_only",
    "paymentAllowed": false
  },
  "legalAuthority": {
    "decisionId": "LD-OK-01",
    "ruleId": "OK-SB2030-2026-ELEVEN-ROUTE-TRANSITION-MAP",
    "mechanism": "Clean Slate automatic expungement",
    "statute": "22 O.S. § 18b",
    "stage": "automatic",
    "outcomeMode": "guidance_status",
    "paymentAuthority": "closed",
    "timing": {
      "kind": "event_trigger",
      "anchorText": "a no-petition statutory process; the participant files nothing"
    },
    "processingDeadlines": [
      {
        "label": "Expedited portal due 2026-11-01",
        "note": "an implementation deadline for the state, not a participant wait"
      },
      {
        "label": "Automated identification due to begin 2027-11-01",
        "note": "an implementation deadline for the state, not a participant wait"
      },
      {
        "label": "Eligible electronic backlog due 2029-11-01",
        "note": "an implementation deadline for the state, not a participant wait"
      }
    ],
    "requiredFacts": [
      "Exact route?",
      "Arrest/charge limitations?",
      "Prosecutor declination?",
      "Reversal/dismissal?",
      "DNA innocence?",
      "Pardon?",
      "Deferred order and dismissal?",
      "Full-record versus court-record relief?",
      "Reclassification date?",
      "Fine amount/payment?",
      "Trafficking nexus?",
      "Juvenile completion?",
      "VPO hearing/vacatur/death?",
      "Portal/automatic status?"
    ],
    "screeningFactIds": [
      "case_outcome"
    ],
    "exclusions": [
      "Current Oklahoma law effective July 1, 2026",
      "Exact remedy, offense class, disposition, completion, and operational availability",
      "Excluded offenses and clean-record rules apply"
    ],
    "packetFamily": null,
    "effectiveFrom": "2026-07-01",
    "notes": "As of 2026-08-24 none of these systems is due yet, so they must not be represented as live. Keep manual petition and correction options available until deployment is verified."
  }
} as const;

export function oklahomaCleanSlateFinancialContract(profile: EngineProfile, pathwayId: string | null | undefined): boolean {
  if (profile.jurisdiction.code !== "OK" || pathwayId !== OK_CLEAN_SLATE_ROUTE
    || profile.profileVersion !== "2026-06-19-source-conversion-1"
    || profile.source?.sourceCorpusSha256 !== "789b97517326e5da1664befc1f2d5a88d0e8e0f750e2dcf51c5aca7b2d8b5f8d") return false;
  const question = profile.questions.find(q => q.id === "financial_obligations");
  if (question?.type !== "yes_no_unsure" || question.required !== true
    || question.prompt !== "Have you paid off everything the court charged?"
    || question.helperText !== "fines, court costs, restitution") return false;
  const route = profile.pathways.find(p => p.id === pathwayId);
  return Boolean(route && Object.entries(EXPECTED).every(([key, value]) =>
    JSON.stringify((route as unknown as Record<string, unknown>)[key] ?? null) === JSON.stringify(value)));
}

/** Removes only the unsupported generic payment prerequisite. No inference of
 * eligibility, waiver, completion, victim restitution or deployed automation. */
export function oklahomaCleanSlateFinancialApplies(profile: EngineProfile, pathwayId: string | null | undefined,
  _answers: Readonly<Record<string, unknown>>, id: string): boolean {
  return id !== "financial_obligations" || !oklahomaCleanSlateFinancialContract(profile, pathwayId);
}
