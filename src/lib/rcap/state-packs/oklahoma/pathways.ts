export type OkRemedyType =
  | "expungement_sealing"
  | "deferred_court_record"
  | "identity_theft"
  | "vpo_sealing"
  | "juvenile"
  | "trafficking_vacatur"
  | "clean_slate_automatic"
  | "pardon"
  | "needs_review";

export type OkPathway =
  | "section_18_19_acquittal_or_dismissal"
  | "section_18_19_no_charges_filed"
  | "section_18_19_misdemeanor_deferred_dismissal"
  | "section_18_19_felony_deferred_dismissal"
  | "section_18_19_misdemeanor_conviction"
  | "section_18_19_felony_conviction"
  | "section_18_19_reclassified_felony"
  | "section_18_19_pardon"
  | "section_18_19_identity_theft"
  | "section_991c_deferred_court_record"
  | "vpo_expungement"
  | "juvenile_expungement"
  | "trafficking_survivor"
  | "clean_slate_automatic"
  | "needs_review";

export type OkEligibilitySignal =
  | "possible_section_18_19_expungement"
  | "possible_section_991c_court_record"
  | "possible_identity_theft_expungement"
  | "possible_vpo_expungement"
  | "possible_juvenile_expungement"
  | "possible_clean_slate_eligible"
  | "needs_more_information"
  | "attorney_or_legal_aid_review";

export const okPathwayLabels: Record<OkPathway, string> = {
  section_18_19_acquittal_or_dismissal:
    "Section 18/19 expungement - acquittal, reversal, DNA innocence, or dismissal (22 O.S. §§ 18-19)",
  section_18_19_no_charges_filed:
    "Section 18/19 expungement - arrest with no charges filed (22 O.S. §§ 18-19)",
  section_18_19_misdemeanor_deferred_dismissal:
    "Section 18/19 expungement - misdemeanor deferred dismissal, 1 year (22 O.S. §§ 18-19)",
  section_18_19_felony_deferred_dismissal:
    "Section 18/19 expungement - felony deferred dismissal, 5 or 10 years (22 O.S. §§ 18-19)",
  section_18_19_misdemeanor_conviction:
    "Section 18/19 expungement - misdemeanor conviction (22 O.S. §§ 18-19)",
  section_18_19_felony_conviction:
    "Section 18/19 expungement - one or two felony convictions (22 O.S. §§ 18-19)",
  section_18_19_reclassified_felony:
    "Section 18/19 expungement - nonviolent felony reclassified as misdemeanor, 30 days (22 O.S. §§ 18-19)",
  section_18_19_pardon: "Section 18/19 expungement - full gubernatorial pardon (22 O.S. §§ 18-19)",
  section_18_19_identity_theft:
    "Section 18/19 or § 19a expungement - identity theft / wrong person (22 O.S. §§ 18, 19a)",
  section_991c_deferred_court_record:
    "Section 991(c) deferred-sentence court-record expungement (22 O.S. § 991c)",
  vpo_expungement: "Victim Protective Order record expungement (22 O.S. § 60.18)",
  juvenile_expungement: "Juvenile record expungement (10A O.S. § 2-6-109)",
  trafficking_survivor: "Human-trafficking survivor relief (22 O.S. § 19c)",
  clean_slate_automatic: "Clean Slate automatic sealing (22 O.S. §§ 18(C), 19(B))",
  needs_review: "More information or record review needed"
};

export const okPathways: Array<{
  pathway: OkPathway;
  label: string;
  remedyType: OkRemedyType;
  citation: string;
}> = [
  {
    pathway: "section_18_19_acquittal_or_dismissal",
    label: okPathwayLabels.section_18_19_acquittal_or_dismissal,
    remedyType: "expungement_sealing",
    citation: "22 O.S. §§ 18-19"
  },
  {
    pathway: "section_18_19_no_charges_filed",
    label: okPathwayLabels.section_18_19_no_charges_filed,
    remedyType: "expungement_sealing",
    citation: "22 O.S. §§ 18-19"
  },
  {
    pathway: "section_18_19_misdemeanor_deferred_dismissal",
    label: okPathwayLabels.section_18_19_misdemeanor_deferred_dismissal,
    remedyType: "expungement_sealing",
    citation: "22 O.S. §§ 18-19"
  },
  {
    pathway: "section_18_19_felony_deferred_dismissal",
    label: okPathwayLabels.section_18_19_felony_deferred_dismissal,
    remedyType: "expungement_sealing",
    citation: "22 O.S. §§ 18-19"
  },
  {
    pathway: "section_18_19_misdemeanor_conviction",
    label: okPathwayLabels.section_18_19_misdemeanor_conviction,
    remedyType: "expungement_sealing",
    citation: "22 O.S. §§ 18-19"
  },
  {
    pathway: "section_18_19_felony_conviction",
    label: okPathwayLabels.section_18_19_felony_conviction,
    remedyType: "expungement_sealing",
    citation: "22 O.S. §§ 18-19"
  },
  {
    pathway: "section_18_19_reclassified_felony",
    label: okPathwayLabels.section_18_19_reclassified_felony,
    remedyType: "expungement_sealing",
    citation: "22 O.S. § 18a"
  },
  {
    pathway: "section_18_19_pardon",
    label: okPathwayLabels.section_18_19_pardon,
    remedyType: "pardon",
    citation: "22 O.S. §§ 18-19"
  },
  {
    pathway: "section_18_19_identity_theft",
    label: okPathwayLabels.section_18_19_identity_theft,
    remedyType: "identity_theft",
    citation: "22 O.S. §§ 18, 19a"
  },
  {
    pathway: "section_991c_deferred_court_record",
    label: okPathwayLabels.section_991c_deferred_court_record,
    remedyType: "deferred_court_record",
    citation: "22 O.S. § 991c"
  },
  {
    pathway: "vpo_expungement",
    label: okPathwayLabels.vpo_expungement,
    remedyType: "vpo_sealing",
    citation: "22 O.S. § 60.18"
  },
  {
    pathway: "juvenile_expungement",
    label: okPathwayLabels.juvenile_expungement,
    remedyType: "juvenile",
    citation: "10A O.S. § 2-6-109"
  },
  {
    pathway: "trafficking_survivor",
    label: okPathwayLabels.trafficking_survivor,
    remedyType: "trafficking_vacatur",
    citation: "22 O.S. § 19c"
  },
  {
    pathway: "clean_slate_automatic",
    label: okPathwayLabels.clean_slate_automatic,
    remedyType: "clean_slate_automatic",
    citation: "22 O.S. §§ 18(C), 19(B)"
  },
  {
    pathway: "needs_review",
    label: okPathwayLabels.needs_review,
    remedyType: "needs_review",
    citation: "N/A"
  }
];
