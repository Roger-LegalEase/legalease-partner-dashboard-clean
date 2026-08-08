// Vermont process guidance — two adult-diversion routes, and neither of them
// asks the participant for anything.
//
// Both tracks live in 3 V.S.A. § 164, "Adult court diversion program", whose
// subsection (f) is captioned "Records; deletion and expungement". Section 164
// was amended by 2023 Act 180, effective 1 July 2025, and by 2025 Act 64,
// effective 2 July 2025 — not by Act 60. The two branches of subsection (f)
// are genuinely different machinery, which is why they are two tracks:
//
//   - `vt_diversion_post_charge` is § 164(f)(5). Within 30 days after the
//     two-year anniversary of a successful completion of adult post-charge
//     diversion, the court shall give notice to all parties of record of its
//     intention to order the expungement of all court files and records, law
//     enforcement records, fingerprints and photographs. It shall give the
//     State's Attorney an opportunity for a hearing to contest, and shall
//     expunge on three findings: that two years have elapsed since successful
//     completion, that there has been no subsequent felony or misdemeanour
//     conviction in that period and no proceeding pending seeking one, and
//     that no restitution related to the case is owed. The duty runs to the
//     court. The participant files nothing.
//   - `vt_diversion_pre_charge` is § 164(f)(1) to (4). Within 10 days of
//     successful completion the programme notifies the victim, law enforcement
//     and the State's Attorney; payment of restitution is required for a
//     completion to be successful at all. Within 30 days after the two-year
//     anniversary of that notification to the State's Attorney's office, the
//     Attorney General shall give notice that the records held by the
//     diversion programme shall be deleted, and law enforcement and State's
//     Attorney public records follow. No court is involved, because no charge
//     was ever filed. The duty runs to the Attorney General and the holding
//     agencies.
//
// The single most valuable thing either sheet does is stop somebody buying a
// petition they do not need. The adopted design says so in terms: a person who
// completed diversion is on a no-fee, no-petition route, and that is the
// question the internal reference never asks.
//
// Vocabulary is a scope restriction here rather than a style preference. After
// 1 July 2025 Vermont is a sealing state rather than an expungement state, and
// participant copy must not use expungement as the umbrella term. Three
// different things are kept apart on both sheets: expungement removes records
// from any accessible database and destroys the paper file; sealing moves them
// into a confidential file without destroying them; deletion is what § 164(f)
// does to pre-charge diversion records held by the programme and the agencies.
// The post-charge branch really is expungement, because the statute says so;
// the pre-charge branch is deletion; neither is sealing, and neither is the
// petition-based sealing that other Vermont routes carry.
//
// What is preserved as open, on the sheet rather than in a comment:
//
//   - **Whether anything survives for an older post-charge completion.** The
//     controlling review placed the adult diversion tracks at § 164(g) and (j)
//     and split them on whether diversion was completed before 1 July 2002.
//     Section 164 as read on 6 August 2026 splits them on pre-charge versus
//     post-charge instead. Whether former § 164(g) or (j) survives anywhere
//     for a person who completed under the old scheme was not established.
//   - **What route exists for a pre-charge completion before 1 July 2025.**
//     Subsection (f)(4), captioned "Deletion applicability", limits the
//     automatic deletion scheme to completions on or after that date. Whether
//     any petition route survives for earlier completions was not established
//     and none is asserted.
//   - **Valcour.** Subsection (f) expressly exempts Valcour and similar
//     non-public law enforcement databases from deletion. No alternative route
//     to removal from one was identified, and none is invented.
//   - **Federal records.** Vermont relief does not reach them, even though the
//     Vermont Crime Information Center notifies the FBI's National Crime
//     Information Center, so a record can still surface in a federal criminal
//     background check.
//
// Neither sheet prepares anything. No sealing petition and no fee-waiver
// application appears on either: those are separate Vermont routes owned by
// other jobs, and the official petition and fee-waiver forms are neither named
// nor produced here. The one form either sheet mentions is the Judiciary's own
// Request for Criminal Record Search, which the participant obtains from the
// court to look at their own record — LegalEase does not generate it, complete
// it or submit it.
//
// No conditional component and no fact placeholder appears in this family: the
// adopted packet sets make both components required and neither template
// interpolates a participant answer, so a second fixture on either track would
// render byte-for-byte the same packet. The branches that matter are typed
// stops, and all sixteen are exercised as negative cases in the committed
// verifier.
//
// This module is not imported by `src/lib/rcap/packets/registry.ts`. Vermont is
// not an enabled jurisdiction and this job does not enable one.

import type { GuidanceTemplate } from "@/lib/rcap/packets/engines/process-guidance";
import type { PacketSet, ReliefTrack, RequiredInput } from "@/lib/rcap/packets/types";
import { computeRuntimeStatus } from "@/lib/rcap/packets/types";

const VERSION = "1.0.0";

const BANNER =
  "DRAFT PENDING LEGAL REVIEW — PREPARED BY LEGALEASE — NOT LEGAL ADVICE — THIS IS NOT A COURT FILING";

const PENDING_APPROVAL = { visual: "not_reviewed", legal: "not_submitted" } as const;

/** Vermont legal help, named once so no stop is a dead end. */
const VT_LEGAL_HELP =
  "a Vermont legal aid office, the Vermont Bar Association lawyer referral service, or a Vermont attorney who does record-clearing work";

/** The other Vermont routes, named the same way by every stop that points at them. */
const VT_OTHER_ROUTES =
  "the other Vermont record-clearing routes, which are separate routes in the Vermont intake";

/** The programme that supervised the participant, named consistently. */
const VT_DIVERSION_PROGRAM =
  "the adult court diversion programme that supervised you";

// ---------------------------------------------------------------------------
// Shared participant copy
// ---------------------------------------------------------------------------

/** No sheet reports on the participant's own record. */
const NOT_A_REPORT_ON_YOUR_CASE =
  "This page explains how a process works. It does not tell you what has happened to your own record, and LegalEase has not looked. Nothing here is a decision about whether a particular record qualifies.";

/** The single most valuable sentence in the family. */
const NO_PETITION_TO_BUY =
  "The most useful thing on this page, and the reason it exists at all. If you completed adult court diversion, you are on a route that runs without a petition and without a fee. Nobody should sell you a petition packet for it. If somebody offers to prepare one, the question worth asking first is which statute they think requires it, because this section does not.";

/** Vocabulary, which in Vermont is a legal distinction rather than a style one. */
const THREE_DIFFERENT_WORDS =
  "Three words get used as if they meant the same thing, and in Vermont they do not. Expungement removes records from any accessible database and destroys the paper file. Sealing moves records into a confidential file without destroying them. Deletion is what section 164 does to the diversion programme's own records. Since 1 July 2025 most Vermont record-clearing runs on sealing rather than expungement, so a page that used expungement as the umbrella word would be telling you the wrong thing about the outcome.";

/** Vermont relief stops at the state line, whatever the NCIC notification does. */
const FEDERAL_RECORDS_ARE_NOT_REACHED =
  "One limit worth knowing before you rely on any of this. Vermont relief reaches Vermont records. A record can still appear in a federal criminal background check even after Vermont has acted, and that remains true even though the Vermont Crime Information Center notifies the FBI's National Crime Information Center. If a federal check is what matters to you, say so to whoever advises you.";

/** Nothing is filed on either branch, and nothing can be. */
const NOTHING_IS_FILED =
  "Nothing is filed by you on this route and nothing is generated for you to sign. LegalEase produces no petition, motion, application, request or letter here. What this page does is tell you who acts, when, what would stop it, and how you would find out.";

const VT_CANNOT_PERFORM: readonly string[] = [
  "LegalEase cannot expunge, seal, delete or remove anything, and cannot make a court, a clerk, a prosecutor, a diversion programme or a records agency act.",
  "LegalEase does not prepare a petition, motion, application or request on this route, and does not prepare one for anybody to sign.",
  "LegalEase cannot tell you whether a particular record qualifies. This page explains how a process works; it is not legal advice and it is not an eligibility decision.",
  "LegalEase cannot tell you that a record has been expunged or deleted. Only a check of your own record shows that, and you are the one who reads it.",
  "LegalEase does not obtain, hold, inspect or authenticate your criminal record. You request your own copy and you read it.",
  "LegalEase has not contacted any court, clerk, prosecutor, diversion programme or agency about your case, and has not filed anything for you.",
  "LegalEase cannot tell you how long any office will take. Where this page gives a period, it is the one the statute gives, not a prediction."
];

/** Base sources for the family; each sheet adds the ones it actually relies on. */
const VT_BASE_SOURCES: readonly string[] = [
  "3 V.S.A. § 164, Adult court diversion program, read at the Vermont General Assembly on 6 August 2026. Subsection (f) is captioned Records; deletion and expungement.",
  "3 V.S.A. § 164 as amended by 2023 Act 180, effective 1 July 2025, and by 2025 Act 64, effective 2 July 2025.",
  "Expunging and Sealing Criminal Records, Vermont Judiciary, read on 6 August 2026."
];

// ---------------------------------------------------------------------------
// Typed stops
// ---------------------------------------------------------------------------

/** Raised where an answer takes the participant outside self-help entirely. */
export class VermontGuidanceStopError extends Error {
  constructor(
    readonly trackId: string,
    readonly stopId: string,
    readonly reason: string,
    readonly routeTo: string,
    readonly nextStep: string
  ) {
    super(reason);
    this.name = "VermontGuidanceStopError";
  }
}

/** Raised where an honest answer belongs to the other branch of § 164(f). */
export class VermontRouteMismatchError extends Error {
  constructor(
    readonly trackId: string,
    readonly stopId: string,
    readonly reason: string,
    readonly routeTo: string,
    readonly nextStep: string
  ) {
    super(reason);
    this.name = "VermontRouteMismatchError";
  }
}

/** Raised when a participant answer is outside the approved closed list. */
export class VermontBranchError extends Error {
  constructor(
    readonly trackId: string,
    readonly key: string,
    readonly value: string
  ) {
    super(`${trackId}: "${value}" is not an approved value for ${key}.`);
    this.name = "VermontBranchError";
  }
}

export const VT_YES_NO: Readonly<Record<string, boolean>> = { yes: true, no: false };

/** Section 164 reaches Vermont records and nothing else. */
export const VT_RECORD_JURISDICTIONS: Readonly<Record<string, string>> = {
  vermont_state: "within",
  another_state: "outside",
  federal: "outside",
  tribal: "outside"
};

/** The axis the current statute actually splits on. */
export const VT_DIVERSION_TYPES: Readonly<Record<string, string>> = {
  pre_charge: "pre_charge",
  post_charge: "post_charge",
  cannot_tell: "unknown"
};

/** Whether the § 164(f)(4) applicability cut-off is met. */
export const VT_COMPLETION_ERA: Readonly<Record<string, string>> = {
  on_or_after_1_july_2025: "within",
  before_1_july_2025: "outside",
  cannot_tell: "unknown"
};

/** What the participant's own record check showed once the window had run. */
export const VT_RECORD_STATUS: Readonly<Record<string, string>> = {
  no_longer_shows: "cleared",
  still_shows_after_the_window: "still_shows",
  window_has_not_run_yet: "too_early",
  not_yet_checked: "unchecked"
};

function branch<T>(
  trackId: string,
  key: string,
  table: Readonly<Record<string, T>>,
  raw: unknown
): { value: string; resolved: T } {
  const value = typeof raw === "string" ? raw.trim() : "";
  if (!Object.prototype.hasOwnProperty.call(table, value)) {
    throw new VermontBranchError(trackId, key, value);
  }
  return { value, resolved: table[value] };
}

const PRE_CHARGE_TRACK = "vt_diversion_pre_charge";
const POST_CHARGE_TRACK = "vt_diversion_post_charge";

/**
 * Validates participant answers and routes to the correct Vermont node.
 *
 * The order is: Vermont records first, then which branch of § 164(f) this
 * actually is — because the two schemes share almost nothing — then
 * immigration, then each branch's own conditions in the order the design
 * lists them, then what the participant's own record check showed.
 *
 * Fails closed on any answer outside a closed list. Every stop and every
 * mismatch carries a reason, a destination and the next step to take there.
 */
export function deriveVermontGuidanceFacts(
  trackId: string,
  facts: Record<string, unknown>
): Record<string, unknown> {
  const derived: Record<string, unknown> = { ...facts };

  // Gate 1. Section 164 reaches Vermont records.
  const jurisdiction = branch(
    trackId,
    "recordJurisdiction",
    VT_RECORD_JURISDICTIONS,
    facts.recordJurisdiction
  );
  if (jurisdiction.resolved === "outside") {
    throw new VermontRouteMismatchError(
      trackId,
      "record_is_not_a_vermont_state_record",
      "Vermont's adult court diversion scheme runs on Vermont records. It does not reach a federal, tribal or out-of-state record, and nothing on this route touches one.",
      "the state, federal or tribal authority that holds the record, and " + VT_LEGAL_HELP,
      "Take the record to that authority and ask what its own law provides for clearing it. If you also have Vermont matters, those are handled separately and only those are served here."
    );
  }

  // Gate 2. Which branch of subsection (f) this is. The two share almost
  // nothing, so the wrong answer here makes everything after it wrong.
  const diversion = branch(trackId, "diversionType", VT_DIVERSION_TYPES, facts.diversionType);
  if (diversion.resolved === "unknown") {
    throw new VermontGuidanceStopError(
      trackId,
      "whether_the_diversion_was_pre_charge_or_post_charge_cannot_be_established",
      "Everything on this route turns on which kind of diversion it was, and the two run on completely different machinery. Pre-charge diversion happens before anything is filed in court and its records are deleted administratively; post-charge diversion happens after a charge has been brought and the court expunges. If you cannot tell which yours was, nothing on this page can be applied safely, and guessing would send you to the wrong office.",
      VT_DIVERSION_PROGRAM + ", or the State's Attorney's office for the county, and " + VT_LEGAL_HELP,
      "Ask the diversion programme whether a charge had been filed in court when you were referred, and ask for written confirmation of your successful completion and its date. Come back with that answer."
    );
  }
  if (trackId === POST_CHARGE_TRACK && diversion.resolved === "pre_charge") {
    throw new VermontRouteMismatchError(
      trackId,
      "diversion_was_pre_charge_rather_than_post_charge",
      "Pre-charge diversion is cleared under a different part of the same section, and it is not a court process at all — no charge was ever filed, so there is no court file to expunge. What happens instead is administrative deletion of the records the programme and the agencies hold.",
      "the Vermont pre-charge diversion route, which is a separate route in the Vermont intake",
      "Go back to the Vermont intake, say the diversion was pre-charge, and ask for the deletion route. Take the date of your successful completion with you, because that date decides whether the scheme reaches you at all."
    );
  }
  if (trackId === PRE_CHARGE_TRACK && diversion.resolved === "post_charge") {
    throw new VermontRouteMismatchError(
      trackId,
      "diversion_was_post_charge_rather_than_pre_charge",
      "Post-charge diversion is cleared under a different part of the same section, and it is a court process: the court gives notice of its own intention to expunge the court files and records and acts on statutory findings. The administrative deletion described here is the pre-charge scheme and does not apply to it.",
      "the Vermont post-charge diversion route, which is a separate route in the Vermont intake",
      "Go back to the Vermont intake, say a charge had been filed before you were diverted, and ask for the court-initiated route. Take the date of your successful completion and the county with you."
    );
  }

  // Gate 3. Immigration, which the design makes a self-help boundary on both.
  const immigration = branch(
    trackId,
    "immigrationConsequences",
    VT_YES_NO,
    facts.immigrationConsequences
  );
  if (immigration.resolved) {
    throw new VermontGuidanceStopError(
      trackId,
      "immigration_consequences_in_play",
      "An immigration matter changes what clearing a record is worth and can change whether you want it cleared at the same time. Vermont relief does not reach federal records, and a record can still surface in a federal criminal background check. This is a stop rather than a warning because getting the order of operations wrong here is expensive and hard to undo.",
      "an immigration attorney, and afterwards " + VT_LEGAL_HELP,
      "Speak to an immigration attorney before you plan anything around this route, and ask them what records you should obtain and keep while you still can."
    );
  }

  if (trackId === POST_CHARGE_TRACK) {
    // Gate 4a. The State's Attorney's right to contest.
    const contested = branch(
      trackId,
      "statesAttorneyContested",
      VT_YES_NO,
      facts.statesAttorneyContested
    );
    if (contested.resolved) {
      throw new VermontGuidanceStopError(
        trackId,
        "states_attorney_has_contested_the_expungement",
        "The statute gives the State's Attorney an opportunity for a hearing to contest, and a contested hearing is a court proceeding with somebody arguing on the other side. That is advocacy rather than a process to follow, and it is not something a page can carry you through.",
        VT_LEGAL_HELP,
        "Get a lawyer before the hearing date. Take the court's notice of its intention to expunge and anything the State's Attorney has filed, and ask what the objection actually says."
      );
    }

    // Gate 5a. The subsequent-conviction finding.
    const subsequent = branch(
      trackId,
      "subsequentConvictionOrPendingProceeding",
      VT_YES_NO,
      facts.subsequentConvictionOrPendingProceeding
    );
    if (subsequent.resolved) {
      throw new VermontGuidanceStopError(
        trackId,
        "subsequent_conviction_or_pending_proceeding_in_the_two_year_period",
        "One of the three findings the court has to make is that there has been no subsequent felony or misdemeanour conviction during the two-year period and that no proceeding is pending seeking one. A conviction or a live proceeding in that window goes directly to that finding. Whether a particular matter counts, and what happens to the diversion record if it does, is a legal question about your whole record rather than about the diverted case.",
        VT_LEGAL_HELP,
        "Take the diverted case and everything that has happened since, with dates, to one of them and ask what the court is likely to find and what your options are."
      );
    }

    // Gate 6a. Restitution defeats the finding.
    const restitution = branch(
      trackId,
      "restitutionOwed",
      VT_YES_NO,
      facts.restitutionOwed
    );
    if (restitution.resolved) {
      throw new VermontGuidanceStopError(
        trackId,
        "restitution_related_to_the_case_remains_outstanding",
        "The court has to find that no restitution related to the case is owed. Outstanding restitution defeats that finding, so the expungement does not follow while it is unpaid. This is worth acting on rather than waiting out, because it is the one condition on this route that is usually within your control.",
        "the Restitution Unit of the Vermont Center for Crime Victim Services, and " + VT_LEGAL_HELP,
        "Ask the Restitution Unit for a current balance on the case in writing, and ask what arrangements are available if the balance is not something you can clear at once."
      );
    }

    // Gate 7a. The window has run and nothing has happened.
    const status = branch(trackId, "recordStatus", VT_RECORD_STATUS, facts.recordStatus);
    if (status.resolved === "still_shows") {
      throw new VermontGuidanceStopError(
        trackId,
        "the_court_window_has_passed_and_the_record_still_shows",
        "Two years and the court's own 30-day window have run and the case is still showing. There is more than one explanation — the three findings may not all have been made, the State's Attorney may have contested, or the record you are looking at may be held somewhere the order has not reached — and the honest position is that this page cannot tell which. No deadline or appeal attaches to the participant on this route, so none is offered here.",
        "the Criminal Division of the Superior Court in the county that handled the charge, and " + VT_LEGAL_HELP,
        "Ask the court whether notice of an intended expungement was given, whether the State's Attorney contested, and whether an order was made. Take whatever the court tells you to legal help."
      );
    }
  }

  if (trackId === PRE_CHARGE_TRACK) {
    // Gate 4b. The § 164(f)(4) applicability cut-off, which is a hard edge.
    const era = branch(trackId, "completionEra", VT_COMPLETION_ERA, facts.completionEra);
    if (era.resolved === "outside" || era.resolved === "unknown") {
      throw new VermontGuidanceStopError(
        trackId,
        "completion_predates_the_automatic_deletion_scheme",
        "Subsection (f)(4) of section 164, captioned Deletion applicability, limits the automatic deletion scheme to people who completed pre-charge diversion on or after 1 July 2025. A completion before that date is outside the scheme, and it is outside it permanently rather than early — waiting will not bring it within reach. What route, if any, exists for an earlier completion was not established, and this page will not invent one. The same answer applies if you cannot pin down the date, because the date is what decides it.",
        VT_LEGAL_HELP + ", and " + VT_DIVERSION_PROGRAM + " for the completion date",
        "Ask the diversion programme for written confirmation of your completion date, then take it to legal help and ask whether any route reaches a completion from before 1 July 2025."
      );
    }

    // Gate 5b. Restitution is a condition of successful completion itself.
    const restitutionPaid = branch(
      trackId,
      "restitutionPaid",
      VT_YES_NO,
      facts.restitutionPaid
    );
    if (!restitutionPaid.resolved) {
      throw new VermontGuidanceStopError(
        trackId,
        "restitution_was_not_paid_so_the_completion_may_not_be_successful",
        "On the pre-charge branch, payment of restitution is required for a completion to count as successful in the first place. So unpaid restitution does not merely delay deletion; it puts in question whether the completion that starts the clock ever happened. That is a different and more serious problem than owing money, and it needs somebody to look at what the programme actually recorded.",
        VT_DIVERSION_PROGRAM + ", the Restitution Unit of the Vermont Center for Crime Victim Services, and " + VT_LEGAL_HELP,
        "Ask the programme in writing whether it recorded your completion as successful and on what date, and ask the Restitution Unit for a current balance. Take both answers to legal help."
      );
    }

    // Gate 6b. The Valcour exemption, which has no identified remedy.
    const exemptDatabase = branch(
      trackId,
      "wantsRemovalFromAnExemptDatabase",
      VT_YES_NO,
      facts.wantsRemovalFromAnExemptDatabase
    );
    if (exemptDatabase.resolved) {
      throw new VermontGuidanceStopError(
        trackId,
        "removal_from_an_exempt_law_enforcement_database_requested",
        "Section 164(f) expressly exempts Valcour and similar non-public law enforcement databases from deletion, so an entry can survive there after everything else has gone. Whether any route to removal from one exists was not established, and none was found. That is a real gap rather than an omission, and no remedy, deadline or appeal is invented here to fill it.",
        VT_LEGAL_HELP,
        "Take what you know about where the entry is held to one of them and ask whether anything reaches a non-public law enforcement database. Do not assume from this page that nothing does; assume only that this page does not know of one."
      );
    }

    // Gate 7b. The window has run and records still appear.
    const status = branch(trackId, "recordStatus", VT_RECORD_STATUS, facts.recordStatus);
    if (status.resolved === "still_shows") {
      throw new VermontGuidanceStopError(
        trackId,
        "the_deletion_window_has_passed_and_records_still_appear",
        "The two-year period and the 30-day window have run and something is still showing. There is more than one explanation — the notification that starts the clock may have been given later than you think, a holding agency may not have acted, or the entry may be in a database the section exempts — and this page cannot tell which. No deadline or appeal attaches to the participant on this route, so none is offered here.",
        "the Vermont Attorney General's office, " + VT_DIVERSION_PROGRAM + ", and " + VT_LEGAL_HELP,
        "Ask the programme when it notified the State's Attorney's office of your successful completion, because that date starts the two-year clock rather than the completion itself. Take that date and what your record shows to legal help."
      );
    }
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
  /** Required per sheet. The two branches charge nothing for different reasons. */
  fees: string;
  feeWaiver: string;
  /** Required per sheet. Notice is the sharpest difference between the two. */
  noticeOrService: readonly string[];
  expectedNextStage: string;
  canPrepare: readonly string[];
  escalations: readonly string[];
  /** Required per sheet, because one branch's sources mislead on the other. */
  sources: readonly string[];
};

/**
 * Builds one sheet.
 *
 * `fees`, `feeWaiver`, `noticeOrService` and `sources` are required rather than
 * defaulted. On a two-branch jurisdiction a shared default is how one route's
 * law reaches the other route's page: here the court gives notice on the
 * post-charge branch and the Attorney General gives it on the pre-charge
 * branch, and a record-search form that belongs to the court route would imply
 * a court on a route that never had one.
 */
function sheet(input: SheetInput): GuidanceTemplate {
  return {
    templateId: input.templateId,
    version: VERSION,
    technicalFixture: true,
    banner: BANNER,
    mechanismName: input.mechanismName,
    whyNotAFiling: input.whyNotAFiling,
    processType: input.processType,
    prerequisites: [...input.prerequisites],
    documentsToObtain: [...input.documentsToObtain],
    participantDataToGather: [...input.gather],
    officialDestination: input.destination,
    actionSequence: [...input.sequence],
    submissionMethod:
      "There is nothing for you to submit and nowhere to submit it. No petition, motion, application, request or letter is generated on this route, and nothing is sent on your behalf.",
    fees: input.fees,
    feeWaiver: input.feeWaiver,
    noticeOrService: [...input.noticeOrService],
    expectedNextStage: input.expectedNextStage,
    legalEaseCanPrepare: [...input.canPrepare],
    legalEaseCannotPerform: VT_CANNOT_PERFORM,
    escalationTriggers: [...input.escalations],
    officialSourceReferences: [...VT_BASE_SOURCES, ...input.sources]
  };
}

const VT_COMMON_ESCALATIONS: readonly string[] = [
  "The record is a federal, tribal or out-of-state record.",
  "Your immigration status could be affected by the record.",
  "You cannot establish whether the diversion was pre-charge or post-charge.",
  "Somebody offers to prepare a petition for a diverted case."
];

export const VERMONT_GUIDANCE_TEMPLATES: Readonly<Record<string, GuidanceTemplate>> = {
  "vt-diversion-post-charge-process-guidance": sheet({
    templateId: "vt-diversion-post-charge-process-guidance",
    mechanismName:
      "After post-charge court diversion: the court clears the record, and you file nothing",
    whyNotAFiling:
      "Nothing is filed by you and nothing is prepared for you, because on this route the duty runs to the court. Under 3 V.S.A. section 164(f)(5) the court gives notice of its own intention to order the expungement of the court files and records, the law enforcement records, the fingerprints and the photographs, and expunges on three statutory findings. There is no petition, no form and no fee. What this page does is tell you when the court acts, what would stop it, and how you would find out.",
    processType: "automatic",
    prerequisites: [
      "The case was a Vermont case.",
      "A charge had been filed in court before you were referred to diversion.",
      "You successfully completed the diversion programme.",
      "You are willing to check your own record rather than assume either way."
    ],
    documentsToObtain: [
      "Written confirmation of your successful completion of diversion, and its date, from the adult court diversion programme that supervised you or from the State's Attorney's office. That date starts the two-year clock, so it is the single most important fact on this route.",
      "A criminal record search result for the county, from the Criminal Division of the Superior Court. The Judiciary publishes a Request for Criminal Record Search, form 200-00331, which you complete yourself and take or send to the court; LegalEase does not produce it, complete it or send it. This is how you see whether the expungement happened.",
      "A written statement from the Restitution Unit of the Vermont Center for Crime Victim Services showing what, if anything, remains owed on the case — worth getting if you are not certain, because outstanding restitution defeats one of the court's three findings."
    ],
    gather: [
      "The date you successfully completed diversion.",
      "Which county handled the charge.",
      "Whether you have been convicted of any felony or misdemeanour in the two years since you completed, and whether any such case is pending.",
      "Whether any restitution related to the case is still owed.",
      "What a check of your own record currently shows, and the date you checked."
    ],
    destination: {
      name: "The Vermont Superior Court that handled the diverted charge — and, for checking, its Criminal Division",
      detail:
        "The court acts on its own initiative. It gives notice to all parties of record of its intention to order the expungement, gives the State's Attorney an opportunity for a hearing to contest, and expunges on its findings. Nothing is submitted by you at any point, and LegalEase contacts nobody about your case."
    },
    sequence: [
      NOT_A_REPORT_ON_YOUR_CASE,
      NO_PETITION_TO_BUY,
      "The mechanism, in the order it actually happens. Within 30 days after the two-year anniversary of your successful completion of post-charge diversion, the court shall give notice to all parties of record that it intends to order the expungement of all court files and records, law enforcement records, fingerprints and photographs relating to the case. That notice is the court's own step. Nobody has to ask for it.",
      "Then the State's Attorney gets a say. The court shall give the State's Attorney an opportunity for a hearing to contest the expungement. Most of the time nothing happens at this stage, but the right to contest is real and it is why the outcome is not automatic in the way people expect.",
      "Then the three findings. The court shall expunge if it finds that two years have elapsed since your successful completion, that there has been no subsequent felony or misdemeanour conviction during that two-year period and no proceeding is pending seeking one, and that you owe no restitution related to the case. All three have to hold. The one most often within your own control is the third.",
      "So the clock to count from is the date of successful completion, not the date the charge was brought and not the date the case closed. If you are unsure of it, that is the thing to establish first, because everything else is measured from it.",
      THREE_DIFFERENT_WORDS,
      "On this branch the statute really does say expungement, and it reaches the court files and records, law enforcement records, fingerprints and photographs. That is a wider list than people expect and it is worth reading twice.",
      "How to find out whether it happened, which is the only way you ever will. Ask the Criminal Division of the Superior Court in the county for a criminal record search. The Judiciary publishes the request form for that; you complete it yourself and the court runs the search. Nobody writes to tell you when a record has been expunged, so your own check is the instrument.",
      "What the two possible answers mean. If the case no longer shows, that is your answer. If it still shows after two years and the court's 30-day window have run, there is more than one explanation and this page cannot tell you which — the findings may not all have been made, the State's Attorney may have contested, or the copy you are looking at may sit somewhere the order did not reach. Ask the court what happened before you assume anything.",
      "One thing that is genuinely open, and it is stated here rather than buried. An older completion may sit outside this scheme entirely. Section 164 used to be organised differently, and whether anything survives for a person who completed adult diversion under the previous arrangement was not established when this page was written. If your completion was some years ago, ask about that specifically rather than assuming this section reaches it.",
      FEDERAL_RECORDS_ARE_NOT_REACHED,
      NOTHING_IS_FILED
    ],
    fees:
      "None. There is no participant filing on this route, so there is no filing fee. Getting a criminal record search from the court, and getting a restitution statement, are separate services and the office concerned will tell you what, if anything, each costs.",
    feeWaiver:
      "Not applicable on this route. There is no fee here to waive, because there is nothing here to file. Fee waivers belong to the Vermont routes that involve a filing, and those are separate routes in the Vermont intake.",
    noticeOrService: [
      "There is nothing for you to serve and nobody for you to notify.",
      "The court gives notice to all parties of record of its intention to order the expungement. That is the court's notice, not yours, and it is not a notice you have to answer.",
      "The State's Attorney is given an opportunity for a hearing to contest. If that happens, it happens between the State's Attorney and the court.",
      "Nobody is required to write and tell you when a record has been expunged, which is why the record search is the step this page asks you to take."
    ],
    expectedNextStage:
      "You leave this sheet knowing that the court acts on its own, when the clock starts, what three things the court has to find, what the State's Attorney can do about it, and how to check whether it happened.",
    canPrepare: [
      "This account of what the court does on its own initiative, and of the point at which it does it.",
      "The three findings the court has to make, so that you can see which one might be a problem for you.",
      "The plain statement that nobody should sell you a petition for a diverted case.",
      "The list of what to obtain, starting with the completion date that the whole clock runs from.",
      "The explanation of how to check, and of what each of the two answers means.",
      "A plain statement of what is still open, including whether an older completion is reached at all."
    ],
    escalations: [
      ...VT_COMMON_ESCALATIONS,
      "The State's Attorney contests the expungement and the court sets a hearing.",
      "You have been convicted of something, or something is pending, in the two years since you completed.",
      "Restitution related to the case is still owed.",
      "Two years and the court's 30-day window have clearly passed and nothing has changed.",
      "You completed adult diversion some years ago and cannot tell whether the current section reaches it."
    ],
    sources: [
      "3 V.S.A. § 164(f)(5), the court-initiated expungement following successful completion of adult post-charge diversion.",
      "Form 200-00331, Request for Criminal Record Search (rev. 05/2026), Vermont Judiciary, read on 6 August 2026. It is the participant's own record-search request and is not generated here."
    ]
  }),

  "vt-diversion-pre-charge-process-guidance": sheet({
    templateId: "vt-diversion-pre-charge-process-guidance",
    mechanismName:
      "After pre-charge diversion: the records are deleted administratively, and no court is involved",
    whyNotAFiling:
      "Nothing is filed by you and nothing is prepared for you, and on this route there is no court at all — no charge was ever brought, so there is no court file. Under 3 V.S.A. section 164(f)(1) to (4) the deletion runs administratively: the Attorney General gives notice that the records held by the diversion programme shall be deleted, and law enforcement and State's Attorney public records follow. There is no petition, no form and no fee. What this page does is tell you who acts, when, and what the scheme does not reach.",
    processType: "agency",
    prerequisites: [
      "The matter was a Vermont matter.",
      "You were referred to diversion before any charge was filed in court.",
      "You successfully completed the programme, which on this branch requires that restitution was paid.",
      "You completed on or after 1 July 2025, because the automatic deletion scheme does not reach earlier completions."
    ],
    documentsToObtain: [
      "Written confirmation of your successful completion of pre-charge diversion, and its date, from the adult court diversion programme that supervised you. The date decides two things at once: whether the scheme reaches you at all, and when the clock runs out.",
      "A criminal conviction record from the Vermont Crime Information Center, if you want to see what, if anything, still appears. There is a charge for it and the amount is not quoted here; ask the Center for the current figure before you order it."
    ],
    gather: [
      "The date you successfully completed pre-charge diversion.",
      "Which county's diversion programme supervised you.",
      "Whether all restitution was paid, because on this branch that is part of what makes a completion successful.",
      "Whether anything about the matter has shown up on a background check since you completed, and where."
    ],
    destination: {
      name: "The Vermont Attorney General, the adult court diversion programme, law enforcement and the State's Attorney",
      detail:
        "The Attorney General gives notice that the records held by the diversion programme shall be deleted, and the law enforcement and State's Attorney public records follow. Nothing is submitted by you at any point, no court is involved because no charge was ever filed, and LegalEase contacts nobody about your case."
    },
    sequence: [
      NOT_A_REPORT_ON_YOUR_CASE,
      NO_PETITION_TO_BUY,
      "Start with the date, because on this branch one date decides everything. Subsection (f)(4) of section 164, which is captioned Deletion applicability, limits the automatic deletion scheme to people who completed pre-charge diversion on or after 1 July 2025. A completion before that date is outside the scheme. That is a boundary rather than a backlog, so waiting does not bring an earlier completion within reach, and what route if any exists for one was not established here.",
      "Now the mechanism, in the order it happens. Within 10 days of your successful completion the programme notifies the victim, law enforcement and the State's Attorney. Then, within 30 days after the two-year anniversary of that notification to the State's Attorney's office, the Attorney General shall give notice that all records held by the diversion programme shall be deleted, and the law enforcement and State's Attorney public records follow.",
      "That is a subtle point worth reading twice, because it moves the date. The two-year clock runs from the notification to the State's Attorney's office, not from your completion. Those are usually within ten days of each other, but if you are counting to the month it is the notification date you want.",
      "What successful completion means on this branch, because it is stricter than people assume. Payment of restitution is required for a completion to count as successful. If restitution was not paid, the question is not when deletion happens but whether the completion that starts the clock ever occurred.",
      THREE_DIFFERENT_WORDS,
      "On this branch the word is deletion, and it applies to the records held by the diversion programme, by law enforcement and by the State's Attorney as public records. It is not a court expungement, because there was never a court file, and it is not sealing.",
      "Now the limit that catches people, and it is expressly in the statute rather than an oversight. Valcour and similar non-public law enforcement databases are exempt from deletion. So an entry can survive in one of those after everything else has gone, and nobody has to tell you that it has. Whether any route exists to remove an entry from such a database was not established, and this page does not invent one.",
      "How to find out what remains. You can request a criminal conviction record from the Vermont Crime Information Center. There is a charge for it, and the amount is not stated here because it is the kind of figure that changes — ask the Center what it is now. Nobody writes to tell you when records have been deleted, so a check of your own is the only reliable evidence.",
      "What to do if something still shows after the window has run. Ask the programme when it notified the State's Attorney's office, because that is the date the clock actually runs from and it may be later than you assumed. If the timing checks out and something still appears, take that to somebody who can look at where the entry is held; no deadline or appeal attaches to you on this route, so there is nothing to miss by asking.",
      FEDERAL_RECORDS_ARE_NOT_REACHED,
      NOTHING_IS_FILED
    ],
    fees:
      "None for the deletion. There is no participant filing on this route, so there is no filing fee and nothing to pay for the process itself. Requesting your own criminal conviction record from the Vermont Crime Information Center is a separate service and does carry a charge; the amount is not quoted here and the Center is the place to ask.",
    feeWaiver:
      "Not applicable on this route. There is no fee here to waive, because there is nothing here to file. Fee waivers belong to the Vermont routes that involve a filing, and those are separate routes in the Vermont intake.",
    noticeOrService: [
      "There is nothing for you to serve and nobody for you to notify.",
      "The programme notifies the victim, law enforcement and the State's Attorney within 10 days of your successful completion. That notification is what starts the two-year clock.",
      "The Attorney General gives the deletion notice after the two-year anniversary. That is the Attorney General's notice, not yours.",
      "Nobody is required to write and tell you when records have been deleted, which is why a check of your own record is the step this page asks you to take."
    ],
    expectedNextStage:
      "You leave this sheet knowing whether the scheme reaches you at all, who acts and when, what the deletion covers, what it expressly does not reach, and how to check.",
    canPrepare: [
      "This account of the administrative deletion scheme and of the order in which the steps happen.",
      "The 1 July 2025 applicability cut-off, stated first because it decides whether anything else matters.",
      "The correction to the clock: two years from the notification to the State's Attorney's office, not from your completion.",
      "The plain statement that nobody should sell you a petition for a diverted matter.",
      "The Valcour exemption, which is the reason nobody can honestly tell you that every trace has been erased.",
      "A plain statement of what was not established, including any route for an earlier completion."
    ],
    escalations: [
      ...VT_COMMON_ESCALATIONS,
      "You completed pre-charge diversion before 1 July 2025.",
      "Restitution was not paid, so the completion may not have been recorded as successful.",
      "You need an entry removed from Valcour or a similar non-public law enforcement database.",
      "The two-year period and the 30-day window have clearly passed and records still appear."
    ],
    sources: [
      "3 V.S.A. § 164(f)(1) to (4), the administrative deletion of pre-charge diversion records, including the subsection (f)(4) applicability limit and the exemption for non-public law enforcement databases."
    ]
  })
};

// ---------------------------------------------------------------------------
// Relief tracks
// ---------------------------------------------------------------------------

type ComponentSpec = {
  componentId: string;
  templateId: string;
  requirement?: "required" | "conditional";
  conditionKey?: string;
};

function packetSet(trackId: string, components: readonly ComponentSpec[]): PacketSet {
  return {
    packetSetId: `${trackId}-set`,
    version: VERSION,
    components: components.map((component, index) => {
      if (!VERMONT_GUIDANCE_TEMPLATES[component.templateId]) {
        throw new Error(
          `${component.componentId}: no Vermont guidance template ${component.templateId} is registered.`
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

const VT_SHARED_INPUTS: readonly RequiredInput[] = [
  {
    key: "recordJurisdiction",
    label: "Is the matter a Vermont matter, or is it another state's, federal or tribal?",
    required: true
  },
  {
    key: "diversionType",
    label:
      "Was your diversion pre-charge, before anything was filed in court, or post-charge, after a charge was brought? The two are cleared under different rules.",
    required: true
  },
  {
    key: "immigrationConsequences",
    label: "Could your immigration status be affected by this record?",
    required: true
  },
  {
    key: "completionDate",
    label: "On what date did you successfully complete diversion?",
    required: true
  },
  {
    key: "recordStatus",
    label:
      "When you check your record, does the matter still show, has it gone, has the window not run yet, or have you not checked?",
    required: true
  }
];

const VT_POST_CHARGE_INPUTS: readonly RequiredInput[] = [
  ...VT_SHARED_INPUTS,
  {
    key: "statesAttorneyContested",
    label: "Has the State's Attorney contested the expungement, or has the court set a hearing?",
    required: true
  },
  {
    key: "subsequentConvictionOrPendingProceeding",
    label:
      "Have you been convicted of any felony or misdemeanour in the two years since you completed, or is any such case pending?",
    required: true
  },
  {
    key: "restitutionOwed",
    label: "Do you owe any restitution related to the case?",
    required: true
  },
  {
    key: "countyOfCase",
    label: "Which county handled the charge?",
    required: true
  }
];

const VT_PRE_CHARGE_INPUTS: readonly RequiredInput[] = [
  ...VT_SHARED_INPUTS,
  {
    key: "completionEra",
    label:
      "Did you complete pre-charge diversion on or after 1 July 2025, or before that date? Completions before it are outside the automatic deletion scheme.",
    required: true
  },
  {
    key: "restitutionPaid",
    label:
      "Was all restitution paid? On this route it is required for the completion to count as successful.",
    required: true
  },
  {
    key: "wantsRemovalFromAnExemptDatabase",
    label:
      "Do you need an entry removed from Valcour or a similar non-public law enforcement database?",
    required: true
  },
  {
    key: "countyOfProgram",
    label: "Which county's diversion programme supervised you?",
    required: true
  }
];

function vermontTrack(input: {
  trackId: string;
  publicName: string;
  mechanism: string;
  authority: string;
  componentId: string;
  templateId: string;
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
    jurisdiction: "VT",
    trackId: input.trackId,
    publicName: input.publicName,
    mechanism: input.mechanism,
    authority: input.authority,
    recordTypes: ["arrest", "charge", "court_record"],
    dispositions: ["diverted"],
    courtLevel: "not_applicable",
    geographicScope: "statewide",
    geographyKeys: [],
    outputStrategy: "process_guidance",
    packetSet: packetSet(input.trackId, [
      { componentId: input.componentId, templateId: input.templateId }
    ]),
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

export const VERMONT_GUIDANCE_TRACKS: readonly ReliefTrack[] = [
  vermontTrack({
    trackId: "vt_diversion_post_charge",
    publicName: "Records cleared after completing court diversion on a charge",
    mechanism:
      "court_initiated_expungement_after_successful_post_charge_diversion_with_verification_and_a_contest_disclosure",
    authority: "3 V.S.A. § 164(f)(5), with § 164(f) as amended by 2023 Act 180 and 2025 Act 64",
    componentId: "vt_diversion_post_charge-process-guidance-1",
    templateId: "vt-diversion-post-charge-process-guidance",
    requiredInputs: VT_POST_CHARGE_INPUTS,
    assembledPacketName: "vermont-post-charge-diversion-expungement",
    assembledPacketTitle:
      "Vermont post-charge diversion — the court clears the record, and how to check that it did",
    customerDeliverableDescription:
      "Tells a Vermont participant who successfully completed post-charge court diversion that 3 V.S.A. § 164(f)(5) puts the duty on the court, not on them: within 30 days after the two-year anniversary of successful completion the court gives notice to all parties of record of its intention to order the expungement of the court files and records, law enforcement records, fingerprints and photographs, gives the State's Attorney an opportunity for a hearing to contest, and expunges on three findings — two years elapsed, no subsequent felony or misdemeanour conviction and no pending proceeding seeking one, and no restitution owed on the case. States plainly that this is a no-fee, no-petition route and that nobody should sell a petition packet for it. Fixes the clock to the completion date, explains how to see whether the expungement happened through the participant's own criminal record search at the Criminal Division, and holds the vocabulary distinction Vermont now requires between expungement, sealing and deletion. Preserves what is open: whether anything reaches a completion under the section's previous arrangement, and that Vermont relief does not reach federal records. Nothing is filed and nothing is generated.",
    notes:
      "Process guidance only, on the ground that no participant filing exists — § 164(f)(5) puts the duty on the court. Never generate a petition, application or request on this track, and never a sealing petition or a fee-waiver application: those are separate Vermont routes owned by other jobs and their official forms are not named here. The State's Attorney's right to contest does not create a participant filing. Expungement is the statute's own word on this branch and must not be used as Vermont's umbrella term. The open question about an older completion under the section's previous arrangement is preserved."
  }),

  vermontTrack({
    trackId: "vt_diversion_pre_charge",
    publicName: "Records deleted after completing pre-charge diversion",
    mechanism:
      "administrative_deletion_after_successful_pre_charge_diversion_with_an_applicability_cut_off_and_an_exempt_database_disclosure",
    authority:
      "3 V.S.A. § 164(f)(1) to (4), with § 164(f) as amended by 2023 Act 180 and 2025 Act 64",
    componentId: "vt_diversion_pre_charge-process-guidance-1",
    templateId: "vt-diversion-pre-charge-process-guidance",
    requiredInputs: VT_PRE_CHARGE_INPUTS,
    assembledPacketName: "vermont-pre-charge-diversion-deletion",
    assembledPacketTitle:
      "Vermont pre-charge diversion — who deletes the records, when, and what is left out",
    customerDeliverableDescription:
      "Tells a Vermont participant who successfully completed pre-charge diversion that 3 V.S.A. § 164(f)(1) to (4) deletes the records administratively with no court involved, because no charge was ever filed: the programme notifies the victim, law enforcement and the State's Attorney within 10 days of successful completion, and within 30 days after the two-year anniversary of that notification the Attorney General gives notice that the programme's records shall be deleted, with law enforcement and State's Attorney public records following. Leads with the § 164(f)(4) applicability cut-off, because a completion before 1 July 2025 is outside the scheme entirely and no alternative route was established. Corrects the clock, which runs from the notification to the State's Attorney's office rather than from completion. Explains that payment of restitution is required for a completion to be successful at all. Discloses the express exemption of Valcour and similar non-public law enforcement databases, so nobody is told the record is gone everywhere. Holds the vocabulary distinction between expungement, sealing and deletion, and states that Vermont relief does not reach federal records. Nothing is filed and nothing is generated.",
    notes:
      "Process guidance only, on the ground that no participant filing exists — the duty runs to the Attorney General and the holding agencies. Never generate a petition, application or request on this track, and never a sealing petition or a fee-waiver application: those are separate Vermont routes owned by other jobs and their official forms are not named here. Deletion, not expungement and not sealing, is the word for this branch. The § 164(f)(4) cut-off is a first-class eligibility fact rather than a footnote. The Valcour exemption and the absence of any established route for a pre-1 July 2025 completion are both preserved as open, and no remedy is invented for either. The Vermont Crime Information Center record carries a fee that must be read live rather than quoted."
  })
];
