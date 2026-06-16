// Louisiana waiting periods. Sourced from the Louisiana Expungement Reference for
// Wilma (Nationwide Record Clearing), sections 3-4, corroborated by La. Code
// Crim. Proc. arts. 977, 978, 994, 998. Clean-period clocks run from completion
// of sentence/deferred adjudication/probation/parole.
export const laWaitingPeriodNotes = {
  noConvictionGeneral:
    "Arrest with no conviction (arts. 976-977): generally no waiting period once the qualifying disposition (no prosecution + expired time limit, DA refusal, dismissal/quash/acquittal, or factual innocence) is established.",
  noConvictionDwiDiversion:
    "DWI diversion exception (art. 977): if the arrest was for DWI or a local equivalent and the person entered pretrial diversion, expungement is not available until five years have elapsed from the date of arrest.",
  misdemeanor894SetAside:
    "Misdemeanor conviction (art. 977): no fixed clean-period wait if the conviction was set aside and prosecution dismissed under art. 894(B).",
  misdemeanorFiveYear:
    "Misdemeanor conviction (art. 977): more than five years since completion of sentence/deferred adjudication/probation/parole, with no felony conviction during that five-year period and no pending felony charge; DA certification required.",
  firstOffenseMarijuana:
    "First-offense misdemeanor marijuana possession (art. 998): may be filed 90 days after conviction.",
  felony893SetAside:
    "Felony conviction (art. 978): no fixed clean-period wait if the conviction was set aside and prosecution dismissed under art. 893(E).",
  felonyTenYear:
    "Felony conviction (art. 978): more than ten years since completion of sentence/deferred adjudication/probation/parole, with no other criminal conviction during the ten-year period before filing and no pending charge; DA certification required.",
  felonyFirstOffenderPardon:
    "Felony conviction (art. 978): available where the person is entitled to a first-offender pardon (La. R.S. 15:572), provided the offense is not a crime of violence or sex offense and court costs are paid.",
  felony978EViolentException:
    "Violent-offense exception (art. 978(E)): for the listed offenses (aggravated battery, second degree battery, aggravated criminal damage to property, simple robbery, purse snatching, illegal use of weapons/dangerous instrumentalities), more than ten years since completion, no criminal conviction during that period, and no pending charge — after a contradictory hearing.",
  interimExpungement:
    "Interim expungement (arts. 994-995): no art. 977/978 waiting-period limit and no numerical cap.",
  traffickingVictim:
    "Human-trafficking-victim certification (arts. 977-978): DA certification waives the applicable art. 977 and 978 time delays (and fees).",
  objectionWindow:
    "Agency objection: an objecting agency must generally file an affidavit of response within 60 days from service; a timely objection triggers a contradictory hearing, where the objecting agency must show by a preponderance why expungement should not be granted.",
  custodyBar:
    "Filing bar: no motion to expunge may be filed while the person is in DPS&C physical custody serving a hard-labor sentence."
};
