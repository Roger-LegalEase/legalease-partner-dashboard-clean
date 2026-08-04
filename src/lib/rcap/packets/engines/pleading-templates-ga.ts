// Georgia pleading templates — Superior Court pleading family, Tranche 3.
//
// Georgia publishes no statewide judiciary form for any route in this family.
// The adopted legal design records that for every one of them, so a statewide
// neutral pleading drafted to the statute is the controlling output rather than
// a fallback, and each track carries `localFormOverride` so that a county form
// governs where one is found.
//
// Georgia vocabulary is not Mississippi vocabulary, and the difference is
// substantive rather than cosmetic. Georgia restricts and seals; it does not
// expunge, and has not since 1 July 2013. Neither remedy destroys the record.
// The word "expunge" therefore appears nowhere in these templates, and the
// verifier fails the tranche if it ever does.
//
// What these templates deliberately do NOT carry:
//
//   - the word "expungement", in any form;
//   - an IN RE caption or a Civil Action No.: every route here is filed in the
//     existing criminal case, styled State of Georgia v. Defendant;
//   - a filing fee figure, because no statutory fee is identified and the
//     question is unresolved and county-specific;
//   - a rehabilitation narrative, a public-safety conclusion or an
//     interests-of-justice finding composed by LegalEase;
//   - an assertion that the harm to the individual clearly outweighs the
//     public's interest. That is the court's determination on every route that
//     requires it. The petition pleads the facts and asks the court to make it;
//   - any statement that the participant may say the record does not exist.
//     A restriction or sealing may still disqualify the participant from
//     employment or office in the same manner as a first offender discharge
//     under § 42-8-63.1, and does not supersede disclosure required by federal
//     law. Every petition says so on its face;
//   - a prefilled judge, clerk, prosecutor, arresting-agency or notary block.
//     No route in this family requires verification or notarization, and none
//     is added.
//
// Court, county, case number, OTN, prosecuting attorney and arresting agency
// are participant data. Every judicial finding, signature and date is blank.
//
// Every template is DRAFT PENDING LEGAL REVIEW until reviewing counsel approves
// it. The banner says so on the face of every rendering, so a stray copy cannot
// be mistaken for a filing.

import type { PleadingTemplate } from "@/lib/rcap/packets/engines/pleading-templates";

const BANNER =
  "DRAFT PENDING LEGAL REVIEW — PREPARED BY LEGALEASE FOR A SELF-REPRESENTED DEFENDANT — NOT LEGAL ADVICE — DO NOT FILE UNTIL REVIEWED";

const VERSION = "1.0.0";

/** Participant-authored text is always introduced as the participant's own. */
const PARTICIPANT_STATEMENT_PREFIX = "Defendant states, in Defendant's own words:";

const PARTICIPANT_STATEMENT_ATTRIBUTION =
  "The paragraph above is Defendant's own statement. It was written by Defendant and is reproduced without change.";

const TRUTH_STATEMENT =
  "Defendant states that the facts set out above are true and correct to the best of Defendant's knowledge and belief.";

/**
 * The effect statement Georgia requires every packet in this family to carry.
 *
 * Counsel classified the opposite — copy implying the record is gone — as the
 * single most dangerous thing a Georgia record-clearing packet can say.
 */
const EFFECT_OF_RELIEF =
  "Restriction and sealing under Georgia law limit who may see this record. They do not destroy it. A restricted or sealed record may still be used to disqualify Defendant from employment or office in the same manner as a first offender discharge under O.C.G.A. § 42-8-63.1, and this relief does not supersede any disclosure required by federal law. Defendant is not entitled to state that the record does not exist.";

const CONFIRM_FILING_METHOD =
  "Before filing, confirm with the clerk of this Court how this Court accepts filings of this kind. Georgia publishes no statewide form for this relief and local courts control their own filing and electronic-filing practice.";

/** Directed at GCIC and the county agencies by category, as the design requires. */
const RESTRICTION_DIRECTION =
  "The Georgia Crime Information Center is directed to restrict access to the criminal history record information for the arrest cycle identified above, and to notify the arresting law enforcement agency of this Order. The arresting law enforcement agency, and any county or municipal jail or detention center holding records of that arrest, are directed to restrict their records of it.";

const DISCLOSURE_LIMIT =
  "Access to the restricted and sealed records shall be limited to the persons and purposes that O.C.G.A. § 35-3-37(t) and (v) permit, and to no other person or purpose.";

function caption(courtLineTemplate: string, documentTitle: string) {
  return {
    courtLine: courtLineTemplate,
    partyBlockLeft: ["STATE OF GEORGIA", "", "v.", "", "{{defendantName}},", "", "Defendant."],
    partyBlockRight: ["Case No. {{caseNumber}}", "", "OTN: {{otn}}", "", documentTitle]
  };
}

/** The convicting or accusing court, supplied by the participant. */
const COURT_LINE = "IN THE {{courtNameUpper}} OF {{courtCountyUpper}} COUNTY, STATE OF GEORGIA";

/** § 35-3-37(j)(5) names the superior court of the county of arrest expressly. */
const SUPERIOR_COURT_OF_ARREST_LINE =
  "IN THE SUPERIOR COURT OF {{arrestCountyUpper}} COUNTY, STATE OF GEORGIA";

const SIGNATURE_BLOCK: readonly string[] = [
  "{{defendantName}}, Defendant, Pro Se",
  "{{mailingAddress}}",
  "{{contactPhone}}",
  "{{contactEmail}}",
  "Date: ______________________"
];

/**
 * The court signs. Every line here stays blank on the generated document.
 *
 * Kept to three lines deliberately. The flow writer has no keep-together rule,
 * so a long block can be split by a page break — and a judicial signature block
 * split across pages puts the signature rule on one page and the date on the
 * next, which is a document a judge would sign incompletely. The county line
 * was dropped for the same reason: the caption already names the court and the
 * county, so it was repetition that cost a line. The generator and the verifier
 * both assert that the rule and the date land on one page.
 */
const ORDER_SIGNATURE_BLOCK: readonly string[] = [
  "_____________________________________",
  "JUDGE, {{courtName}}",
  "Date: ______________________"
];

const IDENTIFICATION_HEADING = "I.  DEFENDANT AND CASE";

function identification(extra: readonly string[] = []) {
  return {
    heading: IDENTIFICATION_HEADING,
    numbered: true,
    paragraphs: [
      "Defendant is {{defendantName}}, date of birth {{dateOfBirth}}, who resides at {{mailingAddress}}, in {{countyOfResidence}} County, Georgia.",
      "This filing is made in case number {{caseNumber}} in the {{courtName}} of {{courtCounty}} County, Georgia. It is filed in the existing criminal case and is not a new civil action.",
      "The offence at issue is {{offenseDescription}}, O.C.G.A. {{offenseCodeSection}}. Defendant was arrested on {{arrestDate}} by {{arrestingAgencyName}}. The offender tracking number for the arrest cycle is {{otn}}.",
      ...extra
    ]
  };
}

function participantStatementSection() {
  return {
    heading: "DEFENDANT'S STATEMENT",
    numbered: false,
    paragraphs: [
      PARTICIPANT_STATEMENT_PREFIX,
      "{{participantNarrative}}",
      PARTICIPANT_STATEMENT_ATTRIBUTION
    ]
  };
}

function effectAndFilingSection() {
  return {
    heading: "EFFECT OF THE RELIEF SOUGHT",
    numbered: false,
    paragraphs: [EFFECT_OF_RELIEF, CONFIRM_FILING_METHOD]
  };
}

/**
 * The balancing element, where the statute imposes one.
 *
 * Pleaded as a request for the court's determination rather than as an
 * assertion. LegalEase does not tell a court that harm outweighs the public
 * interest; it sets out the participant's facts and asks the court to decide.
 */
const BALANCING_REQUEST =
  "Defendant asks the Court to determine, on the facts set out above and in Defendant's own statement, whether the harm otherwise resulting to Defendant clearly outweighs the public's interest in the criminal history record information being publicly available. Defendant makes no representation as to how the Court should resolve that question.";

const HEARING_REQUEST =
  "In the alternative, Defendant asks that this matter be set for hearing within 90 days of the filing of this motion, as O.C.G.A. § 35-3-37(j) provides.";

type CertificateRecipient = "prosecutor" | "prosecutor_and_agency" | "clerk_and_prosecutor";

function certificateLines(input: {
  documentsServed: string;
  recipients: CertificateRecipient;
  methodSentence: string;
}): readonly string[] {
  const head = [
    `I, {{defendantName}}, certify that I delivered a true and correct copy of the ${input.documentsServed} to the recipient or recipients named below, on the date written below, by the method written below.`,
    "",
    input.methodSentence,
    ""
  ];

  const blocks: Record<CertificateRecipient, readonly string[]> = {
    prosecutor: [
      "Prosecuting attorney served: {{prosecutingAuthorityName}}",
      "Address used: {{prosecutingAuthorityAddress}}",
      "Method of delivery: {{serviceMethod}}",
      "Date of delivery: ______________________"
    ],
    prosecutor_and_agency: [
      "Prosecuting attorney served: {{prosecutingAuthorityName}}",
      "Address used: {{prosecutingAuthorityAddress}}",
      "Method of delivery: {{serviceMethod}}",
      "Date of delivery: ______________________",
      "",
      "Arresting law enforcement agency served: {{arrestingAgencyName}}",
      "Address used: {{arrestingAgencyAddress}}",
      "Method of delivery: {{serviceMethod}}",
      "Date of delivery: ______________________"
    ],
    clerk_and_prosecutor: [
      "Clerk of court served: {{clerkOfCourtName}}",
      "Address used: {{clerkOfCourtAddress}}",
      "Method of delivery: {{serviceMethod}}",
      "Date of delivery: ______________________",
      "",
      "Prosecuting attorney served: {{prosecutingAuthorityName}}",
      "Address used: {{prosecutingAuthorityAddress}}",
      "Method of delivery: {{serviceMethod}}",
      "Date of delivery: ______________________"
    ]
  };

  // No signature line here. The document's own signature rule follows the
  // sections, and a certificate with two places to sign is a certificate a
  // participant signs in the wrong one.
  return [...head, ...blocks[input.recipients]];
}

const STANDARD_SERVICE_SENTENCE =
  "Service was made by certified mail, electronic filing or hand delivery.";

/** §§ 35-3-37(m)(1), 42-8-62.1(c) and 42-8-62.2(c) each name the sufficient methods. */
const STATUTORY_NOTICE_SENTENCE =
  "Notice sent by registered mail, certified mail or statutory overnight delivery is sufficient notice under the Code section named above.";

/**
 * Certificate of service.
 *
 * The whole document is the certificate, so its body is written as sections
 * rather than through the renderer's `certificateOfService` block. That block
 * exists to append a certificate to a document that is something else — a
 * petition, say — and it prints its own "CERTIFICATE OF SERVICE" heading and
 * its own signature line when it does. Used here it would print the heading
 * twice and give one certificate two competing places to sign, which is what
 * the first rendering of this tranche actually did.
 *
 * One heading, one signature rule, one date.
 */
function certificateOfService(input: {
  templateId: string;
  documentTitle: string;
  documentsServed: string;
  recipients: CertificateRecipient;
  methodSentence?: string;
  courtLine?: string;
}): PleadingTemplate {
  const lines = certificateLines({
    documentsServed: input.documentsServed,
    recipients: input.recipients,
    methodSentence: input.methodSentence ?? STANDARD_SERVICE_SENTENCE
  });

  return {
    templateId: input.templateId,
    version: VERSION,
    technicalFixture: true,
    fixtureBanner: BANNER,
    caption: caption(input.courtLine ?? COURT_LINE, "CERTIFICATE OF SERVICE"),
    title: "CERTIFICATE OF SERVICE",
    sections: [
      {
        numbered: false,
        paragraphs: [
          `This certificate is filed with the ${input.documentTitle} in case number {{caseNumber}}.`,
          ...lines
        ]
      }
    ],
    prayer: [],
    signatureLabel: "Signature",
    signatureBlock: ["{{defendantName}}, Defendant, Pro Se", "Date: ______________________"]
  };
}

/**
 * Exhibit cover sheet.
 *
 * The participant obtains and encloses the document itself. LegalEase never
 * collects, inspects or authenticates a participant's record, so the packet
 * carries the cover sheet that identifies the exhibit and nothing more.
 */
function exhibitCoverSheet(input: {
  templateId: string;
  exhibitLetter: string;
  exhibitName: string;
  obtainedFrom: string;
  whyItMatters: string;
  conditional?: boolean;
  courtLine?: string;
}): PleadingTemplate {
  return {
    templateId: input.templateId,
    version: VERSION,
    technicalFixture: true,
    fixtureBanner: BANNER,
    caption: caption(input.courtLine ?? COURT_LINE, `EXHIBIT ${input.exhibitLetter}`),
    title: `EXHIBIT ${input.exhibitLetter} — ${input.exhibitName.toUpperCase()}`,
    sections: [
      {
        numbered: false,
        paragraphs: [
          `This cover sheet identifies Exhibit ${input.exhibitLetter} to the filing in case number {{caseNumber}}: ${input.exhibitName}.`,
          `Where to obtain it: ${input.obtainedFrom}.`,
          `Why the filing refers to it: ${input.whyItMatters}`,
          input.conditional
            ? "This exhibit is optional. Enclose it only if you have it or choose to supply it. The packet is complete without it."
            : "Place the document itself immediately behind this cover sheet before filing.",
          "LegalEase has not seen this document. LegalEase does not collect, inspect or authenticate a participant's records, and makes no representation about what this exhibit contains."
        ]
      }
    ],
    prayer: [],
    signatureLabel: null,
    signatureBlock: []
  };
}

function proposedOrder(input: {
  templateId: string;
  orderTitle: string;
  recital: string;
  grantParagraphs: readonly string[];
  courtLine?: string;
  extraDirections?: readonly string[];
}): PleadingTemplate {
  return {
    templateId: input.templateId,
    version: VERSION,
    technicalFixture: true,
    fixtureBanner: BANNER,
    caption: caption(input.courtLine ?? COURT_LINE, input.orderTitle),
    title: input.orderTitle,
    preamble:
      "This proposed order is submitted for the Court's consideration. Every finding, signature and date below is left blank for the Court.",
    sections: [
      {
        numbered: false,
        paragraphs: [
          input.recital,
          "The Court, having considered the filing and the record, finds:",
          "(   ) that the relief sought should be GRANTED.",
          "(   ) that the relief sought should be DENIED.",
          ""
        ]
      },
      {
        heading: "IT IS HEREBY ORDERED",
        numbered: true,
        paragraphs: [...input.grantParagraphs, ...(input.extraDirections ?? [])]
      }
    ],
    prayer: [],
    // A proposed order is signed by the court. No participant signature rule.
    signatureLabel: null,
    signatureBlock: ORDER_SIGNATURE_BLOCK
  };
}

export const GEORGIA_PLEADING_TEMPLATES: Readonly<Record<string, PleadingTemplate>> = {
  // ==========================================================================
  // ga-felony-j1 — felony charge resolved without conviction, § 35-3-37(j)(1)
  // ==========================================================================
  "ga-felony-j1-petition": {
    templateId: "ga-felony-j1-petition",
    version: VERSION,
    technicalFixture: true,
    fixtureBanner: BANNER,
    caption: caption(COURT_LINE, "PETITION TO RESTRICT ACCESS"),
    title: "PETITION TO RESTRICT ACCESS TO CRIMINAL HISTORY RECORD INFORMATION",
    preamble:
      "Defendant, appearing without a lawyer, petitions this Court under O.C.G.A. § 35-3-37(j)(1) to restrict access to the criminal history record information for a felony charge that did not result in a conviction, and states:",
    sections: [
      identification([
        "The felony charge for which restriction is sought is {{felonyChargeDescription}}.",
        "That felony charge was resolved without a conviction on {{felonyDispositionDate}}. The disposition was: {{felonyDisposition}}.",
        "Defendant was convicted in this case of {{misdemeanorConvictionDescription}}, a misdemeanour."
      ]),
      {
        heading: "II.  STATUTORY BASIS",
        numbered: true,
        paragraphs: [
          "O.C.G.A. § 35-3-37(j)(1) permits an individual who had a felony charge dismissed or nolle prossed, or who was found not guilty of a felony charge, but who was convicted of a misdemeanour offence that was not a lesser included offence of that felony charge, to petition for restriction of access to the criminal history record information for the felony charge.",
          "The misdemeanour offence of which Defendant was convicted was not a lesser included offence of the felony charge for which restriction is sought.",
          "This petition is filed within four years of the date of arrest.",
          "The restriction sought reaches the felony charge only. It does not reach the misdemeanour conviction, which remains a matter of public record."
        ]
      },
      {
        heading: "III.  NOTICE",
        numbered: true,
        paragraphs: [
          "O.C.G.A. § 35-3-37(j)(1) provides for notice to the arresting law enforcement agency and to the prosecuting attorney. Both are served with this petition, and the certificate of service filed with it evidences that delivery."
        ]
      },
      participantStatementSection(),
      effectAndFilingSection()
    ],
    prayer: [
      "WHEREFORE, Defendant asks the Court to enter an order restricting access to the criminal history record information for the felony charge identified above in case number {{caseNumber}}, and to enter the proposed Order submitted with this petition.",
      BALANCING_REQUEST,
      HEARING_REQUEST
    ],
    verification: TRUTH_STATEMENT,
    signatureBlock: SIGNATURE_BLOCK
  },

  "ga-felony-j1-proposed-order": proposedOrder({
    templateId: "ga-felony-j1-proposed-order",
    orderTitle: "ORDER RESTRICTING ACCESS TO CRIMINAL HISTORY RECORD INFORMATION",
    recital:
      "This matter came before the Court on the Petition of {{defendantName}} under O.C.G.A. § 35-3-37(j)(1) to restrict access to the criminal history record information for a felony charge resolved without conviction in case number {{caseNumber}}, the arresting law enforcement agency and the prosecuting attorney having been served.",
    grantParagraphs: [
      "Access to the criminal history record information for the felony charge of {{felonyChargeDescription}}, arising from the arrest of {{defendantName}} on {{arrestDate}} under offender tracking number {{otn}}, is restricted.",
      "This Order reaches the felony charge only. It does not restrict access to the criminal history record information for the misdemeanour conviction in this case.",
      RESTRICTION_DIRECTION,
      "The Clerk of the {{courtName}} of {{courtCounty}} County shall enter this Order in the record of this case and shall transmit a copy to the Georgia Crime Information Center and to {{arrestingAgencyName}}.",
      DISCLOSURE_LIMIT
    ]
  }),

  "ga-felony-j1-certificate-of-service": certificateOfService({
    templateId: "ga-felony-j1-certificate-of-service",
    documentTitle: "Petition to Restrict Access",
    documentsServed: "Petition to Restrict Access to Criminal History Record Information and the proposed Order",
    recipients: "prosecutor_and_agency"
  }),

  "ga-felony-j1-exhibit-disposition": exhibitCoverSheet({
    templateId: "ga-felony-j1-exhibit-disposition",
    exhibitLetter: "A",
    exhibitName: "Final disposition of the felony charge",
    obtainedFrom: "the clerk of the court that accused or convicted you",
    whyItMatters:
      "It shows how the felony charge was resolved and that it did not result in a conviction, which is the fact § 35-3-37(j)(1) turns on."
  }),

  "ga-felony-j1-exhibit-criminal-history": exhibitCoverSheet({
    templateId: "ga-felony-j1-exhibit-criminal-history",
    exhibitLetter: "B",
    exhibitName: "Your own Georgia criminal history report",
    obtainedFrom:
      "most Georgia sheriff's offices and police departments, or the Georgia Crime Information Center; requirements vary by agency",
    whyItMatters:
      "It shows the arrest cycle and the offender tracking number the Court's order must name for the Georgia Crime Information Center to act on it.",
    conditional: true
  }),

  // ==========================================================================
  // ga-vacated-j2 — vacated or reversed conviction, § 35-3-37(j)(2)
  // ==========================================================================
  "ga-vacated-j2-petition": {
    templateId: "ga-vacated-j2-petition",
    version: VERSION,
    technicalFixture: true,
    fixtureBanner: BANNER,
    caption: caption(COURT_LINE, "PETITION TO RESTRICT ACCESS"),
    title: "PETITION TO RESTRICT ACCESS TO CRIMINAL HISTORY RECORD INFORMATION",
    preamble:
      "Defendant, appearing without a lawyer, petitions this Court under O.C.G.A. § 35-3-37(j)(2) to restrict access to the criminal history record information for a conviction that has been vacated or reversed and has not been retried, and states:",
    sections: [
      identification([
        "Defendant was convicted of the offence identified above and was sentenced to a punishment other than the death penalty.",
        "That conviction was {{vacatedOrReversed}} on {{vacatingOrderDate}} by {{vacatingCourtName}}.",
        "That decision became final upon completion of the appellate process on {{finalityDate}}."
      ]),
      {
        heading: "II.  STATUTORY BASIS",
        numbered: true,
        paragraphs: [
          "O.C.G.A. § 35-3-37(j)(2) permits an individual whose conviction has been vacated by the trial court or reversed by an appellate or other post-conviction court, where that decision has become final by the completion of the appellate process and the prosecuting attorney has not retried the case within two years of the date the order became final, to petition the court in which the individual was convicted to restrict access to the criminal history record information for the offence.",
          "More than two years have passed since the vacating or reversing order became final.",
          "The prosecuting attorney has not retried this case within that period."
        ]
      },
      {
        heading: "III.  NOTICE",
        numbered: true,
        paragraphs: [
          "The prosecuting attorney is served with this petition, and the certificate of service filed with it evidences that delivery."
        ]
      },
      participantStatementSection(),
      effectAndFilingSection()
    ],
    prayer: [
      "WHEREFORE, Defendant asks the Court to enter an order restricting access to the criminal history record information for the offence identified above in case number {{caseNumber}}, and to enter the proposed Order submitted with this petition.",
      "Defendant asks the Court to give due consideration to the reason the judgment was vacated or reversed, to the reason the prosecuting attorney has not retried the case, and to the public interest, as O.C.G.A. § 35-3-37(j)(2) provides. Defendant makes no representation as to how the Court should resolve those questions.",
      HEARING_REQUEST
    ],
    verification: TRUTH_STATEMENT,
    signatureBlock: SIGNATURE_BLOCK
  },

  "ga-vacated-j2-proposed-order": proposedOrder({
    templateId: "ga-vacated-j2-proposed-order",
    orderTitle: "ORDER RESTRICTING ACCESS TO CRIMINAL HISTORY RECORD INFORMATION",
    recital:
      "This matter came before the Court on the Petition of {{defendantName}} under O.C.G.A. § 35-3-37(j)(2) to restrict access to the criminal history record information for a conviction vacated or reversed and not retried, in case number {{caseNumber}}, the prosecuting attorney having been served.",
    grantParagraphs: [
      "Access to the criminal history record information for the offence of {{offenseDescription}}, arising from the arrest of {{defendantName}} on {{arrestDate}} under offender tracking number {{otn}}, is restricted.",
      RESTRICTION_DIRECTION,
      "The Clerk of the {{courtName}} of {{courtCounty}} County shall enter this Order in the record of this case and shall transmit a copy to the Georgia Crime Information Center.",
      DISCLOSURE_LIMIT
    ]
  }),

  "ga-vacated-j2-certificate-of-service": certificateOfService({
    templateId: "ga-vacated-j2-certificate-of-service",
    documentTitle: "Petition to Restrict Access",
    documentsServed: "Petition to Restrict Access to Criminal History Record Information and the proposed Order",
    recipients: "prosecutor"
  }),

  "ga-vacated-j2-exhibit-vacating-order": exhibitCoverSheet({
    templateId: "ga-vacated-j2-exhibit-vacating-order",
    exhibitLetter: "A",
    exhibitName: "The order vacating or reversing the conviction",
    obtainedFrom: "the clerk of the court that vacated or reversed the conviction",
    whyItMatters:
      "It establishes that the conviction was vacated or reversed and the date the order was entered, which is when the two-year period begins."
  }),

  "ga-vacated-j2-exhibit-finality": exhibitCoverSheet({
    templateId: "ga-vacated-j2-exhibit-finality",
    exhibitLetter: "B",
    exhibitName: "Proof that the decision became final",
    obtainedFrom:
      "the clerk of the appellate court, or the clerk of the court that entered the order, as the remittitur or docket entry showing the appellate process is complete",
    whyItMatters:
      "Section 35-3-37(j)(2) runs the two years from the date the order became final by completion of the appellate process, not from the date it was signed."
  }),

  // ==========================================================================
  // ga-deaddocket-j3 — charge on the dead docket, § 35-3-37(j)(3)
  // ==========================================================================
  "ga-deaddocket-j3-petition": {
    templateId: "ga-deaddocket-j3-petition",
    version: VERSION,
    technicalFixture: true,
    fixtureBanner: BANNER,
    caption: caption(COURT_LINE, "PETITION TO RESTRICT ACCESS"),
    title: "PETITION TO RESTRICT ACCESS TO CRIMINAL HISTORY RECORD INFORMATION",
    preamble:
      "Defendant, appearing without a lawyer, petitions this Court under O.C.G.A. § 35-3-37(j)(3) to restrict access to the criminal history record information for a charged offence that has remained on the dead docket for more than 12 months, and states:",
    sections: [
      identification([
        "The charged offence identified above was placed on the dead docket of this Court on {{deadDocketDate}}.",
        "More than 12 months have passed since that date and the charged offence remains on the dead docket."
      ]),
      {
        heading: "II.  STATUTORY BASIS",
        numbered: true,
        paragraphs: [
          "O.C.G.A. § 35-3-37(j)(3) permits an individual whose charged offence has remained on the dead docket for more than 12 months to petition the court in which the charged offence is pending to restrict access to the criminal history record information for that charged offence.",
          "No active warrant is pending for Defendant. Section 35-3-37(j)(3) provides that the court shall not grant the petition if an active warrant is pending."
        ]
      },
      {
        heading: "III.  THE CHARGE REMAINS PENDING",
        numbered: false,
        paragraphs: [
          "This charged offence has not been dismissed and has not otherwise been resolved. A charge placed on the dead docket is still pending. Restricting access to the criminal history record information does not dispose of the charge, and the State may call the case back on to the active docket.",
          "Defendant does not by this petition seek dismissal of the charged offence and makes no request about its ultimate disposition."
        ]
      },
      {
        heading: "IV.  NOTICE",
        numbered: true,
        paragraphs: [
          "The prosecuting attorney is served with this petition, and the certificate of service filed with it evidences that delivery."
        ]
      },
      participantStatementSection(),
      effectAndFilingSection()
    ],
    prayer: [
      "WHEREFORE, Defendant asks the Court to enter an order restricting access to the criminal history record information for the charged offence identified above in case number {{caseNumber}}, and to enter the proposed Order submitted with this petition.",
      "Defendant asks the Court to give due consideration to the reason the charged offence was placed on the dead docket, as O.C.G.A. § 35-3-37(j)(3) provides.",
      HEARING_REQUEST
    ],
    verification: TRUTH_STATEMENT,
    signatureBlock: SIGNATURE_BLOCK
  },

  "ga-deaddocket-j3-proposed-order": proposedOrder({
    templateId: "ga-deaddocket-j3-proposed-order",
    orderTitle: "ORDER RESTRICTING ACCESS TO CRIMINAL HISTORY RECORD INFORMATION",
    recital:
      "This matter came before the Court on the Petition of {{defendantName}} under O.C.G.A. § 35-3-37(j)(3) to restrict access to the criminal history record information for a charged offence that has remained on the dead docket for more than 12 months, in case number {{caseNumber}}, the prosecuting attorney having been served.",
    grantParagraphs: [
      "Access to the criminal history record information for the charged offence of {{offenseDescription}}, arising from the arrest of {{defendantName}} on {{arrestDate}} under offender tracking number {{otn}}, is restricted.",
      "This Order does not dispose of the charged offence, which remains on the dead docket of this Court.",
      RESTRICTION_DIRECTION,
      "The Clerk of the {{courtName}} of {{courtCounty}} County shall enter this Order in the record of this case and shall transmit a copy to the Georgia Crime Information Center.",
      DISCLOSURE_LIMIT
    ]
  }),

  "ga-deaddocket-j3-certificate-of-service": certificateOfService({
    templateId: "ga-deaddocket-j3-certificate-of-service",
    documentTitle: "Petition to Restrict Access",
    documentsServed: "Petition to Restrict Access to Criminal History Record Information and the proposed Order",
    recipients: "prosecutor"
  }),

  "ga-deaddocket-j3-exhibit-dead-docket": exhibitCoverSheet({
    templateId: "ga-deaddocket-j3-exhibit-dead-docket",
    exhibitLetter: "A",
    exhibitName: "The dead docket entry or case docket",
    obtainedFrom: "the clerk of the court where the charge is pending",
    whyItMatters:
      "It shows the date the charge was placed on the dead docket, which is the date the 12 months runs from."
  }),

  // ==========================================================================
  // ga-misd-j4 — misdemeanour conviction, § 35-3-37(j)(4)
  // ==========================================================================
  "ga-misd-j4-motion": {
    templateId: "ga-misd-j4-motion",
    version: VERSION,
    technicalFixture: true,
    fixtureBanner: BANNER,
    caption: caption(COURT_LINE, "MOTION TO RESTRICT AND SEAL"),
    title: "MOTION TO RESTRICT ACCESS TO AND SEAL RECORDS OF A MISDEMEANOR CONVICTION",
    preamble:
      "Defendant, appearing without a lawyer, moves this Court under O.C.G.A. § 35-3-37(j)(4) to restrict access to the criminal history record information for a misdemeanour conviction, and under O.C.G.A. § 35-3-37(m) to seal the records of this case held by the Clerk, and states:",
    sections: [
      identification([
        "Defendant was convicted of the misdemeanour offence identified above in this Court, and the adjudication of guilt was entered on {{adjudicationDate}}.",
        "{{singleIncidentAllegation}}"
      ]),
      {
        heading: "II.  STATUTORY BASIS",
        numbered: true,
        paragraphs: [
          "O.C.G.A. § 35-3-37(j)(4)(A) permits an individual convicted of a misdemeanour, or of a series of misdemeanours arising from a single incident, to petition the court in which the conviction occurred to restrict access to the criminal history record information.",
          "Defendant has completed the terms of the sentence imposed in this case. All terms were completed on {{sentenceCompletionDate}}.",
          "Defendant has not been convicted of any crime in any jurisdiction, excluding nonserious traffic offences, for at least four years immediately preceding the filing of this motion.",
          "Defendant has no pending charged offences in any jurisdiction.",
          "The offence of conviction is not one that O.C.G.A. § 35-3-37(j)(4)(B) excludes from this relief.",
          "Section 35-3-37(j)(4)(C) permits this relief for no more than two convictions in an individual's lifetime. This motion is Defendant's use number {{lifetimeUseNumber}} of that allowance.",
          "O.C.G.A. § 35-3-37(w) applies § 35-3-37(j)(4) to sentences imposed before, on or after 1 July 2020."
        ]
      },
      {
        heading: "III.  SEALING THE CLERK'S RECORDS",
        numbered: true,
        paragraphs: [
          "O.C.G.A. § 35-3-37(m) permits an individual who has a record restricted under the Code section to petition to have the criminal history record information held by the clerk of court, including any index, sealed and unavailable to the public.",
          "Defendant asks that the sealing ordered under § 35-3-37(m) take effect upon the restriction ordered under § 35-3-37(j)(4).",
          "After an order under § 35-3-37(m), the clerk has 60 days to restrict every document in the clerk's custody, possession or control, whether physical or electronic."
        ]
      },
      {
        heading: "IV.  NOTICE",
        numbered: true,
        paragraphs: [
          "The prosecuting attorney is served with this motion, and the certificate of service filed with it evidences that delivery. No response or objection period is specified by statute."
        ]
      },
      participantStatementSection(),
      effectAndFilingSection()
    ],
    prayer: [
      "WHEREFORE, Defendant asks the Court to enter an order restricting access to the criminal history record information for the misdemeanour conviction in case number {{caseNumber}}, sealing the records of this case held by the Clerk under O.C.G.A. § 35-3-37(m), and to enter the proposed Order submitted with this motion.",
      BALANCING_REQUEST,
      "Where a hearing is requested on this route it must be held within 90 days of filing. " + HEARING_REQUEST
    ],
    verification: TRUTH_STATEMENT,
    signatureBlock: SIGNATURE_BLOCK
  },

  "ga-misd-j4-proposed-order": proposedOrder({
    templateId: "ga-misd-j4-proposed-order",
    orderTitle: "ORDER RESTRICTING ACCESS AND SEALING RECORDS",
    recital:
      "This matter came before the Court on the Motion of {{defendantName}} under O.C.G.A. § 35-3-37(j)(4) and § 35-3-37(m) to restrict access to the criminal history record information for a misdemeanour conviction and to seal the records of this case, in case number {{caseNumber}}, the prosecuting attorney having been served.",
    grantParagraphs: [
      "Access to the criminal history record information for the misdemeanour conviction of {{offenseDescription}}, O.C.G.A. {{offenseCodeSection}}, arising from the arrest of {{defendantName}} on {{arrestDate}} under offender tracking number {{otn}}, is restricted.",
      RESTRICTION_DIRECTION,
      "The criminal file, docket books, criminal minutes, final record, all other records of this Court and the criminal history record information in the custody of the Clerk of the {{courtName}} of {{courtCounty}} County, including within any index, concerning this case, are sealed and made unavailable to the public.",
      "The Clerk shall restrict every document in the Clerk's custody, possession or control concerning this case, whether physical or electronic, within 60 days of the entry of this Order.",
      "The Clerk shall enter this Order in the record of this case and shall transmit a copy to the Georgia Crime Information Center and to {{arrestingAgencyName}}.",
      DISCLOSURE_LIMIT
    ]
  }),

  "ga-misd-j4-certificate-of-service": certificateOfService({
    templateId: "ga-misd-j4-certificate-of-service",
    documentTitle: "Motion to Restrict and Seal",
    documentsServed: "Motion to Restrict Access to and Seal Records of a Misdemeanor Conviction and the proposed Order",
    recipients: "prosecutor"
  }),

  "ga-misd-j4-exhibit-disposition": exhibitCoverSheet({
    templateId: "ga-misd-j4-exhibit-disposition",
    exhibitLetter: "A",
    exhibitName: "Final disposition of the case",
    obtainedFrom: "the clerk of the convicting or accusing court",
    whyItMatters:
      "It establishes the conviction, the offence Code section and the date of the adjudication of guilt."
  }),

  "ga-misd-j4-exhibit-criminal-history": exhibitCoverSheet({
    templateId: "ga-misd-j4-exhibit-criminal-history",
    exhibitLetter: "B",
    exhibitName: "Your own Georgia criminal history report",
    obtainedFrom:
      "most Georgia sheriff's offices and police departments, or the Georgia Crime Information Center; requirements vary by agency",
    whyItMatters:
      "It shows the arrest cycle and offender tracking number, and it is the record the four-year and pending-charge questions are answered from.",
    conditional: true
  }),

  "ga-misd-j4-exhibit-sentence-completion": exhibitCoverSheet({
    templateId: "ga-misd-j4-exhibit-sentence-completion",
    exhibitLetter: "C",
    exhibitName: "Proof that the sentence was completed",
    obtainedFrom:
      "the clerk of the convicting court, or the supervising probation office, as the order terminating or discharging probation",
    whyItMatters:
      "Completion of every term of the sentence is a statutory element of § 35-3-37(j)(4)(A).",
    conditional: true
  }),

  "ga-misd-j4-exhibit-supporting": exhibitCoverSheet({
    templateId: "ga-misd-j4-exhibit-supporting",
    exhibitLetter: "D",
    exhibitName: "Documents you choose to supply in support",
    obtainedFrom: "you; there is no statutory list and none is required",
    whyItMatters:
      "The Court weighs the harm to you against the public's interest. Anything you want the Court to see goes here.",
    conditional: true
  }),

  // ==========================================================================
  // ga-fugitive-j5 — fugitive from justice warrant arrest, § 35-3-37(j)(5)
  // ==========================================================================
  "ga-fugitive-j5-petition": {
    templateId: "ga-fugitive-j5-petition",
    version: VERSION,
    technicalFixture: true,
    fixtureBanner: BANNER,
    caption: caption(SUPERIOR_COURT_OF_ARREST_LINE, "PETITION TO RESTRICT ACCESS"),
    title: "PETITION TO RESTRICT ACCESS TO CRIMINAL HISTORY RECORD INFORMATION",
    preamble:
      "Defendant, appearing without a lawyer, petitions this Court under O.C.G.A. § 35-3-37(j)(5) to restrict access to the criminal history record information for an arrest made on a fugitive from justice warrant, and states:",
    sections: [
      {
        heading: IDENTIFICATION_HEADING,
        numbered: true,
        paragraphs: [
          "Defendant is {{defendantName}}, date of birth {{dateOfBirth}}, who resides at {{mailingAddress}}, in {{countyOfResidence}} County, Georgia.",
          "Defendant was arrested on {{arrestDate}} in {{arrestCounty}} County, Georgia, by {{arrestingAgencyName}}, on a fugitive from justice warrant as provided in O.C.G.A. § 17-13-4. The offender tracking number for the arrest cycle is {{otn}}.",
          "The demanding state was {{demandingState}}.",
          "This petition is filed in the superior court of the county in which the arrest occurred, as O.C.G.A. § 35-3-37(j)(5) provides."
        ]
      },
      {
        heading: "II.  STATUTORY BASIS",
        numbered: true,
        paragraphs: [
          "O.C.G.A. § 35-3-37(j)(5) permits an individual arrested on a fugitive from justice warrant as provided in O.C.G.A. § 17-13-4 to petition the superior court in the county where the arrest occurred to restrict access to the criminal history record information for that warrant.",
          "Notice of this petition is given to the arresting law enforcement agency and to the prosecuting attorney, as § 35-3-37(j)(5) provides."
        ]
      },
      {
        heading: "III.  WHAT THIS RELIEF REACHES",
        numbered: false,
        paragraphs: [
          "A restriction ordered under Georgia law reaches Georgia criminal history record information only. It does not reach the records of the demanding state, and it does not reach the Identity History Summary held by the Federal Bureau of Investigation. Defendant understands that separate steps in another jurisdiction may be necessary and does not ask this Court to order them."
        ]
      },
      participantStatementSection(),
      effectAndFilingSection()
    ],
    prayer: [
      "WHEREFORE, Defendant asks the Court to enter an order restricting access to the criminal history record information for the arrest on the fugitive from justice warrant identified above, and to enter the proposed Order submitted with this petition.",
      "Defendant asks the Court to determine whether the circumstances warrant restriction and whether the harm otherwise resulting to Defendant clearly outweighs the public's interest in the criminal history record information being publicly available, as O.C.G.A. § 35-3-37(j)(5) provides. Defendant makes no representation as to how the Court should resolve those questions.",
      HEARING_REQUEST
    ],
    verification: TRUTH_STATEMENT,
    signatureBlock: SIGNATURE_BLOCK
  },

  "ga-fugitive-j5-proposed-order": proposedOrder({
    templateId: "ga-fugitive-j5-proposed-order",
    orderTitle: "ORDER RESTRICTING ACCESS TO CRIMINAL HISTORY RECORD INFORMATION",
    courtLine: SUPERIOR_COURT_OF_ARREST_LINE,
    recital:
      "This matter came before the Court on the Petition of {{defendantName}} under O.C.G.A. § 35-3-37(j)(5) to restrict access to the criminal history record information for an arrest made on a fugitive from justice warrant, the arresting law enforcement agency and the prosecuting attorney having been served.",
    grantParagraphs: [
      "Access to the criminal history record information for the arrest of {{defendantName}} on {{arrestDate}} in {{arrestCounty}} County on a fugitive from justice warrant, under offender tracking number {{otn}}, is restricted.",
      RESTRICTION_DIRECTION,
      "The Clerk of the Superior Court of {{arrestCounty}} County shall enter this Order and shall transmit a copy to the Georgia Crime Information Center and to {{arrestingAgencyName}}.",
      DISCLOSURE_LIMIT,
      "This Order reaches Georgia criminal history record information only."
    ]
  }),

  "ga-fugitive-j5-certificate-of-service": certificateOfService({
    templateId: "ga-fugitive-j5-certificate-of-service",
    documentTitle: "Petition to Restrict Access",
    documentsServed: "Petition to Restrict Access to Criminal History Record Information and the proposed Order",
    recipients: "prosecutor_and_agency",
    courtLine: SUPERIOR_COURT_OF_ARREST_LINE
  }),

  "ga-fugitive-j5-exhibit-criminal-history": exhibitCoverSheet({
    templateId: "ga-fugitive-j5-exhibit-criminal-history",
    exhibitLetter: "A",
    exhibitName: "Your own Georgia criminal history report showing the fugitive warrant arrest cycle",
    obtainedFrom:
      "most Georgia sheriff's offices and police departments, or the Georgia Crime Information Center; requirements vary by agency",
    whyItMatters:
      "It identifies the arrest cycle and the offender tracking number the Court's order must name for the Georgia Crime Information Center to act on it.",
    courtLine: SUPERIOR_COURT_OF_ARREST_LINE
  }),

  // ==========================================================================
  // ga-pardon-j7 — pardoned conviction, § 35-3-37(j)(7)
  // ==========================================================================
  "ga-pardon-j7-petition": {
    templateId: "ga-pardon-j7-petition",
    version: VERSION,
    technicalFixture: true,
    fixtureBanner: BANNER,
    caption: caption(COURT_LINE, "PETITION TO RESTRICT ACCESS"),
    title: "PETITION TO RESTRICT ACCESS TO CRIMINAL HISTORY RECORD INFORMATION FOLLOWING A PARDON",
    preamble:
      "Defendant, appearing without a lawyer, petitions this Court under O.C.G.A. § 35-3-37(j)(7) to restrict access to the criminal history record information for a conviction that has been pardoned, and states:",
    sections: [
      identification([
        "Defendant was convicted of the offence identified above in this Court.",
        "The State Board of Pardons and Paroles granted Defendant a pardon for that conviction on {{pardonDate}}."
      ]),
      {
        heading: "II.  STATUTORY BASIS",
        numbered: true,
        paragraphs: [
          "O.C.G.A. § 35-3-37(j)(7) permits an individual whose conviction has been pardoned by the State Board of Pardons and Paroles under O.C.G.A. § 42-9-42 to petition the court in which the conviction occurred to restrict access to the criminal history record information for that conviction.",
          "The offence of conviction is not a serious violent felony as defined in O.C.G.A. § 17-10-6.1.",
          "The offence of conviction is not a sexual offence as defined in O.C.G.A. § 17-10-6.2.",
          "Defendant has not been convicted of any crime in any jurisdiction, excluding nonserious traffic offences, since the pardon was granted.",
          "Defendant has no pending charged offences in any jurisdiction."
        ]
      },
      {
        heading: "III.  NOTICE",
        numbered: true,
        paragraphs: [
          "The prosecuting attorney is served with this petition, and the certificate of service filed with it evidences that delivery."
        ]
      },
      participantStatementSection(),
      effectAndFilingSection()
    ],
    prayer: [
      "WHEREFORE, Defendant asks the Court to enter an order restricting access to the criminal history record information for the pardoned conviction in case number {{caseNumber}}, and to enter the proposed Order submitted with this petition.",
      BALANCING_REQUEST,
      HEARING_REQUEST
    ],
    verification: TRUTH_STATEMENT,
    signatureBlock: SIGNATURE_BLOCK
  },

  "ga-pardon-j7-proposed-order": proposedOrder({
    templateId: "ga-pardon-j7-proposed-order",
    orderTitle: "ORDER RESTRICTING ACCESS TO CRIMINAL HISTORY RECORD INFORMATION",
    recital:
      "This matter came before the Court on the Petition of {{defendantName}} under O.C.G.A. § 35-3-37(j)(7) to restrict access to the criminal history record information for a pardoned conviction, in case number {{caseNumber}}, the prosecuting attorney having been served.",
    grantParagraphs: [
      "Access to the criminal history record information for the conviction of {{offenseDescription}}, O.C.G.A. {{offenseCodeSection}}, arising from the arrest of {{defendantName}} on {{arrestDate}} under offender tracking number {{otn}}, pardoned by the State Board of Pardons and Paroles on {{pardonDate}}, is restricted.",
      RESTRICTION_DIRECTION,
      "The Clerk of the {{courtName}} of {{courtCounty}} County shall enter this Order in the record of this case and shall transmit a copy to the Georgia Crime Information Center and to {{arrestingAgencyName}}.",
      DISCLOSURE_LIMIT
    ]
  }),

  "ga-pardon-j7-certificate-of-service": certificateOfService({
    templateId: "ga-pardon-j7-certificate-of-service",
    documentTitle: "Petition to Restrict Access Following a Pardon",
    documentsServed:
      "Petition to Restrict Access to Criminal History Record Information Following a Pardon and the proposed Order",
    recipients: "prosecutor"
  }),

  "ga-pardon-j7-exhibit-pardon": exhibitCoverSheet({
    templateId: "ga-pardon-j7-exhibit-pardon",
    exhibitLetter: "A",
    exhibitName: "The pardon certificate",
    obtainedFrom: "the State Board of Pardons and Paroles",
    whyItMatters:
      "The pardon is the fact § 35-3-37(j)(7) turns on, and the certificate is what proves it and its date."
  }),

  "ga-pardon-j7-exhibit-disposition": exhibitCoverSheet({
    templateId: "ga-pardon-j7-exhibit-disposition",
    exhibitLetter: "B",
    exhibitName: "Final disposition of the case",
    obtainedFrom: "the clerk of the convicting or accusing court",
    whyItMatters:
      "It establishes the conviction and the offence Code section, which the exclusions in § 17-10-6.1 and § 17-10-6.2 turn on."
  }),

  "ga-pardon-j7-exhibit-supporting": exhibitCoverSheet({
    templateId: "ga-pardon-j7-exhibit-supporting",
    exhibitLetter: "C",
    exhibitName: "Documents you choose to supply in support",
    obtainedFrom: "you; there is no statutory list and none is required",
    whyItMatters:
      "The Court weighs the harm to you against the public's interest. Anything you want the Court to see goes here.",
    conditional: true
  }),

  // ==========================================================================
  // ga-seal-m — sealing the clerk's records, § 35-3-37(m)
  // ==========================================================================
  "ga-seal-m-petition": {
    templateId: "ga-seal-m-petition",
    version: VERSION,
    technicalFixture: true,
    fixtureBanner: BANNER,
    caption: caption(COURT_LINE, "PETITION TO SEAL COURT RECORDS"),
    title: "PETITION TO SEAL THE RECORDS OF THE CLERK OF COURT",
    preamble:
      "Defendant, appearing without a lawyer, petitions this Court under O.C.G.A. § 35-3-37(m) to seal the criminal history record information held by the Clerk of this Court, including any index, and states:",
    sections: [
      identification([
        "Access to the criminal history record information for this case has already been restricted under O.C.G.A. § 35-3-37.",
        "The restriction was entered {{restrictionBasis}}."
      ]),
      {
        heading: "II.  STATUTORY BASIS",
        numbered: true,
        paragraphs: [
          "O.C.G.A. § 35-3-37(m) permits an individual who has a record restricted under the Code section to petition to have the criminal history record information held by the clerk of court, including any index, sealed and made unavailable to the public.",
          "This petition is filed in the court with original jurisdiction over the offences in the county where the Clerk of Court is located, as § 35-3-37(m) provides.",
          "Section 35-3-37(m) requires the court to order sealing if it finds by a preponderance of the evidence that the record has been restricted under the Code section and that the harm otherwise resulting to the privacy of the individual clearly outweighs the public interest in the information being publicly available.",
          "Defendant attaches the Georgia criminal history report showing the record as restricted, which is the proof of the first of those two elements."
        ]
      },
      {
        heading: "III.  WHAT FOLLOWS THE ORDER",
        numbered: true,
        paragraphs: [
          "After an order under § 35-3-37(m), the Clerk has 60 days to restrict every document in the Clerk's custody, possession or control concerning this case, whether physical or electronic.",
          "Sealed records remain available for the persons and purposes that O.C.G.A. § 35-3-37(t) and (v) permit. Sealing does not destroy the record."
        ]
      },
      {
        heading: "IV.  NOTICE",
        numbered: true,
        paragraphs: [
          "Notice of this petition is given to the Clerk of Court and to the prosecuting attorney. Notice by registered mail, certified mail or statutory overnight delivery is sufficient under O.C.G.A. § 35-3-37(m)(1). The certificate of service filed with this petition evidences that delivery."
        ]
      },
      participantStatementSection(),
      effectAndFilingSection()
    ],
    prayer: [
      "WHEREFORE, Defendant asks the Court to enter an order sealing the criminal history record information held by the Clerk of this Court in case number {{caseNumber}}, including within any index, and to enter the proposed Order submitted with this petition.",
      "Defendant asks the Court to determine whether the harm otherwise resulting to the privacy of Defendant clearly outweighs the public interest in the information being publicly available, as O.C.G.A. § 35-3-37(m) provides. Defendant makes no representation as to how the Court should resolve that question."
    ],
    verification: TRUTH_STATEMENT,
    signatureBlock: SIGNATURE_BLOCK
  },

  "ga-seal-m-proposed-order": proposedOrder({
    templateId: "ga-seal-m-proposed-order",
    orderTitle: "ORDER SEALING RECORDS OF THE CLERK OF COURT",
    recital:
      "This matter came before the Court on the Petition of {{defendantName}} under O.C.G.A. § 35-3-37(m) to seal the criminal history record information held by the Clerk of Court in case number {{caseNumber}}, the Clerk of Court and the prosecuting attorney having been served.",
    grantParagraphs: [
      "The criminal file, docket books, criminal minutes, final record, all other records of this Court and the criminal history record information in the custody of the Clerk of the {{courtName}} of {{courtCounty}} County, including within any index, concerning the case of {{defendantName}} arising from the arrest of {{arrestDate}} under offender tracking number {{otn}}, are sealed and made unavailable to the public.",
      "The Clerk shall restrict every document in the Clerk's custody, possession or control concerning this case, whether physical or electronic, within 60 days of the entry of this Order.",
      DISCLOSURE_LIMIT
    ]
  }),

  "ga-seal-m-certificate-of-service": certificateOfService({
    templateId: "ga-seal-m-certificate-of-service",
    documentTitle: "Petition to Seal Court Records",
    documentsServed: "Petition to Seal the Records of the Clerk of Court and the proposed Order",
    recipients: "clerk_and_prosecutor",
    methodSentence: STATUTORY_NOTICE_SENTENCE
  }),

  "ga-seal-m-exhibit-criminal-history": exhibitCoverSheet({
    templateId: "ga-seal-m-exhibit-criminal-history",
    exhibitLetter: "A",
    exhibitName: "Your own Georgia criminal history report showing the case as restricted",
    obtainedFrom:
      "most Georgia sheriff's offices and police departments, or the Georgia Crime Information Center; requirements vary by agency",
    whyItMatters:
      "That the record has already been restricted under § 35-3-37 is the first statutory element of sealing, and this report is what proves it."
  }),

  "ga-seal-m-exhibit-disposition": exhibitCoverSheet({
    templateId: "ga-seal-m-exhibit-disposition",
    exhibitLetter: "B",
    exhibitName: "Final disposition of the case",
    obtainedFrom: "the clerk of the court that handled the case",
    whyItMatters: "It identifies the case whose clerk records the petition asks the Court to seal."
  }),

  "ga-seal-m-exhibit-supporting": exhibitCoverSheet({
    templateId: "ga-seal-m-exhibit-supporting",
    exhibitLetter: "C",
    exhibitName: "Documents you choose to supply in support",
    obtainedFrom: "you; there is no statutory list and none is required",
    whyItMatters:
      "The Court weighs the harm to your privacy against the public interest. Anything you want the Court to see goes here.",
    conditional: true
  }),

  // ==========================================================================
  // ga-fo-active-pre2026 — First Offender, sentence not revoked, § 42-8-62.1
  // ==========================================================================
  "ga-fo-active-pre2026-petition": {
    templateId: "ga-fo-active-pre2026-petition",
    version: VERSION,
    technicalFixture: true,
    fixtureBanner: BANNER,
    caption: caption(COURT_LINE, "PETITION TO LIMIT PUBLIC ACCESS"),
    title: "PETITION TO RESTRICT AND SEAL FIRST OFFENDER RECORDS",
    preamble:
      "Defendant, appearing without a lawyer, petitions this Court under O.C.G.A. § 42-8-62.1(c) to limit public access to the case information for a First Offender sentence imposed before 1 July 2026 that has not been revoked, and states:",
    sections: [
      identification([
        "Defendant was sentenced in this Court under Article 3 of Chapter 8 of Title 42, the First Offender Act, on {{firstOffenderSentenceDate}}, which is before 1 July 2026.",
        "That sentence has not been revoked and Defendant has not been adjudicated guilty of the offence."
      ]),
      {
        heading: "II.  STATUTORY BASIS",
        numbered: true,
        paragraphs: [
          "O.C.G.A. § 42-8-62.1(c), as amended by 2026 Ga. Laws Act 403, § 3, provides that an individual who was sentenced under Article 3 of Chapter 8 of Title 42 before 1 July 2026, and who has not had that sentence revoked and been adjudicated guilty, may petition the court that ordered the sentence to limit public access to his or her case information under subsection (b).",
          "O.C.G.A. § 42-8-62.1(d) provides that within 90 days of the filing of the petition the court shall order the restriction and sealing.",
          "Act 403 struck the former requirement that the court find by a preponderance of the evidence that a discharge had been granted and that privacy harm outweighed the public interest. No such finding is required on this route, and Defendant asks the Court to make none.",
          "Notice of this petition shall be sent to the Clerk of Court and to the prosecuting attorney. Notice by registered mail, certified mail or statutory overnight delivery is sufficient under § 42-8-62.1(c)."
        ]
      },
      {
        heading: "III.  WHAT FOLLOWS THE ORDER",
        numbered: true,
        paragraphs: [
          "The Court shall order the restriction and sealing within 90 days of the filing of this petition.",
          "The Clerk then has 60 days to seal every document in the Clerk's custody concerning this case.",
          "Law enforcement agencies, jails and detention centers must restrict their records within 30 days of receiving a copy of the Order."
        ]
      },
      {
        heading: "IV.  NOTICE IS NOT A REQUEST FOR CONSENT",
        numbered: false,
        paragraphs: [
          "The prosecuting attorney receives notice of this petition. Notice is not a request for consent. Section 42-8-62.1 creates no advance-consent requirement, no objection period and no objection-triggered hearing on this route."
        ]
      },
      participantStatementSection(),
      effectAndFilingSection()
    ],
    prayer: [
      "WHEREFORE, Defendant asks the Court to enter an order limiting public access to the case information in case number {{caseNumber}} under O.C.G.A. § 42-8-62.1(b), restricting the criminal history record information and sealing the records of this case, and to enter the proposed Order submitted with this petition."
    ],
    verification: TRUTH_STATEMENT,
    signatureBlock: SIGNATURE_BLOCK
  },

  "ga-fo-active-pre2026-proposed-order": proposedOrder({
    templateId: "ga-fo-active-pre2026-proposed-order",
    orderTitle: "ORDER RESTRICTING AND SEALING FIRST OFFENDER RECORDS",
    recital:
      "This matter came before the Court on the Petition of {{defendantName}} under O.C.G.A. § 42-8-62.1(c) to limit public access to the case information for a First Offender sentence imposed before 1 July 2026, in case number {{caseNumber}}, the Clerk of Court and the prosecuting attorney having been served.",
    grantParagraphs: [
      "Public access to the case information in this case is limited as O.C.G.A. § 42-8-62.1(b) provides.",
      "Access to the criminal history record information arising from the arrest of {{defendantName}} on {{arrestDate}} under offender tracking number {{otn}} is restricted.",
      "The criminal file, docket books, criminal minutes, final record, all other records of this Court and the criminal history record information in the custody of the Clerk of the {{courtName}} of {{courtCounty}} County, including within any index, concerning this case, are sealed and made unavailable to the public.",
      "The Clerk shall seal every document in the Clerk's custody, possession or control concerning this case within 60 days of the entry of this Order.",
      RESTRICTION_DIRECTION,
      "Law enforcement agencies, jails and detention centers holding records of this case shall restrict them within 30 days of receiving a copy of this Order.",
      DISCLOSURE_LIMIT
    ]
  }),

  "ga-fo-active-pre2026-certificate-of-service": certificateOfService({
    templateId: "ga-fo-active-pre2026-certificate-of-service",
    documentTitle: "Petition to Restrict and Seal First Offender Records",
    documentsServed: "Petition to Restrict and Seal First Offender Records and the proposed Order",
    recipients: "clerk_and_prosecutor",
    methodSentence: STATUTORY_NOTICE_SENTENCE
  }),

  "ga-fo-active-pre2026-exhibit-disposition": exhibitCoverSheet({
    templateId: "ga-fo-active-pre2026-exhibit-disposition",
    exhibitLetter: "A",
    exhibitName: "Final disposition showing the First Offender sentence",
    obtainedFrom: "the clerk of the sentencing court",
    whyItMatters:
      "It shows that you were sentenced under the First Offender Act and the date of that sentence, which is what places the case before 1 July 2026."
  }),

  // ==========================================================================
  // ga-fo-discharged-pre2026 — First Offender discharge, § 42-8-62.2
  // ==========================================================================
  "ga-fo-discharged-pre2026-petition": {
    templateId: "ga-fo-discharged-pre2026-petition",
    version: VERSION,
    technicalFixture: true,
    fixtureBanner: BANNER,
    caption: caption(COURT_LINE, "PETITION TO SEAL FIRST OFFENDER RECORDS"),
    title: "PETITION TO SEAL AND MAKE UNAVAILABLE TO THE PUBLIC FIRST OFFENDER RECORDS",
    preamble:
      "Defendant, appearing without a lawyer, petitions this Court under O.C.G.A. § 42-8-62.2(c) to seal and make unavailable to the public the records of a First Offender case in which Defendant was exonerated of guilt and discharged before 1 July 2026, and states:",
    sections: [
      identification([
        "Defendant was sentenced in this Court under Article 3 of Chapter 8 of Title 42, the First Offender Act, on {{firstOffenderSentenceDate}}.",
        "Defendant was exonerated of guilt and discharged {{dischargeBasis}} on {{dischargeDate}}, which is before 1 July 2026.",
        "There was no court adjudication of guilt."
      ]),
      {
        heading: "II.  STATUTORY BASIS",
        numbered: true,
        paragraphs: [
          "O.C.G.A. § 42-8-62.2, enacted by 2026 Ga. Laws Act 403, § 4, provides at subsection (c) that an individual who was exonerated of guilt and discharged, as a matter of law or pursuant to a court order, before 1 July 2026 may petition the court that granted the discharge for an order sealing and making unavailable to the public the criminal file, docket books, criminal minutes, final record, all other records of the court and the individual's criminal history record information in the custody of the clerk of court, including within any index.",
          "O.C.G.A. § 42-8-62.2(d) provides that the court shall order the sealing within 90 days of the filing of the petition. No findings are required, and Defendant asks the Court to make none.",
          "Notice of this petition shall be sent to the Clerk of Court and to the prosecuting attorney. Notice by registered mail, certified mail or statutory overnight delivery is sufficient under § 42-8-62.2(c)."
        ]
      },
      {
        heading: "III.  WHAT FOLLOWS THE ORDER",
        numbered: true,
        paragraphs: [
          "The Court shall order the sealing within 90 days of the filing of this petition.",
          "Under O.C.G.A. § 42-8-62.2(e) the Clerk then has 60 days to seal every document in the Clerk's custody concerning this case.",
          "Under O.C.G.A. § 42-8-62.2(f) the Court shall also order law enforcement agencies, jails and detention centers to restrict their records, and they have 30 days from receiving a copy of the Order to comply."
        ]
      },
      {
        heading: "IV.  NOTICE IS NOT A REQUEST FOR CONSENT",
        numbered: false,
        paragraphs: [
          "The prosecuting attorney receives notice of this petition. Notice is not a request for consent. Section 42-8-62.2 creates no advance-consent requirement, no objection period and no objection-triggered hearing on this route."
        ]
      },
      participantStatementSection(),
      effectAndFilingSection()
    ],
    prayer: [
      "WHEREFORE, Defendant asks the Court to enter an order sealing and making unavailable to the public the criminal file, docket books, criminal minutes, final record, all other records of this Court and the criminal history record information in the custody of the Clerk in case number {{caseNumber}}, including within any index, ordering law enforcement agencies, jails and detention centers to restrict their records of this case, and to enter the proposed Order submitted with this petition."
    ],
    verification: TRUTH_STATEMENT,
    signatureBlock: SIGNATURE_BLOCK
  },

  "ga-fo-discharged-pre2026-proposed-order": proposedOrder({
    templateId: "ga-fo-discharged-pre2026-proposed-order",
    orderTitle: "ORDER SEALING FIRST OFFENDER RECORDS",
    recital:
      "This matter came before the Court on the Petition of {{defendantName}} under O.C.G.A. § 42-8-62.2(c) to seal and make unavailable to the public the records of a First Offender case in which Defendant was exonerated and discharged before 1 July 2026, in case number {{caseNumber}}, the Clerk of Court and the prosecuting attorney having been served.",
    grantParagraphs: [
      "The criminal file, docket books, criminal minutes, final record, all other records of this Court and the criminal history record information in the custody of the Clerk of the {{courtName}} of {{courtCounty}} County, including within any index, concerning the case of {{defendantName}} arising from the arrest of {{arrestDate}} under offender tracking number {{otn}}, are sealed and made unavailable to the public.",
      "The Clerk shall seal every document in the Clerk's custody, possession or control concerning this case within 60 days of the entry of this Order, as O.C.G.A. § 42-8-62.2(e) provides.",
      RESTRICTION_DIRECTION,
      "Law enforcement agencies, jails and detention centers holding records of this case shall restrict them within 30 days of receiving a copy of this Order, as O.C.G.A. § 42-8-62.2(f) provides.",
      DISCLOSURE_LIMIT
    ]
  }),

  "ga-fo-discharged-pre2026-certificate-of-service": certificateOfService({
    templateId: "ga-fo-discharged-pre2026-certificate-of-service",
    documentTitle: "Petition to Seal First Offender Records",
    documentsServed: "Petition to Seal and Make Unavailable to the Public First Offender Records and the proposed Order",
    recipients: "clerk_and_prosecutor",
    methodSentence: STATUTORY_NOTICE_SENTENCE
  }),

  "ga-fo-discharged-pre2026-exhibit-disposition": exhibitCoverSheet({
    templateId: "ga-fo-discharged-pre2026-exhibit-disposition",
    exhibitLetter: "A",
    exhibitName: "Final disposition showing the First Offender sentence and the discharge order",
    obtainedFrom: "the clerk of the court that granted the discharge",
    whyItMatters:
      "It shows that you were sentenced under the First Offender Act and that you were exonerated and discharged before 1 July 2026, which is what § 42-8-62.2(c) turns on."
  })
};
