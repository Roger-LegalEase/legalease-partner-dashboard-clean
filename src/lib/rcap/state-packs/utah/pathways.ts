// Utah record-clearing pathways.
// Source of truth: "Utah Expungement Reference for Wilma" (Nationwide Record
// Clearing / LegalEase Utah), corroborated by Utah Code Title 77, Chapter 40a
// (Expungement of Criminal Records), including § 77-40a-303 (certificate bars)
// and § 77-40a-402 (vacatur), Utah Courts self-help guidance, and the Utah Bureau
// of Criminal Identification (BCI) expungement guidance. Utah uses BOTH automatic
// Clean Slate expungement and petition-based expungement; most adult petitions
// require a BCI Certificate of Eligibility, but traffic and medical-cannabis
// petitions do not. Citations are Utah Code unless otherwise noted. No content
// here is derived from any modeled form or legacy generator.

export type UtRemedyType =
  | "automatic_clean_slate_expungement"
  | "petition_with_bci_certificate"
  | "petition_non_conviction"
  | "petition_conviction"
  | "traffic_deletion_or_petition"
  | "cannabis_petition_no_certificate"
  | "pardon_based_expungement"
  | "juvenile_expungement"
  | "vacatur_expungement"
  | "needs_review";

export type UtPathway =
  | "automatic_clean_slate_expungement"
  | "petition_certificate_conviction_expungement"
  | "petition_non_conviction_expungement"
  | "traffic_expungement"
  | "cannabis_possession_expungement"
  | "pardon_based_expungement"
  | "juvenile_expungement"
  | "vacatur_trafficking_expungement"
  | "needs_review";

export type UtEligibilitySignal =
  | "likely_automatic_acquittal_60_days"
  | "likely_automatic_dismissal_with_prejudice_180_days"
  | "possible_clean_slate_conviction_after_waiting_period"
  | "needs_bci_certificate_of_eligibility"
  | "likely_non_conviction_certificate_30_days_plus_outcome"
  | "not_eligible_certificate_bar_77_40a_303"
  | "possible_numerical_history_limit_block"
  | "possible_traffic_petition_no_certificate"
  | "possible_cannabis_medical_petition_no_certificate"
  | "possible_pardon_route_after_bci_denial"
  | "possible_juvenile_expungement"
  | "possible_vacatur_trafficking_expungement"
  | "attorney_or_legal_aid_review"
  | "needs_more_information";

export const utPathwayLabels: Record<UtPathway, string> = {
  automatic_clean_slate_expungement:
    "Automatic Clean Slate expungement — the court identifies and clears eligible cases without a petition: acquittals (goal 60 days), dismissals with prejudice excluding plea-in-abeyance dismissals (goal 180 days), and eligible lower-level convictions/charges after the Clean Slate waiting period (5 yr Class C/infraction, 6 yr Class B, 7 yr Class A drug possession) (Utah Code Title 77, Ch. 40a)",
  petition_certificate_conviction_expungement:
    "Petition-based conviction expungement with a BCI Certificate of Eligibility — apply to the Utah Bureau of Criminal Identification, then file the petition within 180 days; waiting period runs from the latest of conviction, release from incarceration, parole, or probation (3–10 years by offense level), all fines/interest/restitution paid (Utah Code Title 77, Ch. 40a; bars in § 77-40a-303)",
  petition_non_conviction_expungement:
    "Petition-based non-conviction expungement — BCI certificate available 30+ days after arrest/charge where no charges will be filed, all charges dismissed with prejudice, dismissed without prejudice with prosecutor consent or after 180 days, acquittal on all charges, or statute of limitations expired (Utah Code Title 77, Ch. 40a)",
  traffic_expungement:
    "Traffic offense expungement/deletion — automatic deletion after 5 years (Class C/infraction) or 6 years (Class B), or a petition WITHOUT a BCI certificate after 3 years (Class C/infraction) or 4 years (Class B) if no pending traffic case/plea in abeyance and not on traffic probation; DUI is NOT ordinary traffic (Utah Code Title 77, Ch. 40a)",
  cannabis_possession_expungement:
    "Cannabis possession petition WITHOUT a BCI certificate — available if, at the time of the arrest/citation, the person had a qualifying medical condition and the cannabis was in a form and amount to medicinally treat that condition (Utah Code Title 77, Ch. 40a)",
  pardon_based_expungement:
    "Pardon-based expungement — if BCI denies eligibility, the Utah Board of Pardons and Parole pardoned-expungement route may apply; separate from ordinary court expungement (Utah Board of Pardons and Parole process)",
  juvenile_expungement:
    "Juvenile expungement — handled through the juvenile court process, which requires a certificate of the person's adult Utah criminal-history report; do not use the adult BCI certificate application for a juvenile matter (Utah juvenile expungement process)",
  vacatur_trafficking_expungement:
    "Vacatur / human-trafficking-related expungement — a vacatur order is delivered to affected agencies with the BCI application/fingerprints for processing; mandatory attorney or survivor-legal-services escalation (Utah Code § 77-40a-402)",
  needs_review: "More information, an official disposition, a BCI record, or attorney review needed"
};

export const utPathways: Array<{
  pathway: UtPathway;
  label: string;
  remedyType: UtRemedyType;
  citation: string;
}> = [
  {
    pathway: "automatic_clean_slate_expungement",
    label: utPathwayLabels.automatic_clean_slate_expungement,
    remedyType: "automatic_clean_slate_expungement",
    citation: "Utah Code Title 77, Chapter 40a"
  },
  {
    pathway: "petition_certificate_conviction_expungement",
    label: utPathwayLabels.petition_certificate_conviction_expungement,
    remedyType: "petition_with_bci_certificate",
    citation: "Utah Code Title 77, Chapter 40a; § 77-40a-303"
  },
  {
    pathway: "petition_non_conviction_expungement",
    label: utPathwayLabels.petition_non_conviction_expungement,
    remedyType: "petition_non_conviction",
    citation: "Utah Code Title 77, Chapter 40a"
  },
  {
    pathway: "traffic_expungement",
    label: utPathwayLabels.traffic_expungement,
    remedyType: "traffic_deletion_or_petition",
    citation: "Utah Code Title 77, Chapter 40a"
  },
  {
    pathway: "cannabis_possession_expungement",
    label: utPathwayLabels.cannabis_possession_expungement,
    remedyType: "cannabis_petition_no_certificate",
    citation: "Utah Code Title 77, Chapter 40a"
  },
  {
    pathway: "pardon_based_expungement",
    label: utPathwayLabels.pardon_based_expungement,
    remedyType: "pardon_based_expungement",
    citation: "Utah Code Title 77, Chapter 40a"
  },
  {
    pathway: "juvenile_expungement",
    label: utPathwayLabels.juvenile_expungement,
    remedyType: "juvenile_expungement",
    citation: "Utah Code Title 77, Chapter 40a"
  },
  {
    pathway: "vacatur_trafficking_expungement",
    label: utPathwayLabels.vacatur_trafficking_expungement,
    remedyType: "vacatur_expungement",
    citation: "Utah Code § 77-40a-402"
  },
  {
    pathway: "needs_review",
    label: utPathwayLabels.needs_review,
    remedyType: "needs_review",
    citation: "Utah Code Title 77, Chapter 40a"
  }
];
