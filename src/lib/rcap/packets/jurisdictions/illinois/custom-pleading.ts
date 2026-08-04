// Illinois custom-pleading templates — implementation Tranche 4.
//
// Two assigned routes, both authority-cleared, both `custom_pleading` with a
// local-form override because no statewide form covers either mechanism. The
// Illinois statewide adult expungement and sealing suite governs other Illinois
// tracks and expressly not these two, and the cannabis form suite belongs only
// to the cannabis conviction motion. Neither suite is mapped here.
//
// The two routes have different delivery models, and the difference is the most
// important thing in this file.
//
//   il-immediate-seal        Attorney-mediated end to end. 20 ILCS
//                            2630/5.2(g)(5)(A) frames the petition as filed by
//                            the defendant's attorney on the defendant's
//                            behalf, on the same day and during the same
//                            hearing in which the case is disposed. LegalEase
//                            cannot appear and cannot file during a hearing.
//                            The packet is prepared for counsel to file. It
//                            never tells the participant they may self-file it
//                            after leaving court, and the instruction sheet
//                            says so in terms.
//
//   il-prostitution-j-vacate The movant signs their own motion, with a pro se
//                            designation where unrepresented. Attorney review
//                            is recommended by default because the motion is a
//                            conviction vacatur on discretionary factors that
//                            touches survivor circumstances — but the packet is
//                            the participant's to file.
//
// Citation discipline on il-prostitution-j-vacate is a counsel instruction, not
// a style preference: cite only 20 ILCS 2630/5.2(j)(3), the expungement
// mechanics at (d)(9)(A) and the effect provision at (j)(8). The motion cites
// those three and nothing else. Section 5.2(a)(3)(C)(i) is pinned as track
// authority in tranche-4-authority-pins.json and deliberately not cited in the
// pleading.
//
// What these templates never do:
//
//   - assert that the conviction was a Class 4 felony prostitution offence.
//     The motion pleads what the participant says their record states, and the
//     route fails closed where the record does not clearly show it;
//   - characterise the circumstances of the offence, or ask about them. No
//     graphic questioning is permitted anywhere on this route;
//   - compose the adverse-consequences showing. That narrative is the
//     participant's own words, reproduced without change;
//   - predict success. The standard is discretionary and the motion asks the
//     court to exercise its discretion without suggesting an outcome;
//   - carry verification language on the prostitution motion. The subsection
//     requires none and adding it would invent a requirement;
//   - prefill a judge, clerk, State's Attorney, agency, notary or attorney
//     block. Every one of them is blank, including counsel's block on the
//     immediate-sealing petition, which counsel completes if counsel decides to
//     file it.
//
// The legacy Illinois generator and the Illinois official-form, PRB, automatic
// and cannabis routes are untouched by this module.
//
// Every template is DRAFT PENDING LEGAL REVIEW until reviewing counsel adopts
// it. The banner says so on the face of every rendering.

import type { PleadingTemplate } from "@/lib/rcap/packets/engines/pleading-templates";

const VERSION = "1.0.0";

const BANNER =
  "DRAFT PENDING LEGAL REVIEW — PREPARED BY LEGALEASE — NOT LEGAL ADVICE — DO NOT FILE UNTIL REVIEWED";

/** The statewide referral destination for every stop condition on both routes. */
export const IL_REFERRAL =
  "Office of the State Appellate Defender, Expungement Unit, 866-787-1776.";

// ---------------------------------------------------------------------------
// Typed stops
// ---------------------------------------------------------------------------

/**
 * Raised when a participant answer puts the route outside its subsection, or
 * outside what LegalEase may prepare without individualized advocacy.
 *
 * Typed and carrying its own referral, so a caller cannot mistake a deliberate
 * stop for a missing answer and cannot lose the destination the design requires
 * the participant to be sent to.
 */
export class IllinoisEligibilityStopError extends Error {
  constructor(
    readonly trackId: string,
    readonly stopId: string,
    readonly reason: string,
    readonly referral: string = IL_REFERRAL
  ) {
    super(reason);
    this.name = "IllinoisEligibilityStopError";
  }
}

/** Raised when a participant answer is outside the approved closed list. */
export class IllinoisBranchError extends Error {
  constructor(
    readonly trackId: string,
    readonly key: string,
    readonly value: string
  ) {
    super(`${trackId}: "${value}" is not an approved value for ${key}.`);
    this.name = "IllinoisBranchError";
  }
}

// ---------------------------------------------------------------------------
// Closed lists
// ---------------------------------------------------------------------------

/** § 5.2(g) reaches an acquittal or a dismissal with prejudice, and nothing else. */
export const IL_IMMEDIATE_SEAL_DISPOSITIONS: Readonly<Record<string, string>> = {
  acquitted: "Defendant was found not guilty of every charge in this case",
  dismissed_with_prejudice: "every charge in this case was dismissed with prejudice"
};

/** Answers that are recorded but do not by themselves qualify the route. */
export const IL_YES_NO: Readonly<Record<string, boolean>> = {
  yes: true,
  no: false
};

/** The record answer the prostitution motion is pleaded from. */
export const IL_CLASS_4_RECORD_ANSWERS: Readonly<Record<string, string>> = {
  record_states_class_4:
    "The record of conviction states that the offence was a Class 4 felony prostitution offence",
  record_does_not_say: "record_does_not_say",
  unsure: "unsure"
};

/**
 * Trafficking screening, asked before any other prostitution-route questioning.
 *
 * A participant who indicates their involvement resulted from trafficking is
 * routed to the § 5.2(h) mechanism, which the design records as the stronger
 * route and which changes the questioning entirely. This stop exists to move
 * someone to better relief, so it is never weakened into a warning.
 */
export const IL_TRAFFICKING_ANSWERS: Readonly<Record<string, string>> = {
  wants_trafficking_information: "wants_trafficking_information",
  no_trafficking_information_requested: "no_trafficking_information_requested"
};

function branch<T>(
  trackId: string,
  key: string,
  table: Readonly<Record<string, T>>,
  raw: unknown
): { value: string; resolved: T } {
  const value = typeof raw === "string" ? raw.trim() : "";
  if (!Object.prototype.hasOwnProperty.call(table, value)) {
    throw new IllinoisBranchError(trackId, key, value);
  }
  return { value, resolved: table[value] };
}

function stop(trackId: string, stopId: string, reason: string): never {
  throw new IllinoisEligibilityStopError(trackId, stopId, reason);
}

// ---------------------------------------------------------------------------
// Fact derivation
// ---------------------------------------------------------------------------

/**
 * Derives caption forms and approved allegation sentences, and enforces every
 * eligibility stop before a document can be produced.
 *
 * Fails closed. An answer outside a closed list throws `IllinoisBranchError`;
 * an answer that puts the participant outside the subsection, or into
 * individualized advocacy, throws `IllinoisEligibilityStopError` with the
 * referral attached.
 */
export function deriveIllinoisFacts(
  trackId: string,
  facts: Record<string, unknown>
): Record<string, unknown> {
  const upper = (value: unknown) => String(value ?? "").trim().toUpperCase();
  const derived: Record<string, unknown> = {
    ...facts,
    courtNameUpper: upper(facts.courtName),
    countyNameUpper: upper(facts.countyName)
  };

  if (trackId === "il-immediate-seal") {
    // The window exists only at a disposition hearing that has not happened yet.
    const upcoming = branch(trackId, "hasUpcomingDisposition", IL_YES_NO, facts.hasUpcomingDisposition);
    if (!upcoming.resolved) {
      stop(
        trackId,
        "no_upcoming_disposition",
        "Immediate sealing under 20 ILCS 2630/5.2(g) is filed during the hearing at which the case is disposed. Where there is no upcoming disposition hearing, this route does not apply. Ordinary sealing under § 5.2(c)(3)(A) remains available at any time."
      );
    }

    // § 5.2(g)(5)(A) frames the petition as filed by the defendant's attorney.
    const represented = branch(trackId, "isRepresented", IL_YES_NO, facts.isRepresented);
    if (!represented.resolved) {
      stop(
        trackId,
        "unrepresented",
        "This route is attorney-mediated end to end: the petition is filed by counsel during the disposition hearing, and LegalEase can neither appear nor file. A participant with no lawyer or public defender on the case cannot be handed a packet that only counsel can file."
      );
    }

    const era = branch(trackId, "offenseDateOnOrAfter2018", IL_YES_NO, facts.offenseDateOnOrAfter2018);
    if (!era.resolved) {
      stop(
        trackId,
        "offense_before_2018",
        "20 ILCS 2630/5.2(g) reaches arrests and charges occurring on or after 1 January 2018. Records of offences occurring before that date are outside the subsection."
      );
    }

    const minorTraffic = branch(trackId, "isMinorTrafficOffense", IL_YES_NO, facts.isMinorTrafficOffense);
    if (minorTraffic.resolved) {
      stop(
        trackId,
        "minor_traffic_offense",
        "Minor traffic offences are excluded under 20 ILCS 2630/5.2(a)(3)(B)."
      );
    }

    const disposition = branch(
      trackId,
      "dispositionType",
      IL_IMMEDIATE_SEAL_DISPOSITIONS,
      facts.dispositionType
    );
    derived.dispositionAllegation = disposition.resolved;

    // A dismissal without prejudice is not within the subsection, and the
    // question is only meaningful where the case is being dismissed.
    if (disposition.value === "dismissed_with_prejudice") {
      const withPrejudice = branch(
        trackId,
        "dismissalWithPrejudice",
        IL_YES_NO,
        facts.dismissalWithPrejudice
      );
      if (!withPrejudice.resolved) {
        stop(
          trackId,
          "dismissal_without_prejudice",
          "A dismissal without prejudice is not within 20 ILCS 2630/5.2(g). Ordinary sealing under § 5.2(c)(3)(A) remains available at any time."
        );
      }
    }
  }

  if (trackId === "il-prostitution-j-vacate") {
    // Trafficking screening runs first, before any other questioning on this
    // route, because a positive answer changes both the route and the
    // questions.
    const trafficking = branch(
      trackId,
      "traffickingInformationRequested",
      IL_TRAFFICKING_ANSWERS,
      facts.traffickingInformationRequested
    );
    if (trafficking.value === "wants_trafficking_information") {
      stop(
        trackId,
        "trafficking_route_is_stronger",
        "Relief designed for people whose involvement resulted from trafficking is available under 20 ILCS 2630/5.2(h), which the adopted design records as the stronger route. The questioning for that route is different and this motion is not prepared."
      );
    }

    const record = branch(
      trackId,
      "class4RecordAnswer",
      IL_CLASS_4_RECORD_ANSWERS,
      facts.class4RecordAnswer
    );
    if (record.value !== "record_states_class_4") {
      stop(
        trackId,
        "record_does_not_show_class_4_felony_prostitution",
        "20 ILCS 2630/5.2(j)(3) reaches a prior Class 4 felony prostitution conviction. Where the record does not clearly show one, LegalEase will not assert that it does."
      );
    }
    derived.class4Allegation = record.resolved;

    const sentence = branch(trackId, "sentenceComplete", IL_YES_NO, facts.sentenceComplete);
    if (!sentence.resolved) {
      stop(
        trackId,
        "sentence_or_conditions_incomplete",
        "The motion is available after completion of any sentence or condition imposed by the conviction. Sentences or conditions that remain incomplete are outside the subsection."
      );
    }
  }

  return derived;
}

// ---------------------------------------------------------------------------
// Shared caption and blocks
// ---------------------------------------------------------------------------

/**
 * The court line is copied by the participant from their own case papers.
 *
 * Illinois captions differ between Cook County and the numbered judicial
 * circuits, and deriving one from a county name would produce a wrong caption
 * for one of them. Deferring to the record is both safer and less work for the
 * participant.
 */
const COURT_LINE = "IN THE {{courtNameUpper}}";

function caption(documentTitle: string) {
  return {
    courtLine: COURT_LINE,
    partyBlockLeft: [
      "PEOPLE OF THE STATE OF ILLINOIS,",
      "",
      "v.",
      "",
      "{{petitionerName}},",
      "",
      "Defendant."
    ],
    partyBlockRight: ["Case No. {{caseNumber}}", "", documentTitle]
  };
}

/** The court signs. Kept to three lines so a page break cannot split it. */
const ORDER_SIGNATURE_BLOCK: readonly string[] = [
  "_____________________________________",
  "JUDGE",
  "Date: ______________________"
];

const PARTICIPANT_STATEMENT_PREFIX = "Movant states, in Movant's own words:";

const PARTICIPANT_STATEMENT_ATTRIBUTION =
  "The paragraph above is Movant's own statement. It was written by Movant and is reproduced without change. LegalEase did not compose it and does not characterise it.";

export const ILLINOIS_PLEADING_TEMPLATES: Readonly<Record<string, PleadingTemplate>> = {
  // =========================================================================
  // il-immediate-seal — 20 ILCS 2630/5.2(g)
  // =========================================================================
  "il-immediate-seal-petition": {
    templateId: "il-immediate-seal-petition",
    version: VERSION,
    technicalFixture: true,
    fixtureBanner: BANNER,
    caption: caption("PETITION FOR IMMEDIATE SEALING"),
    title: "PETITION FOR IMMEDIATE SEALING",
    preamble:
      "Defendant, by counsel, petitions this Court under 20 ILCS 2630/5.2(g) to seal the records of this case immediately, and states:",
    sections: [
      {
        heading: "I.  DEFENDANT AND CASE",
        numbered: true,
        paragraphs: [
          "Defendant is {{petitionerName}}, date of birth {{dateOfBirth}}, who resides at {{mailingAddress}}.",
          "This petition concerns case number {{caseNumber}} in the {{courtName}}.",
          "The charge at issue is {{offenseDescription}}. The arrest or charge occurred on {{arrestOrChargeDate}}."
        ]
      },
      {
        heading: "II.  STATUTORY BASIS",
        numbered: true,
        paragraphs: [
          "20 ILCS 2630/5.2(g) permits records of an arrest, or of a charge not initiated by arrest, that result in acquittal or dismissal with prejudice to be sealed immediately.",
          "This case is disposed today: {{dispositionAllegation}}.",
          "The arrest or charge occurred on or after 1 January 2018.",
          "The offence is not a minor traffic offence within 20 ILCS 2630/5.2(a)(3)(B).",
          "This petition is filed with the circuit clerk on the same day and during the same hearing in which this case is disposed, as 20 ILCS 2630/5.2(g) requires."
        ]
      },
      {
        heading: "III.  SERVICE",
        numbered: true,
        paragraphs: [
          "A copy of this petition is served on the State's Attorney in open court, and on no other person."
        ]
      }
    ],
    prayer: [
      "WHEREFORE, Defendant asks the Court to enter an order sealing the records of case number {{caseNumber}} immediately, and to enter the proposed order submitted with this petition during this hearing."
    ],
    verification:
      "I, {{petitionerName}}, verify that the statements set out in this petition are true and correct to the best of my knowledge and belief.",
    signatureLabel: "Signature of Defendant (verification)",
    signatureBlock: [
      "{{petitionerName}}, Defendant",
      "{{mailingAddress}}",
      "Date: ______________________",
      "",
      "",
      "Presented and filed by counsel for Defendant. 20 ILCS 2630/5.2(g)(5)(A).",
      "Counsel completes and signs the block below. LegalEase leaves it blank.",
      "",
      "_____________________________________",
      "Attorney for Defendant",
      "Name: ________________________________",
      "Address: _____________________________",
      "ARDC No.: ____________________________",
      "Date: ________________________________"
    ]
  },

  "il-immediate-seal-proposed-order": {
    templateId: "il-immediate-seal-proposed-order",
    version: VERSION,
    technicalFixture: true,
    fixtureBanner: BANNER,
    caption: caption("ORDER FOR IMMEDIATE SEALING"),
    title: "ORDER FOR IMMEDIATE SEALING",
    preamble:
      "This proposed order is submitted for the Court's consideration. Every finding, signature and date below is left blank for the Court.",
    sections: [
      {
        numbered: false,
        paragraphs: [
          "This matter came before the Court on the petition of {{petitionerName}} under 20 ILCS 2630/5.2(g) for immediate sealing of the records of case number {{caseNumber}}, presented during the hearing at which this case was disposed, the State's Attorney having been served in open court.",
          "The Court finds:",
          "(   ) that the petition should be GRANTED.",
          "(   ) that the petition should be DENIED.",
          ""
        ]
      },
      {
        heading: "IT IS HEREBY ORDERED",
        numbered: true,
        paragraphs: [
          "The records of case number {{caseNumber}}, arising from the arrest or charge of {{petitionerName}} on {{arrestOrChargeDate}}, are sealed as provided in 20 ILCS 2630/5.2(g).",
          "The Clerk of the Court shall seal the court file in this case and shall transmit a copy of this Order to the Illinois State Police and to the arresting law enforcement agency, which shall seal their records of this arrest or charge.",
          "Access to the sealed records shall be limited to the persons and purposes that 20 ILCS 2630/5.2 permits, and to no other person or purpose."
        ]
      }
    ],
    prayer: [],
    signatureLabel: null,
    signatureBlock: ORDER_SIGNATURE_BLOCK
  },

  "il-immediate-seal-instructions": {
    templateId: "il-immediate-seal-instructions",
    version: VERSION,
    technicalFixture: true,
    fixtureBanner: BANNER,
    // Deliberately NOT the pleading caption. The renderer always draws a
    // caption, and a page headed "PEOPLE OF THE STATE OF ILLINOIS v.
    // Defendant" over a case number reads as a filing however it is titled —
    // which is exactly the mistake this page exists to prevent, since it sits
    // in the same packet as two documents that are filings. The heading block
    // instead says what the page is and who it is for.
    caption: {
      courtLine: "FILING INSTRUCTIONS — NOT A COURT FILING",
      partyBlockLeft: [
        "Prepared for {{petitionerName}}",
        "",
        "About the packet in case number {{caseNumber}},",
        "{{courtName}}"
      ],
      partyBlockRight: [
        "Give this packet to your",
        "lawyer or public defender.",
        "",
        "Do not hand this page",
        "to the clerk."
      ]
    },
    title: "FILING INSTRUCTIONS — NOT A COURT FILING",
    preamble:
      "This page is not a court filing. Do not hand it to the clerk. It explains what the two pages in front of it are and who files them.",
    sections: [
      {
        heading: "WHO FILES THIS PETITION",
        numbered: true,
        paragraphs: [
          "Your lawyer or public defender files it. 20 ILCS 2630/5.2(g)(5)(A) frames this petition as filed by your attorney on your behalf.",
          "Give this packet to your lawyer or public defender before your hearing, and ask them to file it during the hearing if your case is dismissed with prejudice or you are found not guilty.",
          "You cannot file this petition yourself after you leave court. The petition must be filed with the circuit clerk on the same day and during the same hearing in which your case is disposed, and the judge who is hearing your case rules on it during that same hearing.",
          "LegalEase cannot appear in the courtroom and cannot file anything during a hearing. LegalEase prepared these pages and nothing more."
        ]
      },
      {
        heading: "WHAT HAPPENS AT THE HEARING",
        numbered: true,
        paragraphs: [
          "Your attorney files the petition with the circuit clerk during the hearing and serves a copy on the State's Attorney in open court. No one else is served.",
          "The judge presiding at your hearing rules on the petition during that hearing.",
          "You sign the verification on the petition. Your attorney completes and signs the attorney block. LegalEase leaves both the attorney block and every court and State's Attorney field blank."
        ]
      },
      {
        heading: "IF THE PETITION IS NOT FILED THAT DAY",
        numbered: true,
        paragraphs: [
          "Missing this window costs you nothing permanent. Ordinary sealing under 20 ILCS 2630/5.2(c)(3)(A) remains available at any time, and it reaches the same records.",
          "If your attorney does not file the petition during the hearing, or the judge denies it, ask about the ordinary sealing route instead."
        ]
      },
      {
        heading: "FEES",
        numbered: true,
        paragraphs: [
          "The source review for this route states no fee. Where a county charges one, a Supreme Court Rule 298 Application for Waiver of Court Fees is the route to ask for it to be waived. Confirm with the clerk rather than relying on this page."
        ]
      },
      {
        heading: "IF YOU NEED HELP",
        numbered: false,
        paragraphs: [
          `If you have no lawyer, if your hearing has already happened, or if anything on this page does not match your case, contact the ${IL_REFERRAL}`
        ]
      }
    ],
    prayer: [],
    signatureLabel: null,
    signatureBlock: []
  },

  // =========================================================================
  // il-prostitution-j-vacate — 20 ILCS 2630/5.2(j)(3)
  // =========================================================================
  "il-prostitution-j-vacate-motion": {
    templateId: "il-prostitution-j-vacate-motion",
    version: VERSION,
    technicalFixture: true,
    fixtureBanner: BANNER,
    caption: caption("MOTION TO VACATE AND EXPUNGE"),
    title: "MOTION TO VACATE AND EXPUNGE A CONVICTION FOR CLASS 4 FELONY PROSTITUTION",
    preamble:
      "Movant moves this Court under 20 ILCS 2630/5.2(j)(3) to vacate and expunge a prior conviction, and states:",
    sections: [
      {
        heading: "I.  MOVANT AND CASE",
        numbered: true,
        paragraphs: [
          "Movant is {{petitionerName}}, date of birth {{dateOfBirth}}, who resides at {{mailingAddress}}.",
          "This motion concerns case number {{caseNumber}} in the {{courtName}}.",
          "Movant was convicted in this case on {{convictionDate}}.",
          "{{class4Allegation}}."
        ]
      },
      {
        heading: "II.  STATUTORY BASIS",
        numbered: true,
        paragraphs: [
          "20 ILCS 2630/5.2(j)(3) permits any individual to move to vacate and expunge a prior Class 4 felony prostitution conviction, after completion of any sentence or condition imposed by that conviction.",
          "Movant completed the sentence and every condition imposed by this conviction on {{sentenceCompletionDate}}.",
          "Where the Court grants the motion, the records are expunged as 20 ILCS 2630/5.2(d)(9)(A) provides.",
          "20 ILCS 2630/5.2(j)(8) provides the effect of an order entered under this subsection."
        ]
      },
      {
        heading: "III.  MOVANT'S STATEMENT",
        numbered: false,
        paragraphs: [
          PARTICIPANT_STATEMENT_PREFIX,
          "{{adverseConsequences}}",
          PARTICIPANT_STATEMENT_ATTRIBUTION
        ]
      },
      {
        heading: "IV.  NOTICE TO THE STATE'S ATTORNEY",
        numbered: true,
        paragraphs: [
          "The State's Attorney receives notice of this motion and has 60 days from that notice to object, with supporting evidence.",
          "No statewide form governs this motion. The filing method, and whether the clerk or the movant serves the State's Attorney, are confirmed with the circuit clerk before filing."
        ]
      }
    ],
    prayer: [
      "WHEREFORE, Movant asks the Court to vacate and expunge the conviction in case number {{caseNumber}}, and to enter the proposed order submitted with this motion.",
      "The decision on this motion rests in the Court's discretion. Movant makes no representation as to how the Court should exercise it."
    ],
    // No verification. 20 ILCS 2630/5.2(j)(3) requires none, and adding one
    // would invent a requirement the subsection does not impose.
    signatureLabel: "Signature",
    signatureBlock: [
      "{{petitionerName}}, Movant, pro se",
      "{{mailingAddress}}",
      "{{contactPhone}}",
      "{{contactEmail}}",
      "Date: ______________________"
    ]
  },

  "il-prostitution-j-vacate-proposed-order": {
    templateId: "il-prostitution-j-vacate-proposed-order",
    version: VERSION,
    technicalFixture: true,
    fixtureBanner: BANNER,
    caption: caption("ORDER VACATING AND EXPUNGING CONVICTION"),
    title: "ORDER VACATING AND EXPUNGING CONVICTION",
    preamble:
      "This proposed order is submitted for the Court's consideration. Every finding, signature and date below is left blank for the Court.",
    sections: [
      {
        numbered: false,
        paragraphs: [
          "This matter came before the Court on the motion of {{petitionerName}} under 20 ILCS 2630/5.2(j)(3) to vacate and expunge the conviction in case number {{caseNumber}}, the State's Attorney having received notice.",
          "The Court finds:",
          "(   ) that the motion should be GRANTED.",
          "(   ) that the motion should be DENIED.",
          ""
        ]
      },
      {
        heading: "IT IS HEREBY ORDERED",
        numbered: true,
        paragraphs: [
          "The conviction of {{petitionerName}} in case number {{caseNumber}}, entered on {{convictionDate}}, is vacated.",
          "The records of that conviction are expunged as 20 ILCS 2630/5.2(d)(9)(A) provides.",
          "The Clerk of the Court shall transmit a copy of this Order to the Illinois State Police and to the arresting law enforcement agency.",
          "This Order has the effect provided by 20 ILCS 2630/5.2(j)(8)."
        ]
      }
    ],
    prayer: [],
    signatureLabel: null,
    signatureBlock: ORDER_SIGNATURE_BLOCK
  }
};
