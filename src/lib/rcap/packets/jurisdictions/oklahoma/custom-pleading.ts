// Oklahoma record clearing — custom-pleading implementation.
//
// Eight assigned routes, each carrying two custom-pleading components: the
// participant's own filing and a proposed order. Oklahoma publishes no standard
// petition that a participant could fill — the adopted design records that no
// such document was identified, statewide or by district — so the filings here
// are written to the content the statutes require rather than to a form.
//
// Three facts about Oklahoma shape every document in this module.
//
// **Expungement here means sealing.** Title 22 defines expungement as the
// sealing of criminal records and of any public civil record arising from the
// same arrest, transaction or occurrence. Section 19 does not authorise
// physical destruction, a sealed record may be unsealed later on a finding of
// changed conditions or compelling reason, and under § 19(N) a record ordered
// sealed that is not unsealed within ten years may be obliterated or destroyed
// at the end of that period. Full sealing and partial sealing are different
// outcomes — partially sealed records stay available to law enforcement — and
// the design records that difference as material and requiring disclosure. Every
// filing here says so on its face; none of them promises a clear record.
//
// **The category paragraph numbers are not stable and are not asserted.**
// Section 18 was amended by Chapter 259 O.S.L. 2024, section 19 by Chapter 292
// O.S.L. 2025, and Senate Bill 2030 amended both again in 2026. The adopted
// design's single most emphatic instruction is to screen on the *description*
// of the category rather than on a paragraph number, because three consecutive
// years of renumbering have made the numbers unreliable. So no document in this
// module cites a subdivision of § 18, states a waiting period, or says that one
// has run. The offence is recited in the words used on the record and the
// category is left to the court and the agencies who read the section as it now
// stands.
//
// **A paid petition must never be generated for someone entitled to a free
// route.** SB 2030 provides for sealing of certain records without a petition
// and expressly preserves the right to petition; its enrolled text had not been
// read when the design was adopted. The design's stated harm — selling a
// petition to a person who could have used a free route — is guarded twice
// here: `okFreeRouteChecked` is a typed stop, so a participant who asks for that
// check gets a referral rather than a petition, and every filing that is
// generated carries the caution on its face.
//
// Actor boundaries kept throughout, each a place an automated packet could
// quietly claim work it did not do:
//
//   - **The court gives the notice.** Section 19 puts the hearing and the
//     thirty days' notice to the prosecuting agency, the arresting agency, the
//     Oklahoma State Bureau of Investigation and any other record-holding agency
//     on the court. The participant does not serve anyone, and no certificate of
//     service is generated.
//   - **The judge signs the order.** The proposed order carries a blank judicial
//     signature block and an instruction not to sign it. It is the only
//     component in this module that carries an outside party's signature line,
//     and it carries no participant signature rule at all.
//   - **The prosecutor's position is the prosecutor's.** Where a route turns on
//     something the prosecuting agency said — the non-conviction route's
//     no-refile confirmation — the filing renders it as the participant's
//     account of what the agency said and states in terms that LegalEase holds
//     no confirmation from that agency.
//   - **LegalEase handles no payment.** The Oklahoma State Bureau of
//     Investigation publishes that a court-record expungement is free and that
//     an arrest-record expungement carries a processing fee payable only by
//     cashier's check or money order. That fee goes to the Bureau, not to the
//     court. The district court filing fee was not established, so no filing fee
//     is stated. No document in this module prints a monetary amount.
//
// What these documents never do:
//
//   - assert which § 18 category applies, or that a waiting period has run;
//   - assert that a record is or is not within the SB 2030 sealing-without-
//     petition route;
//   - state a fee amount, or predict a filing fee;
//   - assert the prosecuting agency's position, or that it will not object;
//   - assert that the participant is or is not the subject of a record on the
//     identity-theft route. The account of the misidentification is rendered as
//     the participant's own, in the participant's words;
//   - state the conditions of 22 O.S. § 60.18. The design records that the
//     section's text was not read, so the protective-order filing asks for
//     relief under the section and recites the participant's facts without
//     stating what the section requires;
//   - tell a § 991c participant that their record is clear. The Bureau states
//     directly that a § 991c expungement does not remove the arrest record, and
//     the design calls that the most important consumer-facing point in the
//     state. Both § 991c documents say it, and a participant whose goal is the
//     arrest record is stopped and routed to the § 18 petition instead.
//
// Every template is DRAFT PENDING LEGAL REVIEW until reviewing counsel adopts
// it. Every track is `technicalFixture` and `runtimeDisabled`: nothing here
// reaches a runtime surface, and wiring these tracks and templates into the
// shared registry and template pack is the integration captain's step.

import type { PleadingTemplate } from "@/lib/rcap/packets/engines/pleading-templates";
import type { PacketSet, ReliefTrack, RequiredInput } from "@/lib/rcap/packets/types";
import { computeRuntimeStatus } from "@/lib/rcap/packets/types";

const VERSION = "1.0.0";

const BANNER =
  "DRAFT PENDING LEGAL REVIEW — PREPARED BY LEGALEASE — NOT LEGAL ADVICE — DO NOT FILE UNTIL REVIEWED";

/** Where a typed stop on an Oklahoma route sends the participant. */
export const OK_REFERRAL =
  "Oklahoma Legal Aid Services of Oklahoma or Legal Aid Services of Eastern Oklahoma, Oklahoma Free Legal Answers, or the Oklahoma Bar Association lawyer referral service.";

/** Where the free-route stop sends the participant, which is not a lawyer. */
export const OK_FREE_ROUTE_REFERRAL =
  "The Oklahoma State Bureau of Investigation, which publishes the criminal history record expungement process and is the office that will operate the sealing provided for by Senate Bill 2030.";

/** Where a § 991c participant goes when the arrest record is the real goal. */
export const OK_ARREST_RECORD_REFERRAL =
  "LegalEase's own Oklahoma routing: the arrest record is reached by a 22 O.S. §§ 18 and 19 petition, not by a § 991c motion.";

// ---------------------------------------------------------------------------
// Typed stops
// ---------------------------------------------------------------------------

/**
 * Raised where an answer puts the matter outside what LegalEase may prepare
 * without individualized advice, or outside what the adopted design settled.
 */
export class OklahomaEligibilityStopError extends Error {
  readonly code = "oklahoma_eligibility_stop" as const;

  constructor(
    readonly stopId: string,
    readonly trackId: string,
    readonly reason: string,
    readonly referral: string
  ) {
    super(`${trackId}: ${reason}`);
    this.name = "OklahomaEligibilityStopError";
  }
}

/** Raised where an answer is not one of the values the route accepts. */
export class OklahomaBranchError extends Error {
  readonly code = "oklahoma_branch_not_recognized" as const;

  constructor(
    readonly trackId: string,
    readonly key: string,
    readonly received: string,
    readonly permitted: readonly string[]
  ) {
    super(
      `${trackId}: ${key} received "${received}", which is not one of ${permitted.join(", ")}.`
    );
    this.name = "OklahomaBranchError";
  }
}

// ---------------------------------------------------------------------------
// Closed lists
// ---------------------------------------------------------------------------

/**
 * The eight assigned routes.
 *
 * Held as a closed list so that a track this job was not assigned cannot be
 * derived for by passing its identifier, and so that the verifier has one place
 * to check the assignment against.
 */
export const OK_ASSIGNED_TRACK_IDS: readonly string[] = [
  "ok_18_19_deferred_dismissal",
  "ok_18_19_felony_conviction",
  "ok_18_19_misdemeanor_conviction",
  "ok_18_19_nonconviction",
  "ok_18_19_pardon",
  "ok_991c_deferred",
  "ok_identity_theft",
  "ok_vpo_60_18"
];

/** The only two answers a yes-or-no screen accepts. No default, no coercion. */
export const OK_YES_NO: Readonly<Record<string, boolean>> = {
  yes: true,
  no: false
};

/**
 * How a protective order matter ended.
 *
 * Section 60.18's own conditions were not read, so this list is not an
 * eligibility test — it exists so that the filing recites one of three settled
 * outcomes rather than free text the court would have to interpret.
 */
export const OK_VPO_OUTCOMES: Readonly<Record<string, string>> = {
  dismissed: "the protective order petition was dismissed",
  denied: "the protective order was denied",
  expired: "the protective order expired"
};

// ---------------------------------------------------------------------------
// Answer helpers
// ---------------------------------------------------------------------------

type Answers = Record<string, unknown>;

const str = (answers: Answers, key: string): string => {
  const value = answers[key];
  if (value === undefined || value === null) return "";
  if (Array.isArray(value)) return value.map((entry) => String(entry).trim()).filter(Boolean).join("\n");
  return String(value).trim();
};

const need = (trackId: string, answers: Answers, key: string): string => {
  const value = str(answers, key);
  if (!value) {
    throw new OklahomaEligibilityStopError(
      "ok-answer-missing",
      trackId,
      `The route needs an answer to ${key} before anything can be prepared, and none was given.`,
      OK_REFERRAL
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
  const normalized = raw.trim().toLowerCase();
  if (!Object.prototype.hasOwnProperty.call(permitted, normalized)) {
    throw new OklahomaBranchError(trackId, key, raw, Object.keys(permitted));
  }
  return permitted[normalized];
};

const yesNo = (trackId: string, answers: Answers, key: string): boolean =>
  branch(trackId, key, need(trackId, answers, key), OK_YES_NO);

/**
 * The bare county name, for the line that already prints the word "County".
 *
 * Two of the design's questions bundle the county with something else — "which
 * Oklahoma county and district court handled the case" on the § 991c route —
 * and a participant asked for a county will as readily write "Oklahoma County"
 * as "Oklahoma". A court line built by concatenation therefore produces
 * "Oklahoma County COUNTY" or, worse, a court name inside the county slot. The
 * first clause is taken, a leading court name and a trailing "County" are
 * dropped, and the participant's whole answer is still recited in the
 * allegations so that nothing they said is lost.
 */
function bareCountyName(raw: string): string {
  const firstClause = raw.split(",")[0].trim();
  const withoutCourt = firstClause.replace(/^(the\s+)?district court\s+(of|for)\s+/i, "").trim();
  const withoutSuffix = withoutCourt.replace(/\s+county$/i, "").trim();
  return withoutSuffix || firstClause;
}

/** Renders a free-text list answer as one line per entry, never numbered. */
const listAnswer = (answers: Answers, key: string): string => {
  const value = answers[key];
  if (Array.isArray(value)) {
    const entries = value.map((entry) => String(entry).trim()).filter(Boolean);
    return entries.length > 0 ? entries.map((entry) => `— ${entry}`).join("\n") : "None stated.";
  }
  const single = str(answers, key);
  return single ? `— ${single}` : "None stated.";
};

// ---------------------------------------------------------------------------
// Screens shared by the seven § 18 routes
// ---------------------------------------------------------------------------

/**
 * The free-route screen, asked first and deliberately.
 *
 * A participant who wants to know whether Oklahoma will seal this record
 * without a petition is asking a question the adopted design could not answer:
 * SB 2030's enrolled text was not obtained. Generating a paid petition anyway is
 * the exact harm the review names, so the route stops and refers to the Bureau.
 */
function applyFreeRouteScreen(trackId: string, answers: Answers, key: string): boolean {
  const wantsCheck = yesNo(trackId, answers, key);
  if (wantsCheck) {
    throw new OklahomaEligibilityStopError(
      "ok-free-route-check-not-available",
      trackId,
      "Senate Bill 2030 amended 22 O.S. §§ 18 and 19 in 2026 and provides for the sealing of certain records without a petition. Its enrolled text has not been read, so LegalEase cannot tell you whether your record is one of them. Ask the Oklahoma State Bureau of Investigation before you pay for a petition you may not need.",
      OK_FREE_ROUTE_REFERRAL
    );
  }
  return wantsCheck;
}

/**
 * Tribal, federal, military and out-of-state records.
 *
 * An Oklahoma order does not reach them, and the design records tribal records
 * as a live post-McGirt question requiring explicit escalation rather than a
 * paragraph in a petition.
 */
function applyReachScreen(trackId: string, answers: Answers, key: string): void {
  if (yesNo(trackId, answers, key)) {
    throw new OklahomaEligibilityStopError(
      "ok-record-outside-oklahoma-reach",
      trackId,
      "A tribal court handled this case, or a tribal record exists for the same events. An Oklahoma district court order does not reach tribal, federal, military or out-of-state records, and which sovereign holds this record is a live question in Oklahoma that needs a lawyer rather than a generated petition.",
      OK_REFERRAL
    );
  }
}

// ---------------------------------------------------------------------------
// Fact derivation
// ---------------------------------------------------------------------------

/**
 * Turns the participant's answers into the fact bag the templates read.
 *
 * Every key the track declares is carried through, including the screening
 * answers that no template prints, because `resolvePacket` checks the declared
 * keys against this bag. Yes-or-no answers are never carried through raw: each
 * one becomes a sentence, so no document can render the word "no" on a line of
 * its own and leave a reader to guess what was asked.
 */
export function deriveOklahomaFacts(
  trackId: string,
  answers: Answers
): Record<string, string> {
  if (!OK_ASSIGNED_TRACK_IDS.includes(trackId)) {
    throw new OklahomaBranchError(trackId, "trackId", trackId, OK_ASSIGNED_TRACK_IDS);
  }

  if (trackId === "ok_991c_deferred") {
    const fullLegalName = need(trackId, answers, "dfcFullLegalName");
    const county = need(trackId, answers, "dfcCounty");
    const caseNumber = need(trackId, answers, "dfcCaseNumber");
    const completionDate = need(trackId, answers, "dfcCompletionDate");
    const arrestRecordGoal = yesNo(trackId, answers, "dfcArrestRecordGoal");

    if (arrestRecordGoal) {
      throw new OklahomaEligibilityStopError(
        "ok-991c-does-not-reach-the-arrest-record",
        trackId,
        "You have said your goal is that the arrest itself no longer shows. A 22 O.S. § 991c order updates the court record of a completed deferred sentence so the case shows as dismissed. The Oklahoma State Bureau of Investigation states directly that it does not remove the arrest record. Selling you this motion alone would leave you believing your record was clear when the arrest still shows. The arrest record is reached by a petition under 22 O.S. §§ 18 and 19.",
        OK_ARREST_RECORD_REFERRAL
      );
    }

    return {
      dfcFullLegalName: fullLegalName,
      dfcCounty: county,
      dfcCaseNumber: caseNumber,
      dfcCompletionDate: completionDate,
      dfcArrestRecordGoal: "no",
      fullLegalName,
      county,
      countyName: bareCountyName(county),
      caseNumber,
      completionDate,
      arrestRecordGoalStatement:
        "The movant states that the goal of this motion is the court record of this case, and that the movant understands this motion does not reach the arrest record.",
      packetCaseReference: `${bareCountyName(county)} County`
    };
  }

  const prefix = trackId === "ok_identity_theft" ? "ide" : trackId === "ok_vpo_60_18" ? "vpo" : "18_";
  const key = (suffix: string) => `${prefix}${suffix}`;

  const fullLegalName = need(trackId, answers, key("FullLegalName"));
  const dateOfBirth = need(trackId, answers, key("DateOfBirth"));
  const county = need(trackId, answers, key("County"));
  const caseAndArrestingAgency = need(trackId, answers, key("CaseNumber"));
  const offenceDescription = need(trackId, answers, key("OffenceDescription"));
  const dispositionAndDate = need(trackId, answers, key("DispositionAndDate"));
  const sameCountyArrests = listAnswer(answers, key("SameCountyArrests"));
  const priorRecord = listAnswer(answers, key("PriorRecord"));
  const restitutionPaid = yesNo(trackId, answers, key("Restitution"));

  applyReachScreen(trackId, answers, key("TribalRecord"));
  applyFreeRouteScreen(trackId, answers, key("FreeRouteChecked"));
  const arrestRecordToo = yesNo(trackId, answers, key("ArrestRecordToo"));

  const facts: Record<string, string> = {
    // Declared keys, carried through exactly as declared.
    [key("FullLegalName")]: fullLegalName,
    [key("DateOfBirth")]: dateOfBirth,
    [key("County")]: county,
    [key("CaseNumber")]: caseAndArrestingAgency,
    [key("OffenceDescription")]: offenceDescription,
    [key("DispositionAndDate")]: dispositionAndDate,
    [key("SameCountyArrests")]: str(answers, key("SameCountyArrests")) || "None stated.",
    [key("PriorRecord")]: str(answers, key("PriorRecord")) || "None stated.",
    [key("Restitution")]: restitutionPaid ? "yes" : "no",
    [key("TribalRecord")]: "no",
    [key("FreeRouteChecked")]: "no",
    [key("ArrestRecordToo")]: arrestRecordToo ? "yes" : "no",

    // Template placeholders.
    fullLegalName,
    dateOfBirth,
    county,
    countyName: bareCountyName(county),
    caseAndArrestingAgency,
    offenceDescription,
    dispositionAndDate,
    sameCountyArrests,
    priorRecord,
    restitutionStatement: restitutionPaid
      ? "The petitioner states that every fine, cost and restitution amount on this case has been paid in full."
      : "The petitioner states that not every fine, cost and restitution amount on this case has been paid. The petitioner has been told to ask the court clerk what remains owing before the hearing.",
    reachStatement:
      "The petitioner states that this case was not handled in a tribal court and that no tribal record exists for the same events. This petition asks nothing of any federal, tribal, military or out-of-state agency, and an order of this Court would not reach records they hold.",
    freeRouteStatement:
      "The petitioner has been told that Senate Bill 2030 provides for the sealing of certain records without a petition, and has chosen to bring this petition rather than wait for that route. Nothing in this petition states whether the petitioner is within that route.",
    arrestRecordStatement: arrestRecordToo
      ? "The petitioner asks that the record of the arrest be sealed as well as the record of the court case."
      : "The petitioner asks that the record of the court case be sealed. The petitioner has said that the arrest record is not part of this request.",
    arrestRecordRelief: arrestRecordToo
      ? "the records of the arrest and of the court case"
      : "the records of the court case",
    packetCaseReference: `${bareCountyName(county)} County`
  };

  switch (trackId) {
    case "ok_18_19_nonconviction": {
      const noRefile = yesNo(trackId, answers, "ncvNoRefile");
      if (!noRefile) {
        throw new OklahomaEligibilityStopError(
          "ok-no-refile-not-confirmed",
          trackId,
          "The prosecuting agency has not confirmed that this case will not be refiled. LegalEase cannot obtain that confirmation and will not assert it for you. Ask the district attorney's office in the county where the case was filed, and come back with what they tell you.",
          OK_REFERRAL
        );
      }
      facts.ncvNoRefile = "yes";
      facts.routeStatement =
        "This petition is brought on a record that did not end in a conviction. The petitioner states the disposition below in the words used on the record.";
      facts.noRefileStatement =
        "The petitioner states that the prosecuting agency has confirmed this case will not be refiled. That is the petitioner's account of what the agency said.";
      break;
    }
    case "ok_18_19_deferred_dismissal": {
      const completion = need(trackId, answers, "dfdCompletion");
      facts.dfdCompletion = completion;
      facts.routeStatement =
        "This petition is brought after a deferred or delayed sentence was completed and the case was then dismissed.";
      facts.deferredCompletionStatement = `The petitioner states when the deferred or delayed sentence was finished, and whether the case was then dismissed, as: ${completion}`;
      facts.nineNineOneCNote =
        "An order under 22 O.S. § 991c updates the court record of a completed deferred sentence so that the case shows as dismissed. The Oklahoma State Bureau of Investigation states that a § 991c expungement does not remove the arrest record. This petition is brought under §§ 18 and 19 and asks for the sealing of the records described above; it is not a § 991c motion and does not stand in place of one.";
      break;
    }
    case "ok_18_19_misdemeanor_conviction": {
      const sentence = need(trackId, answers, "misSentenceComplete");
      facts.misSentenceComplete = sentence;
      facts.routeStatement =
        "This petition is brought on a misdemeanour conviction.";
      facts.sentenceCompletionStatement = `The petitioner states when the sentence, including any probation, was finished and everything owed was paid, as: ${sentence}`;
      break;
    }
    case "ok_18_19_felony_conviction": {
      const reclassified = yesNo(trackId, answers, "felReclassified");
      const otherMisdemeanors = need(trackId, answers, "felOtherMisdemeanors");
      facts.felReclassified = reclassified ? "yes" : "no";
      facts.felOtherMisdemeanors = otherMisdemeanors;
      facts.routeStatement = "This petition is brought on a felony conviction.";
      facts.reclassifiedStatement = reclassified
        ? "The petitioner states that the offence they were convicted of has since been reclassified as a misdemeanour. Whether that reclassification places this record in a different § 18 category, with a different period, is for the Court and the agencies to determine from the section as it now reads. This petition does not state which category applies."
        : "The petitioner states that the offence they were convicted of has not since been reclassified as a misdemeanour.";
      facts.otherMisdemeanorStatement = `The petitioner states their separate misdemeanour convictions, and when they were, as follows. This petition records them and does not apply any look-back to them, because the look-back belongs to a category of § 18 that this petition does not assert: ${otherMisdemeanors}`;
      break;
    }
    case "ok_18_19_pardon": {
      const pardon = need(trackId, answers, "pdnPardonDate");
      facts.pdnPardonDate = pardon;
      facts.routeStatement =
        "This petition is brought after a pardon. Applying for a pardon is a matter for the Governor and the Pardon and Parole Board, and this packet does not do it; this route begins with a pardon the petitioner already holds.";
      facts.pardonStatement = `The petitioner states when the pardon was granted, and whether they hold the document, as: ${pardon}`;
      break;
    }
    case "ok_identity_theft": {
      const account = need(trackId, answers, "idtHowMisidentified");
      facts.idtHowMisidentified = account;
      facts.routeStatement =
        "The record is in the petitioner's name, and the petitioner says it is not theirs.";
      facts.misidentificationAccount = account;
      break;
    }
    case "ok_vpo_60_18": {
      const outcome = branch(
        trackId,
        "vpoOutcome",
        need(trackId, answers, "vpoOutcome"),
        OK_VPO_OUTCOMES
      );
      facts.vpoOutcome = outcome;
      facts.routeStatement =
        "This petition is brought on the records of a victim protective order matter under 22 O.S. § 60.18.";
      facts.protectiveOrderStatement = `The petitioner states that ${outcome}.`;
      break;
    }
    default:
      throw new OklahomaBranchError(trackId, "trackId", trackId, OK_ASSIGNED_TRACK_IDS);
  }

  return facts;
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
 * The caption's case-number line is a completion blank rather than an
 * interpolated value, and deliberately.
 *
 * The design collects the district court case number and the arresting agency
 * in one answer, and on the non-conviction route there may be no district court
 * case at all — a person who was arrested and never charged has an arrest
 * record and no case number. Printing a combined answer inside a caption line
 * that reads "Case No." would misdescribe the case, and printing nothing would
 * leave the caption wrong. The participant's whole answer is recited in the
 * body, where it is unambiguous, and the caption line is completed by hand from
 * the certified court record the design already requires before filing.
 */
const CAPTION_RIGHT = (documentLine: string): readonly string[] => [
  "Case No. ____________________",
  "(copy this from the certified",
  "court record; if no case was",
  "filed, write \"no case filed\")",
  "",
  documentLine
];

const CAPTION_LEFT: readonly string[] = [
  "STATE OF OKLAHOMA,",
  "",
  "Plaintiff,",
  "",
  "vs.",
  "",
  "THE PETITIONER NAMED BELOW,",
  "",
  "Defendant."
];

const CATEGORY_SECTION: Section = {
  heading: "THE CATEGORY UNDER SECTION 18 IS NOT STATED HERE",
  numbered: false,
  paragraphs: [
    "This petition does not say which category of 22 O.S. § 18 the record falls in, and it does not say that any period has run.",
    "Section 18 was amended in 2024, section 19 was amended in 2025, and Senate Bill 2030 amended both again in 2026. The paragraph numbering has moved with each amendment. The offence is therefore described above in the words used on the record, so that the Court, the prosecuting agency and the Oklahoma State Bureau of Investigation can match it against the section as it now reads rather than against a number that may have moved."
  ]
};

const EFFECT_SECTION: Section = {
  heading: "WHAT SEALING UNDER SECTION 19 DOES, AND WHAT IT DOES NOT DO",
  numbered: false,
  paragraphs: [
    "In Oklahoma, expungement means sealing. Title 22 defines it as the sealing of criminal records and of any public civil record involving actions brought by and against the State arising from the same arrest, transaction or occurrence.",
    "Sealing may be full or partial, and the difference matters. Fully sealed records are unavailable to the public and to law enforcement, with the Oklahoma State Bureau of Investigation retaining them for research and statistical purposes. Partially sealed records are hidden from the public but remain available to law enforcement. Which of the two an order produces is a material difference in outcome, and this petition does not predict which one this Court would order.",
    "Section 19 does not authorise the physical destruction of any record. A sealed record may be unsealed later on a finding of changed conditions or a compelling reason, and under § 19(N) a record ordered sealed that is not unsealed within ten years may be obliterated or destroyed at the end of that period.",
    "An Oklahoma order does not bind federal, tribal, military or out-of-state agencies and does not reach records they hold."
  ]
};

const NOTICE_SECTION: Section = {
  heading: "NOTICE AND HEARING",
  numbered: false,
  paragraphs: [
    "Title 22 section 19 puts the notice on the Court. On the filing of this petition the Court sets a hearing and gives thirty days' notice to the prosecuting agency, the arresting agency, the Oklahoma State Bureau of Investigation and any other agency the Court finds holds relevant records.",
    "The petitioner does not serve those agencies and no certificate of service is included in this packet, because on this route the petitioner is not the one who gives notice."
  ]
};

const COSTS_SECTION: Section = {
  heading: "COSTS",
  numbered: false,
  paragraphs: [
    "No monetary amount is stated anywhere in this petition, and that is deliberate.",
    "The Oklahoma State Bureau of Investigation publishes that expunging a court record is free and that expunging an arrest record carries a processing fee. The Bureau accepts a cashier's check or a money order for it and does not accept personal checks. That payment goes to the Bureau, not to this Court, and there may be charges from local law enforcement agencies as well.",
    "The district court filing fee for this county was not established when this packet was prepared, so this petition does not state one. Ask the court clerk what the filing fee is before filing, and ask the clerk what to do if you cannot pay it.",
    "LegalEase does not collect, forward or handle any payment in this process."
  ]
};

const FREE_ROUTE_SECTION: Section = {
  heading: "SEALING WITHOUT A PETITION",
  numbered: false,
  paragraphs: [
    "Senate Bill 2030, enacted in 2026, amended 22 O.S. §§ 18 and 19. It provides for the sealing of certain records without a petition, requires the Oklahoma State Bureau of Investigation to establish a request portal, and preserves the right to petition.",
    "Its enrolled text had not been read when this packet was prepared. This petition therefore does not state that the petitioner is within that route, and it does not state that the petitioner is outside it.",
    "{{freeRouteStatement}}",
    "If you have not already done so, ask the Oklahoma State Bureau of Investigation whether this record is one that will be sealed without a petition before you pay for anything."
  ]
};

/** The self-help boundaries the design records, printed on the face of the filing. */
function stopSection(extra: readonly string[]): Section {
  return {
    heading: "WHERE THIS PACKET STOPS",
    numbered: false,
    paragraphs: [
      "LegalEase prepares documents from what the petitioner says. It does not give legal advice, does not check any record, and does not appear in court. Some parts of this matter are outside what a prepared packet can do, and they are named here rather than left to be discovered at the hearing.",
      ...extra,
      "Which category of § 18 applies, and whether any period has run. The section has been amended three years running and this packet does not read it for you.",
      "Any objection by the prosecuting agency, and any contested hearing. If the agency objects, this stops being a paperwork matter.",
      "Records in more than one Oklahoma county. One petition covers one county; arrests in the same county may be combined in a single petition, but a record in another county needs its own petition in that county's district court.",
      "Federal, tribal, military and out-of-state records, which an Oklahoma order does not reach.",
      "Any immigration consequence. Nothing in this packet is advice about immigration, and sealing an Oklahoma record is not represented as having any immigration effect.",
      `Where any of these applies, speak to a lawyer before filing. ${OK_REFERRAL}`
    ]
  };
}

const PETITION_SIGNATURE_BLOCK: readonly string[] = [
  "Printed name: ______________________________",
  "Address: ___________________________________",
  "Telephone: _________________________________",
  "Email: _____________________________________",
  "Date: ______________________________________",
  "",
  "Sign this by hand. Oklahoma law does not prescribe notarization for this petition and no notarial block is printed here. Ask the court clerk whether the clerk wants a notarized signature, and if so, sign in front of a notary rather than beforehand."
];

const VERIFICATION =
  "I am the petitioner. I have read this petition and the statements in it are mine and are true to the best of my knowledge. I understand that no one at LegalEase has seen my records, checked whether I am eligible, or given me legal advice, and that whether these records may be sealed is for the Court to decide.";

// ---------------------------------------------------------------------------
// Template builders
// ---------------------------------------------------------------------------

type PetitionSpec = {
  templateId: string;
  captionRightLine: string;
  title: string;
  authorityLine: string;
  /**
   * Route-specific allegations, appended to the shared ones.
   *
   * They join a single numbered list rather than opening a second one: the
   * shared renderer restarts numbering at 1 in every numbered section, so two
   * numbered sections would produce two paragraphs numbered "1." in one filing.
   */
  recordAllegations: readonly string[];
  /** Route-specific narrative, never numbered, placed after the allegations. */
  extraSections: readonly Section[];
  /**
   * How the two shared record allegations name the thing being cleared.
   *
   * A victim protective order matter is not an offence and calling it one in a
   * filing would misdescribe it, so the noun is a route property rather than a
   * fixed word.
   */
  recordNoun?: { subject: string; ending: string };
  extraStops: readonly string[];
  prayerRelief: string;
};

function petitionTemplate(spec: PetitionSpec): PleadingTemplate {
  return {
    templateId: spec.templateId,
    version: VERSION,
    technicalFixture: true,
    fixtureBanner: BANNER,
    caption: {
      courtLine: "IN THE DISTRICT COURT OF {{countyName}} COUNTY, STATE OF OKLAHOMA",
      partyBlockLeft: CAPTION_LEFT,
      partyBlockRight: CAPTION_RIGHT(spec.captionRightLine)
    },
    title: spec.title,
    preamble:
      "Prepared by LegalEase from the answers the petitioner gave. LegalEase has not seen the petitioner's records, has not decided whether the petitioner is eligible, does not file anything and does not appear. Every statement of fact below is the petitioner's own.",
    sections: [
      {
        heading: "ALLEGATIONS",
        numbered: true,
        paragraphs: [
          "The petitioner gives their full legal name, and any other name they have used, as: {{fullLegalName}}",
          "The petitioner's date of birth is {{dateOfBirth}}.",
          `The arrest information in this matter is located in {{countyName}} County, Oklahoma, and this petition is brought in the District Court of that county. ${spec.authorityLine}`,
          "The petitioner gives the district court case number and the arresting agency as: {{caseAndArrestingAgency}}",
          "{{routeStatement}}",
          `${spec.recordNoun?.subject ?? "The offence, described in the words used on the record rather than by any category number:"} {{offenceDescription}}`,
          `${spec.recordNoun?.ending ?? "How the case ended, and when, as the petitioner states it:"} {{dispositionAndDate}}`,
          ...spec.recordAllegations,
          "{{restitutionStatement}}",
          "{{arrestRecordStatement}}"
        ]
      },
      ...spec.extraSections,
      {
        heading: "OTHER RECORDS, AS THE PETITIONER STATES THEM",
        numbered: false,
        paragraphs: [
          "These are the petitioner's own statements, set out in one place so that the Court, the prosecuting agency and the Oklahoma State Bureau of Investigation have them. No one has checked them against any record.",
          "Other arrests in {{countyName}} County:",
          "{{sameCountyArrests}}",
          "Other convictions or pending charges anywhere:",
          "{{priorRecord}}",
          "{{reachStatement}}"
        ]
      },
      CATEGORY_SECTION,
      EFFECT_SECTION,
      NOTICE_SECTION,
      COSTS_SECTION,
      FREE_ROUTE_SECTION,
      stopSection(spec.extraStops)
    ],
    prayer: [
      `WHEREFORE the petitioner asks the Court to set this petition for hearing, to give the notice 22 O.S. § 19 requires, and, on the showing made at that hearing, to order ${spec.prayerRelief} sealed.`,
      "The petitioner asks the Court to state in its order every agency to which the order applies, so that each of them can act on it.",
      "The petitioner makes no claim about what the Court will decide. This petition asks; it does not predict."
    ],
    verification: VERIFICATION,
    signatureLabel: "Petitioner, self-represented",
    signatureBlock: PETITION_SIGNATURE_BLOCK
  };
}

type OrderSpec = {
  templateId: string;
  captionRightLine: string;
  title: string;
  recital: string;
  orderedParagraphs: readonly string[];
};

/**
 * A proposed order.
 *
 * It is written in the Court's voice because that is what a proposed order is,
 * and it says on its face, twice, that it is not an order and that nothing in it
 * is a finding until a judge signs it. It carries no participant signature rule
 * — the petitioner does not sign an order — and its execution block is the
 * judge's, left blank, with an instruction not to complete it.
 */
function orderTemplate(spec: OrderSpec): PleadingTemplate {
  return {
    templateId: spec.templateId,
    version: VERSION,
    technicalFixture: true,
    fixtureBanner: BANNER,
    caption: {
      courtLine: "IN THE DISTRICT COURT OF {{countyName}} COUNTY, STATE OF OKLAHOMA",
      partyBlockLeft: CAPTION_LEFT,
      partyBlockRight: CAPTION_RIGHT(spec.captionRightLine)
    },
    title: spec.title,
    preamble:
      "PROPOSED — NOT YET MADE. This document is prepared by the petitioner for the Court's consideration and lodged with the petition. It is not an order of the Court, it has no effect, and nothing written in it is a finding of this Court unless and until a judge signs it.",
    sections: [
      {
        heading: "THE MATTER",
        numbered: false,
        paragraphs: [
          spec.recital,
          "The petitioner is {{fullLegalName}}, date of birth {{dateOfBirth}}.",
          "The case and the arresting agency, as the petitioner states them: {{caseAndArrestingAgency}}"
        ]
      },
      {
        heading: "AGENCIES TO WHICH THIS ORDER WOULD APPLY",
        numbered: false,
        paragraphs: [
          "An order under 22 O.S. § 19 has to name the agencies it reaches, because each of them acts on it separately. Those known from the petitioner's answers and from the section itself are:",
          "— The Oklahoma State Bureau of Investigation.",
          "— The arresting agency, and the case it arose from, as the petitioner identifies them: {{caseAndArrestingAgency}}",
          "— The office of the district attorney for {{countyName}} County, as the prosecuting agency.",
          "— The court clerk of {{countyName}} County.",
          "Any other agency holding records of this case must be added below before this order is lodged. The petitioner is the only person who knows which ones exist — a jail, a municipal police department, a probation office or a licensing body may each hold something.",
          "— ______________________________________________",
          "— ______________________________________________",
          "— ______________________________________________"
        ]
      },
      {
        heading: "PROPOSED ORDER",
        numbered: true,
        paragraphs: [...spec.orderedParagraphs]
      },
      {
        heading: "WHAT THIS ORDER WOULD NOT DO",
        numbered: false,
        paragraphs: [
          "Title 22 section 19 does not authorise the physical destruction of records, so no order made under it can direct that this record be destroyed.",
          "It would not reach federal, tribal, military or out-of-state records, or bind the agencies that hold them.",
          "It would not be permanent as a matter of course. A sealed record may be unsealed later on a finding of changed conditions or a compelling reason, and under § 19(N) a record ordered sealed that is not unsealed within ten years may be obliterated or destroyed at the end of that period."
        ]
      },
      {
        heading: "BEFORE YOU LODGE THIS",
        numbered: false,
        paragraphs: [
          "Add every other agency you know of to the blank lines above.",
          "Leave the judge's signature and the date blank. Do not sign this document and do not date it. It is signed by the Court, if the Court grants the petition, and not before.",
          "Take it to the court clerk with the petition. The clerk will tell you how many copies the judge wants."
        ]
      }
    ],
    prayer: [],
    signatureLabel: null,
    signatureBlock: [
      "_________________________________________",
      "Judge of the District Court",
      "",
      "Date signed: ______________________________",
      "",
      "This block is the Court's. Leave every line of it blank."
    ]
  };
}

// ---------------------------------------------------------------------------
// The seven § 18 and § 19 routes
// ---------------------------------------------------------------------------

const SECTION_18_AUTHORITY = "22 O.S. §§ 18 and 19.";

const NONCONVICTION_PETITION = petitionTemplate({
  templateId: "ok_18_19_nonconviction-petition",
  captionRightLine: "PETITION TO SEAL RECORDS",
  title: "PETITION TO SEAL RECORDS UNDER 22 O.S. §§ 18 AND 19 — RECORD THAT DID NOT END IN A CONVICTION",
  authorityLine: SECTION_18_AUTHORITY,
  recordAllegations: ["{{noRefileStatement}}"],
  extraSections: [
    {
      heading: "ABOUT THE PROSECUTING AGENCY'S POSITION",
      numbered: false,
      paragraphs: [
        "LegalEase did not obtain and does not hold any confirmation from the prosecuting agency, and nothing in this petition is that agency's statement. What the allegations record is the petitioner's account of what the agency said."
      ]
    }
  ],
  extraStops: [
    "Whether the prosecuting agency will refile. LegalEase does not ask the agency and does not hold anything from it; what this petition records is the petitioner's account of what the agency said."
  ],
  prayerRelief: "{{arrestRecordRelief}}"
});

const NONCONVICTION_ORDER = orderTemplate({
  templateId: "ok_18_19_nonconviction-order",
  captionRightLine: "PROPOSED ORDER",
  title: "ORDER SEALING RECORDS UNDER 22 O.S. § 19 (PROPOSED — NOT YET MADE)",
  recital:
    "This matter comes before the Court on the petitioner's petition to seal the records of a case that did not end in a conviction, brought under 22 O.S. §§ 18 and 19, the Court having given the notice § 19 requires.",
  orderedParagraphs: [
    "IT IS ORDERED that the records of the arrest, the charge and the disposition described in the petition are sealed under 22 O.S. § 19.",
    "IT IS FURTHER ORDERED that each agency named above seal the records of this matter that it holds.",
    "IT IS FURTHER ORDERED that the court clerk seal the court file in this matter.",
    "IT IS FURTHER ORDERED that nothing in this order authorises the destruction of any record."
  ]
});

const DEFERRED_DISMISSAL_PETITION = petitionTemplate({
  templateId: "ok_18_19_deferred_dismissal-petition",
  captionRightLine: "PETITION TO SEAL RECORDS",
  title: "PETITION TO SEAL RECORDS UNDER 22 O.S. §§ 18 AND 19 — AFTER A DEFERRED OR DELAYED SENTENCE WAS DISMISSED",
  authorityLine: SECTION_18_AUTHORITY,
  recordAllegations: ["{{deferredCompletionStatement}}"],
  extraSections: [
    {
      heading: "THIS IS NOT A SECTION 991c MOTION",
      numbered: false,
      paragraphs: ["{{nineNineOneCNote}}"]
    }
  ],
  extraStops: [
    "A case where only a 22 O.S. § 991c order has been obtained. That order updates the court record and leaves the arrest record in place, and what to do next depends on which of the two you already have."
  ],
  prayerRelief: "{{arrestRecordRelief}}"
});

const DEFERRED_DISMISSAL_ORDER = orderTemplate({
  templateId: "ok_18_19_deferred_dismissal-order",
  captionRightLine: "PROPOSED ORDER",
  title: "ORDER SEALING RECORDS UNDER 22 O.S. § 19 (PROPOSED — NOT YET MADE)",
  recital:
    "This matter comes before the Court on the petitioner's petition to seal the records of a case dismissed after a deferred or delayed sentence was completed, brought under 22 O.S. §§ 18 and 19, the Court having given the notice § 19 requires.",
  orderedParagraphs: [
    "IT IS ORDERED that the records of the arrest, the charge and the disposition described in the petition are sealed under 22 O.S. § 19.",
    "IT IS FURTHER ORDERED that each agency named above seal the records of this matter that it holds.",
    "IT IS FURTHER ORDERED that the court clerk seal the court file in this matter.",
    "IT IS FURTHER ORDERED that nothing in this order authorises the destruction of any record."
  ]
});

const MISDEMEANOR_PETITION = petitionTemplate({
  templateId: "ok_18_19_misdemeanor_conviction-petition",
  captionRightLine: "PETITION TO SEAL RECORDS",
  title: "PETITION TO SEAL RECORDS UNDER 22 O.S. §§ 18 AND 19 — MISDEMEANOUR CONVICTION",
  authorityLine: SECTION_18_AUTHORITY,
  recordAllegations: ["{{sentenceCompletionStatement}}"],
  extraSections: [],
  extraStops: [
    "Any calculation of the period that has to pass before a misdemeanour conviction may be sealed. The categories were amended again in 2026 and this packet does not compute a period or say that one has run."
  ],
  prayerRelief: "{{arrestRecordRelief}}"
});

const MISDEMEANOR_ORDER = orderTemplate({
  templateId: "ok_18_19_misdemeanor_conviction-order",
  captionRightLine: "PROPOSED ORDER",
  title: "ORDER SEALING RECORDS UNDER 22 O.S. § 19 (PROPOSED — NOT YET MADE)",
  recital:
    "This matter comes before the Court on the petitioner's petition to seal the records of a misdemeanour conviction, brought under 22 O.S. §§ 18 and 19, the Court having given the notice § 19 requires.",
  orderedParagraphs: [
    "IT IS ORDERED that the records of the arrest, the charge, the conviction and the disposition described in the petition are sealed under 22 O.S. § 19.",
    "IT IS FURTHER ORDERED that each agency named above seal the records of this matter that it holds.",
    "IT IS FURTHER ORDERED that the court clerk seal the court file in this matter.",
    "IT IS FURTHER ORDERED that nothing in this order authorises the destruction of any record."
  ]
});

const FELONY_PETITION = petitionTemplate({
  templateId: "ok_18_19_felony_conviction-petition",
  captionRightLine: "PETITION TO SEAL RECORDS",
  title: "PETITION TO SEAL RECORDS UNDER 22 O.S. §§ 18 AND 19 — FELONY CONVICTION",
  authorityLine: SECTION_18_AUTHORITY,
  recordAllegations: ["{{reclassifiedStatement}}", "{{otherMisdemeanorStatement}}"],
  extraSections: [],
  extraStops: [
    "Which felony route applies, and any period attaching to it. The reclassified-offence route and the single-felony route carry different conditions, and the categories were amended again in 2026. This packet records what the petitioner says and states no category and no period."
  ],
  prayerRelief: "{{arrestRecordRelief}}"
});

const FELONY_ORDER = orderTemplate({
  templateId: "ok_18_19_felony_conviction-order",
  captionRightLine: "PROPOSED ORDER",
  title: "ORDER SEALING RECORDS UNDER 22 O.S. § 19 (PROPOSED — NOT YET MADE)",
  recital:
    "This matter comes before the Court on the petitioner's petition to seal the records of a felony conviction, brought under 22 O.S. §§ 18 and 19, the Court having given the notice § 19 requires.",
  orderedParagraphs: [
    "IT IS ORDERED that the records of the arrest, the charge, the conviction and the disposition described in the petition are sealed under 22 O.S. § 19.",
    "IT IS FURTHER ORDERED that each agency named above seal the records of this matter that it holds.",
    "IT IS FURTHER ORDERED that the court clerk seal the court file in this matter.",
    "IT IS FURTHER ORDERED that nothing in this order authorises the destruction of any record."
  ]
});

const PARDON_PETITION = petitionTemplate({
  templateId: "ok_18_19_pardon-petition",
  captionRightLine: "PETITION TO SEAL RECORDS",
  title: "PETITION TO SEAL RECORDS UNDER 22 O.S. §§ 18 AND 19 — AFTER A PARDON",
  authorityLine: SECTION_18_AUTHORITY,
  recordAllegations: ["{{pardonStatement}}"],
  extraSections: [],
  extraStops: [
    "Applying for the pardon itself. That is a matter for the Governor and the Pardon and Parole Board, and this packet does not prepare an application to either of them."
  ],
  prayerRelief: "{{arrestRecordRelief}}"
});

const PARDON_ORDER = orderTemplate({
  templateId: "ok_18_19_pardon-order",
  captionRightLine: "PROPOSED ORDER",
  title: "ORDER SEALING RECORDS UNDER 22 O.S. § 19 (PROPOSED — NOT YET MADE)",
  recital:
    "This matter comes before the Court on the petitioner's petition to seal records following a pardon, brought under 22 O.S. §§ 18 and 19, the Court having given the notice § 19 requires.",
  orderedParagraphs: [
    "IT IS ORDERED that the records of the arrest, the charge, the conviction and the disposition described in the petition are sealed under 22 O.S. § 19.",
    "IT IS FURTHER ORDERED that each agency named above seal the records of this matter that it holds.",
    "IT IS FURTHER ORDERED that the court clerk seal the court file in this matter.",
    "IT IS FURTHER ORDERED that nothing in this order authorises the destruction of any record."
  ]
});

const IDENTITY_THEFT_PETITION = petitionTemplate({
  templateId: "ok_identity_theft-petition",
  captionRightLine: "PETITION TO SEAL RECORDS",
  title: "PETITION TO SEAL RECORDS UNDER 22 O.S. §§ 18, 19 AND 19a — RECORD THAT IS NOT THE PETITIONER'S",
  authorityLine: "22 O.S. §§ 18, 19 and 19a.",
  recordNoun: {
    subject:
      "The offence recorded against the petitioner's name, described in the words used on the record rather than by any category number:",
    ending: "How that case ended, and when, as the petitioner states it:"
  },
  recordAllegations: [],
  extraSections: [
    {
      heading: "HOW THE PETITIONER'S NAME CAME TO BE ON THIS RECORD",
      numbered: false,
      paragraphs: [
        "What follows is the petitioner's own account, in the petitioner's own words. LegalEase has not investigated it, has not corroborated it and does not assert it. Whether this record belongs to the petitioner is for the Court to determine on the evidence.",
        "{{misidentificationAccount}}"
      ]
    }
  ],
  extraStops: [
    "Any dispute about whether the petitioner is the person the record describes. If anyone contests that — the prosecuting agency, the arresting agency or the Bureau — this stops being a paperwork matter and becomes one that needs a lawyer."
  ],
  prayerRelief: "{{arrestRecordRelief}}"
});

const IDENTITY_THEFT_ORDER = orderTemplate({
  templateId: "ok_identity_theft-order",
  captionRightLine: "PROPOSED ORDER",
  title: "ORDER SEALING RECORDS UNDER 22 O.S. §§ 19 AND 19a (PROPOSED — NOT YET MADE)",
  recital:
    "This matter comes before the Court on the petitioner's petition to seal a record created in the petitioner's name that the petitioner says is not theirs, brought under 22 O.S. §§ 18, 19 and 19a, the Court having given the notice § 19 requires.",
  orderedParagraphs: [
    "IT IS ORDERED that the records of the arrest, the charge and the disposition described in the petition are sealed under 22 O.S. § 19.",
    "IT IS FURTHER ORDERED that each agency named above seal the records of this matter that it holds, and that each of them take the steps 22 O.S. § 19a requires of it.",
    "IT IS FURTHER ORDERED that the court clerk seal the court file in this matter.",
    "IT IS FURTHER ORDERED that nothing in this order authorises the destruction of any record."
  ]
});

const VPO_PETITION = petitionTemplate({
  templateId: "ok_vpo_60_18-petition",
  captionRightLine: "PETITION TO SEAL RECORDS",
  title: "PETITION TO SEAL VICTIM PROTECTIVE ORDER RECORDS UNDER 22 O.S. § 60.18",
  authorityLine: "22 O.S. § 60.18.",
  recordNoun: {
    subject: "The matter, described in the words used on the record:",
    ending: "How the matter ended, and when, as the petitioner states it:"
  },
  recordAllegations: ["{{protectiveOrderStatement}}"],
  extraSections: [
    {
      heading: "THIS PETITION DOES NOT STATE WHAT SECTION 60.18 REQUIRES",
      numbered: false,
      paragraphs: [
        "Title 22 section 60.18 provides for the expungement of victim protective order records. Its text had not been read when this packet was prepared, so this petition asks for relief under the section and sets out the petitioner's facts without stating the section's conditions and without saying that they are met.",
        "Read the section, or have a lawyer read it with you, before you file. A protective order record is not an ordinary criminal record and the people named in it have their own interests."
      ]
    }
  ],
  extraStops: [
    "Every part of a protective order matter that turns on what 22 O.S. § 60.18 requires. The section's conditions were not established when this packet was prepared, so a lawyer should look at this before it is filed."
  ],
  prayerRelief: "the records of this protective order matter"
});

const VPO_ORDER = orderTemplate({
  templateId: "ok_vpo_60_18-order",
  captionRightLine: "PROPOSED ORDER",
  title: "ORDER EXPUNGING VICTIM PROTECTIVE ORDER RECORDS UNDER 22 O.S. § 60.18 (PROPOSED — NOT YET MADE)",
  recital:
    "This matter comes before the Court on the petitioner's petition to expunge the records of a victim protective order matter, brought under 22 O.S. § 60.18.",
  orderedParagraphs: [
    "IT IS ORDERED that the records of the protective order matter described in the petition are expunged under 22 O.S. § 60.18.",
    "IT IS FURTHER ORDERED that each agency named above seal or expunge the records of this matter that it holds, as § 60.18 provides.",
    "IT IS FURTHER ORDERED that the court clerk seal the court file in this matter.",
    "IT IS FURTHER ORDERED that nothing in this order authorises the destruction of any record."
  ]
});

// ---------------------------------------------------------------------------
// The § 991c route
// ---------------------------------------------------------------------------

/**
 * Quoted on the face of both § 991c documents, so it names neither of them.
 *
 * A limit that reads "this motion" inside an order, or "this order" inside a
 * motion, tells the reader the wrong thing about the instrument in their hand.
 */
const NINE_NINE_ONE_C_LIMIT =
  "The Oklahoma State Bureau of Investigation states that a section 991c expungement will not expunge the arrest record. A section 991c order updates the court record of a case so that it shows as dismissed. It does not remove the arrest. Anyone who is told that a section 991c order clears their record has been told something that is not so. Clearing the arrest record needs a separate petition under 22 O.S. §§ 18 and 19, which is a different filing with its own process and its own cost.";

const NINE_NINE_ONE_C_MOTION: PleadingTemplate = {
  templateId: "ok_991c_deferred-motion",
  version: VERSION,
  technicalFixture: true,
  fixtureBanner: BANNER,
  caption: {
    courtLine: "IN THE DISTRICT COURT OF {{countyName}} COUNTY, STATE OF OKLAHOMA",
    partyBlockLeft: [
      "STATE OF OKLAHOMA,",
      "",
      "Plaintiff,",
      "",
      "vs.",
      "",
      "THE MOVANT NAMED BELOW,",
      "",
      "Defendant."
    ],
    partyBlockRight: ["Case No. {{caseNumber}}", "", "MOTION UNDER 22 O.S. § 991c"]
  },
  title: "MOTION TO UPDATE THE COURT RECORD OF A COMPLETED DEFERRED SENTENCE UNDER 22 O.S. § 991c",
  preamble:
    "Prepared by LegalEase from the answers the movant gave. LegalEase has not seen the movant's records, has not decided whether the movant is entitled to this relief, does not file anything and does not appear. Every statement of fact below is the movant's own.",
  sections: [
    {
      heading: "THE MOVANT AND THE CASE",
      numbered: true,
      paragraphs: [
        "The movant is {{fullLegalName}}, the defendant in the case identified above.",
        "This motion is brought in the District Court of {{countyName}} County, which is the court that entered the deferred sentence. 22 O.S. § 991c. The movant gives the county and the court that handled the case as: {{county}}",
        "The case number is {{caseNumber}}.",
        "The movant states when the deferred sentence and everything it required were finished, as: {{completionDate}}"
      ]
    },
    {
      heading: "WHAT THIS MOTION DOES NOT DO",
      numbered: false,
      paragraphs: [NINE_NINE_ONE_C_LIMIT, "{{arrestRecordGoalStatement}}"]
    },
    {
      heading: "NOTICE, SERVICE AND COST",
      numbered: false,
      paragraphs: [
        "Section 991c does not state a notice requirement or a service requirement that this packet could carry out, and none was established when this packet was prepared. Ask the court clerk what the clerk requires before you file, and ask whether the district attorney's office expects a copy.",
        "No monetary amount is stated in this motion. The Oklahoma State Bureau of Investigation publishes that expunging a court record is free, and that a separate arrest-record expungement carries a processing fee payable to the Bureau by cashier's check or money order. LegalEase does not collect, forward or handle any payment."
      ]
    },
    {
      heading: "WHERE THIS PACKET STOPS",
      numbered: false,
      paragraphs: [
        "LegalEase prepares documents from what the movant says. It does not give legal advice, does not check any record, and does not appear in court.",
        "If what you actually want is for the arrest to stop showing, this motion is not the filing you need and it should not be filed on its own.",
        "Federal, tribal, military and out-of-state records, which an Oklahoma order does not reach.",
        "Any immigration consequence. Nothing in this packet is advice about immigration.",
        `Where any of these applies, speak to a lawyer before filing. ${OK_REFERRAL}`
      ]
    }
  ],
  prayer: [
    "WHEREFORE the movant asks the Court to order that the record of this case be updated under 22 O.S. § 991c so that it shows the case as dismissed.",
    "The movant makes no claim about what the Court will decide. This motion asks; it does not predict."
  ],
  verification:
    "I am the movant. I have read this motion and the statements in it are mine and are true to the best of my knowledge. I understand that no one at LegalEase has seen my records, checked whether I am entitled to this, or given me legal advice, and that this is for the Court to decide.",
  signatureLabel: "Movant, self-represented",
  signatureBlock: [
    "Printed name: ______________________________",
    "Address: ___________________________________",
    "Telephone: _________________________________",
    "Email: _____________________________________",
    "Date: ______________________________________",
    "",
    "Sign this by hand. Section 991c does not prescribe notarization and no notarial block is printed here. Ask the court clerk whether the clerk wants a notarized signature, and if so, sign in front of a notary rather than beforehand."
  ]
};

const NINE_NINE_ONE_C_ORDER: PleadingTemplate = {
  templateId: "ok_991c_deferred-order",
  version: VERSION,
  technicalFixture: true,
  fixtureBanner: BANNER,
  caption: {
    courtLine: "IN THE DISTRICT COURT OF {{countyName}} COUNTY, STATE OF OKLAHOMA",
    partyBlockLeft: [
      "STATE OF OKLAHOMA,",
      "",
      "Plaintiff,",
      "",
      "vs.",
      "",
      "THE MOVANT NAMED BELOW,",
      "",
      "Defendant."
    ],
    partyBlockRight: ["Case No. {{caseNumber}}", "", "PROPOSED ORDER"]
  },
  title: "ORDER UNDER 22 O.S. § 991c (PROPOSED — NOT YET MADE)",
  preamble:
    "PROPOSED — NOT YET MADE. This document is prepared by the movant for the Court's consideration and lodged with the motion. It is not an order of the Court, it has no effect, and nothing written in it is a finding of this Court unless and until a judge signs it.",
  sections: [
    {
      heading: "THE MATTER",
      numbered: false,
      paragraphs: [
        "This matter comes before the Court on the movant's motion under 22 O.S. § 991c to update the record of this case following completion of a deferred sentence.",
        "The movant is {{fullLegalName}}. The case number is {{caseNumber}}."
      ]
    },
    {
      heading: "PROPOSED ORDER",
      numbered: true,
      paragraphs: [
        "IT IS ORDERED that the record of this case be updated under 22 O.S. § 991c to show that the case was dismissed.",
        "IT IS FURTHER ORDERED that the court clerk enter this order on the docket of this case.",
        "IT IS FURTHER ORDERED that nothing in this order authorises the destruction of any record."
      ]
    },
    {
      heading: "WHAT THIS ORDER WOULD NOT DO",
      numbered: false,
      paragraphs: [
        NINE_NINE_ONE_C_LIMIT,
        "It would not reach federal, tribal, military or out-of-state records, or bind the agencies that hold them.",
        "It would leave the arrest record held by the Oklahoma State Bureau of Investigation and by the arresting agency exactly as it is. Anyone running a criminal history check would still see the arrest."
      ]
    },
    {
      heading: "BEFORE YOU LODGE THIS",
      numbered: false,
      paragraphs: [
        "Leave the judge's signature and the date blank. Do not sign this document and do not date it. It is signed by the Court, if the Court grants the motion, and not before.",
        "Take it to the court clerk with the motion."
      ]
    }
  ],
  prayer: [],
  signatureLabel: null,
  signatureBlock: [
    "_________________________________________",
    "Judge of the District Court",
    "",
    "Date signed: ______________________________",
    "",
    "This block is the Court's. Leave every line of it blank."
  ]
};

// ---------------------------------------------------------------------------
// Template registry
// ---------------------------------------------------------------------------

function buildTemplates(): Record<string, PleadingTemplate> {
  const templates: Record<string, PleadingTemplate> = {};
  const all = [
    NONCONVICTION_PETITION,
    NONCONVICTION_ORDER,
    DEFERRED_DISMISSAL_PETITION,
    DEFERRED_DISMISSAL_ORDER,
    MISDEMEANOR_PETITION,
    MISDEMEANOR_ORDER,
    FELONY_PETITION,
    FELONY_ORDER,
    PARDON_PETITION,
    PARDON_ORDER,
    IDENTITY_THEFT_PETITION,
    IDENTITY_THEFT_ORDER,
    VPO_PETITION,
    VPO_ORDER,
    NINE_NINE_ONE_C_MOTION,
    NINE_NINE_ONE_C_ORDER
  ];
  for (const template of all) templates[template.templateId] = template;
  return templates;
}

export const OKLAHOMA_PLEADING_TEMPLATES: Readonly<Record<string, PleadingTemplate>> =
  buildTemplates();

// ---------------------------------------------------------------------------
// Packet sets and tracks
// ---------------------------------------------------------------------------

const PENDING_APPROVAL = {
  visual: "not_reviewed",
  legal: "not_submitted"
} as const;

/**
 * Design role → engine role.
 *
 * Oklahoma's adopted design names two custom-pleading roles per route and both
 * of them exist in `PacketComponentRole` already, so this map is an identity
 * map rather than a reinterpretation. It is stated anyway, and asserted by the
 * verifier, so that a later change to either vocabulary is caught rather than
 * silently absorbed. The **componentId is pinned exactly as the design assigns
 * it** — that is what carries assignment fidelity.
 *
 *   primary_filing  → primary_filing   (the petition, or the § 991c motion)
 *   proposed_order  → proposed_order   (lodged unsigned; the Court signs it)
 */
export const OK_DESIGN_ROLE_TO_ENGINE_ROLE: Readonly<
  Record<string, PacketSet["components"][number]["role"]>
> = {
  primary_filing: "primary_filing",
  proposed_order: "proposed_order"
};

type ComponentSpec = {
  componentId: string;
  designRole: keyof typeof OK_DESIGN_ROLE_TO_ENGINE_ROLE;
  templateId: string;
  order: number;
};

function packetSet(trackId: string, specs: readonly ComponentSpec[]): PacketSet {
  for (const spec of specs) {
    if (!OKLAHOMA_PLEADING_TEMPLATES[spec.templateId]) {
      throw new Error(`${spec.componentId}: no Oklahoma template ${spec.templateId} is registered.`);
    }
  }
  return {
    packetSetId: `${trackId}-set`,
    version: VERSION,
    components: specs.map((spec) => ({
      componentId: spec.componentId,
      role: OK_DESIGN_ROLE_TO_ENGINE_ROLE[spec.designRole],
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

/**
 * The twelve questions the design asks on every § 18 route.
 *
 * `RequiredInput` carries only a key, a label and a required flag, so the
 * design's `conditionDescription` — the reason a question is asked — is folded
 * into the label where it changes what a good answer looks like.
 */
function sectionEighteenInputs(prefix: string): readonly RequiredInput[] {
  return [
    {
      key: `${prefix}FullLegalName`,
      label: "What is your full legal name, and have you used any other names?",
      required: true
    },
    { key: `${prefix}DateOfBirth`, label: "What is your date of birth?", required: true },
    {
      key: `${prefix}County`,
      label:
        "In which Oklahoma county is the arrest information located? Venue is the district court of that county, and arrests in the same county may be combined in one petition while a record in another county needs its own.",
      required: true
    },
    {
      key: `${prefix}CaseNumber`,
      label: "What is the district court case number, and what was the arresting agency?",
      required: true
    },
    {
      key: `${prefix}OffenceDescription`,
      label:
        "Describe the offence in the words used on the record, rather than by any category number. The section has been renumbered three years running, so the description is what the screen runs on.",
      required: true
    },
    {
      key: `${prefix}DispositionAndDate`,
      label: "How did the case end, and on what date?",
      required: true
    },
    {
      key: `${prefix}SameCountyArrests`,
      label:
        "What other arrests do you have in that same county? Same-county arrests may be combined in one petition, which saves you filings.",
      required: true
    },
    {
      key: `${prefix}PriorRecord`,
      label: "What other convictions or pending charges do you have, anywhere?",
      required: true
    },
    {
      key: `${prefix}Restitution`,
      label: "Have you paid all fines, costs and restitution on the case? Answer yes or no.",
      required: true
    },
    {
      key: `${prefix}TribalRecord`,
      label:
        "Was the case handled in a tribal court, or does a tribal record exist for the same events? Answer yes or no. An Oklahoma order does not reach tribal records.",
      required: true
    },
    {
      key: `${prefix}FreeRouteChecked`,
      label:
        "Would you like us to check first whether your record is one that Oklahoma now seals without a petition, before you pay anything? Answer yes or no.",
      required: true
    },
    {
      key: `${prefix}ArrestRecordToo`,
      label:
        "Do you want the arrest record cleared as well as the court record? Answer yes or no. The Bureau charges a processing fee for an arrest-record expungement and none for a court-record one.",
      required: true
    }
  ];
}

function oklahomaTrack(input: {
  trackId: string;
  publicName: string;
  mechanism: string;
  authority: string;
  recordTypes: readonly string[];
  dispositions: readonly string[];
  courtLevel: string;
  packetSet: PacketSet;
  requiredInputs: readonly RequiredInput[];
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
    jurisdiction: "OK",
    trackId: input.trackId,
    publicName: input.publicName,
    mechanism: input.mechanism,
    authority: input.authority,
    recordTypes: input.recordTypes,
    dispositions: input.dispositions,
    courtLevel: input.courtLevel,
    geographicScope: "statewide",
    geographyKeys: [],
    outputStrategy: "custom_pleading",
    packetSet: input.packetSet,
    requiredInputs: input.requiredInputs,
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

const SECTION_18_TAIL =
  "The court sets the hearing and gives the thirty days' notice; the petitioner does not serve anyone. No category of § 18 is asserted and no period is computed, because the section was amended three years running and the numbering has moved. Oklahoma publishes no standard petition that a participant could fill, so this filing is written to the content the statutes require.";

export const OKLAHOMA_CUSTOM_PLEADING_TRACKS: readonly ReliefTrack[] = [
  oklahomaTrack({
    trackId: "ok_18_19_nonconviction",
    publicName: "Clear an Oklahoma arrest that did not end in a conviction",
    mechanism: "seal_nonconviction_or_innocence_record",
    authority: "22 O.S. §§ 18 and 19",
    recordTypes: ["arrest", "charge", "conviction", "court_record"],
    dispositions: ["dismissed", "acquitted", "not_charged", "factually_innocent"],
    courtLevel: "district_court_of_the_county_where_the_arrest_information_is_located",
    packetSet: packetSet("ok_18_19_nonconviction", [
      {
        componentId: "ok_18_19_nonconviction-primary-filing-2",
        designRole: "primary_filing",
        templateId: "ok_18_19_nonconviction-petition",
        order: 2
      },
      {
        componentId: "ok_18_19_nonconviction-proposed-order-3",
        designRole: "proposed_order",
        templateId: "ok_18_19_nonconviction-order",
        order: 3
      }
    ]),
    requiredInputs: [
      ...sectionEighteenInputs("18_"),
      {
        key: "ncvNoRefile",
        label:
          "Has the prosecutor confirmed the case will not be refiled? Answer yes or no. LegalEase cannot obtain that confirmation for you.",
        required: false
      }
    ],
    assembledPacketName: "ok-seal-nonconviction",
    assembledPacketTitle: "Oklahoma sealing packet — record that did not end in a conviction",
    customerDeliverableDescription: `Petition to seal the records of a case that did not end in a conviction, with a proposed order for the court to sign. ${SECTION_18_TAIL}`,
    notes:
      "The no-refile confirmation is the prosecuting agency's, not LegalEase's. Where it has not been given the route stops rather than asserting it."
  }),

  oklahomaTrack({
    trackId: "ok_18_19_deferred_dismissal",
    publicName: "Clear an Oklahoma case after a deferred sentence was dismissed",
    mechanism: "seal_after_deferred_or_delayed_sentence_dismissal",
    authority: "22 O.S. §§ 18 and 19",
    recordTypes: ["arrest", "charge", "conviction", "court_record"],
    dispositions: ["deferred_dismissed", "delayed_dismissed"],
    courtLevel: "district_court_of_the_county_where_the_arrest_information_is_located",
    packetSet: packetSet("ok_18_19_deferred_dismissal", [
      {
        componentId: "ok_18_19_deferred_dismissal-primary-filing-2",
        designRole: "primary_filing",
        templateId: "ok_18_19_deferred_dismissal-petition",
        order: 2
      },
      {
        componentId: "ok_18_19_deferred_dismissal-proposed-order-3",
        designRole: "proposed_order",
        templateId: "ok_18_19_deferred_dismissal-order",
        order: 3
      }
    ]),
    requiredInputs: [
      ...sectionEighteenInputs("18_"),
      {
        key: "dfdCompletion",
        label: "When did you finish the deferred or delayed sentence, and was the case then dismissed?",
        required: true
      }
    ],
    assembledPacketName: "ok-seal-after-deferred-dismissal",
    assembledPacketTitle: "Oklahoma sealing packet — case dismissed after a deferred sentence",
    customerDeliverableDescription: `Petition to seal the records of a case dismissed after a deferred or delayed sentence was completed, with a proposed order for the court to sign. ${SECTION_18_TAIL}`,
    notes:
      "The petition says on its face that it is not a § 991c motion, because a participant holding only a § 991c order still has the arrest record showing."
  }),

  oklahomaTrack({
    trackId: "ok_18_19_misdemeanor_conviction",
    publicName: "Clear an Oklahoma misdemeanor conviction",
    mechanism: "seal_misdemeanor_conviction",
    authority: "22 O.S. §§ 18 and 19",
    recordTypes: ["arrest", "charge", "conviction", "court_record"],
    dispositions: ["convicted"],
    courtLevel: "district_court_of_the_county_where_the_arrest_information_is_located",
    packetSet: packetSet("ok_18_19_misdemeanor_conviction", [
      {
        componentId: "ok_18_19_misdemeanor_conviction-primary-filing-2",
        designRole: "primary_filing",
        templateId: "ok_18_19_misdemeanor_conviction-petition",
        order: 2
      },
      {
        componentId: "ok_18_19_misdemeanor_conviction-proposed-order-3",
        designRole: "proposed_order",
        templateId: "ok_18_19_misdemeanor_conviction-order",
        order: 3
      }
    ]),
    requiredInputs: [
      ...sectionEighteenInputs("18_"),
      {
        key: "misSentenceComplete",
        label: "When did you finish the sentence, including any probation, and pay everything owed?",
        required: true
      }
    ],
    assembledPacketName: "ok-seal-misdemeanor-conviction",
    assembledPacketTitle: "Oklahoma sealing packet — misdemeanour conviction",
    customerDeliverableDescription: `Petition to seal the records of a misdemeanour conviction, with a proposed order for the court to sign. ${SECTION_18_TAIL}`,
    notes:
      "No waiting period is computed or asserted. The participant's completion date is recorded; whether the period has run is for the court and the agencies."
  }),

  oklahomaTrack({
    trackId: "ok_18_19_felony_conviction",
    publicName: "Clear an Oklahoma felony conviction",
    mechanism: "seal_felony_conviction",
    authority: "22 O.S. §§ 18 and 19",
    recordTypes: ["arrest", "charge", "conviction", "court_record"],
    dispositions: ["convicted"],
    courtLevel: "district_court_of_the_county_where_the_arrest_information_is_located",
    packetSet: packetSet("ok_18_19_felony_conviction", [
      {
        componentId: "ok_18_19_felony_conviction-primary-filing-2",
        designRole: "primary_filing",
        templateId: "ok_18_19_felony_conviction-petition",
        order: 2
      },
      {
        componentId: "ok_18_19_felony_conviction-proposed-order-3",
        designRole: "proposed_order",
        templateId: "ok_18_19_felony_conviction-order",
        order: 3
      }
    ]),
    requiredInputs: [
      ...sectionEighteenInputs("18_"),
      {
        key: "felReclassified",
        label:
          "Has the offence you were convicted of since been reclassified as a misdemeanour? Answer yes or no. The reclassified route carries a much shorter window and is screened before the longer ones.",
        required: true
      },
      {
        key: "felOtherMisdemeanors",
        label:
          "Have you had any separate misdemeanour convictions, and when? The single-felony route carries a separate-misdemeanour look-back.",
        required: true
      }
    ],
    assembledPacketName: "ok-seal-felony-conviction",
    assembledPacketTitle: "Oklahoma sealing packet — felony conviction",
    customerDeliverableDescription: `Petition to seal the records of a felony conviction, with a proposed order for the court to sign. ${SECTION_18_TAIL}`,
    notes:
      "The reclassification answer and the separate-misdemeanour history are recorded as the petitioner's statements. Neither is turned into a category or a period."
  }),

  oklahomaTrack({
    trackId: "ok_18_19_pardon",
    publicName: "Clear an Oklahoma record after a pardon",
    mechanism: "seal_after_pardon",
    authority: "22 O.S. §§ 18 and 19",
    recordTypes: ["arrest", "charge", "conviction", "court_record"],
    dispositions: ["pardoned"],
    courtLevel: "district_court_of_the_county_where_the_arrest_information_is_located",
    packetSet: packetSet("ok_18_19_pardon", [
      {
        componentId: "ok_18_19_pardon-primary-filing-2",
        designRole: "primary_filing",
        templateId: "ok_18_19_pardon-petition",
        order: 2
      },
      {
        componentId: "ok_18_19_pardon-proposed-order-3",
        designRole: "proposed_order",
        templateId: "ok_18_19_pardon-order",
        order: 3
      }
    ]),
    requiredInputs: [
      ...sectionEighteenInputs("18_"),
      {
        key: "pdnPardonDate",
        label: "On what date was the pardon granted, and do you have the document?",
        required: true
      }
    ],
    assembledPacketName: "ok-seal-after-pardon",
    assembledPacketTitle: "Oklahoma sealing packet — after a pardon",
    customerDeliverableDescription: `Petition to seal records following a pardon, with a proposed order for the court to sign. Applying for the pardon itself is a Pardon and Parole Board matter and is not part of this packet. ${SECTION_18_TAIL}`,
    notes:
      "This route begins with a pardon the participant already holds. Nothing here applies for one."
  }),

  oklahomaTrack({
    trackId: "ok_identity_theft",
    publicName: "Clear an Oklahoma record that is not yours",
    mechanism: "seal_identity_theft_or_wrong_person_record",
    authority: "22 O.S. §§ 18, 19 and 19a",
    recordTypes: ["arrest", "charge", "conviction", "court_record"],
    dispositions: ["wrongly_identified"],
    courtLevel: "district_court_of_the_county_where_the_arrest_information_is_located",
    packetSet: packetSet("ok_identity_theft", [
      {
        componentId: "ok_identity_theft-primary-filing-2",
        designRole: "primary_filing",
        templateId: "ok_identity_theft-petition",
        order: 2
      },
      {
        componentId: "ok_identity_theft-proposed-order-3",
        designRole: "proposed_order",
        templateId: "ok_identity_theft-order",
        order: 3
      }
    ]),
    requiredInputs: [
      ...sectionEighteenInputs("ide"),
      {
        key: "idtHowMisidentified",
        label: "How did your name come to be on this record, and when did you find out?",
        required: true
      }
    ],
    assembledPacketName: "ok-seal-record-not-yours",
    assembledPacketTitle: "Oklahoma sealing packet — record that is not the petitioner's",
    customerDeliverableDescription: `Petition to seal a record created in the petitioner's name that the petitioner says is not theirs, with a proposed order for the court to sign. The account of how the name came to be on the record is the petitioner's own and LegalEase asserts none of it. ${SECTION_18_TAIL}`,
    notes:
      "Whether the petitioner is the subject of the record is for the court. Any dispute about it is a self-help stop printed on the face of the petition."
  }),

  oklahomaTrack({
    trackId: "ok_vpo_60_18",
    publicName: "Clear an Oklahoma protective order record",
    mechanism: "expunge_victim_protective_order_records",
    authority: "22 O.S. § 60.18",
    recordTypes: ["arrest", "charge", "conviction", "court_record"],
    dispositions: ["vpo_dismissed", "vpo_denied"],
    courtLevel: "district_court_of_the_county_where_the_arrest_information_is_located",
    packetSet: packetSet("ok_vpo_60_18", [
      {
        componentId: "ok_vpo_60_18-primary-filing-2",
        designRole: "primary_filing",
        templateId: "ok_vpo_60_18-petition",
        order: 2
      },
      {
        componentId: "ok_vpo_60_18-proposed-order-3",
        designRole: "proposed_order",
        templateId: "ok_vpo_60_18-order",
        order: 3
      }
    ]),
    requiredInputs: [
      ...sectionEighteenInputs("vpo"),
      {
        key: "vpoOutcome",
        label:
          "What happened with the protective order — was it dismissed, denied, or did it expire? Answer dismissed, denied or expired.",
        required: true
      }
    ],
    assembledPacketName: "ok-expunge-protective-order-record",
    assembledPacketTitle: "Oklahoma expungement packet — protective order record",
    customerDeliverableDescription: `Petition to expunge the records of a victim protective order matter under 22 O.S. § 60.18, with a proposed order for the court to sign. The section's text was not read when this packet was prepared, so the petition asks for relief under it and states neither its conditions nor that they are met. ${SECTION_18_TAIL}`,
    notes:
      "A protective order record is not an ordinary criminal record. The petition says so and tells the petitioner to have the section read before filing."
  }),

  oklahomaTrack({
    trackId: "ok_991c_deferred",
    publicName: "Update an Oklahoma deferred sentence so the case shows as dismissed",
    mechanism: "update_court_record_after_completed_deferred_sentence",
    authority: "22 O.S. § 991c",
    recordTypes: ["court_record"],
    dispositions: ["deferred_completed"],
    courtLevel: "district_court_that_entered_the_deferred_sentence",
    packetSet: packetSet("ok_991c_deferred", [
      {
        componentId: "ok_991c_deferred-primary-filing-2",
        designRole: "primary_filing",
        templateId: "ok_991c_deferred-motion",
        order: 2
      },
      {
        componentId: "ok_991c_deferred-proposed-order-3",
        designRole: "proposed_order",
        templateId: "ok_991c_deferred-order",
        order: 3
      }
    ]),
    requiredInputs: [
      { key: "dfcFullLegalName", label: "What is your full legal name?", required: true },
      {
        key: "dfcCounty",
        label: "Which Oklahoma county and district court handled the case?",
        required: true
      },
      { key: "dfcCaseNumber", label: "What is the case number?", required: true },
      {
        key: "dfcCompletionDate",
        label: "When did you finish the deferred sentence and everything it required?",
        required: true
      },
      {
        key: "dfcArrestRecordGoal",
        label:
          "Is your goal to have the arrest itself no longer show, as well as the court case? Answer yes or no. A § 991c order does not remove the arrest record.",
        required: true
      }
    ],
    assembledPacketName: "ok-991c-update-court-record",
    assembledPacketTitle: "Oklahoma § 991c packet — update a completed deferred sentence",
    customerDeliverableDescription:
      "Motion to update the court record of a completed deferred sentence under 22 O.S. § 991c, with a proposed order for the court to sign. The Oklahoma State Bureau of Investigation states that a § 991c expungement does not remove the arrest record, and both documents say so. A participant whose goal is the arrest record is stopped here and routed to the §§ 18 and 19 petition instead.",
    notes:
      "The design calls the § 991c limit the most important consumer-facing point in Oklahoma. It is stated in the motion, in the proposed order, and enforced as a typed stop."
  })
];
