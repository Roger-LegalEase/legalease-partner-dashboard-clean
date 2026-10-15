import type { EngineProfile } from "@/lib/rcap-engine/contracts";

export const NM_GUIDANCE_FINANCIAL_ROUTES = ["cannabis-expungement", "dna-sample-profile-expungement"] as const;
// Approved nm_cannabis AOC guidance and LD-NM-02 DNA disposition guidance.
// These exact source projections preserve mixed-case/custody separation and
// DNA disposition, one-year no-charge, diversion and prior/pending felony limits.
// They do not establish that the person's case satisfies any of those facts.
const EXPECTED = {
  "cannabis-expungement": {
    "id": "cannabis-expungement",
    "sourceRef": "section:129-140",
    "ruleClauses": [
      "New Mexico has a special cannabis pathway. If a person was charged with an offense involving cannabis that is no longer a crime as of June 29, 2021, or would have resulted in a lesser offense under the Cannabis Regulation Act, public records relating to the arrest or conviction are automatically expunged two years after the conviction date, or two years after the arrest date if there was no conviction. For minors, the record is retained for two years or until the person turns 18, whichever comes first, and then automatically expunged. (\"https://law.justia.com/codes/new-mexico/chapter-29/article-3a/section-29-3a-8/\")",
      "Automatic expungement under 29-3A-8 applies to public records involving only cannabis and cannabis paraphernalia charges and requires destruction of those records. The Administrative Office of the Courts must provide a procedure for eligible people to verify whether automatic expungement occurred and request expedited automatic expungement if it has not. If the arrest or conviction involved both cannabis and non-cannabis charges, the person may request expungement of the eligible cannabis charges through the AOC process. (\"https://law.justia.com/codes/new-mexico/chapter-29/article-3a/section-29-3a-8/\")",
      "possible_automatic_cannabis_expungement",
      "possible_expedited_cannabis_expungement_request",
      "mixed_cannabis_non_cannabis_case_admin_request",
      "not_cannabis_use_regular_petition_route",
      "needs_case_number_for_cannabis_aoc_request",
      "New Mexico has a special cannabis expungement process. If the case involved only cannabis or cannabis paraphernalia charges that are no longer crimes or would now be lesser offenses, it may be eligible for automatic or expedited automatic expungement. If the case also had non-cannabis charges, we may need to separate the eligible cannabis charges from the rest of the case."
    ],
    "automatic": true,
    "filingRequired": false,
    "routeType": "automatic",
    "legalAuthority": null,
    "lawrenceRatification": null
  },
  "dna-sample-profile-expungement": {
    "id": "dna-sample-profile-expungement",
    "sourceRef": "section:151-161",
    "ruleClauses": [
      "DNA sample/profile expungement is separate from the ordinary court-record expungement. A person may request expungement of their DNA sample and DNA records from New Mexico\u0019s DNA identification system if the conviction that led to the sample was reversed, or if the arrest that led to the sample resulted in dismissal, nolle prosequi, successful pre-prosecution diversion, conditional discharge, misdemeanor conviction, acquittal, or did not result in a felony charge within one year. (\"https://law.justia.com/codes/new-mexico/chapter-29/article-16/section-29-16-10/\")",
      "The person must provide a written request and certified documentation, such as a certified copy of the dismissal/nolle prosequi/diversion/conditional discharge/misdemeanor conviction/acquittal, or a sworn affidavit that no felony charges were filed within one year. If DNA records are expunged from the state DNA identification system, the administrative center must ensure expungement from CODIS. DNA expungement is not available if the person has a prior felony conviction or pending felony charge for which DNA collection is authorized. (\"https://law.justia.com/codes/new-mexico/chapter-29/article-16/section-29-16-10/\")",
      "dna_arrest_resolved_without_felony",
      "dna_no_felony_charge_within_one_year",
      "dna_block_prior_felony_or_pending_felony",
      "needs_certified_disposition_or_affidavit"
    ],
    "automatic": false,
    "filingRequired": true,
    "routeType": "administrative",
    "legalAuthority": {
      "decisionId": "LD-NM-02",
      "ruleId": "NM-29-16-10-DNA-DISPOSITION-VS-ONE-YEAR-NO-CHARGE-BRANCH",
      "mechanism": "DNA sample and profile expungement",
      "statute": "N.M. Stat. § 29-16-10",
      "stage": "single_stage",
      "outcomeMode": "agency_application",
      "paymentAuthority": "packet_checkout",
      "timing": {
        "kind": "event_trigger",
        "anchorFactId": "disposition_date",
        "anchorText": "available on the qualifying reversal, dismissal, nolle prosequi, successful diversion or conditional discharge, acquittal or other listed disposition, with the required documentation and no filing wait; the separate arrest-with-no-felony-charge affidavit branch requires a showing that no felony charge was filed during the year after arrest"
      },
      "processingDeadlines": [
        {
          "label": "Agency 30- or 45-day processing periods",
          "note": "processing after the request; never shown as prefiling waits"
        }
      ],
      "requiredFacts": [
        "DNA collection and agency?",
        "Arrest date?",
        "Charge history during following year?",
        "Final disposition?",
        "Reversal/dismissal order?",
        "Diversion/conditional discharge?",
        "Acquittal?",
        "Prior/pending felony?"
      ],
      "screeningFactIds": [
        "case_outcome"
      ],
      "exclusions": [
        "DNA sample/profile is in the covered database",
        "Applicant satisfies a listed statutory disposition and has no statutory prior/pending-felony disqualifier"
      ],
      "packetFamily": "New Mexico DNA Expungement Request under § 29-16-10",
      "packetComponents": [
        "Request to the administrative centre",
        "Disposition documentation",
        "Affidavit where the no-charge branch applies"
      ],
      "notes": "The one-year condition is a substantive lookback for the arrest-with-no-felony-charge branch, not a universal waiting period."
    },
    "lawrenceRatification": {
      "status": "hold_guidance",
      "packet_capable": false,
      "payment_allowed_when_engine_confirms": false,
      "legal_basis": "Lawrence first-pass hold; show substantive guidance only for this release",
      "lawrence_review": "hold_guidance",
      "projectedFrom": "route-ratification-registry"
    }
  }
} as const;

export function newMexicoGuidanceFinancialContract(profile: EngineProfile, pathwayId: string | null | undefined): boolean {
  if (profile.jurisdiction.code !== "NM" || profile.profileVersion !== "2026-06-19-source-conversion-1"
    || profile.source?.sourceCorpusSha256 !== "1db8637956e22f092855ca55f218d7c1fa8026609f5308cea4de746c17aa94ea"
    || !NM_GUIDANCE_FINANCIAL_ROUTES.some(id => id === pathwayId)) return false;
  const question = profile.questions.find(q => q.id === "financial_obligations");
  if (question?.type !== "yes_no_unsure" || question.required !== true
    || question.prompt !== "Have you paid off everything the court charged?"
    || question.helperText !== "fines, court costs, restitution") return false;
  const route = profile.pathways.find(p => p.id === pathwayId);
  if (!route) return false;
  const expected = EXPECTED[pathwayId as keyof typeof EXPECTED];
  return Object.entries(expected).every(([key, value]) => JSON.stringify((route as unknown as Record<string, unknown>)[key] ?? null) === JSON.stringify(value));
}

/** Payment completeness is not a prerequisite to either exact guidance scope.
 * This does not erase debt, prove completion, classify cannabis, establish a
 * DNA disposition or change the existing no-checkout outcome. */
export function newMexicoGuidanceFinancialApplies(profile: EngineProfile, pathwayId: string | null | undefined,
  _answers: Readonly<Record<string, unknown>>, id: string): boolean {
  return id !== "financial_obligations" || !newMexicoGuidanceFinancialContract(profile, pathwayId);
}
