// The fact sets every check runs against.
//
// Three per form, and each one proves something different. The canonical set
// supplies every fact the specification marks required, so a full filing is
// what a complete participant record produces. The boundary set keeps the same
// shape but makes the values longer than the widgets were drawn to hold, so
// the length guards are exercised against measured geometry rather than
// against a guess. The negative set supplies almost nothing, so the refusal
// path is the one under test and any value that still appears is a leak.
//
// Nobody real is described here. Telephone numbers are in the 555-01xx range
// reserved for fiction and mail is at the reserved example.com domain.
import type { ColoradoFactSet } from "./types";

const PARTICIPANT = {
  "participant.full_legal_name": "Marion T. Ellsworth",
  "participant.date_of_birth": "1988-04-17",
  "participant.street_address": "418 Sycamore Ridge Road",
  "participant.city": "Denver",
  "participant.state": "CO",
  "participant.zip": "80202",
  "participant.city_state_zip": "Denver, CO 80202",
  "participant.mailing_address_full": "418 Sycamore Ridge Road, Denver, CO 80202",
  "participant.phone": "555-0142",
  "participant.email": "marion.ellsworth@example.com",
} as const;

const COURT = {
  "matter.court_type": "district",
  "matter.county": "Denver",
  "matter.case_number": "2023CR004182",
  "filing.court_address": "1437 Bannock Street, Room 256, Denver, CO 80202",
} as const;

const SERVICE = {
  "service.prosecuting_attorney_served": "yes",
  "service.sheriff_served": "yes",
  "service.sheriff_mailing_address": "10500 East Smith Road, Denver, CO 80239",
  "service.service_date": "2026-08-12",
  "service.method": "regular_mail",
} as const;

// ---------------------------------------------------------------- JDF 417 --

export const JDF_417_CANONICAL: ColoradoFactSet = {
  ...PARTICIPANT,
  ...COURT,
  ...SERVICE,
  "matter.division_or_courtroom": "Courtroom 5H",
  "matter.arrest_or_summons_number": "CO-FP-2023-114882",
  "matter.arrest_date": "2023-03-09",
  "election.filer_capacity": "person_in_interest",
  "election.filer_is_person_in_interest": "yes",
  "person_in_interest.full_legal_name": "Marion T. Ellsworth",
  "election.interpreter_needed": "no",
  "election.appearance_mode": "in_person",
  "service.law_enforcement_served": "yes",
  "service.law_enforcement_agency_name": "Denver Police Department",
  "service.law_enforcement_agency_address": "1331 Cherokee Street, Denver, CO 80204",
  "service.law_enforcement_agency_case_number": "DPD-2023-0098417",
  "service.other_agency_served": "no",
  "election.charges_ever_filed": "no",
  "election.completed_diversion": "no",
  "election.statute_of_limitations_passed": "yes",
  "election.still_under_investigation": "no",
  "matter.charges": [
    { charge: "Criminal trespass, second degree", grade: "Misdemeanor" },
    { charge: "Possession of drug paraphernalia", grade: "Misdemeanor" },
  ],
};

export const JDF_417_BOUNDARY: ColoradoFactSet = {
  ...JDF_417_CANONICAL,
  "participant.full_legal_name":
    "Maximiliana Aurelia Featherstonehaugh-Wintersgill de la Concepcion",
  "person_in_interest.full_legal_name":
    "Maximiliana Aurelia Featherstonehaugh-Wintersgill de la Concepcion",
  "participant.street_address":
    "14827 North Meadowbrook Commons Professional Plaza, Building C, Suite 2200",
  "participant.city_state_zip": "Denver Metropolitan Statistical Area, CO 80202-4417",
  "participant.email": "maximiliana.featherstonehaugh.wintersgill@example.com",
  "matter.case_number": "2023CR004182-CONSOLIDATED-WITH-2023CR004183-AND-2023CR004184",
  "filing.court_address":
    "Denver District Court, Lindsey-Flanigan Courthouse, 1437 Bannock Street, Room 256, Denver, Colorado 80202-5310",
  "service.law_enforcement_agency_address":
    "Denver Police Department Records Unit, 1331 Cherokee Street, Fourth Floor, Denver, Colorado 80204-2705",
  "matter.charges": [
    {
      charge:
        "Criminal trespass in the second degree, together with the lesser included offense charged in the alternative",
      grade: "Misdemeanor",
    },
    { charge: "Possession of drug paraphernalia", grade: "Misdemeanor" },
    { charge: "Failure to appear on a class 2 petty offense summons", grade: "Misdemeanor" },
  ],
};

/**
 * Nothing but the county.
 *
 * One fact rather than none, so the run is distinguishable from a run that
 * never reached the binder: exactly one field may be written, and every other
 * field on the form must come back refused.
 */
export const JDF_417_NEGATIVE: ColoradoFactSet = {
  "matter.county": "Denver",
};

// ---------------------------------------------------------------- JDF 612 --

export const JDF_612_CANONICAL: ColoradoFactSet = {
  ...PARTICIPANT,
  ...COURT,
  ...SERVICE,
  "matter.division": "Division 12",
  "matter.courtroom": "Courtroom 5H",
  "service.court_records_included": "yes",
  "service.law_enforcement_1_served": "yes",
  "service.law_enforcement_1_name": "Denver Police Department",
  "service.law_enforcement_1_case_number": "DPD-2021-0044190",
  "service.law_enforcement_1_address": "1331 Cherokee Street, Denver, CO 80204",
  "service.law_enforcement_2_served": "no",
  "service.other_agency_1_served": "no",
  "service.other_agency_2_served": "no",
  "service.mail_recipient_name_and_address":
    "Office of the District Attorney, Second Judicial District, 201 West Colfax Avenue, Denver, CO 80202",
  "conviction.petty_offenses_present": "no",
  "conviction.misdemeanor_offenses_present": "yes",
  "conviction.misdemeanor_offenses": "Criminal trespass, second degree",
  "conviction.felony_offenses_present": "no",
  "conviction.sentence_date": "2021-11-08",
  "conviction.supervision_termination_date": "2023-05-19",
  "election.drug_offense_before_2013_10_01": "no",
  "election.psilocybin_conduct_no_longer_unlawful": "no",
  "election.human_trafficking_victim": "no",
  "election.eligibility_ground": "eligible_706_or_707",
  "election.believes_automatic_sealing_applies": "no",
  "election.case_appealed": "no",
  "election.restitution_outstanding": "no",
  "election.criminal_history_attached": "yes",
  "narrative.harm_or_adverse_consequences":
    "The record has cost me two tenancies and the professional licence I trained for. I have had no further contact with the criminal justice system in the five years since the sentence ended.",
};

export const JDF_612_BOUNDARY: ColoradoFactSet = {
  ...JDF_612_CANONICAL,
  "participant.full_legal_name":
    "Maximiliana Aurelia Featherstonehaugh-Wintersgill de la Concepcion",
  "participant.mailing_address_full":
    "14827 North Meadowbrook Commons Professional Plaza, Building C, Suite 2200, Denver, Colorado 80202-4417",
  "participant.email": "maximiliana.featherstonehaugh.wintersgill@example.com",
  "matter.case_number": "2021CR004182-CONSOLIDATED-WITH-2021CR004183-AND-2021CR004184",
  "filing.court_address":
    "Denver District Court, Lindsey-Flanigan Courthouse, 1437 Bannock Street, Room 256, Denver, Colorado 80202-5310",
  // The district attorney does not consent, which is the one path that opens
  // the clear-and-convincing box on page 4.
  "election.eligibility_ground": "misdemeanor_not_eligible_706",
  "election.district_attorney_position": "does_not_consent",
  "narrative.clear_and_convincing_showing":
    "The need for sealing is significant and substantial: the conviction is the sole reason two licensing boards have refused an application, and it is now more than five years old. The passage of time is such that I no longer pose a risk to public safety, and public disclosure of the record is no longer necessary to protect or inform the public.",
  "election.case_appealed": "yes",
  "appeal.case_number": "2022CA000913",
  "appeal.court": "court_of_appeals",
  "appeal.result": "Affirmed in part and remanded for resentencing",
  "appeal.result_date": "2022-10-27",
  "conviction.petty_offenses_present": "yes",
  "conviction.petty_offenses": "Petty theft of property valued under fifty dollars, two counts",
};

/** As for JDF 417: one fact, so every other field must refuse. */
export const JDF_612_NEGATIVE: ColoradoFactSet = {
  "matter.county": "Denver",
};
