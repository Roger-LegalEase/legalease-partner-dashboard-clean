export type NdRemedyType =
  | "sealing"
  | "nonconviction_closing"
  | "dui_sealing"
  | "deferred_dismissal"
  | "marijuana_sealing"
  | "summary_pardon"
  | "trafficking_vacatur"
  | "limited_expungement"
  | "needs_review";

export type NdPathway =
  | "conviction_sealing_misdemeanor"
  | "conviction_sealing_felony"
  | "conviction_sealing_pardon_supported"
  | "nonconviction_closing_automatic"
  | "nonconviction_closing_petition"
  | "dui_sealing"
  | "deferred_imposition_dismissal"
  | "marijuana_first_offense_sealing"
  | "marijuana_summary_pardon"
  | "trafficking_victim_vacatur"
  | "juvenile_dna_unconstitutional"
  | "needs_review";

export type NdEligibilitySignal =
  | "possible_conviction_sealing_path"
  | "possible_nonconviction_closing_path"
  | "possible_dui_sealing_path"
  | "possible_deferred_dismissal_path"
  | "possible_marijuana_path"
  | "possible_trafficking_vacatur_path"
  | "needs_more_information"
  | "attorney_review_recommended";

export const ndPathwayLabels: Record<NdPathway, string> = {
  conviction_sealing_misdemeanor:
    "Conviction sealing - misdemeanor (N.D.C.C. Chapter 12-60.1)",
  conviction_sealing_felony: "Conviction sealing - felony (N.D.C.C. Chapter 12-60.1)",
  conviction_sealing_pardon_supported:
    "Conviction sealing - supported by unconditional pardon (N.D.C.C. Chapter 12-60.1)",
  nonconviction_closing_automatic:
    "Nonconviction closing - automatic after 61 days (N.D.C.C. § 12-60.1-05, order on/after Aug. 1, 2025)",
  nonconviction_closing_petition:
    "Nonconviction closing - Petition to Close Nonconviction Records (N.D.C.C. § 12-60.1-05, order before Aug. 1, 2025)",
  dui_sealing: "DUI record sealing (N.D.C.C. § 39-08-01.6)",
  deferred_imposition_dismissal:
    "Deferred imposition / dismissal records (N.D.C.C. §§ 12.1-32-07.1, 12.1-32-07.2)",
  marijuana_first_offense_sealing:
    "Marijuana first-offense possession sealing (N.D.C.C. § 19-03.1-23(9))",
  marijuana_summary_pardon: "Marijuana Summary Pardon Application (Pardon Advisory Board)",
  trafficking_victim_vacatur:
    "Human-trafficking-victim vacatur and sealing (N.D.C.C. § 12.1-41-14)",
  juvenile_dna_unconstitutional:
    "Juvenile records, DNA profiles, or unconstitutional-arrest expungement (limited)",
  needs_review: "More information or record review needed"
};

export const ndPathways: Array<{
  pathway: NdPathway;
  label: string;
  remedyType: NdRemedyType;
  citation: string;
}> = [
  {
    pathway: "conviction_sealing_misdemeanor",
    label: ndPathwayLabels.conviction_sealing_misdemeanor,
    remedyType: "sealing",
    citation: "N.D.C.C. § 12-60.1-02"
  },
  {
    pathway: "conviction_sealing_felony",
    label: ndPathwayLabels.conviction_sealing_felony,
    remedyType: "sealing",
    citation: "N.D.C.C. § 12-60.1-02"
  },
  {
    pathway: "conviction_sealing_pardon_supported",
    label: ndPathwayLabels.conviction_sealing_pardon_supported,
    remedyType: "sealing",
    citation: "N.D.C.C. § 12-60.1-02"
  },
  {
    pathway: "nonconviction_closing_automatic",
    label: ndPathwayLabels.nonconviction_closing_automatic,
    remedyType: "nonconviction_closing",
    citation: "N.D.C.C. § 12-60.1-05"
  },
  {
    pathway: "nonconviction_closing_petition",
    label: ndPathwayLabels.nonconviction_closing_petition,
    remedyType: "nonconviction_closing",
    citation: "N.D.C.C. § 12-60.1-05"
  },
  {
    pathway: "dui_sealing",
    label: ndPathwayLabels.dui_sealing,
    remedyType: "dui_sealing",
    citation: "N.D.C.C. § 39-08-01.6"
  },
  {
    pathway: "deferred_imposition_dismissal",
    label: ndPathwayLabels.deferred_imposition_dismissal,
    remedyType: "deferred_dismissal",
    citation: "N.D.C.C. §§ 12.1-32-07.1, 12.1-32-07.2"
  },
  {
    pathway: "marijuana_first_offense_sealing",
    label: ndPathwayLabels.marijuana_first_offense_sealing,
    remedyType: "marijuana_sealing",
    citation: "N.D.C.C. § 19-03.1-23(9)"
  },
  {
    pathway: "marijuana_summary_pardon",
    label: ndPathwayLabels.marijuana_summary_pardon,
    remedyType: "summary_pardon",
    citation: "ND Pardon Advisory Board - Summary Pardon Application"
  },
  {
    pathway: "trafficking_victim_vacatur",
    label: ndPathwayLabels.trafficking_victim_vacatur,
    remedyType: "trafficking_vacatur",
    citation: "N.D.C.C. § 12.1-41-14"
  },
  {
    pathway: "juvenile_dna_unconstitutional",
    label: ndPathwayLabels.juvenile_dna_unconstitutional,
    remedyType: "limited_expungement",
    citation: "North Dakota court guidance (limited expungement categories)"
  },
  {
    pathway: "needs_review",
    label: ndPathwayLabels.needs_review,
    remedyType: "needs_review",
    citation: "N/A"
  }
];
