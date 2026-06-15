// Maryland waiting periods. Sourced from the Maryland Wilma Agent Training
// Reference (Nationwide Record Clearing): § 10-105(c) timing, § 10-110(c)
// waiting periods, § 10-105.1 automatic timing, and Second Chance Act shielding.
export const mdWaitingPeriodNotes = {
  // § 10-105 non-conviction timing
  nonConvictionFavorable:
    "Acquittal, nolle prosequi, or dismissal (§ 10-105): 3 years after disposition, unless the person files a General Waiver and Release of tort claims arising from the charge (Form CC-DC-CR-078), in which case it may be filed earlier.",
  pbj:
    "Probation before judgment / PBJ (§ 10-105): the later of discharge from probation or 3 years after the PBJ was granted.",
  pbjDui:
    "PBJ for DUI/DWI under Transportation § 21-902(a) or (b) (§ 10-105): 15 years after discharge from probation.",
  treatmentNolle:
    "Treatment nolle prosequi (§ 10-105): after the required treatment is completed.",
  stetCompromise:
    "Stet or compromise (§ 10-105): 3 years after the stet or compromise.",
  ncr:
    "Not-criminally-responsible route under § 10-105(a)(9) or (10): 3 years after the NCR finding; the listed nuisance/transit-type convictions under § 10-105(a)(9) are 3 years after sentence completion.",
  cannabisPossession:
    "Cannabis possession conviction (§ 10-105 cannabis route): after sentence completion.",
  goodCause:
    "Good cause (§ 10-105): the court may grant expungement at any time on a showing of good cause.",
  // § 10-105.1 automatic
  automatic:
    "Automatic expungement (§ 10-105.1): all-favorable cases entered on or after October 1, 2021 are court-expunged 3 years after the qualifying disposition; an earlier petition may be filed using Form CC-DC-CR-072C.",
  // § 10-110 conviction timing
  convictionMisdemeanor:
    "Most listed § 10-110 misdemeanors: 5 years after completion of sentence.",
  convictionAssaultBattery:
    "Second-degree assault / common-law battery (§ 10-110): 7 years after completion of sentence.",
  convictionFelony:
    "Most eligible § 10-110 felonies: 7 years after completion of sentence.",
  convictionCannabisPwid:
    "Possession with intent to distribute cannabis (§ 10-110): 3 years after completion of sentence.",
  convictionBurglaryTheft:
    "First-degree burglary, second-degree burglary, or felony theft (§ 10-110): 10 years after completion of sentence.",
  convictionDomestic:
    "Domestically related crime (§ 10-110): 15 years after completion of sentence.",
  // Shielding + objection windows
  shielding:
    "Second Chance Act shielding (§§ 10-301 to 10-306): no earlier than 3 years after satisfying the sentence for all convictions being shielded, including parole, probation, or mandatory supervision; one lifetime petition.",
  juvenile:
    "Juvenile expungement (Cts. & Jud. Proc. § 3-8A-27.1): commonly at least 18 years old and at least 2 years since the last official action in the juvenile record.",
  objectionConvictionVictim:
    "Section 10-110: if the State's Attorney or a victim objects within 30 days, the court holds a hearing; if no objection is filed, the court may enter the expungement order.",
  completionMeaning:
    "Sentence completion for waiting-period purposes means expiration of the entire sentence, including incarceration, parole, probation, mandatory supervision, treatment, and (for § 10-110) consideration of court-ordered restitution."
};
