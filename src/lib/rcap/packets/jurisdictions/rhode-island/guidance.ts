// Rhode Island process guidance — two routes, neither of which LegalEase files
// anything on.
//
// Two assigned tracks, both `process_guidance` in the adopted design:
//
//   - `ri_commercial_sexual_activity` is an adopted product-scope exclusion.
//     R.I. Gen. Laws § 11-34.1-5 lets records of a person convicted, placed on
//     probation, or whose case was filed under § 12-10-12 for violations of
//     § 11-34.1-2 or § 11-34.1-4 be expunged one year after completion of
//     sentence, and the court may grant the motion regardless of first-offender
//     status. That is materially more generous than the general Chapter 12-1.3
//     routes, which is exactly why the design says to surface it rather than
//     bury it. But the motion is made by the participant's attorney or a
//     survivor legal service, not by this service: these cases frequently
//     involve trafficking, exploitation, coercion or victimisation, and the
//     adopted posture is trauma-informed detection and referral.
//   - `ri_filed_complaints` is relief by operation of law. Under § 12-10-12 a
//     complaint placed on file is automatically expunged where no action is
//     taken during the filing period, and no criminal record results. For a
//     domestic violence filed complaint, where the defendant is not charged
//     with another domestic violence crime in the three years after filing — or
//     where such a charge is dismissed or ends in acquittal — all records
//     relating to the filed complaint are expunged **without a separate Chapter
//     12-1.3 motion**. Nothing is filed by the participant and no motion exists
//     on the section.
//
// The rule that shapes the whole of the first track: **ask the single screening
// question and route.** The design says in terms that trauma-informed handling
// governs, that only the one screening question is asked, that no details of
// trafficking, exploitation or coercion are requested, and that no factual
// showing is generated. Nothing in this module asks for a narrative, and the
// committed verifier holds that line — a packet that invited somebody to
// describe what happened to them would be a worse outcome than no packet.
//
// The other thing worth stating up front, because it is easy to get backwards:
// on the filed-complaints track there is no motion to file. Where a record
// should have cleared and has not, the answer is escalation, not a filing, and
// the design says so.
//
// And what the design leaves open, which no sheet here resolves: which
// subsection of Chapter 12-1.3 carries the additional conviction relief for
// survivors of human trafficking that a secondary profile describes — separate
// from the § 11-34.1-5 route and unresolved; the effective date recorded for
// § 11-34.1-5, which is a session convention rather than a sourced effective
// clause; and the operative text of § 12-10-12, whose history line has been
// read to its 2023 amendment but which was not read subsection by subsection.
//
// This module is not imported by `src/lib/rcap/packets/registry.ts`. Rhode
// Island is not an enabled jurisdiction and this job does not enable one. The
// Chapter 12-1.3 official-form and composed routes are other jobs and are
// untouched.

import type { GuidanceTemplate } from "@/lib/rcap/packets/engines/process-guidance";
import type { PacketSet, ReliefTrack, RequiredInput } from "@/lib/rcap/packets/types";
import { computeRuntimeStatus } from "@/lib/rcap/packets/types";

const VERSION = "1.0.0";

const BANNER =
  "DRAFT PENDING LEGAL REVIEW — PREPARED BY LEGALEASE — NOT LEGAL ADVICE — THIS IS NOT A COURT FILING";

const PENDING_APPROVAL = { visual: "not_reviewed", legal: "not_submitted" } as const;

/** Rhode Island survivor help, named once. No organisation is named for you. */
const RI_SURVIVOR_HELP =
  "a Rhode Island survivor legal service, a Rhode Island legal aid office, a law school clinic that works with survivors of trafficking and exploitation, or a Rhode Island attorney who does that work";

/** Ordinary Rhode Island help, for the filed-complaints route. */
const RI_LEGAL_HELP =
  "a Rhode Island legal aid office, a Rhode Island law school clinic, the lawyer referral service run by the Rhode Island Bar Association, or a Rhode Island attorney";

/** Said on both routes in this family. */
const NOT_A_REPORT_ON_YOUR_CASE =
  "This page describes what the law does. It does not tell you what has happened to your own record, and LegalEase has not looked. Nothing here is a decision about whether your record qualifies.";

/** The trauma-informed posture, stated on the survivor route's own sheets. */
const ONE_QUESTION_AND_NO_DETAILS =
  "This packet asks one screening question about whether the case was connected to trafficking, coercion or exploitation, and then it stops asking. It does not want the details, it does not record them, and it does not build any account of what happened to you. Whatever needs to be shown to a court is something to work out with a lawyer who does this work, on your terms and at your pace.";

/** Nothing is filed by the participant on either route. */
const NOTHING_IS_GENERATED_HERE =
  "There is no petition, motion or application on this route for LegalEase to prepare, and none is generated. What this packet does is name the route, explain what it offers, and tell you where it goes.";

/** § 12-10-12 relief is automatic and carries no motion. */
const NO_MOTION_ON_THIS_SECTION =
  "There is no motion to file under this section. The expungement follows automatically, and where it has not happened the answer is to ask and then to get advice — not to file something the section does not provide for.";

const RI_CANNOT_PERFORM: readonly string[] = [
  "LegalEase cannot expunge anything, and cannot make a court, a clerk, a records office or anybody else act.",
  "LegalEase cannot tell you whether a particular record qualifies. This page explains the mechanism; it is not legal advice and it is not an eligibility decision.",
  "LegalEase cannot tell you that a record has been expunged. Only your own criminal history record and the court docket show that, and you are the one who reads them.",
  "LegalEase does not obtain, hold, inspect or authenticate your records, and does not want documents sent to it.",
  "LegalEase has not contacted any court, clerk, prosecutor or agency about your case, and has not filed anything for you.",
  "LegalEase cannot tell you when anything will happen. No period on this page is a promise about your case."
];

const RI_SURVIVOR_SOURCES: readonly string[] = [
  "R.I. Gen. Laws § 11-34.1-5, expungement of records, official statute text. History: P.L. 2009 ch. 185 § 3 and ch. 186 § 3.",
  "R.I. Gen. Laws §§ 11-34.1-2 and 11-34.1-4, the offences the section reaches.",
  "R.I. Gen. Laws § 12-10-12, complaints placed on file."
];

const RI_FILED_SOURCES: readonly string[] = [
  "R.I. Gen. Laws § 12-10-12, complaints placed on file, official statute text. History through P.L. 2023 ch. 231 § 1 and ch. 232 § 1, effective 23 June 2023.",
  "R.I. Gen. Laws chapter 12-1.3, expungement of criminal records, for the motion route this section does not require."
];

// ---------------------------------------------------------------------------
// Typed stops
// ---------------------------------------------------------------------------

/** Raised where an answer takes the participant outside self-help entirely. */
export class RhodeIslandGuidanceStopError extends Error {
  constructor(
    readonly trackId: string,
    readonly stopId: string,
    readonly reason: string,
    readonly routeTo: string,
    readonly nextStep: string
  ) {
    super(reason);
    this.name = "RhodeIslandGuidanceStopError";
  }
}

/** Raised where an honest answer belongs to a different Rhode Island route. */
export class RhodeIslandRouteMismatchError extends Error {
  constructor(
    readonly trackId: string,
    readonly stopId: string,
    readonly reason: string,
    readonly routeTo: string,
    readonly nextStep: string
  ) {
    super(reason);
    this.name = "RhodeIslandRouteMismatchError";
  }
}

/** Raised when a participant answer is outside the approved closed list. */
export class RhodeIslandBranchError extends Error {
  constructor(
    readonly trackId: string,
    readonly key: string,
    readonly value: string
  ) {
    super(`${trackId}: "${value}" is not an approved value for ${key}.`);
    this.name = "RhodeIslandBranchError";
  }
}

export const RI_YES_NO: Readonly<Record<string, boolean>> = { yes: true, no: false };

/** Only a Rhode Island record is reached by either route. */
export const RI_RECORD_JURISDICTIONS: Readonly<Record<string, boolean>> = {
  rhode_island: true,
  another_state: false,
  federal: false,
  tribal: false,
  military: false
};

/**
 * What happened to a later domestic violence charge, where there was one.
 *
 * The section expunges where there is no further domestic violence charge in
 * the three years, and also where such a charge is dismissed or results in
 * acquittal. So a later charge is not automatically the end of it, and the
 * closed list keeps those two outcomes apart.
 */
export const RI_LATER_DV_CHARGE: Readonly<Record<string, string>> = {
  none: "within",
  dismissed_or_acquitted: "within",
  charged_and_not_resolved_that_way: "outside",
  not_sure: "unresolvable_from_recollection"
};

function branch<T>(
  trackId: string,
  key: string,
  table: Readonly<Record<string, T>>,
  raw: unknown
): { value: string; resolved: T } {
  const value = typeof raw === "string" ? raw.trim() : "";
  if (!Object.prototype.hasOwnProperty.call(table, value)) {
    throw new RhodeIslandBranchError(trackId, key, value);
  }
  return { value, resolved: table[value] };
}

const OUT_OF_JURISDICTION_STOP =
  "Rhode Island's expungement law reaches Rhode Island records. Neither of these routes reaches a federal, out-of-state, military or tribal record, and no Rhode Island order obliges any of those authorities to do anything.";

/**
 * Validates participant answers and routes to the correct Rhode Island node.
 *
 * Record jurisdiction is screened first on both tracks, because the design
 * lists it as a stop condition on each. Everything after that is the route's
 * own — and on the survivor route the questions are deliberately few.
 *
 * Fails closed on any answer outside a closed list. Every stop and every
 * mismatch carries a reason, a destination and the next step to take there.
 */
export function deriveRhodeIslandGuidanceFacts(
  trackId: string,
  facts: Record<string, unknown>
): Record<string, unknown> {
  const derived: Record<string, unknown> = { ...facts };

  const jurisdiction = branch(trackId, "recordJurisdiction", RI_RECORD_JURISDICTIONS, facts.recordJurisdiction);
  if (!jurisdiction.resolved) {
    throw new RhodeIslandRouteMismatchError(
      trackId,
      "record_is_not_a_rhode_island_record",
      OUT_OF_JURISDICTION_STOP,
      "the state, federal, tribal or military authority that holds the record",
      "Take the record to that authority and ask what its own law provides. If you also hold Rhode Island records, those are handled separately and only those are served here."
    );
  }

  if (trackId === "ri_commercial_sexual_activity") {
    const offence = branch(
      trackId,
      "offenceUnderChapter1134",
      RI_YES_NO,
      facts.offenceUnderChapter1134
    );
    if (!offence.resolved) {
      throw new RhodeIslandRouteMismatchError(
        trackId,
        "the_charge_was_not_under_section_11_34_1_2_or_11_34_1_4",
        "Section 11-34.1-5 reaches records of violations of § 11-34.1-2 or § 11-34.1-4 and nothing else. A different charge is not within it, however similar the circumstances, and it goes to the ordinary Rhode Island expungement routes instead.",
        "the ordinary Rhode Island expungement routes under chapter 12-1.3",
        "Go back to the Rhode Island intake and answer the questions for the charge the record actually shows. If a trafficking or exploitation connection matters to that case too, say so there."
      );
    }

    const wantsToGiveDetails = branch(
      trackId,
      "wantsToProvideDetails",
      RI_YES_NO,
      facts.wantsToProvideDetails
    );
    if (wantsToGiveDetails.resolved) {
      throw new RhodeIslandGuidanceStopError(
        trackId,
        "details_of_trafficking_exploitation_or_coercion_offered_or_requested",
        "This packet does not take the details, and that is deliberate rather than a limitation. What happened to you may well matter to the court, but it should be told once, to somebody who can act on it and who is set up to hear it — not typed into an intake that cannot use it and will not hold it.",
        RI_SURVIVOR_HELP,
        "Take it to one of them. You do not need to prepare an account first, and you do not need to have it straight before you make contact."
      );
    }

    const immigration = branch(trackId, "immigrationQuestion", RI_YES_NO, facts.immigrationQuestion);
    if (immigration.resolved) {
      throw new RhodeIslandGuidanceStopError(
        trackId,
        "immigration_consequences_in_play",
        "Immigration consequences are governed by federal law and no Rhode Island expungement reaches them. On this route in particular that matters, because some of the relief available to survivors under federal immigration law depends on how a case is characterised, and a records decision taken first can cut across it.",
        "an immigration attorney, and ideally one who works with survivors of trafficking",
        "Speak to an immigration attorney before anything is filed about the record. Say that the case may be connected to trafficking or coercion: it changes what they will look for."
      );
    }
    derived.survivorRouteScreenPassed = true;
    return derived;
  }

  if (trackId === "ri_filed_complaints") {
    const filed = branch(trackId, "complaintWasPlacedOnFile", RI_YES_NO, facts.complaintWasPlacedOnFile);
    if (!filed.resolved) {
      throw new RhodeIslandRouteMismatchError(
        trackId,
        "the_complaint_was_not_placed_on_file",
        "This section is about a complaint the court placed on file. A case that ended in a conviction, or that was dismissed outright, is a different thing and is reached by the ordinary Rhode Island expungement routes rather than by the automatic rule here.",
        "the ordinary Rhode Island expungement routes under chapter 12-1.3",
        "Go back to the Rhode Island intake and answer the questions for how the case actually ended, taking it from the docket rather than from memory."
      );
    }

    const unclear = branch(trackId, "filingPeriodUnclearOnTheDocket", RI_YES_NO, facts.filingPeriodUnclearOnTheDocket);
    if (unclear.resolved) {
      throw new RhodeIslandGuidanceStopError(
        trackId,
        "the_docket_does_not_make_the_filing_period_clear",
        "Everything on this route runs from the filing period the court set, so where the docket does not make that period clear there is nothing to calculate from. Reading a docket that is ambiguous about it is not a guess worth making.",
        "the clerk of the court where the complaint was placed on file, and then " + RI_LEGAL_HELP,
        "Ask the clerk what the docket records as the filing date and the filing period. Come back to this route once you have both in writing."
      );
    }

    const action = branch(trackId, "actionTakenDuringFilingPeriod", RI_YES_NO, facts.actionTakenDuringFilingPeriod);
    if (action.resolved) {
      throw new RhodeIslandGuidanceStopError(
        trackId,
        "action_was_taken_on_the_complaint_during_the_filing_period",
        "The automatic expungement depends on no action being taken during the filing period. Where the court did act, the condition the section turns on is not met, and what is available instead depends on what the action was and how the case then ended.",
        RI_LEGAL_HELP,
        "Take the full docket, showing what the court did and when, and ask what the case's actual disposition leaves open."
      );
    }

    const isDv = branch(trackId, "domesticViolenceComplaint", RI_YES_NO, facts.domesticViolenceComplaint);
    derived.domesticViolenceRoute = isDv.resolved;
    if (isDv.resolved) {
      const later = branch(trackId, "laterDomesticViolenceCharge", RI_LATER_DV_CHARGE, facts.laterDomesticViolenceCharge);
      if (later.resolved === "outside") {
        throw new RhodeIslandGuidanceStopError(
          trackId,
          "a_further_domestic_violence_charge_inside_the_three_years",
          "The domestic violence rule turns on there being no further domestic violence charge in the three years after filing, unless that charge was dismissed or ended in acquittal. A charge inside the window that went another way takes the case outside the automatic rule, and what remains is a question about the whole record rather than about this complaint.",
          RI_LEGAL_HELP,
          "Take the dockets for both matters and ask what the later charge did to the filed complaint, and what is available for the record as a whole."
        );
      }
      if (later.resolved === "unresolvable_from_recollection") {
        throw new RhodeIslandGuidanceStopError(
          trackId,
          "whether_a_later_charge_falls_inside_the_three_years_is_not_known",
          "Whether a later domestic violence charge fell inside the three years, and how it ended, decides whether the automatic rule still operates. That is not a thing to answer from memory, because both the date and the disposition matter.",
          "the clerk of the court that handled the later matter, and then " + RI_LEGAL_HELP,
          "Get the docket for the later charge, with its date and its disposition, and come back to this route with both."
        );
      }
      derived.laterDomesticViolenceChargeBranch = later.value;
    }

    const stillShowing = branch(trackId, "stillShowingOnBci", RI_YES_NO, facts.stillShowingOnBci);
    if (stillShowing.resolved) {
      throw new RhodeIslandGuidanceStopError(
        trackId,
        "the_complaint_still_shows_although_it_should_have_cleared",
        "The period has run, no action was taken, and the complaint is still showing on your criminal history record. That is an escalation rather than a filing: the section provides no motion for this situation, and this packet does not invent one.",
        "the clerk of the court where the complaint was placed on file and the Attorney General's Bureau of Criminal Identification, and then " + RI_LEGAL_HELP,
        "Ask each of them in writing what their record shows, keep the replies with a dated copy of your criminal history record, and take that file to a lawyer. Do not file a motion under this section: there is none."
      );
    }
    return derived;
  }

  return derived;
}

// ---------------------------------------------------------------------------
// Guidance templates
// ---------------------------------------------------------------------------

type SheetInput = {
  templateId: string;
  mechanismName: string;
  whyNotAFiling: string;
  processType: GuidanceTemplate["processType"];
  prerequisites: readonly string[];
  documentsToObtain: readonly string[];
  gather: readonly string[];
  destination: { name: string; detail: string };
  sequence: readonly string[];
  submissionMethod?: string;
  fees: string;
  feeWaiver: string;
  noticeOrService: readonly string[];
  expectedNextStage: string;
  canPrepare: readonly string[];
  extraCannotPerform?: readonly string[];
  escalations: readonly string[];
  sources: readonly string[];
};

function sheet(input: SheetInput): GuidanceTemplate {
  return {
    templateId: input.templateId,
    version: VERSION,
    technicalFixture: true,
    banner: BANNER,
    mechanismName: input.mechanismName,
    whyNotAFiling: input.whyNotAFiling,
    processType: input.processType,
    prerequisites: input.prerequisites,
    documentsToObtain: input.documentsToObtain,
    participantDataToGather: input.gather,
    officialDestination: input.destination,
    actionSequence: input.sequence,
    submissionMethod:
      input.submissionMethod ??
      "There is nothing to submit and nothing for LegalEase to file. No petition, motion or application is generated on this route.",
    fees: input.fees,
    feeWaiver: input.feeWaiver,
    noticeOrService: input.noticeOrService,
    expectedNextStage: input.expectedNextStage,
    legalEaseCanPrepare: input.canPrepare,
    legalEaseCannotPerform: [...RI_CANNOT_PERFORM, ...(input.extraCannotPerform ?? [])],
    escalationTriggers: [
      "The record is a federal, out-of-state, military or tribal record.",
      ...input.escalations
    ],
    officialSourceReferences: input.sources
  };
}

export const RHODE_ISLAND_GUIDANCE_TEMPLATES: Readonly<Record<string, GuidanceTemplate>> = {
  // ---- ri_commercial_sexual_activity ---------------------------------------
  "ri-csa-route-detection": sheet({
    templateId: "ri-csa-route-detection",
    mechanismName: "A Rhode Island route worth knowing about: R.I. Gen. Laws § 11-34.1-5",
    whyNotAFiling:
      "LegalEase generates no motion on this route. Section 11-34.1-5 allows a motion to expunge records of a violation of § 11-34.1-2 or § 11-34.1-4, and the motion is made by your attorney or by a survivor legal service. These cases frequently involve trafficking, exploitation, coercion or victimisation, and the right posture is to name the route and refer rather than to produce paperwork.",
    processType: "court_adjacent",
    prerequisites: [
      "The record is a Rhode Island record.",
      "The charge was under R.I. Gen. Laws § 11-34.1-2 or § 11-34.1-4.",
      "You accept that this packet names a route and refers, and prepares nothing."
    ],
    documentsToObtain: [
      "Nothing for this packet. Your attorney or a survivor legal service will tell you what they need, and you give it to them. Do not send documents to LegalEase."
    ],
    gather: [
      "Which Rhode Island court handled the case, and the case number, so that a referral goes to the right place.",
      "The date you finished your sentence, if you know it, so that the timing can be judged.",
      "Nothing about what happened to you. This packet does not ask for that and does not want it."
    ],
    destination: {
      name: "The Rhode Island court where the underlying matter occurred, reached through your attorney or a survivor legal service",
      detail:
        "The motion under § 11-34.1-5 is filed in the court where the conviction, the probation or the filed complaint occurred. It is made by your attorney or by a survivor legal service. LegalEase does not prepare it, does not file it, and has not contacted any court or organisation about your case."
    },
    sequence: [
      NOT_A_REPORT_ON_YOUR_CASE,
      "Why this sheet exists at all, and it is the point of the whole route: this section is better than the general Rhode Island expungement routes, and it is easy to miss.",
      "What it says. Records of a person convicted, placed on probation, or whose case was filed under § 12-10-12 for a violation of § 11-34.1-2 or § 11-34.1-4 may be expunged one year after completion of sentence — and the court may grant the motion regardless of first-offender status.",
      "Two things there are unusual. One year, rather than the longer periods the general routes run on. And the waiver of first-offender status, which is the requirement that most often shuts people out of the ordinary routes altogether.",
      "So somebody who has been told they are not eligible for expungement in Rhode Island, because of an earlier record, may still be within this section. That is worth asking about even if you have been turned away before.",
      ONE_QUESTION_AND_NO_DETAILS,
      "Why this route ends in a referral rather than a packet. A motion under this section may need a showing about the circumstances of the offence, and building that is advocacy — done with somebody who works with survivors, who can decide with you what is said and what is not. It is not form-filling and this service does not treat it as such.",
      "That is a decision about what LegalEase does. It is not a finding that the relief is out of reach: on the contrary, the reason this sheet exists is that the relief is unusually reachable.",
      NOTHING_IS_GENERATED_HERE,
      "One more thing to carry. If a Rhode Island case of any kind is connected to trafficking, coercion or exploitation, that connection is worth raising on that case too, whichever route it is on."
    ],
    fees: "None charged by this packet. No fee is identified for the motion itself; what a lawyer or a legal service charges is a question for them, and many survivor services do not charge at all.",
    feeWaiver:
      "None identified for this section. Where cost is the obstacle, say so when you make contact: it changes which organisation is the right one.",
    noticeOrService: [
      "There is nothing for you to serve and nobody for you to notify through this packet.",
      "Any notice or service the motion requires is handled by the attorney or legal service that makes it."
    ],
    expectedNextStage:
      "The next sheet is where to take this, and what to expect from the first conversation.",
    canPrepare: [
      "This account of what § 11-34.1-5 offers and of why it is more generous than the general routes.",
      "The referral sheet that follows it in this packet.",
      "The one screening question, and nothing beyond it.",
      "The two points to open a conversation with: whether the section reaches the record, and whether the one year from completion of sentence has run."
    ],
    escalations: [
      "You have been told you are not eligible for expungement in Rhode Island because of an earlier record.",
      "Your immigration status could be affected.",
      "Another Rhode Island case of yours is also connected to trafficking, coercion or exploitation."
    ],
    sources: RI_SURVIVOR_SOURCES
  }),

  "ri-csa-referral": sheet({
    templateId: "ri-csa-referral",
    mechanismName: "Where to take a § 11-34.1-5 matter, and what to expect",
    whyNotAFiling:
      "This page is a referral. Nothing on it is filed and no motion is prepared. The route ends with a person who can act on it rather than with a document.",
    processType: "court_adjacent",
    prerequisites: [
      "You have read the sheet before this one.",
      "You accept that this sheet routes you to a person rather than giving you a document."
    ],
    documentsToObtain: [
      "Nothing for this packet. Whoever takes this on will tell you what they need; give it to them and not to LegalEase."
    ],
    gather: [
      "The Rhode Island court and the case number.",
      "The date you finished your sentence, if you know it.",
      "What you actually want from this — a job, a licence, housing, or simply the record gone.",
      "Nothing about what happened to you. That is for the conversation, if and when you want to have it."
    ],
    destination: {
      name: "A Rhode Island survivor legal service, legal aid office, law school clinic doing survivor work, or an attorney who does it",
      detail:
        "These are the places that make a motion under § 11-34.1-5. LegalEase has contacted none of them, does not refer you to any particular one, and does not know what any of them will say. What it can tell you is which door to knock on."
    },
    sequence: [
      "Take the court and the case number, and the date you finished your sentence if you have it. That is enough to start a conversation.",
      "Ask two things. First: does § 11-34.1-5 reach this record? Second: has the one year since completion of sentence run, or when will it?",
      "Say early that you have been told the section waives first-offender status. It is the part most likely to change the answer, and it is the part a general enquiry can miss.",
      ONE_QUESTION_AND_NO_DETAILS,
      "What to expect from the first conversation. A service that does this work will not ask you to set everything out at once, and you are allowed to say that you do not want to go through it. How much is said, and when, is yours to decide.",
      "If the first place you contact cannot help, ask them who does. Survivor legal services in a small state usually know each other, and a referral from one of them travels further than a cold approach.",
      "On cost: no fee is identified for the motion, and many survivor services do not charge. If cost is the obstacle, say so at the outset.",
      NOTHING_IS_GENERATED_HERE,
      NOT_A_REPORT_ON_YOUR_CASE,
      "One thing that is not settled and is worth asking about while you are there. There may be further conviction relief in Rhode Island for survivors of human trafficking beyond this section, but which provision carries it is unresolved here. Ask whether anything else applies to you as well."
    ],
    fees:
      "None charged by this packet. No fee is identified for the motion itself, and many survivor legal services do not charge for their work.",
    feeWaiver:
      "None identified for this section. Cost is worth raising at the first contact rather than later, because it affects which organisation is the right one.",
    noticeOrService: [
      "There is nothing for you to serve and nobody for you to notify through this packet.",
      "Any notice or service the motion requires is handled by the attorney or legal service that makes it."
    ],
    expectedNextStage:
      "You leave this packet with the route named, the two questions to ask, and a destination that can act on it. What happens next is a conversation this packet cannot have for you.",
    canPrepare: [
      "This referral, and the two questions to open with.",
      "The point about first-offender status, which is the part most likely to change the answer.",
      "The note that further survivor relief may exist and is worth asking about."
    ],
    escalations: [
      "You cannot find an organisation that does this work.",
      "You are asked to set out what happened before anybody will look at the case.",
      "Your immigration status could be affected."
    ],
    sources: RI_SURVIVOR_SOURCES
  }),

  // ---- ri_filed_complaints --------------------------------------------------
  "ri-filed-eligibility-and-timing": sheet({
    templateId: "ri-filed-eligibility-and-timing",
    mechanismName: "A Rhode Island complaint placed on file: what happens on its own",
    whyNotAFiling:
      "Nothing is filed by you. Under R.I. Gen. Laws § 12-10-12 a complaint placed on file is automatically expunged where no action is taken during the filing period, and no criminal record results. There is no motion on this section, so LegalEase generates none.",
    processType: "automatic",
    prerequisites: [
      "The record is a Rhode Island record.",
      "The court placed the complaint on file, rather than convicting or dismissing outright.",
      "You can get the docket showing the filing date and the filing period."
    ],
    documentsToObtain: [
      "The court docket showing that the complaint was placed on file, and the filing date. Ask the clerk of the court where the complaint was filed."
    ],
    gather: [
      "The date the complaint was placed on file.",
      "The filing period the court set.",
      "Whether the court took any action on the complaint during that period.",
      "Whether the filed complaint was a domestic violence matter.",
      "Where it was: which court, and the case number."
    ],
    destination: {
      name: "No destination. The expungement follows by operation of R.I. Gen. Laws § 12-10-12",
      detail:
        "There is nowhere for you to send anything. Where the filing period runs without action the expungement follows automatically, and for a domestic violence filed complaint it follows once the three-year period passes without a further qualifying charge. No separate chapter 12-1.3 motion is required."
    },
    sequence: [
      NOT_A_REPORT_ON_YOUR_CASE,
      "What a filed complaint is. Certain complaints may be placed on file by the court rather than resolved by a conviction or a dismissal. It is its own disposition and it has its own rule.",
      "The ordinary rule. If no action is taken on the complaint during the filing period, the complaint is automatically expunged and no criminal record results.",
      "So the two facts that decide everything on this route are the filing date and the filing period the court set. Both come from the docket, and both are worth having in writing.",
      "The domestic violence rule, which is different and which people are most often not told. Where the filed complaint was a domestic violence matter, and the defendant is not charged with another domestic violence crime during the three-year period after filing, all records relating to the filed complaint are expunged.",
      "And a further charge inside those three years is not automatically the end of it: where such a charge is dismissed or results in acquittal, the expungement still follows.",
      "The part worth underlining. On the domestic violence route this happens without a separate chapter 12-1.3 motion. If somebody tells you that a motion has to be brought to clear a filed domestic violence complaint, that is not what the section says.",
      "Work out your dates from the docket: the filing date, the filing period, and if it was a domestic violence matter the date three years after filing.",
      "Then check what your record actually shows. That is the next sheet.",
      NO_MOTION_ON_THIS_SECTION
    ],
    fees: "None. There is no filing on this route, so there is nothing on it to pay for.",
    feeWaiver: "Not applicable. There is no fee to waive where there is nothing to file.",
    noticeOrService: [
      "There is nobody for you to notify and nothing to serve.",
      "Nobody is required to write and tell you that a filed complaint has been expunged, which is why this packet tells you to go and check."
    ],
    expectedNextStage:
      "The next sheet is how to check what your own record shows, against the dates you have just worked out.",
    canPrepare: [
      "This account of the ordinary rule and of the different domestic violence rule.",
      "The date calculation, and the list of what the docket needs to show.",
      "The status-check sheet and the escalation sheet that follow it in this packet."
    ],
    escalations: [
      "The docket does not make the filing period clear.",
      "The court took some action on the complaint during the filing period.",
      "There was a later domestic violence charge and you cannot tell how it ended."
    ],
    sources: RI_FILED_SOURCES
  }),

  "ri-filed-status-verification": sheet({
    templateId: "ri-filed-status-verification",
    mechanismName: "Checking whether the filed complaint has actually cleared",
    whyNotAFiling:
      "This is a plan for reading a court docket and your own criminal history record. Nothing on it is filed, and § 12-10-12 provides no motion for LegalEase to prepare.",
    processType: "automatic",
    prerequisites: [
      "You have the filing date and the filing period from the docket.",
      "You have read the sheet before this one in the packet."
    ],
    documentsToObtain: [
      "The court docket for the complaint, from the clerk of the court where it was placed on file.",
      "Your Rhode Island criminal history record from the Attorney General's Bureau of Criminal Identification."
    ],
    gather: [
      "The filing date and the date the filing period ended.",
      "For a domestic violence matter, the date three years after filing.",
      "The date of each check you make, and what each record showed on that date.",
      "Anything on either record you do not understand, written down exactly as it appears."
    ],
    destination: {
      name: "The clerk of the court where the complaint was placed on file, and the Attorney General's Bureau of Criminal Identification",
      detail:
        "The clerk holds the docket. The Bureau of Criminal Identification holds the criminal history record, and will release your own copy to you on request. LegalEase contacts neither and reads neither."
    },
    sequence: [
      "Ask the clerk for the docket. What you are looking for is the entry placing the complaint on file, the filing date, the filing period, and whether anything else was entered during that period.",
      "Then request your own criminal history record from the Attorney General's Bureau of Criminal Identification. That is the record an employer or a licensing body is most likely to see, and it is where the answer to this question actually lives.",
      "Read the two against your dates. The question is simple: has the period run, and is the complaint still showing?",
      "Where the period has run and the complaint is gone from your criminal history record, keep a dated copy. Nobody is required to tell you it has happened, so a copy you obtained yourself may be the only evidence of it you hold.",
      "For a domestic violence filed complaint, check the three years from filing rather than the filing period, and check that there was no further domestic violence charge in that window — or, if there was, that it was dismissed or ended in acquittal.",
      "The court record and the criminal history record are held by different bodies and one can be updated before the other, so a difference between them is information rather than an error.",
      "Do not read a delay as a refusal. Nothing on this page tells you how long anything takes in practice, because the section does not say and nobody has told us.",
      "Where the period has run and the complaint is still showing, the escalation sheet is the next page to read.",
      NOT_A_REPORT_ON_YOUR_CASE,
      NO_MOTION_ON_THIS_SECTION
    ],
    fees:
      "None on this route. The Bureau of Criminal Identification charges its own fee for a criminal history record; ask what it is before you request one.",
    feeWaiver: "Not applicable. There is no filing fee to waive where there is nothing to file.",
    noticeOrService: [
      "There is nobody for you to notify and nothing to serve.",
      "Nobody is required to write and tell you that a filed complaint has been expunged, which is why this sheet exists."
    ],
    expectedNextStage:
      "Either both records show the complaint gone, in which case keep a dated copy of each, or one of them does not, in which case the escalation sheet sets out the only route there is.",
    canPrepare: [
      "This verification plan and the list of what to ask each office for.",
      "The separate check that the domestic violence rule requires.",
      "The escalation sheet that follows it in this packet."
    ],
    escalations: [
      "The clerk cannot tell you what the filing period was.",
      "The docket and the criminal history record disagree.",
      "The complaint is showing as something other than a filed complaint."
    ],
    sources: RI_FILED_SOURCES
  }),

  "ri-filed-escalation": sheet({
    templateId: "ri-filed-escalation",
    mechanismName: "Where a filed complaint should have cleared and has not",
    whyNotAFiling:
      "A record that should have cleared and has not is an escalation rather than a filing, and this page is the escalation. Nothing on it is filed. Section 12-10-12 provides no motion for a complaint that should have been expunged and has not been, so there is nothing to prepare and inventing something would be worse than saying so.",
    processType: "automatic",
    prerequisites: [
      "The filing period has run, or for a domestic violence matter the three years have passed without a further qualifying charge.",
      "You have checked the docket and your criminal history record, and the complaint is still showing.",
      "You accept that this sheet routes you to a person rather than giving you a document."
    ],
    documentsToObtain: [
      "A dated copy of the court docket showing the complaint placed on file and the filing period.",
      "A dated copy of your Rhode Island criminal history record showing the complaint still there.",
      "Your written request to each office, and any reply."
    ],
    gather: [
      "The filing date and the date the period ran out.",
      "The court, the case number, and the date of each record you obtained.",
      "What you asked each office, when you asked it, and what they said.",
      "Any consequence that has already followed — a job, a licence, a tenancy — and its date."
    ],
    destination: {
      name: "The clerk of the court where the complaint was placed on file and the Bureau of Criminal Identification, and then a Rhode Island lawyer",
      detail:
        "The expungement is owed by operation of the section, so asking the two bodies that hold the record is the first step. Where that does not produce it, the honest answer is a lawyer rather than a form that does not exist."
    },
    sequence: [
      "Say the plain thing first. There is no motion to file under this section. The expungement follows automatically, and where it has not followed the section provides no application to fix it. This sheet gives you a route to a person, not a remedy.",
      "Ask the clerk of the court, in writing, what the docket shows and whether the complaint has been expunged. Put the case number and the filing date in the request, and keep a copy of what you sent.",
      "Ask the Bureau of Criminal Identification, in writing, what its record shows for the complaint, and keep a copy of that request too.",
      "Keep every reply, or the absence of one, with the dated copies. That file is the whole of the evidence that the expungement was owed and has not appeared, and it is the first thing anyone you take this to will ask for.",
      "Then take the file to " + RI_LEGAL_HELP + ". Where a consequence has already followed — a job lost, a tenancy refused — say so, because it changes how urgent the matter is.",
      "Nothing here is a finding that any court, clerk or office has done anything wrong, and nothing on this page says a record has been expunged or has failed to be. It records what each record showed on the day you looked at it.",
      "One honest note about the limits of this page. The history line of § 12-10-12 has been read to its most recent amendment, effective 23 June 2023, but the section itself was not read subsection by subsection. If somebody tells you the section provides a procedure this packet has not described, that is worth checking rather than dismissing.",
      NOT_A_REPORT_ON_YOUR_CASE,
      NO_MOTION_ON_THIS_SECTION
    ],
    fees: "None on this route. There is nothing to file, so there is nothing to pay for.",
    feeWaiver: "Not applicable. There is no filing fee to waive where there is nothing to file.",
    noticeOrService: [
      "There is nobody for you to notify and nothing to serve.",
      "Nobody is required to write and tell you that a filed complaint has been expunged, which is why the dated copies matter."
    ],
    expectedNextStage:
      "You leave this sheet with a dated record of what was owed and what has appeared, and with the one destination that exists for it. What happens after that depends on advice this packet cannot give.",
    canPrepare: [
      "This escalation plan and the list of what to ask each office.",
      "The account of what is not available, stated plainly rather than dressed up.",
      "The record of what you checked and when, which is what a lawyer will want first."
    ],
    escalations: [
      "An employer, landlord or licensing body has acted on the complaint.",
      "The court and the Bureau of Criminal Identification each say the other holds the record.",
      "Somebody tells you that a motion has to be brought to clear a filed complaint."
    ],
    sources: RI_FILED_SOURCES
  })
};

// ---------------------------------------------------------------------------
// Relief tracks
// ---------------------------------------------------------------------------

type ComponentSpec = { componentId: string; templateId: string; requirement?: "required" | "conditional"; conditionKey?: string };

function packetSet(trackId: string, components: readonly ComponentSpec[]): PacketSet {
  return {
    packetSetId: `${trackId}-set`,
    version: VERSION,
    components: components.map((component, index) => {
      if (!RHODE_ISLAND_GUIDANCE_TEMPLATES[component.templateId]) {
        throw new Error(
          `${component.componentId}: no Rhode Island guidance template ${component.templateId} is registered.`
        );
      }
      return {
        componentId: component.componentId,
        role: "process_guidance" as const,
        outputStrategy: "process_guidance" as const,
        rendererStrategy: "process_guidance" as const,
        templateId: component.templateId,
        sourcePath: null,
        sourceSha256: null,
        geographicScope: "statewide" as const,
        requirement: component.requirement ?? ("required" as const),
        ...(component.conditionKey ? { conditionKey: component.conditionKey } : {}),
        order: index + 1,
        approval: PENDING_APPROVAL,
        version: VERSION
      };
    })
  };
}

/**
 * Asked on both Rhode Island routes.
 *
 * Only record jurisdiction is shared, because it is the one stop condition the
 * design records on both tracks. The survivor route deliberately asks very
 * little else, and nothing at all about what happened.
 */
const SHARED_INPUTS: readonly RequiredInput[] = [
  {
    key: "recordJurisdiction",
    label:
      "Is the record from Rhode Island, another state, the federal courts, a tribal court, or a military court?",
    required: true
  }
];

function rhodeIslandTrack(input: {
  trackId: string;
  publicName: string;
  mechanism: string;
  authority: string;
  recordTypes: readonly string[];
  dispositions: readonly string[];
  components: readonly ComponentSpec[];
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
    jurisdiction: "RI",
    trackId: input.trackId,
    publicName: input.publicName,
    mechanism: input.mechanism,
    authority: input.authority,
    recordTypes: input.recordTypes,
    dispositions: input.dispositions,
    courtLevel: "not_applicable",
    geographicScope: "statewide",
    geographyKeys: [],
    outputStrategy: "process_guidance",
    packetSet: packetSet(input.trackId, input.components),
    requiredInputs: input.requiredInputs,
    statuses: {
      ...statuses,
      runtime: computeRuntimeStatus({
        statuses,
        sourceCurrent: true,
        runtimeDisabled: true,
        outputStrategy: "process_guidance"
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

export const RHODE_ISLAND_GUIDANCE_TRACKS: readonly ReliefTrack[] = [
  rhodeIslandTrack({
    trackId: "ri_commercial_sexual_activity",
    publicName: "Clear a record connected to commercial sexual activity",
    mechanism: "trauma_informed_detection_and_referral_for_section_11_34_1_5_expungement",
    authority:
      "R.I. Gen. Laws § 11-34.1-5, §§ 11-34.1-2 and 11-34.1-4, and R.I. Gen. Laws § 12-10-12",
    recordTypes: ["conviction", "charge", "court_record"],
    dispositions: ["convicted", "probation", "filed"],
    components: [
      {
        componentId: "ri_commercial_sexual_activity-route-detection-1",
        templateId: "ri-csa-route-detection"
      },
      {
        componentId: "ri_commercial_sexual_activity-referral-instructions-2",
        templateId: "ri-csa-referral"
      }
    ],
    requiredInputs: [
      ...SHARED_INPUTS,
      {
        key: "offenceUnderChapter1134",
        label: "Was the charge under Rhode Island statute 11-34.1-2 or 11-34.1-4?",
        required: true
      },
      {
        key: "traffickingOrCoercionConnection",
        label:
          "Was this case connected to trafficking, coercion or exploitation, or to someone forcing or directing what happened?",
        required: true
      },
      {
        key: "wantsToProvideDetails",
        label: "Do you want to give us details of what happened?",
        required: true
      },
      {
        key: "immigrationQuestion",
        label:
          "Could your immigration status be affected by this — for example, are you not a United States citizen?",
        required: true
      },
      {
        key: "sentenceCompletionDate",
        label: "On what date did you finish your sentence?",
        required: false
      },
      {
        key: "courtAndCaseNumber",
        label: "Which Rhode Island court handled the case, and what is the case number?",
        required: false
      }
    ],
    assembledPacketName: "rhode-island-commercial-sexual-activity-referral",
    assembledPacketTitle: "Rhode Island § 11-34.1-5 — a more generous route, and where it goes",
    customerDeliverableDescription:
      "Surfaces R.I. Gen. Laws § 11-34.1-5 to a participant who may have been told they are not eligible for expungement at all, because the section runs on one year from completion of sentence and lets the court grant the motion regardless of first-offender status. Names the route, explains why it ends in a referral to a survivor legal service rather than in a packet, and asks a single screening question without requesting any account of what happened. No motion is prepared and no factual showing is generated.",
    notes:
      "Process guidance only, and a trauma-informed referral rather than a filing route. Ask the single screening question and route; never request details of trafficking, exploitation or coercion and never generate a factual showing. Two research notes are preserved: which Chapter 12-1.3 subsection carries further survivor relief, and that the recorded effective date is a session convention rather than a sourced effective clause."
  }),

  rhodeIslandTrack({
    trackId: "ri_filed_complaints",
    publicName: "A complaint that was placed on file",
    mechanism: "automatic_expungement_of_a_filed_complaint_under_section_12_10_12",
    authority: "R.I. Gen. Laws § 12-10-12",
    recordTypes: ["charge", "court_record"],
    dispositions: ["filed"],
    components: [
      {
        componentId: "ri_filed_complaints-eligibility-and-timing-analysis-1",
        templateId: "ri-filed-eligibility-and-timing"
      },
      {
        componentId: "ri_filed_complaints-status-verification-instructions-2",
        templateId: "ri-filed-status-verification"
      },
      {
        componentId: "ri_filed_complaints-escalation-instructions-3",
        templateId: "ri-filed-escalation"
      }
    ],
    requiredInputs: [
      ...SHARED_INPUTS,
      {
        key: "complaintWasPlacedOnFile",
        label:
          "Was your complaint placed on file by the court, rather than resolved by a conviction or a dismissal?",
        required: true
      },
      { key: "filingDate", label: "On what date was the complaint placed on file?", required: true },
      {
        key: "filingPeriodUnclearOnTheDocket",
        label: "Is the docket unclear about what the filing period was?",
        required: true
      },
      {
        key: "actionTakenDuringFilingPeriod",
        label: "Did the court take any action on the complaint during the filing period?",
        required: true
      },
      {
        key: "domesticViolenceComplaint",
        label: "Was the filed complaint a domestic violence matter?",
        required: true
      },
      {
        key: "laterDomesticViolenceCharge",
        label:
          "In the three years since the complaint was filed, were you charged with another domestic violence crime — none, one that was dismissed or ended in acquittal, one that went another way, or are you not sure?",
        required: false
      },
      {
        key: "stillShowingOnBci",
        label: "Does the complaint still appear on your criminal history record?",
        required: true
      },
      {
        key: "courtAndCaseNumber",
        label: "Which Rhode Island court placed the complaint on file, and what is the case number?",
        required: true
      }
    ],
    assembledPacketName: "rhode-island-filed-complaint-expungement",
    assembledPacketTitle: "Rhode Island filed complaints — automatic expungement under § 12-10-12",
    customerDeliverableDescription:
      "Explains that a Rhode Island complaint placed on file is automatically expunged where no action is taken during the filing period, sets out the different domestic violence rule under which records are expunged three years after filing without a further qualifying charge and expressly without a separate chapter 12-1.3 motion, shows how to verify that against the docket and the Bureau of Criminal Identification record, and gives the escalation for a complaint that should have cleared and has not. Nothing is filed by the participant and no motion exists on the section.",
    notes:
      "Process guidance only. Relief is automatic by operation of § 12-10-12; there is no motion on the section and none may be suggested or generated. A research note is preserved: the section's operative text was not read subsection by subsection, although its history line has been read to the amendment effective 23 June 2023."
  })
];
