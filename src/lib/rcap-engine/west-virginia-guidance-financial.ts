import type { EngineProfile } from "@/lib/rcap-engine/contracts";

// Exact Aug28 narrow statutory-effect guidance only, not the earlier custom
// pleading family's admission. Full/unconditional pardon, one year from pardon
// and five years from sentence discharge, exclusions and publication/service
// costs remain distinct. No general nondisclosure or fee-waiver inference.
export const WV_GUIDANCE_FINANCIAL_ROUTES = ["pardon-based-expungement"] as const;
const EXPECTED = {
  "pardon-based-expungement": {
    "id": "pardon-based-expungement",
    "sourceRef": "section:168-177; corpus-unit:3; corpus-unit:56; corpus-unit:59",
    "ruleClauses": [
      "A person who receives a full and unconditional pardon from the Governor may petition the circuit court in the county of conviction to expunge the conviction. The petitioner must serve the prosecutor and publish a Class I legal advertisement notice. The circuit court may enter expungement after verifying the pardon and finding good cause. (\"https://code.wvlegislature.gov/5-1-16A/\")",
      "A person is not eligible until one year after being pardoned and five years after discharge of the sentence for the pardoned conviction. Pardon-based expungement is not available for first-degree murder, treason, kidnapping, or felony sex offenses under Article 8B. (\"https://code.wvlegislature.gov/5-1-16A/\")",
      "possible_pardon_based_expungement",
      "not_eligible_until_1_year_after_pardon",
      "not_eligible_until_5_years_after_sentence_discharge",
      "excluded_pardon_expungement_murder_treason_kidnapping_felony_sex",
      "needs_governor_full_unconditional_pardon",
      "Wilma must distinguish dismissed/acquitted charges, pretrial diversion/deferred adjudication dismissals, eligible misdemeanor convictions, eligible nonviolent felony convictions, treatment/job-readiness accelerated expungement, first-offense drug possession conditional discharge, pardon-based expungement, sex-trafficking victim vacatur/expungement, and juvenile confidentiality/sealing.",
      "Pardon-based expungement A person who receives a full and unconditional pardon from the Governor may petition the circuit court in the county of conviction to expunge the conviction.",
      "Pardon-based expungement is not available for first-degree murder, treason, kidnapping, or felony sex offenses under Article 8B. (\"https://code.wvlegislature.gov/5-1-16A/\") Wilma status labels: possible_pardon_based_expungement not_eligible_until_1_year_after_pardon not_eligible_until_5_years_after_sentence_discharge excluded_pardon_expungement_murder_treason_kidnapping_felony_sex needs_governor_full_unconditional_pardon"
    ],
    "automatic": false,
    "filingRequired": false,
    "routeType": "automatic_guidance",
    "waitingRules": [
      "a gubernatorial pardon must already have issued"
    ],
    "legalAuthority": {
      "decisionId": "NATIONAL-2026-08-28-C-WV-04",
      "ruleId": "WV-5-1-16A-NARROW-STATUTORY-EFFECT",
      "mechanism": "Expungement following a gubernatorial pardon",
      "statute": "W. Va. Code § 5-1-16a(b)",
      "stage": "single_stage",
      "outcomeMode": "guidance_status",
      "paymentAuthority": "closed",
      "timing": {
        "kind": "event_trigger",
        "anchorText": "a gubernatorial pardon must already have issued"
      },
      "requiredFacts": [
        "Has a gubernatorial pardon issued, and on what date?"
      ],
      "screeningFactIds": [
        "pardon_status"
      ],
      "exclusions": [
        "Without a pardon this route does not exist"
      ],
      "packetFamily": null,
      "commercialPosture": {
        "checkoutEnabled": false,
        "sponsoredGenerationEnabled": false,
        "packetCreditsConsumed": 0,
        "note": "Guidance is never sold and never consumes a sponsored credit."
      },
      "notes": "Report disposition RELEASE — GUIDANCE, narrow statutory effect, no universal nondisclosure. Subsection (b) provides only that the expunged record may not be considered in an application to a West Virginia educational institution or in an application for a licence required by a West Virginia professional organisation. Unlike §§ 61-11-25(e) and 61-11-26(l) it contains no general non-disclosure provision, so the guidance must describe the effect it actually has and may not promise the record becomes generally undisclosable."
    },
    "lawrenceRatification": null
  }
} as const;

export function westVirginiaGuidanceFinancialContract(profile: EngineProfile, pathwayId: string | null | undefined): boolean {
  if (profile.jurisdiction.code !== "WV" || !pathwayId || !Object.hasOwn(EXPECTED, pathwayId)
    || profile.profileVersion !== "2026-06-19-source-conversion-1"
    || profile.source?.sourceCorpusSha256 !== "8e1e8ee4cc4663878e60f00976d8f13456911eac223a1d43e43825adebccf1aa") return false;
  const question = profile.questions.find(q => q.id === "financial_obligations");
  if (question?.type !== "yes_no_unsure" || question.required !== true
    || question.prompt !== "Have you paid off everything the court charged?"
    || question.helperText !== "fines, court costs, restitution") return false;
  const route = profile.pathways.find(p => p.id === pathwayId);
  return Boolean(route && Object.entries(EXPECTED[pathwayId as keyof typeof EXPECTED]).every(([key, value]) =>
    JSON.stringify((route as unknown as Record<string, unknown>)[key] ?? null) === JSON.stringify(value)));
}

/** No payment-completeness prerequisite to this informational disposition.
 * Preserve pardon type, both clocks, exclusions, publication costs and narrow statutory effect. */
export function westVirginiaGuidanceFinancialApplies(profile: EngineProfile, pathwayId: string | null | undefined,
  _answers: Readonly<Record<string, unknown>>, id: string): boolean {
  return id !== "financial_obligations" || !westVirginiaGuidanceFinancialContract(profile, pathwayId);
}
