// Texas Chapter 55A expunction — custom-pleading implementation.
//
// Eight assigned routes, every one of them `custom_pleading`, and the reason is
// structural rather than a drafting preference: **Texas publishes no statewide
// official expunction form.** Article 55A.253(a) prescribes the contents of the
// petition instead, and that prescription is the specification these templates
// are built to. County packets, TexasLawHelp documents and Texas Justice Court
// Training Center materials exist and are useful, but none of them is a
// statewide official form and none is promoted as one anywhere in this module.
// Every Chapter 55A document here is a controlled custom pleading.
//
// Actor boundaries this module keeps, because each one is a place where an
// automated packet could quietly claim work it did not do:
//
//   - **The clerk serves, not the participant.** Article 55A.254 puts service of
//     the petition and the notice of hearing on the clerk, by certified mail or
//     by electronic transmission. Nothing here generates a certificate of
//     service for the ordinary case, and the instructions say the clerk does it.
//
//   - **Prosecutor consent is never obtained by LegalEase.** Two routes involve
//     the prosecutor directly: mistaken identity under art. 55A.256, where the
//     participant makes a *verified application to the prosecutor*, and the
//     specialty-court route under art. 55A.203, where consent may be sought. In
//     both, LegalEase prepares the participant's own request and nothing else.
//     No template asserts that consent was given, will be given, or has been
//     sought by anyone but the participant.
//
//   - **The judge signs the order.** Every proposed Order of Expunction carries
//     `signatureLabel: null` and a blank judicial signature block. LegalEase
//     never fills a finding, a date of entry, or a judge's name.
//
//   - **Negotiation, opposition and contested hearings are attorney handoffs.**
//     Article 55A.302 retention, multi-charge arrests under State v. T.S.N. and
//     Ex parte R.P.G.P., contested limitations analysis and any state objection
//     are typed stops with a destination, not template paragraphs.
//
//   - **Filing, service and the hearing are stages, not legal units.** They are
//     described in the instructions the packet ships with; they are not modelled
//     as separate components and they do not appear as separate pleadings.
//
// What these templates never do:
//
//   - invent the identity facts art. 55A.253(a) requires. Full name, sex, race,
//     date of birth, driver's licence number, social security number and the
//     address at the time of arrest are **blank participant-completion lines**.
//     They are statutorily required contents of the petition and they are not
//     declared participant inputs on any assigned track, so the petition carries
//     the field and the participant writes the value. LegalEase never holds a
//     social security number;
//   - state a filing fee amount. Article 102.0061(a) makes the district-court
//     fee the ordinary county civil filing fee, which is not a flat statutory
//     figure, so no template states a number;
//   - notarize. Both a notarial verification block and an unsworn declaration
//     under penalty of perjury ship on every petition, because county practice
//     chooses between them and neither is completed here;
//   - predict an outcome, or tell the participant they are eligible. The
//     petition alleges facts and asks the court to find them;
//   - merge private entities into the art. 55A.253(a)(8) agency list, or list an
//     agency twice. Article 55A.253(b) and art. 55A.256(c-1) forbid both.
//
// Every template is DRAFT PENDING LEGAL REVIEW until reviewing counsel adopts
// it. The banner says so on the face of every rendering, and every track is
// `technicalFixture` and `runtimeDisabled`: nothing here reaches a runtime
// surface, and wiring these tracks and templates into the shared registry and
// template pack is the integration captain's step, not this job's.

import type { PleadingTemplate } from "@/lib/rcap/packets/engines/pleading-templates";
import type { PacketSet, ReliefTrack, RequiredInput } from "@/lib/rcap/packets/types";
import { computeRuntimeStatus } from "@/lib/rcap/packets/types";

const VERSION = "1.0.0";

const BANNER =
  "DRAFT PENDING LEGAL REVIEW — PREPARED BY LEGALEASE — NOT LEGAL ADVICE — DO NOT FILE UNTIL REVIEWED";

/** Where every typed stop on every Texas route sends the participant. */
export const TX_REFERRAL =
  "Texas Legal Services Center / TexasLawHelp expunction help line, or the local county bar lawyer referral service.";

// ---------------------------------------------------------------------------
// Typed stops
// ---------------------------------------------------------------------------

/**
 * Raised when an answer puts the route outside its article, or outside what
 * LegalEase may prepare without individualized advocacy.
 *
 * Typed and carrying its own referral so a caller cannot mistake a deliberate
 * stop for a missing answer, and cannot lose the destination the design
 * requires the participant to be sent to.
 */
export class TexasEligibilityStopError extends Error {
  constructor(
    readonly trackId: string,
    readonly stopId: string,
    readonly reason: string,
    readonly referral: string = TX_REFERRAL
  ) {
    super(reason);
    this.name = "TexasEligibilityStopError";
  }
}

/** Raised when an answer is outside the approved closed list for a branch. */
export class TexasBranchError extends Error {
  constructor(
    readonly trackId: string,
    readonly key: string,
    readonly value: string
  ) {
    super(`${trackId}: "${value}" is not an approved value for ${key}.`);
    this.name = "TexasBranchError";
  }
}

// ---------------------------------------------------------------------------
// Closed lists
// ---------------------------------------------------------------------------

export const TX_YES_NO: Readonly<Record<string, boolean>> = {
  yes: true,
  no: false
};

/**
 * The five statutory dismissal grounds under art. 55A.053(a)(2).
 *
 * The specification is explicit that the engine must not treat "dismissed" as
 * sufficient: it must capture the documented reason and hard-stop where the
 * reason is not one of these.
 */
export const TX_DISMISSAL_REASONS: Readonly<Record<string, string>> = {
  mistake: "because of mistake",
  false_information: "because of false information",
  other_similar_reason:
    "because of another similar reason indicating absence of probable cause at the time of the dismissal to believe the person committed the offence",
  void_indictment: "because the indictment or information was void",
  completed_pretrial_intervention:
    "because the person completed a pretrial intervention programme authorised by Section 76.011, Government Code"
};

/** Article 55A.004 pardon branches. */
export const TX_PARDON_TYPES: Readonly<Record<string, string>> = {
  full_pardon: "a full pardon granted for a reason other than actual innocence",
  conditional_pardon: "a conditional pardon"
};

/** Article 55A.203 specialty-court programmes. */
export const TX_SPECIALTY_PROGRAMS: Readonly<Record<string, string>> = {
  drug_court: "a drug court programme",
  veterans_court: "a veterans treatment court programme",
  mental_health_court: "a mental health court programme",
  family_drug_court: "a family drug court programme",
  commercially_sexually_exploited_persons_court:
    "a commercially sexually exploited persons court programme"
};

/** Article 55A.005 pre-2021 unlawful carrying branches. */
export const TX_UNLAWFUL_CARRY_SUBSECTIONS: Readonly<Record<string, string>> = {
  penal_46_02_a: "Section 46.02(a), Penal Code",
  penal_46_02_a1: "Section 46.02(a-1), Penal Code"
};

/** How the participant establishes the limitations position on art. 55A.054. */
export const TX_LIMITATIONS_SOURCES: Readonly<Record<string, string>> = {
  court_record: "the court record in the underlying case",
  prosecutor_statement: "a written statement from the prosecuting attorney",
  counsel_analysis: "an analysis provided by the participant's own lawyer"
};

// ---------------------------------------------------------------------------
// Derived facts
// ---------------------------------------------------------------------------

type Answers = Record<string, unknown>;

const str = (answers: Answers, key: string): string => {
  const value = answers[key];
  return typeof value === "string" ? value.trim() : "";
};

const need = (trackId: string, answers: Answers, key: string): string => {
  const value = str(answers, key);
  if (!value) {
    throw new TexasEligibilityStopError(
      trackId,
      `missing:${key}`,
      `The packet cannot be prepared without an answer to ${key}. LegalEase does not supply a fact the participant has not given.`
    );
  }
  return value;
};

const branch = <T>(
  trackId: string,
  key: string,
  value: string,
  list: Readonly<Record<string, T>>
): T => {
  if (!Object.prototype.hasOwnProperty.call(list, value)) {
    throw new TexasBranchError(trackId, key, value);
  }
  return list[value];
};

const yesNo = (trackId: string, answers: Answers, key: string): boolean =>
  branch(trackId, key, need(trackId, answers, key), TX_YES_NO);

/**
 * Bars that apply to every Chapter 55A route in this job.
 *
 * Each one is a stop rather than a template paragraph, because each requires an
 * analysis the design places outside the packet.
 */
function applyCommonStops(trackId: string, answers: Answers): void {
  if (yesNo(trackId, answers, "felonyFromSameTransaction")) {
    throw new TexasEligibilityStopError(
      trackId,
      "felony_same_transaction",
      "A felony arising from the same transaction is present or arguable. That changes the waiting analysis and can defeat the petition, and it is not automated."
    );
  }
  if (yesNo(trackId, answers, "communitySupervision")) {
    throw new TexasEligibilityStopError(
      trackId,
      "community_supervision",
      "Court-ordered community supervision was served for the offence. Article 55A.051 makes that a bar on this route."
    );
  }
  if (yesNo(trackId, answers, "probationViolationArrest")) {
    throw new TexasEligibilityStopError(
      trackId,
      "probation_violation_arrest",
      "The arrest was for a probation or community-supervision violation. That is outside this route."
    );
  }
  if (yesNo(trackId, answers, "abscondedAfterRelease")) {
    throw new TexasEligibilityStopError(
      trackId,
      "absconded",
      "Article 55A.154 makes a person who intentionally or knowingly absconded after release ineligible, and whether the history amounts to absconding is a contested question for a lawyer."
    );
  }
}

/** The art. 55A.253(a)(8) list, deduplicated as art. 55A.253(b) requires. */
function agencyLines(trackId: string, answers: Answers): string[] {
  const raw = answers.agencyList;
  const entries = Array.isArray(raw) ? raw.map((entry) => String(entry).trim()) : [];
  const kept: string[] = [];
  const seen = new Set<string>();
  for (const entry of entries) {
    if (!entry) continue;
    const key = entry.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    kept.push(entry);
  }
  if (kept.length === 0) {
    throw new TexasEligibilityStopError(
      trackId,
      "empty_agency_list",
      "Article 55A.253(a)(8) requires the petition to list every official, agency and entity believed to hold records of the arrest. The petition cannot be prepared with an empty list."
    );
  }
  return kept;
}

/** Private entities are listed separately and never merged into the agency list. */
function privateEntityLines(answers: Answers): string[] {
  const raw = answers.privateEntities;
  const entries = Array.isArray(raw) ? raw.map((entry) => String(entry).trim()).filter(Boolean) : [];
  const kept: string[] = [];
  const seen = new Set<string>();
  for (const entry of entries) {
    const key = entry.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    kept.push(entry);
  }
  return kept;
}

const numbered = (lines: readonly string[]): string =>
  lines.length ? lines.map((line, index) => `${index + 1}. ${line}`).join("\n") : "";

/**
 * Validates the participant's answers for an assigned track and returns the
 * fact bag the renderer fills templates from.
 *
 * Every value in the returned bag comes from a declared participant input or is
 * a deterministic transformation of one. Nothing is inferred.
 */
export function deriveTexasFacts(trackId: string, answers: Answers): Record<string, string> {
  applyCommonStops(trackId, answers);

  const agencies = agencyLines(trackId, answers);
  const privates = privateEntityLines(answers);

  // The screening answers are carried through even though no template renders
  // them. They are declared required inputs, and `resolvePacket` is entitled to
  // see that each one was actually answered rather than assumed.
  const screening: Record<string, string> = {
    felonyFromSameTransaction: str(answers, "felonyFromSameTransaction"),
    communitySupervision: str(answers, "communitySupervision"),
    probationViolationArrest: str(answers, "probationViolationArrest"),
    abscondedAfterRelease: str(answers, "abscondedAfterRelease")
  };

  const base: Record<string, string> = {
    ...screening,
    arrestCounty: need(trackId, answers, "arrestCounty"),
    arrestDate: need(trackId, answers, "arrestDate"),
    arrestingAgency: need(trackId, answers, "arrestingAgency"),
    offenceCharged: need(trackId, answers, "offenceCharged"),
    caseNumberAndCourt: need(trackId, answers, "caseNumberAndCourt"),
    trn: str(answers, "trn") || "not known to the petitioner",
    agencyList: numbered(agencies),
    agencyCount: String(agencies.length),
    privateEntityList: privates.length
      ? numbered(privates)
      : "None known to the petitioner at the time of filing.",
    feeWaiverRequested: yesNo(trackId, answers, "feeWaiverRequested") ? "yes" : "no"
  };

  switch (trackId) {
    case "tx_exp_dismissed": {
      const reasonKey = need(trackId, answers, "dismissalReason");
      const reason = branch(trackId, "dismissalReason", reasonKey, TX_DISMISSAL_REASONS);
      if (yesNo(trackId, answers, "deferredAdjudication")) {
        throw new TexasEligibilityStopError(
          trackId,
          "deferred_adjudication",
          "The charge was resolved by deferred adjudication community supervision. That is not a dismissal within art. 55A.053(a)(2) and this route does not reach it."
        );
      }
      if (
        str(answers, "specialtyCourt") &&
        yesNo(trackId, answers, "priorSpecialtyExpunction")
      ) {
        throw new TexasEligibilityStopError(
          trackId,
          "prior_specialty_expunction",
          "A previous expunction was obtained on a specialty-court dismissal. Article 55A.203(d) limits that relief and the interaction is not automated."
        );
      }
      return {
        ...base,
        dismissalReason: reason,
        deferredAdjudication: str(answers, "deferredAdjudication"),
        specialtyCourt: str(answers, "specialtyCourt"),
        priorSpecialtyExpunction: str(answers, "priorSpecialtyExpunction")
      };
    }
    case "tx_exp_limitations": {
      const sourceKey = need(trackId, answers, "limitationsSource");
      return {
        ...base,
        offenceDate: need(trackId, answers, "offenceDate"),
        limitationsSource: branch(trackId, "limitationsSource", sourceKey, TX_LIMITATIONS_SOURCES)
      };
    }
    case "tx_exp_mistaken_identity": {
      if (!yesNo(trackId, answers, "fingerprintsBooked")) {
        throw new TexasEligibilityStopError(
          trackId,
          "no_booking_identifiers",
          "Article 55A.256 turns on the petitioner being identified as a result of mistaken identity or identity theft, established against the booking record. Without booking identifiers the application cannot be prepared."
        );
      }
      return {
        ...base,
        residenceCounty: need(trackId, answers, "residenceCounty"),
        mistakenIdentityBasis: need(trackId, answers, "mistakenIdentityBasis"),
        consentGiven: str(answers, "consentGiven"),
        fingerprintsBooked: str(answers, "fingerprintsBooked"),
        consentStatus: yesNo(trackId, answers, "consentGiven")
          ? "The petitioner states that the prosecuting attorney has indicated consent. The petitioner attaches or will obtain the prosecuting attorney's own written consent; this document does not evidence it."
          : "The prosecuting attorney has not consented. This application asks the prosecuting attorney to consider the matter and does not assume any answer."
      };
    }
    case "tx_exp_no_charge":
      return base;
    case "tx_exp_pardon_innocence": {
      if (!yesNo(trackId, answers, "pardonOnFace")) {
        throw new TexasEligibilityStopError(
          trackId,
          "innocence_not_on_face",
          "Article 55A.202 reaches a pardon or other relief granted on the basis of actual innocence. Where the grant does not say so on its face, whether it qualifies is a question for a lawyer."
        );
      }
      if (yesNo(trackId, answers, "inTdcjCustody")) {
        throw new TexasEligibilityStopError(
          trackId,
          "in_custody",
          "The petitioner is in the custody of the Texas Department of Criminal Justice. The route is available, but preparing a self-help packet for a person in custody is outside this design."
        );
      }
      return {
        ...base,
        pardonOnFace: str(answers, "pardonOnFace"),
        inTdcjCustody: str(answers, "inTdcjCustody"),
        pardonDate: need(trackId, answers, "pardonDate")
      };
    }
    case "tx_exp_pardon_other": {
      const typeKey = need(trackId, answers, "pardonType");
      return {
        ...base,
        pardonType: branch(trackId, "pardonType", typeKey, TX_PARDON_TYPES),
        pardonDate: need(trackId, answers, "pardonDate")
      };
    }
    case "tx_exp_specialty_court": {
      const programKey = need(trackId, answers, "specialtyProgramType");
      if (yesNo(trackId, answers, "priorSpecialtyExpunction")) {
        throw new TexasEligibilityStopError(
          trackId,
          "prior_specialty_expunction",
          "Article 55A.203(d) limits this relief where a previous expunction was obtained on a specialty-court dismissal, and the interaction is not automated."
        );
      }
      const specialtyProgram = branch(
        trackId,
        "specialtyProgramType",
        programKey,
        TX_SPECIALTY_PROGRAMS
      );
      return {
        ...base,
        // The template reads `specialtyProgram`; the declared input is
        // `specialtyProgramType`, and `resolvePacket` checks the declared key.
        specialtyProgram,
        specialtyProgramType: specialtyProgram,
        dismissalDate: need(trackId, answers, "dismissalDate"),
        priorSpecialtyExpunction: str(answers, "priorSpecialtyExpunction"),
        prosecutorConsentSought: str(answers, "prosecutorConsentSought"),
        consentStatus: yesNo(trackId, answers, "prosecutorConsentSought")
          ? "The petitioner has asked the attorney representing the state to consider consenting. Whether consent is given is the state's decision alone and no consent is asserted here."
          : "No consent has been sought from the attorney representing the state, and none is asserted here."
      };
    }
    case "tx_exp_unlawful_carry": {
      if (!yesNo(trackId, answers, "offenceDatePre2021")) {
        throw new TexasEligibilityStopError(
          trackId,
          "post_2021_offence",
          "Article 55A.005 reaches an offence committed before 1 September 2021. A later offence is outside this route."
        );
      }
      const subsectionKey = need(trackId, answers, "penalCodeSubsection");
      return {
        ...base,
        offenceDatePre2021: str(answers, "offenceDatePre2021"),
        penalCodeSubsection: branch(
          trackId,
          "penalCodeSubsection",
          subsectionKey,
          TX_UNLAWFUL_CARRY_SUBSECTIONS
        )
      };
    }
    default:
      throw new TexasBranchError(trackId, "trackId", trackId);
  }
}

// ---------------------------------------------------------------------------
// Template builders
// ---------------------------------------------------------------------------

/**
 * The art. 55A.253(a) identity block.
 *
 * Every line is blank on purpose. These are statutorily required contents of
 * the petition and none of them is a declared participant input on any assigned
 * track, so the petition carries the field and the participant writes the value.
 */
const IDENTITY_BLOCK: readonly string[] = [
  "Full name: ______________________________________________",
  "Sex: ____________________  Race: ________________________",
  "Date of birth: ___________________________________________",
  "Driver's licence number: _________________________________",
  "Social security number: __________________________________",
  "Address at the time of arrest: ___________________________",
  "__________________________________________________________"
];

/**
 * The verification note, written for the instrument it appears on.
 *
 * Article 55A.253 requires the *petition* to be verified. The affidavit is
 * verified because it is filed with the petition; the application to the
 * attorney representing the state is verified because it is the applicant's
 * own sworn request and never reaches a clerk. Naming the wrong instrument,
 * or sending an applicant to a clerk who will not receive the document, is a
 * filing error, so each carries its own sentence.
 */
function verificationNote(instrument: "petition" | "affidavit" | "application"): string {
  const requirement =
    instrument === "petition"
      ? "Article 55A.253 requires the petition to be verified."
      : instrument === "affidavit"
        ? "This affidavit is filed with the petition that article 55A.253 requires to be verified, and is sworn on the same footing."
        : "This application is the applicant's own sworn request to the attorney representing the state. It is not filed with a clerk.";
  const chooser =
    instrument === "application"
      ? "Complete the one the office receiving this application accepts and leave the other blank."
      : "Complete the one the clerk of the filing county accepts and leave the other blank.";
  return `${requirement} Two blocks are provided because county practice differs on whether an unsworn declaration satisfies the requirement. ${chooser}`;
}

/** Both verification blocks, naming the instrument sworn to and its signer. */
function verificationBlocks(
  instrument: "petition" | "affidavit" | "application",
  signer: "Petitioner" | "Affiant" | "Applicant"
): readonly string[] {
  return [
    "",
    "VERIFICATION BEFORE A NOTARY",
    "",
    "STATE OF TEXAS, COUNTY OF ____________________",
    "",
    "Signed and sworn to before me on ______________ by ____________________.",
    "",
    "____________________________________",
    "Notary Public, State of Texas",
    "",
    "— OR —",
    "",
    "UNSWORN DECLARATION UNDER PENALTY OF PERJURY",
    "",
    `My name is ____________________, my date of birth is ____________, and my address is ____________________. I declare under penalty of perjury that the facts stated in this ${instrument} are true and correct.`,
    "",
    "____________________________________",
    signer
  ];
}

const AGENCY_SECTION = {
  heading: "OFFICIALS, AGENCIES AND ENTITIES BELIEVED TO HOLD RECORDS",
  numbered: false,
  paragraphs: [
    "Article 55A.253(a)(8) requires this list. Article 55A.253(b) forbids listing any state or local agency more than once and forbids separate contacts or addresses for different divisions of the same agency. The list below has been deduplicated on that rule and the petitioner has confirmed it before filing.",
    "{{agencyList}}",
    "Petitioner believes the above {{agencyCount}} officials, agencies and entities hold records or files relating to the arrest. Where an item required by art. 55A.253(a) is not included, the omission and the reason for it are stated in this petition.",
    "Central federal depositories are not served by the clerk. The Texas Department of Public Safety notifies them on receipt of the order."
  ]
};

const PRIVATE_ENTITY_SECTION = {
  heading: "PRIVATE ENTITIES THAT COMPILE AND DISSEMINATE CRIMINAL HISTORY RECORD INFORMATION FOR COMPENSATION",
  numbered: false,
  paragraphs: [
    "Listed separately from the officials and agencies above, and never merged into that list.",
    "{{privateEntityList}}"
  ]
};

type PetitionSpec = {
  templateId: string;
  title: string;
  articleLine: string;
  groundParagraphs: readonly string[];
  prayer: readonly string[];
};

function petitionTemplate(spec: PetitionSpec): PleadingTemplate {
  return {
    templateId: spec.templateId,
    version: VERSION,
    technicalFixture: true,
    fixtureBanner: BANNER,
    caption: {
      courtLine:
        "IN THE DISTRICT COURT OF {{arrestCounty}} COUNTY, TEXAS",
      partyBlockLeft: [
        "EX PARTE",
        "",
        "PETITIONER,",
        "",
        "IN THE MATTER OF THE EXPUNCTION",
        "OF THE ARREST RECORDS OF",
        "THE PETITIONER."
      ],
      partyBlockRight: ["Cause No. ______________", "", "EX PARTE PETITION"]
    },
    title: spec.title,
    preamble:
      "Texas publishes no statewide official expunction form. This is a controlled pleading prepared to the contents that article 55A.253(a) of the Texas Code of Criminal Procedure prescribes. It has not been reviewed by counsel and must not be filed until it has been.",
    sections: [
      {
        heading: "PETITIONER",
        numbered: false,
        paragraphs: [
          "Article 55A.253(a)(1) requires the following identifying information. The petitioner completes each line by hand before filing. LegalEase does not hold or supply these values.",
          ...IDENTITY_BLOCK
        ]
      },
      {
        heading: "THE ARREST",
        numbered: true,
        paragraphs: [
          "Petitioner was arrested on {{arrestDate}} in {{arrestCounty}} County, Texas, by {{arrestingAgency}}.",
          "The offence charged was {{offenceCharged}}.",
          "The case number and court of the offence are {{caseNumberAndCourt}}.",
          "The tracking incident number (TRN) assigned to the arrest is {{trn}}."
        ]
      },
      {
        heading: "GROUNDS FOR EXPUNCTION",
        numbered: true,
        paragraphs: [spec.articleLine, ...spec.groundParagraphs]
      },
      AGENCY_SECTION,
      PRIVATE_ENTITY_SECTION
    ],
    prayer: spec.prayer,
    // The engine renders `verification` immediately above the signature, which
    // is where the note belongs: it explains the two blocks that follow it.
    verification: verificationNote("petition"),
    signatureLabel: "Petitioner",
    signatureBlock: [
      "____________________________________",
      "Petitioner, pro se",
      "",
      "Printed name: ______________________________",
      "Address: ___________________________________",
      "Telephone: _________________________________",
      "Email: _____________________________________",
      ...verificationBlocks("petition", "Petitioner")
    ]
  };
}

function proposedOrderTemplate(trackId: string, articleLine: string): PleadingTemplate {
  return {
    templateId: `${trackId}-proposed-order`,
    version: VERSION,
    technicalFixture: true,
    fixtureBanner: BANNER,
    caption: {
      courtLine: "IN THE DISTRICT COURT OF {{arrestCounty}} COUNTY, TEXAS",
      partyBlockLeft: [
        "EX PARTE",
        "",
        "PETITIONER,",
        "",
        "IN THE MATTER OF THE EXPUNCTION",
        "OF THE ARREST RECORDS OF",
        "THE PETITIONER."
      ],
      partyBlockRight: ["Cause No. ______________", "", "PROPOSED ORDER"]
    },
    title: "ORDER OF EXPUNCTION (PROPOSED)",
    preamble:
      "Proposed. The court makes the findings and signs the order. Nothing in this document is a finding, and no part of it is completed by LegalEase.",
    sections: [
      {
        heading: "FINDINGS",
        numbered: true,
        paragraphs: [
          "On this day the court considered the ex parte petition for expunction filed by the petitioner.",
          articleLine,
          "The court finds that the petitioner is entitled to expunction of all records and files relating to the arrest described in the petition. [The court completes or modifies this finding.]"
        ]
      },
      {
        heading: "ORDER",
        numbered: true,
        paragraphs: [
          "IT IS ORDERED that all records and files relating to the arrest of the petitioner on {{arrestDate}} in {{arrestCounty}} County, Texas, by {{arrestingAgency}}, for the offence of {{offenceCharged}}, be expunged.",
          "IT IS FURTHER ORDERED that each official, agency and entity named in the petition return all records and files to the court, or obliterate all portions of the record or file that identify the petitioner, as article 55A.301 provides.",
          "IT IS FURTHER ORDERED that the clerk of this court send a certified copy of this order to each official, agency and entity named in the petition and to the Texas Department of Public Safety."
        ]
      },
      {
        // Its own unnumbered section. Inside the numbered ORDER section the
        // list became a decree in its own right and its entries were numbered
        // twice over, which is not what the court is being asked to sign.
        heading: "OFFICIALS, AGENCIES AND ENTITIES TO WHICH THIS ORDER APPLIES",
        numbered: false,
        paragraphs: [
          "Those listed in the petition, namely:",
          "{{agencyList}}"
        ]
      }
    ],
    prayer: [],
    // The court signs a proposed order. Suppressing the participant signature
    // rule is the point: a signature line for the participant here would invite
    // them to sign the judge's document.
    signatureLabel: null,
    signatureBlock: [
      "SIGNED this ________ day of ______________, 20____.",
      "",
      "____________________________________",
      "JUDGE PRESIDING"
    ]
  };
}

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

const PETITIONS: readonly PetitionSpec[] = [
  {
    templateId: "tx_exp_dismissed-petition",
    title: "EX PARTE PETITION FOR EXPUNCTION (CHARGE DISMISSED OR QUASHED)",
    articleLine:
      "This petition is brought under articles 55A.051 and 55A.053 of the Texas Code of Criminal Procedure.",
    groundParagraphs: [
      "Petitioner was released and the charge, if any, did not result in a final conviction and is no longer pending.",
      "There was no court-ordered community supervision for the offence.",
      "The charge was dismissed or quashed {{dismissalReason}}, as art. 55A.053(a)(2) requires.",
      "Petitioner asks the court to find the statutory requirements met on the facts alleged. Petitioner does not assert that the court is bound to do so."
    ],
    prayer: [
      "WHEREFORE, petitioner asks the court to set this matter for hearing, to give notice to each official, agency and entity named in this petition as article 55A.254 requires, and after hearing to order the expunction of all records and files relating to the arrest described above.",
      "Petitioner asks for such other relief to which petitioner may be entitled."
    ]
  },
  {
    templateId: "tx_exp_limitations-petition",
    title: "EX PARTE PETITION FOR EXPUNCTION (LIMITATIONS PERIOD EXPIRED)",
    articleLine:
      "This petition is brought under articles 55A.051 and 55A.054 of the Texas Code of Criminal Procedure.",
    groundParagraphs: [
      "The offence was alleged to have been committed on {{offenceDate}}.",
      "The period of limitations for the offence has expired, as established by {{limitationsSource}}.",
      "No indictment or information charging the petitioner with the offence was presented, or any that was presented has been dismissed and the limitations period has run.",
      "Petitioner asks the court to determine the limitations question on the facts alleged. Petitioner does not assert that the analysis is beyond dispute."
    ],
    prayer: [
      "WHEREFORE, petitioner asks the court to set this matter for hearing, to give notice as article 55A.254 requires, and after hearing to order the expunction of all records and files relating to the arrest described above.",
      "Petitioner asks for such other relief to which petitioner may be entitled."
    ]
  },
  {
    templateId: "tx_exp_mistaken_identity-petition",
    title: "EX PARTE PETITION FOR EXPUNCTION (MISTAKEN IDENTITY OR IDENTITY THEFT)",
    articleLine:
      "This petition is brought under articles 55A.006 and 55A.256 of the Texas Code of Criminal Procedure.",
    groundParagraphs: [
      "Petitioner resides in {{residenceCounty}} County, Texas.",
      "Petitioner was arrested or identified in the records of the arrest as a result of mistaken identity or identity theft. The basis stated by the petitioner is: {{mistakenIdentityBasis}}",
      "The arrest records carry fingerprints or other booking identifiers against which the mistaken identification can be tested.",
      "Petitioner asks the court to determine the identity question on the evidence. Petitioner makes no assertion about who committed the offence."
    ],
    prayer: [
      "WHEREFORE, petitioner asks the court to set this matter for hearing, to give notice as article 55A.254 requires, and after hearing to order the expunction of all records and files relating to the arrest described above.",
      "Petitioner asks for such other relief to which petitioner may be entitled."
    ]
  },
  {
    templateId: "tx_exp_no_charge-petition",
    title: "EX PARTE PETITION FOR EXPUNCTION (NO CHARGE FILED)",
    articleLine:
      "This petition is brought under articles 55A.051 and 55A.052 of the Texas Code of Criminal Procedure.",
    groundParagraphs: [
      "Petitioner was arrested and no indictment or information charging the petitioner with an offence arising out of the transaction was presented.",
      "There was no court-ordered community supervision for the offence.",
      "The arrest did not result in a final conviction and no charge is pending.",
      "Petitioner asks the court to find the statutory requirements met on the facts alleged."
    ],
    prayer: [
      "WHEREFORE, petitioner asks the court to set this matter for hearing, to give notice as article 55A.254 requires, and after hearing to order the expunction of all records and files relating to the arrest described above.",
      "Petitioner asks for such other relief to which petitioner may be entitled."
    ]
  },
  {
    templateId: "tx_exp_pardon_innocence-petition",
    title: "EX PARTE PETITION FOR EXPUNCTION (PARDON OR RELIEF ON ACTUAL INNOCENCE)",
    articleLine:
      "This petition is brought under articles 55A.003 and 55A.202 of the Texas Code of Criminal Procedure.",
    groundParagraphs: [
      "Petitioner was convicted of the offence described above and was afterwards pardoned or otherwise granted relief on the basis of actual innocence, on {{pardonDate}}.",
      "The grant states on its face that it was made on the basis of actual innocence.",
      "Petitioner attaches the instrument granting the relief. Petitioner does not characterise its effect beyond what it states."
    ],
    prayer: [
      "WHEREFORE, petitioner asks the court to set this matter for hearing, to give notice as article 55A.254 requires, and after hearing to order the expunction of all records and files relating to the arrest and conviction described above.",
      "Petitioner asks for such other relief to which petitioner may be entitled."
    ]
  },
  {
    templateId: "tx_exp_pardon_other-petition",
    title: "EX PARTE PETITION FOR EXPUNCTION (PARDON GRANTED FOR ANOTHER REASON)",
    articleLine:
      "This petition is brought under article 55A.004 of the Texas Code of Criminal Procedure.",
    groundParagraphs: [
      "Petitioner was convicted of the offence described above and afterwards received {{pardonType}}, granted on {{pardonDate}}.",
      "Petitioner attaches the instrument granting the pardon. Petitioner does not characterise its effect beyond what it states.",
      "Petitioner asks the court to determine whether art. 55A.004 entitles petitioner to expunction on these facts."
    ],
    prayer: [
      "WHEREFORE, petitioner asks the court to set this matter for hearing, to give notice as article 55A.254 requires, and after hearing to order the expunction of all records and files relating to the arrest and conviction described above.",
      "Petitioner asks for such other relief to which petitioner may be entitled."
    ]
  },
  {
    templateId: "tx_exp_specialty_court-petition",
    title: "EX PARTE PETITION FOR EXPUNCTION (SPECIALTY COURT DISMISSAL)",
    articleLine:
      "This petition is brought under article 55A.203 of the Texas Code of Criminal Procedure, with articles 55A.053(a)(2) and 55A.053(b).",
    groundParagraphs: [
      "Petitioner successfully completed {{specialtyProgram}} and the charge was dismissed on {{dismissalDate}}.",
      "The dismissal followed completion of the programme, which art. 55A.053(a)(2) recognises as a ground.",
      "{{consentStatus}}",
      "Petitioner asks the court to enter the order article 55A.203 provides for on these facts."
    ],
    prayer: [
      "WHEREFORE, petitioner asks the court to enter an order of expunction of all records and files relating to the arrest described above, and to give notice as article 55A.254 requires.",
      "Petitioner asks for such other relief to which petitioner may be entitled."
    ]
  },
  {
    templateId: "tx_exp_unlawful_carry-petition",
    title: "EX PARTE PETITION FOR EXPUNCTION (PRE-2021 UNLAWFUL CARRYING OF A HANDGUN)",
    articleLine:
      "This petition is brought under article 55A.005 of the Texas Code of Criminal Procedure.",
    groundParagraphs: [
      "Petitioner was convicted of unlawful carrying of a handgun under {{penalCodeSubsection}}.",
      "The offence was committed before 1 September 2021.",
      "Petitioner asks the court to find that art. 55A.005 entitles petitioner to expunction of the records of that arrest and conviction."
    ],
    prayer: [
      "WHEREFORE, petitioner asks the court to set this matter for hearing, to give notice as article 55A.254 requires, and after hearing to order the expunction of all records and files relating to the arrest and conviction described above.",
      "Petitioner asks for such other relief to which petitioner may be entitled."
    ]
  }
];

/**
 * The mistaken-identity route's verified application to the prosecuting
 * attorney under art. 55A.256.
 *
 * This is the participant's own request. It asks; it does not consent, and it
 * does not say the prosecutor has done anything.
 */
const VERIFIED_APPLICATION: PleadingTemplate = {
  templateId: "tx_exp_mistaken_identity-verified-application",
  version: VERSION,
  technicalFixture: true,
  fixtureBanner: BANNER,
  caption: {
    courtLine: "VERIFIED APPLICATION TO THE ATTORNEY REPRESENTING THE STATE",
    partyBlockLeft: [
      "To: The attorney representing the state,",
      "{{arrestCounty}} County, Texas",
      "",
      "Re: Arrest of the petitioner on {{arrestDate}}",
      "Case: {{caseNumberAndCourt}}"
    ],
    partyBlockRight: ["Article 55A.256", "", "VERIFIED APPLICATION"]
  },
  title: "VERIFIED APPLICATION FOR EXPUNCTION ON MISTAKEN IDENTITY (ART. 55A.256)",
  preamble:
    "This is the applicant's own request to the attorney representing the state. It is not a petition, it is not an order, and it does not record any decision by the prosecuting attorney. Whether to consent or to act is the state's decision alone.",
  sections: [
    {
      heading: "APPLICANT",
      numbered: false,
      paragraphs: [
        "The applicant completes each line by hand before sending. LegalEase does not hold or supply these values.",
        ...IDENTITY_BLOCK
      ]
    },
    {
      heading: "THE ARREST AND THE MISTAKE",
      numbered: true,
      paragraphs: [
        "Applicant was arrested on {{arrestDate}} in {{arrestCounty}} County, Texas, by {{arrestingAgency}}, for {{offenceCharged}}.",
        "The case number and court of the offence are {{caseNumberAndCourt}}, and the tracking incident number is {{trn}}.",
        "Applicant resides in {{residenceCounty}} County, Texas.",
        "Applicant states that the arrest records identify applicant as a result of mistaken identity or identity theft. The basis stated by the applicant is: {{mistakenIdentityBasis}}",
        "The arrest records carry fingerprints or other booking identifiers against which the identification can be tested.",
        "{{consentStatus}}"
      ]
    },
    {
      heading: "WHAT IS ASKED",
      numbered: true,
      paragraphs: [
        "Applicant asks the attorney representing the state to review the booking identifiers against the applicant's own, and to consider the expunction that art. 55A.256 provides for.",
        "Applicant makes no assertion about who committed the offence and asks the attorney representing the state to reach the attorney's own conclusion.",
        "If the attorney representing the state does not act, applicant may ask a court to determine the question. Nothing in this application obliges the attorney representing the state to do anything."
      ]
    }
  ],
  prayer: [],
  verification: verificationNote("application"),
  signatureLabel: "Applicant",
  signatureBlock: [
    "____________________________________",
    "Applicant",
    "",
    "Printed name: ______________________________",
    "Address: ___________________________________",
    "Telephone: _________________________________",
    "Email: _____________________________________",
    ...verificationBlocks("application", "Applicant")
  ]
};

/** One-time-use affidavit, art. 55A.053(c) and art. 55A.203. */
function oneTimeUseAffidavit(trackId: string): PleadingTemplate {
  return {
    templateId: `${trackId}-one-time-use-affidavit`,
    version: VERSION,
    technicalFixture: true,
    fixtureBanner: BANNER,
    caption: {
      courtLine: "IN THE DISTRICT COURT OF {{arrestCounty}} COUNTY, TEXAS",
      partyBlockLeft: ["EX PARTE", "", "PETITIONER."],
      partyBlockRight: ["Cause No. ______________", "", "AFFIDAVIT"]
    },
    title: "AFFIDAVIT AS TO PRIOR EXPUNCTION ON A DISMISSAL FOLLOWING PROGRAMME COMPLETION",
    preamble:
      "Filed with the petition where the dismissal followed completion of a programme. The affiant states the fact; the court decides what follows from it.",
    sections: [
      {
        heading: "AFFIANT",
        numbered: false,
        paragraphs: [
          "The affiant completes each line by hand before filing.",
          "Full name: ______________________________________________",
          "Date of birth: ___________________________________________"
        ]
      },
      {
        heading: "STATEMENT",
        numbered: true,
        paragraphs: [
          "I am the petitioner in this matter. The arrest concerned is the arrest of {{arrestDate}} in {{arrestCounty}} County, Texas, for {{offenceCharged}}.",
          "I have not previously obtained an expunction of records relating to an arrest that was dismissed following my completion of a programme.",
          "I make this statement of my own knowledge. I make no statement about the effect of any prior expunction I have not obtained."
        ]
      }
    ],
    prayer: [],
    verification: verificationNote("affidavit"),
    signatureLabel: "Affiant",
    signatureBlock: [
      "____________________________________",
      "Affiant",
      "",
      "Printed name: ______________________________",
      ...verificationBlocks("affidavit", "Affiant")
    ]
  };
}

/** Information package for the streamlined and innocence-pardon routes. */
function informationPackage(trackId: string, purpose: string): PleadingTemplate {
  return {
    templateId: `${trackId}-information-package`,
    version: VERSION,
    technicalFixture: true,
    fixtureBanner: BANNER,
    caption: {
      courtLine: "INFORMATION PACKAGE FOR THE COURT AND THE ATTORNEY REPRESENTING THE STATE",
      partyBlockLeft: [
        "Re: Arrest of the petitioner on {{arrestDate}}",
        "{{arrestCounty}} County, Texas",
        "Case: {{caseNumberAndCourt}}"
      ],
      partyBlockRight: ["Cause No. ______________", "", "INFORMATION PACKAGE"]
    },
    title: "INFORMATION PACKAGE ACCOMPANYING THE PETITION",
    preamble:
      "Supplied so the court and the attorney representing the state have the arrest identifiers and the record list in one place. It is not a pleading, it asserts no ground, and it asks for nothing.",
    sections: [
      {
        heading: "PURPOSE",
        numbered: false,
        paragraphs: [purpose]
      },
      {
        heading: "ARREST IDENTIFIERS",
        numbered: true,
        paragraphs: [
          "Date of arrest: {{arrestDate}}",
          "County of arrest: {{arrestCounty}} County, Texas",
          "Arresting agency: {{arrestingAgency}}",
          "Offence charged: {{offenceCharged}}",
          "Case number and court: {{caseNumberAndCourt}}",
          "Tracking incident number (TRN): {{trn}}"
        ]
      },
      AGENCY_SECTION,
      PRIVATE_ENTITY_SECTION
    ],
    prayer: [],
    signatureLabel: null,
    signatureBlock: [
      "Prepared from the petitioner's answers. No part of this package is a finding, a certification or a representation by any official.",
      "",
      "Petitioner's printed name: ______________________________"
    ]
  };
}

const ARTICLE_LINES: Readonly<Record<string, string>> = {
  tx_exp_dismissed:
    "The petition is brought under articles 55A.051 and 55A.053, Texas Code of Criminal Procedure.",
  tx_exp_limitations:
    "The petition is brought under articles 55A.051 and 55A.054, Texas Code of Criminal Procedure.",
  tx_exp_mistaken_identity:
    "The petition is brought under articles 55A.006 and 55A.256, Texas Code of Criminal Procedure.",
  tx_exp_no_charge:
    "The petition is brought under articles 55A.051 and 55A.052, Texas Code of Criminal Procedure.",
  tx_exp_pardon_innocence:
    "The petition is brought under articles 55A.003 and 55A.202, Texas Code of Criminal Procedure.",
  tx_exp_pardon_other:
    "The petition is brought under article 55A.004, Texas Code of Criminal Procedure.",
  tx_exp_specialty_court:
    "The petition is brought under article 55A.203, Texas Code of Criminal Procedure.",
  tx_exp_unlawful_carry:
    "The petition is brought under article 55A.005, Texas Code of Criminal Procedure."
};

function buildTemplates(): Record<string, PleadingTemplate> {
  const templates: Record<string, PleadingTemplate> = {};
  for (const spec of PETITIONS) templates[spec.templateId] = petitionTemplate(spec);
  for (const trackId of Object.keys(ARTICLE_LINES)) {
    const order = proposedOrderTemplate(trackId, ARTICLE_LINES[trackId]);
    templates[order.templateId] = order;
  }
  templates[VERIFIED_APPLICATION.templateId] = VERIFIED_APPLICATION;
  for (const trackId of ["tx_exp_dismissed", "tx_exp_specialty_court"]) {
    const affidavit = oneTimeUseAffidavit(trackId);
    templates[affidavit.templateId] = affidavit;
  }
  const innocence = informationPackage(
    "tx_exp_pardon_innocence",
    "Accompanies the petition under articles 55A.003 and 55A.202 so the arrest identifiers and the record list are available in one place alongside the instrument granting relief."
  );
  templates[innocence.templateId] = innocence;
  const specialty = informationPackage(
    "tx_exp_specialty_court",
    "Accompanies the petition under article 55A.203 so the court and the attorney representing the state have the arrest identifiers and the record list in one place."
  );
  templates[specialty.templateId] = specialty;
  return templates;
}

export const TEXAS_PLEADING_TEMPLATES: Readonly<Record<string, PleadingTemplate>> =
  buildTemplates();

// ---------------------------------------------------------------------------
// Relief tracks
// ---------------------------------------------------------------------------

const PENDING_APPROVAL = {
  visual: "not_reviewed",
  legal: "not_submitted"
} as const;

/**
 * Design role → engine role.
 *
 * The adopted legal design names component roles that `PacketComponentRole`
 * does not carry: `petition`, `one_time_use_affidavit`,
 * `verified_application_to_prosecutor` and `information_package`. Extending that
 * enum would be a change to `src/lib/rcap/packets/types.ts`, which this job does
 * not own, so the design roles are mapped onto the existing enum instead and the
 * mapping is stated here rather than left implicit.
 *
 * The **componentId is pinned exactly as the design assigns it** — that is what
 * carries assignment fidelity, and nothing here renames one.
 *
 *   petition                           → primary_filing
 *   proposed_order                     → proposed_order
 *   one_time_use_affidavit             → affidavit
 *   verified_application_to_prosecutor → notice   (a document the participant
 *                                        delivers to a third party alongside
 *                                        the petition, which is what `notice`
 *                                        exists for)
 *   information_package                → attachment
 */
export const TX_DESIGN_ROLE_TO_ENGINE_ROLE: Readonly<
  Record<string, PacketSet["components"][number]["role"]>
> = {
  petition: "primary_filing",
  proposed_order: "proposed_order",
  one_time_use_affidavit: "affidavit",
  verified_application_to_prosecutor: "notice",
  information_package: "attachment"
};

type ComponentSpec = {
  componentId: string;
  /** The role as the adopted legal design names it. Mapped on the way in. */
  designRole: keyof typeof TX_DESIGN_ROLE_TO_ENGINE_ROLE;
  templateId: string;
  order: number;
};

function packetSet(trackId: string, specs: readonly ComponentSpec[]): PacketSet {
  for (const spec of specs) {
    if (!TEXAS_PLEADING_TEMPLATES[spec.templateId]) {
      throw new Error(`${spec.componentId}: no Texas template ${spec.templateId} is registered.`);
    }
  }
  return {
    packetSetId: `${trackId}-set`,
    version: VERSION,
    components: specs.map((spec) => ({
      componentId: spec.componentId,
      role: TX_DESIGN_ROLE_TO_ENGINE_ROLE[spec.designRole],
      outputStrategy: "custom_pleading",
      rendererStrategy: "custom_pleading",
      templateId: spec.templateId,
      sourcePath: null,
      sourceSha256: null,
      geographicScope: "statewide",
      requirement: "required",
      order: spec.order,
      approval: PENDING_APPROVAL,
      version: VERSION
    }))
  };
}

/** Asked on every assigned Texas route. */
const COMMON_INPUTS: readonly RequiredInput[] = [
  { key: "arrestCounty", label: "County of arrest", required: true },
  { key: "arrestDate", label: "Date of arrest", required: true },
  { key: "arrestingAgency", label: "Arresting agency", required: true },
  { key: "offenceCharged", label: "Offence charged", required: true },
  { key: "caseNumberAndCourt", label: "Case number and court of the offence", required: true },
  {
    key: "felonyFromSameTransaction",
    label: "Was any felony charged from the same transaction?",
    required: true
  },
  {
    key: "communitySupervision",
    label: "Did you serve court-ordered community supervision for this offence?",
    required: true
  },
  {
    key: "probationViolationArrest",
    label: "Was the arrest for a probation or community-supervision violation?",
    required: true
  },
  {
    key: "abscondedAfterRelease",
    label: "After release, did you ever fail to appear or leave to avoid the case?",
    required: true
  },
  {
    key: "agencyList",
    label: "Every official, agency and entity you believe holds records of the arrest",
    required: true
  },
  {
    key: "privateEntities",
    label: "Private background-check companies you believe hold the record",
    required: false
  },
  { key: "trn", label: "Tracking incident number (TRN), if you have it", required: false },
  { key: "feeWaiverRequested", label: "Do you need to ask the court to waive the filing fee?", required: false }
];

function texasTrack(input: {
  trackId: string;
  publicName: string;
  mechanism: string;
  authority: string;
  recordTypes: readonly string[];
  dispositions: readonly string[];
  packetSet: PacketSet;
  extraInputs: readonly RequiredInput[];
  assembledPacketName: string;
  assembledPacketTitle: string;
  customerDeliverableDescription: string;
  notes: string;
}): ReliefTrack {
  const statuses = {
    research: "research_draft_complete",
    technical: "renderer_ready",
    visual: "not_reviewed",
    legal: "not_submitted"
  } as const;

  return {
    jurisdiction: "TX",
    trackId: input.trackId,
    publicName: input.publicName,
    mechanism: input.mechanism,
    authority: input.authority,
    recordTypes: input.recordTypes,
    dispositions: input.dispositions,
    courtLevel: "district_court",
    geographicScope: "statewide",
    geographyKeys: [],
    outputStrategy: "custom_pleading",
    packetSet: input.packetSet,
    requiredInputs: [...COMMON_INPUTS, ...input.extraInputs],
    statuses: {
      ...statuses,
      runtime: computeRuntimeStatus({
        statuses,
        sourceCurrent: true,
        runtimeDisabled: true,
        outputStrategy: "custom_pleading"
      })
    },
    sourceCurrent: true,
    technicalFixture: true,
    runtimeDisabled: true,
    assembledPacketName: input.assembledPacketName,
    assembledPacketTitle: input.assembledPacketTitle,
    customerDeliverableDescription: input.customerDeliverableDescription,
    notes: input.notes
  };
}

const DELIVERABLE_TAIL =
  "The clerk serves the petition and the notice of hearing; the participant does not. The judge signs the order. Texas publishes no statewide official expunction form and none is supplied here.";

export const TEXAS_CUSTOM_PLEADING_TRACKS: readonly ReliefTrack[] = [
  texasTrack({
    trackId: "tx_exp_dismissed",
    publicName: "Expunging an arrest where the charge was dismissed or quashed",
    mechanism: "expunction_dismissed_charge",
    authority: "Tex. Code Crim. Proc. arts. 55A.051, 55A.053",
    recordTypes: ["arrest", "charge"],
    dispositions: ["dismissed", "quashed"],
    packetSet: packetSet("tx_exp_dismissed", [
      { componentId: "tx_exp_dismissed-petition-1", designRole: "petition", templateId: "tx_exp_dismissed-petition", order: 1 },
      { componentId: "tx_exp_dismissed-proposed-order-2", designRole: "proposed_order", templateId: "tx_exp_dismissed-proposed-order", order: 2 },
      { componentId: "tx_exp_dismissed-one-time-use-affidavit-3", designRole: "one_time_use_affidavit", templateId: "tx_exp_dismissed-one-time-use-affidavit", order: 3 }
    ]),
    extraInputs: [
      { key: "dismissalReason", label: "The documented reason the charge was dismissed", required: true },
      { key: "deferredAdjudication", label: "Was the case resolved by deferred adjudication?", required: true },
      { key: "specialtyCourt", label: "Was a specialty court programme involved?", required: false },
      { key: "priorSpecialtyExpunction", label: "Have you had an expunction after a programme dismissal before?", required: true }
    ],
    assembledPacketName: "tx-expunction-dismissed",
    assembledPacketTitle: "Texas expunction packet — charge dismissed or quashed",
    customerDeliverableDescription:
      `Ex parte petition, proposed Order of Expunction and one-time-use affidavit under arts. 55A.051 and 55A.053. ${DELIVERABLE_TAIL}`,
    notes:
      "The engine must not treat 'dismissed' as sufficient: art. 55A.053(a)(2) names five grounds and the route hard-stops on anything else."
  }),
  texasTrack({
    trackId: "tx_exp_limitations",
    publicName: "Expunging an arrest where the time limit to charge you has run out",
    mechanism: "expunction_limitations_expired",
    authority: "Tex. Code Crim. Proc. arts. 55A.051, 55A.054",
    recordTypes: ["arrest", "charge"],
    dispositions: ["no_charge", "dismissed"],
    packetSet: packetSet("tx_exp_limitations", [
      { componentId: "tx_exp_limitations-petition-1", designRole: "petition", templateId: "tx_exp_limitations-petition", order: 1 },
      { componentId: "tx_exp_limitations-proposed-order-2", designRole: "proposed_order", templateId: "tx_exp_limitations-proposed-order", order: 2 }
    ]),
    extraInputs: [
      { key: "limitationsSource", label: "How you know the limitations period has expired", required: true },
      { key: "offenceDate", label: "Date the offence was alleged to have been committed", required: true }
    ],
    assembledPacketName: "tx-expunction-limitations",
    assembledPacketTitle: "Texas expunction packet — limitations period expired",
    customerDeliverableDescription:
      `Ex parte petition and proposed Order of Expunction under arts. 55A.051 and 55A.054. ${DELIVERABLE_TAIL}`,
    notes: "A contested limitations analysis is an attorney handoff, not a template paragraph."
  }),
  texasTrack({
    trackId: "tx_exp_mistaken_identity",
    publicName: "Expunging an arrest that was not yours",
    mechanism: "expunction_mistaken_identity",
    authority: "Tex. Code Crim. Proc. arts. 55A.006, 55A.256",
    recordTypes: ["arrest", "charge"],
    dispositions: ["mistaken_identity", "identity_theft"],
    packetSet: packetSet("tx_exp_mistaken_identity", [
      { componentId: "tx_exp_mistaken_identity-petition-1", designRole: "petition", templateId: "tx_exp_mistaken_identity-petition", order: 1 },
      { componentId: "tx_exp_mistaken_identity-proposed-order-2", designRole: "proposed_order", templateId: "tx_exp_mistaken_identity-proposed-order", order: 2 },
      { componentId: "tx_exp_mistaken_identity-verified-application-to-prosecutor-3", designRole: "verified_application_to_prosecutor", templateId: "tx_exp_mistaken_identity-verified-application", order: 3 }
    ]),
    extraInputs: [
      { key: "residenceCounty", label: "County where you live", required: true },
      { key: "mistakenIdentityBasis", label: "Why the record is not yours, in your own words", required: true },
      { key: "consentGiven", label: "Has the prosecutor told you they consent?", required: true },
      { key: "fingerprintsBooked", label: "Does the arrest record have fingerprints or booking identifiers?", required: true }
    ],
    assembledPacketName: "tx-expunction-mistaken-identity",
    assembledPacketTitle: "Texas expunction packet — mistaken identity or identity theft",
    customerDeliverableDescription:
      `Ex parte petition, proposed Order of Expunction and the participant's own verified application to the attorney representing the state under art. 55A.256. LegalEase does not obtain the prosecutor's consent and no document here records one. ${DELIVERABLE_TAIL}`,
    notes:
      "The verified application is the participant's request. It never states that the prosecuting attorney has consented, agreed or acted."
  }),
  texasTrack({
    trackId: "tx_exp_no_charge",
    publicName: "Expunging an arrest where no charge was ever filed",
    mechanism: "expunction_no_charge_filed",
    authority: "Tex. Code Crim. Proc. arts. 55A.051, 55A.052",
    recordTypes: ["arrest"],
    dispositions: ["no_charge"],
    packetSet: packetSet("tx_exp_no_charge", [
      { componentId: "tx_exp_no_charge-petition-1", designRole: "petition", templateId: "tx_exp_no_charge-petition", order: 1 },
      { componentId: "tx_exp_no_charge-proposed-order-2", designRole: "proposed_order", templateId: "tx_exp_no_charge-proposed-order", order: 2 }
    ]),
    extraInputs: [],
    assembledPacketName: "tx-expunction-no-charge",
    assembledPacketTitle: "Texas expunction packet — no charge filed",
    customerDeliverableDescription:
      `Ex parte petition and proposed Order of Expunction under arts. 55A.051 and 55A.052. ${DELIVERABLE_TAIL}`,
    notes: "The waiting analysis under art. 55A.153 is not asserted by the packet; the court decides it."
  }),
  texasTrack({
    trackId: "tx_exp_pardon_innocence",
    publicName: "Expunging a conviction after a pardon for actual innocence",
    mechanism: "expunction_pardon_actual_innocence",
    authority: "Tex. Code Crim. Proc. arts. 55A.003, 55A.202",
    recordTypes: ["arrest", "conviction"],
    dispositions: ["pardoned_actual_innocence"],
    packetSet: packetSet("tx_exp_pardon_innocence", [
      { componentId: "tx_exp_pardon_innocence-petition-1", designRole: "petition", templateId: "tx_exp_pardon_innocence-petition", order: 1 },
      { componentId: "tx_exp_pardon_innocence-proposed-order-2", designRole: "proposed_order", templateId: "tx_exp_pardon_innocence-proposed-order", order: 2 },
      { componentId: "tx_exp_pardon_innocence-information-package-3", designRole: "information_package", templateId: "tx_exp_pardon_innocence-information-package", order: 3 }
    ]),
    extraInputs: [
      { key: "pardonOnFace", label: "Does the pardon say on its face that it is for actual innocence?", required: true },
      { key: "inTdcjCustody", label: "Are you currently in TDCJ custody?", required: true },
      { key: "pardonDate", label: "Date the pardon or other relief was granted", required: true }
    ],
    assembledPacketName: "tx-expunction-pardon-innocence",
    assembledPacketTitle: "Texas expunction packet — pardon or relief on actual innocence",
    customerDeliverableDescription:
      `Ex parte petition, proposed Order of Expunction and an information package under arts. 55A.003 and 55A.202. ${DELIVERABLE_TAIL}`,
    notes: "Where the grant does not say actual innocence on its face, the route stops rather than characterising it."
  }),
  texasTrack({
    trackId: "tx_exp_pardon_other",
    publicName: "Expunging a conviction after a pardon granted for another reason",
    mechanism: "expunction_pardon_other",
    authority: "Tex. Code Crim. Proc. art. 55A.004",
    recordTypes: ["arrest", "conviction"],
    dispositions: ["pardoned_other"],
    packetSet: packetSet("tx_exp_pardon_other", [
      { componentId: "tx_exp_pardon_other-petition-1", designRole: "petition", templateId: "tx_exp_pardon_other-petition", order: 1 },
      { componentId: "tx_exp_pardon_other-proposed-order-2", designRole: "proposed_order", templateId: "tx_exp_pardon_other-proposed-order", order: 2 }
    ]),
    extraInputs: [
      { key: "pardonType", label: "What kind of pardon were you granted?", required: true },
      { key: "pardonDate", label: "Date the pardon was granted", required: true }
    ],
    assembledPacketName: "tx-expunction-pardon-other",
    assembledPacketTitle: "Texas expunction packet — pardon granted for another reason",
    customerDeliverableDescription:
      `Ex parte petition and proposed Order of Expunction under art. 55A.004. ${DELIVERABLE_TAIL}`,
    notes: "The packet does not characterise the pardon's effect beyond what the instrument states."
  }),
  texasTrack({
    trackId: "tx_exp_specialty_court",
    publicName: "Expunging an arrest after finishing a specialty court programme",
    mechanism: "expunction_specialty_court_dismissal",
    authority: "Tex. Code Crim. Proc. art. 55A.203",
    recordTypes: ["arrest", "charge"],
    dispositions: ["dismissed_after_programme"],
    packetSet: packetSet("tx_exp_specialty_court", [
      { componentId: "tx_exp_specialty_court-petition-1", designRole: "petition", templateId: "tx_exp_specialty_court-petition", order: 1 },
      { componentId: "tx_exp_specialty_court-proposed-order-2", designRole: "proposed_order", templateId: "tx_exp_specialty_court-proposed-order", order: 2 },
      { componentId: "tx_exp_specialty_court-information-package-3", designRole: "information_package", templateId: "tx_exp_specialty_court-information-package", order: 3 },
      { componentId: "tx_exp_specialty_court-one-time-use-affidavit-4", designRole: "one_time_use_affidavit", templateId: "tx_exp_specialty_court-one-time-use-affidavit", order: 4 }
    ]),
    extraInputs: [
      { key: "specialtyProgramType", label: "Which specialty court programme did you complete?", required: true },
      { key: "dismissalDate", label: "Date the charge was dismissed", required: true },
      { key: "priorSpecialtyExpunction", label: "Have you had an expunction after a programme dismissal before?", required: true },
      { key: "prosecutorConsentSought", label: "Have you asked the prosecutor to consider consenting?", required: true }
    ],
    assembledPacketName: "tx-expunction-specialty-court",
    assembledPacketTitle: "Texas expunction packet — specialty court dismissal",
    customerDeliverableDescription:
      `Ex parte petition, proposed Order of Expunction, information package and one-time-use affidavit under art. 55A.203. Consent is the state's decision; LegalEase neither obtains nor asserts it. ${DELIVERABLE_TAIL}`,
    notes: "Article 55A.203(d) limits the relief where a prior programme expunction was obtained; the route stops there."
  }),
  texasTrack({
    trackId: "tx_exp_unlawful_carry",
    publicName: "Expunging a pre-2021 conviction for carrying a handgun",
    mechanism: "expunction_pre_2021_unlawful_carry",
    authority: "Tex. Code Crim. Proc. art. 55A.005",
    recordTypes: ["arrest", "conviction"],
    dispositions: ["convicted"],
    packetSet: packetSet("tx_exp_unlawful_carry", [
      { componentId: "tx_exp_unlawful_carry-petition-1", designRole: "petition", templateId: "tx_exp_unlawful_carry-petition", order: 1 },
      { componentId: "tx_exp_unlawful_carry-proposed-order-2", designRole: "proposed_order", templateId: "tx_exp_unlawful_carry-proposed-order", order: 2 }
    ]),
    extraInputs: [
      { key: "offenceDatePre2021", label: "Was the offence committed before 1 September 2021?", required: true },
      { key: "penalCodeSubsection", label: "Which Penal Code subsection were you convicted under?", required: true }
    ],
    assembledPacketName: "tx-expunction-unlawful-carry",
    assembledPacketTitle: "Texas expunction packet — pre-2021 unlawful carrying of a handgun",
    customerDeliverableDescription:
      `Ex parte petition and proposed Order of Expunction under art. 55A.005. ${DELIVERABLE_TAIL}`,
    notes: "An offence on or after 1 September 2021 is outside the article and the route stops."
  })
];
