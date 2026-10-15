import type { EngineProfile } from "@/lib/rcap-engine/contracts";

export const SC_GUIDANCE_FINANCIAL_ROUTES = ["diversion-or-program-completion-expungement", "pardon-guidance-for-otherwise-ineligible-convictions"] as const;
// Exact current informational guidance only. PTI remains solicitor-administered;
// AEP/TEP/conditional-discharge completion and fee facts are not interchangeable.
// LD-SC-01 pardon information does not erase or seal a conviction. No prior
// custom participant order or generic paid-in-full eligibility is authorized.
const EXPECTED = {
  "diversion-or-program-completion-expungement": {
    "id": "diversion-or-program-completion-expungement",
    "sourceRef": "section:73-83; corpus-unit:27",
    "ruleClauses": [
      "After successful PTI completion, the Solicitor effects a noncriminal disposition, and the person may apply to destroy official arrest records. If the person violates PTI, prosecution resumes. PTI has a $100 application fee and $250 participation fee. (\"https://www.scstatehouse.gov/code/t17c022.php\")",
      "Alcohol Education Program - AEP",
      "AEP is generally for people who were at least 17 but under 21 at arrest, have no prior alcohol-related offense, and meet program criteria. Eligible offenses include several underage alcohol, open-container, public disorderly conduct, false-age, fake-ID, and related offenses, but DUI-type offenses are excluded. Successful completion results in a noncriminal disposition and can support expungement of official arrest records. (\"https://www.scstatehouse.gov/code/t17c022.php\")",
      "AEP has a $250 program fee plus possible provider fees, but inability to pay cannot bar participation; the Solicitor may waive or reduce fees. (\"https://www.scstatehouse.gov/code/t17c022.php\")",
      "Traffic Education Program - TEP",
      "TEP applies to qualifying traffic-related offenses punishable only by fine and loss of four points or less. It is not available if the offense resulted in death or serious bodily injury, and it is generally limited to people without a significant history of traffic violations. Successful completion results in a noncriminal disposition. (\"https://www.scstatehouse.gov/code/t17c022.php\")",
      "Conditional discharge - drug possession",
      "Under 44-53-450, a person with no prior qualifying drug conviction who pleads or is found guilty of certain drug possession offenses may receive a conditional discharge. If they fulfill the terms, the court discharges the person and dismisses the proceeding without adjudication, and the person may apply to expunge official records. This route is one-time only. (\"https://www.scstatehouse.gov/code/t44c053.php\")",
      "The conditional-discharge fee before discharge/dismissal is $350 in General Sessions and $150 in summary court, with indigency-based waiver, reduction, or suspension possible. (\"https://www.scstatehouse.gov/code/t44c053.php\")",
      "Diversion / program-completion routes Pretrial Intervention \u0014 PTI After successful PTI completion, the Solicitor effects a noncriminal disposition, and the person may apply to destroy official arrest records."
    ],
    "automatic": false,
    "filingRequired": false,
    "routeType": "automatic_guidance",
    "waitingRules": [
      "the solicitor's office administers the expungement on successful completion of pretrial intervention; the participant files no pleading and sits through no elapsed wait",
      "This rule governs filings on or after 2026-08-28.",
      "Supersedes The rescinded $150 single-incident administrative figure. It must not appear anywhere on this route.."
    ],
    "legalAuthority": {
      "decisionId": "NATIONAL-2026-08-28-LA-IMM-04",
      "ruleId": "SC-17-22-150-PTI-SOLICITOR-ADMINISTERED",
      "mechanism": "Pretrial intervention expungement, administered by the solicitor",
      "statute": "S.C. Code Ann. § 17-22-150(a)",
      "stage": "single_stage",
      "outcomeMode": "guidance_status",
      "paymentAuthority": "closed",
      "timing": {
        "kind": "event_trigger",
        "anchorText": "the solicitor's office administers the expungement on successful completion of pretrial intervention; the participant files no pleading and sits through no elapsed wait"
      },
      "requiredFacts": [
        "Which solicitor's circuit administered the intervention program?",
        "Was the program successfully completed, and is completion documented?",
        "Has the solicitor's office issued or refused the expungement?",
        "Is eligibility contested by the solicitor?"
      ],
      "screeningFactIds": [
        "case_outcome",
        "court_requirements_completed"
      ],
      "exclusions": [
        "Successful completion of the intervention program is required",
        "A solicitor denial or contested eligibility leaves the ordinary route entirely"
      ],
      "packetFamily": null,
      "effectiveFrom": "2026-08-28",
      "supersedes": {
        "note": "The rescinded $150 single-incident administrative figure. It must not appear anywhere on this route."
      },
      "deliveryGates": [
        {
          "id": "sc_pti_circuit_solicitor_configuration",
          "kind": "source_acquisition",
          "items": [
            "the circuit-specific solicitor application form or intake instruction",
            "the payee named by that circuit for the administrative fee",
            "the delivery method and address that circuit requires"
          ],
          "owner": "RCAP source acquisition",
          "statusSource": "server_configuration_record",
          "evidenceReference": "pending: no circuit configuration record exists yet",
          "note": "The statewide rule is settled; what is missing is per-circuit administrative detail. This gate holds the guidance content, not the legal answer."
        }
      ],
      "serviceBranches": [
        {
          "id": "retained-counsel-handoff-on-denial",
          "when": "the matter's disposition selects the RETAINED-COUNSEL HANDOFF ON DENIAL treatment named by NATIONAL-2026-08-28-LA-IMM-04",
          "outcomeMode": "referral",
          "packetFamily": null,
          "stage": "enforcement",
          "note": "NATIONAL-2026-08-28-LA-IMM-04 states this route's output treatment as \"SOLICITOR-ADMINISTERED PROCESS GUIDANCE + RETAINED-COUNSEL HANDOFF ON DENIAL\". Both branches are owed on the same matter. Serving one does not discharge the other. Installed by the Wave 2 integration from R2_ALREADY_ANSWERED_ENGINEERING with no selector and a null packet family: the branch identity is the decision, and its disposition predicate and packet configuration are owed by the branch-identity and packet-factory lanes. It therefore records the requirement without opening anything or inventing a predicate."
        }
      ],
      "failureDisposition": [
        {
          "id": "sc_pti_solicitor_denied",
          "when": "the solicitor denies the expungement",
          "selector": {
            "operator": "equals",
            "factId": "sc_pti_solicitor_decision",
            "value": "denied",
            "requiredProvenance": "participant_authenticated"
          },
          "disposition": "retained_counsel",
          "note": "A denied application is individualized advocacy, not a self-help filing. This is a service disposition, not missing statewide research."
        },
        {
          "id": "sc_pti_eligibility_contested",
          "when": "eligibility is contested by the solicitor",
          "selector": {
            "operator": "is_true",
            "factId": "sc_pti_eligibility_contested",
            "requiredProvenance": "participant_authenticated"
          },
          "disposition": "retained_counsel",
          "note": "A contested eligibility question leaves the ordinary route entirely."
        }
      ],
      "commercialPosture": {
        "checkoutEnabled": false,
        "sponsoredGenerationEnabled": false,
        "packetCreditsConsumed": 0,
        "note": "Guidance is never sold and never consumes a sponsored credit. Declared to state the posture explicitly; the derived payment authority closes it regardless."
      },
      "notes": "Report correction 4. The ordinary PTI custom participant pleading is RETIRED: the solicitor's office administers the process, so the product's output is process guidance and intake support and never a generated pleading. The controlling figures for guidance content are a $250 solicitor administrative fee, a $0 SLED verification fee, a $35 clerk filing fee where one applies, and a $285 ordinary total on that combination. Those figures belong to THIS route only: the report resolves the obsolete-$150 question across the other seven South Carolina routes, but each of those keeps its own statutory exemptions and its own fees, and this schedule must not be copied onto them."
    },
    "lawrenceRatification": {
      "status": "ratified_deployable",
      "packet_capable": true,
      "payment_allowed_when_engine_confirms": true,
      "legal_basis": "Projected from data/record-clearing/legal-decisions/route-ratification-registry.json. Decision authority: Lawrence (counsel), recorded through docs/RCAP_HELD_ROUTE_RATIFICATION_WORKSHEET.md and the evaluator's ratification sets.",
      "lawrence_review": "ratified_deployable",
      "projectedFrom": "route-ratification-registry"
    }
  },
  "pardon-guidance-for-otherwise-ineligible-convictions": {
    "id": "pardon-guidance-for-otherwise-ineligible-convictions",
    "sourceRef": "overview:10-31; section:10-31; corpus-unit:9",
    "ruleClauses": [
      "South Carolina\u0019s Uniform Expungement Act lists the major expungement authorizations and makes clear that eligibility generally turns on the offense pled guilty to or convicted of, not necessarily the original charge. (",
      "\"https://law.justia.com/codes/south-carolina/title-17/chapter-22/section-17-22-910/\")",
      "User\u0019s case outcome First Wilma route South Carolina treatment",
      "Summary court charge dismissed / nolle prossed / not guilty 17-22-950 summary court expungement Usually handled by magistrate or municipal court, often no cost",
      "General Sessions charge dismissed / nolle prossed / not guilty / discharged / acquitted 17-1-40 non-conviction expungement Usually through Solicitor\u0019s Office",
      "Completed Pretrial Intervention 17-22-150 Noncriminal disposition; expungement route after completion",
      "Completed Alcohol Education Program 17-22-530 Noncriminal disposition; expungement route after completion",
      "Completed Traffic Education Program 17-22-330 Noncriminal disposition; expungement route after completion",
      "Conditional discharge for eligible drug possession 44-53-450 Dismissal/discharge after completion; one-time route",
      "First offense misdemeanor fraudulent check 34-11-90(e) 1-year wait from conviction; no other conviction during that year",
      "First low-level magistrate/municipal-type conviction 22-5-910 Usually 3-year wait; only once; excludes motor-vehicle offenses",
      "Third-degree domestic violence 22-5-910 special timing 5-year wait from conviction; no other conviction during period",
      "Youthful offender sentence 22-5-920 5 years after sentence/probation/parole completion; exclusions apply",
      "First offense simple possession / certain drug conviction 22-5-930 Drug-specific route; verify exact offense and wait",
      "First offense failure to stop for blue light, non-felony route 56-5-750(F) 3 years after completing all sentence terms; no other convictions",
      "Old unlawful possession of handgun conviction before Constitutional Carry Act 17-1-65 / SCCA 223C Special deadline route; application before March 7, 2029",
      "Human trafficking survivor offense Trafficking-victim expungement route Can cover certain convictions/adjudications tied to trafficking",
      "Juvenile status offense or nonviolent juvenile adjudication 63-19-2050 Juvenile expungement after statutory conditions",
      "Pardon Pardon route, not ordinary expungement Pardon does not automatically erase the conviction",
      "User\u0019s case outcome First Wilma route South Carolina treatment Summary court charge dismissed / nolle prossed / not guilty 17-22-950 summary court expungement Usually handled by magistrate or municipal court, often no cost General Sessions charge dismissed / nolle prossed / not guilty / discharged / acquitted 17-1-40 non-conviction expungement Usually through Solicitor\u0019s Office Completed Pretrial Intervention 17-22-150 Noncriminal disposition; expungement route after completion Completed Alcohol Education Program 17-22-530 Noncriminal disposition; expungement route after completion Completed Traffic Education Program 17-22-330 Noncriminal disposition; expungement route after completion Conditional discharge for eligible drug possession 44-53-450 Dismissal/discharge after completion; one-time route First offense misdemeanor fraudulent check 34-11-90(e) 1-year wait from conviction; no…"
    ],
    "automatic": false,
    "filingRequired": false,
    "routeType": "automatic_guidance",
    "waitingRules": [
      "guidance only; a pardon is not expungement and carries no expungement clock"
    ],
    "legalAuthority": {
      "decisionId": "LD-SC-01",
      "ruleId": "SC-CONVICTION-OFFENSE-MAP-NONCONVICTION-JUVENILE-PARDON-SPLIT",
      "mechanism": "Pardon guidance for otherwise ineligible convictions",
      "statute": "S.C. Department of Probation, Parole and Pardon Services pardon process",
      "stage": "single_stage",
      "outcomeMode": "guidance_status",
      "paymentAuthority": "closed",
      "timing": {
        "kind": "event_trigger",
        "anchorText": "guidance only; a pardon is not expungement and carries no expungement clock"
      },
      "requiredFacts": [
        "Exact statute/offense?",
        "Conviction and completion dates?",
        "Later/pending record?",
        "DV3?",
        "Fraudulent check?",
        "Blue-light injury/death?",
        "YOA sentence?",
        "Nonconviction disposition?",
        "Juvenile age/completion?",
        "Pardon?"
      ],
      "screeningFactIds": [
        "case_outcome"
      ],
      "exclusions": [
        "Exact South Carolina offense/statute and route",
        "First-offense/clean-record conditions",
        "Exclusions",
        "Juvenile requirements",
        "Pardon is notation only"
      ],
      "packetFamily": null,
      "notes": "Results copy must affirmatively disclose that a South Carolina pardon does not erase or seal the conviction: the conviction remains visible with a pardon notation. This route must never promise record deletion and must never open checkout."
    },
    "lawrenceRatification": null
  }
} as const;

export function southCarolinaGuidanceFinancialContract(profile: EngineProfile, pathwayId: string | null | undefined): boolean {
  if (profile.jurisdiction.code !== "SC" || !pathwayId || !Object.hasOwn(EXPECTED, pathwayId)
    || profile.profileVersion !== "2026-06-19-source-conversion-1"
    || profile.source?.sourceCorpusSha256 !== "34d2edab3183e544d742a65e93d26f1803d70f0e762ed1dda73e890e0be12acf") return false;
  const question = profile.questions.find(q => q.id === "financial_obligations");
  if (question?.type !== "yes_no_unsure" || question.required !== true
    || question.prompt !== "Have you paid off everything the court charged?"
    || question.helperText !== "fines, court costs, restitution") return false;
  const route = profile.pathways.find(p => p.id === pathwayId);
  return Boolean(route && Object.entries(EXPECTED[pathwayId as keyof typeof EXPECTED]).every(([key, value]) =>
    JSON.stringify((route as unknown as Record<string, unknown>)[key] ?? null) === JSON.stringify(value)));
}

/** No payment-completeness prerequisite to these two informational dispositions.
 * Preserve distinct completion, fee, denial, pardon and source-content limits. */
export function southCarolinaGuidanceFinancialApplies(profile: EngineProfile, pathwayId: string | null | undefined,
  _answers: Readonly<Record<string, unknown>>, id: string): boolean {
  return id !== "financial_obligations" || !southCarolinaGuidanceFinancialContract(profile, pathwayId);
}
