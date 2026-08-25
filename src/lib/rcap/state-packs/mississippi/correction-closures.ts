export type MississippiCorrectionCheckoutState =
  | "attorney_review_referral"
  | "approved_packet_checkout_when_exact_timing_satisfied";

export interface MississippiCorrectionTimingBranch {
  id: string;
  duration: string;
  anchor: string;
  rule: string;
}

export interface MississippiCorrectionClosure {
  routeId: string;
  remedy: string;
  authorities: readonly string[];
  timing: readonly MississippiCorrectionTimingBranch[];
  requiredFacts: readonly string[];
  packetFamily: readonly string[];
  checkoutState: MississippiCorrectionCheckoutState;
}

/**
 * Route-specific corrections from the definitive Mississippi decisions.
 *
 * These definitions intentionally do not reuse the generic felony, DUI,
 * lower-court, or uncharged-misdemeanor clocks. Shared resolver and product
 * metadata integration belongs to the release captain. The legal contract is
 * authoritative for service behavior: the lower-court discretionary route is
 * an attorney-review referral, while the DUI and underage-alcohol packet routes
 * may open checkout only after their exact clocks and route facts are satisfied.
 */
export const mississippiCorrectionClosures = {
  additionalJusticeOrMunicipalMisdemeanor: {
    routeId: "additional-justice-or-municipal-court-misdemeanor-relief",
    remedy: "Additional justice-court or municipal-court misdemeanor relief",
    authorities: [
      "Miss. Code Ann. § 9-11-15(3)",
      "Miss. Code Ann. § 21-23-7(6)"
    ],
    timing: [
      {
        id: "two_years_good_conduct",
        duration: "2 years",
        anchor: "last_conviction_date_any_court",
        rule:
          "Two years of good conduct must run from the person's last conviction in any court."
      }
    ],
    requiredFacts: [
      "justice_or_municipal_court",
      "target_cases_in_that_court",
      "complete_conviction_history_anywhere",
      "last_conviction_date_any_court",
      "two_year_good_conduct_confirmation",
      "rehabilitation_evidence",
      "societal_best_interest_facts",
      "prosecutor_notice_date"
    ],
    packetFamily: [
      "justice_court_additional_misdemeanor_petition",
      "municipal_court_additional_misdemeanor_petition"
    ],
    checkoutState: "attorney_review_referral"
  },
  firstOffenseDui: {
    routeId: "first-offense-dui-expungement",
    remedy: "First-offense DUI expungement",
    authorities: ["Miss. Code Ann. § 63-11-30(13)"],
    timing: [
      {
        id: "five_years_after_successful_sentence_completion",
        duration: "5 years",
        anchor: "successful_completion_of_all_sentence_terms_date",
        rule:
          "Five years must run after successful completion of every term and condition of the sentence."
      }
    ],
    requiredFacts: [
      "qualifying_first_offense_under_subsection_2_or_3",
      "circuit_court_county_of_conviction",
      "successful_completion_of_all_sentence_terms_date",
      "no_cdl_or_clp_at_offense",
      "no_blood_or_breath_test_refusal",
      "bac_below_point_16_if_available",
      "no_other_or_pending_dui",
      "no_prior_dui_nonadjudication",
      "no_prior_dui_expunction",
      "justification_for_relief"
    ],
    packetFamily: ["circuit_court_first_offense_dui_expungement_petition"],
    checkoutState: "approved_packet_checkout_when_exact_timing_satisfied"
  },
  minorInPossessionUnderageAlcohol: {
    routeId: "minor-in-possession-underage-alcohol-expungement",
    remedy: "Minor-in-possession or underage-alcohol expungement",
    authorities: [
      "Miss. Code Ann. § 67-3-70(1)",
      "Miss. Code Ann. § 67-3-70(2)",
      "Miss. Code Ann. § 67-3-70(6)"
    ],
    timing: [
      {
        id: "one_year_after_dismissal_or_discharge",
        duration: "1 year",
        anchor: "dismissal_or_discharge_date",
        rule: "The dismissal branch opens one year after dismissal and discharge."
      },
      {
        id: "latest_of_sentence_completion_or_fine_payment",
        duration: "1 year",
        anchor: "latest_of_sentence_completion_or_fine_payment",
        rule:
          "The conviction branch opens one year after the latest applicable sentence-completion or fine-payment date."
      }
    ],
    requiredFacts: [
      "charge_under_67_3_70_subsection_1_or_2",
      "age_at_offense",
      "dismissal_or_conviction_branch",
      "dismissal_or_discharge_date",
      "sentence_completion_date",
      "fine_imposed_or_not_applicable",
      "fine_payment_date",
      "related_charges_outside_67_3_70"
    ],
    packetFamily: ["section_67_3_70_6_expungement_petition"],
    checkoutState: "approved_packet_checkout_when_exact_timing_satisfied"
  }
} as const satisfies Readonly<Record<string, MississippiCorrectionClosure>>;
