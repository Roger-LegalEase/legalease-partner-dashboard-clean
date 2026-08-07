// Wisconsin record clearing — custom-pleading implementation.
//
// One assigned route and two custom-pleading components. The route is a
// supporting action rather than a substantive remedy: it produces the letter a
// participant sends to the authority that supervised them, asking for the
// certificate of discharge that completes an expungement the sentencing court
// already ordered. The process_guidance component the design assigns beside it
// belongs to the guidance lane.
//
// **What the statute actually does, and why there is anything to ask for.**
// Wis. Stat. § 973.015(1m)(b) makes issuance mandatory rather than
// discretionary: on successful completion of the sentence the detaining or
// probationary authority *shall* issue a certificate of discharge, which *shall*
// be forwarded to the court of record, and which has the effect of expunging the
// record. In the ordinary case there is no petition and no motion — the
// expungement happens because a certificate reaches the clerk. This route exists
// for the case where that did not happen: the certificate was never issued, or
// was issued and never forwarded, and the record is still publicly visible.
//
// **Nothing here is a court filing.** The letter goes to an agency. There is no
// venue, no fee, no service requirement, no notice and no hearing, and no
// document in this module is captioned in a court.
//
// Four boundaries shape the copy, and each is the design's own.
//
//   - **Neutral request only.** The design forbids drafting accusations of
//     agency misconduct, assertions of legal entitlement that would need
//     document review, or any individualized advocacy. The letter asks. It does
//     not argue, does not allege fault, and does not demand.
//   - **Completion is stated, never certified.** The letter records the
//     completion date as the participant reports it and never asserts that
//     completion was successful within the meaning of the statute. Whether it
//     was turns on revocation and subsequent-conviction questions, which the
//     design calls the two facts that destroy the expungement entirely, and
//     LegalEase reviews no discharge document.
//   - **The certificate is the authority's.** LegalEase does not produce it,
//     prefill it, or promise that it will issue.
//   - **What follows a refusal is an open question, and stays open.** The
//     statute sets no deadline for issuance or forwarding and identifies no
//     remedy. The design records that as a release blocker on participant
//     instructions, so the packet says plainly that it can ask and cannot say
//     what comes next, and refers the participant on.
//
// **The two components are alternatives that the manifest does not model as
// alternatives.** The design marks the request letter `required` and the
// status-only letter `conditional`, so a participant who asked only for a status
// check receives both. Rather than override the design's requirement values,
// both letters open by naming which situation they are for and which one to
// send, and the choice is carried from the participant's own `requestType`
// answer.
//
// Every template is DRAFT PENDING LEGAL REVIEW until reviewing counsel adopts
// it. The track is `technicalFixture` and `runtimeDisabled`: nothing here reaches
// a runtime surface, and wiring it into the shared registry and template pack is
// the integration captain's step.

import type { PleadingTemplate } from "@/lib/rcap/packets/engines/pleading-templates";
import type { PacketSet, ReliefTrack, RequiredInput } from "@/lib/rcap/packets/types";
import { computeRuntimeStatus } from "@/lib/rcap/packets/types";

const VERSION = "1.0.0";

const BANNER =
  "DRAFT PENDING LEGAL REVIEW — PREPARED BY LEGALEASE — NOT LEGAL ADVICE — DO NOT SEND UNTIL REVIEWED";

// ---------------------------------------------------------------------------
// Referral destinations
// ---------------------------------------------------------------------------

/** Where a stop that needs individual legal advice sends the participant. */
export const WI_REFERRAL =
  "Legal Action of Wisconsin, Wisconsin Judicare, or the State Bar of Wisconsin lawyer referral and information service on 1-800-362-9082.";

/** Where a stop about the court record itself sends the participant. */
export const WI_CLERK_REFERRAL =
  "The clerk of circuit court for the county of conviction, which is the office the certificate of discharge is forwarded to and the office that can say whether one arrived.";

/** Where a stop about the sentencing order sends the participant. */
export const WI_SENTENCING_RECORD_REFERRAL =
  "The clerk of circuit court for the county of conviction, for the judgment of conviction and, where it is silent, the sentencing transcript or minutes.";

/** Where a participant belongs when no certificate route exists for them. */
export const WI_CR266_ROUTE_REFERRAL =
  "LegalEase's own Wisconsin routing: where the sentencing court did not order expungement, the certificate route does not apply and a CR-266 petition is the separate question.";

// ---------------------------------------------------------------------------
// Typed stops
// ---------------------------------------------------------------------------

/**
 * Raised where an answer puts the matter outside what LegalEase may prepare
 * without individualized advice, or outside what the adopted design settled.
 */
export class WisconsinEligibilityStopError extends Error {
  readonly code = "wisconsin_eligibility_stop" as const;

  constructor(
    readonly stopId: string,
    readonly trackId: string,
    readonly reason: string,
    readonly referral: string,
    readonly nextStep: string
  ) {
    super(`${trackId}: ${reason}`);
    this.name = "WisconsinEligibilityStopError";
  }
}

/** Raised where an answer is not one of the values the route accepts. */
export class WisconsinBranchError extends Error {
  readonly code = "wisconsin_branch_not_recognized" as const;

  constructor(
    readonly trackId: string,
    readonly key: string,
    readonly received: string,
    readonly permitted: readonly string[]
  ) {
    super(
      `${trackId}: ${key} received "${received}", which is not one of ${permitted.join(", ")}.`
    );
    this.name = "WisconsinBranchError";
  }
}

// ---------------------------------------------------------------------------
// Closed lists
// ---------------------------------------------------------------------------

/** The single assigned route, held closed so no other track can derive here. */
export const WI_ASSIGNED_TRACK_IDS: readonly string[] = [
  "wi_exp_certificate_of_discharge_followup"
];

const TRACK_ID = "wi_exp_certificate_of_discharge_followup";

/** The only two answers a yes-or-no screen accepts. No default, no coercion. */
export const WI_YES_NO: Readonly<Record<string, boolean>> = {
  yes: true,
  no: false
};

/** What the participant wants from the authority. Decides which letter to send. */
export const WI_REQUEST_TYPES: Readonly<Record<string, "issue_and_forward" | "status_only">> = {
  issue_and_forward: "issue_and_forward",
  "issue and forward": "issue_and_forward",
  status_only: "status_only",
  "status only": "status_only"
};

/**
 * What the clerk said, which the design makes a precondition of writing at all.
 *
 * The adopted design's sequence is to check Wisconsin Circuit Court Access, then
 * confirm with the clerk, and only then write. Two of the three answers mean
 * there is nothing to ask the authority for yet.
 */
export const WI_CLERK_ANSWERS: Readonly<
  Record<string, "not_received" | "received" | "have_not_asked">
> = {
  not_received: "not_received",
  "not received": "not_received",
  received: "received",
  have_not_asked: "have_not_asked",
  "have not asked": "have_not_asked"
};

/**
 * Answer keys that would carry outside-party work into the letter.
 *
 * Nothing in the adopted design declares any of them, so their presence means a
 * caller is trying to have LegalEase supply the certificate of discharge, the
 * authority's answer, the clerk's certification or an issuance date. Section
 * 973.015(1m)(b) puts the first two on the supervising authority and the record
 * of receipt on the clerk.
 */
export const WI_OUTSIDE_PARTY_KEYS: readonly string[] = [
  "agencyResponse",
  "certificateIssuedDate",
  "certificateOfDischarge",
  "clerkCertification",
  "courtOrder",
  "expungementConfirmed",
  "judgeSignature",
  "supervisingAuthoritySignature"
];

// ---------------------------------------------------------------------------
// Answer helpers
// ---------------------------------------------------------------------------

type Answers = Record<string, unknown>;

const str = (answers: Answers, key: string): string => {
  const value = answers[key];
  if (value === undefined || value === null) return "";
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry).trim()).filter(Boolean).join("\n");
  }
  return String(value).trim();
};

/**
 * Declared rather than assigned, so TypeScript narrows after it.
 *
 * A `never`-returning arrow held in a const does not end a control-flow branch
 * for the compiler, which leaves every value screened by a stop still typed as
 * possibly null on the line after the stop.
 */
function stop(
  stopId: string,
  trackId: string,
  reason: string,
  referral: string,
  nextStep: string
): never {
  throw new WisconsinEligibilityStopError(stopId, trackId, reason, referral, nextStep);
}

const need = (trackId: string, answers: Answers, key: string): string => {
  const value = str(answers, key);
  if (!value) {
    stop(
      "wi-answer-missing",
      trackId,
      `The letter needs an answer to ${key} before anything can be prepared, and none was given. A request that does not identify the writer, the case or the supervising authority is one the agency cannot act on, and every field in this letter comes from the participant's own answers.`,
      WI_SENTENCING_RECORD_REFERRAL,
      "Get the judgment of conviction and your discharge paperwork, then answer the question from the record rather than from memory."
    );
  }
  return value;
};

const branch = <T>(
  trackId: string,
  key: string,
  raw: string,
  permitted: Readonly<Record<string, T>>
): T => {
  const normalized = raw.trim().toLowerCase().replace(/\s+/g, " ");
  if (!Object.prototype.hasOwnProperty.call(permitted, normalized)) {
    throw new WisconsinBranchError(trackId, key, raw, Object.keys(permitted));
  }
  return permitted[normalized];
};

const yesNo = (trackId: string, answers: Answers, key: string): boolean =>
  branch(trackId, key, need(trackId, answers, key), WI_YES_NO);

/** Phrases that mean the participant cannot answer from the record. */
const UNKNOWN_ANSWER =
  /\b(don'?t know|do not know|not sure|unsure|no idea|unknown|can'?t remember|cannot remember|can'?t recall|cannot recall|not certain)\b/i;

/** True where the answer at least states a year, which is what a recital needs. */
const statesAYear = (raw: string): boolean => /\b(19|20)\d{2}\b/.test(raw);

/**
 * A revocation or a subsequent conviction, asserted rather than denied.
 *
 * The design calls these the two facts that destroy the expungement entirely.
 * There is no declared input for either, so the only place they can surface is
 * the completion answer itself, and only a positive assertion stops the route —
 * "no revocation" must not read as a revocation.
 */
const NEGATED = /\b(no|none|not|never|without)\b[^.]{0,24}\b(revok\w*|revocation|new conviction|subsequent conviction)\b/i;
const mentionsCompletionDispute = (value: string): boolean =>
  /\b(revok\w*|revocation|new conviction|subsequent conviction|reconvicted|violated probation)\b/i.test(value) &&
  !NEGATED.test(value);

// ---------------------------------------------------------------------------
// Screens
// ---------------------------------------------------------------------------

/**
 * Refuses to build a letter out of outside-party content.
 *
 * Run first, before any other screen, so that a caller passing a certificate of
 * discharge, an agency answer or an issuance date gets a stop rather than a
 * letter that reads as though the thing being asked for already exists.
 */
function refuseOutsidePartyContent(trackId: string, answers: Answers): void {
  const supplied = WI_OUTSIDE_PARTY_KEYS.filter((key) => str(answers, key).length > 0);
  if (supplied.length === 0) return;
  stop(
    "wi-outside-party-content-refused",
    trackId,
    `Content was supplied for ${supplied.join(", ")}. Wis. Stat. § 973.015(1m)(b) puts issuing and forwarding the certificate of discharge on the detaining or probationary authority, and the record of what reached the court is the clerk's. LegalEase produces none of them and will not print one, because a letter that carried the certificate it is asking for would be asserting the very thing in question.`,
    WI_CLERK_REFERRAL,
    "Send the request and let the authority issue and forward the certificate. Then ask the clerk whether it arrived."
  );
}

// ---------------------------------------------------------------------------
// Fact derivation
// ---------------------------------------------------------------------------

/**
 * The condition key for the status-only letter.
 *
 * The design marks that component conditional and supplies the answer that
 * drives it, so unlike a condition with no declared input this one is genuinely
 * the participant's choice.
 */
export const WI_STATUS_REQUEST_CONDITION_KEY = "statusOnlyRequested";

/**
 * Turns the participant's answers into the fact bag the templates read.
 *
 * Fails closed on anything the adopted design treats as a stop, on anything that
 * would require certifying completion, and on any attempt to supply
 * outside-party content.
 */
export function deriveWisconsinFacts(
  trackId: string,
  answers: Answers
): Record<string, string> {
  if (!WI_ASSIGNED_TRACK_IDS.includes(trackId)) {
    throw new WisconsinBranchError(trackId, "trackId", trackId, WI_ASSIGNED_TRACK_IDS);
  }
  refuseOutsidePartyContent(trackId, answers);

  const fullLegalName = need(trackId, answers, "fullLegalName");
  const dateOfBirth = need(trackId, answers, "dateOfBirth");
  const returnContactDetails = need(trackId, answers, "returnContactDetails");
  const caseNumberAndCounty = need(trackId, answers, "caseNumberAndCounty");
  const supervisionIdentifier = str(answers, "supervisionIdentifier");
  const supervisingAuthority = need(trackId, answers, "supervisingAuthority");
  const supervisingAgentName = str(answers, "supervisingAgentName");
  const sentenceCompletionDate = need(trackId, answers, "sentenceCompletionDate");

  // The order at sentencing is what makes a certificate owed at all. Without it
  // there is nothing for the authority to certify.
  if (!yesNo(trackId, answers, "expungementOrderedAtSentencing")) {
    stop(
      "wi-expungement-not-ordered-at-sentencing",
      trackId,
      "The sentencing court did not order expungement. Wis. Stat. § 973.015(1m)(b) has the supervising or detaining authority issue a certificate of discharge on successful completion of a sentence the court ordered expunged; where the court made no such order there is no certificate owed, and a letter asking for one would ask for something that does not exist.",
      WI_CR266_ROUTE_REFERRAL,
      "Get the judgment of conviction from the clerk, and the sentencing transcript or minutes where the judgment is silent, and check whether expungement was ordered. If it was, answer again; if it was not, that is a different question."
    );
  }

  // The date is stated, never certified. An answer with no year in it is a blank
  // line in a letter to an agency.
  if (UNKNOWN_ANSWER.test(sentenceCompletionDate) || !statesAYear(sentenceCompletionDate)) {
    stop(
      "wi-completion-date-not-established",
      trackId,
      "The date the sentence and any probation were completed has not been stated. The letter records that date as the participant reports it, and the authority locates the file by it. LegalEase will not send an agency a request with a date nobody has taken from the record.",
      WI_SENTENCING_RECORD_REFERRAL,
      "Ask the Department of Corrections or the detaining authority for your discharge documentation, take the date off it, and answer again."
    );
  }

  // The two facts the design calls fatal to the expungement, wherever they
  // surface. LegalEase reviews no discharge document and settles neither.
  if (mentionsCompletionDispute(sentenceCompletionDate)) {
    stop(
      "wi-completion-disputed",
      trackId,
      "The answer describes a revocation, a violation or a later conviction. The design records those as the two facts that destroy the expungement entirely: § 973.015(1m)(b) makes the certificate owed on successful completion, and whether completion was successful within the meaning of the statute is not something LegalEase can establish from a participant's account. A neutral request that turned out to misstate the position would be worse than no letter.",
      WI_REFERRAL,
      "Take your discharge paperwork and the judgment to a lawyer before writing to the authority. If completion was successful after all, come back."
    );
  }

  const clerkAnswer = branch(
    trackId,
    "clerkConfirmedNotReceived",
    need(trackId, answers, "clerkConfirmedNotReceived"),
    WI_CLERK_ANSWERS
  );
  if (clerkAnswer === "have_not_asked") {
    stop(
      "wi-clerk-not-yet-asked",
      trackId,
      "The clerk of circuit court has not been asked whether a certificate of discharge was received. The adopted sequence is to check Wisconsin Circuit Court Access, then confirm with the clerk, and only then write to the authority. Writing first risks asking an agency to redo something it already did.",
      WI_CLERK_REFERRAL,
      "Ask the clerk of circuit court for the county of conviction whether a certificate of discharge was received in your case, and check Wisconsin Circuit Court Access to see whether the case is still publicly visible. Then answer again."
    );
  }
  if (clerkAnswer === "received") {
    stop(
      "wi-certificate-already-received",
      trackId,
      "The clerk says a certificate of discharge was received. Under § 973.015(1m)(b) the certificate has the effect of expunging the record once it reaches the court of record, so the thing this letter asks for has already happened and there is nothing to request.",
      WI_CLERK_REFERRAL,
      "Check Wisconsin Circuit Court Access to see whether the case has left public access. If the certificate was received but the record is still visible, that is a question for the clerk first and then for a lawyer, not a request to the supervising authority."
    );
  }

  const requestType = branch(
    trackId,
    "requestType",
    need(trackId, answers, "requestType"),
    WI_REQUEST_TYPES
  );
  const statusOnly = requestType === "status_only";

  const caseCounty = caseNumberAndCounty;

  return {
    // Declared keys, carried through exactly as declared.
    fullLegalName,
    dateOfBirth,
    returnContactDetails,
    caseNumberAndCounty,
    supervisionIdentifier,
    supervisingAuthority,
    supervisingAgentName,
    sentenceCompletionDate,
    expungementOrderedAtSentencing: "yes",
    clerkConfirmedNotReceived: "not_received",
    requestType,

    // Template placeholders.
    caseCounty,
    supervisionIdentifierStatement: supervisionIdentifier
      ? `The identification number the writer was given by the supervising authority is: ${supervisionIdentifier}`
      : "The writer does not have a Department of Corrections or offender identification number to give.",
    supervisingAgentStatement: supervisingAgentName
      ? `The agent or office the writer dealt with, so far as the writer recalls, was: ${supervisingAgentName}`
      : "The writer does not recall the name of the agent or office that supervised them.",
    completionStatement: `The writer states that they completed the sentence, including any probation, on: ${sentenceCompletionDate}`,
    sentencingOrderStatement:
      "The writer states that at sentencing the court ordered that the record would be expunged on successful completion of the sentence.",
    clerkStatement:
      "The writer has asked the clerk of circuit court for the county of conviction whether a certificate of discharge was received, and states that the clerk said none was received.",
    whichLetterStatement: statusOnly
      ? "The writer asked LegalEase only to find out whether the certificate has already been issued and forwarded. The status enquiry that accompanies this letter is the one to send. This letter is included as well, so that it is to hand if the answer comes back that nothing has been issued. Send one of the two, not both: sending both at once asks the same office two versions of the same question."
      : "The writer asked LegalEase to request that the certificate be issued and forwarded. This is the letter to send, and it is the only letter in this packet. A separate status enquiry is not included, because this letter already asks the authority to say when the certificate has been issued and forwarded.",
    // The status letter renders only where the participant asked for it, so its
    // opening line has no other case to describe.
    statusOnlyLetterStatement:
      "The writer asked only to be told whether the certificate of discharge has already been issued and forwarded. This is the letter to send. The request letter that accompanies it is included so that it is to hand if the answer comes back that nothing has been issued. Send one of the two, not both: sending both at once asks the same office two versions of the same question.",
    [WI_STATUS_REQUEST_CONDITION_KEY]: statusOnly ? "yes" : "",
    packetCaseReference: "Wisconsin certificate of discharge"
  };
}

// ---------------------------------------------------------------------------
// Shared template language
// ---------------------------------------------------------------------------

type Section = {
  heading?: string;
  numbered: boolean;
  paragraphs: readonly string[];
};

/**
 * The header block, which is an addressee block and not a court caption.
 *
 * Nothing on this route is filed anywhere. Each cell is a whole phrase: the
 * shared writer wraps each cell inside its own column, so a pre-split phrase
 * would drift apart by however many lines the writer's name needed.
 */
const ADDRESSEE_LINE =
  "TO THE AUTHORITY THAT SUPERVISED THE WRITER — THIS IS A LETTER, NOT A COURT FILING";

const HEADER_LEFT: readonly string[] = [
  "From: {{fullLegalName}}",
  "Date of birth: {{dateOfBirth}}",
  "Reply to: {{returnContactDetails}}",
  "",
  "Date sent: ____________________"
];

const HEADER_RIGHT = (documentLine: string): readonly string[] => [
  documentLine,
  "",
  "Case and county: {{caseNumberAndCounty}}",
  "",
  "Sent to: {{supervisingAuthority}}"
];

const PREAMBLE =
  "Prepared by LegalEase from the answers the writer gave, for the writer to send. LegalEase has not seen the writer's records, has not decided whether anything is owed, does not represent the writer, has sent nothing and holds no reply. Every statement of fact below is the writer's own.";

/** What the statute puts on the authority, said once and said plainly. */
const STATUTORY_BASIS_SECTION: Section = {
  heading: "WHY THIS LETTER GOES TO YOU",
  numbered: false,
  paragraphs: [
    "Wis. Stat. § 973.015(1m)(b) provides that upon successful completion of the sentence the detaining or probationary authority shall issue a certificate of discharge, that the certificate shall be forwarded to the court of record, and that it has the effect of expunging the record. Issuance is a duty rather than a discretion, and it belongs to the authority that supervised or detained the person, which is why this letter is addressed there.",
    "In the ordinary case there is no petition and no separate motion. The expungement happens because the certificate reaches the clerk. This letter exists for the case where the writer believes that did not happen."
  ]
};

/** Neither a filing nor a demand, said before anything is asked for. */
const NOT_A_FILING_SECTION: Section = {
  heading: "WHAT THIS LETTER IS, AND WHAT IT IS NOT",
  numbered: false,
  paragraphs: [
    "It is a request from the person named above, in their own name. It is not filed in any court, there is no case pending on it, no fee attaches to it, no service of it is required and no hearing arises from it.",
    "It is not a demand and it is not a complaint. It alleges no fault by any office and asserts no legal entitlement. It asks a question and makes a request, and it is written to be easy to act on.",
    "It is not a certificate of discharge and it does not contain one. Section 973.015(1m)(b) puts issuing and forwarding that certificate on the authority, and LegalEase neither produces it nor promises that it will issue.",
    "LegalEase prepared this letter and does not represent the writer. It has not sent it, holds no reply, and makes no claim about what any office will do."
  ]
};

/** The facts the writer states, and the things they deliberately do not state. */
const NOT_ASSERTED_SECTION: Section = {
  heading: "WHAT THIS LETTER DOES NOT SAY",
  numbered: false,
  paragraphs: [
    "It does not say that completion was successful within the meaning of the statute. It states the completion date the writer gave. Whether completion was successful turns on whether there was a revocation and whether there was a later conviction, and those are records the authority holds and LegalEase has never seen.",
    "It does not say that a certificate is owed, that any office has failed in a duty, or that anything has gone wrong. It records what the writer was told by the clerk and asks the authority to look.",
    "It does not say what the record shows now, beyond what the writer reports from Wisconsin Circuit Court Access and from the clerk.",
    "Nobody at LegalEase has reviewed a discharge document, a judgment or a court file in this matter, and nothing here should be read as though somebody had."
  ]
};

/** What follows, including the question the design leaves open. */
const AFTERWARDS_SECTION: Section = {
  heading: "WHAT HAPPENS AFTER THIS IS SENT, AND WHAT IS NOT KNOWN",
  numbered: false,
  paragraphs: [
    "Keep a copy of this letter and a note of the date it was sent. Allow the authority a reasonable time to answer; the statute sets no deadline for issuing or forwarding a certificate, so there is no date by which an answer is due.",
    "Afterwards, check Wisconsin Circuit Court Access again to see whether the case has left public access, and ask the clerk of circuit court again whether a certificate arrived. The expungement follows from the certificate reaching the clerk, not from this letter.",
    "What a person can do if the authority does not answer, or declines to issue the certificate, is genuinely open. Section 973.015(1m)(b) says the authority shall issue and shall forward, and then sets no deadline and names no remedy. This packet can ask; it cannot tell the writer what follows a refusal, and it does not pretend to.",
    `If the authority declines, does not answer, or says completion was not successful, that is the point to speak to a lawyer. ${WI_REFERRAL}`
  ]
};

/** Where automated help ends. */
const STOP_SECTION: Section = {
  heading: "WHERE THIS PACKET STOPS",
  numbered: false,
  paragraphs: [
    "LegalEase prepares documents from what the writer says. It does not give legal advice, does not look at any record, does not send anything and does not speak to any office.",
    "Any dispute about whether completion was successful, and in particular any revocation or later conviction. Those are the two facts that end the expungement entirely, and they are not ones a letter should walk into.",
    "The authority declining to issue the certificate, or saying that completion was not successful.",
    "The authority saying it issued and forwarded the certificate while the clerk says nothing arrived. That contradiction needs somebody who can look at both files.",
    "Any request to argue entitlement, to allege that an office was at fault, or to press the authority beyond a neutral request. That is advocacy for one person's case and it is outside what a prepared letter does.",
    "Federal, tribal and out-of-state records, which a Wisconsin authority's certificate does not reach.",
    "Any immigration consequence. Nothing here is advice about immigration.",
    `Where any of these applies, speak to a lawyer before sending anything. ${WI_REFERRAL}`
  ]
};

const SIGNATURE_BLOCK: readonly string[] = [
  "Printed name: ______________________________",
  "Address: ___________________________________",
  "Telephone: _________________________________",
  "Email: _____________________________________",
  "Date: ______________________________________",
  "",
  "Sign and date this by hand in your own name. Nothing on this route requires a sworn statement or a notary, and no notarial block is printed here.",
  "Check the authority's current mailing address before you send it. Office addresses change and this letter does not carry one."
];

/** The identity and case facts both letters state, in the same order. */
const COMMON_ALLEGATIONS: readonly string[] = [
  "The writer is {{fullLegalName}}, date of birth {{dateOfBirth}}.",
  "The case, and the Wisconsin county it was in, are: {{caseNumberAndCounty}}",
  "The authority that supervised or detained the writer, so far as the writer knows, is: {{supervisingAuthority}}",
  "{{supervisionIdentifierStatement}}",
  "{{supervisingAgentStatement}}",
  "{{sentencingOrderStatement}}",
  "{{completionStatement}}",
  "{{clerkStatement}}"
];

// ---------------------------------------------------------------------------
// The two letters
// ---------------------------------------------------------------------------

const REQUEST_LETTER: PleadingTemplate = {
  templateId: "wi_exp_certificate_of_discharge_followup-request",
  version: VERSION,
  technicalFixture: true,
  fixtureBanner: BANNER,
  caption: {
    courtLine: ADDRESSEE_LINE,
    partyBlockLeft: HEADER_LEFT,
    partyBlockRight: HEADER_RIGHT("Request for a certificate of discharge")
  },
  title:
    "REQUEST THAT A CERTIFICATE OF DISCHARGE BE ISSUED AND FORWARDED UNDER WIS. STAT. § 973.015(1m)(b)",
  preamble: PREAMBLE,
  sections: [
    {
      heading: "WHICH OF THESE LETTERS TO SEND",
      numbered: false,
      paragraphs: ["{{whichLetterStatement}}"]
    },
    STATUTORY_BASIS_SECTION,
    NOT_A_FILING_SECTION,
    {
      heading: "THE WRITER, THE CASE AND THE COMPLETION, AS THE WRITER STATES THEM",
      numbered: true,
      paragraphs: [...COMMON_ALLEGATIONS]
    },
    {
      heading: "WHAT THE WRITER ASKS",
      numbered: false,
      paragraphs: [
        "The writer asks that the certificate of discharge under Wis. Stat. § 973.015(1m)(b) be issued in this case and forwarded to the clerk of the circuit court of conviction.",
        "The writer asks to be told, at the reply address above, when that has been done, so that the writer can check with the clerk.",
        "If your office holds a record showing that the certificate was already issued and forwarded, the writer asks to be told the date it was sent and to whom, because the clerk reports not having received it.",
        "If your office cannot act on this request, the writer asks to be told which office can."
      ]
    },
    NOT_ASSERTED_SECTION,
    AFTERWARDS_SECTION,
    STOP_SECTION
  ],
  prayer: [
    "Thank you for your time. A reply in writing to the address above would be appreciated.",
    "This letter reports no decision by anybody. It asks. No office has issued a certificate, confirmed anything or agreed to anything, and the writer makes no claim about what will follow."
  ],
  signatureLabel: "The writer, in their own name",
  signatureBlock: SIGNATURE_BLOCK
};

const STATUS_LETTER: PleadingTemplate = {
  templateId: "wi_exp_certificate_of_discharge_followup-status-enquiry",
  version: VERSION,
  technicalFixture: true,
  fixtureBanner: BANNER,
  caption: {
    courtLine: ADDRESSEE_LINE,
    partyBlockLeft: HEADER_LEFT,
    partyBlockRight: HEADER_RIGHT("Status enquiry about a certificate of discharge")
  },
  title:
    "ENQUIRY WHETHER A CERTIFICATE OF DISCHARGE HAS BEEN ISSUED AND FORWARDED UNDER WIS. STAT. § 973.015(1m)(b)",
  preamble: PREAMBLE,
  sections: [
    {
      heading: "WHICH OF THESE LETTERS TO SEND",
      numbered: false,
      paragraphs: ["{{statusOnlyLetterStatement}}"]
    },
    STATUTORY_BASIS_SECTION,
    NOT_A_FILING_SECTION,
    {
      heading: "THE WRITER, THE CASE AND THE COMPLETION, AS THE WRITER STATES THEM",
      numbered: true,
      paragraphs: [...COMMON_ALLEGATIONS]
    },
    {
      heading: "WHAT THE WRITER IS ASKING",
      numbered: false,
      paragraphs: [
        "The writer asks only to be told whether a certificate of discharge under Wis. Stat. § 973.015(1m)(b) has been issued in this case and forwarded to the clerk of the circuit court of conviction, and if so, on what date and to which office it was sent.",
        "This letter asks for nothing else. It does not ask that a certificate be issued, and it should not be read as a request that anything be done.",
        "If your office is not the one that holds that record, the writer asks to be told which office is."
      ]
    },
    NOT_ASSERTED_SECTION,
    AFTERWARDS_SECTION,
    STOP_SECTION
  ],
  prayer: [
    "Thank you for your time. A reply in writing to the address above would be appreciated.",
    "This letter reports no decision by anybody. It asks. No office has issued a certificate, confirmed anything or agreed to anything, and the writer makes no claim about what will follow."
  ],
  signatureLabel: "The writer, in their own name",
  signatureBlock: SIGNATURE_BLOCK
};

// ---------------------------------------------------------------------------
// Template registry
// ---------------------------------------------------------------------------

export const WISCONSIN_PLEADING_TEMPLATES: Readonly<Record<string, PleadingTemplate>> = {
  [REQUEST_LETTER.templateId]: REQUEST_LETTER,
  [STATUS_LETTER.templateId]: STATUS_LETTER
};

// ---------------------------------------------------------------------------
// Packet set and track
// ---------------------------------------------------------------------------

const PENDING_APPROVAL = {
  visual: "not_reviewed",
  legal: "not_submitted"
} as const;

/**
 * Design role → engine role.
 *
 * `PacketComponentRole` is a closed twelve-value engine type this job does not
 * own, so the design's two custom-pleading roles are mapped onto it here and the
 * mapping is asserted by the verifier rather than left implicit.
 *
 *   primary_filing → primary_filing
 *       The writer's own request. It is the operative document on the route even
 *       though nothing about it is filed.
 *
 *   status_request → notice
 *       Correspondence the writer delivers to an outside office beside the
 *       primary document. `notice` is the engine's role for a document a
 *       participant puts in an outside party's hands alongside the primary one.
 *       It is not an `affidavit` — nothing is sworn — not a `proposed_order`,
 *       and not a `continuation`, because it is signed and sent on its own.
 *
 * The componentId is pinned exactly as the design assigns it. That is what
 * carries assignment fidelity; the role mapping only keeps the vocabularies
 * honest with each other.
 */
export const WI_DESIGN_ROLE_TO_ENGINE_ROLE: Readonly<
  Record<string, PacketSet["components"][number]["role"]>
> = {
  primary_filing: "primary_filing",
  status_request: "notice"
};

const PACKET_SET: PacketSet = {
  packetSetId: `${TRACK_ID}-set`,
  version: VERSION,
  components: [
    {
      componentId: `${TRACK_ID}-primary-filing-1`,
      role: WI_DESIGN_ROLE_TO_ENGINE_ROLE.primary_filing,
      outputStrategy: "custom_pleading",
      rendererStrategy: "custom_pleading",
      templateId: REQUEST_LETTER.templateId,
      sourcePath: null,
      sourceSha256: null,
      geographicScope: "statewide",
      requirement: "required",
      order: 1,
      approval: PENDING_APPROVAL,
      version: VERSION
    },
    {
      componentId: `${TRACK_ID}-status-request-2`,
      role: WI_DESIGN_ROLE_TO_ENGINE_ROLE.status_request,
      outputStrategy: "custom_pleading",
      rendererStrategy: "custom_pleading",
      templateId: STATUS_LETTER.templateId,
      sourcePath: null,
      sourceSha256: null,
      geographicScope: "statewide",
      requirement: "conditional",
      conditionKey: WI_STATUS_REQUEST_CONDITION_KEY,
      order: 2,
      approval: PENDING_APPROVAL,
      version: VERSION
    }
  ]
};

/**
 * The eleven questions the design asks.
 *
 * `RequiredInput` carries only a key, a label and a required flag, so the
 * design's condition text — the reason a question is asked, and what a usable
 * answer looks like — is folded into the label. The keys are the design's and
 * are not renamed.
 */
const REQUIRED_INPUTS: readonly RequiredInput[] = [
  {
    key: "fullLegalName",
    label: "What is your full legal name, and any other name the case was under?",
    required: true
  },
  { key: "dateOfBirth", label: "What is your date of birth?", required: true },
  {
    key: "returnContactDetails",
    label: "What postal address, phone number or email should the authority use to reply to you?",
    required: true
  },
  {
    key: "caseNumberAndCounty",
    label: "What is the case number, and which Wisconsin county was the case in?",
    required: true
  },
  {
    key: "supervisionIdentifier",
    label:
      "What is your Department of Corrections or offender identification number, if you have one? Asked where the sentence included probation or confinement, because it is how the supervising authority finds the file.",
    required: false
  },
  {
    key: "supervisingAuthority",
    label: "Which agency supervised your probation, or which facility held you?",
    required: true
  },
  {
    key: "supervisingAgentName",
    label:
      "Do you know the name of your probation agent or the office that supervised you? Asked where the sentence included probation; it helps the authority route the request.",
    required: false
  },
  {
    key: "sentenceCompletionDate",
    label:
      "On what date did you finish your sentence, including any probation? Take it from your discharge paperwork. The letter states this date as yours and does not certify that completion was successful.",
    required: true
  },
  {
    key: "expungementOrderedAtSentencing",
    label:
      "Did the judge order at your sentencing that the record would be expunged once you completed your sentence? Answer yes or no. Without that order there is no certificate owed.",
    required: true
  },
  {
    key: "clerkConfirmedNotReceived",
    label:
      "Have you asked the clerk of court whether they received a certificate of discharge, and what did they say? Answer not received, received, or have not asked. Ask the clerk before writing to the authority.",
    required: true
  },
  {
    key: "requestType",
    label:
      "Do you want to ask the authority to issue and forward the certificate, or only to tell you whether it has already been done? Answer issue and forward, or status only.",
    required: true
  }
];

const statuses = {
  research: "research_draft_complete",
  technical: "renderer_ready",
  visual: "not_reviewed",
  legal: "not_submitted"
} as const;

export const WISCONSIN_CUSTOM_PLEADING_TRACKS: readonly ReliefTrack[] = [
  {
    jurisdiction: "WI",
    trackId: TRACK_ID,
    publicName: "Ask for the certificate that completes your expungement",
    mechanism: "request_certificate_of_discharge_be_issued_and_forwarded",
    authority: "Wis. Stat. § 973.015(1m)(b)",
    recordTypes: ["conviction"],
    dispositions: ["convicted_with_expungement_ordered_at_sentencing"],
    // Not a court level, and deliberately. Nothing on this route is filed: the
    // letter goes to the agency that supervised or detained the writer, and the
    // clerk is where the certificate is forwarded rather than where anything is
    // lodged.
    courtLevel: "not_a_court_filing_the_supervising_or_detaining_authority_receives_it",
    geographicScope: "statewide",
    geographyKeys: [],
    outputStrategy: "custom_pleading",
    packetSet: PACKET_SET,
    requiredInputs: REQUIRED_INPUTS,
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
    assembledPacketName: "wi-certificate-of-discharge-request",
    assembledPacketTitle:
      "Wisconsin certificate of discharge follow-up — Wis. Stat. § 973.015(1m)(b)",
    customerDeliverableDescription:
      "A neutral letter to the authority that supervised or detained the writer, asking that the certificate of discharge Wis. Stat. § 973.015(1m)(b) makes it their duty to issue be issued and forwarded to the clerk of the circuit court of conviction — with a status-only version where the writer wants to ask the narrower question first. Nothing on this route is filed in a court, no fee attaches and no service is required. The letter states the completion date as the writer's own and never certifies that completion was successful; the certificate itself remains the authority's document, which LegalEase neither produces nor promises.",
    notes:
      "A supporting action on the certificate-of-discharge slot rather than a second remedy: it supports implementation of an expungement the court already ordered and changes no legal status by itself. What a person can do where the authority does not answer or declines is a release blocker the design leaves open, and the letter says so rather than inventing a next step."
  }
];
