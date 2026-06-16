// Washington record-clearing pathways.
// Source of truth: "Washington State Record Relief — Wilma Agent Training
// Reference" (Nationwide Record Clearing / LegalEase Washington), corroborated by
// the cited Revised Code of Washington (RCW 9.96.060 misdemeanor/gross-misdemeanor
// vacation; RCW 9.94A.640 felony vacation; RCW 10.97.060 non-conviction deletion;
// RCW 13.50.260 juvenile sealing; RCW 9.96.080 and RCW 9.94A.648 victim/survivor
// vacation; RCW 9.94A.637 discharge; RCW 69.50.4013/69.50.4014 Blake) and
// Washington Courts / WSP / Washington LawHelp guidance. Washington's adult remedy
// is VACATION, not expungement. Citations are RCW unless otherwise noted. No
// content here is derived from any modeled form or legacy generator.

export type WaRemedyType =
  | "misdemeanor_vacation"
  | "felony_vacation"
  | "non_conviction_deletion"
  | "blake_vacatur_refund"
  | "cannabis_vacation"
  | "victim_survivor_vacation"
  | "juvenile_sealing"
  | "treaty_fishing_vacation"
  | "needs_review";

export type WaPathway =
  | "misdemeanor_gross_misdemeanor_vacation"
  | "felony_vacation"
  | "non_conviction_deletion"
  | "blake_drug_possession_vacatur"
  | "cannabis_misdemeanor_vacation"
  | "victim_survivor_vacation"
  | "juvenile_sealing"
  | "treaty_indian_fishing_vacation"
  | "needs_review";

export type WaEligibilitySignal =
  | "possible_misdemeanor_vacation_3_years"
  | "possible_dv_misdemeanor_vacation_5_years"
  | "possible_felony_class_b_vacation_10_years"
  | "possible_felony_class_c_vacation_5_years"
  | "not_eligible_class_a_felony_normal_route"
  | "not_eligible_violent_or_barred_offense"
  | "possible_non_conviction_deletion_2_or_3_years"
  | "possible_blake_vacatur_and_lfo_refund"
  | "possible_cannabis_misdemeanor_vacation"
  | "possible_victim_survivor_vacation"
  | "possible_juvenile_sealing"
  | "blocked_pending_charge"
  | "attorney_or_legal_aid_review"
  | "needs_more_information";

export const waPathwayLabels: Record<WaPathway, string> = {
  misdemeanor_gross_misdemeanor_vacation:
    "Adult misdemeanor / gross-misdemeanor vacation — petition the sentencing court to withdraw the plea/set aside the verdict, dismiss the charge, and vacate the judgment; ordinary 3-year wait, 5-year DV wait, special cannabis/victim routes; not for barred violent offenses (RCW 9.96.060)",
  felony_vacation:
    "Adult felony vacation — after discharge under RCW 9.94A.637, petition the sentencing court; Class B 10-year wait, Class C 5-year wait, Class A not available; violent/person offenses barred except Assault 2, certain Assault 3, and Robbery 2 with no firearm/deadly-weapon/sexual-motivation enhancement; felony DUI barred (RCW 9.94A.640)",
  non_conviction_deletion:
    "Non-conviction deletion — WSP deletion of non-conviction criminal-history record information 2+ years after favorable disposition or 3 years from arrest where no conviction was obtained, unless a fugitive, active prosecution, or an agency-refusal factor applies (RCW 10.97.060)",
  blake_drug_possession_vacatur:
    "Blake drug-possession vacatur + LFO refund — simple-possession convictions under RCW 69.50.4013/69.50.4014, predecessors, similar ordinances, and certain inchoate offenses are unconstitutionally void and must be vacated, with paid LFOs and interest refunded (State v. Blake)",
  cannabis_misdemeanor_vacation:
    "Misdemeanor cannabis vacation — a person 21+ at the time of a misdemeanor cannabis offense may apply to the sentencing court, and if qualifying the court SHALL vacate (RCW 9.96.060 cannabis subsection)",
  victim_survivor_vacation:
    "Victim/survivor vacation — for convictions committed as a result of trafficking, prostitution, commercial sexual abuse of a minor, sexual assault, or domestic violence; misdemeanors via RCW 9.96.080, Class B/C felonies via RCW 9.94A.648; manual/legal review",
  juvenile_sealing:
    "Juvenile sealing — administrative sealing scheduled after age 18 / end of probation / parole completion, immediate sealing on acquittal or dismissal with prejudice, or motion-based sealing (5 years Class A, 2 years Class B/C/gross-misdemeanor/misdemeanor/diversion) (RCW 13.50.260)",
  treaty_indian_fishing_vacation:
    "Treaty Indian fishing-rights conviction vacation — a special vacation route with separate Washington Courts forms (CrRLJ CR 09.0500/09.0600/09.0700)",
  needs_review: "More information, the offense class/RCW, the WSP record, or attorney review needed"
};

export const waPathways: Array<{
  pathway: WaPathway;
  label: string;
  remedyType: WaRemedyType;
  citation: string;
}> = [
  {
    pathway: "misdemeanor_gross_misdemeanor_vacation",
    label: waPathwayLabels.misdemeanor_gross_misdemeanor_vacation,
    remedyType: "misdemeanor_vacation",
    citation: "RCW 9.96.060"
  },
  {
    pathway: "felony_vacation",
    label: waPathwayLabels.felony_vacation,
    remedyType: "felony_vacation",
    citation: "RCW 9.94A.640"
  },
  {
    pathway: "non_conviction_deletion",
    label: waPathwayLabels.non_conviction_deletion,
    remedyType: "non_conviction_deletion",
    citation: "RCW 10.97.060"
  },
  {
    pathway: "blake_drug_possession_vacatur",
    label: waPathwayLabels.blake_drug_possession_vacatur,
    remedyType: "blake_vacatur_refund",
    citation: "RCW 69.50.4013; RCW 69.50.4014 (State v. Blake)"
  },
  {
    pathway: "cannabis_misdemeanor_vacation",
    label: waPathwayLabels.cannabis_misdemeanor_vacation,
    remedyType: "cannabis_vacation",
    citation: "RCW 9.96.060"
  },
  {
    pathway: "victim_survivor_vacation",
    label: waPathwayLabels.victim_survivor_vacation,
    remedyType: "victim_survivor_vacation",
    citation: "RCW 9.96.080; RCW 9.94A.648"
  },
  {
    pathway: "juvenile_sealing",
    label: waPathwayLabels.juvenile_sealing,
    remedyType: "juvenile_sealing",
    citation: "RCW 13.50.260"
  },
  {
    pathway: "treaty_indian_fishing_vacation",
    label: waPathwayLabels.treaty_indian_fishing_vacation,
    remedyType: "treaty_fishing_vacation",
    citation: "RCW 9.96.060"
  },
  {
    pathway: "needs_review",
    label: waPathwayLabels.needs_review,
    remedyType: "needs_review",
    citation: "RCW 9.96.060"
  }
];
