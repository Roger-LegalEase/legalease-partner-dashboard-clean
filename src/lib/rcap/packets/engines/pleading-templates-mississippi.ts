// Mississippi pleading templates — implementation Tranche 1.
//
// Mississippi publishes no statewide expungement form. The accepted
// normalization and the Edition 1.2 controlling addendum both establish that,
// so a statewide neutral pleading drafted to the statute is the controlling
// output for every Mississippi petition route rather than a fallback.
//
// What these templates deliberately do NOT carry, because the only archived
// Mississippi models are Fourth Circuit Court District local drafts that
// Edition 1.2 keeps reference-only:
//
//   - a hard-coded county list (Leflore, Sunflower, Washington);
//   - the Greenville district attorney's address;
//   - 2020 filing dates;
//   - the certificate of service captioned for a different document;
//   - the mandatory grand-jury allegation;
//   - a race field;
//   - a full social security number field;
//   - the § 99-15-26 / § 99-19-71 dual citation that conflates two mechanisms.
//
// Court, county, city and prosecuting authority are participant data. Every
// judicial finding, signature and date is left blank. LegalEase asserts no
// rehabilitation narrative, no public-safety conclusion and no
// interests-of-justice finding: the statutes reached here do not require the
// petitioner to plead one, and inventing one would be legal argument.
//
// Every template is DRAFT PENDING LEGAL REVIEW until reviewing counsel approves
// it. The banner says so on the face of every rendering, so a stray copy cannot
// be mistaken for a filing.

import type { PleadingTemplate } from "@/lib/rcap/packets/engines/pleading-templates";

const BANNER =
  "DRAFT PENDING LEGAL REVIEW — PREPARED BY LEGALEASE FOR A SELF-REPRESENTED PETITIONER — NOT LEGAL ADVICE — DO NOT FILE UNTIL REVIEWED";

const VERSION = "1.0.0";

/** Participant-authored text is always introduced as the petitioner's own statement. */
const PARTICIPANT_STATEMENT_PREFIX = "Petitioner states, in Petitioner's own words:";

const TRUTH_STATEMENT =
  "Petitioner states that the facts set out above are true and correct to the best of Petitioner's knowledge and belief.";

function caption(courtLineKey: string, title: string) {
  return {
    courtLine: courtLineKey,
    partyBlockLeft: ["STATE OF MISSISSIPPI", "", "v.", "", "{{petitionerName}},", "", "Petitioner."],
    partyBlockRight: ["Cause No. {{causeNumber}}", "", title]
  };
}

const SIGNATURE_BLOCK: readonly string[] = [
  "{{petitionerName}}, Petitioner, self-represented",
  "{{mailingAddress}}",
  "{{contactPhone}}",
  "{{contactEmail}}",
  "Date: ______________________"
];

/** The court signs. Every line here stays blank on the generated document. */
const ORDER_SIGNATURE_BLOCK: readonly string[] = [
  "",
  "_____________________________________",
  "JUDGE",
  "",
  "Date: ______________________"
];

const CERTIFICATE_LINES: readonly string[] = [
  "I, {{petitionerName}}, certify that I delivered a true and correct copy of the Petition for Expungement and the proposed Order to the prosecuting authority named below, on the date written below, by the method written below.",
  "",
  "Prosecuting authority served: {{prosecutingAuthorityName}}",
  "Address used: {{prosecutingAuthorityAddress}}",
  "Method of delivery: {{serviceMethod}}",
  "Date of delivery: ______________________",
  "",
  "Signature: _____________________________________",
  "{{petitionerName}}, Petitioner, self-represented"
];

/** Sections every Mississippi petition shares, in the same order. */
function identificationSection(extra: readonly string[] = []) {
  return {
    heading: "I.  PETITIONER AND CASE",
    numbered: true,
    paragraphs: [
      "Petitioner is {{petitionerName}}, date of birth {{dateOfBirth}}, who resides at {{mailingAddress}}, in {{countyOfResidence}}, Mississippi.",
      "This petition concerns cause number {{causeNumber}} in the {{courtName}}, {{courtCounty}}, Mississippi.",
      "The charge at issue is {{chargeDescription}}. The date of the offence or arrest is {{offenceDate}}.",
      ...extra
    ]
  };
}

const SERVICE_AND_RELIEF_NOTE =
  "Petitioner asks the Court to grant this petition and to enter the proposed Order submitted with it.";

export const MISSISSIPPI_PLEADING_TEMPLATES: Readonly<Record<string, PleadingTemplate>> = {
  // -------------------------------------------------------------------------
  // ms-fel — one felony conviction, Miss. Code Ann. § 99-19-71(2)
  // -------------------------------------------------------------------------
  "ms-fel-petition": {
    templateId: "ms-fel-petition",
    version: VERSION,
    technicalFixture: true,
    fixtureBanner: BANNER,
    caption: caption(
      "IN THE CIRCUIT COURT OF {{courtCountyUpper}} COUNTY, MISSISSIPPI",
      "PETITION FOR EXPUNGEMENT"
    ),
    title: "PETITION TO EXPUNGE ONE FELONY CONVICTION",
    preamble:
      "Petitioner, appearing without a lawyer, respectfully petitions this Court under Miss. Code Ann. § 99-19-71(2) to expunge the record of one felony conviction, and states:",
    sections: [
      identificationSection([
        "Petitioner was convicted of this felony in this Court on {{convictionDate}}."
      ]),
      {
        heading: "II.  STATUTORY BASIS",
        numbered: true,
        paragraphs: [
          "Miss. Code Ann. § 99-19-71(2)(a) permits a person who has been convicted of one felony to petition the court in which the conviction was entered to expunge the record of that conviction.",
          "Section 99-19-71(2)(a), as amended by 2026 House Bill 1546, Chapter 430, Laws of 2026, effective 1 July 2026, requires that at least three years have passed since the successful completion of all terms and conditions of the sentence.",
          "Petitioner completed all terms and conditions of the sentence in this cause on {{sentenceCompletionDate}}. More than three years have passed since that date.",
          "This is the only felony conviction for which Petitioner has sought or received expungement.",
          "The offence of conviction is not one of the offences that § 99-19-71(2)(a) excludes from expungement."
        ]
      },
      {
        heading: "III.  NOTICE TO THE DISTRICT ATTORNEY",
        numbered: true,
        paragraphs: [
          "Miss. Code Ann. § 99-19-71(2)(b) requires ten days' written notice to the district attorney before a hearing on this petition.",
          "The written notice required by § 99-19-71(2)(b) is served with this petition on {{prosecutingAuthorityName}}, and the certificate of service filed with this petition evidences that delivery."
        ]
      },
      {
        heading: "IV.  PETITIONER'S STATEMENT",
        numbered: false,
        paragraphs: [
          PARTICIPANT_STATEMENT_PREFIX,
          "{{petitionerStatement}}",
          "The paragraph above is the Petitioner's own statement. It was written by the Petitioner and is reproduced without change."
        ]
      }
    ],
    prayer: [
      "WHEREFORE, Petitioner asks the Court to enter an order expunging the record of the felony conviction in cause number {{causeNumber}}, and directing the clerk of this Court, the arresting agency and the Mississippi Criminal Information Center to expunge their records of that conviction as Miss. Code Ann. § 99-19-71 provides.",
      SERVICE_AND_RELIEF_NOTE
    ],
    verification: TRUTH_STATEMENT,
    signatureBlock: SIGNATURE_BLOCK
  },

  "ms-fel-proposed-order": {
    templateId: "ms-fel-proposed-order",
    version: VERSION,
    technicalFixture: true,
    fixtureBanner: BANNER,
    caption: caption(
      "IN THE CIRCUIT COURT OF {{courtCountyUpper}} COUNTY, MISSISSIPPI",
      "ORDER OF EXPUNGEMENT"
    ),
    title: "ORDER OF EXPUNGEMENT",
    preamble:
      "This proposed order is submitted for the Court's consideration. Every finding, signature and date below is left blank for the Court.",
    sections: [
      {
        numbered: false,
        paragraphs: [
          "THIS CAUSE came before the Court on the Petition of {{petitionerName}} to expunge the record of one felony conviction in cause number {{causeNumber}} under Miss. Code Ann. § 99-19-71(2).",
          "The Court, having considered the petition and the record, and the district attorney having received the notice required by Miss. Code Ann. § 99-19-71(2)(b), finds:",
          "( ) that the petition is well taken and should be GRANTED.",
          "( ) that the petition should be DENIED.",
          "",
          "IT IS THEREFORE ORDERED that the record of the conviction in cause number {{causeNumber}} be, and hereby is, EXPUNGED.",
          "IT IS FURTHER ORDERED that the clerk of this Court, {{arrestingAgencyName}}, and the Mississippi Criminal Information Center expunge their records of that conviction, except as Miss. Code Ann. § 99-19-71(3) permits the Criminal Information Center to retain a nonpublic record solely for determining whether a person is a first offender in a subsequent proceeding.",
          "IT IS FURTHER ORDERED that the clerk deliver a certified copy of this Order to {{petitionerName}} and to {{prosecutingAuthorityName}}."
        ]
      }
    ],
    prayer: [],
    signatureLabel: null,
    signatureBlock: ORDER_SIGNATURE_BLOCK
  },

  "ms-fel-certificate-of-service": {
    templateId: "ms-fel-certificate-of-service",
    version: VERSION,
    technicalFixture: true,
    fixtureBanner: BANNER,
    caption: caption(
      "IN THE CIRCUIT COURT OF {{courtCountyUpper}} COUNTY, MISSISSIPPI",
      "CERTIFICATE OF SERVICE"
    ),
    title: "CERTIFICATE OF SERVICE",
    preamble:
      "This certificate belongs to the Petition to Expunge One Felony Conviction filed in cause number {{causeNumber}}, and to no other document.",
    sections: [],
    prayer: [],
    signatureLabel: null,
    signatureBlock: [],
    certificateOfService: CERTIFICATE_LINES
  },

  "ms-fel-da-notice": {
    templateId: "ms-fel-da-notice",
    version: VERSION,
    technicalFixture: true,
    fixtureBanner: BANNER,
    caption: caption(
      "IN THE CIRCUIT COURT OF {{courtCountyUpper}} COUNTY, MISSISSIPPI",
      "NOTICE TO DISTRICT ATTORNEY"
    ),
    title: "TEN DAYS' WRITTEN NOTICE TO THE DISTRICT ATTORNEY",
    preamble:
      "Miss. Code Ann. § 99-19-71(2)(b) requires that the district attorney receive ten days' written notice before a hearing on a felony expungement petition. This document is that notice.",
    sections: [
      {
        numbered: false,
        paragraphs: [
          "TO: {{prosecutingAuthorityName}}",
          "{{prosecutingAuthorityAddress}}",
          "",
          "You are notified that {{petitionerName}} has filed a Petition to Expunge One Felony Conviction in cause number {{causeNumber}} in the {{courtName}}, {{courtCounty}}, Mississippi, under Miss. Code Ann. § 99-19-71(2).",
          "A copy of the petition and the proposed order are delivered with this notice.",
          "The hearing date, if the Court sets one, will be supplied by the clerk. Petitioner will notify you of that date when the clerk provides it.",
          "",
          "Date of this notice: ______________________"
        ]
      }
    ],
    prayer: [],
    signatureBlock: ["{{petitionerName}}, Petitioner, self-represented", "{{mailingAddress}}"]
  },

  // -------------------------------------------------------------------------
  // ms-misd-1st — first-offender misdemeanour, Miss. Code Ann. § 99-19-71(1)
  // -------------------------------------------------------------------------
  "ms-misd-1st-petition": {
    templateId: "ms-misd-1st-petition",
    version: VERSION,
    technicalFixture: true,
    fixtureBanner: BANNER,
    caption: caption("IN THE {{courtNameUpper}}, MISSISSIPPI", "PETITION FOR EXPUNGEMENT"),
    title: "PETITION TO EXPUNGE A FIRST MISDEMEANOR CONVICTION",
    preamble:
      "Petitioner, appearing without a lawyer, respectfully petitions this Court under Miss. Code Ann. § 99-19-71(1) to expunge the record of one misdemeanour conviction, and states:",
    sections: [
      identificationSection([
        "Petitioner was convicted of this misdemeanour in this Court on {{convictionDate}}."
      ]),
      {
        heading: "II.  STATUTORY BASIS",
        numbered: true,
        paragraphs: [
          "Miss. Code Ann. § 99-19-71(1) permits a first offender convicted of a misdemeanour to petition the justice, county, circuit or municipal court in which the conviction was entered to expunge the record of that conviction.",
          "Petitioner had not previously been convicted of a misdemeanour before the conviction in this cause, other than a traffic violation.",
          "Petitioner has not previously received an expungement of a misdemeanour conviction under Miss. Code Ann. § 99-19-71(1).",
          "The offence of conviction is not one of the offences § 99-19-71(1) excludes."
        ]
      },
      {
        heading: "III.  PETITIONER'S STATEMENT",
        numbered: false,
        paragraphs: [
          PARTICIPANT_STATEMENT_PREFIX,
          "{{petitionerStatement}}",
          "The paragraph above is the Petitioner's own statement. It was written by the Petitioner and is reproduced without change."
        ]
      }
    ],
    prayer: [
      "WHEREFORE, Petitioner asks the Court to enter an order expunging the record of the misdemeanour conviction in cause number {{causeNumber}}, and directing the clerk of this Court, the arresting agency and the Mississippi Criminal Information Center to expunge their records of that conviction as Miss. Code Ann. § 99-19-71 provides.",
      SERVICE_AND_RELIEF_NOTE
    ],
    verification: TRUTH_STATEMENT,
    signatureBlock: SIGNATURE_BLOCK
  },

  "ms-misd-1st-proposed-order": {
    templateId: "ms-misd-1st-proposed-order",
    version: VERSION,
    technicalFixture: true,
    fixtureBanner: BANNER,
    caption: caption("IN THE {{courtNameUpper}}, MISSISSIPPI", "ORDER OF EXPUNGEMENT"),
    title: "ORDER OF EXPUNGEMENT",
    preamble:
      "This proposed order is submitted for the Court's consideration. Every finding, signature and date below is left blank for the Court.",
    sections: [
      {
        numbered: false,
        paragraphs: [
          "THIS CAUSE came before the Court on the Petition of {{petitionerName}} to expunge the record of a first misdemeanour conviction in cause number {{causeNumber}} under Miss. Code Ann. § 99-19-71(1).",
          "The Court, having considered the petition and the record, finds:",
          "( ) that the petition is well taken and should be GRANTED.",
          "( ) that the petition should be DENIED.",
          "",
          "IT IS THEREFORE ORDERED that the record of the conviction in cause number {{causeNumber}} be, and hereby is, EXPUNGED.",
          "IT IS FURTHER ORDERED that the clerk of this Court, {{arrestingAgencyName}}, and the Mississippi Criminal Information Center expunge their records of that conviction, except as Miss. Code Ann. § 99-19-71(3) permits the Criminal Information Center to retain a nonpublic record solely for determining whether a person is a first offender in a subsequent proceeding.",
          "IT IS FURTHER ORDERED that the clerk deliver a certified copy of this Order to {{petitionerName}} and to {{prosecutingAuthorityName}}."
        ]
      }
    ],
    prayer: [],
    signatureLabel: null,
    signatureBlock: ORDER_SIGNATURE_BLOCK
  },

  "ms-misd-1st-certificate-of-service": {
    templateId: "ms-misd-1st-certificate-of-service",
    version: VERSION,
    technicalFixture: true,
    fixtureBanner: BANNER,
    caption: caption("IN THE {{courtNameUpper}}, MISSISSIPPI", "CERTIFICATE OF SERVICE"),
    title: "CERTIFICATE OF SERVICE",
    preamble:
      "This certificate belongs to the Petition to Expunge a First Misdemeanor Conviction filed in cause number {{causeNumber}}, and to no other document.",
    sections: [],
    prayer: [],
    signatureLabel: null,
    signatureBlock: [],
    certificateOfService: CERTIFICATE_LINES
  },

  // -------------------------------------------------------------------------
  // ms-misd-addl — additional justice or municipal court misdemeanours,
  // Miss. Code Ann. §§ 9-11-15(3) and 21-23-7(6). One mechanism, two venues.
  // -------------------------------------------------------------------------
  "ms-misd-addl-petition": {
    templateId: "ms-misd-addl-petition",
    version: VERSION,
    technicalFixture: true,
    fixtureBanner: BANNER,
    caption: caption("IN THE {{courtNameUpper}}, MISSISSIPPI", "PETITION FOR EXPUNGEMENT"),
    title: "PETITION TO EXPUNGE ADDITIONAL MISDEMEANOR CONVICTIONS",
    preamble:
      "Petitioner, appearing without a lawyer, respectfully petitions this Court under {{venueStatuteCitation}} to expunge the record of the misdemeanour conviction identified below, and states:",
    sections: [
      identificationSection([
        "Petitioner was convicted of this misdemeanour in this Court on {{convictionDate}}."
      ]),
      {
        heading: "II.  STATUTORY BASIS",
        numbered: true,
        paragraphs: [
          "{{venueStatuteSentence}}",
          "Two years or more have passed since Petitioner satisfied all terms and conditions of the sentence in this cause. Petitioner satisfied those terms on {{sentenceCompletionDate}}.",
          "The conviction is not a traffic violation and is not an offence the statute excludes.",
          "Petitioner asks the Court to exercise the discretion the statute confers."
        ]
      },
      {
        heading: "III.  PETITIONER'S STATEMENT",
        numbered: false,
        paragraphs: [
          PARTICIPANT_STATEMENT_PREFIX,
          "{{petitionerStatement}}",
          "The paragraph above is the Petitioner's own statement. It was written by the Petitioner and is reproduced without change."
        ]
      }
    ],
    prayer: [
      "WHEREFORE, Petitioner asks the Court to enter an order expunging the record of the misdemeanour conviction in cause number {{causeNumber}}, and directing the clerk of this Court, the arresting agency and the Mississippi Criminal Information Center to expunge their records of that conviction.",
      SERVICE_AND_RELIEF_NOTE
    ],
    verification: TRUTH_STATEMENT,
    signatureBlock: SIGNATURE_BLOCK
  },

  "ms-misd-addl-proposed-order": {
    templateId: "ms-misd-addl-proposed-order",
    version: VERSION,
    technicalFixture: true,
    fixtureBanner: BANNER,
    caption: caption("IN THE {{courtNameUpper}}, MISSISSIPPI", "ORDER OF EXPUNGEMENT"),
    title: "ORDER OF EXPUNGEMENT",
    preamble:
      "This proposed order is submitted for the Court's consideration. Every finding, signature and date below is left blank for the Court.",
    sections: [
      {
        numbered: false,
        paragraphs: [
          "THIS CAUSE came before the Court on the Petition of {{petitionerName}} to expunge the record of a misdemeanour conviction in cause number {{causeNumber}} under {{venueStatuteCitation}}.",
          "The Court, having considered the petition and the record, finds:",
          "( ) that the petition is well taken and should be GRANTED.",
          "( ) that the petition should be DENIED.",
          "",
          "IT IS THEREFORE ORDERED that the record of the conviction in cause number {{causeNumber}} be, and hereby is, EXPUNGED.",
          "IT IS FURTHER ORDERED that the clerk of this Court, {{arrestingAgencyName}}, and the Mississippi Criminal Information Center expunge their records of that conviction.",
          "IT IS FURTHER ORDERED that the clerk deliver a certified copy of this Order to {{petitionerName}} and to {{prosecutingAuthorityName}}."
        ]
      }
    ],
    prayer: [],
    signatureLabel: null,
    signatureBlock: ORDER_SIGNATURE_BLOCK
  },

  "ms-misd-addl-certificate-of-service": {
    templateId: "ms-misd-addl-certificate-of-service",
    version: VERSION,
    technicalFixture: true,
    fixtureBanner: BANNER,
    caption: caption("IN THE {{courtNameUpper}}, MISSISSIPPI", "CERTIFICATE OF SERVICE"),
    title: "CERTIFICATE OF SERVICE",
    preamble:
      "This certificate belongs to the Petition to Expunge Additional Misdemeanor Convictions filed in cause number {{causeNumber}}, and to no other document.",
    sections: [],
    prayer: [],
    signatureLabel: null,
    signatureBlock: [],
    certificateOfService: CERTIFICATE_LINES
  },

  // -------------------------------------------------------------------------
  // ms-nonconv — case that did not end in conviction,
  // Miss. Code Ann. § 99-19-71(4). One mechanism, four dispositional branches.
  // -------------------------------------------------------------------------
  "ms-nonconv-petition": {
    templateId: "ms-nonconv-petition",
    version: VERSION,
    technicalFixture: true,
    fixtureBanner: BANNER,
    caption: caption("IN THE {{courtNameUpper}}, MISSISSIPPI", "PETITION FOR EXPUNGEMENT"),
    title: "PETITION TO EXPUNGE THE RECORD OF A CASE THAT DID NOT END IN A CONVICTION",
    preamble:
      "Petitioner, appearing without a lawyer, respectfully petitions this Court under Miss. Code Ann. § 99-19-71(4) to expunge the record of a case that did not end in a conviction, and states:",
    sections: [
      identificationSection(["Petitioner was arrested on {{arrestDate}} by {{arrestingAgencyName}}."]),
      {
        heading: "II.  DISPOSITION",
        numbered: true,
        paragraphs: [
          "{{dispositionAllegation}}",
          "The case did not result in a conviction.",
          "Petitioner has not previously received an expungement of this arrest or charge."
        ]
      },
      {
        heading: "III.  STATUTORY BASIS",
        numbered: true,
        paragraphs: [
          "Miss. Code Ann. § 99-19-71(4) provides for expungement of the record of an arrest or charge that did not result in a conviction, on petition to the court in which the case was pending or in which the arrest record originated.",
          "Subsection (4) sets no waiting period and requires no hearing."
        ]
      },
      {
        heading: "IV.  PETITIONER'S STATEMENT",
        numbered: false,
        paragraphs: [
          PARTICIPANT_STATEMENT_PREFIX,
          "{{petitionerStatement}}",
          "The paragraph above is the Petitioner's own statement. It was written by the Petitioner and is reproduced without change."
        ]
      }
    ],
    prayer: [
      "WHEREFORE, Petitioner asks the Court to enter an order expunging the record of the arrest and charge in cause number {{causeNumber}}, and directing the clerk of this Court, {{arrestingAgencyName}} and the Mississippi Criminal Information Center to expunge their records of that arrest and charge as Miss. Code Ann. § 99-19-71(4) provides.",
      SERVICE_AND_RELIEF_NOTE
    ],
    verification: TRUTH_STATEMENT,
    signatureBlock: SIGNATURE_BLOCK
  },

  "ms-nonconv-proposed-order": {
    templateId: "ms-nonconv-proposed-order",
    version: VERSION,
    technicalFixture: true,
    fixtureBanner: BANNER,
    caption: caption("IN THE {{courtNameUpper}}, MISSISSIPPI", "ORDER OF EXPUNGEMENT"),
    title: "ORDER OF EXPUNGEMENT",
    preamble:
      "This proposed order is submitted for the Court's consideration. Every finding, signature and date below is left blank for the Court.",
    sections: [
      {
        numbered: false,
        paragraphs: [
          "THIS CAUSE came before the Court on the Petition of {{petitionerName}} to expunge the record of a case that did not end in a conviction, in cause number {{causeNumber}}, under Miss. Code Ann. § 99-19-71(4).",
          "The Court, having considered the petition and the record, finds:",
          "( ) that the petition is well taken and should be GRANTED.",
          "( ) that the petition should be DENIED.",
          "",
          "IT IS THEREFORE ORDERED that the record of the arrest and charge in cause number {{causeNumber}} be, and hereby is, EXPUNGED.",
          "IT IS FURTHER ORDERED that the clerk of this Court, {{arrestingAgencyName}}, and the Mississippi Criminal Information Center expunge their records of that arrest and charge.",
          "IT IS FURTHER ORDERED that the clerk deliver a certified copy of this Order to {{petitionerName}} and to {{prosecutingAuthorityName}}."
        ]
      }
    ],
    prayer: [],
    signatureLabel: null,
    signatureBlock: ORDER_SIGNATURE_BLOCK
  },

  "ms-nonconv-certificate-of-service": {
    templateId: "ms-nonconv-certificate-of-service",
    version: VERSION,
    technicalFixture: true,
    fixtureBanner: BANNER,
    caption: caption("IN THE {{courtNameUpper}}, MISSISSIPPI", "CERTIFICATE OF SERVICE"),
    title: "CERTIFICATE OF SERVICE",
    preamble:
      "This certificate belongs to the Petition to Expunge the Record of a Case That Did Not End in a Conviction filed in cause number {{causeNumber}}, and to no other document.",
    sections: [],
    prayer: [],
    signatureLabel: null,
    signatureBlock: [],
    certificateOfService: CERTIFICATE_LINES
  },

  // -------------------------------------------------------------------------
  // ms-nonadj — expungement after nonadjudication, Miss. Code Ann. § 99-15-26
  // -------------------------------------------------------------------------
  "ms-nonadj-petition": {
    templateId: "ms-nonadj-petition",
    version: VERSION,
    technicalFixture: true,
    fixtureBanner: BANNER,
    caption: caption("IN THE {{courtNameUpper}}, MISSISSIPPI", "PETITION FOR EXPUNGEMENT"),
    title: "PETITION TO EXPUNGE AFTER NONADJUDICATION",
    preamble:
      "Petitioner, appearing without a lawyer, respectfully petitions this Court under Miss. Code Ann. § 99-15-26(5) to expunge the record of a case resolved by nonadjudication, and states:",
    sections: [
      identificationSection([
        "On {{nonadjudicationOrderDate}} this Court entered an order withholding acceptance of Petitioner's plea and placing Petitioner in a nonadjudication programme under Miss. Code Ann. § 99-15-26."
      ]),
      {
        heading: "II.  COMPLETION",
        numbered: true,
        paragraphs: [
          "Petitioner successfully completed all conditions the Court imposed in the nonadjudication order on {{completionDate}}.",
          "The Court dismissed the charge following that completion, and no conviction was entered."
        ]
      },
      {
        heading: "III.  STATUTORY BASIS",
        numbered: true,
        paragraphs: [
          "Miss. Code Ann. § 99-15-26(5) permits the court that entered the nonadjudication order to expunge the record on successful completion of the conditions imposed.",
          "This petition is brought under § 99-15-26 alone. It is not brought under Miss. Code Ann. § 99-19-71, which governs a different mechanism."
        ]
      },
      {
        heading: "IV.  PETITIONER'S STATEMENT",
        numbered: false,
        paragraphs: [
          PARTICIPANT_STATEMENT_PREFIX,
          "{{petitionerStatement}}",
          "The paragraph above is the Petitioner's own statement. It was written by the Petitioner and is reproduced without change."
        ]
      }
    ],
    prayer: [
      "WHEREFORE, Petitioner asks the Court to enter an order expunging the record of the charge and the nonadjudication proceedings in cause number {{causeNumber}}, and directing the clerk of this Court, {{arrestingAgencyName}} and the Mississippi Criminal Information Center to expunge their records as Miss. Code Ann. § 99-15-26(5) provides.",
      SERVICE_AND_RELIEF_NOTE
    ],
    verification: TRUTH_STATEMENT,
    signatureBlock: SIGNATURE_BLOCK
  },

  "ms-nonadj-proposed-order": {
    templateId: "ms-nonadj-proposed-order",
    version: VERSION,
    technicalFixture: true,
    fixtureBanner: BANNER,
    caption: caption("IN THE {{courtNameUpper}}, MISSISSIPPI", "ORDER OF EXPUNGEMENT"),
    title: "ORDER OF EXPUNGEMENT AFTER NONADJUDICATION",
    preamble:
      "This proposed order is submitted for the Court's consideration. Every finding, signature and date below is left blank for the Court.",
    sections: [
      {
        numbered: false,
        paragraphs: [
          "THIS CAUSE came before the Court on the Petition of {{petitionerName}} to expunge the record of a case resolved by nonadjudication in cause number {{causeNumber}}, under Miss. Code Ann. § 99-15-26(5).",
          "The Court, having considered the petition and the record, finds:",
          "( ) that the petition is well taken and should be GRANTED.",
          "( ) that the petition should be DENIED.",
          "",
          "IT IS THEREFORE ORDERED that the record of the charge and the nonadjudication proceedings in cause number {{causeNumber}} be, and hereby is, EXPUNGED.",
          "IT IS FURTHER ORDERED that the clerk of this Court, {{arrestingAgencyName}}, and the Mississippi Criminal Information Center expunge their records.",
          "IT IS FURTHER ORDERED that the clerk deliver a certified copy of this Order to {{petitionerName}} and to {{prosecutingAuthorityName}}."
        ]
      }
    ],
    prayer: [],
    signatureLabel: null,
    signatureBlock: ORDER_SIGNATURE_BLOCK
  },

  "ms-nonadj-certificate-of-service": {
    templateId: "ms-nonadj-certificate-of-service",
    version: VERSION,
    technicalFixture: true,
    fixtureBanner: BANNER,
    caption: caption("IN THE {{courtNameUpper}}, MISSISSIPPI", "CERTIFICATE OF SERVICE"),
    title: "CERTIFICATE OF SERVICE",
    preamble:
      "This certificate belongs to the Petition to Expunge After Nonadjudication filed in cause number {{causeNumber}}, and to no other document.",
    sections: [],
    prayer: [],
    signatureLabel: null,
    signatureBlock: [],
    certificateOfService: CERTIFICATE_LINES
  }
};
